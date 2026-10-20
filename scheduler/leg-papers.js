/* ==========================================================================
   Rux Scheduler — LEG PAPERS, the itinerary and the contacts a leg is handed
   --------------------------------------------------------------------------
   The one reading of which of a trip's itinerary files and day-of contacts
   belong to a leg, loaded by every page that hands a leg's papers to anyone:
   the board, the forms, the driver pages and the connector's rules.

   A FILE AND A CONTACT CARRY THE LEG THEY WERE ENTERED UNDER, in
   `trip_documents.leg` and `trips.trip_contact_<n>_leg`: `outbound` is a
   split trip's drop-off, `return` its pickup. One with none, which is every
   one saved before the column, is the
   drop-off's. The pickup takes the drop-off's until it has its own, so a
   customer's one paper and one set of contacts for the whole trip are
   entered once. Only a split trip has a pickup leg of its own, so on any
   other trip every file and contact is the trip's whatever its leg says.

   Nothing here reads the page or the database, and it needs nothing loaded
   first.
   ========================================================================== */
(() => {
  'use strict';

  const SPLIT = 'dropoff_pickup';
  const clean = v => String(v ?? '').trim();
  const isSplit = trip => trip?.trip_type === SPLIT;

  /* A split trip's rows for a leg: the pickup's own, or the drop-off's while
     it has none; the drop-off's are every row not the pickup's. On any other
     trip, every row. */
  function forLeg(trip, leg, rows) {
    if (!isSplit(trip)) return rows;
    const pickup = rows.filter(r => r.leg === 'return');
    const dropoff = rows.filter(r => r.leg !== 'return');
    return leg === 'return' && pickup.length ? pickup : dropoff;
  }

  /* THE ITINERARY, by the office's rule: a file whose type is Itinerary and
     no other, so a file named after one is not one. A leg's are newest
     first, and the first is the one its drivers are handed. */
  const isItinerary = d => clean(d?.label).toLowerCase() === 'itinerary';
  const newestFirst = (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0);
  const allItineraries = trip => (trip?.trip_documents || []).filter(isItinerary).sort(newestFirst);
  const itinerariesFor = (trip, leg) => forLeg(trip, leg, allItineraries(trip));
  const itineraryFor = (trip, leg) => itinerariesFor(trip, leg)[0] ?? null;
  // The itineraries no leg is handed any more, newest first: the earlier versions.
  const earlierItineraries = trip => {
    const current = new Set([itineraryFor(trip, 'outbound'), ...(isSplit(trip) ? [itineraryFor(trip, 'return')] : [])]);
    return allItineraries(trip).filter(d => !current.has(d));
  };

  /* THE DAY-OF CONTACTS, slots 1 to 5, as the trip records them: the trip's
     own copy of the name and phone, and a slot with neither the contact
     linked beside it. `read` may read a slot another
     way, as leg-facts.js does; it answers `{ name, phone }` or null. */
  function slotContact(trip, n) {
    const name = clean(trip[`trip_contact_${n}_name`]);
    const phone = clean(trip[`trip_contact_${n}_phone`]);
    if (name || phone) return { id: trip[`trip_contact_${n}_id`] ?? null, name, phone };
    const linked = trip[`c${n}`];
    return linked && (clean(linked.name) || clean(linked.phone))
      ? { id: linked.id ?? null, name: clean(linked.name), phone: clean(linked.phone) } : null;
  }
  // A leg's contacts in slot order, each with its `slot` and stored `leg`.
  function contactsFor(trip, leg, read = slotContact) {
    const filled = [1, 2, 3, 4, 5]
      .map(n => { const c = read(trip, n); return c ? { ...c, slot: n, leg: trip[`trip_contact_${n}_leg`] ?? null } : null; })
      .filter(Boolean);
    return forLeg(trip, leg, filled);
  }

  window.SchedulerLegPapers = {
    SPLIT, isSplit, forLeg,
    isItinerary, allItineraries, itinerariesFor, itineraryFor, earlierItineraries,
    slotContact, contactsFor,
  };
})();
