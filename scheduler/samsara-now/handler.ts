// What `samsara-now` answers, with no imports, so it runs the same in the
// Edge runtime and under Node, where scheduler/tools/check-samsara-now.mjs
// sends it sample fleets. The board asks it once a minute while a trip is on
// the road, and gets back, for each bus Samsara knows, whether its engine is
// on, how fast it is going, and the drivers logged into it with their duty
// status and the driving hours each has left.
//
// A BUS IS THE SAMSARA VEHICLE NAMED WITH ITS NUMBER, as in samsara-miles. A
// DRIVER IS THE SAMSARA DRIVER WITH THE SAME FIRST AND LAST NAME: middle names,
// initials and a Jr. or Sr. are passed over, because the office writes
// "Felipe Jr. Pena" where Samsara has "Felipe Pena". Two drivers in the
// scheduler with one first and last name match nobody, rather than the wrong
// one.
//
// HOURS LEFT is the least of the three clocks Samsara keeps, driving, shift and
// cycle, which is how long the driver may still drive. Without the key's hours
// permission the buses still come back, with no drivers and `hours` false.

// A reading older than this says nothing about now.
export const FRESH_MS = 15 * 60_000

export type Bus = { id: string; number: string | null }
export type Driver = { id: string; name: string | null }
export type Vehicle = { id: string; name: string }
export type Stat = {
  id: string
  engineState?: { time: string; value: string }
  gps?: { time: string; speedMilesPerHour?: number; reverseGeo?: { formattedLocation?: string } }
}
export type Clock = {
  driver?: { id?: string; name?: string }
  currentDutyStatus?: { hosStatusType?: string }
  currentVehicle?: { id?: string; name?: string }
  clocks?: {
    drive?: { driveRemainingDurationMs?: number }
    shift?: { shiftRemainingDurationMs?: number }
    cycle?: { cycleRemainingDurationMs?: number }
  }
}

export type Deps = {
  // The buses and drivers, read on the caller's own log-in; empty when the
  // caller may not read them.
  buses(): Promise<Bus[]>
  drivers(): Promise<Driver[]>
  // Every vehicle in Samsara, each one's engine and position now, and every
  // driver's hours; `clocks` throws when the key may not read hours.
  vehicles(): Promise<Vehicle[]>
  stats(vehicleIds: string[]): Promise<Stat[]>
  clocks(): Promise<Clock[]>
  keyed: boolean
  now(): number
}

export type Duty = 'driving' | 'on' | 'sleeper' | 'off'
export type LiveDriver = {
  driver_id: string | null
  name: string
  duty: Duty | null
  left_ms: number | null
  drive_ms: number | null
  shift_ms: number | null
  cycle_ms: number | null
  wheel: boolean
}
export type LiveBus = {
  bus_id: string
  engine: 'on' | 'idle' | 'off' | null
  mph: number | null
  place: string | null
  seen: string | null
  drivers: LiveDriver[]
}
export type Answer = { at: string; hours: boolean; buses: LiveBus[] }

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

// ── names ───────────────────────────────────────────────────────────────────

const SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv'])

// A person's first and last name, lowercased with accents off, or null for a
// name with fewer than two words left.
export function nameKey(name: string | null | undefined): string | null {
  const words = String(name ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z\s-]/g, ' ').split(/\s+/).filter(w => w && w.length > 1 && !SUFFIXES.has(w))
  return words.length >= 2 ? `${words[0]} ${words.at(-1)}` : null
}

// Each first-and-last name to the one scheduler driver who has it.
export function driverIndex(drivers: Driver[]): Map<string, string> {
  const seen = new Map<string, string | null>()
  for (const d of drivers) {
    const key = nameKey(d.name)
    if (!key) continue
    seen.set(key, seen.has(key) ? null : d.id)
  }
  return new Map([...seen].filter((e): e is [string, string] => e[1] != null))
}

// ── duty and hours ──────────────────────────────────────────────────────────

const DUTY: Record<string, Duty> = {
  driving: 'driving',
  onDuty: 'on', yardMove: 'on',
  sleeperBed: 'sleeper', sleeperBerth: 'sleeper',
  offDuty: 'off', personalConveyance: 'off',
}

const ms = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : null)

