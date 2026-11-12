// The Edge Function `samsara-share`: where a customer's tracking page,
// share/track.html, asks where its trip stands and, while a leg is out, for
// the link to watch each bus on Samsara's map; what it answers is
// `handler.ts`. Samsara's API refuses calls from a web page and its key must
// never reach the public site, so the page asks here.
//
// The page has no log-in, and the trip's token is its only secret, so the
// trip is read with the service role once the token is found, as
// trip-document-link reads a document. A leg's yard-out and yard-back are
// read as samsara-miles reads them, in `miles.ts`, its handler as it is. It
// has two Samsara secrets: SAMSARA_API_TOKEN, the read-only key samsara-now
// uses, to find a bus's vehicle, and SAMSARA_SHARE_TOKEN, a key with
// Samsara's Write Live Sharing Links permission and nothing else, to make a
// link and to end one, so the one key that can write in Samsara can do
// nothing but this.

// Each import names one exact version, as check-connector.mjs holds it to;
// supabase-js is the version the site's pages load.
import 'jsr:@supabase/functions-js@2.116.0/edge-runtime.d.ts'

import { createClient } from 'npm:@supabase/supabase-js@2.116.0'
import { handle, type Kept, type ShareBody, type Shared, type Vehicle } from './handler.ts'
import { legsOf, legWindow, type Trip as MilesTrip } from './miles.ts'

const TOKEN = Deno.env.get('SAMSARA_API_TOKEN') ?? ''
const SHARE_TOKEN = Deno.env.get('SAMSARA_SHARE_TOKEN') ?? ''
const SAMSARA = 'https://api.samsara.com'

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

// A trip with its legs, routes and stops, as miles.ts reads them, and each
// vehicle's bus, which a partner's coach has none of.
const STOPS = 'trip_stops(id,leg,route_id,type,position,depart_prev,depart_prev_date,arrive,arrive_date,spot,spot_date,lat,lng)'
const LEGS = 'trip_legs(id,leg,start_date,end_date,created_at,trip_routes(id,position))'
const TRIP = `id,cancelled_at,start_date,end_date,departure_time,return_time,${STOPS},${LEGS},trip_assignments(bus_id,leg,route_id)`
const KEPT = 'id,leg_id,bus_id,samsara_id,url,expires_at'

// Samsara's answer, or an error carrying its status, whose words go to the
// function's log, which says why, such as a key without the permission.
async function samsara<T>(token: string, method: string, path: string, params: Record<string, string>, body?: unknown): Promise<T> {
  const q = new URLSearchParams(params)
  const r = await fetch(`${SAMSARA}${path}${q.size ? `?${q}` : ''}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  if (!r.ok) {
    console.warn(`samsara ${method} ${path} ${r.status} ${(await r.text()).slice(0, 300)}`)
    throw Object.assign(new Error(`samsara ${path} ${r.status}`), { status: r.status })
  }
  return await r.json()
}

Deno.serve(req => handle(req, {
  keyed: !!TOKEN && !!SHARE_TOKEN,
  now: () => Date.now(),
  async trip(token) {
    const { data, error } = await admin.from('trip_tracking_links').select(`trips(${TRIP})`).eq('token', token).maybeSingle()
    if (error) throw error
    const trip = (Array.isArray(data?.trips) ? data?.trips[0] : data?.trips) as (MilesTrip & { cancelled_at: string | null }) | null | undefined
    if (!trip) return null
    // Each leg that has its days, with its window and the company's buses on
    // its routes.
    const legs = legsOf(trip).flatMap(l => {
      const window = l.id ? legWindow(trip, l.key) : null
      if (!l.id || !window) return []
      const buses = (trip.trip_assignments || []).filter(a => a.bus_id && l.routes.includes(a.route_id ?? '')).map(a => a.bus_id!)
      return [{ id: l.id, start: window.start, end: window.end, buses: [...new Set(buses)] }]
    })
    return { id: trip.id, cancelled: !!trip.cancelled_at, legs }
  },
  async kept(tripId) {
    const { data, error } = await admin.from('trip_tracking_shares').select(KEPT).eq('trip_id', tripId)
    if (error) throw error
    return (data ?? []) as Kept[]
  },
  async keep(tripId, row) {
    const { error } = await admin.from('trip_tracking_shares').upsert({ trip_id: tripId, ...row }, { onConflict: 'leg_id,bus_id', ignoreDuplicates: true })
    if (error) throw error
    const { data, error: readError } = await admin.from('trip_tracking_shares').select(KEPT).eq('leg_id', row.leg_id).eq('bus_id', row.bus_id).single()
    if (readError) throw readError
    return data as Kept
  },
  async drop(id) {
    const { error } = await admin.from('trip_tracking_shares').delete().eq('id', id)
    if (error) throw error
  },
  async buses(ids) {
    const { data, error } = await admin.from('buses').select('id,number').in('id', ids)
    if (error) throw error
    return data ?? []
  },
  async vehicles() {
    const rows: Vehicle[] = []
    let after = ''
    do {
      const body = await samsara<{ data?: Vehicle[]; pagination?: { hasNextPage?: boolean; endCursor?: string } }>(
        TOKEN, 'GET', '/fleet/vehicles', { limit: '512', ...(after ? { after } : {}) })
      rows.push(...(body.data ?? []).map(v => ({ id: String(v.id), name: String(v.name ?? '') })))
      after = body.pagination?.hasNextPage ? body.pagination.endCursor ?? '' : ''
    } while (after)
    return rows
  },
  async share(link: ShareBody) {
    return (await samsara<{ data?: Shared }>(SHARE_TOKEN, 'POST', '/live-shares', {}, link)).data ?? {}
  },
  // Samsara ends a link by its expiry, and asks for its name with it; a link
  // it no longer has is ended already.
  async end(samsaraId, at) {
    try {
      await samsara(SHARE_TOKEN, 'PATCH', '/live-shares', { id: samsaraId }, { name: 'Tracking link, ended', expiresAtTime: at })
    } catch (e) {
      if ((e as { status?: number })?.status !== 404) throw e
    }
  },
}))
