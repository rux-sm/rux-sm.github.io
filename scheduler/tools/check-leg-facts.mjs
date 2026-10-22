// Runs leg-facts.js's seat count against invented legs: the seats a leg's
// buses have between them, and when the passengers are more than that.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const window = {};
for (const f of ['../requirements.js', '../leg-papers.js', '../leg-facts.js', '../trip-shape.js', '../past-midnight.js', '../week.js']) runInNewContext(readFileSync(new URL(f, import.meta.url), 'utf8'), { window });
const { seatsOf, overSeats, dayContactsOf, dayOfContact } = window.SchedulerLegFacts;

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

// A split trip's day-of contacts: read with its legs and contact list by the leg's id, and from its slots by the old word.
const split = { trip_type: 'dropoff_pickup', start_date: '2026-10-13', end_date: '2026-10-13', return_start_date: '2026-10-15', return_end_date: '2026-10-15',
  trip_contact_1_name: 'Ana', trip_contact_1_phone: '9565550101', trip_contact_2_name: 'Luis', trip_contact_2_leg: 'return' };
const listed = { ...split, trip_legs: [{ id: 'l1', leg: 'outbound', start_date: '2026-10-13', end_date: '2026-10-13', trip_routes: [] },
  { id: 'l2', leg: 'return', start_date: '2026-10-15', end_date: '2026-10-15', trip_routes: [] }],
  trip_contacts: [{ id: 'c2', position: 2, name: 'Luis', leg_id: 'l2' }, { id: 'c1', position: 1, name: 'Ana', phone: '9565550101', leg_id: null }] };
const names = list => list.map(c => c.name);
expect('a leg\'s contacts come from the list by its id, or from the slots by its word',
  [names(dayContactsOf(listed, 'l1')), names(dayContactsOf(listed, 'l2')), names(dayContactsOf(split, 'outbound')), names(dayContactsOf(split, 'return'))],
  [['Ana'], ['Luis'], ['Ana'], ['Luis']]);
expect('a leg with none of its own takes the first leg\'s, and the contact is the first',
  [names(dayContactsOf({ ...listed, trip_contacts: listed.trip_contacts.slice(1) }, 'l2')), dayOfContact(listed, 'l1')?.phone, dayOfContact(listed)?.name],
  [['Ana'], '9565550101', 'Ana']);

console.log(failed ? `\n  ${failed} fault(s) in leg facts` : '\n  leg facts: every case passed');
process.exit(failed ? 1 : 0);
