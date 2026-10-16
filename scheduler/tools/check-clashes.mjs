// Runs clashes.js, what stands in a bus's or a driver's way on a leg,
// against invented trips: a trip on the same days, time off, days out, a
// trip the day before or after and the rest between, the order drivers are
// asked in and picked in, and a licence or medical card that runs out.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const window = {};
for (const f of ['../requirements.js', '../leg-facts.js', '../week.js', '../clashes.js']) {
  runInNewContext(readFileSync(new URL(f, import.meta.url), 'utf8'), { window, Intl, Date });
}
const { REST_HOURS, restBetween, fitFor, rankDrivers, autoPicks, cardLapse, standing } = window.SchedulerClashes;
const { legsOf } = window.SchedulerWeek;

let failed = 0;
function expect(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`}`);
}

/* A trip of one leg: its dates, the yard out and back, and its buses, each
   [assignment id, bus id, driver ids...]. */
let made = 0;
function trip({ from, to = from, out = '08:00', back = '18:00', dest = `Trip ${++made}`, buses = [] }) {
  return {
    id: `t-${dest}`, destination: dest, start_date: from, end_date: to, trip_type: 'round_trip',
    trip_stops: [
      { leg: 'outbound', position: 0, type: 'pickup', depart_prev: out },
      { leg: 'outbound', position: 1, type: 'return', depart_prev: back, arrive: back },
    ],
    trip_assignments: buses.map(([id, bus, ...drivers]) => ({
      id, bus_id: bus, leg: 'outbound', active_roles: null,
      trip_drivers: drivers.map((d, i) => ({ driver_id: d, role: i ? 'co_driver' : 'driver' })),
    })),
  };
}
const legOf = t => legsOf(t)[0];
const fit = (trips, range, { off = [], oos = [], skip = {} } = {}) => fitFor({ trips, off, oos }, range, skip);
const said = (map, id) => map.get(id) ?? [];

// The leg every case asks about: Wednesday 14 October, 8 to 6.
const mine = legOf(trip({ from: '2026-10-14', dest: 'Mine' }));

// ── what is in the way ──────────────────────────────────────────────────────
let f = fit([trip({ from: '2026-10-13', to: '2026-10-15', dest: 'Austin', buses: [['a1', 'b1', 'd1', 'd2']] })], mine);
expect('a trip over the same days takes its bus and both drivers',
  [said(f.buses, 'b1'), said(f.drivers, 'd1'), said(f.drivers, 'd2')],
  [['On trip Austin'], ['On trip Austin'], ['On trip Austin']]);
f = fit([], mine, { off: [{ driver_id: 'd3', start_date: '2026-10-14', end_date: '2026-10-16' }],
  oos: [{ bus_id: 'b4', start_date: '2026-10-10', end_date: '2026-10-14' }] });
expect('time off takes a driver and days out a bus', [said(f.drivers, 'd3'), said(f.buses, 'b4')], [['Time off'], ['Out of service']]);
f = fit([trip({ from: '2026-10-14', dest: 'Austin', buses: [['a1', 'b1', 'd1']] })], mine, { skip: { tripId: 't-Austin' } });
expect('the trip being edited is left out', [f.buses.size, f.drivers.size], [0, 0]);
f = fit([trip({ from: '2026-10-14', dest: 'Austin', buses: [['a1', 'b1', 'd1'], ['a2', 'b2', 'd2']] })], mine, { skip: { assignmentId: 'a1' } });
expect('the bar\'s own bus is left out, and the trip\'s other bus is not', [said(f.buses, 'b1'), said(f.buses, 'b2')], [[], ['On trip Austin']]);
const noCo = trip({ from: '2026-10-14', dest: 'Austin', buses: [['a1', 'b1', 'd1', 'd2']] });
noCo.trip_assignments[0].active_roles = ['driver:confirmed'];
f = fit([noCo], mine);
expect('a driver in a role turned off is not on the trip', [said(f.drivers, 'd1'), said(f.drivers, 'd2')], [['On trip Austin'], []]);

