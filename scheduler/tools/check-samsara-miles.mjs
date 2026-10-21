// Runs samsara-miles's handler, the trip editor's door to Samsara's odometer,
// against sample trips with invented readings: the window each leg is read
// across, the miles each bus gets or why it gets none, when each reached its
// pickup, when each left the yard and got back, the farthest bus's total, and what a caller who should not get an answer is told. The handler
// is TypeScript with no imports; its types are taken off and the rest is run
// as a module.
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Taking the types off is new enough in Node to warn each time it is used.
process.removeAllListeners('warning');

const source = readFileSync(new URL('../samsara-miles/handler.ts', import.meta.url), 'utf8');
const scratch = mkdtempSync(join(tmpdir(), 'check-samsara-miles-'));
const file = join(scratch, 'handler.mjs');
writeFileSync(file, stripTypeScriptTypes(source));
const { arrivalAt, handle, handleNight, instant, legWindow, milesFor, night, pickupOf, yardTimes } = await import(pathToFileURL(file).href);
rmSync(scratch, { recursive: true, force: true });

let failed = 0;
function expect(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`}`);
}

const iso = ms => (ms == null ? null : new Date(ms).toISOString());
const MILE = 1609.344;
const id = n => `aaaaaaaa-0000-4000-8000-00000000000${n}`;
const stop = (type, leg, position, more = {}) => ({
  leg, type, position, depart_prev: null, depart_prev_date: null, arrive: null, arrive_date: null,
  spot: null, spot_date: null, ...more,
});
const trip = (n, more = {}) => ({
  id: id(n), start_date: '2026-10-10', end_date: '2026-10-10', return_start_date: null, return_end_date: null,
  departure_time: null, return_time: null, trip_stops: [], trip_assignments: [], ...more,
});

// ── time ────────────────────────────────────────────────────────────────────
expect('a summer time is five hours behind', iso(instant('2026-10-14', '07:30')), '2026-10-14T12:30:00.000Z');
expect('a winter time is six hours behind', iso(instant('2026-12-14', '07:30:00')), '2026-12-14T13:30:00.000Z');
expect('the morning the clocks go forward', iso(instant('2026-03-08', '03:30')), '2026-03-08T08:30:00.000Z');
expect('a date that is not one is nothing', instant('2026-13-40', '07:30'), null);

// ── a leg's window ──────────────────────────────────────────────────────────
const day = trip(1, {
  trip_stops: [
    stop('pickup', 'outbound', 0, { depart_prev: '06:00:00', spot: '06:45:00' }),
    stop('stop', 'outbound', 1, { depart_prev: '07:00:00' }),
    stop('return', 'outbound', 2, { depart_prev: '21:00:00', arrive: '22:00:00' }),
  ],
});
let w = legWindow(day, 'outbound');
expect('a day trip runs yard-out to yard-back', [iso(w.start), iso(w.end), w.timed],
  ['2026-10-10T11:00:00.000Z', '2026-10-11T03:00:00.000Z', true]);

w = legWindow(trip(2, { trip_stops: [
  stop('pickup', 'outbound', 0, { depart_prev: '18:00' }),
  stop('return', 'outbound', 1, { arrive: '01:30' }),
] }), 'outbound');
expect('a yard-back after midnight is the next day', iso(w.end), '2026-10-11T06:30:00.000Z');

w = legWindow(trip(3, { start_date: '2026-12-05', end_date: '2026-12-06' }), 'outbound');
expect('a leg with no times is its whole days, to four the morning after', [iso(w.start), iso(w.end), w.timed],
  ['2026-12-05T06:00:00.000Z', '2026-12-07T10:00:00.000Z', false]);

const split = trip(4, {
  end_date: '2026-10-10', return_start_date: '2026-10-12', return_end_date: '2026-10-12',
  trip_stops: [
    stop('pickup', 'outbound', 0, { depart_prev: '08:00' }),
    stop('return', 'outbound', 1, { arrive: '12:00' }),
    stop('pickup', 'return', 0, { depart_prev: '09:00' }),
    stop('return', 'return', 1, { arrive: '13:00' }),
  ],
});
w = legWindow(split, 'return');
expect('a return leg reads its own rows and dates', [iso(w.start), iso(w.end)],
  ['2026-10-12T14:00:00.000Z', '2026-10-12T18:00:00.000Z']);

