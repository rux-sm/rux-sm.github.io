// What `samsara-now` answers, with no imports, so it runs the same in the
// Edge runtime and under Node, where scheduler/tools/check-samsara-now.mjs
// sends it sample fleets. The board and the Live map ask it once a minute,
// and get back, for each bus Samsara knows, whether its engine is
// on, how fast it is going, where it is and which way it is heading, how
// much fuel it has and whether its engine reports a fault, and the drivers
// logged into it with their duty status and the driving hours each has left.
// Beside the buses it gives every scheduler driver Samsara keeps a clock for,
// in a bus or not, so the roster can say what each driver is doing now.
//
// FUEL is the tank's percent as the engine last reported it. A FAULT is the
// engine's warning lamp: `stop` when the red stop lamp is on, `check` when an
// amber warning, emissions or check-engine lamp is, with up to three of the
// codes Samsara describes in words. DEF is the diesel exhaust fluid tank's
// percent, which Samsara keeps in thousandths of a percent. A bus whose engine
// reports none of these has them null.
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
// RULES are the hours rules Samsara keeps each driver to, each ruleset's shift
// and cycle in Samsara's words, "US Interstate Passenger, USA 70 hour / 8 day",
// so the board can see a driver kept to rules that are not a bus driver's.
// Null when Samsara's drivers cannot be read.
// INSPECTIONS are the inspection reports drivers and mechanics filed in
// Samsara for each bus in the last day, and any still unsafe from the last
// thirty, newest first: pre-trip, post-trip or a mechanic's, when it was
// submitted, whether Samsara counts the bus safe, unsafe or resolved, the
// scheduler driver who signed it where they match, and how many defects it
// names. A bus's `inspections` is null, and the answer's `inspections`
// false, when the key may not read them.
// DUE is each bus's preventive maintenance as Samsara schedules it: each
// item's title, in sentence case without the bus number the office writes
// before it, "Oil change"; overdue or upcoming; the miles, engine hours or
// days still to go, negative once past; those in words, "Overdue by 2,533
// mi" or "Due in 6,266 mi", as the board and the Fleet page show them; and
// when and at what mileage it was last done. A
// bus's `due` is null, and the answer's `maintenance` false, when the key may
// not read them.
// OVER is how long a driver has been past their driving or cycle hours, from
// the violation Samsara counts while it runs. A driver whose app is not
// connected is still on Samsara's clocks with an empty duty, so comes back
// with `duty` null, apart from a driver Samsara does not have, who is absent.
//
// REST SINCE is the start of the current stretch of off duty, sleeper or personal
// conveyance in Samsara's duty logs. The REST_LOOK_MS lookback bounds elapsed
// rest; remaining availability comes separately from the HOS clocks. Logs that
// do not show the driver resting, or cannot be read, leave it null.
//
// A SPLIT is the passenger carrier's sleeper berth rule: two periods in the
// sleeper, neither under two hours, count as the eight hours off. For a
// driver in the sleeper, BERTH SINCE is when that run of sleeper logs began
// and SPLIT MS how long the earlier period it pairs with lasted, so the board
// can show how far the split has come; the clocks still say what is left.
//
// A PATH is where a bus has been since a time the caller names, for each bus
// in the body's `paths`, `{ bus_id: ISO time }`: Samsara's GPS readings since
// then, thinned to one every tenth of a mile, so the board can tell which of
// a leg's stops the bus has reached and the map can draw where it went. A
// path reaches back four days at most. When Samsara will not give the
// readings, no bus has a path, so the board knows it does not know where a
// bus has been, rather than reading an empty path as one that went nowhere.

// A reading older than this says nothing about now.
export const FRESH_MS = 15 * 60_000
export const PATH_MS = 4 * 24 * 3600_000
// The lookback for elapsed rest and a split's earlier period: a day, room for
// a two-hour period and the fifteen hours on duty a split allows after it.
export const REST_LOOK_MS = 24 * 3600_000
// A full rest, and the least either period of a split may be.
export const REST_FULL_MS = 8 * 3600_000
export const SPLIT_MIN_MS = 2 * 3600_000
// How far back a bus's inspections are read, and its unsafe ones, which
// stand until a mechanic resolves them.
export const INSPECT_LOOK_MS = 24 * 3600_000
export const UNSAFE_LOOK_MS = 30 * 24 * 3600_000
// Two readings closer than this are one point on a path.
export const PATH_STEP_MILES = 0.1

