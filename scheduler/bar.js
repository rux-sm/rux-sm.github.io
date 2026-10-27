/* ==========================================================================
   Rux Scheduler — BAR, a trip's bar as the board draws it
   --------------------------------------------------------------------------
   One assignment's bar: the trip's colour, its rows, its crew and the icon
   that leads its update, a warning for a problem or a clock for its age. data.js draws the board's bars with it and components.html
   draws its samples with it, so the two cannot differ.

   `draw(b, board)` is one bar, `b` the board's `{ trip, leg, assign, place,
   slot, lane }`, and `board` what the bar reads from the board around it:
     driversById, busesById   the drivers and buses, as Maps by id;
     statuses                 the driver statuses the office keeps;
     standing(trip, key)      clashes.js's standing answer for the leg, which
                              the board works out once a draw; without it the
                              answer is read against `nearby`;
     nearby                   { trips, off, oos } the standing rule reads;
     saving(assignmentId)     true while a move to this bus is unanswered;
     itineraryOf(trip, key)   the itinerary the leg's drivers are handed;
     staffedUntil             the ISO day the office staffs to, exclusive,
                              where an empty seat stops being due.
   It hands back `{ bar, facts }`, `facts` being `{ needs, misfits,
   overSeated, driverAlerts, tells }`, which the trip's card reads.

   `alertsOf(trip, facts)` is every alert the trip's card lists, which the
   bar counts. `crewEl(c, due, back)` is one crew member as the drivers row draws
   them, `crewText(c)` and `crewName(c)` the same in words, and `fitCrew`
   gives a crew row's names way when they do not fit. `fitKind(bar)` drops
   the word from a one-way or split leg's pill when the times would be cut. `hhmm(t, short)`,
   `clockEl(short)`, `setAt(at)` and `updateStamp(u)` are times as the bar
   and its card say them.

   Every value from the database is written with textContent.
   ========================================================================== */
