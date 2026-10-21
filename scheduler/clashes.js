/* ==========================================================================
   Rux Scheduler — CLASHES, what stands in a bus's or a driver's way
   --------------------------------------------------------------------------
   The one reading of what a trip collides with, loaded by every page that
   picks a bus or a driver or says a trip is short of one, so a picker, a bar
   and Departures give one answer. `fitFor` says what stands in each bus's and
   driver's way on one leg; `rankDrivers` puts drivers in the order to ask
   them and `autoPicks` in the order an automatic pick takes them;
   `restBetween` is a driver's rest between two legs; `cardLapse` says a
   licence or medical card that runs out before a leg ends.

   THE STANDING RULE: `standing(trip, leg, nearby, read)` is what stands in
   a saved leg's way, bus by bus and seat by seat: another trip, a bus's
   days out, a driver's time off, a driver set Inactive, or a card that runs
   out before the leg ends. The leg is named by its key, week.js's, or by
   the old word a page still names it by. The bar, the checklist, Departures and
   the Trips page all read it, so they cannot disagree. A placeholder raises
   nothing on itself, though it still stands in another trip's way.

   Nothing here reads the page. The one read is `readNearby`, handed the
   page's client, so every page reads the same trips, time off and days out
   around a range. Needs week.js and leg-facts.js loaded first.
   ========================================================================== */
