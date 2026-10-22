// Runs road.js, which says where a bus out on its trip is on its leg, against
// invented legs and invented GPS paths: when each stop is due, which stops a
// path has reached, what is next, when a bus is late, how often an arrival
// is asked, and how a path is kept between answers. Places are made-up
// points along one line of latitude, about a mile apart.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const window = {};
for (const f of ['../trip-shape.js', '../past-midnight.js', '../week.js', '../road.js']) runInNewContext(readFileSync(new URL(f, import.meta.url), 'utf8'), { window, Intl, Date });
const { stopsOf, whereOn, clockOf, lateBy, pickupLate, arrivals, live } = window.SchedulerRoad;
const { officeInstant } = window.SchedulerWeek;

let failed = 0;
function expect(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`}`);
}

// A point `m` miles east of the yard.
const LAT = 26.2, YARD_LNG = -98.2, MILE = 1 / (69.17 * Math.cos(LAT * Math.PI / 180));
const at = m => [LAT, YARD_LNG + m * MILE];
const place = m => ({ lat: LAT, lng: YARD_LNG + m * MILE });
const T = (day, time) => officeInstant(day, time);

// A day trip: the yard, a pickup 5 miles on, a stop 20 on, a stop with no
// point, the group let off back at the pickup, the yard. Times only on some
// rows, one past midnight.
const day = {
  start_date: '2026-10-15', end_date: '2026-10-15', trip_type: 'round_trip',
  trip_stops: [
    { id: 'p', leg: 'outbound', position: 0, type: 'pickup', name: 'Pickup school', ...place(5), depart_prev: '16:00', spot: '16:30', spot_date: '2026-10-15' },
    { id: 's1', leg: 'outbound', position: 1, type: 'stop', name: 'Arena', ...place(20), depart_prev: '16:45', arrive: '17:30' },
    { id: 's2', leg: 'outbound', position: 2, type: 'stop', name: 'Rest stop', lat: null, lng: null, depart_prev: '20:00', arrive: '20:10' },
    { id: 's3', leg: 'outbound', position: 3, type: 'stop', name: 'Pickup school', ...place(5), depart_prev: '22:30', arrive: '23:50' },
    { id: 'y', leg: 'outbound', position: 4, type: 'return', name: 'Escamilla yard', ...place(0), depart_prev: '23:50', arrive: '00:20' },
  ],
};
const stops = stopsOf(day, 'outbound');
expect('a leg runs from the pickup to the yard, the yard named Yard',
  stops.map(s => s.name), ['Pickup school', 'Arena', 'Rest stop', 'Pickup school', 'Yard']);
expect('the pickup is due at its Spot, a stop at its Arrives, a time earlier on the clock the next day',
  stops.map(s => s.due), [T('2026-10-15', '16:30'), T('2026-10-15', '17:30'), T('2026-10-15', '20:10'),
    T('2026-10-15', '23:50'), T('2026-10-16', '00:20')]);
// The same trip read with its legs: its stops are found by the leg's id or by its old word, and a leg it lacks has none.
const shaped = { ...day, trip_legs: [{ id: 'l1', leg: 'outbound', start_date: '2026-10-15', end_date: '2026-10-15', trip_routes: [{ id: 'r1', position: 1 }] }],
  trip_stops: day.trip_stops.map(x => ({ ...x, route_id: 'r1' })) };
expect('a leg read with its legs has the same stops by its id or its word, and a leg it lacks none',
  [stopsOf(shaped, 'l1').map(x => [x.name, x.due]), stopsOf(shaped, 'outbound').length, stopsOf(shaped, 'l9')],
  [stops.map(x => [x.name, x.due]), 5, []]);
expect('a stop with no place has no point', stops.map(s => !!s.point), [true, true, false, true, true]);

