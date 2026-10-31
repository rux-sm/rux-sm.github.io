/* ==========================================================================
   checklist.js — WHAT A TRIP STILL NEEDS BEFORE EACH LEG LEAVES
   --------------------------------------------------------------------------
   The one copy of the checklist's rules, read by the Departures list and
   the to-do rules. A leg's list is five groups
   in the order the work happens, and only the items the leg needs:

     Entered      the Route, Buses and Billing tabs each marked done
     Customer     confirmed, the itinerary received or not needed, a trip
                  contact
     Buses        every bus assigned and fit for the trip, nothing in a
                  bus's or a driver's way, every seat filled, every driver
                  confirmed, no driver declined, and every driver told of a
                  change since they accepted
     Paperwork    each driver's itinerary and envelope printed, the
                  hours-of-service record of each part-time driver, and each
                  driver's form of a kind the customer asks for
     Extras       the hotel booked and each bus's fuel card assigned, when
                  wanted

   Entered and Customer are the trip's, so they sit on its first leg. A
   placeholder, as billing.js reads one, has only Entered. Nothing here reads
   the database or the page: the trip row brings its own columns, read with
   its legs as trip-shape.js reads them, and the page hands in each leg's
   buses and seats as `facts`, which leg-facts.js works out, so a rule lives
   here once whichever screen asks. A leg is named by its key, week.js's,
   which is its id.
   ========================================================================== */
(() => {
  'use strict';

  const GROUPS = ['Entered', 'Customer', 'Buses', 'Paperwork', 'Extras'];
  // Where each item's button goes: an editor tab, the Forms panel, or the customer's itinerary in the document panel.
  const TABS = { route: 'route', buses: 'fleet', billing: 'billing', details: 'details', files: 'files', forms: 'forms', itinerary: 'itinerary' };

  const placeholder = trip => window.SchedulerBilling.placeholder(trip);
  // week.js loads after this file, so it is read when asked.
  const Week = () => window.SchedulerWeek;
  // A trip's legs by their keys, in date order.
  const legsOf = trip => Week().legsOf(trip).map(l => l.key);
  // The first leg's itinerary, which a later leg is handed too until it has its own.
  const hasItinerary = trip => !!window.SchedulerTripShape.itineraryFor(trip, legsOf(trip)[0]);
  // A requirement the trip carries, from its tags, or the old column before it had them.
  const wants = (trip, id) => trip.trip_reqs?.[id] === true;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  /* One leg's items. `facts` is the board's reading of the leg's buses:
     { busesNeeded, busesAssigned, busesShort, seatsOpen, seats, unconfirmed,
       envelopesLeft, itinerariesLeft, partTime, hosLeft, fuelCardsLeft,
       formsWanted, formsMissing, formsLeft, clashes, declined, toTell },
     where `seats`
     counts the seats with a driver in them. `tripContact` is whether the trip
     has a day-of contact. */
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
    // What stands in the way, as clashes.js says it, where the page read it.
    if (facts.clashes?.length) add('Buses', 'clashes', 'No clashes', false, TABS.buses, facts.clashes.join(' · '));
    add('Buses', 'seats', 'Every seat filled', !facts.seatsOpen, TABS.buses,
      facts.seatsOpen ? `${plural(facts.seatsOpen, 'seat', 'seats')} open` : null);
    if (facts.seats) {
      add('Buses', 'drivers', 'Every driver confirmed', !facts.unconfirmed, TABS.buses,
        facts.unconfirmed ? `${plural(facts.unconfirmed, 'driver', 'drivers')} not confirmed` : null);
    }
    // A driver who said no, and a change a driver has not been told of, each said by name.
    if (facts.declined?.length) add('Buses', 'declined', 'No driver declined', false, TABS.buses, facts.declined.map(d => `${d.name} declined`).join(' · '));
    if (facts.toTell?.length) add('Buses', 'told', 'Every driver told of changes', false, 'contacts', facts.toTell.map(d => `Tell ${d.name}: ${d.lines.join(', ')}`).join(' · '));

    // Each driver is handed their own, so with nobody in a seat it is not printed yet.
    // The sheet is the itinerary the customer sent where the trip has one, and the one Forms draws where it has none.
    add('Paperwork', 'itinerary-printed', 'Itinerary printed', facts.seats && !facts.itinerariesLeft, hasItinerary(trip) ? TABS.itinerary : TABS.forms,
      facts.itinerariesLeft ? `${plural(facts.itinerariesLeft, 'itinerary', 'itineraries')} left` : null);
    if (facts.seats) {
      add('Paperwork', 'envelopes', 'Envelopes printed', !facts.envelopesLeft, TABS.forms,
        facts.envelopesLeft ? `${plural(facts.envelopesLeft, 'envelope', 'envelopes')} left` : null);
    }
    if (facts.partTime) {
      add('Paperwork', 'hos', 'Hours of service printed', !facts.hosLeft, TABS.forms,
        facts.hosLeft ? `${plural(facts.hosLeft, 'form', 'forms')} left` : null);
    }
    // A form nobody has uploaded is said by name, since printing cannot fix it.
    if (facts.formsWanted && facts.seats) {
      const missing = facts.formsMissing || [];
      add('Paperwork', 'driver-forms', 'Driver forms printed', !missing.length && !facts.formsLeft, TABS.forms,
        missing.length ? `No current form: ${missing.join('; ')}`
          : facts.formsLeft ? `${plural(facts.formsLeft, 'driver', 'drivers')} left` : null);
    }

    if (wants(trip, 'hotel')) {
      const marks = Week().legByKey(trip, leg);
      add('Extras', 'hotel', 'Hotel booked', marks?.hotelBooked, TABS.billing, marks?.hotelNumber || null);
    }
    // A card is a bus's, its number typed on the first driver's envelope.
    if (wants(trip, 'fuelCard')) {
      add('Extras', 'fuel-card', 'Fuel card assigned', !facts.fuelCardsLeft, TABS.forms,
        facts.fuelCardsLeft ? `${plural(facts.fuelCardsLeft, 'bus', 'buses')} without a card` : null);
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

  window.SchedulerChecklist = { GROUPS, TABS, legsOf, legItems, checklist, leftOf };
})();
