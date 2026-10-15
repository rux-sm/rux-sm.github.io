// The Edge Function `samsara-miles`: a trip's id in, how far each of its
// buses went by Samsara's odometer out; what it answers is `handler.ts`.
// Samsara's API refuses calls from a web page and its key must never reach
// the public site, so the editor asks here.
//
// The trip is read on the caller's own log-in, so only staff can read one
// through it, as through the connector. Its one secret, SAMSARA_API_TOKEN, is
// a read-only Samsara key (Read Vehicles, Read Vehicle Statistics, Read
// Vehicle Trips for who drove, and the Compliance hours permission for the
// drivers' names), set in the dashboard.

// Each import names one exact version, as check-connector.mjs holds it to;
// supabase-js is the version the site's pages load.
import 'jsr:@supabase/functions-js@2.116.0/edge-runtime.d.ts'

import { createClient } from 'npm:@supabase/supabase-js@2.116.0'
import { handle, type Readings, type Trip, type Vehicle, type VehicleTrip } from './handler.ts'

const TOKEN = Deno.env.get('SAMSARA_API_TOKEN') ?? ''
const SAMSARA = 'https://api.samsara.com'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!

const STOPS = 'trip_stops(leg,type,position,depart_prev,depart_prev_date,arrive,arrive_date,spot,spot_date)'
const TRIP = `id,start_date,end_date,return_start_date,return_end_date,departure_time,return_time,${STOPS}`

// Every page of a Samsara list.
async function samsara<T>(path: string, params: Record<string, string>): Promise<T[]> {
  const rows: T[] = []
  let after = ''
  do {
    const q = new URLSearchParams({ ...params, ...(after ? { after } : {}) })
    const r = await fetch(`${SAMSARA}${path}?${q}`, { headers: { Authorization: `Bearer ${TOKEN}` } })
    if (!r.ok) {
      // Samsara's status and words go to the function's log, which says why a
      // list did not come, such as a key without the permission it needs.
      console.warn(`samsara ${path} ${r.status} ${(await r.text()).slice(0, 300)}`)
      throw new Error(`samsara ${path} ${r.status}`)
    }
    const body = await r.json()
    rows.push(...(body?.data ?? []))
    after = body?.pagination?.hasNextPage ? body.pagination.endCursor ?? '' : ''
  } while (after)
  return rows
}

Deno.serve(req => {
  // The caller's own session, with the page's publishable key it sent.
  const db = createClient(SUPABASE_URL, req.headers.get('apikey') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: req.headers.get('authorization') ?? '' } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return handle(req, {
    keyed: !!TOKEN,
    now: () => Date.now(),
    async trip(id) {
      const { data, error } = await db.from('trips')
        .select(`${TRIP},trip_assignments(bus_id,leg)`).eq('id', id).maybeSingle()
      if (error) throw error
      return data as Trip | null
    },
    async buses(ids) {
      const { data, error } = await db.from('buses').select('id,number').in('id', ids)
      if (error) throw error
      return data ?? []
    },
    async drivers() {
      const { data, error } = await db.from('drivers').select('id,name')
      if (error) throw error
      return data ?? []
    },
    async others(busIds, from, to, except) {
      const { data, error } = await db.from('trips')
        .select(`${TRIP},trip_assignments!inner(bus_id,leg)`)
        .in('trip_assignments.bus_id', busIds)
        .neq('id', except)
        .is('cancelled_at', null)
        .lte('start_date', to)
        .or(`end_date.gte.${from},return_end_date.gte.${from},start_date.gte.${from}`)
      if (error) throw error
      return (data ?? []) as Trip[]
    },
    async vehicles() {
      const rows = await samsara<Vehicle>('/fleet/vehicles', { limit: '512' })
      return rows.map(v => ({ id: String(v.id), name: String(v.name ?? '') }))
    },
    async readings(vehicleIds, at) {
      const rows = await samsara<{ id: string } & Readings[string]>('/fleet/vehicles/stats', {
        types: 'obdOdometerMeters,gpsOdometerMeters,gpsDistanceMeters',
        time: at,
        vehicleIds: vehicleIds.join(','),
      })
      return Object.fromEntries(rows.map(({ id, ...stats }) => [String(id), stats]))
    },
    // Samsara's legacy list of a vehicle's trips, which is not paged.
    async vehicleTrips(vehicleId, fromMs, toMs) {
      const q = new URLSearchParams({ vehicleId, startMs: String(Math.round(fromMs)), endMs: String(Math.round(toMs)) })
      const r = await fetch(`${SAMSARA}/v1/fleet/trips?${q}`, { headers: { Authorization: `Bearer ${TOKEN}` } })
      if (!r.ok) {
        console.warn(`samsara /v1/fleet/trips ${r.status} ${(await r.text()).slice(0, 300)}`)
        throw new Error(`samsara /v1/fleet/trips ${r.status}`)
      }
      return ((await r.json())?.trips ?? []) as VehicleTrip[]
    },
    // The drivers' names, from the hours list, which names every driver.
    async samsaraDrivers() {
      const rows = await samsara<{ driver?: { id?: string; name?: string } }>('/fleet/hos/clocks', { limit: '512' })
      return rows.map(c => ({ id: String(c.driver?.id ?? ''), name: String(c.driver?.name ?? '') })).filter(d => d.id)
    },
  })
})
