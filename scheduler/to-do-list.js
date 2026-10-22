/* ==========================================================================
   to-do-list.js — TASKS, AND THE PANES OF THE BOARD'S TWO LISTS
   --------------------------------------------------------------------------
   The board's toolbar has two buttons, Tasks and Departures, each opening its own
   pane left of the week. This shows and hides both panes, says on each
   button how many are due, and fills Tasks. Departures is departures-panel.js's.
   A pane stays until its button or its close shuts it, or the board closes
   it for room as the oldest panel open.

   Tasks is what people ask of the office, the `to_dos` rows. A Claude
   session adds a row through the connector, made by Ruxbot; nobody adds one
   here, where a row is done, edited and deleted.

   A row is a tile that opens, Design's tile around an item of its accordion,
   as a leg is on Departures. Every row has a number the database gives it when it
   is added and it keeps, so a person can say "task 112". Closed, a row is
   three lines, each ended in an ellipsis where it runs long, so every closed
   row stands the same height: who it is about, with its due day at the
   line's end in the error colour once the day is past; then its words in
   bold; then its kind in Design's tag, in the kind's colour, and its number.
   A press opens it to those in full, then its trip as a link,
   its detail as a list, a fact to an item, and one row of buttons: Done,
   Email, Start trip on a website request with no trip yet, and a menu of
   Edit and Delete. Who added a row is said in its form, under the fields,
   and not on its tile. One row is open at a time. Delete closes the row with
   the reason Deleted, so it goes to Done today with that said, and nothing
   is removed.

   The rows stand in one list in due order, overdue first, then today, this
   week, later and no date, under no headings, since each row says its day;
   then Done today: the rows closed today behind one line that says how many
   and is shut until pressed, each a tile struck through, with Undo. Everyone
   on the staff sees every row. The count on Tasks is its overdue and today
   rows; the count on Departures is the one departures-panel.js gives.

   A change to a row arrives on the `scheduler-to-do` channel and redraws.

   Needs to-do-rows.js for a row's trip, departures-panel.js for Departures,
   /account.js for the client, and Design's accordion.js and menu.js, which
   open a row and its menu.
   ========================================================================== */
