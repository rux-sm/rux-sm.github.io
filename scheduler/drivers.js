/* ==========================================================================
   drivers.js — THE DRIVERS PAGE
   --------------------------------------------------------------------------
   drivers.html lists every driver. drivers.html?id=<driver id> edits one and
   drivers.html?new makes one. Both read and write the tables rux-ui writes,
   `drivers` and `driver_time_off`, and the public `driver-photos` bucket, so
   both apps show the same driver.

   The list sorts itself rather than through js/data-table.js, because the
   Licence and medical column sorts by the date it describes, not its text.

   A driver is never deleted here, only set Inactive, so past trips keep the
   driver's name. The schedule link is shown, not made: rux-ui makes, changes
   and turns off driver links.
   ========================================================================== */
(() => {
  'use strict';

  const { $, el, svgUse } = window.SchedulerPair;
  const pair = window.SchedulerPair.page({ list: 'drivers', one: 'driver' });
  const { say, result } = pair;

  const params = new URLSearchParams(location.search);
  const driverId = params.get('id');
  const editing = !!driverId || params.has('new');
  // The record view shows the list's column only for its notice.
  if (editing) $('scheduler-drivers-h').hidden = true;

  // rux-ui's driver page, which is the one a driver's link opens today.
  const DRIVER_LINK = 'https://rux-sm.github.io/rux-ui/driver.html?s=';
  const PHOTO_BUCKET = 'driver-photos';
  // An expiry this close shows as a warning, as rux-ui's newer roster warns.
  const WARN_DAYS = 45;

  const DRIVER_COLUMNS = [
    'id', 'name', 'short_name', 'phone', 'email', 'date_of_birth', 'texting_url',
    'address', 'city', 'address_state', 'zip',
    'emergency_contact_name', 'emergency_contact_phone',
    'cdl_class', 'license_state', 'license_number', 'license_exp', 'med_card_expiry', 'endorsements',
    'status', 'employment_type', 'priority', 'hire_date', 'notes', 'photo_path', 'driver_ref',
  ].join(',');

  let client = null;

  // ── dates, all local ────────────────────────────────────────────────────
  const DAY = 864e5;
  const ISO = /^\d{4}-\d{2}-\d{2}$/;
  const parseISO = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  // A date field's day as ISO, or null; the picker shows mm/dd/yyyy.
  const fieldDay = v => window.Rux?.datePicker?.toISO?.(v)
    ?? (ISO.test(String(v ?? '').trim()) ? String(v).trim() : null);
  const shownDay = v => window.Rux?.datePicker?.format?.(v ?? '') ?? (v || '');
  const today = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
  // Rounded, because a span across a daylight-saving change is 23 or 25 hours.
  const daysUntil = s => Math.round((parseISO(s) - today()) / DAY);
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
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  /* Whichever of the licence and the medical card expires first. `rank` sorts
     the list: the soonest first, and nothing on file last. */
  function compliance(d) {
    const dates = [['Licence', d.license_exp], ['Medical card', d.med_card_expiry]]
      .filter(([, v]) => ISO.test(String(v ?? '').slice(0, 10)))
      .sort((a, b) => parseISO(a[1]) - parseISO(b[1]));
    if (!dates.length) return { kind: 'none', text: 'Not on file', rank: Number.MAX_SAFE_INTEGER };
    const [what, when] = dates[0];
    const n = daysUntil(when);
    if (n < 0) return { kind: 'expired', text: `${what} expired ${plural(-n, 'day')} ago`, rank: n };
    if (n === 0) return { kind: 'soon', text: `${what} expires today`, rank: n };
    if (n <= WARN_DAYS) return { kind: 'soon', text: `${what} expires in ${plural(n, 'day')}`, rank: n };
    return { kind: 'ok', text: longDate(when), rank: n };
  }

  // Each status icon written out whole, so the class sweep can read it.
  const INDICATOR = {
    expired: { cls: 'rux--icon-indicator--failed', icon: '#m-error-fill' },
    soon: { cls: 'rux--icon-indicator--caution-minor', icon: '#m-warning-fill' },
    none: { cls: 'rux--icon-indicator--unknown', icon: '#m-help-fill' },
  };
  function indicator(c) {
    if (c.kind === 'ok') return el('span', null, c.text);
    const box = el('div', 'rux--icon-indicator');
    box.append(svgUse(INDICATOR[c.kind].icon, '16', '0 0 32 32', INDICATOR[c.kind].cls), c.text);
    return box;
  }

  const EMPLOYMENT = { 'full-time': 'Full time', 'part-time': 'Part time', contract: 'Contract', seasonal: 'Seasonal' };
  const EMPLOYMENT_ORDER = ['full-time', 'part-time', 'contract', 'seasonal'];

  const initials = name => String(name || '').trim().split(/\s+/).filter(Boolean)
    .map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  const photoUrl = path => (path && client ? client.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl : '');

  // Size classes written out whole, for the class sweep.
  const PHOTO_SIZE = {
    sm: 'rux--user-avatar__photo rux--user-avatar__photo--sm',
    xl: 'rux--user-avatar__photo rux--user-avatar__photo--xl',
  };
  // Fills an avatar with the photo, or the initials while there is none or it
  // will not load.
  function paintAvatar(box, name, path, size) {
    box.replaceChildren();
    const url = photoUrl(path);
    if (!url) { box.textContent = initials(name); return; }
    const img = el('img', PHOTO_SIZE[size]);
    img.alt = '';
    img.src = url;
    img.addEventListener('error', () => { box.textContent = initials(name); }, { once: true });
    box.appendChild(img);
  }


  /* ══ The list ═══════════════════════════════════════════════════════════ */
  let drivers = [];
  // Read from the Show choice, so the list agrees with the menu it sits under.
  let filter = $('scheduler-drivers-filter')?.value || 'active';

  const matches = (d, q) => {
    if (!q) return true;
    const digits = q.replace(/\D/g, '');
    const text = [d.name, d.short_name, d.license_number, d.driver_ref].filter(Boolean).join(' ').toLowerCase();
    if (text.includes(q.toLowerCase())) return true;
    return digits.length >= 3 && String(d.phone || '').replace(/\D/g, '').includes(digits);
  };

  // rux-ui's order, used while no column is sorted: employment, priority, name.
  const standing = (a, b) =>
    (EMPLOYMENT_ORDER.indexOf(a.employment_type) - EMPLOYMENT_ORDER.indexOf(b.employment_type))
    || ((a.priority ?? 9) - (b.priority ?? 9))
    || String(a.name || '').localeCompare(String(b.name || ''));

  const SORTS = {
    name: (a, b) => String(a.name || '').localeCompare(String(b.name || '')),
    cdl: (a, b) => String(a.cdl_class || 'Z').localeCompare(String(b.cdl_class || 'Z')),
    employment: standing,
    compliance: (a, b) => compliance(a).rank - compliance(b).rank,
  };

  function drawList() {
    const { query, sortKey, sortDir } = view;
    const isActive = d => d.status === 'active';
    const counts = { active: 0, inactive: 0, all: drivers.length };
    for (const d of drivers) counts[isActive(d) ? 'active' : 'inactive']++;
    for (const option of $('scheduler-drivers-filter')?.options ?? []) {
      option.textContent = `${option.dataset.label} (${counts[option.value]})`;
    }

    // The view's own rows, which is what a search narrows and what the band
    // counts against.
    const pool = drivers.filter(d => filter === 'all' || (filter === 'active') === isActive(d));
    const shown = pool
      .filter(d => matches(d, query))
      .sort((a, b) => {
        if (sortDir === 'none') return standing(a, b);
        const r = SORTS[sortKey](a, b) || standing(a, b);
        return sortDir === 'descending' ? -r : r;
      });

    /* What the search came to, in the band beside it. Only a search narrows
       the list to something a count can explain — a filter already carries its
       own count in the Show choice — so the band says nothing without one, and
       the New button does not move. */
    view.count(shown.length, pool.length);

    const body = $('scheduler-drivers-rows');
    body.replaceChildren();
    if (!shown.length) {
      const tr = el('tr');
      const td = el('td', null, query ? `No drivers match “${query}”.` : 'No drivers here.');
      td.colSpan = 5;
      tr.appendChild(td);
      body.appendChild(tr);
      return;
    }
    for (const d of shown) {
      const tr = el('tr', 'scheduler-pair-row');
      tr.dataset.id = d.id;

      const who = el('td');
      const cell = el('div', 'scheduler-pair-cell');
      const avatar = el('div', 'rux--user-avatar rux--user-avatar--order-2-gray rux--user-avatar--sm');
      avatar.setAttribute('aria-hidden', 'true');
      paintAvatar(avatar, d.name, d.photo_path, 'sm');
      const names = el('div', 'scheduler-pair-cell__lines');
      const link = el('a', 'scheduler-pair-cell__name', d.name || 'Unnamed driver');
      link.href = `drivers.html?id=${encodeURIComponent(d.id)}`;
      names.appendChild(link);
      if (d.short_name && d.short_name !== d.name) names.appendChild(el('span', 'scheduler-pair-cell__detail', d.short_name));
      cell.append(avatar, names);
      who.appendChild(cell);

      const phone = el('td', null, d.phone || '—');
      const cdl = el('td', null, d.cdl_class || '—');
      const job = el('td', null, [EMPLOYMENT[d.employment_type] || 'Not set', d.priority ? `Priority ${d.priority}` : null]
        .filter(Boolean).join(' · '));
      const lic = el('td');
      lic.appendChild(indicator(compliance(d)));

      tr.append(who, phone, cdl, job, lic);
      body.appendChild(tr);
    }
  }

  // Search, sort and a row's click, which opens its driver.
  const view = pair.table({ sortKey: 'compliance', draw: drawList });

  // The Show choice picks which drivers the table holds.
  $('scheduler-drivers-filter')?.addEventListener('change', e => {
    filter = e.target.value;
    drawList();
  });

  async function loadList() {
    const { data, error } = await client.from('drivers')
      .select('id,name,short_name,phone,license_number,license_exp,med_card_expiry,cdl_class,employment_type,priority,status,photo_path,driver_ref');
    if (error) throw error;
    drivers = data || [];
    $('scheduler-drivers-h').hidden = false;
    $('scheduler-drivers-table').hidden = false;
    drawList();
  }

  /* ══ One driver ═════════════════════════════════════════════════════════ */
  const form = $('scheduler-driver-form');
  const field = id => $(`scheduler-d-${id}`);
  const text = id => field(id).value.trim() || null;
  const dateOf = id => fieldDay(field(id).value);
  const upper = id => text(id)?.toUpperCase() ?? null;

  let loaded = null;        // the driver row as the page read it
  let loadedOff = [];       // its time off, as the database holds it
  let off = [];             // the time off on the page, saved with the form
  // A new driver's id, made once, so a Save sent again cannot insert it twice.
  const newId = crypto.randomUUID();
  let baseline = '';        // the form as loaded, to tell whether it changed

  /* The columns Save writes, read off the form. A blank field saves as null.
     The name is the two name fields joined, as rux-ui joins them. */
  function readForm() {
    const endorsements = [...document.querySelectorAll('#scheduler-d-endorsements input:checked')].map(i => i.value);
    const name = [text('first'), text('last')].filter(Boolean).join(' ') || null;
    return {
      name,
      short_name: text('short'),
      phone: text('phone'),
      email: text('email'),
      date_of_birth: dateOf('dob'),
      texting_url: text('texting'),
      address: text('address'),
      city: text('city'),
      address_state: upper('state'),
      zip: text('zip'),
      emergency_contact_name: text('ename'),
      emergency_contact_phone: text('ephone'),
      cdl_class: field('cdl').value || null,
      license_state: upper('lstate'),
      license_number: text('lnumber'),
      license_exp: dateOf('lexp'),
      med_card_expiry: dateOf('medexp'),
      endorsements: endorsements.length ? endorsements : null,
      status: document.querySelector('input[name="scheduler-d-status"]:checked')?.value || 'active',
      employment_type: field('type').value || null,
      priority: Number(field('priority').value) || 3,
      hire_date: dateOf('hire'),
      notes: field('notes').value.trim() || null,
    };
  }
  const WRITTEN = Object.keys({
    name: 0, short_name: 0, phone: 0, email: 0, date_of_birth: 0, texting_url: 0, address: 0, city: 0,
    address_state: 0, zip: 0, emergency_contact_name: 0, emergency_contact_phone: 0, cdl_class: 0,
    license_state: 0, license_number: 0, license_exp: 0, med_card_expiry: 0, endorsements: 0, status: 0,
    employment_type: 0, priority: 0, hire_date: 0, notes: 0,
  });

  // A row reduced to what Save writes, so a read-back compares like with like.
  const comparable = row => JSON.stringify(WRITTEN.map(k => {
    const v = row?.[k];
    if (v === undefined || v === '') return null;
    if (Array.isArray(v)) return [...v].sort();
    if (k.endsWith('_exp') || k.endsWith('_expiry') || k.endsWith('_date') || k === 'date_of_birth') return v ? String(v).slice(0, 10) : null;
    return v;
  }));
  const offRow = r => [r.start_date, r.end_date, r.reason || null, r.notes || null];
  const offKey = list => JSON.stringify(list.map(offRow));
  /* The time off with its places, in one order whatever order it was read or
     written in, so the conflict check compares what is held. */
  const offHeld = list => JSON.stringify(list.map(r => [r.position ?? null, ...offRow(r)]).sort((a, b) =>
    JSON.stringify(a).localeCompare(JSON.stringify(b))));
  const snapshot = () => comparable(readForm()) + offKey(off);
  const dirty = () => baseline !== '' && snapshot() !== baseline;

  function fillForm(d) {
    const [first, ...rest] = String(d.name || '').trim().split(/\s+/);
    const set = (id, v) => { field(id).value = v ?? ''; };
    set('first', first || '');
    set('last', rest.join(' '));
    set('short', d.short_name);
    set('phone', d.phone);
    set('email', d.email);
    set('dob', shownDay(d.date_of_birth ? String(d.date_of_birth).slice(0, 10) : ''));
    set('texting', d.texting_url);
    set('address', d.address);
    set('city', d.city);
    set('state', d.address_state);
    set('zip', d.zip);
    set('ename', d.emergency_contact_name);
    set('ephone', d.emergency_contact_phone);
    set('cdl', d.cdl_class || '');
    set('lstate', d.license_state);
    set('lnumber', d.license_number);
    set('lexp', shownDay(d.license_exp ? String(d.license_exp).slice(0, 10) : ''));
    set('medexp', shownDay(d.med_card_expiry ? String(d.med_card_expiry).slice(0, 10) : ''));
    const ends = new Set(d.endorsements || []);
    for (const box of document.querySelectorAll('#scheduler-d-endorsements input')) box.checked = ends.has(box.value);
    const status = d.status === 'inactive' ? 'inactive' : 'active';
    $(`scheduler-d-status-${status}`).checked = true;
    set('type', EMPLOYMENT[d.employment_type] ? d.employment_type : 'full-time');
    set('priority', String(d.priority ?? 3));
    set('hire', shownDay(d.hire_date ? String(d.hire_date).slice(0, 10) : ''));
    set('notes', d.notes);
    drawExpiry();
    clearErrors();
  }

  function drawTitle() {
    const name = loaded?.name;
    $('scheduler-driver-h').textContent = name || 'New driver';
    document.title = `${name || 'New driver'} — Scheduler`;
    const tag = $('scheduler-driver-status');
    tag.hidden = !loaded;
    if (loaded) {
      const active = loaded.status === 'active';
      tag.className = active ? 'rux--tag rux--tag--green' : 'rux--tag rux--tag--gray';
      tag.querySelector('.rux--tag__label').textContent = active ? 'Active' : 'Inactive';
    }
    paintAvatar($('scheduler-driver-photo'), name || '', loaded?.photo_path, 'xl');
    $('scheduler-driver-photo-remove').hidden = !loaded?.photo_path;
    $('scheduler-driver-photo-help').hidden = !!loaded;
    $('scheduler-driver-photo-add').disabled = !loaded;
    // A driver not yet saved has no schedule, so no Schedule tab.
    $('scheduler-driver-tabs').hidden = !loaded;
  }

  /* A warning under an expiry that has passed or is close, with the list's
     red or yellow status icon. Carbon shows the requirement only beside a
     wrapper in its warn state. */
  function drawExpiry() {
    for (const help of document.querySelectorAll('.scheduler-driver-expiry')) {
      const input = $(help.dataset.expiryFor);
      const wrap = input.closest('.rux--date-picker-input__wrapper');
      const v = fieldDay(input.value);
      const n = v ? daysUntil(v) : Infinity;
      const on = n <= WARN_DAYS;
      wrap.classList.toggle('rux--date-picker-input__wrapper--warn', on);
      if (on) input.setAttribute('aria-describedby', help.id); else input.removeAttribute('aria-describedby');
      help.hidden = !on;
      help.replaceChildren();
      if (!on) continue;
      help.appendChild(indicator({
        kind: n < 0 ? 'expired' : 'soon',
        text: n < 0 ? `Expired ${plural(-n, 'day')} ago` : n === 0 ? 'Expires today' : `Expires in ${plural(n, 'day')}`,
      }));
    }
  }

  // ── validation ──
  const ERRORS = ['first', 'texting'];
  function clearErrors() {
    for (const id of ERRORS) showError(id, '');
  }
  const showError = (id, message) => pair.textError(field(id), `scheduler-d-${id}-error`, message);
  function validate() {
    clearErrors();
    let first = null;
    if (!text('first')) { showError('first', 'Enter a first name.'); first ??= field('first'); }
    const link = text('texting');
    if (link && !/^https:\/\/messages\.google\.com(\/|$)/i.test(link)) {
      showError('texting', 'Use a link that starts with https://messages.google.com.');
      first ??= field('texting');
    }
    first?.focus();
    return !first;
  }

  // ── time off ──
  const REASONS = [['vacation', 'Vacation'], ['sick', 'Sick'], ['personal', 'Personal'], ['suspended', 'Suspended'], ['other', 'Other']];
  const reasonText = r => REASONS.find(([v]) => v === r)?.[1] || (r ? r : 'Time off');

  function drawOff() {
    const list = $('scheduler-driver-off');
    list.replaceChildren();
    if (!off.length) {
      const li = el('li', 'rux--contained-list-item');
      li.appendChild(el('div', 'rux--contained-list-item__content scheduler-pair-note', 'No time off on record.'));
      list.appendChild(li);
      return;
    }
    off.forEach((r, i) => {
      const li = el('li', 'rux--contained-list-item rux--contained-list-item--with-action');
      const body = el('div', 'rux--contained-list-item__content scheduler-pair-item');
      body.appendChild(el('span', 'scheduler-pair-item__main', rangeText(r.start_date, r.end_date)));
      body.appendChild(el('span', 'scheduler-pair-item__detail', [reasonText(r.reason), r.notes].filter(Boolean).join(' · ')));
      const actions = el('div', 'rux--contained-list-item__action');
      const edit = el('button', 'rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm', 'Edit');
      edit.type = 'button';
      edit.setAttribute('aria-label', `Edit time off ${rangeText(r.start_date, r.end_date)}`);
      edit.addEventListener('click', () => openOff(i, edit));
      const remove = el('button', 'rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm', 'Remove');
      remove.type = 'button';
      remove.setAttribute('aria-label', `Remove time off ${rangeText(r.start_date, r.end_date)}`);
      remove.addEventListener('click', () => {
        off.splice(i, 1);
        drawOff();
        changed();
        $('scheduler-driver-off-add').focus();
      });
      actions.append(edit, remove);
      li.append(body, actions);
      list.appendChild(li);
    });
  }

  /* The dialog's fields are built on each open, because a claimed date picker
     cannot be claimed again. The markup is Carbon's range picker, as the trip
     editor writes it. */
  const dpIcon = () => {
    const b = el('button', 'rux--date-picker__icon');
    b.type = 'button';
    b.setAttribute('aria-label', 'Open calendar');
    b.tabIndex = -1;
    b.appendChild(svgUse('#m-calendar_month', '16', '0 0 32 32'));
    return b;
  };
  const DP_CONTAINER = {
    from: 'rux--date-picker-container rux--date-picker-container--from',
    to: 'rux--date-picker-container rux--date-picker-container--to',
  };
  const dpContainer = (which, id, label, value) => {
    const c = el('div', DP_CONTAINER[which]);
    const lab = el('label', 'rux--label', label);
    lab.setAttribute('for', id);
    const wrap = el('div', 'rux--date-picker-input__wrapper');
    const span = el('span');
    const input = el('input', 'rux--date-picker__input');
    input.type = 'text';
    input.id = id;
    input.autocomplete = 'off';
    input.placeholder = 'mm/dd/yyyy';
    input.value = shownDay(value);
    span.append(input, dpIcon());
    wrap.appendChild(span);
    c.append(lab, wrap);
    return c;
  };
  function calendarBody() {
    const cc = el('div', 'rux--date-picker__calendar-container rux--layer-two');
    cc.hidden = true;
    const cal = el('div', 'rux--date-picker__calendar');
    cal.setAttribute('role', 'grid');
    cal.setAttribute('aria-label', 'Calendar');
    cal.tabIndex = 0;
    const month = el('div', 'rux--date-picker__month');
    const prev = el('button', 'rux--date-picker__month-nav');
    prev.type = 'button'; prev.setAttribute('aria-label', 'Previous month');
    prev.appendChild(svgUse('#m-keyboard_arrow_left', '16', '0 0 16 16'));
    const next = el('button', 'rux--date-picker__month-nav');
    next.type = 'button'; next.setAttribute('aria-label', 'Next month');
    next.appendChild(svgUse('#m-keyboard_arrow_right', '16', '0 0 16 16'));
    month.append(prev, el('div', 'rux--date-picker__current-month'), next);
    const weekdays = el('div', 'rux--date-picker__weekdays');
    for (let i = 0; i < 7; i++) weekdays.appendChild(el('div', 'rux--date-picker__weekday'));
    cal.append(month, weekdays, el('div', 'rux--date-picker__days'));
    cc.appendChild(cal);
    return cc;
  }
  function selectField(id, label, value, options) {
    const item = el('div', 'rux--form-item');
    const box = el('div', 'rux--select');
    const lab = el('label', 'rux--label', label);
    lab.setAttribute('for', id);
    const wrap = el('div', 'rux--select-input__wrapper');
    const sel = el('select', 'rux--select-input');
    sel.id = id;
    for (const [v, t] of options) {
      const o = el('option', 'rux--select-option', t);
      o.value = v;
      o.selected = v === value;
      sel.appendChild(o);
    }
    wrap.append(sel, svgUse('#m-keyboard_arrow_down', '16', '0 0 16 16', 'rux--select__arrow'));
    box.append(lab, wrap);
    item.appendChild(box);
    return item;
  }

  let offEditing = null;
  function openOff(index, trigger) {
    offEditing = index;
    const r = index === null ? { reason: 'vacation' } : off[index];
    $('scheduler-off-h').textContent = index === null ? 'Add time off' : 'Edit time off';
    const range = el('div', 'rux--date-picker rux--date-picker--next rux--date-picker--range');
    range.append(dpContainer('from', 'scheduler-off-start', 'First day', r.start_date),
      dpContainer('to', 'scheduler-off-end', 'Last day', r.end_date), calendarBody());
    const rangeItem = el('div', 'rux--form-item');
    rangeItem.appendChild(range);
    const error = el('div', 'rux--form__helper-text scheduler-off-error');
    error.id = 'scheduler-off-error';
    error.hidden = true;
    error.setAttribute('role', 'alert');

    const notesItem = el('div', 'rux--form-item rux--text-input-wrapper');
    const lw = el('div', 'rux--text-input__label-wrapper');
    const lab = el('label', 'rux--label', 'Notes');
    lab.setAttribute('for', 'scheduler-off-notes');
    lw.appendChild(lab);
    const outer = el('div', 'rux--text-input__field-outer-wrapper');
    const wrap = el('div', 'rux--text-input__field-wrapper');
    const input = el('input', 'rux--text-input');
    input.type = 'text';
    input.id = 'scheduler-off-notes';
    input.autocomplete = 'off';
    input.value = r.notes || '';
    wrap.appendChild(input);
    outer.appendChild(wrap);
    notesItem.append(lw, outer);

    const host = $('scheduler-off-fields');
    const stack = el('div', 'rux--stack-vertical rux--stack-scale-6');
    stack.append(rangeItem, error, selectField('scheduler-off-reason', 'Reason', r.reason || 'other', REASONS), notesItem);
    host.replaceChildren(stack);
    window.Rux?.datePicker?.init?.(host);
    window.Rux?.modal?.open?.('scheduler-off-modal', trigger);
  }

  $('scheduler-driver-off-add')?.addEventListener('click', e => openOff(null, e.currentTarget));
  $('scheduler-off-done')?.addEventListener('click', () => {
    const start = fieldDay($('scheduler-off-start').value);
    // A blank last day is the first day: the picker clears it on a first pick.
    const endText = $('scheduler-off-end').value.trim();
    const end = endText ? fieldDay(endText) : start;
    const error = $('scheduler-off-error');
    if (!start || !end) {
      error.textContent = 'Pick the first and last day.';
      error.hidden = false;
      return;
    }
    const row = {
      start_date: start <= end ? start : end,
      end_date: start <= end ? end : start,
      reason: $('scheduler-off-reason').value || null,
      notes: $('scheduler-off-notes').value.trim() || null,
    };
    if (offEditing === null) off.push(row);
    else off[offEditing] = { ...off[offEditing], ...row };
    off.sort((a, b) => a.start_date.localeCompare(b.start_date));
    window.Rux?.modal?.close?.('scheduler-off-modal');
    drawOff();
    changed();
  });

  // ── schedule link and trips, read only ──
  async function drawLink() {
    const section = $('scheduler-driver-link-section');
    const note = $('scheduler-driver-link-text');
    const copy = $('scheduler-driver-link-copy');
    section.hidden = false;
    copy.hidden = true;
    note.textContent = 'Loading…';
    const { data, error } = await client.rpc('get_driver_schedule_share_for_driver', { p_driver_id: loaded.id });
    if (error) { note.textContent = "The link didn't load."; return; }
    if (!data?.token) { note.textContent = 'No link yet. Driver links are made in rux-ui.'; return; }
    const covers = data.rangeStart ? `Covers ${rangeText(data.rangeStart, data.rangeEnd)}. ` : '';
    const ends = String(data.expiresAt || '').slice(0, 10);
    if (ends && daysUntil(ends) < 0) {
      note.textContent = `${covers}It stopped working on ${longDate(ends)}. Make a new one in rux-ui.`;
      return;
    }
    note.textContent = `${covers}${ends ? `It works until ${longDate(ends)}.` : ''}`;
    copy.hidden = false;
    $('scheduler-driver-link-button').dataset.url = DRIVER_LINK + encodeURIComponent(data.token);
  }
  $('scheduler-driver-link-button')?.addEventListener('click', async e => {
    const btn = e.currentTarget;
    try {
      await navigator.clipboard.writeText(btn.dataset.url);
      result('success', 'Link copied.');
    } catch {
      result('error', "The link couldn't be copied.");
    }
  });

  const LEG = { outbound: 'Outbound', return: 'Return' };
  // A stored role, such as `relief-driver`, as words in sentence case.
  const sentence = s => { const t = s.replace(/[-_]/g, ' '); return t[0].toUpperCase() + t.slice(1); };
  async function drawTrips() {
    const section = $('scheduler-driver-trips-section');
    const list = $('scheduler-driver-trips');
    const { data, error } = await client.from('trip_drivers')
      .select('role,trip_assignments(leg,buses(number),trips(id,trip_ref,destination,customer,start_date,end_date,return_start_date,return_end_date,cancelled_at))')
      .eq('driver_id', loaded.id);
    section.hidden = false;
    list.replaceChildren();
    const now = iso(today());
    const legs = error ? [] : (data || []).map(r => {
      const a = r.trip_assignments;
      const t = a?.trips;
      if (!t || t.cancelled_at) return null;
      const back = a.leg === 'return';
      const from = String((back ? t.return_start_date : t.start_date) || '').slice(0, 10);
      const to = String((back ? (t.return_end_date || t.return_start_date) : (t.end_date || t.start_date)) || '').slice(0, 10);
      if (!ISO.test(from) || (to || from) < now) return null;
      return { t, from, to: to || from, leg: a.leg, bus: a.buses?.number, role: r.role };
    }).filter(Boolean).sort((a, b) => a.from.localeCompare(b.from));

    if (error || !legs.length) {
      const li = el('li', 'rux--contained-list-item');
      li.appendChild(el('div', 'rux--contained-list-item__content scheduler-pair-note',
        error ? "The trips didn't load." : 'No upcoming trips.'));
      list.appendChild(li);
      return;
    }
    for (const l of legs) {
      const li = el('li', 'rux--contained-list-item rux--contained-list-item--clickable');
      const a = el('a', 'rux--contained-list-item__content scheduler-pair-trip');
      a.href = `./?trip=${encodeURIComponent(l.t.id)}&date=${l.from}`;
      // Carbon lays a clickable item's content out itself, so the two lines
      // stack in a box of their own.
      const lines = el('span', 'scheduler-pair-item');
      lines.appendChild(el('span', 'scheduler-pair-item__main', `${rangeText(l.from, l.to)} · ${l.t.destination || 'No destination'}`));
      const detail = [
        l.t.customer,
        l.t.return_start_date ? LEG[l.leg] || null : null,
        l.bus ? `Bus ${l.bus}` : 'No bus',
        l.role && l.role !== 'driver' ? sentence(l.role) : null,
      ].filter(Boolean).join(' · ');
      lines.appendChild(el('span', 'scheduler-pair-item__detail', detail));
      a.appendChild(lines);
      li.appendChild(a);
      list.appendChild(li);
    }
  }

  // ── load, change, save ──
  async function loadDriver() {
    result(null);
    if (!driverId) {
      loaded = null;
      loadedOff = [];
      off = [];
      fillForm({ status: 'active', employment_type: 'full-time', priority: 3 });
    } else {
      const [row, times] = await Promise.all([
        client.from('drivers').select(DRIVER_COLUMNS).eq('id', driverId).maybeSingle(),
        client.from('driver_time_off').select('id,start_date,end_date,reason,notes,position').eq('driver_id', driverId).order('position'),
      ]);
      if (row.error || times.error) throw row.error || times.error;
      if (!row.data) return false;
      loaded = row.data;
      loadedOff = (times.data || []).map(r => ({ ...r, start_date: String(r.start_date).slice(0, 10), end_date: String(r.end_date).slice(0, 10) }));
      off = loadedOff.map(r => ({ ...r })).sort((a, b) => a.start_date.localeCompare(b.start_date));
      fillForm(loaded);
    }
    drawTitle();
    drawOff();
    baseline = snapshot();
    $('scheduler-driver').hidden = false;
    if (loaded) { drawLink(); drawTrips(); }
    return true;
  }

  function changed() {
    drawExpiry();
  }
  form?.addEventListener('input', changed);
  form?.addEventListener('change', changed);

  /* Writes the driver, then their time off if it changed. Each write that
     lands is kept as the page's saved state, so a Save that stops partway
     says what did not save, and the next Save sends only that, with no false
     conflict and no second copy of anything. */
  async function save(force = false) {
    if (!validate()) return false;
    const row = readForm();
    const saveBtn = $('scheduler-driver-save');
    saveBtn.disabled = true;
    let part = 'the driver';  // what was being written or read when it stopped
    try {
      const id = loaded?.id ?? newId;
      if (loaded && !force) {
        const [now, times] = await Promise.all([
          client.from('drivers').select(DRIVER_COLUMNS).eq('id', id).maybeSingle(),
          client.from('driver_time_off').select('start_date,end_date,reason,notes,position').eq('driver_id', id),
        ]);
        if (now.error || times.error) throw now.error || times.error;
        const theirs = (times.data || []).map(r => ({ ...r, start_date: String(r.start_date).slice(0, 10), end_date: String(r.end_date).slice(0, 10) }));
        if (!now.data || comparable(now.data) !== comparable(loaded) || offHeld(theirs) !== offHeld(loadedOff)) {
          guard.conflict();
          return false;
        }
      }
      const saved = await window.SchedulerPair.saveRecord(client, 'drivers',
        { id, creating: !loaded, row, columns: DRIVER_COLUMNS });
      if (!loaded) history.replaceState(null, '', `drivers.html?id=${encodeURIComponent(id)}`);
      loaded = saved;
      currentId = id;

      // Each range keeps its place on the page, which is the order rux-ui lists.
      part = 'their time off';
      await window.SchedulerPair.syncRows(client, 'driver_time_off', {
        have: loadedOff, want: off, key: r => JSON.stringify(offRow(r)), order: 'position',
        rowOf: (r, position) => ({ driver_id: id, position, start_date: r.start_date, end_date: r.end_date,
                                   reason: r.reason || null, notes: r.notes || null }),
        landed: rows => { loadedOff = rows; },
      });

      part = 'the read-back';
      await reload(id);
      result('success', 'Saved.');
      return true;
    } catch {
      if (part === 'the read-back') {
        // Everything was written; only the read-back failed.
        baseline = snapshot();
        result('error', "The driver saved, but the page didn't read it back. Reload the page to see it.");
        return true;
      }
      if (part === 'the driver') result('error', "The driver wasn't saved. Try again.");
      else result('error', `The driver saved, but ${part} didn't. Save again to finish.`);
      return false;
    } finally {
      saveBtn.disabled = false;
    }
  }

  let currentId = driverId;
  async function reload(id = currentId) {
    const { data: row, error } = await client.from('drivers').select(DRIVER_COLUMNS).eq('id', id).maybeSingle();
    const times = await client.from('driver_time_off').select('id,start_date,end_date,reason,notes,position').eq('driver_id', id).order('position');
    if (error || times.error || !row) throw error || times.error || new Error('Driver not found');
    loaded = row;
    loadedOff = (times.data || []).map(r => ({ ...r, start_date: String(r.start_date).slice(0, 10), end_date: String(r.end_date).slice(0, 10) }));
    off = loadedOff.map(r => ({ ...r }));
    fillForm(loaded);
    drawTitle();
    drawOff();
    baseline = snapshot();
    drawLink();
    drawTrips();
  }

  form?.addEventListener('submit', e => {
    e.preventDefault();
    save();
  });

  // Leaving with unsaved changes, and a conflict found by Save.
  const guard = pair.guard({ editing, dirty, save, reload });

  // ── the photo ──
  const photoInput = $('scheduler-driver-photo-input');
  $('scheduler-driver-photo-add')?.addEventListener('click', () => photoInput.click());
  photoInput?.addEventListener('change', async () => {
    const file = photoInput.files?.[0];
    photoInput.value = '';
    if (!file || !loaded) return;
    if (!/^image\//.test(file.type || 'image/')) { result('error', 'Choose a photo.'); return; }
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `${loaded.id}/photo-${Date.now()}.${ext}`;
    const old = loaded.photo_path;
    result('info', 'Uploading the photo…');
    const up = await client.storage.from(PHOTO_BUCKET).upload(path, file, { contentType: file.type || undefined, upsert: false });
    if (up.error) { result('error', "The photo wasn't uploaded. Try again."); return; }
    const { error } = await client.from('drivers').update({ photo_path: path }).eq('id', loaded.id);
    if (error) {
      await client.storage.from(PHOTO_BUCKET).remove([path]);
      result('error', "The photo wasn't saved. Try again.");
      return;
    }
    loaded.photo_path = path;
    if (old && old !== path) await client.storage.from(PHOTO_BUCKET).remove([old]);
    drawTitle();
    result('success', 'Photo saved.');
  });
  $('scheduler-driver-photo-remove')?.addEventListener('click', async () => {
    if (!loaded?.photo_path) return;
    const old = loaded.photo_path;
    const { error } = await client.from('drivers').update({ photo_path: null }).eq('id', loaded.id);
    if (error) { result('error', "The photo wasn't removed. Try again."); return; }
    loaded.photo_path = null;
    await client.storage.from(PHOTO_BUCKET).remove([old]);
    drawTitle();
    $('scheduler-driver-photo-add').focus();
    result('success', 'Photo removed.');
  });

  /* ══ Start ══════════════════════════════════════════════════════════════ */
  pair.start(async signedIn => {
    client = signedIn;
    if (!editing) { await loadList(); return; }
    if (!(await loadDriver())) {
      say('info', 'That driver is not in the list', 'Pick a driver from the list below.');
      history.replaceState(null, '', 'drivers.html');
      await loadList();
    }
  });
})();
