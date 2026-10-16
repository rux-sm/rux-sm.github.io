// What `samsara-miles` answers, with no imports, so it runs the same in the
// Edge runtime and under Node, where scheduler/tools/check-samsara-miles.mjs
// sends it sample trips. The trip editor's Get from Samsara sends a trip's id
// and gets back how far each of its buses went on each leg, by Samsara's
// odometer, who drove each one on each leg and in all, when each reached each
// leg's pickup, and the farthest bus's total for the Actual miles box.
//
// A LEG'S WINDOW is its planned yard-out to yard-back, from its stops, widened
// by two hours each side to catch an early start or a late return; a parked
// bus adds no miles, so the margin costs nothing. The margin stops where the
// same bus's previous or next trip begins, and a bus booked on another trip
// inside the window itself gets no miles for that leg.
//
// A BUS'S PICKUP ARRIVAL is when it reached its leg's pickup by the reach the
// board's live line keeps in scheduler/road.js, for a stay that lasts until
// two hours before the pickup is due or later: the first point of a stay
// within a quarter mile of it, or when the bus came to rest where it stood
// still two minutes within half a mile, or five minutes within a mile and a
// half before it drove two and a half miles off. A bus already there when
// its window opens, as at a pickup in the yard, arrived when the window
// opens; one standing at a yard near the pickup has not. It is read across
// the leg's window, to twelve hours past the due time at most, and while the
// leg is still out.
//
// TIMES ARE THE OFFICE'S. The stops keep McAllen wall-clock times with no zone,
// and each is turned into an instant with that date's offset.

export const ZONE = 'America/Chicago'
export const MARGIN_MS = 2 * 3600_000
const METERS_PER_MILE = 1609.344
const DAY_MS = 86_400_000
// A leg with no yard-back time ends at this hour the day after its last date,
// the office's late-return line.
const LATE_HOUR = 4

export type Stop = {
  leg: string | null
  type: string | null
  position: number | null
  depart_prev: string | null
  depart_prev_date: string | null
  arrive: string | null
  arrive_date: string | null
  spot: string | null
  spot_date: string | null
  lat?: number | string | null
  lng?: number | string | null
}
export type Assignment = { bus_id: string | null; leg: string | null }
export type Trip = {
  id: string
  start_date: string | null
  end_date: string | null
  return_start_date: string | null
  return_end_date: string | null
  departure_time: string | null
  return_time: string | null
  trip_stops: Stop[]
  trip_assignments: Assignment[]
}
export type Bus = { id: string; number: string | null }
export type Vehicle = { id: string; name: string }
export type Reading = { time: string; value: number }
export type Readings = Record<string, {
  obdOdometerMeters?: Reading
  gpsOdometerMeters?: Reading
  gpsDistanceMeters?: Reading
}>

export type Driver = { id: string; name: string | null }
export type VehicleTrip = { startMs: number; endMs?: number; driverId?: number | string | null; distanceMeters?: number }
export type SamsaraDriver = { id: string; name: string }
export type Fix = { time: string; latitude: number; longitude: number }

export type Deps = {
  // The trip with its stops and buses, read on the caller's own log-in, or
  // null when there is none or the caller may not read it.
  trip(id: string): Promise<Trip | null>
  // The buses by id, and every driver, read the same way.
  buses(ids: string[]): Promise<Bus[]>
  drivers(): Promise<Driver[]>
  // Other trips, not cancelled, that put one of these buses on the road
  // between the two dates; each carries only those buses' assignments.
  others(busIds: string[], from: string, to: string, except: string): Promise<Trip[]>
  // Every vehicle in Samsara.
  vehicles(): Promise<Vehicle[]>
  // Each vehicle's last odometer readings at or before an instant.
  readings(vehicleIds: string[], at: string): Promise<Readings>
  // Samsara's own trips for a vehicle between two instants, each with the
  // driver logged in; throws when the key may not read them.
  vehicleTrips(vehicleId: string, fromMs: number, toMs: number): Promise<VehicleTrip[]>
  // Every Samsara driver's id and name.
  samsaraDrivers(): Promise<SamsaraDriver[]>
  // A vehicle's GPS points between two instants.
  gps(vehicleId: string, fromMs: number, toMs: number): Promise<Fix[]>
  // Whether a Samsara key is set.
  keyed: boolean
  now(): number
}

