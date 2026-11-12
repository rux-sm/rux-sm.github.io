// Runs driver-job.js, what a driver's leg asks of them and what changed since
// they accepted it, against an invented trip: the leg as the driver works it,
// what Accept keeps, which changes are told and the lines they read as, and
// where the driver stands; and driver-text.js's text that tells a driver.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const window = {};
for (const f of ['../trip-shape.js', '../share/driver-words.js', '../driver-job.js', '../driver-text.js']) runInNewContext(readFileSync(new URL(f, import.meta.url), 'utf8'), { window, Intl, Date });
const { legOf, jobView, changesBetween, stateOf, keyOf, sayIn, rangeText } = window.SchedulerDriverJob;
// The English page's words, as share/driver.js hands them in.
const say = sayIn('en');

let failed = 0;
function expect(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`}`);
}

const trip = {
  id: 't1', destination: 'Austin, TX', customer: 'Lone Oak High School', trip_type: 'round_trip',
  start_date: '2026-11-07', end_date: '2026-11-08', updated_at: '2026-10-01T10:00:00Z',
  trip_contacts: [{ position: 1, name: 'Pat Lee', phone: '5550142', leg_id: null }],
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

// A co-driver on bus 763 who also rides 470, where Raul drives.
const shared = { ...trip, trip_assignments: [
  { id: 'a1', leg: 'outbound', active_roles: null, buses: { number: 763 }, trip_drivers: [
    { driver_id: 'd1', role: 'driver', drivers: { short_name: 'Rigo' } },
    { driver_id: 'd2', role: 'co-driver', also_on: ['a2'], drivers: { short_name: 'Ana' } }] },
  { id: 'a2', leg: 'outbound', active_roles: ['driver'], buses: { number: 470 }, trip_drivers: [
    { driver_id: 'd3', role: 'driver', drivers: { short_name: 'Raul' } }] }] };
const ana = legOf(ref, shared, 'd2');
const raul = legOf(ref, shared, 'd3');
expect('a co-driver who also rides another bus has both buses and both drivers',
  [ana.bus, ana.crew.map(b => [b.bus, b.mine, b.people.map(p => p.name)])], ['763 · 470', [['763', true, ['Rigo']], ['470', true, ['Raul']]]]);
expect('and the driver of a bus they ride has them aboard', raul.crew.find(b => b.mine).people.map(p => p.name), ['Ana']);

// A split trip whose customer sent each day its own paper and contacts,
// read with its legs as the driver's link reads it: each leg named by its
// id, with its route, its contacts in trip_contacts and its files by leg_id.
const route = word => (word === 'return' ? 'r2' : 'r1');
const stops = [...trip.trip_stops, { leg: 'return', position: 3, type: 'pickup', name: 'Arena', spot: '15:00' },
  { leg: 'return', position: 4, type: 'return', name: 'Yard', arrive: '20:00' }];
const vehicles = [...trip.trip_assignments, { leg: 'return', active_roles: null, buses: { number: 897 }, trip_drivers: [
  { driver_id: 'd3', role: 'driver', drivers: { short_name: 'Luis' } }] }];
const split = {
  ...trip, trip_type: 'dropoff_pickup', return_start_date: '2026-11-08',
  trip_legs: [{ id: 'l2', leg: 'return', kind: 'one_way', start_date: '2026-11-08', end_date: '2026-11-08', trip_routes: [{ id: 'r2', position: 1 }] },
    { id: 'l1', leg: 'outbound', kind: 'one_way', start_date: '2026-11-07', end_date: '2026-11-08', trip_routes: [{ id: 'r1', position: 1 }] }],
  trip_contacts: [{ position: 1, name: 'Pat Lee', phone: '5550142', leg_id: null }, { position: 2, name: 'Sam Ortiz', phone: '5550143', leg_id: 'l2' },
    { position: 3, name: 'Kim Diaz', phone: '5550144', leg_id: 'l2' }],
  trip_documents: [
    { id: 'tue', label: 'Itinerary', file_path: 'tue.pdf', created_at: '2026-10-01', leg_id: 'l1' },
    { id: 'wed', label: 'Itinerary', file_path: 'wed.pdf', created_at: '2026-10-02', leg_id: 'l2' },
  ],
  trip_stops: stops.map(x => ({ ...x, route_id: route(x.leg) })),
  trip_assignments: vehicles.map(x => ({ ...x, route_id: route(x.leg) })),
};
const dropoff = legOf({ tripId: 't1', legId: 'l1' }, split, 'd1');
const pickup = legOf({ tripId: 't1', legId: 'l2', leg: 'return' }, split, 'd3');
expect('a split trip\'s drop-off driver is handed the drop-off\'s file and contact',
  [dropoff.itineraries[0].path, dropoff.contacts.map(c => c.name)], ['tue.pdf', ['Pat Lee']]);
expect('and its pickup driver the pickup\'s, the second as backup, the leg named by its id',
  [pickup.itineraries[0].path, pickup.contacts.map(c => c.name), pickup.contact.name, pickup.leg, pickup.word],
  ['wed.pdf', ['Sam Ortiz', 'Kim Diaz'], 'Sam Ortiz', 'l2', 'return']);
// The leg's own reading, without the trip it was read from.
const bare = x => { const { trip, ...rest } = x; return rest; };
expect('an older link or the board names the leg by its word, and is read the same',
  bare(legOf({ tripId: 't1', leg: 'return' }, split, 'd3')), bare(pickup));
expect('a leg with no day-of contact is handed whoever booked',
  legOf(ref, { ...trip, trip_contacts: [], booking_contact_name: 'Office Desk' }, 'd1').contacts.map(c => c.name), ['Office Desk']);

const view = jobView(l);
expect('what Accept keeps, as text the card writes', view,
  { dates: 'Sat, Nov 7 – Sun, Nov 8, 2026', time: '6:30 AM', place: 'Lone Oak HS, 1 School Rd', destination: 'Austin, TX', relief: '', itinerary: 'a.pdf' });
const viewOf = (changes, driver = 'd1') => jobView(legOf(ref, { ...trip, ...changes }, driver, new Map()));
const pickupWith = fields => ({ trip_stops: trip.trip_stops.map(s => (s.type === 'pickup' ? { ...s, ...fields } : s)) });
const replaced = viewOf({ trip_documents: [{ ...trip.trip_documents[0], file_path: 'c.pdf' }] });
expect('an itinerary replaced under the same document reads as new', changesBetween(view, replaced, l, say), ['New itinerary']);
expect('a view kept with the document\'s id still matches the same file', changesBetween({ ...view, itinerary: 'f1' }, view, l, say), []);

const moved = viewOf({ trip_assignments: [{ ...trip.trip_assignments[0], buses: { number: 897 } }], trip_reqs: { hotel: true },
  trip_stops: trip.trip_stops.map(s => (s.position === 1 ? { ...s, arrive: '10:30' } : s.type === 'return' ? { ...s, arrive: '23:00' } : s)) });
expect('a new bus, a stop moved, a need and the yard times ask nothing', changesBetween(view, moved, l, say), []);
expect('and a view kept before, holding the bus and stops, reads the same',
  changesBetween({ ...view, bus: '470', stops: ['Somewhere'], role: 'Co-driver', requirements: ['Hotel'] }, view, l, say), []);

const day = (a, b) => rangeText(a, b, true);
const rebooked = viewOf({ start_date: '2026-11-06', destination: 'Dallas, TX', ...pickupWith({ name: 'Lone Oak MS', spot: '07:00' }) });
expect('the day, the spot time, the pickup and the destination each say the new and the old',
  changesBetween(view, rebooked, l, say), [`New dates: ${day('2026-11-06', '2026-11-08')} (was ${day('2026-11-07', '2026-11-08')})`,
    'New spot time: 7:00 AM (was 6:30 AM)', 'New pickup: Lone Oak MS (was Lone Oak HS)', 'New destination: Dallas, TX (was Austin, TX)']);
expect('a pickup that keeps its name and moves says its whole place',
  changesBetween(view, viewOf(pickupWith({ address: '2 School Rd' })), l, say), ['New pickup: Lone Oak HS, 2 School Rd (was Lone Oak HS, 1 School Rd)']);
expect('a placeholder destination filled in says what it was',
  changesBetween({ ...view, destination: 'TBD' }, view, l, say), ['New destination: Austin, TX (was TBD)']);
expect('a time taken back to TBD asks nothing', changesBetween(view, viewOf(pickupWith({ spot: null })), l, say), []);
expect('in Spanish, as the driver\'s page or text writes it',
  changesBetween(view, viewOf(pickupWith({ spot: '07:00' })), l, sayIn('es')), ['Nueva hora de llegada: 7:00 AM (antes 6:30 AM)']);

// A relief driver's time is their handoff, not the bus's spot.
const reliefTrip = changes => ({ ...trip, ...changes, trip_assignments: [{ ...trip.trip_assignments[0], trip_drivers: [
  ...trip.trip_assignments[0].trip_drivers, { driver_id: 'd5', role: 'relief-end', report_time: changes.handoff ?? '14:00', drivers: { short_name: 'Luz' } }] }] });
const relief = legOf(ref, reliefTrip({}), 'd5', new Map());
const reliefView = jobView(relief);
expect('a relief driver is told a new handoff time, and not a new spot',
  [changesBetween(reliefView, jobView(legOf(ref, reliefTrip({ handoff: '15:00' }), 'd5', new Map())), relief, say),
    changesBetween(reliefView, jobView(legOf(ref, reliefTrip(pickupWith({ spot: '07:00' })), 'd5', new Map())), relief, say)],
  [['New handoff time: 3:00 PM (was 2:00 PM)'], []]);

const statuses = new Map([[keyOf('t1', 'outbound', 'driver'), { status: 'confirmed', confirmedAt: '2026-10-02T00:00:00Z' }]]);
const kept = v => new Map([[keyOf('t1', 'outbound', 'driver'), v]]);
expect('accepted, with what they accepted unchanged, or only its bus', [stateOf(l, { statuses, views: kept(view) }, say).status,
  stateOf(l, { statuses, views: kept({ ...view, bus: '470' }) }, say).status], ['accepted', 'accepted']);
expect('changed since they accepted, with its lines',
  stateOf(l, { statuses, views: kept({ ...view, time: '6:00 AM' }) }, say), { status: 'changed', lines: ['New spot time: 6:30 AM (was 6:00 AM)'] });
expect('accepted before views were kept and saved since asks again, with no list',
  stateOf({ ...l, trip: { ...trip, updated_at: '2026-10-03T00:00:00Z' } }, { statuses, views: new Map() }, say), { status: 'changed', lines: [] });
expect('no answer is pending, and a decline is declined',
  [stateOf(l, { statuses: new Map(), views: new Map() }, say).status,
    stateOf(l, { statuses: new Map([[keyOf('t1', 'outbound', 'driver'), { status: 'declined' }]]), views: new Map() }, say).status],
  ['pending', 'declined']);

// The office's reading, from rows that hold the bus and the driver by id.
const { changesSince, viewNow } = window.SchedulerDriverJob;
const office = changes => ({ ...trip, ...changes, trip_assignments: [{ leg: 'outbound', active_roles: null, bus_id: 'b2', trip_drivers: [
  { driver_id: 'd1', role: 'driver' }, { driver_id: 'd2', role: 'co-driver' }] }] });
const read = { busesById: new Map([['b1', { number: 763 }], ['b2', { number: 897 }]]),
  driversById: new Map([['d1', { short_name: 'Rigo' }], ['d2', { short_name: 'Ana' }]]), nameOf: id => (id === 'sleeper' ? 'Sleeper berth' : id) };
const since = (changes, extra = {}) => changesSince(office(changes), 'outbound', 'd1', { status: 'confirmed', acceptedView: view }, { ...read, ...extra });
expect('the office reads the driver\'s own lines, in English, and a new bus is not one of them',
  [since({}), since(pickupWith({ spot: '07:00' }))], [[], ['New spot time: 7:00 AM (was 6:30 AM)']]);
expect('the text that tells a driver has them in their language',
  since(pickupWith({ spot: '07:00' }), { lang: 'es' }), ['Nueva hora de llegada: 7:00 AM (antes 6:30 AM)']);
expect('nothing changed says nothing', changesSince(office({}), 'outbound', 'd1', { status: 'confirmed', acceptedView: viewNow(office({}), 'outbound', 'd1', read) }, read), []);
expect('a seat not confirmed, or with no kept view, says nothing',
  [changesSince(office({}), 'outbound', 'd1', { status: 'declined', acceptedView: view }, read), changesSince(office({}), 'outbound', 'd1', { status: 'confirmed' }, read)], [[], []]);

// The text that tells a driver, by an invented co-driver's leg.
const Text = window.SchedulerDriverText;
const told = { trip: { trip_type: 'one_way' }, leg: 'outbound', role: 'co-driver', start: new Date(2026, 9, 16), end: new Date(2026, 9, 16), bus: '763', spot: '14:45:00', from: 'A, Hidalgo, TX', to: 'B, Zapata, TX', itinerary: 'f1' };
const lines = ['New spot time: 3:00 PM (was 2:45 PM)', 'New itinerary'];
expect('the text says there was an update, a line a change, then the link',
  Text.change('Ana', told, '2026-10-16', lines, 'link'),
  "Hello Ana,\nThere was an update to today's trip:\n• New spot time: 3:00 PM (was 2:45 PM)\n• New itinerary\n\nTrip details and itineraries:\nlink");
expect('with no live link, the itinerary\'s takes its place',
  Text.change('Ana', told, '2026-10-16', lines, '').split('\n').at(-1), `Itinerary: ${Text.DOCUMENT_LINK}f1`);
const tripOn = (today, lang) => Text.change('Ana', { ...told, start: new Date(2026, 9, 17) }, today, lines, 'link', lang).split('\n')[1];
expect('the trip is named by its day: tomorrow, this week\'s weekday, or a later date, in the driver\'s language',
  [tripOn('2026-10-16'), tripOn('2026-10-13'), tripOn('2026-10-01'), tripOn('2026-10-13', 'es')],
  ["There was an update to tomorrow's trip:", "There was an update to Saturday's trip:", 'There was an update to your trip on Sat, Oct 17:',
    'Hubo un cambio en tu viaje del sábado:']);
expect('a reminder gives the spot and the drop-off, which says how long the day runs',
  [Text.legLines({ ...told, dropoff: '15:30' })[1], Text.legLines({ ...told, dropoff: '15:30' }, { lang: 'es' })[1], Text.legLines(told)[1]],
  ['2:45 PM spot · 3:30 PM drop-off', 'Llegar a las 2:45 PM · dejar al grupo a las 3:30 PM', '2:45 PM spot']);
const twoDays = { ...told, end: new Date(2026, 9, 18), dropoff: '22:00' };
expect('and on a leg of more than one day, the day the group is let off',
  [Text.legLines(twoDays)[1], Text.legLines(twoDays, { lang: 'es' })[1]],
  ['2:45 PM spot · SUN 10:00 PM drop-off', 'Llegar a las 2:45 PM · dejar al grupo el domingo a las 10:00 PM']);

// A split trip's leg says which way it runs, Inbound for its pickup, every leg after the first.
const way = (inbound, lang) => window.SchedulerDriverText.legLines({ ...told, trip: split, inbound }, { lang })[0].split(' • ').at(-1);
expect('a split trip\'s leg says which way it runs, in the driver\'s language, and another trip\'s says neither',
  [way(false), way(true), way(true, 'es'), /Outbound|Inbound/.test(window.SchedulerDriverText.legLines(told)[0])],
  ['Outbound', 'Inbound', 'Regreso', false]);

// A place typed as a town carries the town in its name and its address both.
expect('a pickup whose address opens with its name is written once, and any other keeps both',
  [{ name: 'Elm City, TX', address: 'Elm City, TX, United States of America' }, { name: 'Lone Oak HS', address: '1 School Rd' }, { name: '', address: '1 School Rd' }]
    .map(window.SchedulerDriverJob.placeText),
  ['Elm City, TX, United States of America', 'Lone Oak HS, 1 School Rd', '1 School Rd']);
expect('a text names a place by its town, past the state and the country however it is spelled',
  ['Elm City, TX, United States of America', 'Lone Oak HS, 1 School Rd, Elm City, TX 78520, USA', 'Elm City'].map(Text.town),
  ['Elm City', 'Elm City', 'Elm City']);

console.log(failed ? `\n  ${failed} fault(s) in driver job` : '\n  driver job: every case passed');
process.exit(failed ? 1 : 0);
