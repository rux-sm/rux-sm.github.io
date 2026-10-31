/* ==========================================================================
   Rux Scheduler — ROAD, where a bus out on its trip is and where it goes next
   --------------------------------------------------------------------------
   Loaded by the board and the Live map, and owned by neither, so a bar and a
   map pin never say two different things about one bus. Nothing here draws.

   `span(leg)` is when a leg's bus counts as out on it, and `isOut(bus, span)`
   whether it is now.

   `live(client)` asks the samsara-now Edge Function what every bus is doing
   and keeps each bus's path, the GPS points since its leg left the yard, by
   asking each time for the points since the last one it has.

   `stopsOf(trip, leg)` lists a leg's stops in order with the time the bus is
   due at each, the leg named by its key, week.js's, or by its old word: the
   pickup at its Spot, every other stop and the yard return
   at their Arrives. `whereOn(stops, path, bus)` follows the path through
   them: a stop is reached when the bus comes within a quarter mile of it, in
   order, and no sooner than two hours before it is due, so a bus driving
   past a later stop on its way has not reached it. A pickup is also reached
   by a bus that stands still for two minutes within half a mile of it, since
   a pin on a campus or a stadium is rarely where the bus loads, and passed
   by one that stood still five minutes within a mile and a half of it and is
   now more than two and a half miles off, since it loaded at a lot further
   out and drove on. The next stop is the first after the last one reached
   that has a map point.

   `arrivals(drive)` works out when a bus gets to a stop from where it is,
   Geoapify's drive slowed by the office's percent, asked at most once every
   five minutes for each bus and stop, so two legs out on one bus never ask
   in turn for each other's stop.
   A bus is late only to a pickup, when it gets there more than 10 minutes
   after its spot; every other stop moves with the day, so nobody is told
   how late the bus is to it.

   `pickupLate(due, at)` says whether a bus that reached its pickup at `at`,
   as samsara-miles finds it in the GPS history, was on time: at or before it
   was due, which earns the Driver seat `ON_TIME_PAY` dollars.
   ========================================================================== */
