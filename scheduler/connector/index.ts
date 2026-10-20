// The scheduler's connector for the Claude app: the one door between Claude
// and the trip database. Every tool runs as the person signed in, so the
// database's own staff rules decide what it sees. Nothing here writes a trip.
// The two draft tools park a filled-in trip in `trip_drafts` and hand back a
// link to the scheduler's editor, where the person checks it and presses Save.
// The to-do tools write rows of the office's To do list, in `to_dos`, and
// nothing else: the database makes each one Ruxbot's, with the signed-in
// person beside it, and lets a tool close only a row a tool made.

// Each import names one exact version, so a deploy bundles what was tried
// and not whatever a range has come to mean since; check-connector.mjs
// holds every import to that.
import 'jsr:@supabase/functions-js@2.116.0/edge-runtime.d.ts'

import { createMcpHandler, McpServer } from 'npm:@modelcontextprotocol/server@2.3.1'
import { pipeline } from 'npm:@supabase/middleware@0.5.0'
import { withOAuthProtectedResource, withSupabase } from 'npm:@supabase/server@1.9.1'
import { z } from 'npm:zod@4.6.5'

// The pages' own rule files, joined by build-connector-rules.mjs: what a
// draft may fill, and what Prep and the To do list say a trip lacks.
import rules from './rules.ts'
import { pdfText } from './pdf-text.ts'
const DraftFields = rules.SchedulerDraftFields
const Billing = rules.SchedulerBilling
const LegFacts = rules.SchedulerLegFacts
const ToDo = rules.SchedulerToDo
const Departures = rules.SchedulerDepartures
const FollowUp = rules.SchedulerFollowUp

// Where a draft link points. The scheduler's trip editor reads `?draft=<id>`.
const SCHEDULER_URL = Deno.env.get('SCHEDULER_URL') ?? 'https://rux-sm.github.io/scheduler/'

// A trip in a list: enough to recognise it, not enough to bury the answer.
const TRIP_SUMMARY = [
  'id', 'trip_ref', 'destination', 'customer', 'start_date', 'end_date',
  'departure_time', 'spot_time', 'return_time', 'bus_count', 'trip_type',
  'vehicle_type', 'confirmed', 'cancelled_at', 'trip_bar_color',
  'booking_contact_name',
].join(', ')

// A trip on its own: what a dispatcher reads off the editor's tabs.
const TRIP_DETAIL = [
  TRIP_SUMMARY, 'return_start_date', 'return_end_date',
  'return_bus_count', 'pickup_address', 'est_miles', 'actual_miles',
  'driving_hours', 'on_duty_hours', 'quoted_price', 'deposit_amount',
  'balance_paid', 'date_paid', 'contract_status', 'contract_note',
  'po_received', 'po_ref', 'po_amount', 'invoiced', 'invoice_status',
  'invoice_number', 'booking_contact_phone',
  'booking_contact_email', 'booking_contact_missive_url',
  'trip_contact_1_name', 'trip_contact_1_phone', 'trip_contact_2_name',
  'trip_contact_2_phone', 'trip_contact_3_name', 'trip_contact_3_phone',
  'trip_contact_4_name', 'trip_contact_4_phone', 'trip_contact_5_name',
  'trip_contact_5_phone',
  // The leg of a split trip each trip contact is for, null being the drop-off's.
  'trip_contact_1_leg', 'trip_contact_2_leg', 'trip_contact_3_leg',
  'trip_contact_4_leg', 'trip_contact_5_leg', 'req_sleeper', 'req_56pax', 'req_ada',
  'need_hotel', 'need_fuel_card', 'trip_reqs', 'itinerary_confirmed',
  'is_self_organized', 'cancellation_reason', 'updated_at',
  // What a save writes to the Details and Billing tabs and the three Done
  // marks, so a session reads its own save back.
  'passengers', 'quote_sent_price', 'quote_sent_on',
  'route_done_at', 'route_done_by', 'buses_done_at', 'buses_done_by',
  'billing_done_at', 'billing_done_by',
].join(', ')

// The only trip fields a draft may fill, draft-fields.js's list. Anything
// else is refused. A deposit is money a person takes, so it is not there.
const DRAFT_FIELDS: string[] = DraftFields.FIELDS.map((f: { key: string }) => f.key)

const ISO_DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'a date as YYYY-MM-DD')

// A to-do row as a tool answers it: names in place of profile ids, and enough
// of its trip to recognise it.
const TO_DO_ROW = [
  'id', 'kind', 'who', 'body', 'detail', 'source', 'due_on', 'thread_url', 'thread_key', 'created_at',
  'closed_at', 'closed_reason',
  'owner:owner_id(display_name)', 'made_by:created_by(display_name)',
  'for_session_of:session_of(display_name)', 'closed_by:closed_by(display_name)',
  'trip:trip_id(id, trip_ref, destination, customer, start_date)',
].join(', ')

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