// ── miles ───────────────────────────────────────────────────────────────────
const BUSES = { b1: '101', b2: '102', b3: '900' };
const VEHICLES = [{ id: 'v101', name: '101' }, { id: 'v102', name: ' 102 ' }];
const reading = (time, value) => ({ time, value });

// Stand-in parts: invented odometers that rise between two instants, and a
// record of every instant Samsara is asked about.
// Samsara's own trips for v101 on the day trip: two drivers and a stretch
// with nobody logged in, inside the window, and one from the night before.
const SEGMENTS = {
  v101: [
    { startMs: Date.parse('2026-10-10T11:30:00Z'), driverId: 11, distanceMeters: Math.round(200 * MILE) },
    { startMs: Date.parse('2026-10-10T20:00:00Z'), driverId: 12, distanceMeters: Math.round(99 * MILE) },
    { startMs: Date.parse('2026-10-11T02:40:00Z'), driverId: 0, distanceMeters: Math.round(1 * MILE) },
    { startMs: Date.parse('2026-10-10T04:00:00Z'), driverId: 11, distanceMeters: Math.round(70 * MILE) },
  ],
};
function parts({ others = [], now = Date.parse('2026-10-20T00:00:00Z'), odometer, keyed = true, found = day, tripsFail = false, segments = SEGMENTS, fixes = {}, yard = null } = {}) {
  const asked = [];
  let samsaraCalls = 0;
  return {
    asked,
    get samsaraCalls() { return samsaraCalls; },
    deps: {
      keyed,
      now: () => now,
      trip: async () => found,
      buses: async ids => ids.map(i => ({ id: i, number: BUSES[i] ?? null })),
      others: async () => others,
      vehicles: async () => { samsaraCalls++; return VEHICLES; },
      readings: async (ids, at) => {
        samsaraCalls++;
        asked.push([at, [...ids].sort()]);
        return Object.fromEntries(ids.map(v => [v, odometer(v, at)]));
      },
      drivers: async () => [{ id: 'd1', name: 'Ana Maria Ruiz' }, { id: 'd2', name: 'Ben Ortiz' }],
      vehicleTrips: async v => { if (tripsFail) throw new Error('401'); return segments[v] ?? []; },
      gps: async (v, from, to) => {
        asked.push(['gps', v, iso(from), iso(to)]);
        return (fixes[v] ?? []).filter(f => Date.parse(f.time) >= from && Date.parse(f.time) <= to);
      },
      samsaraDrivers: async () => [{ id: '11', name: 'Ana Ruiz Jr' }, { id: '12', name: 'Dee Moss' }],
      yard: async () => yard,
    },
  };
}

// v101's engine odometer goes 300 miles; v102's engine stops reporting before
// the trip, and its GPS distance goes 400.
const START = '2026-10-10T09:00:00.000Z';
const END = '2026-10-11T05:00:00.000Z';
function odometer(v, at) {
  const late = Date.parse(at) >= Date.parse('2026-10-11T00:00:00Z');
  if (v === 'v101') return { obdOdometerMeters: reading(late ? '2026-10-11T03:10:00Z' : '2026-10-10T08:00:00Z', 1_000_000 + (late ? Math.round(300 * MILE) : 0)) };
  return {
    obdOdometerMeters: reading('2026-10-01T00:00:00Z', 2_000_000),
    gpsDistanceMeters: reading(late ? '2026-10-11T03:20:00Z' : '2026-10-10T07:00:00Z', 500_000 + (late ? Math.round(400 * MILE) : 0)),
  };
}

const three = { ...day, trip_assignments: [{ bus_id: 'b1', leg: 'outbound' }, { bus_id: 'b2', leg: null }, { bus_id: 'b3', leg: 'outbound' }] };
let p = parts({ odometer });
let a = await milesFor(three, p.deps);
expect('each bus gets its miles, from the engine or the GPS',
  a.buses.map(b => [b.number, b.miles, b.legs.map(l => [l.leg, l.miles, l.source, l.note])]),
  [['101', 300, [['outbound', 300, 'engine', null]]],
   ['102', 400, [['outbound', 400, 'gps', null]]],
   ['900', null, [['outbound', null, null, 'not-in-samsara']]]]);
