/* ==========================================================================
   to-do-list.js — THE TO-DO LIST IN THE HEADER
   --------------------------------------------------------------------------
   Every Scheduler page carries the To do action and its panel; this fills
   them. The list is three kinds of row in one:

     Computed  worked out here from the trips by to-do.js, never stored. It
               is never done by hand: it asks while it is true and opens its
               trip.
     Written   a `to_dos` row a person typed.
     Agent     a `to_dos` row a Claude session added through the connector,
               made by Ruxbot.

   A stored row is an item of Design's accordion. Closed, it is three lines of
   one size: a tag for its kind, who it is about in bold ahead of its words,
   and a quiet line of its trip, its detail's first line and its due day. A
   press opens it to those in full, the rest of its detail and who added it,
   over one row of buttons: Done, Email and Trip, and a menu of Edit and
   Delete. One row is open at a time.

   Rows are grouped Overdue, Today, This week, Later and No date, then Done:
   a row closed today, struck through, with Undo. A computed row is in Today
   while it is true. Mine is the rows that are mine or nobody's, and every
   computed row; Everyone is all of them. The count on the action is the
   Overdue and Today rows under Mine. The list's first line is Departures:
   how many of tomorrow's legs are ready, and the way into
   departures-panel.js's view of them.

   The page reads the trips the rules need itself, because only the board
   holds them otherwise: every live trip for the follow-ups, and the buses,
   seats, stops and contacts of the ones leaving within 30 days. A change to a
   row, or to a trip, arrives on the `scheduler-to-do` channel and redraws.

   Needs billing.js, follow-up.js, checklist.js, requirements.js, leg-facts.js
   and to-do.js loaded first, /account.js for the client, and Design's
   accordion.js and menu.js, which open a row and its menu.
   ========================================================================== */
