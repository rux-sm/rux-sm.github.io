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

  /* The three letters a compact block carries in place of a destination that
     will not fit in a day column. Initials where the place is more than one
     word and the first three letters where it is one, which is how the office
     already says them: San Antonio is SA, Corpus Christi is CC, Laredo is LAR.
     The trailing state comes off first, because six destinations in ten end in
     one and a phone does not need it, and the small joining words go with it so
     that Port of Brownsville is PB. Three at most. The bar's `aria-label` keeps
     the whole name, so nothing is lost to a screen reader. */
  const CODE_SKIP = new Set(['of', 'the', 'at', 'on', 'and']);
  const destCode = dest => {
    const words = String(dest || '')
      .replace(/,\s*[A-Za-z]{2}\.?\s*$/, '')
      .split(/[\s\-/]+/)
      .map(w => w.replace(/[^A-Za-z0-9]/g, ''))
      .filter(w => w && !CODE_SKIP.has(w.toLowerCase()));
    if (!words.length) return '';
    return (words.length > 1 ? words.map(w => w[0]).join('') : words[0]).slice(0, 3).toUpperCase();
  };

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
    // The vehicle the trip needs, `Coach` or `Van`; null is any.
    'vehicle_type',
    // Each leg's hotel: the bar's hotel mark, its menu item and the Details tab.
    'hotel_booked_outbound', 'hotel_booked_return',
    'hotel_itinerary_number_outbound', 'hotel_itinerary_number_return',
    // The roles an assignment turns on, and who fills them: the drivers row.
    // The Fleet tab edits each seat by its row id, with its relief swap time and note.
    'trip_assignments(id,bus_id,position,leg,active_roles,trip_drivers(id,driver_id,role,report_time,instructions))',
    // The trip's documents: the itinerary shortcut, the bar's mark, the Files tab
    // and the itinerary panel, which frames the file at its path.
    'trip_documents(id,label,created_at,file_name,file_path,file_size)',
    // Set in the Files tab; a trip that does not need an itinerary is not marked.
    'itinerary_not_needed',
    // Its twin for the day-of contact: a trip nobody needs to be called on is
    // not marked as missing one.
    'contact_not_needed',
    'booking_contact_id',
    'contacts:booking_contact_id(id,name,phone,email,client)',
    // The trip's own copy of the booking contact, which rux-ui reads and writes.
    'booking_contact_name', 'booking_contact_phone', 'booking_contact_email',
    // The booking's email thread, a link rux-ui stores beside the contact.
    'booking_contact_missive_url',
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
    'est_miles,actual_miles',
    // The PO and invoice switches' flags, and the contract note.
    'contract_note,po_received,invoiced',
    // Save inserts, updates and deletes payment rows one at a time, by id.
    'trip_payments(id,position,amount,method,date,ref)',
    // POs and invoices, one row each, written by id like the payments.
    'trip_pos(id,position,ref,amount,date)',
    'trip_invoices(id,position,number,amount,date)',
    // `miles` sums to the estimate a trip without its own shows. The rest are
    // what the Route tab edits on a leg's pickup, drop-off and return rows.
    'trip_stops(id,position,leg,type,label,name,address,lat,lng,mapbox_id,depart_prev,arrive,spot,'
      + 'depart_prev_date,arrive_date,spot_date,miles,drive,miles_source,drive_source)',
  ].join(',');

  /* A hung connection never rejects, so a request races this timeout and the
     catch runs. An abandoned write may still land, so its error carries
     `timedOut` and a save treats it as possibly written. */
  const READ_TIMEOUT = 15000;
  /* How far either side of the week asked for one read reaches, in days. Four
     weeks: a swipe draws from what is in hand, and four of them in a row still
     do, which is further than anyone swipes before the next read lands. Every
     week within it is drawn without the network, so this is the one number that
     decides how far a run of swipes stays smooth. */
  const NEAR_DAYS = 28;
  const withTimeout = promise => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(
      () => reject(Object.assign(
        new Error(`The schedule did not answer within ${READ_TIMEOUT / 1000} seconds.`), { timedOut: true })),
      READ_TIMEOUT)),
  ]);

  async function read(weekStart) {
    const weekEnd = addDays(weekStart, 6);
    /* Four weeks either side come with the week asked for, so a run of swipes
       draws from what is in hand rather than stopping at the second one to wait
       on the network. It costs one widened window and no second query: a trip
       that started before the week can still run through it, so this already
       reached 90 days back, and carrying 28 days at each end rather than 7
       takes the one read from 111 days to 153. The exact overlap is decided
       per leg in `render`, not by this filter, which is what lets one payload
       draw nine weeks. */
    const from = addDays(weekStart, -NEAR_DAYS);
    const to = addDays(weekEnd, NEAR_DAYS);
    const lo = iso(addDays(from, -90));
    const hi = iso(to);
    const unwrap = r => { if (r.error) throw new Error(r.error.message); return r.data ?? []; };

    const [buses, trips, drivers, contacts, oos, timeOff] = await withTimeout(Promise.all([
      client.from('buses').select('id,number,capacity,type,status,sort_order,ada_lift,sleeper,year,make,model,color,vin').order('sort_order').then(unwrap),
      // A cancelled trip stays in the table but is not on the schedule.
      client.from('trips').select(TRIP_COLUMNS).is('cancelled_at', null)
        .gte('start_date', lo).lte('start_date', hi).order('start_date').then(unwrap),
      // `status`, so the Fleet tab offers active drivers; `priority`, so the
      // roster lists them in the order they are called on.
      client.from('drivers').select('id,name,short_name,status,priority').then(unwrap),
      // Every contact, read once with the week for the contact search rather
      // than on each keystroke.
      client.from('contacts').select('id,name,phone,email,client').order('name').then(unwrap),
      client.from('bus_out_of_service').select('bus_id,start_date,end_date,reason').lte('start_date', hi).gte('end_date', iso(from)).then(unwrap),
      // Overlap, not containment: a driver away across the whole fortnight has
      // neither date inside this week and is still away every day of it.
      client.from('driver_time_off').select('driver_id,start_date,end_date,reason').lte('start_date', hi).gte('end_date', lo).then(unwrap),
      /* rux-ui's settings this app follows: the billing workflow, the yard and
         the Mapbox token the Route tab looks drives up with. A refused read
         keeps what was there, as rux-ui does. */
      client.from('settings').select('key,value')
        .in('key', ['billing-workflow-v1', 'yard-location-v1', 'mapbox-token-v1'])
        .then(r => {
          if (r.error) return;
          const byKey = new Map((r.data || []).map(row => [row.key, row.value]));
          setBillingWorkflow(byKey.get('billing-workflow-v1'));
          const yard = byKey.get('yard-location-v1');
          if (yard?.lat != null && yard?.lng != null) yardPlace = yard;
          if (typeof byKey.get('mapbox-token-v1') === 'string') mapboxToken = byKey.get('mapbox-token-v1');
        }),
    ]));
    // The fleet is never empty, so an empty one is a read the database refused,
    // which is what an ended log-in or removed access looks like; a reload
    // sends the account where it can go.
    if (!buses.length) throw new Error('The schedule came back empty. Reload the page.');
    // Each driver's status on these trips, from the table rux-ui and the driver
    // page write, keyed as `statusKey` builds it.
    const statusRows = trips.length ? await withTimeout(
      client.rpc('get_trip_driver_statuses', { p_trip_ids: trips.map(t => t.id) }).then(unwrap)) : [];
    const statuses = new Map(statusRows.map(r => [statusKey(r.tripId, r.driverId, r.leg, r.role), r]));
    return { buses, trips, drivers, contacts, oos, timeOff, statuses, weekStart, weekEnd };
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

  /* The warning for a bus of another type than the trip needs, or null. A trip
     with no type takes any bus, and a bus with no type is not a mismatch. */
  function wrongType(type, bus) {
    if (!type || !bus?.type || bus.type === type) return null;
    const a = t => (/^[aeiou]/i.test(t) ? `an ${t}` : `a ${t}`);
    return `Needs ${a(type)}, bus ${bus.number} is ${a(bus.type)}`;
  }

  // -- drawing --------------------------------------------------------------
  const addRow = (bar, cls, ...parts) => {
    const r = el('div', `scheduler-bar__row ${cls}`);
    for (const p of parts) if (p != null) r.appendChild(p);
    bar.appendChild(r);
  };
  // Twelve-hour, "7:50am", or "7:50a" with `short`. `|| 12` turns hour 0 and
  // hour 12 into 12.
  const hhmm = (t, short) => {
    if (!t) return '';
    const [h, m] = String(t).split(':');
    const hr = Number(h);
    if (!Number.isFinite(hr) || m === undefined) return String(t).slice(0, 5);
    return `${hr % 12 || 12}:${m}${hr < 12 ? 'a' : 'p'}${short ? '' : 'm'}`;
  };

  /* A bar's times row holds a long form, "2:10pm – 12:30am", and a short one,
     "2:10p–12:30a", which fits the narrowest day column. The short one shows
     only on a bar too narrow for the long, measured, because the width a time
     needs depends on its digits. Rows are all reset, then all read, then all
     set, so the board lays out twice rather than once per bar. */
  function fitTimes() {
    const rows = [...gridEl.querySelectorAll('.scheduler-bar__time')];
    for (const r of rows) r.classList.remove('scheduler-bar__time--short');
    const narrow = rows.filter(r => r.clientWidth && r.firstElementChild.scrollWidth > r.clientWidth);
    for (const r of narrow) r.classList.add('scheduler-bar__time--short');
  }

  /* How many marks a bar draws. A mark is a square the height of a row, and
     the row it sits in is as wide as the day column, so the narrowest bar
     holds five and a trip can raise seven. The ones past what fits would be
     cut off by the row's own overflow, saying nothing; instead the last that
     fits becomes a "+N" chip carrying the rest, so the bar still counts what
     is pending. Rows are all reset, then all read, then all set, as
     `fitTimes` does. */
  function fitMarks() {
    const boxes = [...gridEl.querySelectorAll('.scheduler-bar__warn')];
    // Reset: every mark back, every count away.
    for (const box of boxes) {
      for (const chip of box.children) chip.hidden = chip.classList.contains('scheduler-bar__warn-more');
    }
    /* Read. A chip and the gaps around it are the same on every bar, so one
       drawn chip is measured and every other bar counted from it. Drawn is
       what the probe insists on: the copy on the destination row is there in
       every bar and shown in none of them until the notes row is turned off,
       and a box nobody draws measures nothing. */
    const probe = boxes.find(b => b.getBoundingClientRect().width);
    if (!probe) return;
    const chipW = probe.firstElementChild.getBoundingClientRect().width;
    const gap = parseFloat(getComputedStyle(probe).columnGap) || 0;
    const rowGap = parseFloat(getComputedStyle(probe.parentElement).columnGap) || 0;
    const plans = boxes.map(box => {
      const row = box.parentElement;
      if (!box.getBoundingClientRect().width) return null;
      /* What the row leaves once everything before the marks has given way to
         nothing: its width, less the gap each of those still takes, less the
         leg reference, which is `flex: none` and so gives way to nothing. */
      const ref = row.querySelector('.scheduler-bar__ref');
      const room = row.clientWidth - [...row.children].indexOf(box) * rowGap
        - (ref ? ref.getBoundingClientRect().width : 0);
      const total = box.children.length - 1;
      const fits = Math.floor((room + gap) / (chipW + gap));
      return fits < total ? { box, total, show: Math.max(1, fits) } : null;
    });
    // Set.
    for (const p of plans) {
      if (!p) continue;
      const chips = [...p.box.children];
      for (let i = p.show - 1; i < p.total; i++) chips[i].hidden = true;
      const more = chips[p.total];
      more.hidden = false;
      more.textContent = `+${p.total - p.show + 1}`;
      more.title = chips.slice(p.show - 1, p.total).map(c => c.title).join(', ');
    }
  }

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

  /* A driver's role and status on a bar. The roles are rux-ui's four, in the
     order the drivers row lists them. Relief is the one role that is not a
     person, so it cannot be taken for a co-driver at 12px. */
  const ROLES = [
    { role: 'driver', label: 'Driver', icon: '#i-user', box: '0 0 16 16' },
    { role: 'co-driver', label: 'Co-driver', icon: '#i-user', box: '0 0 16 16' },
    { role: 'relief-start', label: 'Relief start', icon: '#i-channels', box: '0 0 32 32' },
    { role: 'relief-end', label: 'Relief end', icon: '#i-channels', box: '0 0 32 32' },
  ];
  /* The five states `trip_driver_statuses` holds, and the tone each paints.
     Not sent is grey rather than no disc at all: it is the first step of the
     run, not the absence of one. Its stored value stays `off`, which is what
     rux-ui writes. */
  const DRIVER_STATUSES = [
    { value: 'off', label: 'Not sent', tone: 'off' },
    { value: 'pending-assignment', label: 'Pending assignment', tone: 'error' },
    { value: 'pending-response', label: 'Pending response', tone: 'warning' },
    { value: 'confirmed', label: 'Confirmed', tone: 'success' },
    { value: 'declined', label: 'Declined', tone: 'error' },
  ];
  // A status row's identity, as rux-ui keys it: trip, driver, leg and role.
  const statusKey = (tripId, driverId, leg, role) =>
    [tripId, driverId, leg || 'outbound', role || 'driver'].join(':');

  // The tone names rux-ui once saved in place of a status.
  const LEGACY_STATUS = { default: 'off', danger: 'pending-assignment', warning: 'pending-response', success: 'confirmed' };

  /* The roles an assignment turns on, each with the status rux-ui once saved
     after it as `role:state`, which a trip with no status row still shows. An
     assignment without the column keeps every role it has a driver in, and
     the driver role is always on. */
  function activeRolesOf(assign) {
    const on = new Map([['driver', 'off']]);
    const saved = Array.isArray(assign.active_roles)
      ? assign.active_roles.map(String)
      : (assign.trip_drivers || []).map(d => d.role || 'driver');
    for (const entry of saved) {
      const [role, state] = entry.split(':');
      on.set(role, LEGACY_STATUS[state] ?? state ?? 'off');
    }
    return on;
  }

  /* An assignment's crew in role order: each driver in a role that is on, with
     their status, and each role that is on with nobody in it. */
  function crewOf(trip, assign, driversById, statuses) {
    const on = activeRolesOf(assign);
    const leg = assign.leg || 'outbound';
    const crew = [];
    for (const r of ROLES) {
      if (!on.has(r.role)) continue;
      const filled = (assign.trip_drivers || []).filter(d => d.driver_id && (d.role || 'driver') === r.role);
      for (const d of filled) {
        const row = statuses?.get(statusKey(trip.id, d.driver_id, leg, r.role)) ?? null;
        const value = row ? row.status : on.get(r.role);
        crew.push({
          ...r, leg, row, driverId: d.driver_id, who: driversById.get(d.driver_id),
          status: DRIVER_STATUSES.find(x => x.value === value) ?? DRIVER_STATUSES[0],
        });
      }
      if (!filled.length) crew.push({ ...r, leg, needed: true });
    }
    return crew;
  }

  const crewName = c => (c.who ? (c.who.short_name || c.who.name) : 'Unknown driver');

  // When a status was set, as "Sep 12, 3:40 PM" on this computer's clock.
  const setAt = at => {
    const d = new Date(at || '');
    return Number.isNaN(d.getTime()) ? ''
      : d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  /* A crew member in words, for the tooltip and the bar's label: the role, the
     name, and a status other than Not sent with who set it and when. */
  function crewText(c) {
    if (c.needed) return `${c.label} needed`;
    const parts = [c.label, c.who ? (c.who.name || c.who.short_name) : 'Unknown driver'];
    const { value, label } = c.status;
    // Not sent names itself and stops there: nobody set it, so there is no
    // who or when to give. It still says its name, because it has a disc of
    // its own and a reader hovering grey is asking what grey means.
    if (value === 'off') {
      parts.push(label);
    } else {
      parts.push(c.row?.source === 'driver' ? `${label} by the driver` : `${label}, set by dispatch`);
      const at = setAt((value === 'confirmed' && c.row?.acceptedAt)
        || (value === 'declined' && c.row?.declinedAt) || c.row?.updatedAt);
      if (at) parts.push(at);
    }
    return parts.join(' · ');
  }

  /* One crew member on the drivers row: the role's icon on a disc in the
     status's tone, then the short name. A role nobody fills is the icon alone,
     in the error tone, and a declined driver's name is struck through, so the
     colour is never the only signal. */
  function crewEl(c) {
    const tone = c.needed ? 'error' : c.status.tone;
    const item = el('span', c.status?.value === 'declined' ? 'scheduler-crew scheduler-crew--declined' : 'scheduler-crew');
    const mark = el('span', tone ? `scheduler-crew__mark scheduler-crew__mark--${tone}` : 'scheduler-crew__mark');
    mark.appendChild(svgUse(c.icon, '12', c.box));
    item.appendChild(mark);
    if (!c.needed) item.appendChild(el('span', 'scheduler-crew__name', crewName(c)));
    item.title = crewText(c);
    return item;
  }

  function barEl(b, driversById, busesById, statuses) {
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

    /* The marks, most urgent first: the money, then the bus, then the
       paperwork. A narrow bar drops them from the end, so the order is which
       one rux would want left standing. */
    const marks = [];
    // Where a confirmed trip's money stands, bus or no bus: the one mark on
    // this bar that is about the booking rather than the vehicle.
    const owed = paymentMark(trip);
    if (owed) marks.push(owed);
    /* A requirement is drawn only when the bus fails it. A trip that needs a
       sleeper on a sleeper bus has nothing to say, so the flags cost no row; a
       trip on a bus without one shows the missing item as a warning icon. No
       bus means nothing to compare, and an unrecorded capacity is not a
       shortfall. */
    const bus = assign?.bus_id != null ? busesById.get(assign.bus_id) : null;
    if (bus) marks.push(...[
      wrongType(trip.vehicle_type, bus) ? { href: '#i-bus', label: wrongType(trip.vehicle_type, bus) } : null,
      trip.req_sleeper && !bus.sleeper ? { href: '#i-hotel', label: `Needs a sleeper, bus ${bus.number} has none` } : null,
      trip.req_ada && !bus.ada_lift ? { href: '#i-accessibility', label: `Needs an ADA lift, bus ${bus.number} has none` } : null,
      trip.req_56pax && bus.capacity != null && bus.capacity < 56 ? { href: '#i-user--multiple', label: `Needs 56 seats, bus ${bus.number} has ${bus.capacity}` } : null,
    ].filter(Boolean));
    /* A missing itinerary is flagged the same way, bus or no bus, as rux-ui's
       Pending itinerary is: no document labelled Itinerary, and the trip not
       marked as not needing one. */
    if (!itinerary && !trip.itinerary_not_needed) marks.push({ href: '#i-attachment', label: 'No itinerary yet' });
    /* And the day-of contact the same way: nobody to call on the day, and the
       trip not marked as needing no one. Any of the five counts, since the
       warning is that the list is empty, not that the first slot is. */
    const dayOf = [1, 2, 3, 4, 5].some(n => tripContact(trip, n));
    if (!dayOf && !trip.contact_not_needed) marks.push({ href: '#i-phone', label: 'No day-of contact' });
    /* A trip that needs a hotel shows a building for this leg's: amber while it
       is not booked, like the warnings, and in the bar's own text colour once it
       is, so the bar still says the trip has a hotel. */
    if (trip.need_hotel) {
      const booked = !!trip[`hotel_booked_${leg.leg}`];
      marks.push({ href: '#i-building', label: booked ? 'Hotel booked' : 'Hotel not booked', done: booked });
    }
    /* Drawn on the notes row and again on the destination row; app.css shows
       the second only while the notes row is turned off, so hiding a row never
       hides the warning. The notes row rather than the drivers row because a
       note gives way with an ellipsis and a crew gives way a whole name at a
       time: on the narrowest bar the marks cost the end of a sentence instead
       of every driver's name. The bar's label carries them for a screen
       reader, whole and in every width. */
    const TONES = ['error', 'success'];
    const warn = where => {
      if (!marks.length) return null;
      const box = el('span', `scheduler-bar__warn scheduler-bar__warn--${where}`);
      for (const w of marks) {
        // A chip is the warning colour unless it says otherwise: `done` drops
        // the fill, and the payment mark asks for red or green by its rung.
        const tone = w.done ? 'done' : TONES.includes(w.tone) ? w.tone : null;
        const chip = el('span', `scheduler-bar__warn-chip${tone ? ` scheduler-bar__warn-chip--${tone}` : ''}`);
        chip.title = w.label;
        chip.appendChild(svgUse(w.href, '12', '0 0 32 32'));
        box.appendChild(chip);
      }
      /* The count that stands for the marks a narrow bar has no room for.
         `fitMarks` fills it in, and leaves it hidden on a bar that holds them
         all. It is last, so the marks before it keep their own places. */
      const more = el('span', 'scheduler-bar__warn-chip scheduler-bar__warn-more');
      more.hidden = true;
      box.appendChild(more);
      return box;
    };

    addRow(bar, 'scheduler-bar__dest', el('span', null, trip.destination || 'No destination'), ref ? el('span', 'scheduler-bar__ref', ref) : null, warn('dest'));
    addRow(bar, 'scheduler-bar__client', el('span', null, trip.customer || ''));

    // The booking contact as the trip records it. When both do not fit, the
    // phone drops out and the name stays; app.css does that.
    const contact = tripContact(trip, 0);
    const who = el('span', null, contact?.name || '');
    if (contact) who.title = [contact.name, contact.phone].filter(Boolean).join(' · ');
    addRow(bar, 'scheduler-bar__contact', who, contact?.phone ? el('span', 'scheduler-bar__phone', contact.phone) : null);

    // Departure and return on one line, an en dash between them. A leg with
    // neither says so, so an empty row never reads as a rendering fault. The
    // spot time is not drawn, because two times already fill the row; the
    // editor shows it.
    // A one-day leg whose return is earlier than its departure comes back after
    // midnight, so the return is marked +1.
    const legDays = daysBetween(parseISO(leg.from), parseISO(leg.to)) + 1;
    const nextDay = leg.depart && leg.back && legDays === 1 && String(leg.back).slice(0, 5) < String(leg.depart).slice(0, 5);
    const times = short => {
      const dep = hhmm(leg.depart, short), back = hhmm(leg.back, short);
      const span = el('span', `scheduler-bar__time-${short ? 'short' : 'long'}`, dep && back ? (short ? `${dep}\u2013${back}` : `${dep} \u2013 ${back}`)
        : dep ? `Dep ${dep}`
        : back ? `Ret ${back}`
        : (short ? 'No times' : 'No times yet'));
      if (nextDay) {
        const mark = el('sup', 'scheduler-bar__next-day', '+1');
        mark.title = 'Returns the next day';
        span.appendChild(mark);
      }
      return span;
    };
    /* A third form, for the compact board: one line has room for one time, and
       the one worth reading at a glance is when the bus leaves. A leg with only
       a return says so, and a leg with neither says the times are still to come,
       rather than leaving the row empty. */
    const depAlone = hhmm(leg.depart, true), backAlone = hhmm(leg.back, true);
    const whenDep = el('span', 'scheduler-bar__time-dep',
      depAlone || (backAlone ? `Ret ${backAlone}` : 'No times'));
    const when = times(false), whenShort = times(true);
    addRow(bar, 'scheduler-bar__time', when, whenShort, whenDep);

    // The trip's note on one line, cut with an ellipsis; the whole of it on
    // hover. The marks sit at its end, and the note gives way to them.
    const note = el('span', null, trip.notes || '');
    if (trip.notes) note.title = trip.notes;
    addRow(bar, 'scheduler-bar__notes', note, warn('notes'));

    // The crew in role order, or what the bar needs before it can have one.
    const crew = assign ? crewOf(trip, assign, driversById, statuses) : [];
    const crewBox = el('span', 'scheduler-bar__crew', assign ? null : 'Needs a bus');
    crewBox.append(...crew.map(crewEl));
    addRow(bar, 'scheduler-bar__drivers', crewBox);

    /* The compact board's label. Not a row, so the full board never draws it
       and neither does the docked sheet, which draws every row. */
    const code = destCode(trip.destination);
    if (code) bar.appendChild(el('span', 'scheduler-bar__code', code));

    bar.setAttribute('aria-label', [
      trip.destination || 'No destination', trip.customer, ref,
      place.fromPrev ? 'continues from the previous week' : null,
      place.toNext ? 'continues into the next week' : null,
      trip.confirmed === false ? 'unconfirmed' : null,
      ...crew.map(crewText),
      ...marks.map(w => w.label),
    ].filter(Boolean).join(', '));
    return bar;
  }

  /* Draws a week's rows. With a target it draws into that grid and stops
     there: a spare grid is a week waiting to slide in beside the one being
     read, so the board's index, its label, its roster, its notices and its
     scroll all still belong to the week on screen. Without one it draws into
     the board's own grid and everything that follows a week change follows. */
  function render(data, target) {
    const { buses, trips, drivers, contacts, oos, timeOff, statuses, weekStart, weekEnd } = data;
    const driversById = new Map(drivers.map(d => [d.id, d]));
    // What the panel reads when a bar is clicked: the bar carries ids, not
    // objects, and re-fetching a trip already in hand would be a round trip
    // for nothing.
    const busesById = new Map(buses.map(b => [b.id, b]));
    const into = target || gridEl;
    if (!target) panelIndex = { trips: new Map(trips.map(t => [t.id, t])), buses: busesById, driversById, statuses, contacts: contacts || [] };

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

    into.replaceChildren();
    // "#" heads the column of bus numbers; the title spells it out.
    const corner = el('div', 'scheduler-corner', '#');
    corner.title = 'Bus number';
    into.appendChild(corner);

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
      into.appendChild(cell);
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
        /* The read covers the four weeks either side, so a window can miss
           the week being drawn; `clip` says so by answering nothing. */
        const place = clip(w.start_date, w.end_date, weekStart, weekEnd);
        if (!place) continue;
        const span = el('div', 'scheduler-oos');
        span.style.setProperty('--scheduler-start', place.start);
        span.style.setProperty('--scheduler-span', place.span);
        span.setAttribute('role', 'img');
        span.setAttribute('aria-label', `Out of service, ${w.reason || 'no reason given'}`);
        track.appendChild(span);
      }
      for (const b of bars) { const el = barEl(b, driversById, busesById, statuses); installDrag(el); track.appendChild(el); }

      rowEl.append(head, track);
      into.appendChild(rowEl);
    }

    // The pane's own border closes the grid, so whichever row ends up last on
    // screen must not draw a rule of its own.
    const shownRows = [...into.querySelectorAll('.scheduler-row')].filter(r => !r.hidden);
    shownRows[shownRows.length - 1]?.classList.add('scheduler-row--last');

    // A spare grid is drawn and nothing else: what follows belongs to the week
    // the board is actually reading.
    if (target) return;

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
    window.Rux?.schedule?.fit?.();    fitTimes();    fitMarks();
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
  function offerUndo(assignmentId, tripId, movedTo, backTo, label) {
    toast('success', 'Trip moved', `Undo puts it back on ${label}.`, {
      label: 'Undo',
      onClick: async () => {
        toast('info', 'Putting the trip back…', `Moving it to ${label}.`);
        try {
          schEl.setAttribute('aria-busy', 'true');
          gridEl.classList.add('scheduler-grid--busy');
          await moveToBus(assignmentId, backTo);
          recordBusChange(tripId, movedTo, backTo);
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
          recordBusChange(tripId, fromBus, toBus);
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
        else offerUndo(assignmentId, tripId, toBus, backTo, label);
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
  let panelIndex = { trips: new Map(), buses: new Map(), driversById: new Map(), statuses: new Map(), contacts: [] };
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
    /* A switch's heading is its label, so the words flip it too: a label
       forwards its click to the switch's button. */
    const sw = action?.querySelector('.rux--toggle__button');
    const head = el(sw ? 'label' : 'div', 'scheduler-panel-section__title', title);
    if (sw) head.htmlFor = sw.id;
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

  /* ── A list of records ──
     Payments, purchase orders, invoices and files share this list and
     `listRow`, so they cannot drift in height or layout. Each record is a tile
     on the next layer, 8px apart, and the add is the list's last item. The
     list is built once and only its body is redrawn. */
  const rowList = () => {
    const list = el('div', 'scheduler-items');
    const body = el('ul', 'scheduler-list-body');
    body.setAttribute('role', 'list');
    list.appendChild(body);
    return { list, body };
  };

  /* The add is the list's last item, a dashed tile where the next record
     appears, with its icon before its words. It is also the empty state: an
     empty list draws it alone. */
  const listAddRow = ({ label, id, onClick }) => {
    const li = el('li', 'scheduler-list-additem');
    const btn = el('button', 'rux--btn rux--btn--ghost rux--layout--size-md scheduler-list-add');
    btn.type = 'button';
    if (id) btn.id = id;
    const icon = svgUse('#i-add', '16', '0 0 32 32');
    icon.setAttribute('class', 'rux--btn__icon');
    btn.append(icon, label);
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
      // The second item is a danger item unless the caller says it is not.
      if (pick === 'remove') li.classList.toggle('rux--menu-item--danger', actions.removeDanger !== false);
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

  /* One record as Carbon's clickable tile: its name and amount on the first
     line, its details under them, and a tag where a record needs one. The
     tile opens the record, and its overflow menu is a sibling button laid
     over the tile's end, since a clickable tile holds no other control.

     The tile carries the whole record in `aria-label`, so a screen reader
     hears one sentence, and the full text in `title`. */
  const listRow = ({ name, meta, much, tag, title, edit, remove, removeLabel,
                    open: openRow = edit, openLabel = `Edit ${title}`, editText, removeText }) => {
    const li = el('li', 'rux--layer-two scheduler-item');
    const open = el('button', 'rux--tile rux--tile--clickable scheduler-item__open');
    open.type = 'button';
    const top = el('span', 'scheduler-item__line');
    top.appendChild(el('span', 'scheduler-item__name', name));
    if (tag) {
      const t = el('span', `rux--tag rux--layout--size-sm ${tag.tone}`, tag.code);
      if (tag.title) t.title = tag.title;
      top.appendChild(t);
    }
    if (much) top.appendChild(el('span', 'scheduler-item__much', much));
    open.append(top, el('span', 'scheduler-item__meta', meta || ''));
    open.title = title;
    open.setAttribute('aria-label', openLabel);
    open.addEventListener('click', openRow);
    const more = el('button', 'rux--btn rux--btn--ghost rux--btn--icon-only rux--layout--size-sm rux--menu-button__trigger scheduler-item__menu');
    more.type = 'button';
    more.setAttribute('aria-haspopup', 'true');
    more.setAttribute('aria-expanded', 'false');
    // The trigger's name is the record's, so two records' menus are told apart.
    more.setAttribute('aria-label', `Actions for ${title}`);
    more.appendChild(svgUse('#i-overflow-menu--vertical', '16', '0 0 32 32'));
    more.lastChild.setAttribute('class', 'rux--btn__icon');
    more.addEventListener('click', () => openRowMenu(more, {
      edit, remove, removeLabel, editText, removeText,
    }));
    li.append(open, more);
    return li;
  };

  /* ── A menu of any items ──
     The row menu above has two fixed items. The Fleet tab's bus and status
     menus have more, so this menu is rebuilt from its items on every open and
     placed the way the row menu is. An item with `checked` is a radio item. */
  let itemsMenuEl = null;
  let itemsMenuTrigger = null;
  const placeMenuAt = (menu, trigger) => {
    menu.hidden = false;
    menu.style.position = 'fixed';
    menu.style.insetInlineStart = '0px';
    menu.style.insetBlockStart = '0px';
    const box = trigger.getBoundingClientRect();
    const width = menu.offsetWidth;
    const height = menu.offsetHeight;
    const left = Math.max(0, Math.min(box.right - width, window.innerWidth - width));
    const top = box.bottom + height <= window.innerHeight ? box.bottom : Math.max(0, box.top - height);
    menu.style.insetInlineStart = `${Math.round(left)}px`;
    menu.style.insetBlockStart = `${Math.round(top)}px`;
  };
  const openItemsMenu = (trigger, items, label) => {
    if (!itemsMenuEl) {
      itemsMenuEl = el('ul', 'rux--menu rux--menu--sm rux--menu--open rux--menu--shown');
      itemsMenuEl.setAttribute('role', 'menu');
      itemsMenuEl.tabIndex = -1;
      itemsMenuEl.hidden = true;
      itemsMenuEl.addEventListener('rux:menu-closed', () => {
        itemsMenuEl.hidden = true;
        itemsMenuTrigger?.setAttribute('aria-expanded', 'false');
        itemsMenuTrigger = null;
      });
      document.body.appendChild(itemsMenuEl);
    }
    const menu = itemsMenuEl;
    const radio = items.some(i => i.checked !== undefined);
    menu.className = radio
      ? 'rux--menu rux--menu--sm rux--menu--open rux--menu--shown rux--menu--with-icons rux--menu--with-selectable-items'
      : 'rux--menu rux--menu--sm rux--menu--open rux--menu--shown';
    menu.setAttribute('aria-label', label);
    menu.replaceChildren(...items.map(it => {
      const li = el('li', it.danger ? 'rux--menu-item rux--menu-item--danger' : 'rux--menu-item');
      li.setAttribute('role', radio ? 'menuitemradio' : 'menuitem');
      if (radio) li.setAttribute('aria-checked', String(!!it.checked));
      li.tabIndex = -1;
      if (it.disabled) {
        li.classList.add('rux--menu-item--disabled');
        li.setAttribute('aria-disabled', 'true');
      }
      if (radio) {
        const check = el('div', 'rux--menu-item__selection-icon');
        if (it.checked) check.appendChild(svgUse('#i-checkmark', '16', '0 0 20 20'));
        li.appendChild(check);
      }
      if (it.icon) {
        const icon = el('div', 'rux--menu-item__icon');
        icon.appendChild(it.icon);
        li.appendChild(icon);
      }
      li.appendChild(el('div', 'rux--menu-item__label', it.label));
      li.addEventListener('click', () => {
        if (it.disabled) return;
        window.Rux?.menu?.close?.(menu);
        it.run();
      });
      return li;
    }));
    placeMenuAt(menu, trigger);
    window.Rux?.menu?.open?.(menu, null);
    trigger.setAttribute('aria-expanded', 'true');
    itemsMenuTrigger = trigger;
  };

  /* ══ The Fleet tab ══
     How many buses each leg needs, the bus on each, and who fills each bus's
     four seats, as rux-ui stores them: `bus_count` and `return_bus_count` on
     the trip, a `trip_assignments` row per bus, a `trip_drivers` row per
     filled seat, and each seat's status through `sync_trip_driver_statuses`.
     The tab edits a model, `editing.fleet`, and Save writes the difference
     from `editing.fleetBefore` by id. Pay is left to rux-ui. */
  const MAX_BUSES = 20;
  const SEAT_LABEL = {
    driver: 'Driver', 'co-driver': 'Co-driver',
    'relief-start': 'Relief at start', 'relief-end': 'Relief at end',
  };
  const RELIEF = new Set(['relief-start', 'relief-end']);
  let fleetSeq = 0;

  const blankSeat = () => ({ on: false, rowId: null, driverId: null, reportTime: null, note: null, status: 'off', statusDirty: false });
  const blankBus = () => {
    const seats = Object.fromEntries(ROLES.map(r => [r.role, blankSeat()]));
    seats.driver.on = true;
    return { key: `new-${++fleetSeq}`, id: null, position: null, busId: null, seats };
  };

  // One bus as the trip holds it: the first row per seat is the seat, and a
  // seat is on when `active_roles` says so, as the bar reads it.
  function fleetBusOf(trip, a, statuses) {
    const bus = blankBus();
    bus.key = `a-${a.id}`;
    bus.id = a.id;
    bus.position = a.position ?? null;
    bus.busId = a.bus_id ?? null;
    const on = activeRolesOf(a);
    const leg = a.leg || 'outbound';
    for (const r of ROLES) {
      const seat = bus.seats[r.role];
      seat.on = on.has(r.role);
      const row = (a.trip_drivers || []).find(d => (d.role || 'driver') === r.role);
      if (!row) continue;
      seat.rowId = row.id ?? null;
      seat.driverId = row.driver_id ?? null;
      seat.reportTime = hhmmOrNull(row.report_time);
      seat.note = row.instructions ?? null;
      const saved = row.driver_id ? statuses?.get(statusKey(trip.id, row.driver_id, leg, r.role)) : null;
      const value = saved ? saved.status : on.get(r.role);
      seat.status = DRIVER_STATUSES.some(s => s.value === value) ? value : 'off';
    }
    return bus;
  }

  // Each leg's buses in position order, padded with empty buses up to its count.
  function fleetOf(trip, creating) {
    const legs = {};
    for (const leg of ['outbound', 'return']) {
      const buses = (trip.trip_assignments || [])
        .filter(a => (a.leg || 'outbound') === leg)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map(a => fleetBusOf(trip, a, panelIndex.statuses));
      const count = leg === 'outbound' ? (trip.bus_count || 1) : (trip.return_bus_count || trip.bus_count || 1);
      while (buses.length < Math.min(MAX_BUSES, Math.max(1, count))) buses.push(blankBus());
      legs[leg] = buses;
    }
    if (creating && createBusId) legs.outbound[0].busId = createBusId;
    return legs;
  }

  const cloneFleet = legs => JSON.parse(JSON.stringify(legs));
  const seatFilled = s => s.on && !!s.driverId;
  // A bus with nothing on it is only a count, so it gets no row until it has.
  const busEmpty = b => !b.busId && ROLES.every(r => r.role === 'driver' || !b.seats[r.role].on)
    && !seatFilled(b.seats.driver);

  // `active_roles` as rux-ui writes it: the driver first, then each seat that
  // is on, with its status after a colon unless it is Not sent.
  const activeRolesValue = bus => ROLES
    .filter(r => r.role === 'driver' || bus.seats[r.role].on)
    .map(r => (bus.seats[r.role].status !== 'off' ? `${r.role}:${bus.seats[r.role].status}` : r.role));

  const fleetSplit = () => document.getElementById('scheduler-f-type')?.value === SPLIT;
  const fleetLegs = () => (fleetSplit() ? ['outbound', 'return'] : ['outbound']);

  // The legs Save touches: the ones shown, and the return leg of a trip that
  // stopped being a split in this editor, whose buses go as rux-ui drops them.
  const fleetLegsToSave = () => {
    const legs = fleetLegs();
    if (!fleetSplit() && editing?.before.trip_type === SPLIT) legs.push('return');
    return legs;
  };

  /* Save's work for the fleet, or null before the tab was built. Positions
     are rewritten only on a leg whose buses were added, removed or reordered,
     so a trip rux-ui numbered with gaps opens with nothing to save. The
     counts compare with the buses the tab opened on, so a trip whose count
     and rows disagree opens unchanged too. */
  function fleetWork() {
    const now = editing?.fleet;
    const before = editing?.fleetBefore;
    if (!now || !before) return null;
    const work = { trip: {}, legs: [], statuses: false, work: false };
    const outCount = now.outbound.length;
    if (outCount !== editing.fleetCounts.outbound || editing.creating) work.trip.bus_count = outCount;
    if (fleetSplit() && (now.return.length !== editing.fleetCounts.return || editing.creating)) {
      work.trip.return_bus_count = now.return.length;
    }
    for (const leg of fleetLegsToSave()) {
      const dropped = leg === 'return' && !fleetSplit();
      const buses = dropped ? [] : now[leg];
      const old = before[leg];
      const oldById = new Map(old.filter(b => b.id).map(b => [b.id, b]));
      const keptIds = new Set(buses.filter(b => b.id).map(b => b.id));
      const renumber = buses.length !== old.length || buses.some((b, i) => b.key !== old[i]?.key);
      const ops = { leg, inserts: [], updates: [], deletes: old.filter(b => b.id && !keptIds.has(b.id)).map(b => b.id) };
      buses.forEach((b, i) => {
        const prev = b.id ? oldById.get(b.id) : null;
        const roles = activeRolesValue(b);
        if (!prev) {
          if (!busEmpty(b)) ops.inserts.push({ bus: b, row: { leg, position: i, bus_id: b.busId, active_roles: roles } });
          return;
        }
        const patch = {};
        if (!same(b.busId, prev.busId)) patch.bus_id = b.busId;
        if (renumber && prev.position !== i) patch.position = i;
        if (JSON.stringify(roles) !== JSON.stringify(activeRolesValue(prev))) patch.active_roles = roles;
        const seats = [];
        for (const r of ROLES) {
          const s = b.seats[r.role], p = prev.seats[r.role];
          if (seatFilled(s) && s.rowId) {
            const sp = {};
            if (!same(s.driverId, p.driverId)) sp.driver_id = s.driverId;
            if (!same(s.reportTime, p.reportTime)) sp.report_time = s.reportTime;
            if (!same(s.note, p.note)) sp.instructions = s.note;
            if (Object.keys(sp).length) seats.push({ op: 'update', id: s.rowId, patch: sp });
          } else if (seatFilled(s)) {
            seats.push({ op: 'insert', row: seatRow(r.role, s) });
          } else if (s.rowId && seatFilled(p)) {
            seats.push({ op: 'delete', id: s.rowId });
          }
        }
        if (Object.keys(patch).length || seats.length) ops.updates.push({ id: b.id, patch, seats });
      });
      if (ops.inserts.length || ops.updates.length || ops.deletes.length) work.legs.push(ops);
    }
    // Any change to who sits where, or a status picked here, sends the crew.
    const statusPicked = fleetLegsToSave().some(leg => now[leg].some(b => ROLES.some(r => b.seats[r.role].statusDirty)));
    work.statuses = work.legs.length > 0 || statusPicked;
    work.work = Object.keys(work.trip).length > 0 || work.statuses;
    return work;
  }

  const seatRow = (role, s) => ({ driver_id: s.driverId, role, report_time: s.reportTime, instructions: s.note });

  const fleetChanged = () => !!fleetWork()?.work;

  // A driver in two seats of one leg is the one thing that blocks Save.
  function fleetDuplicates() {
    const dup = new Set();
    for (const leg of fleetLegs()) {
      const seen = new Set();
      for (const b of editing?.fleet?.[leg] ?? []) {
        for (const r of ROLES) {
          const s = b.seats[r.role];
          if (!seatFilled(s)) continue;
          if (seen.has(s.driverId)) dup.add(`${leg}:${s.driverId}`);
          seen.add(s.driverId);
        }
      }
    }
    return dup;
  }

  /* Writes the fleet after the trip. New buses are inserted with their seats,
     changed ones updated, removed ones deleted, which takes their seats with
     them; then every filled seat's status is sent at once, since the function
     deletes a status the list leaves out. */
  async function saveFleet(tripId, write, work) {
    for (const ops of work.legs) {
      for (const delId of ops.deletes) {
        await write('its buses', client.from('trip_assignments').delete().eq('trip_id', tripId).eq('id', delId));
      }
      for (const u of ops.updates) {
        if (Object.keys(u.patch).length) {
          await write('its buses', client.from('trip_assignments').update(u.patch).eq('trip_id', tripId).eq('id', u.id));
        }
        for (const s of u.seats) {
          if (s.op === 'update') await write('its drivers', client.from('trip_drivers').update(s.patch).eq('id', s.id));
          else if (s.op === 'delete') await write('its drivers', client.from('trip_drivers').delete().eq('id', s.id));
          else await write('its drivers', client.from('trip_drivers').insert({ assignment_id: u.id, ...s.row }));
        }
      }
      for (const ins of ops.inserts) {
        const made = await write('its buses', client.from('trip_assignments')
          .insert({ trip_id: tripId, ...ins.row }).select('id').single());
        const rows = ROLES.filter(r => seatFilled(ins.bus.seats[r.role]))
          .map(r => ({ assignment_id: made.id, ...seatRow(r.role, ins.bus.seats[r.role]) }));
        if (rows.length) await write('its drivers', client.from('trip_drivers').insert(rows));
      }
    }
    if (!work.statuses) return;
    const list = fleetLegs().flatMap(leg => editing.fleet[leg].flatMap(b => ROLES
      .filter(r => seatFilled(b.seats[r.role]))
      .map(r => ({ driverId: b.seats[r.role].driverId, leg, role: r.role,
                   status: b.seats[r.role].status, dirty: b.seats[r.role].statusDirty }))));
    await write('its driver statuses', client.rpc('sync_trip_driver_statuses', { p_trip_id: tripId, p_statuses: list }));
  }

  /* ── What clashes ──
     Read when the tab is built and again when it is chosen, for the trip's
     dates as the Details tab holds them, so a picker can say which buses and
     drivers are taken. A clash warns; it never stops a pick. */
  let fleetClashes = null;
  let fleetClashKey = '';

  const fleetLegDates = leg => {
    const v = id => isoOrNull(document.getElementById(id)?.value);
    if (leg === 'return') {
      const from = v('scheduler-f-rstart');
      return from ? { from, to: v('scheduler-f-rend') || from } : null;
    }
    const from = v('scheduler-f-start');
    return from ? { from, to: v('scheduler-f-end') || from } : null;
  };
  const datesOverlap = (a, b) => a.from <= b.to && b.from <= a.to;

  async function loadFleetClashes() {
    if (!client || !editing?.fleet) return;
    const ranges = Object.fromEntries(['outbound', 'return'].map(l => [l, fleetLegDates(l)]));
    const all = Object.values(ranges).filter(Boolean);
    if (!all.length) return;
    const key = JSON.stringify(ranges);
    if (key === fleetClashKey) return;
    fleetClashKey = key;
    const lo = all.map(r => r.from).sort()[0];
    const hi = all.map(r => r.to).sort().at(-1);
    const unwrap = r => { if (r.error) throw new Error(r.error.message); return r.data ?? []; };
    const forTrip = editing;
    let trips, off, oos;
    try {
      [trips, off, oos] = await withTimeout(Promise.all([
        client.from('trips')
          .select('id,destination,start_date,end_date,return_start_date,return_end_date,bus_count,return_bus_count,trip_assignments(bus_id,leg,active_roles,trip_drivers(driver_id,role))')
          .is('cancelled_at', null).lte('start_date', hi).gte('start_date', iso(addDays(parseISO(lo), -90)))
          .then(unwrap),
        client.from('driver_time_off').select('driver_id,start_date,end_date,reason').lte('start_date', hi).gte('end_date', lo).then(unwrap),
        client.from('bus_out_of_service').select('bus_id,start_date,end_date,reason').lte('start_date', hi).gte('end_date', lo).then(unwrap),
      ]));
    } catch {
      fleetClashKey = '';
      return;
    }
    if (editing !== forTrip) return;
    const clashes = {};
    for (const leg of ['outbound', 'return']) {
      const range = ranges[leg];
      const buses = new Map(), drivers = new Map();
      const add = (map, id, text) => { if (id == null) return; if (!map.has(id)) map.set(id, []); if (!map.get(id).includes(text)) map.get(id).push(text); };
      if (range) {
        for (const t of trips) {
          if (t.id === editing.id) continue;
          for (const l of legsOf(t)) {
            if (!datesOverlap(range, l)) continue;
            for (const a of t.trip_assignments || []) {
              if ((a.leg || 'outbound') !== l.leg) continue;
              const text = `On trip ${t.destination || 'with no destination'}`;
              add(buses, a.bus_id, text);
              const on = activeRolesOf(a);
              for (const d of a.trip_drivers || []) if (on.has(d.role || 'driver')) add(drivers, d.driver_id, text);
            }
          }
        }
        for (const r of off) if (datesOverlap(range, { from: r.start_date, to: r.end_date })) add(drivers, r.driver_id, 'Time off');
        for (const r of oos) if (datesOverlap(range, { from: r.start_date, to: r.end_date })) add(buses, r.bus_id, 'Out of service');
      }
      clashes[leg] = { buses, drivers };
    }
    fleetClashes = clashes;
    drawFleet();
  }

  const clashText = (leg, kind, id) => (id == null ? '' : (fleetClashes?.[leg]?.[kind].get(id) ?? []).join(' · '));

  // What the trip needs that a bus lacks, in the bar's words.
  function busLacks(bus) {
    if (!bus) return [];
    const need = id => pressed(document.getElementById(id));
    return [
      wrongType(document.getElementById('scheduler-f-vehicle')?.value, bus),
      need('scheduler-f-sleeper') && !bus.sleeper ? `Needs a sleeper, bus ${bus.number} has none` : null,
      need('scheduler-f-ada') && !bus.ada_lift ? `Needs an ADA lift, bus ${bus.number} has none` : null,
      need('scheduler-f-56pax') && bus.capacity != null && bus.capacity < 56 ? `Needs 56 seats, bus ${bus.number} has ${bus.capacity}` : null,
    ].filter(Boolean);
  }

  /* ── The pickers ──
     Carbon's combo box, as the contact search builds it, over the active
     buses or drivers plus whoever the trip already has. Each option carries
     its id, its name as the text a pick writes, and a second line with what
     clashes. The field's own warning or error sits under it in Carbon's
     requirement. */
  function fleetPicker({ id, label, options, current, warn, error, placeholder }) {
    const lab = el('label', 'rux--label', label);
    lab.setAttribute('for', id);
    const root = el('div', 'rux--combo-box rux--list-box');
    const field = el('div', 'rux--list-box__field');
    const chosen = options.find(o => String(o.id) === String(current ?? ''));
    const input = el('input', chosen ? 'rux--text-input' : 'rux--text-input rux--text-input--empty');
    input.type = 'text';
    input.id = id;
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-haspopup', 'listbox');
    input.setAttribute('aria-expanded', 'false');
    input.autocomplete = NO_AUTOFILL;
    input.placeholder = placeholder;
    input.value = chosen?.name ?? '';
    input.dataset.fleetText = input.value;
    field.appendChild(input);
    const menu = el('ul', 'rux--list-box__menu');
    menu.setAttribute('role', 'listbox');
    menu.hidden = true;
    for (const o of options) {
      const on = o === chosen;
      const option = el('li', on
        ? 'rux--list-box__menu-item rux--list-box__menu-item--active scheduler-contact-option'
        : 'rux--list-box__menu-item scheduler-contact-option');
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', String(on));
      option.dataset.fleetId = o.id;
      option.dataset.ruxText = o.name;
      const body = el('div', 'rux--list-box__menu-item__option scheduler-contact-option__body');
      body.appendChild(el('span', 'scheduler-contact-option__name', o.name));
      const detail = [o.detail, o.clash].filter(Boolean).join(' · ');
      if (detail) body.appendChild(el('span', 'scheduler-contact-option__detail', detail));
      const tick = svgUse('#i-checkmark', '16', '0 0 20 20');
      tick.classList.add('rux--list-box__menu-item__selected-icon');
      body.appendChild(tick);
      option.appendChild(body);
      menu.appendChild(option);
    }
    root.append(field, menu);
    const wrap = el('div', 'rux--list-box__wrapper');
    wrap.append(lab, root);
    const say = error || warn;
    if (say) {
      if (error) {
        root.setAttribute('data-invalid', '');
        input.setAttribute('aria-invalid', 'true');
      } else root.classList.add('rux--list-box--warning');
      const icon = svgUse(error ? '#i-warning--filled' : '#i-warning--alt--filled', '16', '0 0 32 32');
      icon.setAttribute('class', error
        ? 'rux--list-box__invalid-icon'
        : 'rux--list-box__invalid-icon rux--list-box__invalid-icon--warning');
      field.appendChild(icon);
      const req = el('div', 'rux--form-requirement', say);
      req.id = `${id}-req`;
      input.setAttribute('aria-describedby', req.id);
      wrap.appendChild(req);
    }
    return wrap;
  }

  const fleetBusOptions = (leg, currentId) => {
    const out = [];
    for (const b of panelIndex.buses.values()) {
      if (b.status && b.status !== 'active' && String(b.id) !== String(currentId)) continue;
      out.push({
        id: b.id, name: `Bus ${b.number}`,
        detail: [b.capacity ? `${b.capacity} seats` : null, b.type].filter(Boolean).join(' · '),
        clash: clashText(leg, 'buses', b.id),
      });
    }
    return out;
  };

  const fleetDriverOptions = (leg, currentId) => [...panelIndex.driversById.values()]
    .filter(d => !d.status || d.status === 'active' || String(d.id) === String(currentId))
    .sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? '')))
    .map(d => ({
      id: d.id, name: d.name || d.short_name || 'Unnamed driver',
      detail: d.status && d.status !== 'active' ? 'Inactive' : '',
      clash: clashText(leg, 'drivers', d.id),
    }));

  /* A status as Carbon's icon indicator: a shape per status as well as a
     colour, and the yellow one carries its own dark mark, so each reads in
     every theme without the bar's disc. The field's label already names the
     role, so the form needs no role icon. Each class is written out whole,
     for the class sweep. */
  const STATUS_ICON = {
    off: { cls: 'rux--icon-indicator--not-started', icon: '#i-circle-dash' },
    'pending-assignment': { cls: 'rux--icon-indicator--caution-major', icon: '#i-warning--alt-inverted--filled' },
    'pending-response': { cls: 'rux--icon-indicator--caution-minor', icon: '#i-warning--alt--filled' },
    confirmed: { cls: 'rux--icon-indicator--succeeded', icon: '#i-checkmark--filled' },
    declined: { cls: 'rux--icon-indicator--failed', icon: '#i-error--filled' },
  };
  const statusIcon = value => {
    const svg = svgUse(STATUS_ICON[value].icon, '16', '0 0 32 32');
    svg.setAttribute('class', `${STATUS_ICON[value].cls} scheduler-status-icon`);
    return svg;
  };

  /* A filled seat's status, a small ghost button at the end of its field that
     opens the five statuses. It is in the combo box's root, not its field,
     because `js/list-box.js` opens the list on any click in the field. A seat
     with nobody in it has no status and no button. */
  function seatStatusButton(leg, bus, role, n) {
    const seat = bus.seats[role];
    if (!seat.driverId) return null;
    const status = DRIVER_STATUSES.find(s => s.value === seat.status) ?? DRIVER_STATUSES[0];
    const btn = el('button', 'rux--btn rux--btn--ghost rux--btn--icon-only rux--layout--size-sm scheduler-fleet-status');
    btn.type = 'button';
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');
    const name = `Bus ${n} ${SEAT_LABEL[role].toLowerCase()} status`;
    btn.setAttribute('aria-label', `${name}: ${status.label}`);
    btn.title = `${SEAT_LABEL[role]} status: ${status.label}`;
    btn.appendChild(statusIcon(status.value));
    btn.addEventListener('click', () => openItemsMenu(btn, DRIVER_STATUSES.map(st => ({
      label: st.label,
      checked: st.value === seat.status,
      icon: statusIcon(st.value),
      run: () => {
        if (seat.status === st.value) return;
        seat.status = st.value;
        seat.statusDirty = true;
        drawFleet(`scheduler-fleet-${leg}-${bus.key}-${role}-status`);
        refreshDirty();
      },
    })), name));
    btn.id = `scheduler-fleet-${leg}-${bus.key}-${role}-status`;
    return btn;
  }

  function seatBlock(leg, bus, role, n, dups) {
    const seat = bus.seats[role];
    const id = `scheduler-fleet-${leg}-${bus.key}-${role}`;
    const dup = seat.driverId && dups.has(`${leg}:${seat.driverId}`);
    const picker = fleetPicker({
      id, label: SEAT_LABEL[role], placeholder: 'Choose a driver',
      options: fleetDriverOptions(leg, seat.driverId),
      current: seat.driverId,
      error: dup ? 'This driver is in another seat on this leg' : '',
      warn: seat.on ? clashText(leg, 'drivers', seat.driverId) : '',
    });
    picker.dataset.fleetLeg = leg;
    picker.dataset.fleetBus = bus.key;
    picker.dataset.fleetSeat = role;
    const statusBtn = seatStatusButton(leg, bus, role, n);
    if (statusBtn) {
      const root = picker.querySelector('.rux--combo-box');
      root.classList.add('scheduler-fleet-status-host');
      root.appendChild(statusBtn);
    }
    const line = picker;
    if (!RELIEF.has(role)) return line;
    const box = el('div', 'rux--stack-vertical rux--stack-scale-6');
    const time = timeField(`${id}-time`, 'Swap time', seat.reportTime);
    const note = textField(`${id}-note`, 'Note', seat.note);
    const noteInput = note.querySelector('input');
    noteInput.maxLength = 160;
    noteInput.placeholder = 'Where the drivers meet';
    for (const f of [time, note]) {
      const input = f.querySelector('input');
      input.dataset.fleetLeg = leg;
      input.dataset.fleetBus = bus.key;
      input.dataset.fleetSeat = role;
      input.dataset.fleetField = f === time ? 'reportTime' : 'note';
    }
    // Stacked, since the tile leaves each too narrow for a pair.
    box.append(line, time, note);
    return box;
  }

  /* One bus and its crew, as a Carbon tile on the next layer, as the Billing
     summary sits, so each bus has an edge of its own. The fields inside step
     up a layer again, or they would take the tile's own colour. */
  function busGroup(leg, bus, i, count, dups) {
    const n = i + 1;
    const group = el('div', 'rux--layer-three scheduler-fleet-bus');
    group.setAttribute('role', 'group');
    const title = el('div', 'scheduler-panel-section__title', `Bus ${n}`);
    title.id = `scheduler-fleet-${leg}-${bus.key}-title`;
    group.setAttribute('aria-labelledby', title.id);
    const more = el('button', 'rux--btn rux--btn--ghost rux--btn--icon-only rux--layout--size-sm rux--menu-button__trigger');
    more.type = 'button';
    more.id = `scheduler-fleet-${leg}-${bus.key}-menu`;
    more.setAttribute('aria-haspopup', 'true');
    more.setAttribute('aria-expanded', 'false');
    more.setAttribute('aria-label', `Bus ${n} actions`);
    more.title = `Bus ${n} actions`;
    more.appendChild(svgUse('#i-overflow-menu--vertical', '16', '0 0 32 32'));
    more.lastChild.setAttribute('class', 'rux--btn__icon');
    more.addEventListener('click', () => openItemsMenu(more, [
      ...ROLES.filter(r => r.role !== 'driver').map(r => {
        const seat = bus.seats[r.role];
        const word = SEAT_LABEL[r.role].toLowerCase();
        return {
          label: seat.on ? `Remove ${word}` : `Add ${word}`,
          run: () => {
            seat.on = !seat.on;
            if (seat.on) drawFleet(`scheduler-fleet-${leg}-${bus.key}-${r.role}`);
            else drawFleet(more.id);
            refreshDirty();
          },
        };
      }),
      {
        label: 'Remove bus', danger: true, disabled: count <= 1,
        run: () => {
          const list = editing.fleet[leg];
          list.splice(list.indexOf(bus), 1);
          drawFleet(`scheduler-fleet-${leg}-count`);
          refreshDirty();
        },
      },
    ], `Bus ${n} actions`));
    const head = el('div', 'scheduler-group__head');
    head.append(title, more);

    const busRow = panelIndex.buses.get(bus.busId);
    // The same bus twice on one leg of this trip is a warning, as a clash is.
    const twin = bus.busId == null ? -1
      : editing.fleet[leg].findIndex(b => b !== bus && same(b.busId, bus.busId));
    const busPick = fleetPicker({
      id: `scheduler-fleet-${leg}-${bus.key}-bus`, label: 'Bus', placeholder: 'Choose a bus',
      options: fleetBusOptions(leg, bus.busId), current: bus.busId,
      warn: [twin >= 0 ? `Also Bus ${twin + 1} on this trip` : null,
             clashText(leg, 'buses', bus.busId), ...busLacks(busRow)].filter(Boolean).join(' · '),
    });
    busPick.dataset.fleetLeg = leg;
    busPick.dataset.fleetBus = bus.key;
    /* The bus and its drivers are one group of fields 24px apart; each relief,
       with its swap time and note, is a group of its own, 32px from the next,
       as the Details tab spaces its contacts. ROLES lists the reliefs last. */
    const stack = el('div', 'rux--stack-vertical rux--stack-scale-7');
    const seats = el('div', 'rux--stack-vertical rux--stack-scale-6');
    seats.append(full(busPick));
    stack.append(seats);
    for (const r of ROLES) {
      if (!bus.seats[r.role].on) continue;
      (RELIEF.has(r.role) ? stack : seats).appendChild(seatBlock(leg, bus, r.role, n, dups));
    }
    group.append(head, stack);
    const tile = el('div', 'rux--tile rux--layer-two');
    tile.appendChild(group);
    return tile;
  }

  // Carbon's small number input, the steppers `js/form-controls.js` drives.
  function busCountField(leg, count) {
    const id = `scheduler-fleet-${leg}-count`;
    const root = el('div', 'rux--number rux--number--sm');
    const lab = el('label', 'rux--label', 'Buses needed');
    lab.setAttribute('for', id);
    const wrap = el('div', 'rux--number__input-wrapper');
    const input = el('input');
    input.type = 'number';
    input.id = id;
    input.min = '1';
    input.max = String(MAX_BUSES);
    input.step = '1';
    input.value = String(count);
    input.dataset.fleetCount = leg;
    const controls = el('div', 'rux--number__controls');
    const stepBtn = (cls, icon, text) => {
      const b = el('button', `rux--number__control-btn ${cls}`);
      b.type = 'button';
      b.setAttribute('aria-label', text);
      b.appendChild(svgUse(icon, '16', '0 0 32 32'));
      return b;
    };
    controls.append(stepBtn('down-icon', '#i-subtract', 'Fewer buses'), el('div', 'rux--number__rule-divider'),
                    stepBtn('up-icon', '#i-add', 'More buses'), el('div', 'rux--number__rule-divider'));
    wrap.append(input, controls);
    root.append(lab, wrap);
    const item = el('div', 'rux--form-item');
    item.appendChild(root);
    return item;
  }

  /* Draws the tab from the model. `focusId` names the control to focus after
     a redraw that replaced the one in use. */
  function drawFleet(focusId) {
    if (!editing?.fleet) return;
    const dups = fleetDuplicates();
    panelFleet.replaceChildren();
    const reqs = [
      document.getElementById('scheduler-f-vehicle')?.value || null,
      pressed(document.getElementById('scheduler-f-sleeper')) ? 'Sleeper' : null,
      pressed(document.getElementById('scheduler-f-ada')) ? 'ADA lift' : null,
      pressed(document.getElementById('scheduler-f-56pax')) ? '56 pax' : null,
    ].filter(Boolean).join(', ');
    if (reqs) panelFleet.appendChild(section(null, def([['Needs', reqs]])));
    const split = fleetSplit();
    for (const leg of ['outbound', 'return']) {
      const buses = editing.fleet[leg];
      const body = el('div', 'rux--stack-vertical rux--stack-scale-7');
      body.appendChild(busCountField(leg, buses.length));
      // The tiles part by 16px, closer than the 32px under Buses needed.
      const tiles = el('div', 'rux--stack-vertical rux--stack-scale-5');
      buses.forEach((b, i) => tiles.appendChild(busGroup(leg, b, i, buses.length, dups)));
      body.appendChild(tiles);
      const title = !split ? 'Buses' : leg === 'outbound' ? 'Drop-off buses' : 'Pick-up buses';
      const sec = section(title, body);
      sec.dataset.fleetSection = leg;
      sec.hidden = leg === 'return' && !split;
      panelFleet.appendChild(sec);
    }
    if (focusId) document.getElementById(focusId)?.focus();
  }

  const fleetBus = node => {
    const leg = node?.dataset.fleetLeg;
    return leg ? { leg, bus: editing?.fleet?.[leg]?.find(b => b.key === node.dataset.fleetBus) } : {};
  };

  // Fewer buses: the last ones go, after a question when any has a bus or a driver.
  const fleetRemoveModal = document.getElementById('scheduler-fleet-remove-modal');
  let fleetRemoveAfter = null;
  function setBusCount(leg, want) {
    const list = editing.fleet[leg];
    const n = Math.min(MAX_BUSES, Math.max(1, Math.round(Number(want)) || 1));
    if (n > list.length) {
      while (list.length < n) list.push(blankBus());
      drawFleet(`scheduler-fleet-${leg}-count`);
      refreshDirty();
      return;
    }
    if (n === list.length) { drawFleet(`scheduler-fleet-${leg}-count`); return; }
    const gone = list.slice(n);
    const apply = () => {
      list.length = n;
      drawFleet(`scheduler-fleet-${leg}-count`);
      refreshDirty();
    };
    const held = gone.filter(b => b.busId || ROLES.some(r => seatFilled(b.seats[r.role])));
    if (!held.length || !fleetRemoveModal) { apply(); return; }
    // What goes, in words: each bus by its number and each driver by name.
    const names = held.flatMap(b => [
      b.busId && panelIndex.buses.get(b.busId) ? `Bus ${panelIndex.buses.get(b.busId).number}` : null,
      ...ROLES.filter(r => seatFilled(b.seats[r.role]))
        .map(r => panelIndex.driversById.get(b.seats[r.role].driverId)?.name),
    ]).filter(Boolean);
    const said = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0];
    document.getElementById('scheduler-fleet-remove-text').textContent =
      `${said} will come off this trip when you save.`;
    fleetRemoveAfter = apply;
    window.Rux?.modal?.open?.(fleetRemoveModal);
  }
  document.getElementById('scheduler-fleet-remove-ok')?.addEventListener('click', () => {
    const run = fleetRemoveAfter;
    fleetRemoveAfter = null;
    window.Rux?.modal?.close?.(fleetRemoveModal);
    run?.();
  });
  // Keeping the buses puts the count back as it was.
  fleetRemoveModal?.addEventListener('rux:modal-closed', () => {
    if (!fleetRemoveAfter) return;
    fleetRemoveAfter = null;
    drawFleet();
  });

  panelFleet?.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset?.fleetCount) { setBusCount(t.dataset.fleetCount, t.value); return; }
    const { bus } = fleetBus(t);
    if (!bus || !t.dataset.fleetField) return;
    bus.seats[t.dataset.fleetSeat][t.dataset.fleetField] =
      t.dataset.fleetField === 'reportTime' ? (t.value || null) : (t.value.trim() || null);
    refreshDirty();
  });
  panelFleet?.addEventListener('input', e => {
    const t = e.target;
    const { bus } = fleetBus(t);
    if (!bus || !t.dataset.fleetField) return;
    bus.seats[t.dataset.fleetSeat][t.dataset.fleetField] =
      t.dataset.fleetField === 'reportTime' ? (t.value || null) : (t.value.trim() || null);
    refreshDirty();
  });
  // A pick sets the bus or the driver; a new driver starts at Not sent.
  panelFleet?.addEventListener('rux:listbox-selected', e => {
    const wrap = e.target.closest?.('.rux--list-box__wrapper');
    const { bus } = fleetBus(wrap);
    if (!bus) return;
    const picked = e.detail?.option?.dataset.fleetId ?? null;
    const input = wrap.querySelector('input[role="combobox"]');
    const role = wrap.dataset.fleetSeat;
    const find = (map, id) => (id == null ? null : [...map.keys()].find(k => String(k) === String(id)) ?? null);
    if (role) {
      const seat = bus.seats[role];
      const next = find(panelIndex.driversById, picked);
      if (same(next, seat.driverId)) return;
      seat.driverId = next;
      seat.status = 'off';
      seat.statusDirty = false;
    } else {
      const next = find(panelIndex.buses, picked);
      if (same(next, bus.busId)) return;
      bus.busId = next;
    }
    drawFleet(input?.id);
    refreshDirty();
  });
  // Text that no option owns goes back to the pick, and an emptied field clears it.
  panelFleet?.addEventListener('focusout', e => {
    const input = e.target;
    if (!(input instanceof HTMLInputElement) || input.getAttribute('role') !== 'combobox') return;
    const wrap = input.closest('.rux--list-box__wrapper');
    const { bus } = fleetBus(wrap);
    if (!bus) return;
    if (input.value === input.dataset.fleetText) return;
    if (input.value.trim()) { input.value = input.dataset.fleetText; return; }
    const role = wrap.dataset.fleetSeat;
    if (role) Object.assign(bus.seats[role], { driverId: null, status: 'off', statusDirty: false });
    else bus.busId = null;
    refreshDirty();
    // Redrawn once focus has landed, so its warning and status button follow.
    setTimeout(() => drawFleet(document.activeElement?.id), 0);
  });
  // The dates may have moved on Details, so choosing the tab reads the clashes again.
  document.addEventListener('rux:tab-selected', e => {
    if (e.detail?.panel === panelFleet) loadFleetClashes();
  });

  /* ── The Files tab ──
     Its list is every file the trip holds, newest first, in the tiles payments
     use: the type as the name, the upload day and size under it, and the file
     name on hover. An itinerary that is not the trip's newest is tagged
     Previous. A tile opens its file in the document panel, and its menu holds
     Replace and Delete. The list is drawn again on its own after a file
     changes, so the form's unsaved edits stay. */
  /* The Type list: each type's stored label and the name it shows, rux-ui's
     three first. A label is free text in `trip_documents`, and rux-ui shows
     one it does not know by the label itself, so Something else stores the
     name typed. */
  const DOC_TYPES = [
    ['Itinerary', 'Itinerary'], ['Contract', 'Contract'], ['PO', 'Purchase order'],
    ['Invoice', 'Invoice'], ['Hotel confirmation', 'Hotel confirmation'],
  ];
  const DOC_OTHER = 'other';
  const DOC_LABEL_MAX = 60;
  const FILE_NAMES = Object.fromEntries(DOC_TYPES.map(([label, name]) => [label.toLowerCase(), name]));
  // The name a file's type shows: a listed type's, else its own label.
  const docTypeName = doc => FILE_NAMES[String(doc.label || '').toLowerCase()] ?? (doc.label || 'File');
  // The label a typed name stores: a known type's own label when it names one,
  // so "itinerary" is still the trip's itinerary, and otherwise the name.
  const docLabelFor = typed => {
    const name = String(typed ?? '').trim().replace(/\s+/g, ' ');
    const known = DOC_TYPES.find(([label, shown]) =>
      [label.toLowerCase(), shown.toLowerCase()].includes(name.toLowerCase()));
    return known ? known[0] : name;
  };
  const PREVIOUS_TAG = { code: 'Previous', tone: 'rux--tag--gray', title: 'An earlier itinerary' };

  const fileSize = n => {
    const bytes = Number(n);
    if (!Number.isFinite(bytes) || bytes <= 0) return '';
    return bytes < 1048576 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const fileRow = (trip, doc, previous) => {
    const name = doc.file_name || doc.label || 'File';
    const when = uploadedOn(doc.created_at);
    const li = listRow({
      name: docTypeName(doc),
      tag: previous ? PREVIOUS_TAG : null,
      meta: [when, fileSize(doc.file_size)].filter(Boolean).join(' · '),
      title: name,
      openLabel: `Open ${name}${when ? `, uploaded ${when}` : ''}`,
      open: e => openDocument(doc, e.currentTarget),
      editText: 'Replace', edit: () => replaceFrom(trip.id, doc),
      removeText: 'Delete', removeLabel: `Delete ${name}`, remove: () => openDeleteFile(trip.id, doc),
    });
    // Closing the document panel finds the tile by it after the list is redrawn.
    li.querySelector('.scheduler-item__open').dataset.documentId = doc.id;
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
      [...DOC_TYPES, [DOC_OTHER, 'Something else']]);
    // Something else asks for the file's name, which becomes its label.
    const other = full(textField('scheduler-f-filelabel', 'Name'));
    other.hidden = true;
    const otherInput = other.querySelector('input');
    otherInput.maxLength = DOC_LABEL_MAX;
    type.querySelector('select').addEventListener('change', e => {
      other.hidden = e.target.value !== DOC_OTHER;
      if (!other.hidden) otherInput.focus();
    });
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
    /* No visible title: the section heading says Add a file, and the input
       keeps its hidden PDF file label. */
    item.append(el('p', 'rux--label-description', 'PDF only. It is added to the trip at once, without Save.'),
      zone, container);

    const busy = on => {
      drop.disabled = on;
      drop.classList.toggle('rux--file-browse-btn--disabled', on);
    };
    const start = async file => {
      if (!file || drop.disabled) return;
      const picked = type.querySelector('select').value || 'Itinerary';
      const label = picked === DOC_OTHER ? docLabelFor(otherInput.value) : picked;
      if (!label) {
        fileItem(container, file.name).fail('Name the file first', 'Type a name for it under Type, then add it again.');
        otherInput.focus();
        return;
      }
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
    wrap.append(full(type), other, item);
    return wrap;
  }

  // The editor is a flex child of the board, not an animated overlay, so
  // closing it is setting `hidden`.
  function closePanel(returnFocus = true) {
    if (panelEl.hidden) return;
    /* A draft is read the moment the panel shows it, so closing spends it
       whether Save was pressed or not. A delete that fails leaves a row the
       nightly cleanup takes instead. */
    if (openDraft) {
      const spent = openDraft;
      openDraft = null;
      client.from('trip_drafts').delete().eq('id', spent).then(() => {}, () => {});
    }
    // Closing puts the editor's own trip down; a different trip selected
    // meanwhile stays selected.
    const picked = selectedBar();
    if (picked && isEditorBar(picked)) picked.setAttribute('aria-pressed', 'false');
    panelEl.hidden = true;
    if (tripEl) tripEl.hidden = true;
    syncSelection();
    const opener = panelOpener;
    panelOpener = null;
    // The board is measured before it is fit, so whatever was behind the
    // editor comes forward first.
    placeRoom();
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

  /* Carbon's default toggle, from `sink/toggle.html`, with no On/Off text: the
     section heading beside it names the state (Contract signed, PO received,
     Invoice sent) and is its label. `js/form-controls.js` binds it and fires
     `rux:toggle`. */
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
    const appearance = el('div', 'rux--toggle__appearance');
    const sw = el('div', 'rux--toggle__switch');
    if (on) sw.classList.add('rux--toggle__switch--checked');
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

  /* A search over places, as Carbon's combo box, for the Route tab. Its
     options are Mapbox's answers to what is typed, drawn when they arrive, as
     two lines like a contact's: the place's name over its address. `onPick`
     gets the place picked, or null and the text when the field is typed in. */
  // `show` picks which of the place's two strings the box holds.
  function placeSearch(id, label, place, onPick, show = 'name') {
    const lab = el('label', 'rux--label', label);
    lab.setAttribute('for', id);
    const root = el('div', 'rux--combo-box rux--list-box');
    const field = el('div', 'rux--list-box__field');
    const input = el('input', place?.name ? 'rux--text-input' : 'rux--text-input rux--text-input--empty');
    input.type = 'text';
    input.id = id;
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-haspopup', 'listbox');
    input.setAttribute('aria-expanded', 'false');
    input.autocomplete = NO_AUTOFILL;
    input.placeholder = mapboxToken ? 'Search places' : 'Address';
    input.value = place?.[show] ?? '';
    input.title = place?.address ?? '';
    field.append(input);
    const menu = el('ul', 'rux--list-box__menu');
    menu.setAttribute('role', 'listbox');
    menu.hidden = true;
    root.append(field, menu);
    const wrap = el('div', 'rux--list-box__wrapper');
    wrap.append(lab, root);

    let found = [];
    let timer = 0;
    let asked = 0;
    const draw = () => {
      menu.replaceChildren(...found.map((p, i) => {
        const option = el('li', 'rux--list-box__menu-item scheduler-contact-option');
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', 'false');
        option.dataset.placeIndex = String(i);
        option.dataset.ruxText = p.name;
        const body = el('div', 'rux--list-box__menu-item__option scheduler-contact-option__body');
        body.appendChild(el('span', 'scheduler-contact-option__name', p.name));
        if (p.address) body.appendChild(el('span', 'scheduler-contact-option__detail', p.address));
        option.appendChild(body);
        return option;
      }));
      // `list-box.js` shows the list only if it had options when it opened.
      menu.hidden = !found.length || !root.classList.contains('rux--list-box--expanded');
    };
    // Mapbox is asked a quarter second after typing stops, and only the
    // latest answer is drawn.
    input.addEventListener('input', () => {
      clearTimeout(timer);
      const text = input.value;
      timer = setTimeout(async () => {
        const n = ++asked;
        try {
          const got = await searchPlaces(text);
          if (n === asked) { found = got; draw(); }
        } catch { if (n === asked) { found = []; draw(); } }
      }, 250);
    });
    root.addEventListener('rux:listbox-selected', e => {
      const index = e.detail?.option?.dataset.placeIndex;
      if (index === undefined) { onPick(null, input.value.trim()); return; }
      const picked = found[Number(index)];
      input.title = picked?.address ?? '';
      onPick(picked ?? null, input.value.trim());
    });
    return wrap;
  }

  /* A copy button in a contact field: Design's copy button in its tooltip.
     `js/copy-button.js` copies the button's `data-rux-copy`, which `syncCopy`
     keeps equal to the field, so what is copied is what is on screen. It shows
     only while the field has a value and stays out of the tab order, since the
     field itself copies from the keyboard. With `open`, the button is a link
     that opens the field's web address instead, and shows only for one.

     On a combo box it goes in the root, not the field, because
     `js/list-box.js` opens the menu on any click inside `__field`. */
  function withCopy(item, id, label, open) {
    const input = item.querySelector(`#${id}`);
    const combo = input?.closest('.rux--combo-box');
    const host = combo || input?.closest('.rux--text-input__field-wrapper');
    if (!host) return item;
    host.classList.add('scheduler-copy-host');
    const tip = el('span', 'rux--tooltip rux--icon-tooltip rux--popover-container rux--popover--left '
      + 'rux--popover--caret rux--popover--high-contrast scheduler-copy');
    tip.dataset.copyFor = id;
    const trigger = el('div', 'rux--tooltip-trigger__wrapper');
    const word = open ? 'Open' : 'Copy';
    const btn = open
      ? el('a', 'rux--btn rux--btn--ghost rux--btn--icon-only rux--layout--size-sm')
      : el('button', 'rux--copy-btn rux--copy rux--btn rux--btn--ghost rux--btn--icon-only rux--layout--size-sm');
    if (open) {
      // One named window, as rux-ui opens it, so each thread reuses the tab.
      btn.target = 'missive';
      btn.rel = 'noopener';
    } else {
      btn.type = 'button';
    }
    btn.tabIndex = -1;
    btn.setAttribute('aria-label', `${word} ${label.charAt(0).toLowerCase()}${label.slice(1)}`);
    btn.appendChild(svgUse(open ? '#i-launch' : '#i-copy', '16', '0 0 32 32'));
    trigger.appendChild(btn);
    const pop = el('span', 'rux--popover');
    pop.append(el('span', 'rux--popover-content rux--tooltip-content', word), el('span', 'rux--popover-caret'));
    tip.append(trigger, pop);
    host.appendChild(tip);
    syncCopyTip(tip, input);
    return item;
  }

  // Shows or hides one copy button for its field's value, and gives the field
  // room for it while it shows (overrides.css).
  function syncCopyTip(tip, input) {
    let value = input?.value.trim() || '';
    const btn = tip.querySelector('.rux--btn');
    if (btn.tagName === 'A') {
      // Only a web address opens; anything else leaves the button hidden.
      if (!/^https?:\/\//i.test(value)) value = '';
      if (value) btn.href = value; else btn.removeAttribute('href');
    } else {
      btn.dataset.ruxCopy = value;
    }
    tip.hidden = !value;
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

     It shows mm/dd/yyyy and dispatches `change`, so the dirty check sees it;
     `isoOrNull` reads the day back as ISO. The first pick of a range clears
     the `to` input, so the save treats a blank end as the start day. */
  // A stored day as the picker shows it, and the picker's text as a stored day.
  const pickerText = v => window.Rux?.datePicker?.format?.(v ?? '') ?? (v || '');
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
    input.placeholder = 'mm/dd/yyyy';
    input.value = pickerText(value);
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
  const isoOrNull = v => window.Rux?.datePicker?.toISO?.(v)
    ?? (/^\d{4}-\d{2}-\d{2}$/.test((v || '').trim()) ? v.trim() : null);

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
    // Any is the empty value and stores null.
    { key: 'vehicle_type', get: f => f['scheduler-f-vehicle'].value || null },
    // Standard is the empty value and stores null.
    { key: 'trip_bar_color', get: f => f['scheduler-f-color'].querySelector('.rux--list-box__menu-item--active')?.dataset.color || null },
    // `confirmed`, `balance_paid` and `date_paid` are derived, not edited:
    // `derivedBilling` writes them with any billing change.
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
    // The route's miles, on the Route tab.
    { key: 'est_miles', get: () => money(document.getElementById('scheduler-f-estmiles')?.value) },
    { key: 'actual_miles', get: () => money(document.getElementById('scheduler-f-actmiles')?.value) },
    { key: 'contract_status', get: f => stepOn('contractSigned') && on(f['scheduler-f-contract']) ? 'Signed' : 'Pending' },
    { key: 'contract_note',
      get: f => stepOn('contractSigned') && on(f['scheduler-f-contract']) ? (f['scheduler-f-contractnote'].value.trim() || null) : null },
    /* The PO and invoice columns are filled from the rows in `trip_pos` and
       `trip_invoices`: `po_ref` is the first PO's reference, `po_amount` the sum
       of the PO amounts and `invoice_number` the first invoice's number, because
       rux-ui and other readers still use the columns. `listRowsToSave` is the
       list Save writes, so the columns and the rows agree. */
    { key: 'po_received', get: f => stepOn('poReceived') && on(f['scheduler-f-poreceived']) },
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
    { key: 'booking_contact_missive_url', get: () => fieldVal('scheduler-f-cthread') },
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

  /* The billing workflow rux-ui keeps in the `billing-workflow-v1` settings
     row: which milestones are in use, and which billing statuses confirm a
     trip. `read` fills it with the week; these are rux-ui's defaults for a
     missing row or a missing part of one. */
  const CONFIRMING = ['contract_signed', 'po_partial', 'po_received', 'deposit_received', 'paid_full', 'overpaid'];
  const BILLING_DEFAULT = { steps: { contractSigned: true, poReceived: true, invoiced: true },
                            confirmWhen: ['contract_signed', 'po_received', 'deposit_received', 'paid_full'] };
  let billingWorkflow = BILLING_DEFAULT;
  function setBillingWorkflow(value) {
    const steps = { ...BILLING_DEFAULT.steps };
    for (const key of Object.keys(steps)) {
      if (value?.workflow?.[key]?.active === false) steps[key] = false;
    }
    const listed = Array.isArray(value?.confirmWhen) ? value.confirmWhen.filter(k => CONFIRMING.includes(k)) : [];
    billingWorkflow = { steps, confirmWhen: listed.length ? [...new Set(listed)] : BILLING_DEFAULT.confirmWhen };
  }
  // Whether a milestone is in use. One that is not counts as off.
  const stepOn = key => billingWorkflow.steps[key] !== false;

  /* The billing status ladder, rux-ui's `deriveStatus` in its
     `js/core/billing-config.js`; first match wins:

       overpaid          price > 0 && balance < 0
       paid_full         price > 0 && paid > 0 && balance <= 0
       po_partial        poReceived && price > 0 && poAmount < remaining
       po_received       poReceived
       deposit_received  paid > 0 && (balance > 0 || price <= 0)
       contract_signed   contractSigned
       pending           -- everything else

     The invoice milestone moves neither the status nor the confirmation. */
  function billingStatus({ contractSigned, poReceived, poAmount, price, paid }) {
    const balance = price - paid;
    const remaining = Math.max(0, balance);
    if (price > 0 && balance < 0) return 'overpaid';
    if (price > 0 && paid > 0 && balance <= 0) return 'paid_full';
    if (poReceived && price > 0 && poAmount < remaining) return 'po_partial';
    if (poReceived) return 'po_received';
    if (paid > 0 && (balance > 0 || price <= 0)) return 'deposit_received';
    if (contractSigned) return 'contract_signed';
    return 'pending';
  }
  // A partial PO confirms whenever a PO does, as in rux-ui.
  const confirmRungOf = rung => (rung === 'po_partial' ? 'po_received' : rung);
  const confirmsTrip = rung => billingWorkflow.confirmWhen.includes(confirmRungOf(rung));

  /* The open editor's billing as it stands: the status, whether it confirms
     the trip, and whether the payments reach the quote, with the latest
     payment's date. The tab's summary draws from it and Save writes from it,
     so what the tab says is what the trip becomes. */
  function billingNow() {
    const quoted = money(document.getElementById('scheduler-f-quoted')?.value);
    const price = quoted ?? 0;
    const amounts = payPending.map(p => Number(p.amount) || 0);
    const paid = amounts.reduce((n, a) => n + a, 0);
    const poAmount = poPending.reduce((n, p) => n + (Number(p.amount) || 0), 0);
    const poReceived = stepOn('poReceived') && on(document.getElementById('scheduler-f-poreceived'));
    const rung = billingStatus({
      contractSigned: stepOn('contractSigned') && on(document.getElementById('scheduler-f-contract')),
      poReceived, poAmount, price, paid,
    });
    const fullyPaid = price > 0 && price - paid <= 0;
    const lastPaid = payPending.filter((p, i) => amounts[i] > 0 && p.date).map(p => p.date).sort().pop() || null;
    return { quoted, price, paid, poAmount, poReceived, rung, confirmed: confirmsTrip(rung),
             fullyPaid, datePaid: fullyPaid ? lastPaid : null };
  }

  // The trip columns a save that changes billing derives, as rux-ui's does.
  const BILLING_KEYS = ['quoted_price', 'contract_status', 'contract_note', 'po_received', 'po_ref',
                        'po_amount', 'invoice_status', 'invoiced', 'invoice_number'];
  function derivedBilling() {
    const b = billingNow();
    return { confirmed: b.confirmed, balance_paid: b.fullyPaid, date_paid: b.datePaid };
  }

  /* A trip's milestones as rux-ui opens them. A confirmed trip with no
     contract status predates the column and counts as signed; a PO reference
     or an invoice number turns its milestone on. */
  const contractSignedOf = trip => stepOn('contractSigned')
    && (trip.contract_status === 'Signed' || (trip.contract_status == null && !!trip.confirmed));
  const poReceivedOf = trip => stepOn('poReceived') && !!(trip.po_received || trip.po_ref);
  const invoicedOf = trip => !!(trip.invoiced || trip.invoice_number || trip.invoice_status === 'Invoiced');

  /* A saved trip's money, read from its rows the way `billingNow` reads the
     open editor's, so the bar and the Billing tab put the trip on the same
     rung. The row lists are the live ones; the `deposit_amount` and `po_amount`
     aggregates are what rux-ui filled before those lists existed. A trip rux-ui
     marked paid with no payment rows carries the whole quote as paid, as
     rux-ui's own `normalizeRecord` does, so it is not read as owing it. */
  function billingOf(trip) {
    const sum = rows => (rows || []).reduce((n, r) => n + (Number(r.amount) || 0), 0);
    const price = Number(trip.quoted_price) || 0;
    const rows = trip.trip_payments?.length ? sum(trip.trip_payments) : Number(trip.deposit_amount) || 0;
    const paid = rows <= 0 && (trip.date_paid || trip.balance_paid) ? price : rows;
    const poAmount = trip.trip_pos?.length ? sum(trip.trip_pos) : Number(trip.po_amount) || 0;
    const poReceived = poReceivedOf(trip);
    const rung = billingStatus({ contractSigned: contractSignedOf(trip), poReceived, poAmount, price, paid });
    // The day the last payment landed. `date_paid` is the column both apps
    // derive on save; the rows are what a trip saved before it carries.
    const dates = (trip.trip_payments || []).filter(p => Number(p.amount) > 0 && p.date).map(p => p.date).sort();
    return { price, paid, poAmount, poReceived, rung,
             remaining: Math.max(0, price - paid), datePaid: trip.date_paid || dates.pop() || null };
  }

  /* The bar's payment mark, rux-ui's billing marks in one glyph the colour
     carries: red while nothing stands against the quote, amber while what does
     is the wrong amount, short or over, and green once the money is in. A PO
     that covers the balance shows nothing, because the trip is authorised and
     the payment is simply still to come. A trip with no quoted price has no
     coverage to judge and shows no mark either.

     An unconfirmed trip shows none at all. There is no contract behind it yet,
     so no purchase order and no payment is the state it is supposed to be in,
     and a mark saying so on every such bar marks nothing. The bar's own colour
     already says unconfirmed, and the Billing tab says the rest. */
  function paymentMark(trip) {
    if (trip.confirmed === false) return null;
    const { price, paid, poAmount, remaining, rung, datePaid } = billingOf(trip);
    if (price <= 0) return null;
    const mark = (label, tone) => ({ href: '#i-currency--dollar', label, tone });
    if (rung === 'pending') return mark('No purchase order or payment yet', 'error');
    if (rung === 'contract_signed') return mark('No purchase order yet', 'error');
    if (rung === 'po_partial') return mark(`Purchase order covers ${usd(poAmount)} of ${usd(remaining)}`, 'warning');
    if (rung === 'deposit_received' && remaining > 0) {
      return mark(`${usd(remaining)} not covered by a payment or purchase order`, 'warning');
    }
    if (rung === 'overpaid') return mark(`Paid ${usd(paid - price)} over the quote`, 'warning');
    if (rung === 'paid_full') return mark(datePaid ? `Paid in full ${mdy(datePaid)}` : 'Paid in full', 'success');
    return null;
  }

  let editing = null;   // { id, before: {...} }

  function readForm() {
    const f = {};
    for (const id of ['destination', 'customer', 'type', 'vehicle', 'sleeper', 'ada', '56pax', 'hotel', 'notes',
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

  /* mm/dd/yyyy for the dates this app renders itself, the shape the picker's
     inputs show too. The string is split rather than passed to `new Date()`,
     which reads a bare date as UTC midnight and prints the day before
     anywhere west of Greenwich. */
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

  /* The invoice dialog: a date and the invoice number. An invoice's amount
     feeds no total, so it is not asked for, and an amount rux-ui saved on the
     row is kept as it is. */
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
    );
    host.replaceChildren(grid);
    window.Rux?.datePicker?.init?.(host);
    window.Rux?.modal?.open?.('scheduler-inv-modal');
  }

  document.getElementById('scheduler-inv-done')?.addEventListener('click', () => {
    const val = id => document.getElementById(id)?.value.trim() ?? '';
    const row = { number: val('scheduler-f-inum') || null, date: isoOrNull(val('scheduler-f-idate')) };
    // An empty dialog adds nothing, the rule the other two dialogs follow.
    if (row.number === null && row.date === null) {
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



  /* ── The Route tab's model ──
     A leg is two times a person types, when the group leaves its pickup and
     when its trip ends, and the times worked out from them, kept in the rows
     rux-ui's itinerary writes and the board reads. The leg's `pickup` stop
     holds the pickup place, the drive from the yard, the yard departure in
     `depart_prev` and the spot time. The first `stop` after it holds the
     departure from the pickup in `depart_prev`, as rux-ui keeps it. Its last
     `return` stop, the yard, holds when the trip ends in `depart_prev`, the
     yard return in `arrive` and the drive back. A trip that is not a round
     trip ends somewhere else, the last `stop` before the return, which may be
     the first. Every other stop, rux-ui's itinerary, is left as it is. */
  let yardPlace = null;     // `yard-location-v1`: { name, address, lat, lng }
  let mapboxToken = null;   // `mapbox-token-v1`, Mapbox's public token

  // Minutes after midnight, and back, wrapping round the clock.
  const toMin = t => {
    const m = /^(\d{1,2}):(\d{2})/.exec(String(t ?? ''));
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  };
  const fromMin = n => {
    const d = ((n % 1440) + 1440) % 1440;
    return `${String(Math.floor(d / 60)).padStart(2, '0')}:${String(d % 60).padStart(2, '0')}`;
  };
  // A drive as rux-ui stores it, "H:MM", and as a person types it: "1:48",
  // "108" minutes or "1h 48m".
  const driveText = n => (n == null ? null : `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`);
  const driveMin = t => {
    const v = String(t ?? '').trim();
    if (!v) return null;
    let m = /^(\d+):(\d{1,2})$/.exec(v);
    if (m) return Number(m[1]) * 60 + Number(m[2]);
    if (/^\d+$/.test(v)) return Number(v);
    m = /^(?:(\d+)\s*h\w*)?\s*(?:(\d+)\s*m\w*)?$/i.exec(v);
    return m && (m[1] || m[2]) ? Number(m[1] || 0) * 60 + Number(m[2] || 0) : null;
  };
  const driveWords = (min, miles) => [
    min == null ? null : min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`,
    miles == null ? null : `${Math.round(miles)} mi`,
  ].filter(Boolean).join(' · ');
  const numOrNull = v => (v === null || v === undefined || v === '' ? null : Number(v));
  const dayAfter = (d, n) => (d ? iso(addDays(parseISO(d), n)) : null);

  /* Mapbox, as rux-ui calls it: Search Box for places, which knows schools
     and venues by name, and Directions for the drive between two. */
  async function mapboxJson(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Mapbox answered ${r.status}.`);
    return r.json();
  }
  async function searchPlaces(text) {
    if (!mapboxToken || text.trim().length < 3) return [];
    const q = new URLSearchParams({ q: text.trim(), auto_complete: 'true', limit: '6',
                                    country: 'us,mx', access_token: mapboxToken });
    if (yardPlace) q.set('proximity', `${yardPlace.lng},${yardPlace.lat}`);
    const data = await mapboxJson(`https://api.mapbox.com/search/searchbox/v1/forward?${q}`);
    return (data.features || []).map(f => {
      const p = f.properties || {};
      return { name: p.name || p.full_address || '', address: p.full_address || p.place_formatted || null,
               lat: p.coordinates?.latitude ?? null, lng: p.coordinates?.longitude ?? null,
               mapbox_id: p.mapbox_id || null };
    }).filter(p => p.name && p.lat != null);
  }
  const drives = new Map();
  function driveBetween(a, b) {
    if (!mapboxToken || a?.lat == null || b?.lat == null) return Promise.resolve(null);
    const key = `${a.lng},${a.lat};${b.lng},${b.lat}`;
    if (!drives.has(key)) {
      drives.set(key, mapboxJson(`https://api.mapbox.com/directions/v5/mapbox/driving/${key}`
        + `?overview=false&access_token=${encodeURIComponent(mapboxToken)}`)
        .then(d => {
          const route = d.routes?.[0];
          return route ? { min: Math.round(route.duration / 60), miles: Math.round(route.distance / 160.934) / 10 } : null;
        })
        .catch(e => { drives.delete(key); throw e; }));
    }
    return drives.get(key);
  }

  /* Two places are the same when Mapbox gave them the same id, or when
     their name and address both read the same. A drop-off the same as the
     pickup is what a round trip means, and writes no drop-off row. */
  const samePlace = (a, b) => {
    if (!a || !b) return !a && !b;
    if (a.mapbox_id && b.mapbox_id) return a.mapbox_id === b.mapbox_id;
    return same(a.name ?? null, b.name ?? null) && same(a.address ?? null, b.address ?? null);
  };
  const routeRound = () => samePlace(editing?.route?.dropPlace, editing?.route?.pickupPlace);
  // The leg's dates as the Details tab has them now.
  const routeDates = leg => {
    const v = id => isoOrNull(document.getElementById(id)?.value ?? '');
    const from = leg === 'return' ? v('scheduler-f-rstart') : v('scheduler-f-start');
    const to = leg === 'return' ? (v('scheduler-f-rend') ?? from) : (v('scheduler-f-end') ?? from);
    return { from, to };
  };
  const placeOf = row => (row ? { name: row.name ?? null, address: row.address ?? null,
    lat: numOrNull(row.lat), lng: numOrNull(row.lng), mapbox_id: row.mapbox_id ?? null } : null);

  /* The rows the form asks for, as column values. A date goes with its time:
     the departure on the leg's first day, the spot time and the yard
     departure a day earlier when they fall before midnight, the end on the
     leg's last day and the yard return a day later after midnight. A place or
     a drive is asked for only once it has changed, so a row's own values
     stand until then. */
  function routeWanted() {
    const r = editing?.route;
    if (!r) return null;
    const v = id => document.getElementById(id)?.value.trim() || null;
    const { from, to } = routeDates(r.leg);
    const leave = v('scheduler-f-leave'), spot = v('scheduler-f-spot'), yardOut = v('scheduler-f-depart');
    const end = v('scheduler-f-endtrip'), yardBack = v('scheduler-f-return');
    const round = routeRound();
    const drive = r.driveOut;
    const driveBack = r.backDrive;
    const driveCols = (row, min, miles, source) => (same(driveText(min), row?.drive ?? null) ? {} : {
      drive: driveText(min), miles: min == null ? null : miles,
      drive_source: min == null ? null : source, miles_source: min == null ? null : source,
    });
    const earlier = (a, b, day) => (a && b && toMin(a) > toMin(b) ? dayAfter(day, -1) : day);
    const spotDate = spot ? earlier(spot, leave, from) : null;
    const pickup = {
      ...(r.pickupPlace !== r.pickupOpen ? r.pickupPlace ?? placeOf({}) : {}),
      spot, spot_date: spotDate,
      depart_prev: yardOut, depart_prev_date: yardOut ? earlier(yardOut, spot, spotDate ?? from) : null,
      ...driveCols(r.pickup, drive, r.driveMiles, r.driveSource),
    };
    const first = { depart_prev: leave, depart_prev_date: leave ? from : null };
    const drop = round ? null : {
      ...(r.dropPlace !== r.dropOpen ? r.dropPlace ?? placeOf({}) : {}),
      arrive: end, arrive_date: end ? to : null,
    };
    const ret = {
      depart_prev: end, depart_prev_date: end ? to : null,
      arrive: yardBack, arrive_date: yardBack ? (end && toMin(yardBack) < toMin(end) ? dayAfter(to, 1) : to) : null,
      ...driveCols(r.back, driveBack, r.backMiles, r.backSource),
    };
    return { pickup, first, drop, ret };
  }

  // Whether a stored value and a wanted one are the same, times cut to HH:MM
  // and numbers compared as numbers.
  const TIME_KEYS = ['depart_prev', 'arrive', 'spot'];
  const NUM_KEYS = ['lat', 'lng', 'miles'];
  const sameValue = (key, a, b) => (TIME_KEYS.includes(key) ? same(hhmmOrNull(a), hhmmOrNull(b))
    : NUM_KEYS.includes(key) ? same(numOrNull(a), numOrNull(b)) : same(a || null, b || null));
  // A date is written only beside its own time, or when the leg's dates moved.
  const DATE_OF = { spot_date: 'spot', depart_prev_date: 'depart_prev', arrive_date: 'arrive' };

  function rowPatch(row, wanted, datesMoved) {
    const patch = {};
    for (const [key, value] of Object.entries(wanted)) {
      if (key in DATE_OF) continue;
      if (!sameValue(key, row[key], value)) patch[key] = value;
    }
    for (const [key, time] of Object.entries(DATE_OF)) {
      if (!(key in wanted)) continue;
      if ((time in patch || datesMoved) && !same(row[key] ?? null, wanted[key])) patch[key] = wanted[key];
    }
    return patch;
  }
  const hasAny = o => Object.values(o).some(v => v !== null && v !== undefined && v !== '');

  /* What the Route tab writes to `trip_stops`: updates to the rows the leg
     has, and the rows it lacks, each placed where rux-ui keeps it: the pickup
     first on its leg, the first stop just after it, the return last. */
  function routePlan() {
    const r = editing?.route;
    const wanted = routeWanted();
    if (!r || !wanted) return { updates: [], inserts: [], work: false };
    const { from, to } = routeDates(r.leg);
    const datesMoved = !same(from, r.from) || !same(to, r.to);
    const updates = [];
    const inserts = [];
    const plan = (row, want, insert) => {
      if (row) {
        const patch = rowPatch(row, want, datesMoved);
        if (Object.keys(patch).length) updates.push({ id: row.id, patch });
      } else if (insert && hasAny(want)) {
        inserts.push(insert(want));
      }
    };
    plan(r.pickup, wanted.pickup, want => ({ at: 'start', row: { type: 'pickup', ...want } }));
    /* The departure goes on the first stop. A round trip's new first stop is
       named for the trip's destination; on any other trip the stop the group
       leaves for is its drop-off, so a leg with no stops gets one row that is
       both, and a leg with one stop has it hold both. */
    if (!wanted.drop) {
      const destination = document.getElementById('scheduler-f-destination')?.value.trim() || null;
      plan(r.first, wanted.first, want => ({ at: 'after-pickup', row: { type: 'stop', name: destination, ...want } }));
    } else if (!r.first || r.first === r.drop) {
      plan(r.first, { ...wanted.first, ...wanted.drop }, want => ({ at: 'after-pickup', row: { type: 'stop', ...want } }));
    } else {
      plan(r.first, wanted.first);
      plan(r.drop, wanted.drop);
    }
    const yard = r.back ? {} : { name: yardPlace?.name ?? 'Yard', address: yardPlace?.address ?? null,
                                  lat: yardPlace?.lat ?? null, lng: yardPlace?.lng ?? null };
    plan(r.back, wanted.ret, want => ({ at: 'end', row: { type: 'return', ...yard, ...want } }));
    return { updates, inserts, work: !!(updates.length || inserts.length) };
  }

  /* Writes the plan. A new row takes its place by moving the rows at and
     after it one down, since rux-ui orders a trip's stops by `position`
     across both legs. */
  async function saveRoute(tripId, write) {
    const r = editing?.route;
    const { updates, inserts } = routePlan();
    for (const u of updates) {
      await write('its route', client.from('trip_stops').update(u.patch).eq('id', u.id));
    }
    const rows = (r?.all ?? []).map(x => ({ ...x }));
    const legRows = () => rows.filter(x => x.leg === r.leg).sort((a, b) => a.position - b.position);
    const top = () => rows.reduce((n, x) => Math.max(n, x.position), -1);
    for (const ins of inserts) {
      const mine = legRows();
      const pick = mine.find(x => x.type === 'pickup');
      const pos = ins.at === 'start' ? (mine[0]?.position ?? top() + 1)
        : ins.at === 'after-pickup' ? (pick ? pick.position + 1 : (mine[0]?.position ?? top() + 1))
        : (mine.at(-1)?.position ?? top()) + 1;
      for (const x of rows.filter(x => x.position >= pos).sort((a, b) => b.position - a.position)) {
        x.position += 1;
        await write('its route', client.from('trip_stops').update({ position: x.position }).eq('id', x.id));
      }
      const saved = await write('its route', client.from('trip_stops')
        .insert({ trip_id: tripId, leg: r.leg, position: pos, ...ins.row }).select('id').single());
      rows.push({ id: saved.id, leg: r.leg, type: ins.row.type, position: pos });
    }
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
    return routePlan().work || !!paymentsPatch()?.work
      || !!posPatch()?.work || !!invoicesPatch()?.work || fleetChanged()
      || (!!patch && Object.keys(patch).length > 0);
  }

  // Unsaved work is a change in an editor that is open.
  function unsavedWork() { return !panelEl.hidden && changed(); }

  /* The title names the trip being edited, from the destination as typed, since
     the selected bar can be a different trip: the destination on one line, the
     whole name on hover, and "Edit trip" before it for a screen reader, as the
     roster's and the schedule's titles carry no icon. A new trip is titled in
     words. */
  function setTitle() {
    if (!editing) return;
    const dest = document.getElementById('scheduler-f-destination')?.value.trim();
    for (const h of [panelTitle, panelTitleCollapsed]) {
      if (editing.creating) { h.textContent = 'New trip'; h.removeAttribute('title'); continue; }
      h.replaceChildren(el('span', 'rux--visually-hidden', 'Edit trip: '), document.createTextNode(dest || 'No destination'));
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
    // A driver in two seats of one leg is the Fleet tab's one blocking error.
    const fleetOk = !fleetDuplicates().size;
    panelSave.disabled = !startOk || !destOk || !fleetOk || nothingToDo;
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
      trip_type: 'round_trip', vehicle_type: null, confirmed: false,
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

    // A plain heading until `refreshDirty` calls `setTitle`, which names the trip.
    const heading = creating ? 'New trip' : 'Edit trip';
    panelTitle.textContent = heading;
    panelTitleCollapsed.textContent = heading;

    const legDays = leg ? daysBetween(parseISO(leg.from), parseISO(leg.to)) + 1 : 0;
    const when = !leg ? '' : leg.from === leg.to
      ? parseISO(leg.from).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
      : `${parseISO(leg.from).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} to ${parseISO(leg.to).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} (${legDays} days)`;

    editing = { id: trip.id, creating, updatedAt: trip.updated_at ?? null, before: {
      destination: trip.destination ?? null,
      customer: trip.customer ?? null,
      trip_type: trip.trip_type ?? null,
      vehicle_type: trip.vehicle_type ?? null,
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
      // The milestones as the switches open, so an untouched trip saves none.
      contract_status: contractSignedOf(trip) ? 'Signed' : 'Pending',
      invoice_status: invoicedOf(trip) ? 'Invoiced' : 'Pending',
      contract_note: contractSignedOf(trip) ? (trip.contract_note ?? null) : null,
      // Booleans take `!!`, not `?? null`, because `same(false, null)` is a change.
      po_received: poReceivedOf(trip),
      invoiced: invoicedOf(trip),
      est_miles: trip.est_miles ?? null,
      actual_miles: trip.actual_miles ?? null,
      itinerary_not_needed: !!trip.itinerary_not_needed,
      booking_contact_id: trip.booking_contact_id ?? null,
      trip_contact_1_id: trip.trip_contact_1_id ?? null,
      trip_contact_2_id: trip.trip_contact_2_id ?? null,
      trip_contact_3_id: trip.trip_contact_3_id ?? null,
      trip_contact_4_id: trip.trip_contact_4_id ?? null,
      trip_contact_5_id: trip.trip_contact_5_id ?? null,
      ...contactColumnsOf(trip),
      booking_contact_missive_url: trip.booking_contact_missive_url ?? null,
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

    /* The route's rows are kept apart from `editing.before`: they are
       `trip_stops` rows, not `trips` columns, so they diff and write
       separately. `pickup`, `drop` and `back` are the rows as they opened;
       the places and drives are what the tab has picked since, which
       `routeWanted` reads. A new trip has no rows, and Save makes them. */
    editing.route = (() => {
      const leg = creating ? 'outbound' : legName;
      const stops = creating ? [] : stopsOfLeg(trip, leg).stops;
      const pickup = stops.find(x => x.type === 'pickup') ?? null;
      const backIndex = stops.map(x => x.type).lastIndexOf('return');
      const back = backIndex >= 0 ? stops[backIndex] : null;
      // The stops between pickup and return: the first holds the departure,
      // and the last is where a trip that is not a round trip ends.
      const inner = stops.slice(pickup ? stops.indexOf(pickup) + 1 : 0, backIndex >= 0 ? backIndex : stops.length)
        .filter(x => x.type === 'stop');
      const first = inner[0] ?? null;
      const drop = inner.at(-1) ?? null;
      const dates = leg === 'return'
        ? { from: trip.return_start_date ?? null, to: trip.return_end_date ?? trip.return_start_date ?? null }
        : { from: trip.start_date ?? null, to: trip.end_date ?? trip.start_date ?? null };
      return {
        leg, pickup, first, drop, back, ...dates,
        between: inner.length,
        all: (trip.trip_stops || []).map(x => ({ id: x.id, leg: x.leg || 'outbound', type: x.type, position: x.position ?? 0 })),
        driveOut: driveMin(pickup?.drive),
        driveMiles: numOrNull(pickup?.miles), driveSource: pickup?.drive_source ?? 'estimated',
        backDrive: driveMin(back?.drive), backMiles: numOrNull(back?.miles), backSource: back?.drive_source ?? 'estimated',
      };
    })();
    // The places as they opened, so `routeWanted` can tell a new pick.
    editing.route.pickupOpen = editing.route.pickupPlace = placeOf(editing.route.pickup);
    editing.route.dropOpen = editing.route.dropPlace = placeOf(editing.route.drop);

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
       shows only for a split and keeps its Pick-up labels. */
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

    /* The vehicle types are the fleet's own, so a new type needs no code, and
       a trip keeps a type no active bus has any more. A tag shows for a type
       when an active bus of that type has the equipment; Any shows every tag,
       and Hotel always shows, since it is not the bus's. */
    const fleet = [...(panelIndex.buses?.values() ?? [])].filter(b => b.status === 'active');
    const vehicleTypes = [...new Set([...fleet.map(b => b.type), trip.vehicle_type].filter(Boolean))].sort();
    const EQUIPMENT = [
      ['scheduler-f-sleeper', b => b.sleeper],
      ['scheduler-f-ada', b => b.ada_lift],
      ['scheduler-f-56pax', b => b.capacity != null && b.capacity >= 56],
    ];
    /* A tag the type does not offer hides. On a change of type it also turns
       off; on opening, a tag already on stays shown, so no saved need is
       hidden. */
    const syncNeeds = (type, clear) => {
      for (const [id, has] of EQUIPMENT) {
        const tag = flags.querySelector(`#${id}`);
        const offered = !type || fleet.some(b => b.type === type && has(b));
        if (!offered && clear && pressed(tag)) {
          tag.setAttribute('aria-pressed', 'false');
          tag.classList.remove('rux--tag--selectable-selected');
        }
        tag.hidden = !offered && !pressed(tag);
      }
    };
    syncNeeds(trip.vehicle_type, false);

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

    /* The trip's own fields are one stack, 24px apart. Type and Vehicle share a
       row, so the split type is named "Split" there, which half the panel
       fits; the date labels still say Drop-off and Pick-up. Trip bar color
       takes a row, because half the panel cuts off "Standard"; it is a
       property of the trip, not a section of its own. */
    const topFields = el('div', 'rux--stack-vertical rux--stack-scale-6');
    topFields.append(
      dateRange('scheduler-f-start', 'scheduler-f-end', outFrom, outTo, trip.start_date, trip.end_date || trip.start_date),
      returnDates,
      textField('scheduler-f-destination', 'Destination', trip.destination),
      // The organization is `trips.customer`; the contact's own `client` is not shown.
      textField('scheduler-f-customer', 'Organization', trip.customer),
      pair(
        selectField('scheduler-f-type', 'Type', trip.trip_type, [
          ['', '—'],
          ['round_trip', 'Round trip'],
          ['one_way', 'One way'],
          [SPLIT, 'Split'],
        ]),
        selectField('scheduler-f-vehicle', 'Vehicle', trip.vehicle_type,
          [['', 'Any'], ...vehicleTypes.map(t => [t, t])]),
      ),
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
        // The booking's conversation, a link; its button opens it.
        withCopy(textField('scheduler-f-cthread', 'Email thread', trip.booking_contact_missive_url),
          'scheduler-f-cthread', 'Email thread', true),
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
       Six fields: where the group is picked up and where it is dropped off,
       each a name and an address, and the two times the group moves. The
       bus's three times -- leaving the yard, reaching the pickup, getting
       back -- are worked out from those and shown, never typed. The panel
       opens from one bar, so the fields are that leg's; a drop-off and
       pick-up trip shows its other leg from the other bar. `editing.route`
       holds the rows and what has been picked since. */
    panelRoute.replaceChildren();
    {
      const r = editing.route;
      /* The drop-off defaults to the pickup, which is what a round trip
         means. `routeWanted` writes a drop-off row only when the two places
         differ, so a round trip's rows stay exactly as rux-ui left them. */
      if (!r.dropPlace && r.pickupPlace) r.dropPlace = { ...r.pickupPlace };
      // A line under a field, hidden while it has nothing to say.
      const note = text => {
        const line = el('p', 'rux--form__helper-text scheduler-route-note', text);
        line.hidden = !text;
        return line;
      };
      const val = id => document.getElementById(id)?.value.trim() || '';
      const setVal = (id, value) => { const input = document.getElementById(id); if (input) input.value = value ?? ''; };

      // The bus is spotted a fixed fifteen minutes before the group leaves.
      const PADDING = 15;

      /* The worked-out times are not fields: they are kept in hidden inputs,
         which `routeWanted` reads, and drawn as a timeline under the fields. */
      const kept = (id, value) => {
        const input = el('input');
        input.type = 'hidden';
        input.id = id;
        input.value = hhmmOrNull(value) ?? '';
        return input;
      };

      const recalcYard = () => {
        const spot = toMin(val('scheduler-f-spot'));
        setVal('scheduler-f-depart', spot != null && r.driveOut != null ? fromMin(spot - r.driveOut) : '');
      };
      const recalcSpot = () => {
        const leave = toMin(val('scheduler-f-leave'));
        setVal('scheduler-f-spot', leave == null ? '' : fromMin(leave - PADDING));
        recalcYard();
      };
      const recalcReturn = () => {
        const end = toMin(val('scheduler-f-endtrip'));
        setVal('scheduler-f-return', end != null && r.backDrive != null ? fromMin(end + r.backDrive) : '');
      };

      const lookupFailed = (e, what) => toast('warning', `The drive ${what} was not found.`,
        `${e?.message || 'Mapbox did not answer.'} The yard time stays blank until it answers.`);

      /* The day in order, each time named for who moves. The group's two are
         the ones typed; the bus's three follow from them. A time before the
         one under it is the day before, and a yard return before the group
         arrives is the day after. */
      const timeline = el('dl', 'scheduler-def scheduler-route-timeline');
      const clock = t => {
        const m = toMin(t);
        if (m == null) return '—';
        return `${(Math.floor(m / 60) % 12) || 12}:${String(m % 60).padStart(2, '0')} ${m < 720 ? 'AM' : 'PM'}`;
      };
      const drawTimeline = () => {
        const leave = val('scheduler-f-leave'), spot = val('scheduler-f-spot'), yard = val('scheduler-f-depart');
        const end = val('scheduler-f-endtrip'), home = val('scheduler-f-return');
        const before = (a, b) => a && b && toMin(a) > toMin(b) ? 'the day before' : null;
        const { from, to } = routeDates(r.leg);
        const endDay = end && to && from && to !== from
          ? parseISO(to).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : null;
        const outWords = driveWords(r.driveOut, r.driveMiles);
        const backWords = driveWords(r.backDrive, r.backMiles);
        const rows = [
          ['Yard depart', yard, [outWords ? `${outWords} from the yard`
                                          : (r.pickupPlace ? 'no drive from the yard yet' : null),
                                 before(yard, spot)]],
          ['Bus arrives', spot, [`${PADDING} min before the group leaves`, before(spot, leave)]],
          ['Group departs', leave, [r.pickupPlace?.name]],
          ['Group arrives', end, [r.dropPlace?.name, endDay]],
          ['Yard return', home, [backWords ? `${backWords} back to the yard`
                                           : (r.dropPlace ? 'no drive back yet' : null),
                                 home && end && toMin(home) < toMin(end) ? 'the next day' : null]],
        ];
        timeline.replaceChildren();
        for (const [label, time, notes] of rows) {
          const dd = el('dd');
          dd.appendChild(el('span', 'scheduler-route-time', clock(time)));
          const said = notes.filter(Boolean).join(' · ');
          if (said) dd.appendChild(el('span', 'scheduler-route-why', said));
          timeline.append(el('dt', null, label), dd);
        }
      };

      /* A place is two fields: a name anyone would recognise it by, and the
         address the drive is measured from. Picking an address fills an empty
         name from the result, and the name stays editable after. */
      const named = (place, name) => (place || name ? { ...(place ?? placeOf({})), name: name ?? place?.name ?? null } : null);

      const driveOutFrom = async place => {
        try {
          const drive = await driveBetween(yardPlace, place);
          if (!drive || r.pickupPlace !== place) return;
          r.driveOut = drive.min;
          r.driveMiles = drive.miles;
          r.driveSource = 'estimated';
          recalcYard();
        } catch (e) { r.driveOut = null; recalcYard(); lookupFailed(e, 'from the yard'); }
      };
      const driveBackFrom = async place => {
        try {
          const drive = await driveBetween(place, yardPlace);
          if (!drive || r.dropPlace !== place) return;
          r.backDrive = drive.min;
          r.backMiles = drive.miles;
          r.backSource = 'estimated';
          recalcReturn();
        } catch (e) { r.backDrive = null; recalcReturn(); lookupFailed(e, 'back to the yard'); }
      };

      const pickupName = textField('scheduler-f-pickupname', 'Pickup location', r.pickupPlace?.name);
      const dropName = textField('scheduler-f-dropname', 'Drop-off location', r.dropPlace?.name);

      const pickupField = placeSearch('scheduler-f-pickup', 'Pickup address', r.pickupPlace, async (place, typed) => {
        if (!place) {
          r.pickupPlace = named(typed ? { ...placeOf({}), address: typed } : null, val('scheduler-f-pickupname') || null);
          r.driveOut = null;
          recalcYard();
          drawTimeline();
          return;
        }
        if (!val('scheduler-f-pickupname')) setVal('scheduler-f-pickupname', place.name ?? '');
        r.pickupPlace = named(place, val('scheduler-f-pickupname') || place.name || null);
        // A drop-off nobody has changed follows the pickup, round trip or not.
        if (!val('scheduler-f-dropname') && !val('scheduler-f-dropoff')) {
          setVal('scheduler-f-dropname', val('scheduler-f-pickupname'));
          setVal('scheduler-f-dropoff', place.address ?? '');
          r.dropPlace = { ...r.pickupPlace };
        }
        drawTimeline();
        await driveOutFrom(r.pickupPlace);
        if (r.dropPlace && samePlace(r.dropPlace, r.pickupPlace)) {
          r.backDrive = r.driveOut; r.backMiles = r.driveMiles; r.backSource = r.driveSource;
          recalcReturn();
        }
        drawTimeline();
        refreshDirty();
      }, 'address');

      const dropField = placeSearch('scheduler-f-dropoff', 'Drop-off address', r.dropPlace, async (place, typed) => {
        if (!place) {
          r.dropPlace = named(typed ? { ...placeOf({}), address: typed } : null, val('scheduler-f-dropname') || null);
          r.backDrive = null;
          recalcReturn();
          drawTimeline();
          return;
        }
        if (!val('scheduler-f-dropname')) setVal('scheduler-f-dropname', place.name ?? '');
        r.dropPlace = named(place, val('scheduler-f-dropname') || place.name || null);
        drawTimeline();
        await driveBackFrom(r.dropPlace);
        drawTimeline();
        refreshDirty();
      }, 'address');

      const fields = el('div', 'rux--stack-vertical rux--stack-scale-6');
      fields.append(
        pair(pickupName, pickupField),
        pair(dropName, dropField),
        pair(timeField('scheduler-f-leave', 'Group departs', r.first?.depart_prev),
             timeField('scheduler-f-endtrip', 'Group arrives', r.back?.depart_prev)),
      );

      // The section is a group named by its title, as Day-of contacts is.
      const routeBox = el('div', 'scheduler-panel-section');
      const routeTitle = el('div', 'scheduler-panel-section__title', r.leg === 'return' ? 'Pick-up leg' : 'Trip');
      routeTitle.id = 'scheduler-f-routegroup';
      const routeGroup = el('div');
      routeGroup.setAttribute('role', 'group');
      routeGroup.setAttribute('aria-labelledby', routeTitle.id);
      routeGroup.append(routeTitle, fields);
      routeBox.appendChild(routeGroup);

      const times = el('div');
      times.append(timeline,
        kept('scheduler-f-spot', r.pickup?.spot), kept('scheduler-f-depart', r.pickup?.depart_prev),
        kept('scheduler-f-return', r.back?.arrive));
      // The stops between, which only rux-ui's itinerary edits, are named last.
      if (r.between) {
        times.appendChild(note(r.between === 1
          ? "This leg has one stop from rux-ui's itinerary. It stays as it is."
          : `This leg has ${r.between} stops from rux-ui's itinerary. They stay as they are.`));
      }

      /* The trip's miles, both legs together. The estimate is an override, as
         in rux-ui: left blank, the stops' own miles stand, and the field shows
         their sum as its placeholder. */
      const stopMiles = (trip.trip_stops || []).reduce((n, st) => n + (Number(st.miles) || 0), 0);
      const miles = pair(
        moneyField('scheduler-f-estmiles', 'Estimated miles', trip.est_miles),
        moneyField('scheduler-f-actmiles', 'Actual miles', trip.actual_miles),
      );
      if (stopMiles > 0) miles.querySelector('#scheduler-f-estmiles').placeholder = `${Math.round(stopMiles)} by route`;

      panelRoute.append(
        routeBox,
        section('Times', times),
        section('Miles', miles),
      );
      drawTimeline();

      document.getElementById('scheduler-f-leave')?.addEventListener('input', recalcSpot);
      document.getElementById('scheduler-f-endtrip')?.addEventListener('input', recalcReturn);
      // A name typed by hand belongs to whichever place it names.
      document.getElementById('scheduler-f-pickupname')?.addEventListener('input', () => {
        r.pickupPlace = named(r.pickupPlace, val('scheduler-f-pickupname') || null);
        drawTimeline();
      });
      document.getElementById('scheduler-f-dropname')?.addEventListener('input', () => {
        r.dropPlace = named(r.dropPlace, val('scheduler-f-dropname') || null);
        drawTimeline();
      });
      // The timeline follows every field, after the handlers above.
      fields.addEventListener('input', drawTimeline);
      document.getElementById('scheduler-f-type')?.addEventListener('change', drawTimeline);
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
        contractSignedOf(trip));

      /* The PO coverage line. A PO confirms the trip whatever its amount
         (rux-ui's `isStatusConfirmed`), so the line only says what the POs and
         payments leave uncovered, counted as `billingStatus` counts it:

             shortfall = max(0, (quoted - paid) - po_amount) */
      const poCoverage = el('p', 'rux--form__helper-text');
      // It sits in the list, under the POs and over the add tile it speaks to.
      const poCoverageItem = el('li');
      poCoverageItem.appendChild(poCoverage);
      const poSwitch = toggleAction('scheduler-f-poreceived', 'PO received',
        poReceivedOf(trip));
      const invoiceSwitch = toggleAction('scheduler-f-invoice', 'Invoice sent',
        invoicedOf(trip));

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
            name: p.ref ? `PO ${p.ref}` : ref, meta: p.date ? mdy(p.date) : 'No date', much,
            title: ['Purchase order', ref, p.date ? mdy(p.date) : null, much || 'No amount'].filter(Boolean).join(' · '),
            edit: () => openPoDialog(i),
            removeLabel: `Remove purchase order ${ref}`,
            remove: () => { poPending.splice(i, 1); drawPos(); refreshDirty(); },
          }));
        });
        poList.body.appendChild(poCoverageItem);
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
          invList.body.appendChild(listRow({
            name: v.number ? `Invoice ${v.number}` : num, meta: v.date ? mdy(v.date) : 'No date',
            title: ['Invoice', num, v.date ? mdy(v.date) : null].filter(Boolean).join(' · '),
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
      // The unconfirmed line names what would confirm the trip, from the workflow.
      const WOULD_CONFIRM = [
        ['contract_signed', 'a signed contract'],
        ['po_received', 'a PO'],
        ['deposit_received', 'any payment'],
      ].filter(([rung]) => billingWorkflow.confirmWhen.includes(rung)
        && (rung !== 'contract_signed' || stepOn('contractSigned'))
        && (rung !== 'po_received' || stepOn('poReceived')))
        .map(([, words]) => words);
      const wouldConfirm = WOULD_CONFIRM.length
        ? `${WOULD_CONFIRM.length > 1 ? `${WOULD_CONFIRM.slice(0, -1).join(', ')} or ${WOULD_CONFIRM.at(-1)}` : WOULD_CONFIRM[0]} confirms it.`
        : 'Payment in full confirms it.';
      const cap = t => t.charAt(0).toUpperCase() + t.slice(1);

      const statusLine = el('div', 'scheduler-billing-status');
      const figures = el('dl', 'scheduler-billing-figures');
      const confirmWhy = el('p', 'rux--form__helper-text');
      const drawSummary = () => {
        // The PO amount is the sum of the PO rows, so coverage counts every PO.
        const { quoted, price, paid, poAmount, poReceived: poOn, rung, confirmed } = billingNow();
        const remaining = Math.max(0, price - paid);
        const shortfall = Math.max(0, remaining - poAmount);

        // The coverage line gives the amount, which is what the next PO or
        // payment has to close.
        poCoverage.textContent = !poOn ? ''
          : price <= 0 ? 'No quoted price to cover'
          : shortfall <= 0 ? 'Covers the balance'
          : `${usd(shortfall)} uncovered. Add a PO or payment.`;
        poCoverageItem.hidden = !poCoverage.textContent;

        const [rungLabel, rungTone] = STATUS_LABEL[rung];

        /* The status line: Carbon's icon indicator for whether the trip is
           confirmed, and the billing status as a tag at the end. */
        const state = el('div', 'rux--icon-indicator');
        const mark = svgUse(confirmed ? '#i-checkmark--filled' : '#i-circle-dash', '20', '0 0 32 32');
        mark.setAttribute('class', confirmed ? 'rux--icon-indicator--succeeded' : 'rux--icon-indicator--not-started');
        state.append(mark, confirmed ? 'Confirmed' : 'Not confirmed');
        const status = el('span', `rux--tag rux--layout--size-sm ${rungTone}`, rungLabel);
        status.title = `Billing status: ${rungLabel}`;
        statusLine.replaceChildren(state, status);
        // Paid and Balance side by side; the quoted price is the field below.
        const figure = (label, value) => {
          const box = el('div');
          box.append(el('dt', null, label), el('dd', null, value));
          return box;
        };
        figures.replaceChildren(
          figure('Paid', usd(paid)),
          figure('Balance', quoted === null ? 'No quote'
            : (quoted - paid < 0 ? `−${usd(paid - quoted)}` : usd(quoted - paid))),
        );
        /* Unconfirmed, the line states what would confirm the trip. Confirmed,
           the status tag already names what did, so the line is hidden. */
        confirmWhy.textContent = confirmed ? '' : cap(wouldConfirm);
        confirmWhy.hidden = confirmed;
      };
      /* The summary opens the tab as its first section, with no box: the status
         line, the reason line while unconfirmed, then the money. */
      const summary = el('div', 'rux--stack-vertical rux--stack-scale-5');
      summary.append(statusLine, confirmWhy, figures);
      panelBilling.appendChild(section(null, summary));

      // One field needs no heading over its own label.
      panelBilling.appendChild(section(null,
        moneyField('scheduler-f-quoted', 'Quoted price', trip.quoted_price)));

      /* Payments use the same `rowList` as PO and invoice, named by their
         method, with no switch: a receipt has no milestone to gate. */
      const payList = rowList();
      const draw = () => {
        payList.body.replaceChildren();
        pending.forEach((p, i) => {
          const when = p.date ? mdy(p.date) : 'No date';
          const much = usd(Number(p.amount) || 0);
          payList.body.appendChild(listRow({
            name: p.method || 'Payment', meta: when, much,
            /* The reference is on the tooltip and in the dialog, not the tile: it
               is looked up rather than scanned, and it would wrap the line. */
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
      const listWrap = section('Payments', payList.list);

      /* The order is contract, PO and invoice, as the ladder climbs, then
         payments last because it is the only section that grows. Every section
         is a `section()`, so the three switches share one right edge. */
      const poBody = poList.list;

      const invBody = invList.list;
      const poWrap = section('PO received', poBody, poSwitch);
      const invWrap = section('Invoice sent', invBody, invoiceSwitch);
      const contractSection = section('Contract signed', contract, contractSwitch);

      // A milestone the workflow does not use is not shown, and counts as off.
      contractSection.hidden = !stepOn('contractSigned');
      poWrap.hidden = !stepOn('poReceived');
      invWrap.hidden = !stepOn('invoiced');
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
      /* A list is gated by what sits under its heading, not its section, whose
         heading holds the switch; hiding it also drops the space under the
         heading. The `<ul>` is hidden too, which `.scheduler-list-body[hidden]`
         keeps hidden. Off empties the array, and `clear` is
         false on the first pass, as with the fields. */
      const syncLists = (clear) => {
        for (const [toggleId, box, content, pending, redraw] of [
          ['scheduler-f-poreceived', poList, poBody, poPending, drawPos],
          ['scheduler-f-invoice', invList, invBody, invPending, drawInvoices]]) {
          const open = on(document.getElementById(toggleId));
          box.body.hidden = !open;
          content.hidden = !open;
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

    /* Fleet is how many buses each leg needs, the bus on each and who fills its
       seats; the dates are in Details and the times in Route. A new trip from a
       cell starts on that cell's bus. */
    editing.fleet = fleetOf(trip, creating);
    editing.fleetBefore = cloneFleet(editing.fleet);
    editing.fleetCounts = { outbound: editing.fleet.outbound.length, return: editing.fleet.return.length };
    fleetClashes = null;
    fleetClashKey = '';
    drawFleet();

    /* Files holds the Itinerary not needed switch, which Save writes like any
       field, then the uploader and the trip's files, which write at once. A
       trip not yet saved has no id to file under. */
    panelFiles.replaceChildren();
    const notNeeded = section('Itinerary not needed',
      el('p', 'rux--form__helper-text', 'On for a trip that runs without one, so its bars stop showing No itinerary yet.'),
      toggleAction('scheduler-f-notneeded', 'Itinerary not needed', !!trip.itinerary_not_needed));
    if (creating || !client) {
      filesBody = null;
      filesEmpty = null;
      panelFiles.append(notNeeded, section('Files', el('p', 'rux--form__helper-text', creating
        ? 'Save the trip first, then add its itinerary, contract and purchase order here.'
        : 'This preview has no connection, so files cannot be listed or added.')));
    } else {
      const { list, body } = rowList();
      filesBody = body;
      filesEmpty = el('p', 'rux--form__helper-text', 'No files yet. A file added above is listed here.');
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
    for (const tp of [panelDetails, panelBilling, panelRoute, panelFleet, panelFiles]) {
      const focusable = tp.querySelector('input, select, textarea, button, a[href], [tabindex]:not([tabindex="-1"])');
      if (focusable) tp.removeAttribute('tabindex');
      else tp.setAttribute('tabindex', '0');
    }

    document.getElementById('scheduler-f-type')?.addEventListener('change', e => {
      const split = e.target.value === SPLIT;
      returnDates.hidden = !split;
      setOutLabels(split);
      setHotelLegs(split);
      drawFleet();
      refreshDirty();
    });
    document.getElementById('scheduler-f-vehicle')?.addEventListener('change', e => {
      syncNeeds(e.target.value, true);
      drawFleet();
      refreshDirty();
    });

    refreshDirty();
    loadFleetClashes();

    if (!again) panelOpener = bar;
    panelEl.hidden = false;
    if (tripEl) tripEl.hidden = false;
    // Once the panel shows, so Open trip and the driver grid treat this trip
    // as the one in the editor.
    syncSelection();
    // The editor is open now, so the board is measured again before it is fit.
    placeRoom();
    window.Rux?.schedule?.fit?.();
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
  /* Set by `drawAvailability` and called by the scroll below. The region is
     taken by id, because the grid is moved into it only when the roster is
     shown. Capture, because a scroll does not bubble: the card scrolls below
     md and the pane inside it above, and one listener hears both. */
  let nameAvailBand = () => {};
  document.getElementById('scheduler-aside')
    ?.addEventListener('scroll', () => nameAvailBand(), true);
  const availToggle = document.getElementById('scheduler-avail-toggle');
  let availOn = false;
  let availRows = [];

  function availabilityRows({ trips, drivers, timeOff, weekStart, weekEnd }) {
    const rows = (drivers || [])
      /* Active drivers only. The roster answers who can take a trip, and an
         inactive driver cannot, so their week is noise. A driver with no
         status counts as active, as the Fleet tab's picker reads it. */
      .filter(d => !d.status || d.status === 'active')
      /* Priority first, the order the office calls drivers in, so the top of
         the roster is who to ask next. 1 to 5; a driver with none sorts below
         5, and names settle a tie. */
      .sort((a, b) => ((a.priority ?? 9) - (b.priority ?? 9))
        || (a.short_name || a.name || '').localeCompare(b.short_name || b.name || ''))
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

    /* The first band's name heads the whole roster, in the column header where
       "Driver" used to sit: a band heading is the header band again, so one
       drawn against the header's own edge would be that header twice. An empty
       roster has no band to name and keeps "Driver". */
    const bandName = p => p == null ? 'No priority' : `Priority ${p}`;
    const firstBand = rows.length ? (rows[0].driver.priority ?? null) : null;

    const head = el('div', 'scheduler-avail__days');
    head.appendChild(el('div', 'scheduler-avail__day scheduler-avail__day--head',
      rows.length ? bandName(firstBand) : 'Driver'));
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart.getTime() + i * DAY);
      /* One letter, taken from the locale's own `short` weekday, for the
         quietest header the seven columns can carry. It repeats -- T and T, S
         and S -- so the day's full name goes on `title`, as a driver's does on
         the name beside it. Spread rather than `slice`, so the unit is a code
         point. */
      const short = d.toLocaleDateString(undefined, { weekday: 'short' });
      const cell = el('div', 'scheduler-avail__day', [...short].slice(0, 1).join(''));
      cell.title = d.toLocaleDateString(undefined, { weekday: 'long' });
      // Weekend letters dim, as the board's day header does; the day rules are
      // drawn in the body only.
      if (isWeekend(d)) cell.classList.add('scheduler-avail__day--weekend');
      cell.dataset.day = String(i);
      head.appendChild(cell);
    }
    availGrid.appendChild(head);

    /* A heading wherever the priority changes, because the rows are in
       priority order and only the breaks are missing. A driver with no
       priority gets their own heading rather than sitting under the last
       number, which would say something untrue about them. */
    // Seeded with the band the column header already names, so it draws none.
    let band = firstBand;
    for (const row of rows) {
      const p = row.driver.priority ?? null;
      if (p !== band) {
        band = p;
        availGrid.appendChild(el('div', 'scheduler-avail__band', bandName(p)));
      }
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

    /* The corner names the band being read. The first band is drawn there
       instead of as a heading of its own, so every later band hands its name
       over as it reaches the header and the roster never shows two headings
       in a row. */
    const corner = head.firstElementChild;
    const bands = [...availGrid.querySelectorAll('.scheduler-avail__band')];
    nameAvailBand = () => {
      if (!rows.length) return;
      const edge = corner.getBoundingClientRect().bottom;
      // A hidden roster measures zero, where every band would pass and the
      // last would win; it is named again when it is shown.
      if (!edge) return;
      let name = bandName(firstBand);
      for (const b of bands) {
        if (b.getBoundingClientRect().top > edge) break;
        name = b.textContent;
      }
      if (corner.textContent !== name) corner.textContent = name;
    };
    nameAvailBand();

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
    if (none) { schEl.style.removeProperty('--scheduler-docked-h'); return; }
    if (barShortcuts.previousElementSibling !== bar) bar.after(barShortcuts);
    drawShortcuts(bar);

    /* Compact: a block one slot wide has nothing to float beside, so the bar
       docks to the bottom edge and takes the trip's rows with it. It stays
       where it was put in the track, because app.css fixes it to the window
       from there and that is what keeps the board's tokens inherited. None of
       the placing below applies to a bar that is not pointing at anything. */
    const docked = pageEl?.getAttribute('data-board') === 'compact';
    barShortcuts.toggleAttribute('data-docked', docked);
    if (docked) {
      drawDockedTrip(bar);
      barShortcuts.removeAttribute('data-out');
      barShortcuts.removeAttribute('data-side');
      /* The sheet stands over the foot of the board, so the pane is given that
         much more to scroll and the last bus can still be brought out from
         under it. The height is measured because the rows a bar draws are the
         view's to choose. */
      schEl.style.setProperty('--scheduler-docked-h',
        `${Math.round(barShortcuts.getBoundingClientRect().height)}px`);
      return;
    }
    schEl.style.removeProperty('--scheduler-docked-h');
    dockedDrawn = '';
    barShortcuts.querySelector('.scheduler-bar-shortcuts__trip')?.remove();
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
    const first = (column ? column.right : pane.left) + TIP_GAP;
    /* A trip scrolled wholly under a sticky band, or out past an edge, leaves
       nothing to point at, so its shortcuts are put out of sight until it
       comes back, rather than riding over the day band after it. Visibility
       rather than `hidden`, so the row still has a size to measure; a row
       holding focus stays, so a keyboard user does not lose their place. */
    const gone = box.bottom <= ceiling || box.top >= pane.bottom
      || box.right <= first - TIP_GAP || box.left >= pane.right;
    barShortcuts.toggleAttribute('data-out', gone && !barShortcuts.contains(document.activeElement));
    const above = box.top - ceiling >= tip.height + TIP_GAP;
    barShortcuts.dataset.side = above ? 'above' : 'below';
    barShortcuts.style.setProperty('--scheduler-open-top',
      `${(above ? box.top - tip.height - TIP_GAP : box.bottom + TIP_GAP) - host.top}px`);
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
  new ResizeObserver(() => requestAnimationFrame(() => { placeBarOpen(); markEditorBars(); fitTimes(); fitMarks(); })).observe(gridEl);
  // A web font that arrives after the first render changes every time's width.
  document.fonts?.ready.then(() => { fitTimes(); fitMarks(); });
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

  /* ── Beside the week, or in front of it ─────────────────────────────────────
     A panel either sits beside the week or comes in front of the board. There
     is no third state: a panel drawn over a week that still claims the width
     it is covering hides the toolbar's controls and the bus column, which are
     the two things the week cannot be read without.

     One sum decides it. The week's minimum plus every open panel is what the
     board is asked for; while the board holds that, every panel sits beside
     the week and the week spends its days, scrolling to fewer of them. Past it
     the newest comes in front, and behind it the board is the week alone.
     Nothing closes itself and nothing is refused: every panel stays open, and
     what a narrowing window changes is only which one is in front.

     The board's width is what this reads, never the schedule's: the board is
     the whole content column whichever panels are open, so it holds still when
     one of them closes, while the schedule's width is this decision's own
     outcome and reading it back would flip-flop.

     `WEEK_MIN` is 17rem, the width the tight toolbar is measured to read at in
     app.css: the week never goes narrower than its own controls, which is what
     makes it a derived number rather than a chosen one. `SCHEDULE_FLOOR` is a
     different question -- whether the board can show three readable days --
     and only the compact week asks it. A toolbar under 21rem is one `Today`
     will not fit in beside its week. */
  const WEEK_MIN = 17;
  const SCHEDULE_FLOOR = 26;
  const TOOLBAR_TIGHT = 21;
  const boardEl = document.querySelector('.scheduler-board');
  const frameEl = document.querySelector('.scheduler-frame');
  /* The panels open, oldest first, so the newest is the one that comes in
     front. It is kept from what each pass finds open rather than pushed to by
     the openers, so no path can forget to say it opened something. */
  let openOrder = [];

  /* A panel's width, from the token app.css lays it out with rather than from
     the panel itself. A panel in front of the board has given its width up, so
     pricing it by what it takes right now would unmake the decision that moved
     it and the two would flip back and forth. */
  const panelWidth = name => {
    const root = getComputedStyle(document.documentElement);
    const raw = root.getPropertyValue(name).trim();
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return 0;
    return raw.endsWith('rem') ? n * (parseFloat(root.fontSize) || 16) : n;
  };

  function placeRoom() {
    if (!boardEl || !frameEl || !pageEl) return;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const board = boardEl.getBoundingClientRect().width;
    // Nothing to measure while the board is hidden, as it is behind a notice.
    if (!board) return;
    const gap = parseFloat(getComputedStyle(boardEl).columnGap) || 0;

    /* What is open, and in what order it was asked for. A panel already in the
       list keeps its place, so widening the window and narrowing it again
       brings the same one forward. */
    const open = [
      ['roster', availOn, '--scheduler-panel-w'],
      ['editor', !!tripEl && !tripEl.hidden, '--scheduler-panel-w'],
      ['viewer', !!viewerEl && !viewerEl.hidden, '--scheduler-viewer-w'],
    ].filter(([, on]) => on);
    const names = open.map(([name]) => name);
    openOrder = openOrder.filter(name => names.includes(name))
      .concat(names.filter(name => !openOrder.includes(name)));

    /* Below md nothing is laid out beside the week at all: Carbon's own fixed
       panel stands there and the board has no room for a column either way, so
       no panel is priced and whichever is open is in front. */
    const overlay = matchMedia('(max-width: 41.98rem)').matches;
    const width = Object.fromEntries(open.map(([name, , token]) => [name, panelWidth(token)]));
    /* An open panel's wrapper keeps its place in the board's row whether the
       panel is beside the week or in front of it, so the gap beside it is
       charged either way and only the width ever comes back. */
    const gaps = names.length * gap;
    const widths = overlay ? 0 : names.reduce((sum, name) => sum + width[name], 0);

    /* Past the sum the newest panel comes in front of the board, and behind it
       the board is the week alone: the others are still open, are not drawn,
       and come back the moment the one in front closes. One panel in front of
       one week is the whole of it, at every width. */
    const takeover = openOrder.length && (overlay || widths + gaps + WEEK_MIN * rem > board)
      ? openOrder[openOrder.length - 1] : null;
    if (takeover) pageEl.setAttribute('data-takeover', takeover);
    else pageEl.removeAttribute('data-takeover');

    /* Behind the one in front, the board is set aside rather than there to be
       read, so it takes no click and no Tab: what is on screen and what can be
       reached are the same thing. An open panel that is not the one in front
       waits with it. */
    frameEl.inert = !!takeover;
    for (const [name, el] of [['roster', asideSlot], ['editor', tripEl], ['viewer', viewerEl]]) {
      if (el) el.inert = !!takeover && name !== takeover;
    }

    /* Behind the one in front the board is the week alone, so it is charged
       only the gaps the collapsed wrappers still hold open. */
    const room = board - gaps - (takeover ? 0 : widths);
    frameEl.style.setProperty('--scheduler-room', `${Math.max(0, Math.round(room))}px`);
    // Under the tight width `Today` gives way to its menu row, in app.css.

    if (room < TOOLBAR_TIGHT * rem) pageEl.setAttribute('data-room', 'tight');
    else pageEl.removeAttribute('data-room');

    /* Compact is the board's own answer, not a panel's: a board that cannot
       show three readable days shows all seven as blocks instead. It asks the
       board rather than the room, because a panel over the week never makes
       the week itself a different week. */
    if (board < SCHEDULE_FLOOR * rem) pageEl.setAttribute('data-board', 'compact');
    else pageEl.removeAttribute('data-board');
  }

  /* The board is the one input watched: its width is what the window sets.
     Opening or closing a panel calls `placeRoom` where it happens, because a
     panel that has just taken the screen has no width of its own to report and
     watching it would leave the decision to a frame that never comes. The
     schedule is this rule's own output — its width is held at the minimum the
     rule writes, so it reports no change once that binds. */
  if (boardEl && 'ResizeObserver' in window) {
    new ResizeObserver(() => placeRoom()).observe(boardEl);
  }

  function placeAvailability() {
    /* The roster is on screen whenever it is asked for. Where it goes -- beside
       the week or in front of it -- is `placeRoom`'s, and either way the toggle
       reads as pressed, because either way the roster is there. */
    const shown = availOn;
    if (asideSlot) {
      asideSlot.hidden = !shown;
      if (shown) asideSlot.appendChild(availEl);
    }
    availEl.hidden = !shown;
    availToggle.setAttribute('aria-pressed', String(shown));
    // rux.css styles nothing on `aria-pressed`; `rux--btn--selected` is
    // Carbon's pressed look.
    availToggle.classList.toggle('rux--btn--selected', shown);
    /* The room is measured again here: opening the roster is not a resize, so
       nothing else would ask, and the board would lay out for a panel it no
       longer has room for. */
    placeRoom();
    window.Rux?.schedule?.fit?.();
    // The corner can only be named from a roster that has a size.
    if (shown) nameAvailBand();
  }

  // A press shows the roster or hides it; where it then goes is `placeRoom`'s.
  availToggle?.addEventListener('click', () => {
    availOn = !availOn;
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
    // a resize, so the trip tabs follow here. Turning the notes row off moves
    // the marks to the destination row, which has its own room for them.
    placeBarOpen();
    markEditorBars();
    fitMarks();
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
  // Route has fields and two place searches.
  panelRoute?.addEventListener('input', refreshDirty);
  panelRoute?.addEventListener('change', refreshDirty);
  panelRoute?.addEventListener('rux:listbox-selected', refreshDirty);

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
    if (fleetDuplicates().size) {
      toast('error', 'The trip was not saved.', 'A driver is in two seats on one leg. Choose another driver on the Fleet tab.');
      return false;
    }
    const patch = patchOf() || {};
    const id = editing.id;
    const creating = editing.creating;
    const savedId = creating ? editing.newId : id;
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
    /* The trip as it stands, for the history entry to diff against. A read
       that fails leaves `historyBefore` undefined, and the save unrecorded. */
    let historyBefore;
    if (creating) historyBefore = null;
    else {
      try { historyBefore = await readTripState(id); } catch { historyBefore = undefined; }
    }
    const recordThisSave = tripId => {
      if (historyBefore !== undefined) recordSave(tripId, historyBefore);
    };
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
         The bus counts come from the Fleet tab, and a new trip always has one. */
      const form = creating ? readForm() : null;
      if (creating && !form) throw new Error('The form is not complete — a field is missing from the panel.');
      const fleet = fleetWork();
      const row = creating
        ? { id: editing.newId, ...form, bus_count: 1, ...(fleet?.trip ?? {}) }
        : { ...patch, ...(fleet?.trip ?? {}) };
      /* A new trip, or a save that changes its billing, writes the confirmation
         and the paid fields the billing now gives, as rux-ui's save does. A
         save that touches no billing leaves them as they are. */
      if (creating || BILLING_KEYS.some(k => k in patch) || paymentsPatch()?.work
          || posPatch()?.work || invoicesPatch()?.work) {
        Object.assign(row, derivedBilling());
      }
      // Contacts are linked, and added to the list, before the trip is written.
      const unlinked = await linkContacts(row, creating);
      /* The fleet is written last, because its rows need the trip to exist. If
         that write fails the trip stands, in the Unassigned row, and the
         message says so. */
      const onBus = !!editing.fleet?.outbound.some(b => b.busId);
      // An edit to a time alone leaves the trip patch empty, and an empty
      // update is skipped rather than sent.
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

      /* The route's rows: a new trip's first ones, or an existing leg's
         changes and the rows it lacks. Each is written one at a time, since an
         upsert would need every column and write back stale copies of those
         the tab never shows. */
      await saveRoute(tripId, write);

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

      if (fleet?.work) await saveFleet(tripId, write, fleet);
      recordThisSave(tripId);
      // Read back rather than trusting the write, as the drag does.
      await show();
      const fields = Object.keys(patch).length;
      if (unlinked.length) toast('warning', creating ? 'Trip created.' : 'Saved.',
        `${unlinked.join(', ')} could not be added to the contacts list, so the trip keeps its earlier link.`);
      else if (creating) toast('success', onBus ? 'Trip created on its bus.' : 'Trip created. It is in the Unassigned row until it has a bus.');
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
      const check = part === 'its buses' ? 'Check its buses on the Fleet tab.'
        : part === 'the trip' ? 'Check the trip and make the change again if it is missing.'
        : `Check ${part} and add what is missing.`;
      const didNot = e.timedOut ? 'may not have saved' : 'did not save';
      // What did land is recorded.
      recordThisSave(savedId);
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

  /* Places a menu at a point, inside `.scheduler-page`, fitted to the window
     on both axes the way Carbon's menu fits itself: from the point where it
     fits, else flipped to end at the point, else against the far edge 8px in,
     so a click near the bottom or the right opens it upward or leftward and
     it stays under the pointer. Its box is read after `hidden` comes off and
     after the append, when it has its real size. A menu opened from the
     keyboard has no pointer, so it opens from the lower start corner of what
     was pressed. */
  const MENU_SPACING = 8;
  function popMenuAt(menu, e) {
    const page = pageEl?.getBoundingClientRect() ?? { top: 0, left: 0 };
    menu.hidden = false;
    menu.style.position = 'absolute';
    pageEl?.appendChild(menu);
    let { clientX: px, clientY: py } = e;
    if (!px && !py) {
      const from = e.target.getBoundingClientRect();
      px = from.left;
      py = from.bottom;
    }
    const { width, height } = menu.getBoundingClientRect();
    const fit = (at, size, max) => (at + size <= max - MENU_SPACING ? at
      : at - size >= 0 ? at - size
      : Math.max(0, max - MENU_SPACING - size));
    const x = fit(px, width, document.documentElement.clientWidth);
    const y = fit(py, height, document.documentElement.clientHeight);
    menu.style.insetInlineStart = `${x - page.left}px`;
    menu.style.insetBlockStart = `${y - page.top}px`;
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

    if (item.id === 'scheduler-bar-menu-envelope') {
      openEnvelope(bar);
      return;
    }

    if (item.id === 'scheduler-bar-menu-forms') {
      openForms(bar);
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

    if (item.dataset.driverStatus) {
      await setDriverStatus(bar, item.dataset.driverId, item.dataset.crewRole, item.dataset.driverStatus);
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
        recordFieldChange(bar.dataset.tripId, 'trip_bar_color', bar.dataset.tripColor || null, value);
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

  // Fills the bar menu for one bar: which items apply, the Color chips and
  // the drivers' statuses.
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
    fillCrewItems(bar);
    document.getElementById('scheduler-bar-menu-itinerary').hidden = !bar.dataset.itineraryId;
    // Hidden where it cannot act: a slot with no bus, or a bus with no driver.
    document.getElementById('scheduler-bar-menu-envelope').hidden =
      !bar.dataset.assignmentId || !barHasCrew(bar);
    document.getElementById('scheduler-bar-menu-upload').hidden = !!bar.dataset.itineraryId || !client;
    // Mark this leg's hotel booked or not, on a trip that needs one, and not for
    // the trip open in the editor, which has its own Booked box.
    const hotelItem = document.getElementById('scheduler-bar-menu-hotel');
    hotelItem.hidden = !bar.dataset.needHotel || locked;
    hotelItem.querySelector('.rux--menu-item__label').textContent =
      bar.dataset.hotelBooked ? 'Mark hotel not booked' : 'Mark hotel booked';
  }

  // The bar's crew, read again from the trip the board holds.
  function barCrew(bar) {
    const trip = panelIndex.trips.get(bar.dataset.tripId);
    const assign = trip?.trip_assignments?.find(a => String(a.id) === bar.dataset.assignmentId);
    return assign ? { trip, crew: crewOf(trip, assign, panelIndex.driversById, panelIndex.statuses) } : null;
  }

  /* One status item per driver on the bar, after Color: the driver's role
     icon in their status's tone, their name and status, and a submenu of the
     five statuses with theirs checked. A role nobody fills has no status. */
  function fillCrewItems(bar) {
    for (const old of barMenu.querySelectorAll('[data-crew-part]')) old.remove();
    const found = barCrew(bar);
    const anchor = document.getElementById('scheduler-bar-menu-color');
    const items = (found?.crew ?? []).filter(c => !c.needed).map(c => {
      const name = crewName(c);
      const item = el('li', 'rux--menu-item');
      item.setAttribute('role', 'menuitem');
      item.tabIndex = -1;
      item.setAttribute('aria-haspopup', 'true');
      item.setAttribute('aria-expanded', 'false');
      item.dataset.crewPart = '';
      const icon = el('div', 'rux--menu-item__icon');
      icon.appendChild(crewEl(c).firstChild);
      const caret = el('div', 'rux--menu-item__shortcut');
      caret.appendChild(svgUse('#i-caret--right', '16', '0 0 32 32'));
      const sub = el('ul', 'rux--menu rux--menu--sm rux--menu--with-icons rux--menu--with-selectable-items');
      sub.setAttribute('role', 'menu');
      sub.setAttribute('aria-label', `${c.label} status`);
      sub.tabIndex = -1;
      const groupItem = el('li', 'rux--menu-item-radio-group');
      groupItem.setAttribute('role', 'none');
      const group = el('ul');
      group.setAttribute('role', 'group');
      group.setAttribute('aria-label', `${name}'s status`);
      for (const st of DRIVER_STATUSES) {
        const on = st.value === c.status.value;
        const opt = el('li', 'rux--menu-item');
        opt.setAttribute('role', 'menuitemradio');
        opt.setAttribute('aria-checked', String(on));
        opt.tabIndex = -1;
        opt.dataset.driverId = c.driverId;
        opt.dataset.crewRole = c.role;
        opt.dataset.driverStatus = st.value;
        const check = el('div', 'rux--menu-item__selection-icon');
        if (on) check.appendChild(svgUse('#i-checkmark', '16', '0 0 20 20'));
        const mark = el('div', 'rux--menu-item__icon');
        mark.appendChild(crewEl({ ...c, status: st }).firstChild);
        opt.append(check, mark, el('div', 'rux--menu-item__label', st.label));
        group.appendChild(opt);
      }
      groupItem.appendChild(group);
      sub.appendChild(groupItem);
      item.append(el('div', 'rux--menu-item__selection-icon'), icon,
        el('div', 'rux--menu-item__label', `${name}: ${c.status.label}`), caret, sub);
      return item;
    });
    let at = anchor;
    for (const item of items) { at.after(item); at = item; }
  }

  /* Saves one driver's status. `sync_trip_driver_statuses` takes the trip's
     whole crew, deletes any status the list leaves out, and changes only the
     rows marked dirty, so every driver in a role that is on is sent with the
     status they have and only the picked one is marked. */
  async function setDriverStatus(bar, driverId, role, value) {
    const found = barCrew(bar);
    const target = found?.crew.find(c => !c.needed && String(c.driverId) === driverId && c.role === role);
    if (!target || target.status.value === value) return;
    const { trip } = found;
    const list = (trip.trip_assignments || []).flatMap(a =>
      crewOf(trip, a, panelIndex.driversById, panelIndex.statuses).filter(c => !c.needed).map(c => {
        const picked = c.driverId === target.driverId && c.leg === target.leg && c.role === target.role;
        return { driverId: c.driverId, leg: c.leg, role: c.role,
          status: picked ? value : c.status.value, dirty: picked };
      }));
    const label = DRIVER_STATUSES.find(x => x.value === value).label;
    toast('info', 'Changing the driver status…');
    try {
      const { error } = await withTimeout(
        client.rpc('sync_trip_driver_statuses', { p_trip_id: trip.id, p_statuses: list }).then(r => r));
      if (error) throw new Error(error.message);
      const was = DRIVER_STATUSES.find(x => x.value === target.status.value)?.label ?? null;
      const who = `${histDriverName(target.driverId)}, ${target.leg === 'return' ? 'inbound' : 'outbound'}`
        + ` ${(HISTORY_ROLES[target.role] || 'Driver').toLowerCase()}`;
      recordHistory(trip.id, 'driver_status_changed', [{
        field: 'driver_status', label: 'Driver status',
        before: was ? `${who}: ${was}` : null, after: `${who}: ${label}`,
      }]);
      await show();
      toast('success', `${crewName(target)} is ${label.toLowerCase()} now.`);
    } catch (err) {
      toast('error', `The driver status did not change. ${err.message}`);
    }
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
      recordFieldChange(bar.dataset.tripId, `hotel_booked_${bar.dataset.leg}`, !booked, booked);
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
      recordBusChange(bar.dataset.tripId, bar.dataset.busId || null, null);
      await show();
      refreshEditor(assignmentId);
      toast('success', 'Taken off its bus. It is in the Unassigned row.');
    } catch (err) {
      toast('error', `The trip was not moved. ${err.message}`);
    }
  }

  /* ── The document viewer ──
     From Carbon's xlg breakpoint up, a trip's file, an itinerary or any other,
     opens in a side panel left of
     the board, beside the trip editor. Narrower, the two panels do not fit and
     a phone frames a PDF badly, so the document link page opens it in a new tab.
     The panel fetches the file and frames a blob address of it, because a frame
     of the bucket's own address is another origin, which the page may not
     print. The browser's PDF toolbar is hidden, since Chrome's scrolls sideways
     at 30rem, and the panel's action toolbar stands in for it. The panel stays
     open through week changes and selections, like the editor, and another
     file replaces the one shown. */
  const viewerEl = document.getElementById('scheduler-viewer');
  let viewerFrame = document.getElementById('scheduler-viewer-frame');
  const viewerTitle = document.getElementById('scheduler-viewer-title');
  const viewerTitleCollapsed = document.getElementById('scheduler-viewer-title-collapsed');
  const viewerUploaded = document.getElementById('scheduler-viewer-uploaded');
  const viewerStatus = document.getElementById('scheduler-viewer-status');
  const viewerPrint = document.getElementById('scheduler-viewer-print');
  const viewerDownload = document.getElementById('scheduler-viewer-download');
  const viewerNewTab = document.getElementById('scheduler-viewer-new-tab');
  const viewerClose = document.getElementById('scheduler-viewer-close');
  const viewerZooms = [...document.querySelectorAll('[data-viewer-zoom]')];
  /* Safari's PDF view, which every browser on an iPad uses too, ignores the
     zoom an address asks for and draws its own zoom controls over the page, so
     there the panel's zoom buttons are hidden rather than left doing nothing.
     No feature tells which PDF viewer a frame gets; the vendor string does. */
  const noZoom = navigator.vendor === 'Apple Computer, Inc.';
  if (noZoom) for (const btn of viewerZooms) btn.hidden = true;


  // The zooms Zoom in and Zoom out step through, in percent.
  const ZOOM_STEPS = [50, 75, 100, 125, 150, 200, 300];
  let viewerOpener = null;
  // The file showing: its document id, its blob address, and its zoom, where
  // null is fit to width.
  let viewerShown = null;
  // Counts opens, so a slow fetch that a later open overtook is dropped.
  let viewerSeq = 0;
  // The document the panel is on, loaded or not, so a replace or a delete
  // elsewhere can follow it.
  let viewerDocId = null;
  // The download running: its document id, and the controller that stops it.
  let viewerLoading = null;
  const documentLink = id => `share/document.html?id=${encodeURIComponent(id)}`;

  /* Each load gets a new frame: a PDF viewer does not read a changed fragment
     again, and navigating a frame that has loaded adds to the tab's history,
     so Back would step through zooms. */
  function swapFrame(src) {
    const frame = viewerFrame.cloneNode(false);
    if (src) frame.src = src; else frame.removeAttribute('src');
    viewerFrame.replaceWith(frame);
    viewerFrame = frame;
  }

  // Frames the file at its zoom, and disables the zoom that has nowhere to go.
  function frameShown() {
    const { blob, zoom } = viewerShown;
    swapFrame(`${blob}#toolbar=0&navpanes=0&${zoom == null ? 'view=FitH' : `zoom=${zoom}`}`);
    for (const btn of viewerZooms) {
      const step = btn.dataset.viewerZoom;
      btn.disabled = step === 'fit' ? zoom == null
        : step === 'in' ? zoom === ZOOM_STEPS.at(-1)
        : zoom === ZOOM_STEPS[0];
    }
  }

  // A fit-to-width page reads as about 90%, so the first step from it is 100%
  // in or 75% out.
  function zoomViewer(step) {
    if (!viewerShown) return;
    const now = viewerShown.zoom;
    if (step === 'fit') viewerShown.zoom = null;
    else if (step === 'in') viewerShown.zoom = ZOOM_STEPS.find(z => z > (now ?? 90)) ?? ZOOM_STEPS.at(-1);
    else viewerShown.zoom = ZOOM_STEPS.findLast(z => z < (now ?? 90)) ?? ZOOM_STEPS[0];
    if (viewerShown.zoom !== now) frameShown();
  }

  /* The actions that need the fetched file wait for it; Open in new tab does
     not. Download is a link, which has no `disabled`, so it takes Carbon's
     disabled class and leaves the tab order with its address. */
  function setViewerReady(ready) {
    for (const btn of [...viewerZooms, viewerPrint]) btn.disabled = !ready;
    viewerDownload.classList.toggle('rux--btn--disabled', !ready);
    if (ready) viewerDownload.removeAttribute('aria-disabled');
    else {
      viewerDownload.removeAttribute('href');
      viewerDownload.setAttribute('aria-disabled', 'true');
    }
  }

  // The line over the frame: Carbon's inline loading for the wait, an inline
  // notification for a failure, and nothing once the file shows.
  function setViewerStatus(kind, why) {
    if (!viewerStatus) return;
    viewerStatus.hidden = !kind;
    if (kind === 'loading') {
      const box = el('div', 'rux--inline-loading');
      const anim = el('div', 'rux--inline-loading__animation');
      anim.appendChild(loadingSpinner());
      box.append(anim, el('div', 'rux--inline-loading__text', 'Loading the document…'));
      viewerStatus.replaceChildren(box);
    } else if (kind === 'error') {
      viewerStatus.replaceChildren(note('error', 'The document did not load.', `${why} Open in new tab still opens it.`));
    } else viewerStatus.replaceChildren();
  }

  // Lets go of the file showing: a download running stops, the frame empties
  // and its blob is freed.
  function dropShown() {
    viewerLoading?.ctrl.abort();
    viewerLoading = null;
    if (viewerShown) URL.revokeObjectURL(viewerShown.blob);
    viewerShown = null;
    setViewerReady(false);
    setViewerStatus(null);
    swapFrame(null);
  }

  /* A stored file and a form this app draws are both documents, and the panel
     frames either; what differs is the toolbar. The zooms send `#zoom=` to a
     PDF viewer, which an HTML page ignores, and there is no file to download
     -- the print dialog saves a PDF. Print and Open in new tab stand for both. */
  function setViewerMode(mode) {
    const form = mode === 'form';
    for (const btn of viewerZooms) btn.hidden = form || noZoom;
    viewerDownload.hidden = form;
  }

  /* A form from print.html. It needs no fetch and no blob address: a page of
     this site is already this origin, which is the whole reason a PDF is
     fetched into one -- so the panel may print what it frames. */
  function openGenerated({ url, kind, note, opener }) {
    if (!viewerEl) {
      window.open(url, '_blank', 'noopener');
      return;
    }
    dropShown();
    setViewerMode('form');
    for (const h of [viewerTitle, viewerTitleCollapsed]) h.textContent = kind;
    viewerUploaded.textContent = note || '';
    viewerNewTab.href = url;
    // No document row stands behind it, so a replace or a delete in the Files
    // tab has nothing here to follow.
    viewerDocId = null;
    if (viewerEl.hidden) {
      viewerOpener = opener ?? null;
      viewerEl.hidden = false;
      // Open now, so the board is measured before it is fit.
      placeRoom();
      window.Rux?.schedule?.fit?.();
    }
    viewerClose?.focus();
    viewerPrint.disabled = false;
    swapFrame(url);
  }

  async function openDocument(doc, opener) {
    if (!doc) return;
    setViewerMode('file');
    const url = client && doc.file_path
      ? client.storage.from('trip-documents').getPublicUrl(doc.file_path).data?.publicUrl : null;
    if (!viewerEl || !url) {
      window.open(documentLink(doc.id), '_blank', 'noopener');
      return;
    }
    /* The head names the file's type and nothing else. Which trip it belongs
       to is the editor's own heading, open behind this panel, so naming the
       destination here said it twice. */
    const kind = docTypeName(doc);
    for (const h of [viewerTitle, viewerTitleCollapsed]) h.textContent = kind;
    const when = uploadedOn(doc.created_at);
    viewerUploaded.textContent = when ? `Uploaded ${when}` : '';
    viewerNewTab.href = url;
    viewerDocId = String(doc.id);
    if (viewerEl.hidden) {
      viewerOpener = opener ?? null;
      viewerEl.hidden = false;
      // Open now, so the board is measured before it is fit.
      placeRoom();
      window.Rux?.schedule?.fit?.();
    }
    viewerClose?.focus();
    // The file showing, or downloading, is not fetched again, so its zoom stays.
    if (viewerShown?.id === doc.id || viewerLoading?.id === doc.id) return;
    const seq = ++viewerSeq;
    dropShown();
    /* The time limit covers the whole download, not only the storage's first
       answer, and running out of it stops the download, as a close does. */
    const ctrl = new AbortController();
    viewerLoading = { id: doc.id, ctrl };
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; ctrl.abort(); }, READ_TIMEOUT);
    setViewerStatus('loading');
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`The storage answered ${res.status}.`);
      // Typed as a PDF whatever the storage says, so the frame shows it.
      const file = new Blob([await res.blob()], { type: 'application/pdf' });
      if (seq !== viewerSeq) return;
      viewerLoading = null;
      setViewerStatus(null);
      const blob = URL.createObjectURL(file);
      viewerShown = { id: doc.id, blob, zoom: null };
      viewerFrame.title = kind;
      viewerDownload.href = blob;
      viewerDownload.download = doc.file_name || `${docSlug(kind, 'document')}.pdf`;
      setViewerReady(true);
      frameShown();
    } catch (err) {
      if (seq !== viewerSeq) return;
      viewerLoading = null;
      const why = timedOut ? `The storage did not send it within ${READ_TIMEOUT / 1000} seconds.`
        : err instanceof TypeError ? 'The storage could not be reached.' : err.message;
      setViewerStatus('error', why);
    } finally {
      clearTimeout(timer);
    }
  }

  for (const btn of viewerZooms) {
    btn.addEventListener('click', () => {
      zoomViewer(btn.dataset.viewerZoom);
      // A zoom that has nowhere further to go is disabled, and would drop focus.
      if (btn.disabled) viewerZooms.find(b => !b.disabled)?.focus();
    });
  }
  // The frame is a blob of this page's origin, so the page may print it. A
  // browser that refuses gets the file in a new tab, where its viewer prints.
  viewerPrint?.addEventListener('click', () => {
    try {
      viewerFrame.contentWindow.focus();
      viewerFrame.contentWindow.print();
    } catch {
      window.open(viewerNewTab.href, '_blank', 'noopener');
    }
  });

  function closeViewer(returnFocus = true) {
    if (!viewerEl || viewerEl.hidden) return;
    viewerEl.hidden = true;
    viewerDocId = null;
    // A fetch still running is dropped, and no PDF is held while the panel is shut.
    viewerSeq++;
    dropShown();
    // Shut now, so whatever was behind it comes forward before the fit.
    placeRoom();
    window.Rux?.schedule?.fit?.();
    /* Focus goes back to what opened the panel. A Files tab row is rebuilt
       whenever the editor redraws, so its row is found again by document id;
       failing that, the selected bar takes it. */
    const opener = viewerOpener;
    viewerOpener = null;
    if (!returnFocus) return;
    const id = opener?.dataset.documentId;
    const target = opener?.isConnected ? opener
      : (id && panelFiles.querySelector(`[data-document-id="${CSS.escape(id)}"]`)) || selectedBar();
    target?.focus();
  }
  viewerClose?.addEventListener('click', () => closeViewer());

  // Open itinerary, from a shortcut slot or the bar menu: the trip's newest.
  /* THE BAR'S ENVELOPE. A bar is one bus on one leg, which is exactly what the
     envelope binds to, so its assignment id is the whole address. The form
     names the leg only where it is the return, because that is the only pair
     a trip can show at once. */
  const barHasCrew = bar => (barCrew(bar)?.crew ?? []).some(c => !c.needed);

  function openEnvelope(bar) {
    const id = bar.dataset.assignmentId;
    if (!id) return;
    openGenerated({
      url: `print.html?form=envelope&assignment=${encodeURIComponent(id)}`,
      kind: 'Driver envelope',
      note: bar.dataset.leg === 'return' ? 'Return' : '',
      opener: bar,
    });
  }

  /* The forms this trip can fill in, on print.html's own list. It takes the
     trip rather than the bar's assignment, because the list is the trip's and
     a form that wants one bus asks for it once it is chosen. */
  function openForms(bar) {
    const id = bar.dataset.tripId;
    if (!id) return;
    openGenerated({
      url: `print.html?trip=${encodeURIComponent(id)}`,
      kind: 'Forms',
      note: '',
      opener: bar,
    });
  }

  function openItinerary(bar) {
    const id = bar.dataset.itineraryId;
    if (!id) return;
    const trip = panelIndex.trips.get(bar.dataset.tripId);
    const doc = trip ? itinerariesOf(trip).find(d => String(d.id) === id) : null;
    if (doc) openDocument(doc, bar);
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

  /* ── Trip history ──
     Every change the scheduler makes to a trip writes a `record_trip_history`
     entry as rux-ui writes it, so its History panel shows both apps' entries
     alike: an action, the trip's snapshot, and changes of
     `{ field, label, before, after }` holding display strings. The labels and
     formats are rux-ui's `TRIP_FIELDS` and `buildTripHistoryChanges`, with the
     columns this app edits and rux-ui's table leaves out added at the end. A
     column not listed is not recorded. */
  const HISTORY_FIELDS = [
    ['trip_ref', 'Trip ID'],
    ['customer', 'Client'],
    ['destination', 'Destination'],
    ['start_date', 'Start date'],
    ['end_date', 'End date'],
    ['return_start_date', 'Inbound start date'],
    ['return_end_date', 'Inbound end date'],
    ['trip_type', 'Trip type'],
    ['is_self_organized', 'Billing type', 'billingType'],
    ['trip_bar_color', 'Trip color'],
    ['booking_contact_name', 'Booking contact'],
    ['booking_contact_phone', 'Booking phone'],
    ['booking_contact_email', 'Booking email'],
    ['trip_contact_1_name', 'Trip contact'],
    ['trip_contact_1_phone', 'Trip phone'],
    ['trip_contact_2_name', 'Alternate trip contact'],
    ['trip_contact_2_phone', 'Alternate trip phone'],
    ['notes', 'Notes'],
    ['contract_status', 'Contract status'],
    ['contract_note', 'Contract note'],
    ['quoted_price', 'Quoted price', 'money'],
    ['deposit_amount', 'Payments received', 'money'],
    ['est_miles', 'Estimated miles', 'number'],
    ['actual_miles', 'Actual miles', 'number'],
    ['driving_hours', 'Drive hours', 'number'],
    ['on_duty_hours', 'On-duty hours', 'number'],
    ['invoice_status', 'Invoice status'],
    ['date_paid', 'Date paid'],
    ['bus_count', 'Bus count', 'number'],
    ['return_bus_count', 'Inbound bus count', 'number'],
    ['confirmed', 'Confirmed', 'boolean'],
    ['contact_not_needed', 'Contact required', 'inverseBoolean'],
    ['itinerary_not_needed', 'Itinerary required', 'inverseBoolean'],
    ['po_received', 'PO received', 'boolean'],
    ['invoiced', 'Invoiced', 'boolean'],
    ['balance_paid', 'Balance paid', 'boolean'],
    // Edited here and not in rux-ui's table.
    ['vehicle_type', 'Vehicle'],
    ['req_sleeper', 'Sleeper', 'boolean'],
    ['req_ada', 'Wheelchair lift', 'boolean'],
    ['req_56pax', '56 passenger', 'boolean'],
    ['need_hotel', 'Hotel needed', 'boolean'],
    ['hotel_booked_outbound', 'Outbound hotel booked', 'boolean'],
    ['hotel_booked_return', 'Inbound hotel booked', 'boolean'],
    ['hotel_itinerary_number_outbound', 'Outbound hotel confirmation'],
    ['hotel_itinerary_number_return', 'Inbound hotel confirmation'],
    ['po_ref', 'PO number'],
    ['po_amount', 'PO amount', 'money'],
    ['invoice_number', 'Invoice number'],
  ];
  const HISTORY_TRIP_TYPES = { round_trip: 'Round trip', one_way: 'One-way', dropoff_pickup: 'Split trip' };
  const HISTORY_REQUIREMENTS = {
    pax56: '56 passenger', oneWay: 'One-way', sleeper: 'Sleeper', fuelCard: 'Fuel card',
    adaLift: 'Wheelchair lift', hotel: 'Hotel', wifi: 'Wi-Fi',
  };
  const HISTORY_ROLES = {
    driver: 'Driver', coDriver: 'Co-driver', 'co-driver': 'Co-driver', relief1: 'Relief driver',
    relief2: 'Relief driver', 'relief-start': 'Relief driver', 'relief-end': 'Relief driver',
  };

  // Empty is null, and a comparison sorts object keys, as rux-ui compares.
  const histNull = v => (v === undefined || v === '' ? null : v);
  const histStable = v => Array.isArray(v) ? v.map(histStable)
    : v && typeof v === 'object'
      ? Object.fromEntries(Object.keys(v).sort().map(k => [k, histStable(v[k])]))
      : histNull(v);
  const histSame = (a, b) => JSON.stringify(histStable(a)) === JSON.stringify(histStable(b));
  const histNumber = v => (v === null || v === undefined || v === '' ? null : Number(v));
  const histUsd = n => n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });

  function histFormat(value, kind, field) {
    const v = histNull(value);
    if (v === null) return null;
    if (field === 'trip_type') return HISTORY_TRIP_TYPES[v] || String(v);
    if (kind === 'boolean') return v ? 'Yes' : 'No';
    if (kind === 'inverseBoolean') return v ? 'No' : 'Yes';
    if (kind === 'billingType') return v ? 'Ticketed' : 'Charter';
    if (kind === 'money' || kind === 'number') {
      const n = Number(v);
      if (!Number.isFinite(n)) return String(v);
      return kind === 'money' ? histUsd(n) : n.toLocaleString();
    }
    return String(v);
  }

  const histByPosition = rows => [...(rows || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  // The parts of a fleet, a route or a list that a change is judged on.
  const histAssignments = rows => histByPosition(rows).map(a => ({
    bus_id: a.bus_id || null,
    position: a.position ?? null,
    leg: a.leg || 'outbound',
    active_roles: a.active_roles || ['driver'],
    drivers: (a.trip_drivers || []).map(d => ({
      driver_id: d.driver_id || null,
      role: d.role || 'driver',
      pay: histNumber(d.pay),
      report_time: histNull(d.report_time),
      instructions: histNull(d.instructions),
    })).sort((x, y) => `${x.role}:${x.driver_id}`.localeCompare(`${y.role}:${y.driver_id}`)),
  }));
  const histStops = rows => histByPosition(rows).map(s => ({
    leg: s.leg || 'outbound', type: s.type || null, label: s.label || null, name: s.name || null,
    address: s.address || null, depart_prev: s.depart_prev || null, arrive: s.arrive || null, spot: s.spot || null,
  }));
  const histPayments = rows => histByPosition(rows).map(p => ({
    position: p.position ?? null, amount: histNumber(p.amount),
    method: histNull(p.method), date: histNull(p.date), ref: histNull(p.ref),
  }));
  const histBilling = (rows, refField) => histByPosition(rows).map(r => ({
    [refField]: histNull(r[refField]), amount: histNumber(r.amount), date: histNull(r.date),
  }));

  const histBusName = id => `Bus ${panelIndex.buses.get(id)?.number ?? id}`;
  const histDriverName = id => panelIndex.driversById.get(id)?.name ?? id;

  // "Outbound · Bus 12 · Driver: Name ($300 · report 06:00) | …"
  function histFleetSummary(rows) {
    if (!rows.length) return null;
    return rows.map(a => {
      const crew = a.drivers.filter(d => d.driver_id).map(d => {
        const details = [d.pay ? `$${Number(d.pay).toLocaleString()}` : null,
          d.report_time ? `report ${d.report_time}` : null].filter(Boolean);
        return `${HISTORY_ROLES[d.role] || d.role || 'Driver'}: ${histDriverName(d.driver_id)}`
          + (details.length ? ` (${details.join(' · ')})` : '');
      });
      return [a.leg === 'return' ? 'Inbound' : 'Outbound', a.bus_id ? histBusName(a.bus_id) : 'No bus', ...crew].join(' · ');
    }).join(' | ');
  }
  function histRouteSummary(rows) {
    if (!rows.length) return null;
    return rows.map(s => s.name || s.address || s.label).filter(Boolean).join(' → ')
      || `${rows.length} stop${rows.length === 1 ? '' : 's'}`;
  }
  function histPaymentSummary(rows) {
    if (!rows.length) return null;
    const total = rows.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    return `${rows.length} payment${rows.length === 1 ? '' : 's'} · ${histUsd(total)}`;
  }
  function histBillingSummary(rows, refField, noun) {
    if (!rows.length) return null;
    return rows.map(r => {
      const n = Number(r.amount);
      const money = r.amount !== null && Number.isFinite(n) ? histUsd(n) : '';
      return [r[refField] ? `${noun} ${r[refField]}` : noun, money].filter(Boolean).join(' ');
    }).join(' · ');
  }
  const histRequirements = reqs => Object.keys(reqs || {}).filter(k => reqs[k]).sort()
    .map(k => HISTORY_REQUIREMENTS[k] || k).join(', ') || null;

  // A trip and every row a save can change, as the database holds them.
  const HISTORY_READ = '*,'
    + 'trip_assignments(bus_id,position,leg,active_roles,trip_drivers(driver_id,role,pay,report_time,instructions)),'
    + 'trip_stops(position,leg,type,label,name,address,depart_prev,arrive,spot),'
    + 'trip_payments(position,amount,method,date,ref),'
    + 'trip_pos(position,ref,amount,date),'
    + 'trip_invoices(position,number,amount,date)';
  async function readTripState(tripId) {
    const { data, error } = await withTimeout(client.from('trips').select(HISTORY_READ).eq('id', tripId).single().then(r => r));
    if (error) throw new Error(error.message);
    return data;
  }
  // The trip's own columns, without the rows read beside them.
  const tripSnapshot = state => Object.fromEntries(Object.entries(state || {}).filter(([, v]) => !Array.isArray(v)));

  // The changes between two reads of `readTripState`; null before is a new trip.
  function tripChanges(before, after) {
    if (!before) return [{ field: 'trip', label: 'Trip', before: null, after: 'Created' }];
    const changes = [];
    const push = (field, label, was, now) => {
      if (histSame(was, now)) return;
      changes.push({ field, label, before: histNull(was), after: histNull(now) });
    };
    for (const [field, label, kind] of HISTORY_FIELDS) {
      if (histSame(before[field], after[field])) continue;
      push(field, label, histFormat(before[field], kind, field), histFormat(after[field], kind, field));
    }
    if (!histSame(before.trip_reqs || {}, after.trip_reqs || {})) {
      push('trip_reqs', 'Requirements', histRequirements(before.trip_reqs), histRequirements(after.trip_reqs));
    }
    const lists = [
      ['assignments', 'Fleet assignments', 'trip_assignments', histAssignments, histFleetSummary],
      ['itinerary', 'Itinerary', 'trip_stops', histStops, histRouteSummary],
      ['payments', 'Payments', 'trip_payments', histPayments, histPaymentSummary],
      ['purchase_orders', 'Purchase orders', 'trip_pos', r => histBilling(r, 'ref'), r => histBillingSummary(r, 'ref', 'PO')],
      ['invoices', 'Invoices', 'trip_invoices', r => histBilling(r, 'number'), r => histBillingSummary(r, 'number', 'Invoice')],
    ];
    for (const [field, label, key, shape, summary] of lists) {
      const was = shape(before[key]);
      const now = shape(after[key]);
      if (!histSame(was, now)) push(field, label, summary(was), summary(now));
    }
    return changes;
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

  /* One history entry. With no snapshot given, the trip's own is read. An entry
     with no changes is not sent, and a failed one is logged and never undoes
     the change it records, as in rux-ui. */
  async function recordHistory(tripId, action, changes, snapshot = null, metadata = {}) {
    if (!tripId || !changes?.length) return;
    try {
      if (!snapshot) {
        const { data } = await withTimeout(client.from('trips')
          .select('id,trip_ref,start_date,end_date,customer,destination').eq('id', tripId).single().then(r => r));
        snapshot = data;
      }
      const args = {
        p_trip_id: tripId, p_action: action, p_snapshot: snapshot || {},
        p_changes: changes, p_metadata: metadata,
      };
      const actor = await actorName();
      if (actor) args.p_actor_name = actor;
      const { error } = await withTimeout(client.rpc('record_trip_history', args).then(r => r));
      if (error) throw new Error(error.message);
    } catch (err) {
      console.warn('The trip history entry was not written:', err);
    }
  }

  /* A save's entry: the trip read after the writes against the read before
     them, or `created` for a new trip. A read that fails leaves the save
     unrecorded rather than recorded wrong. */
  async function recordSave(tripId, before) {
    try {
      const after = await readTripState(tripId);
      await recordHistory(tripId, before ? 'updated' : 'created', tripChanges(before, after), tripSnapshot(after));
    } catch (err) {
      console.warn('The trip history entry was not written:', err);
    }
  }

  // A bus change from the board, as rux-ui records a reassignment.
  const recordBusChange = (tripId, fromBus, toBus) => recordHistory(tripId, 'assignment_changed', [{
    field: 'bus', label: 'Bus', before: fromBus ? histBusName(fromBus) : null, after: toBus ? histBusName(toBus) : null,
  }]);

  // One column changed from the board, labelled and formatted as a save's.
  function recordFieldChange(tripId, field, was, now) {
    const [, label, kind] = HISTORY_FIELDS.find(([f]) => f === field);
    if (histSame(was, now)) return;
    recordHistory(tripId, 'updated', [{
      field, label, before: histFormat(was, kind, field), after: histFormat(now, kind, field),
    }]);
  }

  // One document change, with the file in the metadata.
  const recordFileHistory = (tripId, action, before, after, metadata) =>
    recordHistory(tripId, action, [{ field: 'document', label: 'Document', before, after }], null, metadata);

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
      if (viewerDocId === String(old.id)) {
        const trip = panelIndex.trips.get(tripId) ?? panelArgs?.trip;
        const fresh = trip && (trip.trip_documents || []).find(d => String(d.id) === String(doc.id));
        openDocument(fresh || doc, null);
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
    if (viewerDocId === String(target.doc.id)) closeViewer(false);
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
    { id: 'envelope', label: 'Print envelope', icon: '#i-printer',
      blocked: bar => (!bar.dataset.assignmentId ? 'Not on a bus'
        : !barHasCrew(bar) ? 'No driver on this bus' : null),
      run: bar => openEnvelope(bar) },
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

  /* The docked bar's head: the rows the compact block gave up, cloned from the
     bar itself rather than built again, so a row has one builder and one set of
     rules. The bar's colour class comes with them, which the head's stripe
     reads. `aria-label` is in the key because it is the whole trip written out,
     so any change to what a row says redraws this. */
  let dockedDrawn = '';
  function drawDockedTrip(bar) {
    const key = `${bar.dataset.tripId}|${bar.dataset.leg}|${bar.getAttribute('aria-label') || ''}`;
    let head = barShortcuts.querySelector('.scheduler-bar-shortcuts__trip');
    if (head && key === dockedDrawn) return;
    dockedDrawn = key;
    if (!head) head = el('div', 'scheduler-bar-shortcuts__trip');
    head.className = ['scheduler-bar-shortcuts__trip',
      ...[...bar.classList].filter(c => c.startsWith('scheduler-bar--'))].join(' ');
    head.replaceChildren(...[...bar.children].map(node => node.cloneNode(true)));
    barShortcuts.prepend(head);
  }

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
    // The slots are counted rather than every child, because the docked bar
    // carries the trip's rows ahead of them.
    if (key === shortcutsDrawn && barShortcuts.querySelectorAll('.scheduler-bar-shortcut').length === slots.length) return;
    shortcutsDrawn = key;
    const head = barShortcuts.querySelector('.scheduler-bar-shortcuts__trip');
    barShortcuts.replaceChildren(...(head ? [head] : []), ...slots.map((id, i) => {
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
      recordHistory(id, 'cancelled', [{
        field: 'trip', label: 'Trip', before: 'Active', after: reason ? `Cancelled — ${reason}` : 'Cancelled',
      }]);
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

  /* The overflow menu's actions. Today shows where its toolbar button is
     hidden -- below md, and where the schedule is too narrow for five controls
     -- and does what that button does. New trip lives only in this menu and
     opens a blank trip; the cell menu's New trip prefills the bus and the day. */
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
  /* Leaving whichever panel is in front of the board, which Escape and a press
     on the scrim both do. It answers whether there was one, so Escape can go
     on to what it means with nothing in front. */
  function leaveFront() {
    switch (pageEl?.getAttribute('data-takeover')) {
      case 'viewer': closeViewer(); return true;
      case 'editor': whenSafe(() => closePanel()); return true;
      case 'roster': availOn = false; placeAvailability(); availToggle?.focus(); return true;
      default: return false;
    }
  }
  document.getElementById('scheduler-scrim')?.addEventListener('click', () => leaveFront());
  /* Escape acts where focus is. Inside the itinerary panel it closes that
     panel; inside the editor it closes the editor; on the board it clears a
     selection first. An open dialog or search keeps the key
     for itself, and so does anything that already took it -- a list or date
     picker closing, a combo box clearing -- so one press does one thing. */
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    if (document.querySelector('.rux--modal.is-visible') || searchOpen()) return;
    /* A panel in front of the board is the only thing on screen, so Escape
       leaves it wherever focus is: the board behind it is inert and has
       nothing to take the key for. */
    if (leaveFront()) { e.preventDefault(); return; }
    if (viewerEl && !viewerEl.hidden && viewerEl.contains(document.activeElement)) {
      e.preventDefault();
      closeViewer();
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
      btn.addEventListener('click', () => {
        collapseSearch();
        goToTrip(trip.id, trip.start_date);
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
  // A refresh may finish during a drag, but cannot replace its visible tracks.
  let weekMotion = null;
  let releaseWeekMotion = null;
  /* The payload last read, and the week it was centred on. It covers that week
     and the four either side, so a run of swipes draws from it instead of
     waiting on the network -- `render` decides the overlap per leg, so one
     payload draws nine weeks at nine different starts. */
  let cached = null;
  // Whether a week is one of the nine the last read covers.
  const holds = week => !!cached && iso(addDays(cached.centre, -NEAR_DAYS)) <= iso(week)
    && iso(week) <= iso(addDays(cached.centre, NEAR_DAYS));
  /* What one week would have to change for a redraw to be worth it: which trips
     it draws and when each was last written, which is what an edit moves, and
     the windows that stripe a row or a day in it. It is taken for one week and
     never for the payload, because two reads centred on different weeks cover
     different 153-day windows and their trip lists differ even where the week
     drawn is the same one. Sorted, since the order a read returns is its own. */
  const weekPrint = (data, weekStart) => {
    const weekEnd = addDays(weekStart, 6);
    const span = { from: iso(weekStart), to: iso(weekEnd) };
    const drawn = (data.trips || [])
      .filter(tr => legsOf(tr).some(l => clip(l.from, l.to, weekStart, weekEnd)))
      .map(tr => `${tr.id}@${tr.updated_at}`).sort();
    /* Whole rows, not how many of them: a window keeps its number while its
       dates move the stripe it draws and its reason rewrites the flag's words.
       The select is fixed, so two reads spell the same row the same way. */
    const windows = rows => (rows || [])
      .filter(r => datesOverlap(span, { from: r.start_date, to: r.end_date || r.start_date }))
      .map(r => JSON.stringify(r)).sort().join(',');
    // Whole rows again: a number, a status or a fitting the row head draws all
    // change without the fleet's size changing.
    const fleet = (data.buses || []).map(b => JSON.stringify(b)).sort().join(',');
    return [drawn.join(','), windows(data.oos), windows(data.timeOff), fleet].join('|');
  };

  /* One read at a time, and the last ask always gets its own. A week change or
     a save that asks while a week is loading is queued, not dropped, so the
     board always ends on `cursor` and on the data as it is after the save.
     Every caller gets the same promise, which settles once nothing is left to
     read, so `await show()` means the board is current. */
  function show() {
    // Cached navigation paints synchronously even while a refresh is in flight.
    if (!weekMotion && holds(cursor) && (!shown || iso(shown) !== iso(cursor))) {
      render({ ...cached.data, weekStart: cursor, weekEnd: addDays(cursor, 6) });
      shown = cursor;
    }
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
    if (weekMotion) await weekMotion;
    const asked = cursor;
    setRange(asked, addDays(asked, 6));

    /* A week the last read already covers is drawn at once, with no dim and no
       network. The read still follows, because every change re-read before this
       and so always showed current data; caching without the check would let
       someone else's save go quietly missing while two people dispatch. */
    const held = holds(asked);
    if (held) {
      render({ ...cached.data, weekStart: asked, weekEnd: addDays(asked, 6) });
      shown = asked;
    }

    schEl.setAttribute('aria-busy', 'true');
    // Only a week already on screen dims, and only where it was not just drawn
    // from what was held; before the first one the grid is the skeleton and
    // stays at full strength.
    if (shown && !held) gridEl.classList.add('scheduler-grid--busy');

    try {
      const data = await read(asked);
      if (weekMotion) await weekMotion;
      // A newer ask for a different week is queued: this one is not drawn.
      if (readAgain && iso(cursor) !== iso(asked)) return;
      /* A week drawn from what was held is redrawn only if the read came back
         different, so the common case costs no second render and nothing on
         screen moves. */
      const same = held && cached && weekPrint(data, asked) === weekPrint(cached.data, asked);
      cached = { data, centre: asked };
      if (same) return;
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
      const day = isoOrNull(weekInput.value);
      if (!day) return;
      const picked = parseISO(day);
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

  /* Going to a trip moves to the week of the given day, reads it, then selects
     the trip's bar and opens it through `whenSafe`. A trip with no bar on that
     week still moves the week, and a toast says so. Search and the Drivers
     page's `?trip=<id>&date=<day>` both come here. */
  /* ── A trip the Claude connector filled in ──
     The connector parks a draft and hands back /scheduler/?draft=<id>. The
     draft carries only the fields it was sure of, and its notes say what it
     could not work out. This opens the editor on it -- a new trip, or the
     trip the draft changes -- and types each field in as a person would, so
     the panel counts them as unsaved changes and Reset takes them back out.
     Every field it touched is marked. Nothing reaches the database until
     Save. The draft is deleted when the panel closes, saved or not, because
     it has been read either way. */

  // Each field a draft may fill, and the control it is typed into. A field
  // missing from here, or whose control is not on screen, is named in the
  // panel's notice instead, so nothing the connector sent goes quietly.
  const DRAFT_CONTROLS = {
    destination: { id: 'scheduler-f-destination', kind: 'text' },
    customer: { id: 'scheduler-f-customer', kind: 'text' },
    notes: { id: 'scheduler-f-notes', kind: 'text' },
    start_date: { id: 'scheduler-f-start', kind: 'date' },
    end_date: { id: 'scheduler-f-end', kind: 'date' },
    return_start_date: { id: 'scheduler-f-rstart', kind: 'date' },
    return_end_date: { id: 'scheduler-f-rend', kind: 'date' },
    trip_type: { id: 'scheduler-f-type', kind: 'select' },
    vehicle_type: { id: 'scheduler-f-vehicle', kind: 'select' },
    req_sleeper: { id: 'scheduler-f-sleeper', kind: 'tag' },
    req_ada: { id: 'scheduler-f-ada', kind: 'tag' },
    req_56pax: { id: 'scheduler-f-56pax', kind: 'tag' },
    need_hotel: { id: 'scheduler-f-hotel', kind: 'tag' },
    quoted_price: { id: 'scheduler-f-quoted', kind: 'text' },
    est_miles: { id: 'scheduler-f-estmiles', kind: 'text' },
    booking_contact_name: { id: 'scheduler-f-cfind', kind: 'text' },
    booking_contact_phone: { id: 'scheduler-f-cphone', kind: 'text' },
    booking_contact_email: { id: 'scheduler-f-cemail', kind: 'text' },
    trip_contact_1_name: { id: 'scheduler-f-d1', kind: 'text' },
    trip_contact_1_phone: { id: 'scheduler-f-dphone1', kind: 'text' },
    trip_contact_2_name: { id: 'scheduler-f-d2', kind: 'text' },
    trip_contact_2_phone: { id: 'scheduler-f-dphone2', kind: 'text' },
    // The Route tab. It is built when the panel opens, not when the tab is
    // shown, so these are on screen from the start like every other field.
    pickup_location: { id: 'scheduler-f-pickupname', kind: 'text' },
    pickup_address: { id: 'scheduler-f-pickup', kind: 'place' },
    dropoff_location: { id: 'scheduler-f-dropname', kind: 'text' },
    dropoff_address: { id: 'scheduler-f-dropoff', kind: 'place' },
    departure_time: { id: 'scheduler-f-leave', kind: 'time' },
    return_time: { id: 'scheduler-f-endtrip', kind: 'time' },
    /* The spot time is not here because it is not typed any more: the tab
       works it out from when the group leaves. */
  };

  // What the notice calls a place that still needs choosing from its list.
  const PLACE_LABEL = { pickup_address: 'the pickup', dropoff_address: 'the drop-off' };

  // The draft whose fields are in the panel, deleted once the panel closes.
  let openDraft = null;

  /* Typing a value in. The events are the ones a person's typing fires, which
     is what the panel listens to for its dirty state; setting `value` alone
     leaves Save disabled. */
  function typeInto(node, kind, value) {
    if (kind === 'tag') {
      const want = !!value;
      if (pressed(node) === want) return true;
      node.click();
      return true;
    }
    const text = kind === 'date'
      ? (window.Rux?.datePicker?.format?.(value) ?? String(value))
      // `trip_stops` times come back as HH:MM:SS; the control wants HH:MM.
      : kind === 'time' ? String(value).slice(0, 5)
      : String(value);
    node.value = text;
    node.dispatchEvent(new Event('input', { bubbles: true }));
    node.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  /* Marks a field the draft filled, so it reads as something to check rather
     than something already agreed. The mark sits on the form item, or on the
     control when it has no item of its own, as a tag does. */
  function markDrafted(node) {
    (node.closest('.rux--form-item') ?? node).classList.add('scheduler-drafted');
  }

  function applyDraft(fields) {
    const missed = [];
    const unpicked = [];
    for (const [key, value] of Object.entries(fields || {})) {
      const control = DRAFT_CONTROLS[key];
      const node = control ? document.getElementById(control.id) : null;
      if (!node) { missed.push([key, value]); continue; }
      typeInto(node, control.kind, value);
      markDrafted(node);
      /* A place search commits nothing until a result is chosen from its
         list: typing only searches. The address is in the box and the search
         has run, but Save keeps it only once it is picked. */
      if (control.kind === 'place') unpicked.push(PLACE_LABEL[key] ?? key);
    }
    refreshDirty();
    return { missed, unpicked };
  }

  /* The notice above the fields: what Claude could not work out, and anything
     it filled that this panel has no field for, written out so it can be
     typed in by hand rather than lost. */
  function draftNotice(notes, { missed, unpicked }) {
    if (!notes && !missed.length && !unpicked.length) return;
    const wrap = el('div', 'scheduler-drafted-notice');
    const note = el('div', 'rux--inline-notification rux--inline-notification--info');
    const details = el('div', 'rux--inline-notification__details');
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('class', 'rux--inline-notification__icon');
    icon.setAttribute('width', '20'); icon.setAttribute('height', '20');
    icon.setAttribute('viewBox', '0 0 32 32'); icon.setAttribute('fill', 'currentColor');
    icon.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#i-information--filled');
    icon.appendChild(use);
    const texts = el('div', 'rux--inline-notification__text-wrapper');
    texts.appendChild(el('div', 'rux--inline-notification__title', 'Filled in by Claude. Check the marked fields.'));
    if (notes) texts.appendChild(el('div', 'rux--inline-notification__subtitle', notes));
    if (unpicked.length) {
      texts.appendChild(el('div', 'rux--inline-notification__subtitle',
        `On the Route tab, choose ${unpicked.join(' and ')} from the list to keep `
        + `${unpicked.length > 1 ? 'them' : 'it'}: typing an address only searches.`));
    }
    if (missed.length) {
      texts.appendChild(el('div', 'rux--inline-notification__subtitle',
        `This panel has no field for: ${missed.map(([k, v]) => `${k} = ${v}`).join('; ')}.`));
    }
    details.append(icon, texts);
    note.appendChild(details);
    wrap.appendChild(note);
    panelDetails.prepend(wrap);
  }

  async function openDraftTrip(id) {
    let row;
    try {
      ({ data: row } = await client.from('trip_drafts')
        .select('id, trip_id, fields, notes').eq('id', id).maybeSingle());
    } catch { row = null; }
    if (!row) {
      await show();
      toast('info', 'That draft is not there', 'It was used already, or it ran out after its fourteen days.');
      return;
    }

    if (row.trip_id) {
      const { data: trip } = await client.from('trips')
        .select('id, start_date').eq('id', row.trip_id).maybeSingle();
      if (!trip) {
        await show();
        toast('info', 'That trip is gone', 'The draft changed a trip that is no longer there.');
        return;
      }
      await goToTrip(trip.id, trip.start_date);
      if (panelEl.hidden) return;
    } else {
      await show();
      openCreate({ startDate: row.fields?.start_date });
    }

    openDraft = row.id;
    draftNotice(row.notes, applyDraft(row.fields));
  }

  async function goToTrip(id, day) {
    if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(day ?? '')) { show(); return; }
    cursor = mondayOf(parseISO(day));
    await show();
    const bar = gridEl.querySelector(`.scheduler-bar[data-trip-id="${CSS.escape(id)}"]`);
    if (!bar) { toast('info', 'That week is showing', 'The trip has no bar on it — it may have no bus yet.'); return; }
    bar.scrollIntoView({ block: 'center', inline: 'center' });
    const ref = barRef(bar);
    selectBar(bar);
    if (!isEditorBar(bar)) whenSafe(() => openRef(ref));
  }

  /* Changing the week drops the toast. An undo for a move on the old week
     would still work, by assignment id, and silently move a trip no longer on
     screen. */
  const go = days => { toast(null); cursor = addDays(cursor, days); show(); };
  document.getElementById('scheduler-prev')?.addEventListener('click', () => go(-7));
  document.getElementById('scheduler-next')?.addEventListener('click', () => go(7));
  document.getElementById('scheduler-today')?.addEventListener('click', () => { toast(null); cursor = mondayOf(new Date()); show(); });

  /* Compact weeks slide only their trip tracks. The date and bus headers
     stay in place until a completed gesture commits one adjacent week. */
  const SWIPE_LOCK = 6;
  /* How much rise a swipe may carry and still be a swipe: the vertical may
     reach 1.73 times the horizontal, which is 60 degrees off the horizontal.
     Wide, because a thumb arcs and the board's own scrolling is steeper than
     that; anything a finger means as a scroll is near vertical. */
  const SWIPE_CONE = 1.73;
  const SWIPE_MIN = 40;
  const SWIPE_FLICK = 24;
  const SWIPE_FLICK_MS = 300;
  const SWIPE_EDGE = 24;
  const SLIDE_MS = 200;

  if (schEl) {
    const calmly = matchMedia('(prefers-reduced-motion: reduce)');
    let g = null;
    let settling = false;
    let loadingAdjacent = false;
    const loadingStatus = document.getElementById('scheduler-week-loading');
    const loadingRow = document.getElementById('scheduler-weekrow');
    const stopLoading = () => {
      loadingStatus?.replaceChildren();
      loadingRow?.classList.remove('scheduler-toolbar__weekrow--loading');
    };
    const beginMotion = () => {
      if (!weekMotion) weekMotion = new Promise(resolve => { releaseWeekMotion = resolve; });
    };

    const teardown = () => {
      for (const spare of schEl.querySelectorAll('.scheduler-grid--spare')) spare.remove();
      schEl.classList.remove('scheduler-week--sliding', 'scheduler-week--settling');
      schEl.style.removeProperty('--scheduler-slide');
      schEl.style.removeProperty('--scheduler-pane-w');
      schEl.style.removeProperty('--scheduler-slide-w');
      releaseWeekMotion?.();
      weekMotion = releaseWeekMotion = null;
    };

    /* The week one step away, drawn into a grid of its own. `render` with a
       target draws the rows and nothing else, so the board's label, index and
       roster stay with the week being read until this one is settled on. */
    const spareFor = dir => {
      const side = dir < 0 ? 'next' : 'prev';
      let spare = schEl.querySelector(`.scheduler-grid--${side}`);
      if (spare) return spare;
      const week = addDays(cursor, dir < 0 ? 7 : -7);
      if (!holds(week)) return null;
      spare = el('div', `scheduler-grid scheduler-grid--spare scheduler-grid--${side}`);
      spare.setAttribute('aria-hidden', 'true');
      schEl.appendChild(spare);
      render({ ...cached.data, weekStart: week, weekEnd: addDays(week, 6) }, spare);
      // Keep incoming buses aligned with the stationary row headers.
      const rows = [...gridEl.querySelectorAll('.scheduler-row')];
      [...spare.querySelectorAll('.scheduler-row')].forEach((row, i) => {
        const source = rows[i];
        if (!source) return;
        row.hidden = source.hidden;
        const height = source.querySelector('.scheduler-track').getBoundingClientRect().height;
        const track = row.querySelector('.scheduler-track');
        track.style.blockSize = `${height}px`;
        track.style.minBlockSize = '0';
        track.style.overflow = 'hidden';
      });
      return spare;
    };

    const canSlide = start => !touchDragging
      && pageEl?.getAttribute('data-board') === 'compact'
      && schEl.scrollWidth <= schEl.clientWidth
      && start.x >= SWIPE_EDGE;

    schEl.addEventListener('pointerdown', e => {
      // Background refreshes do not block cached navigation; gestures never queue.
      if (settling || loadingAdjacent || !shown || iso(shown) !== iso(cursor)) return;
      const mine = e.pointerType === 'touch' && e.isPrimary;
      /* A second finger ends the gesture -- it is a pinch, not a swipe -- and
         the week has to come back with it. Nothing else would bring it: the
         release that follows reads a gesture already gone and leaves teardown
         undone, so the week would stay parked where the finger left it. */
      if (!mine && g?.sliding) settle(0, 0);
      else if (!mine && g?.allowed) teardown();
      g = mine
        ? { pointer: e.pointerId, x: e.clientX, y: e.clientY, at: e.timeStamp, axis: null, sliding: false, allowed: false }
        : null;
    });

    schEl.addEventListener('pointermove', e => {
      if (!g || e.pointerId !== g.pointer) return;
      const dx = e.clientX - g.x;
      const dy = e.clientY - g.y;
      if (!g.axis) {
        if (Math.hypot(dx, dy) < SWIPE_LOCK) return;
        /* Sideways unless the gesture is plainly up or down. A thumb travels
           in an arc, so an even split between the axes reads as a swipe with a
           rise in it, not as scrolling; only past about 60 degrees off the
           horizontal does it become a scroll. The board still scrolls, because
           a scroll is nowhere near that shallow. */
        g.axis = Math.abs(dx) * SWIPE_CONE >= Math.abs(dy) ? 'x' : 'y';
        /* Whether this gesture may change the week is settled here, once, and
           never asked again at release: a trip being carried clears its own
           flag on the way up, and the bar's handler runs first, so a check on
           release would find a clean slate and step the week at the end of
           every drag. */
        if (g.axis === 'x') g.allowed = canSlide(g);
        if (g.allowed) beginMotion();
        if (g.allowed && !calmly.matches) {
          /* The days are what travels, so the step is the pane less the bus
             column: the arriving week's first day lands where the leaving
             week's last one was. */
          const head = gridEl.querySelector('.scheduler-corner')?.offsetWidth ?? 0;
          g.travel = Math.max(1, schEl.clientWidth - head);
          schEl.style.setProperty('--scheduler-pane-w', `${schEl.clientWidth}px`);
          schEl.style.setProperty('--scheduler-slide-w', `${g.travel}px`);
          schEl.classList.add('scheduler-week--sliding');
          g.sliding = true;
        }
      }
      if (g.axis !== 'x' || !g.sliding) return;
      // The week one step away is drawn the first time the finger asks for it.
      const spare = spareFor(dx < 0 ? -1 : 1);
      if (spare) schEl.style.setProperty('--scheduler-slide', `${Math.max(-g.travel, Math.min(g.travel, dx))}px`);
      // With nothing to come in, the week holds still rather than baring the pane.
      else schEl.style.setProperty('--scheduler-slide', '0px');
    });

    /* `touch-action: pan-y` hands the browser the up-and-down axis, and it
       takes any gesture that drifts into it -- scrolling the board and
       cancelling the pointer part-way through a swipe, which is what made a
       swipe with a little rise in it scroll instead of turning the week. Once
       the axis is locked sideways the browser is told to keep off, and it obeys
       that only from a listener declared not passive. The board still scrolls:
       a gesture locked up-and-down never reaches this. */
    schEl.addEventListener('touchmove', e => {
      if (g?.axis === 'x' && g.sliding && e.cancelable) e.preventDefault();
    }, { passive: false });

    schEl.addEventListener('pointercancel', () => {
      if (g?.sliding) settle(0, 0);
      else teardown();
      g = null;
    });

    /* Eases to `to` and then steps the week by `days`, or back to nothing. The
       step is drawn from what is held, which is synchronous, so the spare comes
       away in the same frame the real grid arrives in and no gap is painted. */
    function settle(to, days) {
      settling = true;
      schEl.classList.add('scheduler-week--settling');
      schEl.style.setProperty('--scheduler-slide', `${to}px`);
      const track = gridEl.querySelector('.scheduler-track');
      let timer;
      const done = () => {
        clearTimeout(timer);
        track?.removeEventListener('transitionend', ended);
        teardown();
        if (days) go(days);
        settling = false;
        loadingAdjacent = false;
        stopLoading();
      };
      const ended = e => {
        if (e.target === track && e.propertyName === 'transform') done();
      };
      track?.addEventListener('transitionend', ended);
      timer = setTimeout(done, SLIDE_MS + 60);
    }

    async function loadAdjacent(days) {
      loadingAdjacent = true;
      const from = cursor;
      const target = addDays(from, days);
      const timer = setTimeout(() => {
        const box = el('div', 'rux--inline-loading');
        const animation = el('div', 'rux--inline-loading__animation');
        animation.appendChild(loadingSpinner());
        box.append(animation, el('div', 'rux--inline-loading__text',
          days > 0 ? 'Loading next week…' : 'Loading previous week…'));
        loadingStatus?.replaceChildren(box);
        loadingRow?.classList.add('scheduler-toolbar__weekrow--loading');
      }, 200);
      let sliding = false;
      try {
        // Reuse any refresh already in flight before asking for more data.
        if (reading) await reading;
        if (iso(cursor) !== iso(from)) return;
        if (!holds(target)) {
          const data = await read(target);
          if (iso(cursor) !== iso(from)) return;
          cached = { data, centre: target };
        }
        if (calmly.matches) { go(days); return; }
        beginMotion();
        const head = gridEl.querySelector('.scheduler-corner')?.offsetWidth ?? 0;
        const travel = Math.max(1, schEl.clientWidth - head);
        schEl.style.setProperty('--scheduler-pane-w', `${schEl.clientWidth}px`);
        schEl.style.setProperty('--scheduler-slide-w', `${travel}px`);
        schEl.style.setProperty('--scheduler-slide', '0px');
        schEl.classList.add('scheduler-week--sliding');
        spareFor(days > 0 ? -1 : 1);
        // Commit the starting position before enabling the settle transition.
        void schEl.offsetWidth;
        sliding = true;
        settle(days > 0 ? -travel : travel, days);
      } catch (error) {
        teardown();
        say('error', 'Could not load that week', `${error.message || error} Still showing the current week. Swipe to try again.`);
      } finally {
        clearTimeout(timer);
        if (!sliding) { loadingAdjacent = false; stopLoading(); }
      }
    }

    schEl.addEventListener('pointerup', e => {
      if (!g || e.pointerId !== g.pointer) return;
      const start = g;
      g = null;
      if (!start || start.axis !== 'x') { if (start?.sliding) teardown(); return; }
      const dx = e.clientX - start.x;
      const quick = e.timeStamp - start.at < SWIPE_FLICK_MS;
      const far = Math.abs(dx) >= (quick ? SWIPE_FLICK : SWIPE_MIN);
      // The week moves the way the finger went: left brings the next one in.
      const days = dx < 0 ? 7 : -7;
      if (start.sliding) {
        const arriving = schEl.querySelector(dx < 0 ? '.scheduler-grid--next' : '.scheduler-grid--prev');
        if (far && arriving) { settle(dx < 0 ? -start.travel : start.travel, days); return; }
        if (far) { teardown(); loadAdjacent(days); return; }
        settle(0, 0);
        return;
      }
      teardown();
      if (!far || !start.allowed) return;
      if (holds(addDays(cursor, days))) go(days);
      else loadAdjacent(days);
    });
  }

  /* The schedule needs a staff account. /funnel.js opens this page only for an
     account with Scheduler, and /account.js sends a log-in that ends to the
     log-in page. The board and its search wait for the staff profile. An
     account without one, a profile that would not load, or a local preview
     other than the cloud preview gets a notice in their place, and nothing is read. */
  const stop = (kind, title, subtitle) => {
    if (boardEl) boardEl.hidden = true;
    if (searchWrap) searchWrap.hidden = true;
    say(kind, title, subtitle);
  };

  (async () => {
    const account = window.Rux?.account;
    if (!account?.staffProfile) {
      stop('info', 'This preview has no log-in', 'Open http://localhost:8641/, the cloud preview, to load the schedule.');
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
    // A link to one trip opens it once, and the address drops the request so a
    // reload shows the week rather than reopening the trip.
    const asked = new URLSearchParams(location.search);
    if (asked.has('trip')) {
      history.replaceState(null, '', location.pathname);
      goToTrip(asked.get('trip'), asked.get('date'));
    } else if (asked.has('draft')) {
      history.replaceState(null, '', location.pathname);
      openDraftTrip(asked.get('draft'));
    } else {
      show();
    }
    loadShortcuts();
  })();
})();
