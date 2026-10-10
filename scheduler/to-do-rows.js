/* ==========================================================================
   to-do-rows.js — WHAT THE TRIPS ASK, READ
   --------------------------------------------------------------------------
   Reads the trips to-do.js's rules need and keeps the rows they give: for
   the board's Prep list, for a task's trip on its Tasks list, and for the
   Trips page's Show choices. The page reads them itself, because only the
   board's week holds trips otherwise: every live trip for the follow-ups,
   and the buses, seats, stops and contacts of the ones leaving within 30
   days. A change to a trip arrives on the `scheduler-to-do-rows` channel and
   reads them again, and each reading says `scheduler:to-do-rows`.

   Needs billing.js, follow-up.js, checklist.js, requirements.js, leg-facts.js
   and to-do.js loaded first, and /account.js for the client.
   ========================================================================== */
(() => {
  'use strict';

  const account = window.Rux?.account;
  const client = account?.client;
  const ToDo = window.SchedulerToDo;
  const Facts = window.SchedulerLegFacts;
  if (!client || !ToDo || !Facts) return;

  // The tables a row is read from; a change to one reads the trips again.
  const TABLES = ['trips', 'trip_assignments', 'trip_drivers', 'trip_stops', 'trip_updates', 'trip_documents', 'trip_payments', 'trip_pos'];
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const dayFrom = n => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
  const unwrap = r => { if (r.error) throw new Error(r.error.message); return r.data ?? []; };

  let computed = [];        // to-do.js's rows, every one
  let trips = new Map();    // id -> trip, for a task's trip and its Trip choice
  let failure = '';

  const LIGHT = ['id', 'trip_ref', 'destination', 'customer', 'start_date', 'end_date', 'return_start_date', 'return_end_date',
    'trip_type', 'confirmed', 'trip_bar_color', 'cancelled_at', 'created_at', 'bus_count', 'return_bus_count',
    // What the follow-up rules read: the money, the itinerary and the updates.
    'quoted_price', 'itinerary_not_needed', 'contract_status', 'po_received', 'po_ref', 'po_amount', 'deposit_amount',
    'date_paid', 'balance_paid', 'trip_payments(amount,date)', 'trip_pos(amount)', 'trip_documents(label)',
    'trip_updates(created_at,kind)'].join(',');
  // What the other three rules read, of the trips leaving soon enough to be asked.
  const HEAVY = ['id', 'contact_not_needed', 'trip_reqs', 'req_sleeper', 'req_ada', 'req_56pax', 'need_hotel', 'need_fuel_card', 'vehicle_type',
    ...[1, 2, 3, 4, 5].flatMap(n => [`trip_contact_${n}_name`, `c${n}:trip_contact_${n}_id(id,name,phone)`]),
    'trip_assignments(id,bus_id,leg,active_roles,needs,vehicle_type,trip_drivers(driver_id,role,envelope_printed))',
    'trip_stops(leg,arrive,spot,depart_prev)'].join(',');

  async function read() {
    const today = iso(new Date());
    const far = dayFrom(ToDo.SHORT_DAYS);
    const within = col => `and(${col}.gte.${today},${col}.lte.${far})`;
    const [light, heavy, buses, drivers, settings] = await Promise.all([
      // A trip that left a season ago can still owe a balance; older than that is History's.
      client.from('trips').select(LIGHT).is('cancelled_at', null).gte('start_date', dayFrom(-90)).order('start_date').limit(5000).then(unwrap),
      client.from('trips').select(HEAVY).is('cancelled_at', null)
        .or([within('start_date'), within('return_start_date'), within('end_date')].join(',')).then(unwrap),
      client.from('buses').select('id,capacity,type,ada_lift,sleeper,equipment').then(unwrap),
      client.from('drivers').select('id,employment_type').then(unwrap),
      client.from('settings').select('key,value').in('key', ['requirements-v1', 'follow-up-v1', 'billing-workflow-v1']).then(unwrap),
    ]);
    const setting = new Map(settings.map(s => [s.key, s.value]));
    Facts.setRequirementList(setting.get('requirements-v1'));
    window.SchedulerFollowUp.set(setting.get('follow-up-v1'));
    window.SchedulerBilling.setWorkflow(setting.get('billing-workflow-v1'));

    const more = new Map(heavy.map(t => [t.id, t]));
    const all = light.map(t => ({ ...t, ...more.get(t.id) }));
    const soon = all.filter(t => window.SchedulerChecklist.legsOf(t)
      .some(leg => { const d = ToDo.legDay(t, leg); return d && d >= today && d <= dayFrom(ToDo.SOON_DAYS); }));
    const statusRows = soon.length
      ? await client.rpc('get_trip_driver_statuses', { p_trip_ids: soon.map(t => t.id) }).then(unwrap) : [];
    const facts = {
      busesById: new Map(buses.map(b => [b.id, b])),
      driversById: new Map(drivers.map(d => [d.id, d])),
      statuses: new Map(statusRows.map(r => [Facts.statusKey(r.tripId, r.driverId, r.leg, r.role), r])),
    };
    trips = new Map(all.map(t => [t.id, t]));
    computed = ToDo.rows(all, { factsOf: (t, leg) => Facts.factsOf(t, leg, facts), contactOf: t => !!Facts.dayOfContact(t) });
  }

  /* One read at a time, and the newest asked for wins: a second ask while one
     is under way runs once more when it ends. */
  let running = null;
  let again = false;
  async function load() {
    if (running) { again = true; return running; }
    running = (async () => {
      try { await read(); failure = ''; } catch (e) { failure = `The trips did not load. ${e?.message || e}`; }
      document.dispatchEvent(new CustomEvent('scheduler:to-do-rows'));
    })();
    await running;
    running = null;
    if (again) { again = false; return load(); }
  }
  let timer = null;
  const soon = () => { clearTimeout(timer); timer = setTimeout(load, 1500); };

  let channel = null;
  function listen() {
    channel = client.channel('scheduler-to-do-rows');
    for (const table of TABLES) channel.on('postgres_changes', { event: '*', schema: 'public', table }, soon);
    channel.subscribe();
  }
  // Coming back to the tab reads again and reopens a channel the sleep took.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !channel) return;
    if (channel.state !== 'joined' && channel.state !== 'joining') { client.removeChannel(channel); listen(); }
    soon();
  });

  (async () => {
    const me = await account.person().catch(() => null);
    // The rows are the staff's; any other account's stay empty.
    if (!me?.staff) return;
    await load();
    listen();
  })();

  window.SchedulerToDoRows = { rows: () => computed, trips: () => trips, failure: () => failure, load };
})();
