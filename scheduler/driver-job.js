/* ==========================================================================
   Rux Scheduler — DRIVER JOB, what a driver's leg asks of them and what changed
   --------------------------------------------------------------------------
   The one reading of a driver's job on a leg, loaded by the driver's own
   page and by the office's, so both name the same changes. `legOf` is one
   leg of one trip as the driver works it; `jobView` is what Accept keeps of
   it, every value text as the card writes it; `changesBetween` lists what
   changed since, one line each; `stateOf` says where the driver stands;
   `changesSince` is the office's reading of the same, from its own rows.

   Nothing here reads the page or the database. The words a line is written
   in are the page's, handed in; what Accept keeps is always English. Needs
   share/driver-words.js and leg-papers.js loaded first.
   ========================================================================== */
(() => {
  'use strict';

  const TZ = 'America/Chicago';
  const WORDS = window.SchedulerDriverWords;
  const PAPERS = window.SchedulerLegPapers;
  const clean = v => String(v ?? '').trim();

  // -- dates and times, as the driver reads them --------------------------------
  const dateOnly = v => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(clean(v));
    return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
  };
  // English unless a locale is named: what Accept keeps is always English.
  const dayFmt = (opts, locale = 'en-US') => new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...opts });
  const dayText = (v, year = true, locale) => {
    const d = dateOnly(v);
    return d ? dayFmt({ weekday: 'short', month: 'short', day: 'numeric', ...(year ? { year: 'numeric' } : {}) }, locale).format(d) : '';
  };
  // `short` leaves the year off a range within this year, for a card's title.
  // What Accept keeps is always the long form, so it compares alike.
  const rangeText = (from, to, short = false, locale) => {
    const a = dateOnly(from), b = dateOnly(to) || a;
    if (!a) return '';
    const year = !(short && a.getUTCFullYear() === b.getUTCFullYear()
      && b.getUTCFullYear() === +todayIso().slice(0, 4));
    if (a.getTime() === b.getTime()) return dayText(from, year, locale);
    const sameYear = a.getUTCFullYear() === b.getUTCFullYear();
    return `${dayFmt({ weekday: 'short', month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) }, locale).format(a)} – ${dayText(to, year, locale)}`;
  };
  // A wall-clock time as it was typed, "06:00" or "6:00 am", as 6:00 AM.
  const timeText = v => {
    const t = clean(v);
    const clock = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(t);
    if (clock) {
      const h = +clock[1];
      return `${h % 12 || 12}:${clock[2]} ${h < 12 ? 'AM' : 'PM'}`;
    }
    return /^\d{1,2}:\d{2}\s*[ap]m$/i.test(t) ? t.replace(/\s+/g, ' ').toUpperCase() : t;
  };
  // A leg stays until the end of its last day, in the office's time.
  const todayIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());

  // -- the trip, as rux-ui reads it -------------------------------------------
  // A seat's kind, which the page writes in its language, and its English
  // label, which is what Accept keeps.
  const ROLE_KEY = { 'driver': 'driver', 'co-driver': 'co-driver', 'relief-start': 'relief', 'relief-end': 'relief', 'relief_driver': 'relief' };
  const roleKey = r => ROLE_KEY[r] || 'driver';
  const roleLabel = r => WORDS.en.role[roleKey(r)];
  const isRelief = r => roleKey(r) === 'relief';
  // A seat other than the driver counts only while the bus lists its role.
  const activeSeats = a => {
    const roles = Array.isArray(a.active_roles) ? new Set(a.active_roles.map(e => String(e).split(':', 1)[0])) : null;
    return (a.trip_drivers || []).filter(d => (d.role || 'driver') === 'driver' || roles === null || roles.has(d.role));
  };

  // A drop-off-and-pickup trip saved as one list splits at its second pickup.
  const stopsForLeg = (trip, leg) => {
    const all = [...(trip.trip_stops || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    let out = all.filter(s => (s.leg || 'outbound') !== 'return');
    let back = all.filter(s => s.leg === 'return');
    if (trip.trip_type === 'dropoff_pickup' && !back.length) {
      const firstReturn = out.findIndex(s => s.type === 'return');
      const second = out.findIndex((s, i) => i > firstReturn && s.type === 'pickup');
      if (firstReturn >= 0 && second > firstReturn) { back = out.slice(second); out = out.slice(0, second); }
    }
    return leg === 'return' ? back : out;
  };

  const LEGACY_REQS = [['sleeper', 'req_sleeper'], ['pax56', 'req_56pax'], ['adaLift', 'req_ada'], ['hotel', 'need_hotel'], ['fuelCard', 'need_fuel_card']];
  const LEGACY_NAMES = WORDS.en.legacy;
  // `names` is the office's list, id to label, as the link's read hands it over.
  const requirementsOf = (trip, names = new Map()) => {
    const ids = trip.trip_reqs && Object.keys(trip.trip_reqs).length
      ? Object.entries(trip.trip_reqs).filter(([, on]) => on).map(([id]) => id)
      : LEGACY_REQS.filter(([, col]) => trip[col]).map(([id]) => id);
    return ids.map(id => names.get(id) || LEGACY_NAMES[id] || id);
  };

  // The leg's day-of contacts, by leg-papers.js, or with none whoever booked.
  const contactsOf = (trip, leg) => {
    const day = PAPERS.contactsFor(trip, leg).map(c => ({ name: c.name, phone: c.phone }));
    const booked = { name: clean(trip.booking_contact_name), phone: clean(trip.booking_contact_phone) };
    return day.length ? day : booked.name || booked.phone ? [booked] : [];
  };
  const contactOf = (trip, leg) => contactsOf(trip, leg)[0] || null;

  /* The leg's itinerary, by leg-papers.js: the newest is the one shown,
     marked Updated when it replaced another of the leg's. */
  const itinerariesOf = (trip, leg) => {
    const same = PAPERS.itinerariesFor(trip, leg);
    if (!same.length) return [];
    const newest = same[0];
    return [{ id: newest.id, label: newest.label, path: newest.file_path, updated: same.length > 1 }];
  };

  /* One leg of one trip, as this driver works it. */
  function legOf(ref, trip, driverId, names) {
    const leg = ref.leg || 'outbound';
    const assignments = (trip.trip_assignments || []).filter(a => (a.leg || 'outbound') === leg);
    const mine = assignments.find(a => activeSeats(a).some(d => String(d.driver_id) === String(driverId)));
    if (!mine) return { error: 'notYours' };
    const seat = activeSeats(mine).find(d => String(d.driver_id) === String(driverId));
    const role = seat.role || 'driver';
    const inbound = leg === 'return' && trip.trip_type === 'dropoff_pickup';
    const stops = stopsForLeg(trip, leg);
    const pickup = stops.find(s => s.type === 'pickup') || {};
    const back = [...stops].reverse().find(s => s.type === 'return') || {};
    const start = inbound ? trip.return_start_date : trip.start_date;
    const end = inbound ? (trip.return_end_date || trip.return_start_date) : (trip.end_date || trip.start_date);
    const crew = assignments.map(a => ({
      bus: a.buses?.number != null ? String(a.buses.number) : '',
      mine: a === mine,
      people: activeSeats(a).filter(d => String(d.driver_id) !== String(driverId)).map(d => ({
        name: d.drivers?.short_name || d.drivers?.name || '',
        role: roleKey(d.role),
        phone: clean(d.drivers?.phone),
      })),
    })).filter(b => b.people.length).sort((a, b) => (a.mine ? -1 : b.mine ? 1 : 0));
    return {
      trip, leg, role, start, end,
      destination: inbound ? (back.name || back.address || 'Yard') : (trip.destination || 'Destination'),
      // Which of the two the page wrote, where the office named no place.
      destinationWord: inbound ? (back.name || back.address ? null : 'yard') : (trip.destination ? null : 'destination'),
      customer: clean(trip.customer),
      bus: mine.buses?.number != null ? String(mine.buses.number) : '',
      time: isRelief(role) ? (seat.report_time || pickup.spot || trip.spot_time) : (pickup.spot || trip.spot_time),
      place: { name: clean(pickup.name), address: clean(pickup.address) },
      stops,
      relief: isRelief(role) ? {
        at: clean(seat.report_time),
        instructions: clean(seat.instructions),
        // Who they take over from, to agree the handoff with when no time is set.
        from: clean(activeSeats(mine).find(d => (d.role || 'driver') === 'driver' && String(d.driver_id) !== String(driverId))?.drivers?.short_name
          || activeSeats(mine).find(d => (d.role || 'driver') === 'driver' && String(d.driver_id) !== String(driverId))?.drivers?.name),
      } : null,
      requirements: requirementsOf(trip, names),
      contacts: contactsOf(trip, leg),
      contact: contactOf(trip, leg),
      crew,
      itineraries: itinerariesOf(trip, leg),
      activeRoles: mine.active_roles || [],
    };
  }

  /* THE DRIVER'S JOB, AS THE CARD AND ITS SHEETS SHOW IT. What Accept keeps
     and a later load compares. Every value is text as the card writes it, so
     a change reads as the driver would read it. The trip's notes are on
     neither, so a change to them asks nothing. */
  const stopText = s => [clean(s.name) || clean(s.address) || clean(s.label) || 'Stop',
    s.arrive && `arrive ${timeText(s.arrive)}`, s.depart_prev && `leave ${timeText(s.depart_prev)}`].filter(Boolean).join(' · ');
  function jobView(l) {
    return {
      dates: rangeText(l.start, l.end),
      time: timeText(l.time),
      place: [l.place.name, l.place.address].filter(Boolean).join(', '),
      destination: l.destination,
      stops: l.stops.map(stopText),
      bus: l.bus,
      role: roleLabel(l.role),
      relief: l.relief ? [l.relief.at && `Handoff at ${timeText(l.relief.at)}`, l.relief.instructions].filter(Boolean).join(' · ') : '',
      requirements: [...l.requirements].sort(),
      // The file itself, so a file replaced under the same document reads as new.
      itinerary: l.itineraries[0]?.path || l.itineraries[0]?.id || '',
    };
  }
  // What Accept keeps, in the order a change is listed.
  const VIEW_KEYS = ['dates', 'time', 'place', 'destination', 'stops', 'bus', 'role', 'relief', 'requirements', 'itinerary'];

  /* Each difference as one line the driver reads. `say` is the page's words,
     `{ w, keptValue, keptRequirement }`, since a kept value is English and the
     page writes it in its own language. With `brief`, a changed value is named
     and not given, Pickup changed rather than its old and new places. With
     `keys`, each difference is `{ key }` by its VIEW_KEYS name, for a text
     that words them itself; requirements add the `added` and `removed`
     names, and an itinerary says whether it was `removed`. */
  function changesBetween(was, now, l, { w, keptValue, keptRequirement, brief = false, keys = false }) {
    const lines = [];
    for (const key of VIEW_KEYS) {
      const a = was?.[key] ?? (Array.isArray(now[key]) ? [] : '');
      const b = now[key];
      if (JSON.stringify(a) === JSON.stringify(b)) continue;
      // A view kept before the itinerary was told by its file holds the
      // document's id, which stands for the file it had then.
      if (key === 'itinerary' && a && a === l.itineraries[0]?.id) continue;
      // A relief driver's card gives the handoff, which `relief` compares, and
      // not the bus's spot time.
      if (key === 'time' && isRelief(l.role)) continue;
      if (keys) {
        if (key === 'requirements') {
          lines.push({ key, added: b.filter(x => !a.includes(x)).map(keptRequirement), removed: a.filter(x => !b.includes(x)).map(keptRequirement) });
        } else lines.push(key === 'itinerary' ? { key, removed: !b } : { key });
      } else if (key === 'itinerary') lines.push(b ? w.newItinerary : w.itineraryRemoved);
      else if (key === 'stops') lines.push(w.stopsChanged);
      else if (key === 'requirements') {
        const added = b.filter(x => !a.includes(x)), gone = a.filter(x => !b.includes(x));
        if (added.length) lines.push(w.added(added.map(keptRequirement).join(', ')));
        if (gone.length) lines.push(w.removed(gone.map(keptRequirement).join(', ')));
      } else if (brief) {
        lines.push(w.changed(w.view[key]));
      } else {
        lines.push(`${w.view[key]}: ${keptValue(key, a) || w.none} → ${keptValue(key, b) || w.none}`);
      }
    }
    return lines;
  }


  const keyOf = (tripId, leg, role) => `${tripId}:${leg || 'outbound'}:${role || 'driver'}`;

  /* Where the driver stands on a leg: declined, pending, accepted, or changed
     since they accepted, with the lines that say what. `statuses` and `views`
     are the answers and the kept views, by `keyOf`. */
  function stateOf(l, { statuses, views }, say) {
    const row = statuses.get(keyOf(l.trip.id, l.leg, l.role)) || statuses.get(keyOf(l.trip.id, l.leg, 'driver'));
    const legacy = String(l.activeRoles.find(e => String(e).split(':', 1)[0] === l.role) || '').split(':', 2)[1] || '';
    const byDispatch = ['confirmed', 'success'].includes(legacy);
    if (row?.status === 'declined') return { status: 'declined' };
    if (!(row?.status === 'confirmed' || row?.confirmedAt || byDispatch)) return { status: 'pending' };
    const kept = views.get(keyOf(l.trip.id, l.leg, l.role));
    if (kept) {
      const lines = changesBetween(kept, jobView(l), l, say);
      return lines.length ? { status: 'changed', lines } : { status: 'accepted' };
    }
    const at = row?.confirmedAt || row?.acceptedAt;
    const stale = at && l.trip.updated_at && new Date(l.trip.updated_at) > new Date(at);
    return stale ? { status: 'changed', lines: [] } : { status: 'accepted' };
  }

  /* THE OFFICE'S READING: what changed for a driver since they accepted,
     from the office's own rows, which hold a bus and a driver by id where the
     driver's link hands them over by name. `read` is the page's `busesById`,
     `driversById` and `nameOf`, the office's name for a need. `row` is the
     seat's status as get_trip_driver_statuses returns it; only a confirmed
     seat with a kept view can have changed, so one accepted before views
     were kept says nothing. The lines are brief, Pickup changed or Bus
     changed, because a card and a To do row say only what to tell, and the
     driver's own page gives the old and new. They are English, as the office
     reads them, unless `read.lang` names the driver's language; a need the
     driver page names in it is named so here. `read.keys` gives the
     VIEW_KEYS names instead, which the text that tells the driver words. */
  const ENGLISH = { w: WORDS.en, keptValue: (key, v) => v, keptRequirement: name => name, brief: true };
  const briefIn = lang => (lang && lang !== 'en' && WORDS[lang] ? {
    ...ENGLISH, w: WORDS[lang],
    keptRequirement: name => {
      const id = Object.keys(WORDS.en.legacy).find(k => WORDS.en.legacy[k] === name);
      return id ? WORDS[lang].legacy[id] : name;
    },
  } : ENGLISH);
  const officeTrip = (trip, { busesById = new Map(), driversById = new Map() } = {}) => ({
    ...trip,
    trip_assignments: (trip.trip_assignments || []).map(a => ({
      ...a,
      buses: a.bus_id != null && busesById.get(a.bus_id) ? { number: busesById.get(a.bus_id).number } : null,
      trip_drivers: (a.trip_drivers || []).map(d => ({ ...d, drivers: driversById.get(d.driver_id) ?? null })),
    })),
  });
  function changesSince(trip, leg, driverId, row, read = {}) {
    if (row?.status !== 'confirmed' || !row.acceptedView) return [];
    const names = { get: id => read.nameOf?.(id) };
    const l = legOf({ tripId: trip.id, leg }, officeTrip(trip, read), driverId, names);
    if (l.error) return [];
    return changesBetween(row.acceptedView, jobView(l), l, { ...briefIn(read.lang), keys: !!read.keys });
  }
  // The view the office keeps for a driver it marks as told: the leg as it stands.
  function viewNow(trip, leg, driverId, read = {}) {
    const l = legOf({ tripId: trip.id, leg }, officeTrip(trip, read), driverId, { get: id => read.nameOf?.(id) });
    return l.error ? null : jobView(l);
  }

  window.SchedulerDriverJob = {
    clean, dateOnly, dayFmt, dayText, rangeText, timeText, todayIso,
    ROLE_KEY, roleKey, roleLabel, isRelief, activeSeats, stopsForLeg, requirementsOf, contactsOf, contactOf, itinerariesOf,
    legOf, stopText, jobView, VIEW_KEYS, changesBetween, keyOf, stateOf, changesSince, viewNow,
  };
})();
