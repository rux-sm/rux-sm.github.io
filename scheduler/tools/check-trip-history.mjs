// Runs trip-history.js, what a save changed, against invented reads of a
// trip: a new trip, labelled and unlabelled columns, the columns another
// says, a stop moved, added, taken away and put in another order, a place
// whose map point follows it, a bus, a seat and a quote line changed, and a
// change from the board.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const window = {};
for (const file of ['../trip-shape.js', '../trip-history.js']) {
  runInNewContext(readFileSync(new URL(file, import.meta.url), 'utf8'), { window });
}
const { changes, line } = window.SchedulerTripHistory;

let failed = 0;
function expect(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`}`);
}
const names = { bus: id => ({ b1: 'Bus 12', b2: 'Bus 14' })[id], driver: id => ({ d1: 'Pat Example', d2: 'Lee Example' })[id],
  requirement: id => ({ sleeper: 'Sleeper', adaLift: 'ADA Lift' })[id] ?? id };
const said = list => list.map(c => `${c.label}: ${c.before ?? '∅'} → ${c.after ?? '∅'}`);

const stop = (id, position, more = {}) => ({ id, trip_id: 't', position, leg: 'outbound', type: 'stop', name: `Place ${id}`,
  address: `${id} Main St`, lat: 1, lng: 2, mapbox_id: `m${id}`, arrive: '10:00', spot: null, depart_prev: '09:00', dwell_status: 'on', ...more });
const trip = (more = {}) => ({
  id: 't', trip_ref: '100100', trip_type: 'round_trip', customer: 'Lone Oak High School', customer_id: 'c1',
  updated_at: '2027-01-01T00:00:00Z', notes_updated_at: null, route_done_by: null, route_done_at: null,
  departure_time: '06:30', need_fuel_card: false, quoted_price: 1400, trip_reqs: { sleeper: false },
  trip_stops: [stop('s1', 0), stop('s2', 1), stop('s3', 2)],
  trip_assignments: [{ id: 'a1', trip_id: 't', position: 0, leg: 'outbound', bus_id: 'b1', active_roles: ['driver'], needs: {},
    trip_drivers: [{ id: 'r1', assignment_id: 'a1', role: 'driver', driver_id: 'd1', pay: 300,
      envelope_printed: false, envelope_printed_at: null, envelope_printed_by: null }] }],
  trip_quote_lines: [{ id: 'q1', trip_id: 't', position: 0, kind: 'rental', leg: null, item: 'Bus Rental', quantity: 1, cost: 1400, amount: 1400, rate: 4.4 }],
  trip_payments: [], trip_pos: [], trip_invoices: [],
  ...more,
});
const base = trip();

expect('a new trip is one line, Created', said(changes(null, base, names)), ['Trip: ∅ → Created']);
expect('two reads alike make no line, whatever order their keys came in',
  changes(base, JSON.parse(JSON.stringify(trip())), names), []);
expect('a labelled column says its label and kind, an unlabelled one its name in words, a leg column its day',
  said(changes(base, trip({ quoted_price: 1500, need_fuel_card: true, departure_time: '07:00', fuel_card_number_return: '0042' }), names)),
  ['Quoted price: $1,400.00 → $1,500.00', 'Departs: 06:30 → 07:00', 'Fuel card number (pickup): ∅ → 0042', 'Need fuel card: No → Yes']);
expect('bookkeeping, a link beside its name and a stamp beside its mark make no line of their own',
  said(changes(base, trip({ updated_at: '2027-02-01T00:00:00Z', notes_updated_at: '2027-02-01T00:00:00Z', customer_id: 'c2',
    customer: 'Lone Oak ISD', route_done_by: 'Sam', route_done_at: '2027-02-01T00:00:00Z' }), names)),
  ['Client: Lone Oak High School → Lone Oak ISD', 'Route done by: ∅ → Sam']);
expect('a need turned on is said by its name',
  said(changes(base, trip({ trip_reqs: { sleeper: true, adaLift: true } }), names)), ['Requirements: ∅ → ADA Lift, Sleeper']);

const stops = (...rows) => trip({ trip_stops: rows });
expect('a stop\'s times and wait are each said, before and after, on the stop by name',
  said(changes(base, stops(stop('s1', 0), stop('s2', 1, { arrive: '10:30', dwell_status: 'off', arrive_date: '2027-01-02' }), stop('s3', 2)), names)),
  ['Stop: Place s2: Arrives 10:00, Wait on, Arrives on – → Arrives 10:30, Wait off, Arrives on 2027-01-02']);
expect('a new address carries its map point unsaid, and a map point moved alone is said once',
  [said(changes(base, stops(stop('s1', 0, { address: '9 Elm St', lat: 5, lng: 6, mapbox_id: 'm9' }), stop('s2', 1), stop('s3', 2)), names)),
    said(changes(base, stops(stop('s1', 0, { lat: 5, lng: 6 }), stop('s2', 1), stop('s3', 2)), names))],
  [['Stop: Place s1: Address s1 Main St → Address 9 Elm St'], ['Stop: Place s1: Map point 1 → Map point 5']]);
