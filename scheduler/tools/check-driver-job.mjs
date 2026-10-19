// Runs driver-job.js, what a driver's leg asks of them and what changed since
// they accepted it, against an invented trip: the leg as the driver works it,
// what Accept keeps, the lines a change reads as, and where the driver stands;
// and driver-text.js's sentence that tells a driver what changed.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const window = {};
for (const f of ['../leg-papers.js', '../share/driver-words.js', '../driver-job.js', '../driver-text.js']) runInNewContext(readFileSync(new URL(f, import.meta.url), 'utf8'), { window, Intl, Date });
const { legOf, jobView, changesBetween, stateOf, keyOf } = window.SchedulerDriverJob;
const en = window.SchedulerDriverWords.en;
// The English page's words, as share/driver.js hands them in.
const say = { w: en, keptValue: (k, v) => v, keptRequirement: n => n };

let failed = 0;
function expect(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`}`);
}

const trip = {
  id: 't1', destination: 'Austin, TX', customer: 'Lone Oak High School', trip_type: 'round_trip',
  start_date: '2026-11-07', end_date: '2026-11-08', updated_at: '2026-10-01T10:00:00Z',
  trip_contact_1_name: 'Pat Lee', trip_contact_1_phone: '5550142',
  trip_reqs: { sleeper: true },
  trip_documents: [{ id: 'f1', label: 'Itinerary', file_path: 'a.pdf', created_at: '2026-10-01' }],
  trip_stops: [
    { leg: 'outbound', position: 0, type: 'pickup', name: 'Lone Oak HS', address: '1 School Rd', spot: '06:30', depart_prev: '06:00' },
    { leg: 'outbound', position: 1, type: 'stop', name: 'Arena', arrive: '10:00', depart_prev: '07:00' },
    { leg: 'outbound', position: 2, type: 'return', name: 'Yard', arrive: '22:00' },
  ],
  trip_assignments: [{ leg: 'outbound', active_roles: null, buses: { number: 763 }, trip_drivers: [
    { driver_id: 'd1', role: 'driver', drivers: { short_name: 'Rigo' } },
    { driver_id: 'd2', role: 'co-driver', drivers: { short_name: 'Ana', phone: '5550199' } },
  ] }],
};
const ref = { tripId: 't1', leg: 'outbound' };
const l = legOf(ref, trip, 'd1', new Map([['sleeper', 'Sleeper berth']]));
expect('the leg as the driver works it', [l.role, l.bus, l.time, l.place.name, l.destination, l.requirements, l.crew[0].people[0].name, l.contact.name],
  ['driver', '763', '06:30', 'Lone Oak HS', 'Austin, TX', ['Sleeper berth'], 'Ana', 'Pat Lee']);
expect('a driver on no bus of the leg is told it is not theirs', legOf(ref, trip, 'd9'), { error: 'notYours' });

// A split trip whose customer sent each day its own paper and contacts.
const split = {
  ...trip, trip_type: 'dropoff_pickup', return_start_date: '2026-11-08',
  trip_contact_1_name: 'Pat Lee', trip_contact_1_phone: '5550142',
  trip_contact_2_name: 'Sam Ortiz', trip_contact_2_phone: '5550143', trip_contact_2_leg: 'return',
  trip_contact_3_name: 'Kim Diaz', trip_contact_3_phone: '5550144', trip_contact_3_leg: 'return',
  trip_documents: [
    { id: 'tue', label: 'Itinerary', file_path: 'tue.pdf', created_at: '2026-10-01', leg: 'outbound' },
    { id: 'wed', label: 'Itinerary', file_path: 'wed.pdf', created_at: '2026-10-02', leg: 'return' },
  ],
  trip_stops: [...trip.trip_stops, { leg: 'return', position: 3, type: 'pickup', name: 'Arena', spot: '15:00' },
    { leg: 'return', position: 4, type: 'return', name: 'Yard', arrive: '20:00' }],
  trip_assignments: [...trip.trip_assignments, { leg: 'return', active_roles: null, buses: { number: 897 }, trip_drivers: [
    { driver_id: 'd3', role: 'driver', drivers: { short_name: 'Luis' } }] }],
};
const dropoff = legOf(ref, split, 'd1');
const pickup = legOf({ tripId: 't1', leg: 'return' }, split, 'd3');
expect('a split trip\'s drop-off driver is handed the drop-off\'s file and contact',
  [dropoff.itineraries[0].path, dropoff.contacts.map(c => c.name)], ['tue.pdf', ['Pat Lee']]);
expect('and its pickup driver the pickup\'s, the second as backup',
  [pickup.itineraries[0].path, pickup.contacts.map(c => c.name), pickup.contact.name], ['wed.pdf', ['Sam Ortiz', 'Kim Diaz'], 'Sam Ortiz']);
expect('a leg with no day-of contact is handed whoever booked',
  legOf(ref, { ...trip, trip_contact_1_name: null, trip_contact_1_phone: null, booking_contact_name: 'Office Desk' }, 'd1').contacts.map(c => c.name), ['Office Desk']);

const view = jobView(l);
expect('what Accept keeps, as text the card writes', [view.dates, view.time, view.bus, view.role, view.stops.length, view.itinerary],
  ['Sat, Nov 7 – Sun, Nov 8, 2026', '6:30 AM', '763', 'Driver', 3, 'a.pdf']);
const replaced = jobView(legOf(ref, { ...trip, trip_documents: [{ ...trip.trip_documents[0], file_path: 'c.pdf' }] }, 'd1', new Map([['sleeper', 'Sleeper berth']])));
expect('an itinerary replaced under the same document reads as new', changesBetween(view, replaced, l, say), ['New itinerary']);
expect('a view kept with the document\'s id still matches the same file', changesBetween({ ...view, itinerary: 'f1' }, view, l, say), []);

