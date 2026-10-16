// Runs live-trip.js, what a bus out on its leg is warned of, against sample
// buses on Friday 16 October 2026, when 14:30 UTC is 9:30 AM at the office:
// each of the four warnings, what keeps each quiet, their order, and where
// the bus is when nothing is wrong. road.js is loaded beside it, as the board
// loads it.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const window = {};
const context = { window, Intl, Date, Math, Number, String, Map, Set, Array, JSON, Promise };
for (const file of ['road.js', 'live-trip.js']) {
  runInNewContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), context);
}
const { warningsOf, phaseOf, watching } = window.SchedulerLiveTrip;
const { MARGIN } = window.SchedulerRoad;

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
expect('the driver in this bus as well says nothing', kinds(look({ bus: bus(), others: [in746] })), []);
expect('before the ten minutes ahead of yard-out says nothing', kinds(look({ bus: lena, others: [in746], now: at('13:00') })), []);

console.log('\n  Late to spot');
const late = ahead({ arrival: at('15:19'), late: 19 });
expect('the pickup reached 19 minutes after its spot warns',
  warningsOf(look({ next: late })).map(w => [w.title, w.detail]), [['Late to spot', '~19 min · spot 10:00a']]);
expect('late to a stop that is not the pickup is not this warning',
  kinds(look({ next: ahead({ stop: stops[1], arrival: at('20:00'), late: 30, where: { reached: 0, at: false, next: 1 } }) })), []);
expect('at the pickup says nothing', kinds(look({ next: ahead({ at: true, late: 19, where: { reached: 0, at: true, next: 1 } }) })), []);

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

console.log('\n  Order and phase');
expect('the worst comes first',
  kinds(look({ bus: bus({ engine: 'off', drivers: [driver('d1', 'Rosa Peña', { left_ms: 0 })] }), yard: null, next: late, now: at('14:45') })),
  ['notRolling', 'lateToSpot', 'shortOnHours']);
expect('on the way to a stop', phaseOf(look({ next: ahead({ arrival: at('14:55') }) })), { title: 'To Lakeview High School', detail: '~9:55a' });
expect('at a stop', phaseOf(look({ next: ahead({ at: true, where: { reached: 0, at: true, next: 1 } }) })), { title: 'At Lakeview High School', detail: '' });
expect('on the way back', phaseOf(look({ next: ahead({ stop: stops[2], where: { reached: 1, at: false, next: 2 } }) })), { title: 'To the yard', detail: '' });
expect('a bar counts as out from ten minutes before yard-out, engine or not',
  [watching(bus({ engine: 'off' }), [yardOut - MARGIN, at('23:59') + MARGIN], at('14:25')),
    watching(bus({ engine: 'off' }), [yardOut - MARGIN, at('23:59') + MARGIN], at('14:15')),
    watching(null, [yardOut - MARGIN, at('23:59') + MARGIN], at('14:25'))], [true, false, false]);

console.log(failed ? `\n  ${failed} fault(s) in live trip` : '\n  live trip: every case passed');
process.exit(failed ? 1 : 0);
