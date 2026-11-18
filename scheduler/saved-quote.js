/* ==========================================================================
   saved-quote.js — A SAVED TRIP'S QUOTE LINES
   --------------------------------------------------------------------------
   The line items a saved trip is quoted with, read from its row: the
   customer quote on the Forms page prints them, and the QuickBooks export
   writes them on the invoice, so the paper the customer signed and the
   invoice they are billed name the same lines in the same words, under the
   same bill-to.

   A trip is read with its `trip_quote_lines`, `trip_legs(*, trip_routes(*))`,
   `trip_stops` and `trip_assignments`. The words are `quote-text.js`'s and
   the legs `trip-shape.js`'s, both loaded first. Nothing here reads the page
   or the database.
   ========================================================================== */
(() => {
  'use strict';

  const SHAPE = window.SchedulerTripShape;
  const TEXT = window.SchedulerQuoteText;
  const { legOfKey, busesOfKey, onLegKey, stopsOfKey, keysWithStops } = SHAPE;
  const round2 = n => Math.round(n * 100) / 100;
  const number = v => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

  /* THE TWO TIMES THE QUOTE NAMES ARE THE GROUP'S, not the bus's. The group
     leaves the pickup at the first stop's `depart_prev` and is back at the
     yard row's, which is where the Route tab keeps what the editor labels
     Group departs and Group arrives. A leg that never comes back -- a one-way
     -- has no yard row, and its arrival is the last stop's. */
  function times(trip) {
    const legs = keysWithStops(trip);
    const out = stopsOfKey(trip, legs[0]);
    const home = stopsOfKey(trip, legs.at(-1));
    return {
      leave: out.find(s => s.type === 'stop')?.depart_prev || null,
      back: home.find(s => s.type === 'return')?.depart_prev
        || home.filter(s => s.type === 'stop').at(-1)?.arrive || null,
    };
  }

  /* The last day of the trip, the latest any leg ends. A blank form's trip
     has no legs and is read by its own columns. */
  const lastDay = trip => SHAPE.daysOf(trip)?.last
    ?? (trip.return_end_date || trip.return_start_date || trip.end_date || trip.start_date);

  /* Whether a leg's line names 56 seats: a vehicle on it carries the 56
     passengers need. A slot with no row yet asks for what the trip does, as
     the Buses tab seeds it. */
  function asks56(trip, leg) {
    const rows = (trip.trip_assignments || []).filter(a => onLegKey(trip, leg, a));
    const count = busesOfKey(trip, leg);
    return rows.some(a => a.needs?.pax56 === true)
      || (rows.length < Math.max(Number(count) || 0, 1) && !!trip.trip_reqs?.pax56);
  }

  // The trip's first leg, whose pickup and buses a whole-trip line names.
  const firstLegOf = trip => (Array.isArray(trip?.trip_legs) && SHAPE.firstLeg(trip)?.id) || 'outbound';
  const pickupOf = trip => stopsOfKey(trip, firstLegOf(trip)).find(s => s.type === 'pickup')?.address
    || trip.pickup_address || '';

  // The whole trip's description, in the wording the Billing tab copies.
  function description(trip) {
    const t = times(trip);
    const first = firstLegOf(trip);
    return TEXT.description({
      type: trip.trip_type,
      buses: legOfKey(trip, first) ? busesOfKey(trip, first) : trip.bus_count,
      pax56: asks56(trip, first),
      pickup: pickupOf(trip),
      destination: trip.destination,
      from: trip.start_date,
      to: lastDay(trip),
      leave: t.leave,
      back: t.back,
    });
  }

  /* ONE LEG'S DESCRIPTION, for a drop-off and pickup trip, which is quoted
     as two rentals. Each names its own buses, seats, days and the time the
     group leaves on that leg, and neither says when it arrives: to the
     customer each leg is a departure. Both are handed the trip's own pickup
     and destination, and quote-text.js names the leg and runs the way back
     from the destination, so the two lines read as one journey there and
     back. */
  function legDescription(trip, leg) {
    const out = SHAPE.wordOfKey(trip, leg);
    const shaped = legOfKey(trip, leg);
    const stops = stopsOfKey(trip, leg ?? out);
    return TEXT.description({
      type: trip.trip_type,
      buses: busesOfKey(trip, leg ?? out),
      pax56: asks56(trip, leg ?? out),
      pickup: pickupOf(trip),
      destination: trip.destination,
      from: shaped ? shaped.start : out === 'return' ? trip.return_start_date : trip.start_date,
      to: shaped ? shaped.end : out === 'return' ? (trip.return_end_date || trip.return_start_date) : (trip.end_date || trip.start_date),
      leave: stops.find(s => s.type === 'stop')?.depart_prev || null,
      leg: out,
    });
  }

  /* THE LINES: the trip's saved quote lines, in order, as the Billing tab
     keeps them, each `{ kind, item, desc, qty, cost, total }` with the
     figures as numbers or null. A rental line left without words takes the
     trip's own, a leg's on a drop-off and pickup trip. A trip with no lines
     is its quoted price as the rental, and a drop-off and pickup is two
     rentals, one per leg, the price shared between them to the cent. */
  function lines(trip) {
    const split = trip.trip_type === 'dropoff_pickup';
    const saved = (trip.trip_quote_lines || []).slice()
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    if (saved.length) {
      return saved.map(l => ({
        kind: l.kind || 'other',
        item: l.item || '',
        desc: l.description
          || (l.kind === 'rental' ? (split ? legDescription(trip, l.leg) : description(trip)) : ''),
        qty: number(l.quantity),
        cost: number(l.cost),
        total: number(l.amount),
      }));
    }
    const total = number(trip.quoted_price);
    const priced = total !== null && total !== 0;
    const shapedLegs = Array.isArray(trip?.trip_legs) ? SHAPE.legsOf(trip).map(l => l.id) : [];
    const legs = split ? (shapedLegs.length ? shapedLegs : ['outbound', 'return']) : [null];
    const share = priced ? round2(total / legs.length) : null;
    return legs.map((leg, i) => {
      // A whole trip's buses are its first leg's, as its one rental line has always counted.
      const buses = busesOfKey(trip, leg ?? firstLegOf(trip));
      const n = Math.max(Number(buses) || 0, 1);
      const legTotal = !priced ? null : i < legs.length - 1 ? share : round2(total - share * (legs.length - 1));
      return {
        kind: 'rental',
        item: 'Bus Rental',
        desc: split ? legDescription(trip, leg) : description(trip),
        qty: buses ? n : null,
        cost: priced ? round2(legTotal / n) : null,
        total: legTotal,
      };
    });
  }

  /* THE BILL-TO UNDER A CUSTOMER'S NAME, which the printed quote and the
     QuickBooks invoice both write: its bill-to address as typed, or else its
     usual pickup's address, the street over the city. The customer is read
     as `customers(bill_to, usual:usual_location_id(address))`. */
  function billTo(customer) {
    const typed = String(customer?.bill_to || '').split('\n').map(s => s.trim()).filter(Boolean);
    if (typed.length) return typed;
    const parts = String(customer?.usual?.address || '').split(',').map(s => s.trim()).filter(Boolean);
    if (/^(united states( of america)?|usa|us)$/i.test(parts.at(-1) || '')) parts.pop();
    if (!parts.length) return [];
    /* The city line is the last "City, ST 12345" in it, so a suite or a
       second street line stays with the street; an address that has none
       splits at its first comma. */
    const state = /^([A-Za-z]{2}\s+\d{5}(-\d{4})?|[A-Z]{2})$/;
    let city = -1;
    for (let i = parts.length - 1; i >= 1 && city < 0; i -= 1) {
      if (state.test(parts[i])) city = i - 1;
    }
    if (city < 1) return [parts[0], parts.slice(1).join(', ')].filter(Boolean);
    return [parts.slice(0, city).join(', '), parts.slice(city).join(', ')];
  }

  window.SchedulerSavedQuote = { lines, description, legDescription, lastDay, billTo };
})();
