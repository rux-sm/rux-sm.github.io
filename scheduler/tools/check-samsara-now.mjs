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
const { handle, nameKey, driverIndex, liveDriver, markWheel, liveFor } = await import(pathToFileURL(file).href);
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
expect('of two on duty, the one who drove last', wheel([['Ana Ruiz', 'onDuty', 7 * H], ['Ben Ortiz', 'onDuty', 3 * H]]), ['Ben Ortiz']);
expect('nobody, when both rest', wheel([['Ana Ruiz', 'sleeperBed', 7 * H], ['Ben Ortiz', 'offDuty', 3 * H]]), []);

// ── the fleet ───────────────────────────────────────────────────────────────
const NOW = Date.parse('2026-10-14T20:00:00Z');
const ago = min => new Date(NOW - min * 60_000).toISOString();
const BUSES = [{ id: 'b1', number: '101' }, { id: 'b2', number: '102' }, { id: 'b3', number: '900' }];
const DRIVERS = [{ id: 'd1', name: 'Ana Maria Ruiz' }, { id: 'd2', name: 'Ben Ortiz' }];
function parts({ buses = BUSES, clocksFail = false, keyed = true } = {}) {
  let calls = 0;
  return {
    get calls() { return calls; },
    deps: {
      keyed,
      now: () => NOW,
      buses: async () => buses,
      drivers: async () => DRIVERS,
      vehicles: async () => { calls++; return [{ id: 'v101', name: '101' }, { id: 'v102', name: ' 102 ' }]; },
      stats: async ids => { calls++; return [
        { id: 'v101', engineState: { time: ago(1), value: 'On' }, gps: { time: ago(1), speedMilesPerHour: 64.6, reverseGeo: { formattedLocation: 'Somewhere, TX' } } },
        { id: 'v102', engineState: { time: ago(40), value: 'On' }, gps: { time: ago(40), speedMilesPerHour: 30 } },
        { id: 'v103', engineState: { time: ago(90), value: 'On' }, gps: { time: ago(1), speedMilesPerHour: 32 } },
      ].filter(s => ids.includes(s.id)); },
      clocks: async () => { calls++; if (clocksFail) throw new Error('403'); return [
        clock('Ana Ruiz', 'driving', 9 * H + 3 * 60_000, 14 * H, 69 * H),
        clock('Ben Ortiz', 'sleeperBed', 4 * H, 9 * H, 50 * H),
        clock('Cal Diaz', 'offDuty', 10 * H, 15 * H, 70 * H, null),
      ]; },
    },
  };
}
let p = parts();
let a = await liveFor(BUSES, DRIVERS, p.deps);
expect('only the buses Samsara has come back', a.buses.map(b => b.bus_id), ['b1', 'b2']);
expect('a fresh reading gives the engine, the speed and the place',
  [a.buses[0].engine, a.buses[0].mph, a.buses[0].place], ['on', 65, 'Somewhere, TX']);
expect('a reading forty minutes old says nothing about now', [a.buses[1].engine, a.buses[1].mph], [null, null]);
const long = parts();
long.deps.vehicles = async () => [{ id: 'v103', name: '103' }];
const onLong = await liveFor([{ id: 'b4', number: '103' }], DRIVERS, long.deps);
expect('an engine on since long ago is still on while the GPS reports',
  [onLong.buses[0].engine, onLong.buses[0].mph], ['on', 32]);
expect('the drivers logged into the bus, who is at the wheel, and their hours',
  a.buses[0].drivers.map(x => [x.driver_id, x.duty, x.wheel, x.left_ms]),
  [['d1', 'driving', true, 9 * H + 3 * 60_000], ['d2', 'sleeper', false, 4 * H]]);
p = parts({ clocksFail: true });
a = await liveFor(BUSES, DRIVERS, p.deps);
expect('without the hours permission the buses still come back, with no drivers',
  [a.hours, a.buses.length, a.buses[0].drivers.length, a.buses[0].engine], [false, 2, 0, 'on']);

// ── who is answered ─────────────────────────────────────────────────────────
async function post({ auth = 'Bearer staff', method = 'POST', ...opts } = {}) {
  const q = parts(opts);
  const req = new Request('https://example.supabase.co/functions/v1/samsara-now', {
    method, headers: { origin: 'http://localhost:8641', 'content-type': 'application/json', ...(auth ? { authorization: auth } : {}) },
    body: method === 'POST' ? '{}' : undefined,
  });
  const res = await handle(req, q.deps);
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, calls: q.calls };
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

console.log(failed ? `\n  ${failed} fault(s) in samsara-now` : '');
process.exit(failed ? 1 : 0);
