// Runs checklist.js, the scheduler's checklist rules, against sample trips
// and fails when an item appears, disappears or ticks where it should not.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const window = {};
runInNewContext(readFileSync(new URL('../checklist.js', import.meta.url), 'utf8'), { window });
const { checklist, leftOf } = window.SchedulerChecklist;

let failed = 0;
const ids = legs => legs.flatMap(l => l.items.map(i => `${i.id}${i.done ? '+' : '-'}`));
function expect(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`}`);
}

const base = { trip_type: 'round_trip', confirmed: false, trip_documents: [], trip_reqs: {} };
const full = { busesNeeded: 1, busesAssigned: 1, busesShort: 0, seatsOpen: 0, seats: 1, unconfirmed: 0, envelopesLeft: 0, itinerariesLeft: 0, partTime: false, hosLeft: 0 };

expect('a placeholder has only Entered',
  ids(checklist({ ...base, trip_bar_color: 'amber' })),
  ['route-done:outbound-', 'buses-done:outbound-', 'billing-done:outbound-']);

expect('a quoted day trip with nothing done',
  ids(checklist(base, () => ({ busesNeeded: 2, busesAssigned: 1, seatsOpen: 1 }))),
  ['route-done:outbound-', 'buses-done:outbound-', 'billing-done:outbound-', 'confirmed:outbound-',
    'itinerary:outbound-', 'contact:outbound-', 'buses:outbound-', 'seats:outbound-', 'itinerary-printed:outbound-']);

const ready = { ...base, confirmed: true, route_done_at: 't', buses_done_at: 't', billing_done_at: 't',
  trip_documents: [{ label: 'Itinerary' }] };
const readyLegs = checklist(ready, () => full, true);
expect('a trip with everything done is ready', [readyLegs[0].ready, leftOf(readyLegs)], [true, 0]);

expect('not needed leaves the contact out and keeps the itinerary, done',
  ids(checklist({ ...ready, itinerary_not_needed: true, contact_not_needed: true, trip_documents: [] }, () => full))
    .filter(i => i.startsWith('itinerary:') || i.startsWith('contact:')),
  ['itinerary:outbound+']);

expect('a part-time driver asks for the hours-of-service record',
  [ids(checklist(ready, () => ({ ...full, partTime: true, hosLeft: 1 }), true)).filter(i => i.startsWith('hos')),
    ids(checklist(ready, () => ({ ...full, partTime: true }), true)).filter(i => i.startsWith('hos'))],
  [['hos:outbound-'], ['hos:outbound+']]);

expect('hotel and fuel card appear only when wanted, from tags or the old columns',
  [ids(checklist(ready, () => full, true)).filter(i => /hotel|fuel/.test(i)),
    ids(checklist({ ...ready, trip_reqs: { hotel: true }, need_fuel_card: true, hotel_booked_outbound: true }, () => full, true))
      .filter(i => /hotel|fuel/.test(i))],
  [[], ['hotel:outbound+', 'fuel-card:outbound-']]);

const split = checklist({ ...ready, trip_type: 'dropoff_pickup' }, () => full, true);
expect('a split trip has two legs, and the trip\'s items only on the first',
  [split.length, split[1].items.map(i => i.group).filter((g, i, a) => a.indexOf(g) === i)],
  [2, ['Buses', 'Paperwork']]);

expect('a bus short of a need and unconfirmed drivers are open',
  ids(checklist(ready, () => ({ ...full, busesShort: 1, seats: 2, unconfirmed: 2, envelopesLeft: 1 }), true))
    .filter(i => /fit|drivers|envelopes/.test(i)),
  ['fit:outbound-', 'drivers:outbound-', 'envelopes:outbound-']);

console.log(failed ? `\n  ${failed} checklist case(s) failed` : '\n  checklist: every case passed');
process.exit(failed ? 1 : 0);
