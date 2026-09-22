/* ==========================================================================
   buses.js — THE BUSES PAGE
   --------------------------------------------------------------------------
   buses.html lists every bus. buses.html?id=<bus id> edits one and
   buses.html?new makes one. Both read and write the tables rux-ui writes,
   `buses` and `bus_out_of_service`, so both apps show the same fleet.

   The list sorts itself rather than through js/data-table.js, because the
   fleet's own order is by model year and two columns sort by the date they
   describe, not by their text.

   THE FLEET'S ORDER IS THE MODEL YEAR, newest first, buses of one year by
   their number, and a bus with no year last. `buses.sort_order` carries it,
   because rux-ui draws its rows from that column; Save renumbers the whole
   fleet whenever the years no longer match the numbering, so the board and
   rux-ui never disagree about which row is which.

   A bus is never deleted here, only set Inactive, so past trips keep the
   bus's number. Out of service is worked out from the dates, never stored:
   `buses.status` holds only active and inactive.
   ========================================================================== */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const svgUse = (href, size, viewBox, cls) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    if (cls) svg.setAttribute('class', cls);
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('viewBox', viewBox);
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', href);
    svg.appendChild(use);
    return svg;
  };

  const params = new URLSearchParams(location.search);
  const busId = params.get('id');
  const editing = !!busId || params.has('new');

  // An expiry this close shows as a warning, as the Drivers page warns.
  const WARN_DAYS = 45;
  const HEX = /^#[0-9a-fA-F]{6}$/;

  const BUS_COLUMNS = [
    'id', 'number', 'capacity', 'type', 'ada_lift', 'sleeper', 'status',
    'make', 'model', 'year', 'vin', 'color', 'mileage',
    'last_service', 'next_service', 'insurance_exp', 'registration_exp', 'inspection_exp',
    'sort_order', 'notes', 'bus_ref',
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
  const day = v => (ISO.test(String(v ?? '').slice(0, 10)) ? String(v).slice(0, 10) : null);

  /* Whichever of the insurance, registration and inspection expires first.
     `rank` sorts the list: the soonest first, and nothing on file last. */
  const COMPLIANCE_DATES = [
    ['Insurance', 'insurance_exp'],
    ['Registration', 'registration_exp'],
    ['Inspection', 'inspection_exp'],
  ];
  function expiryState(what, when) {
    const n = daysUntil(when);
    if (n < 0) return { kind: 'expired', text: `${what} expired ${plural(-n, 'day')} ago`, rank: n };
    if (n === 0) return { kind: 'soon', text: `${what} expires today`, rank: n };
    if (n <= WARN_DAYS) return { kind: 'soon', text: `${what} expires in ${plural(n, 'day')}`, rank: n };
    return { kind: 'ok', text: longDate(when), rank: n };
  }
  function compliance(b) {
    const dates = COMPLIANCE_DATES.map(([what, col]) => [what, day(b[col])])
      .filter(([, v]) => v)
      .sort((x, y) => x[1].localeCompare(y[1]));
    if (!dates.length) return { kind: 'none', text: 'Not on file', rank: Number.MAX_SAFE_INTEGER };
    return expiryState(dates[0][0], dates[0][1]);
  }
  /* Next service is a plan rather than a rule, so it is its own column: a
     service that is late and a registration that has expired are different
     problems, and one column could not say which. */
  function service(b) {
    const when = day(b.next_service);
    if (!when) return { kind: 'none', text: 'Not booked', rank: Number.MAX_SAFE_INTEGER };
    const n = daysUntil(when);
    if (n < 0) return { kind: 'expired', text: `Due ${plural(-n, 'day')} ago`, rank: n };
    if (n === 0) return { kind: 'soon', text: 'Due today', rank: n };
    if (n <= WARN_DAYS) return { kind: 'soon', text: `Due in ${plural(n, 'day')}`, rank: n };
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

  const TYPES = [['Coach', 'Coach'], ['Van', 'Van']];
  const isActive = b => b.status !== 'inactive';
  // Both ends of a window count, so one day out is a window of that day twice.
  const outOn = (windows, when) => (windows || []).some(w => w.start_date <= when && w.end_date >= when);
  const overlaps = (windows, from, to) => (windows || []).some(w => w.start_date <= (to || from) && w.end_date >= from);
  /* Three states from two stored ones. A bus out of service today still takes
     trips, so the state says where it is, not whether it can be used. */
  function state(b, windows) {
    if (!isActive(b)) return 'inactive';
    return outOn(windows, iso(today())) ? 'out' : 'active';
  }
  const STATE = {
    active: { label: 'Active', tag: 'rux--tag rux--tag--green' },
    out: { label: 'Out of service', tag: 'rux--tag rux--tag--magenta' },
    inactive: { label: 'Inactive', tag: 'rux--tag rux--tag--gray' },
  };

  // ── the notice ──────────────────────────────────────────────────────────
  // Every class is written out in full: the class sweep reads the source.
  const NOTE = {
    info: { cls: 'rux--inline-notification rux--inline-notification--info', icon: '#m-info-fill' },
    error: { cls: 'rux--inline-notification rux--inline-notification--error', icon: '#m-error-fill' },
    success: { cls: 'rux--inline-notification rux--inline-notification--success', icon: '#m-check_circle-fill' },
  };
  const say = (kind, title, text) => {
    $('scheduler-buses-notice').hidden = !kind;
    if (!kind) return;
    $('scheduler-buses-notice-box').className = NOTE[kind].cls;
    $('scheduler-buses-notice-icon').setAttribute('href', NOTE[kind].icon);
    $('scheduler-buses-notice-title').textContent = title;
    $('scheduler-buses-notice-text').textContent = text || '';
  };
  const result = (kind, text) => {
    $('scheduler-bus-result').hidden = !kind;
    if (!kind) return;
    $('scheduler-bus-result-box').className = NOTE[kind].cls;
    $('scheduler-bus-result-icon').setAttribute('href', NOTE[kind].icon);
    $('scheduler-bus-result-text').textContent = text;
  };

  /* ══ The fleet's order ══════════════════════════════════════════════════
     One comparator, used by the list, by the renumbering and by the board
     through the column it writes. A number is read as a number, so bus 9
     comes before bus 10. */
  const numberOf = b => {
    const digits = String(b.number ?? '').replace(/\D/g, '');
    return digits ? Number(digits) : Number.MAX_SAFE_INTEGER;
  };
  const fleetOrder = (a, b) =>
    ((b.year ?? -Infinity) - (a.year ?? -Infinity) || 0)
    || (numberOf(a) - numberOf(b))
    || String(a.number || '').localeCompare(String(b.number || ''));

  /* ══ The list ═══════════════════════════════════════════════════════════ */
  let buses = [];
  let outByBus = new Map();
  let filter = 'active';
  let query = '';
  let sortKey = null;
  let sortDir = 'none';

  const matches = (b, q) => {
    if (!q) return true;
    return [b.number, b.make, b.model, b.vin, b.bus_ref, b.type]
      .filter(Boolean).join(' ').toLowerCase().includes(q.toLowerCase());
  };

  const equipmentRank = b => (b.ada_lift ? 2 : 0) + (b.sleeper ? 1 : 0);
  const STATE_ORDER = { active: 0, out: 1, inactive: 2 };
  const SORTS = {
    bus: (a, b) => numberOf(a) - numberOf(b) || String(a.number || '').localeCompare(String(b.number || '')),
    capacity: (a, b) => (a.capacity ?? -1) - (b.capacity ?? -1),
    equipment: (a, b) => equipmentRank(b) - equipmentRank(a),
    status: (a, b) => STATE_ORDER[state(a, outByBus.get(a.id))] - STATE_ORDER[state(b, outByBus.get(b.id))],
    service: (a, b) => service(a).rank - service(b).rank,
    compliance: (a, b) => compliance(a).rank - compliance(b).rank,
  };

  /* The bus's own colour as a disc. A bus may be any colour, so the icon on
     it is black or white by the colour's own brightness, not by the theme. */
  function disc(colour) {
    const box = el('div', 'scheduler-bus-disc');
    box.setAttribute('aria-hidden', 'true');
    if (HEX.test(String(colour || ''))) {
      const hex = String(colour);
      const [r, g, bl] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
      box.style.background = hex;
      box.style.color = (0.299 * r + 0.587 * g + 0.114 * bl) > 150 ? '#000000' : '#ffffff';
    }
    box.appendChild(svgUse('#m-directions_bus', '16', '0 0 32 32'));
    return box;
  }

  // Icons, because the words would be longer than the column. Each carries
  // its own label, so a screen reader hears what the icon means.
  function equipment(b) {
    const box = el('div', 'scheduler-bus-equipment-marks');
    const mark = (icon, label) => {
      const svg = svgUse(icon, '16', '0 0 32 32');
      svg.removeAttribute('aria-hidden');
      svg.setAttribute('role', 'img');
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = label;
      svg.prepend(title);
      box.appendChild(svg);
    };
    if (b.ada_lift) mark('#m-accessible', 'ADA lift');
    if (b.sleeper) mark('#m-airline_seat_flat', 'Sleeper');
    if (!box.childElementCount) return el('span', null, '—');
    return box;
  }

  function drawList() {
    const counts = { active: 0, out: 0, inactive: 0, all: buses.length };
    for (const b of buses) counts[state(b, outByBus.get(b.id))]++;
    for (const span of document.querySelectorAll('#scheduler-buses-filter [data-count]')) {
      span.textContent = `(${counts[span.dataset.count]})`;
    }

    const shown = buses
      .filter(b => filter === 'all' || state(b, outByBus.get(b.id)) === filter)
      .filter(b => matches(b, query))
      .sort((a, b) => {
        if (sortDir === 'none') return fleetOrder(a, b);
        const r = SORTS[sortKey](a, b) || fleetOrder(a, b);
        return sortDir === 'descending' ? -r : r;
      });

    const body = $('scheduler-buses-rows');
    body.replaceChildren();
    if (!shown.length) {
      const tr = el('tr');
      const td = el('td', null, query ? `No buses match “${query}”.` : 'No buses here.');
      td.colSpan = 6;
      tr.appendChild(td);
      body.appendChild(tr);
      return;
    }
    for (const b of shown) {
      const tr = el('tr', 'scheduler-buses-row');
      tr.dataset.id = b.id;

      const which = el('td');
      const cell = el('div', 'scheduler-bus-cell');
      const lines = el('div', 'scheduler-bus-cell__lines');
      const link = el('a', 'scheduler-bus-cell__number', b.number ? `Bus ${b.number}` : 'Unnumbered bus');
      link.href = `buses.html?id=${encodeURIComponent(b.id)}`;
      lines.appendChild(link);
      // The year is what the fleet is ordered by, so the row shows it.
      const detail = [b.year || 'No year', [b.make, b.model].filter(Boolean).join(' ') || null, b.type]
        .filter(Boolean).join(' · ');
      lines.appendChild(el('span', 'scheduler-bus-cell__detail', detail));
      cell.append(disc(b.color), lines);
      which.appendChild(cell);

      const seats = el('td', null, b.capacity ? String(b.capacity) : '—');
      const kit = el('td');
      kit.appendChild(equipment(b));

      const where = state(b, outByBus.get(b.id));
      const status = el('td');
      const tag = el('div', STATE[where].tag);
      tag.appendChild(el('span', 'rux--tag__label', STATE[where].label));
      status.appendChild(tag);

      const due = el('td');
      due.appendChild(indicator(service(b)));
      const legal = el('td');
      legal.appendChild(indicator(compliance(b)));

      tr.append(which, seats, kit, status, due, legal);
      body.appendChild(tr);
    }
  }

  // A click anywhere on a row opens its bus; the number is the link a
  // keyboard reaches.
  $('scheduler-buses-rows')?.addEventListener('click', e => {
    const tr = e.target.closest('tr[data-id]');
    if (!tr || e.target.closest('a')) return;
    location.href = `buses.html?id=${encodeURIComponent(tr.dataset.id)}`;
  });

  // Carbon's three-step sort: ascending, descending, then back to the fleet's
  // own order.
  const NEXT = { none: 'ascending', ascending: 'descending', descending: 'none' };
  document.querySelector('#scheduler-buses-list thead')?.addEventListener('click', e => {
    const th = e.target.closest('th[data-sort]');
    if (!th) return;
    const dir = sortKey === th.dataset.sort ? NEXT[sortDir] : 'ascending';
    sortKey = th.dataset.sort;
    sortDir = dir;
    for (const other of document.querySelectorAll('#scheduler-buses-list th[data-sort]')) {
      const on = other === th && dir !== 'none';
      other.setAttribute('aria-sort', on ? dir : 'none');
      const button = other.querySelector('.rux--table-sort');
      button.classList.toggle('rux--table-sort--active', on);
      button.classList.toggle('rux--table-sort--descending', on && dir === 'descending');
    }
    drawList();
  });

  // The content switcher: a click or the arrow keys pick, as Carbon's does.
  const switcher = $('scheduler-buses-filter');
  const pick = btn => {
    for (const b of switcher.querySelectorAll('.rux--content-switcher-btn')) {
      const on = b === btn;
      b.classList.toggle('rux--content-switcher--selected', on);
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    }
    filter = btn.dataset.filter;
    drawList();
  };
  switcher?.addEventListener('click', e => {
    const btn = e.target.closest('.rux--content-switcher-btn');
    if (btn) pick(btn);
  });
  switcher?.addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const all = [...switcher.querySelectorAll('.rux--content-switcher-btn')];
    const at = all.indexOf(document.activeElement);
    if (at < 0) return;
    e.preventDefault();
    const next = all[(at + (e.key === 'ArrowRight' ? 1 : all.length - 1)) % all.length];
    pick(next);
    next.focus();
  });

  const searchInput = $('scheduler-buses-search');
  const searchClear = $('scheduler-buses-search-clear');
  searchInput?.addEventListener('input', () => {
    query = searchInput.value.trim();
    searchClear.classList.toggle('rux--search-close--hidden', !searchInput.value);
    drawList();
  });
  searchClear?.addEventListener('click', () => {
    searchInput.value = '';
    searchInput.dispatchEvent(new Event('input'));
    searchInput.focus();
  });
  searchInput?.addEventListener('keydown', e => {
    if (e.key === 'Escape' && searchInput.value) { e.preventDefault(); searchClear.click(); }
  });

  const indexOut = rows => {
    const map = new Map();
    for (const r of rows || []) {
      const w = { start_date: day(r.start_date), end_date: day(r.end_date), reason: r.reason || null };
      if (!w.start_date || !w.end_date) continue;
      if (!map.has(r.bus_id)) map.set(r.bus_id, []);
      map.get(r.bus_id).push(w);
    }
    return map;
  };

  async function loadList() {
    const [rows, windows] = await Promise.all([
      client.from('buses').select(BUS_COLUMNS),
      client.from('bus_out_of_service').select('bus_id,start_date,end_date,reason'),
    ]);
    if (rows.error) throw rows.error;
    buses = rows.data || [];
    // A window that would not load leaves the list readable: every bus then
    // reads by its stored status alone, which is what it is.
    outByBus = indexOut(windows.error ? [] : windows.data);
    $('scheduler-buses-list').hidden = false;
    drawList();
  }

  /* ══ One bus ════════════════════════════════════════════════════════════ */
  const form = $('scheduler-bus-form');
  const field = id => $(`scheduler-b-${id}`);
  const text = id => field(id).value.trim() || null;
  const dateOf = id => fieldDay(field(id).value);
  const digits = id => {
    const v = text(id);
    if (!v) return null;
    const n = Number(v.replace(/[^0-9]/g, ''));
    return Number.isFinite(n) && v.replace(/[^0-9]/g, '') !== '' ? n : null;
  };

  // Cancel and Save stack on a phone, as Carbon's stacked button set does.
  const narrow = matchMedia('(max-width: 41.98rem)');
  const stackButtons = () => document.querySelector('.scheduler-bus-buttons')
    ?.classList.toggle('rux--btn-set--stacked', narrow.matches);
  stackButtons();
  narrow.addEventListener('change', stackButtons);

  let loaded = null;        // the bus row as the page read it
  let loadedOut = [];       // its out-of-service rows, as read
  let out = [];             // the rows on the page, saved with the form
  let baseline = '';        // the form as loaded, to tell whether it changed

  /* The columns Save writes, read off the form. A blank field saves as null.
     `sort_order` is not among them: it is the fleet's order, renumbered by
     Save over every bus, never typed. */
  function readForm() {
    return {
      number: text('number'),
      capacity: digits('capacity'),
      type: field('type').value || null,
      year: digits('year'),
      make: text('make'),
      model: text('model'),
      vin: text('vin')?.toUpperCase() ?? null,
      color: text('color')?.toLowerCase() ?? null,
      ada_lift: field('ada').checked,
      sleeper: field('sleeper').checked,
      status: document.querySelector('input[name="scheduler-b-status"]:checked')?.value || 'active',
      mileage: digits('mileage'),
      last_service: dateOf('last-service'),
      next_service: dateOf('next-service'),
      insurance_exp: dateOf('insurance'),
      registration_exp: dateOf('registration'),
      inspection_exp: dateOf('inspection'),
      notes: field('notes').value.trim() || null,
    };
  }
  const WRITTEN = Object.keys({
    number: 0, capacity: 0, type: 0, year: 0, make: 0, model: 0, vin: 0, color: 0,
    ada_lift: 0, sleeper: 0, status: 0, mileage: 0, last_service: 0, next_service: 0,
    insurance_exp: 0, registration_exp: 0, inspection_exp: 0, notes: 0,
  });

  // A row reduced to what Save writes, so a read-back compares like with like.
  const comparable = row => JSON.stringify(WRITTEN.map(k => {
    const v = row?.[k];
    if (v === undefined || v === '') return null;
    if (k.endsWith('_exp') || k.endsWith('_service')) return day(v);
    if (k === 'ada_lift' || k === 'sleeper') return !!v;
    return v;
  }));
  const outKey = list => JSON.stringify(list.map(r => [r.start_date, r.end_date, r.reason || null]));
  const snapshot = () => comparable(readForm()) + outKey(out);
  const dirty = () => baseline !== '' && snapshot() !== baseline;

  function fillForm(b) {
    const set = (id, v) => { field(id).value = v ?? ''; };
    set('number', b.number);
    set('capacity', b.capacity == null ? '' : String(b.capacity));
    set('type', TYPES.some(([v]) => v === b.type) ? b.type : 'Coach');
    set('year', b.year == null ? '' : String(b.year));
    set('make', b.make);
    set('model', b.model);
    set('vin', b.vin);
    set('color', b.color);
    field('ada').checked = !!b.ada_lift;
    field('sleeper').checked = !!b.sleeper;
    $(`scheduler-b-status-${b.status === 'inactive' ? 'inactive' : 'active'}`).checked = true;
    set('mileage', b.mileage == null ? '' : String(b.mileage));
    set('last-service', shownDay(day(b.last_service) || ''));
    set('next-service', shownDay(day(b.next_service) || ''));
    set('insurance', shownDay(day(b.insurance_exp) || ''));
    set('registration', shownDay(day(b.registration_exp) || ''));
    set('inspection', shownDay(day(b.inspection_exp) || ''));
    set('notes', b.notes);
    drawColour();
    drawExpiry();
    clearErrors();
  }

  function drawTitle() {
    const name = loaded?.number ? `Bus ${loaded.number}` : null;
    $('scheduler-bus-h').textContent = name || 'New bus';
    document.title = `${name || 'New bus'} — Scheduler`;
    const tag = $('scheduler-bus-status-tag');
    tag.hidden = !loaded;
    if (loaded) {
      const where = state(loaded, out);
      tag.className = STATE[where].tag;
      tag.querySelector('.rux--tag__label').textContent = STATE[where].label;
    }
    // A bus not yet saved has no trips, so no Trips tab.
    $('scheduler-bus-tabs').hidden = !loaded;
  }

  /* The swatch and the hex field are one control, so each follows the other.
     A colour that is not six hex digits leaves the swatch at Carbon's own
     gray and says so under the field. */
  const swatch = $('scheduler-b-colour-pick');
  function drawColour() {
    const v = String(field('color').value || '').trim();
    if (HEX.test(v)) swatch.value = v.toLowerCase();
  }
  swatch?.addEventListener('input', () => {
    field('color').value = swatch.value;
    changed();
  });

  /* A warning under a date that has passed or is close, with the list's red
     or yellow status icon. Carbon shows the requirement only beside a wrapper
     in its warn state. */
  function drawExpiry() {
    for (const help of document.querySelectorAll('.scheduler-bus-expiry')) {
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
      const booking = help.dataset.expiryFor === 'scheduler-b-next-service';
      help.appendChild(indicator({
        kind: n < 0 ? 'expired' : 'soon',
        text: n < 0
          ? (booking ? `Overdue by ${plural(-n, 'day')}` : `Expired ${plural(-n, 'day')} ago`)
          : n === 0
            ? (booking ? 'Due today' : 'Expires today')
            : (booking ? `Due in ${plural(n, 'day')}` : `Expires in ${plural(n, 'day')}`),
      }));
    }
  }

  // ── validation ──
  const ERRORS = ['number', 'year', 'color'];
  function clearErrors() {
    for (const id of ERRORS) showError(id, '');
  }
  function showError(id, message) {
    const input = field(id);
    const wrap = input.closest('.rux--text-input__field-wrapper');
    const on = !!message;
    input.classList.toggle('rux--text-input--invalid', on);
    input.toggleAttribute('data-invalid', on);
    wrap.toggleAttribute('data-invalid', on);
    if (on) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    input.setAttribute('aria-describedby', `scheduler-b-${id}-error`);
    let icon = wrap.querySelector('.rux--text-input__invalid-icon');
    if (on && !icon) {
      icon = svgUse('#m-report-fill', '16', '0 0 32 32', 'rux--text-input__invalid-icon');
      wrap.prepend(icon);
    }
    if (!on) icon?.remove();
    $(`scheduler-b-${id}-error`).textContent = message;
  }
  function validate() {
    clearErrors();
    let first = null;
    if (!text('number')) { showError('number', 'Enter a bus number.'); first ??= field('number'); }
    // A bus number is what the board's row is called, so two buses may not
    // share one.
    else if (buses.some(b => b.id !== loaded?.id && String(b.number).toLowerCase() === text('number').toLowerCase())) {
      showError('number', 'Another bus already has this number.');
      first ??= field('number');
    }
    const year = text('year');
    if (year && !/^(19|20)\d{2}$/.test(year)) {
      showError('year', 'Use a four-digit year, such as 2024.');
      first ??= field('year');
    }
    const colour = text('color');
    if (colour && !HEX.test(colour)) {
      showError('color', 'Use six hex digits, such as #8d8d8d.');
      first ??= field('color');
    }
    first?.focus();
    return !first;
  }

  // ── out of service ──
  function drawOut() {
    const list = $('scheduler-bus-oos');
    list.replaceChildren();
    if (!out.length) {
      const li = el('li', 'rux--contained-list-item');
      li.appendChild(el('div', 'rux--contained-list-item__content scheduler-bus-note', 'In service every day.'));
      list.appendChild(li);
      return;
    }
    const now = iso(today());
    out.forEach((r, i) => {
      const li = el('li', 'rux--contained-list-item rux--contained-list-item--with-action');
      const body = el('div', 'rux--contained-list-item__content scheduler-bus-item');
      body.appendChild(el('span', 'scheduler-bus-item__main', rangeText(r.start_date, r.end_date)));
      const now_out = r.start_date <= now && r.end_date >= now;
      body.appendChild(el('span', 'scheduler-bus-item__detail',
        [now_out ? 'Out now' : null, r.reason].filter(Boolean).join(' · ') || 'No reason given'));
      const actions = el('div', 'rux--contained-list-item__action');
      const edit = el('button', 'rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm', 'Edit');
      edit.type = 'button';
      edit.setAttribute('aria-label', `Edit days out ${rangeText(r.start_date, r.end_date)}`);
      edit.addEventListener('click', () => openOut(i));
      const remove = el('button', 'rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm', 'Remove');
      remove.type = 'button';
      remove.setAttribute('aria-label', `Remove days out ${rangeText(r.start_date, r.end_date)}`);
      remove.addEventListener('click', () => {
        out.splice(i, 1);
        drawOut();
        drawTitle();
        drawTrips();
        changed();
        $('scheduler-bus-oos-add').focus();
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

  let outEditing = null;
  function openOut(index) {
    outEditing = index;
    const r = index === null ? {} : out[index];
    $('scheduler-oos-h').textContent = index === null ? 'Add days out' : 'Edit days out';
    const range = el('div', 'rux--date-picker rux--date-picker--next rux--date-picker--range');
    range.append(dpContainer('from', 'scheduler-oos-start', 'First day', r.start_date),
      dpContainer('to', 'scheduler-oos-end', 'Last day', r.end_date), calendarBody());
    const rangeItem = el('div', 'rux--form-item');
    rangeItem.appendChild(range);
    const error = el('div', 'rux--form__helper-text scheduler-oos-error');
    error.id = 'scheduler-oos-error';
    error.hidden = true;
    error.setAttribute('role', 'alert');

    // rux-ui writes the reason as free text, so this stays a text field.
    const reasonItem = el('div', 'rux--form-item rux--text-input-wrapper');
    const lw = el('div', 'rux--text-input__label-wrapper');
    const lab = el('label', 'rux--label', 'Reason');
    lab.setAttribute('for', 'scheduler-oos-reason');
    lw.appendChild(lab);
    const outer = el('div', 'rux--text-input__field-outer-wrapper');
    const wrap = el('div', 'rux--text-input__field-wrapper');
    const input = el('input', 'rux--text-input');
    input.type = 'text';
    input.id = 'scheduler-oos-reason';
    input.autocomplete = 'off';
    input.placeholder = 'Optional';
    input.value = r.reason || '';
    wrap.appendChild(input);
    outer.appendChild(wrap);
    reasonItem.append(lw, outer);

    const host = $('scheduler-oos-fields');
    const stack = el('div', 'rux--stack-vertical rux--stack-scale-6');
    stack.append(rangeItem, error, reasonItem);
    host.replaceChildren(stack);
    window.Rux?.datePicker?.init?.(host);
    window.Rux?.modal?.open?.('scheduler-oos-modal');
  }

  $('scheduler-bus-oos-add')?.addEventListener('click', () => openOut(null));
  $('scheduler-oos-done')?.addEventListener('click', () => {
    const start = fieldDay($('scheduler-oos-start').value);
    // A blank last day is the first day: the picker clears it on a first pick.
    const endText = $('scheduler-oos-end').value.trim();
    const end = endText ? fieldDay(endText) : start;
    const error = $('scheduler-oos-error');
    if (!start || !end) {
      error.textContent = 'Pick the first and last day.';
      error.hidden = false;
      return;
    }
    const row = {
      start_date: start <= end ? start : end,
      end_date: start <= end ? end : start,
      reason: $('scheduler-oos-reason').value.trim() || null,
    };
    if (outEditing === null) out.push(row);
    else out[outEditing] = { ...out[outEditing], ...row };
    out.sort((a, b) => a.start_date.localeCompare(b.start_date));
    window.Rux?.modal?.close?.('scheduler-oos-modal');
    drawOut();
    drawTitle();
    drawTrips();
    changed();
  });

  // ── trips, read only ──
  const LEG = { outbound: 'Outbound', return: 'Return' };
  let trips = [];        // the bus's upcoming legs, as read
  let tripsFailed = false;
  async function loadTrips() {
    const { data, error } = await client.from('trip_assignments')
      .select('leg,trips(id,trip_ref,destination,customer,start_date,end_date,return_start_date,return_end_date,cancelled_at)')
      .eq('bus_id', loaded.id);
    const now = iso(today());
    tripsFailed = !!error;
    trips = error ? [] : (data || []).map(a => {
      const t = a.trips;
      if (!t || t.cancelled_at) return null;
      const back = a.leg === 'return';
      const from = day(back ? t.return_start_date : t.start_date);
      const to = day(back ? (t.return_end_date || t.return_start_date) : (t.end_date || t.start_date));
      if (!from || (to || from) < now) return null;
      return { t, from, to: to || from, leg: a.leg };
    }).filter(Boolean).sort((a, b) => a.from.localeCompare(b.from));
    drawTrips();
  }
  /* Drawn from what was read, because a range added on the page changes which
     trips warn and nothing about which trips there are. */
  function drawTrips() {
    const list = $('scheduler-bus-trips');
    list.replaceChildren();
    const error = tripsFailed;
    const legs = trips;

    if (error || !legs.length) {
      const li = el('li', 'rux--contained-list-item');
      li.appendChild(el('div', 'rux--contained-list-item__content scheduler-bus-note',
        error ? "The trips didn't load." : 'No upcoming trips.'));
      list.appendChild(li);
      return;
    }
    for (const l of legs) {
      const li = el('li', 'rux--contained-list-item rux--contained-list-item--clickable');
      const a = el('a', 'rux--contained-list-item__content scheduler-bus-trip');
      a.href = `./?trip=${encodeURIComponent(l.t.id)}&date=${l.from}`;
      // Carbon lays a clickable item's content out itself, so the two lines
      // stack in a box of their own.
      const lines = el('span', 'scheduler-bus-item');
      lines.appendChild(el('span', 'scheduler-bus-item__main', `${rangeText(l.from, l.to)} · ${l.t.destination || 'No destination'}`));
      const detail = [
        l.t.customer,
        l.t.return_start_date ? LEG[l.leg] || null : null,
        // The one thing this page can say that the board cannot: the trip
        // runs while the bus is booked out.
        overlaps(out, l.from, l.to) ? 'Bus is out of service then' : null,
      ].filter(Boolean).join(' · ');
      lines.appendChild(el('span', 'scheduler-bus-item__detail', detail));
      a.appendChild(lines);
      li.appendChild(a);
      list.appendChild(li);
    }
  }

  // ── load, change, save ──
  async function loadBus() {
    result(null);
    // The whole fleet is read either way: the list needs it, and one bus
    // needs it to renumber the order and to refuse a number twice over.
    const [rows, windows] = await Promise.all([
      client.from('buses').select(BUS_COLUMNS),
      client.from('bus_out_of_service').select('bus_id,start_date,end_date,reason'),
    ]);
    if (rows.error) throw rows.error;
    buses = rows.data || [];
    outByBus = indexOut(windows.error ? [] : windows.data);

    if (!busId) {
      loaded = null;
      loadedOut = [];
      out = [];
      fillForm({ status: 'active', type: 'Coach' });
    } else {
      loaded = buses.find(b => b.id === busId) || null;
      if (!loaded) return false;
      const mine = await client.from('bus_out_of_service')
        .select('id,start_date,end_date,reason').eq('bus_id', busId).order('start_date');
      if (mine.error) throw mine.error;
      loadedOut = (mine.data || []).map(r => ({ ...r, start_date: day(r.start_date), end_date: day(r.end_date) }));
      out = loadedOut.map(r => ({ ...r }));
      fillForm(loaded);
    }
    drawOut();
    drawTitle();
    baseline = snapshot();
    $('scheduler-bus').hidden = false;
    if (loaded) loadTrips();
    return true;
  }

  function changed() {
    drawColour();
    drawExpiry();
  }
  form?.addEventListener('input', changed);
  form?.addEventListener('change', changed);

  /* THE FLEET'S NUMBERING. Every bus gets its place in the fleet's order,
     1 upwards; only the rows whose number moved are written, so a save that
     changes nothing about the order writes nothing. `fleet` is every bus as
     it will be after this save, the one being saved included. */
  function renumbering(fleet) {
    const wanted = [...fleet].sort(fleetOrder);
    return wanted
      .map((b, i) => ({ id: b.id, sort_order: i + 1, was: b.sort_order }))
      .filter(r => r.sort_order !== r.was);
  }

  // Writes the bus, then its days out if they changed, then the fleet's
  // order: the new rows go in before the old ones come out, so a failure part
  // way never loses a range.
  async function save(force = false) {
    if (!validate()) return false;
    const row = readForm();
    const saveBtn = $('scheduler-bus-save');
    saveBtn.disabled = true;
    try {
      let id = loaded?.id;
      if (id && !force) {
        const [now, windows] = await Promise.all([
          client.from('buses').select(BUS_COLUMNS).eq('id', id).maybeSingle(),
          client.from('bus_out_of_service').select('start_date,end_date,reason').eq('bus_id', id).order('start_date'),
        ]);
        if (now.error || windows.error) throw now.error || windows.error;
        const theirs = (windows.data || []).map(r => ({ ...r, start_date: day(r.start_date), end_date: day(r.end_date) }));
        if (!now.data || comparable(now.data) !== comparable(loaded) || outKey(theirs) !== outKey(loadedOut)) {
          window.Rux?.modal?.open?.('scheduler-bus-conflict-modal');
          return false;
        }
      }
      if (id) {
        const { error } = await client.from('buses').update(row).eq('id', id);
        if (error) throw error;
      } else {
        const { data, error } = await client.from('buses').insert(row).select('id').single();
        if (error) throw error;
        id = data.id;
      }
      if (outKey(out) !== outKey(loadedOut)) {
        const fresh = out.map(r => ({ bus_id: id, start_date: r.start_date, end_date: r.end_date, reason: r.reason }));
        if (fresh.length) {
          const { error } = await client.from('bus_out_of_service').insert(fresh);
          if (error) throw error;
        }
        const gone = loadedOut.map(r => r.id).filter(Boolean);
        if (gone.length) {
          const { error } = await client.from('bus_out_of_service').delete().in('id', gone);
          if (error) throw error;
        }
      }
      const fleet = [...buses.filter(b => b.id !== id), { ...(loaded || {}), ...row, id }];
      for (const r of renumbering(fleet)) {
        const { error } = await client.from('buses').update({ sort_order: r.sort_order }).eq('id', r.id);
        if (error) throw error;
      }
      if (!loaded) history.replaceState(null, '', `buses.html?id=${encodeURIComponent(id)}`);
      currentId = id;
      await reload(id);
      result('success', 'Saved.');
      return true;
    } catch {
      result('error', "The bus wasn't saved. Try again.");
      return false;
    } finally {
      saveBtn.disabled = false;
    }
  }

  let currentId = busId;
  async function reload(id = currentId) {
    const [rows, windows, mine] = await Promise.all([
      client.from('buses').select(BUS_COLUMNS),
      client.from('bus_out_of_service').select('bus_id,start_date,end_date,reason'),
      client.from('bus_out_of_service').select('id,start_date,end_date,reason').eq('bus_id', id).order('start_date'),
    ]);
    if (rows.error || mine.error) throw rows.error || mine.error;
    buses = rows.data || [];
    outByBus = indexOut(windows.error ? [] : windows.data);
    const row = buses.find(b => b.id === id);
    if (!row) throw new Error('Bus not found');
    loaded = row;
    loadedOut = (mine.data || []).map(r => ({ ...r, start_date: day(r.start_date), end_date: day(r.end_date) }));
    out = loadedOut.map(r => ({ ...r }));
    fillForm(loaded);
    drawOut();
    drawTitle();
    baseline = snapshot();
    loadTrips();
  }

  form?.addEventListener('submit', e => {
    e.preventDefault();
    save();
  });

  $('scheduler-bus-conflict-save')?.addEventListener('click', async () => {
    const next = afterSave;
    keepAfter = true;
    window.Rux?.modal?.close?.('scheduler-bus-conflict-modal');
    keepAfter = false;
    afterSave = null;
    if (await save(true)) next?.();
  });
  $('scheduler-bus-conflict-modal')?.addEventListener('rux:modal-closed', () => {
    if (!keepAfter) afterSave = null;
  });
  $('scheduler-bus-conflict-reload')?.addEventListener('click', async () => {
    window.Rux?.modal?.close?.('scheduler-bus-conflict-modal');
    afterSave = null;
    try { await reload(); result('info', 'Showing the bus as it is now.'); } catch { result('error', "The bus didn't reload. Reload the page."); }
  });

  // ── leaving with unsaved changes ──
  let afterSave = null;
  let leaving = false;
  const unsavedModal = $('scheduler-bus-unsaved-modal');
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || !editing || leaving || !dirty()) return;
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank') return;
    e.preventDefault();
    afterSave = () => { leaving = true; location.href = a.href; };
    window.Rux?.modal?.open?.(unsavedModal);
  });
  $('scheduler-bus-unsaved-discard')?.addEventListener('click', () => {
    const next = afterSave;
    afterSave = null;
    window.Rux?.modal?.close?.(unsavedModal);
    next?.();
  });
  // Save keeps the leaving action through the close, so a conflict found by
  // the save can still finish it; any other close drops it.
  let keepAfter = false;
  $('scheduler-bus-unsaved-save')?.addEventListener('click', async () => {
    const next = afterSave;
    keepAfter = true;
    window.Rux?.modal?.close?.(unsavedModal);
    keepAfter = false;
    afterSave = next;
    if (await save()) { afterSave = null; next?.(); }
  });
  unsavedModal?.addEventListener('rux:modal-closed', () => { if (!keepAfter) afterSave = null; });
  window.addEventListener('beforeunload', e => {
    if (editing && !leaving && dirty()) { e.preventDefault(); e.returnValue = ''; }
  });

  /* ══ Start ══════════════════════════════════════════════════════════════
     The same staff gate as the schedule: the page waits for the staff
     profile, and an account without one, a profile that would not load, or a
     local preview other than the cloud preview gets a notice instead. */
  (async () => {
    const account = window.Rux?.account;
    if (!account?.staffProfile) {
      say('info', 'This preview has no log-in', 'Open http://localhost:8641/, the cloud preview, to load the buses.');
      return;
    }
    let staff;
    try { staff = await account.staffProfile(); } catch {
      say('error', "The buses didn't load", 'Reload the page to try again.');
      return;
    }
    if (!staff) {
      say('info', "This account isn't set up as staff yet", 'Ask the owner to set it up.');
      return;
    }
    client = account.client;
    try {
      if (!editing) { await loadList(); return; }
      if (!(await loadBus())) {
        say('info', 'That bus is not in the list', 'Pick a bus from the list below.');
        history.replaceState(null, '', 'buses.html');
        $('scheduler-buses-list').hidden = false;
        drawList();
      }
    } catch {
      say('error', "The buses didn't load", 'Reload the page to try again.');
    }
  })();
})();
