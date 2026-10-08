/* ==========================================================================
   departures-panel.js — DEPARTURES, IN THE TO-DO PANEL
   --------------------------------------------------------------------------
   The To do list's first line opens this in the same header panel: every
   leg leaving on a day, tomorrow first, a tab each, and under the tabs one
   leg's page as departures.js gives it: a tile for the trip, then a tile for
   each bus with its crew. A back button returns to the list.

   It only shows status. Every line is a mark, what it is, then when it was
   done and whose face did it, or the word for doing it, which is a link to
   the place it is done: the Forms page on that driver's form, the trip's
   Contact list, or its Billing tab. Nothing is ticked here.

   The day's trips are read fresh when the panel opens, when the day changes
   and when a step, a seat or a trip changes, on the `scheduler-departures`
   channel. Tomorrow's count, how many legs leave and how many are ready, is
   kept for the To do list's line and said in `scheduler:departures-summary`.

   Needs billing.js, follow-up.js, checklist.js, requirements.js,
   leg-facts.js, to-do.js and departures.js loaded first, and /account.js.
   ========================================================================== */
(() => {
  'use strict';

  const account = window.Rux?.account;
  const client = account?.client;
  const Departures = window.SchedulerDepartures;
  const Facts = window.SchedulerLegFacts;
  const panel = document.getElementById('scheduler-to-do-panel');
  if (!client || !Departures || !Facts || !panel) return;

  // -- small things ---------------------------------------------------------
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const svgUse = (href, size = 16) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    for (const [k, v] of [['width', size], ['height', size], ['viewBox', '0 0 32 32'], ['fill', 'currentColor'], ['aria-hidden', 'true']]) svg.setAttribute(k, v);
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', href);
    svg.appendChild(use);
    return svg;
  };
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parseISO = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
  const dayFrom = (n, from = new Date()) => { const d = new Date(from); d.setDate(d.getDate() + n); return iso(d); };
  const longDay = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
  // "7:08a", the board's short clock, from a time of day or a moment.
  const clock = (h, m) => `${h % 12 || 12}:${String(m).padStart(2, '0')}${h < 12 ? 'a' : 'p'}`;
  const clockOf = t => { const [h, m] = String(t).split(':').map(Number); return Number.isFinite(h) && Number.isFinite(m) ? clock(h, m) : ''; };
  // When a step was done: "Wed 8:15a", or "Today 8:15a".
  const whenWords = at => {
    const d = new Date(at);
    if (Number.isNaN(d.getTime())) return '';
    return `${iso(d) === iso(new Date()) ? 'Today' : weekday.format(d)} ${clock(d.getHours(), d.getMinutes())}`;
  };
  const dayWords = day => `${day === dayFrom(1) ? 'Tomorrow · ' : day === dayFrom(0) ? 'Today · ' : ''}${longDay.format(parseISO(day))}`;
  const unwrap = r => { if (r.error) throw new Error(r.error.message); return r.data ?? []; };
  const placeName = dest => String(dest || '').replace(/,?\s+TX\s*$/i, '') || 'Trip';

  // -- what is known --------------------------------------------------------
  let day = dayFrom(1);
  let pages = [];           // the day's legs, as departures.js's pages
  let buses = new Map();    // id -> bus, with its number
  let staff = new Map();    // profile id -> profile, for a step's face
  let picked = null;        // the open tab's key, `tripId:leg`
  let failure = '';
  let shown = false;
  let tomorrow = { legs: 0, ready: 0, known: false };

  // -- reading --------------------------------------------------------------
  const STEPS = ['envelope_printed', 'trip_reminder_sent', 'itinerary_printed', 'hos_form_printed'];
  const COLUMNS = ['id', 'trip_ref', 'destination', 'customer', 'start_date', 'end_date', 'return_start_date', 'return_end_date',
    'trip_type', 'confirmed', 'trip_bar_color', 'cancelled_at', 'created_at', 'bus_count', 'return_bus_count', 'po_ref',
    // The money, as follow-up.js reads it, for what the customer still owes.
    'quoted_price', 'contract_status', 'po_received', 'po_amount', 'deposit_amount', 'date_paid', 'balance_paid',
    'trip_payments(amount,date)', 'trip_pos(amount)', 'trip_updates(created_at,kind)',
    'itinerary_not_needed', 'contact_not_needed', 'trip_documents(label,created_at)',
    'trip_reqs', 'req_sleeper', 'req_ada', 'req_56pax', 'need_hotel', 'need_fuel_card', 'vehicle_type',
    'hotel_booked_outbound', 'hotel_booked_return', 'hotel_itinerary_number_outbound', 'hotel_itinerary_number_return',
    'booking_contact_name', 'contacts:booking_contact_id(id,name,phone,email)',
    ...[1, 2, 3, 4, 5].flatMap(n => [`trip_contact_${n}_name`, `c${n}:trip_contact_${n}_id(id,name,phone)`]),
    'trip_prep(driver_info_sent,driver_info_sent_at,driver_info_sent_by)',
    `trip_assignments(id,bus_id,position,leg,active_roles,needs,vehicle_type,fuel_card_number,trip_drivers(id,driver_id,role,${STEPS.flatMap(s => [s, `${s}_at`, `${s}_by`]).join(',')}))`,
    'trip_stops(position,leg,arrive,spot,depart_prev)'].join(',');

  // The buses, the drivers, the office's lists and the staff, read once a page.
  let basics = null;
  const readBasics = () => (basics ??= (async () => {
    const [busRows, driverRows, settings, profiles] = await Promise.all([
      client.from('buses').select('id,number,capacity,type,ada_lift,sleeper,equipment').then(unwrap),
      client.from('drivers').select('id,name,short_name,employment_type').then(unwrap),
      client.from('settings').select('key,value').in('key', ['requirements-v1', 'follow-up-v1', 'billing-workflow-v1']).then(unwrap),
      client.from('profiles').select('id,display_name,photo_path,avatar_color').then(unwrap),
    ]);
    const setting = new Map(settings.map(s => [s.key, s.value]));
    Facts.setRequirementList(setting.get('requirements-v1'));
    window.SchedulerFollowUp.set(setting.get('follow-up-v1'));
    window.SchedulerBilling.setWorkflow(setting.get('billing-workflow-v1'));
    buses = new Map(busRows.map(b => [b.id, b]));
    staff = new Map(profiles.map(p => [p.id, p]));
    return { busesById: buses, driversById: new Map(driverRows.map(d => [d.id, d])) };
  })().catch(e => { basics = null; throw e; }));

  // One day's legs as pages, soonest first.
  async function readDay(which) {
    const read = await readBasics();
    const trips = await client.from('trips').select(COLUMNS).is('cancelled_at', null)
      .or(`start_date.eq.${which},return_start_date.eq.${which},end_date.eq.${which}`).order('start_date').then(unwrap);
    const legs = Departures.legsOn(trips, which);
    const ids = [...new Set(legs.map(l => l.trip.id))];
    const statusRows = ids.length ? await client.rpc('get_trip_driver_statuses', { p_trip_ids: ids }).then(unwrap) : [];
    const statuses = new Map(statusRows.map(r => [Facts.statusKey(r.tripId, r.driverId, r.leg, r.role), r]));
    return legs.map(l => Departures.page(l.trip, l.leg, { ...read, statuses }))
      .sort((a, b) => String(leavesAt(a) || '99').localeCompare(String(leavesAt(b) || '99')));
  }

  // When a leg's bus is spotted, or else its first time, as "HH:MM".
  function leavesAt(page) {
    const stops = (page.trip.trip_stops || []).filter(s => (s.leg || 'outbound') === page.leg)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    for (const s of stops) for (const t of [s.spot, s.arrive, s.depart_prev]) if (t) return String(t).slice(0, 5);
    return null;
  }

  let loading = null;
  let again = false;
  async function load() {
    if (loading) { again = true; return loading; }
    loading = (async () => {
      try {
        pages = await readDay(day);
        failure = '';
      } catch (e) {
        failure = `Departures did not load. ${e?.message || e}`;
      }
      if (day === dayFrom(1)) said({ legs: pages.length, ready: pages.filter(p => p.left === 0).length });
      draw();
    })();
    await loading;
    loading = null;
    if (again) { again = false; return load(); }
  }
  // Tomorrow's count alone, for the To do list's line while this view is shut or on another day.
  async function count() {
    try {
      const rows = await readDay(dayFrom(1));
      said({ legs: rows.length, ready: rows.filter(p => p.left === 0).length });
    } catch { /* the line keeps what it last said */ }
  }
  function said(now) {
    tomorrow = { ...now, known: true };
    document.dispatchEvent(new CustomEvent('scheduler:departures-summary'));
  }
  let soon = null;
  const refresh = () => {
    clearTimeout(soon);
    soon = setTimeout(() => { if (shown) load(); if (!shown || day !== dayFrom(1)) count(); }, 1500);
  };

  // -- the frame ------------------------------------------------------------
  const ghost = (href, label) => {
    const b = el('button', 'rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm rux--btn--icon-only');
    b.type = 'button';
    b.setAttribute('aria-label', label);
    b.title = label;
    b.appendChild(svgUse(href));
    return b;
  };
  const body = el('div', 'rux--layer-two rux--stack-vertical rux--stack-scale-5 scheduler-departures');
  body.hidden = true;
  const head = el('div', 'scheduler-departures__head');
  const back = el('button', 'rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm scheduler-departures__back');
  back.type = 'button';
  back.append(svgUse('#m-arrow_back'), el('span', null, 'To do'));
  const title = el('h2', 'scheduler-to-do__title', 'Departures');
  title.id = 'scheduler-departures-title';
  const stepper = el('div', 'scheduler-departures__stepper');
  const before = ghost('#m-arrow_back', 'The day before');
  const after = ghost('#m-arrow_forward', 'The day after');
  const dayButton = el('button', 'rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm scheduler-departures__date');
  dayButton.type = 'button';
  // The browser's own calendar, opened from the day; it takes no room of its own.
  const dayInput = el('input', 'scheduler-departures__picker');
  dayInput.type = 'date';
  dayInput.tabIndex = -1;
  dayInput.setAttribute('aria-hidden', 'true');
  stepper.append(before, dayButton, dayInput, after);
  const tabsWrap = el('div', 'rux--tabs rux--layout--size-md scheduler-departures__tabs');
  const tabList = el('div', 'rux--tab--list');
  tabList.setAttribute('role', 'tablist');
  tabList.setAttribute('aria-label', 'Trips leaving');
  tabsWrap.appendChild(tabList);
  const error = el('p', 'scheduler-to-do__error');
  error.setAttribute('role', 'alert');
  const pageEl = el('div', 'scheduler-departures__page');
  pageEl.setAttribute('role', 'tabpanel');
  pageEl.id = 'scheduler-departures-page';
  head.append(title, stepper);
  body.append(back, head, tabsWrap, error, pageEl);
  panel.appendChild(body);

  // -- drawing --------------------------------------------------------------
  const MARKS = { done: '#m-check_circle-fill', todo: '#m-close', warn: '#m-warning-fill' };
  const SAID = { done: 'Done', todo: 'To do', warn: 'Needs attention' };
  const keyOf = page => `${page.trip.id}:${page.leg}`;
  const tripHref = (page, extra = '') => `./?trip=${encodeURIComponent(page.trip.id)}&date=${encodeURIComponent(page.day || '')}${extra}`;
  const FORMS = { itinerary: 'driver-itinerary&layout=simple', envelope: 'envelope', hos: 'hours-of-service' };
  // Where a line still to do is done, and the word for doing it.
  function actionOf(line, page, bus, member) {
    const [where, form] = String(line.action || '').split(':');
    if (where === 'forms' && bus && member?.seat) {
      return { words: 'Print', href: `print.html?form=${FORMS[form]}&assignment=${encodeURIComponent(bus.assign.id)}&driver=${encodeURIComponent(member.seat.id)}` };
    }
    if (where === 'contacts') return { words: line.key === 'reminder' ? 'Remind' : 'Send', href: tripHref(page, '&open=contacts') };
    if (where === 'billing') return { words: 'Open', href: tripHref(page, '&tab=billing') };
    return null;
  }

  function lineRow(line, page, bus, member) {
    const row = el('li', `scheduler-departures__line scheduler-departures__line--${line.state}`);
    const mark = svgUse(MARKS[line.state], 18);
    mark.classList.add('scheduler-departures__mark');
    const label = el('span', 'scheduler-departures__what', line.label);
    label.prepend(el('span', 'rux--visually-hidden', `${SAID[line.state]}: `));
    row.append(mark, label);
    const act = line.state === 'todo' ? actionOf(line, page, bus, member) : null;
    if (act) {
      const a = el('a', 'rux--link', act.words);
      a.href = act.href;
      a.setAttribute('aria-label', `${act.words}: ${line.label}${member?.name ? `, ${member.name}` : ''}`);
      row.appendChild(a);
      return row;
    }
    const right = [line.value, line.state === 'done' && line.at ? whenWords(line.at) : null].filter(Boolean).join(' · ');
    if (right) row.appendChild(el('span', 'scheduler-departures__when', right));
    const who = line.state === 'done' ? staff.get(line.by) : null;
    if (who) {
      const f = el('span', 'rux--user-avatar rux--user-avatar--sm scheduler-departures__face');
      account.drawAvatar?.(f, { id: who.id, name: who.display_name, photoPath: who.photo_path, colour: who.avatar_color }, 'sm');
      f.title = who.display_name || '';
      f.setAttribute('role', 'img');
      f.setAttribute('aria-label', `by ${who.display_name || 'someone'}`);
      row.appendChild(f);
    }
    return row;
  }
  const lines = (list, page, bus, member) => {
    const ul = el('ul', 'scheduler-departures__lines');
    ul.setAttribute('role', 'list');
    for (const l of list) ul.appendChild(lineRow(l, page, bus, member));
    return ul;
  };
  const tag = (words, kind) => {
    const t = el('span', `rux--tag ${kind} rux--tag--sm rux--layout--size-sm scheduler-departures__tag`);
    t.appendChild(el('span', 'rux--tag__label', words));
    return t;
  };
  const leftTag = n => (n ? tag(`${n} left`, 'rux--tag--gray') : tag('Ready', 'rux--tag--green'));

  function tripTile(page) {
    const tile = el('section', 'rux--tile scheduler-departures__tile');
    const top = el('div', 'scheduler-departures__top');
    const names = el('div', 'scheduler-departures__names');
    const place = el('a', 'rux--link scheduler-departures__place', page.trip.destination || 'Trip');
    place.href = tripHref(page);
    const at = leavesAt(page);
    names.append(place, el('p', 'scheduler-to-do__meta',
      [page.trip.customer, page.legName, at ? `leaves ${clockOf(at)}` : null].filter(Boolean).join(' · ')));
    top.append(names, leftTag(page.tripLeft));
    tile.append(top, lines(page.lines, page));
    return tile;
  }

  function busTile(page, bus) {
    const tile = el('section', 'rux--tile scheduler-departures__tile');
    const top = el('div', 'scheduler-departures__top');
    const name = el('div', 'scheduler-departures__bus');
    const icon = svgUse('#m-directions_bus-fill', 20);
    const row = bus.bus ? buses.get(bus.bus.id) ?? bus.bus : null;
    name.append(icon, el('strong', null, row ? String(row.number ?? 'Bus') : 'No bus yet'));
    // The first driver's seat, whose envelope a missing fuel card is typed on.
    const lead = bus.crew.find(m => m.seat && (m.seat.role || 'driver') === 'driver');
    for (const n of bus.needs) {
      const t = tag(n.label, n.met ? 'rux--tag--green' : 'rux--tag--red');
      t.prepend(svgUse(n.met ? '#m-check' : '#m-warning-fill'));
      t.setAttribute('aria-label', `${n.label}: ${n.met ? 'this bus has it' : 'this bus lacks it'}`);
      const act = !n.met && n.action ? actionOf({ action: n.action, key: n.id }, page, bus, lead) : null;
      if (act) {
        const a = el('a', 'scheduler-departures__need');
        a.href = act.href;
        a.setAttribute('aria-label', `${n.label}: type its number on ${lead.name}'s envelope`);
        a.appendChild(t);
        name.appendChild(a);
      } else name.appendChild(t);
    }
    top.append(name, leftTag(bus.left));
    tile.appendChild(top);
    for (const member of bus.crew) {
      const who = el('div', 'scheduler-departures__member');
      const headline = el('div', 'scheduler-departures__who');
      headline.append(el('strong', null, member.name || member.role));
      if (member.name) headline.appendChild(el('span', 'scheduler-departures__role', member.role));
      if (member.partTime) headline.appendChild(tag('Part-time', 'rux--tag--purple'));
      who.append(headline, lines(member.lines, page, bus, member));
      tile.appendChild(who);
    }
    return tile;
  }

  function draw() {
    dayButton.textContent = dayWords(day);
    dayInput.value = day;
    error.textContent = failure;
    error.hidden = !failure;
    if (!pages.some(p => keyOf(p) === picked)) picked = pages[0] ? keyOf(pages[0]) : null;

    tabList.replaceChildren(...pages.map(page => {
      const on = keyOf(page) === picked;
      const b = el('button', `rux--tabs__nav-item rux--tabs__nav-link${on ? ' rux--tabs__nav-item--selected' : ''}`);
      b.type = 'button';
      b.dataset.key = keyOf(page);
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(on));
      b.setAttribute('aria-controls', pageEl.id);
      b.tabIndex = on ? 0 : -1;
      const label = el('span', 'rux--tabs__nav-item-label scheduler-departures__tab');
      label.append(placeName(page.trip.destination));
      // Two trips to one place are told apart by when each leaves.
      const twin = pages.some(p => p !== page && placeName(p.trip.destination) === placeName(page.trip.destination));
      const at = twin ? leavesAt(page) : null;
      if (at) label.append(el('span', 'scheduler-departures__count', clockOf(at)));
      if (page.legName) label.append(el('span', 'scheduler-departures__count', page.legName));
      if (page.left) label.append(el('span', 'scheduler-departures__count', `${page.left} left`));
      else {
        const done = svgUse('#m-check_circle-fill');
        done.classList.add('scheduler-departures__ok');
        label.append(done, el('span', 'rux--visually-hidden', 'ready'));
      }
      const wrap = el('div', 'rux--tabs__nav-item-label-wrapper');
      wrap.appendChild(label);
      b.appendChild(wrap);
      return b;
    }));
    tabsWrap.hidden = !pages.length;

    const page = pages.find(p => keyOf(p) === picked);
    if (!page) {
      pageEl.replaceChildren(failure ? '' : el('p', 'scheduler-to-do__none', loading && !pages.length ? 'Loading…' : 'Nothing leaves that day.'));
      return;
    }
    const parts = [tripTile(page), ...page.buses.map(b => busTile(page, b))];
    if (page.missing) {
      const none = el('section', 'rux--tile scheduler-departures__tile');
      const top = el('div', 'scheduler-departures__top');
      const name = el('div', 'scheduler-departures__bus');
      name.append(svgUse('#m-directions_bus-fill', 20),
        el('strong', null, page.missing === 1 ? 'One more bus needed' : `${page.missing} more buses needed`));
      top.append(name, tag(`${page.missing} left`, 'rux--tag--gray'));
      none.appendChild(top);
      parts.push(none);
    }
    pageEl.replaceChildren(...parts);
  }

  // -- behaviour ------------------------------------------------------------
  const todoBody = () => panel.querySelector('.scheduler-to-do__body');
  function open() {
    shown = true;
    day = dayFrom(1);
    picked = null;
    const list = todoBody();
    if (list) list.hidden = true;
    body.hidden = false;
    panel.classList.add('scheduler-to-do--departures');
    panel.setAttribute('aria-labelledby', title.id);
    draw();
    load();
    back.focus();
  }
  function close() {
    shown = false;
    body.hidden = true;
    panel.classList.remove('scheduler-to-do--departures');
    const list = todoBody();
    if (list) list.hidden = false;
    panel.setAttribute('aria-labelledby', 'scheduler-to-do-title');
  }
  const go = to => { day = to; picked = null; pages = []; draw(); load(); };
  back.addEventListener('click', () => { close(); panel.querySelector('.scheduler-to-do__departures')?.focus(); });
  before.addEventListener('click', () => go(dayFrom(-1, parseISO(day))));
  after.addEventListener('click', () => go(dayFrom(1, parseISO(day))));
  dayButton.addEventListener('click', () => { try { dayInput.showPicker(); } catch { dayInput.focus(); } });
  dayInput.addEventListener('change', () => { if (/^\d{4}-\d{2}-\d{2}$/.test(dayInput.value)) go(dayInput.value); });
  tabList.addEventListener('click', e => {
    const tab = e.target.closest('[role="tab"]');
    if (!tab) return;
    picked = tab.dataset.key;
    draw();
    tabList.querySelector('[aria-selected="true"]')?.focus();
  });
  // Left and right move along the tabs, as Design's tabs do.
  tabList.addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const at = pages.findIndex(p => keyOf(p) === picked);
    const next = pages[(at + (e.key === 'ArrowRight' ? 1 : -1) + pages.length) % pages.length];
    if (!next) return;
    e.preventDefault();
    picked = keyOf(next);
    draw();
    const tab = tabList.querySelector('[aria-selected="true"]');
    tab?.focus();
    tab?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });
  // Shutting the header panel puts the list back, so the action opens on the list.
  panel.addEventListener('rux:header-panel-closed', close);
  panel.addEventListener('rux:header-panel-opened', () => { if (!shown) count(); });

  let channel = null;
  function listen() {
    channel = client.channel('scheduler-departures');
    for (const table of ['trip_drivers', 'trip_prep', 'trip_assignments', 'trips', 'trip_documents', 'trip_stops', 'trip_payments']) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, refresh);
    }
    channel.subscribe();
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !channel) return;
    if (channel.state !== 'joined' && channel.state !== 'joining') { client.removeChannel(channel); listen(); }
    refresh();
  });

  (async () => {
    const me = await account.person().catch(() => null);
    if (!me?.staff) return;
    await count();
    listen();
  })();

  window.SchedulerDeparturesPanel = { open, summary: () => ({ ...tomorrow }) };
})();
