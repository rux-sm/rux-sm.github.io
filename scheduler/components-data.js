/* ==========================================================================
   Rux Scheduler — COMPONENTS DATA, the invented samples components.html draws
   --------------------------------------------------------------------------
   Trips, buses, drivers and Samsara answers made up for the components page,
   one sample for each state a bar can be in, dated from the moment the page
   opens so a bar due today is due and a bus out is out. Nothing here is the
   office's: every name, number and place is invented.

   `build()` makes them afresh and hands back `{ busesById, driversById,
   statuses, sections }`. A section is `{ id, title, intro, samples }`, and a
   sample `{ name, note, days, rows, replay }`, where each row is `{ head,
   bars }` and each bar `{ trip, leg, slot, start, span, fromPrev, toNext,
   state, live }`: `state` the classes and attributes the board puts on a bar
   as it is used, and `live` a bus out on its trip, `{ bus, look, before }`,
   `look` what live-trip.js reads and `before` the answer before this one.
   A sample with `replay` plays once as drawn, and again from scratch on its
   button.
   ========================================================================== */
(() => {
  'use strict';

  const { statusKey } = window.SchedulerLegFacts;
  const MIN = 60e3, HOUR = 3600e3, DAY = 864e5;
  const OFFICE = 'America/Chicago';
  // A day and a clock as the office keeps them, YYYY-MM-DD and HH:MM.
  const dateAt = ms => new Intl.DateTimeFormat('en-CA', { timeZone: OFFICE }).format(ms);
  const clockAt = ms => new Intl.DateTimeFormat('en-GB', { timeZone: OFFICE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(ms);

  const BUSES = [
    { id: 'b101', number: '101', capacity: 56, type: 'Coach', sleeper: true, ada_lift: true },
    { id: 'b102', number: '102', capacity: 56, type: 'Coach' },
    { id: 'b103', number: '103', capacity: 49, type: 'Coach' },
    { id: 'b104', number: '104', capacity: 28, type: 'Mini coach' },
    { id: 'b105', number: '105', capacity: 56, type: 'Coach' },
    { id: 'b106', number: '106', capacity: 56, type: 'Coach', sleeper: true },
    { id: 'b119', number: '119', capacity: 56, type: 'Coach' },
  ].map(b => ({ status: 'active', ada_lift: false, sleeper: false, equipment: {}, ...b }));
  const DRIVERS = [
    { id: 'd1', name: 'Marco Ruiz', short_name: 'Marco' },
    { id: 'd2', name: 'Lena Garza', short_name: 'Lena' },
    { id: 'd3', name: 'Rosa Peña', short_name: 'Rosa' },
    { id: 'd4', name: 'Ben Ochoa', short_name: 'Ben' },
    { id: 'd5', name: 'Ivy Tran', short_name: 'Ivy', employment_type: 'part-time' },
    { id: 'd6', name: 'Sam Cole', short_name: 'Sam' },
    { id: 'd7', name: 'Alejandra Villarreal', short_name: 'Alejandra' },
    { id: 'd8', name: 'Maximiliano Cárdenas', short_name: 'Maximiliano' },
  ].map(d => ({ employment_type: 'full-time', status: 'active', ...d }));

  function build() {
    const now = Date.now();
    const day = n => dateAt(now + n * DAY);
    const busesById = new Map(BUSES.map(b => [b.id, b]));
    const driversById = new Map(DRIVERS.map(d => [d.id, d]));
    const statuses = new Map();
    let ids = 0;

    // A leg's two stops: the pickup, which carries the departure, and the
    // return to the yard, which carries the time the bus is back.
    const stopsFor = (leg, depart, back) => [
      { id: `s${++ids}`, leg, position: 0, type: 'pickup', name: 'Lakeview High School', depart_prev: depart },
      { id: `s${++ids}`, leg, position: 1, type: 'return', name: 'Yard', arrive: back },
    ].filter(s => (s.type === 'pickup' ? s.depart_prev : s.arrive));

    /* A trip, settled unless `o` says otherwise: confirmed, a booking and a
       day-of contact, no itinerary asked for, and its buses from `o.buses`,
       each `{ bus, crew, roles, needs, type, leg, position }` with `crew` a
       list of `[driver, role, status, more]`, a status row written for each
       status but Not sent. */
    function trip(o = {}) {
      const id = `sample-${++ids}`;
      const { buses = [], depart = '07:30', back = '18:00', returnDepart, returnBack, ...rest } = o;
      const t = {
        id, destination: 'San Antonio, TX', customer: 'Lakeview High School', confirmed: true, trip_type: 'round_trip',
        start_date: day(0), end_date: day(1), bus_count: 1, passengers: 24,
        booking_contact_name: 'Dana Flores', booking_contact_phone: '9565550142',
        trip_contacts: [{ id: `k${++ids}`, position: 1, name: 'Coach Ortiz', phone: null, leg_id: null }],
        itinerary_not_needed: true, created_at: new Date(now - 20 * DAY).toISOString(),
        trip_updates: [], trip_documents: [],
        ...rest,
      };
      /* Its legs and their one route each, as the board reads a trip: the
         drop-off and, on a split, the pickup, named by the old words too. */
      const legId = word => `${id}-${word}`;
      const routeId = word => `${legId(word)}-r`;
      t.trip_legs = [['outbound', t.start_date, t.end_date, t.bus_count],
        ...(t.return_start_date ? [['return', t.return_start_date, t.return_end_date, t.return_bus_count ?? t.bus_count]] : [])]
        .map(([word, start, end, count]) => ({
          id: legId(word), leg: word, kind: t.trip_type === 'round_trip' ? 'round_trip' : 'one_way',
          start_date: start, end_date: end ?? start, bus_count: count ?? 1,
          hotel_booked: !!t[`hotel_booked_${word}`], hotel_itinerary_number: t[`hotel_itinerary_number_${word}`] ?? null,
          created_at: t.created_at, trip_routes: [{ id: routeId(word), position: 1, name: null }],
        }));
      t.trip_stops = [...stopsFor('outbound', depart, back),
        ...(t.return_start_date ? stopsFor('return', returnDepart, returnBack) : [])].map(st => ({ ...st, route_id: routeId(st.leg) }));
      t.trip_assignments = buses.map((b, i) => ({
        id: `a${++ids}`, leg: b.leg ?? 'outbound', route_id: routeId(b.leg ?? 'outbound'), position: b.position ?? i, bus_id: b.bus ?? null,
        vehicle_type: b.type ?? null, needs: b.needs ?? {}, active_roles: b.roles,
        actual_yard_return_at: b.backAt ? new Date(window.SchedulerWeek.officeInstant(...b.backAt)).toISOString() : null,
        pickup_at: b.spotAt ? new Date(window.SchedulerWeek.officeInstant(...b.spotAt)).toISOString() : null,
        trip_drivers: (b.crew ?? []).map(([driver_id, role = 'driver', , more]) => ({ driver_id, role, pay: 180, ...more })),
      }));
      t.trip_assignments.forEach((a, i) => {
        for (const [driverId, role = 'driver', status, more] of buses[i].crew ?? []) {
          if (!status || status === 'off') continue;
          const row = { status, source: more?.source ?? 'driver', updatedAt: new Date(now - 2 * DAY).toISOString() };
          if (status === 'confirmed') row.acceptedAt = row.updatedAt;
          if (status === 'declined') row.declinedAt = row.updatedAt;
          statuses.set(statusKey(t.id, driverId, legId(a.leg), role), row);
        }
      });
      return t;
    }
    const update = (body, ago) => ({ id: `u${++ids}`, kind: 'note', actor_name: 'Dana', body, created_at: new Date(now - ago).toISOString() });
    // One bar on one bus, the trip's first bus on its outbound leg unless said.
    const bar = (t, more = {}) => ({ trip: t, leg: 'outbound', slot: 0, start: 0, span: 2, ...more });
    const row = (head, ...bars) => ({ head, bars });
    const crewed = (bus, status = 'confirmed') => ({ bus, crew: [['d1', 'driver', status]] });

    // ── The trip bar ────────────────────────────────────────────────────────
    const colours = [
      ['Standard, confirmed', {}],
      ['Standard, unconfirmed', { confirmed: false, start_date: day(90), end_date: day(91) }],
      ['Teal', { trip_bar_color: 'teal' }],
      ['Green', { trip_bar_color: 'green' }],
      ['Purple', { trip_bar_color: 'purple' }],
      ['Pink', { trip_bar_color: 'pink' }],
      ['Placeholder', { trip_bar_color: 'amber', confirmed: false, start_date: day(90), end_date: day(91) }],
    ].map(([customer, o], i) => row(BUSES[i].number, bar(trip({ customer, buses: [crewed(BUSES[i].id)], ...o }))));

    const split = trip({
      destination: 'Corpus Christi, TX', customer: 'Coastal Youth Choir', trip_type: 'dropoff_pickup',
      start_date: day(0), end_date: day(0), return_start_date: day(2), return_end_date: day(2),
      depart: '08:00', back: '13:00', returnDepart: '14:00', returnBack: '19:30',
      buses: [crewed('b102'), { ...crewed('b102'), leg: 'return', position: 0 }],
    });
    const three = trip({
      destination: 'Austin, TX', customer: 'Northside Band', bus_count: 3,
      buses: [crewed('b101'), { bus: 'b102', crew: [['d2', 'driver', 'pending-response']] }],
    });
    const times = [
      ['Out and back', { depart: '07:30', back: '18:00' }],
      ['Back after midnight', { depart: '14:10', back: '00:30', start_date: day(0), end_date: day(0) }],
      ['A departure only', { depart: '07:30', back: null }],
      ['A return only', { depart: null, back: '18:00' }],
      ['No times yet', { depart: null, back: null }],
    ].map(([customer, o], i) => row(BUSES[i].number, bar(trip({ customer, buses: [crewed(BUSES[i].id)], ...o }), { span: o.end_date === day(0) ? 1 : 2 })));
    // Open, so the update takes its age's colour: no one named to call on the day.
    const aged = [
      ['Today', 3 * HOUR, true], ['This week', 4 * DAY, true], ['Older', 12 * DAY, true], ['Settled', 12 * DAY, false],
    ].map(([customer, ago, open], i) => row(BUSES[i].number, bar(trip({
      customer, buses: [crewed(BUSES[i].id)], trip_updates: [update('Pickup moved to the gym doors', ago)],
      // Ten days out, so the missing contact that keeps it open is no warning yet.
      start_date: day(10), end_date: day(11),
      ...(open ? { trip_contacts: [] } : {}),
    }))));

    const tripBar = {
      id: 'trip-bar', title: 'The trip bar',
      intro: 'One bus on one leg of a trip: where, who booked it, their contact, the times, the newest update and the crew.',
      samples: [
        { name: 'Colours', note: 'Standard is blue, or red until the trip is confirmed; the office paints a trip one of four colours, or amber while it is a placeholder.', days: 3, rows: colours },
        { name: 'A placeholder', note: 'Amber, not a trip yet: no times, no empty seats and no alerts, with a driver someone named still shown.', days: 3,
          rows: [row('104', bar(trip({ trip_bar_color: 'amber', confirmed: false, customer: 'Mesa Robotics Club', destination: 'Houston, TX', depart: null, back: null,
            start_date: day(40), end_date: day(41), buses: [{ bus: 'b104', crew: [['d4', 'driver']], roles: ['driver', 'co-driver'] }] })))] },
        { name: 'One way', note: 'A One way pill at the time row\'s end.', days: 3,
          rows: [row('103', bar(trip({ trip_type: 'one_way', customer: 'Harbor Tours', destination: 'Galveston, TX', buses: [crewed('b103')] })))] },
        { name: 'Drop-off and pickup', note: 'A split trip: a Drop-off pill on the first leg, a Pickup pill on the second.', days: 3,
          rows: [row('102', bar(split, { span: 1 }), bar(split, { leg: 'return', start: 2, span: 1 }))] },
        { name: 'More than one bus', note: 'Each bus is a bar, counted after the destination; one still without a bus waits in the No bus row.', days: 3,
          rows: [row('101', bar(three)), row('102', bar(three, { slot: 1 })), row('No bus', bar(three, { slot: 2, assign: null }))] },
        { name: 'Either side of the week', note: 'A trip from last week runs off the start and says the day it left, one into next week runs off the end and says the day it is back.', days: 3,
          rows: [row('105', bar(trip({ customer: 'Riverbend Seniors', destination: 'Laredo, TX', buses: [crewed('b105')] }), { fromPrev: true })),
            row('106', bar(trip({ customer: 'Coastal Youth Choir', destination: 'Dallas, TX', buses: [crewed('b106')] }), { start: 1, toNext: true }))] },
        { name: 'Back at the yard', note: 'A trip whose bus is back asks nothing on the board: it is faded, and its update row says when its bus reached the pickup and got back to the yard, each amber when late, or else its miles once they are in, then Paid in green or what is still due in amber.', days: 3,
          rows: [row('102', bar(trip({ customer: 'Northside Band', start_date: day(-2), end_date: day(-1), depart: '07:00', back: '17:00', actual_miles: null,
            buses: [{ bus: 'b102', crew: [['d2', 'driver', 'pending-response', { pay: null }]] }] }))),
            row('103', bar(trip({ customer: 'Harbor Tours', start_date: day(-2), end_date: day(-1), depart: '07:00', back: '17:00', quoted_price: 1850, actual_miles: 412,
              trip_payments: [{ amount: 1850, date: day(-3) }], buses: [{ bus: 'b103', crew: [['d4', 'driver', 'confirmed']] }] }))),
            row('104', bar(trip({ customer: 'Mesa Robotics Club', start_date: day(-2), end_date: day(-1), depart: '07:00', back: '17:00', quoted_price: 1850,
              trip_payments: [{ amount: 610, date: day(-9) }], buses: [{ bus: 'b104', backAt: [day(-1), '17:40'], crew: [['d6', 'driver', 'confirmed']] }] }))),
            row('105', bar(trip({ customer: 'Coastal Youth Choir', start_date: day(-2), end_date: day(-1), depart: '07:00', back: '17:00', quoted_price: 1850,
              trip_payments: [{ amount: 1850, date: day(-3) }], actual_miles: 388, buses: [{ bus: 'b105', spotAt: [day(-2), '06:52'], backAt: [day(-1), '16:52'], crew: [['d1', 'driver', 'confirmed']] }] })))] },
        { name: 'Times', note: 'Departure and return; +1 for a bus back after midnight; Dep or Ret with one; dimmed with neither.', days: 3, rows: times },
        { name: 'Update ages', note: "While a trip has anything open and no problem, a clock in the update's age colour leads it; a settled trip has none.", days: 3, rows: aged },
        { name: 'Needs a bus', note: 'A leg with no bus yet, in the No bus row.', days: 3,
          rows: [row('No bus', bar(trip({ customer: 'Mesa Robotics Club', destination: 'Port Aransas, TX' }), { assign: null }))] },
      ],
    };

    // ── The crew ────────────────────────────────────────────────────────────
    const statusRows = [
      ['Not sent', 'off'], ['Pending assignment', 'pending-assignment'], ['Pending response', 'pending-response'],
      ['Confirmed', 'confirmed'], ['Confirmed by dispatch', 'confirmed', { source: 'dispatch' }], ['Declined', 'declined'],
    ].map(([customer, status, more], i) => row(BUSES[i].number, bar(trip({
      customer, buses: [{ bus: BUSES[i].id, crew: [[['d1', 'd2', 'd3', 'd4', 'd6', 'd7'][i], 'driver', status, more]] }],
    }))));
    const crew = {
      id: 'crew', title: 'The crew',
      intro: "Each seat in role order, its mark the driver's answer, each its own shape: a grey filled circle not sent, a red disc with a mark to assign, amber dots waiting, a green check confirmed, a red cross declined.",
      samples: [
        { name: 'Each status', note: 'A declined name is struck through, so colour is never the only sign.', days: 3, rows: statusRows },
        { name: 'Co-driver and relief', note: 'A driver wears their answer; a relief driver at either end is two arrows.', days: 3,
          rows: [row('101', bar(trip({ customer: 'Coastal Youth Choir', destination: 'El Paso, TX', buses: [{ bus: 'b101',
            crew: [['d1', 'driver', 'confirmed'], ['d2', 'co-driver', 'pending-response'], ['d3', 'relief-start', 'confirmed'], ['d6', 'relief-end']] }] }), { span: 3 }))] },
        { name: 'Empty seats', note: 'Dimmed; in the warning colour once the leg is due, today to the end of next week.', days: 3,
          rows: [row('102', bar(trip({ customer: 'Due now', buses: [{ bus: 'b102', crew: [['d4', 'driver', 'confirmed']], roles: ['driver', 'co-driver', 'relief-end'] }] }))),
            row('103', bar(trip({ customer: 'Next month', start_date: day(30), end_date: day(31), buses: [{ bus: 'b103', roles: ['driver', 'co-driver'] }] })))] },
        { name: 'A crew that does not fit', note: 'Names give way from the end, counted as +1, +2.', days: 3,
          rows: [row('105', bar(trip({ customer: 'Riverbend Seniors', start_date: day(0), end_date: day(0), back: '17:00', buses: [{ bus: 'b105',
            crew: [['d7', 'driver', 'confirmed'], ['d8', 'co-driver', 'pending-response'], ['d6', 'relief-end', 'confirmed']] }] }), { span: 1 }))] },
      ],
    };

    // ── Alerts ──────────────────────────────────────────────────────────────
    /* A confirmed driver whom the leg changed for since they said yes: the
       view they accepted is the leg with its old pickup time. */
    const told = trip({ customer: 'Northside Band', destination: 'Austin, TX', buses: [{ bus: 'b105', crew: [['d4', 'driver', 'confirmed']] }] });
    const before = { ...told, trip_stops: told.trip_stops.map(s => (s.type === 'pickup' ? { ...s, depart_prev: '06:15' } : s)) };
    const toldRow = statuses.get(statusKey(told.id, 'd4', `${told.id}-outbound`, 'driver'));
    toldRow.acceptedView = window.SchedulerDriverJob?.viewNow(before, `${told.id}-outbound`, 'd4',
      { busesById, driversById, nameOf: window.SchedulerLegFacts.requirementLabel }) ?? null;
    const alerts = {
      id: 'alerts', title: 'Alerts',
      intro: "A problem puts the warning sign at the update's start: red once a bus does not fit, amber for seats or a driver, and for a trip contact or itinerary still missing two days before the leg leaves. Other paperwork, a hotel or an HOS form, marks nothing on the bar; the card lists it.",
      samples: [
        { name: 'A hotel to book', note: 'A need that is a job, not equipment.', days: 3,
          rows: [row('101', bar(trip({ customer: 'Coastal Youth Choir', need_hotel: true, trip_reqs: { hotel: true }, buses: [crewed('b101')] })))] },
        { name: 'No one to call on the day', note: 'No day-of contact on a trip not marked as needing none.', days: 3,
          rows: [row('102', bar(trip({ customer: 'Harbor Tours', trip_contacts: [], buses: [crewed('b102')] })))] },
        { name: 'More passengers than seats', note: 'Said on every bar of the leg.', days: 3,
          rows: [row('103', bar(trip({ customer: 'Northside Band', passengers: 52, buses: [crewed('b103')] })))] },
        { name: 'A driver said no', note: 'The Contact list puts it right.', days: 3,
          rows: [row('104', bar(trip({ customer: 'Mesa Robotics Club', buses: [{ bus: 'b104', crew: [['d3', 'driver', 'declined']] }] })))] },
        { name: 'A driver to tell', note: 'The leg changed since they said yes.', days: 3, rows: [row('105', bar(told))] },
        { name: 'Hours of service', note: "A part-time driver's form not printed yet.", days: 3,
          rows: [row('106', bar(trip({ customer: 'Riverbend Seniors', buses: [{ bus: 'b106', crew: [['d5', 'driver', 'confirmed', { hos_form_printed: false }]] }] })))] },
        { name: 'The wrong type of bus', note: 'A mistake on the board, so red.', days: 3,
          rows: [row('104', bar(trip({ customer: 'Lakeview High School', buses: [{ ...crewed('b104'), type: 'Coach' }] })))] },
        { name: 'A bus short of a need', note: 'The trip asks for a sleeper this bus lacks.', days: 3,
          rows: [row('102', bar(trip({ customer: 'Coastal Youth Choir', destination: 'El Paso, TX', buses: [{ ...crewed('b102'), needs: { sleeper: true } }] })))] },
        { name: 'Both', note: 'A trip with a mistake and a job shows red for the mistake; the card lists both.', days: 3,
          rows: [row('103', bar(trip({ customer: 'Harbor Tours', trip_contacts: [], buses: [{ ...crewed('b103'), needs: { sleeper: true } }] })))] },
      ],
    };

    // ── Selected and moved ──────────────────────────────────────────────────
    const pair = trip({ customer: 'Northside Band', destination: 'Austin, TX', bus_count: 2, buses: [crewed('b101'), { bus: 'b102', crew: [['d2', 'driver', 'confirmed']] }] });
    const used = (customer, state, bus = 'b101') => bar(trip({ customer, buses: [crewed(bus)] }), { state });
    const handled = {
      id: 'handled', title: 'Selected and moved',
      intro: 'What a bar wears while someone works with it.',
      samples: [
        { name: 'Selected', note: "Pressed, with the trip's other buses lifted beside it.", days: 3,
          rows: [row('101', bar(pair, { state: { pressed: true } })), row('102', bar(pair, { slot: 1, state: { classes: ['scheduler-bar--same-trip'] } }))] },
        { name: 'Card open', note: 'The trip whose card is showing.', days: 3, rows: [row('101', used('Coastal Youth Choir', { pressed: true, classes: ['scheduler-bar--open'] }))] },
        { name: 'Lifted', note: 'Held, ready to move to another bus.', days: 3, rows: [row('101', used('Harbor Tours', { classes: ['scheduler-bar--pressed'] }))] },
        { name: 'Left behind', note: 'Where a bar being dragged came from.', days: 3, rows: [row('101', used('Mesa Robotics Club', { classes: ['scheduler-bar--dragging'] }))] },
        { name: 'Saving', note: 'Moved, and the database has not answered yet.', days: 3, rows: [row('102', used('Riverbend Seniors', { saving: true }, 'b102'))] },
        { name: 'Saved', note: 'A ring that grows and fades once the move is kept.', days: 3, replay: true,
          rows: [row('103', used('Lakeview High School', { classes: ['scheduler-bar--saved'] }, 'b103'))] },
        { name: 'Refused', note: 'The same ring in red when a move or a dropped driver is turned away.', days: 3, replay: true,
          rows: [row('104', used('Northside Band', { classes: ['scheduler-bar--refused'] }, 'b104'))] },
        { name: 'Where a carried driver goes', note: 'The seat a dropped driver would take, and one the drop would warn about.', days: 3,
          rows: [row('105', used('Coastal Youth Choir', { classes: ['scheduler-bar--seat'] }, 'b105')),
            row('106', used('Harbor Tours', { classes: ['scheduler-bar--seat-warn'] }, 'b106'))] },
      ],
    };

    // ── Out on the road ─────────────────────────────────────────────────────
    const yard = [26.2034, -98.2300];
    const away = [26.9000, -98.4000];
    /* A trip out now, three hours gone and five to go, and what live-trip.js
       reads of its bus: on its way from the pickup to the Alamodome. */
    const liveStops = () => [
      { key: 'p', type: 'pickup', name: 'Lakeview High School', point: [26.25, -98.2], due: now - 2 * HOUR },
      { key: 's', type: 'stop', name: 'Alamodome', point: [29.41, -98.48], due: now + 2 * HOUR },
      { key: 'y', type: 'return', name: 'Yard', point: yard, due: now + 5 * HOUR },
    ];
    const toStop = (over = {}) => {
      const stops = liveStops();
      return { stops, where: { reached: 0, at: false, next: 1 }, stop: stops[1], at: false, arrival: now + 50 * MIN, late: 0, ...over };
    };
    const atStop = () => { const stops = liveStops(); return { stops, where: { reached: 1, at: true, next: 2 }, stop: stops[1], at: true }; };
    const driver = (id, over = {}) => ({ driver_id: id, name: driversById.get(id)?.name ?? 'Omar Diaz', duty: 'driving', left_ms: 7 * HOUR, wheel: true, ...over });
    const samsara = (over = {}) => ({
      bus_id: 'b101', engine: 'on', engine_at: new Date(now - 2 * HOUR).toISOString(), mph: 64, heading: 20, place: 'I-37 N near Three Rivers',
      fuel: 72, fault: null, faults: [], seen: new Date(now - MIN).toISOString(), lat: away[0], lng: away[1], drivers: [driver('d1')], path: [], ...over,
    });
    function live(customer, o = {}) {
      const out = o.yardOut ?? now - 3 * HOUR;
      const back = o.back ?? now + 5 * HOUR;
      const t = trip({
        customer, start_date: dateAt(out), end_date: dateAt(back), depart: clockAt(out), back: clockAt(back),
        buses: [{ bus: 'b101', crew: o.crew ?? [['d1', 'driver', 'confirmed']] }],
      });
      // Each sample its own bus to Samsara, since the brake lights compare a bus with its last answer.
      const busId = `sam-${++ids}`;
      const bus = samsara({ bus_id: busId, ...o.bus });
      const look = {
        bus, next: o.next ?? toStop(), named: (o.crew ?? [['d1']]).map(c => c[0]), now, yard, yardOut: out,
        others: o.others ?? [], numberOf: id => busesById.get(id)?.number ?? null, drives: o.drives ?? [], day: o.day ?? 0,
      };
      return bar(t, { span: o.span ?? 2, live: { bus, look, before: o.before ? samsara({ bus_id: busId, ...o.bus, ...o.before }) : null } });
    }
    const one = (name, note, b, more = {}) => ({ name, note, days: 3, rows: [row('101', b)], ...more });
    const road = {
      id: 'road', title: 'Out on the road',
      intro: 'While its bus is out, a bar lights from Samsara: the times, the speed with its bars beside the tank, and a seat for each driver. Motion above sets how much it moves.',
      samples: [
        one('At highway speed', 'The speed, and a green bar lit for every 16 mph, rising like a phone\'s signal.', live('Lakeview High School')),
        one('One day wide', 'The narrowest a bar gets: the rows are laid out for it.', live('Northside Band', { span: 1 })),
        one('Two drivers', 'Both drivers in the row half and half, each over their own hours bar, the one at the wheel first.', live('Riverbend Seniors', {
          span: 1, crew: [['d2', 'driver', 'confirmed'], ['d3', 'co-driver', 'confirmed']],
          bus: { drivers: [driver('d2', { left_ms: 48 * MIN }), driver('d3', { duty: 'sleeper', wheel: false, left_ms: 9 * HOUR })] },
          next: toStop({ arrival: now + 2 * HOUR + 22 * MIN }) })),
        one('Late back to the yard', 'Heading for the yard and due there more than ten minutes after the plan: when it is now expected, in amber, in place of the planned return.', live('Harbor Tours', {
          span: 1, back: now + 20 * MIN, next: (() => { const stops = liveStops(); return { stops, where: { reached: 1, at: false, next: 2 }, stop: stops[2], at: false, arrival: now + 65 * MIN, late: 0 }; })() })),
        one('Past its return', 'Still out after the planned return: the track full, and how long over in amber.', live('Mesa Robotics Club', { span: 1, yardOut: now - 9 * HOUR, back: now - 45 * MIN })),
        one('On its second day', 'A trip longer than a day stands its rows in today\'s column while the bus is out, and on its first day before and after.', live('Coastal Youth Choir', { span: 3, day: 1 })),
        one('At a crawl', 'No bar lit yet.', live('Northside Band', { bus: { mph: 6, place: 'Downtown San Antonio' } })),
        one('Idling', 'Engine running and the bus still, at a stop: Idle and how long, beside the bars, all empty.', live('Coastal Youth Choir', { bus: { engine: 'idle', mph: 0, engine_at: new Date(now - 16 * MIN).toISOString() }, next: atStop() })),
        one('Resting', 'A driver in the sleeper and none driving: purple bars when the bus moves on.', live('Riverbend Seniors', {
          bus: { engine: 'idle', mph: 0, engine_at: new Date(now - 40 * MIN).toISOString(), drivers: [driver('d1', { duty: 'sleeper', wheel: false, left_ms: 2 * HOUR }), driver('d2', { duty: 'on', wheel: false })] },
          crew: [['d1', 'driver', 'confirmed'], ['d2', 'co-driver', 'confirmed']], next: atStop() })),
        one('Idling a long time', 'Idle past half an hour turns amber.', live('Mesa Robotics Club', { bus: { engine: 'idle', mph: 0, engine_at: new Date(now - 45 * MIN).toISOString() }, next: atStop() })),
        one('Engine off', 'Off and how long.', live('Harbor Tours', { bus: { engine: 'off', mph: 0, engine_at: new Date(now - 70 * MIN).toISOString(), drivers: [driver('d1', { duty: 'off', wheel: false })] }, next: atStop() })),
        one('No signal', 'Samsara has not heard from the bus: a grey dash, and No signal in place of the times.', live('Mesa Robotics Club', { bus: { engine: null, mph: null, heading: null, fuel: null, seen: new Date(now - 25 * MIN).toISOString(), drivers: [] } })),
        one('Starting', 'Coming on the road, the bar shudders while its engine cranks, once a page load, at Full motion.', live('Lakeview High School'), { replay: true }),
        one('Not rolling', 'Red: the engine still off at the yard from ten minutes before yard-out. A red warning\'s bars blink for their first minute.', live('Northside Band', {
          yardOut: now + 5 * MIN, bus: { engine: 'off', mph: 0, engine_at: new Date(now - 70 * MIN).toISOString(), lat: yard[0], lng: yard[1], drivers: [] },
          next: { stops: liveStops(), where: { reached: -1, at: false, next: 0 }, stop: liveStops()[0], at: false, arrival: null, late: 0 } }), { replay: true }),
        one('Wrong bus', 'Red: a driver the bar names is logged into another bus, marked in the crew with that bus.', live('Coastal Youth Choir', {
          crew: [['d2', 'driver', 'confirmed']], bus: { drivers: [] }, others: [{ bus_id: 'b119', drivers: [driver('d2')] }] })),
        one('Late to spot', 'Amber: the pickup is next and the bus will reach it after its spot.', live('Riverbend Seniors', {
          next: (() => { const stops = liveStops(); stops[0].due = now + 6 * MIN; return { stops, where: { reached: -1, at: false, next: 0 }, stop: stops[0], at: false, arrival: now + 25 * MIN, late: 19 }; })() })),
        one('Short on hours', 'Amber: the hours left in the bus fall short of the drive before the next rest; the driver\'s bar is amber under an hour.', live('Harbor Tours', {
          crew: [['d3', 'driver', 'confirmed']], bus: { drivers: [driver('d3', { left_ms: 50 * MIN })] }, drives: [{}, { min: 270 }, { min: 300 }] })),
        one('Low fuel', 'Under a quarter of a tank, the tank amber.', live('Northside Band', { bus: { fuel: 18 } })),
        one('Engine warning lamp', 'Said only on the tooltip and the live card, since a warning lamp can stay lit for days.', live('Coastal Youth Choir', { bus: { fault: 'check', faults: ['Check engine lamp'] } })),
        one('Stop lamp', 'Red: the engine\'s stop lamp is a warning, its codes on the tooltip.', live('Riverbend Seniors', { bus: { fault: 'stop', faults: ['Coolant temperature high'], mph: 0, engine: 'idle' }, next: atStop() }), { replay: true }),
        one('In the bus, not yet confirmed', 'Samsara has the driver in the bus, so the bar reads them confirmed; near yard-out the board saves it.', live('Northside Band', {
          crew: [['d1', 'driver', 'pending-response']] })),
        one('Someone else at the wheel', 'A driver the bar does not name joins the end of the drivers row.', live('Harbor Tours', { bus: { drivers: [driver('d9', { name: 'Omar Diaz', left_ms: 6 * HOUR })] } })),
      ],
    };

    return { busesById, driversById, statuses, sections: [tripBar, crew, alerts, handled, road] };
  }

  window.SchedulerComponentsData = { build };
})();
