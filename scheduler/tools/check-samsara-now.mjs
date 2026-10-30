// Runs samsara-now's handler, the board's door to what each bus is doing,
// against an invented fleet: how a Samsara driver is matched to the
// scheduler's, who is at the wheel, how many hours each has left, which
// readings are too old to count, and what a caller who should not get an
// answer is told. The handler is TypeScript with no imports; its types are
// taken off and the rest is run as a module.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Taking the types off is new enough in Node to warn each time it is used.
process.removeAllListeners('warning');

const source = readFileSync(new URL('../samsara-now/handler.ts', import.meta.url), 'utf8');
const scratch = mkdtempSync(join(tmpdir(), 'check-samsara-now-'));
const file = join(scratch, 'handler.mjs');
writeFileSync(file, stripTypeScriptTypes(source));
const { handle, nameKey, driverIndex, liveDriver, markWheel, liveFor, faultOf, restSince, splitOf } = await import(pathToFileURL(file).href);
rmSync(scratch, { recursive: true, force: true });

let failed = 0;
function expect(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`}`);
}

const H = 3600_000;

// ── names ───────────────────────────────────────────────────────────────────
expect('a Jr. in the middle is passed over', nameKey('Ana Jr. Ruiz'), 'ana ruiz');
expect('a middle name is passed over', nameKey('Ana Maria Ruiz'), 'ana ruiz');
expect('a Jr at the end is passed over', nameKey('Ana Ruiz Jr'), 'ana ruiz');
expect('an initial and an accent are passed over', nameKey('José P. Ruiz'), 'jose ruiz');
expect('one word is no name', nameKey('Ana'), null);
const index = driverIndex([
  { id: 'd1', name: 'Ana Maria Ruiz' }, { id: 'd2', name: 'Ben Ortiz' },
  { id: 'd3', name: 'Cruz Leal' }, { id: 'd4', name: 'Cruz A. Leal' },
]);
expect('each name finds its one driver, and a shared name finds nobody',
  [index.get('ana ruiz'), index.get('ben ortiz'), index.get('cruz leal') ?? null], ['d1', 'd2', null]);

// ── duty and hours ──────────────────────────────────────────────────────────
const clock = (name, status, drive, shift, cycle, vehicle = 'v101') => ({
  driver: { id: `s-${name}`, name }, currentDutyStatus: { hosStatusType: status }, currentVehicle: { id: vehicle, name: '' },
  clocks: { drive: { driveRemainingDurationMs: drive }, shift: { shiftRemainingDurationMs: shift }, cycle: { cycleRemainingDurationMs: cycle } },
});
let d = liveDriver(clock('Ana Ruiz', 'driving', 9 * H, 12 * H, 60 * H), index);
expect('a driver driving, matched, with the least clock as hours left',
  [d.driver_id, d.duty, d.left_ms], ['d1', 'driving', 9 * H]);
d = liveDriver(clock('Ben Ortiz', 'sleeperBed', 6 * H, 2 * H, 50 * H), index);
expect('a short shift is the hours left', [d.duty, d.left_ms], ['sleeper', 2 * H]);
d = liveDriver(clock('Dee Moss', '', null, null, null), index);
expect('a driver the office does not have keeps the Samsara name, with nothing known',
  [d.driver_id, d.name, d.duty, d.left_ms], [null, 'Dee Moss', null, null]);

const wheel = list => markWheel(list.map(([name, status, drive]) => liveDriver(clock(name, status, drive, 14 * H, 60 * H), index)))
  .filter(x => x.wheel).map(x => x.name);
expect('the driver driving is at the wheel', wheel([['Ana Ruiz', 'onDuty', 2 * H], ['Ben Ortiz', 'driving', 8 * H]]), ['Ben Ortiz']);
expect('on duty does not identify a driver at the wheel', wheel([['Ana Ruiz', 'onDuty', 7 * H], ['Ben Ortiz', 'onDuty', 3 * H]]), []);
expect('nobody, when both rest', wheel([['Ana Ruiz', 'sleeperBed', 7 * H], ['Ben Ortiz', 'offDuty', 3 * H]]), []);

expect('yard move and personal conveyance retain distinct duties',
  ['yardMove', 'personalConveyance'].map(status => liveDriver(clock('Ana Ruiz', status, 5 * H, 8 * H, 40 * H), index).duty), ['yard', 'personal']);

// ── rest ────────────────────────────────────────────────────────────────────
const at = (h) => new Date(Date.parse('2026-10-14T20:00:00Z') - h * H).toISOString();
const log = (h, status) => ({ logStartTime: at(h), hosStatusType: status });
expect('rest runs back through off duty and the sleeper to the last drive',
  restSince([log(9, 'driving'), log(5, 'offDuty'), log(3, 'sleeperBed')]), at(5));