/** The day `n` days from a day, as YYYY-MM-DD. */
function dayFrom(day: string, n: number) {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** A placeholder is not a trip yet, as billing.js reads one. The board asks no bus of it. */
const isPlaceholder = (trip: Record<string, unknown>): boolean => Billing.placeholder(trip)

type TripLegs = {
  trip_type?: string | null; bus_count?: number | null; return_bus_count?: number | null
  start_date?: string | null; end_date?: string | null
  return_start_date?: string | null; return_end_date?: string | null
}

/**
 * The legs a trip's buses are counted on, with their days and how many buses
 * each needs. Only a drop-off and pickup has a return leg of its own, as the
 * editor keeps it; every other trip is one outbound leg.
 */
function legsOf(trip: TripLegs) {
  const start = trip.start_date ?? ''
  const legs = [{ leg: 'outbound', start, end: trip.end_date ?? start, needed: trip.bus_count || 1 }]
  if (trip.trip_type === 'dropoff_pickup') {
    const rStart = trip.return_start_date ?? trip.end_date ?? start
    legs.push({
      leg: 'return', start: rStart, end: trip.return_end_date ?? rStart,
      needed: trip.return_bus_count || trip.bus_count || 1,
    })
  }
  return legs
}

type LegStop = {
  leg?: string | null; position?: number | null; type?: string | null
  depart_prev?: string | null; arrive?: string | null; spot?: string | null
}

/** Minutes after midnight, from "HH:MM" or "HH:MM:SS". */
function clockMinutes(t?: string | null) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(t ?? ''))
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

/**
 * The office's late-return hour as minutes after midnight, from `settings`'
 * `late-return-v1`; 4:00 AM with no row, as week.js has it.
 */
function lateReturnMinutes(value: unknown) {
  const given = (value as { hour?: unknown } | null)?.hour
  const hour = Number(given)
  return (given != null && Number.isFinite(hour) && hour >= 0 && hour <= 12 ? hour : 4) * 60
}

/**
 * The days a leg takes, as week.js's `takes` counts them, so an answer here
 * agrees with the board. The bus is back on the leg's last day, or the day
 * after when the yard return is earlier on the clock than the trip's end; on a
 * one-day leg it is back as many days on as its times pass midnight, counted
 * from the group's departure. Back before the late-return hour, it came back
 * the night before: the leg takes the days up to the one before, and `back` is
 * the day and time it is really back. Back at or after that hour, the leg
 * takes the day it is back on. A leg with no yard return takes its own dates.
 */
function takes(
  trip: { departure_time?: string | null; return_time?: string | null },
  l: { leg: string; start: string; end: string },
  stops: LegStop[],
  lateBefore: number,
) {
  const rows = stops.filter((s) => (s.leg ?? 'outbound') === l.leg)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  const pickup = rows.find((s) => s.type === 'pickup') ?? rows[0]
  const back = [...rows].reverse().find((s) => s.type === 'return')
  const home = clockMinutes(back?.arrive)
  if (!l.start || !back || home == null) return { end: l.end, back: null as string | null }
  let over = 0
  if (l.end > l.start) {
    const end = clockMinutes(back.depart_prev)
    over = end != null && home < end ? 1 : 0
  } else {
    const run = rows.slice(Math.max(rows.indexOf(pickup), 0), rows.indexOf(back) + 1)
    const depart = pickup?.depart_prev || (l.leg === 'outbound' ? trip.departure_time : trip.return_time)
    const times = [depart, pickup?.arrive, pickup?.spot, ...run.slice(1).flatMap((s) => [s.depart_prev, s.arrive, s.spot])]
    // The group's departure is the row after the pickup's `depart_prev`.
    const group = run.length > 1 ? 3 : 0
    let last: number | null = null, days = 0, start = 0
    times.forEach((t, i) => {
      const n = clockMinutes(t)
      if (n != null) {
        if (last != null && n < last) days += 1
        last = n
      }
      if (i === group) start = days
    })
    over = days - start
  }
  const backOn = dayFrom(l.end, over)
  return home < lateBefore && backOn > l.start
    ? { end: dayFrom(backOn, -1), back: `${backOn} ${String(back.arrive).slice(0, 5)}` }
    : { end: backOn, back: null as string | null }
}

/** What the trip needs from a bus, in words, as the editor's Buses tab asks. */
function busNeeds(trip: { req_56pax?: boolean | null; req_ada?: boolean | null; req_sleeper?: boolean | null; vehicle_type?: string | null }) {
  return [
    trip.vehicle_type, trip.req_56pax && '56 seats', trip.req_ada && 'lift', trip.req_sleeper && 'sleeper',
  ].filter(Boolean) as string[]
}

/**
 * A stop dated more than a day outside its leg's days, which is a date typed
 * wrong. One day either side is a real stop: the bus spotted the evening
 * before, and the group let off past midnight.
 */
function stopDateWarnings(
  trip: TripLegs,
  stops: {
    leg: string; position: number; name?: string | null
    arrive_date?: string | null; spot_date?: string | null; depart_prev_date?: string | null
  }[],
) {
  const warnings: string[] = []
  for (const l of legsOf(trip)) {
    // A leg with no day has none to be outside of.
    if (!l.start) continue
    const first = dayFrom(l.start, -1), last = dayFrom(l.end, 1)
    for (const s of stops.filter((x) => x.leg === l.leg)) {
      for (const day of [s.arrive_date, s.spot_date, s.depart_prev_date]) {
        if (day && (day < first || day > last)) {
          warnings.push(`Stop ${s.position + 1}${s.name ? ` (${s.name})` : ''} is dated ${day}, outside the ${l.leg} leg's ${l.start} to ${l.end}.`)
        }
      }
    }
  }
  return warnings
}

type Row = Record<string, any>

/** A To do row the trips give, in words: its kind, its trip and leg, and what it says. */
function toDoWords(r: Row) {
  return {
    kind: ToDo.KINDS[r.kind]?.label ?? r.kind, trip_id: r.trip.id, trip_ref: r.trip.trip_ref ?? null,
    destination: r.trip.destination ?? null, customer: r.trip.customer ?? null,
    ...(r.legName ? { leg: r.legName } : {}), day: r.day, what: r.what,
    ...(r.detail ? { detail: r.detail } : {}), ...(r.due ? { due: true } : {}),
  }
}

