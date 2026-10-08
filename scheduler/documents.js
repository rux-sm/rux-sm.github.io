/* ==========================================================================
   documents.js — THE DOCUMENTS PAGE
   --------------------------------------------------------------------------
   documents.html lists the office's own paperwork: insurance certificates,
   the W-9, a driver's background check form. documents.html?id=<id> edits
   one, documents.html?new uploads one, and documents.html?open=<id> opens
   its file. They read and write `company_documents` and `document_kinds`,
   and the files live in the private `company-documents` bucket.

   A document is a file and five facts: its kind, the customer it is issued
   to, the driver it is about, the day it ends and a note. The database keeps
   one current copy for each kind, customer and driver: a new upload makes the
   one before it old, and deleting the current one brings the one before back.
   ========================================================================== */
(() => {
  'use strict';

  const { $, el, svgUse } = window.SchedulerPair;
  const pair = window.SchedulerPair.page({ list: 'documents', one: 'document' });
  const { say, result } = pair;

  const params = new URLSearchParams(location.search);
  const documentId = params.get('id');
  const openId = params.get('open');
  const editing = !!documentId || params.has('new');
  // The record view shows the list's column only for its notice.
  if (editing || openId) $('scheduler-documents-h').hidden = true;

  const BUCKET = 'company-documents';
  const LINK_SECONDS = 600;
  const MAX_BYTES = 20 * 1024 * 1024;
  // An end date this close shows as a warning, as a driver's licence does.
  const WARN_DAYS = 30;
  const COLUMNS = 'id,kind_id,customer_id,driver_id,ends_on,note,file_name,file_path,file_size,replaced_at,created_at,updated_at';
  const TYPES = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };

  const folded = v => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  const DAY = 864e5;
  const parseISO = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
  const today = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
  // Rounded, because a span across a daylight-saving change is 23 or 25 hours.
  const daysUntil = s => Math.round((parseISO(s) - today()) / DAY);
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  // A date field's day as ISO, or null; the picker shows mm/dd/yyyy.
  const fieldDay = v => window.Rux?.datePicker?.toISO?.(v)
    ?? (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? '').trim()) ? String(v).trim() : null);
  const shownDay = v => window.Rux?.datePicker?.format?.(v ?? '') ?? (v || '');
  const longDay = s => parseISO(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  let client = null;
  let kinds = [];
  let documents = [];
  let customers = new Map();  // customer id → customer
  let drivers = new Map();    // driver id → driver

  // ── reading ─────────────────────────────────────────────────────────────
  const read = async (table, columns, order) => {
    const { data, error } = await client.from(table).select(columns).order(order);
    if (error) throw error;
    return data || [];
  };
  async function readAll() {
    const [k, d, c, p] = await Promise.all([
      read('document_kinds', 'id,name,per_driver,updated_at', 'name'),
      read('company_documents', COLUMNS, 'created_at'),
      read('customers', 'id,name', 'name'),
      read('drivers', 'id,name,short_name,status', 'name'),
    ]);
    kinds = k;
    documents = d;
    customers = new Map(c.map(row => [row.id, row]));
    drivers = new Map(p.map(row => [row.id, row]));
  }

  const kindOf = doc => kinds.find(k => k.id === doc.kind_id) || null;
  const customerOf = doc => customers.get(doc.customer_id) || null;
  const driverOf = doc => drivers.get(doc.driver_id) || null;
  const isOld = doc => !!doc.replaced_at;

  /* Whether a document has ended or is about to. `rank` sorts the list by it:
     the longest ended first, then the soonest to end, then those with no end
     date. */
  function ending(doc) {
    if (!doc.ends_on) return { kind: 'ok', text: '—', rank: Infinity };
    const n = daysUntil(doc.ends_on);
    const day = longDay(doc.ends_on);
    if (n < 0) return { kind: 'ended', text: `Ended ${day}`, rank: n };
    if (n === 0) return { kind: 'soon', text: 'Ends today', rank: n };
    if (n <= WARN_DAYS) return { kind: 'soon', text: `Ends in ${plural(n, 'day')}`, rank: n };
    return { kind: 'ok', text: day, rank: n };
  }
  // Each status icon written out whole, so the class sweep can read it.
  const INDICATOR = {
    ended: { cls: 'rux--icon-indicator--failed', icon: '#m-error-fill' },
    soon: { cls: 'rux--icon-indicator--caution-minor', icon: '#m-warning-fill' },
  };
  function indicator(c) {
    if (c.kind === 'ok') return el('span', null, c.text);
    const box = el('div', 'rux--icon-indicator');
    box.append(svgUse(INDICATOR[c.kind].icon, '16', '0 0 32 32', INDICATOR[c.kind].cls), c.text);
    return box;
  }

  // A file's ten-minute link, or '' when the bucket will not sign one.
  const linkTo = path => client.storage.from(BUCKET).createSignedUrl(path, LINK_SECONDS)
    .then(({ data, error }) => (error ? '' : data?.signedUrl || ''), () => '');

  /* ══ Opening a file ═════════════════════════════════════════════════════
     documents.html?open=<id> is the address a document's row, a customer's
     page and a trip's Forms list link to. It signs a link and goes there, so
     the browser's own viewer shows the file with its download and print
     buttons, and the address stays good after any one link has run out. */
  async function openDocument() {
    const { data, error } = await client.from('company_documents')
      .select('id,file_path').eq('id', openId).maybeSingle();
    if (error) throw error;
    const url = data ? await linkTo(data.file_path) : '';
    if (!url) {
      say('info', data ? "The file didn't open" : 'That document is not in the list',
        data ? 'Reload the page to try again.' : 'Pick a document from the list below.');
      history.replaceState(null, '', 'documents.html');
      await loadList();
      return;
    }
    location.replace(url);
  }

  /* ══ The list ═══════════════════════════════════════════════════════════ */
  const holderOf = doc => [driverOf(doc)?.name, customerOf(doc)?.name].filter(Boolean);
  const byKind = (a, b) => folded(kindOf(a)?.name).localeCompare(folded(kindOf(b)?.name))
    || folded(holderOf(a).join(' ')).localeCompare(folded(holderOf(b).join(' ')))
    || String(b.created_at).localeCompare(String(a.created_at));
  // A document for nobody in particular sorts after every one with a holder.
  const SORTS = {
    kind: byKind,
    holder: (a, b) => {
      const x = holderOf(a).join(' '), y = holderOf(b).join(' ');
      return !x && !y ? 0 : !x ? 1 : !y ? -1 : folded(x).localeCompare(folded(y));
    },
    ends: (a, b) => ending(a).rank - ending(b).rank,
  };
  // Every word typed has to be somewhere in the row.
  const matches = (doc, q) => {
    const hay = folded([kindOf(doc)?.name, ...holderOf(doc), doc.file_name, doc.note].filter(Boolean).join(' '));
    return folded(q).split(' ').filter(Boolean).every(word => hay.includes(word));
  };

  function drawList() {
    const { query, sortKey, sortDir } = view;
    const showOld = $('scheduler-documents-old').checked;
    const all = documents.filter(d => showOld || !isOld(d));
    const shown = all
      .filter(d => matches(d, query))
      .sort((a, b) => {
        if (sortDir === 'none') return byKind(a, b);
        const r = SORTS[sortKey](a, b);
        if (r) return sortDir === 'descending' ? -r : r;
        return byKind(a, b);
      });
    view.count(shown.length, all.length);

    const body = $('scheduler-documents-rows');
    body.replaceChildren();
    if (!shown.length) {
      const tr = el('tr');
      const td = el('td', null, query ? `No documents match “${query}”.` : 'No documents yet.');
      td.colSpan = 4;
      tr.appendChild(td);
      body.appendChild(tr);
      return;
    }
    for (const doc of shown) {
      const tr = el('tr', 'scheduler-pair-row');
      tr.dataset.open = doc.id;

      const what = el('td');
      const cell = el('div', 'scheduler-pair-cell');
      const lines = el('div', 'scheduler-pair-cell__lines');
      const link = el('a', 'scheduler-pair-cell__name', kindOf(doc)?.name || 'Document');
      link.href = `documents.html?open=${encodeURIComponent(doc.id)}`;
      link.target = '_blank';
      link.rel = 'noopener';
      lines.append(link, el('span', 'scheduler-pair-cell__detail',
        [isOld(doc) ? 'Old copy' : null, doc.note || doc.file_name].filter(Boolean).join(' · ')));
      cell.appendChild(lines);
      what.appendChild(cell);

      const who = el('td');
      const [first, second] = holderOf(doc);
      if (first) {
        const wl = el('div', 'scheduler-pair-cell__lines');
        wl.appendChild(el('span', null, first));
        if (second) wl.appendChild(el('span', 'scheduler-pair-cell__detail', second));
        who.appendChild(wl);
      } else {
        who.appendChild(el('span', 'scheduler-pair-note', '—'));
      }

      const ends = el('td');
      ends.appendChild(isOld(doc) ? el('span', 'scheduler-pair-note', doc.ends_on ? longDay(doc.ends_on) : '—') : indicator(ending(doc)));

      const act = el('td', 'scheduler-documents-act');
      const edit = el('a', 'rux--link', 'Edit');
      edit.href = `documents.html?id=${encodeURIComponent(doc.id)}`;
      act.appendChild(edit);

      tr.append(what, who, ends, act);
      body.appendChild(tr);
    }
  }

  // Search and sort. A row's click opens its file in a new tab, as its name does.
  const view = pair.table({ sortKey: 'kind', draw: drawList });
  $('scheduler-documents-rows')?.addEventListener('click', e => {
    const tr = e.target.closest('tr[data-open]');
    if (!tr || e.target.closest('a')) return;
    window.open(`documents.html?open=${encodeURIComponent(tr.dataset.open)}`, '_blank', 'noopener');
  });
  $('scheduler-documents-old')?.addEventListener('change', drawList);

  async function loadList() {
    await readAll();
    $('scheduler-documents-h').hidden = false;
    $('scheduler-documents-table').hidden = false;
    // A link from a customer's page arrives narrowed to that customer.
    const from = customers.get(params.get('customer'));
    if (from && !view.query) {
      const search = $('scheduler-documents-search');
      search.value = from.name;
      search.dispatchEvent(new Event('input'));
      return;
    }
    drawList();
  }

  /* ══ The kinds ══════════════════════════════════════════════════════════
     The list's Kinds button opens every kind to rename, mark as one for each
     driver, or add to. A kind is never deleted here, because a document or a
     customer may name it. */
  let kindRows = [];
  const kindSay = text => {
    const note = $('scheduler-kinds-error');
    note.textContent = text || '';
    note.hidden = !text;
  };
  function drawKinds() {
    const list = $('scheduler-kinds-rows');
    list.replaceChildren(...kindRows.map((row, i) => {
      const line = el('div', 'scheduler-kinds-row');
      const item = el('div', 'rux--form-item rux--text-input-wrapper');
      const lw = el('div', 'rux--text-input__label-wrapper');
      const label = el('label', 'rux--label rux--visually-hidden', 'Kind');
      label.setAttribute('for', `scheduler-kind-name-${i}`);
      lw.appendChild(label);
      const outer = el('div', 'rux--text-input__field-outer-wrapper');
      const wrap = el('div', 'rux--text-input__field-wrapper');
      const input = el('input', 'rux--text-input');
      input.type = 'text';
      input.id = `scheduler-kind-name-${i}`;
      input.autocomplete = 'off';
      input.placeholder = 'Kind of document';
      input.value = row.name;
      input.addEventListener('input', () => { row.name = input.value; });
      wrap.appendChild(input);
      outer.appendChild(wrap);
      item.append(lw, outer);

      const check = el('div', 'rux--form-item rux--checkbox-wrapper');
      const box = el('input', 'rux--checkbox');
      box.type = 'checkbox';
      box.id = `scheduler-kind-driver-${i}`;
      box.checked = row.per_driver;
      box.addEventListener('change', () => { row.per_driver = box.checked; });
      const boxLabel = el('label', 'rux--checkbox-label');
      boxLabel.setAttribute('for', box.id);
      boxLabel.appendChild(el('div', 'rux--checkbox-label-text', 'One for each driver'));
      check.append(box, boxLabel);

      line.append(item, check);
      return line;
    }));
  }
  function openKinds() {
    kindRows = kinds.map(k => ({ id: k.id, name: k.name, per_driver: k.per_driver }));
    kindSay('');
    drawKinds();
  }
  $('scheduler-documents-kinds')?.addEventListener('click', openKinds);
  $('scheduler-kinds-add')?.addEventListener('click', () => {
    kindRows.push({ id: null, name: '', per_driver: false });
    drawKinds();
    $(`scheduler-kind-name-${kindRows.length - 1}`)?.focus();
  });
  $('scheduler-kinds-save')?.addEventListener('click', async () => {
    const rows = kindRows.map(r => ({ ...r, name: r.name.trim() })).filter(r => r.id || r.name);
    if (rows.some(r => !r.name)) return kindSay('Give every kind a name.');
    const names = rows.map(r => folded(r.name));
    if (new Set(names).size !== names.length) return kindSay('Two kinds have the same name.');
    const button = $('scheduler-kinds-save');
    button.disabled = true;
    try {
      for (const row of rows) {
        const was = kinds.find(k => k.id === row.id);
        if (was && was.name === row.name && was.per_driver === row.per_driver) continue;
        const fields = { name: row.name, per_driver: row.per_driver };
        const { error } = was
          ? await client.from('document_kinds').update(fields).eq('id', row.id)
          : await client.from('document_kinds').insert(fields);
        if (error) throw error;
      }
      kinds = await read('document_kinds', 'id,name,per_driver,updated_at', 'name');
      window.Rux?.modal?.close?.('scheduler-kinds-modal');
      drawList();
    } catch {
      kindSay("The kinds weren't saved. Try again.");
    } finally {
      button.disabled = false;
    }
  });

  /* ══ One document ═══════════════════════════════════════════════════════ */
  const form = $('scheduler-document-form');
  const kindField = $('scheduler-doc-kind');
  const driverField = $('scheduler-doc-driver');
  const endsField = $('scheduler-doc-ends');
  const noteField = $('scheduler-doc-note');
  const fileInput = $('scheduler-doc-file');

  let loaded = null;
  // A new record's id, made once, so a Save sent again cannot insert it twice.
  let newId = crypto.randomUUID();
  let chosen = null;        // the file picked and not yet saved
  let customerId = null;    // the customer picked
  let customerText = '';    // the customer field's text
  let baseline = '';

  const perDriver = () => !!kinds.find(k => k.id === kindField.value)?.per_driver;
  const readForm = () => ({
    kind_id: kindField.value || null,
    customer_id: customerId,
    driver_id: perDriver() ? driverField.value || null : null,
    ends_on: fieldDay(endsField.value),
    note: noteField.value.trim() || null,
  });
  const snapshot = () => JSON.stringify([readForm(), customerId ? '' : customerText, chosen?.name ?? '']);
  const dirty = () => baseline !== '' && snapshot() !== baseline;

  /* The customer a document is issued to: Carbon's combo box over every
     customer. Design's list-box.js filters the options as the field is typed
     in and says which was picked, or none. Left empty, the document is a
     general one. */
  function drawCustomer() {
    const slot = $('scheduler-doc-customer-slot');
    const lab = el('label', 'rux--label', 'Issued to');
    lab.setAttribute('for', 'scheduler-doc-customer');
    const root = el('div', 'rux--combo-box rux--list-box');
    const box = el('div', 'rux--list-box__field');
    const current = customers.get(customerId);
    const input = el('input', current ? 'rux--text-input' : 'rux--text-input rux--text-input--empty');
    input.type = 'text';
    input.id = 'scheduler-doc-customer';
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-haspopup', 'listbox');
    input.setAttribute('aria-expanded', 'false');
    input.autocomplete = 'scheduler-customer-field';
    input.placeholder = 'Search customers';
    input.value = current?.name ?? '';
    box.appendChild(input);
    const menu = el('ul', 'rux--list-box__menu');
    menu.setAttribute('role', 'listbox');
    menu.hidden = true;
    for (const c of customers.values()) {
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
    req.id = 'scheduler-doc-customer-error';
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
    slot.replaceChildren(wrap);
  }

  function drawSelects() {
    kindField.replaceChildren(...[{ id: '', name: 'Pick a kind' }, ...kinds].map(k => {
      const option = el('option', 'rux--select-option', k.name);
      option.value = k.id;
      return option;
    }));
    // The active drivers, and whoever the document already names.
    const offered = [...drivers.values()]
      .filter(d => (d.status || 'active') === 'active' || d.id === loaded?.driver_id);
    driverField.replaceChildren(...[{ id: '', name: 'Pick a driver' }, ...offered].map(d => {
      const option = el('option', 'rux--select-option', d.name);
      option.value = d.id;
      return option;
    }));
  }
  // The driver is asked for only by a kind kept once for each driver.
  const drawDriver = () => { $('scheduler-doc-driver-item').hidden = !perDriver(); };
  kindField?.addEventListener('change', () => { drawDriver(); showKindError(''); });
  driverField?.addEventListener('change', () => showDriverError(''));

  /* The file: Design's drop button, then the one file the document holds or
     is about to. Picking another on a saved document replaces its file with
     the next Save, and the copy before it is kept as an old one. */
  function drawFile() {
    const list = $('scheduler-doc-file-list');
    const name = chosen?.name ?? loaded?.file_name;
    list.replaceChildren();
    $('scheduler-doc-file-drop').textContent = loaded
      ? 'Drag and drop a new copy here or click to choose one'
      : 'Drag and drop the file here or click to choose it';
    if (!name) return;
    const item = el('span', 'rux--file__selected-file rux--file__selected-file--md');
    const wrap = el('div', 'rux--file-filename-container-wrap');
    const tip = el('span', 'rux--popover-container rux--popover--caret rux--popover--high-contrast rux--popover--bottom rux--tooltip rux--file-filename-tooltip');
    const trigger = el('div', 'rux--tooltip-trigger__wrapper');
    const button = el('button', 'rux--file-filename-button');
    button.type = 'button';
    button.setAttribute('aria-labelledby', 'scheduler-doc-file-tip');
    button.appendChild(el('p', 'rux--file-filename-button', name));
    trigger.appendChild(button);
    const pop = el('span', 'rux--popover');
    pop.setAttribute('role', 'tooltip');
    pop.id = 'scheduler-doc-file-tip';
    pop.setAttribute('aria-hidden', 'true');
    pop.append(el('span', 'rux--popover-content rux--tooltip-content', name), el('span', 'rux--popover-caret'));
    tip.append(trigger, pop);
    wrap.appendChild(tip);
    const state = el('span', 'rux--file__state-container');
    if (chosen) {
      // A file picked and not saved can be put back.
      const close = el('button', 'rux--file-close');
      close.type = 'button';
      close.setAttribute('aria-label', `Remove ${name}`);
      close.appendChild(svgUse('#m-close', '16', '0 0 32 32'));
      close.addEventListener('click', () => { chosen = null; fileInput.value = ''; drawFile(); });
      state.appendChild(close);
    }
    const stateBox = el('div');
    stateBox.appendChild(state);
    item.append(wrap, stateBox);
    list.appendChild(item);
    // The saved file's name opens it, as its row in the list does.
    if (!chosen && loaded) {
      button.addEventListener('click', () => window.open(`documents.html?open=${encodeURIComponent(loaded.id)}`, '_blank', 'noopener'));
    }
  }
  function choose(file) {
    if (!file) return;
    const ext = String(file.name || '').split('.').pop().toLowerCase();
    if (!TYPES[ext]) return showFileError('Choose a PDF, a JPEG or a PNG.');
    if (file.size > MAX_BYTES) return showFileError('That file is over 20 MB. Choose a smaller one.');
    showFileError('');
    chosen = file;
    drawFile();
  }
  const drop = $('scheduler-doc-file-drop');
  drop?.addEventListener('click', () => fileInput.click());
  fileInput?.addEventListener('change', () => choose(fileInput.files?.[0]));
  drop?.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('rux--file__drop-container--drag-over'); });
  drop?.addEventListener('dragleave', () => drop.classList.remove('rux--file__drop-container--drag-over'));
  drop?.addEventListener('drop', e => {
    e.preventDefault();
    drop.classList.remove('rux--file__drop-container--drag-over');
    choose(e.dataTransfer?.files?.[0]);
  });

  function fillForm(doc) {
    drawSelects();
    kindField.value = doc.kind_id ?? '';
    customerId = doc.customer_id ?? null;
    customerText = customers.get(customerId)?.name ?? '';
    driverField.value = doc.driver_id ?? '';
    endsField.value = shownDay(doc.ends_on ? String(doc.ends_on).slice(0, 10) : '');
    noteField.value = doc.note ?? '';
    chosen = null;
    fileInput.value = '';
    drawCustomer();
    drawDriver();
    drawFile();
    for (const clear of [showKindError, showDriverError, showFileError]) clear('');
  }

  function drawTitle() {
    const name = loaded ? kindOf(loaded)?.name || 'Document' : 'Upload a document';
    $('scheduler-document-h').textContent = name;
    document.title = `${name} — Scheduler`;
    $('scheduler-document-old').hidden = !(loaded && isOld(loaded));
    $('scheduler-document-open').hidden = !loaded;
    if (loaded) $('scheduler-document-open').href = `documents.html?open=${encodeURIComponent(loaded.id)}`;
    $('scheduler-document-delete-section').hidden = !loaded;
  }

  // ── validation ──
  // A select's error, as Carbon's invalid state draws it.
  function selectError(select, errorId, message) {
    const root = select.closest('.rux--select');
    const wrap = select.closest('.rux--select-input__wrapper');
    const on = !!message;
    root.classList.toggle('rux--select--invalid', on);
    wrap.toggleAttribute('data-invalid', on);
    select.toggleAttribute('data-invalid', on);
    if (on) select.setAttribute('aria-invalid', 'true'); else select.removeAttribute('aria-invalid');
    select.setAttribute('aria-describedby', errorId);
    let icon = wrap.querySelector('.rux--select__invalid-icon');
    if (on && !icon) wrap.appendChild(svgUse('#m-report-fill', '16', '0 0 32 32', 'rux--select__invalid-icon'));
    if (!on) icon?.remove();
    $(errorId).textContent = message;
  }
  const showKindError = message => selectError(kindField, 'scheduler-doc-kind-error', message);
  const showDriverError = message => selectError(driverField, 'scheduler-doc-driver-error', message);
  const showCustomerError = message => pair.comboError($('scheduler-doc-customer'), 'scheduler-doc-customer-error', message);
  const showFileError = message => {
    const note = $('scheduler-doc-file-error');
    note.textContent = message;
    note.hidden = !message;
  };
  function validate() {
    for (const clear of [showKindError, showDriverError, showCustomerError, showFileError]) clear('');
    let first = null;
    const bad = (show, message, field) => { show(message); first = first || field; };
    if (!loaded && !chosen) bad(showFileError, 'Choose the file to upload.', drop);
    if (!kindField.value) bad(showKindError, 'Pick the kind of document.', kindField);
    if (!customerId && customerText) bad(showCustomerError, 'Pick a customer from the list, or clear the field.', $('scheduler-doc-customer'));
    if (perDriver() && !driverField.value) bad(showDriverError, 'Pick the driver this is for.', driverField);
    first?.focus();
    return !first;
  }

  // ── delete ──
  $('scheduler-document-delete-confirm')?.addEventListener('click', async () => {
    const button = $('scheduler-document-delete-confirm');
    button.disabled = true;
    try {
      // The row first, so a failure leaves a stored file at worst and never a
      // row that points at nothing.
      const gone = await client.from('company_documents').delete().eq('id', loaded.id);
      if (gone.error) throw gone.error;
      await client.storage.from(BUCKET).remove([loaded.file_path]);
      guard.leave('documents.html');
    } catch {
      window.Rux?.modal?.close?.('scheduler-document-delete-modal');
      result('error', "The document wasn't deleted. Try again.");
    } finally {
      button.disabled = false;
    }
  });

  // ── load, save ──
  async function loadDocument() {
    result(null);
    await readAll();
    if (!documentId) {
      loaded = null;
      // A link from a customer's page or a trip's Forms list arrives filled.
      fillForm({
        kind_id: kinds.find(k => k.id === params.get('kind'))?.id,
        customer_id: customers.get(params.get('customer'))?.id,
        driver_id: drivers.get(params.get('driver'))?.id,
      });
    } else {
      loaded = documents.find(d => String(d.id) === documentId) || null;
      if (!loaded) return false;
      fillForm(loaded);
    }
    drawTitle();
    baseline = snapshot();
    $('scheduler-document').hidden = false;
    return true;
  }

  // The name a file is stored under: accents stripped, lowercased, hyphenated.
  const slug = name => {
    const at = name.lastIndexOf('.');
    const ext = at > 0 ? name.slice(at + 1).toLowerCase() : '';
    const base = (at > 0 ? name.slice(0, at) : name).normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'document';
    return ext ? `${base}.${ext}` : base;
  };
  const SAME = 'Another current document has this kind, customer and driver. Open that one and replace its file.';

  async function save(force = false) {
    if (!validate()) return false;
    const row = readForm();
    const saveBtn = $('scheduler-document-save');
    saveBtn.disabled = true;
    let uploaded = null;
    try {
      if (loaded && !force) {
        const now = await client.from('company_documents').select('updated_at').eq('id', loaded.id).maybeSingle();
        if (now.error) throw now.error;
        if (!now.data || now.data.updated_at !== loaded.updated_at) {
          guard.conflict();
          return false;
        }
      }
      let id = loaded?.id;
      if (chosen) {
        /* A new file is a new row: the upload first, then the row, so a row
           never points at nothing. A second try of a Save whose answer was
           lost finds its file already there, which is the same file. */
        const path = `${newId}/${slug(chosen.name)}`;
        const ext = chosen.name.split('.').pop().toLowerCase();
        const up = await client.storage.from(BUCKET).upload(path, chosen, { contentType: TYPES[ext], upsert: false });
        if (up.error && !/exists/i.test(up.error.message || '')) throw up.error;
        uploaded = path;
        const made = await window.SchedulerPair.saveRecord(client, 'company_documents', {
          id: newId, creating: true, columns: COLUMNS,
          row: { ...row, file_name: chosen.name, file_path: path, file_size: chosen.size },
        });
        uploaded = null;
        // The copy this one replaces is old now, whatever facts changed with it.
        if (loaded && !isOld(loaded)) {
          await client.from('company_documents').update({ replaced_at: new Date().toISOString() })
            .eq('id', loaded.id).is('replaced_at', null);
        }
        id = made.id;
        newId = crypto.randomUUID();
      } else {
        await window.SchedulerPair.saveRecord(client, 'company_documents',
          { id, creating: false, row, columns: COLUMNS });
      }
      history.replaceState(null, '', `documents.html?id=${encodeURIComponent(id)}`);
      currentId = id;
      await reload(id);
      result('success', 'Saved.');
      return true;
    } catch (error) {
      // A file whose row never landed is taken back out.
      if (uploaded) await client.storage.from(BUCKET).remove([uploaded]).catch(() => {});
      result('error', error?.code === '23505' ? SAME : "The document wasn't saved. Try again.");
      return false;
    } finally {
      saveBtn.disabled = false;
    }
  }

  let currentId = documentId;
  async function reload(id = currentId) {
    await readAll();
    loaded = documents.find(d => d.id === id) || null;
    if (!loaded) throw new Error('Document not found');
    fillForm(loaded);
    drawTitle();
    baseline = snapshot();
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
    if (openId) { await openDocument(); return; }
    if (!editing) { await loadList(); return; }
    if (!(await loadDocument())) {
      say('info', 'That document is not in the list', 'Pick a document from the list below.');
      history.replaceState(null, '', 'documents.html');
      await loadList();
    }
  });
})();
