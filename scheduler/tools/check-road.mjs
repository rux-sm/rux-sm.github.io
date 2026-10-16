// Runs road.js, which says where a bus out on its trip is on its leg, against
// invented legs and invented GPS paths: when each stop is due, which stops a
// path has reached, what is next, when a bus is late, how often an arrival
// is asked, and how a path is kept between answers. Places are made-up
// points along one line of latitude, about a mile apart.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const window = {};
for (const f of ['../week.js', '../road.js']) runInNewContext(readFileSync(new URL(f, import.meta.url), 'utf8'), { window, Intl, Date });
const { stopsOf, whereOn, clockOf, lateBy, arrivals, live } = window.SchedulerRoad;
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

// Late.
expect('an instant reads on the office\'s clock', [clockOf(T('2026-10-15', '17:05')), clockOf(T('2026-12-15', '00:40'))], ['17:05', '00:40']);
expect('ten minutes after it is due is on time', lateBy(T('2026-10-15', '17:30'), T('2026-10-15', '17:40')), 0);
expect('eleven minutes after is late by eleven', lateBy(T('2026-10-15', '17:30'), T('2026-10-15', '17:41')), 11);
expect('early is on time', lateBy(T('2026-10-15', '17:30'), T('2026-10-15', '17:00')), 0);
expect('no time due is never late', lateBy(null, T('2026-10-15', '17:00')), 0);

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