expect('Actual miles is the farthest bus\'s', a.actual, 400);
expect('the window is widened two hours each side, and asked once per instant', [...p.asked].sort(([x], [y]) => x.localeCompare(y)),
  [[START, ['v101', 'v102']], [END, ['v101', 'v102']]]);

const before = trip(5, { trip_stops: [
  stop('pickup', 'outbound', 0, { depart_prev: '01:00' }),
  stop('return', 'outbound', 1, { arrive: '05:00' }),
], trip_assignments: [{ bus_id: 'b1', leg: 'outbound' }] });
p = parts({ odometer, others: [before] });
a = await milesFor(three, p.deps);
expect('the margin stops where the bus\'s trip before ends', [...p.asked].sort(([x], [y]) => x.localeCompare(y)),
  [[START, ['v102']], ['2026-10-10T10:00:00.000Z', ['v101']], [END, ['v101', 'v102']]]);

const during = trip(6, { trip_stops: [
  stop('pickup', 'outbound', 0, { depart_prev: '12:00' }),
  stop('return', 'outbound', 1, { arrive: '14:00' }),
], trip_assignments: [{ bus_id: 'b2', leg: 'outbound' }] });
p = parts({ odometer, others: [during] });
a = await milesFor(three, p.deps);
expect('a bus on another trip inside the window gets no miles', a.buses.map(b => [b.number, b.miles, b.legs[0].note]),
  [['101', 300, null], ['102', null, 'other-trip'], ['900', null, 'not-in-samsara']]);
expect('and the farthest bus is the one left', a.actual, 300);

p = parts({ odometer, now: Date.parse('2026-10-11T02:00:00Z') });
a = await milesFor(three, p.deps);
expect('a leg not yet back is not read', [a.buses.map(b => b.legs[0].note), a.actual, p.asked.length],
  [['not-finished', 'not-finished', 'not-in-samsara'], null, 0]);

p = parts({ odometer: () => ({ obdOdometerMeters: reading('2026-10-09T00:00:00Z', 7) }) });
a = await milesFor(three, p.deps);
expect('a bus with no reading inside the window has no readings', a.buses.slice(0, 2).map(b => b.legs[0].note),
  ['no-readings', 'no-readings']);

p = parts({ odometer });
a = await milesFor(three, p.deps);
expect('who drove each bus, most miles first, matched where the office has them',
  a.buses.map(b => [b.number, b.drivers]),
  [['101', [{ driver_id: 'd1', name: 'Ana Ruiz Jr', miles: 200 }, { driver_id: null, name: 'Dee Moss', miles: 99 },
    { driver_id: null, name: null, miles: 1 }]], ['102', []], ['900', []]]);
p = parts({ odometer, tripsFail: true });
a = await milesFor(three, p.deps);
expect('without permission to read Samsara\'s trips, nobody is known, and the miles still come',
  [a.buses.map(b => b.drivers), a.actual], [[null, null, null], 400]);

const both = { ...split, trip_assignments: [{ bus_id: 'b1', leg: 'outbound' }, { bus_id: 'b1', leg: 'return' }] };
p = parts({ odometer: (v, at) => ({ obdOdometerMeters: reading(at, Math.round((Date.parse(at) - Date.parse('2026-10-10T00:00:00Z')) / 3600_000 * 10 * MILE)) }) });
a = await milesFor(both, p.deps);
expect('a bus on both legs adds them up', [a.buses[0].legs.map(l => l.miles), a.buses[0].miles], [[80, 80], 160]);
p = parts({
  odometer: (v, at) => ({ obdOdometerMeters: reading(at, 0) }),
  segments: { v101: [
    { startMs: Date.parse('2026-10-10T13:30:00Z'), driverId: 11, distanceMeters: Math.round(80 * MILE) },
    { startMs: Date.parse('2026-10-12T14:30:00Z'), driverId: 12, distanceMeters: Math.round(70 * MILE) },
    { startMs: Date.parse('2026-10-12T16:00:00Z'), driverId: 11, distanceMeters: Math.round(10 * MILE) },
  ] },
});
a = await milesFor(both, p.deps);
expect('each leg says who drove the bus on it, and the bus who drove it in all',
  [a.buses[0].legs.map(l => l.drivers.map(d => [d.name, d.miles])), a.buses[0].drivers.map(d => [d.name, d.miles])],
  [[[['Ana Ruiz Jr', 80]], [['Dee Moss', 70], ['Ana Ruiz Jr', 10]]], [['Ana Ruiz Jr', 90], ['Dee Moss', 70]]]);

