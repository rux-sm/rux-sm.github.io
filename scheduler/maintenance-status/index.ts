// The Edge Function `maintenance-status`: the maintenance link's token in,
// each bus on a leg now out, as at the yard, on the road or back, with the
// time it is due in; what it answers is `handler.ts`. Samsara's and
// Geoapify's keys must never reach a page, so the link asks here.
//
// It reads with the service role, because the link opens without a log-in
// and the trips are closed to it, after `shareOk` has found the token live.
// Its one secret, SAMSARA_API_TOKEN, is the read-only key samsara-now uses;
// the Geoapify key, the yard and the office's slow-down are the settings rows
// the board reads. road.ts and samsara.ts are built from the board's files by
// scheduler/tools/build-maintenance-road.mjs.

// Each import names one exact version, as check-connector.mjs holds it to;
// supabase-js is the version the site's pages load.
import 'jsr:@supabase/functions-js@2.116.0/edge-runtime.d.ts'

import { createClient } from 'npm:@supabase/supabase-js@2.116.0'
import { handle, type Point, type Route } from './handler.ts'
import board from './road.ts'
import { liveFor, type Clock, type Fix, type Stat, type Vehicle } from './samsara.ts'

const TOKEN = Deno.env.get('SAMSARA_API_TOKEN') ?? ''
const SAMSARA = 'https://api.samsara.com'
const GEOAPIFY = 'https://api.geoapify.com/v1'

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

// Every page of a Samsara list, as samsara-now asks.
async function samsara<T>(path: string, params: Record<string, string>): Promise<T[]> {
  const rows: T[] = []
  let after = ''
  do {
    const q = new URLSearchParams({ ...params, ...(after ? { after } : {}) })
    const r = await fetch(`${SAMSARA}${path}?${q}`, { headers: { Authorization: `Bearer ${TOKEN}` } })
    if (!r.ok) {
      console.warn(`samsara ${path} ${r.status} ${(await r.text()).slice(0, 300)}`)
      throw new Error(`samsara ${path} ${r.status}`)
    }
    const body = await r.json()
    rows.push(...(body?.data ?? []))
    after = body?.pagination?.hasNextPage ? body.pagination.endCursor ?? '' : ''
  } while (after)
  return rows
}

// The trip columns the board reads a leg by, as data.js selects them.
const TRIP = [
  'id,trip_type,start_date,end_date,return_start_date,return_end_date,departure_time,return_time,bus_count,return_bus_count',
  'trip_stops(id,position,leg,route_id,type,name,address,lat,lng,depart_prev,arrive,spot,depart_prev_date,arrive_date,spot_date)',
  'trip_legs(id,leg,kind,start_date,end_date,bus_count,created_at,trip_routes(id,position,name))',
  'trip_assignments(id,leg,route_id,bus_id,buses(number))',
].join(',')

let geoapifyKey = ''

Deno.serve(req => handle(req, {
  keyed: !!TOKEN,
  now: () => Date.now(),
  week: board.SchedulerWeek,
  road: board.SchedulerRoad,
  async shareOk(token) {
    const { data, error } = await admin.from('maintenance_schedule_shares')
      .select('scope').eq('scope', 'main').eq('token', token).is('revoked_at', null).maybeSingle()
    if (error) throw error
    return !!data
  },
  async trips(fromDay, toDay) {
    const { data, error } = await admin.from('trips').select(TRIP)
      .is('cancelled_at', null).lte('start_date', toDay)
      .or(`start_date.gte.${fromDay},end_date.gte.${fromDay},return_end_date.gte.${fromDay}`)
    if (error) throw error
    return (data ?? []).map(t => ({
      ...t,
      trip_assignments: (t.trip_assignments ?? []).map((a: { buses?: { number?: string } | null }) => ({ ...a, number: a.buses?.number ?? null })),
    }))
  },
  async settings() {
    const { data, error } = await admin.from('settings').select('key,value')
      .in('key', ['geoapify-key-v1', 'yard-location-v1', 'route-times-v1', 'late-return-v1'])
    if (error) throw error
    const byKey = new Map((data ?? []).map(r => [r.key, r.value]))
    geoapifyKey = typeof byKey.get('geoapify-key-v1') === 'string' ? byKey.get('geoapify-key-v1') : ''
    const yard = byKey.get('yard-location-v1')
    return {
      yard: yard?.lat != null && yard?.lng != null ? [Number(yard.lat), Number(yard.lng)] as Point : null,
      slowPercent: Number(byKey.get('route-times-v1')?.drive_slowdown_percent) || 0,
      lateReturn: byKey.get('late-return-v1') ?? null,
    }
  },
  live(buses, paths) {
    return liveFor(buses, [], {
      keyed: !!TOKEN,
      now: () => Date.now(),
      buses: async () => buses,
      drivers: async () => [],
      async vehicles() {
        const rows = await samsara<Vehicle>('/fleet/vehicles', { limit: '512' })
        return rows.map(v => ({ id: String(v.id), name: String(v.name ?? '') }))
      },
      stats: vehicleIds => samsara<Stat>('/fleet/vehicles/stats', { types: 'engineStates,gps', vehicleIds: vehicleIds.join(',') }),
      // No driver leaves this function, so their hours are not asked.
      clocks: async () => [] as Clock[],
      // With no clocks there is no resting driver, so no duty logs are asked.
      logs: async () => [],
      async history(vehicleIds, from, to) {
        const rows = await samsara<{ id: string; gps?: Fix[] }>('/fleet/vehicles/stats/history', {
          types: 'gps', vehicleIds: vehicleIds.join(','),
          startTime: new Date(from).toISOString(), endTime: new Date(to).toISOString(),
        })
        const out: Record<string, Fix[]> = {}
        for (const r of rows) (out[String(r.id)] ??= []).push(...(r.gps ?? []))
        return out
      },
    }, paths)
  },
  async route(a, b, type): Promise<Route | null> {
    if (!geoapifyKey) return null
    const q = new URLSearchParams({ waypoints: `${a[0]},${a[1]}|${b[0]},${b[1]}`, mode: 'drive', type, apiKey: geoapifyKey })
    const r = await fetch(`${GEOAPIFY}/routing?${q}`)
    if (!r.ok) {
      // Geoapify's status and words go to the function's log, which says why a
      // drive did not come, such as a key held to the site's own pages.
      console.warn(`geoapify routing ${r.status} ${(await r.text()).slice(0, 300)}`)
      throw new Error(`geoapify ${r.status}`)
    }
    const p = (await r.json())?.features?.[0]?.properties
    return p ? { time: Number(p.time), distance: Number(p.distance) } : null
  },
}))
