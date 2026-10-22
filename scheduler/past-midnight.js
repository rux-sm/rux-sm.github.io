/* ==========================================================================
   Rux Scheduler — PAST MIDNIGHT, the day each of a leg's times falls on
   --------------------------------------------------------------------------
   The one rule for a leg's times that carry no date: read in the order they
   happen, a time earlier on the clock than the last one before it is the
   next day's. The board's +1, the Route tab's Summary, the Detailed
   itinerary, the driver's road, the quote's words and the Route tab's stop
   order all count days by it, so 1:00 AM after an evening is never read as
   the morning the leg starts.

     daysPast(times)   the midnights passed at each of `times`, from the
                       first: a time is "HH:MM", or minutes after midnight,
                       and an empty one takes the count so far
     after(last, time) whether `time` is past a midnight after `last`
     forward(minutes)  each value moved on by whole days until it is not
                       before the one before it, an empty one kept empty

   Nothing here reads the page or the database, and it needs nothing loaded
   first. Its sample cases are in tools/check-past-midnight.mjs.
   ========================================================================== */
(() => {
  'use strict';

  const DAY = 1440;
  // Minutes after midnight, from "HH:MM", "HH:MM:SS" or a number; null for none.
  const minutesOf = t => {
    if (typeof t === 'number') return Number.isFinite(t) ? t : null;
    const m = /^(\d{1,2}):(\d{2})/.exec(String(t ?? ''));
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  };

  const after = (last, time) => {
    const a = minutesOf(last), b = minutesOf(time);
    return a != null && b != null && b < a;
  };

  function daysPast(times) {
    let last = null, days = 0;
    return times.map(t => {
      const n = minutesOf(t);
      if (n == null) return days;
      if (last != null && n < last) days += 1;
      last = n;
      return days;
    });
  }

  function forward(minutes) {
    let prev = null;
    return minutes.map(v => {
      if (v == null) return null;
      let at = v;
      while (prev != null && at < prev) at += DAY;
      prev = at;
      return at;
    });
  }

  window.SchedulerPastMidnight = { minutesOf, after, daysPast, forward };
})();