// ── the day before and the day after ────────────────────────────────────────
f = fit([trip({ from: '2026-10-13', back: '18:00', dest: 'Dallas', buses: [['a1', 'b1', 'd1']] })], mine);
expect('a trip back the evening before is back-to-back, with its rest, and not tight',
  [f.buses.size, said(f.near, 'd1'), f.tight.has('d1')], [0, ['Back-to-back with Dallas, 14h rest'], false]);
f = fit([trip({ from: '2026-10-13', back: '23:30', dest: 'Dallas', buses: [['a1', 'b1', 'd1']] })], mine);
expect('back late the night before is under the rest a driver needs', [said(f.near, 'd1'), f.tight.has('d1')],
  [['Back-to-back with Dallas, 8.5h rest'], true]);
f = fit([trip({ from: '2026-10-15', out: '05:00', dest: 'Waco', buses: [['a1', 'b1', 'd1']] })], mine);
expect('a trip leaving early the morning after is back-to-back too', [said(f.near, 'd1'), f.tight.has('d1')],
  [['Back-to-back with Waco, 11h rest'], false]);
f = fit([trip({ from: '2026-10-13', back: null, dest: 'Dallas', buses: [['a1', 'b1', 'd1']] })], mine);
expect('a rest that cannot be told is tight', [said(f.near, 'd1'), f.tight.has('d1')], [['Back-to-back with Dallas, rest unknown'], true]);

// ── by the clock ────────────────────────────────────────────────────────────
const on14 = (out, back, dest) => trip({ from: '2026-10-14', out, back, dest, buses: [['a1', 'b1', 'd1']] });
const sits = t => { const r = fit([t], mine); return r.buses.size ? 'clash' : said(r.near, 'd1')[0] ?? 'free'; };
expect('a run that morning, back before this one leaves, is back-to-back, not a clash',
  sits(on14('05:00', '07:30', 'School')), 'Back-to-back with School, 0.5h rest');
expect('a run that evening, leaving after this one is back, is back-to-back', sits(on14('19:00', '23:00', 'Game')), 'Back-to-back with Game, 1h rest');
expect('a run in the middle of the day clashes', sits(on14('12:00', '15:00', 'Lunch')), 'clash');
expect('a run that day with no times clashes, because unknown is not fine', sits(on14(null, null, 'Unknown')), 'clash');
expect('a two-day trip back the morning this one leaves, before it leaves, is back-to-back',
  sits(trip({ from: '2026-10-13', to: '2026-10-14', back: '07:00', dest: 'Houston', buses: [['a1', 'b1', 'd1']] })), 'Back-to-back with Houston, 1h rest');
expect('the same trip back after this one leaves clashes',
  sits(trip({ from: '2026-10-13', to: '2026-10-14', back: '09:00', dest: 'Houston', buses: [['a1', 'b1', 'd1']] })), 'clash');
expect('a trip leaving the evening this one is back, after it is back, is back-to-back',
  sits(trip({ from: '2026-10-14', to: '2026-10-16', out: '20:00', dest: 'Denver', buses: [['a1', 'b1', 'd1']] })), 'Back-to-back with Denver, 2h rest');
expect('a trip over a day this one runs through, past its edges, clashes',
  sits(trip({ from: '2026-10-12', to: '2026-10-16', dest: 'Denver', buses: [['a1', 'b1', 'd1']] })), 'clash');

// ── who to ask ──────────────────────────────────────────────────────────────
const D = (id, priority, extra = {}) => ({ id, name: id, priority, ...extra });
f = fit([
  trip({ from: '2026-10-14', dest: 'Austin', buses: [['a1', 'b1', 'busy']] }),
  trip({ from: '2026-10-13', back: '23:30', dest: 'Dallas', buses: [['a2', 'b2', 'tight']] }),
  trip({ from: '2026-10-13', back: '17:00', dest: 'Tyler', buses: [['a3', 'b3', 'rested']] }),
  trip({ from: '2026-10-01', to: '2026-10-03', dest: 'Laredo', buses: [['a4', 'b4', 'worked']] }),
], mine);
const ranked = rankDrivers([D('busy', 1), D('tight', 1), D('rested', 1), D('worked', 1), D('free', 1), D('later', 2)], f);
expect('free first, by priority, then a rested back-to-back, then a tight one; the day-counted last in their tier',
  ranked.map(r => r.d.id), ['free', 'worked', 'rested', 'tight', 'later', 'busy']);
