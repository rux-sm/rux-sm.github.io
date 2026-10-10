/* ==========================================================================
   to-do.js — WHAT THE TRIPS ASK OF THE OFFICE NOW
   --------------------------------------------------------------------------
   The one copy of the to-do list's computed rows. Nothing writes one and
   nothing stores one: each is worked out from the trips every time, so it
   asks while it is true and is gone once its trip is fixed. Four rules, each
   read from the file that owns it:

     Follow-up     a trip that asks for a follow-up, as follow-up.js decides
     Leaving soon  a leg leaving today or in the next two days with an item
                   open in its checklist's Customer or Buses group, as
                   checklist.js decides
     Short         a confirmed trip with a leg leaving within 30 days that
                   has fewer buses than it needs
     No times      a confirmed trip with a leg leaving within a week whose
                   stops have no times in

   A leaving-soon row leaves out what another row on the same trip already
   says, so one fault is one line. `byTrip` then makes the Prep list's rows of
   them: one for each trip on each day it has a gap, every gap on its one
   line, without the legs leaving on a day to prep for, which Departures
   shows whole, and without the follow-ups that are not due, which the Trips
   page keeps.

   Nothing here reads the database or the page. The trip row brings its own
   columns, and the caller hands in what only it can read, as the checklist
   takes it: `factsOf(trip, leg)` for the leg's buses and seats, and
   `contactOf(trip)` for whether it has a day-of contact.
   Needs billing.js, follow-up.js and checklist.js loaded first.
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
    'leaving': { label: 'Leaving soon' },
    'follow-up': { label: 'Follow-up' },
  };

  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parseISO = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
  // Whole days from today to a day, 0 on the day, or null with no date.
  const daysTo = day => (day ? Math.round((parseISO(day) - parseISO(iso(new Date()))) / 864e5) : null);
  const within = (day, days) => { const n = daysTo(day); return n != null && n >= 0 && n <= days; };

  const split = trip => trip.trip_type === 'dropoff_pickup';
  // The day a leg leaves, as the Departures list reads it.
  const legDay = (trip, leg) => (leg === 'return' ? (trip.return_start_date ?? trip.end_date) : trip.start_date) ?? null;
  // A split trip's leg in the office's words; any other trip has one leg and names none.
  const legName = (trip, leg) => (split(trip) ? (leg === 'return' ? 'Pickup' : 'Drop-off') : null);
  const live = trip => !trip.cancelled_at && !Checklist.placeholder(trip);

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

      for (const leg of Checklist.legsOf(trip)) {
        if (!within(legDay(trip, leg), SOON_DAYS)) continue;
        const said = new Set([
          ...(waits.includes('confirmation') ? ['confirmed'] : []),
          ...(waits.includes('itinerary') ? ['itinerary'] : []),
          ...(short.has(leg) ? ['buses'] : []),
        ]);
        const open = Checklist.legItems(trip, leg, factsOf(trip, leg), contactOf(trip))
          .filter(i => !i.done && SOON_GROUPS.includes(i.group) && !said.has(i.id.split(':')[0]));
        if (open.length) out.push(row('leaving', trip, leg, { what: open.map(openWords).join(' · '), detail: null }));
      }
    }
    const order = Object.keys(KINDS);
    return out.sort((a, b) => String(a.day || '9').localeCompare(String(b.day || '9'))
      || String(a.trip.id).localeCompare(String(b.trip.id)) || order.indexOf(a.kind) - order.indexOf(b.kind));
  }

  /* The rows as the Prep list shows them: one for each trip on each day it
     has a gap, with every gap in `whats`, soonest first. A row on one of
     `prepDays` is left out, because that day's legs are shown whole, and so
     is a follow-up that is not due. A gap that is one leg's names the leg on
     a split trip, and the row opens that leg. */
  function byTrip(all, prepDays = []) {
    const out = new Map();
    for (const r of all || []) {
      if (!r.day || prepDays.includes(r.day)) continue;
      if (r.kind === 'follow-up' && !r.due) continue;
      const key = `${r.day}:${r.trip.id}`;
      if (!out.has(key)) out.set(key, { key, trip: r.trip, day: r.day, leg: null, legName: null, whats: [] });
      const row = out.get(key);
      if (r.leg && !row.leg) { row.leg = r.leg; row.legName = r.legName; }
      const said = r.kind !== 'follow-up' && r.detail ? `${r.what} ${r.detail}` : r.what;
      for (const what of String(said).split(' · ')) if (!row.whats.includes(what)) row.whats.push(what);
    }
    return [...out.values()].sort((a, b) => a.day.localeCompare(b.day) || String(a.trip.id).localeCompare(String(b.trip.id)));
  }

  window.SchedulerToDo = { KINDS, SOON_DAYS, SHORT_DAYS, TIMES_DAYS, rows, byTrip, legDay, legName, hasTimes };
})();
