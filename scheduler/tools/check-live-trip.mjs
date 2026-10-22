// Runs live-trip.js, what a bus out on its leg is warned of, against sample
// buses on Friday 16 October 2026, when 14:30 UTC is 9:30 AM at the office:
// each of the five warnings, what keeps each quiet, their order, and where
// the bus is when nothing is wrong. road.js is loaded beside it, as the board
// loads it, and Late to spot is also read from a bus's path through it.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const window = {};
const context = { window, Intl, Date, Math, Number, String, Map, Set, Array, JSON, Promise };
for (const file of ['past-midnight.js', 'road.js', 'live-trip.js']) {
  runInNewContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), context);
}
const { warningsOf, phaseOf, watching } = window.SchedulerLiveTrip;
const Road = window.SchedulerRoad;
const { MARGIN } = Road;

let failed = 0;
function expect(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`}`);
}

const at = clock => Date.parse(`2026-10-16T${clock}:00Z`);
const MIN = 60e3, HOUR = 3600e3;
const yard = [26.2034, -98.2300];
const away = [26.3000, -98.1000];
const yardOut = at('14:30');
const stops = [
  { key: 'p', type: 'pickup', name: 'Lakeview High School', point: [26.25, -98.2], due: at('15:00') },
  { key: 's', type: 'stop', name: 'Alamodome', point: [29.41, -98.48], due: at('19:30') },
  { key: 'y', type: 'return', name: 'Yard', point: yard, due: at('23:59') },
];
const ahead = (over = {}) => ({ stops, where: { reached: -1, at: false, next: 0 }, stop: stops[0], at: false, arrival: null, late: 0, ...over });
const driver = (id, name, over = {}) => ({ driver_id: id, name, duty: 'driving', left_ms: 9 * HOUR, wheel: true, ...over });
const bus = (over = {}) => ({ bus_id: 'b218', engine: 'on', engine_at: null, lat: away[0], lng: away[1], drivers: [driver('d1', 'Marco Ruiz')], ...over });
const look = over => ({ yard, yardOut, next: ahead(), named: ['d1'], others: [], numberOf: id => ({ b746: '746' })[id] ?? null, drives: [], now: at('14:45'), ...over, bus: over.bus ?? bus() });
const kinds = l => warningsOf(l).map(w => w.kind);

console.log('\n  Not rolling');
const offAtYard = bus({ engine: 'off', engine_at: '2026-10-16T12:40:00Z', lat: yard[0], lng: yard[1] });
expect('engine off at the yard five minutes before yard-out warns',
  warningsOf(look({ bus: offAtYard, now: at('14:25') })).map(w => [w.title, w.detail]), [['Not rolling', 'Engine off 1h · out 9:30a']]);
expect('fifteen minutes before yard-out says nothing yet', kinds(look({ bus: offAtYard, now: at('14:15') })), []);
expect('idling at the yard before yard-out is warming up, not a warning',
  kinds(look({ bus: bus({ engine: 'idle', lat: yard[0], lng: yard[1] }), now: at('14:25') })), []);
expect('still at the yard after yard-out warns, whatever the engine does',
  warningsOf(look({ bus: bus({ engine: 'idle', lat: yard[0], lng: yard[1] }) })).map(w => w.detail), ['Still at the yard · out 9:30a']);
expect('away from the yard after yard-out says nothing', kinds(look({})), []);
expect('engine off at a stop it has reached says nothing',
  kinds(look({ bus: bus({ engine: 'off' }), next: ahead({ where: { reached: 0, at: true, next: 1 }, stop: stops[0], at: true }) })), []);
expect('with no yard point, an engine off after yard-out still warns', kinds(look({ bus: bus({ engine: 'off' }), yard: null })), ['notRolling']);
expect('with no yard point, a running engine after yard-out says nothing', kinds(look({ yard: null })), []);

console.log('\n  Wrong bus');
const in746 = { bus_id: 'b746', drivers: [driver('d1', 'Lena Garza')] };
const lena = bus({ drivers: [] });
expect('a driver the bar names logged into another bus warns',
  warningsOf(look({ bus: lena, others: [in746] })).map(w => [w.title, w.detail]), [['Wrong bus', 'Lena is logged into 746']]);
expect('it names the driver and the other bus, for the crew\'s mark',
  warningsOf(look({ bus: lena, others: [in746] })).map(w => [w.driver, w.bus]), [['d1', '746']]);
expect('the driver in this bus as well says nothing', kinds(look({ bus: bus(), others: [in746] })), []);
expect('before the ten minutes ahead of yard-out says nothing', kinds(look({ bus: lena, others: [in746], now: at('13:00') })), []);

console.log('\n  Late to spot');
const late = ahead({ arrival: at('15:19'), late: 19 });
expect('the pickup reached 19 minutes after its spot warns',
  warningsOf(look({ next: late })).map(w => [w.title, w.detail]), [['Late to spot', '~19 min · spot 10:00a']]);
expect('late to a stop that is not the pickup is not this warning',
  kinds(look({ next: ahead({ stop: stops[1], arrival: at('20:00'), late: 30, where: { reached: 0, at: false, next: 1 } }) })), []);
expect('at the pickup says nothing', kinds(look({ next: ahead({ at: true, late: 19, where: { reached: 0, at: true, next: 1 } }) })), []);

/* From a path, as the board reads a bar: where the bus is on its leg, and
   its next stop with when it gets there, a drive of `min` minutes from now. */