export function liveDriver(c: Clock, index: Map<string, string>): LiveDriver {
  const drive = ms(c.clocks?.drive?.driveRemainingDurationMs)
  const shift = ms(c.clocks?.shift?.shiftRemainingDurationMs)
  const cycle = ms(c.clocks?.cycle?.cycleRemainingDurationMs)
  const known = [drive, shift, cycle].filter((v): v is number => v != null)
  const name = String(c.driver?.name ?? '').trim()
  return {
    driver_id: index.get(nameKey(name) ?? '') ?? null,
    name,
    duty: DUTY[c.currentDutyStatus?.hosStatusType ?? ''] ?? null,
    left_ms: known.length ? Math.min(...known) : null,
    drive_ms: drive, shift_ms: shift, cycle_ms: cycle,
    wheel: false,
  }
}

const RANK: Record<string, number> = { driving: 0, on: 1 }

// Who is at the wheel: the driver Samsara has driving, or else the one on
// duty, and of two on duty the one with the least driving left, who drove
// last. Nobody, when the drivers are all resting or off.
export function markWheel(drivers: LiveDriver[]): LiveDriver[] {
  const able = drivers.filter(d => d.duty === 'driving' || d.duty === 'on')
    .sort((a, b) => RANK[a.duty!] - RANK[b.duty!] || (a.drive_ms ?? Infinity) - (b.drive_ms ?? Infinity))
  return drivers.map(d => ({ ...d, wheel: d === able[0] }))
}

const ENGINE: Record<string, 'on' | 'idle' | 'off'> = { On: 'on', Idle: 'idle', Off: 'off' }
const nameOf = (v: string | null | undefined) => String(v ?? '').trim().toLowerCase()

export async function liveFor(buses: Bus[], drivers: Driver[], deps: Deps): Promise<Answer> {
  const now = deps.now()
  const vehicles = await deps.vehicles()
  const vehicleOf = new Map(vehicles.map(v => [nameOf(v.name), v.id]))
  const pairs = buses.map(b => ({ bus: b, vehicle: vehicleOf.get(nameOf(b.number)) ?? null }))
    .filter((p): p is { bus: Bus; vehicle: string } => !!p.vehicle)
  const ids = pairs.map(p => p.vehicle)

  let hours = true
  const [stats, clocks] = await Promise.all([
    ids.length ? deps.stats(ids) : Promise.resolve([] as Stat[]),
    deps.clocks().catch(() => { hours = false; return [] as Clock[] }),
  ])
  const statOf = new Map(stats.map(s => [String(s.id), s]))
  const index = driverIndex(drivers)
  const inVehicle = new Map<string, LiveDriver[]>()
  for (const c of clocks) {
    const v = c.currentVehicle?.id ? String(c.currentVehicle.id) : null
    if (!v) continue
    inVehicle.set(v, [...(inVehicle.get(v) ?? []), liveDriver(c, index)])
  }

  return {
    at: new Date(now).toISOString(),
    hours,
    buses: pairs.map(({ bus, vehicle }) => {
      const s = statOf.get(vehicle)
      const engineAt = s?.engineState ? Date.parse(s.engineState.time) : NaN
      const gpsAt = s?.gps ? Date.parse(s.gps.time) : NaN
      const engineFresh = now - engineAt <= FRESH_MS
      const gpsFresh = now - gpsAt <= FRESH_MS
      const seen = [engineAt, gpsAt].filter(Number.isFinite)
      return {
        bus_id: bus.id,
        engine: engineFresh ? ENGINE[s!.engineState!.value] ?? null : null,
        mph: gpsFresh && typeof s!.gps!.speedMilesPerHour === 'number' ? Math.round(s!.gps!.speedMilesPerHour) : null,
        place: gpsFresh ? s!.gps!.reverseGeo?.formattedLocation ?? null : null,
        seen: seen.length ? new Date(Math.max(...seen)).toISOString() : null,
        drivers: markWheel(inVehicle.get(vehicle) ?? []),
      }
    }),
  }
}

export async function handle(req: Request, deps: Deps): Promise<Response> {
  const base = headers(req.headers.get('origin'))
  const reply = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { ...base, 'Content-Type': 'application/json' } })

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: base })
  if (req.method !== 'POST') return reply(405, { error: 'method' })
  if (!/^Bearer\s+\S+/i.test(req.headers.get('authorization') ?? '')) return reply(401, { error: 'log-in' })

  let buses: Bus[], drivers: Driver[]
  try {
    [buses, drivers] = await Promise.all([deps.buses(), deps.drivers()])
  } catch {
    return reply(502, { error: 'unavailable' })
  }
  // A caller who may not read the fleet is answered as if there were none,
  // before Samsara is asked anything.
  if (!buses.length) return reply(404, { error: 'not-found' })
  if (!deps.keyed) return reply(503, { error: 'no-key' })

  try {
    return reply(200, await liveFor(buses, drivers, deps))
  } catch {
    return reply(502, { error: 'samsara' })
  }
}
