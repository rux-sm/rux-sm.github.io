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
     placeholder colour; billing.js says when an amber trip is a placeholder.

     Retired names are mapped on read and never rewritten:
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

  // An override colour beats status, and status beats the default blue.
  const hueFor = trip => TRIP_COLORS.find(c => c.value === tripColorOf(trip))?.hue
    ?? standardHueOf(trip);

  // -- placing --------------------------------------------------------------
  /* A leg's own stops in order, and the two that carry its times: the first
     `pickup` holds the departure in `depart_prev` and the last `return` the
     arrival in `arrive`. The board and the editor both use it, so they pick
     the same two; `timesOf` falls back to the trip's own time columns.

     A TRIP READ WITH ITS LEGS is read through trip-shape.js: the leg's
     first route's stops, the leg named by its key, its id, or by the old
     word a page still names it by. One read without them, from a page whose
     query does not ask for them yet, is read by the old word on each stop. */
  const SHAPE = window.SchedulerTripShape;
  const shaped = trip => Array.isArray(trip?.trip_legs) && !!SHAPE;
  const shapeLeg = (trip, key) => SHAPE.legOf(trip, key) ?? SHAPE.legOfWord(trip, key);
  const stopsOfLeg = (trip, leg) => {
    const route = shaped(trip) ? shapeLeg(trip, leg)?.routes[0] : null;
    const stops = route ? SHAPE.stopsOfRoute(trip, route.id)
      : (trip.trip_stops || [])
        .filter(s => (s.leg || 'outbound') === leg)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    return {
      stops,
      pickup: stops.find(s => s.type === 'pickup') ?? stops[0],
      back: [...stops].reverse().find(s => s.type === 'return'),
    };
  };

  /* The midnights a one-day leg's return comes after its departure, by
     past-midnight.js's rule. The leg's times are read in the order they
     happen, the yard out, the spot, the group's departure, each stop and the
     yard back. The count starts at the group's departure, which is on the
     leg's day, so a yard departure the night before is not counted. A longer
     leg's end is on its last day. */
  const midnightsOf = (stops, pickup, back, depart) => {
    if (!back?.arrive) return 0;
    const rows = stops.slice(Math.max(stops.indexOf(pickup), 0), stops.indexOf(back) + 1);
    // The pickup row's yard departure, arrival and spot, then each row after it.
    const run = [depart, pickup?.arrive, pickup?.spot];
    for (const s of rows.slice(1)) run.push(s.depart_prev, s.arrive, s.spot);
    // The group's departure is the row after the pickup's `depart_prev`.
    const group = rows.length > 1 ? 3 : 0;
    const days = window.SchedulerPastMidnight.daysPast(run);
    return days.at(-1) - days[group];
  };

  /* A leg's times as saved, by its key or its old word: the yard departure,
     the spot, the trip's end and the yard return, and `nights`, the midnights
     a one-day leg's return comes after its departure. A leg with no pickup
     departure takes the trip's time column for the word it mirrors, and a
     leg that mirrors none has no departure. */
  const timesOf = (trip, leg) => {
    const { stops, pickup, back } = stopsOfLeg(trip, leg);
    const word = shaped(trip) ? shapeLeg(trip, leg)?.word ?? null : leg;
    const depart = pickup?.depart_prev || (word === 'outbound' ? trip.departure_time : word ? trip.return_time : null) || null;
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

  /* THE OFFICE'S CLOCK. A McAllen date and time as an instant, whatever zone
     the browser is in: the offset is found at a first guess and checked once
     more, which settles a guess across a clock change. A leg leaves the yard
     at its departure, or its first day's start with none; it is back at its
     yard return, on the day after `to` when that is past midnight, or with no
     return at the late-return hour after its last day. */
  const officeWall = ms => {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(ms));
    const n = t => Number(parts.find(p => p.type === t)?.value);
    return Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute'));
  };
  const officeInstant = (day, time) => {
    const [y, m, d] = String(day).split('-').map(Number);
    const [h, min] = String(time || '00:00').split(':').map(Number);
    const asUtc = Date.UTC(y, m - 1, d, h || 0, min || 0);
    const first = asUtc - (officeWall(asUtc) - asUtc);
    return asUtc - (officeWall(first) - first);
  };
  const departAt = leg => officeInstant(leg.from, leg.depart);
  const backAt = leg => (leg.back
    ? officeInstant(dayFrom(leg.to, leg.backDays ?? 0), leg.back)
    : officeInstant(dayFrom(leg.to, 1), `${Math.floor(lateBefore / 60)}:${lateBefore % 60}`));

  /* THE DAYS A LEG TAKES, from its dates and its times as `timesOf` gives
     them. The bus is back on the leg's last day, or the day after when the
     yard return is earlier on the clock than the trip's end; on a one-day leg
     it is back as many days on as its times pass midnight. Back before the
     late-return hour, the leg takes the days up to the one before and
     `backDays` says how many days after its last the bus is back, the bar's
     +1; back at or after that hour, it takes the day it is back on. A leg
     with no yard return takes its own dates. */
  const takes = (from, to, times) => {
    const PAST = window.SchedulerPastMidnight;
    const back = PAST.minutesOf(times?.back);
    if (back == null) return { to, backDays: 0 };
    const backOn = dayFrom(to, to > from ? (PAST.after(times.end, times.back) ? 1 : 0) : times.nights ?? 0);
    return back < lateBefore && backOn > from ? { to: dayFrom(backOn, -1), backDays: 1 } : { to: backOn, backDays: 0 };
  };

  // A leg saved with its end before its start is read as its start day, so it
  // still has a bar to open and put right.
  const lastDay = (from, to) => (to && to >= from ? to : from);
  /* A trip's legs, each with the days it takes, `from` to `to`, `ends`, the
     last day as saved, and `number`, from 1 in date order. `key` tells the
     legs apart: the leg's id on a trip read with its legs, which gives
     `legId` too, and the old word on one that is not, such as a draft. A
     leg that mirrors an old word carries it in `leg`, which the old columns
     are read by, and a leg that mirrors none carries null. */
  const legsOf = trip => {
    const legs = [];
    const add = (leg, from, end, count, more = {}) => {
      const times = timesOf(trip, more.key ?? leg);
      const ends = lastDay(from, end);
      legs.push({ leg, key: leg, number: legs.length + 1, from, ends, count, ...times, ...takes(from, ends, times), ...more });
    };
    if (shaped(trip)) {
      for (const l of SHAPE.legsOf(trip)) {
        if (l.start) {
          add(l.word, l.start, l.end, l.busCount || 1,
            { legId: l.id, key: l.id, number: l.number, hotelBooked: l.hotelBooked, hotelNumber: l.hotelNumber });
        }
      }
      return legs;
    }
    const hotel = word => ({ hotelBooked: !!trip[`hotel_booked_${word}`], hotelNumber: trip[`hotel_itinerary_number_${word}`] || null });
    if (trip.start_date) add('outbound', trip.start_date, trip.end_date, trip.bus_count || 1, hotel('outbound'));
    if (trip.return_start_date) add('return', trip.return_start_date, trip.return_end_date, trip.return_bus_count || trip.bus_count || 1, hotel('return'));
    return legs;
  };
  /* A leg's own stops in order, by its key: every route's on a trip read
     with its legs, and the stops naming its word on one that is not. */
  const stopsOfKey = (trip, key) => (shaped(trip)
    ? (SHAPE.legOf(trip, key)?.routes ?? []).flatMap(r => SHAPE.stopsOfRoute(trip, r.id))
    : (trip.trip_stops || []).filter(s => (s.leg || 'outbound') === key).sort((a, b) => (a.position ?? 0) - (b.position ?? 0)));
  /* The key of the leg a vehicle runs on: on a trip read with its legs, its
     route's leg, or the leg its old word names while the page has made it
     and not yet read it back with its route; on one that is not, the word. */
  const legKeyOfVehicle = (trip, a) => (!shaped(trip) ? a?.leg || 'outbound'
    : (a?.route_id ? SHAPE.legOfRoute(trip, a.route_id) : SHAPE.legOfWord(trip, a?.leg))?.id ?? null);
  // A trip's leg by its key, or by the old word a link or row still names.
  const legByKey = (trip, key) => legsOf(trip).find(l => l.key === key)
    ?? (key == null ? null : legsOf(trip).find(l => l.leg === key)) ?? null;

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
    stopsOfLeg, stopsOfKey, timesOf, legsOf, legKeyOfVehicle, legByKey, takes, setLateReturn, lateReturn, clip, assignLanes,
    officeInstant, departAt, backAt,
  };
})();