// The same split trip read with its legs: a leg is found by its id or its old word, a bus row is on its
// route's leg whatever its word says, and the answer names each leg by both.
const shapedSplit = { ...both,
  trip_legs: [
    { id: 'l2', leg: 'return', start_date: '2026-10-12', end_date: '2026-10-12', created_at: '1', trip_routes: [{ id: 'r2', position: 1 }] },
    { id: 'l1', leg: 'outbound', start_date: '2026-10-10', end_date: '2026-10-10', created_at: '1', trip_routes: [{ id: 'r1', position: 1 }] }],
  trip_stops: split.trip_stops.map(x => ({ ...x, route_id: x.leg === 'return' ? 'r2' : 'r1' })),
  trip_assignments: [{ bus_id: 'b1', leg: 'return', route_id: 'r1' }, { bus_id: 'b1', leg: 'outbound', route_id: 'r2' }] };
expect('a leg read with its legs has the window its id or its word names',
  [legWindow(shapedSplit, 'l2'), legWindow(shapedSplit, 'return'), legWindow(shapedSplit, 'l9')], [legWindow(split, 'return'), legWindow(split, 'return'), null]);
p = parts({ odometer: (v, at) => ({ obdOdometerMeters: reading(at, Math.round((Date.parse(at) - Date.parse('2026-10-10T00:00:00Z')) / 3600_000 * 10 * MILE)) }) });
a = await milesFor(shapedSplit, p.deps);
expect('each leg in the answer is named by its old word and its id, a bus row on its route\'s leg',
  [a.legs.map(l => [l.leg, l.leg_id]), a.buses[0].legs.map(l => [l.leg, l.leg_id, l.miles]), a.buses[0].miles],
  [[['outbound', 'l1'], ['return', 'l2']], [['outbound', 'l1', 80], ['return', 'l2', 80]], 160]);
a = await milesFor(both, p.deps);
expect('a trip read without its legs names none by id', [a.legs.map(l => l.leg_id), a.buses[0].legs.map(l => l.leg_id)], [[null, null], [null, null]]);

// ── the pickup ──────────────────────────────────────────────────────────────
// The yard, and a pickup about six miles north; a quarter mile is 0.0036°.
const YARD = [26.2000, -98.2300];
const PICK = [26.2900, -98.2300];
const fix = (time, [lat, lng]) => ({ time, latitude: lat, longitude: lng });
const north = d => [PICK[0] + d, PICK[1]];
const placed = trip(7, { trip_stops: [
  stop('pickup', 'outbound', 0, { depart_prev: '06:00', spot: '07:00', lat: String(PICK[0]), lng: String(PICK[1]) }),
  stop('return', 'outbound', 1, { arrive: '12:00' }),
], trip_assignments: [{ bus_id: 'b1', leg: 'outbound' }] });

let pk = pickupOf(placed, 'outbound');
expect('the pickup is due at its Spot', [pk.point, iso(pk.due)], [PICK, '2026-10-10T12:00:00.000Z']);
pk = pickupOf(trip(8, { departure_time: '05:30', trip_stops: [stop('pickup', 'outbound', 0, { lat: 1, lng: 2 })] }), 'outbound');
expect('with no Spot it is due at the leg\'s departure', iso(pk.due), '2026-10-10T10:30:00.000Z');
expect('a pickup with no map point has none', pickupOf(trip(9, { trip_stops: [stop('pickup', 'outbound', 0, { spot: '07:00' })] }), 'outbound'), null);

const due = Date.parse('2026-10-10T12:00:00Z');
expect('the first point inside a quarter mile is the arrival', iso(arrivalAt(PICK, due, [
  fix('2026-10-10T11:00:00Z', YARD), fix('2026-10-10T11:40:00Z', north(0.01)), fix('2026-10-10T11:52:00Z', north(0.002)),
  fix('2026-10-10T11:58:00Z', PICK)])), '2026-10-10T11:52:00.000Z');
expect('a point more than two hours early does not count', iso(arrivalAt(PICK, due, [
  fix('2026-10-10T08:00:00Z', YARD), fix('2026-10-10T09:00:00Z', PICK), fix('2026-10-10T09:30:00Z', YARD),
  fix('2026-10-10T12:10:00Z', PICK)])), '2026-10-10T12:10:00.000Z');