expect('a short stop on duty ends the rest before it',
  restSince([log(9, 'offDuty'), log(4, 'onDuty'), log(2, 'sleeperBed')]), at(2));
expect('logs out of order are put in order first',
  restSince([log(2, 'sleeperBed'), log(9, 'driving'), log(6, 'offDuty')]), at(6));
expect('logs that end on duty, lagging the clocks, say no rest',
  restSince([log(5, 'offDuty'), log(1, 'onDuty')]), null);
expect('a rest that fills the logs starts at their first log', restSince([log(11, 'offDuty')]), at(11));
expect('no logs, no rest', restSince([]), null);

// ── a split ─────────────────────────────────────────────────────────────────
const END = Date.parse('2026-10-14T20:00:00Z');
const split = list => splitOf(list, END);
expect('a sleeper run after driving pairs with the sleeper period of two hours or more before the drive',
  split([log(14, 'driving'), log(13, 'sleeperBed'), log(10, 'driving'), log(2, 'sleeperBed')]),
  { berth_since: at(2), split_ms: 3 * H });
expect('a sleeper period under two hours is passed over for the one before it',
  split([log(16, 'sleeperBed'), log(13, 'driving'), log(8, 'sleeperBed'), log(7, 'onDuty'), log(1, 'sleeperBed')]),
  { berth_since: at(1), split_ms: 3 * H });
expect('off duty is no half of a split, though it is rest',
  split([log(12, 'offDuty'), log(8, 'driving'), log(2, 'sleeperBed')]),
  { berth_since: at(2), split_ms: null });
expect('a full eight hours of rest ends the search, so nothing before it pairs',
  split([log(23, 'sleeperBed'), log(20, 'driving'), log(19, 'offDuty'), log(10, 'driving'), log(2, 'sleeperBed')]),
  { berth_since: at(2), split_ms: null });
expect('only the sleeper part of a mixed stretch is a period',
  split([log(9, 'offDuty'), log(8, 'sleeperBed'), log(5, 'onDuty'), log(1, 'sleeperBed')]),
  { berth_since: at(1), split_ms: 3 * H });
expect('a log that says where it ends ends there',
  split([{ logStartTime: at(9), logEndTime: at(6.5), hosStatusType: 'sleeperBed' }, log(6, 'onDuty'), log(1, 'sleeperBed')]),
  { berth_since: at(1), split_ms: 2.5 * H });
expect('a driver not in the sleeper is part way through no split',
  split([log(9, 'sleeperBed'), log(5, 'driving'), log(1, 'offDuty')]), { berth_since: null, split_ms: null });
expect('no earlier period, only the run now', split([log(3, 'driving'), log(1, 'sleeperBed')]), { berth_since: at(1), split_ms: null });

