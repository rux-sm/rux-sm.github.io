/* ==========================================================================
   sch-data.js — THE LIVE WEEK, READ ONLY
   --------------------------------------------------------------------------
   Fills #sch-grid from the tables the rux-ui app already writes. Nothing here
   writes: no insert, no update, no delete, and the New trip button ships
   disabled. Step 2 of docs/screen-inventory.md section 5.

   THE CLIENT IS THE ACCOUNT'S, NOT A SECOND ONE. /account.js at the hub root
   opens the session and exposes window.Rux.account.client; two clients on one
   storage key put two GoTrueClient instances there, which supabase-js warns
   about. A module opened alone -- localhost, or this repo served by itself --
   has no /account.js, so it falls back to its own client with persistSession
   off, which cannot fight the first one because it stores nothing. The
   publishable key is meant to sit in client code; the secret keys are the
   backend project's and are nowhere near this repository.

   WHAT A BAR IS: ONE ASSIGNMENT, NOT ONE TRIP. A trip carries an outbound leg
   (start_date..end_date) and, when it is a drop-off and pick-up, a return leg
   (return_start_date..return_end_date) that can be days later; trip_assignments
   rows name a bus per leg and per position, so a seven-bus trip is seven bars
   across seven rows and a drop-off is two bars on the same row with a gap
   between them. A leg needing more buses than it has assignments contributes
   the difference to the Unassigned row, which is the dispatcher's to-do rather
   than an error.

   NO CONFLICT MARKING, DELIBERATELY. The specimen draws a double-booked bar
   and this page never will: placement here is by DAY, and two same-day trips
   on one bus are ordinary -- a morning charter and an afternoon one -- so
   marking every overlap would cry wolf on most rows. Real conflict detection
   needs the times, which is the time-aligned mode, which is later.

   EVERY VALUE FROM THE DATABASE IS WRITTEN WITH textContent. The rows were
   authored in another application, and a destination is data, never markup.
   ========================================================================== */