(() => {
  'use strict';

  const account = window.Rux?.account;
  const client = account?.client;
  const ToDo = window.SchedulerToDo;
  const Facts = window.SchedulerLegFacts;
  const action = document.getElementById('scheduler-to-do-action');
  const panel = document.getElementById('scheduler-to-do-panel');
  if (!client || !ToDo || !Facts || !action || !panel) return;

  const VIEW_KEY = 'scheduler-to-do-view';
  const GROUPS = ['Overdue', 'Today', 'This week', 'Later', 'No date'];
  const MENU_ID = 'scheduler-to-do-menu';
  /* The kinds of work a row can be: each one's words on its tag and the tag's
     colour. A row with no kind reads To do, and a kind not listed here reads
     as its own word, both in the outline tag. The connector's `TO_DO_KINDS`
     repeats the names. */
  const KINDS = new Map([
    ['quote', ['New quote', 'rux--tag--blue']],
    ['itinerary', ['Itinerary', 'rux--tag--purple']],
    ['po', ['PO', 'rux--tag--green']],
    ['change', ['Change', 'rux--tag--magenta']],
    ['respond', ['Respond', 'rux--tag--teal']],
    ['form', ['Form', 'rux--tag--cyan']],
    ['invoice', ['Invoice', 'rux--tag--gray']],
  ]);
  const kindOf = row => KINDS.get(row.kind)
    ?? [row.kind ? row.kind.charAt(0).toUpperCase() + row.kind.slice(1).replaceAll('-', ' ') : 'To do', 'rux--tag--outline'];
  // The tables a computed row is read from; a change to one reads the trips again.
  const TRIP_TABLES = ['trips', 'trip_assignments', 'trip_drivers', 'trip_stops', 'trip_updates', 'trip_documents', 'trip_payments', 'trip_pos'];

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
  const dayFrom = n => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
  // The Sunday that ends this week, as the board's weeks run Monday to Sunday.
  const weekEnd = () => { const d = new Date(); d.setDate(d.getDate() + ((7 - d.getDay()) % 7)); return iso(d); };
  const shortDay = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  // "today", "tomorrow", else "Sat, Oct 17".
  const dayWords = day => (day === iso(new Date()) ? 'today' : day === dayFrom(1) ? 'tomorrow' : shortDay.format(parseISO(day)));
  const unwrap = r => { if (r.error) throw new Error(r.error.message); return r.data ?? []; };
  // A row about one leg names it, so the board opens that leg's bar.
  const tripHref = (trip, day, leg) => `./?trip=${encodeURIComponent(trip.id)}&date=${encodeURIComponent(day || trip.start_date || '')}${leg ? `&leg=${leg}` : ''}`;
  /* The dot between the parts of a line, tied to the word before it, so a line
     that wraps breaks after the dot and never starts with one. */
  const DOT = '\u00A0· ';
  const tripWords = trip => [trip.destination, trip.customer].filter(Boolean).join(DOT) || trip.trip_ref || 'Trip';

  // -- what is known --------------------------------------------------------
  let me = null;            // my staff row, as /account.js gives it
  let staff = new Map();    // profile id -> profile, Ruxbot among them
  let stored = [];          // `to_dos`: every open row, and the ones closed today
  let computed = [];        // to-do.js's rows, unfolded
  let trips = new Map();    // id -> trip, for a stored row's trip and the Trip choice
  let editingId = null;     // the stored row whose form is open
  let openId = null;        // the stored row that is open, one at a time
  let failure = '';
  let mine = true;
  try { mine = localStorage.getItem(VIEW_KEY) !== 'everyone'; } catch { /* Mine */ }

  // -- reading --------------------------------------------------------------
  const LIGHT = ['id', 'trip_ref', 'destination', 'customer', 'start_date', 'end_date', 'return_start_date', 'return_end_date',
    'trip_type', 'confirmed', 'trip_bar_color', 'cancelled_at', 'created_at', 'bus_count', 'return_bus_count',
    // What the follow-up rules read: the money, the itinerary and the updates.
    'quoted_price', 'itinerary_not_needed', 'contract_status', 'po_received', 'po_ref', 'po_amount', 'deposit_amount',
    'date_paid', 'balance_paid', 'trip_payments(amount,date)', 'trip_pos(amount)', 'trip_documents(label)',
    'trip_updates(created_at,kind)'].join(',');
  // What the other three rules read, of the trips leaving soon enough to be asked.
  const HEAVY = ['id', 'contact_not_needed', 'trip_reqs', 'req_sleeper', 'req_ada', 'req_56pax', 'need_hotel', 'need_fuel_card', 'vehicle_type',
    ...[1, 2, 3, 4, 5].flatMap(n => [`trip_contact_${n}_name`, `c${n}:trip_contact_${n}_id(id,name,phone)`]),
    'trip_assignments(id,bus_id,leg,active_roles,needs,vehicle_type,trip_drivers(driver_id,role,envelope_printed))',
    'trip_stops(leg,arrive,spot,depart_prev)'].join(',');

  async function readStored() {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    stored = await client.from('to_dos').select('*')
      .or(`closed_at.is.null,closed_at.gte."${midnight.toISOString()}"`).order('created_at').then(unwrap);
  }

  async function readTrips() {
    const today = iso(new Date());
    const far = dayFrom(ToDo.SHORT_DAYS);
    const within = col => `and(${col}.gte.${today},${col}.lte.${far})`;
    const [light, heavy, buses, drivers, settings] = await Promise.all([
      // A trip that left a season ago can still owe a balance; older than that is History's.
      client.from('trips').select(LIGHT).is('cancelled_at', null).gte('start_date', dayFrom(-90)).order('start_date').limit(5000).then(unwrap),
      client.from('trips').select(HEAVY).is('cancelled_at', null)
        .or([within('start_date'), within('return_start_date'), within('end_date')].join(',')).then(unwrap),
      client.from('buses').select('id,capacity,type,ada_lift,sleeper,equipment').then(unwrap),
      client.from('drivers').select('id,employment_type').then(unwrap),
      client.from('settings').select('key,value').in('key', ['requirements-v1', 'follow-up-v1', 'billing-workflow-v1']).then(unwrap),
    ]);
    const setting = new Map(settings.map(s => [s.key, s.value]));
    Facts.setRequirementList(setting.get('requirements-v1'));
    window.SchedulerFollowUp.set(setting.get('follow-up-v1'));
    window.SchedulerBilling.setWorkflow(setting.get('billing-workflow-v1'));

    const more = new Map(heavy.map(t => [t.id, t]));
    const all = light.map(t => ({ ...t, ...more.get(t.id) }));
    const soon = all.filter(t => window.SchedulerChecklist.legsOf(t)
      .some(leg => { const d = ToDo.legDay(t, leg); return d && d >= today && d <= dayFrom(ToDo.SOON_DAYS); }));
    const statusRows = soon.length
      ? await client.rpc('get_trip_driver_statuses', { p_trip_ids: soon.map(t => t.id) }).then(unwrap) : [];
    const read = {
      busesById: new Map(buses.map(b => [b.id, b])),
      driversById: new Map(drivers.map(d => [d.id, d])),
      statuses: new Map(statusRows.map(r => [Facts.statusKey(r.tripId, r.driverId, r.leg, r.role), r])),
    };
    trips = new Map(all.map(t => [t.id, t]));
    computed = ToDo.rows(all, { factsOf: (t, leg) => Facts.factsOf(t, leg, read), contactOf: t => !!Facts.dayOfContact(t) });
    document.dispatchEvent(new CustomEvent('scheduler:to-do-rows'));
  }

  async function readStaff() {
    const rows = await client.from('profiles').select('id,user_id,display_name').then(unwrap);
    staff = new Map(rows.map(p => [p.id, p]));
  }

  /* One read at a time of each kind, and the newest asked for wins: a second
     ask while one is under way runs once more when it ends. */
  const once = read => {
    let running = null;
    let again = false;
    const run = async () => {
      if (running) { again = true; return running; }
      running = (async () => {
        try { await read(); failure = ''; } catch (e) { failure = `The list did not load. ${e?.message || e}`; }
        draw();
      })();
      await running;
      running = null;
      if (again) { again = false; return run(); }
    };
    return run;
  };
  const loadStored = once(readStored);
  const loadTrips = once(readTrips);
  let tripsTimer = null;
  const tripsSoon = () => { clearTimeout(tripsTimer); tripsTimer = setTimeout(loadTrips, 1500); };

  // -- writing --------------------------------------------------------------
  async function write(run) {
    try {
      const { error } = await run();
      if (error) throw new Error(error.message);
      failure = '';
    } catch (e) {
      failure = `That was not saved. ${e?.message || e}`;
    }
    await loadStored();
  }
  const add = body => write(() => client.from('to_dos').insert({ body, owner_id: me?.id ?? null, due_on: iso(new Date()) }));
  const tick = (row, done) => write(() => client.from('to_dos')
    .update({ closed_at: done ? new Date().toISOString() : null }).eq('id', row.id));
  const change = (row, fields) => write(() => client.from('to_dos').update(fields).eq('id', row.id));
  const remove = row => write(() => client.from('to_dos').delete().eq('id', row.id));

  // -- the list, as data ----------------------------------------------------
  const isMine = row => !row.owner_id || row.owner_id === me?.id;
  const groupOf = (row, today, sunday) => (!row.due_on ? 'No date' : row.due_on < today ? 'Overdue'
    : row.due_on === today ? 'Today' : row.due_on <= sunday ? 'This week' : 'Later');

  /* The open rows by group, for Mine or for everyone. Today holds the stored
     rows due today and every computed row: the ones with no trip first, then
     a trip at a time by the day it leaves, so the rows about one trip sit
     together, and the folded lines last. */
  function grouped(onlyMine) {
    const today = iso(new Date());
    const sunday = weekEnd();
    const out = new Map(GROUPS.map(g => [g, []]));
    for (const row of stored) {
      if (row.closed_at || (onlyMine && !isMine(row))) continue;
      out.get(groupOf(row, today, sunday)).push({ stored: row });
    }
    for (const g of GROUPS) {
      if (g !== 'Today') out.get(g).sort((a, b) => String(a.stored.due_on || '').localeCompare(String(b.stored.due_on || '')));
    }
    const lines = ToDo.fold(computed);
    const tripDay = id => trips.get(id)?.start_date || '9';
    const place = item => (item.computed?.fold ? [2, '', '', 0]
      : item.stored ? (item.stored.trip_id ? [1, tripDay(item.stored.trip_id), item.stored.trip_id, 0] : [0, '', '', 0])
        : [1, item.computed.day || tripDay(item.computed.trip.id), item.computed.trip.id, 1]);
    const todayRows = [...out.get('Today'), ...lines.map(c => ({ computed: c }))];
    const rank = new Map(todayRows.map((item, i) => [item, [...place(item), i]]));
    todayRows.sort((a, b) => {
      const x = rank.get(a), y = rank.get(b);
      return x[0] - y[0] || String(x[1]).localeCompare(String(y[1])) || String(x[2]).localeCompare(String(y[2])) || x[3] - y[3] || x[4] - y[4];
    });
    out.set('Today', todayRows);
    return out;
  }

  // -- drawing --------------------------------------------------------------
  // Dots between the parts of a row's quiet line.
  const meta = parts => {
    const p = el('p', 'scheduler-to-do__meta');
    parts.filter(Boolean).forEach((part, i) => { if (i) p.append(DOT); p.append(part); });
    return p.childNodes.length ? p : null;
  };
  /* A stored row's tag: its kind's words in its kind's colour. It is a div,
     as Carbon's tag is, because Design's outline tag is not drawn on a span. */
  const kindTag = row => {
    const [words, tone] = kindOf(row);
    const t = el('div', `rux--tag ${tone} rux--tag--sm rux--layout--size-sm scheduler-to-do__tag`);
    t.appendChild(el('span', 'rux--tag__label', words));
    return t;
  };
  // Whose a stored row is, then who added it and when, with the person a session added it for.
  const madeBy = row => {
    const owner = staff.get(row.owner_id)?.display_name;
    const maker = staff.get(row.created_by)?.display_name;
    const sessionOf = staff.get(row.session_of)?.display_name;
    return [owner && owner !== maker ? `For ${owner}` : null,
      maker ? `Added by ${maker}${sessionOf ? ` for ${sessionOf}` : ''}` : null,
      row.created_at ? shortDay.format(new Date(row.created_at)) : null].filter(Boolean).join(DOT);
  };

  function computedRow(c) {
    const li = el('li', 'scheduler-to-do__row scheduler-to-do__row--computed');
    const a = el('a', 'scheduler-to-do__open');
    const words = el('span', 'scheduler-to-do__words', String(c.what).replaceAll(' · ', DOT));
    if (c.fold) {
      a.href = `trips.html?show=${c.kind === 'follow-up' ? 'followup' : c.kind}`;
      a.append(svgUse('#m-arrow_forward'), words);
    } else {
      a.href = tripHref(c.trip, c.day, c.leg);
      if (c.kind !== 'follow-up' && c.detail) words.append(' ', el('span', 'scheduler-to-do__detail', c.detail));
      const mark = svgUse('#m-warning-fill');
      mark.classList.add('scheduler-to-do__mark');
      const leaves = c.day ? `${c.legName ? `${c.legName} leaves` : 'Leaves'} ${dayWords(c.day)}` : null;
      const body = el('span', 'scheduler-to-do__text');
      body.append(words, meta([tripWords(c.trip), leaves, c.kind === 'follow-up' && c.detail ? `updated ${c.detail}${c.detail === 'today' ? '' : ' ago'}` : null]) ?? '');
      a.append(mark, body);
    }
    li.appendChild(a);
    return li;
  }

  /* A stored row, as an item of Design's accordion, whose script opens and
     shuts it. The heading is the closed row and the whole of it is the press;
     the panel under it holds what a closed row has no room for, and the
     buttons. A button the row cannot use is disabled and never left out, so
     every open row has the same buttons in the same places. */
  function storedRow(row, done) {
    const open = row.id === openId;
    const li = el('li', `rux--accordion__item scheduler-to-do__item${done ? ' scheduler-to-do__item--done' : ''}${open ? ' rux--accordion__item--active' : ''}`);
    li.dataset.id = row.id;
    const trip = row.trip_id ? trips.get(row.trip_id) : null;
    const lines = String(row.detail || '').split('\n').map(s => s.trim()).filter(Boolean);
    const today = iso(new Date());
    const due = done ? null : row.due_on && row.due_on !== today ? `Due ${dayWords(row.due_on)}` : null;
    const added = madeBy(row);

    const heading = el('button', 'rux--accordion__heading');
    heading.type = 'button';
    heading.setAttribute('aria-expanded', String(open));
    const arrow = svgUse('#m-keyboard_arrow_right');
    arrow.classList.add('rux--accordion__arrow');
    const title = el('div', 'rux--accordion__title');
    const kind = el('div', 'scheduler-to-do__kind');
    kind.appendChild(kindTag(row));
    const what = el('span', 'scheduler-to-do__what scheduler-to-do__line');
    if (row.who) what.append(el('span', 'scheduler-to-do__who', row.who), DOT);
    what.append(row.body);
    // The quiet line is never empty, or the row would be a line short: with
    // no trip, detail or due day it says who added the row.
    const said = [trip ? tripWords(trip) : null, lines[0], due].filter(Boolean);
    const quiet = el('span', 'scheduler-to-do__meta scheduler-to-do__line', (said.length ? said : [added]).join(DOT));
    title.append(kind, what, quiet);
    heading.append(arrow, title);

    const wrapper = el('div', 'rux--accordion__wrapper');
    const more = el('div', 'rux--accordion__content scheduler-to-do__more');
    more.id = `scheduler-to-do-more-${row.id}`;
    heading.setAttribute('aria-controls', more.id);
    for (const line of lines.slice(1)) more.appendChild(el('p', 'scheduler-to-do__meta', line));
    const closed = done ? [staff.get(row.closed_by)?.display_name, row.closed_reason].filter(Boolean).join(': ') : '';
    if (closed) more.appendChild(el('p', 'scheduler-to-do__meta', closed));
    if (said.length && added) more.appendChild(el('p', 'scheduler-to-do__meta', added));

    const act = button('rux--btn--primary', done ? 'Undo' : 'Done');
    act.addEventListener('click', () => { act.disabled = true; openId = null; tick(row, !done); });
    const email = button('rux--btn--ghost', 'Email');
    email.disabled = !row.thread_url;
    email.addEventListener('click', () => window.open(row.thread_url, '_blank', 'noopener'));
    const toTrip = button('rux--btn--ghost', 'Trip');
    toTrip.disabled = !trip;
    toTrip.addEventListener('click', () => { location.href = tripHref(trip); });
    // Edit and Delete are the menu's; a row ticked today has only Undo to take back.
    const menuButton = el('button', 'rux--btn rux--btn--ghost rux--btn--icon-only rux--btn--sm rux--layout--size-sm rux--menu-button__trigger');
    menuButton.type = 'button';
    menuButton.disabled = !!done;
    menuButton.setAttribute('aria-label', 'More');
    menuButton.setAttribute('aria-haspopup', 'menu');
    menuButton.setAttribute('data-rux-open', MENU_ID);
    menuButton.appendChild(svgUse('#m-more_vert'));
    const bar = el('div', 'scheduler-to-do__buttons');
    bar.append(act, email, toTrip, el('span', 'scheduler-to-do__gap'), menuButton);
    more.appendChild(bar);
    wrapper.appendChild(more);
    li.append(heading, wrapper);
    return li;
  }

  let fieldSeq = 0;
  // One labelled field of the edit form, as Design's text input, text area and select are built.
  function field(labelText, control, select) {
    const id = `scheduler-to-do-f-${++fieldSeq}`;
    control.id = id;
    const label = el('label', 'rux--label', labelText);
    label.htmlFor = id;
    if (control.tagName === 'TEXTAREA') {
      const labelWrap = el('div', 'rux--text-area__label-wrapper');
      labelWrap.appendChild(label);
      const wrap = el('div', 'rux--text-area__wrapper');
      wrap.appendChild(control);
      const item = el('div', 'rux--form-item');
      item.append(labelWrap, wrap);
      return item;
    }
    if (select) {
      const wrap = el('div', 'rux--select rux--layout--size-sm');
      const inner = el('div', 'rux--select-input__wrapper');
      const arrow = svgUse('#m-keyboard_arrow_down');
      arrow.classList.add('rux--select__arrow');
      inner.append(control, arrow);
      wrap.append(label, inner);
      const item = el('div', 'rux--form-item');
      item.appendChild(wrap);
      return item;
    }
    const item = el('div', 'rux--form-item rux--text-input-wrapper');
    const labelWrap = el('div', 'rux--text-input__label-wrapper');
    labelWrap.appendChild(label);
    const outer = el('div', 'rux--text-input__field-outer-wrapper');
    const inner = el('div', 'rux--text-input__field-wrapper');
    inner.appendChild(control);
    outer.appendChild(inner);
    item.append(labelWrap, outer);
    return item;
  }
  const option = (value, text, picked) => {
    const o = el('option', 'rux--select-option', text);
    o.value = value;
    o.selected = !!picked;
    return o;
  };
  // A small button of one of Design's kinds, named in full so the check can read it.
  const button = (kind, text) => {
    const b = el('button', `rux--btn ${kind} rux--btn--sm rux--layout--size-sm`, text);
    b.type = 'button';
    return b;
  };

  function editForm(row) {
    const li = el('li', 'scheduler-to-do__row scheduler-to-do__row--editing');
    const form = el('form', 'scheduler-to-do__form rux--stack-vertical rux--stack-scale-4');
    const kind = el('select', 'rux--select-input');
    kind.append(option('', 'To do', !row.kind),
      ...[...KINDS].map(([name, [text]]) => option(name, text, name === row.kind)),
      ...(row.kind && !KINDS.has(row.kind) ? [option(row.kind, kindOf(row)[0], true)] : []));
    const who = el('input', 'rux--text-input rux--layout--size-sm');
    who.type = 'text';
    who.value = row.who || '';
    who.maxLength = 120;
    const words = el('input', 'rux--text-input rux--layout--size-sm');
    words.type = 'text';
    words.value = row.body;
    words.required = true;
    const detail = el('textarea', 'rux--text-area');
    detail.rows = 3;
    detail.value = row.detail || '';
    detail.maxLength = 1000;
    const due = el('input', 'rux--text-input rux--layout--size-sm');
    due.type = 'date';
    due.value = row.due_on || '';
    const owner = el('select', 'rux--select-input');
    owner.append(option('', 'Anyone', !row.owner_id),
      ...[...staff.values()].filter(p => p.user_id).sort((a, b) => String(a.display_name).localeCompare(String(b.display_name)))
        .map(p => option(p.id, p.id === me?.id ? `${p.display_name} (me)` : p.display_name, p.id === row.owner_id)));
    const trip = el('select', 'rux--select-input');
    const today = iso(new Date());
    const choices = [...trips.values()].filter(t => t.id === row.trip_id
      || ((t.return_end_date || t.end_date || t.start_date || '') >= today && !window.SchedulerChecklist.placeholder(t)));
    trip.append(option('', 'No trip', !row.trip_id),
      ...choices.map(t => option(t.id, `${t.start_date ? shortDay.format(parseISO(t.start_date)) : 'No date'} · ${tripWords(t)}`, t.id === row.trip_id)));

    const bar = el('div', 'scheduler-to-do__buttons');
    const del = button('rux--btn--danger--ghost', 'Delete');
    const cancel = button('rux--btn--ghost', 'Cancel');
    const save = button('rux--btn--primary', 'Save');
    save.type = 'submit';
    bar.append(del, el('span', 'scheduler-to-do__gap'), cancel, save);
    form.append(field('Kind', kind, true), field('Who', who), field('To do', words), field('Detail', detail),
      field('Due', due), field('Owner', owner, true), field('Trip', trip, true), bar);

    const shut = () => { editingId = null; draw(); };
    cancel.addEventListener('click', shut);
    del.addEventListener('click', () => { editingId = null; openId = null; remove(row); });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const body = words.value.trim();
      if (!body) { words.focus(); return; }
      editingId = null;
      // An empty part is stored as none, which the table asks for; the detail keeps its lines and drops its blank ones.
      change(row, {
        kind: kind.value || null, who: who.value.trim() || null, body,
        detail: detail.value.split('\n').map(s => s.trim()).filter(Boolean).join('\n') || null,
        due_on: due.value || null, owner_id: owner.value || null, trip_id: trip.value || null,
      });
    });
    form.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); shut(); } });
    li.appendChild(form);
    return li;
  }

  // The frame, built once: the title and whose, the add field, then the list.
  const body = el('div', 'rux--layer-two rux--stack-vertical rux--stack-scale-5 scheduler-to-do__body');
  const head = el('div', 'scheduler-to-do__head');
  const title = el('h2', 'scheduler-to-do__title', 'To do');
  title.id = 'scheduler-to-do-title';
  const whose = el('div', 'rux--content-switcher rux--content-switcher--sm rux--layout--size-sm rux--layout-constraint--size__default-md rux--layout-constraint--size__min-sm rux--layout-constraint--size__max-lg');
  whose.setAttribute('role', 'tablist');
  whose.setAttribute('aria-label', 'Whose rows');
  for (const [view, text] of [['mine', 'Mine'], ['everyone', 'Everyone']]) {
    const on = (view === 'mine') === mine;
    const b = el('button', `rux--content-switcher-btn${on ? ' rux--content-switcher--selected' : ''}`);
    b.type = 'button';
    b.dataset.view = view;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(on));
    b.tabIndex = on ? 0 : -1;
    b.appendChild(el('span', 'rux--content-switcher__label', text));
    whose.appendChild(b);
  }
  head.append(title, whose);
  const addForm = el('form', 'scheduler-to-do__add');
  const addInput = el('input', 'rux--text-input rux--layout--size-sm');
  addInput.type = 'text';
  addInput.placeholder = 'Add a to-do';
  addInput.setAttribute('aria-label', 'Add a to-do');
  addInput.autocomplete = 'off';
  addForm.appendChild(field('Add a to-do', addInput));
  // The label is hidden, as Carbon hides one: on its wrapper the class left it
  // the field's full width, 15px past the panel, which then slid sideways.
  addForm.querySelector('.rux--label').classList.add('rux--visually-hidden');
  const error = el('p', 'scheduler-to-do__error');
  error.setAttribute('role', 'alert');
  const list = el('div', 'scheduler-to-do__list');
  body.append(head, addForm, error, list);
  panel.setAttribute('aria-labelledby', title.id);
  panel.appendChild(body);

  /* The open row's menu, one for the whole list: Design's menu, which its
     script opens from the row's More button and shuts on a pick. It sits in
     the body, since the panel moves and would carry a fixed menu with it. */
  const menu = el('ul', 'rux--menu rux--menu--sm');
  menu.id = MENU_ID;
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', 'More');
  menu.tabIndex = -1;
  const menuItem = (text, danger, run) => {
    const li = el('li', danger ? 'rux--menu-item rux--menu-item--danger' : 'rux--menu-item');
    li.setAttribute('role', 'menuitem');
    li.tabIndex = -1;
    li.appendChild(el('div', 'rux--menu-item__label', text));
    li.addEventListener('click', () => { const row = stored.find(r => r.id === openId); if (row) run(row); });
    return li;
  };
  menu.append(
    menuItem('Edit', false, row => { editingId = row.id; draw(); panel.querySelector('.scheduler-to-do__form input[required]')?.focus(); }),
    menuItem('Delete', true, row => { openId = null; remove(row); }));
  document.body.appendChild(menu);

  /* The list's first line: tomorrow's departures, how many are ready, and the
     way into departures-panel.js's view. It is one of Today's rows while a
     leg leaving tomorrow is not ready. */
  const departures = () => window.SchedulerDeparturesPanel?.summary() ?? null;
  const departuresDue = () => { const d = departures(); return d?.known && d.legs > d.ready ? 1 : 0; };
  function departuresLine() {
    const d = departures();
    if (!d) return null;
    const b = el('button', 'scheduler-to-do__departures');
    b.type = 'button';
    const words = !d.known ? '' : !d.legs ? 'Nothing leaves tomorrow' : `Tomorrow: ${d.ready} of ${d.legs} ready`;
    b.append(svgUse('#m-directions_bus-fill', 20), el('span', 'scheduler-to-do__words', 'Departures'),
      el('span', 'scheduler-to-do__detail', words), svgUse('#m-arrow_forward'));
    b.addEventListener('click', () => window.SchedulerDeparturesPanel.open());
    return b;
  }

  function drawCount() {
    const rows = grouped(true);
    const n = rows.get('Overdue').length + rows.get('Today').length + departuresDue();
    action.querySelector('.rux--badge-indicator')?.remove();
    if (n) action.appendChild(el('div', 'rux--badge-indicator rux--badge-indicator--count', n > 99 ? '99+' : String(n)));
    action.setAttribute('aria-label', n ? `To do, ${n} due` : 'To do');
  }

  function draw() {
    drawCount();
    error.textContent = failure;
    error.hidden = !failure;
    const rows = grouped(mine);
    const parts = [];
    for (const g of GROUPS) {
      const items = rows.get(g);
      if (!items.length) continue;
      const ul = el('ul', 'rux--accordion rux--accordion--end scheduler-to-do__rows');
      ul.setAttribute('role', 'list');
      for (const item of items) {
        ul.appendChild(item.computed ? computedRow(item.computed)
          : item.stored.id === editingId ? editForm(item.stored) : storedRow(item.stored, false));
      }
      parts.push(el('h3', 'scheduler-to-do__group', g), ul);
    }
    const done = stored.filter(r => r.closed_at && (!mine || isMine(r)));
    if (done.length) {
      const ul = el('ul', 'rux--accordion rux--accordion--end scheduler-to-do__rows');
      ul.setAttribute('role', 'list');
      for (const r of done) ul.appendChild(storedRow(r, true));
      parts.push(el('h3', 'scheduler-to-do__group', 'Done'), ul);
    }
    if (!parts.length) parts.push(el('p', 'scheduler-to-do__none', 'Nothing to do.'));
    const first = departuresLine();
    if (first) parts.unshift(first);
    // A redraw somebody else's change caused would empty a form being typed in, so it waits for the form to shut.
    if (editingId && document.activeElement?.closest?.('.scheduler-to-do__form')) return;
    list.replaceChildren(...parts);
  }

  // -- behaviour ------------------------------------------------------------
  /* One row open at a time: Design's accordion leaves every opened item
     open, so opening one shuts the rest, and the open row is remembered, as
     a redraw builds the list again. */
  list.addEventListener('rux:accordion-opened', e => {
    openId = e.target.dataset?.id || null;
    for (const item of list.querySelectorAll('.rux--accordion__item--active')) {
      if (item !== e.target) window.Rux.accordion?.close(item);
    }
  });
  list.addEventListener('rux:accordion-closed', e => { if (e.target.dataset?.id === openId) openId = null; });
  addForm.addEventListener('submit', e => {
    e.preventDefault();
    const words = addInput.value.trim();
    if (!words) return;
    addInput.value = '';
    add(words);
  });
  whose.addEventListener('rux:content-switcher-selected', () => {
    mine = whose.querySelector('.rux--content-switcher--selected')?.dataset.view !== 'everyone';
    try { localStorage.setItem(VIEW_KEY, mine ? 'mine' : 'everyone'); } catch { /* this visit only */ }
    draw();
  });

  document.addEventListener('scheduler:departures-summary', () => draw());

  /* A closed panel is 0 wide but still in the page, so it is inert until it
     opens: nothing in it takes a Tab or is read. Opening reads the list
     again, since a tab left open all morning is hours behind. */
  panel.inert = true;
  panel.addEventListener('rux:header-panel-opened', () => { panel.inert = false; loadStored(); loadTrips(); });
  panel.addEventListener('rux:header-panel-closed', () => { panel.inert = true; editingId = null; openId = null; });

  let channel = null;
  function listen() {
    channel = client.channel('scheduler-to-do');
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'to_dos' }, () => loadStored());
    for (const table of TRIP_TABLES) channel.on('postgres_changes', { event: '*', schema: 'public', table }, tripsSoon);
    channel.subscribe();
  }
  // Coming back to the tab reads again and reopens a channel the sleep took.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !me) return;
    if (channel && channel.state !== 'joined' && channel.state !== 'joining') { client.removeChannel(channel); listen(); }
    loadStored();
    tripsSoon();
  });

  (async () => {
    me = await account.person().catch(() => null);
    // The list is the staff's; any other account's panel stays empty.
    if (!me?.staff) return;
    await readStaff().catch(() => {});
    await Promise.all([loadStored(), loadTrips()]);
    listen();
  })();

  // The unfolded computed rows, for the Trips page's Show choices.
  window.SchedulerToDoList = { rows: () => computed };
})();