expect('a bus already there arrived when its points start', iso(arrivalAt(PICK, due, [
  fix('2026-10-10T09:00:00Z', PICK), fix('2026-10-10T12:30:00Z', north(0.001))])), '2026-10-10T09:00:00.000Z');
expect('a bus parked since it came arrived when it came, whatever points it sent', iso(arrivalAt(PICK, due, [
  fix('2026-10-10T08:00:00Z', YARD), fix('2026-10-10T09:10:00Z', north(0.002)), fix('2026-10-10T12:20:00Z', PICK)])),
  '2026-10-10T09:10:00.000Z');
expect('a bus that never gets near has not arrived', arrivalAt(PICK, due, [
  fix('2026-10-10T11:00:00Z', YARD), fix('2026-10-10T12:00:00Z', north(0.01))]), null);

// A lot `m` miles east of the pickup, where a campus may have its buses load.
const east = m => [PICK[0], PICK[1] + m / 62.0];
const every5 = (from, to, at) => {
  const out = [];
  for (let ms = Date.parse(from); ms <= Date.parse(to); ms += 5 * 60_000) out.push(fix(new Date(ms).toISOString(), at));
  return out;
};
const atLot = [fix('2026-10-10T09:00:00Z', YARD), ...every5('2026-10-10T11:20:00Z', '2026-10-10T12:40:00Z', east(0.8))];
expect('a bus that stood at a lot 0.8 mi off, then drove two and a half miles off, arrived when it came to rest there',
  iso(arrivalAt(PICK, due, [...atLot, fix('2026-10-10T12:41:00Z', east(2)), fix('2026-10-10T12:42:00Z', east(3.5))])),
  '2026-10-10T11:20:00.000Z');
expect('one still standing there has not arrived yet', arrivalAt(PICK, due, atLot), null);
expect('a bus that stood there only three minutes, as at a light, has not arrived', arrivalAt(PICK, due, [
  fix('2026-10-10T09:00:00Z', YARD), fix('2026-10-10T11:20:00Z', east(0.8)), fix('2026-10-10T11:23:00Z', east(0.8)),
  fix('2026-10-10T11:26:00Z', east(3.5))]), null);
expect('a bus that stood two minutes within half a mile arrived when it came to rest there', iso(arrivalAt(PICK, due, [
  fix('2026-10-10T09:00:00Z', YARD), fix('2026-10-10T11:20:00Z', east(0.4)), fix('2026-10-10T12:30:00Z', east(0.4))])),
  '2026-10-10T11:20:00.000Z');
expect('a late bus held up in traffic a mile out arrived when it reached the pickup', iso(arrivalAt(PICK, due, [
  fix('2026-10-10T09:00:00Z', YARD), ...every5('2026-10-10T11:50:00Z', '2026-10-10T12:00:00Z', east(1.2)),
  fix('2026-10-10T12:05:00Z', east(0.6)), fix('2026-10-10T12:08:00Z', PICK)])), '2026-10-10T12:08:00.000Z');
expect('a bus waiting at a yard near the pickup arrived when it got there, not while it waited', iso(arrivalAt(PICK, due, [
  fix('2026-10-10T09:00:00Z', east(0.4)), fix('2026-10-10T10:30:00Z', east(0.4)), fix('2026-10-10T12:10:00Z', east(0.4)),
  fix('2026-10-10T12:15:00Z', PICK)])), '2026-10-10T12:15:00.000Z');

const FIXES = { v101: [fix('2026-10-10T09:00:00Z', YARD), fix('2026-10-10T12:04:00Z', PICK)] };
p = parts({ odometer, found: placed, fixes: FIXES });
a = await milesFor(placed, p.deps);
expect('each leg says when its bus reached the pickup', a.buses[0].legs.map(l => l.pickup_at), ['2026-10-10T12:04:00.000Z']);
expect('read across the leg\'s whole window', p.asked.find(x => x[0] === 'gps'),
  ['gps', 'v101', '2026-10-10T09:00:00.000Z', '2026-10-10T19:00:00.000Z']);
