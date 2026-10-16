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
   due at each: the pickup at its Spot, every other stop and the yard return
   at their Arrives. `whereOn(stops, path)` follows the path through them: a
   stop is reached when the bus comes within a quarter mile of it, in order,
   and no sooner than two hours before it is due, so a bus driving past a
   later stop on its way has not reached it. The next stop is the first after
   the last one reached that has a map point.

   `arrivals(drive)` works out when a bus gets to a stop from where it is,
   Geoapify's drive slowed by the office's percent, asked at most once every
   five minutes for each bus, and again sooner only for another stop.
   A bus is late when it gets there more than 10 minutes after it is due.
   ========================================================================== */
(() => {
  'use strict';

  const NEAR_MILES = 0.25;
  const EARLY_MS = 2 * 3600e3;
  const ARRIVAL_EVERY = 5 * 60e3;
  // The furthest back a path is asked from, so a leg days long loads quickly.
  const PATH_BACK = 12 * 3600e3;
  const LATE_MIN = 10;

  // The miles between two points as the crow flies; each is [lat, lng].
  const miles = (a, b) => {
    const rad = Math.PI / 180;
    const dLat = (b[0] - a[0]) * rad, dLng = (b[1] - a[1]) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2;
    return 3958.8 * 2 * Math.asin(Math.sqrt(h));
  };

  const clockMin = t => {
    const m = /^(\d{1,2}):(\d{2})/.exec(t || '');
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
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
     time before it. */
  function stopsOf(trip, leg) {
    const W = window.SchedulerWeek;
    const legOf = W.legsOf(trip).find(l => l.leg === leg);
    if (!legOf) return [];
    const { stops, pickup } = W.stopsOfLeg(trip, leg);
    let day = legOf.from, last = null;
    return stops.slice(Math.max(stops.indexOf(pickup), 0)).map(s => {
      const [time, date] = s.type === 'pickup' ? (s.spot ? [s.spot, s.spot_date] : [s.depart_prev, s.depart_prev_date])
        : [s.arrive, s.arrive_date];
      let due = null;
      if (time) {
        if (date) day = date;
        else if (last != null && clockMin(time) < last) day = dayFrom(day, 1);
        last = clockMin(time);
        due = W.officeInstant(day, time);
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
     back, so a stop due before it begins is taken as reached. */
  function whereOn(stops, path) {
    let reached = -1, inside = false, left = false;
    const begins = path?.[0]?.[2];
    if (begins != null) stops.forEach((s, i) => { if (s.due != null && s.due < begins) reached = i; });
    for (const p of path || []) {
      left ||= miles(path[0], p) > NEAR_MILES;
      if (!left) continue;
      if (inside && miles(stops[reached].point, p) > NEAR_MILES) inside = false;
      if (inside) continue;
      for (let j = reached + 1; j < stops.length; j++) {
        const s = stops[j];
        if (!s.point || (s.due != null && p[2] < s.due - EARLY_MS)) continue;
        if (miles(s.point, p) <= NEAR_MILES) { reached = j; inside = true; break; }
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
  const clockOf = ms => new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hourCycle: 'h23',
    hour: '2-digit', minute: '2-digit' }).format(new Date(ms));

  // How many minutes late a bus that gets there at `arrival` is, or 0.
  const lateBy = (due, arrival) => {
    if (due == null || arrival == null) return 0;
    const min = Math.round((arrival - due) / 60e3);
    return min > LATE_MIN ? min : 0;
  };

  /* Each bus's arrival at its next stop, as an instant: `get(busId, stop,
     here)` hands back the last one worked out for that bus and stop, and asks
     again when it is five minutes old, or at once for another stop. `drive`
     is (from, to) => Promise<minutes | null>, from places.js and the route
     times; `onChange` is called when an answer comes. */
  function arrivals(drive, onChange, now = () => Date.now()) {
    const known = new Map();
    return {
      get(busId, stop, here) {
        if (!stop?.point || !here) return null;
        const had = known.get(busId);
        const same = had?.key === stop.key;
        if (!same || (!had.asking && now() - had.asked >= ARRIVAL_EVERY)) {
          const entry = { key: stop.key, asked: now(), asking: true, at: same ? had.at : null };
          known.set(busId, entry);
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

  window.SchedulerRoad = { NEAR_MILES, LATE_MIN, MARGIN, miles, span, isOut, stopsOf, whereOn, clockOf, lateBy, arrivals, live };
})();
