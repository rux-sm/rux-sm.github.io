/* ==========================================================================
   Rux Scheduler — ROUTE FIGURES, a leg's miles, drive and hours of service
   --------------------------------------------------------------------------
   Loaded by the board and by the forms page and owned by neither: the Route
   tab's Summary and the Detailed itinerary print the same figures, and two
   sums of the same leg are two answers waiting to disagree. Nothing here
   reads the page or the database; each function takes a leg's model.

   A LEG'S MODEL is what the Route tab edits, in one shape whichever side
   built it: the Route tab from its fields as they stand, `fromStops` from a
   leg's saved `trip_stops`.

     from, to   the leg's first and last day, ISO
     pre, post  the office's pre-trip and post-trip minutes (`route-times-v1`)
     times      { depart, spot, leave, endtrip, back }: the yard departure,
                the spot, the group's departure, the trip's end and the yard
                return, "HH:MM" or empty
     out, home  [minutes, miles] of the drive from the yard and back to it
     drop       [minutes, miles] of the drive on to where the group is let
                off, and `dropCounts` whether that drive is part of the leg
     list       the stops between, in order: { arrive, leave, date,
                leaveDate, dwell, drive, miles }; a stop's `drive` and
                `miles` are the leg into it
     located    (stop) -> whether the stop has a point on the map; a stop
                with none is passed over, its drive measured past it
   ========================================================================== */
