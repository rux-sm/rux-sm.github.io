/* ==========================================================================
   Rux Scheduler — TRIP TIPS, what a press on a trip's bar opens over the board
   --------------------------------------------------------------------------
   The route tip, Alerts and Updates, a driver's tip, and the live card of a
   bus out on its trip, with its map. data.js draws the selected trip's with
   them, the phone's half sheet in trip-sheet.js draws the route and the live
   card with them, and components.html draws its samples with them, so none
   can differ.

   Each is handed the trip, its bar as bar.js drew it, and `board`, what it
   reads from the board around it:
     driversById, busesById, statuses   as bar.js is handed them;
     partnersById          the partners, as bar.js is handed them;
     facts(bar)            the facts bar.js handed back for the bar;
     road(bar)             `{ bus, next, said }` for the bar's bus in
                           Samsara's last answer, or null: the bus, where it
                           is on its leg, and live-trip.js's `{ warnings,
                           phase }`;
     seat(bar, role)       the bar's `{ trip, assign, range }` for a seat;
     standing(trip, leg)   clashes.js's standing answer for the leg;
     near(range, tripId)   clashes.js's `fitFor` for the days, read against
                           what the board holds;
     photo(path)           a promise of a signed link to a driver's photo,
                           or of '';
     staff(id)             the profile of the account an update records;
     editor(trip)          the trip's updates as the office has them open:
                           `{ opened, editing, quick }`, `opened` whether
                           every update shows, `editing` the update open to
                           change, `{ id, mode, draft }`, or null, and `quick`
                           the words in the Add box while it is open, or null;
     map                   an object the board keeps its live map in.
   `route(trip, bar, board)`, `driver(trip, bar, section, board)`, the section
   being `driver:<id>:<seat>`, `partner(trip, bar, board)`, the partner
   covering the bar's bus, `live(trip, bar, board)` and `card(trip, bar,
   section, board)`, Alerts for the section `needs` and Updates for any
   other, each hand back one element. `liveOn(trip, road, busId, board,
   { links })` is the live card from `road(bar)`'s answer and the bus id,
   which the Live map draws beside its map with no bar. `updateFace(u, size, staff)`,
   `ageShort(at)`, `cardTitle(name, count, action)`, `postTripOf(trip)`,
   `postTripRows(post, cls, pressOf)`, `markSave(save, ready)` and `WARN_GO`
   are the parts the half sheet's card and the Updates window share.
   Floating, a tip is Carbon's toggletip: `CONTAINER` is the container's
   classes and `surface(tip)` the popover that goes inside it.

   Every value from the database is written with textContent.
   ========================================================================== */