export type Bus = { id: string; number: string | null }
export type Driver = { id: string; name: string | null }
export type Vehicle = { id: string; name: string }
export type Stat = {
  id: string
  engineState?: { time: string; value: string }
  gps?: { time: string; latitude?: number; longitude?: number; headingDegrees?: number; speedMilesPerHour?: number; reverseGeo?: { formattedLocation?: string } }
  fuelPercent?: { time: string; value: number }
  defLevelMilliPercent?: { time: string; value: number }
  faultCodes?: Faults
  obdOdometerMeters?: { time: string; value: number }
  gpsOdometerMeters?: { time: string; value: number }
}
type Lamps = { emissionsIsOn?: boolean; protectIsOn?: boolean; stopIsOn?: boolean; warningIsOn?: boolean }
export type Faults = {
  time?: string
  j1939?: { checkEngineLights?: Lamps; diagnosticTroubleCodes?: { spnDescription?: string; fmiDescription?: string }[] }
  obdii?: { checkEngineLightIsOn?: boolean; diagnosticTroubleCodes?: { confirmedDtcs?: { dtcDescription?: string; dtcShortCode?: string }[] }[] }
  oem?: { diagnosticTroubleCodes?: { codeDescription?: string; codeIdentifier?: string }[] }
}
export type Fix = { time: string; latitude: number; longitude: number }
export type Dvir = {
  id?: string
  type?: string
  safetyStatus?: string
  dvirSubmissionTime?: string
  vehicle?: { id?: string }
  authorSignature?: { signatoryUser?: { id?: string }; type?: string }
  defectIds?: string[]
}
export type Schedule = { id?: string; title?: string }
export type Upcoming = {
  asset?: { id?: string }
  schedule?: { id?: string }
  status?: string
  dueInOdometer?: number
  dueInEngineHours?: number
  dueInDays?: number
  lastResolvedAt?: string
  lastResolvedAtOdometer?: number
}
export type SamsaraDriver = {
  id?: string
  eldSettings?: { rulesets?: { shift?: string; cycle?: string }[] }
}
export type HosLogs = {
  driver?: { id?: string }
  hosLogs?: { logStartTime?: string; logEndTime?: string; hosStatusType?: string }[]
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
  violations?: { shiftDrivingViolationDurationMs?: number; cycleViolationDurationMs?: number }
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
  // Every Samsara driver with their hours rules.
  rules(): Promise<SamsaraDriver[]>
  // The inspection reports submitted or changed between two instants, or
  // only the unsafe ones.
  dvirs(from: number, to: number, unsafe?: boolean): Promise<Dvir[]>
  // Every preventive maintenance schedule, and each vehicle's upcoming items.
  schedules(): Promise<Schedule[]>
  upcoming(): Promise<Upcoming[]>
  // Each vehicle's GPS readings between two instants, by vehicle id.
  history(vehicleIds: string[], from: number, to: number): Promise<Record<string, Fix[]>>
  // The duty logs of the Samsara drivers named, between two instants.
  logs(driverIds: string[], from: number, to: number): Promise<HosLogs[]>
  keyed: boolean
  now(): number
}

