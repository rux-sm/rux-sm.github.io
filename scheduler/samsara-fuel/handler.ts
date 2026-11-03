// What `samsara-fuel` answers, with no imports, so it runs the same in the
// Edge runtime and under Node, where scheduler/tools/check-samsara-fuel.mjs
// sends it sample readings. Once a night it works out each bus's miles per
// gallon from Samsara's last 90 days and keeps them in `bus_fuel_profiles`,
// for the bus column's fuel-needed tick; the tank is the bus's own
// `tank_gallons`, from its maker's sheet.
//
// MILES PER GALLON are the miles over the gallons of Samsara's vehicle fuel
// and energy report across the 90 days.

export const WINDOW_DAYS = 90
const DAY_MS = 864e5
const ML_PER_GALLON = 3785.411784
const M_PER_MILE = 1609.344

export type Bus = { id: string; number: string }
export type Vehicle = { id: string; name: string }
// A fuel and energy report over a span: what was burned and how far it went.
export type Burn = { fuelConsumedMl?: number; distanceTraveledMeters?: number }
export type Profile = { bus_id: string; mpg: number | null; worked_out_at: string }

export type Deps = {
  keyed: boolean
  now: () => number
  buses: () => Promise<Bus[]>
  vehicles: () => Promise<Vehicle[]>
  burn: (vehicleId: string, from: string, to: string) => Promise<Burn | null>
  save: (rows: Profile[]) => Promise<void>
}

const nameOf = (v: string | null | undefined) => String(v ?? '').trim().toLowerCase()

export function mpgOf(b: Burn | null): number | null {
  const gal = b?.fuelConsumedMl && b.fuelConsumedMl > 0 ? b.fuelConsumedMl / ML_PER_GALLON : 0
  const miles = (b?.distanceTraveledMeters ?? 0) / M_PER_MILE
  return gal && miles > 0 ? Math.round(miles / gal * 100) / 100 : null
}

export async function night(deps: Deps, write: boolean): Promise<{ profiles: Profile[]; unmatched: string[] }> {
  const to = new Date(deps.now()).toISOString()
  const from = new Date(deps.now() - WINDOW_DAYS * DAY_MS).toISOString()
  const [buses, vehicles] = await Promise.all([deps.buses(), deps.vehicles()])
  const vehicleOf = new Map(vehicles.map(v => [nameOf(v.name), v]))
  const pairs = buses.map(b => ({ bus: b, vehicle: vehicleOf.get(nameOf(b.number)) ?? null }))
  const profiles: Profile[] = []
  for (const { bus, vehicle } of pairs) {
    if (vehicle) profiles.push({ bus_id: bus.id, mpg: mpgOf(await deps.burn(vehicle.id, from, to)), worked_out_at: to })
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