// ── the fleet ───────────────────────────────────────────────────────────────
const NOW = Date.parse('2026-10-14T20:00:00Z');
const ago = min => new Date(NOW - min * 60_000).toISOString();
const BUSES = [{ id: 'b1', number: '101' }, { id: 'b2', number: '102' }, { id: 'b3', number: '900' }];
const DRIVERS = [{ id: 'd1', name: 'Ana Maria Ruiz' }, { id: 'd2', name: 'Ben Ortiz' }];
// A bus driving east along a line of latitude, a reading every half minute
// a hundredth of a mile apart, from two hours ago.
const fix = (min, lng) => ({ time: ago(min), latitude: 26.2, longitude: lng });
const DRIVE = Array.from({ length: 241 }, (_, i) => fix(120 - i / 2, -97.9 + i * 0.000163));
function parts({ buses = BUSES, clocksFail = false, keyed = true, historyFail = false, logsFail = false } = {}) {
  let calls = 0, asked = null, logsAsked = null;
  return {
    get calls() { return calls; },
    get asked() { return asked; },
    get logsAsked() { return logsAsked; },
    deps: {
      keyed,
      now: () => NOW,
      buses: async () => buses,
      drivers: async () => DRIVERS,
      vehicles: async () => { calls++; return [{ id: 'v101', name: '101' }, { id: 'v102', name: ' 102 ' }]; },
      stats: async ids => { calls++; return [
        { id: 'v101', engineState: { time: ago(1), value: 'On' }, gps: { time: ago(1), latitude: 26.2, longitude: -97.7, headingDegrees: 271.6, speedMilesPerHour: 64.6, reverseGeo: { formattedLocation: 'Somewhere, TX' } },
          fuelPercent: { time: ago(5), value: 68.4 }, defLevelMilliPercent: { time: ago(5), value: 14_600 },
          obdOdometerMeters: { time: ago(5), value: 470_000_000 }, gpsOdometerMeters: { time: ago(5), value: 1_000 },
          faultCodes: { time: ago(5), j1939: { checkEngineLights: { warningIsOn: true }, diagnosticTroubleCodes: [{ spnDescription: 'Coolant level', fmiDescription: 'Low' }] } } },
        { id: 'v102', engineState: { time: ago(40), value: 'On' }, gps: { time: ago(40), latitude: 26.1, longitude: -98.2, headingDegrees: 90, speedMilesPerHour: 30 } , gpsOdometerMeters: { time: ago(40), value: 160_934.4 } },
        { id: 'v103', engineState: { time: ago(90), value: 'On' }, gps: { time: ago(1), speedMilesPerHour: 32 } },
      ].filter(s => ids.includes(s.id)); },
      clocks: async () => { calls++; if (clocksFail) throw new Error('403'); return [
        clock('Ana Ruiz', 'driving', 9 * H + 3 * 60_000, 14 * H, 69 * H),
        clock('Ben Ortiz', 'sleeperBed', 4 * H, 9 * H, 50 * H),
        clock('Cal Diaz', 'offDuty', 10 * H, 15 * H, 70 * H, null),
      ]; },
      history: async (ids, from, to) => { calls++; asked = [ids, from, to]; if (historyFail) throw new Error('403');
        return { v101: DRIVE.filter(f => Date.parse(f.time) >= from) }; },
      logs: async (ids, from, to) => { calls++; logsAsked = [ids, from, to]; if (logsFail) throw new Error('403');
        return [{ driver: { id: 's-Ben Ortiz' }, hosLogs: [
          { logStartTime: ago(7 * 60), hosStatusType: 'driving' },
          { logStartTime: ago(5 * 60), hosStatusType: 'offDuty' },
          { logStartTime: ago(3 * 60), hosStatusType: 'sleeperBed' },
        ] }]; },
    },
  };
}
let p = parts();
let a = await liveFor(BUSES, DRIVERS, p.deps);
expect('only the buses Samsara has come back', a.buses.map(b => b.bus_id), ['b1', 'b2']);
expect('a fresh reading gives the engine, the speed and the place',
  [a.buses[0].engine, a.buses[0].mph, a.buses[0].place], ['on', 65, 'Somewhere, TX']);
expect('the fuel, and the engine lamp with what its code says',
  [a.buses[0].fuel, a.buses[0].fault, a.buses[0].faults], [68, 'check', ['Coolant level: Low']]);
expect('the odometer is the engine reading in miles, else the GPS one, else empty',
  [a.buses[0].odometer, a.buses[1].odometer], [292_044, 100]);
expect('a bus that reports no fuel, DEF or fault has them empty',
  [a.buses[1].fuel, a.buses[1].def, a.buses[1].fault, a.buses[1].faults], [null, null, null, []]);
expect('the DEF level in whole percent, from Samsara\'s thousandths',
  a.buses[0].def, 15);
expect('the red stop lamp outranks an amber one',
  faultOf({ j1939: { checkEngineLights: { warningIsOn: true, stopIsOn: true } } }).fault, 'stop');
expect('an OBD check-engine lamp is a check, named by its short code',
  faultOf({ obdii: { checkEngineLightIsOn: true, diagnosticTroubleCodes: [{ confirmedDtcs: [{ dtcShortCode: 'P0128' }] }] } }), { fault: 'check', faults: ['P0128'] });
expect('a reading forty minutes old says nothing about now', [a.buses[1].engine, a.buses[1].mph], [null, null]);
expect('where a bus is and the way it heads, a fresh reading',
  [a.buses[0].lat, a.buses[0].lng, a.buses[0].heading], [26.2, -97.7, 272]);
expect('an old reading keeps where the bus is, and says no heading',
  [a.buses[1].lat, a.buses[1].lng, a.buses[1].heading], [26.1, -98.2, null]);
expect('no path is asked when none is named', [p.asked, 'path' in a.buses[0]], [null, false]);
p = parts();
a = await liveFor(BUSES, DRIVERS, p.deps, { b1: ago(60) });
const path = a.buses[0].path;
expect('a path is the readings since the time named, one a tenth of a mile on, and the newest',
  [path.length, path[0][2], path.at(-1)[2], 'path' in a.buses[1]], [13, NOW - 60 * 60_000, NOW, false]);
p = parts();
await liveFor(BUSES, DRIVERS, p.deps, { b1: ago(10 * 24 * 60) });
expect('a path reaches back four days at most', (NOW - p.asked[1]) / H, 96);
p = parts({ historyFail: true });
a = await liveFor(BUSES, DRIVERS, p.deps, { b1: ago(60) });
expect('a path Samsara refuses is an empty one, and the bus still comes back',
  [a.buses[0].path, a.buses[0].engine], [[], 'on']);
