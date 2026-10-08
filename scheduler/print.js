/* THE FORMS THIS APP FILLS IN. One page renders every one of them, named by
   `?form=`; with no form named it is the hub, a row per form.

   A FORM IS A REGISTRY ENTRY, and FORMS below is the one source for the hub,
   the ?form= values and, later, the board's menu -- the way SHORTCUT_ACTIONS
   in data.js already feeds both the shortcut bar and the right-click menu.
   An entry says what it binds to, what a print marks, and how it draws:

     id       the ?form= value, and the class prefix its markup uses
     name     what the hub and the viewer's head call it
     columns  the trip columns this form alone reads, beyond the shared list
     binds    'assignment' | 'assignment+seat' | 'trip' | 'trip+leg' | 'week' | null
     marks    the tick a print offers: { table, column, by }, or left out
     page     the paper it is printed on: size, width, height, ink margin, and
              `exact` where the form must not run past one sheet of it
     fileName (subject) -> the name Save as PDF offers, or left out
     copies   the subjects this one binding covers, which the toolbar's list
              and Print all start from and grow past
     typed    { fields, always }: what can be typed into, and whether a filled
              copy can be too or only a blank one
     render   (subject) -> an element, or a list of them, one per sheet

   A FORM COMPUTES NOTHING. Every number arrives worked out: a quote's from
   quote.js, which holds the office spreadsheet's formulas, and a leg's miles
   and hours from the Route tab. A second implementation of the same
   arithmetic is a second answer waiting to disagree with the screen. The
   one sum on a form is the quote's, over lines typed on the sheet itself,
   which no screen holds.

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

  // A phone number as the forms print it, from phone.js.
  const showPhone = window.SchedulerPhone.format;

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  /* mm/dd/yyyy, split rather than passed to `new Date()`, which reads a bare
     date as UTC midnight and prints the day before west of Greenwich. Same
     rule as data.js's `mdy`. */
  // An ISO date moved by whole days.
  const dayShift = (d, n) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || ''));
    if (!m) return d;
    const t = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + n));
    return t.toISOString().slice(0, 10);
  };
  const mdy = d => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || '').trim());
    return m ? `${m[2]}/${m[3]}/${m[1]}` : (d || '');
  };

  /* One day, or the first and the last, in the one short form every box on
     every form takes. A sentence, like the quote's description, keeps the
     long form. */
  const dayRange = (from, to) => [mdy(from), to && to !== from ? mdy(to) : '']
    .filter(Boolean).join(' – ');

  /* THE ITINERARY'S DATES, in words, because a sheet read down a column of
     days reads "Wednesday, Aug 26" faster than a row of numbers. The year is
     printed once, in the head, and each end names its own month so neither
     is read against the other: "Wed, Aug 26 – Sat, Aug 29, 2026", or both
     years when the trip runs into the next. */
  const partsOf = d => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || '').trim());
    if (!m) return null;
    const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return {
      year: m[1],
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
      day: Number(m[3]),
    };
  };
  const dateWords = (from, to) => {
    const a = partsOf(from);
    const b = to && to !== from ? partsOf(to) : null;
    if (!a) return mdy(from);
    const day = p => `${p.weekday}, ${p.month} ${p.day}`;
    if (!b) return `${day(a)}, ${a.year}`;
    if (a.year !== b.year) return `${day(a)}, ${a.year} – ${day(b)}, ${b.year}`;
    return `${day(a)} – ${day(b)}, ${a.year}`;
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

  /* A drive as `trip_stops` keeps it, "H:MM", in words: "4 h 03 min", "4 h",
     or "31 min". Every part is named, so no drive reads as a time of day. */
  const driveWords = t => {
    const m = /^(\d+):([0-5]\d)$/.exec(String(t || '').trim());
    if (!m) return '';
    const hours = Number(m[1]);
    const mins = Number(m[2]);
    if (!hours && !mins) return '';
    return hours ? (mins ? `${hours} h ${String(mins).padStart(2, '0')} min` : `${hours} h`) : `${mins} min`;
  };

  // Whole miles, as the Route tab gives them.
  const milesWords = v => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? `${Math.round(n)} mi` : '';
  };

  /* The company's own line, at the head of every form. It is here rather than
     read from Settings because there is no Settings page yet to hold the yard. */
  const COMPANY = {
    address: '2801 Zinnia Avenue, McAllen, TX 78504',
    phones: '(956) 994-1169 / Fax 994-9491 / Cell 648-9691',
    // The quote's letterhead carries it, and its signature line asks for the
    // signed copy back at it. The driver's forms have no use for it.
    email: 'e-escamilla@sbcglobal.net',
  };

  /* The contact the envelope carries is the trip's day-of contact, first
     filled of the five. The booking contact is the office's and is used only
     where no day-of contact is set, because this sheet travels with the
     driver. */
  function contactOf(trip) {
    for (let n = 1; n <= 5; n++) {
      const name = trip[`trip_contact_${n}_name`] || trip[`c${n}`]?.name;
      const phone = trip[`trip_contact_${n}_phone`] || trip[`c${n}`]?.phone;
      if (name || phone) return { name: name || '', phone: showPhone(phone) };
    }
    return {
      name: trip.booking_contact_name || trip.contacts?.name || '',
      phone: showPhone(trip.booking_contact_phone || trip.contacts?.phone),
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
  // drivers row and the Buses tab's tiles already use.
  const SEAT_ORDER = ['driver', 'co-driver', 'relief-start', 'relief-end'];
  const seatsOf = assignment => [...(assignment.trip_drivers || [])]
    .filter(seat => seat.driver_id && nameOf(seat))
    .sort((a, b) => SEAT_ORDER.indexOf(a.role || 'driver') - SEAT_ORDER.indexOf(b.role || 'driver'));

  /* The short name first, the way the board's bars and the Buses tab name a
     driver: it is the name the office says out loud, and it holds one line in
     a cell an envelope has only so much of. The full name is what the record
     is under, so it stands in for a driver the office never gave a short one. */
  const nameOf = seat => String(
    seat?.drivers?.short_name || seat?.drivers?.name || seat?.name || '',
  ).trim();

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
  const NEED_ICONS = window.SchedulerRequirementIcons || {};
  const NEED_ORDER = ['pax56', 'oneWay', 'sleeper', 'adaLift', 'fuelCard', 'hotel'];

  /* The requirements the office keeps, id to label, read once a form opens.
     Empty until then, and empty if the read failed. */
  let requirementNames = new Map();
  // And the Material name the list gives each, id to name.
  let requirementIconNames = new Map();

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
      icon: NEEDS[id]?.icon || NEED_ICONS[requirementIconNames.get(id)] || null,
    }));
  }

  /* The office's own requirement list, where rux-ui keeps it. A form asks for
     it once it is on screen; a read that fails leaves the five above naming
     themselves and everything else naming its id. */
  const REQUIREMENTS_KEY = 'requirements-v1';
  async function readRequirementNames(client) {
    const { data } = await client
      .from('settings').select('value').eq('key', REQUIREMENTS_KEY).maybeSingle();
    useRequirements(data?.value);
  }
  /* The office's `route-times-v1`, the pre-trip and post-trip minutes the
     Route tab adds to on duty, which the Detailed itinerary's figures add the
     same way. A read that fails leaves both at nothing, as the Route tab does
     before its settings answer. */
  let routeTimes = { pre: 0, post: 0 };
  async function readRouteTimes(client) {
    const { data } = await client
      .from('settings').select('value').eq('key', 'route-times-v1').maybeSingle();
    const minutes = v => (Number.isFinite(Number(v)) && v !== null && v !== '' && Number(v) >= 0 ? Math.round(Number(v)) : 0);
    routeTimes = { pre: minutes(data?.value?.pre_trip_minutes), post: minutes(data?.value?.post_trip_minutes) };
  }
  /* THE ONE QUOTE RULE THE DETAILED PRICE READS: a rental under these miles
     is priced at the local day rate, not by the mile. quote.js's `rule`
     answers it as the calculator does, its default while none is saved;
     unread, no rental is called local. */
  let quoteRules = { localUnder: null };
  async function readQuoteRules(client) {
    const { data, error } = await client.from('quote_rates').select('value').eq('key', 'trip_local_under').maybeSingle();
    if (error || !window.Rux?.quote) return;
    const n = Number(data?.value);
    quoteRules = { localUnder: window.Rux.quote.rule(data && Number.isFinite(n) ? { trip_local_under: n } : {}, 'trip_local_under') };
  }
  // The list itself, however it was read: the driver's page has it from the
  // link's own function, since a driver cannot read `settings`.
  function useRequirements(value) {
    if (!Array.isArray(value)) return;
    const rows = value.filter(r => r && typeof r.id === 'string');
    requirementNames = new Map(rows.filter(r => r.label).map(r => [r.id, String(r.label)]));
    requirementIconNames = new Map(rows.filter(r => r.icon).map(r => [r.id, String(r.icon)]));
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
    // The day, not a section, so it is no heading.
    head.appendChild(el('p', 'scheduler-envelope__day', weekdayOf(start)));
    const logo = el('img', 'scheduler-envelope__logo');
    logo.src = '/scheduler/brand/logo.svg';
    logo.alt = '';
    head.appendChild(logo);
    head.appendChild(el('p', 'scheduler-envelope__line', COMPANY.address));
    head.appendChild(el('p', 'scheduler-envelope__line', COMPANY.phones));
    return head;
  }

  /* What the driver calls the vehicle: a coach is the Bus, any other type
     goes by its own name, as Van, and a vehicle with no type is the Unit. */
  function unitWord(type) {
    const name = String(type || '').trim();
    if (!name) return 'Unit';
    return name.toLowerCase() === 'coach' ? 'Bus' : name;
  }

  // The vehicle's number, blank where the number is only its type's name.
  function unitNumber(bus) {
    const number = String(bus?.number ?? '').trim();
    return number.toLowerCase() === String(bus?.type || '').trim().toLowerCase() ? '' : number;
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
      ? { label: roleName(seat.role), name: nameOf(seat) }
      : { label: 'Driver', name: nameOf(driver) };
    const other = seat && (seat.role || 'driver') !== 'driver'
      ? { label: 'Driver', name: nameOf(driver) }
      : { label: roleName(relief?.role || 'co-driver'), name: nameOf(relief) };

    frag.appendChild(row(
      cell(unitWord(assignment.buses?.type), unitNumber(assignment.buses)),
      cell(mine.label, mine.name),
      cell(other.label, other.name),
    ));

    const stop = pickupOf(trip, leg);
    const relieving = seat && isRelief(seat.role);
    const start = leg === 'return' ? (trip.return_start_date || trip.end_date) : trip.start_date;
    const end = leg === 'return' ? (trip.return_end_date || trip.end_date) : trip.end_date;
    const multiDay = start && end && start !== end;

    frag.appendChild(row(
      cell('Trip date', mdy(start)),
      ...(multiDay ? [cell('Return', mdy(end))] : []),
      relieving
        ? cell('Swap time', clock(seat.report_time))
        : cell('Spot time', clock(stop?.spot || trip.spot_time || trip.departure_time)),
    ));

    frag.appendChild(row(cell('Pickup address', shortAddress(stop?.address))));
    return frag;
  }

  /* The lines the driver fills in after the trip: what the ELD and the card
     did, and what the trip cost. Always blank. */
  const TALLY = [
    { label: 'ELD verified', choices: ['DRV', 'OFC'] },
    { label: 'Hotel', money: true },
    { label: 'ELD backup used', choices: ['Yes', 'No'] },
    { label: 'Diesel/blue DEF', money: true },
    /* Which card, written in. A number here is the yes, so the pair of boxes
       that used to ask it went: a card written down and a card ticked for are
       the same fact asked twice. It is named as the requirement below it is
       named, because one object gets one name on a page. The line under it
       does not repeat that name: what else would have been received. */
    { label: 'Fuel card', fill: true },
    { label: 'Repairs', money: true },
    { label: 'Received by', fill: true },
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
    /* A part-time driver's copy adds the hours-of-service record they sign,
       which the board asks for on their bus. It is theirs alone, so the other
       seats' copies leave it off. */
    const needs = [...needsOf(trip), ...(seat?.drivers?.employment_type === 'part-time'
      ? [{ id: 'hos', label: 'Hours of service', icon: '#m-schedule' }] : [])];
    // The label names what is under it. A requirement is something the driver
    // must do, and calling it a note demotes it; but an empty box headed
    // "requirements" reads as a form that ran out, and the hand that writes
    // in it is writing a note. A driver holds one envelope, never both.
    box.appendChild(el('span', 'scheduler-envelope__label',
      needs.length ? 'Requirements' : 'Notes'));

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
        cell('Contact', contact.name),
        cell('Phone', contact.phone),
      ));
      card.appendChild(table);
      card.appendChild(envelopeLog());
      card.appendChild(envelopeNeeds(trip, seat));
      card.appendChild(envelopeTally());
      return card;
    }

    table.appendChild(row(cell('Destination', trip.destination || '')));
    table.appendChild(row(
      cell('Contact', contact.name),
      cell('Phone', contact.phone),
    ));
    // Last in the table, because it is the one row filled in after the trip.
    table.appendChild(row(
      cell('Starting odometer', '', true),
      cell('Ending odometer', '', true),
    ));
    card.appendChild(table);
    card.appendChild(envelopeTally());
    card.appendChild(envelopeNeeds(trip, seat));
    return card;
  }

  /* ── The hours-of-service record ──────────────────────────────────────────
     What a driver who is new to the company, or drives for it now and then,
     signs before a trip: the hours on duty on each of the seven days before
     it, and when the last shift ended. It prints the driver's full name, as
     the record is under it, the seven dates in order, the oldest first and
     the day before the leg starts last, and the leg's first day beside the
     signature, the day it is signed; the hours, the signature and the time
     are the driver's to write.

     IT TAKES THE TOP HALF OF A LETTER SHEET and leaves the rest white, which
     is the half the office kept when it printed the form two to a page. */

  const HOS_DAYS = 7;

  // A line to write on, holding what the form already knows, if anything.
  const hosFill = (name, value) => {
    const node = el('span', 'scheduler-hos__fill', value || '');
    node.dataset.name = name;
    return node;
  };

  // A label and its line, on one row.
  const hosField = (label, name, value, cls) => {
    const node = el('p', `scheduler-hos__field${cls ? ` ${cls}` : ''}`);
    node.append(el('span', 'scheduler-hos__label', label), hosFill(name, value));
    return node;
  };

  function hoursOfService(subject) {
    const { trip, leg, seat } = subject;
    const start = leg === 'return' ? (trip.return_start_date || trip.end_date) : trip.start_date;
    const card = el('article', 'scheduler-form scheduler-hos');
    const half = el('div', 'scheduler-hos__half');
    card.appendChild(half);

    const head = el('header', 'scheduler-hos__head');
    const logo = el('img', 'scheduler-hos__logo');
    logo.src = '/scheduler/brand/logo.svg';
    logo.alt = 'Escamilla Tour Buses';
    const words = el('div', 'scheduler-hos__head-words');
    words.append(
      el('h2', 'scheduler-hos__title', 'Hours-of-service record for first time or intermittent drivers'),
      el('p', 'scheduler-hos__line', `${COMPANY.address} · Ph. ${COMPANY.phones}`),
    );
    head.append(logo, words);
    half.appendChild(head);

    const driver = String(seat?.drivers?.name || nameOf(seat)).trim();
    half.appendChild(hosField('Driver name:', 'Driver name', driver, 'scheduler-hos__driver'));

    const box = el('div', 'scheduler-hos__box');
    const body = el('div', 'scheduler-hos__body');

    const told = el('div', 'scheduler-hos__instructions');
    told.appendChild(el('p', 'scheduler-hos__instructions-title', 'Instructions: Fill out and sign this form to show:'));
    const list = el('ul', 'scheduler-hos__instructions-list');
    list.append(
      el('li', null, 'Total hours on duty (including driving) for each of the last 7 days.'),
      el('li', null, 'The time your last shift ended before starting work today.'),
    );
    told.appendChild(list);

    const table = el('table', 'scheduler-hos__days');
    const headRow = el('tr');
    for (const name of ['Day', 'Date', 'Time on duty']) headRow.appendChild(el('th', null, name));
    table.appendChild(el('thead')).appendChild(headRow);
    const rows = el('tbody');
    for (let day = 1; day <= HOS_DAYS; day++) {
      const tr = el('tr');
      const th = el('th', null, String(day));
      th.scope = 'row';
      const date = el('td');
      date.appendChild(hosFill(`Date, day ${day}`, start ? mdy(dayShift(start, day - HOS_DAYS - 1)) : ''));
      const hours = el('td');
      hours.appendChild(hosFill(`Time on duty, day ${day}`, ''));
      tr.append(th, date, hours);
      rows.appendChild(tr);
    }
    table.appendChild(rows);
    body.append(told, table);
    box.appendChild(body);

    const totals = el('div', 'scheduler-hos__totals');
    totals.append(
      hosField('Add the total time on duty for the last 7 days:', 'Total time on duty, last 7 days', ''),
      hosField('Time released from duty on the last workday:', 'Time released from duty', ''),
    );
    box.appendChild(totals);

    box.appendChild(el('p', 'scheduler-hos__certify',
      'I hereby certify that the information contained herein is true to the best of my knowledge and belief.'));

    // The driver's, written when they sign, on the day the leg starts.
    const sign = el('div', 'scheduler-hos__sign');
    sign.append(
      hosField('Signature:', 'Signature', ''),
      hosField('Date & time:', 'Date and time', start ? mdy(start) : ''),
    );
    box.appendChild(sign);
    half.appendChild(box);
    return card;
  }

  /* One copy per filled seat, told apart as the envelope's are: the bus, the
     leg where it is the way back, the seat and the driver's full name. */
  const seatCopyName = subject => [
    subject.assignment?.buses?.number != null ? String(subject.assignment.buses.number) : null,
    subject.leg === 'return' ? 'Return' : null,
    roleName(subject.seat?.role),
    String(subject.seat?.drivers?.name || nameOf(subject.seat)).trim() || null,
  ].filter(Boolean).join(' · ');

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
  /* `day` is the row's own date. A departure on another day, the morning after
     a night at a hotel or the end of a stay of nights, carries its weekday; a
     stop left the moment it is reached, a drop-off, prints its arrival alone. */
  function itineraryTimes(stop, next, day) {
    const leaveDay = next?.depart_prev_date || null;
    const after = next?.depart_prev || null;
    const afterDay = after && leaveDay && day && leaveDay !== day ? leaveDay : null;
    if (stop.type === 'sleeper') return [['Rest', stop.depart_prev], ['Up', stop.arrive], ['Dep', after, afterDay]];
    if (stop.type === 'pickup') return [['Spot', stop.spot], ['Dep', after, afterDay]];
    const same = stop.arrive && after && String(stop.arrive).slice(0, 5) === String(after).slice(0, 5) && !afterDay;
    return same ? [['Arr', stop.arrive]] : [['Arr', stop.arrive], ['Dep', after, afterDay]];
  }

  const ITINERARY_TITLE = {
    pickup: 'Pickup',
    stop: 'Stop',
    sleeper: 'Rest',
  };

  /* A `day` row is the itinerary's own day divider, and its `label` is the
     day: an ISO date where rux-ui's import had one, free text where the
     customer wrote "Day 1". Its `name` is a marker and never printed. */
  const dayName = label => {
    const day = weekdayOf(label);
    const at = partsOf(label);
    return day ? `${day}, ${at.month} ${at.day}` : String(label || '').trim();
  };

  const timeCell = lines => {
    const td = el('td', 'scheduler-driver-itinerary__time scheduler-driver-itinerary__typed');
    for (const [label, time, day] of lines) {
      if (!time) continue;
      const at = el('span', 'scheduler-driver-itinerary__at');
      at.appendChild(el('span', 'scheduler-driver-itinerary__at-label', label));
      at.appendChild(document.createTextNode(clock(time)));
      if (day) at.appendChild(el('span', 'scheduler-driver-itinerary__at-day', weekdayOf(day).slice(0, 3)));
      td.appendChild(at);
    }
    return td;
  };

  const textCell = (cls, text) =>
    el('td', `scheduler-driver-itinerary__${cls} scheduler-driver-itinerary__typed`, text || '');

  /* THE LEG INTO THIS STOP, under its name: the miles and the drive the Route
     tab worked out and wrote on the row, headed Drive so they read as the way
     here rather than a fact about the place. The pickup's is the drive from
     the yard, and says so, since on a split trip's pickup leg it is the
     longest of the day. */
  function locationCell(stop, wait = null) {
    const td = textCell('loc', stop.name || ITINERARY_TITLE[stop.type] || '');
    const words = [milesWords(stop.miles), driveWords(stop.drive)].filter(Boolean).join(' · ');
    const head = stop.type === 'pickup' ? 'Drive from yard' : stop.type === 'return' ? 'Drive to yard' : 'Drive';
    if (words) td.appendChild(el('span', 'scheduler-driver-itinerary__leg', `${head} ${words}`));
    if (wait) td.appendChild(el('span', 'scheduler-driver-itinerary__leg scheduler-driver-itinerary__wait', wait));
    return td;
  }

  /* The street on one line and the city, state and ZIP on the next, so no
     ZIP is left alone on a line and every row's address has one shape. An
     address of two parts or fewer has no street and stays on one line. */
  function addressLines(text) {
    const parts = shortAddress(text).split(', ').filter(Boolean);
    if (parts.length < 3) return parts.join(', ');
    return `${parts.slice(0, -2).join(', ')}\n${parts.slice(-2).join(', ')}`;
  }

  /* One line of the table: when, where and the address. `late` names the day
     of a time past midnight on a one-day leg, by the time's label. */
  function itineraryRow(stop, next, day = null, wait = null, late = null) {
    const tr = el('tr');
    tr.appendChild(timeCell(itineraryTimes(stop, next, day)
      .map(([label, time, on]) => [label, time, on || late?.get(label) || null])));
    tr.appendChild(locationCell(stop, wait));
    tr.appendChild(textCell('addr', addressLines(stop.address)));
    return tr;
  }

  /* THE YARD, AT EITHER END OF A DETAILED SHEET: when the bus leaves it and
     when it is back, with the drive home under the name, which the sheet the
     driver gets leaves off. The yard is named from the leg's `return` row,
     where the Route tab keeps it. A time on another day than the row's
     carries that day, as a stop's departure does. */
  function yardRow(label, time, onDay, day, back) {
    const tr = el('tr', 'scheduler-driver-itinerary__yard');
    tr.appendChild(timeCell([[label, time, onDay && day && onDay !== day ? onDay : null]]));
    const place = { type: label === 'Dep' ? 'yard' : 'return', name: back?.name || 'Yard',
      miles: label === 'Dep' ? null : back?.miles, drive: label === 'Dep' ? null : back?.drive };
    tr.appendChild(locationCell(place));
    tr.appendChild(textCell('addr', addressLines(back?.address || COMPANY.address)));
    return tr;
  }

  // A wait as the Route tab counts it: how long, and whether it is on duty.
  const DWELL_WORDS = { on: 'On duty', off: 'Off duty', sleeper: 'Sleeper berth' };
  const waitWords = (minutes, dwell) => (minutes
    ? `Waits ${window.SchedulerRouteFigures.hm(minutes)} · ${DWELL_WORDS[dwell] || DWELL_WORDS.on}` : null);

  /* THE LEG'S FIGURES, from route-figures.js, the Route tab's own sum: when
     the bus leaves the yard, is spotted and is back, which the yard and
     pickup rows carry, then Miles, Drive, On duty and Less rest, one row on a
     one-day leg; on a longer leg each day's
     on its own heading, and the Total alone after the last day. Nothing on
     the sheet is added up here. */
  function dayWords(fig, day) {
    const c = fig?.days ? fig.each[fig.dates.indexOf(day)] : null;
    if (!c) return '';
    const [miles, drive, onDuty, lessRest] = c;
    return [
      c.miles ? `${miles} mi` : null,
      drive !== '—' ? `${drive} drive` : null,
      c.status ? `on duty ${c.status.toLowerCase()}` : onDuty !== '—' ? `${onDuty} on duty` : null,
      !c.status && lessRest !== '—' && lessRest !== onDuty ? `${lessRest} less rest` : null,
    ].filter(Boolean).join(' · ');
  }

  function detailedTotals(fig) {
    const t = el('table', 'scheduler-driver-itinerary__table scheduler-driver-itinerary__totals');
    t.appendChild(el('caption', 'rux--visually-hidden', 'Miles and hours'));
    const heads = [...(fig.days ? [''] : []), 'Miles', 'Drive', 'On duty', 'Less rest'];
    const head = el('thead');
    const hr = el('tr');
    for (const label of heads) {
      const th = el('th', null, label);
      th.scope = 'col';
      hr.appendChild(th);
    }
    head.appendChild(hr);
    const body = el('tbody');
    const rows = fig.days ? [['Total', ...fig.total]] : [[...fig.total]];
    rows.forEach(cells => {
      const tr = el('tr', fig.days ? 'scheduler-driver-itinerary__total' : null);
      for (const c of cells) tr.appendChild(el('td', null, c));
      body.appendChild(tr);
    });
    t.append(head, body);
    return t;
  }

  /* THE LEG'S PRICE, the Billing tab's quote lines as they were saved: the
     bus rental with the miles, mileage rate and dead miles it was priced on,
     then each line added to it, a second driver, a relief driver, the hotel,
     a discount, and the total. A drop-off and pickup prints the leg's lines
     and the lines of the whole trip, with the trip's total under its own.
     Nothing is priced here. A rental priced on other miles than the route
     has now says so, since the price moves with the itinerary. */
  const LINE_NAMES = { rental: 'Bus rental', second_driver: 'Second driver', relief: 'Relief driver',
    discount: 'Discount', hotel: 'Hotel', other: 'Other' };
  const usd = n => `${n < 0 ? '−' : ''}$${Math.abs(n).toLocaleString('en-US',
    { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const num = v => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
  const miles = n => `${Math.round(n).toLocaleString('en-US')} mi`;

  function detailedPrice(subject, fig) {
    const { trip, leg } = subject;
    const split = trip.trip_type === 'dropoff_pickup';
    const saved = (trip.trip_quote_lines || []).slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const lines = split ? saved.filter(l => !l.leg || l.leg === leg) : saved;
    const quoted = num(trip.quoted_price);
    if (!lines.length && !quoted) return null;

    const t = el('table', 'scheduler-driver-itinerary__table scheduler-driver-itinerary__price');
    t.appendChild(el('caption', 'rux--visually-hidden', 'Price'));
    const cols = el('colgroup');
    for (let i = 0; i < 3; i += 1) cols.appendChild(el('col'));
    t.appendChild(cols);
    const head = el('thead');
    const hr = el('tr');
    for (const label of ['Price', 'Priced on', 'Amount']) {
      const th = el('th', null, label);
      th.scope = 'col';
      hr.appendChild(th);
    }
    head.appendChild(hr);
    const body = el('tbody');
    // A cell of a line over a quieter one, as a stop's name sits over its drive.
    const twoLines = (top, under) => {
      const td = el('td', null, top || '');
      if (under) td.appendChild(el('span', 'scheduler-driver-itinerary__leg', under));
      return td;
    };
    const row = (name, note, basis, count, amount, cls) => {
      const tr = el('tr', cls || null);
      tr.append(twoLines(name, note), twoLines(basis, count), el('td', null, amount));
      body.appendChild(tr);
    };

    const routeMiles = num(fig?.total?.miles);
    const oneLeg = !split || legsOf(trip).length === 1;
    /* The days a rental is priced on, the leg's on a drop-off and pickup and
       the trip's otherwise, as the calculator counts them: a long trip's
       extra days are part of its price beside the miles. */
    const from = split && leg === 'return' ? trip.return_start_date : trip.start_date;
    const to = (split && leg === 'return' ? trip.return_end_date : trip.end_date) || from;
    const dayCount = from && to ? Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1) : null;
    for (const l of lines) {
      const qty = num(l.quantity);
      const cost = num(l.cost);
      const amount = num(l.amount) ?? (cost === null ? null : (qty ?? 1) * cost);
      const kind = LINE_NAMES[l.kind] ? l.kind : 'other';
      const deadDiscount = kind === 'discount' && /dead miles/i.test(l.description || '');
      const name = deadDiscount ? 'Dead miles discount' : kind === 'other' ? (l.item || LINE_NAMES.other) : LINE_NAMES[kind];
      const note = split && !l.leg ? 'Whole trip' : kind === 'other' ? l.description || '' : '';
      let basis = '';
      if (kind === 'rental') {
        const m = num(l.miles);
        const rate = num(l.rate);
        const dead = num(l.dead_miles) ?? 0;
        // A typed price came from neither rate, so it names neither.
        const local = m !== null && quoteRules.localUnder !== null && m < quoteRules.localUnder;
        basis = [
          m === null ? null : miles(m),
          m === null || dayCount === null ? null : `${dayCount} ${dayCount === 1 ? 'day' : 'days'}`,
          l.cost_typed ? null : local ? 'local day rate'
            : rate === null ? null : `at $${rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mi`,
          m === null ? null : dead > 0 ? `${miles(dead)} dead` : 'no dead miles',
          l.cost_typed ? 'price typed' : null,
          m !== null && routeMiles !== null && oneLeg && Math.round(m) !== Math.round(routeMiles)
            ? `route now ${miles(routeMiles)}` : null,
        ].filter(Boolean).join(' · ') || 'Price typed';
      }
      const unit = kind === 'rental' ? (qty === 1 ? 'bus' : 'buses')
        : kind === 'second_driver' || kind === 'relief' ? (qty === 1 ? 'driver' : 'drivers') : null;
      const count = cost === null ? 'No cost yet'
        : qty !== null && (qty !== 1 || unit) ? `${qty}${unit ? ` ${unit}` : ''} × ${usd(cost)}` : null;
      row(name, note, basis || count, basis ? count : null, amount === null ? '—' : usd(amount));
    }
    if (!lines.length) row('Quoted price', 'No quote lines', '', null, usd(quoted));

    // The total of the lines printed; on a split leg, the trip's too.
    const sum = lines.reduce((n, l) => n + (num(l.amount) ?? (num(l.cost) ?? 0) * (num(l.quantity) ?? 1)), 0);
    const total = lines.length ? Math.round(sum * 100) / 100 : quoted;
    row(split ? `${legName(leg)} total` : 'Total', '', '', null, usd(total), 'scheduler-driver-itinerary__total');
    if (split && quoted !== null && quoted !== total) row('Trip total', '', '', null, usd(quoted), 'scheduler-driver-itinerary__total');
    t.append(head, body);
    return t;
  }

  /* A row with nothing in it, for the Add a row button and for a blank form.
     It has no type either, so the Location column stays empty rather than
     naming what the row would have been. */
  const blankRow = () => itineraryRow({}, null);

  /* THE APP BAR ON PAPER: the logo's one-line wordmark and the form's name
     past a rule on the left, the days the trip runs on the right, at the
     screen header's height and type. Under it, across the full width so a
     long one keeps to one line, where the group is going. Both trip lines can
     be typed over like any other line of the form. No address or phones:
     the sheet goes to the company's own driver, who has both. */
  function itineraryHead(subject, name = 'Trip itinerary', detailed = false) {
    const { trip, leg } = subject;
    const start = leg === 'return' ? (trip.return_start_date || trip.end_date) : trip.start_date;
    const end = leg === 'return' ? (trip.return_end_date || trip.end_date) : trip.end_date;
    const typed = (cls, name, value) => {
      const node = el('span', `scheduler-driver-itinerary__${cls} scheduler-driver-itinerary__typed`, value || '');
      node.dataset.name = name;
      return node;
    };
    const head = el('header', 'scheduler-driver-itinerary__head');
    const brand = el('div', 'scheduler-driver-itinerary__brand');
    // The logo drawing with its TOUR BUSES line cut off, as the header shows it.
    const mark = el('span', 'scheduler-driver-itinerary__mark');
    const logo = el('img', 'scheduler-driver-itinerary__logo');
    logo.src = '/scheduler/brand/logo.svg';
    logo.alt = 'Escamilla Tour Buses';
    mark.appendChild(logo);
    brand.appendChild(mark);
    brand.appendChild(el('h2', 'scheduler-driver-itinerary__name', name));
    head.appendChild(brand);
    head.appendChild(typed('dates', 'Date', start ? dateWords(start, end) : ''));
    // The Detailed layout names the destination beside the client instead.
    if (detailed) return head;

    const where = el('div', 'scheduler-driver-itinerary__where');
    where.appendChild(destinationWords(typed('destination', 'Destination', ''), trip));
    const frag = document.createDocumentFragment();
    frag.append(head, where);
    return frag;
  }

  /* A note the office wrote in brackets after the place, "(Fiesta Texas)",
     is printed smaller, so the place is what the eye lands on. */
  function destinationWords(node, trip) {
    const text = String(trip.destination || '').trim();
    const note = /^(.*?\S)\s*(\(.*\))$/.exec(text);
    if (note) {
      node.append(`${note[1]} `);
      node.appendChild(el('span', 'scheduler-driver-itinerary__note', note[2]));
    } else node.textContent = text;
    return node;
  }


  const headField = (label, value) => {
    const node = el('div', 'scheduler-driver-itinerary__field');
    node.appendChild(el('dt', 'scheduler-driver-itinerary__label', label));
    node.appendChild(el('dd',
      'scheduler-driver-itinerary__value scheduler-driver-itinerary__typed', value || ''));
    return node;
  };

  /* WHO: the client and who to call on the day. No crew, no bus and no leg,
     because the envelope this sheet goes in names all three, and naming them
     twice is one fact with two homes. The Detailed layout, read at a desk,
     puts where the group is going on the same line, in the same type. */
  function itineraryMeta(subject, detailed = false) {
    const { trip } = subject;
    const contact = contactOf(trip);
    const meta = el('dl', 'scheduler-driver-itinerary__meta');
    if (detailed) {
      meta.classList.add('scheduler-driver-itinerary__meta--three');
      const where = headField('Destination', '');
      destinationWords(where.querySelector('dd'), trip);
      meta.appendChild(where);
    }
    meta.appendChild(headField('Client', trip.customer || ''));
    meta.appendChild(headField('Contact',
      [contact.name, contact.phone].filter(Boolean).join(' · ')));
    return meta;
  }

  const COLUMNS = ['Time', 'Location', 'Address'];

  /* Everything on this form can be typed into, so one class marks it and the
     registry entry hands this list to `letThemType`. */
  const ITINERARY_FIELDS = ['.scheduler-driver-itinerary__typed'];

  /* A FILLED FORM HOLDS ITS STOPS AND NOTHING MORE, and a row is added on
     screen when one is wanted. A BLANK ONE IS RULED TO THE FOOT OF THE SHEET,
     because a blank form is handed over and written on by hand; `ruleToFoot`
     adds its rows once the sheet is drawn and can be measured. */
  function itinerary(subject, layout) {
    const { trip, leg } = subject;
    /* THE DETAILED LAYOUT IS THE OFFICE'S: the Simple sheet with the yard at
       both ends, each wait and what it counts as, and the leg's figures. It is
       drawn only for a trip, since every figure comes from its route. */
    const detailed = layout === 'detailed' && !!trip?.id;
    const model = detailed
      ? window.SchedulerRouteFigures.fromStops(trip, leg, trip.trip_stops, routeTimes) : null;
    const fig = model ? window.SchedulerRouteFigures.legFigures(model) : null;
    const waitFor = stop => {
      const entry = model?.list.find(e => e.row === stop);
      return entry ? waitWords(window.SchedulerRouteFigures.waitOf(model, entry), entry.dwell) : null;
    };
    /* THE SIMPLE SHEET NAMES ONE WAIT, the rest the driver takes in the
       sleeper, since it is the plan the day's hours stand on. How long is the
       row's own Arr and Dep. */
    const restFor = stop => (stop.dwell_status === 'sleeper' ? 'Rest in sleeper' : null);
    const card = el('article', 'scheduler-form scheduler-driver-itinerary');
    if (detailed) card.dataset.layout = 'detailed';
    card.appendChild(itineraryHead(subject, detailed ? 'Detailed itinerary' : undefined, detailed));
    card.appendChild(itineraryMeta(subject, detailed));

    /* The run of stops alone: a day row is the old format, never a stop. The
       yard is not printed at either end: the sheet runs from the pickup's
       spot to the drop-off, the part of the day the group sees, and the yard
       row is read only for when the last stop is left. */
    const stops = stopsOf(trip, leg).filter(s => s.type !== 'day');
    /* A leg of more than one day is broken into days by the stops' own
       dates, as the Route tab's Stops list is. A date outside the leg, from a
       trip whose dates moved after its stops were saved, names no day: the
       row stays under the day before it. */
    const legFrom = leg === 'return' ? trip.return_start_date || trip.start_date : trip.start_date;
    const legTo = leg === 'return' ? trip.return_end_date || trip.return_start_date || trip.end_date || legFrom
      : trip.end_date || legFrom;
    const inLeg = d => !!d && (!legFrom || d >= dayShift(legFrom, -1)) && (!legTo || d <= dayShift(legTo, 1));
    const dateOf = s => [s.type === 'pickup' ? s.spot_date : s.arrive_date, s.depart_prev_date].find(inLeg) || null;
    const dates = stops.map(s => (s.type === 'return' ? null : dateOf(s)));
    const manyDays = new Set(dates.filter(Boolean)).size > 1;
    /* A ONE-DAY LEG PAST MIDNIGHT KEEPS NO DATE ON ITS ROWS, so the sheet
       counts the day as the Route tab does: down the times in order, one
       earlier than the one before it is the next day's, and the day the group
       leaves the pickup is the leg's. A time on another day carries its
       weekday, so 1:00 AM is never read as the morning the trip starts. */
    const lateDays = (() => {
      if (manyDays || !legFrom) return null;
      const { toMin } = window.SchedulerRouteFigures;
      let last = null, days = 0, start = null;
      const seen = stops.map((stop, i) => itineraryTimes(stop, stops[i + 1] || null, null).map(([label, time]) => {
        const n = toMin(time);
        if (n == null) return [label, null];
        if (last != null && n < last) days += 1;
        last = n;
        if (stop.type === 'pickup' && label === 'Dep') start = days;
        return [label, days];
      }));
      return seen.map(lines => new Map(lines.filter(([, n]) => n != null && n !== (start ?? 0))
        .map(([label, n]) => [label, dayShift(legFrom, n - (start ?? 0))])));
    })();

    /* A TABLE TO A DAY, its name in the table's head, because the printer
       repeats a head at the top of every sheet the table runs onto: a day cut
       by the fold is named again over the rest of it. The column names head
       only the first table, as they are read once. */
    let body = null;
    const table = day => {
      const t = el('table', 'scheduler-driver-itinerary__table');
      t.appendChild(el('caption', 'rux--visually-hidden', day ? dayName(day) : 'Stops'));
      const cols = el('colgroup');
      for (let i = 0; i < COLUMNS.length; i += 1) cols.appendChild(el('col'));
      t.appendChild(cols);
      const head = el('thead');
      if (!card.querySelector('.scheduler-driver-itinerary__table')) {
        const row = el('tr');
        for (const label of COLUMNS) {
          const th = el('th', null, label);
          th.scope = 'col';
          row.appendChild(th);
        }
        head.appendChild(row);
      }
      if (day) {
        const row = el('tr', 'scheduler-driver-itinerary__day');
        const th = el('th');
        th.scope = 'colgroup';
        th.colSpan = COLUMNS.length;
        const name = el('span', 'scheduler-driver-itinerary__typed', dayName(day));
        name.dataset.name = 'Day';
        th.appendChild(name);
        // On the Detailed layout the day's own figures share its line.
        const figures = detailed ? dayWords(fig, day) : '';
        if (figures) th.appendChild(el('span', 'scheduler-driver-itinerary__day-figures', figures));
        row.appendChild(th);
        head.appendChild(row);
      }
      if (head.rows.length) t.appendChild(head);
      body = el('tbody');
      t.appendChild(body);
      card.appendChild(t);
    };
    let shown = null;
    let yardOut = detailed;
    stops.forEach((stop, i) => {
      if (stop.type === 'return') return;
      if (manyDays && dates[i] && dates[i] !== shown) {
        shown = dates[i];
        table(shown);
      } else if (!body) table(null);
      if (yardOut) {
        yardOut = false;
        const pickup = model.rows.pickup;
        body.appendChild(yardRow('Dep', model.times.depart, pickup?.depart_prev_date, dates[i] ?? shown, model.rows.back));
      }
      body.appendChild(itineraryRow(stop, stops[i + 1] || null, dates[i] ?? shown, detailed ? waitFor(stop) : restFor(stop), lateDays?.[i]));
    });
    if (!body) table(null);
    if (detailed && model.rows.back) {
      const back = model.rows.back;
      // A one-day leg back past midnight has the leg's own date on the row, or
      // none; the figures know the day, and on a longer leg the row's date stands.
      body.appendChild(yardRow('Arr', model.times.back,
        fig.days ? back.arrive_date || fig.backOn : fig.backOn || back.arrive_date, shown ?? model.from, back));
    }
    if (!card.querySelector('.scheduler-driver-itinerary__table tbody > tr')) body.appendChild(blankRow());

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
    /* THE SUMMARY IS ONE BLOCK, the miles and hours and the price, kept
       whole: a fold through it would leave its total on another sheet from
       its lines, so it moves to the next sheet entire. */
    if (detailed) {
      const summary = el('div', 'scheduler-driver-itinerary__summary');
      summary.appendChild(detailedTotals(fig));
      const price = detailedPrice(subject, fig);
      if (price) summary.appendChild(price);
      card.appendChild(summary);
    }
    return card;
  }

  /* Blank rows down to the foot of the sheet's first page: rows are added
     while the form still fits the paper's height, and the one that does not
     is taken off again. */
  function ruleToFoot(card) {
    const body = card.querySelector('.scheduler-driver-itinerary__table tbody');
    const page = parseFloat(getComputedStyle(card).minBlockSize);
    if (!body || !(page > 0)) return;
    const used = () => card.querySelector('.scheduler-driver-itinerary__add').getBoundingClientRect().top
      - card.getBoundingClientRect().top;
    const zoom = parseFloat(getComputedStyle(card).zoom) || 1;
    const room = page * zoom - parseFloat(getComputedStyle(card).paddingBlockEnd) * zoom;
    for (let i = 0; i < 60 && used() < room; i += 1) body.appendChild(blankRow());
    if (used() > room && body.rows.length > 1) body.lastElementChild.remove();
  }

  /* ── The customer quote ───────────────────────────────────────────────
     The document the office sends today, printed from the trip instead of
     retyped into QuickBooks: the same letterhead, the same line items, the
     same terms and signature line, and behind them the Terms and Conditions
     Agreement Form the customer signs with it. A customer who has had one of
     these before should not be able to tell this one apart, except that its
     vehicle line and its quantity are read from one bus count and cannot
     disagree.

     IT IS TWO SHEETS, the quote and the agreement, so `quote` returns both and
     the page stacks them as it stacks Print all's envelopes: a gap between
     them on screen and a new page on paper.

     THE ESTIMATE NUMBER IS THE TRIP'S. The database gives every trip a
     six-digit number on its first save, and the office types the same number
     into the QuickBooks estimate, whose invoice later takes its own five-digit
     one. The box stays typeable like every other.

     AND THE WORDING IS NOT ITS OWN. The first line item's description is
     `quote-text.js`, which the Billing tab's Copy for QuickBooks reads too. */

  /* THE LETTERHEAD AS THE OFFICE'S SHEET SETS IT, which spells the street and
     the phones differently from the driver forms' shorter line. */
  const QUOTE_LETTERHEAD = [
    '2801 Zinnia Ave. McAllen, TX 78504',
    'Ph. (956) 994-1169 / Ph./Fax 994-9491 / Cell 648-9691',
    `E-mail: ${COMPANY.email}`,
  ];

  /* THE TERMS, WRITTEN HERE. rux says they change rarely, so a change to them
     is a commit rather than a settings row nobody would open twice a decade.
     Each string is a paragraph, and the last is two lines because the sheet
     sets them tight. */
  const QUOTE_TERMS = [
    'Quotes are based on itinerary provided. Prices are subject to change if itinerary is updated.',
    'A Fuel Surcharge may be added to your final invoice at our discretion if fuel prices fluctuate between the quote date and trip date.',
    'A signed quote and 20% down payment are required to reserve/hold buses. School districts may provide a purchase order instead of down payment.',
    'For overnight trips, the bus driver’s hotel room must be provided by the customer. If 2 drivers are on trip, the hotel room must have two separate beds. (Sofa beds are not acceptable).',
    'Cancellation Fees: 20% if less than a month; 50% if 48 hrs.; 100% if 24 hrs. before departure.',
    'Customers are responsible for parking fees and tolls if applicable. Damage caused by passengers will be added to invoice.',
    'Escamilla Tour Buses reserves the right to stop or delay service if any Act of God, accidents, bad weather or other conditions beyond its control make it inadvisable or unsafe to operate the buses.',
    'Escamilla Tour Buses is not responsible for any lost, stolen or damaged personal items during the service.',
    'If you have any questions, please contact us at (956) 994-1169 or at (956) 648-9691.\nThank you for choosing Escamilla Tour Buses, we look forward to hearing from you soon.',
  ];

  /* THE AGREEMENT'S POLICIES, as the office's Word form words them, but for
     the cancellation fee, which charges in full within 24 hours of departure
     as the quote's terms do, because that is the rule the office keeps. A
     paragraph is [heading, text]: a heading is underlined and bold and runs
     into its text, a paragraph with none is the text alone, and `warn` sets
     the one the form prints in red. */
  const AGREEMENT_POLICIES = [
    { heading: 'Pricing Policy:', text: 'Quotes are based on the itinerary provided at the time. Prices are subject to change if itinerary is updated. Any changes to the itinerary resulting in additional mileage or affecting driver hours will result in price changes. A Fuel surcharge may be added to your final invoice at our discretion if fuel prices fluctuate between the quote date and trip date. The amount will be calculated based on the gallons of fuel used on the trip and the fuel price difference.' },
    { heading: 'Trip Booking and Cancellation Policy:', text: 'Escamilla Tour Buses will only reserve buses once signed Quote, Terms and Conditions form, and 20% deposit (or Purchase order for School Districts) are received. If these documents have not been submitted in a timely manner, we cannot guarantee bus availability.' },
    { text: 'Cancellations one month prior to departure will incur a 20% cancellation fee. Cancellations 48 hours prior to departure will incur a 50% cancellation fee. Cancellations within 24 hours of departure, on the day of or during the trip will incur a 100% cancellation fee. All cancellations must be sent by email.' },
    { heading: 'Payment Policy:', text: 'Invoices need to be paid in full at least a week prior to departure (Exception: School districts with issued Purchase Order). Payments or Purchase Orders must be mailed, hand delivered or emailed to the Escamilla Tour Buses office. Payments or other paperwork must NOT be handed to the driver. If payment will be split between multiple parties, Escamilla Tour Buses must be notified when reaching out for the initial quote to ensure all parties are billed correctly. School Booster clubs must also pay their part prior to departure.' },
    { heading: 'Driver Lodging Policy:', text: 'Customers are responsible for providing reasonable hotel accommodations for drivers on overnight trips. Bus drivers must sleep in their own room separate from bus passengers. When there are two drivers, at minimum a single hotel room with two separate beds must be provided (Sofa beds are not acceptable).' },
    { heading: 'NOTE:', warn: true, text: 'As per FMCSA regulations, our drivers can drive up to 10 hours and stay on duty for a total of 15hrs, which includes both driving and non-driving duties. Once either the 15 hours on duty or 10 hour driving limits are reached, the driver must have 8 consecutive hours of rest. For your safety, please do not interrupt the driver’s rest period via constant phone calls, etc. The driver cannot move the bus during the rest period.' },
    { heading: 'Passenger Behavior Policy:', text: 'Passengers must always stay seated in the bus when in motion. Minors cannot board the bus without a supervising adult present. Passengers should avoid making excessive noise in the bus or distractions for the drivers. Microphone usage should be limited to trip coordinators or supervising adults. Foul language or inappropriate topics may result in microphone privileges being taken away.' },
    { text: 'Alcohol and drug usage is forbidden on our buses. Drivers can refuse passengers from boarding if they are under the influence of drugs or alcohol.' },
    { text: 'The driver’s sleeping area must always be respected and is only to be used by our drivers. If there is a driver present in the sleeper, please do not disturb their rest. This is critical for your group’s safety!' },
    { text: 'Damages to the bus interior caused by the chartering party will be billed separately. Examples: seat burns, stains, and rips, damaged monitors and electric plugs, and other equipment on the bus.' },
    { heading: 'Bus Cleanliness Policy:', text: 'Please help keep our buses clean! We may assess a $250 fee for excessive amounts of trash left behind on the bus. To reduce the chances of spills, please only bring bottled drinks with caps on board. Avoid bringing sticky, gummy candies on board, as they are very difficult to clean.' },
    { text: 'The restroom in the back of the bus is only to be used for emergencies. We strongly recommend avoiding #2 and keeping all bus restroom usage to a minimum to prevent unpleasant odors. Restroom breaks should be planned into your itinerary.' },
    { heading: 'Other Company Policies:', text: 'Escamilla Tour Buses is not responsible for any lost, stolen or damaged items during provided service. Please double check that no personal belongings are left behind at the end of your trip.' },
    { text: 'Our buses are equipped with power outlets, seat belts, DVD player, microphone & Wi-Fi as a courtesy to our passengers. However, we cannot guarantee these functions will always be operational.' },
    { text: 'Escamilla Tour Buses reserves the right to stop or delay service if any Act of God, accidents, bad weather, or other conditions beyond our control make it inadvisable or unsafe to operate the buses. While we strive for all trips to go smoothly and on time, sometimes unexpected delays can occur.' },
    { text: 'All our buses are equipped with modern emissions reduction equipment, as mandated by federal regulations. This can cause unplanned 1 hour trip delays, as occasional stationary exhaust filter regenerations are necessary to keep the buses operational. We have no control over these systems; the pollution control computers decide when a regen must take place.' },
  ];

  // Today, as the sheet's Date box writes it, 09/22/26. Built from the local
  // parts and not from an ISO string, which is a day behind west of Greenwich.
  const today = () => {
    const now = new Date();
    const two = n => String(n).padStart(2, '0');
    return `${two(now.getMonth() + 1)}/${two(now.getDate())}/${now.getFullYear()}`;
  };

  // Money as a quote prints it, cents and all, and negative for a deduction:
  // the office's own sheet carries two places in every column.
  const money = value => {
    const n = Number(value);
    return Number.isFinite(n) && n !== 0
      ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '';
  };

  // What was typed into a money or quantity cell, as a number: "$1,400.00",
  // "-250" and "(250.00)" all read, and anything else is no number.
  const typedNumber = text => {
    const raw = String(text || '').trim();
    if (!raw) return NaN;
    const negative = /^\(.*\)$/.test(raw);
    const n = Number(raw.replace(/[$,\s()]/g, ''));
    return negative ? -n : n;
  };

  /* THE TWO TIMES THE QUOTE NAMES ARE THE GROUP'S, not the bus's. The group
     leaves the pickup at the first stop's `depart_prev` and is back at the
     yard row's, which is where the Route tab keeps what the editor labels
     Group departs and Group arrives. A leg that never comes back -- a one-way
     -- has no yard row, and its arrival is the last stop's. */
  function quoteTimes(trip) {
    const legs = legsOf(trip);
    const out = stopsOf(trip, legs[0]);
    const home = stopsOf(trip, legs.at(-1));
    return {
      leave: out.find(s => s.type === 'stop')?.depart_prev || null,
      back: home.find(s => s.type === 'return')?.depart_prev
        || home.filter(s => s.type === 'stop').at(-1)?.arrive || null,
    };
  }

  // The last day of the trip, which the description's range and the
  // agreement's trip date both end on.
  const lastDay = trip => trip.return_end_date || trip.return_start_date || trip.end_date || trip.start_date;

  /* Whether a leg's line names 56 seats: a vehicle on it carries the 56
     passengers need. A slot with no row yet asks for what the trip does, as
     the Buses tab seeds it. */
  function asks56(trip, leg) {
    const rows = (trip.trip_assignments || []).filter(a => (a.leg || 'outbound') === leg);
    const count = leg === 'return' ? (trip.return_bus_count ?? trip.bus_count) : trip.bus_count;
    return rows.some(a => a.needs?.pax56 === true)
      || (rows.length < Math.max(Number(count) || 0, 1) && needsOf(trip).some(n => n.id === 'pax56'));
  }

  /* The line item's description, in the wording the Billing tab copies. */
  function quoteDescription(trip) {
    const times = quoteTimes(trip);
    return window.SchedulerQuoteText.description({
      type: trip.trip_type,
      buses: trip.bus_count,
      pax56: asks56(trip, 'outbound'),
      pickup: stopsOf(trip, 'outbound').find(s => s.type === 'pickup')?.address
        || trip.pickup_address || '',
      destination: trip.destination,
      from: trip.start_date,
      to: lastDay(trip),
      leave: times.leave,
      back: times.back,
    });
  }

  /* ONE LEG'S DESCRIPTION, for a drop-off and pickup trip, which is quoted
     as two rentals. Each names its own buses, seats, days and the time the
     group leaves on that leg, and neither says when it arrives: to the
     customer each leg is a departure. Both are handed the trip's own pickup
     and destination, and quote-text.js names the leg and runs the way back
     from the destination, so the two lines read as one journey there and
     back. */
  function legDescription(trip, leg) {
    const out = leg === 'return' ? 'return' : 'outbound';
    const stops = stopsOf(trip, out);
    return window.SchedulerQuoteText.description({
      type: trip.trip_type,
      buses: out === 'return' ? (trip.return_bus_count ?? trip.bus_count) : trip.bus_count,
      pax56: asks56(trip, out),
      pickup: stopsOf(trip, 'outbound').find(s => s.type === 'pickup')?.address
        || trip.pickup_address || '',
      destination: trip.destination,
      from: out === 'return' ? trip.return_start_date : trip.start_date,
      to: out === 'return' ? (trip.return_end_date || trip.return_start_date) : (trip.end_date || trip.start_date),
      leave: stops.find(s => s.type === 'stop')?.depart_prev || null,
      leg: out,
    });
  }

  /* THE LINES THE QUOTE PRINTS: the trip's saved quote lines, in order, as the
     Billing tab keeps them. A rental line left without words takes the trip's
     own, a leg's on a drop-off and pickup trip. A trip with no lines is its
     quoted price as the rental, and a drop-off and pickup is two rentals, one
     per leg, the price shared between them to the cent. */
  function quoteLines(trip) {
    const split = trip.trip_type === 'dropoff_pickup';
    const count = n => (n == null || !Number.isFinite(Number(n)) ? '' : String(Number(n)));
    const saved = (trip.trip_quote_lines || []).slice()
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    if (saved.length) {
      return saved.map(l => ({
        item: l.item || '',
        desc: l.description
          || (l.kind === 'rental' ? (split ? legDescription(trip, l.leg) : quoteDescription(trip)) : ''),
        qty: count(l.quantity),
        cost: l.cost == null ? '' : money(l.cost),
        total: l.amount == null ? '' : money(l.amount),
      }));
    }
    const total = Number(trip.quoted_price);
    const priced = Number.isFinite(total) && total !== 0;
    const legs = split ? ['outbound', 'return'] : [null];
    const share = Math.round((total / legs.length) * 100) / 100;
    return legs.map((leg, i) => {
      const buses = leg === 'return' ? (trip.return_bus_count ?? trip.bus_count) : trip.bus_count;
      const n = Math.max(Number(buses) || 0, 1);
      const legTotal = i < legs.length - 1 ? share : Math.round((total - share * (legs.length - 1)) * 100) / 100;
      return {
        item: 'Bus Rental',
        desc: split ? legDescription(trip, leg) : quoteDescription(trip),
        qty: buses ? String(n) : '',
        cost: priced ? money(legTotal / n) : '',
        total: priced ? money(legTotal) : '',
      };
    });
  }

  /* A BOX, WHICH IS A LABEL OVER WHAT IT HOLDS, ruled all the way round and
     divided once, with the label shaded as the office's own sheet shades it.
     print.css names the fill and what carries it onto paper. */
  function quoteBox(label, lines, cls) {
    const box = el('div', `scheduler-customer-quote__box${cls ? ` scheduler-customer-quote__box--${cls}` : ''}`);
    box.appendChild(el('p', 'scheduler-customer-quote__label', label));
    const body = el('div', 'scheduler-customer-quote__value scheduler-customer-quote__typed');
    for (const line of lines.filter(Boolean)) body.appendChild(el('span', null, line));
    box.appendChild(body);
    return box;
  }

  // The logo over the letterhead's three lines, at the head of both sheets;
  // the agreement carries the logo alone, as the office's Word form does.
  function quoteHead(lines) {
    const head = el('header', 'scheduler-customer-quote__head');
    const logo = el('img', 'scheduler-customer-quote__logo');
    logo.src = '/scheduler/brand/logo.svg';
    logo.alt = '';
    head.appendChild(logo);
    for (const line of lines) head.appendChild(el('p', 'scheduler-customer-quote__line', line));
    return head;
  }

  // A cell of a line item's row. The numbers read to the trailing edge, as
  // money on a bill does; the description is a block of lines.
  const quoteCell = (cls, text) => {
    const td = el('td', `scheduler-customer-quote__${cls} scheduler-customer-quote__typed`);
    for (const [i, line] of String(text || '').split('\n').entries()) {
      if (i) td.appendChild(el('br'));
      td.appendChild(document.createTextNode(line));
    }
    return td;
  };

  const QUOTE_COLUMNS = ['Item', 'Description', 'Quantity', 'Cost', 'Total'];

  const QUOTE_FIELDS = ['.scheduler-customer-quote__typed'];

  // One line item: Item, Description, Quantity, Cost and Total, in that order.
  function lineRow(item, desc, qty, cost, total) {
    const row = el('tr', 'scheduler-customer-quote__line-item');
    row.appendChild(quoteCell('item', item));
    row.appendChild(quoteCell('desc', desc));
    row.appendChild(quoteCell('num', qty));
    row.appendChild(quoteCell('num', cost));
    row.appendChild(quoteCell('num', total));
    return row;
  }

  /* WHAT IS TYPED IS ADDED UP, and only that. The lines come from the trip
     (`quoteLines`), each Total as it was saved, so a price that will not
     divide evenly still totals to what was quoted. A Quantity or Cost typed
     on any line makes that line's Total their product, and the Total box is
     the sum of the lines, so a deduction typed under the bus rental takes the
     total down with it. The trip's quoted price is not changed by any of it:
     that is the Billing tab's, and a price agreed on the sheet is saved
     there. */
  function addUp(card) {
    const rows = [...card.querySelectorAll('.scheduler-customer-quote__line-item')];
    let sum = 0;
    let any = false;
    for (const row of rows) {
      const n = typedNumber(row.cells[4].textContent);
      if (Number.isFinite(n)) { sum += n; any = true; }
    }
    const total = card.querySelector('.scheduler-customer-quote__total-value');
    if (total && document.activeElement !== total) total.textContent = any ? `$${money(sum) || '0.00'}` : '';
  }

  function onLineTyped(event) {
    const cell = event.target.closest('td');
    const row = cell?.closest('.scheduler-customer-quote__line-item');
    if (!row) return;
    const at = cell.cellIndex;
    if (at === 2 || at === 3) {
      const qty = typedNumber(row.cells[2].textContent);
      const cost = typedNumber(row.cells[3].textContent);
      if (Number.isFinite(qty) && Number.isFinite(cost)) row.cells[4].textContent = money(qty * cost);
    }
    addUp(row.closest('.scheduler-customer-quote'));
  }

  function quoteTable(trip, blank) {
    const table = el('table', 'scheduler-customer-quote__table');
    const head = el('thead');
    const headRow = el('tr');
    for (const label of QUOTE_COLUMNS) headRow.appendChild(el('th', null, label));
    head.appendChild(headRow);
    table.appendChild(head);

    const body = el('tbody');
    if (blank) body.appendChild(lineRow('', '', '', '', ''));
    else for (const l of quoteLines(trip)) body.appendChild(lineRow(l.item, l.desc, l.qty, l.cost, l.total));
    /* THE HAND'S DEPTH UNDER THE LINES, which is paper and not a line: the
       office's sheet leaves room under its items and rules only the columns
       down through it. It is the last row before the Total's, so an added line
       goes above it. */
    const room = el('tr', 'scheduler-customer-quote__room');
    for (let i = 0; i < QUOTE_COLUMNS.length; i += 1) room.appendChild(el('td'));
    body.appendChild(room);
    table.appendChild(body);

    /* THE TOTAL IS THE TABLE'S LAST ROW, under Cost and Total, so the two
       share the table's rules rather than drawing a second set against them.
       The cell under the first three columns has no rules of its own and holds
       the button that adds a line, which print.css takes off the paper. */
    const sum = el('tr', 'scheduler-customer-quote__total-row');
    const gap = el('td', 'scheduler-customer-quote__total-gap');
    gap.colSpan = 3;
    const add = el('button', 'rux--btn rux--btn--ghost rux--layout--size-sm scheduler-customer-quote__add', 'Add a line');
    add.type = 'button';
    add.addEventListener('click', () => {
      const row = lineRow('', '', '', '', '');
      body.insertBefore(row, room);
      letThemType(row, QUOTE_FIELDS);
      row.cells[0].focus();
    });
    gap.appendChild(add);
    const total = Number(trip.quoted_price);
    sum.append(
      gap,
      el('td', 'scheduler-customer-quote__total-label', 'Total'),
      el('td', 'scheduler-customer-quote__total-value scheduler-customer-quote__num scheduler-customer-quote__typed',
        !blank && Number.isFinite(total) && total !== 0 ? `$${money(total)}` : ''),
    );
    body.appendChild(sum);
    table.addEventListener('input', onLineTyped);
    /* A price typed as "1900" is set as "1,900.00" once the cell is left, so
       a typed line reads like a computed one. */
    table.addEventListener('focusout', event => {
      const cell = event.target.closest?.('td');
      if (!cell?.closest('.scheduler-customer-quote__line-item') || (cell.cellIndex !== 3 && cell.cellIndex !== 4)) return;
      const n = typedNumber(cell.textContent);
      if (Number.isFinite(n) && n !== 0) cell.textContent = money(n);
    });
    return table;
  }

  // A line to sign on and a shorter one to date, as rules and not underscores.
  function signLine(cls) {
    const rule = el('p', `scheduler-customer-quote__rule${cls ? ` ${cls}` : ''}`);
    rule.appendChild(el('span', 'scheduler-customer-quote__rule-line'));
    rule.appendChild(document.createTextNode(' Date '));
    rule.appendChild(el('span', 'scheduler-customer-quote__rule-date'));
    return rule;
  }

  /* THE BILL-TO, from the trip's customer: its name, then its bill-to address
     as typed, or else its usual pickup's address, the street over the city.
     A trip with no customer linked has only the name it was typed with, and
     the office writes the lines under it. */
  function billToLines(trip) {
    const customer = trip.customers;
    if (!customer) return [trip.customer || ''];
    const typed = String(customer.bill_to || '').split('\n').map(s => s.trim()).filter(Boolean);
    if (typed.length) return [customer.name, ...typed];
    const parts = String(customer.usual?.address || '').split(',').map(s => s.trim()).filter(Boolean);
    if (/^(united states( of america)?|usa|us)$/i.test(parts.at(-1) || '')) parts.pop();
    if (!parts.length) return [customer.name];
    /* The city line is the last "City, ST 12345" in it, so a suite or a
       second street line stays with the street; an address that has none
       splits at its first comma. */
    const state = /^([A-Za-z]{2}\s+\d{5}(-\d{4})?|[A-Z]{2})$/;
    let city = -1;
    for (let i = parts.length - 1; i >= 1 && city < 0; i -= 1) {
      if (state.test(parts[i])) city = i - 1;
    }
    if (city < 1) return [customer.name, parts[0], parts.slice(1).join(', ')];
    return [customer.name, parts.slice(0, city).join(', '), parts.slice(city).join(', ')];
  }

  /* THE FIRST SHEET, THE QUOTE. The field stays open, because a quote is
     corrected before it is sent. */
  function quoteSheet(trip, blank) {
    const card = el('article', 'scheduler-form scheduler-customer-quote');
    card.appendChild(quoteHead(QUOTE_LETTERHEAD));

    /* The date and the estimate number on the leading edge and the document's
       name on the trailing one, on one line, as the office's sheet sets them.
       The date is today's, because a quote is dated the day it is written, and
       it is typed into like every other field for one sent a day later. */
    const meta = el('div', 'scheduler-customer-quote__meta');
    const dated = el('div', 'scheduler-customer-quote__meta-boxes');
    dated.append(quoteBox('Date', [today()]), quoteBox('Estimate no.', [blank ? '' : trip.trip_ref || '']));
    meta.append(dated, el('h2', 'scheduler-customer-quote__title', 'QUOTE / PROPOSAL'));
    card.appendChild(meta);

    const parties = el('div', 'scheduler-customer-quote__parties');
    parties.appendChild(quoteBox('Name/address', blank ? [''] : billToLines(trip), 'bill-to'));
    const who = el('div', 'scheduler-customer-quote__who');
    who.appendChild(quoteBox('Contact', [blank ? '' : trip.booking_contact_name || '']));
    who.appendChild(quoteBox('Phone', [blank ? '' : showPhone(trip.booking_contact_phone)]));
    who.appendChild(quoteBox('Email', [blank ? '' : trip.booking_contact_email || '']));
    parties.appendChild(who);
    card.appendChild(parties);

    card.appendChild(quoteTable(trip, blank));

    const terms = el('div', 'scheduler-customer-quote__terms');
    for (const text of QUOTE_TERMS) {
      const p = el('p', 'scheduler-customer-quote__term');
      for (const [i, line] of text.split('\n').entries()) {
        if (i) p.appendChild(el('br'));
        p.appendChild(document.createTextNode(line));
      }
      terms.appendChild(p);
    }
    card.appendChild(terms);

    const sign = el('div', 'scheduler-customer-quote__sign');
    sign.appendChild(signLine());
    sign.appendChild(el('p', 'scheduler-customer-quote__sign-note',
      `Please sign to confirm and email back to ${COMPANY.email}`));
    card.appendChild(sign);
    return card;
  }

  /* THE SECOND SHEET, THE AGREEMENT the customer signs with the quote: the
     trip's destination and dates in the two boxes at its head, the policies,
     and a line to sign and date. */
  function agreementSheet(trip, blank) {
    const card = el('article', 'scheduler-form scheduler-customer-quote scheduler-customer-quote--agreement');
    card.appendChild(quoteHead([]));
    card.appendChild(el('h2', 'scheduler-customer-quote__agreement-title', 'TERMS AND CONDITIONS AGREEMENT FORM'));

    const tripBox = el('div', 'scheduler-customer-quote__trip');
    const pair = (label, value) => {
      tripBox.appendChild(el('p', 'scheduler-customer-quote__trip-label', label));
      tripBox.appendChild(el('p', 'scheduler-customer-quote__trip-value scheduler-customer-quote__typed', value));
    };
    pair('Destination', blank ? '' : trip.destination || '');
    pair('Date', blank ? '' : dayRange(trip.start_date, lastDay(trip)));
    card.appendChild(tripBox);

    card.appendChild(el('p', 'scheduler-customer-quote__agreement-intro',
      'I acknowledge that by signing this form I confirm that I have read and agree with the following Escamilla Tour Buses Policies:'));

    const policies = el('div', 'scheduler-customer-quote__policies');
    for (const { heading, text, warn } of AGREEMENT_POLICIES) {
      const p = el('p', `scheduler-customer-quote__policy${warn ? ' scheduler-customer-quote__policy--warn' : ''}`);
      if (heading) {
        p.appendChild(el('strong', 'scheduler-customer-quote__policy-heading', heading));
        p.appendChild(document.createTextNode(' '));
      }
      p.appendChild(document.createTextNode(text));
      policies.appendChild(p);
    }
    card.appendChild(policies);

    const sign = el('div', 'scheduler-customer-quote__agreement-sign');
    for (const label of ['Customer signature', 'Date']) {
      const cell = el('div', 'scheduler-customer-quote__agreement-cell');
      cell.appendChild(el('span', 'scheduler-customer-quote__agreement-rule'));
      cell.appendChild(el('p', 'scheduler-customer-quote__agreement-label', label));
      sign.appendChild(cell);
    }
    card.appendChild(sign);
    return card;
  }

  function quote(subject) {
    const trip = subject.trip || {};
    const blank = !trip.id;
    return [quoteSheet(trip, blank), agreementSheet(trip, blank)];
  }

  /* THE FILE A SAVED QUOTE IS NAMED, which is the title Chrome's Save as PDF
     offers: the trip's first day and `qt`, 2026-12-05-qt, which is how the
     office already names the ones QuickBooks makes. A blank one has no day
     and keeps the page's own title. */
  /* ── THE WEEK SCHEDULE ────────────────────────────────────────────────────
     rux-ui's billing report of a week, in its format and layout: Legal
     landscape, five buses a sheet, a row per bus and a column per day, and a
     card per trip leg on each bus across the days it covers. Only the look is
     this app's. Where a trip sits, its lane and its colour come from week.js,
     which the board places with too, so the sheet and the board cannot
     disagree. */
  const WEEK = window.SchedulerWeek;
  const BUSES_PER_SHEET = 5;
  const WEEKDAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  // The crew in the order a card lists them. After the trip the one thing a
  // role still says is whether a relief driver took over, so only a relief
  // driver carries a mark, the board's handover arrows.
  const CREW_ORDER = ['driver', 'co-driver', 'relief-start', 'relief-end'];
  const RELIEF_ICON = '#m-swap_horiz-fill';

  const dayOf = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
  const plusDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const isoDay = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  // "September 21-27, 2026", or across a month or a year as rux-ui writes it.
  function weekTitle(first) {
    const last = plusDays(first, 6);
    const a = MONTHS[first.getMonth()], b = MONTHS[last.getMonth()];
    if (first.getFullYear() !== last.getFullYear()) {
      return `${a} ${first.getDate()}, ${first.getFullYear()}-${b} ${last.getDate()}, ${last.getFullYear()}`;
    }
    return a === b
      ? `${a} ${first.getDate()}-${last.getDate()}, ${last.getFullYear()}`
      : `${a} ${first.getDate()}-${b} ${last.getDate()}, ${last.getFullYear()}`;
  }

  /* A value a detail line prints. rux-ui leaves a status word out of a field
     that should hold a number or a reference, so "pending" and the office's
     other holding words print as an empty line to write on. */
  const HOLDING_WORDS = ['draft', 'hold', 'working on approval', 'check in mail'];
  function detailText(value) {
    if (value === undefined || value === null) return '';
    const text = String(value).trim();
    const words = text.toLowerCase().replace(/\s+/g, ' ');
    return !text || words.includes('pending') || HOLDING_WORDS.includes(words) ? '' : text;
  }
  const weekMoney = n => (Number(n) ? `$${Number(n).toLocaleString('en-US')}` : '');
  const milesText = n => (n == null || n === '' ? '' : String(Number(n) % 1 === 0 ? Number(n) : Number(n).toFixed(1)));
  // The first of several, and how many more, as "4471 +1".
  const firstAndMore = (first, count) => {
    const extra = Math.max(0, (Number(count) || 0) - 1);
    if (!first) return extra > 0 ? `${extra + 1} on file` : '';
    return extra > 0 ? `${first} +${extra}` : String(first);
  };
  // "10:40a", the board's short form, so three times and their labels share
  // one day's width.
  const weekClock = t => {
    const [h, m] = String(t || '').split(':');
    const hr = Number(h);
    if (!t || !Number.isFinite(hr) || m === undefined) return '--:--';
    return `${hr % 12 || 12}:${m}${hr < 12 ? 'a' : 'p'}`;
  };
  // What a card line with nothing to print holds, so it keeps its height: a
  // plain space collapses, and the line would vanish.
  const BLANK = '\u00a0';
  // A driver's pay under the "$" its line prints: "250", or nothing to write on.
  const payText = n => (Number(n) ? Number(n).toLocaleString('en-US') : '');

  // The trip's miles: what the Route tab worked out, or its stops added up.
  function milesOf(trip) {
    if (trip.est_miles != null) return trip.est_miles;
    const sum = (trip.trip_stops || []).filter(s => s.type !== 'day' && s.type !== 'sleeper')
      .reduce((n, s) => n + (parseFloat(s.miles) || 0), 0);
    return sum > 0 ? sum : null;
  }

  // An assignment's crew in role order, each in a role that is on.
  function crewOnBus(assignment) {
    const saved = Array.isArray(assignment.active_roles)
      ? assignment.active_roles.map(r => String(r).split(':')[0]) : null;
    return (assignment.trip_drivers || [])
      .filter(d => d.drivers && (!saved || saved.includes(d.role || 'driver')))
      .sort((a, b) => CREW_ORDER.indexOf(a.role || 'driver') - CREW_ORDER.indexOf(b.role || 'driver'));
  }

  function weekIcon(href, cls) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', cls);
    svg.setAttribute('viewBox', '0 0 32 32');
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', href);
    svg.appendChild(use);
    return svg;
  }

  // A ruled line of labelled fields, one to four across, each label printed
  // whether or not it has a value, so every card rules the same lines.
  function detailLine(fields) {
    const line = el('div', 'scheduler-week__detail');
    line.dataset.fields = String(fields.length);
    for (const [label, value] of fields) {
      const field = el('span', 'scheduler-week__field');
      field.append(el('span', 'scheduler-week__label', label),
        el('span', 'scheduler-week__value', detailText(value)));
      line.appendChild(field);
    }
    return line;
  }

  /* The stripe at a leg's end: 45° bands 4px along the edge and 4px apart,
     drawn as shapes, because a pattern prints soft. More than a row's height
     of them; the strip cuts the rest. The end leans one way and the start the
     other, as on the board. */
  function weekStripe(side) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', '8');
    svg.setAttribute('height', '400');
    svg.setAttribute('viewBox', '0 0 8 400');
    const d = [];
    for (let y = -16; y < 416; y += 8) {
      d.push(side === 'end'
        ? `M0 ${y}V${y + 4}L8 ${y - 4}V${y - 8}Z`
        : `M0 ${y}V${y + 4}L8 ${y + 12}V${y + 8}Z`);
    }
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', d.join(''));
    svg.appendChild(path);
    const strip = el('span', `scheduler-week__stripe scheduler-week__stripe--${side}`);
    strip.setAttribute('aria-hidden', 'true');
    strip.appendChild(svg);
    return strip;
  }

  function weekCard(bar) {
    const { trip, assignment, place, lane, of } = bar;
    const hue = WEEK.hueFor(trip);
    const card = el('div', `scheduler-week__trip scheduler-week__trip--${hue}`);
    card.style.gridColumn = `${place.start + 1} / span ${place.span}`;
    card.style.gridRow = String(lane + 1);
    // Its lines keep to the first day's width, as rux-ui's do, however many
    // days the colour runs across.
    card.style.setProperty('--scheduler-week-span', String(place.span));
    card.dataset.trip = trip.destination || 'Trip';
    // An edge where the trip runs on past the week is marked as the board
    // marks it, with a column of squares: real boxes, because a pattern prints
    // soft. More than a row's height of them; the edge cuts the rest.
    for (const [on, side] of [[place.fromPrev, 'start'], [place.toNext, 'end']]) {
      if (!on) continue;
      const edge = el('span', `scheduler-week__edge scheduler-week__edge--${side}`);
      edge.setAttribute('aria-hidden', 'true');
      for (let i = 0; i < 32; i++) edge.appendChild(el('i'));
      card.appendChild(edge);
    }
    // A leg that leaves the group or fetches it is striped at one end, as the
    // board stripes it. The strip lies inside a continuing edge's squares.
    const split = trip.trip_type === 'dropoff_pickup';
    const stripe = trip.trip_type === 'one_way' || (split && bar.leg.leg !== 'return') ? 'end'
      : split ? 'start' : null;
    if (stripe) {
      card.classList.add(`scheduler-week__trip--stripe-${stripe}`);
      const inside = stripe === 'start' ? place.fromPrev : place.toNext;
      card.style.setProperty('--scheduler-week-stripe-inset', inside ? '3px' : '0px');
      card.appendChild(weekStripe(stripe));
    }
    // A trip that began last week is only its continuation here, as on the
    // board: repeating its lines on Monday reads as the trip starting again.
    if (place.fromPrev) {
      card.classList.add('scheduler-week__trip--continued');
      return card;
    }

    /* WHAT THE DATABASE KNOWS, on the trip's colour: where, for whom, the
       three times and the crew. */
    const facts = el('div', 'scheduler-week__facts');
    const top = el('div', 'scheduler-week__trip-top');
    top.appendChild(el('span', 'scheduler-week__destination', trip.destination || 'Trip'));
    if (of) top.appendChild(el('span', 'scheduler-week__of', of));
    const billing = window.SchedulerBilling?.of(trip);
    if (billing && (billing.rung === 'paid_full' || billing.rung === 'overpaid')) {
      const paid = el('span', 'scheduler-week__paid', billing.rung === 'overpaid' ? 'OVERPAID' : 'PAID');
      const on = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(billing.datePaid || ''));
      if (on) paid.appendChild(el('span', 'scheduler-week__paid-date', ` ${Number(on[2])}/${Number(on[3])}`));
      top.appendChild(paid);
    }
    facts.appendChild(top);

    const riders = (trip.trip_passengers || []).length;
    facts.appendChild(el('div', 'scheduler-week__line', trip.is_self_organized
      ? `${riders} passenger${riders === 1 ? '' : 's'}` : trip.customer || BLANK));
    const who = trip.booking_contact_name || trip.booking_contact_phone
      ? [trip.booking_contact_name, trip.booking_contact_phone]
      : [trip.trip_contact_1_name, trip.trip_contact_1_phone];
    facts.appendChild(el('div', 'scheduler-week__line scheduler-week__contact',
      [who[0], who[1] ? showPhone(who[1]) : ''].filter(Boolean).join(' ') || BLANK));

    const times = el('div', 'scheduler-week__times');
    for (const [label, t] of [['Out', bar.leg.depart], ['Spot', bar.leg.spot], ['Back', bar.leg.back]]) {
      const time = el('span', 'scheduler-week__time');
      time.append(el('span', 'scheduler-week__label', label), el('span', 'scheduler-week__value', weekClock(t)));
      times.appendChild(time);
    }
    facts.appendChild(times);

    // A column per driver, ruled apart, with the pay line's "$" under each
    // name. Only a relief driver is marked, with the board's handover arrows.
    const crew = crewOnBus(assignment);
    const columns = String(Math.max(1, crew.length));
    const crewLine = el('div', 'scheduler-week__crew');
    crewLine.dataset.fields = columns;
    for (const d of crew) {
      const person = el('span', 'scheduler-week__driver');
      if (String(d.role).startsWith('relief')) {
        const mark = weekIcon(RELIEF_ICON, 'scheduler-week__role');
        mark.setAttribute('aria-label', 'Relief');
        person.appendChild(mark);
      }
      person.appendChild(el('span', null, d.drivers.short_name || d.drivers.name || ''));
      crewLine.appendChild(person);
    }
    if (!crew.length) crewLine.appendChild(el('span', 'scheduler-week__driver', BLANK));
    facts.appendChild(crewLine);
    card.appendChild(facts);

    /* THE LINES WRITTEN IN BY HAND, on white, where the database has nothing
       yet. They share whatever height the card has left, each ruled at its
       foot to write on; print.css sizes them from how many there are. */
    const write = el('div', 'scheduler-week__write');
    const lines = el('div', 'scheduler-week__lines');
    const po = firstAndMore(trip.po_ref, (trip.trip_pos || []).length);
    const pay = detailLine(crew.length ? crew.map(d => ['$', payText(d.pay)]) : [['$', '']]);
    pay.classList.add('scheduler-week__pay');
    lines.appendChild(pay);
    lines.appendChild(detailLine([['Mi:', milesText(milesOf(trip))], ['Act:', milesText(trip.actual_miles)]]));
    lines.appendChild(detailLine([['Qt:', weekMoney(trip.quoted_price)],
      ['Inv:', firstAndMore(trip.invoice_number, (trip.trip_invoices || []).length)]]));
    // The PO has a line of its own, the one field long enough to need it.
    lines.appendChild(detailLine([['PO:', po]]));
    const payments = [...(trip.trip_payments || [])]
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .filter(p => p.ref || Number(p.amount))
      .map(p => [p.method, p.ref, weekMoney(p.amount)].filter(Boolean).join(' '));
    lines.appendChild(detailLine([['Pmt:', payments.join(' · ')]]));
    lines.style.setProperty('--scheduler-week-lines', String(lines.children.length));
    write.appendChild(lines);
    card.appendChild(write);
    return card;
  }

  // Every leg of every trip on a bus this week, with the days it covers, as
  // the board places them: one card per bus the leg is on.
  function barsOfWeek(trips, first) {
    const last = plusDays(first, 6);
    const byBus = new Map();
    for (const trip of trips) {
      for (const leg of WEEK.legsOf(trip)) {
        const place = WEEK.clip(leg.from, leg.to, first, last);
        if (!place) continue;
        const onLeg = (trip.trip_assignments || [])
          .filter(a => (a.leg || 'outbound') === leg.leg && a.bus_id)
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        onLeg.forEach((assignment, i) => {
          if (!byBus.has(assignment.bus_id)) byBus.set(assignment.bus_id, []);
          byBus.get(assignment.bus_id).push({
            trip, leg, assignment, place: { ...place },
            of: leg.count > 1 ? `${i + 1}/${leg.count}` : '',
          });
        });
      }
    }
    return byBus;
  }

  function weekSchedule(subject) {
    const first = dayOf(subject.week);
    const byBus = barsOfWeek(subject.trips || [], first);
    // Every active bus, and an inactive one only in a week it has a trip.
    const buses = (subject.buses || []).filter(b => b.status === 'active' || byBus.has(b.id));
    const pages = Math.max(1, Math.ceil(buses.length / BUSES_PER_SHEET));
    const title = weekTitle(first);
    const today = new Date();
    const printedOn = `${MONTHS[today.getMonth()].slice(0, 3)} ${today.getDate()}, ${today.getFullYear()}`;
    const sheets = [];
    for (let p = 0; p < pages; p++) {
      const card = el('article', 'scheduler-form scheduler-week');
      const head = el('header', 'scheduler-week__head');
      const logo = el('img', 'scheduler-week__logo');
      logo.src = 'brand/logo.svg';
      logo.alt = 'Escamilla Tour Buses';
      // The day it was printed, so a sheet on the wall says how current it is.
      const stamp = el('div', 'scheduler-week__stamp');
      stamp.append(el('p', 'scheduler-week__printed', `Printed ${printedOn}`),
        el('p', 'scheduler-week__title', pages > 1 ? `${title} — Page ${p + 1} of ${pages}` : title));
      head.append(logo, stamp);
      card.appendChild(head);

      const grid = el('div', 'scheduler-week__grid');
      grid.style.setProperty('--scheduler-week-rows', String(BUSES_PER_SHEET));
      const days = el('div', 'scheduler-week__days');
      days.appendChild(el('div', 'scheduler-week__corner'));
      for (let d = 0; d < 7; d++) {
        const date = plusDays(first, d);
        const day = el('div', 'scheduler-week__day');
        day.append(el('span', null, WEEKDAYS[date.getDay()]), el('span', null, String(date.getDate())));
        days.appendChild(day);
      }
      grid.appendChild(days);

      // The last sheet keeps its empty rows, so every sheet is ruled the same.
      for (let r = 0; r < BUSES_PER_SHEET; r++) {
        const bus = buses[p * BUSES_PER_SHEET + r];
        const row = el('div', 'scheduler-week__row');
        row.appendChild(el('div', 'scheduler-week__bus', bus ? String(bus.number ?? '') : ''));
        for (let d = 0; d < 7; d++) {
          // Placed by hand: the lanes already hold these columns in the same
          // row, and a cell left to find its own place is pushed past them.
          const cell = el('div', 'scheduler-week__cell');
          cell.style.gridColumn = String(d + 2);
          row.appendChild(cell);
        }
        const lanes = el('div', 'scheduler-week__lanes');
        const bars = bus ? byBus.get(bus.id) || [] : [];
        // One lane stretches its cards to the row's height; two or more stack.
        const laneCount = bars.length ? WEEK.assignLanes(bars) : 0;
        lanes.dataset.lanes = String(laneCount);
        for (const bar of bars) lanes.appendChild(weekCard(bar));
        // A day line a trip runs across in every lane is left undrawn, so the
        // trip's colour runs on unbroken.
        for (let d = 0; d < 6 && laneCount; d++) {
          const across = new Set(bars.filter(b => b.place.start <= d && b.place.start + b.place.span - 1 > d).map(b => b.lane));
          if (across.size === laneCount) row.children[d + 1].dataset.inside = '';
        }
        row.appendChild(lanes);
        grid.appendChild(row);
      }
      card.appendChild(grid);
      sheets.push(card);
    }
    return sheets;
  }

  /* WHAT DID NOT FIT. rux-ui squeezes a crowded row to 55% and clips the rest;
     this names the trips instead, above the sheet and off the paper, so a
     crowded day is seen before it is printed rather than after. */
  function weekOverflow(card) {
    const cut = [];
    for (const lanes of card.querySelectorAll('.scheduler-week__lanes')) {
      const bottom = lanes.getBoundingClientRect().bottom + 1;
      for (const trip of lanes.querySelectorAll('.scheduler-week__trip')) {
        if (trip.getBoundingClientRect().bottom > bottom) cut.push(trip.dataset.trip);
      }
    }
    return cut;
  }

  function showWeekCut(sheetEl) {
    sheetEl.querySelector(':scope > .scheduler-week__cut')?.remove();
    const cut = [...sheetEl.querySelectorAll(':scope > .scheduler-week')].flatMap(weekOverflow);
    if (!cut.length) return;
    const box = el('div', 'rux--inline-notification rux--inline-notification--warning scheduler-week__cut');
    const inner = el('div', 'rux--inline-notification__details');
    const text = el('div', 'rux--inline-notification__text-wrapper');
    text.append(el('p', 'rux--inline-notification__title', 'Some trips do not fit their row.'),
      el('p', 'rux--inline-notification__subtitle', `They will be cut off on paper: ${[...new Set(cut)].join(', ')}.`));
    inner.appendChild(text);
    box.appendChild(inner);
    sheetEl.prepend(box);
  }

  /* THE NAME SAVE AS PDF OFFERS, from file-names.js, so a printed form is
     named as an uploaded file is. A form printed once per driver names the
     driver last, and the return leg's copy says so; the driver itinerary is
     printed once per leg and names it. */
  const { CODES, forTrip, forDay } = window.SchedulerFileNames;
  const driverCopy = subject => [nameOf(subject.seat), subject.leg === 'return' ? 'return' : '']
    .filter(Boolean).join(' ');
  const envelopeFileName = subject => (subject.trip ? forTrip(subject.trip, CODES.envelope, driverCopy(subject)) : null);
  const hosFileName = subject => (subject.trip ? forTrip(subject.trip, CODES['hours-of-service'], driverCopy(subject)) : null);
  // The Detailed layout is the office's copy, so its file says so.
  const itineraryFileName = (subject, layout) => (subject.trip
    ? forTrip(subject.trip, CODES['driver-itinerary'],
      `${subject.leg || 'outbound'}${layout === 'detailed' ? '-detailed' : ''}`) : null);
  const quoteFileName = subject => (subject.trip ? forTrip(subject.trip, CODES.quote) : null);
  const weekFileName = subject => (subject.week ? forDay(subject.week, CODES['week-schedule']) : null);

  /* ── The registry ─────────────────────────────────────────────────────── */

  const FORMS = [
    {
      id: 'envelope',
      name: 'Driver trip envelope',
      group: 'Drivers',
      short: 'Envelope',
      icon: '#m-mail',
      binds: 'assignment+seat',
      /* It can also be opened on nothing: a blank envelope to fill in by hand
         or type into, which is what the Forms page is for when no trip sent
         you there. */
      blank: true,
      marks: { table: 'trip_drivers', column: 'envelope_printed', by: 'seat', what: 'envelope' },
      /* A particular stock rather than whatever is in the tray: 6 by 9
         inches is the envelope itself, and the name is the one the office
         printer offers it as, which the bar shows beside the count. The ink
         margin is the form's own, because the stock's own margins are zero
         and a laser printer still cannot reach its edges. */
      page: { name: 'Trip Envelope, 6 × 9 in', size: '6in 9in', width: '6in', height: '9in', margin: '0.3in', exact: true },
      layouts: [
        { id: 'standard', name: 'Standard' },
        { id: 'multi-stop', name: 'Multi-stop' },
      ],
      // Print all covers the bus's whole crew, one sheet each.
      copies: subject => seatsOf(subject.assignment)
        .map(seat => ({ ...subject, seat })),
      copyName: seatCopyName,
      /* What dispatch fills in can be typed over, filled or blank, as the
         itinerary and the quote can, for a change the trip does not hold yet.
         The day-of block is left alone, because the driver's pen fills it
         after the trip. */
      typed: {
        always: true,
        fields: [
          '.scheduler-envelope__value',
          '.scheduler-envelope__blank',
          '.scheduler-envelope__day',
          '.scheduler-envelope__reqs',
        ],
      },
      render: envelope,
      fileName: envelopeFileName,
    },
    {
      id: 'hours-of-service',
      name: 'Hours-of-service record',
      group: 'Drivers',
      short: 'Hours of service',
      icon: '#m-schedule',
      /* ONE PER DRIVER, AS THE ENVELOPE IS: it is signed by one person, and the
         dates it prints count back from the day that driver's leg starts. */
      binds: 'assignment+seat',
      blank: true,
      /* The seat's own mark, as the envelope's is, and only a part-time
         driver's counts: nobody else signs one. */
      marks: { table: 'trip_drivers', column: 'hos_form_printed', by: 'seat', what: 'HOS form',
        only: seat => seat.drivers?.employment_type === 'part-time' },
      /* LETTER, HELD TO ONE SHEET, with the form in its top half and the rest
         left white. */
      page: { name: 'Letter', size: 'Letter', width: '8.5in', height: '11in', margin: '0.375in', exact: true },
      copies: subject => seatsOf(subject.assignment)
        .map(seat => ({ ...subject, seat })),
      copyName: seatCopyName,
      /* A blank one can be typed into; a filled one prints what the trip
         knows and the driver's pen does the rest, which leaves Print all
         free to stack every driver's copy on the trip. */
      typed: { fields: ['.scheduler-hos__fill'] },
      render: hoursOfService,
      fileName: hosFileName,
    },
    {
      id: 'driver-itinerary',
      name: 'Driver trip itinerary',
      group: 'Drivers',
      short: 'Itinerary',
      icon: '#m-route',
      /* IT BINDS THE TRIP AND THE LEG, NOT THE BUS. The envelope binds a seat
         because it is personal, one name and one seat; the plan for the day is
         the same for every driver and every bus on the leg, and `trip_stops`
         are keyed by trip and leg with no bus among them. */
      binds: 'trip+leg',
      blank: true,
      /* One sheet for the leg, handed to each of its drivers, so its mark is
         every seat's on the leg at once. It is the driver's sheet that is
         marked, so the Detailed layout, the office's, offers no tick. */
      marks: { table: 'trip_drivers', column: 'itinerary_printed', by: 'crew', layout: 'simple', what: 'itinerary' },
      /* SIMPLE IS THE DRIVER'S SHEET AND DETAILED THE OFFICE'S, which adds the
         yard at both ends, each wait and the leg's miles and hours from the
         Route tab. Detailed needs a trip's route, so a blank form is Simple. */
      layouts: [
        { id: 'simple', name: 'Simple' },
        { id: 'detailed', name: 'Detailed', trip: true },
      ],
      // The Detailed layout's price: the Billing tab's lines as saved.
      columns: [
        'quoted_price',
        'trip_quote_lines(position,kind,leg,item,description,quantity,cost,amount,cost_typed,miles,dead_miles,rate)',
      ],
      /* LETTER, AND NOT `exact`. The envelope must come out on one envelope;
         this runs onto as many sheets as the stops need, and the height is
         the paper's rather than a limit -- a short itinerary still draws a
         whole page of it, because that is what comes out of the printer. */
      page: { name: 'Letter', size: 'Letter', width: '8.5in', height: '11in', margin: '0.375in' },
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
      fileName: itineraryFileName,
      drawn: (card, blank) => { if (blank) ruleToFoot(card); },
    },
    {
      id: 'customer-quote',
      name: 'Customer quote',
      group: 'Customers',
      short: 'Quote',
      icon: '#m-request_quote',
      /* IT BINDS THE TRIP AND NOT A LEG. A quote is one price for the whole
         journey, where the itinerary is one sheet per leg and the envelope one
         per seat -- a round trip is quoted once. */
      binds: 'trip',
      blank: true,
      // What the shared list does not already carry: the price, its lines and
      // each leg's buses, the office's own contact for the customer, the needs
      // the description's seats follow, and the customer the bill-to is drawn from.
      columns: [
        'quoted_price', 'bus_count', 'return_bus_count', 'pickup_address', 'booking_contact_email',
        'trip_quote_lines(position,kind,leg,item,description,quantity,cost,amount)',
        'trip_assignments(leg,needs)', 'trip_reqs', 'req_56pax',
        'customers:customer_id(name,bill_to,usual:usual_location_id(address))',
      ],
      // NO TICK. `envelope_printed` and `itinerary_printed` are dispatch's
      // record that a driver has their paperwork; a quote is sent, and whether
      // it was is the Billing tab's business, not a form's.
      page: { name: 'Letter', size: 'Letter', width: '8.5in', height: '11in', margin: '0.375in' },
      copies: subject => [subject],
      /* EVERY FIELD, ON A FILLED ONE TOO. The office corrects a quote before
         it sends it -- a price agreed on the phone, a contact the trip has
         not caught up with, the two times it writes TBD and settles after --
         and this sheet leaves the app for a customer, so the last word on it
         is the one typed here. */
      typed: { always: true, fields: QUOTE_FIELDS },
      fileName: quoteFileName,
      render: quote,
    },
    {
      id: 'week-schedule',
      name: 'Week schedule',
      group: 'Schedule',
      short: 'Week schedule',
      icon: '#m-calendar_month',
      binds: 'week',
      // The margin is 18 CSS pixels, so the grid starts on a whole pixel.
      page: { name: 'Legal, landscape', size: '14in 8.5in', width: '14in', height: '8.5in', margin: '0.1875in', exact: true },
      // The weeks around the one asked for, which the list steps through;
      // one week is printed at a time, never the list.
      copies: subject => [subject],
      copyName: subject => weekTitle(dayOf(subject.week)),
      oneAtATime: true,
      fileName: weekFileName,
      render: weekSchedule,
      afterDraw: showWeekCut,
    },
  ];

  window.SchedulerForms = { FORMS, envelope, itinerary, quote, seatsOf, needsOf, contactOf, roleName, useRequirements };

  /* A page that only draws with these, the driver's share/form.html, has no
     forms page around them to run. */
  if (!document.getElementById('scheduler-print-sheet')) return;

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
    'buses:bus_id(number,type)',
    'trip_drivers(id,driver_id,role,report_time,instructions,envelope_printed,itinerary_printed,hos_form_printed,drivers:driver_id(name,short_name,employment_type))',
  ].join(',');

  /* Outbound before return, then along the trip: the order the hub lists a
     trip's buses in, and the order Print all stacks their envelopes. */
  const byLegThenPosition = (a, b) => (a.leg === b.leg
    ? (a.position ?? 0) - (b.position ?? 0)
    : a.leg === 'return' ? 1 : -1);

  /* The bus, its seats and its trip, with the trip's tick for this form where
     the form keeps one on the leg. */
  const assignmentQuery = form => BUS_SEATS_QUERY + ',' + [
    'trips:trip_id(' + [
      'id', 'trip_ref', 'customer', 'destination', 'trip_type',
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
      ...(form.marks?.by === 'leg' ? LEGS.map(leg => `${form.marks.column}_${leg}`) : []),
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
  host?.setFormControls([]);
  host?.setFormNote('');
  /* The tab the panel's print falls back to opens where this frame is now,
     not where the panel first pointed it: a tile on the hub moves the frame. */
  host?.setFormLink?.(location.href);

  const bar = document.getElementById('scheduler-print-bar');
  const title = document.getElementById('scheduler-print-title');
  const controls = document.getElementById('scheduler-print-controls');
  const sheet = document.getElementById('scheduler-print-sheet');
  const note = document.getElementById('scheduler-print-note');
  const hub = document.getElementById('scheduler-print-hub');
  const count = document.getElementById('scheduler-print-count');
  const crumbs = document.getElementById('scheduler-print-crumbs');
  const crumbUp = document.getElementById('scheduler-print-crumb-up');
  const crumbHere = document.getElementById('scheduler-print-crumb-here');

  /* THE WAY BACK TO THE LIST, and only where this page stands alone: framed in
     the panel the panel's own head is the way back. Forms keeps the trip, so
     it returns to that trip's forms rather than to the bare list. */
  /* The page is named after the form it shows. The trail's way up names the
     trip's list when it goes there, so it is told apart from the side nav's
     Forms, which is every form on no trip. */
  function setCrumbs(form, trip) {
    document.title = `${form ? form.name : 'Forms'} — Scheduler`;
    if (!form) return void (crumbs.hidden = true);
    crumbUp.href = trip?.id
      ? `print.html?trip=${encodeURIComponent(trip.id)}`
      : 'print.html';
    crumbUp.textContent = trip?.id && trip.destination ? `Forms — ${trip.destination}` : 'Forms';
    crumbHere.textContent = form.name;
    crumbs.hidden = Boolean(host);
  }

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
    /* WHERE THE MARGIN GOES, and it is not the same answer for both forms. A
       block's padding is at its start and its end, so on a form that runs onto
       a second sheet the middle pages have none at all and the ink goes to the
       edge of the paper. An @page margin is the only one that repeats, so a
       form that flows names it there and keeps no padding of its own on paper;
       print.css says the same thing from its side.

       A form held to one sheet keeps the margin in the box model, because it
       has no middle pages to lose and because a print driver does not
       reliably honour an @page margin -- which is what the envelope's own
       stock, 6 by 9 with zero margins of its own, was measured against.

       AN @page MARGIN IS A WHOLE NUMBER OF POINTS. Chrome sends a printer its
       printable box in whole points and drops the fraction, while the form is
       laid out to the exact width: a 0.4in margin is 28.8pt, and the box
       ended 1.2pt short of the form and cut every rule down its right side.
       0.375in is 27pt, and 36 CSS pixels, so nothing is rounded. */
    const pageMargin = paper && !paper.exact && paper.margin ? paper.margin : '0';
    style.textContent = `@page { ${paper?.size ? `size: ${paper.size}; ` : ''}margin: ${pageMargin}; }`;

    /* AND WHETHER IT IS ONE SHEET OR MANY. The envelope has to come out on one
       envelope, so print.css holds it to that height; the itinerary runs onto
       as many as its stops need. Both are fitted the same way on screen -- a
       page at a time. */
    sheet.dataset.sheet = paper?.exact ? 'exact' : 'flows';

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
    /* A PAGE AT A TIME, WHERE THE PAGE IS THE ROOM. Standing alone the room is
       what the window leaves under the title row, and the form takes the
       smaller of the two fits, so one page of its paper is on screen entire --
       a sheet you can see all of beats one that runs off the bottom. A form
       longer than a page is still scrolled for the rest of it, as a print
       dialog scrolls; what is fitted is the page, not the whole form. The
       sheet's own padding is off the room already, which is what keeps a gap
       under the paper at every size.

       Framed in the panel only the width is fitted: the panel scrolls, and a
       short one would take the envelope down to nothing.

       THE HEIGHT FIT STOPS AT SEVEN TENTHS. Below that a form's smallest
       type is under 8px on screen, so a short window keeps the sheet there
       and the desk scrolls. The width still takes it lower, because a phone
       has no room to scroll a sheet sideways. */
    const standing = sheet.clientHeight
      - parseFloat(style.paddingBlockStart) - parseFloat(style.paddingBlockEnd);
    const height = framed || !Number.isFinite(tall) || !(standing > 0)
      ? Infinity : Math.max(0.7, standing / tall);
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

  // A length written onto the root in inches, as the CSS pixels it means.
  const paperPx = name => {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(name).trim();
    const inches = value.endsWith('in') ? parseFloat(value) : NaN;
    // 96 CSS pixels to the inch, which is what an inch means in CSS.
    return Number.isFinite(inches) ? inches * 96 : NaN;
  };

  /* WHERE THE PAPER RUNS OUT. A form that flows onto more than one sheet says
     where each one ends, because otherwise the only place anyone finds out is
     the print dialog, and a stop cut in half is found after it is printed.

     It walks the rows the way the printer does: a page holds what fits between
     its margins, `break-inside: avoid` keeps a row whole, and a row that will
     not fit starts the next page. The line is drawn at that row's own top,
     which is where the page really begins rather than where the measure ran
     out.

     The marks are laid over the form and take no room in it, so the rows below
     a break stay where the measure put them. The preview is one running sheet
     with the folds marked on it, not a stack of separate ones: the 0.8in of
     margin a real fold puts between two rows is not drawn. They are a guide --
     a printer's own unprintable margin can still take a row -- and they are
     drawn on screen only. */
  function showPageBreaks(card) {
    // A form held to one sheet is one sheet, and has no fold to draw.
    if (sheet.dataset.sheet !== 'flows') return 1;
    const page = paperPx('--scheduler-paper-height');
    const margin = paperPx('--scheduler-paper-margin');
    const usable = page - margin * 2;
    if (!Number.isFinite(usable) || usable <= 0) return 1;
    const breaks = breakTops(card, usable);
    for (const [i, top] of breaks.entries()) {
      const mark = el('div', 'scheduler-driver-itinerary__break');
      mark.style.insetBlockStart = `${top}px`;
      mark.appendChild(el('span', 'scheduler-driver-itinerary__break-label', `Page ${i + 2}`));
      card.appendChild(mark);
    }
    return breaks.length + 1;
  }

  /* Where each sheet after the first begins, measured from the card's own top
     in CSS pixels. It reads the card in whichever document holds it, so the
     PDF can measure its print-styled copy the same way the preview measures
     the sheet on screen. */
  function breakTops(card, usable) {
    const { getComputedStyle } = card.ownerDocument.defaultView;
    /* WHAT A PRINTER MOVES WHOLE. A table or block print.css keeps together
       (`break-inside: avoid`, which it sets on screen too so this reads it) is
       itself; a table that may break is its rows; a block holding kept parts
       breaks between them, so it is its children; anything else is itself.
       Counting only rows missed the quote's signature under its table, and
       counting the terms as one block missed the folds between them. */
    const whole = e => getComputedStyle(e).breakInside === 'avoid';
    const holdsKept = e => [...e.children].some(c => whole(c) || c.matches('table') || holdsKept(c));
    // From the sheet's own top, through every positioned box between.
    const topIn = e => {
      let top = 0;
      for (let n = e; n && n !== card; n = n.offsetParent) top += n.offsetTop;
      return top;
    };
    const unit = e => ({ top: topIn(e), height: e.offsetHeight, again: 0 });
    /* A TABLE IS ITS ROWS, and its head goes with the first of them: the
       printer keeps a head with a row under it, and prints it again at the
       top of every sheet the table runs onto, so a row that starts a sheet
       has the head's height above it there. */
    const rowsOf = t => {
      const rows = [...t.tBodies].flatMap(g => (whole(g) ? [g] : [...g.rows])).map(unit);
      const head = t.tHead?.offsetHeight || 0;
      if (!rows.length) return [unit(t)];
      if (head) {
        rows[0].height += rows[0].top - topIn(t.tHead);
        rows[0].top = topIn(t.tHead);
        for (const row of rows.slice(1)) row.again = head;
      }
      return rows;
    };
    const pieces = e => {
      if (whole(e)) return [unit(e)];
      if (e.matches('table')) return rowsOf(e);
      return holdsKept(e) ? [...e.children].flatMap(pieces) : [unit(e)];
    };
    const units = [...card.children]
      // A button is the screen's, and print.css takes it off the paper.
      .filter(e => e.offsetHeight && !e.matches('button, .scheduler-driver-itinerary__break'))
      .flatMap(pieces);
    const start = parseFloat(getComputedStyle(card).paddingBlockStart) || 0;

    // Measured first and marked after, because a mark laid over the form does
    // not move a row but reading one row at a time while inserting would.
    const breaks = [];
    let ends = usable;
    for (const { top: at, height, again } of units) {
      const top = at - start;
      if (top + height <= ends) continue;
      breaks.push(top + start);
      ends = top - again + usable;
    }
    return breaks;
  }

  /* THE COUNT AND THE FOLDS, measured off the sheet as it stands. The rows
     have to be on screen to be measured, and the marks take no room in the
     form, so nothing moves under them once they are laid. What it counted is
     what the band says, with the paper beside it by the name the print dialog
     gives it, so what to load and what to pick are read where Print is
     pressed. */
  function countSheets() {
    const cards = [...sheet.querySelectorAll(':scope > .scheduler-form')];
    if (!current || !cards.length) return;
    for (const mark of sheet.querySelectorAll('.scheduler-driver-itinerary__break')) mark.remove();
    const sheets = cards.reduce((n, card) => n + showPageBreaks(card), 0);
    count.textContent = [sheets === 1 ? '1 page' : `${sheets} pages`, current.form.page?.name]
      .filter(Boolean).join(' · ');
    numberPages(sheets);
  }

  /* PAGE 1 OF 2 at the foot of every sheet of a form that runs to more than
     one, so a stack that is dropped goes back in order. It is printed in the
     margin, which is the page's and not the form's, so it moves nothing on
     the sheet; a form of one sheet has nothing to number, and one held to its
     stock has no margin to print it in. It sits at the top of the margin,
     against the text, and clear of the edge a printer cannot reach. */
  function numberPages(sheets) {
    let style = document.getElementById('scheduler-print-folio');
    if (!style) {
      style = el('style');
      style.id = 'scheduler-print-folio';
      document.head.appendChild(style);
    }
    // The paper's face, as print.css names it for every form.
    const font = "'Helvetica Neue', Helvetica, Arial, sans-serif";
    style.textContent = sheets > 1 && sheet.dataset.sheet === 'flows'
      ? `@page { @bottom-center { content: "Page " counter(page) " of " counter(pages);
          vertical-align: top; padding-top: 0.08in; font-family: ${font}; font-size: 8pt; color: #525252; } }`
      : '';
  }

  /* Counted again after anything typed or added, because a line added or a
     field typed past its width moves everything under it. After the form's
     own handler, which is what adds the line. */
  for (const type of ['input', 'click']) {
    sheet.addEventListener(type, () => setTimeout(countSheets));
  }

  /* WHAT IS TYPED SURVIVES A CHANGE OF LAYOUT OR COPY. Each copy and layout
     keeps the sheets it was drawn as, typing and added rows included, for as
     long as the page is open, and switching back puts those same sheets back.
     Nothing is stored, so a reload starts clean. */
  const drawnSheets = new Map();

  const draw = () => {
    if (!current) return;
    // By what the copy is rather than where it sits, because the list grows
    // when the trip's other buses answer.
    const copy = current.every[current.chosen];
    const key = [copy?.assignment?.id, copy?.seat?.id, copy?.leg, copy?.week, current.layout].join('|');
    const kept = drawnSheets.get(key);
    if (kept) {
      sheet.replaceChildren(...kept);
      countSheets();
      fitPaper();
      current.form.afterDraw?.(sheet);
      return;
    }
    // A form draws one sheet or, like the quote and its agreement, several.
    const cards = [current.form.render(current.every[current.chosen], current.layout)].flat();
    /* THE PAPER CARRIES THE PAPER'S THEME, and only the paper: every --rux-*
       token on the form resolves to ink on it, while the desk it lies on and
       the bar above it follow the theme the person keeps. It says g10 and not
       white because white is Carbon's default rather than a theme it writes a
       rule for -- `data-theme="white"` matches nothing, so a sheet asking for
       it kept the dark theme around it and the ink came out white on the
       paper. g10 is the lightest theme Carbon does write, and its ink is the
       same #161616. */
    for (const card of cards) {
      card.setAttribute('data-theme', 'g10');
      // A form opened on nothing says so, for the rules that have to show where
      // the writing goes when there is none of it anywhere.
      if (current.blank) card.dataset.blank = '';
      if (current.blank || current.form.typed?.always) letThemType(card, current.form.typed?.fields);
    }
    sheet.replaceChildren(...cards);
    drawnSheets.set(key, cards);
    for (const card of cards) current.form.drawn?.(card, current.blank);
    countSheets();
    current.form.afterDraw?.(sheet);
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

     What is typed is on the page and nowhere else. It prints, it is kept
     while the page is open, and it is gone when the page is closed, which is
     what a spare form in a drawer does too.

     EVERY FIELD IS NAMED FOR ITS LABEL, so a field heard rather than seen is
     not a blank: the label beside it, or in a table its column and row. */
  function fieldName(field) {
    if (field.dataset.name) return field.dataset.name;
    const before = field.previousElementSibling;
    if (before && (before.tagName === 'DT' || /__(trip-|total-)?label\b/.test(before.className))) {
      return before.textContent.trim();
    }
    const td = field.closest('td');
    // The column names head the first of a form's tables, and name the rest.
    const names = td && ([...(td.closest('table').tHead?.rows || [])].find(r => r.cells.length > 1)
      || td.closest('.scheduler-form')?.querySelector('thead tr:has(th + th)'));
    const th = names?.cells[td.cellIndex];
    if (th && td.colSpan === 1) {
      const tr = td.parentElement;
      return `${th.textContent.trim()}, row ${[...tr.parentElement.rows].indexOf(tr) + 1}`;
    }
    if (field.matches('[class*="__day"], [class*="__day"] td, [class*="__day"] th')) return 'Day';
    return field.querySelector(':scope > [class$="__label"]')?.textContent.trim() || null;
  }

  function letThemType(root, selectors) {
    const fields = (selectors || []).flatMap(sel => [...root.querySelectorAll(sel)]);
    for (const field of fields) {
      // Chrome takes plaintext-only, which keeps pasted markup out of a form
      // that is about to be printed; everything else falls back to true.
      field.contentEditable = 'plaintext-only';
      if (field.contentEditable !== 'plaintext-only') field.contentEditable = 'true';
      field.spellcheck = false;
      field.dataset.typed = '';
      field.setAttribute('role', 'textbox');
      const name = fieldName(field);
      if (name) field.setAttribute('aria-label', name);
    }
  }

  // Print all lays every envelope on the trip on the sheet, prints, and puts
  // the one copy back once the dialog closes. print.css starts each on a new
  // page, and each is exactly one envelope tall.
  const drawAll = () => {
    if (!current) return;
    sheet.replaceChildren(...current.every.flatMap(c => [current.form.render(c, current.layout)].flat()));
  };

  /* THE TITLE A SAVED COPY IS OFFERED UNDER. Chrome's Save as PDF names the
     file after the page's title, so a form that says what its file is called
     holds the title to that for the length of the dialog. Printed from the
     board's panel, Chrome names it after the board's title instead, so the
     board's is held too. */
  const titled = [document];
  if (framed) {
    try { titled.push(window.parent.document); } catch { /* not the board's frame */ }
  }
  let titlesBefore = null;
  window.addEventListener('beforeprint', () => {
    const file = current?.form.fileName?.(current.every[current.chosen], current.layout);
    if (!file) return;
    const name = window.SchedulerFileNames.bare(file);
    titlesBefore = titled.map(doc => doc.title);
    for (const doc of titled) doc.title = name;
  });

  window.addEventListener('afterprint', () => {
    if (titlesBefore != null) {
      titled.forEach((doc, i) => { doc.title = titlesBefore[i]; });
      titlesBefore = null;
    }
    const all = printingAll;
    if (all) {
      printingAll = false;
      draw();
    }
    askToMark(all);
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

  /* WHICH ROWS A TICK IS WRITTEN ON. A mark `by: 'seat'` is this copy's own
     row in `trip_drivers`; a mark `by: 'crew'` is every filled seat on the
     copy's leg, for a sheet the whole leg shares. Either way the rows are ones
     the page already read, so the tick it draws is what the database says.

     A copy with no row to write on -- a blank form, a leg with nobody in a
     seat -- has no tick, and the toolbar leaves it out. */
  function markOf(form, copy, layout) {
    const marks = form?.marks;
    if (!marks || !copy || (marks.layout && layout !== marks.layout)) return null;
    const leg = copy.leg === 'return' ? 'return' : 'outbound';
    const rows = marks.by === 'crew'
      ? (copy.trip?.crew || []).filter(a => (a.leg || 'outbound') === leg).flatMap(a => seatsOf(a))
      : copy.seat?.id ? [copy.seat] : [];
    if (!rows.length) return null;
    return { table: marks.table, rows, column: marks.column, what: marks.what || 'form' };
  }
  const isMarked = mark => mark.rows.every(row => row[mark.column]);

  /* The tick, written on each row. It shows at once and goes back to what the
     rows said if the write fails, rather than showing a driver as handed
     something the database never heard about. `sync` is how the box in this
     page's bar follows the rows. */
  async function markPrinted(mark, want, sync) {
    const { table, rows, column } = mark;
    const was = rows.map(row => Boolean(row[column]));
    rows.forEach(row => { row[column] = want; });
    sync();
    const fail = why => { rows.forEach((row, i) => { row[column] = was[i]; }); sync(); flash(why, true); };
    const client = window.Rux?.account?.client;
    if (!client) return fail('Not connected, so the tick was not saved.');
    const { error } = await client.from(table).update({ [column]: want }).in('id', rows.map(row => row.id));
    if (error) return fail(`The tick did not save. ${error.message}`);
    flash(want ? 'Marked printed.' : 'No longer marked printed.');
  }

  /* AFTER A PRINT, THE PAGE ASKS. `afterprint` cannot tell a sheet that came
     out from a dialog that was cancelled, so nothing is marked by printing;
     the person who knows is asked, by name: "Mark Maria's envelope as
     printed?" Yes writes the tick, and the time and whose it was with it; No
     writes nothing. Rows already marked are not asked about again. */
  const markModal = document.getElementById('scheduler-print-mark-modal');
  const markHeading = document.getElementById('scheduler-print-mark-h');
  let asking = null;
  const namesOf = rows => {
    const names = rows.map(row => nameOf(row)).filter(Boolean);
    return names.length < 3 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
  };
  const followBox = () => {
    const box = document.getElementById('scheduler-print-marked');
    const shown = current ? markOf(current.form, current.every[current.chosen], current.layout) : null;
    if (box && shown) box.checked = isMarked(shown);
  };
  function askToMark(all) {
    if (!current) return;
    const { form, every, chosen, layout } = current;
    const rows = new Map();
    let first = null;
    for (const copy of all ? every : [every[chosen]]) {
      const mark = markOf(form, copy, layout);
      if (!mark) continue;
      first ??= mark;
      for (const row of mark.rows) if (!row[mark.column]) rows.set(row.id, row);
    }
    if (!rows.size) return;
    const mark = { ...first, rows: [...rows.values()] };
    const who = namesOf(mark.rows);
    const question = mark.rows.length === 1 && who
      ? `Mark ${who}'s ${mark.what} as printed?`
      : `Mark the ${mark.what} as printed for ${who || 'this trip'}?`;
    if (!markModal || !window.Rux?.modal?.open) {
      if (window.confirm(question)) void markPrinted(mark, true, followBox);
      return;
    }
    asking = mark;
    markHeading.textContent = question;
    window.Rux.modal.open(markModal);
  }
  document.getElementById('scheduler-print-mark-yes')?.addEventListener('click', () => {
    const mark = asking;
    asking = null;
    window.Rux?.modal?.close?.(markModal);
    if (mark) void markPrinted(mark, true, followBox);
  });
  markModal?.addEventListener('rux:modal-closed', () => { asking = null; });

  /* WHAT GOES IN THE ROW. Standing alone the page's bar holds the layout, the
     copy, Printed, Print and Print all. In the board's panel, 30rem wide, the
     head holds the copy and the panel holds Print, so the row is the layout. */
  /* A CELL OF THE BAND. Carbon ships no text toolbar -- the pattern is a page
     of guidance and a drawing, and the only toolbar classes it compiles are
     the table's -- so the cells that make one are this app's own, under its
     own prefix and in Carbon's own tokens. What a cell is: the band's full
     height, a rule down its leading edge, and nothing else until the pointer
     is over it. IBM's reference divides its whole bar this way and it is the
     whole of why that bar reads as one thing rather than a row of controls.

     A CHOICE IS A CELL WITH A SELECT IN IT. A Carbon select paints a field and
     an underline, which is a control placed in a band rather than a part of
     one; stripping those off it would be a local rule on a Carbon class, which
     this repository does not do. The element is a bare `select` the cell
     styles instead. */
  function pickCell(label, names, chosen, choose) {
    const cell = el('div', 'scheduler-print__cell scheduler-print__pick');
    const select = el('select', 'scheduler-print__cell-select');
    select.setAttribute('aria-label', label);
    names.forEach((text, i) => {
      const option = el('option', null, text);
      option.value = String(i);
      select.appendChild(option);
    });
    select.value = String(chosen);
    select.addEventListener('change', e => choose(Number(e.target.value) || 0));
    cell.append(select, sprite('#m-keyboard_arrow_down', 'scheduler-print__cell-arrow'));
    return cell;
  }

  // One of the sprite's drawings, at the size a cell wants it.
  function sprite(href, cls) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', cls);
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.setAttribute('viewBox', '0 0 32 32');
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', href);
    svg.appendChild(use);
    return svg;
  }

  function buildControls() {
    const { form, layout } = current;
    // Every envelope this trip has; it is this bus's until the trip's other
    // buses answer, and one of them is on the sheet.
    const every = current.every;
    const nodes = [];

    const chooseLayout = id => { current.layout = id; buildControls(); draw(); };

    /* WHICH LAYOUT, AND IT IS A SELECT IN BOTH PLACES. It was a content
       switcher on the page and two radio items in the panel's overflow, so one
       choice looked like two different things depending on where the form was
       opened. And Carbon gives the switcher a radius and an outline of its
       own -- almost nothing else square in the system has either -- so it read
       as a different family beside a row of square controls. The copy beside it
       is already a select; this row makes its choices one way. */
    const layouts = layoutsOf(form, current.blank);
    if (layouts.length > 1) {
      nodes.push(pickCell(
        'Layout',
        layouts.map(option => option.name),
        layouts.findIndex(option => option.id === layout),
        i => chooseLayout(layouts[i].id),
      ));
    }

    /* EVERY ENVELOPE ON THE TRIP, not only this bus's. The button beside it
       already counts the trip, and a list that stopped at one bus meant going
       back to the board to reach the next one. It starts as this bus's and
       grows when the trip's other buses answer.

       IN THE PANEL THE LIST IS THE HEAD'S, not the toolbar's: the head is
       already saying which envelope this is, so it is the thing to press to
       say which other one, the way the board's week label opens its date
       picker. That leaves the toolbar to the actions. */
    /* THE PANEL KEEPS TO THE LAYOUT AND PRINT. Printed and Print all are this
       page's own, where the Forms page is open on its own; the board's panel
       is for looking and printing one copy. */
    /* A form with one copy to a subject, like the quote, names no copy, and
       the head names the form. */
    const labelOf = copy => form.copyName?.(copy) ?? form.name;
    if (host) {
      const chosen = every[current.chosen];
      host.setViewerHead(
        current.blank ? `${form.name} — blank` : labelOf(chosen),
        every.length > 1 ? every.map((copy, i) => ({
          label: labelOf(copy),
          checked: i === current.chosen,
          choose: () => { current.chosen = i; buildControls(); draw(); },
        })) : [],
      );
    } else if (every.length > 1) {
      nodes.push(pickCell(
        'Copy',
        every.map(labelOf),
        current.chosen,
        i => { current.chosen = i; draw(); },
      ));
    }

    /* Printed is never ticked by printing alone: the page asks after a print,
       above, and this box is the same choice by hand, which also unticks a
       Yes given by mistake. In the board's panel it sits beside the panel's
       own Print, which is where the trip's checklist sends someone. */
    const printed = markOf(form, every[current.chosen], layout);
    if (printed) {
      const cell = el('div', 'scheduler-print__cell');
      const box = el('div', 'rux--form-item rux--checkbox-wrapper');
      const input = el('input', 'rux--checkbox');
      input.type = 'checkbox';
      input.id = 'scheduler-print-marked';
      input.checked = isMarked(printed);
      const label = el('label', 'rux--checkbox-label');
      label.htmlFor = input.id;
      label.appendChild(el('div', 'rux--checkbox-label-text', 'Printed'));
      input.addEventListener('change', () => void markPrinted(printed, input.checked,
        () => { input.checked = isMarked(printed); }));
      box.append(input, label);
      cell.appendChild(box);
      // The cell is what looks like the control, so a press anywhere in it
      // ticks the box.
      cell.classList.add('scheduler-print__cell--check');
      cell.addEventListener('click', e => { if (!e.target.closest('label, input')) input.click(); });
      if (host) cell.dataset.besidePrint = '';
      nodes.push(cell);
    }

    /* PRINT IS A GHOST ICON, which is what a toolbar's own actions are: in
       Carbon's band the persistent ones are ghost icon buttons and a primary
       belongs to the batch bar, where filling the whole height is the point.
       Built as a primary it read as exactly that, a slab wedged into the
       corner. The panel's printer button is the same drawing, so the two bars
       now carry the same thing.

       In the panel that button is the panel's own, which prints this frame
       exactly as it prints a stored file; standing alone the page carries it. */
    const actions = [];
    if (!host) {
      const print = el('button', 'scheduler-print__cell scheduler-print__cell--action');
      print.type = 'button';
      print.title = 'Print';
      print.setAttribute('aria-label', 'Print');
      print.appendChild(sprite('#m-print', 'scheduler-print__cell-icon'));
      print.addEventListener('click', () => window.print());
      actions.push(print);
    }

    /* Print all covers the same list the page's Copy offers: every envelope on
       the trip, including a bus with a single driver on a trip that has three
       more buses.

       A FORM THAT IS ALWAYS TYPED INTO DOES NOT OFFER IT. Laying the whole
       stack out draws every copy again, which takes back what was typed into
       the one on the sheet -- silently, between pressing the button and the
       dialog opening. Its copies are printed one at a time instead. */
    const stack = !host && every.length > 1 && !form.typed?.always && !form.oneAtATime;
    if (stack) {
      /* A cell like the others, flush and the band's height, labelled where
         Print beside it is a bare icon: the count is the whole of what this
         button has to say, and an icon cannot say six. */
      const all = el('button', 'scheduler-print__cell scheduler-print__cell--action scheduler-print__cell--label', `Print all ${every.length}`);
      all.type = 'button';
      all.title = 'Every copy on this trip';
      all.setAttribute('aria-label', `Print every copy on this trip, ${every.length} in all`);
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

    if (host) host.setFormControls(nodes);
    else controls.replaceChildren(...nodes);
  }

  /* WHAT A TRIP OFFERS THE HUB: its buses, and its legs. A trip is not an
     assignment, and this is the step between "the forms for this trip" and
     "the envelope for bus 12 on the way out"; a form that binds the trip and
     the leg stops one step earlier, at "the itinerary for the way out", so the
     legs are read beside the buses. */
  const TRIP_BUSES_QUERY = 'id,destination,trip_stops(leg),'
    + 'itinerary_printed_outbound,itinerary_printed_return,hos_form_printed_outbound,hos_form_printed_return,'
    + 'trip_assignments(id,leg,position,buses:bus_id(number),trip_drivers(id,driver_id,envelope_printed))';

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
    return { destination: data.destination, buses, legs: legsOf(data), trip: data };
  }

  async function showHub() {
    // On the panel's surface the tiles are the next layer up, as Carbon puts
    // what is inside a side panel.
    hub.classList.toggle('rux--layer-two', framed);
    host?.setToolbarShown?.(false);
    host?.setViewerBack?.(null);
    setPaper(null);
    setCrumbs(null);
    fitPaper();
    host?.setViewerHead('Forms');
    const trip = params.get('trip');
    title.textContent = 'Forms';
    count.textContent = '';
    bar.hidden = true;
    title.hidden = Boolean(host);
    hub.hidden = false;
    sheet.replaceChildren();

    const found = trip ? await tripBuses(trip) : null;
    if (found?.destination) {
      title.textContent = `Forms — ${found.destination}`;
      host?.setViewerHead(`Forms — ${found.destination}`);
    }

    /* A row is the form's icon and its short name, under the heading of who
       the form is for, which the short name leaves out. */
    const face = form => {
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      icon.setAttribute('class', 'scheduler-print__tile-icon');
      icon.setAttribute('width', '20');
      icon.setAttribute('height', '20');
      icon.setAttribute('fill', 'currentColor');
      icon.setAttribute('aria-hidden', 'true');
      const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttribute('href', form.icon);
      icon.appendChild(use);
      return [icon, el('h3', 'rux--type-body-compact-01 scheduler-print__tile-name', form.short)];
    };

    /* HOW MUCH OF A FORM IS PRINTED, from the ticks its copies carry: a
       seat's own on every filled seat of the trip, or the leg's on each leg.
       They are the ticks the form's Printed box writes, read with the trip,
       so the list shows what is left to print without opening each form. A
       form with nothing ticked says nothing. */
    const printedOf = form => {
      const marks = form.marks;
      if (!marks || !found?.trip) return null;
      const ticks = marks.by === 'leg'
        ? found.legs.map(leg => found.trip[`${marks.column}_${leg === 'return' ? 'return' : 'outbound'}`])
        : found.buses.flatMap(a => (a.trip_drivers || []).filter(d => d.driver_id && (!marks.only || marks.only(d)))
          .map(d => d[marks.column]));
      const done = ticks.filter(Boolean).length;
      if (!done) return null;
      const all = done === ticks.length;
      const says = el('p', 'scheduler-print__tile-done', all ? 'Printed' : `${done} of ${ticks.length} printed`);
      if (all) says.prepend(sprite('#m-check', 'scheduler-print__tile-check'));
      return says;
    };

    /* THE QUOTE FIRST, because it is the first thing a trip sends, then the
       drivers' forms. A trip's list leaves out the week schedule, which is
       the week's and not the trip's: the board's menu prints the week on
       screen, and this page opened on no trip still lists it. */
    const GROUP_ORDER = ['Customers', 'Drivers', 'Schedule'];
    const groups = new Map(GROUP_ORDER.map(group => [group, []]));
    for (const form of FORMS) {
      if (trip && form.binds === 'week') continue;
      if (!groups.has(form.group)) groups.set(form.group, []);
      groups.get(form.group).push(form);
    }
    for (const [group, forms] of groups) if (!forms.length) groups.delete(group);

    const list = document.createDocumentFragment();
    for (const [group, forms] of groups) {
      const section = el('section', 'scheduler-print__group');
      const heading = el('h2', 'rux--type-label-01 scheduler-print__group-name', group);
      heading.id = `scheduler-print-group-${group.toLowerCase()}`;
      section.setAttribute('aria-labelledby', heading.id);
      const tiles = el('div', 'scheduler-print__tiles');
      section.append(heading, tiles);
      list.appendChild(section);
      for (const form of forms) {
        /* EVERY FORM IS ONE ROW, AND THE ROW IS THE LINK. From a trip it
           opens that trip's copy -- the first bus, the way out -- and the
           form's own list moves to the trip's other buses and legs. A blank
           one is the Forms page's, opened on no trip. A form that cannot open
           says what it still wants instead. */
        let href = null;
        let need = null;
        const tripHref = `print.html?form=${form.id}&trip=${encodeURIComponent(trip)}&from=forms`;
        if (form.binds === null || form.binds === 'week') href = `print.html?form=${form.id}`;
        else if (!trip) {
          if (form.blank) href = `print.html?form=${form.id}&blank=1`;
          else need = 'Open it from a trip on the board.';
        } else if (found.why) need = found.why;
        else if (form.binds === 'trip+leg') href = `${tripHref}&leg=${found.legs[0] || 'outbound'}`;
        else if (form.binds === 'trip') href = tripHref;
        else if (!found.buses.length) need = 'No bus on this trip has a driver yet.';
        else href = `print.html?form=${form.id}&assignment=${encodeURIComponent(found.buses[0].id)}&trip=${encodeURIComponent(trip)}&from=forms`;

        if (href) {
          const tile = el('a', 'rux--link rux--tile rux--tile--clickable');
          tile.href = href;
          tile.append(...face(form));
          const printed = printedOf(form);
          if (printed) tile.appendChild(printed);
          tiles.appendChild(tile);
          continue;
        }
        const tile = el('div', 'rux--tile');
        tile.append(...face(form), el('p', 'scheduler-print__tile-need', need));
        tiles.appendChild(tile);
      }
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

  // The layouts a form offers: one that needs a trip is left off a blank form.
  const layoutsOf = (form, blank) => (form.layouts || []).filter(l => !(blank && l.trip));
  // The layout the address asks for, where the form draws more than one.
  const layoutWanted = (form, blank) => (layoutsOf(form, blank).some(l => l.id === params.get('layout'))
    ? params.get('layout') : layoutsOf(form, blank)[0]?.id);

  const notConnected = () => say('warning', 'Not connected.',
    'This page reads the schedule through the account script, which a local preview leaves off. The cloud preview is http://localhost:8641/.');

  // The form on the sheet, once its subject has answered.
  function show(form, subject, copies, chosen, blank) {
    setCrumbs(form, subject.trip);
    drawnSheets.clear();
    current = {
      form,
      subject,
      copies,
      chosen,
      every: copies,
      blank: Boolean(blank),
      layout: layoutWanted(form, blank),
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
    'id', 'trip_ref', 'customer', 'destination', 'trip_type',
    'start_date', 'end_date', 'return_start_date', 'return_end_date',
    'booking_contact_name', 'booking_contact_phone',
    'trip_contact_1_name', 'trip_contact_1_phone',
    'trip_contact_2_name', 'trip_contact_2_phone',
    'trip_contact_3_name', 'trip_contact_3_phone',
    'trip_contact_4_name', 'trip_contact_4_phone',
    'trip_contact_5_name', 'trip_contact_5_phone',
    'trip_stops(id,position,leg,type,name,address,depart_prev,depart_prev_date,arrive,arrive_date,spot,spot_date,miles,drive,dwell_status,lat,mapbox_id)',
  ];

  const tripQuery = form => [
    ...TRIP_COLUMNS,
    ...(form.columns || []),
    ...(form.marks?.by === 'leg' ? LEGS.map(leg => `${form.marks.column}_${leg}`) : []),
    // A mark that is every seat's on a leg needs the leg's seats, with the names its question says.
    ...(form.marks?.by === 'crew'
      ? [`crew:trip_assignments(id,leg,trip_drivers(id,driver_id,role,${form.marks.column},drivers:driver_id(name,short_name)))`] : []),
  ].join(',');

  /* THE WEEK, for the week schedule. `?week=` is its first day, as the board
     sends it; without one it is this week from Monday. The weeks either side
     are read in the same request, so the list steps between them without
     asking again. A cancelled trip is left off, as the board leaves it. */
  const WEEKS_BEFORE = 4, WEEKS_AFTER = 8;
  const WEEK_TRIP_COLUMNS = [
    'id,destination,customer,is_self_organized,start_date,end_date,return_start_date,return_end_date',
    'bus_count,return_bus_count,trip_type,trip_bar_color,confirmed,contract_status,trip_reqs',
    'req_56pax,req_sleeper,req_ada,need_hotel,need_fuel_card,departure_time,return_time',
    'booking_contact_name,booking_contact_phone,trip_contact_1_name,trip_contact_1_phone',
    'est_miles,actual_miles,quoted_price,deposit_amount,balance_paid,date_paid',
    'po_ref,po_received,po_amount,invoice_number,invoiced,invoice_status',
    'trip_stops(leg,position,type,depart_prev,spot,arrive,miles)',
    'trip_assignments(id,bus_id,position,leg,active_roles,trip_drivers(id,role,pay,drivers(name,short_name)))',
    'trip_payments(position,amount,method,date,ref)',
    'trip_pos(position,ref,amount)',
    'trip_invoices(position,number)',
    'trip_passengers(id)',
  ].join(',');

  async function showWeekForm(form) {
    const client = window.Rux?.account?.client;
    if (!client) return notConnected();
    const asked = /^\d{4}-\d{2}-\d{2}$/.test(params.get('week') || '') ? dayOf(params.get('week')) : null;
    const today = new Date();
    const first = asked || plusDays(new Date(today.getFullYear(), today.getMonth(), today.getDate()), -((today.getDay() + 6) % 7));
    const from = plusDays(first, -7 * WEEKS_BEFORE);
    const to = plusDays(first, 7 * (WEEKS_AFTER + 1) - 1);
    const [buses, trips] = await Promise.all([
      client.from('buses').select('id,number,status,sort_order').order('sort_order', { ascending: true, nullsFirst: false }),
      client.from('trips').select(WEEK_TRIP_COLUMNS).is('cancelled_at', null)
        .lte('start_date', isoDay(to))
        .or(`end_date.gte.${isoDay(from)},return_end_date.gte.${isoDay(from)},start_date.gte.${isoDay(from)}`),
      readRequirementNames(client).catch(() => {}),
    ]);
    if (buses.error || trips.error) {
      return say('error', "The week can't be read right now.", 'Check your connection, then reload the page.');
    }
    const weeks = [];
    for (let i = -WEEKS_BEFORE; i <= WEEKS_AFTER; i++) {
      weeks.push({ week: isoDay(plusDays(first, 7 * i)), buses: buses.data || [], trips: trips.data || [] });
    }
    return show(form, weeks[WEEKS_BEFORE], weeks, WEEKS_BEFORE);
  }

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
        .select(`id,leg,buses:bus_id(number,type),trips:trip_id(${columns})`)
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
    // The Detailed layout's figures add the office's pre-trip and post-trip
    // time, and its price says which rentals were priced as local.
    if (form.layouts?.some(l => l.trip)) {
      await Promise.all([readRouteTimes(client).catch(() => {}), readQuoteRules(client).catch(() => {})]);
    }
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
      client.from('trip_assignments').select(assignmentQuery(form)).eq('id', assignmentId).maybeSingle(),
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
        `Fill a seat on the trip's Buses tab, and the ${form.name.toLowerCase()} has someone to print for.`);
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
    host?.setToolbarShown?.(true);
    /* Reached from a trip's list in the panel, it goes back to that list. It
       loads the list by address rather than stepping back, because a frame's
       history is the whole page's, and the board may have moved since. */
    const fromTrip = params.get('from') === 'forms' && params.get('trip');
    host?.setViewerBack?.(fromTrip
      ? () => location.replace(`print.html?trip=${encodeURIComponent(fromTrip)}`)
      : null);
    title.textContent = form.name;
    // Named from the address first, so a form that cannot be drawn still has a
    // way back; `show` names it again from the trip once that has answered.
    setCrumbs(form, { id: params.get('trip') });
    setPaper(form);
    // The paper is named now, so the sheet can be fitted to the room it has.
    fitPaper();
    bar.hidden = Boolean(host);
    title.hidden = Boolean(host);
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

    if (form.binds === 'week') return showWeekForm(form);
    if (form.binds === 'trip' || form.binds === 'trip+leg') return showTripForm(form);
    return showBusForm(form);
  }

  const form = formOf(params.get('form'));
  if (!form) void showHub();
  else void showForm(form);
})();
