/* ==========================================================================
   partners.js — THE PARTNERS PAGE
   --------------------------------------------------------------------------
   partners.html lists every partner. partners.html?id=<partner id> opens one
   partner's profile and partners.html?new makes one. They read and write
   `partners`.

   A partner is a company, or an owner-operator, that covers a bus of a trip
   with its own coach and driver. Its profile is the office's: the details
   on its Details tab, its papers on its Documents tab, which the Documents
   page uploads and comes back from, and on its Trips tab every bus it has
   covered, with what the office pays it. Its Contacts tab lists its people, contacts
   that name it, one of them its main contact, and its Drivers tab its own
   drivers, `partner_drivers`, never ours, each saved from its own window.
   The papers every partner must hold,
   the kinds marked so on the Documents page, are listed whether held or not,
   since the board warns of a covered bus whose partner lacks one. A partner
   a trip or a paper names is set Inactive, never deleted.
   ========================================================================== */
(() => {
  'use strict';

  const { $, el, svgUse, statusTag } = window.SchedulerPair;
  const showPhone = window.SchedulerPhone.format;
  const pair = window.SchedulerPair.page({ list: 'partners', one: 'partner' });
  const { say, result } = pair;

  const params = new URLSearchParams(location.search);
  const partnerId = params.get('id');
  const editing = !!partnerId || params.has('new');
  // The record view shows the list's column only for its notice.
  if (editing) $('scheduler-partners-h').hidden = true;

  const COLUMNS = 'id,name,phone,email,main_contact_id,usdot_number,notes,status,updated_at';
  const usd = n => Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const folded = v => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  const day = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
  const longDay = s => day(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const Status = window.SchedulerDocumentStatus;

  let client = null;

  /* ══ Papers ═════════════════════════════════════════════════════════════
     The kinds every partner must hold, and each partner's current papers,
     read once for the list and for one profile alike. */
  let required = [];          // the kinds every partner must hold
  let names = new Map();      // kind id → name
  let current = new Map();    // partner id → its current papers, newest first
  async function readPapers(id = null) {
    let docs = client.from('company_documents').select('id,kind_id,partner_id,holder,ends_on,parts,note')
      .not('partner_id', 'is', null).is('replaced_at', null).order('created_at', { ascending: false });
    if (id) docs = docs.eq('partner_id', id);
    const [kinds, held] = await Promise.all([client.from('document_kinds').select('id,name,partner_required').order('name'), docs]);
    if (kinds.error || held.error) throw kinds.error || held.error;
    names = new Map((kinds.data || []).map(k => [k.id, k.name]));
    required = (kinds.data || []).filter(k => k.partner_required);
    current = new Map();
    for (const d of held.data || []) {
      if (!current.has(d.partner_id)) current.set(d.partner_id, []);
      current.get(d.partner_id).push({ ...d, kind: names.get(d.kind_id) || 'Document' });
    }
  }
  /* What a partner's papers say in a line, the worst first: a required kind
     it lacks, then one that has ended or ends soon, by document-status.js,
     or that every one it must hold is on file. `rank` sorts by it. */
  function papersOf(p) {
    const mine = current.get(p.id) || [];
    const lacking = required.filter(k => !mine.some(d => d.kind_id === k.id)).map(k => k.name);
    if (lacking.length) return { text: `No ${lacking.join(', ')} on file`, rank: -Infinity, state: 'ended' };
    const worst = mine.map(d => ({ d, s: Status.of(d) })).sort((a, b) => a.s.rank - b.s.rank)[0];
    if (worst && (worst.s.state === 'ended' || worst.s.state === 'soon')) {
      return { text: `${worst.d.kind}: ${worst.s.text}`, rank: worst.s.rank, state: worst.s.state };
    }
    return { text: required.length ? 'All on file' : mine.length ? `${mine.length} on file` : 'None on file', rank: Infinity, state: null };
  }
  // Each status icon written out whole, so the class sweep can read it.
  const INDICATOR = {
    ended: { cls: 'rux--icon-indicator--failed', icon: '#m-error-fill' },
    soon: { cls: 'rux--icon-indicator--caution-minor', icon: '#m-warning-fill' },
  };

  /* ══ The list ═══════════════════════════════════════════════════════════ */
  let partners = [];

  const byName = (a, b) => folded(a.name).localeCompare(folded(b.name));
  const SORTS = {
    name: byName,
    papers: (a, b) => papersOf(a).rank - papersOf(b).rank,
    status: (a, b) => String(a.status).localeCompare(String(b.status)),
  };
  const matches = (p, q) => {
    if (!q) return true;
    return folded([p.name, mains.get(p.main_contact_id)?.name, p.phone, p.email, p.usdot_number].filter(Boolean).join(' ')).includes(folded(q));
  };

  function drawList() {
    const { query, sortKey, sortDir } = view;
    const shown = partners
      .filter(p => matches(p, query))
      .sort((a, b) => {
        if (sortDir === 'none') return byName(a, b);
        const r = SORTS[sortKey](a, b);
        if (r) return sortDir === 'descending' ? -r : r;
        return byName(a, b);
      });
    view.count(shown.length, partners.length);

    const body = $('scheduler-partners-rows');
    body.replaceChildren();
    if (!shown.length) {
      const tr = el('tr');
      const td = el('td', null, query ? `No partners match “${query}”.` : 'No partners yet.');
      td.colSpan = 3;
      tr.appendChild(td);
      body.appendChild(tr);
      return;
    }
    for (const p of shown) {
      const tr = el('tr', 'scheduler-pair-row');
      tr.dataset.id = p.id;

      const who = el('td');
      const cell = el('div', 'scheduler-pair-cell');
      const lines = el('div', 'scheduler-pair-cell__lines');
      const link = el('a', 'scheduler-pair-cell__name', p.name);
      link.href = `partners.html?id=${encodeURIComponent(p.id)}`;
      lines.appendChild(link);
      // Its main contact and their phone, or the company's phone with none.
      const main = mains.get(p.main_contact_id);
      const reach = (main ? [main.name, showPhone(main.phone)] : [showPhone(p.phone)]).filter(Boolean).join(' · ');
      if (reach) lines.appendChild(el('span', 'scheduler-pair-cell__detail', reach));
      cell.appendChild(lines);
      who.appendChild(cell);

      const said = papersOf(p);
      const papers = el('td');
      const mark = INDICATOR[said.state];
      const line = el('span', mark ? 'rux--icon-indicator' : null);
      if (mark) line.appendChild(svgUse(mark.icon, '16', '0 0 32 32', mark.cls));
      line.append(said.text);
      papers.appendChild(line);

      const status = el('td');
      status.appendChild(p.status === 'active' ? statusTag('Active', 'rux--tag--green') : statusTag('Inactive', 'rux--tag--gray'));
      tr.append(who, papers, status);
      body.appendChild(tr);
    }
  }

  // Search, sort and a row's click, which opens its partner.
  const view = pair.table({ sortKey: 'name', draw: drawList });

  let mains = new Map();       // contact id → each partner's main contact
  async function readPartners() {
    const { data, error } = await client.from('partners').select(COLUMNS).order('name');
    if (error) throw error;
    partners = data || [];
    const ids = partners.map(p => p.main_contact_id).filter(Boolean);
    const found = ids.length ? await client.from('contacts').select('id,name,title,phone').in('id', ids) : { data: [] };
    mains = new Map((found.data || []).map(c => [c.id, c]));
  }

  async function loadList() {
    await Promise.all([readPartners(), readPapers()]);
    $('scheduler-partners-h').hidden = false;
    $('scheduler-partners-table').hidden = false;
    drawList();
  }

  /* ══ One partner ════════════════════════════════════════════════════════ */
  const form = $('scheduler-partner-form');
  const field = key => $(`scheduler-pa-${key}`);
  const TEXT = { name: 'name', phone: 'phone', email: 'email', usdot_number: 'usdot', notes: 'notes' };

  let loaded = null;
  // A new record's id, made once, so a Save sent again cannot insert it twice.
  const newId = crypto.randomUUID();
  let baseline = '';

  const readForm = () => ({
    ...Object.fromEntries(Object.entries(TEXT).map(([column, key]) => [column, field(key).value.trim() || null])),
    status: field('status').value || 'active',
    main_contact_id: field('main').value || null,
  });
  const snapshot = () => JSON.stringify(readForm());
  const dirty = () => baseline !== '' && snapshot() !== baseline;

  function fillForm(p) {
    for (const [column, key] of Object.entries(TEXT)) field(key).value = p[column] ?? '';
    field('status').value = p.status === 'inactive' ? 'inactive' : 'active';
    /* The main contact, one of its people, or the one it has if that person
       no longer names it, so a Save never drops it unasked. */
    const offered = [...people];
    if (p.main_contact_id && !offered.some(c => c.id === p.main_contact_id)) {
      const kept = mains.get(p.main_contact_id);
      if (kept) offered.push(kept);
    }
    field('main').replaceChildren(...[{ id: '', name: people.length ? 'None' : 'No contacts yet' }, ...offered].map(c => {
      const option = el('option', 'rux--select-option', [c.name, c.title].filter(Boolean).join(', '));
      option.value = c.id;
      return option;
    }));
    field('main').value = p.main_contact_id ?? '';
    showNameError('');
  }

  function drawTitle() {
    $('scheduler-partner-h').textContent = loaded?.name || 'New partner';
    document.title = `${loaded?.name || 'New partner'} — Scheduler`;
    pair.historyLink(loaded?.id);
    // A partner not yet saved has no papers or trips, so no tabs and no Delete.
    $('scheduler-partner-tabs').hidden = !loaded;
    drawDelete();
  }

  // ── validation ──
  const showNameError = message => pair.textError(field('name'), 'scheduler-pa-name-error', message);
  function validate() {
    showNameError('');
    const name = field('name').value.trim();
    // QuickBooks matches a vendor on its name, so two partners may not share one.
    const message = !name ? 'Enter a name.'
      : partners.some(p => p.id !== loaded?.id && folded(p.name) === folded(name)) ? 'Another partner already has this name.' : '';
    showNameError(message);
    if (message) field('name').focus();
    return !message;
  }

  /* ── papers ──
     The partner's current papers, each opening its file and saying whether
     it is in force, then each kind every partner must hold that it lacks,
     linking to its upload. */
  const uploadLink = kindId => `documents.html?new&partner=${encodeURIComponent(loaded.id)}`
    + (kindId ? `&kind=${encodeURIComponent(kindId)}` : '');
  function drawDocuments() {
    $('scheduler-partner-documents-upload').href = uploadLink();
    $('scheduler-partner-documents-all').href = `documents.html?partner=${encodeURIComponent(loaded.id)}`;
    const list = $('scheduler-partner-documents');
    list.replaceChildren();
    const row = (href, main, detail, away, state = null) => {
      const li = el('li', 'rux--contained-list-item rux--contained-list-item--clickable');
      const a = el('a', 'rux--contained-list-item__content scheduler-pair-trip');
      a.href = href;
      if (away) { a.target = '_blank'; a.rel = 'noopener'; }
      const lines = el('span', 'scheduler-pair-item');
      lines.appendChild(el('span', 'scheduler-pair-item__main', main));
      const mark = INDICATOR[state];
      const said = el('span', mark ? 'scheduler-pair-item__detail rux--icon-indicator' : 'scheduler-pair-item__detail');
      if (mark) said.appendChild(svgUse(mark.icon, '16', '0 0 32 32', mark.cls));
      said.append(detail);
      lines.appendChild(said);
      a.appendChild(lines);
      li.appendChild(a);
      list.appendChild(li);
    };
    const mine = current.get(loaded.id) || [];
    for (const d of mine) {
      const s = Status.of(d);
      row(`documents.html?open=${encodeURIComponent(d.id)}`, d.kind, [s.text, d.note].filter(Boolean).join(' · '), true, s.state);
    }
    for (const k of required.filter(k => !mine.some(d => d.kind_id === k.id))) {
      row(uploadLink(k.id), k.name, 'None on file · Every partner must hold one · Upload', false, 'ended');
    }
    if (!list.children.length) {
      const li = el('li', 'rux--contained-list-item');
      li.appendChild(el('div', 'rux--contained-list-item__content scheduler-pair-note', 'No papers yet.'));
      list.appendChild(li);
    }
  }

  /* ── trips, read only ──
     Every bus this partner has covered, the coming ones soonest first and
     then the past ones newest first, each with the price and whether it
     confirmed. The figure adds up the prices on trips not cancelled. */
  let covered = null;       // null until read, or when the read failed
  async function readCovered(id) {
    covered = null;
    drawTrips();
    const { data, error } = await client.from('trip_assignments')
      .select('id,partner_price,partner_confirmed,trips(id,trip_ref,destination,customer,start_date,cancelled_at)')
      .eq('partner_id', id).limit(2000);
    covered = error ? null : (data || []).filter(a => a.trips);
    drawTrips(!!error);
    drawDelete();
  }
  function drawTrips(failed = false) {
    const list = $('scheduler-partner-trips');
    const figures = $('scheduler-partner-figures');
    list.replaceChildren();
    figures.replaceChildren();
    const only = text => {
      const li = el('li', 'rux--contained-list-item');
      li.appendChild(el('div', 'rux--contained-list-item__content scheduler-pair-note', text));
      list.appendChild(li);
    };
    if (!covered) return only(failed ? "The trips didn't load. Reload the page to try again." : 'Reading the trips…');
    const live = covered.filter(a => !a.trips.cancelled_at);
    const priced = live.filter(a => a.partner_price != null);
    for (const [label, value] of [['Buses covered', String(live.length)], ['Paid to this partner', usd(priced.reduce((n, a) => n + Number(a.partner_price), 0))]]) {
      const cell = el('div');
      cell.append(el('dt', null, label), el('dd', null, value));
      figures.appendChild(cell);
    }
    if (!covered.length) return only('No buses covered yet.');
    const today = new Date().toLocaleDateString('en-CA');
    const coming = covered.filter(a => String(a.trips.start_date) >= today)
      .sort((a, b) => String(a.trips.start_date).localeCompare(String(b.trips.start_date)));
    const past = covered.filter(a => String(a.trips.start_date) < today)
      .sort((a, b) => String(b.trips.start_date).localeCompare(String(a.trips.start_date)));
    for (const a of [...coming, ...past]) {
      const t = a.trips;
      const li = el('li', 'rux--contained-list-item rux--contained-list-item--clickable');
      const link = el('a', 'rux--contained-list-item__content scheduler-pair-trip');
      link.href = `./?trip=${encodeURIComponent(t.id)}&date=${encodeURIComponent(t.start_date || '')}`;
      const lines = el('span', 'scheduler-pair-item');
      lines.appendChild(el('span', 'scheduler-pair-item__main', [t.destination || 'Trip', t.customer].filter(Boolean).join(' · ')));
      lines.appendChild(el('span', 'scheduler-pair-item__detail', [
        t.start_date ? longDay(t.start_date) : null, t.trip_ref ? `#${t.trip_ref}` : null,
        t.cancelled_at ? 'Cancelled' : a.partner_confirmed ? 'Confirmed' : 'Not confirmed',
        a.partner_price != null ? usd(a.partner_price) : 'No price'].filter(Boolean).join(' · ')));
      link.appendChild(lines);
      li.appendChild(link);
      list.appendChild(li);
    }
  }

  /* ── people ──
     The contacts that name this partner, the main one first, each opening
     its contact. */
  let people = [];
  async function readPeople(id) {
    const { data, error } = await client.from('contacts').select('id,name,title,phone,email')
      .eq('partner_id', id).order('name');
    if (error) throw error;
    people = data || [];
  }
  function drawContacts() {
    $('scheduler-partner-contacts-add').href = `contacts.html?new&partner=${encodeURIComponent(loaded.id)}`;
    const list = $('scheduler-partner-contacts');
    list.replaceChildren();
    const main = loaded.main_contact_id;
    const ordered = [...people].sort((a, b) => (b.id === main) - (a.id === main) || folded(a.name).localeCompare(folded(b.name)));
    if (!ordered.length) {
      const li = el('li', 'rux--contained-list-item');
      li.appendChild(el('div', 'rux--contained-list-item__content scheduler-pair-note', 'No contacts yet.'));
      list.appendChild(li);
      return;
    }
    for (const c of ordered) {
      const li = el('li', 'rux--contained-list-item rux--contained-list-item--clickable');
      const a = el('a', 'rux--contained-list-item__content scheduler-pair-trip');
      a.href = `contacts.html?id=${encodeURIComponent(c.id)}`;
      const lines = el('span', 'scheduler-pair-item');
      lines.appendChild(el('span', 'scheduler-pair-item__main', c.name || 'Unnamed contact'));
      lines.appendChild(el('span', 'scheduler-pair-item__detail', [c.id === main ? 'Main contact' : null, c.title,
        showPhone(c.phone), c.email].filter(Boolean).join(' · ') || 'No phone or email'));
      a.appendChild(lines);
      li.appendChild(a);
      list.appendChild(li);
    }
  }

  /* ── drivers ──
     The partner's own drivers, Active first, each opening its window, which
     writes it at once: a driver is not part of the Details form's Save. */
  let drivers = [];
  async function readDrivers(id) {
    const { data, error } = await client.from('partner_drivers').select('id,name,phone,notes,status')
      .eq('partner_id', id).order('name');
    if (error) throw error;
    drivers = data || [];
  }
  function drawDrivers() {
    const list = $('scheduler-partner-drivers');
    list.replaceChildren();
    const ordered = [...drivers].sort((a, b) => (a.status === 'inactive') - (b.status === 'inactive') || folded(a.name).localeCompare(folded(b.name)));
    if (!ordered.length) {
      const li = el('li', 'rux--contained-list-item');
      li.appendChild(el('div', 'rux--contained-list-item__content scheduler-pair-note', 'No drivers yet.'));
      list.appendChild(li);
      return;
    }
    for (const d of ordered) {
      const li = el('li', 'rux--contained-list-item rux--contained-list-item--clickable');
      const open = el('button', 'rux--contained-list-item__content scheduler-pair-trip');
      open.type = 'button';
      open.addEventListener('click', () => openDriver(d));
      const lines = el('span', 'scheduler-pair-item');
      lines.appendChild(el('span', 'scheduler-pair-item__main', d.name));
      lines.appendChild(el('span', 'scheduler-pair-item__detail', [d.status === 'inactive' ? 'Inactive' : null,
        showPhone(d.phone), d.notes].filter(Boolean).join(' · ') || 'No phone'));
      open.appendChild(lines);
      li.appendChild(open);
      list.appendChild(li);
    }
  }
  const driverField = key => $(`scheduler-pd-${key}`);
  let driverOpen = null;      // the driver the window edits, or null for a new one
  function openDriver(d = null) {
    driverOpen = d;
    $('scheduler-partner-driver-h').textContent = d ? d.name : 'Add driver';
    for (const key of ['name', 'phone', 'notes']) driverField(key).value = d?.[key] ?? '';
    driverField('status').value = d?.status === 'inactive' ? 'inactive' : 'active';
    pair.textError(driverField('name'), 'scheduler-pd-name-error', '');
    window.Rux?.modal?.open?.('scheduler-partner-driver-modal');
  }
  $('scheduler-partner-drivers-add')?.addEventListener('click', () => openDriver());
  $('scheduler-partner-driver-save')?.addEventListener('click', async () => {
    const row = {
      name: driverField('name').value.trim(),
      phone: driverField('phone').value.trim() || null,
      notes: driverField('notes').value.trim() || null,
      status: driverField('status').value || 'active',
    };
    // Two of a partner's drivers never share a name, as the database holds.
    const twin = drivers.some(d => d.id !== driverOpen?.id && folded(d.name) === folded(row.name));
    const problem = !row.name ? 'Enter a name.' : twin ? 'This partner already has a driver of this name.' : '';
    pair.textError(driverField('name'), 'scheduler-pd-name-error', problem);
    if (problem) { driverField('name').focus(); return; }
    const button = $('scheduler-partner-driver-save');
    button.disabled = true;
    try {
      const { error } = driverOpen
        ? await client.from('partner_drivers').update(row).eq('id', driverOpen.id)
        : await client.from('partner_drivers').insert({ ...row, partner_id: loaded.id });
      if (error) throw error;
      window.Rux?.modal?.close?.('scheduler-partner-driver-modal');
      await readDrivers(loaded.id);
      drawDrivers();
      result('success', driverOpen ? 'Driver saved.' : 'Driver added.');
    } catch {
      result('error', "The driver wasn't saved. Try again.");
    } finally {
      button.disabled = false;
    }
  });

  // ── delete ──
  function drawDelete() {
    const section = $('scheduler-partner-delete-section');
    section.hidden = !loaded;
    if (!loaded) return;
    const papers = (current.get(loaded.id) || []).length;
    const blocked = covered === null || covered.length > 0 || papers > 0 || people.length > 0;
    $('scheduler-partner-delete').disabled = blocked;
    $('scheduler-partner-delete-text').textContent = covered === null
      ? 'Checking the trips…'
      : covered.length || papers || people.length
        ? "A trip, a paper or a contact names this partner, so it can't be deleted. Set it Inactive instead."
        : 'No trip, paper or contact names this partner. Deleting it takes its drivers with it.';
  }
  // The Delete button opens its modal from markup, `data-rux-open`.
  $('scheduler-partner-delete-confirm')?.addEventListener('click', async () => {
    const button = $('scheduler-partner-delete-confirm');
    button.disabled = true;
    try {
      // The database refuses a partner a trip or a paper names, whatever the page last read.
      const gone = await client.from('partners').delete().eq('id', loaded.id);
      if (gone.error) throw gone.error;
      guard.leave('partners.html');
    } catch {
      window.Rux?.modal?.close?.('scheduler-partner-delete-modal');
      await reload().catch(() => {});
      result('error', "The partner wasn't deleted. A trip or a paper may name it now.");
    } finally {
      button.disabled = false;
    }
  });

  // ── load, save ──
  async function show(id) {
    await Promise.all([readPapers(id), readPeople(id), readDrivers(id)]);
    fillForm(loaded);
    drawTitle();
    drawContacts();
    drawDrivers();
    drawDocuments();
    baseline = snapshot();
    readCovered(id);
  }

  async function loadPartner() {
    result(null);
    // Every partner is read either way: a name is checked against them all.
    await readPartners();
    if (!partnerId) {
      loaded = null;
      people = [];
      fillForm({ status: 'active' });
      drawTitle();
      baseline = snapshot();
    } else {
      loaded = partners.find(p => String(p.id) === partnerId) || null;
      if (!loaded) return false;
      await show(loaded.id);
    }
    $('scheduler-partner').hidden = false;
    // A paper uploaded or a contact added from here comes back to its tab.
    const back = { '#documents': 'documents', '#contacts': 'contacts' }[location.hash];
    if (loaded && back) {
      const tab = $(`scheduler-partner-tab-${back}`);
      window.Rux?.tabs?.select?.(tab.closest('[role="tablist"]'), tab);
      history.replaceState(null, '', location.pathname + location.search);
    }
    return true;
  }

  async function save(force = false) {
    if (!validate()) return false;
    const row = readForm();
    const saveBtn = $('scheduler-partner-save');
    saveBtn.disabled = true;
    let wrote = false;
    try {
      let id = loaded?.id;
      if (id && !force) {
        const now = await client.from('partners').select('updated_at').eq('id', id).maybeSingle();
        if (now.error) throw now.error;
        if (!now.data || now.data.updated_at !== loaded.updated_at) {
          guard.conflict();
          return false;
        }
      }
      // The write hands back the row as saved, so a second Save updates it.
      loaded = await window.SchedulerPair.saveRecord(client, 'partners',
        { id: id ?? newId, creating: !id, row, columns: COLUMNS });
      id = loaded.id;
      wrote = true;
      history.replaceState(null, '', `partners.html?id=${encodeURIComponent(id)}`);
      currentId = id;
      await reload(id);
      result('success', 'Saved.');
      return true;
    } catch {
      if (wrote) {
        // What the form holds is what was saved, so leaving asks nothing.
        baseline = snapshot();
        drawTitle();
        result('error', "The partner saved, but the page didn't read it back. Reload the page to see it.");
        return true;
      }
      result('error', "The partner wasn't saved. Try again.");
      return false;
    } finally {
      saveBtn.disabled = false;
    }
  }

  let currentId = partnerId;
  async function reload(id = currentId) {
    const { data, error } = await client.from('partners').select(COLUMNS).eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Partner not found');
    loaded = data;
    partners = [...partners.filter(p => p.id !== id), data];
    await show(id);
  }

  form?.addEventListener('submit', e => {
    e.preventDefault();
    save();
  });

  // Leaving with unsaved changes, and a conflict found by Save.
  const guard = pair.guard({ editing, dirty, save, reload });

  /* ══ Start ══════════════════════════════════════════════════════════════ */
  pair.start(async signedIn => {
    client = signedIn;
    if (!editing) { await loadList(); return; }
    if (!(await loadPartner())) {
      say('info', 'That partner is not in the list', 'Pick a partner from the list below.');
      history.replaceState(null, '', 'partners.html');
      await loadList();
    }
  });
})();
