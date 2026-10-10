/* ==========================================================================
   departures.js — WHAT A LEG LEAVING ON A DAY STILL NEEDS
   --------------------------------------------------------------------------
   The one copy of the Departures panel's rules: which days a day preps for,
   which legs leave on a day, and for one leg its page, a block for the trip
   and a block for each bus, every status one line. A line is

     { key, state, label, value, at, by, action, mark }

   `state` is `done`, `todo` or `warn`: done, the office's to do, or a
   problem sorted out somewhere else. `value` is what a line says beside its
   name, a PO or a contact; `at` and `by` are when a step was done and whose
   profile did it, where the database kept them; `action` is where a `todo`
   is done, `forms:<form>` for that form in the board's document panel or
   `contacts` for the trip's Contact list; `mark` is the column a `todo`
   step is kept in, for the panel to turn on where the step was done some
   other way, on the seat for a crew member's line and on the trip's
   `trip_prep` row for the trip's.

   The trip's lines are the whole trip's: confirmed, the itinerary received,
   No times where the leg's stops have none, the trip contact, what the
   customer still owes, the hotel where the office books it, and the driver
   details sent to the booking contact. A bus's block
   holds what the bus needs, met or not, its fuel card among them where the
   trip has one, and each crew member's lines:
   confirmed, then the itinerary, the envelope, the reminder, and the
   hours-of-service form for a part-time driver.

   Nothing here reads the database or the page. The trip row brings its
   columns, its `trip_prep` row and its seats with their steps, and the
   caller hands in the buses, the drivers and the driver statuses it read,
   as leg-facts.js takes them.
   Needs billing.js, follow-up.js, checklist.js, leg-facts.js and to-do.js.
   ========================================================================== */