(() => {
  'use strict';

  const { legsOf, legByKey, legKeyOfVehicle } = window.SchedulerWeek;
  const { activeRolesOf } = window.SchedulerLegFacts;

  const DAY = 864e5;
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parseISO = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const daysBetween = (a, b) => Math.round((b - a) / DAY);
  // The days a leg's yard return comes after its last day, the bar's +1.
  const daysBack = leg => leg.backDays ?? 0;

  // How far back a driver's days are counted, to spread work within a priority.
  const RECENT_DAYS = 28;
  const datesOverlap = (a, b) => a.from <= b.to && b.from <= a.to;

  /* A back-to-back driver may be picked automatically only with REST_HOURS
     between leaving one trip at the yard and leaving for the next: the earlier
     leg's return arrival to the later leg's departure. A leg missing either
     time cannot show the rest, so its driver is never picked automatically. */
  const REST_HOURS = 10;
  const clockHours = t => {
    const m = /^(\d{1,2}):(\d{2})/.exec(t || '');
    return m ? Number(m[1]) + Number(m[2]) / 60 : null;
  };
  /* Hours from the earlier leg's return to the later leg's departure, or null
     without both times. The return is on the earlier leg's last day, or the
     day after it when the leg comes back past midnight. Below zero, the two
     legs overlap. */
  const restBetween = (earlier, later) => {
    const end = clockHours(earlier.back), start = clockHours(later.depart);
    if (end == null || start == null) return null;
    const backDay = addDays(parseISO(earlier.to), daysBack(earlier));
    return daysBetween(backDay, parseISO(later.from)) * 24 - end + start;
  };

  /* How another leg sits against this one, by the clock: 'clash', 'near'
     with the hours of rest between them, or null when it is days away. Legs
     over the same days clash. Two that share only the day one ends and the
     other begins clash when the second leaves before the first is back, and
     when either time is missing, because unknown is not fine; otherwise
     they are back-to-back, as legs on days side by side are. */
  function besideOf(range, l) {
    const before = iso(addDays(parseISO(range.from), -1));
    const after = iso(addDays(parseISO(range.to), 1));
    if (datesOverlap(range, l)) {
      const edge = l.to === range.from || l.from === range.to;
      const oneDay = (l.to < range.to ? l.to : range.to) === (l.from > range.from ? l.from : range.from);
      if (!edge || !oneDay) return { kind: 'clash' };
      // Of two legs on one day, the earlier is the one that leaves first.
      const lFirst = l.from < range.from || (l.from === range.from && (l.depart ?? '') < (range.depart ?? ''));
      const rest = lFirst ? restBetween(l, range) : restBetween(range, l);
      return rest == null || rest < 0 ? { kind: 'clash' } : { kind: 'near', rest };
    }
    if (l.to !== before && l.from !== after) return null;
    const rest = l.to === before ? restBetween(l, range) : restBetween(range, l);
    // A leg the day before that runs past midnight into this one is a clash.
    return rest != null && rest < 0 ? { kind: 'clash' } : { kind: 'near', rest };
  }

  /* What stands in each bus's and driver's way on one leg's dates. `buses`
     and `drivers` are clashes, which a pick warns of, as `besideOf` reads
     them; `near` is a trip back-to-back with it, which warns but does not
     rule the driver out, and `tight` the drivers among them whose rest is
     under REST_HOURS or unknown; `worked` is the days each driver drove in the
     RECENT_DAYS before the leg, which ranks drivers of one priority so the
     work spreads. `range` is the leg's dates, with its `depart` and `back`
     times when it has them, and comes back with the answer. `skip` leaves out the editor's whole trip, whose
     buses it holds unsaved, or the one bus a bar is. */
  function fitFor({ trips, off, oos }, range, skip) {
    const buses = new Map(), drivers = new Map(), near = new Map(), worked = new Map(), tight = new Set();
    const add = (map, id, text) => { if (id == null) return; if (!map.has(id)) map.set(id, []); if (!map.get(id).includes(text)) map.get(id).push(text); };
    if (!range) return { buses, drivers, near, tight, worked, range };
    const before = iso(addDays(parseISO(range.from), -1));
    const recent = { from: iso(addDays(parseISO(range.from), -RECENT_DAYS)), to: before };
    for (const t of trips) {
      if (skip.tripId != null && String(t.id) === String(skip.tripId)) continue;
      for (const l of legsOf(t)) {
        const beside = besideOf(range, l);
        const clash = beside?.kind === 'clash';
        const next = beside?.kind === 'near';
        const days = [];
        if (datesOverlap(recent, l)) {
          for (let d = parseISO(l.from > recent.from ? l.from : recent.from); iso(d) <= (l.to < recent.to ? l.to : recent.to); d = addDays(d, 1)) days.push(iso(d));
        }
        if (!clash && !next && !days.length) continue;
        for (const a of t.trip_assignments || []) {
          if (legKeyOfVehicle(t, a) !== l.key) continue;
          if (skip.assignmentId != null && String(a.id) === String(skip.assignmentId)) continue;
          const text = `On trip ${t.destination || 'with no destination'}`;
          const on = activeRolesOf(a);
          const crew = (a.trip_drivers || []).filter(d => d.driver_id != null && on.has(d.role || 'driver'));
          if (clash) {
            add(buses, a.bus_id, text);
            for (const d of crew) add(drivers, d.driver_id, text);
          } else if (next) {
            const rest = beside.rest;
            const said = rest == null ? 'rest unknown' : `${Math.round(rest * 10) / 10}h rest`;
            for (const d of crew) {
              add(near, d.driver_id, `Back-to-back with ${t.destination || 'a trip'}, ${said}`);
              if (rest == null || rest < REST_HOURS) tight.add(d.driver_id);
            }
          }
          for (const d of crew) {
            if (!worked.has(d.driver_id)) worked.set(d.driver_id, new Set());
            for (const day of days) worked.get(d.driver_id).add(day);
          }
        }
      }
    }
    for (const r of off) if (datesOverlap(range, { from: r.start_date, to: r.end_date })) add(drivers, r.driver_id, 'Time off');
    for (const r of oos) if (datesOverlap(range, { from: r.start_date, to: r.end_date })) add(buses, r.bus_id, 'Out of service');
    return { buses, drivers, near, tight, worked, range };
  }

  /* Who to ask next, first: drivers free on the leg's dates before those on
     another trip or away, then strictly by priority, the order the office
     calls in; within one priority a driver with no back-to-back trip first,
     then one back-to-back with enough rest, then one without, then whoever
     drove the fewest days lately, so the work spreads. This is the order a
     person picks from, each with `lapse`, a licence or medical card that runs
     out before the leg ends, in words. `fit` is null until it is read, and
     then only priority and name order. */
  function rankDrivers(drivers, fit) {
    const text = (map, id) => (map?.get(id) ?? []).join(' · ');
    return drivers.map(d => {
      const days = fit?.worked.get(d.id)?.size ?? 0;
      const busy = text(fit?.drivers, d.id);
      const near = text(fit?.near, d.id);
      const tight = !!fit?.tight.has(d.id);
      const lapse = fit?.range ? cardLapse(d, fit.range) : '';
      return {
        d, days, busy, near, tight, lapse,
        rank: [busy ? 1 : 0, d.priority ?? 9, near ? (tight ? 2 : 1) : 0, days],
        detail: [
          d.status && d.status !== 'active' ? 'Inactive' : '',
          d.priority != null ? `Priority ${d.priority}` : '',
          fit ? `${days} ${days === 1 ? 'day' : 'days'} in ${RECENT_DAYS / 7} weeks` : '',
        ].filter(Boolean).join(' · '),
      };
    }).sort((a, b) => a.rank.reduce((c, v, i) => c || v - b.rank[i], 0)
      || String(a.d.name ?? '').localeCompare(String(b.d.name ?? '')));
  }

  /* The order an automatic pick takes, from a ranked list: every free driver
     with no back-to-back trip, whatever their priority, before a back-to-back
     one, who is a last resort and only with REST_HOURS of rest. A driver
     whose card runs out before the leg ends is never picked automatically; a
     person can still pick them, told why, since the date on file may be old. */
  const autoPicks = ranked => [
    ...ranked.filter(r => !r.busy && !r.lapse && !r.near),
    ...ranked.filter(r => !r.busy && !r.lapse && r.near && !r.tight),
  ];

  /* What runs out before the leg ends, on its last day as saved, the licence
     or the medical card, in words, or '' when both last the trip. A date not
     on file says nothing. */
  const cardDay = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  function cardLapse(d, range) {
    return [['Licence', d.license_exp], ['Medical card', d.med_card_expiry]]
      .map(([what, v]) => [what, String(v ?? '').slice(0, 10)])
      .filter(([, day]) => /^\d{4}-\d{2}-\d{2}$/.test(day) && day < (range.ends ?? range.to))
      .map(([what, day]) => `${what} ${day < range.from ? 'expired' : 'expires'} ${cardDay.format(parseISO(day))}`)
      .join(' · ');
  }

  /* What stands in a saved leg's way, one entry for each thing: the
     assignment and the driver it is on, `what` it is, and `words`, the bus's
     number or the driver's name before it. `read` holds the page's
     `driversById` and `busesById`. */
  function standing(trip, leg, nearby, { driversById = new Map(), busesById = new Map() } = {}) {
    if (!trip || trip.cancelled_at || window.SchedulerBilling.placeholder(trip)) return [];
    const range = legByKey(trip, leg);
    if (!range) return [];
    const fit = fitFor(nearby, range, { tripId: trip.id });
    const out = [];
    const put = (a, driverId, subject, what) => {
      if (!out.some(o => o.assignmentId === a.id && o.driverId === driverId && o.what === what)) {
        out.push({ assignmentId: a.id, busId: a.bus_id ?? null, driverId, what, words: `${subject}: ${what}` });
      }
    };
    for (const a of (trip.trip_assignments || []).filter(x => legKeyOfVehicle(trip, x) === range.key)) {
      if (a.bus_id != null) {
        const bus = busesById.get(a.bus_id);
        for (const what of fit.buses.get(a.bus_id) ?? []) put(a, null, bus?.number != null ? `Bus ${bus.number}` : 'The bus', what);
      }
      const on = activeRolesOf(a);
      for (const d of a.trip_drivers || []) {
        if (d.driver_id == null || !on.has(d.role || 'driver')) continue;
        const who = driversById.get(d.driver_id);
        const name = who?.short_name || who?.name || 'A driver';
        for (const what of fit.drivers.get(d.driver_id) ?? []) put(a, d.driver_id, name, what);
        if (who?.status && who.status !== 'active') put(a, d.driver_id, name, 'Inactive');
        const lapse = who ? cardLapse(who, range) : '';
        if (lapse) put(a, d.driver_id, name, lapse);
      }
    }
    return out;
  }

  /* The trips, time off and out-of-service days around a range: every trip
     with a leg that ends within RECENT_DAYS and a week of it, a leg with no
     end by its start, so a driver's days lately are counted and a trip still
     running into it is seen, and that starts by a day past it, so one
     starting the day after reads as back-to-back. The week covers a leg back
     past midnight, which takes a day past the one it ends on. `ends` is that
     test, an embed that returns nothing. Each trip comes with its legs and
     routes, as trip-shape.js reads them, and its times and stops, which say
     when it leaves and is back. */
  async function readNearby(client, lo, hi) {
    const past = iso(addDays(parseISO(hi), 1));
    const ended = iso(addDays(parseISO(lo), -(RECENT_DAYS + 7)));
    const unwrap = r => { if (r.error) throw new Error(r.error.message); return r.data ?? []; };
    const [trips, off, oos] = await Promise.all([
      client.from('trips')
        .select('id,destination,start_date,end_date,return_start_date,return_end_date,departure_time,return_time,bus_count,return_bus_count,trip_type,'
          + 'trip_legs(id,leg,kind,start_date,end_date,bus_count,created_at,trip_routes(id,position,name)),'
          + 'trip_stops(position,leg,route_id,type,depart_prev,arrive,spot),trip_assignments(id,bus_id,leg,route_id,active_roles,trip_drivers(driver_id,role)),'
          + 'ends:trip_legs!inner()')
        .is('cancelled_at', null).lte('start_date', past)
        .or(`end_date.gte.${ended},start_date.gte.${ended}`, { referencedTable: 'ends' })
        .then(unwrap),
      client.from('driver_time_off').select('driver_id,start_date,end_date,reason').lte('start_date', hi).gte('end_date', lo).then(unwrap),
      client.from('bus_out_of_service').select('bus_id,start_date,end_date,reason').lte('start_date', hi).gte('end_date', lo).then(unwrap),
    ]);
    return { trips, off, oos };
  }

  window.SchedulerClashes = { REST_HOURS, RECENT_DAYS, datesOverlap, restBetween, besideOf, fitFor, rankDrivers, autoPicks, cardLapse, standing, readNearby };
})();