(() => {
  'use strict';

  const { alertsOf, hhmm, setAt, dayWords, updateStamp } = window.SchedulerBar;
  const { crewOf, requirementLabel } = window.SchedulerLegFacts;
  const { hueFor, legKeyOfVehicle } = window.SchedulerWeek;
  const { updatesOf, due: dueFollowUp, daysToGo } = window.SchedulerFollowUp;
  const Road = window.SchedulerRoad;
  const LiveMap = window.SchedulerLiveMap;
  const RoadBar = window.SchedulerRoadBar;
  const { HOUR: ROAD_HOUR, LOW: ROAD_LOW, DUTY: ROAD_DUTY, hours: roadHours, mark: roadMark, ago: roadAgo, restWords: roadRest } = RoadBar;
  const { format: showPhone, dial } = window.SchedulerPhone;

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const svgUse = (href, size, box) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', size); svg.setAttribute('height', size);
    svg.setAttribute('viewBox', box); svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', href);
    svg.appendChild(use);
    return svg;
  };
  const usd = n => `$${Math.round(n).toLocaleString('en-US')}`;
  // Minutes as the editor writes a drive, "45 min" or "1 h 5 min".
  const minutes = min => (min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`);
  // The Add box's Save is primary while there are words to save, and ghost until then.
  const markSave = (save, ready) => {
    save.classList.toggle('rux--btn--primary', ready);
    save.classList.toggle('rux--btn--ghost', !ready);
  };

  /* Each person keeps one of Carbon's avatar colours, picked by their name,
     so a face is learnt. */
  // The five mid tones, each of which holds white initials at 4.5 to 1.
  const AVATAR_COLOURS = ['rux--user-avatar--order-1-cyan', 'rux--user-avatar--order-3-green',
    'rux--user-avatar--order-4-magenta', 'rux--user-avatar--order-5-purple', 'rux--user-avatar--order-6-teal'];
  const avatarColour = name => {
    let h = 0;
    for (const ch of String(name)) h = (h * 31 + ch.codePointAt(0)) >>> 0;
    return AVATAR_COLOURS[h % AVATAR_COLOURS.length];
  };

  /* An update's author as a face, on the card and in the Updates window, its
     name the tooltip and accessible name. A line copied from the old notes
     with nobody named is a grey face. A written update is drawn as its
     author's own avatar. An imported one never is: its account is whoever ran
     the import, not the person who wrote the line, so it keeps the initial of
     the name it carries. */
  function updateFace(u, size, staff) {
    /* A line copied from the old notes has no author to show, so it stands
       behind a note rather than an empty face. */
    if (u.kind === 'imported' && !u.actor_name) {
      const note = el('span', `scheduler-note-face scheduler-note-face--${size === 'sm' ? 'sm' : 'md'}`);
      note.appendChild(svgUse('#m-sticky_note_2', '16', '0 0 32 32'));
      note.title = 'From the old notes';
      note.setAttribute('role', 'img');
      note.setAttribute('aria-label', 'From the old notes');
      return note;
    }
    const who = u.actor_name || (u.kind === 'imported' ? 'From the old notes' : 'Someone');
    const nobody = !u.actor_name;
    const face = el('span', `rux--user-avatar ${size === 'sm' ? 'rux--user-avatar--sm' : 'rux--user-avatar--md'} ${nobody ? 'rux--user-avatar--order-2-gray' : avatarColour(who)}`,
      nobody ? '' : who.charAt(0).toUpperCase());
    const author = u.kind !== 'imported' && staff?.(u.actor_id);
    if (author) {
      window.Rux?.account?.drawAvatar?.(face,
        { id: author.id, name: u.actor_name || author.display_name, photoPath: author.photo_path, colour: author.avatar_color }, size);
    }
    face.title = who;
    face.setAttribute('role', 'img');
    face.setAttribute('aria-label', who);
    return face;
  }

  /* How long ago an update was written: minutes in the first hour, hours in
     the first day, then days for a week, "45m", "2h", "3d"; an older one
     shows its date, "Sep 22", which reads quicker than "45d". */
  const ageShort = at => {
    const mins = Math.max(1, Math.floor((Date.now() - Date.parse(at)) / 60000));
    if (mins < 60) return `${mins}m`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h`;
    if (mins < 7 * 1440) return `${Math.floor(mins / 1440)}d`;
    const day = new Date(at);
    return day.toLocaleDateString(undefined, day.getFullYear() === new Date().getFullYear()
      ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' });
  };

  /* A part's title, Carbon's way of heading a list: its name in the 14px
     heading type, its count beside it in plain secondary text, and the
     part's button, if it has one, at its end. */
  function cardTitle(name, count, action) {
    const title = el('div', 'scheduler-card__title');
    const heading = el('span', 'scheduler-card__heading', name);
    if (count) heading.appendChild(el('span', 'scheduler-card__count', String(count)));
    title.appendChild(heading);
    if (action) title.appendChild(action);
    return title;
  }

  /* THE ROUTE TIP: a press on the route mark leading a bar's time row shows the
     leg's route in a tip beside the trip, as the trip's other tips stand,
     its caret on the time row. It reads down a column of times, each point
     a short block: the planned time and its word, Yard out, Spot or
     Arrives, then under it what happened beside the place, and, where the
     bus waits there, when it Departs. The words are the Route tab's and the
     itinerary's, so a time is called the same thing everywhere. Planned is
     the route's own time, the pickup's spot and each stop's arrival; what
     happened is what Samsara recorded on the bus's row, and on a bus out on
     the leg a stop reached, the bus at one, or the next one's estimate after
     a tilde, `--:--` until then. Planned is in the tip's quiet ink and what
     happened in its own, an estimate quiet and slanted. The pickup alone,
     the only stop a bus can be late to, says on time with a check, or late
     in red with the minutes after its time, reached or expected. A day heading stands over each
     day's points, and a departure on a later day names its weekday. The
     press selects the trip, as a press on any of its icons does. It is the
     card's part `route:`. */
  const clockOfMs = ms => hhmm(Road.clockOf(ms), true);
  const OFFICE_DATE = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' });
  const OFFICE_DAY = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'short', month: 'short', day: 'numeric' });
  const OFFICE_WEEKDAY = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'short' });
  const dayOf = ms => OFFICE_DATE.format(ms);
  // A time as the bar writes it, with "+1" after it on a day past `on`, the day it stands under.
  const routeClock = (ms, on) => {
    const w = el('span', 'scheduler-route__clock', clockOfMs(ms));
    const days = on == null ? 0 : Math.round((Date.parse(dayOf(ms)) - Date.parse(on)) / 864e5);
    if (days > 0) w.appendChild(el('sup', 'scheduler-route__plus', `+${days}`));
    return w;
  };
  // A pickup reached on time: Carbon's green check and the words.
  const routeOnTime = () => {
    const j = el('span', 'scheduler-route__judged');
    j.append(svgUse('#i-checkmark--filled', '16', '0 0 16 16'), 'On time');
    return j;
  };
  // A late pickup's minutes after its time, said in full for a screen reader.
  const routeLate = (actual, late) => {
    actual.classList.add('scheduler-route__actual--late');
    const by = el('span', 'scheduler-route__late', `+${late}`);
    by.append(el('span', 'rux--visually-hidden', ' minutes late'));
    actual.append(by);
  };
  // A mark standing in the time column, named for a screen reader.
  const routeMark = (href, box, cls, words) => {
    const m = svgUse(href, '16', box);
    m.setAttribute('class', cls);
    m.setAttribute('role', 'img');
    m.setAttribute('aria-label', words);
    return m;
  };
  // The leg's points in order, each its key, word, place, planned and actual times, or what a bus out says of it.
  function routeOf(trip, bar, board) {
    const stops = Road.stopsOf(trip, bar.dataset.legKey || bar.dataset.leg, bar.dataset.routeId || null);
    const track = bar.querySelector(':scope > .scheduler-bar__time .scheduler-bar__track[data-out]');
    const out = track ? Number(track.dataset.out) : null;
    const next = bar.classList.contains('scheduler-bar--road') ? board.road(bar)?.next ?? null : null;
    const reached = next?.where?.reached ?? -1;
    const assign = (trip.trip_assignments || []).find(a => String(a.id) === bar.dataset.assignmentId);
    const at = v => (v ? Date.parse(v) : null);
    const home = stops.findLastIndex(st => st.type === 'return');
    const said = (row, st, i) => {
      if (row.actual != null || !next) return row;
      if (i === reached && next.at) row.here = true;
      else if (i <= reached) {
        row.reached = true;
        row.actual = next.where.arrived?.[i] ?? null;
        if (st.type === 'pickup' && row.actual != null) row.late = Road.pickupLate(st.due, row.actual);
      }
      else if (next.stop?.key === st.key && next.arrival != null) { row.estimate = next.arrival; if (next.late) row.late = next.late; }
      return row;
    };
    const rows = [{ key: 'yard-out', word: 'Yard out', place: null, planned: out, actual: at(assign?.actual_yard_depart_at) }];
    stops.forEach((st, i) => {
      if (i === home) return;
      const pickup = st.type === 'pickup';
      const actual = pickup ? at(assign?.pickup_at) : at(assign?.stop_arrivals?.[st.key]);
      rows.push(said({ key: st.key, word: pickup ? 'Spot' : 'Arrives', place: st.name || (pickup ? 'Pickup' : 'Stop'), planned: st.due,
        leaves: st.leaves, actual, late: pickup && actual != null ? Road.pickupLate(st.due, actual) : null }, st, i));
    });
    const back = { key: 'yard-back', word: 'Yard back', place: null, planned: track ? Number(track.dataset.back) : stops[home]?.due ?? null,
      actual: at(assign?.actual_yard_return_at) };
    rows.push(home >= 0 ? said(back, stops[home], home) : back);
    return { rows, live: !!next };
  }
  /* A floating route shows five points of a longer route: for a bus out,
     from the last point it reached on, so where it has been and where it
     goes next both show, and otherwise from the yard out. Full route, with
     the count of stops, opens the editor's Route tab. A route one point
     longer shows whole rather than hide a point behind a link. The phone's
     half sheet, with the room, asks for every point, `size` Infinity. A
     place keeps to one line, cut short with an ellipsis, so the column of
     times reads straight down; its whole name is in the point's label. */
  const ROUTE_ROWS = 5;
  function routeTip(trip, bar, board, size = ROUTE_ROWS) {
    const tip = el('div', 'scheduler-tip scheduler-tip--card');
    tip.dataset.tripId = trip.id;
    const head = el('div', 'scheduler-tip__head');
    head.append(el('span', 'scheduler-tip__name', 'Route'));
    tip.appendChild(head);
    const route = routeOf(trip, bar, board);
    const list = el('div', 'scheduler-route');
    const all = route.rows;
    const cut = all.length > size + 1;
    const done = route.live ? all.findLastIndex(r => r.here || r.reached || r.actual != null) : 0;
    const first = cut ? Math.max(0, Math.min(done, all.length - size)) : 0;
    let on = null;
    for (const r of cut ? all.slice(first, first + size) : all) {
      const day = r.planned != null ? dayOf(r.planned) : on;
      if (day && day !== on) {
        on = day;
        list.appendChild(el('div', 'scheduler-route__day', OFFICE_DAY.format(r.planned)));
      }
      const point = el('div', 'scheduler-route__point');
      point.setAttribute('role', 'group');
      point.setAttribute('aria-label', [r.word, r.place].filter(Boolean).join(' · '));
      const word = el('span', 'scheduler-route__word', r.word);
      if (r.late === 0) word.append(' ', routeOnTime());
      point.append(r.planned != null ? routeClock(r.planned, on) : el('span', 'scheduler-route__clock', '--:--'), word);
      const actual = el('span', 'scheduler-route__actual');
      if (r.here) actual.appendChild(routeMark('#m-directions_bus-fill', '0 0 32 32', 'scheduler-route__bus', 'Here now'));
      else if (r.actual != null) actual.appendChild(routeClock(r.actual, on));
      else if (r.reached) actual.appendChild(routeMark('#i-checkmark--filled', '0 0 16 16', 'scheduler-route__reached', 'Reached'));
      else if (r.estimate != null) { actual.classList.add('scheduler-route__actual--expected'); actual.append('~', routeClock(r.estimate, on)); }
      else { actual.classList.add('scheduler-route__actual--none'); actual.append('--:--'); }
      if (r.late > 0 && (r.actual != null || r.estimate != null)) routeLate(actual, r.late);
      point.append(actual, el('span', 'scheduler-route__place', r.place ?? ''));
      if (r.leaves != null) {
        const later = dayOf(r.leaves) !== on;
        point.append(el('span', 'scheduler-route__clock', clockOfMs(r.leaves)),
          el('span', 'scheduler-route__word', later ? `Departs ${OFFICE_WEEKDAY.format(r.leaves)}` : 'Departs'));
      }
      list.appendChild(point);
    }
    tip.appendChild(list);
    if (cut) {
      const foot = footer();
      const stopsCount = all.length - 2;
      foot.appendChild(goLink(`Full route · ${stopsCount} ${stopsCount === 1 ? 'stop' : 'stops'}`, 'route'));
      tip.appendChild(foot);
    }
    return tip;
  }

  /* THE LIVE CARD'S MAP: one Leaflet map a board, kept in its `map`, made
     the first time a live card opens and moved into each live card drawn
     after, so a card drawn again with each answer keeps the office's own
     zoom; it fits the leg afresh only for another bus. live-map.js loads
     Leaflet and draws the pin and the leg, as the Live map page does. */
  async function mapInto(holder, busId, bus, next, hue, board) {
    const slot = board.map;
    const none = words => holder.isConnected && holder.replaceWith(el('p', 'scheduler-card__live-none', words));
    try { await LiveMap.load(); } catch { none("The map didn't load. Show on Live map opens it."); return; }
    if (!holder.isConnected) return;
    if (!slot.live) {
      const host = el('div', 'scheduler-card__live-map-box');
      holder.replaceWith(host);
      const map = window.SchedulerPlaces.baseMap(host, LiveMap.style(), { scrollWheelZoom: false, zoom: false });
      if (!map) { host.replaceWith(el('p', 'scheduler-card__live-none', window.SchedulerPlaces.unavailable() || "The map didn't load.")); return; }
      slot.live = { host, map, layer: null, pin: null, busId: null, style: LiveMap.style() };
    } else holder.replaceWith(slot.live.host);
    const { map } = slot.live;
    map.invalidateSize();
    const want = LiveMap.style();
    if (want !== slot.live.style) { slot.live.style = want; map.style(want); }
    const here = bus.lat != null && bus.lng != null ? [bus.lat, bus.lng] : null;
    const leg = { path: bus.path, here, stop: next?.stop ?? null, at: !!next?.at, stops: next?.stops ?? [],
      reached: next?.where.reached ?? -1, clock: ms => hhmm(Road.clockOf(ms), true) };
    /* The road ahead once live-map.js has it, as the Live map draws it,
       redrawn when it comes only while this is still the leg shown. */
    slot.live.leg = leg;
    const draw = () => {
      slot.live.layer?.remove();
      slot.live.layer = LiveMap.drawLeg(map, { ...leg, ahead: LiveMap.ahead(bus.bus_id, leg, () => slot.live.leg === leg && draw()) });
    };
    draw();
    slot.live.pin?.remove();
    slot.live.pin = here ? window.L.marker(here, { keyboard: false, interactive: false, icon: window.L.divIcon({
      className: 'scheduler-live-pin-box', iconSize: null,
      html: LiveMap.pinHtml({ id: busId, number: board.busesById.get(busId)?.number ?? '', paint: board.busesById.get(busId)?.color, heading: bus.heading, hue }),
    }) }).addTo(map) : null;
    if (slot.live.busId !== bus.bus_id) {
      slot.live.busId = bus.bus_id;
      const points = LiveMap.pointsOf(leg);
      if (points.length > 1) map.fitBounds(points, { padding: [24, 24], maxZoom: 14 });
      else map.setView(points[0] ?? [26.2, -98.2], points.length ? 13 : 9);
    }
    // The card pops in at a smaller scale, so the map measures itself again once it settles.
    requestAnimationFrame(() => map.invalidateSize());
  }

  // A driver's three clocks, each against the most its rule allows.
  const LIVE_CLOCKS = [['Drive', 'drive_ms', 10 * ROAD_HOUR], ['Shift', 'shift_ms', 15 * ROAD_HOUR], ['Cycle', 'cycle_ms', 70 * ROAD_HOUR]];
  /* A DRIVER'S TIP has one head at every stage: their photo, or their
     initials until it comes, their name, and a 12px line under it. `section` is
     `driver:<id>:<seat>`, the seat `wheel` for a driver at the wheel the bar
     does not name. The photo is signed from the Drivers page's bucket; every
     other line is read from what the board holds.

     BEFORE THE TRIP it says whether the driver is set: their seat under the
     name, with Part-time where they are; their answer, who gave it and when;
     a lamp row for each thing in the way, a leg that changed since they said
     yes in amber and what stands in the way of the seat, clashes.js's, in
     red; a back-to-back trip either side with the rest between, in amber
     where the rest is short; and in its footer Call with their phone, a link.

     ON THE ROAD, for a driver Samsara has in the bus, it says how they are
     doing, the live card's driver with the driver as its head: their duty
     under the name; their Drive, Shift and Cycle time left, each over its
     meter, amber when low; their rest while off or in the sleeper; a
     lamp row for each of the road's warnings; the rest either side, as before
     the trip, since it is about their next trip; the small map of the leg;
     the next stop and when the bus gets there; and in its footer Call at the
     start, since the office calls a driver most while they are out, and Live
     map at the end, links, Google Maps left to the live card since three
     links do not fit the footer's one line. The bus's own state, its engine,
     fuel and place, is the bus tip's. */

  const initialsOf = name => String(name || '').trim().split(/\s+/).filter(Boolean)
    .map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  // A driver's face: their photo, or their initials until it comes.
  function faceOf(name, photoPath, board) {
    const face = el('div', 'rux--user-avatar rux--user-avatar--order-2-gray rux--user-avatar--sm scheduler-tip__face', initialsOf(name));
    face.setAttribute('aria-hidden', 'true');
    board.photo(photoPath).then(url => {
      if (!url || !face.isConnected) return;
      const img = el('img', 'rux--user-avatar__photo rux--user-avatar__photo--sm');
      img.alt = '';
      img.src = url;
      img.addEventListener('error', () => { face.textContent = initialsOf(name); }, { once: true });
      face.replaceChildren(img);
    });
    return face;
  }
  // A live driver's Drive, Shift and Cycle time left, each over its meter, amber when low; null with none.
  function clocksOf(d) {
    const clocks = el('div', 'scheduler-tip__row scheduler-tip__clocks');
    for (const [label, field, most] of LIVE_CLOCKS) {
      const ms = d[field];
      if (ms == null) continue;
      const clock = el('div', `scheduler-tip__clock${ms < ROAD_LOW ? ' scheduler-tip__clock--low' : ''}`);
      const top = el('span', 'scheduler-tip__clock-top');
      top.append(el('span', null, label), el('span', 'scheduler-tip__left', roadHours(ms)));
      const meter = el('span', 'scheduler-tip__meter');
      meter.style.setProperty('--scheduler-left', `${Math.round(Math.min(1, ms / most) * 100)}%`);
      clock.append(top, meter);
      clocks.appendChild(clock);
    }
    return clocks.children.length ? clocks : null;
  }
  // A resting driver's rest so far of the eight hours, or null while they work.
  const restRowOf = d => (['sleeper', 'off'].includes(d.duty)
    ? el('div', 'scheduler-tip__row', roadRest(d) ? `${roadRest(d)} of 8h` : 'Continuous rest unknown') : null);
  function driverTip(trip, bar, section, board) {
    const [, driverId, role] = section.split(':');
    const tip = el('div', 'scheduler-tip scheduler-tip--card');
    tip.dataset.tripId = trip.id;
    const road = bar.dataset.road ? board.road(bar) : null;
    const bus = road?.bus ?? null;
    const d = bus?.drivers.find(x => x.driver_id != null && String(x.driver_id) === driverId) ?? null;
    const found = board.seat(bar, role);
    const c = found && crewOf(found.trip, found.assign, board.driversById, board.statuses)
      .find(x => x.role === role && String(x.driverId) === driverId);
    const who = c?.who ?? [...board.driversById.values()].find(x => String(x.id) === driverId) ?? null;
    const head = el('div', 'scheduler-tip__head');
    tip.appendChild(head);
    if (!d && !c?.who) {
      head.appendChild(el('strong', 'scheduler-tip__name', 'Driver'));
      tip.appendChild(el('p', 'scheduler-tip__none', 'Nobody is in this seat now.'));
      return tip;
    }
    const name = who?.name || d?.name || who?.short_name || 'Unnamed driver';
    const face = faceOf(name, who?.photo_path, board);
    const said = el('div', 'scheduler-tip__text');
    said.append(el('strong', 'scheduler-tip__name', name), el('span', 'scheduler-tip__by', d
      ? [(ROAD_DUTY[d.duty] ?? ROAD_DUTY.unknown).word, d.wheel ? 'at the wheel' : null].filter(Boolean).join(' · ')
      : [c.label, who?.employment_type === 'part-time' ? 'Part-time' : null].filter(Boolean).join(' · ')));
    head.append(face, said);
    const lamp = (tone, words, why) => {
      const row = el('div', `scheduler-tip__row scheduler-tip__lamp scheduler-tip__lamp--${tone}`);
      const text = el('span', 'scheduler-tip__words', words);
      if (why) text.append(' ', el('span', 'scheduler-tip__why', why));
      row.append(svgUse(tone === 'error' ? '#i-warning--filled' : '#i-warning--alt--filled', '16', '0 0 32 32'), text);
      tip.appendChild(row);
    };
    // A back-to-back trip either side with the rest between, amber where the rest is short.
    const restEitherSide = () => {
      const fit = found?.range ? board.near(found.range, trip.id) : null;
      const nearKey = fit && [...fit.near.keys()].find(k => String(k) === driverId);
      for (const words of nearKey != null ? fit.near.get(nearKey) : []) {
        if (fit.tight.has(nearKey)) lamp('warning', words);
        else tip.appendChild(el('div', 'scheduler-tip__row', words));
      }
    };
    const callLink = () => {
      if (!who?.phone) return null;
      const call = footLink(`Call ${showPhone(who.phone)}`, `tel:${dial(who.phone)}`);
      call.setAttribute('aria-label', `Call ${name}, ${showPhone(who.phone)}`);
      return call;
    };
    if (d) {
      const clocks = clocksOf(d);
      if (clocks) tip.appendChild(clocks);
      const rest = restRowOf(d);
      if (rest) tip.appendChild(rest);
      const { next, said: told } = road;
      for (const w of told.warnings) lamp(w.tone === 'error' ? 'error' : 'warning', w.title, w.sentence);
      restEitherSide();
      const mapRow = el('div', 'scheduler-tip__row scheduler-tip__map');
      const holder = el('div', 'scheduler-card__live-map-box');
      mapRow.appendChild(holder);
      tip.appendChild(mapRow);
      mapInto(holder, bar.dataset.busId, bus, next, hueFor(trip), board);
      if (next?.stop) {
        const words = next.at ? 'Here now' : [next.stop.due != null ? `due ${hhmm(Road.clockOf(next.stop.due), true)}` : null,
          next.arrival != null ? `arrives ${hhmm(Road.clockOf(next.arrival), true)}` : null, next.late ? `${next.late} min late` : null].filter(Boolean).join(' · ');
        const row = el('div', `scheduler-tip__row scheduler-tip__next${next.late ? ' scheduler-tip__next--late' : ''}`);
        row.append(el('span', 'scheduler-tip__words', `Next: ${next.stop.name || 'Stop'}`), el('span', 'scheduler-tip__when', words || 'No time'));
        tip.appendChild(row);
      }
      const foot = footer();
      const call = callLink();
      if (call) foot.appendChild(call);
      foot.appendChild(footLink('Live map', `live.html?bus=${encodeURIComponent(bar.dataset.busId)}`));
      tip.appendChild(foot);
      return tip;
    }
    // Their answer: who gave it and when, as the bar's own words say it.
    const { value, label } = c.status;
    const answer = el('div', 'scheduler-tip__row scheduler-tip__answer');
    const icon = svgUse(c.status.icon, '16', '0 0 32 32');
    icon.setAttribute('class', c.status.indicator);
    const by = value === 'off' ? label : [c.row?.source === 'driver' ? `${label} by the driver` : c.row?.source === 'samsara' ? `${label} by Samsara` : `${label}, set by dispatch`,
      setAt((value === 'confirmed' && c.row?.acceptedAt) || (value === 'declined' && c.row?.declinedAt) || c.row?.updatedAt)].filter(Boolean).join(' · ');
    answer.append(icon, el('span', 'scheduler-tip__words', by));
    tip.appendChild(answer);
    const leg = legKeyOfVehicle(trip, found.assign);
    const changed = value === 'declined' ? [] : window.SchedulerDriverJob?.changesSince(trip, leg, c.driverId, c.row,
      { busesById: board.busesById, driversById: board.driversById, nameOf: requirementLabel }) ?? [];
    if (changed.length) lamp('warning', `Changed since they said yes: ${changed.join('; ')}`);
    for (const x of board.standing(trip, leg)) {
      if (String(x.assignmentId) === String(found.assign.id) && String(x.driverId) === driverId) lamp('error', x.what);
    }
    restEitherSide();
    const call = callLink();
    if (call) {
      const foot = footer();
      foot.appendChild(call);
      tip.appendChild(foot);
    }
    return tip;
  }
  /* THE PARTNER'S TIP, for a bus a partner covers with its own coach and
     driver: who the partner is and whether it confirmed, and when; the
     coach and driver it gave, the driver's phone dialling; what the office
     pays it; and what stands in its way, a partner set Inactive or a paper
     it lacks. Its footer calls the partner. */
  function partnerTip(trip, bar, board) {
    const tip = el('div', 'scheduler-tip scheduler-tip--card');
    tip.dataset.tripId = trip.id;
    const found = board.seat(bar);
    const assign = found?.assign ?? null;
    const partner = assign?.partner_id != null ? board.partnersById?.get(assign.partner_id) ?? null : null;
    const head = el('div', 'scheduler-tip__head');
    const said = el('div', 'scheduler-tip__text');
    said.append(el('strong', 'scheduler-tip__name', partner?.name || 'Partner'), el('span', 'scheduler-tip__by', 'Partner, their coach and driver'));
    head.appendChild(said);
    tip.appendChild(head);
    if (!assign) {
      tip.appendChild(el('p', 'scheduler-tip__none', 'No partner covers this bus now.'));
      return tip;
    }
    const status = window.SchedulerLegFacts.DRIVER_STATUSES.find(s => s.value === (assign.partner_confirmed ? 'confirmed' : 'pending-response'));
    const answer = el('div', 'scheduler-tip__row scheduler-tip__answer');
    const icon = svgUse(status.icon, '16', '0 0 32 32');
    icon.setAttribute('class', status.indicator);
    answer.append(icon, el('span', 'scheduler-tip__words',
      assign.partner_confirmed ? ['Confirmed', setAt(assign.partner_confirmed_at)].filter(Boolean).join(' · ') : 'Not confirmed'));
    tip.appendChild(answer);
    // The coach and driver as the partner gave them, typed as they came.
    if (assign.partner_vehicle) tip.appendChild(el('div', 'scheduler-tip__row', `Coach: ${assign.partner_vehicle}`));
    // Their driver, one of the partner's own, the phone a press that calls.
    const driver = window.SchedulerLegFacts.partnerDriverOf(assign, partner);
    if (driver) {
      const row = el('div', 'scheduler-tip__row');
      row.append(`Driver: ${driver.name}`);
      if (driver.phone) {
        row.append(' · ');
        row.appendChild(footLink(showPhone(driver.phone), `tel:${dial(driver.phone)}`));
      }
      tip.appendChild(row);
    }
    tip.appendChild(el('div', 'scheduler-tip__row', assign.partner_price != null && assign.partner_price !== ''
      ? `Price: ${usd(Number(assign.partner_price))}` : 'No price entered'));
    for (const x of board.standing(trip, legKeyOfVehicle(trip, assign))) {
      if (String(x.assignmentId) !== String(assign.id)) continue;
      const row = el('div', 'scheduler-tip__row scheduler-tip__lamp scheduler-tip__lamp--error');
      row.append(svgUse('#i-warning--filled', '16', '0 0 32 32'), el('span', 'scheduler-tip__words', x.what));
      tip.appendChild(row);
    }
    if (partner?.phone) {
      const foot = footer();
      const call = footLink(`Call ${showPhone(partner.phone)}`, `tel:${dial(partner.phone)}`);
      call.setAttribute('aria-label', `Call ${partner.name}, ${showPhone(partner.phone)}`);
      foot.appendChild(call);
      tip.appendChild(foot);
    }
    return tip;
  }

  // A tip's footer, Carbon's toggletip actions, and a Carbon link in it.
  const footer = () => el('div', 'rux--toggletip-actions scheduler-tip__foot');
  function footLink(words, href) {
    const a = el('a', 'rux--link', words);
    a.href = href;
    return a;
  }

  const liveCard = (trip, bar, board) => liveOn(trip, board.road(bar), bar.dataset.busId, board);
  /* The live card from the bus's `{ bus, next, said }` and its id, which the
     Live map draws with no bar. `links`, the Live map's, stand in the map
     tile in place of its map and its Live map button, since there the page
     is the map. */
  function liveOn(trip, road, busId, board, { links = null } = {}) {
    const card = el('div', 'scheduler-card scheduler-card--live');
    card.dataset.tripId = trip.id;
    // Each part of the live card is a tile of its own.
    const tile = cls => el('div', `rux--tile scheduler-card__live-tile ${cls}`);
    if (!road?.bus) { card.appendChild(el('p', 'scheduler-card__row scheduler-card__live-none', 'Samsara has no reading for this bus now.')); return card; }
    const { bus, next, said } = road;
    // Each warning in a band of its colour: its mark, its name and why.
    for (const w of said.warnings) {
      const band = tile(`scheduler-card__live-warn scheduler-card__live-warn--${w.tone}`);
      band.append(svgUse(w.tone === 'error' ? '#m-report-fill' : '#m-warning-fill', '16', '0 0 16 16'),
        el('strong', 'scheduler-card__live-warn-name', w.title), el('span', 'scheduler-card__live-why', w.sentence));
      card.appendChild(band);
    }
    /* The map of the leg, where the bus is and when Samsara last heard from
       it, then where to see more of it. */
    const mapRow = tile('scheduler-card__live-map');
    const holder = el('div', 'scheduler-card__live-map-box');
    const extra = links;
    const buttons = el('div', 'scheduler-card__live-links');
    const link = (words, href, away) => {
      const a = el('a', 'rux--btn rux--btn--secondary rux--btn--sm rux--layout--size-sm scheduler-card__live-link', words);
      a.href = href;
      if (away) { a.target = '_blank'; a.rel = 'noopener'; }
      return a;
    };
    // Two secondary buttons sharing the tile's width, outlined in this app's own theme.
    for (const l of extra ?? []) buttons.appendChild(link(l.words, l.href, l.away));
    if (bus.lat != null && bus.lng != null) buttons.appendChild(link('Google Maps', `https://www.google.com/maps/search/?api=1&query=${bus.lat},${bus.lng}`, true));
    if (!extra) buttons.appendChild(link('Live map', `live.html?bus=${encodeURIComponent(busId)}`, false));
    const foot = el('div', 'scheduler-card__live-foot');
    foot.append(el('span', 'scheduler-card__live-place', bus.place || (bus.lat != null ? 'Place unknown' : 'No position')),
      el('span', 'scheduler-card__live-seen', bus.seen ? `Seen ${roadAgo(bus.seen)} ago` : 'Not seen'));
    mapRow.append(...(extra ? [] : [holder]), foot, buttons);
    card.appendChild(mapRow);
    if (!extra) mapInto(holder, busId, bus, next, hueFor(trip), board);
    /* The stops still to come, each a dot, its name and the time it is due,
       the next with a green dot and when the bus gets there and how late. */
    const toCome = next ? next.stops.filter((st, i) => i > next.where.reached || (next.at && i === next.where.reached)) : [];
    if (toCome.length) {
      const part = tile('scheduler-card__road');
      part.appendChild(cardTitle('Stops'));
      const list = el('ul', 'scheduler-card__road-list');
      for (const st of toCome) {
        const isNext = st === next.stop;
        const item = el('li', `scheduler-card__road-stop${isNext ? ' scheduler-card__road-stop--next' : ''}`);
        item.append(el('span', 'scheduler-card__road-dot'), el('span', 'scheduler-card__road-name', st.name || 'Stop'));
        const when = el('span', 'scheduler-card__road-words');
        if (isNext && next.at) when.textContent = 'Here now';
        else {
          const words = [st.due != null ? `Due ${hhmm(Road.clockOf(st.due), true)}` : null,
            isNext && next.arrival != null ? `arrives ${hhmm(Road.clockOf(next.arrival), true)}` : null,
            isNext && next.late ? `${next.late} min late` : null].filter(Boolean).join(' · ');
          when.textContent = words || 'No time';
          if (isNext && next.late) when.classList.add('scheduler-card__road-words--late');
        }
        item.appendChild(when);
        list.appendChild(item);
      }
      part.appendChild(list);
      card.appendChild(part);
    }
    // Each driver in the bus, the one at the wheel first, with their three clocks.
    if (bus.drivers.length) {
      const part = tile('scheduler-card__road');
      part.appendChild(cardTitle('Drivers'));
      const list = el('ul', 'scheduler-card__road-list');
      for (const d of [...bus.drivers].sort((a, b) => b.wheel - a.wheel)) {
        const item = el('li', 'scheduler-card__live-driver');
        const who = el('div', `scheduler-card__road-driver${d.wheel ? ' scheduler-card__road-driver--wheel' : ''}`);
        who.append(roadMark(d.duty ?? 'unknown'), el('span', 'scheduler-card__road-name', d.name),
          el('span', 'scheduler-card__road-words', [(ROAD_DUTY[d.duty] ?? ROAD_DUTY.unknown).word, d.wheel ? 'at the wheel' : null].filter(Boolean).join(' · ')));
        /* The three clocks side by side, each its name and the hours left
           over a meter of them, amber when low. */
        const clocks = el('div', 'scheduler-card__live-clocks');
        for (const [name, field, most] of LIVE_CLOCKS) {
          const ms = d[field];
          if (ms == null) continue;
          const low = ms < ROAD_LOW;
          const clock = el('div', `scheduler-card__live-clock${low ? ' scheduler-card__live-clock--low' : ''}`);
          clock.title = `${name}: ${roadHours(ms)} left`;
          const top = el('span', 'scheduler-card__live-clock-top');
          top.append(el('span', 'scheduler-card__live-clock-name', name), el('span', 'scheduler-card__live-left', roadHours(ms)));
          const meter = el('span', 'scheduler-card__live-meter');
          meter.style.setProperty('--scheduler-left', `${Math.round(Math.min(1, ms / most) * 100)}%`);
          clock.append(top, meter);
          clocks.appendChild(clock);
        }
        item.appendChild(who);
        // Elapsed rest is separate from Samsara's remaining clocks.
        const rest = roadRest(d);
        if (['sleeper', 'off'].includes(d.duty)) {
          const progress = el('div', 'scheduler-card__rest-progress');
          progress.append(el('span', 'scheduler-card__live-rest', rest ? `${rest} / 8h reference` : 'Continuous rest unknown'),
            RoadBar.restMeter(d), el('span', 'scheduler-card__road-words', 'Rest progress is separate from HOS availability.'));
          item.appendChild(progress);
        }
        if (clocks.children.length) item.appendChild(clocks);
        list.appendChild(item);
      }
      part.appendChild(list);
      card.appendChild(part);
    }
    // An engine lamp that is on, with what each of its codes says.
    if (bus.fault) {
      const part = tile('scheduler-card__road');
      const lamps = el('ul', 'scheduler-card__road-list');
      const item = el('li', `scheduler-card__road-lamp scheduler-card__road-lamp--${bus.fault}`);
      item.append(el('span', 'scheduler-card__road-name', bus.fault === 'stop' ? 'Engine stop lamp on' : 'Engine warning lamp on'));
      for (const words of bus.faults ?? []) item.appendChild(el('span', 'scheduler-card__road-fault', words));
      lamps.appendChild(item);
      part.appendChild(lamps);
      card.appendChild(part);
    }
    return card;
  }

  /* A warning is a press that goes where it is put right: an editor tab,
     the Forms panel, or the itinerary slot's own upload. */
  const WARN_GO = { fleet: 'Buses', billing: 'Billing', details: 'Details', forms: 'Forms', itinerary: 'Itinerary', contacts: 'Contacts', route: 'Route' };

  /* THE POST-TRIP ENTRY, first in a trip's Updates once it is back, which
     the bar's close-out button opens: close-out.js's report in a few lines,
     worked out at every draw and never stored, so it says what is true now
     and is not an update, which would restart a follow-up's wait. When the
     buses were back at the yard by Samsara, against the planned return, and
     when the first left; the money, Paid in green, the PO and the invoice;
     and each thing close-out still asks, in the words the Billing tab uses,
     as a press that goes where it is put right, as an alert does. */
  function postTripOf(trip) {
    const report = window.SchedulerCloseOut.report(trip);
    if (!report) return null;
    const { WORDS, GO } = window.SchedulerCloseOut;
    const lines = [];
    if (report.back != null) {
      const diff = report.plannedBack != null ? Math.round((report.back - report.plannedBack) / 60e3) : null;
      const by = diff == null ? '' : diff === 0 ? ', on time' : `, ${minutes(Math.abs(diff))} ${diff < 0 ? 'early' : 'late'}`;
      const some = report.timed < report.buses ? ` · ${report.timed} of ${report.buses} buses` : '';
      lines.push(`Back at the yard ${setAt(report.back)}${by}${some}`);
    }
    if (report.out != null) lines.push(`Out ${setAt(report.out)}`);
    const paid = report.paid ? (report.paidOn ? `Paid ${dayWords(report.paidOn)}` : 'Paid') : null;
    const filed = [report.po ? `PO ${report.po}` : null, report.invoice ? `Invoice ${report.invoice}` : null].filter(Boolean);
    const from = [report.back != null || report.out != null ? 'Samsara' : null, 'Billing'].filter(Boolean).join(' and ');
    const asks = report.asks.map(a => ({ id: a, go: GO[a], words: a === 'balance' ? `${WORDS.balance} ${usd(report.owed)}` : WORDS[a] }));
    return { lines, paid, filed, by: `After the trip · ${from}`, asks };
  }
  /* The entry drawn: its lines as words, Paid among the filed ones in its
     green, under the line that names where it is from, then a press for each
     thing still to close, drawn by `pressOf` as the surface draws its own. */
  function postTripRows(post, cls, pressOf) {
    const block = el('div', `${cls}__row ${cls}__post`);
    for (const line of post.lines) block.appendChild(el('span', `${cls}__words`, line));
    if (post.paid || post.filed.length) {
      const money = el('span', `${cls}__words`);
      if (post.paid) money.appendChild(el('span', `${cls}__paid`, post.paid));
      money.append([post.paid ? '' : null, ...post.filed].filter(s => s != null).join(' · '));
      block.appendChild(money);
    }
    block.appendChild(el('span', `${cls}__by`, post.by));
    return [block, ...post.asks.map(pressOf)];
  }

  /* An alert's words, or a close-out ask's: a Carbon link to where it is
     put right, the board's own click taking it there, or plain words where
     nothing puts it right. */
  function goLink(words, go, spot) {
    if (!WARN_GO[go]) return el('span', 'scheduler-tip__words', words);
    const link = el('a', 'rux--link scheduler-tip__words', words);
    link.href = '#';
    link.dataset.go = go;
    if (spot) link.dataset.spot = spot;
    link.setAttribute('aria-label', `${words}: open ${WARN_GO[go]}`);
    return link;
  }

  /* THE TRIP'S TIPS. Floating, Alerts, Close-out and Updates are each
     Carbon's toggletip: a heading naming its one subject with its count
     beside it, then its body, each thing 16px from the next. An alert is its
     icon and its words, the words a Carbon link to where it is put right; a
     reminder of a trip leaving soon says when at its end. Close-out, opened
     from a trip that is back, is the post-trip entry and then each thing
     close-out still asks, a link as an alert's words are. Updates is led by
     the trip's other needs, the paperwork the bar marks nothing for, so a
     press anywhere on a bar shows what the trip still needs. An update
     is its words over who wrote it and how long ago, with a pencil at its
     end that opens it in its place to change or delete. The footer acts:
     Show all and Add update, which opens a box in its place, where Save or
     Enter adds what it holds. */
  function cardTip(trip, bar, section, board) {
    const tip = el('div', 'scheduler-tip scheduler-tip--card');
    tip.dataset.tripId = trip.id;
    const head = (name, count) => {
      const h = el('div', 'scheduler-tip__head');
      const said = el('span', 'scheduler-tip__name', name);
      if (count) said.appendChild(el('span', 'scheduler-tip__count', String(count)));
      h.appendChild(said);
      return h;
    };
    // Carbon's small button, its word alone.
    const small = (cls, words, act) => {
      const b = el('button', `rux--btn ${cls} rux--btn--sm rux--layout--size-sm`, words);
      b.type = 'button';
      b.dataset.editAct = act;
      return b;
    };
    if (section === 'needs') {
      const facts = bar ? board.facts(bar) : null;
      const problems = facts?.problems ?? [];
      const other = alertsOf(trip, facts).filter(a => !problems.some(p => p.words === a.words && p.go === a.go));
      // A bus out's warnings lead, live-trip.js's, as the badge counts them, each in its sentence.
      const live = bar?.dataset.road ? board.road(bar)?.said?.warnings ?? [] : [];
      const raised = live.length + problems.length;
      tip.appendChild(head(raised || !other.length ? 'Alerts' : 'Other needs', raised || other.length));
      if (!raised && !other.length) tip.appendChild(el('p', 'scheduler-tip__none', 'No alerts.'));
      for (const w of live) {
        const row = el('div', `scheduler-tip__alert scheduler-tip__lamp scheduler-tip__lamp--${w.tone}`);
        row.append(svgUse(w.tone === 'error' ? '#i-warning--filled' : '#i-warning--alt--filled', '16', '0 0 32 32'),
          el('span', 'scheduler-tip__words', `${w.title}: ${w.sentence}`));
        tip.appendChild(row);
      }
      let reminded = false;
      for (const a of [...problems, ...other]) {
        const need = other.includes(a);
        const tone = a.row === 'scheduler-card__error' ? 'error' : 'warning';
        const row = el('div', need ? 'scheduler-tip__alert scheduler-tip__need'
          : `scheduler-tip__alert scheduler-tip__lamp scheduler-tip__lamp--${tone}`);
        row.append(svgUse(tone === 'error' ? '#i-warning--filled' : need ? '#i-circle-dash' : '#i-warning--alt--filled', '16', '0 0 32 32'),
          goLink(a.words, a.go, a.spot));
        /* A driver kept apart from one on the trip ends in Allow, which asks
           first, as Assign anyway does, and allows the pair on this trip. */
        if (a.allow != null) {
          const allow = footLink('Allow', '#');
          allow.classList.add('scheduler-tip__end');
          allow.dataset.allowApart = String(a.allow);
          allow.setAttribute('aria-label', `Allow on this trip: ${a.words}`);
          row.appendChild(allow);
        }
        if (a.row === 'scheduler-card__asks' && !reminded) {
          reminded = true;
          if (dueFollowUp(trip)) {
            const days = daysToGo(trip);
            row.appendChild(el('span', 'scheduler-tip__when', days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`));
          }
        }
        tip.appendChild(row);
      }
      return tip;
    }
    if (section === 'close') {
      const post = postTripOf(trip);
      tip.appendChild(head('Close-out', post?.asks.length));
      if (!post) {
        tip.appendChild(el('p', 'scheduler-tip__none', 'The trip is not back yet.'));
        return tip;
      }
      tip.append(...postTripRows(post, 'scheduler-tip', a => {
        const row = el('div', 'scheduler-tip__alert scheduler-tip__close');
        row.append(svgUse('#i-incomplete', '16', '0 0 32 32'), goLink(a.words, a.go, a.id));
        return row;
      }));
      return tip;
    }
    const all = updatesOf(trip);
    const { opened, editing, quick } = board.editor(trip);
    tip.classList.add('scheduler-tip--updates');
    const facts = bar ? board.facts(bar) : null;
    const needs = alertsOf(trip, facts).filter(a => !(facts?.problems ?? []).some(p => p.words === a.words && p.go === a.go));
    if (needs.length) {
      tip.appendChild(head('Other needs', needs.length));
      for (const a of needs) {
        const row = el('div', 'scheduler-tip__alert scheduler-tip__need');
        row.append(svgUse('#i-circle-dash', '16', '0 0 32 32'), goLink(a.words, a.go, a.spot));
        tip.appendChild(row);
      }
    }
    tip.appendChild(head('Updates', all.length));
    if (!all.length) tip.appendChild(el('p', 'scheduler-tip__none', 'No updates yet.'));
    const by = u => [u.actor_name || (u.kind === 'imported' ? 'From the old notes' : 'Someone'), ageShort(u.created_at),
      u.edited_at ? 'edited' : null].filter(Boolean).join(' · ');
    const item = u => {
      const li = el('li', 'scheduler-tip__update');
      li.dataset.updateId = u.id;
      // An update opened to change: its box, or before a delete its words and the question.
      if (editing?.id === u.id) {
        li.dataset.editing = '';
        const edit = el('div', 'scheduler-tip__edit');
        edit.dataset.updateEdit = '';
        const acts = el('div', 'scheduler-tip__acts');
        if (editing.mode === 'delete') {
          edit.appendChild(el('span', 'scheduler-tip__words', u.body));
          acts.append(el('span', 'scheduler-tip__ask', 'Delete this update?'),
            small('rux--btn--ghost', 'Cancel', 'cancel'), small('rux--btn--danger', 'Delete', 'delete'));
        } else {
          const box = el('textarea', 'rux--text-area');
          box.rows = 2;
          box.value = editing.draft ?? u.body;
          box.setAttribute('aria-label', 'Update');
          const wrap = el('div', 'rux--text-area__wrapper');
          wrap.appendChild(box);
          edit.appendChild(wrap);
          const keep = small('rux--btn--primary', 'Save', 'save');
          keep.disabled = !box.value.trim() || box.value.trim() === u.body;
          acts.append(small('rux--btn--danger--ghost', 'Delete', 'ask-delete'), small('rux--btn--ghost', 'Cancel', 'cancel'), keep);
        }
        edit.appendChild(acts);
        li.appendChild(edit);
        return li;
      }
      /* Its words over who wrote it and how long ago, the full stamp on the
         time, and at its end the pencil that opens it to change or delete. */
      const said = el('div', 'scheduler-tip__text');
      const when = el('time', 'scheduler-tip__by', by(u));
      when.dateTime = u.created_at;
      when.title = updateStamp(u);
      said.append(el('span', 'scheduler-tip__words', u.body), when);
      li.append(said, pencil(u));
      return li;
    };
    /* The newest five, and the rest behind Show all, so a trip with many
       updates keeps a tip that reads at a glance; the docked card's own
       switch, the editor's `opened`, opens them, so the two show the same. */
    const every = opened || all.length <= 5;
    if (all.length) {
      const list = el('ol', 'scheduler-tip__list');
      list.setAttribute('aria-label', 'Updates, newest first');
      list.append(...(every ? all : all.slice(0, 5)).map(item));
      tip.appendChild(list);
    }
    /* THE FOOTER, Carbon's toggletip actions: Show all as a link at its
       start where there are more than five, Show less once they all show,
       and Add update, a small primary
       button, at its end. Add update puts Carbon's small field in the
       footer's place, with Cancel and Save, Save primary once there are
       words to save. */
    const foot = el('div', quick != null ? 'scheduler-tip__foot scheduler-tip__box' : 'rux--toggletip-actions scheduler-tip__foot');
    if (quick != null) {
      const field = el('div', 'rux--text-input__field-wrapper rux--layout--size-sm');
      field.dataset.quick = '';
      const input = el('input', 'rux--text-input');
      input.type = 'text';
      input.placeholder = 'Add an update…';
      input.setAttribute('aria-label', 'Add an update');
      input.dataset.tripId = trip.id;
      input.value = quick;
      field.appendChild(input);
      const button = (act, words, label) => {
        const b = el('button', 'rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm', words);
        b.type = 'button';
        b.dataset.cardAction = act;
        b.setAttribute('aria-label', label);
        return b;
      };
      const save = button('save', 'Save', 'Save the update');
      markSave(save, !!quick.trim());
      const acts = el('div', 'scheduler-tip__acts');
      acts.append(button('cancel', 'Cancel', 'Cancel the update'), save);
      foot.append(field, acts);
    } else {
      if (all.length > 5) {
        const more = el('a', 'rux--link scheduler-tip__more', every ? 'Show less' : `Show all ${all.length}`);
        more.href = '#';
        more.dataset.editAct = 'show-all';
        foot.appendChild(more);
      }
      const add = el('button', 'rux--btn rux--btn--primary rux--btn--sm rux--layout--size-sm scheduler-tip__add', 'Add update');
      add.type = 'button';
      add.dataset.cardAction = 'update';
      foot.appendChild(add);
    }
    tip.appendChild(foot);
    return tip;
  }

  /* AN UPDATE'S PENCIL: Carbon's small ghost icon-only button, its tooltip
     Edit update, as Carbon's icon button carries one. Design's popover.js
     shows the tooltip; the board's own click opens the update. */
  function pencil(u) {
    const wrap = el('span', 'rux--tooltip rux--icon-tooltip rux--popover-container rux--popover--left '
      + 'rux--popover--caret rux--popover--high-contrast scheduler-tip__pencil');
    const trigger = el('div', 'rux--tooltip-trigger__wrapper');
    const btn = el('button', 'rux--btn rux--btn--ghost rux--btn--icon-only rux--layout--size-sm');
    btn.type = 'button';
    btn.dataset.updateOpen = '';
    btn.setAttribute('aria-label', `Edit update: ${u.body}`);
    btn.appendChild(svgUse('#i-edit', '16', '0 0 32 32'));
    trigger.appendChild(btn);
    const pop = el('span', 'rux--popover');
    pop.append(el('span', 'rux--popover-content rux--tooltip-content', 'Edit update'), el('span', 'rux--popover-caret'));
    wrap.append(trigger, pop);
    return wrap;
  }

  /* A FLOATING TIP IN CARBON'S TOGGLETIP. `CONTAINER` is the container's
     classes, open, which the board puts on the element it lays over the icon
     pressed and a placement class beside them; `surface(tip)` makes the tip
     Carbon's toggletip content inside its popover content, nested as Carbon
     renders them, and hands back the popover holding that and its caret,
     which goes inside the container. */
  const CONTAINER = 'rux--popover-container rux--popover--caret rux--popover--high-contrast rux--popover--drop-shadow '
    + 'rux--toggletip rux--popover--open scheduler-trip-tip';
  function surface(tip) {
    tip.classList.add('rux--toggletip-content');
    const content = el('span', 'rux--popover-content');
    content.appendChild(tip);
    const pop = el('span', 'rux--popover');
    pop.append(content, el('span', 'rux--popover-caret'));
    return pop;
  }

  /* A DRIVER'S CARD, from their tile in the driver rail: the bar's driver
     tip with nothing about one trip. Its head is the tip's, their face, their
     name and under it their priority and Part-time; then their time off
     where they are on it today; what they are doing
     now and which bus Samsara has them in, their three clocks and their
     rest; each of their marks' words in its tone; their phone, language and
     papers; their next trip in view; and in its footer Call, Send trips and
     Open driver, links. `info` is what data.js holds of them: `{ driver,
     live, bus, marks, off, next }`, `live` their entry in samsara-now's
     drivers or null, `bus` the number of the bus it has them in, `marks`
     driver-head.js's, `off` its words for time off under way or null, and
     `next` their next trip's words or null. */
  function driverCard({ driver, live, bus, marks = [], tells = [], off = null, next = null }, board) {
    const tip = el('div', 'rux--toggletip-content scheduler-tip scheduler-tip--driver');
    tip.dataset.driverId = driver.id;
    const name = driver.name || driver.short_name || 'Unnamed driver';
    const head = el('div', 'scheduler-tip__head');
    const said = el('div', 'scheduler-tip__text');
    said.append(el('strong', 'scheduler-tip__name', name), el('span', 'scheduler-tip__by',
      [driver.priority == null ? 'No priority' : `Priority ${driver.priority}`, driver.employment_type === 'part-time' ? 'Part-time' : null].filter(Boolean).join(' · ')));
    head.append(faceOf(name, driver.photo_path, board), said);
    tip.appendChild(head);
    if (off) tip.appendChild(el('div', 'scheduler-tip__row', off));
    tip.appendChild(el('div', 'scheduler-tip__row scheduler-tip__now', live?.duty
      ? [(ROAD_DUTY[live.duty] ?? ROAD_DUTY.unknown).word, bus ? `in ${bus}` : null, live.wheel ? 'at the wheel' : null].filter(Boolean).join(' · ')
      : 'No hours-of-service clock from Samsara'));
    if (live) {
      const clocks = clocksOf(live);
      if (clocks) tip.appendChild(clocks);
      const rest = restRowOf(live);
      if (rest) tip.appendChild(rest);
    }
    const lamp = (tone, words) => {
      const row = el('div', `scheduler-tip__row scheduler-tip__lamp scheduler-tip__lamp--${tone}`);
      row.append(svgUse(tone === 'error' ? '#i-warning--filled' : '#i-warning--alt--filled', '16', '0 0 32 32'), el('span', 'scheduler-tip__words', words));
      tip.appendChild(row);
      return row;
    };
    /* A change to tell is a row a leg, each with Tell at its end, which
       opens the leg on the board and presses the Contact list's Tell for the
       driver's seat, asking first as it does; the other marks are words. */
    for (const m of marks) {
      if (m.kind !== 'tell' || !tells.length) { lamp(m.tone, m.words); continue; }
      for (const t of tells) {
        const tell = footLink('Tell', t.href);
        tell.classList.add('scheduler-tip__end');
        tell.dataset.tellLeg = '';
        tell.setAttribute('aria-label', `Tell ${name} of the change to ${t.words}`);
        lamp('warning', `Tell of a change: ${t.words}`).appendChild(tell);
      }
    }
    const day = v => (v ? new Date(`${String(v).slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null);
    /* Their facts stand in two groups, each tight as the bus tip's lines
       are and 16px from the next: how to reach them, then their papers. */
    const group = lines => {
      const said = lines.filter(Boolean);
      if (!said.length) return;
      const row = el('div', 'scheduler-tip__row');
      row.append(...said.map(words => el('div', null, words)));
      tip.appendChild(row);
    };
    group([driver.phone ? showPhone(driver.phone) : null, driver.language ? `Speaks ${({ en: 'English', es: 'Spanish' })[driver.language] ?? driver.language}` : null]);
    group([driver.license_exp ? `Licence to ${day(driver.license_exp)}` : null, driver.med_card_expiry ? `Medical card to ${day(driver.med_card_expiry)}` : null]);
    if (next) tip.appendChild(el('div', 'scheduler-tip__row scheduler-tip__next', `Next: ${next}`));
    const foot = footer();
    if (driver.phone) {
      const call = footLink('Call', `tel:${dial(driver.phone)}`);
      call.setAttribute('aria-label', `Call ${name}, ${showPhone(driver.phone)}`);
      foot.appendChild(call);
    }
    for (const [words, href] of [['Send trips', `drivers.html?id=${encodeURIComponent(driver.id)}#send`], ['Open driver', `drivers.html?id=${encodeURIComponent(driver.id)}`]]) {
      const a = footLink(words, href);
      a.target = '_blank';
      a.rel = 'noopener';
      foot.appendChild(a);
    }
    tip.appendChild(foot);
    return tip;
  }

  window.SchedulerTripTips = {
    route: routeTip, driver: driverTip, driverCard, partner: partnerTip, live: liveCard, liveOn, card: cardTip, CONTAINER, surface,
    updateFace, ageShort, cardTitle, postTripOf, postTripRows, markSave, WARN_GO,
  };
})();
