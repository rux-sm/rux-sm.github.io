// Runs trip-shape.js, a trip's legs, routes, papers and contacts, against
// invented trips: a day trip of one leg, a split trip whose pickup has its
// own paper and contacts or none, a booking of three legs read in date order
// with two routes on one leg, and a leg added before the first.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const window = {};
runInNewContext(readFileSync(new URL('../trip-shape.js', import.meta.url), 'utf8'), { window, Date });
const S = window.SchedulerTripShape;

let failed = 0;
function expect(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`   ${ok ? 'ok  ' : 'FAIL'}  ${name}${ok ? '' : `\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`}`);
}
const ids = rows => rows.map(r => r.id ?? r.name);
const leg = (id, start, more = {}) => ({ id, start_date: start, end_date: start, bus_count: 1, kind: 'round_trip',
  trip_routes: [{ id: `${id}-r1`, position: 1, name: null }], created_at: '2027-01-01T00:00:00Z', ...more });
const doc = (id, created_at, leg_id = null, label = 'Itinerary') => ({ id, label, created_at, leg_id });
const contact = (name, position, leg_id = null, phone = null) => ({ id: `row-${name}`, name, phone, position, leg_id, contact_id: null });

// A day trip: one leg, so every file and contact is its own, whatever leg it names.
const dayTrip = { trip_legs: [leg('a', '2027-01-10', { leg: 'outbound' })],
  trip_documents: [doc('old', '2027-01-01'), doc('new', '2027-01-05', 'gone'), doc('po', '2027-01-06', null, 'PO')],
  trip_contacts: [contact('Pat', 2), contact('Lee', 1, 'gone')] };
expect('a day trip has one leg, numbered 1, with its route, and no "1 of 1"',
  [S.legsOf(dayTrip).map(l => [l.id, l.number, l.routes.map(r => r.id)]), S.legLabel(dayTrip, 'a')], [[['a', 1, ['a-r1']]], '']);
expect('a one-leg trip is handed every itinerary, newest first, and every contact in order, and the PO is no itinerary',
  [ids(S.itinerariesFor(dayTrip, 'a')), ids(S.contactsFor(dayTrip, 'a')), ids(S.earlierItineraries(dayTrip))],
  [['new', 'old'], ['Lee', 'Pat'], ['old']]);

// A split trip: the drop-off and the pickup, as the old words name them.
const split = (docs, contacts) => ({ trip_legs: [leg('back', '2027-01-15', { leg: 'return', kind: 'one_way' }), leg('out', '2027-01-13', { leg: 'outbound', kind: 'one_way' })],
  trip_documents: docs, trip_contacts: contacts });
const both = split([doc('one', '2027-01-02')], [contact('Pat', 1)]);
expect('a split trip\'s legs run by date, the drop-off first, 1 of 2 and 2 of 2, each one way',
  [S.legsOf(both).map(l => [l.id, l.word, l.kind]), S.legLabel(both, 'out'), S.legLabel(both, 'back')],
  [[['out', 'outbound', 'one_way'], ['back', 'return', 'one_way']], '1 of 2', '2 of 2']);
expect('one paper and one contact for the whole trip are handed to both days',
  [ids(S.itinerariesFor(both, 'out')), ids(S.itinerariesFor(both, 'back')), ids(S.contactsFor(both, 'back'))], [['one'], ['one'], ['Pat']]);
const own = split([doc('tue', '2027-01-02'), doc('wed', '2027-01-03', 'back')], [contact('Pat', 1), contact('Sam', 2, 'back'), contact('Lee', 3, 'out')]);
expect('a pickup with its own paper and contact is handed those, and the drop-off the rest',
  [ids(S.itinerariesFor(own, 'out')), ids(S.itinerariesFor(own, 'back')), ids(S.contactsFor(own, 'out')), ids(S.contactsFor(own, 'back'))],
  [['tue'], ['wed'], ['Pat', 'Lee'], ['Sam']]);
expect('no itinerary is an earlier version while each day is handed one', ids(S.earlierItineraries(own)), []);
const onlyPickup = split([doc('wed', '2027-01-03', 'back')], []);
expect('a drop-off whose only file is the pickup\'s is handed none', [ids(S.itinerariesFor(onlyPickup, 'out')), S.itineraryFor(onlyPickup, 'out')], [[], null]);
expect('the old words still find their legs, no word being the drop-off', [S.legOfWord(own, 'return').id, S.legOfWord(own, null).id], ['back', 'out']);