// Paths: the bus waits at the yard, drives on a mile a minute.
const path = (from, legs) => {
  const out = [];
  let ms = from;
  for (const [a, b] of legs) {
    const step = a < b ? 1 : -1;
    for (let m = a; step > 0 ? m <= b : m >= b; m += step) { out.push([...at(m), ms]); ms += 60e3; }
  }
  return out;
};
const where = p => { const w = whereOn(stops, p); return [w.reached, w.at, w.next]; };
const yardOut = T('2026-10-15', '15:50');
expect('at the yard, nothing is reached and the pickup is next', where(path(yardOut, [[0, 0]])), [-1, false, 0]);
expect('at the pickup, the bus is at it', where(path(yardOut, [[0, 5]])), [0, true, 1]);
expect('on its way to the arena, the arena is next', where(path(yardOut, [[0, 12]])), [0, false, 1]);
const toArena = path(yardOut, [[0, 20]]);
expect('at the arena; the rest stop has no point, so the pickup again is next', where(toArena), [1, true, 3]);
const back = [...toArena, ...path(toArena.at(-1)[2] + 6 * 3600e3, [[20, 5]])];
expect('back at the pickup after the game, it is reached again', where(back), [3, true, 4]);
const home = [...back, ...path(back.at(-1)[2] + 3600e3, [[5, 0]])];
expect('home at the yard, every stop is reached and none is next', where(home), [4, true, -1]);
expect('waiting at the pickup does not reach the time it comes back there',
  where([...path(yardOut, [[0, 5]]), ...path(yardOut + 20 * 60e3, [[5, 5], [5, 5], [5, 5]])]), [0, true, 1]);

const lateStart = path(T('2026-10-15', '18:00'), [[20, 20], [20, 12]]);
expect('a stop due before the path begins is taken as reached', where(lateStart), [1, false, 3]);

// A bus that drives past the arena hours before it is due has not reached it.
const early = { ...day, trip_stops: day.trip_stops.map(s => (s.id === 's1' ? { ...s, ...place(8) } : s.id === 'p' ? { ...s, ...place(12) } : s)) };
const earlyStops = stopsOf(early, 'outbound');
const pastEarly = path(T('2026-10-15', '14:40'), [[0, 12]]);
expect('a stop passed more than two hours before it is due is not reached',
  [whereOn(earlyStops, pastEarly).reached, whereOn(earlyStops, pastEarly).next], [0, 1]);

// A short trip whose yard return is due soon after it leaves.
const short = { start_date: '2026-10-15', end_date: '2026-10-15', trip_type: 'one_way', trip_stops: [
  { id: 'p', leg: 'outbound', position: 0, type: 'pickup', name: 'Church', ...place(3), depart_prev: '16:49', spot: '17:15', spot_date: '2026-10-15' },
  { id: 'd', leg: 'outbound', position: 1, type: 'stop', name: 'Birding center', ...place(9), arrive: '18:00', arrive_date: '2026-10-15' },
  { id: 'y', leg: 'outbound', position: 2, type: 'return', name: 'Yard', ...place(0), arrive: '18:36', arrive_date: '2026-10-15' },
] };
const shortStops = stopsOf(short, 'outbound');
const pullOut = path(T('2026-10-15', '16:45'), [[0, 0], [0, 2]]);
expect('a yard return due soon is not reached as the bus pulls out', [whereOn(shortStops, pullOut).reached, whereOn(shortStops, pullOut).next], [-1, 0]);

// A bus parked short of a pickup pin that is not where it loads.
const toNear = path(yardOut, [[0, 4]]);
const parkedAt = (m, ms, n) => Array.from({ length: n }, (_, i) => [...at(m), ms + i * 60e3]);
const near = (p, bus) => { const w = whereOn(stops, p, bus); return [w.reached, w.at, w.next]; };
const shy = 5 - 0.4;
const stopped = [...path(yardOut, [[0, 4]]), [...at(shy), toNear.at(-1)[2] + 30e3]];
expect('a bus that stands still for two minutes within half a mile of the pickup is at it',
  near([...stopped, ...parkedAt(shy, stopped.at(-1)[2] + 60e3, 2)]), [0, true, 1]);
expect('a bus stopped there only a minute is not yet',
  near([...stopped, ...parkedAt(shy, stopped.at(-1)[2] + 60e3, 1).map(p => [p[0], p[1], p[2] - 30e3])]), [-1, false, 0]);
expect('a bus parked with no new points counts its wait from its reading',
  near(stopped, { lat: at(shy)[0], lng: at(shy)[1], engine: 'idle', mph: 0, seen: new Date(stopped.at(-1)[2] + 5 * 60e3).toISOString() }), [0, true, 1]);
expect('a bus still driving past at that distance is not',
  near(stopped, { lat: at(shy)[0], lng: at(shy)[1], engine: 'on', mph: 30, seen: new Date(stopped.at(-1)[2] + 5 * 60e3).toISOString() }), [-1, false, 0]);