export type LegNote = 'not-in-samsara' | 'other-trip' | 'not-finished' | 'no-readings'
export type BusLeg = {
  leg: 'outbound' | 'return'
  miles: number | null
  source: 'engine' | 'gps' | null
  note: LegNote | null
  // Who drove the bus on this leg, for the leg's own seats, most miles first,
  // or null when Samsara could not say.
  drivers: Drove[] | null
  // When the bus reached the leg's pickup, or null when it did not, the
  // pickup has no map point, or Samsara could not say.
  pickup_at: string | null
}
// A driver Samsara saw drive the bus, matched to the scheduler's where it can
// be, or nobody logged in when `name` is null.
export type Drove = { driver_id: string | null; name: string | null; miles: number }
export type BusMiles = {
  bus_id: string; number: string | null; miles: number | null; legs: BusLeg[]
  // Who drove it, most miles first, or null when Samsara could not say.
  drivers: Drove[] | null
}
export type Answer = {
  legs: { leg: 'outbound' | 'return'; from: string; to: string; timed: boolean }[]
  buses: BusMiles[]
  actual: number | null
}

// The pages that ask: the site, and its log-in preview.
const ORIGINS = new Set([
  'https://rux-sm.github.io',
  'http://localhost:8641',
])

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function headers(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin && ORIGINS.has(origin) ? origin : 'https://rux-sm.github.io',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
    'Cache-Control': 'no-store',
  }
}

// ── time ────────────────────────────────────────────────────────────────────

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME = /^(\d{1,2}):(\d{2})/

// What a McAllen wall clock reads at an instant, as if it were UTC.
function wall(ms: number): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONE, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(ms))
  const n = (t: string) => Number(parts.find(p => p.type === t)?.value)
  return Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute'), n('second'))
}

// The instant a McAllen date and time name. The offset is found at a first
// guess and checked once more, which settles a guess across a clock change.
export function instant(date: string, time: string | null): number | null {
  const d = DATE.exec(date ?? '')
  if (!d) return null
  const t = TIME.exec(time ?? '00:00')
  if (!t || Number(t[1]) > 23 || Number(t[2]) > 59) return null
  const asUtc = Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(t[1]), Number(t[2]))
  // A date the calendar does not have would roll into the next month.
  if (new Date(asUtc).toISOString().slice(0, 10) !== date) return null
  let ms = asUtc - (wall(asUtc) - asUtc)
  ms = asUtc - (wall(ms) - ms)
  return ms
}

const iso = (ms: number) => new Date(ms).toISOString()

// ── a leg's window ──────────────────────────────────────────────────────────

export type Window = { start: number; end: number; timed: boolean }