expect('a driver\'s days in the last four weeks are counted', ranked.find(r => r.d.id === 'worked').days, 3);
expect('an automatic pick takes every free driver with no trip beside first, then a rested one, never a tight or busy one',
  autoPicks(ranked).map(r => r.d.id), ['free', 'worked', 'later', 'rested']);

// ── rest ────────────────────────────────────────────────────────────────────
const leg = (from, to, depart, back, backDays = 0) => ({ from, to, depart, back, backDays });
expect('rest is from the yard return to the next departure', restBetween(leg('2026-10-13', '2026-10-13', '08:00', '20:00'), leg('2026-10-14', '2026-10-14', '06:00', '18:00')), 10);
expect('a return past midnight is on the day after the leg\'s last', restBetween(leg('2026-10-12', '2026-10-13', '08:00', '01:00', 1), leg('2026-10-14', '2026-10-14', '06:00', '18:00')), 5);
expect('a missing time is unknown', restBetween(leg('2026-10-13', '2026-10-13', '08:00', null), mine), null);
expect('the rest a driver needs is ten hours', REST_HOURS, 10);

// ── cards ───────────────────────────────────────────────────────────────────
const lapse = (lic, med) => cardLapse({ license_exp: lic, med_card_expiry: med }, mine);
expect('a card lasting the trip says nothing', lapse('2027-01-01', '2026-10-14'), '');
expect('a card out before the trip has expired', lapse('2026-10-01', null), 'Licence expired Oct 1, 2026');
expect('both cards are said', lapse('2026-10-01', '2026-10-13').split(' · ').length, 2);
expect('no date on file says nothing', lapse(null, ''), '');

// ── the standing rule ───────────────────────────────────────────────────────
const saved = trip({ from: '2026-10-14', dest: 'Saved', buses: [['s1', 'b1', 'd1', 'd2']] });
const read = {
  busesById: new Map([['b1', { number: '897' }]]),
  driversById: new Map([['d1', { name: 'Rigoberto Gomez', short_name: 'Rigo', status: 'active', license_exp: '2026-10-10' }],
    ['d2', { name: 'Ana Ruiz', status: 'inactive' }]]),
};
const around = { trips: [saved, trip({ from: '2026-10-14', out: '12:00', back: '15:00', dest: 'Lunch', buses: [['x1', 'b1', 'd9']] })],
  off: [{ driver_id: 'd1', start_date: '2026-10-14', end_date: '2026-10-14' }], oos: [] };
expect('a saved leg says each thing in its way, by the bus\'s number and the driver\'s name',
  standing(saved, 'outbound', around, read).map(c => c.words),
  ['Bus 897: On trip Lunch', 'Rigo: Time off', 'Rigo: Licence expired Oct 10, 2026', 'Ana Ruiz: Inactive']);
expect('each thing names its assignment and driver', standing(saved, 'outbound', around, read).map(c => [c.assignmentId, c.driverId]),
  [['s1', null], ['s1', 'd1'], ['s1', 'd1'], ['s1', 'd2']]);
expect('a placeholder raises nothing on itself', standing({ ...saved, trip_bar_color: 'amber' }, 'outbound', around, read), []);
const blocking = { ...around, trips: [saved, { ...trip({ from: '2026-10-14', dest: 'Hold', buses: [['h1', 'b1']] }), trip_bar_color: 'amber' }], off: [] };
expect('and still stands in another trip\'s way', standing(saved, 'outbound', blocking, read).map(c => c.words)[0], 'Bus 897: On trip Hold');
expect('its own trip is never in its way', standing(saved, 'outbound', { trips: [saved], off: [], oos: [] }, { driversById: new Map() }), []);

console.log(failed ? `\n  ${failed} fault(s) in clashes` : '\n  clashes: every case passed');
process.exit(failed ? 1 : 0);
