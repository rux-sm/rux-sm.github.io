// Runs route-figures.js, the Route tab's and the Detailed itinerary's
// arithmetic, against sample legs and fails when a figure moves. The legs'
// times, dates, miles and waits are real trips' as saved; their places are
// letters, since only which rows share a place matters here. The figures
// wanted are what the Route tab showed for them.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const window = {};
for (const file of ['../trip-shape.js', '../route-figures.js']) {
  runInNewContext(readFileSync(new URL(file, import.meta.url), 'utf8'), { window });
}
const { fromStops, legFigures, roomInto, dropRoom, midnights, countsTo, stretches, nightDwell } = window.SchedulerRouteFigures;

let failed = 0;
function expect(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`}`);
}

// One saved row: [type, place, depart_prev, depart_prev_date, arrive, arrive_date, miles, drive, dwell, spot].
const rows = list => list.map(([type, place, dp, dpd, ar, ard, miles, drive, dwell, spot], position) => ({
  leg: 'outbound', position, type, name: place, address: place, lat: place ? 1 : null,
  depart_prev: dp, depart_prev_date: dpd, arrive: ar, arrive_date: ard,
  spot: spot ?? null, spot_date: spot ? dpd : null, miles, drive, dwell_status: dwell,
}));
// The Summary's table, as the Route tab draws it.
const table = f => (f.days ? [...f.each.map((c, n) => [String(n + 1), ...c]), ['Total', ...f.total]] : [[...f.total]])
  .map(r => r.join(' | '));
const times = { pre: 0, post: 0 };

// Two days with a night at a hotel, every wait off duty, the group let off
// where it was picked up.
const overnight = fromStops({ trip_type: 'round_trip', start_date: '2026-10-02', end_date: '2026-10-03' }, 'outbound', rows([
  ['pickup', 'A', '05:54', '2026-10-02', null, null, 43, '0:51', 'on', '06:45'],
  ['stop', 'B', '07:00', '2026-10-02', '09:00', '2026-10-02', 100.9, '1:42', 'off'],
  ['stop', 'C', '09:30', '2026-10-02', '12:00', '2026-10-02', 156.3, '2:14', 'off'],
  ['stop', 'D', '19:30', '2026-10-02', '20:00', '2026-10-02', 15, '0:16', 'off'],
  ['stop', 'E', '07:00', '2026-10-03', '07:30', '2026-10-03', 19.8, '0:26', 'off'],
  ['stop', 'A', '15:00', '2026-10-03', '20:00', '2026-10-03', 289.4, '4:30', 'on'],
  ['return', 'Y', '20:00', '2026-10-03', '20:51', '2026-10-03', 43, '0:51', 'on'],
]), times);
const overnightFig = legFigures(overnight);
expect('an overnight leg has a row a day and a Total', table(overnightFig), [
  '1 | 315 | 5 h 03 | 14 h 06 | 6 h 06',
  '2 | 352 | 5 h 47 | 13 h 51 | 6 h 21',
  'Total | 667 | 10 h 50 | 27 h 57 | 12 h 27',
]);
expect('the group let off at the pickup is not a stop of its own', overnight.list.length, 4);
expect('its miles and days, for the fuel card', [overnightFig.legMiles, overnightFig.legDays, overnightFig.backOn], [667, 2, '2026-10-03']);

// One day that runs past midnight, a sleeper-berth wait in the middle.
const late = fromStops({ trip_type: 'round_trip', start_date: '2026-10-03', end_date: '2026-10-03' }, 'outbound', rows([
  ['pickup', 'A', '03:10', null, null, null, 152.3, '3:05', 'on', '06:15'],
  ['stop', 'B', '06:30', '2026-10-03', '10:30', '2026-10-03', 208, '2:57', 'sleeper'],
  ['stop', 'A', '19:00', '2026-10-03', '00:30', null, 204, '2:55', 'on'],
  ['return', 'Y', '00:30', null, '03:35', null, 152.3, '3:05', 'on'],
]), times);
const lateFig = legFigures(late);
expect('a leg past midnight is one row, the sleeper taken off', table(lateFig), ['717 | 12 h 02 | 24 h 25 | 15 h 55']);
expect('and is back the next day', [lateFig.backOn, midnights(late).get('return')], ['2026-10-04', 1]);
expect('its 8 h 30 in the sleeper is a rest, parting two stretches under the second-driver rule',
  [stretches(late).map(c => [c.drive, c.span]), lateFig.over], [[[362, 440], [360, 515]], null]);
