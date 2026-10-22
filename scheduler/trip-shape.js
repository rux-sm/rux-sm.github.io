/* ==========================================================================
   Rux Scheduler — TRIP SHAPE, a trip's legs, routes, papers and contacts
   --------------------------------------------------------------------------
   The one reading of how a trip runs: its legs, each one time a bus leaves
   the yard and comes back, in date order; each leg's routes; and which
   itinerary files and day-of contacts each leg is handed. A trip is read
   with `trip_legs(*, trip_routes(*))`, `trip_documents` and
   `trip_contacts`; a row names its leg by `leg_id`, or its route by
   `route_id`.

   THE FIRST LEG STANDS IN FOR A LEG WITH NONE OF ITS OWN. A file or a
   contact with no leg is the trip's, and the first leg's with it; a later
   leg is handed its own, or the first leg's while it has none, so a
   customer's one paper and one set of contacts for the whole trip are
   entered once. On a trip of one leg every row is that leg's.

   Nothing here reads the page or the database, and it needs nothing loaded
   first.
   ========================================================================== */
(() => {
  'use strict';

  const clean = v => String(v ?? '').trim();
  const day = v => clean(v).slice(0, 10);
  // The old words, in the order the legs they name run.
  const WORD_ORDER = { outbound: 0, return: 1 };

  /* A trip's legs by date, each with its number from 1 and its routes by
     position. Two legs on one day keep the order of the words they mirror,
     then the order they were made, and a leg with no date comes last. */
  function legsOf(trip) {
    const legs = (trip?.trip_legs || []).map(l => ({
      id: l.id,
      word: l.leg ?? null,
      kind: l.kind === 'one_way' ? 'one_way' : 'round_trip',
      start: day(l.start_date) || null,
      end: day(l.end_date) || day(l.start_date) || null,
      busCount: Number.isInteger(l.bus_count) ? l.bus_count : null,
      hotelBooked: !!l.hotel_booked,
      hotelNumber: clean(l.hotel_itinerary_number) || null,
      routes: [...(l.trip_routes || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map(r => ({ id: r.id, position: r.position ?? 1, name: clean(r.name) || null })),
      created: l.created_at || '',
    }));
    legs.sort((a, b) => (!a.start - !b.start) || (a.start || '').localeCompare(b.start || '')
      || (WORD_ORDER[a.word] ?? 2) - (WORD_ORDER[b.word] ?? 2)
      || a.created.localeCompare(b.created));
    return legs.map((l, i) => ({ ...l, number: i + 1 }));
  }
  const legOf = (trip, legId) => legsOf(trip).find(l => l.id === legId) ?? null;
  const firstLeg = trip => legsOf(trip)[0] ?? null;
  // The leg an old word names, while rows still carry the word.
  const legOfWord = (trip, word) => legsOf(trip).find(l => l.word === (word || 'outbound')) ?? null;
  // "2 of 3" on a trip of several legs, and nothing on a trip of one.
  function legLabel(trip, legId) {
    const legs = legsOf(trip);
    const leg = legs.find(l => l.id === legId);
    return leg && legs.length > 1 ? `${leg.number} of ${legs.length}` : '';
  }
  /* A trip's days: `first`, the day its first leg starts, and `last`, the
     latest day any leg ends; null for a trip read without its legs. */
  function daysOf(trip) {
    const legs = legsOf(trip).filter(l => l.start);
    if (!legs.length) return null;
    return { first: legs[0].start, last: legs.reduce((d, l) => (l.end > d ? l.end : d), legs[0].end) };
  }
  // The leg a route is on.
  const legOfRoute = (trip, routeId) => legsOf(trip).find(l => l.routes.some(r => r.id === routeId)) ?? null;

  /* A leg's rows of a kind that names a leg, as the rule above hands them:
     on a trip of one leg, all of them; the first leg's are those naming it
     or no leg we know; a later leg's are its own, or the first leg's while
     it has none. */
  function forLeg(trip, legId, rows) {
    const legs = legsOf(trip);
    if (legs.length <= 1) return rows;
    const first = legs[0].id;
    const known = new Set(legs.map(l => l.id));
    const firsts = rows.filter(r => !r.leg_id || r.leg_id === first || !known.has(r.leg_id));
    if (legId === first) return firsts;
    const own = rows.filter(r => r.leg_id === legId);
    return own.length ? own : firsts;
  }

  /* THE ITINERARY, by the office's rule: a file whose type is Itinerary and
     no other, so a file named after one is not one. A leg's are newest
     first, and the first is the one its drivers are handed. */
  const isItinerary = d => clean(d?.label).toLowerCase() === 'itinerary';
  const newestFirst = (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0);
  const allItineraries = trip => (trip?.trip_documents || []).filter(isItinerary).sort(newestFirst);
  const itinerariesFor = (trip, legId) => forLeg(trip, legId, allItineraries(trip));
  const itineraryFor = (trip, legId) => itinerariesFor(trip, legId)[0] ?? null;
  // The itineraries no leg is handed any more, newest first: the earlier versions.
  function earlierItineraries(trip) {
    const current = new Set(legsOf(trip).map(l => itineraryFor(trip, l.id)).filter(Boolean));
    if (!legsOf(trip).length && allItineraries(trip)[0]) current.add(allItineraries(trip)[0]);
    return allItineraries(trip).filter(d => !current.has(d));
  }

  /* THE DAY-OF CONTACTS, the trip's list in its order: each a name, a phone,
     or both, and the contact it links. */
  const allContacts = trip => [...(trip?.trip_contacts || [])]
    .filter(c => clean(c.name) || clean(c.phone))
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map(c => ({ id: c.contact_id ?? null, name: clean(c.name), phone: clean(c.phone), leg_id: c.leg_id ?? null, row: c.id }));
  const contactsFor = (trip, legId) => forLeg(trip, legId, allContacts(trip));

  // A route's stops and vehicles, each in its order.
  const byPosition = (a, b) => (a.position ?? 0) - (b.position ?? 0);
  const stopsOfRoute = (trip, routeId) => (trip?.trip_stops || []).filter(s => s.route_id === routeId).sort(byPosition);
  const vehiclesOfRoute = (trip, routeId) => (trip?.trip_assignments || []).filter(a => a.route_id === routeId).sort(byPosition);

  window.SchedulerTripShape = {
    legsOf, legOf, firstLeg, legOfWord, legLabel, legOfRoute, forLeg, daysOf,
    isItinerary, allItineraries, itinerariesFor, itineraryFor, earlierItineraries,
    allContacts, contactsFor, stopsOfRoute, vehiclesOfRoute,
  };
})();
