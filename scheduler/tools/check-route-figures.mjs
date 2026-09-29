// Runs route-figures.js, the Route tab's and the Detailed itinerary's
// arithmetic, against sample legs and fails when a figure moves. The legs'
// times, dates, miles and waits are real trips' as saved; their places are
// letters, since only which rows share a place matters here. The figures
// wanted are what the Route tab showed for them.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const window = {};
runInNewContext(readFileSync(new URL('../route-figures.js', import.meta.url), 'utf8'), { window });
const { fromStops, legFigures, roomInto, dropRoom, midnights } = window.SchedulerRouteFigures;

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
expect('over 10 hours driving asks for a second driver', lateFig.over?.drive, 722);

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

console.log(failed ? `\n  ${failed} route figure case(s) failed` : '\n  route figures: every case passed');
process.exit(failed ? 1 : 0);