(() => {
  'use strict';

  const account = window.Rux?.account;
  const client = account?.client;
  const Rows = window.SchedulerToDoRows;
  const panel = document.getElementById('scheduler-to-do-panel');
  /* The two lists, each in a pane of its own: the pane, its name to the
     board's room, its button, the button's glyph, filled while the pane is
     open, and its name on the button. */
  const LISTS = {
    tasks: { pane: panel, room: 'to-do', button: document.getElementById('scheduler-tasks-toggle'), glyph: '#m-check_circle', name: 'Tasks', due: 'due' },
    prep: { pane: document.getElementById('scheduler-prep-panel'), room: 'prep', button: document.getElementById('scheduler-prep-toggle'), glyph: '#m-directions_bus', name: 'Departures', due: 'not ready' },
  };
  if (!client || !panel || !LISTS.tasks.button) return;

  const GROUPS = ['Overdue', 'Today', 'This week', 'Later', 'No date'];
  const MENU_ID = 'scheduler-to-do-menu';
  /* The kinds of work a row can be, each one's words and colour on its tag,
     so the list is scanned by colour. Green is no kind's, since it means
     paid, ready or done on every other page; a PO is blue, as it is on a
     trip's billing; and the two paper kinds, Form and Invoice, take the two
     greys. A row with no kind reads To do, and a kind not listed here reads
     as its own word, both in the outline tag. The connector's `TO_DO_KINDS`
     repeats the names. */
  const KINDS = new Map([
    ['quote', ['New quote', 'rux--tag--cyan']],
    ['itinerary', ['Itinerary', 'rux--tag--purple']],
    ['po', ['PO', 'rux--tag--blue']],
    ['change', ['Change', 'rux--tag--magenta']],
    ['respond', ['Respond', 'rux--tag--teal']],
    ['form', ['Form', 'rux--tag--warm-gray']],
    ['invoice', ['Invoice', 'rux--tag--gray']],
  ]);
  const kindOf = row => KINDS.get(row.kind)?.[0]
    ?? (row.kind ? row.kind.charAt(0).toUpperCase() + row.kind.slice(1).replaceAll('-', ' ') : 'To do');
  const toneOf = row => KINDS.get(row.kind)?.[1] ?? 'rux--tag--outline';

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
  const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
  const monthDay = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
  const monthDayYear = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  /* A due day in the fewest words: "Today", "Yesterday" and "Tomorrow", the
     weekday for the rest of this week, else "Oct 30", with the year where it
     is not this one. */
  const dueWords = day => {
    if (day === iso(new Date())) return 'Today';
    if (day === dayFrom(-1)) return 'Yesterday';
    if (day === dayFrom(1)) return 'Tomorrow';
    const d = parseISO(day);
    if (day > iso(new Date()) && day <= weekEnd()) return weekday.format(d);
    return (d.getFullYear() === new Date().getFullYear() ? monthDay : monthDayYear).format(d);
  };
  // A row's words start with a capital, as a sentence does, whoever wrote them.
  const sentence = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const unwrap = r => { if (r.error) throw new Error(r.error.message); return r.data ?? []; };
  // A row about one leg names it, so the board opens that leg's bar.
  const tripHref = (trip, day, leg) => `./?trip=${encodeURIComponent(trip.id)}&date=${encodeURIComponent(day || trip.start_date || '')}${leg ? `&leg=${leg}` : ''}`;
  /* A link to a trip is offered to the board, which opens the trip where it
     is, beside the list. `opener` is the link pressed, for the focus to come
     back to. It answers whether it was taken. */
  const boardTook = (href, opener) => !document.dispatchEvent(new CustomEvent('scheduler:open-trip', { detail: { href, opener }, cancelable: true }));
  /* The dot between the parts of a line, tied to the word before it, so a line
     that wraps breaks after the dot and never starts with one. */
  const DOT = '\u00A0· ';
  const tripWords = trip => [trip.destination, trip.customer].filter(Boolean).join(DOT) || trip.trip_ref || 'Trip';

  // -- what is known --------------------------------------------------------
  let me = null;            // my staff row, as /account.js gives it
  let staff = new Map();    // profile id -> profile, Ruxbot among them
  let stored = [];          // `to_dos`: every open row, and the ones closed today
  let editingId = null;     // the row whose form is open
  let openId = null;        // the row that is open, one at a time
  let doneOpen = false;     // whether Done today is open, shut again when the pane shuts
  const shown = { tasks: false, prep: false };   // which panes are open
  let failure = '';
  // A row's trip, and the trips its Trip choice offers, as to-do-rows.js read them.
  const tripOf = id => Rows?.trips().get(id) ?? null;

  // -- reading --------------------------------------------------------------
  async function readStored() {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    stored = await client.from('to_dos').select('*')
      .or(`closed_at.is.null,closed_at.gte."${midnight.toISOString()}"`).order('created_at').then(unwrap);
  }

  async function readStaff() {
    const rows = await client.from('profiles').select('id,user_id,display_name').then(unwrap);
    staff = new Map(rows.map(p => [p.id, p]));
  }

  /* One read at a time, and the newest asked for wins: a second ask while one
     is under way runs once more when it ends. */
  let reading = null;
  let again = false;
  async function loadStored() {
    if (reading) { again = true; return reading; }
    reading = (async () => {
      try { await readStored(); failure = ''; } catch (e) { failure = `The list did not load. ${e?.message || e}`; }
      draw();
    })();
    await reading;
    reading = null;
    if (again) { again = false; return loadStored(); }
  }

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
  const tick = (row, done) => write(() => client.from('to_dos')
    .update({ closed_at: done ? new Date().toISOString() : null }).eq('id', row.id));
  const change = (row, fields) => write(() => client.from('to_dos').update(fields).eq('id', row.id));
  /* Delete closes the row with the reason Deleted and removes nothing. The
     row leaves the list as a done one does, History keeps what it asked where
     it had a trip, and an inbox review still finds the thread's row, so it
     does not add the same one again. */
  const remove = row => write(() => client.from('to_dos')
    .update({ closed_at: new Date().toISOString(), closed_reason: 'Deleted' }).eq('id', row.id));

  /* START TRIP turns a website request into a draft, as Claude's are: the
     request's facts fill the editor, and only the person's Save makes the
     trip, which then takes the request and this row. The board opens a
     draft named in its address. */
  const PO_WORDS = { yes: 'Yes', no: 'No', unsure: 'Not sure yet' };
  function draftOf(r) {
    const round = r.trip_type === 'round';
    const name = `${r.first_name} ${r.last_name}`;
    const fields = {
      destination: r.destination,
      customer: r.organization || name,
      trip_type: round ? 'round_trip' : 'one_way',
      start_date: r.leave_on,
      end_date: round ? r.return_on : r.leave_on,
      passengers: String(r.passengers),
      pickup_address: r.pickup,
      booking_contact_name: name,
      booking_contact_phone: r.phone,
      booking_contact_email: r.email,
    };
    if (r.leave_at) fields.departure_time = r.leave_at.slice(0, 5);
    if (round && r.return_at) fields.return_time = r.return_at.slice(0, 5);
    if (r.wheelchair_lift) fields.req_ada = true;
    // A round trip's destination is a stop on the way; a one-way trip's is where it ends.
    if (round) fields.stops = [{ name: r.destination }];
    else fields.dropoff_address = r.destination;
    const notes = [`Website request ${r.number}${r.lang === 'es' ? ', sent in Spanish' : ''}.`,
      `Purchase order: ${PO_WORDS[r.purchase_order] ?? r.purchase_order}.`, r.details].filter(Boolean).join(' ');
    return { fields, notes, quote_request_id: r.id };
  }
  async function startTrip(row, pressed) {
    pressed.disabled = true;
    try {
      const request = await client.from('quote_requests').select('*').eq('id', row.quote_request_id).single().then(unwrap);
      const draft = await client.from('trip_drafts').insert(draftOf(request)).select('id').single().then(unwrap);
      location.href = `./?draft=${draft.id}`;
    } catch (e) {
      failure = `The trip could not be started. ${e?.message || e}`;
      draw();
    }
  }

  // -- the list, as data ----------------------------------------------------
  const groupOf = (row, today, sunday) => (!row.due_on ? 'No date' : row.due_on < today ? 'Overdue'
    : row.due_on === today ? 'Today' : row.due_on <= sunday ? 'This week' : 'Later');

  /* The open stored rows by group. Within Today the rows with no trip come
     first, then a trip at a time by the day it leaves, so the rows about one
     trip sit together. */
  function grouped() {
    const today = iso(new Date());
    const sunday = weekEnd();
    const out = new Map(GROUPS.map(g => [g, []]));
    for (const row of stored) {
      if (row.closed_at) continue;
      out.get(groupOf(row, today, sunday)).push(row);
    }
    const tripDay = id => tripOf(id)?.start_date || '9';
    const place = row => (row.trip_id ? `1 ${tripDay(row.trip_id)} ${row.trip_id}` : '0');
    for (const g of GROUPS) {
      out.get(g).sort(g === 'Today' ? (a, b) => place(a).localeCompare(place(b))
        : (a, b) => String(a.due_on || '').localeCompare(String(b.due_on || '')));
    }
    return out;
  }

  // -- drawing --------------------------------------------------------------
  /* A stored row's kind: its words in its kind's colour. It is a div, since
     Carbon draws the outline tag only on one. */
  const kindTag = row => {
    const t = el('div', `rux--tag ${toneOf(row)} rux--tag--sm rux--layout--size-sm scheduler-to-do__tag`);
    t.appendChild(el('span', 'rux--tag__label', kindOf(row)));
    return t;
  };
  /* Whose a stored row is, then who added it and when, with the person a
     session added it for. A row the website made has no maker, and says
     Website where the person would be. */
  const madeBy = row => {
    const owner = staff.get(row.owner_id)?.display_name;
    const maker = row.source === 'website' ? 'Website' : staff.get(row.created_by)?.display_name;
    const sessionOf = staff.get(row.session_of)?.display_name;
    return [owner && owner !== maker ? `For ${owner}` : null,
      maker ? `Added by ${maker}${sessionOf ? ` for ${sessionOf}` : ''}` : null,
      row.created_at ? shortDay.format(new Date(row.created_at)) : null].filter(Boolean).join(DOT);
  };

  /* A tile around a one-item accordion, as a leg's is on Departures: the item's
     heading fills the tile, so the whole closed tile is the press. */
  const tileOf = item => {
    const rows = el('ul', 'rux--accordion rux--accordion--end');
    rows.appendChild(item);
    const tile = el('li', 'rux--tile scheduler-to-do__tile');
    tile.appendChild(rows);
    return tile;
  };

  /* A stored row, as a tile around an item of Design's accordion, whose
     script opens and shuts it. The heading is the closed row and the whole
     of it is the press; it carries no arrow, since the tile says it opens.
     The panel under it holds what a closed row has no room for: its trip,
     its detail, then the buttons, and on a done row who closed it, and why
     where it was deleted. What a row has none of, a trip or a thread, is left
     out rather than shown disabled. */
  function storedRow(row, done) {
    const open = row.id === openId;
    const li = el('li', `rux--accordion__item scheduler-to-do__item${done ? ' scheduler-to-do__item--done' : ''}${open ? ' rux--accordion__item--active' : ''}`);
    li.dataset.id = row.id;
    const trip = row.trip_id ? tripOf(row.trip_id) : null;
    const lines = String(row.detail || '').split('\n').map(s => s.trim()).filter(Boolean);

    const heading = el('button', 'rux--accordion__heading');
    heading.type = 'button';
    heading.setAttribute('aria-expanded', String(open));
    const title = el('div', 'rux--accordion__title');
    // The first line is who the row is about, and its due day at the end,
    // with Due said for a reader; a done row is past its day. A row about
    // nobody keeps the line, so every closed row stands the same height.
    const top = el('div', 'scheduler-to-do__top');
    top.appendChild(el('span', 'scheduler-to-do__who', row.who || ''));
    const dueWord = !done && row.due_on ? dueWords(row.due_on) : '';
    if (dueWord) {
      const due = el('span', `scheduler-to-do__when${row.due_on < iso(new Date()) ? ' scheduler-to-do__when--late' : ''}`);
      due.append(el('span', 'rux--visually-hidden', 'Due '), dueWord);
      top.appendChild(due);
    }
    // The second is the row's words, and the third its kind and its number,
    // with Task said for a reader.
    const what = el('div', 'scheduler-to-do__what', sentence(row.body));
    const context = el('div', 'scheduler-to-do__context');
    context.appendChild(kindTag(row));
    if (row.number != null) {
      const number = el('span', 'scheduler-to-do__number');
      number.append(el('span', 'rux--visually-hidden', 'Task '), `#${row.number}`);
      context.appendChild(number);
    }
    title.append(top, what, context);
    heading.appendChild(title);

    const wrapper = el('div', 'rux--accordion__wrapper');
    const more = el('div', 'rux--accordion__content scheduler-to-do__more');
    more.id = `scheduler-to-do-more-${row.id}`;
    heading.setAttribute('aria-controls', more.id);
    /* Its trip comes first, a link the pane offers to the board to open in
       place, so it stands in the same place however long the detail under it. */
    if (trip) {
      const link = el('a', 'scheduler-to-do__trip');
      link.href = tripHref(trip);
      const words = el('span', 'scheduler-to-do__trip-words', trip.destination || trip.trip_ref || 'Trip');
      if (trip.customer) words.appendChild(el('span', 'scheduler-to-do__trip-customer', `${DOT}${trip.customer}`));
      link.append(svgUse('#m-directions_bus'), words, svgUse('#m-arrow_forward'));
      more.appendChild(link);
    }
    if (lines.length) {
      const notes = el('ul', 'scheduler-to-do__notes');
      for (const line of lines) notes.appendChild(el('li', 'scheduler-to-do__note', line));
      more.appendChild(notes);
    }
    const closed = done ? [staff.get(row.closed_by)?.display_name, row.closed_reason].filter(Boolean).join(': ') : '';

    const act = button('rux--btn--tertiary', done ? 'Undo' : 'Done');
    act.addEventListener('click', () => { act.disabled = true; openId = null; tick(row, !done); });
    const bar = el('div', 'scheduler-to-do__buttons');
    bar.appendChild(act);
    if (row.thread_url) {
      const email = button('rux--btn--ghost', 'Email');
      email.addEventListener('click', () => window.open(row.thread_url, '_blank', 'noopener'));
      bar.appendChild(email);
    }
    // A website request with no trip yet starts one where its trip would show.
    if (!done && !row.trip_id && row.quote_request_id) {
      const start = button('rux--btn--ghost', 'Start trip');
      start.addEventListener('click', () => startTrip(row, start));
      bar.appendChild(start);
    }
    // Edit and Delete are the menu's; a row ticked today has only Undo to take back.
    const menuButton = el('button', 'rux--btn rux--btn--ghost rux--btn--icon-only rux--btn--sm rux--layout--size-sm rux--menu-button__trigger scheduler-to-do__end');
    menuButton.type = 'button';
    menuButton.disabled = !!done;
    menuButton.setAttribute('aria-label', 'More');
    menuButton.setAttribute('aria-haspopup', 'menu');
    menuButton.setAttribute('data-rux-open', MENU_ID);
    menuButton.appendChild(svgUse('#m-more_vert'));
    bar.appendChild(menuButton);
    more.appendChild(bar);
    if (closed) more.appendChild(el('div', 'scheduler-to-do__meta', closed));
    wrapper.appendChild(more);
    li.append(heading, wrapper);
    return tileOf(li);
  }

  // A list of tiles, a step apart: a group's rows, or the done rows.
  const tileList = () => {
    const ul = el('ul', 'scheduler-to-do__rows scheduler-to-do__tiles');
    ul.setAttribute('role', 'list');
    return ul;
  };

  /* Done today: the rows closed today, behind one item of the accordion whose
     heading is set as a group's is, its name and how many it holds. It is no
     tile, shut until pressed, so the tab opens on what is still owed, and its
     rows are the tiles they are above it. */
  function doneGroup(rows) {
    const li = el('li', `rux--accordion__item scheduler-to-do__done-item${doneOpen ? ' rux--accordion__item--active' : ''}`);
    const heading = el('button', 'rux--accordion__heading');
    heading.type = 'button';
    heading.setAttribute('aria-expanded', String(doneOpen));
    const arrow = svgUse('#m-keyboard_arrow_right');
    arrow.classList.add('rux--accordion__arrow');
    const title = el('div', 'rux--accordion__title scheduler-to-do__done-title', 'Done today');
    title.append(' ', el('span', 'scheduler-to-do__count', String(rows.length)));
    heading.append(arrow, title);
    const wrapper = el('div', 'rux--accordion__wrapper');
    const inside = el('div', 'rux--accordion__content');
    inside.id = 'scheduler-to-do-done';
    heading.setAttribute('aria-controls', inside.id);
    const ul = tileList();
    for (const r of rows) ul.appendChild(storedRow(r, true));
    inside.appendChild(ul);
    wrapper.appendChild(inside);
    li.append(heading, wrapper);
    const group = el('ul', 'rux--accordion rux--accordion--end scheduler-to-do__rows scheduler-to-do__done');
    group.setAttribute('role', 'list');
    group.appendChild(li);
    return group;
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

  /* A row's form, in the row's tile. The fields are a layer over the tile,
     which is itself a layer over the pane. */
  function editForm(row) {
    const li = el('li', 'rux--tile scheduler-to-do__tile scheduler-to-do__tile--editing');
    const form = el('form', 'scheduler-to-do__form rux--layer-three rux--stack-vertical rux--stack-scale-4');
    const kind = el('select', 'rux--select-input');
    kind.append(option('', 'To do', !row.kind),
      ...[...KINDS].map(([name, [text]]) => option(name, text, name === row.kind)),
      ...(row.kind && !KINDS.has(row.kind) ? [option(row.kind, kindOf(row), true)] : []));
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
    const choices = [...(Rows?.trips().values() ?? [])].filter(t => t.id === row.trip_id
      || ((window.SchedulerTripShape.daysOf(t)?.last ?? '') >= today && !window.SchedulerBilling.placeholder(t)));
    trip.append(option('', 'No trip', !row.trip_id),
      ...choices.map(t => option(t.id, `${t.start_date ? shortDay.format(parseISO(t.start_date)) : 'No date'} · ${tripWords(t)}`, t.id === row.trip_id)));

    const bar = el('div', 'scheduler-to-do__buttons');
    const del = button('rux--btn--danger--ghost', 'Delete');
    const cancel = button('rux--btn--ghost', 'Cancel');
    cancel.classList.add('scheduler-to-do__end');
    const save = button('rux--btn--primary', 'Save');
    save.type = 'submit';
    bar.append(del, cancel, save);
    // Who added the row, and when: its tile does not say.
    const added = madeBy(row);
    form.append(field('Kind', kind, true), field('Who', who), field('To do', words), field('Detail', detail),
      field('Due', due), field('Owner', owner, true), field('Trip', trip, true),
      added ? el('p', 'scheduler-to-do__meta', added) : '', bar);

    const shutForm = () => { editingId = null; draw(); };
    cancel.addEventListener('click', shutForm);
    del.addEventListener('click', () => { editingId = null; openId = null; remove(row); });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const body = words.value.trim();
      if (!body) { words.focus(); return; }
      editingId = null;
      // An empty part is stored as none, which the table asks for; the detail keeps its lines and drops its blank ones.
      const fields = {
        kind: kind.value || null, who: who.value.trim() || null, body,
        detail: detail.value.split('\n').map(s => s.trim()).filter(Boolean).join('\n') || null,
        due_on: due.value || null, owner_id: owner.value || null, trip_id: trip.value || null,
      };
      change(row, fields);
    });
    form.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); shutForm(); } });
    li.appendChild(form);
    return li;
  }

  /* The frame, built once: a line for what went wrong, and the list under
     it. */
  const body = el('div', 'rux--layer-two rux--stack-vertical rux--stack-scale-5 scheduler-to-do__body');
  const error = el('p', 'scheduler-to-do__error');
  error.setAttribute('role', 'alert');
  const list = el('div', 'scheduler-to-do__list');
  body.append(error, list);
  panel.appendChild(body);

  /* The open row's menu, one for the whole list: Design's menu, which its
     script opens from the row's More button and shuts on a pick. It sits in
     the body, since the pane moves and would carry a fixed menu with it. */
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

  /* How many are due, on each list's button: Design's count badge, and the
     button's name says it too. Tasks counts its Overdue and Today rows. */
  function drawCount(list, n) {
    const { button, name, due } = LISTS[list];
    if (!button) return;
    button.querySelector('.rux--badge-indicator')?.remove();
    if (n) button.appendChild(el('div', 'rux--badge-indicator rux--badge-indicator--count', n > 99 ? '99+' : String(n)));
    button.setAttribute('aria-label', n ? `${name}, ${n} ${due}` : name);
  }
  const drawPrepCount = () => drawCount('prep', window.SchedulerDeparturesPanel?.summary().due ?? 0);

  // The list: the groups, then Done today.
  function listParts() {
    const rows = grouped();
    const parts = [];
    // One list, the groups in their order with no heading between, since each row says its day.
    const open = GROUPS.flatMap(g => rows.get(g));
    if (open.length) {
      const ul = tileList();
      for (const row of open) ul.appendChild(row.id === editingId ? editForm(row) : storedRow(row, false));
      parts.push(ul);
    }
    const done = stored.filter(r => r.closed_at);
    if (done.length) parts.push(doneGroup(done));
    if (!parts.length) parts.push(el('p', 'rux--tile scheduler-to-do__none', 'Nothing to do.'));
    return parts;
  }

  function draw() {
    const rows = grouped();
    drawCount('tasks', rows.get('Overdue').length + rows.get('Today').length);
    error.textContent = failure;
    error.hidden = !failure;
    // A redraw somebody else's change caused would empty a form being typed in, so it waits for the form to shut.
    if (editingId && document.activeElement?.closest?.('.scheduler-to-do__form')) return;
    list.replaceChildren(...listParts());
  }

  // -- behaviour ------------------------------------------------------------
  /* One row open at a time: Design's accordion leaves every opened item
     open, so opening one shuts the rest, and the open row is remembered, as
     a redraw builds the list again. Done today is not a row: it opens and
     shuts by itself, around whichever row is open, and is remembered too. */
  const isDone = item => item.classList.contains('scheduler-to-do__done-item');
  list.addEventListener('rux:accordion-opened', e => {
    if (isDone(e.target)) { doneOpen = true; return; }
    openId = e.target.dataset?.id || null;
    for (const item of list.querySelectorAll('.scheduler-to-do__item.rux--accordion__item--active')) {
      if (item !== e.target) window.Rux.accordion?.close(item);
    }
  });
  list.addEventListener('rux:accordion-closed', e => {
    if (isDone(e.target)) { doneOpen = false; return; }
    if (e.target.dataset?.id === openId) openId = null;
  });
  // A link to a trip, a task's, a Departures row's or line's, by a plain press.
  for (const { pane } of Object.values(LISTS)) pane?.addEventListener('click', e => {
    const a = e.target.closest?.('a[href*="?trip="]');
    if (!a || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (boardTook(a.href, a)) e.preventDefault();
  });

  document.addEventListener('scheduler:departures-summary', drawPrepCount);
  // A task's trip is read by to-do-rows.js, so its words come with that reading.
  document.addEventListener('scheduler:to-do-rows', () => draw());

  /* Each list is its own pane, open or shut, and a list's button reads as
     pressed, its glyph filled, while its pane is open. Opening asks the board
     for room first, which may close the oldest panel or say why there is
     none; opening reads the list again, since a tab left open all morning is
     hours behind, and shutting Tasks shuts its open row and its form. The
     board, told by `scheduler:to-do-pane`, lays the panes out. Nothing keeps
     whether one was open, so the board always opens on the week alone. */
  async function setPane(name, on) {
    const list = LISTS[name];
    if (!list?.pane || shown[name] === on) return;
    if (on && !(await (window.SchedulerPanels?.room?.(list.room) ?? true))) return;
    if (shown[name] === on) return;
    shown[name] = on;
    list.pane.hidden = !on;
    list.button?.setAttribute('aria-pressed', String(on));
    list.button?.classList.toggle('rux--btn--selected', on);
    list.button?.querySelector('use')?.setAttribute('href', on ? `${list.glyph}-fill` : list.glyph);
    if (name === 'tasks') {
      editingId = null;
      openId = null;
      doneOpen = false;
      if (on) { loadStored(); Rows?.load(); }
      draw();
    } else {
      const prep = window.SchedulerDeparturesPanel;
      if (on) prep?.open(); else prep?.close();
    }
    document.dispatchEvent(new CustomEvent('scheduler:to-do-pane'));
  }
  // Shuts a pane and hands the focus back to its button.
  function shut(name) {
    if (!shown[name]) return;
    setPane(name, false);
    LISTS[name].button?.focus();
  }
  for (const [name, { button }] of Object.entries(LISTS)) {
    // Departures is a list only where departures-panel.js loaded to draw it.
    if (name === 'prep' && !window.SchedulerDeparturesPanel) continue;
    button?.addEventListener('click', () => setPane(name, !shown[name]));
  }
  document.getElementById('scheduler-to-do-close')?.addEventListener('click', () => shut('tasks'));
  document.getElementById('scheduler-prep-close')?.addEventListener('click', () => shut('prep'));

  let channel = null;
  function listen() {
    channel = client.channel('scheduler-to-do');
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'to_dos' }, () => loadStored());
    channel.subscribe();
  }
  // Coming back to the tab reads again and reopens a channel the sleep took.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !me) return;
    if (channel && channel.state !== 'joined' && channel.state !== 'joining') { client.removeChannel(channel); listen(); }
    loadStored();
  });

  (async () => {
    me = await account.person().catch(() => null);
    // The lists are the staff's; any other account's pane stays empty.
    if (!me?.staff) return;
    await readStaff().catch(() => {});
    await loadStored();
    drawPrepCount();
    listen();
  })();

  /* The way the board shuts a pane, `tasks` or `prep`: with the focus handed
     back, or without, where it closes one for room. */
  window.SchedulerToDoList = { shut, close: name => setPane(name, false) };
})();
