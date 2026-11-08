// What `samsara-share` answers, with no imports, so it runs the same in the
// Edge runtime and under Node, where scheduler/tools/check-samsara-share.mjs
// sends it an invented fleet. A trip bar's Copy tracking link asks it for a
// link a customer can open to watch one bus on Samsara's map, and copies what
// it answers for the office to text them.
//
// The body is `{ bus_id, until }`: the scheduler bus, and when the link stops
// working, which may be no sooner than now and no later than MAX_MS on. The
// bus is read on the caller's own log-in, so only staff get a link. A BUS IS
// THE SAMSARA VEHICLE NAMED WITH ITS NUMBER, as in samsara-now. The link is
// Samsara's live sharing link of that one vehicle, named for the bus, and the
// answer is `{ url, until }`. A key without Samsara's Write Live Sharing
// Links permission is answered `no-permission`.

// The longest a link lasts, so a link sent once does not show the bus for good.
export const MAX_MS = 7 * 24 * 3600_000

export type Bus = { id: string; number: string | null }
export type Vehicle = { id: string; name: string }
export type ShareBody = {
  name: string
  type: 'assetsLocation'
  assetsLocationLinkConfig: { assetId: string }
  expiresAtTime: string
}
export type Shared = { id?: string; liveSharingUrl?: string; expiresAtTime?: string }

export type Deps = {
  // The scheduler bus, read on the caller's log-in; null when it is not
  // there or the caller may not read it.
  bus(id: string): Promise<Bus | null>
  // Every vehicle in Samsara.
  vehicles(): Promise<Vehicle[]>
  // Makes the link; throws an error with Samsara's `status` when refused.
  share(body: ShareBody): Promise<Shared>
  keyed: boolean
  now(): number
}

// The pages that ask: the site, and its log-in preview.
const ORIGINS = new Set([
  'https://rux-sm.github.io',
  'http://localhost:8641',
])

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

export async function handle(req: Request, deps: Deps): Promise<Response> {
  const base = headers(req.headers.get('origin'))
  const reply = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { ...base, 'Content-Type': 'application/json' } })

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: base })
  if (req.method !== 'POST') return reply(405, { error: 'method' })
  if (!/^Bearer\s+\S+/i.test(req.headers.get('authorization') ?? '')) return reply(401, { error: 'log-in' })

  let body: { bus_id?: unknown; until?: unknown }
  try {
    body = await req.json()
  } catch {
    return reply(400, { error: 'body' })
  }
  const now = deps.now()
  const until = Date.parse(String(body?.until ?? ''))
  if (typeof body?.bus_id !== 'string' || !body.bus_id || !Number.isFinite(until) || until <= now) return reply(400, { error: 'body' })

  let bus: Bus | null
  try {
    bus = await deps.bus(body.bus_id)
  } catch {
    return reply(502, { error: 'unavailable' })
  }
  // A caller who may not read the bus is answered as if there were none,
  // before Samsara is asked anything.
  if (!bus?.number) return reply(404, { error: 'not-found' })
  if (!deps.keyed) return reply(503, { error: 'no-key' })

  let vehicle: Vehicle | undefined
  try {
    vehicle = (await deps.vehicles()).find(v => nameOf(v.name) === nameOf(bus!.number))
  } catch {
    return reply(502, { error: 'samsara' })
  }
  if (!vehicle) return reply(404, { error: 'no-vehicle' })

  const expires = new Date(Math.min(until, now + MAX_MS)).toISOString()
  try {
    const shared = await deps.share({
      name: `Bus ${bus.number}`,
      type: 'assetsLocation',
      assetsLocationLinkConfig: { assetId: vehicle.id },
      expiresAtTime: expires,
    })
    if (!shared?.liveSharingUrl) return reply(502, { error: 'samsara' })
    return reply(200, { url: shared.liveSharingUrl, until: shared.expiresAtTime ?? expires })
  } catch (e) {
    const status = (e as { status?: number })?.status
    return reply(status === 401 || status === 403 ? 403 : 502, { error: status === 401 || status === 403 ? 'no-permission' : 'samsara' })
  }
}
