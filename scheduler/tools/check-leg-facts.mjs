// Runs leg-facts.js's seat count against invented legs: the seats a leg's
// buses have between them, and when the passengers are more than that; and
// what a leg with a bus a partner covers asks for.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const window = {};
for (const f of ['../requirements.js', '../leg-facts.js', '../trip-shape.js', '../past-midnight.js', '../week.js']) runInNewContext(readFileSync(new URL(f, import.meta.url), 'utf8'), { window });
const { seatsOf, overSeats, dayContactsOf, dayOfContact, crewOf, factsOf } = window.SchedulerLegFacts;

let failed = 0;
function expect(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`}`);
}

const buses = new Map([['b56', { capacity: 56 }], ['b36', { capacity: 36 }], ['bx', { capacity: null }]]);
const trip = (...ids) => ({ trip_assignments: ids.map(bus_id => ({ leg: 'outbound', bus_id })) });

expect('a leg\'s seats are its buses\' seats added up', seatsOf(trip('b56', 'b36'), 'outbound', buses), 92);
expect('a vehicle with no bus yet leaves the leg uncounted', seatsOf(trip('b56', null), 'outbound', buses), null);
expect('a bus with its seats unrecorded leaves the leg uncounted', seatsOf(trip('b56', 'bx'), 'outbound', buses), null);
expect('a leg with no vehicles is uncounted', seatsOf(trip(), 'outbound', buses), null);
expect('the other leg\'s buses are not counted', seatsOf({ trip_assignments: [{ leg: 'return', bus_id: 'b56' }] }, 'outbound', buses), null);
expect('more passengers than seats is said in words', overSeats(60, 56), '60 passengers and 56 seats');
expect('as many as the seats fit', overSeats(56, 56), null);
expect('no headcount or no count of seats says nothing', [overSeats(null, 56), overSeats(0, 56), overSeats(60, null)], [null, null, null]);

// A split trip's day-of contacts, read with its legs and contact list by the leg's id or its old word.
const split = { trip_type: 'dropoff_pickup', start_date: '2026-10-13', end_date: '2026-10-13', return_start_date: '2026-10-15', return_end_date: '2026-10-15' };
const listed = { ...split, trip_legs: [{ id: 'l1', leg: 'outbound', start_date: '2026-10-13', end_date: '2026-10-13', trip_routes: [] },
  { id: 'l2', leg: 'return', start_date: '2026-10-15', end_date: '2026-10-15', trip_routes: [] }],
  trip_contacts: [{ id: 'c2', position: 2, name: 'Luis', leg_id: 'l2' }, { id: 'c1', position: 1, name: 'Ana', phone: '9565550101', leg_id: null }] };
const names = list => list.map(c => c.name);
expect('a leg\'s contacts come from the list, the leg named by its id or its old word, and a trip read without the list has none',
  [names(dayContactsOf(listed, 'l1')), names(dayContactsOf(listed, 'l2')), names(dayContactsOf(listed, 'return')), names(dayContactsOf(split, 'outbound'))],
  [['Ana'], ['Luis'], ['Luis'], []]);
expect('a leg with none of its own takes the first leg\'s, and the contact is the first',
  [names(dayContactsOf({ ...listed, trip_contacts: listed.trip_contacts.slice(1) }, 'l2')), dayOfContact(listed, 'l1')?.phone, dayOfContact(listed)?.name],
  [['Ana'], '9565550101', 'Ana']);

// A leg of three buses: one of ours with a driver, one a partner covers and confirmed with its price, one a partner covers and has not.
const partnersById = new Map([['p1', { id: 'p1', name: 'Valley Coaches' }], ['p2', { id: 'p2', name: 'Delta Lines' }]]);
const coveredTrip = { start_date: '2026-11-20', end_date: '2026-11-20', bus_count: 3, trip_type: 'round_trip', trip_reqs: { fuelCard: true },
  trip_assignments: [
    { id: 'a1', leg: 'outbound', bus_id: 'b56', fuel_card_number: '4410', trip_drivers: [{ driver_id: 'd1', role: 'driver', pay: 300 }] },
    { id: 'a2', leg: 'outbound', bus_id: null, partner_id: 'p1', partner_confirmed: true, partner_price: 2400, trip_drivers: [] },
    { id: 'a3', leg: 'outbound', bus_id: null, partner_id: 'p2', partner_confirmed: false, partner_price: null, trip_drivers: [] }] };