// A leg's planned yard-out to yard-back, read the way the Route tab reads the
// saved rows: the `pickup` row's departure is the yard-out, the last `return`
// row's arrival the yard-back. With no times it is the leg's whole days, to
// the late-return hour after the last. Null when the leg has no dates.
export function legWindow(trip: Trip, leg: 'outbound' | 'return'): Window | null {
  const from = leg === 'return' ? trip.return_start_date : trip.start_date
  const to = (leg === 'return' ? trip.return_end_date : trip.end_date) ?? from
  if (!from || !to) return null
  const rows = (trip.trip_stops || []).filter(s => (s.leg || 'outbound') === leg)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  const pickup = rows.find(s => s.type === 'pickup') ?? null
  const back = [...rows].reverse().find(s => s.type === 'return') ?? null

  const outTime = pickup?.depart_prev ?? pickup?.spot ?? (leg === 'outbound' ? trip.departure_time : null)
  const outDate = (pickup?.depart_prev ? pickup.depart_prev_date : pickup?.spot ? pickup.spot_date : null) ?? from
  const backTime = back?.arrive ?? back?.depart_prev ?? (leg === 'outbound' && !trip.return_start_date ? trip.return_time : null)
  const backDate = (back?.arrive ? back.arrive_date : back?.depart_prev ? back.depart_prev_date : null) ?? to

  const timed = !!(outTime && backTime)
  const start = instant(outDate, outTime ?? '00:00')
  let end = backTime ? instant(backDate, backTime) : instant(to, `${LATE_HOUR}:00`)
  if (start == null || end == null) return null
  if (!backTime) end += DAY_MS
  // A yard-back read as earlier than the yard-out is past midnight.
  while (end <= start) end += DAY_MS
  return { start, end, timed }
}

const legsOf = (trip: Trip): ('outbound' | 'return')[] =>
  trip.return_start_date ? ['outbound', 'return'] : ['outbound']

// ── the pickup ──────────────────────────────────────────────────────────────

const NEAR_MILES = 0.25
const EARLY_MS = 2 * 3600_000
const AFTER_DUE_MS = 12 * 3600_000
// Standing still, and how near and how long counts, as scheduler/road.js has them.
const PARKED_MILES = 0.5
const STILL_MILES = 0.03
const CREPT_MILES = 0.15
const PARKED_MS = 2 * 60_000
const AREA_MILES = 1.5
const LOADED_MS = 5 * 60_000
const GONE_MILES = 2.5

// The miles between two points as the crow flies; each is [lat, lng].
export function crow(a: [number, number], b: [number, number]): number {
  const rad = Math.PI / 180
  const dLat = (b[0] - a[0]) * rad, dLng = (b[1] - a[1]) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2
  return 3958.8 * 2 * Math.asin(Math.sqrt(h))
}

// A leg's pickup, the row week.js picks, with its map point and when the bus
// is due there: its Spot, or the leg's departure where it has none, on the
// row's own date or the leg's first day. Null when it has no map point.
export function pickupOf(trip: Trip, leg: 'outbound' | 'return'): { point: [number, number]; due: number | null } | null {
  const rows = (trip.trip_stops || []).filter(s => (s.leg || 'outbound') === leg)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  const p = rows.find(s => s.type === 'pickup') ?? rows[0]
  if (!p || p.lat == null || p.lng == null || p.lat === '' || p.lng === '') return null
  const point: [number, number] = [Number(p.lat), Number(p.lng)]
  if (!point.every(Number.isFinite)) return null
  const from = leg === 'return' ? trip.return_start_date : trip.start_date
  const [time, date] = p.spot ? [p.spot, p.spot_date]
    : [p.depart_prev ?? (leg === 'outbound' ? trip.departure_time : trip.return_time), p.depart_prev ? p.depart_prev_date : null]
  return { point, due: time && (date ?? from) ? instant((date ?? from)!, time) : null }
}

