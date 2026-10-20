/* ==========================================================================
   departures.js — WHAT A LEG LEAVING ON A DAY STILL NEEDS
   --------------------------------------------------------------------------
   The one copy of the Departures panel's rules: which days a day preps for,
   which legs leave on a day, and for one leg its page, a block for the trip
   and a block for each bus, every status one line. A line is

     { key, state, label, value, at, by, action, mark }

   `state` is `done`, `todo` or `warn`: done, the office's to do, or a
   problem sorted out somewhere else. `label` is a short name and `value` the
   word or two at the line's end, as Confirmation and the PO that did it, or
   Itinerary and Missing, so a line is one line; `at` and `by` are when a step was done and whose
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
   trip has one, and anything in the bus's way, and each crew member's lines:
   confirmed, then the itinerary, the envelope, the reminder, the
   hours-of-service form for a part-time driver, anything in the driver's
   way, and a change since they accepted that they have not been told of, as
   driver-job.js reads it. What is in the way is clashes.js's standing rule, read against the
   `nearby` trips, time off and days out the caller hands in.

   `page` reads neither the database nor the page. The trip row brings its
   columns, its `trip_prep` row and its seats with their steps, and the
   caller hands in the buses, the drivers and the driver statuses it read,
   as leg-facts.js takes them. `readDay` and `readTrip`, handed a client and
   leg-facts.js's `readBasics`, read all of that, so Prep and the connector
   ask the same.
   Needs billing.js, follow-up.js, checklist.js, leg-facts.js and to-do.js,
   and for the reads week.js and clashes.js.
   ========================================================================== */
