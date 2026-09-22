/* THE FORMS THIS APP FILLS IN. One page renders every one of them, named by
   `?form=`; with no form named it is the hub, a tile per form.

   A FORM IS A REGISTRY ENTRY, and FORMS below is the one source for the hub,
   the ?form= values and, later, the board's menu -- the way SHORTCUT_ACTIONS
   in data.js already feeds both the shortcut bar and the right-click menu.
   An entry says what it binds to, what a print marks, and how it draws:

     id       the ?form= value, and the class prefix its markup uses
     name     what the hub and the viewer's head call it
     binds    'assignment' | 'assignment+seat' | 'trip' | 'week' | null
     marks    the tick a print offers: { table, column, by }, or left out
     page     the one paper it is printed on, or left out to fit any paper
     copies   the subjects this one binding covers, which the toolbar's list
              and Print all start from and grow past
     typed    { fields, always }: what can be typed into, and whether a filled
              copy can be too or only a blank one
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
    use.setAttribute('href', '#m-keyboard_arrow_down');
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

  // "9:15 AM". A form is read at arm's length in a bus, so it takes the long
  // form where the board takes "9:15a".
  const clock = t => {
    if (!t) return '';
    const [h, m] = String(t).split(':');
    const hr = Number(h);
    if (!Number.isFinite(hr) || m === undefined) return String(t).slice(0, 5);
    return `${hr % 12 || 12}:${m} ${hr < 12 ? 'AM' : 'PM'}`;
  };

  /* A drive as `trip_stops` keeps it, "H:MM", in the words the office writes:
     "4h 39m", or minutes alone under the hour. */
  const driveWords = t => {
    const m = /^(\d+):([0-5]\d)$/.exec(String(t || '').trim());
    if (!m) return '';
    const hours = Number(m[1]);
    const mins = Number(m[2]);
    if (!hours && !mins) return '';
    return hours ? (mins ? `${hours}h ${mins}m` : `${hours}h`) : `${mins} min`;
  };

  // Miles as the stop holds them, without the trailing zero a whole number
  // would otherwise print.
  const milesWords = v => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? `${Math.round(n * 10) / 10} mi` : '';
  };

  /* The company's own line, at the head of every form. It is here rather than
     read from Settings because there is no Settings page yet to hold the yard. */
  const COMPANY = {
    address: '2801 Zinnia Avenue, McAllen, TX 78504',
    phones: '(956) 994-1169 / Fax 994-9491 / Cell 648-9691',
  };

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

  /* AN ADDRESS AS A FORM CAN CARRY IT. A stop's address is what a map service
     returned, and its last two parts are noise on paper: the country is
     understood and the state beside a ZIP is a postal code. On a 6 by 9
     envelope they were the difference between one line and two. Only what is
     printed changes; the stored address is untouched. */
  const STATES = Object.fromEntries('Alabama:AL,Alaska:AK,Arizona:AZ,Arkansas:AR,California:CA,Colorado:CO,Connecticut:CT,Delaware:DE,Florida:FL,Georgia:GA,Hawaii:HI,Idaho:ID,Illinois:IL,Indiana:IN,Iowa:IA,Kansas:KS,Kentucky:KY,Louisiana:LA,Maine:ME,Maryland:MD,Massachusetts:MA,Michigan:MI,Minnesota:MN,Mississippi:MS,Missouri:MO,Montana:MT,Nebraska:NE,Nevada:NV,New Hampshire:NH,New Jersey:NJ,New Mexico:NM,New York:NY,North Carolina:NC,North Dakota:ND,Ohio:OH,Oklahoma:OK,Oregon:OR,Pennsylvania:PA,Rhode Island:RI,South Carolina:SC,South Dakota:SD,Tennessee:TN,Texas:TX,Utah:UT,Vermont:VT,Virginia:VA,Washington:WA,West Virginia:WV,Wisconsin:WI,Wyoming:WY'
    .split(',').map(pair => pair.split(':')));

  const COUNTRY = /^(united states( of america)?|usa|u\.s\.a\.|us)$/i;

  function shortAddress(text) {
    const parts = String(text || '').split(',').map(part => part.trim()).filter(Boolean);
    if (COUNTRY.test(parts.at(-1) || '')) parts.pop();
    const tail = parts.at(-1);
    const named = tail && tail.match(/^(.+?)\s+(\d{5}(?:-\d{4})?)$/);
    if (named && STATES[named[1]]) parts[parts.length - 1] = `${STATES[named[1]]} ${named[2]}`;
    return parts.join(', ');
  }

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

  /* What the trip needs, from `trip_reqs` where it is set and the older
     booleans where it is not, which is the pair rux-ui reads.

     THE FIVE BELOW ARE ONLY THE ONES THIS FORM SPELLS OUT. The list is the
     office's to edit and already holds more than five, so a ticked id this
     table does not know still prints, named from `requirementNames` and by
     its raw id if that could not be read -- the same fallback the board's
     history takes. Dropping it would take a requirement off the envelope
     without saying so.

     One way sits second because it changes how the driver runs the day, and
     a fuel card prints a rule for its number, because the office writes that
     in by hand. */
  /* The table is `requirements.js`, which the board loads too, so a
     requirement is one drawing and one name on a bar and on paper alike. */
  const NEEDS = window.SchedulerRequirements || {};
  const NEED_ORDER = ['pax56', 'oneWay', 'sleeper', 'adaLift', 'fuelCard', 'hotel'];

  /* The requirements the office keeps, id to label, read once a form opens.
     Empty until then, and empty if the read failed. */
  let requirementNames = new Map();

  function needsOf(trip) {
    const reqs = trip.trip_reqs;
    const on = reqs && typeof reqs === 'object' && Object.keys(reqs).length
      ? new Set(Object.entries(reqs).filter(([, v]) => v).map(([k]) => k))
      : new Set([
          ['pax56', trip.req_56pax], ['sleeper', trip.req_sleeper],
          ['adaLift', trip.req_ada], ['fuelCard', trip.need_fuel_card],
          ['hotel', trip.need_hotel],
        ].filter(([, v]) => v).map(([k]) => k));
    if (trip.trip_type && trip.trip_type !== 'round_trip') on.add('oneWay');
    const named = NEED_ORDER.filter(id => on.has(id));
    const rest = [...on].filter(id => !NEEDS[id]);
    return [...named, ...rest].map(id => ({
      id,
      // The office's own list names it first, as it does on the board: what
      // Settings calls a requirement is what it is called.
      label: requirementNames.get(id) || NEEDS[id]?.label || id,
      icon: NEEDS[id]?.icon || null,
    }));
  }

  /* The office's own requirement list, where rux-ui keeps it. A form asks for
     it once it is on screen; a read that fails leaves the five above naming
     themselves and everything else naming its id. */
  const REQUIREMENTS_KEY = 'requirements-v1';
  async function readRequirementNames(client) {
    const { data } = await client
      .from('settings').select('value').eq('key', REQUIREMENTS_KEY).maybeSingle();
    if (!Array.isArray(data?.value)) return;
    requirementNames = new Map(data.value
      .filter(r => r && typeof r.id === 'string' && r.label)
      .map(r => [r.id, String(r.label)]));
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
    return head;
  }

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

    frag.appendChild(row(cell('Pick up address:', shortAddress(stop?.address))));
    return frag;
  }

  /* The lines the driver fills in after the trip: what the ELD and the card
     did, and what the trip cost. Always blank. */
  const TALLY = [
    { label: 'ELD verified', choices: ['DRV', 'OFC'] },
    { label: 'Hotel', money: true },
    { label: 'ELD backup used', choices: ['Yes', 'No'] },
    { label: 'Diesel/Blue Def', money: true },
    /* Which card, written in. A number here is the yes, so the pair of boxes
       that used to ask it went: a card written down and a card ticked for are
       the same fact asked twice. */
    { label: 'CC for trip', fill: true },
    { label: 'Repairs', money: true },
    { label: 'CC received by', fill: true },
    { label: 'Miscellaneous', money: true },
    { label: 'Total trip miles', fill: true },
    { label: 'Total', money: true },
  ];

  function envelopeTally() {
    const grid = el('div', 'scheduler-envelope__tally');
    for (const line of TALLY) {
      const node = el('div', 'scheduler-envelope__tally-line');
      node.appendChild(el('span', 'scheduler-envelope__tally-label', line.label));
      // Whatever a line answers with is pushed to the end of it, so the boxes
      // and the dollar signs stand in columns down the block rather than
      // following labels of every length.
      node.appendChild(el('span', 'scheduler-envelope__tally-fill'));
      if (line.choices) {
        for (const choice of line.choices) {
          const opt = el('span', 'scheduler-envelope__choice');
          opt.appendChild(el('span', 'scheduler-envelope__box'));
          opt.appendChild(document.createTextNode(choice));
          node.appendChild(opt);
        }
      } else if (line.money) {
        node.appendChild(el('span', 'scheduler-envelope__tally-label', '$'));
        node.appendChild(el('span', 'scheduler-envelope__tally-money'));
      }
      grid.appendChild(node);
    }
    return grid;
  }

  /* WHAT THE TRIP NEEDS, in the box at the foot of the envelope -- the space
     the office used to write these into by hand. What dispatch knows is
     printed there now, and the room under it is for whatever is added on the
     day. Each one is a label, not a tick box: the ELD and card lines above are
     real boxes for the driver's pen, and an empty square beside "56
     passengers" would read there as "not needed".

     The one note written to this driver goes in the same box, under them and
     set apart by weight: it is the only other thing said in prose to the
     person holding the envelope. */
  function envelopeNeeds(trip, seat) {
    const box = el('div', 'scheduler-envelope__reqs');
    box.appendChild(el('span', 'scheduler-envelope__label', 'Requirements:'));

    const needs = needsOf(trip);
    if (needs.length) {
      const list = el('div', 'scheduler-envelope__needs');
      for (const need of needs) {
        const item = el('div', 'scheduler-envelope__need');
        item.appendChild(needMark(need));
        item.appendChild(el('span', null, need.label));
        list.appendChild(item);
      }
      box.appendChild(list);
    }

    const instruction = String(seat?.instructions || '').trim();
    if (instruction) box.appendChild(el('p', 'scheduler-envelope__note', instruction));
    return box;
  }

  // The drawing, or the initial in its place, so every requirement in the list
  // starts at the same point whether Carbon has a glyph for it or not.
  function needMark(need) {
    if (!need.icon) {
      return el('span', 'scheduler-envelope__need-letter', String(need.label).trim().charAt(0));
    }
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'scheduler-envelope__need-icon');
    svg.setAttribute('viewBox', '0 0 32 32');
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', need.icon);
    svg.appendChild(use);
    return svg;
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

  /* One copy. `layout` is 'standard' or 'multi-stop', chosen in the toolbar
     rather than guessed from the trip: which form the office uses is an
     arrangement with the customer, not something the data says. */
  function envelope(subject, layout) {
    const { trip, assignment, leg, seat } = subject;
    const card = el('article', 'scheduler-form scheduler-envelope');
    card.dataset.layout = layout === 'multi-stop' ? 'multi-stop' : 'standard';
    card.appendChild(envelopeHead(trip, leg));

    /* THE FIELDS ARE ONE BORDERED TABLE, as the form in use is drawn. A box
       tells a driver where to write; a rule under a whole row does not, and an
       empty field between two rules reads as nothing rather than as a space
       for an answer. */
    const contact = contactOf(trip);
    const table = el('div', 'scheduler-envelope__table');
    table.appendChild(envelopeSchedule(trip, assignment, leg, seat));

    if (card.dataset.layout === 'multi-stop') {
      table.appendChild(row(
        cell('Contact:', contact.name),
        cell('Phone:', contact.phone),
      ));
      card.appendChild(table);
      card.appendChild(envelopeLog());
      card.appendChild(envelopeNeeds(trip, seat));
      card.appendChild(envelopeTally());
      return card;
    }

    table.appendChild(row(cell('Destination:', trip.destination || '')));
    table.appendChild(row(
      cell('Contact:', contact.name),
      cell('Phone:', contact.phone),
    ));
    // Last in the table, because it is the one row filled in after the trip.
    table.appendChild(row(
      cell('Starting odometer:', '', true),
      cell('Ending odometer:', '', true),
    ));
    card.appendChild(table);
    card.appendChild(envelopeTally());
    card.appendChild(envelopeNeeds(trip, seat));
    return card;
  }

  /* ── The driver itinerary ─────────────────────────────────────────────────
     The office's clean copy of the plan for the day: where the bus goes, when,
     and what happens there, on the company's own head and in one shape
     whoever the customer is. The customer's own itinerary is a different
     thing -- it arrives as a PDF, a text message or a photograph and is filed
     against the trip unchanged. This is what the driver carries.

     EVERY FIELD CAN BE TYPED INTO, on a filled copy as on a blank one. The
     envelope prints what dispatch knows and dispatch is right; this prints
     what the customer sent, which is the thing being tidied, so autofill is a
     head start rather than a lock. What is typed is on the page and nowhere
     else: it prints, and it is gone when the page closes. A line worth
     keeping belongs upstream, in the stop's own `label` or the seat's
     instructions, both of which already print.

     AND IT WORKS NOTHING OUT. Miles and drive are columns on the stop. The
     tight-leg warnings and the duty-hours-by-day footer rux-ui's own sheet
     carries come from its Grid tab's arithmetic, which this app does not
     have. */

  const LEGS = ['outbound', 'return'];
  const legName = leg => (leg === 'return' ? 'Return' : 'Outbound');

  /* The legs a trip has, which is the list of copies. It reads the stops
     rather than the buses because the stops are what this form prints: a leg
     with a bus and no route has nothing to fill in. A trip with no stops at
     all still offers the outbound one, blank. */
  const legsOf = trip => {
    const have = new Set((trip.trip_stops || []).map(s => s.leg || 'outbound'));
    const found = LEGS.filter(leg => have.has(leg));
    return found.length ? found : ['outbound'];
  };

  const stopsOf = (trip, leg) => (trip.trip_stops || [])
    .filter(s => (s.leg || 'outbound') === leg)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  /* A STOP'S TIMES, labelled by what the driver needs from that row rather
     than by the column they are kept in.

     `depart_prev` is the departure from the stop BEFORE, kept on the row it
     leads to, so a stop's own departure is the next row's -- which is why
     every row here is drawn with the one after it in hand. A sleeper is the
     exception the Route tab's model makes: there the pair is the rest itself,
     `depart_prev` when it starts and `arrive` when it ends, and the bus rolls
     at the following row's `depart_prev`.

     There is no report time. rux-ui works one out in its Grid tab from the
     yard plan; nothing on `trip_stops` holds it, and a form does not compute. */
  function itineraryTimes(stop, next) {
    const after = next?.depart_prev || null;
    // The yard line the sheet opens with: the one time on it is when the bus
    // rolls, which the pickup lends it.
    if (stop.type === 'yard') return [['Roll', after]];
    if (stop.type === 'sleeper') return [['Rest', stop.depart_prev], ['Up', stop.arrive], ['Dep', after]];
    if (stop.type === 'pickup') return [['Spot', stop.spot], ['Dep', after]];
    if (stop.type === 'return') return [['Arr', stop.arrive]];
    return [['Arr', stop.arrive], ['Dep', after]];
  }

  const ITINERARY_TITLE = {
    pickup: 'Pickup',
    stop: 'Stop',
    sleeper: 'Rest',
    return: 'Yard',
  };

  /* A `day` row is the itinerary's own day divider, and its `label` is the
     day: an ISO date where rux-ui's import had one, free text where the
     customer wrote "Day 1". Its `name` is a marker and never printed. */
  const dayName = label => {
    const day = weekdayOf(label);
    return day ? `${day} ${mdy(label)}` : String(label || '').trim();
  };

  const timeCell = lines => {
    const td = el('td', 'scheduler-driver-itinerary__time scheduler-driver-itinerary__typed');
    for (const [label, time] of lines) {
      if (!time) continue;
      const at = el('span', 'scheduler-driver-itinerary__at');
      at.appendChild(el('span', 'scheduler-driver-itinerary__at-label', label));
      at.appendChild(document.createTextNode(clock(time)));
      td.appendChild(at);
    }
    return td;
  };

  const textCell = (cls, text) =>
    el('td', `scheduler-driver-itinerary__${cls} scheduler-driver-itinerary__typed`, text || '');

  /* THE LEG INTO THIS STOP, under its name: the miles and the drive the Route
     tab worked out and wrote on the row. The first row of a leg has none,
     because nothing was driven to reach it. */
  function locationCell(stop) {
    const td = textCell('loc', stop.name || ITINERARY_TITLE[stop.type] || '');
    const words = [milesWords(stop.miles), driveWords(stop.drive)].filter(Boolean).join(' · ');
    if (words) td.appendChild(el('span', 'scheduler-driver-itinerary__leg', words));
    return td;
  }

  /* One line of the table. `activity` rides in `label` on every type but a
     pickup, where "origin:yard" already owns that column. */
  function itineraryRow(stop, next) {
    const tr = el('tr');
    tr.appendChild(timeCell(itineraryTimes(stop, next)));
    tr.appendChild(locationCell(stop));
    tr.appendChild(textCell('addr', shortAddress(stop.address)));
    tr.appendChild(textCell('act', stop.type === 'pickup' ? '' : stop.label || ''));
    return tr;
  }

  /* A row with nothing in it, for the Add a row button and for a blank form.
     It has no type either, so the Location column stays empty rather than
     naming what the row would have been. */
  const blankRow = () => itineraryRow({}, null);

  /* THE YARD IS NO ROW OF ITS OWN. The leg's pickup holds the drive from the
     yard and the yard departure, in `depart_prev`, so the sheet opens with a
     yard line built from them -- otherwise the one time that tells a driver
     when to roll is the only stored time the form does not print, and the
     pickup row would have to label it "Dep" and say the bus leaves the school
     half an hour before it gets there. The yard's own name and address are
     the leg's `return` row, which is the same yard at the end of the day. */
  function yardRow(stops) {
    const pickup = stops.find(s => s.type === 'pickup');
    if (!pickup?.depart_prev) return null;
    const yard = stops.find(s => s.type === 'return');
    return itineraryRow({
      type: 'yard',
      name: yard?.name || 'Yard',
      address: yard?.address || COMPANY.address,
      arrive: null,
    }, { depart_prev: pickup.depart_prev });
  }

  function itineraryHead() {
    const head = el('header', 'scheduler-driver-itinerary__head');
    const logo = el('img', 'scheduler-driver-itinerary__logo');
    logo.src = 'brand/logo.png';
    logo.alt = '';
    head.appendChild(logo);
    head.appendChild(el('p', 'scheduler-driver-itinerary__line', COMPANY.address));
    head.appendChild(el('p', 'scheduler-driver-itinerary__line', COMPANY.phones));
    head.appendChild(el('h1', 'scheduler-driver-itinerary__title', 'Driver itinerary'));
    return head;
  }

  const headField = (label, value) => {
    const node = el('div', 'scheduler-driver-itinerary__field');
    node.appendChild(el('dt', 'scheduler-driver-itinerary__label', label));
    node.appendChild(el('dd',
      'scheduler-driver-itinerary__value scheduler-driver-itinerary__typed', value || ''));
    return node;
  };

  /* WHAT THE HEAD NAMES: the leg, the day, the client, where they are going
     and who to call on the day. No crew, because the envelope beside this
     sheet names the seat it is for and naming a driver twice is one fact with
     two homes. The bus is the one exception, and it is blank unless the form
     was opened on one: the sheet goes in that bus's envelope. */
  function itineraryMeta(subject) {
    const { trip, leg, assignment } = subject;
    const start = leg === 'return' ? (trip.return_start_date || trip.end_date) : trip.start_date;
    const end = leg === 'return' ? (trip.return_end_date || trip.end_date) : trip.end_date;
    const day = [weekdayOf(start), mdy(start)].filter(Boolean).join(' ');
    const contact = contactOf(trip);
    const meta = el('dl', 'scheduler-driver-itinerary__meta');
    meta.appendChild(headField('Leg', trip.start_date ? legName(leg) : ''));
    meta.appendChild(headField('Date',
      [day, end && end !== start ? `– ${mdy(end)}` : ''].filter(Boolean).join(' ')));
    meta.appendChild(headField('Client', trip.customer || ''));
    meta.appendChild(headField('Bus',
      assignment?.buses?.number != null ? String(assignment.buses.number) : ''));
    meta.appendChild(headField('Destination', trip.destination || ''));
    meta.appendChild(headField('Contact',
      [contact.name, contact.phone].filter(Boolean).join(' · ')));
    return meta;
  }

  const COLUMNS = ['Time', 'Location', 'Address', 'Activity'];

  /* Everything on this form can be typed into, so one class marks it and the
     registry entry hands this list to `letThemType`. */
  const ITINERARY_FIELDS = ['.scheduler-driver-itinerary__typed'];

  /* NO BLANK RULED ROWS. A printed grid of empty lines reads as a form nobody
     filled in, which is the impression this form exists to get away from, so
     the table holds the stops and nothing more and a row is added on screen
     when one is wanted. A form opened on no trip starts with one, because a
     header over an empty table reads as broken. */
  function itinerary(subject) {
    const { trip, leg } = subject;
    const card = el('article', 'scheduler-form scheduler-driver-itinerary');
    card.appendChild(itineraryHead());
    card.appendChild(itineraryMeta(subject));

    const table = el('table', 'scheduler-driver-itinerary__table');
    const head = el('thead');
    const headRow = el('tr');
    for (const label of COLUMNS) headRow.appendChild(el('th', null, label));
    head.appendChild(headRow);
    table.appendChild(head);

    const body = el('tbody');
    const stops = stopsOf(trip, leg);
    const yard = yardRow(stops);
    if (yard) body.appendChild(yard);
    // A day divider takes no place in the run of stops, because the departure
    // a row lends the one before it is the next real stop's.
    const onward = stops.filter(s => s.type !== 'day');
    let place = 0;
    for (const stop of stops) {
      if (stop.type === 'day') {
        const dayRow = el('tr', 'scheduler-driver-itinerary__day');
        const cell = el('td', 'scheduler-driver-itinerary__typed', dayName(stop.label));
        cell.colSpan = COLUMNS.length;
        dayRow.appendChild(cell);
        body.appendChild(dayRow);
        continue;
      }
      body.appendChild(itineraryRow(stop, onward[place + 1] || null));
      place += 1;
    }
    if (!body.children.length) body.appendChild(blankRow());
    table.appendChild(body);
    card.appendChild(table);

    /* Screen only, and inside the sheet because that is where the row it adds
       goes. print.css takes it off the paper. */
    const add = el('button', 'rux--btn rux--btn--ghost rux--layout--size-sm scheduler-driver-itinerary__add', 'Add a row');
    add.type = 'button';
    add.addEventListener('click', () => {
      const row = blankRow();
      body.appendChild(row);
      letThemType(row, ITINERARY_FIELDS);
      row.querySelector('[contenteditable]')?.focus();
    });
    card.appendChild(add);
    return card;
  }

  /* ── The registry ─────────────────────────────────────────────────────── */

  const FORMS = [
    {
      id: 'envelope',
      name: 'Driver envelope',
      blurb: 'What dispatch knows, printed; the day-of fields blank for the driver.',
      binds: 'assignment+seat',
      /* It can also be opened on nothing: a blank envelope to fill in by hand
         or type into, which is what the Forms page is for when no trip sent
         you there. */
      blank: true,
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
      /* The bus and the leg first, because they are what tells two copies
         apart in a list that covers the whole trip; the seat's name follows. */
      copyName: subject => [
        subject.assignment?.buses?.number != null
          ? `Bus ${subject.assignment.buses.number}${subject.leg === 'return' ? ' return' : ''}`
          : null,
        `${nameOf(subject.seat)} — ${roleName(subject.seat?.role)}`,
      ].filter(Boolean).join(' · '),
      /* Only what dispatch would have filled in, and only on a blank one: a
         filled envelope prints what dispatch knows and dispatch is right. The
         day-of block is left alone on both, because the driver's pen fills it
         after the trip. */
      typed: {
        fields: [
          '.scheduler-envelope__value',
          '.scheduler-envelope__blank',
          '.scheduler-envelope__day',
          '.scheduler-envelope__reqs',
        ],
      },
      render: envelope,
    },
    {
      id: 'driver-itinerary',
      name: 'Driver itinerary',
      blurb: 'The plan for the day, from the route already entered; every line typed into.',
      /* IT BINDS THE TRIP AND THE LEG, NOT THE BUS. The envelope binds a seat
         because it is personal, one name and one seat; the plan for the day is
         the same for every driver and every bus on the leg, and `trip_stops`
         are keyed by trip and leg with no bus among them. */
      binds: 'trip',
      blank: true,
      /* The mark rux-ui already writes and its task list already reads, so a
         sheet printed here shows as printed there. */
      marks: { table: 'trips', column: 'itinerary_printed', by: 'leg' },
      /* NO PAPER OF ITS OWN: `page` left out is `size: auto`, which lays the
         form out to whatever is in the tray and runs onto as many sheets as
         the stops need. The envelope names 6 by 9 because it is an envelope;
         this goes inside one. */
      copies: subject => legsOf(subject.trip).map(leg => ({
        ...subject,
        leg,
        // The bus came from the assignment the form was opened on, and an
        // assignment is one leg's: the other leg's copy names none, and its
        // line is blank for the pen.
        assignment: subject.assignment?.leg === leg ? subject.assignment : null,
      })),
      copyName: subject => legName(subject.leg),
      typed: { always: true, fields: ITINERARY_FIELDS },
      render: itinerary,
    },
  ];

  window.SchedulerForms = { FORMS, envelope, itinerary, seatsOf, needsOf, contactOf, roleName };

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

  /* THE TOOLBAR IS THE PANEL'S, WHERE THERE IS A PANEL. A stored file carries
     its buttons in the document panel's own row, so a form carries its buttons
     there too and every document in that panel reads the same way. The page
     hands the panel the controls it built and the panel holds them; its own
     bar then has nothing to show and stays hidden. Opened in a tab there is no
     panel, and the page's bar is the only toolbar there is.
     `window.parent` is this origin either way, and the guard is for a frame
     that is not the board's. */
  const host = (() => {
    if (!framed) return null;
    try { return window.parent.Rux?.viewer ?? null; } catch { return null; }
  })();

  /* A new page in the frame takes the last one's controls out of the panel.
     The panel clears them when it opens a document, but a tile on the hub
     moves the frame on its own, and a form that cannot be drawn has none. */
  host?.setFormControls([], []);
  host?.setFormNote('');

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

    /* AND HOW IT IS SHOWN. A form on named stock is shown as that stock -- the
       envelope in the kraft it is really printed on, at the size it really is
       -- because it has to come out on exactly that much paper and the preview
       is where that is checked. It carries the light theme for its ink, since
       nothing dark is ever printed on it. A form on whatever is in the tray
       has no stock to show and runs as long as it needs, so it is a page of
       this app in the theme the person keeps. @media print pins the ink and
       whitens the stock: the kraft is already there, in the printer. */
    sheet.dataset.paper = paper ? 'named' : 'any';
    if (paper) sheet.setAttribute('data-theme', 'g10');
    else sheet.removeAttribute('data-theme');

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

  /* THE SHEET AT THE SIZE THE ROOM ALLOWS. A form keeps the paper's own width
     on screen, so what wraps here is what wraps on paper; where the room is
     narrower than the sheet -- the 30rem viewer beside the board, a phone --
     the whole sheet is taken down together rather than reflowed. The factor is
     a number, and CSS cannot divide one length by another, so it is measured
     here and written onto the page for the stylesheet to use.

     IT WATCHES THE ROOM, NOT THE SHEET. The sheet's own width is what this
     rule sets, and an observer on it would stop hearing once the rule bound. */
  function fitPaper() {
    const page = getComputedStyle(document.documentElement);
    const paperOf = side => {
      const value = page.getPropertyValue(`--scheduler-paper-${side}`).trim();
      const inches = value.endsWith('in') ? parseFloat(value) : NaN;
      // 96 CSS pixels to the inch, which is what an inch means in CSS.
      return Number.isFinite(inches) && inches ? inches * 96 : NaN;
    };
    const wide = paperOf('width');
    const tall = paperOf('height');
    const root = document.documentElement.style;
    // A form on no named paper is fluid and wants no scaling.
    if (!Number.isFinite(wide)) return root.removeProperty('--scheduler-fit');

    const style = getComputedStyle(sheet);
    const room = sheet.clientWidth
      - parseFloat(style.paddingInlineStart) - parseFloat(style.paddingInlineEnd);
    /* THE WHOLE SHEET, WHERE THE PAGE IS THE ROOM. Standing alone the desk is
       what the window leaves under the title row, and the form takes the
       smaller of the two fits so the envelope is on screen entire -- a sheet
       of paper you can see all of beats one you scroll. Framed in the panel
       only the width is fitted: the panel scrolls, and a short one would take
       the envelope down to nothing. */
    const standing = sheet.clientHeight
      - parseFloat(style.paddingBlockStart) - parseFloat(style.paddingBlockEnd);
    const height = framed || !Number.isFinite(tall) || !(standing > 0) ? Infinity
      : standing / tall;
    const fit = Math.min(1, room / wide, height);
    if (fit > 0) root.setProperty('--scheduler-fit', String(Math.round(fit * 1000) / 1000));
  }

  if (typeof ResizeObserver === 'function') new ResizeObserver(fitPaper).observe(sheet);

  /* `every` is the list the toolbar offers and `chosen` indexes it: every
     envelope on the trip, which starts as this bus's and grows when the rest
     of the trip answers. `copies` stays this bus's, as the fallback for a trip
     that will not answer. */
  let current = null; // { form, subject, copies, every, chosen, layout }
  let printingAll = false;

  const draw = () => {
    if (!current) return;
    const card = current.form.render(current.every[current.chosen], current.layout);
    // A form opened on nothing says so, for the rules that have to show where
    // the writing goes when there is none of it anywhere.
    if (current.blank) card.dataset.blank = '';
    if (current.blank || current.form.typed?.always) letThemType(card, current.form.typed?.fields);
    sheet.replaceChildren(card);
    /* Fitted here, with the sheet holding what it will hold. The observer
       hears the room change and not the drawing, and the first drawing lands
       after the room is already its final size. */
    fitPaper();
  };

  /* WHAT CAN BE TYPED INTO. The form's own entry says which of its fields
     take a pen and whether a filled copy takes one too, because the two forms
     answer that differently: the envelope prints what dispatch knows and only
     a blank one is typed into, where the itinerary is tidying what the
     customer sent and every line of it is open.

     What is typed is on the page and nowhere else. It prints, and it is gone
     when the page is closed or the layout is switched, which is what a spare
     form in a drawer does too. */
  function letThemType(root, selectors) {
    const fields = (selectors || []).flatMap(sel => [...root.querySelectorAll(sel)]);
    for (const field of fields) {
      // Chrome takes plaintext-only, which keeps pasted markup out of a form
      // that is about to be printed; everything else falls back to true.
      field.contentEditable = 'plaintext-only';
      if (field.contentEditable !== 'plaintext-only') field.contentEditable = 'true';
      field.spellcheck = false;
      field.dataset.typed = '';
    }
  }

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
    if (host) host.setFormNote(text, bad);
    else {
      note.textContent = text;
      note.toggleAttribute('data-bad', Boolean(bad));
    }
    clearTimeout(noteTimer);
    if (text) noteTimer = setTimeout(() => flash(''), 6000);
  }

  /* WHICH ROW A TICK IS WRITTEN ON, AND IN WHICH COLUMN. A mark `by: 'seat'`
     is this copy's own row in `trip_drivers`. A mark `by: 'leg'` is the trip's
     row, in the column the schema names for that leg: it keeps a per-leg flag
     as a pair of columns, `itinerary_printed_outbound` and `_return`, so the
     leg is the suffix rather than a value. Either way the row is one the page
     already read, so the tick it draws is what the database says.

     A copy with no row to write on -- a blank form, a trip that answered
     without an id -- has no tick, and the toolbar leaves it out. */
  function markOf(form, copy) {
    const marks = form?.marks;
    const row = !marks || !copy ? null
      : marks.by === 'leg' ? copy.trip : copy.seat;
    if (!row?.id) return null;
    return {
      table: marks.table,
      row,
      column: marks.by === 'leg'
        ? `${marks.column}_${copy.leg === 'return' ? 'return' : 'outbound'}`
        : marks.column,
    };
  }

  /* The tick, written where rux-ui keeps it so its task list agrees. It shows
     at once and goes back to what the row says if the write fails, rather than
     showing a trip as done that the database never heard about. `sync` is how
     whatever is drawing the tick -- a box in this page's own bar, a row in the
     panel's menu -- follows the row. */
  async function markPrinted(mark, want, sync) {
    const { table, row, column } = mark;
    const was = Boolean(row[column]);
    row[column] = want;
    sync();
    const fail = why => { row[column] = was; sync(); flash(why, true); };
    const client = window.Rux?.account?.client;
    if (!client) return fail('Not connected, so the tick was not saved.');
    const { error } = await client.from(table).update({ [column]: want }).eq('id', row.id);
    if (error) return fail(`The tick did not save. ${error.message}`);
    flash(want ? 'Marked printed.' : 'No longer marked printed.');
  }

  /* WHAT GOES IN THE ROW AND WHAT GOES UNDER THE OVERFLOW. The panel's toolbar
     is 30rem wide with a document's own buttons already in it, so the two
     controls that are read rather than reached for -- which layout, and
     whether this copy is done -- go under its overflow menu, and the row keeps
     what a person came to press. The menu is the panel's: a surface opened
     from inside the frame could not draw outside it, so this page says what
     the items are and the panel builds them. In its own tab there is no
     overflow and no menu script, and the page has the width to show all of
     them, so they stay in its bar. */
  function buildControls() {
    const { form, layout } = current;
    // Every envelope this trip has; it is this bus's until the trip's other
    // buses answer, and one of them is on the sheet.
    const every = current.every;
    const nodes = [];
    const menu = [];

    const chooseLayout = id => { current.layout = id; buildControls(); draw(); };

    if (form.layouts?.length > 1 && host) {
      for (const option of form.layouts) menu.push({
        id: `layout-${option.id}`,
        label: option.name,
        kind: 'radio',
        checked: option.id === layout,
        choose: () => chooseLayout(option.id),
      });
    } else if (form.layouts?.length > 1) {
      const group = el('div', 'rux--content-switcher rux--layout--size-md');
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
        btn.addEventListener('click', () => chooseLayout(option.id));
        group.appendChild(btn);
      }
      nodes.push(group);
    }

    /* EVERY ENVELOPE ON THE TRIP, not only this bus's. The button beside it
       already counts the trip, and a list that stopped at one bus meant going
       back to the board to reach the next one. It starts as this bus's and
       grows when the trip's other buses answer.

       IN THE PANEL THE LIST IS THE HEAD'S, not the toolbar's: the head is
       already saying which envelope this is, so it is the thing to press to
       say which other one, the way the board's week label opens its date
       picker. That leaves the toolbar to the actions. */
    /* STEP THROUGH THEM, where the panel's head is holding the list. One press
       is the next envelope on the trip, which is what dispatch does with a
       stack of them; the head still names the one on the sheet and still
       opens the whole list. They stop at the ends rather than wrapping: a
       list of six is not a carousel.

       The panel draws them from this, rather than taking buttons built here,
       because a drawing referred to by name does not follow its button from
       one document into another: the reference is resolved once, against the
       document the button was born in. */
    const steps = host && every.length > 1 ? {
      prev: {
        label: `Previous ${form.name.toLowerCase()}`,
        disabled: !every[current.chosen - 1],
        choose: () => { current.chosen -= 1; buildControls(); draw(); },
      },
      next: {
        label: `Next ${form.name.toLowerCase()}`,
        disabled: !every[current.chosen + 1],
        choose: () => { current.chosen += 1; buildControls(); draw(); },
      },
    } : null;

    if (host) {
      const chosen = every[current.chosen];
      host.setViewerHead(
        current.blank ? `${form.name} — blank` : form.copyName(chosen),
        every.length > 1 ? every.map((copy, i) => ({
          label: form.copyName(copy),
          checked: i === current.chosen,
          choose: () => { current.chosen = i; buildControls(); draw(); },
        })) : [],
      );
    } else if (every.length > 1) {
      // Every control in this row is Carbon's medium size, which is the
      // height of the bar itself: the row is one band, not a strip of buttons
      // floating in one.
      const field = el('div', 'rux--select rux--layout--size-md');
      const wrapper = el('div', 'rux--select-input__wrapper');
      const select = el('select', 'rux--select-input');
      select.setAttribute('aria-label', `Which ${form.name.toLowerCase()} on this trip`);
      every.forEach((copy, i) => {
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
    const mark = markOf(form, every[current.chosen]);
    if (mark && host) {
      if (menu.length) menu.push({ kind: 'separator' });
      menu.push({
        id: 'printed',
        label: 'Printed',
        kind: 'check',
        checked: Boolean(mark.row[mark.column]),
        choose: () => void markPrinted(mark, !mark.row[mark.column], buildControls),
      });
    } else if (mark) {
      const box = el('div', 'rux--form-item rux--checkbox-wrapper');
      const input = el('input', 'rux--checkbox');
      input.type = 'checkbox';
      input.id = 'scheduler-print-marked';
      input.checked = Boolean(mark.row[mark.column]);
      const label = el('label', 'rux--checkbox-label');
      label.htmlFor = input.id;
      label.appendChild(el('div', 'rux--checkbox-label-text', 'Printed'));
      input.addEventListener('change', () => void markPrinted(mark, input.checked,
        () => { input.checked = Boolean(mark.row[mark.column]); }));
      box.append(input, label);
      nodes.push(box);
    }

    /* In the panel the plain Print is the panel's own printer button, which
       prints this frame, exactly as it prints a stored file; standing alone
       the page has to carry its own. */
    const actions = [];
    if (!host) {
      const print = el('button', 'rux--btn rux--btn--primary rux--layout--size-md', 'Print');
      print.type = 'button';
      print.addEventListener('click', () => window.print());
      actions.push(print);
    }

    /* Print all covers the same list the head's own offers: every envelope on
       the trip, including a bus with a single driver on a trip that has three
       more buses. In the panel it is under the overflow, because the row
       beside it is for what is pressed often and a whole stack is not.

       A FORM THAT IS ALWAYS TYPED INTO DOES NOT OFFER IT. Laying the whole
       stack out draws every copy again, which takes back what was typed into
       the one on the sheet -- silently, between pressing the button and the
       dialog opening. Its copies are printed one at a time instead. */
    const stack = every.length > 1 && !form.typed?.always;
    if (host && stack) {
      if (menu.length) menu.push({ kind: 'separator' });
      menu.push({
        id: 'print-all',
        label: `Print all ${every.length}`,
        kind: 'action',
        choose: () => {
          printingAll = true;
          drawAll();
          requestAnimationFrame(() => window.print());
        },
      });
    } else if (stack) {
      /* Ghost, not bordered: beside the panel's bare icons a box around one
         button reads as a different kind of thing, and beside the page's own
         Print it is the quieter of a pair, which is what ghost is for. */
      const all = el('button', 'rux--btn rux--btn--ghost rux--layout--size-md', `Print all ${every.length}`);
      all.type = 'button';
      all.title = 'Every envelope on this trip';
      all.setAttribute('aria-label', `Print every envelope on this trip, ${every.length} in all`);
      all.addEventListener('click', () => {
        printingAll = true;
        drawAll();
        requestAnimationFrame(() => window.print());
      });
      actions.push(all);
    }

    /* The prints are one thing in the toolbar, so a row that has to break
       keeps them together rather than stranding Print all under its own
       Print. One of them alone needs no group. */
    if (actions.length > 1) {
      const prints = el('div', 'scheduler-print__prints');
      prints.append(...actions);
      nodes.push(prints);
    } else nodes.push(...actions);

    if (host) host.setFormControls(nodes, menu, steps);
    else controls.replaceChildren(...nodes);
  }

  /* WHAT A TRIP OFFERS THE HUB: its buses, and its legs. A trip is not an
     assignment, and this is the step between "the forms for this trip" and
     "the envelope for bus 12 on the way out"; a form that binds the trip and
     the leg stops one step earlier, at "the itinerary for the way out", so the
     legs are read beside the buses. */
  const TRIP_BUSES_QUERY = 'id,destination,trip_stops(leg),'
    + 'trip_assignments(id,leg,position,buses:bus_id(number),trip_drivers(id,driver_id))';

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
    return { destination: data.destination, buses, legs: legsOf(data) };
  }

  const tileLink = (href, text) => {
    const link = el('a', 'rux--link scheduler-print__tile-link', text);
    link.href = href;
    return link;
  };

  async function showHub() {
    setPaper(null);
    fitPaper();
    host?.setViewerHead('Forms');
    const trip = params.get('trip');
    title.textContent = 'Forms';
    bar.hidden = Boolean(host);
    hub.hidden = false;
    sheet.replaceChildren();

    const found = trip ? await tripBuses(trip) : null;
    if (found?.destination) {
      title.textContent = `Forms — ${found.destination}`;
      host?.setViewerHead(`Forms — ${found.destination}`);
    }

    const list = document.createDocumentFragment();
    for (const form of FORMS) {
      const tile = el('div', 'rux--tile');
      tile.appendChild(el('h2', 'scheduler-print__tile-name', form.name));
      tile.appendChild(el('p', 'scheduler-print__tile-blurb', form.blurb));

      const query = id => `print.html?form=${form.id}${id ? `&assignment=${encodeURIComponent(id)}` : ''}`;
      const legQuery = leg =>
        `print.html?form=${form.id}&trip=${encodeURIComponent(trip)}&leg=${leg}`;

      const blankLink = () =>
        tileLink(`print.html?form=${form.id}&blank=1`, 'Open a blank one');

      if (form.binds === null) {
        tile.appendChild(tileLink(`print.html?form=${form.id}`, 'Open a blank one'));
      } else if (!trip) {
        /* No trip sent us here. A form that can be opened on nothing offers
           that; one that cannot says what it still wants rather than opening
           on nothing. */
        if (form.blank) tile.appendChild(blankLink());
        else tile.appendChild(el('p', 'scheduler-print__tile-need', 'Open it from a trip on the board.'));
      } else if (found.why) {
        tile.appendChild(el('p', 'scheduler-print__tile-need', found.why));
      } else if (form.binds === 'trip') {
        // One link per leg, because that is what this form is a copy of.
        const links = el('div', 'scheduler-print__tile-links');
        for (const leg of found.legs) links.appendChild(tileLink(legQuery(leg), legName(leg)));
        if (form.blank) links.appendChild(blankLink());
        tile.appendChild(links);
      } else if (!found.buses.length) {
        tile.appendChild(el('p', 'scheduler-print__tile-need', 'No bus on this trip has a driver yet.'));
      } else {
        const links = el('div', 'scheduler-print__tile-links');
        for (const a of found.buses) links.appendChild(tileLink(query(a.id), busLabel(a)));
        if (form.blank) links.appendChild(blankLink());
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

  // The layout the address asks for, where the form draws more than one.
  const layoutWanted = form => (form.layouts?.some(l => l.id === params.get('layout'))
    ? params.get('layout') : form.layouts?.[0]?.id);

  const notConnected = () => say('warning', 'Not connected.',
    'This page reads the schedule through the account script, which a local preview leaves off. The cloud preview is http://localhost:8641/.');

  // The form on the sheet, once its subject has answered.
  function show(form, subject, copies, chosen, blank) {
    current = {
      form,
      subject,
      copies,
      chosen,
      every: copies,
      blank: Boolean(blank),
      layout: layoutWanted(form),
    };
    buildControls();
    draw();
  }

  /* THE TRIP AND ITS STOPS, for a form that binds the trip and the leg rather
     than a bus. `?trip=` is the way in, with the leg in `?leg=`; `?assignment=`
     opens it too, resolving the trip and the leg from the bus, so a way in
     that holds a bar's id needs no second address.

     The columns a tick is written to come from the form's own `marks`, so the
     registry stays the one place either is named. */
  const TRIP_COLUMNS = [
    'id', 'customer', 'destination', 'trip_type',
    'start_date', 'end_date', 'return_start_date', 'return_end_date',
    'booking_contact_name', 'booking_contact_phone',
    'trip_contact_1_name', 'trip_contact_1_phone',
    'trip_contact_2_name', 'trip_contact_2_phone',
    'trip_contact_3_name', 'trip_contact_3_phone',
    'trip_contact_4_name', 'trip_contact_4_phone',
    'trip_contact_5_name', 'trip_contact_5_phone',
    'trip_stops(id,position,leg,type,label,name,address,depart_prev,arrive,spot,miles,drive)',
  ];

  const tripQuery = form => [
    ...TRIP_COLUMNS,
    ...(form.marks?.by === 'leg' ? LEGS.map(leg => `${form.marks.column}_${leg}`) : []),
  ].join(',');

  async function showTripForm(form) {
    const client = window.Rux?.account?.client;
    if (!client) return notConnected();

    const assignmentId = params.get('assignment');
    const tripId = params.get('trip');
    if (!assignmentId && !tripId) {
      return say('info', `This ${form.name.toLowerCase()} needs a trip.`,
        'Open it from the Forms page, or from a trip bar on the board.');
    }

    say('info', 'Loading…', '');
    const columns = tripQuery(form);
    const { data, error } = assignmentId
      ? await client.from('trip_assignments')
        .select(`id,leg,buses:bus_id(number),trips:trip_id(${columns})`)
        .eq('id', assignmentId).maybeSingle()
      : await client.from('trips').select(columns).eq('id', tripId).maybeSingle();
    if (error) return say('error', 'The schedule did not answer.', error.message);

    const trip = assignmentId ? data?.trips : data;
    if (!trip) {
      return say('error', assignmentId
        ? 'That bus is not on the schedule any more.'
        : 'That trip is not on the schedule any more.', '');
    }

    // The assignment carries its own leg, so the copy it belongs to is the one
    // that names a bus however the page was opened.
    const assignment = assignmentId ? { ...data, leg: data.leg || 'outbound' } : null;
    const asked = LEGS.includes(params.get('leg')) ? params.get('leg') : null;
    const subject = {
      trip,
      assignment,
      leg: asked || assignment?.leg || 'outbound',
      seat: null,
    };
    const copies = form.copies(subject);
    show(form, subject, copies, Math.max(0, copies.findIndex(c => c.leg === subject.leg)));
  }

  /* ONE BUS ON ONE LEG, for a form that binds it: a bar on the board is that,
     and a round trip's legs carry different dates, a different bus and a
     different crew. Reading `trip_assignments` by id answers all of it in one
     request. */
  async function showBusForm(form) {
    const assignmentId = params.get('assignment');
    if (!assignmentId) {
      return say('info', `This ${form.name.toLowerCase()} needs a bus.`,
        'Open it from a trip bar on the board, which is one bus on one leg.');
    }

    const client = window.Rux?.account?.client;
    if (!client) return notConnected();

    say('info', 'Loading…', '');
    // Both at once: the names only decide what a requirement is called, and
    // waiting for them in turn would hold the form back for nothing.
    const [{ data, error }] = await Promise.all([
      client.from('trip_assignments').select(ASSIGNMENT_QUERY).eq('id', assignmentId).maybeSingle(),
      readRequirementNames(client).catch(() => {}),
    ]);
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

    show(form, subject, copies, chosen);

    /* The trip's other buses arrive after the form is on screen, so nothing
       waits on them. The list in the toolbar grows to the whole trip when they
       land, and the envelope on the sheet keeps its place in it: the same seat
       on the same bus, further down a longer list. */
    const shown = current.every[current.chosen];
    current.every = await everyCopyOnTrip(client, data.trips.id, form, subject, copies);
    current.chosen = Math.max(0, current.every.findIndex(copy =>
      String(copy.seat?.id) === String(shown?.seat?.id)
      && String(copy.assignment?.id) === String(shown?.assignment?.id)));
    buildControls();
  }

  async function showForm(form) {
    title.textContent = form.name;
    setPaper(form);
    // The paper is named now, so the sheet can be fitted to the room it has.
    fitPaper();
    bar.hidden = Boolean(host);
    hub.hidden = true;

    /* A BLANK ONE, asked for in the address. Every field is empty and every
       one of them can be typed into before it is printed; nothing is saved and
       nothing is read, so this needs no trip and no connection. It is the
       spare form in the drawer, and the reason the Forms page is worth a way
       in of its own. */
    if (params.get('blank') && form.blank) {
      // An empty assignment rather than none: a blank form is drawn by the
      // same code as a filled one, which reads the bus and its seats.
      const subject = { trip: {}, assignment: {}, leg: 'outbound', seat: null };
      return show(form, subject, [subject], 0, true);
    }

    if (form.binds === 'trip') return showTripForm(form);
    return showBusForm(form);
  }

  const form = formOf(params.get('form'));
  if (!form) void showHub();
  else void showForm(form);
})();