const shortRest = fromStops({ trip_type: 'round_trip', start_date: '2026-10-03', end_date: '2026-10-03' }, 'outbound', rows([
  ['pickup', 'A', '03:10', null, null, null, 152.3, '3:05', 'on', '06:15'],
  ['stop', 'B', '06:30', '2026-10-03', '10:30', '2026-10-03', 208, '2:57', 'sleeper'],
  ['stop', 'A', '17:30', '2026-10-03', '23:00', null, 204, '2:55', 'on'],
  ['return', 'Y', '23:00', null, '02:05', null, 152.3, '3:05', 'on'],
]), times);
expect('the same day with 7 hours at the stop is one stretch, over 10 hours driving',
  [stretches(shortRest).length, legFigures(shortRest).over?.drive], [1, 722]);

// One day whose customer's times leave less than the drive.
const tight = fromStops({ trip_type: 'round_trip', start_date: '2026-10-02', end_date: '2026-10-02' }, 'outbound', rows([
  ['pickup', 'A', '06:19', '2026-10-02', null, null, 45.7, '0:56', 'on', '07:15'],
  ['stop', 'B', '07:30', '2026-10-02', '10:00', '2026-10-02', 146.1, '2:33', 'on'],
  ['stop', 'C', '11:45', '2026-10-02', '12:00', '2026-10-02', 6, '0:11', 'on'],
  ['stop', 'D', '13:00', '2026-10-02', '13:15', '2026-10-02', 8.1, '0:15', 'on'],
  ['stop', 'A', '15:15', '2026-10-02', '17:30', '2026-10-02', 150, '2:37', 'on'],
  ['return', 'Y', '17:30', '2026-10-02', '18:26', '2026-10-02', 45.7, '0:56', 'on'],
]), times);
expect('a day trip is one row with no second driver', [table(legFigures(tight)), legFigures(tight).over], [['402 | 7 h 28 | 12 h 07 | 12 h 07'], null]);
expect('the room the times leave for the first drive and the drive home',
  [roomInto(tight, tight.list[0]), dropRoom(tight)], [150, 135]);

// A stop with neither times nor a place, as a leg is before it is filled in.
const empty = fromStops({ trip_type: 'round_trip', start_date: '2026-09-30' }, 'outbound', rows([
  ['pickup', null, null, '2026-09-30', null, null, null, null, 'on'],
  ['stop', null, null, '2026-09-30', null, '2026-09-30', null, null, 'on'],
  ['return', 'Y', null, '2026-09-30', null, '2026-09-30', null, null, 'on'],
]), times);
expect('a leg with no times says so', table(legFigures(empty)), ['— | — | Needs times | —']);

// A one-way leg ends at its last stop, whose drive is the drop-off's.
const oneWay = fromStops({ trip_type: 'one_way', start_date: '2026-10-26' }, 'outbound', rows([
  ['pickup', 'A', '15:38', '2026-10-26', null, null, 50, '0:52', 'on', '16:30'],
  ['stop', 'B', '17:30', '2026-10-26', '18:13', '2026-10-26', 41, '0:43', 'on'],
  ['return', 'Y', '18:13', '2026-10-26', '18:26', '2026-10-26', 9, '0:13', 'on'],
]), times);
expect('a one-way leg has no stops between, and counts the drop-off', [oneWay.list.length, oneWay.dropCounts, table(legFigures(oneWay))],
  [0, true, ['100 | 1 h 48 | 2 h 48 | 2 h 48']]);

// The office's pre-trip and post-trip time go on the ends of the day.
const withChecks = { ...tight, pre: 15, post: 10 };
expect('pre-trip and post-trip add to on duty', table(legFigures(withChecks)), ['402 | 7 h 28 | 12 h 32 | 12 h 32']);

/* THE LATE RETURN. Out Friday, the group let off at 2:00 the third morning
   and the bus at the yard at 2:17, before the office's hour: the bus came
   back the night before, so the drive home is Saturday's and the leg is two
   days, back on the Sunday. */
