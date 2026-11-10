/* ==========================================================================
   Rux Scheduler — DRIVER JOB, what a driver's leg asks of them and what changed
   --------------------------------------------------------------------------
   The one reading of a driver's job on a leg, loaded by the driver's own
   page and by the office's, so both name the same changes. `legOf` is one
   leg of one trip as the driver works it; `jobView` is what Accept keeps of
   it, every value text as the card writes it; `changesBetween` lists what
   changed since, one line each; `stateOf` says where the driver stands;
   `changesSince` is the office's reading of the same, from its own rows.

   A LEG IS NAMED BY ITS ID on a trip read with its legs, as trip-shape.js
   reads them, which the driver's link reads; a page that names it by its
   old word, or a trip read without its legs, is read by the word. `legOf`
   hands back the leg's key in `leg`, its id where there is one, and the
   word in `word`.

   Nothing here reads the page or the database. The words a line is written
   in are the page's, handed in; what Accept keeps is always English. Needs
   share/driver-words.js and trip-shape.js loaded first.
   ========================================================================== */
(() => {
  'use strict';

  const TZ = 'America/Chicago';
  const WORDS = window.SchedulerDriverWords;
  const SHAPE = window.SchedulerTripShape;
  const clean = v => String(v ?? '').trim();

  // -- dates and times, as the driver reads them --------------------------------
  const dateOnly = v => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(clean(v));
    return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
  };
  // English unless a locale is named: what Accept keeps is always English.
  // Each format is made once and kept, since making one costs many times using one.
  const dayFormats = new Map();
  const dayFmt = (opts, locale = 'en-US') => {
    const key = `${locale}|${JSON.stringify(opts)}`;
    if (!dayFormats.has(key)) dayFormats.set(key, new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...opts }));
    return dayFormats.get(key);
  };
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
  const OFFICE_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: TZ });
  const todayIso = () => OFFICE_DAY.format(new Date());

  // -- the trip ---------------------------------------------------------------
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

  const LEGACY_NAMES = WORDS.en.legacy;
  // `names` is the office's list, id to label, as the link's read hands it over.
  const requirementsOf = (trip, names = new Map()) => Object.entries(trip.trip_reqs || {})
    .filter(([, on]) => on).map(([id]) => names.get(id) || LEGACY_NAMES[id] || id);

  /* A leg's papers, its day-of contacts and its files, as trip-shape.js
     hands them: the trip is read with its legs, `trip_contacts` and its
     files, as the driver's link, Departures and the board read it. */
  const papersLeg = (trip, leg) => shapeLeg(trip, leg)?.id;
  /* The leg's day-of contacts, or with none whoever booked. */
  const contactsOf = (trip, leg) => {
    const day = SHAPE.contactsFor(trip, papersLeg(trip, leg)).map(c => ({ name: c.name, phone: c.phone }));
    const booked = { name: clean(trip.booking_contact_name), phone: clean(trip.booking_contact_phone) };
    return day.length ? day : booked.name || booked.phone ? [booked] : [];
  };
  const contactOf = (trip, leg) => contactsOf(trip, leg)[0] || null;

  /* The leg's itinerary, read as its contacts are: the newest is the one
     shown, marked Updated when it replaced another of the leg's. */
  const itinerariesOf = (trip, leg) => {
    const same = SHAPE.itinerariesFor(trip, papersLeg(trip, leg));
    if (!same.length) return [];
    const newest = same[0];
    return [{ id: newest.id, label: newest.label, path: newest.file_path, updated: same.length > 1 }];
  };

  /* A trip's leg as trip-shape.js reads it, by its id or by the old word a
     page or an older link names it by; null on a trip read without its legs. */
  const shapeLeg = (trip, named, word) => (SHAPE && Array.isArray(trip?.trip_legs)
    ? SHAPE.legOf(trip, named) ?? SHAPE.legOfWord(trip, word || named) : null);

  /* One leg of one trip, as this driver works it. `ref` names the leg by
     `legId` or `leg`, its id or its old word. */
  function legOf(ref, trip, driverId, names) {
    const shaped = shapeLeg(trip, ref.legId || ref.leg, ref.leg);
    const word = shaped ? shaped.word : ref.leg || 'outbound';
    const leg = shaped ? shaped.id : word;
    const routes = new Set((shaped?.routes ?? []).map(r => r.id));
    const assignments = (trip.trip_assignments || [])
      .filter(a => (shaped ? routes.has(a.route_id) : (a.leg || 'outbound') === word));
    const mine = assignments.find(a => activeSeats(a).some(d => String(d.driver_id) === String(driverId)));
    if (!mine) return { error: 'notYours' };
    const seat = activeSeats(mine).find(d => String(d.driver_id) === String(driverId));
    const role = seat.role || 'driver';
    /* A co-driver who moves between the leg's buses rides the ones their
       seat lists as well, and each of those buses has them aboard. */
    const alsoOn = d => (d.role === 'co-driver' && Array.isArray(d.also_on) ? d.also_on.map(String) : []);
    const rides = assignments.filter(a => alsoOn(seat).includes(String(a.id)));
    const aboard = a => [...activeSeats(a), ...assignments.filter(b => b !== a).flatMap(b => activeSeats(b))
      .filter(d => alsoOn(d).includes(String(a.id)))];
    const numberOf = a => (a.buses?.number != null ? String(a.buses.number) : '');
    const inbound = SHAPE.isPickup(trip, shaped?.id);
    // The stops of the route their own bus runs, the leg's first where it names none of the leg's.
    const route = routes.has(mine.route_id) ? mine.route_id : shaped?.routes[0]?.id;
    const stops = shaped ? SHAPE.stopsOfRoute(trip, route) : stopsForLeg(trip, word);
    const pickup = stops.find(s => s.type === 'pickup') || {};
    const back = [...stops].reverse().find(s => s.type === 'return') || {};
    const start = shaped ? shaped.start : inbound ? trip.return_start_date : trip.start_date;
    const end = shaped ? shaped.end : inbound ? (trip.return_end_date || trip.return_start_date) : (trip.end_date || trip.start_date);
    // Their own bus first, then each they ride, then the leg's others.
    const crew = [mine, ...rides, ...assignments.filter(a => a !== mine && !rides.includes(a))].map(a => ({
      bus: numberOf(a),
      mine: a === mine || rides.includes(a),
      people: aboard(a).filter(d => String(d.driver_id) !== String(driverId)).map(d => ({
        name: d.drivers?.short_name || d.drivers?.name || '',
        role: roleKey(d.role),
        phone: clean(d.drivers?.phone),
      })),
    })).filter(b => b.people.length);
    return {
      trip, leg, word, role, start, end,
      destination: inbound ? (back.name || back.address || 'Yard') : (trip.destination || 'Destination'),
      // Which of the two the page wrote, where the office named no place.
      destinationWord: inbound ? (back.name || back.address ? null : 'yard') : (trip.destination ? null : 'destination'),
      customer: clean(trip.customer),
      bus: [mine, ...rides].map(numberOf).filter(Boolean).join(' · '),
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

  /* THE DRIVER'S JOB, AS FAR AS A CHANGE TO IT IS TOLD: what Accept keeps
     and a later load compares, each value text as the card writes it, so a
     change reads as the driver would read it. A view kept before holds the
     bus, stops, role and needs too, which nothing reads. */
  function jobView(l) {
    return {
      dates: rangeText(l.start, l.end),
      time: timeText(l.time),
      place: [l.place.name, l.place.address].filter(Boolean).join(', '),
      destination: l.destination,
      relief: l.relief ? [l.relief.at && `Handoff at ${timeText(l.relief.at)}`, l.relief.instructions].filter(Boolean).join(' · ') : '',
      // The file itself, so a file replaced under the same document reads as new.
      itinerary: l.itineraries[0]?.path || l.itineraries[0]?.id || '',
    };
  }
  /* A KEPT VALUE IN THE DRIVER'S LANGUAGE. What Accept keeps is English, so
     a day reads back as `lang` writes it, its year left off within this one,
     and the page's own words for a leg with no place named are its own. */
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const KEPT_DAY = new RegExp(`^(?:${DAYS.join('|')}), (${MONTHS.join('|')}) (\\d{1,2})(?:, (\\d{4}))?$`);
  const keptDates = (text, lang) => {
    const days = clean(text).split(' – ').map(p => KEPT_DAY.exec(p));
    if (!days.every(Boolean)) return clean(text);
    const year = days.map(m => m[3]).find(Boolean) ?? todayIso().slice(0, 4);
    const [a, b] = [days[0], days.at(-1)].map(m => `${m[3] ?? year}-${String(MONTHS.indexOf(m[1]) + 1).padStart(2, '0')}-${m[2].padStart(2, '0')}`);
    return rangeText(a, b, true, WORDS.LOCALE[lang] ?? WORDS.LOCALE.en);
  };
  /* The words a change is said in, `{ w, keptValue }`: the page's or the
     driver's language, English where none is named. */
  function sayIn(lang) {
    const language = lang && lang !== 'LOCALE' && WORDS[lang] ? lang : 'en';
    const w = WORDS[language];
    return {
      w,
      keptValue: (key, v) => (key === 'dates' ? keptDates(v, language)
        : key === 'destination' && v === WORDS.en.yard ? w.yard : v),
    };
  }

  /* WHAT A DRIVER IS TOLD OF: what would put them on the wrong day, at the
     wrong time or at the wrong place, and a new itinerary, which carries
     everything else. A bus, a stop or a need that changes asks nothing,
     since the reminder sent before the trip gives the leg as it stands. A
     relief driver's time is their handoff, which the kept `relief` opens
     with, not the bus's spot. A value taken away, such as a time back to
     TBD, asks nothing either: there is nothing new to tell. */
  const handoffOf = v => /^Handoff at (.+?)(?= · |$)/.exec(clean(v))?.[1] ?? '';
  // A leg with no destination named keeps the page's word for one.
  const named = v => (v === WORDS.en.destination ? '' : clean(v));
  // A pickup by its name, or by its whole place where only the address moved.
  const placeName = v => clean(v).split(', ')[0];

  /* Each change as one line the driver reads, the new value first and the
     one it replaced after: "New spot time: 9:00 AM (was 8:45 AM)". `say` is
     `sayIn`'s words, the page's or the driver's language. */
  function changesBetween(was, now, l, { w, keptValue }) {
    const lines = [];
    const tell = (label, key, a, b) => {
      const old = keptValue(key, a), value = keptValue(key, b);
      lines.push(`${label}: ${value}${old ? w.was(old) : ''}`);
    };
    const kept = key => clean(was?.[key]);
    if (now.dates && kept('dates') !== now.dates) tell(now.dates.includes(' – ') ? w.told.dates : w.told.date, 'dates', kept('dates'), now.dates);
    const [a, b] = isRelief(l.role) ? [handoffOf(was?.relief), handoffOf(now.relief)] : [kept('time'), clean(now.time)];
    if (b && a !== b) tell(isRelief(l.role) ? w.told.handoff : w.told.time, 'time', a, b);
    if (now.place && kept('place') !== now.place) {
      const byName = placeName(kept('place')) !== placeName(now.place);
      tell(w.told.place, 'place', byName ? placeName(kept('place')) : kept('place'), byName ? placeName(now.place) : now.place);
    }
    if (named(now.destination) && named(kept('destination')) !== named(now.destination)) {
      tell(w.told.destination, 'destination', named(kept('destination')), named(now.destination));
    }
    // A view kept before the itinerary was told by its file holds the
    // document's id, which stands for the file it had then.
    const file = kept('itinerary');
    if (now.itinerary && file !== now.itinerary && !(file && file === l.itineraries[0]?.id)) lines.push(w.newItinerary);
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
     were kept says nothing. The lines are the driver's own, so the office
     reads what the driver will: English, unless `read.lang` names the
     driver's language, which the text that tells them is written in. */
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
    return changesBetween(row.acceptedView, jobView(l), l, sayIn(read.lang));
  }
  // The view the office keeps for a driver it marks as told: the leg as it stands.
  function viewNow(trip, leg, driverId, read = {}) {
    const l = legOf({ tripId: trip.id, leg }, officeTrip(trip, read), driverId, { get: id => read.nameOf?.(id) });
    return l.error ? null : jobView(l);
  }

  window.SchedulerDriverJob = {
    clean, dateOnly, dayFmt, dayText, rangeText, timeText, todayIso,
    ROLE_KEY, roleKey, roleLabel, isRelief, activeSeats, stopsForLeg, requirementsOf, contactsOf, contactOf, itinerariesOf,
    legOf, jobView, sayIn, changesBetween, keyOf, stateOf, changesSince, viewNow,
  };
})();