const covered = factsOf(coveredTrip, 'outbound', { busesById: buses, partnersById });
expect('a bus a partner covers has no crew, so no seat open', crewOf(coveredTrip, coveredTrip.trip_assignments[1], new Map()), []);
expect('a covered bus counts as assigned and opens no seat',
  [covered.busesNeeded, covered.busesAssigned, covered.seatsOpen, covered.seats], [3, 3, 0, 1]);
expect('the leg says how many buses partners cover and how many are ours, and asks no fuel card of theirs',
  [covered.covered, covered.ours, covered.fuelCardsLeft], [2, 1, 0]);
expect('each partner not confirmed and each with no price is named',
  [covered.partnersUnconfirmed, covered.partnerPricesLeft], [['Delta Lines'], ['Delta Lines']]);
expect('a partner the page did not read is still named as a partner',
  factsOf(coveredTrip, 'outbound', { busesById: buses }).partnersUnconfirmed, ['A partner']);

// A leg of three buses and one co-driver, seated on the first and also on the other two.
const sharedTrip = { start_date: '2026-11-20', end_date: '2026-11-20', bus_count: 3, trip_type: 'round_trip',
  trip_assignments: [
    { id: 's1', leg: 'outbound', bus_id: 'b56', active_roles: ['driver', 'co-driver'], trip_drivers: [
      { driver_id: 'd1', role: 'driver', pay: 300 }, { driver_id: 'd9', role: 'co-driver', pay: null, also_on: ['s2', 's3'] }] },
    { id: 's2', leg: 'outbound', bus_id: 'b36', active_roles: ['driver'], trip_drivers: [{ driver_id: 'd2', role: 'driver', pay: 300 }] },
    { id: 's3', leg: 'outbound', bus_id: 'bx', active_roles: ['driver', 'co-driver'], trip_drivers: [{ driver_id: 'd3', role: 'driver', pay: 300 }] }] };
const seatsOn = (i, opts) => crewOf(sharedTrip, sharedTrip.trip_assignments[i], new Map(), null, opts)
  .map(c => [c.role, c.driverId ?? null, c.rides?.id ?? null, !!c.needed]);
expect('a bus the co-driver rides draws them in its co-driver seat, from the bus their row is on',
  seatsOn(1, { riders: true }), [['driver', 'd2', null, false], ['co-driver', 'd9', 's1', false]]);
expect('and anything that counts rows does not see them there', seatsOn(1), [['driver', 'd2', null, false]]);
expect('a ridden bus with its co-driver seat still on shows no seat open', seatsOn(2), [['driver', 'd3', null, false]]);
expect('the co-driver may be in any bus they ride, from their own seat or a ridden one',
  [crewOf(sharedTrip, sharedTrip.trip_assignments[0], new Map()).find(c => c.driverId === 'd9').buses,
    crewOf(sharedTrip, sharedTrip.trip_assignments[2], new Map(), null, { riders: true }).find(c => c.driverId === 'd9').buses],
  [['b56', 'b36', 'bx'], ['b56', 'b36', 'bx']]);
const shared = factsOf(sharedTrip, 'outbound', { busesById: buses });
expect('the leg counts the co-driver once: one seat, one pay to set, one envelope',
  [shared.seats, shared.seatsOpen, shared.payLeft, shared.envelopesLeft], [4, 0, 1, 4]);

console.log(failed ? `\n  ${failed} fault(s) in leg facts` : '\n  leg facts: every case passed');
process.exit(failed ? 1 : 0);
