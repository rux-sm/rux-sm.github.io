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

  const timesOf = (trip, leg) => {
    const { pickup, back } = stopsOfLeg(trip, leg);
    return {
      depart: pickup?.depart_prev || (leg === 'outbound' ? trip.departure_time : trip.return_time) || null,
      back: back?.arrive || null,
      spot: pickup?.spot || null,
    };
  };

  const legsOf = trip => {
    const legs = [];
    if (trip.start_date) legs.push({ leg: 'outbound', from: trip.start_date, to: trip.end_date || trip.start_date, count: trip.bus_count || 1, ...timesOf(trip, 'outbound') });
    if (trip.return_start_date) legs.push({ leg: 'return', from: trip.return_start_date, to: trip.return_end_date || trip.return_start_date, count: trip.return_bus_count || trip.bus_count || 1, ...timesOf(trip, 'return') });
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
    stopsOfLeg, timesOf, legsOf, clip, assignLanes,
  };
})();
