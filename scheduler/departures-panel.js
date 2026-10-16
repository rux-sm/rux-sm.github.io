/* ==========================================================================
   departures-panel.js — PREP, WHAT THE TRIPS STILL NEED
   --------------------------------------------------------------------------
   The board's Prep list, in the pane to-do-list.js shows and hides: the
   legs leaving on the days to prep for, and what each still needs.

   A day to prep for holds every leg leaving on it. That is tomorrow, and on a
   Friday the weekend and Monday with it, since nobody is in to prep until
   Monday. Each leg is a tile that opens: Design's tile around an item of its
   accordion. Closed, as every leg is until it is pressed, it is its place,
   how many lines it has left or Ready, and a quiet line of its customer.
   Open, one at a time, it holds the leg's page as departures.js
   gives it: the trip's lines, then a block for each bus with its crew. A trip
   whose own lines are all done folds them into one line, Trip ready, which a
   press unfolds.

   One day shows under no heading of its own, since the day above the list
   names it; the weekend's three days each take one. A day with nothing
   leaving says so in a tile where its legs would be. What a trip leaving on
   another day still needs is on its card and the Trips page, not here. The
   arrows and the calendar go to any one day, which then shows alone.

   Every line of a leg is one line: a mark, a short name, then the word or
   two departures.js gives it, with the day it was done, or when it was done
   and whose face did it, or the word for doing it, which is a link to the place it is
   done, all of them on the board: that driver's form, or the itinerary the
   customer sent, in the document panel beside the week, the trip's Contact
   list, or its Billing tab. A step is marked where it is done. One done some
   other way, as the driver details read out to a customer with no email are,
   is marked by hand here: the mark of a step still to do is a button, which
   asks in the line and writes on a yes.

   The days' trips are read fresh when the list opens, when the day changes
   and when a step, a seat or a trip changes, on the `scheduler-departures`
   channel. The count on the Prep button is the legs not ready on the days to
   prep for, said in `scheduler:departures-summary`.

   Needs billing.js, follow-up.js, checklist.js, requirements.js,
   leg-facts.js and departures.js loaded first, and /account.js.
   ========================================================================== */