const nextOn = (path, now, min) => {
  const where = Road.whereOn(stops, path, null, now);
  if (where.at) return { stops, where, stop: stops[where.reached], at: true };
  if (where.next < 0) return { stops, where, stop: null };
  const stop = stops[where.next], arrival = now + min * MIN;
  return { stops, where, stop, at: false, arrival, late: Road.lateBy(stop, arrival) };
};
const pin = stops[0].point;
const MI = 1 / 69.05;
const lot = [pin[0] + 0.8 * MI, pin[1]];
const p = (point, clock) => [point[0], point[1], at(clock)];
// Out of the yard, north, then east into a lot 0.8 mi north of the pin; Samsara's
// point every five minutes while it sits, then north at a mile a minute.
const loadedAndGone = [p(yard, '14:20'), p([lot[0] - 2 * MI, yard[1]], '14:32'), p([lot[0], yard[1]], '14:34'), p([lot[0], -98.215], '14:35'),
  ...['14:36', '14:40', '14:45', '14:50', '14:55', '15:00', '15:05', '15:10', '15:15', '15:20'].map(c => p(lot, c)),
  ...[1, 2, 3, 4, 5].map(m => p([lot[0] + m * MI, lot[1]], `15:2${m}`))];
const gone = look({ next: nextOn(loadedAndGone, at('15:26'), 270), now: at('15:26') });
expect('a bus that loaded at a lot 0.8 mi from the pin and drove off at highway speed is not late to its spot',
  [kinds(gone), phaseOf(gone).title], [[], 'To Alamodome']);
// Along the road from the yard to the pin, held up six minutes 1.2 mi short of it after its spot.
const along = f => [yard[0] + (pin[0] - yard[0]) * f, yard[1] + (pin[1] - yard[1]) * f];
const heldUp = [p(yard, '14:20'), p(along(0.2), '14:40'), p(along(0.45), '14:50'),
  p(along(0.677), '15:02'), p(along(0.677), '15:05'), p(along(0.677), '15:08'), p(along(0.839), '15:10')];
expect('a bus held up a mile short of the pickup after its spot is still late to it',
  warningsOf(look({ next: nextOn(heldUp, at('15:10'), 4), now: at('15:10') })).map(w => [w.title, w.detail]), [['Late to spot', '~14 min · spot 10:00a']]);

console.log('\n  Short on hours');
const rosa = bus({ drivers: [driver('d1', 'Rosa Peña', { left_ms: HOUR + 10 * MIN })] });
const toAlamo = ahead({ stop: stops[1], arrival: at('15:15'), where: { reached: 0, at: false, next: 1 } });
expect('hours left under the drive to the next rest warn',
  warningsOf(look({ bus: rosa, next: toAlamo, drives: [{}, { min: 270 }, { min: 300 }], now: at('14:45') })).map(w => w.detail),
  ['Rosa 1:10 left · 5:30 to drive']);
expect('a wait counted as rest at the next stop ends the drive there',
  kinds(look({ bus: rosa, next: toAlamo, drives: [{}, { min: 270, rest: true }, { min: 300 }], now: at('14:45') })), []);
expect('a co-driver\'s hours count with the driver\'s',
  kinds(look({ bus: bus({ drivers: [driver('d1', 'Rosa Peña', { left_ms: HOUR + 10 * MIN }), driver('d2', 'Ben Ochoa', { wheel: false, left_ms: 5 * HOUR })] }),
    next: toAlamo, drives: [{}, { min: 270 }, { min: 300 }], now: at('14:45') })), []);
expect('no driver at the wheel says nothing', kinds(look({ bus: bus({ drivers: [driver('d1', 'Rosa Peña', { wheel: false, left_ms: 0 })] }), next: toAlamo })), []);

console.log('\n  Stop lamp');
expect('the red stop lamp warns, its first code the words and every code in the sentence',
  warningsOf(look({ bus: bus({ fault: 'stop', faults: ['Coolant temperature high', 'Oil pressure low'] }) })).map(w => [w.kind, w.tone, w.detail, w.sentence]),
  [['stopLamp', 'error', 'Coolant temperature high', "The engine's red stop lamp is on: Coolant temperature high; Oil pressure low."]]);
expect('with no codes it says the lamp is on', warningsOf(look({ bus: bus({ fault: 'stop', faults: [] }) })).map(w => w.detail), ['Engine stop lamp on']);
expect('an amber warning lamp is not this warning', kinds(look({ bus: bus({ fault: 'check', faults: ['Check engine lamp'] }) })), []);

console.log('\n  Order and phase');
expect('the worst comes first',
  kinds(look({ bus: bus({ engine: 'off', fault: 'stop', drivers: [driver('d1', 'Rosa Peña', { left_ms: 0 })] }), yard: null, next: late, now: at('14:45') })),
  ['stopLamp', 'notRolling', 'lateToSpot', 'shortOnHours']);
expect('on the way to a stop', phaseOf(look({ next: ahead({ arrival: at('14:55') }) })), { title: 'To Lakeview High School', detail: '~9:55a' });
expect('at a stop', phaseOf(look({ next: ahead({ at: true, where: { reached: 0, at: true, next: 1 } }) })), { title: 'At Lakeview High School', detail: '' });
expect('on the way back', phaseOf(look({ next: ahead({ stop: stops[2], where: { reached: 1, at: false, next: 2 } }) })), { title: 'To the yard', detail: '' });
expect('a bar counts as out from ten minutes before yard-out, engine or not',
  [watching(bus({ engine: 'off' }), [yardOut - MARGIN, at('23:59') + MARGIN], at('14:25')),
    watching(bus({ engine: 'off' }), [yardOut - MARGIN, at('23:59') + MARGIN], at('14:15')),
    watching(null, [yardOut - MARGIN, at('23:59') + MARGIN], at('14:25'))], [true, false, false]);

console.log(failed ? `\n  ${failed} fault(s) in live trip` : '\n  live trip: every case passed');
process.exit(failed ? 1 : 0);