export type Duty = 'driving' | 'on' | 'sleeper' | 'off' | 'yard' | 'personal'
export type LiveDriver = {
  driver_id: string | null
  name: string
  duty: Duty | null
  left_ms: number | null
  drive_ms: number | null
  shift_ms: number | null
  cycle_ms: number | null
  // How long the driver has been over their driving or cycle hours, as
  // Samsara counts a violation running now, or 0.
  over_ms: number
  // The hours rules Samsara keeps them to, one entry a ruleset, or null.
  rules: string[] | null
  // When the stretch of rest a resting driver is in began, or null.
  rest_since: string | null
  // When a driver in the sleeper went into it, and how long the earlier
  // sleeper period that run pairs with as a split lasted, or null.
  berth_since: string | null
  split_ms: number | null
  wheel: boolean
}
export type LiveBus = {
  bus_id: string
  engine: 'on' | 'idle' | 'off' | null
  // When the engine came to that state, as Samsara stamps it.
  engine_at: string | null
  mph: number | null
  place: string | null
  lat: number | null
  lng: number | null
  heading: number | null
  // [latitude, longitude, ms] from oldest to newest, for a bus the caller asked a path of.
  path?: [number, number, number][]
  seen: string | null
  fuel: number | null
  def: number | null
  // Miles on the odometer, the engine's reading where there is one, else the GPS's.
  odometer: number | null
  fault: 'stop' | 'check' | null
  faults: string[]
  drivers: LiveDriver[]
  inspections: Inspection[] | null
  due: Due[] | null
}
export type Due = {
  title: string
  status: 'overdue' | 'upcoming' | null
  words: string
  miles: number | null
  hours: number | null
  days: number | null
  last_at: string | null
  last_miles: number | null
}
export type Inspection = {
  id: string
  kind: 'pre' | 'post' | 'mechanic' | 'other'
  at: string
  status: 'safe' | 'unsafe' | 'resolved' | null
  driver_id: string | null
  defects: number
}
export type Answer = { at: string; hours: boolean; inspections: boolean; maintenance: boolean; buses: LiveBus[]; drivers: LiveDriver[] }

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
  onDuty: 'on', yardMove: 'yard',
  sleeperBed: 'sleeper', sleeperBerth: 'sleeper',
  offDuty: 'off', personalConveyance: 'personal',
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
    over_ms: Math.max(0, ms(c.violations?.shiftDrivingViolationDurationMs) ?? 0, ms(c.violations?.cycleViolationDurationMs) ?? 0),
    rules: null,
    rest_since: null,
    berth_since: null,
    split_ms: null,
    wheel: false,
  }
}

const KIND: Record<string, Inspection['kind']> = { preTrip: 'pre', postTrip: 'post', mechanic: 'mechanic' }
const STATUS: Record<string, Inspection['status']> = { safe: 'safe', unsafe: 'unsafe', resolved: 'resolved' }

/* A bus's inspections, newest first, each once however often Samsara
   changed it, the later read standing; the signer is a scheduler driver where their Samsara id is
   one the clocks matched. */
export function inspectionsOf(dvirs: Dvir[], vehicle: string, driverOf: Map<string, string>): Inspection[] {
  const byId = new Map<string, Inspection>()
  for (const d of dvirs) {
    if (String(d.vehicle?.id ?? '') !== vehicle || !d.id || !d.dvirSubmissionTime) continue
    const signer = d.authorSignature?.signatoryUser?.id
    byId.set(String(d.id), {
      id: String(d.id),
      kind: KIND[d.type ?? ''] ?? 'other',
      at: d.dvirSubmissionTime,
      status: STATUS[d.safetyStatus ?? ''] ?? null,
      driver_id: signer ? driverOf.get(String(signer)) ?? null : null,
      defects: Array.isArray(d.defectIds) ? d.defectIds.length : 0,
    })
  }
  return [...byId.values()].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
}

/* A driver's hours rules, each ruleset's shift and cycle; null when the
   drivers could not be read or Samsara lists none for them. */
export function rulesOf(drivers: SamsaraDriver[] | null, id: string | undefined): string[] | null {
  const sets = drivers?.find(x => id != null && String(x.id) === String(id))?.eldSettings?.rulesets
  const words = (sets ?? []).map(r => [r.shift, r.cycle].filter(Boolean).join(', ')).filter(Boolean)
  return words.length ? words : null
}

// The statuses that rest a driver: off duty, personal conveyance and the sleeper.
const RESTING = new Set(['offDuty', 'personalConveyance', 'sleeperBed', 'sleeperBerth'])

/* When the stretch of rest the logs end in began: back from the newest log
   while each is a rest, the start of the first of them. A stretch that runs
   back past the window starts where its first log in the window does, which
   is no later than it truly began. Null when the newest log is not a rest,
   as when the logs lag the clocks. */