const awayRows = rows([
  ['pickup', 'A', '11:28', '2026-10-16', null, null, 5, '0:15', 'on', '11:45'],
  ['stop', 'B', '12:00', '2026-10-16', '17:00', '2026-10-16', 229, '3:26', 'on'],
  ['stop', 'A', '22:00', '2026-10-17', '02:00', '2026-10-18', 229, '3:26', 'on'],
  ['return', 'Y', '02:00', '2026-10-18', '02:17', '2026-10-18', 6, '0:17', 'on'],
]);
const awayTrip = { trip_type: 'round_trip', start_date: '2026-10-16', end_date: '2026-10-18' };
const away = fromStops(awayTrip, 'outbound', awayRows, times);
const awayFig = legFigures(away);
expect('a bus back before the hour on its last morning gives that morning no row',
  [countsTo(away), table(awayFig), awayFig.legDays, awayFig.dayMiles, awayFig.backOn, dropRoom(away)],
  ['2026-10-17', ['1 | 234 | 3 h 41 | 5 h 32 | 5 h 32', '2 | 235 | 3 h 43 | 4 h 17 | 4 h 17', 'Total | 469 | 7 h 24 | 9 h 49 | 9 h 49'],
    2, [234, 235], '2026-10-18', 240]);
const awayAtTwo = legFigures(fromStops(awayTrip, 'outbound', awayRows, { ...times, late: 120 }));
expect('with the hour at 2 the same leg keeps its three days', [awayAtTwo.legDays, awayAtTwo.dayMiles], [3, [234, 0, 235]]);
// Saved over two days and back at 1:30 the second morning: one day, one row.
const night = legFigures(fromStops({ trip_type: 'round_trip', start_date: '2026-10-16', end_date: '2026-10-17' }, 'outbound', rows([
  ['pickup', 'A', '12:50', '2026-10-16', null, null, 12, '0:25', 'on', '13:15'],
  ['stop', 'B', '13:30', '2026-10-16', '16:00', '2026-10-16', 122, '2:05', 'on'],
  ['stop', 'A', '22:30', '2026-10-16', '01:00', '2026-10-17', 122, '2:02', 'on'],
  ['return', 'Y', '01:00', '2026-10-17', '01:30', '2026-10-17', 12, '0:25', 'on'],
]), times));
expect('a two-day leg back before the hour on its second morning is one row',
  [night.days, table(night), night.legDays, night.backOn], [false, ['268 | 4 h 57 | 12 h 40 | 12 h 40'], 1, '2026-10-17']);

/* A RUN THROUGH THE NIGHT. Out at 17:00, driving all night with short
   stops, at the hotel at 6:00 the next morning and back the day after:
   each date's row is under the rule, but the night is one stretch of 12 h
   30 driving. */
const nightRun = fromStops({ trip_type: 'round_trip', start_date: '2026-11-06', end_date: '2026-11-08' }, 'outbound', rows([
  ['pickup', 'A', '16:30', '2026-11-06', null, null, 20, '0:30', 'on', '16:45'],
  ['stop', 'B', '17:00', '2026-11-06', '21:00', '2026-11-06', 260, '4:00', 'on'],
  ['stop', 'C', '21:30', '2026-11-06', '02:30', '2026-11-07', 330, '5:00', 'on'],
  ['stop', 'D', '03:00', '2026-11-07', '06:00', '2026-11-07', 200, '3:00', 'off'],
  ['stop', 'A', '08:00', '2026-11-08', '17:00', '2026-11-08', 590, '9:00', 'on'],
  ['return', 'Y', '17:00', '2026-11-08', '17:30', '2026-11-08', 20, '0:30', 'on'],
]), times);
const nightFig = legFigures(nightRun);
expect('a run through the night is one stretch over two dates, and asks for a second driver',
  [nightFig.each.map(c => c.drive), stretches(nightRun).map(c => c.drive), nightFig.over?.drive, nightFig.stretches],
  [[270, 480, 570], [750, 570], 750, 2]);
// The same night with 8 hours at the second stop.
const brokenRows = dwell => rows([
  ['pickup', 'A', '16:30', '2026-11-06', null, null, 20, '0:30', 'on', '16:45'],
  ['stop', 'B', '17:00', '2026-11-06', '21:00', '2026-11-06', 260, '4:00', 'on'],
  ['stop', 'C', '21:30', '2026-11-06', '02:30', '2026-11-07', 330, '5:00', dwell],
  ['stop', 'D', '10:30', '2026-11-07', '13:30', '2026-11-07', 200, '3:00', 'off'],
  ['stop', 'A', '08:00', '2026-11-08', '17:00', '2026-11-08', 590, '9:00', 'on'],
  ['return', 'Y', '17:00', '2026-11-08', '17:30', '2026-11-08', 20, '0:30', 'on'],
]);
const brokenTrip = { trip_type: 'round_trip', start_date: '2026-11-06', end_date: '2026-11-08' };
expect('8 hours in the sleeper or off duty part the night; 8 hours on duty is no rest',
  ['sleeper', 'off', 'on'].map(d => stretches(fromStops(brokenTrip, 'outbound', brokenRows(d), times)).map(c => [c.drive, c.span])),
  [[[570, 600], [180, 180], [570, 570]], [[570, 600], [180, 180], [570, 570]], [[750, 1260], [570, 570]]]);

