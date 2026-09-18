// The scheduler's connector for the Claude app: the one door between Claude
// and the trip database. Every tool runs as the person signed in, so the
// database's own staff rules decide what it sees. Nothing here writes a trip.
// The two draft tools park a filled-in trip in `trip_drafts` and hand back a
// link to the scheduler's editor, where the person checks it and presses Save.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { createMcpHandler, McpServer } from 'npm:@modelcontextprotocol/server@^2.0.0'
import { pipeline } from 'npm:@supabase/middleware@^0.5.0'
import { withOAuthProtectedResource, withSupabase } from 'npm:@supabase/server@^1.6.0'
import { z } from 'npm:zod@^4.3.6'

// Where a draft link points. The scheduler's trip editor reads `?draft=<id>`.
const SCHEDULER_URL = Deno.env.get('SCHEDULER_URL') ?? 'https://rux-sm.github.io/scheduler/'

// A trip in a list: enough to recognise it, not enough to bury the answer.
const TRIP_SUMMARY = [
  'id', 'trip_ref', 'destination', 'customer', 'start_date', 'end_date',
  'departure_time', 'spot_time', 'return_time', 'bus_count', 'trip_type',
  'vehicle_type', 'confirmed', 'cancelled_at',
].join(', ')

// A trip on its own: what a dispatcher reads off the editor's tabs.
const TRIP_DETAIL = [
  TRIP_SUMMARY, 'notes', 'return_start_date', 'return_end_date',
  'return_bus_count', 'pickup_address', 'est_miles', 'actual_miles',
  'driving_hours', 'on_duty_hours', 'quoted_price', 'deposit_amount',
  'balance_paid', 'date_paid', 'contract_status', 'contract_note',
  'po_received', 'po_ref', 'po_amount', 'invoiced', 'invoice_status',
  'invoice_number', 'booking_contact_name', 'booking_contact_phone',
  'booking_contact_email', 'req_sleeper', 'req_56pax', 'req_ada',
  'need_hotel', 'need_fuel_card', 'trip_reqs', 'itinerary_confirmed',
  'is_self_organized', 'cancellation_reason', 'updated_at',
].join(', ')

// The only trip fields a draft may fill. Anything else is refused, so a draft
// can never carry a field the editor does not know how to show and mark.
const DRAFT_FIELDS = new Set([
  'destination', 'customer', 'notes',
  'start_date', 'end_date', 'return_start_date', 'return_end_date',
  'departure_time', 'spot_time', 'return_time',
  'trip_type', 'vehicle_type', 'bus_count', 'return_bus_count',
  'pickup_address', 'est_miles',
  'booking_contact_name', 'booking_contact_phone', 'booking_contact_email',
  'trip_contact_1_name', 'trip_contact_1_phone',
  'trip_contact_2_name', 'trip_contact_2_phone',
  'quoted_price', 'deposit_amount', 'po_ref', 'po_amount',
  'req_sleeper', 'req_56pax', 'req_ada', 'need_hotel', 'need_fuel_card',
])

const ISO_DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'a date as YYYY-MM-DD')

/** An MCP answer. Objects go back as JSON so Claude can read the fields. */
function answer(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value, null, 1) }] }
}

/** Throws the database's own message, which says plainly when it refused. */
function orThrow<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message)
  return data as T
}

/** PostgREST reads commas and brackets as syntax, so a search drops them. */
function safeSearch(text: string) {
  return text.replace(/[,()*\\]/g, ' ').trim()
}

/** The last day something covers, for a row that may leave its end open. */
function lastDay(row: { start_date?: string | null; end_date?: string | null; return_end_date?: string | null }) {
  return row.return_end_date ?? row.end_date ?? row.start_date ?? ''
}

function overlaps(row: Parameters<typeof lastDay>[0], from: string, to: string) {
  const start = row.start_date ?? ''
  return start <= to && lastDay(row) >= from
}

