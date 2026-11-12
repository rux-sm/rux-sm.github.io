// What `samsara-share` answers, with no imports, so it runs the same in the
// Edge runtime and under Node, where scheduler/tools/check-samsara-share.mjs
// sends it an invented trip. The customer's tracking page, share/track.html,
// sends the token of its trip's link, with no log-in, and is told where the
// trip stands and, while a leg is out, where to watch each of its buses.
//
// A BUS IS SHOWN ONLY DURING ITS LEG: from the leg's yard-out to an hour after
// its yard-back. Before a leg the answer is `before` with when it starts,
// between two legs the same for the next, and after the last `ended`, as it
// is for a cancelled trip. A trip none of whose buses is the company's own
// is `none`, since a partner's coach is not in Samsara.
//
// A BUS'S LINK IS SAMSARA'S LIVE SHARING LINK of its one vehicle, the vehicle
// named with the bus's number, as in samsara-now, expiring when the leg's
// showing ends. It is made on the first visit of the leg and kept, so every
// later visit is answered with the same link. A kept link whose bus is no
// longer on the leg that is out, or whose trip is cancelled, is ended in
// Samsara and forgotten, so a swapped bus stops showing and the bus that
// took its place gets a link of its own.
//
// The answer is `{ state }`, with `starts` when `before`, and when `live`
// `until` and `buses`, each `{ number, url }`, the url null for a bus Samsara
// does not have. An unknown token is 404. Without both of its keys the
// function answers `no-key` when a link has to be made, and a link key
// Samsara refuses is answered `no-permission`.

// The longest a link lasts, so a link does not show a bus for good; a leg
// longer than this gets a new link when its first runs out.
export const MAX_MS = 7 * 24 * 3600_000
// How long after a leg's yard-back its buses still show.
export const AFTER_MS = 3600_000
// How soon a link no longer wanted stops working: Samsara takes no time past.
export const END_MS = 60_000

// A leg of the trip with the company's own buses on it, and its planned
// yard-out and yard-back.
export type Leg = { id: string; start: number; end: number; buses: string[] }
export type Trip = { id: string; cancelled: boolean; legs: Leg[] }
export type Bus = { id: string; number: string | null }
export type Vehicle = { id: string; name: string }
// A link made before, as `trip_tracking_shares` keeps it.
export type Kept = { id: string; leg_id: string; bus_id: string; samsara_id: string; url: string; expires_at: string }
export type ShareBody = {
  name: string
  type: 'assetsLocation'
  assetsLocationLinkConfig: { assetId: string }
  expiresAtTime: string
}
export type Shared = { id?: string; liveSharingUrl?: string; expiresAtTime?: string }

export type Deps = {
  // The trip a token is the link of, or null when no link has it.
  trip(token: string): Promise<Trip | null>
  // The trip's kept links.
  kept(tripId: string): Promise<Kept[]>
  // Keeps a link, and answers the one that stands for its bus and leg, which
  // is another's where two visits made one at the same moment.
  keep(tripId: string, row: Omit<Kept, 'id'>): Promise<Kept>
  // Forgets a kept link.
  drop(id: string): Promise<void>
  buses(ids: string[]): Promise<Bus[]>
  // Every vehicle in Samsara.
  vehicles(): Promise<Vehicle[]>
  // Makes the link; throws an error with Samsara's `status` when refused.
  share(body: ShareBody): Promise<Shared>
  // Ends a link in Samsara at the time given; one already gone is ended.
  end(samsaraId: string, at: string): Promise<void>
  keyed: boolean
  now(): number
}

// The pages that ask: the site, and its two local previews.
const ORIGINS = new Set([
  'https://rux-sm.github.io',
  'http://localhost:8640',
  'http://localhost:8641',
])

const TOKEN = /^[0-9a-f]{32}$/

function headers(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin && ORIGINS.has(origin) ? origin : 'https://rux-sm.github.io',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
    'Cache-Control': 'no-store',
  }
}

const nameOf = (v: string | null | undefined) => String(v ?? '').trim().toLowerCase()
const iso = (ms: number) => new Date(ms).toISOString()

