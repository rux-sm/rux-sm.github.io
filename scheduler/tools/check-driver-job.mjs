// Runs driver-job.js, what a driver's leg asks of them and what changed since
// they accepted it, against an invented trip: the leg as the driver works it,
// what Accept keeps, the lines a change reads as, and where the driver stands.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const window = {};
for (const f of ['../share/driver-words.js', '../driver-job.js']) runInNewContext(readFileSync(new URL(f, import.meta.url), 'utf8'), { window, Intl, Date });
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

const view = jobView(l);
expect('what Accept keeps, as text the card writes', [view.dates, view.time, view.bus, view.role, view.stops.length, view.itinerary],
  ['Sat, Nov 7 – Sun, Nov 8, 2026', '6:30 AM', '763', 'Driver', 3, 'f1']);

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

console.log(failed ? `\n  ${failed} fault(s) in driver job` : '\n  driver job: every case passed');
process.exit(failed ? 1 : 0);
