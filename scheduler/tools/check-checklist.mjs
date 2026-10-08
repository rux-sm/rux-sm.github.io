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
const full = { busesNeeded: 1, busesAssigned: 1, busesShort: 0, seatsOpen: 0, seats: 1, unconfirmed: 0, envelopesLeft: 0, itinerariesLeft: 0, partTime: false, hosLeft: 0, fuelCardsLeft: 0 };

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
    ids(checklist({ ...ready, trip_reqs: { hotel: true }, need_fuel_card: true, hotel_booked_outbound: true }, () => ({ ...full, fuelCardsLeft: 1 }), true))
      .filter(i => /hotel|fuel/.test(i)),
    ids(checklist({ ...ready, need_fuel_card: true }, () => full, true)).filter(i => /fuel/.test(i))],
  [[], ['hotel:outbound+', 'fuel-card:outbound-'], ['fuel-card:outbound+']]);

const split = checklist({ ...ready, trip_type: 'dropoff_pickup' }, () => full, true);
expect('a split trip has two legs, and the trip\'s items only on the first',
  [split.length, split[1].items.map(i => i.group).filter((g, i, a) => a.indexOf(g) === i)],
  [2, ['Buses', 'Paperwork']]);

expect('a bus short of a need and unconfirmed drivers are open',
  ids(checklist(ready, () => ({ ...full, busesShort: 1, seats: 2, unconfirmed: 2, envelopesLeft: 1 }), true))
    .filter(i => /fit|drivers|envelopes/.test(i)),
  ['fit:outbound-', 'drivers:outbound-', 'envelopes:outbound-']);

const forms = f => ids(checklist(ready, () => ({ ...full, ...f }), true)).filter(i => i.startsWith('driver-forms'));
expect('driver forms are asked for only where the customer wants them, and done once each is on file and printed',
  [forms({}), forms({ formsWanted: 1, formsMissing: ['Ana, Background check'] }), forms({ formsWanted: 1, formsLeft: 1 }),
    forms({ formsWanted: 1, formsMissing: [], formsLeft: 0 }), forms({ formsWanted: 1, seats: 0 })],
  [[], ['driver-forms:outbound-'], ['driver-forms:outbound-'], ['driver-forms:outbound+'], []]);
expect('a missing form is said by driver and kind',
  checklist(ready, () => ({ ...full, formsWanted: 1, formsMissing: ['Ana, Background check'] }), true)[0]
    .items.find(i => i.id.startsWith('driver-forms')).detail,
  'No current form: Ana, Background check');

/* The facts behind that item, from leg-facts.js: which form a driver's leg
   takes, and what a leg counts as missing or not printed. */
for (const file of ['requirements.js', 'leg-facts.js']) {
  runInNewContext(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), { window });
}
const Facts = window.SchedulerLegFacts;
const seat = (driver_id, extra = {}) => ({ driver_id, role: 'driver', envelope_printed: true, itinerary_printed: true, ...extra });
const tripFor = (customer_id, seats, extra = {}) => ({ id: 't1', customer_id, start_date: '2026-11-10', bus_count: 1,
  trip_assignments: [{ id: 'a1', leg: 'outbound', bus_id: 'b1', trip_drivers: seats }], ...extra });
const driversById = new Map([['d1', { name: 'Ana Ruiz', short_name: 'Ana' }], ['d2', { name: 'Ben Ortiz' }]]);
const facts = trip => { const f = Facts.factsOf(trip, 'outbound', { driversById }); return [f.formsWanted, f.formsMissing, f.formsLeft]; };

expect('a trip asks for no driver form before the forms are read', facts(tripFor('north', [seat('d1')])), [0, [], 0]);
Facts.setDriverForms({
  kinds: [{ id: 'bg', name: 'Background check' }],
  asks: [{ customer_id: 'north', kind_id: 'bg' }, { customer_id: 'south', kind_id: 'bg' }, { customer_id: 'north', kind_id: 'gone' }],
  forms: [
    { id: 'f1', kind_id: 'bg', driver_id: 'd1', customer_id: null, ends_on: '2026-12-31' },
    { id: 'f2', kind_id: 'bg', driver_id: 'd1', customer_id: 'south', ends_on: '2026-10-31' },
    { id: 'f3', kind_id: 'bg', driver_id: null, customer_id: 'north', ends_on: null },
  ],
});
expect('a customer that asks for none wants none', facts(tripFor('west', [seat('d1')])), [0, [], 0]);
expect('a driver with a current form has it left to print, then done',
  [facts(tripFor('north', [seat('d1')])), facts(tripFor('north', [seat('d1', { driver_forms_printed: true })]))],
  [[1, [], 1], [1, [], 0]]);
expect('a driver with no form is named, and is not counted as left to print',
  facts(tripFor('north', [seat('d1', { driver_forms_printed: true }), seat('d2')])), [1, ['Ben Ortiz, Background check'], 0]);
expect('the form issued to the trip\'s customer is taken first, and one that ends before the leg leaves is missing',
  [Facts.driverFormsOf(tripFor('south', []), 'outbound', 'd1').map(f => [f.form.id, f.ended, f.ok]),
    Facts.driverFormsOf(tripFor('north', []), 'outbound', 'd1').map(f => [f.form.id, f.ended, f.ok]),
    facts(tripFor('south', [seat('d1')]))],
  [[['f2', true, false]], [['f1', false, true]], [1, ['Ana, Background check'], 0]]);
expect('a return leg is held to the day it leaves',
  Facts.driverFormsOf(tripFor('north', [], { return_start_date: '2027-01-05' }), 'return', 'd1').map(f => f.ended), [true]);

console.log(failed ? `\n  ${failed} checklist case(s) failed` : '\n  checklist: every case passed');
process.exit(failed ? 1 : 0);
