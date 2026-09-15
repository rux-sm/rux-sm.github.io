/* ==========================================================================
   share/maintenance.js — THE MAINTENANCE LINK
   --------------------------------------------------------------------------
   maintenance.html?s=<token> shows, without a log-in, which bus is out on
   which days over two weeks from this week's Monday in Chicago time, and the
   recent changes to those trips. get_maintenance_schedule and
   get_maintenance_schedule_changes check the token and return only what this
   page draws, so it keeps working once the database admits only staff.

   It redraws when the database broadcasts on maintenance-schedule-signal,
   when the window comes back into focus, and every 30 seconds for a broadcast
   that never arrived. A refresh that fails keeps the last schedule on screen
   and says when it was loaded.

   The grid and bars are the schedule's own (app.css), placed by data.js's
   rules: a leg clipped to the range with a dotted edge where it runs past,
   lanes packed greedily, and the colour `hueFor` picks. A local preview
   without ?cloud has no client, and says so.
   ========================================================================== */
(() => {
  'use strict';

  const DAYS = 14;
  const POLL_MS = 30000;
  const CHANNEL = 'maintenance-schedule-signal';

  const $ = id => document.getElementById(id);
  const weekEl = $('scheduler-week');
  const gridEl = $('scheduler-grid');
  const rangeEl = $('scheduler-share-range');
  const changesEl = $('scheduler-share-changes');
  const changesList = $('scheduler-share-changes-list');
  const changeRows = $('scheduler-share-changes-rows');
  const changesNote = $('scheduler-share-changes-empty');

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  // -- the notice -------------------------------------------------------------
  // Every class is written out in full: check-classes reads the source and
  // cannot see through an interpolation.
  const NOTE = {
    info: { cls: 'rux--inline-notification rux--inline-notification--info', icon: '#i-information--filled' },
    warning: { cls: 'rux--inline-notification rux--inline-notification--warning', icon: '#i-warning--filled' },
    error: { cls: 'rux--inline-notification rux--inline-notification--error', icon: '#i-error--filled' },
  };
  const say = (kind, title, text) => {
    $('scheduler-share-notice').hidden = !kind;
    if (!kind) return;
    $('scheduler-share-notice-box').className = NOTE[kind].cls;
    $('scheduler-share-notice-icon').setAttribute('href', NOTE[kind].icon);
    $('scheduler-share-notice-title').textContent = title;
    $('scheduler-share-notice-text').textContent = text;
  };

  // -- dates and times, all local ----------------------------------------------
  const DAY = 864e5;
  const isDate = s => /^\d{4}-\d{2}-\d{2}/.test(String(s ?? ''));
  const parseISO = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  // Rounded, because a span across a daylight-saving change is 23 or 25 hours.
  const daysBetween = (a, b) => Math.round((b - a) / DAY);
  const isWeekend = d => d.getDay() === 0 || d.getDay() === 6;
  const clock = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
  const stamp = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const rangeFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const formatRange = (a, b) => (typeof rangeFormat.formatRange === 'function'
    ? rangeFormat.formatRange(a, b)
    : `${rangeFormat.format(a)} – ${rangeFormat.format(b)}`);

  // Twelve-hour and compact, "7:50a", as the board writes a bar's times.
  const hhmm = t => {
    if (!t) return '';
    const [h, m] = String(t).split(':');
    const hr = Number(h);
    if (!Number.isFinite(hr) || m === undefined) return String(t).slice(0, 5);
    return `${hr % 12 || 12}:${m}${hr < 12 ? 'a' : 'p'}`;
  };

  // -- placing -----------------------------------------------------------------
  /* The board's colours, as data.js's `hueFor` picks them: the trip's chosen
     colour, with rux-ui's retired names mapped, or else red for an unconfirmed
     trip and blue for the rest. `confirmed` is the function's own reading,
     which also counts a signed contract, a covering PO, a deposit or a payment,
     as rux-ui's maintenance page does. */
  const HUE_CLASS = {
    teal: 'scheduler-bar--teal', green: 'scheduler-bar--green', purple: 'scheduler-bar--purple',
    amber: 'scheduler-bar--amber', pink: 'scheduler-bar--magenta',
    orange: 'scheduler-bar--amber', yellow: 'scheduler-bar--amber', cyan: 'scheduler-bar--teal',
  };
  const hueClass = trip => HUE_CLASS[String(trip.tripBarColor || '').toLowerCase()]
    ?? (trip.confirmed === false ? 'scheduler-bar--red' : 'scheduler-bar--blue');

  /* A leg's days and yard times. An assignment on the return leg takes the
     trip's return dates; the times are that leg's first pickup's departure and
     its last return stop's arrival, or else the trip's own departure and return
     times, as rux-ui's maintenance page reads them. */
  const legOf = (trip, leg) => {
    const ret = leg === 'return';
    const from = (ret && trip.returnStartDate) || trip.startDate;
    const to = (ret && (trip.returnEndDate || trip.returnStartDate)) || trip.endDate || from;
    const stops = (trip.stops || [])
      .filter(s => (s.leg || 'outbound') === leg)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const pickup = stops.find(s => s.type === 'pickup');
    const back = [...stops].reverse().find(s => s.type === 'return');
    return { from, to, depart: pickup?.departPrev || trip.departureTime, back: back?.arrive || trip.returnTime };
  };

  const clip = (from, to, start, end) => {
    if (!isDate(from)) return null;
    const a = parseISO(from);
    const b = isDate(to) && parseISO(to) >= a ? parseISO(to) : a;
    if (b < start || a > end) return null;
    const vs = a < start ? start : a;
    const ve = b > end ? end : b;
    return { start: daysBetween(start, vs), span: daysBetween(vs, ve) + 1, fromPrev: a < start, toNext: b > end };
  };

  // Greedy lane packing, as data.js does it: sorted by start, each bar takes
  // the first lane whose last day ends before it begins.
  const assignLanes = bars => {
    const lastEnd = [];
    bars.sort((x, y) => x.place.start - y.place.start || x.place.span - y.place.span);
    for (const bar of bars) {
      let lane = 0;
      while (lastEnd[lane] !== undefined && lastEnd[lane] >= bar.place.start) lane++;
      bar.lane = lane;
      lastEnd[lane] = bar.place.start + bar.place.span - 1;
    }
    return lastEnd.length || 1;
  };

  // -- drawing -----------------------------------------------------------------
  const barEl = ({ trip, leg, info, place, lane }) => {
    const bar = el('article', `scheduler-bar ${hueClass(trip)}`);
    if (place.fromPrev) bar.classList.add('scheduler-bar--from-prev');
    if (place.toNext) bar.classList.add('scheduler-bar--to-next');
    bar.style.setProperty('--scheduler-start', place.start);
    bar.style.setProperty('--scheduler-span', place.span);
    bar.style.setProperty('--scheduler-lane', lane);

    const dest = trip.destination || 'No destination';
    const destRow = el('div', 'scheduler-bar__row scheduler-bar__dest');
    destRow.append(el('span', null, dest));
    if (leg === 'return') destRow.append(el('span', 'scheduler-bar__ref', 'Return'));

    // Only the times these two weeks hold: a leg that began before them has no
    // departure on screen, and one that runs past them no return. A trip with
    // no yard time recorded at all says so, rather than leaving a blank row.
    const dep = place.fromPrev ? '' : hhmm(info.depart);
    const back = place.toNext ? '' : hhmm(info.back);
    const unset = !info.depart && !info.back;
    const timeRow = el('div', 'scheduler-bar__row scheduler-bar__time');
    timeRow.append(el('span', null, dep && back ? `${dep} – ${back}` : dep ? `Dep ${dep}` : back ? `Ret ${back}` : unset ? 'No times yet' : ''));
    bar.append(destRow, timeRow);

    const label = [
      dest, trip.customer, leg === 'return' ? 'return leg' : null,
      dep ? `leaves the yard ${dep}` : null, back ? `back ${back}` : null,
      place.fromPrev ? 'began before these two weeks' : null,
      place.toNext ? 'runs past these two weeks' : null,
      trip.confirmed === false ? 'unconfirmed' : null,
    ].filter(Boolean).join(', ');
    bar.setAttribute('aria-label', label);
    bar.title = label;
    return bar;
  };

  let drawn = false;
  const render = data => {
    const start = parseISO(data.rangeStart);
    const end = addDays(start, DAYS - 1);
    rangeEl.textContent = formatRange(start, end);

    // Every bus in the fleet, in the fleet's order, then any bus a trip uses
    // that the fleet list lacks, so no assigned trip goes missing.
    const rows = new Map();
    for (const bus of data.buses || []) {
      if (bus?.number == null || !String(bus.number).trim()) continue;
      rows.set(String(bus.id), { number: String(bus.number), bars: [] });
    }
    for (const trip of data.trips || []) {
      for (const a of trip.assignments || []) {
        if (a.busNumber == null) continue;
        const leg = a.leg || 'outbound';
        const info = legOf(trip, leg);
        const place = clip(info.from, info.to, start, end);
        if (!place) continue;
        const key = a.busId != null ? String(a.busId) : `number:${a.busNumber}`;
        if (!rows.has(key)) rows.set(key, { number: String(a.busNumber), bars: [] });
        rows.get(key).bars.push({ trip, leg, info, place });
      }
    }

    const scroll = { left: weekEl.scrollLeft, top: weekEl.scrollTop };
    gridEl.replaceChildren();
    const corner = el('div', 'scheduler-corner', '#');
    corner.title = 'Bus number';
    gridEl.append(corner);

    const today = iso(new Date());
    let todayCell = null;
    for (let i = 0; i < DAYS; i++) {
      const d = addDays(start, i);
      const cell = el('div', 'scheduler-day');
      if (isWeekend(d)) cell.classList.add('scheduler-day--weekend');
      if (iso(d) === today) {
        cell.classList.add('scheduler-day--today');
        cell.setAttribute('aria-current', 'date');
        todayCell = cell;
      }
      cell.append(document.createTextNode(d.toLocaleDateString(undefined, { weekday: 'short' })), el('span', 'scheduler-day__num', String(d.getDate())));
      gridEl.append(cell);
    }

    // A rule at each inner day boundary, drawn by app.css as the track's
    // background from these stops, as data.js writes them for seven days.
    const stops = [];
    let prev = '0';
    for (let i = 1; i < DAYS; i++) {
      const at = `${(i * 100) / DAYS}%`;
      stops.push(`transparent ${prev} calc(${at} - 1px)`, `var(--scheduler-day-rule) calc(${at} - 1px) ${at}`);
      prev = at;
    }
    stops.push(`transparent ${prev} 100%`);
    const dayRules = stops.join(', ');

    for (const row of rows.values()) {
      const lanes = row.bars.length ? assignLanes(row.bars) : 1;
      const rowEl = el('div', 'scheduler-row');
      const head = el('div', 'scheduler-row-head');
      head.title = `Bus ${row.number}`;
      head.append(el('div', 'scheduler-row-head__num', row.number));
      const track = el('div', 'scheduler-track');
      track.style.setProperty('--scheduler-lanes', lanes);
      track.style.setProperty('--scheduler-day-rules', dayRules);
      for (const bar of row.bars) track.append(barEl(bar));
      rowEl.append(head, track);
      gridEl.append(rowEl);
    }

    weekEl.hidden = false;
    if (drawn) {
      weekEl.scrollLeft = scroll.left;
      weekEl.scrollTop = scroll.top;
    } else if (todayCell) {
      // The first draw brings today's column into view, clear of the sticky
      // bus column, as the board does.
      const sticky = corner.offsetWidth;
      const right = todayCell.offsetLeft + todayCell.offsetWidth;
      if (right > weekEl.clientWidth) weekEl.scrollLeft = right - weekEl.clientWidth;
      else if (todayCell.offsetLeft < sticky) weekEl.scrollLeft = 0;
    }
    drawn = true;
  };

  // -- recent changes ------------------------------------------------------------
  /* Every change names the same things in the same columns: what happened,
     the trip, its dates and the bus. The history records a bus only for a bus
     change, as "Bus 133" before and after. An added trip shows the buses it is
     on now, read from the schedule on this page and marked "now", because a
     later move is a row of its own; a removed trip's bus was never recorded. */
  const shortDates = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
  const tripDates = row => {
    if (!isDate(row.tripStartDate)) return '';
    const a = parseISO(row.tripStartDate);
    const b = isDate(row.tripEndDate) ? parseISO(row.tripEndDate) : a;
    if (b <= a) return shortDates.format(a);
    return typeof shortDates.formatRange === 'function'
      ? shortDates.formatRange(a, b)
      : `${shortDates.format(a)} – ${shortDates.format(b)}`;
  };
  // A bus name never breaks inside itself, so a narrow column wraps only
  // between buses: "Bus 133 →" over "Bus 506".
  const keep = s => String(s).replace(/ /g, ' ');
  const describe = (row, tripsById) => {
    if (row.action === 'created') {
      // "Bus 506", as the history writes a bus; a vehicle named rather than
      // numbered, such as the van, keeps its name alone.
      const buses = [...new Set((tripsById.get(String(row.tripId))?.assignments || [])
        .filter(a => a.busNumber != null)
        .map(a => keep(/^\d/.test(String(a.busNumber)) ? `Bus ${a.busNumber}` : String(a.busNumber))))];
      return { change: 'Trip added', bus: buses.length ? `${buses.join(', ')} now` : 'No bus yet' };
    }
    if (row.action === 'deleted') return { change: 'Trip removed', bus: 'Not recorded' };
    const bus = (row.changes || []).find(c => c.field === 'bus');
    if (bus?.before && bus?.after) return { change: 'Bus changed', bus: `${keep(bus.before)} → ${keep(bus.after)}` };
    if (bus?.after) return { change: 'Bus assigned', bus: keep(bus.after) };
    if (bus?.before) return { change: 'Bus unassigned', bus: `${keep(bus.before)} → none` };
    return { change: 'Trip changed', bus: '' };
  };

  /* A change belongs to these two weeks when its trip is on them, by id, or
     when its trip's days overlap them. Never by trip reference: two trips can
     share one, and a change printed under the wrong trip would leave the
     office on this page. */
  const changesFor = (rows, data) => {
    const start = parseISO(data.rangeStart);
    const end = addDays(start, DAYS - 1);
    const shown = new Set((data.trips || []).map(t => String(t.id)));
    return (rows || []).filter(row => {
      if (row.tripId && shown.has(String(row.tripId))) return true;
      if (!isDate(row.tripStartDate)) return false;
      const a = parseISO(row.tripStartDate);
      const b = isDate(row.tripEndDate) ? parseISO(row.tripEndDate) : a;
      return a <= end && b >= start;
    });
  };

  const renderChanges = (result, data) => {
    changesEl.hidden = false;
    changeRows.replaceChildren();
    if (result.error) {
      changesList.hidden = true;
      changesNote.textContent = "Recent changes can't be loaded right now.";
      changesNote.hidden = false;
      return;
    }
    const rows = changesFor(result.data?.changes, data);
    const tripsById = new Map((data.trips || []).map(t => [String(t.id), t]));
    // Short cells stay on one line; the bus and the trip's name may wrap, so
    // on a phone the first columns fit before the list scrolls sideways.
    const NOWRAP = 'rux--structured-list-td rux--structured-list-content--nowrap';
    const cell = (text, cls = NOWRAP) => {
      const td = el('div', cls, text);
      td.setAttribute('role', 'cell');
      return td;
    };
    for (const row of rows) {
      const tr = el('div', 'rux--structured-list-row');
      tr.setAttribute('role', 'row');
      const when = new Date(row.createdAt);
      const { change, bus } = describe(row, tripsById);
      // In the order the maintenance crew reads a change: when, which bus,
      // what happened, the days that bus is out, then the trip and who did it.
      tr.append(
        cell(Number.isNaN(when.getTime()) ? '' : stamp.format(when)),
        cell(bus, 'rux--structured-list-td'),
        cell(change),
        cell(tripDates(row)),
        cell(row.destination || row.tripRef || 'Unnamed trip', 'rux--structured-list-td'),
        cell(String(row.actorName || '').trim() || 'Dispatcher'),
      );
      changeRows.append(tr);
    }
    changesList.hidden = !rows.length;
    changesNote.textContent = 'No changes to these two weeks.';
    changesNote.hidden = rows.length > 0;
  };

  // -- loading -------------------------------------------------------------------
  const token = (new URLSearchParams(location.search).get('s') ?? '').trim().toLowerCase();
  const client = window.Rux?.account?.client;
  if (!token) {
    rangeEl.textContent = '';
    say('error', 'This link has no schedule in it', 'Ask dispatch for the current maintenance link.');
    return;
  }
  if (!client) {
    rangeEl.textContent = '';
    say('info', 'This preview has no connection', 'Add ?cloud to the address to load the schedule.');
    return;
  }

  let loadedAt = null;
  const load = async () => {
    const [schedule, changes] = await Promise.all([
      client.rpc('get_maintenance_schedule', { p_token: token }),
      client.rpc('get_maintenance_schedule_changes', { p_token: token }),
    ]);
    if (schedule.error) throw schedule.error;
    if (!schedule.data) {
      // A revoked or unknown token. Checking again costs nothing, so the
      // page keeps checking, and a restored link shows its schedule.
      weekEl.hidden = true;
      changesEl.hidden = true;
      rangeEl.textContent = '';
      say('error', 'This link is no longer active', 'Ask dispatch for the current maintenance link.');
      return;
    }
    render(schedule.data);
    renderChanges(changes, schedule.data);
    loadedAt = new Date();
    say(null);
  };
  const failed = () => {
    if (loadedAt) say('warning', "The schedule didn't refresh", `Showing it as of ${clock.format(loadedAt)}. It tries again every 30 seconds.`);
    else {
      rangeEl.textContent = '';
      say('error', "The schedule can't be loaded right now", 'Check your connection. It tries again every 30 seconds.');
    }
  };

  // One load at a time; an ask while one runs gets one more after it.
  let running = null;
  let again = false;
  let timer = 0;
  const refresh = () => {
    if (running) { again = true; return; }
    running = load().catch(failed).finally(() => {
      running = null;
      if (again) { again = false; refresh(); }
    });
  };
  const soon = () => { clearTimeout(timer); timer = setTimeout(refresh, 300); };

  const channel = client.channel(CHANNEL).on('broadcast', { event: 'changed' }, soon).subscribe();
  addEventListener('focus', soon);
  setInterval(soon, POLL_MS);
  addEventListener('pagehide', () => { clearTimeout(timer); client.removeChannel(channel); }, { once: true });
  refresh();
})();