(() => {
  'use strict';

  const NEAR_MILES = 0.25;
  const EARLY_MS = 2 * 3600e3;
  const ARRIVAL_EVERY = 5 * 60e3;
  // The furthest back a path is asked from, so a leg days long loads quickly.
  const PATH_BACK = 12 * 3600e3;
  const LATE_MIN = 10;
  /* A bus parked this near a pickup is there. Parked is standing still this
     long: points within GPS wander of each other, or two points this little
     apart with that long between them, since Samsara sends few points from a
     bus that sits, or the engine idle or off that long. */
  const PARKED_MILES = 0.5;
  const STILL_MILES = 0.03;
  const CREPT_MILES = 0.15;
  const PARKED_MS = 2 * 60e3;
  /* A bus that stood this long this near a pickup, and is now further off
     than GONE_MILES, loaded there and left: long enough that a red light or
     a slow lane does not count, far enough that a bus still finding its way
     in has not gone. */
  const AREA_MILES = 1.5;
  const LOADED_MS = 5 * 60e3;
  const GONE_MILES = 2.5;

  // The miles between two points as the crow flies; each is [lat, lng].
  const miles = (a, b) => {
    const rad = Math.PI / 180;
    const dLat = (b[0] - a[0]) * rad, dLng = (b[1] - a[1]) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2;
    return 3958.8 * 2 * Math.asin(Math.sqrt(h));
  };

  const dayFrom = (day, n) => {
    const [y, m, d] = String(day).split('-').map(Number);
    const t = new Date(Date.UTC(y, m - 1, d + n));
    return t.toISOString().slice(0, 10);
  };

  /* A leg's stops in order, from the pickup to the yard return, each with
     its name, its map point and when the bus is due there, an instant on
     the office's clock or null. A time saved with no date is on the leg's
     first day, or the next day where it is earlier on the clock than the
     time before it, by past-midnight.js's rule. A stop is never due before
     the one before it: a dated time that would be is on the next day, since
     an older row dates a time past midnight a day early. */
  function stopsOf(trip, leg) {
    const W = window.SchedulerWeek;
    const legOf = W.legByKey(trip, leg);
    if (!legOf) return [];
    const { stops, pickup } = W.stopsOfLeg(trip, legOf.key);
    let day = legOf.from, last = null, before = null;
    return stops.slice(Math.max(stops.indexOf(pickup), 0)).map(s => {
      const [time, date] = s.type === 'pickup' ? (s.spot ? [s.spot, s.spot_date] : [s.depart_prev, s.depart_prev_date])
        : [s.arrive, s.arrive_date];
      let due = null;
      if (time) {
        if (date) day = date;
        else if (window.SchedulerPastMidnight.after(last, time)) day = dayFrom(day, 1);
        last = time;
        due = W.officeInstant(day, time);
        while (before != null && due < before) { day = dayFrom(day, 1); due = W.officeInstant(day, time); }
        before = due;
      }
      return {
        key: String(s.id ?? `${leg}-${s.position}`),
        type: s.type,
        name: s.type === 'return' ? 'Yard' : (s.name || s.address || '').trim(),
        point: s.lat != null && s.lng != null ? [Number(s.lat), Number(s.lng)] : null,
        due,
      };
    });
  }

  /* Where a bus is on its leg, from its path, the points [lat, lng, ms]
     oldest first: `reached`, the index of the last stop it has reached or -1,
     `at`, true while it is still within a quarter mile of that stop, and
     `next`, the index of the first stop after it with a map point, or -1
     when there is none left. A stop reached is left behind once the bus is
     out of its reach, and only then can the next be reached, so a bus waiting
     at a pickup it comes back to at the end has not come back yet. The path
     starts where the bus waited before it left, the yard, and nothing is
     reached until the bus has left there, so a short trip's yard return is
     not reached as the bus pulls out. A path begins at most twelve hours
     back, so a stop due before it begins is taken as reached. A pickup is
     also reached by a bus that has stood still within half a mile of it,
     and left behind once the bus is half a mile off; and it is passed, the
     bus never at it, once a bus that stood still five minutes within a mile
     and a half of it is two and a half miles off. `bus`, samsara-now's
     reading, ends the path where it stands while it is stopped, idle or
     off, standing as long as its engine has idled or been off by `now`,
     so a bus that sends no new points still counts its wait. */
  function whereOn(stops, path, bus = null, now = Date.now()) {
    let reached = -1, inside = false, left = false, reach = NEAR_MILES, rest = null, before = null, waited = -1;
    const points = [...(path || [])];
    const standing = bus?.lat != null && bus?.lng != null && (bus.mph === 0 || bus.engine === 'idle' || bus.engine === 'off');
    const still = standing && (bus.engine === 'idle' || bus.engine === 'off') ? now - Date.parse(bus.engine_at) || 0 : 0;
    let last = null;
    if (standing) {
      last = [bus.lat, bus.lng, Math.max(Date.parse(bus.seen) || now, (points.at(-1)?.[2] ?? -Infinity) + 1)];
      points.push(last);
    }
    const begins = points[0]?.[2];
    if (begins != null) stops.forEach((s, i) => { if (s.due != null && s.due < begins) reached = i; });
    for (const p of points) {
      left ||= miles(points[0], p) > NEAR_MILES;
      // Where the bus came to rest, kept while it stays within GPS wander of it.
      if (!rest || miles(rest, p) > STILL_MILES) rest = p;
      // How long the bus has stood here: since it came to rest, across a
      // long quiet with little ground between two points, or as its engine says.
      const crept = before && p[2] - before[2] >= PARKED_MS && miles(before, p) <= CREPT_MILES;
      const stood = Math.max(p[2] - rest[2], crept ? p[2] - before[2] : 0, p === last ? still : 0);
      before = p;
      if (!left) continue;
      if (inside && miles(stops[reached].point, p) > reach) inside = false;
      if (inside) continue;
      if (waited > reached && miles(stops[waited].point, p) > GONE_MILES) { reached = waited; continue; }
      for (let j = reached + 1; j < stops.length; j++) {
        const s = stops[j];
        if (!s.point || (s.due != null && p[2] < s.due - EARLY_MS)) continue;
        const d = miles(s.point, p);
        if (d <= NEAR_MILES) { reached = j; inside = true; reach = NEAR_MILES; break; }
        if (s.type !== 'pickup') continue;
        if (stood >= PARKED_MS && d <= PARKED_MILES) { reached = j; inside = true; reach = PARKED_MILES; break; }
        if (stood >= LOADED_MS && d <= AREA_MILES) waited = j;
      }
    }
    const next = stops.findIndex((s, i) => i > reached && s.point);
    return { reached, at: inside, next };
  }

  /* A leg's stretch on the road, from its yard-out to its yard-back as
     week.js reads both on the office's clock, padded two hours at each end:
     a bus counts as out on its leg inside the padding while its engine runs,
     and between yard-out and yard-back whatever the engine is doing. */
  const MARGIN = 2 * 3600e3;
  const span = leg => {
    if (!leg?.from || !leg?.to) return null;
    const W = window.SchedulerWeek;
    const from = W.departAt(leg);
    return [from - MARGIN, Math.max(W.backAt(leg), from) + MARGIN];
  };
  const isOut = (bus, [from, to], now = Date.now()) => !!bus && from <= now && now <= to
    && (bus.engine === 'on' || bus.engine === 'idle' || (from + MARGIN <= now && now <= to - MARGIN));

  // An instant as the office's clock reads it, "17:40".
  const OFFICE_CLOCK = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hourCycle: 'h23', hour: '2-digit', minute: '2-digit' });
  const clockOf = ms => OFFICE_CLOCK.format(new Date(ms));

  // How many minutes late to `stop` a bus that gets there at `arrival` is:
  // 0 on time, or for any stop but a pickup.
  const lateBy = (stop, arrival) => {
    if (stop?.type !== 'pickup' || stop.due == null || arrival == null) return 0;
    const min = Math.round((arrival - stop.due) / 60e3);
    return min > LATE_MIN ? min : 0;
  };

  // 0 for a pickup reached on time, the minutes late, or null when either
  // time is missing.
  const ON_TIME_PAY = 20;
  const pickupLate = (due, at) => (due == null || at == null ? null
    : at <= due ? 0 : Math.max(1, Math.round((at - due) / 60e3)));

  /* Each bus's arrival at its next stop, as an instant: `get(busId, stop,
     here)` hands back the last one worked out for that bus and stop, and asks
     again when it is five minutes old, or at once for a stop not asked yet.
     Kept by bus and stop, since a bus out on two legs at once asks for two
     stops on every draw, and an answer that redraws must not set off another
     ask. `drive` is (from, to) => Promise<minutes | null>, from places.js and
     the route times; `onChange` is called when an answer comes. */
  function arrivals(drive, onChange, now = () => Date.now()) {
    const known = new Map();
    return {
      get(busId, stop, here) {
        if (!stop?.point || !here) return null;
        const id = `${busId}\u0000${stop.key}`;
        const had = known.get(id);
        if (!had || (!had.asking && now() - had.asked >= ARRIVAL_EVERY)) {
          const entry = { asked: now(), asking: true, at: had?.at ?? null };
          known.set(id, entry);
          Promise.resolve(drive({ lat: here[0], lng: here[1] }, { lat: stop.point[0], lng: stop.point[1] }))
            .then(min => { if (min != null) entry.at = entry.asked + min * 60e3; })
            .catch(() => {})
            .finally(() => { entry.asking = false; onChange?.(); });
          return entry.at;
        }
        return had.at;
      },
    };
  }

  /* What samsara-now says about every bus, with each bus's path kept between
     answers. `ask(since)` takes { busId: ms } for the buses out on a leg, the
     time each left the yard, and asks for the points after the newest it
     has, twelve hours back at most; a bus whose leg starts at another time
     starts a new path, which
     the board and the map start two hours before the leg leaves the yard,
     while the bus is still there. It
     resolves to the answer with every bus's `path` whole, or throws the
     function's error. */
  function live(client, now = () => Date.now()) {
    const paths = new Map();   // busId -> { from, points }
    return {
      async ask(since = {}) {
        const want = {};
        for (const [busId, from] of Object.entries(since)) {
          const had = paths.get(busId);
          if (!had || had.from !== from) paths.set(busId, { from, points: [] });
          const last = paths.get(busId).points.at(-1);
          want[busId] = new Date(last ? last[2] + 1 : Math.max(from, now() - PATH_BACK)).toISOString();
        }
        for (const busId of [...paths.keys()]) if (!(busId in since)) paths.delete(busId);
        const r = await client.functions.invoke('samsara-now', { body: Object.keys(want).length ? { paths: want } : {} });
        if (r.error) throw r.error;
        for (const bus of r.data?.buses ?? []) {
          const held = paths.get(bus.bus_id);
          if (!held) continue;
          held.points.push(...(bus.path ?? []).filter(p => !held.points.length || p[2] > held.points.at(-1)[2]));
          bus.path = held.points;
        }
        return r.data;
      },
    };
  }

  window.SchedulerRoad = { NEAR_MILES, PARKED_MILES, LATE_MIN, MARGIN, miles, span, isOut, stopsOf, whereOn, clockOf, lateBy, ON_TIME_PAY, pickupLate, arrivals, live };
})();
