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
     placeholder colour, for a trip not yet quoted or one whose customer has
     not settled its date or destination; billing.js says when an amber trip
     is a placeholder. */
  const TRIP_COLORS = [
    { value: 'teal', label: 'Teal', hue: 'teal' },
    { value: 'green', label: 'Green', hue: 'green' },
    { value: 'purple', label: 'Purple', hue: 'purple' },
    { value: 'amber', label: 'Placeholder', hue: 'amber' },
  ];
  // The colour a trip paints as, by its current name, or null for standard.
  const tripColorOf = trip => {
    const stored = String(trip.trip_bar_color || '').toLowerCase();
    return TRIP_COLORS.some(c => c.value === stored) ? stored : null;
  };
  /* Standard is the status colour: red for an unconfirmed trip, and for a
     confirmed one blue, or gray where the View menu's Confirmed trips in
     gray is on, which data.js sets through `confirmedHue`. */
  let confirmed = 'blue';
  const confirmedHue = hue => { confirmed = hue; };
  const standardHueOf = trip => (trip.confirmed === false ? 'red' : confirmed);

  // An override colour beats status, and status beats the confirmed colour.
  const hueFor = trip => TRIP_COLORS.find(c => c.value === tripColorOf(trip))?.hue
    ?? standardHueOf(trip);

  // -- placing --------------------------------------------------------------
  /* A leg's own stops in order, and the two that carry its times: the first
     `pickup` holds the departure in `depart_prev` and the last `return` the
     arrival in `arrive`. The board and the editor both use it, so they pick
     the same two; `timesOf` falls back to the trip's own time columns.

     A TRIP READ WITH ITS LEGS is read through trip-shape.js: the stops of
     the route named, or of the leg's first route with none named, the leg
     named by its key, its id, or by the old word a page still names it by.
     One read without them, from a page whose query does not ask for them
     yet, is read by the old word on each stop. */
  const SHAPE = window.SchedulerTripShape;
  const shaped = trip => Array.isArray(trip?.trip_legs) && !!SHAPE;
  const shapeLeg = (trip, key) => SHAPE.legOf(trip, key) ?? SHAPE.legOfWord(trip, key);
  const stopsOfLeg = (trip, leg, routeId = null) => {
    const routes = shaped(trip) ? shapeLeg(trip, leg)?.routes ?? [] : [];
    const route = routes.find(r => r.id === routeId) ?? routes[0];
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

  /* The days before the group's that the bus leaves the yard: the pickup's
     yard departure is dated, and the group's day is its spot's, or the
     departure from the pickup's where it has no spot. Counted between the two
     saved days, so it holds while the leg's dates move in the editor. */
  const outDaysOf = (stops, pickup) => {
    const out = pickup?.depart_prev ? pickup.depart_prev_date : null;
    const group = pickup?.spot_date || stops[stops.indexOf(pickup) + 1]?.depart_prev_date || null;
    return out && group && out < group ? daysBetween(parseISO(out), parseISO(group)) : 0;
  };

  /* A route's times as saved, by its leg's key or old word and the route's
     id, the leg's first route with none named: the yard departure,
     the spot, the trip's end and the yard return, `nights`, the midnights a
     one-day leg's return comes after its departure, and `outDays`, the days
     before the leg's first that the bus leaves the yard. A leg with no pickup
     departure takes the trip's time column for the word it mirrors, and a
     leg that mirrors none has no departure. */
  const timesOf = (trip, leg, routeId = null) => {
    const { stops, pickup, back } = stopsOfLeg(trip, leg, routeId);
    const word = shaped(trip) ? shapeLeg(trip, leg)?.word ?? null : leg;
    const depart = pickup?.depart_prev || (word === 'outbound' ? trip.departure_time : word ? trip.return_time : null) || null;
    return {
      depart,
      back: back?.arrive || null,
      spot: pickup?.spot || null,
      end: back?.depart_prev || null,
      nights: midnightsOf(stops, pickup, back, depart),
      outDays: outDaysOf(stops, pickup),
    };
  };

  /* THE LATE RETURN, the office's, kept in `settings` as `late-return-v1`: a
     bus back at the yard before this hour of the morning came back the night
     before, so the day it is back on is not one the leg takes. Hour 0 counts
     no return as the night before. Its `night_hour` is the same rule at the
     other end, a PM hour: a bus that leaves the yard at or after it on the
     evening just before the leg's first day left for that day, so the evening
     it leaves on is not one the leg takes. Hour 12, midnight, counts no
     departure so. */
  const LATE_RETURN_HOUR = 4;
  const NIGHT_HOUR = 11;
  let lateBefore = LATE_RETURN_HOUR * 60;
  let nightFrom = (12 + NIGHT_HOUR) * 60;
  const setLateReturn = value => {
    const hour = Number(value?.hour);
    lateBefore = (value?.hour != null && Number.isFinite(hour) && hour >= 0 && hour <= 12 ? hour : LATE_RETURN_HOUR) * 60;
    const night = Number(value?.night_hour);
    nightFrom = (12 + (value?.night_hour != null && Number.isInteger(night) && night >= 1 && night <= 12 ? night : NIGHT_HOUR)) * 60;
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
     more, which settles a guess across a clock change. The night the clocks
     go back, 1:00 to 1:59 comes twice, and `later` takes the second reading
     where the first is otherwise taken, so a leg leaves at the first and is
     back at the second, and a bus is never thought late or home an hour
     early. A leg leaves the yard at its departure on the first day it takes,
     or that day's start with none; it is back at its yard return, on the day after `to` when that
     is past midnight, or with no return at the late-return hour after its
     last day. */
  // Made once: a draw reads the office's clock about 1,600 times.
  const OFFICE_WALL = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  const officeWall = ms => {
    const parts = OFFICE_WALL.formatToParts(new Date(ms));
    const n = t => Number(parts.find(p => p.type === t)?.value);
    return Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute'));
  };
  const HOUR_MS = 36e5;
  const officeInstant = (day, time, later = false) => {
    const [y, m, d] = String(day).split('-').map(Number);
    const [h, min] = String(time || '00:00').split(':').map(Number);
    const asUtc = Date.UTC(y, m - 1, d, h || 0, min || 0);
    const first = asUtc - (officeWall(asUtc) - asUtc);
    const at = asUtc - (officeWall(first) - first);
    // A wall time read twice is an hour either side of `at`, which is one of them.
    if (!later) return officeWall(at - HOUR_MS) === asUtc ? at - HOUR_MS : at;
    return officeWall(at + HOUR_MS) === asUtc ? at + HOUR_MS : at;
  };
  const departAt = leg => officeInstant(dayFrom(leg.from, -(leg.departDays ?? 0)), leg.depart);
  const backAt = leg => (leg.back
    ? officeInstant(dayFrom(leg.to, leg.backDays ?? 0), leg.back, true)
    : officeInstant(dayFrom(leg.to, 1), `${Math.floor(lateBefore / 60)}:${lateBefore % 60}`, true));

  /* THE DAYS A LEG TAKES, from its dates and its times as `timesOf` gives
     them. The bus is back on the leg's last day, or the day after when the
     yard return is earlier on the clock than the trip's end; on a one-day leg
     it is back as many days on as its times pass midnight. Back before the
     late-return hour, the leg takes the days up to the one before and
     `backDays` says how many days after its last the bus is back, the bar's
     +1; back at or after that hour, it takes the day it is back on. A leg
     with no yard return takes its own last day. A bus that leaves the yard
     before the leg's first day, to be at a far pickup by its spot, takes
     from the day it leaves, `outDays` before, since it is out of the yard
     from then on; one that leaves the evening just before at or after the
     night hour takes from the leg's first day, and `departDays` says how
     many days before it the bus leaves, the bar's −1. */
  /* The most days before its first that a leg's bus leaves the yard, so a
     read of the trips on a range of days reaches this far past its last. */
  const AHEAD_DAYS = 2;
  const takes = (from, to, times) => {
    const PAST = window.SchedulerPastMidnight;
    const night = times?.outDays === 1 && (PAST.minutesOf(times.depart) ?? -1) >= nightFrom;
    const out = night ? { from, outDays: 0, departDays: 1 }
      : times?.outDays > 0 ? { from: dayFrom(from, -times.outDays), outDays: times.outDays, departDays: 0 }
      : { from, outDays: 0, departDays: 0 };
    const back = PAST.minutesOf(times?.back);
    if (back == null) return { ...out, to, backDays: 0 };
    const backOn = dayFrom(to, to > from ? (PAST.after(times.end, times.back) ? 1 : 0) : times.nights ?? 0);
    return { ...out, ...(back < lateBefore && backOn > from ? { to: dayFrom(backOn, -1), backDays: 1 } : { to: backOn, backDays: 0 }) };
  };

  // A leg saved with its end before its start is read as its start day, so it
  // still has a bar to open and put right.
  const lastDay = (from, to) => (to && to >= from ? to : from);
  /* A trip's legs, each with `starts` and `ends`, the first and last day as
     saved, `number`, from 1 in date order, and `routes`, each route's own
     times and the days its buses take, with `routeId`, `routeName` and
     `routeNumber`; a trip read without its legs has one route with no id.
     A leg takes `from` to `to`, the first day any of its routes takes to
     the last, and carries its first route's times, which a page reading a
     bus reads from its route instead, through `rangeOf`. `key` tells the
     legs apart: the leg's id on a trip read with its legs, which gives
     `legId` too, and the old word on one that is not, such as a draft. A
     leg that mirrors an old word carries it in `leg`, which the old columns
     are read by, and a leg that mirrors none carries null. */
  const legsOf = trip => {
    const legs = [];
    const add = (leg, from, end, count, more = {}, routes = [null]) => {
      const ends = lastDay(from, end);
      const timed = routes.map((r, i) => {
        const times = timesOf(trip, more.key ?? leg, r?.id ?? null);
        return { routeId: r?.id ?? null, routeName: r?.name || null, routeNumber: i + 1, ...times, ...takes(from, ends, times) };
      });
      const { routeId, routeName, routeNumber, ...first } = timed[0];
      legs.push({ leg, key: leg, number: legs.length + 1, starts: from, ends, count, ...first, ...more,
        from: timed.reduce((d, r) => (r.from < d ? r.from : d), first.from),
        to: timed.reduce((d, r) => (r.to > d ? r.to : d), first.to),
        routes: timed });
    };
    if (shaped(trip)) {
      for (const l of SHAPE.legsOf(trip)) {
        if (l.start) {
          add(l.word, l.start, l.end, l.busCount || 1,
            { legId: l.id, key: l.id, number: l.number, hotelBooked: l.hotelBooked, hotelNumber: l.hotelNumber },
            l.routes.length ? l.routes : [null]);
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
  /* ONE ROUTE OF A LEG, as a leg: the leg with that route's times and the
     days its buses take, `routeId`, `routeName`, `routeNumber`, and
     `routeCount`, how many routes the leg has. A route the leg lacks, or
     none named, is its first, as a vehicle a page has made and not yet read
     back with its route is on. */
  const rangeOf = (leg, routeId = null) => {
    if (!leg) return null;
    const route = leg.routes.find(r => r.routeId === routeId) ?? leg.routes[0];
    return { ...leg, ...route, routeCount: leg.routes.length };
  };
  /* A trip's leg by its key, or by the old word a link or row still names;
     with a route named, that route of it, as `rangeOf` gives it. */
  const legByKey = (trip, key, routeId) => {
    const leg = legsOf(trip).find(l => l.key === key)
      ?? (key == null ? null : legsOf(trip).find(l => l.leg === key)) ?? null;
    return routeId === undefined ? leg : rangeOf(leg, routeId);
  };
  /* Every route of every leg of a trip, each as `rangeOf` gives it, with
     the vehicles on it in position order: a bus's days and times are its
     route's. A vehicle with no route yet is on its leg's first. */
  const rangesOf = trip => legsOf(trip).flatMap(leg => {
    const vehicles = (trip.trip_assignments || []).filter(a => legKeyOfVehicle(trip, a) === leg.key)
      .sort((x, y) => (x.position ?? 0) - (y.position ?? 0));
    return leg.routes.map((r, i) => ({
      ...rangeOf(leg, r.routeId),
      vehicles: vehicles.filter(a => (leg.routes.some(x => x.routeId === a.route_id) ? a.route_id === r.routeId : i === 0)),
    }));
  });

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
    TRIP_COLORS, tripColorOf, standardHueOf, hueFor, confirmedHue,
    stopsOfLeg, stopsOfKey, timesOf, legsOf, rangeOf, rangesOf, legKeyOfVehicle, legByKey, takes, setLateReturn, lateReturn, clip, assignLanes,
    officeInstant, departAt, backAt, AHEAD_DAYS,
  };
})();
