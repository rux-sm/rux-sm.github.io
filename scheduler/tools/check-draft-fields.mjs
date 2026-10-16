// Runs draft-fields.js, the one list of what a draft may fill, against
// invented drafts: each kind of value it takes, a field no draft may fill,
// the stops only a new trip takes, and every field having a place in the
// editor. Whether each control is on screen is proved by opening a draft.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const window = {};
runInNewContext(readFileSync(new URL('../draft-fields.js', import.meta.url), 'utf8'), { window });
const { FIELDS, KINDS, problems } = window.SchedulerDraftFields;

let failed = 0;
function expect(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`}`);
}

const good = {
  destination: 'Austin, TX', customer: 'Lone Oak High School', trip_type: 'round_trip',
  start_date: '2026-11-07', end_date: '2026-11-08', passengers: 48, bus_count: '2', quoted_price: '$4,920',
  booking_contact_email: 'pat@example.com', booking_contact_phone: '(555) 014-2000', departure_time: '6:30',
  req_sleeper: true, booking_contact_missive_url: 'https://mail.missiveapp.com/#inbox/conversations/abc',
  stops: [{ name: 'Arena', arrive: '10:00', leave: '16:00' }],
};
expect('a draft of good values has nothing wrong', problems(good), []);
expect('each value of the wrong kind is said, by its field and what it must be',
  problems({ start_date: '2026-02-30', departure_time: '25:00', bus_count: 0, trip_type: 'shuttle', req_ada: 'yes', booking_contact_email: 'pat' }),
  ['start_date is a date as YYYY-MM-DD.', 'departure_time is a time as HH:MM.', 'bus_count is a whole number from 1 to 50.',
    'trip_type is one of round_trip, one_way, dropoff_pickup.', 'req_ada is true or false.', 'booking_contact_email is an email address.']);
expect('a field no draft may fill is refused with the list, and a PO is one',
  problems({ po_ref: '0482' })[0].startsWith('These are not trip fields a draft can fill: po_ref. Allowed: destination,'), true);
expect('an empty draft and a draft that is not an object are refused',
  [problems({}), problems(null)], [['A draft with no fields is nothing to check.'], ['fields is an object of trip fields.']]);
expect('stops are a new trip\'s only, and each needs a name or an address and clock times',
  [problems({ stops: good.stops }, { change: true }), problems({ stops: [{ arrive: '10:00' }] })],
  [['stops can be drafted only on a new trip. Change a saved stop\'s times or wait with stop_changes.'],
    ['stops is a list of up to 30 places, each { name, address, arrive, leave }: a name or an address, and times as HH:MM.']]);
expect('a null value is refused, since a draft only fills', problems({ destination: null }), ['destination is words, up to 200 characters.']);

// Every field names a kind the list knows, and a place the editor puts it.
expect('every field\'s kind of value is one the list checks', FIELDS.filter(f => !KINDS[f.value]).map(f => f.key), []);
expect('a field with no control is one the editor lays out itself',
  FIELDS.filter(f => !f.id).map(f => f.kind).filter(k => !['fleet', 'trip', 'buses', 'stops', 'stopChanges'].includes(k)), []);

// Changes to a saved trip's stops: by id, times and days and the wait, and nothing that moves a stop.
const STOP = '3f2b6c1e-8a4d-4e2f-9b1a-7c5d3e2f1a0b';
expect('a change to a saved stop\'s times, days and wait fits a change to a trip, and not a new trip',
  [problems({ stop_changes: [{ id: STOP, dwell: 'off' }, { id: STOP, arrive: '19:00', leave: null, date: '2027-01-13', leave_date: '2027-01-16' }] }, { change: true }),
    problems({ stop_changes: [{ id: STOP, dwell: 'off' }] })],
  [[], ['stop_changes changes a saved trip\'s stops, so it goes with a change to a trip; a new trip\'s are its stops.']]);
const wrong = c => problems({ stop_changes: [c] }, { change: true }).length;
expect('a change with no id, nothing to change, a place, a bad time, day or wait is refused',
  [wrong({ dwell: 'off' }), wrong({ id: STOP }), wrong({ id: STOP, name: 'Hotel' }), wrong({ id: STOP, arrive: '7pm' }),
    wrong({ id: STOP, date: '2027-02-30' }), wrong({ id: STOP, dwell: 'rest' })], [1, 1, 1, 1, 1, 1]);

console.log(failed ? `\n  ${failed} draft field case(s) failed` : '\n  draft fields: every case passed');
process.exit(failed ? 1 : 0);