// A booking of three legs: a two-day overnight leg with two routes, then a day home, then another.
const booking = { trip_legs: [
  leg('c', '2027-03-04'), leg('a', '2027-03-01', { end_date: '2027-03-02', bus_count: 5,
    trip_routes: [{ id: 'band', position: 2, name: 'Band' }, { id: 'team', position: 1, name: 'Team' }] }), leg('b', '2027-03-03')],
  trip_stops: [{ id: 's2', route_id: 'band', position: 1 }, { id: 's1', route_id: 'band', position: 0 }, { id: 's3', route_id: 'team', position: 0 }],
  trip_assignments: [{ id: 'v1', route_id: 'team', position: 0 }, { id: 'v2', route_id: 'band', position: 1 }],
  trip_documents: [], trip_contacts: [contact('Pat', 1, null, '555-010-0001'), contact('', 2, 'b', '555-010-0002')] };
expect('three legs run by date, the first two days long with five buses, labelled 1 to 3 of 3',
  S.legsOf(booking).map(l => [l.id, l.start, l.end, l.busCount, S.legLabel(booking, l.id)]),
  [['a', '2027-03-01', '2027-03-02', 5, '1 of 3'], ['b', '2027-03-03', '2027-03-03', 1, '2 of 3'], ['c', '2027-03-04', '2027-03-04', 1, '3 of 3']]);
expect('a leg\'s routes run by position, each with its name, and a route finds its leg',
  [S.legOf(booking, 'a').routes.map(r => [r.id, r.name]), S.legOfRoute(booking, 'band').id], [[['team', 'Team'], ['band', 'Band']], 'a']);
expect('a route\'s stops and vehicles are its own, in order', [ids(S.stopsOfRoute(booking, 'band')), ids(S.vehiclesOfRoute(booking, 'team'))], [['s1', 's2'], ['v1']]);
expect('a contact with only a phone counts, and a leg with none of its own takes the first leg\'s',
  [S.contactsFor(booking, 'b').map(c => c.phone), S.contactsFor(booking, 'c').map(c => c.name)], [['555-010-0002'], ['Pat']]);

// A leg added before the first runs first, and the first leg is whichever runs first.
const earlier = { ...booking, trip_legs: [...booking.trip_legs, leg('z', '2027-02-28')] };
expect('a leg added before the others becomes leg 1, and the first leg\'s papers are now its',
  [S.firstLeg(earlier).id, S.legLabel(earlier, 'a'), S.contactsFor(earlier, 'z').map(c => c.name)], ['z', '2 of 4', ['Pat']]);
expect('a trip read without its legs has none, and hands nothing out', [S.legsOf({}), S.contactsFor({}, null)], [[], []]);
const undated = { trip_legs: [leg('later', null, { leg: 'return' }), leg('first', '2027-01-13', { leg: 'outbound' })] };
expect('a leg with no date comes after every dated one', S.legsOf(undated).map(l => [l.id, l.number]), [['first', 1], ['later', 2]]);

// A trip's days and whether it is a split.
expect('a trip\'s days run from its first leg\'s start to the latest day any leg ends, and none without legs',
  [S.daysOf(booking), S.daysOf(both), S.daysOf({})], [{ first: '2027-03-01', last: '2027-03-04' }, { first: '2027-01-13', last: '2027-01-15' }, null]);
const oneWay = { trip_legs: [leg('out', '2027-01-13', { kind: 'one_way' })] };
expect('two one-way legs are a split, the later the pickup; one one-way leg and round-trip legs are not',
  [S.isSplit(both), S.isPickup(both, 'out'), S.isPickup(both, 'back'), S.isSplit(oneWay), S.isPickup(oneWay, 'out'), S.isSplit(booking), S.isPickup(booking, 'b')],
  [true, false, true, false, false, false, false]);

console.log(failed ? `\n  ${failed} trip shape case(s) failed` : '\n  trip shape: every case passed');
process.exit(failed ? 1 : 0);