export function restSince(logs: HosLogs['hosLogs']): string | null {
  const rows = (logs ?? []).map(l => ({ at: Date.parse(l.logStartTime ?? ''), status: l.hosStatusType ?? '' }))
    .filter(l => Number.isFinite(l.at)).sort((a, b) => a.at - b.at)
  if (!rows.length || !RESTING.has(rows.at(-1)!.status)) return null
  let i = rows.length - 1
  while (i > 0 && RESTING.has(rows[i - 1].status)) i--
  return new Date(rows[i].at).toISOString()
}

// The sleeper's statuses, the only rest a split is made of.
const BERTH = new Set(['sleeperBed', 'sleeperBerth'])

/* THE SPLIT A DRIVER IN THE SLEEPER IS PART WAY THROUGH (49 CFR 395.1(g)(3)):
   when the logs end in the sleeper, when that run of sleeper logs began, and
   the length of the latest earlier sleeper run of two hours or more, looked
   for back to the last stretch of rest of eight hours or more, a full rest
   no earlier period pairs across. A log ends where it says, else where the
   next begins, else now. A run that reaches back past the window counts only
   what is inside it, so a split is never shown further on than it is. The
   driving between the two periods is the clocks' to weigh, not this. */
export function splitOf(logs: HosLogs['hosLogs'], now: number): { berth_since: string | null; split_ms: number | null } {
  const rows = (logs ?? []).map(l => ({ at: Date.parse(l.logStartTime ?? ''), stop: Date.parse(l.logEndTime ?? ''), status: l.hosStatusType ?? '' }))
    .filter(l => Number.isFinite(l.at)).sort((a, b) => a.at - b.at)
    .map((l, i, all) => ({ ...l, end: Math.min(now, Number.isFinite(l.stop) ? l.stop : all[i + 1]?.at ?? now) }))
  if (!rows.length || !BERTH.has(rows.at(-1)!.status)) return { berth_since: null, split_ms: null }
  let i = rows.length - 1
  while (i > 0 && BERTH.has(rows[i - 1].status)) i--
  const berth_since = new Date(rows[i].at).toISOString()
  // Each earlier stretch of rest, newest first, and the sleeper runs in it.
  let j = i - 1
  while (j >= 0) {
    if (!RESTING.has(rows[j].status)) { j--; continue }
    let k = j
    while (k > 0 && RESTING.has(rows[k - 1].status)) k--
    if (rows[j].end - rows[k].at >= REST_FULL_MS) break
    for (let m = j; m >= k; m--) {
      if (!BERTH.has(rows[m].status)) continue
      let n = m
      while (n > k && BERTH.has(rows[n - 1].status)) n--
      if (rows[m].end - rows[n].at >= SPLIT_MIN_MS) return { berth_since, split_ms: rows[m].end - rows[n].at }
      m = n
    }
    j = k - 1
  }
  return { berth_since, split_ms: null }
}

// A wheel identifies a reported Driving duty, without inferring one from On duty.
export function markWheel(drivers: LiveDriver[]): LiveDriver[] {
  return drivers.map(d => ({ ...d, wheel: d.duty === 'driving' }))
}

// ── paths ───────────────────────────────────────────────────────────────────

// The miles between two points, as the crow flies.
export function miles(a: [number, number], b: [number, number]): number {
  const rad = Math.PI / 180
  const dLat = (b[0] - a[0]) * rad, dLng = (b[1] - a[1]) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2
  return 3958.8 * 2 * Math.asin(Math.sqrt(h))
}

// Readings in time order, kept where they are a step from the last one kept,
// and the newest always.
export function thin(fixes: Fix[]): [number, number, number][] {
  const points = fixes
    .map(f => [f.latitude, f.longitude, Date.parse(f.time)] as [number, number, number])
    .filter(p => p.every(Number.isFinite))
    .sort((a, b) => a[2] - b[2])
  const kept: [number, number, number][] = []
  for (const p of points) {
    const last = kept.at(-1)
    if (!last || miles([last[0], last[1]], [p[0], p[1]]) >= PATH_STEP_MILES) kept.push(p)
  }
  const newest = points.at(-1)
  if (newest && kept.at(-1) !== newest) kept.push(newest)
  return kept
}

