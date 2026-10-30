/* ==========================================================================
   to-do-rows.js — WHAT THE TRIPS ASK, READ
   --------------------------------------------------------------------------
   Keeps the rows to-do.js's `read` gives: for a task's trip on the Tasks
   list, and for the Trips page's Show choices. A change to a trip reads that
   trip again, and a change that cannot say its trip reads them all; each
   reading says `scheduler:to-do-rows`. On the board the changes come from
   the board's channel; on the Trips page, from `scheduler-to-do-rows`.

   Needs billing.js, follow-up.js, checklist.js, requirements.js, leg-facts.js,
   week.js, clashes.js, share/driver-words.js, driver-job.js and to-do.js
   loaded first, and /account.js for the client.
   ========================================================================== */
(() => {
  'use strict';

  const account = window.Rux?.account;
  const client = account?.client;
  const ToDo = window.SchedulerToDo;
  const Facts = window.SchedulerLegFacts;
  if (!client || !ToDo || !Facts) return;

  // The tables a row is read from; a change to one reads its trip again.
  const TABLES = ['trips', 'trip_assignments', 'trip_drivers', 'trip_stops', 'trip_updates', 'trip_documents', 'trip_payments', 'trip_pos',
    'trip_driver_statuses', 'trip_legs', 'trip_routes', 'trip_contacts'];

  let computed = [];        // to-do.js's rows, every one
  let trips = new Map();    // id -> trip, for a task's trip and its Trip choice
  let held = null;          // the last read whole, which a trip read again starts from
  let failure = '';
  // The trips a change asked to read again, and whether one asked for everything.
  const owed = new Set();
  let owedAll = true;

  /* The trip a change is to: its id; null for a row of a trip not held, which
     reads nothing; undefined when the change cannot say, as a delete of a
     row whose id this page never read cannot. A trip row and a leg are
     always read, since a trip that moves into the days comes in that way. */
  function tripOf({ table, new: row = {}, old = {} }) {
    if (table === 'trips') return row.id ?? old.id;
    const id = row.trip_id ?? old.trip_id;
    if (id != null) return (table === 'trip_legs' || trips.has(id)) ? id : null;
    if (table === 'trip_drivers' && row.assignment_id != null) {
      for (const trip of trips.values()) if ((trip.trip_assignments || []).some(a => a.id === row.assignment_id)) return trip.id;
      return null;
    }
    return undefined;
  }

  async function read() {
    const ids = [...owed];
    owed.clear();
    const all = owedAll || !held;
    owedAll = false;
    if (!all && !ids.length) return;
    try {
      held = all ? await ToDo.read(client) : await ToDo.readAgain(client, held, ids);
    } catch (e) {
      owedAll = true;
      throw e;
    }
    ({ rows: computed, trips } = held);
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
  function changed(change) {
    if (change.full) owedAll = true;
    else if (TABLES.includes(change.table)) {
      const id = tripOf(change);
      if (id === undefined) owedAll = true;
      else if (id === null) return;
      else owed.add(id);
    } else return;
    soon();
  }

  const board = window.SchedulerBoardLive;
  let channel = null;
  function listen() {
    if (board) { board.listen(changed); return; }
    channel = client.channel('scheduler-to-do-rows');
    for (const table of TABLES) channel.on('postgres_changes', { event: '*', schema: 'public', table }, changed);
    channel.subscribe();
  }
  // Coming back to the tab reads everything again and reopens a channel the sleep took.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !held) return;
    if (channel && channel.state !== 'joined' && channel.state !== 'joining') { client.removeChannel(channel); listen(); }
    owedAll = true;
    soon();
  });

  (async () => {
    const me = await account.person().catch(() => null);
    // The rows are the staff's; any other account's stay empty.
    if (!me?.staff) return;
    await load();
    listen();
  })();

  // Asked from outside, a reading is of everything.
  window.SchedulerToDoRows = { rows: () => computed, trips: () => trips, failure: () => failure, load: () => { owedAll = true; return load(); } };
})();