// As Samsara sends it: a point as the bus pulls into the lot, then none for over an hour, the next a little way on.
const pulledIn = [...path(yardOut, [[0, 4]]), [...at(shy - 0.1), toNear.at(-1)[2] + 20e3], [...at(shy), toNear.at(-1)[2] + 80 * 60e3]];
expect('two points a little apart with a long quiet between them are a bus parked', near(pulledIn), [0, true, 1]);
const idleSince = toNear.at(-1)[2] + 60e3;
const idling = { lat: at(shy)[0], lng: at(shy)[1], engine: 'idle', engine_at: new Date(idleSince).toISOString(), mph: 0, seen: new Date(idleSince).toISOString() };
expect('a bus idling there over two minutes is at the pickup before Samsara sends another point',
  [whereOn(stops, toNear, idling, idleSince + 3 * 60e3).at, whereOn(stops, toNear, idling, idleSince + 60e3).at], [true, false]);
const parkedFar = 5 - 0.7;
expect('a bus parked further than half a mile is not at the pickup',
  near([...path(yardOut, [[0, 4]]), ...parkedAt(parkedFar, toNear.at(-1)[2] + 60e3, 5)]), [-1, false, 0]);
const loadedAndGone = [...stopped, ...parkedAt(shy, stopped.at(-1)[2] + 60e3, 5), ...path(stopped.at(-1)[2] + 10 * 60e3, [[5, 12]])];
expect('once it drives on, the pickup is behind it and the arena is next', near(loadedAndGone), [0, false, 1]);
expect('a stop that is not a pickup still needs the quarter mile',
  [whereOn(stops, [...toArena.slice(0, 20), ...parkedAt(20 - 0.4, toArena[19][2] + 60e3, 5)]).reached], [0]);

// A bus that loads at a lot 0.8 mi north of the pickup's pin, and drives on north.
const NORTH = 1 / 69.05;
const lot = [LAT + 0.8 * NORTH, at(5)[1]];
const north = (m, ms) => [lot[0] + m * NORTH, lot[1], ms];
const toLot = [...path(yardOut, [[0, 4]]), [LAT + 0.4 * NORTH, at(4.5)[1], yardOut + 5 * 60e3], [...lot, yardOut + 6 * 60e3]];
// Samsara's points from a bus that sits: one every five minutes, from 16:00 to past its 16:30 spot.
const sat = (from, n, every = 5) => Array.from({ length: n }, (_, i) => [...lot, from + i * every * 60e3]);
const loaded = [...toLot, ...sat(T('2026-10-15', '16:00'), 9)];
const off = loaded.at(-1)[2];
expect('a bus standing at a lot 0.8 mi from the pickup is not at it', near(loaded), [-1, false, 0]);
expect('driving off from there, it has not passed the pickup a mile and a half off',
  near([...loaded, north(1, off + 60e3)]), [-1, false, 0]);
expect('once it is two and a half miles off at highway speed, the pickup is behind it and the arena is next',
  near([...loaded, north(1, off + 60e3), north(2, off + 2 * 60e3), north(3, off + 3 * 60e3)]), [0, false, 1]);
expect('a bus that stood there only three minutes, as at a light, and drove on has not passed it',
  near([...toLot, [...lot, yardOut + 9 * 60e3], north(2, yardOut + 10 * 60e3), north(4, yardOut + 12 * 60e3)]), [-1, false, 0]);
expect('a bus driving by 0.8 mi off without stopping has not passed it',
  near([...path(yardOut, [[0, 4]]), ...[0, 1, 2, 3, 4].map(m => north(m, yardOut + (5 + m) * 60e3))]), [-1, false, 0]);
expect('a bus that stood there before the pickup\'s two hours has not passed it',
  near([...toLot.map(p => [p[0], p[1], p[2] - 3 * 3600e3]), ...sat(T('2026-10-15', '13:00'), 4), north(3, T('2026-10-15', '13:20'))]), [-1, false, 0]);
// A late bus held up six minutes in traffic 1.2 mi short of the pickup, then on toward it.
const heldUp = [...path(yardOut, [[0, 3]]), ...parkedAt(3.8, yardOut + 4 * 60e3, 7)];
expect('a late bus held up a mile short of the pickup, driving on toward it, still has it next',
  near([...heldUp, [...at(4.4), heldUp.at(-1)[2] + 60e3]]), [-1, false, 0]);
expect('and it is at the pickup when it gets there', near([...heldUp, [...at(4.4), heldUp.at(-1)[2] + 60e3], [...at(5), heldUp.at(-1)[2] + 2 * 60e3]]), [0, true, 1]);