const moved = jobView(legOf(ref, { ...trip, trip_assignments: [{ ...trip.trip_assignments[0], buses: { number: 897 } }],
  trip_stops: trip.trip_stops.map(s => (s.position === 1 ? { ...s, arrive: '10:30' } : s)),
  trip_documents: [...trip.trip_documents, { id: 'f2', label: 'Itinerary', file_path: 'b.pdf', created_at: '2026-10-05' }] }, 'd1', new Map()));
expect('each change is one line the driver reads',
  changesBetween(view, moved, l, say), ['Stops changed', 'Bus: 763 → 897', 'Added: Sleeper bus', 'Removed: Sleeper berth', 'New itinerary']);

const statuses = new Map([[keyOf('t1', 'outbound', 'driver'), { status: 'confirmed', confirmedAt: '2026-10-02T00:00:00Z' }]]);
expect('accepted, with what they accepted unchanged', stateOf(l, { statuses, views: new Map([[keyOf('t1', 'outbound', 'driver'), view]]) }, say).status, 'accepted');
expect('changed since they accepted, with its lines',
  stateOf(l, { statuses, views: new Map([[keyOf('t1', 'outbound', 'driver'), { ...view, bus: '470' }]]) }, say),
  { status: 'changed', lines: ['Bus: 470 → 763'] });
expect('accepted before views were kept and saved since asks again, with no list',
  stateOf({ ...l, trip: { ...trip, updated_at: '2026-10-03T00:00:00Z' } }, { statuses, views: new Map() }, say), { status: 'changed', lines: [] });
expect('no answer is pending, and a decline is declined',
  [stateOf(l, { statuses: new Map(), views: new Map() }, say).status,
    stateOf(l, { statuses: new Map([[keyOf('t1', 'outbound', 'driver'), { status: 'declined' }]]), views: new Map() }, say).status],
  ['pending', 'declined']);

// The office's reading, from rows that hold the bus and the driver by id.
const { changesSince, viewNow } = window.SchedulerDriverJob;
const office = { ...trip, trip_assignments: [{ leg: 'outbound', active_roles: null, bus_id: 'b2', trip_drivers: [
  { driver_id: 'd1', role: 'driver' }, { driver_id: 'd2', role: 'co-driver' }] }] };
const read = { busesById: new Map([['b1', { number: 763 }], ['b2', { number: 897 }]]),
  driversById: new Map([['d1', { short_name: 'Rigo' }], ['d2', { short_name: 'Ana' }]]), nameOf: id => (id === 'sleeper' ? 'Sleeper berth' : id) };
expect('the office reads what changed since the driver accepted, in English, naming it only',
  changesSince(office, 'outbound', 'd1', { status: 'confirmed', acceptedView: view }, read), ['Bus changed']);
expect('the text that tells a driver names it in their language',
  changesSince(office, 'outbound', 'd1', { status: 'confirmed', acceptedView: view }, { ...read, lang: 'es' }), ['Cambió: Autobús']);
expect('the text that tells a driver gets what changed by name, to word itself',
  changesSince(office, 'outbound', 'd1', { status: 'confirmed', acceptedView: view }, { ...read, keys: true }), [{ key: 'bus' }]);
expect('nothing changed says nothing', changesSince(office, 'outbound', 'd1', { status: 'confirmed', acceptedView: viewNow(office, 'outbound', 'd1', read) }, read), []);
expect('a seat not confirmed, or with no kept view, says nothing',
  [changesSince(office, 'outbound', 'd1', { status: 'declined', acceptedView: view }, read), changesSince(office, 'outbound', 'd1', { status: 'confirmed' }, read)], [[], []]);

// The sentence that tells a driver, by an invented co-driver's leg today.
const told = { trip: { trip_type: 'one_way' }, leg: 'outbound', role: 'co-driver', start: new Date(2026, 9, 16), end: new Date(2026, 9, 16), bus: '763', spot: '14:45:00', from: 'A, Hidalgo, TX', to: 'B, Zapata, TX' };
const opening = (changes, lang) => window.SchedulerDriverText.change('Ana', told, '2026-10-16', changes, 'link', lang).split('\n')[0];
expect('one change is one sentence', opening([{ key: 'bus' }]), "Hi Ana, your bus changed for today's trip.");
expect('several values are one list', opening([{ key: 'place' }, { key: 'stops' }, { key: 'itinerary', removed: false }]),
  "Hi Ana, your pickup, stops and itinerary changed for today's trip.");
expect('a new date comes first, and the rest changed too', opening([{ key: 'dates' }, { key: 'bus' }]), 'Hi Ana, the date of your trip changed. Your bus changed too.');
expect('a role, a need and a removed itinerary each say what, and only the first names the trip',
  opening([{ key: 'role' }, { key: 'requirements', added: ['Hotel'], removed: ['HOS form'] }, { key: 'itinerary', removed: true }]),
  "Hi Ana, you're now the co-driver on today's trip. It now needs: Hotel. It no longer needs: HOS form. It no longer has an itinerary.");
expect('Spanish agrees in number', opening([{ key: 'bus' }, { key: 'time' }], 'es'), 'Hola Ana, cambiaron el autobús y la hora de llegada de tu viaje de hoy.');

console.log(failed ? `\n  ${failed} fault(s) in driver job` : '\n  driver job: every case passed');
process.exit(failed ? 1 : 0);
