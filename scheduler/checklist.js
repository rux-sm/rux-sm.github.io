/* ==========================================================================
   checklist.js — WHAT A TRIP STILL NEEDS BEFORE EACH LEG LEAVES
   --------------------------------------------------------------------------
   The one copy of the checklist's rules, read by the trip editor's Checklist
   tab, the trip's card and the Departures list. A leg's list is five groups
   in the order the work happens, and only the items the leg needs:

     Entered      the Route, Buses and Billing tabs each marked done
     Customer     confirmed, the itinerary received or not needed, a trip
                  contact
     Buses        every bus assigned and fit for the trip, every seat
                  filled, every driver confirmed
     Paperwork    itinerary printed, each driver's envelope printed, the
                  hours-of-service record where a part-time driver rides
     Extras       the hotel booked and the fuel card assigned, when wanted

   Entered and Customer are the trip's, so they sit on its first leg. A
   placeholder, a trip not quoted yet, has only Entered. Nothing here reads
   the database or the page: the trip row brings its own columns, and the
   page hands in each leg's buses and seats as `facts`, which leg-facts.js
   works out, so a rule lives here once whichever screen asks.
   ========================================================================== */
(() => {
  'use strict';

  const GROUPS = ['Entered', 'Customer', 'Buses', 'Paperwork', 'Extras'];
  // Where each item's button goes: an editor tab, or the Forms panel.
  const TABS = { route: 'route', buses: 'fleet', billing: 'billing', details: 'details', files: 'files', forms: 'forms' };

  const placeholder = trip => ['amber', 'orange', 'yellow'].includes(String(trip.trip_bar_color || '').toLowerCase());
  const hasItinerary = trip => (trip.trip_documents || []).some(d => String(d.label || '').toLowerCase() === 'itinerary');
  // A requirement the trip carries, from its tags, or the old column before it had them.
  const wants = (trip, id, legacy) => (trip.trip_reqs && id in trip.trip_reqs ? trip.trip_reqs[id] === true : !!trip[legacy]);
  // A trip's legs: the drop-off and pickup of a split trip, or its one leg.
  const legsOf = trip => (trip.trip_type === 'dropoff_pickup' ? ['outbound', 'return'] : ['outbound']);
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  /* One leg's items. `facts` is the board's reading of the leg's buses:
     { busesNeeded, busesAssigned, busesShort, seatsOpen, seats, unconfirmed,
       envelopesLeft, partTime }, where `seats` counts the seats with a driver
     in them. `tripContact` is whether the trip has a day-of contact. */
  function legItems(trip, leg, facts = {}, tripContact = false) {
    const first = leg === legsOf(trip)[0];
    const items = [];
    const add = (group, id, label, done, action, detail = null) => items.push({ group, id: `${id}:${leg}`, label, done: !!done, action, detail });

    if (first) {
      add('Entered', 'route-done', 'Route done', trip.route_done_at, TABS.route, trip.route_done_by);
      add('Entered', 'buses-done', 'Buses done', trip.buses_done_at, TABS.buses, trip.buses_done_by);
      add('Entered', 'billing-done', 'Billing done', trip.billing_done_at, TABS.billing, trip.billing_done_by);
    }
    if (placeholder(trip)) return items;

    if (first) {
      add('Customer', 'confirmed', 'Confirmed', trip.confirmed, TABS.billing);
      // An itinerary marked not needed stays on the list, done, so it can be taken back.
      const skipped = !hasItinerary(trip) && !!trip.itinerary_not_needed;
      add('Customer', 'itinerary', skipped ? 'Itinerary not needed' : 'Itinerary received',
        skipped || hasItinerary(trip), TABS.files);
      if (!trip.contact_not_needed) add('Customer', 'contact', 'Trip contact', tripContact, TABS.details);
    }

    const needed = facts.busesNeeded ?? 1;
    const assigned = facts.busesAssigned ?? 0;
    add('Buses', 'buses', 'Every bus assigned', assigned >= needed, TABS.buses,
      assigned >= needed ? null : `${assigned} of ${needed}`);
    if (facts.busesShort) {
      add('Buses', 'fit', 'Every bus fits the trip', false, TABS.buses, `${plural(facts.busesShort, 'bus falls', 'buses fall')} short`);
    }
    add('Buses', 'seats', 'Every seat filled', !facts.seatsOpen, TABS.buses,
      facts.seatsOpen ? `${plural(facts.seatsOpen, 'seat', 'seats')} open` : null);
    if (facts.seats) {
      add('Buses', 'drivers', 'Every driver confirmed', !facts.unconfirmed, TABS.buses,
        facts.unconfirmed ? `${plural(facts.unconfirmed, 'driver', 'drivers')} not confirmed` : null);
    }

    add('Paperwork', 'itinerary-printed', 'Itinerary printed', trip[`itinerary_printed_${leg}`], TABS.forms);
    if (facts.seats) {
      add('Paperwork', 'envelopes', 'Envelopes printed', !facts.envelopesLeft, TABS.forms,
        facts.envelopesLeft ? `${plural(facts.envelopesLeft, 'envelope', 'envelopes')} left` : null);
    }
    if (facts.partTime) add('Paperwork', 'hos', 'Hours of service printed', trip[`hos_form_printed_${leg}`], TABS.forms);

    if (wants(trip, 'hotel', 'need_hotel')) {
      add('Extras', 'hotel', 'Hotel booked', trip[`hotel_booked_${leg}`], TABS.billing, trip[`hotel_itinerary_number_${leg}`] || null);
    }
    if (wants(trip, 'fuelCard', 'need_fuel_card')) {
      add('Extras', 'fuel-card', 'Fuel card assigned', trip[`fuel_card_assigned_${leg}`], null, trip[`fuel_card_number_${leg}`] || null);
    }
    return items;
  }

  /* The trip's checklist, a leg at a time: `factsOf(leg)` gives the board's
     reading of each leg. A leg is Ready when nothing is left. */
  function checklist(trip, factsOf = () => ({}), tripContact = false) {
    return legsOf(trip).map(leg => {
      const items = legItems(trip, leg, factsOf(leg), tripContact);
      const left = items.filter(i => !i.done).length;
      return { leg, items, left, ready: left === 0 };
    });
  }

  // How many items the whole trip has left, for its card's one line.
  const leftOf = legs => legs.reduce((n, l) => n + l.left, 0);

  window.SchedulerChecklist = { GROUPS, TABS, legsOf, legItems, checklist, leftOf, placeholder };
})();