// When the bus reached the pickup, for a stay that reaches two hours before
// it is due, as an instant, or null. A parked bus sends few points, so a stay
// inside the quarter mile is the points there with none outside between
// them, and a bus has stood still since it came to rest within GPS wander,
// or across a long quiet with little ground between two points. Standing
// still counts only once the bus has left where its points start, so a bus
// waiting at a yard near the pickup has not reached it.
export function arrivalAt(point: [number, number], due: number | null, fixes: Fix[]): number | null {
  const pts = fixes.map(f => ({ at: Date.parse(f.time), p: [f.latitude, f.longitude] as [number, number] }))
    .filter(f => Number.isFinite(f.at) && f.p.every(Number.isFinite)).sort((a, b) => a.at - b.at)
  const early = due == null ? -Infinity : due - EARLY_MS
  let came: number | null = null
  let left = false
  let rest: typeof pts[number] | null = null
  let before: typeof pts[number] | null = null
  let waited: number | null = null
  for (const f of pts) {
    const d = crow(point, f.p)
    came = d > NEAR_MILES ? null : came ?? f.at
    left ||= crow(pts[0].p, f.p) > NEAR_MILES
    if (!rest || crow(rest.p, f.p) > STILL_MILES) rest = f
    const crept = !!before && f.at - before.at >= PARKED_MS && crow(before.p, f.p) <= CREPT_MILES
    const since = crept ? Math.min(rest.at, before!.at) : rest.at
    before = f
    if (f.at < early) continue
    if (came != null) return came
    if (!left) continue
    if (f.at - since >= PARKED_MS && d <= PARKED_MILES) return since
    if (waited == null && f.at - since >= LOADED_MS && d <= AREA_MILES) waited = since
    if (waited != null && d > GONE_MILES) return waited
  }
  return null
}

const legOfAssignment = (a: Assignment): 'outbound' | 'return' => (a.leg === 'return' ? 'return' : 'outbound')

// ── miles ───────────────────────────────────────────────────────────────────

// The McAllen date of an instant.
const day = (ms: number) => new Date(wall(ms)).toISOString().slice(0, 10)

// The miles between two sets of readings, from the engine's odometer where
// both have it, else Samsara's GPS ones. A kind whose last reading is from
// before the window was not read on the road, which a bus on a trip always
// is, so it is passed over; null when no kind is left.
export function between(a: Readings[string] | undefined, b: Readings[string] | undefined, start: number):
  { miles: number; source: 'engine' | 'gps' } | null {
  const kinds = [['obdOdometerMeters', 'engine'], ['gpsOdometerMeters', 'gps'], ['gpsDistanceMeters', 'gps']] as const
  for (const [kind, source] of kinds) {
    const x = a?.[kind]
    const y = b?.[kind]
    if (!x || !y || !Number.isFinite(x.value) || !Number.isFinite(y.value)) continue
    if (Date.parse(y.time) < start) continue
    const meters = y.value - x.value
    if (meters < 0) continue
    return { miles: Math.round(meters / METERS_PER_MILE), source }
  }
  return null
}

const nameKey = (v: string | null | undefined) => String(v ?? '').trim().toLowerCase()

/* A SAMSARA DRIVER IS THE SCHEDULER'S WITH THE SAME FIRST AND LAST NAME, the
   rule samsara-now matches by: middle names, initials and a Jr. or Sr. are
   passed over, and a name two drivers share matches nobody. */
const SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv'])
export function personKey(name: string | null | undefined): string | null {
  const words = String(name ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z\s-]/g, ' ').split(/\s+/).filter(w => w && w.length > 1 && !SUFFIXES.has(w))
  return words.length >= 2 ? `${words[0]} ${words.at(-1)}` : null
}
function driverIndex(drivers: Driver[]): Map<string, string> {
  const seen = new Map<string, string | null>()
  for (const d of drivers) {
    const key = personKey(d.name)
    if (key) seen.set(key, seen.has(key) ? null : d.id)
  }
  return new Map([...seen].filter((e): e is [string, string] => e[1] != null))
}

