// Runs week.js, where a trip sits on a week, against sample trips and fails
// when a leg covers the wrong days.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const window = {};
runInNewContext(readFileSync(new URL('../week.js', import.meta.url), 'utf8'), { window });
const { legsOf, clip } = window.SchedulerWeek;

let failed = 0;
function expect(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`}`);
}

const days = trip => legsOf(trip).map(l => [l.leg, l.from, l.to, l.count]);
// The week of Monday 12 October 2026, as the board hands it to `clip`.
const week = [new Date(2026, 9, 12), new Date(2026, 9, 18)];
const span = trip => legsOf(trip).map(l => clip(l.from, l.to, ...week)?.span ?? null);

const trip = { trip_type: 'round_trip', start_date: '2026-10-13', end_date: '2026-10-15', bus_count: 2, trip_stops: [] };

expect('a three-day trip is one leg over its three days',
  [days(trip), span(trip)], [[['outbound', '2026-10-13', '2026-10-15', 2]], [3]]);

expect('a trip with no end date is its start day',
  [days({ ...trip, end_date: null }), span({ ...trip, end_date: null })], [[['outbound', '2026-10-13', '2026-10-13', 2]], [1]]);

expect('a leg saved with its end before its start is its start day, so it still has a bar',
  [days({ ...trip, start_date: '2026-10-15', end_date: '2026-10-12' }), span({ ...trip, start_date: '2026-10-15', end_date: '2026-10-12' })],
  [[['outbound', '2026-10-15', '2026-10-15', 2]], [1]]);

const split = { ...trip, trip_type: 'dropoff_pickup', end_date: '2026-10-13', return_start_date: '2026-10-16', return_end_date: '2026-10-14', return_bus_count: 1 };
expect('a split trip is two legs, and a pickup leg ending before it starts is its start day',
  [days(split), span(split)],
  [[['outbound', '2026-10-13', '2026-10-13', 2], ['return', '2026-10-16', '2026-10-16', 1]], [1, 1]]);

console.log(failed ? `\n  week: ${failed} case(s) failed` : '\n  week: every case passed');
process.exit(failed ? 1 : 0);
