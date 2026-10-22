// Runs maintenance-status's handler, the maintenance link's door to whether a
// bus is at the yard, on the road or back, against an invented day trip and
// invented GPS paths, with the board's own week.js and road.js: which state
// each moment gets, when the bus is expected back and when it came in, how
// the drive home is chosen and how often it is asked, that one answer serves
// for a minute, that only the five fields leave, and what a caller with no
// link is told. It also holds the borrowed files to the board's as they are,
// and the drive's choice to places.js's. Places are made-up points along one
// line of latitude, about a mile apart.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runInNewContext } from 'node:vm';
import { build } from './build-maintenance-road.mjs';

process.removeAllListeners('warning');

let failed = 0;
function expect(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`}`);
}

// ── the borrowed files are the board's as they are ──────────────────────────
for (const [name, text] of Object.entries(build())) {
  let now = '';
  try { now = readFileSync(new URL(`../maintenance-status/${name}`, import.meta.url), 'utf8'); } catch { /* stale */ }
  expect(`${name} is built from the files as they are (npm run build)`, now === text, true);
}

const source = readFileSync(new URL('../maintenance-status/handler.ts', import.meta.url), 'utf8');
const scratch = mkdtempSync(join(tmpdir(), 'check-maintenance-status-'));
const file = join(scratch, 'handler.mjs');
writeFileSync(file, stripTypeScriptTypes(source));
const H = await import(pathToFileURL(file).href);
rmSync(scratch, { recursive: true, force: true });

// The drive's choice is places.js's.
const places = readFileSync(new URL('../places.js', import.meta.url), 'utf8');
const constant = name => Number(new RegExp(`const ${name} = ([0-9.]+);`).exec(places)?.[1]);
expect('the short route is chosen by places.js\'s SHORTER and SLOWER', [H.SHORTER, H.SLOWER], [constant('SHORTER'), constant('SLOWER')]);
expect('a short route 10% fewer miles and 5% slower is taken', H.driveMinutes({ time: 1800, distance: 30000 }, { time: 1890, distance: 27000 }), 32);
expect('a short route 20% slower is not', H.driveMinutes({ time: 1800, distance: 30000 }, { time: 2160, distance: 20000 }), 30);
expect('no route is no drive', H.driveMinutes(null, null), null);

// ── the board's road ────────────────────────────────────────────────────────
const window = {};
for (const f of ['../trip-shape.js', '../past-midnight.js', '../week.js', '../road.js']) runInNewContext(readFileSync(new URL(f, import.meta.url), 'utf8'), { window, Intl, Date });
const week = window.SchedulerWeek, road = window.SchedulerRoad;

const LAT = 26.2, YARD_LNG = -98.2, MILE = 1 / (69.17 * Math.cos(LAT * Math.PI / 180));
const at = m => [LAT, YARD_LNG + m * MILE];
const place = m => ({ lat: LAT, lng: YARD_LNG + m * MILE });
const DAY = '2026-10-15';
const T = time => week.officeInstant(DAY, time);
const P = (m, time) => [...at(m), T(time)];

// A day trip: out of the yard at 8, a pickup 5 miles on, the destination 20
// on, back at the yard at 3.
const trip = {
  id: 't1', trip_type: 'round_trip', start_date: DAY, end_date: DAY,
  trip_stops: [
    { id: 'p', leg: 'outbound', position: 0, type: 'pickup', name: 'Pickup school', ...place(5), depart_prev: '08:00', spot: '08:30', spot_date: DAY },
    { id: 'd', leg: 'outbound', position: 1, type: 'stop', name: 'Museum', ...place(20), depart_prev: '08:45', arrive: '10:00' },
    { id: 'y', leg: 'outbound', position: 2, type: 'return', name: 'Yard', ...place(0), depart_prev: '13:00', arrive: '15:00' },
  ],
  trip_assignments: [
    { id: 'a1', leg: 'outbound', bus_id: 'b1', number: '133' },
    { id: 'a2', leg: 'outbound', bus_id: 'b2', number: '506' },
  ],
};
const OUT = [P(0, '07:55'), P(1, '08:05'), P(5, '08:20'), P(6, '08:35'), P(12, '09:10'), P(20, '09:50'), P(19, '12:30'), P(15, '12:55')];
const HOME = [...OUT, P(5, '14:40'), P(0.1, '15:02')];
const busAt = (m, time, path, more = {}) => ({ bus_id: 'b1', engine: 'on', engine_at: new Date(T('07:00')).toISOString(), mph: 55,
  lat: at(m)[0], lng: at(m)[1], seen: new Date(T(time)).toISOString(), path, drivers: [{ name: 'Someone', duty: 'driving' }], fuel: 80, ...more });