export async function milesFor(trip: Trip, deps: Deps): Promise<Answer> {
  const legs = legsOf(trip)
    .map(leg => ({ leg, w: legWindow(trip, leg) }))
    .filter((l): l is { leg: 'outbound' | 'return'; w: Window } => !!l.w)

  const busIds = [...new Set((trip.trip_assignments || []).map(a => a.bus_id).filter((v): v is string => !!v))]
  if (!busIds.length || !legs.length) {
    return { legs: legs.map(l => ({ leg: l.leg, from: iso(l.w.start), to: iso(l.w.end), timed: l.w.timed })), buses: [], actual: null }
  }

  const first = Math.min(...legs.map(l => l.w.start))
  const last = Math.max(...legs.map(l => l.w.end))
  const [buses, others, vehicles] = await Promise.all([
    deps.buses(busIds),
    deps.others(busIds, day(first - DAY_MS), day(last + DAY_MS), trip.id),
    deps.vehicles(),
  ])
  // A bus is its Samsara vehicle when the vehicle's name is the bus's number.
  const vehicleOf = new Map(vehicles.map(v => [nameKey(v.name), v.id]))
  const numberOf = new Map(buses.map(b => [b.id, b.number]))

  // The same bus's windows on other trips.
  const busy = new Map<string, Window[]>()
  for (const o of others) {
    for (const a of o.trip_assignments || []) {
      if (!a.bus_id) continue
      const w = legWindow(o, legOfAssignment(a))
      if (w) busy.set(a.bus_id, [...(busy.get(a.bus_id) ?? []), w])
    }
  }

  // Each bus on each of its legs: the instants to read at, or why not.
  type Ask = { bus: string; leg: 'outbound' | 'return'; vehicle: string | null; from: number; to: number; note: LegNote | null }
  const asks: Ask[] = []
  const now = deps.now()
  for (const bus of busIds) {
    const on = new Set((trip.trip_assignments || []).filter(a => a.bus_id === bus).map(legOfAssignment))
    const vehicle = vehicleOf.get(nameKey(numberOf.get(bus))) ?? null
    for (const { leg, w } of legs) {
      if (!on.has(leg)) continue
      const near = busy.get(bus) ?? []
      let from = w.start - MARGIN_MS
      let to = w.end + MARGIN_MS
      let note: LegNote | null = vehicle ? null : 'not-in-samsara'
      for (const o of near) {
        if (o.start < w.end && o.end > w.start) note = note ?? 'other-trip'
        else if (o.end <= w.start) from = Math.max(from, o.end)
        else if (o.start >= w.end) to = Math.min(to, o.start)
      }
      if (!note && w.end > now) note = 'not-finished'
      asks.push({ bus, leg, vehicle, from, to: Math.min(to, now), note })
    }
  }

  // One Samsara call per instant, for every vehicle read at it.
  const wanted = new Map<number, Set<string>>()
  for (const a of asks) {
    if (a.note || !a.vehicle) continue
    for (const at of [a.from, a.to]) wanted.set(at, (wanted.get(at) ?? new Set()).add(a.vehicle))
  }
  const read = new Map<number, Readings>()
  await Promise.all([...wanted].map(async ([at, ids]) => { read.set(at, await deps.readings([...ids], iso(at))) }))

  // Each bus's arrival at each leg's pickup, from its GPS points; a vehicle
  // whose points do not come has none.
  const arrived = new Map<string, number | null>()
  await Promise.all(asks.map(async a => {
    if (!a.vehicle || (a.note && a.note !== 'not-finished')) return
    const pickup = pickupOf(trip, a.leg)
    if (!pickup) return
    const to = pickup.due != null ? Math.min(a.to, pickup.due + AFTER_DUE_MS) : a.to
    if (to <= a.from) return
    const fixes = await deps.gps(a.vehicle, a.from, to).catch(() => [] as Fix[])
    arrived.set(`${a.bus}|${a.leg}`, arrivalAt(pickup.point, pickup.due, fixes))
  }))
  const pickupAt = (bus: string, leg: string) => {
    const at = arrived.get(`${bus}|${leg}`)
    return at == null ? null : iso(at)
  }

  /* Who drove each bus: Samsara's own trips for it that start inside each
     leg's window, their miles added up for each driver logged in. Without the
     key's permission to read them, nobody is known. */
  let known = true
  const segments = new Map<string, VehicleTrip[]>()
  let names = new Map<string, string>()
  let index = new Map<string, string>()
  const askable = asks.filter(a => a.vehicle && a.note !== 'other-trip')
  try {
    const [found, theirs, ours] = await Promise.all([
      Promise.all(askable.map(a => deps.vehicleTrips(a.vehicle!, a.from, a.to))),
      deps.samsaraDrivers().catch(() => [] as SamsaraDriver[]),
      deps.drivers(),
    ])
    askable.forEach((a, i) => segments.set(`${a.bus}|${a.leg}`, found[i]))
    names = new Map(theirs.map(d => [String(d.id), d.name]))
    index = driverIndex(ours)
  } catch {
    known = false
  }
  const droveFor = (bus: string, leg?: 'outbound' | 'return'): Drove[] | null => {
    if (!known) return null
    const meters = new Map<string, number>()
    for (const a of asks.filter(x => x.bus === bus && (!leg || x.leg === leg))) {
      for (const s of segments.get(`${bus}|${a.leg}`) ?? []) {
        if (!(s.startMs >= a.from && s.startMs <= a.to)) continue
        const who = s.driverId ? String(s.driverId) : ''
        meters.set(who, (meters.get(who) ?? 0) + (s.distanceMeters ?? 0))
      }
    }
    return [...meters].map(([who, m]) => {
      const name = who ? names.get(who) ?? null : null
      return { driver_id: index.get(personKey(name) ?? '') ?? null, name, miles: Math.round(m / METERS_PER_MILE) }
    }).filter(d => d.name || d.miles > 0).sort((x, y) => y.miles - x.miles)
  }

  const out: BusMiles[] = busIds.map(bus => {
    const mine: BusLeg[] = asks.filter(a => a.bus === bus).map(a => {
      const drivers = droveFor(bus, a.leg)
      const pickup_at = pickupAt(bus, a.leg)
      if (a.note || !a.vehicle) return { leg: a.leg, miles: null, source: null, note: a.note, drivers, pickup_at }
      const got = between(read.get(a.from)?.[a.vehicle], read.get(a.to)?.[a.vehicle], a.from)
      return got
        ? { leg: a.leg, miles: got.miles, source: got.source, note: null, drivers, pickup_at }
        : { leg: a.leg, miles: null, source: null, note: 'no-readings' as const, drivers, pickup_at }
    })
    const whole = mine.length > 0 && mine.every(l => l.miles != null)
    return { bus_id: bus, number: numberOf.get(bus) ?? null, miles: whole ? mine.reduce((n, l) => n + (l.miles ?? 0), 0) : null,
      legs: mine, drivers: droveFor(bus) }
  })
  const totals = out.map(b => b.miles).filter((m): m is number => m != null)
  return {
    legs: legs.map(l => ({ leg: l.leg, from: iso(l.w.start), to: iso(l.w.end), timed: l.w.timed })),
    buses: out,
    actual: totals.length ? Math.max(...totals) : null,
  }
}

export async function handle(req: Request, deps: Deps): Promise<Response> {
  const base = headers(req.headers.get('origin'))
  const reply = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { ...base, 'Content-Type': 'application/json' } })

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: base })
  if (req.method !== 'POST') return reply(405, { error: 'method' })
  if (!/^Bearer\s+\S+/i.test(req.headers.get('authorization') ?? '')) return reply(401, { error: 'log-in' })

  let id = ''
  try {
    const body = await req.json()
    id = typeof body?.trip_id === 'string' ? body.trip_id.trim() : ''
  } catch {
    // A body that is not JSON carries no id, and is answered as one.
  }
  if (!UUID.test(id)) return reply(400, { error: 'no-id' })

  let trip: Trip | null
  try {
    trip = await deps.trip(id)
  } catch {
    return reply(502, { error: 'unavailable' })
  }
  // A trip the caller may not read is answered as one that does not exist,
  // before Samsara is asked anything.
  if (!trip) return reply(404, { error: 'not-found' })
  if (!deps.keyed) return reply(503, { error: 'no-key' })

  try {
    return reply(200, await milesFor(trip, deps))
  } catch {
    return reply(502, { error: 'samsara' })
  }
}