(() => {
  'use strict';

  const DAY = 864e5;
  const parseISO = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const dayAfter = (d, n) => {
    if (!d) return null;
    const at = parseISO(d);
    return iso(new Date(at.getFullYear(), at.getMonth(), at.getDate() + n));
  };
  const daysFrom = (a, b) => Math.round((parseISO(b) - parseISO(a)) / DAY);

  // Minutes after midnight, from "HH:MM" or "HH:MM:SS".
  const toMin = t => {
    const m = /^(\d{1,2}):(\d{2})/.exec(String(t ?? ''));
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  };

  // "4 h 03", "4 h" or "31 min": the Summary's way of writing a length of time.
  const hm = n => {
    const h = Math.floor(n / 60), m = Math.round(n % 60);
    if (!h) return `${m} min`;
    return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
  };

  /* The day a stop is left: the day picked for it when that is after the day
     it is reached, a stay of nights; otherwise the day it is reached, or the
     next when it is left at an earlier time than it was reached, one night
     spent there. A saved day no later than the arrival is read the same way,
     which puts right a morning saved under the night before. */
  const leaveDayOf = (st, from) => {
    const d = st.date ?? from;
    if (d && st.leaveDate && st.leaveDate > d) return st.leaveDate;
    return d && st.arrive && st.leave && toMin(st.leave) < toMin(st.arrive) ? dayAfter(d, 1) : d;
  };

  const manyDays = m => !!(m.from && m.to && m.to > m.from);
  const isLocated = (m, st) => (m.located ? m.located(st) : !!st.located);
  const dayOf = (m, st) => st.date || m.from;

  // A wait runs from the arrival to the leave on the day each falls, which
  // may be the next day or, for a stay of nights, a later one.
  function waitOf(m, st) {
    const got = toMin(st.arrive), left = toMin(st.leave);
    if (got == null || left == null) return null;
    const d = st.date ?? m.from;
    if (!d) return left > got ? left - got : left < got ? left + 1440 - got : null;
    const span = daysFrom(d, leaveDayOf(st, m.from)) * 1440 + left - got;
    return span > 0 ? span : null;
  }

  // A leg's time and date as minutes from the leg's first day.
  function minutesAt(m, time, date) {
    const t = toMin(time);
    if (t == null) return null;
    return (date && m.from ? daysFrom(m.from, date) : 0) * 1440 + t;
  }

  /* The minutes the times leave for a drive: from leaving the place before
     to reaching the next, less any wait at a stop passed over on the way. On
     a one-day leg a time earlier than the one it follows is past midnight;
     on a longer leg every time has its day, so an arrival before the
     departure is left negative. Null when either end has no time. */
  function timeBetween(m, start, end, passed) {
    if (start == null || end == null) return null;
    let span = end - start;
    if (span < 0 && !manyDays(m)) span += 1440;
    return span - passed.reduce((n, st) => n + (waitOf(m, st) ?? 0), 0);
  }

  // Where the leg into the i-th stop starts: the last place on the map before it.
  function legInto(m, i) {
    let k = i - 1;
    const passed = [];
    while (k >= 0 && !isLocated(m, m.list[k])) passed.push(m.list[k--]);
    const start = k >= 0
      ? minutesAt(m, m.list[k].leave, leaveDayOf(m.list[k], m.from))
      : minutesAt(m, m.times.leave, m.from);
    return { first: k < 0, start, passed };
  }

  // The minutes the times leave for the drive into a stop, or null.
  function roomInto(m, st) {
    const into = legInto(m, m.list.indexOf(st));
    return timeBetween(m, into.start, minutesAt(m, st.arrive, st.date), into.passed);
  }

  // The same for the drive on to where the group is let off.
  function dropRoom(m) {
    const into = legInto(m, m.list.length);
    return timeBetween(m, into.start, minutesAt(m, m.times.endtrip, m.to), into.passed);
  }

  /* On a one-day leg, the days past the leg's own each time falls, the rule
     the bar's +1 keeps: the times in the order they happen, the yard out to
     the yard back, and one earlier on the clock than the one before it past
     midnight. The group's departure is on the leg's day, so a yard departure
     the night before counts back from it. Keyed 'depart', 'spot', 'leave',
     'endtrip' and 'return', and `${i}:arrive` and `${i}:leave` for the i-th
     stop; empty on a longer leg, whose times carry their dates. */
  function midnights(m) {
    const at = new Map();
    if (manyDays(m)) return at;
    const t = m.times;
    const run = [['depart', t.depart], ['spot', t.spot], ['leave', t.leave],
      ...m.list.flatMap((st, i) => [[`${i}:arrive`, st.arrive], [`${i}:leave`, st.leave]]),
      ['endtrip', t.endtrip], ['return', t.back]];
    let last = null, days = 0;
    for (const [key, time] of run) {
      const n = toMin(time);
      if (n == null) continue;
      if (last != null && n < last) days++;
      last = n;
      at.set(key, days);
    }
    const start = at.get('leave') ?? 0;
    for (const [key, n] of at) at.set(key, n - start);
    return at;
  }

  /* On duty needs its clock times: every stop's arrival, a leave time on a
     wait off the clock that is not the day's last, and the day's start and
     end. Missing any, it says so rather than giving a figure that is short;
     miles and driving come from the places alone and always show. */
  const timesComplete = stops => stops.every(st => st.arrive)
    && stops.slice(0, -1).every(st => !st.dwell || st.dwell === 'on' || st.leave);

  // A wait counted off the clock: off duty or in the sleeper berth.
  const restOf = (m, stops) => stops.reduce((n, st) => n + (st.dwell && st.dwell !== 'on' ? waitOf(m, st) ?? 0 : 0), 0);

  /* A row's cells: miles, drive, on duty as the clock runs and on duty less
     the waits off duty or in the sleeper berth, a dash for none. The row
     keeps its raw figures, which the Total adds up. A leg with no drive
     leaves Drive blank rather than a sum that reads short. */
  function figures(legs, span, rest, needsTimes = false) {
    const known = legs.filter(([n]) => n != null);
    const short = legs.length - known.length;
    const miles = legs.reduce((t, [, mi]) => t + (Number(mi) || 0), 0);
    const status = needsTimes === 'check' ? 'Check times' : needsTimes ? 'Needs times' : null;
    const cells = [
      // The column is headed Miles, so the figure goes bare.
      miles ? String(Math.round(miles)) : '—',
      // A leg not measured says so on its own line, so the cell stays short.
      !legs.length || short ? '—' : hm(known.reduce((n, [d]) => n + d, 0)),
      status ?? (span == null ? '—' : hm(span)),
      status || span == null ? '—' : hm(span - rest),
    ];
    const drive = legs.length && !short ? known.reduce((n, [d]) => n + d, 0) : null;
    return Object.assign(cells, { span: status ? null : span, rest, status, miles, drive });
  }

  /* One day's figures: the legs that end that day, the yard's leg out on the
     first and the legs home on the last, and on duty from the day's first
     time to its last, less its waits marked off duty or sleeper. A later day
     starts when the bus leaves for its first stop. */
  function dayFigures(m, d, first, last) {
    const t = m.times;
    const mine = m.list.filter(st => dayOf(m, st) === d);
    const legs = [...(d === first ? [m.out] : []), ...mine.filter(st => isLocated(m, st)).map(st => [st.drive, st.miles]),
      ...(d === last ? [...(m.dropCounts ? [m.drop] : []), m.home] : [])];
    const times = [];
    const put = (time, less = 0) => { const n = toMin(time); if (n != null) times.push(n - less); };
    /* A day starts with the yard on the first day, or with the bus leaving
       where it spent the night, or else the drive to its first stop. A stop
       left the next day ends its own day when it is reached. */
    const leftToday = m.list.filter(st => dayOf(m, st) !== d && st.leave && leaveDayOf(st, m.from) === d);
    if (d === first) { put(t.depart, m.pre); put(t.spot); put(t.leave); }
    else if (leftToday.length) put(leftToday.at(-1).leave);
    else {
      const timed = mine.find(st => st.arrive);
      if (timed) put(timed.arrive, timed.drive ?? 0);
      else if (d === last) put(t.endtrip, m.drop[0] ?? 0);
    }
    for (const st of mine) { put(st.arrive); if (leaveDayOf(st, m.from) === d) put(st.leave); }
    if (d === last) { put(t.endtrip); put(t.back, -m.post); }
    // A time earlier than the one before it is past midnight.
    let roll = 0;
    const run = [];
    for (const n of times) {
      if (run.length && n + roll < run.at(-1)) roll += 1440;
      run.push(n + roll);
    }
    // A night's wait belongs to neither day, which each end or start at it.
    const rest = restOf(m, mine.filter(st => leaveDayOf(st, m.from) === d));
    const span = run.length > 1 ? run.at(-1) - run[0] : null;
    const needs = !timesComplete(mine) || (d === first && !t.leave) || (d === last && !t.endtrip);
    // A day with a stop reached before the bus left the last one has no
    // on-duty figure to give until its times are put right.
    const wrong = mine.some(st => isLocated(m, st) && (roomInto(m, st) ?? 0) < 0);
    return figures(legs, span, rest, wrong ? 'check' : needs && (mine.length > 0 || d === first || d === last));
  }

  /* THE LEG'S FIGURES. Miles and drive are every leg's: the yard's two and
     each stop's. On duty is the span from pre-trip to post-trip, and less
     rest is that less the waits the driver is off the clock for, the
     passenger rule's own sum. A leg of more than one day has a row a day,
     `each`, and its Total's on duty is theirs added up once every day has
     its times.

     Returns { days, dates, each, total, backOn, dayMiles, legMiles, legDays,
     over, status, unmeasured }: `backOn` the day the bus is back when it is
     not the leg's first, `over` the first row past the second-driver rule
     (over 10 hours driving, or over 15 on duty less rest), `status` Needs
     times or Check times when the times cannot give on duty. */
  function legFigures(m) {
    const t = m.times;
    const legs = [m.out, ...m.list.filter(st => isLocated(m, st)).map(st => [st.drive, st.miles]),
      ...(m.dropCounts ? [m.drop] : []), m.home];
    /* Yard to yard, each end on the day `midnights` puts it, so a leg out
       past midnight and back after the hour it left is a day long. */
    const late = midnights(m);
    const out = toMin(t.depart), home = toMin(t.back);
    let span = out != null && home != null
      ? home + 1440 * (late.get('return') ?? 0) - out - 1440 * (late.get('depart') ?? 0) : null;
    if (span != null && span < 0) span += 1440;
    if (span != null) span += m.pre + m.post;
    const rest = restOf(m, m.list);
    // Over more than one day the yard-to-yard span is the days', not a clock's.
    const days = manyDays(m);
    if (days) span = null;
    const needs = !days && !(t.leave && t.endtrip && timesComplete(m.list));
    const wrong = !days && m.list.some(st => isLocated(m, st) && (roomInto(m, st) ?? 0) < 0);
    const total = figures(legs, span, rest, wrong ? 'check' : needs);
    const dates = [];
    let each = null;
    if (days) {
      for (let d = m.from; d <= m.to && dates.length < 31; d = dayAfter(d, 1)) dates.push(d);
      each = dates.map(d => dayFigures(m, d, dates[0], dates.at(-1)));
      const status = each.find(c => c.status === 'Check times')?.status ?? each.find(c => c.status)?.status;
      const on = each.reduce((n, c) => n + (c.span ?? 0), 0);
      const off = each.reduce((n, c) => n + (c.span == null ? 0 : c.rest), 0);
      total[2] = status ?? (on ? hm(on) : '—');
      total[3] = status || !on ? '—' : hm(on - off);
    }
    const backDays = late.get('return') ?? 0;
    return {
      days,
      dates,
      each,
      total,
      // The last day's, where it is not the first: a longer leg's last day, or
      // the next day a one-day leg comes back on past midnight.
      backOn: days ? m.to : backDays > 0 && m.from ? dayAfter(m.from, backDays) : null,
      // Each day's miles, for the quote calculator the trip opens.
      dayMiles: each ? each.map(c => c.miles) : [total.miles],
      legMiles: Math.round(legs.reduce((n, [, mi]) => n + (Number(mi) || 0), 0)),
      legDays: m.from && m.to ? daysFrom(m.from, m.to) + 1 : 1,
      over: (each ?? [total]).find(c => c.drive > 600 || (c.span != null && c.span - c.rest > 900)) ?? null,
      status: days ? (each.find(c => c.status === 'Check times')?.status ?? each.find(c => c.status)?.status ?? null)
        : total.status,
      unmeasured: legs.some(([n]) => n == null),
    };
  }

  // -- a leg as saved -------------------------------------------------------
  const hhmm = v => (v ? String(v).slice(0, 5) : '');
  const numOrNull = v => (v === null || v === undefined || v === '' ? null : Number(v));
  // A drive as `trip_stops` keeps it, "H:MM", in minutes.
  const driveMin = v => {
    const m = /^(\d+):(\d{1,2})$/.exec(String(v ?? '').trim());
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  };
  /* Two places are the same when both carry the Mapbox id rux-ui saves, or
     when their name and address both read the same, the Route tab's rule for
     telling a round trip. */
  const samePlace = (a, b) => {
    if (!a || !b) return !a && !b;
    if (a.mapbox_id && b.mapbox_id) return a.mapbox_id === b.mapbox_id;
    return (a.name ?? null) === (b.name ?? null) && (a.address ?? null) === (b.address ?? null);
  };

  /* A leg's model from its saved rows, read the way the Route tab opens them:
     the `pickup` row holds the yard departure, the drive from the yard and
     the spot; the first `stop` after it the group's departure; the last
     `return` row the trip's end, the yard return and the drive back. The
     stops between are the list, less the row the group is let off at: a
     one-way or split leg's last stop, or a round trip's row back at the
     pickup. `rows` are the trip's `trip_stops`; `routeTimes` the office's
     `{ pre, post }`. Each stop keeps its row as `row`. */
  function fromStops(trip, leg, rows, routeTimes = {}) {
    const stops = (rows || []).filter(s => (s.leg || 'outbound') === leg)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const pickup = stops.find(s => s.type === 'pickup') ?? null;
    const backIndex = stops.map(s => s.type).lastIndexOf('return');
    const back = backIndex >= 0 ? stops[backIndex] : null;
    const inner = stops.slice(pickup ? stops.indexOf(pickup) + 1 : 0, backIndex >= 0 ? backIndex : stops.length)
      .filter(s => s.type === 'stop');
    const oneWay = ['one_way', 'split'].includes(trip.trip_type);
    const round = !oneWay && samePlace(inner.at(-1), pickup);
    const dropRow = !inner.length ? null : !round ? inner.at(-1)
      : inner.length > 1 && samePlace(inner.at(-1), pickup) ? inner.at(-1) : null;
    const middle = dropRow ? inner.slice(0, -1) : inner;
    const list = middle.map((st, i) => {
      const next = middle[i + 1] ?? dropRow;
      return {
        row: st,
        arrive: hhmm(st.arrive) || null, leave: hhmm(next?.depart_prev) || null,
        date: st.arrive_date ?? st.depart_prev_date ?? null,
        leaveDate: next?.depart_prev_date ?? null,
        dwell: st.dwell_status ?? null, drive: driveMin(st.drive), miles: numOrNull(st.miles),
        located: numOrNull(st.lat) != null,
      };
    });
    const from = leg === 'return' ? trip.return_start_date ?? null : trip.start_date ?? null;
    const to = leg === 'return' ? trip.return_end_date ?? from : trip.end_date ?? from;
    return {
      from, to, pre: routeTimes.pre ?? 0, post: routeTimes.post ?? 0,
      times: { depart: hhmm(pickup?.depart_prev), spot: hhmm(pickup?.spot), leave: hhmm(inner[0]?.depart_prev),
        endtrip: hhmm(back?.depart_prev), back: hhmm(back?.arrive) },
      out: [driveMin(pickup?.drive), numOrNull(pickup?.miles)],
      home: [driveMin(back?.drive), numOrNull(back?.miles)],
      drop: dropRow ? [driveMin(dropRow.drive), numOrNull(dropRow.miles)] : [null, null],
      dropCounts: !!(dropRow || list.length),
      list,
      // The rows the Detailed itinerary names: where the bus is picked up,
      // let off and back at the yard.
      rows: { pickup, drop: dropRow, back },
      round,
    };
  }

  window.SchedulerRouteFigures = {
    toMin, hm, leaveDayOf, samePlace,
    waitOf, minutesAt, timeBetween, legInto, roomInto, dropRoom, midnights,
    legFigures, fromStops,
  };
})();
