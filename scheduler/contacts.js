/* ==========================================================================
   contacts.js — THE CONTACTS PAGE
   --------------------------------------------------------------------------
   contacts.html lists every contact. contacts.html?id=<contact id> edits one
   and contacts.html?new makes one. Both read and write `contacts`, the table
   rux-ui's Customers view writes, so both apps show the same people.

   A contact is a person. The school or business they book for is their
   customer, picked from the Customers list; `client` keeps the customer's
   name as text, which rux-ui shows.

   A trip names its contacts in six columns, the booking contact and five
   day-of ones, and keeps its own copy of each name and phone. Editing a
   contact here changes the contact only: a trip keeps what it was saved with,
   which is what its driver was given.

   A contact on any trip is never deleted, because the database would clear
   the trip's link and leave only its typed copy.
   ========================================================================== */
(() => {
  'use strict';

  const { $, el, svgUse } = window.SchedulerPair;
  const pair = window.SchedulerPair.page({ list: 'contacts', one: 'contact' });
  const { say, result } = pair;

  const params = new URLSearchParams(location.search);
  const contactId = params.get('id');
  const editing = !!contactId || params.has('new');
  // The record view shows the list's column only for its notice.
  if (editing) $('scheduler-contacts-h').hidden = true;

  const CONTACT_COLUMNS = 'id,name,phone,email,client,customer_id';
  // The six places a trip names a contact; the first is who booked it.
  const SLOTS = ['booking_contact_id', 'trip_contact_1_id', 'trip_contact_2_id',
    'trip_contact_3_id', 'trip_contact_4_id', 'trip_contact_5_id'];
  const PAGE = 1000;

  let client = null;

  // ── dates, all local ────────────────────────────────────────────────────
  const ISO = /^\d{4}-\d{2}-\d{2}$/;
  const day = v => (ISO.test(String(v ?? '').slice(0, 10)) ? String(v).slice(0, 10) : null);
  const parseISO = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayISO = () => iso(new Date());
  const dateFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const shortFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
  const longDate = s => dateFormat.format(parseISO(s));
  const rangeText = (a, b) => {
    if (!b || a === b) return dateFormat.format(parseISO(a));
    const x = parseISO(a), y = parseISO(b);
    return x.getFullYear() === y.getFullYear()
      ? `${shortFormat.format(x)} – ${dateFormat.format(y)}`
      : `${dateFormat.format(x)} – ${dateFormat.format(y)}`;
  };

  // ── people ──────────────────────────────────────────────────────────────
  /* The trip editor's rule for one person, from data.js: the same phone
     digits, the same email or the same name, case and spacing aside. A US
     number's leading 1 is dropped, so +1 and no prefix match. */
  const phoneDigits = v => String(v ?? '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  const folded = v => String(v ?? '').trim().toLowerCase();
  const samePerson = (c, p) => [
    [phoneDigits(c.phone), phoneDigits(p.phone)],
    [folded(c.email), folded(p.email)],
    [folded(c.name), folded(p.name)],
  ].some(([a, b]) => a && a === b);
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const initials = name => String(name || '').trim().split(/\s+/).filter(Boolean)
    .map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';

  // ── reading ─────────────────────────────────────────────────────────────
  /* Every row, a page at a time, because the API hands back at most a
     thousand. `build` makes a fresh query for each page. */
  async function readAll(build) {
    const rows = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await build().range(from, from + PAGE - 1);
      if (error) throw error;
      rows.push(...(data || []));
      if (!data || data.length < PAGE) return rows;
    }
  }
  const readContacts = () => readAll(() => client.from('contacts').select(CONTACT_COLUMNS).order('id'));
  const readCustomers = async () => {
    const { data, error } = await client.from('customers').select('id,name').order('name');
    if (error) throw error;
    return new Map((data || []).map(c => [c.id, c]));
  };
  const anyContact = SLOTS.map(s => `${s}.not.is.null`).join(',');
  const readTripLinks = () => readAll(() => client.from('trips')
    .select(`id,start_date,end_date,cancelled_at,${SLOTS.join(',')}`)
    .or(anyContact).order('id'));

  /* Each contact's trips: how many, the next to start or still running, and
     the last. A trip naming someone twice counts once, and a cancelled trip
     does not count. */
  function indexTrips(trips) {
    const map = new Map();
    const now = todayISO();
    for (const t of trips) {
      if (t.cancelled_at) continue;
      const from = day(t.start_date);
      if (!from) continue;
      const to = day(t.end_date) || from;
      for (const id of new Set(SLOTS.map(s => t[s]).filter(Boolean))) {
        if (!map.has(id)) map.set(id, { n: 0, next: null, last: null });
        const m = map.get(id);
        m.n++;
        if (to >= now) { if (!m.next || from < m.next) m.next = from; }
        else if (!m.last || from > m.last) m.last = from;
      }
    }
    return map;
  }

  /* ══ The list ═══════════════════════════════════════════════════════════ */
  let contacts = [];
  let customers = new Map();  // customer id → customer
  let tripsBy = new Map();

  const tripsOf = c => tripsBy.get(c.id) || { n: 0, next: null, last: null };
  // The customer's name, or the old typed organization of a contact not linked.
  const customerName = c => customers.get(c.customer_id)?.name ?? c.client ?? null;
  const byName = (a, b) => folded(a.name).localeCompare(folded(b.name)) || String(a.id).localeCompare(String(b.id));
  // A blank phone or email sorts after every filled one, A to Z.
  const blankLast = (x, y, cmp) => (!x && !y ? 0 : !x ? 1 : !y ? -1 : cmp(x, y));

  /* Next trip, soonest first; then those with none coming, the most recent
     last trip first; then those who have never travelled. */
  const nextRank = c => {
    const t = tripsOf(c);
    if (t.next) return [0, t.next];
    if (t.last) return [1, String(99999999 - Number(t.last.replace(/-/g, '')))];
    return [2, ''];
  };
  const SORTS = {
    name: byName,
    phone: (a, b) => blankLast(phoneDigits(a.phone), phoneDigits(b.phone), (x, y) => x.localeCompare(y)),
    email: (a, b) => blankLast(folded(a.email), folded(b.email), (x, y) => x.localeCompare(y)),
    trips: (a, b) => tripsOf(a).n - tripsOf(b).n,
    next: (a, b) => { const x = nextRank(a), y = nextRank(b); return x[0] - y[0] || x[1].localeCompare(y[1]); },
  };

  const matches = (c, q) => {
    if (!q) return true;
    const words = [c.name, customerName(c), c.email].filter(Boolean).join(' ').toLowerCase();
    if (words.includes(q.toLowerCase())) return true;
    // A phone matches by its digits, however either side was typed.
    const digits = q.replace(/\D/g, '');
    return digits.length >= 3 && phoneDigits(c.phone).includes(digits.replace(/^1(?=\d{10}$)/, ''));
  };

  function nextCell(c) {
    const t = tripsOf(c);
    if (t.next) return el('span', null, t.next === todayISO() ? 'Today' : longDate(t.next));
    if (t.last) return el('span', 'scheduler-pair-note', `Last ${longDate(t.last)}`);
    return el('span', 'scheduler-pair-note', 'None');
  }

  function drawList() {
    const { query, sortKey, sortDir } = view;
    const shown = contacts
      .filter(c => matches(c, query))
      .sort((a, b) => {
        if (sortDir === 'none') return byName(a, b);
        const r = SORTS[sortKey](a, b);
        if (r) return sortDir === 'descending' ? -r : r;
        return byName(a, b);
      });

    view.count(shown.length, contacts.length);

    const body = $('scheduler-contacts-rows');
    body.replaceChildren();
    if (!shown.length) {
      const tr = el('tr');
      const td = el('td', null, query ? `No contacts match “${query}”.` : 'No contacts yet.');
      td.colSpan = 5;
      tr.appendChild(td);
      body.appendChild(tr);
      return;
    }
    for (const c of shown) {
      const tr = el('tr', 'scheduler-pair-row');
      tr.dataset.id = c.id;

      const who = el('td');
      const cell = el('div', 'scheduler-pair-cell');
      const avatar = el('div', 'rux--user-avatar rux--user-avatar--order-2-gray rux--user-avatar--sm', initials(c.name));
      avatar.setAttribute('aria-hidden', 'true');
      const lines = el('div', 'scheduler-pair-cell__lines');
      const link = el('a', 'scheduler-pair-cell__name', c.name || 'Unnamed contact');
      link.href = `contacts.html?id=${encodeURIComponent(c.id)}`;
      lines.appendChild(link);
      if (customerName(c)) lines.appendChild(el('span', 'scheduler-pair-cell__detail', customerName(c)));
      cell.append(avatar, lines);
      who.appendChild(cell);

      const phone = el('td', null, c.phone || '—');
      const email = el('td', null, c.email || '—');
      const n = tripsOf(c).n;
      const count = el('td', null, n ? String(n) : '—');
      const next = el('td');
      next.appendChild(nextCell(c));

      tr.append(who, phone, email, count, next);
      body.appendChild(tr);
    }
  }

  // Search, sort and a row's click, which opens its contact.
  const view = pair.table({ sortKey: 'name', draw: drawList });

  async function loadList() {
    const [rows, trips, who] = await Promise.all([
      readContacts(), readTripLinks().catch(() => null), readCustomers().catch(() => new Map()),
    ]);
    contacts = rows;
    customers = who;
    // Trips that would not load leave the list readable, with no counts.
    tripsBy = indexTrips(trips || []);
    $('scheduler-contacts-h').hidden = false;
    $('scheduler-contacts-table').hidden = false;
    drawList();
  }

  /* ══ One contact ════════════════════════════════════════════════════════ */
  const form = $('scheduler-contact-form');
  const field = id => $(`scheduler-c-${id}`);
  const text = id => field(id).value.trim() || null;

  let loaded = null;        // the contact row as the page read it
  // A new contact's id, made once, so a Save sent again cannot insert it twice.
  const newId = crypto.randomUUID();
  let trips = [];           // its trips, as read
  let tripsRead = false;    // whether they have been, since the last load
  let tripsFailed = false;
  let baseline = '';        // the form as loaded, to tell whether it changed

  let customerId = null;    // the customer picked
  let customerText = '';    // the customer field's text

  /* The columns Save writes, read off the form. A blank field saves as null.
     `client` is the customer's name as text, for rux-ui. */
  const readForm = () => ({
    name: text('name'),
    customer_id: customerId,
    client: customers.get(customerId)?.name ?? null,
    phone: text('phone'),
    email: text('email'),
  });
  const WRITTEN = ['name', 'customer_id', 'client', 'phone', 'email'];
  // A row reduced to what Save writes, so a read-back compares like with like.
  const comparable = row => JSON.stringify(WRITTEN.map(k => (row?.[k] === '' || row?.[k] == null ? null : row[k])));
  const snapshot = () => comparable(readForm()) + (customerId ? '' : customerText);
  const dirty = () => baseline !== '' && snapshot() !== baseline;

  function fillForm(c) {
    for (const k of ['name', 'phone', 'email']) field(k).value = c[k] ?? '';
    customerId = c.customer_id && customers.has(c.customer_id) ? c.customer_id : null;
    // A contact not linked yet shows its old typed organization, to be picked.
    customerText = customers.get(customerId)?.name ?? c.client ?? '';
    drawCustomer();
    clearErrors();
  }

  /* The customer: Carbon's combo box over every customer. Design's
     list-box.js filters the options as the field is typed in and says which
     was picked, or none. */
  function drawCustomer() {
    const slot = $('scheduler-c-customer-slot');
    const lab = el('label', 'rux--label', 'Customer');
    lab.setAttribute('for', 'scheduler-c-customer');
    const root = el('div', 'rux--combo-box rux--list-box');
    const box = el('div', 'rux--list-box__field');
    const input = el('input', customerText ? 'rux--text-input' : 'rux--text-input rux--text-input--empty');
    input.type = 'text';
    input.id = 'scheduler-c-customer';
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-haspopup', 'listbox');
    input.setAttribute('aria-expanded', 'false');
    input.autocomplete = 'off';
    input.placeholder = 'Search customers';
    input.value = customerText;
    box.appendChild(input);
    const menu = el('ul', 'rux--list-box__menu');
    menu.setAttribute('role', 'listbox');
    menu.hidden = true;
    for (const c of [...customers.values()].sort((a, b) => folded(a.name).localeCompare(folded(b.name)))) {
      const on = c.id === customerId;
      const option = el('li', on
        ? 'rux--list-box__menu-item rux--list-box__menu-item--active'
        : 'rux--list-box__menu-item');
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', String(on));
      option.dataset.customerId = c.id;
      option.dataset.ruxText = c.name;
      option.appendChild(el('div', 'rux--list-box__menu-item__option', c.name));
      menu.appendChild(option);
    }
    root.append(box, menu);
    const req = el('div', 'rux--form-requirement');
    req.id = 'scheduler-c-customer-error';
    const wrap = el('div', 'rux--list-box__wrapper');
    wrap.append(lab, root, req);
    // Typing drops the pick; choosing an option sets the field without an
    // input event, then says which it was.
    input.addEventListener('input', () => {
      customerId = null;
      customerText = input.value.trim();
    });
    root.addEventListener('rux:listbox-selected', e => {
      customerId = e.detail?.option?.dataset.customerId ?? null;
      customerText = input.value.trim();
      showCustomerError('');
    });
    // Design's list-box.js listens on the document, so a field built now works.
    slot.replaceChildren(wrap);
  }
  const showCustomerError = message => pair.comboError($('scheduler-c-customer'), 'scheduler-c-customer-error', message);
  function drawTitle() {
    const name = loaded?.name || null;
    $('scheduler-contact-h').textContent = name || 'New contact';
    document.title = `${name || 'New contact'} — Scheduler`;
    // A contact not yet saved has no trips, so no Trips tab and no Delete.
    $('scheduler-contact-tabs').hidden = !loaded;
    drawDelete();
  }

  // ── validation ──
  const ERRORS = ['name', 'email'];
  function clearErrors() {
    for (const id of ERRORS) showError(id, '');
  }
  const showError = (id, message) => pair.textError(field(id), `scheduler-c-${id}-error`, message);
  function validate() {
    clearErrors();
    let first = null;
    if (!text('name')) { showError('name', 'Enter a name.'); first ??= field('name'); }
    const email = text('email');
    if (email && !EMAIL.test(email)) {
      showError('email', 'Use an email address, such as name@example.com.');
      first ??= field('email');
    }
    showCustomerError('');
    if (!customerId && customerText) {
      showCustomerError('Pick a customer from the list, or clear the field.');
      first ??= $('scheduler-c-customer');
    }
    first?.focus();
    return !first;
  }

  // ── trips, read only ──
  async function loadTrips() {
    const id = loaded.id;
    const { data, error } = await client.from('trips')
      .select(`id,trip_ref,destination,customer,start_date,end_date,cancelled_at,${SLOTS.join(',')}`)
      .or(SLOTS.map(s => `${s}.eq.${id}`).join(','))
      .order('start_date', { ascending: false });
    tripsFailed = !!error;
    tripsRead = true;
    trips = error ? [] : (data || []).filter(t => day(t.start_date));
    drawTrips();
    drawDelete();
  }
  function drawTrips() {
    const list = $('scheduler-contact-trips');
    list.replaceChildren();
    if (tripsFailed || !trips.length) {
      const li = el('li', 'rux--contained-list-item');
      li.appendChild(el('div', 'rux--contained-list-item__content scheduler-pair-note',
        tripsFailed ? "The trips didn't load." : 'No trips yet.'));
      list.appendChild(li);
      return;
    }
    const now = todayISO();
    for (const t of trips) {
      const from = day(t.start_date);
      const to = day(t.end_date) || from;
      const li = el('li', 'rux--contained-list-item rux--contained-list-item--clickable');
      const a = el('a', 'rux--contained-list-item__content scheduler-pair-trip');
      a.href = `./?trip=${encodeURIComponent(t.id)}&date=${from}`;
      // Carbon lays a clickable item's content out itself, so the two lines
      // stack in a box of their own.
      const lines = el('span', 'scheduler-pair-item');
      lines.appendChild(el('span', 'scheduler-pair-item__main', `${rangeText(from, to)} · ${t.destination || 'No destination'}`));
      const booked = t.booking_contact_id === loaded.id;
      const dayOf = SLOTS.slice(1).some(s => t[s] === loaded.id);
      const detail = [
        t.trip_ref,
        t.customer,
        [booked ? 'Booked it' : null, dayOf ? 'Day-of contact' : null].filter(Boolean).join(' and '),
        t.cancelled_at ? 'Cancelled' : to >= now ? 'Upcoming' : null,
      ].filter(Boolean).join(' · ');
      lines.appendChild(el('span', 'scheduler-pair-item__detail', detail));
      a.appendChild(lines);
      li.appendChild(a);
      list.appendChild(li);
    }
  }

  // ── delete ──
  function drawDelete() {
    const section = $('scheduler-contact-delete-section');
    section.hidden = !loaded;
    if (!loaded) return;
    const button = $('scheduler-contact-delete');
    // Until the trips are read, nothing says the contact is on none.
    const n = trips.length;
    button.disabled = !tripsRead || tripsFailed || n > 0;
    $('scheduler-contact-delete-text').textContent = !tripsRead
      ? 'Checking the trips…'
      : tripsFailed
      ? "The trips didn't load, so this contact can't be deleted now."
      : n > 0
        ? "A trip names this contact, so it can't be deleted."
        : 'This contact is on no trip.';
  }
  // The Delete button opens its modal from markup, `data-rux-open`.
  $('scheduler-contact-delete-confirm')?.addEventListener('click', async () => {
    const button = $('scheduler-contact-delete-confirm');
    button.disabled = true;
    try {
      // Asked again at the moment of deleting, since a trip may have named
      // this contact since the page loaded.
      const id = loaded.id;
      const { data, error } = await client.from('trips').select('id')
        .or(SLOTS.map(s => `${s}.eq.${id}`).join(',')).limit(1);
      if (error) throw error;
      window.Rux?.modal?.close?.('scheduler-contact-delete-modal');
      if (data?.length) {
        await loadTrips();
        result('error', 'A trip names this contact now, so it stays.');
        return;
      }
      const gone = await client.from('contacts').delete().eq('id', id);
      if (gone.error) throw gone.error;
      guard.leave('contacts.html');
    } catch {
      window.Rux?.modal?.close?.('scheduler-contact-delete-modal');
      result('error', "The contact wasn't deleted. Try again.");
    } finally {
      button.disabled = false;
    }
  });

  // ── load, save ──
  async function loadContact() {
    result(null);
    // Every contact is read either way: a new one is checked against them all
    // for someone already here.
    [contacts, customers] = await Promise.all([readContacts(), readCustomers()]);
    if (!contactId) {
      loaded = null;
      trips = [];
      fillForm({});
    } else {
      loaded = contacts.find(c => String(c.id) === contactId) || null;
      if (!loaded) return false;
      fillForm(loaded);
    }
    tripsRead = false;
    drawTitle();
    baseline = snapshot();
    $('scheduler-contact').hidden = false;
    if (loaded) loadTrips();
    return true;
  }

  // The people a new contact may already be, by the trip editor's rule.
  function drawMatches(found) {
    const list = $('scheduler-contact-matches');
    list.replaceChildren();
    for (const c of found) {
      const li = el('li', 'rux--contained-list-item rux--contained-list-item--clickable');
      const a = el('a', 'rux--contained-list-item__content scheduler-pair-trip');
      a.href = `contacts.html?id=${encodeURIComponent(c.id)}`;
      const lines = el('span', 'scheduler-pair-item');
      lines.appendChild(el('span', 'scheduler-pair-item__main', c.name || 'Unnamed contact'));
      lines.appendChild(el('span', 'scheduler-pair-item__detail',
        [c.client, c.phone, c.email].filter(Boolean).join(' · ') || 'No details'));
      a.appendChild(lines);
      li.appendChild(a);
      list.appendChild(li);
    }
  }

  let savingAnyway = false;
  async function save(force = false) {
    if (!validate()) return false;
    const row = readForm();
    if (!loaded && !savingAnyway) {
      const found = contacts.filter(c => samePerson(c, row));
      if (found.length) {
        drawMatches(found);
        window.Rux?.modal?.open?.('scheduler-contact-match-modal');
        return false;
      }
    }
    const saveBtn = $('scheduler-contact-save');
    saveBtn.disabled = true;
    let wrote = false;
    try {
      let id = loaded?.id;
      if (id && !force) {
        const now = await client.from('contacts').select(CONTACT_COLUMNS).eq('id', id).maybeSingle();
        if (now.error) throw now.error;
        if (!now.data || comparable(now.data) !== comparable(loaded)) {
          guard.conflict();
          return false;
        }
      }
      // The write hands back the row as saved and it is held at once, so a
      // Save after a failed read-back neither finds a false conflict nor
      // inserts the person a second time.
      loaded = await window.SchedulerPair.saveRecord(client, 'contacts',
        { id: id ?? newId, creating: !id, row, columns: CONTACT_COLUMNS });
      id = loaded.id;
      wrote = true;
      contacts = [...contacts.filter(c => c.id !== id), loaded];
      drawTitle();
      history.replaceState(null, '', `contacts.html?id=${encodeURIComponent(id)}`);
      currentId = id;
      await reload(id);
      result('success', 'Saved.');
      return true;
    } catch {
      if (wrote) {
        // What the form holds is what was saved, so leaving asks nothing.
        baseline = snapshot();
        result('error', "The contact saved, but the page didn't read it back. Reload the page to see it.");
        return true;
      }
      result('error', "The contact wasn't saved. Try again.");
      return false;
    } finally {
      saveBtn.disabled = false;
    }
  }

  let currentId = contactId;
  async function reload(id = currentId) {
    const { data, error } = await client.from('contacts').select(CONTACT_COLUMNS).eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Contact not found');
    loaded = data;
    contacts = [...contacts.filter(c => c.id !== id), data];
    tripsRead = false;
    fillForm(loaded);
    drawTitle();
    baseline = snapshot();
    loadTrips();
  }

  form?.addEventListener('submit', e => {
    e.preventDefault();
    save();
  });

  // Leaving with unsaved changes, and a conflict found by Save. A link in the
  // match modal closes it before asking.
  const guard = pair.guard({ editing, dirty, save, reload, others: ['scheduler-contact-match-modal'] });
  // Save anyway, past the people the new contact may already be.
  guard.hold('scheduler-contact-match-modal', 'scheduler-contact-match-save', async () => {
    savingAnyway = true;
    try { return await save(); } finally { savingAnyway = false; }
  });

  /* ══ Start ══════════════════════════════════════════════════════════════ */
  pair.start(async signedIn => {
    client = signedIn;
    if (!editing) { await loadList(); return; }
    if (!(await loadContact())) {
      say('info', 'That contact is not in the list', 'Pick a contact from the list below.');
      history.replaceState(null, '', 'contacts.html');
      await loadList();
    }
  });
})();
