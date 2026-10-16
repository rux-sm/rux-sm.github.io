/* ==========================================================================
   Rux Scheduler — LIVE TRIP, what a bus out on its leg is warned of
   --------------------------------------------------------------------------
   Loaded by the board after road.js, so a bar's live line, its tooltip and
   the live card say the same thing about one bus. Nothing here draws or reads
   the page.

   `warningsOf(look)` lists what is wrong with a bus out on its leg, worst
   first, each { kind, tone, title, detail, sentence }:
     notRolling, red: from ten minutes before yard-out the engine is still
       off, or once yard-out has passed the bus is still at the yard, before
       it has reached any stop.
     wrongBus, red: from the same ten minutes, a driver the bar names whom
       Samsara has logged into another bus.
     lateToSpot, amber: the next stop is the pickup and the bus gets there
       more than road.js's LATE_MIN after its spot.
     shortOnHours, amber: the driving hours left in the bus, every driver's
       added, do not cover the drive still planned before the next rest.
   `phaseOf(look)` says where the bus is when nothing is wrong: At a stop, To
   the next one with when it gets there, or To the yard.
   `watching(bus, span, now)` is whether a bar whose bus Samsara knows counts
   as out from ten minutes before its yard-out whatever the engine does, so
   Not rolling has a line to stand on; road.js's isOut asks a running engine
   before yard-out.

   `look` is { bus, others, named, numberOf, yard, yardOut, next, drives,
   now }: samsara-now's bus and every bus in its answer, the driver ids the
   bar names, a bus's number by its id, the yard's point [lat, lng], the
   leg's yard-out as an instant, the board's reading of where the bus is on
   its leg (road.js's stops with `where`, `stop`, `at`, `arrival` and
   `late`), `drives`, { min, rest } for each of those stops, the minutes
   driven to it from the stop before and whether its wait counts as rest,
   off duty or in the sleeper, and the time now.
   ========================================================================== */
(() => {
  'use strict';

  const Road = window.SchedulerRoad;
  const BEFORE_MS = 10 * 60e3;
  const HOUR = 3600e3;

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
    if (!bus || !due(yardOut, now) || (next && next.where?.reached >= 0)) return null;
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

  function wrongBus({ bus, others = [], named = [], numberOf = () => null, yardOut, now }) {
    if (!bus || !due(yardOut, now)) return null;
    const inBus = new Set(bus.drivers.map(d => d.driver_id).filter(Boolean));
    for (const id of named) {
      if (!id || inBus.has(id)) continue;
      const other = others.find(b => b.bus_id !== bus.bus_id && b.drivers.some(d => d.driver_id === id));
      if (!other) continue;
      const d = other.drivers.find(x => x.driver_id === id);
      const number = numberOf(other.bus_id) ?? 'another bus';
      return {
        kind: 'wrongBus', tone: 'error', title: 'Wrong bus',
        detail: `${first(d.name)} is logged into ${number}`,
        sentence: `${d.name} drives this leg, but Samsara has them logged into ${number}.`,
      };
    }
    return null;
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

  const RULES = [notRolling, wrongBus, lateToSpot, shortOnHours];
  const warningsOf = look => RULES.map(rule => rule(look)).filter(Boolean);

  function phaseOf({ next }) {
    if (!next) return null;
    const name = s => (s.type === 'return' ? 'the yard' : s.name || 'the next stop');
    if (next.at && next.stop) return { title: `At ${name(next.stop)}`, detail: '' };
    if (!next.stop) return { title: 'To the yard', detail: '' };
    return { title: `To ${name(next.stop)}`, detail: next.arrival != null ? `~${clock(next.arrival)}` : '' };
  }

  window.SchedulerLiveTrip = { BEFORE_MS, clock, hours, watching, warningsOf, phaseOf };
})();