/* THE SPLIT SLEEPER REST. Out at 6:00, 3 hours in the sleeper at the
   first stop and 5 at the second, then on through the night: the two
   waits come to 8, so the work before and after each is tested together,
   and neither test passes 10 hours driving. With 4 hours at the second
   stop they come to 7, no rest, and the run is one test of 14 h 30
   driving. */
const splitRows = second => rows([
  ['pickup', 'A', '05:30', '2026-11-06', null, null, 20, '0:30', 'on', '05:45'],
  ['stop', 'B', '06:00', '2026-11-06', '11:00', '2026-11-06', 330, '5:00', 'sleeper'],
  ['stop', 'C', '14:00', '2026-11-06', '18:00', '2026-11-06', 260, '4:00', 'sleeper'],
  ['stop', 'D', second, '2026-11-06', '04:00', '2026-11-07', 330, '5:00', 'off'],
  ['stop', 'A', '08:00', '2026-11-08', '17:00', '2026-11-08', 590, '9:00', 'on'],
  ['return', 'Y', '17:00', '2026-11-08', '17:30', '2026-11-08', 20, '0:30', 'on'],
]);
const split = second => stretches(fromStops(brokenTrip, 'outbound', splitRows(second), times));
expect('two sleeper waits of 3 and 5 hours are a split rest, each tested with the work on both sides',
  split('23:00').map(c => [c.drive, c.span, c.rest]), [[570, 570, 0], [540, 540, 0], [570, 570, 0]]);
expect('3 and 4 hours are not, and the run is one test, its sleeper time taken off',
  split('22:00').map(c => [c.drive, c.rest]), [[870, 420], [570, 0]]);
// The same leg read with its legs: its route's stops on the leg's days,
// named by the leg's id, beside a second leg's stop it must leave out.
const shapedTrip = {
  trip_type: 'round_trip', start_date: '2026-09-01', end_date: '2026-09-01',
  trip_legs: [
    { id: 'L1', leg: 'outbound', start_date: '2026-10-02', end_date: '2026-10-03', trip_routes: [{ id: 'R1', position: 1 }] },
    { id: 'L2', leg: 'return', start_date: '2026-10-09', end_date: '2026-10-09', trip_routes: [{ id: 'R2', position: 1 }] },
  ],
};
const shapedRows = [overnight.rows.pickup, ...overnight.list.map(e => e.row), overnight.rows.drop, overnight.rows.back]
  .map(r => ({ ...r, leg: undefined, route_id: 'R1' }))
  .concat([{ type: 'pickup', position: 0, route_id: 'R2', name: 'Z', depart_prev: '04:00' }]);
const shaped = fromStops(shapedTrip, 'L1', shapedRows, times);
expect('a leg read with its legs has the figures its old word gave, on its own days',
  [table(legFigures(shaped)), shaped.from, shaped.to], [table(overnightFig), '2026-10-02', '2026-10-03']);
expect('its old word still finds it', table(legFigures(fromStops(shapedTrip, 'outbound', shapedRows, times))), table(overnightFig));

expect('a night without its times still parts where the bus leaves on a later day',
  stretches({ ...overnight, list: overnight.list.map((st, i) => (i === 2 ? { ...st, leave: null } : st)) }).map(c => c.drive), [303, 347]);

// What a wait counts as before anyone says.
const on = { from: '2026-11-06' };
expect('a night of 8 hours or more starts off duty; a long day wait, a short night and a wait with no times start on duty',
  [nightDwell(on, { date: '2026-11-06', arrive: '20:00', leave: '07:00' }),
    nightDwell(on, { date: '2026-11-06', arrive: '19:00', leave: '16:00', leaveDate: '2026-11-09' }),
    nightDwell(on, { date: '2026-11-06', arrive: '08:00', leave: '18:00' }),
    nightDwell(on, { date: '2026-11-06', arrive: '23:00', leave: '05:00' }),
    nightDwell(on, { date: '2026-11-06', arrive: '20:00', leave: null })],
  ['off', 'off', 'on', 'on', 'on']);

console.log(failed ? `\n  ${failed} route figure case(s) failed` : '\n  route figures: every case passed');
process.exit(failed ? 1 : 0);