// The engine's lamp and what its codes say, from Samsara's fault codes.
export function faultOf(f: Faults | undefined): { fault: 'stop' | 'check' | null; faults: string[] } {
  const lamps = f?.j1939?.checkEngineLights ?? {}
  const fault = lamps.stopIsOn ? 'stop'
    : lamps.warningIsOn || lamps.protectIsOn || lamps.emissionsIsOn || f?.obdii?.checkEngineLightIsOn ? 'check' : null
  const words = [
    ...(f?.j1939?.diagnosticTroubleCodes ?? []).map(c => [c.spnDescription, c.fmiDescription].filter(Boolean).join(': ')),
    ...(f?.obdii?.diagnosticTroubleCodes ?? []).flatMap(c => (c.confirmedDtcs ?? []).map(d => d.dtcDescription || d.dtcShortCode || '')),
    ...(f?.oem?.diagnosticTroubleCodes ?? []).map(c => c.codeDescription || c.codeIdentifier || ''),
  ].map(w => String(w).trim()).filter(Boolean)
  return { fault, faults: [...new Set(words)].slice(0, 3) }
}

const ENGINE: Record<string, 'on' | 'idle' | 'off'> = { On: 'on', Idle: 'idle', Off: 'off' }
// The engine's state, while a reading is fresh, or off however old.
const engineOf = (s: Stat | undefined, fresh: boolean) => {
  const state = s?.engineState ? ENGINE[s.engineState.value] ?? null : null
  return state && (fresh || state === 'off') ? state : null
}
const nameOf = (v: string | null | undefined) => String(v ?? '').trim().toLowerCase()

