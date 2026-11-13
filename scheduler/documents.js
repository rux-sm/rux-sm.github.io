/* ==========================================================================
   documents.js — THE DOCUMENTS PAGE
   --------------------------------------------------------------------------
   documents.html lists the office's own paperwork: insurance certificates,
   the W-9, a driver's background check form, a partner's papers. documents.html?id=<id> edits
   one, documents.html?new uploads one, and documents.html?open=<id> opens
   its file. They read and write `company_documents` and `document_kinds`,
   and the files live in the private `company-documents` bucket.

   A document is a file and seven facts: its kind, the holder named on it, the
   customer it belongs to, the driver it is about, the partner it belongs to,
   the day it ends and a note.
   A kind with parts, as a certificate has its policies, takes a day for each
   part in place of one Ends day, and its row says which part is ending.
   The database keeps one current copy for each kind, holder, customer,
   driver and partner: a new upload makes the one before it old, and deleting the current
   one brings the one before back. A new upload takes several files at once,
   each its own document, named for its holder by its file name.
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
  const COLUMNS = 'id,kind_id,customer_id,driver_id,partner_id,holder,ends_on,parts,note,file_name,file_path,file_size,replaced_at,created_at,updated_at';
  const KIND_COLUMNS = 'id,name,per_driver,partner_required,parts,updated_at';
  const TYPES = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };

  const folded = v => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  // A typed name with its spaces tidied, or null when there is none.
  const clean = v => String(v ?? '').trim().replace(/\s+/g, ' ') || null;
  const parseISO = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
  // A date field's day as ISO, or null; the picker shows mm/dd/yyyy.
  const fieldDay = v => window.Rux?.datePicker?.toISO?.(v)
    ?? (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? '').trim()) ? String(v).trim() : null);
  const shownDay = v => window.Rux?.datePicker?.format?.(v ?? '') ?? (v || '');
  const longDay = s => parseISO(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  let client = null;
  let kinds = [];
  let documents = [];
  let customers = new Map();  // customer id → customer
  let parts = new Map();      // customer id → the names of the customers that are part of it
  let drivers = new Map();    // driver id → driver
  let partners = new Map();   // partner id → partner

  // ── reading ─────────────────────────────────────────────────────────────
  const read = async (table, columns, order) => {
    const { data, error } = await client.from(table).select(columns).order(order);
    if (error) throw error;
    return data || [];
  };
  async function readAll() {
    const [k, d, c, p, q] = await Promise.all([
      read('document_kinds', KIND_COLUMNS, 'name'),
      read('company_documents', COLUMNS, 'created_at'),
      read('customers', 'id,name,part_of_id', 'name'),
      read('drivers', 'id,name,short_name,status', 'name'),
      read('partners', 'id,name,status', 'name'),
    ]);
    kinds = k;
    documents = d;
    customers = new Map(c.map(row => [row.id, row]));
    parts = new Map();
    for (const row of c) {
      if (!row.part_of_id) continue;
      if (!parts.has(row.part_of_id)) parts.set(row.part_of_id, []);
      parts.get(row.part_of_id).push(row.name);
    }
    drivers = new Map(p.map(row => [row.id, row]));
    partners = new Map(q.map(row => [row.id, row]));
  }

  const kindOf = doc => kinds.find(k => k.id === doc.kind_id) || null;
  const customerOf = doc => customers.get(doc.customer_id) || null;
  const driverOf = doc => drivers.get(doc.driver_id) || null;
  const partnerOf = doc => partners.get(doc.partner_id) || null;
  const isOld = doc => !!doc.replaced_at;

  /* Whether a document is in force, by document-status.js. `rank` sorts the
     list by it: the longest ended first, then the soonest to end, then those
     with no end date. */
  const statusOf = doc => window.SchedulerDocumentStatus.of(doc);
  // Each status icon written out whole, so the class sweep can read it.
  const INDICATOR = {
    ended: { cls: 'rux--icon-indicator--failed', icon: '#m-error-fill' },
    soon: { cls: 'rux--icon-indicator--caution-minor', icon: '#m-warning-fill' },
  };

  // A file's ten-minute link, or '' when the bucket will not sign one.
  const linkTo = path => client.storage.from(BUCKET).createSignedUrl(path, LINK_SECONDS)
    .then(({ data, error }) => (error ? '' : data?.signedUrl || ''), () => '');

  /* ══ Opening a file ═════════════════════════════════════════════════════
     documents.html?open=<id> is the address a document's row, a customer's
     page and a trip's Forms list link to. It signs a link and goes there, so
     the browser's own viewer shows the file with its download and print
     buttons, and the address stays good after any one link has run out.

     A form signed on a driver's link can keep places for the office, as
     driver-form/handler.ts describes them: a `licence_copy` box, which opens
     with the driver's current Licence copy drawn in, and `trip_customer` and
     `trip_dates`, which are written in when the form is opened from a trip's
     Forms list, at documents.html?open=<id>&trip=<trip id>. The signed file
     itself never changes, so a renewed licence or another trip is in the
     next copy opened. */
  async function openDocument() {
    const { data, error } = await client.from('company_documents')
      .select('id,driver_id,file_name,file_path').eq('id', openId).maybeSingle();
    if (error) throw error;
    const url = data ? await linkTo(data.file_path) : '';
    if (!url) return cannotOpen(data ? "The file didn't open" : 'That document is not in the list',
      data ? 'Reload the page to try again.' : 'Pick a document from the list below.');
    const fields = data.driver_id ? await officeFields(data.id) : [];
    const box = fields.find(f => f.type === 'licence_copy')?.at ?? null;
    const tripId = params.get('trip');
    const trip = tripId && fields.some(f => f.type === 'trip_customer' || f.type === 'trip_dates') ? await tripWords(tripId) : null;
    if (!box && !trip) { location.replace(url); return; }
    const licence = box ? await licenceOf(data.driver_id) : null;
    if (box && !licence) {
      const name = (await client.from('drivers').select('name').eq('id', data.driver_id).maybeSingle()).data?.name ?? 'This driver';
      return cannotOpen(`${name} has no licence copy on file`,
        "This form's last page is a copy of their licence. Upload it on their Documents tab as a Licence copy, then open the form again.");
    }
    const words = !trip ? [] : fields.flatMap(f => {
      const text = f.type === 'trip_customer' ? trip.customer : f.type === 'trip_dates' ? trip.dates : '';
      return text ? [].concat(f.at ?? []).map(at => ({ at, text })) : [];
    });
    try {
      location.replace(await drawnCopy(url, data.file_name, licence && { ...licence, at: box }, words));
    } catch {
      cannotOpen("The form couldn't be filled in", 'Reload the page to try again.');
    }
  }
  async function cannotOpen(title, text) {
    say('info', title, text);
    history.replaceState(null, '', 'documents.html');
    await loadList();
  }

  // The places a signed form keeps for the office, or none for a document
  // that is not a signed form.
  const OFFICE = ['licence_copy', 'trip_customer', 'trip_dates'];
  async function officeFields(documentId) {
    const { data: signing } = await client.from('driver_form_signings')
      .select('form_id').eq('document_id', documentId).maybeSingle();
    if (!signing) return [];
    const { data: form } = await client.from('driver_forms').select('fields').eq('id', signing.form_id).maybeSingle();
    return (form?.fields ?? []).filter(f => OFFICE.includes(f.type) && f.at);
  }
  // The driver's current Licence copy, the kind that sets their licence's
  // end day, with a link to its file; null when there is none.
  async function licenceOf(driverId) {
    const { data: kind } = await client.from('document_kinds').select('id').eq('sets_driver_date', 'license_exp').maybeSingle();
    if (!kind) return null;
    const { data: doc } = await client.from('company_documents').select('file_name,file_path')
      .eq('kind_id', kind.id).eq('driver_id', driverId).is('replaced_at', null)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    const url = doc ? await linkTo(doc.file_path) : '';
    return url ? { ...doc, url } : null;
  }
  /* A trip as a form names it: its customer, the campus a school form asks
     for, and its days from the first leg's start to the last leg's end, as
     May 27, 2027, May 27-29, 2027 or May 30 - Jun 2, 2027. */
  async function tripWords(tripId) {
    const { data: trip } = await client.from('trips')
      .select('customer,customer_id,trip_legs(id,leg,kind,start_date,end_date,created_at)').eq('id', tripId).maybeSingle();
    if (!trip) return null;
    const named = trip.customer_id
      ? (await client.from('customers').select('name').eq('id', trip.customer_id).maybeSingle()).data?.name : null;
    const days = window.SchedulerTripShape.daysOf(trip);
    const md = d => parseISO(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const y = d => d.slice(0, 4);
    const dates = !days ? '' : days.first === days.last ? longDay(days.first)
      : y(days.first) !== y(days.last) ? `${longDay(days.first)} - ${longDay(days.last)}`
      : days.first.slice(0, 7) === days.last.slice(0, 7) ? `${md(days.first)}-${days.last.slice(8, 10).replace(/^0/, '')}, ${y(days.last)}`
      : `${md(days.first)} - ${md(days.last)}, ${y(days.last)}`;
    return { customer: named || clean(trip.customer) || '', dates };
  }

  // pdf-lib, loaded only when a copy is drawn on, as the page loads
  // supabase-js: one exact version from jsdelivr, held to its hash.
  const PDF_LIB = {
    src: 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
    integrity: 'sha384-weMABwrltA6jWR8DDe9Jp5blk+tZQh7ugpCsF3JwSA53WZM9/14PjS5LAJNHNjAI',
  };
  const pdfLib = () => (window.PDFLib ? Promise.resolve(window.PDFLib) : new Promise((done, fail) => {
    const script = Object.assign(document.createElement('script'), { src: PDF_LIB.src, integrity: PDF_LIB.integrity, crossOrigin: 'anonymous' });
    script.onload = () => done(window.PDFLib);
    script.onerror = fail;
    document.head.appendChild(script);
  }));

  /* A licence card's size in PDF points, the ID-1 card every US licence is,
     85.60 by 53.98 mm, so a copy prints as large as the card itself. */
  const CARD = { long: 85.6 / 25.4 * 72, short: 53.98 / 25.4 * 72 };
  // The size a licence copy is drawn at: the card's own, its long side the
  // card's long side whichever way it stands, and never past its box.
  const cardSize = (art, box) => {
    const [long, short] = art.width >= art.height ? [art.width, art.height] : [art.height, art.width];
    const scale = Math.min(CARD.long / long, CARD.short / short, box.w / art.width, box.h / art.height);
    return [art.width * scale, art.height * scale];
  };

  /* The signed PDF with the office's part written in: the licence copy drawn
     at a real card's size, centred in its box, a photo as it is and a PDF by
     its first page; and each of `words` on its line, in the ink the driver's
     answers are written in. */
  async function drawnCopy(url, fileName, licence, words) {
    const bytes = u => fetch(u).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer(); });
    const [{ PDFDocument, StandardFonts, rgb }, signed, copy] = await Promise.all([pdfLib(), bytes(url), licence ? bytes(licence.url) : null]);
    const pdf = await PDFDocument.load(signed);
    if (licence) {
      const at = licence.at;
      const page = pdf.getPage(at.page);
      const ext = licence.file_name.split('.').pop().toLowerCase();
      const art = ext === 'pdf' ? (await pdf.embedPdf(copy, [0]))[0] : ext === 'png' ? await pdf.embedPng(copy) : await pdf.embedJpg(copy);
      const [width, height] = cardSize(art, at);
      const place = { x: at.x + (at.w - width) / 2, y: at.y + (at.h - height) / 2, width, height };
      if (ext === 'pdf') page.drawPage(art, place); else page.drawImage(art, place);
    }
    if (words.length) {
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      // driver-form/pdf.ts's ink, the colour of a pen.
      for (const { at, text } of words) pdf.getPage(at.page).drawText(text, { x: at.x, y: at.y, size: at.size ?? 11, font, color: rgb(0.04, 0.12, 0.4) });
    }
    // A drawn copy's address names nothing, so its title names the file.
    pdf.setTitle(fileName.replace(/\.pdf$/i, ''), { showInWindowTitleBar: true });
    return URL.createObjectURL(new Blob([await pdf.save()], { type: 'application/pdf' }));
  }

  /* ══ The list ═══════════════════════════════════════════════════════════ */
  /* Who a document is for: its driver, its partner, the holder named on it
     and the customer it belongs to. A holder that is the customer's or the
     partner's own name is said once. */
  const whoOf = doc => {
    const customer = customerOf(doc)?.name;
    const partner = partnerOf(doc)?.name;
    const holder = [customer, partner].some(n => folded(doc.holder) === folded(n)) ? null : doc.holder;
    return [driverOf(doc)?.name, partner, holder, customer].filter(Boolean);
  };
  const byKind = (a, b) => folded(kindOf(a)?.name).localeCompare(folded(kindOf(b)?.name))
    || folded(whoOf(a).join(' ')).localeCompare(folded(whoOf(b).join(' ')))
    || String(b.created_at).localeCompare(String(a.created_at));
  // A document for nobody in particular sorts after every one with a holder.
  const SORTS = {
    kind: byKind,
    who: (a, b) => {
      const x = whoOf(a).join(' '), y = whoOf(b).join(' ');
      return !x && !y ? 0 : !x ? 1 : !y ? -1 : folded(x).localeCompare(folded(y));
    },
    ends: (a, b) => statusOf(a).rank - statusOf(b).rank,
  };
  /* Every word typed has to be somewhere in the row, or in the name of a
     customer that is part of the row's customer: a district's certificate
     covers its schools, so a school's name finds it. */
  const matches = (doc, q) => {
    const hay = folded([kindOf(doc)?.name, ...whoOf(doc), doc.file_name, doc.note,
      ...(parts.get(doc.customer_id) || [])].filter(Boolean).join(' '));
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
      /* Under the kind, whether it is in force, with the status icon where a
         part is ending or has ended, then the note. An old copy says only that
         it is old. */
      const status = isOld(doc) ? null : statusOf(doc);
      const mark = INDICATOR[status?.state];
      const detail = el('span', mark ? 'scheduler-pair-cell__detail rux--icon-indicator' : 'scheduler-pair-cell__detail');
      if (mark) detail.appendChild(svgUse(mark.icon, '16', '0 0 32 32', mark.cls));
      detail.append([isOld(doc) ? 'Old copy' : null, status?.text, doc.note].filter(Boolean).join(' · '));
      lines.append(link, detail);
      cell.appendChild(lines);
      what.appendChild(cell);

      const who = el('td');
      const [first, ...rest] = whoOf(doc);
      if (first) {
        const wl = el('div', 'scheduler-pair-cell__lines');
        wl.appendChild(el('span', null, first));
        if (rest.length) wl.appendChild(el('span', 'scheduler-pair-cell__detail', rest.join(' · ')));
        who.appendChild(wl);
      } else {
        who.appendChild(el('span', 'scheduler-pair-note', '—'));
      }

      const ends = el('td', 'scheduler-documents-ends');
      ends.appendChild(el('span', isOld(doc) ? 'scheduler-pair-note' : null, doc.ends_on ? longDay(doc.ends_on) : '—'));

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
    // A link from a customer's, a driver's or a partner's page arrives narrowed to them.
    const from = customers.get(params.get('customer')) || drivers.get(params.get('driver')) || partners.get(params.get('partner'));
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
     driver or as one every partner must hold, or add to. A kind is never deleted here, because a document or a
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

      // A checkbox for one of the row's marks.
      const mark = (id, key, words) => {
        const check = el('div', 'rux--form-item rux--checkbox-wrapper');
        const box = el('input', 'rux--checkbox');
        box.type = 'checkbox';
        box.id = id;
        box.checked = row[key];
        box.addEventListener('change', () => { row[key] = box.checked; });
        const boxLabel = el('label', 'rux--checkbox-label');
        boxLabel.setAttribute('for', box.id);
        boxLabel.appendChild(el('div', 'rux--checkbox-label-text', words));
        check.append(box, boxLabel);
        return check;
      };

      line.append(item, mark(`scheduler-kind-driver-${i}`, 'per_driver', 'One for each driver'),
        mark(`scheduler-kind-partner-${i}`, 'partner_required', 'Every partner holds one'));
      return line;
    }));
  }
  function openKinds() {
    kindRows = kinds.map(k => ({ id: k.id, name: k.name, per_driver: k.per_driver, partner_required: k.partner_required }));
    kindSay('');
    drawKinds();
  }
  $('scheduler-documents-kinds')?.addEventListener('click', openKinds);
  $('scheduler-kinds-add')?.addEventListener('click', () => {
    kindRows.push({ id: null, name: '', per_driver: false, partner_required: false });
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
        if (was && was.name === row.name && was.per_driver === row.per_driver && was.partner_required === row.partner_required) continue;
        const fields = { name: row.name, per_driver: row.per_driver, partner_required: row.partner_required };
        const { error } = was
          ? await client.from('document_kinds').update(fields).eq('id', row.id)
          : await client.from('document_kinds').insert(fields);
        if (error) throw error;
      }
      kinds = await read('document_kinds', KIND_COLUMNS, 'name');
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
  const partnerField = $('scheduler-doc-partner');
  const holderField = $('scheduler-doc-holder');
  const endsField = $('scheduler-doc-ends');
  const partsBox = $('scheduler-doc-parts');
  const noteField = $('scheduler-doc-note');
  const fileInput = $('scheduler-doc-file');

  let loaded = null;
  // A new record's id, made once, so a Save sent again cannot insert it twice.
  let newId = crypto.randomUUID();
  let chosen = null;        // the file picked and not yet saved
  let several = [];         // the files picked for a new upload, when more than one
  let customerId = null;    // the customer picked
  let customerText = '';    // the customer field's text
  let baseline = '';

  const perDriver = () => !!kinds.find(k => k.id === kindField.value)?.per_driver;

  /* The parts the form asks a day for: the kind's, then any other the saved
     document has, so a part the kind no longer names is not lost by a Save. */
  let partNames = [];
  let partDays = new Map();  // each part's day as last typed, kept while the kind changes
  const namesFor = kindId => {
    const own = kinds.find(k => k.id === kindId)?.parts || [];
    const kept = (loaded?.kind_id === kindId ? loaded.parts || [] : []).map(p => p.name);
    return [...new Set([...own, ...kept])];
  };
  // Each part with a day typed, as the database keeps it; an empty one is not covered.
  const readParts = () => partNames
    .map((name, i) => ({ name, ends_on: fieldDay($(`scheduler-doc-part-${i}`)?.value) }))
    .filter(p => p.ends_on);
  /* A date field for each part, from the template, in place of Ends. A kind
     with no parts keeps Ends. */
  function drawParts(days) {
    partNames = namesFor(kindField.value);
    const items = partNames.map((name, i) => {
      const item = $('scheduler-doc-part-template').content.firstElementChild.cloneNode(true);
      const input = item.querySelector('.rux--date-picker__input');
      input.id = `scheduler-doc-part-${i}`;
      const label = item.querySelector('.rux--label');
      label.textContent = name;
      label.htmlFor = input.id;
      input.value = shownDay(days.get(name) ?? '');
      return item;
    });
    partsBox.replaceChildren(...items);
    window.Rux?.datePicker?.init?.(partsBox);
    partsBox.hidden = !partNames.length;
    $('scheduler-doc-ends-item').hidden = partNames.length > 0;
  }
  // Days already typed stay with their part's name when the kind changes, and
  // come back when it changes back.
  function keepTyped() {
    partNames.forEach((name, i) => {
      const day = fieldDay($(`scheduler-doc-part-${i}`)?.value);
      if (day) partDays.set(name, day); else partDays.delete(name);
    });
  }

  const readForm = () => ({
    kind_id: kindField.value || null,
    customer_id: customerId,
    driver_id: perDriver() ? driverField.value || null : null,
    partner_id: perDriver() ? null : partnerField.value || null,
    holder: clean(holderField.value),
    // The database sets ends_on to the earliest part's day.
    ends_on: partNames.length ? null : fieldDay(endsField.value),
    parts: partNames.length ? readParts() : [],
    note: noteField.value.trim() || null,
  });
  const snapshot = () => JSON.stringify([readForm(), customerId ? '' : customerText, chosen?.name ?? '', several.map(f => f.name)]);
  const dirty = () => baseline !== '' && snapshot() !== baseline;

  /* The customer a document belongs to: Carbon's combo box over every
     customer. Design's list-box.js filters the options as the field is typed
     in and says which was picked, or none. Left empty, the document is on no
     customer's page. */
  function drawCustomer() {
    const slot = $('scheduler-doc-customer-slot');
    const lab = el('label', 'rux--label', 'Customer');
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
    // The active drivers, and whoever the document or the link that opened it names.
    const named = loaded ? loaded.driver_id : params.get('driver');
    const offered = [...drivers.values()]
      .filter(d => (d.status || 'active') === 'active' || d.id === named);
    driverField.replaceChildren(...[{ id: '', name: 'Pick a driver' }, ...offered].map(d => {
      const option = el('option', 'rux--select-option', d.name);
      option.value = d.id;
      return option;
    }));
    // The active partners, and whichever the document or its link names; none is a document of no partner's.
    const company = loaded ? loaded.partner_id : params.get('partner');
    const companies = [...partners.values()]
      .filter(p => p.status === 'active' || p.id === company);
    partnerField.replaceChildren(...[{ id: '', name: 'None' }, ...companies].map(p => {
      const option = el('option', 'rux--select-option', p.name);
      option.value = p.id;
      return option;
    }));
  }
  /* The driver is asked for only by a kind kept once for each driver, and
     the partner by every other kind. */
  const drawDriver = () => {
    $('scheduler-doc-driver-item').hidden = !perDriver();
    $('scheduler-doc-partner-item').hidden = perDriver();
  };
  kindField?.addEventListener('change', () => { drawDriver(); keepTyped(); drawParts(partDays); showKindError(''); });
  driverField?.addEventListener('change', () => showDriverError(''));

  // One of several chosen files: its name, and a button that takes it out.
  function severalItem(file) {
    const item = el('span', 'rux--file__selected-file rux--file__selected-file--md');
    const name = el('p', 'rux--file-filename', file.name);
    name.title = file.name;
    const state = el('span', 'rux--file__state-container');
    const close = el('button', 'rux--file-close');
    close.type = 'button';
    close.setAttribute('aria-label', `Remove ${file.name}`);
    close.appendChild(svgUse('#m-close', '16', '0 0 32 32'));
    close.addEventListener('click', () => pick(several.filter(f => f !== file)));
    state.appendChild(close);
    const stateBox = el('div');
    stateBox.appendChild(state);
    item.append(name, stateBox);
    return item;
  }

  /* The file: Design's drop button, then the one file the document holds or
     is about to. Picking another on a saved document replaces its file with
     the next Save, and the copy before it is kept as an old one. A new upload
     takes several files, listed one to a line. */
  function drawFile() {
    const list = $('scheduler-doc-file-list');
    const name = chosen?.name ?? loaded?.file_name;
    list.replaceChildren();
    list.classList.toggle('scheduler-documents-files', several.length > 0);
    fileInput.multiple = !loaded;
    $('scheduler-doc-file-drop').textContent = loaded
      ? 'Drag and drop a new copy here or click to choose one'
      : 'Drag and drop a file, or several, here or click to choose';
    if (several.length) {
      list.append(...several.map(severalItem));
      return;
    }
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
      close.addEventListener('click', () => pick([]));
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
  /* What the form holds once files are picked: one file, or several on a new
     upload. Several hide the holder and the customer, which each file has of
     its own, and say so. */
  function pick(files) {
    chosen = files.length === 1 ? files[0] : null;
    several = files.length > 1 ? files : [];
    fileInput.value = '';
    const many = several.length > 0;
    $('scheduler-doc-holder-item').hidden = many;
    $('scheduler-doc-customer-slot').hidden = many;
    $('scheduler-doc-one-note').hidden = many;
    $('scheduler-doc-several-note').hidden = !many;
    if (chosen && !loaded) nameFrom(chosen);
    drawFile();
    drawTitle();
  }

  /* A certificate's file is named for its holder first, then an underscore
     and the rest. A file with no underscore is named for its holder alone. */
  const holderIn = name => {
    const base = name.replace(/\.[^.]*$/, '');
    const at = base.indexOf('_');
    return clean(at > 0 ? base.slice(0, at) : base);
  };
  /* The customer a holder's new document joins with nobody picking one: the
     customer the holder's current document is linked to, so a link made once
     carries to the next copy, and otherwise the customer of the holder's own
     name. */
  function customerFor(kindId, holder) {
    const name = folded(holder);
    if (!name) return null;
    const before = documents.find(d => !isOld(d) && d.customer_id
      && folded(d.holder) === name && (!kindId || d.kind_id === kindId));
    if (before) return before.customer_id;
    return [...customers.values()].find(c => folded(c.name) === name)?.id ?? null;
  }
  // One new file named that way fills an empty Holder, and then an empty Customer.
  function nameFrom(file) {
    if (!file.name.includes('_') || holderField.value.trim()) return;
    holderField.value = holderIn(file.name) ?? '';
    if (customerId || customerText) return;
    customerId = customerFor(kindField.value, holderField.value);
    customerText = customers.get(customerId)?.name ?? '';
    drawCustomer();
  }

  function choose(files) {
    const picked = [...(files || [])];
    if (!picked.length) return;
    const many = picked.length > 1;
    if (loaded && many) return showFileError('Choose one file. A saved document holds one.');
    for (const file of picked) {
      const ext = String(file.name || '').split('.').pop().toLowerCase();
      if (!TYPES[ext]) return showFileError(many ? `${file.name} is not a PDF, a JPEG or a PNG.` : 'Choose a PDF, a JPEG or a PNG.');
      if (file.size > MAX_BYTES) return showFileError(many ? `${file.name} is over 20 MB.` : 'That file is over 20 MB. Choose a smaller one.');
    }
    showFileError('');
    pick(picked);
  }
  const drop = $('scheduler-doc-file-drop');
  drop?.addEventListener('click', () => fileInput.click());
  fileInput?.addEventListener('change', () => choose(fileInput.files));
  drop?.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('rux--file__drop-container--drag-over'); });
  drop?.addEventListener('dragleave', () => drop.classList.remove('rux--file__drop-container--drag-over'));
  drop?.addEventListener('drop', e => {
    e.preventDefault();
    drop.classList.remove('rux--file__drop-container--drag-over');
    choose(e.dataTransfer?.files);
  });

  function fillForm(doc) {
    drawSelects();
    kindField.value = doc.kind_id ?? '';
    customerId = doc.customer_id ?? null;
    customerText = customers.get(customerId)?.name ?? '';
    driverField.value = doc.driver_id ?? '';
    partnerField.value = doc.partner_id ?? '';
    endsField.value = shownDay(doc.ends_on ? String(doc.ends_on).slice(0, 10) : '');
    partDays = new Map((doc.parts || []).map(p => [p.name, String(p.ends_on).slice(0, 10)]));
    drawParts(partDays);
    holderField.value = doc.holder ?? '';
    noteField.value = doc.note ?? '';
    drawCustomer();
    drawDriver();
    pick([]);
    for (const clear of [showKindError, showDriverError, showFileError]) clear('');
  }

  function drawTitle() {
    const name = loaded ? kindOf(loaded)?.name || 'Document'
      : several.length ? `Upload ${several.length} documents` : 'Upload a document';
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
    if (!loaded && !chosen && !several.length) bad(showFileError, 'Choose the file to upload.', drop);
    if (!kindField.value) bad(showKindError, 'Pick the kind of document.', kindField);
    if (several.length) {
      if (perDriver()) bad(showKindError, 'A kind kept once for each driver takes one file at a time.', kindField);
    } else {
      if (!customerId && customerText) bad(showCustomerError, 'Pick a customer from the list, or clear the field.', $('scheduler-doc-customer'));
      if (perDriver() && !driverField.value) bad(showDriverError, 'Pick the driver this is for.', driverField);
    }
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
      // A link from a customer's, a driver's or a partner's page, or a trip's Forms list, arrives filled.
      fillForm({
        kind_id: kinds.find(k => k.id === params.get('kind'))?.id,
        customer_id: customers.get(params.get('customer'))?.id,
        driver_id: drivers.get(params.get('driver'))?.id,
        partner_id: partners.get(params.get('partner'))?.id,
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
  const SAME = 'Another current document has this kind, holder, customer, driver and partner. Open that one and replace its file.';

  /* Several files, one after another: each is uploaded, then written as its
     own document with the form's kind, end dates and note, its holder from its
     name and its customer the holder's. A file that lands leaves the list, so
     a Save that stops partway is finished by the next one. */
  async function saveSeveral() {
    const { kind_id, partner_id, ends_on, parts: dates, note } = readForm();
    const saveBtn = $('scheduler-document-save');
    saveBtn.disabled = true;
    const total = several.length;
    let done = 0;
    try {
      for (const file of [...several]) {
        result('working', `Uploading ${done + 1} of ${total}.`);
        const id = crypto.randomUUID();
        const path = `${id}/${slug(file.name)}`;
        const ext = file.name.split('.').pop().toLowerCase();
        const up = await client.storage.from(BUCKET).upload(path, file, { contentType: TYPES[ext], upsert: false });
        if (up.error) throw up.error;
        const holder = holderIn(file.name);
        try {
          documents.push(await window.SchedulerPair.saveRecord(client, 'company_documents', {
            id, creating: true, columns: COLUMNS,
            row: { kind_id, customer_id: customerFor(kind_id, holder), driver_id: null, partner_id, holder, ends_on, parts: dates, note,
              file_name: file.name, file_path: path, file_size: file.size },
          }));
        } catch (error) {
          // A file whose row never landed is taken back out.
          await client.storage.from(BUCKET).remove([path]).catch(() => {});
          throw error;
        }
        several = several.filter(f => f !== file);
        done += 1;
        drawFile();
      }
      guard.leave('documents.html');
      return true;
    } catch {
      pick(several);
      result('error', done
        ? `${done} of ${total} were uploaded. The rest are still chosen: save again to go on.`
        : "The documents weren't uploaded. Try again.");
      return false;
    } finally {
      saveBtn.disabled = false;
    }
  }

  async function save(force = false) {
    if (!validate()) return false;
    if (several.length) return saveSeveral();
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
      // A new paper uploaded from a driver's or a partner's page goes back to their documents.
      const from = drivers.get(params.get('driver'));
      if (!loaded && from && row.driver_id === from.id) {
        guard.leave(`drivers.html?id=${encodeURIComponent(from.id)}#documents`);
        return true;
      }
      const company = partners.get(params.get('partner'));
      if (!loaded && company && row.partner_id === company.id) {
        guard.leave(`partners.html?id=${encodeURIComponent(company.id)}#documents`);
        return true;
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
