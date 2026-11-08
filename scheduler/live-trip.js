/* ==========================================================================
   Rux Scheduler — LIVE TRIP, what a bus out on its leg is warned of
   --------------------------------------------------------------------------
   Loaded by the board and the Live map after road.js, so a bar's live line,
   its tooltip, the live card and a map pin say the same thing about one bus.
   `lookOf` reads leg-facts.js and route-figures.js when it is called. Nothing
   here draws or reads the page.

   `warningsOf(look)` lists what is wrong with a bus out on its leg, worst
   first, each { kind, tone, title, detail, sentence }:
     stopLamp, red: the engine's red stop lamp is on; its first code is the
       few words and every code is in the sentence.
     notRolling, red: from ten minutes before yard-out the engine is still
       off, or once yard-out has passed the bus is still at the yard, before
       it has reached any stop.
     wrongBus, red: from the same ten minutes, a driver the bar names whom
       Samsara has logged into another bus, not one of the leg's buses a
       co-driver also rides; it also carries `driver`, that driver's id, and
       `bus`, the other bus's number, for the crew's mark.
     lateToSpot, amber: the next stop is the pickup and the bus gets there
       more than road.js's LATE_MIN after its spot.
     shortOnHours, amber: the driving hours left in the bus, every driver's
       added, do not cover the drive still planned before the next rest.
     noPretrip, amber: yard-out has passed and Samsara has no pre-trip
       inspection for the bus since PRETRIP_MS before it, asked only while
       samsara-now's day of inspections reaches back that far, so a trip's
       later days, and a bus whose inspections could not be read, are not.
   `phaseOf(look)` says where the bus is when nothing is wrong: At a stop, To
   the next one with when it gets there, or To the yard. `ridingOf(look)` is
   each driver the bar names whom Samsara has in another bus they ride, as
   { driver, bus }, the bus's number, which the crew says quietly; `saidOf`
   is all three, as a bar is handed them.
   `lookOf({ trip, assign, span, bus, next, others, numberOf, yard, now })`
   builds `look` from the leg's own rows, so the board and the Live map warn
   alike; `outOn(bus, span, now)` is whether either draws the bus as out.
   `watching(bus, span, now)` is whether a bar whose bus Samsara knows counts
   as out from ten minutes before its yard-out whatever the engine does, so
   Not rolling has a line to stand on; road.js's isOut asks a running engine
   before yard-out.

   `look` is { bus, others, named, buses, numberOf, yard, yardOut, next,
   drives, now }: samsara-now's bus and every bus in its answer, the driver
   ids the bar names, the bus ids each may be in by driver id, leg-facts.js's
   `buses`, a bus's number by its id, the yard's point [lat, lng], the
   leg's yard-out as an instant, the board's reading of where the bus is on
   its leg (road.js's stops with `where`, `stop`, `at`, `arrival` and
   `late`, or null while the board has no path for the bus, which keeps Not
   rolling, Late to spot and Short on hours quiet), `drives`, { min, rest }
   for each of those stops, the minutes
   driven to it from the stop before and whether its wait counts as rest,
   off duty or in the sleeper, and the time now.
   ========================================================================== */
