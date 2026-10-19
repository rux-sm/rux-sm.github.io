// Runs leg-papers.js, the itinerary and the contacts a leg is handed, against
// invented trips: a round trip whose rows carry a leg anyway, a split trip
// with one paper and one contact for both days, one with each day's own, a
// drop-off whose only file is the pickup's, and a trip with no contact.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const window = {};
runInNewContext(readFileSync(new URL('../leg-papers.js', import.meta.url), 'utf8'), { window, Date });
const { itineraryFor, itinerariesFor, earlierItineraries, contactsFor } = window.SchedulerLegPapers;

let failed = 0;
function expect(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`}`);
}
const ids = docs => docs.map(d => d.id);
const names = cs => cs.map(c => c.name);
const doc = (id, created_at, leg = null, label = 'Itinerary') => ({ id, label, created_at, leg });

const round = {
  trip_type: 'round_trip',
  trip_documents: [doc('a', '2026-10-01'), doc('b', '2026-10-03', 'return'), doc('po', '2026-10-04', null, 'PO')],
  trip_contact_1_name: 'Pat Lee', trip_contact_2_name: 'Sam Ortiz', trip_contact_2_leg: 'return',
};
expect('a round trip is handed its newest itinerary whatever its leg says', itineraryFor(round, 'outbound')?.id, 'b');
expect('a file that is not an Itinerary is never one', ids(itinerariesFor(round, 'outbound')), ['b', 'a']);
expect('a round trip is handed every contact whatever its leg says', names(contactsFor(round, 'outbound')), ['Pat Lee', 'Sam Ortiz']);

const once = {
  trip_type: 'dropoff_pickup',
  trip_documents: [doc('a', '2026-10-01'), doc('b', '2026-10-05')],
  trip_contact_1_name: 'Pat Lee', trip_contact_1_phone: '5550142',
};
expect('one paper for both days: the drop-off is handed the newest', itineraryFor(once, 'outbound')?.id, 'b');
expect('one paper for both days: the pickup takes the drop-off\'s', itineraryFor(once, 'return')?.id, 'b');
expect('one paper for both days: the older is an earlier version', ids(earlierItineraries(once)), ['a']);
expect('one contact for both days is handed to the pickup too', names(contactsFor(once, 'return')), ['Pat Lee']);

const each = {
  trip_type: 'dropoff_pickup',
  trip_documents: [doc('tue', '2026-10-01', 'outbound'), doc('wed', '2026-10-02', 'return'), doc('tue2', '2026-10-03'), doc('wed0', '2026-09-30', 'return')],
  trip_contact_1_name: 'Pat Lee', trip_contact_1_leg: 'outbound',
  trip_contact_2_name: 'Sam Ortiz', trip_contact_2_leg: 'return',
  trip_contact_3_name: 'Lee Park',
  trip_contact_4_name: 'Kim Diaz', trip_contact_4_leg: 'return',
};
expect('each day its own: the drop-off is handed its newest, a file with no leg among them', itineraryFor(each, 'outbound')?.id, 'tue2');
expect('each day its own: the pickup is handed its own newest', itineraryFor(each, 'return')?.id, 'wed');
expect('each day its own: earlier versions are those no day is handed', ids(earlierItineraries(each)), ['tue', 'wed0']);
expect('each day its own: the drop-off\'s contacts, a contact with no leg among them', names(contactsFor(each, 'outbound')), ['Pat Lee', 'Lee Park']);
expect('each day its own: the pickup\'s contacts, in slot order', names(contactsFor(each, 'return')), ['Sam Ortiz', 'Kim Diaz']);
expect('a contact keeps its slot', contactsFor(each, 'return').map(c => c.slot), [2, 4]);

const pickupOnly = { trip_type: 'dropoff_pickup', trip_documents: [doc('wed', '2026-10-02', 'return')] };
expect('a drop-off whose only file is the pickup\'s has none', itineraryFor(pickupOnly, 'outbound'), null);
expect('and the pickup is handed it', itineraryFor(pickupOnly, 'return')?.id, 'wed');

const linked = { trip_type: 'dropoff_pickup', c1: { id: 'k1', name: 'Ana Ruiz', phone: '5550100' }, trip_contact_1_leg: 'return' };
expect('a slot with only a linked contact shows the linked one', contactsFor(linked, 'return').map(c => [c.name, c.phone, c.id]), [['Ana Ruiz', '5550100', 'k1']]);
expect('a pickup-only contact is not the drop-off\'s', contactsFor(linked, 'outbound'), []);

const none = { trip_type: 'dropoff_pickup', booking_contact_name: 'Office Desk' };
expect('no trip contact: none, the booking contact being the page\'s to fall back on', contactsFor(none, 'return'), []);
expect('no files: no itinerary', itineraryFor(none, 'outbound'), null);

console.log(failed ? `\n  ${failed} fault(s) in leg papers` : '\n  leg papers: every case passed');
process.exit(failed ? 1 : 0);
