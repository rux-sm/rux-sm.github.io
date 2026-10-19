/* ==========================================================================
   to-do.js — WHAT THE TRIPS ASK OF THE OFFICE NOW
   --------------------------------------------------------------------------
   The one copy of the to-do list's computed rows. Nothing writes one and
   nothing stores one: each is worked out from the trips every time, so it
   asks while it is true and is gone once its trip is fixed. Seven rules, each
   read from the file that owns it:

     Follow-up     a trip that asks for a follow-up, as follow-up.js decides
     Leaving soon  a leg leaving today or in the next two days with an item
                   open in its checklist's Customer or Buses group, as
                   checklist.js decides
     Short         a confirmed trip with a leg leaving within 30 days that
                   has fewer buses than it needs
     No times      a confirmed trip with a leg leaving within a week whose
                   stops have no times in
     Clash         a leg leaving within 30 days with something in a bus's or
                   a driver's way, as clashes.js's standing rule says, where
                   the page handed in what is around it
     Declined      a leg leaving within 30 days a driver said no to
     Tell          a leg leaving within 30 days that changed for a driver
                   since they accepted, as driver-job.js reads it

   A leaving-soon row leaves out what another row on the same trip already
   says, so one fault is one line.

   `rows` reads neither the database nor the page. The trip row brings its
   own columns, and the caller hands in what only it can read, as the
   checklist takes it: `factsOf(trip, leg)` for the leg's buses and seats,
   and `contactOf(trip)` for whether it has a day-of contact; `handed` makes
   both from a read. `read`, handed a client, reads what the rows need, so
   the pages and the connector ask the same: every live trip from 90 days
   back for the follow-ups, and the buses, seats, stops and contacts of the
   ones leaving within 30 days, with the trips, time off and days out around
   them, which clashes.js's standing rule reads.
   Needs billing.js, follow-up.js and checklist.js loaded first, and for
   `read` requirements.js, leg-facts.js, week.js, clashes.js,
   share/driver-words.js and driver-job.js.
   ========================================================================== */