/** A leg's Prep page in words: its trip, whether it is ready, and each gap. */
function prepWords(p: Row) {
  return {
    trip_id: p.trip.id, trip_ref: p.trip.trip_ref ?? null, destination: p.trip.destination ?? null,
    customer: p.trip.customer ?? null, ...(p.legName ? { leg: p.legName } : {}), day: p.day,
    ready: p.left === 0, gaps: Departures.gapWords(p),
  }
}

/**
 * A one-day leg's rows keep the leg's own date on a time past midnight. This
 * counts the day as the Route tab does: down the times in order, one earlier
 * than the one before it is the next day's, and the day the group leaves the
 * pickup is the leg's. A time on another day gains `<time>_on`, its real
 * day; the row's own date is left as saved.
 */
function markPastMidnight<T extends {
  leg: string; position: number; type?: string | null
  depart_prev?: string | null; arrive?: string | null; spot?: string | null
}>(trip: TripLegs, stops: T[]) {
  const minutes = (t?: string | null) => {
    const m = /^(\d{1,2}):(\d{2})/.exec(String(t ?? ''))
    return m ? Number(m[1]) * 60 + Number(m[2]) : null
  }
  for (const l of legsOf(trip)) {
    if (!l.start || l.start !== l.end) continue
    const rows = stops.filter((s) => s.leg === l.leg).sort((a, b) => a.position - b.position)
    const seen: { row: T; key: 'depart_prev' | 'spot' | 'arrive'; days: number }[] = []
    let last: number | null = null, days = 0, start: number | null = null
    for (const row of rows) {
      for (const key of ['depart_prev', 'spot', 'arrive'] as const) {
        const n = minutes(row[key])
        if (n == null) continue
        if (last != null && n < last) days += 1
        last = n
        // The group leaves the pickup at the first stop's departure.
        if (start == null && key === 'depart_prev' && row.type !== 'pickup') start = days
        seen.push({ row, key, days })
      }
    }
    for (const t of seen) {
      const off = t.days - (start ?? 0)
      if (off !== 0) (t.row as Record<string, unknown>)[`${t.key}_on`] = dayFrom(l.start, off)
    }
  }
  return stops
}

