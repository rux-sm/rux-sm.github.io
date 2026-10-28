/* ==========================================================================
   data.js — the live week
   --------------------------------------------------------------------------
   Fills #scheduler-grid from the trip tables, and writes back:
   a drag moves a bus, and the trip panel's Save writes the trip with its
   stops, contacts, payments, POs, invoices and assignments. The database is
   production, so nothing is tried with a test record.

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

  /* What a trip needs, who rides each bus and what a leg's checklist reads of
     them: leg-facts.js, which every Scheduler page loads, so the to-do list
     reads a leg as the board does. */
  const {
    setRequirementList, requirementLabel, requirementIcon, editableNeeds, isVehicleNeed,
    needIds, requirementsOf, shortfall, wrongType, seatsTotal, overSeats,
    ROLES, DRIVER_STATUSES, statusKey, statusMap, activeRolesOf, crewOf, tripContact, dayContactsOf, dayOfContact,
  } = window.SchedulerLegFacts;

  /* A SAVED TRIP IS READ THROUGH trip-shape.js: its legs, each leg's routes,
     its day-of contacts and which papers each leg is handed. The editor still
     knows a leg by its old word, `outbound` for the first and `return` for a
     split trip's pickup, so it reads each leg by that word. A row names its
     leg by its route or its leg's id; one a page has made and not read back
     names it by its word. A
     trip read without its legs, as a new trip's draft is, is read by its own
     columns. */
  const SHAPE = window.SchedulerTripShape;
  const shaped = trip => Array.isArray(trip?.trip_legs);
  // The leg a word names on a saved trip, or null.
  const savedLeg = (trip, word) => (shaped(trip) ? SHAPE.legOfWord(trip, word) : null);
  // The key of the leg a stop, a vehicle or a file is on in the editor: its leg's id, or its word's leg.
  function keyOfRow(trip, row) {
    const leg = !shaped(trip) ? null : row?.route_id ? SHAPE.legOfRoute(trip, row.route_id)
      : row?.leg_id ? SHAPE.legOf(trip, row.leg_id) : null;
    return leg?.id ?? legKeyOf(row?.leg || 'outbound');
  }
  // The word of the leg a stop, a vehicle or a file is on.
  function wordOfRow(trip, row) {
    const leg = !shaped(trip) ? null : row?.route_id ? SHAPE.legOfRoute(trip, row.route_id)
      : row?.leg_id ? SHAPE.legOf(trip, row.leg_id) : null;
    return leg?.word ?? (row?.leg || 'outbound');
  }
  /* A leg's days, its buses and its hotel, by its word: the leg's own on a
     trip read with its legs, where a leg it does not have has none, and the
     trip's columns on one read without them. */
  function legFactsOf(trip, word) {
    if (shaped(trip)) {
      const l = savedLeg(trip, word);
      return { from: l?.start ?? null, to: l?.end ?? null, buses: l?.busCount ?? null,
        hotelBooked: !!l?.hotelBooked, hotelNumber: l?.hotelNumber ?? null };
    }
    const back = word === 'return';
    const from = trip?.[back ? 'return_start_date' : 'start_date'] ?? null;
    return { from, to: trip?.[back ? 'return_end_date' : 'end_date'] ?? from,
      buses: trip?.[back ? 'return_bus_count' : 'bus_count'] ?? null,
      hotelBooked: !!trip?.[`hotel_booked_${word}`], hotelNumber: trip?.[`hotel_itinerary_number_${word}`] ?? null };
  }
  /* A day-of contact's slot, 1 to 5, as the editor writes it: the list's row
     for the slot on a trip read with it, with the word of its leg, or null
     when the leg is the trip's; the slot's columns on one read without it. */
  function slotOf(trip, n) {
    if (!Array.isArray(trip?.trip_contacts)) {
      const c = tripContact(trip, n);
      return c ? { ...c, leg: trip[`trip_contact_${n}_leg`] ?? null } : null;
    }
    const row = trip.trip_contacts.find(c => c.slot === n);
    if (!row) return null;
    const leg = row.leg_id ? SHAPE.legOf(trip, row.leg_id)?.word ?? null : null;
    return { id: row.contact_id ?? null, name: row.name ?? '', phone: row.phone ?? null, email: null, leg };
  }
  // A leg's day-of contacts, by its word, as its drivers are handed them.
  const contactsOfWord = (trip, word) => {
    const leg = savedLeg(trip, word) ?? SHAPE.firstLeg(trip);
    return leg ? SHAPE.contactsFor(trip, leg.id).map(c => ({ ...c, slot: trip.trip_contacts.find(r => r.id === c.row)?.slot ?? null }))
      : [1, 2, 3, 4, 5].map(n => (slotOf(trip, n) ? { ...slotOf(trip, n), slot: n } : null)).filter(Boolean);
  };

  /* What stands in a bus's or a driver's way on a leg, who to ask first, and
     a driver's rest between two legs: clashes.js, with its sample cases. */
  const { REST_HOURS, RECENT_DAYS, datesOverlap, restBetween, fitFor, rankDrivers, autoPicks, cardLapse } = window.SchedulerClashes;
  // A rest under this many hours, overlap included, is the roster's danger mark; under REST_HOURS it is the warning one.
  const REST_SHORT_HOURS = 8;

  const PROJECT = 'https://udnmqhayzhrbltxzzhjw.supabase.co';
  const PUBLISHABLE = 'sb_publishable_w3h8Mtwam0ULemVKGKyBfw_DTbTaJIS';

  const gridEl = document.getElementById('scheduler-grid');
  const schEl = document.getElementById('scheduler-week');
  const statusEl = document.getElementById('scheduler-status');
  // `rangeEl` is the week button, and `rangeTextEl` and `rangeMonthsEl` the
  // spans inside it that `setRange` writes, because textContent on the button
  // would delete its caret.
  const rangeEl = document.getElementById('scheduler-range');
  const rangeTextEl = document.getElementById('scheduler-range-text') || rangeEl;
  // The arrows either side of Today.
  const stepPrev = document.getElementById('scheduler-prev');
  const stepNext = document.getElementById('scheduler-next');
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
  /* How many days the board shows from its first: two weeks when the view
     option asks for them, on a screen md or wider, and one week below md,
     where fourteen days cannot fit and the swipe needs a week to move by. The
     arrows and the swipe step by this many days. */
  const phoneQuery = matchMedia('(max-width: 41.98rem)');
  let twoWeeks = false;
  const daysShown = () => (twoWeeks && !phoneQuery.matches ? 14 : 7);
  const lastShown = start => addDays(start, daysShown() - 1);
  // The weekend is read from the date, not the column, because a Sunday-first
  // week puts it at both ends. The board and the driver roster share it.
  const isWeekend = d => d.getDay() === 0 || d.getDay() === 6;
  // Math.round, because a span crossing a daylight-saving change is 23 or 25
  // hours and integer division would drop or add a day.
  const daysBetween = (a, b) => Math.round((b - a) / DAY);

  // -- the palette ----------------------------------------------------------
  // The trip colours and what a trip paints as, shared with the printed week.
  const { TRIP_COLORS, RETIRED_COLORS, tripColorOf, standardHueOf, hueFor } = window.SchedulerWeek;

  /* A trip's bar, its crew and its alerts, and the times as they say them:
     bar.js, which the components page draws its samples with too. */
  const Bar = window.SchedulerBar;
  const { alertsOf, crewEl, crewName, fitCrew, fitKind, hhmm, clockEl, setAt, updateStamp } = Bar;

  const UNASSIGNED = ' unassigned';

  // A vehicle as every screen names it, "Coach 218" or "Van 12"; vehicles.js.
  const vehicleName = bus => window.SchedulerVehicles?.label(bus) ?? (String(bus?.number ?? '').trim() || 'Unit');
  const client = window.Rux?.account?.client
    ?? (window.supabase ? window.supabase.createClient(PROJECT, PUBLISHABLE, { auth: { persistSession: false } }) : null);

  // A phone number as it is shown, from phone.js; a field keeps it as typed.
  const showPhone = window.SchedulerPhone.format;

  // -- status ---------------------------------------------------------------
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  /* `box` is the whole viewBox string, not its last number. Sprite symbols are
     drawn in different boxes -- `#m-check` in 20, the chevrons in 16, most
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

  /* What a bus number's toggletip says, laid out as the trip card is: a head
     with the bus in its own colour, a disc wearing its type's drawing beside
     its name and make, then a ruled row each for its equipment, VIN and any
     status but active, and last the switch that shows every bus's equipment
     under its number. Every value with textContent: a bus's details are data,
     never markup. */
  // The equipment each bus has, as the icon and word the tip and the bus
  // column both draw.
  const equipmentOf = bus => [bus.ada_lift && ['#m-accessible-fill', 'ADA lift'],
    bus.sleeper && ['#m-airline_seat_flat-fill', 'Sleeper']].filter(Boolean);
  /* The board's corner: the type's drawing, or its initial where it has
     none, named for a screen reader and on hover. */
  function paintCorner(corner, type) {
    corner.dataset.type = type;
    const known = window.SchedulerVehicles?.typeOf(type);
    const name = known ? (known.label || known.name) : (type || 'Vehicle');
    const icon = window.SchedulerVehicles?.iconOf(type);
    const mark = el('span', 'scheduler-corner__type', icon ? null : name.charAt(0).toUpperCase());
    mark.setAttribute('role', 'img');
    mark.setAttribute('aria-label', `Bus number, ${name}`);
    if (icon) mark.appendChild(svgUse(icon, '16', '0 0 32 32'));
    corner.title = `Bus number · ${name}`;
    corner.replaceChildren(mark);
  }
  // Set by render for the week on screen, and called as the board scrolls.
  let nameBoardCorner = () => {};
  // The board's view option for that switch; applyView keeps it.
  let showEquipment = false;
  // Each tip's switch needs an id its label can name, and a spare week draws
  // the same buses again, so the bus id alone would repeat.
  let equipSwitchSeq = 0;
  function busTip(bus) {
    const tip = el('div', 'rux--toggletip-content scheduler-bus-tip');
    const head = el('div', 'scheduler-bus-tip__head');
    const disc = el('div', 'scheduler-bus-disc');
    disc.setAttribute('aria-hidden', 'true');
    const ink = window.SchedulerVehicles?.inkOn(bus.color);
    if (ink) { disc.style.background = bus.color; disc.style.color = ink; }
    const icon = window.SchedulerVehicles?.iconOf(bus.type);
    disc.appendChild(icon ? svgUse(icon, '16', '0 0 32 32')
      : el('span', 'scheduler-bus-disc__letter', String(bus.type || 'U').trim().charAt(0).toUpperCase()));
    const said = el('div', 'scheduler-bus-tip__said');
    said.appendChild(el('strong', 'scheduler-bus-tip__name', vehicleName(bus)));
    const spec = [bus.capacity ? `${bus.capacity} pax` : null,
      [bus.year, bus.make, bus.model].filter(Boolean).join(' ') || null].filter(Boolean).join(' · ');
    if (spec) said.appendChild(el('span', null, spec));
    head.append(disc, said);
    tip.appendChild(head);

    const marks = equipmentOf(bus);
    if (marks.length) {
      const row = el('div', 'scheduler-bus-tip__row scheduler-bus-tip__kit');
      for (const [href, label] of marks) {
        const mark = el('span', 'scheduler-bus-tip__mark');
        mark.append(svgUse(href, '16', '0 0 32 32'), el('span', null, label));
        row.appendChild(mark);
      }
      tip.appendChild(row);
    }
    if (bus.vin) tip.appendChild(el('div', 'scheduler-bus-tip__row scheduler-bus-tip__vin', `VIN ${bus.vin}`));
    if (bus.status && bus.status !== 'active') {
      tip.appendChild(el('div', 'scheduler-bus-tip__row scheduler-bus-tip__status', bus.status.charAt(0).toUpperCase() + bus.status.slice(1)));
    }

    /* Carbon's small toggle, from `sink/toggle.html`, its words to the left
       and a label for the switch, so either flips it. `js/form-controls.js`
       binds it and fires `rux:toggle`, which applyView answers for every bus. */
    const id = `scheduler-equip-switch-${++equipSwitchSeq}`;
    const row = el('div', 'scheduler-bus-tip__row scheduler-bus-tip__switch');
    const words = el('label', 'scheduler-bus-tip__switch-label', 'Equipment under bus numbers');
    words.htmlFor = id;
    words.id = `${id}-label`;
    const box = el('div', 'rux--toggle');
    const btn = el('button', 'rux--toggle__button');
    btn.type = 'button';
    btn.id = id;
    btn.setAttribute('role', 'switch');
    btn.setAttribute('aria-checked', String(showEquipment));
    btn.setAttribute('aria-labelledby', words.id);
    const lab = el('label', 'rux--toggle__label');
    lab.htmlFor = id;
    const appearance = el('div', 'rux--toggle__appearance rux--toggle__appearance--sm');
    const sw = el('div', 'rux--toggle__switch');
    if (showEquipment) sw.classList.add('rux--toggle__switch--checked');
    const check = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    check.setAttribute('class', 'rux--toggle__check');
    check.setAttribute('width', '6px'); check.setAttribute('height', '5px');
    check.setAttribute('viewBox', '0 0 6 5');
    const tick = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    tick.setAttribute('d', 'M2.2 2.7L5 0 6 1 2.2 5 0 2.7 1 1.5z');
    check.appendChild(tick);
    sw.appendChild(check);
    appearance.appendChild(sw);
    lab.appendChild(appearance);
    box.append(btn, lab);
    row.append(words, box);
    tip.appendChild(row);
    return tip;
  }

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

  // A notice and the toast are toast.js's, which every office page shares.
  const { note, toast } = window.SchedulerToast;
  // A second name for `note`, which the Route tab calls it by.
  const notice = (...args) => note(...args);

  /* Above the board, in flow, for the notices that stand in for the grid:
     nothing this week, or a week that would not load. The region starts as
     screen-reader text for the loading skeleton; a notice makes it visible.
     Everything else goes to `toast`. */
  function say(kind, title, subtitle, action) {
    statusEl.replaceChildren();
    if (!kind) { statusEl.hidden = true; return; }
    statusEl.classList.remove('rux--visually-hidden');
    statusEl.hidden = false;
    statusEl.appendChild(note(kind, title, subtitle, action, 'page'));
  }

  // -- reading --------------------------------------------------------------
  const TRIP_COLUMNS = [
    'id', 'trip_ref', 'destination', 'customer', 'customer_id', 'start_date', 'end_date',
    'return_start_date', 'return_end_date', 'departure_time', 'return_time',
    'trip_type', 'confirmed', 'trip_bar_color', 'bus_count', 'return_bus_count',
    'req_sleeper', 'req_ada', 'req_56pax', 'need_hotel', 'updated_at',
    // What the trip needs, for its card and the bus fit: the list the office keeps,
    // with the older columns behind it for a trip saved before it existed.
    'trip_reqs', 'need_fuel_card',
    // The vehicle the trip needs, `Coach` or `Van`; null is any.
    'vehicle_type',
    // Each leg's hotel: the bar's hotel mark, its menu item and the Buses tab.
    'hotel_booked_outbound', 'hotel_booked_return',
    'hotel_itinerary_number_outbound', 'hotel_itinerary_number_return',
    // The roles an assignment turns on, and who fills them: the drivers row.
    // The Buses tab edits each seat by its row id, with its relief swap time and
    // note, and each vehicle's own needs and type. A seat also carries what
    // its driver has been handed: the envelope, the itinerary, the
    // hours-of-service form and the forms the customer asks for, each
    // printed or not, and how far its driver drove, which the Billing tab's
    // Miles edits.
    'trip_assignments(id,bus_id,position,leg,route_id,active_roles,needs,vehicle_type,fuel_card_number,pickup_at,actual_yard_depart_at,actual_yard_return_at,trip_drivers(id,driver_id,role,report_time,instructions,miles,pay,envelope_printed,itinerary_printed,hos_form_printed,driver_forms_printed,trip_reminder_sent,trip_reminder_sent_at))',
    // The driver details sent to the booking contact, or not, which the Contact list says and marks.
    'trip_prep(driver_info_sent,driver_info_sent_at)',
    // The trip's documents: the itinerary shortcut, the bar's mark, the Files tab
    // and the itinerary panel, which frames the file at its path.
    'trip_documents(id,label,created_at,file_name,file_path,file_size,leg,leg_id)',
    // Set from the Checklist or the Files tab; a trip that does not need an
    // itinerary is not marked.
    'itinerary_not_needed',
    // Its twin for the day-of contact: a trip nobody needs to be called on is
    // not marked as missing one.
    'contact_not_needed',
    'booking_contact_id',
    'contacts:booking_contact_id(id,name,phone,email,client)',
    // The trip's own copy of the booking contact.
    'booking_contact_name', 'booking_contact_phone', 'booking_contact_email',
    // The booking's email thread, a link stored beside the contact.
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
    'trip_contact_1_leg', 'trip_contact_2_leg', 'trip_contact_3_leg', 'trip_contact_4_leg', 'trip_contact_5_leg',
    // The day-of contacts as a list, which the bars and the editor read
    // through trip-shape.js; the editor still writes the five slots, and a
    // trigger keeps the list, each row with the slot it mirrors.
    'trip_contacts(id,position,slot,leg_id,contact_id,name,phone)',
    'quoted_price,deposit_amount,invoice_number,po_ref,po_amount',
    // The price the customer was sent, and when, which the quote lines may move past.
    'quote_sent_price,quote_sent_on',
    // Who marked the Route, Buses and Billing tabs done, and when.
    'route_done_at,route_done_by,buses_done_at,buses_done_by,billing_done_at,billing_done_by',
    'contract_status,contract_signed_on,invoice_status,balance_paid,date_paid',
    'est_miles,actual_miles',
    // How many people the customer said are travelling.
    'passengers',
    // The PO and invoice switches' flags, and the contract note.
    'contract_note,po_received,invoiced',
    // Save inserts, updates and deletes payment rows one at a time, by id.
    'trip_payments(id,position,amount,method,date,ref)',
    // POs and invoices, one row each, written by id like the payments.
    'trip_pos(id,position,ref,amount,date)',
    'trip_invoices(id,position,number,amount,date)',
    // The quote's lines, which the Billing tab edits and the quote prints.
    'trip_quote_lines(id,position,kind,leg,leg_id,item,description,quantity,cost,amount,cost_typed,miles,dead_miles,rate)',
    // `miles` sums to the estimate a trip without its own shows. The rest are
    // what the Route tab edits on a leg's pickup, drop-off and return rows.
    'trip_stops(id,position,leg,route_id,type,label,name,address,lat,lng,mapbox_id,depart_prev,arrive,spot,'
      + 'depart_prev_date,arrive_date,spot_date,miles,drive,miles_source,drive_source,dwell_status)',
    // The trip's legs and their routes, which week.js reads the bars from through trip-shape.js,
    // with each leg's hotel marks.
    'trip_legs(id,leg,kind,start_date,end_date,bus_count,hotel_booked,hotel_itinerary_number,created_at,trip_routes(id,position,name))',
    // What was said to the customer, for the bar's follow-up mark and its card.
    'trip_updates(id,created_at,actor_id,actor_name,body,kind,edited_at)',
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
  /* How many days before the first day drawn a trip's last leg may end and
     the trip still be read. A week: a leg back past midnight takes a day
     past the one it ends on, and the standing rule reads the day before a leg. */
  const ENDED_DAYS = 7;
  const withTimeout = promise => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(
      () => reject(Object.assign(
        new Error(`The schedule did not answer within ${READ_TIMEOUT / 1000} seconds.`), { timedOut: true })),
      READ_TIMEOUT)),
  ]);

  /* ── Bus moves shown ahead of a read ──
     A trip moved to another bus is drawn there before the read that confirms
     it, so the board has to keep the move through every read that cannot know
     of it yet. Each move is held here by its assignment: the trip, the bus it
     went to, the row an empty slot was given, and whether the database has
     answered. An empty slot has no assignment until the database makes its
     row, so it is held under a stand-in row and id until then. A read is handed every held move on its way in, because one that
     began before a write finished comes back without it and would draw the bar
     back; a move is let go by the first read that began after the database
     took it, which carries the move itself. */
  const heldMoves = new Map();
  let readsBegun = 0;
  // Bars lifted and not yet let go, and whether a draw waited for them.
  let barsInHand = 0;
  let drawOwed = false;
  // Counts the stand-in rows, so each has an id of its own.
  let standIns = 0;

  // Writes one move into a week's payload: the row's bus, or the row a slot was given.
  function moveInto(data, id, move) {
    const trip = data?.trips?.find(t => String(t.id) === String(move.tripId));
    if (!trip) return false;
    const rows = trip.trip_assignments || [];
    const row = rows.find(a => String(a.id) === id);
    if (row) row.bus_id = move.busId;
    /* A slot some row already fills gets no stand-in beside it: a read can come
       back holding the row the insert made before the insert's own answer. */
    else if (move.standIn && rows.some(a => (a.leg || 'outbound') === move.row.leg && (a.position ?? 0) === move.row.position)) return true;
    else if (move.row) trip.trip_assignments = [...rows, { ...move.row, bus_id: move.busId }];
    else return false;
    return true;
  }

  /* Holds a move and writes it into the held week. `saving` is a move the
     database has not answered yet, which its bar wears; the other kind counts
     the reads begun so far, so a later one can let it go. */
  function holdMove(tripId, assignmentId, busId, { saving = false, row = null, standIn = false } = {}) {
    const id = String(assignmentId);
    const move = { tripId, busId, saving, standIn, row: row ?? heldMoves.get(id)?.row ?? null, since: readsBegun };
    heldMoves.set(id, move);
    return !!cached && moveInto(cached.data, id, move);
  }

  // The trip a held move is on, in the held week.
  const heldTrip = tripId => cached?.data.trips.find(t => String(t.id) === String(tripId));

  /* Lets go of a move the database refused. The bus it came from is written
     back into the held week; a stand-in row is taken out, which leaves the
     slot empty as it was. */
  function dropMove(tripId, assignmentId, busId) {
    const id = String(assignmentId);
    const move = heldMoves.get(id);
    heldMoves.delete(id);
    const trip = heldTrip(tripId);
    if (!trip) return;
    if (move?.standIn) trip.trip_assignments = (trip.trip_assignments || []).filter(a => String(a.id) !== id);
    else moveInto(cached.data, id, { tripId, busId });
  }

  /* Turns a slot's stand-in into the row the database made, in the held week
     and on its bar, so the answer needs no draw. */
  function fillStandIn(tripId, standInId, made) {
    heldMoves.delete(standInId);
    const trip = heldTrip(tripId);
    const rows = trip?.trip_assignments || [];
    const bar = gridEl.querySelector(`.scheduler-bar[data-assignment-id="${CSS.escape(standInId)}"]`);
    // A read that came back between the insert and its answer already holds the real row.
    if (rows.some(a => String(a.id) === String(made.id))) {
      trip.trip_assignments = rows.filter(a => String(a.id) !== standInId);
      bar?.remove();
      return;
    }
    const row = rows.find(a => String(a.id) === standInId);
    if (row) Object.assign(row, made);
    if (bar) bar.dataset.assignmentId = made.id;
  }

  async function read(weekStart) {
    const mine = ++readsBegun;
    const weekEnd = lastShown(weekStart);
    /* Four weeks either side come with the week asked for, so a run of swipes
       draws from what is in hand rather than stopping at the second one to wait
       on the network. It costs one widened window and no second query. The
       exact overlap is decided per leg in `render`, not by this filter, which
       is what lets one payload draw nine weeks.

       A TRIP IS READ BY ITS LEGS' DAYS: one that starts by the last day drawn
       and has a leg ending within ENDED_DAYS of the first, a leg with no end
       by its start. So a trip that started long before and still runs into
       the weeks is read, a split trip by its pickup too, and one long over is
       not. `ends` is that test, an embed that returns nothing. */
    const from = addDays(weekStart, -NEAR_DAYS);
    const to = addDays(weekEnd, NEAR_DAYS);
    const lo = iso(addDays(from, -90));
    const hi = iso(to);
    const ended = iso(addDays(from, -ENDED_DAYS));
    const unwrap = r => { if (r.error) throw new Error(r.error.message); return r.data ?? []; };

    const [buses, trips, drivers, contacts, customers, locations, oos, timeOff] = await withTimeout(Promise.all([
      client.from('buses').select('id,number,capacity,type,status,sort_order,ada_lift,sleeper,equipment,year,make,model,color,vin').order('sort_order').then(unwrap),
      // A cancelled trip stays in the table but is not on the schedule.
      client.from('trips').select(`${TRIP_COLUMNS},ends:trip_legs!inner()`).is('cancelled_at', null)
        .lte('start_date', hi).or(`end_date.gte.${ended},start_date.gte.${ended}`, { referencedTable: 'ends' })
        .order('start_date').then(unwrap),
      // `status`, so the Buses tab offers active drivers; `priority`, so the
      // roster lists them in the order they are called on; `employment_type`,
      // because a part-time driver needs an hours-of-service record; the
      // licence and medical card dates, so the bar menu flags an expired one.
      client.from('drivers').select('id,name,short_name,status,priority,phone,texting_url,employment_type,license_exp,med_card_expiry,language').then(unwrap),
      // Every contact, read once with the week for the contact search rather
      // than on each keystroke.
      client.from('contacts').select('id,name,phone,email,client,customer_id').order('name').then(unwrap),
      // The customers and the saved places, for the Customer field, the fill
      // it makes into an empty pickup, and the Route tab's address search.
      client.from('customers').select('id,name,usual_location_id,notes,usual_reqs,usual_vehicle_type').order('name').then(unwrap),
      client.from('locations').select('id,name,address,lat,lng,mapbox_id').order('name').then(unwrap),
      client.from('bus_out_of_service').select('bus_id,start_date,end_date,reason').lte('start_date', hi).gte('end_date', iso(from)).then(unwrap),
      // Overlap, not containment: a driver away across the whole fortnight has
      // neither date inside this week and is still away every day of it.
      client.from('driver_time_off').select('driver_id,start_date,end_date,reason').lte('start_date', hi).gte('end_date', lo).then(unwrap),
      /* The office's settings this app follows: the billing workflow, the yard and
         the Geoapify key the Route tab finds places and drives with. A
         refused read keeps what was there. */
      client.from('settings').select('key,value')
        .in('key', ['billing-workflow-v1', 'yard-location-v1', 'geoapify-key-v1', 'route-times-v1', 'requirements-v1', 'vehicle-types-v1',
          'follow-up-v1', 'fuel-card-v1', 'rate-calendar-v1', 'dead-miles-v1', 'late-return-v1'])
        .then(r => {
          if (r.error) return;
          const byKey = new Map((r.data || []).map(row => [row.key, row.value]));
          setBillingWorkflow(byKey.get('billing-workflow-v1'));
          const yard = byKey.get('yard-location-v1');
          if (yard?.lat != null && yard?.lng != null) yardPlace = yard;
          window.SchedulerPlaces.use(byKey.get('geoapify-key-v1'), yardPlace);
          setRouteTimes(byKey.get('route-times-v1'));
          setFuelLimits(byKey.get('fuel-card-v1'));
          window.SchedulerWeek.setLateReturn(byKey.get('late-return-v1'));
          rateCalendar = byKey.get('rate-calendar-v1')?.months ?? {};
          deadMilesLimit = Number(byKey.get('dead-miles-v1')?.miles) > 0 ? Number(byKey.get('dead-miles-v1').miles) : null;
          setRequirementList(byKey.get('requirements-v1'));
          window.SchedulerVehicles?.set(byKey.get('vehicle-types-v1'));
          setFollowUp(byKey.get('follow-up-v1'));
        }),
      // The driver forms customers ask for, which the checklist reads. A
      // refused read keeps what was there.
      window.SchedulerLegFacts.readDriverForms(client).catch(() => false),
    ]));
    // The fleet is never empty, so an empty one is a read the database refused,
    // which is what an ended log-in or removed access looks like; a reload
    // sends the account where it can go.
    if (!buses.length) throw new Error('The schedule came back empty. Reload the page.');
    // Each driver's status on these trips, from the table the editor and the driver
    // page write, keyed as `statusKey` builds it.
    const statusRows = trips.length ? await withTimeout(
      client.rpc('get_trip_driver_statuses', { p_trip_ids: trips.map(t => t.id) }).then(unwrap)) : [];
    const statuses = statusMap(statusRows);
    const data = { buses, trips, drivers, contacts, customers, locations, oos, timeOff, statuses, weekStart, weekEnd };
    for (const [id, move] of heldMoves) {
      if (!move.saving && mine > move.since) heldMoves.delete(id);
      else moveInto(data, id, move);
    }
    return data;
  }

  function setRange(weekStart, weekEnd) {
    if (!rangeEl) return;
    /* One pattern for every week, "Sep 7 – Sep 13, 2026": both months and the
       year the week ends in, so the label reads the same way and takes nearly
       the same width whichever week it is. `formatRange` drops the second
       month inside one month and writes both years across New Year, which is
       three shapes and twice the width between them. The month is short so
       the widest thing in the toolbar does not wrap its row. */
    const fmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });
    rangeTextEl.textContent = `${fmt.format(weekStart)} – ${fmt.format(weekEnd)}, ${weekEnd.getFullYear()}`;
    // The arrows step by what is shown, and say so.
    const stretch = daysShown() > 7 ? 'two weeks' : 'week';
    stepPrev?.setAttribute('aria-label', `Previous ${stretch}`);
    stepNext?.setAttribute('aria-label', `Next ${stretch}`);
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
  // Which days a leg covers, its times and its lane, shared with the printed week.
  const { stopsOfLeg, timesOf, legsOf, legKeyOfVehicle, legByKey, takes, clip, assignLanes } = window.SchedulerWeek;

  // The contact columns as the editor shows them on opening, so an untouched
  // panel has nothing to save. Each day-of contact stays in its own slot.
  function contactColumnsOf(trip) {
    const b = tripContact(trip, 0);
    const out = { booking_contact_name: b?.name || null, booking_contact_phone: b?.phone || null,
                  booking_contact_email: b?.email || null };
    for (let n = 1; n <= 5; n++) {
      const c = slotOf(trip, n);
      out[`trip_contact_${n}_name`] = c?.name || null;
      out[`trip_contact_${n}_phone`] = c?.phone || null;
      out[`trip_contact_${n}_leg`] = c?.leg ?? null;
    }
    return out;
  }

  const needFieldId = id => `scheduler-f-req-${id}`;

  const vehicleNeedList = () => editableNeeds().filter(r => isVehicleNeed(r.id));
  const tripNeedList = () => editableNeeds().filter(r => !isVehicleNeed(r.id));
  // The needs object a row stores, from a list of ids.
  const needsObject = ids => Object.fromEntries([...ids].map(id => [id, true]));
  // A tag's state, or undefined where the office has since deactivated that
  // requirement and the editor never drew it.
  function needPressed(id) {
    const tag = document.getElementById(needFieldId(id));
    return tag ? tag.getAttribute('aria-pressed') === 'true' : undefined;
  }

  // -- drawing --------------------------------------------------------------
  /* What each bar knows about its bus and its trip's needs, for the trip's
     card: bar.js's `facts`, set as the bar is drawn. */
  const barFacts = new WeakMap();

  // The trip's documents labelled Itinerary, newest first, by trip-shape.js.
  const itinerariesOf = trip => SHAPE.allItineraries(trip);
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

  /* ── On the road, from Samsara ─────────────────────────────────────────────
     While a bus is out on its trip, road-bar.js draws its bar's live line
     from what Samsara says, and the live card reads the same answer. A bar
     is out from ten minutes before its yard-out to its yard-back whatever the
     engine is doing, and in the two hours either side only while it runs.
     The samsara-now Edge Function is asked once a minute, and only while
     such a bar is on the board and the page is in view. */
  const ROAD_EVERY = 60e3;
  const Road = window.SchedulerRoad;
  const Live = window.SchedulerLiveTrip;
  const LiveMap = window.SchedulerLiveMap;
  const RoadBar = window.SchedulerRoadBar;
  const { HOUR: ROAD_HOUR, DUTY: ROAD_DUTY, hours: roadHours, mark: roadMark,
    ago: roadAgo, short: roadShort, restWords: roadRest } = RoadBar;
  const roadOut = bar => {
    const now = Date.now();
    return Number(bar.dataset.roadFrom) <= now && now <= Number(bar.dataset.roadTo);
  };

  let roadAnswer = null, roadAsked = 0, roadStopped = false, roadBusy = false, roadLive = null;
  const roadBusOf = bar => roadAnswer?.buses?.find(b => b.bus_id === bar.dataset.busId) ?? null;
  const roadEta = Road.arrivals((a, b) => driveBetween(a, b).then(d => d?.min ?? null), () => drawRoad());

  /* Where an out bar's bus is on its leg: its stops, the stop it is at or
     goes to next, and, going, when it gets there and how late that is. */
  function roadNext(bar, bus) {
    const trip = heldTrip(bar.dataset.tripId);
    if (!trip || !bus) return null;
    const stops = Road.stopsOf(trip, bar.dataset.legKey || bar.dataset.leg);
    const where = Road.whereOn(stops, bus.path, bus);
    const here = bus.lat != null ? [bus.lat, bus.lng] : null;
    if (where.at) return { stops, where, stop: stops[where.reached], at: true };
    if (where.next < 0) return { stops, where, stop: null };
    const stop = stops[where.next];
    const arrival = roadEta.get(bus.bus_id, stop, here);
    return { stops, where, stop, at: false, arrival, late: Road.lateBy(stop, arrival) };
  }

  async function askRoad() {
    if (roadStopped || roadBusy || !client || document.hidden) return;
    const out = [...gridEl.querySelectorAll('.scheduler-bar[data-road-from][data-bus-id]')].filter(roadOut);
    if (!out.length) {
      if (roadAnswer) { roadAnswer = null; drawRoad(); }
      return;
    }
    // Each bus's path from two hours before its leg leaves the yard; of two
    // legs out on one bus, the later.
    const since = {};
    for (const bar of out) since[bar.dataset.busId] = Math.max(since[bar.dataset.busId] ?? 0, Number(bar.dataset.roadFrom));
    roadLive ??= Road.live(client);
    roadBusy = true;
    let answer = null, status = null, failed = false;
    try { answer = await roadLive.ask(since); } catch (error) { failed = true; status = error?.context?.status; }
    roadBusy = false;
    roadAsked = Date.now();
    /* No Samsara key, or no fleet this log-in may read, is nothing to show
       and nothing to ask again; a lapsed log-in is asked again next time. A
       failed answer keeps the last for five minutes, then the bars go back to
       their updates. */
    if (status === 503 || status === 404) { roadStopped = true; roadAnswer = null; }
    else if (!failed && answer) roadAnswer = answer;
    else if (roadAnswer && Date.now() - Date.parse(roadAnswer.at) > 5 * 60e3) roadAnswer = null;
    drawRoad();
  }

  function drawRoad() {
    for (const bar of gridEl.querySelectorAll('.scheduler-bar[data-bus-id]')) {
      const bus = roadBusOf(bar);
      const span = [Number(bar.dataset.roadFrom), Number(bar.dataset.roadTo)];
      const out = !!bar.dataset.roadFrom && (Road.isOut(bus, span) || Live.watching(bus, span));
      roadBar(bar, out ? bus : null);
    }
    // A card on its On the road tab follows its bus with each answer.
    const shown = selectedBar();
    if (shown?.dataset.road && roadTabOf(shown) === 'road') placeBarOpen(shown);
  }

  // The drivers a bar names, by id.
  const roadNamed = bar => new Set([...bar.querySelectorAll(':scope > .scheduler-bar__drivers > .scheduler-bar__crew > .scheduler-crew')]
    .map(c => c.dataset.driverId).filter(Boolean));

  /* What live-trip.js says of an out bar's bus: its warnings, worst first,
     and where it is on its leg. Handed the drivers the bar names, every bus
     in Samsara's answer, the yard's point and the leg's yard-out, and each
     stop's drive and whether its wait is rest, from the trip's own stops. */
  function roadLook(bar, bus, next, named) {
    const rows = new Map((heldTrip(bar.dataset.tripId)?.trip_stops ?? []).map(s => [String(s.id), s]));
    const look = {
      bus, next, named: [...named], now: Date.now(),
      others: roadAnswer?.buses ?? [],
      numberOf: id => panelIndex.buses.get(id)?.number ?? null,
      yard: yardPlace ? [Number(yardPlace.lat), Number(yardPlace.lng)] : null,
      yardOut: Number(bar.dataset.roadFrom) + Road.MARGIN,
      drives: (next?.stops ?? []).map(s => {
        const row = rows.get(s.key);
        return { min: driveMin(row?.drive), rest: ['off', 'sleeper'].includes(row?.dwell_status) };
      }),
    };
    return { warnings: Live.warningsOf(look), phase: Live.phaseOf(look) };
  }

  /* Today's column counted from the bar's first day, held to the bar, so a
     longer bar's live rows stand under today; 0 off the week. */
  function roadDay(bar) {
    const days = [...(bar.closest('.scheduler-week')?.querySelectorAll('.scheduler-day') ?? [])];
    const today = days.findIndex(d => d.classList.contains('scheduler-day--today'));
    if (today < 0) return 0;
    const span = Math.max(1, Math.ceil(Number(bar.dataset.span) || 1));
    return Math.min(span - 1, Math.max(0, Math.floor(today - (Number(bar.dataset.start) || 0))));
  }

  // An out bar's live line, or none, drawn by road-bar.js from the board's answer.
  function roadBar(bar, bus) {
    const next = bus ? roadNext(bar, bus) : null;
    RoadBar.draw(bar, bus, {
      next,
      day: bus ? roadDay(bar) : 0,
      said: bus ? roadLook(bar, bus, next, roadNamed(bar)) : null,
      at: roadAnswer?.at,
      motion: view.motion,
    });
    if (bus) confirmFromSamsara(bar, bus);
  }

  /* A DRIVER SAMSARA HAS IN THE BUS IS ON THE TRIP. The bar shows them
     confirmed while the bus is out, road-bar.js's; and when Samsara has them
     logged into this leg's bus within CONFIRM_NEAR of its yard-out, their
     status is saved Confirmed, as the office would, with a history line
     saying Samsara saw them. Once a page load each, so several office
     screens on the board save it once each at most, and a save that fails
     is left for the next page load. */
  const CONFIRM_NEAR = 60 * 60e3;
  const confirming = new Set();
  async function confirmFromSamsara(bar, bus) {
    const yardOut = Number(bar.dataset.roadFrom) + Road.MARGIN;
    if (!Number.isFinite(yardOut) || Math.abs(Date.now() - yardOut) > CONFIRM_NEAR) return;
    const found = barCrew(bar);
    if (!found) return;
    const inBus = new Set(bus.drivers.map(d => d.driver_id).filter(Boolean).map(String));
    const due = found.crew.filter(c => !c.needed && inBus.has(String(c.driverId)) && c.status.value !== 'confirmed'
      && !confirming.has(`${found.trip.id}:${c.driverId}:${c.legKey}:${c.role}`));
    if (!due.length) return;
    const { trip } = found;
    for (const c of due) confirming.add(`${trip.id}:${c.driverId}:${c.legKey}:${c.role}`);
    const picked = c => due.some(x => x.driverId === c.driverId && x.legKey === c.legKey && x.role === c.role);
    const list = (trip.trip_assignments || []).flatMap(a =>
      crewOf(trip, a, panelIndex.driversById, panelIndex.statuses).filter(c => !c.needed).map(c => (
        { driverId: c.driverId, legId: c.legKey, leg: c.leg, role: c.role, status: picked(c) ? 'confirmed' : c.status.value, dirty: picked(c), ...(picked(c) && { source: 'samsara' }) })));
    const number = panelIndex.buses.get(bar.dataset.busId)?.number ?? 'the bus';
    try {
      const { error } = await withTimeout(client.rpc('sync_trip_driver_statuses', { p_trip_id: trip.id, p_statuses: list }).then(r => r));
      if (error) throw new Error(error.message);
      for (const c of due) {
        const was = DRIVER_STATUSES.find(x => x.value === c.status.value)?.label ?? null;
        const who = `${histDriverName(c.driverId)}, ${c.leg === 'return' ? 'inbound' : 'outbound'} ${(HISTORY_ROLES[c.role] || 'Driver').toLowerCase()}`;
        recordHistory(trip.id, 'driver_status_changed', [{
          field: 'driver_status', label: 'Driver status',
          before: was ? `${who}: ${was}` : null, after: `${who}: Confirmed, logged into ${number} in Samsara`,
        }]);
      }
      await show();
    } catch { /* left for the next page load */ }
  }

  setInterval(askRoad, ROAD_EVERY);

  /* THE CARD OF A TRIP OUT ON THE ROAD has three tabs: On the road,
     Needs and Updates, and opens on On the road; the tab picked stays with the trip
     until the page loads again. Design's tabs.js switches them and says so
     with rux:tab-selected, which the card is drawn again from, so it fits
     and places itself for the tab now showing. */
  const roadTabs = new Map();
  const roadTabOf = bar => roadTabs.get(barKey(bar)) ?? 'road';
  document.addEventListener('rux:tab-selected', e => {
    const which = e.detail?.tab?.dataset.roadTab;
    const bar = selectedBar();
    if (!which || !bar) return;
    roadTabs.set(barKey(bar), which);
    cardSection = which;
    placeBarOpen(bar);
    document.querySelector(`#scheduler-bar-shortcuts [data-road-tab="${which}"]`)?.focus();
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Date.now() - roadAsked > ROAD_EVERY) askRoad();
  });

  /* ── Time at the yard ──────────────────────────────────────────────────────
     A bus's time at the yard between two trips on days side by side, from the
     earlier trip's return to the later one's departure, for cleaning and
     fuel. `restBetween` measures it, as it measures a driver's rest. A card
     sits between the two bars, which pull their facing ends back to make room
     while the view option is on. Only bars in one lane, end to end, have a
     between; a day or more at the yard needs no card. Unknown until both
     trips have times, and an overlap is a mistake on the board. */
  const YARD_SHORT_HOURS = 4;
  function yardGaps(bars) {
    const gaps = [];
    for (const after of bars) {
      if (after.place.toNext) continue;
      const before = bars.find(b => b !== after && b.lane === after.lane
        && b.place.start === after.place.start + after.place.span);
      if (!before) continue;
      const hours = restBetween(after.leg, before.leg);
      if (hours != null && hours >= 24) continue;
      gaps.push({ after, before, hours });
    }
    return gaps;
  }

  function yardEl({ after, before, hours }) {
    const short = hours == null || hours < YARD_SHORT_HOURS;
    const card = el('div', `scheduler-yard${short ? ' scheduler-yard--short' : ''}`);
    card.style.setProperty('--scheduler-start', before.place.start);
    card.style.setProperty('--scheduler-lane', before.lane);
    const shown = hours == null ? '?' : hours < 0 ? '!' : `${Math.floor(hours)}h`;
    const mark = el('span', 'scheduler-yard__icon');
    mark.appendChild(svgUse('#m-schedule', '16', '0 0 960 960'));
    card.append(mark, el('span', 'scheduler-yard__hours', shown));
    const back = hhmm(after.leg.back, true), leaves = hhmm(before.leg.depart, true);
    const said = hours == null ? 'Time at the yard unknown until both trips have times'
      : hours < 0 ? `Overlaps: back ${back}, leaves ${leaves}`
      : `Back ${back}, leaves ${leaves} · ${Math.floor(hours)}h ${String(Math.floor((hours * 60) % 60)).padStart(2, '0')}m at the yard`;
    card.title = said;
    card.setAttribute('role', 'img');
    card.setAttribute('aria-label', said);
    return card;
  }

  /* The trips, time off and days out the board read, which a bar's standing
     rule is read against, and each leg's answer by its key, kept until the
     next draw. */
  let boardNearby = { trips: [], off: [], oos: [] };
  const standingOf = new Map();
  const standingFor = (trip, leg, driversById, busesById) => {
    const key = `${trip.id}:${leg}`;
    if (!standingOf.has(key)) standingOf.set(key, window.SchedulerClashes.standing(trip, leg, boardNearby, { driversById, busesById }));
    return standingOf.get(key);
  };

  /* One bar, drawn by bar.js from what the board holds: its drivers, buses
     and statuses, the standing rule's answer for the leg, a move still being
     saved, the leg's itinerary and the end of the stretch the office
     staffs, which moves with the week's first day. A leg is named by its
     key, and its itinerary is the one trip-shape.js hands it. */
  const legItinerary = (trip, key) => SHAPE.itineraryFor(trip, key);
  function barEl(b, driversById, busesById, statuses) {
    const { bar, facts } = Bar.draw(b, {
      driversById, busesById, statuses,
      standing: (trip, key) => standingFor(trip, key, driversById, busesById),
      saving: id => !!heldMoves.get(String(id))?.saving,
      itineraryOf: legItinerary,
      staffedUntil: iso(addDays(mondayOf(new Date()), 14)),
    });
    barFacts.set(bar, facts);
    return bar;
  }

  /* Draws a week's rows. With a target it draws into that grid and stops
     there: a spare grid is a week waiting to slide in beside the one being
     read, so the board's index, its label, its roster, its notices and its
     scroll all still belong to the week on screen. Without one it draws into
     the board's own grid and everything that follows a week change follows. */
  /* The week the board last drew. A read of that same week -- a save, a live
     change from someone else, an update -- keeps the selected trip selected, so
     its card stays open; moving to another week starts with nothing picked. */
  let renderedWeek = null;
  function render(data, target) {
    const { buses, trips, drivers, contacts, customers, locations, oos, timeOff, statuses, weekStart, weekEnd } = data;
    boardNearby = { trips, off: timeOff, oos };
    standingOf.clear();
    const kept = !target && renderedWeek === iso(weekStart) ? selectedBar() : null;
    const keepRef = kept ? barRef(kept) : null;
    // One week or two, from the range asked for. The board's columns follow
    // it; a spare week inherits the count from the pane.
    const days = Math.round((weekEnd - weekStart) / DAY) + 1;
    if (!target) {
      schEl.style.setProperty('--scheduler-days', String(days));
      schEl.classList.toggle('scheduler-week--two', days === 14);
    }
    const driversById = new Map(drivers.map(d => [d.id, d]));
    // What the panel reads when a bar is clicked: the bar carries ids, not
    // objects, and re-fetching a trip already in hand would be a round trip
    // for nothing.
    const busesById = new Map(buses.map(b => [b.id, b]));
    const into = target || gridEl;
    if (!target) panelIndex = { trips: new Map(trips.map(t => [t.id, t])), buses: busesById, driversById, statuses,
                                contacts: contacts || [], customers: customers || [], locations: locations || [] };

    const tracks = new Map();
    const push = (key, bar) => { if (!tracks.has(key)) tracks.set(key, []); tracks.get(key).push(bar); };

    for (const trip of trips) {
      for (const leg of legsOf(trip)) {
        const place = clip(leg.from, leg.to, weekStart, weekEnd);
        if (!place) continue;
        const assigns = (trip.trip_assignments || [])
          .filter(a => legKeyOfVehicle(trip, a) === leg.key)
          .sort((x, y) => (x.position ?? 0) - (y.position ?? 0));
        assigns.forEach(a => push(a.bus_id ?? UNASSIGNED, { trip, leg, assign: a, place, slot: a.position ?? 0 }));
        for (let i = assigns.length; i < (leg.count || 1); i++) push(UNASSIGNED, { trip, leg, assign: null, place, slot: i });
      }
    }

    // Rows: every active bus, plus any bus this week actually uses, so a trip
    // on a retired bus is visible rather than silently dropped.
    const used = new Set([...tracks.keys()]);
    /* Grouped by type in the order of the office's vehicle-types list, fleet
       order kept within a type, so a van never reads as the next coach down.
       The first type on the list is the primary one and heads no band; a type
       the list lacks follows every listed one. */
    const typeList = window.SchedulerVehicles?.types ?? [];
    const typeKey = b => String(b.type || '').trim().toLowerCase();
    const typeRank = b => {
      const i = typeList.findIndex(t => t.name.toLowerCase() === typeKey(b));
      return i < 0 ? typeList.length : i;
    };
    const rows = buses
      .filter(b => b.status === 'active' || used.has(b.id))
      .map(b => ({ id: b.id, bus: b }))
      .sort((a, b) => typeRank(a.bus) - typeRank(b.bus) || typeKey(a.bus).localeCompare(typeKey(b.bus)));
    const primaryType = typeList[0]?.name.toLowerCase() ?? '';
    // Always present, hidden when empty. A drag has to be able to drop the
    // week's first unassigned trip somewhere, and a row that is not in the
    // document has no rectangle to aim at.
    rows.push({ id: UNASSIGNED, bus: null, empty: !tracks.has(UNASSIGNED) });

    into.replaceChildren();
    /* The corner heads the column of bus numbers with the drawing of the type
       being read: the primary type's at the top, then each band's as it
       reaches the day band, so the first group needs no band of its own. */
    const corner = el('div', 'scheduler-corner');
    paintCorner(corner, typeList[0]?.name ?? '');
    into.appendChild(corner);

    // Today is marked on its header cell only.
    const today = iso(new Date());
    let todayCell = null;
    for (let i = 0; i < days; i++) {
      const d = addDays(weekStart, i);
      const cell = el('div', 'scheduler-day');
      if (isWeekend(d)) cell.classList.add('scheduler-day--weekend');
      if (iso(d) === today) {
        cell.classList.add('scheduler-day--today');
        cell.setAttribute('aria-current', 'date');
        todayCell = cell;
      }
      cell.append(
        document.createTextNode(d.toLocaleDateString(undefined, { weekday: 'short' })),
        el('span', 'scheduler-day__num', String(d.getDate())),
      );
      into.appendChild(cell);
    }

    /* A rule at each internal day boundary, so an empty row can
       be counted; the bus column and the pane draw the two outer edges. The
       stops are set on each track, which app.css draws as its background, so
       `var(--scheduler-day-rule)` resolves on the track that defines it. */
    const ruleCols = Array.from({ length: days - 1 }, (_, i) => i + 1);
    const dayRuleStops = (() => {
      const parts = [];
      let prev = '0';
      for (const i of ruleCols) {
        // From the day's own width, not a percentage of the track: a seventh
        // or a fourteenth lands on Blink's 1/64px and paints the rule across two device pixels.
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

    let bandType = primaryType;
    for (const r of rows) {
      /* A band where the type changes, drawn as the type's icon alone, the
         same the corner takes up once the band passes under it. Its name, as
         the vehicle-types list writes it, is for hover and a screen reader; a
         type with no drawing shows its initial, as the corner does. The No bus
         row has its own tint and draws none. */
      if (r.bus && typeKey(r.bus) !== bandType) {
        bandType = typeKey(r.bus);
        const name = window.SchedulerVehicles?.typeOf(r.bus.type);
        const band = el('div', 'scheduler-type-band');
        band.dataset.type = r.bus.type || '';
        const said = name ? (name.label || name.name) : (String(r.bus.type || '').trim() || 'No type');
        const icon = window.SchedulerVehicles?.iconOf(r.bus.type);
        const label = el('span', null, icon ? null : said.charAt(0).toUpperCase());
        label.setAttribute('role', 'img');
        label.setAttribute('aria-label', said);
        band.title = said;
        if (icon) label.appendChild(svgUse(icon, '16', '0 0 32 32'));
        band.appendChild(label);
        into.appendChild(band);
      }
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
        // High contrast, Carbon's own toggletip surface: the inverse chip the
        // trip card is, so its caret shows against the board.
        const tip = el('span', 'rux--popover-container rux--popover--caret rux--popover--high-contrast rux--popover--drop-shadow rux--popover--right-start rux--toggletip');
        const trigger = el('button', 'rux--toggletip-button scheduler-row-head__num');
        trigger.type = 'button';
        trigger.setAttribute('aria-expanded', 'false');
        trigger.setAttribute('aria-label', `${vehicleName(r.bus)} details`);
        trigger.textContent = String(r.bus.number);
        const pop = el('span', 'rux--popover');
        const content = el('span', 'rux--popover-content');
        content.appendChild(busTip(r.bus));
        // The caret is the popover's own last child, where Carbon draws it.
        pop.append(content, el('span', 'rux--popover-caret'));
        tip.append(trigger, pop);
        head.appendChild(tip);
      } else {
        head.append(el('div', 'scheduler-row-head__num', 'No\nbus'));
      }
      if (!r.bus) head.title = 'Trips with no bus yet';
      if (r.bus) {
        head.title = [
          vehicleName(r.bus),
          r.bus.capacity ? `${r.bus.capacity} pax` : null,
          r.bus.type,
          r.bus.ada_lift ? 'ADA lift' : null,
          r.bus.sleeper ? 'Sleeper' : null,
          r.bus.status !== 'active' ? r.bus.status : null,
        ].filter(Boolean).join(' · ');
      }

      /* The marks in this column: the lift and sleeper while the view option
         shows them, and out of service, a state that changes what the row can
         take this week. The type is the band's and the corner's to say. Each
         symbol keeps its own viewBox. */
      const kit = el('div', 'scheduler-row-head__kit');
      const flag = (href, box, label, cls) => {
        const span = el('span', cls || null);
        span.title = label;
        span.setAttribute('role', 'img');
        span.setAttribute('aria-label', label);
        span.appendChild(svgUse(href, '16', box));
        kit.appendChild(span);
      };

      // Drawn on every bus and shown only while the view option is on, so the
      // switch needs no redraw.
      if (r.bus) for (const [href, label] of equipmentOf(r.bus)) flag(href, '0 0 16 16', label, 'scheduler-row-head__equip');

      const windows = (oosByBus.get(r.id) ?? []).filter(w => clip(w.start_date, w.end_date, weekStart, weekEnd));
      if (windows.length) {
        flag('#m-report-fill', '0 0 16 16', `Out of service: ${windows.map(w => w.reason || 'no reason given').join('; ')}`, 'scheduler-row-head__oos');
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
      const yards = r.bus ? yardGaps(bars) : [];
      for (const b of bars) {
        const el = barEl(b, driversById, busesById, statuses);
        // The ends that give way to a yard card, while the view option is on.
        if (yards.some(y => y.after === b)) el.classList.add('scheduler-bar--yard-end');
        if (yards.some(y => y.before === b)) el.classList.add('scheduler-bar--yard-start');
        installDrag(el);
        track.appendChild(el);
      }
      for (const y of yards) track.appendChild(yardEl(y));

      rowEl.append(head, track);
      into.appendChild(rowEl);
    }

    // The pane's own border closes a grid that reaches it, so whichever row
    // ends up last on screen is marked and the stylesheet decides its rule.
    const shownRows = [...into.querySelectorAll('.scheduler-row')].filter(r => !r.hidden);
    shownRows[shownRows.length - 1]?.classList.add('scheduler-row--last');

    // A spare grid is drawn and nothing else: what follows belongs to the week
    // the board is actually reading.
    if (target) return;

    // The corner hands over to each band as it passes under the day band.
    const bands = [...into.querySelectorAll('.scheduler-type-band')];
    nameBoardCorner = () => {
      const edge = corner.getBoundingClientRect().bottom;
      // A hidden board measures zero; it is named again when it is drawn.
      if (!edge) return;
      let type = typeList[0]?.name ?? '';
      for (const b of bands) {
        if (b.getBoundingClientRect().top >= edge) break;
        type = b.dataset.type;
      }
      if (corner.dataset.type !== type) paintCorner(corner, type);
    };
    nameBoardCorner();

    // The editor keeps its trip across a render. Its opener becomes the new bar
    // for that trip when this week has one, so focus can go back to it.
    if (!panelEl.hidden && panelArgs?.ref) panelOpener = findBar(panelArgs.ref);
    if (!target) {
      if (keepRef) findBar(keepRef)?.setAttribute('aria-current', 'true');
      renderedWeek = iso(weekStart);
    }

    schEl.hidden = false;
    // The roster reads the board's whole range and draws the part it shows.
    availAll = { rows: availabilityRows(data), weekStart, days };
    drawRoster(true);
    placeAvailability();
    syncSelection();
    // Every bar is new, so the faces on them are drawn again.
    presenceDraw();
    fitStuckRows();

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
    if (!barCount) say('info', days > 7 ? 'Nothing these two weeks' : 'Nothing this week',
      `No trip touches these ${days > 7 ? 'fourteen' : 'seven'} days.`);
    else say(null);

    // The new bars take what Samsara last said, and ask again if it is old.
    drawRoad();
    if (Date.now() - roadAsked > ROAD_EVERY) askRoad();

    // The notice above changes how much height is left for the grid. app.js
    // owns that sum, so this asks it to refit.
    window.Rux?.schedule?.fit?.();
  }

  /* ── Moving a trip to another bus ──
     A drag writes one assignment's `bus_id`, or inserts the row for an empty
     slot. It moves vertically only; dates change in the
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
     A bar let go on another bus is drawn there at once, marked as saving,
     while its write is in flight; the database's answer takes the mark off
     with a ring, or draws the bar back with a notice. It takes no pointer
     until then, so nothing else can be asked of a row still being written. The read that follows is what the board ends on. */

  /* A mouse lifts a bar after 4px of vertical travel. A finger moves that far
     just landing, so it must stay within TOUCH_SLOP for TOUCH_HOLD_MS; travel
     first means a scroll, and the drag stands down for that gesture. Keyed off
     `pointerType`, not screen width, so a touchscreen laptop gets both. */
  const DRAG_THRESHOLD = 4;      // mouse: pixels of travel that mean "drag"
  const TOUCH_SLOP = 10;         // finger: how far it may wander while holding
  const TOUCH_HOLD_MS = 400;     // finger: how long it must hold to lift a bar
  const SETTLE_MS = 400;         // the longest a carried copy is waited on to settle into a row
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  /* The copy of a bar that rides with the pointer while the bar itself dims
     where it sits. It is placed by `top` alone, at the bar's own column, since
     a drag moves between buses and never between days. It lives in the pane,
     not the grid, so the grid dimming for the read does not dim it. */
  function ghostOf(bar, rect) {
    const ghost = bar.cloneNode(true);
    ghost.classList.remove('scheduler-bar--dragging');
    ghost.classList.add('scheduler-ghost');
    ghost.removeAttribute('aria-current');
    ghost.removeAttribute('role');
    ghost.removeAttribute('tabindex');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.style.left = `${rect.left}px`;
    ghost.style.top = `${rect.top}px`;
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    schEl.appendChild(ghost);
    return ghost;
  }

  // Android fires `contextmenu` at about the moment a hold completes. The bar
  // menu reads this to stay out of the way of a bar the finger is carrying.
  let touchDragging = false;

  const overlaps = (aStart, aSpan, bStart, bSpan) =>
    aStart < bStart + bSpan && bStart < aStart + aSpan;

  // Read off the rendered week rather than the data, because the rendered
  // week is exactly the days being asked about.
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

  /* Timed like a read: a hung write would otherwise leave the copy in its row
     and silent, with no way to tell it from a move that never happened. The
     row is asked back, because the board draws the move on this answer and an
     update that matched no row reports no error. */
  async function moveToBus(assignmentId, busId) {
    const { data, error } = await withTimeout(client.from('trip_assignments')
      .update({ bus_id: busId }).eq('id', assignmentId).select('id').then(r => r));
    if (error) throw new Error(error.message);
    if (!data?.length) throw new Error('That bus assignment is no longer there.');
  }

  /* An empty slot has no row to move, so dropping one on a bus writes the row:
     the trip, its route or leg, the slot's position and the bus. It returns the new row
     as a read would, for the held week, and undo takes the bus off that row,
     which draws the slot on the No bus row where it started. */
  async function fillSlot(tripId, place, position, busId) {
    const { data, error } = await withTimeout(client.from('trip_assignments')
      .insert({ trip_id: tripId, ...place, position, bus_id: busId })
      .select('id,bus_id,position,leg,route_id,active_roles,needs,vehicle_type').single().then(r => r));
    if (error) throw new Error(error.message);
    return { ...data, trip_drivers: [] };
  }

  // The bar of an assignment where it is drawn on a bus, or on none.
  const barOn = (assignmentId, busId) =>
    [...gridEl.querySelectorAll(`.scheduler-bar[data-assignment-id="${CSS.escape(String(assignmentId))}"]`)]
      .find(b => (b.dataset.busId || null) === (busId == null ? null : String(busId))) ?? null;

  /* Draws the board from the held week, with no read. Nothing is drawn under
     a bar in hand, whose drag is measuring these rows; that draw is owed, and
     the drag's ending pays it. A week in motion or one the held week does not
     cover is left to the read that is bringing it. */
  function drawHeld() {
    if (barsInHand) { drawOwed = true; return false; }
    if (weekMotion || !cached || !holds(cursor)) return false;
    drawOwed = false;
    render({ ...cached.data, weekStart: cursor, weekEnd: lastShown(cursor) });
    shown = cursor;
    return true;
  }

  // The read after a move. `show` draws as it starts, so it waits for a bar in hand too.
  function readAfterMove() {
    if (barsInHand) { liveHeld = true; return; }
    const inFlight = !!reading;
    show();
    // A read already in flight draws nothing as this one is queued behind it.
    if (inFlight) drawHeld();
  }

  /* Draws a move the database has taken, from the held week, and asks for the
     read that confirms it. Its bar takes one ring, the sign the move is saved.
     The answer is that bar, or nothing when its week is not on the board. */
  function drawBusMove(tripId, assignmentId, busId, row) {
    holdMove(tripId, assignmentId, busId, { row });
    if (barsInHand) drawOwed = true;
    readAfterMove();
    const bar = barOn(assignmentId, busId);
    if (!bar) return null;
    bar.classList.remove('scheduler-bar--saving');
    if (!reducedMotion.matches) {
      bar.classList.add('scheduler-bar--saved');
      bar.addEventListener('animationend', () => bar.classList.remove('scheduler-bar--saved'), { once: true });
    }
    return bar;
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
        toast('working', 'Putting the trip back…', `Moving it to ${label}.`);
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
        drawBusMove(tripId, assignmentId, backTo);
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
      if (down.button !== 0 || down.target.closest('[data-card-opener], [data-crew-overflow]')) return;
      // A press on the driver's name lifts the driver, not the trip.
      if (liftsFrom(down)) return;
      // The trip open in the editor is locked on the board, and so is a trip that is back.
      if (isEditorTrip(bar) || bar.classList.contains('scheduler-bar--back')) return;
      // One bar at a time. A bar that is saving takes no pointer, in app.css; this is for a finger already down on it.
      if (barsInHand || heldMoves.get(bar.dataset.assignmentId)?.saving) return;
      const touch = down.pointerType === 'touch';
      /* A mouse or pen press raises the bar at once, and a release where it is
         settles it back, both drawn by app.css. A finger raises nothing until
         its hold is done, because most touches on the board mean to scroll. */
      if (!touch) bar.classList.add('scheduler-bar--pressed');
      const startX = down.clientX, startY = down.clientY;
      const start = +bar.dataset.start, span = +bar.dataset.span;
      const fromBus = bar.dataset.busId || null;
      let moved = false, done = false, target = null, tracks = [], unassignedRow = null, hold = 0;
      // The copy that rides with the pointer, where the bar sat when it lifted,
      // how far below the bar's top the pointer holds it, and the bar's height
      // above its track's top, which is where it lands in any row.
      let ghost = null, origin = null, grip = 0, pad = 0;
      // What a drop's packing changed, as [element, property, value before], so a failed move can put it back.
      const packed = [];

      const clear = () => {
        for (const track of tracks) track.classList.remove('scheduler-track--drop', 'scheduler-track--warn');
      };

      /* While a finger carries a bar the page must not scroll under it.
         `touch-action` is read only when a gesture starts, so a non-passive
         `touchmove` stops the scroll; that works because the hold means the
         browser has not started scrolling. */
      const eat = ev => ev.preventDefault();

      // Picks the bar up, the same for both pointers.
      const lift = () => {
        moved = true;
        barsInHand++;
        unassignedRow = gridEl.querySelector('.scheduler-row--unassigned');
        if (unassignedRow?.hidden) { unassignedRow.hidden = false; unassignedRow.dataset.revealed = 'true'; }
        tracks = [...gridEl.querySelectorAll('.scheduler-track')];
        /* The press's rise comes off the bar at once, with no settle, so the
           bar is measured at its own size; the copy takes the rise over. */
        const pressed = bar.classList.contains('scheduler-bar--pressed');
        bar.style.transition = 'none';
        bar.classList.remove('scheduler-bar--pressed');
        origin = bar.getBoundingClientRect();
        bar.style.removeProperty('transition');
        grip = startY - origin.top;
        /* The first lane's height above the track, read off the source track's
           highest bar: this bar may sit in a lower lane, and the copy lands in
           the first lane of the row it is over, as the bar would. */
        const fromTop = bar.parentElement.getBoundingClientRect().top;
        pad = Math.min(...[...bar.parentElement.querySelectorAll(':scope > .scheduler-bar')].map(b => b.getBoundingClientRect().top - fromTop));
        bar.classList.add('scheduler-bar--dragging');
        ghost = ghostOf(bar, origin);
        placeBarOpen();
        document.body.style.cursor = 'grabbing';
        try { bar.setPointerCapture(down.pointerId); } catch { /* the pointer is already gone */ }
        if (touch) { touchDragging = true; bar.addEventListener('touchmove', eat, { passive: false }); }
        // A pressed bar was already up, so its copy starts lifted. Otherwise it
        // is lifted on the next frame, so the rise is drawn rather than arrived
        // at; a copy let go before that frame is already settling and stays flat.
        if (reducedMotion.matches) { /* flat, as app.css draws it */ }
        else if (pressed) ghost.classList.add('scheduler-ghost--lifted');
        else requestAnimationFrame(() => {
          if (ghost && !ghost.classList.contains('scheduler-ghost--settling')) ghost.classList.add('scheduler-ghost--lifted');
        });
      };

      // Where the copy sits over a row: at rest in its first lane.
      const restIn = track => track.getBoundingClientRect().top + pad;

      /* Packs a row as the board is about to draw it, with the carried bar on
         it or gone from it, so a drop and the draw that follows agree: the row
         takes its height, the bars already there move to their lanes, and the
         answer is the lane the carried bar gets. The order is `render`'s: the
         trips as read, a trip's legs in their order, a leg's buses
         by position, and `assignLanes` over that. */
      const pack = (track, carried) => {
        const rank = new Map([...panelIndex.trips.keys()].map((id, i) => [String(id), i]));
        const order = b => [rank.get(b.dataset.tripId) ?? 0, +b.dataset.legNumber || 1,
          b === bar || b.dataset.assignmentId ? 0 : 1, +b.dataset.slot || 0];
        const list = [...track.querySelectorAll(':scope > .scheduler-bar')].filter(b => b !== bar);
        if (carried) list.push(bar);
        const rows = list
          .map(b => ({ bar: b, order: order(b), place: { start: +b.dataset.start, span: +b.dataset.span } }))
          .sort((x, y) => { const i = x.order.findIndex((v, n) => v !== y.order[n]); return i < 0 ? 0 : x.order[i] - y.order[i]; });
        const lanes = rows.length ? assignLanes(rows) : 1;
        const set = (node, prop, value) => { packed.push([node, prop, node.style.getPropertyValue(prop)]); node.style.setProperty(prop, value); };
        track.classList.add('scheduler-track--packing');
        set(track, '--scheduler-lanes', lanes);
        for (const r of rows) if (r.bar !== bar) set(r.bar, '--scheduler-lane', r.lane);
        return rows.find(r => r.bar === bar)?.lane ?? 0;
      };
      const unpack = () => {
        for (const [node, prop, value] of packed.splice(0).reverse()) node.style.setProperty(prop, value);
      };

      /* Eases the copy to `top`, or to the lane that many down from it, flat
         again, and waits for app.css's transition to end, with SETTLE_MS as the
         ceiling should it never fire. A copy already there and flat, or reduced
         motion, waits for nothing. A lane is as tall as app.css makes one. */
      const settle = async (top, lane = 0) => {
        if (!ghost) return;
        const at = lane ? `calc(${top}px + ${lane} * (var(--scheduler-bar-h) + var(--scheduler-lane-gap)))` : `${top}px`;
        const moving = ghost.style.top !== at || ghost.classList.contains('scheduler-ghost--lifted');
        ghost.classList.remove('scheduler-ghost--lifted', 'scheduler-ghost--snapped');
        ghost.classList.add('scheduler-ghost--settling');
        ghost.style.top = at;
        if (!moving || reducedMotion.matches) return;
        await new Promise(r => {
          const t = setTimeout(r, SETTLE_MS);
          ghost.addEventListener('transitionend', () => { clearTimeout(t); r(); }, { once: true });
        });
      };

      // Takes the copy away and undims the bar; the card follows the selection again.
      const putDown = () => {
        ghost?.remove();
        ghost = null;
        bar.classList.remove('scheduler-bar--dragging', 'scheduler-bar--leaving');
        for (const track of tracks) track.classList.remove('scheduler-track--packing');
        if (unassignedRow?.dataset.revealed) { unassignedRow.hidden = true; delete unassignedRow.dataset.revealed; }
        placeBarOpen();
      };

      /* Every ending comes through here, once, and only a release writes. A
         gesture the browser cancels -- a scroll takeover, a system dialog, a
         button let go outside the window -- leaves the trip where it was. */
      const finish = async (release) => {
        if (done) return;
        done = true;
        // A press let go where it was settles back; a lifted bar already let its rise go.
        bar.classList.remove('scheduler-bar--pressed');
        if (hold) { clearTimeout(hold); hold = 0; }
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);
        bar.removeEventListener('touchmove', eat);
        touchDragging = false;
        if (!moved) return;              // a press that never lifted still selects
        barsInHand--;
        document.body.style.cursor = '';
        // The browser fires a click after this; suppress the one that would
        // otherwise toggle selection at the end of a drag.
        bar.addEventListener('click', e => e.stopPropagation(), { capture: true, once: true });
        const toBus = target ? (target.dataset.busId ?? null) : fromBus;
        // A lifted bar the browser cancels says so, because a drop that goes
        // quietly missing looks like a drag that does nothing.
        if (!release) toast('info', 'Trip not moved', 'The drag was interrupted. Try again.');
        if (!release || !target || toBus === fromBus) {
          // Let go nowhere: the copy slides home and comes away.
          clear();
          await settle(origin.top);
          putDown();
          // A draw or a read the drag held is owed now that nothing is in hand.
          if (drawOwed) drawHeld();
          if (liveHeld) setTimeout(liveRefresh, 0);
          return;
        }
        /* The copy settles flat into the row and the bar fades from where it
           sat, while the write is already on its way. Both rows are packed
           first, as the board will draw them, so the copy settles where its bar
           will be and nothing jumps when it is drawn. */
        let assignmentId = bar.dataset.assignmentId;
        const { tripId, leg, slot } = bar.dataset;
        const backTo = fromBus;
        const label = busLabel(fromBus);
        bar.classList.add('scheduler-bar--leaving');
        const lane = pack(target, true);
        pack(bar.parentElement, false);
        schEl.setAttribute('aria-busy', 'true');
        // An empty slot's row goes on its leg's first route, or by its word on a trip read without its legs.
        const slotTrip = panelIndex.trips.get(tripId);
        const slotRoute = shaped(slotTrip) ? SHAPE.legOf(slotTrip, bar.dataset.legKey)?.routes[0]?.id ?? null : null;
        const place = slotRoute ? { route_id: slotRoute } : { leg: leg || 'outbound' };
        const write = (assignmentId ? moveToBus(assignmentId, toBus) : fillSlot(tripId, place, +slot || 0, toBus))
          .then(made => ({ made }), e => ({ failed: String(e && e.message ? e.message : e) }));
        await settle(restIn(target), lane);
        /* The bar is drawn on its new bus now, marked as saving, and the copy
           comes away over it: from here the board is drawn from what is held,
           so another move or a change of week draws it right. An empty slot
           is held under a stand-in row until the database makes the real one. */
        const heldAs = assignmentId || `saving-${++standIns}`;
        holdMove(tripId, heldAs, toBus, assignmentId ? { saving: true } : {
          saving: true, standIn: true,
          row: { id: heldAs, bus_id: toBus, position: +slot || 0, leg: leg || 'outbound', route_id: slotRoute,
                 active_roles: null, needs: null, vehicle_type: null, trip_drivers: [] },
        });
        if (!drawHeld()) unpack();
        clear();
        putDown();
        const { made, failed } = await write;
        schEl.removeAttribute('aria-busy');
        if (failed) {
          /* The bar is drawn back where it was, and the week is read after,
             because a move that threw may still have landed. */
          dropMove(tripId, heldAs, fromBus);
          drawHeld();
          toast('error', 'Could not move that trip', failed);
          readAfterMove();
          return;
        }
        recordBusChange(tripId, fromBus, toBus);
        if (made) { fillStandIn(tripId, heldAs, made); assignmentId = made.id; }
        const landed = drawBusMove(tripId, assignmentId, toBus, made);
        refreshEditor(assignmentId);
        /* An undo is offered only for a bar still on the board: the week may
           have changed while the move was written, and an undo there would
           move a trip nobody is looking at. */
        if (landed) offerUndo(assignmentId, tripId, toBus, backTo, label);
        else toast('success', 'Trip moved');
      };

      const move = ev => {
        if (ev.pointerId !== down.pointerId) return;
        /* A mouse button let go before the bar lifted, where no pointerup
           reached the page. Once the bar has lifted the pointer is captured and
           its release always arrives, so `buttons` is not read again: a move
           that reports no button mid-drag must not drop the trip. */
        if (!touch && !moved && !(ev.buttons & 1)) { finish(false); return; }
        if (!moved) {
          const dx = Math.abs(ev.clientX - startX), dy = Math.abs(ev.clientY - startY);
          // A finger that travels before the hold is done means to scroll, so the
          // drag stands down. Both axes count: the board scrolls sideways too.
          if (touch) { if (dx > TOUCH_SLOP || dy > TOUCH_SLOP) finish(false); return; }
          if (dy < DRAG_THRESHOLD) return;
          lift();
        }
        ev.preventDefault();
        // Measured on every move, so a board wheeled while a bar is carried
        // still drops the trip on the row under the pointer.
        const next = tracks.find(t => {
          const rect = t.getBoundingClientRect();
          return ev.clientY >= rect.top && ev.clientY <= rect.bottom;
        }) ?? null;
        const sameRow = next && (next.dataset.busId ?? null) === fromBus;
        // Over a row the copy glides to where the bar would land; between rows
        // it follows the pointer, with no glide to lag behind it.
        if (ghost) {
          ghost.classList.toggle('scheduler-ghost--snapped', !!next);
          ghost.style.top = `${next ? (sameRow ? origin.top : restIn(next)) : ev.clientY - grip}px`;
        }
        if (next === target) return;
        clear();
        target = next;
        if (target && !sameRow) {
          target.classList.add(targetWarns(target, start, span) ? 'scheduler-track--warn' : 'scheduler-track--drop');
        }
      };

      const onUp = ev => { if (ev.pointerId === down.pointerId) finish(true); };
      const onCancel = ev => { if (ev.pointerId === down.pointerId) finish(false); };

      // A second finger that finishes its hold while a bar is in hand stands down.
      if (touch) hold = setTimeout(() => { hold = 0; if (barsInHand) finish(false); else lift(); }, TOUCH_HOLD_MS);

      /* Heard on the window, not the bar: a mouse is not captured until the bar
         lifts, so a press that leaves the bar first would otherwise never hear
         its release, and lift the bar the next time the cursor passed over it. */
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
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
  let panelIndex = { trips: new Map(), buses: new Map(), driversById: new Map(), statuses: new Map(), contacts: [], customers: [], locations: [] };
  let panelOpener = null;
  const panelDetails = document.getElementById('scheduler-panel-details');
  const panelFleet = document.getElementById('scheduler-panel-fleet');
  const panelBilling = document.getElementById('scheduler-panel-billing');
  const panelRoute = document.getElementById('scheduler-panel-route');
  const panelFiles = document.getElementById('scheduler-panel-files');
  // The checklist's drop-down in the panel head, its button and the list inside it.
  const panelSave = document.getElementById('scheduler-panel-save');
  const panelReset = document.getElementById('scheduler-panel-reset');
  const panelCancel = document.getElementById('scheduler-panel-cancel');

  const panelEl = document.getElementById('scheduler-panel');
  const tripEl = document.getElementById('scheduler-trip');
  const panelBody = document.getElementById('scheduler-panel-body');
  const panelTitle = document.getElementById('scheduler-panel-title');
  const panelTitleCollapsed = document.getElementById('scheduler-panel-title-collapsed');
  const panelRef = document.getElementById('scheduler-panel-ref');
  const pageEl = document.querySelector('.scheduler-page');
  // The selected trip's shortcut bar, placed and drawn by placeBarOpen.
  const barShortcuts = document.getElementById('scheduler-bar-shortcuts');
  const unsavedModal = document.getElementById('scheduler-unsaved-modal');

  /* A section can carry one control on its heading line, as the Quote and
     Miles menus do. The head is app markup rather than a `contained-list`
     header, because a section can hold form fields, not only list rows;
     every section uses it, so the controls share one right edge. */
  const section = (title, node, action) => {
    const wrap = el('div', 'scheduler-panel-section');
    // A titleless section still keeps the section's spacing above it.
    if (!title && !action) { wrap.appendChild(node); return wrap; }
    // A titleless section's control keeps the heading line, at its end.
    if (!title) {
      const bar = el('div', 'scheduler-panel-section__head');
      bar.append(action);
      wrap.append(bar, ...(node ? [node] : []));
      return wrap;
    }
    /* A switch's heading is its label, so the words flip it too: a label
       forwards its click to the switch's button. */
    const sw = action?.querySelector('.rux--toggle__button');
    const head = el(sw ? 'label' : 'div', 'scheduler-panel-section__title', title);
    if (sw) head.htmlFor = sw.id;
    if (!action) { wrap.append(head, node); return wrap; }
    const bar = el('div', 'scheduler-panel-section__head');
    bar.append(head, action);
    wrap.append(bar, ...(node ? [node] : []));
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

  /* Fields that belong together in a tile of their own, as one contact's do:
     the tile on the panel's next layer and its fields a layer above that, so
     a field still stands out from the tile it sits in. */
  const fieldTile = node => {
    const layer = el('div', 'rux--layer-two');
    const tile = el('div', 'rux--tile');
    const inner = el('div', 'rux--layer-three');
    inner.appendChild(node);
    tile.appendChild(inner);
    layer.appendChild(tile);
    return layer;
  };

  /* A run of fields under one heading is a fieldset, so a screen reader names
     each field with its group, "Booking contact, Name", and the labels need not
     repeat the heading. The section's spacing is on a wrapper, so the
     fieldset stays Carbon's own. */
  const fieldGroup = (title, ...nodes) => {
    const set = el('fieldset', 'rux--fieldset');
    const stack = el('div', 'rux--stack-vertical rux--stack-scale-5');
    stack.append(...nodes);
    set.append(el('legend', 'scheduler-panel-section__title', title), stack);
    const wrap = el('div', 'scheduler-panel-section');
    wrap.appendChild(set);
    return wrap;
  };

  /* ── A list of records ──
     Quote lines, billing entries, stops, vehicles and files share this list and
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
    const icon = svgUse('#m-add', '16', '0 0 32 32');
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
       it names them, as Trip contacts' Add contact and Remove last contact,
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
       space below cannot hold it, the theme's gap off it either way. */
    const gap = window.Rux?.floatGap?.(menu) ?? 0;
    const left = Math.max(0, Math.min(box.right - width, window.innerWidth - width));
    const top = box.bottom + gap + height <= window.innerHeight
      ? box.bottom + gap
      : Math.max(0, box.top - gap - height);
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
  /* A row of a list. Its menu is Edit and Remove, or `items` in their place
     for a list that also moves its rows. */
  /* With `context`, the row has no menu button, which gives its line the
     room: its `items`, if any, open where it is right-clicked, or held on a
     touch screen, which on iOS sends no right-click of its own. A hold that
     opens the menu keeps its tap from opening the row as well. */
  let itemHints = 0;
  /* A press's actions on its right-click, or a hold on a touch screen,
     which on iOS sends no right-click of its own. `onHold` is told when a
     hold opens them, so the press's tap that follows can be ignored. */
  const contextItems = (open, items, title, onHold) => {
    // With no button to find, a screen reader is told how the actions open.
    const hint = el('span', 'rux--visually-hidden', 'Right-click, hold, or press the menu key for actions.');
    hint.id = `scheduler-item-hint-${++itemHints}`;
    open.setAttribute('aria-describedby', hint.id);
    open.appendChild(hint);
    const showItems = point => openItemsMenu(open, items, `Actions for ${title}`, point);
    // Kept from the page's own menu handling, which would shut it at once.
    open.addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); showItems(e); });
    open.addEventListener('pointerdown', down => {
      if (down.pointerType !== 'touch' || !down.isPrimary) return;
      const mine = e => e.pointerId === down.pointerId;
      const move = e => {
        if (mine(e) && Math.hypot(e.clientX - down.clientX, e.clientY - down.clientY) > TOUCH_SLOP) end();
      };
      const up = e => { if (mine(e)) end(); };
      const end = () => {
        clearTimeout(hold);
        open.removeEventListener('pointermove', move);
        open.removeEventListener('pointerup', up);
        open.removeEventListener('pointercancel', up);
      };
      const hold = setTimeout(() => { end(); onHold?.(); showItems(down); }, TOUCH_HOLD_MS);
      open.addEventListener('pointermove', move);
      open.addEventListener('pointerup', up);
      open.addEventListener('pointercancel', up);
    });
  };
  const listRow = ({ name, meta, much, tag, lead, title, edit, remove, removeLabel,
                    open: openRow = edit, openLabel = `Edit ${title}`, editText, removeText, items, context }) => {
    const li = el('li', 'rux--layer-two scheduler-item');
    const open = el('button', 'rux--tile rux--tile--clickable scheduler-item__open');
    open.type = 'button';
    const top = el('span', 'scheduler-item__line');
    // `lead` is a round mark before the name, such as a stop's number.
    if (lead) top.appendChild(el('span', 'scheduler-item__mark', lead));
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
    let held = false;
    open.addEventListener('click', e => {
      if (held) { held = false; e.preventDefault(); return; }
      openRow(e);
    });
    if (context) {
      li.classList.add('scheduler-item--context');
      li.append(open);
      if (!items) return li;
      // A new press starts unheld; a hold that opens the menu marks it.
      open.addEventListener('pointerdown', () => { held = false; });
      contextItems(open, items, title, () => { held = true; });
      return li;
    }
    const more = el('button', 'rux--btn rux--btn--ghost rux--btn--icon-only rux--layout--size-sm rux--menu-button__trigger scheduler-item__menu');
    more.type = 'button';
    more.setAttribute('aria-haspopup', 'true');
    more.setAttribute('aria-expanded', 'false');
    // The trigger's name is the record's, so two records' menus are told apart.
    more.setAttribute('aria-label', `Actions for ${title}`);
    more.appendChild(svgUse('#m-more_vert', '16', '0 0 32 32'));
    more.lastChild.setAttribute('class', 'rux--btn__icon');
    more.addEventListener('click', () => (items
      ? openItemsMenu(more, items, `Actions for ${title}`)
      : openRowMenu(more, { edit, remove, removeLabel, editText, removeText })));
    li.append(open, more);
    return li;
  };

  /* ── A menu of any items ──
     The row menu above has two fixed items. The Buses tab's bus and status
     menus have more, so this menu is rebuilt from its items on every open and
     placed the way the row menu is. An item with `checked` is a radio item,
     and an item with `items` holds them as a submenu of radio items, marked
     up as the bar menu's Color is, which menu.js opens. */
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
    const gap = window.Rux?.floatGap?.(menu) ?? 0;
    const left = Math.max(0, Math.min(box.right - width, window.innerWidth - width));
    const top = box.bottom + gap + height <= window.innerHeight ? box.bottom + gap : Math.max(0, box.top - gap - height);
    menu.style.insetInlineStart = `${Math.round(left)}px`;
    menu.style.insetBlockStart = `${Math.round(top)}px`;
  };
  /* `point`, a pointer event, places the menu where the pointer is, for a
     right-click or a hold; without it the menu drops from `trigger`. */
  // A section heading's ⋮ trigger, which `openItemsMenu` opens.
  const menuTrigger = (id, label) => {
    const btn = el('button', 'rux--btn rux--btn--ghost rux--btn--icon-only rux--layout--size-sm rux--menu-button__trigger');
    btn.type = 'button';
    btn.id = id;
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', label);
    btn.title = label;
    btn.appendChild(svgUse('#m-more_vert', '16', '0 0 32 32'));
    btn.lastChild.setAttribute('class', 'rux--btn__icon');
    return btn;
  };
  const openItemsMenu = (trigger, items, label, point) => {
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
    const radio = items.some(i => i.checked !== undefined || i.items);
    menu.className = radio
      ? 'rux--menu rux--menu--sm rux--menu--open rux--menu--shown rux--menu--with-icons rux--menu--with-selectable-items'
      : 'rux--menu rux--menu--sm rux--menu--open rux--menu--shown';
    menu.setAttribute('aria-label', label);
    const build = (it, radio) => {
      const li = el('li', it.danger ? 'rux--menu-item rux--menu-item--danger' : 'rux--menu-item');
      // A plain item among radio items keeps the check's column, so the labels line up.
      const choice = radio && it.checked !== undefined;
      li.setAttribute('role', choice ? 'menuitemradio' : 'menuitem');
      if (choice) li.setAttribute('aria-checked', String(!!it.checked));
      li.tabIndex = -1;
      if (it.disabled) {
        li.classList.add('rux--menu-item--disabled');
        li.setAttribute('aria-disabled', 'true');
      }
      if (radio) {
        const check = el('div', 'rux--menu-item__selection-icon');
        if (it.checked) check.appendChild(svgUse('#m-check', '16', '0 0 20 20'));
        li.appendChild(check);
      }
      if (it.icon) {
        const icon = el('div', 'rux--menu-item__icon');
        icon.appendChild(it.icon);
        li.appendChild(icon);
      }
      li.appendChild(el('div', 'rux--menu-item__label', it.label));
      if (it.items) {
        li.setAttribute('aria-haspopup', 'true');
        li.setAttribute('aria-expanded', 'false');
        const caret = el('div', 'rux--menu-item__shortcut');
        caret.appendChild(svgUse('#m-arrow_right', '16', '0 0 32 32'));
        const sub = el('ul', 'rux--menu rux--menu--sm rux--menu--with-icons rux--menu--with-selectable-items');
        sub.setAttribute('role', 'menu');
        sub.setAttribute('aria-label', it.label);
        sub.tabIndex = -1;
        const group = el('li', 'rux--menu-item-radio-group');
        group.setAttribute('role', 'none');
        const choices = el('ul');
        choices.setAttribute('role', 'group');
        choices.setAttribute('aria-label', it.label);
        choices.append(...it.items.map(child => build(child, true)));
        group.appendChild(choices);
        sub.appendChild(group);
        li.append(caret, sub);
        return li;
      }
      li.addEventListener('click', () => {
        if (it.disabled) return;
        window.Rux?.menu?.close?.(menu);
        it.run();
      });
      return li;
    };
    menu.replaceChildren(...items.map(it => build(it, radio)));
    /* A menu opened from inside a window names its trigger, so the overlay
       stack keeps the window open under it rather than taking the press on
       the menu as a press outside the window, and Design places it against
       that trigger, then and on every scroll or resize; placing it here too
       made it jump from one place to the other. Elsewhere it is placed here,
       at the pointer or under its trigger, and opened on its own. */
    const inWindow = !!trigger.closest?.('.rux--modal');
    if (inWindow) {
      menu.hidden = false;
      menu.style.position = 'fixed';
    } else if (point) {
      menu.hidden = false;
      menu.style.position = 'fixed';
      const { width, height } = menu.getBoundingClientRect();
      const fit = (at, size, max) => (at + size <= max ? at : Math.max(0, at - size));
      menu.style.insetInlineStart = `${Math.round(fit(point.clientX, width, window.innerWidth))}px`;
      menu.style.insetBlockStart = `${Math.round(fit(point.clientY, height, window.innerHeight))}px`;
    } else {
      placeMenuAt(menu, trigger);
    }
    window.Rux?.menu?.open?.(menu, inWindow ? trigger : null);
    trigger.setAttribute('aria-expanded', 'true');
    itemsMenuTrigger = trigger;
  };

  /* ══ The Buses tab ══
     How many buses each leg needs, the bus on each, and who fills each bus's
     four seats, as the database stores them: `bus_count` and `return_bus_count` on
     the trip, a `trip_assignments` row per bus, a `trip_drivers` row per
     filled seat, and each seat's status through `sync_trip_driver_statuses`.
     The tab edits a model, `editing.fleet`, and Save writes the difference
     from `editing.fleetBefore` by id. A seat's miles and pay are typed on the
     Billing tab. */
  const MAX_BUSES = 20;
  const SEAT_LABEL = {
    driver: 'Driver', 'co-driver': 'Co-driver',
    'relief-start': 'Relief at start', 'relief-end': 'Relief at end',
  };
  const RELIEF = new Set(['relief-start', 'relief-end']);
  let fleetSeq = 0;

  const blankSeat = () => ({ on: false, rowId: null, driverId: null, reportTime: null, note: null, miles: null, pay: null, status: 'off', statusDirty: false });
  /* A vehicle not yet on a row. `seed` is the needs and type it starts with:
     an empty slot of a trip takes the trip's, so it still asks for them, and
     only a change from them makes it worth a row. */
  const blankBus = (seed = {}) => {
    const seats = Object.fromEntries(ROLES.map(r => [r.role, blankSeat()]));
    seats.driver.on = true;
    const needs = needsObject(needIds(seed.needs));
    const vehicleType = seed.vehicleType ?? null;
    return { key: `new-${++fleetSeq}`, id: null, position: null, busId: null, pickupAt: null, yardDepartAt: null, yardReturnAt: null, seats,
      needs, vehicleType, seed: { needs: { ...needs }, vehicleType } };
  };

  // One bus as the trip holds it: the first row per seat is the seat, and a
  // seat is on when `active_roles` says so, as the bar reads it.
  function fleetBusOf(trip, a, statuses) {
    const bus = blankBus();
    bus.key = `a-${a.id}`;
    bus.id = a.id;
    bus.position = a.position ?? null;
    bus.busId = a.bus_id ?? null;
    bus.pickupAt = a.pickup_at ?? null;
    bus.yardDepartAt = a.actual_yard_depart_at ?? null;
    bus.yardReturnAt = a.actual_yard_return_at ?? null;
    bus.needs = needsObject(needIds(a.needs));
    bus.vehicleType = a.vehicle_type ?? null;
    const on = activeRolesOf(a);
    const leg = legKeyOfVehicle(trip, a);
    for (const r of ROLES) {
      const seat = bus.seats[r.role];
      seat.on = on.has(r.role);
      const row = (a.trip_drivers || []).find(d => (d.role || 'driver') === r.role);
      if (!row) continue;
      seat.rowId = row.id ?? null;
      seat.driverId = row.driver_id ?? null;
      seat.reportTime = hhmmOrNull(row.report_time);
      seat.note = row.instructions ?? null;
      seat.miles = row.miles ?? null;
      seat.pay = row.pay ?? null;
      const saved = row.driver_id ? statuses?.get(statusKey(trip.id, row.driver_id, leg, r.role)) : null;
      const value = saved ? saved.status : on.get(r.role);
      seat.status = DRIVER_STATUSES.some(s => s.value === value) ? value : 'off';
    }
    return bus;
  }

  // Each leg's buses in position order, each on the leg its route is on,
  // padded with empty buses up to its count, which ask for what the trip does.
  function fleetOf(trip, creating) {
    const seed = { needs: needsObject(requirementsOf(trip).filter(isVehicleNeed)), vehicleType: trip.vehicle_type ?? null };
    const legs = {};
    for (const leg of editing.legs) {
      const buses = (creating ? [] : trip.trip_assignments || [])
        .filter(a => legKeyOfVehicle(trip, a) === leg.key)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map(a => fleetBusOf(trip, a, panelIndex.statuses));
      const count = leg.busCount || editing.legs[0].busCount || 1;
      while (buses.length < Math.min(MAX_BUSES, Math.max(1, count))) buses.push(blankBus(seed));
      legs[leg.key] = buses;
    }
    if (creating && createBusId) legs[screenKey()][0].busId = createBusId;
    return legs;
  }

  const cloneFleet = legs => JSON.parse(JSON.stringify(legs));
  const seatFilled = s => s.on && !!s.driverId;
  const sameNeeds = (a, b) => needIds(a).join() === needIds(b).join();
  // A bus with nothing on it is only a count, so it gets no row until it has:
  // no bus, no driver, no other seat, and the needs and type it started with.
  const busEmpty = b => !b.busId && ROLES.every(r => r.role === 'driver' || !b.seats[r.role].on)
    && !seatFilled(b.seats.driver)
    && sameNeeds(b.needs, b.seed?.needs) && (b.vehicleType ?? null) === (b.seed?.vehicleType ?? null);

  // `active_roles` as it is stored: the driver first, then each seat that
  // is on, with its status after a colon unless it is Not sent.
  const activeRolesValue = bus => ROLES
    .filter(r => r.role === 'driver' || bus.seats[r.role].on)
    .map(r => (bus.seats[r.role].status !== 'off' ? `${r.role}:${bus.seats[r.role].status}` : r.role));

  /* THE EDITOR'S LEGS, `editing.legs`, in date order, each held by its key:
     its id once saved, and `new:outbound` for a new trip's one leg until its
     first save. Each holds its saved days, Way, bus count and old word, null
     on a leg with none. The editor shows one leg at a time, the leg on
     screen, whose days and Way the form holds; its vehicles and route are
     kept by key, and Save writes each leg's row and rows by its ids,
     `legIdsOf`. Its hotel, contacts and quote lines still name a leg by its
     old word, `wordOfLeg`. */
  const legHeld = key => editing?.legs?.find(l => l.key === key) ?? null;
  const legKeyOf = word => editing?.legs?.find(l => l.word === (word || 'outbound'))?.key ?? `new:${word || 'outbound'}`;
  const outKey = () => legKeyOf('outbound');
  const backKey = () => legKeyOf('return');
  const isBackKey = key => key != null && legHeld(key)?.word === 'return';
  const wordOfLeg = key => (key == null ? null : legHeld(key)?.word ?? null);
  // The leg on screen's key: the one the bar or link opened, or the first.
  const screenKey = () => (legHeld(editing?.legKey) ? editing.legKey : editing?.legs?.[0]?.key ?? null);
  // The leg on screen's Way, Round trip or One way, as its field holds it.
  const wayNow = () => (document.getElementById('scheduler-f-way')?.value === 'one_way' ? 'one_way' : 'round_trip');
  // A leg's Way and days as the editor holds them: the form's for the leg on screen, the saved ones for any other.
  const legKindNow = key => (key === screenKey() ? wayNow() : legHeld(key)?.kind ?? 'round_trip');
  function legDaysNow(key) {
    if (key !== screenKey()) {
      const l = legHeld(key);
      return l?.start ? { from: l.start, to: l.end ?? l.start } : null;
    }
    const from = isoOrNull(document.getElementById('scheduler-f-start')?.value ?? '');
    return from ? { from, to: isoOrNull(document.getElementById('scheduler-f-end')?.value ?? '') ?? from } : null;
  }
  /* A SPLIT, the drop-off and the pickup, by trip-shape.js's rule: a first
     leg that is one way, and a later leg. `trips.trip_type` is written from
     the legs by it while pages still read it. */
  const splitNow = () => (editing?.legs?.length ?? 0) > 1 && legKindNow(editing.legs[0].key) === 'one_way';
  const tripTypeNow = () => (splitNow() ? SPLIT : legKindNow(editing?.legs?.[0]?.key));
  /* THE LEG ON SCREEN, on a trip of more than one: the bar's or link's, and
     the switch over the tabs moves between them; the Route tab, the Buses
     tab, the trip contacts and a new itinerary are that leg's. Null on a
     trip of one leg, where the editor shows the whole trip. */
  const legOnScreen = () => (!editing?.creating && (editing?.legs?.length ?? 0) > 1 ? screenKey() : null);
  // The leg on screen's old word, for what still goes by it: its files, its contacts and a draft's.
  const viewWord = () => (legOnScreen() == null ? null : wordOfLeg(legOnScreen()) ?? 'outbound');
  const fleetLegs = () => (editing?.legs ?? []).map(l => l.key);
  /* A leg's name on a trip of more than one: a split's Drop-off and Pickup,
     and any other leg its first day. `legPhrase` is the same in a sentence. */
  function legTitle(key) {
    if (splitNow()) return key === editing.legs[0].key ? 'Drop-off' : 'Pickup';
    return legDay(legDaysNow(key)?.from) || 'New leg';
  }
  const legPhrase = key => (splitNow() ? `the ${legTitle(key).toLowerCase()} leg` : `the leg on ${legTitle(key)}`);
  // The legs not on screen as Save would write them, for the dirty check: each one's key, days and Way.
  const otherLegsValue = () => JSON.stringify((editing?.legs ?? []).filter(l => l.key !== screenKey())
    .map(l => [l.key, l.start ?? null, l.end ?? null, l.kind]));
  /* WHERE SAVE PUTS A ROW: a stop or a vehicle on its leg's first route,
     and a quote line or a file on its leg, each by id. A leg this Save made
     has the ids its insert read back; a leg not saved yet, or a trip read
     without its legs, goes by the old word, which the database matches to
     the leg. */
  function legIdsOf(key) {
    if (editing?.madeLegs?.[key]) return editing.madeLegs[key];
    const leg = shaped(editing?.trip) ? SHAPE.legOf(editing.trip, key) : null;
    return leg ? { legId: leg.id, routeId: leg.routes[0]?.id ?? null } : null;
  }
  const onRoute = key => {
    const routeId = legIdsOf(key)?.routeId;
    return routeId ? { route_id: routeId } : { leg: wordOfLeg(key) };
  };
  // A quote line names its leg by its word, or none when it is the trip's.
  const lineOnLeg = row => {
    if (!('leg' in row) || !row.leg) return row;
    const legId = legIdsOf(legKeyOf(row.leg))?.legId;
    if (!legId) return row;
    const { leg, ...rest } = row;
    return { ...rest, leg_id: legId };
  };

  /* THE TRIP-WIDE NEEDS SUM UP ITS VEHICLES, the ones on the legs it has, so
     the print pages and the connector, which read the trip's columns,
     see every need any vehicle has. Null before the tab is built. */
  const fleetVehicles = () => (editing?.fleet ? fleetLegs().flatMap(leg => editing.fleet[leg]) : null);
  const fleetNeedUnion = () => {
    const v = fleetVehicles();
    return v ? new Set(v.flatMap(b => needIds(b.needs))) : null;
  };

  /* A TRIP'S LEGS ARE SAVED ON THEIR OWN ROWS. `EDITS` reads the leg on
     screen's days and Way, the Buses tab its bus count, and each leg's hotel
     by its old word, into keys the Done rules and the history work in; Save
     takes them out of the trip's write and writes each leg's row instead,
     a new trip's one leg as an insert. The database keeps the trip's own
     start_date and end_date from the legs, and refuses a page that still
     sends an old leg column. */
  const LEG_COLUMNS = ['start_date', 'end_date', 'leg_kind', 'other_legs', 'bus_count',
    'hotel_booked_outbound', 'hotel_booked_return', 'hotel_itinerary_number_outbound', 'hotel_itinerary_number_return'];
  // Each leg row's writes, taking the leg columns out of `row`.
  function legWork(row, creating) {
    const given = Object.fromEntries(LEG_COLUMNS.filter(k => k in row).map(k => [k, row[k]]));
    for (const k of LEG_COLUMNS) delete row[k];
    const pick = (key, saved) => (key in given ? given[key] : saved);
    const ops = [];
    for (const leg of editing.legs) {
      const saved = creating ? null : (editing.trip.trip_legs || []).find(l => l.id === leg.key) ?? null;
      const onScreen = leg.key === screenKey();
      // The leg on screen is the form's, and any other is as `editing.legs` holds it.
      const start = onScreen ? pick('start_date', saved?.start_date ?? null) : leg.start;
      const word = leg.word;
      const wanted = {
        kind: onScreen ? pick('leg_kind', saved?.kind ?? 'round_trip') : leg.kind,
        start_date: start,
        end_date: (onScreen ? pick('end_date', saved?.end_date ?? null) : leg.end) ?? start,
        bus_count: onScreen ? pick('bus_count', saved?.bus_count ?? null)
          : saved?.bus_count ?? editing.fleet?.[leg.key]?.length ?? null,
        hotel_booked: !!(word ? pick(`hotel_booked_${word}`, saved?.hotel_booked) : saved?.hotel_booked),
        hotel_itinerary_number: (word ? pick(`hotel_itinerary_number_${word}`, saved?.hotel_itinerary_number) : saved?.hotel_itinerary_number) ?? null,
      };
      // A leg not saved yet is made once it has a day.
      if (!saved) { if (start) ops.push({ op: 'insert', key: leg.key, row: { leg: word, ...wanted } }); continue; }
      const patch = Object.fromEntries(Object.entries(wanted).filter(([k, v]) => !same(v, saved[k] ?? null)));
      if (Object.keys(patch).length) ops.push({ op: 'update', id: saved.id, row: patch });
    }
    return ops;
  }

  /* Save's work for the fleet, or null before the tab was built. Positions
     are rewritten only on a leg whose buses were added, removed or reordered,
     so an older trip numbered with gaps opens with nothing to save. The
     counts compare with the buses the tab opened on, so a trip whose count
     and rows disagree opens unchanged too. */
  function fleetWork() {
    const now = editing?.fleet;
    const before = editing?.fleetBefore;
    if (!now || !before) return null;
    const work = { trip: {}, legs: [], statuses: false, work: false };
    // The Buses tab lists the leg on screen's vehicles, so only its count moves.
    const count = now[screenKey()].length;
    if (count !== editing.fleetCounts[screenKey()] || editing.creating) work.trip.bus_count = count;
    for (const leg of fleetLegs()) {
      const buses = now[leg];
      const old = before[leg];
      const oldById = new Map(old.filter(b => b.id).map(b => [b.id, b]));
      const keptIds = new Set(buses.filter(b => b.id).map(b => b.id));
      const renumber = buses.length !== old.length || buses.some((b, i) => b.key !== old[i]?.key);
      const ops = { leg, inserts: [], updates: [], deletes: old.filter(b => b.id && !keptIds.has(b.id)).map(b => b.id) };
      buses.forEach((b, i) => {
        const prev = b.id ? oldById.get(b.id) : null;
        const roles = activeRolesValue(b);
        if (!prev) {
          if (!busEmpty(b)) {
            ops.inserts.push({ bus: b, row: { position: i, bus_id: b.busId, active_roles: roles,
              needs: needsObject(needIds(b.needs)), vehicle_type: b.vehicleType ?? null } });
          }
          return;
        }
        const patch = {};
        if (!same(b.busId, prev.busId)) patch.bus_id = b.busId;
        // Another bus did not reach the pickup, or leave and come back to the
        // yard, when this one did.
        const kept = same(b.busId, prev.busId);
        const pickupAt = kept ? b.pickupAt ?? null : null;
        if (!same(pickupAt, prev.pickupAt)) patch.pickup_at = pickupAt;
        const yardDepartAt = kept ? b.yardDepartAt ?? null : null;
        if (!same(yardDepartAt, prev.yardDepartAt)) patch.actual_yard_depart_at = yardDepartAt;
        const yardReturnAt = kept ? b.yardReturnAt ?? null : null;
        if (!same(yardReturnAt, prev.yardReturnAt)) patch.actual_yard_return_at = yardReturnAt;
        if (!sameNeeds(b.needs, prev.needs)) patch.needs = needsObject(needIds(b.needs));
        if ((b.vehicleType ?? null) !== (prev.vehicleType ?? null)) patch.vehicle_type = b.vehicleType ?? null;
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
            if (!same(s.miles, p.miles)) sp.miles = s.miles;
            if (!same(s.pay, p.pay)) sp.pay = s.pay;
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
    /* Any change to who sits where, or a status picked here, sends the crew.
       A seat's miles and pay and a bus's pickup arrival and yard times are
       the close-out filling in, and send nothing. */
    const SAMSARA_TIMES = new Set(['pickup_at', 'actual_yard_depart_at', 'actual_yard_return_at']);
    const statusPicked = fleetLegs().some(leg => now[leg].some(b => ROLES.some(r => b.seats[r.role].statusDirty)));
    const onlyMiles = s => s.op === 'update' && Object.keys(s.patch).every(k => k === 'miles' || k === 'pay');
    const moved = work.legs.some(ops => ops.inserts.length || ops.deletes.length
      || ops.updates.some(u => Object.keys(u.patch).some(k => !SAMSARA_TIMES.has(k)) || !u.seats.every(onlyMiles)));
    work.statuses = moved || statusPicked;
    work.work = Object.keys(work.trip).length > 0 || work.legs.length > 0 || work.statuses;
    return work;
  }

  const seatRow = (role, s) => ({ driver_id: s.driverId, role, report_time: s.reportTime, instructions: s.note, miles: s.miles ?? null, pay: s.pay ?? null });

  /* Whether the Buses tab holds changes someone made. A new trip's fleet is all
     work to Save, which writes its count and its cell's bus however untouched,
     so for one the question is whether the tab moved from how it opened. */
  const fleetChanged = () => (editing?.creating
    ? JSON.stringify(editing.fleet) !== JSON.stringify(editing.fleetBefore)
    : !!fleetWork()?.work);
  // Whether it changes who or what goes, which a seat's miles alone does not.
  const fleetMoved = () => {
    const work = fleetWork();
    return !!work && (Object.keys(work.trip).length > 0 || work.statuses);
  };

  // A driver in two seats of one leg is the one thing that blocks Save.
  function fleetDuplicates(fleet = editing?.fleet) {
    const dup = new Set();
    for (const leg of fleetLegs()) {
      const seen = new Set();
      for (const b of fleet?.[leg] ?? []) {
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
          .insert({ trip_id: tripId, ...onRoute(ops.leg), ...ins.row }).select('id').single());
        const rows = ROLES.filter(r => seatFilled(ins.bus.seats[r.role]))
          .map(r => ({ assignment_id: made.id, ...seatRow(r.role, ins.bus.seats[r.role]) }));
        if (rows.length) await write('its drivers', client.from('trip_drivers').insert(rows));
      }
    }
    if (!work.statuses) return;
    const list = fleetLegs().flatMap(leg => editing.fleet[leg].flatMap(b => ROLES
      .filter(r => seatFilled(b.seats[r.role]))
      .map(r => ({ driverId: b.seats[r.role].driverId,
                   ...(legIdsOf(leg)?.legId ? { legId: legIdsOf(leg).legId } : { leg: wordOfLeg(leg) }), role: r.role,
                   status: b.seats[r.role].status, dirty: b.seats[r.role].statusDirty }))));
    await write('its driver statuses', client.rpc('sync_trip_driver_statuses', { p_trip_id: tripId, p_statuses: list }));
  }

  /* ── What clashes ──
     Read when the tab is built and again when it is chosen, for the trip's
     dates as the Details tab holds them, so a picker can say which buses and
     drivers are taken. A clash warns; it never stops a pick. */
  let fleetClashes = null;
  let fleetClashKey = '';

  const fleetLegDates = legDaysNow;

  // The trips, time off and days out around a range, as clashes.js reads them.
  const readNearby = (lo, hi) => withTimeout(window.SchedulerClashes.readNearby(client, lo, hi));

  async function loadFleetClashes() {
    if (!client || !editing?.fleet) return;
    // The dates as the form holds them, with the times the trip was saved
    // with, which say the days each leg takes.
    const saved = editing.id != null ? legsOf(panelIndex.trips.get(editing.id) ?? {}) : [];
    const ranges = Object.fromEntries(fleetLegs().map(l => {
      const r = fleetLegDates(l);
      const times = saved.find(x => x.key === l);
      return [l, r && { from: r.from, ends: r.to, depart: times?.depart ?? null, back: times?.back ?? null,
        ...takes(r.from, r.to, times) }];
    }));
    const all = Object.values(ranges).filter(Boolean);
    if (!all.length) return;
    const key = JSON.stringify(ranges);
    if (key === fleetClashKey) return;
    fleetClashKey = key;
    const forTrip = editing;
    let nearby;
    try {
      nearby = await readNearby(all.map(r => r.from).sort()[0], all.map(r => r.to).sort().at(-1));
    } catch {
      fleetClashKey = '';
      return;
    }
    if (editing !== forTrip) return;
    fleetClashes = Object.fromEntries(fleetLegs()
      .map(leg => [leg, fitFor(nearby, ranges[leg], { tripId: editing.id })]));
    drawFleet();
  }

  const clashText = (leg, kind, id) => (id == null ? '' : (fleetClashes?.[leg]?.[kind].get(id) ?? []).join(' · '));
  // A seated driver's licence or medical card that runs out before the leg ends, in words.
  const seatLapse = (leg, id) => {
    const range = fleetClashes?.[leg]?.range;
    const who = id == null ? null : panelIndex.driversById.get(id);
    return range && who ? cardLapse(who, range) : '';
  };

  // What a vehicle asks for that its bus lacks, in the bar's words.
  function busLacks(busRow, vehicle) {
    if (!busRow || !vehicle) return [];
    return [wrongType(vehicle.vehicleType, busRow), ...needIds(vehicle.needs).map(id => shortfall(id, busRow))]
      .filter(Boolean);
  }

  /* ── The pickers ──
     Carbon's combo box, as the contact search builds it, over the active
     buses or drivers plus whoever the trip already has. Each option carries
     its id, its name as the text a pick writes, and a second line with what
     clashes. The field's own warning or error sits under it in Carbon's
     requirement. */
  function fleetPicker({ id, label, options, current, warn, error, placeholder, warnIcon = true }) {
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
      const tick = svgUse('#m-check', '16', '0 0 20 20');
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
      /* A seat's field ends in its status, so a warning there is said in
         words under it alone, as the vehicle's tile says it, rather than as a
         second icon beside the status. */
      if (error || warnIcon) {
        const icon = svgUse(error ? '#m-report-fill' : '#m-warning-fill', '16', '0 0 32 32');
        icon.setAttribute('class', error
          ? 'rux--list-box__invalid-icon'
          : 'rux--list-box__invalid-icon rux--list-box__invalid-icon--warning');
        field.appendChild(icon);
      }
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
        id: b.id, name: vehicleName(b),
        detail: [b.capacity ? `${b.capacity} seats` : null, b.type].filter(Boolean).join(' · '),
        clash: clashText(leg, 'buses', b.id),
      });
    }
    return out;
  };

  const fleetDriverOptions = (leg, currentId) => rankDrivers([...panelIndex.driversById.values()]
    .filter(d => !d.status || d.status === 'active' || String(d.id) === String(currentId)), fleetClashes?.[leg] ?? null)
    .map(r => ({
      id: r.d.id, name: r.d.name || r.d.short_name || 'Unnamed driver',
      detail: r.detail, clash: [r.busy, r.lapse, r.near].filter(Boolean).join(' · '),
    }));

  // The editor and bar share Carbon's icon and semantic status class.
  const statusIcon = value => {
    const status = DRIVER_STATUSES.find(st => st.value === value);
    const svg = svgUse(status.icon, '16', '0 0 32 32');
    svg.setAttribute('class', `${status.indicator} scheduler-status-icon`);
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
    const btn = el('button', 'rux--btn rux--btn--ghost rux--btn--icon-only rux--layout--size-md scheduler-fleet-status');
    btn.type = 'button';
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');
    const name = `Vehicle ${n} ${SEAT_LABEL[role].toLowerCase()} status`;
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
      warn: seat.on ? [clashText(leg, 'drivers', seat.driverId), seatLapse(leg, seat.driverId), clashText(leg, 'near', seat.driverId)].filter(Boolean).join(' · ') : '',
      warnIcon: false,
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
    const box = el('div', 'rux--stack-vertical rux--stack-scale-5');
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

  /* ── A tile per vehicle ──
     Each vehicle reads as a Route stop does: its number, the vehicle on its
     first line with what it asks for at the end, then a line per seat with the
     driver's status and any warning in words. Pressing it opens the vehicle's
     window; right-click or hold moves or removes it. */
  const fleetWarn = text => {
    const w = el('span', 'scheduler-route-warn scheduler-fleet-warn');
    const icon = svgUse('#m-warning-fill', '16', '0 0 32 32');
    icon.setAttribute('aria-hidden', 'true');
    w.append(icon, el('span', null, text));
    return w;
  };

  // What a vehicle asks for, as the card's marks: its type, then each need, a
  // need its bus lacks in the warning colour.
  function vehicleMarks(vehicle, busRow) {
    const box = el('span', 'scheduler-fleet-marks');
    if (vehicle.vehicleType) box.appendChild(el('span', 'scheduler-fleet-marks__type', vehicle.vehicleType));
    const order = editableNeeds().map(r => r.id);
    const ids = needIds(vehicle.needs).sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));
    for (const id of ids) {
      const name = requirementLabel(id);
      const short = !!(busRow && shortfall(id, busRow));
      const mark = requirementIcon(id)
        ? svgUse(requirementIcon(id), '16', '0 0 32 32')
        : el('span', 'scheduler-fleet-marks__letter', name.trim().charAt(0).toUpperCase());
      mark.classList.add('scheduler-fleet-marks__need');
      if (short) mark.classList.add('scheduler-fleet-marks__need--short');
      mark.setAttribute('role', 'img');
      mark.removeAttribute('aria-hidden');
      mark.setAttribute('aria-label', name);
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = name;
      if (mark instanceof SVGElement) mark.prepend(title); else mark.title = name;
      box.appendChild(mark);
    }
    return box;
  }

  // One seat on the tile: the status, the driver, the seat when it is not the
  // driver's, and what clashes.
  function seatLine(leg, bus, role, dups) {
    const seat = bus.seats[role];
    const line = el('span', 'scheduler-fleet-seat');
    const driver = seat.driverId != null ? panelIndex.driversById.get(seat.driverId) : null;
    const mark = seat.driverId != null ? statusIcon(DRIVER_STATUSES.some(st => st.value === seat.status) ? seat.status : 'off')
      : svgUse('#m-person-fill', '16', '0 0 32 32');
    if (seat.driverId == null) mark.classList.add('scheduler-fleet-seat__nobody');
    const who = el('span', 'scheduler-fleet-seat__who');
    who.appendChild(el('span', seat.driverId != null ? 'scheduler-fleet-seat__name' : 'scheduler-fleet-seat__name scheduler-fleet-seat__name--none',
      seat.driverId != null ? (driver?.name || driver?.short_name || 'Unnamed driver') : 'No driver yet'));
    if (role !== 'driver') {
      const swap = seat.reportTime ? `, swap ${hhmm(seat.reportTime)}` : '';
      who.appendChild(el('span', 'scheduler-fleet-seat__role', `${SEAT_LABEL[role].toLowerCase()}${swap}`));
    }
    line.append(mark, who);
    const dup = seat.driverId != null && dups.has(`${leg}:${seat.driverId}`);
    const warn = dup ? 'In another seat on this leg'
      : [clashText(leg, 'drivers', seat.driverId), seatLapse(leg, seat.driverId), clashText(leg, 'near', seat.driverId)].filter(Boolean).join(' · ');
    if (warn) line.appendChild(fleetWarn(warn));
    return line;
  }

  function fleetTile(leg, bus, i, count, dups) {
    const n = i + 1;
    const list = editing.fleet[leg];
    const busRow = bus.busId != null ? panelIndex.buses.get(bus.busId) : null;
    const name = busRow ? vehicleName(busRow) : 'No vehicle yet';
    const open = () => openVehicleDialog(leg, bus);
    const move = by => { list.splice(i + by, 0, list.splice(i, 1)[0]); drawFleet(); refreshDirty(); };
    const li = listRow({
      name, lead: String(n), context: true, edit: open,
      title: [`Vehicle ${n}`, name].join(' · '), openLabel: `Edit vehicle ${n}, ${name}`,
      items: [
        { label: 'Edit', run: open },
        { label: 'Move up', disabled: i === 0, run: () => move(-1) },
        { label: 'Move down', disabled: i === count - 1, run: () => move(1) },
        { label: 'Remove', danger: true, disabled: count <= 1, run: () => removeBus(leg, bus) },
      ],
    });
    li.classList.add('scheduler-fleet-tile');
    const tile = li.querySelector('.scheduler-item__open');
    if (!busRow) tile.querySelector('.scheduler-item__name').classList.add('scheduler-fleet-tile__none');
    tile.querySelector('.scheduler-item__line').appendChild(vehicleMarks(bus, busRow));
    // What is wrong with the vehicle itself: the same bus twice, a clash, or
    // a bus short of what this vehicle asks for.
    const twin = bus.busId == null ? -1 : list.findIndex(b => b !== bus && same(b.busId, bus.busId));
    const wrong = [twin >= 0 ? `Also vehicle ${twin + 1} on this trip` : null,
      clashText(leg, 'buses', bus.busId), ...busLacks(busRow, bus)].filter(Boolean).join(' · ');
    if (wrong) tile.appendChild(fleetWarn(wrong));
    for (const r of ROLES) {
      if (r.role === 'driver' || bus.seats[r.role].on) tile.appendChild(seatLine(leg, bus, r.role, dups));
    }
    return li;
  }

  /* ── The vehicle's window ──
     Opened from a tile, or from Add vehicle with a new one. It edits a copy,
     so Cancel leaves the tile as it was and Done puts the copy in its place:
     what it should be and what it needs, then the bus, then each seat, the
     driver always and the others as they are turned on. */
  let vehicleEdit = null;          // { leg, bus: the copy, index: its place, or null for a new one }
  const vehicleHost = document.getElementById('scheduler-vehicle-fields');

  function openVehicleDialog(leg, bus) {
    if (!vehicleHost) return;
    const index = bus ? editing.fleet[leg].indexOf(bus) : null;
    vehicleEdit = { leg, bus: bus ? JSON.parse(JSON.stringify(bus)) : blankBus(), index };
    const n = index === null ? editing.fleet[leg].length + 1 : index + 1;
    document.getElementById('scheduler-vehicle-h').textContent = index === null ? 'Add vehicle' : `Vehicle ${n}`;
    drawVehicleFields();
    window.Rux?.modal?.open?.('scheduler-vehicle-modal');
  }

  function drawVehicleFields(focusId) {
    if (!vehicleHost || !vehicleEdit) return;
    const { leg, bus, index } = vehicleEdit;
    const n = index === null ? editing.fleet[leg].length + 1 : index + 1;
    // Duplicates as the leg would stand with this copy in its place.
    const legNow = [...editing.fleet[leg]];
    if (index === null) legNow.push(bus); else legNow[index] = bus;
    const dups = fleetDuplicates({ ...editing.fleet, [leg]: legNow });

    const fleetTypes = [...(panelIndex.buses?.values() ?? [])].filter(b => b.status === 'active').map(b => b.type);
    const types = [...new Set([...fleetTypes, bus.vehicleType].filter(Boolean))].sort();
    const type = selectField('scheduler-fleet-vtype', 'Type', bus.vehicleType ?? '', [['', 'Any'], ...types.map(t => [t, t])]);
    type.querySelector('select').dataset.fleetVehicle = 'type';
    // Every vehicle need the office lists, and any this one already holds.
    const held = needIds(bus.needs);
    const offered = [...vehicleNeedList(), ...held.filter(id => !vehicleNeedList().some(r => r.id === id))
      .map(id => ({ id, label: requirementLabel(id) }))];
    const needs = el('div', 'scheduler-needs');
    const needsLabel = el('div', 'rux--label', 'Needs');
    needsLabel.id = 'scheduler-fleet-vneeds-label';
    const needRow = el('div', 'scheduler-needs__tags');
    needRow.setAttribute('role', 'group');
    needRow.setAttribute('aria-labelledby', needsLabel.id);
    for (const r of offered) {
      const tag = tagField(`scheduler-fleet-vneed-${r.id}`, r.label, held.includes(r.id));
      tag.dataset.fleetNeed = r.id;
      needRow.appendChild(tag);
    }
    needs.append(needsLabel, needRow);

    const busRow = bus.busId != null ? panelIndex.buses.get(bus.busId) : null;
    const twin = bus.busId == null ? -1 : legNow.findIndex(b => b !== bus && same(b.busId, bus.busId));
    const busPick = fleetPicker({
      id: `scheduler-fleet-${leg}-${bus.key}-bus`, label: 'Vehicle', placeholder: 'Choose a vehicle',
      options: fleetBusOptions(leg, bus.busId), current: bus.busId,
      warn: [twin >= 0 ? `Also vehicle ${twin + 1} on this trip` : null,
             clashText(leg, 'buses', bus.busId), ...busLacks(busRow, bus)].filter(Boolean).join(' · '),
    });
    busPick.dataset.fleetLeg = leg;
    busPick.dataset.fleetBus = bus.key;

    // The other seats, turned on and off here as Needs are.
    const crew = el('div', 'scheduler-needs');
    const crewLabel = el('div', 'rux--label', 'Also on board');
    crewLabel.id = 'scheduler-fleet-crew-label';
    const crewRow = el('div', 'scheduler-needs__tags');
    crewRow.setAttribute('role', 'group');
    crewRow.setAttribute('aria-labelledby', crewLabel.id);
    for (const r of ROLES.filter(x => x.role !== 'driver')) {
      const tag = tagField(`scheduler-fleet-seat-${r.role}`, SEAT_LABEL[r.role], bus.seats[r.role].on);
      tag.dataset.fleetSeatToggle = r.role;
      crewRow.appendChild(tag);
    }
    crew.append(crewLabel, crewRow);

    /* What the vehicle is and needs, then who drives it, 16px apart within
       each, 24px between; each relief, with its swap time and note, is a
       group of its own. ROLES lists the reliefs last. */
    const what = el('div', 'rux--stack-vertical rux--stack-scale-5');
    what.append(full(type), needs, full(busPick));
    const seats = el('div', 'rux--stack-vertical rux--stack-scale-5');
    seats.append(seatBlock(leg, bus, 'driver', n, dups), crew);
    const stack = el('div', 'rux--stack-vertical rux--stack-scale-6');
    stack.append(what, seats);
    for (const r of ROLES) {
      if (r.role === 'driver' || !bus.seats[r.role].on) continue;
      (RELIEF.has(r.role) ? stack : seats).appendChild(seatBlock(leg, bus, r.role, n, dups));
    }
    vehicleHost.replaceChildren(stack);
    if (focusId) document.getElementById(focusId)?.focus();
  }

  document.getElementById('scheduler-vehicle-done')?.addEventListener('click', () => {
    if (!vehicleEdit) return;
    const { leg, bus, index } = vehicleEdit;
    const list = editing.fleet[leg];
    if (index === null) list.push(bus); else list[index] = bus;
    vehicleEdit = null;
    window.Rux?.modal?.close?.('scheduler-vehicle-modal');
    drawFleet();
    refreshDirty();
  });
  document.getElementById('scheduler-vehicle-modal')?.addEventListener('rux:modal-closed', () => { vehicleEdit = null; });

  // The window's own controls: the type, a need, and a seat turned on or off.
  vehicleHost?.addEventListener('change', e => {
    if (!vehicleEdit || e.target.dataset?.fleetVehicle !== 'type') return;
    vehicleEdit.bus.vehicleType = e.target.value || null;
    drawVehicleFields(e.target.id);
  });
  vehicleHost?.addEventListener('input', e => {
    const tag = e.target.closest?.('[data-fleet-need], [data-fleet-seat-toggle]');
    if (!vehicleEdit || !tag) return;
    const on = tag.getAttribute('aria-pressed') === 'true';
    if (tag.dataset.fleetNeed) {
      const next = new Set(needIds(vehicleEdit.bus.needs));
      if (on) next.add(tag.dataset.fleetNeed); else next.delete(tag.dataset.fleetNeed);
      vehicleEdit.bus.needs = needsObject(next);
    } else {
      vehicleEdit.bus.seats[tag.dataset.fleetSeatToggle].on = on;
    }
    drawVehicleFields(tag.id);
  });

  /* ASSIGN BEST fills a leg's empty seats in the automatic order: Driver
     seats on every bus before co-drivers and relief, each the first of
     `autoPicks` not already in a seat on the leg. A vehicle with no bus yet
     is left alone, since a driver is chosen for a bus. It only fills the
     form, so Save or Reset decides. It waits for the read of who is free,
     since a ranking without it would offer a driver who is away. */
  const emptySeats = (leg, withBus = true) => ROLES.flatMap(r => (editing?.fleet?.[leg] ?? [])
    .filter(b => (b.busId != null) === withBus
      && (r.role === 'driver' || b.seats[r.role].on) && !b.seats[r.role].driverId)
    .map(b => b.seats[r.role]));

  function assignBestButton(leg) {
    const btn = el('button', 'rux--btn rux--btn--ghost rux--layout--size-sm', 'Assign best');
    btn.type = 'button';
    btn.id = `scheduler-fleet-${leg}-best`;
    btn.dataset.fleetBest = leg;
    const why = emptySeats(leg).length ? (fleetClashes ? null : 'Checking who is free…')
      : emptySeats(leg, false).length ? 'Choose a vehicle first: the empty seats have no bus yet'
      : 'Every seat has a driver';
    if (why) btn.disabled = true;
    btn.title = why ?? 'Fill the empty seats with the top free drivers';
    return btn;
  }

  function assignBest(leg) {
    const seats = emptySeats(leg);
    const fit = fleetClashes?.[leg];
    if (!seats.length || !fit) return;
    const taken = new Set((editing.fleet[leg] ?? []).flatMap(b => ROLES
      .filter(r => r.role === 'driver' || b.seats[r.role].on)
      .map(r => b.seats[r.role].driverId).filter(id => id != null).map(String)));
    const free = autoPicks(rankDrivers([...panelIndex.driversById.values()]
      .filter(d => !d.status || d.status === 'active'), fit))
      .filter(r => !taken.has(String(r.d.id)));
    let filled = 0;
    for (const seat of seats) {
      const next = free.shift();
      if (!next) break;
      Object.assign(seat, { driverId: next.d.id, status: 'off', statusDirty: false });
      filled++;
    }
    drawFleet(`scheduler-fleet-${leg}-best`);
    refreshDirty();
    if (!filled) toast('warning', 'No free, rested drivers for the empty seats');
    else toast('success', `Filled ${filled} ${filled === 1 ? 'seat' : 'seats'}`,
      filled < seats.length ? `${seats.length - filled} still empty; nobody else is free. Check, then Save.` : 'Check them, then Save.');
  }
  panelFleet?.addEventListener('click', e => {
    const btn = e.target.closest?.('[data-fleet-best]');
    if (btn && !btn.disabled) assignBest(btn.dataset.fleetBest);
  });

  /* Draws the tab from the model. `focusId` names the control to focus after
     a redraw that replaced the one in use; while a vehicle's window is open,
     it redraws too, since its pickers and statuses call here. */
  function drawFleet(focusId) {
    if (!editing?.fleet) return;
    // The Route tab's Summary says whether a co-driver is still wanted.
    routeTimesDrawn?.();
    const dups = fleetDuplicates();
    // What the trip needs stays, and keeps any focus in it; the vehicles redraw.
    for (const n of [...panelFleet.children]) if (!n.hasAttribute('data-fleet-needs')) n.remove();
    const many = fleetLegs().length > 1;
    /* MORE PASSENGERS THAN SEATS IS SAID, AND NOTHING MORE, by leg-facts.js's
       rule: no need is turned on and no bus added. Its notice stands over the
       leg's own vehicles. */
    const people = passengersNow();
    const seatsShort = buses => {
      const over = overSeats(people, seatsTotal(buses.map(b => panelIndex.buses.get(b.busId)?.capacity ?? null)));
      return over ? notice('warning', 'More passengers than seats', `${over.charAt(0).toUpperCase()}${over.slice(1)}.`) : null;
    };
    for (const leg of fleetLegs()) {
      const buses = editing.fleet[leg];
      const { list, body } = rowList();
      list.classList.add('scheduler-fleet-list');
      buses.forEach((b, i) => body.appendChild(fleetTile(leg, b, i, buses.length, dups)));
      const add = listAddRow({ label: 'Add vehicle', id: `scheduler-fleet-${leg}-add`, onClick: () => openVehicleDialog(leg, null) });
      if (buses.length >= MAX_BUSES) add.btn.disabled = true;
      body.appendChild(add.li);
      // One leg's list needs no heading, since the tab names it; a trip of more names its leg.
      const title = many ? `${legTitle(leg)} vehicles` : null;
      const sec = section(title, list, assignBestButton(leg));
      const short = seatsShort(buses);
      if (short) { short.dataset.fleetSeats = leg; short.classList.add('scheduler-fleet-seats'); list.before(short); }
      sec.dataset.fleetSection = leg;
      sec.hidden = many && leg !== screenKey();
      panelFleet.appendChild(sec);
    }
    // Done stays the tab's last section.
    const done = doneSection('buses');
    if (done) panelFleet.appendChild(done);
    if (vehicleEdit) drawVehicleFields(focusId);
    else if (focusId) document.getElementById(focusId)?.focus();
    // A bus added or taken off changes a rental line's quantity.
    if (linesLive) redrawLines();
    // The Billing tab's Miles has a field for each seat.
    seatMilesDrawn?.();
    busCountDrawn?.();
  }

  // The vehicle a control edits: the window's copy inside the window, else the tab's.
  const fleetBus = node => {
    const leg = node?.dataset.fleetLeg;
    if (!leg) return {};
    if (vehicleEdit && vehicleHost?.contains(node)) return { leg, bus: vehicleEdit.bus };
    return { leg, bus: editing?.fleet?.[leg]?.find(b => b.key === node.dataset.fleetBus) };
  };

  // A vehicle comes off, after a question when it has a bus or a driver.
  const fleetRemoveModal = document.getElementById('scheduler-fleet-remove-modal');
  let fleetRemoveAfter = null;
  function removeBus(leg, bus) {
    const list = editing.fleet[leg];
    const apply = () => {
      const at = list.indexOf(bus);
      if (at >= 0 && list.length > 1) list.splice(at, 1);
      drawFleet();
      refreshDirty();
    };
    const held = bus.busId || ROLES.some(r => seatFilled(bus.seats[r.role]));
    if (!held || !fleetRemoveModal) { apply(); return; }
    // What goes, in words: the bus by its number and each driver by name.
    const names = [
      bus.busId && panelIndex.buses.get(bus.busId) ? vehicleName(panelIndex.buses.get(bus.busId)) : null,
      ...ROLES.filter(r => seatFilled(bus.seats[r.role]))
        .map(r => panelIndex.driversById.get(bus.seats[r.role].driverId)?.name),
    ].filter(Boolean);
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
  // Keeping the vehicle leaves it as it was.
  fleetRemoveModal?.addEventListener('rux:modal-closed', () => { fleetRemoveAfter = null; });

  /* The seats' fields and pickers, in the vehicle's window. A relief's swap
     time and note are typed into the copy; Done keeps them. */
  const fleetTyped = e => {
    const t = e.target;
    const { bus } = fleetBus(t);
    if (!bus || !t.dataset.fleetField) return;
    bus.seats[t.dataset.fleetSeat][t.dataset.fleetField] =
      t.dataset.fleetField === 'reportTime' ? (t.value || null) : (t.value.trim() || null);
    refreshDirty();
  };
  vehicleHost?.addEventListener('change', fleetTyped);
  vehicleHost?.addEventListener('input', fleetTyped);
  /* A pick sets the bus or the driver; a new driver starts at Not sent.
     Typing over a pick drops it with no option, and that is left to focusout
     below: redrawing here would replace the field under the first key typed. */
  vehicleHost?.addEventListener('rux:listbox-selected', e => {
    const wrap = e.target.closest?.('.rux--list-box__wrapper');
    const { bus } = fleetBus(wrap);
    if (!bus) return;
    const picked = e.detail?.option?.dataset.fleetId ?? null;
    if (picked == null) return;
    const input = wrap.querySelector('input[role="combobox"]');
    const role = wrap.dataset.fleetSeat;
    const find = (map, id) => (id == null ? null : [...map.keys()].find(k => String(k) === String(id)) ?? null);
    if (role) {
      const seat = bus.seats[role];
      const next = find(panelIndex.driversById, picked);
      if (same(next, seat.driverId)) return;
      seat.driverId = next;
      // The miles were the last driver's.
      seat.miles = null;
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
  vehicleHost?.addEventListener('focusout', e => {
    const input = e.target;
    if (!(input instanceof HTMLInputElement) || input.getAttribute('role') !== 'combobox') return;
    const wrap = input.closest('.rux--list-box__wrapper');
    const { bus } = fleetBus(wrap);
    if (!bus) return;
    if (input.value === input.dataset.fleetText) return;
    if (!input.value.trim()) {
      const role = wrap.dataset.fleetSeat;
      if (role) Object.assign(bus.seats[role], { driverId: null, status: 'off', statusDirty: false });
      else bus.busId = null;
      refreshDirty();
    }
    // Redrawn once focus has landed, so the pick's tick, its warning and its
    // status button follow what the field now holds.
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
  /* The types a file is asked for: each type's stored label and the name it
     shows. A label is free text in `trip_documents`, and one that names no
     type shows as the label itself, so Something else stores the
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
  // A split trip's itinerary names the leg whose drivers are handed it.
  const LEG_TAGS = {
    outbound: { code: 'Drop-off', tone: 'rux--tag--blue', title: 'The drop-off day\'s itinerary, which the pickup is handed too until it has its own' },
    return: { code: 'Pickup', tone: 'rux--tag--purple', title: 'The pickup day\'s itinerary' },
  };
  // The word a file's own row names, which a move writes over.
  const docLeg = doc => (doc.leg === 'return' ? 'return' : 'outbound');

  const fileSize = n => {
    const bytes = Number(n);
    if (!Number.isFinite(bytes) || bytes <= 0) return '';
    return bytes < 1048576 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
  };

  /* A split trip's itinerary also names its leg, the one trip-shape.js
     hands it to, and its menu moves it to the other one. */
  const fileRow = (trip, doc, previous) => {
    const name = doc.file_name || doc.label || 'File';
    const when = uploadedOn(doc.created_at);
    const legged = SHAPE.isSplit(trip) && SHAPE.isItinerary(doc);
    const on = wordOfRow(trip, doc) === 'return' ? 'return' : 'outbound';
    const other = on === 'return' ? 'outbound' : 'return';
    const li = listRow({
      name: docTypeName(doc),
      tag: previous ? PREVIOUS_TAG : legged ? LEG_TAGS[on] : null,
      meta: [when, fileSize(doc.file_size)].filter(Boolean).join(' · '),
      title: name,
      openLabel: `Open ${name}${when ? `, uploaded ${when}` : ''}`,
      open: e => openDocument(doc, e.currentTarget, trip),
      editText: 'Replace', edit: () => replaceFrom(trip.id, doc),
      removeText: 'Delete', removeLabel: `Delete ${name}`, remove: () => openDeleteFile(trip.id, doc),
      items: legged ? [
        { label: 'Replace', run: () => replaceFrom(trip.id, doc) },
        { label: other === 'return' ? 'Move to pickup' : 'Move to drop-off', run: () => moveFrom(trip.id, doc, other) },
        { label: 'Delete', danger: true, run: () => openDeleteFile(trip.id, doc) },
      ] : null,
    });
    // Closing the document panel finds the tile by it after the list is redrawn.
    li.querySelector('.scheduler-item__open').dataset.documentId = doc.id;
    return li;
  };

  let filesBody = null;
  let filesNote = null;
  let filesAdd = null;
  // The trip whose earlier itineraries are open under its newest, kept so a redraw keeps them open.
  let earlierOpenFor = null;
  /* Newest first, with a trip's earlier itineraries, those no leg is handed
     any more, folded under its newest behind one line that opens them, and
     Add file last, which is also the empty state. */
  function drawFiles(trip) {
    if (!filesBody || !trip) return;
    const earlier = SHAPE.earlierItineraries(trip);
    const newest = itinerariesOf(trip).find(d => !earlier.includes(d)) ?? null;
    const open = earlierOpenFor === trip.id;
    const rows = [];
    for (const doc of documentsOf(trip)) {
      if (earlier.includes(doc)) continue;
      rows.push(fileRow(trip, doc, false));
      if (doc !== newest || !earlier.length) continue;
      const li = el('li', 'scheduler-files-earlier');
      const btn = el('button', 'rux--link rux--link--sm', open ? 'Hide earlier versions'
        : `${earlier.length} earlier ${earlier.length === 1 ? 'version' : 'versions'}`);
      btn.type = 'button';
      btn.setAttribute('aria-expanded', String(open));
      btn.addEventListener('click', () => {
        earlierOpenFor = open ? null : trip.id;
        drawFiles(trip);
        filesBody.querySelector('.scheduler-files-earlier button')?.focus();
      });
      li.appendChild(btn);
      rows.push(li);
      if (open) rows.push(...earlier.map(d => fileRow(trip, d, true)));
    }
    filesBody.replaceChildren(...rows, filesAdd.li);
    drawItineraryNote(trip);
  }

  /* Under the list, only while the trip has no itinerary: that none has come
     yet, with Not needed, or that none is needed, with Undo. Either press is
     an edit Save writes. */
  function drawItineraryNote(trip) {
    if (!filesNote) return;
    const none = !itinerariesOf(trip).length;
    filesNote.hidden = !none;
    if (!none) return;
    const off = !!editing?.itineraryNotNeeded;
    const btn = el('button', 'rux--link rux--link--sm', off ? 'Undo' : 'Not needed');
    btn.type = 'button';
    btn.setAttribute('aria-label', off ? 'Undo itinerary not needed' : 'Itinerary not needed');
    btn.addEventListener('click', () => {
      setItineraryNotNeeded(!off);
      filesNote.querySelector('button')?.focus();
    });
    filesNote.replaceChildren(off ? 'Itinerary not needed.' : 'No itinerary yet.', btn);
  }

  function setItineraryNotNeeded(on) {
    if (!editing) return;
    editing.itineraryNotNeeded = on;
    refreshDirty();
    if (editing.trip) drawItineraryNote(editing.trip);
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
        const icon = svgUse('#m-report-fill', '16', '0 0 16 16');
        icon.setAttribute('class', 'rux--file-invalid');
        const close = el('button', 'rux--file-close');
        close.type = 'button';
        close.setAttribute('aria-label', `Dismiss ${name}`);
        close.appendChild(svgUse('#m-close', '16', '0 0 32 32'));
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

  /* What is this file? Asked once a PDF is dropped or picked: the types as
     radio buttons with none picked, so a file is never labelled by accident,
     and Add file stays disabled until one is. Something else opens a Name
     field whose words become the file's label. Add file hands the label on;
     Cancel or the close adds nothing. */
  const fileTypeModal = document.getElementById('scheduler-file-type-modal');
  const fileTypeGroup = document.getElementById('scheduler-file-type-group');
  const fileTypeOther = document.getElementById('scheduler-file-type-other');
  const fileTypeInput = document.getElementById('scheduler-file-type-label');
  const fileTypeAdd = document.getElementById('scheduler-file-type-add');
  const fileTypeLeg = document.getElementById('scheduler-file-type-leg');
  // An itinerary added on a split trip is the leg on screen's, and the dialog says which.
  const drawFileTypeLeg = () => {
    if (!fileTypeLeg) return;
    const leg = pickedFileType() === 'Itinerary' ? viewWord() : null;
    fileTypeLeg.hidden = !leg;
    fileTypeLeg.textContent = leg === 'return' ? 'This itinerary goes to the pickup, the leg on screen.'
      : 'This itinerary goes to the drop-off, the leg on screen. The pickup is handed it too until it has its own.';
  };
  let fileTypeDone = null;
  for (const [value, name] of [...DOC_TYPES, [DOC_OTHER, 'Something else']]) {
    const id = `scheduler-file-type-${value.toLowerCase().replace(/\W+/g, '-')}`;
    const wrap = el('div', 'rux--radio-button-wrapper');
    const input = el('input', 'rux--radio-button');
    input.type = 'radio';
    input.name = 'scheduler-file-type';
    input.id = id;
    input.value = value;
    const label = el('label', 'rux--radio-button__label');
    label.htmlFor = id;
    label.append(el('span', 'rux--radio-button__appearance'), el('span', 'rux--radio-button__label-text', name));
    wrap.append(input, label);
    fileTypeGroup?.appendChild(wrap);
  }
  if (fileTypeInput) fileTypeInput.maxLength = DOC_LABEL_MAX;
  const pickedFileType = () => fileTypeGroup?.querySelector('input:checked')?.value ?? '';
  fileTypeGroup?.addEventListener('change', () => {
    drawFileTypeLeg();
    fileTypeAdd.disabled = !pickedFileType();
    fileTypeOther.hidden = pickedFileType() !== DOC_OTHER;
    nameError(fileTypeInput, '');
    if (!fileTypeOther.hidden) fileTypeInput.focus();
  });
  function askFileType(fileName, done) {
    if (!fileTypeModal) { done('Itinerary'); return; }
    fileTypeDone = done;
    document.getElementById('scheduler-file-type-name').textContent = fileName;
    for (const input of fileTypeGroup.querySelectorAll('input')) input.checked = false;
    fileTypeAdd.disabled = true;
    fileTypeOther.hidden = true;
    drawFileTypeLeg();
    fileTypeInput.value = '';
    nameError(fileTypeInput, '');
    window.Rux?.modal?.open?.(fileTypeModal);
    fileTypeGroup.querySelector('input').focus();
  }
  const finishFileType = () => {
    const picked = pickedFileType();
    if (!picked) return;
    const label = picked === DOC_OTHER ? docLabelFor(fileTypeInput.value) : picked;
    if (!label) {
      nameError(fileTypeInput, 'Type a name for the file.');
      fileTypeInput.focus();
      return;
    }
    const done = fileTypeDone;
    fileTypeDone = null;
    window.Rux?.modal?.close?.(fileTypeModal);
    done?.(label);
  };
  fileTypeAdd?.addEventListener('click', finishFileType);
  fileTypeInput?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); finishFileType(); } });
  fileTypeModal?.addEventListener('rux:modal-closed', () => { fileTypeDone = null; });

  /* Adding a file: the list's Add file row opens the file dialog, and a file
     dropped anywhere on the tab is taken too. Its type is asked once it is
     chosen, and Carbon's file item, from `sink/file-uploader.html`, shows it
     going up under the list. One file at a time, and Add file is disabled
     while one goes up. */
  function fileAdder(tripId) {
    const progress = el('div', 'rux--file-container');
    const start = async file => {
      if (!file || add.btn.disabled) return;
      // A file that is not a PDF is turned away before its type is asked.
      if (!(await isPdf(file))) {
        fileItem(progress, file.name).fail('Only PDF files can be added', 'Export the file as a PDF, then add it again.');
        return;
      }
      askFileType(file.name, async label => {
        add.btn.disabled = true;
        try { await uploadFrom(tripId, label, file, fileItem(progress, file.name), viewWord()); }
        finally { add.btn.disabled = false; }
      });
    };
    const add = listAddRow({ label: 'Add file', id: 'scheduler-f-fileadd', onClick: () => pickFile(start) });
    return { li: add.li, progress, start };
  }

  /* The whole Files tab takes a dropped file, and Add file lights while one is
     dragged over it. Only a drag carrying files is taken, so text dragged
     inside the tab is left alone. */
  const carriesFiles = e => [...(e.dataTransfer?.types || [])].includes('Files');
  const dragLit = on => panelFiles?.classList.toggle('scheduler-files--drag', on);
  panelFiles?.addEventListener('dragover', e => {
    if (!filesAdd || !carriesFiles(e)) return;
    e.preventDefault();
    dragLit(true);
  });
  panelFiles?.addEventListener('dragleave', e => {
    if (!panelFiles.contains(e.relatedTarget)) dragLit(false);
  });
  panelFiles?.addEventListener('drop', e => {
    if (!filesAdd || !carriesFiles(e)) return;
    e.preventDefault();
    dragLit(false);
    filesAdd.start(e.dataTransfer.files?.[0]);
  });

  // The editor is a flex child of the board, not an animated overlay, so
  // closing it is setting `hidden`.
  function closePanel(returnFocus = true) {
    if (panelEl.hidden) return;
    // A read that waited for this editor is owed as soon as it is out of the way.
    if (liveHeld) setTimeout(liveRefresh, 0);
    setTimeout(presenceTell, 0);
    /* A draft is read the moment the panel shows it, so closing spends it
       whether Save was pressed or not. A delete that fails leaves a row the
       nightly cleanup takes instead. */
    if (openDraft) {
      const spent = openDraft;
      openDraft = null;
      openDraftRequest = null;
      client.from('trip_drafts').delete().eq('id', spent).then(() => {}, () => {});
    }
    // Closing puts the editor's own trip down; a different trip selected
    // meanwhile stays selected.
    const picked = selectedBar();
    if (picked && isEditorBar(picked)) picked.setAttribute('aria-current', 'false');
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
      const detail = [c.client, showPhone(c.phone)].filter(Boolean).join(' · ');
      if (detail) body.appendChild(el('span', 'scheduler-contact-option__detail', detail));
      const tick = svgUse('#m-check', '16', '0 0 20 20');
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

  /* A search over the customers, as Carbon's combo box. A pick writes the
     name into the field and the input's `data-customer-id` says which
     customer it is for the save; a name typed by hand unlinks it, and Save
     links it to the customer of that name or makes one. */
  function customerSearch(id, label, customers, current, text) {
    const lab = el('label', 'rux--label', label);
    lab.setAttribute('for', id);
    const root = el('div', 'rux--combo-box rux--list-box');
    const field = el('div', 'rux--list-box__field');
    /* The trip's own name leads, because it is what Save compares against:
       a customer renamed since, or matched by case alone, would otherwise
       open the trip with a change nobody made. */
    const value = text || current?.name || '';
    const input = el('input', value ? 'rux--text-input' : 'rux--text-input rux--text-input--empty');
    input.type = 'text';
    input.id = id;
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-haspopup', 'listbox');
    input.setAttribute('aria-expanded', 'false');
    input.autocomplete = NO_AUTOFILL;
    input.placeholder = 'Search customers';
    input.value = value;
    if (current?.id) input.dataset.customerId = current.id;
    field.append(input);
    const menu = el('ul', 'rux--list-box__menu');
    menu.setAttribute('role', 'listbox');
    menu.hidden = true;
    for (const c of customers) {
      const on = !!current?.id && String(c.id) === String(current.id);
      const option = el('li', on
        ? 'rux--list-box__menu-item rux--list-box__menu-item--active'
        : 'rux--list-box__menu-item');
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', String(on));
      option.dataset.customerId = c.id;
      option.dataset.ruxText = c.name ?? '';
      const body = el('div', 'rux--list-box__menu-item__option', c.name ?? '');
      const tick = svgUse('#m-check', '16', '0 0 20 20');
      tick.classList.add('rux--list-box__menu-item__selected-icon');
      body.appendChild(tick);
      option.appendChild(body);
      menu.appendChild(option);
    }
    root.append(field, menu);
    const wrap = el('div', 'rux--list-box__wrapper');
    wrap.append(lab, root);
    return wrap;
  }

  // An address as one key, by places.js's one rule, so a place typed two ways is one place.
  const addressKey = window.SchedulerPlaces.addressKey;
  const savedAsPlace = l => ({ name: l.name, address: l.address, lat: l.lat, lng: l.lng, mapbox_id: l.mapbox_id ?? null, saved: true });
  /* The saved locations holding every word typed, up to five, as places. The
     words are held to the name and address as typed and as one key, so a
     street typed out in full finds the location saved with Blvd. */
  function savedPlaceMatches(text) {
    const words = folded(text).split(/\s+/).filter(Boolean);
    const keyed = addressKey(text).split(' ').filter(Boolean);
    if (!words.length || text.trim().length < 2) return [];
    return (panelIndex.locations || [])
      .filter(l => words.every(w => folded(`${l.name} ${l.address}`).includes(w))
        || keyed.every(w => addressKey(`${l.name} ${l.address}`).includes(w)))
      .slice(0, 5)
      .map(savedAsPlace);
  }
  // The saved location a place is, by its Mapbox id or by its address as one key, or null.
  const savedLocationOf = place => (place ? (panelIndex.locations || []).find(l =>
    (place.mapbox_id && l.mapbox_id === place.mapbox_id)
    || (!!place.address && addressKey(l.address) === addressKey(place.address))) ?? null : null);

  /* A search over places, as Carbon's combo box, for the Route tab. Its
     options are the saved locations that match, each marked with a location
     icon, then Geoapify's answers to what is typed, drawn when they arrive, as
     two lines like a contact's: the place's name over its address. Showing a
     name, the field has the place's address in a grey line under it, and a
     saved location carries the saved mark at the field's end. `onPick` gets
     the place picked, or null and the text when the field is typed in. */
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
    input.placeholder = window.SchedulerPlaces.unavailable() ? 'Address' : 'Search places';
    input.value = place?.[show] || place?.address || '';
    input.title = place?.address ?? '';
    field.append(input);
    const menu = el('ul', 'rux--list-box__menu');
    menu.setAttribute('role', 'listbox');
    menu.hidden = true;
    root.append(field, menu);
    const wrap = el('div', 'rux--list-box__wrapper');
    wrap.append(lab, root);
    const where = el('div', 'rux--form__helper-text scheduler-place-where');
    if (show === 'name') wrap.appendChild(where);
    const shown = p => {
      const loc = savedLocationOf(p);
      if (loc) input.dataset.locationId = loc.id; else delete input.dataset.locationId;
      where.textContent = p?.address && p.address !== input.value.trim() ? p.address : '';
      where.hidden = !where.textContent;
      syncSaved();
      // Says what is shown now: a place, and whether it is saved; none while typing.
      input.dispatchEvent(new CustomEvent('scheduler:place', { bubbles: true, detail: { place: p, saved: !!loc } }));
    };

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
        const name = el('span', 'scheduler-contact-option__name', p.name);
        if (p.saved) {
          const pin = svgUse('#m-location_on', '16', '0 0 32 32');
          pin.setAttribute('class', 'scheduler-place-saved');
          name.prepend(pin);
          option.setAttribute('aria-label', `${p.name}, saved location`);
        }
        body.appendChild(name);
        if (p.address) body.appendChild(el('span', 'scheduler-contact-option__detail', p.address));
        option.appendChild(body);
        return option;
      }));
      if (found.some(p => !p.saved)) menu.appendChild(window.SchedulerPlaces.creditRow());
      // `list-box.js` shows the list only if it had options when it opened.
      menu.hidden = !found.length || !root.classList.contains('rux--list-box--expanded');
    };
    /* The saved locations that hold every word typed come first, at once;
       Geoapify is asked a quarter second after typing stops, and its answers
       follow. An answer that is a saved location, by its address, is shown
       as that location and never beside it, so one place is not picked under
       two records. Only the latest answer is drawn. */
    input.addEventListener('input', () => {
      clearTimeout(timer);
      shown(null);
      const text = input.value;
      const saved = savedPlaceMatches(text);
      found = saved;
      draw();
      timer = setTimeout(async () => {
        const n = ++asked;
        try {
          const got = await searchPlaces(text);
          if (n === asked) {
            const known = [...saved];
            const fresh = [];
            for (const g of got) {
              const loc = savedLocationOf(g);
              if (!loc) { if (!known.some(p => samePlace(p, g))) fresh.push(g); continue; }
              if (!known.some(p => addressKey(p.address) === addressKey(loc.address))) known.push(savedAsPlace(loc));
            }
            found = [...known, ...fresh];
            draw();
          }
        } catch { /* the saved ones stand */ }
      }, 250);
    });
    root.addEventListener('rux:listbox-selected', e => {
      const index = e.detail?.option?.dataset.placeIndex;
      if (index === undefined) { onPick(null, input.value.trim()); return; }
      const picked = found[Number(index)];
      input.title = picked?.address ?? '';
      onPick(picked ?? null, input.value.trim());
      shown(picked ?? null);
    });
    shown(place);
    return withSaved(wrap, id, 'location');
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
      // One named window, so each thread reuses the tab.
      btn.target = 'missive';
      btn.rel = 'noopener';
    } else {
      btn.type = 'button';
    }
    btn.tabIndex = -1;
    btn.setAttribute('aria-label', `${word} ${label.charAt(0).toLowerCase()}${label.slice(1)}`);
    btn.appendChild(svgUse(open ? '#m-open_in_new' : '#m-content_copy', '16', '0 0 32 32'));
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
    syncSaved();
  };

  /* A SAVED RECORD'S MARK. A name, customer or place picked from the saved
     lists says so right after its label, on the label's line, as a small link
     that opens that
     record on the Contacts, Customers or Locations page in a new tab, so the
     trip open here keeps its edits. It stays out of the field, where the value
     is read and copied. One typed by hand shows none, so the label says
     whether Save will link it or offer to add it. The mark follows the field's
     `data-contact-id`, `data-customer-id` or `data-location-id`, which a pick
     sets and typing clears. */
  const SAVED = {
    contact: { data: 'contactId', page: 'contacts.html', word: 'Saved contact' },
    customer: { data: 'customerId', page: 'customers.html', word: 'Saved customer' },
    location: { data: 'locationId', page: 'locations.html', word: 'Saved location' },
  };
  function withSaved(item, id, kind) {
    const input = item.querySelector(`#${id}`);
    const label = item.querySelector(`label[for="${id}"]`);
    if (!input || !label) return item;
    const link = el('a', 'rux--link rux--link--sm scheduler-saved', SAVED[kind].word);
    link.dataset.savedFor = id;
    link.dataset.savedKind = kind;
    link.target = '_blank';
    link.rel = 'noopener';
    link.title = `Open the ${SAVED[kind].word.toLowerCase()} in a new tab`;
    const row = el('div', 'scheduler-label-row');
    label.replaceWith(row);
    row.append(label, link);
    syncSavedTip(link, input);
    return item;
  }
  function syncSavedTip(link, input) {
    const kind = SAVED[link.dataset.savedKind];
    const id = input?.value.trim() ? input.dataset[kind.data] || '' : '';
    if (id) link.href = `${kind.page}?id=${encodeURIComponent(id)}`; else link.removeAttribute('href');
    link.hidden = !id;
  }
  /* A phone or email that is not the linked contact's says what the saved one
     is, in a line under the field: the trip keeps its own copy, and Save
     offers to update the saved contact. Nothing shows while they match, or
     when the contact is not linked or has none saved. */
  const SAVED_DIFF = [
    ['scheduler-f-cfind', 'scheduler-f-cphone', 'phone'],
    ['scheduler-f-cfind', 'scheduler-f-cemail', 'email'],
    ...[1, 2, 3, 4, 5].map(n => [`scheduler-f-d${n}`, `scheduler-f-dphone${n}`, 'phone']),
  ];
  const sameSaved = (key, a, b) => (key === 'phone'
    ? String(a).replace(/[^\d]/g, '') === String(b).replace(/[^\d]/g, '')
    : String(a).trim().toLowerCase() === String(b).trim().toLowerCase());
  function syncSaved() {
    for (const tip of document.querySelectorAll('.scheduler-saved')) {
      syncSavedTip(tip, document.getElementById(tip.dataset.savedFor));
    }
    /* The linked customer's standing notes, under the Customer field, read
       only: they are the customer's, edited on its own page, and seen here
       because here is where a trip for it is entered. */
    const cust = document.getElementById('scheduler-f-customer');
    const custWrap = cust?.closest('.rux--list-box__wrapper');
    if (custWrap) {
      const id = cust.value.trim() ? cust.dataset.customerId : null;
      const notes = id ? (panelIndex.customers || []).find(c => String(c.id) === String(id))?.notes : null;
      let note = custWrap.querySelector(':scope > .scheduler-customer-notes');
      if (!notes) note?.remove();
      else {
        if (!note) custWrap.appendChild(note = el('div', 'rux--form__helper-text scheduler-customer-notes'));
        note.textContent = notes;
      }
    }
    for (const [nameId, fieldId, key] of SAVED_DIFF) {
      const field = document.getElementById(fieldId);
      const outer = field?.closest('.rux--text-input__field-outer-wrapper');
      if (!outer) continue;
      const name = document.getElementById(nameId);
      const id = name?.value.trim() ? name.dataset.contactId : null;
      const saved = id ? (panelIndex.contacts || []).find(c => String(c.id) === String(id))?.[key] : null;
      const differs = !!saved && !sameSaved(key, field.value, saved);
      let note = outer.querySelector(':scope > .scheduler-saved-diff');
      if (!differs) { note?.remove(); continue; }
      if (!note) outer.appendChild(note = el('div', 'rux--form__helper-text scheduler-saved-diff'));
      note.textContent = `Saved: ${saved}`;
    }
  }

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
    use.setAttribute('href', '#m-keyboard_arrow_down');
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
     tags fit, because the tag is its own hit area with no separate box beside it.
     The size is written on the tag, because the panel around it is sm and a tag
     with no size of its own would take the panel's. */
  function tagField(id, label, on) {
    const tag = el('button', on ? 'rux--tag rux--tag--selectable rux--layout--size-md rux--tag--selectable-selected'
                                : 'rux--tag rux--tag--selectable rux--layout--size-md');
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
    caret.appendChild(svgUse('#m-keyboard_arrow_down', '16', '0 0 16 16'));
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
      const tick = svgUse('#m-check', '16', '0 0 20 20');
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
    /* The Trip heading's menu picks the colour while this field is hidden, so
       the field offers its choices and takes one by value. */
    item.choices = choices;
    item.chip = chip;
    item.current = () => menu.querySelector('.rux--list-box__menu-item--active')?.dataset.color ?? '';
    item.setColor = value => {
      for (const option of menu.children) {
        const on = option.dataset.color === value;
        option.classList.toggle('rux--list-box__menu-item--active', on);
        option.setAttribute('aria-selected', String(on));
      }
      paint(choices.find(c => c.value === value) ?? choices[0]);
    };
    return item;
  }

  /* ── Updates ── What was said to or heard from the customer, newest first,
     each stamped with who wrote it and when. Add update writes straight to
     `trip_updates` without saving the trip, so an update never waits on the
     rest of the form, and a new trip has no id to hang one on until it is
     saved. A `nothing` row marks a skipped prompt and is not drawn; an
     `imported` row was copied out of the old notes, so it has a date and no
     time. An update whose words were changed says so. */
  const UPDATE_COLUMNS = 'id,created_at,actor_id,actor_name,body,kind,edited_at';
  // The Updates window's shorter stamp, under a face that already names the
  // author: the time for today's update, the day for an older one.
  function updateDay(u) {
    const at = new Date(u.created_at);
    const now = new Date();
    const opts = { month: 'short', day: 'numeric' };
    if (at.getFullYear() !== now.getFullYear()) opts.year = 'numeric';
    const when = u.kind !== 'imported' && at.toDateString() === now.toDateString()
      ? at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
      : at.toLocaleDateString(undefined, opts);
    return [when, u.edited_at ? 'edited' : null].filter(Boolean).join(' · ');
  }

  /* A box as tall as its words, two lines at the least, so an update opened
     to change shows whole and the box grows as it is typed in. */
  function fitBox(box) {
    box.style.blockSize = 'auto';
    box.style.blockSize = `${box.scrollHeight + box.offsetHeight - box.clientHeight}px`;
  }
  /* The save prompt's earlier updates: the trip's updates, newest first, each
     a tile of its author's face beside its words over its day, the full stamp
     the day's tooltip, so what was already said is in front of what is about
     to be. They are read fresh each time the prompt opens, for the trip
     `logTrip` names, and are changed in the trip's card. */
  const logEl = document.getElementById('scheduler-updates-log');
  const logStatus = document.getElementById('scheduler-updates-status');
  let logTrip = null;
  let logRows = [];
  function logItem(u) {
    const li = el('li', 'scheduler-updates__item');
    const text = el('span', 'scheduler-updates__text');
    const tile = el('div', 'rux--tile scheduler-updates__tile');
    const face = updateFace(u, 'md');
    face.classList.add('scheduler-updates__face');
    const day = el('span', 'rux--type-label-01 scheduler-updates__meta', updateDay(u));
    day.title = updateStamp(u);
    text.append(el('span', 'rux--type-body-compact-01 scheduler-updates__body', u.body), day);
    tile.append(face, text);
    li.appendChild(tile);
    return li;
  }
  function drawLog() {
    if (!logEl) return;
    logEl.replaceChildren(...logRows.filter(u => u.kind !== 'nothing').map(logItem));
    logStatus.hidden = logEl.childElementCount > 0;
    logStatus.textContent = 'No updates yet.';
  }
  async function loadLog(tripId) {
    if (!logEl) return;
    logTrip = tripId;
    logRows = [];
    logEl.replaceChildren();
    logStatus.hidden = false;
    logStatus.textContent = 'Reading updates…';
    try {
      const { data, error: failed } = await withTimeout(client.from('trip_updates')
        .select(UPDATE_COLUMNS).eq('trip_id', tripId)
        .order('created_at', { ascending: false }).then(r => r));
      if (failed) throw new Error(failed.message);
      if (logTrip !== tripId) return;
      logRows = data || [];
      drawLog();
    } catch (err) {
      console.warn('The updates were not read:', err);
      if (logTrip === tripId) logStatus.textContent = 'The updates could not be read.';
    }
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
    b.appendChild(svgUse('#m-calendar_month', '16', '0 0 32 32'));
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

  /* The date picker's input takes no size from `rux--layout--size-*` on a
     container, and at its own default it is the 40px every other field in the
     editor inherits, so it names none. */
  const dpContainer = (which, id, labelText, value) => {
    const c = el('div', DP_CONTAINER[which]);
    const lab = el('label', 'rux--label', labelText);
    lab.setAttribute('for', id);
    const wrap = el('div', 'rux--date-picker-input__wrapper');
    const span = el('span');
    const input = el('input', 'rux--date-picker__input');
    input.type = 'text';
    input.id = id;
    input.placeholder = 'mm/dd/yyyy';
    input.value = pickerText(value);
    span.append(input, dpIcon());
    wrap.appendChild(span);
    c.append(lab, wrap);
    return c;
  };

  /* A date box said to be wrong, as Design's invalid date picker is: the
     wrapper and the input take their invalid classes and a line under them
     says why. An empty `say` puts the box right again. */
  function dateSays(input, say) {
    if (!input) return;
    const wrap = input.closest('.rux--date-picker-input__wrapper');
    wrap?.classList.toggle('rux--date-picker-input__wrapper--invalid', !!say);
    input.classList.toggle('rux--date-picker__input--invalid', !!say);
    input.setAttribute('aria-invalid', String(!!say));
    let req = document.getElementById(`${input.id}-req`);
    if (!req && say && wrap) {
      req = el('div', 'rux--form-requirement');
      req.id = `${input.id}-req`;
      wrap.after(req);
      input.setAttribute('aria-describedby', req.id);
    }
    if (req) { req.textContent = say || ''; req.hidden = !say; }
  }

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
      dpContainer('from', fromId, fromLabel, fromVal),
      dpContainer('to', toId, toLabel, toVal),
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
    // The leg on screen's days and Way, which Save writes on its leg's row.
    { key: 'start_date', get: f => isoOrNull(f['scheduler-f-start'].value) },
    // A blank end saves as the start day, because the picker clears this input
    // on the first pick of a range.
    { key: 'end_date', get: f => isoOrNull(f['scheduler-f-end'].value) ?? isoOrNull(f['scheduler-f-start'].value) },
    { key: 'leg_kind', get: () => wayNow() },
    // Every other leg's days and Way, which a draft may change, held by `editing.legs`.
    { key: 'other_legs', get: () => otherLegsValue() },
    { key: 'customer', get: f => f['scheduler-f-customer'].value.trim() || null },
    // The trip's type, from its legs' Ways, for the pages that still read it.
    { key: 'trip_type', get: () => tripTypeNow() },
    { key: 'passengers', get: () => passengersNow() },
    // The type every vehicle on the trip wants, or null when they differ.
    { key: 'vehicle_type', get: () => {
        const v = fleetVehicles();
        if (!v) return editing?.before?.vehicle_type ?? null;
        const types = new Set(v.map(b => b.vehicleType ?? null));
        return types.size === 1 ? [...types][0] : null;
      } },
    // Standard is the empty value and stores null.
    { key: 'trip_bar_color', get: f => f['scheduler-f-color'].querySelector('.rux--list-box__menu-item--active')?.dataset.color || null },
    // `confirmed`, `balance_paid` and `date_paid` are derived, not edited:
    // `derivedBilling` writes them with any billing change.
    /* THE NEEDS GO IN `trip_reqs`, which is what the bar, the envelope and
       the history all read. It is merged over what
       the trip already held, so a requirement the office has since deactivated
       keeps its answer instead of being dropped by a save that never drew it.

       THE FIVE OLDER COLUMNS ARE WRITTEN FROM THE SAME TAGS, because the print
       pages and this panel's hotel block still read them, and a trip
       whose two records disagree reads one way here and another there. They go
       when nothing reads them. A column whose tag was not drawn is left as it
       was, for the same reason as above. */
    { key: 'trip_reqs', get: () => {
        const out = { ...(editing?.reqs || {}) };
        // The trip's two: the hotel from its quote line, the fuel card from the
        // Route tab. Anything else the office lists for the trip keeps its answer.
        if (editing) { out.hotel = hotelNeeded(); out.fuelCard = !!editing.fuelCard; }
        const union = fleetNeedUnion();
        if (union) {
          for (const r of vehicleNeedList()) out[r.id] = union.has(r.id);
          for (const id of union) out[id] = true;
        }
        return out;
      } },
    // The vehicle's three are true when any vehicle on the trip needs them.
    ...[['req_sleeper', 'sleeper'], ['req_ada', 'adaLift'], ['req_56pax', 'pax56']]
      .map(([key, id]) => ({ key, get: () => fleetNeedUnion()?.has(id) ?? !!editing?.before?.[key] })),
    // A reminder to book a hotel, not the bus's equipment; it is listed with the needs.
    { key: 'need_hotel', get: () => hotelNeeded() },
    { key: 'need_fuel_card', get: () => !!editing?.fuelCard },
    // Each leg's hotel: whether it is booked, and its confirmation number.
    ...['outbound', 'return'].flatMap(l => [
      { key: `hotel_booked_${l}`, get: () => !!editing?.hotel?.[l]?.booked },
      { key: `hotel_itinerary_number_${l}`, get: () => editing?.hotel?.[l]?.ref ?? null },
    ]),
    /* Billing. Money goes to the column as a number or null, never NaN, which
       Postgres rejects with an error that does not name the field. The two
       statuses are text columns holding "Pending"/"Signed" and
       "Pending"/"Invoiced", not booleans.

       The milestones are the Billing tile's rows: the contract is signed while
       it has its row, with that row's day and note, and a step the billing
       workflow does not use is off. `invoiced` is written beside
       `invoice_status` so the two always agree. */
    { key: 'quoted_price', get: f => money(f['scheduler-f-quoted'].value) },
    // What the customer was sent, kept by Quote sent on the Billing tab.
    { key: 'quote_sent_price', get: () => editing?.quoteSent?.price ?? null },
    { key: 'quote_sent_on', get: () => editing?.quoteSent?.on ?? null },
    // The route's miles, on the Route tab.
    { key: 'est_miles', get: () => estTyped() ?? routeTotal() },
    { key: 'actual_miles', get: () => money(document.getElementById('scheduler-f-actmiles')?.value) },
    { key: 'contract_status', get: () => (contractNow() ? 'Signed' : 'Pending') },
    { key: 'contract_signed_on', get: () => contractNow()?.on ?? null },
    { key: 'contract_note', get: () => contractNow()?.note ?? null },
    /* The PO and invoice columns are filled from the rows in `trip_pos` and
       `trip_invoices`: `po_ref` is the first PO's reference, `po_amount` the sum
       of the PO amounts and `invoice_number` the first invoice's number, because
       other readers still use the columns. `listRowsToSave` is the
       list Save writes, so the columns and the rows agree, and PO received and
       Invoice sent are on while their list has a row. */
    { key: 'po_received', get: () => stepOn('poReceived') && poPending.length > 0 },
    { key: 'po_ref', get: () => listRowsToSave('po')[0]?.ref ?? null },
    { key: 'po_amount', get: () => sumOrNull(listRowsToSave('po')) },
    { key: 'invoice_status', get: () => (invPending.length ? 'Invoiced' : 'Pending') },
    { key: 'invoiced', get: () => invPending.length > 0 },
    { key: 'invoice_number', get: () => listRowsToSave('invoice')[0]?.number ?? null },
    // A trip that runs without an itinerary loses its bar's mark.
    { key: 'itinerary_not_needed', get: () => !!editing?.itineraryNotNeeded },
    /* The contact links are trip columns, so they diff here. They read the DOM
       rather than `f`, which keeps them out of `readForm`'s required ids; a
       getter returns undefined when its control is not on screen. */
    { key: 'booking_contact_id', get: () => linkId('scheduler-f-cfind') },
    ...[1, 2, 3, 4, 5].map(n => ({ key: `trip_contact_${n}_id`, get: () => dayField(n, `trip_contact_${n}_id`, () => linkId(`scheduler-f-d${n}`) ?? null) })),
    /* The trip's own copy of each contact: the
       name, phone and email as this trip has them. `undefined` when the field
       is not on screen, as above. The ids are settled at save by
       `linkContacts`, which needs the database. */
    { key: 'booking_contact_name', get: () => fieldVal('scheduler-f-cfind') },
    { key: 'booking_contact_phone', get: () => fieldVal('scheduler-f-cphone') },
    { key: 'booking_contact_email', get: () => fieldVal('scheduler-f-cemail') },
    { key: 'booking_contact_missive_url', get: () => fieldVal('scheduler-f-cthread') },
    ...[1, 2, 3, 4, 5].flatMap(n => [
      { key: `trip_contact_${n}_name`, get: () => dayField(n, `trip_contact_${n}_name`, () => fieldVal(`scheduler-f-d${n}`) ?? null) },
      { key: `trip_contact_${n}_phone`, get: () => dayField(n, `trip_contact_${n}_phone`, () => fieldVal(`scheduler-f-dphone${n}`) ?? null) },
      // The leg a split trip's contact is for, as trip-shape.js reads it.
      { key: `trip_contact_${n}_leg`, get: () => dayField(n, `trip_contact_${n}_leg`, () => editing.days[n - 1].leg ?? null) },
    ]),
  ];


  // The id a search field resolved to, or null when the box was cleared or
  // typed freehand. `undefined` means the control is not on screen at all.
  const linkId = id => {
    const e = document.getElementById(id);
    if (!e) return undefined;
    return e.value.trim() ? (e.dataset.contactId || null) : null;
  };

  /* A day-of slot's column: what its field says while it is drawn, null once
     it is taken off in this edit, a draft's contact held on it for the leg not
     on screen, and as it opened while it is not drawn, as a split trip's other
     leg's slot is, so a leg's view saves only its own. Undefined while the
     contacts are not built at all. */
  const dayField = (n, key, fromField) => {
    if (!document.getElementById('scheduler-f-days')) return undefined;
    if (document.getElementById(`scheduler-f-d${n}`)) return fromField();
    const d = editing?.days?.[n - 1];
    if (d?.pending) return { ...d.pending, leg: d.leg }[key.slice(`trip_contact_${n}_`.length)] ?? null;
    return d?.removed ? null : editing?.before[key] ?? null;
  };

  // A contact field's text: null when blank, undefined when not on screen.
  const fieldVal = id => {
    const e = document.getElementById(id);
    return e ? (e.value.trim() || null) : undefined;
  };

  /* Linking a trip's contacts. A contact picked from the
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
    ...[1, 2, 3, 4, 5].map(n => ({ slot: n, idKey: `trip_contact_${n}_id`, name: `scheduler-f-d${n}`,
                                  phone: `scheduler-f-dphone${n}`,
                                  copy: { name: `trip_contact_${n}_name`, phone: `trip_contact_${n}_phone` } })),
  ];
  // A phone as it is matched, by phone.js's one rule.
  const phoneDigits = window.SchedulerPhone.digits;
  const folded = v => String(v ?? '').trim().toLowerCase();
  const samePerson = (c, p) => [
    [phoneDigits(c.phone), phoneDigits(p.phone)],
    [folded(c.email), folded(p.email)],
    [folded(c.name), folded(p.name)],
  ].some(([a, b]) => a && a === b);
  /* Two people typed on one trip are the same new person when the name is
     the same and no phone or email given for both disagrees. Stricter than
     `samePerson`, since two slots may hold two people of one name. */
  const samePersonTyped = (a, b) => folded(a.name) === folded(b.name)
    && (!phoneDigits(a.phone) || !phoneDigits(b.phone) || phoneDigits(a.phone) === phoneDigits(b.phone))
    && (!folded(a.email) || !folded(b.email) || folded(a.email) === folded(b.email));
  // `ilike` with nothing wild in it: an exact match, case aside.
  const likeExact = v => String(v).trim().replace(/[\\%_]/g, m => `\\${m}`);

  /* The contact a person typed on the trip already is, by the rule above:
     the same phone, then the same email, then the same name. `byName` says
     the name was all that matched. Nobody is added here; a person who matches
     no one is offered to the list after the trip saves. */
  async function matchContact(p) {
    const cols = 'id,name,phone,email,client,customer_id';
    const first = async query => {
      const { data, error } = await withTimeout(query.limit(1).then(r => r));
      if (error) throw new Error(error.message);
      return data?.[0] ?? null;
    };
    const byPhone = p.phone && await first(client.from('contacts').select(cols).eq('phone', p.phone));
    if (byPhone) return { hit: byPhone, byName: false };
    const byEmail = p.email && await first(client.from('contacts').select(cols).ilike('email', likeExact(p.email)));
    if (byEmail) return { hit: byEmail, byName: false };
    const byName = await first(client.from('contacts').select(cols).ilike('name', likeExact(p.name)));
    return byName ? { hit: byName, byName: true } : null;
  }

  /* ══ Update your lists ════════════════════════════════════════════════════
     After a trip saves, what the edit brought that the lists do not have: a
     person who is no one's contact yet, a contact's missing or different
     phone or email, and a pickup or drop-off no saved location holds. Nothing
     is written unless ticked; Not now writes none of it, and the trip is
     saved either way. A missing detail and a new person or place come ticked;
     a different detail does not, since it is often one for that day. */
  let listOffers = null;    // { tripId, customerId, rows }

  // The pickup and drop-off picked or changed in this edit, if unsaved.
  function placeOffers() {
    const r = editing?.route;
    if (!r) return [];
    const yard = folded(yardPlace?.address);
    const out = [];
    /* The pickup and drop-off when changed, and every stop new or moved to
       another place, so a place named in the stop dialog is offered too. */
    const changed = [[r.pickupPlace, r.pickupOpen], [r.dropPlace, r.dropOpen],
      ...(r.list || []).filter(st => st.placeChanged || !st.id).map(st => [st.place, null])];
    for (const [place, open] of changed) {
      if (!place || place === open || place.lat == null || !place.address) continue;
      if (yard && folded(place.address) === yard) continue;
      if (savedLocationOf(place) || out.some(o => samePlace(o.place, place))) continue;
      out.push({ kind: 'place', place: { ...place } });
    }
    return out;
  }

  const WHAT = { phone: 'phone', email: 'email' };
  function offerListUpdates(tripId, customerId, offers) {
    const body = document.getElementById('scheduler-lists-body');
    if (!body || !offers.length) return;
    listOffers = { tripId, customerId, rows: offers };
    body.replaceChildren();
    const groups = [
      ['New contacts', offers.filter(o => o.kind === 'contact')],
      ['Contact details', offers.filter(o => o.kind === 'missing' || o.kind === 'different')],
      ['New locations', offers.filter(o => o.kind === 'place')],
    ];
    let n = 0;
    for (const [title, rows] of groups) {
      if (!rows.length) continue;
      const section = el('section', 'rux--stack-vertical rux--stack-scale-4');
      section.appendChild(el('h3', 'rux--type-heading-compact-01', title));
      for (const o of rows) {
        const i = n++;
        const id = `scheduler-lists-${i}`;
        const row = el('div', 'rux--stack-vertical rux--stack-scale-3');
        if (o.kind === 'contact') {
          row.appendChild(checkField(id, `Add ${o.person.name} to Contacts`, true));
          row.appendChild(textField(`${id}-name`, 'Name', o.person.name));
          row.appendChild(textField(`${id}-phone`, 'Phone', o.person.phone));
          if (o.slots.some(s => 'email' in s.copy)) row.appendChild(textField(`${id}-email`, 'Email', o.person.email));
        } else if (o.kind === 'missing' || o.kind === 'different') {
          /* A contact matched by the name alone may be someone else of that
             name, so nothing is written to them unless ticked on purpose. */
          row.appendChild(o.kind === 'missing'
            ? checkField(id, `Add ${o.value} as ${o.contact.name}'s ${WHAT[o.key]}`, !o.byName)
            : checkField(id, `Change ${o.contact.name}'s ${WHAT[o.key]} from ${o.onFile} to ${o.value}`, false));
          if (o.byName) row.appendChild(el('p', 'rux--form__helper-text',
            `Matched by the name alone. On file: ${[showPhone(o.contact.phone), o.contact.email].filter(Boolean).join(' · ') || 'no phone or email'}.`));
        } else {
          row.appendChild(checkField(id, `Save ${o.place.name || o.place.address} to Locations`, true));
          // A map name that is only the street address is left for a real one.
          const nameItem = textField(`${id}-name`, 'Name',
            window.SchedulerPlaces.nameIsAddress(o.place.name, o.place.address) ? '' : o.place.name);
          const need = el('div', 'rux--form-requirement');
          need.id = `${id}-name-error`;
          nameItem.querySelector('.rux--text-input__field-outer-wrapper')?.appendChild(need);
          row.appendChild(nameItem);
          row.appendChild(placeSearch(`${id}-address`, 'Address', o.place, picked => {
            if (picked) o.place = { ...picked, name: o.place.name };
          }, 'address'));
        }
        o.check = id;
        section.appendChild(row);
      }
      body.appendChild(section);
    }
    window.Rux?.modal?.open?.('scheduler-lists-modal');
  }

  /* A text field's error, as Carbon's invalid state draws it: the red
     outline, the icon and the message in the requirement under the field.
     An empty message clears it. */
  function nameError(input, message) {
    const wrap = input.closest('.rux--text-input__field-wrapper');
    const on = !!message;
    input.classList.toggle('rux--text-input--invalid', on);
    input.toggleAttribute('data-invalid', on);
    wrap.toggleAttribute('data-invalid', on);
    if (on) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    input.setAttribute('aria-describedby', `${input.id}-error`);
    let icon = wrap.querySelector('.rux--text-input__invalid-icon');
    if (on && !icon) {
      icon = svgUse('#m-report-fill', '16', '0 0 32 32');
      icon.setAttribute('class', 'rux--text-input__invalid-icon');
      wrap.prepend(icon);
    }
    if (!on) icon?.remove();
    const need = document.getElementById(`${input.id}-error`);
    if (need) need.textContent = message;
  }

  document.getElementById('scheduler-lists-save')?.addEventListener('click', async e => {
    const button = e.currentTarget;
    const job = listOffers;
    if (!job) return;
    const ticked = job.rows.filter(o => document.getElementById(o.check)?.checked);
    const val = id => document.getElementById(id)?.value.trim() || null;
    /* Every place about to be saved has a real name first, or nothing is
       written and the first field wanting one takes the focus. */
    let wanting = null;
    for (const o of job.rows.filter(r => r.kind === 'place')) {
      const input = document.getElementById(`${o.check}-name`);
      if (!input) continue;
      const bad = ticked.includes(o) && window.SchedulerPlaces.nameIsAddress(input.value, o.place.address);
      nameError(input, bad ? window.SchedulerPlaces.NAME_HELP : '');
      if (bad) wanting ??= input;
    }
    if (wanting) { wanting.focus(); return; }
    const customerName = (panelIndex.customers || []).find(c => c.id === job.customerId)?.name ?? null;
    button.disabled = true;
    let done = 0;
    let linked = false;
    const failed = [];
    const moved = [];
    for (const o of ticked) {
      try {
        if (o.kind === 'contact') {
          const person = { id: crypto.randomUUID(), name: val(`${o.check}-name`) || o.person.name,
            phone: val(`${o.check}-phone`), email: o.slots.some(s => 'email' in s.copy) ? val(`${o.check}-email`) : null,
            customer_id: job.customerId ?? null, client: customerName };
          const add = await withTimeout(client.from('contacts').insert(person).then(r => r));
          if (add.error) throw new Error(add.error.message);
          panelIndex.contacts = [...(panelIndex.contacts || []), person];
          // Every slot the person was typed in links to the one new contact.
          const link = await withTimeout(client.from('trips')
            .update(Object.fromEntries(o.slots.map(s => [s.idKey, person.id]))).eq('id', job.tripId).then(r => r));
          if (link.error) throw new Error(link.error.message);
          linked = true;
        } else if (o.kind === 'missing' || o.kind === 'different') {
          /* Written only over what the offer was made against, so a detail
             someone saved elsewhere since is never replaced. */
          let query = client.from('contacts').update({ [o.key]: o.value }).eq('id', o.contact.id);
          query = o.kind === 'missing' ? query.or(`${o.key}.is.null,${o.key}.eq.`) : query.eq(o.key, o.raw);
          const up = await withTimeout(query.select('id').then(r => r));
          if (up.error) throw new Error(up.error.message);
          if (!up.data?.length) { moved.push(o.contact.name); continue; }
          o.contact[o.key] = o.value;
        } else {
          const place = { name: val(`${o.check}-name`), address: o.place.address,
            lat: o.place.lat, lng: o.place.lng, mapbox_id: o.place.mapbox_id ?? null };
          const add = await withTimeout(client.from('locations').insert(place).select('id,name,address,lat,lng,mapbox_id').single().then(r => r));
          if (add.error) throw new Error(add.error.message);
          panelIndex.locations = [...(panelIndex.locations || []), add.data];
        }
        done++;
      } catch {
        failed.push(o.kind === 'contact' ? o.person.name : o.kind === 'place' ? (o.place.name || o.place.address) : o.contact.name);
      }
    }
    button.disabled = false;
    listOffers = null;
    window.Rux?.modal?.close?.('scheduler-lists-modal');
    /* A link moves the trip's `updated_at`, so the week is read again, or the
       trip's next save would take this write for someone else's. */
    if (linked) await show();
    if (failed.length || moved.length) toast('warning', 'Some lists were not updated.', [
      failed.length ? `Could not save ${failed.join(', ')}.` : '',
      moved.length ? `${moved.join(', ')} changed elsewhere.` : '',
    ].filter(Boolean).join(' '));
    else if (done) toast('success', 'Lists updated.');
  });

  /* The customer the Customer field names, settled into `row`: the one
     picked, else the one of that name, else a new one made now, as a new
     contact is. A new customer's id is kept for its name until the insert is
     confirmed, so a save pressed again after a timeout sends the same id. */
  const pendingCustomerIds = new Map();
  async function addCustomer(name) {
    const key = folded(name);
    const cols = 'id,name,usual_location_id';
    const newId = pendingCustomerIds.get(key) ?? crypto.randomUUID();
    pendingCustomerIds.set(key, newId);
    const { data, error } = await withTimeout(client.from('customers').insert({ id: newId, name })
      .select(cols).single().then(r => r));
    if (!error) {
      pendingCustomerIds.delete(key);
      panelIndex.customers = [...(panelIndex.customers || []), data];
      return data.id;
    }
    // The first insert landed after all.
    if (error.code === '23505' && /customers_pkey/.test(error.message)) { pendingCustomerIds.delete(key); return newId; }
    // Someone made a customer of that name since the week was read.
    if (error.code === '23505') {
      const hit = await withTimeout(client.from('customers').select(cols).ilike('name', likeExact(name)).limit(1).then(r => r));
      if (hit.data?.[0]) { panelIndex.customers = [...(panelIndex.customers || []), hit.data[0]]; return hit.data[0].id; }
    }
    throw new Error(error.message);
  }
  async function linkCustomer(row, creating) {
    const input = document.getElementById('scheduler-f-customer');
    if (!input) return;
    const name = input.value.trim();
    const before = creating ? null : (editing.before.customer_id ?? null);
    /* A customer is made only from a name typed in this edit. An older trip
       saved for another reason keeps what it had, so a name like "School -
       Band" never becomes a second customer beside the cleaned one. */
    const typedNow = creating || !same(name || null, editing.before.customer ?? null);
    let id = null;
    if (name) {
      id = input.dataset.customerId
        || (panelIndex.customers || []).find(c => folded(c.name) === folded(name))?.id
        || (typedNow ? await addCustomer(name) : before);
      if (id) input.dataset.customerId = id;
    }
    if (creating || id !== before) row.customer_id = id; else delete row.customer_id;
  }
  /* The booking contact takes the trip's customer when they have none, as a
     picked contact takes a missing phone, but only when the organization
     they carry is blank or already that customer's: an agency booking for a
     school keeps its own. Guarded, so a customer set elsewhere since is never
     replaced, and never in the way of the save. */
  async function fillContactCustomer(row) {
    const contactId = 'booking_contact_id' in row ? row.booking_contact_id : editing.before.booking_contact_id;
    const customerId = 'customer_id' in row ? row.customer_id : editing.before.customer_id;
    if (!contactId || !customerId) return;
    const known = (panelIndex.contacts || []).find(c => String(c.id) === String(contactId));
    if (!known || known.customer_id) return;
    const name = (panelIndex.customers || []).find(c => c.id === customerId)?.name ?? null;
    const theirs = String(known.client ?? '').trim();
    if (theirs && folded(theirs) !== folded(name)) return;
    try {
      let query = client.from('contacts').update({ customer_id: customerId, client: name })
        .eq('id', contactId).is('customer_id', null);
      query = theirs ? query.eq('client', known.client) : query.or('client.is.null,client.eq.');
      const { error } = await withTimeout(query.then(r => r));
      if (!error && known) { known.customer_id = customerId; known.client = name; }
    } catch { /* the trip still saves */ }
  }

  /* Settles every on-screen contact id into `row`, which is the insert or the
     patch, and puts in `offers` what the list lacks: a person who is no one's
     contact yet, and a contact's missing or different phone or email. Only
     what was typed in this edit is offered, so a declined offer is not made
     again until the field is typed again. Returns the names that could not
     be linked; each keeps the link the trip already had. */
  async function linkContacts(row, creating, offers) {
    const failed = [];
    const val = id => (id && document.getElementById(id)?.value.trim()) || null;
    for (const s of CONTACT_SLOTS) {
      const box = document.getElementById(s.name);
      if (!box) {
        /* A draft's contact held for the leg not on screen is linked as a
           typed one is, by phone, then email, then name, and offers no one
           new, since nobody has seen it on screen yet. */
        const held = s.slot && editing.days?.[s.slot - 1]?.pending;
        if (held?.name && !held.id) {
          try {
            const m = await matchContact(held);
            if (m) { held.id = m.hit.id; row[s.idKey] = m.hit.id; }
          } catch { failed.push(held.name); }
        }
        continue;
      }
      const p = { name: box.value.trim() || null, phone: val(s.phone), email: val(s.email), client: val(s.client) };
      const before = creating ? null : (editing.before[s.idKey] ?? null);
      const typedNow = field => creating || !same(p[field] ?? null, editing.before[s.copy[field]] ?? null);
      let id = null;
      if (p.name) {
        try {
          const picked = box.dataset.contactId;
          const known = picked && (panelIndex.contacts || []).find(c => String(c.id) === picked);
          let hit = null;
          let byName = false;
          if (known && samePerson(known, p)) hit = known;
          else if (known || !picked) ({ hit, byName } = (await matchContact(p)) ?? { hit: null, byName: false });
          else hit = { id: picked };
          if (hit) {
            id = hit.id;
            box.dataset.contactId = id;
            for (const key of ['phone', 'email']) {
              if (!(key in s.copy) || !p[key] || !typedNow(key) || !('name' in hit)) continue;
              const onFile = String(hit[key] ?? '').trim();
              const differs = key === 'phone' ? phoneDigits(onFile) !== phoneDigits(p[key]) : folded(onFile) !== folded(p[key]);
              const kind = !onFile ? 'missing' : differs ? 'different' : null;
              // One contact typed in two slots is offered its detail once.
              if (!kind || offers.some(o => o.kind === kind && String(o.contact.id) === String(hit.id)
                && o.key === key && o.value === p[key])) continue;
              offers.push({ kind, contact: hit, key, value: p[key], onFile, raw: hit[key] ?? null, byName });
            }
          } else {
            // No one yet: the trip keeps the typed name and phone, unlinked.
            delete box.dataset.contactId;
            if (typedNow('name') || typedNow('phone')) {
              /* One new person typed in two slots, as the booker and a day-of
                 contact, is one offer that links both, not two contacts. */
              const twin = offers.find(o => o.kind === 'contact' && samePersonTyped(o.person, p));
              if (twin) {
                twin.slots.push(s);
                twin.person = { ...twin.person, phone: twin.person.phone || p.phone, email: twin.person.email || p.email };
              } else offers.push({ kind: 'contact', slots: [s], person: p });
            }
          }
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
  /* The Details tab's Passengers as a whole number, or null when it is blank
     or not a count; the column refuses a negative one. */
  const passengersNow = () => {
    const n = money(document.getElementById('scheduler-f-passengers')?.value);
    return n !== null && n >= 0 ? Math.round(n) : null;
  };

  /* The billing rules, `billing.js`: the workflow the `billing-workflow-v1`
     row sets, the status ladder, and where a saved trip's money stands. */
  const { setWorkflow: setBillingWorkflow, stepOn, status: billingStatus, confirmRungOf, confirmsTrip,
    contractSignedOf, poReceivedOf, invoicedOf } = window.SchedulerBilling;

  /* The open editor's billing as it stands: the status, whether it confirms
     the trip, and whether the payments reach the quote, with the latest
     payment's date. The tab's summary draws from it and Save writes from it,
     so what the tab says is what the trip becomes. */
  // The open editor's signed contract, `{ on, note }`, or null.
  const contractNow = () => (stepOn('contractSigned') ? editing?.contract ?? null : null);

  function billingNow() {
    const quoted = money(document.getElementById('scheduler-f-quoted')?.value);
    const price = quoted ?? 0;
    const amounts = payPending.map(p => Number(p.amount) || 0);
    const paid = amounts.reduce((n, a) => n + a, 0);
    const poAmount = poPending.reduce((n, p) => n + (Number(p.amount) || 0), 0);
    const poReceived = stepOn('poReceived') && poPending.length > 0;
    const rung = billingStatus({
      contractSigned: !!contractNow(),
      poReceived, poAmount, price, paid,
    });
    const fullyPaid = price > 0 && price - paid <= 0;
    const lastPaid = payPending.filter((p, i) => amounts[i] > 0 && p.date).map(p => p.date).sort().pop() || null;
    return { quoted, price, paid, poAmount, poReceived, rung, confirmed: confirmsTrip(rung),
             fullyPaid, datePaid: fullyPaid ? lastPaid : null };
  }

  // The trip columns a save that changes billing derives.
  const BILLING_KEYS = ['quoted_price', 'contract_status', 'contract_signed_on', 'contract_note', 'po_received', 'po_ref',
                        'po_amount', 'invoice_status', 'invoiced', 'invoice_number'];
  function derivedBilling() {
    const b = billingNow();
    return { confirmed: b.confirmed, balance_paid: b.fullyPaid, date_paid: b.datePaid };
  }


  /* The follow-up rules, `follow-up.js`: what a trip waits on, how long it
     has been quiet, and whether it asks. */
  const { set: setFollowUp, waitsOf, updatesOf, quietSince, asks: asksFollowUp, due: dueFollowUp, daysToGo,
    agoShort } = window.SchedulerFollowUp;

  let editing = null;   // { id, before: {...} }

  function readForm() {
    const f = {};
    for (const id of ['destination', 'customer', 'way',
                      // Every id `EDITS` reads through `f` is listed, and only
                      // ids on the panel: a missing element returns null.
                      'start', 'end',
                      'quoted',
                      'color']) {
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

  /* ── THE QUICKBOOKS DESCRIPTION ──
     The office's estimate carries one line item, and its description is the
     block `quote-text.js` spells. QuickBooks fills the customer, the bill-to
     address, the terms and the signature line from its own record and
     template, so the block is the only part of a quote worth carrying across;
     the price and the customer name are one field each there, and a pasted
     block would have to be cleaned back out of them.

     THE FIELDS ARE READ FROM THE CONTROLS rather than the saved trip, so a
     quote can be copied while it is still being written. The customer quote
     on the Forms page hands the same fields in from the saved row, and the
     wording is spelled once for both. */
  function qbDescription() {
    const val = id => document.getElementById(id)?.value.trim() || '';
    const split = splitNow();
    /* EACH LEG READS ITS OWN STOPS, as the printed quote does. The Route tab
       holds one leg at a time, so its fields are that leg's and no other's:
       the open leg is read from them, and the other from its saved rows. */
    const openLeg = isBackKey(editing?.route?.leg) ? 'return' : 'outbound';
    const savedStops = l => (editing?.stops || []).filter(st => wordOfRow(editing.trip, st) === l)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    // When the group leaves on a leg and when it is let off: the first stop's departure, and the yard row's or the last stop's arrival.
    const timesOf = l => {
      if (l === openLeg) return { leave: val('scheduler-f-leave'), back: val('scheduler-f-endtrip') };
      const rows = savedStops(l);
      return { leave: rows.find(st => st.type === 'stop')?.depart_prev || '',
        back: rows.find(st => st.type === 'return')?.depart_prev || rows.filter(st => st.type === 'stop').at(-1)?.arrive || '' };
    };
    // The trip's pickup is the drop-off leg's, and its address and not its
    // field, which shows the place's name, so the block names the pickup's
    // city as the printed quote does.
    const pickup = (openLeg === 'outbound' ? editing?.route?.pickupPlace?.address || val('scheduler-f-pickup') : '')
      || savedStops('outbound').find(st => st.type === 'pickup')?.address || editing?.trip?.pickup_address || '';
    // One leg's block, or the whole trip's with `leg` null. A leg of a split
    // trip says when the group leaves on it; the whole trip leaves on its
    // first leg and is back on its last.
    const words = leg => {
      const mine = leg === 'return' ? 'return' : 'outbound';
      const fleet = fleetOfLeg(mine);
      // A leg's own days, or the whole trip's: its first leg's start to its last leg's end.
      const days = leg ? legDaysNow(legKeyOf(mine)) : null;
      const legs = fleetLegs().map(legDaysNow).filter(Boolean);
      const start = leg ? days?.from ?? null : legs[0]?.from ?? null;
      const end = (leg ? days?.to : legs.reduce((d, l) => (l.to > d ? l.to : d), legs[0]?.to ?? '')) || start;
      return window.SchedulerQuoteText.description({
        type: tripTypeNow(),
        buses: fleet.length,
        pax56: fleet.some(b => b.needs?.pax56),
        pickup,
        destination: val('scheduler-f-destination'),
        from: start,
        to: end,
        leave: timesOf(mine).leave,
        back: leg ? '' : timesOf(split ? 'return' : 'outbound').back,
        leg: leg || null,
      });
    };
    /* WITH LINES, EVERY LINE, as the estimate's line items: its item, its
       quantity at its cost, and its words, a bus rental's written from its
       leg. A trip priced as one number is the one block it always was. */
    const lines = linesLive ? linesToSave() : [];
    if (!lines.length || (lines.length === 1 && lines[0].kind === 'rental' && !split)) return words(null);
    return lines.map(l => {
      const head = [l.item || lineKind(l.kind).label,
        l.cost === null ? null : `${l.quantity ?? 1} × ${usdCents(l.cost)}`].filter(Boolean).join(' — ');
      const body = l.kind === 'rental' && !l.description ? words(split ? l.leg ?? 'outbound' : null) : l.description || '';
      return [head, body].filter(Boolean).join('\n');
    }).join('\n\n');
  }

  /* The six payment methods, in the office's order. `trip_payments.method` is
     free text, so a spelling this menu lacks would not
     round-trip. */
  const PAYMENT_METHODS = ['Cash', 'Check', 'Card', 'ACH', 'Zelle', 'Other'];

  /* The panel's pending payments, and the handle that redraws them. Module
     scope because the dialog lives outside the panel's build closure and has
     to reach both. */
  let payPending = [];
  let redrawPayments = () => {};

  /* POs and invoices are pending rows too, for the reason payments are: the
     list is a render of the array and the array is what Save reads.
     Each row keeps its `trip_pos` or `trip_invoices` id, so Save updates it
     rather than replacing it. Module scope because the dialogs live outside
     the panel's build closure. */
  let poPending = [];
  let invPending = [];
  let redrawPos = () => {};
  let redrawInvoices = () => {};

  /* ── The billing entries' window ──
     The Billing tile's Purchase orders, Invoices and Payments rows each open
     it on their kind: every entry of the
     kind an accordion item, shut to its name, amount and date and open to
     its fields and Remove, then Add and Done or Cancel for the whole kind.
     It edits a copy, so Cancel leaves the entries as they were. A date
     leads each entry's fields, its calendar needing the room below it, and
     a new entry starts on today. The fields stay in the page while shut, so
     Done and every redraw read all of them; `dateOne` is built afresh on
     each draw, since claiming one picker twice leaves two calendars. */
  const ENTRY_KINDS = {
    po: {
      title: 'Purchase orders', add: 'Add purchase order',
      list: () => poPending, set: rows => { poPending = rows; }, redraw: () => redrawPos(),
      blank: () => ({ ref: null, amount: null, date: iso(new Date()) }),
      said: e => ({ name: e.ref ? `PO ${e.ref}` : 'PO, no reference', much: e.amount == null ? '' : usd(Number(e.amount) || 0),
        meta: e.date ? mdy(e.date) : 'No date' }),
      /* THE AMOUNT IS TYPED FROM THE PO, NEVER FILLED IN: a PO short of the
         balance is what puts the trip on PO partial, and a filled-in quote
         left standing would hide it. What the PO should cover is shown under
         the field instead: the quote less the payments and the trip's other
         POs. */
      fields: (e, id, all) => {
        const amount = moneyField(id('amount'), 'Amount', e.amount);
        const { price, paid } = billingNow();
        if (price > 0) {
          const others = all.reduce((n, o) => n + (o === e ? 0 : Number(o.amount) || 0), 0);
          const open = round2(Math.max(0, price - paid - others));
          amount.querySelector('.rux--text-input__field-outer-wrapper').appendChild(el('div', 'rux--form__helper-text',
            open === price ? `The quote is ${usdCents(price)}.`
              : open > 0 ? `The quote is ${usdCents(price)}; ${usdCents(open)} is uncovered by payments and POs.`
                : `The quote is ${usdCents(price)}, all covered by payments and POs.`));
        }
        return [dateOne(id('date'), 'Date', e.date), textField(id('ref'), 'Reference', e.ref), amount];
      },
      read: val => ({ ref: val('ref') || null, amount: money(val('amount')), date: isoOrNull(val('date')) }),
      // Adding a PO is what marks it received, so one is kept with only its date.
      kept: () => true,
    },
    invoice: {
      title: 'Invoices', add: 'Add invoice',
      list: () => invPending, set: rows => { invPending = rows; }, redraw: () => redrawInvoices(),
      blank: () => ({ number: null, date: iso(new Date()) }),
      said: e => ({ name: e.number ? `Invoice ${e.number}` : 'Invoice, no number', much: '', meta: e.date ? mdy(e.date) : 'No date' }),
      // An invoice's amount feeds no total, so it is not asked for; one an older row holds is kept.
      fields: (e, id) => [dateOne(id('date'), 'Date', e.date), textField(id('number'), 'Invoice number', e.number)],
      read: val => ({ number: val('number') || null, date: isoOrNull(val('date')) }),
      // Adding an invoice is what marks it sent, so one is kept with only its date.
      kept: () => true,
    },
    payment: {
      title: 'Payments', add: 'Add payment',
      list: () => payPending, set: rows => { payPending = rows; }, redraw: () => redrawPayments(),
      blank: () => ({ method: null, amount: null, date: iso(new Date()), ref: null }),
      /* The reference is in the tooltip and the fields, not the heading: it is
         looked up rather than scanned, and it would wrap the line. */
      said: e => ({ name: e.method ? `${e.method} payment` : 'Payment', much: usd(Number(e.amount) || 0),
        meta: e.date ? mdy(e.date) : 'No date' }),
      fields: (e, id) => [
        dateOne(id('date'), 'Date', e.date),
        moneyField(id('amount'), 'Amount', e.amount),
        selectField(id('method'), 'Method', e.method ?? '', [['', '—'], ...PAYMENT_METHODS.map(m => [m, m])]),
        textField(id('ref'), 'Reference', e.ref),
      ],
      read: val => ({ method: val('method') || null, amount: money(val('amount')), date: isoOrNull(val('date')), ref: val('ref') || null }),
      // A payment with no amount and no method is nothing, as an empty dialog adds nothing.
      kept: e => e.amount !== null || !!e.method,
    },
  };
  let entriesEdit = null;          // { kind, rows: the copy, open: the keys of the open entries }
  let entryKeys = 0;
  const entriesHost = document.getElementById('scheduler-entries-fields');

  function openEntriesDialog(kind, { adding = false } = {}) {
    if (!entriesHost || !editing) return;
    const k = ENTRY_KINDS[kind];
    // In their saved order, which Save keeps as each row's position.
    const rows = k.list().map(e => ({ ...e, was: e, key: ++entryKeys }));
    if (adding || !rows.length) rows.push({ ...k.blank(), was: null, key: ++entryKeys });
    // One entry, or a new one, opens open; several open shut.
    const open = new Set(adding || rows.length === 1 ? [rows.at(-1).key] : []);
    entriesEdit = { kind, rows, open, seen: new Set(open) };
    document.getElementById('scheduler-entries-h').textContent = k.title;
    drawEntriesFields();
    window.Rux?.modal?.open?.('scheduler-entries-modal');
  }

  function readEntry(e) {
    const val = part => document.getElementById(`scheduler-f-e${e.key}-${part}`)?.value.trim() ?? '';
    if (!document.getElementById(`scheduler-f-e${e.key}-date`)) return e;
    return Object.assign(e, ENTRY_KINDS[entriesEdit.kind].read(val));
  }

  function drawEntriesFields(focusKey) {
    if (!entriesHost || !entriesEdit) return;
    const { kind, rows, open, seen } = entriesEdit;
    const k = ENTRY_KINDS[kind];
    const redraw = (change, focus) => { rows.forEach(readEntry); change(); drawEntriesFields(focus); };
    const list = el('ul', 'rux--accordion rux--accordion--end scheduler-quote-lines');
    rows.forEach((e, i) => {
      const s = k.said(e);
      const li = el('li', `rux--accordion__item${open.has(e.key) ? ' rux--accordion__item--active' : ''}${e.drafted ? ' scheduler-drafted' : ''}`);
      li.dataset.key = String(e.key);
      const heading = el('button', 'rux--accordion__heading');
      heading.type = 'button';
      heading.setAttribute('aria-expanded', String(open.has(e.key)));
      const arrow = svgUse('#m-keyboard_arrow_right');
      arrow.classList.add('rux--accordion__arrow');
      const title = el('div', 'rux--accordion__title scheduler-quote-line');
      const top = el('span', 'scheduler-item__line');
      const name = el('span', 'scheduler-item__name', s.name);
      const much = el('span', 'scheduler-item__much', s.much);
      top.append(name, much);
      const meta = el('span', 'scheduler-item__meta', s.meta);
      title.append(top, meta);
      heading.append(arrow, title);
      const wrapper = el('div', 'rux--accordion__wrapper');
      const content = el('div', 'rux--accordion__content');
      content.id = `scheduler-entry-${e.key}`;
      heading.setAttribute('aria-controls', content.id);
      const grid = el('div', 'scheduler-dialog-grid');
      grid.append(...k.fields(e, part => `scheduler-f-e${e.key}-${part}`, rows));
      const actions = el('div', 'scheduler-quote-actions');
      const remove = el('button', 'rux--btn rux--btn--danger--ghost rux--btn--sm rux--layout--size-sm', 'Remove');
      remove.type = 'button';
      remove.addEventListener('click', () => redraw(() => { rows.splice(i, 1); open.delete(e.key); }));
      actions.appendChild(remove);
      content.append(grid, actions);
      wrapper.appendChild(content);
      li.append(heading, wrapper);
      // The heading follows the fields as they are typed in.
      const follow = () => {
        const now = k.said(readEntry(e));
        name.textContent = now.name;
        much.textContent = now.much;
        meta.textContent = now.meta;
      };
      content.addEventListener('input', follow);
      content.addEventListener('change', follow);
      list.appendChild(li);
    });
    list.addEventListener('rux:accordion-opened', ev => { const key = Number(ev.target.dataset.key); open.add(key); seen.add(key); });
    list.addEventListener('rux:accordion-closed', ev => open.delete(Number(ev.target.dataset.key)));
    const add = rowList();
    add.body.appendChild(listAddRow({
      label: k.add, id: 'scheduler-f-entryadd',
      onClick: () => {
        const key = ++entryKeys;
        redraw(() => { rows.push({ ...k.blank(), was: null, key }); open.add(key); seen.add(key); }, key);
      },
    }).li);
    const stack = el('div', 'rux--stack-vertical rux--stack-scale-5');
    stack.append(...(rows.length ? [list] : []), add.list);
    entriesHost.replaceChildren(stack);
    window.Rux?.datePicker?.init?.(entriesHost);
    if (focusKey != null) {
      const item = list.querySelector(`[data-key="${focusKey}"]`);
      item?.querySelector('.rux--accordion__heading')?.focus();
      item?.scrollIntoView({ block: 'nearest' });
    }
  }

  /* Done puts the copy in the kind's place. An entry a draft filled that was
     opened here has been checked, so its mark goes, as Done on its own
     window cleared it. */
  document.getElementById('scheduler-entries-done')?.addEventListener('click', () => {
    if (!entriesEdit) return;
    const { kind, rows, seen } = entriesEdit;
    const k = ENTRY_KINDS[kind];
    rows.forEach(readEntry);
    k.set(rows.filter(k.kept).map(({ was, key, ...e }) => (e.drafted && seen.has(key) ? { ...e, drafted: false } : e)));
    entriesEdit = null;
    window.Rux?.modal?.close?.('scheduler-entries-modal');
    k.redraw();
    refreshDirty();
  });

  /* The contract dialog: the day it was signed, today on a new one, and a
     note, such as who signed. Adding it is what marks the contract signed,
     so Done adds a new one filled in or not, and Cancel adds nothing. */
  let redrawContract = () => {};
  function openContractDialog() {
    const host = document.getElementById('scheduler-contract-fields');
    if (!host || !editing) return;
    const c = editing.contract ?? { on: iso(new Date()), note: null };
    document.getElementById('scheduler-contract-h').textContent =
      editing.contract ? 'Edit contract' : 'Contract signed';
    const grid = el('div', 'scheduler-dialog-grid');
    grid.append(
      dateOne('scheduler-f-signedon', 'Signed', c.on),
      textField('scheduler-f-signednote', 'Note', c.note),
    );
    host.replaceChildren(grid);
    // A signed contract comes off here, its one place, as an entry comes off in its window.
    if (editing.contract) {
      const actions = el('div', 'scheduler-quote-actions');
      const remove = el('button', 'rux--btn rux--btn--danger--ghost rux--btn--sm rux--layout--size-sm', 'Remove the signed contract');
      remove.type = 'button';
      remove.addEventListener('click', () => {
        editing.contract = null;
        window.Rux?.modal?.close?.('scheduler-contract-modal');
        redrawContract();
        refreshDirty();
      });
      actions.appendChild(remove);
      host.appendChild(actions);
    }
    window.Rux?.datePicker?.init?.(host);
    window.Rux?.modal?.open?.('scheduler-contract-modal');
  }

  document.getElementById('scheduler-contract-done')?.addEventListener('click', () => {
    const val = id => document.getElementById(id)?.value.trim() ?? '';
    editing.contract = { on: isoOrNull(val('scheduler-f-signedon')), note: val('scheduler-f-signednote') || null };
    window.Rux?.modal?.close?.('scheduler-contract-modal');
    redrawContract();
    refreshDirty();
  });

  /* ── The quote's lines ──
     A line is a quantity at a cost. A bus rental is one leg's buses at the
     price of one bus, so its quantity is always the Buses tab's count; a
     second driver is the extra drivers at one driver's pay; a discount is a
     negative cost. Pending rows like the POs, kept with their
     `trip_quote_lines` ids, and drawn on the Billing tab over Quoted price,
     which is their sum.

     The item names and descriptions are the office's QuickBooks items, so a
     line reads the same on the printed quote and in the estimate. */
  const LINE_KINDS = [
    { kind: 'rental', label: 'Bus rental', item: 'Bus Rental', description: '' },
    { kind: 'second_driver', label: 'Second driver', item: "Addt'l Driver",
      description: 'Additional driver required by law after exceeding 10 driving hrs or 15 on-duty hrs.' },
    { kind: 'relief', label: 'Relief driver', item: "Addt'l Driver", description: 'Relief driver.' },
    { kind: 'discount', label: 'Discount', item: 'Deductions', description: 'Discount approved by manager.' },
    { kind: 'hotel', label: 'Hotel', item: 'Hotel', description: 'Hotel room for the drivers.' },
    { kind: 'other', label: 'Other', item: '', description: '' },
  ];
  const lineKind = kind => LINE_KINDS.find(k => k.kind === kind) ?? LINE_KINDS.at(-1);

  /* THE HOTEL IS A QUOTE LINE. A trip needs a hotel while it has a Hotel line,
     or while it carried the reminder before there were lines, until a Hotel
     line is taken off. Each leg's confirmation is typed in the line's window,
     and typing one marks that leg booked. */
  const hotelNeeded = () => !!editing && (linePending.some(l => l.kind === 'hotel') || !!editing.hotelWanted);
  const hotelLeg = l => (splitNow() ? (l.leg ?? 'outbound') : 'outbound');
  // What the Route tab's stop dialog does on Done, set each time it opens.
  let stopDone = null;
  // The Route tab's redraw when its Pickup or Drop-off dialog closes.
  let routeEndsClosed = null;
  for (const id of ['scheduler-pickup-modal', 'scheduler-dropoff-modal']) {
    document.getElementById(id)?.addEventListener('rux:modal-closed', () => routeEndsClosed?.());
  }
  document.getElementById('scheduler-stop-done')?.addEventListener('click', () => stopDone?.());

  /* The route times, one settings row for every trip, each a choice of
     minutes; a value saved outside the choices is offered as well. */
  const MINUTE_CHOICES = [0, 5, 10, 15, 20, 25, 30, 45, 60];
  const PERCENT_CHOICES = [0, 5, 10, 15, 20, 25, 30];
  function openRouteTimes() {
    const host = document.getElementById('scheduler-routetimes-fields');
    if (!host) return;
    const choices = now => [...new Set([...MINUTE_CHOICES, now])].sort((a, b) => a - b)
      .map(n => [String(n), n ? `${n} min` : 'None']);
    const grid = el('div', 'rux--stack-vertical rux--stack-scale-6');
    grid.append(
      selectField('scheduler-f-rtspot', 'Spot at the pickup before departure', String(routeTimes.spot), choices(routeTimes.spot)),
      selectField('scheduler-f-rtpre', 'Pre-trip at the yard, before the bus leaves', String(routeTimes.pre), choices(routeTimes.pre)),
      selectField('scheduler-f-rtpost', 'Post-trip at the yard, after the bus is back', String(routeTimes.post), choices(routeTimes.post)),
      selectField('scheduler-f-rtslow', 'Bus drives slower than the map by', String(routeTimes.slow),
        [...new Set([...PERCENT_CHOICES, routeTimes.slow])].sort((a, b) => a - b).map(n => [String(n), n ? `${n}%` : 'None'])),
    );
    host.replaceChildren(grid);
    document.getElementById('scheduler-routetimes-error').textContent = '';
    window.Rux?.modal?.open?.('scheduler-routetimes-modal');
  }
  document.getElementById('scheduler-routetimes-save')?.addEventListener('click', async () => {
    const button = document.getElementById('scheduler-routetimes-save');
    const num = id => Number(document.getElementById(id)?.value);
    const value = { spot_minutes: num('scheduler-f-rtspot'), pre_trip_minutes: num('scheduler-f-rtpre'),
                    post_trip_minutes: num('scheduler-f-rtpost'), drive_slowdown_percent: num('scheduler-f-rtslow') };
    button.disabled = true;
    try {
      const { error } = await withTimeout(client.from('settings')
        .upsert({ key: 'route-times-v1', value }, { onConflict: 'key' }).then(r => r));
      if (error) throw error;
      setRouteTimes(value);
      window.Rux?.modal?.close?.('scheduler-routetimes-modal');
      routeTimesDrawn?.();
    } catch {
      document.getElementById('scheduler-routetimes-error').textContent = "The route times didn't save. Try again.";
    } finally {
      button.disabled = false;
    }
  });

  function openFuelLimits() {
    const host = document.getElementById('scheduler-fuelcard-fields');
    if (!host) return;
    const grid = el('div', 'scheduler-dialog-grid');
    const miles = moneyField('scheduler-f-fuelmiles', 'Over miles', fuelLimits.miles);
    const days = moneyField('scheduler-f-fueldays', 'Over days', fuelLimits.days);
    grid.append(miles, days);
    host.replaceChildren(grid);
    document.getElementById('scheduler-fuelcard-error').textContent = '';
    window.Rux?.modal?.open?.('scheduler-fuelcard-modal');
  }
  document.getElementById('scheduler-fuelcard-save')?.addEventListener('click', async () => {
    const button = document.getElementById('scheduler-fuelcard-save');
    const error = document.getElementById('scheduler-fuelcard-error');
    const miles = money(document.getElementById('scheduler-f-fuelmiles')?.value);
    const days = money(document.getElementById('scheduler-f-fueldays')?.value);
    if (!(miles > 0) || !(days > 0)) { error.textContent = 'Both limits need a number above 0.'; return; }
    const value = { miles: Math.round(miles), days: Math.round(days) };
    button.disabled = true;
    try {
      const { error: failed } = await withTimeout(client.from('settings')
        .upsert({ key: 'fuel-card-v1', value }, { onConflict: 'key' }).then(r => r));
      if (failed) throw failed;
      setFuelLimits(value);
      window.Rux?.modal?.close?.('scheduler-fuelcard-modal');
      routeTimesDrawn?.();
    } catch {
      error.textContent = "The fuel card limits didn't save. Try again.";
    } finally {
      button.disabled = false;
    }
  });

  let linePending = [];
  let redrawLines = () => {};
  // The Billing tab's dead-mile offer, drawn again as the route's dead miles move.
  let redrawDeadOffer = () => {};
  // The Billing tab's Quote sent section, redrawn as the quoted price moves.
  let redrawQuoteSent = () => {};
  // Set once the Buses tab has drawn, so a line's bus count reads this trip's.
  let linesLive = false;
  // The trip and leg the quote calculator beside the week was filled from.
  let calcFor = null;

  const round2 = n => Math.round(n * 100) / 100;
  // Money to the cent, as a quote prints it, with a true minus for a discount.
  const usdCents = n => `${n < 0 ? '−' : ''}$${Math.abs(n).toLocaleString('en-US',
    { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  /* A LEG CANNOT END BEFORE IT STARTS. It would cover no day and have no bar
     on any week, so Save holds until the leg on screen's dates are put right. */
  const ENDS_FIRST = 'The end date is before the start date.';
  const endsBeforeStart = (fromId, toId) => {
    const from = isoOrNull(document.getElementById(fromId)?.value);
    const to = isoOrNull(document.getElementById(toId)?.value);
    return !!from && !!to && to < from;
  };
  const datesWrong = () => endsBeforeStart('scheduler-f-start', 'scheduler-f-end');
  /* What holds Save, in words, or null. The Save button is disabled for the
     same reasons; this answers the ways to Save that are not that button,
     such as the box that asks before unsaved work is left. */
  function saveHeldBy() {
    if (!isoOrNull(document.getElementById('scheduler-f-start')?.value)) return 'It needs a start date.';
    if (!document.getElementById('scheduler-f-destination')?.value.trim()) return 'It needs a destination.';
    return datesWrong() ? ENDS_FIRST : null;
  }
  /* A leg's vehicles, by its key or by the old word a quote line names it
     by. A line of a trip that is not split names no leg, and goes by the
     first leg's. */
  const fleetOfLeg = leg => editing?.fleet?.[legHeld(leg) ? leg : legKeyOf(leg === 'return' ? 'return' : 'outbound')] ?? [];
  // A leg's buses on the Buses tab.
  const legBuses = leg => Math.max(fleetOfLeg(leg).length, 1);
  // A leg's co-driver seats that are on, which a second driver line counts.
  const coDrivers = leg => fleetOfLeg(leg)
    .filter(b => b.seats?.['co-driver']?.on).length;
  /* Turns the co-driver seat on or off on every bus of a leg, as the Buses
     tab's seat toggle does, for Save to keep. A seat with a driver in it is
     not turned off; the count of those comes back. */
  function setCoDrivers(leg, on) {
    const buses = fleetOfLeg(leg);
    if (on && !buses.length) {
      toast('info', 'No bus on this leg yet', 'Add one on the Buses tab, then its co-driver.');
      return 0;
    }
    let kept = 0;
    for (const b of buses) {
      const seat = b.seats?.['co-driver'];
      if (!seat) continue;
      if (!on && seat.driverId) { kept++; continue; }
      seat.on = on;
    }
    drawFleet();
    refreshDirty();
    return kept;
  }
  // A leg's relief seats that are on, at the start or the end, on any bus:
  // each is a relief driver, charged on its own.
  const reliefSeats = leg => fleetOfLeg(leg)
    .reduce((n, b) => n + (b.seats?.['relief-start']?.on ? 1 : 0) + (b.seats?.['relief-end']?.on ? 1 : 0), 0);
  const lineQty = l => (l.kind === 'rental' ? legBuses(l.leg)
    : l.kind === 'second_driver' && linesLive && coDrivers(l.leg) > 0 ? coDrivers(l.leg)
    : l.kind === 'relief' && linesLive && reliefSeats(l.leg) > 0 ? reliefSeats(l.leg)
    : money(String(l.quantity ?? '')));
  const lineAmount = l => {
    const cost = money(String(l.cost ?? ''));
    return cost === null ? null : round2((lineQty(l) ?? 1) * cost);
  };
  const linesTotal = () => round2(linePending.reduce((n, l) => n + (lineAmount(l) ?? 0), 0));

  /* ── What the calculator says a line costs ──
     The quote calculator's own formulas, `Rux.quote`, on what the editor
     already knows of a leg: its miles by route, the drive from the yard and
     back as its dead miles, and its days as the customer sees them. The rates
     are read once, the first time a trip opens. */
  let quoteRates = null;
  let quoteRatesAsked = null;
  function askQuoteRates() {
    if (quoteRates || quoteRatesAsked || !client) return;
    quoteRatesAsked = Promise.all([
      client.from('quote_rates').select('key,value'),
      client.from('quote_mileage_rates').select('id,rate,note,is_default'),
    ]).then(([named, miles]) => {
      if (named.error || miles.error) throw new Error((named.error || miles.error).message);
      quoteRates = {
        named: Object.fromEntries((named.data || []).map(r => [r.key, Number(r.value)])),
        mileage: (miles.data || []).map(m => ({ ...m, rate: Number(m.rate) })).sort((a, b) => a.rate - b.rate),
      };
      /* The lines draw again even when no price moved, because a typed
         cost's calculator price, a rental's rate and the dead-mile offer
         are read from these rates. Save's state is refreshed only when a
         price moved. */
      if (linesLive) {
        const moved = syncLines();
        redrawLines();
        if (moved) refreshDirty();
      }
    }).catch(err => {
      quoteRatesAsked = null;
      console.warn('The quote rates did not load:', err);
    });
  }
  /* THE RATE A TRIP STARTS FROM is the one the Settings page's Calendar gives
     the month of its first day, and the default rate where that month has
     none. It is only where a rental line and the calculator start: a rate
     picked on the line stays the line's. */
  let rateCalendar = {};        // `rate-calendar-v1`: a month's number to a mileage rate's id
  let deadMilesLimit = null;    // `dead-miles-v1`: the dead miles past which the discount is offered
  const tripFirstDay = () => (editing?.legs?.length ? legDaysNow(editing.legs[0].key)?.from : null) ?? editing?.trip?.start_date ?? null;
  const calendarRate = () => {
    const day = tripFirstDay();
    const id = day ? rateCalendar[Number(day.slice(5, 7))] : null;
    return id ? quoteRates?.mileage.find(m => m.id === id) ?? null : null;
  };
  const defaultRate = () => (calendarRate() ?? quoteRates?.mileage.find(m => m.is_default))?.rate ?? null;
  /* A rental's rate in words, so a price says what made it: the rate, its
     note, and the month when it is the rate the Calendar gives the trip's. A
     line keeps the rate it was priced on, so the month is named by the rate
     and not by how it was picked. */
  const rateWords = l => {
    const rate = l.rate ?? defaultRate();
    if (rate == null) return null;
    // A trip under the local line is the flat daily rate, whatever the mileage rate.
    const b = lineBasis(l);
    if (b.perDay && quoteRates && window.Rux?.quote?.tripQuote({ miles: b.perDay, rate, dead: 0 }, quoteRates.named).local) {
      return 'Local daily rate';
    }
    const note = quoteRates?.mileage.find(m => m.rate === rate)?.note || null;
    const month = calendarRate()?.rate === rate
      ? `${parseISO(tripFirstDay()).toLocaleDateString('en-US', { month: 'long' })} rate` : null;
    return [`$${Number(rate).toFixed(2)}/mi`, note, month].filter(Boolean).join(' · ');
  };

  /* A leg's miles, dead miles and days, and its miles a day as the quote
     calculator prices them. The Route tab's own leg reads the Summary's rows
     and total, from the drives it has looked up since the trip opened; the
     other leg reads its saved stops, spread over its days. Estimated miles stand in
     only while the route has no miles, on a trip of one leg. `leg` is a key,
     or an old word. */
  function legFigures(leg) {
    const key = legHeld(leg) ? leg : legKeyOf(leg);
    const r = editing?.route;
    const mine = !!r && r.leg === key;
    const stops = (editing?.stops || []).filter(st => keyOfRow(editing.trip, st) === key);
    const pickup = stops.find(st => st.type === 'pickup');
    const back = stops.filter(st => st.type === 'return').at(-1);
    const out = mine ? r.driveMiles : numOrNull(pickup?.miles);
    const home = mine ? r.backMiles : numOrNull(back?.miles);
    const between = stops.filter(st => st !== pickup && st !== back)
      .reduce((n, st) => n + (Number(st.miles) || 0), 0);
    // The open leg's total is the Summary's own, so a stop added or moved
    // since the trip opened, or a new trip's whole route, is counted.
    const routeMiles = mine && r.legMiles != null ? r.legMiles
      : between + (Number(out) || 0) + (Number(home) || 0);
    const est = fleetLegs().length > 1 ? null : money(document.getElementById('scheduler-f-estmiles')?.value ?? '');
    const { from = null, to = null } = legDaysNow(key) ?? {};
    const days = from && to ? Math.max(1, Math.round((parseISO(to) - parseISO(from)) / 86400000) + 1) : null;
    const whole = Math.round(routeMiles > 0 ? routeMiles : est ?? 0);
    const perDay = window.SchedulerQuoteLines.milesADay(mine ? r.dayMiles : null, whole, days);
    return { miles: perDay ? perDay.reduce((a, b) => a + b, 0) : 0,
      dead: round2((Number(out) || 0) + (Number(home) || 0)), days, perDay, route: routeMiles };
  }

  /* ESTIMATED MILES FOLLOW THE ROUTE. The column is the trip's miles
     override, and driver records read no other miles, so a blank field is not saved
     blank: Save writes the route's miles, every leg together, rounded as the
     Summary's Total is. A figure typed in the field is saved as typed. A trip
     that opened following and still does is not a change by itself, so an
     untouched trip stays untouched and the figure goes with the next save. */
  const routeTotal = () => {
    const n = fleetLegs().reduce((t, l) => t + legFigures(l).route, 0);
    return n > 0 ? Math.round(n) : null;
  };
  const estTyped = () => money(document.getElementById('scheduler-f-estmiles')?.value);
  const estFollows = () => !!editing?.estFollowed && estTyped() === null;
  function syncEstHint() {
    const input = document.getElementById('scheduler-f-estmiles');
    if (!input) return;
    const total = routeTotal();
    if (total) input.placeholder = `${total} by route`; else input.removeAttribute('placeholder');
  }

  // What a line is priced from, and the calculator's cost for one bus or one
  // extra driver; null where the leg has no miles or days yet.
  /* A rental counts dead miles only once they are turned on, from the line's
     window or the calculator: the route's, or a figure typed over them. */
  function lineBasis(l) {
    const f = legFigures(l.leg);
    const dead = !l.deadOn ? 0 : l.deadTyped ? Number(l.dead_miles) || 0 : f.dead;
    return { miles: f.miles, perDay: f.perDay, dead, days: f.days, rate: l.rate ?? defaultRate() };
  }
  function calcCost(l, b = lineBasis(l)) {
    return window.SchedulerQuoteLines.calculated(l.kind, b, quoteRates?.named);
  }

  /* Brings the lines in step with the editor, and says whether any moved.
     A cost nobody typed follows the calculator when what it is priced from
     changes, until the price is settled, as quote-lines.js says, and a rental
     line keeps the miles, dead miles and rate it was priced on. On a trip priced as lines, a leg's second driver line comes
     when its co-driver seats change and one is on, and goes with the last. */
  function syncLines() {
    if (!editing) return false;
    let moved = false;
    if (linePending.some(l => l.kind === 'rental')) {
      const legs = splitNow() ? ['outbound', 'return'] : [null];
      // A relief line follows the relief seats as a second driver line
      // follows the co-driver seats, and sits after it.
      for (const [kindName, seats, store] of [['second_driver', coDrivers, 'coBefore'], ['relief', reliefSeats, 'reliefBefore']]) {
        editing[store] ??= {};
        for (const leg of legs) {
          const key = leg ?? 'outbound';
          const now = seats(key);
          const was = editing[store][key] ?? now;
          const at = linePending.findIndex(l => l.kind === kindName && (l.leg ?? null) === leg);
          if (was !== now && now > 0 && at < 0) {
            const kind = lineKind(kindName);
            const after = linePending.findLastIndex(l => (l.kind === 'rental' || l.kind === 'second_driver') && (l.leg ?? null) === leg);
            linePending.splice(after < 0 ? linePending.length : after + 1, 0, {
              kind: kindName, leg, item: kind.item, description: kind.description,
              quantity: null, cost: null, cost_typed: false, miles: null, dead_miles: null, rate: null,
            });
            moved = true;
          } else if (was > 0 && now === 0 && at >= 0) {
            linePending.splice(at, 1);
            moved = true;
          }
          editing[store][key] = now;
        }
      }
    }
    const held = window.SchedulerQuoteLines.settled(billingNow());
    for (const l of linePending) {
      if (!window.SchedulerQuoteLines.priced(l.kind)) continue;
      const b = lineBasis(l);
      const key = JSON.stringify(b);
      if (!window.SchedulerQuoteLines.reprices(l, { moved: l.basis !== key, settled: held })) continue;
      const cost = calcCost(l, b);
      if (cost == null) continue;
      if (cost !== money(String(l.cost ?? ''))) moved = true;
      l.cost = cost;
      l.basis = key;
      if (l.kind !== 'relief') l.miles = b.miles;
      if (l.kind === 'rental') {
        l.dead_miles = b.dead;
        l.rate = b.rate;
      }
    }
    return moved;
  }

  /* Brings the lines in step and, where a price moved, draws them again, so
     the Billing card and the quoted price, which follows the lines' total,
     show what Save writes. True when a price moved. */
  function followLines() {
    if (!linesLive || !syncLines()) return false;
    redrawLines();
    return true;
  }

  /* A line in words, as its tile on the Billing tab shows it:
     its name, its quantity at its cost with what the calculator makes it
     where the two differ, a rental's rate, and its amount. A line that
     follows the calculator and has no cost yet reads at the calculator's. */
  function lineSummary(l, held = window.SchedulerQuoteLines.settled(billingNow())) {
    const QL = window.SchedulerQuoteLines;
    const own = money(String(l.cost ?? ''));
    const cost = own ?? (QL.follows(l) ? calcCost(l) : null);
    const qty = lineQty(l) ?? 1;
    const calc = QL.offers(l, held) ? calcCost(l) : null;
    const meta = [
      splitNow() && (l.kind === 'rental' || l.kind === 'second_driver') ? (l.leg === 'return' ? 'Pickup' : 'Drop-off') : null,
      cost === null ? 'No cost yet' : `${qty} × ${usdCents(cost)}`,
      calc !== null && calc !== cost ? `calculator ${usdCents(calc)}` : null,
      // A typed cost was not made by a rate, so it names none.
      l.kind === 'rental' && !l.cost_typed ? rateWords(l) : null,
    ].filter(Boolean).join(' · ');
    return { name: l.item || lineKind(l.kind).label, meta, much: cost === null ? '' : usdCents(round2(qty * cost)),
      amount: cost === null ? 0 : round2(qty * cost), calc: calc !== null && calc !== cost ? calc : null };
  }

  /* ── A quote line's window ──
     Each line is a tile on the Billing tab, as each vehicle is on the Buses
     tab, and pressing one opens this window on that line alone; Add line
     opens it on a new one. It edits a copy, so Cancel leaves the line as it
     was and Done puts the copy in its place, and no other line is ever open
     beside it. A trip with no lines starts from its rentals: the first opens
     here, and Cancel takes them back off. */
  let quoteEdit = null;            // { line: the copy, index: its place, or null for a new one, seeded: lines Cancel takes off }
  let quoteKeys = 0;
  // Set by the Billing tab: the rental lines a trip with none starts from.
  let quoteSeed = () => [];
  const quoteHost = document.getElementById('scheduler-quote-fields');

  function openLineDialog(index, seeded = []) {
    if (!quoteHost || !editing) return;
    const was = index === null ? null : linePending[index];
    const line = was ? { ...was, was, key: ++quoteKeys }
      : { kind: 'other', was: null, key: ++quoteKeys, cost: null, quantity: null };
    quoteEdit = { line, index, seeded };
    document.getElementById('scheduler-quote-h').textContent = was ? (was.item || lineKind(was.kind).label) : 'Add line';
    quoteHost.replaceChildren(lineFields(line));
    window.Rux?.modal?.open?.('scheduler-quote-modal');
  }
  // The empty Quote tile starts the trip's rentals and opens the first.
  function startQuote() {
    const seeded = quoteSeed();
    if (!seeded.length) { openLineDialog(null); return; }
    linePending.push(...seeded);
    redrawLines();
    refreshDirty();
    openLineDialog(linePending.indexOf(seeded[0]), seeded);
  }

  /* One line's fields, each id carrying the line's key: what the line is,
     which leg on a split trip, the words the quote prints and the price, and
     only those its kind uses. A bus rental's quantity is the leg's buses and
     its item is Bus Rental, so it shows neither; its description left blank
     is written from the trip when the quote is printed, so it follows the
     trip's dates and times. A blank description waits behind Add
     description. The fields stand two to a row in a fixed order, Kind
     and Item, the leg, Quantity and Cost, then a rental's rate, so a field a kind does not use
     leaves the next to close up in pairs. */
  function lineFields(l) {
    const id = part => `scheduler-f-q${l.key}-${part}`;
    const grid = el('div', 'scheduler-dialog-grid scheduler-dialog-grid--pairs');
    const kind = selectField(id('kind'), 'Kind', l.kind, LINE_KINDS.map(k => [k.kind, k.label]));
    const leg = splitNow()
      ? selectField(id('leg'), 'Leg', l.leg ?? 'outbound', [['outbound', 'Drop-off'], ['return', 'Pickup']])
      : null;
    const item = textField(id('item'), 'Item', l.item ?? lineKind(l.kind).item);

    const descItem = el('div', 'rux--form-item scheduler-dialog-grid__wide');
    const descLabel = el('div', 'rux--text-area__label-wrapper');
    const descLab = el('label', 'rux--label', 'Description');
    descLab.setAttribute('for', id('desc'));
    descLabel.appendChild(descLab);
    const descWrap = el('div', 'rux--text-area__wrapper');
    const desc = el('textarea', 'rux--text-area');
    desc.id = id('desc');
    desc.rows = 3;
    desc.value = l.description ?? (l.was ? '' : lineKind(l.kind).description);
    descWrap.appendChild(desc);
    const descHelp = el('div', 'rux--form__helper-text', 'Left blank, a bus rental is described from the trip.');
    descItem.append(descLabel, descWrap, descHelp);
    const descAdd = el('div', 'scheduler-dialog-grid__wide');
    const descBtn = el('button', 'rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm', 'Add description');
    descBtn.type = 'button';
    descAdd.appendChild(descBtn);
    let descOpen = !!desc.value.trim();
    descBtn.addEventListener('click', () => { descOpen = true; sync(); desc.focus(); });

    const cost = money(String(l.cost ?? ''));
    const qty = moneyField(id('qty'), 'Quantity', l.kind === 'rental' ? legBuses(l.leg) : (l.quantity ?? 1));
    // quote-lines.js says what Cost opens on: nothing, on a line that follows the calculator.
    const costField = moneyField(id('cost'), l.kind === 'discount' ? 'Amount off' : 'Cost',
      window.SchedulerQuoteLines.costShown(l, cost));
    /* A bus rental is priced at a mileage rate on its miles. The rate is
       picked from the calculator's list. Dead miles, the drive from the yard
       and back, are left out until they are typed in; the route's figure is
       the field's hint. */
    const rateField = selectField(id('rate'), 'Mileage rate', String(l.rate ?? defaultRate() ?? ''),
      (quoteRates?.mileage ?? []).map(m => [String(m.rate), `$${m.rate.toFixed(2)}${m.note ? ` · ${m.note}` : ''}`]));
    const routeDead = legFigures(l.leg).dead;
    const deadField = moneyField(id('dead'), 'Dead miles', !l.deadOn ? null : l.deadTyped ? l.dead_miles : routeDead);
    deadField.querySelector('input').placeholder = routeDead > 0 ? `None · ${Math.round(routeDead)} by route` : 'None';
    const costHelp = el('div', 'rux--form__helper-text scheduler-dialog-grid__wide');
    /* What a blank Cost becomes, for the kind and leg chosen now: the
       calculator's figure stands in the empty field, as Estimated miles
       shows the route's, and the help under it says where it comes from. */
    const drawCostHelp = (k, legNow) => {
      const line = { ...l, kind: k, leg: splitNow() ? legNow : l.leg };
      const b = lineBasis(line);
      const calc = calcCost(line, b);
      costField.querySelector('input').placeholder = calc === null ? '' : usdCents(calc);
      costHelp.textContent = k === 'relief'
        ? (calc === null ? 'Left blank, the cost is the rates page\'s relief charge.' : `Left blank, the cost is the rates page's relief charge: ${usdCents(calc)}.`)
        : calc === null
          ? 'Left blank, the cost is worked out once the trip has miles and dates.'
          : `Left blank, the cost is the calculator's: ${usdCents(calc)} on ${Math.round(b.miles)} miles over ${b.days} ${b.days === 1 ? 'day' : 'days'}.`;
    };
    const hotelRef = textField(id('hotelref'), 'Confirmation number', l.hotelRef !== undefined ? l.hotelRef : editing?.hotel?.[hotelLeg(l)]?.ref ?? null);
    hotelRef.classList.add('scheduler-dialog-grid__wide');
    hotelRef.appendChild(el('div', 'rux--form__helper-text', 'Typed in, the hotel counts as booked.'));
    grid.append(kind, item, ...(leg ? [leg] : []), qty, costField, rateField, deadField, costHelp, hotelRef, descItem, descAdd);

    // The kind decides the item's usual name and words, whether the quantity
    // is the leg's buses, and what the price is called.
    const kindSelect = kind.querySelector('select');
    const legSelect = leg?.querySelector('select') ?? null;
    const sync = () => {
      const k = kindSelect.value;
      const qtyInput = qty.querySelector('input');
      const legNow = legSelect?.value ?? null;
      const drivers = k === 'second_driver' ? coDrivers(legNow) : 0;
      qtyInput.disabled = k === 'rental' || drivers > 0;
      if (k === 'rental') qtyInput.value = String(legBuses(legNow));
      if (drivers > 0) qtyInput.value = String(drivers);
      // A quantity the buses or seats set is not typed, so it is not shown.
      qty.hidden = qtyInput.disabled;
      item.hidden = k === 'rental';
      descItem.hidden = !descOpen;
      descAdd.hidden = descOpen;
      descHelp.hidden = k !== 'rental';
      rateField.hidden = k !== 'rental' || !quoteRates;
      deadField.hidden = k !== 'rental';
      costHelp.hidden = !window.SchedulerQuoteLines.priced(k);
      if (!costHelp.hidden) drawCostHelp(k, legNow);
      costField.querySelector('label').textContent = k === 'discount' ? 'Amount off' : 'Cost';
      // A hotel's confirmation is its leg's; a new leg shows that leg's.
      hotelRef.hidden = k !== 'hotel';
      const refInput = hotelRef.querySelector('input');
      if (refInput.dataset.leg && refInput.dataset.leg !== (legNow ?? 'outbound')) {
        refInput.value = editing?.hotel?.[splitNow() ? (legNow ?? 'outbound') : 'outbound']?.ref ?? '';
      }
      refInput.dataset.leg = legNow ?? 'outbound';
    };
    let kindBefore = l.kind;
    kindSelect.addEventListener('change', () => {
      const itemInput = item.querySelector('input');
      // A name or description still the old kind's usual one follows the new
      // kind; one typed over stays.
      if (!itemInput.value.trim() || itemInput.value === lineKind(kindBefore).item) {
        itemInput.value = lineKind(kindSelect.value).item;
      }
      if (!desc.value.trim() || desc.value === lineKind(kindBefore).description) {
        desc.value = lineKind(kindSelect.value).description;
      }
      // A kind with words opens them; a blank description folds back behind Add description.
      descOpen = !!desc.value.trim();
      kindBefore = kindSelect.value;
      sync();
    });
    legSelect?.addEventListener('change', sync);
    sync();
    return grid;
  }

  /* A line as its fields stand, kept on its copy. Cost keeps what
     quote-lines.js says: a blank on a settled trip holds the cost the line
     had; the tile's Use calculator price lets it follow again. */
  function readLine(l) {
    const val = part => document.getElementById(`scheduler-f-q${l.key}-${part}`)?.value.trim() ?? '';
    if (!document.getElementById(`scheduler-f-q${l.key}-kind`)) return l;
    const QL = window.SchedulerQuoteLines;
    const kind = val('kind') || 'other';
    const typed = money(val('cost'));
    const was = l.was;
    const held = was && was.kind === kind && QL.follows(was) && QL.settled(billingNow()) ? was.cost ?? null : null;
    Object.assign(l, {
      kind,
      leg: splitNow() ? (val('leg') || 'outbound') : null,
      // A rental's item is Bus Rental, as its field is not shown.
      item: kind === 'rental' ? (l.item || lineKind('rental').item || null) : (val('item') || null),
      description: val('desc') || null,
      quantity: kind === 'rental' ? null : money(val('qty')),
      ...QL.costKept(kind, typed, held),
      hotelRef: val('hotelref') || null,
    });
    if (kind === 'rental') {
      const rate = money(val('rate'));
      const dead = money(val('dead'));
      const on = dead !== null && dead > 0;
      Object.assign(l, { rate: rate ?? was?.rate ?? null,
        dead_miles: on ? dead : null, deadOn: on,
        deadTyped: on && Math.round(dead) !== Math.round(legFigures(l.leg).dead) });
    }
    return l;
  }

  /* Done puts the copy in the line's place. A new line left with no item,
     no words and no cost adds nothing. A hotel line's confirmation is its
     leg's, and typing one marks the leg booked. */
  document.getElementById('scheduler-quote-done')?.addEventListener('click', () => {
    if (!quoteEdit) return;
    const { line, index } = quoteEdit;
    readLine(line);
    const empty = !(line.item || line.description || line.cost !== null || line.kind === 'rental');
    if (line.kind === 'hotel' && editing?.hotel) {
      const stay = editing.hotel[hotelLeg(line)];
      stay.ref = line.hotelRef ?? null;
      if (stay.ref) stay.booked = true;
    }
    // Co-drivers and relief already on get their lines with the first rental.
    if (line.kind === 'rental' && !linePending.some((l, i) => l.kind === 'rental' && i !== index)) {
      editing.coBefore = { outbound: 0, return: 0 };
      editing.reliefBefore = { outbound: 0, return: 0 };
    }
    const { was, key, hotelRef, ...kept } = line;
    const saved = { miles: null, dead_miles: null, rate: null, ...kept };
    const hadHotel = linePending.some(l => l.kind === 'hotel');
    if (index === null) { if (!empty) linePending.push(saved); } else linePending[index] = saved;
    // With no hotel line left, the trip's hotel reminder goes too.
    if (hadHotel && !linePending.some(l => l.kind === 'hotel')) editing.hotelWanted = false;
    quoteEdit = null;
    window.Rux?.modal?.close?.('scheduler-quote-modal');
    redrawLines();
    refreshDirty();
  });
  // Cancel, Close or Escape: the rentals an empty quote started from go back off.
  document.getElementById('scheduler-quote-modal')?.addEventListener('rux:modal-closed', () => {
    if (quoteEdit?.seeded.length) {
      linePending = linePending.filter(l => !quoteEdit.seeded.includes(l));
      redrawLines();
      refreshDirty();
    }
    quoteEdit = null;
  });

  /* A line's row in the Quote card, as the Billing card has a row a step:
     its name and amount over its leg, quantity and cost and rate, opening
     its window; Move up, Move down, Use calculator price where the
     calculator disagrees, and Remove on its right-click or hold. Nothing is
     written until Save, so Remove does not ask: Reset takes it back. */
  function quoteLineRow(l, i, held) {
    const s = lineSummary(l, held);
    const change = run => { run(); redrawLines(); refreshDirty(); };
    const title = [s.name, s.meta, s.much].filter(Boolean).join(' · ');
    const row = quoteRow({ name: s.name, meta: s.meta, much: s.much, title });
    row.dataset.lineKind = l.kind;
    row.setAttribute('aria-label', `Edit quote line ${i + 1}, ${s.name}`);
    let heldPress = false;
    row.addEventListener('pointerdown', () => { heldPress = false; });
    row.addEventListener('click', e => {
      if (heldPress) { heldPress = false; e.preventDefault(); return; }
      openLineDialog(i);
    });
    contextItems(row, [
      { label: 'Edit', run: () => openLineDialog(i) },
      { label: 'Move up', disabled: i === 0, run: () => change(() => linePending.splice(i - 1, 0, linePending.splice(i, 1)[0])) },
      { label: 'Move down', disabled: i === linePending.length - 1, run: () => change(() => linePending.splice(i + 1, 0, linePending.splice(i, 1)[0])) },
      ...(s.calc !== null ? [{ label: `Use calculator price, ${usdCents(s.calc)}`,
        run: () => change(() => Object.assign(l, { cost: null, cost_typed: false, basis: null })) }] : []),
      { label: 'Remove', danger: true, run: () => change(() => {
        linePending.splice(i, 1);
        if (l.kind === 'hotel' && !linePending.some(x => x.kind === 'hotel') && editing) editing.hotelWanted = false;
      }) },
    ], title, () => { heldPress = true; });
    return row;
  }
  // A press in the Quote card, drawn as the Billing card's rows are.
  function quoteRow({ name, meta, much = '', title, none }) {
    const row = el('button', 'scheduler-billing-step');
    row.type = 'button';
    const top = el('span', 'scheduler-item__line');
    top.append(el('span', `scheduler-item__name${none ? ' scheduler-fleet-tile__none' : ''}`, name),
      el('span', 'scheduler-item__much', much));
    row.append(top, el('span', 'scheduler-item__meta', meta || ''));
    row.title = title;
    return row;
  }

  /* The lines Save writes, in order, each with the quantity and amount it has
     now: a rental's quantity is read from the Buses tab at the moment of the
     save. It only reads, since the checks that call it draw nothing: a price
     is moved by `followLines`, which draws it. */
  const linesToSave = () => linePending.map((l, position) => ({
    id: l.id ?? null, position, kind: l.kind, leg: l.leg ?? null,
    item: l.item ?? null, description: l.description ?? null,
    quantity: lineQty(l), cost: money(String(l.cost ?? '')), amount: lineAmount(l),
    cost_typed: !!l.cost_typed,
    miles: l.miles ?? null, dead_miles: l.dead_miles ?? null, rate: l.rate ?? null,
  }));

  /* The lines as writes, by id like `listPatch`. A trip opened without its
     lines writes none. */
  function linesPatch() {
    if (!editing || editing.linesLoaded === false) return null;
    const was = editing.lines || [];
    const NUMBERS = ['quantity', 'cost', 'amount', 'miles', 'dead_miles', 'rate'];
    const keys = ['position', 'kind', 'leg', 'item', 'description', 'cost_typed', ...NUMBERS];
    const seen = new Set();
    const inserts = [];
    const updates = [];
    linesToSave().forEach(({ id, ...row }) => {
      const before = id ? was.find(w => String(w.id) === String(id)) : null;
      if (!before) { inserts.push(row); return; }
      seen.add(String(id));
      const moved = keys.some(k => !same(row[k],
        NUMBERS.includes(k) ? money(String(before[k] ?? '')) : (before[k] ?? null)));
      if (moved) updates.push({ id: String(id), patch: row });
    });
    const deletes = was.filter(w => !seen.has(String(w.id))).map(w => String(w.id));
    return { inserts, updates, deletes, work: !!(inserts.length || updates.length || deletes.length) };
  }

  /* The rows Save writes for one list, the pending rows in order. A PO
     received is a row, one with nothing typed if need be, so `po_received`
     always agrees with whether rows exist. */
  function listRowsToSave(kind) {
    const po = kind === 'po';
    const refKey = po ? 'ref' : 'number';
    return (po ? poPending : invPending).map((p, position) => ({
      id: p.id ?? null, position, [refKey]: p[refKey] ?? null,
      amount: money(String(p.amount ?? '')), date: p.date ?? null,
    }));
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
     trip opened, so a row saved elsewhere after that is neither updated nor
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
     when its trip ends, and the times worked out from them, kept in the
     `trip_stops` rows the board reads. The leg's `pickup` stop
     holds the pickup place, the drive from the yard, the yard departure in
     `depart_prev` and the spot time. The first `stop` after it holds the
     departure from the pickup in `depart_prev`. Its last
     `return` stop, the yard, holds when the trip ends in `depart_prev`, the
     yard return in `arrive` and the drive back. A trip that is not a round
     trip ends somewhere else, the last `stop` before the return, which may be
     the first. Every other stop is left as it is. */
  let yardPlace = null;     // `yard-location-v1`: { name, address, lat, lng }

  /* The office's `route-times-v1`: how long before the group leaves the bus is
     spotted at the pickup, and the pre-trip and post-trip time at the yard
     that on duty adds before the bus leaves and after it is back, in minutes,
     and how much slower than the map's car times a bus drives, in percent.
     Any of the last three may be 0. */
  const ROUTE_TIMES = { spot: 15, pre: 0, post: 0, slow: 0 };
  let routeTimes = { ...ROUTE_TIMES };
  const minutesOr = (v, d) => (Number.isFinite(Number(v)) && Number(v) >= 0 && v !== null && v !== '' ? Math.round(Number(v)) : d);
  function setRouteTimes(v) {
    routeTimes = { spot: minutesOr(v?.spot_minutes, ROUTE_TIMES.spot),
                   pre: minutesOr(v?.pre_trip_minutes, ROUTE_TIMES.pre),
                   post: minutesOr(v?.post_trip_minutes, ROUTE_TIMES.post),
                   slow: minutesOr(v?.drive_slowdown_percent, ROUTE_TIMES.slow) };
  }
  // The open Route tab's redraw, for a change to the route times or the seats.
  let routeTimesDrawn = null;
  // The open Billing tab's redraw of each seat's miles, for a change to the seats.
  let seatMilesDrawn = null;
  // The Details tab's Buses count, redrawn whenever the vehicles change.
  let busCountDrawn = null;
  // The open Route tab's taking of a draft's stops; it returns those still to choose.
  let routeTakesStops = null;
  // The open Details tab's taking of a draft's trip contacts; it returns those held off screen and those with no slot.
  let detailsTakeContacts = null;
  // How many stops the open Route tab's leg has between its ends, which a draft's stops would replace.
  let routeStopsHeld = () => 0;
  // Its taking of a draft's changes to saved stops; it returns those it could not find.
  let routeTakesChanges = null;

  /* THE FUEL CARD LIMITS, the office's, kept in `settings` as `fuel-card-v1`:
     a trip longer than either suggests a fuel card on its Route tab. */
  const FUEL_LIMITS = { miles: 600, days: 2 };
  let fuelLimits = { ...FUEL_LIMITS };
  function setFuelLimits(v) {
    const n = (x, d) => (Number.isFinite(Number(x)) && Number(x) > 0 ? Number(x) : d);
    fuelLimits = { miles: n(v?.miles, FUEL_LIMITS.miles), days: n(v?.days, FUEL_LIMITS.days) };
  }

  /* The Route tab's arithmetic, shared with the Detailed itinerary so the
     screen and the paper give one answer: route-figures.js. */
  const RF = window.SchedulerRouteFigures;
  // Minutes after midnight, and back, wrapping round the clock.
  const { toMin, leaveDayOf } = RF;
  const fromMin = n => {
    const d = ((n % 1440) + 1440) % 1440;
    return `${String(Math.floor(d / 60)).padStart(2, '0')}:${String(d % 60).padStart(2, '0')}`;
  };
  // A drive as it is stored, "H:MM", and as a person types it: "1:48",
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

  // Geoapify, through places.js: the places matching what is typed, and the
  // drive between two.
  const searchPlaces = text => window.SchedulerPlaces.search(text);
  // A drive is the map's car time made slower by the office's slow-down, so a
  // drive measured from now on is a bus's; one already saved keeps its minutes.
  const driveBetween = (a, b) => window.SchedulerPlaces.drive(a, b).then(d =>
    (d && routeTimes.slow ? { ...d, min: Math.round(d.min * (1 + routeTimes.slow / 100)) } : d));
  // The two map points a drive is between, as one word, or null where either has none.
  const driveEnds = (a, b) => (a?.lat != null && b?.lat != null ? `${a.lat},${a.lng}>${b.lat},${b.lng}` : null);

  /* Two places are the same when both carry a Mapbox id and the ids match, or when
     their name and address both read the same. A drop-off the same as the
     pickup is what a round trip means, and writes no drop-off row. */
  const samePlace = (a, b) => {
    if (!a || !b) return !a && !b;
    if (a.mapbox_id && b.mapbox_id) return a.mapbox_id === b.mapbox_id;
    return same(a.name ?? null, b.name ?? null) && same(a.address ?? null, b.address ?? null);
  };
  /* A one-way leg, as each leg of a split is, ends somewhere other than
     where it began, even while neither place is filled in, so it is never
     read as a round trip. */
  const oneWayType = () => wayNow() === 'one_way';
  const routeRound = () => !oneWayType() && samePlace(editing?.route?.dropPlace, editing?.route?.pickupPlace);
  // The leg's dates as the Details tab has them now.
  const routeDates = leg => legDaysNow(leg) ?? { from: null, to: null };
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
    /* Both source columns are required, `estimated` by default, so a drive
       not measured yet still says `estimated` rather than sending null. */
    const driveCols = (row, min, miles, source) => (same(driveText(min), row?.drive ?? null) ? {} : {
      drive: driveText(min), miles: min == null ? null : miles,
      drive_source: source || 'estimated', miles_source: source || 'estimated',
    });
    const earlier = (a, b, day) => (a && b && toMin(a) > toMin(b) ? dayAfter(day, -1) : day);
    const spotDate = spot ? earlier(spot, leave, from) : null;
    const pickup = {
      // Only the place's columns: a pick from the saved list also carries `saved`.
      ...(r.pickupPlace !== r.pickupOpen ? placeOf(r.pickupPlace ?? {}) : {}),
      spot, spot_date: spotDate,
      depart_prev: yardOut, depart_prev_date: yardOut ? earlier(yardOut, spot, spotDate ?? from) : null,
      ...driveCols(r.pickup, drive, r.driveMiles, r.driveSource),
    };
    const first = { depart_prev: leave, depart_prev_date: leave ? from : null };
    const drop = round ? null : {
      ...(r.dropPlace !== r.dropOpen ? placeOf(r.dropPlace ?? {}) : {}),
      arrive: dropArrival(r.drop, end), arrive_date: end ? to : null,
      /* The drive into it, measured when either end moves. One only looked up
         as the trip opened waits for `foundDrives`, so opening is no edit. */
      ...(r.dropFound ? {} : driveCols(r.drop, r.dropDrive, r.dropMiles, 'estimated')),
    };
    const ret = {
      depart_prev: end, depart_prev_date: end ? to : null,
      arrive: yardBack, arrive_date: yardBack ? (end && toMin(yardBack) < toMin(end) ? dayAfter(to, 1) : to) : null,
      ...driveCols(r.back, driveBack, r.backMiles, r.backSource),
    };
    return { pickup, first, drop, ret };
  }

  /* The group's arrival where it is let off. The tab keeps one end time, the
     arrival and the bus leaving at once, where an older row may hold the two apart;
     until that time is changed, a drop-off's own stored arrival stands, so
     opening such a leg is no edit. */
  const dropArrival = (row, end) => (row?.arrive && same(hhmmOrNull(end), editing?.route?.endOpen ?? null)
    ? hhmmOrNull(row.arrive) : end);

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
     has, and the rows it lacks, each in its place: the pickup
     first on its leg, the first stop just after it, the return last. */
  function routePlan() {
    const r = editing?.route;
    const wanted = routeWanted();
    if (!r || !wanted) return { updates: [], inserts: [], work: false };
    const legEmpty = !r.all.some(x => x.leg === r.leg);
    if (r.listTouched && ((r.pickup && r.back) || (legEmpty && r.list.length))) return listRoutePlan(wanted);
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
    const destination = () => document.getElementById('scheduler-f-destination')?.value.trim() || null;
    if (!wanted.drop) {
      plan(r.first, wanted.first, want => ({ at: 'after-pickup', row: { type: 'stop', name: destination(), ...want } }));
      // A round trip's row back at the pickup is reached when the trip ends.
      if (r.dropRow && r.dropRow !== r.first) {
        plan(r.dropRow, { arrive: dropArrival(r.dropRow, wanted.ret.depart_prev), arrive_date: wanted.ret.depart_prev_date });
      }
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

  /* ── The full itinerary ──
     The Route tab's list of the stops between the pickup and where the group
     is let off, each a place, when the group gets there and leaves, and what
     the wait counts as. Once the list is touched, Save writes the leg's rows
     in the list's order: each stop takes the place a stop held, day and
     sleeper rows keep theirs, and a new stop goes after the last one. A
     stop's leave time is kept as the next row's
     `depart_prev`, so the first stop holds when the group departs the pickup
     and the drop-off holds when it leaves the last stop. A round trip with
     stops gets a drop-off row back at the pickup, so the drive home counts
     whether or not the last stop has a leave time. The leg's `position`s are renumbered from its first, and a leg
     that grows moves the other leg's rows down, since a trip's stops are
     ordered by `position` across both legs. */
  function listRoutePlan(wanted) {
    const r = editing.route;
    const { from, to } = routeDates(r.leg);
    const datesMoved = !same(from, r.from) || !same(to, r.to);
    const v = id => document.getElementById(id)?.value.trim() || null;
    const leave = v('scheduler-f-leave'), end = v('scheduler-f-endtrip');
    const round = routeRound();
    const list = r.list;
    const departs = [leave, ...list.map(st => st.leave)];
    const departDays = [leave ? from : null, ...list.map(st => (st.leave ? leaveDayOf(st, from) : null))];
    // A drive not measured yet is still `estimated`: both source columns are required.
    const drives = (min, miles) => ({ drive: driveText(min), miles: min == null ? null : miles,
      drive_source: 'estimated', miles_source: 'estimated' });
    const placeCols = p => ({ name: p?.name ?? null, address: p?.address ?? null,
      lat: p?.lat ?? null, lng: p?.lng ?? null, mapbox_id: p?.mapbox_id ?? null });

    const stopWant = (st, i) => ({
      ...(st.placeChanged || !st.id ? placeCols(st.place) : {}),
      // The stop's day is kept even with no times, so it stays under its day.
      arrive: st.arrive, arrive_date: st.date ?? from,
      depart_prev: departs[i], depart_prev_date: departDays[i],
      dwell_status: st.dwell || null,
      ...(st.driveChanged || st.found || !st.id ? drives(st.drive, st.miles) : {}),
    });
    // A leg with stops always ends at its drop-off, on a round trip back at the pickup.
    const needDrop = !round || list.length > 0;
    const dropWant = () => ({
      ...(!r.dropRow ? placeCols(round ? r.pickupPlace : r.dropPlace)
        : !round && r.dropPlace !== r.dropOpen ? placeCols(r.dropPlace) : {}),
      arrive: dropArrival(r.dropRow, end), arrive_date: end ? to : null,
      depart_prev: departs[list.length], depart_prev_date: departDays[list.length],
      ...(r.dropDrive != null && !same(driveText(r.dropDrive), r.dropRow?.drive ?? null)
        ? drives(r.dropDrive, r.dropMiles) : {}),
    });

    const legRows = r.all.filter(x => x.leg === r.leg).sort((a, b) => a.position - b.position);
    /* A leg with no rows yet, a trip not saved or a return leg not started,
       has every row new: the pickup, the stops, the drop-off and the yard, in
       that order. An outbound leg goes before the return leg's rows, which
       move down to make room; a return leg goes after the outbound's. */
    if (!legRows.length) {
      const others = r.all.filter(x => x.leg !== r.leg);
      const yard = { name: yardPlace?.name ?? 'Yard', address: yardPlace?.address ?? null,
                     lat: yardPlace?.lat ?? null, lng: yardPlace?.lng ?? null };
      const rows = [{ type: 'pickup', ...wanted.pickup },
        ...list.map((st, i) => ({ type: 'stop', ...stopWant(st, i) })),
        ...(needDrop ? [{ type: 'stop', ...dropWant() }] : []),
        { type: 'return', ...yard, ...wanted.ret }];
      const before = r.leg === editing.legs[0]?.key && others.length;
      const start = before ? Math.min(...others.map(x => x.position))
        : others.reduce((n, x) => Math.max(n, x.position), -1) + 1;
      return {
        updates: before ? others.map(x => ({ id: x.id, patch: { position: x.position + rows.length } })) : [],
        inserts: rows.map((row, i) => ({ position: start + i, row })),
        deletes: [], explicit: true, work: true,
      };
    }
    const middleIds = new Set(r.middleOpen.map(st => String(st.id)));
    const keptIds = new Set(list.filter(st => st.id).map(st => String(st.id)));
    const deletes = [...middleIds].filter(id => !keptIds.has(id));
    const dropId = r.dropRow ? String(r.dropRow.id) : null;

    const queue = list.map((st, i) => ({ stop: st, i }));
    const seq = [];
    let flushed = false;
    const flush = () => {
      flushed = true;
      while (queue.length) seq.push(queue.shift());
      if (needDrop && !r.dropRow) seq.push({ drop: true });
    };
    for (const row of legRows) {
      const id = String(row.id);
      if (middleIds.has(id)) {
        if (queue.length) seq.push(queue.shift());
        continue;
      }
      if (!flushed && (id === dropId || row.type === 'return')) flush();
      seq.push({ row });
    }
    if (!flushed) flush();

    const start = legRows[0].position;
    const delta = seq.length - legRows.length;
    const updates = [];
    const inserts = [];
    if (delta) {
      const last = legRows.at(-1).position;
      for (const x of r.all.filter(x => x.leg !== r.leg && x.position > last)) {
        updates.push({ id: x.id, patch: { position: x.position + delta } });
      }
    }
    seq.forEach((item, i) => {
      const position = start + i;
      if (item.drop) { inserts.push({ position, row: { type: 'stop', ...dropWant() } }); return; }
      if (item.stop && !item.stop.id) {
        inserts.push({ position, row: { type: 'stop', ...stopWant(item.stop, item.i) } }); return;
      }
      const id = String(item.stop ? item.stop.id : item.row.id);
      const open = item.stop ? item.stop.open
        : id === dropId ? r.dropRow
        : id === String(r.pickup.id) ? r.pickup
        : id === String(r.back.id) ? r.back : null;
      const want = item.stop ? stopWant(item.stop, item.i)
        : id === dropId ? dropWant()
        : id === String(r.pickup.id) ? wanted.pickup
        : id === String(r.back.id) ? wanted.ret : {};
      const patch = open ? rowPatch(open, want, datesMoved) : {};
      /* A stop moved to another day moves its day, whether or not a time moved,
         and a departure's day is put right, such as a morning's after a night
         at a hotel. */
      if (item.stop && open && !same(open.arrive_date ?? null, want.arrive_date)) patch.arrive_date = want.arrive_date;
      if ((item.stop || id === dropId) && open && !same(open.depart_prev_date ?? null, want.depart_prev_date ?? null)) {
        patch.depart_prev_date = want.depart_prev_date ?? null;
      }
      const was = legRows.find(x => String(x.id) === id)?.position;
      if (was !== position) patch.position = position;
      if (Object.keys(patch).length) updates.push({ id, patch });
    });
    return { updates, inserts, deletes, explicit: true,
             work: !!(updates.length || inserts.length || deletes.length) };
  }

  /* The drives looked up when the trip opened, for a Save that leaves the
     list untouched: each on its stop's row, and the drive to the drop-off on
     the drop-off row when the leg has one. `changed` never sees them, so they
     wait for a Save made for something else. */
  function foundDrives() {
    const r = editing?.route;
    if (!r || r.listTouched) return [];
    const cols = (min, miles) => ({ drive: driveText(min), miles, drive_source: 'estimated', miles_source: 'estimated' });
    const out = (r.list || []).filter(st => st.found && st.id && st.drive != null)
      .map(st => ({ id: st.id, patch: cols(st.drive, st.miles) }));
    if (r.dropFound && r.dropRow?.id && r.dropDrive != null) out.push({ id: r.dropRow.id, patch: cols(r.dropDrive, r.dropMiles) });
    return out;
  }

  /* Writes the plan. A new row takes its place by moving the rows at and
     after it one down, since a trip's stops are ordered by `position`
     across both legs. A list plan names every row's place itself. */
  async function saveRoute(tripId, write) {
    const r = editing?.route;
    const planned = routePlan();
    if (planned.explicit) {
      for (const id of planned.deletes) {
        await write('its route', client.from('trip_stops').delete().eq('id', id));
      }
      for (const u of planned.updates) {
        await write('its route', client.from('trip_stops').update(u.patch).eq('id', u.id));
      }
      for (const ins of planned.inserts) {
        await write('its route', client.from('trip_stops')
          .insert({ trip_id: tripId, ...onRoute(r.leg), position: ins.position, ...ins.row }));
      }
      return;
    }
    const { updates, inserts } = planned;
    for (const u of [...updates, ...foundDrives()]) {
      await write('its route', client.from('trip_stops').update(u.patch).eq('id', u.id));
    }
    const rows = (r?.all ?? []).map(x => ({ ...x }));
    const legRows = () => rows.filter(x => x.leg === r.leg).sort((a, b) => a.position - b.position);
    const top = () => rows.reduce((n, x) => Math.max(n, x.position), -1);
    for (const ins of inserts) {
      const mine = legRows();
      const pick = mine.find(x => x.type === 'pickup');
      const home = mine.find(x => x.type === 'return');
      const last = (mine.at(-1)?.position ?? top()) + 1;
      const pos = ins.at === 'start' ? (mine[0]?.position ?? top() + 1)
        : ins.at === 'after-pickup' ? (pick ? pick.position + 1 : (mine[0]?.position ?? top() + 1))
        // A drop-off row takes the return's place and pushes it down.
        : ins.at === 'before-return' ? (home ? home.position : last)
        : last;
      for (const x of rows.filter(x => x.position >= pos).sort((a, b) => b.position - a.position)) {
        x.position += 1;
        await write('its route', client.from('trip_stops').update({ position: x.position }).eq('id', x.id));
      }
      const saved = await write('its route', client.from('trip_stops')
        .insert({ trip_id: tripId, ...onRoute(r.leg), position: pos, ...ins.row }).select('id').single());
      rows.push({ id: saved.id, leg: r.leg, type: ins.row.type, position: pos });
    }
  }

  /* A SPLIT TRIP'S PICKUP LEG MIRRORS ITS DROP-OFF LEG. Saving the drop-off
     leg with both its places, while the pickup leg has none, gives the pickup
     leg the same two reversed: picked up where the group was let off and
     taken back to where it started. The drives are measured and the times
     left blank, since the customer gives those. A pickup leg with rows of
     its own shape gets its places written into them; one with no rows gets
     its pickup, drop-off and yard rows after the drop-off leg's. */
  async function mirrorPickupLeg(tripId, write) {
    const r = editing?.route;
    if (!r || r.leg !== outKey() || !splitNow() || !legHeld(backKey())) return;
    const has = p => !!(p && (p.name || p.address));
    const from = r.dropPlace;
    const to = r.pickupPlace;
    if (!has(from) || !has(to)) return;
    const rows = r.otherStops || [];
    if (rows.some(x => x.type !== 'return' && has(placeOf(x)))) return;
    const measure = async (a, b) => {
      try { return a && b ? await driveBetween(a, b) : null; } catch { return null; }
    };
    const [yardOut, legDrive, yardBack] = await Promise.all([
      measure(yardPlace, from), measure(from, to), measure(to, yardPlace)]);
    const cols = d => ({ drive: d ? driveText(d.min) : null, miles: d ? d.miles : null,
      drive_source: 'estimated', miles_source: 'estimated' });
    const placeCols = p => ({ name: p.name ?? null, address: p.address ?? null,
      lat: p.lat ?? null, lng: p.lng ?? null, mapbox_id: p.mapbox_id ?? null });
    const want = {
      pickup: { ...placeCols(from), ...cols(yardOut) },
      drop: { ...placeCols(to), ...cols(legDrive) },
      yard: cols(yardBack),
    };
    const pickupRow = rows.find(x => x.type === 'pickup');
    const dropRow = rows.filter(x => x.type === 'stop').at(-1);
    const yardRow = rows.filter(x => x.type === 'return').at(-1);
    if (pickupRow && dropRow && yardRow) {
      await write('the pickup leg', client.from('trip_stops').update(want.pickup).eq('id', pickupRow.id));
      await write('the pickup leg', client.from('trip_stops').update(want.drop).eq('id', dropRow.id));
      await write('the pickup leg', client.from('trip_stops').update(want.yard).eq('id', yardRow.id));
      return;
    }
    if (rows.length) return;
    const last = await write('the pickup leg', client.from('trip_stops').select('position')
      .eq('trip_id', tripId).order('position', { ascending: false }).limit(1));
    const top = last?.[0]?.position ?? -1;
    const yard = { name: yardPlace?.name ?? 'Yard', address: yardPlace?.address ?? null,
                   lat: yardPlace?.lat ?? null, lng: yardPlace?.lng ?? null };
    const insert = [
      { type: 'pickup', ...want.pickup },
      { type: 'stop', ...want.drop },
      { type: 'return', ...yard, ...want.yard },
    ].map((row, i) => ({ trip_id: tripId, ...onRoute(backKey()), position: top + 1 + i, ...row }));
    await write('the pickup leg', client.from('trip_stops').insert(insert));
  }

  /* `===` for the columns that hold a value, and a key-by-key compare for
     `trip_reqs`, which holds an object: two equal objects are never `===`, so
     without this every open would read as an unsaved change. `histSame` is
     trip-history.js's compare, which sorts the keys. */
  const same = (a, b) => (a && typeof a === 'object') || (b && typeof b === 'object')
    ? histSame(a, b)
    : (a ?? null) === (b ?? null);

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
      || !!posPatch()?.work || !!invoicesPatch()?.work || !!linesPatch()?.work || fleetChanged()
      || (!!patch && Object.keys(patch).some(k => !(k === 'est_miles' && estFollows()))) || doneChanged();
  }

  // Unsaved work is a change in an editor that is open.
  function unsavedWork() { return !panelEl.hidden && changed(); }

  /* ── Done ──
     Route, Buses and Billing each end with Done, pressed once someone has
     gone back over that tab and it is complete. The database takes a Done off
     when what its tab holds changes, whichever app changes it: the route or
     the trip's dates take Route and Billing, the dates take Buses too,
     because a bus is chosen for its days, the buses or their seats take
     Buses and Billing, what the trip needs of a bus takes Buses, and a quote
     line or the price takes Billing. The editor follows the same rules live,
     so a check goes the moment its tab moves. */
  const DONE_TABS = [
    { tab: 'route', label: 'Route', button: 'scheduler-tab-route' },
    { tab: 'buses', label: 'Buses', button: 'scheduler-tab-fleet' },
    { tab: 'billing', label: 'Billing', button: 'scheduler-tab-billing' },
  ];
  const DONE_DATE_KEYS = ['start_date', 'end_date', 'other_legs'];
  const DONE_ROUTE_KEYS = [...DONE_DATE_KEYS, 'leg_kind', 'trip_type'];
  const DONE_PRICE_KEYS = ['quoted_price', 'quote_sent_price', 'quote_sent_on'];
  // What the trip asks of a bus, from its requirements.
  const vehicleNeedsOf = reqs => Object.keys(reqs || {}).filter(k => reqs[k] === true && isVehicleNeed(k)).sort();
  const doneBusRows = fleet => fleetLegs().map(leg => (fleet?.[leg] ?? []).map(b => [b.busId ?? null, activeRolesValue(b)]));
  const doneNeedRows = fleet => fleetLegs().map(leg => (fleet?.[leg] ?? []).map(b => [needIds(b.needs), b.vehicleType ?? null]));

  // Which tabs hold unsaved changes that a save would take their Done off for.
  function doneWork() {
    const patch = patchOf() || {};
    const has = keys => keys.some(k => k in patch);
    const route = routePlan().work || has(DONE_ROUTE_KEYS);
    const busList = JSON.stringify(doneBusRows(editing.fleet)) !== JSON.stringify(doneBusRows(editing.fleetBefore));
    const needs = JSON.stringify(doneNeedRows(editing.fleet)) !== JSON.stringify(doneNeedRows(editing.fleetBefore))
      || 'vehicle_type' in patch
      || ('trip_reqs' in patch && !histSame(vehicleNeedsOf(patch.trip_reqs), vehicleNeedsOf(editing.before.trip_reqs)));
    return { route, buses: busList || needs || has(DONE_DATE_KEYS), billing: route || busList || !!linesPatch()?.work || has(DONE_PRICE_KEYS) };
  }

  // What each tab holds now, as one string, for a Done pressed in this sitting.
  function doneKeys() {
    const form = readForm() || {};
    const plan = routePlan();
    const route = JSON.stringify([DONE_ROUTE_KEYS.map(k => form[k] ?? null), plan.updates, plan.inserts]);
    const busList = doneBusRows(editing.fleet);
    const buses = JSON.stringify([busList, doneNeedRows(editing.fleet), form.vehicle_type ?? null, vehicleNeedsOf(form.trip_reqs),
      DONE_DATE_KEYS.map(k => form[k] ?? null)]);
    const lines = linesLive ? linesToSave().map(({ id, ...l }) => l) : null;
    const billing = JSON.stringify([route, busList, lines, DONE_PRICE_KEYS.map(k => form[k] ?? null)]);
    return { route, buses, billing };
  }

  const doneOn = (d, tab, work, keys) => !!d && (d.key == null ? !work[tab] : keys[tab] === d.key);
  function doneState() {
    if (!editing?.done || !editing.fleet) return null;
    const work = doneWork();
    const keys = doneKeys();
    return Object.fromEntries(DONE_TABS.map(({ tab }) => [tab, doneOn(editing.done[tab], tab, work, keys)]));
  }

  // Whether Save has a Done to write: one pressed here, or one taken off.
  function doneChanged() {
    const on = doneState();
    return !!on && DONE_TABS.some(({ tab }) => (on[tab] && editing.done[tab].fresh) || (!on[tab] && !!editing.doneBefore[tab]));
  }

  /* The Done columns Save writes last, after the rows whose changes clear
     them: a Done pressed here with who pressed it, and null for one taken
     off. A saved Done that still holds is left alone. */
  function doneRowOf(actor) {
    const on = doneState();
    const row = {};
    if (!on) return row;
    const now = new Date().toISOString();
    for (const { tab } of DONE_TABS) {
      if (on[tab] && editing.done[tab].fresh) Object.assign(row, { [`${tab}_done_at`]: now, [`${tab}_done_by`]: actor ?? null });
      else if (!on[tab] && editing.doneBefore[tab]) Object.assign(row, { [`${tab}_done_at`]: null, [`${tab}_done_by`]: null });
    }
    return row;
  }

  // What a tab still lacks before it can be marked done, in words.
  function doneMissing(tab) {
    const out = [];
    const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
    if (tab === 'route') {
      const c = editing.route?.check;
      if (!c) return ['a route'];
      // A trip of more than one leg names the leg on screen, as it names the others.
      const many = fleetLegs().length > 1;
      const on = many ? ` on ${legPhrase(editing.route.leg)}` : '';
      if (!c.pickup) out.push(`a pickup place${on}`);
      if (!c.drop) out.push(`a drop-off place${on}`);
      if (c.unlocated) out.push(`a place for ${plural(c.unlocated, 'stop', 'stops')}${on}`);
      if (c.status === 'Needs times') out.push(`the times${on}`);
      if (c.status === 'Check times') out.push(`times in order${on}`);
      if (c.unmeasured && c.pickup && c.drop && !c.unlocated) out.push(`the drives measured${on}`);
      if (many) for (const key of fleetLegs().filter(k => k !== editing.route.leg)) out.push(...otherLegMissing(key));
      return out;
    }
    if (tab === 'buses') {
      for (const leg of fleetLegs()) {
        const list = editing.fleet?.[leg] ?? [];
        const where = fleetLegs().length > 1 ? ` on ${legPhrase(leg)}` : '';
        if (!list.length) { out.push(`a bus${where}`); continue; }
        const open = list.filter(b => b.busId == null).length;
        if (open) out.push(`${plural(open, 'bus', 'buses')} to assign${where}`);
        const lacking = list.filter(b => b.busId != null && busLacks(panelIndex.buses.get(b.busId), b).length).length;
        if (lacking) out.push(`${plural(lacking, 'bus that falls', 'buses that fall')} short of the trip's needs${where}`);
        const clashing = list.filter(b => b.busId != null && clashText(leg, 'buses', b.busId)).length;
        if (clashing) out.push(`${plural(clashing, 'bus', 'buses')} booked elsewhere${where}`);
      }
      return out;
    }
    if (editing.linesLoaded === false || !linesLive) return ['the quote lines'];
    const lines = linesToSave();
    // A split's lines name their leg by its old word; any other trip's are the trip's.
    for (const leg of splitNow() ? fleetLegs() : fleetLegs().slice(0, 1)) {
      const where = splitNow() ? ` for ${legPhrase(leg)}` : '';
      const word = splitNow() ? wordOfLeg(leg) : 'outbound';
      const onLeg = kind => lines.some(l => l.kind === kind && (splitNow() ? (l.leg ?? 'outbound') === word : true));
      if (!onLeg('rental')) out.push(`a Bus rental line${where}`);
      if (coDrivers(word) > 0 && !onLeg('second_driver')) out.push(`a Second driver line${where}`);
      if (reliefSeats(word) > 0 && !onLeg('relief')) out.push(`a Relief driver line${where}`);
    }
    if (editing.hotelWanted && !lines.some(l => l.kind === 'hotel')) out.push('a Hotel line');
    const quoted = money(document.getElementById('scheduler-f-quoted')?.value);
    if (!editing.quoteSent) out.push('Quote sent marked');
    else if (quoted != null && round2(quoted) !== round2(editing.quoteSent.price)) out.push('Quote sent at the price the lines add up to');
    return out;
  }

  /* A leg not on the Route tab, read from its saved rows by the same rules:
     every place found, the times in, and the drives measured. */
  function otherLegMissing(key) {
    const name = legPhrase(key);
    const rows = editing.creating ? [] : stopsOfLeg(editing.trip, key).stops;
    if (!rows.length) return [`${name}'s route`];
    const pickup = rows.find(x => x.type === 'pickup') ?? null;
    const back = rows.findLast(x => x.type === 'return') ?? null;
    const stops = rows.filter(x => x.type === 'stop');
    const out = [];
    if (pickup?.lat == null) out.push(`a pickup place on ${name}`);
    const unlocated = stops.filter(x => x.lat == null).length;
    if (!stops.length) out.push(`a drop-off place on ${name}`);
    else if (unlocated) out.push(`a place for ${unlocated} ${unlocated === 1 ? 'stop' : 'stops'} on ${name}`);
    if (!pickup?.spot || stops.some(x => !x.arrive) || !back?.depart_prev) out.push(`the times on ${name}`);
    // A stop with no place is driven past, so only the placed rows carry a drive.
    else if (rows.some(x => x.lat != null && x.drive == null)) out.push(`the drives measured on ${name}`);
    return out;
  }

  // A tab's Done area, made once per trip opened, at the foot of its panel.
  function doneSection(tab) {
    if (!editing) return null;
    const box = editing.doneBoxes[tab] ??= el('div', 'scheduler-done');
    return box.parentElement ?? section(null, box);
  }

  function markDone(tab, on) {
    if (!editing?.done) return;
    editing.done[tab] = on ? { at: null, by: null, key: doneKeys()[tab], fresh: true } : null;
    refreshDirty();
  }

  // Each tab's name carries a check while its Done holds, and its Done area says why not.
  function drawDone() {
    const on = doneState();
    if (!on) return;
    for (const { tab, label, button } of DONE_TABS) {
      const name = document.getElementById(button)?.querySelector('.rux--tabs__nav-item-label-wrapper');
      name?.querySelector('.scheduler-tab-done')?.remove();
      if (on[tab] && name) {
        const mark = el('span', 'scheduler-tab-done');
        mark.append(svgUse('#m-check_circle-fill', '16', '0 0 32 32'), el('span', 'rux--visually-hidden', ', done'));
        name.appendChild(mark);
      }
      const box = editing.doneBoxes[tab];
      if (!box) continue;
      const focused = box.contains(document.activeElement);
      const words = label.toLowerCase();
      // Done reads as one line: the check and its name, who and when, then Undo.
      box.classList.toggle('scheduler-done--on', !!on[tab]);
      if (on[tab]) {
        const d = editing.done[tab];
        const head = el('p', 'scheduler-done__head');
        head.append(svgUse('#m-check_circle-fill', '16', '0 0 32 32'), el('span', null, `${label} done`));
        const when = d.fresh ? 'Kept when the trip is saved.'
          : [d.by, d.at ? new Date(d.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : null].filter(Boolean).join(', ');
        const undo = el('button', 'rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm', 'Undo');
        undo.type = 'button';
        undo.addEventListener('click', () => markDone(tab, false));
        box.replaceChildren(head, el('p', 'rux--form__helper-text', when), undo);
      } else {
        const missing = doneMissing(tab);
        const mark = el('button', 'rux--btn rux--btn--tertiary rux--btn--sm rux--layout--size-sm', `Mark ${words} done`);
        mark.type = 'button';
        mark.disabled = missing.length > 0;
        mark.addEventListener('click', () => markDone(tab, true));
        const why = missing.length ? `Still needed: ${missing.join(', ')}.`
          : editing.doneBefore[tab] ? `Changed since it was marked done. Go over the ${words} again, then mark it done.`
          : `Go over the ${words}, then mark it done.`;
        box.replaceChildren(mark, el('p', 'rux--form__helper-text', why));
      }
      if (focused) box.querySelector('button:not([disabled])')?.focus();
    }
  }

  /* Where a link to a part of the open trip goes: an editor tab, the Forms
     panel beside the board, or the leg's itinerary from the customer in the
     document panel, which is where its Printed tick is made. */
  function goToTripPart(action, leg = null) {
    if (action === 'forms') { openForms(selectedBar()); return; }
    if (action === 'itinerary') { openLegItinerary({ trip: editing?.id, leg }, selectedBar()); return; }
    // The Contact list, where a driver is called and marked as told.
    if (action === 'contacts') { const bar = selectedBar(); if (bar) openContactsFrom(bar, bar); return; }
    const tab = document.getElementById(`scheduler-tab-${action}`);
    if (tab) window.Rux?.tabs?.select?.(tab.closest('[role="tablist"]'), tab);
  }
  /* What a change of dates now clashes with, named in the update window
     before it saves: each bus and driver on the trip that something stands
     in the way of on the new dates, as the Buses tab reads it. A clash never
     stops the save, since the other trip may be about to move; a read that
     fails says nothing. */
  async function datesClash(patch) {
    if (!DONE_DATE_KEYS.some(k => k in patch) || !editing?.fleet) return null;
    await loadFleetClashes();
    const said = [];
    for (const leg of fleetLegs()) {
      for (const b of editing.fleet[leg] ?? []) {
        const bus = b.busId != null ? clashText(leg, 'buses', b.busId) : '';
        if (bus) said.push(`Bus ${panelIndex.buses.get(b.busId)?.number ?? ''}: ${bus}`);
        for (const r of ROLES) {
          const seat = b.seats[r.role];
          const what = seatFilled(seat) ? clashText(leg, 'drivers', seat.driverId) : '';
          const who = what ? panelIndex.driversById.get(seat.driverId) : null;
          if (what) said.push(`${who?.short_name || who?.name || 'A driver'}: ${what}`);
        }
      }
    }
    const all = [...new Set(said)];
    return all.length ? `The new dates clash: ${all.join(' · ')}.` : null;
  }

  // The Done marks a save takes off, named in the update window before it saves.
  function doneTakenOff() {
    const on = doneState();
    if (!on) return null;
    const off = DONE_TABS.filter(({ tab }) => editing.doneBefore[tab] && !on[tab]).map(({ label }) => label);
    if (!off.length) return null;
    return `This takes the check off ${off.length > 1 ? `${off.slice(0, -1).join(', ')} and ${off.at(-1)}` : off[0]}.`;
  }

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
    syncEstHint();
    // A date, a type, the miles or a drive can move a line's price.
    if (!followLines() && linesLive) redrawDeadOffer();
    const startEl = document.getElementById('scheduler-f-start');
    const destEl = document.getElementById('scheduler-f-destination');
    const startOk = !!isoOrNull(startEl?.value);
    // Save needs a start date, without which `legsOf` draws no leg, and a
    // destination, which is the bar's only label.
    const destOk = !!destEl?.value.trim();
    destEl?.setAttribute('aria-invalid', String(!destOk));
    // `aria-invalid` alone marks a missing start; the disabled Save says the rest.
    startEl?.setAttribute('aria-invalid', String(!startOk));
    // The end box says when it is before its start, and a mark is cleared too.
    dateSays(document.getElementById('scheduler-f-end'), datesWrong() ? ENDS_FIRST : '');
    const datesOk = !datesWrong();
    /* A new trip is saveable untouched, because its defaults are already a real
       trip. `changed` compares against `editing.before`, which a new trip fills
       from its draft, so an untouched panel is unchanged either way. */
    const nothingChanged = !changed();
    const nothingToDo = !editing?.creating && nothingChanged;
    // A driver in two seats of one leg is the Buses tab's one blocking error.
    const fleetOk = !fleetDuplicates().size;
    panelSave.disabled = !startOk || !destOk || !datesOk || !fleetOk || nothingToDo;
    setTitle();
    /* Reset follows `nothingChanged`, not `nothingToDo`, which is always false
       while creating. It ignores the required fields: an invalid form is when
       someone most wants to back out. */
    if (panelReset) panelReset.disabled = nothingChanged;
    redrawQuoteSent();
    tellCalculator();
    drawDone();
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
    // Nothing on the board is the new trip, so no other trip stays picked
    // with its card floating beside the editor.
    clearSelection();
    openPanel(null, {
      id: null,
      // Null, not '': every getter reads a blank field as null and `same` does
      // not treat '' as null, so '' would count an untouched field as changed.
      destination: null, customer: null,
      trip_type: 'round_trip', vehicle_type: null, confirmed: false,
      start_date: start, end_date: start,
      req_sleeper: false, req_ada: false, req_56pax: false, need_hotel: false,
      need_fuel_card: false, trip_reqs: {},
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

  /* THE LIST OF LEGS over the editor's tabs, shown on a saved trip of more
     than one: each leg by its name and first day. Choosing another asks
     about unsaved changes, as opening its bar does, and then opens the
     editor on it; until then the list stays on the leg shown. */
  const legSwitchHost = document.getElementById('scheduler-panel-legs');
  const legDay = iso => (iso ? parseISO(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : '');
  // A leg in the list: a split's Drop-off or Pickup with its day, and any other leg its day.
  const legOption = l => (splitNow() ? `${legTitle(l.key)} · ${legDay(l.start)}` : legDay(l.start) || 'No date');
  function drawLegSwitch() {
    if (!legSwitchHost || !editing) return;
    legSwitchHost.hidden = !legOnScreen();
    if (legSwitchHost.hidden) { legSwitchHost.replaceChildren(); return; }
    const item = selectField('scheduler-f-leg', 'Leg', screenKey(), editing.legs.map(l => [l.key, legOption(l)]));
    item.querySelector('label')?.classList.add('rux--visually-hidden');
    legSwitchHost.replaceChildren(item);
  }
  // The editor on another leg, by its key, from its bar where the week shows one.
  function openLeg(key) {
    const trip = panelIndex.trips.get(String(editing?.id)) ?? panelArgs?.trip;
    const leg = trip ? legByKey(trip, key) : null;
    if (!leg) return;
    const bar = [...gridEl.querySelectorAll(`.scheduler-bar[data-trip-id="${CSS.escape(String(trip.id))}"]`)]
      .find(b => barOnLeg(b, leg.key));
    if (bar) { selectBar(bar); openPanel(bar); }
    else {
      const first = (trip.trip_assignments || []).filter(a => legKeyOfVehicle(trip, a) === leg.key)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0];
      openPanel(null, null, { ref: { tripId: String(trip.id), leg: leg.leg, legKey: leg.key,
        busId: first?.bus_id != null ? String(first.bus_id) : null,
        assignmentId: first?.id != null ? String(first.id) : null }, trip });
    }
    document.getElementById('scheduler-f-leg')?.focus();
  }
  /* ADD LEG AND REMOVE LEG act at once on a saved trip with nothing unsaved,
     after the update box names the day, as a save's does; closing it does
     nothing. Add leg copies the leg on screen to the day after the last leg
     ends, its vehicles with no drivers, and its route reversed when it is one
     way: picked up where the group was let off and taken back to where it
     started, the drives measured and the times left for the office. A
     split's first pickup takes the old word `return`; any other new leg has
     none. The database makes the leg's route, moves the trip's days and
     takes off the Done marks the new day affects. */
  const STOP_COPY = ['type', 'label', 'name', 'address', 'lat', 'lng', 'mapbox_id', 'miles', 'drive', 'miles_source', 'drive_source',
    'depart_prev', 'arrive', 'spot', 'route_status', 'dwell_status', 'dwell_reset'];
  const STOP_DAYS = ['depart_prev_date', 'arrive_date', 'spot_date'];
  const unwrap = r => { if (r.error) throw new Error(r.error.message); return r.data ?? []; };
  async function savedRowsOfLeg(leg) {
    const routes = (SHAPE.legOf(editing.trip, leg.key)?.routes ?? []).map(r => r.id);
    if (!routes.length) return { stops: [], buses: [] };
    const [stops, buses] = await Promise.all([
      withTimeout(client.from('trip_stops').select('*').in('route_id', routes).order('position').then(unwrap)),
      withTimeout(client.from('trip_assignments').select('*, trip_drivers(id, driver_id)').in('route_id', routes).order('position').then(unwrap)),
    ]);
    return { stops: stops ?? [], buses: buses ?? [] };
  }
  async function addLeg() {
    if (!editing || editing.creating || !shaped(editing.trip)) return;
    const trip = editing.trip;
    const from = legHeld(screenKey());
    if (!from?.start) return;
    const last = editing.legs.reduce((d, l) => ((l.end ?? l.start) > d ? l.end ?? l.start : d), from.end ?? from.start);
    const start = dayAfter(last, 1);
    const end = dayAfter(start, daysBetween(parseISO(from.start), parseISO(from.end ?? from.start)));
    const said = `Added a leg on ${legDay(start)}`;
    const answer = await askForUpdate({ said: [said], line: said, keys: ['dates'] }, false, trip);
    if (!answer) return;
    toast('working', 'Adding the leg…');
    let before;
    try { before = await readTripState(trip.id); } catch { before = undefined; }
    try {
      const { stops, buses } = await savedRowsOfLeg(from);
      const word = editing.legs.length === 1 && from.word === 'outbound' && from.kind === 'one_way' ? 'return' : null;
      const made = await withTimeout(client.from('trip_legs').insert({ trip_id: trip.id, leg: word, kind: from.kind,
        start_date: start, end_date: end, bus_count: buses.length || from.busCount || 1 }).select('id').single().then(unwrap));
      const route = (await withTimeout(client.from('trip_routes').select('id').eq('leg_id', made.id).order('position').limit(1).then(unwrap)))?.[0];
      if (!route) throw new Error('The new leg has no route.');
      const top = (await withTimeout(client.from('trip_stops').select('position').eq('trip_id', trip.id)
        .order('position', { ascending: false }).limit(1).then(unwrap)))?.[0]?.position ?? -1;
      const shift = daysBetween(parseISO(from.start), parseISO(start));
      let rows;
      if (from.kind === 'one_way' && stops.length) {
        const pick = placeOf(stops.find(x => x.type === 'pickup'));
        const drop = placeOf(stops.filter(x => x.type === 'stop').at(-1));
        const measure = async (a, b) => { try { return a && b ? await driveBetween(a, b) : null; } catch { return null; } };
        const yard = { name: yardPlace?.name ?? 'Yard', address: yardPlace?.address ?? null, lat: yardPlace?.lat ?? null, lng: yardPlace?.lng ?? null };
        const [out, across, home] = await Promise.all([measure(yardPlace, drop), measure(drop, pick), measure(pick, yardPlace)]);
        const cols = d => ({ drive: d ? driveText(d.min) : null, miles: d ? d.miles : null, drive_source: 'estimated', miles_source: 'estimated' });
        const at = p => ({ name: p?.name ?? null, address: p?.address ?? null, lat: p?.lat ?? null, lng: p?.lng ?? null, mapbox_id: p?.mapbox_id ?? null });
        rows = [{ type: 'pickup', ...at(drop), ...cols(out) }, { type: 'stop', ...at(pick), ...cols(across) }, { type: 'return', ...yard, ...cols(home) }];
      } else {
        rows = stops.map(x => ({ ...Object.fromEntries(STOP_COPY.map(k => [k, x[k] ?? null])),
          ...Object.fromEntries(STOP_DAYS.map(k => [k, x[k] ? dayAfter(x[k], shift) : null])) }));
      }
      if (rows.length) {
        await withTimeout(client.from('trip_stops').insert(rows.map((r, i) => ({ trip_id: trip.id, route_id: route.id, position: top + 1 + i, ...r }))).then(unwrap));
      }
      if (buses.length) {
        await withTimeout(client.from('trip_assignments').insert(buses.map(a => ({ trip_id: trip.id, route_id: route.id, position: a.position,
          bus_id: a.bus_id, needs: a.needs, vehicle_type: a.vehicle_type,
          active_roles: (a.active_roles || []).map(r => String(r).split(':')[0]) }))).then(unwrap));
      }
      if (answer.kind !== 'none') await writeUpdate(trip.id, answer);
      if (before !== undefined) await recordSave(trip.id, before);
      toast('success', `${said}.`);
      await show();
      openLeg(made.id);
    } catch (err) {
      toast('error', `The leg was not added. ${err.message ?? err}`);
      await show();
    }
  }
  /* Remove leg takes the leg on screen off, with its route and empty
     vehicles. It waits while the leg holds what would be lost or handed to
     another leg: a seated driver, who is taken off on the Buses tab so they
     are told; or its own file, contact or quote line. A split's drop-off
     stays while its pickup goes by the old word. */
  async function removeLeg() {
    if (!editing || editing.creating || editing.legs.length < 2) return;
    const trip = editing.trip;
    const leg = legHeld(screenKey());
    if (!leg) return;
    const wait = text => { toast('info', 'This leg cannot be removed yet', text); };
    if (leg === editing.legs[0] && editing.legs.some(l => l.word === 'return')) {
      wait('Remove the pickup instead, and move the drop-off to the day it runs.');
      return;
    }
    const { stops, buses } = await savedRowsOfLeg(leg);
    if (buses.some(a => (a.trip_drivers || []).some(d => d.driver_id))) { wait('Take its drivers off on the Buses tab and save, so they are told.'); return; }
    // Its own rows, read now, since the board holds a trip's quote lines only once its Billing tab has loaded.
    const [docs, lines, contacts] = await Promise.all(['trip_documents', 'trip_quote_lines', 'trip_contacts']
      .map(table => withTimeout(client.from(table).select(table === 'trip_contacts' ? 'leg_id' : 'leg,leg_id').eq('trip_id', trip.id).then(unwrap))));
    const own = rows => rows.some(r => r.leg_id === leg.id || (leg.word && r.leg === leg.word && !r.leg_id));
    if (own(docs)) { wait('Move or delete its own files on the Files tab first.'); return; }
    if (own(lines)) { wait('Take its own quote lines off on the Billing tab and save first.'); return; }
    if (own(contacts)) { wait('Take its own contacts off on the Details tab and save first.'); return; }
    const said = `Removed the leg on ${legDay(leg.start)}`;
    const answer = await askForUpdate({ said: [said], line: said, keys: ['dates'] }, false, trip);
    if (!answer) return;
    toast('working', 'Removing the leg…');
    let before;
    try { before = await readTripState(trip.id); } catch { before = undefined; }
    try {
      if (buses.length) await withTimeout(client.from('trip_assignments').delete().in('id', buses.map(a => a.id)).then(unwrap));
      if (stops.length) await withTimeout(client.from('trip_stops').delete().in('id', stops.map(x => x.id)).then(unwrap));
      await withTimeout(client.from('trip_legs').delete().eq('id', leg.id).then(unwrap));
      if (answer.kind !== 'none') await writeUpdate(trip.id, answer);
      if (before !== undefined) await recordSave(trip.id, before);
      const next = editing.legs.find(l => l !== leg)?.key;
      toast('success', `${said}.`);
      await show();
      openLeg(next);
    } catch (err) {
      toast('error', `The leg was not removed. ${err.message ?? err}`);
      await show();
    }
  }
  legSwitchHost?.addEventListener('change', e => {
    if (e.target.id !== 'scheduler-f-leg' || !editing) return;
    const key = e.target.value;
    e.target.value = screenKey();
    if (!key || key === screenKey()) return;
    whenSafe(() => openLeg(key));
  });

  // `bar` opens a trip from the board; `again` replays an earlier `panelArgs`.
  function openPanel(bar, draft, again) {
    // The editor says what the card would, so a card asked for is forgotten.
    cardOpenFor = null;
    const creating = !!draft;
    const ref = creating ? null : (again?.ref ?? (bar ? barRef(bar) : null));
    const trip = draft ?? again?.trip ?? (ref ? panelIndex.trips.get(ref.tripId) : null);
    if (!trip) return;
    panelArgs = { ref, draft, trip: creating ? null : trip };
    // The leg the bar or link names, by its key, or the trip's first.
    const named = ref ? legByKey(trip, ref.legKey ?? ref.leg ?? 'outbound') : null;
    const leg = named ?? legsOf(trip)[0];

    // A plain heading until `refreshDirty` calls `setTitle`, which names the trip.
    const heading = creating ? 'New trip' : 'Edit trip';
    panelTitle.textContent = heading;
    panelTitleCollapsed.textContent = heading;
    // The trip's number beside the title; a trip not yet saved has none.
    const tripRef = creating ? '' : String(trip.trip_ref ?? '');
    panelRef.textContent = tripRef ? `#${tripRef}` : '';
    panelRef.title = tripRef ? `Trip ${tripRef}` : '';
    panelRef.hidden = !tripRef;

    const legDays = leg ? daysBetween(parseISO(leg.from), parseISO(leg.to)) + 1 : 0;
    const when = !leg ? '' : leg.from === leg.to
      ? parseISO(leg.from).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
      : `${parseISO(leg.from).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} to ${parseISO(leg.to).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} (${legDays} days)`;

    // The lines are the last trip's until the Billing tab loads this one's.
    linesLive = false;
    // Each leg's hotel, by the old word it still goes by.
    const outLeg = legFactsOf(trip, 'outbound');
    const backLeg = legFactsOf(trip, 'return');
    /* The trip's legs, each held by its key, in date order; see `legKeyOf`.
       A new trip has one, with the draft's days and the Way its type gives. */
    const heldLegs = creating || !shaped(trip)
      ? [{ key: 'new:outbound', id: null, word: 'outbound', start: outLeg.from, end: outLeg.to ?? outLeg.from,
           kind: trip.trip_type === 'round_trip' || !trip.trip_type ? 'round_trip' : 'one_way', busCount: outLeg.buses ?? 1 }]
      : SHAPE.legsOf(trip).map(l => ({ key: l.id, id: l.id, word: l.word, start: l.start, end: l.end, kind: l.kind, busCount: l.busCount }));
    const screen = heldLegs.find(l => l.key === named?.key) ?? heldLegs[0];
    const heldType = heldLegs.length > 1 && heldLegs[0].kind === 'one_way' ? SPLIT : heldLegs[0].kind;
    editing = { id: trip.id, creating, updatedAt: trip.updated_at ?? null, legKey: screen.key,
      legs: heldLegs,
      /* What the trip already answered, whether or not the editor draws a tag
         for it: a save merges its own tags over this, so a requirement the
         office has since deactivated keeps its answer. */
      reqs: (trip.trip_reqs && typeof trip.trip_reqs === 'object') ? { ...trip.trip_reqs } : {},
      /* The trip's two needs that are not a vehicle's: each leg's hotel, its
         confirmation and whether it is booked, edited in the Hotel line's
         window; the reminder a trip carried before it had lines; and the fuel
         card, turned on from the Route tab. */
      hotel: Object.fromEntries(['outbound', 'return'].map(l => [l,
        { ref: legFactsOf(trip, l).hotelNumber, booked: legFactsOf(trip, l).hotelBooked }])),
      hotelWanted: !!trip.need_hotel,
      fuelCard: !!trip.need_fuel_card,
      // Itinerary not needed, set from the Checklist's itinerary row or the Files tab.
      itineraryNotNeeded: !!trip.itinerary_not_needed,
      // The price the customer was sent and the day, or null before it is.
      quoteSent: trip.quote_sent_price == null ? null
        : { price: Number(trip.quote_sent_price), on: trip.quote_sent_on ?? null },
      /* Each tab's Done as saved, and as it stands now. A saved one holds while
         its tab has nothing unsaved; one pressed here holds while its tab is
         as it was when pressed. */
      doneBefore: Object.fromEntries(DONE_TABS.map(({ tab }) => [tab, trip[`${tab}_done_at`] ?? null])),
      done: Object.fromEntries(DONE_TABS.map(({ tab }) => [tab, trip[`${tab}_done_at`]
        ? { at: trip[`${tab}_done_at`], by: trip[`${tab}_done_by`] ?? null, key: null, fresh: false } : null])),
      doneBoxes: {},
      // The trip as saved, which the checklist reads.
      trip,
      before: {
      destination: trip.destination ?? null,
      customer: trip.customer ?? null,
      customer_id: trip.customer_id ?? null,
      trip_type: heldType,
      vehicle_type: trip.vehicle_type ?? null,
      // The name it paints as, so a trip still storing `cyan` opens on Teal
      // with nothing changed, and saves nothing until another colour is picked.
      trip_bar_color: tripColorOf(trip),
      req_sleeper: !!trip.req_sleeper,
      req_ada: !!trip.req_ada,
      req_56pax: !!trip.req_56pax,
      need_hotel: !!trip.need_hotel,
      need_fuel_card: !!trip.need_fuel_card,
      /* Every need the trip carries, answered true or false, so a tag turned
         off counts as a change rather than as a key that quietly vanished. It
         is merged over the stored object exactly as a save is, or an untouched
         trip would read as changed on every open. */
      trip_reqs: {
        ...(trip.trip_reqs && typeof trip.trip_reqs === 'object' ? trip.trip_reqs : {}),
        ...Object.fromEntries(editableNeeds()
          .map(r => [r.id, requirementsOf(trip).includes(r.id)])),
      },
      // Each leg's hotel, as the leg the old word names holds it, and the leg on screen's days and Way.
      hotel_booked_outbound: outLeg.hotelBooked,
      hotel_booked_return: backLeg.hotelBooked,
      hotel_itinerary_number_outbound: outLeg.hotelNumber,
      hotel_itinerary_number_return: backLeg.hotelNumber,
      start_date: screen.start,
      end_date: screen.end ?? screen.start,
      leg_kind: screen.kind,
      other_legs: JSON.stringify(heldLegs.filter(l => l !== screen).map(l => [l.key, l.start ?? null, l.end ?? null, l.kind])),
      quoted_price: trip.quoted_price ?? null,
      quote_sent_price: trip.quote_sent_price == null ? null : Number(trip.quote_sent_price),
      quote_sent_on: trip.quote_sent_on ?? null,
      deposit_amount: trip.deposit_amount ?? null,
      po_ref: trip.po_ref ?? null,
      po_amount: trip.po_amount ?? null,
      invoice_number: trip.invoice_number ?? null,
      // The milestones as the switches open, so an untouched trip saves none.
      contract_status: contractSignedOf(trip) ? 'Signed' : 'Pending',
      invoice_status: invoicedOf(trip) ? 'Invoiced' : 'Pending',
      contract_signed_on: contractSignedOf(trip) ? (trip.contract_signed_on ?? null) : null,
      contract_note: contractSignedOf(trip) ? (trip.contract_note ?? null) : null,
      // Booleans take `!!`, not `?? null`, because `same(false, null)` is a change.
      po_received: poReceivedOf(trip),
      invoiced: invoicedOf(trip),
      est_miles: trip.est_miles ?? null,
      actual_miles: trip.actual_miles ?? null,
      passengers: trip.passengers ?? null,
      itinerary_not_needed: !!trip.itinerary_not_needed,
      booking_contact_id: trip.booking_contact_id ?? null,
      // Each day-of slot's linked contact, as the list's row for the slot links it.
      ...Object.fromEntries([1, 2, 3, 4, 5].map(n => [`trip_contact_${n}_id`, slotOf(trip, n)?.id ?? null])),
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
    // The quote's lines, diffed by `linesPatch` as the POs are by `listPatch`.
    editing.linesLoaded = creating || Array.isArray(trip.trip_quote_lines);
    editing.lines = creating ? [] : byPosition(trip.trip_quote_lines);
    // The saved stops, which price the quote's lines for the leg the Route
    // tab is not showing.
    editing.stops = creating ? [] : (trip.trip_stops || []);

    /* The route's rows are kept apart from `editing.before`: they are
       `trip_stops` rows, not `trips` columns, so they diff and write
       separately. `pickup`, `drop` and `back` are the rows as they opened;
       the places and drives are what the tab has picked since, which
       `routeWanted` reads. A new trip has no rows, and Save makes them. */
    editing.route = (() => {
      const leg = screen.key;
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
      const dates = { from: screen.start, to: screen.end ?? screen.start };
      // The drop-off's and the pickup's other leg, whose rows a split trip's pickup leg is filled from.
      const other = heldLegs.find(l => l.word && l.word === (screen.word === 'return' ? 'outbound' : 'return'));
      return {
        leg, pickup, first, drop, back, inner, ...dates,
        between: inner.length,
        otherStops: creating || !other ? [] : stopsOfLeg(trip, other.key).stops,
        all: (trip.trip_stops || []).map(x => ({ id: x.id, leg: keyOfRow(trip, x), type: x.type, position: x.position ?? 0 })),
        driveOut: driveMin(pickup?.drive),
        driveMiles: numOrNull(pickup?.miles), driveSource: pickup?.drive_source ?? 'estimated',
        backDrive: driveMin(back?.drive), backMiles: numOrNull(back?.miles), backSource: back?.drive_source ?? 'estimated',
        // The end time the leg opened on, as its field shows it.
        endOpen: hhmmOrNull(back?.depart_prev),
      };
    })();
    /* The five day-of slots: the leg each is for and, once the Details tab
       draws them, whether it holds a row here; `removed` is a slot taken off
       in this edit, which saves empty. */
    editing.days = [1, 2, 3, 4, 5].map(n => ({ n, leg: creating ? null : slotOf(trip, n)?.leg ?? null,
      open: false, fresh: false, removed: false }));

    // The places as they opened, so `routeWanted` can tell a new pick.
    editing.route.pickupOpen = editing.route.pickupPlace = placeOf(editing.route.pickup);
    editing.route.dropOpen = editing.route.dropPlace = placeOf(editing.route.drop);

    panelDetails.replaceChildren();
    /* The dates lead the tab, because a trip is found by when it runs: the
       leg on screen's, under one Dates label, the end's own label left blank
       to keep the two boxes level, and each box named for a screen reader. */

    /* The trip's own fields are one stack, 16px apart: the dates,
       Destination beside Type, the leg on screen's Way, then Passengers. The tab's first
       section is the trip itself, titled with a menu on its line as the
       contacts' sections are, then its people. The trip bar's colour is
       picked from that menu, as from the bar's own Color item: it is seldom
       changed and the bar shows it, so its field stays in the page, hidden,
       for Save to read. */
    const colorItem = colorField('scheduler-f-color', trip);
    const colorBox = el('div');
    colorBox.hidden = true;
    colorBox.appendChild(colorItem);
    const tripMenu = menuTrigger('scheduler-f-tripmenu', 'Trip information actions');
    tripMenu.addEventListener('click', () => {
      const now = colorItem.current();
      const shown = colorItem.choices.find(c => c.value === now) ?? colorItem.choices[0];
      openItemsMenu(tripMenu, [{
        label: 'Trip bar color',
        icon: colorItem.chip(shown.hue),
        items: colorItem.choices.map(c => ({
          label: c.label,
          checked: c.value === now,
          icon: colorItem.chip(c.hue),
          run: () => { colorItem.setColor(c.value); refreshDirty(); tripMenu.focus(); },
        })),
      },
      // A saved trip's legs, added and removed at once; see `addLeg`.
      ...(creating ? [] : [
        { label: 'Add leg', run: () => whenSafe(addLeg) },
        ...(editing.legs.length > 1 ? [{ label: 'Remove leg', danger: true, run: () => whenSafe(removeLeg) }] : []),
      ])], 'Trip information actions');
    });
    /* A one-day trip leaves the end box empty, which Save reads as the start
       day, and the box says Same day. */
    const outRange = dateRange('scheduler-f-start', 'scheduler-f-end', 'Dates', '\u00a0', screen.start,
      screen.end && screen.end !== screen.start ? screen.end : '');
    outRange.querySelector('#scheduler-f-end').placeholder = 'Same day';
    outRange.querySelector('#scheduler-f-start').setAttribute('aria-label', 'Start date');
    outRange.querySelector('#scheduler-f-end').setAttribute('aria-label', 'End date');

    /* The customer is `trips.customer_id`, with its name in `trips.customer`
       as text. A trip not linked yet offers the customer whose name its
       typed one matches exactly, and Save keeps it. It stands last under
       Booking contact, because picking the contact suggests it. */
    const customerBox = withSaved(customerSearch('scheduler-f-customer', 'Customer', panelIndex.customers || [],
      (panelIndex.customers || []).find(c => c.id === trip.customer_id)
        || (!trip.customer_id && trip.customer
          ? (panelIndex.customers || []).find(c => folded(c.name) === folded(trip.customer)) : null),
      trip.customer), 'scheduler-f-customer', 'customer');

    const topFields = el('div', 'rux--stack-vertical rux--stack-scale-5');
    /* How many people travel: a count the customer gives, which the Buses tab
       holds against the seats of the buses chosen. */
    const passengers = moneyField('scheduler-f-passengers', 'Passengers', trip.passengers);
    passengers.querySelector('input').inputMode = 'numeric';
    passengers.querySelector('input').addEventListener('input', () => drawFleet());
    /* HOW MANY BUSES, the Buses tab's vehicles counted, on Carbon's number
       input. Its plus adds an empty vehicle; its minus takes one off the end
       only while that one is empty, so no bus or driver goes this way, and a
       typed number does both up to where an occupied vehicle stops it. It is
       the leg on screen's count, and the drop-off leg's on a split not saved
       as one yet. */
    const busCount = el('div', 'rux--form-item');
    const busNumber = el('div', 'rux--number rux--number--md');
    const busLabel = el('label', 'rux--label', 'Buses');
    busLabel.htmlFor = 'scheduler-f-buscount';
    const busWrap = el('div', 'rux--number__input-wrapper');
    const busInput = el('input');
    busInput.type = 'number';
    busInput.id = 'scheduler-f-buscount';
    busInput.min = '1';
    busInput.max = String(MAX_BUSES);
    const busControls = el('div', 'rux--number__controls');
    const busStep = (dir, label, icon) => {
      const b = el('button', `rux--number__control-btn ${dir}-icon`);
      b.type = 'button';
      b.setAttribute('aria-label', label);
      b.appendChild(svgUse(icon, '16', '0 0 32 32'));
      return b;
    };
    const busDown = busStep('down', 'One bus fewer', '#m-remove');
    const busUp = busStep('up', 'One bus more', '#m-add');
    busControls.append(busDown, el('div', 'rux--number__rule-divider'), busUp, el('div', 'rux--number__rule-divider'));
    busWrap.append(busInput, busControls);
    busNumber.append(busLabel, busWrap);
    busCount.appendChild(busNumber);
    const busLeg = () => screenKey();
    busCountDrawn = () => {
      const list = editing?.fleet?.[busLeg()];
      if (!list) return;
      busInput.value = String(list.length);
      busUp.disabled = list.length >= MAX_BUSES;
      busDown.disabled = list.length <= 1 || !busEmpty(list.at(-1));
    };
    busInput.addEventListener('change', () => {
      const list = editing?.fleet?.[busLeg()];
      if (!list) return;
      const want = Math.min(MAX_BUSES, Math.max(1, Math.round(Number(busInput.value)) || list.length));
      const before = list.length;
      while (list.length < want) list.push(blankBus(list[0] ?? {}));
      while (list.length > want && list.length > 1 && busEmpty(list.at(-1))) list.pop();
      drawFleet();
      busCountDrawn();
      if (list.length !== before) refreshDirty();
    });
    busCountDrawn();
    topFields.append(
      outRange,
      // Each on its own row: in the 22rem panel half a row cuts a place name.
      full(textField('scheduler-f-destination', 'Destination', trip.destination)),
      full(selectField('scheduler-f-way', 'Type', screen.kind, [
        ['round_trip', 'Round trip'],
        ['one_way', 'One way'],
      ])),
      pair(passengers, busCount),
      colorBox,
    );
    panelDetails.appendChild(section('Trip information', fieldTile(topFields), tripMenu));

    // The Buses tab is its vehicles alone; what the trip needs is on Billing and Route.
    panelFleet.querySelector(':scope > [data-fleet-needs]')?.remove();

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
      // The name and the phone each take a row: half the 22rem panel cuts a
      // name and the last digits of a number beside its copy button.
      /* The booking's conversation is a link, never a field on show. It
         follows the Email label on its line, as a saved record's link follows
         Name: Email thread opens it, and with none, Add email thread opens
         the Email thread box. The title line's menu changes or removes it.
         The field stays in the page, hidden, for Save to read. */
      const thread = el('div');
      thread.appendChild(textField('scheduler-f-cthread', 'Email thread', trip.booking_contact_missive_url));
      thread.hidden = true;
      const threadField = thread.querySelector('#scheduler-f-cthread');
      const emailItem = withCopy(textField('scheduler-f-cemail', 'Email', contact?.email),
        'scheduler-f-cemail', 'Booking contact email');
      // One named window, so each thread reuses the tab.
      const openThread = el('a', 'rux--link rux--link--sm scheduler-thread-link', 'Email thread');
      openThread.target = 'missive';
      openThread.rel = 'noopener';
      openThread.title = 'Open the email thread';
      const addThread = el('button', 'rux--link rux--link--sm scheduler-thread-add', 'Add email thread');
      addThread.type = 'button';
      const emailLabel = emailItem.querySelector('label[for="scheduler-f-cemail"]');
      const emailRow = el('div', 'scheduler-label-row');
      emailLabel.replaceWith(emailRow);
      emailRow.append(emailLabel, openThread, addThread);
      const bookingStack = el('div', 'rux--stack-vertical rux--stack-scale-5');
      bookingStack.append(
        full(withSaved(withCopy(contactSearch('scheduler-f-cfind', 'Name', allContacts, contact),
          'scheduler-f-cfind', 'Booking contact name'), 'scheduler-f-cfind', 'contact')),
        full(withCopy(textField('scheduler-f-cphone', 'Phone', contact?.phone),
          'scheduler-f-cphone', 'Booking contact phone')),
        emailItem,
        customerBox,
        thread,
      );
      const bookingMenu = el('button', 'rux--btn rux--btn--ghost rux--btn--icon-only rux--layout--size-sm rux--menu-button__trigger');
      bookingMenu.type = 'button';
      bookingMenu.id = 'scheduler-f-cmenu';
      bookingMenu.setAttribute('aria-haspopup', 'true');
      bookingMenu.setAttribute('aria-expanded', 'false');
      bookingMenu.setAttribute('aria-label', 'Booking contact actions');
      bookingMenu.title = 'Booking contact actions';
      bookingMenu.appendChild(svgUse('#m-more_vert', '16', '0 0 32 32'));
      bookingMenu.lastChild.setAttribute('class', 'rux--btn__icon');
      // Only a web address opens, so anything else shows neither link.
      const setThread = value => {
        threadField.value = value;
        const link = /^https?:\/\//i.test(value) ? value : '';
        if (link) openThread.href = link; else openThread.removeAttribute('href');
        openThread.hidden = !link;
        addThread.hidden = !!value;
      };
      // A draft types the thread in, and the links follow the field.
      threadField.addEventListener('input', () => setThread(threadField.value.trim()));
      // Focus goes back where the box was asked from, or to the link it made.
      const editThread = from => askThread(threadField.value.trim(), value => {
        setThread(value);
        refreshDirty();
        (from === bookingMenu ? bookingMenu : value ? openThread : addThread).focus();
      });
      addThread.addEventListener('click', () => editThread(addThread));
      bookingMenu.addEventListener('click', () => openRowMenu(bookingMenu, {
        editText: threadField.value.trim() ? 'Change email thread' : 'Add email thread',
        edit: () => editThread(bookingMenu),
        removeText: 'Remove email thread', removeDisabled: !threadField.value.trim(),
        remove: () => {
          setThread('');
          refreshDirty();
          bookingMenu.focus();
        },
      }));
      // A group named by its title, as Trip contacts is, so the menu can sit
      // on the title line.
      const booking = el('div', 'scheduler-panel-section');
      const bookingTitle = el('div', 'scheduler-panel-section__title', 'Booking contact');
      bookingTitle.id = 'scheduler-f-cgroup';
      const bookingHead = el('div', 'scheduler-group__head');
      bookingHead.append(bookingTitle, bookingMenu);
      setThread(threadField.value.trim());
      const bookingGroup = el('div');
      bookingGroup.setAttribute('role', 'group');
      bookingGroup.setAttribute('aria-labelledby', bookingTitle.id);
      bookingGroup.append(bookingHead, fieldTile(bookingStack));
      booking.appendChild(bookingGroup);
      panelDetails.appendChild(booking);
      // Phone and email are this trip's copy; editing them never changes the
      // shared contact record. `linkContacts` keeps the link.

      /* ── Trip contacts ──
         Whoever to reach while the trip runs, not "on-site": the person may
         travel with the group or coordinate from a desk. The trip's own contacts are drawn, or one empty
         contact when it has none, and the section's menu adds one up to the
         schema's five or removes the last. Each stays in its own slot, up to
         the last one filled, with an empty slot before it drawn as an empty
         row, so a trip saved elsewhere with a gap opens unchanged.

         A SPLIT TRIP SHOWS THE LEG ON SCREEN'S, as trip-shape.js hands them to
         its drivers: the drop-off's, or the pickup's own, a slot added on the
         pickup being the pickup's. A pickup with none of its own shows the
         drop-off's, to read, under Same as drop-off, and Add pickup contact
         starts its own. Both legs share the five slots, and a slot the other
         leg holds is never drawn here, so it saves as it opened. */
      const view = viewWord();
      const savedIn = n => !creating && !!slotOf(trip, n);
      const lastHeld = [1, 2, 3, 4, 5].filter(savedIn).at(-1) ?? 0;
      // A slot is the pickup's or else the drop-off's, as trip-shape.js reads it.
      const onView = d => !view || (view === 'return') === (d.leg === 'return');
      for (const d of editing.days) d.open = view ? savedIn(d.n) && onView(d) : d.n <= lastHeld;
      // The slots this view draws, in slot order.
      const shown = () => editing.days.filter(d => d.open && onView(d));
      // A pickup with none of its own draws none: it shows the drop-off's.
      const borrowed = () => view === 'return' && !shown().length;
      // The first slot no leg savedIn, or one emptied in this edit.
      const freeSlot = () => editing.days.find(d => !d.open && !d.pending && !savedIn(d.n))
        ?? editing.days.find(d => !d.open && !d.pending && d.removed);
      const openSlot = d => Object.assign(d, { open: true, fresh: true, removed: false, leg: view === 'return' ? 'return' : null });
      if (!shown().length && !borrowed() && freeSlot()) openSlot(freeSlot());
      /* A stack, 24px between contacts, each contact one row of its name
         beside its phone. */
      const rowsHost = el('div', 'rux--stack-vertical rux--stack-scale-3');
      rowsHost.id = 'scheduler-f-days';

      // What a slot savedIn now: its fields while drawn, else as it opened, or
      // nothing for a slot opened or emptied in this edit.
      const held = d => {
        const box = document.getElementById(`scheduler-f-d${d.n}`);
        if (box) {
          const name = box.value.trim();
          return { id: name ? (box.dataset.contactId || null) : null, name,
                   phone: document.getElementById(`scheduler-f-dphone${d.n}`)?.value.trim() || null };
        }
        if (d.pending) return d.pending;
        return d.fresh || d.removed ? null : slotOf(trip, d.n);
      };

      /* Each contact is a tile, Name over Phone, as a group named
         Contact 1 to 5 in the order drawn, which a screen reader says before
         its labels, so the tab needs no heading between the section title and
         the fields. Adding and removing are on the overflow menu at the end of
         the section's title line, out of the rows: Add contact, up to five
         across both legs, and Remove last contact, down to one, or on the
         pickup to none; a contact in the middle is emptied by clearing its
         fields. The fields carry their slot's number, `scheduler-f-d2` for
         slot 2, which `EDITS` and `linkContacts` read, so a redraw fills them
         from what they held. */
      const drawContacts = () => {
        const rows = shown().map(d => [d, held(d)]);
        rowsHost.replaceChildren();
        rows.forEach(([d, c], i) => {
          const n = d.n;
          const row = el('div', 'rux--stack-vertical rux--stack-scale-5');
          row.append(
            full(withSaved(withCopy(contactSearch(`scheduler-f-d${n}`, 'Name', allContacts, c?.name ? c : null),
              `scheduler-f-d${n}`, `Contact ${i + 1} name`), `scheduler-f-d${n}`, 'contact')),
            full(withCopy(textField(`scheduler-f-dphone${n}`, 'Phone', c?.phone),
              `scheduler-f-dphone${n}`, `Contact ${i + 1} phone`)),
          );
          row.setAttribute('role', 'group');
          row.setAttribute('aria-label', `Contact ${i + 1}`);
          rowsHost.appendChild(fieldTile(row));
        });
        if (borrowed()) {
          const theirs = contactsOfWord(trip, 'outbound');
          const note = el('p', 'rux--form__helper-text', theirs.length
            ? `Same as drop-off: ${theirs.map(c => [c.name, c.phone && showPhone(c.phone)].filter(Boolean).join(', ')).join('; ')}.`
            : 'Same as drop-off, which has no trip contact yet.');
          rowsHost.appendChild(note);
        }
      };
      drawContacts();

      /* A draft's trip contacts, each into a slot of its leg: the slot already
         holding someone of that name, whose phone the draft's replaces, or
         else an empty one drawn, or else the first free one. The leg on screen's are typed into its fields and marked.
         The other leg's, on a split trip, are held on their slot and saved
         with the trip, since that leg's slots are not drawn here; the draft
         notice names them. On any other trip a contact's leg is dropped. */
      detailsTakeContacts = (list, split) => {
        const elsewhere = [];
        const full = [];
        // The fields typed, marked once every contact is in, since a redraw drops a mark.
        const typed = [];
        for (const c of list) {
          const leg = split && c.leg === 'return' ? 'return' : null;
          const here = !view || (view === 'return') === (leg === 'return');
          const ofLeg = d => (d.leg === 'return') === (leg === 'return');
          const named = d => held(d)?.name;
          const holding = editing.days.find(d => !d.removed && ofLeg(d) && (d.open || d.pending || savedIn(d.n))
            && named(d) && folded(named(d)) === folded(c.name));
          const empty = here ? editing.days.find(d => d.open && onView(d) && !named(d)) : null;
          const d = holding ?? empty ?? freeSlot();
          if (!d) { full.push(c); continue; }
          if (here) {
            d.leg = leg;
            if (!d.open) { openSlot(d); d.leg = leg; drawContacts(); }
            const nameBox = document.getElementById(`scheduler-f-d${d.n}`);
            const phoneBox = document.getElementById(`scheduler-f-dphone${d.n}`);
            if (nameBox && !nameBox.value.trim()) { typeInto(nameBox, 'text', c.name.trim()); typed.push(nameBox.id); }
            if (phoneBox && c.phone && phoneBox.value.trim() !== c.phone.trim()) { typeInto(phoneBox, 'text', c.phone.trim()); typed.push(phoneBox.id); }
          } else {
            const was = held(d);
            d.pending = { id: holding ? was?.id ?? null : null, name: was?.name || c.name.trim(),
                          phone: c.phone?.trim() || was?.phone || null };
            Object.assign(d, { leg, removed: false });
            elsewhere.push(c);
          }
        }
        for (const id of typed) { const box = document.getElementById(id); if (box) markDrafted(box); }
        syncCopy();
        return { elsewhere, full };
      };

      const menuBtn = el('button', 'rux--btn rux--btn--ghost rux--btn--icon-only rux--layout--size-sm rux--menu-button__trigger');
      menuBtn.type = 'button';
      menuBtn.id = 'scheduler-f-dmenu';
      menuBtn.setAttribute('aria-haspopup', 'true');
      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.setAttribute('aria-label', 'Trip contact actions');
      menuBtn.title = 'Trip contact actions';
      menuBtn.appendChild(svgUse('#m-more_vert', '16', '0 0 32 32'));
      menuBtn.lastChild.setAttribute('class', 'rux--btn__icon');
      menuBtn.addEventListener('click', () => {
        const count = shown().length;
        const free = freeSlot();
        openRowMenu(menuBtn, {
          editText: view === 'return' && !count ? 'Add pickup contact' : 'Add contact', editDisabled: !free,
          edit: () => {
            if (!free) return;
            openSlot(free);
            drawContacts();
            syncCopy();
            refreshDirty();
            document.getElementById(`scheduler-f-d${free.n}`)?.focus();
          },
          removeText: 'Remove last contact', removeDisabled: view === 'return' ? count < 1 : count <= 1,
          remove: () => {
            const last = shown().at(-1);
            if (!last || (view !== 'return' && shown().length <= 1)) return;
            Object.assign(last, { open: false, removed: true, fresh: false });
            drawContacts();
            syncCopy();
            refreshDirty();
            menuBtn.focus();
          },
        });
      });

      /* The section is a group named by its title, not a fieldset, because the
         title line also savedIn the menu, and a legend must be the fieldset's
         first child and nothing beside it. */
      const days = el('div', 'scheduler-panel-section');
      const dayTitle = el('div', 'scheduler-panel-section__title',
        view === 'return' ? 'Pickup contacts' : view ? 'Drop-off contacts' : 'Trip contacts');
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
       The quick part first: where the group is picked up, one place search,
       and the two times the group moves, Departs and Returns. The stops
       between them are one list under it, filled in when the itinerary comes.
       The bus's three times -- leaving the yard, reaching the pickup, getting
       back -- are worked out from those and never typed; they and the day's
       totals are one grey line on the Stops heading. The panel
       opens from one bar, so the fields are that leg's; a drop-off and
       pick-up trip shows its other leg from the other bar or the leg switch. `editing.route`
       holds the rows and what has been picked since. */
    panelRoute.replaceChildren();
    {
      const r = editing.route;
      /* The drop-off defaults to the pickup, which is what a round trip
         means. `routeWanted` writes a drop-off row only when the two places
         differ, so a round trip's rows stay exactly as they were saved. A
         trip typed as a round trip is let off at its pickup whatever its last
         stop is, so that stop reads as a stop in the full itinerary rather
         than as where the group is let off. A one-way or split leg has no
         such default: until one is picked it has no drop-off. */
      if (wayNow() === 'round_trip' && r.pickupPlace) {
        r.dropOpen = r.dropPlace = { ...r.pickupPlace };
      }
      if (!r.dropPlace && r.pickupPlace && !oneWayType()) r.dropPlace = { ...r.pickupPlace };
      // A line under a field, hidden while it has nothing to say.
      const routeNote = text => {
        const line = el('p', 'rux--form__helper-text scheduler-route-note', text);
        line.hidden = !text;
        return line;
      };
      const val = id => document.getElementById(id)?.value.trim() || '';
      const setVal = (id, value) => { const input = document.getElementById(id); if (input) input.value = value ?? ''; };


      /* The worked-out times are not fields: they are kept in hidden inputs,
         which `routeWanted` reads, and said in the summary's tooltip. */
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
      /* The spot is the route times' minutes before Departs, unless the
         customer gave a time of their own: one that differs from that when the
         trip opens, or one typed into Spot, stays when Departs moves.
         Clearing Spot hands it back to Departs. */
      const saidLeave = toMin(r.first?.depart_prev), saidSpot = toMin(r.pickup?.spot);
      let spotTyped = saidSpot != null && saidLeave != null && saidSpot !== ((saidLeave - routeTimes.spot + 1440) % 1440);
      const recalcSpot = () => {
        const leave = toMin(val('scheduler-f-leave'));
        if (!spotTyped) setVal('scheduler-f-spot', leave == null ? '' : fromMin(leave - routeTimes.spot));
        recalcYard();
      };
      const recalcReturn = () => {
        const end = toMin(val('scheduler-f-endtrip'));
        setVal('scheduler-f-return', end != null && r.backDrive != null ? fromMin(end + r.backDrive) : '');
      };

      const lookupFailed = (e, what) => toast('warning', `No drive found ${what}`,
        `${e?.message ? `${e.message} ` : ''}The yard time stays blank.`);

      /* The bus's three times, each with the drive it was worked out from,
         are the summary's tooltip. The group's second time is named for what
         it is on this trip, Returns on a round trip and Arrives on one that
         ends elsewhere, and on a leg of more than one day for the day it
         falls on. */
      const clock = t => {
        const m = toMin(t);
        if (m == null) return '—';
        return `${(Math.floor(m / 60) % 12) || 12}:${String(m % 60).padStart(2, '0')} ${m < 720 ? 'AM' : 'PM'}`;
      };
      // A figure not known yet: a dash in the placeholder colour, so it reads as empty.
      const noFigure = () => el('span', 'scheduler-figures__none', '—');
      let busSaid = '';
      /* Whether the tab shows the group let off where it was picked up: a
         round trip whose drop-off is its pickup. A one-way or split leg always
         ends elsewhere, even while neither place is filled in. */
      const letOffAtPickup = () => wayNow() === 'round_trip' && routeRound();
      const drawTimeline = () => {
        const yard = val('scheduler-f-depart'), spot = val('scheduler-f-spot'), home = val('scheduler-f-return');
        const outWords = driveWords(r.driveOut, r.driveMiles);
        const backWords = driveWords(r.backDrive, r.backMiles);
        // Only the times filled in, so an empty leg has no tooltip.
        busSaid = [
          yard && `Bus leaves the yard ${clock(yard)}${outWords ? ` (${outWords})` : ''}`,
          spot && `at the pickup ${clock(spot)}`,
          home && `back at the yard ${clock(home)}${backWords ? ` (${backWords})` : ''}`,
        ].filter(Boolean).join(' · ');
        const { from, to } = routeDates(r.leg);
        const day = to && from && to !== from
          ? ` · ${parseISO(to).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}` : '';
        const backLabel = document.querySelector('label[for="scheduler-f-endtrip"]');
        if (backLabel) backLabel.textContent = `${letOffAtPickup() ? 'Returns' : 'Arrives'}${day}`;
        drawTotals();
      };

      /* A place is one search. Its name, which the field shows, and its
         address, the grey line under it that the drive is measured from, come
         from the pick together; a place typed and not picked is named by what
         was typed. */
      const named = (place, name) => (place || name ? { ...(place ?? placeOf({})), name: name ?? place?.name ?? null } : null);

      const driveOutFrom = async place => {
        try {
          const drive = await driveBetween(yardPlace, place);
          if (!drive || r.pickupPlace !== place) return;
          r.driveOut = drive.min;
          r.driveMiles = drive.miles;
          r.driveSource = 'estimated';
          recalcYard();
          refreshDirty();
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
          refreshDirty();
        } catch (e) { r.backDrive = null; recalcReturn(); lookupFailed(e, 'back to the yard'); }
      };

      /* A place picked that is not a saved location yet gets a Name field
         under it, filled with the map's name, so it is named the way the office
         names places, such as a chain with its town after it. A saved
         location's name is changed on the Locations page. The search shows
         whatever name the place is given. */
      const nameFor = (search, nameField) => {
        const row = full(nameField);
        row.style.display = 'none';
        const input = search.querySelector('input[role="combobox"]');
        input.addEventListener('scheduler:place', e => {
          row.style.display = e.detail.place && !e.detail.saved ? '' : 'none';
        });
        nameField.querySelector('input').addEventListener('input', e => { input.value = e.target.value; });
        return row;
      };
      const pickupName = textField('scheduler-f-pickupname', 'Name', r.pickupPlace?.name);
      const dropName = textField('scheduler-f-dropname', 'Name', r.dropPlace?.name);

      /* While the drop-off is hidden the page says the group is let off
         where it was picked up, so its hidden fields copy the pickup;
         otherwise they keep the old pickup and Save writes it as a
         drop-off of its own. */
      const followPickup = () => {
        setVal('scheduler-f-dropname', val('scheduler-f-pickupname'));
        setVal('scheduler-f-dropoff', r.pickupPlace?.address ?? '');
        r.dropPlace = r.pickupPlace ? { ...r.pickupPlace } : null;
      };

      const pickupField = placeSearch('scheduler-f-pickup', 'Location', r.pickupPlace, async (place, typed) => {
        if (!place) {
          setVal('scheduler-f-pickupname', typed ?? '');
          r.pickupPlace = named(typed ? { ...placeOf({}), address: typed } : null, val('scheduler-f-pickupname') || null);
          r.driveOut = null;
          recalcYard();
          if (dropBox.hidden) {
            followPickup();
            r.backDrive = null;
            recalcReturn();
          }
          drawTimeline();
          return;
        }
        await pickPickup(place);
      });
      /* A customer's usual pickup fills the pickup only when both of its
         fields are empty, the way a pick from the search would. */
      r.fillPickup = place => {
        // A later leg's pickup is where an earlier one went, never the customer's own.
        if (r.leg !== editing.legs[0]?.key) return;
        if (val('scheduler-f-pickup') || val('scheduler-f-pickupname')) return;
        setVal('scheduler-f-pickup', place.address ?? '');
        pickPickup({ name: place.name, address: place.address, lat: place.lat, lng: place.lng,
                     mapbox_id: place.mapbox_id ?? null });
      };
      async function pickPickup(place) {
        setVal('scheduler-f-pickupname', place.name ?? '');
        r.pickupPlace = named(place, place.name || null);
        // A round trip's drop-off, or one nobody has filled, follows the
        // pickup; a one-way or split leg's never does.
        if (dropBox.hidden || (!oneWayType() && !val('scheduler-f-dropname') && !val('scheduler-f-dropoff'))) followPickup();
        drawTimeline();
        await driveOutFrom(r.pickupPlace);
        if (r.dropPlace && samePlace(r.dropPlace, r.pickupPlace)) {
          r.backDrive = r.driveOut; r.backMiles = r.driveMiles; r.backSource = r.driveSource;
          recalcReturn();
        }
        drawTimeline();
        refreshDirty();
        remeasure();
      }
      /* A new pickup or drop-off moves the drives beside it: the list's, which
         then saves whole, or with no stops the one leg between the two. */
      function remeasure() {
        if (r.list?.length) touch(); else measureStops();
      }

      const dropField = placeSearch('scheduler-f-dropoff', 'Drop-off', r.dropPlace, async (place, typed) => {
        if (!place) {
          setVal('scheduler-f-dropname', typed ?? '');
          r.dropPlace = named(typed ? { ...placeOf({}), address: typed } : null, val('scheduler-f-dropname') || null);
          r.backDrive = null;
          recalcReturn();
          drawTimeline();
          return;
        }
        setVal('scheduler-f-dropname', place.name ?? '');
        r.dropPlace = named(place, place.name || null);
        drawTimeline();
        await driveBackFrom(r.dropPlace);
        drawTimeline();
        refreshDirty();
        remeasure();
      });

      /* The pickup and the drop-off are tiles at the two ends of the Route
         list, and each is edited in a dialog of its own: the place and the
         time the group moves there. Their fields live in the dialogs, which
         stay in the page, so Save and the summary read them wherever they
         are. */
      const pickupFields = el('div', 'rux--stack-vertical rux--stack-scale-5');
      const dropFields = el('div', 'rux--stack-vertical rux--stack-scale-5');

      /* A round trip ends where it began, so its drop-off is shown and not
         asked: "Drop-off" reads as where the group is let out for the day,
         which is the destination, and the drive home is measured from
         whatever is entered there, so the misreading moves Yard return by
         hours without saying so. The fields stay in the page, hidden, because
         the summary and Save read them wherever they are. */
      const dropBox = el('div', 'rux--stack-vertical rux--stack-scale-5 scheduler-route-drop');
      dropBox.append(full(dropField), nameFor(dropField, dropName));
      // Until it is opened, the dialog says the group is let off at the pickup.
      const sameNote = el('p', 'rux--type-body-compact-01', 'The group is let off where it was picked up.');
      const dropOpen = el('button', 'rux--link rux--link--sm scheduler-route-open', 'Change drop-off location');
      dropOpen.type = 'button';
      const showDrop = open => {
        dropBox.hidden = !open;
        dropOpen.hidden = open;
        sameNote.hidden = open;
      };
      dropOpen.addEventListener('click', () => {
        showDrop(true);
        dropBox.querySelector('input')?.focus();
      });

      pickupFields.append(
        full(pickupField),
        nameFor(pickupField, pickupName),
        // Spot first, since the bus is there before the group leaves.
        pair(timeField('scheduler-f-spot', 'Spot', r.pickup?.spot),
          timeField('scheduler-f-leave', 'Departs', r.first?.depart_prev)),
      );
      dropFields.append(
        sameNote, dropOpen, dropBox,
        full(timeField('scheduler-f-endtrip', 'Returns', r.back?.depart_prev)),
      );
      document.getElementById('scheduler-pickup-fields')?.replaceChildren(pickupFields);
      document.getElementById('scheduler-dropoff-fields')?.replaceChildren(dropFields);
      showDrop(!letOffAtPickup());

      // The worked-out times, kept where Save reads them.
      const routeBox = el('div');
      routeBox.hidden = true;
      routeBox.append(kept('scheduler-f-depart', r.pickup?.depart_prev),
        kept('scheduler-f-return', r.back?.arrive));

      /* ── The stops ──
         Always open, one line each, the time first and then the place, so a
         trip with only its destination is one row, and the tab stays a
         minute's work. What a stop's drive and wait are is its tooltip. */
      /* The stops as a list, in the order the group reaches them. The row
         where the group is let off is not one of them: a one-way trip's is its
         last stop, which the fields above edit, and a round trip's is a row
         back at the pickup, which Save makes once the last stop has a leave
         time. A stop leaves when the next row says it departs. */
      const inner = r.inner ?? [];
      r.dropRow = !inner.length ? null
        : !routeRound() ? inner.at(-1)
        : inner.length > 1 && samePlace(placeOf(inner.at(-1)), r.pickupPlace) ? inner.at(-1) : null;
      r.middleOpen = r.dropRow ? inner.slice(0, -1) : inner;
      r.list = r.middleOpen.map((st, i) => ({
        id: String(st.id), open: st, place: placeOf(st), placeChanged: false,
        arrive: hhmmOrNull(st.arrive), leave: hhmmOrNull((r.middleOpen[i + 1] ?? r.dropRow)?.depart_prev),
        date: st.arrive_date ?? st.depart_prev_date ?? null,
        // The day it is left is kept with the departure, on the row after it.
        leaveDate: (r.middleOpen[i + 1] ?? r.dropRow)?.depart_prev_date ?? null,
        dwell: st.dwell_status ?? null, drive: driveMin(st.drive), miles: numOrNull(st.miles), driveChanged: false,
      }));
      r.listTouched = false;
      r.dropDrive = r.dropRow ? driveMin(r.dropRow.drive) : null;
      r.dropMiles = r.dropRow ? numOrNull(r.dropRow.miles) : null;
      /* Which two places each saved drive is between, `drivenFor`, so a drive
         can be told from one measured before a place moved: a saved stop's is
         from the place before it, and the last drive's ends at the drop-off. */
      {
        let before = r.pickupPlace;
        for (const st of r.list) {
          if (st.place?.lat == null) continue;
          st.drivenFor = st.drive != null ? driveEnds(before, st.place) : null;
          before = st.place;
        }
        r.dropDrivenFor = r.dropDrive != null ? driveEnds(before, routeRound() ? r.pickupPlace : r.dropPlace) : null;
      }

      const DWELL = { on: 'on duty', off: 'off duty', sleeper: 'sleeper berth' };
      // Each kind of wait's mark on a stop: the clock running, the clock
      // stopped, and the sleeper mark the board gives a sleeper bus.
      const DWELL_ICON = { on: '#m-play_circle-fill', off: '#m-pause_circle-fill', sleeper: '#m-airline_seat_flat-fill' };
      const stopsBody = el('div', 'rux--stack-vertical rux--stack-scale-5');
      const stopsList = rowList();
      stopsList.list.classList.add('scheduler-route-stops');
      /* The trip's figures, one home at the top of the tab: when the bus
         leaves the yard, is spotted and is back, then each day's miles, drive
         and on duty on a leg of more than one day, then the whole leg's.
         One tile, the figures padded and the table flush with its edges. */
      const summary = el('div', 'rux--tile scheduler-summary');
      // The leg's menu, at the end of its first day's heading: its drives
      // measured again, the route times, which apply to every trip, and the fuel card.
      const summaryMenu = el('button', 'rux--btn rux--btn--ghost rux--btn--icon-only rux--layout--size-sm rux--menu-button__trigger');
      summaryMenu.type = 'button';
      summaryMenu.setAttribute('aria-haspopup', 'true');
      summaryMenu.setAttribute('aria-expanded', 'false');
      summaryMenu.setAttribute('aria-label', 'Route options');
      summaryMenu.appendChild(svgUse('#m-more_vert', '16', '0 0 32 32'));
      summaryMenu.lastChild.setAttribute('class', 'rux--btn__icon');
      // The fuel card is turned on and off here, and suggested at the Summary's foot.
      const setFuelCard = on => { editing.fuelCard = on; drawTotals(); refreshDirty(); };
      /* Every drive of the leg on screen asked again, as picking its places
         again would: the yard's two and the list's, so a drive saved before
         the lookup changed is measured the way a new one is. Save stores
         whatever came out different. */
      async function measureAgain() {
        if (r.pickupPlace?.lat != null) await driveOutFrom(r.pickupPlace);
        if (r.dropPlace?.lat != null) await driveBackFrom(r.dropPlace);
        drawTimeline();
        remeasure();
        toast('success', 'Drives measured again', 'Save keeps the new miles and times.');
      }
      summaryMenu.addEventListener('click', () => openItemsMenu(summaryMenu, [
        { label: 'Measure drives again', run: measureAgain },
        { label: 'Route times', run: openRouteTimes },
        { label: 'Fuel card limits', run: openFuelLimits },
        editing.fuelCard ? { label: 'Remove fuel card', run: () => setFuelCard(false) }
          : { label: 'Add fuel card', run: () => setFuelCard(true) },
      ], 'Route options'));
      const fuelBox = el('div', 'scheduler-fuel');
      const driverBox = el('div', 'scheduler-fuel');
      const timesBox = el('div', 'scheduler-fuel');
      /* The times, second driver and fuel card lines are the tile's foot,
         under a rule as Billing's status is, and the foot is hidden while all
         are empty. */
      const summaryFoot = el('div', 'scheduler-summary__foot');
      const summaryNotes = el('div', 'rux--stack-vertical rux--stack-scale-4');
      summaryNotes.append(timesBox, driverBox, fuelBox);
      summaryFoot.appendChild(summaryNotes);
      const summaryLayer = el('div', 'rux--layer-two');
      summaryLayer.appendChild(summary);
      /* Stops can be added to a leg with its rows, or to one with none yet,
         whose Save writes them all. An older leg with some rows but no
         pickup or yard row has nowhere to put one. */
      const canList = !!(r.pickup && r.back) || !r.all.some(x => x.leg === r.leg);
      const listNote = routeNote(canList ? '' : "This leg has no pickup or yard row, so stops can't be added here.");
      // A change to the route times redraws the figures; a new spot applies when Departs is next typed.
      routeTimesDrawn = () => drawTotals();
      /* A DRAFT'S STOPS go into the list in the order given, each on the day
         it gives or the leg's first, and each marked to check. On a change
         they replace the list, since a newer itinerary is the whole route
         again. A place that is a saved location, by its address or its name,
         is set to that location. Any other keeps its words and has no point
         on the map until the person chooses it from its list, which its
         window opens ready to search, so it is named in the draft's notice.
         A leg whose list cannot take stops takes none, and says so. */
      routeStopsHeld = () => r.list.length;
      routeTakesStops = (stops, replace = false) => {
        if (!canList) return { refused: true, unpicked: [] };
        const { from } = routeDates(r.leg);
        const time = t => (/^\d{1,2}:\d{2}/.test(String(t ?? '')) ? String(t).slice(0, 5).padStart(5, '0') : null);
        const unpicked = [];
        if (replace) r.list.length = 0;
        for (const s of stops) {
          const name = String(s?.name ?? '').trim(), address = String(s?.address ?? '').trim();
          if (!name && !address) continue;
          const loc = savedLocationOf({ address })
            ?? (name ? (panelIndex.locations || []).find(l => folded(l.name) === folded(name)) : null) ?? null;
          if (!loc) unpicked.push(`stop ${r.list.length + 1}${name ? `, ${name}` : ''}`);
          const stop = { id: null, open: null, placeChanged: true,
            place: loc ? savedAsPlace(loc) : { ...placeOf({}), name: name || address, address: address || null },
            arrive: time(s.arrive), leave: time(s.leave), date: isoOrNull(s.date ?? '') ?? from,
            leaveDate: isoOrNull(s.leave_date ?? '') ?? null,
            dwell: 'on', drive: null, miles: null, driveChanged: false, drafted: true };
          // A night at the stop starts off duty, as route-figures.js reads one.
          stop.dwell = RF.nightDwell({ from }, stop);
          r.list.push(stop);
        }
        touch();
        return { refused: false, unpicked };
      };
      /* A DRAFT'S STOP CHANGES go onto the saved stops they name by id, each
         a change a person could make in the stop's window: its times, its
         days and what its wait counts as. Each changed stop is marked to
         check. A change to a stop not in this leg's list, the drop-off, a
         stop on the other leg or none of the trip's, is handed back in words,
         [where, what], to be named. */
      routeTakesChanges = changes => {
        const clock = t => (t == null ? null : String(t).slice(0, 5).padStart(5, '0'));
        const WAITS = { on: 'on duty', off: 'off duty', sleeper: 'in the sleeper berth' };
        const asked = c => [
          'arrive' in c ? `arrival ${c.arrive ?? 'none'}` : null, 'leave' in c ? `leave ${c.leave ?? 'none'}` : null,
          'date' in c ? `day ${c.date}` : null, 'leave_date' in c ? `leave day ${c.leave_date}` : null,
          'dwell' in c ? `wait ${WAITS[c.dwell] ?? c.dwell}` : null,
        ].filter(Boolean).join(', ');
        const whereOf = id => {
          if (r.dropRow && String(r.dropRow.id) === String(id)) return `the drop-off, ${r.dropRow.name || 'unnamed'}, whose times are the trip's end`;
          const other = (r.otherStops || []).find(x => String(x.id) === String(id));
          if (other) return `${other.name || 'a stop'} on the other leg, opened from its own bar`;
          return 'a stop this trip does not have';
        };
        const missed = [];
        for (const c of changes) {
          const st = r.list.find(x => String(x.id) === String(c.id));
          if (!st) { missed.push([whereOf(c.id), asked(c)]); continue; }
          if ('arrive' in c) st.arrive = clock(c.arrive);
          if ('leave' in c) st.leave = clock(c.leave);
          if ('date' in c) st.date = c.date;
          if ('leave_date' in c) st.leaveDate = c.leave_date;
          if ('dwell' in c) st.dwell = c.dwell;
          st.draftChanged = true;
        }
        if (missed.length < changes.length) touch();
        return missed;
      };
      stopsBody.append(stopsList.list, listNote);

      /* A stop with no point on the map, a restroom break on the road, is
         passed over: the drive is measured from the place before it to the
         place after, and kept on the stop after. */
      const located = st => st.place?.lat != null;
      /* THE LEG AS THE TAB HOLDS IT NOW, in the shape route-figures.js reads,
         so every figure on the tab comes from the one sum the Detailed
         itinerary prints. Built afresh each time, since any field may have
         changed since the last. */
      const routeModel = () => {
        const { from, to } = routeDates(r.leg);
        return {
          from, to, pre: routeTimes.pre, post: routeTimes.post, late: window.SchedulerWeek.lateReturn(),
          times: { depart: val('scheduler-f-depart'), spot: val('scheduler-f-spot'), leave: val('scheduler-f-leave'),
            endtrip: val('scheduler-f-endtrip'), back: val('scheduler-f-return') },
          out: [r.driveOut, r.driveMiles], home: [r.backDrive, r.backMiles],
          drop: [r.dropDrive, r.dropMiles], dropCounts: dropCounts(),
          list: r.list, located,
        };
      };
      // A wait runs from the arrival to the leave on the day each falls.
      const waitOf = st => RF.waitOf(routeModel(), st);
      /* The days past the leg's own each time falls on a one-day leg, keyed
         'depart', 'spot', 'leave', 'endtrip', 'return' and `${i}:arrive` or
         `${i}:leave`; empty on a longer leg, whose times carry their dates. */
      const pastMidnight = () => RF.midnights(routeModel());
      // A time on a later day than the leg's, with that day's weekday before it.
      const clockOn = (time, days) => (days > 0 && routeDates(r.leg).from
        ? `${parseISO(dayAfter(routeDates(r.leg).from, days)).toLocaleDateString(undefined, { weekday: 'short' })} ${clock(time)}`
        : clock(time));
      // The minutes the typed times leave for the drive into a stop, or null.
      const roomInto = st => RF.roomInto(routeModel(), st);
      const warnLine = text => {
        const w = el('span', 'scheduler-route-warn');
        const icon = svgUse('#m-warning-fill', '16', '0 0 32 32');
        icon.setAttribute('aria-hidden', 'true');
        w.append(icon, el('span', null, text));
        return w;
      };
      const touch = () => { r.listTouched = true; drawStops(); refreshDirty(); measureStops(); };

      /* A leg of more than one day lists its stops under a heading per day
         it counts, each with that day's own figures, and a stop dated after
         them or outside the leg below the last. A bus back before the
         late-return hour came back the night before, so that morning has no
         heading and its times carry their weekday. */
      const dayOf = st => st.date || routeDates(r.leg).from;
      function drawStops() {
        stopsList.body.replaceChildren();
        const late = pastMidnight();
        const { from, to } = routeDates(r.leg);
        const lastRow = RF.countsTo(routeModel());
        // The days after the leg's first a day past its last heading falls.
        const pastRows = day => (from && day && lastRow && day > lastRow ? daysBetween(parseISO(from), parseISO(day)) : 0);
        /* The road between two places, between their rows: its drive and
           miles, which belong to neither place. The first comes from the
           pickup and the last goes on to the drop-off. */
        /* A leg the typed times leave too little time for says so after its
           figures, as does the leg on to the drop-off. */
        const legLine = (from, min, miles, room) => {
          const li = el('li', 'scheduler-route-leg');
          li.appendChild(svgUse('#m-directions_bus', '16', '0 0 32 32'));
          const drive = min == null ? 'not measured' : min < 60 ? `${min} min` : hm(min);
          li.appendChild(el('span', null, [from, drive, miles == null ? null : `${Math.round(miles)} mi`]
            .filter(Boolean).join(' · ')));
          if (room != null && room < 0) li.appendChild(warnLine('arrives before it leaves'));
          else if (min != null && room != null && room < min) {
            li.appendChild(warnLine(`only ${hm(room)} between the times`));
          }
          return li;
        };
        // A stop's number, counted down the list from 1 across every day.
        const rowFor = (st, i, n) => {
          const name = st.place?.name || st.place?.address || 'Stop';
          // A leave on a later day than the arrival carries its weekday.
          const leaveDay = leaveDayOf(st, routeDates(r.leg).from);
          // On a one-day leg a time past midnight carries the next day's.
          const got = late.get(`${i}:arrive`) ?? pastRows(st.date), left = late.get(`${i}:leave`) ?? got;
          const leaveWord = st.leave && leaveDay && leaveDay !== (st.date ?? routeDates(r.leg).from)
            ? `${parseISO(leaveDay).toLocaleDateString(undefined, { weekday: 'short' })} ${clock(st.leave)}`
            : left !== got || !st.arrive ? clockOn(st.leave, left) : clock(st.leave);
          const much = st.arrive && st.leave ? `${clockOn(st.arrive, got)} – ${leaveWord}`
            : st.arrive ? clockOn(st.arrive, got) : st.leave ? `leaves ${clockOn(st.leave, left)}` : 'No times';
          const wait = waitOf(st);
          const drove = driveWords(st.drive, st.miles);
          const here = located(st);
          // Under the place, only what happens there: the wait, its kind shown
          // by its mark in place of the words, which stay in the tile's title.
          const meta = wait ? `Waits ${hm(wait)}${st.dwell ? `, ${DWELL[st.dwell]}` : ''}` : '';
          const dwellIcon = wait && DWELL_ICON[st.dwell];
          // A round trip keeps its destination, which holds when the group
          // leaves the pickup.
          const lastOfRound = routeRound() && r.list.length === 1;
          const move = by => { r.list.splice(i + by, 0, r.list.splice(i, 1)[0]); touch(); };
          const row = listRow({
            name, much, meta: dwellIcon ? `Waits ${hm(wait)}` : meta, lead: String(n), context: true,
            title: [`Stop ${n}`, name, much, drove ? `${drove} drive` : null, meta,
              here ? null : 'No location, so the drive is measured past it'].filter(Boolean).join(' · '),
            edit: () => openStopDialog(i),
            items: [
              { label: 'Edit', run: () => openStopDialog(i) },
              { label: 'Move up', disabled: i === 0, run: () => move(-1) },
              { label: 'Move down', disabled: i === r.list.length - 1, run: () => move(1) },
              { label: 'Remove', danger: true, disabled: lastOfRound, run: () => { r.list.splice(i, 1); touch(); } },
            ],
          });
          if (dwellIcon) {
            const mark = svgUse(dwellIcon, '16', '0 0 32 32');
            mark.classList.add('scheduler-route-dwell');
            row.querySelector('.scheduler-item__meta').appendChild(mark);
          }
          // A stop a draft laid out is marked to check until its window is Done.
          if (st.drafted || st.draftChanged) row.classList.add('scheduler-drafted');
          // No location is about the place, so it ends the name's line.
          if (!here) {
            row.querySelector('.scheduler-item__line').appendChild(warnLine('No location'));
            return [row];
          }
          const room = roomInto(st);
          return [legLine(null, st.drive, st.miles, room), row];
        };
        // The leg on to where the group is let off, from the last place on the map.
        const dropLine = () => legLine(null, r.dropDrive, r.dropMiles, RF.dropRoom(routeModel()));
        /* The two ends of the route, tiles like the stops': the pickup with when
           the group departs, the drop-off with when it returns or arrives. The
           bus's yard and spot times are the summary's. Each opens its own
           dialog. */
        const openEnd = (modal, field) => {
          window.Rux?.modal?.open?.(modal);
          document.getElementById(field)?.focus();
        };
        // Marked P and D, named in full for the tooltip and a screen reader.
        const endTile = (mark, word, place, empty, much, open) => {
          const name = place?.name || place?.address || empty;
          return listRow({ name, much, lead: mark, title: [word, name, much].join(' · '), edit: open, context: true });
        };
        const pickupTile = () => {
          const leave = val('scheduler-f-leave');
          return endTile('P', 'Pickup', r.pickupPlace, 'Add pickup', leave ? `Departs ${clock(leave)}` : 'No time',
            () => openEnd('scheduler-pickup-modal', 'scheduler-f-pickup'));
        };
        const dropTile = () => {
          const end = val('scheduler-f-endtrip');
          const word = letOffAtPickup() ? 'Returns' : 'Arrives';
          return endTile('D', 'Drop-off', letOffAtPickup() ? r.pickupPlace : r.dropPlace, 'Add drop-off',
            end ? `${word} ${clockOn(end, late.get('endtrip') ?? pastRows(to))}` : 'No time',
            () => openEnd('scheduler-dropoff-modal', 'scheduler-f-endtrip'));
        };
        let num = 0;  // the stops numbered so far
        let daysDrawn = 0;  // so the pickup goes under the first day
        const days = [];
        if (from && to && to > from) for (let d = from; d <= lastRow && days.length < 31; d = dayAfter(d, 1)) days.push(d);
        if (days.length > 1) {
          days.forEach((d, n) => {
            const head = el('li', 'scheduler-route-day');
            head.appendChild(el('span', 'scheduler-panel-section__title scheduler-route-day__name',
              `Day ${n + 1} · ${parseISO(d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`));
            stopsList.body.appendChild(head);
            if (!daysDrawn++) stopsList.body.appendChild(pickupTile());
            r.list.forEach((st, i) => { if (dayOf(st) === d) stopsList.body.append(...rowFor(st, i, ++num)); });
          });
          r.list.forEach((st, i) => { if (!days.includes(dayOf(st))) stopsList.body.append(...rowFor(st, i, ++num)); });
        } else {
          // A one-day leg is headed by its date alone; a leg with no date yet
          // keeps the heading line, empty, for the menu.
          const head = el('li', 'scheduler-route-day');
          head.appendChild(el('span', 'scheduler-panel-section__title scheduler-route-day__name',
            from ? parseISO(from).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : ''));
          stopsList.body.appendChild(head);
          stopsList.body.appendChild(pickupTile());
          r.list.forEach((st, i) => stopsList.body.append(...rowFor(st, i, ++num)));
        }
        stopsList.body.querySelector('.scheduler-route-day')?.append(summaryMenu);
        // The leg on to the drop-off, from the last stop or, with none, the pickup.
        if (dropCounts()) stopsList.body.appendChild(dropLine());
        stopsList.body.appendChild(dropTile());
        if (canList) {
          stopsList.body.appendChild(listAddRow({
            label: 'Add stop', id: 'scheduler-f-stopadd', onClick: () => openStopDialog(null),
          }).li);
        }
        drawTotals();
      }

      /* Every leg of the list is measured, from the stop before it or the
         pickup, and the leg on to where the group is let off, by the same
         lookup the yard's two legs use. */
      /* Measures every drive of the list again. Where the map does not answer,
         a drive already between these two places stays as it is; one that was
         measured between two other places, before a stop moved, is blanked
         and said, because no drive is truer than the wrong one, and the
         times and miles worked out from it would be wrong with it. */
      async function measureStops() {
        const asked = async place => { try { return await driveBetween(prev, place); } catch { return null; } };
        const blanked = [];
        let prev = r.pickupPlace;
        for (const st of r.list) {
          if (!located(st)) {
            if (st.drive != null || st.miles != null) Object.assign(st, { drive: null, miles: null, driveChanged: true, drivenFor: null });
            continue;
          }
          if (prev?.lat != null) {
            const ends = driveEnds(prev, st.place);
            const d = await asked(st.place);
            if (d) {
              if (d.min !== st.drive || d.miles !== st.miles) Object.assign(st, { drive: d.min, miles: d.miles, driveChanged: true });
              st.drivenFor = ends;
            } else if (st.drivenFor !== ends && (st.drive != null || st.miles != null)) {
              Object.assign(st, { drive: null, miles: null, driveChanged: true, drivenFor: null });
              blanked.push(st.place.name || 'a stop');
            }
          }
          prev = st.place;
        }
        const to = routeRound() ? r.pickupPlace : r.dropPlace;
        if (to?.lat != null && prev?.lat != null && prev !== to) {
          const ends = driveEnds(prev, to);
          const d = await asked(to);
          if (d) {
            Object.assign(r, { dropDrive: d.min, dropMiles: d.miles, dropFound: false, dropDrivenFor: ends });
          } else if (r.dropDrivenFor !== ends && (r.dropDrive != null || r.dropMiles != null)) {
            Object.assign(r, { dropDrive: null, dropMiles: null, dropFound: false, dropDrivenFor: null });
            blanked.push(to.name || 'the drop-off');
          }
        }
        drawStops();
        refreshDirty();
        if (blanked.length) {
          toast('warning', 'The map did not answer',
            `The drive to ${blanked.join(' and to ')} is blank for now.`);
        }
      }

      /* Every leg of the list with a place at both ends and no drive yet is
         looked up when the trip opens, and drawn at once. It is marked
         `found`, not changed, so opening a trip is still no edit: the next
         Save stores it with whatever else it writes. The yard's two legs are
         left alone, because they move the yard times the tab works out. */
      async function fillMissingDrives() {
        let prev = r.pickupPlace;
        let got = false;
        for (const st of r.list) {
          if (!located(st)) continue;
          if (st.drive == null && prev?.lat != null) {
            try {
              const d = await driveBetween(prev, st.place);
              if (editing?.route !== r) return;
              if (d && st.drive == null) { Object.assign(st, { drive: d.min, miles: d.miles, found: true }); got = true; }
            } catch { /* the leg stays not measured */ }
          }
          prev = st.place;
        }
        const to = routeRound() ? r.pickupPlace : r.dropPlace;
        if (dropCounts() && r.dropDrive == null && prev?.lat != null && to?.lat != null) {
          try {
            const d = await driveBetween(prev, to);
            if (editing?.route !== r) return;
            if (d && r.dropDrive == null) { r.dropDrive = d.min; r.dropMiles = d.miles; r.dropFound = true; got = true; }
          } catch { /* the leg stays not measured */ }
        }
        if (got) drawStops();
      }

      /* One stop, edited in a dialog as a quote line is: where, which day on a
         trip of more than one, when the group gets there and leaves, and what
         the wait counts as. */
      function openStopDialog(index) {
        const host = document.getElementById('scheduler-stop-fields');
        if (!host) return;
        const { from, to } = routeDates(r.leg);
        const st = index === null
          ? { id: null, open: null, place: null, placeChanged: true, arrive: null, leave: null,
              date: from, dwell: 'on', drive: null, miles: null, driveChanged: false }
          : r.list[index];
        let picked = st.place;
        document.getElementById('scheduler-stop-h').textContent = index === null ? 'Add stop' : 'Edit stop';
        const grid = el('div', 'scheduler-dialog-grid scheduler-dialog-grid--pairs');
        // One place search, as the pickup is, and a Name for a new place.
        const name = textField('scheduler-f-stopname', 'Name', st.place?.name);
        name.classList.add('scheduler-dialog-grid__wide');
        name.style.display = 'none';
        /* Words typed and not picked, such as "Restroom break", name a stop
           with no location: it has no address and no point on the map. */
        /* A stop a draft laid out with no point on the map: its address is
           searched as the window opens, so its list is there to choose from,
           and the name the draft gave it stays the stop's over the map's. */
        const draftedPlace = st.drafted && st.place && st.place.lat == null ? st.place : null;
        const where = placeSearch('scheduler-f-stopaddr', 'Location', st.place, (place, typed) => {
          setVal('scheduler-f-stopname', place ? draftedPlace?.name ?? place.name ?? '' : typed ?? '');
          picked = place ? { ...place } : (typed ? { ...placeOf({}), name: typed } : null);
        });
        where.classList.add('scheduler-dialog-grid__wide');
        const whereInput = where.querySelector('input[role="combobox"]');
        // Typing drops the place picked, and the name it brought.
        whereInput.addEventListener('input', () => {
          picked = null;
          setVal('scheduler-f-stopname', '');
        });
        whereInput.addEventListener('scheduler:place', e => {
          name.style.display = e.detail.place && !e.detail.saved ? '' : 'none';
        });
        name.querySelector('input').addEventListener('input', e => { whereInput.value = e.target.value; });
        const days = [];
        for (let d = from; d && to && d <= to && days.length < 31; d = dayAfter(d, 1)) days.push(d);
        /* On a leg of more than one day each time has its day beside it,
           Arrives and Leaves each a day and a time, the way an itinerary reads.
           The leave's day starts as the arrival's, or the next when the leave
           is earlier, and is moved for a stay of nights; it never falls before
           the arrival's. A one-day leg asks only the two times. */
        const dayOptions = days.map((d, n) =>
          [d, `Day ${n + 1} · ${parseISO(d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`]);
        const multi = days.length > 1;
        const arriveDay = multi ? selectField('scheduler-f-stopday', 'Arrives', st.date ?? from, dayOptions) : null;
        const leaveDay = multi ? selectField('scheduler-f-stopleaveday', 'Leaves', leaveDayOf(st, from) ?? from, dayOptions) : null;
        const arrive = timeField('scheduler-f-stoparrive', multi ? '\u00a0' : 'Arrives', st.arrive);
        const leaveAt = timeField('scheduler-f-stopleave', multi ? '\u00a0' : 'Leaves', st.leave);
        if (multi) {
          arrive.querySelector('input').setAttribute('aria-label', 'Arrival time');
          leaveAt.querySelector('input').setAttribute('aria-label', 'Leave time');
        }
        const dwell = selectField('scheduler-f-stopdwell', 'The wait counts as', st.dwell ?? 'on',
          [['on', 'On duty'], ['off', 'Off duty'], ['sleeper', 'Sleeper berth']]);
        dwell.classList.add('scheduler-dialog-grid__wide');
        grid.append(where, name, ...(multi ? [arriveDay, arrive, leaveDay, leaveAt] : [arrive, leaveAt]), dwell);
        host.replaceChildren(grid);
        if (multi) {
          const aDay = document.getElementById('scheduler-f-stopday');
          const lDay = document.getElementById('scheduler-f-stopleaveday');
          const aTime = document.getElementById('scheduler-f-stoparrive');
          const lTime = document.getElementById('scheduler-f-stopleave');
          let lDayPicked = !!(st.leaveDate && st.date && st.leaveDate > st.date);
          lDay.addEventListener('change', () => { lDayPicked = true; });
          // Until a leave day is picked, it follows the arrival and the two times.
          const follow = () => {
            const d = aDay.value;
            if (!lDayPicked) {
              const a = toMin(aTime.value), l = toMin(lTime.value);
              lDay.value = a != null && l != null && l < a ? (dayAfter(d, 1) <= to ? dayAfter(d, 1) : d) : d;
            } else if (lDay.value < d) lDay.value = d;
          };
          for (const input of [aDay, aTime, lTime]) input.addEventListener('input', follow);
          aDay.addEventListener('change', follow);
        }
        /* A new stop's wait, or a drafted one's, follows its times, after the
           leave day above has followed them, until it is picked: a night of 8
           hours or more is off duty, as route-figures.js reads one, and any
           other wait on duty. A saved stop keeps its own. */
        const dwellSelect = document.getElementById('scheduler-f-stopdwell');
        let dwellPicked = index !== null && !st.drafted;
        dwellSelect.addEventListener('change', () => { dwellPicked = true; });
        const dwellFollows = () => {
          if (dwellPicked) return;
          dwellSelect.value = RF.nightDwell({ from }, {
            arrive: val('scheduler-f-stoparrive') || null, leave: val('scheduler-f-stopleave') || null,
            date: document.getElementById('scheduler-f-stopday')?.value || st.date || from,
            leaveDate: document.getElementById('scheduler-f-stopleaveday')?.value || null,
          });
        };
        for (const id of ['scheduler-f-stoparrive', 'scheduler-f-stopleave', 'scheduler-f-stopday', 'scheduler-f-stopleaveday']) {
          const input = document.getElementById(id);
          input?.addEventListener('input', dwellFollows);
          input?.addEventListener('change', dwellFollows);
        }

        stopDone = () => {
          // Words left in the search and not picked name a stop with no location.
          const typedWhere = whereInput.value.trim();
          if (!picked && typedWhere) {
            picked = { ...placeOf({}), name: typedWhere,
              address: draftedPlace && typedWhere === draftedPlace.address ? typedWhere : null };
          }
          const typedName = val('scheduler-f-stopname') || null;
          const place = picked || typedName
            ? { ...(picked ?? placeOf({})), name: typedName ?? picked?.name ?? null } : null;
          // An empty dialog adds nothing, as in the other dialogs.
          if (!place && !val('scheduler-f-stoparrive') && !val('scheduler-f-stopleave')) {
            window.Rux?.modal?.close?.('scheduler-stop-modal');
            return;
          }
          const moved = !samePlace(place, st.place) || (place?.name ?? null) !== (st.place?.name ?? null);
          const next = {
            ...st, place,
            placeChanged: st.placeChanged || moved,
            arrive: val('scheduler-f-stoparrive') || null,
            leave: val('scheduler-f-stopleave') || null,
            date: document.getElementById('scheduler-f-stopday')?.value || st.date || from,
            leaveDate: document.getElementById('scheduler-f-stopleaveday')?.value || null,
            dwell: document.getElementById('scheduler-f-stopdwell')?.value || null,
            drafted: false, draftChanged: false,
          };
          if (index === null) r.list.push(next); else r.list[index] = next;
          /* The list is the order Save writes, so it is kept in time order: by
             day, and within a day by time where both stops have one; a stop
             with no time keeps its place among its day's. On a one-day leg a
             time before the group leaves the pickup is past midnight, so it
             sorts after the evening's and the leg stays one day. */
          const at = st => st.arrive || st.leave;
          const leaves = from === to ? toMin(val('scheduler-f-leave')) : null;
          const clockOf = st => window.SchedulerPastMidnight.forward([leaves, toMin(at(st))])[1];
          r.list.sort((x, y) => {
            const dx = x.date || from, dy = y.date || from;
            if (dx !== dy) return dx < dy ? -1 : 1;
            return at(x) && at(y) ? clockOf(x) - clockOf(y) : 0;
          });
          window.Rux?.modal?.close?.('scheduler-stop-modal');
          touch();
        };
        window.Rux?.modal?.open?.('scheduler-stop-modal');
        if (draftedPlace?.address) {
          whereInput.value = draftedPlace.address;
          whereInput.dispatchEvent(new Event('input', { bubbles: true }));
          setVal('scheduler-f-stopname', draftedPlace.name ?? '');
          whereInput.focus();
        }
      }

      // "4 h 03", "4 h" or "31 min", as the Summary writes a length of time.
      const hm = RF.hm;
      /* The drive on to the drop-off counts wherever Save writes a drop-off
         row: on every leg but a round trip with no stops, which is let off
         where it was picked up. A drop-off picked since the trip opened
         counts at once, before it has a row. */
      const dropCounts = () => !routeRound() || r.list.length > 0;
      /* The trip's figures, worked out by route-figures.js from the tab as it
         stands: when the bus leaves the yard, is spotted and is back, then
         each day's miles, drive, on duty and less rest on a leg of more than
         one day, then the whole leg's. */
      /* The longest wait on duty that, counted as sleeper berth, brings every
         stretch between rests inside the second-driver rule; null when no one wait does. The
         figures are worked out again with that wait changed, longest first. */
      function sleeperRest() {
        const model = routeModel();
        const clears = w => !RF.legFigures({ ...model,
          list: r.list.map(st => (st === w.stop ? { ...st, dwell: 'sleeper' } : st)) }).over;
        return r.list.filter(st => (st.dwell ?? 'on') === 'on')
          .map(st => ({ stop: st, wait: RF.waitOf(model, st) ?? 0 }))
          .filter(w => w.wait > 0).sort((x, y) => y.wait - x.wait)
          .find(clears) ?? null;
      }
      /* The nights on duty, 8 hours or more past midnight, that counted as
         off duty, as a night at a hotel is, bring every stretch inside the
         second-driver rule; empty when they do not. */
      function nightRests() {
        const model = routeModel();
        const nights = r.list.filter(st => (st.dwell ?? 'on') === 'on' && RF.nightDwell(model, st) === 'off');
        const off = new Set(nights);
        const clears = nights.length > 0 && !RF.legFigures({ ...model,
          list: r.list.map(st => (off.has(st) ? { ...st, dwell: 'off' } : st)) }).over;
        return clears ? nights.map(st => ({ stop: st, wait: RF.waitOf(model, st) ?? 0 })) : [];
      }
      function takeNightRests(nights) {
        for (const n of nights) n.stop.dwell = 'off';
        touch();
      }
      /* Taking the rest is the stop's window and each vehicle's window in one
         press: the wait counts as sleeper berth, and every vehicle on the leg
         needs a sleeper. */
      function takeSleeperRest(stop) {
        stop.dwell = 'sleeper';
        for (const b of editing?.fleet?.[r.leg] ?? []) {
          b.needs = needsObject(new Set([...needIds(b.needs), 'sleeper']));
        }
        drawFleet();
        touch();
      }
      function drawTotals() {
        const fig = RF.legFigures(routeModel());
        const { days, each, total } = fig;
        const yardOut = val('scheduler-f-depart'), spot = val('scheduler-f-spot'), yardBack = val('scheduler-f-return');
        /* The last day's weekday goes in End's label, so the time itself never
           wraps: a longer leg's last day, or the next day a one-day leg comes
           back on past midnight. */
        const lastDay = fig.backOn ? ` · ${parseISO(fig.backOn).toLocaleDateString(undefined, { weekday: 'short' })}` : '';
        const times = el('dl', 'scheduler-figures');
        for (const [label, time] of [['Start', yardOut], ['Spot', spot], [`End${lastDay}`, yardBack]]) {
          const box = el('div');
          // AM or PM in its own span, smaller, as the board writes its a and p.
          const said = time ? clock(time) : null;
          const ampm = said && / (AM|PM)$/.exec(said);
          const value = el('dd');
          if (ampm) value.append(said.slice(0, ampm.index), el('span', 'scheduler-figures__ampm', ampm[0]));
          else value.append(said ?? noFigure());
          box.append(el('dt', null, label), value);
          times.appendChild(box);
        }
        times.title = busSaid;
        /* Under them, each bus's Actual yard depart and Actual yard return,
           as Get from Samsara or the nightly run found them, a bus's number
           first where the leg has more than one; a leg with neither shows
           nothing here. */
        const legBuses = editing?.fleet?.[r.leg] ?? [];
        const actual = legBuses.filter(b => b.yardDepartAt || b.yardReturnAt).map(b => {
          const row = el('dl', 'scheduler-figures');
          const at = iso => {
            const said = iso ? clock(Road.clockOf(Date.parse(iso))) : '—';
            const value = el('dd');
            const ampm = / (AM|PM)$/.exec(said);
            if (ampm) value.append(said.slice(0, ampm.index), el('span', 'scheduler-figures__ampm', ampm[0]));
            else value.append(said);
            return value;
          };
          const boxes = [['Actual yard depart', at(b.yardDepartAt)], ['Actual yard return', at(b.yardReturnAt)]];
          if (legBuses.length > 1) boxes.unshift(['Bus', el('dd', null, panelIndex.buses.get(b.busId)?.number ?? '—')]);
          for (const [label, value] of boxes) {
            const box = el('div');
            box.append(el('dt', null, label), value);
            row.appendChild(box);
          }
          return row;
        });
        /* A leg of more than one day has a row a day and a Total, under a Day
           column; a one-day leg is its one row of figures, with no Day column. */
        const rows = days ? [...each.map((cells, n) => [String(n + 1), ...cells]), ['Total', ...total]] : [[...total]];
        // Each day's miles, for the quote calculator the trip opens, and the
        // leg's total, which Estimated miles follows.
        r.dayMiles = fig.dayMiles;
        r.legMiles = fig.legMiles;
        /* What the Route tab's Done asks of this leg: every place found, the
           times in and in order, and the drives measured. */
        r.check = {
          status: fig.status,
          pickup: r.pickupPlace?.lat != null,
          // A round trip's drop-off is its pickup, so the pickup answers for it.
          drop: routeRound() || r.dropPlace?.lat != null,
          unlocated: r.list.filter(st => !located(st)).length,
          unmeasured: fig.unmeasured,
        };
        drawDone();
        // The quote is priced from the miles a day, so its lines and price follow them.
        if (followLines()) refreshDirty();
        const table = el('table', 'rux--data-table rux--data-table--xs');
        const head = el('tr');
        for (const h of [...(days ? ['Day'] : []), 'Miles', 'Drive', 'On duty', 'Less rest']) {
          const th = el('th');
          th.scope = 'col';
          th.appendChild(el('div', 'rux--table-header-label', h));
          head.appendChild(th);
        }
        const thead = el('thead');
        thead.appendChild(head);
        const tbody = el('tbody');
        rows.forEach((cells, i) => {
          const tr = el('tr', days && i === rows.length - 1 ? 'scheduler-route-total' : null);
          /* A figure not known is the muted dash, and a day short of its
             times is one too: the foot says which days need them. */
          for (const c of cells) {
            const td = el('td');
            td.append(c === '—' || c === 'Needs times' || c === 'Check times' ? noFigure() : c);
            tr.appendChild(td);
          }
          tbody.appendChild(tr);
        });
        table.append(thead, tbody);
        const wrap = el('div', 'rux--data-table-content scheduler-summary__table');
        wrap.appendChild(table);
        summary.replaceChildren(times, ...actual, wrap, summaryFoot);

        /* On duty waits on the times: one quiet line naming the days short
           of them, or the leg's on a one-day leg. */
        const short = status => {
          const n = days ? each.flatMap((c, d) => (c.status === status ? [d + 1] : [])) : total.status === status ? [0] : [];
          if (!n.length) return null;
          const on = days ? ` on day${n.length > 1 ? 's' : ''} ${n.length > 1 ? `${n.slice(0, -1).join(', ')} and ${n.at(-1)}` : n[0]}` : '';
          return `${status === 'Needs times' ? 'Times needed' : 'Times out of order'}${on}`;
        };
        timesBox.replaceChildren(...['Needs times', 'Check times'].map(short).filter(Boolean).map(words => {
          const line = el('div', 'scheduler-fuel__on');
          line.append(svgUse('#m-schedule', '16', '0 0 32 32'), el('span', null, words));
          return line;
        }));

        /* The fuel card: a line saying the trip has one, or, past the office's
           miles or days, the offer to add one. */
        const { legMiles, legDays } = fig;
        const past = legMiles > fuelLimits.miles || legDays > fuelLimits.days;
        if (editing?.fuelCard) {
          const line = el('div', 'scheduler-fuel__on');
          line.append(svgUse('#m-credit_card-fill', '16', '0 0 32 32'), el('span', null, 'Fuel card needed'));
          fuelBox.replaceChildren(line);
        } else if (past) {
          const said = [legMiles > fuelLimits.miles ? `${legMiles} miles` : null,
            legDays > fuelLimits.days ? `${legDays} days` : null].filter(Boolean).join(' and ');
          fuelBox.replaceChildren(notice('info', 'Fuel card', `At ${said}, this trip is past the office's fuel card limits.`,
            { label: 'Add fuel card', onClick: () => setFuelCard(true) }));
        } else fuelBox.replaceChildren();

        /* A second driver, by the rule the Second driver line quotes: over
           10 hours driving, or over 15 on duty less rest, between any two
           rests, as route-figures.js parts them. Until
           every bus on the leg has its co-driver seat on, the Summary says so
           and offers the seats, and where some buses have theirs it says how
           many do not; the Buses tab holds the seat, and the quote follows
           it. */
        const { over } = fig;
        const legFleet = editing?.fleet?.[r.leg] ?? [];
        const without = legFleet.filter(b => b.seats?.['co-driver'] && !b.seats['co-driver'].on).length;
        const some = coDrivers(r.leg) > 0
          ? ` ${without} of the leg's ${legFleet.length} buses ${without === 1 ? 'has' : 'have'} no co-driver seat.` : '';
        if (over && (coDrivers(r.leg) === 0 || without > 0)) {
          const why = over.drive > 600 ? `${hm(over.drive)} driving` : `${hm(over.span - over.rest)} on duty less rest`;
          /* A NIGHT OFF DUTY COMES FIRST, then the sleeper rest, where either
             is enough. Nights at a stop left on duty, counted as off duty as a
             hotel night is, are offered together; else the leg's longest wait
             on duty, tried as sleeper berth. When the rule then passes, the
             notice names the stops and offers the rest before the co-driver;
             when neither does, as on a day of too much driving, the co-driver
             is the one offer. */
          const nights = nightRests();
          const rest = nights.length ? null : sleeperRest();
          const coDriver = { label: 'Add co-driver', onClick: () => setCoDrivers(r.leg, true) };
          const where = n => n.stop.place?.name || 'the stop';
          const nightWords = nights.length === 1 ? `the night at ${where(nights[0])}`
            : `the ${nights.length} nights at ${[...new Set(nights.map(where))].join(' and ')}`;
          driverBox.replaceChildren(nights.length
            ? notice('warning', 'Second driver',
              `At ${why}${fig.stretches > 1 ? ' between rests' : ''}, this trip needs a second driver, or ${nightWords} counted off duty.${some}`,
              [{ label: 'Count as off duty', onClick: () => takeNightRests(nights) }, coDriver])
            : rest
            ? notice('warning', 'Second driver',
              `At ${why}${fig.stretches > 1 ? ' between rests' : ''}, this trip needs a second driver, or the ${hm(rest.wait)} at ${rest.stop.place?.name || 'the stop'} as rest in the sleeper.${some}`,
              [{ label: 'Rest in the sleeper', onClick: () => takeSleeperRest(rest.stop) }, coDriver])
            : notice('warning', 'Second driver', `At ${why}${fig.stretches > 1 ? ' between rests' : ''}, this trip needs a second driver.${some}`, coDriver));
        } else driverBox.replaceChildren();
        summaryFoot.hidden = !timesBox.hasChildNodes() && !driverBox.hasChildNodes() && !fuelBox.hasChildNodes();
      }

      // The list has no title: its days head it, and a split trip's leg switch names the leg.
      const routeSection = section(null, stopsBody);
      // The kept times go last, so the Summary is the tab's first section.
      // Its tile is a frame of its own, so app.css draws no rule after it.
      const summarySection = section('Summary', summaryLayer);
      summarySection.classList.add('scheduler-panel-section--summary');
      panelRoute.append(
        summarySection,
        routeSection,
        routeBox,
        doneSection('route'),
      );
      drawStops();
      drawTimeline();
      // Kept, so the quote calculator can wait for the Summary's last miles.
      r.drivesFound = fillMissingDrives();

      document.getElementById('scheduler-f-leave')?.addEventListener('input', recalcSpot);
      document.getElementById('scheduler-f-spot')?.addEventListener('input', () => {
        spotTyped = !!val('scheduler-f-spot');
        if (spotTyped) recalcYard(); else recalcSpot();
      });
      document.getElementById('scheduler-f-endtrip')?.addEventListener('input', recalcReturn);
      // A name typed by hand belongs to whichever place it names.
      document.getElementById('scheduler-f-pickupname')?.addEventListener('input', () => {
        r.pickupPlace = named(r.pickupPlace, val('scheduler-f-pickupname') || null);
        // A round trip's drop-off follows the pickup.
        if (dropBox.hidden) followPickup();
        drawTimeline();
      });
      document.getElementById('scheduler-f-dropname')?.addEventListener('input', () => {
        r.dropPlace = named(r.dropPlace, val('scheduler-f-dropname') || null);
        drawTimeline();
      });
      // The summary and the time's label follow every field, after the handlers above.
      pickupFields.addEventListener('input', drawTimeline);
      dropFields.addEventListener('input', drawTimeline);
      // The tiles at the two ends show what their dialogs now hold.
      routeEndsClosed = () => { drawTimeline(); drawStops(); };
      // The days and the Summary's rows follow the trip's dates, picked or typed.
      for (const id of ['scheduler-f-start', 'scheduler-f-end']) {
        document.getElementById(id)?.addEventListener('change', () => { drawTimeline(); drawStops(); });
      }
      document.getElementById('scheduler-f-way')?.addEventListener('change', () => {
        /* A drop-off that only copied the pickup, as a round trip's does, is
           let go when the leg becomes one way, which ends elsewhere. */
        if (oneWayType() && r.pickupPlace && samePlace(r.dropPlace, r.pickupPlace)) {
          setVal('scheduler-f-dropname', '');
          setVal('scheduler-f-dropoff', '');
          r.dropPlace = null;
          r.backDrive = r.backMiles = null;
          r.dropDrive = r.dropMiles = null;
          recalcReturn();
          drawStops();
        }
        if (!dropBox.hidden !== !letOffAtPickup()) showDrop(!letOffAtPickup());
        drawTimeline();
      });

      /* A SPLIT TRIP'S PICKUP LEG MIRRORS ITS DROP-OFF LEG: the group is
         picked up where it was let off and taken back to where it started.
         A pickup leg with neither place yet takes both from the drop-off leg
         as saved, and Save keeps them; either can be changed first. */
      const hasPlace = p => !!(p && (p.name || p.address));
      if (!creating && isBackKey(r.leg) && splitNow() && !hasPlace(r.pickupPlace) && !hasPlace(r.dropPlace)) {
        const out = stopsOfLeg(trip, 'outbound').stops;
        const outPickup = placeOf(out.find(x => x.type === 'pickup'));
        const outDrop = placeOf(out.filter(x => x.type === 'stop').at(-1));
        if (hasPlace(outPickup) && hasPlace(outDrop)) {
          setVal('scheduler-f-pickupname', outDrop.name ?? '');
          setVal('scheduler-f-pickup', outDrop.address ?? '');
          setVal('scheduler-f-dropname', outPickup.name ?? '');
          setVal('scheduler-f-dropoff', outPickup.address ?? '');
          r.pickupPlace = { ...outDrop };
          r.dropPlace = { ...outPickup };
          drawTimeline();
          drawStops();
          (async () => {
            await Promise.all([driveOutFrom(r.pickupPlace), driveBackFrom(r.dropPlace)]);
            drawTimeline();
            refreshDirty();
            remeasure();
          })();
        }
      }
    }

    /* ── Billing ── */
    panelBilling.replaceChildren();
    {
      // Billing renders on a new trip too, because `readForm` needs its ids on
      // the panel.
      /* The milestones are the Billing tile's rows, below. The contract is
         its one row, with the day it was signed and a note, or null. */
      editing.contract = contractSignedOf(trip)
        ? { on: trip.contract_signed_on ?? null, note: trip.contract_note ?? null } : null;

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

      /* Payments are saved by `id`, not replaced: new rows insert, changed rows
         update, removed rows delete, so a failure touches only its own row.
         `position` is the row's place in the list, since the list is ordered by it.
         The Billing tile is a render of `payPending`, which is the array Save diffs. */
      payPending = (trip.trip_payments || [])
        .slice().sort((x, y) => (x.position ?? 0) - (y.position ?? 0))
        .map(p => ({ id: String(p.id), method: p.method ?? null, amount: p.amount,
                     date: p.date ?? null, ref: p.ref ?? null }));

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
      ].filter(([rung]) => window.SchedulerBilling.confirmWhen.includes(rung)
        && (rung !== 'contract_signed' || stepOn('contractSigned'))
        && (rung !== 'po_received' || stepOn('poReceived')))
        .map(([, words]) => words);
      const wouldConfirm = WOULD_CONFIRM.length
        ? `${WOULD_CONFIRM.length > 1 ? `${WOULD_CONFIRM.slice(0, -1).join(', ')} or ${WOULD_CONFIRM.at(-1)}` : WOULD_CONFIRM[0]} confirms it.`
        : 'Payment in full confirms it.';
      const cap = t => t.charAt(0).toUpperCase() + t.slice(1);

      const statusLine = el('div', 'scheduler-billing-status');
      const figures = el('dl', 'scheduler-figures');
      const summaryNote = el('p', 'rux--form__helper-text scheduler-summary__note');
      const drawSummary = () => {
        // The PO amount is the sum of the PO rows, so coverage counts every PO.
        const { quoted, price, paid, poAmount, poReceived: poOn, rung, confirmed } = billingNow();
        const remaining = Math.max(0, price - paid);
        const shortfall = Math.max(0, remaining - poAmount);

        const [rungLabel, rungTone] = STATUS_LABEL[rung];

        /* The status line: Carbon's icon indicator for whether the trip is
           confirmed, and the billing status as a tag at the end. */
        const state = el('div', 'rux--icon-indicator');
        const mark = svgUse(confirmed ? '#m-check_circle-fill' : '#m-motion_photos_on', '20', '0 0 32 32');
        mark.setAttribute('class', confirmed ? 'rux--icon-indicator--succeeded' : 'rux--icon-indicator--not-started');
        state.append(mark, confirmed ? 'Confirmed' : 'Not confirmed');
        const status = el('span', `rux--tag rux--layout--size-sm ${rungTone}`, rungLabel);
        status.title = `Billing status: ${rungLabel}`;
        statusLine.replaceChildren(state, status);
        // Quoted, Paid and Balance side by side, as the Route summary's times are.
        const figure = (label, value) => {
          const box = el('div');
          box.append(el('dt', null, label), el('dd', null, value));
          return box;
        };
        figures.replaceChildren(
          figure('Quoted', quoted === null ? '—' : usd(quoted)),
          figure('Paid', usd(paid)),
          figure('Balance', quoted === null ? '—'
            : (quoted - paid < 0 ? `−${usd(paid - quoted)}` : usd(quoted - paid))),
        );
        /* Under the status, what is left. Unconfirmed, what would confirm the
           trip. Confirmed by a PO, what the POs and payments leave uncovered,
           since a PO confirms the trip whatever its amount, counted as
           `billingStatus` counts it:

               shortfall = max(0, (quoted - paid) - po_amount)

           Otherwise the status tag already names what did, and it is hidden. */
        summaryNote.textContent = !confirmed ? cap(wouldConfirm)
          : !poOn ? ''
          : price <= 0 ? 'No quoted price for the PO to cover.'
          : shortfall <= 0 ? 'The balance is covered.'
          : `${usd(shortfall)} uncovered. Add a PO or payment.`;
        summaryNote.hidden = !summaryNote.textContent;
      };
      /* THE SUMMARY IS THE ROUTE TAB'S TILE, and opens the tab as that one
         does: the money as figures, then at its foot the confirmation and
         billing status and under them what is left. */
      const summaryTile = el('div', 'rux--tile scheduler-summary');
      const summaryFoot = el('div', 'scheduler-summary__foot');
      summaryFoot.append(statusLine, summaryNote);
      summaryTile.append(figures, summaryFoot);
      const summaryLayer = el('div', 'rux--layer-two');
      summaryLayer.appendChild(summaryTile);
      panelBilling.appendChild(section('Summary', summaryLayer));

      /* THE QUOTE'S LINES, over the price they add up to. With any line the
         price is their total; a trip saved with a price and no line keeps it,
         the quote prints it as one line, and its first rental starts
         from it. The price is written
         only when the total moves, so opening a trip whose price differs
         from its lines shows the difference instead of arming Save to undo it. */
      linePending = editing.linesLoaded && !editing.creating
        ? editing.lines.map(l => ({
          id: String(l.id), kind: l.kind || 'other', leg: l.leg ?? null,
          item: l.item ?? null, description: l.description ?? null,
          quantity: l.quantity ?? null, cost: l.cost ?? null, cost_typed: !!l.cost_typed,
          miles: l.miles ?? null, dead_miles: l.dead_miles ?? null,
          rate: l.rate == null ? null : Number(l.rate),
        }))
        : [];
      /* A saved line is priced on what it was saved with, so opening a trip
         reprices nothing: its basis is today's, and only a change moves it.
         A rental saved with dead miles has them on, and dead miles that
         differ from the route's were typed. */
      for (const l of linePending) {
        const f = legFigures(l.leg);
        l.deadOn = l.kind === 'rental' && Number(l.dead_miles) > 0;
        l.deadTyped = l.deadOn && Math.round(l.dead_miles) !== Math.round(f.dead);
        l.basis = JSON.stringify(lineBasis(l));
      }
      editing.coBefore = null;
      editing.reliefBefore = null;
      askQuoteRates();
      // The quote's lines, a row each in one card as the Billing card's
      // steps are, with Add line under it.
      const lineLayer = el('div', 'rux--layer-two');
      const lineCard = el('div', 'rux--tile scheduler-billing-steps');
      lineLayer.appendChild(lineCard);
      const lineList = rowList();
      // Said as a warning where a saved trip's lines and its price have parted.
      const linesParted = el('div');
      // The dead-mile offer, over the lines it adds to.
      const deadBox = el('div', 'scheduler-dead-offer');
      deadBox.hidden = true;
      /* The price is the lines' total, or a lineless trip's saved price,
         which the Summary and the empty quote's tile show; the lines set
         it. The field stays on the page, hidden, since Save reads it. */
      const quotedField = moneyField('scheduler-f-quoted', 'Quoted price', trip.quoted_price);
      const quotedRow = el('div');
      quotedRow.hidden = true;
      quotedRow.appendChild(quotedField);
      const quotedInput = quotedField.querySelector('input');
      /* The price reads as money, as the Balance above it does: $1,669, with
         cents only when it has them. `money` reads the sign and commas back, so
         what is saved is still the number. */
      const showQuoted = () => {
        const n = money(quotedInput.value);
        if (n !== null) quotedInput.value = `$${n.toLocaleString('en-US',
          { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;
      };
      showQuoted();
      quotedInput.addEventListener('change', showQuoted);
      // The total at the last draw; the first draw, as the trip opens, only
      // records it.
      let totalBefore = null;
      /* A split trip starts with a rental per leg, anything else with one,
         sharing the typed price between them to the cent. The empty quote's
         tile starts from these. */
      quoteSeed = () => {
        const legs = splitNow() ? ['outbound', 'return'] : [null];
        const quoted = money(quotedInput.value);
        const share = quoted === null ? null : round2(quoted / legs.length);
        return legs.map((leg, i) => {
          const legTotal = quoted === null ? null
            : (i < legs.length - 1 ? share : round2(quoted - share * (legs.length - 1)));
          const cost = legTotal === null ? null : round2(legTotal / legBuses(leg));
          return { kind: 'rental', leg, item: 'Bus Rental', description: null,
            quantity: null, cost, cost_typed: cost !== null, miles: null, dead_miles: null, rate: null };
        });
      };
      /* THE DEAD-MILE DISCOUNT IS OFFERED PAST THE OFFICE'S LIMIT, as the Route
         tab offers a fuel card: a leg whose drive from the yard and back is
         over the Settings page's dead-mile limit, with a rental the calculator
         prices and no dead miles counted yet. Taking it leaves the rental at
         the full rate on every mile and adds a Discount line for what the
         dead-miles rate takes off, a bus at a time, as the calculator's Show
         dead miles as a discount does, so the customer reads the discount. */
      const DEAD_DISCOUNT = 'Dead miles discount.';
      const deadOffers = () => (deadMilesLimit == null ? [] : (splitNow() ? ['outbound', 'return'] : [null]).map(leg => {
        const onLeg = l => !splitNow() || (l.leg ?? 'outbound') === (leg ?? 'outbound');
        const rental = linePending.find(l => l.kind === 'rental' && onLeg(l));
        const dead = legFigures(leg).dead;
        if (!rental || rental.cost_typed || rental.deadOn || !(dead > deadMilesLimit)) return null;
        if (linePending.some(l => l.kind === 'discount' && l.description === DEAD_DISCOUNT && onLeg(l))) return null;
        const b = lineBasis(rental);
        const q = window.Rux?.quote;
        if (!q || !quoteRates || b.rate == null || !b.days || !(b.miles > 0)) return null;
        const full = q.tripQuote({ miles: b.perDay, rate: b.rate, dead: 0 }, quoteRates.named).amount;
        const less = q.tripQuote({ miles: b.perDay, rate: b.rate, dead }, quoteRates.named).amount;
        const off = full == null || less == null ? 0 : round2(full - less);
        return off > 0 ? { leg, dead, off } : null;
      }).filter(Boolean));
      const drawDeadOffer = () => {
        deadBox.replaceChildren(...deadOffers().map(o => notice('info', 'Dead miles',
          `At ${Math.round(o.dead)} dead miles${o.leg ? ` on the ${o.leg === 'return' ? 'pickup' : 'drop-off'}` : ''}, this trip is past the office's limit of ${deadMilesLimit}.`,
          // As a list, so the action stands under the words and leaves them the panel's width.
          [{ label: `Add the discount, ${usdCents(o.off)} a bus`, onClick: () => {
            linePending.push({ kind: 'discount', leg: o.leg, item: lineKind('discount').item || null, description: DEAD_DISCOUNT,
              quantity: legBuses(o.leg), cost: -o.off, cost_typed: true, miles: null, dead_miles: null, rate: null });
            drawLines();
            refreshDirty();
          } }])));
        deadBox.hidden = !deadBox.childElementCount;
      };
      const drawLines = () => {
        if (linesLive) syncLines();
        const held = window.SchedulerQuoteLines.settled(billingNow());
        /* One card of the lines, a row each as the Billing card has a row
           a step, each opening that line's window, and the total in the
           card under the last where there is more than one; Add line under
           the card. With none, one row says so and starts the quote from
           the trip's rentals. */
        const rows = linePending.map((l, i) => quoteLineRow(l, i, held));
        if (linePending.length > 1) {
          const sum = el('div', 'scheduler-quote-total');
          sum.append(el('span', null, 'Total'), el('span', 'scheduler-item__much', usdCents(linesTotal())));
          rows.push(sum);
        }
        if (!linePending.length) {
          // A trip saved with a price and no line shows the price, which its rental starts from.
          const price = money(quotedInput.value);
          const from = splitNow() ? 'Starts from the drop-off and pickup' : 'Starts from the bus rental';
          const row = quoteRow({ name: 'No quote lines yet', none: true,
            meta: price === null ? from : `${from} at this price`, much: price === null ? '' : usdCents(price),
            title: ['No quote lines yet', price === null ? null : usdCents(price)].filter(Boolean).join(', ') });
          row.id = 'scheduler-f-quoteopen';
          row.setAttribute('aria-label', 'Start the quote');
          row.addEventListener('click', startQuote);
          rows.push(row);
        }
        lineCard.replaceChildren(...rows);
        lineList.body.replaceChildren(listAddRow({ label: 'Add line', id: 'scheduler-f-lineadd', onClick: () => openLineDialog(null) }).li);


        const total = linesTotal();
        if (linePending.length && totalBefore !== null && total !== totalBefore) {
          quotedInput.value = String(total);
          showQuoted();
          drawSummary();
        }
        totalBefore = total;
        quotedInput.readOnly = linePending.length > 0;
        /* With lines the price is their total. A trip saved with the two
           apart opens that way, and says so as a warning, because the quote
           prints the lines and their sum while Billing counts the price. */
        const quoted = money(quotedInput.value);
        const parted = linePending.length > 0 && quoted !== null && quoted !== total;
        linesParted.replaceChildren(...(parted ? [note('warning', 'The lines and the quoted price differ',
          `The lines add up to ${usdCents(total)} and the quoted price is ${usdCents(quoted)}. Change a line and the price becomes their total.`)] : []));
      };
      redrawLines = drawLines;
      // A price a draft fills in shows on the tile of a trip with no line.
      quotedInput.addEventListener('input', () => { if (!linePending.length) drawLines(); });
      redrawDeadOffer = drawDeadOffer;
      /* THE QUOTE HEADING'S MENU. Calculator opens the quote calculator beside
         the week, filled from this trip, as the Calculator shortcut does: the
         lines are what it sets. Copy for QuickBooks copies the description the
         office pastes into its QuickBooks estimate, the block alone for the
         reason `qbDescription` gives; a browser that refuses the clipboard
         says so, because a copy that goes quiet is worse than one that
         reports a failure. */
      const quoteMenu = menuTrigger('scheduler-f-quotemenu', 'Quote options');
      const copyForQuickBooks = async () => {
        try {
          await navigator.clipboard.writeText(qbDescription());
          toast('success', 'Copied for QuickBooks', 'Paste it into the estimate description.');
        } catch {
          toast('error', 'Could not copy that', 'The browser would not reach the clipboard.');
        }
      };
      quoteMenu.addEventListener('click', () => openItemsMenu(quoteMenu, [
        { label: 'Calculator', run: () => openCalculator(null) },
        { label: 'Copy for QuickBooks', run: copyForQuickBooks },
      ], 'Quote options'));
      const linesBody = el('div', 'rux--stack-vertical rux--stack-scale-3');
      linesBody.append(deadBox, lineLayer, lineList.list, linesParted, quotedRow);
      panelBilling.appendChild(section('Quote', linesBody, quoteMenu));

      /* QUOTE SENT: the price the customer was sent, and the day, kept for
         Save by one press, and the Billing tile's first row. The quote lines
         can move after it, and a warning under them then says by how much,
         with the offer to mark the new price sent. Once the contract is
         signed, it is the price they signed. */
      const markSent = price => {
        editing.quoteSent = price == null ? null : { price: round2(price), on: iso(new Date()) };
        refreshDirty();
      };
      // Whole dollars unless there are cents, as the summary's figures read.
      const sentPrice = n => (round2(n) % 1 ? usdCents(n) : usd(n));
      const sentWarn = el('div');
      linesBody.insertBefore(sentWarn, quotedRow);
      let drawBillingList = () => {};
      let sentDrawn = '';
      redrawQuoteSent = () => {
        const now = money(quotedInput.value);
        const sent = editing?.quoteSent;
        const signed = !!contractNow();
        const key = JSON.stringify([now, sent, signed]);
        if (sentDrawn === key) return;
        sentDrawn = key;
        const diff = sent && now != null ? round2(now - sent.price) : 0;
        sentWarn.hidden = !diff;
        sentWarn.replaceChildren(...(diff ? [notice('warning', 'The quote changed',
          `Now ${sentPrice(now)}, ${sentPrice(Math.abs(diff))} ${diff > 0 ? 'more' : 'less'} than the customer ${signed ? 'signed at' : 'was sent'}.`,
          { label: `Mark ${sentPrice(now)} sent`, onClick: () => markSent(now) })] : []));
        drawBillingList();
      };
      redrawQuoteSent();

      /* The trip's miles, both legs together, beside the quote. Left blank,
         the estimate follows the route, whose miles the field shows as its
         placeholder and Save writes; a saved figure that is the stops' own sum
         opens blank, as following. The quote lines price from a typed one only
         while the route has no miles. */
      const stopMiles = (trip.trip_stops || []).reduce((n, st) => n + (Number(st.miles) || 0), 0);
      editing.estFollowed = trip.est_miles == null || (stopMiles > 0 && Math.abs(trip.est_miles - stopMiles) < 1);
      const miles = pair(
        moneyField('scheduler-f-estmiles', 'Estimated miles', editing.estFollowed ? null : trip.est_miles),
        moneyField('scheduler-f-actmiles', 'Actual miles', trip.actual_miles),
      );
      /* Get from Samsara, in the heading's menu, asks the samsara-miles Edge
         Function how far each bus went by its odometer, who drove it and
         when it reached each leg's pickup, on the trip as last saved. It puts
         the farthest bus's total in Actual miles, each seated driver it saw in
         their own field and each arrival on its bus, for Save to write. A trip not yet saved has nothing to read, so has no menu. */
      /* The trip's two figures in a tile. Each bus's tile is under Driver pay,
         8px apart as a list's tiles are. */
      const milesBody = el('div', 'rux--stack-vertical rux--stack-scale-3');
      const seatMilesBox = el('div', 'rux--stack-vertical rux--stack-scale-3');
      const samsaraOut = el('div', 'rux--stack-vertical rux--stack-scale-2');
      milesBody.append(fieldTile(miles));
      /* What Samsara says stands under the two fields only while it holds
         something, since an empty stack still takes its gap, and a stack's
         display outranks `hidden`. */
      const placeMilesParts = () => {
        if (samsaraOut.hasChildNodes()) milesBody.append(samsaraOut);
        else samsaraOut.remove();
      };
      const paySection = section('Driver pay', seatMilesBox);

      /* CLOSED, the end of the tab once the trip is back: close-out.js's list
         read off the trip with this tab's miles and pay as typed, so a field
         filled here counts before Save. Closed when nothing is left. */
      const closedBox = el('div', 'scheduler-done');
      const closedSection = section(null, closedBox);
      const NEEDS = { bus: 'a bus on every leg', driver: 'a driver in every seat', miles: 'actual miles',
        pay: "each driver's pay", invoice: 'an invoice', balance: 'the balance paid' };
      const drawClosed = () => {
        const CloseOut = window.SchedulerCloseOut;
        closedSection.hidden = !CloseOut?.isBack(trip);
        if (closedSection.hidden) return;
        const typed = new Map((editing?.fleet ? fleetLegs().flatMap(leg => editing.fleet[leg]) : [])
          .flatMap(b => ROLES.map(r => b.seats[r.role]).filter(x => x.rowId).map(x => [String(x.rowId), x.pay])));
        const actual = money(document.getElementById('scheduler-f-actmiles')?.value ?? '');
        const asked = CloseOut.asks({ ...trip, actual_miles: actual,
          trip_assignments: (trip.trip_assignments || []).map(a => ({ ...a, trip_drivers: (a.trip_drivers || []).map(d =>
            (typed.has(String(d.id)) ? { ...d, pay: typed.get(String(d.id)) } : d)) })) });
        closedBox.classList.toggle('scheduler-done--on', !asked.length);
        if (!asked.length) {
          const head = el('p', 'scheduler-done__head');
          head.append(svgUse('#m-check_circle-fill', '16', '0 0 32 32'), el('span', null, 'Closed'));
          closedBox.replaceChildren(head);
        } else {
          closedBox.replaceChildren(el('p', 'rux--form__helper-text',
            `Closes once it has ${asked.map(id => NEEDS[id]).join(', ')}.`));
        }
      };
      let samsaraFound = null;
      const SAMSARA_WHY = {
        'not-in-samsara': 'not in Samsara', 'other-trip': 'on another trip then',
        'not-finished': 'not back yet', 'no-readings': 'no readings',
      };
      const seatName = id => {
        const d = panelIndex?.driversById?.get(id);
        return d?.short_name || d?.name || 'A driver';
      };
      const droveName = d => (d.driver_id ? seatName(d.driver_id) : roadShort(d.name));
      const busFound = busId => samsaraFound?.buses.find(b => b.bus_id === busId) ?? null;
      // A bus's answer on a leg, named by the leg's id, or its old word while it has no id.
      const legFound = (busId, leg) => busFound(busId)?.legs.find(l => (l.leg_id ? l.leg_id === leg : l.leg === wordOfLeg(leg))) ?? null;
      /* Who Samsara saw drive a bus on a leg, or null when it could not say:
         the leg's own answer, or the bus's where it is on that leg alone. */
      const droveOn = (busId, leg) => legFound(busId, leg)?.drivers
        ?? (busFound(busId)?.legs.length === 1 && legFound(busId, leg) ? busFound(busId).drivers : null);
      const mi = n => `${Number(n).toLocaleString()} mi`;

      /* DRIVER PAY: a tile per bus and leg, titled with the bus and its
         odometer miles, and in it each filled seat's miles and pay, kept on
         the seat. The Driver seat's pay says whether the bus reached the
         pickup on time, which earns that driver the on-time pay. Under the fields, the drivers' total and how
         far it is from the bus's odometer, which a driver who did not log in,
         or logged into another bus, pulls apart. Then where Samsara and the
         seats differ: who drove the bus the trip does not seat, and who the
         trip seats that Samsara never saw in it. The Buses tab is where a
         seat is put right. Under the bus's name, when it reached the leg's
         pickup, and whether that was on time, which earns the Driver seat
         its on-time pay. */
      const pickupOf = (b, leg) => {
        if (!b.pickupAt) return { line: null, tag: null };
        const at = Date.parse(b.pickupAt);
        const late = Road.pickupLate(Road.stopsOf(trip, leg)[0]?.due ?? null, at);
        const line = el('p', 'rux--form__helper-text', `Reached the pickup at ${hhmm(Road.clockOf(at), true)}`);
        let tag = null;
        if (late != null) {
          tag = el('span', `rux--tag rux--layout--size-sm rux--tag--sm ${late ? 'rux--tag--warm-gray' : 'rux--tag--green'}`);
          tag.append(el('span', 'rux--tag__label', late ? `${late} min late` : `On time, $${Road.ON_TIME_PAY}`));
        }
        return { line, tag };
      };
      const drawSeatMiles = () => {
        if (!editing?.fleet) return;
        const many = fleetLegs().length > 1;
        const groups = [];
        for (const leg of fleetLegs()) {
          editing.fleet[leg].forEach((b, i) => {
            const seats = ROLES.map(r => ({ role: r.role, seat: b.seats[r.role] })).filter(x => seatFilled(x.seat));
            const found = b.busId ? legFound(b.busId, leg) : null;
            const pickup = pickupOf(b, leg);
            if (!seats.length && !found && !pickup.line) return;
            const bus = b.busId ? panelIndex?.buses?.get(b.busId) : null;
            const name = `${bus ? vehicleName(bus) : 'No bus yet'}${many ? `, ${legTitle(leg).toLowerCase()}` : ''}`;
            const odometer = found?.miles ?? null;
            // The tile's title line, as a Buses tile's: the bus, and its miles or why none.
            const head = el('div', 'scheduler-item__line');
            head.appendChild(el('span', 'scheduler-item__name', name));
            if (found) head.appendChild(el('span', 'scheduler-item__much',
              odometer != null ? mi(odometer) : SAMSARA_WHY[found.note] ?? 'no miles'));
            const group = el('div', 'rux--stack-vertical rux--stack-scale-4');
            const after = el('div', 'rux--stack-vertical rux--stack-scale-2');
            const total = el('p', 'rux--form__helper-text');
            const notes = [];
            // The total, once there is a figure, and only beside a second seat or the odometer.
            const drawTotal = () => {
              const figures = seats.map(x => x.seat.miles).filter(n => n != null);
              const shown = figures.length > 0 && (seats.length > 1 || odometer != null);
              const sum = figures.reduce((n, m) => n + m, 0);
              const off = odometer == null ? '' : sum === odometer ? ', the same as the odometer'
                : `, ${Math.abs(sum - odometer).toLocaleString()} ${sum > odometer ? 'more' : 'fewer'} than the odometer`;
              total.textContent = `Drivers' total: ${mi(sum)}${off}`;
              if (shown) after.prepend(total);
              else total.remove();
              if (after.hasChildNodes()) group.append(after);
              else after.remove();
            };
            // Each seat's miles under its driver's name, and beside them its pay.
            const fields = seats.map(({ role, seat }) => {
              const field = moneyField(`scheduler-f-seatmiles-${leg}-${i}-${role}`, seatName(seat.driverId), seat.miles);
              const input = field.querySelector('input');
              input.inputMode = 'numeric';
              // The column holds whole miles, none below zero.
              input.addEventListener('input', () => {
                const n = money(input.value);
                seat.miles = n == null ? null : Math.max(0, Math.round(n));
                drawTotal();
              });
              const payField = moneyField(`scheduler-f-seatpay-${leg}-${i}-${role}`, 'Pay', seat.pay);
              const payInput = payField.querySelector('input');
              if (role === 'driver' && pickup.tag) {
                const payLabel = payField.querySelector('label');
                const row = el('div', 'scheduler-label-row');
                payLabel.replaceWith(row);
                row.append(payLabel, pickup.tag);
              }
              // Dollars and cents, none below zero.
              payInput.addEventListener('input', () => {
                const n = money(payInput.value);
                seat.pay = n == null ? null : Math.max(0, round2(n));
                drawClosed();
              });
              return pair(field, payField);
            });
            const drove = b.busId ? droveOn(b.busId, leg) : null;
            if (drove) {
              const seated = new Set(seats.map(x => String(x.seat.driverId)));
              const extra = drove.filter(d => d.name && d.miles > 0 && !seated.has(String(d.driver_id)));
              const nobody = drove.find(d => !d.name && d.miles > 0);
              const unseen = seats.filter(x => !drove.some(d => same(d.driver_id, x.seat.driverId))).map(x => seatName(x.seat.driverId));
              if (extra.length) notes.push(`Drove, not on the trip: ${extra.map(d => `${droveName(d)} ${mi(d.miles)}`).join(', ')}`);
              if (nobody) notes.push(`Nobody logged in: ${mi(nobody.miles)}`);
              if (unseen.length) notes.push(`On the trip, not seen in Samsara: ${unseen.join(', ')}`);
            }
            group.append(head, ...(pickup.line ? [pickup.line] : []), ...fields);
            after.append(...notes.map(words => el('p', 'rux--form__helper-text', words)));
            drawTotal();
            groups.push(fieldTile(group));
          });
        }
        seatMilesBox.replaceChildren(...groups);
        paySection.hidden = !groups.length;
        drawClosed();
      };
      seatMilesDrawn = drawSeatMiles;

      let samsaraAsking = false;
      const getFromSamsara = async () => {
        if (samsaraAsking) return;
        samsaraAsking = true;
        toast('working', 'Getting miles from Samsara…');
        let r;
        try { r = await client.functions.invoke('samsara-miles', { body: { trip_id: editing.id } }); } catch (error) { r = { error }; }
        samsaraAsking = false;
        if (r.error || !r.data) {
          toast(null);
          const status = r.error?.context?.status;
          const [title, why] = status === 503 ? ['Samsara is not connected yet', 'Its key has not been set.']
            : status === 401 ? ['Log in again', 'Your log-in has run out.']
            : ['Samsara did not answer', 'Check your connection, then try again.'];
          samsaraOut.replaceChildren(notice('error', title, why));
          placeMilesParts();
          return;
        }
        samsaraFound = r.data;
        samsaraOut.replaceChildren(...(samsaraFound.buses.length ? []
          : [el('p', 'rux--form__helper-text', 'No buses on this trip yet.')]));
        placeMilesParts();
        /* Each seated driver Samsara saw drive the seat's bus on its leg, and
           when each bus reached the leg's pickup and left the yard and got
           back; a time Samsara cannot find leaves the one saved. */
        let filled = samsaraFound.actual != null;
        for (const leg of fleetLegs()) {
          for (const b of editing.fleet?.[leg] ?? []) {
            const found = b.busId ? legFound(b.busId, leg) : null;
            if (found?.pickup_at) { b.pickupAt = found.pickup_at; filled = true; }
            if (found?.yard_depart_at) { b.yardDepartAt = found.yard_depart_at; filled = true; }
            if (found?.yard_return_at) { b.yardReturnAt = found.yard_return_at; filled = true; }
            const drove = b.busId ? droveOn(b.busId, leg) : null;
            if (!drove) continue;
            for (const role of ROLES.map(x => x.role)) {
              const seat = b.seats[role];
              const d = seatFilled(seat) && drove.find(x => same(x.driver_id, seat.driverId));
              if (d) { seat.miles = d.miles; filled = true; }
            }
          }
        }
        drawSeatMiles();
        const actual = document.getElementById('scheduler-f-actmiles');
        if (samsaraFound.actual != null && actual) actual.value = String(samsaraFound.actual);
        // Through the panel's own listener, so Save counts the miles.
        (actual ?? panelBilling).dispatchEvent(new Event('input', { bubbles: true }));
        toast('success', 'Miles from Samsara', filled ? 'Save keeps them.' : 'It has none for this trip yet.');
      };
      const milesMenu = editing.creating ? null : menuTrigger('scheduler-f-milesmenu', 'Miles options');
      milesMenu?.addEventListener('click', () => openItemsMenu(milesMenu,
        [{ label: 'Get from Samsara', run: getFromSamsara }], 'Miles options'));
      const milesSection = section('Miles', milesBody, milesMenu ?? undefined);


      /* THE BILLING TILE: a row for each step, in the ladder's order, Quote
         sent, the contract, purchase orders, invoices and payments, so a step
         is always in the same place and one not yet taken shows in grey. A
         step the office's billing workflow does not use is not shown. Quote
         sent offers its marks; the contract opens its window; the others
         open the window of their entries. The rows are the milestones: PO
         received is on while there is a PO, Invoice sent while there is an
         invoice, the contract while it is signed. */
      const billLayer = el('div', 'rux--layer-two');
      const billTile = el('div', 'rux--tile scheduler-billing-steps');
      billLayer.appendChild(billTile);
      const step = ({ id, name, done, much = '', meta, drafted, press }) => {
        const row = el('button', `scheduler-billing-step${drafted ? ' scheduler-drafted' : ''}`);
        row.type = 'button';
        row.id = id;
        const top = el('span', 'scheduler-item__line');
        top.append(el('span', `scheduler-item__name${done ? '' : ' scheduler-fleet-tile__none'}`, name),
          el('span', 'scheduler-item__much', much));
        row.append(top, el('span', 'scheduler-item__meta', meta));
        row.title = [name, meta, much].filter(Boolean).join(' · ');
        row.addEventListener('click', () => press(row));
        return row;
      };
      const sumOf = rows => rows.reduce((n, r) => n + (Number(r.amount) || 0), 0);
      const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
      const drawBilling = () => {
        const rows = [];
        const now = money(quotedInput.value);
        const sent = editing.quoteSent;
        const sentItems = sent ? [
          ...(now != null && round2(now) !== round2(sent.price)
            ? [{ label: `Mark ${sentPrice(now)} sent`, run: () => markSent(now) }] : []),
          { label: 'Mark not sent', danger: true, run: () => markSent(null) },
        ] : [{ label: now == null ? 'Mark sent, once the quote has a price' : `Mark ${sentPrice(now)} sent today`,
          disabled: now == null, run: () => markSent(now) }];
        rows.push(step({ id: 'scheduler-f-bill-quotesent', name: 'Quote sent', done: !!sent,
          much: sent ? sentPrice(sent.price) : '', meta: sent ? (sent.on ? mdy(sent.on) : 'No date') : 'Not sent',
          press: row => openItemsMenu(row, sentItems, 'Quote sent') }));
        if (stepOn('contractSigned')) {
          const contract = contractNow();
          rows.push(step({ id: 'scheduler-f-bill-contract', name: 'Contract signed', done: !!contract,
            meta: contract ? [contract.on ? mdy(contract.on) : 'No date', contract.note].filter(Boolean).join(' · ') : 'Not signed',
            // A contract a draft set is marked to check until its window is Done.
            drafted: contract?.drafted, press: () => openContractDialog() }));
        }
        if (stepOn('poReceived')) {
          const n = poPending.length, one = poPending[0];
          rows.push(step({ id: 'scheduler-f-bill-pos', name: 'Purchase orders', done: n > 0,
            much: poPending.some(p => p.amount != null) ? usd(sumOf(poPending)) : '',
            meta: !n ? 'None' : n > 1 ? plural(n, 'PO', 'POs')
              : [one.ref ? `PO ${one.ref}` : 'No reference', one.date ? mdy(one.date) : 'No date'].join(' · '),
            drafted: poPending.some(p => p.drafted), press: () => openEntriesDialog('po') }));
        }
        if (stepOn('invoiced')) {
          const n = invPending.length, one = invPending[0];
          rows.push(step({ id: 'scheduler-f-bill-invoices', name: 'Invoices', done: n > 0,
            meta: !n ? 'None' : n > 1 ? plural(n, 'invoice', 'invoices')
              : [one.number ? `Invoice ${one.number}` : 'No number', one.date ? mdy(one.date) : 'No date'].join(' · '),
            press: () => openEntriesDialog('invoice') }));
        }
        const n = payPending.length, one = payPending[0];
        rows.push(step({ id: 'scheduler-f-bill-payments', name: 'Payments', done: n > 0,
          much: n ? usd(sumOf(payPending)) : '',
          meta: !n ? 'None' : n > 1 ? plural(n, 'payment', 'payments')
            : [one.method || 'Payment', one.date ? mdy(one.date) : 'No date'].join(' · '),
          press: () => openEntriesDialog('payment') }));
        billTile.replaceChildren(...rows);
        drawSummary();
      };
      drawBillingList = drawBilling;
      // A PO or a payment can settle the price, which holds the lines' costs.
      const drawMoney = () => { drawBilling(); if (linesLive) redrawLines(); };
      redrawPos = drawMoney;
      redrawInvoices = drawBilling;
      redrawPayments = drawMoney;
      redrawContract = drawBilling;

      // What the customer pays, its Done, then what is filled in once the trip is back.
      milesSection.classList.add('scheduler-panel-section--after');
      panelBilling.append(
        section('Billing', billLayer),
        doneSection('billing'),
        milesSection,
        paySection,
        closedSection,
      );
      drawClosed();
      document.getElementById('scheduler-f-actmiles')?.addEventListener('input', drawClosed);
      syncEstHint();
      // The quoted price redraws the figures on `input`, so they follow each keystroke.
      document.getElementById('scheduler-f-quoted')?.addEventListener('input', drawSummary);
      drawBilling();
    }

    /* Fleet is how many buses each leg needs, the bus on each and who fills its
       seats; the dates are in Details and the times in Route. A new trip from a
       cell starts on that cell's bus. */
    editing.fleet = fleetOf(trip, creating);
    editing.fleetBefore = cloneFleet(editing.fleet);
    editing.fleetCounts = Object.fromEntries(fleetLegs().map(k => [k, editing.fleet[k].length]));
    fleetClashes = null;
    fleetClashKey = '';
    drawFleet();
    // The quote's lines count the Buses tab's buses, so they draw after it,
    // and from here follow it.
    redrawLines();
    linesLive = true;

    /* Files is one list: the trip's files, which write at once, with Add file
       as its last row, and under it the line a trip with no itinerary shows.
       A trip not yet saved has no id to file under, so its files wait in the
       list, each marked as going up with the save, and Save sends them once
       the trip exists. Closing without saving drops them. */
    panelFiles.replaceChildren();
    if (!client) {
      filesBody = null;
      filesNote = null;
      filesAdd = null;
      panelFiles.append(section(null, el('p', 'rux--form__helper-text',
        'This preview has no connection, so files cannot be listed or added.')));
    } else if (creating) {
      const { list, body } = rowList();
      const progress = el('div', 'rux--file-container');
      editing.filesWaiting = [];
      const add = listAddRow({ label: 'Add file', id: 'scheduler-f-fileadd', onClick: () => pickFile(start) });
      const draw = () => body.replaceChildren(...editing.filesWaiting.map(w => listRow({
        name: docTypeName(w),
        meta: ['Goes up with the save', fileSize(w.file.size)].filter(Boolean).join(' · '),
        title: w.file.name,
        openLabel: `Open ${w.file.name}, which goes up with the save`,
        // Not stored yet, so it opens from this computer, in a tab of its own.
        open: () => window.open(URL.createObjectURL(w.file), '_blank', 'noopener'),
        items: [{ label: 'Remove', run: () => { editing.filesWaiting = editing.filesWaiting.filter(x => x !== w); draw(); } }],
      })), add.li);
      async function start(file) {
        if (!file) return;
        if (!(await isPdf(file))) {
          fileItem(progress, file.name).fail('Only PDF files can be added', 'Export the file as a PDF, then add it again.');
          return;
        }
        askFileType(file.name, label => { editing.filesWaiting.push({ file, label }); draw(); });
      }
      filesBody = null;
      filesNote = null;
      filesAdd = { li: add.li, progress, start };
      const listWrap = el('div');
      listWrap.append(list, progress);
      panelFiles.append(section(null, listWrap));
      draw();
    } else {
      const { list, body } = rowList();
      filesBody = body;
      filesAdd = fileAdder(trip.id);
      filesNote = el('p', 'rux--form__helper-text scheduler-files-note');
      const listWrap = el('div');
      listWrap.append(list, filesAdd.progress, filesNote);
      panelFiles.append(section(null, listWrap));
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

    // A leg's Way can make the trip a split or end one, which names its legs.
    document.getElementById('scheduler-f-way')?.addEventListener('change', () => {
      drawFleet();
      drawLegSwitch();
      refreshDirty();
    });

    syncSaved();
    drawLegSwitch();
    refreshDirty();
    loadFleetClashes();

    /* A trip keeps the tab the last one was on, so going through trips on
       Buses stays on Buses; a new trip starts on Details, where it begins. */
    if (creating && !again) {
      const details = document.getElementById('scheduler-tab-details');
      if (details && details.getAttribute('aria-selected') !== 'true') window.Rux?.tabs?.select?.(details.closest('[role="tablist"]'), details);
    }

    if (!again) panelOpener = bar;
    panelEl.hidden = false;
    const editorWasShut = !!tripEl?.hidden;
    if (tripEl) tripEl.hidden = false;
    // The editor always opens, and the oldest panels close for its room.
    if (editorWasShut) void makeRoom('editor');
    // Once the panel shows, so Open trip and the driver grid treat this trip
    // as the one in the editor.
    syncSelection();
    // The editor is open now, so the board is measured again before it is fit.
    placeRoom();
    window.Rux?.schedule?.fit?.();
    document.getElementById('scheduler-panel-close')?.focus();
    // The narrower board can leave the trip half under its edge.
    if (!creating) requestAnimationFrame(() => revealBar(panelArgs?.ref && findBar(panelArgs.ref)));
  }

  /* Scrolls the board across just far enough to show a bar whole, clear of
     the sticky bus column, or its start when it is wider than the board. */
  function revealBar(bar) {
    if (!bar?.isConnected) return;
    const pane = schEl.getBoundingClientRect();
    const head = gridEl.querySelector('.scheduler-row-head')?.getBoundingClientRect();
    const box = bar.getBoundingClientRect();
    const first = (head ? head.right : pane.left) + TIP_GAP;
    const last = pane.left + schEl.clientWidth - TIP_GAP;
    const by = box.left < first ? box.left - first
      : box.right > last ? Math.min(box.right - last, box.left - first) : 0;
    // At once, as the editor itself appears.
    if (by) schEl.scrollLeft += by;
  }

  /* ── Drivers ───────────────────────────────────────────────────────────────
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
  // The pane of the board's two lists, which to-do-list.js shows and hides.
  const toDoPane = document.getElementById('scheduler-to-do-panel');
  /* The board's whole range, one week or two, and which of its days the roster
     last drew, as `first:count`, so a new selection redraws only when it moves
     the roster to the other week. */
  let availAll = null;
  let availSlice = '';

  /* PICKING A DRIVER OUT: a press on a name dims every bar but that driver's,
     in any seat, and sets their name in bold on their own bars, so their week
     reads straight off the board. The same name again, Escape in the roster,
     or hiding the roster puts the board back. Kept by id, because every
     render replaces the bars and the names. */
  let focusDriver = null;
  // The trips each busy day is made of, which a click on the day selects.
  let availRefs = new WeakMap();

  function markDriverTrips() {
    const id = focusDriver;
    gridEl.classList.toggle('scheduler-grid--driver', id != null);
    for (const bar of gridEl.querySelectorAll('.scheduler-bar[data-trip-id]')) {
      bar.classList.toggle('scheduler-bar--driver', id != null && (bar.dataset.drivers || '').split(' ').includes(id));
    }
    for (const c of gridEl.querySelectorAll('.scheduler-crew[data-driver-id]')) {
      c.classList.toggle('scheduler-crew--focus', c.dataset.driverId === id);
    }
    for (const n of availGrid.querySelectorAll('.scheduler-avail__name[data-driver-id]')) {
      n.setAttribute('aria-pressed', String(n.dataset.driverId === id));
    }
  }

  /* Picking a driver puts down the selected trip, and with it its card and
     its days in the roster: the question is now this driver's week, and the
     card would stand over it. A trip selected after the pick, from the board
     or a busy day, is selected as ever. */
  function pickDriver(id) {
    focusDriver = id != null && id !== focusDriver ? id : null;
    if (focusDriver != null) clearSelection();
    markDriverTrips();
  }

  /* A busy day selects its trip's bar and brings it into view; a day of two
     trips selects the next one each time. The board's own selection does the
     rest, lighting the trip's days and showing its shortcut bar. */
  function selectDayTrip(cell) {
    const refs = availRefs.get(cell);
    if (!refs?.length) return;
    const bars = refs.map(findBar).filter(Boolean);
    if (!bars.length) return;
    const at = bars.indexOf(selectedBar());
    const bar = bars[(at + 1) % bars.length];
    selectBar(bar);
    bar.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  availGrid?.addEventListener('click', e => {
    const name = e.target.closest('.scheduler-avail__name[data-driver-id]');
    if (name) {
      // The tap that ends a hold opened the name's menu, and the press that
      // ends a carry dropped the name; neither picks anyone.
      if (heldName || carriedName) { heldName = carriedName = false; return; }
      pickDriver(name.dataset.driverId);
      return;
    }
    const cell = e.target.closest('.scheduler-avail__cell');
    if (cell) selectDayTrip(cell);
  });
  availGrid?.addEventListener('keydown', e => {
    const name = e.target.closest?.('.scheduler-avail__name[data-driver-id]');
    if (!name) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickDriver(name.dataset.driverId); }
    else if (e.key === 'Escape' && focusDriver != null) { e.stopPropagation(); pickDriver(null); }
  });

  /* A NAME'S MENU, from a right-click, the menu key or a finger's hold: Send
     trips opens the Driver view and Open driver the driver's record, each in
     a new tab so the board stays as it is; Call and Text reach the driver as
     a trip's Contacts do, shown only with a number; Pick out trips is the
     name's own press. Placed and opened as the bar's menu is. */
  const driverMenu = document.getElementById('scheduler-driver-menu');
  let driverMenuFor = null;
  let heldName = false;

  // Follows a link as a press on it would, so a call or a text never
  // navigates the board away.
  const follow = (href, away) => {
    const a = Object.assign(document.createElement('a'), { href });
    if (away) { a.target = '_blank'; a.rel = 'noopener'; }
    a.click();
  };
  // Google Messages takes the text on a computer; a phone's own app does on
  // the compact board, as the trip's Contacts read it.
  const textsInMessages = driver => !!driver.texting_url && pageEl?.getAttribute('data-board') !== 'compact';

  function openDriverMenu(name, e) {
    const id = name.dataset.driverId;
    const driver = availAll?.rows.find(r => String(r.driver.id) === id)?.driver;
    if (!driver || !driverMenu) return;
    driverMenuFor = { id, driver };
    const call = document.getElementById('scheduler-driver-menu-call');
    const text = document.getElementById('scheduler-driver-menu-text');
    call.hidden = !driver.phone;
    text.hidden = !driver.phone && !textsInMessages(driver);
    document.getElementById('scheduler-driver-menu-reach').hidden = call.hidden && text.hidden;
    document.getElementById('scheduler-driver-menu-phone').textContent = driver.phone ? showPhone(driver.phone) : '';
    document.querySelector('#scheduler-driver-menu-pick .rux--menu-item__label').textContent =
      focusDriver === id ? 'Show every trip' : 'Pick out trips';
    popMenuAt(driverMenu, e);
  }

  availGrid?.addEventListener('contextmenu', e => {
    const name = e.target.closest('.scheduler-avail__name[data-driver-id]');
    if (!name) return;
    e.preventDefault();
    openDriverMenu(name, e);
  });

  /* A finger holding still on a name opens its menu, timed and bounded as
     the board's cell hold is; travel past the slop is a scroll and ends it. */
  availGrid?.addEventListener('pointerdown', down => {
    heldName = false;
    if (down.pointerType !== 'touch' || !down.isPrimary) return;
    const name = down.target.closest('.scheduler-avail__name[data-driver-id]');
    if (!name) return;
    const mine = e => e.pointerId === down.pointerId;
    const move = e => {
      if (mine(e) && Math.hypot(e.clientX - down.clientX, e.clientY - down.clientY) > TOUCH_SLOP) end();
    };
    const up = e => { if (mine(e)) end(); };
    const end = () => {
      clearTimeout(hold);
      availGrid.removeEventListener('pointermove', move);
      availGrid.removeEventListener('pointerup', up);
      availGrid.removeEventListener('pointercancel', up);
    };
    const hold = setTimeout(() => { end(); heldName = true; openDriverMenu(name, down); }, TOUCH_HOLD_MS);
    availGrid.addEventListener('pointermove', move);
    availGrid.addEventListener('pointerup', up);
    availGrid.addEventListener('pointercancel', up);
  });

  /* A DRIVER CARRIED TO A TRIP, OR OFF ONE. A mouse or a pen that presses a
     name in the roster and travels lifts a figure that hangs from the pointer
     with the name beside it; the same press on a driver's name on a bar
     pulls that driver out of the seat they are in. While the figure is carried
     the board is marked, so app.css outlines every bar with an empty seat,
     and the bar under the pointer is ringed while it can seat a
     driver: plainly where the roster shows the driver free on the bar's days,
     and as a warning where `rosterClash` finds them in the way. An empty slot
     has no bus row to seat a driver in, and the trip in the editor holds its
     drivers unsaved there, so neither is ringed and neither gives a driver
     up. A finger carries no one, because its hold opens a menu and its travel
     scrolls.

     A BUS WITH MORE THAN ONE SEAT ON SHOWS THEM. Only the seats the Buses
     tab has turned on are there to take, because a seat that is on is a
     charge on the quote, and a drop does not change what a trip charges.
     Over a bar whose bus has the Driver seat alone the bar is the whole
     target. Over one with a co-driver or a relief seat on, `seatStrip`
     lays the seats along the foot of the bar, each naming itself and who is
     in it, and one is lit: the seat under the pointer, or with the pointer
     on the rest of the bar the seat `openSeat` gives, the first empty one,
     so a drop anywhere fills what is wanted. A lit seat that holds another
     driver says Replace, so it is read before the figure is let go.

     LET GO OVER A BAR, the bar is the figure's ground. It drops to the foot
     of the bar, goes over on its back, sits up, gets to its feet and waits,
     keeping to the bar if the board is scrolled, while `dropDriver` decides.
     Seated, it hops to the seat it was given and goes back into the ground
     it comes out of, until its head is the seat's mark. Refused, the bar
     throws it off and it falls away, and a driver lifted from a bar stays on
     that bar. Let go on the seat it was lifted from it does the same and
     goes back in, and nothing is written; on another seat of that bus it
     changes seats.

     LET GO CLEAR OF EVERY BAR, a figure from the roster falls from the
     pointer, thrown the way the pointer was travelling, and nothing is
     written. One lifted from a bar falls the same way, and `removeDriver`
     takes the driver off that bus. Over a bar that takes no driver, or on
     Escape, a driver lifted from a bar is not thrown: the figure goes and
     they stay.

     A DRIVER COMES OUT OF A BAR LIKE A CARROT OUT OF THE GROUND. The seat's
     dot is the figure's head, in the dot's own colour: the head leaves the
     dot with the pointer and the body follows it out of the bar, hidden up
     to the line the dot sat on and leaning back toward it, until
     CARRY_PULL of travel has it clear. Then it is free: it springs to the
     pointer and is carried as any figure is. Let go before that, it slips
     back in and nothing has happened, which is also what keeps a slip of the
     hand from lifting anyone.

     What the figure was lifted from is dimmed while it is out. A roster name
     slides back in once its figure has fallen out of sight, or its driver
     has come off a bus, so it reads as there to pick up again.

     The figure's pose is carried.js's, asked for each frame with where its
     pinch is. With reduced motion it is asked once, hangs still, and is taken
     away the moment it is let go. */
  const carriedTemplate = document.getElementById('scheduler-carried');
  /* The seats a bar's bus has on, in role order, each as `crewOf` gives it:
     the driver in it, or `needed`. The first driver in a role is its seat. */
  const barSeats = bar => {
    const crew = barCrew(bar)?.crew ?? [];
    return ROLES.map(r => crew.find(c => c.role === r.role)).filter(Boolean);
  };
  /* The seat a driver let go over a bar takes when no seat is aimed at: on
     the bar `seat` lifted them from, the one they left; on any other, the
     first empty seat, or the Driver seat when every seat is taken. */
  const openSeat = (bar, seat) => (seat && bar.dataset.assignmentId === seat.assignmentId ? seat.role
    : barSeats(bar).find(c => c.needed)?.role ?? 'driver');
  /* The seats to aim at, for a bar whose bus has more than one on: a chip a
     seat, in role order, naming the seat and who is in it. Null for a bus
     with the Driver seat alone, where the bar is the only place to drop, and
     on the compact board, whose bars have no room for it, where a drop takes
     the open seat. */
  function seatStrip(bar) {
    const seats = pageEl?.getAttribute('data-board') === 'compact' ? [] : barSeats(bar);
    if (seats.length < 2) return null;
    const strip = el('div', 'scheduler-seats');
    strip.setAttribute('aria-hidden', 'true');
    for (const c of seats) {
      const chip = el('div', 'scheduler-seats__seat');
      chip.dataset.seat = c.role;
      chip.dataset.label = c.label;
      if (!c.needed) chip.dataset.driverId = c.driverId;
      chip.append(el('span', 'scheduler-seats__role', c.label),
        el('span', c.needed ? 'scheduler-seats__who scheduler-seats__who--empty' : 'scheduler-seats__who',
          c.needed ? 'Empty' : crewName(c)));
      strip.appendChild(chip);
    }
    return strip;
  }
  const CARRY_GRAVITY = 2400;                  // a falling figure's pull, in pixels a second squared
  const CARRY_THROW = 1500;                    // the fastest a figure leaves the pointer, in pixels a second
  const CARRY_BOUNCE = { vx: -320, vy: -620 }; // off a bar that refused it: up, and back toward the roster
  const CARRY_FALL_MS = 4000;                  // the longest a fall is waited on to leave the window
  const CARRY_PULL = 28;                       // pixels of travel that pull a figure clear of its bar
  const CARRY_FULL = 40;                       // the figure's height in its drawing, pinch to feet
  const CARRY_WAIST = 27;                      // its hip: how much shows of one stood in a bar
  const CARRY_LIE = 40;                        // pixels a figure on its back takes up behind its feet
  const CARRY_PLUNGE_MS = 140;                 // how long a figure at its seat takes to go in to its waist
  const CARRY_SINK_MS = 180;                   // and from there to its head
  // The figure's head from where its holder is put, in pixels, and the head's
  // lower edge in the drawing: the line a pulled figure is hidden below.
  const CARRY_HEAD = { x: 5.5, y: 13.5, edge: 13.5 };
  let carriedName = false;
  const seatsDriver = bar => !!bar.dataset.assignmentId && !isEditorTrip(bar)
    && !bar.classList.contains('scheduler-bar--saving') && !bar.classList.contains('scheduler-bar--back')
    && !!barSeat(bar)?.range;
  /* Whether the roster already shows a driver in the way of a bar: on that
     bus, or away or on another bus on any of the bar's days. `from` is the
     bar a driver is being carried off, which is not in their way. It is read
     off the board's own range as the roster holds it, so the pointer has its
     answer at once. A warning, not a wall: `dropDriver` asks the database,
     which sees the days around the board's range and the board cannot. */
  const rosterClash = (bar, driverId, from) => {
    if ((bar.dataset.drivers || '').split(' ').includes(driverId)) return true;
    const row = availAll?.rows.find(r => String(r.driver.id) === driverId);
    if (!row) return false;
    const start = +bar.dataset.start, span = +bar.dataset.span;
    return row.days.slice(start, start + span).some(day => day.off
      || day.refs.some(r => !(from && r.tripId === from.tripId && r.legKey === from.legKey)));
  };

  // Slides a driver's name back into the roster, found afresh because a read can have drawn it again.
  function nameBack(driverId) {
    const shown = availGrid?.querySelector(`.scheduler-avail__name[data-driver-id="${CSS.escape(String(driverId))}"]`);
    if (!shown || reducedMotion.matches) return;
    shown.classList.remove('scheduler-avail__name--back');
    void shown.offsetWidth;
    shown.classList.add('scheduler-avail__name--back');
    shown.addEventListener('animationend', () => shown.classList.remove('scheduler-avail__name--back'), { once: true });
  }

  /* One carry, from the press `down`. `held` is what was pressed, which takes
     the class `dim` while the figure is out; `label` is the name beside the
     figure; `seat` is the bar a driver is lifted from, as `barRef` gives it,
     with the `role` of the seat they were in, and absent for a name from the
     roster; `onLift` hears the figure lift. */
  function carry(down, { driverId, label, held, dim, seat = null, onLift }) {
    // The figure's holder, the bar ringed under it with its strip of seats,
    // the seat a release there takes and the one it takes with none aimed at,
    // its frame, where its pinch is, once it is let go to fall how fast it is
    // going, while its bar still holds it that it does, and stood in a bar,
    // how high and since when it sinks.
    let tag = null, over = null, strip = null, aim = null, rest = null;
    let frame = 0, free = null, rooted = false, planted = null;
    let at = { x: down.clientX, y: down.clientY };
    const figure = window.SchedulerCarried?.motion();
    const still = () => !figure || reducedMotion.matches;
    // The bar the driver was lifted from, where they already sit.
    const home = bar => !!seat && bar.dataset.assignmentId === seat.assignmentId;

    /* Rings the bar under the figure, lays out its seats, and lights the one
       a release would take: `chip`, the seat under the pointer, or the bar's
       open seat. A lit seat that holds another driver says so. */
    const ring = (bar, chip) => {
      if (bar !== over) {
        over?.classList.remove('scheduler-bar--seat', 'scheduler-bar--seat-warn');
        strip?.remove();
        over = bar;
        strip = over ? seatStrip(over) : null;
        rest = over ? openSeat(over, seat) : null;
        if (over) {
          over.classList.add(!home(over) && rosterClash(over, driverId, seat) ? 'scheduler-bar--seat-warn' : 'scheduler-bar--seat');
          if (strip) over.appendChild(strip);
        }
      }
      aim = chip && strip?.contains(chip) ? chip.dataset.seat : rest;
      if (strip) {
        /* The strip keeps to the part of its bar the board shows, clear of
           the bus column the bar scrolls under and of the board's far edge,
           so every seat of a bar that runs off the board can be reached. */
        const box = over.getBoundingClientRect();
        const view = schEl.getBoundingClientRect();
        const column = over.closest('.scheduler-row')?.querySelector('.scheduler-row-head')?.getBoundingClientRect();
        strip.style.insetInlineStart = `${Math.max(0, (column?.right ?? view.left) - box.left)}px`;
        strip.style.insetInlineEnd = `${Math.max(0, box.right - view.right)}px`;
      }
      for (const c of strip?.children ?? []) {
        const lit = c.dataset.seat === aim;
        const takes = lit && !!c.dataset.driverId && c.dataset.driverId !== String(driverId);
        c.classList.toggle('scheduler-seats__seat--aim', lit && !takes);
        c.classList.toggle('scheduler-seats__seat--replace', takes);
        c.firstChild.textContent = takes ? 'Replace' : c.dataset.label;
      }
    };
    // The bar under the pointer that can seat a driver, and the seat of its
    // strip under it. Found afresh each time, because a read can replace
    // every bar under a carried figure.
    const under = e => {
      const hit = document.elementFromPoint(e.clientX, e.clientY);
      const bar = hit?.closest('.scheduler-bar');
      return bar && gridEl.contains(bar) && seatsDriver(bar) ? [bar, hit.closest('.scheduler-seats__seat')] : [null, null];
    };
    // Any bar at all, by where it is drawn, so one that takes no pointer still counts.
    const onBar = e => [...gridEl.querySelectorAll('.scheduler-bar')].some(bar => {
      const box = bar.getBoundingClientRect();
      return e.clientX >= box.left && e.clientX <= box.right && e.clientY >= box.top && e.clientY <= box.bottom;
    });
    const place = () => {
      tag.style.insetInlineStart = `${at.x}px`;
      tag.style.insetBlockStart = `${at.y}px`;
    };
    // Writes a pose to the figure as the properties app.css turns its parts by.
    const pose = parts => {
      if (!tag || !parts) return;
      for (const [part, value] of Object.entries(parts)) {
        tag.style.setProperty(`--scheduler-carried-${part}`, part === 'stretch' ? value.toFixed(3)
          : part.startsWith('hip') ? `${value.toFixed(1)}px` : `${value.toFixed(1)}deg`);
      }
    };
    const lift = () => {
      onLift?.();
      tag = carriedTemplate.content.firstElementChild.cloneNode(true);
      tag.querySelector('.rux--tag__label').textContent = label;
      const dot = seat && !still() ? held.querySelector('.scheduler-crew__dot') ?? held.querySelector('.scheduler-crew__mark') : null;
      if (dot) {
        /* Out of a bar: the figure takes the colour of its seat's mark, the
           dot or a relief's arrows, and is put so its head sits on it, moved
           by as far as the pointer has come. */
        const box = dot.getBoundingClientRect();
        rooted = true;
        tag.classList.add('scheduler-carried--rooted');
        tag.style.color = getComputedStyle(dot).color;
        tag.style.setProperty('--scheduler-carried-dx', `${box.left + box.width / 2 - down.clientX - CARRY_HEAD.x}px`);
        tag.style.setProperty('--scheduler-carried-dy', `${box.top + box.height / 2 - down.clientY - CARRY_HEAD.y}px`);
      }
      pageEl.appendChild(tag);
      held.classList.add(dim);
      document.body.style.cursor = 'grabbing';
      // Captured, so the bars passed over show no hover of their own.
      try { held.setPointerCapture(down.pointerId); } catch { /* the pointer is already gone */ }
      if (rooted) return;
      pose(figure?.step(performance.now(), at.x, at.y));
      carried();
    };
    // Carried free: the board is marked for it, and its frames begin.
    const carried = () => {
      gridEl.classList.add('scheduler-grid--carrying');
      if (!still()) frame = requestAnimationFrame(tick);
    };
    /* One step of the pull, from how far the pointer has come since the
       press: the figure leans back toward the dot it is coming out of, no
       further than it can swing, shows as much of itself as has come out,
       and at CARRY_PULL comes free, swinging from that lean. */
    const pull = () => {
      const dx = at.x - down.clientX, dy = at.y - down.clientY;
      const out = Math.hypot(dx, dy);
      const lean = Math.max(-80, Math.min(80, Math.atan2(dx, -dy) * 180 / Math.PI));
      if (out < CARRY_PULL) {
        tag.style.setProperty('--scheduler-carried-lean', `${lean.toFixed(1)}deg`);
        tag.style.setProperty('--scheduler-carried-out', `${(CARRY_HEAD.edge + out).toFixed(1)}px`);
        pose(figure.pulled(performance.now(), out / CARRY_PULL));
        return;
      }
      rooted = false;
      tag.classList.remove('scheduler-carried--rooted');
      tag.style.setProperty('--scheduler-carried-dx', '0px');
      tag.style.setProperty('--scheduler-carried-dy', '0px');
      figure.release(lean);
      pose(figure.step(performance.now(), at.x, at.y));
      carried();
    };
    /* Takes the figure away and undims what it was lifted from. `back` slides
       a roster name in again, for a figure that fell back to the roster and
       not one seated on a trip. */
    const gone = back => {
      cancelAnimationFrame(frame);
      tag?.remove();
      tag = null;
      held.classList.remove(dim);
      if (back && !seat) nameBack(driverId);
    };
    // Let go: nothing holds the figure, so its name and the pinch of its shirt go.
    const loose = () => {
      tag.querySelector('.scheduler-carried__name')?.remove();
      tag.classList.add('scheduler-carried--loose');
    };
    // Lets the figure fall, thrown at `speed`; `tick` carries it out of the window.
    const letFall = speed => {
      loose();
      const now = performance.now();
      const most = v => Math.max(-CARRY_THROW, Math.min(CARRY_THROW, v));
      free = { now, until: now + CARRY_FALL_MS, vx: most(speed.vx), vy: most(speed.vy) };
    };
    /* Let go over a bar, the bar is the figure's ground. It drops to the
       line the mark of the seat `role` sits on, straight down from where it
       was let go and kept inside the bar with room to lie down; sits down
       hard, goes over on its back, sits up, gets to its feet and stands
       there while the drop is decided. Told
       `sink`, it waits to be on its feet, hops to its seat, a longer
       hop taking longer, and goes into the bar until its head is the seat's
       mark. Told `spit`, the bar throws it off as soon as it has landed.
       Every step is placed from where the mark is now, so the figure keeps to
       its bar when the board is scrolled or drawn again. */
    const drop = (bar, role) => {
      loose();
      const box = bar.getBoundingClientRect();
      // `foot` is how far along the bar the figure was let go, for a seat with no mark drawn.
      planted = { ref: { ...barRef(bar), role }, phase: 'fall', next: null, landed: 0,
        foot: at.x + CARRY_HEAD.x - box.left, anchor: { x: at.x + CARRY_HEAD.x, y: box.bottom - 12 } };
      const dot = seatDot();
      const stand = Math.max(box.left + CARRY_LIE - dot.x, Math.min(box.right - 12 - dot.x, at.x - dot.x));
      fly({ x: at.x - dot.x, y: at.y - dot.y }, { x: stand, y: -CARRY_FULL });
    };
    /* Sets the figure flying between two places, each given from the dot as
       where its holder is put: dropped, when the second is under the first,
       and hopped otherwise, thrown so that it comes down on the second. */
    const fly = (rel, to) => {
      const dx = to.x - rel.x, dy = to.y - rel.y;
      const time = dy > 8 && Math.abs(dx) < dy ? Math.sqrt(2 * dy / CARRY_GRAVITY)
        : Math.max(.26, Math.min(.55, .26 + Math.hypot(dx, dy) / 1100));
      // `from` is stamped by the first frame of the flight, so the flight is timed on the frames' own clock.
      Object.assign(planted, { rel, to, time, from: 0, vx: dx / time, vy: dy / time - CARRY_GRAVITY * time / 2 });
    };
    /* The middle of the seat's mark now, by the bar as it is drawn now: its
       dot, or a relief's arrows. A seat the crew row has folded into its
       count has no mark drawn, so the count stands in for it; and where the
       row is not drawn at all, as on the compact board, the ground is the
       foot of the bar under where the figure was let go. An element that is
       not drawn measures as nothing at the window's corner, which is why
       each is asked whether it has a size. The figure is hidden while the
       mark is scrolled under the board's own headings or out of the window,
       where it would stand over them. A bar that has left the board keeps
       the figure where the mark last was. */
    const seatDot = () => {
      const bar = findBar(planted.ref);
      if (!bar) return planted.anchor;
      const drawn = node => {
        const box = node?.getBoundingClientRect();
        return box && (box.width || box.height) ? box : null;
      };
      const crew = bar.querySelector(`.scheduler-bar__crew > .scheduler-crew[data-seat="${planted.ref.role}"]`);
      const box = drawn(crew?.querySelector('.scheduler-crew__dot') ?? crew?.querySelector('.scheduler-crew__mark'))
        ?? drawn(bar.querySelector('.scheduler-bar__crew > .scheduler-bar__more'));
      const ground = bar.getBoundingClientRect();
      planted.anchor = box ? { x: box.left + box.width / 2, y: box.top + box.height / 2 }
        : { x: Math.min(ground.right, ground.left + planted.foot), y: ground.bottom - 12 };
      const top = document.elementFromPoint(planted.anchor.x, planted.anchor.y);
      tag.style.visibility = top && top.closest('.scheduler-track') === bar.closest('.scheduler-track') ? '' : 'hidden';
      return planted.anchor;
    };
    // Seated: once it is on its feet it hops to the seat and goes in.
    const sink = () => { if (planted) planted.next = 'sink'; };
    // Refused: once it has landed the bar throws it off, up and back toward the roster.
    const spit = () => { if (planted) planted.next = 'spit'; };
    const tick = now => {
      frame = requestAnimationFrame(tick);
      if (planted) {
        const dot = seatDot();
        if (planted.phase === 'fall' || planted.phase === 'hop') {
          planted.from ||= now;
          const flown = (now - planted.from) / 1000;
          if (flown < planted.time) {
            at = {
              x: dot.x + planted.rel.x + planted.vx * flown,
              y: dot.y + planted.rel.y + planted.vy * flown + CARRY_GRAVITY * flown * flown / 2,
            };
            place();
            pose(figure.step(now, at.x, at.y));
            return;
          }
          planted.landed = now;
          tag.classList.add(...(planted.phase === 'fall' ? ['scheduler-carried--standing']
            : ['scheduler-carried--rooted', 'scheduler-carried--planted']));
          planted.phase = planted.phase === 'fall' ? 'ground' : 'in';
        }
        const since = now - planted.landed;
        if (planted.phase === 'ground') {
          at = { x: dot.x + planted.to.x, y: dot.y + planted.to.y };
          place();
          if (planted.next === 'spit') {
            planted = null;
            tag.style.visibility = '';
            tag.classList.remove('scheduler-carried--standing');
            figure.release(0);
            letFall(CARRY_BOUNCE);
            return;
          }
          if (planted.next === 'sink' && since >= figure.stoodAfter) {
            tag.classList.remove('scheduler-carried--standing');
            planted.phase = 'hop';
            figure.release(0);
            fly(planted.to, { x: -CARRY_HEAD.x, y: -CARRY_FULL });
            return;
          }
          pose(figure.landed(now, since));
          return;
        }
        /* Into the bar, quick and then slowing as into soft ground, to its
           waist and on down to its head. The figure drops by as much as the
           line it is hidden below comes up it, so that line stays on the dot. */
        const waist = Math.min(1, since / CARRY_PLUNGE_MS);
        const sunk = Math.max(0, Math.min(1, (since - CARRY_PLUNGE_MS) / CARRY_SINK_MS));
        const depth = (CARRY_FULL - CARRY_WAIST) * (1 - (1 - waist) ** 2) + (CARRY_WAIST - CARRY_HEAD.edge) * sunk;
        at = { x: dot.x + planted.to.x, y: dot.y + planted.to.y + depth };
        place();
        tag.style.setProperty('--scheduler-carried-out', `${(CARRY_FULL - depth).toFixed(1)}px`);
        tag.style.setProperty('--scheduler-carried-lean', '0deg');
        pose(figure.planted(now));
        if (sunk >= 1) gone(false);
        return;
      }
      if (free) {
        const dt = Math.max(0, Math.min(.034, (now - free.now) / 1000));
        free.now = now;
        free.vy += CARRY_GRAVITY * dt;
        at = { x: at.x + free.vx * dt, y: at.y + free.vy * dt };
        place();
        if (at.y > window.innerHeight + 80 || now > free.until) { gone(true); return; }
      }
      pose(figure.step(now, at.x, at.y));
    };
    // `clear` is a release clear of every bar, which is what throws a driver off theirs.
    const end = (release, clear) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('keydown', key, true);
      if (!tag) return;
      document.body.style.cursor = '';
      gridEl.classList.remove('scheduler-grid--carrying');
      // Not yet clear of its bar, the figure slips back in.
      if (rooted) { gone(false); return; }
      const bar = release ? over : null;
      const role = aim;
      ring(null);
      // Back in the seat it was lifted from, where nothing changes.
      if (bar && home(bar) && role === seat.role) {
        if (still()) gone(false); else { drop(bar, role); sink(); }
        return;
      }
      if (bar) {
        const answer = dropDriver(bar, driverId, false, seat, role);
        if (still()) { gone(false); return; }
        drop(bar, role);
        answer.then(outcome => {
          if (!tag) return;
          if (outcome === 'seated') sink();
          // The box that asks takes over, and the figure waits for nothing.
          else if (outcome === 'asked') gone(false);
          else spit();
        });
        return;
      }
      if (seat && !(release && clear)) { gone(false); return; }
      if (still()) gone(false); else letFall(figure.speed());
      const from = seat && findBar(seat);
      if (from) removeDriver(from, false, driverId, seat.role);
    };
    const move = e => {
      if (e.pointerId !== down.pointerId) return;
      at = { x: e.clientX, y: e.clientY };
      if (!tag) {
        // A button let go where no pointerup reached the page.
        if (!(e.buttons & 1)) { end(false); return; }
        if (Math.hypot(e.clientX - down.clientX, e.clientY - down.clientY) < DRAG_THRESHOLD) return;
        lift();
      }
      e.preventDefault();
      place();
      if (rooted) pull();
      if (!rooted) ring(...under(e));
    };
    const up = e => {
      if (e.pointerId !== down.pointerId) return;
      if (tag && !rooted) ring(...under(e));
      end(true, !onBar(e));
    };
    const cancel = e => { if (e.pointerId === down.pointerId) end(false); };
    // Heard first and kept from the page, so Escape lets the figure go and does nothing else.
    const key = e => {
      if (e.key !== 'Escape' || !tag) return;
      e.preventDefault();
      e.stopPropagation();
      end(false);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('keydown', key, true);
  }

  // A press that can start a carry: a mouse's or a pen's main button, logged in.
  const carries = down => down.pointerType !== 'touch' && down.button === 0 && !!client && !!carriedTemplate;

  availGrid?.addEventListener('pointerdown', down => {
    carriedName = false;
    if (!carries(down)) return;
    const name = down.target.closest('.scheduler-avail__name[data-driver-id]');
    // The roster in front of the board has no trip under it to drop on.
    if (!name || pageEl?.getAttribute('data-takeover') === 'roster') return;
    carry(down, {
      driverId: name.dataset.driverId, label: name.textContent, held: name, dim: 'scheduler-avail__name--carried',
      onLift: () => { carriedName = true; },
    });
  });

  /* A driver's name on a bar that a press pulls them out by, whatever seat
     they are in, or null: a bar that could seat a driver gives its own up.
     `installDrag` asks this first and stands down, so the press pulls the
     driver and not the trip. */
  const liftsFrom = down => {
    if (!carries(down)) return null;
    const crew = down.target.closest?.('.scheduler-bar__crew > .scheduler-crew[data-seat][data-driver-id]');
    const bar = crew?.closest('.scheduler-bar');
    return bar && gridEl.contains(bar) && seatsDriver(bar) ? crew : null;
  };
  gridEl.addEventListener('pointerdown', down => {
    const crew = liftsFrom(down);
    if (!crew) return;
    const bar = crew.closest('.scheduler-bar');
    carry(down, {
      driverId: crew.dataset.driverId, label: crew.querySelector('.scheduler-crew__name')?.textContent ?? '',
      held: crew, dim: 'scheduler-crew--carried', seat: { ...barRef(bar), role: crew.dataset.seat },
      // The click that ends a carry would otherwise select the bar.
      onLift: () => bar.addEventListener('click', e => e.stopPropagation(), { capture: true, once: true }),
    });
  });

  driverMenu?.addEventListener('click', e => {
    const item = e.target.closest('.rux--menu-item');
    if (!item || !driverMenuFor) return;
    const { id, driver } = driverMenuFor;
    window.Rux?.menu?.close?.(driverMenu);
    driverMenu.hidden = true;
    const ref = encodeURIComponent(driver.id);
    if (item.id === 'scheduler-driver-menu-send') follow(`driver-view.html?driver=${ref}`, true);
    else if (item.id === 'scheduler-driver-menu-open') follow(`drivers.html?id=${ref}`, true);
    else if (item.id === 'scheduler-driver-menu-call') follow(`tel:${dial(driver.phone)}`);
    else if (item.id === 'scheduler-driver-menu-text') {
      if (textsInMessages(driver)) follow(driver.texting_url, true);
      else follow(`sms:${dial(driver.phone)}`);
    } else if (item.id === 'scheduler-driver-menu-pick') pickDriver(id);
  });
  driverMenu?.addEventListener('rux:menu-closed', e => { if (e.target === driverMenu) driverMenu.hidden = true; });

  /* The roster shows every day the board does. With two weeks its day columns
     narrow and its pane widens a little (see `.scheduler-aside--two`). */
  function rosterSlice() {
    return { first: 0, count: availAll.days };
  }

  // Draws the roster when the days it shows have changed, or when `force`
  // says the rows have, then lights the selected trip's days.
  function drawRoster(force) {
    if (!availAll) return;
    const { first, count } = rosterSlice();
    const slice = `${first}:${count}`;
    if (force || slice !== availSlice) {
      availSlice = slice;
      drawAvailability(availAll.rows, availAll.weekStart, first, count, availAll.days);
    }
    const on = currentTripDay();
    markAvailDays(on ? on.start : null, on ? on.span : 1);
    markDriverTrips();
  }

  function availabilityRows({ trips, drivers, timeOff, weekStart, weekEnd }) {
    const length = daysBetween(weekStart, weekEnd) + 1;
    const rows = (drivers || [])
      /* Active drivers only. The roster answers who can take a trip, and an
         inactive driver cannot, so their week is noise. A driver with no
         status counts as active, as the Buses tab's picker reads it. */
      .filter(d => !d.status || d.status === 'active')
      /* Priority first, the order the office calls drivers in, so the top of
         the roster is who to ask next. 1 to 5; a driver with none sorts below
         5, and names settle a tie. */
      .sort((a, b) => ((a.priority ?? 9) - (b.priority ?? 9))
        || (a.short_name || a.name || '').localeCompare(b.short_name || b.name || ''))
      .map(d => ({
        driver: d, legs: [],
        days: Array.from({ length }, () => ({ off: null, reason: null, offOf: null, trips: [], refs: [], rest: null })),
      }));
    const byId = new Map(rows.map(r => [r.driver.id, r]));

    for (const trip of trips || []) {
      for (const leg of legsOf(trip)) {
        const place = clip(leg.from, leg.to, weekStart, weekEnd);
        if (!place) continue;
        for (const a of trip.trip_assignments || []) {
          if (legKeyOfVehicle(trip, a) !== leg.key) continue;
          // Only the roles that are on, as the bar's crew counts them, so the
          // grid and the bar agree on who is driving.
          const on = activeRolesOf(a);
          for (const td of a.trip_drivers || []) {
            const row = byId.get(td.driver_id);
            if (!row || !on.has(td.role || 'driver')) continue;
            const what = trip.destination || 'Trip';
            // The bar a busy day selects, by the values `findBar` reads.
            const ref = { tripId: String(trip.id), leg: leg.leg, legKey: leg.key, assignmentId: a.id != null ? String(a.id) : null };
            for (let i = 0; i < place.span; i++) {
              const day = row.days[place.start + i];
              if (!day) continue;
              if (!day.trips.includes(what)) day.trips.push(what);
              if (!day.refs.some(r => r.tripId === ref.tripId && r.legKey === ref.legKey)) day.refs.push(ref);
              // A leg that runs past the board's range, for the join below.
              if (i === 0 && place.fromPrev) day.fromPrev = true;
              if (i === place.span - 1 && place.toNext) day.toNext = true;
            }
            if (!row.legs.some(l => l.tripId === ref.tripId && l.key === ref.legKey)) row.legs.push({ ...leg, tripId: ref.tripId, what });
          }
        }
      }
    }

    /* THE REST BETWEEN BACK-TO-BACK DAYS, on the later trip's first day: from
       the earlier trip's return to the yard to the later one's departure, by
       the same `restBetween` the driver picker ranks with. Unknown when either
       leg has no times, which reads as a question rather than as enough. One
       trip over several days is one trip, so it has no rest inside it. Where
       a day follows two trips, the worst rest is the one shown: a short one,
       then an unknown one, then the shortest of the rest. */
    const worse = (a, b) => {
      const rank = r => (r.hours == null ? 1 : r.hours < REST_HOURS ? 0 : 2);
      return rank(a) - rank(b) || (a.hours ?? 0) - (b.hours ?? 0);
    };
    for (const row of rows) {
      for (const later of row.legs) {
        const before = iso(addDays(parseISO(later.from), -1));
        const at = daysBetween(weekStart, parseISO(later.from));
        const day = row.days[at];
        if (!day) continue;
        for (const earlier of row.legs) {
          if (earlier === later || earlier.to !== before) continue;
          const rest = { hours: restBetween(earlier, later), after: earlier.what, before: later.what };
          if (!day.rest || worse(rest, day.rest) < 0) day.rest = rest;
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
        if (!day) continue;
        day.off = off.reason || 'Time off';
        day.reason = off.reason || null;
        day.offOf = off;
        day.offFromPrev = i === 0 && place.fromPrev;
        day.offToNext = i === place.span - 1 && place.toNext;
      }
    }

    /* WHICH DAYS ARE ONE BAR. A leg over several days is drawn as one bar, as
       the board draws it, and so is one stretch of time off: a day joins the
       day before when both are the same leg or the same time off. A day that
       shows a rest is the first day of its leg, so it starts a bar. Time off
       beats a trip in a cell, so it also cuts that trip's bar. At either end
       of the board's range, a day joins on when its leg or time off runs past
       the range. */
    const sameLeg = (a, b) => a.refs.some(r => b.refs.some(s => s.tripId === r.tripId && s.legKey === r.legKey));
    for (const row of rows) {
      row.days.forEach((day, i) => {
        const prev = row.days[i - 1], next = row.days[i + 1];
        if (day.off) {
          day.joinPrev = prev ? prev.offOf === day.offOf : !!day.offFromPrev;
          day.joinNext = next ? next.offOf === day.offOf : !!day.offToNext;
        } else if (day.trips.length) {
          day.joinPrev = !day.rest && (prev ? !prev.off && sameLeg(prev, day) : !!day.fromPrev);
          day.joinNext = next ? !next.off && !next.rest && sameLeg(day, next) : !!day.toNext;
        }
      });
    }
    return rows;
  }

  /* The drawing a bar's first day carries: a bus for a trip, and for time off
     the reason, by the values the driver editor's Reason list saves. A reason
     outside that list, or none, takes the crossed-out day. */
  const TRIP_GLYPH = '#m-directions_bus-fill';
  const OFF_GLYPHS = new Map([
    ['vacation', '#m-beach_access-fill'],
    ['sick', '#m-medical_services-fill'],
    ['personal', '#m-person-fill'],
    ['suspended', '#m-block'],
  ]);
  const OFF_GLYPH = '#m-event_busy-fill';

  /* Draws `count` of the board's `days`, from its day `first`. Every day cell
     keeps the board's own day number, so the selected trip's days light the
     same columns whichever week is shown. */
  function drawAvailability(rows, weekStart, first, count, days) {
    availGrid.textContent = '';
    availEl.style.setProperty('--scheduler-days', String(count));
    asideSlot.classList.toggle('scheduler-aside--two', count > 7);
    // Two weeks on the board, so a day's title names its date.
    const two = days > 7;

    /* The column header, then every driver, edge to edge in the pane. The
       rows are in priority order, each priority parted from the last by a
       rule, and the priority is on the name's title. */
    const head = el('div', 'scheduler-avail__days');
    const corner = el('div', 'scheduler-avail__day scheduler-avail__day--head', 'Driver');
    head.appendChild(corner);
    for (let i = first; i < first + count; i++) {
      const d = addDays(weekStart, i);
      /* One letter, taken from the locale's own `short` weekday, for the
         quietest header the seven columns can carry. It repeats -- T and T, S
         and S -- so the day's full name goes on `title`, as a driver's does on
         the name beside it, with its date when two weeks are on the board.
         Spread rather than `slice`, so the unit is a code point. */
      const short = d.toLocaleDateString(undefined, { weekday: 'short' });
      // The letter is its own span, so a theme can draw today's as a disc.
      const cell = el('div', 'scheduler-avail__day');
      cell.appendChild(el('span', 'scheduler-avail__letter', [...short].slice(0, 1).join('')));
      cell.title = d.toLocaleDateString(undefined, two
        ? { weekday: 'long', month: 'short', day: 'numeric' } : { weekday: 'long' });
      // Weekend letters dim, as the board's day header does; the day rules are
      // drawn in the body only.
      if (isWeekend(d)) cell.classList.add('scheduler-avail__day--weekend');
      // Today is marked on its letter, as on the board's header.
      if (iso(d) === iso(new Date())) { cell.classList.add('scheduler-avail__day--today'); cell.setAttribute('aria-current', 'date'); }
      cell.dataset.day = String(i);
      if (i === 7) cell.classList.add('scheduler-avail__day--week');
      head.appendChild(cell);
    }
    availGrid.appendChild(head);

    /* Where the priority changes, the first driver of the new one has a rule
       above its row. A driver with no priority is set apart rather than left
       in the last priority's group, which would say something untrue about
       them. */
    let band;
    rows.forEach((row, n) => {
      const p = row.driver.priority ?? null;
      const starts = n === 0 || p !== band;
      band = p;
      const r = el('div', `scheduler-avail__row${starts && n ? ' scheduler-avail__row--break' : ''}`);
      /* The full name and the priority go on the title, because the cell
         shows `short_name` when there is one and ellipses a long name. `title`
         is hover only, so it does not help a keyboard or screen-reader user
         tell two similar names apart. */
      const shown = row.driver.short_name || row.driver.name || 'Driver';
      const nameEl = el('div', 'scheduler-avail__name', shown);
      nameEl.title = `${row.driver.name || shown} · ${p == null ? 'No priority' : `Priority ${p}`}`;
      // A press picks out the driver's trips on the board; see `markDriverTrips`.
      nameEl.setAttribute('role', 'button');
      nameEl.tabIndex = 0;
      nameEl.setAttribute('aria-pressed', String(row.driver.id === focusDriver));
      nameEl.dataset.driverId = row.driver.id;
      r.appendChild(nameEl);
      row.days.slice(first, first + count).forEach((day, j) => {
        const i = first + j;
        const busy = day.trips.length > 0;
        /* A busy day after a trip the day before shows the hours between
           them: under REST_HOURS, or overlapping, in the warning tone, and
           unknown as a question mark until both trips have times. Time off
           beats it, as it beats busy.
           A day that is both time off and a trip keeps the day-off colour and
           says both: the mark an overlap takes, the reason and the trip in
           its title, and a press that selects the trip, because that day is a
           driver booked while away and the roster is where it shows. */
        const offAndOn = !!day.off && busy;
        const rest = !day.off && busy ? day.rest : null;
        const tight = rest?.hours != null && rest.hours < REST_HOURS;
        const cls = day.off ? 'scheduler-avail__cell scheduler-avail__cell--off'
          : busy ? 'scheduler-avail__cell scheduler-avail__cell--busy'
          : 'scheduler-avail__cell';
        const cell = el('div', cls);
        cell.dataset.day = String(i);
        if (i === 7) cell.classList.add('scheduler-avail__cell--week');
        if (rest) cell.classList.add('scheduler-avail__cell--rest');
        if (tight) cell.classList.add('scheduler-avail__cell--tight');
        if (rest?.hours != null && rest.hours < REST_SHORT_HOURS) cell.classList.add('scheduler-avail__cell--short');
        // `--busy` gives the press its cursor and `--rest` shows the mark; `--off` paints over both.
        if (offAndOn) cell.classList.add('scheduler-avail__cell--busy', 'scheduler-avail__cell--rest');
        // Whole hours, rounded down, so a rest is never shown longer than it is.
        const restText = !rest ? null : rest.hours == null ? '?' : rest.hours < 0 ? '!' : `${Math.floor(rest.hours)}h`;
        const restWords = !rest ? null
          : rest.hours == null ? `rest after ${rest.after} unknown until both trips have times`
          : rest.hours < 0 ? `overlaps ${rest.after}`
          : `${Math.floor(rest.hours)}h rest after ${rest.after}${tight ? `, under ${REST_HOURS}` : ''}`;
        cell.appendChild(el('span', null, restText ?? (offAndOn ? '!' : (day.off || day.trips.join(' · ')))));
        /* One bar per leg or time off: a day joined to its neighbour runs to
           that edge of its cell, and the bar's first day shown carries its
           drawing, unless that day shows a rest or an overlap instead. */
        if (day.joinPrev) cell.classList.add('scheduler-avail__cell--from-prev');
        if (day.joinNext) cell.classList.add('scheduler-avail__cell--to-next');
        if ((day.off || busy) && !restText && !offAndOn && (!day.joinPrev || j === 0)) {
          const glyph = svgUse(day.off ? (OFF_GLYPHS.get(day.reason) || OFF_GLYPH) : TRIP_GLYPH, '16', '0 0 32 32');
          glyph.classList.add('scheduler-avail__glyph');
          cell.appendChild(glyph);
        }
        if (day.off || busy) {
          const said = offAndOn ? `${day.off}, and on ${day.trips.join(' · ')}` : (day.off || day.trips.join(' · '));
          cell.title = `${row.driver.name || ''} — ${said}${restWords ? ` · ${restWords}` : ''}`;
        }
        if (day.refs.length) availRefs.set(cell, day.refs);
        r.appendChild(cell);
      });
      availGrid.appendChild(r);
    });
  }

  /* Marks the selected trip's days down the roster, so "who is free then"
     needs no counting; null clears it. Each free cell on those days is an open
     mark, joined to an open neighbour, and a driver free on every day shown is
     whole, green rather than grey. */
  const OPEN = ['scheduler-avail__cell--on-day', 'scheduler-avail__day--on-day', 'scheduler-avail__cell--open',
    'scheduler-avail__cell--whole', 'scheduler-avail__cell--open-prev', 'scheduler-avail__cell--open-next'];
  function markAvailDays(start, span) {
    for (const c of availGrid.querySelectorAll('.scheduler-avail__cell--on-day, .scheduler-avail__day--on-day')) c.classList.remove(...OPEN);
    if (start == null) return;
    // A day the roster is not showing matches no cell, so the days of a trip
    // that runs on into the other week are simply not there to light.
    const end = start + Math.max(1, span || 1) - 1;
    for (let i = start; i <= end; i++) {
      for (const d of availGrid.querySelectorAll(`.scheduler-avail__day[data-day="${i}"]`)) d.classList.add('scheduler-avail__day--on-day');
      for (const c of availGrid.querySelectorAll(`.scheduler-avail__cell[data-day="${i}"]`)) c.classList.add('scheduler-avail__cell--on-day');
    }
    // Counted against the days shown, so a trip running on into the other
    // week is judged by the part the roster can see.
    const days = availGrid.querySelectorAll('.scheduler-avail__days > .scheduler-avail__day--on-day').length;
    if (!days) return;
    for (const r of availGrid.querySelectorAll('.scheduler-avail__row')) {
      const open = [...r.querySelectorAll('.scheduler-avail__cell--on-day')]
        .filter(c => !c.matches('.scheduler-avail__cell--busy, .scheduler-avail__cell--off'));
      if (!open.length) continue;
      const all = open.length === days;
      for (const c of open) {
        c.classList.add('scheduler-avail__cell--open');
        if (all) c.classList.add('scheduler-avail__cell--whole');
        const prev = c.previousElementSibling;
        if (open.includes(prev)) {
          c.classList.add('scheduler-avail__cell--open-prev');
          prev.classList.add('scheduler-avail__cell--open-next');
        }
      }
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
  function selectedBar() { return gridEl.querySelector('.scheduler-bar[aria-current="true"]'); }

  /* A bar's leg is named by `legKey`, the key week.js gives the leg; `leg`
     is the old word, which the old columns are still read by. */
  function barRef(bar) {
    return {
      tripId: bar.dataset.tripId,
      leg: bar.dataset.leg || 'outbound',
      legKey: bar.dataset.legKey || bar.dataset.leg || 'outbound',
      busId: bar.dataset.busId || null,
      assignmentId: bar.dataset.assignmentId || null,
    };
  }
  /* Whether a bar is on the leg a key names. A link from a page that still
     reads its trips without their legs names the leg by its old word. */
  const barOnLeg = (bar, key) => bar.dataset.legKey === key || (bar.dataset.leg || 'outbound') === key;
  const refLegKey = ref => ref.legKey ?? ref.leg ?? 'outbound';

  function findBar(ref) {
    if (!ref?.tripId) return null;
    return [...gridEl.querySelectorAll(`.scheduler-bar[data-trip-id="${CSS.escape(ref.tripId)}"]`)]
      .find(b => barOnLeg(b, refLegKey(ref)) && (b.dataset.assignmentId || null) === ref.assignmentId) ?? null;
  }

  function isEditorBar(bar) {
    const ref = panelArgs?.ref;
    return !panelEl.hidden && !!ref && !panelArgs.draft && bar.dataset.tripId === ref.tripId
      && barOnLeg(bar, refLegKey(ref)) && (bar.dataset.assignmentId || null) === ref.assignmentId;
  }

  // Any bar of the trip open in the editor. Those are locked on the board.
  function isEditorTrip(bar) {
    return !panelEl.hidden && !!panelArgs?.ref && !panelArgs.draft && bar.dataset.tripId === panelArgs.ref.tripId;
  }

  /* The shortcut bar follows the selection on a phone, where it docks as a
     sheet carrying the trip's actions. On the floating board it is the trip's
     card and shows only when asked for, never beside the trip's own editor.
     It is placed the way a calendar's event popover is: beside the trip's first day, where everything the trip
     says is written, over the trip's own later days or the board after it,
     with its arrow at the first day's middle; on the first day's left where
     the right has no room. Where neither side has room it goes above or below
     the trip, slid back inside the board at either edge with its arrow still
     pointing at the trip. Nothing is taken from the trip itself, so the slots
     are the same on every trip. It goes straight after its bar, inside that bar's own track,
     so Tab reaches the slots from the selected trip; the track does not clip,
     so the bar can sit outside it. It is taken away while a bar is dragged,
     because the trip it points at is moving. */
  const TIP_GAP = 4;
  let poppedFor = null;
  // True while a bar's right-click menu is open, which the card waits behind.
  let menuHidesCard = false;
  // The Contacts window, while it is open: its overlay registration and slot.
  let contactsOpen = null;
  const barKey = bar => `${bar.dataset.tripId}|${bar.dataset.legKey}|${bar.dataset.assignmentId}`;
  /* The trip whose card was put away by picking one of its actions, so the
     card does not stand over what the action opened. Selecting another trip,
     or this one again after letting it go, brings the card back. */
  let cardAwayFor = null;
  /* THE FLOATING CARD OPENS WHEN ASKED. A click on a bar only selects it,
     since a click is also how a trip is double-clicked open, dragged or
     picked to move by key. The card opens from a part of the bar marked
     `data-card-opener`, its alert count, its update line or a live bar's
     Live pill, or from Space on the bar, and the same press, Space or Escape
     puts it away, as selecting another trip does. It never stands beside the
     trip's own editor, and opening the editor forgets it was asked for. */
  let cardOpenFor = null;
  const floatingCard = () => pageEl?.getAttribute('data-board') !== 'compact';
  const cardAsked = bar => barKey(bar) === cardOpenFor;
  // Whether this bar's card is on screen now, which a press toggles.
  const cardShowing = bar => bar === selectedBar() && cardAsked(bar) && !barShortcuts?.hidden;
  // Asking again brings back a card put away by one of its actions.
  /* THE CARD IS THREE CARDS: Alerts, opened from a bar's alert badge, Updates,
     from its update line, and Live, from the pill of a bus out on the road.
     Each draws only its own part, sized to what it holds; Space opens the
     whole card; an out trip keeps On the road, Needs and Updates as tabs. */
  let cardSection = '';
  let cardTrigger = null;
  function cardOrigin(bar) {
    if (cardTrigger?.isConnected && (cardTrigger === bar || cardTrigger.closest('.scheduler-bar') === bar)) return cardTrigger;
    const selector = cardTrigger?.matches('.scheduler-bar__alert') ? '.scheduler-bar__alert'
      : cardTrigger?.matches('.scheduler-road__dot') ? '.scheduler-road__dot'
      : cardTrigger?.matches('.scheduler-bar__update') ? '.scheduler-bar__update' : null;
    return (selector && bar.querySelector(selector)) || bar;
  }
  function askCard(bar, open, section = '') {
    if (open && !section) cardTrigger = bar;
    cardOpenFor = open ? barKey(bar) : null;
    cardSection = open ? section : '';
    if (open && bar.dataset.road && section) roadTabs.set(barKey(bar), section);
    if (open && cardAwayFor === barKey(bar)) cardAwayFor = null;
    placeBarOpen();
  }
  function putCardAway(bar) {
    cardAwayFor = barKey(bar);
    const focused = barShortcuts?.contains(document.activeElement);
    placeBarOpen();
    // Focus that was on a slot goes back to the trip, until the action takes it.
    if (focused) bar.focus();
  }
  function placeBarOpen(bar = selectedBar()) {
    if (!barShortcuts) return;
    const docked = !floatingCard();
    // A board set aside behind a panel in front of it has no trip to point at.
    const none = !bar?.dataset.tripId || menuHidesCard || gridEl.querySelector('.scheduler-bar--dragging')
      || !!schEl.closest('[inert]') || barKey(bar) === cardAwayFor
      || (!docked && !cardAsked(bar));
    barShortcuts.hidden = none;
    for (const trigger of gridEl.querySelectorAll('[data-card-opener]')) {
      trigger.setAttribute('aria-controls', barShortcuts.id);
      const owner = trigger.closest('.scheduler-bar');
      const section = window.SchedulerBar.cardSectionOf(trigger);
      trigger.setAttribute('aria-expanded', String(!none && owner === bar && (bar.dataset.road ? roadTabOf(bar) === section : cardSection === section)));
    }
    if (cardSection && !bar?.dataset.road) barShortcuts.dataset.section = cardSection; else delete barShortcuts.dataset.section;
    // The Contacts window goes with its trip when it is put down.
    if (none) { poppedFor = null; schEl.style.removeProperty('--scheduler-docked-h'); return; }
    if (barShortcuts.previousElementSibling !== bar) bar.after(barShortcuts);
    // A card that comes to a trip afresh starts compact, its note and updates
    // closed, however they were left the last time it showed.
    // A card drawn again for the trip it already shows does not pop again,
    // so its rows do not fade back in under the pointer.
    if (barKey(bar) === poppedFor) barShortcuts.removeAttribute('data-pop');
    if (barKey(bar) !== poppedFor) {
      updatesOpenFor = null;
      cardEdit = null;
      // The quick update's box stays only with the trip it holds words for.
      if (!(quickDraft.tripId === bar.dataset.tripId && quickDraft.text)) quickOpenFor = null;
    }
    drawShortcuts(bar);
    /* The card pops each time it comes to a trip, and not while it follows
       the same one through a scroll or a redraw. It starts once the bar is
       placed, because the pop's scale would shrink what the placing measures. */
    // A hovered trip that is then selected keeps the card it already shows.
    const target = barKey(bar);
    const pop = () => {
      if (target === poppedFor) return;
      poppedFor = target;
      barShortcuts.removeAttribute('data-pop');
      void barShortcuts.offsetWidth;
      barShortcuts.setAttribute('data-pop', '');
    };

    /* Compact: a block one slot wide has nothing to float beside, so the bar
       docks to the bottom edge and takes the trip's rows with it. It stays
       where it was put in the track, because app.css fixes it to the window
       from there and that is what keeps the board's tokens inherited. None of
       the placing below applies to a bar that is not pointing at anything. */
    barShortcuts.toggleAttribute('data-docked', docked);
    fitUpdates();
    if (docked) {
      drawDockedTrip(bar);
      wearShell();
      barShortcuts.removeAttribute('data-out');
      barShortcuts.removeAttribute('data-side');
      /* The sheet stands over the foot of the board, so the pane is given that
         much more to scroll and the last bus can still be brought out from
         under it. The height is measured because the rows a bar draws are the
         view's to choose. */
      schEl.style.setProperty('--scheduler-docked-h',
        `${Math.round(barShortcuts.getBoundingClientRect().height)}px`);
      /* A trip the sheet has just come up over is scrolled clear of it, once:
         the bar's scroll margin is the sheet's height, so `nearest` moves the
         board only as far as that takes and not at all when it is clear. */
      const fresh = target !== poppedFor;
      pop();
      if (fresh) bar.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
      return;
    }
    schEl.style.removeProperty('--scheduler-docked-h');
    dockedDrawn = '';
    barShortcuts.querySelector('.scheduler-bar-shortcuts__trip')?.remove();
    /* The room is measured on screen, against the pane and the two bands that
       stick to its edges, and then written in the track's own coordinates,
       which is where the bar is laid out. */
    const pane = schEl.getBoundingClientRect();
    // The card floats fixed to the window, so the pane's edge never cuts it,
    // and its place is written in the window's coordinates.
    const fixed = getComputedStyle(barShortcuts).position === 'fixed';
    const host = fixed ? { top: 0, left: 0 } : barShortcuts.parentElement.getBoundingClientRect();
    const box = bar.getBoundingClientRect();
    // Its layout width, which a pop still running does not scale.
    const tip = { width: barShortcuts.offsetWidth };
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
    /* THE CARD IS ONE SIZE, app.css's 33rem, and never taller than the
       board's room, where its content scrolls inside it. */
    const INSET = 16;
    const days = [...gridEl.querySelectorAll('.scheduler-day')].map(d => d.getBoundingClientRect());
    /* A bar out on the road stands its rows in today's column, road-bar.js's
       `--scheduler-today`, so the card goes beside that day instead. */
    const lit = Number(bar.style.getPropertyValue('--scheduler-today')) || 0;
    const start = Math.max(0, Math.min(days.length - 1, (Number(bar.dataset.start) || 0) + lit));
    /* BESIDE THE TRIP, THE CARD IS AS WIDE AS THE TWO DAYS IT STANDS OVER, less
       the 16px in from each of their edges, and no wider than 20rem or
       narrower than 16rem, so it hides no more than the two bars next to it. */
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const span = days[start + 2] && days[start + 1] ? days[start + 2].right - days[start + 1].left
      : days[start - 1] && days[start - 2] ? days[start - 1].right - days[start - 2].left : 0;
    if (span) barShortcuts.style.setProperty('--scheduler-card-w', `${Math.max(16 * rem, Math.min(20 * rem, span - 2 * INSET))}px`);
    else barShortcuts.style.removeProperty('--scheduler-card-w');
    const roomH = pane.bottom - ceiling - 2 * TIP_GAP;
    const cardMax = `${Math.min(33 * parseFloat(getComputedStyle(document.documentElement).fontSize), roomH)}px`;
    // A card of one part is as tall as that part, up to the full card's height.
    barShortcuts.style.setProperty('--scheduler-card-h', cardSection ? 'auto' : cardMax);
    barShortcuts.style.setProperty('--scheduler-card-max', cardMax);
    const list = barShortcuts.querySelector('.scheduler-card__updates[data-open] .scheduler-card__update-list');
    list?.style.removeProperty('max-block-size');
    tip.width = barShortcuts.offsetWidth;
    let height = barShortcuts.offsetHeight;
    // Shortens a card showing all its updates to the room it has, so it never
    // runs off the board.
    const fitTo = room => {
      if (list && height > room) {
        list.style.maxBlockSize = `${Math.max(40, list.offsetHeight - (height - room))}px`;
        height = barShortcuts.offsetHeight;
      }
    };
    /* Beside the first day: over the two days after it, 16px in from their
       first edge, or over the two days before it where the two after are not
       both on screen, as at the week's end or on a board scrolled sideways.
       A bar out on the road stands its rows in today's column, road-bar.js's
       `--scheduler-today`, so the card goes beside that day instead, clear of
       what it says. */
    const shown = (a, b) => !!days[a] && !!days[b] && days[a].left + INSET >= first && days[b].right - INSET <= pane.right;
    const side = shown(start + 1, start + 2) ? 'right' : shown(start - 2, start - 1) ? 'left' : null;
    if (side && days.length) {
      const middle = Math.max(box.top, ceiling) / 2 + Math.min(box.bottom, pane.bottom) / 2;
      const y = Math.max(ceiling + TIP_GAP, Math.min(middle - height / 2, pane.bottom - TIP_GAP - height));
      const x = side === 'right' ? days[start + 1].left + INSET : days[start - 1].right - INSET - tip.width;
      barShortcuts.dataset.side = side;
      barShortcuts.style.setProperty('--scheduler-open-top', `${y - host.top}px`);
      barShortcuts.style.setProperty('--scheduler-open-start', `${x - host.left}px`);
      /* The arrow at the middle of what was pressed to open the card, the
         update row or the alert, and at the bar's middle for any other way
         in, at least 12px in from a corner. */
      const pressed = bar.querySelector('[data-card-opener][aria-expanded="true"]')?.getBoundingClientRect();
      const point = pressed ? Math.max(pressed.top, ceiling) / 2 + Math.min(pressed.bottom, pane.bottom) / 2 : middle;
      barShortcuts.style.setProperty('--scheduler-open-tip', `${Math.max(12, Math.min(height - 12, point - y))}px`);
      fadeUpdates();
      pop();
      return;
    }
    /* Above the trip where it fits, else below where it fits, else on the
       roomier side. */
    const roomAbove = box.top - ceiling - TIP_GAP;
    const roomBelow = pane.bottom - box.bottom - TIP_GAP;
    const above = roomAbove >= height || (roomBelow < height && roomAbove > roomBelow);
    fitTo(above ? roomAbove : roomBelow);
    barShortcuts.dataset.side = above ? 'above' : 'below';
    barShortcuts.style.setProperty('--scheduler-open-top',
      `${(above ? box.top - height - TIP_GAP : box.bottom + TIP_GAP) - host.top}px`);
    const last = pane.right - tip.width - TIP_GAP;
    // The edge the bar's writing starts at: its own, or today's column's.
    const edge = lit && days[start] ? Math.max(box.left, days[start].left) : box.left;
    const x = Math.max(first, Math.min(edge, last));
    barShortcuts.style.setProperty('--scheduler-open-start', `${x - host.left}px`);
    // Half a slot in from where the trip's writing starts, wherever the bar ended up.
    barShortcuts.style.setProperty('--scheduler-open-tip',
      `${Math.max(8, Math.min(tip.width - 20, edge - x + 16))}px`);
    fadeUpdates();
    pop();
  }

  /* The other bars of the selected trip, its other buses and its other leg,
     and every bar of the trip in the editor, ringed as app.css draws them, so a
     trip's buses are found together on a busy day. The editor's are also
     locked. */
  /* The open trip's ring is one SVG stroke round the bar, over the rings
     drawn under the bar's own content, which app.css breathes. */
  const SVG_NS = 'http://www.w3.org/2000/svg';
  function openRing() {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'scheduler-bar__open-ring');
    svg.setAttribute('aria-hidden', 'true');
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('width', '100%');
    rect.setAttribute('height', '100%');
    svg.append(rect);
    return svg;
  }

  /* A LONG ROW KEEPS ITS LEFT EDGE WITH THE OTHERS. A bar's customer and
     update rows may run as wide as their words, and every row sticks at the
     bus column's edge as the board scrolls; but a sticky row that meets the
     bar's end is pushed back past that edge. So while a bar's start is under
     the bus column, those two rows are held to the room between the edge and
     the bar's end, `--scheduler-row-room`, which app.css reads, and their
     words are cut there instead. The edge is where the destination row
     stands, read rather than worked out. */
  function fitStuckRows() {
    for (const bar of gridEl.querySelectorAll('.scheduler-bar')) {
      if (!(Number(bar.dataset.span) > 1)) continue;
      const dest = bar.querySelector(':scope > .scheduler-bar__dest');
      if (!dest) continue;
      const box = bar.getBoundingClientRect();
      const cs = getComputedStyle(bar);
      const at = dest.getBoundingClientRect().left;
      if (at > box.left + parseFloat(cs.paddingLeft) + 0.5) {
        bar.style.setProperty('--scheduler-row-room', `${Math.max(0, box.right - parseFloat(cs.paddingRight) - at)}px`);
      } else bar.style.removeProperty('--scheduler-row-room');
    }
  }

  function markTripBars() {
    const picked = selectedBar();
    for (const bar of gridEl.querySelectorAll('.scheduler-bar[data-trip-id]')) {
      const open = isEditorTrip(bar);
      bar.classList.toggle('scheduler-bar--open', open);
      const ring = bar.querySelector(':scope > .scheduler-bar__open-ring');
      if (open && !ring) bar.append(openRing());
      else if (!open) ring?.remove();
      bar.classList.toggle('scheduler-bar--same-trip', !open && bar !== picked
        && !!picked && bar.dataset.tripId === picked.dataset.tripId);
    }
  }

  function syncSelection() {
    const bar = selectedBar();
    if (!bar || barKey(bar) !== cardAwayFor) cardAwayFor = null;
    if (!bar || !cardAsked(bar)) cardOpenFor = null;
    placeBarOpen(bar);
    markTripBars();
    /* Selecting one of the picked driver's own trips keeps them picked, to
       read their week a trip at a time. Selecting a dimmed trip moves on from
       that driver, so the board comes back up around it. */
    if (bar && focusDriver != null && !bar.classList.contains('scheduler-bar--driver')) pickDriver(null);
    // The roster moves to the selected trip's week, and lights its days.
    drawRoster();
    followFocus();
    // What this tab is on has changed, so everyone else's board says so.
    presenceTell();
  }

  /* The Email thread box, which the Booking contact menu opens to add or
     change the thread's web address. Its Done sets the hidden field, which
     the trip's Save writes; an empty box takes the thread away. */
  const threadModal = document.getElementById('scheduler-thread-modal');
  const threadInput = document.getElementById('scheduler-thread-url');
  const threadError = document.getElementById('scheduler-thread-error');
  let threadDone = null;
  function askThread(current, done) {
    if (!threadModal || !threadInput) return;
    threadDone = done;
    threadInput.value = current;
    threadError.textContent = '';
    threadInput.removeAttribute('aria-invalid');
    document.getElementById('scheduler-thread-h').textContent = current ? 'Change email thread' : 'Add email thread';
    window.Rux?.modal?.open?.(threadModal);
    threadInput.focus();
  }
  const finishThread = () => {
    const value = threadInput.value.trim();
    if (value && !/^https?:\/\//i.test(value)) {
      threadError.textContent = 'Paste the web address of the email thread, starting with https://.';
      threadInput.setAttribute('aria-invalid', 'true');
      threadInput.focus();
      return;
    }
    const done = threadDone;
    threadDone = null;
    window.Rux?.modal?.close?.(threadModal);
    done?.(value);
  };
  document.getElementById('scheduler-thread-done')?.addEventListener('click', finishThread);
  threadInput?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); finishThread(); } });
  threadModal?.addEventListener('rux:modal-closed', () => { threadDone = null; });

  /* ── The update prompt ── A save that changes something the customer would
     ask about asks for a line for the trip's updates first: the dates, the
     times or route, the destination, the customer or booking contact, the
     quote, the contract, a PO, an invoice or a payment. The buses, the drivers
     and the bar's colour ask nothing, because they are the office's own
     arrangements, and a new trip asks nothing. `customerChange` names what
     changed, a phrase each, and its first phrase is the line the box comes
     filled with. */
  function customerChange(patch) {
    const said = [];
    const keys = [];
    const has = (...k) => k.some(x => x in patch);
    const now = k => (k in patch ? patch[k] : editing.before[k]);
    const day = d => parseISO(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const sayChange = (key, text) => { keys.push(key); said.push(text); };
    // A quote marked sent comes first, so it is the line the box is filled with.
    if (has('quote_sent_price', 'quote_sent_on') && now('quote_sent_price') != null) {
      sayChange('quote_sent', `Quote sent, ${usdCents(Number(now('quote_sent_price')))}`);
    }
    if (has('start_date', 'end_date', 'other_legs')) {
      const from = now('start_date');
      const to = now('end_date') || from;
      sayChange('dates', from ? `Moved the dates to ${day(from)}${to && to !== from ? `–${day(to)}` : ''}` : 'Changed the dates');
    }
    if (has('destination')) sayChange('destination', patch.destination ? `Changed the destination to ${patch.destination}` : 'Changed the destination');
    if (has('trip_type', 'leg_kind') || routePlan().work) sayChange('route', 'Changed the times or route');
    if (has('customer')) sayChange('customer', patch.customer ? `Changed the customer to ${patch.customer}` : 'Changed the customer');
    if (has('booking_contact_id', 'booking_contact_name', 'booking_contact_phone', 'booking_contact_email')) {
      sayChange('contact', 'booking_contact_name' in patch && patch.booking_contact_name
        ? `Changed the booking contact to ${patch.booking_contact_name}` : 'Changed the booking contact');
    }
    if (has('quoted_price') || linesPatch()?.work) {
      sayChange('quote', patch.quoted_price != null ? `Quoted ${usd(Number(patch.quoted_price))}` : 'Changed the quote');
    }
    if (has('contract_status', 'contract_signed_on', 'contract_note')) sayChange('contract', patch.contract_status === 'Signed' ? 'Contract signed' : 'Changed the contract');
    const po = posPatch();
    if (po?.work || has('po_received', 'po_ref', 'po_amount')) {
      const added = po?.inserts.find(r => r.ref);
      sayChange('po', added ? `Added PO ${added.ref}` : 'Changed the PO');
    }
    const inv = invoicesPatch();
    if (inv?.work || has('invoice_status', 'invoiced', 'invoice_number')) {
      const added = inv?.inserts.find(r => r.number);
      sayChange('invoice', added ? `Added invoice ${added.number}` : 'Changed the invoice');
    }
    const pay = paymentsPatch();
    if (pay?.work) {
      const added = pay.inserts.find(r => Number(r.amount) > 0);
      sayChange('payment', added ? `Recorded a payment of ${usd(Number(added.amount))}` : 'Changed a payment');
    }
    return said.length ? { said, keys, line: said[0] } : null;
  }

  /* THE UPDATE PROMPT: a box for a new update, over the trip's updates so
     far. Every Save opens it, so each change is told or skipped on purpose.
     Adding, changing and deleting an update otherwise is the trip's card.

     It is a step Save waits on, and resolves `{ kind, body }`:
     `update` from Save with update; `nothing` from Save, no update after a
     change the customer would ask about, whose row keeps the change's own line
     and is never drawn, so the bar's age still runs from the last real update;
     `none` from Save, no update after any other change, which writes nothing.
     Closing it resolves null, and Save goes back to the trip unsaved. A new
     trip's box comes filled with Quote not sent, or Quote sent and its price
     once the Billing tab marks it, a customer-facing change's with its own
     line, and any other's empty. */
  const updateModal = document.getElementById('scheduler-update-modal');
  const updateText = document.getElementById('scheduler-update-text');
  const updateSave = document.getElementById('scheduler-update-save');
  const updateSkip = document.getElementById('scheduler-update-skip');
  const updateClose = document.getElementById('scheduler-update-close');
  const updateCloseWrap = document.getElementById('scheduler-update-close-wrap');
  const updateFooter = document.getElementById('scheduler-update-footer');
  const updateWhat = document.getElementById('scheduler-update-what');
  let updateSettle = null;   // Save's step, while Save opened the window
  let updateChange = null;
  function fillUpdateWindow({ trip, what, line, tripId }) {
    document.getElementById('scheduler-update-trip').textContent = trip;
    updateWhat.textContent = what;
    updateWhat.hidden = !what;
    updateText.value = line;
    updateSave.disabled = !line;
    requestAnimationFrame(fitUpdateText);
    // A new trip has nothing earlier to list.
    document.getElementById('scheduler-updates-section').hidden = !tripId;
    if (tripId) loadLog(tripId);
    window.Rux?.modal?.open?.(updateModal);
    updateText.focus();
    updateText.setSelectionRange(updateText.value.length, updateText.value.length);
  }
  const tripName = t => [t?.destination, t?.customer].filter(Boolean).join(' · ') || 'New trip';
  // `takesOff` is what else the save does that it says first: a clash the new dates make, a check it takes off.
  function askForUpdate(change, creating, trip, takesOff = null) {
    const skipped = change ? { kind: 'nothing', body: change.line, keys: change.keys } : { kind: 'none' };
    if (!updateModal || !updateText) return Promise.resolve(skipped);
    updateChange = change;
    // A save that names no change says nothing above the box, unless a check comes off.
    let what = '';
    if (creating) what = 'You created the trip. Say what the customer has been sent.';
    else if (change) {
      const phrases = change.said.map(p => p.charAt(0).toLowerCase() + p.slice(1));
      what = `You ${phrases.length > 1 ? `${phrases.slice(0, -1).join(', ')} and ${phrases.at(-1)}` : phrases[0]}.`;
    }
    if (takesOff) what = [what, takesOff].filter(Boolean).join(' ');
    const line = creating ? (editing?.quoteSent ? `Quote sent, ${usdCents(editing.quoteSent.price)}` : 'Quote not sent')
      : change?.line ?? '';
    updateSkip.textContent = 'Save, no update';
    updateCloseWrap.hidden = false;
    updateSave.textContent = 'Save with update';
    updateSkip.after(updateSave);
    updateFooter.hidden = false;
    updateClose.setAttribute('aria-label', 'Back to the trip, not saved');
    updateClose.title = 'Back to the trip, not saved';
    return new Promise(resolve => {
      updateSettle = answer => { updateSettle = null; resolve(answer && { ...answer, keys: change?.keys ?? null }); };
      fillUpdateWindow({
        trip: tripName(trip), what, line,
        tripId: creating ? null : trip?.id,
      });
    });
  }
  const answerUpdate = answer => {
    const settle = updateSettle;
    updateSettle = null;
    window.Rux?.modal?.close?.(updateModal);
    settle?.(answer);
  };
  /* The new update's box starts two lines tall and grows with what is
     typed, so an empty window shows more of the trip's updates. */
  function fitUpdateText() {
    if (updateText) fitBox(updateText);
  }
  updateText?.addEventListener('input', () => { updateSave.disabled = !updateText.value.trim(); fitUpdateText(); });
  // Cmd or Ctrl with Enter presses the main button, as a chat box sends.
  updateText?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !updateSave.disabled) { e.preventDefault(); updateSave.click(); }
  });
  updateSave?.addEventListener('click', () => {
    const body = updateText.value.trim();
    if (body) answerUpdate({ kind: 'update', body });
  });
  updateSkip?.addEventListener('click', () => {
    answerUpdate(updateChange ? { kind: 'nothing', body: updateChange.line } : { kind: 'none' });
  });
  updateModal?.addEventListener('rux:modal-closed', () => { updateSettle?.(null); });

  /* The prompt's answer, written once the save has landed. A failure is logged
     and reported, and never undoes the save. */
  async function writeUpdate(tripId, answer) {
    try {
      const actor = await actorName()
        ?? ((await Promise.resolve(window.Rux?.account?.person?.()).catch(() => null))?.name ?? null);
      // `changes` is not null in the table, so an update that names no change
      // leaves it out and takes the column's default.
      const row = { trip_id: tripId, body: answer.body, kind: answer.kind, actor_name: actor };
      if (Array.isArray(answer.keys)) row.changes = answer.keys;
      const { error } = await withTimeout(client.from('trip_updates').insert(row).then(r => r));
      if (error) throw new Error(error.message);
      return true;
    } catch (err) {
      console.warn('The update was not written:', err);
      return false;
    }
  }

  /* The trip changed under the editor. Reload trip drops the editor's changes
     and opens the trip as it is now; Save anyway saves over it and then runs
     what the save was for; closing the box keeps editing. */
  /* A YES OR NO THE BOARD ASKS, in a small dialog: the question is its
     heading and a line may sit under it. Yes resolves true; No, the close
     button, Escape and a press outside resolve false. One question at a time:
     a second one answers the first with no. `field` is one line to type with
     the yes, such as the fuel card in an envelope just printed; it starts
     empty, and the asker reads it once the answer is yes. */
  const askModal = document.getElementById('scheduler-ask-modal');
  const askField = document.getElementById('scheduler-ask-field');
  let askDone = null;
  function ask(question, hint = '', field = null) {
    if (!askModal || !window.Rux?.modal?.open) return Promise.resolve(window.confirm(question));
    return new Promise(resolve => {
      askDone?.(false);
      askDone = resolve;
      document.getElementById('scheduler-ask-h').textContent = question;
      const line = document.getElementById('scheduler-ask-note');
      line.textContent = hint;
      line.parentElement.hidden = !hint;
      const row = document.getElementById('scheduler-ask-field-row');
      if (row) row.hidden = !field;
      if (askField) {
        askField.value = '';
        askField.placeholder = field?.placeholder || '';
        document.getElementById('scheduler-ask-field-label').textContent = field?.label || '';
      }
      window.Rux.modal.open(askModal);
    });
  }
  document.getElementById('scheduler-ask-yes')?.addEventListener('click', () => {
    const done = askDone;
    askDone = null;
    window.Rux?.modal?.close?.(askModal);
    done?.(true);
  });
  askModal?.addEventListener('rux:modal-closed', () => { const done = askDone; askDone = null; done?.(false); });

  const conflictModal = document.getElementById('scheduler-conflict-modal');
  let conflictAfter = null;
  // The update already written when the box opened after it, so Save anyway does not ask for it twice.
  let conflictAnswer = null;
  document.getElementById('scheduler-conflict-save')?.addEventListener('click', async () => {
    const next = conflictAfter;
    const answered = conflictAnswer;
    conflictAfter = null;
    conflictAnswer = null;
    window.Rux?.modal?.close?.(conflictModal);
    if (await saveEditor(next, true, answered)) next?.();
  });
  document.getElementById('scheduler-conflict-reload')?.addEventListener('click', async () => {
    conflictAfter = null;
    conflictAnswer = null;
    window.Rux?.modal?.close?.(conflictModal);
    await reloadEditorTrip();
  });
  conflictModal?.addEventListener('rux:modal-closed', () => { conflictAfter = null; conflictAnswer = null; });

  // Opens the editor's trip afresh on the week of its leg, dropping unsaved changes.
  async function reloadEditorTrip() {
    const { ref, trip } = panelArgs || {};
    if (!ref || !trip) return;
    const from = legByKey(trip, refLegKey(ref))?.from ?? trip.start_date;
    if (from) cursor = mondayOf(parseISO(from));
    await show();
    const bar = findBar(ref);
    if (bar) { selectBar(bar); openPanel(bar); }
    else { closePanel(false); toast('info', 'That trip is not on its week any more'); }
  }

  function selectBar(bar) {
    for (const b of gridEl.querySelectorAll('.scheduler-bar[aria-current="true"]')) if (b !== bar) b.setAttribute('aria-current', 'false');
    bar.setAttribute('aria-current', 'true');
  }

  function clearSelection() {
    for (const b of gridEl.querySelectorAll('.scheduler-bar[aria-current="true"]')) b.setAttribute('aria-current', 'false');
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
  /* The faces are placed from a bar's measured width, so a board that has just
     changed width -- the editor opening beside it, the window resized, the
     compact board taking over -- has to place them again, or a shrunken bar
     keeps a face it can no longer hold and a grown one never gets its. */
  new ResizeObserver(() => requestAnimationFrame(() => { placeBarOpen(); markTripBars(); presenceDraw(); fitStuckRows(); })).observe(gridEl);
  /* The shortcut bar scrolls with its trip, but which side of the trip it fits
     on changes as the board scrolls under the sticky day band, so it is placed
     again. */
  let stuckRowsAsked = false;
  schEl.addEventListener('scroll', () => {
    if (!barShortcuts?.hidden) requestAnimationFrame(() => placeBarOpen());
    nameBoardCorner();
    if (!stuckRowsAsked) {
      stuckRowsAsked = true;
      requestAnimationFrame(() => { stuckRowsAsked = false; fitStuckRows(); });
    }
  }, { passive: true });

  // Enter on the selected bar opens it. Enter on any other bar is app.js's and
  // only selects that bar, even while a different one is selected.
  gridEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.matches?.('.scheduler-bar[aria-current="true"]')) openSelected();
    /* Space shows the bar's card or puts it away. On a bar not selected yet
       the card is asked for here and app.js's Space then selects the bar,
       which keeps a card asked for it. */
    if (e.key === ' ' && e.target.matches?.('.scheduler-bar[data-trip-id]')) {
      e.preventDefault();
      const bar = e.target;
      askCard(bar, !cardShowing(bar));
    }
  });
  /* A press on a card opener shows the card or puts it away, and on a bar
     not selected yet app.js's click then selects it. A double-click's second
     press is the double-click's. */
  gridEl.addEventListener('click', e => {
    const opener = e.target.closest('[data-card-opener]');
    const bar = opener?.closest('.scheduler-bar[data-trip-id]');
    if (!bar || e.detail > 1) return;
    const section = window.SchedulerBar.cardSectionOf(opener);
    cardTrigger = opener;
    askCard(bar, window.SchedulerBar.opensSection(cardShowing(bar), bar.dataset.road ? roadTabOf(bar) : cardSection, section), section);
  });
  gridEl.addEventListener('click', e => {
    const trigger = e.target.closest('[data-crew-overflow]');
    const bar = trigger?.closest('.scheduler-bar[data-trip-id]');
    if (bar && e.detail <= 1) openContactsFrom(bar, trigger);
  });
  // A double-click on a trip opens it, as Enter does; its first click selected it.
  gridEl.addEventListener('dblclick', e => {
    const bar = e.target.closest('.scheduler-bar[data-trip-id]');
    if (!bar || bar !== selectedBar() || e.target.closest('[data-card-opener], [data-crew-overflow]')) return;
    window.getSelection?.()?.removeAllRanges();
    openSelected();
  });

  // Every selection change, from a click, a key or a script, lands here.
  new MutationObserver(syncSelection).observe(gridEl, { subtree: true, attributes: true, attributeFilter: ['aria-current'] });

  /* ── Beside the week, two at most, the editor among them ───────────────────
     Every panel has its own place beside the week: Tasks, Departures, Driver
     availability, Forms, the quote calculator and the stored file stand left
     of it, oldest farthest left, and the trip editor right of it. From md up
     nothing is drawn over the week, which would hide the toolbar's controls
     and the bus column, the two things the week cannot be read without.

     One sum decides it. The week's minimum plus every open panel is what the
     board is asked for, and no more than two panels stand beside the week
     however wide the window, the editor counted, so with it open one list stays
     left of the week. Opening a panel past either closes the oldest, then the
     next, until the new one fits; one with something typed in it asks first,
     and the editor is never closed for room, so where it alone stands in the
     way the new panel does not open and the board says why. A window narrowed
     past the sum closes the oldest panels with nothing typed in them. Below md
     one panel is open at a time, in front of the board.

     The board's width is what this reads, never the schedule's: the board is
     the whole content column whichever panels are open, so it holds still when
     one of them closes, while the schedule's width is this decision's own
     outcome and reading it back would flip-flop.

     `WEEK_MIN` is 33rem, wide enough to read a week's bars by, which leaves a
     20rem list and the 22rem editor beside it, gaps and all, on a 77rem board,
     a laptop's; two weeks ask `TWO_WEEKS_MIN`, 56rem, so the same board keeps
     one list, which comes in front of the week while the editor is open. Both
     stay well over the 19.5rem the tight toolbar is measured to read at in
     app.css, the week's own floor. `SCHEDULE_FLOOR` is a different question
     -- whether the board can show three readable days, three of app.css's
     10rem day floor and the bus column -- and only the compact week asks it. A toolbar under 30rem is one `Today`
     will not fit in beside its week's months, measured in app.css's terms. */
  const WEEK_MIN = 33;
  const TWO_WEEKS_MIN = 56;
  const PANELS_MAX = 2;
  const weekMin = () => (daysShown() === 14 ? TWO_WEEKS_MIN : WEEK_MIN);
  const SCHEDULE_FLOOR = 33;
  const TOOLBAR_TIGHT = 30;
  const boardEl = document.querySelector('.scheduler-board');
  const frameEl = document.querySelector('.scheduler-frame');
  /* The panels open, oldest first. It is kept from what each pass finds open
     rather than pushed to by the openers, so no path can forget to say it
     opened something. */
  let openOrder = [];
  // The panel in front of the board, where one is: below md, the one open.
  let frontPanel = null;
  // The three document panels, which their block further down makes.
  let viewers = {};
  const prepPane = document.getElementById('scheduler-prep-panel');

  const remPx = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const toPx = raw => {
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return 0;
    return String(raw).trim().endsWith('rem') ? n * remPx() : n;
  };
  /* A panel's width, from the token app.css lays it out with rather than from
     the panel itself, which in front of the board has given its width up. A
     document panel's is read off the panel, whose size is its own. */
  const panelWidth = name => toPx(getComputedStyle(document.documentElement).getPropertyValue(name).trim());
  const ownWidth = (el, name) => (el ? toPx(getComputedStyle(el).getPropertyValue(name).trim()) : 0);

  /* EVERY PANEL THE BOARD LAYS OUT: its name, its box, whether it is open,
     the width it takes, how the board closes it for room, and whether
     something typed in it would be lost. The trip editor is the exception:
     it stands right of the week and the board never closes it. */
  const PANEL_NAMES = { roster: 'Drivers', 'to-do': 'Tasks', prep: 'Departures', forms: 'Forms', calc: 'Quote calculator', doc: 'the document', editor: 'the trip editor' };
  const panels = () => [
    { name: 'roster', el: asideSlot, open: availOn, width: () => panelWidth(asideSlot.classList.contains('scheduler-aside--two') ? '--scheduler-roster-two-w' : '--scheduler-list-w'),
      close: () => { availOn = false; placeAvailability(); } },
    { name: 'to-do', el: toDoPane, open: !!toDoPane && !toDoPane.hidden, width: () => panelWidth('--scheduler-list-w'),
      close: () => window.SchedulerToDoList?.close('tasks') },
    { name: 'prep', el: prepPane, open: !!prepPane && !prepPane.hidden, width: () => panelWidth('--scheduler-list-w'),
      close: () => window.SchedulerToDoList?.close('prep') },
    ...Object.values(viewers).map(v => ({ name: v.key, el: v.el, open: !!v.el && !v.el.hidden,
      width: () => ownWidth(v.el, '--scheduler-viewer-w'), close: () => v.close(false), dirty: () => v.dirty })),
    { name: 'editor', el: tripEl, open: !!tripEl && !tripEl.hidden, width: () => panelWidth('--scheduler-editor-w'), editor: true },
  ];

  // The room the open panels ask for, `adding` among them, against the board's width.
  function overRoom(adding = null) {
    const board = boardEl?.getBoundingClientRect().width ?? 0;
    if (!board) return false;
    const open = panels().filter(p => p.open || p.name === adding);
    if (matchMedia('(max-width: 41.98rem)').matches) return open.length > 1;
    if (open.length > PANELS_MAX) return true;
    const gap = parseFloat(getComputedStyle(boardEl).columnGap) || 0;
    return open.reduce((sum, p) => sum + p.width(), 0) + open.length * gap + weekMin() * remPx() > board;
  }

  /* ROOM FOR A PANEL ABOUT TO OPEN. Past what fits beside the week, the oldest
     panel closes, then the next, until the new one fits; one holding typed
     input asks first and stays on a no. The editor is never closed for room:
     where it is what stands in the way, the new panel does not open and the
     board says why. The editor itself always opens. Below md one panel is open
     at a time, so opening one closes the one open. It answers whether the new
     panel may open. */
  async function makeRoom(name) {
    placeRoom();
    const kept = new Set();
    const desk = !matchMedia('(max-width: 41.98rem)').matches;
    // Beside the editor one panel stays, over the week: the new one, or for the editor itself the newest open.
    const besideEditor = () => desk && (name === 'editor' || panels().find(p => p.editor)?.open)
      && panels().filter(p => (p.open || p.name === name) && !p.editor).length <= 1;
    while (overRoom(name) && !besideEditor()) {
      const oldest = openOrder.map(n => panels().find(p => p.name === n))
        .find(p => p && p.open && p.name !== name && !p.editor && !kept.has(p.name));
      if (!oldest) break;
      if (oldest.dirty?.() && !(await ask(`Close ${PANEL_NAMES[oldest.name]}?`, `To open ${PANEL_NAMES[name]}, ${PANEL_NAMES[oldest.name]} closes, and what was typed in it is not kept.`))) {
        kept.add(oldest.name);
        continue;
      }
      oldest.close();
    }
    if (name === 'editor' || !overRoom(name)) return true;
    /* Where the editor alone stands in the way, the panel opens over the week
       beside it, which `placeRoom` lays out. A panel kept open on a no is
       named instead, since that was the answer just given. */
    const editorOpen = panels().find(p => p.editor)?.open;
    if (editorOpen && !kept.size) return true;
    const inWay = [...kept].map(n => PANEL_NAMES[n]);
    toast('info', `No room for ${PANEL_NAMES[name]}`,
      inWay.length ? `Close ${inWay.join(' or ')} to make room for it.` : 'Close a panel to make room for it.');
    return false;
  }
  window.SchedulerPanels = { room: makeRoom };

  function placeRoom() {
    if (!boardEl || !frameEl || !pageEl) return;
    const rem = remPx();
    const board = boardEl.getBoundingClientRect().width;
    // Nothing to measure while the board is hidden, as it is behind a notice.
    if (!board) return;
    const gap = parseFloat(getComputedStyle(boardEl).columnGap) || 0;

    /* What is open, and in what order it was asked for. A panel already in the
       list keeps its place. */
    const all = panels();
    const open = all.filter(p => p.open);
    const names = open.map(p => p.name);
    openOrder = openOrder.filter(name => names.includes(name))
      .concat(names.filter(name => !openOrder.includes(name)));
    const overlay = matchMedia('(max-width: 41.98rem)').matches;

    /* A window narrowed past what fits closes the oldest panels with nothing
       typed in them, one at a time, each close laying the board out again. One
       holding typed input and the editor stay, and the week gives way. */
    // Beside the editor one panel can always stay, over the week.
    const editorOpen = open.some(p => p.editor);
    if (overRoom() && !(editorOpen && !overlay && open.filter(p => !p.editor).length <= 1)) {
      const oldest = openOrder.map(n => open.find(p => p.name === n))
        .find(p => p && !p.editor && !p.dirty?.() && (!overlay || p.name !== openOrder.at(-1)));
      if (oldest) { oldest.close(); return; }
    }

    /* Oldest farthest left: the panels left of the week stand in the order
       they were opened, the newest nearest the week. The editor keeps its own
       place right of it. */
    let place = 0;
    for (const name of openOrder) {
      const p = open.find(x => x.name === name);
      if (p?.el && !p.editor) p.el.style.order = String(place++ - 100);
    }
    for (const p of all) if (!p.open && p.el) p.el.style.removeProperty('order');

    /* Below md nothing is laid out beside the week at all: Carbon's own fixed
       panel stands there, and the one open is in front of the board. From md
       up, where the editor and one other panel are open and the two do not fit
       beside the week, that panel comes in front of the week alone and the
       editor stays beside it, in use. */
    const others = open.filter(p => !p.editor);
    const cover = !overlay && others.length === 1 && open.some(p => p.editor) && overRoom() ? others[0].name : null;
    const front = overlay && openOrder.length ? openOrder.at(-1) : cover;
    frontPanel = front;
    const shown = front && viewers[front] ? 'viewer' : front === 'prep' ? 'to-do' : front;
    if (shown) pageEl.setAttribute('data-takeover', shown);
    else pageEl.removeAttribute('data-takeover');
    pageEl.toggleAttribute('data-cover', !!cover);

    /* Behind the one in front, the board is set aside rather than there to be
       read, so it takes no click and no Tab: what is on screen and what can be
       reached are the same thing. The editor beside a panel over the week is
       not behind it. */
    frameEl.inert = !!front;
    for (const p of all) if (p.el) p.el.inert = !!front && p.name !== front && !(cover && p.editor);

    /* An open panel's wrapper keeps its place in the board's row whether the
       panel is beside the week or in front of it, so the gap beside it is
       charged either way. */
    const gaps = names.length * gap;
    const widths = overlay ? 0 : open.reduce((sum, p) => sum + p.width(), 0);
    // Over the week the panel gives its width up; the editor beside it keeps its own.
    const room = board - gaps - (cover ? open.find(p => p.editor).width() : front ? 0 : widths);
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

    /* A panel opening or closing moves the board without always resizing its
       grid, so the trip card, fixed to the window, is placed again once the
       board has been fit to its new room. */
    requestAnimationFrame(() => placeBarOpen());
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
  // to-do-list.js says when it has shown or hidden one of the lists' panes.
  document.addEventListener('scheduler:to-do-pane', () => {
    placeRoom();
    window.Rux?.schedule?.fit?.();
  });

  function placeAvailability() {
    /* The roster is on screen whenever it is asked for. Where it goes -- beside
       the week or in front of it -- is `placeRoom`'s, and either way the toggle
       reads as pressed, because either way the roster is there. */
    const shown = availOn;
    // A driver picked out from a roster that has gone would dim the board
    // with nothing on screen to say why, or to undo it.
    if (!shown && focusDriver != null) pickDriver(null);
    if (asideSlot) {
      asideSlot.hidden = !shown;
      if (shown) asideSlot.appendChild(availEl);
    }
    availEl.hidden = !shown;
    availToggle.setAttribute('aria-pressed', String(shown));
    // rux.css styles nothing on `aria-pressed`; `rux--btn--selected` is
    // Carbon's pressed look.
    availToggle.classList.toggle('rux--btn--selected', shown);
    // The glyph says it too: an outlined person while the roster is shut, a
    // filled one while it shows, as a filled glyph reads as on.
    availToggle.querySelector('use')?.setAttribute('href', shown ? '#m-person-fill' : '#m-person');
    /* The room is measured again here: opening the roster is not a resize, so
       nothing else would ask, and the board would lay out for a panel it no
       longer has room for. */
    placeRoom();
    window.Rux?.schedule?.fit?.();
  }

  // A press shows the roster or hides it; where it then goes is `placeRoom`'s.
  availToggle?.addEventListener('click', async () => {
    if (!availOn && !(await makeRoom('roster'))) return;
    availOn = !availOn;
    placeAvailability();
  });

  /* ── View options ─────────────────────────────────────────────────────────
     Start on Sunday, two weeks at a time, equipment under the bus numbers,
     which a bus's tip switches too, time at the yard between trips, and the
     bar-row toggles. Turning a row off removes it
     rather than blanking it: `--scheduler-bar-rows` is the count, so the bar
     shrinks and more buses fit. Saved in `localStorage` and read with a
     try-catch, so a browser that refuses storage gets the defaults. */
  const VIEW_ROWS = ['client', 'contact', 'time', 'update', 'drivers'];
  // The class that hides each row, written out in full so the check can read it.
  const HIDE_ROW = {
    client: 'scheduler-week--no-client',
    contact: 'scheduler-week--no-contact',
    time: 'scheduler-week--no-time',
    update: 'scheduler-week--no-update',
    drivers: 'scheduler-week--no-drivers',
  };
  /* `motion` is how much a bus out on its trip moves on its bar: full,
     calm, every light held still, or off, the edge alone. It starts calm
     for a computer set to reduce motion. */
  const MOTIONS = ['full', 'calm', 'off'];
  const view = { client: true, contact: true, time: true, update: true, drivers: true, sunday: false, equipment: false, twoWeeks: false, yard: false, fill: false,
    motion: reducedMotion.matches ? 'calm' : 'full' };
  const VIEW_KEY = 'scheduler.view';

  try {
    const saved = JSON.parse(localStorage.getItem(VIEW_KEY) || '{}');
    for (const k of [...VIEW_ROWS, 'sunday', 'equipment', 'twoWeeks', 'yard', 'fill']) if (typeof saved[k] === 'boolean') view[k] = saved[k];
    if (MOTIONS.includes(saved.motion)) view.motion = saved.motion;
  } catch { /* no storage, or nothing worth reading: the defaults stand */ }
  // Set before the first read for the reason Sunday is: it sizes the range.
  twoWeeks = view.twoWeeks;
  // Set before `cursor` is first computed below, because `mondayOf` reads it
  // and the first week drawn must honour a saved Sunday start.
  weekStartsSunday = view.sunday;

  const viewMenu = document.getElementById('scheduler-view-menu');
  const viewTrigger = document.getElementById('scheduler-view-trigger');

  // The week picker starts its weeks where the board does and marks the
  // days the board shows, one week or two, from the week's first day.
  function dressWeekPicker() {
    const picker = document.getElementById('scheduler-week-picker');
    if (!picker) return;
    picker.dataset.ruxFirstDay = weekStartsSunday ? '0' : '1';
    picker.dataset.ruxSpan = twoWeeks ? '14' : '7';
  }

  function applyView() {
    weekStartsSunday = view.sunday;
    twoWeeks = view.twoWeeks;
    dressWeekPicker();
    for (const r of VIEW_ROWS) schEl.classList.toggle(HIDE_ROW[r], !view[r]);
    // Equipment under the bus numbers, and every open or closed tip's switch
    // saying so.
    showEquipment = view.equipment;
    schEl.classList.toggle('scheduler-week--equipment', showEquipment);
    // Time at the yard: the cards between trips, and the bar ends that part for them.
    schEl.classList.toggle('scheduler-week--yard', view.yard);
    // Fill the window: the days share the whole pane rather than stopping at
    // their cap, which app.css and app.js read from this class.
    schEl.classList.toggle('scheduler-week--fill', view.fill);
    for (const btn of schEl.querySelectorAll('.scheduler-bus-tip__switch .rux--toggle__button')) {
      btn.setAttribute('aria-checked', String(showEquipment));
      btn.parentElement.querySelector('.rux--toggle__switch')?.classList.toggle('rux--toggle__switch--checked', showEquipment);
    }
    // One for the destination, which never goes, plus whatever is left on.
    schEl.style.setProperty('--scheduler-bar-rows', String(1 + VIEW_ROWS.filter(r => view[r]).length));
    // The bars change height and lane, which the scroll pane may not report as
    // a resize, so the trip tabs follow here.
    placeBarOpen();
    markTripBars();
    schEl.dataset.motion = view.motion;
    for (const item of viewMenu?.querySelectorAll('[role="menuitemcheckbox"], [role="menuitemradio"][data-motion]') || []) {
      const key = item.dataset.row || item.dataset.view;
      const on = item.dataset.motion ? view.motion === item.dataset.motion : !!view[key];
      item.setAttribute('aria-checked', String(on));
      const slot = item.querySelector('.rux--menu-item__selection-icon');
      if (slot) { if (on) slot.replaceChildren(svgUse('#m-check', '16', '0 0 20 20')); else slot.replaceChildren(); }
    }
    try { localStorage.setItem(VIEW_KEY, JSON.stringify(view)); } catch { /* nothing to do */ }
    window.Rux?.schedule?.fit?.();
  }

  /* The menu hangs under its ⋮ and, opened there, is attached to it as
     Carbon's overflow menu is to its trigger: the ⋮ takes the menu's layer and
     shadow, and a strip the ⋮'s width in the menu's layer covers the menu's
     shadow where the two meet. Where it had to open elsewhere it floats. */
  viewTrigger?.addEventListener('click', () => {
    if (!viewMenu) return;
    const r = viewTrigger.getBoundingClientRect();
    popMenuAt(viewMenu, { clientX: r.left, clientY: r.bottom }, viewTrigger);
    viewTrigger.setAttribute('aria-expanded', 'true');
    const m = viewMenu.getBoundingClientRect();
    if (Math.abs(m.top - r.bottom) < 1) {
      // Unrounded, so the strip lands on the ⋮ wherever the menu's width puts its edge.
      viewMenu.style.setProperty('--scheduler-attach-x', `${r.left - m.left}px`);
      viewMenu.style.setProperty('--scheduler-attach-w', `${r.width}px`);
      viewMenu.dataset.attached = '';
      viewTrigger.dataset.attached = '';
    }
  });

  viewMenu?.addEventListener('click', e => {
    const motion = e.target.closest('[role="menuitemradio"][data-motion]');
    if (motion) { view.motion = motion.dataset.motion; applyView(); return; }
    const item = e.target.closest('[role="menuitemcheckbox"]');
    if (!item) return;
    const key = item.dataset.row || item.dataset.view;
    if (!(key in view)) return;
    view[key] = !view[key];
    applyView();
    // Changing the first day re-asks the server for a different range; the
    // row toggles are drawing only and need no fetch.
    if (key === 'sunday') { cursor = mondayOf(cursor); show(); }
    // Two weeks reads a longer range from the same first day, and asks the
    // board for more room, which may close a panel.
    if (key === 'twoWeeks') { show(); placeRoom(); }
  });
  viewMenu?.addEventListener('rux:menu-closed', () => {
    viewMenu.hidden = true;
    viewTrigger?.setAttribute('aria-expanded', 'false');
    delete viewMenu.dataset.attached;
    if (viewTrigger) delete viewTrigger.dataset.attached;
  });

  // Crossing md changes how many days two weeks shows, so the board redraws.
  phoneQuery.addEventListener('change', () => { if (twoWeeks) show(); });

  // A bus tip's switch. Design's `setToggle` fires on the `.rux--toggle` box,
  // which bubbles to the pane.
  schEl.addEventListener('rux:toggle', e => {
    if (!e.target.closest?.('.scheduler-bus-tip__switch')) return;
    view.equipment = !!e.detail?.on;
    applyView();
  });

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
    if (e.target.id === 'scheduler-f-customer') delete e.target.dataset.customerId;
  });
  /* A customer picked says which it is, and fills an empty pickup and
     drop-off from its usual pickup. */
  panelDetails?.addEventListener('rux:listbox-selected', e => {
    const t = e.target.querySelector?.('input[role="combobox"]');
    if (t?.id !== 'scheduler-f-customer') return;
    const id = e.detail?.option?.dataset.customerId;
    if (!id) { delete t.dataset.customerId; return; }
    t.dataset.customerId = id;
    const picked = (panelIndex.customers || []).find(c => c.id === id);
    fillPickupFrom(picked);
    fillNeedsFrom(picked);
  });
  // The Route tab's own fill, when it is open and its pickup is empty.
  function fillPickupFrom(customer) {
    const place = (panelIndex.locations || []).find(l => l.id === customer?.usual_location_id);
    if (place) editing?.route?.fillPickup?.(place);
  }
  /* A new trip takes its customer's usual needs and bus type, on every
     vehicle of both legs: each need is added to what the vehicle already
     asks, and the type is set where the vehicle has none. A saved trip is
     never changed by its customer. */
  function fillNeedsFrom(customer) {
    if (!editing?.creating || !customer) return;
    const usual = needIds(customer.usual_reqs).filter(isVehicleNeed);
    const type = customer.usual_vehicle_type || null;
    if (!usual.length && !type) return;
    for (const leg of fleetLegs()) {
      for (const b of editing.fleet?.[leg] ?? []) {
        b.needs = needsObject(new Set([...needIds(b.needs), ...usual]));
        if (type && !b.vehicleType) b.vehicleType = type;
      }
    }
    drawFleet();
    refreshDirty();
  }
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
         The customer is the trip's and can differ from the contact's, as when
         an agency books for a school, so it fills only when empty, and a
         customer filled that way fills an empty pickup in turn. */
      put('scheduler-f-cphone', hit.phone);
      put('scheduler-f-cemail', hit.email);
      const theirs = (panelIndex.customers || []).find(c => c.id === hit.customer_id);
      const cust = document.getElementById('scheduler-f-customer');
      if (theirs && cust && !cust.value.trim()) {
        cust.value = theirs.name;
        cust.dataset.customerId = theirs.id;
        fillPickupFrom(theirs);
        fillNeedsFrom(theirs);
      } else suggest('scheduler-f-customer', hit.client);
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
  // Route has fields and two place searches, the pickup's and the drop-off's
  // in their own dialogs, which sit outside the panel.
  for (const host of [panelRoute, document.getElementById('scheduler-pickup-modal'),
    document.getElementById('scheduler-dropoff-modal')]) {
    host?.addEventListener('input', refreshDirty);
    host?.addEventListener('change', refreshDirty);
    host?.addEventListener('rux:listbox-selected', refreshDirty);
  }

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
     It is read back again once the update box is answered, because that box
     stays open for as long as its words take to write. `force` is the
     conflict box's Save anyway, and `answered` the update it already holds.
     A failed read does not block the save, which reports its own errors. */
  async function saveEditor(after, force = false, answered = null) {
    // A price still to move moves on screen first, so the quoted price Save writes is the lines' total.
    followLines();
    if (!editing || (!editing.creating && !changed())) return false;
    const heldBy = saveHeldBy();
    if (heldBy) { toast('error', 'The trip was not saved.', heldBy); return false; }
    if (fleetDuplicates().size) {
      toast('error', 'The trip was not saved.', 'One driver is in two seats. Fix it on Buses.');
      return false;
    }
    const patch = patchOf() || {};
    const id = editing.id;
    const creating = editing.creating;
    // A new trip's files waiting for it, held here because the editor closes on the save.
    const filesWaiting = creating ? [...(editing.filesWaiting ?? [])] : [];
    const savedId = creating ? editing.newId : id;
    const opened = editing.updatedAt;
    // Whether someone else has saved the trip since the editor opened it.
    const movedOn = async () => {
      if (creating || force || !opened) return false;
      let now = null;
      try {
        ({ data: now } = await withTimeout(client.from('trips').select('updated_at').eq('id', id).single().then(r => r)));
      } catch { now = null; }
      return !!now?.updated_at && Date.parse(now.updated_at) !== Date.parse(opened);
    };
    // The conflict box, holding what to run after the save and the update already written.
    const askConflict = held => {
      conflictAfter = after ?? null;
      conflictAnswer = held;
      window.Rux?.modal?.open?.(conflictModal);
      return false;
    };
    if (await movedOn()) return askConflict(null);
    /* A trip that is back is history: a change to its buses, drivers, dates
       or stops asks first. Billing, the drivers' miles, files and updates do
       not, because they are what closing a trip out fills in. */
    const backTrip = creating ? null : panelIndex?.trips?.get(id);
    if (backTrip && !answered && window.SchedulerCloseOut.isBack(backTrip)
      && (routePlan().work || fleetMoved() || DONE_ROUTE_KEYS.some(k => k in patch))
      && !await ask('This trip already happened. Save the change anyway?',
        'It changes the buses, drivers, dates or stops of a trip that is back.')) return false;
    // Every save asks for its update first; closing the window keeps editing.
    const change = creating ? null : customerChange(patch);
    const named = k => (k in patch ? patch[k] : editing.before?.[k]);
    const warned = answered ? null : [creating ? null : await datesClash(patch), doneTakenOff()].filter(Boolean).join(' ') || null;
    const answer = answered ?? await askForUpdate(change, creating,
      { id: savedId, destination: named('destination'), customer: named('customer') }, warned);
    if (!answer) return false;
    if (await movedOn()) return askConflict(answer);
    // The Done marks as they stand before anything is written, written last.
    const doneRow = doneRowOf(await actorName()
      ?? ((await Promise.resolve(window.Rux?.account?.person?.()).catch(() => null))?.name ?? null));
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
    /* A new trip's files went into its list before it existed, and go up once
       it does, one at a time, so one that fails does not hold the others
       back. They go once: a save that stops partway sends them from where it
       stopped, and one that stops after them does not send them again. */
    let filesSent = false;
    const sendFiles = async tripId => {
      const lost = [];
      if (filesSent) return lost;
      filesSent = true;
      for (const w of filesWaiting) {
        try { await uploadDocument(tripId, w.label, w.file); } catch (err) {
          console.warn('A file did not go up with the save:', err);
          lost.push(w.file.name);
        }
      }
      return lost;
    };
    panelSave.disabled = true;
    toast('working', creating ? 'Creating the trip…' : 'Saving the trip…');
    try {
      /* Create writes every field, not the diff. `readForm` returns null when a
         field is missing, and spreading null would insert a trip with no
         destination or start date, so a missing field fails loudly instead.
         The bus counts come from the Buses tab, and a new trip always has one. */
      const form = creating ? readForm() : null;
      if (creating && !form) throw new Error('The form is not complete — a field is missing from the panel.');
      const fleet = fleetWork();
      const row = creating
        ? { id: editing.newId, ...form, bus_count: 1, ...(fleet?.trip ?? {}) }
        : { ...patch, ...(fleet?.trip ?? {}) };
      /* A new trip, or a save that changes its billing, writes the confirmation
         and the paid fields the billing now gives. A
         save that touches no billing leaves them as they are. */
      if (creating || BILLING_KEYS.some(k => k in patch) || paymentsPatch()?.work
          || posPatch()?.work || invoicesPatch()?.work || linesPatch()?.work) {
        Object.assign(row, derivedBilling());
      }
      /* The customer and the contacts are linked, and added to their lists,
         before the trip is written. A customer that cannot be added stops the
         save before anything is written, and the editor keeps every edit. */
      try {
        await linkCustomer(row, creating);
      } catch (e) {
        throw new Error(`The customer could not be added to the list, so nothing was saved. ${e?.message ?? e}`);
      }
      const offers = [];
      const unlinked = await linkContacts(row, creating, offers);
      // The legs' own writes, out of the trip's, made once the trip stands.
      const legOps = legWork(row, creating);
      offers.push(...placeOffers());
      const savedCustomerId = 'customer_id' in row ? row.customer_id : editing.before.customer_id;
      /* The fleet is written last, because its rows need the trip to exist. If
         that write fails the trip stands, in the Unassigned row, and the
         message says so. */
      const onBus = !!editing.fleet?.[screenKey()]?.some(b => b.busId);
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
      for (const op of legOps) {
        if (op.op === 'insert') {
          /* A new leg's first route is made by the database, so its id is read
             after; a read that fails leaves its rows to go by the leg's word. */
          const made = await write('its legs', client.from('trip_legs').insert({ trip_id: tripId, ...op.row }).select('id').single());
          let routeId = null;
          try {
            const { data } = await withTimeout(client.from('trip_routes').select('id').eq('leg_id', made.id).order('position').limit(1).then(r => r));
            routeId = data?.[0]?.id ?? null;
          } catch { routeId = null; }
          editing.madeLegs = { ...editing.madeLegs, [op.key]: { legId: made.id, routeId } };
        }
        else if (op.op === 'update') await write('its legs', client.from('trip_legs').update(op.row).eq('id', op.id));
        else await write('its legs', client.from('trip_legs').delete().eq('id', op.id));
      }
      // Only once the trip stands does its contact take its customer.
      await fillContactCustomer(row);
      /* A trip started from a website request takes it, and its New quote
         task takes the trip, so the task's trip line opens it. */
      if (creating && openDraftRequest) {
        await write('the website request', client.from('quote_requests').update({ trip_id: tripId }).eq('id', openDraftRequest));
        await write('the website request', client.from('to_dos').update({ trip_id: tripId })
          .eq('quote_request_id', openDraftRequest).is('trip_id', null));
      }

      /* The route's rows: a new trip's first ones, or an existing leg's
         changes and the rows it lacks. Each is written one at a time, since an
         upsert would need every column and write back stale copies of those
         the tab never shows. */
      await saveRoute(tripId, write);
      await mirrorPickupLeg(tripId, write);

      /* Payments, then `deposit_amount`, which holds their sum despite its
         name: `billingOf` reads it as the amount paid when a trip has no
         payment rows, so it is rewritten after the rows. `|| null`
         leaves it empty when there are no payments. */
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

      /* Purchase orders, invoices and quote lines, by id like the payments.
         Their summary columns on the trip, and `quoted_price`, which is the
         lines' sum, went out with the trip patch (`EDITS`). */
      for (const [table, what, listWork] of [['trip_pos', 'its purchase orders', posPatch()],
                                             ['trip_invoices', 'its invoices', invoicesPatch()],
                                             ['trip_quote_lines', 'its quote lines', linesPatch()]]) {
        if (!listWork?.work) continue;
        const placed = row => (table === 'trip_quote_lines' ? lineOnLeg(row) : row);
        for (const item of listWork.inserts) {
          await write(what, client.from(table).insert({ trip_id: tripId, ...placed(item) }));
        }
        for (const u of listWork.updates) {
          await write(what, client.from(table).update(placed(u.patch)).eq('trip_id', tripId).eq('id', u.id));
        }
        for (const delId of listWork.deletes) {
          await write(what, client.from(table).delete().eq('trip_id', tripId).eq('id', delId));
        }
      }

      if (fleet?.work) await saveFleet(tripId, write, fleet);
      /* Last, because writing the trip's rows takes off the Done marks their
         changes affect, and a Done pressed after those changes still stands. */
      if (Object.keys(doneRow).length) await write('its Done marks', client.from('trips').update(doneRow).eq('id', tripId));
      recordThisSave(tripId);
      const filesLost = await sendFiles(tripId);
      const updateLost = answer.kind !== 'none' && !(await writeUpdate(tripId, answer));
      // Read back rather than trusting the write, as the drag does.
      await show();
      const fields = Object.keys(patch).length;
      if (filesLost.length) toast('warning', 'Trip created; a file was not added.', `${filesLost.join(', ')}. Add it on Files.`);
      else if (updateLost) toast('warning', 'Saved, but the update was not added.', 'Add it from the card.');
      else if (unlinked.length) toast('warning', creating ? 'Trip created.' : 'Saved.',
        `${unlinked.join(', ')} was not added to Contacts.`);
      else if (creating) toast('success', onBus ? 'Trip created on its bus.' : 'Trip created. It is in the Unassigned row until it has a bus.');
      else toast('success', fields ? `Saved ${fields} change${fields === 1 ? '' : 's'}.` : 'Saved.');
      offerListUpdates(tripId, savedCustomerId, offers);
      return true;
    } catch (e) {
      const why = String(e && e.message ? e.message : e);
      /* Nothing landed, or a new trip's insert ran out of time, which its fixed
         id makes safe to send again. The editor stays as it is for another try. */
      if (!wrote && (creating || !e.timedOut)) {
        if (e.timedOut) toast('warning', 'Not sure the trip was created.', `${why} Save again. No copy is made.`);
        else toast('error', `The trip was not ${creating ? 'created' : 'saved'}. ${why}`);
        panelSave.disabled = false;
        followLateWrite(late, seq, null, ['The trip was created after all.', 'Press Save to finish it.']);
        return false;
      }
      /* Part of it landed, or may have. The editor's pending rows no longer
         match the database, and sending them again would save some twice, so
         the board is read back and the editor lets them go. A new trip closes,
         since it exists now; an existing one reopens as it is saved. */
      const check = part === 'its buses' ? 'See Buses.'
        : part === 'the trip' ? 'Check it.'
        : `Check ${part}.`;
      const didNot = e.timedOut ? 'may not have saved' : 'did not save';
      // What did land is recorded.
      recordThisSave(savedId);
      /* The new trip exists, and the editor is about to close on it, so the
         files waiting for it go up now or they are gone with the editor. */
      const filesLost = creating ? await sendFiles(savedId) : [];
      await show();
      if (creating) {
        closePanel(false);
        toast('warning', `Trip created, but ${part} ${didNot}.`,
          `${check} ${why}${filesLost.length ? ` A file was not added either: ${filesLost.join(', ')}.` : ''}`);
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
      if (error) toast('warning', 'The late save did not go through.', `${error.message} Check the trip first.`);
      else toast(unsaved ? 'warning' : 'success', landed[0], unsaved ? 'Reload the trip before saving again.' : landed[1]);
    }, () => {});
  }

  /* ── Right-click or hold an empty cell ─────────────────────────────────────
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
     was pressed. A menu dropped from a button, `from`, hangs under it lined
     up with one of its edges, as Carbon's menu button's does: its start edge
     where the menu fits, else its end edge, so near the window's right side
     it sits under the button rather than beside it. */
  const MENU_SPACING = 8;
  function popMenuAt(menu, e, from) {
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
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    let x = fit(px, width, vw);
    let y = fit(py, height, vh);
    if (from) {
      const r = from.getBoundingClientRect();
      const gap = window.Rux?.floatGap?.(menu) ?? 0;
      x = r.left + width <= vw - MENU_SPACING ? r.left : Math.max(0, r.right - width);
      y = r.bottom + gap + height <= vh - MENU_SPACING ? r.bottom + gap : Math.max(0, r.top - gap - height);
    }
    menu.style.insetInlineStart = `${x - page.left}px`;
    menu.style.insetBlockStart = `${y - page.top}px`;
    window.Rux?.menu?.open?.(menu, null);
  }

  // The empty cell's track under a press, or null for a bar, its shortcuts or
  // anywhere off the tracks.
  const cellTrack = target => {
    const track = target.closest('.scheduler-track');
    return !track || target.closest('.scheduler-bar, .scheduler-bar-shortcuts') ? null : track;
  };

  function openCellMenu(track, e) {
    const box = track.getBoundingClientRect();
    const days = parseInt(getComputedStyle(gridEl).getPropertyValue('--scheduler-days'), 10) || 7;
    const index = Math.min(days - 1, Math.max(0, Math.floor((e.clientX - box.left) / (box.width / days))));
    cellMenuAt = {
      startDate: iso(addDays(shown, index)),
      busId: track.dataset.unassigned ? null : (track.dataset.busId || null),
    };
    popMenuAt(cellMenu, e);
  }

  gridEl.addEventListener('contextmenu', e => {
    const track = cellTrack(e.target);
    if (!track || !shown) return;
    e.preventDefault();
    openCellMenu(track, e);
  });

  /* A finger opens the same menu by holding still on an empty cell, timed and
     bounded the way a bar's hold is. iOS sends no `contextmenu` for a hold, so
     this is the only way in there; Android sends one as its own hold
     completes, after this has opened the menu, and opening an open menu again
     changes nothing. Travel past the slop is a scroll or a week swipe, and
     ends the hold. */
  gridEl.addEventListener('pointerdown', down => {
    if (down.pointerType !== 'touch' || !down.isPrimary) return;
    const track = cellTrack(down.target);
    if (!track || !shown) return;
    const mine = e => e.pointerId === down.pointerId;
    const move = e => {
      if (mine(e) && Math.hypot(e.clientX - down.clientX, e.clientY - down.clientY) > TOUCH_SLOP) end();
    };
    const up = e => { if (mine(e)) end(); };
    const end = () => {
      clearTimeout(hold);
      gridEl.removeEventListener('pointermove', move);
      gridEl.removeEventListener('pointerup', up);
      gridEl.removeEventListener('pointercancel', up);
    };
    const hold = setTimeout(() => { end(); openCellMenu(track, down); }, TOUCH_HOLD_MS);
    gridEl.addEventListener('pointermove', move);
    gridEl.addEventListener('pointerup', up);
    gridEl.addEventListener('pointercancel', up);
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
    /* The menu acts on the bar under the pointer, so that bar is the one
       picked, and its card waits until the menu shuts, so one thing floats
       over the week at a time. */
    menuHidesCard = true;
    selectBar(bar);
    placeBarOpen();
    prepareBarMenu(bar);
    stowBarTitles(bar);
    popMenuAt(barMenu, e);
  });

  /* The browser leaves a tooltip under the pointer showing when the menu
     opens there, over its first items, so the bar's tooltips are put away
     while its menu is open and given back when it shuts. */
  let stowedTitles = [];
  function stowBarTitles(bar) {
    restoreBarTitles();
    stowedTitles = [bar, ...bar.querySelectorAll('[title]')]
      .filter(n => n.hasAttribute('title')).map(n => [n, n.getAttribute('title')]);
    for (const [n] of stowedTitles) n.removeAttribute('title');
  }
  function restoreBarTitles() {
    for (const [n, title] of stowedTitles) if (!n.hasAttribute('title')) n.setAttribute('title', title);
    stowedTitles = [];
  }

  barMenu?.addEventListener('click', async e => {
    const item = e.target.closest('.rux--menu-item');
    if (!item || !barMenuFor) return;
    // The Color item opens its submenu, which Design's menu does; it is no action.
    if (item.getAttribute('aria-haspopup') === 'true') return;
    // The driver list's notes, such as the driver on the bus now, are not actions.
    if (item.getAttribute('aria-disabled') === 'true') return;
    const bar = barMenuFor;
    // Its card stays put away after the menu shuts, as after a shortcut, except
    // after Open, whose editor opens beside the board.
    if (item.id !== 'scheduler-bar-menu-open') cardAwayFor = barKey(bar);
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

    if (item.id === 'scheduler-bar-menu-forms') {
      openForms(bar);
      return;
    }

    // One named window, as the editor's Email thread link opens it, so each
    // thread reuses the tab.
    if (item.id === 'scheduler-bar-menu-thread') {
      const url = barThreadUrl(bar);
      if (url) window.open(url, 'missive', 'noopener');
      return;
    }

    if (item.id === 'scheduler-bar-menu-thread-add') {
      openOnThread(bar);
      return;
    }

    if (item.id === 'scheduler-bar-menu-contacts') {
      openContactsFrom(bar, bar);
      return;
    }

    if (item.id === 'scheduler-bar-menu-map') {
      location.href = `live.html?bus=${encodeURIComponent(bar.dataset.busId)}`;
      return;
    }

    if (item.id === 'scheduler-bar-menu-upload') {
      const tripId = bar.dataset.tripId;
      pickFile(file => uploadFrom(tripId, 'Itinerary', file, null, barLeg(bar)));
      return;
    }

    if (item.id === 'scheduler-bar-menu-calculator') {
      openCalculator(bar);
      return;
    }

    if (item.id === 'scheduler-bar-menu-update') {
      // The card's Updates, with Add's box ready.
      askCard(bar, true, 'updates');
      openQuick(bar.dataset.tripId);
      return;
    }

    // The History page, narrowed to this trip, once unsaved work is settled.
    if (item.id === 'scheduler-bar-menu-history') {
      const href = `history.html?trip=${encodeURIComponent(bar.dataset.tripId)}`;
      whenSafe(() => { window.location.href = href; });
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

    if (item.dataset.assignDriver) {
      await assignDriver(bar, item.dataset.assignDriver);
      return;
    }

    if (item.id === 'scheduler-bar-menu-assign-remove') {
      removeDriver(bar);
      return;
    }

    if (item.id === 'scheduler-bar-menu-assign-more') {
      openOnFleet(bar);
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
      toast('working', 'Changing the trip color…');
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
  barMenu?.addEventListener('rux:menu-closed', e => {
    if (e.target !== barMenu) return;
    barMenu.hidden = true;
    restoreBarTitles();
    if (menuHidesCard) { menuHidesCard = false; placeBarOpen(); }
  });

  // Fills the bar menu for one bar: which items apply, the Color chips and
  // the drivers' statuses.
  // The bar's trip's email thread, or null when it has none or the link is not an https address.
  function barThreadUrl(bar) {
    const url = panelIndex.trips.get(bar.dataset.tripId)?.booking_contact_missive_url?.trim();
    return url && /^https:\/\//i.test(url) ? url : null;
  }

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
        .replaceChildren(...(on ? [svgUse('#m-check', '16', '0 0 20 20')] : []));
      if (!item.dataset.color) {
        item.querySelector('.scheduler-swatch').className = `scheduler-swatch scheduler-bar--${bar.dataset.standardHue || 'blue'}`;
      }
    }
    fillCrewItems(bar);
    fillAssignItems(bar);
    // Only a bus out on its trip is on the map.
    document.getElementById('scheduler-bar-menu-map').hidden = !bar.dataset.busId || !bar.dataset.road;
    document.getElementById('scheduler-bar-menu-itinerary').hidden = !bar.dataset.itineraryId;
    document.getElementById('scheduler-bar-menu-upload').hidden = !!bar.dataset.itineraryId || !client;
    document.getElementById('scheduler-bar-menu-thread').hidden = !barThreadUrl(bar);
    document.getElementById('scheduler-bar-menu-thread-add').hidden = !!barThreadUrl(bar) || !client;
    // Mark this leg's hotel booked or not, on a trip that needs one, and not for
    // the trip open in the editor, which has its own Booked box.
    const hotelItem = document.getElementById('scheduler-bar-menu-hotel');
    hotelItem.hidden = !bar.dataset.needHotel || locked;
    hotelItem.querySelector('.rux--menu-item__label').textContent =
      bar.dataset.hotelBooked ? 'Mark hotel not booked' : 'Mark hotel booked';
    // Call or text rings the card's Needs bell while a driver on this bus is to be told of a change.
    const tells = barFacts.get(bar)?.tells ?? [];
    const due = document.getElementById('scheduler-bar-menu-contacts-due');
    due.hidden = !tells.length;
    due.querySelector('.rux--visually-hidden').textContent = tells.length ? `, tell ${listed(tells)}` : '';
    tidyRules(barMenu);
    // A driver's rule before Change driver goes where Change driver is hidden.
    for (const sub of barMenu.querySelectorAll('[data-crew-part] > .rux--menu')) tidyRules(sub);
  }

  /* A rule parts two groups, so one with nothing shown before it, after it,
     or before the next rule is hidden: the trip in the editor, with no hotel
     and no crew, would otherwise show two rules together. */
  function tidyRules(menu) {
    const kids = [...menu.children];
    const shown = el => !el.hidden && !el.matches('.rux--menu-item-divider');
    for (const [i, rule] of kids.entries()) {
      if (!rule.matches('.rux--menu-item-divider')) continue;
      rule.hidden = false;
      const before = kids.slice(0, i).reverse();
      const after = kids.slice(i + 1);
      const lastBefore = before.find(k => !k.hidden);
      rule.hidden = !before.some(shown) || !after.some(shown)
        || !!lastBefore?.matches('.rux--menu-item-divider');
    }
  }

  // The bar's crew, read again from the trip the board holds.
  function barCrew(bar) {
    const trip = panelIndex.trips.get(bar.dataset.tripId);
    const assign = trip?.trip_assignments?.find(a => String(a.id) === bar.dataset.assignmentId);
    return assign ? { trip, crew: crewOf(trip, assign, panelIndex.driversById, panelIndex.statuses) } : null;
  }

  /* One item per driver on the bar, after Call or text and Assign driver: the
     driver's role icon in their status's tone, their name and status, and a
     submenu of the five statuses with theirs checked. The Driver seat's
     submenu ends with Change driver, moved in from beside Call or text, so a
     driver's status and who drives are one item. A role nobody fills has no
     status. */
  function fillCrewItems(bar) {
    // Assign driver goes back beside Call or text before the old items go,
    // since it may sit inside one of them.
    const assign = document.getElementById('scheduler-bar-menu-assign');
    const anchor = document.getElementById('scheduler-bar-menu-contacts');
    anchor.after(assign);
    for (const old of barMenu.querySelectorAll('[data-crew-part]')) old.remove();
    const found = barCrew(bar);
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
      caret.appendChild(svgUse('#m-arrow_right', '16', '0 0 32 32'));
      const sub = el('ul', 'rux--menu rux--menu--sm rux--menu--with-icons rux--menu--with-selectable-items');
      sub.setAttribute('role', 'menu');
      sub.setAttribute('aria-label', name);
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
        if (on) check.appendChild(svgUse('#m-check', '16', '0 0 20 20'));
        const mark = el('div', 'rux--menu-item__icon');
        mark.appendChild(crewEl({ ...c, status: st }).firstChild);
        opt.append(check, mark, el('div', 'rux--menu-item__label', st.label));
        group.appendChild(opt);
      }
      groupItem.appendChild(group);
      sub.appendChild(groupItem);
      if (c.role === 'driver') {
        const rule = el('li', 'rux--menu-item-divider');
        rule.setAttribute('role', 'separator');
        sub.append(rule, assign);
      }
      item.append(el('div', 'rux--menu-item__selection-icon'), icon,
        el('div', 'rux--menu-item__label', `${name} · ${c.status.label}`), caret, sub);
      return item;
    });
    let at = assign.parentElement === barMenu ? assign : anchor;
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
        const picked = c.driverId === target.driverId && c.legKey === target.legKey && c.role === target.role;
        return { driverId: c.driverId, legId: c.legKey, leg: c.leg, role: c.role,
          status: picked ? value : c.status.value, dirty: picked };
      }));
    const label = DRIVER_STATUSES.find(x => x.value === value).label;
    toast('working', 'Changing the driver status…');
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
    const trip = panelIndex.trips.get(bar.dataset.tripId);
    const leg = trip ? legByKey(trip, bar.dataset.legKey || bar.dataset.leg) : null;
    if (!leg?.legId) return;
    const booked = !bar.dataset.hotelBooked;
    toast('working', booked ? 'Marking the hotel booked…' : 'Marking the hotel not booked…');
    try {
      const { error } = await withTimeout(
        client.from('trip_legs').update({ hotel_booked: booked }).eq('id', leg.legId).then(r => r));
      if (error) throw new Error(error.message);
      recordFieldChange(bar.dataset.tripId, `hotel_booked_${bar.dataset.leg}`, !booked, booked);
      await show();
      toast('success', booked ? 'The hotel is booked.' : 'The hotel is not booked.');
    } catch (err) {
      toast('error', `The hotel was not marked. ${err.message}`);
    }
  }

  /* ── Assign driver, from the bar ──
     The bar is one bus on one leg, so its menu fills that bus's Driver seat
     with a pick from every active driver ranked as the Buses tab ranks them. The
     trips around the leg are read when the menu opens, since the board holds
     only its own weeks, and kept a minute, so the shortcut and the menu share
     one read. The menu fills the Driver seat alone; a driver carried to the
     bar takes any seat the Buses tab has turned on. */
  let assignRead = null;
  let assignSeq = 0;

  /* The bar's trip, its bus row, the leg's dates and the row of one seat:
     the Driver seat's unless `role` names another. `ref` finds the bar again
     once a read has drawn it afresh. */
  function barSeat(bar, role = 'driver') {
    const trip = panelIndex.trips.get(bar.dataset.tripId);
    const assign = trip?.trip_assignments?.find(a => String(a.id) === bar.dataset.assignmentId);
    if (!assign) return null;
    const leg = assign.leg || 'outbound';
    const range = legByKey(trip, legKeyOfVehicle(trip, assign));
    const seat = (assign.trip_drivers || []).find(d => (d.role || 'driver') === role) ?? null;
    return { ref: barRef(bar), trip, assign, leg, role, range: range ? { from: range.from, to: range.to, ends: range.ends, depart: range.depart, back: range.back, backDays: range.backDays } : null, seat };
  }
  const driverById = id => [...panelIndex.driversById.values()].find(d => String(d.id) === String(id));

  /* What a seat's row holds besides who sits in it: the pay, the report time
     and note, the miles its driver drove, and the five steps its driver has
     been handed. An undo gives them back with the driver. `seatKept` is the
     ones that say anything, a field that is filled and a step that is on. */
  const SEAT_STEPS = ['envelope_printed', 'trip_reminder_sent', 'itinerary_printed', 'hos_form_printed', 'driver_forms_printed'];
  const SEAT_KEPT = ['pay', 'report_time', 'instructions', 'miles', ...SEAT_STEPS];
  const seatKept = (row, columns = SEAT_KEPT) => Object.fromEntries(columns
    .filter(k => row?.[k] != null && row[k] !== false).map(k => [k, row[k]]));
  /* Who a seat holds, with what an undo gives them back where the row stays
     and only its driver changes: the status they have, the steps that are
     on, which the database turns off on a row given another driver, and the
     miles they drove, which `saveSeats` clears. */
  const heldIn = found => ({
    driverId: found.seat.driver_id,
    status: crewOf(found.trip, found.assign, panelIndex.driversById, panelIndex.statuses)
      .find(c => c.role === found.role && !c.needed)?.status.value ?? 'off',
    keep: seatKept(found.seat, [...SEAT_STEPS, 'miles']),
  });

  // The trips around a leg's dates, from the read kept for them or a new one.
  async function nearbyFor(range) {
    const key = `${range.from}:${range.to}`;
    if (assignRead?.key === key && Date.now() - assignRead.at < 60000) return assignRead.nearby;
    const nearby = await readNearby(range.from, range.to);
    assignRead = { key, at: Date.now(), nearby };
    return nearby;
  }

  // The red alert a lapsed card wears in the menu, coloured as a declined status.
  function lapseIcon() {
    const svg = svgUse('#m-error-fill', '16', '0 0 32 32');
    svg.setAttribute('class', 'rux--icon-indicator--failed scheduler-status-icon');
    return svg;
  }

  function assignItem(label, { id, icon, note, title, checked, disabled } = {}) {
    const item = el('li', disabled ? 'rux--menu-item rux--menu-item--disabled' : 'rux--menu-item');
    item.setAttribute('role', 'menuitem');
    item.tabIndex = -1;
    if (disabled) item.setAttribute('aria-disabled', 'true');
    if (id != null) item.dataset.assignDriver = id;
    if (title) item.title = title;
    const check = el('div', 'rux--menu-item__selection-icon');
    if (checked) check.appendChild(svgUse('#m-check', '16', '0 0 20 20'));
    const mark = el('div', 'rux--menu-item__icon');
    if (icon) mark.appendChild(typeof icon === 'string' ? svgUse(icon, '16', '0 0 32 32') : icon);
    item.append(check, mark, el('div', 'rux--menu-item__label', label));
    if (note) item.appendChild(el('div', 'rux--menu-item__shortcut', note));
    return item;
  }

  /* Fills the Assign driver submenu: the driver on the bus now, checked, then
     every free driver in rank order, one whose licence or medical card runs
     out before the leg ends marked with a red alert and a back-to-back one
     with a warning, then the busy ones, greyed with what they are on, then
     More drivers. The list says it is looking while the trips around the leg
     are read. */
  async function fillAssignItems(bar) {
    const parent = document.getElementById('scheduler-bar-menu-assign');
    const list = document.getElementById('scheduler-bar-menu-assign-list');
    const found = client && !isEditorTrip(bar) ? barSeat(bar) : null;
    parent.hidden = !found?.range;
    if (parent.hidden) return;
    const { seat, range, assign } = found;
    parent.querySelector('.rux--menu-item__label').textContent = seat?.driver_id ? 'Change driver' : 'Assign driver';
    const more = el('li', 'rux--menu-item');
    more.setAttribute('role', 'menuitem');
    more.tabIndex = -1;
    more.id = 'scheduler-bar-menu-assign-more';
    more.append(el('div', 'rux--menu-item__selection-icon'), el('div', 'rux--menu-item__icon'),
      el('div', 'rux--menu-item__label', 'More drivers…'));
    const rule = () => { const r = el('li', 'rux--menu-item-divider'); r.setAttribute('role', 'separator'); return r; };
    const remove = () => {
      const item = assignItem('Remove driver', { icon: '#m-remove' });
      item.id = 'scheduler-bar-menu-assign-remove';
      return item;
    };
    const current = seat?.driver_id != null
      ? [assignItem(histDriverName(seat.driver_id), { checked: true, disabled: true, title: 'On this bus now' }), remove(), rule()] : [];
    const seq = ++assignSeq;
    list.replaceChildren(...current, assignItem('Finding free drivers…', { disabled: true }), rule(), more);

    let nearby;
    try {
      nearby = await nearbyFor(range);
    } catch {
      if (seq === assignSeq) list.replaceChildren(...current, assignItem('The drivers could not be read', { disabled: true }), rule(), more);
      return;
    }
    if (seq !== assignSeq) return;
    const fit = fitFor(nearby, range, { assignmentId: assign.id });
    // Anyone already in a seat on this bus is left out, so one driver never takes two.
    const onBus = new Set((assign.trip_drivers || []).map(d => String(d.driver_id)));
    const ranked = rankDrivers([...panelIndex.driversById.values()]
      .filter(d => (!d.status || d.status === 'active') && !onBus.has(String(d.id))), fit);
    // A busy driver is shown but cannot be picked, so the menu never double-books.
    const pick = r => {
      const lapse = r.lapse;
      return assignItem(r.d.name || r.d.short_name || 'Unnamed driver', {
        id: r.busy ? null : String(r.d.id),
        icon: r.busy ? '#m-do_not_disturb_on-fill' : lapse ? lapseIcon() : r.near ? '#m-warning-fill' : '#m-person-fill',
        note: [r.d.priority != null ? `P${r.d.priority}` : '', `${r.days}d`].filter(Boolean).join(' · '),
        title: [r.busy, lapse, r.detail, r.near].filter(Boolean).join(' · '),
        disabled: !!r.busy,
      });
    };
    const free = ranked.filter(r => !r.busy).map(pick);
    const busy = ranked.filter(r => r.busy).map(pick);
    const picks = [
      ...(free.length ? free : [assignItem('No free drivers', { disabled: true })]),
      ...(busy.length ? [rule(), ...busy] : []),
    ];
    list.replaceChildren(...current, ...picks, rule(), more);
  }

  /* Puts drivers in seats of one trip: each pick is a bus row, a `role`, the
     Driver seat's where it names none, and a driver, or null to empty the
     seat, which deletes its row, as the Buses tab's save does. Each seat's
     row is changed, or added on a bus with none. `keep` is what an undo gives
     a seat's row back, written after the driver, because the database turns
     the steps off on a row given another driver; `status` is the status an
     undo gives the driver back, where any other seat starts at Not sent. A
     saved `role:state` in the bus's roles goes back to the plain role, as the
     Buses tab's save leaves it, and a bus with no roles saved has the ones it
     shows written when a seat other than the Driver's is emptied, so the
     seat stays on. The crew's statuses are sent once for the whole trip,
     which drops the old drivers', because the function deletes a status its
     list leaves out, and none is marked changed, so a driver the trip
     already holds a status for keeps it and a new one starts at theirs. One
     history entry names every change. Answers what each emptied seat's row
     held, in the picks' order, and throws on the first failed write. */
  async function saveSeats(trip, picks) {
    const run = async query => {
      const { data, error } = await withTimeout(query.then(r => r));
      if (error) throw new Error(error.message);
      return data;
    };
    const roleOf = p => p.role || 'driver';
    const rowOf = (assign, role) => (assign.trip_drivers || []).find(d => (d.role || 'driver') === role) ?? null;
    const mine = a => picks.filter(p => String(p.assign.id) === String(a.id));
    // Every driver whose seat is not picked is sent with the status they have.
    const statuses = (trip.trip_assignments || []).flatMap(a =>
      crewOf(trip, a, panelIndex.driversById, panelIndex.statuses)
        .filter(c => !c.needed && !mine(a).some(p => roleOf(p) === c.role && same(rowOf(a, c.role)?.driver_id, c.driverId)))
        .map(c => ({ driverId: c.driverId, legId: c.legKey, leg: c.leg, role: c.role, status: c.status.value, dirty: false })));
    const changes = [];
    const held = [];
    for (const p of picks) {
      const { assign, driver } = p;
      const role = roleOf(p);
      const leg = assign.leg || 'outbound';
      const seat = rowOf(assign, role);
      const keep = p.keep && Object.keys(p.keep).length ? p.keep : null;
      let was = null;
      if (!driver) {
        if (seat?.id) [was] = await run(client.from('trip_drivers').delete().eq('id', seat.id).select(SEAT_KEPT.join(','))) ?? [];
      } else if (seat?.id) {
        // The miles were the last driver's.
        await run(client.from('trip_drivers').update({ driver_id: driver.id, miles: null }).eq('id', seat.id));
        if (keep) await run(client.from('trip_drivers').update(keep).eq('id', seat.id));
      } else await run(client.from('trip_drivers').insert({ assignment_id: assign.id, driver_id: driver.id, role, ...keep }));
      // The row as the database gave it up, or as the board held it where it gave none back.
      held.push(driver ? null : seatKept(was ?? seat));
      if (driver) statuses.push({ driverId: driver.id, leg, role, status: p.status || 'off', dirty: false });
      const who = `${leg === 'return' ? 'Inbound' : 'Outbound'} ${(HISTORY_ROLES[role] || 'Driver').toLowerCase()}`;
      changes.push({
        field: 'driver', label: 'Driver',
        before: seat?.driver_id != null ? `${who}: ${histDriverName(seat.driver_id)}` : null,
        after: driver ? `${who}: ${driver.name}` : null,
      });
    }
    for (const assign of new Map(picks.map(p => [String(p.assign.id), p.assign])).values()) {
      const touched = new Set(mine(assign).map(roleOf));
      const saved = Array.isArray(assign.active_roles) ? assign.active_roles.map(String) : null;
      const roles = saved ? saved.map(r => (touched.has(r.split(':')[0]) ? r.split(':')[0] : r))
        : mine(assign).some(p => !p.driver && roleOf(p) !== 'driver')
          ? ROLES.filter(r => activeRolesOf(assign).has(r.role)).map(r => r.role) : null;
      if (roles && JSON.stringify(roles) !== JSON.stringify(saved)) {
        await run(client.from('trip_assignments').update({ active_roles: roles }).eq('id', assign.id));
      }
    }
    await run(client.rpc('sync_trip_driver_statuses', { p_trip_id: trip.id, p_statuses: statuses }));
    recordHistory(trip.id, 'assignment_changed', changes);
    return held;
  }

  /* Seats a driver in `found`, a seat as `barSeat` gives it, saved at once,
     like a colour. `left` is the seat a carried driver leaves for it. On one
     trip the two seats are one save. On two, the new seat is saved first, so
     a save that stops between them leaves the driver on both buses, where
     the board shows it, and never on neither. `caution` is what the notice
     says of the driver, which the menu shows beside the name before the
     pick, and the notice names a driver the seat was taken from.

     A driver carried here, `dropped`, can be undone wherever that took a
     seat from anyone, since a drop is easier to make by accident than a
     pick: the driver the seat held goes back in it, and the carried one
     back to the seat they left. Answers whether the driver was seated. */
  async function seatDriver(found, driver, { left = null, caution = '', dropped = false } = {}) {
    const name = driver.name || 'The driver';
    const was = found.seat?.driver_id != null ? heldIn(found) : null;
    const had = left ? heldIn(left) : null;
    const take = { assign: found.assign, role: found.role, driver };
    const leave = left && { assign: left.assign, role: left.role, driver: null };
    toast('working', left ? 'Moving the driver…' : 'Assigning the driver…');
    let row = null;
    try {
      if (!left) await saveSeats(found.trip, [take]);
      else if (left.trip === found.trip) [row] = await saveSeats(found.trip, [leave, take]);
      else {
        await saveSeats(found.trip, [take]);
        [row] = await saveSeats(left.trip, [leave]);
      }
      assignRead = null;
      await show();
    } catch (err) {
      assignRead = null;
      toast('error', `The driver was not ${left ? 'moved' : 'assigned'}. ${err.message}`);
      // The board is read again, because a move that stopped partway may have saved its first seat.
      if (left) show();
      return false;
    }
    const old = was ? histDriverName(was.driverId) : null;
    const said = [
      old && `In place of ${old}`,
      caution,
      left && left.trip !== found.trip && `Moved from ${left.trip.destination || 'their other trip'}`,
      // A relief's swap time is the Buses tab's to set, and a new seat has none.
      RELIEF.has(found.role) && !found.seat?.report_time && 'No swap time yet',
    ].filter(Boolean).join(' · ');
    const plan = dropped && (was || left) ? [
      left && { ref: left.ref, role: left.role, expect: null, driverId: driver.id, status: had.status, keep: row },
      { ref: found.ref, role: found.role, expect: driver.id, driverId: was?.driverId ?? null, status: was?.status, keep: was?.keep },
    ].filter(Boolean) : null;
    const back = old && left ? `${old} and ${name} are back where they were.`
      : old ? `${old} is back on this bus.` : `${name} is back where they were.`;
    toast(caution ? 'warning' : 'success',
      `${name} is ${found.role === 'driver' ? 'driving this bus' : `the ${SEAT_LABEL[found.role].toLowerCase()} on this bus`}.`,
      said || undefined, plan ? { label: 'Undo', onClick: () => undoSeats(plan, back) } : undefined);
    return true;
  }

  /* Undoes a carry. Each seat of `plan` gets back the driver it held, or is
     emptied where it held none, with the status and the row they had. The
     offer stands down when a seat is off the board or no longer holds who
     the carry left in it. The seats of one trip are one save, and the seat a
     driver goes back to is saved before the one they leave, so one that
     stops partway leaves them on both. */
  async function undoSeats(plan, said) {
    const seats = plan.map(p => {
      const bar = findBar(p.ref);
      const found = bar && barSeat(bar, p.role);
      const driver = p.driverId != null ? driverById(p.driverId) : null;
      return found && same(found.seat?.driver_id, p.expect) && (p.driverId == null || driver) ? { ...p, found, driver } : null;
    });
    if (seats.some(seat => !seat)) {
      toast('info', 'A seat has changed, so nothing was undone.');
      return;
    }
    toast('working', 'Putting the driver back…');
    try {
      for (const trip of new Set(seats.map(seat => seat.found.trip))) {
        await saveSeats(trip, seats.filter(seat => seat.found.trip === trip)
          .map(seat => ({ assign: seat.found.assign, role: seat.role, driver: seat.driver, keep: seat.keep, status: seat.status })));
      }
      assignRead = null;
      await show();
    } catch (err) {
      assignRead = null;
      toast('error', `The driver was not put back. ${err.message}`);
      // The board is read again, because an undo that stopped partway may have saved its first seat.
      show();
      return;
    }
    toast('success', said);
    for (const p of plan) if (p.driverId != null) ringBar(p.ref, 'scheduler-bar--saved');
  }

  // The bar's menu: one driver for its bus's Driver seat. Answers whether the driver was seated.
  async function assignDriver(bar, driverId) {
    const found = barSeat(bar);
    const driver = driverById(driverId);
    if (!found || !driver || same(found.seat?.driver_id, driver.id)) return false;
    return seatDriver(found, driver);
  }

  /* One ring on a bar a name was dropped on: `scheduler-bar--saved` for a
     driver seated, the ring a saved bus move takes, and
     `scheduler-bar--refused` for one turned away. The bar is found afresh,
     because the save's read draws every bar again. */
  function ringBar(ref, cls) {
    const bar = findBar(ref);
    if (!bar || reducedMotion.matches) return;
    bar.classList.remove(cls);
    void bar.offsetWidth;
    bar.classList.add(cls);
    bar.addEventListener('animationend', () => bar.classList.remove(cls), { once: true });
  }

  // The trips read around a range, with one seat of one bus emptied: the seat a carried driver is leaving.
  const withoutSeat = (nearby, assignId, role) => ({
    ...nearby,
    trips: nearby.trips.map(t => ({ ...t, trip_assignments: (t.trip_assignments || []).map(a =>
      (String(a.id) === String(assignId)
        ? { ...a, trip_drivers: (a.trip_drivers || []).filter(d => (d.role || 'driver') !== role) } : a)) })),
  });

  /* A driver dropped on a bar is the menu's pick made by hand, for the seat
     `role` of its bus, so it is held to the menu's list: a driver already in
     a seat on this bus is not seated, nor one on another trip or away on the
     leg's days, and the notice says which. A card that lapses before the leg
     ends or a back-to-back trip, which the menu marks beside a name, is said
     as the driver is seated. `from` is the bar a driver was carried off, as
     `barRef` gives it, with the `role` of the seat they were in: that seat
     is not in their way, and they leave it for this one, which on their own
     bus is a change of seats.

     A drop is easier to make by accident than a pick, so one that would
     unseat a driver who has been sent the trip or has confirmed it asks
     first, as Remove driver does, and so does one that takes the carried
     driver out of a seat they have been sent or have confirmed.

     The bar is fainter and takes no pointer while the drop is decided, as a
     bar is while its move is saved, and is ringed with the answer, which is
     `seated`, `refused`, or `asked` when the box is left to decide. */
  async function dropDriver(bar, driverId, asked, from, role = 'driver') {
    const found = barSeat(bar, role);
    const driver = driverById(driverId);
    if (!found?.range || !driver) return 'refused';
    const { ref } = found;
    const name = driver.name || driver.short_name || 'The driver';
    const decided = () => {
      bar.classList.remove('scheduler-bar--saving');
      findBar(ref)?.classList.remove('scheduler-bar--saving');
    };
    const refuse = (kind, title, subtitle) => {
      decided();
      toast(kind, title, subtitle);
      ringBar(ref, 'scheduler-bar--refused');
      return 'refused';
    };
    // A read since the seat was aimed at can have turned it off.
    if (!activeRolesOf(found.assign).has(role)) return refuse('info', 'That seat is no longer on this bus.');
    // The seat a carried driver is leaving, which has to be theirs still.
    const source = from ? findBar(from) : null;
    const left = source ? barSeat(source, from.role) : null;
    if (from && String(left?.seat?.driver_id ?? '') !== String(driver.id)) {
      return refuse('info', `${name} is no longer on that bus.`);
    }
    const sameBus = !!left && same(left.assign.id, found.assign.id);
    if ((found.assign.trip_drivers || []).some(d => String(d.driver_id) === String(driver.id)
      && !(sameBus && (d.role || 'driver') === left.role))) {
      return refuse('info', `${name} is already on this bus.`);
    }
    bar.classList.add('scheduler-bar--saving');
    toast('working', `Checking ${name} is free…`);
    let fit;
    try {
      const nearby = await nearbyFor(found.range);
      fit = fitFor(left ? withoutSeat(nearby, left.assign.id, left.role) : nearby,
        found.range, { assignmentId: found.assign.id });
    } catch (err) {
      return refuse('error', `The driver was not assigned. ${err.message}`);
    }
    const [ranked] = rankDrivers([driver], fit);
    if (ranked.busy) return refuse('warning', `${name} is not free for this trip.`, ranked.busy);
    /* What the driver in a seat has been told, in the box's words, or null:
       of the driver in this seat now, and of the carried driver in the seat
       they are leaving. */
    const told = seat => {
      const state = seat.seat?.driver_id != null ? heldIn(seat).status : null;
      return state === 'confirmed' ? 'confirmed' : state === 'pending-response' ? 'been sent' : null;
    };
    const there = told(found);
    const away = left ? told(left) : null;
    if ((there || away) && !asked && unassignModal) {
      const now = there ? histDriverName(found.seat.driver_id) : null;
      decided();
      toast(null);
      document.getElementById('scheduler-unassign-h').textContent = there ? `Remove ${now}?` : `Move ${name}?`;
      document.getElementById('scheduler-unassign-text').textContent = [
        there && `${now} has ${there} this trip, and ${name} would take the seat.`,
        away && (left.trip === found.trip
          ? `${name} has ${away} this trip, and would change ${sameBus ? 'seats' : 'buses'}.`
          : `${name} has ${away} ${left.trip.destination || 'the trip they are on'}, and would come off it.`),
        `${there && away ? 'Neither is told here' : there ? 'Removing them here does not tell them' : 'Moving them here does not tell them'}, so let them know yourself.`,
      ].filter(Boolean).join(' ');
      if (!there) document.getElementById('scheduler-unassign-ok').textContent = 'Move';
      unassignAfter = () => dropDriver(bar, driverId, true, from, role);
      window.Rux?.modal?.open?.(unassignModal);
      return 'asked';
    }
    const caution = [cardLapse(driver, found.range), ranked.near].filter(Boolean).join(' · ');
    const seated = await seatDriver(found, driver, { left, caution, dropped: true });
    decided();
    ringBar(ref, seated ? 'scheduler-bar--saved' : 'scheduler-bar--refused');
    return seated ? 'seated' : 'refused';
  }

  /* ── Suggest drivers, for the board's range ──
     Every bus whose Driver seat wants a driver is a row: empty, declined and
     pending assignment ticked; not sent unticked, and listed only while a free
     driver of better priority exists. Pending response and confirmed are left
     alone, as are a vehicle with no bus yet, since a driver is chosen for a
     bus, a placeholder trip, which is not booked yet, and the trip in the
     editor, which holds its drivers unsaved. The rows are planned earliest
     leg first, each ticked suggestion standing in its seat for the rows after
     it, so no driver is suggested for two buses on one day and the days it
     adds count. A tick or a pick plans again. Apply saves a trip at a time. */
  const suggestModal = document.getElementById('scheduler-suggest-modal');
  const suggestList = document.getElementById('scheduler-suggest-list');
  const suggestText = document.getElementById('scheduler-suggest-text');
  const suggestApply = document.getElementById('scheduler-suggest-apply');
  const suggestDay = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  let suggest = null;
  let suggestSeq = 0;

  function suggestRows(range) {
    const rows = [];
    for (const trip of panelIndex.trips.values()) {
      if (trip.cancelled_at || window.SchedulerBilling.placeholder(trip)) continue;
      if (editing?.id != null && String(editing.id) === String(trip.id)) continue;
      const legs = legsOf(trip);
      for (const l of legs) {
        if (!datesOverlap(range, l)) continue;
        for (const assign of trip.trip_assignments || []) {
          if (legKeyOfVehicle(trip, assign) !== l.key || assign.bus_id == null) continue;
          const now = crewOf(trip, assign, panelIndex.driversById, panelIndex.statuses)
            .find(c => c.role === 'driver' && !c.needed) ?? null;
          const state = now ? now.status.value : 'empty';
          if (state === 'pending-response' || state === 'confirmed') continue;
          rows.push({
            key: String(assign.id), trip, assign, now, state, split: legs.length > 1,
            leg: { leg: l.leg, from: l.from, to: l.to, ends: l.ends, depart: l.depart, back: l.back, backDays: l.backDays },
            ticked: state !== 'off', choice: null, pick: null, options: [], error: null,
          });
        }
      }
    }
    return rows.sort((a, b) => a.leg.from.localeCompare(b.leg.from)
      || String(a.trip.destination ?? '').localeCompare(String(b.trip.destination ?? ''))
      || (a.assign.position ?? 0) - (b.assign.position ?? 0));
  }

  // The trips read around the range, with each ticked suggestion so far in its seat.
  const withStand = (nearby, stand) => (!stand.size ? nearby : {
    ...nearby,
    trips: nearby.trips.map(t => ({ ...t, trip_assignments: (t.trip_assignments || []).map(a => {
      if (!stand.has(String(a.id))) return a;
      const others = (a.trip_drivers || []).filter(d => (d.role || 'driver') !== 'driver');
      return { ...a, trip_drivers: [...others, { driver_id: stand.get(String(a.id)), role: 'driver' }] };
    }) })),
  });

  function planSuggest() {
    const stand = new Map();
    const active = [...panelIndex.driversById.values()].filter(d => !d.status || d.status === 'active');
    for (const row of suggest.rows) {
      const fit = fitFor(withStand(suggest.nearby, stand), row.leg, { assignmentId: row.assign.id });
      // Never the driver there now, nor one already in another seat on this bus.
      const skip = new Set((row.assign.trip_drivers || []).map(d => String(d.driver_id)));
      row.options = rankDrivers(active.filter(d => !skip.has(String(d.id))), fit).filter(r => !r.busy);
      if (row.choice != null && !row.options.some(r => String(r.d.id) === row.choice)) row.choice = null;
      // A pick by hand stands; otherwise the automatic order, which may find no one rested.
      row.pick = (row.choice != null ? row.options.find(r => String(r.d.id) === row.choice) : autoPicks(row.options)[0]) ?? null;
      if (row.ticked && row.pick) stand.set(row.key, row.pick.d.id);
    }
  }

  const suggestDates = l => (l.from === l.to ? suggestDay.format(parseISO(l.from))
    : `${suggestDay.format(parseISO(l.from))} – ${suggestDay.format(parseISO(l.to))}`);
  const SUGGEST_STATE = { empty: 'No driver', off: 'Not sent', declined: 'Declined', 'pending-assignment': 'Pending assignment' };

  function drawSuggest(focusId) {
    const { rows } = suggest;
    suggestList.replaceChildren(...rows.map(row => {
      const id = `scheduler-suggest-${row.key}`;
      const li = el('li', 'scheduler-suggest__row');
      const where = [
        row.split ? (row.leg.leg === 'return' ? 'Pickup' : 'Drop-off') : null,
        histBusName(row.assign.bus_id),
      ].filter(Boolean).join(' · ');
      const check = checkField(id, `${row.trip.destination || 'Trip'} · ${suggestDates(row.leg)} · ${where}`, row.ticked && !!row.pick);
      const box = check.querySelector('input');
      box.dataset.suggestRow = row.key;
      box.disabled = !row.pick;
      const body = el('div', 'scheduler-suggest__body');
      body.appendChild(el('p', 'rux--type-helper-text-01 scheduler-suggest__now', row.now
        ? `Now: ${crewName(row.now)} · ${SUGGEST_STATE[row.state]}` : 'Now: no driver'));
      if (row.options.length) {
        // With no one free and rested, the select opens on a blank, and a pick by hand is the only way.
        const pick = selectField(`${id}-driver`, 'Suggested driver', row.pick ? String(row.pick.d.id) : '', [
          ...(row.pick ? [] : [['', 'No rested driver: choose one']]),
          ...row.options.map(r => [String(r.d.id),
            [r.d.name || r.d.short_name || 'Unnamed driver', r.lapse, r.detail, r.near].filter(Boolean).join(' · ')]),
        ]);
        pick.querySelector('select').dataset.suggestPick = row.key;
        body.appendChild(pick);
      } else {
        body.appendChild(el('p', 'rux--type-helper-text-01', 'No driver is free on these days.'));
      }
      if (row.error) body.appendChild(el('p', 'rux--type-helper-text-01 scheduler-suggest__error', `Not saved: ${row.error}`));
      li.append(check, body);
      return li;
    }));
    const n = rows.filter(r => r.ticked && r.pick).length;
    suggestApply.disabled = !n;
    suggestApply.textContent = n ? `Apply ${n}` : 'Apply';
    if (focusId) document.getElementById(focusId)?.focus();
  }

  /* Reads the trips around the board's range and lists the rows. `keep`
     names rows to keep, by bus row, with their pick and error, after an Apply
     that saved only some: those are the only rows then. */
  async function loadSuggest(keep) {
    if (!availAll) return;
    const seq = ++suggestSeq;
    const range = { from: iso(availAll.weekStart), to: iso(addDays(availAll.weekStart, availAll.days - 1)) };
    suggestText.textContent = 'Finding free drivers…';
    suggestList.replaceChildren();
    suggestApply.disabled = true;
    suggestApply.textContent = 'Apply';
    let nearby;
    try {
      nearby = await readNearby(range.from, range.to);
    } catch (err) {
      if (seq === suggestSeq) suggestText.textContent = `The drivers could not be read. ${err.message}`;
      return;
    }
    if (seq !== suggestSeq) return;
    let rows = suggestRows(range);
    if (keep) {
      rows = rows.filter(r => keep.has(r.key));
      for (const r of rows) Object.assign(r, keep.get(r.key));
    }
    suggest = { nearby, rows };
    planSuggest();
    if (!keep) {
      // A not-sent driver is listed only while a free driver of better priority exists.
      const rank = d => d?.priority ?? 9;
      suggest.rows = rows.filter(r => r.state !== 'off' || (r.pick && rank(r.pick.d) < rank(r.now.who)));
      planSuggest();
    }
    const inEditor = editing?.id != null && [...panelIndex.trips.values()].some(t => String(t.id) === String(editing.id));
    suggestText.textContent = !suggest.rows.length
      ? `Every bus here has a driver, or one who has been sent the trip.${inEditor ? ' The trip open in the editor is left out.' : ''}`
      : keep ? 'These were not saved. Apply tries them again.'
      : 'Empty, declined and pending seats are ticked; a not-sent driver shows only when someone of better priority is free. '
        + `Applying saves at once and sends nothing to drivers.${inEditor ? ' The trip open in the editor is left out.' : ''}`;
    drawSuggest();
  }

  function openSuggest() {
    if (!client) { toast('info', 'Log in to suggest drivers'); return; }
    window.Rux?.modal?.open?.(suggestModal);
    loadSuggest();
  }

  suggestList?.addEventListener('change', e => {
    const t = e.target;
    const row = suggest?.rows.find(r => r.key === (t.dataset.suggestRow ?? t.dataset.suggestPick));
    if (!row) return;
    if (t.dataset.suggestRow) row.ticked = t.checked;
    else {
      row.choice = t.value || null;
      // A driver chosen by hand is meant to be applied.
      if (row.choice) row.ticked = true;
    }
    planSuggest();
    drawSuggest(t.id);
  });

  suggestApply?.addEventListener('click', async () => {
    const todo = suggest?.rows.filter(r => r.ticked && r.pick) ?? [];
    if (!todo.length) return;
    suggestApply.disabled = true;
    const byTrip = new Map();
    for (const r of todo) {
      if (!byTrip.has(r.trip)) byTrip.set(r.trip, []);
      byTrip.get(r.trip).push(r);
    }
    toast('working', 'Assigning drivers…');
    let saved = 0;
    const failed = new Map();
    for (const [trip, rows] of byTrip) {
      try {
        await saveSeats(trip, rows.map(r => ({ assign: r.assign, driver: r.pick.d })));
        saved += rows.length;
      } catch (err) {
        for (const r of rows) failed.set(r.key, { error: err.message, choice: String(r.pick.d.id), ticked: true });
      }
    }
    assignRead = null;
    await show();
    const drivers = n => `${n} ${n === 1 ? 'driver' : 'drivers'}`;
    if (!failed.size) {
      window.Rux?.modal?.close?.(suggestModal);
      toast('success', `Assigned ${drivers(saved)}`, 'Each starts at Not sent.');
      return;
    }
    toast('warning', saved ? `Assigned ${drivers(saved)}; ${failed.size} not saved` : 'No drivers were saved');
    loadSuggest(failed);
  });

  document.getElementById('scheduler-menu-suggest')?.addEventListener('click', () => {
    const menu = document.getElementById('scheduler-view-menu');
    if (menu) { window.Rux?.menu?.close?.(menu); menu.hidden = true; }
    openSuggest();
  });

  /* Takes a driver off the bar's bus, saved at once: the one in the Driver
     seat, unless `role` names another. A driver who has been sent the trip
     or has confirmed it is asked about first, because removing them here
     tells them nothing. `thrown` is the driver carried off the bar and let go
     clear of every other, who has to be in the seat still: their name
     slides back into the roster, and the notice offers to undo it. */
  const unassignModal = document.getElementById('scheduler-unassign-modal');
  let unassignAfter = null;
  async function removeDriver(bar, asked, thrown, role = 'driver') {
    const found = barSeat(bar, role);
    if (!found?.seat?.driver_id) return;
    const { ref } = found;
    const driverId = found.seat.driver_id;
    if (thrown && String(thrown) !== String(driverId)) {
      toast('info', `${histDriverName(thrown)} is no longer on that bus.`);
      return;
    }
    const name = histDriverName(driverId);
    const { status } = heldIn(found);
    const told = status === 'confirmed' || status === 'pending-response';
    if (told && !asked && unassignModal) {
      document.getElementById('scheduler-unassign-h').textContent = `Remove ${name}?`;
      document.getElementById('scheduler-unassign-text').textContent = status === 'confirmed'
        ? `${name} has confirmed this trip. Removing them here does not tell them, so let them know yourself.`
        : `${name} has been sent this trip. Removing them here does not tell them, so let them know yourself.`;
      unassignAfter = () => removeDriver(bar, true, thrown, role);
      window.Rux?.modal?.open?.(unassignModal);
      return;
    }
    toast('working', 'Removing the driver…');
    let row;
    try {
      [row] = await saveSeats(found.trip, [{ assign: found.assign, role, driver: null }]);
      assignRead = null;
      await show();
    } catch (err) {
      toast('error', `The driver was not removed. ${err.message}`);
      return;
    }
    const said = told ? 'Remember to let them know.' : undefined;
    if (!thrown) { toast('success', `${name} is off this bus.`, said); return; }
    nameBack(driverId);
    /* A throw is easier to make by accident than a pick from the menu, so it
       can be undone: the driver takes the seat again, with the status they
       had and what their row held, because a new seat starts at Not sent
       with nothing handed over. */
    toast('success', `${name} is off this bus.`, said, {
      label: 'Undo',
      onClick: () => undoSeats([{ ref, role, expect: null, driverId, status, keep: row }], `${name} is back on this bus.`),
    });
  }
  document.getElementById('scheduler-unassign-ok')?.addEventListener('click', () => {
    const run = unassignAfter;
    unassignAfter = null;
    window.Rux?.modal?.close?.(unassignModal);
    run?.();
  });
  // Shut, the box forgets what it was asked and takes back the word a move changed.
  unassignModal?.addEventListener('rux:modal-closed', () => {
    unassignAfter = null;
    document.getElementById('scheduler-unassign-ok').textContent = 'Remove';
  });

  // Opens the bar's trip on its Buses tab, for every driver and every seat.
  function openOnFleet(bar) {
    const toFleet = () => {
      const tab = document.getElementById('scheduler-tab-fleet');
      if (tab && tab.getAttribute('aria-selected') !== 'true') window.Rux?.tabs?.select?.(tab.closest('[role="tablist"]'), tab);
    };
    if (isEditorBar(bar)) { toFleet(); return; }
    const ref = barRef(bar);
    selectBar(bar);
    whenSafe(() => { openRef(ref); requestAnimationFrame(toFleet); });
  }

  // Opens the bar's trip on Details with the Email thread box asking, whose
  // Done fills the field for the trip's Save to write.
  function openOnThread(bar) {
    const askOnDetails = () => {
      const tab = document.getElementById('scheduler-tab-details');
      if (tab && tab.getAttribute('aria-selected') !== 'true') window.Rux?.tabs?.select?.(tab.closest('[role="tablist"]'), tab);
      document.querySelector('#scheduler-panel-details .scheduler-thread-add:not([hidden])')?.click();
    };
    if (isEditorBar(bar)) { askOnDetails(); return; }
    const ref = barRef(bar);
    selectBar(bar);
    whenSafe(() => { openRef(ref); requestAnimationFrame(askOnDetails); });
  }

  // Takes a bar's trip off its bus, the same write as a drop on the Unassigned row.
  async function takeOffBus(bar) {
    const assignmentId = bar.dataset.assignmentId;
    if (!assignmentId) return;
    // Held as values: the draw below replaces every bar.
    const { tripId } = bar.dataset;
    const fromBus = bar.dataset.busId || null;
    toast('working', 'Taking the trip off its bus…');
    try {
      // The same write the drag makes for a drop on the Unassigned row, drawn the same way.
      await moveToBus(assignmentId, null);
      recordBusChange(tripId, fromBus, null);
      await drawBusMove(tripId, assignmentId, null);
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

  const documentLink = id => `share/document.html?id=${encodeURIComponent(id)}`;
  /* A stored file is read through a link signed for ten minutes, never its
     public address, because the trip-documents bucket is closed to all but
     staff. Null when the file cannot be signed, and the caller falls back to
     the document's share page. */
  const signedDocumentUrl = async path => {
    if (!client || !path) return null;
    try {
      const { data, error } = await client.storage.from('trip-documents').createSignedUrl(path, 600);
      return error ? null : data?.signedUrl ?? null;
    } catch { return null; }
  };


  /* A form in the frame asks through the board's own dialog, so a print is
     asked about one way whatever was printed. It answers null on a no, and
     on a yes what was typed in `field`, where the question had one. */
  const askForForm = async (question, field = null) => ((await ask(question, '', field))
    ? { value: field ? String(askField?.value ?? '').trim() : '' } : null);



  /* WHAT A STORED ITINERARY MARKS. Opened from a Departures line or the
     checklist it is the sheet a leg's drivers are handed, so after a print
     the board asks, as the itinerary this app draws asks, and Yes writes
     `itinerary_printed` on every seat of the leg, which the trip's checklist
     and Departures read. The toolbar carries no box for it, because the
     question is the one place it is marked. A file opened any other way
     marks nothing. */
  function itineraryMarkOf(trip, leg) {
    const rows = (trip?.trip_assignments || []).filter(a => legKeyOfVehicle(trip, a) === leg)
      .flatMap(a => a.trip_drivers || []).filter(seat => seat.driver_id);
    if (!rows.length) return null;
    const names = rows.map(seat => {
      const who = panelIndex.driversById.get(seat.driver_id);
      return who?.short_name || who?.name || '';
    }).filter(Boolean);
    return { rows, names: [...new Set(names)] };
  }
  const isMarked = mark => mark.rows.every(seat => seat.itinerary_printed);

  // The seats in hand follow the write, so a second print of the same file does not ask again.
  async function markItinerary(mark) {
    const { error } = client
      ? await client.from('trip_drivers').update({ itinerary_printed: true }).in('id', mark.rows.map(seat => seat.id))
      : { error: { message: 'Not connected.' } };
    if (error) { toast('error', 'The itinerary was not marked.', error.message); return; }
    mark.rows.forEach(seat => { seat.itinerary_printed = true; });
    toast('success', 'Itinerary marked printed');
  }

  /* EACH OF THE THREE PANELS IS ONE OF THESE: `doc` frames a stored file in
     the markup's own panel, and `forms` and `calc` frame the forms list and the
     quote calculator in copies of it, made before anything here touches the
     markup, their ids renamed from `scheduler-viewer` to `scheduler-<key>-viewer`
     and their copies menu with them. Each keeps its own state, and its frame
     carries its own host, so a page in it talks to the panel it is in. */
  const VIEWER_NAMES = { doc: 'Document', forms: 'Forms', calc: 'Quote calculator' };
  const viewerMarkup = document.getElementById('scheduler-viewer')?.cloneNode(true) ?? null;
  const viewerMenuMarkup = document.getElementById('scheduler-viewer-copies')?.cloneNode(true) ?? null;
  function makeViewer(key) {
    const prefix = key === 'doc' ? 'scheduler-viewer' : `scheduler-${key}-viewer`;
    if (key !== 'doc' && viewerMarkup) {
      const rename = node => {
        for (const n of [node, ...node.querySelectorAll('[id]')]) {
          if (n.id?.startsWith('scheduler-viewer')) n.id = n.id.replace('scheduler-viewer', prefix);
        }
        return node;
      };
      const column = rename(viewerMarkup.cloneNode(true));
      column.hidden = true;
      document.getElementById('scheduler-viewer')?.after(column);
      if (viewerMenuMarkup) document.getElementById('scheduler-viewer-copies')?.after(rename(viewerMenuMarkup.cloneNode(true)));
      const aside = column.querySelector('aside');
      aside?.setAttribute('aria-label', VIEWER_NAMES[key]);
      column.querySelector(`#${prefix}-close`)?.setAttribute('aria-label', `Close ${VIEWER_NAMES[key].toLowerCase()}`);
      // Only a stored file opens larger, so the copies have no expand button.
      column.querySelector(`#${prefix}-expand`)?.remove();
      // The forms list and the calculator open at the lists' width; see app.css.
      column.classList.add('scheduler-viewer--list');
    }
    const byId = part => document.getElementById(part ? `${prefix}-${part}` : prefix);
  const viewerEl = byId();
  let viewerFrame = byId('frame');
  const viewerTitle = byId('title');
  const viewerTitleCollapsed = byId('title-collapsed');
  const viewerUploaded = byId('uploaded');
  const viewerStatus = byId('status');
  const viewerPrint = byId('print');
  const viewerToolbar = byId('toolbar');
  const viewerCopies = byId('copies');
  const viewerDownload = byId('download');
  const viewerNewTab = byId('new-tab');
  const viewerClose = byId('close');
  const viewerHead = byId('head');
  const viewerBack = byId('back');
  const viewerZooms = [...(viewerEl?.querySelectorAll('[data-viewer-zoom]') ?? [])];
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
  // The seats the itinerary showing is printed for, where a Departures line opened it.
  let viewerMark = null;
  // The stored file's type, lowercase, so following another trip shows that trip's of the same kind.
  let viewerType = null;


  /* Each load gets a new frame: a PDF viewer does not read a changed fragment
     again, and navigating a frame that has loaded adds to the tab's history,
     so Back would step through zooms. */
  function swapFrame(src) {
    const frame = viewerFrame.cloneNode(false);
    frame.schedulerHost = host;
    viewerDirty = false;
    // A page of this origin says when it is typed into, so closing it for room asks first.
    frame.addEventListener('load', () => {
      try { frame.contentDocument?.addEventListener('input', () => { viewerDirty = true; }, true); } catch { /* a file's viewer */ }
    });
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
     frames either; what differs is only what the toolbar can offer. The zooms
     send `#zoom=` to a PDF viewer, which an HTML page ignores, and the page is
     fluid instead; there is no file to download, and the print dialog saves a
     PDF. Print stands for both, and a form adds its own controls ahead of it.
     The expand button is a stored file's too: a form, the forms list and the
     calculator lay themselves out to the panel, so they have no button.

     OPEN IN NEW TAB IS A STORED FILE'S ALONE. A form opened as a page took the
     board's place and the week with it, and everything the page offers the
     panel already does; the link stays set, as the tab a print falls back to. */
  function setViewerMode(mode) {
    const form = mode === 'form';
    viewerMark = null;
    setToolbarShown(true);
    setViewerBack(null);
    for (const btn of viewerZooms) btn.hidden = form || noZoom;
    viewerDownload.hidden = form;
    viewerNewTab.hidden = form;
    if (!form) setFormControls([]);
  }

  /* WHAT A GENERATED FORM PUTS IN THIS TOOLBAR. print.html builds its own
     controls and hands the nodes up; this adopts them, so the listeners it
     registered keep working and there is one builder rather than two. It hands
     them over again on every rebuild -- a copy chosen from the head -- so the
     slot is replaced whole each time. The head's list is the way to another
     copy, and the panel keeps no overflow: the form's page carries Print
     all. */
  let formNodes = [];
  function setFormControls(nodes) {
    if (!viewerToolbar) return;
    for (const node of formNodes) node.remove();
    formNodes = nodes.map((node, i) => {
      const here = document.adoptNode(node);
      /* What the toolbar's own rules size and hold in place, and what a later
         hand-over takes back out again. The last one is named, because it is
         the one that parts these from the buttons every document gets, and
         the zoom buttons hidden between them are no use as a landmark. */
      here.setAttribute('data-viewer-form', i === nodes.length - 1 ? 'last' : '');
      return here;
    });
    viewerToolbar.prepend(...formNodes);
  }

  /* The line a form has to say, in the place a stored file says when it was
     uploaded: the room before the row's buttons. It borrows the line and
     gives it back, so the leg a form was opened on returns once the form has
     finished saying whatever it had to say. */
  let viewerNote = '';
  function setFormNote(text, bad) {
    if (!viewerUploaded) return;
    viewerUploaded.textContent = text || viewerNote;
    viewerUploaded.toggleAttribute('data-bad', Boolean(text) && Boolean(bad));
  }

  /* THE HEAD: which document is on screen, in one line. One that is one of
     several makes its title the button that lists them, as the board's week
     label opens its date picker; one that stands alone stays text, because a
     menu of one thing is a menu that wastes a press. A pick may head the
     panel by a shorter name than the list gives it, as an envelope's driver
     alone; the whole name is the title's hover. */
  let viewerPick = [];
  function setViewerHead(title, picks = []) {
    viewerPick = picks;
    const chosen = picks.find(p => p.checked);
    const name = chosen ? chosen.head ?? chosen.label : title;
    for (const h of [viewerTitle, viewerTitleCollapsed]) {
      h.replaceChildren();
      h.textContent = name || '';
      h.title = chosen?.label ?? name ?? '';
    }
    if (!viewerTitle) return;
    const listed = picks.length > 1;
    viewerTitle.classList.toggle('scheduler-viewer__pick', listed);
    if (!listed) {
      viewerTitle.removeAttribute('role');
      viewerTitle.removeAttribute('tabindex');
      viewerTitle.removeAttribute('aria-haspopup');
      if (window.Rux?.menu?.isOpen?.(viewerCopies)) window.Rux.menu.close(viewerCopies);
      return;
    }
    viewerTitle.setAttribute('role', 'button');
    viewerTitle.setAttribute('tabindex', '0');
    viewerTitle.setAttribute('aria-haspopup', 'menu');
    viewerTitle.appendChild(svgUse('#m-keyboard_arrow_down', '16', '0 0 960 960'));
  }

  // The same rows the overflow draws, from the same table, so a list of
  // documents and a list of choices are one kind of thing to read.
  function drawCopies() {
    if (!viewerCopies) return;
    viewerCopies.replaceChildren(...viewerPick.map((pick, i) => {
      const row = el('li', 'rux--menu-item');
      row.setAttribute('role', 'menuitemradio');
      row.setAttribute('aria-checked', String(Boolean(pick.checked)));
      row.tabIndex = 0;
      row.dataset.viewerPick = String(i);
      row.append(
        el('div', 'rux--menu-item__selection-icon',
          ...(pick.checked ? [] : [])),
        el('div', 'rux--menu-item__icon'),
        el('div', 'rux--menu-item__label', pick.label),
      );
      if (pick.checked) {
        row.querySelector('.rux--menu-item__selection-icon')
          .replaceChildren(svgUse('#m-check', '16', '0 0 20 20'));
      }
      return row;
    }));
  }

  viewerTitle?.addEventListener('click', () => {
    if (viewerPick.length < 2) return;
    drawCopies();
    const r = viewerTitle.getBoundingClientRect();
    popMenuAt(viewerCopies, { clientX: r.left, clientY: r.bottom }, viewerTitle);
  });

  viewerTitle?.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (viewerPick.length < 2) return;
    e.preventDefault();
    viewerTitle.click();
  });

  viewerCopies?.addEventListener('click', e => {
    const row = e.target.closest('[data-viewer-pick]');
    if (!row) return;
    viewerPick[Number(row.dataset.viewerPick)]?.choose?.();
  });

  viewerCopies?.addEventListener('rux:menu-closed', () => { viewerCopies.hidden = true; });


  /* Whether the frame holds something to act on. The Forms list does not, and
     says so; opening anything else brings the row back. */
  function setToolbarShown(shown) {
    if (viewerToolbar) viewerToolbar.hidden = !shown;
    setResizable(shown && key !== 'calc');
  }

  /* A DOCUMENT IS DRAGGED WIDER AT ITS EDGE. A stored file and a form each
     show a page that is small at the column's width, so they carry a handle in
     the gap beside the panel; the forms list and the calculator have nothing
     to read at length and stay at the lists' width. The width is the column's
     own `--scheduler-viewer-w`, which `placeRoom` reads back, so the week gives
     way as it does for any panel and the drag stops where the week would reach
     its minimum. It lasts as long as the page is showing: closing the panel, or
     going back to the list, returns the column to its width. */
  const RESIZE_MIN = 20;
  const RESIZE_MAX = 64;
  const RESIZE_STEP = 1;
  const resizer = document.createElement('div');
  resizer.className = 'scheduler-viewer__resize';
  resizer.setAttribute('role', 'separator');
  resizer.setAttribute('aria-orientation', 'vertical');
  resizer.setAttribute('aria-label', `Resize ${VIEWER_NAMES[key].toLowerCase()}`);
  resizer.title = 'Drag to resize, double-click to reset';
  resizer.tabIndex = 0;
  resizer.hidden = true;
  viewerEl?.append(resizer);

  const viewerWidth = () => ownWidth(viewerEl, '--scheduler-viewer-w');
  function resizeLimits() {
    const rem = remPx();
    const board = boardEl?.getBoundingClientRect().width ?? 0;
    const gap = parseFloat(getComputedStyle(boardEl).columnGap) || 0;
    const open = panels().filter(p => p.open);
    const used = open.reduce((sum, p) => sum + p.width(), 0) + open.length * gap + weekMin() * rem;
    const max = Math.max(RESIZE_MIN * rem, Math.min(RESIZE_MAX * rem, viewerWidth() + board - used));
    return { min: RESIZE_MIN * rem, max };
  }
  function syncResizer() {
    const { min, max } = resizeLimits();
    const now = viewerWidth();
    resizer.setAttribute('aria-valuemin', String(Math.round(min)));
    resizer.setAttribute('aria-valuemax', String(Math.round(max)));
    resizer.setAttribute('aria-valuenow', String(Math.round(now)));
  }
  let resizeFrame = 0;
  function setViewerWidth(px) {
    const { min, max } = resizeLimits();
    const rem = remPx();
    viewerEl.style.setProperty('--scheduler-viewer-w', `${Math.min(max, Math.max(min, px)) / rem}rem`);
    syncResizer();
    // The board lays out once a frame, however fast the pointer moves.
    if (resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      placeRoom();
      window.Rux?.schedule?.fit?.();
    });
  }
  function setResizable(on) {
    if (!viewerEl) return;
    resizer.hidden = !on;
    if (on) { syncResizer(); return; }
    if (!viewerEl.style.getPropertyValue('--scheduler-viewer-w')) return;
    viewerEl.style.removeProperty('--scheduler-viewer-w');
    placeRoom();
    window.Rux?.schedule?.fit?.();
  }
  /* The pointer is captured by the handle, so the file's frame under it does not
     take the drag, and the width follows how far the pointer has moved from
     where it went down: the column is left of the week, so right is wider.

     The week is not laid out again while the pointer moves: fitting its bars
     to a new width costs far more than a frame, and it is the whole of what
     made a drag stutter. It keeps the width it had, as the column grows over
     its side, and the board clips what runs past; once the pointer is let go it
     takes its place and is fitted once. The limits are read once, and the
     width is set once a frame. */
  resizer.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX;
    const startW = viewerWidth();
    const rem = remPx();
    const sign = getComputedStyle(viewerEl).direction === 'rtl' ? -1 : 1;
    const { min, max } = resizeLimits();
    resizer.setPointerCapture(e.pointerId);
    resizer.setAttribute('data-dragging', '');
    // Read first: with `flex: none` the week measures as its content, not as it is shown.
    const weekW = frameEl.getBoundingClientRect().width;
    frameEl.style.flex = 'none';
    frameEl.style.inlineSize = `${weekW}px`;
    boardEl.style.overflowX = 'clip';
    let x = startX;
    let pending = 0;
    const apply = () => {
      pending = 0;
      const w = Math.min(max, Math.max(min, startW + (x - startX) * sign));
      viewerEl.style.setProperty('--scheduler-viewer-w', `${w / rem}rem`);
      frameEl.style.marginInlineEnd = `${startW - w}px`;
      resizer.setAttribute('aria-valuenow', String(Math.round(w)));
    };
    const move = ev => {
      x = ev.clientX;
      if (!pending) pending = requestAnimationFrame(apply);
    };
    const stop = () => {
      cancelAnimationFrame(pending);
      if (pending) apply();
      resizer.removeAttribute('data-dragging');
      resizer.removeEventListener('pointermove', move);
      resizer.removeEventListener('pointerup', stop);
      resizer.removeEventListener('pointercancel', stop);
      for (const prop of ['flex', 'inlineSize', 'marginInlineEnd']) frameEl.style[prop] = '';
      boardEl.style.overflowX = '';
      syncResizer();
      placeRoom();
      window.Rux?.schedule?.fit?.();
    };
    resizer.addEventListener('pointermove', move);
    resizer.addEventListener('pointerup', stop);
    resizer.addEventListener('pointercancel', stop);
  });
  resizer.addEventListener('keydown', e => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    setViewerWidth(viewerWidth() + dir * (e.shiftKey ? 4 : RESIZE_STEP) * remPx());
  });
  resizer.addEventListener('dblclick', () => { setResizable(false); setResizable(true); });

  /* THE WAY BACK TO THE LIST a form was chosen from. The form says how to go
     back, since the list is its frame's page and not this one's; anything
     opened from the board has nowhere to go back to, and passes nothing. */
  let viewerGoBack = null;
  function setViewerBack(go) {
    viewerGoBack = typeof go === 'function' ? go : null;
    if (viewerBack) viewerBack.hidden = !viewerGoBack;
    viewerHead?.classList.toggle('rux--side-panel__header--on-detail-step', Boolean(viewerGoBack));
  }
  viewerBack?.addEventListener('click', () => viewerGoBack?.());

  /* WHERE OPEN AS A PAGE GOES: the page the frame is on now. The Forms list
     moves the frame to a form by itself, so the address the panel opened is
     not always the one showing. */
  function setFormLink(url) {
    if (url) viewerNewTab.href = url;
    offerQuoteSent(url);
  }

  /* The customer quote, opened beside the trip in the editor, offers to mark
     the quote sent at its price, once, for Save to keep. The form prints what
     is saved, so a price with unsaved changes asks for a Save first. */
  function offerQuoteSent(url) {
    let params;
    try { params = new URL(url, location.href).searchParams; } catch { return; }
    if (params.get('form') !== 'customer-quote' || !editing || panelEl.hidden) return;
    if (String(params.get('trip')) !== String(editing.id)) return;
    const price = money(document.getElementById('scheduler-f-quoted')?.value ?? '');
    const saved = editing.before?.quoted_price == null ? null : Number(editing.before.quoted_price);
    if (price == null) return;
    if (price !== saved || linesPatch()?.work) {
      toast('info', 'Save to send this price', 'The quote shows the last saved price.');
      return;
    }
    if (editing.quoteSent && round2(editing.quoteSent.price) === round2(price)) return;
    toast('info', 'Customer quote', `Mark it sent at ${usdCents(price)}?`, {
      label: 'Mark quote sent',
      onClick: () => {
        editing.quoteSent = { price: round2(price), on: iso(new Date()) };
        refreshDirty();
        toast('success', 'Quote marked sent', 'Save to keep it.');
      },
    });
  }

  // And it says what it did in the board's toast, as the board does.
  const host = { setFormControls, setFormNote, setViewerHead, setToolbarShown, setViewerBack, setFormLink, ask: askForForm,
    report: window.SchedulerToast.report, setTrip };

  /* Shows the panel, which the opener has already found room for. A panel
     already open keeps its place among the others. */
  function showViewer(opener) {
    if (viewerEl.hidden) {
      viewerOpener = opener ?? null;
      viewerEl.hidden = false;
    }
    placeRoom();
    window.Rux?.schedule?.fit?.();
    syncViewerButtons();
  }

  /* What the panel was last opened on, whether a page in its frame has been
     typed into since, and the trip it shows, by id, for the head's number and
     for following the selected trip. */
  let viewerKind = null;
  let viewerDirty = false;
  let viewerTrip = null;
  const viewerRef = el('span', 'scheduler-panel-ref');
  viewerRef.hidden = true;
  // In the title's own row, which this head's column of one line holds, so the head keeps its height.
  viewerTitle?.after(viewerRef);
  // The trip's number beside the title, as the editor's head carries it.
  function setTrip(id) {
    viewerTrip = id == null ? null : String(id);
    const trip = viewerTrip ? (panelIndex.trips.get(viewerTrip) ?? (String(editing?.id) === viewerTrip ? editing.trip : null)) : null;
    const ref = trip?.trip_ref ? String(trip.trip_ref) : '';
    viewerRef.textContent = ref ? `#${ref}` : '';
    viewerRef.title = ref ? `Trip ${ref}` : '';
    viewerRef.hidden = !ref;
  }

  /* A form from print.html. It needs no fetch and no blob address: a page of
     this site is already this origin, which is the whole reason a PDF is
     fetched into one -- so the panel may print what it frames. */
  async function openGenerated({ url, kind, note, opener, trip = null }) {
    if (!viewerEl) {
      window.open(url, '_blank', 'noopener');
      return;
    }
    if (viewerEl.hidden && !(await makeRoom(key))) return;
    setTrip(trip);
    dropShown();
    setViewerMode('form');
    viewerKind = kind;
    // The controls belong to the frame being replaced, so they go with it and
    // the page hands its own up once it has drawn.
    setFormControls([]);
    setViewerHead(kind);
    viewerNote = note || '';
    setFormNote('');
    viewerPrint.disabled = false;
    viewerNewTab.href = url;
    // No document row stands behind it, so a replace or a delete in the Files
    // tab has nothing here to follow.
    viewerDocId = null;
    showViewer(opener);
    viewerClose?.focus();
    swapFrame(url);
  }

  /* After a print the board asks, by name, in the dialog it asks about a
     reminder in and in a drawn form's own words: a print dialog cancelled
     looks the same as a sheet that came out, so nothing is marked by
     printing. Yes writes the tick and No writes nothing. Seats already
     marked are not asked about again. */
  async function askItineraryPrinted() {
    const mark = viewerMark;
    if (!mark || isMarked(mark)) return;
    const who = presenceNames(mark.names.map(name => ({ name })));
    const question = mark.rows.length === 1 && who ? `Mark ${who}'s itinerary as printed?`
      : `Mark the itinerary as printed for ${who || 'this trip'}?`;
    if (await ask(question)) void markItinerary(mark);
  }

  /* `trip` names the file as file-names.js names every file, so a copy saved
     or printed from here is offered under the name, whatever it was stored as.
     `mark` is the leg's seats an itinerary is printed for, where a Departures
     line opened it. */
  async function openDocument(doc, opener, trip, mark = null) {
    if (!doc) return;
    if (viewerEl && viewerEl.hidden && !(await makeRoom(key))) return;
    setViewerMode('file');
    const url = await signedDocumentUrl(doc.file_path);
    if (!viewerEl || !url) {
      window.open(documentLink(doc.id), '_blank', 'noopener');
      return;
    }
    /* A stored file's head names its type and nothing else. Which trip it
       belongs to is the editor's own heading, open behind this panel, so
       naming the destination here said it twice, and a file that is only
       itself has nothing to list. */
    const kind = docTypeName(doc);
    viewerKind = null;
    setViewerHead(kind);
    const when = uploadedOn(doc.created_at);
    viewerUploaded.textContent = when ? `Uploaded ${when}` : '';
    // The panel can stay open past the link's ten minutes; the share page
    // signs a fresh one each time it is opened.
    viewerNewTab.href = documentLink(doc.id);
    viewerDocId = String(doc.id);
    viewerType = String(doc.label || '').toLowerCase();
    viewerMark = mark;
    setTrip(trip?.id ?? doc.trip_id ?? null);
    showViewer(opener);
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
      const fileName = trip ? window.SchedulerFileNames.forUpload(trip, doc.label)
        : doc.file_name || `${docSlug(kind, 'document')}.pdf`;
      viewerShown = { id: doc.id, blob, zoom: null, fileName };
      viewerFrame.title = kind;
      viewerDownload.href = blob;
      viewerDownload.download = fileName;
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
  /* The frame is a blob of this page's origin, so the page may print it. A
     browser that refuses gets the file in a new tab, where its viewer prints.
     Chrome's Save as PDF names the file after this page's title, so a stored
     file holds the title to its name while the dialog is open: a print that
     waits for the dialog to close gives it back at once, and one that does not
     gives it back when the page next has the focus. A form sets the title from
     its own page, print.js, when it prints. */
  viewerPrint?.addEventListener('click', () => {
    const name = viewerShown?.fileName;
    const titleBefore = document.title;
    const giveBack = () => { document.title = titleBefore; };
    try {
      if (name) document.title = window.SchedulerFileNames.bare(name);
      const started = Date.now();
      viewerFrame.contentWindow.focus();
      viewerFrame.contentWindow.print();
      askItineraryPrinted();
      if (!name) return;
      if (Date.now() - started > 500) giveBack();
      else window.addEventListener('focus', giveBack, { once: true });
    } catch {
      giveBack();
      window.open(viewerNewTab.href, '_blank', 'noopener');
    }
  });

  function closeViewer(returnFocus = true) {
    if (!viewerEl || viewerEl.hidden) return;
    viewerEl.hidden = true;
    viewerEl.removeAttribute('data-expanded');
    resizer.hidden = true;
    viewerEl.style.removeProperty('--scheduler-viewer-w');
    viewerDocId = null;
    viewerType = null;
    viewerMark = null;
    setTrip(null);
    syncViewerButtons();
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

  /* A selected trip with no file of the kind showing: the panel stays,
     its head naming the kind and the trip's number, and says so. */
  function showNoFile(kind, tripId) {
    viewerSeq++;
    dropShown();
    setViewerMode('file');
    setViewerHead(kind);
    setTrip(tripId);
    viewerDocId = null;
    viewerMark = null;
    viewerUploaded.textContent = '';
    viewerStatus.hidden = false;
    viewerStatus.replaceChildren(note('info', 'No files uploaded', ''));
  }

  return {
    key, el: viewerEl, host, openGenerated, openDocument, showNoFile, close: closeViewer,
    get kind() { return viewerKind; },
    get dirty() { return viewerDirty; },
    get trip() { return viewerTrip; },
    get docId() { return viewerDocId; },
    get docType() { return viewerType; },
    get mark() { return viewerMark; },
    get frame() { return viewerFrame; },
  };
  }
  window.Rux = window.Rux || {};
  viewers = { doc: makeViewer('doc'), forms: makeViewer('forms'), calc: makeViewer('calc') };
  // A page framed by an older board finds the forms panel's host here.
  window.Rux.viewer = viewers.forms.host;
  const openDocument = (...args) => viewers.doc.openDocument(...args);
  /* THE TRIP'S PANELS FOLLOW THE TRIP IN FOCUS: the editor's, where it is
     open on a saved trip, and otherwise the selected one. Forms shows that
     trip's forms, the document panel that trip's newest file of the kind it
     is showing, or No files uploaded where it has none, and the calculator
     that trip's figures: from the editor where the trip is the editor's,
     and from its saved rows where it is not. They follow only when the trip in focus changes,
     so a panel opened on another trip on purpose stays on it until then. A
     panel with something typed in it asks first, and keeps what it shows on
     a no; with no trip in focus, each keeps what it shows. */
  let focusShown = null;
  let following = false;
  const editorOn = id => !!tripEl && !tripEl.hidden && String(editing?.id) === String(id);
  const tripInFocus = () => {
    if (tripEl && !tripEl.hidden && editing?.id && !editing.creating) return String(editing.id);
    const id = selectedBar()?.dataset.tripId;
    return id ? String(id) : null;
  };
  async function followFocus() {
    const id = tripInFocus();
    // Where the trip in focus is the editor's counts too, so the editor opening on the trip the calculator shows fills it from the editor.
    const key = id && `${id}${editorOn(id) ? ':editor' : ''}`;
    if (key === focusShown || following) return;
    focusShown = key;
    if (!id) return;
    following = true;
    try {
      const trip = panelIndex.trips.get(id) ?? (String(editing?.id) === id ? editing.trip : null);
      const dest = trip?.destination || 'this trip';
      const asks = async (viewer, what) => !viewer.dirty || ask(`Show ${what} for ${dest}?`, 'What was typed in the panel is not kept.');
      const forms = viewers.forms;
      if (forms?.el && !forms.el.hidden && forms.trip !== id && await asks(forms, 'the forms')) openForms(null, id, null);
      const doc = viewers.doc;
      if (doc?.el && !doc.el.hidden && doc.trip !== id && doc.docType && trip && await asks(doc, 'the file')) {
        const same = documentsOf(trip).find(d => String(d.label || '').toLowerCase() === doc.docType);
        if (same) openDocument(same, null, trip);
        else doc.showNoFile(FILE_NAMES[doc.docType] ?? doc.docType, id);
      }
      const calc = viewers.calc;
      const calcFromEditor = calcFor && String(calcFor.trip) === id;
      if (calc?.el && !calc.el.hidden && (calc.trip !== id || (editorOn(id) && !calcFromEditor)) && await asks(calc, 'the quote calculator')) {
        if (editorOn(id)) openCalculator(null);
        else openSavedCalculator(trip, selectedBar()?.dataset.tripId === id ? selectedBar().dataset.legKey : null);
      }
    } finally {
      following = false;
    }
    // The focus may have moved again while a panel asked.
    const now = tripInFocus();
    if ((now && `${now}${editorOn(now) ? ':editor' : ''}`) !== focusShown) followFocus();
  }

  const openGenerated = ({ kind, ...rest }) => (kind === 'Quote calculator' ? viewers.calc : viewers.forms).openGenerated({ kind, ...rest });

  /* THE TOOLBAR'S FORMS AND CALCULATOR BUTTONS are pressed while their panel
     is open. */
  const formsOpen = document.getElementById('scheduler-forms-open');
  const calcOpen = document.getElementById('scheduler-calc-open');
  function syncViewerButtons() {
    for (const [button, viewer] of [[formsOpen, viewers.forms], [calcOpen, viewers.calc]]) {
      if (!button) continue;
      const on = !!viewer.el && !viewer.el.hidden;
      button.setAttribute('aria-pressed', String(on));
      // rux.css styles nothing on `aria-pressed`; `rux--btn--selected` is
      // Carbon's pressed look, as on the board's other pane toggles.
      button.classList.toggle('rux--btn--selected', on);
    }
  }
  /* Forms opens the selected trip's forms, or the trip's in the editor, and
     with neither the forms list itself, every form blank. The calculator
     opens filled from the selected trip, or from the editor's, as the bar
     menu's Quote calculator does, and with neither, empty. A press on a
     pressed one shuts its panel. */
  // Each names the panel it opens, which is made above rather than written in the page.
  formsOpen?.setAttribute('aria-controls', 'scheduler-forms-viewer-panel');
  calcOpen?.setAttribute('aria-controls', 'scheduler-calc-viewer-panel');
  formsOpen?.addEventListener('click', () => {
    if (viewers.forms.el && !viewers.forms.el.hidden) { viewers.forms.close(); return; }
    const bar = selectedBar();
    if (bar) openForms(bar, bar.dataset.tripId, formsOpen);
    else if (editing?.id) openForms(null, editing.id, formsOpen);
    else openGenerated({ url: 'print.html', kind: 'Forms', note: '', opener: formsOpen });
  });
  calcOpen?.addEventListener('click', () => {
    if (viewers.calc.el && !viewers.calc.el.hidden) { viewers.calc.close(); return; }
    const id = tripInFocus();
    const bar = selectedBar();
    if (id && editorOn(id)) openCalculator(null);
    else if (id) openSavedCalculator(panelIndex.trips.get(id), bar?.dataset.tripId === id ? bar.dataset.legKey : null, calcOpen);
    else {
      calcFor = null;
      openGenerated({ url: 'quote.html', kind: 'Quote calculator', note: '', opener: calcOpen });
    }
  });

  // Open itinerary, from a shortcut slot or the bar menu: the trip's newest.
  /* The forms this trip can fill in, on print.html's own list. It takes the
     trip rather than the bar's assignment, because the list is the trip's and
     a form that wants one bus asks for it once it is chosen. */
  // From a bar, or with a trip's id and the button that asked.
  function openForms(bar, id = bar?.dataset.tripId, opener = bar) {
    if (!id) return;
    openGenerated({
      url: `print.html?trip=${encodeURIComponent(id)}`,
      kind: 'Forms',
      note: '',
      opener,
      trip: id,
    });
  }

  /* One of a trip's forms, on one bus and one driver's seat, as the address a
     Departures line carries asks for it. It says it came from the trip's
     Forms, so the panel's Back reaches the trip's other forms. The head says
     Form until the form has drawn and names its own copy. */
  function openTripForm({ form, layout, trip, assignment, driver } = {}, opener = null) {
    if (!/^[a-z-]+$/.test(form ?? '')) return;
    const asks = new URLSearchParams({ form });
    if (layout) asks.set('layout', layout);
    if (assignment) asks.set('assignment', assignment);
    if (driver) asks.set('driver', driver);
    if (trip) { asks.set('trip', trip); asks.set('from', 'forms'); }
    openGenerated({ url: `print.html?${asks}`, kind: 'Form', note: '', opener, trip: trip ?? null });
  }

  /* The itinerary a leg's drivers are handed, as a Departures line asks for
     it: the file the customer sent, which is the sheet the office prints, with
     the leg's seats to mark. A trip that has lost its file since the line was
     drawn gets the itinerary this app draws. The leg is named by its key, or
     by the old word an older link names it by, and none is the first leg. */
  function openLegItinerary({ trip: id, leg, assignment, driver } = {}, opener = null) {
    // The trip in the editor may be off the week showing.
    const trip = panelIndex.trips.get(id) ?? (id && String(editing?.id) === String(id) ? editing.trip : null);
    const key = trip ? legByKey(trip, leg || 'outbound')?.key ?? leg : leg;
    const doc = trip ? legItinerary(trip, key) : null;
    if (doc) openDocument(doc, opener, trip, itineraryMarkOf(trip, key));
    else openTripForm({ form: 'driver-itinerary', layout: 'simple', trip: id, assignment, driver }, opener);
  }

  /* The quote calculator beside the week, filled with a leg's miles a day and
     its dead miles as the Route tab's Summary counts them, from what the
     editor's fields say now, saved or not. A trip picked on the board opens in
     the editor first, since the Summary is where its days are counted. Until
     the route has miles, typed estimated miles stand in, spread over the days
     with the remainder on the first. `bar` is null from the editor's own row. */
  async function openCalculator(bar) {
    if (bar && !isEditorTrip(bar)) {
      const ref = barRef(bar);
      whenSafe(() => { openRef(ref); if (String(editing?.id) === String(ref.tripId)) openCalculator(null); });
      return;
    }
    // A trip just opened is still looking up the drives it has none for.
    const trip = editing?.id;
    await Promise.race([editing?.route?.drivesFound, new Promise(done => setTimeout(done, 3000))]);
    if (editing?.id !== trip) return;
    const leg = bar ? bar.dataset.leg : (editing?.route ? wordOfLeg(editing.route.leg) : panelArgs?.ref?.leg);
    const facts = calcFacts(leg);
    const params = new URLSearchParams();
    if (facts.miles) params.set('miles', facts.miles.join(','));
    if (facts.drivers === 2) params.set('drivers', '2');
    params.set('buses', String(facts.buses));
    if (facts.relief > 0) params.set('relief', String(facts.relief));
    // The trip's first day, whose month the calculator's opening rate is for.
    if (tripFirstDay()) params.set('date', tripFirstDay());
    // The route's dead miles, which the calculator offers, and whether the
    // leg's rental already counts them.
    if (facts.dead > 0) {
      params.set('dead', String(facts.dead));
      const legKey = splitNow() ? (leg === 'return' ? 'return' : 'outbound') : null;
      if (linePending.some(l => l.kind === 'rental' && l.deadOn && (legKey === null || (l.leg ?? 'outbound') === legKey))) params.set('deadon', '1');
    }
    calcFor = { trip: editing?.id, leg };
    openGenerated({
      url: `quote.html?${params}`,
      kind: 'Quote calculator',
      note: '',
      opener: bar ?? document.getElementById('scheduler-f-quotemenu'),
      trip: editing?.id ?? null,
    });
  }

  /* THE CALCULATOR FROM A TRIP'S SAVED ROWS, for a trip that is not in the
     editor: its stops' miles, or its estimated miles where they have none,
     spread over the leg's days, the pickup and return drives as dead miles,
     and its buses and their co-driver and relief seats as saved. What the
     editor has not saved yet is not in it, so the editor's trip is filled
     from the editor instead. */
  function savedCalcFacts(trip, legKey) {
    const leg = (legKey ? legByKey(trip, legKey) : null) ?? legsOf(trip)[0];
    if (!leg) return null;
    const { stops } = stopsOfLeg(trip, leg.key);
    const pickup = stops.find(st => st.type === 'pickup');
    const back = stops.filter(st => st.type === 'return').at(-1);
    const stopMiles = stops.reduce((n, st) => n + (Number(st.miles) || 0), 0);
    const legs = legsOf(trip);
    const whole = Math.round(stopMiles > 0 ? stopMiles : (legs.length < 2 ? Number(trip.est_miles) || 0 : 0));
    const days = leg.from && leg.ends ? daysBetween(parseISO(leg.from), parseISO(leg.ends)) + 1 : 1;
    const buses = (trip.trip_assignments || []).filter(a => legKeyOfVehicle(trip, a) === leg.key);
    const seatsOn = role => buses.filter(a => (a.active_roles || []).includes(role)).length;
    return {
      miles: window.SchedulerQuoteLines.milesADay(null, whole, days),
      dead: round2((Number(pickup?.miles) || 0) + (Number(back?.miles) || 0)),
      drivers: seatsOn('co-driver') > 0 ? 2 : 1,
      buses: Math.max(buses.length, 1),
      relief: seatsOn('relief-start') + seatsOn('relief-end'),
      date: leg.from,
    };
  }
  function openSavedCalculator(trip, legKey, opener = null) {
    const facts = trip ? savedCalcFacts(trip, legKey) : null;
    if (!facts) return;
    const params = new URLSearchParams();
    if (facts.miles) params.set('miles', facts.miles.join(','));
    if (facts.drivers === 2) params.set('drivers', '2');
    params.set('buses', String(facts.buses));
    if (facts.relief > 0) params.set('relief', String(facts.relief));
    if (facts.date) params.set('date', facts.date);
    if (facts.dead > 0) params.set('dead', String(facts.dead));
    // Not the editor's trip, so the editor is told nothing and takes no lines from it.
    calcFor = null;
    openGenerated({ url: `quote.html?${params}`, kind: 'Quote calculator', note: '', opener, trip: trip.id });
  }

  // What the calculator is filled with from a leg: the Route tab's miles a
  // day and dead miles, and the Buses tab's drivers, buses and relief seats.
  function calcFacts(leg) {
    const f = legFigures(leg);
    return { miles: f.perDay, dead: f.dead, drivers: coDrivers(leg) > 0 ? 2 : 1,
      buses: legBuses(leg), relief: reliefSeats(leg) };
  }
  /* Hands the calculator the leg's figures as they are now, so it can say
     what changed; `reset` makes them its starting point. Only while it is
     framed beside the trip it was filled from. */
  function tellCalculator(reset = false) {
    if (!calcFor || !editing || String(editing.id) !== String(calcFor.trip) || viewers.calc.el?.hidden) return;
    let hook = null;
    try { hook = viewers.calc.frame?.contentWindow?.Rux?.calculatorTrip; } catch { return; }
    hook?.changed(calcFacts(calcFor.leg), reset);
  }

  /* THE CALCULATOR'S QUOTE, AS THE TRIP'S LINES. Add to quote lines replaces
     the leg's lines, all but its hotel, with the quote the calculator shows: a
     Bus rental at its rate and dead miles, a Second driver for two drivers,
     its discount and other charges. Dead miles shown as a discount price the
     rental at the full rate on every mile and take the difference off, a bus
     at a time. While the calculator's days are the route's, the rental and
     second driver are left untyped, so they keep following the route; days
     changed in the calculator are typed in as its figures. Save keeps it.
     On a split trip the leg is the one the calculator was filled from. */
  function linesFromCalculator(q) {
    if (!editing || panelEl.hidden) {
      toast('info', 'Open the trip to add its quote lines');
      return false;
    }
    /* The lines are the leg's the calculator was filled from, which `calcFor`
       kept: the Route tab may have moved to the other leg since, and its leg
       is used only where the calculator was filled from no leg of this trip. */
    const filled = calcFor && String(calcFor.trip) === String(editing.id) ? calcFor.leg : null;
    const leg = splitNow() ? ((filled ?? wordOfLeg(editing.route?.leg)) === 'return' ? 'return' : 'outbound') : null;
    const buses = editing.fleet?.[legKeyOf(leg === 'return' ? 'return' : 'outbound')] ?? [];
    // The Buses tab's co-driver seats follow the calculator's drivers, but a
    // seat with a driver in it is not turned off.
    const seatsBefore = coDrivers(leg);
    const seatsOn = q.drivers === 2 && seatsBefore === 0 && buses.length > 0;
    const seatsOff = q.drivers === 1 && seatsBefore > 0;
    const assigned = seatsOff ? buses.filter(b => b.seats?.['co-driver']?.on && b.seats['co-driver'].driverId).length : 0;
    const coAfter = seatsOn ? buses.length : seatsOff ? assigned : seatsBefore;

    const f = legFigures(leg);
    const same = !!f.perDay && q.miles.length === f.perDay.length && q.miles.every((m, i) => m === f.perDay[i]);
    const line = (kind, extra = {}) => ({ kind, leg, item: lineKind(kind).item || null,
      description: lineKind(kind).description || null, quantity: null, cost: null, cost_typed: false,
      miles: null, dead_miles: null, rate: null, ...extra });
    const typed = cost => (same || cost == null ? {} : { cost: round2(cost), cost_typed: true });
    const dead = q.deadAsDiscount ? 0 : q.dead;
    const made = [line('rental', { rate: q.rate || null, dead_miles: dead, deadOn: dead > 0,
      deadTyped: dead > 0 && Math.round(dead) !== Math.round(f.dead),
      miles: q.miles.reduce((a, b) => a + b, 0), ...typed(q.deadAsDiscount ? q.fullMileage : q.mileage) })];
    if (q.drivers === 2 || assigned > 0) made.push(line('second_driver', q.drivers === 2 ? typed(q.driver) : {}));
    // Relief drivers are counted from the Buses tab's relief seats once any
    // is on; before that, the calculator's count stands in.
    const relief = reliefSeats(leg);
    if (relief > 0 || q.relief > 0) made.push(line('relief', relief > 0 ? {} : { quantity: q.relief }));
    if (q.deadAsDiscount && q.fullMileage > q.mileage) {
      made.push(line('discount', { description: 'Dead miles discount.', quantity: legBuses(leg),
        cost: -round2(q.fullMileage - q.mileage), cost_typed: true }));
    }
    if (q.discount > 0) made.push(line('discount', { cost: -round2(q.discount), cost_typed: true }));
    if (q.other > 0) made.push(line('other', { description: 'Other charges.', cost: round2(q.other), cost_typed: true }));

    // The leg's lines now, all but the hotel, which the new ones replace.
    const mine = l => l.kind !== 'hotel' && (leg === null || (l.leg ?? 'outbound') === leg);
    const now = linePending.filter(mine);
    const quoted = linePending.length ? null : money(document.getElementById('scheduler-f-quoted')?.value ?? '');

    const apply = () => {
      if (seatsOn) setCoDrivers(leg, true);
      if (seatsOff) setCoDrivers(leg, false);
      // The new lines go where the leg's first line was, the hotel kept in place.
      const at = linePending.findIndex(mine);
      const kept = linePending.filter(l => !mine(l));
      kept.splice(at < 0 ? kept.length : linePending.slice(0, at).filter(l => !mine(l)).length, 0, ...made);
      linePending.splice(0, linePending.length, ...kept);
      if (linesLive) syncLines();
      redrawLines();
      refreshDirty();
      tellCalculator(true);
      const tab = document.getElementById('scheduler-tab-billing');
      if (tab && tab.getAttribute('aria-selected') !== 'true') window.Rux?.tabs?.select?.(tab.closest('[role="tablist"]'), tab);
      const count = legBuses(leg);
      if (assigned > 0) toast('warning', 'A co-driver is still assigned', 'Take them off on Buses first.');
      else if (q.buses !== count) toast('warning', `The Buses tab has ${count} ${count === 1 ? 'bus' : 'buses'}`, 'The rental counts those; match them there.');
      else if (relief > 0 && q.relief !== relief) toast('warning', `The Buses tab has ${relief} relief ${relief === 1 ? 'seat' : 'seats'}`, 'The relief line counts those.');
      else toast('success', 'Quote lines set from the calculator', 'Save to keep them.');
    };
    // Nothing to lose goes straight in; lines or a typed price are asked about.
    if (!now.length && !(quoted > 0)) apply();
    else openReplace({ now, made, quoted, leg, coAfter, seatsOn, seatsOff, assigned, buses: buses.length }, apply);
    return true;
  }

  /* ASKED BEFORE THE CALCULATOR REPLACES LINES: the leg's lines now beside
     the calculator's, each with its amount, their totals, and what it turns
     on or off on the Buses tab. The new lines are priced as they will be,
     their counts read from the seats as they will stand. */
  const replaceModal = document.getElementById('scheduler-replace-modal');
  let replaceGo = null;
  function openReplace(plan, proceed) {
    const body = document.getElementById('scheduler-replace-body');
    if (!replaceModal || !body) { proceed(); return; }
    const nameOf = l => (l.kind === 'discount' && /dead miles/i.test(l.description ?? '') ? 'Dead miles discount' : lineKind(l.kind).label);
    const qtyAfter = l => (l.kind === 'rental' ? legBuses(plan.leg)
      : l.kind === 'second_driver' ? (plan.coAfter || 1)
      : l.kind === 'relief' && reliefSeats(plan.leg) > 0 ? reliefSeats(plan.leg)
      : money(String(l.quantity ?? '')) ?? 1);
    const costOf = l => (l.cost_typed ? money(String(l.cost ?? '')) : calcCost(l));
    const rows = (list, qty, cost) => list.map(l => {
      const c = cost(l);
      const n = qty(l) ?? 1;
      return { text: `${nameOf(l)} · ${n} × ${c == null ? '—' : usdCents(c)}`, amount: c == null ? 0 : round2(n * c) };
    });
    const side = (title, list, total) => {
      const box = el('div', 'rux--stack-vertical rux--stack-scale-3');
      box.append(el('h3', 'rux--type-heading-compact-01', title),
        ...list.map(r => el('p', 'rux--type-body-compact-01', `${r.text} = ${usdCents(r.amount)}`)),
        el('p', 'rux--type-heading-compact-01', `Total ${usdCents(total)}`));
      return box;
    };
    const before = plan.now.length ? rows(plan.now, l => lineQty(l), l => money(String(l.cost ?? '')))
      : [{ text: 'Quoted price, typed', amount: plan.quoted }];
    const after = rows(plan.made, qtyAfter, costOf);
    const add = list => round2(list.reduce((n, r) => n + r.amount, 0));
    const seats = plan.seatsOn ? `Turns on the co-driver seat on ${plan.buses === 1 ? 'the bus' : `all ${plan.buses} buses`} on the Buses tab.`
      : plan.seatsOff ? `Turns off the co-driver seat on the Buses tab${plan.assigned ? `, except ${plan.assigned} with a driver in it` : ''}.`
      : null;
    const sent = editing?.quoteSent;
    body.replaceChildren(
      ...(sent ? [el('p', 'rux--type-body-compact-01', `The customer was sent ${usdCents(sent.price)}${sent.on ? ` on ${mdy(sent.on)}` : ''}.`)] : []),
      side('Now', before, add(before)),
      side('From the calculator', after, add(after)),
      ...(seats ? [el('p', 'rux--type-body-compact-01', seats)] : []),
      el('p', 'rux--type-helper-text-01', 'Hotel lines stay. Nothing is kept until you Save.'));
    replaceGo = proceed;
    window.Rux?.modal?.open?.(replaceModal);
  }
  document.getElementById('scheduler-replace-go')?.addEventListener('click', () => {
    const proceed = replaceGo;
    replaceGo = null;
    window.Rux?.modal?.close?.(replaceModal);
    proceed?.();
  });
  replaceModal?.addEventListener('rux:modal-closed', () => { replaceGo = null; });
  window.Rux.quoteLines = { ready: () => !!editing && !panelEl.hidden, set: linesFromCalculator };

  function openItinerary(bar) {
    const id = bar.dataset.itineraryId;
    if (!id) return;
    const trip = panelIndex.trips.get(bar.dataset.tripId);
    const doc = trip ? itinerariesOf(trip).find(d => String(d.id) === id) : null;
    if (doc) openDocument(doc, bar, trip);
    else window.open(documentLink(id), '_blank', 'noopener');
  }

  /* ── A trip's files ──
     Upload, replace and delete write at once, not with Save, and store a file
     in one layout, so every reader finds it: the
     `trip-documents` bucket at `<trip id>/<milliseconds>/<file name>`, a
     `trip_documents` row, and a `record_trip_history` entry. Every
     step's error is checked, and the order leaves a stored file at worst,
     never a row that points at nothing. Nothing here writes to `trips`, and no
     trigger on `trip_documents` does, so a file never turns the editor's next
     Save into a conflict. */
  const DOC_BUCKET = 'trip-documents';

  // A file name's slug: accents stripped, lowercased, hyphenated.
  const docSlug = (value, fallback) => String(value ?? '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || fallback;

  // The name file-names.js gives an upload, from the trip as saved, not as typed.
  async function documentName(tripId, label) {
    const { data: trip, error } = await withTimeout(client.from('trips')
      .select('id,trip_ref,customer,start_date,booking_contact_name,trip_contact_1_name,trip_contact_2_name')
      .eq('id', tripId).single().then(r => r));
    if (error) throw new Error(error.message);
    return window.SchedulerFileNames.forUpload(trip, label);
  }

  // A PDF by its type or name, and by its first bytes, so a
  // renamed file of another kind is refused.
  async function isPdf(file) {
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name || '')) return false;
    try { return (await file.slice(0, 5).text()) === '%PDF-'; } catch { return false; }
  }

  /* ── Trip history ──
     Every change the scheduler makes to a trip writes a `record_trip_history`
     entry in one shape, so the History panel shows every entry
     alike: an action, the trip's snapshot, and the changes trip-history.js
     works out between a read before the writes and one after, where any
     difference in the trip's rows makes a line. */
  const HISTORY = window.SchedulerTripHistory;
  const histSame = HISTORY.same;
  const HISTORY_ROLES = HISTORY.ROLES;

  const histBusName = id => (panelIndex.buses.get(id) ? vehicleName(panelIndex.buses.get(id)) : `Unit ${id}`);
  const histDriverName = id => panelIndex.driversById.get(id)?.name ?? id;
  // The names a history line gives a bus, a driver and a need.
  const HISTORY_NAMES = { bus: histBusName, driver: histDriverName, requirement: requirementLabel };

  /* A trip and every row a save can change, as the database holds them, each
     whole, with its legs and their routes, which name each row's day. */
  const HISTORY_READ = '*,trip_assignments(*,trip_drivers(*)),trip_stops(*),'
    + 'trip_payments(*),trip_pos(*),trip_invoices(*),trip_quote_lines(*),trip_legs(*,trip_routes(*))';
  async function readTripState(tripId) {
    const { data, error } = await withTimeout(client.from('trips').select(HISTORY_READ).eq('id', tripId).single().then(r => r));
    if (error) throw new Error(error.message);
    return data;
  }
  // The trip's own columns, without the rows read beside them.
  const tripSnapshot = state => Object.fromEntries(Object.entries(state || {}).filter(([, v]) => !Array.isArray(v)));

  // The changes between two reads of `readTripState`; null before is a new trip.
  const tripChanges = (before, after) => HISTORY.changes(before, after, HISTORY_NAMES);

  /* The history's actor is the person's display name in `public.profiles`,
     found by the account's id; the platform profile's name stands in
     for an account with no public profile, and with neither the function's own
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
     the change it records. */
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

  // A bus change from the board, recorded as a reassignment.
  const recordBusChange = (tripId, fromBus, toBus) => recordHistory(tripId, 'assignment_changed', [{
    field: 'bus', label: 'Bus', before: fromBus ? histBusName(fromBus) : null, after: toBus ? histBusName(toBus) : null,
  }]);

  // One column changed from the board, labelled and formatted as a save's.
  function recordFieldChange(tripId, field, was, now) {
    const change = HISTORY.line(field, was, now, HISTORY_NAMES);
    if (change) recordHistory(tripId, 'updated', [change]);
  }

  // One document change, with the file in the metadata.
  const recordFileHistory = (tripId, action, before, after, metadata) =>
    recordHistory(tripId, action, [{ field: 'document', label: 'Document', before, after }], null, metadata);

  /* A file's leg by its id, from the old word a page still hands: the
     pickup's for a split trip's pickup itinerary, or none for the trip's. */
  function docPlace(tripId, word) {
    if (!word) return { leg: null };
    const trip = [panelArgs?.trip, panelIndex.trips.get(tripId)].find(t => t?.id === tripId && shaped(t));
    const legId = trip ? SHAPE.legOfWord(trip, word)?.id : null;
    return legId ? { leg_id: legId } : { leg: word };
  }

  // Stores the file and adds its row. A row that fails takes the stored file
  // back out, so nothing is left behind. `leg` is a split trip's pickup's, or null.
  async function storeDocument(tripId, label, file, leg = null) {
    const fileName = await documentName(tripId, label);
    const path = `${tripId}/${Date.now()}/${fileName}`;
    const bucket = client.storage.from(DOC_BUCKET);
    const { error: upErr } = await bucket.upload(path, file, { contentType: 'application/pdf', upsert: false });
    if (upErr) throw new Error(upErr.message);
    try {
      const { data, error } = await withTimeout(client.from('trip_documents')
        .insert({ trip_id: tripId, label, file_name: fileName, file_path: path, file_size: file.size, ...docPlace(tripId, leg) })
        .select('id,label,created_at,file_name,file_path,file_size,leg,leg_id').single().then(r => r));
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

  async function uploadDocument(tripId, label, file, leg = null) {
    const doc = await storeDocument(tripId, label, file, leg);
    await recordFileHistory(tripId, 'document_uploaded', null, `${label} uploaded`,
      { documentId: doc.id, fileName: doc.file_name });
    return doc;
  }

  /* The new file is stored, the row is pointed at it, and only then does the
     old stored file go, so a failure part way leaves the trip with a file. The
     row keeps its id, so a link to the document
     opens the new file. A row that fails takes the new stored file back out. */
  async function replaceDocument(tripId, old, file) {
    const fileName = await documentName(tripId, old.label);
    const path = `${tripId}/${Date.now()}/${fileName}`;
    const bucket = client.storage.from(DOC_BUCKET);
    const { error: upErr } = await bucket.upload(path, file, { contentType: 'application/pdf', upsert: false });
    if (upErr) throw new Error(upErr.message);
    let doc;
    try {
      const { data, error } = await withTimeout(client.from('trip_documents')
        .update({ file_name: fileName, file_path: path, file_size: file.size }).eq('id', old.id)
        .select('id,label,created_at,file_name,file_path,file_size,leg,leg_id').single().then(r => r));
      if (error) throw new Error(error.message);
      doc = data;
    } catch (err) {
      bucket.remove([path]).catch(() => {});
      throw err;
    }
    if (old.file_path) {
      try {
        const { error: rmErr } = await bucket.remove([old.file_path]);
        if (rmErr) throw new Error(rmErr.message);
      } catch (err) {
        console.warn(`The stored file ${old.file_path} was not removed:`, err);
      }
    }
    await recordFileHistory(tripId, 'document_replaced', old.label || 'Previous file', `${old.label || 'Document'} replaced`,
      { documentId: doc.id, fileName: doc.file_name });
    return doc;
  }

  // The leg a bar's upload goes to: its own on a split trip.
  const barLeg = bar => (panelIndex.trips.get(bar.dataset.tripId)?.trip_type === SPLIT ? bar.dataset.leg || 'outbound' : null);

  // A split trip's itinerary moved to the other leg, at once, as a replace is.
  const LEG_WORDS = { outbound: 'Drop-off', return: 'Pickup' };
  async function moveDocument(tripId, doc, leg) {
    const { error } = await withTimeout(client.from('trip_documents').update(docPlace(tripId, leg)).eq('id', doc.id).then(r => r));
    if (error) throw new Error(error.message);
    await recordHistory(tripId, 'updated',
      [{ field: 'document_leg', label: 'Itinerary day', before: LEG_WORDS[docLeg(doc)], after: LEG_WORDS[leg] }],
      null, { documentId: doc.id, fileName: doc.file_name });
  }
  async function moveFrom(tripId, doc, leg) {
    toast('working', 'Moving the itinerary…');
    try {
      await moveDocument(tripId, doc, leg);
    } catch (err) {
      toast('error', `The itinerary was not moved. ${err.message}`);
      return;
    }
    await refreshDocuments(tripId);
    toast('success', `The itinerary is the ${leg === 'return' ? 'pickup' : 'drop-off'}'s now.`);
  }

  async function deleteDocument(tripId, doc) {
    await unstoreDocument(doc);
    await recordFileHistory(tripId, 'document_deleted', doc.label || doc.file_name || 'Document', 'Deleted',
      { documentId: doc.id, fileName: doc.file_name });
  }

  // One file dialog for every entry point: Add file, Replace and the bar menu's Upload itinerary.
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
        .select('id,label,created_at,file_name,file_path,file_size,leg,leg_id').eq('trip_id', tripId).then(r => r));
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
     Save then writes. An itinerary goes to `leg`, the leg on
     screen or the bar's: the pickup's is kept as its own, and any other is
     the drop-off's. */
  async function uploadFrom(tripId, label, file, item, leg = null) {
    const pickup = label === 'Itinerary' && leg === 'return';
    if (!(await isPdf(file))) {
      if (item) item.fail('Only PDF files can be added', 'Export the file as a PDF, then add it again.');
      else toast('error', 'Only PDF files can be added. Export it as a PDF first.');
      return false;
    }
    if (!item) toast('working', `Uploading ${label === 'PO' ? 'the purchase order' : `the ${label.toLowerCase()}`}…`);
    try {
      await uploadDocument(tripId, label, file, pickup ? 'return' : null);
    } catch (err) {
      if (item) item.fail('The file was not added', `${err.message} Try again.`);
      else toast('error', `The file was not added. ${err.message}`);
      return false;
    }
    item?.done();
    if (label === 'PO' && editing?.id === tripId && !panelEl.hidden && !poPending.length) {
      poPending.push({ ref: null, amount: null, date: iso(new Date()) });
      redrawPos();
      refreshDirty();
    }
    await refreshDocuments(tripId);
    toast('success', `${file.name} was added to the ${pickup ? 'pickup' : 'trip'}.`);
    return true;
  }

  function replaceFrom(tripId, old) {
    pickFile(async file => {
      if (!(await isPdf(file))) {
        toast('error', 'Only PDF files can be added. Export it as a PDF first.');
        return;
      }
      toast('working', 'Replacing the file…');
      let doc;
      try {
        doc = await replaceDocument(tripId, old, file);
      } catch (err) {
        toast('error', `The file was not replaced. ${err.message}`);
        await refreshDocuments(tripId);
        return;
      }
      await refreshDocuments(tripId);
      // The panel open on the file shows the new one.
      if (viewers.doc.docId === String(old.id)) {
        const trip = panelIndex.trips.get(tripId) ?? panelArgs?.trip;
        const fresh = trip && (trip.trip_documents || []).find(d => String(d.id) === String(doc.id));
        openDocument(fresh || doc, null, trip, viewers.doc.mark);
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
    if (viewers.doc.docId === String(target.doc.id)) viewers.doc.close(false);
    await refreshDocuments(target.tripId);
    toast('success', 'The file was deleted.');
  });

  /* THE SELECTED TRIP'S SHORTCUTS, the same four on every trip; every other
     action is on the right-click menu. A slot whose
     action cannot act on the trip shows disabled, with the reason as its
     label, so the slots keep their places from trip to trip. `short` is the
     word under the slot on the docked sheet, where a phone has no hover to
     show the name. */
  const SHORTCUT_ACTIONS = [
    { id: 'open', label: 'Open trip', icon: '#m-open_in_new', short: 'Open',
      blocked: bar => (isEditorBar(bar) ? 'Already open' : null), run: () => openSelected() },
    // Opens the itinerary, or uploads one on a trip that has none, as the
    // right-click menu swaps the two.
    { id: 'itinerary', label: 'Open or upload itinerary', icon: '#m-attachment', short: 'Itinerary',
      label_for: bar => (bar.dataset.itineraryId ? 'Open itinerary' : 'Upload itinerary'),
      icon_for: bar => (bar.dataset.itineraryId ? '#m-attachment' : '#m-upload'),
      blocked: bar => (bar.dataset.itineraryId || client ? null : 'No itinerary yet'),
      run: bar => (bar.dataset.itineraryId ? openItinerary(bar)
        : pickFile(file => uploadFrom(bar.dataset.tripId, 'Itinerary', file, null, barLeg(bar)))) },
    // The trip's list of forms.
    { id: 'forms', label: 'Forms', icon: '#m-description', short: 'Forms',
      blocked: () => null, run: bar => openForms(bar) },
  ];
  // Contacts closes the row, because every trip has people to reach.
  const SHORTCUT_ROW = ['open', 'itinerary', 'forms', 'contacts'];

  /* The docked sheet stands on the header's own surface. The header is a theme
     zone of its own in theme.js, g100 under Carbon's four whatever the page
     is, so its colours are read off it rather than named, and a saved theme's
     bar is matched as well as a built-in one. */
  const SHELL_TOKENS = ['background', 'background-hover', 'icon-primary', 'text-secondary', 'focus'];
  function wearShell() {
    const shell = document.querySelector('.rux--header[data-theme]');
    if (!shell) return;
    const cs = getComputedStyle(shell);
    for (const t of SHELL_TOKENS) barShortcuts.style.setProperty(`--scheduler-shell-${t}`, cs.getPropertyValue(`--rux-${t}`).trim());
  }

  /* The docked bar's head: the rows the compact block gave up, cloned from the
     bar itself rather than built again, so a row has one builder and one set of
     rules. The bar's colour class comes with them, which the head's stripe
     reads. `aria-label` is in the key because it is the whole trip written out,
     so any change to what a row says redraws this. */
  let dockedDrawn = '';
  function drawDockedTrip(bar) {
    const key = `${bar.dataset.tripId}|${bar.dataset.legKey}|${bar.getAttribute('aria-label') || ''}`;
    let head = barShortcuts.querySelector('.scheduler-bar-shortcuts__trip');
    if (head && key === dockedDrawn) return;
    dockedDrawn = key;
    if (!head) head = el('div', 'scheduler-bar-shortcuts__trip');
    head.className = ['scheduler-bar-shortcuts__trip',
      ...[...bar.classList].filter(c => c.startsWith('scheduler-bar--'))].join(' ');
    head.replaceChildren(...[...bar.children].map(node => node.cloneNode(true)));
    // A phone has the dialler the bar has not: the number calls.
    for (const phone of head.querySelectorAll('.scheduler-bar__phone')) {
      const call = el('a', 'scheduler-bar__phone scheduler-bar__phone--call', phone.textContent);
      call.href = `tel:${phone.textContent.replace(/[^\d+]/g, '')}`;
      phone.replaceWith(call);
    }
    barShortcuts.prepend(head);
    // The copy is fitted to the sheet's width, not the bar's.
    for (const crew of head.querySelectorAll('.scheduler-bar__crew')) fitCrew(crew);
    fitKind(head);
  }

  // The trip whose card shows all its updates, kept until the card leaves it.
  let updatesOpenFor = null;
  // What is typed in the card's quick update, and for which trip.
  let quickDraft = { tripId: null, text: '' };
  // The trip whose card has its quick update's box open.
  let quickOpenFor = null;
  /* The update a floating card has open in its own row: `mode` is edit while
     its words are a box with Delete, Cancel and Save, delete while the row
     asks before it goes, and `draft` what is typed so a redraw keeps it. */
  let cardEdit = null;   // { tripId, id, mode: 'edit' | 'delete', draft }
  function startCardEdit(tripId, id) {
    cardEdit = { tripId, id, mode: 'edit', draft: null };
    placeBarOpen();
    const box = barShortcuts.querySelector('.scheduler-card__edit textarea');
    if (box) { fitBox(box); box.focus(); box.setSelectionRange(box.value.length, box.value.length); }
  }
  function endCardEdit(refocus) {
    const id = cardEdit?.id;
    cardEdit = null;
    placeBarOpen();
    if (refocus && id) barShortcuts.querySelector(`.scheduler-card__update[data-update-id="${CSS.escape(id)}"] .scheduler-card__open`)?.focus();
  }
  /* Saves or deletes the open update, as the Updates window does: the row
     keeps only what it says now, so History is told what it said before. */
  async function changeCardUpdate(act) {
    if (!cardEdit) return;
    const { tripId, id } = cardEdit;
    const u = (panelIndex.trips.get(tripId)?.trip_updates || []).find(x => x.id === id);
    if (!u) { endCardEdit(false); return; }
    const row = act.closest('.scheduler-card__update');
    const remove = act.dataset.editAct === 'delete';
    const body = remove ? null : row?.querySelector('textarea')?.value.trim();
    if (!remove && !body) return;
    row?.querySelectorAll('button, textarea').forEach(n => { n.disabled = true; });
    const fail = remove ? 'The update was not deleted.' : 'The update was not changed.';
    try {
      const query = remove ? client.from('trip_updates').delete().eq('id', id)
        : client.from('trip_updates').update({ body, edited_at: new Date().toISOString() }).eq('id', id).select(UPDATE_COLUMNS).single();
      const { error: failed } = await withTimeout(query.then(r => r));
      if (failed) throw new Error(failed.message);
      recordHistory(tripId, 'updated', [{ field: 'update', label: 'Update', before: u.body, after: remove ? 'Deleted' : body }], null, { source: 'update' });
      cardEdit = null;
      await show();
      toast('success', remove ? 'Update deleted' : 'Update changed');
    } catch (err) {
      console.warn(fail, err);
      toast('error', fail, String(err?.message ?? err));
      placeBarOpen();
    }
  }
  barShortcuts?.addEventListener('input', e => {
    const box = e.target.closest?.('.scheduler-card__edit textarea');
    if (!box || !cardEdit) return;
    cardEdit.draft = box.value;
    const u = (panelIndex.trips.get(cardEdit.tripId)?.trip_updates || []).find(x => x.id === cardEdit.id);
    const keep = box.closest('.scheduler-card__edit')?.querySelector('[data-edit-act="save"]');
    if (keep) keep.disabled = !box.value.trim() || box.value.trim() === u?.body;
    fitBox(box);
  });
  // The box keeps its keys from the board: Escape puts the row back, Cmd or Ctrl with Enter saves.
  barShortcuts?.addEventListener('keydown', e => {
    const box = e.target.closest?.('.scheduler-card__edit textarea');
    if (!box) return;
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); endCardEdit(true); return; }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !e.isComposing) {
      const keep = box.closest('.scheduler-card__edit')?.querySelector('[data-edit-act="save"]');
      if (keep && !keep.disabled) { e.preventDefault(); changeCardUpdate(keep); }
    }
  });
  function openQuick(tripId) {
    if (!tripId) return;
    quickOpenFor = tripId;
    placeBarOpen();
    barShortcuts.querySelector('.scheduler-card__quick input')?.focus();
  }
  // The box's Save is primary while there are words to save.
  const markSave = (save, ready) => {
    // In the card's footer a button is solid, Carbon's secondary until there are words to save; elsewhere it is ghost.
    const off = save.dataset.solid !== undefined ? 'rux--btn--secondary' : 'rux--btn--ghost';
    save.classList.remove(save.dataset.solid !== undefined ? 'rux--btn--ghost' : 'rux--btn--secondary');
    save.classList.toggle('rux--btn--primary', ready);
    save.classList.toggle(off, !ready);
  };
  const quickSave = input => input.closest('.scheduler-card')?.querySelector('.scheduler-card__action[data-card-action="save"]');
  // Closes the box, handing focus back to Add when the box held it.
  function closeQuick(refocus) {
    quickOpenFor = null;
    quickDraft = { tripId: null, text: '' };
    placeBarOpen();
    if (refocus) barShortcuts.querySelector('.scheduler-card__action')?.focus();
  }
  // Leaving the box with nothing typed closes it; a redraw that rebuilt it
  // is not leaving, and nor is a press on Save, which closes it itself.
  barShortcuts?.addEventListener('focusout', e => {
    const input = e.target.closest?.('.scheduler-card__quick input');
    if (!input || input.value.trim() || e.relatedTarget?.closest?.('.scheduler-card__action')) return;
    setTimeout(() => {
      if (input.isConnected && document.activeElement !== input && quickOpenFor === input.dataset.tripId) closeQuick(false);
    }, 0);
  });
  barShortcuts?.addEventListener('input', e => {
    const input = e.target.closest?.('.scheduler-card__quick input');
    if (!input) return;
    quickDraft = { tripId: input.dataset.tripId, text: input.value };
    const save = quickSave(input);
    if (save) markSave(save, !!input.value.trim());
  });
  /* The quick update keeps its keys from the board: Enter adds it, Escape
     clears what is typed, and an Escape with nothing typed closes the box. */
  barShortcuts?.addEventListener('keydown', e => {
    const input = e.target.closest?.('.scheduler-card__quick input');
    if (!input) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (!input.value) { closeQuick(true); return; }
      input.value = '';
      quickDraft = { tripId: null, text: '' };
      const save = quickSave(input);
      if (save) markSave(save, false);
      return;
    }
    e.stopPropagation();
    if (e.key !== 'Enter' || e.isComposing) return;
    e.preventDefault();
    quickAdd(input);
  });
  async function quickAdd(input) {
    const body = input.value.trim();
    if (!body) return;
    const save = quickSave(input);
    input.disabled = true;
    if (save) save.disabled = true;
    if (await writeUpdate(input.dataset.tripId, { kind: 'update', body, keys: null })) {
      quickDraft = { tripId: null, text: '' };
      quickOpenFor = null;
      await show();
      barShortcuts.querySelector('.scheduler-card__action')?.focus();
      toast('success', 'Update added');
    } else {
      input.disabled = false;
      if (save) save.disabled = false;
      toast('error', 'The update was not added.', 'Try again.');
    }
  }
  // A warning is a press that takes Enter and Space, as a button does.
  barShortcuts?.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const press = e.target.closest?.('.scheduler-card__row[data-go]');
    if (!press || e.target !== press) return;
    e.preventDefault();
    goToWarning(press.dataset.go, press.dataset.spot);
  });
  /* The field a warning's fix starts in, on the tab it opens: the first trip
     contact, the Billing tile's Contract signed row an unconfirmed trip waits
     on, its Purchase orders, Payments for a balance, Invoices, the hotel's
     quote line, or Add line. */
  const WARN_SPOT = {
    contact: () => document.querySelector('[aria-labelledby="scheduler-f-dgroup"] :is(input, button)'),
    confirmation: () => document.getElementById('scheduler-f-bill-contract') ?? document.getElementById('scheduler-f-bill-pos'),
    po: () => document.getElementById('scheduler-f-bill-pos'),
    balance: () => document.getElementById('scheduler-f-bill-payments'),
    hotel: () => document.querySelector('[data-line-kind="hotel"]') ?? document.getElementById('scheduler-f-quoteopen')
      ?? document.getElementById('scheduler-f-lineadd'),
    miles: () => document.getElementById('scheduler-f-actmiles'),
    pay: () => [...document.querySelectorAll('[id^="scheduler-f-seatpay-"]')].find(i => !i.value.trim()),
    invoice: () => document.getElementById('scheduler-f-bill-invoices'),
  };
  /* Where a warning is put right. The itinerary slot uploads or opens the
     itinerary as its own press does, Forms opens the trip's forms, and the
     rest open the trip on the tab that holds the fix, asking first about
     unsaved work in another trip; the trip already in the editor only turns
     to the tab. */
  function goToWarning(go, spot) {
    const bar = selectedBar();
    if (!bar?.dataset.tripId) return;
    if (go === 'itinerary') { SHORTCUT_ACTIONS.find(a => a.id === 'itinerary').run(bar); return; }
    putCardAway(bar);
    if (go === 'forms') { openForms(bar); return; }
    // A driver to tell, or one who declined, is put right from the Contact list.
    if (go === 'contacts') { openContactsFrom(bar, bar); return; }
    const toFix = () => {
      const tab = document.getElementById(`scheduler-tab-${go}`);
      if (tab) window.Rux?.tabs?.select?.(tab.closest('[role="tablist"]'), tab);
      /* Once the tab has drawn, its field comes into view with the cursor in it.
         A seat's pay is drawn once the trip's buses have loaded, so the field
         is looked for again for up to four seconds. */
      let tries = 40;
      const find = () => {
        const field = WARN_SPOT[spot]?.();
        if (!field) { if (--tries > 0) setTimeout(find, 100); return; }
        /* The editor's own scroll box brings the field to its middle; the page
           itself is never scrolled, which slid the whole board up under the
           header. */
        let box = field.parentElement;
        while (box && box !== document.body && !(/(auto|scroll)/.test(getComputedStyle(box).overflowY) && box.scrollHeight > box.clientHeight)) box = box.parentElement;
        if (box && box !== document.body) {
          const at = field.getBoundingClientRect().top - box.getBoundingClientRect().top;
          box.scrollTop += at - box.clientHeight / 2;
        }
        field.focus({ preventScroll: true });
      };
      setTimeout(find, 0);
    };
    if (isEditorBar(bar)) { toFix(); return; }
    const ref = barRef(bar);
    whenSafe(() => { openRef(ref); toFix(); });
  }

  let shortcutsDrawn = '';
  /* The slots are the phone's docked sheet's alone, where there is no
     right-click; the floating card is the trip's warnings and updates, and the
     bar's own menu holds what the slots do. */
  function drawShortcuts(bar) {
    const docked = pageEl?.getAttribute('data-board') === 'compact';
    const slots = docked ? SHORTCUT_ROW : [];
    const trip = panelIndex.trips.get(bar.dataset.tripId);
    const carded = !!trip;
    const key = [docked, bar.dataset.tripId, bar.dataset.legKey, bar.dataset.itineraryId,
      bar.dataset.assignmentId, bar.dataset.busId, isEditorBar(bar), bar.dataset.needHotel,
      bar.dataset.hotelBooked, slots.join(), cardKey(trip), cardSection,
      JSON.stringify(barFacts.get(bar) ?? null), bar.dataset.road ? `${roadTabOf(bar)} ${roadTabOf(bar) === 'road' ? bar.dataset.road : ''}` : ''].join('|');
    // The same slots on the same bar are left alone, so a focused slot keeps focus.
    // The slots are counted rather than every child, because the docked bar
    // carries the trip's rows ahead of them.
    if (key === shortcutsDrawn && barShortcuts.querySelectorAll('.scheduler-bar-shortcut').length === slots.length) return;
    shortcutsDrawn = key;
    const active = barShortcuts.contains(document.activeElement) ? document.activeElement : null;
    const focusTab = active?.closest('[data-road-tab]')?.dataset.roadTab;
    const focusUpdate = active?.closest('[data-update-id]')?.dataset.updateId;
    const focusQuick = active?.matches('.scheduler-card__quick input');
    const selection = focusQuick ? [active.selectionStart, active.selectionEnd] : null;
    const head = barShortcuts.querySelector('.scheduler-bar-shortcuts__trip');
    barShortcuts.replaceChildren(...(head ? [head] : []), ...slots.map((id, i) => {
      const btn = el('button', 'scheduler-bar-shortcut');
      btn.type = 'button';
      btn.dataset.slot = String(i + 1);
      const action = FIXED_SHORTCUTS[id] ?? SHORTCUT_ACTIONS.find(a => a.id === id);
      // Itinerary says which way it acts on this bar.
      const why = action.blocked(bar);
      const label = why ?? (action.label_for ? action.label_for(bar) : action.label);
      btn.dataset.shortcut = action.id;
      btn.setAttribute('aria-label', label);
      btn.title = label;
      if (why) btn.setAttribute('aria-disabled', 'true');
      btn.append(svgUse(action.icon_for ? action.icon_for(bar) : action.icon, '16', '0 0 32 32'),
        el('span', 'scheduler-bar-shortcut__label', action.short));
      return btn;
    }), ...(carded ? [...(docked || (cardSection && !bar.dataset.road) ? [] : [cardHead(trip)]), !bar.dataset.road ? drawCard(trip, bar, cardSection)
      : drawRoadCard(trip, bar)] : []));
    barShortcuts.toggleAttribute('data-card', carded);
    if (focusQuick) {
      const input = barShortcuts.querySelector('.scheduler-card__quick input');
      input?.focus({ preventScroll: true });
      if (input && selection) input.setSelectionRange(...selection);
    } else if (focusTab) barShortcuts.querySelector(`[data-road-tab="${focusTab}"]`)?.focus({ preventScroll: true });
    else if (focusUpdate) barShortcuts.querySelector(`[data-update-id="${CSS.escape(focusUpdate)}"] .scheduler-card__open`)?.focus({ preventScroll: true });
    else if (active?.classList.contains('scheduler-card__close')) barShortcuts.querySelector('.scheduler-card__close')?.focus({ preventScroll: true });
  }

  /* Contacts opens a small window of everyone to reach about this bar, in
     three parts: the customer's people, the crew on this bus, and the crew on
     the trip's other buses for the same leg. Each is a card, their name over
     their role and number, with Call and Text, and Email for the booking
     contact who has one. A driver's card adds their status and report time. A
     person with no number stays, saying so, with a button to add one: the
     trip for the customer's people, the Drivers page for a driver. Two drivers
     or more get one Text all drivers, a group message to every driver on the
     leg. Once a driver has confirmed, the Customer part opens with the driver
     details letter, to email or copy. Text opens the phone's own messages, except a driver's on a computer,
     which opens the office's Google Messages conversation with them where the
     Drivers page holds one. Each driver's card adds Remind: their reminder
     of this leg, typed into a new text, or copied before their Google
     Messages conversation opens, since it takes no text. While the leg
     changed for them since they accepted it, Tell stands in its place.

     A call or text to the customer's people offers, in a notice, to add it to
     the trip's updates; ignored, nothing is written. Calls to drivers offer
     nothing, because updates are what was said to the customer.

     It is a Carbon modal centred on the screen, as the Updates window is,
     which Design closes on Escape, a press outside or its close button. */
  const contactsModal = document.getElementById('scheduler-contacts-modal');
  const contactsList = document.getElementById('scheduler-contacts-list');
  const contactsMenu = document.getElementById('scheduler-contacts-menu');
  const contactsOptions = document.getElementById('scheduler-contacts-options');
  const CONTACTS = { id: 'contacts', label: 'Call or text', short: 'Contacts', icon: '#m-call', blocked: () => null,
    run: (bar, slot) => openContactsFrom(bar, slot) };
  const FIXED_SHORTCUTS = { contacts: CONTACTS };
  const dial = phone => String(phone).replace(/[^\d+]/g, '');
  /* The driver details letter for the customer, or null while no driver on
     the trip has confirmed: every bus with its confirmed drivers' names and
     numbers, and a bus with none says its driver is to be confirmed. Legs
     with the same crew are listed once; legs that differ each go under their
     own date. It is addressed to the booking contact, and only its subject
     names the destination, which is sometimes a group's name, not a place. */
  const monthDay = s => parseISO(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  function driverLetter(trip) {
    let confirmed = 0;
    const legs = legsOf(trip).map(l => {
      const lines = (trip.trip_assignments || []).filter(a => legKeyOfVehicle(trip, a) === l.key)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .flatMap(a => {
          const number = a.bus_id != null ? panelIndex.buses.get(a.bus_id)?.number ?? null : null;
          const bus = number ? `Bus ${number}` : 'Bus to be confirmed';
          const crew = crewOf(trip, a, panelIndex.driversById, panelIndex.statuses)
            .filter(c => c.who && c.status.value === 'confirmed');
          confirmed += crew.length;
          if (!crew.length) return [`${bus} — Driver to be confirmed`];
          return crew.map(c => `${bus} — ${c.who.name}${c.role === 'driver' ? '' : c.role === 'co-driver' ? ' (co-driver)' : ' (relief driver)'}`
            + (c.who.phone ? `, ${showPhone(c.who.phone)}` : ''));
        });
      return { ...l, lines };
    }).filter(l => l.lines.length);
    if (!confirmed) return null;
    const to = tripContact(trip, 0);
    const first = legs[0].from;
    const last = legs.reduce((end, l) => (l.to > end ? l.to : end), legs[0].to);
    const when = first === last ? `on ${monthDay(first)}` : `from ${monthDay(first)} to ${monthDay(last)}`;
    const same = legs.every(l => l.lines.join() === legs[0].lines.join());
    const split = SHAPE.isSplit(trip);
    const lists = same ? [legs[0].lines.join('\r\n')]
      : legs.map(l => `${split ? (l.number > 1 ? 'Pickup, ' : 'Drop-off, ') : ''}${monthDay(l.from)}:\r\n${l.lines.join('\r\n')}`);
    const body = [
      to?.name ? `Hi ${to.name.trim().split(/\s+/)[0]},` : 'Hello,',
      `Here are the drivers for your trip ${when}:`,
      ...lists,
      'Please let us know if anything changes.',
    ].join('\r\n\r\n');
    return { to, subject: `Driver details for ${trip.destination || trip.customer || 'your trip'} on ${monthDay(first)}`, body };
  }
  // Closing hands focus back to the Contacts slot, as Design's modal does.
  function closeContacts() {
    if (!contactsOpen) return;
    contactsOpen = null;
    window.Rux?.modal?.close?.(contactsModal);
  }
  contactsModal?.addEventListener('rux:modal-closed', () => { contactsOpen = null; });
  function openContactsFrom(bar, slot) {
    const trip = panelIndex.trips.get(bar.dataset.tripId);
    if (!contactsModal || !trip) return;
    closeContacts();
    const docked = barShortcuts.hasAttribute('data-docked');

    /* The bar's leg by its key, week.js's, which is its id on a trip read
       with its legs. `word` is the old word it mirrors, which the writers
       still send. */
    const on = legByKey(trip, bar.dataset.legKey || bar.dataset.leg || 'outbound');
    const leg = on?.key ?? (bar.dataset.leg || 'outbound');
    const word = on ? on.leg : (bar.dataset.leg || 'outbound');
    const saved = window.SchedulerTripShape.legOf(trip, leg);

    /* The customer's side, one tile per person: the booking contact, then
       the leg's day-of contacts as its drivers are handed them. The booking
       contact who is also a day-of contact, by name and number, is one tile
       under both. */
    const people = [];
    const dayContacts = dayContactsOf(trip, leg);
    for (const [c, day] of [[tripContact(trip, 0), false], ...dayContacts.map(c => [c, true])]) {
      if (!c?.name) continue;
      const same = people.find(p => p.name === c.name && dial(p.phone || '') === dial(c.phone || ''));
      if (same) { if (day && !same.day) { same.day = true; same.role = 'Booking and trip contact'; } continue; }
      people.push({ name: c.name, role: day ? 'Trip contact' : 'Booking contact', day, phone: c.phone || null,
        email: day ? null : c.email || null, customer: true });
    }
    // The crew on each bus of this leg, this bar's bus first.
    const assigns = (trip.trip_assignments || []).filter(a => legKeyOfVehicle(trip, a) === leg)
      .sort((a, b) => (String(a.id) === bar.dataset.assignmentId ? -1 : String(b.id) === bar.dataset.assignmentId ? 1
        : (a.position ?? 0) - (b.position ?? 0)));
    /* Each driver's leg as a text to them says it, in the Driver week info's
       wording: their day, bus, role and spot or swap, the leg's towns and its
       newest itinerary. Today is the office's, in Chicago. The leg's saved
       days and every route's stops come through the shape rule, and a split
       trip's pickup is every leg after the first. */
    const driverText = window.SchedulerDriverText;
    const inbound = SHAPE.isPickup(trip, on?.key);
    const legStart = saved?.start ?? null;
    const legEnd = saved?.end || legStart;
    const legStops = window.SchedulerWeek.stopsOfKey(trip, leg);
    const legPickup = legStops.find(s => s.type === 'pickup') || {};
    const legBack = [...legStops].reverse().find(s => s.type === 'return') || {};
    const officeToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date());
    const jobOf = (a, c) => {
      if (!driverText || !legStart) return null;
      const seat = (a.trip_drivers || []).find(d => String(d.driver_id) === String(c.driverId) && (d.role || 'driver') === c.role);
      const partnerSeat = (a.trip_drivers || []).find(d => d.driver_id && (d.role || 'driver') === 'driver'
        && String(d.driver_id) !== String(c.driverId));
      const partner = partnerSeat ? panelIndex.driversById.get(partnerSeat.driver_id) : null;
      const number = a.bus_id != null ? panelIndex.buses.get(a.bus_id)?.number ?? null : null;
      return {
        trip, inbound, role: c.role, start: parseISO(legStart), end: parseISO(legEnd),
        bus: number != null ? String(number) : '',
        spot: legPickup.spot, swap: c.reportTime, instructions: String(seat?.instructions ?? '').trim(),
        partner: partner ? (partner.short_name || partner.name) : '',
        from: legPickup.address || legPickup.name,
        to: inbound ? (legBack.address || legBack.name || '') : trip.destination, toYard: inbound,
        itinerary: legItinerary(trip, leg)?.id || '',
      };
    };
    const changesOf = (c, lang, keys = false) => window.SchedulerDriverJob?.changesSince(trip, leg, c.driverId, c.row,
      { busesById: panelIndex.buses, driversById: panelIndex.driversById, nameOf: requirementLabel, lang, keys }) ?? [];
    const crewOfBus = a => crewOf(trip, a, panelIndex.driversById, panelIndex.statuses)
      .filter(c => c.who)
      .map(c => {
        const job = jobOf(a, c);
        const first = String(c.who.short_name || c.who.name || 'there').trim().split(/\s+/)[0];
        const tell = changesOf(c);
        return {
          name: c.who.name, role: c.label, driverId: c.driverId, phone: c.who.phone || null, texting: c.who.texting_url || null,
          bus: a.bus_id != null ? panelIndex.buses.get(a.bus_id)?.number ?? null : null,
          reminder: job && driverText.reminder(first, job, officeToday, c.who.language),
          // The driver's own row on this bus, which keeps whether they were reminded.
          seat: (a.trip_drivers || []).find(d => String(d.driver_id) === String(c.driverId) && (d.role || 'driver') === c.role) ?? null,
          // What the driver said no to, or what changed since they said yes, as driver-job.js reads it.
          declined: c.status?.value === 'declined',
          tell,
          // What changed, told to the driver in their own language, with the leg as it stands.
          news: job && tell.length ? link => driverText.change(first, job, officeToday, changesOf(c, c.who.language, true), link, c.who.language) : null,
          seatRole: c.role,
        };
      });
    const mine = assigns.filter(a => String(a.id) === bar.dataset.assignmentId).flatMap(crewOfBus);
    const others = assigns.filter(a => String(a.id) !== bar.dataset.assignmentId).flatMap(crewOfBus);

    // Carbon's secondary button, its words before its icon.
    const button = (words, icon, href, away, onTap) => {
      const a = el('a', 'rux--btn rux--btn--secondary rux--layout--size-md scheduler-contact__action', words);
      a.href = href;
      if (away) { a.target = '_blank'; a.rel = 'noopener'; }
      if (onTap) a.addEventListener('click', onTap);
      const glyph = svgUse(icon, '16', '0 0 32 32');
      glyph.classList.add('rux--btn__icon');
      a.appendChild(glyph);
      return a;
    };
    /* WHAT WAS SENT IS MARKED HERE, WHERE IT IS SENT, and only on a yes: a
       text opened is not a text sent, so after Remind and after the driver
       details the board asks, by name. Yes writes the mark, and the database
       keeps when and whose it was; No writes nothing. Departures reads both
       marks. Each can be taken back from its own line in the person's row. */
    const firstName = name => String(name || '').trim().split(/\s+/)[0] || 'them';
    const prep = Array.isArray(trip.trip_prep) ? trip.trip_prep[0] ?? null : trip.trip_prep ?? null;
    const redraw = async () => { await show(); const again = selectedBar(); if (again) openContactsFrom(again, slot); };
    const setReminded = async (p, want) => {
      const { error } = await client.from('trip_drivers').update({ trip_reminder_sent: want }).eq('id', p.seat.id);
      if (error) { toast('error', 'The reminder was not marked.', error.message); return false; }
      return true;
    };
    const setInfoSent = async want => {
      const { error } = await client.from('trip_prep').upsert({ trip_id: trip.id, driver_info_sent: want }, { onConflict: 'trip_id' });
      if (error) { toast('error', 'The driver info was not marked.', error.message); return false; }
      return true;
    };
    const askReminded = async p => {
      if (!p.seat?.id || p.seat.trip_reminder_sent) return;
      if (!(await ask(`Mark ${firstName(p.name)} as reminded?`))) return;
      if (await setReminded(p, true)) { await show(); toast('success', `${firstName(p.name)} is marked as reminded`); }
    };
    /* MARK THE DRIVER AS TOLD, on a yes: after Tell, or by Mark as told for
       a change told by phone, the office says it was, and what the driver now
       knows is the leg as it stands; reading it is theirs. Their accepting
       again does the same. `again` draws what is open: the window from Mark
       as told, the board alone after Tell, which put the window away. */
    const askTold = async (p, again = redraw) => {
      if (!(await ask(`Mark ${firstName(p.name)} as told of the changes?`, p.tell.join(' · ')))) return;
      const view = window.SchedulerDriverJob.viewNow(trip, leg, p.driverId,
        { busesById: panelIndex.buses, driversById: panelIndex.driversById, nameOf: requirementLabel });
      const { data, error } = await client.rpc('mark_driver_told',
        { p_trip_id: trip.id, p_driver_id: p.driverId, p_leg: word, p_role: p.seatRole, p_view: view });
      if (error || !data) { toast('error', 'The driver was not marked as told.', error?.message ?? 'Their answer is no longer Confirmed.'); return; }
      await again();
      toast('success', `${firstName(p.name)} is marked as told`);
    };
    const askInfoSent = async (to, note) => {
      if (prep?.driver_info_sent) return;
      if (!(await ask(`Mark driver info as sent to ${firstName(to)}?`, note))) return;
      if (await setInfoSent(true)) await show();
    };
    // The offer to record a call or text to the customer's people.
    const offer = (did, name, title, subtitle) => () => {
      const body = `${did} ${name}`;
      toast('info', title ?? body, subtitle ?? 'Add it to the updates?', {
        label: 'Add update',
        onClick: async () => {
          toast(null);
          if (await writeUpdate(trip.id, { kind: 'update', body, keys: null })) { await show(); toast('success', 'Update added', body); }
          else toast('warning', 'The update was not added.', 'Add it from the card.');
        },
      });
    };
    const copyText = async text => {
      try { await navigator.clipboard.writeText(text); return true; } catch {
        toast('error', 'Could not copy that', 'The browser would not reach the clipboard.');
        return false;
      }
    };
    // A menu item that leaves for a link, putting the window away.
    const goTo = (href, then) => () => { closeContacts(); then?.(); window.location.href = href; };
    // Apple's Messages reads the body after `&`, everyone else's after `?`.
    const apple = /Mac|iPhone|iPad/.test(navigator.userAgent);
    /* What is sent about the trip sits in the row of the person it goes to,
       on a screen wide enough to hold it beside Call and Text: a driver's
       reminder in theirs, and in the booking contact's Driver info, which
       copies the driver details, and Email, which opens a message to paste
       them in. On a phone, where a row has room for two buttons, they stay
       in the menu. */
    const roomy = !phoneQuery.matches;
    const tasks = new Map();
    const task = it => {
      const b = el('button', 'rux--btn rux--btn--secondary rux--layout--size-md scheduler-contact__task', it.words || it.label);
      b.type = 'button';
      if (it.words) b.setAttribute('aria-label', it.say || it.label);
      b.addEventListener('click', it.run);
      const glyph = svgUse(it.icon, '16', '0 0 32 32');
      glyph.classList.add('rux--btn__icon');
      b.appendChild(glyph);
      return b;
    };
    /* A person is a row of Carbon's contained list: who they are to the trip,
       a driver's bus before their role, over their name and number, with
       Call and Text at the row's end and their tasks before those. */
    const card = p => {
      const li = el('li', 'rux--contained-list-item');
      const c = el('div', 'rux--contained-list-item__content scheduler-contact');
      const who = el('div', 'scheduler-contact__who');
      who.append(
        el('span', 'scheduler-contact__role', p.bus != null ? `Bus ${p.bus} ${p.role}` : p.role),
        el('strong', 'scheduler-contact__name', p.name),
        el('span', 'scheduler-contact__meta', p.phone ? showPhone(p.phone) : 'No number'));
      // Something to put right with this person, in the warning colour.
      const alertLine = words => {
        const line = el('span', 'scheduler-contact__alert');
        line.append(svgUse('#m-warning-fill', '16', '0 0 32 32'), el('span', null, words));
        return line;
      };
      // What was marked as sent to this person, with when, and the way to take it back.
      const sentLine = (words, at, undo) => {
        const line = el('span', 'scheduler-contact__sent');
        line.append(svgUse('#m-check_circle-fill', '16', '0 0 32 32'), el('span', null, [words, at ? setAt(at) : null].filter(Boolean).join(' · ')));
        const back = el('button', 'rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm', 'Undo');
        back.type = 'button';
        back.setAttribute('aria-label', `Undo: ${words}, ${p.name}`);
        back.addEventListener('click', async () => { back.disabled = true; if (await undo()) await redraw(); else back.disabled = false; });
        line.appendChild(back);
        return line;
      };
      if (p.seat?.trip_reminder_sent) who.appendChild(sentLine('Reminded', p.seat.trip_reminder_sent_at, () => setReminded(p, false)));
      // A driver who declined, or who has a change to be told of, with the way to mark them told.
      if (p.declined) who.appendChild(alertLine('Declined'));
      if (p.tell?.length) {
        const line = alertLine(`Changed since they accepted: ${p.tell.join(' · ')}`);
        const told = el('button', 'rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm', 'Mark as told');
        told.type = 'button';
        told.setAttribute('aria-label', `Mark ${p.name} as told of the changes`);
        told.addEventListener('click', () => askTold(p));
        line.appendChild(told);
        who.appendChild(line);
      }
      if (p === booker && prep?.driver_info_sent) who.appendChild(sentLine('Driver info sent', prep.driver_info_sent_at, () => setInfoSent(false)));
      const acts = el('div', 'scheduler-contact__actions');
      if (p.phone) {
        const call = button('Call', '#m-call', `tel:${dial(p.phone)}`, false, p.customer ? offer('Called', p.name) : null);
        call.classList.add('scheduler-contact__call');
        acts.appendChild(call);
      }
      const messages = p.texting && !docked;
      if (messages || p.phone) {
        const text = button('Text', '#m-chat', messages ? p.texting : `sms:${dial(p.phone)}`, messages, p.customer ? offer('Texted', p.name) : null);
        text.classList.add('scheduler-contact__text');
        acts.appendChild(text);
      }
      if (tasks.has(p)) {
        const sent = el('div', 'scheduler-contact__tasks');
        sent.append(...tasks.get(p).map(task));
        const all = el('div', 'scheduler-contact__buttons');
        all.append(sent, acts);
        c.append(who, all);
      } else c.append(who, acts);
      li.appendChild(c);
      return li;
    };
    // The booking contact, the trip contacts, then the drivers, this bar's bus first.
    const drivers = [...mine, ...others];
    const everyone = [
      ...people.filter(p => p.role !== 'Trip contact'),
      ...people.filter(p => p.role === 'Trip contact'),
      ...drivers,
    ];

    /* The rest is in the overflow menu beside the close button, in groups
       parted by Carbon's divider: a group text to every driver on the leg,
       from two drivers up; the driver details letter to the booking contact,
       emailed or copied for Missive; an email to a contact who has an
       address; each driver's reminder of the leg, or their Tell; and Add
       number for a person with none. Where the screen is roomy the reminders,
       the copied letter and the contact's email are the row's tasks, and the
       emailed letter stays here, as the copied one does while the booking
       contact has no row. */
    const groups = [[], [], [], [], []];
    const [toAll, toLetter, toEmail, toRemind, toAdd] = groups;
    const hand = (p, group, it) => {
      if (roomy && p) tasks.set(p, [...(tasks.get(p) || []), it]);
      else group.push(it);
    };
    const booker = people.find(p => p.role !== 'Trip contact');
    const numbers = [...new Set(drivers.map(d => d.phone && dial(d.phone)).filter(Boolean))];
    if (numbers.length > 1) {
      toAll.push({ label: `Text all drivers (${numbers.length})`, run: goTo(`sms:/open?addresses=${numbers.join(',')}`) });
    }
    const letter = driverLetter(trip);
    if (letter) {
      const sent = ['Emailed driver details to', letter.to?.name || 'the customer'];
      if (letter.to?.email) {
        toLetter.push({ label: 'Email driver details', run: goTo(
          `mailto:${letter.to.email}?subject=${encodeURIComponent(letter.subject)}&body=${encodeURIComponent(letter.body)}`,
          async () => { await askInfoSent(sent[1], 'Answer once the email has gone.'); offer(...sent, 'Driver details emailed')(); }) });
      }
      hand(booker, toLetter, { label: 'Copy driver details', words: 'Driver info', say: 'Copy driver info', icon: '#m-content_copy', run: async () => {
        if (!(await copyText(letter.body))) return;
        closeContacts();
        await askInfoSent(sent[1], 'The driver details are copied. Paste and send them, then answer.');
        offer(...sent, 'Driver details copied', 'Add to updates once sent?')();
      } });
    }
    for (const p of people) {
      if (p.email) hand(p, toEmail, { label: `Email ${p.name}`, words: 'Email', icon: '#m-mail', run: goTo(`mailto:${p.email}`, offer('Emailed', p.name)) });
    }
    /* Tell takes Remind's place while the leg changed for a driver since they
       accepted it: a text of what changed and the leg as it stands, with their
       link where it is live and carries this leg, asked for as the window
       opens so the text is ready on the press. It is typed in or copied as a
       reminder is, and then the board asks to mark them told. */
    const linkOf = p => (client ? client.rpc('get_driver_schedule_share_for_driver', { p_driver_id: p.driverId }) : Promise.resolve({}))
      .then(({ data: s, error }) => (!error && s?.token && (!s.expiresAt || new Date(s.expiresAt) > new Date())
        && (s.assignmentRefs || []).some(r => String(r.tripId) === String(trip.id)
          && (r.legId ? String(r.legId) === String(leg) : (r.leg || 'outbound') === word))
        ? driverText.DRIVER_LINK + encodeURIComponent(s.token) : ''), () => '');
    /* Remind opens a text to the driver with their reminder typed in; to the
       office's Google Messages conversation, which takes no text, it copies
       the reminder first to paste. */
    for (const p of drivers) {
      if (p.news) {
        const text = linkOf(p).then(p.news);
        const asTell = { label: `Tell ${p.name}`, words: 'Tell', icon: '#m-notification_important' };
        if (p.texting && !docked) {
          hand(p, toRemind, { ...asTell, run: async () => {
            if (await copyText(await text)) toast('success', 'Changes copied', `Paste them in ${p.name}'s conversation.`);
            closeContacts();
            window.open(p.texting, '_blank', 'noopener');
            void askTold(p, show);
          } });
        } else if (p.phone) {
          hand(p, toRemind, { ...asTell, run: async () =>
            goTo(`sms:${dial(p.phone)}${apple ? '&' : '?'}body=${encodeURIComponent(await text)}`, () => void askTold(p, show))() });
        }
        continue;
      }
      if (!p.reminder) continue;
      if (p.texting && !docked) {
        hand(p, toRemind, { label: `Remind ${p.name}`, words: 'Remind', icon: '#m-notifications', run: async () => {
          if (await copyText(p.reminder)) toast('success', 'Reminder copied', `Paste it in ${p.name}'s conversation.`);
          closeContacts();
          window.open(p.texting, '_blank', 'noopener');
          void askReminded(p);
        } });
      } else if (p.phone) {
        hand(p, toRemind, { label: `Remind ${p.name}`, words: 'Remind', icon: '#m-notifications',
          run: goTo(`sms:${dial(p.phone)}${apple ? '&' : '?'}body=${encodeURIComponent(p.reminder)}`, () => void askReminded(p)) });
      }
    }
    for (const p of everyone) {
      if (p.phone || (p.texting && !docked)) continue;
      toAdd.push({ label: `Add number for ${p.name}`, run: p.customer
        ? () => { closeContacts(); openSelected(); }
        : goTo(`drivers.html?id=${encodeURIComponent(p.driverId)}`) });
    }
    const options = groups.filter(g => g.length).flatMap((g, i) => g.map((it, j) => {
      const li = el('li', i && !j ? 'rux--overflow-menu-options__option rux--overflow-menu--divider' : 'rux--overflow-menu-options__option');
      li.setAttribute('role', 'none');
      const b = el('button', 'rux--overflow-menu-options__btn');
      b.type = 'button';
      b.setAttribute('role', 'menuitem');
      b.tabIndex = -1;
      b.appendChild(el('div', 'rux--overflow-menu-options__option-content', it.label));
      b.addEventListener('click', it.run);
      li.appendChild(b);
      return li;
    }));
    contactsOptions.replaceChildren(...options);
    contactsMenu.hidden = !options.length;
    const list = el('div', 'rux--contained-list rux--layout--size-lg');
    const ul = el('ul');
    ul.setAttribute('role', 'list');
    ul.append(...everyone.map(card));
    list.appendChild(ul);
    const rows = everyone.length ? [list] : [];
    contactsList.replaceChildren(...(rows.length ? rows : [el('p', 'scheduler-contacts__empty', 'Nobody to reach on this trip yet.')]));
    document.getElementById('scheduler-contacts-trip').textContent = tripName(trip);
    contactsOpen = { slot };
    window.Rux?.modal?.open?.(contactsModal, slot);
  }
  // A tap on Call or Text follows its link and puts the window away.
  contactsList?.addEventListener('click', e => { if (e.target.closest('.scheduler-contact__action')) closeContacts(); });

  /* THE CARD'S ROWS, as the shortcut bar draws them under its slots: a red
     band while this bar's bus does not fit the trip, the reminder while the
     trip asks for a follow-up and the other warnings, then two parts under
     their own titles: the trip's notes and its updates, each a title alone
     that says none when it is empty. Each person keeps one of Carbon's
     avatar colours, picked by their name, so a face is learnt. */
  // The five mid tones, each of which holds white initials at 4.5 to 1.
  const AVATAR_COLOURS = ['rux--user-avatar--order-1-cyan', 'rux--user-avatar--order-3-green',
    'rux--user-avatar--order-4-magenta', 'rux--user-avatar--order-5-purple', 'rux--user-avatar--order-6-teal'];
  const avatarColour = name => {
    let h = 0;
    for (const ch of String(name)) h = (h * 31 + ch.codePointAt(0)) >>> 0;
    return AVATAR_COLOURS[h % AVATAR_COLOURS.length];
  };
  /* The staff, by the account an update records as its author, so the card
     draws each one as the header's own avatar draws them: their photo, or
     their initials in their profile's colour. Read once, apart from the week,
     because a refused read should cost the faces and not the board; until it
     answers, or if it is refused, an update keeps its initial. */
  let staffFaces = new Map();
  client?.from('profiles').select('id,user_id,display_name,photo_path,avatar_color').then(r => {
    if (!r.error) staffFaces = new Map((r.data || []).map(p => [p.user_id, p]));
  });
  /* An update's author as a face, on the card and in the Updates window, its
     name the tooltip and accessible name. A line copied from the old notes
     with nobody named is a grey face. A written update is drawn as its
     author's own avatar. An imported one never is: its account is whoever ran
     the import, not the person who wrote the line, so it keeps the initial of
     the name it carries. */
  function updateFace(u, size) {
    /* A line copied from the old notes has no author to show, so it stands
       behind a note rather than an empty face. */
    if (u.kind === 'imported' && !u.actor_name) {
      const note = el('span', `scheduler-note-face scheduler-note-face--${size === 'sm' ? 'sm' : 'md'}`);
      note.appendChild(svgUse('#m-sticky_note_2', '16', '0 0 32 32'));
      note.title = 'From the old notes';
      note.setAttribute('role', 'img');
      note.setAttribute('aria-label', 'From the old notes');
      return note;
    }
    const who = u.actor_name || (u.kind === 'imported' ? 'From the old notes' : 'Someone');
    const nobody = !u.actor_name;
    const face = el('span', `rux--user-avatar ${size === 'sm' ? 'rux--user-avatar--sm' : 'rux--user-avatar--md'} ${nobody ? 'rux--user-avatar--order-2-gray' : avatarColour(who)}`,
      nobody ? '' : who.charAt(0).toUpperCase());
    const author = u.kind !== 'imported' && staffFaces.get(u.actor_id);
    if (author) {
      window.Rux?.account?.drawAvatar?.(face,
        { id: author.id, name: u.actor_name || author.display_name, photoPath: author.photo_path, colour: author.avatar_color }, size);
    }
    face.title = who;
    face.setAttribute('role', 'img');
    face.setAttribute('aria-label', who);
    return face;
  }
  const cardKey = trip => (trip ? JSON.stringify([pageEl?.getAttribute('data-board'), quickOpenFor === trip.id, asksFollowUp(trip), waitsOf(trip), dayOfContact(trip),
    !!trip.contact_not_needed, updatesOpenFor === trip.id, cardEdit?.tripId === trip.id ? [cardEdit.id, cardEdit.mode] : null,
    (trip.trip_updates || []).map(u => u.id).sort(), agoShort(quietSince(trip) || Date.now())]) : '');
  /* How long ago an update was written: minutes in the first hour, hours in
     the first day, then days for a week, "45m", "2h", "3d"; an older one
     shows its date, "Sep 22", which reads quicker than "45d". */
  const ageShort = at => {
    const mins = Math.max(1, Math.floor((Date.now() - Date.parse(at)) / 60000));
    if (mins < 60) return `${mins}m`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h`;
    if (mins < 7 * 1440) return `${Math.floor(mins / 1440)}d`;
    const day = new Date(at);
    return day.toLocaleDateString(undefined, day.getFullYear() === new Date().getFullYear()
      ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' });
  };
  /* A part's own button, at its title's end: the note's Edit or Add, the
     updates' Add. A word in the link colour, with the whole action as its
     accessible name. */
  /* THE FLOATING CARD'S HEAD, as the trip panel's is: the trip's
     destination, and Close at its end, since the card stays until it is put
     away. A card opened to one part has no head, since its trip is the bar
     beside it, selected; Escape, a press elsewhere or the same press again
     puts it away. The docked sheet on a phone heads itself with the trip's rows. */
  /* Close, at the end of a one-part card's heading as a Carbon window's is. */
  function cardClose() {
    const close = el('button', 'rux--btn rux--btn--ghost rux--btn--icon-only rux--layout--size-md scheduler-card__close');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close card');
    close.title = 'Close';
    close.appendChild(svgUse('#m-close', '16', '0 0 32 32'));
    close.lastChild.setAttribute('class', 'rux--btn__icon');
    return close;
  }
  function cardHead(trip) {
    const head = el('div', 'scheduler-card__top');
    const title = el('div', 'scheduler-card__top-title', trip.destination || 'No destination');
    title.title = title.textContent;
    const close = el('button', 'rux--btn rux--btn--ghost rux--btn--icon-only rux--layout--size-md scheduler-card__close');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close card');
    close.title = 'Close';
    close.appendChild(svgUse('#m-close', '16', '0 0 32 32'));
    close.lastChild.setAttribute('class', 'rux--btn__icon');
    head.append(title, close);
    return head;
  }

  function cardAction(action, words, label) {
    /* Carbon's small ghost button, its word alone: on a card this small the
       word says the whole action, and an icon beside it is a second colour. */
    const btn = el('button', 'rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm scheduler-card__action');
    btn.type = 'button';
    btn.dataset.cardAction = action;
    btn.setAttribute('aria-label', label);
    btn.append(words);
    return btn;
  }

  /* A part's title, Carbon's way of heading a list: its name in the 14px
     heading type, its count beside it in plain secondary text, and the
     part's button, if it has one, at its end. */
  function cardTitle(name, count, action) {
    const title = el('div', 'scheduler-card__title');
    const heading = el('span', 'scheduler-card__heading', name);
    if (count) heading.appendChild(el('span', 'scheduler-card__count', String(count)));
    title.appendChild(heading);
    if (action) title.appendChild(action);
    return title;
  }

  /* THE LIVE CARD'S MAP: one Leaflet map, made the first time a live card
     opens and moved into each live card drawn after, so a card drawn again
     with each answer keeps the office's own zoom; it fits the leg afresh
     only for another bus. live-map.js loads Leaflet and draws the pin and
     the leg, as the Live map page does. */
  let liveMap = null;
  async function liveMapInto(holder, bar, bus, next, hue) {
    const none = words => holder.isConnected && holder.replaceWith(el('p', 'scheduler-card__live-none', words));
    try { await LiveMap.load(); } catch { none("The map didn't load. Show on Live map opens it."); return; }
    if (!holder.isConnected) return;
    if (!liveMap) {
      const host = el('div', 'scheduler-card__live-map-box');
      holder.replaceWith(host);
      const map = window.SchedulerPlaces.baseMap(host, LiveMap.style(), { scrollWheelZoom: false });
      if (!map) { host.replaceWith(el('p', 'scheduler-card__live-none', window.SchedulerPlaces.unavailable() || "The map didn't load.")); return; }
      liveMap = { host, map, layer: null, pin: null, busId: null, style: LiveMap.style() };
    } else holder.replaceWith(liveMap.host);
    const { map } = liveMap;
    map.invalidateSize();
    const want = LiveMap.style();
    if (want !== liveMap.style) { liveMap.style = want; map.style(want); }
    const here = bus.lat != null && bus.lng != null ? [bus.lat, bus.lng] : null;
    const leg = { path: bus.path, here, stop: next?.stop ?? null, at: !!next?.at, stops: next?.stops ?? [],
      reached: next?.where.reached ?? -1, clock: ms => hhmm(Road.clockOf(ms), true) };
    liveMap.layer?.remove();
    liveMap.layer = LiveMap.drawLeg(map, leg);
    liveMap.pin?.remove();
    liveMap.pin = here ? window.L.marker(here, { keyboard: false, interactive: false, icon: window.L.divIcon({
      className: 'scheduler-live-pin-box', iconSize: null,
      html: LiveMap.pinHtml({ number: panelIndex.buses.get(bar.dataset.busId)?.number ?? '', hue, heading: bus.heading, moving: bus.mph > 0 }),
    }) }).addTo(map) : null;
    if (liveMap.busId !== bus.bus_id) {
      liveMap.busId = bus.bus_id;
      const points = LiveMap.pointsOf(leg);
      if (points.length > 1) map.fitBounds(points, { padding: [24, 24], maxZoom: 14 });
      else map.setView(points[0] ?? [26.2, -98.2], points.length ? 13 : 9);
    }
    // The card pops in at a smaller scale, so the map measures itself again once it settles.
    requestAnimationFrame(() => map.invalidateSize());
  }

  // A driver's three clocks, each against the most its rule allows.
  const LIVE_CLOCKS = [['Drive', 'drive_ms', 10 * ROAD_HOUR], ['Shift', 'shift_ms', 15 * ROAD_HOUR], ['Cycle', 'cycle_ms', 70 * ROAD_HOUR]];
  function drawLiveCard(trip, bar) {
    const card = el('div', 'scheduler-card scheduler-card--live');
    card.dataset.tripId = trip.id;
    // Each part of the live card is a tile of its own, as the Departures panel's are.
    const tile = cls => el('div', `rux--tile scheduler-card__live-tile ${cls}`);
    const bus = roadBusOf(bar);
    if (!bus) { card.appendChild(el('p', 'scheduler-card__row scheduler-card__live-none', 'Samsara has no reading for this bus now.')); return card; }
    const next = roadNext(bar, bus);
    const said = roadLook(bar, bus, next, roadNamed(bar));
    // Each warning in a band of its colour: its mark, its name and why.
    for (const w of said.warnings) {
      const band = tile(`scheduler-card__live-warn scheduler-card__live-warn--${w.tone}`);
      band.append(svgUse(w.tone === 'error' ? '#m-report-fill' : '#m-warning-fill', '16', '0 0 16 16'),
        el('strong', 'scheduler-card__live-warn-name', w.title), el('span', 'scheduler-card__live-why', w.sentence));
      card.appendChild(band);
    }
    /* The map of the leg, where the bus is and when Samsara last heard from
       it, then where to see more of it. */
    const mapRow = tile('scheduler-card__live-map');
    const holder = el('div', 'scheduler-card__live-map-box');
    const links = el('div', 'scheduler-card__live-links');
    const link = (words, href, away) => {
      const a = el('a', 'rux--btn rux--btn--secondary rux--btn--sm rux--layout--size-sm scheduler-card__live-link', words);
      a.href = href;
      if (away) { a.target = '_blank'; a.rel = 'noopener'; }
      return a;
    };
    // Two secondary buttons sharing the tile's width, outlined in this app's own theme.
    if (bus.lat != null && bus.lng != null) links.appendChild(link('Google Maps', `https://www.google.com/maps/search/?api=1&query=${bus.lat},${bus.lng}`, true));
    links.appendChild(link('Live map', `live.html?bus=${encodeURIComponent(bar.dataset.busId)}`, false));
    const foot = el('div', 'scheduler-card__live-foot');
    foot.append(el('span', 'scheduler-card__live-place', bus.place || (bus.lat != null ? 'Place unknown' : 'No position')),
      el('span', 'scheduler-card__live-seen', bus.seen ? `Seen ${roadAgo(bus.seen)} ago` : 'Not seen'));
    mapRow.append(holder, foot, links);
    card.appendChild(mapRow);
    liveMapInto(holder, bar, bus, next, hueFor(trip));
    /* The stops still to come, each a dot, its name and the time it is due,
       the next with a green dot and when the bus gets there and how late. */
    const toCome = next ? next.stops.filter((st, i) => i > next.where.reached || (next.at && i === next.where.reached)) : [];
    if (toCome.length) {
      const part = tile('scheduler-card__road');
      part.appendChild(cardTitle('Stops'));
      const list = el('ul', 'scheduler-card__road-list');
      for (const st of toCome) {
        const isNext = st === next.stop;
        const item = el('li', `scheduler-card__road-stop${isNext ? ' scheduler-card__road-stop--next' : ''}`);
        item.append(el('span', 'scheduler-card__road-dot'), el('span', 'scheduler-card__road-name', st.name || 'Stop'));
        const when = el('span', 'scheduler-card__road-words');
        if (isNext && next.at) when.textContent = 'Here now';
        else {
          const words = [st.due != null ? `Due ${hhmm(Road.clockOf(st.due), true)}` : null,
            isNext && next.arrival != null ? `arrives ${hhmm(Road.clockOf(next.arrival), true)}` : null,
            isNext && next.late ? `${next.late} min late` : null].filter(Boolean).join(' · ');
          when.textContent = words || 'No time';
          if (isNext && next.late) when.classList.add('scheduler-card__road-words--late');
        }
        item.appendChild(when);
        list.appendChild(item);
      }
      part.appendChild(list);
      card.appendChild(part);
    }
    // Each driver in the bus, the one at the wheel first, with their three clocks.
    if (bus.drivers.length) {
      const part = tile('scheduler-card__road');
      part.appendChild(cardTitle('Drivers'));
      const list = el('ul', 'scheduler-card__road-list');
      for (const d of [...bus.drivers].sort((a, b) => b.wheel - a.wheel)) {
        const item = el('li', 'scheduler-card__live-driver');
        const who = el('div', `scheduler-card__road-driver${d.wheel ? ' scheduler-card__road-driver--wheel' : ''}`);
        who.append(d.duty ? roadMark(d.duty) : el('span', 'scheduler-crew__duty'), el('span', 'scheduler-card__road-name', d.name),
          el('span', 'scheduler-card__road-words', [ROAD_DUTY[d.duty]?.word, d.wheel ? 'at the wheel' : null].filter(Boolean).join(' · ')));
        /* The three clocks side by side, each its name and the hours left
           over a meter of them, amber under an hour. */
        const clocks = el('div', 'scheduler-card__live-clocks');
        for (const [name, field, most] of LIVE_CLOCKS) {
          const ms = d[field];
          if (ms == null) continue;
          const low = ms < ROAD_HOUR;
          const clock = el('div', `scheduler-card__live-clock${low ? ' scheduler-card__live-clock--low' : ''}`);
          clock.title = `${name}: ${roadHours(ms)} left`;
          const top = el('span', 'scheduler-card__live-clock-top');
          top.append(el('span', 'scheduler-card__live-clock-name', name), el('span', 'scheduler-card__live-left', roadHours(ms)));
          const meter = el('span', 'scheduler-card__live-meter');
          meter.style.setProperty('--scheduler-left', `${Math.round(Math.min(1, ms / most) * 100)}%`);
          clock.append(top, meter);
          clocks.appendChild(clock);
        }
        item.appendChild(who);
        // A resting driver's rest so far and when their hours are full again.
        const rest = roadRest(d);
        if (rest) item.appendChild(el('span', 'scheduler-card__live-rest', rest));
        if (clocks.children.length) item.appendChild(clocks);
        list.appendChild(item);
      }
      part.appendChild(list);
      card.appendChild(part);
    }
    // An engine lamp that is on, with what each of its codes says.
    if (bus.fault) {
      const part = tile('scheduler-card__road');
      const lamps = el('ul', 'scheduler-card__road-list');
      const item = el('li', `scheduler-card__road-lamp scheduler-card__road-lamp--${bus.fault}`);
      item.append(el('span', 'scheduler-card__road-name', bus.fault === 'stop' ? 'Engine stop lamp on' : 'Engine warning lamp on'));
      for (const words of bus.faults ?? []) item.appendChild(el('span', 'scheduler-card__road-fault', words));
      lamps.appendChild(item);
      part.appendChild(lamps);
      card.appendChild(part);
    }
    return card;
  }

  /* The tabs over an out trip's card, as Design draws a tablist, each tab's
     panel its card: On the road the live card, Updates the trip card, with
     its Needs counted on its tab in their colour. */
  function drawRoadCard(trip, bar) {
    const on = roadTabOf(bar);
    const wrap = el('div', 'scheduler-card-tabs');
    const tabs = el('div', 'rux--tabs scheduler-card-tabs__tabs');
    const list = el('div', 'rux--tab--list');
    list.setAttribute('role', 'tablist');
    list.setAttribute('aria-label', 'Trip card');
    tabs.appendChild(list);
    const alerts = alertsOf(trip, barFacts.get(bar));
    const panels = [['road', 'On the road', () => drawLiveCard(trip, bar)], ['needs', 'Needs', () => drawCard(trip, bar, 'needs')], ['updates', 'Updates', () => drawCard(trip, bar, 'updates')]].map(([id, words, draw]) => {
      const selected = id === on;
      const tab = el('button', `rux--tabs__nav-item rux--tabs__nav-link${selected ? ' rux--tabs__nav-item--selected' : ''}`);
      tab.type = 'button';
      tab.id = `scheduler-card-tab-${id}`;
      tab.dataset.roadTab = id;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', String(selected));
      tab.setAttribute('aria-controls', `scheduler-card-panel-${id}`);
      tab.tabIndex = selected ? 0 : -1;
      const label = el('div', 'rux--tabs__nav-item-label-wrapper');
      label.appendChild(el('span', 'rux--tabs__nav-item-label', words));
      if (id === 'needs' && alerts.length) {
        label.appendChild(el('span', `scheduler-bar__msg scheduler-bar__msg--${alerts.some(a => a.row === 'scheduler-card__misfit') ? 'error' : 'warning'} scheduler-card__count`,
          String(alerts.length)));
      }
      tab.appendChild(label);
      list.appendChild(tab);
      const panel = el('div', 'rux--tab-content scheduler-card-tabs__panel');
      panel.id = `scheduler-card-panel-${id}`;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tab.id);
      panel.hidden = !selected;
      panel.appendChild(draw());
      return panel;
    });
    wrap.append(tabs, ...panels);
    return wrap;
  }

  function drawCard(trip, bar, section = '') {
    const card = el('div', 'scheduler-card');
    card.dataset.tripId = trip.id;
    const row = (cls, tag = 'div') => el(tag, `scheduler-card__row ${cls}`);
    /* A warning is a press that goes where it is put right: an editor tab,
       the Forms panel, or the itinerary slot's own upload. */
    const WARN_GO = { fleet: 'Buses', billing: 'Billing', details: 'Details', forms: 'Forms', itinerary: 'Itinerary', contacts: 'Contacts' };
    const goes = (band, go, words) => {
      band.dataset.go = go;
      band.tabIndex = 0;
      band.setAttribute('role', 'button');
      band.setAttribute('aria-label', `${words}: open ${WARN_GO[go]}`);
      return band;
    };
    /* EVERY ALERT IS A LINE OF ITS OWN, a bell then its two or three words,
       so the list reads down the same way whatever kind each one is: the red
       bell with its mark for a bus that does not fit, the plain bell in the
       warning band for the rest. The words say which. None has a dismiss. A
       due trip also says when it leaves, once, at its first reminder's end. */
    /* THE NEEDS: what the trip still needs, under a title of its own with
       the count its bar carries, in the bar's colour, so the disc on the bar
       and the list it counts read as one thing, and the list in a box of its
       own under it, apart from the updates. */
    const facts = bar ? barFacts.get(bar) : null;
    const problems = facts?.problems ?? [];
    const other = alertsOf(trip, facts).filter(a => !problems.some(p => p.words === a.words && p.go === a.go));
    const alerts = [...problems, ...other];
    // A section opens only its content; an empty Needs tab says so.
    const only = section;
    if (section === 'needs' && !alerts.length) card.appendChild(el('p', 'scheduler-card__none', 'No needs.'));
    /* Floating, each part is a tile holding its title, its button and its
       rows, as the live card's are; docked on a phone the parts are the
       sheet's own bands. */
    const floating = pageEl?.getAttribute('data-board') !== 'compact';
    const part = cls => row(floating ? `${cls} rux--tile scheduler-card__tile` : cls);
    /* One plain list under one heading: the bar's count heads Alerts, and the
       broader needs follow in the same list, each its own icon: a mistake on
       the board is the red circle, an alert the triangle and a need the
       dashed circle. A trip with needs only is headed Other needs. Each row
       says where a press on it goes; Open trip is the card's footer. */
    const needsLists = new Map();
    if (alerts.length) {
      const list = el('div', 'scheduler-card__needs-list');
      const needs = part('scheduler-card__needs');
      const [name, count] = problems.length ? ['Alerts', problems.length] : ['Other needs', other.length];
      needs.append(cardTitle(name, count, floating && only === 'needs' && !bar?.dataset?.road ? cardClose() : null), list);
      if (only !== 'updates') card.appendChild(needs);
      for (const item of alerts) needsLists.set(item, list);
    }
    let reminded = false;
    for (const a of alerts) {
      const band = goes(row(a.row), a.go, a.words);
      if (a.spot) band.dataset.spot = a.spot;
      const need = other.includes(a);
      if (need) band.classList.add('scheduler-card__row--need');
      band.append(svgUse(a.row === 'scheduler-card__misfit' ? '#m-error-fill' : need ? '#i-circle-dash' : '#i-warning--alt--filled', '16', '0 0 32 32'),
        el('strong', null, a.words));
      if (a.row === 'scheduler-card__asks' && !reminded) {
        reminded = true;
        if (dueFollowUp(trip)) {
          const days = daysToGo(trip);
          band.appendChild(el('span', 'scheduler-card__asks-when',
            days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`));
        }
      }
      if (WARN_GO[a.go]) band.appendChild(el('span', 'scheduler-card__go', WARN_GO[a.go]));
      needsLists.get(a).appendChild(band);
    }
    /* THE UPDATES: Updates with their count, "Updates · 5", and Add, over
       the updates, newest first. Floating,
       the card has the room to show every update in full, scrolling past the
       card's height. Docked, two lines show, each cut to one line, and the
       whole section is one press that opens every update in full and a
       second press closes; Add is its own button. Two updates that fit their
       lines have nothing more to show, which fitUpdates works out once they
       are drawn. With none, floating, Updates and Add over a line saying
       there are none; docked, No updates and Add. */
    const all = updatesOf(trip);
    const open = all.length > 0 && (floating || updatesOpenFor === trip.id);
    const shown = open ? all : all.slice(0, 2);
    const updates = part('scheduler-card__updates');
    updates.dataset.count = String(all.length);
    updates.dataset.shown = String(shown.length);
    updates.toggleAttribute('data-open', open);
    /* While the quick update's box is open, Add reads Save: it adds what is
       typed, as Enter does, and with nothing typed closes the box. */
    const quickOpen = quickOpenFor === trip.id || (quickDraft.tripId === trip.id && !!quickDraft.text);
    const add = quickOpen ? cardAction('save', 'Save', 'Save the update') : cardAction('update', floating ? 'Add update' : 'Add', 'Add an update');
    /* Floating, the footer's buttons are solid as a Carbon window's are:
       the main one primary and the other secondary. */
    const solid = (btn, cls) => {
      btn.classList.remove('rux--btn--ghost');
      btn.classList.add(cls);
      btn.dataset.solid = '';
      return btn;
    };
    if (floating) solid(add, 'rux--btn--primary');
    if (quickOpen) markSave(add, quickDraft.tripId === trip.id && !!quickDraft.text.trim());
    /* An update is its author's 16px avatar, its words, and on its first
       line's end how long ago, always as a number, so every update's age
       stands in one column. The name is the avatar's tooltip and accessible
       name, and the full date the age's tooltip. */
    const canEdit = floating || open;
    const editItem = u => {
      const item = el('li', 'scheduler-card__update scheduler-card__update--editing');
      item.dataset.updateId = u.id;
      const face = updateFace(u, 'sm');
      face.classList.add('scheduler-card__face');
      const edit = el('div', 'scheduler-card__edit');
      const actions = el('div', 'scheduler-card__edit-actions');
      const small = (cls, text, act) => {
        const b = el('button', `rux--btn ${cls} rux--btn--sm rux--layout--size-sm`, text);
        b.type = 'button';
        b.dataset.editAct = act;
        return b;
      };
      if (cardEdit.mode === 'delete') {
        edit.appendChild(el('span', 'scheduler-card__words', u.body));
        actions.append(el('span', 'scheduler-card__edit-ask', 'Delete this update?'),
          small('rux--btn--secondary', 'Cancel', 'cancel'), small('rux--btn--danger', 'Delete', 'delete'));
      } else {
        const box = el('textarea', 'rux--text-area');
        box.rows = 2;
        box.value = cardEdit.draft ?? u.body;
        box.setAttribute('aria-label', 'Update');
        const wrap = el('div', 'rux--text-area__wrapper');
        wrap.appendChild(box);
        edit.appendChild(wrap);
        const keep = small('rux--btn--primary', 'Save', 'save');
        keep.disabled = !box.value.trim() || box.value.trim() === u.body;
        actions.append(small('rux--btn--danger--ghost', 'Delete', 'ask-delete'), small('rux--btn--secondary', 'Cancel', 'cancel'), keep);
      }
      edit.appendChild(actions);
      item.append(face, edit);
      return item;
    };
    const updateItem = u => {
      if (canEdit && cardEdit?.tripId === trip.id && cardEdit.id === u.id) return editItem(u);
      const item = el('li', 'scheduler-card__update');
      const face = updateFace(u, 'sm');
      face.classList.add('scheduler-card__face');
      const when = el('span', 'scheduler-card__when', ageShort(u.created_at));
      when.title = updateStamp(u);
      /* An update is a press that opens it in its own row: a button laid over
         the whole row, so a pointer can press anywhere on it and Tab reaches
         it. */
      item.dataset.updateId = u.id;
      const open = el('button', 'scheduler-card__open');
      open.type = 'button';
      open.setAttribute('aria-label', `Edit update: ${u.body}`);
      open.title = `${updateStamp(u)}`;
      item.append(open, face, el('span', 'scheduler-card__words', u.body), when);
      return item;
    };
    /* Docked, with any updates, the title's words are the section's toggle, a
       real button with an arrow, so a keyboard and a screen reader reach what
       a press anywhere on the section does. */
    /* Floating, the title is Updates whatever there is, and with none a line
       under it in its tile says so, as the Departures panel's empty day does. */
    const title = cardTitle(all.length || floating ? 'Updates' : 'No updates', all.length,
      floating ? (only === 'updates' && !bar?.dataset?.road ? cardClose() : null) : add);
    if (all.length && !floating) {
      const toggle = el('button', 'scheduler-card__toggle');
      toggle.type = 'button';
      toggle.setAttribute('aria-expanded', String(open));
      const heading = title.firstChild;
      heading.replaceWith(toggle);
      toggle.append(heading, svgUse('#m-keyboard_arrow_down', '16', '0 0 16 16'));
    }
    updates.appendChild(title);
    /* A quick update is typed into the card itself, in a box that Add opens
       under the title: Save or Enter adds it to the trip at once, as the
       Updates window's Add update does, and Escape clears it, or with nothing
       typed closes the box. It stays open, with what is typed, across a redraw. */
    let footerQuick = null;
    if (quickOpen) {
      const quick = el('div', 'rux--text-input__field-wrapper rux--layout--size-sm scheduler-card__quick');
      const quickInput = el('input', 'rux--text-input');
      quickInput.type = 'text';
      quickInput.placeholder = 'Add an update…';
      quickInput.setAttribute('aria-label', 'Add an update');
      quickInput.dataset.tripId = trip.id;
      if (quickDraft.tripId === trip.id) quickInput.value = quickDraft.text;
      quick.appendChild(quickInput);
      if (floating) footerQuick = quick; else updates.appendChild(quick);
    }
    if (!all.length && floating) updates.appendChild(el('p', 'scheduler-card__none', 'No updates yet.'));
    if (all.length) {
      const list = el('ol', 'scheduler-card__update-list');
      list.setAttribute('aria-label', 'Updates, newest first');
      list.append(...shown.map(updateItem));
      updates.appendChild(list);
    }
    if (only !== 'needs') card.appendChild(updates);
    /* Floating, the card ends in a footer along its foot, as a Carbon window
       does: Open trip with the needs, Add update with the updates, and while
       a new update is typed its box over Cancel and Save. */
    if (floating) {
      const parts = [];
      if (footerQuick && only !== 'needs') {
        parts.push(footerQuick, solid(cardAction('cancel', 'Cancel', 'Cancel the update'), 'rux--btn--secondary'), add);
      } else {
        if (only !== 'updates' && alerts.length) {
          const link = el('button', 'rux--btn rux--btn--secondary rux--btn--sm rux--layout--size-sm scheduler-card__link');
          link.type = 'button';
          link.append('Open trip');
          parts.push(link);
        }
        if (only !== 'needs') parts.push(add);
      }
      if (parts.length) {
        const foot = el('div', 'scheduler-card__footer');
        foot.append(...parts);
        card.appendChild(foot);
      }
    }
    return card;
  }

  /* Whether the card's updates have more to show than the newest's line:
     another update, or words the line cuts off. The update answers a press
     only then. */
  function fitUpdates() {
    const part = barShortcuts?.querySelector('.scheduler-card__updates');
    if (!part) return;
    // Floating, every update already shows in full, so there is nothing to open.
    if (!barShortcuts.hasAttribute('data-docked')) { part.removeAttribute('data-more'); return; }
    const words = [...part.querySelectorAll('.scheduler-card__update .scheduler-card__words')];
    const more = part.hasAttribute('data-open') || Number(part.dataset.count) > Number(part.dataset.shown)
      || words.some(w => w.scrollHeight > w.clientHeight + 1);
    part.toggleAttribute('data-more', more);
    // With nothing more to show, the toggle has nothing to do.
    const toggle = part.querySelector('.scheduler-card__toggle');
    if (toggle) toggle.disabled = !more;
  }
  /* Floating, a list of updates taller than the card fades at its foot while
     there is more below, because a Mac hides the scroll bar until it is used. */
  function fadeUpdates() {
    const list = barShortcuts?.querySelector('.scheduler-card__update-list');
    if (!list) return;
    list.toggleAttribute('data-below', !barShortcuts.hasAttribute('data-docked')
      && list.scrollTop + list.clientHeight < list.scrollHeight - 1);
  }
  barShortcuts?.addEventListener('scroll', e => {
    if (e.target.classList?.contains('scheduler-card__update-list')) fadeUpdates();
  }, true);
  function toggleUpdates(tripId, refocus) {
    updatesOpenFor = updatesOpenFor === tripId ? null : tripId;
    placeBarOpen();
    if (refocus) barShortcuts.querySelector('.scheduler-card__toggle')?.focus();
  }

  // A slot acts on the bar it shows, and a disabled one does nothing.
  barShortcuts?.addEventListener('click', e => {
    // Compact sheets copy the bar's rows; their controls act on the selected bar.
    const head = e.target.closest('.scheduler-bar-shortcuts__trip');
    const opener = head && e.target.closest('[data-card-opener]');
    const overflow = head && e.target.closest('[data-crew-overflow]');
    if (opener || overflow) {
      const bar = selectedBar();
      if (!bar) return;
      if (overflow) openContactsFrom(bar, overflow);
      else {
        cardTrigger = opener;
        askCard(bar, true, window.SchedulerBar.cardSectionOf(opener));
      }
      return;
    }
    // Close puts the card away and hands focus back to its trip.
    if (e.target.closest('.scheduler-card__close')) {
      const bar = selectedBar();
      if (bar) { askCard(bar, false); cardOrigin(bar).focus(); }
      return;
    }
    // The quick update's box takes its own clicks.
    if (e.target.closest('.scheduler-card__quick')) return;
    // Open trip opens the trip's editor beside the board.
    if (e.target.closest('.scheduler-card__link')) { openSelected(); return; }
    // Add opens the quick update's box under the title, and Save adds what
    // it holds, or with nothing typed closes it.
    const action = e.target.closest('.scheduler-card__action');
    if (action) {
      if (action.dataset.cardAction === 'cancel') { closeQuick(true); return; }
      if (action.dataset.cardAction === 'save') {
        const input = action.closest('.scheduler-card')?.querySelector('.scheduler-card__quick input');
        if (input?.value.trim()) quickAdd(input); else closeQuick(true);
        return;
      }
      openQuick(action.closest('.scheduler-card')?.dataset.tripId ?? null);
      return;
    }
    // A warning goes where it is put right.
    const warning = e.target.closest('.scheduler-card__row[data-go]');
    if (warning) { goToWarning(warning.dataset.go, warning.dataset.spot); return; }
    // The open update's buttons: Delete asks first, Cancel puts the row back.
    const act = e.target.closest('[data-edit-act]');
    if (act) {
      const how = act.dataset.editAct;
      if (how === 'cancel') endCardEdit(true);
      else if (how === 'ask-delete') { cardEdit.mode = 'delete'; placeBarOpen(); barShortcuts.querySelector('[data-edit-act="cancel"]')?.focus(); }
      else changeCardUpdate(act);
      return;
    }
    // An update opens in its own row; docked, only once the section shows them all, the press before that opening it.
    const update = e.target.closest('.scheduler-card__update[data-update-id]');
    if (update) {
      if (update.classList.contains('scheduler-card__update--editing')) return;
      if (!barShortcuts.hasAttribute('data-docked') || update.closest('.scheduler-card__updates[data-open]')) {
        startCardEdit(selectedBar()?.dataset.tripId, update.dataset.updateId);
        return;
      }
    }
    // A press anywhere on updates with more to show opens or closes them, and
    // the toggle keeps focus when a key pressed it.
    const more = e.target.closest('.scheduler-card__updates[data-more]');
    if (more) {
      toggleUpdates(more.closest('.scheduler-card')?.dataset.tripId ?? null, e.detail === 0);
      return;
    }
    // The docked sheet's trip is the whole bar written out, and a tap on it
    // opens the trip as the Open slot does; its phone number dials instead.
    if (e.target.closest('.scheduler-bar-shortcuts__trip') && !e.target.closest('a')) { openSelected(); return; }
    const btn = e.target.closest('.scheduler-bar-shortcut');
    if (!btn || btn.getAttribute('aria-disabled') === 'true') return;
    const bar = selectedBar();
    if (!bar) return;
    // A shortcut puts the card away, except Contacts, whose window opens over it
    // and hands focus back to its slot on closing, and Open, whose editor opens
    // beside the board.
    if (btn.dataset.shortcut !== 'contacts' && btn.dataset.shortcut !== 'open') putCardAway(bar);
    (FIXED_SHORTCUTS[btn.dataset.shortcut] ?? SHORTCUT_ACTIONS.find(a => a.id === btn.dataset.shortcut))?.run(bar, btn);
  });

  // The signed-in person's id, or null in a preview with no log-in.
  async function personId() {
    const session = await Promise.resolve(window.Rux?.account?.getSession?.()).catch(() => null);
    return session?.user?.id ?? null;
  }

  /* Cancel is not delete: `cancelled_at` takes the trip off the board and the
     row stays, so a cancelled trip can still be looked up. Its buses and
     drivers come off it, so they are free
     for other trips at once; the history entry says how many. The reason is
     required: Cancel trip stays disabled until the box holds some text. The
     bar menu and the editor's Cancel trip button both open the dialog
     through here. The drivers on the trip are named in the dialog, its toast
     and its history entry, since each has to be told; their link shows the
     trip as Cancelled until its day passes. */
  // Each driver on a trip's buses once, by the name the board writes, in order.
  const driverNames = (assignments, ids = null) => [...new Set((assignments || [])
    .flatMap(a => (a.trip_drivers || []).map(d => d.driver_id)).filter(id => id != null && (!ids || ids.has(id))))]
    .map(id => panelIndex.driversById.get(id)).filter(Boolean).map(d => d.short_name || d.name);
  const listed = names => (names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0] ?? '');
  function openCancelModal(tripId) {
    // The editor's own trip may be on another week than the one on screen.
    const trip = panelIndex.trips.get(tripId) ?? (panelArgs?.trip?.id === tripId ? panelArgs.trip : null);
    cancelling = tripId;
    document.getElementById('scheduler-cancel-what').textContent =
      `${trip?.destination || 'This trip'}${trip?.customer ? ` for ${trip.customer}` : ''}.`;
    const names = driverNames(trip?.trip_assignments);
    const tell = document.getElementById('scheduler-cancel-tell');
    if (tell) { tell.hidden = !names.length; tell.textContent = names.length ? `Tell ${listed(names)}.` : ''; }
    document.getElementById('scheduler-cancel-reason').value = '';
    document.getElementById('scheduler-cancel-confirm').disabled = true;
    window.Rux?.modal?.open?.('scheduler-cancel-modal');
  }

  let cancelling = null;

  document.getElementById('scheduler-cancel-reason')?.addEventListener('input', e => {
    document.getElementById('scheduler-cancel-confirm').disabled = !e.target.value.trim();
  });

  document.getElementById('scheduler-cancel-confirm')?.addEventListener('click', async () => {
    const id = cancelling;
    if (!id) return;
    const reason = document.getElementById('scheduler-cancel-reason').value.trim();
    if (!reason) return;
    window.Rux?.modal?.close?.('scheduler-cancel-modal');
    cancelling = null;
    toast('working', 'Cancelling the trip…');
    try {
      const patch = { cancelled_at: new Date().toISOString(), cancellation_reason: reason };
      const { error } = await withTimeout(client.from('trips').update(patch).eq('id', id).then(r => r));
      if (error) throw new Error(error.message);
      /* A bus-less slot row is not a bus, so buses count only rows with one.
         Deleting the rows takes their drivers with them. A failure leaves the
         trip cancelled with its rows, and says so. */
      let buses = 0;
      let drivers = 0;
      let told = [];
      let kept = false;
      try {
        const { data: rows, error: readErr } = await withTimeout(client.from('trip_assignments')
          .select('id,bus_id,trip_drivers(id,driver_id)').eq('trip_id', id).then(r => r));
        if (readErr) throw new Error(readErr.message);
        if (rows?.length) {
          const { error: delErr } = await withTimeout(client.from('trip_assignments').delete().eq('trip_id', id).then(r => r));
          if (delErr) throw new Error(delErr.message);
        }
        buses = (rows || []).filter(r => r.bus_id).length;
        drivers = (rows || []).reduce((n, r) => n + (r.trip_drivers?.length ?? 0), 0);
        told = driverNames(rows);
      } catch (err) {
        kept = true;
        console.warn('The cancelled trip\'s buses and drivers were not taken off:', err);
      }
      recordHistory(id, 'cancelled', [{
        field: 'trip', label: 'Trip', before: 'Active', after: `Cancelled — ${reason}`,
      }, ...(buses ? [{ field: 'buses', label: 'Buses', before: `${buses} assigned`, after: 'Unassigned' }] : []),
      ...(drivers ? [{ field: 'drivers', label: 'Drivers', before: told.length ? `${listed(told)}, to tell` : `${drivers} assigned`, after: 'Unassigned' }] : [])]);
      // The reason is what the customer was told, so it is the trip's update too.
      writeUpdate(id, { kind: 'update', body: `Cancelled: ${reason}`, keys: ['cancellation'] });
      await show();
      // A cancelled trip leaves the board, and the editor with it.
      if (editing?.id === id && !panelEl.hidden) closePanel(false);
      if (kept) toast('warning', 'Cancelled with its buses and drivers', 'Restore it, free them, cancel again.');
      else toast('success', 'Trip cancelled. It is off the schedule, and search still finds it.', told.length ? `Tell ${listed(told)}.` : undefined);
    } catch (e) {
      toast('error', `The trip was not cancelled. ${e.message}`);
    }
  });

  /* A cancelled trip is not on the board, so search opens this dialog
     instead: what the trip was, when it was cancelled and why. Bring back
     clears both, writes a `reinstated` history
     entry and goes to the trip on its week. */
  let reinstating = null;

  function openCancelledModal(trip) {
    reinstating = trip;
    const on = new Date(trip.cancelled_at).toLocaleDateString(undefined,
      { year: 'numeric', month: 'short', day: 'numeric' });
    document.getElementById('scheduler-cancelled-what').textContent =
      `${trip.destination || 'This trip'}${trip.customer ? ` for ${trip.customer}` : ''}.`;
    document.getElementById('scheduler-cancelled-when').textContent = `Cancelled ${on}`;
    document.getElementById('scheduler-cancelled-reason').textContent =
      trip.cancellation_reason || 'No reason was written.';
    window.Rux?.modal?.open?.('scheduler-cancelled-modal');
  }

  document.getElementById('scheduler-cancelled-reinstate')?.addEventListener('click', async () => {
    const trip = reinstating;
    if (!trip) return;
    window.Rux?.modal?.close?.('scheduler-cancelled-modal');
    reinstating = null;
    toast('working', 'Bringing the trip back…');
    try {
      const { error } = await withTimeout(client.from('trips')
        .update({ cancelled_at: null, cancellation_reason: null }).eq('id', trip.id).then(r => r));
      if (error) throw new Error(error.message);
      recordHistory(trip.id, 'reinstated', [{
        field: 'trip', label: 'Trip',
        before: trip.cancellation_reason ? `Cancelled — ${trip.cancellation_reason}` : 'Cancelled',
        after: 'Active',
      }]);
      toast('success', 'Trip brought back. It is on the schedule again.');
      await goToTrip(trip.id, trip.start_date);
    } catch (e) {
      toast('error', `The trip was not brought back. ${e.message}`);
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
  // The week on screen as the forms page's week schedule, in its own tab.
  // What the colours mean: the legend of a live bar's dial, in a window of its own.
  document.getElementById('scheduler-menu-lights')?.addEventListener('click', () => {
    const menu = document.getElementById('scheduler-view-menu');
    if (menu) { window.Rux?.menu?.close?.(menu); menu.hidden = true; }
    const modal = document.getElementById('scheduler-lights-modal');
    if (modal) window.Rux?.modal?.open?.(modal);
  });
  document.getElementById('scheduler-menu-print-week')?.addEventListener('click', () => {
    const menu = document.getElementById('scheduler-view-menu');
    if (menu) { window.Rux?.menu?.close?.(menu); menu.hidden = true; }
    window.open(`print.html?form=week-schedule&week=${iso(cursor)}`, '_blank', 'noopener');
  });
  document.getElementById('scheduler-menu-new-trip')?.addEventListener('click', () => {
    const menu = document.getElementById('scheduler-view-menu');
    if (menu) { window.Rux?.menu?.close?.(menu); menu.hidden = true; }
    whenSafe(() => openCreate());
  });
  document.getElementById('scheduler-new-trip')?.addEventListener('click', () => whenSafe(() => openCreate()));
  document.getElementById('scheduler-panel-close')?.addEventListener('click', () => whenSafe(() => closePanel()));

  /* A STORED FILE OPENS LARGER IN THE MIDDLE OF THE SCREEN. The expand
     button lifts the panel itself to a window centred over the dimmed page,
     its head, toolbar and file with it. The window is the browser's popover:
     it stands in the top layer, above the header and clear of the board's
     clipping, without leaving its place in the page, so the file does not
     reload, and the browser puts it back on Escape or a press outside. The
     button again puts it back too, and closing the panel lets it go. The
     column keeps its place beside the week meanwhile, so nothing behind the
     window moves. The column's `data-expanded` is the state, and everything
     else follows it. */
  const viewerColumn = document.getElementById('scheduler-viewer');
  const viewerPanelEl = document.getElementById('scheduler-viewer-panel');
  const viewerExpandBtn = document.getElementById('scheduler-viewer-expand');
  const viewerExpanded = () => !!viewerColumn?.hasAttribute('data-expanded');
  const setViewerExpanded = on => viewerColumn?.toggleAttribute('data-expanded', on);
  function syncViewerExpand() {
    const on = viewerExpanded();
    if (viewerPanelEl && on && !viewerPanelEl.hasAttribute('popover')) {
      viewerPanelEl.setAttribute('popover', 'auto');
      viewerPanelEl.showPopover();
    } else if (viewerPanelEl && !on && viewerPanelEl.hasAttribute('popover')) {
      if (viewerPanelEl.matches(':popover-open')) viewerPanelEl.hidePopover();
      viewerPanelEl.removeAttribute('popover');
    }
    // The button names what a press does.
    if (!viewerExpandBtn) return;
    const words = on ? 'Back to the panel' : 'Open larger';
    viewerExpandBtn.setAttribute('aria-label', words);
    viewerExpandBtn.title = words;
    viewerExpandBtn.querySelector('use')?.setAttribute('href', on ? '#m-close_fullscreen' : '#m-open_in_full');
  }
  if (viewerColumn) new MutationObserver(syncViewerExpand).observe(viewerColumn, { attributes: true, attributeFilter: ['data-expanded'] });
  viewerExpandBtn?.addEventListener('click', () => setViewerExpanded(!viewerExpanded()));
  /* The window's close is the window's, as a modal's is: it puts the file back
     in its panel, which stays open, and only the panel's own close shuts it.
     Caught first, so the panel's close handler never hears it. */
  document.getElementById('scheduler-viewer-close')?.addEventListener('click', e => {
    if (!viewerExpanded()) return;
    e.stopImmediatePropagation();
    setViewerExpanded(false);
  }, true);
  // The browser's own dismissal, Escape or a press outside, puts it back as the button does.
  viewerPanelEl?.addEventListener('toggle', e => { if (e.newState === 'closed') setViewerExpanded(false); });
  /* A press outside the window only puts it back, as a press on a modal's
     scrim does: the browser lets it through to whatever lies under the
     window, and a trip selected there would take the panel to its own file.
     It is held at the document before anything below hears it. A menu the
     window opened is part of it. */
  let viewerSwallow = false;
  const holdOutside = e => {
    if (!viewerExpanded() || viewerPanelEl.contains(e.target) || e.target.closest?.('.rux--menu, .rux--modal')) return;
    viewerSwallow = true;
    e.stopPropagation();
  };
  document.addEventListener('pointerdown', holdOutside, true);
  document.addEventListener('mousedown', e => { if (viewerSwallow) e.stopPropagation(); }, true);
  // A press that ends without a click, a drag, holds nothing after it.
  document.addEventListener('pointerup', () => { if (viewerSwallow) setTimeout(() => { viewerSwallow = false; }); }, true);
  document.addEventListener('click', e => {
    if (!viewerSwallow) return;
    viewerSwallow = false;
    e.stopPropagation();
    e.preventDefault();
  }, true);
  /* Leaving whichever panel is in front of the board, which Escape and a press
     on the scrim both do. It answers whether there was one, so Escape can go
     on to what it means with nothing in front. */
  function leaveFront() {
    if (!frontPanel) return false;
    if (frontPanel === 'editor') whenSafe(() => closePanel());
    else if (frontPanel === 'roster') { availOn = false; placeAvailability(); availToggle?.focus(); }
    else if (frontPanel === 'to-do') window.SchedulerToDoList?.shut('tasks');
    else if (frontPanel === 'prep') window.SchedulerToDoList?.shut('prep');
    else viewers[frontPanel]?.close();
    return true;
  }
  document.getElementById('scheduler-scrim')?.addEventListener('click', () => leaveFront());
  /* Escape acts where focus is. Inside the itinerary panel it closes that
     panel; inside the editor it closes the editor; on the board it clears a
     selection first. An open dialog keeps the key for itself, and so does
     anything that already took it -- a list or date picker closing, a combo
     box clearing -- so one press does one thing. */
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    if (document.querySelector('.rux--modal.is-visible')) return;
    // A document opened larger goes back to its panel first.
    if (viewerExpanded()) { e.preventDefault(); setViewerExpanded(false); viewerExpandBtn?.focus(); return; }
    /* A panel in front of the board is the only thing on screen, so Escape
       leaves it wherever focus is: the board behind it is inert and has
       nothing to take the key for. The editor beside a panel over the week
       is still in use, so there Escape is the editor's. */
    const inEditorBeside = pageEl?.hasAttribute('data-cover') && (tripEl?.contains(document.activeElement) || panelEl.contains(document.activeElement));
    if (!inEditorBeside && leaveFront()) { e.preventDefault(); return; }
    const inViewer = Object.values(viewers).find(v => v.el && !v.el.hidden && v.el.contains(document.activeElement));
    if (inViewer) {
      e.preventDefault();
      inViewer.close();
      return;
    }
    const inEditor = !!tripEl?.contains(document.activeElement) || panelEl.contains(document.activeElement);
    // An open card goes first, and the selection with the next press.
    const picked = selectedBar();
    if (!inEditor && picked && floatingCard() && cardAsked(picked)) {
      e.preventDefault();
      const inCard = barShortcuts?.contains(document.activeElement);
      askCard(picked, false);
      if (inCard) cardOrigin(picked).focus();
      return;
    }
    if (!inEditor && picked) { e.preventDefault(); clearSelection(); return; }
    if (!panelEl.hidden) { e.preventDefault(); whenSafe(() => closePanel()); }
  });

  /* ── Searching trips ──────────────────────────────────────────────────────
     The toolbar's search button opens a window that finds trips by
     destination, organization or booking contact across every trip, not only
     the week on screen, and a result closes the window and opens its trip on
     its own week. Design ships no search module, so the results list and its
     keys are wired here; Design's modal opens, traps and closes the window. */
  const searchModal = document.getElementById('scheduler-search-modal');
  const searchOpen = document.getElementById('scheduler-search-open');
  const searchInput = document.getElementById('scheduler-search-input');
  const searchResults = document.getElementById('scheduler-search-results');
  const searchList = document.getElementById('scheduler-search-list');
  const searchCount = document.getElementById('scheduler-search-count');
  const searchNoteEl = document.getElementById('scheduler-search-note');
  const searchClear = document.getElementById('scheduler-search-clear');

  // A picked trip empties the field, so the window opens clean next time.
  function clearSearch() {
    if (searchInput) searchInput.value = '';
    searchClear?.classList.add('rux--search-close--hidden');
    showResults(false);
  }

  /* A window closed without a pick keeps its query and results, and opening
     it again selects the query so typing replaces it, with the list back at
     its top and nothing highlighted. The modal has already put the cursor in
     the field, which carries `autofocus`. */
  searchModal?.addEventListener('rux:modal-opened', () => {
    searchInput?.select();
    setActive(-1);
    if (searchList) searchList.scrollTop = 0;
  });

  /* Every trip is searched, cancelled ones included, in three plain columns
     on `trips`: `customer` (the organization), `destination` and
     `booking_contact_name`, so no join is needed. A cancelled trip is tagged
     and opens the cancelled dialog instead of the board.

     Best match first. Two reads run together: the newest `SEARCH_POOL` trips
     with the text anywhere in a column, and the newest trips with a column
     that starts with it, so a strong match on an old trip is not lost behind
     newer weak ones. `searchRank` orders the merged rows: a column equal to
     the text, then one starting with it, then a word in one starting with it,
     then the text anywhere; and among equals, the trip nearest today.

     The query is sanitised first because PostgREST parses `or=(...)` as a
     list: a typed comma, parenthesis or backslash would re-parse into other
     filters, and `%` or `*` would widen the match. The pool reads more than
     `SEARCH_CAP`, so the count can say "more than" without counting the
     table. */
  const SEARCH_MIN = 2;
  const SEARCH_POOL = 200;
  const SEARCH_COLUMNS = ['destination', 'customer', 'booking_contact_name'];
  const searchSafe = q => q.replace(/[,()\\%*]/g, ' ').replace(/\s+/g, ' ').trim();

  // 0 equal, 1 starts with, 2 a word starts with, 3 anywhere, 4 not at all.
  const columnRank = (text, needle) => {
    const hay = String(text ?? '').toLowerCase();
    let i = hay.indexOf(needle);
    if (i === -1) return 4;
    if (hay === needle) return 0;
    if (i === 0) return 1;
    for (; i !== -1; i = hay.indexOf(needle, i + 1)) if (!/[\p{L}\p{N}]/u.test(hay[i - 1])) return 2;
    return 3;
  };
  const searchRank = (rows, q) => {
    const needle = q.toLowerCase();
    const today = Date.now();
    const away = trip => trip.start_date ? Math.abs(parseISO(trip.start_date) - today) : Infinity;
    return rows
      .map(trip => ({ trip, rank: Math.min(...SEARCH_COLUMNS.map(c => columnRank(trip[c], needle))), away: away(trip) }))
      .sort((a, b) => a.rank - b.rank || a.away - b.away)
      .map(r => r.trip);
  };

  async function searchTrips(q) {
    const safe = searchSafe(q);
    if (safe.length < SEARCH_MIN) return { rows: [] };
    const readLike = (like, limit) => client.from('trips')
      .select('id,destination,customer,booking_contact_name,start_date,cancelled_at,cancellation_reason')
      .or(SEARCH_COLUMNS.map(c => `${c}.ilike.${like}`).join(','))
      .order('start_date', { ascending: false })
      .limit(limit);
    const [anywhere, starts] = await Promise.all([readLike(`*${safe}*`, SEARCH_POOL), readLike(`${safe}*`, SEARCH_CAP)]);
    const error = anywhere.error || starts.error;
    if (error) throw new Error(error.message);
    const byId = new Map([...(anywhere.data || []), ...(starts.data || [])].map(t => [t.id, t]));
    return { rows: searchRank([...byId.values()], safe) };
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
      const whenEl = el('span', 'scheduler-search__when', when);
      if (trip.cancelled_at) {
        const tag = el('span', 'rux--tag rux--layout--size-sm rux--tag--red rux--tag--sm');
        tag.append(el('span', 'rux--tag__label', 'Cancelled'));
        whenEl.prepend(tag);
      }
      head.append(
        mark(trip.destination || 'No destination', 'scheduler-search__dest', safe),
        whenEl,
      );
      btn.append(
        head,
        mark([trip.customer, trip.booking_contact_name].filter(Boolean).join(' · ') || 'No organization',
          'scheduler-search__meta', safe),
      );
      btn.addEventListener('click', () => {
        clearSearch();
        window.Rux?.modal?.close(searchModal);
        if (trip.cancelled_at) openCancelledModal(trip);
        else goToTrip(trip.id, trip.start_date, { open: false });
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
     row or else the first. Escape is the modal's, and closes the window. These
     listen on the field, so they cannot take a key the editor or the board
     wants. */
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

  // Cmd-K or Ctrl-K opens the search window, or with it open puts the cursor
  // back in the field with the query selected.
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && !e.altKey && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      if (searchModal?.classList.contains('is-visible')) { searchInput?.focus(); searchInput?.select(); }
      else window.Rux?.modal?.open(searchModal, searchOpen);
    }
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
  // Whether the last read covers every day shown from this first day: one of
  // its nine weeks, and with two weeks shown, the one after too.
  const holds = start => !!cached && iso(addDays(cached.centre, -NEAR_DAYS)) <= iso(start)
    && iso(lastShown(start)) <= iso(addDays(cached.data.weekEnd, NEAR_DAYS));
  /* What one week would have to change for a redraw to be worth it: which trips
     it draws and when each was last written, which is what an edit moves, and
     the windows that stripe a row or a day in it. It is taken for one week and
     never for the payload, because two reads centred on different weeks cover
     different 153-day windows and their trip lists differ even where the week
     drawn is the same one. Sorted, since the order a read returns is its own. */
  const weekPrint = (data, weekStart) => {
    const weekEnd = lastShown(weekStart);
    const span = { from: iso(weekStart), to: iso(weekEnd) };
    /* The whole trip, not its id and stamp: a bar's bus, its crew, its stops
       and its money all live in tables of their own, and none of them moves
       `trips.updated_at`. Fingerprinting the stamp alone made a trip dragged to
       another bus print the same as before, so the read that followed the drag
       was judged a no-op and the bar stayed where it had been until a reload.
       The embedded rows are sorted, because the select fixes the columns but
       not the order they come back in. */
    const byId = (x, y) => String(x.id).localeCompare(String(y.id));
    const whole = tr => JSON.stringify({
      ...tr,
      trip_assignments: [...(tr.trip_assignments || [])]
        .map(a => ({ ...a, trip_drivers: [...(a.trip_drivers || [])].sort(byId) }))
        .sort(byId),
      trip_updates: [...(tr.trip_updates || [])].sort(byId),
    });
    const drawn = (data.trips || [])
      .filter(tr => legsOf(tr).some(l => clip(l.from, l.to, weekStart, weekEnd)))
      .map(whole).sort();
    /* Whole rows, not how many of them: a window keeps its number while its
       dates move the stripe it draws and its reason rewrites the flag's words.
       The select is fixed, so two reads spell the same row the same way. */
    const windows = rows => (rows || [])
      .filter(r => datesOverlap(span, { from: r.start_date, to: r.end_date || r.start_date }))
      .map(r => JSON.stringify(r)).sort().join(',');
    // Whole rows again: a number, a status or a fitting the row head draws all
    // change without the fleet's size changing.
    const fleet = (data.buses || []).map(b => JSON.stringify(b)).sort().join(',');
    // Each driver's answer and what they accepted, which the crew and the alerts draw.
    const answers = [...(data.statuses || new Map())].map(([key, row]) => `${key}=${JSON.stringify(row)}`).sort().join(',');
    return [drawn.join(','), windows(data.oos), windows(data.timeOff), fleet, answers].join('|');
  };

  /* One read at a time, and the last ask always gets its own. A week change or
     a save that asks while a week is loading is queued, not dropped, so the
     board always ends on `cursor` and on the data as it is after the save.
     Every caller gets the same promise, which settles once nothing is left to
     read, so `await show()` means the board is current. */
  function show() {
    // Cached navigation paints synchronously even while a refresh is in flight,
    // but never under a bar in hand, whose drag is measuring the rows.
    if (!weekMotion && holds(cursor) && (!shown || iso(shown) !== iso(cursor))) {
      if (barsInHand) drawOwed = true;
      else {
        render({ ...cached.data, weekStart: cursor, weekEnd: lastShown(cursor) });
        shown = cursor;
      }
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

  /* ── The week as it is now ─────────────────────────────────────────────────
     The board is drawn from seven tables, and the old trips app writes the same
     ones, so a schedule left open goes stale without saying so. A change to any
     of them means the same thing here -- read the week again -- so one
     subscription carries them all and `show` does the drawing, which is why a
     live board and a reloaded board cannot come to differ.

     Patching one bar instead was not an option even in principle: a delete
     arrives as the row's id and nothing else, so a bar that vanished could not
     be found without reading the week anyway.

     All thirteen the week is drawn from broadcast their changes; `contacts` is
     the one left out, because a booking contact is read far more often than it
     is edited and it is the table of customers' own details. */
  const LIVE_TABLES = ['trips', 'trip_assignments', 'trip_drivers', 'trip_stops', 'trip_updates',
    'trip_payments', 'trip_pos', 'trip_invoices', 'trip_quote_lines', 'buses', 'drivers',
    'driver_time_off', 'bus_out_of_service', 'settings', 'trip_driver_statuses'];
  const LIVE_SETTLE = 400;
  let liveTimer = null, liveHeld = false;

  /* Nothing is redrawn under someone's hands. A week or a bar being dragged, an open
     editor with unsaved work in it and a tab nobody is looking at all hold the
     read until they are done, and `liveHeld` is what remembers one is owed.
     The panel's own `hidden` is what says the editor is open: `editing` keeps
     the last trip it held after the panel closes, so it alone would hold the
     board for the rest of the session. */
  function liveRefresh() {
    const busyEditing = !panelEl.hidden && editing && changed();
    const carrying = gridEl.querySelector('.scheduler-bar--dragging');
    if (document.hidden || weekMotion || busyEditing || carrying) { liveHeld = true; return; }
    liveHeld = false;
    show();
  }

  // Saving a trip writes several of these tables, so a burst settles into one
  // read rather than one each.
  function liveSoon() {
    clearTimeout(liveTimer);
    liveTimer = setTimeout(liveRefresh, LIVE_SETTLE);
  }

  /* Coming back to the tab always reads, held or not: the socket goes down
     with the Mac and comes back knowing nothing about what it missed, so the
     look is the floor and the subscription is only what makes it live. */

  /* ── Who else is on a trip ─────────────────────────────────────────────────
     A face lies over the middle of a bar somebody else has open or selected,
     so two people do not spend ten minutes on the same trip before one finds
     out. Nothing is stored: this rides the same connection as the board above
     and a person disappears from it when their tab closes, their Mac sleeps or
     the network drops, which is the whole reason it is not a lock.

     Open is the firmer face and selected the fainter one. A selection is only
     sent once it has lasted `PRESENCE_SETTLE`, because clicking along a row to
     read it would otherwise flash a face across everyone's board for each bar
     passed. Opening is sent at once, being deliberate. */
  const PRESENCE_SETTLE = 900;
  const People = window.SchedulerPeople;
  let presenceTimer = null, presenceRetry = null;
  /* What this tab is on, and what the server was last successfully told. An
     open trip carries its destination and date too, so a face in the header
     can say which trip and lead to it; people.js adds who and which page. */
  let presenceMine = { tripId: null, state: null };
  let presenceSaid = null;
  // tripId -> [{ id, name, photoPath, colour, state }], everyone but me.
  let presenceOthers = new Map();

  let presenceMe = null;
  /* THE SERVER TAKES ONLY SO MANY OF THESE A SECOND and drops the rest, saying
     so in what it answers rather than failing: a run along a row used to spend
     that allowance in a couple of seconds, and every message after it was lost,
     which is why the square stopped appearing until the page was reloaded.
     So: nothing is said twice, and anything that did not land is said again
     once the burst is over. */
  async function presenceSend() {
    clearTimeout(presenceRetry);
    if (!presenceMe || !People?.joined()) return;
    const saying = `${presenceMine.tripId}:${presenceMine.state}`;
    if (saying === presenceSaid) return;
    const answer = await People.track(presenceMine);
    if (answer === 'ok') { presenceSaid = saying; return; }
    presenceSaid = null;
    presenceRetry = setTimeout(presenceSend, PRESENCE_SETTLE);
  }

  /* Opening a trip is deliberate and said at once. Everything else waits for
     the clicking to stop, deselecting included, so running along a row is one
     message rather than two per bar passed. */
  function presenceSoon(tripId, state, trip = null, tripDate = null) {
    presenceMine = { tripId: tripId ?? null, state: tripId ? state : null, trip, tripDate };
    clearTimeout(presenceTimer);
    if (tripId && state === 'open') { presenceSend(); return; }
    presenceTimer = setTimeout(presenceSend, PRESENCE_SETTLE);
  }

  /* What this tab is on: the editor's trip while it is open, otherwise the
     selected bar's. The panel's own `hidden` says the editor is open, as it
     does for the read above. */
  function presenceTell() {
    // The editor may have just opened on a trip somebody else already holds,
    // or just closed, and either way its line is owed an answer now.
    presenceNote();
    if (!panelEl.hidden && editing?.id) {
      return presenceSoon(editing.id, 'open', editing.before?.destination ?? null, editing.before?.start_date ?? null);
    }
    const bar = selectedBar();
    presenceSoon(bar?.dataset.tripId ?? null, 'selected');
  }

  /* Everyone but me, one face each. My own second tab is skipped by account
     rather than by key: a laptop and a phone are two connections, but seeing
     my own face on the trip I am holding says nothing. Somebody else's two
     tabs are one face for the same reason, and open beats selected, being the
     firmer of the two. */
  function presenceRead() {
    const seen = new Map();
    const state = People?.state() ?? {};
    for (const entries of Object.values(state)) {
      for (const who of entries) {
        if (!who?.tripId || !who.id || who.id === presenceMe?.id) continue;
        if (!seen.has(who.tripId)) seen.set(who.tripId, new Map());
        const here = seen.get(who.tripId);
        const already = here.get(who.id);
        if (!already || (already.state !== 'open' && who.state === 'open')) here.set(who.id, who);
      }
    }
    presenceOthers = new Map([...seen].map(([id, here]) => [id, [...here.values()]]));
    presenceDraw();
  }

  /* Drawn after every render too, because `render` replaces every bar. Each
     person is a 16px face at the end of the destination row, the alert
     count's size, before the live dot and the count, so the corner marks
     stay in view; past PRESENCE_FACES the rest are a count. A bar too narrow
     for a face beside its name, as on the compact board, shows none and
     leaves the rule to say an open one alone. */
  const PRESENCE_FACES = 2;
  const PRESENCE_MIN_WIDTH = 64;
  function presenceDraw() {
    presenceNote();
    if (!gridEl) return;
    for (const old of gridEl.querySelectorAll('.scheduler-presence')) old.remove();
    for (const bar of gridEl.querySelectorAll('.scheduler-bar--watched')) bar.classList.remove('scheduler-bar--watched');
    if (!presenceOthers.size) return;
    for (const bar of gridEl.querySelectorAll('.scheduler-bar')) {
      const here = presenceOthers.get(bar.dataset.tripId);
      if (!here?.length) continue;
      /* The rule is for a trip somebody has OPEN, whatever the bar's width: the
         state nothing turns on says it with its face alone, and this one is
         worth seeing from across the week and on a bar too narrow to hold a
         face. */
      if (here.some(who => who.state === 'open')) bar.classList.add('scheduler-bar--watched');
      const row = bar.querySelector(':scope > .scheduler-bar__dest');
      if (!row || bar.getBoundingClientRect().width < PRESENCE_MIN_WIDTH) continue;
      const box = el('span', 'scheduler-presence');
      box.setAttribute('aria-hidden', 'true');
      const shown = Math.min(here.length, PRESENCE_FACES);
      for (const who of here.slice(0, shown)) {
        const face = el('span', 'rux--user-avatar rux--user-avatar--sm scheduler-presence__face');
        face.title = who.name ? `${who.name} has this trip ${who.state === 'open' ? 'open' : 'selected'}` : '';
        window.Rux?.account?.drawAvatar?.(face, who, 'sm');
        box.appendChild(face);
      }
      if (here.length > shown) box.appendChild(el('span', 'scheduler-presence__more', `+${here.length - shown}`));
      row.insertBefore(box, row.querySelector(':scope > :is(.scheduler-road__dot, .scheduler-bar__alert)'));
    }
  }

  // "Ann", "Ann and Bo", "Ann, Bo and Cy".
  function presenceNames(list) {
    const names = list.map(who => who.name || 'Somebody');
    if (names.length < 3) return names.join(' and ');
    return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
  }

  /* The faces lie on bars the editor covers, and a face is not read aloud, so
     the open editor says the same thing in words. */
  const presenceNoteEl = document.getElementById('scheduler-presence-note');
  function presenceNote() {
    if (!presenceNoteEl) return;
    const here = (!panelEl.hidden && editing?.id) ? presenceOthers.get(editing.id) ?? [] : [];
    const open = here.filter(who => who.state === 'open');
    const picked = here.filter(who => who.state !== 'open');
    const said = [];
    if (open.length) said.push(`${presenceNames(open)} ${open.length > 1 ? 'have' : 'has'} this trip open too.`);
    // "it" only after the sentence that named the trip; alone it has nothing
    // to point at.
    if (picked.length) said.push(`${presenceNames(picked)} ${picked.length > 1 ? 'have' : 'has'} ${said.length ? 'it' : 'this trip'} selected.`);
    presenceNoteEl.textContent = said.join(' ');
    presenceNoteEl.hidden = !said.length;
  }

  let boardCh = null;
  const boardStatus = status => {
    // Only a failure is worth a line; a healthy channel says nothing, as it did.
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      console.info(`scheduler: the live board is ${status.toLowerCase()}; coming back to this tab opens it again.`);
    }
  };
  function openBoard() {
    boardCh = client.channel('scheduler-board');
    for (const table of LIVE_TABLES) {
      boardCh.on('postgres_changes', { event: '*', schema: 'public', table }, liveSoon);
    }
    boardCh.subscribe(boardStatus);
  }

  /* A channel that has gone away is thrown out and a new one opened in its
     place: the library refuses to join the same channel twice, so reviving one
     is not an option. The socket comes back on its own after a sleep or a
     dropped network, but a channel it lost on the way does not always come with
     it, and a dead channel says nothing -- the board stops moving and the faces
     stop arriving, with no sign anything is wrong. */
  function wake(ch, open) {
    if (!ch || ch.state === 'joined' || ch.state === 'joining') return false;
    client.removeChannel(ch);
    open();
    return true;
  }

  /* Coming back re-reads the week and revives the board's channel; people.js
     revives the presence channel and asks this tab to say itself again. */
  function liveWake() {
    if (!document.hidden) liveRefresh();
    if (!client?.channel) return;
    wake(boardCh, openBoard);
  }

  async function listen() {
    document.addEventListener('visibilitychange', () => { if (!document.hidden) liveWake(); });
    window.addEventListener('focus', () => { if (liveHeld) liveRefresh(); });
    // The network coming back is the other half of a sleep, and it does not
    // always arrive with a visibility change.
    window.addEventListener('online', liveWake);
    if (!client?.channel) return;
    openBoard();

    /* The presence channel is people.js's, shared with the header's faces.
       This tab says which trip it is on each time the channel joins, and the
       server is told again rather than trusted to remember. Without a staff
       person there is nobody to show. */
    presenceMe = await People?.ready;
    if (!presenceMe) return;
    const sayAgain = () => { presenceSaid = null; presenceTell(); };
    People.onSync(presenceRead);
    People.onJoin(sayAgain);
    if (People.joined()) { sayAgain(); presenceRead(); }
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
    setRange(asked, lastShown(asked));

    /* A week the last read already covers is drawn at once, with no dim and no
       network. The read still follows, because every change re-read before this
       and so always showed current data; caching without the check would let
       someone else's save go quietly missing while two people dispatch. */
    /* Neither draw here happens under a bar in hand: a read that began or was
       queued before the lift would replace the rows the drag is measuring, and
       the drop would find none. The fresh week is kept and the draw is owed,
       which the drag's ending pays through `drawHeld`. */
    const held = holds(asked);
    if (held) {
      if (barsInHand) drawOwed = true;
      else {
        render({ ...cached.data, weekStart: asked, weekEnd: lastShown(asked) });
        shown = asked;
      }
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
      if (barsInHand) { drawOwed = true; return; }
      render(data);
      shown = asked;
    } catch (e) {
      // A queued read follows and reports for itself.
      if (readAgain) return;
      // A failed read keeps the last good week on screen and puts its label
      // back; only a first load, with nothing drawn yet, hides the grid.
      if (shown) setRange(shown, lastShown(shown));
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
    dressWeekPicker();
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
     week still moves the week, and a toast says so, unless it is cancelled,
     which opens the cancelled dialog. Search and the Drivers and Trips
     pages' `?trip=<id>&date=<day>` all come here. */
  /* ── A trip the Claude connector filled in ──
     The connector parks a draft and hands back /scheduler/?draft=<id>. The
     draft carries only the fields it was sure of, and its notes say what it
     could not work out. This opens the editor on it -- a new trip, or the
     trip the draft changes -- and types each field in as a person would, so
     the panel counts them as unsaved changes and Reset takes them back out.
     Every field it touched is marked. Nothing reaches the database until
     Save. The draft is deleted when the panel closes, saved or not, because
     it has been read either way. */

  /* Each field a draft may fill, and the control it is typed into, in the
     order they are typed: draft-fields.js's list, which the connector reads
     too. The stops and the billing rows have no control; the Route and
     Billing tabs lay them out. A field
     whose control is not on screen is named in the panel's notice instead,
     so nothing the connector sent goes quietly. */
  /* A DRAFT'S LEG FIELDS go to the leg they name by its old word: into the
     form while that leg is on screen, and onto `editing.legs` while it is
     not. A draft of a split adds its pickup leg, which Save makes, where the
     trip has none. True when the field found its leg. */
  function draftLeg(control, value) {
    if (!editing?.legs?.length) return false;
    const first = editing.legs[0];
    const set = (leg, change) => {
      if (leg.key === screenKey()) {
        if ('kind' in change) {
          const way = document.getElementById('scheduler-f-way');
          if (!way) return false;
          typeInto(way, 'select', change.kind);
          markDrafted(way);
        }
        for (const [k, id] of [['start', 'scheduler-f-start'], ['end', 'scheduler-f-end']]) {
          if (!(k in change)) continue;
          const node = document.getElementById(id);
          if (!node) return false;
          typeInto(node, 'date', change[k]);
          markDrafted(node);
        }
      } else Object.assign(leg, change);
      return true;
    };
    if (control.key === 'trip_type') {
      if (!set(first, { kind: value === 'round_trip' ? 'round_trip' : 'one_way' })) return false;
      if (value === SPLIT && editing.legs.length === 1) addHeldLeg('return');
      return true;
    }
    if (control.leg === 'return' && !legHeld(backKey())) addHeldLeg('return');
    const leg = legHeld(legKeyOf(control.leg));
    return !!leg && set(leg, { [control.end ? 'end' : 'start']: value });
  }
  /* A leg the editor holds before it is saved, a draft's pickup, with the
     first leg's vehicles empty, for Save to make. */
  function addHeldLeg(word) {
    const key = `new:${word}`;
    if (legHeld(key)) return;
    editing.legs.push({ key, id: null, word, start: null, end: null, kind: 'one_way', busCount: editing.legs[0].busCount ?? 1 });
    const seed = editing.fleet?.[editing.legs[0].key]?.[0] ?? {};
    if (editing.fleet) {
      editing.fleet[key] = [blankBus(seed)];
      editing.fleetBefore[key] = [];
      editing.fleetCounts[key] = 0;
    }
  }

  const DRAFT_CONTROLS = Object.fromEntries(window.SchedulerDraftFields.FIELDS
    .filter(f => !['stops', 'stopChanges', 'billing', 'contacts'].includes(f.kind)).map(f => [f.key, f]));

  // What the notice calls a place that still needs choosing from its list.
  const PLACE_LABEL = { pickup_address: 'the pickup', dropoff_address: 'the drop-off' };
  /* What the notice calls each thing a draft sets that has no field to mark:
     the first vehicle's type and needs, and the trip's hotel and fuel card.
     Vehicles a drafted count adds are named where they are added. */
  const UNMARKED_LABEL = {
    vehicle_type: v => `the vehicle type, ${v}`,
    req_sleeper: v => `Sleeper ${v ? 'on' : 'off'}`, req_ada: v => `ADA Lift ${v ? 'on' : 'off'}`,
    req_56pax: v => `56 Pax ${v ? 'on' : 'off'}`,
    need_hotel: v => `the hotel reminder ${v ? 'on' : 'off'}`, need_fuel_card: v => `the fuel card ${v ? 'on' : 'off'}`,
  };

  // The draft whose fields are in the panel, deleted once the panel closes.
  let openDraft = null;
  // The website request that draft came from, which the new trip takes on Save.
  let openDraftRequest = null;

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

  /* `change` is a draft of a saved trip, whose stops replace the leg's after
     the person says yes. */
  async function applyDraft(fields, change = false) {
    const missed = [];
    const unpicked = [];
    const held = [];
    const unmarked = [];
    // Lines the notice says as they are, such as a PO's amount against the quote.
    const said = [];
    // Stop changes the Route tab could not make here, each [where, what].
    const unchanged = [];
    let newCustomer = null;
    const given = fields || {};
    // The table's order first, then what the table does not list, the stops among them.
    const keys = [...Object.keys(DRAFT_CONTROLS).filter(k => k in given), ...Object.keys(given).filter(k => !(k in DRAFT_CONTROLS))];
    for (const key of keys) {
      const value = given[key];
      // The stops between the pickup and the drop-off, laid out on the Route tab.
      if (key === 'stops') {
        if (!Array.isArray(value) || !routeTakesStops) { missed.push([key, JSON.stringify(value)]); continue; }
        const names = value.map(v => v?.name || v?.address).filter(Boolean).join(', ');
        const had = change ? routeStopsHeld() : 0;
        if (had && !(await ask(`Replace this leg's ${had} ${had === 1 ? 'stop' : 'stops'} with the draft's ${value.length}?`,
          'Reset brings the saved stops back.'))) {
          unchanged.push([`the leg's ${had === 1 ? 'stop, kept' : 'stops, kept'} on your answer`, `${value.length} stops: ${names}`]);
          continue;
        }
        const took = routeTakesStops(value, change);
        if (took.refused) unchanged.push(['the stops, since this leg has no pickup or yard row', `${value.length} stops: ${names}`]);
        unpicked.push(...took.unpicked);
        continue;
      }
      /* A purchase order, onto the Billing tile: the row with its number, or
         else the one with none, or else a new row, each marked to check. Its
         amount against the quoted price is said, and the office decides. */
      if (key === 'purchase_order') {
        if (!editing || !stepOn('poReceived')) { missed.push([key, JSON.stringify(value)]); continue; }
        const ref = value.ref == null ? null : String(value.ref).trim();
        const row = (ref && poPending.find(p => folded(p.ref ?? '') === folded(ref))) || poPending.find(p => !p.ref);
        const fill = { drafted: true };
        if (ref) fill.ref = ref;
        if (value.date) fill.date = value.date;
        if (value.amount != null) fill.amount = money(String(value.amount));
        if (row) Object.assign(row, fill);
        else poPending.push({ ref: null, amount: null, date: null, ...fill });
        redrawPos();
        const { price } = billingNow();
        if (fill.amount != null && price > 0 && round2(fill.amount) !== round2(price)) {
          said.push(`The purchase order is for ${usdCents(fill.amount)} and the quoted price is ${usdCents(price)}. Check which is right.`);
        }
        continue;
      }
      // A signed contract, the Billing tile's Contract signed row, with who signed as its note.
      if (key === 'contract') {
        if (!editing || !stepOn('contractSigned')) { missed.push([key, JSON.stringify(value)]); continue; }
        const was = editing.contract;
        editing.contract = { on: value.signed_on ?? was?.on ?? null,
          note: value.signed_by ? `Signed by ${String(value.signed_by).trim()}` : was?.note ?? null, drafted: true };
        redrawContract();
        continue;
      }
      /* The trip contacts, after the type, so a split trip's pickup ones go to
         the pickup. Those held for the leg not on screen, and on a split trip
         not saved yet the pickup's, which nothing on screen marks, are said. */
      if (key === 'trip_contacts') {
        if (!Array.isArray(value) || !detailsTakeContacts || !document.getElementById('scheduler-f-days')) {
          missed.push([key, JSON.stringify(value)]);
          continue;
        }
        const split = splitNow();
        const { elsewhere, full } = detailsTakeContacts(value, split);
        const named = cs => cs.map(c => [c.name, c.phone].filter(Boolean).join(', ')).join('; ');
        const other = viewWord() === 'return' ? 'Drop-off' : 'Pickup';
        if (elsewhere.length) {
          said.push(`${other} ${elsewhere.length === 1 ? 'contact' : 'contacts'} filled in too, and saved with the trip: `
            + `${named(elsewhere)}. Check ${elsewhere.length === 1 ? 'it' : 'them'} on ${other} after Save.`);
        }
        const pickup = !viewWord() && split ? value.filter(c => c.leg === 'return' && !full.includes(c)) : [];
        if (pickup.length) said.push(`For the pickup: ${named(pickup)}. The rest are the drop-off's.`);
        if (full.length) missed.push([key, `${named(full)}, with no contact slot left of the trip's five`]);
        continue;
      }
      // Changes to saved stops, laid onto the Route tab; one it cannot find is named with what it asked.
      if (key === 'stop_changes') {
        if (!Array.isArray(value) || !routeTakesChanges) { missed.push([key, JSON.stringify(value)]); continue; }
        unchanged.push(...routeTakesChanges(value));
        continue;
      }
      const control = DRAFT_CONTROLS[key];
      if (control?.kind === 'legs') {
        const onScreen = control.key === 'trip_type' || legKeyOf(control.leg) === screenKey();
        if (!draftLeg(control, value)) { missed.push([key, value]); continue; }
        if (!onScreen || (control.key === 'trip_type' && value === SPLIT)) {
          unmarked.push(control.key === 'trip_type' ? 'a pickup leg, which Save makes'
            : `the ${control.leg === 'return' ? 'pickup' : 'drop-off'}'s ${control.end ? 'end' : 'start'}, ${legDay(value)}`);
        }
        continue;
      }
      if (control?.kind === 'trip') {
        if (!editing) { missed.push([key, value]); continue; }
        editing[control.tripKey] = !!value;
        routeTimesDrawn?.();
        unmarked.push(UNMARKED_LABEL[key](value));
        continue;
      }
      if (control?.kind === 'buses') {
        const list = legHeld(legKeyOf(control.leg)) ? editing.fleet?.[legKeyOf(control.leg)] : null;
        const want = Math.floor(Number(value));
        if (!list || !(want >= 1)) { missed.push([key, value]); continue; }
        let added = 0;
        while (list.length < want) { list.push(blankBus(list[0] ?? {})); added += 1; }
        if (added) {
          drawFleet();
          unmarked.push(`${added} empty ${added === 1 ? 'vehicle' : 'vehicles'} on ${fleetLegs().length > 1 ? legPhrase(legKeyOf(control.leg)) : 'the Buses tab'}`);
        }
        continue;
      }
      if (control?.kind === 'fleet') {
        const first = editing?.fleet?.[editing.legs[0]?.key]?.[0];
        if (!first) { missed.push([key, value]); continue; }
        if (control.need) {
          const next = new Set(needIds(first.needs));
          if (value) next.add(control.need); else next.delete(control.need);
          first.needs = needsObject(next);
        } else first.vehicleType = value || null;
        drawFleet();
        unmarked.push(UNMARKED_LABEL[key](value));
        continue;
      }
      const node = control ? document.getElementById(control.id) : null;
      if (!node) { missed.push([key, value]); continue; }
      /* A price the editor keeps locked is the total of the trip's quote
         lines, and a draft does not type over it: the lines would no longer
         add up to it. */
      if (key === 'quoted_price' && node.readOnly) { held.push(value); continue; }
      typeInto(node, control.kind, value);
      markDrafted(node);
      /* A typed customer is linked at Save by its name, or added as a new
         one. The draft's is matched now, so the field says Saved customer
         and shows that customer's notes, or the notice says it is new. */
      if (key === 'customer' && String(value ?? '').trim()) {
        const known = (panelIndex.customers || []).find(c => folded(c.name) === folded(value));
        if (known) { node.dataset.customerId = known.id; syncSaved(); } else newCustomer = String(value).trim();
      }
      /* A place search commits nothing until a result is chosen from its
         list: typing only searches. The address is in the box and the search
         has run, but Save keeps it only once it is picked. */
      if (control.kind === 'place') unpicked.push(PLACE_LABEL[key] ?? key);
    }
    refreshDirty();
    return { missed, unpicked, held, unmarked, unchanged, said, newCustomer };
  }

  /* The notice above the fields: what Claude could not work out, or what a
     website request said beyond its fields, and anything filled that this
     panel has no field for, written out so it can be typed in by hand rather
     than lost. */
  function draftNotice(notes, { missed, unpicked, held = [], unmarked = [], unchanged = [], said = [], newCustomer = null }, website = false) {
    if (!notes && !missed.length && !unpicked.length && !held.length && !unmarked.length && !unchanged.length && !said.length && !newCustomer) return;
    const wrap = el('div', 'scheduler-drafted-notice');
    const note = el('div', 'rux--inline-notification rux--inline-notification--info');
    const details = el('div', 'rux--inline-notification__details');
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('class', 'rux--inline-notification__icon');
    icon.setAttribute('width', '20'); icon.setAttribute('height', '20');
    icon.setAttribute('viewBox', '0 0 32 32'); icon.setAttribute('fill', 'currentColor');
    icon.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#m-info-fill');
    icon.appendChild(use);
    const texts = el('div', 'rux--inline-notification__text-wrapper');
    texts.appendChild(el('div', 'rux--inline-notification__title',
      `Filled in ${website ? 'from a website request' : 'by Claude'}. Check the marked fields.`));
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
    // A stop change made nowhere here is said with where it is and what it asked.
    for (const [where, what] of unchanged) {
      texts.appendChild(el('div', 'rux--inline-notification__subtitle', `Not changed here: ${where}. The draft asked for ${what}.`));
    }
    if (unmarked.length) {
      texts.appendChild(el('div', 'rux--inline-notification__subtitle',
        `Also set, with no mark beside ${unmarked.length > 1 ? 'them' : 'it'}: ${unmarked.join(', ')}. A vehicle's type and needs are on the first vehicle of the Buses tab.`));
    }
    if (newCustomer) {
      texts.appendChild(el('div', 'rux--inline-notification__subtitle',
        `${newCustomer} is not on the customers list, and Save adds it. If it is there under another spelling, pick it from the Customer field first.`));
    }
    for (const line of said) texts.appendChild(el('div', 'rux--inline-notification__subtitle', line));
    for (const price of held) {
      texts.appendChild(el('div', 'rux--inline-notification__subtitle',
        `The quoted price is the total of this trip's quote lines, so the draft's ${Number.isFinite(Number(price)) ? usdCents(Number(price)) : price} was not typed in. Change a line on the Billing tab to change the price.`));
    }
    details.append(icon, texts);
    note.appendChild(details);
    wrap.appendChild(note);
    panelDetails.prepend(wrap);
  }

  async function openDraftTrip(id) {
    /* A draft that cannot open says why as far as the page can know. A read
       that failed is said as that, with the reason given. A read that found
       nothing has three causes the database does not tell apart for anyone
       but the draft's maker, so all three are named. */
    let row = null;
    let failed = null;
    try {
      const read = await client.from('trip_drafts')
        .select('id, trip_id, fields, notes, quote_request_id').eq('id', id).maybeSingle();
      row = read.data ?? null;
      failed = read.error ?? null;
    } catch (e) { failed = e; }
    if (!row) {
      await show();
      if (failed?.code === '22P02') toast('info', 'That link is not a draft\'s', 'The address is broken. Ask Claude again.');
      else if (failed) toast('error', 'The draft could not be read', `${failed.message || failed} Open the link again.`);
      else toast('info', 'That draft is not there', 'Used, over 14 days old, or someone else\'s.');
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
    openDraftRequest = row.quote_request_id ?? null;
    draftNotice(row.notes, await applyDraft(row.fields, !!row.trip_id), !!openDraftRequest);
  }

  /* Shows a trip's week with its bar selected and in view, and opens the
     trip unless `open` is false, as a pick from Search trips asks. A link
     that names a leg takes that leg's bar, so a pickup's line in Departures
     never opens the drop-off; one that names none takes
     the trip's first bar on the week. */
  async function goToTrip(id, day, { open = true, leg = null } = {}) {
    if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(day ?? '')) { show(); return; }
    cursor = mondayOf(parseISO(day));
    await show();
    const bars = [...gridEl.querySelectorAll(`.scheduler-bar[data-trip-id="${CSS.escape(id)}"]`)];
    const bar = (leg && bars.find(b => barOnLeg(b, leg))) || bars[0];
    if (!bar) {
      // A cancelled trip has no bar, so its link opens the cancelled dialog.
      const { data: trip } = await withTimeout(client.from('trips')
        .select('id,destination,customer,start_date,cancelled_at,cancellation_reason')
        .eq('id', id).maybeSingle().then(r => r)).catch(() => ({ data: null }));
      if (trip?.cancelled_at) { openCancelledModal(trip); return; }
      toast('info', 'That week is showing', 'The trip has no bar; it may have no bus yet.');
      return;
    }
    bar.scrollIntoView({ block: 'center', inline: 'center' });
    const ref = barRef(bar);
    selectBar(bar);
    if (open && !isEditorBar(bar)) whenSafe(() => openRef(ref));
  }

  /* A LINK TO ONE TRIP, as the address or a row of Departures gives it. A
     Departures line opens the trip where its step is done: the Contact list,
     or a form or the customer's itinerary in the document panel, with the
     trip selected and its editor left shut, or one tab of the editor.
     `opener` is the link pressed, where there was one, and takes the focus
     back when the document panel shuts. */
  function openAsked(asked, opener = null) {
    // A leg by its key, its id, or by the old word an older link names.
    const named = asked.get('leg');
    const leg = ['outbound', 'return'].includes(named) || /^[0-9a-f-]{36}$/i.test(named ?? '') ? named : null;
    if (asked.get('open') === 'contacts') {
      goToTrip(asked.get('trip'), asked.get('date'), { open: false, leg })
        .then(() => { const bar = selectedBar(); if (bar) openContactsFrom(bar); });
    } else if (asked.get('file') === 'itinerary') {
      goToTrip(asked.get('trip'), asked.get('date'), { open: false, leg })
        .then(() => openLegItinerary({ trip: asked.get('trip'), leg,
          assignment: asked.get('assignment'), driver: asked.get('driver') },
          opener ?? selectedBar()));
    } else if (asked.has('form')) {
      goToTrip(asked.get('trip'), asked.get('date'), { open: false, leg })
        .then(() => openTripForm(Object.fromEntries(['form', 'layout', 'trip', 'assignment', 'driver']
          .map(key => [key, asked.get(key)])), opener ?? selectedBar()));
    } else {
      const tab = asked.get('tab');
      goToTrip(asked.get('trip'), asked.get('date'), { leg })
        .then(() => { if (tab) requestAnimationFrame(() => goToTripPart(tab)); });
    }
  }
  /* The lists' panes offer each of their trip links here before following it,
     and the board takes the ones that are its own address, so the trip opens
     beside the list and the page is not read again. */
  document.addEventListener('scheduler:open-trip', e => {
    let url;
    try { url = new URL(e.detail?.href, location.href); } catch { return; }
    if (url.origin !== location.origin || url.pathname !== location.pathname || !url.searchParams.has('trip')) return;
    e.preventDefault();
    openAsked(url.searchParams, e.detail?.opener);
  });

  /* Changing the week drops the toast. An undo for a move on the old week
     would still work, by assignment id, and silently move a trip no longer on
     screen. */
  const go = days => { toast(null); cursor = addDays(cursor, days); show(); };
  // A step is everything on the board, so two weeks shown move on to the two after them.
  stepPrev?.addEventListener('click', () => go(-daysShown()));
  stepNext?.addEventListener('click', () => go(daysShown()));
  document.getElementById('scheduler-today')?.addEventListener('click', () => { toast(null); cursor = mondayOf(new Date()); show(); });

  /* The toolbar's row of controls scrolls sideways where it has no room for
     them. A mouse has no swipe, so a wheel turned over the row moves it
     along; a sideways scroll of the hand's own, and a pinch, are left be. */
  const toolbarStrip = document.getElementById('scheduler-toolbar-strip');
  toolbarStrip?.addEventListener('wheel', e => {
    if (e.ctrlKey || e.deltaX || !e.deltaY || toolbarStrip.scrollWidth <= toolbarStrip.clientWidth) return;
    toolbarStrip.scrollLeft += e.deltaY;
    e.preventDefault();
  }, { passive: false });

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

    // Clip against stationary day-cell boxes, not the moving tracks themselves.
    const clipTracks = grid => {
      for (const track of grid.querySelectorAll('.scheduler-track')) {
        const viewport = el('div', 'scheduler-track-viewport');
        track.before(viewport);
        viewport.appendChild(track);
      }
    };

    const teardown = () => {
      for (const spare of schEl.querySelectorAll('.scheduler-grid--spare')) spare.remove();
      for (const viewport of gridEl.querySelectorAll('.scheduler-track-viewport')) {
        viewport.replaceWith(...viewport.childNodes);
      }
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
      const week = addDays(cursor, dir < 0 ? daysShown() : -daysShown());
      if (!holds(week)) return null;
      spare = el('div', `scheduler-grid scheduler-grid--spare scheduler-grid--${side}`);
      spare.setAttribute('aria-hidden', 'true');
      schEl.appendChild(spare);
      render({ ...cached.data, weekStart: week, weekEnd: lastShown(week) }, spare);
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
      clipTracks(spare);
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
          clipTracks(gridEl);
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
          `Loading ${days > 0 ? 'next' : 'previous'} ${Math.abs(days) > 7 ? 'two weeks' : 'week'}…`));
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
        clipTracks(gridEl);
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
      // The board moves the way the finger went: left brings the next one in.
      const days = dx < 0 ? daysShown() : -daysShown();
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
      openAsked(asked);
    } else if (asked.has('draft')) {
      history.replaceState(null, '', location.pathname);
      openDraftTrip(asked.get('draft'));
    } else {
      show();
    }
    listen();
  })();
})();
