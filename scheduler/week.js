/* ==========================================================================
   Rux Scheduler — WEEK, where a trip sits on a week and what colour it paints
   --------------------------------------------------------------------------
   Loaded by the board and by the forms page and owned by neither: the board
   draws a week and the printed week puts the same week on paper, and a trip
   that covers different days, takes a different lane or paints a different
   colour in the two is a fault nobody sees until the sheet is on the wall.
   Nothing here reads the page or the database; each takes a trip as the
   database returns it.
   ========================================================================== */
(() => {
  'use strict';

  const DAY = 864e5;
  const parseISO = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
  const daysBetween = (a, b) => Math.round((b - a) / DAY);

  // -- the palette ----------------------------------------------------------
  /* The trip colours, read by the board, the editor, the bar menu and the
     printed week. `value` is what `trips.trip_bar_color` stores and `hue` is
     the `scheduler-bar--*` class that paints it. Amber is the office's
     placeholder, a trip not yet quoted, and its bar is never marked as the
     wrong bus.

     Retired names are mapped on read and never rewritten, as rux-ui does:
     orange and yellow paint as amber, cyan as teal. */
  const TRIP_COLORS = [
    { value: 'teal', label: 'Teal', hue: 'teal' },
    { value: 'green', label: 'Green', hue: 'green' },
    { value: 'purple', label: 'Purple', hue: 'purple' },
    { value: 'amber', label: 'Placeholder', hue: 'amber' },
    { value: 'pink', label: 'Pink', hue: 'magenta' },
  ];
  const RETIRED_COLORS = { orange: 'amber', cyan: 'teal', yellow: 'amber' };
  // The colour a trip paints as, by its current name, or null for standard.
  const tripColorOf = trip => {
    const stored = String(trip.trip_bar_color || '').toLowerCase();
    const name = RETIRED_COLORS[stored] ?? stored;
    return TRIP_COLORS.some(c => c.value === name) ? name : null;
  };
  // Standard is the status colour: red for an unconfirmed trip, blue otherwise.
  const standardHueOf = trip => (trip.confirmed === false ? 'red' : 'blue');

  // An override colour beats status, and status beats the default blue, as in rux-ui.
  const hueFor = trip => TRIP_COLORS.find(c => c.value === tripColorOf(trip))?.hue
    ?? standardHueOf(trip);

  // -- placing --------------------------------------------------------------
  /* A leg's own stops in order, and the two that carry its times: the first
     `pickup` holds the departure in `depart_prev` and the last `return` the
     arrival in `arrive`. The board and the editor both use it, so they pick
     the same two; `timesOf` falls back to the trip's own time columns. */
  const stopsOfLeg = (trip, leg) => {
    const stops = (trip.trip_stops || [])
      .filter(s => (s.leg || 'outbound') === leg)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    return {
      stops,
      pickup: stops.find(s => s.type === 'pickup') ?? stops[0],
      back: [...stops].reverse().find(s => s.type === 'return'),
    };
  };

  /* The midnights a one-day leg's return comes after its departure. The leg's
     times are read in the order they happen, the yard out, the spot, the
     group's departure, each stop and the yard back, and a time earlier on the
     clock than the one before it is past midnight. The count starts at the
     group's departure, which is on the leg's day, so a yard departure the
     night before is not counted. A longer leg's end is on its last day. */
  const clockMin = t => {
    const m = /^(\d{1,2}):(\d{2})/.exec(t || '');
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  };
  const midnightsOf = (stops, pickup, back, depart) => {
    if (!back?.arrive) return 0;
    const rows = stops.slice(Math.max(stops.indexOf(pickup), 0), stops.indexOf(back) + 1);
    // The pickup row's yard departure, arrival and spot, then each row after it.
    const run = [depart, pickup?.arrive, pickup?.spot];
    for (const s of rows.slice(1)) run.push(s.depart_prev, s.arrive, s.spot);
    // The group's departure is the row after the pickup's `depart_prev`.
    const group = rows.length > 1 ? 3 : 0;
    let last = null, days = 0, start = 0;
    run.forEach((t, i) => {
      const m = clockMin(t);
      if (m != null) {
        if (last != null && m < last) days++;
        last = m;
      }
      if (i === group) start = days;
    });
    return days - start;
  };

  /* A leg's times as saved: the yard departure, the spot, the trip's end and
     the yard return, and `nights`, the midnights a one-day leg's return comes
     after its departure. */
  const timesOf = (trip, leg) => {
    const { stops, pickup, back } = stopsOfLeg(trip, leg);
    const depart = pickup?.depart_prev || (leg === 'outbound' ? trip.departure_time : trip.return_time) || null;
    return {
      depart,
      back: back?.arrive || null,
      spot: pickup?.spot || null,
      end: back?.depart_prev || null,
      nights: midnightsOf(stops, pickup, back, depart),
    };
  };

  /* THE LATE RETURN, the office's, kept in `settings` as `late-return-v1`: a
     bus back at the yard before this hour of the morning came back the night
     before, so the day it is back on is not one the leg takes. Hour 0 counts
     no return as the night before. */
  const LATE_RETURN_HOUR = 4;
  let lateBefore = LATE_RETURN_HOUR * 60;
  const setLateReturn = value => {
    const hour = Number(value?.hour);
    lateBefore = (value?.hour != null && Number.isFinite(hour) && hour >= 0 && hour <= 12 ? hour : LATE_RETURN_HOUR) * 60;
  };
  // The hour as minutes after midnight, for a route's model.
  const lateReturn = () => lateBefore;

  const dayFrom = (day, n) => {
    const d = parseISO(day);
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  /* THE DAYS A LEG TAKES, from its dates and its times as `timesOf` gives
     them. The bus is back on the leg's last day, or the day after when the
     yard return is earlier on the clock than the trip's end; on a one-day leg
     it is back as many days on as its times pass midnight. Back before the
     late-return hour, the leg takes the days up to the one before and
     `backDays` says how many days after its last the bus is back, the bar's
     +1; back at or after that hour, it takes the day it is back on. A leg
     with no yard return takes its own dates. */
  const takes = (from, to, times) => {
    const back = clockMin(times?.back);
    if (back == null) return { to, backDays: 0 };
    const end = clockMin(times.end);
    const backOn = dayFrom(to, to > from ? (end != null && back < end ? 1 : 0) : times.nights ?? 0);
    return back < lateBefore && backOn > from ? { to: dayFrom(backOn, -1), backDays: 1 } : { to: backOn, backDays: 0 };
  };

  // A leg saved with its end before its start is read as its start day, so it
  // still has a bar to open and put right.
  const lastDay = (from, to) => (to && to >= from ? to : from);
  /* A trip's legs, each with the days it takes, `from` to `to`, and `ends`,
     the last day as saved. */
  const legsOf = trip => {
    const legs = [];
    const add = (leg, from, end, count) => {
      const times = timesOf(trip, leg);
      const ends = lastDay(from, end);
      legs.push({ leg, from, ends, count, ...times, ...takes(from, ends, times) });
    };
    if (trip.start_date) add('outbound', trip.start_date, trip.end_date, trip.bus_count || 1);
    if (trip.return_start_date) add('return', trip.return_start_date, trip.return_end_date, trip.return_bus_count || trip.bus_count || 1);
    return legs;
  };

  const clip = (from, to, weekStart, weekEnd) => {
    const a = parseISO(from), b = parseISO(to);
    if (b < weekStart || a > weekEnd) return null;
    const vs = a < weekStart ? weekStart : a;
    const ve = b > weekEnd ? weekEnd : b;
    return {
      start: daysBetween(weekStart, vs),
      span: daysBetween(vs, ve) + 1,
      fromPrev: a < weekStart,
      toNext: b > weekEnd,
    };
  };

  // Greedy lane packing: the first lane whose last occupied day ends before
  // this bar starts. Bars are sorted by start first, which is what makes one
  // pass enough.
  function assignLanes(bars) {
    const lastEnd = [];
    bars.sort((x, y) => x.place.start - y.place.start || x.place.span - y.place.span);
    for (const bar of bars) {
      let lane = 0;
      while (lastEnd[lane] !== undefined && lastEnd[lane] >= bar.place.start) lane++;
      bar.lane = lane;
      lastEnd[lane] = bar.place.start + bar.place.span - 1;
    }
    return lastEnd.length || 1;
  }

  window.SchedulerWeek = {
    TRIP_COLORS, RETIRED_COLORS, tripColorOf, standardHueOf, hueFor,
    stopsOfLeg, timesOf, legsOf, takes, setLateReturn, lateReturn, clip, assignLanes,
  };
})();