Deno.serve(
  pipeline(
    [withOAuthProtectedResource(), withSupabase({ auth: 'user' })],
    async (req, { supabase }) => {
      const handler = createMcpHandler(() => {
        const server = new McpServer({ name: 'scheduler', version: '0.7.0' })

        server.registerTool(
          'find_trips',
          {
            title: 'Find trips',
            description:
              'Find trips by date, destination, customer, booking contact or trip reference. Returns trips, a short line per trip, soonest first, and matching, how many trips match. When more match than limit lets through, cut says how many were left out: narrow the days or the search, or raise limit. Use get_trip for one in full.',
            inputSchema: z.object({
              from: ISO_DATE.optional().describe('Include trips running on or after this day.'),
              to: ISO_DATE.optional().describe('Include trips running on or before this day.'),
              search: z.string().max(80).optional().describe('Text to match in destination, customer, trip reference, or the booking contact\'s name or email.'),
              include_cancelled: z.boolean().default(false),
              limit: z.number().int().min(1).max(50).default(20),
            }),
            annotations: { readOnlyHint: true },
          },
          async ({ from, to, search, include_cancelled, limit }) => {
            let q = supabase.from('trips').select(TRIP_SUMMARY, { count: 'exact' })
              .order('start_date', { ascending: true }).limit(limit)
            if (to) q = q.lte('start_date', to)
            if (from) q = q.or(`end_date.gte.${from},return_end_date.gte.${from},start_date.gte.${from}`)
            const text = search ? safeSearch(search) : ''
            if (text) q = q.or(`destination.ilike.*${text}*,customer.ilike.*${text}*,trip_ref.ilike.*${text}*,booking_contact_name.ilike.*${text}*,booking_contact_email.ilike.*${text}*`)
            if (!include_cancelled) q = q.is('cancelled_at', null)
            // A list cut at its limit says so, or a short answer reads as every trip there is.
            const { data, error, count } = await q
            const trips = orThrow({ data, error })
            const matching = count ?? trips.length
            return answer(matching > trips.length
              ? { trips, matching, cut: `Only the first ${trips.length} of ${matching} matching trips are listed, soonest first.` }
              : { trips, matching })
          },
        )

        server.registerTool(
          'get_trip',
          {
            title: 'Get one trip',
            description:
              'One trip in full, with the buses and drivers on it, its stops, its quote lines, and what it lacks. warnings are each leg\'s gaps as the board\'s Prep panel lists them, such as a bus not assigned, a driver not confirmed or an itinerary missing, each a line, and a stop dated more than a day outside its leg. to_do is what the board\'s To do list says of the trip, such as a follow-up due or a driver to tell of a change; neither is a stored row, and each goes once the trip is fixed. A placeholder and a cancelled trip lack nothing. An amber trip_bar_color (or its old names orange and yellow) on a trip not confirmed and with no quote_sent_price or quote_sent_on is a placeholder, not quoted yet, and needs no bus. booking_contact_missive_url, when filled, is the trip\'s email thread in Missive. updates are what has been said about the trip, newest first, as its card lists them. quote_lines are the Billing tab\'s lines, which add up to quoted_price; route_done_at, buses_done_at and billing_done_at say when each tab was marked Done, and quote_sent_price and quote_sent_on what the customer was sent. On a one-day leg a stop\'s time past midnight also has depart_prev_on, spot_on or arrive_on, the day it falls on. documents are the files on its Files tab, newest first, each with its label, such as Itinerary, PO or Contract, the day it was added, and its leg. On a split trip (trip_type dropoff_pickup) a document\'s leg and each trip_contact_<n>_leg say which day it is for: return is the pickup\'s, and outbound or null the drop-off\'s, which the pickup is handed too while it has none of its own; on any other trip they mean nothing. read_trip_document reads one. Give either a trip id or a trip reference.',
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
              .select('id, leg, position, type, label, name, address, depart_prev, depart_prev_date, arrive, arrive_date, spot, spot_date, miles, drive, dwell_status')
              .eq('trip_id', trip.id).order('leg').order('position'))

            // The Billing tab's lines, which add up to `quoted_price`.
            const quote_lines = orThrow(await supabase.from('trip_quote_lines')
              .select('position, kind, leg, item, description, quantity, cost, amount, miles, dead_miles, rate')
              .eq('trip_id', trip.id).order('position'))

            // The trip's updates, newest first, as its card lists them; a
            // `nothing` row marks a skipped prompt and is left out, as the card
            // leaves it out.
            const updates = orThrow(await supabase.from('trip_updates')
              .select('body, created_at, actor_name')
              .eq('trip_id', trip.id).neq('kind', 'nothing').order('created_at', { ascending: false }))

            // What Prep and the To do list say the trip lacks, by the pages' own rules.
            const prep = await Departures.readTrip(supabase, trip.id, await LegFacts.readBasics(supabase, { forms: true }))
            const live = !!prep && !trip.cancelled_at && !isPlaceholder(prep.trip)
            const gaps = live ? prep.pages.flatMap((p: Row) => Departures.gapWords(p).map((w: string) => (p.legName ? `${p.legName}: ${w}` : w))) : []
            const to_do = prep ? ToDo.rows([prep.trip], ToDo.handed(prep.read)).map(toDoWords) : []

            // The Files tab, newest first, so the customer's latest paper leads.
            const documents = orThrow(await supabase.from('trip_documents')
              .select('id, label, file_name, file_size, created_at, leg')
              .eq('trip_id', trip.id).order('created_at', { ascending: false }))

            return answer({
              trip, updates, warnings: [...gaps, ...stopDateWarnings(trip, stops)], to_do, buses,
              stops: markPastMidnight(trip, stops), quote_lines, documents,
            })
          },
        )

        server.registerTool(
          'read_trip_document',
          {
            title: 'Read a trip\'s file',
            description:
              'The text of one file on a trip\'s Files tab, by the id get_trip lists under documents, as the person signed in may open it: each page\'s text in order. Only a PDF is read. A page with no text, such as a scanned one, is listed in no_text, and readable is false with the reason when the file cannot be read; nothing on such a page can be known from here, so say so rather than guess. A table comes back as lines of words, so read each time against the place on its own line. An itinerary is the customer\'s word on the trip only as of the day it was added; a newer email in its thread says more.',
            inputSchema: z.object({ document_id: z.string().uuid() }),
            annotations: { readOnlyHint: true },
          },
          async ({ document_id }) => {
            const doc = orThrow(await supabase.from('trip_documents')
              .select('id, trip_id, label, file_name, file_path, file_size, created_at, leg')
              .eq('id', document_id).maybeSingle())
            if (!doc) throw new Error('No such file, or it is not one you can see.')
            const about = { id: doc.id, trip_id: doc.trip_id, label: doc.label, file_name: doc.file_name, added: doc.created_at, leg: doc.leg }
            // The bucket is private and staff-only, so the download is the caller's own.
            const { data: blob, error } = await supabase.storage.from('trip-documents').download(doc.file_path)
            if (error || !blob) {
              return answer({ ...about, readable: false, why: `The file could not be fetched: ${error?.message ?? 'it is not in storage'}.` })
            }
            return answer({ ...about, ...(await pdfText(new Uint8Array(await blob.arrayBuffer()))) })
          },
        )

        server.registerTool(
          'needs_attention',
          {
            title: 'What needs attention',
            description:
              'What the scheduler itself says needs doing, by the board\'s own rules. to_do is every row its To do list works out from the trips: a follow-up due, a trip short of buses, no times, a clash, a driver who declined or has a change to be told, a leg leaving soon with something open. departures is each day the office preps for, tomorrow and on to the next working day, or the day asked, with every leg leaving that day, whether it is ready, and its gaps as the Prep panel lists them. None of this is a stored row: each goes once its trip is fixed, so never add a To do row for it. today is the office\'s day.',
            inputSchema: z.object({
              day: ISO_DATE.optional().describe('List the legs leaving on this day. Left out, the days the office preps for today.'),
            }),
            annotations: { readOnlyHint: true },
          },
          async ({ day }) => {
            const today = FollowUp.today()
            const days: string[] = day ? [day] : Departures.prepDays(today)
            const basics = await LegFacts.readBasics(supabase, { forms: true })
            const [rows, ...pages] = await Promise.all([
              ToDo.read(supabase).then((r: Row) => r.rows),
              ...days.map((d) => Departures.readDay(supabase, d, basics)),
            ])
            return answer({
              today,
              to_do: rows.map(toDoWords),
              departures: days.map((d, i) => ({ day: d, legs: pages[i].map(prepWords) })),
            })
          },
        )

        server.registerTool(
          'find_availability',
          {
            title: 'Find free buses and drivers',
            description:
              'Which buses and drivers are free across a range of days, and every trip with a leg running then, with how many buses it needs and has. A bus is busy on the days its leg takes, or while out of service; a driver is busy on the days of the leg they drive, or on time off. A bus back at the yard before the office\'s late-return hour (4:00 AM unless the Settings page says otherwise) came back the night before, so its leg does not take the day it is back on, and one back at or after that hour takes that day: a leg\'s takes_to is its last day counted so. back_after_midnight lists the buses and drivers of a leg that took the day before and only reach the yard on the morning of the first day asked, with the time: one that is free that day is not promised a departure before it, and the driver\'s rest is counted from it. Between a drop-off and its pickup the trip holds neither. A trip still short of buses will take free ones: buses_still_needed is how many, and spare_buses is the free buses left once those are taken, which is the number that can be promised. A placeholder (not quoted yet) is listed but asks for no bus.',
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

            // A leg that ended the day before may take the first day asked, or be back on it past midnight.
            const since = dayFrom(from, -1)
            const [buses, drivers, trips, offRoad, timeOff, late] = await Promise.all([
              busQuery.then(orThrow),
              supabase.from('drivers').select('id, name, short_name, phone, priority')
                .eq('status', 'active').order('sort_order').then(orThrow),
              supabase.from('trips').select('id, trip_ref, customer, destination, trip_type, confirmed, trip_bar_color, quote_sent_price, quote_sent_on, start_date, end_date, return_start_date, return_end_date, departure_time, return_time, bus_count, return_bus_count, vehicle_type, req_56pax, req_ada, req_sleeper, trip_stops(leg, position, type, depart_prev, arrive, spot)')
                .is('cancelled_at', null).lte('start_date', until)
                .or(`end_date.gte.${since},return_end_date.gte.${since},start_date.gte.${since}`).then(orThrow),
              supabase.from('bus_out_of_service').select('bus_id, start_date, end_date, reason').then(orThrow),
              supabase.from('driver_time_off').select('driver_id, start_date, end_date, reason').then(orThrow),
              supabase.from('settings').select('value').eq('key', 'late-return-v1').maybeSingle().then(orThrow),
            ])

            // Each leg with the days it takes: `end` its last day counted, `back` when it is back after that.
            const lateBefore = lateReturnMinutes(late?.value)
            const takenOf = new Map(trips.map((t) => [t.id, legsOf(t).map((l) => ({ ...l, ...takes(t, l, t.trip_stops ?? [], lateBefore) }))]))
            const legsTaken = (t: { id: string }) => takenOf.get(t.id) ?? []

            // A trip runs on the days its legs take: the days between a drop-off and its pickup are nobody's.
            const legRuns = (l: { start: string; end: string }) => l.start <= until && l.end >= from
            // A leg that took the day before and is back on the first day asked, past midnight.
            const backThatMorning = (l: { start: string; end: string; back: string | null }) =>
              !legRuns(l) && !!l.back && l.back.slice(0, 10) === from
            const runningTrips = trips.filter((t) => legsTaken(t).some(legRuns))
            const running = runningTrips.map((t) => t.id)
            const lateTrips = trips.filter((t) => legsTaken(t).some(backThatMorning))
            const wanted = [...new Set([...running, ...lateTrips.map((t) => t.id)])]
            const assignments = wanted.length
              ? orThrow(await supabase.from('trip_assignments')
                  .select('id, bus_id, trip_id, leg, trip_drivers(driver_id)').in('trip_id', wanted))
              : []

            // A bus and its crew are busy only on their own leg's days. A row whose leg the trip does not have is counted busy.
            const legOf = new Map(runningTrips.map((t) => [t.id, new Map(legsTaken(t).map((l) => [l.leg, l]))]))
            const busyBuses = new Set<string>()
            const busyDrivers = new Set<string>()
            for (const a of assignments) {
              if (!legOf.has(a.trip_id)) continue
              const leg = legOf.get(a.trip_id)?.get(a.leg ?? 'outbound')
              if (leg && !legRuns(leg)) continue
              if (a.bus_id) busyBuses.add(a.bus_id)
              for (const d of a.trip_drivers ?? []) if (d.driver_id) busyDrivers.add(d.driver_id)
            }
            for (const o of offRoad) if (overlaps(o, from, until)) busyBuses.add(o.bus_id)
            for (const o of timeOff) if (overlaps(o, from, until)) busyDrivers.add(o.driver_id)

            const numberOf = new Map(buses.map((b) => [b.id, b.number]))
            const tripLines = runningTrips.map((t) => {
              const mine = assignments.filter((a) => a.trip_id === t.id)
              const legs = legsTaken(t).filter(legRuns).map((l) => {
                const onLeg = mine.filter((a) => a.leg === l.leg && a.bus_id)
                return {
                  leg: l.leg, takes_to: l.end, ...(l.back ? { back: l.back } : {}), needed: l.needed,
                  buses: onLeg.map((a) => numberOf.get(a.bus_id) ?? 'another type'),
                  missing: isPlaceholder(t) ? 0 : Math.max(0, l.needed - onLeg.length),
                  drivers: mine.filter((a) => a.leg === l.leg).reduce((n, a) => n + (a.trip_drivers ?? []).length, 0),
                }
              })
              return {
                trip_ref: t.trip_ref, customer: t.customer, destination: t.destination,
                start_date: t.start_date, end_date: t.end_date, confirmed: t.confirmed,
                placeholder: isPlaceholder(t), needs: busNeeds(t), legs,
              }
            })

            // Back at the yard on the first day asked, past midnight, from a leg that took the day before.
            const shortOf = new Map(drivers.map((d) => [d.id, d.short_name ?? d.name]))
            const backAfterMidnight = lateTrips.flatMap((t) => legsTaken(t).filter(backThatMorning).map((l) => {
              const onLeg = assignments.filter((a) => a.trip_id === t.id && (a.leg ?? 'outbound') === l.leg)
              return {
                trip_ref: t.trip_ref, customer: t.customer, destination: t.destination, leg: l.leg, back: l.back,
                buses: onLeg.filter((a) => a.bus_id && numberOf.has(a.bus_id)).map((a) => numberOf.get(a.bus_id)),
                drivers: onLeg.flatMap((a) => (a.trip_drivers ?? []).map((d) => shortOf.get(d.driver_id)).filter(Boolean)),
              }
            }))

            const missingOn = (line: typeof tripLines[number]) => line.legs.reduce((m, l) => m + l.missing, 0)
            const free = buses.filter((b) => !busyBuses.has(b.id))
            // With one type asked for, only a trip that could take that type claims a free bus of it.
            const claimed = runningTrips.reduce((n, t, i) =>
              n + (!vehicle_type || !t.vehicle_type || t.vehicle_type === vehicle_type ? missingOn(tripLines[i]) : 0), 0)
            return answer({
              from, to: until,
              free_buses: free,
              free_drivers: drivers.filter((d) => !busyDrivers.has(d.id)),
              buses_still_needed: tripLines.reduce((n, t) => n + missingOn(t), 0),
              spare_buses: Math.max(0, free.length - claimed),
              busy: { buses: busyBuses.size, drivers: busyDrivers.size, trips: running.length },
              back_after_midnight: backAfterMidnight,
              trips: tripLines,
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
          'find_documents',
          {
            title: 'Find company documents',
            description: 'Find the office\'s own paperwork, such as an insurance certificate, the W-9 or a driver\'s background check form, by its kind, the holder named on it, the customer it belongs to, the driver, its file name or its note. A customer that is part of another, as a school is of its district, finds that customer\'s documents too. Every word has to match. Answers with the current copies only, each with the day it ends and a link to the file that lasts ten minutes. Leave search out to list them all.',
            inputSchema: z.object({
              search: z.string().max(80).default(''),
              limit: z.number().int().min(1).max(50).default(10),
            }),
            annotations: { readOnlyHint: true },
          },
          async ({ search, limit }) => {
            const rows = orThrow(await supabase.from('company_documents')
              .select('id, holder, ends_on, note, file_name, file_path, customer_id, kind:kind_id(name), customer:customer_id(name), driver:driver_id(name)')
              .is('replaced_at', null).order('created_at', { ascending: false })) as Record<string, any>[]
            // A district's certificate covers its schools, so a school's name finds it.
            const parts = orThrow(await supabase.from('customers').select('name, part_of_id')
              .not('part_of_id', 'is', null)) as Record<string, any>[]
            const partsOf = (id: string) => parts.filter(p => p.part_of_id === id).map(p => p.name)
            const words = search.toLowerCase().split(/\s+/).filter(Boolean)
            const found = rows.filter(row => {
              const hay = [row.kind?.name, row.holder, row.customer?.name, row.driver?.name, row.file_name, row.note,
                ...(row.customer_id ? partsOf(row.customer_id) : [])]
                .filter(Boolean).join(' ').toLowerCase()
              return words.every(word => hay.includes(word))
            }).slice(0, limit)
            // The bucket is private, so each file is reached through a link signed as the person asking.
            const out = []
            for (const row of found) {
              const { data } = await supabase.storage.from('company-documents').createSignedUrl(row.file_path, 600)
              out.push({
                id: row.id, kind: row.kind?.name ?? null, holder: row.holder ?? null, customer: row.customer?.name ?? null,
                driver: row.driver?.name ?? null, ends_on: row.ends_on, note: row.note, file_name: row.file_name,
                link: data?.signedUrl ?? null, link_lasts: '10 minutes',
              })
            }
            return answer(out)
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
            .describe(`Only the trip fields you are sure of. Allowed: ${[...DRAFT_FIELDS].join(', ')}. ` +
              'stops is the places between the pickup and the drop-off, in the order the bus reaches them, ' +
              'each { name, address, arrive, leave, date, leave_date } with a name or an address, times as HH:MM, ' +
              'and on a leg of more than one day the day it is reached and the day it is left as YYYY-MM-DD; ' +
              'on a round trip the destination is one of them. The editor lays them out on the Route tab, ' +
              'sets a place that is a saved location, and leaves any other for the person to choose from its list. ' +
              'On draft_trip_change, stops are the whole route again: they replace the stops of the leg the link opens, ' +
              'after the editor asks, so give every stop, not only the new ones. ' +
              'bus_count adds empty vehicles up to that many and takes none away. ' +
              'stop_changes, on draft_trip_change only, changes the trip\'s saved stops, each named by the id get_trip answers: ' +
              '{ id, arrive, leave, date, leave_date, dwell } with at least one of the rest, times as HH:MM, days as YYYY-MM-DD, ' +
              'and dwell what the wait counts as, on, off or sleeper; a hotel night is off. It never adds, removes or moves a stop. ' +
              'purchase_order is { ref, date, amount }, the PO\'s number, its day and its amount, its number or amount at least; ' +
              'it fills the Billing list\'s purchase order with that number, else one with no number, else adds one. ' +
              'contract is { signed_on, signed_by }, a signed contract\'s day and who signed it, the Billing list\'s Contract signed row. ' +
              'trip_contacts is the people to reach while the trip runs, up to five, each { name, phone, leg }; on a split trip ' +
              '(dropoff_pickup) leg is outbound for the drop-off\'s or return for the pickup\'s, and each goes into that day\'s contacts, ' +
              'whichever day the link opens. A person the trip already has is matched, not added twice. ' +
              'Give each only from the paper itself. A deposit is not a field, so say it in notes.'),
          notes: z.string().max(2000).optional()
            .describe('What you could not work out, shown at the top of the editor.'),
        }

        // What draft-fields.js says is wrong with a draft's fields, as one refusal.
        function checkFields(fields: Record<string, unknown>, change = false) {
          const wrong: string[] = DraftFields.problems(fields, { change })
          if (wrong.length) throw new Error(wrong.join(' '))
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
              'Park a change to an existing trip for the person to check: its fields, its whole route again with stops, its saved stops\' times and waits with stop_changes, a purchase order or a signed contract. A draft carries stops or stop_changes, not both. This does NOT change the trip: it returns a link that opens that trip in the editor with the changes filled in and marked, and only a Save applies them. One draft is one trip, and the link opens its first leg; a stop change on the other leg is named in the editor\'s notice.',
            inputSchema: z.object({ trip_id: z.string().uuid(), ...draftShape }),
          },
          async ({ trip_id, fields, notes }) => {
            checkFields(fields, true)
            const trip = orThrow(await supabase.from('trips').select('id').eq('id', trip_id).maybeSingle())
            if (!trip) throw new Error('No such trip, or it is not one you can see.')
            return saveDraft({ trip_id, fields, notes: notes ?? null })
          },
        )

        // The To do list. These four touch `to_dos` and nothing else. A row a
        // tool adds is an agent's: the database stamps it as Ruxbot's, keeps
        // the signed-in person beside it, and refuses a tool's close on a row
        // a person wrote.
        const OPEN_IT = 'It shows in Tasks on the scheduler\'s board, for everyone in the office.'

        /** A staff member's profile id by name, since a row's owner is a profile. */
        async function ownerId(name: string) {
          const staff = orThrow(await supabase.from('profiles').select('id, display_name').not('user_id', 'is', null))
          const want = name.trim().toLowerCase()
          const found = staff.filter((p) => String(p.display_name ?? '').trim().toLowerCase() === want)
          if (found.length !== 1) {
            throw new Error(`No one staff member is called "${name}". The staff are: ${staff.map((p) => p.display_name).join(', ')}.`)
          }
          return found[0].id as string
        }

        /** The row a tool may change or close: one an agent made, still open. */
        async function agentRow(id: string) {
          const row = orThrow(await supabase.from('to_dos').select('id, source, closed_at').eq('id', id).maybeSingle())
          if (!row) throw new Error('No such to-do row, or it is not one you can see.')
          if (row.source !== 'agent') {
            throw new Error('A person wrote that row, so it is theirs to change or tick. Say in your review what you found, and leave the row.')
          }
          if (row.closed_at) throw new Error('That row is already closed.')
          return row
        }

        server.registerTool(
          'list_to_dos',
          {
            title: 'List the to-do rows',
            description:
              'The rows stored in the office\'s To do list: what a person typed and what a review added, each with its kind, who it is about, its words and its detail. It does NOT list what the scheduler works out from the trips itself, such as a follow-up due or a trip short of a bus; needs_attention lists those, and get_trip gives one trip\'s. Open rows by default.',
            inputSchema: z.object({
              include_closed: z.boolean().default(false).describe('Also the rows already ticked or closed.'),
              trip_id: z.string().uuid().optional().describe('Only the rows about this trip.'),
              thread_key: z.string().max(200).optional().describe('Only the row about this email thread.'),
              limit: z.number().int().min(1).max(200).default(100),
            }),
            annotations: { readOnlyHint: true },
          },
          async ({ include_closed, trip_id, thread_key, limit }) => {
            let q = supabase.from('to_dos').select(TO_DO_ROW).order('created_at', { ascending: false }).limit(limit)
            if (!include_closed) q = q.is('closed_at', null)
            if (trip_id) q = q.eq('trip_id', trip_id)
            if (thread_key) q = q.eq('thread_key', thread_key)
            return answer(orThrow(await q))
          },
        )

        // The kinds of work a row can be. `scheduler/to-do-list.js` holds each
        // one's words and colour; this repeats the names, since a function
        // cannot load a browser file.
        const TO_DO_KINDS = ['quote', 'itinerary', 'po', 'change', 'respond', 'form', 'invoice'] as const
        /** A row's detail with each line trimmed and its blank lines dropped, or null for none. */
        const detailLines = (text: string) => text.split('\n').map((s) => s.trim()).filter(Boolean).join('\n') || null

        const toDoShape = {
          kind: z.enum(TO_DO_KINDS).optional().describe(
            'What kind of work it is, shown as a coloured tag: quote, a quote to send; itinerary, trips to enter or check from one; po, a PO or a signed contract to record; change, a booked trip or its quote to change; respond, a question to answer; form, a customer\'s form to fill in; invoice, an invoice to send.'),
          who: z.string().min(1).max(120).optional().describe(
            'Who it is about: the person, or the company when no person is named. The list shows it in bold ahead of the words.'),
          body: z.string().min(1).max(500).describe(
            'What to do, in a few words that fit one line: the group and the place, such as "cheer trip to Austin". The kind already says the work and who says the person, so leave both out.'),
          detail: z.string().min(1).max(1000).optional().describe(
            'A few short lines, split by line breaks. The first is the days and any count, such as "Jan 15 to 17, 2027 · 30 passengers", and shows on the closed row; leave the place out when the row has a trip, which names it. The rest are its notes, a list shown when the row is opened: one line for each thing the office needs before it opens the email, each a phrase of a few words and never a sentence, such as "Quoted Sep 24, never answered". 35 characters fill one line of the row, and a note runs to 70 at most.'),
          due_on: ISO_DATE.optional().describe('The day it is due. Left out, the row has no date.'),
          owner: z.string().max(80).optional().describe('The staff member it is for, by name. Left out, it is anyone\'s.'),
          trip_id: z.string().uuid().optional().describe('The trip it is about.'),
          thread_url: z.string().url().max(500).optional().describe('The email thread it came from, as a link.'),
          thread_key: z.string().max(200).optional().describe('The email thread\'s own id. One open row is kept per thread.'),
        }

        server.registerTool(
          'add_to_do',
          {
            title: 'Add a to-do row',
            description:
              'Add a row to the office\'s To do list after a review, in four parts: its kind, who it is about, what to do in a few words, and its detail. A closed row shows who it is about beside its due day, what to do, and one quiet line of its kind and its detail\'s first line, so each part stays short. Before adding a row about a trip, read get_trip: if its warnings or to_do already say it, do not add it, because the scheduler shows that itself. With a thread_key, a second call for the same thread changes the open row it made rather than adding a copy, and changes only the parts it gives: a part left out stays as the row has it.',
            inputSchema: z.object(toDoShape),
          },
          async ({ kind, who, body, detail, due_on, owner, trip_id, thread_url, thread_key }) => {
            // The parts this call gives, and no others, so a second call for a thread leaves the rest of its row alone.
            const given: Record<string, unknown> = { body }
            if (kind !== undefined) given.kind = kind
            if (who !== undefined) given.who = who.trim() || null
            if (detail !== undefined) given.detail = detailLines(detail)
            if (due_on !== undefined) given.due_on = due_on
            if (owner !== undefined) given.owner_id = await ownerId(owner)
            if (trip_id !== undefined) given.trip_id = trip_id
            if (thread_url !== undefined) given.thread_url = thread_url
            if (thread_key) {
              const open = orThrow(await supabase.from('to_dos').select('id, source')
                .eq('thread_key', thread_key).is('closed_at', null).maybeSingle())
              if (open) {
                if (open.source !== 'agent') throw new Error('A person already wrote the open row for that thread. Leave it, and say in your review what you found.')
                const changed = orThrow(await supabase.from('to_dos').update(given).eq('id', open.id).select(TO_DO_ROW).single())
                return answer({ changed: true, added: false, row: changed, next: OPEN_IT })
              }
            }
            const added = orThrow(await supabase.from('to_dos').insert({ ...given, thread_key: thread_key ?? null, source: 'agent' }).select(TO_DO_ROW).single())
            return answer({ added: true, row: added, next: OPEN_IT })
          },
        )

        server.registerTool(
          'change_to_do',
          {
            title: 'Change a to-do row',
            description:
              'Change a row a review added: its kind, who it is about, its words, its detail, its day, who it is for, its trip or its thread link. Only what you give is changed. A row a person wrote is refused.',
            inputSchema: z.object({
              id: z.string().uuid(),
              kind: z.enum(TO_DO_KINDS).nullable().optional().describe('The kind of work, as add_to_do lists them, or null for none.'),
              who: z.string().min(1).max(120).nullable().optional().describe('Who it is about, or null for nobody.'),
              body: toDoShape.body.optional(),
              detail: z.string().min(1).max(1000).nullable().optional().describe('Its detail, as add_to_do describes it, or null for none.'),
              due_on: ISO_DATE.nullable().optional().describe('The day it is due, or null for no date.'),
              owner: z.string().max(80).nullable().optional().describe('The staff member it is for, by name, or null for anyone.'),
              trip_id: z.string().uuid().nullable().optional().describe('The trip it is about, or null for none.'),
              thread_url: z.string().url().max(500).nullable().optional(),
            }),
          },
          async ({ id, kind, who, body, detail, due_on, owner, trip_id, thread_url }) => {
            await agentRow(id)
            const patch: Record<string, unknown> = {}
            if (kind !== undefined) patch.kind = kind
            if (who !== undefined) patch.who = who?.trim() || null
            if (body !== undefined) patch.body = body
            if (detail !== undefined) patch.detail = detail === null ? null : detailLines(detail)
            if (due_on !== undefined) patch.due_on = due_on
            if (owner !== undefined) patch.owner_id = owner === null ? null : await ownerId(owner)
            if (trip_id !== undefined) patch.trip_id = trip_id
            if (thread_url !== undefined) patch.thread_url = thread_url
            if (!Object.keys(patch).length) throw new Error('Nothing to change.')
            const row = orThrow(await supabase.from('to_dos').update(patch).eq('id', id).select(TO_DO_ROW).single())
            return answer({ changed: true, row })
          },
        )

        server.registerTool(
          'close_to_do',
          {
            title: 'Close a to-do row',
            description:
              'Close a row a review added, once what it asked for is done, with the reason: "The reply went out", "The PO arrived". The row moves to Done in the list for the rest of the day, where anyone can undo it. A row a person wrote is refused: say it looks done in your review, and leave it for them to tick.',
            inputSchema: z.object({
              id: z.string().uuid(),
              reason: z.string().min(1).max(300).describe('Why it is done, in a few words.'),
            }),
          },
          async ({ id, reason }) => {
            await agentRow(id)
            const ruxbot = orThrow(await supabase.rpc('ruxbot_profile_id'))
            const row = orThrow(await supabase.from('to_dos')
              .update({ closed_at: new Date().toISOString(), closed_by: ruxbot, closed_reason: reason })
              .eq('id', id).select(TO_DO_ROW).single())
            return answer({ closed: true, row })
          },
        )

        return server
      })

      return handler.fetch(req)
    },
  ),
)