export async function liveFor(buses: Bus[], drivers: Driver[], deps: Deps, paths: Record<string, string> = {}): Promise<Answer> {
  const now = deps.now()
  const vehicles = await deps.vehicles()
  const vehicleOf = new Map(vehicles.map(v => [nameOf(v.name), v.id]))
  const pairs = buses.map(b => ({ bus: b, vehicle: vehicleOf.get(nameOf(b.number)) ?? null }))
    .filter((p): p is { bus: Bus; vehicle: string } => !!p.vehicle)
  const ids = pairs.map(p => p.vehicle)

  // The earliest time any bus's path is asked from, held to four days back.
  const since = new Map<string, number>()
  for (const p of pairs) {
    const at = Date.parse(paths[p.bus.id] ?? '')
    if (Number.isFinite(at)) since.set(p.vehicle, Math.min(Math.max(at, now - PATH_MS), now))
  }
  let hours = true
  let inspected = true
  let maintained = true
  const [stats, clocks, samsaraDrivers, dvirs, history, upcoming] = await Promise.all([
    ids.length ? deps.stats(ids) : Promise.resolve([] as Stat[]),
    deps.clocks().catch(() => { hours = false; return [] as Clock[] }),
    // Rules that cannot be read leave every driver's null, and the rest stands.
    deps.rules().catch(() => null),
    // Inspections that cannot be read leave every bus with none, and say so.
    ids.length ? Promise.all([deps.dvirs(now - INSPECT_LOOK_MS, now), deps.dvirs(now - UNSAFE_LOOK_MS, now, true)])
      .then(([day, unsafe]) => [...unsafe, ...day]).catch(() => { inspected = false; return [] as Dvir[] }) : Promise.resolve([] as Dvir[]),
    // A path that cannot be read leaves the bus without one, and the rest stands.
    since.size ? deps.history([...since.keys()], Math.min(...since.values()), now).catch(() => null)
      : Promise.resolve({} as Record<string, Fix[]>),
    // Maintenance that cannot be read leaves every bus's due null, and says so.
    ids.length ? Promise.all([deps.schedules(), deps.upcoming()]).catch(() => { maintained = false; return null })
      : Promise.resolve(null),
  ])
  const titleOf = new Map((upcoming?.[0] ?? []).map(x => [String(x.id ?? ''), String(x.title ?? '')]))
  const statOf = new Map(stats.map(s => [String(s.id), s]))
  const index = driverIndex(drivers)
  const inVehicle = new Map<string, LiveDriver[]>()
  // The scheduler driver behind each Samsara driver id, for who signed an inspection.
  const driverOfSigner = new Map<string, string>()
  // Every scheduler driver Samsara keeps a clock for, in a bus or not.
  const known: LiveDriver[] = []
  // The Samsara driver behind each one resting who is answered, in a bus
  // answered or as a scheduler driver, whose rest is asked after.
  const resting = new Map<string, LiveDriver>()
  const answered = new Set(ids)
  for (const c of clocks) {
    const v = c.currentVehicle?.id ? String(c.currentVehicle.id) : null
    const d = liveDriver(c, index)
    d.rules = rulesOf(samsaraDrivers, c.driver?.id)
    if (c.driver?.id && d.driver_id) driverOfSigner.set(String(c.driver.id), d.driver_id)
    if (d.driver_id) known.push(d)
    if ((d.driver_id || (v && answered.has(v))) && ['sleeper', 'off', 'personal'].includes(d.duty ?? '') && c.driver?.id) resting.set(String(c.driver.id), d)
    if (v) inVehicle.set(v, [...(inVehicle.get(v) ?? []), d])
  }
  /* One read of the resting drivers' logs; logs that cannot be read leave
     each rest unknown, and everything else stands. */
  if (resting.size) {
    const from = now - REST_LOOK_MS
    const logs = await deps.logs([...resting.keys()], from, now).catch(() => [] as HosLogs[])
    for (const l of logs) {
      const d = l.driver?.id ? resting.get(String(l.driver.id)) : null
      if (!d) continue
      d.rest_since = restSince(l.hosLogs)
      Object.assign(d, splitOf(l.hosLogs, now))
    }
  }

  return {
    at: new Date(now).toISOString(),
    hours,
    inspections: inspected,
    maintenance: maintained,
    buses: pairs.map(({ bus, vehicle }) => {
      const s = statOf.get(vehicle)
      const engineAt = s?.engineState ? Date.parse(s.engineState.time) : NaN
      const gpsAt = s?.gps ? Date.parse(s.gps.time) : NaN
      const engineFresh = now - engineAt <= FRESH_MS
      const gpsFresh = now - gpsAt <= FRESH_MS
      const seen = [engineAt, gpsAt].filter(Number.isFinite)
      return {
        bus_id: bus.id,
        // Samsara stamps the engine's state when it changes, so an engine on
        // for an hour has an hour-old stamp; the state holds while the GPS is
        // still reporting. An engine last seen off stays off however old the
        // readings: some trackers stop reporting while their bus is parked and
        // wake with the ignition, so a quiet bus that was off is parked. Only
        // an engine last seen running goes unknown when both readings are old.
        engine: engineOf(s, engineFresh || gpsFresh),
        engine_at: engineOf(s, engineFresh || gpsFresh) && Number.isFinite(engineAt) ? new Date(engineAt).toISOString() : null,
        mph: gpsFresh && typeof s!.gps!.speedMilesPerHour === 'number' ? Math.round(s!.gps!.speedMilesPerHour) : null,
        place: gpsFresh ? s!.gps!.reverseGeo?.formattedLocation ?? null : null,
        // Where the bus is, however old, so a bus parked for days still has a place on the map.
        lat: typeof s?.gps?.latitude === 'number' ? s.gps.latitude : null,
        lng: typeof s?.gps?.longitude === 'number' ? s.gps.longitude : null,
        heading: gpsFresh && typeof s!.gps!.headingDegrees === 'number' ? Math.round(s!.gps!.headingDegrees) : null,
        seen: seen.length ? new Date(Math.max(...seen)).toISOString() : null,
        fuel: typeof s?.fuelPercent?.value === 'number' ? Math.round(Math.min(100, Math.max(0, s.fuelPercent.value))) : null,
        def: typeof s?.defLevelMilliPercent?.value === 'number' ? Math.round(Math.min(100, Math.max(0, s.defLevelMilliPercent.value / 1000))) : null,
        odometer: odometerOf(s),
        ...faultOf(s?.faultCodes),
        drivers: markWheel(inVehicle.get(vehicle) ?? []),
        inspections: inspected ? inspectionsOf(dvirs, vehicle, driverOfSigner) : null,
        due: maintained && upcoming ? dueOf(upcoming[1], vehicle, titleOf, bus.number) : null,
        ...(since.has(vehicle) && history ? { path: thin((history[vehicle] ?? []).filter(f => Date.parse(f.time) >= since.get(vehicle)!)) } : {}),
      }
    }),
    drivers: markWheel(known),
  }
}