function deps(nowTime, buses, extra = {}) {
  const calls = { trips: 0, live: 0, route: 0, paths: null, fleet: null };
  const d = {
    calls, keyed: true, now: () => T(nowTime), week, road,
    shareOk: async token => token === 'abc123abc123abc123ab',
    trips: async () => { calls.trips++; return [trip]; },
    settings: async () => ({ yard: at(0), slowPercent: 10, lateReturn: null }),
    live: async (fleet, paths) => { calls.live++; calls.paths = paths; calls.fleet = fleet; return { at: new Date(T(nowTime)).toISOString(), buses }; },
    route: async (a, b, type) => { calls.route++; return type === 'short' ? { time: 1890, distance: 27000 } : { time: 1800, distance: 30000 }; },
    ...extra,
  };
  return d;
}
const ask = async (d, body = { token: 'abc123abc123abc123ab' }) => {
  const r = await H.handle(new Request('https://x/', { method: 'POST', headers: { origin: 'https://rux-sm.github.io' }, body: JSON.stringify(body) }), d);
  return { status: r.status, body: await r.json() };
};
const iso = time => new Date(T(time)).toISOString();

// ── the states ──────────────────────────────────────────────────────────────
H.forget();
let d = deps('07:30', [busAt(0, '07:29', [P(0, '07:00'), P(0, '07:29')], { mph: 0, engine: 'idle', engine_at: new Date(T('07:20')).toISOString() })]);
let r = await ask(d);
expect('before yard-out, a bus standing at the yard has not left', r.body.buses, [{ tripId: 't1', leg: 'outbound', legId: null, busId: 'b1', state: 'yard', back: null }]);
expect('each bus\'s path is asked from two hours before yard-out, the board\'s stretch', d.calls.paths, { b1: iso('06:00'), b2: iso('06:00') });
expect('Samsara is asked for the buses by number, with no driver', d.calls.fleet, [{ id: 'b1', number: '133' }, { id: 'b2', number: '506' }]);
expect('a bus Samsara does not know is left out', r.body.buses.some(b => b.busId === 'b2'), false);
// The same trip read with its legs: the bus's leg is its route's, and the answer names it by its id.
H.forget();
const shapedTrip = { ...trip, trip_legs: [{ id: 'l1', leg: 'outbound', start_date: DAY, end_date: DAY, bus_count: 2, trip_routes: [{ id: 'r1', position: 1 }] }],
  trip_stops: trip.trip_stops.map(x => ({ ...x, route_id: 'r1' })), trip_assignments: trip.trip_assignments.map(x => ({ ...x, route_id: 'r1' })) };
r = await ask(deps('07:30', [busAt(0, '07:29', [P(0, '07:00'), P(0, '07:29')], { mph: 0, engine: 'idle', engine_at: new Date(T('07:20')).toISOString() })],
  { trips: async () => [shapedTrip] }));
expect('a trip read with its legs answers with the leg\'s id beside its word', r.body.buses,
  [{ tripId: 't1', leg: 'outbound', legId: 'l1', busId: 'b1', state: 'yard', back: null }]);

H.forget();
d = deps('11:00', [busAt(20, '10:59', OUT.slice(0, 6), { mph: 0 })]);
r = await ask(d);
expect('at its destination, the bus is on the road with no time back yet', r.body.buses, [{ tripId: 't1', leg: 'outbound', legId: null, busId: 'b1', state: 'road', back: null }]);
expect('and no drive is asked while the yard is not next', d.calls.route, 0);