(() => {
  'use strict';

  const Road = window.SchedulerRoad;
  const BEFORE_MS = 10 * 60e3;
  const HOUR = 3600e3;
  // A pre-trip this long before yard-out counts for the leg; samsara-now
  // reads a day of inspections.
  const PRETRIP_MS = 2 * HOUR;
  const INSPECT_LOOK_MS = 24 * HOUR;

  const hours = ms => `${Math.floor(ms / HOUR)}:${String(Math.floor((ms % HOUR) / 60e3)).padStart(2, '0')}`;
  // An instant as the bar writes a time, "9:30a".
  const clock = ms => {
    const [h, m] = Road.clockOf(ms).split(':');
    return `${Number(h) % 12 || 12}:${m}${Number(h) < 12 ? 'a' : 'p'}`;
  };
  const ago = (at, now) => {
    const min = Math.max(0, Math.floor((now - Date.parse(at)) / 60e3));
    return min < 60 ? `${min}m` : `${Math.floor(min / 60)}h`;
  };
  const first = name => String(name || '').trim().split(/\s+/)[0];
  const due = (yardOut, now) => yardOut != null && now >= yardOut - BEFORE_MS;

  const watching = (bus, span, now = Date.now()) => !!bus && !!span
    && span[0] + Road.MARGIN - BEFORE_MS <= now && now <= span[1] - Road.MARGIN;

  function notRolling({ bus, yard, yardOut, next, now }) {
    if (!bus || !next || !due(yardOut, now) || next.where?.reached >= 0) return null;
    const here = bus.lat != null && bus.lng != null ? [bus.lat, bus.lng] : null;
    const atYard = yard && here ? Road.miles(yard, here) <= Road.NEAR_MILES : null;
    const off = bus.engine === 'off';
    const before = now < yardOut;
    if (atYard === false || (before ? !off : atYard == null && !off)) return null;
    const out = clock(yardOut);
    return {
      kind: 'notRolling', tone: 'error', title: 'Not rolling',
      detail: off ? `Engine off${bus.engine_at ? ` ${ago(bus.engine_at, now)}` : ''} · out ${out}` : `Still at the yard · out ${out}`,
      sentence: off
        ? `Yard-out ${before ? 'is' : 'was'} ${out}, and the engine is still off${atYard ? ' at the yard' : ''}.`
        : `Yard-out was ${out}, and the bus is still at the yard.`,
    };
  }

  // The bus other than this one Samsara has a driver in, and whether they may be in it.
  const elsewhere = ({ bus, others = [], buses }, id) => {
    const other = others.find(b => b.bus_id !== bus.bus_id && b.drivers.some(d => d.driver_id === id)) ?? null;
    const theirs = (buses?.get(id) ?? []).map(String);
    return other ? { other, rides: theirs.includes(String(other.bus_id)) } : null;
  };

  function wrongBus(look) {
    const { bus, named = [], numberOf = () => null, yardOut, now } = look;
    if (!bus || !due(yardOut, now)) return null;
    const inBus = new Set(bus.drivers.map(d => d.driver_id).filter(Boolean));
    for (const id of named) {
      if (!id || inBus.has(id)) continue;
      const { other, rides } = elsewhere(look, id) ?? {};
      if (!other || rides) continue;
      const d = other.drivers.find(x => x.driver_id === id);
      const number = numberOf(other.bus_id) ?? 'another bus';
      return {
        kind: 'wrongBus', tone: 'error', title: 'Wrong bus', driver: id, bus: number,
        detail: `${first(d.name)} is logged into ${number}`,
        sentence: `${d.name} drives this leg, but Samsara has them logged into ${number}.`,
      };
    }
    return null;
  }

  function stopLamp({ bus }) {
    if (bus?.fault !== 'stop') return null;
    const codes = (bus.faults ?? []).filter(Boolean);
    return {
      kind: 'stopLamp', tone: 'error', title: 'Stop lamp',
      detail: codes[0] ?? 'Engine stop lamp on',
      sentence: codes.length ? `The engine's red stop lamp is on: ${codes.join('; ')}.` : "The engine's red stop lamp is on.",
    };
  }

  function lateToSpot({ next }) {
    if (!next?.stop || next.at || next.stop.type !== 'pickup' || !next.late) return null;
    return {
      kind: 'lateToSpot', tone: 'warning', title: 'Late to spot',
      detail: `~${next.late} min · spot ${clock(next.stop.due)}`,
      sentence: `The bus gets to ${next.stop.name} about ${clock(next.arrival)}, ${next.late} minutes after its ${clock(next.stop.due)} spot.`,
    };
  }

  function shortOnHours({ bus, next, drives = [], now }) {
    const crew = (bus?.drivers ?? []).filter(d => d.left_ms != null);
    const wheel = crew.find(d => d.wheel);
    if (!wheel || !next?.stop) return null;
    const from = next.stops.indexOf(next.stop);
    let drive;
    if (next.at) drive = 0;
    else if (next.arrival != null) drive = Math.max(0, next.arrival - now);
    else return null;
    // On from the next stop, stop by stop, until a wait that is rest or the yard.
    for (let i = from; i < next.stops.length; i++) {
      if (i > from) drive += (drives[i]?.min ?? 0) * 60e3;
      if (drives[i]?.rest || next.stops[i].type === 'return') break;
    }
    const left = crew.reduce((sum, d) => sum + d.left_ms, 0);
    if (left >= drive) return null;
    return {
      kind: 'shortOnHours', tone: 'warning', title: 'Short on hours',
      detail: `${first(wheel.name)} ${hours(left)} left · ${hours(drive)} to drive`,
      sentence: crew.length > 1
        ? `The drivers in the bus have ${hours(left)} of driving left between them, and ${hours(drive)} of driving is planned before the next rest.`
        : `${wheel.name} has ${hours(left)} of driving left, and ${hours(drive)} of driving is planned before the next rest.`,
    };
  }

  function noPretrip({ bus, yardOut, now }) {
    if (!bus || !Array.isArray(bus.inspections) || yardOut == null || now < yardOut) return null;
    const from = yardOut - PRETRIP_MS;
    if (now - from > INSPECT_LOOK_MS) return null;
    if (bus.inspections.some(i => i.kind === 'pre' && Date.parse(i.at) >= from)) return null;
    return {
      kind: 'noPretrip', tone: 'warning', title: 'No pre-trip',
      detail: `None in Samsara since ${clock(from)}`,
      sentence: `Samsara has no pre-trip inspection for this bus since ${clock(from)}, two hours before its ${clock(yardOut)} yard-out.`,
    };
  }

  const RULES = [stopLamp, notRolling, wrongBus, lateToSpot, shortOnHours, noPretrip];
  const warningsOf = look => RULES.map(rule => rule(look)).filter(Boolean);

  function phaseOf({ next }) {
    if (!next) return null;
    const name = s => (s.type === 'return' ? 'the yard' : s.name || 'the next stop');
    if (next.at && next.stop) return { title: `At ${name(next.stop)}`, detail: '' };
    if (!next.stop) return { title: 'To the yard', detail: '' };
    return { title: `To ${name(next.stop)}`, detail: next.arrival != null ? `~${clock(next.arrival)}` : '' };
  }

  function ridingOf(look) {
    const { bus, named = [], numberOf = () => null } = look;
    if (!bus) return [];
    const inBus = new Set(bus.drivers.map(d => d.driver_id).filter(Boolean));
    return named.filter(id => id && !inBus.has(id)).flatMap(id => {
      const { other, rides } = elsewhere(look, id) ?? {};
      return other && rides ? [{ driver: id, bus: numberOf(other.bus_id) ?? 'another bus' }] : [];
    });
  }

  // All a bar says of its bus, as road-bar.js draws it.
  const saidOf = look => ({ warnings: warningsOf(look), phase: phaseOf(look), riding: ridingOf(look) });

  // Whether a bus counts as out on a leg whose span is `span`, as the bar and the map draw it.
  const outOn = (bus, span, now = Date.now()) => !!span && (Road.isOut(bus, span, now) || watching(bus, span, now));

  /* `look` from a leg's own rows, as the board and the Live map both build
     it: the drivers who ride the assignment and the buses each may be in, by
     leg-facts.js's crew; yard-out from the leg's span; and each stop's drive
     and whether its wait is rest, from the trip's stops. */
  function lookOf({ trip, assign, span, bus, next, others = [], numberOf = () => null, yard = null, now = Date.now() }) {
    const seated = (assign ? window.SchedulerLegFacts.crewOf(trip, assign, new Map(), null, { riders: true }) : [])
      .filter(c => c.driverId != null);
    const rows = new Map((trip.trip_stops ?? []).map(s => [String(s.id), s]));
    const { driveMin } = window.SchedulerRouteFigures;
    return {
      bus, next, others, numberOf, yard, now,
      named: seated.map(c => c.driverId),
      buses: new Map(seated.map(c => [c.driverId, c.buses])),
      yardOut: span ? span[0] + Road.MARGIN : null,
      drives: (next?.stops ?? []).map(s => {
        const row = rows.get(String(s.key));
        return { min: driveMin(row?.drive), rest: ['off', 'sleeper'].includes(row?.dwell_status) };
      }),
    };
  }

  window.SchedulerLiveTrip = { BEFORE_MS, PRETRIP_MS, clock, hours, watching, outOn, warningsOf, phaseOf, ridingOf, saidOf, lookOf };
})();
