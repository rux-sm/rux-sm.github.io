/* ==========================================================================
   to-do-rows.js — WHAT THE TRIPS ASK, READ
   --------------------------------------------------------------------------
   Keeps the rows to-do.js's `read` gives: for a task's trip on the To do
   list, and for the Trips page's Show choices. A change to a trip arrives on
   the `scheduler-to-do-rows` channel and reads them again, and each reading
   says `scheduler:to-do-rows`.

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

  // The tables a row is read from; a change to one reads the trips again.
  const TABLES = ['trips', 'trip_assignments', 'trip_drivers', 'trip_stops', 'trip_updates', 'trip_documents', 'trip_payments', 'trip_pos', 'trip_driver_statuses'];

  let computed = [];        // to-do.js's rows, every one
  let trips = new Map();    // id -> trip, for a task's trip and its Trip choice
  let failure = '';

  async function read() {
    ({ rows: computed, trips } = await ToDo.read(client));
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