p = parts({ odometer, found: placed, fixes: FIXES, now: Date.parse('2026-10-10T13:00:00Z') });
a = await milesFor(placed, p.deps);
expect('a leg still out has its arrival, and no miles yet', [a.buses[0].legs[0].pickup_at, a.buses[0].legs[0].note],
  ['2026-10-10T12:04:00.000Z', 'not-finished']);
p = parts({ found: placed, odometer: (v, at) => ({ obdOdometerMeters: reading(at, Math.round(Date.parse(at) / 360_000 * MILE)) }) });
p.deps.gps = async () => { throw new Error('403'); };
a = await milesFor(placed, p.deps);
expect('points that do not come leave the arrival empty and the miles whole', [a.buses[0].legs[0].pickup_at, a.actual], [null, 100]);

// ── the yard ────────────────────────────────────────────────────────────────
const off = mi => [YARD[0] + mi / 69, YARD[1]];
const at = (t, p) => fix(`2026-10-10T${t}:00Z`, p);
const yt = (fixes, reached = null, finished = true) => {
  const t = yardTimes(YARD, fixes, reached == null ? null : Date.parse(`2026-10-10T${reached}:00Z`), finished);
  return [iso(t.depart), iso(t.back)];
};
const DAYOUT = [at('09:00', YARD), at('10:55', off(0.1)), at('11:05', off(3)), at('12:04', PICK),
  at('16:00', off(4)), at('16:58', off(0.1)), at('18:00', YARD)];
expect('it left the yard at its last point there before going two miles off, and got back at the first point of its last stay',
  yt(DAYOUT, '12:04'), ['2026-10-10T10:55:00.000Z', '2026-10-10T16:58:00.000Z']);
expect('a run out for fuel and back before the trip is passed over', yt([at('09:00', YARD), at('09:30', off(3)), at('09:50', off(0.1)),
  at('10:40', YARD), at('10:50', off(3)), at('12:04', PICK), at('17:00', YARD)], '12:04'),
  ['2026-10-10T10:40:00.000Z', '2026-10-10T17:00:00.000Z']);
expect('a bus that was never in the yard, as on a leg from a hotel, has no depart', yt([at('09:00', off(40)), at('12:04', PICK),
  at('17:00', YARD)], '12:04'), [null, '2026-10-10T17:00:00.000Z']);
expect('a bus not back by the window\'s end has no return', yt(DAYOUT.slice(0, 5), '12:04'), ['2026-10-10T10:55:00.000Z', null]);
expect('a leg still out has no return', yt(DAYOUT, '12:04', false), ['2026-10-10T10:55:00.000Z', null]);
expect('a bus that never left has neither', yt([at('09:00', YARD), at('12:00', off(0.1)), at('18:00', YARD)]), [null, null]);
p = parts({ odometer, found: placed, fixes: { v101: DAYOUT }, yard: YARD });
a = await milesFor(placed, p.deps);
expect('each leg says when its bus left the yard and got back', [a.buses[0].legs[0].yard_depart_at, a.buses[0].legs[0].yard_return_at],
  ['2026-10-10T10:55:00.000Z', '2026-10-10T16:58:00.000Z']);
p = parts({ odometer, found: placed, fixes: { v101: DAYOUT } });
a = await milesFor(placed, p.deps);
expect('with no yard set it says neither', [a.buses[0].legs[0].yard_depart_at, a.buses[0].legs[0].yard_return_at], [null, null]);

// ── each night ──────────────────────────────────────────────────────────────
const rowed = { ...placed, trip_assignments: [{ id: 'row-1', bus_id: 'b1', leg: 'outbound' }] };
const nightParts = (more = {}) => {
  const q = parts({ odometer, found: placed, fixes: { v101: DAYOUT }, yard: YARD, ...more });
  const saved = [];
  let ranged = null;
  q.deps.tripsBetween = async (from, to) => { ranged = [from, to]; return [rowed]; };
  q.deps.save = async rows => { saved.push(...rows); };
  return { deps: q.deps, saved, get ranged() { return ranged; }, get calls() { return q.samsaraCalls; } };
};
let n = nightParts();
let got = await night(n.deps, '2026-10-10', '2026-10-11', true);
expect('each night saves each bus row\'s yard times', [got.trips, n.saved],
  [1, [{ id: 'row-1', actual_yard_depart_at: '2026-10-10T10:55:00.000Z', actual_yard_return_at: '2026-10-10T16:58:00.000Z' }]]);