// Late.
expect('an instant reads on the office\'s clock', [clockOf(T('2026-10-15', '17:05')), clockOf(T('2026-12-15', '00:40'))], ['17:05', '00:40']);
const pickup = due => ({ type: 'pickup', due });
expect('ten minutes after its spot is on time', lateBy(pickup(T('2026-10-15', '17:30')), T('2026-10-15', '17:40')), 0);
expect('eleven minutes after is late by eleven', lateBy(pickup(T('2026-10-15', '17:30')), T('2026-10-15', '17:41')), 11);
expect('early is on time', lateBy(pickup(T('2026-10-15', '17:30')), T('2026-10-15', '17:00')), 0);
expect('no spot is never late', lateBy(pickup(null), T('2026-10-15', '17:00')), 0);
expect('only a pickup is ever late', lateBy({ type: 'dropoff', due: T('2026-10-15', '17:30') }, T('2026-10-15', '20:30')), 0);
expect('a pickup reached at its Spot is on time', pickupLate(T('2026-10-15', '16:30'), T('2026-10-15', '16:30')), 0);
expect('a pickup reached a minute after is a minute late', pickupLate(T('2026-10-15', '16:30'), T('2026-10-15', '16:31')), 1);
expect('a pickup with no time due or no arrival says nothing', [pickupLate(null, 1), pickupLate(1, null)], [null, null]);

// Arrivals.
let clock = 0, asked = 0, changed = 0;
const settle = () => new Promise(r => setTimeout(r, 0));
const eta = arrivals(async () => { asked++; return 20; }, () => changed++, () => clock);
expect('the first ask has no arrival yet', eta.get('b1', stops[1], at(10)), null);
await settle();
expect('the answer comes, and the page is told', [eta.get('b1', stops[1], at(10)), asked, changed], [20 * 60e3, 1, 1]);
clock += 4 * 60e3;
eta.get('b1', stops[1], at(14));
await settle();
expect('within five minutes it is not asked again', asked, 1);
clock += 60e3;
eta.get('b1', stops[1], at(15));
await settle();
expect('after five minutes it is asked again from where the bus is', [asked, eta.get('b1', stops[1], at(15))], [2, 5 * 60e3 + 20 * 60e3]);
eta.get('b1', stops[3], at(20));
await settle();
expect('another stop is asked at once', asked, 3);
eta.get('b1', stops[1], at(20));
eta.get('b1', stops[3], at(20));
await settle();
expect('a bus out on two legs asks for each leg\'s stop once, not in turn on every draw', asked, 3);
expect('a stop or a bus with no point asks nothing', [eta.get('b2', stops[2], at(1)), eta.get('b2', stops[1], null), asked], [null, null, 3]);

// Paths kept between answers.
const sent = [];
const answers = [
  { buses: [{ bus_id: 'b1', path: [[1, 1, 100], [1, 2, 200]] }, { bus_id: 'b2' }] },
  { buses: [{ bus_id: 'b1', path: [[1, 2, 200], [1, 3, 300]] }] },
  { buses: [{ bus_id: 'b1', path: [[9, 9, 900]] }] },
];
const road = live({ functions: { invoke: async (name, { body }) => { sent.push(body); return { data: structuredClone(answers[sent.length - 1]) }; } } }, () => 3600e3);
let a = await road.ask({ b1: 50 });
expect('a bus out is asked its path from when its leg starts', [sent[0], a.buses[0].path.length, 'path' in a.buses[1]],
  [{ paths: { b1: new Date(50).toISOString() } }, 2, false]);
a = await road.ask({ b1: 50 });
expect('then from after its newest point, and a point it has is not kept twice',
  [sent[1].paths.b1, a.buses[0].path.map(p => p[2])], [new Date(201).toISOString(), [100, 200, 300]]);
a = await road.ask({ b1: 800 });
expect('a leg that starts at another time starts a new path', [sent[2].paths.b1, a.buses[0].path.map(p => p[2])],
  [new Date(800).toISOString(), [900]]);
await live({ functions: { invoke: async (n, { body }) => { sent.push(body); return { data: { buses: [] } }; } } }).ask({});
expect('with no bus out, no path is asked', sent.at(-1), {});
const far = live({ functions: { invoke: async (n, { body }) => { sent.push(body); return { data: { buses: [] } }; } } }, () => 20 * 3600e3);
await far.ask({ b1: 0 });
expect('a leg that left long ago is asked twelve hours back', sent.at(-1).paths.b1, new Date(8 * 3600e3).toISOString());

console.log(failed ? `\n  ${failed} fault(s) in road` : '\n  road: every case passed');
process.exit(failed ? 1 : 0);
