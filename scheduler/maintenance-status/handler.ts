// What `maintenance-status` answers, with no imports, so it runs the same in
// the Edge runtime and under Node, where
// scheduler/tools/check-maintenance-status.mjs sends it invented legs and
// paths. The maintenance link asks it once a minute while a bar's details are
// open, with the link's token, and gets back, for each bus on a leg now:
//   yard  the bus has not left: it has reached none of its leg's stops and
//         stands within road.js's reach of the yard;
//   road  it is out on its leg by road.js's `isOut`, with `back` the time it
//         is expected in once its next stop is at the yard, the return or a
//         drop-off there before it, and null before;
//   back  it has reached a stop at the yard with only the yard after it,
//         with `back` the time it came within reach of the yard.
// Nothing else leaves: never where a bus is, how fast it goes or who drives
// it, because the link opens without a log-in.
//
// THE LEG AND WHERE THE BUS IS ON IT ARE THE BOARD'S OWN. `week` and `road`
// are week.js and road.js, built into road.ts, so the link and the board
// never disagree about a bus. The bus's readings and its path are
// samsara-now's `liveFor`, asked through road.js's `live`, so a path starts
// and is kept as the board's is.
//
// THE DRIVE HOME is Geoapify's, chosen as places.js chooses, the short route
// when it is at least SHORTER fewer miles for at most SLOWER more time, and
// slowed by the office's percent, as the board's driveBetween is. A bus's
// drive is asked again only after DRIVE_MS, as road.js's arrivals are.
//
// ONE ANSWER SERVES EVERYONE for CACHE_MS, since there is one link, so a link
// open on ten phones asks Samsara once a minute.

export const CACHE_MS = 60_000
export const DRIVE_MS = 5 * 60_000
export const SHORTER = 0.05
export const SLOWER = 0.10

export type Point = [number, number]
export type Settings = { yard: Point | null; slowPercent: number; lateReturn: unknown }
export type Route = { time: number; distance: number }
// A leg's trip as the board reads it: its stops, legs and routes, and its
// assignments, each with `bus_id`, `leg`, `route_id` and the bus's `number`.
// deno-lint-ignore no-explicit-any
export type Trip = any
export type Deps = {
  shareOk(token: string): Promise<boolean>
  // The trips with a bus that run on any day from `fromDay` to `toDay`.
  trips(fromDay: string, toDay: string): Promise<Trip[]>
  settings(): Promise<Settings>
  // samsara-now's liveFor, for these buses, each with its path since a time.
  // deno-lint-ignore no-explicit-any
  live(buses: { id: string; number: string | null }[], paths: Record<string, string>): Promise<{ at: string; buses: any[] }>
  route(a: Point, b: Point, type: 'balanced' | 'short'): Promise<Route | null>
  // deno-lint-ignore no-explicit-any
  week: any
  // deno-lint-ignore no-explicit-any
  road: any
  keyed: boolean
  now(): number
}
export type State = 'yard' | 'road' | 'back'
export type Status = { tripId: string; leg: string; busId: string; state: State; back: string | null }
export type Answer = { at: string; buses: Status[] }

// An office day, "2026-10-20", `n` days from the one `ms` falls on.
export function officeDay(ms: number, n = 0): string {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date(ms)).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

// The route a bus would drive, as places.js picks it, in whole minutes.
export function driveMinutes(fast: Route | null, short: Route | null): number | null {
  const p = fast && short && short.distance <= fast.distance * (1 - SHORTER)
    && short.time <= fast.time * (1 + SLOWER) ? short : fast
  return p ? Math.round(p.time / 60) : null
}

// When a path, having left where it began, first came within `reach` miles
// of `to`, or null.
// deno-lint-ignore no-explicit-any
export function cameIn(path: [number, number, number][], to: Point | null, road: any): string | null {
  if (!to || !path?.length) return null
  let left = false
  for (const p of path) {
    left ||= road.miles(path[0], p) > road.NEAR_MILES
    if (left && road.miles(to, p) <= road.NEAR_MILES) return new Date(p[2]).toISOString()
  }
  return null
}

let held: { at: number; answer: Answer } | null = null
// deno-lint-ignore no-explicit-any
let paths: any = null
const drives = new Map<string, { at: number; stop: string; back: number | null }>()
// For the check, which runs one answer after another on one clock.
export function forget() { held = null; paths = null; drives.clear() }

// deno-lint-ignore no-explicit-any
async function driveHome(deps: Deps, settings: Settings, busId: string, stop: any, here: Point, now: number): Promise<number | null> {
  const had = drives.get(busId)
  if (had && had.stop === stop.key && now - had.at < DRIVE_MS) return had.back
  const [fast, short] = await Promise.all([
    deps.route(here, stop.point, 'balanced'),
    deps.route(here, stop.point, 'short').catch(() => null),
  ])
  const min = driveMinutes(fast, short)
  const slowed = min == null ? null : settings.slowPercent ? Math.round(min * (1 + settings.slowPercent / 100)) : min
  const back = slowed == null ? null : now + slowed * 60_000
  drives.set(busId, { at: now, stop: stop.key, back })
  return back
}