(() => {
  'use strict';

  const Billing = window.SchedulerBilling;
  const FollowUp = window.SchedulerFollowUp;
  const Checklist = window.SchedulerChecklist;
  const Facts = window.SchedulerLegFacts;
  const ToDo = window.SchedulerToDo;

  const line = (key, state, label, more = {}) => ({ key, state, label, value: null, at: null, by: null, action: null, mark: null, ...more });
  const first = name => String(name || '').trim().split(/\s+/)[0] || '';
  const one = v => (Array.isArray(v) ? v[0] ?? null : v ?? null);
  const usd = n => Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  // A step a seat or the trip's prep row keeps: done with its stamp, or to do at `action` and kept in `column`.
  const step = (key, label, row, column, action) => (row?.[column]
    ? line(key, 'done', label, { at: row[`${column}_at`] ?? null, by: row[`${column}_by`] ?? null })
    : line(key, 'todo', label, { action, mark: column }));

  /* The days `today` preps for, each as `YYYY-MM-DD`: tomorrow, and every
     day after it until the office is open again, because nobody is in on a
     Saturday or a Sunday to prep the day that follows. A Friday preps
     Saturday, Sunday and Monday. */
  function prepDays(today) {
    const [y, m, d] = String(today).slice(0, 10).split('-').map(Number);
    const at = new Date(y, m - 1, d);
    const days = [];
    do {
      at.setDate(at.getDate() + 1);
      days.push(`${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`);
    } while (at.getDay() === 0 || at.getDay() === 6);
    return days;
  }

  /* The legs that leave on `day`, soonest trip first. A cancelled trip and a
     placeholder leave nothing. */
  function legsOn(trips, day) {
    const out = [];
    for (const trip of trips || []) {
      if (trip.cancelled_at || Checklist.placeholder(trip)) continue;
      for (const leg of Checklist.legsOf(trip)) {
        if (ToDo.legDay(trip, leg) === day) out.push({ trip, leg, day });
      }
    }
    return out;
  }

  function tripLines(trip, leg) {
    const lines = [];
    lines.push(trip.confirmed
      ? line('confirmed', 'done', 'Confirmed', { value: trip.po_ref ? `PO ${trip.po_ref}` : null })
      : line('confirmed', 'warn', 'Trip unconfirmed'));

    const itineraries = (trip.trip_documents || [])
      .filter(d => String(d.label || '').toLowerCase() === 'itinerary')
      .sort((a, b) => Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0));
    if (itineraries.length) lines.push(line('itinerary', 'done', 'Itinerary received', { at: itineraries[0].created_at ?? null }));
    else if (trip.itinerary_not_needed) lines.push(line('itinerary', 'done', 'Itinerary not needed'));
    else lines.push(line('itinerary', 'warn', 'Itinerary missing'));
    // Said only while it is true, as what the customer owes is: a leg with times has no line for them.
    if (!ToDo.hasTimes(trip, leg)) lines.push(line('times', 'warn', ToDo.KINDS.times.label));

    if (!trip.contact_not_needed) {
      const contact = Facts.dayOfContact(trip);
      lines.push(contact ? line('contact', 'done', 'Trip contact', { value: contact.name || null })
        : line('contact', 'warn', 'Trip contact missing'));
    }

    // What the customer still owes, in follow-up.js's words, with the figure.
    const waits = FollowUp.waitsOf(trip);
    const { remaining } = Billing.of(trip);
    for (const w of ['po', 'balance']) {
      if (waits.includes(w)) lines.push(line(w, 'warn', FollowUp.WORDS[w], { value: remaining > 0 ? usd(remaining) : null }));
    }

    // The office books the room only where the trip says so, by its tag or the older column.
    const hotel = trip.trip_reqs && 'hotel' in trip.trip_reqs ? trip.trip_reqs.hotel === true : !!trip.need_hotel;
    if (hotel) {
      lines.push(trip[`hotel_booked_${leg}`]
        ? line('hotel', 'done', 'Hotel booked', { value: trip[`hotel_itinerary_number_${leg}`] || null })
        : line('hotel', 'todo', 'Hotel booked', { action: 'billing' }));
    }

    const booker = first(Facts.tripContact(trip, 0)?.name);
    lines.push(step('driver-info', booker ? `Driver info sent to ${booker}` : 'Driver info sent',
      one(trip.trip_prep), 'driver_info_sent', 'contacts'));
    return lines;
  }

  /* One bus of the leg: what it needs, met or not, and its crew's lines. A
     row with no bus yet says so, and so does a seat with nobody in it. */
  function busBlock(trip, assign, { busesById = new Map(), driversById = new Map(), statuses = new Map() } = {}) {
    const bus = assign.bus_id != null ? busesById.get(assign.bus_id) ?? null : null;
    const needs = [];
    if (bus) {
      const type = Facts.wrongType(assign.vehicle_type, bus);
      if (assign.vehicle_type) needs.push({ id: 'type', label: assign.vehicle_type, met: !type });
      for (const id of Facts.needsFor(trip, assign)) {
        if (!Facts.isVehicleNeed(id)) continue;
        needs.push({ id, label: Facts.requirementLabel(id), met: !Facts.shortfall(id, bus) });
      }
    }
    // A trip with a fuel card asks one of every bus, by its number; it is typed on the first driver's envelope.
    const wantsCard = trip.trip_reqs && 'fuelCard' in trip.trip_reqs ? trip.trip_reqs.fuelCard === true : !!trip.need_fuel_card;
    if (wantsCard) {
      const number = String(assign.fuel_card_number ?? '').trim();
      needs.push({ id: 'fuelCard', label: number ? `Fuel card ${number}` : 'Fuel card', met: !!number, action: 'forms:envelope' });
    }
    const crew = [];
    for (const c of Facts.crewOf(trip, assign, driversById, statuses)) {
      if (c.needed) {
        crew.push({ key: `${assign.id}:${c.role}`, name: null, role: c.label, partTime: false, seat: null,
          lines: [line('seat', 'warn', `${c.label} needed`)] });
        continue;
      }
      const seat = (assign.trip_drivers || []).find(d => d.driver_id === c.driverId && (d.role || 'driver') === c.role) ?? null;
      const partTime = c.who?.employment_type === 'part-time';
      const confirmed = c.status?.value === 'confirmed';
      const lines = [
        confirmed
          ? line('confirmed', 'done', 'Confirmed', { at: c.row?.acceptedAt ?? c.row?.updatedAt ?? null })
          : line('confirmed', 'warn', c.status?.value === 'off' || !c.status ? 'Trip not sent' : c.status.label),
        step('itinerary', 'Itinerary', seat, 'itinerary_printed', 'forms:itinerary'),
        step('envelope', 'Envelope', seat, 'envelope_printed', 'forms:envelope'),
        step('reminder', 'Reminder', seat, 'trip_reminder_sent', 'contacts'),
      ];
      if (partTime) lines.push(step('hos', 'HOS form', seat, 'hos_form_printed', 'forms:hos'));
      /* Where the customer asks for driver forms: a form the driver lacks is
         said by its kind, and once each is on file they are one step to print. */
      const forms = Facts.driverFormsOf(trip, assign.leg || 'outbound', c.driverId);
      for (const f of forms.filter(x => !x.ok)) lines.push(line(`form:${f.kindId}`, 'warn', `No current ${f.kind}`));
      if (forms.length && forms.every(f => f.ok)) lines.push(step('driver-forms', 'Driver forms', seat, 'driver_forms_printed', 'trip-forms'));
      crew.push({ key: seat?.id ?? `${assign.id}:${c.role}:${c.driverId}`, name: c.who ? (c.who.short_name || c.who.name) : 'Unknown driver',
        role: c.label, partTime, seat, driverId: c.driverId, lines });
    }
    const left = (bus ? 0 : 1) + needs.filter(n => !n.met).length
      + crew.reduce((n, c) => n + c.lines.filter(l => l.state !== 'done').length, 0);
    return { key: assign.id, assign, bus, needs, crew, left };
  }

  /* A leg's page: the trip's lines, then a block for each bus the leg has, in
     the order the trip keeps them, and how many lines are not done. */
  function page(trip, leg, read = {}) {
    const lines = tripLines(trip, leg);
    const buses = (trip.trip_assignments || [])
      .filter(a => (a.leg || 'outbound') === leg)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map(a => busBlock(trip, a, read));
    const tripLeft = lines.filter(l => l.state !== 'done').length;
    const needed = leg === 'return' ? (trip.return_bus_count || trip.bus_count || 1) : (trip.bus_count || 1);
    // A bus the leg needs and has no row for is one more thing left.
    const missing = Math.max(0, needed - buses.length);
    return { trip, leg, legName: ToDo.legName(trip, leg), day: ToDo.legDay(trip, leg), lines, tripLeft,
      buses, missing, left: tripLeft + missing + buses.reduce((n, b) => n + b.left, 0) };
  }

  // How many legs leave on a day and how many of them are ready.
  function summary(trips, day, read = {}) {
    const pages = legsOn(trips, day).map(l => page(l.trip, l.leg, read));
    return { legs: pages.length, ready: pages.filter(p => p.left === 0).length };
  }

  window.SchedulerDepartures = { prepDays, legsOn, page, summary };
})();