expect('a stop added and one taken away are each one line, and the rest moving down a place says nothing',
  said(changes(base, stops(stop('s1', 0), stop('s4', 1, { arrive: '12:00' }), stop('s3', 2)), names)),
  ['Stop: Place s2: Type stop, Address s2 Main St, Arrives 10:00, Leaves before 09:00 → ∅',
    'Stop: Place s4: ∅ → Type stop, Address s4 Main St, Arrives 12:00, Leaves before 09:00']);
expect('stops put in another order say the order once',
  said(changes(base, stops(stop('s1', 0), stop('s3', 1), stop('s2', 2)), names)),
  ['Stop order: Place s1, Place s2, Place s3 → Place s1, Place s3, Place s2']);
expect('on a split trip a stop names its day',
  said(changes(trip({ trip_type: 'dropoff_pickup' }), trip({ trip_type: 'dropoff_pickup', trip_stops: [stop('s1', 0), stop('s2', 1), stop('s3', 2, { leg: 'return', arrive: '11:00' })] }), names)),
  ['Stop: Place s3 (drop-off): Day Drop-off, Arrives 10:00 → Day Pickup, Arrives 11:00']);

// The same trip read with its legs: a stop names the day its route's leg is,
// a pickup being every leg after the first, whatever word it carries.
const legs = { trip_legs: [
  { id: 'L1', leg: 'outbound', start_date: '2027-01-08', trip_routes: [{ id: 'R1', position: 1 }] },
  { id: 'L2', leg: 'return', start_date: '2027-01-10', trip_routes: [{ id: 'R2', position: 1 }] },
] };
const onRoute = (route, more) => stop('s3', 2, { route_id: route, leg: undefined, ...more });
expect('on a split trip read with its legs a stop names the day of its route\'s leg',
  said(changes(trip({ trip_type: 'dropoff_pickup', ...legs, trip_stops: [stop('s1', 0), stop('s2', 1), onRoute('R2')] }),
    trip({ trip_type: 'dropoff_pickup', ...legs, trip_stops: [stop('s1', 0), stop('s2', 1), onRoute('R2', { arrive: '11:00' })] }), names)),
  ['Stop: Place s3 (pickup): Arrives 10:00 → Arrives 11:00']);
expect('and the rows of its legs make no line of their own',
  said(changes(trip({ trip_type: 'dropoff_pickup', ...legs }),
    trip({ trip_type: 'dropoff_pickup', trip_legs: [legs.trip_legs[0], { ...legs.trip_legs[1], start_date: '2027-01-11' }] }), names)),
  []);

const seatChanged = trip({ trip_assignments: [{ ...base.trip_assignments[0], bus_id: 'b2', needs: { adaLift: true },
  trip_drivers: [{ ...base.trip_assignments[0].trip_drivers[0], driver_id: 'd2', envelope_printed: true, envelope_printed_at: 'x', envelope_printed_by: 'Sam' }] }] });
expect('a vehicle\'s bus and needs, and its seat\'s driver and envelope, are said by name, the stamps unsaid',
  said(changes(base, seatChanged, names)),
  ['Vehicle: Bus 12: Bus 12, Needs – → Bus 14, Needs ADA Lift',
    'Seat: Driver on Bus 12: Driver Pat Example, Envelope printed No → Driver Lee Example, Envelope printed Yes']);
expect('a quote line\'s rate and words are said, as columns no list names',
  said(changes(base, trip({ trip_quote_lines: [{ ...base.trip_quote_lines[0], rate: 4.6, description: 'Two days' }] }), names)),
  ['Quote line: Bus Rental: Rate $4.40, Description – → Rate $4.60, Description Two days']);
expect('a payment added says what it holds',
  said(changes(base, trip({ trip_payments: [{ id: 'p1', trip_id: 't', position: 0, amount: 500, method: 'Check', date: '2027-01-05', ref: '1042' }] }), names)),
  ['Payment: 1042: ∅ → Amount $500.00, Date 2027-01-05, Method Check']);
expect('a change from the board is a line as a save writes it, and none when nothing changed',
  [line('trip_bar_color', null, 'green'), line('hotel_booked_return', false, true), line('confirmed', true, true)],
  [{ field: 'trip_bar_color', label: 'Trip color', before: null, after: 'green' },
    { field: 'hotel_booked_return', label: 'Inbound hotel booked', before: 'No', after: 'Yes' }, null]);

console.log(failed ? `\n  ${failed} trip history case(s) failed` : '\n  trip history: every case passed');
process.exit(failed ? 1 : 0);
