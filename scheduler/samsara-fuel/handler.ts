// What `samsara-fuel` answers, with no imports, so it runs the same in the
// Edge runtime and under Node, where scheduler/tools/check-samsara-fuel.mjs
// sends it sample readings. Once a night it works out each bus's miles per
// gallon and tank gallons from Samsara's last 90 days and keeps them in
// `bus_fuel_profiles`, for the bus column's fuel-needed tick.
//
// MILES PER GALLON are the miles over the gallons of Samsara's vehicle fuel
// and energy report across the 90 days.
//
// THE TANK is worked out where the fuel percent only falls: a rise of
// FILL_POINTS or more ends a stretch as a fill-up, and over a stretch that
// fell MIN_FALL points or more, the gallons the report says were burned over
// the points it fell give the tank's gallons. The median of the last
// MAX_STRETCHES such stretches stands, and a bus with fewer than
// MIN_STRETCHES keeps none, since one stretch alone can be a third off.

export const WINDOW_DAYS = 90
export const FILL_POINTS = 3
export const MIN_FALL = 20
export const MIN_STRETCHES = 3
export const MAX_STRETCHES = 8
const DAY_MS = 864e5
const ML_PER_GALLON = 3785.411784
const M_PER_MILE = 1609.344

export type Point = { time: string; value: number }
export type Bus = { id: string; number: string }
export type Vehicle = { id: string; name: string }
// A fuel and energy report over a span: what was burned and how far it went.
export type Burn = { fuelConsumedMl?: number; distanceTraveledMeters?: number }
export type Stretch = { from: string; to: string; fell: number }
export type Profile = { bus_id: string; mpg: number | null; tank_gallons: number | null; stretches: number; worked_out_at: string }

export type Deps = {
  keyed: boolean
  now: () => number
  buses: () => Promise<Bus[]>
  vehicles: () => Promise<Vehicle[]>
  // Each vehicle's fuel percents over the span, by vehicle id.
  fuel: (vehicleIds: string[], from: string, to: string) => Promise<Map<string, Point[]>>
  burn: (vehicleId: string, from: string, to: string) => Promise<Burn | null>
  save: (rows: Profile[]) => Promise<void>
}

const nameOf = (v: string | null | undefined) => String(v ?? '').trim().toLowerCase()
const round = (n: number, places: number) => Math.round(n * 10 ** places) / 10 ** places

// The stretches where the percent only fell, MIN_FALL points or more, oldest first.
export function stretchesOf(points: Point[]): Stretch[] {
  const sorted = [...points].sort((a, b) => Date.parse(a.time) - Date.parse(b.time))
  const out: Stretch[] = []
  let start = 0
  for (let i = 1; i <= sorted.length; i++) {
    if (i === sorted.length || sorted[i].value - sorted[i - 1].value >= FILL_POINTS) {
      const fell = sorted[start].value - sorted[i - 1].value
      if (fell >= MIN_FALL) out.push({ from: sorted[start].time, to: sorted[i - 1].time, fell: round(fell, 1) })
      start = i
    }
  }
  return out
}

export const gallonsOf = (b: Burn | null) => (b?.fuelConsumedMl && b.fuelConsumedMl > 0 ? b.fuelConsumedMl / ML_PER_GALLON : null)

export function mpgOf(b: Burn | null): number | null {
  const gal = gallonsOf(b)
  const miles = (b?.distanceTraveledMeters ?? 0) / M_PER_MILE
  return gal && miles > 0 ? round(miles / gal, 2) : null
}

export function median(values: number[]): number | null {
  if (!values.length) return null
  const s = [...values].sort((a, b) => a - b)
  const mid = s.length >> 1
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

// The tank's gallons from the stretches' burns, or null under MIN_STRETCHES.
export function tankOf(burns: { fell: number; gallons: number | null }[]): { tank: number | null; count: number } {
  const tanks = burns.filter(b => b.gallons).map(b => (b.gallons as number) / (b.fell / 100))
  return { tank: tanks.length >= MIN_STRETCHES ? round(median(tanks) as number, 1) : null, count: tanks.length }
}

export async function night(deps: Deps, write: boolean): Promise<{ profiles: Profile[]; unmatched: string[] }> {
  const to = new Date(deps.now()).toISOString()
  const from = new Date(deps.now() - WINDOW_DAYS * DAY_MS).toISOString()
  const [buses, vehicles] = await Promise.all([deps.buses(), deps.vehicles()])
  const vehicleOf = new Map(vehicles.map(v => [nameOf(v.name), v]))
  const pairs = buses.map(b => ({ bus: b, vehicle: vehicleOf.get(nameOf(b.number)) ?? null }))
  const matched = pairs.filter(p => p.vehicle) as { bus: Bus; vehicle: Vehicle }[]
  const fuel = await deps.fuel(matched.map(p => p.vehicle.id), from, to)
  const profiles: Profile[] = []
  for (const { bus, vehicle } of matched) {
    const whole = await deps.burn(vehicle.id, from, to)
    const stretches = stretchesOf(fuel.get(vehicle.id) ?? []).slice(-MAX_STRETCHES)
    const burns = []
    for (const st of stretches) burns.push({ fell: st.fell, gallons: gallonsOf(await deps.burn(vehicle.id, st.from, st.to)) })
    const { tank, count } = tankOf(burns)
    profiles.push({ bus_id: bus.id, mpg: mpgOf(whole), tank_gallons: tank, stretches: count, worked_out_at: to })
  }
  if (write && profiles.length) await deps.save(profiles)
  return { profiles, unmatched: pairs.filter(p => !p.vehicle).map(p => p.bus.number) }
}

// The nightly run carries no log-in: it sends SAMSARA_NIGHT_KEY in
// `x-night-key`, as samsara-miles's does. `{"write": false}` works it out and
// keeps nothing.
export async function handle(req: Request, deps: Deps, key: string): Promise<Response> {
  const reply = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
  if (req.method !== 'POST') return reply(405, { error: 'method' })
  if (!key || req.headers.get('x-night-key') !== key) return reply(401, { error: 'key' })
  if (!deps.keyed) return reply(503, { error: 'no-key' })
  let body: { write?: unknown } = {}
  try { body = await req.json() } catch { /* an empty body writes */ }
  try {
    return reply(200, await night(deps, body.write !== false))
  } catch {
    return reply(502, { error: 'samsara' })
  }
}