(() => {
  'use strict';

  const FollowUp = window.SchedulerFollowUp;
  const Checklist = window.SchedulerChecklist;

  const SOON_DAYS = 2;
  const SHORT_DAYS = 30;
  const TIMES_DAYS = 7;
  // The checklist groups a leaving-soon row reads; the rest is the Departures list's.
  const SOON_GROUPS = ['Customer', 'Buses'];

  // Each kind in the order a trip's row says them.
  const KINDS = {
    'short': { label: 'Short of buses' },
    'times': { label: 'No times' },
    'clash': { label: 'Clash' },
    'declined': { label: 'Driver declined' },
    'tell': { label: 'Tell the driver' },
    'leaving': { label: 'Leaving soon' },
    'follow-up': { label: 'Follow-up' },
  };

  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parseISO = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
  // Whole days from today to a day, 0 on the day, or null with no date.
  const daysTo = day => (day ? Math.round((parseISO(day) - parseISO(FollowUp.today())) / 864e5) : null);
  // The office's day `n` days from today.
  const dayFrom = n => { const d = parseISO(FollowUp.today()); d.setDate(d.getDate() + n); return iso(d); };
  const within = (day, days) => { const n = daysTo(day); return n != null && n >= 0 && n <= days; };

  const split = trip => trip.trip_type === 'dropoff_pickup';
  // The day a leg leaves, as the Departures list reads it.
  const legDay = (trip, leg) => (leg === 'return' ? (trip.return_start_date ?? trip.end_date) : trip.start_date) ?? null;
  // A split trip's leg in the office's words; any other trip has one leg and names none.
  const legName = (trip, leg) => (split(trip) ? (leg === 'return' ? 'Pickup' : 'Drop-off') : null);
  const live = trip => !trip.cancelled_at && !window.SchedulerBilling.placeholder(trip);

  const needed = (trip, leg) => (leg === 'return' ? (trip.return_bus_count || trip.bus_count || 1) : (trip.bus_count || 1));
  const assigned = (trip, leg) => (trip.trip_assignments || [])
    .filter(a => (a.leg || 'outbound') === leg && a.bus_id != null).length;
  const hasTimes = (trip, leg) => (trip.trip_stops || [])
    .some(s => (s.leg || 'outbound') === leg && (s.arrive || s.spot || s.depart_prev));

  // An open checklist item as a fault, in the words the trip's card uses.
  const OPEN = {
    confirmed: () => FollowUp.WORDS.confirmation,
    itinerary: () => FollowUp.WORDS.itinerary,
    contact: () => 'Trip contact missing',
    buses: i => `Bus not assigned${i.detail ? ` (${i.detail})` : ''}`,
  };
  const openWords = item => {
    const id = item.id.split(':')[0];
    return OPEN[id] ? OPEN[id](item) : (item.detail || item.label);
  };

  const row = (kind, trip, leg, more) => ({
    kind, key: [kind, trip.id, leg].filter(Boolean).join(':'), trip, leg: leg || null,
    legName: leg ? legName(trip, leg) : null, day: leg ? legDay(trip, leg) : trip.start_date ?? null, ...more,
  });

  /* Every computed row the trips give, unfolded, soonest first. */
  function rows(trips, { factsOf = () => ({}), contactOf = () => false } = {}) {
    const out = [];
    for (const trip of trips || []) {
      // Follow-up decides for itself what a cancelled trip or a placeholder waits on: nothing.
      const waits = FollowUp.asks(trip) ? FollowUp.waitsOf(trip) : [];
      if (waits.length) {
        const since = FollowUp.quietSince(trip);
        out.push(row('follow-up', trip, null, {
          what: waits.map(w => FollowUp.WORDS[w]).join(' · '), due: FollowUp.due(trip),
          detail: since ? FollowUp.agoShort(since) : null,
        }));
      }
      if (!live(trip)) continue;

      const short = new Set();
      if (trip.confirmed) {
        for (const leg of Checklist.legsOf(trip)) {
          const want = needed(trip, leg), has = assigned(trip, leg);
          if (has < want && within(legDay(trip, leg), SHORT_DAYS)) {
            short.add(leg);
            out.push(row('short', trip, leg, { what: KINDS.short.label, detail: `${has} of ${want}` }));
          }
          // Asked of each leg, so a pickup leg with no times is not hidden
          // behind a drop-off that has them.
          if (within(legDay(trip, leg), TIMES_DAYS) && !hasTimes(trip, leg)) {
            out.push(row('times', trip, leg, { what: KINDS.times.label, detail: null }));
          }
        }
      }

      const clashed = new Set();
      const factsFor = new Map();
      const factsAt = leg => { if (!factsFor.has(leg)) factsFor.set(leg, factsOf(trip, leg)); return factsFor.get(leg); };
      for (const leg of Checklist.legsOf(trip)) {
        if (!within(legDay(trip, leg), SHORT_DAYS)) continue;
        const facts = factsAt(leg);
        const clashes = facts.clashes ?? [];
        if (clashes.length) {
          clashed.add(leg);
          out.push(row('clash', trip, leg, { what: clashes.join(' · '), detail: null }));
        }
        if (facts.declined?.length) out.push(row('declined', trip, leg, { what: facts.declined.map(d => `${d.name} declined`).join(' · '), detail: null }));
        if (facts.toTell?.length) {
          out.push(row('tell', trip, leg, { what: facts.toTell.map(d => `Tell ${d.name}: ${d.lines.join(', ')}`).join(' · '), detail: null }));
        }
      }

      for (const leg of Checklist.legsOf(trip)) {
        if (!within(legDay(trip, leg), SOON_DAYS)) continue;
        const said = new Set([
          ...(waits.includes('confirmation') ? ['confirmed'] : []),
          ...(waits.includes('itinerary') ? ['itinerary'] : []),
          ...(short.has(leg) ? ['buses'] : []),
          ...(clashed.has(leg) ? ['clashes'] : []),
          ...(within(legDay(trip, leg), SHORT_DAYS) ? ['declined', 'told'] : []),
        ]);
        const open = Checklist.legItems(trip, leg, factsAt(leg), contactOf(trip))
          .filter(i => !i.done && SOON_GROUPS.includes(i.group) && !said.has(i.id.split(':')[0]));
        if (open.length) out.push(row('leaving', trip, leg, { what: open.map(openWords).join(' · '), detail: null }));
      }
    }
    const order = Object.keys(KINDS);
    return out.sort((a, b) => String(a.day || '9').localeCompare(String(b.day || '9'))
      || String(a.trip.id).localeCompare(String(b.trip.id)) || order.indexOf(a.kind) - order.indexOf(b.kind));
  }

  // -- reading ------------------------------------------------------------
  const LIGHT = ['id', 'trip_ref', 'destination', 'customer', 'start_date', 'end_date', 'return_start_date', 'return_end_date',
    'trip_type', 'confirmed', 'trip_bar_color', 'cancelled_at', 'created_at', 'bus_count', 'return_bus_count',
    // A quote marked sent, which ends a placeholder and is the day the customer was last told.
    'quote_sent_price', 'quote_sent_on',
    // What the follow-up rules read: the money, the itinerary and the updates.
    'quoted_price', 'itinerary_not_needed', 'contract_status', 'po_received', 'po_ref', 'po_amount', 'deposit_amount',
    'date_paid', 'balance_paid', 'trip_payments(amount,date)', 'trip_pos(amount)', 'trip_documents(label)',
    'trip_updates(created_at,kind)'].join(',');
  // What the other three rules read, of the trips leaving soon enough to be asked.
  const HEAVY = ['id', 'contact_not_needed', 'trip_reqs', 'req_sleeper', 'req_ada', 'req_56pax', 'need_hotel', 'need_fuel_card', 'vehicle_type',
    'departure_time', 'return_time', 'spot_time', 'trip_documents(id,label,created_at,file_path,leg)',
    ...[1, 2, 3, 4, 5].flatMap(n => [`trip_contact_${n}_name`, `trip_contact_${n}_leg`, `c${n}:trip_contact_${n}_id(id,name,phone)`]),
    'trip_assignments(id,bus_id,leg,active_roles,needs,vehicle_type,trip_drivers(driver_id,role,envelope_printed,report_time,instructions))',
    'trip_stops(position,leg,type,label,name,address,arrive,spot,depart_prev)'].join(',');

  // What the rules are handed from a read's buses, drivers, statuses and what is around.
  const handed = read => ({
    factsOf: (t, leg) => window.SchedulerLegFacts.factsOf(t, leg, read),
    contactOf: t => !!window.SchedulerLegFacts.dayOfContact(t),
  });

  /* Every row the trips give now, and the trips by id. */
  async function read(client) {
    const Facts = window.SchedulerLegFacts;
    const unwrap = r => { if (r.error) throw new Error(r.error.message); return r.data ?? []; };
    const today = FollowUp.today();
    const far = dayFrom(SHORT_DAYS);
    const soonOn = col => `and(${col}.gte.${today},${col}.lte.${far})`;
    const [light, heavy, basics, nearby] = await Promise.all([
      // A trip that left a season ago can still owe a balance; older than that is History's.
      client.from('trips').select(LIGHT).is('cancelled_at', null).gte('start_date', dayFrom(-90)).order('start_date').limit(5000).then(unwrap),
      client.from('trips').select(HEAVY).is('cancelled_at', null)
        .or([soonOn('start_date'), soonOn('return_start_date'), soonOn('end_date')].join(',')).then(unwrap),
      Facts.readBasics(client),
      // What is around the trips leaving within 30 days, for the Clash rows.
      window.SchedulerClashes?.readNearby(client, today, dayFrom(SHORT_DAYS + 30)) ?? null,
    ]);
    const more = new Map(heavy.map(t => [t.id, t]));
    const all = light.map(t => ({ ...t, ...more.get(t.id) }));
    // Each answer of the trips leaving within 30 days, for a decline or a change to tell.
    const statusRows = heavy.length
      ? await client.rpc('get_trip_driver_statuses', { p_trip_ids: heavy.map(t => t.id) }).then(unwrap) : [];
    const statuses = new Map(statusRows.map(r => [Facts.statusKey(r.tripId, r.driverId, r.leg, r.role), r]));
    return { rows: rows(all, handed({ ...basics, nearby, statuses })), trips: new Map(all.map(t => [t.id, t])) };
  }

  window.SchedulerToDo = { KINDS, SOON_DAYS, SHORT_DAYS, TIMES_DAYS, LIGHT, HEAVY, rows, handed, read, legDay, legName, hasTimes };
})();
