/* THE FORMS THIS APP FILLS IN. One page renders every one of them, named by
   `?form=`; with no form named it is the hub, a tile per form.

   A FORM IS A REGISTRY ENTRY, and FORMS below is the one source for the hub,
   the ?form= values and, later, the board's menu -- the way SHORTCUT_ACTIONS
   in data.js already feeds both the shortcut bar and the right-click menu.
   An entry says what it binds to, what a print marks, and how it draws:

     id       the ?form= value, and the class prefix its markup uses
     name     what the hub and the viewer's head call it
     binds    'assignment' | 'assignment+seat' | 'trip' | 'week' | null
     marks    the column a print sets, or null
     page     the one paper it is printed on, or left out to fit any paper
     copies   the subjects one Print all covers, given what it is bound to
     render   (subject) -> an element

   A FORM COMPUTES NOTHING. Every number arrives worked out: a quote's from
   quote.js, which holds the office spreadsheet's formulas, and a leg's miles
   and hours from the Route tab. A second implementation of the same
   arithmetic is a second answer waiting to disagree with the screen.

   AND IT PRINTS WITH NO BACKGROUND FILLS. Chrome leaves Background graphics
   off and nobody ticks it, so every division on paper is a rule or a border.
   print.css says the same thing from its side. */
(() => {
  'use strict';

  // Carbon's select draws its own arrow from the page's sprite.
  const arrow = () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'rux--select__arrow');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#i-chevron--down');
    svg.appendChild(use);
    return svg;
  };

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  /* mm/dd/yyyy, split rather than passed to `new Date()`, which reads a bare
     date as UTC midnight and prints the day before west of Greenwich. Same
     rule as data.js's `mdy`. */
  const mdy = d => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || '').trim());
    return m ? `${m[2]}/${m[3]}/${m[1]}` : (d || '');
  };

  const weekdayOf = d => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || '').trim());
    if (!m) return '';
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
      .toLocaleDateString('en-US', { weekday: 'long' });
  };

  // "9:15 AM". The envelope is read at arm's length in a bus, so it takes the
  // long form where the board takes "9:15a".
  const clock = t => {
    if (!t) return '';
    const [h, m] = String(t).split(':');
    const hr = Number(h);
    if (!Number.isFinite(hr) || m === undefined) return String(t).slice(0, 5);
    return `${hr % 12 || 12}:${m} ${hr < 12 ? 'AM' : 'PM'}`;
  };

  /* ── The envelope ─────────────────────────────────────────────────────── */

  const ROLE_NAMES = {
    'driver': 'Driver',
    'co-driver': 'Co-driver',
    'relief-start': 'Relief driver',
    'relief-end': 'Relief driver',
  };
  const roleName = role => ROLE_NAMES[role] || 'Driver';
  const isRelief = role => role === 'relief-start' || role === 'relief-end';

  // Carbon's own order for a bus's seats, which is the order the board's
  // drivers row and the Fleet tab's tiles already use.
  const SEAT_ORDER = ['driver', 'co-driver', 'relief-start', 'relief-end'];
  const seatsOf = assignment => [...(assignment.trip_drivers || [])]
    .filter(seat => seat.driver_id && nameOf(seat))
    .sort((a, b) => SEAT_ORDER.indexOf(a.role || 'driver') - SEAT_ORDER.indexOf(b.role || 'driver'));

  const nameOf = seat => String(seat?.drivers?.name || seat?.name || '').trim();

  /* The contact the envelope carries is the trip's day-of contact, first
     filled of the five. The booking contact is the office's and is used only
     where no day-of contact is set, because this sheet travels with the
     driver. */
  function contactOf(trip) {
    for (let n = 1; n <= 5; n++) {
      const name = trip[`trip_contact_${n}_name`] || trip[`c${n}`]?.name;
      const phone = trip[`trip_contact_${n}_phone`] || trip[`c${n}`]?.phone;
      if (name || phone) return { name: name || '', phone: phone || '' };
    }
    return {
      name: trip.booking_contact_name || trip.contacts?.name || '',
      phone: trip.booking_contact_phone || trip.contacts?.phone || '',
    };
  }

  /* What the trip needs, from `trip_reqs` where it is set and the older
     booleans where it is not, which is the pair rux-ui reads. A fuel card
     prints a rule for its number, because the office writes that in. */
  const NEEDS = {
    pax56: { label: '56 passengers' },
    sleeper: { label: 'Sleeper' },
    adaLift: { label: 'Wheelchair lift' },
    fuelCard: { label: 'Fuel card', fill: true },
    hotel: { label: 'Hotel' },
  };
  const NEED_ORDER = ['pax56', 'sleeper', 'adaLift', 'fuelCard', 'hotel'];

  function needsOf(trip) {
    const reqs = trip.trip_reqs;
    const on = reqs && typeof reqs === 'object' && Object.keys(reqs).length
      ? new Set(Object.entries(reqs).filter(([, v]) => v).map(([k]) => k))
      : new Set([
          ['pax56', trip.req_56pax], ['sleeper', trip.req_sleeper],
          ['adaLift', trip.req_ada], ['fuelCard', trip.need_fuel_card],
          ['hotel', trip.need_hotel],
        ].filter(([, v]) => v).map(([k]) => k));
    const list = NEED_ORDER.filter(id => on.has(id)).map(id => ({ id, ...NEEDS[id] }));
    if (trip.trip_type && trip.trip_type !== 'round_trip') {
      list.push({ id: 'oneWay', label: 'One way' });
    }
    return list;
  }

  // The leg's pickup, where the Route tab keeps the address and the spot time.
  const pickupOf = (trip, leg) => (trip.trip_stops || [])
    .find(s => (s.leg || 'outbound') === leg && s.type === 'pickup') || null;

  const cell = (label, value, blank) => {
    const node = el('div');
    node.appendChild(el('span', 'scheduler-envelope__label', label));
    node.appendChild(blank
      ? el('span', 'scheduler-envelope__blank')
      : el('span', 'scheduler-envelope__value', value || ''));
    return node;
  };

  const row = (...cells) => {
    const node = el('div', 'scheduler-envelope__row');
    node.dataset.cells = String(cells.length);
    for (const c of cells) node.appendChild(c);
    return node;
  };

  function envelopeHead(trip, leg) {
    const head = el('header', 'scheduler-envelope__head');
    const start = leg === 'return'
      ? (trip.return_start_date || trip.end_date)
      : trip.start_date;
    head.appendChild(el('h1', 'scheduler-envelope__day', weekdayOf(start)));
    const logo = el('img', 'scheduler-envelope__logo');
    logo.src = 'brand/logo.png';
    logo.alt = '';
    head.appendChild(logo);
    head.appendChild(el('p', 'scheduler-envelope__line', COMPANY.address));
    head.appendChild(el('p', 'scheduler-envelope__line', COMPANY.phones));
    head.appendChild(el('h2', 'scheduler-envelope__section', 'Trip information'));
    return head;
  }

  /* The company's own line. It is here rather than read from Settings because
     there is no Settings page yet to hold the yard. */
  const COMPANY = {
    address: '2801 Zinnia Avenue, McAllen, Texas 78504',
    phones: '(956) 994-1169 · Fax 994-9491 · Cell 648-9691',
  };

  /* Bus, then the seat this copy is for beside the trip's own driver. A
     relief's copy shows the swap time it reports at, where a driver's shows
     the bus's spot time. */
  function envelopeSchedule(trip, assignment, leg, seat) {
    const frag = document.createDocumentFragment();
    const seats = seatsOf(assignment);
    const driver = seats.find(s => (s.role || 'driver') === 'driver');
    const relief = seats.find(s => isRelief(s.role)) || seats.find(s => s.role === 'co-driver');

    const mine = seat && (seat.role || 'driver') !== 'driver'
      ? { label: `${roleName(seat.role)}:`, name: nameOf(seat) }
      : { label: 'Driver:', name: nameOf(driver) };
    const other = seat && (seat.role || 'driver') !== 'driver'
      ? { label: 'Driver:', name: nameOf(driver) }
      : { label: `${roleName(relief?.role || 'co-driver')}:`, name: nameOf(relief) };

    frag.appendChild(row(
      cell('Bus:', assignment.buses?.number != null ? String(assignment.buses.number) : ''),
      cell(mine.label, mine.name),
      cell(other.label, other.name),
    ));

    const stop = pickupOf(trip, leg);
    const relieving = seat && isRelief(seat.role);
    const start = leg === 'return' ? (trip.return_start_date || trip.end_date) : trip.start_date;
    const end = leg === 'return' ? (trip.return_end_date || trip.end_date) : trip.end_date;
    const multiDay = start && end && start !== end;

    frag.appendChild(row(
      cell('Trip date:', mdy(start)),
      ...(multiDay ? [cell('Return:', mdy(end))] : []),
      relieving
        ? cell('Swap time:', clock(seat.report_time))
        : cell('Spot time:', clock(stop?.spot || trip.spot_time || trip.departure_time)),
    ));

    frag.appendChild(row(cell('Pick up address:', stop?.address || '')));
    return frag;
  }

  /* The lines the driver fills in after the trip: what the ELD and the card
     did, and what the trip cost. Always blank. */
  const TALLY = [
    { label: 'ELD verified', choices: ['DRV', 'OFC'] },
    { label: 'Hotel', money: true },
    { label: 'ELD backup used', choices: ['Yes', 'No'] },
    { label: 'Diesel / DEF', money: true },
    { label: 'Card for trip', choices: ['Yes', 'No'] },
    { label: 'Repairs', money: true },
    { label: 'Card received by', fill: true },
    { label: 'Miscellaneous', money: true },
    { label: 'Total trip miles', fill: true },
    { label: 'Total', money: true },
  ];

  function envelopeTally() {
    const grid = el('div', 'scheduler-envelope__tally');
    for (const line of TALLY) {
      const node = el('div', 'scheduler-envelope__tally-line');
      node.appendChild(el('span', 'scheduler-envelope__tally-label', line.label));
      if (line.choices) {
        for (const choice of line.choices) {
          const opt = el('span', 'scheduler-envelope__choice');
          opt.appendChild(el('span', 'scheduler-envelope__box'));
          opt.appendChild(document.createTextNode(choice));
          node.appendChild(opt);
        }
      } else {
        if (line.money) node.appendChild(el('span', 'scheduler-envelope__tally-label', '$'));
        node.appendChild(el('span', 'scheduler-envelope__tally-fill'));
      }
      grid.appendChild(node);
    }
    return grid;
  }

  function envelopeNotes(trip, seat) {
    const notes = el('div', 'scheduler-envelope__notes');
    notes.appendChild(el('span', 'scheduler-envelope__label', 'Notes'));
    const needs = needsOf(trip);
    const instruction = String(seat?.instructions || '').trim();
    if (!needs.length && !instruction) return notes;

    const list = el('div', 'scheduler-envelope__needs');
    for (const need of needs) {
      const item = el('div', 'scheduler-envelope__need');
      item.appendChild(el('span', 'scheduler-envelope__box'));
      item.appendChild(el('span', null, need.label));
      if (need.fill) item.appendChild(el('span', 'scheduler-envelope__need-fill'));
      list.appendChild(item);
    }
    if (needs.length) notes.appendChild(list);
    // Under the requirements, not among them: the note is written to this one
    // driver, and a line without a box reads as a requirement beside them.
    if (instruction) notes.appendChild(el('p', 'scheduler-envelope__note', instruction));
    return notes;
  }

  // The multi-stop layout's log, in place of the destination line. rux-ui
  // names this layout for the customer who asked for it; it is a shape, not a
  // customer, so it is named for what it does.
  function envelopeLog() {
    const table = el('table', 'scheduler-envelope__log');
    const head = el('thead');
    const headRow = el('tr');
    for (const label of ['Location', 'Time in', 'Time out', 'Odometer']) {
      headRow.appendChild(el('th', null, label));
    }
    head.appendChild(headRow);
    table.appendChild(head);
    const body = el('tbody');
    for (let r = 0; r < 8; r++) {
      const bodyRow = el('tr');
      for (let c = 0; c < 4; c++) bodyRow.appendChild(el('td'));
      body.appendChild(bodyRow);
    }
    table.appendChild(body);
    return table;
  }

  /* One copy. `layout` is 'standard' or 'multi-stop', chosen in the page's own
     toolbar rather than guessed from the trip: which form the office uses is
     an arrangement with the customer, not something the data says. */
  function envelope(subject, layout) {
    const { trip, assignment, leg, seat } = subject;
    const card = el('article', 'scheduler-form scheduler-envelope');
    card.dataset.layout = layout === 'multi-stop' ? 'multi-stop' : 'standard';
    card.appendChild(envelopeHead(trip, leg));
    card.appendChild(envelopeSchedule(trip, assignment, leg, seat));

    if (card.dataset.layout === 'multi-stop') {
      const contact = contactOf(trip);
      card.appendChild(row(
        cell('Contact:', contact.name),
        cell('Phone:', contact.phone),
      ));
      card.appendChild(envelopeLog());
      card.appendChild(envelopeNotes(trip, seat));
      card.appendChild(envelopeTally());
      return card;
    }

    card.appendChild(row(cell('Destination:', trip.destination || '')));
    const contact = contactOf(trip);
    card.appendChild(row(
      cell('Contact:', contact.name),
      cell('Phone:', contact.phone),
    ));
    card.appendChild(row(
      cell('Starting odometer:', '', true),
      cell('Ending odometer:', '', true),
    ));
    card.appendChild(envelopeTally());
    card.appendChild(envelopeNotes(trip, seat));
    return card;
  }

  /* ── The registry ─────────────────────────────────────────────────────── */

  const FORMS = [
    {
      id: 'envelope',
      name: 'Driver envelope',
      blurb: 'What dispatch knows, printed; the day-of fields blank for the driver.',
      binds: 'assignment+seat',
      marks: { table: 'trip_drivers', column: 'envelope_printed', by: 'seat' },
      /* The one form here that names its paper, because it is printed on a
         particular stock rather than on whatever is in the tray. A form that
         leaves this out fits the paper the dialog is set to.

         6 by 9 inches is the envelope itself, the size the office printer
         offers as Trip Envelope. The ink margin is the form's own, because
         the stock's own margins are zero and a laser printer still cannot
         reach its edges. */
      page: { size: '6in 9in', width: '6in', height: '9in', margin: '0.3in' },
      layouts: [
        { id: 'standard', name: 'Standard' },
        { id: 'multi-stop', name: 'Multi-stop' },
      ],
      // Print all covers the bus's whole crew, one sheet each.
      copies: subject => seatsOf(subject.assignment)
        .map(seat => ({ ...subject, seat })),
      copyName: subject => `${nameOf(subject.seat)} — ${roleName(subject.seat?.role)}`,
      render: envelope,
    },
  ];

  window.SchedulerForms = { FORMS, envelope, seatsOf, needsOf, contactOf, roleName };

  /* ── The page ─────────────────────────────────────────────────────────────
     With no ?form= it lists the forms. With one, it reads that form's subject
     by id and draws it.

     IT READS WHAT IT NEEDS, not the board's TRIP_COLUMNS. The board reads a
     week of trips for the grid, the panel and every tab; a form reads one
     subject and the handful of columns it prints. One list serving both would
     grow to the union of the two.

     IT BINDS THE ASSIGNMENT, not the trip: a bar on the board is one bus on
     one leg, and a round trip's legs carry different dates, a different bus
     and a different crew. Reading trip_assignments by id answers all of it in
     one request. */

  /* One bus on one leg with its seats, named once: Print all reads the trip's
     other buses with this same list, and a column left out of one copy of it
     is a seat the form drops without saying so. */
  const BUS_SEATS_QUERY = [
    'id', 'leg', 'position', 'bus_id',
    'buses:bus_id(number)',
    'trip_drivers(id,driver_id,role,report_time,instructions,envelope_printed,drivers:driver_id(name))',
  ].join(',');

  /* Outbound before return, then along the trip: the order the hub lists a
     trip's buses in, and the order Print all stacks their envelopes. */
  const byLegThenPosition = (a, b) => (a.leg === b.leg
    ? (a.position ?? 0) - (b.position ?? 0)
    : a.leg === 'return' ? 1 : -1);

  const ASSIGNMENT_QUERY = BUS_SEATS_QUERY + ',' + [
    'trips:trip_id(' + [
      'id', 'destination', 'trip_type',
      'start_date', 'end_date', 'return_start_date', 'return_end_date',
      'departure_time', 'spot_time',
      'req_sleeper', 'req_ada', 'req_56pax', 'need_hotel', 'need_fuel_card', 'trip_reqs',
      'booking_contact_name', 'booking_contact_phone',
      'trip_contact_1_name', 'trip_contact_1_phone',
      'trip_contact_2_name', 'trip_contact_2_phone',
      'trip_contact_3_name', 'trip_contact_3_phone',
      'trip_contact_4_name', 'trip_contact_4_phone',
      'trip_contact_5_name', 'trip_contact_5_phone',
      'trip_stops(id,leg,type,address,spot)',
    ].join(',') + ')',
  ].join(',');

  const params = new URLSearchParams(location.search);
  const formOf = id => FORMS.find(f => f.id === id) || null;

  /* Framed in the board's viewer, or standing on its own. The sheet is the
     same either way; only the shell around it differs, so the page says which
     it is once and the stylesheet answers. */
  const framed = window.self !== window.top;
  if (!framed) {
    document.documentElement.setAttribute('data-rux-standalone', '');
    document.getElementById('scheduler-print-shell').hidden = false;
  }

  const bar = document.getElementById('scheduler-print-bar');
  const title = document.getElementById('scheduler-print-title');
  const controls = document.getElementById('scheduler-print-controls');
  const sheet = document.getElementById('scheduler-print-sheet');
  const note = document.getElementById('scheduler-print-note');
  const hub = document.getElementById('scheduler-print-hub');

  const NOTE_KIND = {
    info: 'rux--inline-notification rux--inline-notification--info',
    warning: 'rux--inline-notification rux--inline-notification--warning',
    error: 'rux--inline-notification rux--inline-notification--error',
  };

  const say = (kind, heading, body) => {
    const box = el('div', NOTE_KIND[kind] || NOTE_KIND.info);
    const inner = el('div', 'rux--inline-notification__details');
    const text = el('div', 'rux--inline-notification__text-wrapper');
    text.appendChild(el('p', 'rux--inline-notification__title', heading));
    if (body) text.appendChild(el('p', 'rux--inline-notification__subtitle', body));
    inner.appendChild(text);
    box.appendChild(inner);
    sheet.replaceChildren(box);
  };

  /* The paper. A form that names one is asking, not deciding: the paper chosen
     in the print dialog stands where the two disagree, and nothing in CSS or
     JavaScript can read which one that is. So a form names a size only when it
     is printed on one particular stock; leaving it out is `size: auto`, which
     is the browser's own default and means "whatever paper this is", and the
     form then lays out to that sheet's width and flows onto as many of them as
     it needs.

     The @page margin is always zero, because the margin goes in the box model
     instead: a print driver does not reliably honour an @page margin. A form
     that names a paper names that ink margin with it, and the width the sheet
     draws at on screen, so the page shows the shape that comes out of the
     printer. A form that names no paper keeps the page's own defaults. */
  function setPaper(form) {
    let style = document.getElementById('scheduler-print-page');
    if (!style) {
      style = el('style');
      style.id = 'scheduler-print-page';
      document.head.appendChild(style);
    }
    const paper = form?.page;
    style.textContent = `@page { ${paper?.size ? `size: ${paper.size}; ` : ''}margin: 0; }`;
    const root = document.documentElement.style;
    for (const [prop, value] of [
      ['--scheduler-paper-width', paper?.width],
      ['--scheduler-paper-height', paper?.height],
      ['--scheduler-paper-margin', paper?.margin],
    ]) {
      if (value) root.setProperty(prop, value);
      else root.removeProperty(prop);
    }
  }

  let current = null; // { form, subject, copies, chosen, layout }
  let printingAll = false;

  const draw = () => {
    if (!current) return;
    sheet.replaceChildren(current.form.render(current.copies[current.chosen], current.layout));
  };

  // Print all lays every envelope on the trip on the sheet, prints, and puts
  // the one copy back once the dialog closes. print.css starts each on a new
  // page, and each is exactly one envelope tall.
  const drawAll = () => {
    if (!current) return;
    sheet.replaceChildren(...current.every.map(c => current.form.render(c, current.layout)));
  };

  window.addEventListener('afterprint', () => {
    if (!printingAll) return;
    printingAll = false;
    draw();
  });

  /* A line in the toolbar. `say` replaces what the sheet is holding, which is
     right for "this form cannot be drawn" and wrong for anything said while a
     form is on it. */
  let noteTimer = null;
  function flash(text, bad) {
    note.textContent = text;
    note.toggleAttribute('data-bad', Boolean(bad));
    clearTimeout(noteTimer);
    if (text) noteTimer = setTimeout(() => flash(''), 6000);
  }

  /* The tick, written where rux-ui keeps it so its task list agrees. The box
     goes back to what the row says if the write fails, rather than showing a
     trip as done that the database never heard about. */
  async function markPrinted(seat, input) {
    const client = window.Rux?.account?.client;
    const want = input.checked;
    if (!client) {
      input.checked = !want;
      return flash('Not connected, so the tick was not saved.', true);
    }
    input.disabled = true;
    const { error } = await client
      .from('trip_drivers').update({ envelope_printed: want }).eq('id', seat.id);
    input.disabled = false;
    if (error) {
      input.checked = !want;
      return flash(`The tick did not save. ${error.message}`, true);
    }
    seat.envelope_printed = want;
    flash(want ? 'Marked printed.' : 'No longer marked printed.');
  }

  function buildControls() {
    const { form, copies, layout } = current;
    const nodes = [];

    /* The way back to the other forms. It is in the page's own toolbar rather
       than the header, so it is there in a tab and gone in the viewer, where
       the board behind it is the way back. */
    if (!framed) {
      const back = el('a', 'rux--btn rux--btn--ghost rux--btn--sm', 'All forms');
      back.href = 'print.html';
      nodes.push(back);
    }

    if (form.layouts?.length > 1) {
      const group = el('div', 'rux--content-switcher rux--content-switcher--sm');
      group.setAttribute('role', 'tablist');
      for (const option of form.layouts) {
        const btn = el('button', 'rux--content-switcher-btn');
        btn.type = 'button';
        btn.setAttribute('role', 'tab');
        // Carbon paints the selected fill in the button's own ::after, so the
        // name has to be in the span that lifts it above that fill.
        btn.appendChild(el('span', 'rux--content-switcher__label', option.name));
        const on = option.id === layout;
        btn.classList.toggle('rux--content-switcher--selected', on);
        btn.setAttribute('aria-selected', String(on));
        btn.addEventListener('click', () => {
          current.layout = option.id;
          buildControls();
          draw();
        });
        group.appendChild(btn);
      }
      nodes.push(group);
    }

    if (copies.length > 1) {
      const field = el('div', 'rux--select');
      const wrapper = el('div', 'rux--select-input__wrapper');
      const select = el('select', 'rux--select-input');
      select.setAttribute('aria-label', `Which copy of the ${form.name.toLowerCase()}`);
      copies.forEach((copy, i) => {
        const option = el('option', null, form.copyName(copy));
        option.value = String(i);
        select.appendChild(option);
      });
      select.value = String(current.chosen);
      select.addEventListener('change', e => {
        current.chosen = Number(e.target.value) || 0;
        draw();
      });
      wrapper.appendChild(select);
      wrapper.appendChild(arrow());
      field.appendChild(wrapper);
      nodes.push(field);
    }

    /* Printed is ticked by hand, never by printing. `afterprint` fires whether
       the dialog printed or was cancelled and nothing tells the two apart, so
       a tick from it would mark envelopes that never came out. rux-ui does not
       guess either: its task list offers Open, or Open and mark as complete,
       and the person chooses. This is that choice, and it unticks. */
    if (form.marks && copies[current.chosen]?.seat) {
      const seat = copies[current.chosen].seat;
      const box = el('div', 'rux--form-item rux--checkbox-wrapper');
      const input = el('input', 'rux--checkbox');
      input.type = 'checkbox';
      input.id = 'scheduler-print-marked';
      input.checked = Boolean(seat.envelope_printed);
      const label = el('label', 'rux--checkbox-label');
      label.htmlFor = input.id;
      label.appendChild(el('div', 'rux--checkbox-label-text', 'Printed'));
      input.addEventListener('change', () => void markPrinted(seat, input));
      box.append(input, label);
      nodes.push(box);
    }

    const print = el('button', 'rux--btn rux--btn--primary rux--btn--sm', 'Print');
    print.type = 'button';
    print.addEventListener('click', () => window.print());
    nodes.push(print);

    /* Print all is the trip's, not this bus's, so it is offered whenever the
       trip has more than one envelope on it -- including a bus with a single
       driver on a trip that has three more buses. */
    const every = current.every || copies;
    if (every.length > 1) {
      const all = el('button', 'rux--btn rux--btn--tertiary rux--btn--sm', `Print all ${every.length}`);
      all.type = 'button';
      all.title = every.length > copies.length
        ? 'Every envelope on this trip, all buses'
        : 'Every envelope on this trip';
      all.setAttribute('aria-label', `Print every envelope on this trip, ${every.length} in all`);
      all.addEventListener('click', () => {
        printingAll = true;
        drawAll();
        requestAnimationFrame(() => window.print());
      });
      nodes.push(all);
    }

    controls.replaceChildren(...nodes);
  }

  /* The buses a trip has, so the hub can offer a form that binds one. A trip
     is not an assignment: this is the step between "the forms for this trip"
     and "the envelope for bus 12 on the way out". */
  const TRIP_BUSES_QUERY =
    'id,destination,trip_assignments(id,leg,position,buses:bus_id(number),trip_drivers(id,driver_id))';

  const busLabel = a => {
    const number = a.buses?.number;
    return [number != null ? `Bus ${number}` : 'No bus yet',
      a.leg === 'return' ? 'Return' : ''].filter(Boolean).join(' · ');
  };

  async function tripBuses(tripId) {
    const client = window.Rux?.account?.client;
    if (!client) return { why: 'Not connected, so this trip could not be read.' };
    const { data, error } = await client
      .from('trips').select(TRIP_BUSES_QUERY).eq('id', tripId).maybeSingle();
    if (error) return { why: `The schedule did not answer. ${error.message}` };
    if (!data) return { why: 'That trip is not on the schedule any more.' };
    const buses = (data.trip_assignments || [])
      .filter(a => (a.trip_drivers || []).some(d => d.driver_id))
      .sort(byLegThenPosition);
    return { destination: data.destination, buses };
  }

  const tileLink = (href, text) => {
    const link = el('a', 'rux--link scheduler-print__tile-link', text);
    link.href = href;
    return link;
  };

  async function showHub() {
    const trip = params.get('trip');
    title.textContent = 'Forms';
    bar.hidden = false;
    hub.hidden = false;
    sheet.replaceChildren();

    const found = trip ? await tripBuses(trip) : null;
    if (found?.destination) title.textContent = `Forms — ${found.destination}`;

    const list = document.createDocumentFragment();
    for (const form of FORMS) {
      const tile = el('div', 'rux--tile');
      tile.appendChild(el('h2', 'scheduler-print__tile-name', form.name));
      tile.appendChild(el('p', 'scheduler-print__tile-blurb', form.blurb));

      const query = id => `print.html?form=${form.id}${id ? `&assignment=${encodeURIComponent(id)}` : ''}`;

      if (form.binds === null) {
        tile.appendChild(tileLink(`print.html?form=${form.id}`, 'Open a blank one'));
      } else if (!trip) {
        // The tile says what it still wants rather than opening on nothing.
        tile.appendChild(el('p', 'scheduler-print__tile-need', 'Open it from a trip on the board.'));
      } else if (found.why) {
        tile.appendChild(el('p', 'scheduler-print__tile-need', found.why));
      } else if (!found.buses.length) {
        tile.appendChild(el('p', 'scheduler-print__tile-need', 'No bus on this trip has a driver yet.'));
      } else {
        const links = el('div', 'scheduler-print__tile-links');
        for (const a of found.buses) links.appendChild(tileLink(query(a.id), busLabel(a)));
        tile.appendChild(links);
      }
      list.appendChild(tile);
    }
    hub.replaceChildren(list);
  }

  /* Every envelope on the trip, for Print all: each bus on it, outbound then
     return, and each filled seat on each bus. rux asked for the whole trip,
     because a three-bus trip with two drivers on each is six envelopes and
     otherwise six visits to the hub.

     It is a second request, made when the form opens rather than when the
     button is pressed, so the button can say how many it covers. The trip on
     screen is already read, so this one asks only for the buses and their
     seats. A trip that will not answer falls back to the bus this page is
     bound to, which is what Print all covered before. */
  async function everyCopyOnTrip(client, tripId, form, subject, fallback) {
    const { data, error } = await client
      .from('trip_assignments').select(BUS_SEATS_QUERY).eq('trip_id', tripId);
    if (error || !data?.length) return fallback;
    const copies = [...data].sort(byLegThenPosition)
      .flatMap(a => form.copies({ ...subject, assignment: a, leg: a.leg || 'outbound' }));
    return copies.length ? copies : fallback;
  }

  async function showForm(form) {
    title.textContent = form.name;
    setPaper(form);
    bar.hidden = false;
    hub.hidden = true;

    const assignmentId = params.get('assignment');
    if (!assignmentId) {
      say('info', `This ${form.name.toLowerCase()} needs a bus.`,
        'Open it from a trip bar on the board, which is one bus on one leg.');
      return;
    }

    const client = window.Rux?.account?.client;
    if (!client) {
      say('warning', 'Not connected.',
        'This page reads the schedule through the account script, which a local preview leaves off. The cloud preview is http://localhost:8641/.');
      return;
    }

    say('info', 'Loading…', '');
    const { data, error } = await client
      .from('trip_assignments').select(ASSIGNMENT_QUERY).eq('id', assignmentId).maybeSingle();
    if (error) return say('error', 'The schedule did not answer.', error.message);
    if (!data?.trips) return say('error', 'That bus is not on the schedule any more.', '');

    const subject = {
      trip: data.trips,
      assignment: data,
      leg: data.leg || 'outbound',
      seat: null,
    };
    const copies = form.copies(subject);
    if (!copies.length) {
      return say('info', 'This bus has no driver yet.',
        'Fill a seat on the trip\'s Fleet tab, and the envelope has someone to print for.');
    }
    const wanted = params.get('driver');
    const chosen = Math.max(0, copies.findIndex(c => wanted
      ? String(c.seat?.id) === String(wanted)
      : (c.seat?.role || 'driver') === 'driver'));

    current = {
      form,
      subject,
      copies,
      chosen,
      every: copies,
      layout: form.layouts?.some(l => l.id === params.get('layout'))
        ? params.get('layout') : form.layouts?.[0]?.id,
    };
    buildControls();
    draw();

    // The trip's other buses arrive after the form is on screen, so nothing
    // waits on them; only Print all's count changes when they land.
    current.every = await everyCopyOnTrip(client, data.trips.id, form, subject, copies);
    buildControls();
  }

  const form = formOf(params.get('form'));
  if (!form) void showHub();
  else void showForm(form);
})();