H.forget();
d = deps('13:00', [busAt(15, '12:55', OUT)]);
r = await ask(d);
expect('heading home, it is due in after the drive, slowed by the office\'s percent',
  r.body.buses, [{ tripId: 't1', leg: 'outbound', legId: null, busId: 'b1', state: 'road', back: new Date(T('13:00') + 35 * 60e3).toISOString() }]);
expect('both routes are asked', d.calls.route, 2);

H.forget();
d = deps('15:10', [busAt(0.1, '15:02', HOME, { mph: 0 })]);
r = await ask(d);
expect('back at the yard, with the time it came in', r.body.buses, [{ tripId: 't1', leg: 'outbound', legId: null, busId: 'b1', state: 'back', back: iso('15:02') }]);

H.forget();
d = deps('19:00', [busAt(0.1, '18:00', HOME, { mph: 0, engine: 'off' })]);
r = await ask(d);
expect('past its stretch on the road, the leg says nothing', r.body.buses, []);
expect('and Samsara is not asked', d.calls.live, 0);

// A group let off at the yard before the bus parks: heading to that stop is
// heading home, and reaching it is back.
const dropAtYard = { ...trip, id: 't2', trip_stops: [
  trip.trip_stops[0], trip.trip_stops[1],
  { id: 'off', leg: 'outbound', position: 2, type: 'stop', name: 'The yard', ...place(0.05), depart_prev: '13:00', arrive: '14:55' },
  { ...trip.trip_stops[2], position: 3 },
], trip_assignments: [trip.trip_assignments[0]] };
H.forget();
d = deps('13:00', [busAt(15, '12:55', OUT)], { trips: async () => [dropAtYard] });
r = await ask(d);
expect('heading for a drop-off at the yard, the bus is due in after the drive', r.body.buses.map(b => [b.state, b.back]),
  [['road', new Date(T('13:00') + 35 * 60e3).toISOString()]]);
H.forget();
r = await ask(deps('15:10', [busAt(0.1, '15:02', HOME, { mph: 0 })], { trips: async () => [dropAtYard] }));
expect('and once it reaches that drop-off, it is back', r.body.buses.map(b => [b.state, b.back]), [['back', iso('15:02')]]);

// ── once a minute ───────────────────────────────────────────────────────────
H.forget();
d = deps('13:00', [busAt(15, '12:55', OUT)]);
await ask(d);
d.now = () => T('13:00') + 59e3;
await ask(d);
expect('a second ask within the minute is the same answer, nothing asked again', [d.calls.trips, d.calls.live], [1, 1]);
d.now = () => T('13:01') + 1e3;
await ask(d);
expect('after the minute, Samsara is asked again', d.calls.live, 2);
expect('but the drive home is not, inside five minutes', d.calls.route, 2);
d.now = () => T('13:06');
await ask(d);
expect('after five minutes, it is', d.calls.route, 4);

// ── what leaves, and to whom ────────────────────────────────────────────────
H.forget();
r = await ask(deps('13:00', [busAt(15, '12:55', OUT)]));
expect('only the six fields leave, never a place, speed, fuel or driver',
  [...new Set(r.body.buses.flatMap(Object.keys))].sort(), ['back', 'busId', 'leg', 'legId', 'state', 'tripId']);
expect('the answer is the buses and when', Object.keys(r.body).sort(), ['at', 'buses']);
expect('a wrong token is not found', (await ask(deps('13:00', []), { token: 'ffffffffffffffffffff' })).status, 404);
const nosy = deps('13:00', []);
expect('a token that is not hex is not found', (await ask(nosy, { token: "x' or 1=1" })).status, 404);
expect('and the database is not asked for it', nosy.calls.trips, 0);
expect('no body is not found', (await H.handle(new Request('https://x/', { method: 'POST' }), deps('13:00', []))).status, 404);
expect('no Samsara key says so', (await ask(deps('13:00', [], { keyed: false }))).status, 503);
expect('a GET is refused', (await H.handle(new Request('https://x/'), deps('13:00', []))).status, 405);

console.log(failed ? `\n  ${failed} fault(s) in maintenance-status` : '\n  maintenance-status says what the board says, and nothing more');
process.exit(failed ? 1 : 0);