export async function statusFor(deps: Deps): Promise<Answer> {
  const now = deps.now()
  if (held && now - held.at < CACHE_MS) return held.answer
  const settings = await deps.settings()
  deps.week.setLateReturn(settings.lateReturn)
  const { week, road } = deps

  // Every bus's leg whose stretch on the road holds now.
  const legs = []
  for (const trip of await deps.trips(officeDay(now, -1), officeDay(now, 1))) {
    for (const a of trip.trip_assignments ?? []) {
      if (!a.bus_id) continue
      const key = week.legKeyOfVehicle(trip, a)
      const leg = key != null ? week.legByKey(trip, key) : null
      const span = leg ? road.span(leg) : null
      if (!span || now < span[0] || now > span[1]) continue
      legs.push({ trip, a, leg, span })
    }
  }

  const buses: Status[] = []
  if (legs.length) {
    // Each bus's path from the start of its leg's stretch; of two legs on
    // one bus, the later, as the board asks.
    const since: Record<string, number> = {}
    const fleet = new Map<string, { id: string; number: string | null }>()
    for (const { a, span } of legs) {
      since[a.bus_id] = Math.max(since[a.bus_id] ?? 0, span[0])
      fleet.set(a.bus_id, { id: a.bus_id, number: a.number ?? null })
    }
    // road.js's own asking, which holds a path to its last twelve hours and
    // keeps it between answers, handed samsara-now's liveFor as its function.
    paths ??= road.live({ functions: { invoke: async (_name: string, { body }: { body: { paths?: Record<string, string> } }) =>
      ({ data: await deps.live([...fleet.values()], body?.paths ?? {}), error: null }) } }, deps.now)
    const live = await paths.ask(since)
    const byId = new Map((live?.buses ?? []).map((b: { bus_id: string }) => [b.bus_id, b]))

    for (const { trip, a, leg, span } of legs) {
      const bus = byId.get(a.bus_id)
      if (!bus) continue
      const stops = road.stopsOf(trip, leg.leg)
      const where = road.whereOn(stops, bus.path ?? [], bus, now)
      const home = stops.map((s: { type: string }) => s.type).lastIndexOf('return')
      const yard: Point | null = (home >= 0 && stops[home].point) || settings.yard
      const here: Point | null = bus.lat != null && bus.lng != null ? [bus.lat, bus.lng] : null
      const base = { tripId: String(trip.id), leg: a.leg || 'outbound', busId: String(a.bus_id) }
      /* Whether every stop from `i` to the yard return is at the yard, within
         road.js's reach of the return, so a group let off at the yard before
         the bus parks has the bus home: heading in once such a stop is next,
         back once it has reached one. */
      const atHome = (i: number) => home >= 0 && i >= 0 && stops.slice(i, home + 1)
        .every((s: { point: Point | null }) => !s.point || !stops[home].point || road.miles(s.point, stops[home].point) <= road.NEAR_MILES)
      if (home >= 0 && atHome(where.reached)) {
        buses.push({ ...base, state: 'back', back: cameIn(bus.path ?? [], yard, road) })
      } else if (where.reached < 0 && here && yard && road.miles(yard, here) <= road.NEAR_MILES) {
        buses.push({ ...base, state: 'yard', back: null })
      } else if (road.isOut(bus, span, now)) {
        const homeNext = atHome(where.next) && !where.at && here && stops[where.next].point
        const back = homeNext ? await driveHome(deps, settings, base.busId, stops[where.next], here, now).catch(() => null) : null
        buses.push({ ...base, state: 'road', back: back == null ? null : new Date(back).toISOString() })
      }
    }
  }
  const answer = { at: new Date(now).toISOString(), buses }
  held = { at: now, answer }
  return answer
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

export async function handle(req: Request, deps: Deps): Promise<Response> {
  const base = headers(req.headers.get('origin'))
  const reply = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { ...base, 'Content-Type': 'application/json' } })

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: base })
  if (req.method !== 'POST') return reply(405, { error: 'method' })

  let token = ''
  try { token = String((await req.json())?.token ?? '').trim().toLowerCase() } catch { /* no body */ }
  // A link's token is hex; anything else is no link, and the database is not asked.
  if (!/^[0-9a-f]{8,64}$/.test(token)) return reply(404, { error: 'not-found' })
  try {
    if (!(await deps.shareOk(token))) return reply(404, { error: 'not-found' })
  } catch {
    return reply(502, { error: 'unavailable' })
  }
  if (!deps.keyed) return reply(503, { error: 'no-key' })
  try {
    return reply(200, await statusFor(deps))
  } catch {
    return reply(502, { error: 'samsara' })
  }
}