(() => {
  'use strict';

  const {
    REQUIREMENTS, requirementLabel, requirementIcon, shortfall, needsFor, wrongType, seatsOf, overSeats,
    activeRolesOf, crewOf, tripContact, dayOfContact,
  } = window.SchedulerLegFacts;
  const { tripColorOf, standardHueOf, hueFor } = window.SchedulerWeek;
  const { waitsOf, updatesOf, asks: asksFollowUp, WORDS: WAIT_WORDS } = window.SchedulerFollowUp;
  const DAY = 864e5;

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
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
  // A phone number as it is shown, from phone.js.
  const showPhone = n => window.SchedulerPhone.format(n);
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const parseDay = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
  // "Tue", of an ISO day or a date.
  const weekday = d => (d instanceof Date ? d : parseDay(d)).toLocaleDateString('en-US', { weekday: 'short' });
  // The days after the last it takes a leg comes back, before the office's
  // late-return hour, as `SchedulerWeek.takes` counts them: the bar marks its
  // return +1.
  const daysBack = leg => leg.backDays ?? 0;

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

  /* The pill a one-way trip and each leg of a split wear after the
     destination: an arrow the way the bus goes and the word, in the bar's own
     ink inside a quiet outline of it. `fitKind` drops the word when the
     destination beside it would be cut, and the tooltip keeps it. */
  const KINDS = {
    'one way': { icon: '#m-arrow_forward', word: 'One way' },
    'drop-off': { icon: '#m-download', word: 'Drop-off' },
    pickup: { icon: '#m-upload', word: 'Pickup' },
  };
  const kindEl = kind => {
    const { icon, word } = KINDS[kind];
    const pill = el('span', 'scheduler-bar__kind');
    pill.title = word;
    pill.append(svgUse(icon, '12', '0 0 12 12'), el('span', 'scheduler-bar__kind-word', word));
    return pill;
  };
  const fitKind = bar => {
    const pill = bar.querySelector(':scope > .scheduler-bar__dest > .scheduler-bar__kind');
    if (!pill) return;
    pill.classList.remove('scheduler-bar__kind--icon');
    // A trip of more than one bus cuts its name inside the count's box.
    const first = pill.parentElement.firstElementChild;
    const name = first.classList.contains('scheduler-bar__multi') ? first.firstElementChild : first;
    if (name.scrollWidth > name.clientWidth) pill.classList.add('scheduler-bar__kind--icon');
  };

  /* The one icon that leads the update row, in a colour of `tone`, saying in
     `words` what it marks: the warning sign for a problem, or the clock for
     how lately an open trip was touched. A press on it opens the trip's
     card, so it is one of the bar's card openers. */
  const leadMark = (tone, href, words) => {
    const m = el('span', `scheduler-bar__lead scheduler-bar__lead--${tone}`);
    m.appendChild(svgUse(href, '16', '0 0 32 32'));
    m.dataset.cardOpener = '';
    m.setAttribute('role', 'img');
    m.setAttribute('aria-label', words);
    m.title = words;
    return m;
  };
  /* WHAT IS A PROBLEM ON THE BOARD: a bus that does not fit, more passengers
     than seats, and a driver who said no or must be told of a change. The
     paperwork the office works through on every trip -- a confirmation, PO,
     itinerary or balance waited on, the trip contact, a hotel or an HOS form
     -- is the card's to list and the Tasks list's to ask for, and marks
     nothing here, or every bar would carry a warning. */
  const PROBLEM_SPOTS = new Set(['seats', 'driver']);
  const isProblem = a => a.row === 'scheduler-card__misfit' || PROBLEM_SPOTS.has(a.spot);
  /* BUT THE TRIP CONTACT AND THE ITINERARY BECOME A PROBLEM as the leg
     comes near: still missing from today to SOON_DAYS days before the leg
     leaves, they put up the warning sign too. The Tasks list has asked for
     them over the week before, by to-do.js's missing rule. */
  const SOON_DAYS = 2;
  /* A destination as the bar shows it: the home state, ", TX" or " TX" at
     the end, is left off, since nearly every trip is in Texas and the two
     letters cut the place's own name short. Another state stays. What was
     typed is untouched everywhere else. */
  const placeName = dest => String(dest || '').replace(/,?\s+TX\s*$/i, '');
  const addRow = (bar, cls, ...parts) => {
    const r = el('div', `scheduler-bar__row ${cls}`);
    for (const p of parts) if (p != null) r.appendChild(p);
    bar.appendChild(r);
    return r;
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
  /* A short time as the bar draws it: the figures, then the a or p in a
     span app.css sets smaller and dimmer, so the figures are what reads. */
  const clockEl = short => {
    const f = document.createDocumentFragment();
    // A time `hhmm` could not read comes back as typed, with nothing to split.
    if (/[ap]$/.test(short)) f.append(short.slice(0, -1), el('span', 'scheduler-bar__ampm', short.slice(-1)));
    else f.append(short);
    return f;
  };

  const crewName = c => (c.who ? (c.who.short_name || c.who.name) : 'Unknown driver');

  // When a status was set, as "Sep 12, 3:40 PM" on this computer's clock.
  const setAt = at => {
    const d = new Date(at || '');
    return Number.isNaN(d.getTime()) ? ''
      : d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  /* An update's stamp: when, who wrote it, and whether its words were
     changed. An `imported` row was copied out of the old notes, so it has a
     date and no time. */
  function updateStamp(u) {
    const at = new Date(u.created_at);
    const opts = { month: 'short', day: 'numeric' };
    if (at.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
    const when = u.kind === 'imported' ? at.toLocaleDateString(undefined, opts)
      : at.toLocaleString(undefined, { ...opts, hour: 'numeric', minute: '2-digit' });
    return [when, u.actor_name || (u.kind === 'imported' ? 'From the old notes' : 'Someone'),
      u.edited_at ? 'edited' : null].filter(Boolean).join(' · ');
  }

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
      parts.push(c.row?.source === 'driver' ? `${label} by the driver` : c.row?.source === 'samsara' ? `${label} by Samsara` : `${label}, set by dispatch`);
      const at = setAt((value === 'confirmed' && c.row?.acceptedAt)
        || (value === 'declined' && c.row?.declinedAt) || c.row?.updatedAt);
      if (at) parts.push(at);
    }
    return parts.join(' · ');
  }

  /* A trip that is back, in the update row's words: when this bus reached
     its pickup, Spot and the time, in amber when after the Spot, as the
     on-time pay counts it, then when it got back to the yard, Back and the
     time, in amber when more than ten minutes past its planned yard-back, a
     dimmed dot between: two facts, which fit the narrowest bar. With neither
     time yet, the miles driven once they are in. Then the money: Paid in
     green once paid in full, or what is still due in amber; a trip with no
     price says nothing of it. The tooltip says every fact in a sentence. */
  const money = n => `$${Math.round(n).toLocaleString('en-US')}`;
  const LATE_BACK_MS = 10 * 60e3;
  function completeEl(trip, assign, leg) {
    const Road = window.SchedulerRoad;
    const { price, paid, remaining } = window.SchedulerBilling.of(trip);
    const item = el('span', 'scheduler-bar__complete');
    const parts = [];
    const said = ['Trip complete'];
    const time = (label, iso, cls, lateBy, words) => {
      const at = iso ? Date.parse(iso) : NaN;
      if (!Number.isFinite(at)) return;
      const clock = hhmm(Road.clockOf(at), true);
      const late = lateBy(at);
      const part = el('span', `scheduler-bar__complete-time${late ? ' scheduler-bar__complete-time--late' : ''} ${cls}`);
      part.append(`${label} `, clockEl(clock));
      parts.push(part);
      said.push(`${words} ${clock}${late ? `, ${late} minutes late` : ''}`);
    };
    const spot = leg ? Road.stopsOf(trip, leg.key)[0]?.due ?? null : null;
    time('Spot', assign?.pickup_at, 'scheduler-bar__complete-spot', at => Road.pickupLate(spot, at) || 0, 'at the pickup');
    const planned = leg ? window.SchedulerWeek.backAt(leg) : null;
    time('Back', assign?.actual_yard_return_at, 'scheduler-bar__complete-back',
      at => (planned != null && at - planned > LATE_BACK_MS ? Math.round((at - planned) / 60e3) : 0), 'back at the yard');
    const miles = Number(trip.actual_miles) || 0;
    if (miles > 0) {
      if (!parts.length) parts.push(el('span', 'scheduler-bar__complete-miles', `${Math.round(miles).toLocaleString('en-US')} mi`));
      said.push(`${Math.round(miles).toLocaleString('en-US')} miles`);
    }
    if (price > 0 && remaining > 0) {
      parts.push(el('span', 'scheduler-bar__complete-due', `${money(remaining)} due`));
      said.push(`${money(remaining)} of ${money(price)} still due`);
    } else if (price > 0 && paid > 0) {
      parts.push(el('span', 'scheduler-bar__complete-paid', 'Paid'));
      said.push('paid in full');
    } else if (price <= 0) said.push('no price yet');
    parts.forEach((p, k) => item.append(...(k ? [el('span', 'scheduler-bar__complete-sep', '·'), p] : [p])));
    item.title = said.join(', ');
    return item;
  }

  /* One crew member on the drivers row: a mark in the status's tone, then the
     short name. A driver or co-driver's mark is their status's own shape, the
     one the editor shows, and a relief driver's the two opposite arrows, so a
     relief never reads as another driver. The colours are the answer: grey
     not sent, red to assign, amber sent and waiting, green confirmed, red
     declined. A role nobody fills has no status, its mark a dashed empty
     circle and "No driver" dimmed, as "No times" is, and a declined driver's
     name is struck through as well. An empty seat on a leg that is due takes the warning
     colour instead, mark and words, because it is the one that needs filling
     now. */
  const RELIEF_ROLES = new Set(['relief-start', 'relief-end']);
  // A trip that is back: every driver who did not decline wears the
  // confirmed check, which app.css draws in the bar's own ink.
  const DONE_ICON = '#m-check_circle-fill';
  function crewEl(c, due, back) {
    const tone = c.needed ? 'off' : c.status.tone;
    const item = el('span', ['scheduler-crew', c.status?.value === 'declined' && 'scheduler-crew--declined',
      c.needed && due && 'scheduler-crew--due'].filter(Boolean).join(' '));
    const dot = !RELIEF_ROLES.has(c.role);
    const mark = el('span', ['scheduler-crew__mark', tone && `scheduler-crew__mark--${tone}`, dot && 'scheduler-crew__mark--dot',
      c.needed && 'scheduler-crew__mark--empty'].filter(Boolean).join(' '));
    mark.appendChild(c.needed && dot ? el('span', 'scheduler-crew__dot')
      : dot ? svgUse(back && c.status.value !== 'declined' ? DONE_ICON : c.status.icon, '16', '0 0 32 32') : svgUse(c.icon, '16', c.box));
    item.appendChild(mark);
    item.appendChild(el('span', c.needed ? 'scheduler-crew__name scheduler-bar__none' : 'scheduler-crew__name',
      c.needed ? (dot ? `No ${c.label.toLowerCase()}` : 'No relief') : crewName(c)));
    item.title = crewText(c);
    if (c.driverId != null) item.dataset.driverId = c.driverId;
    // The seat it is: what a press pulls its driver out by, and where a carried one goes in.
    item.dataset.seat = c.role;
    return item;
  }

  /* THE CREW GIVES WAY A WHOLE NAME AT A TIME, from the end, and says how
     many it left out: "Raul +1". Only a first name that does not fit alone is
     cut short. It is measured, so it runs again whenever the bar's width
     changes; the bar is watched rather than the crew, whose own width is what
     this sets. Two seats on a live bar share the row and each cuts its own
     name short instead, so both drivers stay on it; a third gives way. */
  const fitCrew = crew => {
    const items = [...crew.children].filter(n => n.classList.contains('scheduler-crew'));
    crew.querySelector(':scope > .scheduler-bar__more')?.remove();
    for (const item of items) item.style.removeProperty('display');
    if (items.length <= 2 && items.every(item => item.classList.contains('scheduler-crew--seat'))) return;
    const cut = () => items.some(item => {
      const name = item.style.display ? null : item.querySelector('.scheduler-crew__name');
      return name && name.scrollWidth > name.clientWidth;
    });
    if (items.length < 2 || !cut()) return;
    const more = el('span', 'scheduler-bar__more');
    crew.appendChild(more);
    for (let shown = items.length - 1; shown >= 1; shown--) {
      items[shown].style.display = 'none';
      const left = items.slice(shown);
      more.textContent = `+${left.length}`;
      more.title = left.map(item => item.title).join('\n');
      if (!cut()) break;
    }
  };
  const crewObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(entries => {
    for (const { target } of entries) {
      const crew = target.querySelector(':scope > .scheduler-bar__drivers > .scheduler-bar__crew');
      if (crew) fitCrew(crew);
      fitKind(target);
    }
  }) : null;

  /* The warning a need still to be done shows. EVERY ALERT NAMES ITS THING
     FIRST AND ITS STATE AFTER, in one of a few words: needed, what the bus
     lacks; missing, what the trip has not got; pending, what is still to be
     done; due, money owed. */
  const TODO_WORDS = { hotel: 'Hotel booking pending', hos: 'HOS form pending' };
  /* EVERY ALERT A TRIP HAS, in the order its card lists them, from `facts`,
     what `draw` hands back for the bar: its words, the card row it is drawn
     as, where a press on it goes and the field it names. The bar counts
     these and the card draws them, so the two never disagree.

     A bus that does not fit this trip leads: it is a mistake on the board,
     and it goes when the bus is changed. Then the follow-up reminder, one for
     each thing waited on, which stays while it is true, until the missing
     thing arrives or an update is written. Then nobody named to call on the
     day, on a trip not marked as needing no one. Last, a need that is still a
     job, the hotel to book or the hours-of-service form to print; a need the
     bus falls short of is already a misfit, and one that is met is no alert. */
  function alertsOf(trip, facts) {
    /* A trip that is back asks nothing on the board: what its record still
       lacks is the editor's Billing tab's Closed list and the Trips page's. */
    if (window.SchedulerCloseOut.isBack(trip)) return [];
    const list = (facts?.misfits ?? []).map(words => ({ row: 'scheduler-card__misfit', go: 'fleet', words }));
    if (asksFollowUp(trip)) {
      for (const w of waitsOf(trip)) {
        list.push({ row: 'scheduler-card__asks', go: w === 'itinerary' ? 'itinerary' : 'billing', spot: w, words: WAIT_WORDS[w] });
      }
    }
    if (!dayOfContact(trip, facts?.leg) && !trip.contact_not_needed) {
      list.push({ row: 'scheduler-card__warn', go: 'details', spot: 'contact', words: 'Trip contact missing' });
    }
    if (facts?.overSeated) list.push({ row: 'scheduler-card__warn', go: 'fleet', spot: 'seats', words: `More passengers than seats: ${facts.overSeated}` });
    for (const words of facts?.driverAlerts ?? []) list.push({ row: 'scheduler-card__warn', go: 'contacts', spot: 'driver', words });
    for (const n of facts?.needs ?? []) {
      if (n.done || n.short) continue;
      list.push({ row: 'scheduler-card__warn', go: n.id === 'hos' ? 'forms' : 'billing', spot: n.id, words: TODO_WORDS[n.id] ?? n.label });
    }
    return list;
  }

  /* The day the office staffs to: the end of next week, the Monday two weeks
     on from this one. A board whose week starts on Sunday hands its own. */
  const staffedUntilNow = () => {
    const now = new Date();
    return iso(addDays(now, 14 - (now.getDay() + 6) % 7));
  };
  const NOBODY_NEAR = { trips: [], off: [], oos: [] };

  function draw(b, board) {
    const { trip, leg, assign, place, slot } = b;
    const { driversById, busesById, statuses } = board;
    const hue = hueFor(trip);
    const bar = el('article', `scheduler-bar scheduler-bar--${hue}`);
    // The bar menu reads both to check the trip's colour and paint Standard.
    bar.dataset.tripColor = tripColorOf(trip) ?? '';
    bar.dataset.standardHue = standardHueOf(trip);
    /* The leg is read by its key, week.js's, which is its id on a trip read
       with its legs. The itinerary shortcut and menu item open this document. */
    const itinerary = board.itineraryOf?.(trip, leg.key) ?? null;
    bar.dataset.itineraryId = itinerary?.id ?? '';
    // The bar menu's hotel item reads both: whether the trip needs a hotel, and
    // whether this leg's is booked.
    bar.dataset.needHotel = trip.need_hotel ? 'true' : '';
    bar.dataset.hotelBooked = leg.hotelBooked ? 'true' : '';
    bar.setAttribute('role', 'button');
    bar.tabIndex = 0;
    bar.setAttribute('aria-pressed', 'false');
    bar.dataset.tripId = trip.id;
    // A trip that is back stays where it is on the board; close-out.js says when.
    if (window.SchedulerCloseOut.isBack(trip)) bar.classList.add('scheduler-bar--back');
    // The leg by its key, week.js's, and its number; `leg` is the old word it mirrors, if any.
    bar.dataset.legKey = leg.key ?? leg.leg;
    bar.dataset.legNumber = leg.number ?? 1;
    bar.dataset.leg = leg.leg ?? '';
    bar.dataset.start = place.start;
    bar.dataset.span = place.span;
    // The slot is the position an empty slot's assignment row is written at.
    bar.dataset.slot = slot;
    if (assign) {
      bar.dataset.assignmentId = assign.id;
      if (board.saving?.(assign.id)) bar.classList.add('scheduler-bar--saving');
      bar.dataset.busId = assign.bus_id ?? '';
    }
    if (place.fromPrev) bar.classList.add('scheduler-bar--from-prev');
    if (place.toNext) bar.classList.add('scheduler-bar--to-next');
    bar.style.setProperty('--scheduler-start', place.start);
    bar.style.setProperty('--scheduler-span', place.span);
    bar.style.setProperty('--scheduler-lane', b.lane);

    /* A PLACEHOLDER IS NOT A TRIP YET, as billing.js reads one. Nothing is
       due on it, so its bar is never the wrong bus and draws no empty seat and
       no missing bus; a driver someone has named still shows. */
    const placeholder = window.SchedulerBilling.placeholder(trip);

    /* A leg that leaves the group or fetches it says so in a pill at the time
       row's end, its arrow pointing the way the bus does: across for a
       one-way trip, down for a split's drop-off, where the group is set down,
       up for its pickup, every leg after the first. The pill says which leg
       of a split this is, so the reference is only its count. */
    const SHAPE = window.SchedulerTripShape;
    const kind = SHAPE.isSplit(trip) ? (SHAPE.isPickup(trip, leg.key) ? 'pickup' : 'drop-off')
      : SHAPE.legOf(trip, leg.key)?.kind === 'one_way' ? 'one way' : null;
    /* How many buses the leg takes, written after the destination on a leg of
       more than one: `×3`. Which of them a bar is goes unsaid, because its row
       is the bus. */
    const count = leg.count || 1;

    /* WHETHER THIS BUS FITS THIS TRIP, and what the trip needs. The bar draws
       no mark for a need: the needs are read on the trip's card, which the
       facts hand them to, and the bar only counts the ones still open. A bus
       that does not fit turns that count red, since it is a mistake to put
       right rather than a job still to come: the wrong type of bus, or one
       that falls short of a need. A placeholder has neither. */
    const bus = assign?.bus_id != null ? busesById.get(assign.bus_id) : null;
    const wrong = bus ? wrongType(assign.vehicle_type, bus) : null;
    /* Every need the trip carries, in the office's order, and whether this bus
       meets it. The hotel is the one a bus cannot answer for: it is booked or
       it is not, per leg, and the trip says which. */
    const needs = placeholder ? [] : needsFor(trip, assign).map(id => {
      const name = id === 'hotel' ? (REQUIREMENTS.hotel?.label || 'Hotel') : requirementLabel(id);
      if (id === 'hotel') {
        const booked = !!leg.hotelBooked;
        return { id, href: REQUIREMENTS.hotel?.icon, name, label: booked ? 'Hotel booked' : 'Hotel not booked', done: booked };
      }
      const missing = shortfall(id, bus);
      return {
        id,
        href: requirementIcon(id),
        letter: requirementIcon(id) ? null : name.trim().charAt(0).toUpperCase(),
        name,
        label: missing || name,
        done: !missing,
        short: !!missing,
      };
    });
    /* A PART-TIME DRIVER SIGNS AN HOURS-OF-SERVICE RECORD, so a bus with one
       in any seat needs it, and it is done once the Forms page marks each
       of them printed. Like the hotel, it is a job and not the bus's
       equipment, so it is never a misfit. */
    const partTimers = placeholder ? [] : (assign?.trip_drivers || []).filter(d => d.driver_id
      && activeRolesOf(assign).has(d.role || 'driver')
      && driversById.get(d.driver_id)?.employment_type === 'part-time');
    if (partTimers.length) {
      const printed = partTimers.every(d => d.hos_form_printed);
      needs.push({ id: 'hos', href: '#m-schedule', name: 'Hours of service',
        label: printed ? 'Hours of service printed' : 'Hours of service not printed', done: printed });
    }
    /* WHAT STANDS IN THE WAY of this bus and its seats, by clashes.js's
       standing rule: another trip, days out, time off, Inactive or a card
       that runs out. Each is a mistake to put right, so a misfit. */
    const standing = board.standing
      ?? ((t, l) => window.SchedulerClashes.standing(t, l, board.nearby ?? NOBODY_NEAR, { driversById, busesById }));
    const clashes = placeholder || !assign ? []
      : standing(trip, leg.key).filter(c => String(c.assignmentId) === String(assign.id)).map(c => c.words);
    const misfits = placeholder ? [] : [wrong, ...needs.filter(n => n.short).map(n => n.label), ...clashes].filter(Boolean);
    // More passengers than the leg's buses seat, a warning on every bar of the leg.
    const overSeated = placeholder ? null : overSeats(trip.passengers, seatsOf(trip, leg.key, busesById));
    /* THE DRIVERS ON THIS BUS who said no, or whom the leg changed for since
       they said yes, as driver-job.js reads it: each a warning, which the
       Contact list puts right. */
    const tells = [];
    const driverAlerts = placeholder || !assign ? [] : crewOf(trip, assign, driversById, statuses).flatMap(c => {
      if (c.needed) return [];
      const name = c.who?.short_name || c.who?.name || 'A driver';
      if (c.status?.value === 'declined') return [`${name} declined`];
      const lines = window.SchedulerDriverJob?.changesSince(trip, leg.key, c.driverId, c.row,
        { busesById, driversById, nameOf: requirementLabel }) ?? [];
      if (!lines.length) return [];
      tells.push(name);
      return [`Tell ${name}: ${lines.join(', ')}`];
    });
    // `tells` names the drivers to be told, for the bell on the bar menu's Call or text.
    const facts = { leg: leg.key, needs, misfits, overSeated, driverAlerts, tells };

    /* THE WARNING SIGN, at the update row's start, for a trip with a
       problem, its words on the tooltip: red for a bus that does not fit, a
       mistake on the board, and the warning colour for the rest. The card
       still lists every alert. A mark, not a button, because the bar is the
       button. */
    const problems = alertsOf(trip, facts).filter(isProblem).map(a => a.words);
    const today = new Date();
    if (!window.SchedulerCloseOut.isBack(trip) && !placeholder && leg.from >= iso(today) && leg.from <= iso(addDays(today, SOON_DAYS))) {
      if (!dayOfContact(trip, leg.key) && !trip.contact_not_needed) problems.push('Trip contact missing');
      const firstLeg = window.SchedulerWeek.legsOf(trip)[0]?.key;
      if (!trip.itinerary_not_needed && !SHAPE.itineraryFor(trip, firstLeg)) problems.push(WAIT_WORDS.itinerary);
    }
    let lead = problems.length
      ? leadMark(misfits.length ? 'error' : 'warning', '#m-error-fill', problems.join(' · ')) : null;
    /* A trip that is back is faded on the board and says what it came to in
       its update row; a back trip raises no alert. */
    const isDone = window.SchedulerCloseOut.isBack(trip) && !window.SchedulerBilling.placeholder(trip);
    const destName = el('span', null, placeName(trip.destination) || 'No destination');
    const dest = count > 1 ? el('span', 'scheduler-bar__multi') : destName;
    if (count > 1) dest.append(destName, el('span', 'scheduler-bar__count', `×${count}`));
    /* The destination row holds what the trip is on the left, and only what
       is happening now on the right: the faces of whoever else has it, which
       data.js adds, and Live while the bus is out, road-bar.js's. */
    addRow(bar, 'scheduler-bar__dest', dest, kind ? kindEl(kind) : null);
    addRow(bar, 'scheduler-bar__client', el('span', null, trip.customer || ''));

    // The booking contact as the trip records it. The board shows the name
    // alone; the phone is kept for the docked sheet, where it dials.
    const contact = tripContact(trip, 0);
    const who = el('span', null, contact?.name || '');
    if (contact) who.title = [contact.name, showPhone(contact.phone)].filter(Boolean).join(' · ');
    addRow(bar, 'scheduler-bar__contact', who, contact?.phone ? el('span', 'scheduler-bar__phone', showPhone(contact.phone)) : null);

    // Departure and return on one line, "2:10p–12:30a", the short form on
    // every bar so bars of one width read alike and the narrowest day column
    // holds it. A leg with neither says so, so an empty row never reads as a
    // rendering fault. The spot time is not drawn, because two times already
    // fill the row; the editor shows it.
    const dep = hhmm(leg.depart, true), back = hhmm(leg.back, true);
    // "No times" is dimmed, quieter than a time, as app.css draws it.
    const none = !dep && !back;
    /* A leg that crosses the week's edge names the day of both its times,
       "Thu 3:53a – Mon 1:53a", since the bar does not reach one of them and a
       weekday beside a bare time reads as that same day. The weekday says the
       day, so such a leg has no +1. */
    const crosses = place.fromPrev || place.toNext;
    const depart = (crosses ? [`${weekday(leg.from)} `] : []).concat(dep ? [clockEl(dep)] : []);
    const ret = (crosses ? [`${weekday(addDays(parseDay(leg.to), daysBack(leg)))} `] : []).concat(back ? [clockEl(back)] : []);
    // Thin spaces either side of the dash, so the two times read as two.
    const when = el('span', none ? 'scheduler-bar__none' : null);
    if (dep && back) when.append(...depart, '\u2009\u2013\u2009', ...ret);
    else if (dep) when.append('Dep ', ...depart);
    else if (back) when.append('Ret ', ...ret);
    else when.append('No times');
    if (daysBack(leg) && !(crosses && back)) {
      const mark = el('sup', 'scheduler-bar__next-day', `+${daysBack(leg)}`);
      mark.title = daysBack(leg) > 1 ? `Returns ${daysBack(leg)} days later` : 'Returns the next day';
      when.appendChild(mark);
    }
    /* A second form, for the compact board: one line has room for one time, and
       the one worth reading at a glance is when the bus leaves. A leg with only
       a return says so, and a leg with neither says the times are still to come,
       rather than leaving the row empty. */
    const whenDep = el('span', none ? 'scheduler-bar__time-dep scheduler-bar__none' : 'scheduler-bar__time-dep');
    if (dep) whenDep.append(clockEl(dep));
    else if (back) whenDep.append('Ret ', clockEl(back));
    else whenDep.append('No times');
    addRow(bar, 'scheduler-bar__time', when, whenDep);

    /* The newest update's words on one line, in the bar's ink, the last
       thing anyone said about the trip, as the card's list starts with it.
       While the trip has anything open and no problem, a clock leads them
       in the colour of the update's age, so down a week the eye finds the
       trips still in play and how lately each was touched: green while the
       card's age reads in minutes, hours or 1d, amber for the rest of its
       first week, and red once the card shows a date. Open is anything the
       card would warn of or the office still waits on: a bus that does not
       fit, a need still to do, nobody to call on the day, or a
       confirmation, PO, itinerary or balance not in. A settled trip has no
       clock, since its age asks for nothing. A trip with none leaves the row
       empty, so every bar on the board is one height.
       ONCE THE TRIP IS BACK, which its faded colour says, the row gives its
       facts instead, since the last update is no longer news: when this bus
       got back to the yard, the miles driven, once they are in, then Paid in
       green, or what is still due in amber; a trip with none leaves the row
       empty. The update stays on
       the tooltip and the card. */
    const latest = updatesOf(trip)[0] ?? null;
    const done = isDone;
    const news = done ? completeEl(trip, assign, leg) : el('span', null, latest?.body || '');
    let tone = done ? ' scheduler-bar__update--complete' : '';
    if (latest && done) news.title = `${news.title}\n${latest.body}\n${updateStamp(latest)}`;
    else if (latest) {
      news.title = `${latest.body}\n${updateStamp(latest)}`;
      const open = !window.SchedulerCloseOut.isBack(trip) && (waitsOf(trip).length > 0 || misfits.length > 0 || needs.some(n => !n.done)
          || (!dayOfContact(trip, leg.key) && !trip.contact_not_needed));
      const days = (Date.now() - Date.parse(latest.created_at)) / DAY;
      if (open) {
        const age = days < 2 ? 'new' : days < 7 ? 'week' : 'old';
        tone = ` scheduler-bar__update--${age}`;
        lead ??= leadMark(age, '#m-schedule', `Latest update ${updateStamp(latest)}`);
      }
    }
    // The update line opens the card, whose Updates it begins, empty or not,
    // and its icon leads it.
    addRow(bar, `scheduler-bar__update${tone}`, lead, news).dataset.cardOpener = '';
    const road = bar.dataset.busId ? window.SchedulerRoad.span(leg) : null;
    if (road) [bar.dataset.roadFrom, bar.dataset.roadTo] = road;
    // The two times the time row draws, for the live card's tooltip and its way back to the yard.
    if (dep) bar.dataset.depart = dep;
    if (back) bar.dataset.back = back;

    // The crew in role order, or what the bar needs before it can have one.
    const crew = assign ? crewOf(trip, assign, driversById, statuses).filter(c => !(placeholder && c.needed)) : [];
    const crewBox = el('span', 'scheduler-bar__crew', assign || placeholder ? null : 'Needs a bus');
    /* A leg is due from today to the end of the stretch the office staffs:
       it has not finished, and it starts before that stretch ends. */
    const due = leg.to >= iso(new Date()) && leg.from < (board.staffedUntil ?? staffedUntilNow());
    crewBox.append(...crew.map(c => crewEl(c, due, isDone)));
    // Who drives this bar, for the driver grid to pick out.
    bar.dataset.drivers = crew.filter(c => c.driverId != null).map(c => c.driverId).join(' ');
    // An empty seat, which app.css outlines while a driver is carried.
    if (crew.some(c => c.needed)) bar.dataset.wantsCrew = 'true';
    crewObserver?.observe(bar);
    addRow(bar, 'scheduler-bar__drivers', crewBox);

    /* The compact board's label. Not a row, so the full board never draws it
       and neither does the docked sheet, which draws every row. */
    const code = destCode(trip.destination);
    if (code) bar.appendChild(el('span', 'scheduler-bar__code', code));

    bar.setAttribute('aria-label', [
      trip.destination || 'No destination', trip.customer, kind, count > 1 ? `${count} buses` : null,
      place.fromPrev ? 'continues from the previous week' : null,
      place.toNext ? 'continues into the next week' : null,
      trip.confirmed === false ? 'unconfirmed' : null,
      ...crew.map(crewText),
      ...misfits,
      asksFollowUp(trip) ? 'needs a follow-up' : null,
    ].filter(Boolean).join(', '));
    return { bar, facts };
  }

  window.SchedulerBar = {
    draw, alertsOf, crewEl, crewText, crewName, fitCrew, fitKind, hhmm, clockEl, setAt, updateStamp,
  };
})();
