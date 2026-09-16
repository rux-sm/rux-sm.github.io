/* ==========================================================================
   data.js — the live week
   --------------------------------------------------------------------------
   Fills #scheduler-grid from the tables rux-ui also writes, and writes back:
   a drag moves a bus, and the trip panel's Save writes the trip with its
   stops, contacts, payments, POs, invoices and assignments. The database is
   production and shared with rux-ui, so nothing is tried with a test record.

   The client is the account's. /account.js opens the session and exposes
   window.Rux.account.client, because two clients on one storage key make
   supabase-js warn. Opened without /account.js, this module makes its own
   client with persistSession off, which stores nothing. The publishable key
   is meant to sit in client code.

   A bar is one assignment, not one trip. A trip has an outbound leg and may
   have a return leg days later; trip_assignments names a bus per leg and
   position, so a seven-bus trip is seven bars. A leg with fewer assignments
   than buses adds the difference to the unassigned row, as a to-do.

   Overlaps are not marked as conflicts: bars are placed by day, and two
   same-day trips on one bus are ordinary.

   Every value from the database is written with textContent, because the
   rows are authored in another application.
   ========================================================================== */
(() => {
  'use strict';

  const PROJECT = 'https://udnmqhayzhrbltxzzhjw.supabase.co';
  const PUBLISHABLE = 'sb_publishable_w3h8Mtwam0ULemVKGKyBfw_DTbTaJIS';

  const gridEl = document.getElementById('scheduler-grid');
  const schEl = document.getElementById('scheduler-week');
  const statusEl = document.getElementById('scheduler-status');
  const toastEl = document.getElementById('scheduler-toast');
  // `rangeEl` is the week button, and `rangeTextEl` and `rangeMonthsEl` the
  // spans inside it that `setRange` writes, because textContent on the button
  // would delete its caret.
  const rangeEl = document.getElementById('scheduler-range');
  const rangeTextEl = document.getElementById('scheduler-range-text') || rangeEl;
  const rangeMonthsEl = document.getElementById('scheduler-range-months');
  // The week picker's hidden input and the guard that tells its `change`
  // events apart: ours, from setRange, or a person's, from the calendar.
  let weekInput = null;
  let valueSetBySelf = false;
  if (!gridEl || !schEl || !statusEl) return;

  // -- dates, all local -----------------------------------------------------
  // Never toISOString(): it converts to UTC first, so west of Greenwich every
  // date lands on the day before. These build and read the local calendar day.
  const DAY = 864e5;
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parseISO = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  // `mondayOf` returns the week's first day: Monday, or Sunday when
  // `weekStartsSunday` is set. `getDay()` is 0 for Sunday.
  let weekStartsSunday = false;
  const mondayOf = d => addDays(d, -(weekStartsSunday ? d.getDay() : (d.getDay() + 6) % 7));
  // The weekend is read from the date, not the column, because a Sunday-first
  // week puts it at both ends. The board and the driver roster share it.
  const isWeekend = d => d.getDay() === 0 || d.getDay() === 6;
  // Math.round, because a span crossing a daylight-saving change is 23 or 25
  // hours and integer division would drop or add a day.
  const daysBetween = (a, b) => Math.round((b - a) / DAY);

  // -- the palette ----------------------------------------------------------
  /* The trip colours, read by the board, the editor and the bar menu. `value`
     is what `trips.trip_bar_color` stores and `hue` is the `scheduler-bar--*`
     class that paints it. Carbon's tag palette has no amber, so app.css paints
     `scheduler-bar--amber` with the warning colour.

     Retired names are mapped on read and never rewritten, as rux-ui does:
     orange and yellow paint as amber, cyan as teal. */
  const TRIP_COLORS = [
    { value: 'teal', label: 'Teal', hue: 'teal' },
    { value: 'green', label: 'Green', hue: 'green' },
    { value: 'purple', label: 'Purple', hue: 'purple' },
    { value: 'amber', label: 'Amber', hue: 'amber' },
    { value: 'pink', label: 'Pink', hue: 'magenta' },
  ];
  const RETIRED_COLORS = { orange: 'amber', cyan: 'teal', yellow: 'amber' };
  // The colour a trip paints as, by its current name, or null for standard.
  const tripColorOf = trip => {
    const stored = String(trip.trip_bar_color || '').toLowerCase();
    const name = RETIRED_COLORS[stored] ?? stored;
    return TRIP_COLORS.some(c => c.value === name) ? name : null;
  };
  // Standard is the status colour: red for an unconfirmed trip, blue otherwise.
  const standardHueOf = trip => (trip.confirmed === false ? 'red' : 'blue');

  // An override colour beats status, and status beats the default blue, as in rux-ui.
  const hueFor = trip => TRIP_COLORS.find(c => c.value === tripColorOf(trip))?.hue
    ?? standardHueOf(trip);

  const UNASSIGNED = ' unassigned';

  const client = window.Rux?.account?.client
    ?? (window.supabase ? window.supabase.createClient(PROJECT, PUBLISHABLE, { auth: { persistSession: false } }) : null);

  // -- status ---------------------------------------------------------------
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  /* `box` is the whole viewBox string, not its last number. Sprite symbols are
     drawn in different boxes -- `#i-checkmark` in 20, the chevrons in 16, most
     icons in 32 -- so a caller passes the symbol's own. */
  const svgUse = (href, size, box) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', size); svg.setAttribute('height', size);
    svg.setAttribute('viewBox', box); svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', href);
    svg.appendChild(use);
    return svg;
  };

  // Carbon's small loading spinner, the inline loading's and the file item's.
  function loadingSpinner(extra = '') {
    const spin = el('div', `rux--loading rux--loading--small${extra}`);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'rux--loading__svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    for (const part of ['rux--loading__background', 'rux--loading__stroke']) {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('class', part);
      c.setAttribute('cx', '50%'); c.setAttribute('cy', '50%'); c.setAttribute('r', '42');
      svg.appendChild(c);
    }
    spin.appendChild(svg);
    return spin;
  }

  // Every class is written out in full, never `--${kind}`: check-classes reads
  // the source and cannot see through an interpolation.
  const NOTE = {
    error: { cls: 'rux--inline-notification rux--inline-notification--error', icon: '#i-error--filled' },
    info: { cls: 'rux--inline-notification rux--inline-notification--info', icon: '#i-information--filled' },
    success: { cls: 'rux--inline-notification rux--inline-notification--success', icon: '#i-checkmark--filled' },
    warning: { cls: 'rux--inline-notification rux--inline-notification--warning', icon: '#i-warning--filled' },
  };

  // The same kinds as Carbon's actionable notification, for a notice that
  // offers an action.
  const ACTION_NOTE = {
    error: { cls: 'rux--actionable-notification rux--actionable-notification--error', icon: '#i-error--filled' },
    info: { cls: 'rux--actionable-notification rux--actionable-notification--info', icon: '#i-information--filled' },
    success: { cls: 'rux--actionable-notification rux--actionable-notification--success', icon: '#i-checkmark--filled' },
    warning: { cls: 'rux--actionable-notification rux--actionable-notification--warning', icon: '#i-warning--filled' },
  };

  // And as Carbon's toast notification, for a plain notice over the page.
  const TOAST_NOTE = {
    error: { cls: 'rux--toast-notification rux--toast-notification--error', icon: '#i-error--filled' },
    info: { cls: 'rux--toast-notification rux--toast-notification--info', icon: '#i-information--filled' },
    success: { cls: 'rux--toast-notification rux--toast-notification--success', icon: '#i-checkmark--filled' },
    warning: { cls: 'rux--toast-notification rux--toast-notification--warning', icon: '#i-warning--filled' },
  };

  /* One builder for both places: `say` puts a notice above the board and
     `toast` over the page. With an `action` it is Carbon's actionable
     notification, from `carbon-react-dom.json`'s
     `components-notifications-actionable--inline`, whose icon keeps
     `rux--inline-notification__icon`. The capture's `role="alertdialog"` and
     focus sentinels are left out: they trap the keyboard, and this action is
     an offer about something already done. */
  function note(kind, title, subtitle, action, asToast) {
    /* A plain toast is Carbon's toast notification, which sets its own width.
       Its icon is a direct child and `__details` holds the text, as in
       `components-notifications-toast--default`. */
    if (!action && asToast) {
      const spec = TOAST_NOTE[kind] ?? TOAST_NOTE.info;
      const box = el('div', spec.cls);
      box.setAttribute('role', 'status');
      const icon = svgUse(spec.icon, '20', '0 0 32 32');
      icon.setAttribute('class', 'rux--toast-notification__icon');
      const details = el('div', 'rux--toast-notification__details');
      details.append(
        el('div', 'rux--toast-notification__title', title),
        el('div', 'rux--toast-notification__subtitle', subtitle),
      );
      box.append(icon, details, closeButton('rux--toast-notification'));
      return box;
    }
    if (!action) {
      const spec = NOTE[kind] ?? NOTE.info;
      const box = el('div', spec.cls);
      box.setAttribute('role', 'status');
      const details = el('div', 'rux--inline-notification__details');
      const icon = svgUse(spec.icon, '20', '0 0 32 32');
      icon.setAttribute('class', 'rux--inline-notification__icon');
      const wrap = el('div', 'rux--inline-notification__text-wrapper');
      wrap.append(
        el('div', 'rux--inline-notification__title', title),
        el('div', 'rux--inline-notification__subtitle', subtitle),
      );
      details.append(icon, wrap);
      box.appendChild(details);
      return box;
    }
    const spec = ACTION_NOTE[kind] ?? ACTION_NOTE.info;
    const box = el('div', spec.cls + (asToast ? ' rux--actionable-notification--toast' : ''));
    box.setAttribute('role', 'status');
    const focus = el('div', 'rux--actionable-notification__focus-wrapper');
    const details = el('div', 'rux--actionable-notification__details');
    const icon = svgUse(spec.icon, '20', '0 0 32 32');
    icon.setAttribute('class', 'rux--inline-notification__icon');
    const wrap = el('div', 'rux--actionable-notification__text-wrapper');
    const content = el('div', 'rux--actionable-notification__content');
    content.append(
      el('div', 'rux--actionable-notification__title', title),
      el('div', 'rux--actionable-notification__subtitle', subtitle),
    );
    wrap.appendChild(content);
    details.append(icon, wrap);
    const buttons = el('div', 'rux--actionable-notification__button-wrapper');
    const btn = el('button', 'rux--actionable-notification__action-button rux--btn rux--btn--sm rux--layout--size-sm rux--btn--ghost', action.label);
    btn.type = 'button';
    btn.addEventListener('click', action.onClick);
    buttons.appendChild(btn);
    focus.append(details, buttons);
    box.appendChild(focus);
    if (asToast) box.appendChild(closeButton('rux--actionable-notification'));
    return box;
  }

  /* A toast carries Carbon's close button because nothing else clears it: the
     next render clears `say`'s region and leaves the toast. Written out in full
     per variant for check-classes. */
  const CLOSE = {
    'rux--actionable-notification': { btn: 'rux--actionable-notification__close-button', icon: 'rux--actionable-notification__close-icon' },
    'rux--toast-notification': { btn: 'rux--toast-notification__close-button', icon: 'rux--toast-notification__close-icon' },
  };
  function closeButton(base) {
    const spec = CLOSE[base];
    const b = el('button', spec.btn);
    b.type = 'button';
    b.setAttribute('aria-label', 'Close notification');
    const svg = svgUse('#i-close', '20', '0 0 32 32');
    svg.setAttribute('class', spec.icon);
    b.appendChild(svg);
    b.addEventListener('click', () => toast(null));
    return b;
  }

  /* Above the board, in flow, for the notices that stand in for the grid:
     nothing this week, or a week that would not load. The region starts as
     screen-reader text for the loading skeleton; a notice makes it visible.
     Everything else goes to `toast`. */
  function say(kind, title, subtitle, action) {
    statusEl.replaceChildren();
    if (!kind) { statusEl.hidden = true; return; }
    statusEl.classList.remove('rux--visually-hidden');
    statusEl.hidden = false;
    statusEl.appendChild(note(kind, title, subtitle, action, false));
  }

  /* Over the page, for a notice about what a person just did, so the board does
     not jump the way it would under `say`'s in-flow region. The placement is in
     app.css, because Carbon's toast has no position. It replaces rather than
     stacks, so a second move drops the first move's undo. */
  function toast(kind, title, subtitle, action) {
    if (!toastEl) { say(kind, title, subtitle, action); return; }
    toastEl.replaceChildren();
    if (!kind) { toastEl.hidden = true; return; }
    toastEl.hidden = false;
    toastEl.appendChild(note(kind, title, subtitle, action, true));
  }

  // -- reading --------------------------------------------------------------
  const TRIP_COLUMNS = [
    'id', 'destination', 'customer', 'start_date', 'end_date',
    'return_start_date', 'return_end_date', 'departure_time', 'return_time',
    'trip_type', 'confirmed', 'trip_bar_color', 'bus_count', 'return_bus_count',
    'req_sleeper', 'req_ada', 'req_56pax', 'need_hotel', 'notes', 'updated_at',
    // Each leg's hotel: the bar's hotel mark, its menu item and the Details tab.
    'hotel_booked_outbound', 'hotel_booked_return',
    'hotel_itinerary_number_outbound', 'hotel_itinerary_number_return',
    'trip_assignments(id,bus_id,position,leg,trip_drivers(driver_id,role))',
    // The trip's documents: the itinerary shortcut, the bar's mark, the Files tab
    // and the itinerary panel, which frames the file at its path.
    'trip_documents(id,label,created_at,file_name,file_path,file_size)',
    // Set in the Files tab; a trip that does not need an itinerary is not marked.
    'itinerary_not_needed',
    'booking_contact_id',
    'contacts:booking_contact_id(id,name,phone,email,client)',
    // The trip's own copy of the booking contact, which rux-ui reads and writes.
    'booking_contact_name', 'booking_contact_phone', 'booking_contact_email',
    // The day-of contacts: five, because the schema has five.
    'trip_contact_1_id', 'trip_contact_2_id', 'trip_contact_3_id',
    'trip_contact_4_id', 'trip_contact_5_id',
    'c1:trip_contact_1_id(id,name,phone)', 'c2:trip_contact_2_id(id,name,phone)',
    'c3:trip_contact_3_id(id,name,phone)', 'c4:trip_contact_4_id(id,name,phone)',
    'c5:trip_contact_5_id(id,name,phone)',
    'trip_contact_1_name', 'trip_contact_1_phone', 'trip_contact_2_name', 'trip_contact_2_phone',
    'trip_contact_3_name', 'trip_contact_3_phone', 'trip_contact_4_name', 'trip_contact_4_phone',
    'trip_contact_5_name', 'trip_contact_5_phone',
    'quoted_price,deposit_amount,invoice_number,po_ref,po_amount',
    'contract_status,invoice_status,balance_paid,date_paid',
    // The PO and invoice switches' flags, and the contract note.
    'contract_note,po_received,invoiced',
    // Save inserts, updates and deletes payment rows one at a time, by id.
    'trip_payments(id,position,amount,method,date,ref)',
    // POs and invoices, one row each, written by id like the payments.
    'trip_pos(id,position,ref,amount,date)',
    'trip_invoices(id,position,number,amount,date)',
    'trip_stops(id,position,leg,type,name,address,depart_prev,arrive,spot)',
  ].join(',');

  /* A hung connection never rejects, so a request races this timeout and the
     catch runs. An abandoned write may still land, so its error carries
     `timedOut` and a save treats it as possibly written. */
  const READ_TIMEOUT = 15000;
  const withTimeout = promise => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(
      () => reject(Object.assign(
        new Error(`The schedule did not answer within ${READ_TIMEOUT / 1000} seconds.`), { timedOut: true })),
      READ_TIMEOUT)),
  ]);

  async function read(weekStart) {
    const weekEnd = addDays(weekStart, 6);
    // A trip that started before this week can still run through it, so the
    // window reaches back; 90 days is far longer than any trip in the data and
    // the exact overlap is decided per leg below, not by this filter.
    const lo = iso(addDays(weekStart, -90));
    const hi = iso(weekEnd);
    const unwrap = r => { if (r.error) throw new Error(r.error.message); return r.data ?? []; };

    const [buses, trips, drivers, contacts, oos, timeOff] = await withTimeout(Promise.all([
      client.from('buses').select('id,number,capacity,type,status,sort_order,ada_lift,sleeper').order('sort_order').then(unwrap),
      // A cancelled trip stays in the table but is not on the schedule.
      client.from('trips').select(TRIP_COLUMNS).is('cancelled_at', null)
        .gte('start_date', lo).lte('start_date', hi).order('start_date').then(unwrap),
      client.from('drivers').select('id,name,short_name').then(unwrap),
      // Every contact, read once with the week for the contact search rather
      // than on each keystroke.
      client.from('contacts').select('id,name,phone,email,client').order('name').then(unwrap),
      client.from('bus_out_of_service').select('bus_id,start_date,end_date,reason').lte('start_date', hi).gte('end_date', iso(weekStart)).then(unwrap),
      // Overlap, not containment: a driver away across the whole fortnight has
      // neither date inside this week and is still away every day of it.
      client.from('driver_time_off').select('driver_id,start_date,end_date,reason').lte('start_date', hi).gte('end_date', lo).then(unwrap),
    ]));
    // The fleet is never empty, so an empty one is a read the database refused,
    // which is what an ended log-in or removed access looks like; a reload
    // sends the account where it can go.
    if (!buses.length) throw new Error('The schedule came back empty. Reload the page.');
    return { buses, trips, drivers, contacts, oos, timeOff, weekStart, weekEnd };
  }

  function setRange(weekStart, weekEnd) {
    if (!rangeEl) return;
    /* `formatRange`, because only it writes a week inside one month the way the
       locale does, such as "Sep 7 – 13, 2026". The month is short so the widest
       thing in the toolbar does not wrap its row. */
    const fmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    rangeTextEl.textContent = typeof fmt.formatRange === 'function'
      ? fmt.formatRange(weekStart, weekEnd)
      : `${fmt.format(weekStart)} - ${fmt.format(weekEnd)}`;
    /* Below md the label is the week's months and year, "Sep – Oct 2026",
       because the day header under it numbers the days and a phone's toolbar
       has no more room beside its four buttons. `formatRange` writes a week
       across New Year as "Dec 2026 – Jan 2027", which is too wide, so that
       week names its year once. */
    if (rangeMonthsEl) {
      const months = new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' });
      rangeMonthsEl.textContent = weekStart.getFullYear() === weekEnd.getFullYear() && typeof months.formatRange === 'function'
        ? months.formatRange(weekStart, weekEnd)
        : weekStart.getMonth() === weekEnd.getMonth()
          ? months.format(weekEnd)
          : `${weekStart.toLocaleDateString(undefined, { month: 'short' })} – ${months.format(weekEnd)}`;
    }
    /* The week picker's hidden input follows the shown week, so the calendar
       opens on it rather than on today. `valueSetBySelf` stops the `change`
       listener from treating this as a person's pick. */
    if (weekInput) {
      valueSetBySelf = true;
      weekInput.value = iso(weekStart);
      weekInput.dispatchEvent(new Event('change', { bubbles: true }));
      valueSetBySelf = false;
    }
  }

  // -- placing --------------------------------------------------------------
  /* A leg's own stops in order, and the two that carry its times: the first
     `pickup` holds the departure in `depart_prev` and the last `return` the
     arrival in `arrive`. The board and the editor both use it, so they pick
     the same two; `timesOf` falls back to the trip's own time columns. */
  const stopsOfLeg = (trip, leg) => {
    const stops = (trip.trip_stops || [])
      .filter(s => (s.leg || 'outbound') === leg)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    return {
      stops,
      pickup: stops.find(s => s.type === 'pickup') ?? stops[0],
      back: [...stops].reverse().find(s => s.type === 'return'),
    };
  };

  const timesOf = (trip, leg) => {
    const { pickup, back } = stopsOfLeg(trip, leg);
    return {
      depart: pickup?.depart_prev || (leg === 'outbound' ? trip.departure_time : trip.return_time) || null,
      back: back?.arrive || null,
      spot: pickup?.spot || null,
    };
  };

  const legsOf = trip => {
    const legs = [];
    if (trip.start_date) legs.push({ leg: 'outbound', from: trip.start_date, to: trip.end_date || trip.start_date, count: trip.bus_count || 1, ...timesOf(trip, 'outbound') });
    if (trip.return_start_date) legs.push({ leg: 'return', from: trip.return_start_date, to: trip.return_end_date || trip.return_start_date, count: trip.return_bus_count || trip.bus_count || 1, ...timesOf(trip, 'return') });
    return legs;
  };

  const clip = (from, to, weekStart, weekEnd) => {
    const a = parseISO(from), b = parseISO(to);
    if (b < weekStart || a > weekEnd) return null;
    const vs = a < weekStart ? weekStart : a;
    const ve = b > weekEnd ? weekEnd : b;
    return {
      start: daysBetween(weekStart, vs),
      span: daysBetween(vs, ve) + 1,
      fromPrev: a < weekStart,
      toNext: b > weekEnd,
    };
  };

  // Greedy lane packing: the first lane whose last occupied day ends before
  // this bar starts. Bars are sorted by start first, which is what makes one
  // pass enough.
  function assignLanes(bars) {
    const lastEnd = [];
    bars.sort((x, y) => x.place.start - y.place.start || x.place.span - y.place.span);
    for (const bar of bars) {
      let lane = 0;
      while (lastEnd[lane] !== undefined && lastEnd[lane] >= bar.place.start) lane++;
      bar.lane = lane;
      lastEnd[lane] = bar.place.start + bar.place.span - 1;
    }
    return lastEnd.length || 1;
  }

  /* A contact as the trip records it. rux-ui keeps each contact's name, phone
     and email on the trip itself and links the contact beside them, so the
     trip's own copy comes first; a trip with only a link shows the linked
     contact. Slot 0 is the booking contact, 1 to 5 the day-of ones. */
  function tripContact(trip, slot) {
    const pre = slot === 0 ? 'booking_contact' : `trip_contact_${slot}`;
    const linked = slot === 0 ? trip.contacts : trip[`c${slot}`];
    const name = trip[`${pre}_name`];
    if (name) {
      return { id: trip[`${pre}_id`] ?? null, name, phone: trip[`${pre}_phone`] ?? null,
               email: slot === 0 ? trip.booking_contact_email ?? null : null };
    }
    return linked ? { id: linked.id, name: linked.name ?? '', phone: linked.phone ?? null, email: linked.email ?? null } : null;
  }

  // The contact columns as the editor shows them on opening, so an untouched
  // panel has nothing to save. Day-of rows are drawn without gaps, so they are.
  function contactColumnsOf(trip) {
    const b = tripContact(trip, 0);
    const out = { booking_contact_name: b?.name || null, booking_contact_phone: b?.phone || null,
                  booking_contact_email: b?.email || null };
    const days = [1, 2, 3, 4, 5].map(n => tripContact(trip, n)).filter(Boolean);
    for (let n = 1; n <= 5; n++) {
      out[`trip_contact_${n}_name`] = days[n - 1]?.name || null;
      out[`trip_contact_${n}_phone`] = days[n - 1]?.phone || null;
    }
    return out;
  }

  // -- drawing --------------------------------------------------------------
  const addRow = (bar, cls, ...parts) => {
    const r = el('div', `scheduler-bar__row ${cls}`);
    for (const p of parts) if (p != null) r.appendChild(p);
    bar.appendChild(r);
  };
  // Twelve-hour and compact, "7:50a", so two times and a dash fit a day column.
  // `|| 12` turns hour 0 and hour 12 into 12.
  const hhmm = t => {
    if (!t) return '';
    const [h, m] = String(t).split(':');
    const hr = Number(h);
    if (!Number.isFinite(hr) || m === undefined) return String(t).slice(0, 5);
    return `${hr % 12 || 12}:${m}${hr < 12 ? 'a' : 'p'}`;
  };

  // The trip's documents labelled Itinerary, newest first. The first is the one
  // rux-ui picks: a re-uploaded itinerary replaces the one before.
  const itinerariesOf = trip => (trip.trip_documents || [])
    .filter(d => String(d.label || '').toLowerCase() === 'itinerary')
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  const latestItinerary = trip => itinerariesOf(trip)[0] ?? null;
  // Every document the trip holds, newest first, as the Files tab lists them.
  const documentsOf = trip => [...(trip.trip_documents || [])]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  // A document's upload day as mm/dd/yyyy on this computer's calendar. The
  // column is a timestamp, so `mdy` would print its UTC day.
  const uploadedOn = at => {
    const d = new Date(at || '');
    return Number.isNaN(d.getTime()) ? ''
      : d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  };

  function barEl(b, driversById, busesById) {
    const { trip, leg, assign, place, slot } = b;
    const hue = hueFor(trip);
    const bar = el('article', `scheduler-bar scheduler-bar--${hue}`);
    // The bar menu reads both to check the trip's colour and paint Standard.
    bar.dataset.tripColor = tripColorOf(trip) ?? '';
    bar.dataset.standardHue = standardHueOf(trip);
    // The itinerary shortcut and menu item open this document.
    const itinerary = latestItinerary(trip);
    bar.dataset.itineraryId = itinerary?.id ?? '';
    // The bar menu's hotel item reads both: whether the trip needs a hotel, and
    // whether this leg's is booked.
    bar.dataset.needHotel = trip.need_hotel ? 'true' : '';
    bar.dataset.hotelBooked = trip[`hotel_booked_${leg.leg}`] ? 'true' : '';
    bar.setAttribute('role', 'button');
    bar.tabIndex = 0;
    bar.setAttribute('aria-pressed', 'false');
    bar.dataset.tripId = trip.id;
    bar.dataset.leg = leg.leg;
    bar.dataset.start = place.start;
    bar.dataset.span = place.span;
    // The slot is the position an empty slot's assignment row is written at.
    bar.dataset.slot = slot;
    if (assign) {
      bar.dataset.assignmentId = assign.id;
      bar.dataset.busId = assign.bus_id ?? '';
    }
    if (place.fromPrev) bar.classList.add('scheduler-bar--from-prev');
    if (place.toNext) bar.classList.add('scheduler-bar--to-next');
    bar.style.setProperty('--scheduler-start', place.start);
    bar.style.setProperty('--scheduler-span', place.span);
    bar.style.setProperty('--scheduler-lane', b.lane);

    const count = leg.count || 1;
    const ref = [leg.leg === 'return' ? 'Return' : '', count > 1 ? `${slot + 1} of ${count}` : '']
      .filter(Boolean).join(' · ');

    /* A requirement is drawn only when the bus fails it. A trip that needs a
       sleeper on a sleeper bus has nothing to say, so the flags cost no row; a
       trip on a bus without one shows the missing item as a warning icon. No
       bus means nothing to compare, and an unrecorded capacity is not a
       shortfall. */
    const bus = assign?.bus_id != null ? busesById.get(assign.bus_id) : null;
    const lacks = bus ? [
      trip.req_sleeper && !bus.sleeper ? { href: '#i-hotel', label: `Needs a sleeper, bus ${bus.number} has none` } : null,
      trip.req_ada && !bus.ada_lift ? { href: '#i-accessibility', label: `Needs an ADA lift, bus ${bus.number} has none` } : null,
      trip.req_56pax && bus.capacity != null && bus.capacity < 56 ? { href: '#i-user--multiple', label: `Needs 56 seats, bus ${bus.number} has ${bus.capacity}` } : null,
    ].filter(Boolean) : [];
    /* A missing itinerary is flagged the same way, bus or no bus, as rux-ui's
       Pending itinerary is: no document labelled Itinerary, and the trip not
       marked as not needing one. */
    if (!itinerary && !trip.itinerary_not_needed) lacks.push({ href: '#i-attachment', label: 'No itinerary yet' });
    /* A trip that needs a hotel shows a building for this leg's: amber while it
       is not booked, like the warnings, and in the bar's own text colour once it
       is, so the bar still says the trip has a hotel. */
    if (trip.need_hotel) {
      const booked = !!trip[`hotel_booked_${leg.leg}`];
      lacks.push({ href: '#i-building', label: booked ? 'Hotel booked' : 'Hotel not booked', done: booked });
    }
    // Drawn on the drivers row and again on the destination row; app.css shows
    // the second only while the drivers row is turned off, so hiding a row
    // never hides the warning. The bar's label carries it for a screen reader.
    const warn = where => {
      if (!lacks.length) return null;
      const box = el('span', `scheduler-bar__warn scheduler-bar__warn--${where}`);
      for (const w of lacks) {
        const chip = el('span', w.done ? 'scheduler-bar__warn-chip scheduler-bar__warn-chip--done' : 'scheduler-bar__warn-chip');
        chip.title = w.label;
        chip.appendChild(svgUse(w.href, '12', '0 0 32 32'));
        box.appendChild(chip);
      }
      return box;
    };

    addRow(bar, 'scheduler-bar__dest', el('span', null, trip.destination || 'No destination'), ref ? el('span', 'scheduler-bar__ref', ref) : null, warn('dest'));
    addRow(bar, 'scheduler-bar__client', el('span', null, trip.customer || ''));

    // The booking contact as the trip records it. The phone keeps its width and
    // the name gives way.
    const contact = tripContact(trip, 0);
    const who = el('span', null, contact?.name || '');
    if (contact) who.title = [contact.name, contact.phone].filter(Boolean).join(' · ');
    addRow(bar, 'scheduler-bar__contact', who, contact?.phone ? el('span', 'scheduler-bar__phone', contact.phone) : null);

    // Departure and return on one line, an en dash between them. The spot time
    // is not drawn, because two times already fill the row; the editor shows it.
    const dep = hhmm(leg.depart), back = hhmm(leg.back);
    const legDays = daysBetween(parseISO(leg.from), parseISO(leg.to)) + 1;
    const when = dep && back ? `${dep} \u2013 ${back}`
      : dep ? `Dep ${dep}`
      : back ? `Ret ${back}`
      : (legDays > 1 ? `${legDays} days` : '');
    addRow(bar, 'scheduler-bar__time', el('span', null, when));

    // The trip's note on one line, cut with an ellipsis; the whole of it on hover.
    const note = el('span', null, trip.notes || '');
    if (trip.notes) note.title = trip.notes;
    addRow(bar, 'scheduler-bar__notes', note);

    const names = assign
      ? (assign.trip_drivers || [])
          .map(d => driversById.get(d.driver_id))
          .filter(Boolean)
          .map(who => who.short_name || who.name)
      : [];
    addRow(bar, 'scheduler-bar__drivers', el('span', null, assign ? (names.join(' · ') || 'No driver') : 'Needs a bus'), warn('drivers'));

    bar.setAttribute('aria-label', [
      trip.destination || 'No destination', trip.customer, ref,
      place.fromPrev ? 'continues from the previous week' : null,
      place.toNext ? 'continues into the next week' : null,
      trip.confirmed === false ? 'unconfirmed' : null,
      ...lacks.map(w => w.label),
    ].filter(Boolean).join(', '));
    return bar;
  }

  function render(data) {
    const { buses, trips, drivers, contacts, oos, timeOff, weekStart, weekEnd } = data;
    const driversById = new Map(drivers.map(d => [d.id, d]));
    // What the panel reads when a bar is clicked: the bar carries ids, not
    // objects, and re-fetching a trip already in hand would be a round trip
    // for nothing.
    const busesById = new Map(buses.map(b => [b.id, b]));
    panelIndex = { trips: new Map(trips.map(t => [t.id, t])), buses: busesById, driversById, contacts: contacts || [] };

    const tracks = new Map();
    const push = (key, bar) => { if (!tracks.has(key)) tracks.set(key, []); tracks.get(key).push(bar); };

    for (const trip of trips) {
      for (const leg of legsOf(trip)) {
        const place = clip(leg.from, leg.to, weekStart, weekEnd);
        if (!place) continue;
        const assigns = (trip.trip_assignments || [])
          .filter(a => (a.leg || 'outbound') === leg.leg)
          .sort((x, y) => (x.position ?? 0) - (y.position ?? 0));
        for (const a of assigns) push(a.bus_id ?? UNASSIGNED, { trip, leg, assign: a, place, slot: a.position ?? 0 });
        for (let i = assigns.length; i < (leg.count || 1); i++) push(UNASSIGNED, { trip, leg, assign: null, place, slot: i });
      }
    }

    // Rows: every active bus, plus any bus this week actually uses, so a trip
    // on a retired bus is visible rather than silently dropped.
    const used = new Set([...tracks.keys()]);
    const rows = buses
      .filter(b => b.status === 'active' || used.has(b.id))
      .map(b => ({ id: b.id, bus: b }));
    // Always present, hidden when empty. A drag has to be able to drop the
    // week's first unassigned trip somewhere, and a row that is not in the
    // document has no rectangle to aim at.
    rows.push({ id: UNASSIGNED, bus: null, empty: !tracks.has(UNASSIGNED) });

    gridEl.replaceChildren();
    // "#" heads the column of bus numbers; the title spells it out.
    const corner = el('div', 'scheduler-corner', '#');
    corner.title = 'Bus number';
    gridEl.appendChild(corner);

    // Today is marked on its header cell only.
    const today = iso(new Date());
    let todayCell = null;
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      const cell = el('div', 'scheduler-day');
      if (isWeekend(d)) cell.classList.add('scheduler-day--weekend');
      if (iso(d) === today) { cell.classList.add('scheduler-day--today'); cell.setAttribute('aria-current', 'date'); todayCell = cell; }
      cell.append(
        document.createTextNode(d.toLocaleDateString(undefined, { weekday: 'short' })),
        el('span', 'scheduler-day__num', String(d.getDate())),
      );
      gridEl.appendChild(cell);
    }

    /* A rule at each of the six internal day boundaries, so an empty row can
       be counted; the bus column and the pane draw the two outer edges. The
       stops are set on each track, which app.css draws as its background, so
       `var(--scheduler-day-rule)` resolves on the track that defines it. */
    const ruleCols = [1, 2, 3, 4, 5, 6];
    const dayRuleStops = (() => {
      const parts = [];
      let prev = '0';
      for (const i of ruleCols) {
        // From the day's own width, not a percentage of the track: a seventh
        // lands on Blink's 1/64px and paints the rule across two device pixels.
        const at = `calc(${i} * var(--scheduler-day-w))`;
        parts.push(`transparent ${prev} calc(${i} * var(--scheduler-day-w) - 1px)`);
        parts.push(`var(--scheduler-day-rule) calc(${i} * var(--scheduler-day-w) - 1px) ${at}`);
        prev = at;
      }
      parts.push(`transparent ${prev} 100%`);
      return parts.join(', ');
    })();

    const oosByBus = new Map();
    for (const w of oos) { if (!oosByBus.has(w.bus_id)) oosByBus.set(w.bus_id, []); oosByBus.get(w.bus_id).push(w); }

    for (const r of rows) {
      const bars = tracks.get(r.id) ?? [];
      const lanes = bars.length ? assignLanes(bars) : 1;
      const rowEl = el('div', 'scheduler-row' + (r.id === UNASSIGNED ? ' scheduler-row--unassigned' : ''));
      if (r.empty) rowEl.hidden = true;

      // The head is the bus number and an out-of-service flag; the rest of what
      // the bus knows is in the number's toggletip and the head's title.
      const head = el('div', 'scheduler-row-head');
      // "No bus" wraps in the narrow column, and the head's title carries the sense.
      /* The number is a toggletip trigger, with the structure from
         `carbon-ibm-products-dom.json`; js/popover.js opens it from the markup
         alone. `right-start`, because this column is the board's left edge and
         any other placement covers the week the tip describes. */
      if (r.bus) {
        const tip = el('span', 'rux--popover-container rux--popover--caret rux--popover--drop-shadow rux--popover--right-start rux--toggletip');
        const trigger = el('button', 'rux--toggletip-button scheduler-row-head__num');
        trigger.type = 'button';
        trigger.setAttribute('aria-expanded', 'false');
        trigger.setAttribute('aria-label', `Bus ${r.bus.number} details`);
        trigger.textContent = String(r.bus.number);
        const pop = el('span', 'rux--popover');
        const content = el('span', 'rux--popover-content');
        const inner = el('div', 'rux--toggletip-content scheduler-bus-tip');
        inner.appendChild(el('p', 'rux--toggletip-label', `Bus ${r.bus.number}`));
        const spec = [
          [r.bus.capacity ? `${r.bus.capacity} pax` : null, r.bus.type].filter(Boolean).join(' · '),
          [r.bus.year, r.bus.make, r.bus.model].filter(Boolean).join(' '),
          r.bus.color,
          [r.bus.ada_lift ? 'ADA lift' : null, r.bus.sleeper ? 'Sleeper' : null].filter(Boolean).join(' · '),
          r.bus.vin ? `VIN ${r.bus.vin}` : null,
          r.bus.status && r.bus.status !== 'active' ? `Status: ${r.bus.status}` : null,
        ].filter(Boolean);
        // Every value with textContent, as everywhere here: a bus colour is data,
        // never markup.
        for (const line of spec) inner.appendChild(el('p', null, line));
        if (!spec.length) inner.appendChild(el('p', null, 'Nothing recorded for this bus.'));
        content.appendChild(inner);
        pop.appendChild(content);
        tip.append(trigger, pop, el('span', 'rux--popover-caret'));
        head.appendChild(tip);
      } else {
        head.append(el('div', 'scheduler-row-head__num', 'No\nbus'));
      }
      if (!r.bus) head.title = 'Trips with no bus yet';
      if (r.bus) {
        head.title = [
          `Bus ${r.bus.number}`,
          r.bus.capacity ? `${r.bus.capacity} pax` : null,
          r.bus.type,
          r.bus.ada_lift ? 'ADA lift' : null,
          r.bus.sleeper ? 'Sleeper' : null,
          r.bus.status !== 'active' ? r.bus.status : null,
        ].filter(Boolean).join(' · ');
      }

      /* Out of service is the one flag in this column: it is a state that
         changes what the row can take this week, where the lift and sleeper are
         fixed and sit in the toggletip. Icons stacked under the number would
         set the row's height. Each symbol keeps its own viewBox. */
      const kit = el('div', 'scheduler-row-head__kit');
      const flag = (href, box, label, cls) => {
        const span = el('span', cls || null);
        span.title = label;
        span.setAttribute('role', 'img');
        span.setAttribute('aria-label', label);
        span.appendChild(svgUse(href, '16', box));
        kit.appendChild(span);
      };

      const windows = (oosByBus.get(r.id) ?? []).filter(w => clip(w.start_date, w.end_date, weekStart, weekEnd));
      if (windows.length) {
        flag('#i-warning--filled', '0 0 16 16', `Out of service: ${windows.map(w => w.reason || 'no reason given').join('; ')}`, 'scheduler-row-head__oos');
      }
      if (kit.childElementCount) head.appendChild(kit);

      const track = el('div', 'scheduler-track');
      track.style.setProperty('--scheduler-lanes', lanes);
      // The day rules. Per track, for the reason the note above gives.
      track.style.setProperty('--scheduler-day-rules', dayRuleStops);
      if (r.bus) track.dataset.busId = r.bus.id; else track.dataset.unassigned = 'true';
      for (const w of windows) {
        const place = clip(w.start_date, w.end_date, weekStart, weekEnd);
        const span = el('div', 'scheduler-oos');
        span.style.setProperty('--scheduler-start', place.start);
        span.style.setProperty('--scheduler-span', place.span);
        span.setAttribute('role', 'img');
        span.setAttribute('aria-label', `Out of service, ${w.reason || 'no reason given'}`);
        track.appendChild(span);
      }
      for (const b of bars) { const el = barEl(b, driversById, busesById); installDrag(el); track.appendChild(el); }

      rowEl.append(head, track);
      gridEl.appendChild(rowEl);
    }

    // The pane's own border closes the grid, so whichever row ends up last on
    // screen must not draw a rule of its own.
    const shownRows = [...gridEl.querySelectorAll('.scheduler-row')].filter(r => !r.hidden);
    shownRows[shownRows.length - 1]?.classList.add('scheduler-row--last');

    // The editor keeps its trip across a render. Its opener becomes the new bar
    // for that trip when this week has one, so focus can go back to it.
    if (!panelEl.hidden && panelArgs?.ref) panelOpener = findBar(panelArgs.ref);

    schEl.hidden = false;
    drawAvailability(availabilityRows(data), weekStart);
    placeAvailability();
    syncSelection();

    // The only mark for today is its header cell, so the grid brings that cell
    // into view rather than leaving it past the right edge -- which is where a
    // Sunday sits on a narrow window. Only when it is actually out of view, and
    // never past the sticky bus column, which covers the pane's left edge.
    if (todayCell) {
      const sticky = gridEl.querySelector('.scheduler-corner')?.offsetWidth ?? 0;
      const visible = schEl.clientWidth;
      const left = todayCell.offsetLeft;
      const right = left + todayCell.offsetWidth;
      if (right > schEl.scrollLeft + visible) schEl.scrollLeft = right - visible;
      else if (left < schEl.scrollLeft + sticky) schEl.scrollLeft = Math.max(0, left - sticky);
    }

    setRange(weekStart, weekEnd);

    const barCount = [...tracks.values()].reduce((n, list) => n + list.length, 0);
    if (!barCount) say('info', 'Nothing this week', 'No trip touches these seven days.');
    else say(null);

    // The notice above changes how much height is left for the grid. app.js
    // owns that sum, so this asks it to refit.
    window.Rux?.schedule?.fit?.();
  }

  /* ── Moving a trip to another bus ──
     A drag writes one assignment's `bus_id`, or inserts the row for an empty
     slot. It moves vertically only, as rux-ui's drag does; dates change in the
     editor. Its rules:
       * a threshold before it counts, so a press that does not move selects;
       * a finger holds before a bar lifts, because a touch that travels at
         once means to scroll;
       * the unassigned row shows while dragging, so the week's first
         unassigned trip has somewhere to land;
       * a double booking or an out-of-service stretch warns and still drops,
         because the dispatcher may know something this page does not;
       * the unassigned row never warns, and dropping on the same row does
         nothing;
       * an interrupted gesture writes nothing; only a release drops.
     Nothing moves optimistically: on release the week is read again, so the
     screen shows what the database holds. */

  /* A mouse lifts a bar after 4px of vertical travel. A finger moves that far
     just landing, so it must stay within TOUCH_SLOP for TOUCH_HOLD_MS; travel
     first means a scroll, and the drag stands down for that gesture. Keyed off
     `pointerType`, not screen width, so a touchscreen laptop gets both. */
  const DRAG_THRESHOLD = 4;      // mouse: pixels of travel that mean "drag"
  const TOUCH_SLOP = 10;         // finger: how far it may wander while holding
  const TOUCH_HOLD_MS = 400;     // finger: how long it must hold to lift a bar

  // Android fires `contextmenu` at about the moment a hold completes. The bar
  // menu reads this to stay out of the way of a bar the finger is carrying.
  let touchDragging = false;

  const overlaps = (aStart, aSpan, bStart, bSpan) =>
    aStart < bStart + bSpan && bStart < aStart + aSpan;

  // Read off the rendered week rather than the data, because the rendered
  // week is exactly the seven days being asked about.
  function targetWarns(track, start, span) {
    if (track.dataset.unassigned) return false;
    for (const other of track.querySelectorAll('.scheduler-bar')) {
      if (overlaps(start, span, +other.dataset.start, +other.dataset.span)) return true;
    }
    for (const oos of track.querySelectorAll('.scheduler-oos')) {
      const s = parseFloat(oos.style.getPropertyValue('--scheduler-start'));
      const n = parseFloat(oos.style.getPropertyValue('--scheduler-span'));
      if (overlaps(start, span, s, n)) return true;
    }
    return false;
  }

  async function moveToBus(assignmentId, busId) {
    const { error } = await client.from('trip_assignments').update({ bus_id: busId }).eq('id', assignmentId);
    if (error) throw new Error(error.message);
  }

  /* An empty slot has no row to move, so dropping one on a bus writes the row:
     the trip, its leg, the slot's position and the bus. It returns the new id,
     and undo takes the bus off that row, which draws the slot on the No bus row
     where it started. */
  async function fillSlot(tripId, leg, position, busId) {
    const { data, error } = await client.from('trip_assignments')
      .insert({ trip_id: tripId, leg, position, bus_id: busId }).select('id').single();
    if (error) throw new Error(error.message);
    return data.id;
  }

  /* What the row is called, for a message about a bus that may no longer be on
     screen. `null` is the unassigned row, which has no number to give. */
  function busLabel(busId) {
    if (!busId) return 'Unassigned';
    const row = gridEl.querySelector(`.scheduler-track[data-bus-id="${CSS.escape(String(busId))}"]`);
    const num = row?.closest('.scheduler-row')?.querySelector('.scheduler-row-head__num')?.textContent?.trim();
    return num ? `bus ${num}` : 'its previous bus';
  }

  /* ── Undoing a move ──
     Undo writes back, with `moveToBus`, the bus the drag captured before it
     moved; `null` puts the trip back on the unassigned row. `toast` holds one
     notice, so the next one drops the offer and only the last move is
     undoable. The offer has no timer, so it cannot vanish while being read, and
     the undo ends on a plain notice, so the pair cannot ping-pong. */
  function offerUndo(assignmentId, backTo, label) {
    toast('success', 'Trip moved', `Undo puts it back on ${label}.`, {
      label: 'Undo',
      onClick: async () => {
        toast('info', 'Putting the trip back…', `Moving it to ${label}.`);
        try {
          schEl.setAttribute('aria-busy', 'true');
          gridEl.classList.add('scheduler-grid--busy');
          await moveToBus(assignmentId, backTo);
        } catch (e) {
          toast('error', 'Could not put that trip back', String(e && e.message ? e.message : e));
          return;
        } finally {
          schEl.removeAttribute('aria-busy');
          gridEl.classList.remove('scheduler-grid--busy');
        }
        await show();
        refreshEditor(assignmentId);
        toast('success', 'Move undone', `The trip is back on ${label}.`);
      },
    });
  }

  // A move of the trip in the editor rebuilds the editor from the week just
  // read, so its bus is current. Unsaved work is left alone.
  function refreshEditor(assignmentId) {
    if (panelEl.hidden || !panelArgs?.ref || panelArgs.ref.assignmentId !== String(assignmentId) || unsavedWork()) return;
    const bar = findBar(panelArgs.ref);
    if (bar) openPanel(bar);
  }

  function installDrag(bar) {
    if (!bar.dataset.tripId) return;
    bar.addEventListener('pointerdown', down => {
      if (down.button !== 0) return;
      // The trip open in the editor is locked on the board.
      if (isEditorTrip(bar)) return;
      const touch = down.pointerType === 'touch';
      const startX = down.clientX, startY = down.clientY;
      const start = +bar.dataset.start, span = +bar.dataset.span;
      const fromBus = bar.dataset.busId || null;
      let moved = false, target = null, tracks = [], unassignedRow = null, hold = 0;

      const clear = () => {
        for (const { track } of tracks) track.classList.remove('scheduler-track--drop', 'scheduler-track--warn');
      };

      /* While a finger carries a bar the page must not scroll under it.
         `touch-action` is read only when a gesture starts, so a non-passive
         `touchmove` stops the scroll; that works because the hold means the
         browser has not started scrolling. */
      const eat = ev => ev.preventDefault();

      // Picks the bar up, the same for both pointers.
      const lift = () => {
        moved = true;
        unassignedRow = gridEl.querySelector('.scheduler-row--unassigned');
        if (unassignedRow?.hidden) { unassignedRow.hidden = false; unassignedRow.dataset.revealed = 'true'; }
        tracks = [...gridEl.querySelectorAll('.scheduler-track')].map(t => ({ track: t, rect: t.getBoundingClientRect() }));
        bar.classList.add('scheduler-bar--dragging');
        placeBarOpen();
        document.body.style.cursor = 'grabbing';
        try { bar.setPointerCapture(down.pointerId); } catch { /* the pointer is already gone */ }
        if (touch) { touchDragging = true; bar.addEventListener('touchmove', eat, { passive: false }); }
      };

      /* Every ending comes through here, and only a release writes. A gesture
         the browser cancels -- a scroll takeover, a system dialog -- leaves the
         trip where it was. */
      const finish = async (release) => {
        if (hold) { clearTimeout(hold); hold = 0; }
        bar.removeEventListener('pointermove', move);
        bar.removeEventListener('pointerup', onUp);
        bar.removeEventListener('pointercancel', onCancel);
        bar.removeEventListener('touchmove', eat);
        touchDragging = false;
        if (!moved) return;              // a press that never lifted still selects
        document.body.style.cursor = '';
        bar.classList.remove('scheduler-bar--dragging');
        placeBarOpen();
        clear();
        if (unassignedRow?.dataset.revealed) { unassignedRow.hidden = true; delete unassignedRow.dataset.revealed; }
        // The browser fires a click after this; suppress the one that would
        // otherwise toggle selection at the end of a drag.
        bar.addEventListener('click', e => e.stopPropagation(), { capture: true, once: true });
        if (!release) return;

        const toBus = target ? (target.dataset.busId ?? null) : fromBus;
        if (!target || toBus === fromBus) return;
        /* Held as values, not as elements: `show()` below replaces every bar,
           so `bar` is detached by the time the undo can be pressed. */
        let assignmentId = bar.dataset.assignmentId;
        const { tripId, leg, slot } = bar.dataset;
        const backTo = fromBus;
        const label = busLabel(fromBus);
        let failed = null;
        try {
          schEl.setAttribute('aria-busy', 'true');
          gridEl.classList.add('scheduler-grid--busy');
          if (assignmentId) await moveToBus(assignmentId, toBus);
          else assignmentId = await fillSlot(tripId, leg || 'outbound', +slot || 0, toBus);
        } catch (e) {
          failed = String(e && e.message ? e.message : e);
        } finally {
          schEl.removeAttribute('aria-busy');
          gridEl.classList.remove('scheduler-grid--busy');
        }
        /* Awaited, so the undo or the failure is shown against the re-read
           board rather than the pre-move week. The board is re-read either
           way, because a move that threw may still have landed. */
        await show();   // read it back, rather than trusting the move landed
        refreshEditor(assignmentId);
        if (failed) toast('error', 'Could not move that trip', failed);
        else offerUndo(assignmentId, backTo, label);
      };

      const move = ev => {
        if (!moved) {
          const dx = Math.abs(ev.clientX - startX), dy = Math.abs(ev.clientY - startY);
          // A finger that travels before the hold is done means to scroll, so the
          // drag stands down. Both axes count: the board scrolls sideways too.
          if (touch) { if (dx > TOUCH_SLOP || dy > TOUCH_SLOP) finish(false); return; }
          if (dy < DRAG_THRESHOLD) return;
          lift();
        }
        ev.preventDefault();
        const hit = tracks.find(({ rect }) => ev.clientY >= rect.top && ev.clientY <= rect.bottom);
        const next = hit?.track ?? null;
        if (next === target) return;
        clear();
        target = next;
        const sameRow = target && (target.dataset.busId ?? null) === fromBus;
        if (target && !sameRow) {
          target.classList.add(targetWarns(target, start, span) ? 'scheduler-track--warn' : 'scheduler-track--drop');
        }
      };

      const onUp = () => finish(true);
      const onCancel = () => finish(false);

      if (touch) hold = setTimeout(() => { hold = 0; lift(); }, TOUCH_HOLD_MS);

      bar.addEventListener('pointermove', move);
      bar.addEventListener('pointerup', onUp);
      bar.addEventListener('pointercancel', onCancel);
    });
  }

  /* ── The trip panel ──
     It shows a trip and edits it, and Save writes it back. No Design module
     opens `side-panel`, so its open state is this app's own on Carbon's
     markup. Escape closes it and focus returns to the bar that opened it, so a
     keyboard user is not left at the top of the document. The editor is a
     flex child of `.scheduler-board`, so the board makes room by layout. */

  // The most trips a search lists. One more is fetched, so the count can say
  // "More than 50 trips match" without claiming a total it did not count.
  const SEARCH_CAP = 50;
  let panelIndex = { trips: new Map(), buses: new Map(), driversById: new Map(), contacts: [] };
  let panelOpener = null;
  const panelDetails = document.getElementById('scheduler-panel-details');
  const panelFleet = document.getElementById('scheduler-panel-fleet');
  const panelBilling = document.getElementById('scheduler-panel-billing');
  const panelRoute = document.getElementById('scheduler-panel-route');
  const panelFiles = document.getElementById('scheduler-panel-files');
  const panelSave = document.getElementById('scheduler-panel-save');
  const panelReset = document.getElementById('scheduler-panel-reset');
  const panelCancel = document.getElementById('scheduler-panel-cancel');

  const panelEl = document.getElementById('scheduler-panel');
  const tripEl = document.getElementById('scheduler-trip');
  const panelBody = document.getElementById('scheduler-panel-body');
  const panelTitle = document.getElementById('scheduler-panel-title');
  const panelTitleCollapsed = document.getElementById('scheduler-panel-title-collapsed');
  const pageEl = document.querySelector('.scheduler-page');
  // The selected trip's shortcut bar, placed and drawn by placeBarOpen.
  const barShortcuts = document.getElementById('scheduler-bar-shortcuts');
  const unsavedModal = document.getElementById('scheduler-unsaved-modal');

  const def = (rows) => {
    const dl = el('dl', 'scheduler-def');
    for (const [k, v] of rows) {
      if (!v) continue;
      // A value may be a node, so a row can carry a tag rather than a word.
      const dd = el('dd');
      if (v instanceof Node) dd.appendChild(v); else dd.textContent = v;
      dl.append(el('dt', null, k), dd);
    }
    return dl;
  };

  /* A section can carry one control on its heading line, as each billing
     switch does. The head is app markup rather than a `contained-list`
     header, because Contract holds form fields, not list rows; every billing
     section uses it, so the switches share one right edge. */
  const section = (title, node, action) => {
    const wrap = el('div', 'scheduler-panel-section');
    // A titleless section still keeps the `spacing-07` above it.
    if (!title) { wrap.appendChild(node); return wrap; }
    const head = el('div', 'scheduler-panel-section__title', title);
    if (!action) { wrap.append(head, node); return wrap; }
    const bar = el('div', 'scheduler-panel-section__head');
    bar.append(head, action);
    wrap.append(bar, node);
    return wrap;
  };

  // Two fields side by side, each half the row; app.css sizes them.
  const pair = (...nodes) => {
    const row = el('div', 'scheduler-pair');
    row.append(...nodes);
    return row;
  };
  /* One field across the whole row. A dropdown or a contact search keeps its
     own width and ignores its container, so it takes the pair's one-column
     form, whose sizing makes every box down to the input fill. */
  const full = node => {
    const row = el('div', 'scheduler-pair scheduler-pair--single');
    row.appendChild(node);
    return row;
  };

  /* A run of fields under one heading is a fieldset, so a screen reader names
     each field with its group, "Booking contact, Name", and the labels need not
     repeat the heading. The section's spacing is on a wrapper, so the
     fieldset stays Carbon's own. */
  const fieldGroup = (title, ...nodes) => {
    const set = el('fieldset', 'rux--fieldset');
    const stack = el('div', 'rux--stack-vertical rux--stack-scale-6');
    stack.append(...nodes);
    set.append(el('legend', 'scheduler-panel-section__title', title), stack);
    const wrap = el('div', 'scheduler-panel-section');
    wrap.appendChild(set);
    return wrap;
  };

  /* ── A milestone that is a list ──
     Payments, purchase orders and invoices share this list and `listRow`, so
     they cannot drift in height, density or row grid. The label and switch sit
     on the section's heading line, and the add is the list's last row. The
     list is built once and only its body is redrawn. */
  const rowList = () => {
    const list = el('div', 'rux--contained-list rux--contained-list--inset-rulers rux--layout--size-md');
    const body = el('ul', 'scheduler-list-body');
    body.setAttribute('role', 'list');
    list.appendChild(body);
    return { list, body };
  };

  /* The add is a row of the list, so it takes the list's ruler and the rows'
     left edge and reads as the place the next row appears. It is also the
     empty state: an empty list draws this row alone. */
  const listAddRow = ({ label, id, onClick }) => {
    const li = el('li', 'rux--contained-list-item scheduler-list-additem');
    const btn = el('button', 'rux--btn rux--btn--ghost rux--layout--size-sm scheduler-list-add');
    btn.type = 'button';
    if (id) btn.id = id;
    btn.appendChild(svgUse('#i-add', '16', '0 0 32 32'));
    btn.lastChild.setAttribute('class', 'rux--btn__icon');
    btn.append(label);
    btn.addEventListener('click', onClick);
    li.appendChild(btn);
    return { li, btn };
  };

  /* ── One menu for every row ──
     Edit and Remove sit behind each row's overflow trigger, where Carbon puts
     row actions. One menu element serves every row, placed at the pressed
     trigger, so a redraw never mints another. Remove does not confirm: nothing
     is written until Save, so a slip costs a Reset. */
  let rowMenuEl = null;
  let rowMenuFor = null;
  let rowMenuTrigger = null;
  const rowMenu = () => {
    if (rowMenuEl) return rowMenuEl;
    const menu = el('ul', 'rux--menu rux--menu--sm rux--menu--open rux--menu--shown');
    menu.setAttribute('role', 'menu');
    menu.tabIndex = -1;
    menu.hidden = true;
    const item = (danger, pick) => {
      const li = el('li', danger ? 'rux--menu-item rux--menu-item--danger' : 'rux--menu-item');
      li.setAttribute('role', 'menuitem');
      li.tabIndex = 0;
      li.dataset.pick = pick;
      li.appendChild(el('div', 'rux--menu-item__label'));
      li.addEventListener('click', () => {
        if (li.getAttribute('aria-disabled') === 'true') return;
        const act = rowMenuFor;
        window.Rux?.menu?.close?.(menu);
        act?.[pick]?.();
      });
      return li;
    };
    menu.append(item(false, 'edit'), item(true, 'remove'));
    menu.addEventListener('rux:menu-closed', () => {
      menu.hidden = true;
      rowMenuTrigger?.setAttribute('aria-expanded', 'false');
      rowMenuTrigger = null;
    });
    document.body.appendChild(menu);
    rowMenuEl = menu;
    return menu;
  };

  const openRowMenu = (trigger, actions) => {
    const menu = rowMenu();
    rowMenuFor = actions;
    /* The two items' words and states are the caller's: Edit and Remove unless
       it names them, as Day-of contacts' Add contact and Remove last contact,
       and either can be disabled. */
    for (const li of menu.children) {
      const pick = li.dataset.pick;
      li.querySelector('.rux--menu-item__label').textContent =
        actions[`${pick}Text`] ?? (pick === 'edit' ? 'Edit' : 'Remove');
      const off = !!actions[`${pick}Disabled`];
      li.classList.toggle('rux--menu-item--disabled', off);
      li.setAttribute('aria-disabled', String(off));
    }
    // Fixed, so the trigger's viewport rect places it directly.
    menu.hidden = false;
    menu.style.position = 'fixed';

    // Laid out at the origin first, so `offsetWidth` is its real width.
    menu.style.insetInlineStart = '0px';
    menu.style.insetBlockStart = '0px';
    const box = trigger.getBoundingClientRect();
    const width = menu.offsetWidth;
    const height = menu.offsetHeight;

    /* It opens to the left, because the trigger sits against the panel's right
       edge. Clamped to the viewport, and flipped above the trigger when the
       space below cannot hold it. */
    const left = Math.max(0, Math.min(box.right - width, window.innerWidth - width));
    const top = box.bottom + height <= window.innerHeight
      ? box.bottom
      : Math.max(0, box.top - height);
    menu.style.insetInlineStart = `${Math.round(left)}px`;
    menu.style.insetBlockStart = `${Math.round(top)}px`;

    /* `null`, not the trigger: given a trigger, `menu.js` re-places a fixed
       menu itself and overwrites the placement above. So the trigger carries
       its own `aria-haspopup`, and `aria-expanded` is synced here and on close. */
    window.Rux?.menu?.open?.(menu, null);
    trigger.setAttribute('aria-expanded', 'true');
    rowMenuTrigger = trigger;
  };

  /* One row: a tag, a date, an amount. `--with-action` puts the row's control
     at its end and `--clickable` makes the row itself open its editor.

     Carbon's `__content` is an inline-block of its own, so the columns go in a
     span this app owns and no rule here touches a `rux--*` class.

     The code is never the only name: a code means nothing to a screen reader,
     so the row button carries the whole row in `aria-label` and the tag its
     long form in `title`. */
  const listRow = ({ code, tone, codeTitle, when, much, title, edit, remove, removeLabel,
                    open: openRow = edit, openLabel = `Edit ${title}`, editText, removeText }) => {
    const li = el('li', 'rux--contained-list-item rux--contained-list-item--with-action rux--contained-list-item--clickable');
    const open = el('button', 'rux--contained-list-item__content');
    open.type = 'button';
    const line = el('span', code ? 'scheduler-listrow' : 'scheduler-listrow scheduler-listrow--document');
    // A method distinguishes payments; the section already names PO/invoice.
    if (code) {
      const tag = el('span', `rux--tag rux--tag--sm ${tone}`, code);
      if (codeTitle) tag.title = codeTitle;
      line.appendChild(tag);
    }
    line.append(el('span', 'scheduler-listrow__when', when),
                el('span', 'scheduler-listrow__much', much ?? ''));
    open.appendChild(line);
    open.title = title;
    open.setAttribute('aria-label', openLabel);
    open.addEventListener('click', openRow);
    li.appendChild(open);
    const act = el('div', 'rux--contained-list-item__action');
    const more = el('button', 'rux--btn rux--btn--ghost rux--btn--icon-only rux--layout--size-sm rux--menu-button__trigger');
    more.type = 'button';
    more.setAttribute('aria-haspopup', 'true');
    more.setAttribute('aria-expanded', 'false');
    // The trigger's name is the row's, so two rows' menus are told apart.
    more.setAttribute('aria-label', `Actions for ${title}`);
    more.appendChild(svgUse('#i-overflow-menu--vertical', '16', '0 0 32 32'));
    more.lastChild.setAttribute('class', 'rux--btn__icon');
    more.addEventListener('click', () => openRowMenu(more, {
      edit, remove, removeLabel, editText, removeText,
    }));
    act.appendChild(more);
    li.appendChild(act);
    return li;
  };

  /* ── The Files tab ──
     Its list is every file the trip holds, newest first, in the rows payments
     use: the type as a tag, the upload day, the size, and the file name on
     hover. An itinerary that is not the trip's newest is tagged Previous. A
     row opens its file, the itinerary panel for an itinerary and a new tab
     otherwise, and its menu holds Replace and Delete. The list is drawn again
     on its own after a file changes, so the form's unsaved edits stay. */
  const FILE_TAGS = {
    itinerary: { code: 'Itinerary', tone: 'rux--tag--blue' },
    contract: { code: 'Contract', tone: 'rux--tag--purple' },
    po: { code: 'PO', tone: 'rux--tag--teal', title: 'Purchase order' },
  };
  const PREVIOUS_TAG = { code: 'Previous', tone: 'rux--tag--gray', title: 'An earlier itinerary' };

  const fileSize = n => {
    const bytes = Number(n);
    if (!Number.isFinite(bytes) || bytes <= 0) return '';
    return bytes < 1048576 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const docUrl = doc => (client && doc.file_path
    ? client.storage.from(DOC_BUCKET).getPublicUrl(doc.file_path).data?.publicUrl : null);

  const fileRow = (trip, doc, previous) => {
    const kind = String(doc.label || '').toLowerCase();
    const tag = previous ? PREVIOUS_TAG : (FILE_TAGS[kind] ?? { code: doc.label || 'File', tone: 'rux--tag--gray' });
    const name = doc.file_name || doc.label || 'File';
    const when = uploadedOn(doc.created_at);
    const li = listRow({
      code: tag.code, tone: tag.tone, codeTitle: tag.title,
      when, much: fileSize(doc.file_size), title: name,
      openLabel: `Open ${name}${when ? `, uploaded ${when}` : ''}`,
      open: e => {
        if (kind === 'itinerary') { openDocument(trip, doc, e.currentTarget); return; }
        window.open(docUrl(doc) || documentLink(doc.id), '_blank', 'noopener');
      },
      editText: 'Replace', edit: () => replaceFrom(trip.id, doc),
      removeText: 'Delete', removeLabel: `Delete ${name}`, remove: () => openDeleteFile(trip.id, doc),
    });
    // Closing the itinerary panel finds the row by it after the list is redrawn.
    li.querySelector('.rux--contained-list-item__content').dataset.documentId = doc.id;
    return li;
  };

  let filesBody = null;
  let filesEmpty = null;
  function drawFiles(trip) {
    if (!filesBody || !trip) return;
    const docs = documentsOf(trip);
    const newest = latestItinerary(trip);
    filesBody.replaceChildren(...docs.map(doc => fileRow(trip, doc,
      String(doc.label || '').toLowerCase() === 'itinerary' && newest && doc.id !== newest.id)));
    filesEmpty.hidden = docs.length > 0;
  }

  /* Carbon's file item for the file going up, from `sink/file-uploader.html`:
     a spinner while it uploads, gone once it is added, and the invalid item
     with its reason and a close button if it is not. */
  function fileItem(container, name) {
    const box = el('span', 'rux--file__selected-file rux--file__selected-file--md');
    const wrap = el('div', 'rux--file-filename-container-wrap');
    const label = el('p', 'rux--file-filename', name);
    label.title = name;
    wrap.appendChild(label);
    const stateWrap = el('div');
    const state = el('span', 'rux--file__state-container');
    state.appendChild(loadingSpinner(' rux--file-loading'));
    stateWrap.appendChild(state);
    box.append(wrap, stateWrap);
    container.replaceChildren(box);
    return {
      done: () => box.remove(),
      fail: (title, text) => {
        box.classList.add('rux--file__selected-file--invalid');
        wrap.className = 'rux--file-filename-container-wrap-invalid';
        const icon = svgUse('#i-warning--filled', '16', '0 0 16 16');
        icon.setAttribute('class', 'rux--file-invalid');
        const close = el('button', 'rux--file-close');
        close.type = 'button';
        close.setAttribute('aria-label', `Dismiss ${name}`);
        close.appendChild(svgUse('#i-close', '16', '0 0 32 32'));
        close.addEventListener('click', () => box.remove());
        state.replaceChildren(icon, close);
        const req = el('div', 'rux--form-requirement');
        req.setAttribute('role', 'alert');
        req.append(el('div', 'rux--form-requirement__title', title),
                   el('p', 'rux--form-requirement__supplement', text));
        box.appendChild(req);
      },
    };
  }

  /* Carbon's file uploader, from `sink/file-uploader.html`: a Type dropdown
     over a drop zone that also opens the file dialog. Design ships no module
     for it, so the drop, the dialog and the item are wired here. One file at a
     time, and the zone is disabled while one goes up. */
  function fileUploader(tripId) {
    const type = selectField('scheduler-f-filetype', 'Type', 'Itinerary',
      [['Itinerary', 'Itinerary'], ['Contract', 'Contract'], ['PO', 'Purchase order']]);
    const item = el('div', 'rux--form-item');
    const drop = el('button', 'rux--file__drop-container rux--file-browse-btn', 'Drag and drop a PDF here or click to upload');
    drop.type = 'button';
    const inputLabel = el('label', 'rux--visually-hidden', 'PDF file');
    inputLabel.htmlFor = 'scheduler-f-file';
    const input = el('input', 'rux--file-input rux--visually-hidden');
    input.type = 'file';
    input.id = 'scheduler-f-file';
    input.accept = '.pdf,application/pdf';
    input.tabIndex = -1;
    const zone = el('div', 'rux--file');
    zone.append(drop, inputLabel, input);
    const container = el('div', 'rux--file-container rux--file-container--drop');
    item.append(el('p', 'rux--file--label', 'File'),
      el('p', 'rux--label-description', 'PDF only. It is added to the trip at once, without Save.'),
      zone, container);

    const busy = on => {
      drop.disabled = on;
      drop.classList.toggle('rux--file-browse-btn--disabled', on);
    };
    const start = async file => {
      if (!file || drop.disabled) return;
      const label = document.getElementById('scheduler-f-filetype')?.value || 'Itinerary';
      busy(true);
      try { await uploadFrom(tripId, label, file, fileItem(container, file.name)); }
      finally { busy(false); }
    };
    drop.addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      input.value = '';
      start(file);
    });
    const over = on => drop.classList.toggle('rux--file__drop-container--drag-over', on);
    drop.addEventListener('dragover', e => { e.preventDefault(); if (!drop.disabled) over(true); });
    drop.addEventListener('dragleave', () => over(false));
    drop.addEventListener('drop', e => {
      e.preventDefault();
      over(false);
      start(e.dataTransfer?.files?.[0]);
    });

    const wrap = el('div', 'scheduler-file-add');
    wrap.append(full(type), item);
    return wrap;
  }

  // The editor is a flex child of the board, not an animated overlay, so
  // closing it is setting `hidden`.
  function closePanel(returnFocus = true) {
    if (panelEl.hidden) return;
    // Closing puts the editor's own trip down; a different trip selected
    // meanwhile stays selected.
    const picked = selectedBar();
    if (picked && isEditorBar(picked)) picked.setAttribute('aria-pressed', 'false');
    panelEl.hidden = true;
    if (tripEl) tripEl.hidden = true;
    syncSelection();
    const opener = panelOpener;
    panelOpener = null;
    // The roster comes back first, so the fit below measures a board that has
    // it. `placeAvailability` fits too, and a second fit changes nothing.
    if (availYielded) { availYielded = false; placeAvailability(); }
    window.Rux?.schedule?.fit?.();
    if (returnFocus && opener?.isConnected) opener.focus();
  }

  /* ── The trip editor ──
     It edits the trip's details, dates, times, billing and contacts. The
     action bar holds Save, Reset, and Cancel, which cancels the trip after a
     dialog. Save reads back rather than trusting the write: `show()` re-reads
     the week and Save then closes the editor. Any other render leaves the
     editor open on its trip. */
  const FIELD = (id, label, control, cls = 'rux--form-item') => {
    const item = el('div', cls);
    const lw = el('div', 'rux--text-input__label-wrapper');
    const lab = el('label', 'rux--label', label);
    lab.setAttribute('for', id);
    lw.appendChild(lab);
    item.append(lw, control);
    return item;
  };

  /* A field whose section heading already names it shows a placeholder and no
     visible label. The name stays as `aria-label`, because a placeholder is
     not a reliable accessible name and disappears on typing. It is not
     `aria-labelledby` the heading, which names the section, not the field. */
  const BARE = (control, cls = 'rux--form-item') => {
    const item = el('div', cls);
    item.appendChild(control);
    return item;
  };

  /* No browser autofill on a trip's fields. They hold a customer's data, never
     the person typing, yet Chrome reads labels like `Booking contact name` or
     `Pickup location` and offers the user's own saved address. Chrome ignores
     `off` for address autofill, so the value is a token it does not recognise,
     which it treats as a field it should not fill. */
  const NO_AUTOFILL = 'scheduler-trip-field';

  function textField(id, label, value, placeholder) {
    const outer = el('div', 'rux--text-input__field-outer-wrapper');
    const wrap = el('div', 'rux--text-input__field-wrapper');
    const input = el('input', 'rux--text-input');
    input.type = 'text';
    input.id = id;
    input.autocomplete = NO_AUTOFILL;
    input.value = value ?? '';
    wrap.appendChild(input);
    outer.appendChild(wrap);
    if (!placeholder) return FIELD(id, label, outer, 'rux--form-item rux--text-input-wrapper');
    input.placeholder = placeholder;
    input.setAttribute('aria-label', label);
    return BARE(outer, 'rux--form-item rux--text-input-wrapper');
  }

  /* `rux--text-input` with `type="time"`, not `rux--time-picker`: Carbon's
     time picker is another component, an input beside an AM/PM select, and
     this markup is a text input. The browser draws the clock and the
     platform's own entry; Carbon draws the box. */
  function timeField(id, label, value) {
    const outer = el('div', 'rux--text-input__field-outer-wrapper');
    const wrap = el('div', 'rux--text-input__field-wrapper');
    const input = el('input', 'rux--text-input');
    input.type = 'time';
    input.id = id;
    // `trip_stops` times come back as HH:MM:SS; the control wants HH:MM.
    input.value = value ? String(value).slice(0, 5) : '';
    wrap.appendChild(input);
    outer.appendChild(wrap);
    return FIELD(id, label, outer, 'rux--form-item rux--text-input-wrapper');
  }

  /* Carbon's small toggle, from `sink/toggle.html`, with no On/Off text: the
     section heading beside it names the state (Contract signed, PO received,
     Invoice sent). `js/form-controls.js` binds it and fires `rux:toggle`. The
     check glyph stays mounted, and Carbon hides it while off. */
  function toggleAction(id, label, on) {
    const box = el('div', 'rux--toggle');
    const btn = el('button', 'rux--toggle__button');
    btn.type = 'button';
    btn.id = id;
    btn.setAttribute('role', 'switch');
    btn.setAttribute('aria-checked', String(!!on));
    btn.setAttribute('aria-label', label);
    const lab = el('label', 'rux--toggle__label');
    lab.setAttribute('for', id);
    const appearance = el('div', 'rux--toggle__appearance rux--toggle__appearance--sm');
    const sw = el('div', 'rux--toggle__switch');
    if (on) sw.classList.add('rux--toggle__switch--checked');
    const check = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    check.setAttribute('class', 'rux--toggle__check');
    check.setAttribute('width', '6px');
    check.setAttribute('height', '5px');
    check.setAttribute('viewBox', '0 0 6 5');
    check.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M2.2 2.7L5 0 6 1 2.2 5 0 2.7 1 1.5z');
    check.appendChild(path);
    sw.appendChild(check);
    appearance.appendChild(sw);
    lab.appendChild(appearance);
    box.append(btn, lab);
    return box;
  }

  /* Money is a text input with a decimal keyboard, not `rux--number-input`,
     whose stepper buttons suit nothing anyone steps by one.
     `inputmode="decimal"` gives a phone the right keypad. */
  function moneyField(id, label, value, placeholder) {
    const outer = el('div', 'rux--text-input__field-outer-wrapper');
    const wrap = el('div', 'rux--text-input__field-wrapper');
    const input = el('input', 'rux--text-input');
    input.type = 'text';
    input.inputMode = 'decimal';
    input.id = id;
    input.value = (value === null || value === undefined) ? '' : String(value);
    wrap.appendChild(input);
    outer.appendChild(wrap);
    if (!placeholder) return FIELD(id, label, outer, 'rux--form-item rux--text-input-wrapper');
    input.placeholder = placeholder;
    input.setAttribute('aria-label', label);
    return BARE(outer, 'rux--form-item rux--text-input-wrapper');
  }

  /* A search over the contacts, as Carbon's combo box. Names repeat, so each
     option shows the name over the organization and phone, and typing filters
     on all three. `js/list-box.js` opens, filters and picks. A pick writes only
     the name into the field, through the option's `data-rux-text`, and the
     input's `data-contact-id` says whose it is for the save. */
  function contactSearch(id, label, contacts, current) {
    const lab = el('label', 'rux--label', label);
    lab.setAttribute('for', id);
    const root = el('div', 'rux--combo-box rux--list-box');
    const field = el('div', 'rux--list-box__field');
    const input = el('input', current ? 'rux--text-input' : 'rux--text-input rux--text-input--empty');
    input.type = 'text';
    input.id = id;
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-haspopup', 'listbox');
    input.setAttribute('aria-expanded', 'false');
    input.autocomplete = NO_AUTOFILL;
    input.placeholder = 'Search contacts';
    input.value = current?.name ?? '';
    if (current?.id) input.dataset.contactId = current.id;
    /* No clear or open button: `js/list-box.js` looks both up optionally and
       opens the list on a click in the field or on typing, and a name edited
       by hand unlinks the contact. */
    field.append(input);
    const menu = el('ul', 'rux--list-box__menu');
    menu.setAttribute('role', 'listbox');
    menu.hidden = true;
    for (const c of contacts) {
      const on = !!current?.id && String(c.id) === String(current.id);
      const option = el('li', on
        ? 'rux--list-box__menu-item rux--list-box__menu-item--active scheduler-contact-option'
        : 'rux--list-box__menu-item scheduler-contact-option');
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', String(on));
      option.dataset.contactId = c.id;
      option.dataset.ruxText = c.name ?? '';
      const body = el('div', 'rux--list-box__menu-item__option scheduler-contact-option__body');
      body.appendChild(el('span', 'scheduler-contact-option__name', c.name ?? ''));
      const detail = [c.client, c.phone].filter(Boolean).join(' · ');
      if (detail) body.appendChild(el('span', 'scheduler-contact-option__detail', detail));
      const tick = svgUse('#i-checkmark', '16', '0 0 20 20');
      tick.classList.add('rux--list-box__menu-item__selected-icon');
      body.appendChild(tick);
      option.appendChild(body);
      menu.appendChild(option);
    }
    root.append(field, menu);
    // The wrapper is the field's outermost box, as in Carbon's DOM, so
    // `.rux--form-item`'s `align-items: flex-start` does not shrink the field.
    const wrap = el('div', 'rux--list-box__wrapper');
    wrap.append(lab, root);
    return wrap;
  }

  /* A copy button in a contact field: Design's copy button in its tooltip.
     `js/copy-button.js` copies the button's `data-rux-copy`, which `syncCopy`
     keeps equal to the field, so what is copied is what is on screen. It shows
     only while the field has a value and stays out of the tab order, since the
     field itself copies from the keyboard.

     On a combo box it goes in the root, not the field, because
     `js/list-box.js` opens the menu on any click inside `__field`. */
  function withCopy(item, id, label) {
    const input = item.querySelector(`#${id}`);
    const combo = input?.closest('.rux--combo-box');
    const host = combo || input?.closest('.rux--text-input__field-wrapper');
    if (!host) return item;
    host.classList.add('scheduler-copy-host');
    const tip = el('span', 'rux--tooltip rux--icon-tooltip rux--popover-container rux--popover--left '
      + 'rux--popover--caret rux--popover--high-contrast scheduler-copy');
    tip.dataset.copyFor = id;
    const trigger = el('div', 'rux--tooltip-trigger__wrapper');
    const btn = el('button', 'rux--copy-btn rux--copy rux--btn rux--btn--ghost rux--btn--icon-only rux--layout--size-sm');
    btn.type = 'button';
    btn.tabIndex = -1;
    btn.setAttribute('aria-label', `Copy ${label.charAt(0).toLowerCase()}${label.slice(1)}`);
    btn.appendChild(svgUse('#i-copy', '16', '0 0 32 32'));
    trigger.appendChild(btn);
    const pop = el('span', 'rux--popover');
    pop.append(el('span', 'rux--popover-content rux--tooltip-content', 'Copy'), el('span', 'rux--popover-caret'));
    tip.append(trigger, pop);
    host.appendChild(tip);
    syncCopyTip(tip, input);
    return item;
  }

  // Shows or hides one copy button for its field's value, and gives the field
  // room for it while it shows (overrides.css).
  function syncCopyTip(tip, input) {
    const value = input?.value.trim() || '';
    tip.hidden = !value;
    tip.querySelector('.rux--copy-btn').dataset.ruxCopy = value;
    tip.parentElement?.classList.toggle('scheduler-copy-on', !!value);
  }
  const syncCopy = () => {
    for (const tip of document.querySelectorAll('.scheduler-copy')) {
      syncCopyTip(tip, document.getElementById(tip.dataset.copyFor));
    }
  };

  function selectField(id, label, value, options) {
    const box = el('div', 'rux--select');
    const lab = el('label', 'rux--label', label);
    lab.setAttribute('for', id);
    const wrap = el('div', 'rux--select-input__wrapper');
    const sel = el('select', 'rux--select-input');
    sel.id = id;
    for (const [val, text] of options) {
      const o = el('option', 'rux--select-option', text);
      o.value = val;
      if (String(value ?? '') === val) o.selected = true;
      sel.appendChild(o);
    }
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'rux--select__arrow');
    svg.setAttribute('width', '16'); svg.setAttribute('height', '16');
    svg.setAttribute('viewBox', '0 0 32 32'); svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#i-chevron--down');
    svg.appendChild(use);
    wrap.append(sel, svg);
    box.append(lab, wrap);
    const item = el('div', 'rux--form-item');
    item.appendChild(box);
    return item;
  }

  /* A need as Carbon's selectable tag, from the capture `components-tag--selectable`:
     a button that carries its own state in `aria-pressed`, with the label in a
     span inside a span. Four checkboxes need 337px of a 288px row and wrap; four
     tags fit, because the tag is its own hit area with no separate box beside it. */
  function tagField(id, label, on) {
    const tag = el('button', on ? 'rux--tag rux--tag--selectable rux--tag--selectable-selected'
                                : 'rux--tag rux--tag--selectable');
    tag.type = 'button';
    tag.id = id;
    tag.setAttribute('aria-pressed', String(!!on));
    const outer = el('span');
    outer.appendChild(el('span', 'rux--tag__label', label));
    tag.appendChild(outer);
    tag.addEventListener('click', () => {
      const now = tag.getAttribute('aria-pressed') !== 'true';
      tag.setAttribute('aria-pressed', String(now));
      tag.classList.toggle('rux--tag--selectable-selected', now);
      // The panel watches `input` to know the form is dirty; a button fires none.
      tag.dispatchEvent(new Event('input', { bubbles: true }));
    });
    return tag;
  }

  // A selectable tag holds its state in `aria-pressed`; there is no input to read.
  const pressed = node => node?.getAttribute('aria-pressed') === 'true';

  function checkField(id, label, checked) {
    const item = el('div', 'rux--form-item rux--checkbox-wrapper');
    const input = el('input', 'rux--checkbox');
    input.type = 'checkbox';
    input.id = id;
    input.checked = !!checked;
    const lab = el('label', 'rux--checkbox-label');
    lab.setAttribute('for', id);
    lab.appendChild(el('div', 'rux--checkbox-label-text', label));
    item.append(input, lab, el('div', 'rux--checkbox__validation-msg'));
    return item;
  }

  /* The trip's colour, as Carbon's dropdown with one option per row of
     `TRIP_COLORS` after Standard. Carbon has no swatch, so the field and each
     option carry a `scheduler-swatch` chip wearing the hue class the bar
     wears, which shows the fill the board paints rather than an approximation
     of it. The chosen option wears the checkmark Carbon's combo box draws, so
     the list reads like the bar menu's Color submenu.

     `js/list-box.js` opens it, runs the keyboard and moves the selection. A
     pick writes the option's text into the field, which drops the chip, so
     the field is repainted here. The root carries `id`, which is what
     `readForm` looks up. */
  function colorField(id, trip) {
    const chosen = tripColorOf(trip) ?? '';
    const choices = [{ value: '', label: 'Standard', hue: standardHueOf(trip) }, ...TRIP_COLORS];
    const chip = hue => {
      const c = el('span', `scheduler-swatch scheduler-bar--${hue}`);
      c.setAttribute('aria-hidden', 'true');
      return c;
    };
    const lab = el('label', 'rux--label', 'Trip bar color');
    lab.id = `${id}-label`;
    const root = el('div', 'rux--dropdown rux--list-box');
    root.id = id;
    const field = el('button', 'rux--list-box__field');
    field.type = 'button';
    field.setAttribute('role', 'combobox');
    field.setAttribute('aria-labelledby', lab.id);
    field.setAttribute('aria-expanded', 'false');
    field.setAttribute('aria-haspopup', 'listbox');
    const shown = el('span', 'rux--list-box__label');
    const caret = el('div', 'rux--list-box__menu-icon');
    caret.appendChild(svgUse('#i-chevron--down', '16', '0 0 16 16'));
    field.append(shown, caret);
    const paint = choice => shown.replaceChildren(chip(choice.hue), choice.label);
    const menu = el('ul', 'rux--list-box__menu');
    menu.setAttribute('role', 'listbox');
    menu.hidden = true;
    for (const choice of choices) {
      const on = choice.value === chosen;
      const option = el('li', on ? 'rux--list-box__menu-item rux--list-box__menu-item--active' : 'rux--list-box__menu-item');
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', String(on));
      option.dataset.color = choice.value;
      const tick = svgUse('#i-checkmark', '16', '0 0 20 20');
      tick.classList.add('rux--list-box__menu-item__selected-icon');
      const body = el('div', 'rux--list-box__menu-item__option');
      body.append(chip(choice.hue), choice.label, tick);
      option.appendChild(body);
      menu.appendChild(option);
      if (on) paint(choice);
    }
    root.append(field, menu);
    root.addEventListener('rux:listbox-selected', e =>
      paint(choices.find(c => c.value === e.detail.option.dataset.color)));
    const wrap = el('div', 'rux--list-box__wrapper');
    wrap.append(lab, root);
    const item = el('div', 'rux--form-item');
    item.appendChild(wrap);
    return item;
  }

  /* Notes grows to fit its text from one row, so a long note is read whole
     rather than scrolled inside the box. The height is measured, so it is set on
     every edit and whenever the box changes size, which covers the tab opening
     from hidden and the text rewrapping. The panel's scroll is kept, because
     the box collapses for a moment while it is measured. */
  const fitNotes = ta => {
    if (!ta.clientWidth) return;
    const body = ta.closest('#scheduler-panel-body');
    const top = body?.scrollTop;
    ta.style.blockSize = 'auto';
    ta.style.blockSize = `${ta.scrollHeight + ta.offsetHeight - ta.clientHeight}px`;
    if (body) body.scrollTop = top;
  };
  // One observer for the one Notes box: a rebuilt panel's old box is let go
  // before the new one is watched.
  const notesObserver = new ResizeObserver(([entry]) => fitNotes(entry.target));

  function notesField(id, label, value) {
    const item = el('div', 'rux--form-item');
    const lw = el('div', 'rux--text-area__label-wrapper');
    const lab = el('label', 'rux--label', label);
    lab.setAttribute('for', id);
    lw.appendChild(lab);
    const wrap = el('div', 'rux--text-area__wrapper');
    const ta = el('textarea', 'rux--text-area');
    ta.id = id;
    ta.rows = 1;
    ta.value = value ?? '';
    ta.addEventListener('input', () => fitNotes(ta));
    notesObserver.disconnect();
    notesObserver.observe(ta);
    wrap.append(ta, el('span', 'rux--text-area__counter-alert'));
    wrap.lastChild.setAttribute('role', 'alert');
    item.append(lw, wrap);
    return item;
  }

  /* A Carbon range date picker, from the capture
     `preview-preview-datepicker--range-with-calendar@open`: the root, `--from`
     and `--to` containers and one shared calendar container. Only the shell is
     written here; `Rux.datePicker.init(scope)` claims it and fills the calendar.

     It writes ISO and dispatches `change`, so the dirty check sees it. The
     first pick of a range clears the `to` input, so the save treats a blank
     end as the start day. */
  const dpIcon = () => {
    const b = el('button', 'rux--date-picker__icon');
    b.type = 'button';
    b.setAttribute('aria-label', 'Open calendar');
    b.tabIndex = -1;
    b.appendChild(svgUse('#i-calendar', '16', '0 0 32 32'));
    return b;
  };

  /* Each container class is written out in full for check-classes. A lone
     picker takes `--single`: `--from` is the first half of a range, and Carbon
     sizes its input as half a range control. */
  const DP_CONTAINER = {
    single: 'rux--date-picker-container rux--date-picker-container--single',
    from: 'rux--date-picker-container rux--date-picker-container--from',
    to: 'rux--date-picker-container rux--date-picker-container--to',
  };

  /* The date picker's own size modifiers, because its input takes a class
     rather than reading the height every other control inherits from
     `rux--layout--size-*` on a container. Written out whole, not built from
     the size, so the class sweep can resolve them. */
  const DP_INPUT = {
    sm: 'rux--date-picker__input rux--date-picker__input--sm',
    lg: 'rux--date-picker__input rux--date-picker__input--lg',
  };

  const dpContainer = (which, id, labelText, value, size) => {
    const c = el('div', DP_CONTAINER[which]);
    const lab = el('label', 'rux--label', labelText);
    lab.setAttribute('for', id);
    const wrap = el('div', 'rux--date-picker-input__wrapper');
    const span = el('span');
    const input = el('input', DP_INPUT[size] ?? 'rux--date-picker__input');
    input.type = 'text';
    input.id = id;
    input.value = value || '';
    span.append(input, dpIcon());
    wrap.appendChild(span);
    c.append(lab, wrap);
    return c;
  };

  /* The calendar body, shared by both variants: `date-picker.js` claims any
     `--next` root holding a `__calendar-container` and fills the days, so
     range and single differ only in variant class and inputs. */
  function calendarBody() {
    /* `rux--layer-two` raises `--rux-layer` for the calendar, which otherwise
       paints the same layer as the side panel it opens in and shows no edge.
       The class travels with the element, which `date-picker.js` detaches on
       claim and re-inserts on open. */
    const cc = el('div', 'rux--date-picker__calendar-container rux--layer-two');
    cc.hidden = true;
    const cal = el('div', 'rux--date-picker__calendar');
    cal.setAttribute('role', 'grid');
    cal.setAttribute('aria-label', 'Calendar');
    cal.tabIndex = 0;
    const month = el('div', 'rux--date-picker__month');
    const prev = el('button', 'rux--date-picker__month-nav');
    prev.type = 'button'; prev.setAttribute('aria-label', 'Previous month');
    prev.appendChild(svgUse('#i-chevron--left', '16', '0 0 16 16'));
    const next = el('button', 'rux--date-picker__month-nav');
    next.type = 'button'; next.setAttribute('aria-label', 'Next month');
    next.appendChild(svgUse('#i-chevron--right', '16', '0 0 16 16'));
    month.append(prev, el('div', 'rux--date-picker__current-month'), next);
    const weekdays = el('div', 'rux--date-picker__weekdays');
    for (let i = 0; i < 7; i++) weekdays.appendChild(el('div', 'rux--date-picker__weekday'));
    cal.append(month, weekdays, el('div', 'rux--date-picker__days'));
    cc.appendChild(cal);
    return cc;
  }

  /* One date, on Carbon's `--single` variant rather than a range with one half
     hidden. It reuses `dpContainer` and the calendar body; the variant class is
     the whole difference. */
  function dateOne(id, label, value) {
    const root = el('div', 'rux--date-picker rux--date-picker--next rux--date-picker--single');
    root.appendChild(dpContainer('single', id, label, value));
    root.appendChild(calendarBody());
    const item = el('div', 'rux--form-item');
    item.appendChild(root);
    return item;
  }

  function dateRange(fromId, toId, fromLabel, toLabel, fromVal, toVal) {
    const root = el('div', 'rux--date-picker rux--date-picker--next rux--date-picker--range');
    root.append(
      dpContainer('from', fromId, fromLabel, fromVal, 'sm'),
      dpContainer('to', toId, toLabel, toVal, 'sm'),
    );
    root.appendChild(calendarBody());
    const item = el('div', 'rux--form-item');
    item.appendChild(root);
    return item;
  }

  // The `trips` columns Save writes, each with how to read it off the form. A
  // blank field reads as null; undefined means the control is not on screen.
  const SPLIT = 'dropoff_pickup';
  const isoOrNull = v => (/^\d{4}-\d{2}-\d{2}$/.test((v || '').trim()) ? v.trim() : null);

  const EDITS = [
    { key: 'destination', get: f => f['scheduler-f-destination'].value.trim() || null },
    { key: 'start_date', get: f => isoOrNull(f['scheduler-f-start'].value) },
    // A blank end saves as the start day, because the picker clears this input
    // on the first pick of a range.
    { key: 'end_date', get: f => isoOrNull(f['scheduler-f-end'].value) ?? isoOrNull(f['scheduler-f-start'].value) },
    // The return pair is null unless the type is a split: `legsOf` draws a
    // return leg from any return date, whatever the type.
    { key: 'return_start_date', get: f => f['scheduler-f-type'].value === SPLIT ? isoOrNull(f['scheduler-f-rstart'].value) : null },
    { key: 'return_end_date', get: f => f['scheduler-f-type'].value !== SPLIT ? null
        : (isoOrNull(f['scheduler-f-rend'].value) ?? isoOrNull(f['scheduler-f-rstart'].value)) },
    { key: 'customer', get: f => f['scheduler-f-customer'].value.trim() || null },
    { key: 'trip_type', get: f => f['scheduler-f-type'].value || null },
    // Standard is the empty value and stores null.
    { key: 'trip_bar_color', get: f => f['scheduler-f-color'].querySelector('.rux--list-box__menu-item--active')?.dataset.color || null },
    // `confirmed`, `balance_paid` and `date_paid` are not written: rux-ui
    // derives all three on every save, so a value set here would be overwritten.
    { key: 'req_sleeper', get: f => pressed(f['scheduler-f-sleeper']) },
    { key: 'req_ada', get: f => pressed(f['scheduler-f-ada']) },
    { key: 'req_56pax', get: f => pressed(f['scheduler-f-56pax']) },
    // A reminder to book a hotel, not the bus's equipment; rux-ui lists it with the needs.
    { key: 'need_hotel', get: f => pressed(f['scheduler-f-hotel']) },
    // Each leg's hotel: whether it is booked, and its confirmation number.
    ...['outbound', 'return'].flatMap(l => [
      { key: `hotel_booked_${l}`, get: () => !!document.getElementById(`scheduler-f-hotelbooked-${l}`)?.checked },
      { key: `hotel_itinerary_number_${l}`, get: () => fieldVal(`scheduler-f-hotelref-${l}`) ?? null },
    ]),
    { key: 'notes', get: f => f['scheduler-f-notes'].value.trim() || null },
    /* Billing. Money goes to the column as a number or null, never NaN, which
       Postgres rejects with an error that does not name the field. The two
       statuses are text columns holding "Pending"/"Signed" and
       "Pending"/"Invoiced", not booleans.

       Each gated field is null while its switch is off, the rule rux-ui's
       `collectTrip` follows too. `invoiced` is written beside `invoice_status`
       so the two always agree. */
    { key: 'quoted_price', get: f => money(f['scheduler-f-quoted'].value) },
    { key: 'contract_status', get: f => on(f['scheduler-f-contract']) ? 'Signed' : 'Pending' },
    { key: 'contract_note',
      get: f => on(f['scheduler-f-contract']) ? (f['scheduler-f-contractnote'].value.trim() || null) : null },
    /* The PO and invoice columns are filled from the rows in `trip_pos` and
       `trip_invoices`: `po_ref` is the first PO's reference, `po_amount` the sum
       of the PO amounts and `invoice_number` the first invoice's number, because
       rux-ui and other readers still use the columns. `listRowsToSave` is the
       list Save writes, so the columns and the rows agree. */
    { key: 'po_received', get: f => on(f['scheduler-f-poreceived']) },
    { key: 'po_ref', get: () => listRowsToSave('po')[0]?.ref ?? null },
    { key: 'po_amount', get: () => sumOrNull(listRowsToSave('po')) },
    { key: 'invoice_status', get: f => on(f['scheduler-f-invoice']) ? 'Invoiced' : 'Pending' },
    { key: 'invoiced', get: f => on(f['scheduler-f-invoice']) },
    { key: 'invoice_number', get: () => listRowsToSave('invoice')[0]?.number ?? null },
    // Files. A trip that runs without an itinerary loses its bar's mark.
    { key: 'itinerary_not_needed', get: f => on(f['scheduler-f-notneeded']) },
    /* The contact links are trip columns, so they diff here. They read the DOM
       rather than `f`, which keeps them out of `readForm`'s required ids; a
       getter returns undefined when its control is not on screen. */
    { key: 'booking_contact_id', get: () => linkId('scheduler-f-cfind') },
    { key: 'trip_contact_1_id', get: () => dayLink(1) },
    { key: 'trip_contact_2_id', get: () => dayLink(2) },
    { key: 'trip_contact_3_id', get: () => dayLink(3) },
    { key: 'trip_contact_4_id', get: () => dayLink(4) },
    { key: 'trip_contact_5_id', get: () => dayLink(5) },
    /* The trip's own copy of each contact, which rux-ui reads and writes: the
       name, phone and email as this trip has them. `undefined` when the field
       is not on screen, as above. The ids are settled at save by
       `linkContacts`, which needs the database. */
    { key: 'booking_contact_name', get: () => fieldVal('scheduler-f-cfind') },
    { key: 'booking_contact_phone', get: () => fieldVal('scheduler-f-cphone') },
    { key: 'booking_contact_email', get: () => fieldVal('scheduler-f-cemail') },
    ...[1, 2, 3, 4, 5].flatMap(n => [
      { key: `trip_contact_${n}_name`, get: () => dayVal(`scheduler-f-d${n}`) },
      { key: `trip_contact_${n}_phone`, get: () => dayVal(`scheduler-f-dphone${n}`) },
    ]),
  ];

  // The id a search field resolved to, or null when the box was cleared or
  // typed freehand. `undefined` means the control is not on screen at all.
  const linkId = id => {
    const e = document.getElementById(id);
    if (!e) return undefined;
    return e.value.trim() ? (e.dataset.contactId || null) : null;
  };

  /* A day-of contact link. Row one's name field stands for the block: when it
     is absent the getter returns undefined, which writes nothing, where null
     would clear the link. */
  const dayLink = n => {
    if (!document.getElementById('scheduler-f-d1')) return undefined;
    return linkId(`scheduler-f-d${n}`) ?? null;
  };

  // A contact field's text: null when blank, undefined when not on screen.
  const fieldVal = id => {
    const e = document.getElementById(id);
    return e ? (e.value.trim() || null) : undefined;
  };
  // A day-of field, null for a row not drawn while the rows are, as `dayLink`.
  const dayVal = id => {
    if (!document.getElementById('scheduler-f-d1')) return undefined;
    return fieldVal(id) ?? null;
  };

  /* Linking a trip's contacts, as rux-ui does it. A contact picked from the
     list keeps its id while the name, phone or email still agrees with it;
     anything else is matched against the contacts list by phone, then email,
     then exact name, and added to the list when nothing matches -- which is
     what puts a name typed once into the search on the next trip. The
     contact's own record is never changed from here: phone and email are this
     trip's copy. */
  const CONTACT_SLOTS = [
    { idKey: 'booking_contact_id', name: 'scheduler-f-cfind', phone: 'scheduler-f-cphone',
      email: 'scheduler-f-cemail', client: 'scheduler-f-customer',
      copy: { name: 'booking_contact_name', phone: 'booking_contact_phone', email: 'booking_contact_email' } },
    ...[1, 2, 3, 4, 5].map(n => ({ idKey: `trip_contact_${n}_id`, name: `scheduler-f-d${n}`,
                                  phone: `scheduler-f-dphone${n}`,
                                  copy: { name: `trip_contact_${n}_name`, phone: `trip_contact_${n}_phone` } })),
  ];
  const phoneDigits = v => String(v ?? '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  const folded = v => String(v ?? '').trim().toLowerCase();
  const samePerson = (c, p) => [
    [phoneDigits(c.phone), phoneDigits(p.phone)],
    [folded(c.email), folded(p.email)],
    [folded(c.name), folded(p.name)],
  ].some(([a, b]) => a && a === b);
  // `ilike` with nothing wild in it: an exact match, case aside.
  const likeExact = v => String(v).trim().replace(/[\\%_]/g, m => `\\${m}`);

  /* A new contact's id is made before its insert and kept for that person until
     the insert is confirmed, so a save pressed again after a timeout sends the
     same id. The database refuses a second row with it, and that refusal means
     the first insert landed. */
  const pendingContactIds = new Map();
  const personKey = p => [folded(p.name), phoneDigits(p.phone), folded(p.email)].join('|');

  async function matchOrAddContact(p) {
    const cols = 'id,name,phone,email,client';
    const key = personKey(p);
    const first = async query => {
      const { data, error } = await withTimeout(query.limit(1).then(r => r));
      if (error) throw new Error(error.message);
      return data?.[0] ?? null;
    };
    const hit = (p.phone && await first(client.from('contacts').select(cols).eq('phone', p.phone)))
      || (p.email && await first(client.from('contacts').select(cols).ilike('email', likeExact(p.email))))
      || await first(client.from('contacts').select(cols).ilike('name', likeExact(p.name)));
    if (hit) { pendingContactIds.delete(key); return hit; }
    const newId = pendingContactIds.get(key) ?? crypto.randomUUID();
    pendingContactIds.set(key, newId);
    const row = { id: newId, name: p.name, phone: p.phone, email: p.email, client: p.client };
    const { data, error } = await withTimeout(client.from('contacts').insert(row).select(cols).single().then(r => r));
    if (error && !(error.code === '23505' && /contacts_pkey/.test(error.message))) throw new Error(error.message);
    pendingContactIds.delete(key);
    return error ? row : data;
  }

  // Settles every on-screen contact id into `row`, which is the insert or the
  // patch. Returns the names that could not be linked; each keeps the link the
  // trip already had.
  async function linkContacts(row, creating) {
    const failed = [];
    const val = id => (id && document.getElementById(id)?.value.trim()) || null;
    for (const s of CONTACT_SLOTS) {
      const box = document.getElementById(s.name);
      if (!box) continue;
      const p = { name: box.value.trim() || null, phone: val(s.phone), email: val(s.email), client: val(s.client) };
      const before = creating ? null : (editing.before[s.idKey] ?? null);
      let id = null;
      if (p.name) {
        try {
          const picked = box.dataset.contactId;
          const known = picked && (panelIndex.contacts || []).find(c => String(c.id) === picked);
          id = known ? (samePerson(known, p) ? known.id : (await matchOrAddContact(p)).id)
            : picked || (await matchOrAddContact(p)).id;
          box.dataset.contactId = id;
        } catch {
          failed.push(p.name);
          id = before;
        }
      }
      if (creating || !same(id, before)) row[s.idKey] = id; else delete row[s.idKey];
      /* The copy is written whole. A trip showing its linked contact has no copy
         yet, so a phone edited alone would save a phone with no name beside it,
         and the next open would show the linked contact's phone again. */
      if (s.idKey in row || Object.values(s.copy).some(k => k in row)) {
        for (const [field, key] of Object.entries(s.copy)) row[key] = p[field];
      }
    }
    return failed;
  }

  // A toggle's state lives on `aria-checked`, which is what Carbon's own
  // markup carries -- there is no `.checked` to read.
  const on = e => e?.getAttribute('aria-checked') === 'true';

  // Blank is null, not zero, so an empty price never reads as a free charter.
  // Text that is not a number is null too, never NaN.
  const money = v => {
    const t = String(v ?? '').replace(/[$,\s]/g, '');
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  };

  let editing = null;   // { id, before: {...} }

  function readForm() {
    const f = {};
    for (const id of ['destination', 'customer', 'type', 'sleeper', 'ada', '56pax', 'hotel', 'notes',
                      // Every id `EDITS` reads through `f` is listed, and only
                      // ids on the panel: a missing element returns null.
                      'start', 'end', 'rstart', 'rend',
                      'quoted',
                      'contract', 'contractnote', 'poreceived', 'invoice',
                      'color', 'notneeded']) {
      f[`scheduler-f-${id}`] = document.getElementById(`scheduler-f-${id}`);
    }
    if (Object.values(f).some(v => !v)) return null;
    const out = {};
    for (const e of EDITS) out[e.key] = e.get(f);
    return out;
  }

  // `trip_stops` stores HH:MM:SS; the control speaks HH:MM. Comparing the two
  // shapes would mark an untouched field dirty on every open, so both sides are
  // cut to HH:MM before anything is compared or sent.
  const hhmmOrNull = t => (t ? String(t).slice(0, 5) : null);

  /* mm/dd/yyyy for the dates this app renders itself; the picker's inputs stay
     ISO, the only shape `date-picker.js` parses. The string is split rather
     than passed to `new Date()`, which reads a bare date as UTC midnight and
     prints the day before anywhere west of Greenwich. */
  const mdy = d => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || '').trim());
    return m ? `${m[2]}/${m[3]}/${m[1]}` : (d || '');
  };

  // Whole dollars: trip amounts are round, so cents would be noise on every row.
  const usd = n => `$${Math.round(n).toLocaleString('en-US')}`;

  /* The six methods rux-ui offers, in its order. `trip_payments.method` is free
     text both apps write, so a spelling rux-ui's menu lacks would not
     round-trip. */
  const PAYMENT_METHODS = ['Cash', 'Check', 'Card', 'ACH', 'Zelle', 'Other'];

  /* Each method shows as a three-letter tag, standing in for icons the sprite
     does not have. The hues only tell methods apart: none ranks them, and none
     is red because none is an error.
     The code is never the only name: the row button carries the full method in
     its `aria-label` and the tag carries it in `title`. */
  const PAYMENT_TAG = {
    Cash:  { code: 'CSH', tone: 'rux--tag--green' },
    Check: { code: 'CHK', tone: 'rux--tag--blue' },
    Card:  { code: 'CRD', tone: 'rux--tag--purple' },
    ACH:   { code: 'ACH', tone: 'rux--tag--teal' },
    Zelle: { code: 'ZLE', tone: 'rux--tag--magenta' },
    Other: { code: 'OTH', tone: 'rux--tag--cool-gray' },
  };

  /* The panel's pending payments, and the handle that redraws them. Module
     scope because the dialog lives outside the panel's build closure and has
     to reach both. */
  let payPending = [];
  let redrawPayments = () => {};
  let payEditing = null;   // index being edited, or null for a new row

  /* POs and invoices are pending rows too, for the reason payments are: the
     list is a render of the array and the array is what Save reads.
     Each row keeps its `trip_pos` or `trip_invoices` id, so Save updates it
     rather than replacing it. Module scope because the dialogs live outside
     the panel's build closure. */
  let poPending = [];
  let invPending = [];
  let redrawPos = () => {};
  let redrawInvoices = () => {};
  let poEditing = null;
  let invEditing = null;

  /* The dialog builds its fields each time rather than reusing kept inputs:
     `dateOne` makes a date picker whose calendar the module claims, and
     claiming the same one twice leaves two calendars. */
  function openPaymentDialog(index) {
    const host = document.getElementById('scheduler-payment-fields');
    if (!host) return;
    payEditing = index;
    const p = index === null ? { date: iso(new Date()) } : payPending[index];
    document.getElementById('scheduler-payment-h').textContent =
      index === null ? 'Add payment' : 'Edit payment';
    // Two columns, and Date first: its calendar drops below its field, and from
    // the first row it has the dialog's height to open into.
    const grid = el('div', 'scheduler-dialog-grid');
    grid.append(
      dateOne('scheduler-f-pdate', 'Date', p.date),
      moneyField('scheduler-f-pamount', 'Amount', p.amount),
      selectField('scheduler-f-pmethod', 'Method', p.method ?? '',
        [['', '—'], ...PAYMENT_METHODS.map(m => [m, m])]),
      textField('scheduler-f-pref', 'Reference', p.ref),
    );
    host.replaceChildren(grid);
    window.Rux?.datePicker?.init?.(host);
    window.Rux?.modal?.open?.('scheduler-payment-modal');
  }

  document.getElementById('scheduler-payment-done')?.addEventListener('click', () => {
    const val = id => document.getElementById(id)?.value.trim() ?? '';
    const row = {
      method: val('scheduler-f-pmethod') || null,
      amount: money(val('scheduler-f-pamount')),
      date: isoOrNull(val('scheduler-f-pdate')),
      ref: val('scheduler-f-pref') || null,
    };
    // An empty dialog adds nothing, as `Cancel` would. An existing row emptied
    // this way is left alone; removing it is Remove on the row's own menu.
    if (row.amount === null && !row.method) {
      window.Rux?.modal?.close?.('scheduler-payment-modal');
      return;
    }
    if (payEditing === null) payPending.push(row);
    else Object.assign(payPending[payEditing], row);
    window.Rux?.modal?.close?.('scheduler-payment-modal');
    redrawPayments();
    refreshDirty();
  });

  /* The PO dialog: a date, a reference and an amount. Date leads for the
     reason it leads in the payment dialog: its calendar needs the room below
     it. The fields keep real labels, because a modal headed "Add purchase
     order" has the room. */
  function openPoDialog(index) {
    const host = document.getElementById('scheduler-po-fields');
    if (!host) return;
    poEditing = index;
    const p = index === null ? {} : poPending[index];
    document.getElementById('scheduler-po-h').textContent =
      index === null ? 'Add purchase order' : 'Edit purchase order';
    const grid = el('div', 'scheduler-dialog-grid');
    grid.append(
      dateOne('scheduler-f-odate', 'Date', p.date),
      textField('scheduler-f-oref', 'Reference', p.ref),
      moneyField('scheduler-f-oamount', 'Amount', p.amount),
    );
    host.replaceChildren(grid);
    window.Rux?.datePicker?.init?.(host);
    window.Rux?.modal?.open?.('scheduler-po-modal');
  }

  document.getElementById('scheduler-po-done')?.addEventListener('click', () => {
    const val = id => document.getElementById(id)?.value.trim() ?? '';
    const row = { ref: val('scheduler-f-oref') || null, amount: money(val('scheduler-f-oamount')),
                  date: isoOrNull(val('scheduler-f-odate')) };
    // An empty dialog adds nothing, as in the payment dialog: the switch alone
    // already says a PO is expected.
    if (row.ref === null && row.amount === null && row.date === null) {
      window.Rux?.modal?.close?.('scheduler-po-modal');
      return;
    }
    if (poEditing === null) poPending.push(row);
    else Object.assign(poPending[poEditing], row);
    window.Rux?.modal?.close?.('scheduler-po-modal');
    redrawPos();
    refreshDirty();
  });

  // The invoice dialog mirrors the PO's: a date, the invoice number and an amount.
  function openInvoiceDialog(index) {
    const host = document.getElementById('scheduler-inv-fields');
    if (!host) return;
    invEditing = index;
    const v = index === null ? {} : invPending[index];
    document.getElementById('scheduler-inv-h').textContent =
      index === null ? 'Add invoice' : 'Edit invoice';
    const grid = el('div', 'scheduler-dialog-grid');
    grid.append(
      dateOne('scheduler-f-idate', 'Date', v.date),
      textField('scheduler-f-inum', 'Invoice number', v.number),
      moneyField('scheduler-f-iamount', 'Amount', v.amount),
    );
    host.replaceChildren(grid);
    window.Rux?.datePicker?.init?.(host);
    window.Rux?.modal?.open?.('scheduler-inv-modal');
  }

  document.getElementById('scheduler-inv-done')?.addEventListener('click', () => {
    const val = id => document.getElementById(id)?.value.trim() ?? '';
    const row = { number: val('scheduler-f-inum') || null, amount: money(val('scheduler-f-iamount')),
                  date: isoOrNull(val('scheduler-f-idate')) };
    // An empty dialog adds nothing, the rule the other two dialogs follow.
    if (row.number === null && row.amount === null && row.date === null) {
      window.Rux?.modal?.close?.('scheduler-inv-modal');
      return;
    }
    if (invEditing === null) invPending.push(row);
    else Object.assign(invPending[invEditing], row);
    window.Rux?.modal?.close?.('scheduler-inv-modal');
    redrawInvoices();
    refreshDirty();
  });

  /* The rows Save writes for one list. Off means none. On means the pending
     rows in order, and at least one: a PO expected with nothing typed is one
     empty row, so `po_received` always agrees with whether rows exist, the
     rule rux-ui follows too. */
  function listRowsToSave(kind) {
    const po = kind === 'po';
    if (!on(document.getElementById(po ? 'scheduler-f-poreceived' : 'scheduler-f-invoice'))) return [];
    const refKey = po ? 'ref' : 'number';
    const rows = (po ? poPending : invPending).map((p, position) => ({
      id: p.id ?? null, position, [refKey]: p[refKey] ?? null,
      amount: money(String(p.amount ?? '')), date: p.date ?? null,
    }));
    return rows.length ? rows : [{ id: null, position: 0, [refKey]: null, amount: null, date: null }];
  }

  // The sum of the rows' amounts, or null when no row has one.
  function sumOrNull(rows) {
    const amounts = rows.map(r => r.amount).filter(a => a !== null && a !== undefined && a !== '');
    return amounts.length
      ? money(String(Math.round(amounts.reduce((n, a) => n + Number(a), 0) * 100) / 100))
      : null;
  }

  /* A PO or invoice list as writes, by id like `paymentsPatch`: new rows
     insert, changed rows update, removed rows delete. `was` is the list as the
     trip opened, so a row saved in rux-ui after that is neither updated nor
     deleted here. A trip opened without its rows writes none. */
  function listPatch(kind) {
    if (!editing || editing.listsLoaded === false) return null;
    const po = kind === 'po';
    const was = (po ? editing.pos : editing.invoices) || [];
    const keys = [po ? 'ref' : 'number', 'amount', 'date', 'position'];
    const seen = new Set();
    const inserts = [];
    const updates = [];
    listRowsToSave(kind).forEach(({ id, ...row }) => {
      const before = id ? was.find(w => String(w.id) === String(id)) : null;
      if (!before) { inserts.push(row); return; }
      seen.add(String(id));
      const moved = keys.some(k => !same(row[k],
        k === 'amount' ? money(String(before.amount ?? '')) : (before[k] ?? null)));
      if (moved) updates.push({ id: String(id), patch: row });
    });
    const deletes = was.filter(w => !seen.has(String(w.id))).map(w => String(w.id));
    return { inserts, updates, deletes, work: !!(inserts.length || updates.length || deletes.length) };
  }
  const posPatch = () => listPatch('po');
  const invoicesPatch = () => listPatch('invoice');

  /* The payment rows as writes, by id: new rows insert, changed rows update,
     removed rows delete. On a new trip every row is an insert, and Save
     supplies the trip id, which exists only once the trip insert returns. */
  function paymentsPatch() {
    if (!editing) return null;
    const was = editing.payments || [];
    const seen = new Set();
    const inserts = [];
    const updates = [];
    payPending.forEach((p, i) => {
      const row = { method: p.method ?? null, amount: money(String(p.amount ?? '')),
                    date: p.date ?? null, ref: p.ref ?? null, position: i };
      if (!p.id) { inserts.push(row); return; }
      seen.add(String(p.id));
      const before = was.find(w => String(w.id) === String(p.id));
      const changed = !before || ['method', 'amount', 'date', 'ref', 'position'].some(k => {
        const b = k === 'amount' ? money(String(before.amount ?? '')) : (before[k] ?? null);
        return !same(row[k], k === 'position' ? (before.position ?? null) : b);
      });
      if (changed) updates.push({ id: String(p.id), patch: row });
    });
    const deletes = was.filter(w => !seen.has(String(w.id))).map(w => String(w.id));
    const paid = payPending.reduce((n, p) => n + (Number(p.amount) || 0), 0);
    return { inserts, updates, deletes, paid,
             work: !!(inserts.length || updates.length || deletes.length) };
  }



  /* What the Route tab writes to `trip_stops` on an existing trip: one
     update per changed row, or [] when nothing moved. A leg with no pickup or
     return stop gets no new row, because where it belongs among the stops is
     the itinerary editor's business; those controls render disabled. */
  function stopsPatch() {
    if (!editing?.stops) return [];
    const val = id => document.getElementById(id)?.value.trim() ?? '';
    const out = [];
    const p = editing.stops.pickup;
    if (p) {
      const patch = {};
      const where = val('scheduler-f-pickup') || null;
      const depart = val('scheduler-f-depart') || null;
      const spot = val('scheduler-f-spot') || null;
      // The two name parts are shown joined and are edited as one string, so
      // the whole of it goes back to `name` and `address` is left alone rather
      // than guessed at from a separator the person may have typed themselves.
      if (!same(where, p.where)) patch.name = where;
      if (!same(depart, p.depart_prev)) patch.depart_prev = depart;
      if (!same(spot, p.spot)) patch.spot = spot;
      if (Object.keys(patch).length) out.push({ id: p.id, patch });
    }
    const b = editing.stops.back;
    if (b) {
      const arrive = val('scheduler-f-return') || null;
      if (!same(arrive, b.arrive)) out.push({ id: b.id, patch: { arrive } });
    }
    return out;
  }

  const same = (a, b) => (a ?? null) === (b ?? null);

  function patchOf() {
    if (!editing) return null;
    const now = readForm();
    if (!now) return null;
    const patch = {};
    for (const e of EDITS) if (!same(now[e.key], editing.before[e.key])) patch[e.key] = now[e.key];
    return patch;
  }

  // Whether the form differs from the trip it opened on, in any part Save writes.
  function changed() {
    if (!editing) return false;
    const patch = patchOf();
    return stopsPatch().length > 0 || !!paymentsPatch()?.work
      || !!posPatch()?.work || !!invoicesPatch()?.work
      || (!!patch && Object.keys(patch).length > 0);
  }

  // Unsaved work is a change in an editor that is open.
  function unsavedWork() { return !panelEl.hidden && changed(); }

  /* The title names the trip being edited, from the destination as typed, since
     the selected bar can be a different trip: a pencil and the destination on
     one line, the whole name on hover, and "Edit trip" for a screen reader in
     place of the pencil. A new trip is titled in words. */
  function setTitle() {
    if (!editing) return;
    const dest = document.getElementById('scheduler-f-destination')?.value.trim();
    for (const [h, size] of [[panelTitle, '16'], [panelTitleCollapsed, '16']]) {
      if (editing.creating) { h.textContent = 'New trip'; h.removeAttribute('title'); continue; }
      const icon = svgUse('#i-edit', size, '0 0 32 32');
      icon.setAttribute('class', 'scheduler-panel-title__icon');
      h.replaceChildren(icon, el('span', 'rux--visually-hidden', 'Edit trip: '), document.createTextNode(dest || 'No destination'));
      if (dest) h.title = dest; else h.removeAttribute('title');
    }
  }

  function refreshDirty() {
    const startEl = document.getElementById('scheduler-f-start');
    const destEl = document.getElementById('scheduler-f-destination');
    const startOk = !!isoOrNull(startEl?.value);
    // Save needs a start date, without which `legsOf` draws no leg, and a
    // destination, which is the bar's only label.
    const destOk = !!destEl?.value.trim();
    destEl?.setAttribute('aria-invalid', String(!destOk));
    // `aria-invalid` alone marks the date, since Carbon has no invalid class for
    // the date picker; the disabled Save says the rest.
    startEl?.setAttribute('aria-invalid', String(!startOk));
    /* A new trip is saveable untouched, because its defaults are already a real
       trip. `changed` compares against `editing.before`, which a new trip fills
       from its draft, so an untouched panel is unchanged either way. */
    const nothingChanged = !changed();
    const nothingToDo = !editing?.creating && nothingChanged;
    panelSave.disabled = !startOk || !destOk || nothingToDo;
    setTitle();
    /* Reset follows `nothingChanged`, not `nothingToDo`, which is always false
       while creating. It ignores the required fields: an invalid form is when
       someone most wants to back out. */
    if (panelReset) panelReset.disabled = nothingChanged;
  }

  /* New trip opens the same panel on a draft: a round trip, unconfirmed, on the
     day of the cell it came from or the first day of the week shown. With no
     bus it lands in the Unassigned row, so creation needs no bus and no drivers. */
  // The bus a new trip will be put on, when creation started from a cell.
  // Null means the trip is created with no assignment and lands in Unassigned.
  let createBusId = null;

  function openCreate(opts = {}) {
    const start = opts.startDate || iso(shown && cursor ? cursor : mondayOf(new Date()));
    createBusId = opts.busId || null;
    openPanel(null, {
      id: null,
      // Null, not '': every getter reads a blank field as null and `same` does
      // not treat '' as null, so '' would count an untouched field as changed.
      destination: null, customer: null,
      trip_type: 'round_trip', confirmed: false,
      start_date: start, end_date: start,
      return_start_date: null, return_end_date: null,
      req_sleeper: false, req_ada: false, req_56pax: false, need_hotel: false,
      notes: null, trip_assignments: [], trip_stops: [],
      // The id the trip is inserted with, fixed for the panel's life, so a
      // second press of Save cannot make a second trip.
      newId: crypto.randomUUID(),
    });
  }

  /* What built the panel, so Reset can build it again and a render can find
     the trip's bar. `ref` names the bar by its values, and `trip` is the saved
     row the editor opened on, kept because the week on screen may no longer
     hold it. Replaying `openPanel` with these is the reset; in create mode the
     replay hands back the untouched draft. */
  let panelArgs = null;

  // `bar` opens a trip from the board; `again` replays an earlier `panelArgs`.
  function openPanel(bar, draft, again) {
    const creating = !!draft;
    const ref = creating ? null : (again?.ref ?? (bar ? barRef(bar) : null));
    const trip = draft ?? again?.trip ?? (ref ? panelIndex.trips.get(ref.tripId) : null);
    if (!trip) return;
    panelArgs = { ref, draft, trip: creating ? null : trip };
    const legName = ref?.leg || 'outbound';
    const leg = legsOf(trip).find(l => l.leg === legName) ?? legsOf(trip)[0];
    const bus = ref ? panelIndex.buses.get(ref.busId) : null;
    const assign = ref ? (trip.trip_assignments || []).find(a => a.id === ref.assignmentId) : null;

    // A plain heading until `refreshDirty` calls `setTitle`, which names the trip.
    const heading = creating ? 'New trip' : 'Edit trip';
    panelTitle.textContent = heading;
    panelTitleCollapsed.textContent = heading;

    const legDays = leg ? daysBetween(parseISO(leg.from), parseISO(leg.to)) + 1 : 0;
    const when = !leg ? '' : leg.from === leg.to
      ? parseISO(leg.from).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
      : `${parseISO(leg.from).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} to ${parseISO(leg.to).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} (${legDays} days)`;

    const names = assign
      ? (assign.trip_drivers || []).map(d => {
          const who = panelIndex.driversById.get(d.driver_id);
          const name = who ? (who.name || who.short_name) : null;
          return name ? (d.role && d.role !== 'driver' ? `${name} (${d.role})` : name) : null;
        }).filter(Boolean)
      : [];

    const reqs = [
      trip.req_sleeper ? 'Sleeper' : null,
      trip.req_ada ? 'ADA lift' : null,
      trip.req_56pax ? '56 pax' : null,
    ].filter(Boolean).join(', ');

    editing = { id: trip.id, creating, updatedAt: trip.updated_at ?? null, before: {
      destination: trip.destination ?? null,
      customer: trip.customer ?? null,
      trip_type: trip.trip_type ?? null,
      // The name it paints as, so a trip still storing `cyan` opens on Teal
      // with nothing changed, and saves nothing until another colour is picked.
      trip_bar_color: tripColorOf(trip),
      req_sleeper: !!trip.req_sleeper,
      req_ada: !!trip.req_ada,
      req_56pax: !!trip.req_56pax,
      need_hotel: !!trip.need_hotel,
      hotel_booked_outbound: !!trip.hotel_booked_outbound,
      hotel_booked_return: !!trip.hotel_booked_return,
      hotel_itinerary_number_outbound: trip.hotel_itinerary_number_outbound ?? null,
      hotel_itinerary_number_return: trip.hotel_itinerary_number_return ?? null,
      notes: trip.notes ?? null,
      start_date: trip.start_date ?? null,
      end_date: trip.end_date ?? trip.start_date ?? null,
      return_start_date: trip.return_start_date ?? null,
      return_end_date: trip.return_end_date ?? trip.return_start_date ?? null,
      quoted_price: trip.quoted_price ?? null,
      deposit_amount: trip.deposit_amount ?? null,
      po_ref: trip.po_ref ?? null,
      po_amount: trip.po_amount ?? null,
      invoice_number: trip.invoice_number ?? null,
      // A null status reads as Pending.
      contract_status: trip.contract_status === 'Signed' ? 'Signed' : 'Pending',
      invoice_status: trip.invoice_status === 'Invoiced' ? 'Invoiced' : 'Pending',
      contract_note: trip.contract_note ?? null,
      // Booleans take `!!`, not `?? null`, because `same(false, null)` is a change.
      po_received: !!trip.po_received,
      invoiced: !!trip.invoiced,
      itinerary_not_needed: !!trip.itinerary_not_needed,
      booking_contact_id: trip.booking_contact_id ?? null,
      trip_contact_1_id: trip.trip_contact_1_id ?? null,
      trip_contact_2_id: trip.trip_contact_2_id ?? null,
      trip_contact_3_id: trip.trip_contact_3_id ?? null,
      trip_contact_4_id: trip.trip_contact_4_id ?? null,
      trip_contact_5_id: trip.trip_contact_5_id ?? null,
      ...contactColumnsOf(trip),
    } };

    // A new trip's id comes with its draft, so Reset keeps it too.
    editing.newId = creating ? draft.newId : null;

    // The payment rows as the trip opened, for `paymentsPatch` to diff against.
    editing.payments = creating ? [] : ((trip.trip_payments || [])
      .slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0)));

    /* The PO and invoice rows as the trip opened, for `listPatch` to diff against.
       A trip object that never came through the embedded select has neither
       list, cannot be diffed, and so Save leaves its rows alone. */
    editing.listsLoaded = creating || (Array.isArray(trip.trip_pos) && Array.isArray(trip.trip_invoices));
    const byPosition = rows => (rows || []).slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    editing.pos = creating ? [] : byPosition(trip.trip_pos);
    editing.invoices = creating ? [] : byPosition(trip.trip_invoices);

    // The stops' before is kept apart from `editing.before`: they are
    // `trip_stops` rows, not `trips` columns, so they diff and write separately.
    editing.stops = creating ? null : (() => {
      const { pickup, back } = stopsOfLeg(trip, legName);
      return {
        pickup: pickup ? { id: pickup.id,
          where: [pickup.name, pickup.address].filter(Boolean).join(' — ') || null,
          depart_prev: hhmmOrNull(pickup.depart_prev), spot: hhmmOrNull(pickup.spot) } : null,
        back: back ? { id: back.id, arrive: hhmmOrNull(back.arrive) } : null,
      };
    })();

    panelDetails.replaceChildren();
    /* The dates lead the tab, because a trip is found by when it runs. Type,
       further down, decides their shape: a drop-off and pick-up trip has two
       date ranges, every other type one. The return pair
       is a second outing, since the bus is free between drop-off and pick-up,
       so `legsOf` draws it as a second bar; it shows only for a split. */
    const returnDates = el('div', 'scheduler-panel-return-dates');
    returnDates.appendChild(dateRange(
      'scheduler-f-rstart', 'scheduler-f-rend', 'Pick-up start', 'Pick-up end',
      trip.return_start_date, trip.return_end_date || trip.return_start_date));
    returnDates.hidden = trip.trip_type !== SPLIT;

    /* The ranges name their own legs. The outbound range shows for every type,
       so it reads Drop-off only while a split is selected; the return pair
       shows only for a split and keeps its Pick-up labels. The words match the
       type's option text. */
    const outLabels = split =>
      split ? ['Drop-off start', 'Drop-off end'] : ['Start date', 'End date'];
    const setOutLabels = split => {
      const [a, b] = outLabels(split);
      const la = panelDetails.querySelector('label[for="scheduler-f-start"]');
      const lb = panelDetails.querySelector('label[for="scheduler-f-end"]');
      if (la) la.textContent = a;
      if (lb) lb.textContent = b;
    };
    const [outFrom, outTo] = outLabels(trip.trip_type === SPLIT);

    /* Needs is a row of Carbon's selectable tags under a field label, one row
       that wraps if the labels outgrow the panel. Sleeper, ADA lift and 56 pax
       are asked of the bus; Hotel is a reminder that one has to be booked. */
    const flags = el('div', 'scheduler-needs');
    const needsLabel = el('div', 'rux--label', 'Needs');
    needsLabel.id = 'scheduler-f-needs-label';
    const needsRow = el('div', 'scheduler-needs__tags');
    needsRow.setAttribute('role', 'group');
    needsRow.setAttribute('aria-labelledby', needsLabel.id);
    needsRow.append(
      tagField('scheduler-f-sleeper', 'Sleeper', trip.req_sleeper),
      tagField('scheduler-f-ada', 'ADA lift', trip.req_ada),
      tagField('scheduler-f-56pax', '56 pax', trip.req_56pax),
      tagField('scheduler-f-hotel', 'Hotel', trip.need_hotel),
    );
    flags.append(needsLabel, needsRow);

    /* While Hotel is ticked, each leg the trip has shows its hotel's
       confirmation number beside a Booked box, the leg's
       `hotel_itinerary_number_` and `hotel_booked_` columns rux-ui writes too;
       a drop-off and pick-up trip has two. Unticking hides them and clears
       nothing, so a slip loses no confirmation number. */
    const hotelLeg = (legKey, label) => {
      const row = pair(
        textField(`scheduler-f-hotelref-${legKey}`, label, trip[`hotel_itinerary_number_${legKey}`]),
        checkField(`scheduler-f-hotelbooked-${legKey}`, 'Booked', trip[`hotel_booked_${legKey}`]),
      );
      row.classList.add('scheduler-pair--end');
      return row;
    };
    const hotelOut = hotelLeg('outbound', 'Hotel confirmation');
    const hotelBack = hotelLeg('return', 'Pick-up hotel confirmation');
    const hotelBox = el('div', 'rux--stack-vertical rux--stack-scale-6 scheduler-hotel');
    hotelBox.append(hotelOut, hotelBack);
    // A split trip's first hotel is the drop-off's, and its second row shows.
    const setHotelLegs = split => {
      hotelBack.hidden = !split;
      hotelOut.querySelector('.rux--label').textContent = split ? 'Drop-off hotel confirmation' : 'Hotel confirmation';
    };
    setHotelLegs(trip.trip_type === SPLIT);
    hotelBox.hidden = !trip.need_hotel;
    flags.querySelector('#scheduler-f-hotel').addEventListener('input', e => { hotelBox.hidden = !pressed(e.target); });

    /* The trip's own fields are one stack, 24px apart. Type and Trip bar color
       each take a row, because half the panel cuts off "Drop-off and pick-up"
       and "Standard"; the bar color is a property of the trip, not a section
       of its own. */
    const topFields = el('div', 'rux--stack-vertical rux--stack-scale-6');
    topFields.append(
      dateRange('scheduler-f-start', 'scheduler-f-end', outFrom, outTo, trip.start_date, trip.end_date || trip.start_date),
      returnDates,
      textField('scheduler-f-destination', 'Destination', trip.destination),
      // The organization is `trips.customer`; the contact's own `client` is not shown.
      textField('scheduler-f-customer', 'Organization', trip.customer),
      full(selectField('scheduler-f-type', 'Type', trip.trip_type, [
        ['', '—'],
        ['round_trip', 'Round trip'],
        ['one_way', 'One way'],
        [SPLIT, 'Drop-off and pick-up'],
      ])),
      full(colorField('scheduler-f-color', trip)),
      notesField('scheduler-f-notes', 'Notes', trip.notes),
      flags,
      hotelBox,
    );
    panelDetails.appendChild(section('Trip', topFields));

    /* ── Booking contact ──
       The search suggests and does not lock: picking a contact fills its phone
       and email and suggests its organization, and every field stays editable,
       because an agency can book for a school. */
    const contact = creating ? null : tripContact(trip, 0);
    const allContacts = panelIndex.contacts || [];
    {
      /* The contacts render on a new trip too, since a booking contact is often
         the first thing known. A field's label is its own word alone, because
         the group's heading says whose it is; the copy button still names the
         contact in full. */
      // Each field takes a row: beside its copy button, half the panel leaves a
      // name or a phone number about 80px, too little to read.
      panelDetails.appendChild(fieldGroup('Booking contact',
        full(withCopy(contactSearch('scheduler-f-cfind', 'Name', allContacts, contact),
          'scheduler-f-cfind', 'Booking contact name')),
        withCopy(textField('scheduler-f-cphone', 'Phone', contact?.phone),
          'scheduler-f-cphone', 'Booking contact phone'),
        withCopy(textField('scheduler-f-cemail', 'Email', contact?.email),
          'scheduler-f-cemail', 'Booking contact email'),
      ));
      // Phone and email are this trip's copy; editing them never changes the
      // shared contact record. `linkContacts` keeps the link.

      /* ── Day-of-trip contacts ──
         "Day-of-trip", not "on-site": the person may travel with the group or
         coordinate from a desk. The trip's own contacts are drawn, or one empty
         contact when it has none, and the section's menu adds one up to the
         schema's five or removes the last. */
      const dayRows = creating ? [] : [1, 2, 3, 4, 5].map(i => tripContact(trip, i)).filter(Boolean);
      /* A stack, 32px between contacts, a step over the 24px between one
         contact's own fields, so each name reads with the phone under it. */
      const rowsHost = el('div', 'rux--stack-vertical rux--stack-scale-7');

      // What the drawn contacts hold, in `tripContact`'s shape.
      const readContacts = () => [...rowsHost.children].map((_, i) => {
        const box = document.getElementById(`scheduler-f-d${i + 1}`);
        const name = box?.value.trim() || '';
        return { id: name ? (box.dataset.contactId || null) : null, name,
                 phone: document.getElementById(`scheduler-f-dphone${i + 1}`)?.value.trim() || null };
      });

      /* Each contact is a stack, Name over Phone, as a group named
         Contact 1 to 5, which a screen reader says before its labels, so the
         tab needs no heading between the section title and the fields. Adding
         and removing are on the overflow menu at the end of the section's title
         line, out of the rows: Add contact, up to five, and Remove last
         contact, down to one; a contact in the middle is emptied by clearing
         its fields. The fields keep positional ids, `scheduler-f-d2` for the
         second contact, which `EDITS` and `linkContacts` read, so a redraw
         fills them from what they held. */
      const drawContacts = list => {
        rowsHost.replaceChildren();
        list.forEach((c, i) => {
          const n = i + 1;
          const row = el('div', 'rux--stack-vertical rux--stack-scale-6');
          row.append(
            full(withCopy(contactSearch(`scheduler-f-d${n}`, 'Name', allContacts, c?.name ? c : null),
              `scheduler-f-d${n}`, `Contact ${n} name`)),
            withCopy(textField(`scheduler-f-dphone${n}`, 'Phone', c?.phone),
              `scheduler-f-dphone${n}`, `Contact ${n} phone`),
          );
          row.setAttribute('role', 'group');
          row.setAttribute('aria-label', `Contact ${n}`);
          rowsHost.appendChild(row);
        });
      };
      drawContacts(dayRows.length ? dayRows : [null]);

      const menuBtn = el('button', 'rux--btn rux--btn--ghost rux--btn--icon-only rux--layout--size-sm rux--menu-button__trigger');
      menuBtn.type = 'button';
      menuBtn.id = 'scheduler-f-dmenu';
      menuBtn.setAttribute('aria-haspopup', 'true');
      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.setAttribute('aria-label', 'Day-of contact actions');
      menuBtn.title = 'Day-of contact actions';
      menuBtn.appendChild(svgUse('#i-overflow-menu--vertical', '16', '0 0 32 32'));
      menuBtn.lastChild.setAttribute('class', 'rux--btn__icon');
      menuBtn.addEventListener('click', () => {
        const count = readContacts().length;
        openRowMenu(menuBtn, {
          editText: 'Add contact', editDisabled: count >= 5,
          edit: () => {
            const kept = readContacts();
            if (kept.length >= 5) return;
            drawContacts([...kept, null]);
            syncCopy();
            document.getElementById(`scheduler-f-d${kept.length + 1}`)?.focus();
          },
          removeText: 'Remove last contact', removeDisabled: count <= 1,
          remove: () => {
            const kept = readContacts();
            if (kept.length <= 1) return;
            drawContacts(kept.slice(0, -1));
            syncCopy();
            refreshDirty();
            menuBtn.focus();
          },
        });
      });

      /* The section is a group named by its title, not a fieldset, because the
         title line also holds the menu, and a legend must be the fieldset's
         first child and nothing beside it. */
      const days = el('div', 'scheduler-panel-section');
      const dayTitle = el('div', 'scheduler-panel-section__title', 'Day-of contacts');
      dayTitle.id = 'scheduler-f-dgroup';
      const dayHead = el('div', 'scheduler-group__head');
      dayHead.append(dayTitle, menuBtn);
      const dayGroup = el('div');
      dayGroup.setAttribute('role', 'group');
      dayGroup.setAttribute('aria-labelledby', dayTitle.id);
      dayGroup.append(dayHead, rowsHost);
      days.appendChild(dayGroup);
      panelDetails.appendChild(days);
    }

    // Cancel is static markup in the action bar. A trip not yet saved has
    // nothing to cancel, and Close already discards a draft.
    panelCancel.hidden = creating || !trip.id;

    /* ── Route ──
       These controls write the leg's `trip_stops` rows, which is where
       `timesOf` reads the board's times, falling back to a trip column only for
       departure. They are leg-scoped: the panel opens from one bar, and
       `stopsOfLeg` picks the same pickup and return rows `timesOf` places that
       bar by. */
    panelRoute.replaceChildren();
    {
      /* On a new trip there are no stops yet, and Save inserts the first ones on
         the outbound leg, where nothing else can come before them. On an
         existing leg a missing stop is not invented. */
      const { pickup, back } = creating ? { pickup: null, back: null } : stopsOfLeg(trip, legName);
      const sched = el('div', 'rux--stack-vertical rux--stack-scale-6');
      const times = el('div', 'scheduler-times');
      times.append(
        timeField('scheduler-f-depart', 'Yard depart', pickup?.depart_prev),
        timeField('scheduler-f-spot', 'Spot', pickup?.spot),
        timeField('scheduler-f-return', 'Return', back?.arrive),
      );
      sched.append(
        textField('scheduler-f-pickup', 'Pickup location',
          [pickup?.name, pickup?.address].filter(Boolean).join(' — ')),
        times,
      );
      /* A control with no stop row behind it is disabled, not merely empty:
         `stopsPatch` creates no rows, so an enabled input there could not save. */
      for (const [id, row] of [['scheduler-f-pickup', pickup], ['scheduler-f-depart', pickup],
                               ['scheduler-f-spot', pickup], ['scheduler-f-return', back]]) {
        // On create there is no row yet, which is not the same as a leg that
        // has none: the save makes them. Only an existing leg disables.
        if (row || creating) continue;
        const input = sched.querySelector(`#${id}`);
        if (input) { input.disabled = true; input.title = 'This leg has no stop to hold it yet.'; }
      }
      // The tab is the heading. A return leg gets its own, to say which of a
      // split trip's two outings these times belong to.
      panelRoute.appendChild(
        legName === 'return' ? section('Return leg', sched) : sched);
    }

    /* ── Billing ── */
    panelBilling.replaceChildren();
    {
      // Billing renders on a new trip too, because `readForm` needs its ids on
      // the panel.
      /* Three milestones, each a switch on its section's heading line. Off hides
         and clears what the switch owns, so nothing hidden holds a value Save
         would write. The box carries `scheduler-milestone-fields` because
         `rux--stack-vertical` is `display: grid`, which overrides the bare
         `[hidden]` attribute. */
      const gate = (fields, help) => {
        const box = el('div', 'rux--stack-vertical rux--stack-scale-6 scheduler-milestone-fields');
        box.append(...fields);
        if (help) box.appendChild(help);
        return box;
      };

      const contract = gate(
        [textField('scheduler-f-contractnote', 'Contract note', trip.contract_note, 'Note')]);
      const contractSwitch = toggleAction('scheduler-f-contract', 'Contract signed',
        trip.contract_status === 'Signed');

      /* The PO coverage line. A PO confirms the trip whatever its amount
         (rux-ui's `isStatusConfirmed`), so the line only says what the POs and
         payments leave uncovered, counted as `deriveStatus` counts it:

             shortfall = max(0, (quoted - paid) - po_amount) */
      const poCoverage = el('p', 'rux--form__helper-text scheduler-po-coverage');
      const poSwitch = toggleAction('scheduler-f-poreceived', 'PO received',
        !!trip.po_received);
      const invoiceSwitch = toggleAction('scheduler-f-invoice', 'Invoice sent',
        trip.invoice_status === 'Invoiced');

      /* PO and invoice are lists, one row per record with no limit, built from
         the same `rowList` as Payments. Off hides and clears the rows, as it
         does fields (`syncLists`). */
      const poList = rowList();
      const invList = rowList();

      const redrawLists = () => { drawPos(); drawInvoices(); };

      /* The rows are the tables' own, with their ids. A trip object that
         never carried them shows its single columns as one unsaved row, and
         Save leaves its tables alone (`editing.listsLoaded`). */
      const fromTables = editing.listsLoaded && !editing.creating;
      poPending = fromTables
        ? editing.pos.map(p => ({ id: String(p.id), ref: p.ref ?? null, amount: p.amount ?? null, date: p.date ?? null }))
        : ((trip.po_ref || (trip.po_amount ?? null) !== null)
          ? [{ ref: trip.po_ref ?? null, amount: trip.po_amount ?? null, date: null }] : []);
      invPending = fromTables
        ? editing.invoices.map(v => ({ id: String(v.id), number: v.number ?? null, amount: v.amount ?? null, date: v.date ?? null }))
        : (trip.invoice_number ? [{ number: trip.invoice_number, amount: null, date: null }] : []);

      const drawPos = () => {
        poList.body.replaceChildren();

        poPending.forEach((p, i) => {
          const much = (p.amount ?? null) === null ? '' : usd(Number(p.amount) || 0);
          const ref = p.ref || 'No reference';
          poList.body.appendChild(listRow({
            when: p.date ? `${ref} · ${mdy(p.date)}` : ref, much,
            title: ['Purchase order', ref, p.date ? mdy(p.date) : null, much || 'No amount'].filter(Boolean).join(' · '),
            edit: () => openPoDialog(i),
            removeLabel: `Remove purchase order ${ref}`,
            remove: () => { poPending.splice(i, 1); drawPos(); refreshDirty(); },
          }));
        });
        // The add row is also the empty state.
        poList.body.appendChild(listAddRow({
          label: 'Add purchase order', id: 'scheduler-f-poadd',
          onClick: () => openPoDialog(null),
        }).li);
        drawSummary();
      };

      const drawInvoices = () => {
        invList.body.replaceChildren();

        invPending.forEach((v, i) => {
          const num = v.number || 'No number';
          const much = (v.amount ?? null) === null ? '' : usd(Number(v.amount) || 0);
          invList.body.appendChild(listRow({
            when: v.date ? `${num} · ${mdy(v.date)}` : num, much,
            title: ['Invoice', num, v.date ? mdy(v.date) : null, much || 'No amount'].filter(Boolean).join(' · '),
            edit: () => openInvoiceDialog(i),
            removeLabel: `Remove invoice ${num}`,
            remove: () => { invPending.splice(i, 1); drawInvoices(); refreshDirty(); },
          }));
        });
        invList.body.appendChild(listAddRow({
          label: 'Add invoice', id: 'scheduler-f-invadd',
          onClick: () => openInvoiceDialog(null),
        }).li);
      };
      redrawPos = drawPos;
      redrawInvoices = drawInvoices;

      /* Payments are saved by `id`, not replaced: new rows insert, changed rows
         update, removed rows delete, so a failure touches only its own row.
         `position` is the row's place in the list, since rux-ui orders by it.
         The list is a render of `pending`, which is the array Save diffs. */
      const pending = (trip.trip_payments || [])
        .slice().sort((x, y) => (x.position ?? 0) - (y.position ?? 0))
        .map(p => ({ id: String(p.id), method: p.method ?? null, amount: p.amount,
                     date: p.date ?? null, ref: p.ref ?? null }));
      payPending = pending;

      /* The summary is a render, not a stored value: `drawSummary` reads the
         pending rows and the quoted-price input rather than `trip`, so its
         figures and the lists below always agree. */
      const bigNumber = (label, value, total) => {
        const fig = el('figure', 'rux--big-number');
        const top = el('span', 'rux--big-number__row');
        top.appendChild(el('figcaption', 'rux--big-number__label', label));
        const bottom = el('span', 'rux--big-number__row');
        bottom.setAttribute('role', 'math');
        bottom.appendChild(el('span', 'rux--big-number__value', value));
        if (total) bottom.appendChild(el('span', 'rux--big-number__total', total));
        fig.append(top, bottom);
        return fig;
      };
      const quotedNow = () => {
        const raw = document.getElementById('scheduler-f-quoted')?.value;
        return raw === undefined || raw === null ? null : money(String(raw));
      };
      /* The billing status ladder, mirrored from `deriveStatus` in rux-ui's
         `js/core/billing-config.js`; first match wins:

           overpaid          price > 0 && balance < 0
           paid_full         price > 0 && paid > 0 && balance <= 0
           po_partial        poReceived && price > 0 && poAmount < remaining
           po_received       poReceived
           deposit_received  paid > 0 && (balance > 0 || price <= 0)
           contract_signed   contractSigned
           pending           -- everything else

         The invoice switch moves neither the status nor confirmation. The
         result is a prediction and writes nothing: rux-ui owns `confirmed`, and
         `CONFIRM_WHEN` copies the `billing-workflow-v1` settings row rather than
         fetching it. */
      /* The tone shows how far along, not which rung: the three rungs that mean
         someone has committed share blue, purple wants a second look, green is
         done, magenta is overpaid and cool gray is nothing yet. A partial PO
         still confirms the trip, so it is not red. */
      const STATUS_LABEL = {
        overpaid: ['Overpaid', 'rux--tag--magenta'],
        paid_full: ['Paid in full', 'rux--tag--green'],
        po_partial: ['Partial PO', 'rux--tag--purple'],
        po_received: ['PO received', 'rux--tag--blue'],
        deposit_received: ['Deposit received', 'rux--tag--blue'],
        contract_signed: ['Contract signed', 'rux--tag--blue'],
        pending: ['Pending', 'rux--tag--cool-gray'],
      };
      // Overpaid confirms too. `po_partial` is remapped to `po_received` below
      // rather than listed, because it is the same rung with a gap.
      const CONFIRM_WHEN = ['contract_signed', 'po_received', 'deposit_received',
                            'paid_full', 'overpaid'];
      // What to say once it is confirmed, per rung. `po_partial` is remapped
      // to `po_received` before this is read.
      const CONFIRM_BY = {
        contract_signed: 'Confirmed by the signed contract.',
        po_received: 'Confirmed by the purchase order.',
        deposit_received: 'Confirmed by the deposit.',
        paid_full: 'Confirmed — paid in full.',
        overpaid: 'Confirmed — paid above the quote.',
      };
      const deriveStatus = ({ contractSigned, poReceived, poAmount, price, paid }) => {
        const balance = price - paid;
        const remaining = Math.max(0, balance);
        if (price > 0 && balance < 0) return 'overpaid';
        if (price > 0 && paid > 0 && balance <= 0) return 'paid_full';
        if (poReceived && price > 0 && poAmount < remaining) return 'po_partial';
        if (poReceived) return 'po_received';
        if (paid > 0 && (balance > 0 || price <= 0)) return 'deposit_received';
        if (contractSigned) return 'contract_signed';
        return 'pending';
      };

      const figures = el('div', 'scheduler-billing-figures');
      const derived = el('div');
      const confirmWhy = el('p', 'rux--form__helper-text');
      const drawSummary = () => {
        const quoted = quotedNow();
        const paid = pending.reduce((n, p) => n + (Number(p.amount) || 0), 0);
        const price = quoted ?? 0;
        const poOn = on(document.getElementById('scheduler-f-poreceived'));
        // The PO amount is the sum of the PO rows, so coverage counts every PO.
        const poAmount = poPending.reduce((n, p) => n + (Number(p.amount) || 0), 0);
        const remaining = Math.max(0, price - paid);
        const shortfall = Math.max(0, remaining - poAmount);
        const rung = deriveStatus({
          contractSigned: on(document.getElementById('scheduler-f-contract')),
          poReceived: poOn, poAmount, price, paid,
        });

        // The coverage line gives the amount, which is what the next PO or
        // payment has to close.
        poCoverage.textContent = !poOn ? ''
          : price <= 0 ? 'No quoted price to cover'
          : shortfall <= 0 ? 'Covers the balance'
          : `${usd(shortfall)} uncovered. Add a PO or payment.`;

        const [rungLabel, rungTone] = STATUS_LABEL[rung];
        const confirmRung = rung === 'po_partial' ? 'po_received' : rung;
        const confirmed = CONFIRM_WHEN.includes(confirmRung);

        // The headline is the trip's confirmation, which is never empty; Balance
        // and Paid sit below it.
        derived.replaceChildren(def([
          ['Balance', quoted === null ? 'No quote'
            : (quoted - paid < 0 ? `−${usd(paid - quoted)}` : usd(quoted - paid))],
          ['Paid', quoted === null ? usd(paid) : `${usd(paid)} of ${usd(quoted)}`],
        ]));
        const status = el('span', `rux--tag rux--tag--sm ${rungTone}`, rungLabel);
        status.title = `Billing status: ${rungLabel}`;
        figures.replaceChildren(
          bigNumber('Trip', confirmed ? 'Confirmed' : 'Not confirmed'),
          status,
        );
        // The line names what confirmed the trip or, unconfirmed, states the rule.
        confirmWhy.textContent = confirmed
          ? (CONFIRM_BY[confirmRung] || 'Confirmed.')
          : 'A signed contract, a PO or any payment confirms it.';
      };
      /* The summary tile: the confirmation and its status tag, the reason line,
         then Balance and Paid. It takes no section margin, because the sticky
         tab strip already gives it room. */
      const tile = el('div', 'rux--tile rux--layer-two scheduler-panel-section--bleed');
      const tileStack = el('div', 'rux--stack-vertical rux--stack-scale-5');
      tileStack.append(
        figures,
        confirmWhy,
        derived,
      );
      tile.appendChild(tileStack);

      const summary = el('div', 'rux--stack-vertical rux--stack-scale-6');
      summary.append(
        tile,
        moneyField('scheduler-f-quoted', 'Quoted price', trip.quoted_price),
      );
      panelBilling.appendChild(summary);

      /* Payments use the same `rowList` as PO and invoice, with a method tag on
         each row and no switch: a receipt has no milestone to gate. */
      const payList = rowList();
      const draw = () => {
        payList.body.replaceChildren();
        pending.forEach((p, i) => {
          const mark = PAYMENT_TAG[p.method] || { code: '···', tone: 'rux--tag--gray' };
          const when = p.date ? mdy(p.date) : 'No date';
          const much = usd(Number(p.amount) || 0);
          payList.body.appendChild(listRow({
            code: mark.code, tone: mark.tone, codeTitle: p.method || 'Method not set',
            when, much,
            /* The reference is on the tooltip and in the dialog, not the row: it
               is looked up rather than scanned, and it would wrap the row. */
            title: [p.method || 'Payment', when, much,
                    p.ref ? `Ref ${p.ref}` : null].filter(Boolean).join(' · '),
            edit: () => openPaymentDialog(i),
            removeLabel: `Remove ${p.method || 'payment'} of ${much}`,
            remove: () => { pending.splice(i, 1); draw(); refreshDirty(); },
          }));
        });
        // The add row is also the empty state, as in the two lists above.
        payList.body.appendChild(listAddRow({
          label: 'Add payment', id: 'scheduler-f-payadd',
          onClick: () => openPaymentDialog(null),
        }).li);
        drawSummary();
      };
      draw();
      redrawPayments = draw;
      /* A list bleeds to the panel's edges so its rows, which a contained-list
         pads inside, line up with the fields. Helper text such as the PO
         coverage line does not bleed. */
      const bleed = (node) => {
        const box = el('div', 'scheduler-panel-section--bleed');
        box.appendChild(node);
        return box;
      };
      const listWrap = section('Payments', bleed(payList.list));

      /* The order is contract, PO and invoice, as the ladder climbs, then
         payments last because it is the only section that grows. Every section
         is a `section()`, so the three switches share one right edge. */
      const poBody = el('div');
      poBody.append(bleed(poList.list), poCoverage);

      const poWrap = section('PO received', poBody, poSwitch);
      const invWrap = section('Invoice sent', bleed(invList.list), invoiceSwitch);
      const contractSection = section('Contract signed', contract, contractSwitch);

      panelBilling.append(
        contractSection,
        poWrap,
        invWrap,
        listWrap,
      );

      /* A switch that is off hides and disables its fields and clears them.
         `clear` is false on the first pass, so opening a trip that holds a value
         under an off switch shows it rather than arming Save to erase it. */
      const GATES = [
        ['scheduler-f-contract', ['scheduler-f-contractnote'], contract],
      ];
      const syncGates = (clear) => {
        for (const [toggleId, fieldIds, box] of GATES) {
          const open = on(document.getElementById(toggleId));
          box.hidden = !open;
          for (const fid of fieldIds) {
            const input = document.getElementById(fid);
            if (!input) continue;
            input.disabled = !open;
            if (!open && clear) input.value = '';
          }
        }
      };
      /* A list is gated by its `<ul>`, not its section, whose heading holds the
         switch; `.scheduler-list-body[hidden]` has its own rule in app.css, like
         the milestone fields. Off empties the array, and `clear` is false on the
         first pass, as with the fields. */
      const syncLists = (clear) => {
        for (const [toggleId, box, pending, redraw] of [
          ['scheduler-f-poreceived', poList, poPending, drawPos],
          ['scheduler-f-invoice', invList, invPending, drawInvoices]]) {
          const open = on(document.getElementById(toggleId));
          box.body.hidden = !open;
          if (!open && clear && pending.length) { pending.length = 0; redraw(); }
        }
        redrawLists();
      };

      syncGates(false);
      syncLists(false);
      /* Listened for on the tab, not the switch: Design's `setToggle` dispatches
         `rux:toggle` on the `.rux--toggle` box, which contains the button, so
         the event never reaches a listener on the button. */
      panelBilling.addEventListener('rux:toggle', () => {
        syncGates(true);
        syncLists(true);
        drawSummary();
      });
      // The quoted price redraws the figures on `input`, so they follow each keystroke.
      document.getElementById('scheduler-f-quoted')?.addEventListener('input', drawSummary);
      drawPos();
      drawInvoices();
      drawSummary();
    }

    // Fleet is the bus and who is on it; the dates are in Details and the times
    // in Route.
    panelFleet.replaceChildren();
    if (creating) {
      const onBus = createBusId ? panelIndex.buses.get(createBusId) : null;
      panelFleet.appendChild(onBus
        ? def([['Bus', `${onBus.number}`], ['Drivers', 'None yet']])
        : el('p', 'scheduler-panel-hint',
            'A new trip starts with no bus. Save it and it lands in the Unassigned row, where it can be dragged onto one.'));
    } else panelFleet.appendChild(def([
      ['Bus', bus ? `${bus.number}${(leg.count || 1) > 1 ? ` — ${(assign?.position ?? 0) + 1} of ${leg.count}` : ''}` : 'Not assigned'],
      ['Drivers', names.join(', ') || (assign ? 'None assigned' : null)],
      ['Needs', reqs],
    ]));

    /* Files holds the Itinerary not needed switch, which Save writes like any
       field, then the uploader and the trip's files, which write at once. A
       trip not yet saved has no id to file under. */
    panelFiles.replaceChildren();
    const notNeeded = section('Itinerary not needed',
      el('p', 'scheduler-panel-hint', 'On for a trip that runs without one, so its bars stop showing No itinerary yet.'),
      toggleAction('scheduler-f-notneeded', 'Itinerary not needed', !!trip.itinerary_not_needed));
    if (creating || !client) {
      filesBody = null;
      filesEmpty = null;
      panelFiles.append(notNeeded, section('Files', el('p', 'scheduler-panel-hint', creating
        ? 'Save the trip first, then add its itinerary, contract and purchase order here.'
        : 'This preview has no connection, so files cannot be listed or added.')));
    } else {
      const { list, body } = rowList();
      filesBody = body;
      filesEmpty = el('p', 'scheduler-panel-hint', 'No files yet. An itinerary, contract or purchase order added above is listed here.');
      const listWrap = el('div');
      listWrap.append(list, filesEmpty);
      panelFiles.append(notNeeded, section('Add a file', fileUploader(trip.id)), section('Files', listWrap));
      drawFiles(trip);
    }

    /* The date-picker module claims pickers on load; these were just built, so
       it is asked again for the whole panel body. An unclaimed picker renders
       its calendar open, because the module closes a calendar by detaching it. */
    window.Rux?.datePicker?.init?.(panelBody);

    /* A tabpanel is a tab stop only when nothing inside it is focusable, the
       ARIA pattern; otherwise the panel is a redundant stop with a focus ring
       round the whole tab. Decided per panel from its contents, which change. */
    for (const tp of [panelDetails, panelBilling, panelFleet, panelRoute, panelFiles]) {
      const focusable = tp.querySelector('input, select, textarea, button, a[href], [tabindex]:not([tabindex="-1"])');
      if (focusable) tp.removeAttribute('tabindex');
      else tp.setAttribute('tabindex', '0');
    }

    document.getElementById('scheduler-f-type')?.addEventListener('change', e => {
      const split = e.target.value === SPLIT;
      returnDates.hidden = !split;
      setOutLabels(split);
      setHotelLegs(split);
      refreshDirty();
    });

    refreshDirty();

    if (!again) panelOpener = bar;
    const wasOpen = !panelEl.hidden;
    panelEl.hidden = false;
    if (tripEl) tripEl.hidden = false;
    // Once the panel shows, so Open trip and the driver grid treat this trip
    // as the one in the editor.
    syncSelection();
    window.Rux?.schedule?.fit?.();
    /* The roster steps aside only below md, where app.css makes it and the
       editor full-width overlays, so one would cover the other; on a desktop it
       stays and the board scrolls. Only on the way in, so a `Drivers` press
       made while the editor is open is not undone. */
    if (!wasOpen && availOn && !availYielded && matchMedia('(max-width: 41.98rem)').matches) {
      availYielded = true;
      placeAvailability();
    }
    document.getElementById('scheduler-panel-close')?.focus();
  }

  /* ── Driver availability ───────────────────────────────────────────────────
     Busy is derived, not stored: a driver is busy on a day an assignment of
     theirs covers, walked from the same legs the bars are placed from, so the
     roster always agrees with the board.

     Time off is stored, in `driver_time_off`, and beats busy in a cell, because
     a driver both assigned and away is a conflict worth seeing as away. */
  const asideSlot = document.getElementById('scheduler-aside');
  const availEl = document.getElementById('scheduler-avail');
  const availGrid = document.getElementById('scheduler-avail-grid');
  const availToggle = document.getElementById('scheduler-avail-toggle');
  let availOn = false;
  /* The roster steps aside for the editor only below md, where both are
     full-width overlays and one would cover the other (`openPanel`). The yield
     is kept apart from `availOn`, the wanted state, so closing the editor
     brings the roster back. */
  let availYielded = false;
  let availRows = [];

  function availabilityRows({ trips, drivers, timeOff, weekStart, weekEnd }) {
    const rows = (drivers || [])
      .slice()
      .sort((a, b) => (a.short_name || a.name || '').localeCompare(b.short_name || b.name || ''))
      .map(d => ({ driver: d, days: Array.from({ length: 7 }, () => ({ off: null, trips: [] })) }));
    const byId = new Map(rows.map(r => [r.driver.id, r]));

    for (const trip of trips || []) {
      for (const leg of legsOf(trip)) {
        const place = clip(leg.from, leg.to, weekStart, weekEnd);
        if (!place) continue;
        for (const a of trip.trip_assignments || []) {
          if ((a.leg || 'outbound') !== leg.leg) continue;
          for (const td of a.trip_drivers || []) {
            const row = byId.get(td.driver_id);
            if (!row) continue;
            const what = trip.destination || 'Trip';
            for (let i = 0; i < place.span; i++) {
              const day = row.days[place.start + i];
              if (day && !day.trips.includes(what)) day.trips.push(what);
            }
          }
        }
      }
    }

    for (const off of timeOff || []) {
      const row = byId.get(off.driver_id);
      if (!row) continue;
      const place = clip(off.start_date, off.end_date || off.start_date, weekStart, weekEnd);
      if (!place) continue;
      for (let i = 0; i < place.span; i++) {
        const day = row.days[place.start + i];
        if (day) day.off = off.reason || 'Time off';
      }
    }
    return rows;
  }

  function drawAvailability(rows, weekStart) {
    availRows = rows;
    availGrid.textContent = '';

    const head = el('div', 'scheduler-avail__days');
    head.appendChild(el('div', 'scheduler-avail__day scheduler-avail__day--head', 'Driver'));
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart.getTime() + i * DAY);
      /* Two letters, taken from the locale's own `short` weekday: one letter
         cannot tell Tuesday from Thursday, and two fit the roster's narrow day
         column. Spread rather than `slice`, so the unit is a code point. */
      const short = d.toLocaleDateString(undefined, { weekday: 'short' });
      const cell = el('div', 'scheduler-avail__day', [...short].slice(0, 2).join(''));
      // Weekend letters dim, as the board's day header does; the day rules are
      // drawn in the body only.
      if (isWeekend(d)) cell.classList.add('scheduler-avail__day--weekend');
      cell.dataset.day = String(i);
      head.appendChild(cell);
    }
    availGrid.appendChild(head);

    for (const row of rows) {
      const r = el('div', 'scheduler-avail__row');
      /* The full name goes on the title, because the cell shows `short_name`
         when there is one and ellipses a long name. `title` is hover only, so
         it does not help a keyboard or screen-reader user tell two similar
         names apart. */
      const shown = row.driver.short_name || row.driver.name || 'Driver';
      const nameEl = el('div', 'scheduler-avail__name', shown);
      if (row.driver.name) nameEl.title = row.driver.name;
      r.appendChild(nameEl);
      row.days.forEach((day, i) => {
        const busy = day.trips.length > 0;
        const cls = day.off ? 'scheduler-avail__cell scheduler-avail__cell--off'
          : busy ? 'scheduler-avail__cell scheduler-avail__cell--busy'
          : 'scheduler-avail__cell';
        const cell = el('div', cls);
        cell.dataset.day = String(i);
        cell.appendChild(el('span', null, day.off || day.trips.join(' · ')));
        if (day.off || busy) cell.title = `${row.driver.name || ''} — ${day.off || day.trips.join(' · ')}`;
        r.appendChild(cell);
      });
      availGrid.appendChild(r);
    }
    const on = currentTripDay();
    markAvailDays(on ? on.start : null, on ? on.span : 1);
  }

  /* Tints the selected trip's days down the roster, so "who is free then" needs
     no counting; null clears it. Busy and day-off cells paint over the tint in
     app.css, so it shows on the free cells, which are the answer. */
  function markAvailDays(start, span) {
    for (const c of availGrid.querySelectorAll('.scheduler-avail__cell--on-day, .scheduler-avail__day--on-day')) {
      c.classList.remove('scheduler-avail__cell--on-day', 'scheduler-avail__day--on-day');
    }
    if (start == null) return;
    const end = start + Math.max(1, span || 1) - 1;
    for (let i = start; i <= end && i < 7; i++) {
      for (const d of availGrid.querySelectorAll(`.scheduler-avail__day[data-day="${i}"]`)) d.classList.add('scheduler-avail__day--on-day');
      for (const c of availGrid.querySelectorAll(`.scheduler-avail__cell[data-day="${i}"]`)) c.classList.add('scheduler-avail__cell--on-day');
    }
  }

  // The driver grid's days: the selected bar's, or with nothing selected the
  // editor's own trip when this week has a bar for it.
  const currentTripDay = () => {
    const bar = selectedBar() ?? (!panelEl.hidden && panelArgs?.ref ? findBar(panelArgs.ref) : null);
    if (!bar) return null;
    const start = Number(bar.style.getPropertyValue('--scheduler-start'));
    const span = Number(bar.style.getPropertyValue('--scheduler-span'));
    return Number.isFinite(start) ? { start, span: Number.isFinite(span) ? span : 1 } : null;
  };

  /* ── Selecting is not opening ────────────────────────────────────────────────
     A click selects a bar (app.js owns the toggle) and leaves the editor alone:
     the selection lights its days in the driver grid, and Open trip shows on it
     unless it belongs to the trip being edited. Opening goes through
     `whenSafe`, which asks before unsaved changes would be lost. A bar is named
     by `barRef` values rather than held, because every render replaces the
     elements. */
  function selectedBar() { return gridEl.querySelector('.scheduler-bar[aria-pressed="true"]'); }

  function barRef(bar) {
    return {
      tripId: bar.dataset.tripId,
      leg: bar.dataset.leg || 'outbound',
      busId: bar.dataset.busId || null,
      assignmentId: bar.dataset.assignmentId || null,
    };
  }

  function findBar(ref) {
    if (!ref?.tripId) return null;
    return [...gridEl.querySelectorAll(`.scheduler-bar[data-trip-id="${CSS.escape(ref.tripId)}"]`)]
      .find(b => (b.dataset.leg || 'outbound') === ref.leg && (b.dataset.assignmentId || null) === ref.assignmentId) ?? null;
  }

  function isEditorBar(bar) {
    const ref = panelArgs?.ref;
    return !panelEl.hidden && !!ref && !panelArgs.draft && bar.dataset.tripId === ref.tripId
      && (bar.dataset.leg || 'outbound') === ref.leg && (bar.dataset.assignmentId || null) === ref.assignmentId;
  }

  // Any bar of the trip open in the editor. Those are locked on the board.
  function isEditorTrip(bar) {
    return !panelEl.hidden && !!panelArgs?.ref && !panelArgs.draft && bar.dataset.tripId === panelArgs.ref.tripId;
  }

  /* The shortcut bar follows the selection, the trip in the editor included:
     there its first slot closes the editor. It is placed the way a tooltip is:
     above the trip where there is room and below it where there is not, and
     slid back inside the board at either edge with its arrow still pointing at
     the trip. Nothing is taken from the trip itself, so the slots are the same
     on every trip. It goes straight after its bar, inside that bar's own track,
     so Tab reaches the slots from the selected trip; the track does not clip,
     so the bar can sit outside it. It is taken away while a bar is dragged,
     because the trip it points at is moving. */
  const TIP_GAP = 4;
  function placeBarOpen(bar = selectedBar()) {
    if (!barShortcuts) return;
    const none = !bar?.dataset.tripId || gridEl.querySelector('.scheduler-bar--dragging');
    barShortcuts.hidden = none;
    if (none) return;
    if (barShortcuts.previousElementSibling !== bar) bar.after(barShortcuts);
    drawShortcuts(bar);
    /* The room is measured on screen, against the pane and the two bands that
       stick to its edges, and then written in the track's own coordinates,
       which is where the bar is laid out. */
    const pane = schEl.getBoundingClientRect();
    const host = barShortcuts.parentElement.getBoundingClientRect();
    const box = bar.getBoundingClientRect();
    const tip = barShortcuts.getBoundingClientRect();
    const band = gridEl.querySelector('.scheduler-day')?.getBoundingClientRect();
    const column = gridEl.querySelector('.scheduler-row-head')?.getBoundingClientRect();
    const ceiling = band ? band.bottom : pane.top;
    const above = box.top - ceiling >= tip.height + TIP_GAP;
    barShortcuts.dataset.side = above ? 'above' : 'below';
    barShortcuts.style.setProperty('--scheduler-open-top',
      `${(above ? box.top - tip.height - TIP_GAP : box.bottom + TIP_GAP) - host.top}px`);
    const first = (column ? column.right : pane.left) + TIP_GAP;
    const last = pane.right - tip.width - TIP_GAP;
    const x = Math.max(first, Math.min(box.left, last));
    barShortcuts.style.setProperty('--scheduler-open-start', `${x - host.left}px`);
    // Half a slot in from the trip's own start edge, wherever the bar ended up.
    barShortcuts.style.setProperty('--scheduler-open-tip',
      `${Math.max(8, Math.min(tip.width - 20, box.left - x + 16))}px`);
  }

  /* The other bars of the trip in the editor: its return leg, or the same leg
     on another bus. They are locked -- they do not drag, and their bus, colour
     and hotel are the editor's to change -- so they are marked as belonging to
     the open trip. A dashed ring in the selection's own colour, which costs
     none of the bar's writing: the same trip, but not the one in hand. Closing
     is the shortcut bar's first slot and the editor's own close button. */
  function markEditorBars() {
    const picked = selectedBar();
    for (const bar of gridEl.querySelectorAll('.scheduler-bar[data-trip-id]')) {
      bar.classList.toggle('scheduler-bar--locked', isEditorTrip(bar) && bar !== picked);
    }
  }

  function syncSelection() {
    const bar = selectedBar();
    placeBarOpen(bar);
    markEditorBars();
    const on = currentTripDay();
    markAvailDays(on ? on.start : null, on ? on.span : 1);
  }

  /* The trip changed under the editor. Reload trip drops the editor's changes
     and opens the trip as it is now; Save anyway saves over it and then runs
     what the save was for; closing the box keeps editing. */
  const conflictModal = document.getElementById('scheduler-conflict-modal');
  let conflictAfter = null;
  document.getElementById('scheduler-conflict-save')?.addEventListener('click', async () => {
    const next = conflictAfter;
    conflictAfter = null;
    window.Rux?.modal?.close?.(conflictModal);
    if (await saveEditor(next, true)) next?.();
  });
  document.getElementById('scheduler-conflict-reload')?.addEventListener('click', async () => {
    conflictAfter = null;
    window.Rux?.modal?.close?.(conflictModal);
    await reloadEditorTrip();
  });
  conflictModal?.addEventListener('rux:modal-closed', () => { conflictAfter = null; });

  // Opens the editor's trip afresh on the week of its leg, dropping unsaved changes.
  async function reloadEditorTrip() {
    const { ref, trip } = panelArgs || {};
    if (!ref || !trip) return;
    const from = legsOf(trip).find(l => l.leg === ref.leg)?.from ?? trip.start_date;
    if (from) cursor = mondayOf(parseISO(from));
    await show();
    const bar = findBar(ref);
    if (bar) { selectBar(bar); openPanel(bar); }
    else { closePanel(false); toast('info', 'That trip is not on its week any more'); }
  }

  function selectBar(bar) {
    for (const b of gridEl.querySelectorAll('.scheduler-bar[aria-pressed="true"]')) if (b !== bar) b.setAttribute('aria-pressed', 'false');
    bar.setAttribute('aria-pressed', 'true');
  }

  function clearSelection() {
    for (const b of gridEl.querySelectorAll('.scheduler-bar[aria-pressed="true"]')) b.setAttribute('aria-pressed', 'false');
  }

  // Opens the trip a ref names, finding its bar again after a save's render.
  function openRef(ref) {
    const bar = findBar(ref);
    if (!bar) { toast('info', 'That trip is not on this week'); return; }
    selectBar(bar);
    openPanel(bar);
  }

  function openSelected() {
    const bar = selectedBar();
    if (!bar?.dataset.tripId || isEditorBar(bar)) return;
    const ref = barRef(bar);
    whenSafe(() => openRef(ref));
  }

  /* Asks before losing work. With nothing unsaved the action runs at once.
     Otherwise the box names the trip: Save runs the action only when the save
     succeeds, Discard runs it straight away, and closing the box drops it. */
  let afterPrompt = null;
  function whenSafe(action) {
    if (!unsavedWork()) { action(); return; }
    afterPrompt = action;
    const name = document.getElementById('scheduler-f-destination')?.value.trim() || panelArgs?.trip?.destination;
    const heading = document.getElementById('scheduler-unsaved-h');
    if (heading) heading.textContent = name ? `Save changes to ${name}?` : 'Save changes?';
    window.Rux?.modal?.open?.(unsavedModal);
  }
  document.getElementById('scheduler-unsaved-discard')?.addEventListener('click', () => {
    const next = afterPrompt;
    afterPrompt = null;
    window.Rux?.modal?.close?.(unsavedModal);
    next?.();
  });
  document.getElementById('scheduler-unsaved-save')?.addEventListener('click', async () => {
    const next = afterPrompt;
    afterPrompt = null;
    window.Rux?.modal?.close?.(unsavedModal);
    if (await saveEditor(next)) next?.();
  });
  unsavedModal?.addEventListener('rux:modal-closed', () => { afterPrompt = null; });

  // The browser's own warning covers a reload or a closed tab.
  window.addEventListener('beforeunload', e => {
    if (unsavedWork()) { e.preventDefault(); e.returnValue = ''; }
  });

  // The panel and the whole-pixel day columns move a bar's start edge, a frame
  // after the grid's own size changes.
  new ResizeObserver(() => requestAnimationFrame(() => { placeBarOpen(); markEditorBars(); })).observe(gridEl);
  /* The shortcut bar scrolls with its trip, but which side of the trip it fits
     on changes as the board scrolls under the sticky day band, so it is placed
     again. Close trip is a tab on its bar and needs nothing. */
  schEl.addEventListener('scroll', () => {
    if (!barShortcuts?.hidden) requestAnimationFrame(() => placeBarOpen());
  }, { passive: true });

  // Enter on the selected bar opens it. Enter on any other bar is app.js's and
  // only selects that bar, even while a different one is selected.
  gridEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.matches?.('.scheduler-bar[aria-pressed="true"]')) openSelected();
  });

  // Every selection change, from a click, a key or a script, lands here.
  new MutationObserver(syncSelection).observe(gridEl, { subtree: true, attributes: true, attributeFilter: ['aria-pressed'] });

  function placeAvailability() {
    /* The toggle reports what is on screen, not `availOn`, so a yielded roster
       does not leave a pressed button with nothing behind it. */
    const shown = availOn && !availYielded;
    if (asideSlot) {
      asideSlot.hidden = !shown;
      if (shown) asideSlot.appendChild(availEl);
    }
    availEl.hidden = !shown;
    availToggle.setAttribute('aria-pressed', String(shown));
    // rux.css styles nothing on `aria-pressed`; `rux--btn--selected` is
    // Carbon's pressed look.
    availToggle.classList.toggle('rux--btn--selected', shown);
    window.Rux?.schedule?.fit?.();
  }

  /* A press acts on what is on screen: off screen for either reason, it shows
     the roster and clears the yield; on screen, it hides it. The yield is only
     taken as the editor opens, so this holds. */
  availToggle?.addEventListener('click', () => {
    if (availOn && !availYielded) { availOn = false; }
    else { availOn = true; availYielded = false; }
    placeAvailability();
  });

  /* ── View options ─────────────────────────────────────────────────────────
     Start on Sunday and the bar-row toggles. Turning a row off removes it
     rather than blanking it: `--scheduler-bar-rows` is the count, so the bar
     shrinks and more buses fit. Saved in `localStorage` and read with a
     try-catch, so a browser that refuses storage gets the defaults. */
  const VIEW_ROWS = ['client', 'contact', 'time', 'notes', 'drivers'];
  // The class that hides each row, written out in full so the check can read it.
  const HIDE_ROW = {
    client: 'scheduler-week--no-client',
    contact: 'scheduler-week--no-contact',
    time: 'scheduler-week--no-time',
    notes: 'scheduler-week--no-notes',
    drivers: 'scheduler-week--no-drivers',
  };
  const view = { client: true, contact: true, time: true, notes: true, drivers: true, sunday: false };
  const VIEW_KEY = 'scheduler.view';

  try {
    const saved = JSON.parse(localStorage.getItem(VIEW_KEY) || '{}');
    for (const k of [...VIEW_ROWS, 'sunday']) if (typeof saved[k] === 'boolean') view[k] = saved[k];
  } catch { /* no storage, or nothing worth reading: the defaults stand */ }
  // Set before `cursor` is first computed below, because `mondayOf` reads it
  // and the first week drawn must honour a saved Sunday start.
  weekStartsSunday = view.sunday;

  const viewMenu = document.getElementById('scheduler-view-menu');
  const viewTrigger = document.getElementById('scheduler-view-trigger');

  function applyView() {
    weekStartsSunday = view.sunday;
    for (const r of VIEW_ROWS) schEl.classList.toggle(HIDE_ROW[r], !view[r]);
    // One for the destination, which never goes, plus whatever is left on.
    schEl.style.setProperty('--scheduler-bar-rows', String(1 + VIEW_ROWS.filter(r => view[r]).length));
    // The bars change height and lane, which the scroll pane may not report as
    // a resize, so the trip tabs follow here.
    placeBarOpen();
    markEditorBars();
    for (const item of viewMenu?.querySelectorAll('[role="menuitemcheckbox"]') || []) {
      const key = item.dataset.row || item.dataset.view;
      const on = !!view[key];
      item.setAttribute('aria-checked', String(on));
      const slot = item.querySelector('.rux--menu-item__selection-icon');
      if (slot) { if (on) slot.replaceChildren(svgUse('#i-checkmark', '16', '0 0 20 20')); else slot.replaceChildren(); }
    }
    try { localStorage.setItem(VIEW_KEY, JSON.stringify(view)); } catch { /* nothing to do */ }
    window.Rux?.schedule?.fit?.();
  }

  viewTrigger?.addEventListener('click', () => {
    if (!viewMenu) return;
    // Placed like the context menus, with the button's bottom-left corner as
    // the point.
    const r = viewTrigger.getBoundingClientRect();
    popMenuAt(viewMenu, { clientX: r.left, clientY: r.bottom });
  });

  viewMenu?.addEventListener('click', e => {
    const item = e.target.closest('[role="menuitemcheckbox"]');
    if (!item) return;
    const key = item.dataset.row || item.dataset.view;
    if (!(key in view)) return;
    view[key] = !view[key];
    applyView();
    // Changing the first day re-asks the server for a different seven days;
    // the row toggles are drawing only and need no fetch.
    if (key === 'sunday') { cursor = mondayOf(cursor); show(); }
  });
  viewMenu?.addEventListener('rux:menu-closed', () => { viewMenu.hidden = true; });

  // Once at start, so the saved rows are off before the first week is drawn
  // rather than blinking off after it.
  applyView();

  // The roster's own close button. Focus goes to the toolbar toggle, which
  // opens the roster again.
  document.getElementById('scheduler-avail-close')?.addEventListener('click', () => {
    availOn = false;
    placeAvailability();
    availToggle?.focus();
  });

  /* A picked contact links the field and fills from it; typing unlinks it, and
     Save then finds or adds the contact by what was typed (`linkContacts`).
     `js/list-box.js` sends the picked option, or `option: null` for a cleared
     selection. */
  const isContactField = t => t instanceof HTMLInputElement
    && (t.id === 'scheduler-f-cfind' || /^scheduler-f-d\d$/.test(t.id));
  panelDetails?.addEventListener('input', e => {
    if (isContactField(e.target)) delete e.target.dataset.contactId;
  });
  panelDetails?.addEventListener('rux:listbox-selected', e => {
    const t = e.target.querySelector?.('input[role="combobox"]');
    if (!isContactField(t)) return;
    const id = e.detail?.option?.dataset.contactId;
    if (!id) { delete t.dataset.contactId; return; }
    t.dataset.contactId = id;
    const hit = (panelIndex.contacts || []).find(c => String(c.id) === id);
    if (!hit) return;
    if (t.id === 'scheduler-f-cfind') {
      const put = (id, v) => { const e2 = document.getElementById(id); if (e2) e2.value = v ?? ''; };
      const suggest = (id, v) => { const e2 = document.getElementById(id); if (e2 && !e2.value) e2.value = v ?? ''; };
      /* Phone and email belong to the person, so a new pick replaces them.
         Organization is a trip column that can differ from the contact's
         client, as when an agency books for a school, so it fills only when
         empty. */
      put('scheduler-f-cphone', hit.phone);
      put('scheduler-f-cemail', hit.email);
      suggest('scheduler-f-customer', hit.client);
    } else {
      const ph = document.getElementById(`scheduler-f-dphone${t.id.slice(-1)}`);
      if (ph && !ph.value) ph.value = hit.phone ?? '';
    }
  });

  // Save's state is computed, not tracked: each event re-reads the form against
  // the values the panel opened with, so a change typed back out disarms Save.
  panelDetails?.addEventListener('input', refreshDirty);
  panelDetails?.addEventListener('change', refreshDirty);
  // A dropdown is a <button>, so a pick fires neither; list-box.js announces it.
  panelDetails?.addEventListener('rux:listbox-selected', refreshDirty);
  // The copy buttons follow their fields, a pick that fills phone and email
  // included: that handler is registered above, so this runs after it.
  panelDetails?.addEventListener('input', syncCopy);
  panelDetails?.addEventListener('rux:listbox-selected', syncCopy);
  /* Billing is a second tab and needs its own listeners. A toggle is a
     <button> that fires neither `input` nor `change`; `form-controls.js` sends
     `rux:toggle` instead. */
  panelBilling?.addEventListener('input', refreshDirty);
  panelBilling?.addEventListener('change', refreshDirty);
  panelBilling?.addEventListener('rux:toggle', refreshDirty);
  // Files has one switch.
  panelFiles?.addEventListener('rux:toggle', refreshDirty);

  /* Reset replays `openPanel` with the arguments that opened it, which rewrites
     every field from the trip at once, date labels, return pair, added contact
     rows and disabled inputs included, and re-runs `refreshDirty`. No confirm:
     pressing Reset is the ask, and it is disabled with nothing to discard. */
  panelReset?.addEventListener('click', () => {
    if (!panelArgs) return;
    openPanel(null, panelArgs.draft, panelArgs);
  });

  /* The button only opens `scheduler-cancel-modal`; the dialog's confirm makes
     the write. It reads `editing.id`, so it acts on the trip the panel shows
     now. */
  panelCancel?.addEventListener('click', () => {
    if (editing?.id) openCancelModal(editing.id);
  });

  // Save closes the editor once the week has been read back.
  panelSave?.addEventListener('click', async () => {
    const after = () => closePanel(false);
    if (await saveEditor(after)) after();
  });

  // Counts save attempts, so a late write that settles after a newer save
  // leaves the screen to that save.
  let saveSeq = 0;

  /* Save as a step other actions can wait on. True once the editor's work is
     done: everything is written, or a new trip exists and the editor has
     closed on it. False when there is nothing to write, nothing could be
     written, the trip changed under the editor, or a save stopped partway and
     the editor reopened on the trip as it is saved. Work is anything `changed`
     sees, so a time, contact or payment edit alone saves too.

     The trip is read back first. When its `updated_at` is not the one the
     editor opened with, someone saved it in between, and the conflict box asks
     before replacing that, holding `after` to run if the save goes through.
     `force` is the box's Save anyway. A failed read does not block the save,
     which reports its own errors. */
  async function saveEditor(after, force = false) {
    if (!editing || (!editing.creating && !changed())) return false;
    const patch = patchOf() || {};
    const id = editing.id;
    const creating = editing.creating;
    if (!creating && !force && editing.updatedAt) {
      let now = null;
      try {
        ({ data: now } = await withTimeout(client.from('trips').select('updated_at').eq('id', id).single().then(r => r)));
      } catch { now = null; }
      if (now?.updated_at && Date.parse(now.updated_at) !== Date.parse(editing.updatedAt)) {
        conflictAfter = after ?? null;
        window.Rux?.modal?.open?.(conflictModal);
        return false;
      }
    }
    /* Every write goes through `write`, so a failure knows whether anything
       reached the database and which part was being written. Sending a write
       again that already landed is how a trip or a payment is saved twice. */
    let wrote = false;
    let part = 'the trip';
    // The write that ran out of time, which may still land.
    let late = null;
    const seq = ++saveSeq;
    const write = async (what, query) => {
      part = what;
      const request = query.then(r => r);
      let result;
      try {
        result = await withTimeout(request);
      } catch (e) {
        if (e.timedOut) late = request;
        throw e;
      }
      if (result.error) throw Object.assign(new Error(result.error.message), { code: result.error.code });
      wrote = true;
      return result.data;
    };
    panelSave.disabled = true;
    toast('info', creating ? 'Creating the trip…' : 'Saving the trip…');
    try {
      /* Create writes every field, not the diff. `readForm` returns null when a
         field is missing, and spreading null would insert a trip with no
         destination or start date, so a missing field fails loudly instead.
         `bus_count` is written as 1 rather than left for `legsOf`'s fallback. */
      const form = creating ? readForm() : null;
      if (creating && !form) throw new Error('The form is not complete — a field is missing from the panel.');
      /* `confirmed: false` is written once, at insert: rux-ui derives the
         column afterwards, a new trip has nothing that confirms it, and it
         colours the bar, so it is not left to a database default. */
      const row = creating ? { id: editing.newId, ...form, bus_count: 1, confirmed: false } : patch;
      // Contacts are linked, and added to the list, before the trip is written.
      const unlinked = await linkContacts(row, creating);
      const wantBus = creating ? createBusId : null;
      /* A trip created from a cell also gets an assignment row, written last
         because it needs the trip to exist. If that write fails the trip
         stands, in the Unassigned row, and the message says so. */
      // An edit to a time alone leaves the trip patch empty, and an empty
      // update is skipped rather than sent.
      const stopWork = creating ? [] : stopsPatch();
      const tripWork = creating || Object.keys(row || {}).length > 0;
      /* A new trip carries its own id, made when the panel opened, so Save
         pressed again after a timeout cannot make a second copy: the database
         refuses a second row with the same id. That refusal means the first
         insert landed after all, so the form is written over it instead. */
      if (creating) {
        try {
          await write('the trip', client.from('trips').insert(row));
        } catch (e) {
          if (e.code !== '23505' || !/trips_pkey/.test(e.message)) throw e;
          const again = { ...row };
          delete again.id;
          await write('the trip', client.from('trips').update(again).eq('id', row.id));
        }
      } else if (tripWork) {
        await write('the trip', client.from('trips').update(row).eq('id', id));
      }
      const tripId = creating ? row.id : id;

      /* A new trip's first stops: a pickup row with the location, yard
         departure and spot, and a return row with the arrival, each written
         only when something was typed into it. Leg and position are known for
         a new trip; on an existing one `stopsPatch` only updates the rows the
         editor opened with. */
      if (creating) {
        const v = id => document.getElementById(id)?.value.trim() || null;
        const where = v('scheduler-f-pickup'), dep = v('scheduler-f-depart'), spot = v('scheduler-f-spot');
        const back = v('scheduler-f-return');
        const rows = [];
        if (where || dep || spot) {
          rows.push({ trip_id: tripId, leg: 'outbound', position: 0, type: 'pickup',
                      name: where, depart_prev: dep, spot });
        }
        if (back) {
          rows.push({ trip_id: tripId, leg: 'outbound', position: rows.length, type: 'return',
                      arrive: back });
        }
        if (rows.length) await write('its schedule', client.from('trip_stops').insert(rows));
      }

      /* Payments, then `deposit_amount`, which holds their sum despite its
         name: rux-ui reads it as the amount paid (`normalizeRecord` in its
         billing-config.js), so it is rewritten after the rows. `|| null`
         matches what rux-ui stores for no payments. */
      const payPatch = paymentsPatch();
      if (payPatch?.work) {
        for (const p of payPatch.inserts) {
          await write('its payments', client.from('trip_payments').insert({ trip_id: tripId, ...p }));
        }
        for (const u of payPatch.updates) {
          await write('its payments', client.from('trip_payments').update(u.patch).eq('id', u.id));
        }
        for (const delId of payPatch.deletes) {
          await write('its payments', client.from('trip_payments').delete().eq('id', delId));
        }
        await write('its payments',
          client.from('trips').update({ deposit_amount: payPatch.paid || null }).eq('id', tripId));
      }

      /* Purchase orders and invoices, by id like the payments. Their summary
         columns on the trip went out with the trip patch (`EDITS`). */
      for (const [table, what, listWork] of [['trip_pos', 'its purchase orders', posPatch()],
                                             ['trip_invoices', 'its invoices', invoicesPatch()]]) {
        if (!listWork?.work) continue;
        for (const item of listWork.inserts) {
          await write(what, client.from(table).insert({ trip_id: tripId, ...item }));
        }
        for (const u of listWork.updates) {
          await write(what, client.from(table).update(u.patch).eq('trip_id', tripId).eq('id', u.id));
        }
        for (const delId of listWork.deletes) {
          await write(what, client.from(table).delete().eq('trip_id', tripId).eq('id', delId));
        }
      }

      /* Existing stops are updated one row at a time, since an upsert would
         need every column and write back stale copies of those the form never
         shows. */
      for (const w of stopWork) {
        await write('its schedule', client.from('trip_stops').update(w.patch).eq('id', w.id));
      }
      if (wantBus) {
        await write('its bus', client.from('trip_assignments')
          .insert({ trip_id: tripId, bus_id: wantBus, leg: 'outbound', position: 0 }));
      }
      // Read back rather than trusting the write, as the drag does.
      await show();
      const fields = Object.keys(patch).length;
      if (unlinked.length) toast('warning', creating ? 'Trip created.' : 'Saved.',
        `${unlinked.join(', ')} could not be added to the contacts list, so the trip keeps its earlier link.`);
      else if (creating) toast('success', wantBus ? 'Trip created on its bus.' : 'Trip created. It is in the Unassigned row until it has a bus.');
      else toast('success', fields ? `Saved ${fields} change${fields === 1 ? '' : 's'}.` : 'Saved.');
      return true;
    } catch (e) {
      const why = String(e && e.message ? e.message : e);
      /* Nothing landed, or a new trip's insert ran out of time, which its fixed
         id makes safe to send again. The editor stays as it is for another try. */
      if (!wrote && (creating || !e.timedOut)) {
        if (e.timedOut) toast('warning', 'The trip may not have been created.', `${why} Press Save again. It cannot make a second copy.`);
        else toast('error', `The trip was not ${creating ? 'created' : 'saved'}. ${why}`);
        panelSave.disabled = false;
        followLateWrite(late, seq, null, ['The trip was created after all.', 'Press Save to finish it.']);
        return false;
      }
      /* Part of it landed, or may have. The editor's pending rows no longer
         match the database, and sending them again would save some twice, so
         the board is read back and the editor lets them go. A new trip closes,
         since it exists now; an existing one reopens as it is saved. */
      const check = part === 'its bus' ? 'It is in the Unassigned row and can be dragged onto one.'
        : part === 'the trip' ? 'Check the trip and make the change again if it is missing.'
        : `Check ${part} and add what is missing.`;
      const didNot = e.timedOut ? 'may not have saved' : 'did not save';
      await show();
      if (creating) {
        closePanel(false);
        toast('warning', `The trip was created, but ${part} ${didNot}.`, `${check} ${why}`);
        followLateWrite(late, seq, null);
        return true;
      }
      const ref = panelArgs?.ref ?? null;
      const bar = ref ? findBar(ref) : null;
      if (bar) openPanel(bar); else closePanel(false);
      toast('warning', `Part of the trip ${didNot}.`, `${check} ${why}`);
      followLateWrite(late, seq, ref);
      return false;
    }
  }

  /* A write that ran out of time can still land after the board was read back,
     where it would look missing. When it settles the board is read again. Unless
     another save has started since, an editor still on that trip with nothing
     unsaved reopens on it, and a message says what happened. */
  function followLateWrite(request, seq, ref,
                           landed = ['The late save has arrived.', 'The board shows it now.']) {
    if (!request) return;
    request.then(async ({ error }) => {
      await show();
      if (seq !== saveSeq) return;
      const onTrip = !!ref && !panelEl.hidden && panelArgs?.ref?.tripId === ref.tripId;
      const unsaved = onTrip && unsavedWork();
      if (!error && onTrip && !unsaved) {
        const bar = findBar(panelArgs.ref);
        if (bar) openPanel(bar);
      }
      if (error) toast('warning', 'The late save did not go through.', `${error.message} Check the trip before saving again.`);
      else toast('info', landed[0], unsaved ? 'Reload the trip to see it before saving again.' : landed[1]);
    }, () => {});
  }

  /* ── Right-click an empty cell ─────────────────────────────────────────────
     New trip here fills in the two things a cell knows: the row's bus and the
     column's day. The day comes from the pointer's offset across the track,
     because bars are placed by percentage inside one track and there is no
     per-day element. A right-click on a bar opens the bar's menu instead.

     `Rux.menu.open` gives Escape, outside-press and focus return, but it
     positions only `position: fixed` menus, and these are absolute inside
     `.scheduler-page`, so `popMenuAt` places them. */
  const cellMenu = document.getElementById('scheduler-cell-menu');
  const barMenu = document.getElementById('scheduler-bar-menu');
  let cellMenuAt = null;
  let barMenuFor = null;

  /* Places a menu at a point inside `.scheduler-page`. It shifts left only as
     far as it must to stay within the page, as Carbon's menus do, so it stays
     under what opened it. Its width is read after `hidden` comes off and after
     the append, when it has its real box. The block axis is not clamped,
     because the page grows and scrolls to a menu near its bottom. */
  function popMenuAt(menu, e) {
    const page = pageEl?.getBoundingClientRect();
    menu.hidden = false;
    menu.style.position = 'absolute';
    menu.style.insetBlockStart = `${e.clientY - (page?.top ?? 0)}px`;
    pageEl?.appendChild(menu);
    const room = page?.width ?? document.documentElement.clientWidth;
    const want = e.clientX - (page?.left ?? 0);
    menu.style.insetInlineStart = `${Math.max(0, Math.min(want, room - menu.offsetWidth))}px`;
    window.Rux?.menu?.open?.(menu, null);
  }

  gridEl.addEventListener('contextmenu', e => {
    const track = e.target.closest('.scheduler-track');
    if (!track || e.target.closest('.scheduler-bar, .scheduler-bar-shortcuts')) return;
    if (!shown) return;
    e.preventDefault();

    const box = track.getBoundingClientRect();
    const days = parseInt(getComputedStyle(gridEl).getPropertyValue('--scheduler-days'), 10) || 7;
    const index = Math.min(days - 1, Math.max(0, Math.floor((e.clientX - box.left) / (box.width / days))));
    cellMenuAt = {
      startDate: iso(addDays(shown, index)),
      busId: track.dataset.unassigned ? null : (track.dataset.busId || null),
    };

    popMenuAt(cellMenu, e);
  });

  /* The bar's own menu: Open trip, Take off this bus, Color and Cancel trip.
     Take off this bus makes the same write as a drop on the Unassigned row. It
     is hidden where it cannot act, on a slot with no assignment or bus, and on
     the trip in the editor, whose bars are locked. */
  gridEl.addEventListener('contextmenu', e => {
    const bar = e.target.closest('.scheduler-bar');
    if (!bar || !bar.dataset.tripId) return;
    e.preventDefault();
    e.stopPropagation();
    // On touch a hold lifts the bar for dragging and can also fire this event,
    // so the menu stays shut while a finger carries a bar.
    if (touchDragging) return;
    prepareBarMenu(bar);
    popMenuAt(barMenu, e);
  });

  barMenu?.addEventListener('click', async e => {
    const item = e.target.closest('.rux--menu-item');
    if (!item || !barMenuFor) return;
    // The Color item opens its submenu, which Design's menu does; it is no action.
    if (item.getAttribute('aria-haspopup') === 'true') return;
    const bar = barMenuFor;
    window.Rux?.menu?.close?.(barMenu);
    barMenu.hidden = true;

    if (item.id === 'scheduler-bar-menu-open') {
      const ref = barRef(bar);
      selectBar(bar);
      whenSafe(() => openRef(ref));
      return;
    }

    if (item.id === 'scheduler-bar-menu-itinerary') {
      openItinerary(bar);
      return;
    }

    if (item.id === 'scheduler-bar-menu-upload') {
      const tripId = bar.dataset.tripId;
      pickFile(file => uploadFrom(tripId, 'Itinerary', file));
      return;
    }

    if (item.id === 'scheduler-bar-menu-shortcuts') {
      openShortcutsModal(1);
      return;
    }

    if (item.id === 'scheduler-bar-menu-cancel') {
      openCancelModal(bar.dataset.tripId);
      return;
    }

    if (item.id === 'scheduler-bar-menu-hotel') {
      markHotel(bar);
      return;
    }

    // A colour saves at once, like Take off this bus: one column, no form.
    if (item.dataset.color != null) {
      const value = item.dataset.color || null;
      if (value === (bar.dataset.tripColor || null)) return;
      const label = item.querySelector('.rux--menu-item__label').textContent.trim();
      toast('info', 'Changing the trip color…');
      try {
        const { error } = await withTimeout(
          client.from('trips').update({ trip_bar_color: value }).eq('id', bar.dataset.tripId).then(r => r));
        if (error) throw new Error(error.message);
        await show();
        toast('success', value ? `The trip is ${label.toLowerCase()} now.` : 'The trip has its standard color again.');
      } catch (err) {
        toast('error', `The color did not change. ${err.message}`);
      }
      return;
    }

    if (item.id === 'scheduler-bar-menu-unassign') await takeOffBus(bar);
  });
  // The Color submenu's own close bubbles here too, and must not hide the menu.
  barMenu?.addEventListener('rux:menu-closed', e => { if (e.target === barMenu) barMenu.hidden = true; });

  // Fills the bar menu for one bar: which items apply, and the Color chips.
  function prepareBarMenu(bar) {
    barMenuFor = bar;
    document.getElementById('scheduler-bar-menu-unassign').hidden =
      !bar.dataset.assignmentId || !bar.dataset.busId || isEditorTrip(bar);
    /* The colours hide for the trip open in the editor, as Take off this bus
       does: the editor has its own colour field, and a write from here would
       move `updated_at` under it and turn its next Save into a conflict. */
    const locked = isEditorTrip(bar);
    for (const part of barMenu.querySelectorAll('[data-color-part]')) part.hidden = locked;
    // The Color item's chip is the colour the bar paints now.
    const hue = TRIP_COLORS.find(c => c.value === bar.dataset.tripColor)?.hue ?? bar.dataset.standardHue ?? 'blue';
    barMenu.querySelector('#scheduler-bar-menu-color > .rux--menu-item__icon .scheduler-swatch')
      .className = `scheduler-swatch scheduler-bar--${hue}`;
    for (const item of barMenu.querySelectorAll('[data-color]')) {
      const on = item.dataset.color === (bar.dataset.tripColor || '');
      item.setAttribute('aria-checked', String(on));
      item.querySelector('.rux--menu-item__selection-icon')
        .replaceChildren(...(on ? [svgUse('#i-checkmark', '16', '0 0 20 20')] : []));
      if (!item.dataset.color) {
        item.querySelector('.scheduler-swatch').className = `scheduler-swatch scheduler-bar--${bar.dataset.standardHue || 'blue'}`;
      }
    }
    document.getElementById('scheduler-bar-menu-itinerary').hidden = !bar.dataset.itineraryId;
    document.getElementById('scheduler-bar-menu-upload').hidden = !!bar.dataset.itineraryId || !client;
    // Mark this leg's hotel booked or not, on a trip that needs one, and not for
    // the trip open in the editor, which has its own Booked box.
    const hotelItem = document.getElementById('scheduler-bar-menu-hotel');
    hotelItem.hidden = !bar.dataset.needHotel || locked;
    hotelItem.querySelector('.rux--menu-item__label').textContent =
      bar.dataset.hotelBooked ? 'Mark hotel not booked' : 'Mark hotel booked';
  }

  /* Marks this leg's hotel booked or not. It saves at once, like a colour: one
     column, no form. The menu item and a shortcut slot both come here. */
  async function markHotel(bar) {
    if (!['outbound', 'return'].includes(bar.dataset.leg)) return;
    const booked = !bar.dataset.hotelBooked;
    toast('info', booked ? 'Marking the hotel booked…' : 'Marking the hotel not booked…');
    try {
      const { error } = await withTimeout(
        client.from('trips').update({ [`hotel_booked_${bar.dataset.leg}`]: booked })
          .eq('id', bar.dataset.tripId).then(r => r));
      if (error) throw new Error(error.message);
      await show();
      toast('success', booked ? 'The hotel is booked.' : 'The hotel is not booked.');
    } catch (err) {
      toast('error', `The hotel was not marked. ${err.message}`);
    }
  }

  // Takes a bar's trip off its bus, the same write as a drop on the Unassigned row.
  async function takeOffBus(bar) {
    const assignmentId = bar.dataset.assignmentId;
    if (!assignmentId) return;
    toast('info', 'Taking the trip off its bus…');
    try {
      // The same write the drag makes for a drop on the Unassigned row.
      const { error } = await withTimeout(
        client.from('trip_assignments').update({ bus_id: null }).eq('id', assignmentId).then(r => r));
      if (error) throw new Error(error.message);
      await show();
      refreshEditor(assignmentId);
      toast('success', 'Taken off its bus. It is in the Unassigned row.');
    } catch (err) {
      toast('error', `The trip was not moved. ${err.message}`);
    }
  }

  /* ── The itinerary panel ──
     From Carbon's xlg breakpoint up, an itinerary opens in a side panel left of
     the board, beside the trip editor. Narrower, the two panels do not fit and
     a phone frames a PDF badly, so the document link page opens it in a new tab.
     The panel fetches the file and frames a blob address of it, because a frame
     of the bucket's own address is another origin, which the page may not
     print. The browser's PDF toolbar is hidden, since Chrome's scrolls sideways
     at 30rem, and the panel's action toolbar stands in for it. The panel stays
     open through week changes and selections, like the editor, and another
     itinerary replaces the one shown. */
  const itinEl = document.getElementById('scheduler-itinerary');
  let itinFrame = document.getElementById('scheduler-itinerary-frame');
  const itinTitle = document.getElementById('scheduler-itinerary-title');
  const itinTitleCollapsed = document.getElementById('scheduler-itinerary-title-collapsed');
  const itinUploaded = document.getElementById('scheduler-itinerary-uploaded');
  const itinStatus = document.getElementById('scheduler-itinerary-status');
  const itinPrint = document.getElementById('scheduler-itinerary-print');
  const itinDownload = document.getElementById('scheduler-itinerary-download');
  const itinNewTab = document.getElementById('scheduler-itinerary-new-tab');
  const itinClose = document.getElementById('scheduler-itinerary-close');
  const itinZooms = [...document.querySelectorAll('[data-itinerary-zoom]')];
  /* Safari's PDF view, which every browser on an iPad uses too, ignores the
     zoom an address asks for and draws its own zoom controls over the page, so
     there the panel's zoom buttons are hidden rather than left doing nothing.
     No feature tells which PDF viewer a frame gets; the vendor string does. */
  if (navigator.vendor === 'Apple Computer, Inc.') for (const btn of itinZooms) btn.hidden = true;
  // The 30rem panel beside the 20rem editor, with the board still in view.
  const itinWide = matchMedia('(min-width: 82rem)');
  // The zooms Zoom in and Zoom out step through, in percent.
  const ZOOM_STEPS = [50, 75, 100, 125, 150, 200, 300];
  let itinOpener = null;
  // The file showing: its document id, its blob address, and its zoom, where
  // null is fit to width.
  let itinShown = null;
  // Counts opens, so a slow fetch that a later open overtook is dropped.
  let itinSeq = 0;
  // The document the panel is on, loaded or not, so a replace or a delete
  // elsewhere can follow it.
  let itinDocId = null;
  // The download running: its document id, and the controller that stops it.
  let itinLoading = null;
  const documentLink = id => `share/document.html?id=${encodeURIComponent(id)}`;

  /* Each load gets a new frame: a PDF viewer does not read a changed fragment
     again, and navigating a frame that has loaded adds to the tab's history,
     so Back would step through zooms. */
  function swapFrame(src) {
    const frame = itinFrame.cloneNode(false);
    if (src) frame.src = src; else frame.removeAttribute('src');
    itinFrame.replaceWith(frame);
    itinFrame = frame;
  }

  // Frames the file at its zoom, and disables the zoom that has nowhere to go.
  function frameItinerary() {
    const { blob, zoom } = itinShown;
    swapFrame(`${blob}#toolbar=0&navpanes=0&${zoom == null ? 'view=FitH' : `zoom=${zoom}`}`);
    for (const btn of itinZooms) {
      const step = btn.dataset.itineraryZoom;
      btn.disabled = step === 'fit' ? zoom == null
        : step === 'in' ? zoom === ZOOM_STEPS.at(-1)
        : zoom === ZOOM_STEPS[0];
    }
  }

  // A fit-to-width page reads as about 90%, so the first step from it is 100%
  // in or 75% out.
  function zoomItinerary(step) {
    if (!itinShown) return;
    const now = itinShown.zoom;
    if (step === 'fit') itinShown.zoom = null;
    else if (step === 'in') itinShown.zoom = ZOOM_STEPS.find(z => z > (now ?? 90)) ?? ZOOM_STEPS.at(-1);
    else itinShown.zoom = ZOOM_STEPS.findLast(z => z < (now ?? 90)) ?? ZOOM_STEPS[0];
    if (itinShown.zoom !== now) frameItinerary();
  }

  /* The actions that need the fetched file wait for it; Open in new tab does
     not. Download is a link, which has no `disabled`, so it takes Carbon's
     disabled class and leaves the tab order with its address. */
  function setItineraryReady(ready) {
    for (const btn of [...itinZooms, itinPrint]) btn.disabled = !ready;
    itinDownload.classList.toggle('rux--btn--disabled', !ready);
    if (ready) itinDownload.removeAttribute('aria-disabled');
    else {
      itinDownload.removeAttribute('href');
      itinDownload.setAttribute('aria-disabled', 'true');
    }
  }

  // The line over the frame: Carbon's inline loading for the wait, an inline
  // notification for a failure, and nothing once the file shows.
  function itineraryStatus(kind, why) {
    if (!itinStatus) return;
    itinStatus.hidden = !kind;
    if (kind === 'loading') {
      const box = el('div', 'rux--inline-loading');
      const anim = el('div', 'rux--inline-loading__animation');
      anim.appendChild(loadingSpinner());
      box.append(anim, el('div', 'rux--inline-loading__text', 'Loading the itinerary…'));
      itinStatus.replaceChildren(box);
    } else if (kind === 'error') {
      itinStatus.replaceChildren(note('error', 'The itinerary did not load.', `${why} Open in new tab still opens it.`));
    } else itinStatus.replaceChildren();
  }

  // Lets go of the file showing: a download running stops, the frame empties
  // and its blob is freed.
  function dropItinerary() {
    itinLoading?.ctrl.abort();
    itinLoading = null;
    if (itinShown) URL.revokeObjectURL(itinShown.blob);
    itinShown = null;
    setItineraryReady(false);
    itineraryStatus(null);
    swapFrame(null);
  }

  async function openDocument(trip, doc, opener) {
    if (!doc) return;
    const url = client && doc.file_path
      ? client.storage.from('trip-documents').getPublicUrl(doc.file_path).data?.publicUrl : null;
    if (!itinEl || !itinWide.matches || !url) {
      window.open(documentLink(doc.id), '_blank', 'noopener');
      return;
    }
    // The head names the trip as the editor's does: an icon, then the
    // destination, with "Itinerary" for a screen reader in place of the icon.
    const dest = trip?.destination || 'No destination';
    for (const h of [itinTitle, itinTitleCollapsed]) {
      const icon = svgUse('#i-attachment', '16', '0 0 32 32');
      icon.setAttribute('class', 'scheduler-panel-title__icon');
      h.replaceChildren(icon, el('span', 'rux--visually-hidden', 'Itinerary: '), document.createTextNode(dest));
      h.title = dest;
    }
    const when = uploadedOn(doc.created_at);
    itinUploaded.textContent = when ? `Uploaded ${when}` : '';
    itinNewTab.href = url;
    itinDocId = String(doc.id);
    if (itinEl.hidden) {
      itinOpener = opener ?? null;
      itinEl.hidden = false;
      window.Rux?.schedule?.fit?.();
    }
    itinClose?.focus();
    // The file showing, or downloading, is not fetched again, so its zoom stays.
    if (itinShown?.id === doc.id || itinLoading?.id === doc.id) return;
    const seq = ++itinSeq;
    dropItinerary();
    /* The time limit covers the whole download, not only the storage's first
       answer, and running out of it stops the download, as a close does. */
    const ctrl = new AbortController();
    itinLoading = { id: doc.id, ctrl };
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; ctrl.abort(); }, READ_TIMEOUT);
    itineraryStatus('loading');
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`The storage answered ${res.status}.`);
      // Typed as a PDF whatever the storage says, so the frame shows it.
      const file = new Blob([await res.blob()], { type: 'application/pdf' });
      if (seq !== itinSeq) return;
      itinLoading = null;
      itineraryStatus(null);
      const blob = URL.createObjectURL(file);
      itinShown = { id: doc.id, blob, zoom: null };
      itinFrame.title = `Itinerary for ${dest}`;
      itinDownload.href = blob;
      itinDownload.download = doc.file_name || 'itinerary.pdf';
      setItineraryReady(true);
      frameItinerary();
    } catch (err) {
      if (seq !== itinSeq) return;
      itinLoading = null;
      const why = timedOut ? `The storage did not send it within ${READ_TIMEOUT / 1000} seconds.`
        : err instanceof TypeError ? 'The storage could not be reached.' : err.message;
      itineraryStatus('error', why);
    } finally {
      clearTimeout(timer);
    }
  }

  for (const btn of itinZooms) {
    btn.addEventListener('click', () => {
      zoomItinerary(btn.dataset.itineraryZoom);
      // A zoom that has nowhere further to go is disabled, and would drop focus.
      if (btn.disabled) itinZooms.find(b => !b.disabled)?.focus();
    });
  }
  // The frame is a blob of this page's origin, so the page may print it. A
  // browser that refuses gets the file in a new tab, where its viewer prints.
  itinPrint?.addEventListener('click', () => {
    try {
      itinFrame.contentWindow.focus();
      itinFrame.contentWindow.print();
    } catch {
      window.open(itinNewTab.href, '_blank', 'noopener');
    }
  });

  function closeItinerary(returnFocus = true) {
    if (!itinEl || itinEl.hidden) return;
    itinEl.hidden = true;
    itinDocId = null;
    // A fetch still running is dropped, and no PDF is held while the panel is shut.
    itinSeq++;
    dropItinerary();
    window.Rux?.schedule?.fit?.();
    /* Focus goes back to what opened the panel. A Files tab row is rebuilt
       whenever the editor redraws, so its row is found again by document id;
       failing that, the selected bar takes it. */
    const opener = itinOpener;
    itinOpener = null;
    if (!returnFocus) return;
    const id = opener?.dataset.documentId;
    const target = opener?.isConnected ? opener
      : (id && panelFiles.querySelector(`[data-document-id="${CSS.escape(id)}"]`)) || selectedBar();
    target?.focus();
  }
  itinClose?.addEventListener('click', () => closeItinerary());
  // A window narrowed below xlg has no room for the panel. Focus inside it
  // goes back to the opener rather than to the page.
  itinWide.addEventListener('change', e => {
    if (!e.matches) closeItinerary(!!itinEl?.contains(document.activeElement));
  });

  // Open itinerary, from a shortcut slot or the bar menu: the trip's newest.
  function openItinerary(bar) {
    const id = bar.dataset.itineraryId;
    if (!id) return;
    const trip = panelIndex.trips.get(bar.dataset.tripId);
    const doc = trip ? itinerariesOf(trip).find(d => String(d.id) === id) : null;
    if (doc) openDocument(trip, doc, bar);
    else window.open(documentLink(id), '_blank', 'noopener');
  }

  /* ── A trip's files ──
     Upload, replace and delete write at once, not with Save, and store a file
     exactly as rux-ui does, so either app reads what the other wrote: the
     `trip-documents` bucket at `<trip id>/<milliseconds>/<file name>`, a
     `trip_documents` row, and a `record_trip_history` entry. Unlike rux-ui,
     every step's error is checked, and the order leaves a stored file at worst,
     never a row that points at nothing. Nothing here writes to `trips`, and no
     trigger on `trip_documents` does, so a file never turns the editor's next
     Save into a conflict. */
  const DOC_BUCKET = 'trip-documents';
  const DOC_LABELS = ['Itinerary', 'Contract', 'PO'];

  // rux-ui's `documentFileSlug`: accents stripped, lowercased, hyphenated.
  const docSlug = (value, fallback) => String(value ?? '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || fallback;

  // rux-ui's `buildDocumentFileName`, from the trip as saved, not as typed:
  // `<start date>_<client>_<label>_<trip ref>.pdf`.
  async function documentName(tripId, label) {
    const { data: trip, error } = await withTimeout(client.from('trips')
      .select('trip_ref,customer,start_date,booking_contact_name,trip_contact_1_name,trip_contact_2_name')
      .eq('id', tripId).single().then(r => r));
    if (error) throw new Error(error.message);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(trip.start_date ?? '') ? trip.start_date : 'unknown-date';
    const who = trip.customer || trip.booking_contact_name || trip.trip_contact_1_name || trip.trip_contact_2_name;
    const ref = trip.trip_ref || String(tripId).slice(0, 8);
    return `${[date, docSlug(who, 'unnamed'), docSlug(label, 'document'), docSlug(ref, 'trip')].join('_')}.pdf`;
  }

  // A PDF by its type or name, as rux-ui checks, and by its first bytes, so a
  // renamed file of another kind is refused.
  async function isPdf(file) {
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name || '')) return false;
    try { return (await file.slice(0, 5).text()) === '%PDF-'; } catch { return false; }
  }

  /* The history's actor is the person's rux-ui profile name, the one rux-ui
     records, found by the account's id; the platform profile's name stands in
     for an account rux-ui never saw, and with neither the function's own
     default does. Read once per page. */
  let actorPromise = null;
  const actorName = () => (actorPromise ??= (async () => {
    const uid = await personId();
    if (!uid) return null;
    for (const [schema, key] of [['public', 'user_id'], ['platform', 'id']]) {
      try {
        const { data } = await withTimeout(client.schema(schema).from('profiles')
          .select('display_name').eq(key, uid).limit(1).maybeSingle().then(r => r));
        if (data?.display_name?.trim()) return data.display_name.trim();
      } catch { /* the next source, or the default */ }
    }
    return null;
  })());

  /* One history entry as rux-ui writes it: the trip's snapshot, one `document`
     change, and the file in the metadata. A failed entry is logged and does not
     undo the file change, as in rux-ui. */
  async function recordFileHistory(tripId, action, before, after, metadata) {
    try {
      const { data: snapshot } = await withTimeout(client.from('trips')
        .select('id,trip_ref,start_date,end_date,customer,destination').eq('id', tripId).single().then(r => r));
      const args = {
        p_trip_id: tripId, p_action: action, p_snapshot: snapshot || {},
        p_changes: [{ field: 'document', label: 'Document', before, after }],
        p_metadata: metadata,
      };
      const actor = await actorName();
      if (actor) args.p_actor_name = actor;
      const { error } = await withTimeout(client.rpc('record_trip_history', args).then(r => r));
      if (error) throw new Error(error.message);
    } catch (err) {
      console.warn('The trip history entry was not written:', err);
    }
  }

  // Stores the file and adds its row. A row that fails takes the stored file
  // back out, so nothing is left behind.
  async function storeDocument(tripId, label, file) {
    const fileName = await documentName(tripId, label);
    const path = `${tripId}/${Date.now()}/${fileName}`;
    const bucket = client.storage.from(DOC_BUCKET);
    const { error: upErr } = await bucket.upload(path, file, { contentType: 'application/pdf', upsert: false });
    if (upErr) throw new Error(upErr.message);
    try {
      const { data, error } = await withTimeout(client.from('trip_documents')
        .insert({ trip_id: tripId, label, file_name: fileName, file_path: path, file_size: file.size })
        .select('id,label,created_at,file_name,file_path,file_size').single().then(r => r));
      if (error) throw new Error(error.message);
      return data;
    } catch (err) {
      bucket.remove([path]).catch(() => {});
      throw err;
    }
  }

  // The row goes first, then the stored file; a file that stays is unused and
  // only logged.
  async function unstoreDocument(doc) {
    const { error } = await withTimeout(client.from('trip_documents').delete().eq('id', doc.id).then(r => r));
    if (error) throw new Error(error.message);
    if (!doc.file_path) return;
    try {
      const { error: rmErr } = await client.storage.from(DOC_BUCKET).remove([doc.file_path]);
      if (rmErr) throw new Error(rmErr.message);
    } catch (err) {
      console.warn(`The stored file ${doc.file_path} was not removed:`, err);
    }
  }

  async function uploadDocument(tripId, label, file) {
    const doc = await storeDocument(tripId, label, file);
    await recordFileHistory(tripId, 'document_uploaded', null, `${label} uploaded`,
      { documentId: doc.id, fileName: doc.file_name });
    return doc;
  }

  // The new file is stored before the old one goes, so a failure part way
  // leaves the trip with a file. The new file has a new id.
  async function replaceDocument(tripId, old, file) {
    const doc = await storeDocument(tripId, old.label, file);
    await unstoreDocument(old);
    await recordFileHistory(tripId, 'document_replaced', old.label || 'Previous file', `${old.label || 'Document'} replaced`,
      { documentId: doc.id, fileName: doc.file_name });
    return doc;
  }

  async function deleteDocument(tripId, doc) {
    await unstoreDocument(doc);
    await recordFileHistory(tripId, 'document_deleted', doc.label || doc.file_name || 'Document', 'Deleted',
      { documentId: doc.id, fileName: doc.file_name });
  }

  /* One file dialog for every entry point: the Files tab's drop zone has its
     own input, and Replace and the bar menu's Upload itinerary use this one. */
  const filePicker = el('input', 'rux--visually-hidden');
  filePicker.type = 'file';
  filePicker.accept = '.pdf,application/pdf';
  filePicker.tabIndex = -1;
  filePicker.setAttribute('aria-hidden', 'true');
  document.body.appendChild(filePicker);
  let filePicked = null;
  filePicker.addEventListener('change', () => {
    const file = filePicker.files?.[0];
    const then = filePicked;
    filePicked = null;
    filePicker.value = '';
    if (file && then) then(file);
  });
  function pickFile(then) {
    filePicked = then;
    filePicker.click();
  }

  /* After a change: the trip's documents are read again, the open editor's
     Files list redraws from them without touching the form, and the board
     reads its week, so the bar's mark and Open itinerary follow. */
  async function refreshDocuments(tripId) {
    try {
      const { data, error } = await withTimeout(client.from('trip_documents')
        .select('id,label,created_at,file_name,file_path,file_size').eq('trip_id', tripId).then(r => r));
      if (error) throw new Error(error.message);
      for (const trip of [panelArgs?.trip, panelIndex.trips.get(tripId)]) {
        if (trip?.id === tripId) trip.trip_documents = data || [];
      }
      if (editing?.id === tripId && !panelEl.hidden) drawFiles(panelArgs?.trip);
    } catch { /* the week's read below brings the list back */ }
    await show();
  }

  /* An upload from any entry point. `item` is the Files tab's Carbon file item
     when the upload started there; elsewhere the toasts say how it went. A PO
     turns the Billing tab's PO received switch on in the open editor, which
     Save then writes, as rux-ui does. */
  async function uploadFrom(tripId, label, file, item) {
    if (!(await isPdf(file))) {
      if (item) item.fail('Only PDF files can be added', 'Export the file as a PDF, then add it again.');
      else toast('error', 'Only PDF files can be added. Export the file as a PDF, then add it again.');
      return false;
    }
    if (!item) toast('info', `Uploading ${label === 'PO' ? 'the purchase order' : `the ${label.toLowerCase()}`}…`);
    try {
      await uploadDocument(tripId, label, file);
    } catch (err) {
      if (item) item.fail('The file was not added', `${err.message} Try again.`);
      else toast('error', `The file was not added. ${err.message}`);
      return false;
    }
    item?.done();
    if (label === 'PO' && editing?.id === tripId && !panelEl.hidden) {
      const sw = document.getElementById('scheduler-f-poreceived');
      if (sw && sw.getAttribute('aria-checked') !== 'true') window.Rux?.formControls?.toggle?.(sw.closest('.rux--toggle'), true);
    }
    await refreshDocuments(tripId);
    toast('success', `${file.name} was added to the trip.`);
    return true;
  }

  function replaceFrom(tripId, old) {
    pickFile(async file => {
      if (!(await isPdf(file))) {
        toast('error', 'Only PDF files can be added. Export the file as a PDF, then try again.');
        return;
      }
      toast('info', 'Replacing the file…');
      let doc;
      try {
        doc = await replaceDocument(tripId, old, file);
      } catch (err) {
        toast('error', `The file was not replaced. ${err.message}`);
        await refreshDocuments(tripId);
        return;
      }
      await refreshDocuments(tripId);
      // The panel on the old itinerary moves to the new one.
      if (itinDocId === String(old.id)) {
        const trip = panelIndex.trips.get(tripId) ?? panelArgs?.trip;
        const fresh = trip && (trip.trip_documents || []).find(d => String(d.id) === String(doc.id));
        openDocument(trip, fresh || doc, null);
      }
      toast('success', 'The file was replaced.');
    });
  }

  let deletingDoc = null;
  function openDeleteFile(tripId, doc) {
    deletingDoc = { tripId, doc };
    document.getElementById('scheduler-file-delete-what').textContent =
      `${doc.file_name || doc.label || 'This file'}, uploaded ${uploadedOn(doc.created_at) || 'on an unknown day'}.`;
    window.Rux?.modal?.open?.('scheduler-file-delete-modal');
  }
  document.getElementById('scheduler-file-delete-confirm')?.addEventListener('click', async () => {
    const target = deletingDoc;
    deletingDoc = null;
    window.Rux?.modal?.close?.('scheduler-file-delete-modal');
    if (!target) return;
    try {
      await deleteDocument(target.tripId, target.doc);
    } catch (err) {
      toast('error', `The file was not deleted. ${err.message}`);
      return;
    }
    // The panel on the deleted file has nothing left to show.
    if (itinDocId === String(target.doc.id)) closeItinerary(false);
    await refreshDocuments(target.tripId);
    toast('success', 'The file was deleted.');
  });

  // Color from a slot opens the bar menu beside the slot, with Color's own
  // submenu already open.
  function openColorFrom(bar, slot) {
    const box = slot.getBoundingClientRect();
    prepareBarMenu(bar);
    popMenuAt(barMenu, { clientX: box.right, clientY: box.top });
    const color = document.getElementById('scheduler-bar-menu-color');
    const sub = color?.querySelector(':scope > .rux--menu');
    if (sub) window.Rux?.menu?.open?.(sub, color);
  }

  /* THE SELECTED TRIP'S SHORTCUTS. Open trip comes first on every trip; the
     person's own choices follow it, in the order they set, and an empty choice
     is left out rather than drawn. One empty slot closes the row while there is
     room for another, so Customize shortcuts is always one press away. A slot
     whose action cannot act on the trip shows disabled, with the reason as its
     label, so the slots keep their order from trip to trip. */
  /* While a trip is in the editor, the editor owns its colour, its hotel and
     its bus: a write from the board would move `updated_at` under the panel
     and turn its next Save into a conflict. The slot stays in place and says
     where to do it instead, so the row never changes shape. */
  const EDITOR_HAS = {
    color: bar => (isEditorTrip(bar) ? 'Change the color in the editor' : null),
    hotel: bar => (isEditorTrip(bar) ? 'Mark the hotel in the editor' : null),
    bus: bar => (isEditorTrip(bar) ? 'Change the bus in the editor' : null),
  };

  const SHORTCUT_ACTIONS = [
    /* Slot 1 works the editor both ways: it opens the trip, and on the very bar
       the editor holds it closes it. That is what the tab down the bar's start
       edge used to do, without taking any of the bar's writing. */
    { id: 'open', label: 'Open trip', icon: '#i-launch',
      label_for: bar => (isEditorBar(bar) ? 'Close trip' : 'Open trip'),
      icon_for: bar => (isEditorBar(bar) ? '#i-close' : '#i-launch'),
      blocked: () => null,
      run: bar => (isEditorBar(bar) ? whenSafe(() => closePanel()) : openSelected()) },
    { id: 'itinerary', label: 'Open itinerary', icon: '#i-attachment',
      blocked: bar => (bar.dataset.itineraryId ? null : 'No itinerary yet'),
      run: bar => openItinerary(bar) },
    { id: 'hotel', label: 'Mark hotel booked', icon: '#i-building',
      label_for: bar => (bar.dataset.hotelBooked ? 'Mark hotel not booked' : 'Mark hotel booked'),
      blocked: bar => (!bar.dataset.needHotel ? 'No hotel on this trip' : EDITOR_HAS.hotel(bar)),
      run: bar => markHotel(bar) },
    { id: 'color', label: 'Color', icon: '#i-color-palette',
      blocked: bar => EDITOR_HAS.color(bar), run: (bar, slot) => openColorFrom(bar, slot) },
    { id: 'unassign', label: 'Take off this bus', icon: '#i-subtract',
      blocked: bar => (!bar.dataset.assignmentId || !bar.dataset.busId ? 'Not on a bus' : EDITOR_HAS.bus(bar)),
      run: bar => takeOffBus(bar) },
    { id: 'cancel', label: 'Cancel trip…', icon: '#i-trash-can',
      blocked: () => null, run: bar => openCancelModal(bar.dataset.tripId) },
  ];
  // How many actions follow Open trip, and so how many dropdowns Customize
  // shortcuts shows.
  const SHORTCUT_SLOTS = 5;
  /* The fewest slots the bar ever shows, Open trip included. Three at the md
     slot size is 120px, which fits inside the 129px a one-day trip bar has at
     the narrowest day column, so the bar never overhangs the trip it points
     at when it is at its smallest. */
  const SHORTCUT_MIN = 3;
  const SHORTCUT_DEFAULT = ['itinerary', 'color', null, null, null];
  // Where the choice is kept when no one is signed in, as in a local preview.
  const SHORTCUT_KEY = 'rux.scheduler.shortcuts';
  let shortcutChoice = SHORTCUT_DEFAULT.slice();

  /* A stored choice is a list of known actions, or None, cut or padded to the
     number of slots; anything else is the default set. The padding is what
     reads a choice saved when there were three slots. */
  const cleanShortcuts = value => {
    if (!Array.isArray(value)) return SHORTCUT_DEFAULT.slice();
    const known = new Set(SHORTCUT_ACTIONS.map(a => a.id).filter(id => id !== 'open'));
    return Array.from({ length: SHORTCUT_SLOTS },
      (_, i) => (known.has(value[i]) ? value[i] : null));
  };

  let shortcutsDrawn = '';
  function drawShortcuts(bar) {
    /* Open trip, then the chosen actions with the empty choices left out. An
       empty slot only ever pads the row up to three, so the bar is never
       narrower than three slots and never carries a dashed circle it does not
       need. A fourth and beyond are added from the right-click menu. */
    const slots = ['open', ...shortcutChoice.filter(Boolean)];
    while (slots.length < SHORTCUT_MIN) slots.push(null);
    const key = [bar.dataset.tripId, bar.dataset.leg, bar.dataset.itineraryId,
      bar.dataset.assignmentId, bar.dataset.busId, bar.dataset.needHotel,
      bar.dataset.hotelBooked, isEditorBar(bar), slots.join()].join('|');
    // The same slots on the same bar are left alone, so a focused slot keeps focus.
    if (key === shortcutsDrawn && barShortcuts.childElementCount === slots.length) return;
    shortcutsDrawn = key;
    barShortcuts.replaceChildren(...slots.map((id, i) => {
      const btn = el('button', 'scheduler-bar-shortcut');
      btn.type = 'button';
      btn.dataset.slot = String(i + 1);
      const action = SHORTCUT_ACTIONS.find(a => a.id === id);
      if (!action) {
        btn.classList.add('scheduler-bar-shortcut--empty');
        btn.setAttribute('aria-label', 'Add a shortcut');
        btn.title = 'Add a shortcut';
        btn.appendChild(svgUse('#i-circle-dash', '16', '0 0 32 32'));
        return btn;
      }
      // Open trip and Mark hotel booked each say which way they act on this bar.
      const why = action.blocked(bar);
      const label = why ?? (action.label_for ? action.label_for(bar) : action.label);
      btn.dataset.shortcut = action.id;
      btn.setAttribute('aria-label', label);
      btn.title = label;
      if (why) btn.setAttribute('aria-disabled', 'true');
      btn.appendChild(svgUse(action.icon_for ? action.icon_for(bar) : action.icon, '16', '0 0 32 32'));
      return btn;
    }));
  }

  // A slot acts on the selected bar. An empty slot opens Customize shortcuts at
  // that slot, and a disabled one does nothing.
  barShortcuts?.addEventListener('click', e => {
    const btn = e.target.closest('.scheduler-bar-shortcut');
    const bar = selectedBar();
    if (!btn || !bar || btn.getAttribute('aria-disabled') === 'true') return;
    if (!btn.dataset.shortcut) {
      const first = shortcutChoice.findIndex(id => !id);
      openShortcutsModal(first < 0 ? SHORTCUT_SLOTS : first + 1);
      return;
    }
    SHORTCUT_ACTIONS.find(a => a.id === btn.dataset.shortcut)?.run(bar, btn);
  });

  const shortcutsModal = document.getElementById('scheduler-shortcuts-modal');
  const shortcutSelect = n => document.getElementById(`scheduler-shortcut-${n}`);
  /* Every dropdown is filled from the one table of actions, so an action added
     there is offered here without the page being touched. Open trip is not
     among them: it always comes first. */
  for (let n = 1; n <= SHORTCUT_SLOTS; n++) {
    const select = shortcutSelect(n);
    if (!select) continue;
    const none = el('option', 'rux--select-option', 'None');
    none.value = '';
    select.replaceChildren(none, ...SHORTCUT_ACTIONS.filter(a => a.id !== 'open').map(a => {
      const option = el('option', 'rux--select-option', a.label);
      option.value = a.id;
      return option;
    }));
  }

  // Opened at a dropdown: the slot pressed, or the first empty one when the
  // empty slot was pressed.
  function openShortcutsModal(slot) {
    if (!shortcutsModal) return;
    for (let n = 1; n <= SHORTCUT_SLOTS; n++) shortcutSelect(n).value = shortcutChoice[n - 1] ?? '';
    window.Rux?.modal?.open?.(shortcutsModal);
    shortcutSelect(Math.min(SHORTCUT_SLOTS, Math.max(1, slot)))?.focus();
  }
  document.getElementById('scheduler-shortcuts-save')?.addEventListener('click', () => {
    window.Rux?.modal?.close?.(shortcutsModal);
    saveShortcuts(Array.from({ length: SHORTCUT_SLOTS }, (_, i) => shortcutSelect(i + 1).value || null));
  });

  // The signed-in person's id, or null in a preview with no log-in.
  async function personId() {
    const session = await Promise.resolve(window.Rux?.account?.getSession?.()).catch(() => null);
    return session?.user?.id ?? null;
  }

  // The choice lives on the person's profile, so it follows them to every device.
  async function loadShortcuts() {
    const uid = await personId();
    try {
      if (uid) {
        const { data, error } = await withTimeout(client.schema('platform').from('profiles')
          .select('scheduler_shortcuts').eq('id', uid).maybeSingle().then(r => r));
        if (error) throw new Error(error.message);
        shortcutChoice = cleanShortcuts(data?.scheduler_shortcuts ?? null);
      } else {
        shortcutChoice = cleanShortcuts(JSON.parse(localStorage.getItem(SHORTCUT_KEY) || 'null'));
      }
    } catch { /* the default set stays */ }
    placeBarOpen();
  }

  async function saveShortcuts(choice) {
    shortcutChoice = cleanShortcuts(choice);
    placeBarOpen();
    const uid = await personId();
    if (!uid) {
      try { localStorage.setItem(SHORTCUT_KEY, JSON.stringify(shortcutChoice)); } catch { /* this visit only */ }
      toast('success', 'Shortcuts saved in this browser.');
      return;
    }
    try {
      const { error } = await withTimeout(client.schema('platform').from('profiles')
        .upsert({ id: uid, scheduler_shortcuts: shortcutChoice }).then(r => r));
      if (error) throw new Error(error.message);
      toast('success', 'Shortcuts saved.');
    } catch (err) {
      toast('error', `The shortcuts did not save. ${err.message}`);
    }
  }

  /* Cancel is not delete: `cancelled_at` takes the trip off the board and the
     row stays, so a cancelled trip can still be looked up. The reason is
     optional and stored when given. The bar menu and the Details tab's Cancel
     trip button both open the dialog through here. */
  function openCancelModal(tripId) {
    // The editor's own trip may be on another week than the one on screen.
    const trip = panelIndex.trips.get(tripId) ?? (panelArgs?.trip?.id === tripId ? panelArgs.trip : null);
    cancelling = tripId;
    document.getElementById('scheduler-cancel-what').textContent =
      `${trip?.destination || 'This trip'}${trip?.customer ? ` for ${trip.customer}` : ''}.`;
    document.getElementById('scheduler-cancel-reason').value = '';
    window.Rux?.modal?.open?.('scheduler-cancel-modal');
  }

  let cancelling = null;

  document.getElementById('scheduler-cancel-confirm')?.addEventListener('click', async () => {
    const id = cancelling;
    if (!id) return;
    const reason = document.getElementById('scheduler-cancel-reason').value.trim();
    window.Rux?.modal?.close?.('scheduler-cancel-modal');
    cancelling = null;
    toast('info', 'Cancelling the trip…');
    try {
      const patch = { cancelled_at: new Date().toISOString() };
      if (reason) patch.cancellation_reason = reason;
      const { error } = await withTimeout(client.from('trips').update(patch).eq('id', id).then(r => r));
      if (error) throw new Error(error.message);
      await show();
      // A cancelled trip leaves the board, and the editor with it.
      if (editing?.id === id && !panelEl.hidden) closePanel(false);
      toast('success', 'Trip cancelled. It is off the schedule and still on the trips list.');
    } catch (e) {
      toast('error', `The trip was not cancelled. ${e.message}`);
    }
  });

  cellMenu?.addEventListener('click', e => {
    if (!e.target.closest('#scheduler-cell-menu-new')) return;
    window.Rux?.menu?.close?.(cellMenu);
    cellMenu.hidden = true;
    if (cellMenuAt) { const at = cellMenuAt; whenSafe(() => openCreate(at)); }
  });
  cellMenu?.addEventListener('rux:menu-closed', () => { cellMenu.hidden = true; });

  /* The overflow menu's actions. Today and Drivers show only below md, where
     their toolbar buttons are hidden, and do what those buttons do. New trip
     lives only in this menu and opens a blank trip; the cell menu's New trip
     here prefills the bus and the day. */
  document.getElementById('scheduler-menu-today')?.addEventListener('click', () => {
    const menu = document.getElementById('scheduler-view-menu');
    if (menu) { window.Rux?.menu?.close?.(menu); menu.hidden = true; }
    toast(null);
    cursor = mondayOf(new Date());
    show();
  });
  document.getElementById('scheduler-menu-new-trip')?.addEventListener('click', () => {
    const menu = document.getElementById('scheduler-view-menu');
    if (menu) { window.Rux?.menu?.close?.(menu); menu.hidden = true; }
    whenSafe(() => openCreate());
  });
  document.getElementById('scheduler-panel-close')?.addEventListener('click', () => whenSafe(() => closePanel()));
  /* Escape acts where focus is. Inside the itinerary panel it closes that
     panel; inside the editor it closes the editor; on the board it clears a
     selection first. An open dialog or search keeps the key
     for itself, and so does anything that already took it -- a list or date
     picker closing, a combo box clearing -- so one press does one thing. */
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    if (document.querySelector('.rux--modal.is-visible') || searchOpen()) return;
    if (itinEl && !itinEl.hidden && itinEl.contains(document.activeElement)) {
      e.preventDefault();
      closeItinerary();
      return;
    }
    const inEditor = !!tripEl?.contains(document.activeElement) || panelEl.contains(document.activeElement);
    if (!inEditor && selectedBar()) { e.preventDefault(); clearSelection(); return; }
    if (!panelEl.hidden) { e.preventDefault(); whenSafe(() => closePanel()); }
  });

  /* ── Searching trips ──────────────────────────────────────────────────────
     The header search finds trips by destination, organization or booking
     contact across every trip, not only the week on screen, and a result opens
     its trip on its own week. Design ships no search module, so expanding,
     collapsing, the results list and its keys are all wired here. */
  const searchWrap = document.querySelector('.scheduler-header-search');
  const searchBox = document.getElementById('scheduler-search');
  const searchTrigger = document.getElementById('scheduler-search-trigger');
  const searchInput = document.getElementById('scheduler-search-input');
  const searchResults = document.getElementById('scheduler-search-results');
  const searchList = document.getElementById('scheduler-search-list');
  const searchCount = document.getElementById('scheduler-search-count');
  const searchNoteEl = document.getElementById('scheduler-search-note');
  const searchClear = document.getElementById('scheduler-search-clear');

  /* Expanding sets three things together: Carbon's CSS keys the width off
     `--expanded`, the magnifier reports state through `aria-expanded`, and the
     input is `tabindex=-1` while collapsed so Tab cannot land in a 0px field. */
  const EXPANDED = 'rux--search--expanded';

  function expandSearch() {
    searchBox?.classList.add(EXPANDED);
    searchTrigger?.setAttribute('aria-expanded', 'true');
    if (searchInput) { searchInput.tabIndex = 0; searchInput.focus(); }
  }

  // Collapsing clears the field, as Carbon's expandable search does, so no
  // query is left hidden inside a bare magnifier.
  function collapseSearch() {
    searchBox?.classList.remove(EXPANDED);
    searchTrigger?.setAttribute('aria-expanded', 'false');
    if (searchInput) { searchInput.value = ''; searchInput.tabIndex = -1; }
    searchClear?.classList.add('rux--search-close--hidden');
    showResults(false);
  }

  const searchOpen = () => searchBox?.classList.contains(EXPANDED);
  const toggleSearch = () => { if (searchOpen()) collapseSearch(); else expandSearch(); };

  // Carbon's magnifier is a `role=button` div, so Enter and Space are wired by
  // hand.
  searchTrigger?.addEventListener('click', toggleSearch);
  searchTrigger?.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSearch(); }
  });

  /* A press outside collapses the search, since the expanded field covers the
     magnifier. The test is the wrapper, not `#scheduler-search`, because the
     results panel is its sibling inside `.scheduler-header-search` and a press
     on the list must not collapse it. */
  document.addEventListener('pointerdown', e => {
    if (!searchOpen()) return;
    if (searchWrap.contains(e.target)) return;
    collapseSearch();
  });

  /* Tabbing away collapses it too. The options are `tabindex=-1` in an
     activedescendant listbox, so Tab leaves the widget rather than walking it.
     `relatedTarget` covers a Tab; the deferred check covers focus leaving for
     the window or a non-focusable press, without collapsing on the way to the
     clear button. */
  searchWrap?.addEventListener('focusout', e => {
    if (!searchOpen()) return;
    const to = e.relatedTarget;
    if (to && searchWrap.contains(to)) return;
    setTimeout(() => {
      if (searchOpen() && !searchWrap.contains(document.activeElement)) collapseSearch();
    }, 0);
  });

  /* Every trip that is not cancelled is searched, newest first, in three plain
     columns on `trips`: `customer` (the organization), `destination` and
     `booking_contact_name`, so no join is needed.

     The query is sanitised first because PostgREST parses `or=(...)` as a
     list: a typed comma, parenthesis or backslash would re-parse into other
     filters, and `%` or `*` would widen the match. One more than `SEARCH_CAP`
     is fetched, so the count can say "more than" without counting the table. */
  const SEARCH_MIN = 2;
  const searchSafe = q => q.replace(/[,()\\%*]/g, ' ').replace(/\s+/g, ' ').trim();

  async function searchTrips(q) {
    const safe = searchSafe(q);
    if (safe.length < SEARCH_MIN) return { rows: [] };
    const like = `*${safe}*`;
    const { data, error } = await client.from('trips')
      .select('id,destination,customer,booking_contact_name,start_date')
      .is('cancelled_at', null)
      .or(`destination.ilike.${like},customer.ilike.${like},booking_contact_name.ilike.${like}`)
      .order('start_date', { ascending: false })
      .limit(SEARCH_CAP + 1);
    if (error) throw new Error(error.message);
    return { rows: data || [] };
  }

  /* Replies can land out of order, so a slow reply for "dal" could replace one
     for "dallas". Each run takes the next `searchSeq`, and a reply that is no
     longer the latest is dropped. */
  let searchSeq = 0;
  let searchTimer = 0;
  /* The current option is an index, not an element, because the list is
     rebuilt on every search. `optionAt` only mints ids and never resets, so a
     stale `aria-activedescendant` cannot name an option from a newer render. */
  let activeAt = -1;
  let optionAt = 0;

  const searchOptions = () => [...searchList.querySelectorAll('[role="option"]')];

  /* Moves the highlight without moving focus: `aria-selected` for a screen
     reader, the class for the eye, and `aria-activedescendant` on the field to
     connect them while the query stays editable. The option scrolls into the
     height-capped list only when it is out of view. */
  function setActive(i) {
    const opts = searchOptions();
    activeAt = i;
    opts.forEach((o, n) => {
      const on = n === i;
      o.setAttribute('aria-selected', String(on));
      o.classList.toggle('scheduler-search__opt--active', on);
    });
    const cur = opts[i];
    if (cur) {
      searchInput?.setAttribute('aria-activedescendant', cur.id);
      cur.scrollIntoView({ block: 'nearest' });
    } else {
      searchInput?.removeAttribute('aria-activedescendant');
    }
  }

  // Wraps at both ends; Up with nothing highlighted goes to the last row.
  function moveActive(by) {
    const opts = searchOptions();
    if (!opts.length) return;
    if (activeAt === -1) setActive(by > 0 ? 0 : opts.length - 1);
    else setActive((activeAt + by + opts.length) % opts.length);
  }

  // Hidden when there is nothing to show, so no empty box hangs under the header.
  function showResults(on) {
    if (!searchResults) return;
    searchResults.hidden = !on;
    searchInput?.setAttribute('aria-expanded', String(!!on));
    if (!on) {
      searchList.replaceChildren();
      searchCount.hidden = true;
      searchNoteEl.hidden = true;
      setActive(-1);
    }
  }

  /* Bolds every case-insensitive occurrence of the sanitised query, the text
     the database matched, so a row shows why it is there. Built from text
     nodes, never HTML, because every value is a customer's data. */
  function mark(text, cls, needle) {
    const span = el('span', cls);
    const hay = String(text ?? '');
    if (!needle) { span.textContent = hay; return span; }
    const lower = hay.toLowerCase(), find = needle.toLowerCase();
    let at = 0, i = lower.indexOf(find);
    if (i === -1) { span.textContent = hay; return span; }
    while (i !== -1) {
      if (i > at) span.appendChild(document.createTextNode(hay.slice(at, i)));
      const hit = el('strong', 'scheduler-search__hit');
      hit.textContent = hay.slice(i, i + find.length);
      span.appendChild(hit);
      at = i + find.length;
      i = lower.indexOf(find, at);
    }
    if (at < hay.length) span.appendChild(document.createTextNode(hay.slice(at)));
    return span;
  }

  /* A note is not a result, so it sits beside the listbox, whose children must
     be options, and the list is emptied so `aria-activedescendant` cannot name
     an option no longer drawn. The parts are static in index.html, so the
     field's `aria-controls` names an id the app check can resolve. */
  function searchNote(text) {
    searchList.replaceChildren();
    setActive(-1);
    searchCount.hidden = true;
    searchNoteEl.textContent = text;
    searchNoteEl.hidden = false;
    showResults(true);
  }

  async function runSearch() {
    if (!searchResults) return;
    const q = (searchInput.value || '').trim();
    searchClear?.classList.toggle('rux--search-close--hidden', !q);
    const mine = ++searchSeq;
    if (!q) { showResults(false); return; }
    if (searchSafe(q).length < SEARCH_MIN) { searchNote(`Type ${SEARCH_MIN} characters or more.`); return; }
    searchNote('Searching…');
    let found;
    try {
      found = await searchTrips(q);
    } catch (e) {
      if (mine === searchSeq) searchNote(String(e && e.message ? e.message : e));
      return;
    }
    if (mine !== searchSeq) return;          // a later keystroke already owns the list
    const rows = found.rows;
    const safe = searchSafe(q);
    // Not a dead end: the note names the three fields searched, since a bus
    // number or a driver's name finds nothing here.
    if (!rows.length) {
      searchNote(`No trip matches "${q}". This looks in the destination, the organization and the booking contact.`);
      return;
    }

    showResults(true);
    setActive(-1);
    // Carbon's search pattern always shows the number of results. Past
    // `SEARCH_CAP` the figure is a floor, and it says so.
    searchCount.textContent = rows.length > SEARCH_CAP
      ? `More than ${SEARCH_CAP} trips match`
      : `${rows.length} trip${rows.length === 1 ? '' : 's'} match${rows.length === 1 ? 'es' : ''}`;
    searchCount.hidden = false;
    searchNoteEl.hidden = true;
    const list = searchList;
    list.replaceChildren();
    for (const trip of rows.slice(0, SEARCH_CAP)) {
      /* Carbon's contained list wraps each item, and a listbox's children must
         be options, so the wrapper is `presentation` and the button is the
         option; it stays a <button> for the click, hover and focus ring.
         `tabindex=-1` because focus stays in the field and the arrow keys reach
         the options. */
      const row = el('div', 'rux--contained-list-item rux--contained-list-item--clickable');
      row.setAttribute('role', 'presentation');
      const btn = el('button', 'rux--contained-list-item__content');
      btn.type = 'button';
      btn.setAttribute('role', 'option');
      btn.setAttribute('aria-selected', 'false');
      btn.id = `scheduler-search-opt-${optionAt++}`;
      btn.tabIndex = -1;
      // A result can be on any week, so it shows its date.
      const when = trip.start_date ? parseISO(trip.start_date).toLocaleDateString(undefined,
        { year: 'numeric', month: 'short', day: 'numeric' }) : 'No date';
      /* The destination with the date beside it, which forms a column down the
         list; then the organization and booking contact joined on one line,
         since the contact is often empty. */
      const head = el('div', 'scheduler-search__head');
      head.append(
        mark(trip.destination || 'No destination', 'scheduler-search__dest', safe),
        el('span', 'scheduler-search__when', when),
      );
      btn.append(
        head,
        mark([trip.customer, trip.booking_contact_name].filter(Boolean).join(' · ') || 'No organization',
          'scheduler-search__meta', safe),
      );
      /* Going to a result moves to the week of its start date, reads it, then
         selects the trip's bar and opens it through `whenSafe`. A trip with no
         bar on that week still moves the week, and a toast says so. */
      btn.addEventListener('click', async () => {
        collapseSearch();
        if (!trip.start_date) return;
        cursor = mondayOf(parseISO(trip.start_date));
        await show();
        const bar = gridEl.querySelector(`.scheduler-bar[data-trip-id="${CSS.escape(trip.id)}"]`);
        if (!bar) { toast('info', 'That week is showing', 'The trip has no bar on it — it may have no bus yet.'); return; }
        bar.scrollIntoView({ block: 'center', inline: 'center' });
        const ref = barRef(bar);
        selectBar(bar);
        if (!isEditorBar(bar)) whenSafe(() => openRef(ref));
      });
      row.appendChild(btn);
      list.appendChild(row);
    }
    if (rows.length > SEARCH_CAP) {
      searchNoteEl.textContent = 'Narrow the search to see the rest.';
      searchNoteEl.hidden = false;
    }
  }

  searchInput?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(runSearch, 200);
  });
  searchClear?.addEventListener('click', () => { searchInput.value = ''; runSearch(); searchInput.focus(); });

  /* The arrows, Home and End walk the results, and Enter takes the highlighted
     row or else the first. Escape is two-stage, because Carbon's escape leaves
     the menu, not the search: with the list open it closes the list and keeps
     the query, and with it closed the document handler below collapses the
     field. These listen on the field, so they cannot take a key the editor or
     the board wants. */
  searchInput?.addEventListener('keydown', e => {
    const open = !searchResults.hidden && searchOptions().length > 0;
    switch (e.key) {
      case 'ArrowDown': if (open) { e.preventDefault(); moveActive(1); } break;
      case 'ArrowUp':   if (open) { e.preventDefault(); moveActive(-1); } break;
      case 'Home':      if (open) { e.preventDefault(); setActive(0); } break;
      case 'End':       if (open) { e.preventDefault(); setActive(searchOptions().length - 1); } break;
      case 'Enter': {
        if (!open) break;
        e.preventDefault();
        const opts = searchOptions();
        (opts[activeAt] ?? opts[0])?.click();
        break;
      }
      case 'Escape':
        if (!searchResults.hidden) { e.preventDefault(); e.stopPropagation(); showResults(false); }
        break;
    }
  });

  // A hover moves the highlight too, so the mouse and the keyboard agree on
  // which row Enter takes.
  searchList?.addEventListener('pointermove', e => {
    const opt = e.target.closest('[role="option"]');
    if (!opt) return;
    const at = searchOptions().indexOf(opt);
    if (at !== -1 && at !== activeAt) setActive(at);
  });

  /* Cmd-K or Ctrl-K toggles the search through the magnifier's own toggle, so
     `aria-expanded` stays in step. Escape collapses an open search. */
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && !e.altKey && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      toggleSearch();
    }
    if (e.key === 'Escape' && searchOpen()) { e.preventDefault(); collapseSearch(); }
  });
  // A click on empty board space puts the selection down. A click on a bar is
  // app.js's toggle and opens nothing; a click on a bar's button is the button's.
  gridEl.addEventListener('click', e => {
    if (e.target.closest('.scheduler-bar, .scheduler-bar-shortcuts') || !e.target.closest('.scheduler-track')) return;
    clearSelection();
  });

  // -- the week, and moving between them ------------------------------------
  let cursor = mondayOf(new Date());
  let shown = null;   // the week actually on screen, which is not `cursor` mid-fetch
  // The read in flight, and whether anything asked for another while it ran.
  let reading = null;
  let readAgain = false;

  /* One read at a time, and the last ask always gets its own. A week change or
     a save that asks while a week is loading is queued, not dropped, so the
     board always ends on `cursor` and on the data as it is after the save.
     Every caller gets the same promise, which settles once nothing is left to
     read, so `await show()` means the board is current. */
  function show() {
    if (reading) { readAgain = true; return reading; }
    reading = (async () => {
      try {
        do { readAgain = false; await readWeek(); } while (readAgain);
      } finally {
        reading = null;
      }
    })();
    return reading;
  }

  async function readWeek() {
    if (!client) {
      schEl.hidden = true;
      say('error', 'Not connected', 'The account script did not load, so this page has no way to reach the schedule. It is served from the site root and is missing here.');
      return;
    }

    // The label moves to the asked week before the read, and the grid dims
    // rather than clearing, so a press shows at once and the last week stays
    // readable.
    const asked = cursor;
    setRange(asked, addDays(asked, 6));
    schEl.setAttribute('aria-busy', 'true');
    // Only a week already on screen dims; before the first one, the grid is
    // the skeleton and stays at full strength.
    if (shown) gridEl.classList.add('scheduler-grid--busy');

    try {
      const data = await read(asked);
      // A newer ask for a different week is queued: this one is not drawn.
      if (readAgain && iso(cursor) !== iso(asked)) return;
      render(data);
      shown = asked;
    } catch (e) {
      // A queued read follows and reports for itself.
      if (readAgain) return;
      // A failed read keeps the last good week on screen and puts its label
      // back; only a first load, with nothing drawn yet, hides the grid.
      if (shown) setRange(shown, addDays(shown, 6));
      else schEl.hidden = true;
      const why = String(e && e.message ? e.message : e);
      say('error', 'Could not load that week', shown
        ? `${why} Still showing the week that did load.`
        : why);
    } finally {
      schEl.removeAttribute('aria-busy');
      gridEl.classList.remove('scheduler-grid--busy');
    }
  }

  /* ── The week picker ───────────────────────────────────────────────────────
     The week label opens the picker through `data-rux-open`. The picker is
     built here, like the trip editor's date fields, from `DP_CONTAINER.single`
     and `calendarBody()`, with no label and no icon because the week label is
     its trigger.

     The root sits inside the week row, after the heading, holding only a
     hidden input. date-picker.js positions the calendar below the root and
     does not portal it, so the calendar drops from the row's bottom edge. */
  const weekRow = document.getElementById('scheduler-weekrow');
  if (weekRow && rangeEl) {
    const root = el('div', 'rux--date-picker rux--date-picker--next rux--date-picker--single');
    root.id = 'scheduler-week-picker';
    const container = el('div', DP_CONTAINER.single);
    const wrap = el('div', 'rux--date-picker-input__wrapper');
    const span = el('span');
    weekInput = el('input', 'rux--date-picker__input');
    weekInput.type = 'text';
    weekInput.id = 'scheduler-week-date';
    // Hidden, because the week label shows the value; rux-overrides.css
    // carries the rule that keeps a hidden picker input hidden.
    weekInput.hidden = true;
    span.appendChild(weekInput);
    wrap.appendChild(span);
    container.appendChild(wrap);
    root.append(container, calendarBody());
    weekRow.appendChild(root);
    rangeEl.setAttribute('data-rux-open', root.id);

    // A pick moves to the week containing the picked day, which `mondayOf`
    // finds with the Sunday-start preference applied.
    weekInput.addEventListener('change', () => {
      if (valueSetBySelf) return;
      const picked = parseISO(weekInput.value);
      if (!picked || Number.isNaN(picked.getTime())) return;
      const next = mondayOf(picked);
      if (shown && iso(next) === iso(shown)) return;   // same week, nothing to redraw
      toast(null);
      cursor = next;
      show();
    });

    window.Rux?.datePicker?.init?.(weekRow);

    /* `aria-expanded` is kept here because date-picker.js sets no state on a
       page-owned trigger. The module detaches the calendar container on close
       and re-inserts it on open, so its presence in the root is the open
       state. */
    const syncExpanded = () => {
      rangeEl.setAttribute(
        'aria-expanded',
        root.querySelector('.rux--date-picker__calendar-container') ? 'true' : 'false',
      );
    };
    new MutationObserver(syncExpanded).observe(root, { childList: true });
    syncExpanded();
  }

  /* Changing the week drops the toast. An undo for a move on the old week
     would still work, by assignment id, and silently move a trip no longer on
     screen. */
  const go = days => { toast(null); cursor = addDays(cursor, days); show(); };
  document.getElementById('scheduler-prev')?.addEventListener('click', () => go(-7));
  document.getElementById('scheduler-next')?.addEventListener('click', () => go(7));
  document.getElementById('scheduler-today')?.addEventListener('click', () => { toast(null); cursor = mondayOf(new Date()); show(); });

  /* The schedule needs a staff account. /funnel.js opens this page only for an
     account with Scheduler, and /account.js sends a log-in that ends to the
     log-in page. The board and its search wait for the staff profile. An
     account without one, a profile that would not load, or a local preview
     without ?cloud gets a notice in their place, and nothing is read. */
  const boardEl = document.querySelector('.scheduler-board');
  const stop = (kind, title, subtitle) => {
    if (boardEl) boardEl.hidden = true;
    if (searchWrap) searchWrap.hidden = true;
    say(kind, title, subtitle);
  };

  (async () => {
    const account = window.Rux?.account;
    if (!account?.staffProfile) {
      stop('info', 'This preview has no log-in', 'Add ?cloud to the address to load the schedule.');
      return;
    }
    let staff;
    try { staff = await account.staffProfile(); } catch {
      stop('error', 'Could not load the schedule', 'Reload the page to try again.');
      return;
    }
    if (!staff) {
      stop('info', "This account isn't set up as staff yet", 'Ask the owner to set it up.');
      return;
    }
    show();
    loadShortcuts();
  })();
})();