export async function handle(req: Request, deps: Deps): Promise<Response> {
  const base = headers(req.headers.get('origin'))
  const reply = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { ...base, 'Content-Type': 'application/json' } })

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: base })
  if (req.method !== 'POST') return reply(405, { error: 'method' })

  let token = ''
  try {
    const body = await req.json()
    token = typeof body?.token === 'string' ? body.token.trim() : ''
  } catch {
    // A body that is not JSON carries no token, and is answered as one.
  }
  if (!TOKEN.test(token)) return reply(400, { error: 'no-token' })

  let trip: Trip | null
  let kept: Kept[]
  try {
    trip = await deps.trip(token)
    if (!trip) return reply(404, { error: 'not-found' })
    kept = await deps.kept(trip.id)
  } catch {
    return reply(502, { error: 'unavailable' })
  }

  const now = deps.now()
  const legs = trip.legs.filter(l => l.buses.length).sort((a, b) => a.start - b.start)
  const live = trip.cancelled ? null : legs.find(l => l.start <= now && now < l.end + AFTER_MS) ?? null

  // A kept link that ran out is forgotten; one still working whose bus is not
  // on the leg that is out is ended first, and kept if Samsara could not be
  // told, so the next visit tries again.
  const standing: Kept[] = []
  for (const row of kept) {
    const wanted = !!live && row.leg_id === live.id && live.buses.includes(row.bus_id)
    const working = Date.parse(row.expires_at) > now
    if (wanted && working) { standing.push(row); continue }
    try {
      if (working) await deps.end(row.samsara_id, iso(now + END_MS))
      await deps.drop(row.id)
    } catch {
      // Left for the next visit.
    }
  }

  if (!live) {
    if (trip.cancelled) return reply(200, { state: 'ended' })
    if (!legs.length) return reply(200, { state: 'none' })
    const next = legs.find(l => l.start > now)
    return reply(200, next ? { state: 'before', starts: iso(next.start) } : { state: 'ended' })
  }

  const shows = live.end + AFTER_MS
  const missing = live.buses.filter(id => !standing.some(r => r.bus_id === id))
  let buses: Bus[]
  let vehicles: Vehicle[] = []
  try {
    buses = await deps.buses(live.buses)
  } catch {
    return reply(502, { error: 'unavailable' })
  }
  if (missing.length) {
    if (!deps.keyed) return reply(503, { error: 'no-key' })
    try {
      vehicles = await deps.vehicles()
    } catch {
      return reply(502, { error: 'samsara' })
    }
  }

  const urls = new Map(standing.map(r => [r.bus_id, r.url]))
  const expires = iso(Math.min(shows, now + MAX_MS))
  for (const id of missing) {
    const bus = buses.find(b => b.id === id)
    const vehicle = bus?.number ? vehicles.find(v => nameOf(v.name) === nameOf(bus.number)) : undefined
    if (!bus || !vehicle) continue
    try {
      const shared = await deps.share({
        name: `Bus ${bus.number}`,
        type: 'assetsLocation',
        assetsLocationLinkConfig: { assetId: vehicle.id },
        expiresAtTime: expires,
      })
      if (!shared?.liveSharingUrl || !shared.id) return reply(502, { error: 'samsara' })
      const made = { leg_id: live.id, bus_id: id, samsara_id: shared.id, url: shared.liveSharingUrl, expires_at: shared.expiresAtTime ?? expires }
      const stands = await deps.keep(trip.id, made).catch(() => null)
      // Another visit's link stands for this bus, so this one is ended.
      if (stands && stands.samsara_id !== made.samsara_id) await deps.end(made.samsara_id, iso(now + END_MS)).catch(() => {})
      urls.set(id, stands?.url ?? made.url)
    } catch (e) {
      const status = (e as { status?: number })?.status
      return reply(status === 401 || status === 403 ? 403 : 502, { error: status === 401 || status === 403 ? 'no-permission' : 'samsara' })
    }
  }

  return reply(200, {
    state: 'live',
    until: iso(shows),
    buses: live.buses
      .map(id => ({ number: buses.find(b => b.id === id)?.number ?? null, url: urls.get(id) ?? null }))
      .sort((a, b) => String(a.number ?? '').localeCompare(String(b.number ?? ''), 'en', { numeric: true })),
  })
}