// Read with its legs, the row is found by its route's leg, whatever its old word says.
n = nightParts();
n.deps.tripsBetween = async () => [{ ...placed,
  trip_legs: [{ id: 'l1', leg: 'outbound', start_date: placed.start_date, end_date: placed.end_date, trip_routes: [{ id: 'r1', position: 1 }] }],
  trip_stops: placed.trip_stops.map(x => ({ ...x, route_id: 'r1' })), trip_assignments: [{ id: 'row-1', bus_id: 'b1', leg: 'return', route_id: 'r1' }] }];
got = await night(n.deps, '2026-10-10', '2026-10-11', true);
expect('a trip read with its legs saves the row on its route\'s leg', n.saved,
  [{ id: 'row-1', actual_yard_depart_at: '2026-10-10T10:55:00.000Z', actual_yard_return_at: '2026-10-10T16:58:00.000Z' }]);
n = nightParts();
got = await night(n.deps, '2026-10-01', '2026-10-11', false);
expect('a run that may not write says what it found and saves nothing', [got.rows.length, n.saved.length], [1, 0]);
n = nightParts({ fixes: { v101: DAYOUT.slice(0, 5) } });
await night(n.deps, '2026-10-10', '2026-10-11', true);
expect('a time not found is left as it was', n.saved, [{ id: 'row-1', actual_yard_depart_at: '2026-10-10T10:55:00.000Z' }]);
const nightPost = async (body, headers = { 'x-night-key': 'k' }, key = 'k') => {
  n = nightParts({ now: Date.parse('2026-10-11T10:00:00Z') });
  const res = await handleNight(new Request('https://example.supabase.co/functions/v1/samsara-miles', {
    method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }), n.deps, key);
  return { status: res.status, body: await res.json(), ranged: n.ranged, saved: n.saved.length };
};
let r = await nightPost({}, {});
expect('a run without the key is turned away', [r.status, r.ranged], [401, null]);
r = await nightPost({}, { 'x-night-key': 'k' }, '');
expect('with no key set nothing runs', r.status, 401);
r = await nightPost({});
expect('a run with no dates reads the day before and today, and saves', [r.status, r.ranged, r.saved], [200, ['2026-10-10', '2026-10-11'], 1]);
r = await nightPost({ from: '2026-08-01', to: '2026-10-11' });
expect('a range past a month is refused', [r.status, r.body], [400, { error: 'range' }]);

// ── who is answered ─────────────────────────────────────────────────────────
async function post(body, { auth = 'Bearer staff', method = 'POST', origin = 'http://localhost:8641', ...opts } = {}) {
  const q = parts({ odometer, ...opts });
  const req = new Request('https://example.supabase.co/functions/v1/samsara-miles', {
    method,
    headers: { origin, 'content-type': 'application/json', ...(auth ? { authorization: auth } : {}) },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });
  const res = await handle(req, q.deps);
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, calls: q.samsaraCalls, allow: res.headers.get('access-control-allow-origin') };
}

r = await post(null, { method: 'OPTIONS' });
expect('the log-in preview may ask', [r.status, r.allow], [204, 'http://localhost:8641']);
r = await post({ trip_id: id(1) }, { origin: 'https://example.org' });
expect('another page is not let read the answer', r.allow, 'https://rux-sm.github.io');
r = await post({ trip_id: id(1) }, { auth: null });
expect('no log-in is turned away', [r.status, r.body], [401, { error: 'log-in' }]);
r = await post({ trip_id: 'nope' });
expect('a body with no trip id is refused', [r.status, r.body], [400, { error: 'no-id' }]);
r = await post({ trip_id: id(1) }, { found: null });
expect('a trip the caller cannot read is not found, and Samsara is not asked', [r.status, r.body, r.calls], [404, { error: 'not-found' }, 0]);
r = await post({ trip_id: id(1) }, { keyed: false, found: three });
expect('with no Samsara key it says so', [r.status, r.body, r.calls], [503, { error: 'no-key' }, 0]);
r = await post({ trip_id: id(1) }, { found: three });
expect('a trip is answered with each bus and the farthest', [r.status, r.body.actual, r.body.buses.length], [200, 400, 3]);

console.log(failed ? `\n  ${failed} fault(s) in samsara-miles` : '');
process.exit(failed ? 1 : 0);