const parked = parts();
parked.deps.vehicles = async () => [{ id: 'v104', name: '104' }];
parked.deps.stats = async () => [{ id: 'v104', engineState: { time: ago(300), value: 'Off' }, gps: { time: ago(40), latitude: 26.3, longitude: -98.1, speedMilesPerHour: 0 } }];
const quiet = await liveFor([{ id: 'b5', number: '104' }], DRIVERS, parked.deps);
expect('an engine last seen off stays off when its tracker goes quiet, with no speed, place or heading',
  [quiet.buses[0].engine, quiet.buses[0].engine_at, quiet.buses[0].mph, quiet.buses[0].place, quiet.buses[0].seen],
  ['off', new Date(NOW - 300 * 60_000).toISOString(), null, null, new Date(NOW - 40 * 60_000).toISOString()]);
const long = parts();
long.deps.vehicles = async () => [{ id: 'v103', name: '103' }];
const onLong = await liveFor([{ id: 'b4', number: '103' }], DRIVERS, long.deps);
expect('an engine on since long ago is still on while the GPS reports, and says since when',
  [onLong.buses[0].engine, onLong.buses[0].mph, onLong.buses[0].engine_at], ['on', 32, new Date(NOW - 90 * 60_000).toISOString()]);
expect('the drivers logged into the bus, who is at the wheel, and their hours',
  a.buses[0].drivers.map(x => [x.driver_id, x.duty, x.wheel, x.left_ms]),
  [['d1', 'driving', true, 9 * H + 3 * 60_000], ['d2', 'sleeper', false, 4 * H]]);
p = parts();
a = await liveFor(BUSES, DRIVERS, p.deps);
expect('the logs are asked for the drivers resting in a bus, a day back',
  [p.logsAsked[0], (NOW - p.logsAsked[1]) / H], [['s-Ben Ortiz'], 24]);
expect('a driver resting has when the rest began, and one driving has none',
  a.buses[0].drivers.map(x => [x.name, x.rest_since]), [['Ana Ruiz', null], ['Ben Ortiz', ago(5 * 60)]]);
expect('a driver in the sleeper has when that run began, and no split without an earlier period',
  a.buses[0].drivers.map(x => [x.name, x.berth_since, x.split_ms]), [['Ana Ruiz', null, null], ['Ben Ortiz', ago(3 * 60), null]]);
p = parts({ logsFail: true });
a = await liveFor(BUSES, DRIVERS, p.deps);
expect('logs the key may not read leave the rest unknown, and the drivers still come back',
  a.buses[0].drivers.map(x => [x.name, x.duty, x.rest_since]), [['Ana Ruiz', 'driving', null], ['Ben Ortiz', 'sleeper', null]]);
p = parts({ clocksFail: true });
a = await liveFor(BUSES, DRIVERS, p.deps);
expect('without the hours permission the buses still come back, with no drivers',
  [a.hours, a.buses.length, a.buses[0].drivers.length, a.buses[0].engine], [false, 2, 0, 'on']);

// ── who is answered ─────────────────────────────────────────────────────────
async function post({ auth = 'Bearer staff', method = 'POST', body = '{}', ...opts } = {}) {
  const q = parts(opts);
  const req = new Request('https://example.supabase.co/functions/v1/samsara-now', {
    method, headers: { origin: 'http://localhost:8641', 'content-type': 'application/json', ...(auth ? { authorization: auth } : {}) },
    body: method === 'POST' ? body : undefined,
  });
  const res = await handle(req, q.deps);
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, calls: q.calls, asked: q.asked };
}
let r = await post({ method: 'OPTIONS' });
expect('the log-in preview may ask', r.status, 204);
r = await post({ auth: null });
expect('no log-in is turned away', [r.status, r.body], [401, { error: 'log-in' }]);
r = await post({ buses: [] });
expect('a caller who cannot read the fleet gets nothing, and Samsara is not asked', [r.status, r.calls], [404, 0]);
r = await post({ keyed: false });
expect('with no Samsara key it says so', [r.status, r.body, r.calls], [503, { error: 'no-key' }, 0]);
r = await post();
expect('the fleet is answered', [r.status, r.body.hours, r.body.buses.length], [200, true, 2]);
r = await post({ body: JSON.stringify({ paths: { b1: ago(30), b2: 7 } }) });
expect('a body naming a bus gives its path, and a time that is not one is passed over',
  [r.status, r.asked[0], r.body.buses[0].path.length > 0, 'path' in r.body.buses[1]], [200, ['v101'], true, false]);
r = await post({ body: 'not json' });
expect('a body that is not JSON asks for no path', [r.status, r.asked], [200, null]);

console.log(failed ? `\n  ${failed} fault(s) in samsara-now` : '');
process.exit(failed ? 1 : 0);