(() => {
  'use strict';

  const PROJECT = 'https://udnmqhayzhrbltxzzhjw.supabase.co';
  const PUBLISHABLE = 'sb_publishable_w3h8Mtwam0ULemVKGKyBfw_DTbTaJIS';

  const gridEl = document.getElementById('sch-grid');
  const schEl = document.getElementById('sch');
  const statusEl = document.getElementById('sch-status');
  const toastEl = document.getElementById('sch-toast');
  /* TWO ELEMENTS, AND KEEPING THEM APART IS LOAD-BEARING. `rangeEl` is the
     BUTTON -- what `data-rux-open` goes on and what the overlay anchors to --
     and `rangeTextEl` is the span inside it that holds the week. They were one
     element until the trigger gained a caret `<use>`; `setRange` writes
     `textContent`, which on the button would delete the svg on the first
     render and leave a trigger with no disclosure mark. */
  const rangeEl = document.getElementById('sch-range');
  const rangeTextEl = document.getElementById('sch-range-text') || rangeEl;
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
  /* THE WEEK'S FIRST DAY IS A PREFERENCE NOW, not a constant. `mondayOf` is
     kept as the name because that is what it returns by default and what every
     call site means by it; `weekStartsSunday` shifts it by one when set.
     `getDay()` is 0 for Sunday, so Monday-first is `(day + 6) % 7` and
     Sunday-first is simply `day`. */
  let weekStartsSunday = false;
  const mondayOf = d => addDays(d, -(weekStartsSunday ? d.getDay() : (d.getDay() + 6) % 7));
  /* WHICH DAYS ARE THE WEEKEND, ASKED OF THE DATE AND NOT OF THE COLUMN.
     Here rather than at either call site because the board and the driver
     roster both mark it and they must never disagree -- and because the
     column index is the wrong question: `weekStartsSunday` moves the weekend
     to columns 0 and 6, which is not a run of columns at all. */
  const isWeekend = d => d.getDay() === 0 || d.getDay() === 6;
  // Math.round, because a span crossing a daylight-saving change is 23 or 25
  // hours and integer division would drop or add a day.
  const daysBetween = (a, b) => Math.round((b - a) / DAY);

  // -- the palette ----------------------------------------------------------
  // rux-ui stores a colour NAME, and its own module maps retired names to live
  // ones (orange and yellow to amber, cyan to teal). Carbon's tag palette has
  // no amber, so amber is the one colour that cannot be honoured and renders
  // warm-gray; it is also the most-used one. Recorded in docs/log.md as rux's
  // call: a neutral amber, or one bar hue that is not a Carbon tag.
  const HUES = {
    teal: 'teal', cyan: 'teal', green: 'green', purple: 'purple',
    pink: 'magenta', magenta: 'magenta', blue: 'blue', red: 'red',
    amber: 'warm-gray', yellow: 'warm-gray', orange: 'warm-gray',
  };

  // THREE LEVELS, WHICH IS RUX-UI'S OWN RULE. Its `--_tone` reads
  // `var(--_trip-bar-color, var(--sched-trip-bar-confirmed-tone))` with a
  // second rule giving `--unconfirmed:not([data-trip-bar-color])` the
  // unconfirmed tone: an override colour beats status, status beats the
  // default, and the default is BLUE, not neutral. Only the override was
  // wired here until 2026-09-06, and 679 of 743 trips carry none, so
  // virtually every bar came out grey -- a bar saying nothing where the old
  // board said "confirmed, nothing to look at".
  const hueFor = trip => HUES[String(trip.trip_bar_color || '').toLowerCase()]
    ?? (trip.confirmed === false ? 'red' : 'blue');

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

  /* `box` IS THE WHOLE viewBox STRING, NOT ITS LAST NUMBER, and four callers
     read it the other way until 2026-09-08: `svgUse('#i-checkmark', 16, 32)`
     wrote `viewBox="32"`, which is invalid, so the browser dropped the
     attribute and logged one error per icon -- 78 in a session, drowning the
     console this app is meant to be debugged in.

     IT NEVER LOOKED WRONG, WHICH IS WHY IT SURVIVED. Every symbol in the sprite
     carries its own viewBox and scales into whatever viewport it is used in, so
     the icons rendered correctly with no outer viewBox at all. The fault was
     only ever visible in the console -- and the sizes were not even guessable
     from the call: `#i-checkmark` is a 20-unit drawing, the chevrons are 16 and
     `#i-calendar` is 32, where all four calls said 32. */
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

  // WRITTEN OUT, NOT BUILT FROM A PREFIX AND A VARIANT. `rux--inline-
  // notification--${kind}` is a class no checker can resolve, and check-
  // classes said so on the first run: it read the literal half and failed on
  // it. Both whole names appear here, so the gate can see them, which is the
  // point of the gate.
  /* EVERY CLASS WRITTEN OUT IN FULL, never `--${kind}`: check-classes reads
     the source and cannot see through an interpolation.

     SUCCESS AND WARNING WERE MISSING UNTIL 2026-09-06 and the lookup falls
     back to `info`, so every "Saved" and "Trip created" notice this editor has
     shown was rendering as an INFO notice -- the right words in the wrong
     kind, which is exactly the sort of thing a fallback hides. Found while
     adding `warning` for a half-finished create. */
  const NOTE = {
    error: { cls: 'rux--inline-notification rux--inline-notification--error', icon: '#i-error--filled' },
    info: { cls: 'rux--inline-notification rux--inline-notification--info', icon: '#i-information--filled' },
    success: { cls: 'rux--inline-notification rux--inline-notification--success', icon: '#i-checkmark--filled' },
    warning: { cls: 'rux--inline-notification rux--inline-notification--warning', icon: '#i-warning--filled' },
  };

  /* THE SAME FOUR KINDS AGAIN, AS THE ACTIONABLE COMPONENT. Carbon ships a
     second notification for the case where the notice OFFERS something --
     `actionable-notification` -- and `say` grows a fourth argument rather than
     the board growing a second status region. Written out in full for the same
     reason `NOTE` is: check-classes reads the source and cannot see through an
     interpolation. */
  const ACTION_NOTE = {
    error: { cls: 'rux--actionable-notification rux--actionable-notification--error', icon: '#i-error--filled' },
    info: { cls: 'rux--actionable-notification rux--actionable-notification--info', icon: '#i-information--filled' },
    success: { cls: 'rux--actionable-notification rux--actionable-notification--success', icon: '#i-checkmark--filled' },
    warning: { cls: 'rux--actionable-notification rux--actionable-notification--warning', icon: '#i-warning--filled' },
  };

  /* `action` IS OPTIONAL AND CHANGES THE COMPONENT, not just the contents.
     Without it nothing about this function moves: the same inline notification
     it has always built. With it the markup is Carbon's actionable one, taken
     from `carbon-react-dom.json`'s `components-notifications-actionable--inline`
     -- `__focus-wrapper` around `__details` and `__button-wrapper`, the text in
     a `__content` the inline notification does not have, and the ICON keeping
     `rux--inline-notification__icon`, which is what the capture does rather
     than an oversight here.

     TWO THINGS IN THAT CAPTURE ARE DELIBERATELY NOT COPIED. Carbon puts
     `role="alertdialog"` on the root and wraps it in two visually-hidden focus
     sentinels, which together TRAP the keyboard until the notice is dealt
     with. That is right for a notification demanding a decision and wrong for
     a board: `#sch-status` is already `role="status" aria-live="polite"`, the
     move has already happened, and the offer is a courtesy. So the text is
     announced, the button is in the tab order after it, and nothing is
     captured. The close button is dropped for the same reason -- the next
     render clears this region on its own. */
  /* ONE BUILDER FOR BOTH ROOMS. `say` puts it above the board and `toast` puts
     it over the page; what goes INSIDE is the same decision either way, so it
     is made once here.

     `action` CHANGES THE COMPONENT, not just the contents. Without one this is
     Carbon's inline notification, unchanged from what this file has always
     built. With one it is the actionable notification, taken from
     `carbon-react-dom.json`'s `components-notifications-actionable--inline` --
     `__focus-wrapper` around the details and the button, the text in a
     `__content` the inline notification has no equivalent of, and the ICON
     keeping `rux--inline-notification__icon`, which is what the capture does
     rather than an oversight here.

     TWO THINGS IN THAT CAPTURE ARE DELIBERATELY NOT COPIED. Carbon puts
     `role="alertdialog"` on the root and wraps it in two visually-hidden focus
     sentinels, which together TRAP the keyboard until the notice is dealt with.
     That is right for a notification demanding a decision and wrong for a
     board: the move has already happened and the offer is a courtesy. Both
     regions are `role="status" aria-live="polite"`, so the text is announced,
     the button follows it in the tab order, and nothing is captured. The close
     button is dropped for the same reason -- the next message clears the slot. */
  const TOAST_NOTE = {
    error: { cls: 'rux--toast-notification rux--toast-notification--error', icon: '#i-error--filled' },
    info: { cls: 'rux--toast-notification rux--toast-notification--info', icon: '#i-information--filled' },
    success: { cls: 'rux--toast-notification rux--toast-notification--success', icon: '#i-checkmark--filled' },
    warning: { cls: 'rux--toast-notification rux--toast-notification--warning', icon: '#i-warning--filled' },
  };

  function note(kind, title, subtitle, action, asToast) {
    /* A PLAIN TOAST IS CARBON'S TOAST COMPONENT, NOT THE INLINE ONE FLOATED.
       It was the inline one with `--low-contrast` for a round, and that has no
       width of its own: measured in the corner, a short "Move undone" came to
       383px and a real error message to 559px, with the container stretched to
       1119 of the viewport's 1440. `toast-notification` sets `inline-size:
       18rem` itself, which is the same 18rem the actionable `--toast` variant
       carries -- so both shapes are Carbon's own figure and this file invents
       no width.

       ITS STRUCTURE IS FLATTER THAN THE INLINE ONE and is taken from
       `carbon-react-dom.json`'s `components-notifications-toast--default`: the
       icon is a DIRECT child rather than living inside a `__details`, and
       `__details` holds the title and subtitle instead of a
       `__text-wrapper`. Copying the inline arrangement here would put Carbon's
       own padding on the wrong boxes. */
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

  /* A TOAST CAN BE DISMISSED AND THE ONE ABOVE THE BOARD CANNOT, which is the
     one behavioural difference between the two rooms. `say`'s region is cleared
     by the next render -- it describes the board, and when the board changes
     the description is spent. A toast is cleared by nothing: it floats over the
     page and the next render does not touch it, which is exactly why the undo
     survives a re-read, and equally why it would otherwise sit there for good.
     So it carries Carbon's own close button. Written out in full per variant
     because check-classes cannot see through an interpolation. */
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

  /* ABOVE THE BOARD, IN FLOW. Three call sites only, and all three describe the
     BOARD rather than something a person did: loading, nothing this week, and a
     week that would not load. Those stand in for the grid, so pushing it is
     honest. Everything else goes to `toast`. */
  function say(kind, title, subtitle, action) {
    statusEl.replaceChildren();
    if (!kind) { statusEl.hidden = true; return; }
    statusEl.hidden = false;
    statusEl.appendChild(note(kind, title, subtitle, action, false));
  }

  /* ── SAYING IT OVER THE PAGE INSTEAD OF ABOVE THE BOARD ───────────────────
     `say` writes into `#sch-status`, which is in normal flow above the grid, so
     every message it shows pushes the board down and every one it clears pulls
     it back. For the three messages that describe the BOARD -- loading, nothing
     this week, a week that would not load -- that is correct: they stand in for
     the grid. For the thirteen that report what a person just did it is a jolt,
     and rux asked for somewhere else.

     SAME BUILDER, DIFFERENT ROOM. `note()` makes the element for both; this
     adds Carbon's `--toast` modifier, which is what sizes it to 18rem and gives
     it the shadow a floating card needs. The placement is this app's own, in
     sch.css: Carbon ships the toast's APPEARANCE and no position at all.

     IT REPLACES RATHER THAN STACKS, exactly as `say` does. One slot means the
     last thing you did is the thing on screen, and a second move drops the
     first move's undo -- which is the right depth, since only the last move is
     undoable. */
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
    'req_sleeper', 'req_ada', 'req_56pax', 'notes',
    'trip_assignments(id,bus_id,position,leg,trip_drivers(driver_id,role))',
    // THE TIMES ARE HERE, NOT ON THE TRIP. `trips.departure_time`,
    // `return_time` and `spot_time` are null on all 743 rows -- counted
    // 2026-09-06, not sampled -- so a bar reading them showed an empty row on
    // every trip. The itinerary carries them: a leg's first `pickup` stop
    // holds the departure in `depart_prev`, its last `return` stop holds the
    // arrival in `arrive`. That is rux-ui's own rule (extractTripTimes), with
    // one correction: it read a trip's stops without regard to leg, and a bar
    // here IS a leg, so the return leg of a drop-off must read its own.
    // BILLING'S OWN COLUMNS, added 2026-09-09. Counted over all 751 rows before
    // a field was built, because the Schedule section had just been designed
    // against three columns that turned out null on every row: quoted_price 99,
    // deposit_amount 31, invoice_number 43, po_ref 42, po_amount 47,
    // contract_status 336, invoice_status 336, balance_paid 751, date_paid 24.
    // All nine are real and in use, so all nine are fetched.
    /* THE BOOKING CONTACT, added 2026-09-09. Counted first, as ever: `contacts`
       holds 196 rows with name 196, phone 140, email 134 and client 160
       populated -- all four real. What is NOT real is a link on most trips:
       only 292 of 751 carry a `booking_contact_id`, so the section has to have
       something to say for the other 459. */
    'booking_contact_id',
    'contacts:booking_contact_id(id,name,phone,email,client)',
    /* THE DAY-OF CONTACTS, five columns because the schema has five. Counted:
       64 trips carry a first, 7 a second, and one carries all five, so 687 of
       751 have none at all -- which is why the section renders one row and not
       a stack of empty ones. 34 of the 64 point at the booking contact itself,
       which is what the "same as booking" box is for. */
    'trip_contact_1_id', 'trip_contact_2_id', 'trip_contact_3_id',
    'trip_contact_4_id', 'trip_contact_5_id',
    'c1:trip_contact_1_id(id,name,phone)', 'c2:trip_contact_2_id(id,name,phone)',
    'c3:trip_contact_3_id(id,name,phone)', 'c4:trip_contact_4_id(id,name,phone)',
    'c5:trip_contact_5_id(id,name,phone)',
    'quoted_price,deposit_amount,invoice_number,po_ref,po_amount',
    'contract_status,invoice_status,balance_paid,date_paid',
    // The three the billing switches gate, added 2026-09-10 with them.
    // `po_received` and `invoiced` are booleans, never null on any of the 779
    // rows; `contract_note` is free text and non-null on 18, all of them signed.
    'contract_note,po_received,invoiced',
    // 34 rows across the table today. Read-only here: the old app REWRITES every
    // row of a trip on save, which is an editor of its own, not a panel field.
    'trip_payments(id,position,amount,method,date,ref)',
    'trip_stops(id,position,leg,type,name,address,depart_prev,arrive,spot)',
  ].join(',');

  // A STALLED REQUEST HAS TO END SOMEWHERE. A rejected fetch surfaces at once,
  // but a connection that simply hangs does not: measured 2026-09-06 with the
  // network blocked, the grid sat dimmed and marked busy past seven seconds
  // with no error and no way back except a reload. The read loses after this,
  // the catch runs, and pressing the arrow again is a retry. The abandoned
  // request may still land; nothing reads it, because a second read cannot
  // start while one is in flight.
  const READ_TIMEOUT = 15000;
  const withTimeout = promise => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(
      () => reject(new Error(`The schedule did not answer within ${READ_TIMEOUT / 1000} seconds.`)),
      READ_TIMEOUT)),
  ]);

  async function read(weekStart) {
    const weekEnd = addDays(weekStart, 6);
    // A trip that STARTED before this week can still run through it, so the
    // window reaches back; 90 days is far longer than any trip in the data and
    // the exact overlap is decided per leg below, not by this filter.
    const lo = iso(addDays(weekStart, -90));
    const hi = iso(weekEnd);
    const unwrap = r => { if (r.error) throw new Error(r.error.message); return r.data ?? []; };

    const [buses, trips, drivers, contacts, oos, timeOff] = await withTimeout(Promise.all([
      client.from('buses').select('id,number,capacity,type,status,sort_order,ada_lift,sleeper').order('sort_order').then(unwrap),
      // A CANCELLED TRIP IS NOT ON THE SCHEDULE. `cancelled_at` is set on 41 of
      // the 743 rows and this read never excluded it, so cancelled work has
      // been drawn as live work on every week since the grid landed -- the
      // kind of defect that misleads rather than merely looks wrong. It stays
      // in the table and belongs to the trips page, which is where it can be
      // seen and brought back.
      client.from('trips').select(TRIP_COLUMNS).is('cancelled_at', null)
        .gte('start_date', lo).lte('start_date', hi).order('start_date').then(unwrap),
      client.from('drivers').select('id,name,short_name').then(unwrap),
      /* EVERY CONTACT, ONCE, FOR THE SEARCH. 196 rows of four short columns is
         a few kilobytes and it does not change while a week is open, so it is
         read with the week rather than on each keystroke -- a lookup per
         character against a table this size would be more requests than it is
         worth. */
      client.from('contacts').select('id,name,phone,email,client').order('name').then(unwrap),
      client.from('bus_out_of_service').select('bus_id,start_date,end_date,reason').lte('start_date', hi).gte('end_date', iso(weekStart)).then(unwrap),
      // OVERLAP, NOT CONTAINMENT: a driver away across the whole fortnight has
      // neither date inside this week and is still away every day of it.
      client.from('driver_time_off').select('driver_id,start_date,end_date,reason').lte('start_date', hi).gte('end_date', lo).then(unwrap),
    ]));
    return { buses, trips, drivers, contacts, oos, timeOff, weekStart, weekEnd };
  }

  // formatRange, not two formatted dates joined by a dash: only it knows that
  // a week inside one month is "September 7 - 13, 2026" here and "7-13
  // September 2026" elsewhere. Building it by hand read "7 - September 13,
  // 2026", which is what sent me looking.
  function setRange(weekStart, weekEnd) {
    if (!rangeEl) return;
    /* SHORT MONTH: "Sep 7 – 13, 2026" against "September 7 – 13, 2026", which
       is about 70px back on the widest thing in the toolbar. The month is read
       once and the DAYS are what change week to week; spelling it out cost more
       than it said, and it was the first thing pushing this row to wrap. */
    const fmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    rangeTextEl.textContent = typeof fmt.formatRange === 'function'
      ? fmt.formatRange(weekStart, weekEnd)
      : `${fmt.format(weekStart)} - ${fmt.format(weekEnd)}`;
    /* AND THE PICKER'S INPUT, WHICH NOBODY SEES. It is `hidden`, so this is
       the calendar's idea of where it is rather than anything on screen: open
       it and the shown week's first day is selected and its month is the one
       displayed. Without this the calendar would open on today every time,
       which is wrong the moment you have paged away from today -- which is the
       only time you want it. `valueSetBySelf` stops the `change` listener
       below from treating this as a user pick and re-rendering the week that
       just rendered. */
    if (weekInput) {
      valueSetBySelf = true;
      weekInput.value = iso(weekStart);
      weekInput.dispatchEvent(new Event('change', { bubbles: true }));
      valueSetBySelf = false;
    }
  }

  // -- placing --------------------------------------------------------------
  // A leg's clock, from its own stops. The trip columns stay as the fallback
  // they were written to be, though every one of them is null today.
  /* ONE PLACE PICKS THE TWO ROWS THAT MATTER, so the board and the editor
     cannot choose differently. This was inline in `timesOf` until the Schedule
     section needed the same pair to edit; a second copy of "which stop is the
     pickup" is exactly the kind of thing that drifts and then draws a bar that
     disagrees with the panel describing it. */
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

  // -- drawing --------------------------------------------------------------
  const addRow = (bar, cls, ...parts) => {
    const r = el('div', `sch-bar__row ${cls}`);
    for (const p of parts) if (p != null) r.appendChild(p);
    bar.appendChild(r);
  };
  /* TWELVE HOUR, COMPACT. This was `String(t).slice(0, 5)` -- not a format at
     all, a truncation of Postgres's `HH:MM:SS` -- so the one thing on this page
     that never respected a reader was the time. Charter dispatch reads 12 hour
     and the day column is 136px at its floor, so "7:50a" rather than
     "7:50 AM": the suffix has to survive beside a second time and an en dash.
     Midnight and noon are the two the modulo gets wrong if written naively;
     `|| 12` covers both. */
  const hhmm = t => {
    if (!t) return '';
    const [h, m] = String(t).split(':');
    const hr = Number(h);
    if (!Number.isFinite(hr) || m === undefined) return String(t).slice(0, 5);
    return `${hr % 12 || 12}:${m}${hr < 12 ? 'a' : 'p'}`;
  };

  function barEl(b, driversById) {
    const { trip, leg, assign, place, slot } = b;
    const hue = hueFor(trip);
    const bar = el('article', `sch-bar sch-bar--${hue}`);
    bar.setAttribute('role', 'button');
    bar.tabIndex = 0;
    bar.setAttribute('aria-pressed', 'false');
    bar.dataset.tripId = trip.id;
    bar.dataset.leg = leg.leg;
    if (assign) {
      bar.dataset.assignmentId = assign.id;
      bar.dataset.busId = assign.bus_id ?? '';
      bar.dataset.start = place.start;
      bar.dataset.span = place.span;
    }
    if (trip.confirmed === false) bar.classList.add('sch-bar--unconfirmed');
    if (place.fromPrev) bar.classList.add('sch-bar--from-prev');
    if (place.toNext) bar.classList.add('sch-bar--to-next');
    bar.style.setProperty('--sch-start', place.start);
    bar.style.setProperty('--sch-span', place.span);
    bar.style.setProperty('--sch-lane', b.lane);

    const count = leg.count || 1;
    const ref = [leg.leg === 'return' ? 'Return' : '', count > 1 ? `${slot + 1} of ${count}` : '']
      .filter(Boolean).join(' · ');

    addRow(bar, 'sch-bar__dest', el('span', null, trip.destination || 'No destination'), el('span', 'sch-bar__ref', ref));
    addRow(bar, 'sch-bar__client', el('span', null, trip.customer || ''));

    // Departure and return on one line, an en dash between them. The SPOT
    // time -- be at the yard -- is read above and deliberately not drawn: the
    // row is one line in a column of about 119px, and three times do not fit
    // where two already fill it. It belongs on the trip editor, which does not
    // exist yet.
    const dep = hhmm(leg.depart), back = hhmm(leg.back);
    const legDays = daysBetween(parseISO(leg.from), parseISO(leg.to)) + 1;
    const when = dep && back ? `${dep} \u2013 ${back}`
      : dep ? `Dep ${dep}`
      : back ? `Ret ${back}`
      : (legDays > 1 ? `${legDays} days` : '');
    addRow(bar, 'sch-bar__time', el('span', null, when));

    const reqs = [
      trip.req_sleeper ? 'Sleeper' : null,
      trip.req_ada ? 'ADA lift' : null,
      trip.req_56pax ? '56 pax' : null,
      trip.trip_type && trip.trip_type !== 'round_trip' ? String(trip.trip_type).replace(/_/g, ' ') : null,
    ].filter(Boolean).join(' · ');
    addRow(bar, 'sch-bar__reqs', el('span', null, reqs));

    const names = assign
      ? (assign.trip_drivers || [])
          .map(d => driversById.get(d.driver_id))
          .filter(Boolean)
          .map(who => who.short_name || who.name)
      : [];
    addRow(bar, 'sch-bar__drivers', el('span', null, assign ? (names.join(' · ') || 'No driver') : 'Needs a bus'));

    bar.setAttribute('aria-label', [
      trip.destination || 'No destination', trip.customer, ref,
      place.fromPrev ? 'continues from the previous week' : null,
      place.toNext ? 'continues into the next week' : null,
      trip.confirmed === false ? 'unconfirmed' : null,
    ].filter(Boolean).join(', '));
    return bar;
  }

  function render(data) {
    const { buses, trips, drivers, contacts, oos, timeOff, weekStart, weekEnd } = data;
    const driversById = new Map(drivers.map(d => [d.id, d]));
    // What the panel reads when a bar is clicked: the bar carries ids, not
    // objects, and re-fetching a trip already in hand would be a round trip
    // for nothing.
    panelIndex = { trips: new Map(trips.map(t => [t.id, t])), buses: new Map(buses.map(b => [b.id, b])), driversById, contacts: contacts || [] };

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
    // ALWAYS PRESENT, HIDDEN WHEN EMPTY. A drag has to be able to drop the
    // week's FIRST unassigned trip somewhere, and a row that is not in the
    // document has no rectangle to aim at.
    rows.push({ id: UNASSIGNED, bus: null, empty: !tracks.has(UNASSIGNED) });

    gridEl.replaceChildren();
    /* "#", NOT "Bus". The column holds bus NUMBERS and the corner labels them;
       "#" is the conventional heading for a column of identifiers and it stops
       the heading being wider than the things under it.

       IT SAVES NO WIDTH, and rux asked for it on that basis, so it is worth
       being exact: the column floors at 2rem to square the corner, and the
       widest bus number is already under that floor. "Bus" at 20.5px was not
       what set this column either. What changes is that the heading no longer
       says a word the whole grid already says. The title carries the sense for
       anyone who needs it spelled out. */
    const corner = el('div', 'sch-corner', '#');
    corner.title = 'Bus number';
    gridEl.appendChild(corner);

    // TODAY IS THE HEADER CELL AND NOTHING ELSE. There was a rule down the
    // column until 2026-09-06; sch.css says why it went and why nothing
    // replaces it.
    const today = iso(new Date());
    let todayCell = null;
    /* THE WEEKEND IS READ OFF THE DATE, NOT OFF THE COLUMN INDEX, 2026-09-11.
       This was `i >= 5`, which is only Saturday and Sunday while the week
       starts on Monday. `weekStartsSunday` is a saved view option -- the menu's
       "Start on Sunday" -- and with it on, columns 5 and 6 are FRIDAY and
       SATURDAY: the board dimmed the wrong two days and called Sunday a
       weekday. Measured before the fix, on a Sunday-first week: index 5 = Fri,
       index 6 = Sat, while the actual weekend sits at indices 0 and 6.

       AND NOTHING DOWNSTREAM MAY TREAT THE WEEKEND AS A RUN OF COLUMNS, even
       now that nothing downstream uses it. Sunday-first puts the two days at
       OPPOSITE ENDS of the week. The columns were collected here for a band and
       then for a boundary hairline; both are gone, the body draws a rule at
       every day now, and the weekend's only mark is the dimmed text this line
       sets. The warning stays because the next thing to mark the weekend will
       need it. */
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      const cell = el('div', 'sch-day');
      if (isWeekend(d)) cell.classList.add('sch-day--weekend');
      if (iso(d) === today) { cell.classList.add('sch-day--today'); cell.setAttribute('aria-current', 'date'); todayCell = cell; }
      cell.append(
        document.createTextNode(d.toLocaleDateString(undefined, { weekday: 'short' })),
        el('span', 'sch-day__num', String(d.getDate())),
      );
      gridEl.appendChild(cell);
    }

    /* THE DAY RULES ARE BACK, 2026-09-11, ON RUX'S CALL AND AFTER TWO
       INTERMEDIATE ANSWERS THAT ARE NOW SUPERSEDED. The board has carried "no
       weekend tint, so an empty row still cannot be counted" since 2026-09-07,
       when six vertical day rules were REMOVED at rux's own ask. This pass
       first answered it with a weekend fill, which read as the header band
       bleeding down the board; then with a hairline at the weekend boundary
       only. rux has now asked for the full set back, with the day labels
       centred over them: "lets add the vertical lines back and center the
       dates?"

       WHICH SUBSUMES THE WEEKEND HAIRLINE RATHER THAN JOINING IT. Six rules
       answer the counting problem directly -- an empty row has a landmark every
       column, not one at the week's end -- so a line at the weekend boundary is
       no longer a mark, it is one of six identical ones. The weekend keeps the
       dimmed header text it has always had and nothing else in the body. If it
       needs to be distinguishable again, that is a heavier rule or a fill and a
       separate decision; it is not this.

       THE BOUNDARIES ARE THE SIX INTERNAL ONES, 1 THROUGH 6. Column 0 is the
       week's left edge, which the bus column's own rule already draws, and
       column 7 is its right edge, which the pane draws. A line on either would
       double something. That is the same rule the removed version used -- its
       comment recorded it as "inset one day from the start so it fell on days 1
       to 6 and neither edge" -- reached here by naming the boundaries rather
       than by insetting a repeat, so the edges are explicit instead of implied.

       STILL A BACKGROUND AND STILL PER TRACK, for the reasons the note on
       `--sch-day-rule` in sch.css gives: `background-image` sits above the
       row's own `background-color` and below every child, and `var()` inside a
       custom property resolves where that property is COMPUTED, so the stops
       have to meet the colour on the element that owns both. Both were learned
       the hard way earlier today and neither changes. */
    const ruleCols = [1, 2, 3, 4, 5, 6];
    const dayRuleStops = (() => {
      const parts = [];
      let prev = '0';
      for (const i of ruleCols) {
        const at = `${i * 100 / 7}%`;
        parts.push(`transparent ${prev} calc(${at} - 1px)`);
        parts.push(`var(--sch-day-rule) calc(${at} - 1px) ${at}`);
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
      const rowEl = el('div', 'sch-row' + (r.id === UNASSIGNED ? ' sch-row--unassigned' : ''));
      if (r.empty) rowEl.hidden = true;

      // THE HEAD IS THE NUMBER AND THE EQUIPMENT ICONS. Capacity, type and a
      // non-active status are not dropped, they move to the cell's title, so
      // the column can be narrow and a hover still answers "which bus is this".
      const head = el('div', 'sch-row-head');
      // "No bus", not "Unassigned": the word was the widest thing in the
      // column and set its width on its own. This one wraps, and the row's
      // title carries the full sense.
      /* THE NUMBER IS A TOGGLETIP TRIGGER when there is a bus behind it.
         Structure from `carbon-ibm-products-dom.json`: a `popover-container`
         carrying `--caret`, a placement and `toggletip`, holding a
         `toggletip-button`, then `popover > popover-content > toggletip-content`
         and the caret as the container's last child. js/popover.js opens it on
         click from the markup alone -- the module reads the mode off the classes
         and wants no attribute.

         `right-start` because this column is the board's left edge: anywhere
         else and the tip covers the week it is describing. */
      if (r.bus) {
        const tip = el('span', 'rux--popover-container rux--popover--caret rux--popover--drop-shadow rux--popover--right-start rux--toggletip');
        const trigger = el('button', 'rux--toggletip-button sch-row-head__num');
        trigger.type = 'button';
        trigger.setAttribute('aria-expanded', 'false');
        trigger.setAttribute('aria-label', `Bus ${r.bus.number} details`);
        trigger.textContent = String(r.bus.number);
        const pop = el('span', 'rux--popover');
        const content = el('span', 'rux--popover-content');
        const inner = el('div', 'rux--toggletip-content sch-bus-tip');
        inner.appendChild(el('p', 'rux--toggletip-label', `Bus ${r.bus.number}`));
        const spec = [
          [r.bus.capacity ? `${r.bus.capacity} pax` : null, r.bus.type].filter(Boolean).join(' · '),
          [r.bus.year, r.bus.make, r.bus.model].filter(Boolean).join(' '),
          r.bus.color,
          [r.bus.ada_lift ? 'ADA lift' : null, r.bus.sleeper ? 'Sleeper' : null].filter(Boolean).join(' · '),
          r.bus.vin ? `VIN ${r.bus.vin}` : null,
          r.bus.status && r.bus.status !== 'active' ? `Status: ${r.bus.status}` : null,
        ].filter(Boolean);
        // EVERY VALUE WITH textContent, as everywhere else here: these rows were
        // authored in another application and a bus colour is data, never markup.
        for (const line of spec) inner.appendChild(el('p', null, line));
        if (!spec.length) inner.appendChild(el('p', null, 'Nothing recorded for this bus.'));
        content.appendChild(inner);
        pop.appendChild(content);
        tip.append(trigger, pop, el('span', 'rux--popover-caret'));
        head.appendChild(tip);
      } else {
        head.append(el('div', 'sch-row-head__num', 'No\nbus'));
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

      // EACH SYMBOL KEEPS ITS OWN viewBox. The sprite quarries every icon from
      // the smallest size Carbon ships it in, so these are not all one box:
      // accessibility and hotel exist only at 32, warning--filled at 16. Drawing
      // a 16-box symbol inside a 32-box svg scales it to a quarter of the space.
      /* THE EQUIPMENT ICONS ARE GONE FROM THIS COLUMN, 2026-09-07, and the
         reason is not tidiness: they were SETTING THE ROW HEIGHT. A head is
         the number stacked over its icons, and two of them came to about 74px
         against a 5-row bar's 88 -- invisible until the view menu let a bar
         drop to two rows, at which point the row's height was decided by
         whether that bus happens to have a lift. rux saw it at five rows too:
         the two-icon rows measurably taller than the one-icon rows beside them,
         so the grid's rhythm was set by metadata nobody was reading.

         THEY ARE IN THE TOGGLETIP ON THE NUMBER NOW, with everything else the
         bus knows. `ada_lift` and `sleeper` are ATTRIBUTES -- constant, and a
         dispatcher learns their own fleet -- so they belong behind a press.

         OUT OF SERVICE STAYS IN THE COLUMN. It is a STATE, it changes what the
         row can accept this week, and the drag already reads it as a warning.
         One icon cannot make a row taller than a bar. */
      const kit = el('div', 'sch-row-head__kit');
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
        flag('#i-warning--filled', '0 0 16 16', `Out of service: ${windows.map(w => w.reason || 'no reason given').join('; ')}`, 'sch-row-head__oos');
      }
      if (kit.childElementCount) head.appendChild(kit);

      const track = el('div', 'sch-track');
      track.style.setProperty('--sch-lanes', lanes);
      // The day rules. Per track, for the reason the note above gives.
      track.style.setProperty('--sch-day-rules', dayRuleStops);
      if (r.bus) track.dataset.busId = r.bus.id; else track.dataset.unassigned = 'true';
      for (const w of windows) {
        const place = clip(w.start_date, w.end_date, weekStart, weekEnd);
        const span = el('div', 'sch-oos');
        span.style.setProperty('--sch-start', place.start);
        span.style.setProperty('--sch-span', place.span);
        span.setAttribute('role', 'img');
        span.setAttribute('aria-label', `Out of service, ${w.reason || 'no reason given'}`);
        track.appendChild(span);
      }
      for (const b of bars) { const el = barEl(b, driversById); installDrag(el); track.appendChild(el); }

      rowEl.append(head, track);
      gridEl.appendChild(rowEl);
    }

    // The pane's own border closes the grid, so whichever row ends up last on
    // screen must not draw a rule of its own.
    const shownRows = [...gridEl.querySelectorAll('.sch-row')].filter(r => !r.hidden);
    shownRows[shownRows.length - 1]?.classList.add('sch-row--last');

    // Every bar is replaced on a render, so the panel's opener is gone. Close
    // rather than leave a panel pointing at an element no longer in the page.
    closePanel(false);

    schEl.hidden = false;
    drawAvailability(availabilityRows(data), weekStart);
    placeAvailability();

    // THE ONLY MARK FOR TODAY IS ITS HEADER CELL, so the grid brings that cell
    // into view rather than leaving it past the right edge -- which is where a
    // Sunday sits on a narrow window. Only when it is actually out of view, and
    // never past the sticky bus column, which covers the pane's left edge.
    if (todayCell) {
      const sticky = gridEl.querySelector('.sch-corner')?.offsetWidth ?? 0;
      const visible = schEl.clientWidth;
      const left = todayCell.offsetLeft;
      const right = left + todayCell.offsetWidth;
      if (right > schEl.scrollLeft + visible) schEl.scrollLeft = right - visible;
      else if (left < schEl.scrollLeft + sticky) schEl.scrollLeft = Math.max(0, left - sticky);
    }

    // formatRange, not two formatted dates joined by a dash: only it knows
    // that a week inside one month is "September 7 - 13, 2026" here and
    // "7-13 September 2026" elsewhere. Building it by hand read
    // "7 - September 13, 2026", which is what sent me looking.
    setRange(weekStart, weekEnd);

    const barCount = [...tracks.values()].reduce((n, list) => n + list.length, 0);
    if (!barCount) say('info', 'Nothing this week', 'No trip touches these seven days.');
    else say(null);

    // The line above just changed what sits ABOVE the grid, which moves the
    // grid and changes how much height is left for it. sch.js owns that sum;
    // this says when to redo it rather than leaving it to an observer.
    window.Rux?.schedule?.fit?.();
  }

  /* ── MOVING A TRIP TO ANOTHER BUS ─────────────────────────────────────────
     THE ONE THING THIS PAGE WRITES, and it writes one column:
     `trip_assignments.bus_id`. Vertical only, exactly as rux-ui's own drag is
     -- a trip's DATES are the itinerary's business and are changed in the
     editor, never by sliding a bar sideways.

     ITS RULES, TAKEN FROM THAT DRAG RATHER THAN INVENTED:
       * a threshold before it counts, so a press that does not move still
         selects the bar;
       * the Unassigned row is revealed for the duration, because the week's
         first unassigned trip needs somewhere to land;
       * a double booking and an out-of-service stretch are WARNINGS, not
         walls -- the row says so and the drop still goes through, because the
         dispatcher can see something this page cannot;
       * the Unassigned row can never be a conflict;
       * dropping on the row it came from does nothing.

     TWO RULES ARE THIS APP'S OWN, ADDED 2026-09-07 AFTER RUX MOVED BUSES BY
     MISTAKE ON A PHONE:
       * a finger has to HOLD a bar before it lifts, because a touch that
         travels straight away meant to scroll the board;
       * an INTERRUPTED gesture writes nothing. Only a release is a drop.

     WHAT IT DOES NOT DO: no ghost that re-lays-out a multi-day bar, no
     optimistic move. The source dims, the target row lights, and on release
     the week is read again from the server -- so what is on screen after a
     move is what the database actually holds, not what this page hoped.
     ────────────────────────────────────────────────────────────────────────*/
  /* WHAT COUNTS AS PICKING A BAR UP, AND WHY A FINGER IS ASKED FOR MORE.
     4px of travel is the right threshold for a pointing device and no threshold
     at all for a thumb -- a finger moves that far just landing on the glass. So
     on touch the board's own scroll and this drag were competing for the same
     gesture, and a finger starting on a bar almost always meant the scroll:
     rux moved buses by mistake on a phone, repeatedly.

     A FINGER HOLDS FIRST. Stay inside TOUCH_SLOP for TOUCH_HOLD_MS and the bar
     lifts; travel before that and this was a scroll, so the drag stands down
     and never fires again for that gesture. A mouse is unchanged and picks the
     bar up on the first 4px, because a mouse has no second job on this element.

     KEYED OFF THE POINTER, NOT THE SCREEN. `pointerType` is a property of the
     gesture, so a touchscreen laptop keeps the instant mouse drag AND gets the
     hold from its own screen, in one window at one size. A width query would
     have got both of those wrong. */
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
    for (const other of track.querySelectorAll('.sch-bar')) {
      if (overlaps(start, span, +other.dataset.start, +other.dataset.span)) return true;
    }
    for (const oos of track.querySelectorAll('.sch-oos')) {
      const s = parseFloat(oos.style.getPropertyValue('--sch-start'));
      const n = parseFloat(oos.style.getPropertyValue('--sch-span'));
      if (overlaps(start, span, s, n)) return true;
    }
    return false;
  }

  async function moveToBus(assignmentId, busId) {
    const { error } = await client.from('trip_assignments').update({ bus_id: busId }).eq('id', assignmentId);
    if (error) throw new Error(error.message);
  }

  /* WHAT THE ROW IS CALLED, for a message about a bus that may no longer be on
     screen. `null` is the Unassigned row, which has no number to give. */
  function busLabel(busId) {
    if (!busId) return 'Unassigned';
    const row = gridEl.querySelector(`.sch-track[data-bus-id="${CSS.escape(String(busId))}"]`);
    const num = row?.closest('.sch-row')?.querySelector('.sch-row-head__num')?.textContent?.trim();
    return num ? `bus ${num}` : 'its previous bus';
  }

  /* ── UNDOING A MOVE ───────────────────────────────────────────────────────
     docs/log.md asked for this on 2026-09-07 and three times since: "No undo
     on a bus move." It also said where it would come from -- "the write to
     reverse it is the one `moveToBus` already makes" -- and that is exactly
     what this is. One column, written back to the value the drag closure had
     already captured before it moved.

     `null` NEEDS NO SPECIAL CASE. A bar dragged OFF the Unassigned row has
     `fromBus === null`, and `moveToBus(id, null)` is the same write the
     "Take off its bus" action already makes.

     ONE STEP, AND NO TIMER. `say` is a single slot: the next message or the
     next render replaces whatever is in it, so a second move drops the first
     move's offer and only the last move is undoable -- which is the right
     depth for a board where the truth is the database and not a stack held in
     this page. Nothing expires on a clock either. A notice that vanishes while
     a dispatcher is reading it is a trap, and this one costs nothing to leave
     standing.

     AND THE UNDO ITSELF OFFERS NO UNDO. Pressing it ends on a plain
     notification with no action, so the pair cannot be ping-ponged; going back
     again is another drag. */
  function offerUndo(assignmentId, backTo, label) {
    toast('success', 'Trip moved', `Undo puts it back on ${label}.`, {
      label: 'Undo',
      onClick: async () => {
        toast('info', 'Putting the trip back…', `Moving it to ${label}.`);
        try {
          schEl.setAttribute('aria-busy', 'true');
          gridEl.classList.add('sch-grid--busy');
          await moveToBus(assignmentId, backTo);
        } catch (e) {
          toast('error', 'Could not put that trip back', String(e && e.message ? e.message : e));
          return;
        } finally {
          schEl.removeAttribute('aria-busy');
          gridEl.classList.remove('sch-grid--busy');
        }
        await show();
        toast('success', 'Move undone', `The trip is back on ${label}.`);
      },
    });
  }

  function installDrag(bar) {
    if (!bar.dataset.assignmentId) return;   // an unfilled slot owns no row to move
    bar.addEventListener('pointerdown', down => {
      if (down.button !== 0) return;
      const touch = down.pointerType === 'touch';
      const startX = down.clientX, startY = down.clientY;
      const start = +bar.dataset.start, span = +bar.dataset.span;
      const fromBus = bar.dataset.busId || null;
      let moved = false, target = null, tracks = [], unassignedRow = null, hold = 0;

      const clear = () => {
        for (const { track } of tracks) track.classList.remove('sch-track--drop', 'sch-track--warn');
      };

      // WHILE A FINGER IS CARRYING A BAR THE PAGE MUST NOT SCROLL UNDER IT.
      // `touch-action` is read when the gesture STARTS and cannot be changed
      // once the hold has completed, so a non-passive `touchmove` is what stops
      // the scroll mid-gesture. It works only because arming requires the
      // finger to have stayed still: the browser has not begun scrolling yet,
      // and a scroll already under way cannot be taken back.
      const eat = ev => ev.preventDefault();

      // THE BAR IS PICKED UP. The same for both pointers; only the way in differs.
      const lift = () => {
        moved = true;
        unassignedRow = gridEl.querySelector('.sch-row--unassigned');
        if (unassignedRow?.hidden) { unassignedRow.hidden = false; unassignedRow.dataset.revealed = 'true'; }
        tracks = [...gridEl.querySelectorAll('.sch-track')].map(t => ({ track: t, rect: t.getBoundingClientRect() }));
        bar.classList.add('sch-bar--dragging');
        document.body.style.cursor = 'grabbing';
        try { bar.setPointerCapture(down.pointerId); } catch { /* the pointer is already gone */ }
        if (touch) { touchDragging = true; bar.addEventListener('touchmove', eat, { passive: false }); }
      };

      /* EVERY ENDING COMES THROUGH HERE, AND ONLY A RELEASE WRITES.
         `pointercancel` used to run the same handler as `pointerup`, and that
         handler wrote as soon as the drag had armed. So a gesture the browser
         TOOK AWAY -- a scroll takeover, a system dialog, a window switch
         mid-drag -- committed the move to whichever row the bar was last over,
         with nothing released and nothing confirmed. An interrupted drag is not
         a drop. It is nothing happening, and the trip stays where it was. */
      const finish = async (release) => {
        if (hold) { clearTimeout(hold); hold = 0; }
        bar.removeEventListener('pointermove', move);
        bar.removeEventListener('pointerup', onUp);
        bar.removeEventListener('pointercancel', onCancel);
        bar.removeEventListener('touchmove', eat);
        touchDragging = false;
        if (!moved) return;              // a press that never lifted still selects
        document.body.style.cursor = '';
        bar.classList.remove('sch-bar--dragging');
        clear();
        if (unassignedRow?.dataset.revealed) { unassignedRow.hidden = true; delete unassignedRow.dataset.revealed; }
        // The browser fires a click after this; suppress the one that would
        // otherwise toggle selection at the end of a drag.
        bar.addEventListener('click', e => e.stopPropagation(), { capture: true, once: true });
        if (!release) return;

        const toBus = target ? (target.dataset.busId ?? null) : fromBus;
        if (!target || toBus === fromBus) return;
        /* HELD AS VALUES, NOT AS THE ELEMENTS THEY CAME OFF. `show()` below
           replaces every bar in the grid, so `bar` is detached by the time the
           undo can be pressed and its dataset is gone with it. */
        const assignmentId = bar.dataset.assignmentId;
        const backTo = fromBus;
        const label = busLabel(fromBus);
        let failed = null;
        try {
          schEl.setAttribute('aria-busy', 'true');
          gridEl.classList.add('sch-grid--busy');
          await moveToBus(assignmentId, toBus);
        } catch (e) {
          failed = String(e && e.message ? e.message : e);
        } finally {
          schEl.removeAttribute('aria-busy');
          gridEl.classList.remove('sch-grid--busy');
        }
        /* AWAITED SO THE MESSAGE DESCRIBES A BOARD THAT IS ALREADY CORRECT.
           These go to `toast` now, which `render` does not clear, so neither
           one would be destroyed by the re-read as it was when both lived in
           `#sch-status` -- surviving is no longer what the ordering buys. What
           it buys is that the undo is not offered, and a failure is not
           reported, against a grid still showing the pre-move week. The
           failure is still carried down as a string rather than spoken in the
           `catch`, for the same reason. The board is re-read either way: a move
           that threw may still have landed, and the only honest thing on screen
           is what the server says. */
        await show();   // read it back, rather than trusting the move landed
        if (failed) toast('error', 'Could not move that trip', failed);
        else offerUndo(assignmentId, backTo, label);
      };

      const move = ev => {
        if (!moved) {
          const dx = Math.abs(ev.clientX - startX), dy = Math.abs(ev.clientY - startY);
          // A FINGER THAT TRAVELS BEFORE THE HOLD IS DONE MEANT TO SCROLL.
          // Stand down rather than arm, and let the board keep the gesture.
          // Both axes count, because the board scrolls sideways as well.
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
          target.classList.add(targetWarns(target, start, span) ? 'sch-track--warn' : 'sch-track--drop');
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

  /* ── THE TRIP PANEL ───────────────────────────────────────────────────────
     READ ONLY for now: it shows a trip, it changes nothing. Editing goes in
     field by field, the way the drag went in.

     NO rux-ds MODULE CLAIMS `side-panel`, so opening and closing it is this
     app's own behaviour on Carbon's own markup -- the class is compiled, the
     structure is the sink's, and only the open/closed state is ours. Escape
     closes it and focus goes back to the bar that opened it, because a panel
     that swallows focus on close leaves a keyboard user at the top of the
     document.

     THE PAGE MAKES ROOM rather than the panel floating over it: `.sch-page`
     takes the panel's width as end padding, and the grid follows on its own
     because it measures its pane. Carbon's slide-in variant exists for
     exactly this and drops the shadow a floating panel would carry.
     ────────────────────────────────────────────────────────────────────────*/
  /* HOW MANY RESULTS THE LIST SHOWS, 50 SINCE 2026-09-11.

     IT WAS 12, AND THAT ARGUMENT DIED WITH THE PANEL IT WAS WRITTEN FOR. The
     comment read "the panel is 256px of header, not a page" -- true of the
     `rux--header-panel` the results used to live in. They are a menu hung off
     the field now: the field's own width, `max-block-size: 60vh`, and the list
     scrolling inside it. A dozen rows was a cap on a shape that no longer
     exists.

     WHAT 12 WAS ACTUALLY COSTING, counted live against the fleet's 737 trips:
     "memorial" matches 38, "vanguard" 25, "dallas" 28. Every one of those was
     cut to 12 -- and since the order is `start_date` DESCENDING, what was cut
     was always the OLDEST, with nothing on screen saying so. A dispatcher
     looking for last spring's trip got told to narrow a query that was already
     a school's name.

     50 CLEARS ALL THREE, and the ones it does not clear are the queries that
     should be narrowed anyway: "tx" matches 612. The cap is still printed
     rather than silent -- "More than 50 trips match" -- and cap+1 is still what
     is fetched, so that line never claims a total it did not count. */
  const SEARCH_CAP = 50;
  let panelIndex = { trips: new Map(), buses: new Map(), driversById: new Map(), contacts: [] };
  let panelOpener = null;
  const panelDetails = document.getElementById('sch-panel-details');
  const panelFleet = document.getElementById('sch-panel-fleet');
  const panelBilling = document.getElementById('sch-panel-billing');
  const panelSchedule = document.getElementById('sch-panel-schedule');
  const panelSave = document.getElementById('sch-panel-save');
  const panelReset = document.getElementById('sch-panel-reset');
  const panelCancel = document.getElementById('sch-panel-cancel');

  const panelEl = document.getElementById('sch-panel');
  const tripEl = document.getElementById('sch-trip');
  const panelBody = document.getElementById('sch-panel-body');
  const panelTitle = document.getElementById('sch-panel-title');
  const panelTitleCollapsed = document.getElementById('sch-panel-title-collapsed');
  const pageEl = document.querySelector('.sch-page');

  const def = (rows) => {
    const dl = el('dl', 'sch-def');
    for (const [k, v] of rows) {
      if (!v) continue;
      // A value may be a node, so a row can carry a tag rather than a word.
      const dd = el('dd');
      if (v instanceof Node) dd.appendChild(v); else dd.textContent = v;
      dl.append(el('dt', null, k), dd);
    }
    return dl;
  };

  /* A SECTION CAN CARRY AN INLINE ACTION, 2026-09-10. The billing milestones
     put their switch on the heading line rather than under it, which is what
     rux drew and what saves the panel three stacked `label + switch + "On"`
     blocks.

     WHY NOT A `contained-list` HEADER, which is the component that already
     does exactly this two pixels above on the same tab: because its body is a
     `<ul>` of `contained-list-item`s, and Contract, PO and Invoice hold FORM
     FIELDS, not rows. Putting a text input in a list item would be borrowing
     a component's shell for content it was not built for -- the same fault
     `docs/rux-ds-requests.md` records for `rux--date-picker__icon` and for
     `rux--time-picker`. Payments stays a real contained-list because it
     genuinely has rows; these three get app chrome that MATCHES it, at the
     same 12px/400 and the same `size-sm` height, so the tab still reads as
     one system. */
  const section = (title, node, action) => {
    const wrap = el('div', 'sch-panel-section');
    // A titleless section is still a section: it keeps the `spacing-06` above
    // it. Billing's summary opens the tab, so a "Summary" heading over the
    // first thing on screen names what is already obvious.
    if (!title) { wrap.appendChild(node); return wrap; }
    const head = el('div', 'sch-panel-section__title', title);
    if (!action) { wrap.append(head, node); return wrap; }
    const bar = el('div', 'sch-panel-section__head');
    bar.append(head, action);
    wrap.append(bar, node);
    return wrap;
  };

  /* ── A MILESTONE THAT IS A LIST ─────────────────────────────────────────────
     THREE LISTS, ONE BUILDER, 2026-09-11. Payments shipped as a
     `contained-list` on 2026-09-10 and rux asked for Purchase order and
     Invoice to read the same way -- a row per PO, a row per invoice, an add
     button on the heading. Built as one header and one row rather than three
     copies of each, because "structurally identical to Payments" is a claim
     worth making true in the code rather than by eye: the three lists cannot
     drift in height, density, tag size or row grid, since there is one of
     each.

     THE SWITCH GOES IN THE HEADER'S ACTION SLOT beside the `+`, which is where
     `section()` already puts it for Contract -- the same heading line, at the
     same height. It is passed in rather than built here because PO and Invoice
     have one and Payments does not.

     `__action` IS ABSOLUTE AND THAT IS WHY THE CONTROLS GET A BOX OF THEIR
     OWN. `.rux--contained-list__action` is `position: absolute` with
     `inset-inline: 0` and `justify-content: flex-end` (`css/rux.css:10752`),
     so it has no height of its own to centre a 24px toggle in beside a 32px
     button. An app element inside it carries the flex row, which keeps the
     override file out of it -- `rux-overrides.css` already steers around the
     same absolute-positioning fault for the ROW action, and the note there
     says the header's own action was left alone. It still is.

     THE HEADER IS BUILT ONCE AND ONLY THE BODY IS REDRAWN. Payments rebuilds
     its whole list on every change, which is safe for markup this file owns;
     a header holding a live toggle is not -- rebuilding it would mint a new
     switch on every row added and drop whatever state the old one held. */
  /* THE HEADER HOLDS THE SWITCH AND NOTHING ELSE, 2026-09-11. It held the
     switch AND the `+`, both inside `__action`, and that is what put PO's and
     Invoice's switches 40px inboard of Contract's -- three consecutive rows on
     two right edges, measured 311 / 271 / 271 at the 320px panel. One control
     per header line puts all three back on one, and the `+` becomes the list's
     last ROW instead (`listAddRow` below).

     THE HEADER IS ALSO NO LONGER THE LIST'S. `--disclosed` existed here to
     make the contained-list's own `__header` read like a section title; with
     the label moved out to `.sch-panel-section__head` -- the line Contract
     signed has always used -- the list has no header to style, so the variant
     goes and `--inset-rulers` comes in to separate the rows.

     THE LIST IS BUILT ONCE AND ONLY THE BODY IS REDRAWN, as before: a header
     holding a live toggle must not be minted again on every row added. */
  const rowList = () => {
    const list = el('div', 'rux--contained-list rux--contained-list--inset-rulers rux--layout--size-md');
    const body = el('ul', 'sch-list-body');
    body.setAttribute('role', 'list');
    list.appendChild(body);
    return { list, body };
  };

  /* THE ADD IS A ROW OF THE LIST. As a row it takes the list's ruler and the
     rows' left edge, so it reads as the place the next row appears rather than
     a button floating below the list. It is also the EMPTY STATE: an empty
     list draws this row alone instead of "No purchase order recorded." above
     an add button, which was two rows saying one thing. */
  const listAddRow = ({ label, id, onClick }) => {
    const li = el('li', 'rux--contained-list-item sch-list-additem');
    const btn = el('button', 'rux--btn rux--btn--ghost rux--layout--size-sm sch-list-add');
    btn.type = 'button';
    if (id) btn.id = id;
    btn.appendChild(svgUse('#i-add', '16', '0 0 32 32'));
    btn.lastChild.setAttribute('class', 'rux--btn__icon');
    btn.append(label);
    btn.addEventListener('click', onClick);
    li.appendChild(btn);
    return { li, btn };
  };

  /* ── ONE MENU FOR EVERY ROW ─────────────────────────────────────────────────
     Added 2026-09-11. Each row carried a permanent `✕`: a destructive control
     on screen at all times, in a 320px row that has to grow a date and a
     second line once `trip_pos` and `trip_invoices` exist. Edit and Remove go
     behind the row's own overflow trigger, which is where Carbon puts row
     actions and where `rux--menu-item--danger` already exists to mark one.

     ONE ELEMENT, NOT ONE PER ROW, which is the pattern this file already uses
     for the cell and bar menus: the menu is positioned at whichever trigger
     was pressed and a variable holds what it acts on. A menu per row would
     mint one on every redraw and leak them.

     STILL NO CONFIRM ON REMOVE. Nothing is written until the panel saves, so a
     mis-click costs a `Reset`, not a record -- the reasoning the `✕` shipped
     with, unchanged by moving it into a menu. */
  let rowMenuEl = null;
  let rowMenuFor = null;
  let rowMenuTrigger = null;
  const rowMenu = () => {
    if (rowMenuEl) return rowMenuEl;
    const menu = el('ul', 'rux--menu rux--menu--sm rux--menu--open rux--menu--shown');
    menu.setAttribute('role', 'menu');
    menu.tabIndex = -1;
    menu.hidden = true;
    const item = (text, danger, pick) => {
      const li = el('li', danger ? 'rux--menu-item rux--menu-item--danger' : 'rux--menu-item');
      li.setAttribute('role', 'menuitem');
      li.tabIndex = 0;
      li.appendChild(el('div', 'rux--menu-item__label', text));
      li.addEventListener('click', () => {
        const act = rowMenuFor;
        window.Rux?.menu?.close?.(menu);
        act?.[pick]?.();
      });
      return li;
    };
    menu.append(item('Edit', false, 'edit'), item('Remove', true, 'remove'));
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
    /* FIXED, WHICH IS THE ONE POSITION `menu.js` REPOSITIONS. Its kernel calls
       `anchor()` on scroll and resize and that is a no-op for anything not
       `position: fixed`; the panel scrolls, so a menu anchored any other way
       would sit still while its row moved out from under it. */
    menu.hidden = false;
    menu.style.position = 'fixed';

    /* MEASURED, NOT ASSUMED, 2026-09-11. This read a hardcoded 160 -- right
       for today's two items and wrong the moment one carries a longer word or
       a third is added. The menu is laid out at the origin first so
       `offsetWidth` is its real width, which is what `popMenuAt` does for the
       board's menus and the same reason. */
    menu.style.insetInlineStart = '0px';
    menu.style.insetBlockStart = '0px';
    const box = trigger.getBoundingClientRect();
    const width = menu.offsetWidth;
    const height = menu.offsetHeight;

    /* IT OPENS TO THE LEFT. The trigger sits at the row's right end, which is
       hard against the panel's own right edge, so a menu growing rightward has
       nowhere to grow -- right-aligning it to the trigger opens it back over
       the row it belongs to. Clamped to the viewport on both axes: the board's
       `popMenuAt` clamps horizontally, and a row low in a long list runs out of
       room on the other one, so this flips above the trigger when the space
       below cannot hold it. */
    const left = Math.max(0, Math.min(box.right - width, window.innerWidth - width));
    const top = box.bottom + height <= window.innerHeight
      ? box.bottom
      : Math.max(0, box.top - height);
    menu.style.insetInlineStart = `${Math.round(left)}px`;
    menu.style.insetBlockStart = `${Math.round(top)}px`;

    /* `null`, NOT THE TRIGGER, and the first version passed the trigger.
       `menu.js` registers an anchored surface with `reposition: anchor(...)`
       and re-places any `position: fixed` menu itself -- so the placement
       above was computed, written, and then overwritten. Measured: asked for
       left 489 against a trigger ending at 649, got 537, opening RIGHTWARD off
       the row. `popMenuAt` passes null for the same reason. The trade is that
       the module does not wire `aria-controls` or return focus for us; the
       trigger carries its own `aria-haspopup` and `aria-expanded` in markup,
       and `aria-expanded` is synced on open and close below. */
    window.Rux?.menu?.open?.(menu, null);
    trigger.setAttribute('aria-expanded', 'true');
    rowMenuTrigger = trigger;
  };

  /* ONE ROW: A TAG, A WORD, AN AMOUNT. `--with-action` puts the row's control
     at its end and `--clickable` makes the row itself the editor, which is
     what keeps editing a row from meaning deleting and retyping it.

     THE GRID IS INSIDE THE ROW'S CONTENT, NOT ON IT. Carbon's
     `__content` is an inline-block of its own, so the three columns go in a
     span this app owns -- no rule here touches a `rux--*` class.

     THE CODE IS NEVER THE ONLY NAME. `CHK`, `PO` and `INV` mean nothing to a
     screen reader, so the row button carries the whole thing in `aria-label`
     and the tag carries its own long form in `title`. */
  const listRow = ({ code, tone, codeTitle, when, much, title, edit, remove, removeLabel }) => {
    const li = el('li', 'rux--contained-list-item rux--contained-list-item--with-action rux--contained-list-item--clickable');
    const open = el('button', 'rux--contained-list-item__content');
    open.type = 'button';
    const line = el('span', code ? 'sch-listrow' : 'sch-listrow sch-listrow--document');
    // A method distinguishes payments; the section already names PO/invoice.
    if (code) {
      const tag = el('span', `rux--tag rux--tag--sm ${tone}`, code);
      if (codeTitle) tag.title = codeTitle;
      line.appendChild(tag);
    }
    line.append(el('span', 'sch-listrow__when', when),
                el('span', 'sch-listrow__much', much ?? ''));
    open.appendChild(line);
    open.title = title;
    open.setAttribute('aria-label', `Edit ${title}`);
    open.addEventListener('click', edit);
    li.appendChild(open);
    const act = el('div', 'rux--contained-list-item__action');
    const more = el('button', 'rux--btn rux--btn--ghost rux--btn--icon-only rux--layout--size-sm rux--menu-button__trigger');
    more.type = 'button';
    more.setAttribute('aria-haspopup', 'true');
    more.setAttribute('aria-expanded', 'false');
    // The trigger's name is the ROW's, so two rows' menus are told apart.
    more.setAttribute('aria-label', `Actions for ${title}`);
    more.appendChild(svgUse('#i-overflow-menu--vertical', '16', '0 0 32 32'));
    more.lastChild.setAttribute('class', 'rux--btn__icon');
    more.addEventListener('click', () => openRowMenu(more, {
      edit, remove, removeLabel,
    }));
    act.appendChild(more);
    li.appendChild(act);
    return li;
  };

  /* CLOSING IS NOW `hidden`, AND THE APPARATUS BELOW IT IS GONE.
     The editor is a flex child of the board rather than a fixed overlay, so
     there is no entrance or exit animation to wait out -- `--right-placement`
     and `--slide-in` are off the element and their rule sets never match.

     WHAT WAS HERE, and it was hard won, so it is worth saying what stopped
     being needed rather than deleting it silently: an `animationend` listener
     plus a 400ms fallback timer, because removing the `--closing` class while
     the exit animation still ran made the panel SNAP back to opacity 1 at its
     original position for one full-strength frame -- the flash rux reported.
     Sampled every frame on 2026-09-06: at 143ms the panel was at opacity 0.176
     and 263px out, and the next frame had it back at opacity 1 and x=0. The fix
     was ordering `hidden` first, while the fill still held the panel out of
     sight, and the timer stayed as a fallback because `animationend` never
     arrives when a stylesheet suppresses animations, which the gate sweep does
     deliberately.

     None of that has anything to hold now. An element that was never animating
     cannot flash on the way out. */
  function closePanel(returnFocus = true) {
    if (panelEl.hidden) return;
    panelEl.hidden = true;
    if (tripEl) tripEl.hidden = true;
    markAvailDays(null);
    for (const b of document.querySelectorAll('.sch-bar[aria-pressed="true"]')) b.setAttribute('aria-pressed', 'false');
    const opener = panelOpener;
    panelOpener = null;
    // THE ROSTER COMES BACK FIRST, so the fit below measures a board that
    // already has it. `placeAvailability` fits too, so the restoring case runs
    // two -- the second is idempotent and the un-yielded case still runs one.
    if (availYielded) { availYielded = false; placeAvailability(); }
    window.Rux?.schedule?.fit?.();
    if (returnFocus && opener?.isConnected) opener.focus();
  }

  /* ── THE TRIP EDITOR ───────────────────────────────────────────────────────
     STEP 4's FIRST SLICE, and deliberately not all 88 columns of `trips`.
     What is editable here is what is a plain column on the trip and changes
     nothing about WHERE the bar sits: destination, customer, type, status,
     the three requirement flags, notes. One update, no cascade.

     WHAT IS NOT EDITABLE HERE AND WHY. Dates move a bar across days and are
     read through legsOf/clip, so a wrong write moves a real trip -- they get
     their own pass with the placement in front of it. Times are not on the
     trip at all: they live per-leg and per-stop in `trip_stops`, which is the
     itinerary editor. Bus and drivers are the Fleet half. Money, contacts and
     the per-leg workflow booleans are a fuller editor than this panel.

     ONE BUTTON, BECAUSE ONE IS WHAT IS CAPTURED. `action-set--row-double` is
     compiled but no captured story shows two buttons in an action set, so the
     second is not ours to invent (AGENTS.md). Close discards.

     SAVE READS BACK rather than trusting the write, the same rule the drag
     follows: `show()` refetches the week. A render replaces every bar, so the
     panel closes with it -- reopening on the new bar is not done yet. */
  const FIELD = (id, label, control, cls = 'rux--form-item') => {
    const item = el('div', cls);
    const lw = el('div', 'rux--text-input__label-wrapper');
    const lab = el('label', 'rux--label', label);
    lab.setAttribute('for', id);
    lw.appendChild(lab);
    item.append(lw, control);
    return item;
  };

  /* A FIELD WHOSE SECTION HEADING ALREADY NAMES IT drops the visible label and
     keeps the name, 2026-09-10. "Contract" over "Contract note" over an empty
     box is the label said twice; rux asked for the second one to become a
     placeholder.

     THE PLACEHOLDER IS NOT THE LABEL, and this is the part that had to be got
     right rather than done the quick way. A placeholder is not exposed as an
     accessible name by every screen reader, it is not read at all by some
     once the field has content, and it disappears the moment anyone types --
     WCAG 3.3.2 is about exactly this. So the label survives as `aria-label`
     on the input and only its rendered `<label>` element goes. The
     accessibility tree is unchanged; the pixels are not.

     WHY NOT `aria-labelledby` POINTING AT THE HEADING: because the heading
     says "Purchase order" while the two fields under it are the reference and
     the amount, so it names neither. The full name is written out instead. */
  const BARE = (control, cls = 'rux--form-item') => {
    const item = el('div', cls);
    item.appendChild(control);
    return item;
  };

  function textField(id, label, value, placeholder) {
    const outer = el('div', 'rux--text-input__field-outer-wrapper');
    const wrap = el('div', 'rux--text-input__field-wrapper');
    const input = el('input', 'rux--text-input');
    input.type = 'text';
    input.id = id;
    input.value = value ?? '';
    wrap.appendChild(input);
    outer.appendChild(wrap);
    if (!placeholder) return FIELD(id, label, outer, 'rux--form-item rux--text-input-wrapper');
    input.placeholder = placeholder;
    input.setAttribute('aria-label', label);
    return BARE(outer, 'rux--form-item rux--text-input-wrapper');
  }

  /* A CARBON TEXT INPUT IN TIME MODE, AND DELIBERATELY NOT `rux--time-picker`.
     The first attempt wrapped this markup in that class. Carbon's time picker
     is a different component -- a `__input-field` beside a `rux--select-input`
     for AM/PM, which is why `.rux--time-picker .rux--select-input` is compiled
     and nothing there styles a `rux--text-input` -- so the class was a Carbon
     name hung on markup that is not that component. `docs/rux-ds-requests.md`
     already refuses exactly this move for `rux--date-picker__icon`, and it
     would have been the same fault: a page inventing a component's insides.

     WHAT THIS IS INSTEAD: `rux--text-input` with `type="time"`, which is the
     component it really is. The browser draws the clock affordance and gives a
     keyboard the platform's own entry; Carbon draws the box. If a real time
     picker is wanted later, that is a request, not a local wrapper.

     The value round-trips as `HH:MM`, which is what `trip_stops` stores. */
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

  /* THE TOGGLE'S MARKUP IS rux-ds's OWN, taken from templates/form-page.html
     rather than reconstructed from the compiled selectors. `timeField` in the
     entry before this one was built by reading class names out of `rux.css` and
     came out wearing `rux--time-picker` around markup that was not that
     component; the templates are the authoritative shape and cost one grep.

     AND THE BEHAVIOUR IS rux-ds's TOO -- THIS BINDS NOTHING. The first version
     added a click listener that flipped `aria-checked` and rewrote the word
     beside it. `js/form-controls.js` already does exactly that: `setToggle`
     owns the click, sets `aria-checked`, toggles `__switch--checked` and fires
     `rux:toggle`. Two handlers on one control left it reading `false` after an
     odd number of presses, which is what driving it showed. Ours is gone.

     THE WORDS ARE "On" AND "Off" AND CANNOT BE OURS. `setToggle` hard-codes
     them, so a label of "Signed"/"Pending" was overwritten the moment the
     control was pressed. Rather than fight the module for the text, the LABEL
     carries the meaning -- "Contract signed", not "Contract" -- so On and Off
     read correctly against it. rux-ds's own file header already calls that
     hard-coding "worth a decision rather than a silent default"; this app is
     now a consumer that hit it, and it is filed as such.

     TWO VALUES, WHICH IS WHY A TOGGLE AND NOT A SELECT. `contract_status` is
     "Pending" or "Signed" and `invoice_status` is "Pending" or "Invoiced"
     across all 751 rows -- checked, not assumed -- so the control has exactly
     the two positions the data has. */
  function toggleField(id, label, on) {
    const box = el('div', 'rux--toggle');
    const btn = el('button', 'rux--toggle__button');
    btn.type = 'button';
    btn.id = id;
    btn.setAttribute('role', 'switch');
    btn.setAttribute('aria-checked', String(!!on));
    btn.setAttribute('aria-labelledby', `${id}-l`);
    const lab = el('label', 'rux--toggle__label');
    lab.id = `${id}-l`;
    lab.setAttribute('for', id);
    const appearance = el('div', 'rux--toggle__appearance');
    const sw = el('div', 'rux--toggle__switch');
    if (on) sw.classList.add('rux--toggle__switch--checked');
    const text = el('span', 'rux--toggle__text', on ? 'On' : 'Off');
    text.setAttribute('aria-hidden', 'true');
    appearance.append(sw, text);
    lab.append(el('span', 'rux--toggle__label-text', label), appearance);
    box.append(btn, lab);
    return box;
  }

  /* Compact milestone toggle, using sink/toggle.html's small variant.
     The visible section heading now says the full state (Contract signed,
     PO received, Invoice sent), so the repeated On/Off text is unnecessary.
     The button keeps its accessible name and the same rux:toggle event.
     Carbon hides the check glyph while off; keeping it mounted lets the
     existing class toggle handle both states without new behaviour. */
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

  /* MONEY IS A TEXT INPUT WITH A DECIMAL KEYBOARD, not `rux--number-input`.
     Carbon's number input ships stepper buttons -- `rux--number__controls` and
     two `__control-btn`s -- and a quoted price is not a thing anyone steps by
     one. Building that markup to then hide the steppers would be inventing a
     variant; `inputmode="decimal"` gives a phone the right keypad and the
     control stays the component it looks like. */
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

  /* A SEARCH OVER THE CONTACTS, ON THE PLATFORM'S OWN CONTROL, 2026-09-09.
     196 contacts and duplicate first names mean a bare text field cannot tell
     two Ashleys apart; the option list carries name, organisation and phone so
     it can -- "Ashley Pearl - Pearl Elite Getaways - 956-648-9691".

     WHY `<datalist>` AND NOT CARBON'S COMBO BOX. `js/list-box.js` says in as
     many words that filtering is NOT reimplemented and that the combo-box form
     is NOT VERIFIED -- "a combo box has a text input and its own filtering, and
     nothing here should be read as covering it". Writing that filtering here
     would be implementing a component the design system owns, which AGENTS.md
     makes a request rather than a local rule. A datalist is not a Carbon
     component at all: it is the browser's, it filters and announces itself
     without any script of ours, and the input wearing `rux--text-input` is that
     component used correctly. A real filtering combo box is filed instead.

     THE OPTION VALUE IS THE LABEL, which is how datalist works -- there is no
     value/label pair. So the picked row is found by matching the rendered
     string back, and `data-contact-id` records the resolved id for the save. */
  function contactSearch(id, label, listId, contacts, current) {
    const outer = el('div', 'rux--text-input__field-outer-wrapper');
    const wrap = el('div', 'rux--text-input__field-wrapper');
    const input = el('input', 'rux--text-input');
    input.type = 'text';
    input.id = id;
    input.setAttribute('list', listId);
    input.autocomplete = 'off';
    input.placeholder = 'Search contacts';
    input.value = current ? contactLabel(current) : '';
    if (current) input.dataset.contactId = current.id;
    const list = el('datalist');
    list.id = listId;
    for (const c of contacts) {
      const o = el('option');
      o.value = contactLabel(c);
      list.appendChild(o);
    }
    wrap.append(input, list);
    outer.appendChild(wrap);
    return FIELD(id, label, outer, 'rux--form-item rux--text-input-wrapper');
  }

  // One string per contact, and the same one everywhere, so a picked option can
  // be matched back to the row it came from.
  const contactLabel = c => [c.name, c.client, c.phone].filter(Boolean).join(' - ');

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

  function notesField(id, label, value) {
    const item = el('div', 'rux--form-item');
    const lw = el('div', 'rux--text-area__label-wrapper');
    const lab = el('label', 'rux--label', label);
    lab.setAttribute('for', id);
    lw.appendChild(lab);
    const wrap = el('div', 'rux--text-area__wrapper');
    const ta = el('textarea', 'rux--text-area');
    ta.id = id;
    ta.rows = 3;
    ta.value = value ?? '';
    wrap.append(ta, el('span', 'rux--text-area__counter-alert'));
    wrap.lastChild.setAttribute('role', 'alert');
    item.append(lw, wrap);
    return item;
  }

  /* A CARBON RANGE DATE PICKER, built from the capture
     `preview-preview-datepicker--range-with-calendar@open`: the root, two
     `--from`/`--to` containers, and ONE shared calendar container. The module
     fills the calendar and owns it from there -- "the markup is the API" --
     so only the shell is written here, and `Rux.datePicker.init(scope)` claims
     it after the panel is built.

     IT WRITES ISO AND DISPATCHES `change`, which is why the dirty check picks
     these up for free. One behaviour to know: the FIRST pick of a range clears
     the `to` input, so a half-made range is a real state and the save below
     treats a blank end as "same day as the start". */
  const dpIcon = () => {
    const b = el('button', 'rux--date-picker__icon');
    b.type = 'button';
    b.setAttribute('aria-label', 'Open calendar');
    b.tabIndex = -1;
    b.appendChild(svgUse('#i-calendar', '16', '0 0 32 32'));
    return b;
  };

  // BOTH NAMED IN FULL, never built from a fragment: `check-classes` reads the
  // source and cannot see through an interpolation, so a composed class name
  // is one it cannot verify -- and it said so. Same rule as the notification
  // kinds. These are the two the range capture carries.
  /* `--single` JOINED THESE TWO ON 2026-09-10, and its absence was a bug with
     a visible width. `dateOne` was passing `from`, so a lone date picker wore
     the class Carbon puts on the FIRST HALF OF A RANGE -- and
     `.rux--date-picker--next .rux--date-picker-container--from
     .rux--date-picker__input` pins `inline-size: 8.96875rem`, which is one
     half of a range control, not a field. Measured at 143.5px in a 287px grid
     cell, which is the gap rux saw beside it.

     The rule that should have applied is
     `.rux--date-picker.rux--date-picker--single .rux--date-picker__input` at
     `18rem`; it never matched, because the container said range. rux-ds's own
     `sink/date-picker.html:158` uses `--single` on a single picker, so the
     class existed and this file simply reached for the wrong one. */
  const DP_CONTAINER = {
    single: 'rux--date-picker-container rux--date-picker-container--single',
    from: 'rux--date-picker-container rux--date-picker-container--from',
    to: 'rux--date-picker-container rux--date-picker-container--to',
  };

  const dpContainer = (which, id, labelText, value) => {
    const c = el('div', DP_CONTAINER[which]);
    const lab = el('label', 'rux--label', labelText);
    lab.setAttribute('for', id);
    const wrap = el('div', 'rux--date-picker-input__wrapper');
    const span = el('span');
    const input = el('input', 'rux--date-picker__input');
    input.type = 'text';
    input.id = id;
    input.value = value || '';
    span.append(input, dpIcon());
    wrap.appendChild(span);
    c.append(lab, wrap);
    return c;
  };

  /* THE CALENDAR BODY, BUILT ONCE FOR BOTH VARIANTS. `date-picker.js` claims
     any `--next` root containing a `__calendar-container` and fills the days
     itself, so range and single differ only by their variant class and how many
     inputs they carry -- the body is identical, and two copies of it would be
     two things to keep in step for no gain. Extracted 2026-09-09 when Billing's
     `Date paid` needed the second one. */
  function calendarBody() {
    /* `rux--layer-two` IS WHY THE CALENDAR IS VISIBLE AT ALL, added 2026-09-09
       after rux compared it against Carbon's own story and said the surface
       looked wrong. It was.

       `.rux--date-picker--next .rux--date-picker__calendar` paints
       `var(--rux-layer)`, which is a CONTEXTUAL token: Carbon expects an
       ancestor to have raised it. On Carbon's story page nothing has, so the
       calendar takes layer-01 and steps above the page background, and it
       reads correctly. Here the calendar opens inside a side panel that IS a
       layer-01 surface, so both resolved to the same value -- measured in g90,
       panel #393939 and calendar #393939, no step, the boundary invisible.

       THE FIX IS CARBON'S OWN LAYER COMPONENT, not a colour of ours.
       `.rux--layer-two` is compiled in the pin and sets `--rux-layer` to
       layer-02 for its subtree, which is exactly what a surface floating over
       another surface is for. Putting it on the container rather than on the
       panel keeps every field in the form on the layer it already had -- only
       the thing that floats is raised.

       It survives the module: `date-picker.js` DETACHES this container on
       claim and re-inserts the same element on open, so the class travels
       with it. */
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

  /* ONE DATE, ON CARBON'S OWN `--single` VARIANT. `rux--date-picker--single`
     is compiled beside `--range`, so this is the shipped shape rather than a
     range with one half hidden. It reuses `dpContainer` and the calendar body
     the range already builds, because those are the same parts -- the variant
     class is the whole difference, which is how Carbon means it. */
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
      dpContainer('from', fromId, fromLabel, fromVal),
      dpContainer('to', toId, toLabel, toVal),
    );
    root.appendChild(calendarBody());
    const item = el('div', 'rux--form-item');
    item.appendChild(root);
    return item;
  }

  // The fields this pass writes, each with how to read it off the form and
  // what counts as unchanged. `null` and '' are the same thing to the column.
  const SPLIT = 'dropoff_pickup';
  const isoOrNull = v => (/^\d{4}-\d{2}-\d{2}$/.test((v || '').trim()) ? v.trim() : null);

  const EDITS = [
    { key: 'destination', get: f => f['sch-f-destination'].value.trim() || null },
    { key: 'start_date', get: f => isoOrNull(f['sch-f-start'].value) },
    // A BLANK END IS THE SAME DAY, not a null: `legsOf` falls back to
    // start_date anyway, and the picker CLEARS this input on the first pick of
    // a range, so a half-made range would otherwise save as a null end.
    { key: 'end_date', get: f => isoOrNull(f['sch-f-end'].value) ?? isoOrNull(f['sch-f-start'].value) },
    // THE RETURN PAIR IS NULLED OFF A SPLIT, on rux's instruction: a
    // round trip carrying return dates draws a phantom second bar, because
    // `legsOf` makes a leg from them whatever the type says.
    { key: 'return_start_date', get: f => f['sch-f-type'].value === SPLIT ? isoOrNull(f['sch-f-rstart'].value) : null },
    { key: 'return_end_date', get: f => f['sch-f-type'].value !== SPLIT ? null
        : (isoOrNull(f['sch-f-rend'].value) ?? isoOrNull(f['sch-f-rstart'].value)) },
    { key: 'customer', get: f => f['sch-f-customer'].value.trim() || null },
    { key: 'trip_type', get: f => f['sch-f-type'].value || null },
    /* `confirmed`, `balance_paid` AND `date_paid` ARE NOT WRITTEN HERE ANY
       MORE, 2026-09-10. All three were fields on this form -- a Confirmed
       toggle, a Balance paid toggle and a Date paid picker -- and all three
       are columns the rux-ui app DERIVES and overwrites on every save. Two
       writers, one column, and this one loses.

       VERIFIED AGAINST THE LIVE DATABASE rather than argued: the `settings`
       row `billing-workflow-v1` reads

           confirmWhen: ["contract_signed","po_received",
                         "deposit_received","paid_full"]

       so `confirmed` means "a contract is signed, or a PO is in, or a
       deposit landed, or it is paid in full" -- computed from four other
       facts, not typed. rux-ui recomputes it in `collectTrip()` on every
       save; `balance_paid` is `price > 0 && balance <= 0` and `date_paid`
       is the latest payment's date, both recomputed the same way. Anything
       a dispatcher set here was going to be silently reverted the next time
       that trip was opened over there.

       THEY ARE STILL SHOWN, as readouts in the Billing status list, because
       the values are worth reading; they are simply no longer ours to
       write. What would let this app own them honestly is editable
       payments -- the number every one of them derives from -- which is the
       next piece of work rather than this one. */
    { key: 'req_sleeper', get: f => f['sch-f-sleeper'].checked },
    { key: 'req_ada', get: f => f['sch-f-ada'].checked },
    { key: 'req_56pax', get: f => f['sch-f-56pax'].checked },
    { key: 'notes', get: f => f['sch-f-notes'].value.trim() || null },
    /* BILLING. Money comes back from the form as text and goes to the column as
       a number or a null -- `money()` refuses anything that is not a number
       rather than sending NaN, which Postgres rejects with a message about
       syntax that says nothing about the field that caused it.

       THE TWO STATUSES ARE THE DATA'S OWN WORDS, not booleans. The column is
       text and holds "Pending"/"Signed" and "Pending"/"Invoiced"; storing true
       would be a third value nothing else in the system reads. */
    /* EACH GATED FIELD IS NULLED BY ITS OWN SWITCH, 2026-09-10, which is what
       holds the invariant the live table has never broken -- 0 of 779 rows
       carry a `po_ref` without `po_received`, an `invoice_number` while not
       Invoiced, or a `contract_note` on an unsigned contract. rux-ui does the
       same in `collectTrip` (`js/data/trip-db.js:377-379`); this app wrote
       these four ungated and could therefore have been the first.

       `po_received` AND `invoiced` ARE NEW HERE. `po_received` was never
       written at all, so a PO typed in this app left the column false and
       `confirmWhen` never saw it -- the trip stayed unconfirmed with its PO
       in hand. `invoiced` is the boolean twin of `invoice_status`; the two
       agree on all 43 Invoiced rows and this app was writing only the text
       one, which would have split them on the first save. */
    { key: 'quoted_price', get: f => money(f['sch-f-quoted'].value) },
    { key: 'contract_status', get: f => on(f['sch-f-contract']) ? 'Signed' : 'Pending' },
    { key: 'contract_note',
      get: f => on(f['sch-f-contract']) ? (f['sch-f-contractnote'].value.trim() || null) : null },
    /* THE PO AND THE INVOICE COME OFF THEIR PENDING ROW, NOT OFF A FIELD,
       2026-09-11. Both sections became `contained-list`s, so there is no
       `sch-f-poref` or `sch-f-invnum` on the panel to read -- the values live
       in `poPending` / `invPending` and the inputs exist only inside a dialog
       while it is open, the same arrangement `payPending` has had since
       2026-09-10.

       ROW ZERO, BECAUSE THERE IS ONE COLUMN FOR EACH. The lists are capped at
       one row apiece until `trip_pos` and `trip_invoices` exist
       (docs/po-invoice-lists-plan.md), so the first row IS the value. When the
       tables land these three keys become the mirror writes of Phase 0.2 --
       `po_amount` a SUM over the rows, `po_ref` the first by position -- and
       the rest of this list does not change.

       NO ROW IS A NULL, AND THE SWITCH STILL NULLS BOTH. `po_received` with
       an empty list is the state 12 of the 55 existing PO trips are in: a PO
       expected, nothing typed. That is why the switch is not merely
       `count > 0`. */
    { key: 'po_received', get: f => on(f['sch-f-poreceived']) },
    { key: 'po_ref',
      get: f => on(f['sch-f-poreceived']) ? (poPending[0]?.ref ?? null) : null },
    { key: 'po_amount',
      get: f => on(f['sch-f-poreceived']) ? money(String(poPending[0]?.amount ?? '')) : null },
    { key: 'invoice_status', get: f => on(f['sch-f-invoice']) ? 'Invoiced' : 'Pending' },
    { key: 'invoiced', get: f => on(f['sch-f-invoice']) },
    { key: 'invoice_number',
      get: f => on(f['sch-f-invoice']) ? (invPending[0]?.number ?? null) : null },
    /* THE CONTACT LINKS ARE TRIP COLUMNS, so they diff here rather than with
       the contact's own fields. Read straight from the DOM and not through
       `f`: these controls exist only when a trip is open, and `readForm`
       returns null the moment one id in its list is missing, which would kill
       Save on the create panel. `linkId` returns undefined when the field is
       absent and `patchOf` then compares undefined against the before-value,
       so a missing control is simply no change. */
    { key: 'booking_contact_id', get: () => linkId('sch-f-cfind') },
    { key: 'trip_contact_1_id', get: () => dayLink(1) },
    { key: 'trip_contact_2_id', get: () => dayLink(2) },
    { key: 'trip_contact_3_id', get: () => dayLink(3) },
    { key: 'trip_contact_4_id', get: () => dayLink(4) },
    { key: 'trip_contact_5_id', get: () => dayLink(5) },
  ];

  // The id a search field resolved to, or null when the box was cleared or
  // typed freehand. `undefined` means the control is not on screen at all.
  const linkId = id => {
    const e = document.getElementById(id);
    if (!e) return undefined;
    return e.value.trim() ? (e.dataset.contactId || null) : null;
  };

  /* EACH ROW ANSWERS FOR ITSELF, since `Same as booking contact` went on
     2026-09-10. That box used to be the first thing read here -- checked, it
     pointed row one at the booking contact and emptied the rest -- so its
     removal had to be paired with this or the five links would have gone
     silently unwritten.

     THE `!box` GUARD IS THE PART THAT MATTERED, and it is kept on a
     different element rather than dropped. Returning `undefined` means "the
     control is not on screen", which is how a getter says DO NOT WRITE; the
     alternative, `null`, means "on screen and empty" and CLEARS the column.
     With the checkbox gone the guard hangs on row one's own name field,
     which exists whenever this block is built and is absent whenever it is
     not. Without it, opening a trip on a tab that never rendered these rows
     would read five nulls and wipe every day-of contact the trip had. */
  const dayLink = n => {
    if (!document.getElementById('sch-f-d1')) return undefined;
    return linkId(`sch-f-d${n}`) ?? null;
  };

  // A toggle's state lives on `aria-checked`, which is what Carbon's own
  // markup carries -- there is no `.checked` to read.
  const on = e => e?.getAttribute('aria-checked') === 'true';

  /* BLANK IS NULL, NOT ZERO. 652 of 751 trips have no quoted price, and a form
     that turned every empty box into 0 would quietly claim 652 free charters.
     A value that is not a number is also null rather than NaN. */
  const money = v => {
    const t = String(v ?? '').replace(/[$,\s]/g, '');
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  };

  let editing = null;   // { id, before: {...} }

  function readForm() {
    const f = {};
    for (const id of ['destination', 'customer', 'type', 'sleeper', 'ada', '56pax', 'notes',
                      // `confirmed`, `paid` and `datepaid` left this list with
                      // their controls on 2026-09-10, and had to: a missing id
                      // makes readForm return null, which on create becomes an
                      // insert of `{ bus_count: 1 }` -- a trip with no
                      // destination and no start date that nothing can draw.
                      // The guard below is what turns that into a loud failure.
                      // AND A KEY ADDED TO `EDITS` MUST BE ADDED HERE TOO,
                      // 2026-09-10. The billing switches went into `EDITS`
                      // first and not into this list, so `f['sch-f-poreceived']`
                      // was `undefined`, `on(undefined)` returned false, and
                      // every trip with a PO opened with a phantom patch of
                      // `{po_received: false, po_ref: null, po_amount: null}`
                      // -- Save armed on an untouched panel, and pressing it
                      // would have erased a real PO. The guard below could not
                      // catch it: an id that is not in this list never becomes
                      // a key of `f`, so `some(v => !v)` has nothing to test.
                      // AND AN ID WHOSE CONTROL LEFT THE PANEL MUST LEAVE
                      // THIS LIST, 2026-09-11, which is the same rule read
                      // the other way. `poref`, `poamount` and `invnum` went
                      // behind the PO and Invoice dialogs when those sections
                      // became lists; left here they would be three ids that
                      // never resolve, `readForm` would return null on every
                      // open, and Save would die on a panel where nothing was
                      // wrong. Their values now come off the pending rows in
                      // `EDITS` above, which read no element at all.
                      'start', 'end', 'rstart', 'rend',
                      'quoted',
                      'contract', 'contractnote', 'poreceived', 'invoice']) {
      f[`sch-f-${id}`] = document.getElementById(`sch-f-${id}`);
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

  /* mm/dd/yyyy, ON RUX'S CALL 2026-09-09, FOR THE DATES THIS APP RENDERS
     ITSELF. The picker's own inputs CANNOT take this format and are left
     alone: `date-picker.js` accepts one shape, `^(\d{4})-(\d{2})-(\d{2})$`
     in `parse()`, and writes ISO back into the field on every pick. A field
     showing mm/dd/yyyy would be a field the module could not read -- no
     calendar position, no range arithmetic -- so that half is a request to
     rux-ds rather than a format applied here. See docs/rux-ds-requests.md.

     STRING WORK, NOT `new Date()`. A bare `new Date('2026-07-06')` is parsed
     as UTC midnight and then printed in local time, which is the previous day
     anywhere west of Greenwich -- the payment dated the 6th would read as the
     5th. The column is a plain date with no zone, so it is split rather than
     parsed. */
  const mdy = d => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || '').trim());
    return m ? `${m[2]}/${m[3]}/${m[1]}` : (d || '');
  };

  // Whole dollars: every amount in the table is a round number -- 2800, 1108,
  // 600 -- so cents would be two characters of noise on every row.
  const usd = n => `$${Math.round(n).toLocaleString('en-US')}`;

  /* WHAT THE CUSTOMER SECTION WOULD WRITE. Same shape as `stopsPatch`: one
     update for one row, empty when nothing moved.

     IT EDITS A RECORD SHARED BY OTHER TRIPS, and that is a fact about the data
     rather than a flaw in the form. Measured: 55 of the 162 linked contacts
     serve more than one trip and the busiest serves 18, so correcting a phone
     number here corrects it on all 18. That is what a contact IS -- one person
     who books repeatedly -- and it is how the old app already works, per
     `backend-inventory.md`, which lists `contacts` as written by both the
     customer editor and the trip editor. The section says so on screen rather
     than letting it be discovered. */
  /* THE SIX rux-ui OFFERS, in its order. Not a guess and not this app's
     choice to make: `trip_payments.method` is free text, both apps write it,
     and a seventh spelling here would be a value the other app's menu cannot
     round-trip. */
  const PAYMENT_METHODS = ['Cash', 'Check', 'Card', 'ACH', 'Zelle', 'Other'];

  /* A COLOURED TAG WHERE rux ASKED FOR AN ICON, and the substitution is
     deliberate rather than a shortfall quietly dressed up. rux-ds's sprite is
     63 symbols and not one of them means money -- counted 2026-09-10 and filed
     in docs/rux-ds-requests.md -- so `Check` would have to borrow `i-document`
     and `Card` `i-copy`, glyphs that say something else. A tag says the true
     thing in a word AND carries the colour that makes the column scannable,
     which is what the icons were wanted for. The moment the sprite grows a
     card, a bank and a cheque, this becomes `--with-icon` and the words stay.

     THE COLOURS ARE NOT A RANKING. Six methods, six of Carbon's tag hues, no
     order implied -- green is not "better" than red here, and none of these is
     an error state, so `--red` stays out of it entirely. */
  /* THREE LETTERS, NOT THE WORD, and this is rux's placeholder for the icons
     until the sprite has them. A code the width of a glyph buys the row back:
     `Check · 09/10/2026 · $200 · test payment` wrapped to two lines in a
     288px panel, and `CHK 09/10/2026 $200` does not.

     THE CODE IS NEVER THE ONLY NAME. `CHK` means nothing to a first-time
     reader and nothing at all to a screen reader, so the row button carries
     the full method in its `aria-label` and the tag carries it in `title` --
     the abbreviation is a visual shorthand over a label that stays spelled
     out. When the sprite grows a card, a bank and a cheque these become
     icons and the same two labels keep doing that job. */
  const PAYMENT_TAG = {
    Cash:  { code: 'CSH', tone: 'rux--tag--green' },
    Check: { code: 'CHK', tone: 'rux--tag--blue' },
    Card:  { code: 'CRD', tone: 'rux--tag--purple' },
    ACH:   { code: 'ACH', tone: 'rux--tag--teal' },
    Zelle: { code: 'ZLE', tone: 'rux--tag--magenta' },
    Other: { code: 'OTH', tone: 'rux--tag--cool-gray' },
  };

  /* WHAT THE PAYMENT ROWS WANT DONE, as three lists rather than a rewrite.
     A row with a `data-pay-id` existed when the panel opened; without one it
     is new. Anything that had an id and is no longer on screen was removed.

     AN EMPTY ROW IS NOT A PAYMENT. `Add payment` draws a row with today's
     date and nothing else, and somebody who clicks it and then thinks better
     of it should not have a $0 receipt saved. A row counts only once it has
     an amount or a method; an untouched one is dropped, and an EXISTING row
     emptied to nothing is a delete rather than a write of nulls. */
  /* THE PANEL'S PENDING PAYMENTS, and the handle that redraws them. Module
     scope because the dialog lives outside the panel's build closure and has
     to reach both. */
  let payPending = [];
  let redrawPayments = () => {};
  let payEditing = null;   // index being edited, or null for a new row

  /* THE PO AND THE INVOICE ARE PENDING ROWS TOO, 2026-09-11, for the reason
     the payments are: the list is a render of the array and the array is what
     Save reads. Module scope because the dialogs live outside the panel's
     build closure.

     ONE ROW EACH, AND THE CAP IS THE SCHEMA'S RATHER THAN THE LAYOUT'S.
     `trips` holds one `po_ref`, one `po_amount` and one `invoice_number`;
     `trip_pos` and `trip_invoices` do not exist -- probed live, both 404. So
     the `+` disables at `LIST_CAP` and the second row is refused by the thing
     that actually cannot store it. Raising this to Infinity, teaching
     `poPending` an `id`, and swapping the two mirror keys in `EDITS` for
     `posPatch()` / `invoicesPatch()` is the whole of the UI half of
     docs/po-invoice-lists-plan.md; nothing else here is shaped by the cap. */
  const LIST_CAP = 1;
  const CAP_NOTE = {
    po: 'One purchase order per trip for now',
    inv: 'One invoice per trip for now',
  };
  let poPending = [];
  let invPending = [];
  let redrawPos = () => {};
  let redrawInvoices = () => {};
  let poEditing = null;
  let invEditing = null;

  /* THE DIALOG BUILDS ITS FIELDS EACH TIME rather than reusing four kept
     inputs. `dateOne` mints a Carbon date picker with a calendar the module
     has to claim, and claiming the same one twice leaves two; building fresh
     and initialising once is the shape every other picker here uses. */
  function openPaymentDialog(index) {
    const host = document.getElementById('sch-payment-fields');
    if (!host) return;
    payEditing = index;
    const p = index === null ? { date: iso(new Date()) } : payPending[index];
    document.getElementById('sch-payment-h').textContent =
      index === null ? 'Add payment' : 'Edit payment';
    /* TWO COLUMNS, BECAUSE THE DIALOG IS 623px WIDE FOR FOUR SHORT FIELDS.
       Stacked, it was a column of full-width boxes down the middle of a modal
       three times wider than any value in it, and `Done` sat a long way below
       `Method`.

       DATE LEADS, AND I ARGUED THE OTHER WAY FIRST. The case for Method and
       Amount on the top row is that they are what MAKE a payment -- the two
       `Done` tests before deciding a dialog was left empty. rux put Date
       first, and the calendar settles it: it is 348px tall and drops from
       whatever row its field is on, so a Date field on the second row puts
       the calendar through the footer. On the first row it has the height of
       the dialog beneath it. A layout reason beats a semantic one when the
       semantic one costs a clipped control. */
    const grid = el('div', 'sch-dialog-grid');
    grid.append(
      dateOne('sch-f-pdate', 'Date', p.date),
      moneyField('sch-f-pamount', 'Amount', p.amount),
      selectField('sch-f-pmethod', 'Method', p.method ?? '',
        [['', '—'], ...PAYMENT_METHODS.map(m => [m, m])]),
      textField('sch-f-pref', 'Reference', p.ref),
    );
    host.replaceChildren(grid);
    window.Rux?.datePicker?.init?.(host);
    window.Rux?.modal?.open?.('sch-payment-modal');
  }

  document.getElementById('sch-payment-done')?.addEventListener('click', () => {
    const val = id => document.getElementById(id)?.value.trim() ?? '';
    const row = {
      method: val('sch-f-pmethod') || null,
      amount: money(val('sch-f-pamount')),
      date: isoOrNull(val('sch-f-pdate')),
      ref: val('sch-f-pref') || null,
    };
    /* AN EMPTY DIALOG ADDS NOTHING. `Done` on a blank form is the same
       intention as `Cancel`, and a $0 receipt with no method is not a
       payment anyone meant to record. An EXISTING row emptied this way is
       left alone rather than blanked -- removing it is Remove on the row's own menu. */
    if (row.amount === null && !row.method) {
      window.Rux?.modal?.close?.('sch-payment-modal');
      return;
    }
    if (payEditing === null) payPending.push(row);
    else Object.assign(payPending[payEditing], row);
    window.Rux?.modal?.close?.('sch-payment-modal');
    redrawPayments();
    refreshDirty();
  });

  /* THE PO DIALOG: A REFERENCE AND AN AMOUNT, and no date, 2026-09-11. rux
     asked for `mm/dd/yyyy` on this section and it is the one thing here that
     is NOT built: there is nowhere to put it. `trips` has no PO date column,
     and a picker whose value is dropped on save is worse than no picker --
     see the `+` for the same argument about a second row. Phase 1 of
     docs/po-invoice-lists-plan.md adds `date` to `trip_pos`, and the row's
     middle column is already the slot it goes in.

     TWO FIELDS STILL EARN A DIALOG rather than staying inline. The pair was
     inline until today and cost the tab about 120px whenever a PO existed;
     behind a dialog the section is a header and a row at 44px, which is what
     let all three milestones and the receipts fit a 320px column at once.

     BOTH FIELDS KEEP A REAL LABEL HERE, unlike the inline version they
     replace. In the panel the heading said "Purchase order" directly above
     them and the labels were dropped for placeholders (rux asked); a modal
     headed "Add purchase order" has the room, and a labelled field is the
     better default whenever the space is there. */
  function openPoDialog(index) {
    const host = document.getElementById('sch-po-fields');
    if (!host) return;
    poEditing = index;
    const p = index === null ? {} : poPending[index];
    document.getElementById('sch-po-h').textContent =
      index === null ? 'Add purchase order' : 'Edit purchase order';
    const grid = el('div', 'sch-dialog-grid');
    grid.append(
      textField('sch-f-oref', 'Reference', p.ref),
      moneyField('sch-f-oamount', 'Amount', p.amount),
    );
    host.replaceChildren(grid);
    window.Rux?.modal?.open?.('sch-po-modal');
  }

  document.getElementById('sch-po-done')?.addEventListener('click', () => {
    const val = id => document.getElementById(id)?.value.trim() ?? '';
    const row = { ref: val('sch-f-oref') || null, amount: money(val('sch-f-oamount')) };
    /* AN EMPTY DIALOG ADDS NOTHING, the same rule the payment dialog follows.
       `Done` on a blank form is the same intention as `Cancel`, and a PO with
       no reference and no amount is not a PO -- it is the state the switch
       already expresses on its own, which 12 of the 55 existing PO trips are
       in. An EXISTING row emptied this way is left alone rather than blanked;
       removing it is Remove on the row's own menu. */
    if (row.ref === null && row.amount === null) {
      window.Rux?.modal?.close?.('sch-po-modal');
      return;
    }
    if (poEditing === null) { if (poPending.length < LIST_CAP) poPending.push(row); }
    else Object.assign(poPending[poEditing], row);
    window.Rux?.modal?.close?.('sch-po-modal');
    redrawPos();
    refreshDirty();
  });

  /* THE INVOICE DIALOG IS ONE FIELD, and it is still a dialog rather than an
     inline box. The section has to look like the other two -- rux asked for
     all three to read the same way -- and an invoice AMOUNT and DATE are the
     next two fields to land in it the moment `trip_invoices` exists. A
     one-field dialog today is the same layout as a three-field one then;
     an inline box would have to be torn out again. */
  function openInvoiceDialog(index) {
    const host = document.getElementById('sch-inv-fields');
    if (!host) return;
    invEditing = index;
    const v = index === null ? {} : invPending[index];
    document.getElementById('sch-inv-h').textContent =
      index === null ? 'Add invoice' : 'Edit invoice';
    const grid = el('div', 'sch-dialog-grid');
    grid.append(textField('sch-f-inum', 'Invoice number', v.number));
    host.replaceChildren(grid);
    window.Rux?.modal?.open?.('sch-inv-modal');
  }

  document.getElementById('sch-inv-done')?.addEventListener('click', () => {
    const number = document.getElementById('sch-f-inum')?.value.trim() || null;
    if (number === null) {
      window.Rux?.modal?.close?.('sch-inv-modal');
      return;
    }
    if (invEditing === null) { if (invPending.length < LIST_CAP) invPending.push({ number }); }
    else Object.assign(invPending[invEditing], { number });
    window.Rux?.modal?.close?.('sch-inv-modal');
    redrawInvoices();
    refreshDirty();
  });

  /* IT RUNS ON A NEW TRIP TOO, fixed 2026-09-10 after rux asked. This used to
     bail on `editing.creating`, so a deposit typed while booking was drawn in
     the list, counted in the summary, and then silently dropped on save --
     the worst of the three possible behaviours, because the screen said it
     had been recorded.

     NOTHING SPECIAL IS NEEDED FOR IT. A creating panel has no
     `editing.payments`, so every pending row lacks an `id` and falls into
     `inserts` by the rule already written; `deletes` is empty because there
     was nothing to delete. The only real difference is the trip id, which
     does not exist until the INSERT returns -- so the caller passes it in
     rather than this function reading `editing.id`. */
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


  function contactPatch() {
    if (!editing?.contact) return null;
    const val = id => document.getElementById(id)?.value.trim() || null;
    /* NAME IS NOT IN THIS DIFF ANY MORE. It used to be its own field; the
       search replaced it, and a search FINDS a contact rather than renaming
       one -- its value is "Name - Organisation - Phone", not a name. Renaming
       belongs to the Customers view, which owns the record. Picking a
       different contact is a change to `trips.booking_contact_id`, which is a
       trip column and diffs with the rest of them. */
    // `client` left this form with the duplicate Organization field; the
    // Customers view still owns it. Phone and email are what remain editable.
    const now = { phone: val('sch-f-cphone'), email: val('sch-f-cemail') };
    const patch = {};
    for (const k of Object.keys(now)) if (!same(now[k], editing.contact[k])) patch[k] = now[k];
    return Object.keys(patch).length ? { id: editing.contact.id, patch } : null;
  }

  /* WHAT THE SCHEDULE SECTION WOULD WRITE, as one update per row and only for
     rows that changed. Returns [] when nothing moved, which is what lets Save
     stay dead on a panel where only a time was typed and typed back.

     A MISSING ROW IS NOT AN ERROR AND NOT AN INSERT. A leg with no `pickup`
     stop has nowhere to put a departure, and inventing the row here would be
     writing an itinerary from a form that does not describe one -- position,
     type and the rows around it are the itinerary editor's business, and that
     is `screen-inventory.md`'s "later". The controls render empty and disabled
     in that case -- see the disable loop where they are built. */
  function stopsPatch() {
    if (!editing?.stops) return [];
    const val = id => document.getElementById(id)?.value.trim() ?? '';
    const out = [];
    const p = editing.stops.pickup;
    if (p) {
      const patch = {};
      const where = val('sch-f-pickup') || null;
      const depart = val('sch-f-depart') || null;
      const spot = val('sch-f-spot') || null;
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
      const arrive = val('sch-f-return') || null;
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

  /* A TRIP WITHOUT A START DATE IS A TRIP NOBODY CAN SEE. `legsOf` makes the
     outbound leg only `if (trip.start_date)`, so saving a null start would
     take the trip off every week of the board while leaving the row in the
     table -- lost rather than deleted, and from inside the editor that just
     did it. So it is not saveable: clearing the field disables Save and the
     field is marked invalid. The same is not true of the end date, which
     falls back to the start, or of the pick-up pair, which only a split
     reads. */
  function refreshDirty() {
    const patch = patchOf();
    const startEl = document.getElementById('sch-f-start');
    const destEl = document.getElementById('sch-f-destination');
    const startOk = !!isoOrNull(startEl?.value);
    // DESTINATION IS REQUIRED because it is the bar's only label and because
    // it is not null on ANY of the 743 rows -- a null would be the first.
    const destOk = !!destEl?.value.trim();
    destEl?.setAttribute('aria-invalid', String(!destOk));
    // `aria-invalid` ONLY. The first attempt hung a
    // `rux--date-picker--invalid` class on the root and check-classes failed
    // it: Carbon compiles no such class, and inventing one to hang a rule on
    // is the thing AGENTS.md forbids. The attribute is real, it is what a
    // screen reader reads, and Save being dead says the rest.
    startEl?.setAttribute('aria-invalid', String(!startOk));
    // A NEW TRIP IS SAVEABLE WITH NOTHING CHANGED, because its defaults are
    // already a real trip -- the dirty test is for edits, not for creation.
    // A SCHEDULE EDIT IS A REAL EDIT. Save is armed by the trip patch OR by a
    // stop patch; asking only the first left a panel where changing the spot
    // time did nothing and Save stayed grey.
    const stopWork = stopsPatch().length > 0;
    const contactWork = !!contactPatch();
    const payWork = !!paymentsPatch()?.work;
    /* NOTHING TOUCHED is the honest question, and it is not the same one Save
       asks. `patchOf` diffs the form against `editing.before`, which is filled
       from the DRAFT on a new trip just as it is from the row on an existing
       one, so this is true of an untouched panel either way. */
    const nothingChanged = !stopWork && !contactWork && !payWork
      && (!patch || Object.keys(patch).length === 0);
    const nothingToDo = !editing?.creating && nothingChanged;
    panelSave.disabled = !startOk || !destOk || nothingToDo;
    /* RESET ANSWERS TO `nothingChanged`, NOT `nothingToDo`, corrected
       2026-09-10. `nothingToDo` carries `!editing?.creating` because a NEW
       trip is saveable with nothing changed -- its defaults are already a
       real trip -- and that guard makes the expression permanently false
       while creating. Reset inherited it and was therefore live on a blank
       new trip, offering to discard nothing, and doing it in the heaviest
       button on a bar whose Save was correctly grey. rux saw it.

       IT STILL IGNORES THE REQUIRED FIELDS, which Save does not. A form held
       invalid by a blank destination is exactly when someone wants to back
       out, and a Reset greyed for Save's reason would strand them with a trip
       they can neither save nor restore. */
    if (panelReset) panelReset.disabled = nothingChanged;
  }

  /* NEW TRIP OPENS THE SAME PANEL WITH NOTHING IN IT. A trip needs one thing
     to exist on the board -- a start date -- because `legsOf` builds the
     outbound leg only `if (trip.start_date)`. With no assignment the render
     pushes it into the Unassigned row, which is where a trip nobody has given
     a bus belongs, so creation needs no bus and no drivers.

     THE DEFAULTS ARE THE DATA'S, not invented. Across all 743 trips:
     `trip_type` is never null and 705 are round trips, so that is the type;
     `bus_count` is never null, so it is written as 1 rather than left for
     `|| 1` to cover; `confirmed` is never null and 274 trips are false, so a
     trip nobody has confirmed yet is a normal row and the box starts clear;
     `destination` is never null in any of the 743, which is why it is
     required below alongside the date. `customer` is null on 26, so it is
     not. */
  // The bus a new trip will be put on, when creation started from a cell.
  // Null means the trip is created with no assignment and lands in Unassigned.
  let createBusId = null;

  function openCreate(opts = {}) {
    const start = opts.startDate || iso(shown && cursor ? cursor : mondayOf(new Date()));
    createBusId = opts.busId || null;
    openPanel(null, {
      id: null,
      /* NULL AND NOT `''`, corrected 2026-09-10. `same` is
         `(a ?? null) === (b ?? null)`, which leaves an empty string alone --
         so a draft seeded with `''` put `''` into `editing.before`, while
         every getter normalises a blank field back to `null`. A brand-new
         trip therefore reported a patch of `{destination: null, customer:
         null, notes: null}` before anyone typed anything: three fields
         claiming to have changed from "" to null.

         IT WAS INVISIBLE UNTIL RESET EXISTED. Save reads `nothingToDo`,
         which ignores the patch while creating, so nothing acted on the
         phantom diff. Reset asks the honest question -- has anything
         changed -- and answered yes on an untouched form. The fields render
         the same either way: `input.value = value ?? ''`. */
      destination: null, customer: null,
      trip_type: 'round_trip', confirmed: false,
      start_date: start, end_date: start,
      return_start_date: null, return_end_date: null,
      req_sleeper: false, req_ada: false, req_56pax: false,
      notes: null, trip_assignments: [], trip_stops: [],
    });
  }

  /* WHAT BUILT THE PANEL, so Reset can build it again. `openPanel` already
     reads every field out of `trip`, and in edit mode `trip` comes from
     `panelIndex.trips` -- the SAVED row, not anything the form has touched.
     So replaying the same call IS the reset, and there is no second copy of
     the before-state to drift from `editing.before`. In create mode the same
     replay hands back the untouched draft. */
  let panelArgs = null;

  function openPanel(bar, draft) {
    panelArgs = { bar, draft };
    const creating = !!draft;
    const trip = draft ?? panelIndex.trips.get(bar.dataset.tripId);
    if (!trip) return;
    const legName = bar?.dataset.leg || 'outbound';
    const leg = legsOf(trip).find(l => l.leg === legName) ?? legsOf(trip)[0];
    const bus = bar ? panelIndex.buses.get(bar.dataset.busId) : null;
    const assign = bar ? (trip.trip_assignments || []).find(a => a.id === bar.dataset.assignmentId) : null;

    /* THE TITLE STATES THE VERB, NOT THE TRIP. It was a "Create"/"Trip" label
       over the DESTINATION with the CUSTOMER as a subtitle -- three lines, two
       of which the form repeats as its first two fields, and one of which would
       go stale the moment the destination was edited.

       WHAT MADE IDENTITY REDUNDANT IS THE MOVE TO A COLUMN. While this was an
       overlay it covered the board, so the header was the only thing saying
       which trip was open. Beside the board, the bar you clicked is still on
       screen and still `aria-pressed` -- selection is the state of record and
       it is two inches to the left. The header does not have to say it again.

       "New trip" and "Edit trip" say what Save will do, which is the panel's
       whole contract and its only action. */
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

    editing = { id: trip.id, creating, before: {
      destination: trip.destination ?? null,
      customer: trip.customer ?? null,
      trip_type: trip.trip_type ?? null,
      req_sleeper: !!trip.req_sleeper,
      req_ada: !!trip.req_ada,
      req_56pax: !!trip.req_56pax,
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
      // The column is nullable and 415 rows are null; a trip nobody has filed a
      // contract for reads as Pending, which is what the old app shows too.
      contract_status: trip.contract_status === 'Signed' ? 'Signed' : 'Pending',
      invoice_status: trip.invoice_status === 'Invoiced' ? 'Invoiced' : 'Pending',
      // Booleans, so `!!` rather than `?? null` -- the column is never null on
      // any of the 779 rows and `same(false, null)` would report a phantom
      // change on every trip that has neither.
      contract_note: trip.contract_note ?? null,
      po_received: !!trip.po_received,
      invoiced: !!trip.invoiced,
      booking_contact_id: trip.booking_contact_id ?? null,
      trip_contact_1_id: trip.trip_contact_1_id ?? null,
      trip_contact_2_id: trip.trip_contact_2_id ?? null,
      trip_contact_3_id: trip.trip_contact_3_id ?? null,
      trip_contact_4_id: trip.trip_contact_4_id ?? null,
      trip_contact_5_id: trip.trip_contact_5_id ?? null,
    } };

    /* THE SCHEDULE'S BEFORE IS KEPT APART FROM THE TRIP'S, because it is a
       different table. `EDITS`/`patchOf` build a patch for `trips`; these four
       fields are rows in `trip_stops`, so they diff separately and write
       separately. Folding them into one patch object would have `trips.update`
       sent columns it does not have. */
    /* THE CONTACT'S BEFORE IS A THIRD TABLE, kept apart from the trip's and the
       stops' for the same reason: `EDITS`/`patchOf` build a patch for `trips`,
       and sending it a `name` or a `client` would be sending `trips` columns it
       does not have. */
    editing.contact = (creating || !trip.contacts) ? null : {
      id: trip.contacts.id,
      name: trip.contacts.name ?? null,
      phone: trip.contacts.phone ?? null,
      email: trip.contacts.email ?? null,
      client: trip.contacts.client ?? null,
    };

    /* THE ROWS AS THEY WERE, so `paymentsPatch` has something to diff
       against. Same shape as `editing.stops` and for the same reason: the
       form knows what is on screen, not what was there when it opened. */
    editing.payments = creating ? [] : ((trip.trip_payments || [])
      .slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0)));

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
    const form = el('div', 'rux--stack-vertical rux--stack-scale-5');
    /* TYPE COMES FIRST AND THE DATES SECOND, on rux's call 2026-09-09,
       superseding the ordering recorded below it the same day. Type is the
       question that decides what the rest of the form even asks: a drop-off
       and pick-up trip wants two date ranges and every other type wants
       one, so answering it first means the form settles its own shape
       before anyone fills a field in it. The dates keep second place for
       the reason they had first -- they are the one thing that arrives
       already filled, a trip created from a cell carrying that cell's day.

       WHAT THIS GIVES UP, PLAINLY, BECAUSE THE ENTRY IT REPLACES CLAIMED
       IT AS A WIN: `Pick-up` no longer sits under the control that reveals
       it. The return pair is still appended after this whole block, so with
       Type at the top there are now three fields between the select and the
       range it summons instead of none. Moving `Pick-up` up to chase it
       would put the RETURN leg's dates above the outbound leg's, which is
       worse than the distance. Left as distance, knowingly.

       AND IT COSTS THE CALENDAR NOTHING. `__calendar-container` is
       `position: absolute; inset-block-start: 100%` against its own root, so
       it opens downward over whatever follows -- from the top of the panel it
       has more room below it, not less. */
    /* FLUSH, 2026-09-09: `rux--stack-scale-5` puts a 1rem row-gap between
       EVERY child, fluid or not -- right for spacing one titled block from
       the next, wrong within one: Carbon's own fluid forms butt adjacent
       fields against each other with no gap at all, each field's own border
       standing in for the seam. `.sch-fluid-group` zeroes `--rux-stack-gap`
       for a run with no title between its members; the run itself is still
       one item in `form`'s own stack, so the 1rem gap before Pick-up /
       Booking contact / etc. is untouched. */
    /* THE RETURN PAIR IS A SECOND OUTING, NOT THE END OF THE FIRST. Measured
       across all 743 trips on 2026-09-06: every one of the 12 drop-off and
       pick-up trips drops off on a SINGLE day, and the bus comes back 1 to 4
       days later -- Sandia TX drops 19 July and collects 22 July. A single
       From/To range would say the bus is committed for those four days when
       the point of the type is that it is free in between, and the board
       already knows better: `legsOf` makes two legs and draws two bars.

       Round trip and one way never carry return dates -- 0 of 731 -- so the
       pair only appears for a split. And one way is NOT a single date: 25 of
       26 run a day, but one runs three, so it keeps the range too. */
    const returnDates = el('div', 'sch-panel-return-dates');
    returnDates.appendChild(dateRange(
      'sch-f-rstart', 'sch-f-rend', 'Pick-up start', 'Pick-up end',
      trip.return_start_date, trip.return_end_date || trip.return_start_date));
    returnDates.hidden = trip.trip_type !== SPLIT;

    /* THE TWO RANGES NAME THEIR OWN LEGS, 2026-09-10 on rux's call, and the
       `Pick-up` heading that used to do it is gone. The pair sits directly
       under the outbound range now, inside the same flush run, so the two
       ranges read as one block of dates rather than a block and a titled
       section four fields apart.

       WHY THE OUTBOUND LABELS MOVE AND THE RETURN'S DO NOT: the return pair
       is only ever on screen for a split, so `Pick-up start`/`Pick-up end`
       is true whenever it is readable and can be written once. The outbound
       range is shown for EVERY type, so it cannot be called `Drop-off`
       statically -- that word is a lie on a round trip. It takes the split's
       words only while the split is selected, which is also why the form
       echoes back the option just chosen: pick `Drop-off and pick-up` and
       the dates rename themselves to drop-off and pick-up.

       `Drop-off`/`Pick-up` RATHER THAN `Outbound`/`Inbound`, which rux also
       offered: the select immediately above says "Drop-off and pick-up", so
       those are the words already in the reader's head one field earlier.
       `Inbound` would also be a third name for a thing the code calls the
       `return` leg and the Schedule section titles "return leg" -- two
       vocabularies is one too many already. */
    const outLabels = split =>
      split ? ['Drop-off start', 'Drop-off end'] : ['Start date', 'End date'];
    const setOutLabels = split => {
      const [a, b] = outLabels(split);
      const la = panelDetails.querySelector('label[for="sch-f-start"]');
      const lb = panelDetails.querySelector('label[for="sch-f-end"]');
      if (la) la.textContent = a;
      if (lb) lb.textContent = b;
    };
    const [outFrom, outTo] = outLabels(trip.trip_type === SPLIT);

    const topFields = el('div', 'rux--stack-vertical rux--stack-scale-5');
    topFields.append(
      selectField('sch-f-type', 'Type', trip.trip_type, [
        ['', '—'],
        ['round_trip', 'Round trip'],
        ['one_way', 'One way'],
        [SPLIT, 'Drop-off and pick-up'],
      ]),
      dateRange('sch-f-start', 'sch-f-end', outFrom, outTo, trip.start_date, trip.end_date || trip.start_date),
      returnDates,
      textField('sch-f-destination', 'Destination', trip.destination),
      /* ORGANIZATION, AND THERE IS ONLY ONE OF THEM NOW, 2026-09-09 on rux's
         call. This field and the booking block's `Organization or group` read
         the same on nearly every trip -- "TMS" against "TMS" -- and rux saw
         them stacked and cut one.

         `trips.customer` IS THE ONE THAT SURVIVES, because it is the one that
         is there: 725 of 751 trips carry it, where `contacts.client` exists
         only for the 292 with a linked contact and only 160 of the 196
         contacts have one. Keeping the contact's copy would have blanked the
         field on 433 trips.

         WHAT IT GIVES UP, ONCE, SO IT IS NOT REDISCOVERED: 13 trips have a
         `customer` that differs from their contact's `client` -- "Mission
         CISD" books for "Vaquero Indoor", "Raymondville ISD" for "Raymondville
         High School". Billed-to and travelling-group were two facts and are
         now one. `contacts.client` still holds the other and the Customers
         view still edits it; this panel simply stops showing it. */
      textField('sch-f-customer', 'Organization', trip.customer),
      /* NOTES JOINS THE TOP RUN, 2026-09-10 on rux's call, from the foot of
         the tab where it sat beside the checkboxes. It is a fact about the
         trip like the five above it and not a thing anyone hunts for, so it
         belongs in the same flush card rather than after two contact
         sections. It is the only field here that grows: the textarea keeps
         its resize grip, and the card simply gets taller with it. */
      notesField('sch-f-notes', 'Notes', trip.notes),
    );
    form.appendChild(topFields);

    /* ── BOOKING CONTACT ────────────────────────────────────────────────────
       Rebuilt 2026-09-09 against three orderings rux collected. The structure
       is the third's and two behaviours are the first's; the reasoning is in
       docs/log.md, and the two things all three got wrong are recorded there
       rather than argued again here.

       THE LABELS DROP THE PREFIX because the section heading carries it. In a
       320px panel that is width rather than tidiness: "Booking contact phone"
       wraps and "Phone" does not.

       THE SEARCH SUGGESTS AND DOES NOT LOCK. Picking a contact fills
       organisation, phone and email, and every one of them stays editable --
       measured, 13 trips have a `customer` that differs from their contact's
       `client` ("Mission CISD" books for "Vaquero Indoor"), so an agency
       booking for a school is a real shape here and a hard autofill would
       stamp the agency onto trips that are not theirs. */
    const contact = creating ? null : trip.contacts;
    const allContacts = panelIndex.contacts || [];
    {
      /* THE CONTACT BLOCKS RENDER ON A NEW TRIP, 2026-09-09 on rux's ask, and
         nothing about them needed the trip to exist: the search picks from
         contacts that already exist, and the six link columns are `trips`
         columns that join the insert like any other. A booking contact is
         often the FIRST thing known about a trip -- someone rang -- so hiding
         it until after a save had the order backwards. */
      /* THREE FULL-WIDTH ROWS, 2026-09-09 on rux's call, where Phone and
         Email were a `sch-two-up` pair on one row. Fluid is why: a fluid
         field is a 64px box carrying a floating label over its value, and
         two of them in a 288px column leave each about 140px to hold both
         -- an email address in a 140px box is ellipsis by the third
         character. Stacked, each gets the full width the panel has.

         THE LABELS CARRY THE PREFIX AGAIN, 2026-09-10, and the heading that
         used to carry it is gone. This reverses the note two entries down,
         which said the prefix was dropped because in a 320px panel "Booking
         contact phone wraps and Phone does not". It no longer does: the
         fields went full-bleed on 2026-09-10, so the label has 288px of run
         where it had 256, and at `label-01`'s 12px the longest of them --
         `Booking contact phone` -- measures 171.6px. Every one of the five
         fits with over 100px spare, measured rather than guessed.

         WHAT IT BUYS is the section heading's removal, and with it the last
         of the gaps: `Booking contact` and `Day-of-trip contacts` were two
         titled blocks costing 40px of break each, in a form whose fields
         now say which contact they belong to on their own face. A label
         that reads `Booking contact phone` needs nothing above it. */
      /* NO WRAPPER, 2026-09-10, and the reason is the bleed. These three used
         to sit in their own `.sch-fluid-group`; once that group was appended
         INTO `topFields`, which is also one, the negative margin applied
         twice and the fields hung 16px off the panel's left edge with their
         labels at 0. rux saw it as missing padding, and it was -- taken by a
         rule meant to run once. A run that is already flush and already
         gapless needs no second one inside it, so the fields go straight in. */
      topFields.append(
        contactSearch('sch-f-cfind', 'Booking contact name', 'sch-contacts', allContacts, contact),
        textField('sch-f-cphone', 'Booking contact phone', contact?.phone),
        textField('sch-f-cemail', 'Booking contact email', contact?.email),
      );
      /* THE SHARED-CONTACT NOTE IS GONE, 2026-09-10 on rux's call. It read
         "This contact books other trips too. Editing it here changes it on
         all of them." and it was true -- `contacts` rows are shared, so an
         edit here reaches every trip that books the same person. Only the
         WARNING went; the behaviour it described is unchanged and still
         worth knowing when this block is next touched. */
      /* APPENDED INTO `topFields`, NOT AS ITS OWN BLOCK. Both runs are
         `.sch-fluid-group`, so nesting one in the other keeps every gap at
         zero and the whole form reads as one card from Type to the last
         day-of phone. The stack that used to hold this beside a heading is
         gone with the heading. */

      /* ── DAY-OF-TRIP CONTACTS ─────────────────────────────────────────────
         "Day-of-trip" and not "on-site": the person may be travelling with the
         group or coordinating from a desk, and only some of them stand at the
         pickup.

         ONE ROW, NOT FIVE. The schema has `trip_contact_1..5_id` and the data
         has almost none of them -- 687 of 751 trips carry no day-of contact at
         all, 57 carry one, 6 carry two and a single trip carries five. Five
         empty rows would be noise on 91% of trips, so the rows that exist are
         drawn plus one empty, and `+ Add another contact` reveals the next up
         to the schema's five.

         SAME AS BOOKING IS THE COMMONEST CASE AND IS A CHECKBOX. 34 of the 64
         first day-of contacts ARE the booking contact -- 53% of the ones that
         exist are that person retyped. */
      const dayRows = [1, 2, 3, 4, 5].map(i => trip[`c${i}`]).filter(Boolean);
      /* THIS CHECKBOX GOES THROUGH `checkField` LIKE THE OTHER FIVE,
         2026-09-10. It was a hand-rolled copy of that helper's markup and
         had drifted from it in the one way that shows: the label text sat
         DIRECTLY in `.rux--checkbox-label`, where `checkField` wraps it in
         `.rux--checkbox-label-text`. That wrapper is not decoration --
         it is the only thing carrying `padding-inline-start: 0.625rem` in
         rux.css, so without it the words butt against the box. The label's
         own `1.25rem` start padding only reserves room for the `::before`
         square; the 10px BETWEEN square and text belongs to the span. rux
         saw it as "no spacing token between checkbox and label", which is
         exactly what it was. The copy was also missing
         `__validation-msg`; going through the helper ends both drifts and
         leaves one place to change. */
      /* A PLAIN BOX, for the same reason the booking three lost their wrapper:
         this lives inside `topFields`, which already bleeds and already has
         no gap. A block div stacks its children edge to edge and adds
         neither. It stays a named element only because `drawRow` needs
         somewhere to append to. */
      /* A STACK AGAIN, 2026-09-10. This was a plain block for one day, while
         the fields were fluid and a run of them was meant to butt together
         with no gap at all. Default style wants the opposite and the plain
         div gave it nothing: `Day of contact phone` sat hard against the
         name above it at 0px where every other pair in the form had 16.
         The gap belongs to the container, so the container has to be one. */
      const rowsHost = el('div', 'rux--stack-vertical rux--stack-scale-5');
      /* NAME OVER PHONE, NOT BESIDE IT, 2026-09-10 -- the same call the
         booking block took a day earlier and for the same reason: two
         fluid boxes in a 288px column leave each about 140px, and 140px is
         not a phone number beside a name. A contact is two stacked rows
         now, and the run of them stays flush inside `rowsHost`.

         IT ALSO ENDS `.sch-two-up`. Booking contact was its other caller;
         with both stacked the class has no user left, so its rules come out
         of sch.css rather than sitting there as a shape nothing makes. */
      /* THE PREFIX IS ON THESE TOO, 2026-09-10, and for the same reason the
         booking three took it: the `Day-of-trip contacts` heading came off,
         so the field is the only thing left to say which contact it means.
         The row number rides after the noun rather than the phrase --
         `Day of contact name 2`, not `Day of contact 2 name` -- because the
         first reads as the second contact's name and the second reads as a
         field called "contact 2 name". */
      const drawRow = (c, n) => {
        const suffix = n === 1 ? '' : ` ${n}`;
        rowsHost.append(
          contactSearch(`sch-f-d${n}`, `Day of contact name${suffix}`, 'sch-contacts', allContacts, c),
          textField(`sch-f-dphone${n}`, `Day of contact phone${suffix}`, c?.phone),
        );
      };
      const shown = dayRows.length ? dayRows : [null];
      shown.forEach((c, i) => drawRow(c, i + 1));
      topFields.appendChild(rowsHost);

      /* THE BUTTON SAYS WHAT IT ADDS. A bare `+` is ambiguous once a form
         carries two kinds of contact, and this one sits under the second of
         them. It stops at five because the schema does. */
      const addBtn = el('button', 'rux--btn rux--btn--ghost rux--layout--size-sm', 'Add another contact');
      addBtn.type = 'button';
      addBtn.id = 'sch-f-dadd';
      /* THE ICON TRAILS AND WEARS THE CLASS, 2026-09-10. It was PREPENDED and
         carried no class at all, so it got none of Carbon's icon rules and
         sat hard against the word -- rux saw the gap as wrong, and there was
         no gap to be wrong: `margin-inline-start` was 0 because nothing
         selected it.

         PUTTING IT AFTER THE LABEL IS THE FIX, not adding a margin on the
         left. Carbon spaces a button's icon with
         `.rux--btn--ghost .rux--btn__icon { margin-inline-start: 0.5rem }`,
         which is 8px BEFORE the icon -- correct when the icon trails the
         text and backwards when it leads, where it would push the icon off
         the button's own padding and still leave nothing between icon and
         word. Carbon's `Button` renders its icon after the label for the
         same reason; the base rule even pins it to `inset-inline-end`. */
      addBtn.append(svgUse('#i-add', '16', '0 0 32 32'));
      addBtn.lastChild.setAttribute('class', 'rux--btn__icon');
      /* `Same as booking contact` WAS HERE AND IS GONE, 2026-09-10 on rux's
         call. It hid these rows and pointed row one at the booking contact
         on save. Removing it takes the shortcut with it: reusing the booking
         contact is now typing them into Name like anyone else, which the
         search makes cheap. The count of five is still the schema's, so
         `Add another contact` keeps its own limit and simply no longer has
         a second reason to be disabled. */
      let count = shown.length;
      const syncAdd = () => { addBtn.disabled = count >= 5; };
      addBtn.addEventListener('click', () => {
        if (count >= 5) return;
        count += 1;
        drawRow(null, count);
        syncAdd();
      });
      syncAdd();
      /* THE BUTTON IS THE ONE THING HERE THAT DOES NOT BLEED. It goes on
         `form` rather than into the run, so it keeps the stack's own 16px
         above it and stays inset like every other control that is not a
         field. A ghost button flush against the panel edge, directly under
         a filled field, would read as part of the field. */
      form.appendChild(addBtn);
    }

    /* NEITHER CHECKBOX NOR ITS GROUP HAS A FLUID VARIANT -- confirmed against
       rux-ds's compiled css, zero `rux--checkbox` selector carries `fluid`.
       AGENTS.md is explicit that a missing component is a request to rux-ds,
       never a local rule, so this stays Carbon's DEFAULT checkbox. What is
       local is giving it its own titled section rather than letting it sit
       as a bare fieldset between two fluid-boxed neighbours -- the same
       `sch-panel-section__title` class every sibling section already carries,
       so "Equipment" reads as its own module rather than a stray row.

       IT IS `Equipment` AND NOT `Status and needs` AS OF 2026-09-10, which
       is a rename that followed a removal: with `Confirmed` out, the three
       left are all things a coach either has or has not got, and "status"
       named a member the group no longer holds. Singular because equipment
       is uncountable -- rux wrote "Equipments"; the word is the only part
       of that not taken.

       THE LEGEND CANNOT KEEP `rux--label`, 2026-09-09: `.rux--form--fluid
       .rux--label` is a bare descendant selector -- it does not check WHICH
       field the label belongs to, so it caught this legend too and made it
       `position: absolute`, floating it up behind the sticky header where
       nothing could see it. `rux--label` here was only ever borrowed for
       type, never a field's own label, so it drops in favour of the app's
       own title class, which the fluid rule has no selector for. */
    /* ONE ROW, NOT TWO COLUMNS, 2026-09-10. rux asked for two; three fit in
       one. `--horizontal` is Carbon's own compiled variant -- `flex-flow:
       row wrap` -- and the three items measure 77.4, 76.5 and 71.8 against
       the group's 288, so they take 226 with 62 to spare and never wrap. The
       block goes from 99px to 47. A two-column grid would have been a local
       rule for a layout Carbon does not ship, to fit three things that fit
       in one row anyway.

       IT WRAPS IF THE WORDS GROW, which is the variant's own behaviour and
       the reason it is safe to use here: a fourth flag, or a longer one,
       drops to a second row rather than overflowing. */
    const flags = el('fieldset', 'rux--checkbox-group rux--checkbox-group--horizontal sch-panel-section');
    flags.setAttribute('aria-disabled', 'false');
    const legend = el('legend', 'sch-panel-section__title', 'Equipment');
    flags.append(
      legend,
      checkField('sch-f-sleeper', 'Sleeper', trip.req_sleeper),
      checkField('sch-f-ada', 'ADA lift', trip.req_ada),
      checkField('sch-f-56pax', '56 pax', trip.req_56pax),
    );
    /* EQUIPMENT SITS BESIDE THE FORM, NOT IN IT, 2026-09-10. rux asked
       whether the gap above it was standard. It was not, and it was not even
       consistent with itself: `.sch-panel-section` carries a 24px top margin,
       and inside `form` -- a `rux--stack-vertical` -- the stack's own 16px
       row-gap added to it for 40, while the same class on Billing measured 24
       above all three of its sections because `panelBilling` is a plain tab
       panel that adds nothing. One class, two spacings, decided by which kind
       of container it happened to land in.

       APPENDING IT TO THE PANEL rather than to the stack makes Details match
       Billing structurally, so the 24px is the section's own margin in both
       and there is no sum to reason about. The alternative was a rule
       docking the margin whenever a section sits in a stack, which is more
       CSS to say the same thing and leaves the two tabs built differently. */
    panelDetails.appendChild(form);
    panelDetails.appendChild(flags);

    /* CANCEL TRIP MOVED TO THE ACTION BAR, 2026-09-10, and is static markup
       there rather than built here -- index.html carries it and the reason.
       All that is left for this pass is whether it applies: there is nothing
       to cancel on a trip that does not exist yet, and `Close` already
       discards a draft, which is what cancelling one would mean. */
    panelCancel.hidden = creating || !trip.id;

    // THE LEG'S OWN FACTS STAY READ-ONLY. Dates and times are not in this
    // pass; they are shown because the editor above is meaningless without
    // knowing which leg is on screen.
    // NO LEG YET, SO NOTHING TO SAY ABOUT ONE. The section describes the bar
    // that was clicked, and in create mode there is no bar; showing it with
    // blanks would read as data that failed to load.
    /* SCHEDULE REPLACED A READOUT WITH THE THING ITSELF, 2026-09-09 on rux's
       call. This was `This leg`: a `sch-def` list showing Leg, When, Departs,
       Spot and Returns, 146px of text nobody could act on, sitting above a
       284px `Itinerary` structured list nobody could act on either. Between
       them they were 430px of a 729px panel -- more than the 405px the panel
       overflowed by -- so the editor scrolled to show two things it would not
       let you change. Both are gone; these four controls are what most trips
       actually need set.

       THE STOPS ARE THE STORE, NOT THE TRIP COLUMNS, and that is not a
       preference. `trips.departure_time`, `spot_time` and `return_time` are
       null on all 743 rows -- counted 2026-09-06, see the select above -- and
       `timesOf` reads the stops, using those columns only as a fallback that
       has never once been taken. `spot` has no column fallback at all. So a
       Schedule that wrote the trip would save values the BOARD DOES NOT READ:
       the field would change, Save would succeed, and the bar would not move.

       LEG-SCOPED, because a drop-off and pick-up trip has two of these and the
       panel is opened from one bar, which IS one leg. `stopsOfLeg` picks the
       same pickup and return rows `timesOf` places the bar from, so what is
       edited here and what is drawn there cannot disagree.

       NOT IN CREATE MODE. A trip being made has no stops to edit and no leg to
       scope them to; the section appears once the trip exists, which is the
       rule `This leg` already followed and for the same reason. */
    panelSchedule.replaceChildren();
    {
      /* SCHEDULE RENDERS ON A NEW TRIP TOO, and unlike the blocks above this
         one needed a decision rather than just the guard removed. These four
         write `trip_stops`, and a trip being created has none.

         MAKING THE FIRST STOP IS NOT THE SAME AS INVENTING ONE. `stopsPatch`
         refuses to create a row for an EXISTING leg that has no pickup,
         because where that row belongs among the others is the itinerary
         editor's business. A brand-new trip has no others: leg `outbound`,
         position 0, type `pickup` is the only thing it could mean. So on
         create the rows are inserted, and on edit the refusal stands. */
      const { pickup, back } = creating ? { pickup: null, back: null } : stopsOfLeg(trip, legName);
      const sched = el('div', 'rux--stack-vertical rux--stack-scale-5');
      const times = el('div', 'sch-times');
      times.append(
        timeField('sch-f-depart', 'Yard depart', pickup?.depart_prev),
        timeField('sch-f-spot', 'Spot', pickup?.spot),
        timeField('sch-f-return', 'Return', back?.arrive),
      );
      sched.append(
        textField('sch-f-pickup', 'Pickup location',
          [pickup?.name, pickup?.address].filter(Boolean).join(' — ')),
        times,
      );
      /* A CONTROL WITH NO ROW BEHIND IT IS DISABLED, NOT MERELY EMPTY. Three of
         these write the leg's `pickup` stop and one writes its `return` stop,
         and `stopsPatch` refuses to invent either -- making the row is the
         itinerary editor's job, not this form's. An enabled input that silently
         cannot save is the fault this whole section exists to remove, so the
         missing case says so instead. */
      for (const [id, row] of [['sch-f-pickup', pickup], ['sch-f-depart', pickup],
                               ['sch-f-spot', pickup], ['sch-f-return', back]]) {
        // On create there is no row YET, which is not the same as a leg that
        // has none: the save makes them. Only an existing leg disables.
        if (row || creating) continue;
        const input = sched.querySelector(`#${id}`);
        if (input) { input.disabled = true; input.title = 'This leg has no stop to hold it yet.'; }
      }
      /* THE TAB IS THE HEADING NOW, 2026-09-10. This was `section('Schedule')`
         at the foot of Details; with a tab of its own that title would be the
         word `Schedule` printed twice, once in the strip and once under it.
         The return leg keeps a heading because it says something the tab
         cannot: which of a split trip's two outings these four times belong
         to. The panel is opened from one bar and a bar IS one leg, so this is
         never ambiguous by accident -- it is only ever unlabelled when there
         is one leg to mean. */
      panelSchedule.appendChild(
        legName === 'return' ? section('Return leg', sched) : sched);
    }

    /* ── BILLING ────────────────────────────────────────────────────────────
       Every field here was checked against all 751 rows before it was built,
       which is the habit the Schedule section earned the hard way: quoted_price
       99, deposit_amount 31, invoice_number 43, po_ref 42, po_amount 47,
       contract_status 336, invoice_status 336, balance_paid 751, date_paid 24.

       THREE THINGS IN THE MOCKUP ARE NOT BUILT, AND NONE OF THEM IS AN
       OVERSIGHT. `Service type` (Charter/Ticketed) has no column --
       `trips.service_type` does not exist, confirmed by asking for it -- and
       only ONE trip of 751 has any `trip_ticket_options`, so there is nothing
       here to switch between and a column would be rux's to add, not this
       panel's to assume. `Est. miles` and `Actual miles` are not trip columns
       either: `trip_stops.miles` carries them per stop with `miles_source`
       saying estimated or manual, so a total is the itinerary's arithmetic and
       belongs with the itinerary editor. And `Balance` is drawn in the mockup
       as money, but `balance_paid` is a BOOLEAN -- true on 751 of 751 rows, so
       the column is "is it settled", not "how much is left". It is a toggle
       here, and the amount outstanding is shown beside it as arithmetic rather
       than stored twice. */
    panelBilling.replaceChildren();
    {
      /* BILLING RENDERS ON A NEW TRIP TOO, 2026-09-09, and this is a BUG FIX as
         much as rux's request. It used to show "Billing opens once the trip
         exists" and build no fields -- and `readForm` returns null the moment
         ONE id in its list is missing, which nine of these were. `patchOf`
         then returned null, and the create path is
         `{ ...readForm(), bus_count: 1 }`, which spreads null to nothing: a new
         trip inserted as `{bus_count: 1}`, with no destination and no start
         date. `legsOf` builds no leg without a start date, so the row would
         have existed and never appeared on the board. Save is disabled until a
         date is typed, which is the only reason this was not seen.

         Every column here is on `trips`, so on create they simply join the
         insert. Nothing about them needed the trip to exist first. */
      /* THE DERIVED THREE READ, THEY DO NOT EDIT, 2026-09-10. `Confirmed`
         and `Balance paid` were toggles here and `Date paid` was a picker
         in Invoice details; all three are columns rux-ui computes on every
         save, so this app's copies were overwritten as fast as they were
         set. The values still belong on screen -- a dispatcher needs to
         know whether a trip is confirmed -- so they join the readout above
         the toggles rather than leaving with the controls.

         WHAT EACH ONE IS DERIVED FROM, per the live `billing-workflow-v1`
         settings row: confirmed is contract-signed OR PO-received OR
         deposit-received OR paid-in-full; balance paid is a quoted price
         with nothing left owing; date paid is the latest payment's date.
         All three now MOVE when this panel saves, because the payments they
         read became editable here on 2026-09-10 -- which is also why they
         are stated as of the last save rather than recomputed live: the
         other app owns the arithmetic and this one would only be guessing
         at its rung. */
      /* THREE MILESTONES, EACH A SWITCH THAT OWNS ITS FIELDS, 2026-09-10.
         Before this the four billing fields were always editable and the two
         switches sat in a section of their own at the foot of the tab, which
         let this app write three states the database has never held.

         MEASURED ON THE LIVE TABLE, 779 trips, and the invariant is perfect:
         0 rows carry a `po_ref` or a `po_amount` with `po_received` false,
         0 carry an `invoice_number` while not Invoiced, 0 carry a
         `contract_note` on an unsigned contract. `invoiced` and
         `invoice_status` agree on all 43. rux-ui holds that line by nulling
         each field in `collectTrip` when its switch is off
         (`js/data/trip-db.js:377-379`); this app held nothing, so a PO
         reference typed here became the first such row in 779 -- and, because
         `confirmWhen` reads `po_received`, a trip whose PO had landed would
         have gone unconfirmed.

         `po_received` WAS NEVER WRITTEN HERE AT ALL and `invoiced` was
         written only as its text twin. Both join `readForm` with this change.

         THE FIELDS CLEAR WHEN A SWITCH GOES OFF, and that is a deliberate
         difference from rux-ui rather than an oversight. Over there the typed
         value stays in the greyed input and is discarded at save
         (`js/panels/trip-panel.js:497-502` sets only `disabled` and the
         placeholder), so the screen shows a PO number that Save is about to
         delete. Nothing is written here until Save and `Reset` restores the
         panel, so clearing costs a keystroke and buys a screen that always
         states what will be saved. */
      /* THE SWITCH IS THE SECTION'S HEADING ACTION, not the first control in
         its stack. Three `label + switch + "On"` blocks cost about 120px of a
         320px panel and put the question ("has the contract been signed?")
         one line below the answer to a different question (the heading). On
         the heading line the two are the same line. */
      /* THE FIELDS ARE HIDDEN UNTIL THE SWITCH IS ON, 2026-09-10, not merely
         disabled. A trip that has been booked and nothing else showed three
         greyed boxes nobody could type in -- about 190px of the panel spent
         saying "not yet" three times, when the three switches already say it.

         THIS IS SAFE HERE AND WOULD NOT BE IN rux-ui. Hiding a field that
         still holds a value hides data that will be saved; over there the
         typed value survives in the greyed box until `collectTrip` nulls it
         (`js/panels/trip-panel.js:497-502`), so hiding would conceal a real
         difference between what is on screen and what is stored. This app
         CLEARS on toggle-off, so hidden means empty means exactly what will
         be written. The clearing is what buys the hiding.

         rux-ui ALREADY DOES BOTH, which is the precedent: it disables the PO
         number and HIDES the authorised-amount block beside it
         (`details.hidden = !enabled`, `js/panels/trip-panel.js:488-489`).
         This just applies the second treatment to all three.

         THE ATTRIBUTE ALONE WOULD NOT HAVE WORKED. `rux--stack-vertical` is
         `display: grid` (`css/rux.css:24862`), which beats the user agent's
         `[hidden] { display: none }` -- the fields would have stayed on
         screen with no error anywhere. Hence the app class and its own rule
         in `sch.css`, on an element this app owns. */
      const gate = (fields, help) => {
        const box = el('div', 'rux--stack-vertical rux--stack-scale-5 sch-milestone-fields');
        box.append(...fields);
        if (help) box.appendChild(help);
        return box;
      };

      const contract = gate(
        [textField('sch-f-contractnote', 'Contract note', trip.contract_note, 'Note')]);
      const contractSwitch = toggleAction('sch-f-contract', 'Contract signed',
        trip.contract_status === 'Signed');

      /* THE COVERAGE LINE IS THE POINT OF THE PO SWITCH. A PO confirms the
         trip whatever its amount -- `isStatusConfirmed` maps `po_partial`
         onto `po_received` on purpose, and rux-ui's own comment says so:
         "Partial PO is operationally confirmed by the same workflow choice as
         PO received, while its distinct status remains available for
         warnings." So the switch never withholds confirmation; it raises a
         flag beside the amount instead.

         WHAT THE FLAG COUNTS, mirroring `deriveStatus` exactly:

             shortfall = max(0, (quoted - paid) - po_amount)

         PAYMENTS COUNT TOWARD COVERAGE, which is the half of rux's
         requirement that is easy to miss -- "cover the rest with another PO
         or payment". A deposit shrinks the shortfall exactly as a larger PO
         does, because what is uncovered is measured against the REMAINING
         balance rather than against the quoted price. There is one
         `po_amount` column and no second PO row, so "another PO" in practice
         means raising this number. */
      const poCoverage = el('p', 'rux--form__helper-text sch-po-coverage');
      const poSwitch = toggleAction('sch-f-poreceived', 'PO received',
        !!trip.po_received);
      const invoiceSwitch = toggleAction('sch-f-invoice', 'Invoice sent',
        trip.invoice_status === 'Invoiced');

      /* PO AND INVOICE BECAME LISTS, 2026-09-11, and the `+` that was refused
         on 2026-09-10 is here -- capped rather than absent.

         WHAT CHANGED SINCE THAT REFUSAL, because it was the right call and
         this is not a reversal of it: the note here said a `+` would be a
         control that can never add a second row, which is still true of the
         DATABASE and no longer true of the BUTTON. rux asked for the layout
         to be finalised now and for the cap to hold the compatibility, so the
         button exists, disables at the row `trips` can store, and says why in
         its tooltip. A control that stops at a limit is honest; one that
         accepts a row and loses it on save is not.

         THE ROWS ARE THE FIELDS THAT WERE HERE. `sch-f-poref` and
         `sch-f-poamount` were a labelless pair under this heading and
         `sch-f-invnum` a single box under the next; all three moved into
         dialogs, which is why they left `readForm`'s id list. What is on the
         tab is a 32px header and one 44px row per record instead of a header
         plus 120px of form -- and it is the same shape as Payments below,
         built from the same `rowList`.

         THE SWITCH STAYS, AND OPTION 2 WAS THE TEMPTING ONE. With a list,
         "at least one row" could BE the switch (Phase 4 of
         docs/po-invoice-lists-plan.md lays out both) and the section would
         lose a control. The data refuses it: 12 of the 55 trips with a PO
         carry `po_received` with no reference and no amount -- a PO promised,
         nothing typed -- and a list alone cannot say that. Switch on with an
         empty list is exactly those 12 rows.

         WHAT THE SWITCH DOES TO A LIST is what it did to the fields: off
         hides the rows and clears them, so hidden still means empty means
         exactly what Save will write. See `syncLists`. */
      const poList = rowList();
      const invList = rowList();

      /* THE ADD ROW CARRIES THE CAP, and only the cap. With the switch off
         the whole list is hidden, so there is no longer a dead `+` sitting in
         a header to explain -- the control is simply not on screen. What is
         left is the case the cap makes: the section is full, and the tooltip
         says so in the product's words rather than the schema's. A dispatcher
         does not need to hear about `trip_pos`.

         `aria-disabled` IS NOT USED HERE. The button does nothing at that
         point, so `disabled` is the honest attribute -- it takes the control
         out of the tab order instead of letting a keyboard user land on
         something that will not respond.

         IT IS APPLIED WHERE THE ROW IS BUILT, because the body is replaced on
         every draw: a reference held from one draw is detached by the next.
         The switch redraws both lists rather than reaching for a button. */
      const capRow = ({ li, btn }, count, note) => {
        const full = count >= LIST_CAP;
        btn.disabled = full;
        btn.title = full ? note : '';
        return li;
      };
      const syncCap = () => { drawPos(); drawInvoices(); };

      /* A ROW EXISTS WHEN THERE IS SOMETHING IN IT, which is the only reading
         of one column that survives the cap. A trip with a `po_ref` or a
         `po_amount` has a PO row; one with `po_received` and neither has the
         switch on and no row, which is the state those 12 trips are in and
         the state this panel must be able to re-save unchanged.

         `?? null` ON THE AMOUNT, BECAUSE 0 IS A NUMBER. `trip.po_amount` of 0
         is falsy and would have dropped the row -- no trip carries one today,
         and a truthiness test here is the kind of thing that is true until it
         is not. */
      poPending = (trip.po_ref || (trip.po_amount ?? null) !== null)
        ? [{ ref: trip.po_ref ?? null, amount: trip.po_amount ?? null }] : [];
      invPending = trip.invoice_number ? [{ number: trip.invoice_number }] : [];

      const drawPos = () => {
        poList.body.replaceChildren();

        poPending.forEach((p, i) => {
          const much = (p.amount ?? null) === null ? '' : usd(Number(p.amount) || 0);
          const ref = p.ref || 'No reference';
          poList.body.appendChild(listRow({
            when: ref, much,
            title: ['Purchase order', ref, much || 'No amount'].join(' · '),
            edit: () => openPoDialog(i),
            removeLabel: `Remove purchase order ${ref}`,
            remove: () => { poPending.splice(i, 1); drawPos(); refreshDirty(); },
          }));
        });
        /* THE ADD ROW IS THE EMPTY STATE. An empty list used to draw "No
           purchase order recorded." and then an add button below it -- two
           rows saying one thing in a panel that is already long. The add row
           alone says both: there is nothing here, and this is how one starts. */
        poList.body.appendChild(capRow(listAddRow({
          label: 'Add purchase order', id: 'sch-f-poadd',
          onClick: () => openPoDialog(null),
        }), poPending.length, CAP_NOTE.po));
        drawSummary();
      };

      const drawInvoices = () => {
        invList.body.replaceChildren();

        invPending.forEach((v, i) => {
          const num = v.number || 'No number';
          invList.body.appendChild(listRow({
            /* NO AMOUNT COLUMN FOR AN INVOICE, and the slot is left empty
               rather than filled with the quoted price. There is no
               `invoice_amount` anywhere in the schema -- the invoice is for
               the trip's own money, and showing `quoted_price` on this row
               would be this app inventing a fact. The empty third column
               keeps the number aligned with the PO's reference above it,
               which is what makes the two sections read as one system. */
            when: num, much: '',
            title: ['Invoice', num].join(' · '),
            edit: () => openInvoiceDialog(i),
            removeLabel: `Remove invoice ${num}`,
            remove: () => { invPending.splice(i, 1); drawInvoices(); refreshDirty(); },
          }));
        });
        invList.body.appendChild(capRow(listAddRow({
          label: 'Add invoice', id: 'sch-f-invadd',
          onClick: () => openInvoiceDialog(null),
        }), invPending.length, CAP_NOTE.inv));
      };
      redrawPos = drawPos;
      redrawInvoices = drawInvoices;

      /* PAYMENTS ARE EDITABLE AS OF 2026-09-10, and they are the reason the
         rest of this tab can be honest. `deposit_amount`, `balance_paid`,
         `date_paid` and the whole of rux-ui's status ladder are all read off
         the money that came in; with no way to record a payment this panel
         could show those numbers and never change them.

         DIFFED BY `id`, NOT REPLACED. rux-ui saves this list by deleting
         every row for the trip and reinserting -- two calls, no transaction,
         so a failed insert leaves a trip with no payments at all, and row
         ids churn on every save. `trip_payments` has a real `id` (confirmed
         against the live table), and this file already updates `trip_stops`
         and `contacts` by id, so payments do the same: new rows insert,
         changed rows update, removed rows delete, and a failure touches only
         the row it was for.

         `position` STILL GOES OUT, because rux-ui orders by it and a null
         would sort unpredictably over there. It is the row's place in this
         list, renumbered on save rather than tracked as state. */
      /* ONE ROW PER PAYMENT, IN A `contained-list`. Carbon ships this exact
         shape -- `--with-action` puts a control at the row's end, and the
         `__header` carries the list's title and its own action, which is
         where the sink's every story puts one. It replaces four labelled
         boxes per receipt with a line that reads `Check · Aug 19 · $2,728`.

         THE METHOD IS A WORD AND NOT A GLYPH, for now. rux asked for icons
         and Carbon's `--with-icon` variant is built for it, but rux-ds's
         whole sprite is 63 symbols and none of them means money -- counted,
         and filed in docs/rux-ds-requests.md. Pressing `i-document` or
         `i-copy` into service would be a glyph that lies. The word costs a
         reader nothing to learn, which four near-neighbour methods --
         Check, ACH, Card, Cash are all "money arrived" -- otherwise would.

         THE LIST IS DRAWN FROM `pending`, NOT FROM THE DOM. The old version
         read its values back out of the inputs it had built; with the
         fields behind a dialog there are no inputs to read, so the array is
         the truth and the list is a render of it. That also makes the diff
         a comparison of two arrays rather than a walk over form controls. */
      const pending = (trip.trip_payments || [])
        .slice().sort((x, y) => (x.position ?? 0) - (y.position ?? 0))
        .map(p => ({ id: String(p.id), method: p.method ?? null, amount: p.amount,
                     date: p.date ?? null, ref: p.ref ?? null }));
      payPending = pending;

      /* THE SUMMARY GOES FIRST AND IT MOVES, 2026-09-10. Paid and Balance were
         two lines of a `dl` in the middle of the tab, computed once from
         `trip.trip_payments` at open. Both facts were wrong the moment a
         payment was added: the list below would say $1,500 and the readout
         above it $2,728, on the same screen, from the same rows.

         SO IT IS A RENDER, NOT A VALUE. `drawSummary` reads the pending array
         and the quoted-price INPUT rather than `trip`, and both the payment
         list's `draw` and the quoted field's `input` call it. The two numbers
         and the rows beneath them cannot disagree because there is one source.

         `big-number` IS THE COMPONENT FOR IT -- Carbon's own figure for a
         headline figure with a label, and its `__total` slot is exactly the
         "of the quoted price" half of `Paid`. With no quoted price there is no
         total to state and no balance to compute; it says so rather than
         showing a deficit against zero. */
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
        const raw = document.getElementById('sch-f-quoted')?.value;
        return raw === undefined || raw === null ? null : money(String(raw));
      };
      /* THE STATUS LADDER, MIRRORED FROM rux-ui RATHER THAN INVENTED.
         `js/core/billing-config.js:94-110`, first match wins, same order:

           overpaid          price > 0 && balance < 0
           paid_full         price > 0 && paid > 0 && balance <= 0
           po_partial        poReceived && price > 0 && poAmount < remaining
           po_received       poReceived
           deposit_received  paid > 0 && (balance > 0 || price <= 0)
           contract_signed   contractSigned
           pending           -- everything else

         THERE IS NO INVOICE RUNG. The invoice switch moves neither the status
         nor `confirmed`; it is billing paperwork, not a step toward being
         booked. Worth saying because a tab that shows three switches invites
         the assumption that all three drive the readout.

         IT IS A PREDICTION AND IT IS LABELLED AS ONE. rux-ui owns `confirmed`
         and recomputes it on every save over there, so this app shows what
         the ladder WOULD say and writes nothing -- the same rule the derived
         three have followed since the column cleanup. `confirmWhen` is the
         default four, which is byte-for-byte what the live
         `billing-workflow-v1` settings row holds (read 2026-09-10); this app
         does not fetch that row, so a change to it over there would make this
         readout stale until someone looks. Stated rather than hidden. */
      /* THE TONE ENCODES HOW FAR ALONG, NOT WHICH RUNG. Seven rungs and five
         hues on purpose: three of them mean the same thing to a dispatcher
         reading the board -- somebody has committed, the trip is on -- so
         they share `blue` rather than each taking a colour that would have to
         be learned. `purple` is the one that wants a second look, `green` is
         done, `magenta` is wrong in the customer's favour, `cool-gray` is
         nothing yet.

         A partial PO is not an error: it confirms the trip. The coverage
         shortfall was red until the 2026-09-11 composition pass; it now
         uses helper text, with this tag carrying the status colour. */
      const STATUS_LABEL = {
        overpaid: ['Overpaid', 'rux--tag--magenta'],
        paid_full: ['Paid in full', 'rux--tag--green'],
        po_partial: ['Partial PO', 'rux--tag--purple'],
        po_received: ['PO received', 'rux--tag--blue'],
        deposit_received: ['Deposit received', 'rux--tag--blue'],
        contract_signed: ['Contract signed', 'rux--tag--blue'],
        pending: ['Pending', 'rux--tag--cool-gray'],
      };
      /* OVERPAID CONFIRMS TOO, and its absence here was a bug, fixed
         2026-09-11. Every other rung above `pending` was listed, so a trip
         quoted $100 and paid $150 read `Balance -$50`, `Overpaid`, and
         `Confirmed  Not yet` -- driven live on an unsaved trip before the fix.
         A customer who has paid MORE than the quote has confirmed the trip by
         any reading of the word. `po_partial` is remapped to `po_received`
         below rather than listed, because it is the same rung with a gap. */
      const CONFIRM_WHEN = ['contract_signed', 'po_received', 'deposit_received',
                            'paid_full', 'overpaid'];
      // What to say once it IS confirmed, per rung. `po_partial` is remapped
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

      const figures = el('div', 'sch-billing-figures');
      const derived = el('div');
      const confirmWhy = el('p', 'rux--form__helper-text');
      const drawSummary = () => {
        const quoted = quotedNow();
        const paid = pending.reduce((n, p) => n + (Number(p.amount) || 0), 0);
        const price = quoted ?? 0;
        const poOn = on(document.getElementById('sch-f-poreceived'));
        /* THE PO AMOUNT IS A SUM OVER THE ROWS, 2026-09-11, where it used to
           be one field's value. With the list capped at one row the two are
           the same number; written as a sum it is already Phase 6 of
           docs/po-invoice-lists-plan.md, and the coverage line below --
           `max(0, (quoted - paid) - poAmount)` -- becomes correct for several
           POs without being touched again. */
        const poAmount = poPending.reduce((n, p) => n + (Number(p.amount) || 0), 0);
        const remaining = Math.max(0, price - paid);
        const shortfall = Math.max(0, remaining - poAmount);
        const rung = deriveStatus({
          contractSigned: on(document.getElementById('sch-f-contract')),
          poReceived: poOn, poAmount, price, paid,
        });

        /* THE COVERAGE LINE SAYS THE NUMBER, not just the word. "Partial PO"
           tells a dispatcher there is a gap; `$12,750 not authorized` tells
           them how big it is, which is what the next PO or payment has to
           close. rux-ui shows the same figure beside the same field
           (`js/panels/trip-panel.js:505-535`). */
        poCoverage.textContent = !poOn ? ''
          : price <= 0 ? 'No quoted price to cover'
          : shortfall <= 0 ? 'Covers the balance'
          : `${usd(shortfall)} uncovered. Add a PO or payment.`;

        /* TWO ROWS LEFT THIS LIST, 2026-09-10, and neither was merely
           redundant -- both could contradict the lines above them.

           `Balance paid` SAID THE OPPOSITE OF THE TWO FACTS ABOVE IT. It read
           `trip.balance_paid`, a column rux-ui computes at ITS last save,
           while Balance and Status are recomputed here on every keystroke.
           Entering a payment that cleared the trip put this on screen at
           once: `Balance $0`, `Status Paid in full`, `Balance paid Not yet`.
           Measured, not imagined. And it carried nothing new even when it
           agreed -- "is there anything left owing" is what `Balance` is.

           `Date paid` was the latest payment's date, from the same stale
           column, sitting four rows above a list that shows every payment
           WITH its date. The list is live and complete; this was one entry
           from it, as of whenever the other app last looked.

           WHAT IS LEFT IS NOT REDUNDANT. `Status` is the ladder in one word,
           `Confirmed` is the one question a dispatcher actually asks, and the
           mapping between them is not guessable -- see below for the rung
           where it surprises. */
        const [rungLabel, rungTone] = STATUS_LABEL[rung];
        const confirmRung = rung === 'po_partial' ? 'po_received' : rung;
        const confirmed = CONFIRM_WHEN.includes(confirmRung);

        /* THE HEADLINE IS THE ANSWER, NOT THE BALANCE, 2026-09-11. Balance led
           this tile and on a new trip it read "No quote" -- the largest type on
           the panel saying there is no data yet, in the slot a reader looks at
           first. Confirmation is never empty: a trip is confirmed or it is not,
           from the moment it exists, and it is the question a dispatcher
           actually brings to this tab. Balance keeps every digit it had, one
           row down beside Paid.

           "ONCE SAVED" LEFT THE WORDING. The row it was in said
           `Yes, once saved`, marking that the ladder is recomputed from the
           controls rather than read from the database. That is true of every
           value on this panel -- Balance, Paid and the coverage line are all
           recomputed on each keystroke -- so singling out this one implied the
           others were stored. The footer's Save is what says nothing is
           written yet. */
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
        /* WHICH ONE DID IT. Three separate things confirm a trip and the tab
           gave no sign which was in force, so a dispatcher had to read the
           rung tag and know the mapping. Unconfirmed, the line states the rule
           instead -- the only place in the app that says it. */
        confirmWhy.textContent = confirmed
          ? (CONFIRM_BY[confirmRung] || 'Confirmed.')
          : 'A signed contract, a PO or any payment confirms it.';
      };
      /* Billing composition revised 2026-09-11 for a quieter, shorter panel.
         Balance is the headline; Paid is a supporting definition row. This
         replaces the two stacked headlines chosen on 2026-09-10, while
         keeping their values, the status ladder and confirmation prediction.
         The summary keeps its distinct surface; the lists below now share
         the panel surface. No extra section margin above the first tile:
         the sticky tab strip already supplies that space. */
      const tile = el('div', 'rux--tile rux--layer-two sch-panel-section--bleed');
      const tileStack = el('div', 'rux--stack-vertical rux--stack-scale-5');
      tileStack.append(
        figures,
        confirmWhy,
        derived,
      );
      tile.appendChild(tileStack);

      const summary = el('div', 'rux--stack-vertical rux--stack-scale-5');
      summary.append(
        tile,
        moneyField('sch-f-quoted', 'Quoted price', trip.quoted_price),
      );
      panelBilling.appendChild(summary);

      /* `--disclosed`, NOT `--on-page`, so the four headings on this tab are
         one heading. `--on-page` renders its header at `heading-compact-01`
         (14px/600) on a filled band; `--disclosed` renders it at `label-01`
         (12px/400, text-secondary), which is character for character what
         `.sch-panel-section__title` sets for Summary, Pricing & invoice and
         Billing status. A shipped Carbon variant rather than a rule of ours,
         which is the whole reason to prefer it over restyling the header. */
      /* The layer-two header bands introduced on 2026-09-10 are removed
         from the lists in this design pass. Repeated filled blocks competed
         with the summary; headings and row boundaries now do the grouping.
         The existing disclosed variant, sizes and action slots are retained. */
      /* `size-md` MOVES THE ROWS AND NOT THE HEADER, which is why it is safe
         here. `--disclosed` pins its header to a hard `block-size: 2rem`
         (`css/rux.css:10641`) where `--on-page` reads
         `--rux-layout-size-height-local`, so the band stays 32px at every
         size and keeps matching `.sch-panel-section__head`. Measured across
         all three: header 32/32/32, rows 32/44/52 for sm/md/lg.

         md FOR THE ROWS BECAUSE THEY HOLD A TAG. A `CHK` tag is 18px inside
         what was a 32px row, leaving 7px above and below; 44px gives it room
         and gives the row and its delete button a fair click target. The
         inline density does not change with size -- 16px at all three -- so
         the bleed above still lands the rows on the same left as the fields. */
      /* THE PAYMENT LIST IS BUILT FROM THE SAME `rowList` AS THE TWO ABOVE
         IT, 2026-09-11. It shipped first and carried its own header and row
         markup; PO and Invoice would have been a second and third copy of
         both, so the three share one builder instead and this section lost
         about forty lines without changing a pixel. What is still its own is
         what is genuinely different: a method tag rather than a fixed code,
         a date in the middle column, and no switch on the header -- there is
         no milestone to gate, a receipt either exists or does not.

         THE METHOD IS A WORD AND NOT A GLYPH, for now. rux asked for icons
         and Carbon's `--with-icon` variant is built for it, but rux-ds's
         whole sprite is 63 symbols and none of them means money -- counted,
         and filed in docs/rux-ds-requests.md. Pressing `i-document` or
         `i-copy` into service would be a glyph that lies. The word costs a
         reader nothing to learn, which four near-neighbour methods --
         Check, ACH, Card, Cash are all "money arrived" -- otherwise would.

         THE LIST IS DRAWN FROM `pending`, NOT FROM THE DOM. The old version
         read its values back out of the inputs it had built; with the fields
         behind a dialog there are no inputs to read, so the array is the
         truth and the list is a render of it. That also makes the diff a
         comparison of two arrays rather than a walk over form controls. */
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
            /* THE REFERENCE IS OFF THE ROW, on the tooltip and in the dialog.
               It is a cheque number -- looked up when there is a question
               about a specific payment, not scanned down a list -- and it was
               the one field long enough to wrap the row onto a second line. */
            title: [p.method || 'Payment', when, much,
                    p.ref ? `Ref ${p.ref}` : null].filter(Boolean).join(' · '),
            edit: () => openPaymentDialog(i),
            removeLabel: `Remove ${p.method || 'payment'} of ${much}`,
            remove: () => { pending.splice(i, 1); draw(); refreshDirty(); },
          }));
        });
        /* NO CAP ON PAYMENTS: `trip_payments` is a real table with real rows,
           so the add row is never disabled here. It is still the empty state,
           the same as the two lists above. */
        payList.body.appendChild(listAddRow({
          label: 'Add payment', id: 'sch-f-payadd',
          onClick: () => openPaymentDialog(null),
        }).li);
        drawSummary();
      };
      draw();
      redrawPayments = draw;
      /* NO `section()` AROUND THE LIST, and the first attempt had one: the tab
         rendered "Payments" twice, once as the small section label and once in
         the contained-list's own `__header` two pixels below it. The header IS
         the section title -- that is what Carbon ships it for -- so the wrapper
         here exists only for the `spacing-06` above it that every other section
         gets. */
      /* A LIST BLEEDS AND ITS HELPER TEXT DOES NOT. A `contained-list` pads
         itself by `spacing-05` inside the band, so the wrapper is pulled out by
         the panel body's own `spacing-05` to land the rows on the same left as
         every field. The coverage line is NOT a list row, so it stays in the
         padded section and keeps the panel's inline margin; bleeding it too
         would run it to the panel's edges. */
      const bleed = (node) => {
        const box = el('div', 'sch-panel-section--bleed');
        box.appendChild(node);
        return box;
      };
      const listWrap = section('Payments', bleed(payList.list));

      /* THE ORDER, AND PAYMENTS MOVED TO THE END, 2026-09-10. Summary, then
         the three milestones in the order the ladder climbs -- contract, PO,
         invoice -- then the receipts.

         PAYMENTS SAT SECOND UNTIL rux MOVED IT. The argument for second was
         that the summary derives from it; the argument for last, which wins,
         is that it is the only section that GROWS. A list of eight receipts
         pushed Contract, PO and Invoice off the bottom of a 320px panel, so
         the three fixed-height sections a dispatcher fills in while booking
         sat below the one that gets longer the more the trip is paid. Last,
         it can run as long as it likes. */
      /* THE TWO LISTS BLEED AND THEIR HELPER TEXT DOES NOT. A
         `contained-list` pads itself by `spacing-05` inside the band, so the
         wrapper is pulled out by the panel body's own `spacing-05` to land
         the header text on the same left as every field -- the trick Payments
         already uses. The coverage line is NOT a list row, so it stays in the
         padded section and keeps the panel's own inline margin; bleeding it
         too would run it to the panel's edges. */
      /* EVERY SECTION IS NOW A `section()`: a head line carrying the label and
         its one control, then the list bled out beneath it. The switch used to
         ride in the contained-list's own header beside the `+`; with the label
         moved out here, all four heads are the same element, which is what
         puts the three switches on one right edge. */
      const poBody = el('div');
      poBody.append(bleed(poList.list), poCoverage);

      const poWrap = section('PO received', poBody, poSwitch);
      const invWrap = section('Invoice sent', bleed(invList.list), invoiceSwitch);
      const contractSection = section('Contract signed', contract, contractSwitch);

      /* THE RULE, NOT A HEADING, IS WHAT SEPARATES THEM. A heading over each
         group was tried first and cost about 60px of a 320px panel; the border
         costs 1. `.sch-billing-rule` also zeroes the section's own top margin
         and spends it as padding under the border -- see sch.css. */
      for (const wrap of [contractSection, poWrap, invWrap, listWrap]) {
        wrap.classList.replace('sch-panel-section', 'sch-billing-section');
        wrap.classList.add('sch-billing-rule');
      }
      panelBilling.append(
        contractSection,
        poWrap,
        invWrap,
        listWrap,
      );

      /* WHAT A SWITCH DOES TO ITS FIELDS: hides the block, clears the values,
         and disables the inputs. `clear` is false on the first pass so a row
         already holding a value does not arm Save merely by being opened --
         the invariant says none should, and if one ever does it is a fact to
         see rather than to erase.

         `disabled` STAYS ALONGSIDE `hidden` rather than being replaced by it.
         It costs nothing, it keeps the state the tests here already check,
         and it means a field is never typeable in the one frame between the
         toggle firing and the block being hidden. */
      const GATES = [
        ['sch-f-contract', ['sch-f-contractnote'], contract],
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
      /* A LIST IS GATED BY ITS BODY, NOT BY ITS SECTION, 2026-09-11. The
         switch is IN the header, so hiding the whole list would hide the
         control that unhides it. The `<ul>` goes instead, which is also what
         makes the closed state cost 32px: a header line reading
         "Purchase order   Off".

         `[hidden]` NEEDS A RULE HERE FOR THE SAME REASON THE FIELDS DID. The
         body is a flex/grid descendant of a Carbon component, so the user
         agent's `[hidden] { display: none }` is not safe to rely on -- see
         `.sch-milestone-fields[hidden]`, which was written after the fields
         stayed on screen with nothing reporting an error. `.sch-list-body`
         carries its own.

         CLEARING IS THE SAME BARGAIN AS THE FIELDS'. Off empties the array,
         so a hidden list holds nothing and `EDITS` writes nulls that match
         what is on screen. `clear` is false on the first pass so opening a
         trip that breaks the invariant -- a `po_ref` with `po_received`
         false, which 0 of 779 rows do -- shows the row rather than silently
         arming Save to delete it. */
      const syncLists = (clear) => {
        for (const [toggleId, box, pending, redraw] of [
          ['sch-f-poreceived', poList, poPending, drawPos],
          ['sch-f-invoice', invList, invPending, drawInvoices]]) {
          const open = on(document.getElementById(toggleId));
          box.body.hidden = !open;
          if (!open && clear && pending.length) { pending.length = 0; redraw(); }
        }
        syncCap();
      };

      syncGates(false);
      syncLists(false);
      /* DELEGATED ON THE TAB, NOT BOUND TO THE SWITCH. `setToggle` dispatches
         `rux:toggle` on the `.rux--toggle` BOX (`js/form-controls.js:94`),
         while the id is on the `__button` INSIDE it -- so a listener on the
         button never sees the event, because bubbling goes up and the button
         is a descendant of the dispatcher. The first version bound to the
         button and silently did nothing: the patch was right, because
         `readForm` re-reads `aria-checked` on demand, but the fields stayed
         enabled and the coverage line went stale. `panelBilling` already
         listens for the same event to drive `refreshDirty`, which is what
         made the difference visible. */
      panelBilling.addEventListener('rux:toggle', () => {
        syncGates(true);
        syncLists(true);
        drawSummary();
      });
      /* THE QUOTED PRICE IS THE ONE FIELD LEFT THAT FEEDS THE TOP OF THE TAB,
         so typing in it redraws the figures. `input`, not `change`: the
         numbers should follow the keystroke. The PO amount was the second
         entry in this loop until it moved into a dialog -- it now redraws
         through `drawPos`, which is the same arrangement the payment list has
         always had. */
      document.getElementById('sch-f-quoted')?.addEventListener('input', drawSummary);
      drawPos();
      drawInvoices();
      drawSummary();
    }

    // FLEET IS THE BUS AND WHO IS ON IT, and nothing else -- the leg's own
    // dates and times are in Details, above the editor they belong to. Both
    // tabs carried them for one commit, which read as a bug rather than a
    // convenience.
    panelFleet.replaceChildren();
    if (creating) {
      const onBus = createBusId ? panelIndex.buses.get(createBusId) : null;
      panelFleet.appendChild(onBus
        ? def([['Bus', `${onBus.number}`], ['Drivers', 'None yet']])
        : el('p', 'sch-panel-hint',
            'A new trip starts with no bus. Save it and it lands in the Unassigned row, where it can be dragged onto one.'));
    } else panelFleet.appendChild(def([
      ['Bus', bus ? `${bus.number}${(leg.count || 1) > 1 ? ` — ${(assign?.position ?? 0) + 1} of ${leg.count}` : ''}` : 'Not assigned'],
      ['Drivers', names.join(', ') || (assign ? 'None assigned' : null)],
      ['Needs', reqs],
    ]));

    // The module claims a picker on load; these were built just now, so it is
    // asked again for this subtree.
    /* EVERY TAB, NOT JUST DETAILS, corrected 2026-09-10. This claimed
       `panelDetails` alone, so a date picker built into any other tab was
       never claimed at all -- and `date-picker.js` is the only thing that
       DETACHES a calendar, which is how a closed calendar is expressed
       (Carbon ships no closed state; see that module's header). An
       unclaimed picker therefore renders its calendar open, inline, pushing
       the form down, and no click closes it.

       THAT IS THE WHOLE OF THE `Date paid` DEFECT, and this session first
       filed it against rux-ds as a single-variant claim bug on the strength
       of the symptom -- the Billing calendar sitting in the DOM while the
       Details ones were detached. Both facts have one cause and it is here:
       the module was never asked to look at that panel. Nothing upstream
       needed fixing. Scoped to the panel body so all four tabs are covered
       and a fifth cannot repeat it. */
    window.Rux?.datePicker?.init?.(panelBody);

    /* A TABPANEL IS A TAB STOP ONLY WHEN NOTHING INSIDE IT IS. That is the
       ARIA rule, and Details breaks it: it holds 16 focusable controls, so its
       own `tabindex="0"` made the panel a redundant stop and drew a focus ring
       around the whole form -- which is what rux saw. Fleet is read-only with
       nothing focusable in it, so it KEEPS the attribute: without it a
       keyboard user could reach the tab and never reach what it reveals.
       Decided per panel, from its contents, rather than written into the
       markup once and left to rot as the contents change. */
    /* BILLING JOINED THIS LIST 2026-09-10, having been left out of it since
       the rule was written. It kept the static `tabindex="0"` from
       index.html while holding nine focusable controls, so it was exactly
       the redundant tab stop the note below describes -- one Tab landed on
       the panel itself and drew a focus ring round the whole tab, which is
       what rux saw as the section being selectable. The loop decides this
       per panel from its contents; Billing simply was not being asked. */
    for (const tp of [panelDetails, panelBilling, panelFleet, panelSchedule]) {
      const focusable = tp.querySelector('input, select, textarea, button, a[href], [tabindex]:not([tabindex="-1"])');
      if (focusable) tp.removeAttribute('tabindex');
      else tp.setAttribute('tabindex', '0');
    }

    document.getElementById('sch-f-type')?.addEventListener('change', e => {
      const split = e.target.value === SPLIT;
      returnDates.hidden = !split;
      setOutLabels(split);
      refreshDirty();
    });

    refreshDirty();

    panelOpener = bar;
    /* THE WHOLE SPAN, NOT THE FIRST DAY. The bar carries both numbers and the
       roster brackets all of them; reading only `--sch-start` here is what made
       a five-day trip light one column. */
    markAvailDays(
      bar ? Number(bar.style.getPropertyValue('--sch-start')) : null,
      bar ? Number(bar.style.getPropertyValue('--sch-span')) : 1,
    );
    const wasOpen = !panelEl.hidden;
    panelEl.hidden = false;
    if (tripEl) tripEl.hidden = false;
    window.Rux?.schedule?.fit?.();
    /* THE ROSTER ONLY STEPS ASIDE ON A PHONE, NARROWED 2026-09-11.

       IT USED TO YIELD WHENEVER THE BOARD WAS `crowded` -- `sch.js`'s name for
       the day columns hitting their 8.5rem floor -- which is true at 1440 with
       both companions open, so opening a trip on an ordinary desktop took the
       roster away. rux: "id rather the assigments grid not be force closed".
       A control that closes itself reads as a control that broke, and nothing
       said why. On a desktop the cost of keeping it is the board scrolling,
       which this board is built to do: `.sch-grid` is `max-content` with a
       sticky bus column precisely so seven days can total more than the pane.

       BELOW md IT STILL YIELDS, AND THERE IT IS NOT A PREFERENCE. sch.css puts
       both companions on top of the board at that width -- the editor through
       Carbon's own `position: fixed`, the roster by hand beside it -- so they
       are full-width overlays and one does not sit next to the other, it
       covers it. The stacking comment there says as much: the z-index "only
       decides what happens during the frame between", because this line is
       what stops both being up at once.

       STILL ONLY ON THE WAY IN. Clicking a second bar while the editor is open
       calls this again, and re-taking the yield would undo a `Drivers` press
       made in between. */
    if (!wasOpen && availOn && !availYielded && matchMedia('(max-width: 41.98rem)').matches) {
      availYielded = true;
      placeAvailability();
    }
    document.getElementById('sch-panel-close')?.focus();
  }

  /* ── DRIVER AVAILABILITY ───────────────────────────────────────────────────
     LEFT OF THE BOARD, decided 2026-09-06 after trying it docked below the
     schedule and to its right as well. The dock aligned Thursday under
     Thursday and cost 240px of height; the right-hand slot sat between the
     board and the panel describing it, which is what settled it. Both are
     gone. The marked day column is what answers "who is free THEN" now that
     the columns no longer line up.

     BUSY IS DERIVED, NOT STORED. There is no per-driver-per-day row anywhere:
     a driver is busy on a day because an assignment they are on covers it, so
     this walks the same legs the bars are placed from and marks the days each
     one spans. That means it is exactly as correct as the board above it, and
     wrong in the same way if the board is.

     TIME OFF IS STORED, in `driver_time_off`, and beats busy in the cell --
     a driver both assigned and away is a conflict worth seeing as away. */
  const asideSlot = document.getElementById('sch-aside');
  const availEl = document.getElementById('sch-avail');
  const availGrid = document.getElementById('sch-avail-grid');
  const availToggle = document.getElementById('sch-avail-toggle');
  let availOn = false;
  /* THE ROSTER YIELDS TO THE EDITOR WHEN THE WEEK CANNOT AFFORD BOTH, added
     2026-09-08. Measured at 1440x950: the board is 1344, the roster takes 331,
     the editor 320, two gaps 32, and seven days need 984 -- 1667 against 1344,
     so the week runs 323px short and Saturday and Sunday scroll off. A charter
     board that hides the weekend is the one failure this layout cannot have.
     Either companion ALONE fits: 997 of 997 with the roster, 1008 of 984 with
     the editor. Both never do, at any density -- xs rows and an xs panel
     together return 120 of the 323.

     SEPARATE FROM `availOn`, WHICH IS WHAT RUX ASKED FOR. Yielding is the
     IT ONLY YIELDS ON A PHONE NOW, 2026-09-11. The roster used to step aside
     whenever the editor opened onto a CROWDED board -- which was true at 1440,
     a width people work at all day -- and rux asked for it to stay. Below the
     md breakpoint it still steps aside, because there both panes are full-width
     overlays and one would simply cover the other. `openPanel` carries the
     reasoning. */
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

    /* THE ROSTER'S DAY RULES ARE PURE CSS, unlike the board's. Its cells are
       real grid cells with a column each, so the rule is simply an inline-start
       border on every cell but the first and `data-day` already says which that
       is; nothing has to be computed here. The board has one element spanning
       all seven days and no edges to hang a border on, which is why only it
       needs stops painted. */

    const head = el('div', 'sch-avail__days');
    head.appendChild(el('div', 'sch-avail__day sch-avail__day--head', 'Driver'));
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart.getTime() + i * DAY);
      /* TWO LETTERS, 2026-09-08, AND IT IS WHAT LETS THE COLUMN BE 24px. This
         has been one letter (`narrow`, until 2026-09-07) and three (`short`,
         after), and the case for three was never about three: it was that one
         letter cannot tell Tuesday from Thursday or Saturday from Sunday --
         four of the seven columns unreadable in the pane whose job is answering
         "who is free THEN". Two letters answer that in full. The 2026-09-07
         entry ruled single letters out and did not weigh the middle.

         MEASURED AT label-01, 12px/600 with 0.32px of tracking: "Wed" is 26.0
         and will not fit a 24px cell, which is why `--sch-day-track` held at sm
         and the cells were 32x24 rather than square. "We" is 18.4, the widest
         of the seven, and clears 24 with 5.6 to spare. The type is unchanged --
         the day cells stay label-01 where "Driver" beside them keeps the table
         header's 14px, for the reason the entry above this one gives.

         SLICED FROM `short`, NOT A HAND-WRITTEN TABLE, so a locale that
         abbreviates its own way gets its own first two characters rather than
         English ones. Spread and not `.slice(2)`: the unit is a code point. */
      const short = d.toLocaleDateString(undefined, { weekday: 'short' });
      const cell = el('div', 'sch-avail__day', [...short].slice(0, 2).join(''));
      // The band dims its weekend TEXT and draws no vertical line, exactly as
      // the board's day header does. The boundary rule is the body's alone.
      if (isWeekend(d)) cell.classList.add('sch-avail__day--weekend');
      cell.dataset.day = String(i);
      head.appendChild(cell);
    }
    availGrid.appendChild(head);

    for (const row of rows) {
      const r = el('div', 'sch-avail__row');
      /* THE FULL NAME GOES ON THE CELL'S TITLE, 2026-09-11, AND IT IS NOT A
         TOOLTIP REPEATING WHAT IS ON SCREEN. This cell renders `short_name`
         when there is one -- "Cortinas", "All Valley" -- so the long form is
         information the column is actively dropping, not a restatement of it.
         The busy cell beside it has carried `driver.name` for exactly this
         reason since it was written.

         IT ANSWERS THE DUPLICATE NAMES docs/log.md has carried since
         2026-09-07: "two Bennys, two Ernestos ... make the roster ambiguous in
         the one pane meant to resolve it". Both pairs are in today's fleet, the
         full names are already fetched, and nothing was using them.

         AND THE COLUMN IS NARROWER THAN IT WAS -- 96px against 152 since the
         day cells went to 32 -- which is the same argument `.sch-row-head`
         makes on the board, where capacity and type moved to the title so the
         column could be narrow and a hover could still answer which bus it is.
         Today's widest name clears 96 by 7px; the next longer one will not, and
         then this is what makes the ellipsis recoverable.

         ONLY WHEN IT ADDS SOMETHING. Where `short_name` and `name` are the same
         string a title would duplicate the text under it, which is noise on
         screen and, in some readers, the name announced twice. Same shape as
         the `if (day.off || busy)` guard on the cell beside it.

         WHAT IT DOES NOT DO, SO NOBODY READS MORE INTO IT: `title` is hover
         only. On a non-interactive div it is not keyboard reachable and not
         reliably announced, so this makes an ambiguous or clipped name
         RECOVERABLE by mouse and does not make the column accessible. Telling
         two Bennys apart without a mouse needs something in the cell itself,
         which is a design change and not this. */
      const shown = row.driver.short_name || row.driver.name || 'Driver';
      const nameEl = el('div', 'sch-avail__name', shown);
      if (row.driver.name && row.driver.name !== shown) nameEl.title = row.driver.name;
      r.appendChild(nameEl);
      row.days.forEach((day, i) => {
        const busy = day.trips.length > 0;
        const cls = day.off ? 'sch-avail__cell sch-avail__cell--off'
          : busy ? 'sch-avail__cell sch-avail__cell--busy'
          : 'sch-avail__cell';
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

  // The selected trip's day, marked down the column so "who is free THEN" does
  // not need counting. Null clears it.
  /* THE SELECTED TRIP'S DAYS, TINTED, 2026-09-11. This has been three things in
     one day and the history is the argument. It drew a four-sided box on every
     cell of one column -- forty outlined squares, which rux called messy -- and
     it only ever marked the FIRST day, so a five-day trip lit one column of
     five. Then it became a bracket around the whole span, and rux did not like
     that either.

     WHAT THE PANE IS FOR DECIDED IT. The question here is "who is free on this
     day", so the eye is hunting the cells in that column that are EMPTY. A
     tint lands on exactly those: a busy cell paints
     `--rux-tag-background-blue` and a day-off cell `--rux-tag-background-red`
     through the `background` SHORTHAND, which resets what is under it, so the
     tint shows on the free cells and nowhere else. The marking and the answer
     are the same pixels.

     `--rux-layer-selected` IS CARBON'S OWN TOKEN FOR THIS STATE rather than a
     step chosen by eye, and it is what a selected row takes in Carbon's table.

     NO LINES AT ALL NOW. The header keeps its underline, which says which days
     without drawing on the body; the day rules already mark every column edge,
     so the tint has boundaries without adding any. */
  function markAvailDays(start, span) {
    for (const c of availGrid.querySelectorAll('.sch-avail__cell--on-day, .sch-avail__day--on-day')) {
      c.classList.remove('sch-avail__cell--on-day', 'sch-avail__day--on-day');
    }
    if (start == null) return;
    const end = start + Math.max(1, span || 1) - 1;
    for (let i = start; i <= end && i < 7; i++) {
      for (const d of availGrid.querySelectorAll(`.sch-avail__day[data-day="${i}"]`)) d.classList.add('sch-avail__day--on-day');
      for (const c of availGrid.querySelectorAll(`.sch-avail__cell[data-day="${i}"]`)) c.classList.add('sch-avail__cell--on-day');
    }
  }

  const currentTripDay = () => {
    const bar = document.querySelector('.sch-bar[aria-pressed="true"]');
    if (!bar) return null;
    const start = Number(bar.style.getPropertyValue('--sch-start'));
    const span = Number(bar.style.getPropertyValue('--sch-span'));
    return Number.isFinite(start) ? { start, span: Number.isFinite(span) ? span : 1 } : null;
  };

  function placeAvailability() {
    /* THE TOGGLE REPORTS WHAT IS ON SCREEN, NOT WHAT WAS WANTED. It was written
       the other way first -- `aria-pressed` from `availOn` -- so a yielded
       roster left a lit button with nothing behind it, and a press flipped the
       invisible want to false instead of bringing the roster back: pressed,
       and still nothing. That is a lie to anyone reading the state and a dead
       control to anyone using it, so `shown` drives both. `availOn` stays the
       thing that survives the editor; it is no longer the thing announced. */
    const shown = availOn && !availYielded;
    if (asideSlot) {
      asideSlot.hidden = !shown;
      if (shown) asideSlot.appendChild(availEl);
    }
    availEl.hidden = !shown;
    availToggle.setAttribute('aria-pressed', String(shown));
    /* AND IT HAS TO LOOK PRESSED. `aria-pressed` was the only thing saying so,
       and Carbon compiles no `[aria-pressed]` styling -- zero rules in rux.css
       -- so the button looked identical on and off. `rux--btn--selected` is
       Carbon's own compiled state for exactly this and needs no rule of ours. */
    availToggle.classList.toggle('rux--btn--selected', shown);
    /* AND SO DOES THE MENU ROW, which is the same control at a narrow width.
       It is kept in step here rather than where it is pressed, for the reason
       the note above gives: what is announced is what is ON SCREEN, and only
       this function knows that -- a yield by the editor changes it without
       anyone pressing anything. */
    const availItem = document.getElementById('sch-menu-drivers');
    if (availItem) {
      availItem.setAttribute('aria-checked', String(shown));
      const slot = availItem.querySelector('.rux--menu-item__selection-icon');
      if (slot) slot.replaceChildren(...(shown ? [svgUse('#i-checkmark', '16', '0 0 20 20')] : []));
    }
    window.Rux?.schedule?.fit?.();
  }

  /* The padding used to be transitioned and a second fit was needed when it
     settled. It is not any more -- the transition stopped the padding
     applying at all -- so the fit inside openPanel measures the final width
     and this listener has nothing left to wait for. */

  /* THE PRESS ACTS ON WHAT IS ON SCREEN. Off-screen for either reason -- never
     asked for, or yielded to the editor -- a press means SHOW IT, which clears
     both. On screen, a press means hide it. Overruling the budget this way
     holds, because the yield is only ever taken as the editor OPENS. */
  availToggle?.addEventListener('click', () => {
    if (availOn && !availYielded) { availOn = false; }
    else { availOn = true; availYielded = false; }
    placeAvailability();
  });

  /* ── VIEW OPTIONS ─────────────────────────────────────────────────────────
     WHAT IS HERE AND WHAT IS NOT. `screen-inventory.md` section 7 lists four
     homeless options: time-aligned, start on Sunday, two weeks, and the bar-row
     toggles. Two of them are built below. Time-aligned and two-week are NOT:
     this grid places by DAY and fetches one week, so a control for either would
     be a switch attached to nothing -- worse than its absence, because it
     promises a mode that does not exist.

     THE BAR ROWS ARE THE USEFUL HALF. A bar reserves five lines whatever it
     holds, and the requirements line is empty on nearly every trip -- 16px of
     every 88px bar spent on nothing. Turning a row off REMOVES it rather than
     blanking it: `--sch-bar-rows` is the count, so the bar shrinks and the row
     with it, and more buses fit on screen.

     LOCAL, AND FORGIVING. `screen-inventory.md` says these preferences stay in
     `localStorage` and are read with a try-catch; a browser that refuses
     storage gets the defaults and no error. */
  const VIEW_ROWS = ['client', 'time', 'reqs', 'drivers'];
  const view = { client: true, time: true, reqs: true, drivers: true, sunday: false };
  const VIEW_KEY = 'rux-scheduler.view';

  try {
    const saved = JSON.parse(localStorage.getItem(VIEW_KEY) || '{}');
    for (const k of [...VIEW_ROWS, 'sunday']) if (typeof saved[k] === 'boolean') view[k] = saved[k];
  } catch { /* no storage, or nothing worth reading: the defaults stand */ }
  // BEFORE `cursor` IS FIRST COMPUTED, further down: `mondayOf` reads this, and
  // a saved Sunday preference has to be in force for the very first week drawn,
  // not from the first time the menu is opened.
  weekStartsSunday = view.sunday;

  const viewMenu = document.getElementById('sch-view-menu');
  const viewTrigger = document.getElementById('sch-view-trigger');

  function applyView() {
    weekStartsSunday = view.sunday;
    for (const r of VIEW_ROWS) schEl.classList.toggle(`sch--no-${r}`, !view[r]);
    // One for the destination, which never goes, plus whatever is left on.
    schEl.style.setProperty('--sch-bar-rows', String(1 + VIEW_ROWS.filter(r => view[r]).length));
    for (const item of viewMenu?.querySelectorAll('[role="menuitemcheckbox"]') || []) {
      const key = item.dataset.row || item.dataset.view;
      /* THE ROSTER ROW IS A CHECKBOX IN THIS MENU AND IS NOT A VIEW OPTION.
         It carries `data-act` instead, and without this guard `view[undefined]`
         reads `undefined` and would silently uncheck it every time any other
         option changed. `placeAvailability` owns its state. */
      if (!key) continue;
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
    // Anchored to the button rather than to a pointer, which is the only way
    // this differs from the two context menus: same placement arithmetic, a
    // rect's corner standing in for the click.
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


  /* CLOSING FROM THE GRID'S OWN HEAD. The toolbar toggle still turns it on and
     still reports state through `aria-pressed`; this is the second way to turn
     it OFF, next to the thing being turned off. Focus goes back to the toggle,
     because that is where the control now is and leaving it on a button that
     has just been hidden strands a keyboard user. */
  document.getElementById('sch-avail-close')?.addEventListener('click', () => {
    availOn = false;
    placeAvailability();
    availToggle?.focus();
  });

  // DIRTY IS COMPUTED, NOT TRACKED. Every input event re-reads the form and
  // compares it against the values the panel opened with, so typing a change
  // and typing it back out again disables Save rather than leaving it armed.
  /* A PICKED OPTION IS RESOLVED BACK TO ITS ROW, and a typed one is not.
     `<datalist>` has no value/label pair -- the option's value IS what lands in
     the field -- so the only way to know which contact was chosen is to match
     the string `contactLabel` built. A name typed freehand matches nothing and
     clears the id, which is correct: it is not a contact until it is one, and
     the save writes no link for it.

     SUGGESTS, NEVER LOCKS. Choosing a booking contact fills organisation,
     phone and email and leaves all three editable -- 13 trips have a customer
     that differs from their contact's client, so overwriting has to stay
     cheap. */
  panelDetails?.addEventListener('input', e => {
    const t = e.target;
    if (!t || t.tagName !== 'INPUT' || !t.getAttribute('list')) return;
    const hit = (panelIndex.contacts || []).find(c => contactLabel(c) === t.value);
    if (hit) t.dataset.contactId = hit.id; else delete t.dataset.contactId;
    if (!hit) return;
    if (t.id === 'sch-f-cfind') {
      const put = (id, v) => { const e2 = document.getElementById(id); if (e2) e2.value = v ?? ''; };
      const suggest = (id, v) => { const e2 = document.getElementById(id); if (e2 && !e2.value) e2.value = v ?? ''; };
      /* PHONE AND EMAIL ARE REPLACED; ORGANIZATION IS ONLY SUGGESTED. The
         first version suggested all three and it was wrong on screen within a
         minute: picking Adan Molina left Louise Reece's phone and email
         sitting under his name, because "only fill what is empty" treats the
         PREVIOUS contact's data as though someone had typed it. They are not
         the same thing. A phone belongs to the person, so choosing a different
         person replaces it.

         ORGANIZATION IS THE ONE THAT STAYS A SUGGESTION, and for the reason
         the agency case gives: it is a TRIP column, 13 trips have one that
         differs from their contact's, and an agency booking for a school must
         not stamp itself over the school. Empty, it fills; filled, it stands. */
      put('sch-f-cphone', hit.phone);
      put('sch-f-cemail', hit.email);
      suggest('sch-f-customer', hit.client);
    } else if (/^sch-f-d\d$/.test(t.id)) {
      const ph = document.getElementById(`sch-f-dphone${t.id.slice(-1)}`);
      if (ph && !ph.value) ph.value = hit.phone ?? '';
    }
  });

  panelDetails?.addEventListener('input', refreshDirty);
  panelDetails?.addEventListener('change', refreshDirty);
  // The add button reveals a row rather than changing a value, so it fires
  // neither input nor change; without this a contact chosen in the new row
  // arms Save but the row appearing does not, which reads as a dead control.
  panelDetails?.addEventListener('click', e => {
    if (e.target?.closest?.('#sch-f-dadd')) refreshDirty();
  });
  /* BILLING IS A SECOND TAB AND NEEDED SAYING SO. These were on `panelDetails`
     alone, so every Billing field was dead to Save: typing a quoted price left
     the button grey and the edit was simply lost. Found by driving it.

     `rux:toggle` IS THE THIRD EVENT, and it is not optional. A toggle is a
     <button>, so it fires neither `input` nor `change` -- `form-controls.js`
     announces itself with a custom event instead, and that is the only signal
     that a status moved. */
  panelBilling?.addEventListener('input', refreshDirty);
  panelBilling?.addEventListener('change', refreshDirty);
  panelBilling?.addEventListener('rux:toggle', refreshDirty);

  /* RESET REBUILDS RATHER THAN UNDOES. Every field is written from `trip` on
     the way in, so replaying `openPanel` with the arguments that opened it
     restores all of them at once -- including the ones a field-by-field undo
     would have to know about separately: the type-dependent date labels, the
     return pair's hidden state, the day-of rows that `Add another contact`
     appended, the disabled schedule inputs. It also re-runs `refreshDirty`,
     so the bar disarms itself the moment there is nothing left to discard.

     NO CONFIRM ON IT, which is a judgement and not an oversight: what it
     discards is unsaved typing in a panel that already discards the same
     thing when closed, and the button is dead unless there IS something to
     discard. A confirm on the smaller of two ways to lose the same edits
     would be theatre. */
  panelReset?.addEventListener('click', () => {
    if (!panelArgs) return;
    openPanel(panelArgs.bar, panelArgs.draft);
  });

  /* THE BUTTON ASKS; THE MODAL DECIDES. This opens `sch-cancel-modal` and
     stops -- the write lives on that dialog's own confirm, which is why
     this can sit beside Save at all. It reads `editing.id` rather than
     closing over a trip, so it is right for whichever trip the panel is
     showing now and not whichever one it was showing when it was wired. */
  panelCancel?.addEventListener('click', () => {
    if (editing?.id) openCancelModal(editing.id);
  });

  panelSave?.addEventListener('click', async () => {
    if (!editing) return;
    const patch = patchOf();
    if (!editing.creating && (!patch || !Object.keys(patch).length)) return;
    const id = editing.id;
    const creating = editing.creating;
    panelSave.disabled = true;
    toast('info', creating ? 'Creating the trip…' : 'Saving the trip…');
    try {
      // CREATE WRITES EVERY FIELD, not the diff: there is no row to diff
      // against. `bus_count` is set to 1 rather than left null, because it is
      // null on none of the 743 rows and `legsOf` would only paper over it.
      /* A NULL FORM MUST NEVER BECOME AN INSERT. `readForm` returns null when
         one id in its list is missing, and `{ ...null }` is `{}` -- so a
         missing field used to turn "create this trip" into
         `{ bus_count: 1 }`: a row with no destination and no start date, which
         `legsOf` draws no leg for and nobody could ever find. That is exactly
         what a hidden Billing tab caused until today.

         The fields are all present now, so this cannot happen; the guard is
         here because the last one was invisible until someone read the spread,
         and the next field added to `readForm` deserves to fail loudly. */
      const form = creating ? readForm() : null;
      if (creating && !form) throw new Error('The form is not complete — a field is missing from the panel.');
      /* `confirmed: false` IS SET ONCE, AT INSERT, and only here. The form
         stopped writing that column on 2026-09-10 because rux-ui derives it
         -- but an INSERT that omits it leans on a database default nothing
         in this repo states, and the column's own history says it is never
         null. Getting it wrong the other way is not cosmetic: `confirmed`
         is false on 274 trips and it COLOURS THE BAR, so a new trip born
         `true` would read as agreed with the customer when nobody has
         agreed anything.

         IT IS NOT A SECOND WRITER RETURNING. rux-ui's rule derives
         `pending` for a trip with no contract, no PO and no payment -- which
         is every trip at the instant it is created -- so this writes the
         value that derivation would produce, once, and never touches it
         again. */
      const row = creating ? { ...form, bus_count: 1, confirmed: false } : patch;
      const wantBus = creating ? createBusId : null;
      /* TWO WRITES WHEN A CELL ASKED FOR A BUS, and they cannot be one:
         the assignment needs the trip's id, which only exists after the
         insert. `.select().single()` is what returns it.

         IF THE SECOND WRITE FAILS THE FIRST STANDS, and that is the honest
         outcome rather than a silent rollback this client cannot do: the trip
         exists, it simply has no bus, so it appears in the Unassigned row
         where it can be dragged onto one. The message says exactly that
         instead of claiming the whole thing failed. */
      /* THE TRIP PATCH CAN BE EMPTY WHILE THERE IS STILL WORK. Editing only a
         time leaves `patch` with no keys, and `trips.update({})` is a request
         that changes nothing and may error on an empty body, so it is skipped
         rather than sent. */
      const stopWork = creating ? [] : stopsPatch();
      const tripWork = creating || Object.keys(row || {}).length > 0;
      const { data: made, error } = tripWork
        ? await withTimeout((creating
            ? client.from('trips').insert(row).select('id').single()
            : client.from('trips').update(row).eq('id', id)).then(r => r))
        : { data: null, error: null };
      if (error) throw new Error(error.message);

      /* THE STOPS GO SECOND AND ONE ROW AT A TIME. There are at most two, they
         are separate rows with separate ids, and Supabase has no multi-row
         update by differing values -- an upsert would need every column of
         both rows, which would write back stale copies of the itinerary
         columns this form never showed.

         IF A STOP WRITE FAILS THE TRIP WRITE STANDS, the same honest outcome
         the assignment write below already takes: the trip is saved, the time
         is not, and the message says which rather than claiming everything
         failed. */
      /* THE CONTACT IS A THIRD WRITE and goes last, after the trip and before
         nothing. Its own row, its own table, and a failure here leaves the
         trip saved -- said plainly rather than reported as a whole-save
         failure, which is the rule the stop write and the assignment write
         below both already follow. */
      /* THE FIRST STOPS, WRITTEN ONLY ON CREATE. A pickup row carries the
         location, the yard departure and the spot; a return row carries the
         arrival. Neither is written unless something was typed into it --
         a trip saved with the Schedule left blank gets no stops, which is what
         687 of the existing 751 trips look like.

         POSITION AND LEG ARE NOT GUESSES HERE. The trip is new, so there is
         nothing to order against: outbound, 0 and 1. On an existing trip this
         same arithmetic would be a guess, which is why `stopsPatch` refuses it
         there. */
      if (creating && made?.id) {
        const v = id => document.getElementById(id)?.value.trim() || null;
        const where = v('sch-f-pickup'), dep = v('sch-f-depart'), spot = v('sch-f-spot');
        const back = v('sch-f-return');
        const rows = [];
        if (where || dep || spot) {
          rows.push({ trip_id: made.id, leg: 'outbound', position: 0, type: 'pickup',
                      name: where, depart_prev: dep, spot });
        }
        if (back) {
          rows.push({ trip_id: made.id, leg: 'outbound', position: rows.length, type: 'return',
                      arrive: back });
        }
        if (rows.length) {
          const { error: stErr } = await withTimeout(client.from('trip_stops').insert(rows).then(r => r));
          if (stErr) throw new Error(`The trip was created, but its schedule was not: ${stErr.message}`);
        }
      }

      const cWork = creating ? null : contactPatch();
      if (cWork) {
        const { error: cErr } = await withTimeout(
          client.from('contacts').update(cWork.patch).eq('id', cWork.id).then(r => r));
        if (cErr) throw new Error(`The trip saved, but the customer did not: ${cErr.message}`);
      }

      /* PAYMENTS, THEN THE AGGREGATE THEY ADD UP TO. `deposit_amount` is not
         a deposit despite its name -- rux-ui writes the SUM of the payment
         rows into it and reads it back as "paid" when deriving a trip's
         billing status (`normalizeRecord` in its billing-config.js). So
         writing payment rows without updating this column would leave the
         other app deriving from a stale total: money recorded here, and a
         status over there that never moved.

         IT IS WRITTEN AS A SECOND UPDATE rather than folded into the trip
         patch above, because its value is not known until the rows are.
         `|| null` matches what rux-ui stores for an empty list. */
      /* THE TRIP ID IS `made.id` ON CREATE and `id` on edit, because `id` is
         `editing.id` and a trip being created has none until the INSERT above
         comes back. Every payment write below hangs off this, which is the
         whole of what it took to make payments work on a new trip. */
      const payTripId = made?.id ?? id;
      const payPatch = payTripId ? paymentsPatch() : null;
      if (payPatch?.work) {
        for (const p of payPatch.inserts) {
          const { error: piErr } = await withTimeout(
            client.from('trip_payments').insert({ trip_id: payTripId, ...p }).then(r => r));
          if (piErr) throw piErr;
        }
        for (const u of payPatch.updates) {
          const { error: puErr } = await withTimeout(
            client.from('trip_payments').update(u.patch).eq('id', u.id).then(r => r));
          if (puErr) throw puErr;
        }
        for (const delId of payPatch.deletes) {
          const { error: pdErr } = await withTimeout(
            client.from('trip_payments').delete().eq('id', delId).then(r => r));
          if (pdErr) throw pdErr;
        }
        const { error: daErr } = await withTimeout(
          client.from('trips').update({ deposit_amount: payPatch.paid || null }).eq('id', payTripId).then(r => r));
        if (daErr) throw daErr;
      }

      for (const w of stopWork) {
        const { error: sErr } = await withTimeout(
          client.from('trip_stops').update(w.patch).eq('id', w.id).then(r => r));
        if (sErr) throw new Error(`The trip saved, but the schedule did not: ${sErr.message}`);
      }
      if (wantBus && made?.id) {
        const { error: aErr } = await withTimeout(client.from('trip_assignments')
          .insert({ trip_id: made.id, bus_id: wantBus, leg: 'outbound', position: 0 }).then(r => r));
        if (aErr) {
          await show();
          toast('warning', 'The trip was created without its bus.',
            `It is in the Unassigned row and can be dragged onto one. ${aErr.message}`);
          return;
        }
      }
      // READ IT BACK rather than trusting the write, as the drag does. The
      // render replaces every bar, so the panel closes with it.
      await show();
      if (creating) toast('success', wantBus ? 'Trip created on its bus.' : 'Trip created. It is in the Unassigned row until it has a bus.');
      else toast('success', `Saved ${Object.keys(patch).length} change${Object.keys(patch).length === 1 ? '' : 's'}.`);
    } catch (e) {
      toast('error', `The trip was not ${creating ? 'created' : 'saved'}. ${e.message}`);
      panelSave.disabled = false;
    }
  });

  /* ── RIGHT-CLICK AN EMPTY CELL ─────────────────────────────────────────────
     The old board's gesture, and the reason it is worth keeping: the two
     things a new trip most needs are the two the cell already knows. The row
     is the bus and the column is the day, so creating from a cell fills both
     in and leaves only the destination to type.

     WHICH DAY, FROM THE POINTER. The track is one element spanning all seven
     columns -- bars are placed inside it by percentage, not by cell -- so
     there is no per-day element to read. The day is the pointer's offset
     across the track divided by a seventh of its width, which is the same
     arithmetic `clip` uses in reverse.

     ONLY ON EMPTY SPACE. A right-click on a bar is left alone: that wants the
     bar's own actions, which are not built, and offering "new trip here" over
     an existing one would be the wrong answer to the gesture.

     THE MENU IS POSITIONED HERE AND OPENED BY THE MODULE. `Rux.menu.open`
     gives Escape, outside-press and focus return; it repositions only
     `position: fixed` surfaces, and this one is absolute inside `.sch-page`,
     so the placement below stands. */
  const cellMenu = document.getElementById('sch-cell-menu');
  const barMenu = document.getElementById('sch-bar-menu');
  let cellMenuAt = null;
  let barMenuFor = null;

  /* Both menus are placed the same way, so the arithmetic is written once.

     IT CLAMPS TO THE PAGE'S RIGHT EDGE, ADDED 2026-09-11, AND THIS WAS A
     PRE-EXISTING FAULT RATHER THAN A NEW ONE. The left edge was pinned to the
     click and nothing stopped the menu running past the page: a right-click in
     Sunday's column, or any menu anchored to a button near the right edge, put
     half the items off screen. It surfaced when the toolbar became one row and
     the overflow trigger moved to x=327 of a 375 display -- the menu opened at
     327 and ran to 510, so every label was cut -- but the same press on the
     last day column would always have done it.

     SHIFTED, NOT FLIPPED. Carbon's own menus open from the trigger's edge and
     move only as far as they must; clamping keeps the menu under the thing
     that opened it, which for a right-aligned button reads as right-aligned
     and for a mid-board right-click barely moves at all.

     MEASURED AFTER THE APPEND, because a menu still in the body has the width
     it has there. `hidden` comes off first so there is a box to read at all.

     THE BLOCK AXIS IS NOT CLAMPED, and that is a decision rather than an
     oversight: the page grows to fit a menu near its bottom and scrolls, which
     loses nothing, where the inline axis clips against the display. If a menu
     opening below the fold turns out to matter, it is the same three lines. */
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
    const track = e.target.closest('.sch-track');
    if (!track || e.target.closest('.sch-bar')) return;
    if (!shown) return;
    e.preventDefault();

    const box = track.getBoundingClientRect();
    const days = parseInt(getComputedStyle(gridEl).getPropertyValue('--sch-days'), 10) || 7;
    const index = Math.min(days - 1, Math.max(0, Math.floor((e.clientX - box.left) / (box.width / days))));
    cellMenuAt = {
      startDate: iso(addDays(shown, index)),
      busId: track.dataset.unassigned ? null : (track.dataset.busId || null),
    };

    popMenuAt(cellMenu, e);
  });

  /* THE BAR'S OWN MENU. `screen-inventory.md` section 5 keeps three of the old
     bar's five icons and section 7 puts the ones wanted without opening
     anything here. Open trip is one. Move bus is the other, in the only form
     it can take without a list of every bus: taking the bus AWAY, which sends
     the trip to the Unassigned row -- the same write the drag makes when a bar
     is dropped there, so nothing new is being invented for it.

     TAKE OFF THIS BUS IS HIDDEN WHERE IT CANNOT ACT: a bar with no assignment
     row is an unfilled slot in the Unassigned row, and there is nothing to
     clear. A disabled item that can never enable is worse than no item.

     PRINT ENVELOPE IS THE THIRD AND IS NOT HERE, because printing is step 5 of
     the build order and nothing prints yet. Not forgotten -- deferred.

     DELETE IS NOT HERE EITHER, and deliberately: the inventory never lists it
     among the bar's actions, so it has no home in the plan yet and this is not
     the place to invent one for an irreversible write. */
  gridEl.addEventListener('contextmenu', e => {
    const bar = e.target.closest('.sch-bar');
    if (!bar || !bar.dataset.tripId) return;
    e.preventDefault();
    e.stopPropagation();
    // A HOLD ON TOUCH IS THE DRAG'S GESTURE NOW, and Android fires this event
    // at about the moment the bar lifts. Opening a menu on top of a bar the
    // finger is already carrying is the wrong answer to that press, so the
    // drag wins while it is armed. The menu is unchanged for a right-click.
    if (touchDragging) return;
    barMenuFor = bar;
    document.getElementById('sch-bar-menu-unassign').hidden =
      !bar.dataset.assignmentId || !bar.dataset.busId;
    popMenuAt(barMenu, e);
  });

  barMenu?.addEventListener('click', async e => {
    const item = e.target.closest('.rux--menu-item');
    if (!item || !barMenuFor) return;
    const bar = barMenuFor;
    window.Rux?.menu?.close?.(barMenu);
    barMenu.hidden = true;

    if (item.id === 'sch-bar-menu-open') { openPanel(bar); return; }

    if (item.id === 'sch-bar-menu-cancel') {
      openCancelModal(bar.dataset.tripId);
      return;
    }

    if (item.id === 'sch-bar-menu-unassign') {
      const assignmentId = bar.dataset.assignmentId;
      if (!assignmentId) return;
      toast('info', 'Taking the trip off its bus…');
      try {
        // The same write the drag makes for a drop on the Unassigned row.
        const { error } = await withTimeout(
          client.from('trip_assignments').update({ bus_id: null }).eq('id', assignmentId).then(r => r));
        if (error) throw new Error(error.message);
        await show();
        toast('success', 'Taken off its bus. It is in the Unassigned row.');
      } catch (err) {
        toast('error', `The trip was not moved. ${err.message}`);
      }
    }
  });
  barMenu?.addEventListener('rux:menu-closed', () => { barMenu.hidden = true; });

  /* CANCEL IS NOT DELETE, and the difference is the whole point of it. The row
     stays; `cancelled_at` takes it off the board and the trips page is where
     it can still be read and brought back. rux: "its useful to know about
     trips that were cancelled." Deleting outright belongs on that page, for
     the test rows that are worth nothing to anybody.

     THE REASON IS OPTIONAL HERE and stored when given. 32 of the 41 cancelled
     trips carry one, so it is normally written but not always, and refusing
     the cancel without one would be stricter than the data has ever been. */
  /* ONE WAY IN FOR TWO WAYS TO ASK, 2026-09-10. The bar's own menu had this
     inline; the Details tab's `Cancel trip` button needed the same six lines,
     and two copies of "which trip, what does it say, clear the reason, open"
     is two places for them to disagree about any of it. A function
     declaration rather than a const because both callers are wired above
     where `cancelling` is declared. */
  function openCancelModal(tripId) {
    const trip = panelIndex.trips.get(tripId);
    cancelling = tripId;
    document.getElementById('sch-cancel-what').textContent =
      `${trip?.destination || 'This trip'}${trip?.customer ? ` for ${trip.customer}` : ''}.`;
    document.getElementById('sch-cancel-reason').value = '';
    window.Rux?.modal?.open?.('sch-cancel-modal');
  }

  let cancelling = null;

  document.getElementById('sch-cancel-confirm')?.addEventListener('click', async () => {
    const id = cancelling;
    if (!id) return;
    const reason = document.getElementById('sch-cancel-reason').value.trim();
    window.Rux?.modal?.close?.('sch-cancel-modal');
    cancelling = null;
    toast('info', 'Cancelling the trip…');
    try {
      const patch = { cancelled_at: new Date().toISOString() };
      if (reason) patch.cancellation_reason = reason;
      const { error } = await withTimeout(client.from('trips').update(patch).eq('id', id).then(r => r));
      if (error) throw new Error(error.message);
      await show();
      toast('success', 'Trip cancelled. It is off the schedule and still on the trips list.');
    } catch (e) {
      toast('error', `The trip was not cancelled. ${e.message}`);
    }
  });

  cellMenu?.addEventListener('click', e => {
    if (!e.target.closest('#sch-cell-menu-new')) return;
    window.Rux?.menu?.close?.(cellMenu);
    cellMenu.hidden = true;
    if (cellMenuAt) openCreate(cellMenuAt);
  });
  cellMenu?.addEventListener('rux:menu-closed', () => { cellMenu.hidden = true; });

  /* THE SAME ACTION FROM THE OVERFLOW MENU, which is where `New trip` lives
     below `md`. It calls `openCreate()` with NO argument, exactly as the
     toolbar button does -- a blank trip. The prefilled path is the cell menu's
     `openCreate(cellMenuAt)` above, and the two are deliberately different
     doors: one says "a trip, somewhere", the other "a trip, on this bus, that
     day". */
  /* TODAY AND DRIVERS FROM THE MENU, which is where they live below `md`. Each
     calls exactly what its toolbar button calls -- the button is the same
     control at a wider width, not a different one -- so there is no second
     copy of either behaviour to drift. */
  document.getElementById('sch-menu-today')?.addEventListener('click', () => {
    const menu = document.getElementById('sch-view-menu');
    if (menu) { window.Rux?.menu?.close?.(menu); menu.hidden = true; }
    cursor = mondayOf(new Date());
    show();
  });
  document.getElementById('sch-menu-drivers')?.addEventListener('click', () => {
    const menu = document.getElementById('sch-view-menu');
    if (menu) { window.Rux?.menu?.close?.(menu); menu.hidden = true; }
    if (availOn && !availYielded) { availOn = false; }
    else { availOn = true; availYielded = false; }
    placeAvailability();
  });

  document.getElementById('sch-menu-new-trip')?.addEventListener('click', () => {
    const menu = document.getElementById('sch-view-menu');
    if (menu) { window.Rux?.menu?.close?.(menu); menu.hidden = true; }
    openCreate();
  });
  document.getElementById('sch-panel-close')?.addEventListener('click', () => closePanel());
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !panelEl.hidden) { e.preventDefault(); closePanel(); }
  });

  /* ── SEARCHING THE WEEK ON SCREEN ─────────────────────────────────────────
     `screen-inventory.md` line 51 plans a trip finder -- a floating palette on
     Cmd-K, "Header search from the shell, results in a data table on a page".
     The page is not built. What is built here is the half that needs no page:
     the header icon, the shortcut, and a search over the week already loaded
     that SELECTS the bar it finds.

     WHY NOT SHIP THE ICON ALONE. index.html says it two panels down, about the
     sign-in button: "a button with no handler is an affordance that lies". An
     icon that opens nothing, or opens an empty promise, is that button.

     IT SEARCHES WHAT IS ON SCREEN, LITERALLY. The haystack is each bar's own
     `textContent` plus its row's bus number -- destination, customer, times and
     drivers, because that is what `barEl` already wrote into it. Reading the
     rendered text rather than the trip row means the search can never claim a
     match the eye cannot then find, and it needs no second opinion about which
     of `trips`' columns are worth matching.

     THE TOGGLE IS NOT WIRED HERE. `js/ui-shell.js` takes any
     `__action[aria-expanded]`, finds the panel through `aria-controls`, sets
     `--expanded` and `__action--active`, and fires `rux:header-panel-opened`.
     So this listens for that event and does not own the open state -- the same
     reason the switcher and the account panels have no code in this file. */
  const searchWrap = document.querySelector('.sch-header-search');
  const searchBox = document.getElementById('sch-search');
  const searchTrigger = document.getElementById('sch-search-trigger');
  const searchInput = document.getElementById('sch-search-input');
  const searchResults = document.getElementById('sch-search-results');
  const searchList = document.getElementById('sch-search-list');
  const searchCount = document.getElementById('sch-search-count');
  const searchNoteEl = document.getElementById('sch-search-note');
  const searchClear = document.getElementById('sch-search-clear');

  /* EXPANDING AND COLLAPSING, WHICH NOTHING UPSTREAM DOES. rux-ds ships no
     search module -- `js/` has seventeen and none of them is one -- so the
     class and the two attributes are moved here. All three together: Carbon's
     CSS keys the width off `--expanded`, the magnifier reports state through
     `aria-expanded`, and the input is `tabindex=-1` while collapsed so a tab
     cannot land in a field that is 0px wide.

     THE RESULTS PANEL FOLLOWS THE FIELD rather than being a second control.
     `js/ui-shell.js` would have owned it, but it claims
     `.rux--header__action[aria-expanded]` and this trigger is Carbon's
     magnifier, so the class is set here. It is the same class ui-shell sets,
     on the same element, so the panel behaves identically to the other two. */
  const EXPANDED = 'rux--search--expanded';

  function expandSearch() {
    searchBox?.classList.add(EXPANDED);
    searchTrigger?.setAttribute('aria-expanded', 'true');
    if (searchInput) { searchInput.tabIndex = 0; searchInput.focus(); }
  }

  /* COLLAPSING CLEARS THE FIELD, which is Carbon's own behaviour for the
     expandable variant and the only one that makes sense here: a collapsed
     search is a magnifier, so a query still in it is a filter nobody can see. */
  function collapseSearch() {
    searchBox?.classList.remove(EXPANDED);
    searchTrigger?.setAttribute('aria-expanded', 'false');
    if (searchInput) { searchInput.value = ''; searchInput.tabIndex = -1; }
    searchClear?.classList.add('rux--search-close--hidden');
    showResults(false);
  }

  const searchOpen = () => searchBox?.classList.contains(EXPANDED);
  const toggleSearch = () => { if (searchOpen()) collapseSearch(); else expandSearch(); };

  /* A `role=button` IS NOT A BUTTON, so it needs its keys wired by hand --
     Enter and Space are what the platform would have given a real one, and
     Carbon's own markup chose the div. */
  searchTrigger?.addEventListener('click', toggleSearch);
  searchTrigger?.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSearch(); }
  });

  /* A PRESS OUTSIDE COLLAPSES IT, because an expanded field stretches across the
     header and there is no other way back -- the magnifier is under it.

     THE TEST IS THE WRAPPER, NOT THE FIELD, AND THE COMMENT THAT WAS HERE WAS
     WRONG. It read "the results live inside it now" and tested
     `searchBox.contains` -- but `#sch-search` is the `.rux--search` element and
     the results are its SIBLING inside `.sch-header-search`. Checked:
     `searchBox.contains(results)` is false. So every press on the list --
     grabbing its scrollbar, pressing the count line, starting a drag over a row
     -- collapsed the search out from under the thing being pressed. Clicking a
     RESULT looked fine only by accident: that handler collapses the search
     itself, so the bug was invisible on the one path anyone tested. */
  document.addEventListener('pointerdown', e => {
    if (!searchOpen()) return;
    if (searchWrap.contains(e.target)) return;
    collapseSearch();
  });

  /* AND TABBING AWAY COLLAPSES IT TOO, which the pointer handler cannot see.
     rux asked whether the results should be individually selectable with Tab;
     they should not -- this is an activedescendant listbox, the options are
     `tabindex=-1` on purpose, and Tab is for leaving a widget rather than
     walking it. But that exposed the real fault: Tab DID leave, and left a
     942px field and twelve results sitting open over the board with focus on
     the Account button. Measured before the fix -- field expanded, 12 options
     drawn, focus "Account".

     `relatedTarget` FIRST, `activeElement` AFTER A TICK. The first says where
     focus is going and is enough for a Tab; it is null when focus leaves for
     the window itself or for a non-focusable press, and the deferred check
     covers that without collapsing on the way between the field and its own
     clear button. */
  searchWrap?.addEventListener('focusout', e => {
    if (!searchOpen()) return;
    const to = e.relatedTarget;
    if (to && searchWrap.contains(to)) return;
    setTimeout(() => {
      if (searchOpen() && !searchWrap.contains(document.activeElement)) collapseSearch();
    }, 0);
  });

  /* WHAT IT SEARCHES, AND IT IS EVERY TRIP RATHER THAN THE WEEK ON SCREEN.
     The first version read the rendered bars, which was honest while there was
     nowhere for an off-week result to go. rux asked for all trips, "by
     organizations and booking contact and destination" -- and all three are
     plain columns on `trips`, checked against a live row rather than taken from
     the inventory: `customer` is the organization (a sampled row reads "Mission
     CISD"), `destination` is the destination, and `booking_contact_name` sits
     denormalised beside `booking_contact_id`, so none of this needs a join.

     ONE `or` OF THREE `ilike`s, WHICH IS WHY THE QUERY IS SANITISED FIRST.
     PostgREST parses `or=(a.ilike.*x*,b.ilike.*x*)` as a LIST: an unescaped
     comma, parenthesis or backslash in the typed text does not fail, it
     re-parses into different filters. So those are stripped before the text is
     interpolated, and `%`/`*` with them, which would otherwise let a typed
     wildcard widen the match silently.

     CANCELLED TRIPS ARE OUT, matching the board's own read, and the newest are
     first -- a dispatcher searching a customer name wants the trip that is
     coming, not one from 2019. One more than the cap is fetched so "more than
     12 match" can be said without counting the whole table. */
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

  /* DEBOUNCED, AND THE TOKEN IS WHAT KEEPS THE ANSWER HONEST. Every keystroke
     would be a request; worse, replies can land out of order, so a slow query
     for "dal" can overwrite a fast one for "dallas" and show results for text
     the field no longer holds. `searchSeq` is incremented per run and checked
     after the await -- a stale reply is dropped rather than rendered. */
  let searchSeq = 0;
  let searchTimer = 0;
  /* WHICH OPTION IS CURRENT, AND IT IS AN INDEX RATHER THAN AN ELEMENT. The
     list is rebuilt on every keystroke, so a held element would be detached the
     moment the query changed; the index is re-read against the live list each
     time it is used. `optionAt` only exists to mint unique ids -- it never
     resets, because an id reused across two renders can be pointed at by a
     stale `aria-activedescendant` for exactly one frame. */
  let activeAt = -1;
  let optionAt = 0;

  const searchOptions = () => [...searchList.querySelectorAll('[role="option"]')];

  /* MOVING THE HIGHLIGHT IS THREE THINGS AT ONCE and none of them is focus.
     `aria-selected` is what a screen reader reads as current, the class is what
     the eye sees, and `aria-activedescendant` on the FIELD is what connects the
     two -- it names the option without moving the caret out of the input, which
     is the whole point of this pattern: the query stays editable while the
     arrows walk the list.

     AND IT SCROLLS THE OPTION INTO VIEW, because the list is capped at 60vh and
     arrowing to the twelfth result otherwise walks a highlight off the bottom
     of a box that never moves. `block: 'nearest'` so it only scrolls when it
     has to, rather than re-centring on every keypress. */
  function setActive(i) {
    const opts = searchOptions();
    activeAt = i;
    opts.forEach((o, n) => {
      const on = n === i;
      o.setAttribute('aria-selected', String(on));
      o.classList.toggle('sch-search__opt--active', on);
    });
    const cur = opts[i];
    if (cur) {
      searchInput?.setAttribute('aria-activedescendant', cur.id);
      cur.scrollIntoView({ block: 'nearest' });
    } else {
      searchInput?.removeAttribute('aria-activedescendant');
    }
  }

  /* WRAPS AT BOTH ENDS, which is what a twelve-row menu wants: down from the
     last is the first, and up from nothing is the LAST, so a single Up key
     reaches the bottom of the list. */
  function moveActive(by) {
    const opts = searchOptions();
    if (!opts.length) return;
    if (activeAt === -1) setActive(by > 0 ? 0 : opts.length - 1);
    else setActive((activeAt + by + opts.length) % opts.length);
  }

  /* HIDDEN WHEN IT HAS NOTHING TO SAY. The results hang off the field now, so
     an empty box would be a shadow floating under the header with no content
     in it -- which the header panel never showed, because a panel with no
     content was still a panel. */
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

  /* THE MATCH IS BOLDED IN PLACE, which is what Carbon's type-ahead shows and
     what rux asked for from the capture. It answers the question a result list
     otherwise leaves open: WHY is this row here. "Spring Branch, TX" for the
     query "memorial high school" looks like a mistake until the second line
     shows the words bolded inside "McAllen Memorial High School".

     BUILT AS NODES, NEVER AS HTML. Every value here is a customer's, and the
     rest of this file writes them with `textContent` for that reason -- a
     destination with a `<` in it is data, not markup. So the string is split
     on the match and reassembled from text nodes and a `<strong>`.

     THE NEEDLE IS THE SANITISED QUERY, the same one the database was asked
     with, so what is bolded is what actually matched rather than what was
     typed. Case-insensitive, and every occurrence, not just the first. */
  function mark(text, cls, needle) {
    const span = el('span', cls);
    const hay = String(text ?? '');
    if (!needle) { span.textContent = hay; return span; }
    const lower = hay.toLowerCase(), find = needle.toLowerCase();
    let at = 0, i = lower.indexOf(find);
    if (i === -1) { span.textContent = hay; return span; }
    while (i !== -1) {
      if (i > at) span.appendChild(document.createTextNode(hay.slice(at, i)));
      const hit = el('strong', 'sch-search__hit');
      hit.textContent = hay.slice(i, i + find.length);
      span.appendChild(hit);
      at = i + find.length;
      i = lower.indexOf(find, at);
    }
    if (at < hay.length) span.appendChild(document.createTextNode(hay.slice(at)));
    return span;
  }

  /* A NOTE IS NOT A RESULT, so it sits beside the listbox rather than inside it
     -- a listbox's children must be options -- and the list is emptied when one
     shows, or `aria-activedescendant` could still name an option no longer
     drawn. The three parts are static in index.html and only their contents
     change, which is what lets the field's `aria-controls` name the list: an id
     minted at runtime is one `tools/check.mjs` cannot resolve, and it said so. */
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
    /* NOT A DEAD END, which the pattern page asks for by name: "If a search
       returns No results, suggest a follow-up action." The three columns it
       looked in are the useful suggestion, since a dispatcher who typed a bus
       number or a driver has typed something this search cannot see. */
    if (!rows.length) {
      searchNote(`No trip matches "${q}". This looks in the destination, the organization and the booking contact.`);
      return;
    }

    showResults(true);
    setActive(-1);
    /* THE COUNT, BECAUSE CARBON ASKS FOR IT IN SO MANY WORDS: "Always include
       the number of search results, including for searches with no results."
       One more than the cap is fetched, so past it the honest figure is a
       floor rather than a total -- and it says so. */
    searchCount.textContent = rows.length > SEARCH_CAP
      ? `More than ${SEARCH_CAP} trips match`
      : `${rows.length} trip${rows.length === 1 ? '' : 's'} match${rows.length === 1 ? 'es' : ''}`;
    searchCount.hidden = false;
    searchNoteEl.hidden = true;
    const list = searchList;
    list.replaceChildren();
    for (const trip of rows.slice(0, SEARCH_CAP)) {
      /* THE ROW IS PRESENTATIONAL AND THE BUTTON IS THE OPTION. A listbox's
         children must be options, and Carbon's contained list puts a wrapper
         between them -- so the wrapper is `presentation`, which removes it from
         the tree without removing its styling, and the thing a person actually
         presses carries `role=option`. It stays a <button> for the click, the
         hover and the focus ring; `role` only changes what it is ANNOUNCED as.

         `tabindex=-1` BECAUSE FOCUS NEVER COMES HERE. This is an
         activedescendant listbox: focus stays in the field so typing keeps
         working, and the options are reached with the arrow keys. Tabbing
         through twelve results to leave the search would be the alternative. */
      const row = el('div', 'rux--contained-list-item rux--contained-list-item--clickable');
      row.setAttribute('role', 'presentation');
      const btn = el('button', 'rux--contained-list-item__content');
      btn.type = 'button';
      btn.setAttribute('role', 'option');
      btn.setAttribute('aria-selected', 'false');
      btn.id = `sch-search-opt-${optionAt++}`;
      btn.tabIndex = -1;
      /* THE SECOND LINE IS THE DATE AND WHO IT IS FOR, because a result may be
         on any week now: without the date, two "Austin TX" rows a year apart
         are the same row. `fmtDay` is the board's own short format. */
      const when = trip.start_date ? parseISO(trip.start_date).toLocaleDateString(undefined,
        { year: 'numeric', month: 'short', day: 'numeric' }) : 'No date';
      /* FOUR FIELDS ON TWO LINES, AND THE SHAPE WAS CHOSEN FROM THE DATA RATHER
         THAN THE OTHER WAY ROUND. Counted over 737 live trips: destination is
         never empty, organization is empty on 2%, and **booking contact is
         empty on 60%** -- so a column for it would be blank more often than
         filled, which is what ruled the four-column version out. It is never
         equal to the organization (0% of rows), so when it IS there it adds
         something, and it is a person's name: 13 characters median, 27 at the
         longest.

         SO IT IS APPENDED, NOT PLACED. The second line joins whatever exists,
         and on the 60% with no contact it simply ends after the organization
         with nothing missing on screen.

         THE DATE GOES RIGHT, ALONE, because it is the only field that is both
         short and always present -- which makes it the one thing that can form
         a column down the list, and the column that tells seven "Dallas, TX"
         rows apart. */
      const head = el('div', 'sch-search__head');
      head.append(
        mark(trip.destination || 'No destination', 'sch-search__dest', safe),
        el('span', 'sch-search__when', when),
      );
      btn.append(
        head,
        mark([trip.customer, trip.booking_contact_name].filter(Boolean).join(' · ') || 'No organization',
          'sch-search__meta', safe),
      );
      /* GOING TO A RESULT IS A WEEK CHANGE FIRST AND A SELECTION SECOND, and
         both halves have to wait on the read. The trip may be on any week, so
         the cursor moves to the Monday (or Sunday) of its start date, `show()`
         re-reads, and only then does a bar with that trip id exist to click.

         IT CLICKS THE BAR for the reason the previous version learned:
         selection is sch.js's, on a handler this file does not own, so calling
         `openPanel` would open the editor with the board showing nothing
         selected and the roster's day column dark.

         A TRIP CAN BE ON THE WEEK AND STILL HAVE NO BAR -- it is unassigned and
         off the Unassigned row, or its leg falls outside the seven days. The
         week still moves, which is the useful half, and the panel says so
         rather than failing silently. */
      btn.addEventListener('click', async () => {
        collapseSearch();
        if (!trip.start_date) return;
        cursor = mondayOf(parseISO(trip.start_date));
        await show();
        const bar = gridEl.querySelector(`.sch-bar[data-trip-id="${CSS.escape(trip.id)}"]`);
        if (!bar) { toast('info', 'That week is showing', 'The trip has no bar on it — it may have no bus yet.'); return; }
        bar.scrollIntoView({ block: 'center', inline: 'center' });
        if (bar.getAttribute('aria-pressed') === 'true') openPanel(bar);
        else bar.click();
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

  /* THE ARROWS, ENTER AND ESCAPE, WHICH IS THE PATTERN PAGE'S OWN LIST: "the
     ARROW keys should cycle through displayed suggestions, with ENTER choosing
     a suggestion and ESCAPE allowing the user to exit the type-ahead menu
     without selecting anything."

     ESCAPE IS TWO-STAGE FOR THAT LAST CLAUSE. Carbon asks for an escape from
     the MENU, not from the search -- so the first press closes the list and
     leaves the query where it is, and only a second one collapses the field.
     Pressed with no list open it collapses immediately, which is what the
     document-level handler already did and still does.

     ENTER WITH NOTHING HIGHLIGHTED TAKES THE FIRST ROW. A person who typed a
     destination and pressed Enter meant the obvious one, and the alternative --
     doing nothing -- reads as a broken key. With a row highlighted it takes
     that one.

     THESE ARE ON THE FIELD, NOT THE DOCUMENT, so they cannot reach a key the
     trip editor or the board wanted; the document-level handler keeps Cmd-K and
     the bare Escape, which are global by intent. */
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

  /* A HOVER MOVES THE HIGHLIGHT TOO, so the mouse and the keyboard cannot
     disagree about which row Enter would take. */
  searchList?.addEventListener('pointermove', e => {
    const opt = e.target.closest('[role="option"]');
    if (!opt) return;
    const at = searchOptions().indexOf(opt);
    if (at !== -1 && at !== activeAt) setActive(at);
  });

  /* CMD-K, AND CTRL-K FOR THE SAME REASON EVERY EDITOR BINDS BOTH. It presses
     the TRIGGER rather than opening the panel, so there is one path in and out
     and `aria-expanded` cannot drift from what is on screen. Pressed while the
     panel is open it closes it, which is what a toggle shortcut should do.

     NOT WHILE TYPING SOMEWHERE ELSE is not a guard this needs: Cmd/Ctrl-K is
     not a text-editing chord, and the trip editor's fields are plain inputs. */
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && !e.altKey && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      toggleSearch();
    }
    if (e.key === 'Escape' && searchOpen()) { e.preventDefault(); collapseSearch(); }
  });
  gridEl.addEventListener('click', e => {
    const bar = e.target.closest('.sch-bar');
    if (bar && bar.dataset.tripId) openPanel(bar);
  });

  // -- the week, and moving between them ------------------------------------
  let cursor = mondayOf(new Date());
  let loading = false;
  let shown = null;   // the week actually on screen, which is not `cursor` mid-fetch

  async function show() {
    if (!client) {
      say('error', 'Not connected', 'The account script did not load, so this page has no way to reach the schedule. It is served from the site root and is missing here.');
      return;
    }
    if (loading) return;
    loading = true;

    // SAY SO BEFORE THE FETCH, NOT AFTER IT. The week being asked for is known
    // the moment the button is pressed and the read takes a few hundred
    // milliseconds, during which nothing used to change at all -- measured
    // 2026-09-06, 120ms after a press the label, the bars and the status were
    // all the previous week's. Two presses read as nothing happening. The
    // label moves now and the grid dims, which says stale rather than empty:
    // clearing it would throw away a week the person can still read.
    const asked = cursor;
    setRange(asked, addDays(asked, 6));
    schEl.setAttribute('aria-busy', 'true');
    gridEl.classList.add('sch-grid--busy');

    try {
      render(await read(asked));
      shown = asked;
    } catch (e) {
      // A FAILED WEEK DOES NOT TAKE THE LAST GOOD ONE WITH IT. Hiding the grid
      // meant one dropped request wiped what was on screen. What is drawn is
      // still `shown`, so the label goes back to it and the notice says which
      // week failed; only a first load with nothing drawn yet stays empty.
      if (shown) setRange(shown, addDays(shown, 6));
      else schEl.hidden = true;
      const why = String(e && e.message ? e.message : e);
      say('error', 'Could not load that week', shown
        ? `${why} Still showing the week that did load.`
        : why);
    } finally {
      loading = false;
      schEl.removeAttribute('aria-busy');
      gridEl.classList.remove('sch-grid--busy');
    }
  }

  /* ── THE WEEK PICKER ───────────────────────────────────────────────────────
     The week label is the trigger, which `docs/screen-inventory.md` settles
     twice (sections 1 and 7) and which rux-ds BUILT FOR THIS APP: the header of
     `js/date-picker.js` records `data-rux-open` arriving on 2026-09-08 "asked
     for by rux-scheduler, whose week label is the control that should jump the
     calendar and sits in a toolbar far from the picker", and the hidden input
     the same way -- "a toolbar reading 'Sep 7 - 13, 2026' beside a `2026-09-07`
     field is one week displayed twice". So nothing here is invented; this is
     the consumer half of a contract already written.

     BUILT, NOT WRITTEN IN THE PAGE, like the trip editor's date fields. It
     reuses `DP_CONTAINER.single` and `calendarBody()` rather than a second copy
     of the same markup, and `Rux.datePicker.init` claims it after.

     NO LABEL AND NO `dpIcon()`. The label would name a field nobody sees, and
     the icon is Carbon's own trigger -- this picker's trigger is the week
     button, and a calendar glyph there would be the second one in this toolbar
     after `Today`'s.

     WHERE THE ROOT SITS IS WHAT POSITIONS THE CALENDAR. `date-picker.js` does
     not portal it: `__calendar-container` is `position: absolute;
     inset-block-start: 100%` against the root. The root goes INSIDE the week
     row, after the heading, holding only a hidden input -- so it is a
     zero-height box at the row's bottom edge and the calendar drops from
     exactly there. The opener is the overlay's anchor, which is a different
     job: it is what keeps a press on the button from reading as an outside
     press (`overlay.js:122`). */
  const weekRow = document.getElementById('sch-weekrow');
  if (weekRow && rangeEl) {
    const root = el('div', 'rux--date-picker rux--date-picker--next rux--date-picker--single');
    root.id = 'sch-week-picker';
    const container = el('div', DP_CONTAINER.single);
    const wrap = el('div', 'rux--date-picker-input__wrapper');
    const span = el('span');
    weekInput = el('input', 'rux--date-picker__input');
    weekInput.type = 'text';
    weekInput.id = 'sch-week-date';
    /* `hidden` IS ENOUGH AND THAT IS MEASURED, NOT ASSUMED -- date-picker.js's
       header says so and corrects its own earlier note that claimed otherwise:
       the UA's `[hidden] { display: none !important }` beats the author rule
       that made the CALENDAR container need detaching, so the input alone needs
       no CSS. */
    weekInput.hidden = true;
    span.appendChild(weekInput);
    wrap.appendChild(span);
    container.appendChild(wrap);
    root.append(container, calendarBody());
    weekRow.appendChild(root);
    rangeEl.setAttribute('data-rux-open', root.id);

    /* THE ONLY THING A PICK DOES IS MOVE THE CURSOR. A day is a day and the
       board is a week, so the week CONTAINING that day is what it means --
       `mondayOf` already answers that, and already knows about the Sunday-start
       preference, so picking a Wednesday lands on the same week either way. */
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

    /* `aria-expanded` IS OURS TO KEEP, because the module does not own this
       trigger. `date-picker.js` reads `data-rux-open` to find the root and
       makes the opener the overlay's anchor and focus destination -- and it
       says nothing about the opener's state, which is right: it did not write
       that element and cannot know what role it plays. Left alone the button
       announced `false` the whole time the calendar was open, which is worse
       than announcing nothing.

       THE CONTAINER'S PRESENCE IS THE STATE, and that is the module's own
       design rather than a signal borrowed for the purpose: Carbon ships no
       closed state for the calendar, so `date-picker.js` DETACHES the
       container on close and re-inserts it on open. Watching the root's child
       list therefore reads exactly what open means here. */
    const syncExpanded = () => {
      rangeEl.setAttribute(
        'aria-expanded',
        root.querySelector('.rux--date-picker__calendar-container') ? 'true' : 'false',
      );
    };
    new MutationObserver(syncExpanded).observe(root, { childList: true });
    syncExpanded();
  }

  /* CHANGING THE WEEK DROPS THE TOAST. An undo offered for a move on THIS week
     names a bus that is about to leave the screen, and the offer would still
     work -- it goes by assignment id -- which is worse than if it did not: a
     press would silently move a trip the board is no longer showing. Every
     other message here is spent the moment the week under it changes. */
  const go = days => { toast(null); cursor = addDays(cursor, days); show(); };
  document.getElementById('sch-prev')?.addEventListener('click', () => go(-7));
  document.getElementById('sch-next')?.addEventListener('click', () => go(7));
  document.getElementById('sch-today')?.addEventListener('click', () => { toast(null); cursor = mondayOf(new Date()); show(); });

  // /account.js opens the session asynchronously and these tables do not need
  // one, so the first paint does not wait for it; the client is whichever
  // exists when this runs.
  show();
})();
