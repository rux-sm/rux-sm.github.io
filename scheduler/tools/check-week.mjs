// Runs week.js, where a trip sits on a week, against sample trips and fails
// when a leg covers the wrong days.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const window = {};
runInNewContext(readFileSync(new URL('../trip-shape.js', import.meta.url), 'utf8'), { window, Date });
runInNewContext(readFileSync(new URL('../week.js', import.meta.url), 'utf8'), { window });
const { legsOf, clip, setLateReturn } = window.SchedulerWeek;

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

// THE LATE RETURN: a bus back at the yard before the hour came back the night
// before. Each leg is [from, the last day it takes, its last day as saved,
// the days after it the bus is back].
const taken = t => legsOf(t).map(l => [l.from, l.to, l.ends, l.backDays]);
const stops = list => list.map(([type, depart_prev, arrive], position) => ({ leg: 'outbound', position, type, depart_prev, arrive }));
// Out Friday, the group home at 2:00 the third morning, the bus at the yard at 2:17.
const away = { start_date: '2026-10-16', end_date: '2026-10-18', trip_stops: stops([
  ['pickup', '11:28', null], ['stop', '12:00', '17:00'], ['stop', '22:00', '02:00'], ['return', '02:00', '02:17']]) };
expect('a longer leg back before the hour does not take the morning it is back, and its bar says +1',
  [taken(away), span(away)], [[['2026-10-16', '2026-10-17', '2026-10-18', 1]], [2]]);
const dawn = { ...away, trip_stops: stops([
  ['pickup', '11:28', null], ['stop', '12:00', '17:00'], ['stop', '23:30', '04:10'], ['return', '04:10', '04:30']]) };
expect('back at or after the hour, it takes that day', taken(dawn), [['2026-10-16', '2026-10-18', '2026-10-18', 0]]);
// A leg whose trip ends late on its last day and reaches the yard past midnight.
const far = { start_date: '2026-10-16', end_date: '2026-10-17', trip_stops: stops([
  ['pickup', '08:00', null], ['stop', '08:30', '12:00'], ['return', '23:30', '00:20']]) };
expect('a yard return earlier on the clock than the trip\'s end is the day after the last',
  taken(far), [['2026-10-16', '2026-10-17', '2026-10-17', 1]]);
const day = (end, back) => ({ start_date: '2026-10-16', end_date: '2026-10-16', trip_stops: stops([
  ['pickup', '12:50', null], ['stop', '13:30', '16:00'], ['stop', '22:30', end], ['return', end, back]]) });
expect('a one-day leg back past midnight and before the hour is its own day, +1',
  [taken(day('00:30', '00:55')), span(day('00:30', '00:55'))], [[['2026-10-16', '2026-10-16', '2026-10-16', 1]], [1]]);
expect('a one-day leg back at or after the hour takes the next day too',
  [taken(day('04:45', '05:10')), span(day('04:45', '05:10'))], [[['2026-10-16', '2026-10-17', '2026-10-16', 0]], [2]]);
expect('a one-day leg back the same day is its own day', taken(day('23:15', '23:40')), [['2026-10-16', '2026-10-16', '2026-10-16', 0]]);
expect('a leg with no yard return takes its own dates',
  taken({ ...away, trip_stops: [] }), [['2026-10-16', '2026-10-18', '2026-10-18', 0]]);
setLateReturn({ hour: 2 });
expect('the hour is the office\'s: at 2, a bus back at 2:17 takes that day', taken(away), [['2026-10-16', '2026-10-18', '2026-10-18', 0]]);
setLateReturn({ hour: 0 });
expect('hour 0 counts no return as the night before', taken(day('00:30', '00:55')), [['2026-10-16', '2026-10-17', '2026-10-16', 0]]);
setLateReturn(undefined);
expect('with no row saved the hour is 4', taken(away), [['2026-10-16', '2026-10-17', '2026-10-18', 1]]);

// The same split trip read by its old columns and read with its legs: the same bars, each leg's id and number beside.
const withRows = { trip_type: 'dropoff_pickup', start_date: '2026-10-13', end_date: '2026-10-13', return_start_date: '2026-10-15',
  return_end_date: '2026-10-15', bus_count: 2, return_bus_count: 1,
  trip_stops: [{ leg: 'outbound', route_id: 'r1', position: 0, type: 'pickup', depart_prev: '06:00', spot: '07:00' },
    { leg: 'outbound', route_id: 'r1', position: 1, type: 'return', arrive: '23:30' },
    { leg: 'return', route_id: 'r2', position: 2, type: 'pickup', depart_prev: '05:00', spot: '06:00' },
    { leg: 'return', route_id: 'r2', position: 3, type: 'return', arrive: '02:15' }] };
const shapedTrip = { ...withRows, trip_legs: [
  { id: 'l2', leg: 'return', start_date: '2026-10-15', end_date: '2026-10-15', bus_count: 1, trip_routes: [{ id: 'r2', position: 1 }] },
  { id: 'l1', leg: 'outbound', start_date: '2026-10-13', end_date: '2026-10-13', bus_count: 2, trip_routes: [{ id: 'r1', position: 1 }] }] };
const bare = l => { const { legId, number, ...rest } = l; return rest; };
expect('a trip read with its legs gives the bars its columns give, with each leg\'s id and number',
  [legsOf(shapedTrip).map(bare), legsOf(shapedTrip).map(l => [l.legId, l.number])],
  [legsOf(withRows), [['l1', 1], ['l2', 2]]]);

console.log(failed ? `\n  week: ${failed} case(s) failed` : '\n  week: every case passed');
process.exit(failed ? 1 : 0);