Deno.serve(
  pipeline(
    [withOAuthProtectedResource(), withSupabase({ auth: 'user' })],
    async (req, { supabase }) => {
      const handler = createMcpHandler(() => {
        const server = new McpServer({ name: 'scheduler', version: '0.1.0' })

        server.registerTool(
          'find_trips',
          {
            title: 'Find trips',
            description:
              'Find trips by date, destination, customer or trip reference. Returns a short line per trip; use get_trip for one in full.',
            inputSchema: z.object({
              from: ISO_DATE.optional().describe('Include trips running on or after this day.'),
              to: ISO_DATE.optional().describe('Include trips running on or before this day.'),
              search: z.string().max(80).optional().describe('Text to match in destination, customer or trip reference.'),
              include_cancelled: z.boolean().default(false),
              limit: z.number().int().min(1).max(50).default(20),
            }),
            annotations: { readOnlyHint: true },
          },
          async ({ from, to, search, include_cancelled, limit }) => {
            let q = supabase.from('trips').select(TRIP_SUMMARY)
              .order('start_date', { ascending: true }).limit(limit)
            if (to) q = q.lte('start_date', to)
            if (from) q = q.or(`end_date.gte.${from},return_end_date.gte.${from},start_date.gte.${from}`)
            const text = search ? safeSearch(search) : ''
            if (text) q = q.or(`destination.ilike.*${text}*,customer.ilike.*${text}*,trip_ref.ilike.*${text}*`)
            if (!include_cancelled) q = q.is('cancelled_at', null)
            return answer(orThrow(await q))
          },
        )

        server.registerTool(
          'get_trip',
          {
            title: 'Get one trip',
            description: 'One trip in full, with the buses and drivers on it and its stops. Give either a trip id or a trip reference.',
            inputSchema: z.object({
              trip_id: z.string().uuid().optional(),
              trip_ref: z.string().max(40).optional(),
            }),
            annotations: { readOnlyHint: true },
          },
          async ({ trip_id, trip_ref }) => {
            if (!trip_id && !trip_ref) throw new Error('Give a trip_id or a trip_ref.')
            const found = supabase.from('trips').select(TRIP_DETAIL)
            const trip = orThrow(
              await (trip_id ? found.eq('id', trip_id) : found.eq('trip_ref', trip_ref!)).maybeSingle(),
            )
            if (!trip) throw new Error('No such trip, or it is not one you can see.')

            const buses = orThrow(await supabase.from('trip_assignments')
              .select('position, leg, active_roles, buses(number, type, capacity, ada_lift, sleeper), trip_drivers(role, report_time, pay, instructions, drivers(name, short_name, phone))')
              .eq('trip_id', trip.id).order('leg').order('position'))

            const stops = orThrow(await supabase.from('trip_stops')
              .select('leg, position, type, label, name, address, depart_prev, arrive, spot, arrive_date, spot_date, miles, drive, dwell_status')
              .eq('trip_id', trip.id).order('leg').order('position'))

            return answer({ trip, buses, stops })
          },
        )

        server.registerTool(
          'find_availability',
          {
            title: 'Find free buses and drivers',
            description:
              'Which buses and drivers are free across a range of days. A bus is busy when it is on a trip or out of service; a driver is busy when they are on a trip or on time off.',
            inputSchema: z.object({
              from: ISO_DATE,
              to: ISO_DATE.optional().describe('Defaults to the same day as from.'),
              vehicle_type: z.string().max(20).optional().describe('Only buses of this type, such as Coach or Van.'),
            }),
            annotations: { readOnlyHint: true },
          },
          async ({ from, to, vehicle_type }) => {
            const until = to ?? from
            if (until < from) throw new Error('to is before from.')

            let busQuery = supabase.from('buses')
              .select('id, number, type, capacity, ada_lift, sleeper')
              .eq('status', 'active').order('sort_order')
            if (vehicle_type) busQuery = busQuery.eq('type', vehicle_type)

            const [buses, drivers, trips, offRoad, timeOff] = await Promise.all([
              busQuery.then(orThrow),
              supabase.from('drivers').select('id, name, short_name, phone, priority')
                .eq('status', 'active').order('sort_order').then(orThrow),
              supabase.from('trips').select('id, start_date, end_date, return_end_date')
                .is('cancelled_at', null).lte('start_date', until)
                .or(`end_date.gte.${from},return_end_date.gte.${from},start_date.gte.${from}`).then(orThrow),
              supabase.from('bus_out_of_service').select('bus_id, start_date, end_date, reason').then(orThrow),
              supabase.from('driver_time_off').select('driver_id, start_date, end_date, reason').then(orThrow),
            ])

            const running = trips.filter((t) => overlaps(t, from, until)).map((t) => t.id)
            const assignments = running.length
              ? orThrow(await supabase.from('trip_assignments')
                  .select('id, bus_id, trip_id, trip_drivers(driver_id)').in('trip_id', running))
              : []

            const busyBuses = new Set<string>()
            const busyDrivers = new Set<string>()
            for (const a of assignments) {
              if (a.bus_id) busyBuses.add(a.bus_id)
              for (const d of a.trip_drivers ?? []) if (d.driver_id) busyDrivers.add(d.driver_id)
            }
            for (const o of offRoad) if (overlaps(o, from, until)) busyBuses.add(o.bus_id)
            for (const o of timeOff) if (overlaps(o, from, until)) busyDrivers.add(o.driver_id)

            return answer({
              from, to: until,
              free_buses: buses.filter((b) => !busyBuses.has(b.id)),
              free_drivers: drivers.filter((d) => !busyDrivers.has(d.id)),
              busy: { buses: busyBuses.size, drivers: busyDrivers.size, trips: running.length },
            })
          },
        )

        server.registerTool(
          'find_contacts',
          {
            title: 'Find contacts',
            description: 'Find a customer contact by name, phone or email.',
            inputSchema: z.object({
              search: z.string().min(1).max(80),
              limit: z.number().int().min(1).max(50).default(10),
            }),
            annotations: { readOnlyHint: true },
          },
          async ({ search, limit }) => {
            const text = safeSearch(search)
            if (!text) throw new Error('Nothing left to search for once brackets and commas are dropped.')
            return answer(orThrow(await supabase.from('contacts')
              .select('id, name, phone, email, client')
              .or(`name.ilike.*${text}*,phone.ilike.*${text}*,email.ilike.*${text}*,client.ilike.*${text}*`)
              .order('name').limit(limit)))
          },
        )

        server.registerTool(
          'list_buses',
          {
            title: 'List the fleet',
            description: 'Every bus, with its type, seats and next service.',
            inputSchema: z.object({ include_inactive: z.boolean().default(false) }),
            annotations: { readOnlyHint: true },
          },
          async ({ include_inactive }) => {
            let q = supabase.from('buses')
              .select('id, number, type, capacity, ada_lift, sleeper, status, next_service, notes')
              .order('sort_order')
            if (!include_inactive) q = q.eq('status', 'active')
            return answer(orThrow(await q))
          },
        )

        server.registerTool(
          'list_drivers',
          {
            title: 'List the drivers',
            description: 'Every driver, with their licence class and the dates that expire.',
            inputSchema: z.object({ include_inactive: z.boolean().default(false) }),
            annotations: { readOnlyHint: true },
          },
          async ({ include_inactive }) => {
            let q = supabase.from('drivers')
              .select('id, name, short_name, phone, status, employment_type, priority, cdl_class, license_exp, med_card_expiry')
              .order('sort_order')
            if (!include_inactive) q = q.eq('status', 'active')
            return answer(orThrow(await q))
          },
        )

        // The two writes. Neither touches `trips`: they park a draft and hand
        // back a link, and the scheduler's own Save is still the only writer.
        const draftShape = {
          fields: z.record(z.string(), z.unknown())
            .describe(`Only the trip fields you are sure of. Allowed: ${[...DRAFT_FIELDS].join(', ')}.`),
          notes: z.string().max(2000).optional()
            .describe('What you could not work out, shown at the top of the editor.'),
        }

        function checkFields(fields: Record<string, unknown>) {
          const unknown = Object.keys(fields).filter((k) => !DRAFT_FIELDS.has(k))
          if (unknown.length) {
            throw new Error(
              `These are not trip fields a draft can fill: ${unknown.join(', ')}. ` +
              `Allowed: ${[...DRAFT_FIELDS].join(', ')}.`,
            )
          }
          if (!Object.keys(fields).length) throw new Error('A draft with no fields is nothing to check.')
        }

        async function saveDraft(row: Record<string, unknown>) {
          const draft = orThrow(await supabase.from('trip_drafts').insert(row).select('id').single())
          const link = new URL(SCHEDULER_URL)
          link.searchParams.set('draft', draft.id)
          return answer({
            draft_id: draft.id,
            open: link.toString(),
            saved: false,
            next: 'Nothing is saved yet. Open the link, check the marked fields, and press Save in the scheduler.',
          })
        }

        server.registerTool(
          'draft_trip',
          {
            title: 'Draft a new trip',
            description:
              'Park a new trip for the person to check. This does NOT create a trip: it returns a link that opens the scheduler\'s trip editor filled in, and only their Save creates it.',
            inputSchema: z.object(draftShape),
          },
          async ({ fields, notes }) => {
            checkFields(fields)
            return saveDraft({ fields, notes: notes ?? null })
          },
        )

        server.registerTool(
          'draft_trip_change',
          {
            title: 'Draft a change to a trip',
            description:
              'Park a change to an existing trip for the person to check. This does NOT change the trip: it returns a link that opens that trip in the editor with the changes filled in, and only their Save applies them.',
            inputSchema: z.object({ trip_id: z.string().uuid(), ...draftShape }),
          },
          async ({ trip_id, fields, notes }) => {
            checkFields(fields)
            const trip = orThrow(await supabase.from('trips').select('id').eq('id', trip_id).maybeSingle())
            if (!trip) throw new Error('No such trip, or it is not one you can see.')
            return saveDraft({ trip_id, fields, notes: notes ?? null })
          },
        )

        return server
      })

      return handler.fetch(req)
    },
  ),
)