(() => {
  'use strict';

  const account = window.Rux?.account;
  const client = account?.client;
  const Departures = window.SchedulerDepartures;
  const Facts = window.SchedulerLegFacts;
  const panel = document.getElementById('scheduler-to-do-panel');
  if (!client || !Departures || !Facts || !panel) return;

  // -- small things ---------------------------------------------------------
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const svgUse = (href, size = 16) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    for (const [k, v] of [['width', size], ['height', size], ['viewBox', '0 0 32 32'], ['fill', 'currentColor'], ['aria-hidden', 'true']]) svg.setAttribute(k, v);
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', href);
    svg.appendChild(use);
    return svg;
  };
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parseISO = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
  const dayFrom = (n, from = new Date()) => { const d = new Date(from); d.setDate(d.getDate() + n); return iso(d); };
  const longDay = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
  // "7:08a", the board's short clock, from a time of day or a moment.
  const clock = (h, m) => `${h % 12 || 12}:${String(m).padStart(2, '0')}${h < 12 ? 'a' : 'p'}`;
  // When a step was done: "Wed 8:15a", or "Today 8:15a".
  const whenWords = at => {
    const d = new Date(at);
    if (Number.isNaN(d.getTime())) return '';
    return `${iso(d) === iso(new Date()) ? 'Today' : weekday.format(d)} ${clock(d.getHours(), d.getMinutes())}`;
  };
  // The day alone, after a line's word: "today", "Wed" within the week, else "9/28".
  const shortDay = at => {
    const d = new Date(at);
    if (Number.isNaN(d.getTime())) return '';
    const ago = Math.round((parseISO(iso(new Date())) - parseISO(iso(d))) / 86_400_000);
    return ago === 0 ? 'today' : ago > 0 && ago < 7 ? weekday.format(d) : `${d.getMonth() + 1}/${d.getDate()}`;
  };
  const dayWords = day => `${day === dayFrom(1) ? 'Tomorrow · ' : day === dayFrom(0) ? 'Today · ' : ''}${longDay.format(parseISO(day))}`;
  const unwrap = r => { if (r.error) throw new Error(r.error.message); return r.data ?? []; };
  // The dot between the parts of a line, tied to the word before it, so a wrapped line never starts with one.
  const DOT = '\u00A0· ';
  const placeName = dest => String(dest || '').replace(/,?\s+TX\s*$/i, '') || 'Trip';

  // -- what is known --------------------------------------------------------
  // The days to prep for today, as departures.js gives them.
  const prepDays = () => Departures.prepDays(dayFrom(0));
  const prepping = () => days.join() === prepDays().join();
  let days = prepDays();    // the days listed: the days to prep for, or the one day stepped or picked to
  let pages = [];           // the days' legs, as departures.js's pages
  let buses = new Map();    // id -> bus, with its number
  let staff = new Map();    // profile id -> profile, for a step's face
  let openKey = null;       // the open leg's key, `tripId:leg`, or none
  const unfolded = new Set(); // the legs whose finished trip lines are shown
  const steps = new Map();    // the steps drawn that can be marked by hand, by their line's id
  let asking = null;          // the step whose line asks whether to mark it done, by that id
  let failure = '';
  let shown = false;
  let reading = false;        // whether the days' legs are being read, for the word an empty day says
  let ahead = { legs: 0, ready: 0, known: false };   // the count for the days to prep for

  // -- reading --------------------------------------------------------------
  const STEPS = ['envelope_printed', 'trip_reminder_sent', 'itinerary_printed', 'hos_form_printed', 'driver_forms_printed'];
  const COLUMNS = ['id', 'trip_ref', 'destination', 'customer', 'customer_id', 'start_date', 'end_date', 'return_start_date', 'return_end_date',
    'trip_type', 'confirmed', 'trip_bar_color', 'cancelled_at', 'created_at', 'bus_count', 'return_bus_count', 'po_ref',
    // A quote marked sent, which ends a placeholder and is the day the customer was last told.
    'quote_sent_price', 'quote_sent_on',
    // The money, as follow-up.js reads it, for what the customer still owes.
    'quoted_price', 'contract_status', 'po_received', 'po_amount', 'deposit_amount', 'date_paid', 'balance_paid',
    'trip_payments(amount,date)', 'trip_pos(amount)', 'trip_updates(created_at,kind)',
    'itinerary_not_needed', 'contact_not_needed',
    'trip_reqs', 'req_sleeper', 'req_ada', 'req_56pax', 'need_hotel', 'need_fuel_card', 'vehicle_type',
    'hotel_booked_outbound', 'hotel_booked_return', 'hotel_itinerary_number_outbound', 'hotel_itinerary_number_return',
    'booking_contact_name', 'contacts:booking_contact_id(id,name,phone,email)',
    ...[1, 2, 3, 4, 5].flatMap(n => [`trip_contact_${n}_name`, `c${n}:trip_contact_${n}_id(id,name,phone)`]),
    'trip_prep(driver_info_sent,driver_info_sent_at,driver_info_sent_by)',
    `trip_assignments(id,bus_id,position,leg,active_roles,needs,vehicle_type,fuel_card_number,trip_drivers(id,driver_id,role,report_time,instructions,${STEPS.flatMap(s => [s, `${s}_at`, `${s}_by`]).join(',')}))`,
    // What a driver's job reads as, for a change they have not been told of.
    'spot_time', 'trip_documents(id,label,created_at,file_path)',
    'trip_stops(position,leg,type,label,name,address,arrive,spot,depart_prev,arrive_date,spot_date,depart_prev_date)'].join(',');

  // The buses, the drivers, the office's lists and the staff, read once a page.
  let basics = null;
  const readBasics = () => (basics ??= (async () => {
    const [busRows, driverRows, settings, profiles] = await Promise.all([
      client.from('buses').select('id,number,capacity,type,ada_lift,sleeper,equipment').then(unwrap),
      // The status and the card dates, for what stands in a driver's way.
      client.from('drivers').select('id,name,short_name,employment_type,status,license_exp,med_card_expiry').then(unwrap),
      client.from('settings').select('key,value').in('key', ['requirements-v1', 'follow-up-v1', 'billing-workflow-v1']).then(unwrap),
      client.from('profiles').select('id,display_name,photo_path,avatar_color').then(unwrap),
    ]);
    const setting = new Map(settings.map(s => [s.key, s.value]));
    Facts.setRequirementList(setting.get('requirements-v1'));
    // The driver forms customers ask for; a refused read asks for none.
    await Facts.readDriverForms(client).catch(() => false);
    window.SchedulerFollowUp.set(setting.get('follow-up-v1'));
    window.SchedulerBilling.setWorkflow(setting.get('billing-workflow-v1'));
    buses = new Map(busRows.map(b => [b.id, b]));
    staff = new Map(profiles.map(p => [p.id, p]));
    return { busesById: buses, driversById: new Map(driverRows.map(d => [d.id, d])) };
  })().catch(e => { basics = null; throw e; }));

  // One day's legs as pages, soonest first.
  async function readDay(which) {
    const read = await readBasics();
    const trips = await client.from('trips').select(COLUMNS).is('cancelled_at', null)
      .or(`start_date.eq.${which},return_start_date.eq.${which},end_date.eq.${which}`).order('start_date').then(unwrap);
    const legs = Departures.legsOn(trips, which);
    const ids = [...new Set(legs.map(l => l.trip.id))];
    // The trips, time off and days out around the day, for what stands in each leg's way.
    const [statusRows, nearby] = await Promise.all([
      ids.length ? client.rpc('get_trip_driver_statuses', { p_trip_ids: ids }).then(unwrap) : [],
      legs.length && window.SchedulerClashes ? window.SchedulerClashes.readNearby(client, which, lastOf(legs, which)) : null,
    ]);
    const statuses = new Map(statusRows.map(r => [Facts.statusKey(r.tripId, r.driverId, r.leg, r.role), r]));
    return legs.map(l => Departures.page(l.trip, l.leg, { ...read, statuses, nearby }))
      .sort((a, b) => soonest(a).localeCompare(soonest(b)));
  }

  // The last day any of a day's legs takes, so what is read around them reaches its end.
  const lastOf = (legs, which) => legs.reduce((last, l) => {
    const to = window.SchedulerWeek?.legsOf(l.trip).find(x => x.leg === l.leg)?.to;
    return to && to > last ? to : last;
  }, which);

  // Several days' legs, one day after another.
  const readDays = async which => (await Promise.all(which.map(readDay))).flat();
  const countOf = rows => ({ legs: rows.length, ready: rows.filter(p => p.left === 0).length });

  /* When a leg's bus is spotted, or else its first time, which orders the
     day's legs: the time as "HH:MM", and the day it falls on, which is the
     leg's own where the row keeps none. */
  function leavesAt(page) {
    const stops = (page.trip.trip_stops || []).filter(s => (s.leg || 'outbound') === page.leg)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    for (const s of stops) {
      for (const key of ['spot', 'arrive', 'depart_prev']) {
        if (s[key]) return { time: String(s[key]).slice(0, 5), day: s[`${key}_date`] || page.day };
      }
    }
    return null;
  }
  // A leg's place in its day: the day and time above, and last with neither.
  const soonest = page => { const at = leavesAt(page); return at ? `${at.day} ${at.time}` : '9'; };

  let loading = null;
  let again = false;
  async function load() {
    if (loading) { again = true; return loading; }
    loading = (async () => {
      reading = true;
      try {
        pages = await readDays(days);
        failure = '';
      } catch (e) {
        failure = `Prep did not load. ${e?.message || e}`;
      }
      reading = false;
      if (prepping()) said(countOf(pages));
      draw();
    })();
    await loading;
    loading = null;
    if (again) { again = false; return load(); }
  }
  // The count alone for the days to prep for, for the button while the list is shut or on another day.
  async function count() {
    try {
      said(countOf(await readDays(prepDays())));
    } catch { /* the button keeps what it last said */ }
  }
  function said(now) {
    ahead = { ...now, known: true };
    document.dispatchEvent(new CustomEvent('scheduler:departures-summary'));
  }
  let soon = null;
  const refresh = () => {
    clearTimeout(soon);
    soon = setTimeout(() => { if (shown) load(); if (!shown || !prepping()) count(); }, 1500);
  };

  // -- the frame ------------------------------------------------------------
  const ghost = (href, label) => {
    const b = el('button', 'rux--btn rux--btn--ghost rux--btn--md rux--layout--size-md rux--btn--icon-only');
    b.type = 'button';
    b.setAttribute('aria-label', label);
    b.title = label;
    b.appendChild(svgUse(href));
    return b;
  };
  const body = el('div', 'rux--layer-two rux--stack-vertical rux--stack-scale-5 scheduler-departures');
  body.hidden = true;
  const head = el('div', 'scheduler-departures__head');
  const stepper = el('div', 'scheduler-departures__stepper');
  const before = ghost('#m-arrow_back', 'The day before');
  const after = ghost('#m-arrow_forward', 'The day after');
  const dayButton = el('button', 'rux--btn rux--btn--ghost rux--btn--md rux--layout--size-md scheduler-departures__date');
  dayButton.type = 'button';
  // The browser's own calendar, opened from the day; it takes no room of its own.
  const dayInput = el('input', 'scheduler-departures__picker');
  dayInput.type = 'date';
  dayInput.tabIndex = -1;
  dayInput.setAttribute('aria-hidden', 'true');
  stepper.append(before, dayButton, dayInput, after);
  const error = el('p', 'scheduler-to-do__error');
  error.setAttribute('role', 'alert');
  const list = el('div', 'scheduler-departures__list');
  head.append(stepper);
  body.append(head, error, list);
  panel.appendChild(body);

  // -- drawing --------------------------------------------------------------
  const MARKS = { done: '#m-check_circle-fill', todo: '#m-close', warn: '#m-warning-fill' };
  const SAID = { done: 'Done', todo: 'To do', warn: 'Needs attention' };
  const keyOf = page => `${page.trip.id}:${page.leg}`;
  // The link names the page's leg, so the board opens that leg's bar and no other.
  const tripHref = (page, extra = '') => `./?trip=${encodeURIComponent(page.trip.id)}&date=${encodeURIComponent(page.day || '')}&leg=${encodeURIComponent(page.leg || 'outbound')}${extra}`;
  const FORMS = { itinerary: { form: 'driver-itinerary', layout: 'simple' }, envelope: { form: 'envelope' }, hos: { form: 'hours-of-service' } };
  const hasItinerary = trip => (trip.trip_documents || []).some(d => String(d.label || '').toLowerCase() === 'itinerary');
  /* Where a line still to do is done, and the word for doing it: the board's
     address, asking for the trip and what to open on it. A form is asked for
     with its bus and its seat, and is printed from the board's document
     panel. The itinerary is the file the customer sent where the trip has
     one, since that is the sheet the driver is handed, and the one this app
     draws where it has none. No link has a handler here: to-do-list.js
     offers a pressed one to the board, which opens it in place. */
  function actionOf(line, page, bus, member) {
    const [where, form] = String(line.action || '').split(':');
    if (where === 'forms' && bus && member?.seat) {
      const what = form === 'itinerary' && hasItinerary(page.trip) ? { file: 'itinerary' } : FORMS[form];
      const asks = new URLSearchParams({ ...what, assignment: bus.assign.id, driver: member.seat.id });
      return { words: 'Print', href: tripHref(page, `&${asks}`) };
    }
    // A driver's forms are files, opened from the trip's Forms list.
    if (where === 'trip-forms') return { words: 'Print', href: tripHref(page, '&tab=forms') };
    if (where === 'contacts') return { words: line.key === 'reminder' ? 'Remind' : 'Send', href: tripHref(page, '&open=contacts') };
    if (where === 'billing') return { words: 'Open', href: tripHref(page, '&tab=billing') };
    return null;
  }

  function lineRow(line, page, bus, member) {
    const row = el('li', `scheduler-departures__line scheduler-departures__line--${line.state}`);
    const mark = svgUse(MARKS[line.state], 18);
    mark.classList.add('scheduler-departures__mark');
    const label = el('span', 'scheduler-departures__what', line.label);
    label.prepend(el('span', 'rux--visually-hidden', `${SAID[line.state]}: `));
    const of = `${line.label}${member?.name ? `, ${member.name}` : ''}`;
    /* A step still to do, where its seat or its trip can keep it, has a
       button for its mark, showing the tick it would get under the pointer.
       Pressed, the line asks under its words. */
    const id = line.state === 'todo' && line.mark && (!member || member.seat?.id) ? `${keyOf(page)}|${member?.key ?? ''}|${line.key}` : null;
    if (id) {
      steps.set(id, { line, page, member });
      const tick = el('button', 'scheduler-departures__tick');
      tick.type = 'button';
      tick.dataset.step = id;
      tick.dataset.hold = `tick:${id}`;
      tick.title = 'Mark as done';
      tick.setAttribute('aria-label', `Mark as done: ${of}`);
      const hint = svgUse('#m-check_circle', 18);
      hint.classList.add('scheduler-departures__hint');
      tick.append(mark, hint);
      row.append(tick, label);
    } else row.append(mark, label);
    const act = line.state === 'todo' ? actionOf(line, page, bus, member) : null;
    if (act) {
      const a = el('a', 'rux--link', act.words);
      a.href = act.href;
      a.setAttribute('aria-label', `${act.words}: ${of}`);
      row.appendChild(a);
    } else {
      /* The line's word at its end, with the day where it was done, as
         Received Thu; a step with no word says when. Whatever the end cuts
         short, its title gives whole. */
      const when = line.state === 'done' && line.at ? whenWords(line.at) : null;
      const right = line.value ? [line.value, line.at ? shortDay(line.at) : null].filter(Boolean).join(' ') : when;
      if (right) {
        const end = el('span', 'scheduler-departures__when', right);
        end.title = [line.value, when].filter(Boolean).join(DOT);
        row.appendChild(end);
      }
      const who = line.state === 'done' ? staff.get(line.by) : null;
      if (who) {
        const f = el('span', 'rux--user-avatar rux--user-avatar--sm scheduler-departures__face');
        account.drawAvatar?.(f, { id: who.id, name: who.display_name, photoPath: who.photo_path, colour: who.avatar_color }, 'sm');
        f.title = who.display_name || '';
        f.setAttribute('role', 'img');
        f.setAttribute('aria-label', `by ${who.display_name || 'someone'}`);
        row.appendChild(f);
      }
    }
    if (id && id === asking) {
      row.classList.add('scheduler-departures__line--asking');
      const ask = el('span', 'scheduler-departures__ask');
      const no = el('button', 'rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm', 'No');
      no.type = 'button';
      no.dataset.answer = 'no';
      const yes = el('button', 'rux--btn rux--btn--primary rux--btn--sm rux--layout--size-sm', 'Yes');
      yes.type = 'button';
      yes.dataset.answer = 'yes';
      yes.dataset.hold = `yes:${id}`;
      ask.append(el('span', null, 'Mark as done?'), no, yes);
      row.appendChild(ask);
    }
    return row;
  }
  const lines = (list, page, bus, member) => {
    const ul = el('ul', 'scheduler-departures__lines');
    ul.setAttribute('role', 'list');
    for (const l of list) ul.appendChild(lineRow(l, page, bus, member));
    return ul;
  };
  const tag = (words, kind) => {
    const t = el('span', `rux--tag ${kind} rux--tag--sm rux--layout--size-sm scheduler-departures__tag`);
    t.appendChild(el('span', 'rux--tag__label', words));
    return t;
  };
  const leftTag = n => (n ? tag(`${n} left`, 'rux--tag--gray') : tag('Ready', 'rux--tag--green'));

  /* The trip's own lines, under a row that opens the trip on the board.
     While one is not done they are all in view; once every one is done they
     fold into one line, Trip ready, which a press unfolds. */
  function tripBlock(page) {
    const block = el('section', 'scheduler-departures__block');
    const top = el('div', 'scheduler-departures__top');
    const all = lines(page.lines, page);
    if (page.tripLeft) top.appendChild(el('strong', null, 'Trip'));
    else {
      const open = unfolded.has(keyOf(page));
      const fold = el('button', 'scheduler-departures__fold');
      fold.type = 'button';
      fold.dataset.hold = `fold:${keyOf(page)}`;
      fold.setAttribute('aria-expanded', String(open));
      const mark = svgUse(MARKS.done, 18);
      mark.classList.add('scheduler-departures__mark');
      const arrow = svgUse('#m-keyboard_arrow_down');
      arrow.classList.add('scheduler-departures__arrow');
      fold.append(mark, 'Trip ready', arrow);
      all.hidden = !open;
      top.appendChild(fold);
    }
    const trip = el('a', 'rux--link', 'Open trip');
    trip.href = tripHref(page);
    trip.setAttribute('aria-label', `Open trip: ${page.trip.destination || 'Trip'}`);
    top.appendChild(trip);
    block.append(top, all);
    return block;
  }

  function busBlock(page, bus) {
    const block = el('section', 'scheduler-departures__block');
    const top = el('div', 'scheduler-departures__top');
    const name = el('div', 'scheduler-departures__bus');
    const icon = svgUse('#m-directions_bus-fill', 20);
    const row = bus.bus ? buses.get(bus.bus.id) ?? bus.bus : null;
    name.append(icon, el('strong', null, row ? String(row.number ?? 'Bus') : 'No bus yet'));
    // The first driver's seat, whose envelope a missing fuel card is typed on.
    const lead = bus.crew.find(m => m.seat && (m.seat.role || 'driver') === 'driver');
    for (const n of bus.needs) {
      const t = tag(n.label, n.met ? 'rux--tag--green' : 'rux--tag--red');
      t.prepend(svgUse(n.met ? '#m-check' : '#m-warning-fill'));
      t.setAttribute('aria-label', `${n.label}: ${n.met ? 'this bus has it' : 'this bus lacks it'}`);
      const act = !n.met && n.action ? actionOf({ action: n.action, key: n.id }, page, bus, lead) : null;
      if (act) {
        const a = el('a', 'scheduler-departures__need');
        a.href = act.href;
        a.setAttribute('aria-label', `${n.label}: type its number on ${lead.name}'s envelope`);
        a.appendChild(t);
        name.appendChild(a);
      } else name.appendChild(t);
    }
    top.appendChild(name);
    // A leg with one bus says what is left on its own heading.
    if (page.buses.length + page.missing > 1) top.appendChild(leftTag(bus.left));
    block.appendChild(top);
    /* A crew member's name row carries whether they confirmed the trip: the
       mark before the name, as a line's is before its words, and when they
       confirmed, or their status, at its end. The steps follow as lines. */
    for (const member of bus.crew) {
      const who = el('div', 'scheduler-departures__member');
      const [confirm, ...steps] = member.lines[0]?.key === 'confirmed' ? member.lines : [null, ...member.lines];
      const headline = el('div', `scheduler-departures__who${confirm ? ` scheduler-departures__who--${confirm.state}` : ''}`);
      if (confirm) {
        const mark = svgUse(MARKS[confirm.state], 18);
        mark.classList.add('scheduler-departures__mark');
        headline.append(mark, el('span', 'rux--visually-hidden', `${confirm.state === 'done' ? 'Confirmed' : confirm.label}: `));
      }
      headline.appendChild(el('strong', null, member.name || member.role));
      if (member.name) headline.appendChild(el('span', 'scheduler-departures__role', member.role));
      if (member.partTime) headline.appendChild(tag('Part-time', 'rux--tag--purple'));
      if (confirm) {
        const when = confirm.state === 'done' && confirm.at ? whenWords(confirm.at) : null;
        const end = el('span', 'scheduler-departures__when', confirm.state === 'done' ? when || 'Confirmed' : confirm.label);
        end.title = confirm.state === 'done' ? ['Confirmed', when].filter(Boolean).join(' ') : confirm.label;
        headline.appendChild(end);
      }
      who.append(headline, lines(steps, page, bus, member));
      block.appendChild(who);
    }
    return block;
  }

  // A bus the leg needs and has no row for.
  function missingBlock(page) {
    const block = el('section', 'scheduler-departures__block');
    const top = el('div', 'scheduler-departures__top');
    const name = el('div', 'scheduler-departures__bus');
    name.append(svgUse('#m-directions_bus-fill', 20),
      el('strong', null, page.missing === 1 ? 'One more bus needed' : `${page.missing} more buses needed`));
    top.append(name, tag(`${page.missing} left`, 'rux--tag--gray'));
    block.appendChild(top);
    return block;
  }

  /* A leg, as one of Design's tiles around an item of its accordion, whose
     script opens and shuts it. The heading is the closed leg: its place and
     what is left, and under them its customer, and on a split trip which
     leg; the spot time is the open leg's, on its lines. */
  function legItem(page) {
    const key = keyOf(page);
    const open = key === openKey;
    const li = el('li', `rux--accordion__item scheduler-departures__leg${open ? ' rux--accordion__item--active' : ''}`);
    li.dataset.key = key;
    const heading = el('button', 'rux--accordion__heading');
    heading.type = 'button';
    heading.dataset.hold = `leg:${key}`;
    heading.setAttribute('aria-expanded', String(open));
    const arrow = svgUse('#m-keyboard_arrow_right');
    arrow.classList.add('rux--accordion__arrow');
    const title = el('div', 'rux--accordion__title');
    const summary = el('span', 'scheduler-departures__summary');
    const place = el('span', 'scheduler-departures__place');
    place.appendChild(el('strong', null, placeName(page.trip.destination)));
    summary.append(place, leftTag(page.left));
    title.appendChild(summary);
    // Always a line, so the arrow at its end never meets what is left.
    const quiet = [page.trip.customer || 'No customer', page.legName].filter(Boolean).join(DOT);
    title.appendChild(el('span', 'scheduler-to-do__meta scheduler-to-do__line', quiet));
    heading.append(arrow, title);

    const wrapper = el('div', 'rux--accordion__wrapper');
    const content = el('div', 'rux--accordion__content scheduler-departures__page');
    content.id = `scheduler-departures-leg-${key.replace(':', '-')}`;
    heading.setAttribute('aria-controls', content.id);
    content.append(tripBlock(page), ...page.buses.map(b => busBlock(page, b)));
    if (page.missing) content.appendChild(missingBlock(page));
    wrapper.appendChild(content);
    li.append(heading, wrapper);
    const rows = el('ul', 'rux--accordion rux--accordion--end');
    rows.appendChild(li);
    const tile = el('li', 'rux--tile scheduler-to-do__tile');
    tile.appendChild(rows);
    return tile;
  }

  // One day's legs as a list of tiles.
  const legList = rows => {
    const ul = el('ul', 'scheduler-to-do__rows scheduler-to-do__tiles');
    ul.setAttribute('role', 'list');
    for (const page of rows) ul.appendChild(legItem(page));
    return ul;
  };
  const focusHeld = hold => [...list.querySelectorAll('[data-hold]')].find(n => n.dataset.hold === hold)?.focus();

  // A day with nothing leaving: a tile saying so, where its legs would be.
  const none = words => el('p', 'rux--tile scheduler-to-do__none', words);
  const nothing = (d, alone) => none(reading ? 'Loading…'
    : !alone ? 'No trips leaving.' : d === dayFrom(1) ? 'No trips leaving tomorrow.' : 'No trips leaving that day.');

  function draw() {
    dayButton.textContent = days.length > 1 ? `${longDay.format(parseISO(days[0]))} – ${longDay.format(parseISO(days.at(-1)))}` : dayWords(days[0]);
    dayInput.value = days[0];
    const wrong = failure;
    error.textContent = wrong;
    error.hidden = !wrong;
    // The list is built again, so a heading that had the focus is given it back.
    const held = list.contains(document.activeElement) ? document.activeElement.dataset?.hold : null;
    steps.clear();
    if (days.length === 1) {
      // One day, the one the day above names: its legs, with no heading over them.
      list.replaceChildren(pages.length ? legList(pages) : failure ? '' : nothing(days[0], true));
    } else {
      /* The weekend's days, each under its heading and there whatever leaves
         on it, since on a Friday nothing leaving is an answer about the
         weekend. */
      list.replaceChildren(...days.flatMap(d => {
        const legs = pages.filter(p => p.day === d);
        return [el('h3', 'scheduler-to-do__group', dayWords(d)), legs.length ? legList(legs) : nothing(d, false)];
      }));
    }
    if (asking && !steps.has(asking)) asking = null;
    if (held) focusHeld(held);
  }

  // -- behaviour ------------------------------------------------------------
  // to-do-list.js opens the list when its button is pressed, on the days to prep for, and shuts it.
  function open() {
    shown = true;
    days = prepDays();
    openKey = null;
    unfolded.clear();
    asking = null;
    body.hidden = false;
    draw();
    load();
  }
  function close() {
    shown = false;
    body.hidden = true;
  }
  // The arrows step off either end of what is listed, to one day.
  const go = to => { days = [to]; openKey = null; unfolded.clear(); asking = null; pages = []; draw(); load(); };
  before.addEventListener('click', () => go(dayFrom(-1, parseISO(days[0]))));
  after.addEventListener('click', () => go(dayFrom(1, parseISO(days.at(-1)))));
  dayButton.addEventListener('click', () => { try { dayInput.showPicker(); } catch { dayInput.focus(); } });
  dayInput.addEventListener('change', () => { if (/^\d{4}-\d{2}-\d{2}$/.test(dayInput.value)) go(dayInput.value); });
  /* One leg open at a time, as a task's row is: Design's accordion
     leaves every opened item open, so opening one shuts the rest, and the
     open leg is remembered, as a redraw builds the list again. The leg shut
     above takes its height away, so the pressed heading is brought back
     into view once it has gone. */
  list.addEventListener('rux:accordion-opened', e => {
    const item = e.target;
    openKey = item.dataset?.key ?? null;
    for (const other of list.querySelectorAll('.rux--accordion__item--active')) {
      if (other !== item) window.Rux.accordion?.close(other);
    }
    setTimeout(() => item.querySelector('.rux--accordion__heading')?.scrollIntoView({ block: 'nearest' }), 150);
  });
  list.addEventListener('rux:accordion-closed', e => { if (e.target.dataset?.key === openKey) openKey = null; });
  /* A step marked done by hand. Its mark asks in the line; Yes writes what
     the place the step is done writes, on the driver's seat or on the trip's
     prep row, and the database keeps when and whose it was. No, and Escape,
     write nothing. */
  async function markDone(id) {
    const step = steps.get(id);
    if (!step) return;
    const { line, page, member } = step;
    let refused = null;
    try {
      ({ error: refused } = member
        ? await client.from('trip_drivers').update({ [line.mark]: true }).eq('id', member.seat.id)
        : await client.from('trip_prep').upsert({ trip_id: page.trip.id, [line.mark]: true }, { onConflict: 'trip_id' }));
    } catch (e) { refused = e; }
    asking = null;
    if (refused) { failure = `${line.label} was not marked. ${refused.message || refused}`; draw(); return; }
    await load();
  }
  const unask = () => { const id = asking; asking = null; draw(); focusHeld(`tick:${id}`); };
  list.addEventListener('click', e => {
    const tick = e.target.closest('.scheduler-departures__tick');
    if (tick) { asking = tick.dataset.step; draw(); focusHeld(`yes:${asking}`); return; }
    const answer = e.target.closest('[data-answer]');
    if (!answer || !asking) return;
    if (answer.dataset.answer !== 'yes') { unask(); return; }
    for (const b of answer.parentElement.querySelectorAll('button')) b.disabled = true;
    markDone(asking);
  });
  list.addEventListener('keydown', e => { if (e.key === 'Escape' && asking) { e.stopPropagation(); unask(); } });
  // Trip ready shows and hides the trip's lines under it.
  list.addEventListener('click', e => {
    const fold = e.target.closest('.scheduler-departures__fold');
    const key = fold?.closest('[data-key]')?.dataset.key;
    if (!key) return;
    const open = !unfolded.has(key);
    if (open) unfolded.add(key); else unfolded.delete(key);
    fold.setAttribute('aria-expanded', String(open));
    fold.closest('.scheduler-departures__block').querySelector('.scheduler-departures__lines').hidden = !open;
  });

  let channel = null;
  function listen() {
    channel = client.channel('scheduler-departures');
    for (const table of ['trip_drivers', 'trip_prep', 'trip_assignments', 'trips', 'trip_documents', 'trip_stops', 'trip_payments', 'trip_driver_statuses']) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, refresh);
    }
    channel.subscribe();
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !channel) return;
    if (channel.state !== 'joined' && channel.state !== 'joining') { client.removeChannel(channel); listen(); }
    refresh();
  });

  (async () => {
    const me = await account.person().catch(() => null);
    if (!me?.staff) return;
    await count();
    listen();
  })();

  /* The count, and `due` for the Prep button: the legs not ready on the days
     to prep for. */
  window.SchedulerDeparturesPanel = { open, close, summary: () => ({ ...ahead, due: ahead.known ? ahead.legs - ahead.ready : 0 }) };
})();