// The odometer in whole miles, from the engine's reading where the bus reports
// one, else the GPS's, else null.
const METERS_PER_MILE = 1609.344
const milesOf = (m: unknown) => (typeof m === 'number' && Number.isFinite(m) ? Math.round(m / METERS_PER_MILE) : null)
const numberOr = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/* A schedule's title as the board shows it: without the bus's number the
   office writes before it, "763-Oil Change" or "218 oil change", and in
   sentence case. */
export function dueTitle(title: string, number: string | null): string {
  const n = String(number ?? '').trim()
  const bare = (n && title.trim().toLowerCase().startsWith(n.toLowerCase()) ? title.trim().slice(n.length) : title)
    .replace(/^[\s\-–:]+/, '').trim().toLowerCase()
  return bare ? bare[0].toUpperCase() + bare.slice(1) : 'Maintenance'
}

// What is still to go, in words: the miles, else the days, else the engine hours.
function dueWords(status: Due['status'], miles: number | null, days: number | null, hours: number | null): string {
  const over = status === 'overdue'
  const [n, unit] = miles != null ? [miles, 'mi'] : days != null ? [days, Math.abs(days) === 1 ? 'day' : 'days']
    : hours != null ? [hours, Math.abs(hours) === 1 ? 'engine hour' : 'engine hours'] : [null, '']
  if (n == null) return over ? 'Overdue' : 'Upcoming'
  return `${over ? 'Overdue by' : 'Due in'} ${Math.abs(n).toLocaleString('en-US')} ${unit}`
}

/* A bus's preventive maintenance, overdue first and then the nearest, each
   named by its schedule. */
export function dueOf(upcoming: Upcoming[], vehicle: string, titleOf: Map<string, string>, number: string | null = null): Due[] {
  const rank = (d: Due) => (d.status === 'overdue' ? 0 : 1)
  return upcoming
    .filter(u => String(u.asset?.id ?? '') === vehicle)
    .map(u => {
      const status = u.status === 'overdue' || u.status === 'upcoming' ? u.status : null
      const miles = milesOf(u.dueInOdometer), hours = numberOr(u.dueInEngineHours), days = numberOr(u.dueInDays)
      return {
        title: dueTitle(titleOf.get(String(u.schedule?.id ?? '')) ?? '', number),
        status, words: dueWords(status, miles, days, hours), miles, hours, days,
        last_at: typeof u.lastResolvedAt === 'string' ? u.lastResolvedAt : null,
        last_miles: milesOf(u.lastResolvedAtOdometer),
      }
    })
    .sort((a, b) => rank(a) - rank(b) || (a.miles ?? Infinity) - (b.miles ?? Infinity))
}

function odometerOf(s?: Stat): number | null {
  const meters = s?.obdOdometerMeters?.value ?? s?.gpsOdometerMeters?.value
  return typeof meters === 'number' && meters > 0 ? Math.round(meters / METERS_PER_MILE) : null
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

  // The body may name the buses to give a path of; anything else asks for none.
  let paths: Record<string, string> = {}
  try {
    const body = await req.json()
    if (body?.paths && typeof body.paths === 'object') {
      paths = Object.fromEntries(Object.entries(body.paths).filter((e): e is [string, string] => typeof e[1] === 'string'))
    }
  } catch { /* no body */ }

  try {
    return reply(200, await liveFor(buses, drivers, deps, paths))
  } catch {
    return reply(502, { error: 'samsara' })
  }
}