(() => {
  'use strict';

  const Billing = window.SchedulerBilling;
  const FollowUp = window.SchedulerFollowUp;
  const Checklist = window.SchedulerChecklist;
  const Facts = window.SchedulerLegFacts;
  const ToDo = window.SchedulerToDo;

  const line = (key, state, label, more = {}) => ({ key, state, label, value: null, at: null, by: null, action: null, mark: null, ...more });
  const one = v => (Array.isArray(v) ? v[0] ?? null : v ?? null);
  const usd = n => Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  // A step a seat or the trip's prep row keeps: done with its stamp, or to do at `action` and kept in `column`.
  const step = (key, label, row, column, action, done = null) => (row?.[column]
    ? line(key, 'done', label, { value: done, at: row[`${column}_at`] ?? null, by: row[`${column}_by`] ?? null })
    : line(key, 'todo', label, { action, mark: column }));

  // What confirmed a trip, in a word, a PO by its number; null where the trip says only that it is.
  const CONFIRMED_BY = { contract_signed: 'Contract', deposit_received: 'Deposit', paid_full: 'Paid', overpaid: 'Paid' };
  function confirmedBy(trip) {
    const rung = Billing.confirmRungOf(Billing.of(trip).rung);
    if (rung === 'po_received') return trip.po_ref ? `PO ${trip.po_ref}` : 'PO';
    return CONFIRMED_BY[rung] ?? null;
  }
  // What the customer still owes, as a short name.
  const OWED = { po: 'PO or payment', balance: 'Balance' };

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
      if (trip.cancelled_at || window.SchedulerBilling.placeholder(trip)) continue;
      for (const leg of Checklist.legsOf(trip)) {
        if (ToDo.legDay(trip, leg) === day) out.push({ trip, leg, day });
      }
    }
    return out;
  }

  function tripLines(trip, leg) {
    const lines = [];
    lines.push(trip.confirmed
      ? line('confirmed', 'done', 'Confirmation', { value: confirmedBy(trip) })
      : line('confirmed', 'warn', 'Confirmation', { value: 'Not yet' }));

    // The leg's own, or a split trip's pickup with none the drop-off's.
    const itinerary = window.SchedulerLegPapers.itineraryFor(trip, leg);
    if (itinerary) lines.push(line('itinerary', 'done', 'Itinerary', { value: 'Received', at: itinerary.created_at ?? null }));
    else if (trip.itinerary_not_needed) lines.push(line('itinerary', 'done', 'Itinerary', { value: 'Not needed' }));
    else lines.push(line('itinerary', 'warn', 'Itinerary', { value: 'Missing' }));
    // Said only while it is true, as what the customer owes is: a leg with times has no line for them.
    if (!ToDo.hasTimes(trip, leg)) lines.push(line('times', 'warn', 'Times', { value: 'Missing' }));

    if (!trip.contact_not_needed) {
      const contact = Facts.dayOfContact(trip, leg);
      lines.push(contact ? line('contact', 'done', 'Contact', { value: contact.name || null })
        : line('contact', 'warn', 'Contact', { value: 'Missing' }));
    }

    // What the customer still owes, as follow-up.js counts it, with the figure.
    const waits = FollowUp.waitsOf(trip);
    const { remaining } = Billing.of(trip);
    for (const w of ['po', 'balance']) {
      if (waits.includes(w)) lines.push(line(w, 'warn', OWED[w], { value: remaining > 0 ? `${usd(remaining)} due` : 'Due' }));
    }

    // The office books the room only where the trip says so, by its tag or the older column.
    const hotel = trip.trip_reqs && 'hotel' in trip.trip_reqs ? trip.trip_reqs.hotel === true : !!trip.need_hotel;
    if (hotel) {
      lines.push(trip[`hotel_booked_${leg}`]
        ? line('hotel', 'done', 'Hotel', { value: trip[`hotel_itinerary_number_${leg}`] || 'Booked' })
        : line('hotel', 'todo', 'Hotel', { action: 'billing' }));
    }

    lines.push(step('driver-info', 'Driver info', one(trip.trip_prep), 'driver_info_sent', 'contacts', 'Sent'));
    return lines;
  }

  /* One bus of the leg: what it needs, met or not, and its crew's lines. A
     row with no bus yet says so, and so does a seat with nobody in it. */
  function busBlock(trip, assign, { busesById = new Map(), driversById = new Map(), statuses = new Map() } = {}, clashes = []) {
    const bus = assign.bus_id != null ? busesById.get(assign.bus_id) ?? null : null;
    const mine = clashes.filter(c => String(c.assignmentId) === String(assign.id));
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
    for (const c of mine.filter(x => x.driverId == null)) needs.push({ id: `clash:${c.what}`, label: c.what, met: false });
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
      for (const x of mine.filter(m => m.driverId === c.driverId)) lines.push(line(`clash:${x.what}`, 'warn', x.what));
      const changed = window.SchedulerDriverJob?.changesSince(trip, assign.leg || 'outbound', c.driverId, c.row,
        { busesById, driversById, nameOf: Facts.requirementLabel }) ?? [];
      if (changed.length) lines.push(line('told', 'todo', 'Tell of changes', { value: changed.join(', '), action: 'contacts' }));
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
    const clashes = read.nearby && window.SchedulerClashes ? window.SchedulerClashes.standing(trip, leg, read.nearby, read) : [];
    const buses = (trip.trip_assignments || [])
      .filter(a => (a.leg || 'outbound') === leg)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map(a => busBlock(trip, a, read, clashes));
    const tripLeft = lines.filter(l => l.state !== 'done').length;
    const needed = leg === 'return' ? (trip.return_bus_count || trip.bus_count || 1) : (trip.bus_count || 1);
    // A bus the leg needs and has no row for is one more thing left.
    const missing = Math.max(0, needed - buses.length);
    return { trip, leg, legName: ToDo.legName(trip, leg), day: ToDo.legDay(trip, leg), lines, tripLeft,
      buses, missing, left: tripLeft + missing + buses.reduce((n, b) => n + b.left, 0) };
  }

  /* What a leg's page still lacks, each a line of words: the trip's lines
     not done, a bus the leg has no row for, and each bus's unmet needs and
     its crew's lines not done, named by the bus and the person. */
  function gapWords(p) {
    const said = l => (l.value ? `${l.label}: ${l.value}` : l.state === 'todo' ? `${l.label}: to do` : l.label);
    const out = p.lines.filter(l => l.state !== 'done').map(said);
    if (p.missing) out.push(`${p.missing} ${p.missing === 1 ? 'bus' : 'buses'} not assigned`);
    for (const b of p.buses) {
      const name = b.bus ? `Bus ${b.bus.number ?? ''}`.trim() : 'No bus yet';
      if (!b.bus) out.push(name);
      for (const n of b.needs.filter(x => !x.met)) out.push(`${name}: ${n.label}`);
      for (const c of b.crew) {
        for (const l of c.lines.filter(x => x.state !== 'done')) out.push(`${name}, ${c.name ?? c.role}: ${said(l)}`);
      }
    }
    return out;
  }

  // How many legs leave on a day and how many of them are ready.
  function summary(trips, day, read = {}) {
    const pages = legsOn(trips, day).map(l => page(l.trip, l.leg, read));
    return { legs: pages.length, ready: pages.filter(p => p.left === 0).length };
  }

  // -- reading ------------------------------------------------------------
  const STEPS = ['envelope_printed', 'trip_reminder_sent', 'itinerary_printed', 'hos_form_printed', 'driver_forms_printed'];
  const COLUMNS = ['id', 'trip_ref', 'destination', 'customer', 'customer_id', 'start_date', 'end_date', 'return_start_date', 'return_end_date',
    'trip_type', 'confirmed', 'trip_bar_color', 'cancelled_at', 'created_at', 'bus_count', 'return_bus_count', 'po_ref',
    // A quote marked sent, which ends a placeholder and is the day the customer was last told.
    'quote_sent_price', 'quote_sent_on',
    // The money, as follow-up.js reads it, for what the customer still owes.
    'quoted_price', 'contract_status', 'po_received', 'po_amount', 'deposit_amount', 'date_paid', 'balance_paid',
    'trip_payments(amount,date)', 'trip_pos(amount)', 'trip_updates(created_at,kind)',
    'itinerary_not_needed', 'contact_not_needed',
    'trip_reqs', 'req_sleeper', 'req_ada', 'req_56pax', 'need_hotel', 'need_fuel_card', 'vehicle_type',
    'hotel_booked_outbound', 'hotel_booked_return', 'hotel_itinerary_number_outbound', 'hotel_itinerary_number_return',
    'booking_contact_name', 'contacts:booking_contact_id(id,name,phone,email)',
    ...[1, 2, 3, 4, 5].flatMap(n => [`trip_contact_${n}_name`, `trip_contact_${n}_leg`, `c${n}:trip_contact_${n}_id(id,name,phone)`]),
    'trip_prep(driver_info_sent,driver_info_sent_at,driver_info_sent_by)',
    `trip_assignments(id,bus_id,position,leg,active_roles,needs,vehicle_type,fuel_card_number,trip_drivers(id,driver_id,role,report_time,instructions,${STEPS.flatMap(s => [s, `${s}_at`, `${s}_by`]).join(',')}))`,
    // What a driver's job reads as, for a change they have not been told of.
    'spot_time', 'trip_documents(id,label,created_at,file_path,leg)',
    // The group's two times, which the To do rules read for a trip read here.
    'departure_time', 'return_time',
    'trip_stops(position,leg,type,label,name,address,arrive,spot,depart_prev,arrive_date,spot_date,depart_prev_date)'].join(',');

  const unwrap = r => { if (r.error) throw new Error(r.error.message); return r.data ?? []; };
  // The last day any of the legs takes, so what is read around them reaches its end.
  const lastOf = (legs, from) => legs.reduce((last, l) => {
    const to = window.SchedulerWeek?.legsOf(l.trip).find(x => x.leg === l.leg)?.to;
    return to && to > last ? to : last;
  }, from);

  /* The pages of `legs`, { trip, leg }, with the driver statuses of their
     trips and the trips, time off and days out around them from `from`, for
     what stands in each leg's way. */
  async function pagesOf(client, legs, from, basics) {
    const ids = [...new Set(legs.map(l => l.trip.id))];
    const [statusRows, nearby] = await Promise.all([
      ids.length ? client.rpc('get_trip_driver_statuses', { p_trip_ids: ids }).then(unwrap) : [],
      legs.length && window.SchedulerClashes ? window.SchedulerClashes.readNearby(client, from, lastOf(legs, from)) : null,
    ]);
    const statuses = Facts.statusMap(statusRows);
    const read = { ...basics, statuses, nearby };
    return { pages: legs.map(l => page(l.trip, l.leg, read)), read };
  }

  // The legs leaving on a day, as pages.
  async function readDay(client, day, basics) {
    const trips = await client.from('trips').select(COLUMNS).is('cancelled_at', null)
      .or(`start_date.eq.${day},return_start_date.eq.${day},end_date.eq.${day}`).order('start_date').then(unwrap);
    return (await pagesOf(client, legsOn(trips, day), day, basics)).pages;
  }

  /* One trip with a page for each of its legs, whatever day they leave, and
     what was read for them, which to-do.js's `handed` takes too; null for a
     trip not found. */
  async function readTrip(client, tripId, basics) {
    const trip = (await client.from('trips').select(COLUMNS).eq('id', tripId).maybeSingle().then(r => {
      if (r.error) throw new Error(r.error.message);
      return r.data;
    })) ?? null;
    if (!trip) return null;
    const legs = Checklist.legsOf(trip).map(leg => ({ trip, leg }));
    const { pages, read } = await pagesOf(client, legs, trip.start_date ?? FollowUp.today(), basics);
    return { trip, pages, read };
  }

  window.SchedulerDepartures = { COLUMNS, prepDays, legsOn, page, gapWords, summary, readDay, readTrip };
})();
