/* ==========================================================================
   Rux Scheduler — BAR, a trip's bar as the board draws it
   --------------------------------------------------------------------------
   One assignment's bar: the trip's colour, its rows, its crew, the badge that
   counts its problems at the end of the destination row and the plain age
   beside its newest update. data.js draws the board's bars with it and
   components.html draws its samples with it, so the two cannot differ.

   `draw(b, board)` is one bar, `b` the board's `{ trip, leg, assign, place,
   slot, lane }`, and `board` what the bar reads from the board around it:
     driversById, busesById   the drivers and buses, as Maps by id;
     partnersById             the partners, with the papers each must hold;
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
   overSeated, emptySeats, driverAlerts, tells, problems }`, which the
   trip's card reads.

   `alertsOf(trip, facts)` is every alert the trip's card lists, which the
   bar counts. `crewEl(c, due, back)` is one crew member as the drivers row draws
   them, `partnerEl(assign, partner, done)` the partner covering a bus in
   their place, `crewGlyph(c, due, back)` the glyph it marks their seat with, which
   the phone's half sheet marks its seats with too, and `glyphEl(glyph)` that
   glyph drawn, and `crewText(c)` and `crewName(c)` the same in words. `fitKind(bar)` drops
   nothing, since leg kinds always use an unboxed arrow. `hhmm(t, short)`,
   `clockEl(short)`, `setAt(at)`, `dayWords(day)` and `updateStamp(u)` are
   times as the bar and its card say them, `tripDone(leg, now)` how much of a leg's time has
   gone, which its times' track is filled to, and `fillTracks(root)` fills
   every track under `root` again to the clock.

   Every value from the database is written with textContent.
   ========================================================================== */
(() => {
  'use strict';

  const {
    REQUIREMENTS, requirementLabel, requirementIcon, shortfall, needsFor, wrongType, seatsOf, overSeats,
    activeRolesOf, crewOf, isCovered, tripContact, dayOfContact, DRIVER_STATUSES,
  } = window.SchedulerLegFacts;
  const { tripColorOf, standardHueOf, hueFor } = window.SchedulerWeek;
  const { waitsOf, updatesOf, asks: asksFollowUp, WORDS: WAIT_WORDS } = window.SchedulerFollowUp;

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  /* An outline icon's solid one, which a bar's mark is drawn in as well, so
     app.css can turn the mark solid while it lifts. */
  const SOLID = { '#m-route': '#m-route-fill', '#m-chat': '#m-chat-fill' };
  // Draws `href` in an icon's svg, with its solid icon over it where it has one.
  const glyphTo = (svg, href) => {
    svg.replaceChildren();
    for (const [at, cls] of [[href, SOLID[href] && 'scheduler-bar__line'], [SOLID[href], 'scheduler-bar__solid']]) {
      if (!at) continue;
      const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttribute('href', at);
      if (cls) use.setAttribute('class', cls);
      svg.appendChild(use);
    }
  };
  const svgUse = (href, size, box) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', size); svg.setAttribute('height', size);
    svg.setAttribute('viewBox', box); svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('aria-hidden', 'true');
    glyphTo(svg, href);
    return svg;
  };
  /* The route mark that leads a time row and opens the leg's route tip, data.js's,
     a mark as the chat and crew marks are; road-bar.js leads a live bar's
     times with one too. */
  const routeMark = () => {
    const b = el('button', 'scheduler-bar__lead scheduler-bar__route');
    b.type = 'button';
    b.dataset.cardOpener = '';
    b.setAttribute('aria-expanded', 'false');
    b.setAttribute('aria-label', 'Route');
    b.append(svgUse('#m-route', '16', '0 0 32 32'));
    return b;
  };
  // A phone number as it is shown, from phone.js.
  const showPhone = n => window.SchedulerPhone.format(n);
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const parseDay = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
  // Each date format is made once and kept, since making one costs many times using one.
  const formats = new Map();
  const formatOf = (locale, opts) => {
    const key = `${locale}|${JSON.stringify(opts)}`;
    if (!formats.has(key)) formats.set(key, new Intl.DateTimeFormat(locale, opts));
    return formats.get(key);
  };
  // "Tue", of an ISO day or a date.
  const weekday = d => formatOf('en-US', { weekday: 'short' }).format(d instanceof Date ? d : parseDay(d));
  // The days after the last it takes a leg comes back, before the office's
  // late-return hour, as `SchedulerWeek.takes` counts them: the bar marks its
  // return +1.
  const daysBack = leg => leg.backDays ?? 0;
  // The days before its first a leg leaves the yard after the office's night
  // hour, as `SchedulerWeek.takes` counts them: the bar marks its departure −1.
  const daysOut = leg => leg.departDays ?? 0;
  // How much of a leg's time has gone, out to back on this computer's clock,
  // as a percent to one place: 0 before it leaves and 100 once it is back.
  const clockAt = (day, t) => {
    const [h, m] = String(t).split(':').map(Number);
    const d = parseDay(day);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m).getTime();
  };
  const legSpan = leg => [clockAt(iso(addDays(parseDay(leg.from), -daysOut(leg))), leg.depart),
    clockAt(iso(addDays(parseDay(leg.to), daysBack(leg))), leg.back)];
  const doneOf = (out, back, now) => (!(back > out) ? (now >= back ? 100 : 0)
    : Math.round(Math.min(1, Math.max(0, (now - out) / (back - out))) * 1000) / 10);
  const tripDone = (leg, now = Date.now()) => doneOf(...legSpan(leg), now);
  /* A TICK ON THE TRACK FOR EACH STOP, once the route is done: the spot at the
     pickup first, then each stop's arrival, placed by its time between the
     yard out and back. A time is on its saved date, or the stop before's
     with none, and on the day after where that puts it before the stop
     before, as the Route tab reads a time past midnight, since an older row
     is dated a day early. A stop with no time has none, and the return to
     the yard is the track's own end. Two closer than STOP_GAP
     pixels on the track are one tick naming both; the track is about a day
     column for each day less the two times beside it, TIMES_W. */
  const STOP_GAP = 9;
  const DAY_W = 145;
  const TIMES_W = 105;
  const stopDots = (trip, leg, out, back, days) => {
    if (!(back > out)) return [];
    const stops = window.SchedulerWeek.stopsOfKey(trip, leg.key);
    const pickup = stops.find(s => s.type === 'pickup') ?? stops[0];
    const times = [];
    let before = out, day = leg.from;
    for (const s of stops.slice(Math.max(stops.indexOf(pickup), 0))) {
      if (s.type === 'return') continue;
      const [t, date] = s === pickup ? [s.spot, s.spot_date] : [s.arrive, s.arrive_date];
      if (!t) continue;
      let ms = clockAt(date || day, t);
      while (ms < before) ms += 864e5;
      before = ms;
      day = iso(new Date(ms));
      const at = (ms - out) / (back - out) * 100;
      if (at > 0 && at < 100) times.push({ at, ms, id: String(s.id), words: `${s === pickup ? 'Spot' : 'Arrives'} · ${s.name || s.label || s.address || 'Stop'} · ${hhmm(t)}` });
    }
    const dots = [];
    for (const t of times.sort((a, b) => a.at - b.at)) {
      const last = dots.at(-1);
      if (last && t.at - last.at < STOP_GAP / Math.max(30, days * DAY_W - TIMES_W) * 100) { last.words.push(t.words); last.ids.push(t.id); }
      else dots.push({ at: t.at, ms: t.ms, ids: [t.id], words: [t.words] });
    }
    return dots.map(d => {
      const dot = el('span', 'scheduler-bar__stop');
      dot.style.setProperty('--scheduler-at', `${Math.round(d.at * 10) / 10}%`);
      dot.dataset.at = String(d.at);
      // When it is due and which stops it stands for, which a live bar's track places and fills it by.
      dot.dataset.ms = String(d.ms);
      dot.dataset.stops = d.ids.join(' ');
      dot.title = d.words.join('\n');
      return dot;
    });
  };
  // A stop the leg has reached is in the strong ink, and one still ahead is dimmed.
  const markStops = (track, done) => {
    for (const d of track.querySelectorAll('.scheduler-bar__stop')) d.classList.toggle('scheduler-bar__stop--ahead', Number(d.dataset.at) > done);
  };
  // Every track under `root` filled again to the clock, for the board's
  // minute tick, since a bar is drawn again only when its trip changes.
  const fillTracks = (root, now = Date.now()) => {
    for (const t of root.querySelectorAll('.scheduler-bar__track[data-out]')) {
      const done = doneOf(Number(t.dataset.out), Number(t.dataset.back), now);
      t.style.setProperty('--scheduler-done', `${done}%`);
      markStops(t, done);
    }
  };

  /* The chip a one-way trip and each leg of a split wear after the
     destination: the arrow the way the bus goes, in a high-contrast tag.
     The word is its tooltip, so the chip is the same width on every bar and
     never competes with the destination for room. */
  const KINDS = {
    'one way': { icon: '#m-arrow_forward', word: 'One way' },
    'drop-off': { icon: '#m-download', word: 'Drop-off' },
    pickup: { icon: '#m-upload', word: 'Pickup' },
  };
  const kindEl = kind => {
    const { icon, word } = KINDS[kind];
    const pill = el('span', 'scheduler-bar__kind scheduler-bar__kind--icon');
    pill.title = word;
    pill.setAttribute('role', 'img');
    pill.setAttribute('aria-label', word);
    pill.append(svgUse(icon, '12', '0 0 12 12'), el('span', 'scheduler-bar__kind-word', word));
    return pill;
  };
  // The chip is always the icon alone, so there is nothing to fit; data.js still calls this on a card's head.
  const fitKind = () => {};

  /* THE ALERT BADGE, at the end of the destination row: the red circle
     with an exclamation mark for a bus that does not fit and Carbon's Warning triangle for the rest,
     alone, the problems' words in its accessible name and the Alerts tip it opens, with no hover label to
     repeat them. It stands in the same place on every bar, and a bar with no problem has none. A press on
     it opens the trip's Alerts tip, so it is one of the bar's card openers. It keeps the tone and words
     it was drawn with on `data-tone` and `data-words`, which a live warning, road-bar.js's, adds to
     with `alertTo` and leaves again once it has gone. */
  const ALERT_ICON = { error: '#m-error-fill', warning: '#i-warning--alt--filled' };
  const alertTo = (m, tone, words) => {
    m.classList.remove('scheduler-bar__msg--error', 'scheduler-bar__msg--warning');
    m.classList.add(`scheduler-bar__msg--${tone}`);
    m.querySelector('use')?.setAttribute('href', ALERT_ICON[tone]);
    m.setAttribute('aria-label', `Alerts: ${words}`);
  };
  const alertMark = (tone, words) => {
    const m = el('button', 'scheduler-bar__msg scheduler-bar__alert');
    m.type = 'button';
    m.setAttribute('aria-expanded', 'false');
    m.append(svgUse(ALERT_ICON[tone ?? 'warning'], '16', '0 0 32 32'));
    m.dataset.cardOpener = '';
    if (tone) { m.dataset.tone = tone; m.dataset.words = words; }
    alertTo(m, tone ?? 'warning', words);
    return m;
  };
  /* A TRIP THAT IS BACK SAYS HOW IT CLOSED where a trip still to come wears
     its alert, which it never does, each mark in Carbon's status form: its
     money first, Paid in green once it is paid in full or Carbon's warning
     while a balance is owed that no PO covers, and a trip on a PO wears
     neither; then, while close-out still asks anything, Carbon's Incomplete,
     its symbol for a stepped process begun and not finished, as the button
     that opens the trip's Updates at their post-trip entry. A trip with
     nothing left to close wears its money alone, or nothing. */
  const closeMarks = report => {
    if (!report) return null;
    const { WORDS } = window.SchedulerCloseOut;
    const marks = [];
    if (report.paid) {
      const p = el('span', 'scheduler-bar__paid', 'Paid');
      p.title = report.paidOn ? `Paid in full ${dayWords(report.paidOn)}` : 'Paid in full';
      marks.push(p);
    } else if (report.owed > 0) {
      const w = el('span', 'scheduler-bar__owed');
      w.setAttribute('role', 'img');
      w.setAttribute('aria-label', WORDS.balance);
      w.title = WORDS.balance;
      w.append(svgUse('#i-warning--alt--filled', '16', '0 0 32 32'));
      marks.push(w);
    }
    if (report.asks.length) {
      const b = el('button', 'scheduler-bar__close');
      b.type = 'button';
      b.setAttribute('aria-expanded', 'false');
      b.setAttribute('aria-label', `Close-out: ${report.asks.map(a => WORDS[a]).join(' · ')}`);
      b.dataset.cardOpener = '';
      b.append(svgUse('#i-incomplete', '16', '0 0 32 32'));
      marks.push(b);
    }
    if (!marks.length) return null;
    const box = el('span', 'scheduler-bar__marks');
    box.append(...marks);
    return box;
  };
  // A day as a mark says it, "Oct 31", from its YYYY-MM-DD.
  const dayWords = day => formatOf('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${String(day).slice(0, 10)}T00:00:00Z`));
  /* The newest update's age is neutral metadata, without a clock or pill,
     and no hover label, since Updates says when. The row's chat mark opens
     Updates, including when it has no update. */
  const ageWords = at => {
    const min = (Date.now() - Date.parse(at)) / 60e3;
    if (min < 60) return `${Math.max(1, Math.floor(min))}m`;
    if (min < 1440) return `${Math.floor(min / 60)}h`;
    if (min < 43200) return `${Math.floor(min / 1440)}d`;
    return formatOf(undefined, { month: 'short', day: 'numeric' }).format(new Date(at));
  };
  const ageMark = at => el('span', 'scheduler-bar__age', at ? ageWords(at) : 'No updates');
  /* WHAT IS A PROBLEM ON THE BOARD: a bus that does not fit, more passengers
     than seats, a seat with no driver inside fourteen days of departure, a
     driver who said no or must be told of a change, and a
     confirmed trip with nothing paid, no PO, deposit or payment, which is
     `unpaid`. The rest of the paperwork the office works through on every
     trip -- a confirmation, itinerary or balance waited on, the trip
     contact, a hotel or an HOS form -- is the card's to list and the Tasks
     list's to ask for, and marks nothing here, or every bar would carry a
     warning. */
  const PROBLEM_SPOTS = new Set(['seats', 'driver']);
  const isProblem = a => a.row === 'scheduler-card__error' || PROBLEM_SPOTS.has(a.spot) || a.unpaid;
  /* A confirmed trip with a price and nothing in hand: no PO, no deposit and
     no payment, as billing.js reads it. A placeholder and a cancelled trip
     are owed nothing. */
  const nothingPaid = trip => {
    if (trip.confirmed === false || trip.cancelled_at || window.SchedulerBilling.placeholder(trip)) return false;
    const { price, rung } = window.SchedulerBilling.of(trip);
    return price > 0 && (rung === 'pending' || rung === 'contract_signed');
  };
  // The waits that are money: the PO, deposit or payment before the trip leaves, the balance after.
  const MONEY = new Set(['po', 'balance']);
  /* BUT A TRIP'S CONTACT AND ITINERARY ARE A PROBLEM, whatever day it
     leaves and confirmed or not: still missing, they put up the warning sign
     too. A placeholder, not quoted yet, wears no problem at all. */
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
      : formatOf('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(d);
  };

  /* An update's stamp: when, who wrote it, and whether its words were
     changed. An `imported` row was copied out of the old notes, so it has a
     date and no time. */
  function updateStamp(u) {
    const at = new Date(u.created_at);
    const opts = { month: 'short', day: 'numeric' };
    if (at.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
    const when = formatOf(undefined, u.kind === 'imported' ? opts : { ...opts, hour: 'numeric', minute: '2-digit' }).format(at);
    return [when, u.actor_name || (u.kind === 'imported' ? 'From the old notes' : 'Someone'),
      u.edited_at ? 'edited' : null].filter(Boolean).join(' · ');
  }

  /* A crew member in words, for the tooltip and the bar's label: the role, the
     name, and the status with who set it and when. */
  function crewText(c) {
    if (c.needed) return `${c.label} needed`;
    const parts = [c.label, c.who ? (c.who.name || c.who.short_name) : 'Unknown driver'];
    const { value, label } = c.status;
    // Not sent names itself and stops there: nobody set it, so there is no
    // who or when to give.
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

  /* Carbon status icons identify each driver; relief retains its role arrows.
     A trip that is done has no answer left to wait for, so its drivers carry
     no status icon, only their names, unless one declined. An empty seat
     inside fourteen days of departure is a person in the error colour, a
     declined driver's red, and turns the alert badge red, so a bus with
     nobody to drive it is found at a glance. A seated driver's icon is
     the button that opens their tip, as the alert badge opens Alerts, with
     no hover label, since the tip says it; a
     done trip's drivers have none to press, but one who declined. */
  const RELIEF_ROLES = new Set(['relief-start', 'relief-end']);
  /* A seat's glyph: its status icon in its indicator's colour, a relief
     seat's role arrow, a person for an empty seat that is due, or none,
     for a distant empty seat and for a done trip's driver who did not
     decline. `crewEl` draws it, and the phone's half sheet its seats. */
  function crewGlyph(c, due, done) {
    const dot = !RELIEF_ROLES.has(c.role);
    if (done && dot && !c.needed && c.status?.value !== 'declined') return null;
    if (!dot) return { href: c.icon, box: c.box, indicator: null };
    if (c.needed) return due ? { href: '#m-person-fill', box: '0 0 32 32', indicator: 'rux--icon-indicator--failed' } : null;
    return { href: c.status.icon, box: '0 0 32 32', indicator: c.status.indicator };
  }
  const glyphEl = g => {
    const svg = svgUse(g.href, '16', g.box);
    if (g.indicator) svg.setAttribute('class', g.indicator);
    return svg;
  };
  function crewEl(c, due, done) {
    const tone = c.needed ? (due ? 'error' : 'off') : c.status.tone;
    const item = el('span', ['scheduler-crew', c.status?.value === 'declined' && 'scheduler-crew--declined',
      c.needed && due && 'scheduler-crew--due'].filter(Boolean).join(' '));
    const dot = !RELIEF_ROLES.has(c.role);
    if (!(done && dot && !c.needed && c.status?.value !== 'declined')) {
      const press = !c.needed && !(done && c.status?.value !== 'declined');
      const mark = el(press ? 'button' : 'span', ['scheduler-crew__mark', tone && `scheduler-crew__mark--${tone}`, dot && 'scheduler-crew__mark--dot',
        c.needed && 'scheduler-crew__mark--empty'].filter(Boolean).join(' '));
      if (press) {
        mark.type = 'button';
        mark.dataset.cardOpener = '';
        mark.setAttribute('aria-expanded', 'false');
        mark.setAttribute('aria-label', `${crewText(c)}: details`);
        mark.title = '';
      }
      const glyph = crewGlyph(c, due, done);
      if (glyph) mark.appendChild(glyphEl(glyph));
      item.appendChild(mark);
    }
    item.appendChild(el('span', c.needed ? 'scheduler-crew__name scheduler-bar__none' : 'scheduler-crew__name',
      c.needed ? (dot ? `No ${c.label.toLowerCase()}` : 'No relief') : crewName(c)));
    if (c.driverId != null) item.dataset.driverId = c.driverId;
    // The seat it is: what a press pulls its driver out by, and where a carried one goes in.
    item.dataset.seat = c.role;
    return item;
  }

  /* A BUS A PARTNER COVERS has no seat of ours: the drivers row names the
     partner, its mark the partner's answer, confirmed or waited on, drawn as
     a driver's is, and a press on it opens the partner's tip. A done trip's
     partner is its name alone. */
  const partnerName = partner => partner?.name || 'A partner';
  const partnerStatus = assign => DRIVER_STATUSES.find(s => s.value === (assign.partner_confirmed ? 'confirmed' : 'pending-response'));
  const partnerText = (assign, partner) => `Partner ${partnerName(partner)} · ${assign.partner_confirmed ? 'Confirmed' : 'Not confirmed'}`;
  function partnerEl(assign, partner, done) {
    const item = el('span', 'scheduler-crew');
    item.dataset.partnerId = assign.partner_id;
    if (!done) {
      const status = partnerStatus(assign);
      const mark = el('button', `scheduler-crew__mark scheduler-crew__mark--${status.tone} scheduler-crew__mark--dot`);
      mark.type = 'button';
      mark.dataset.cardOpener = '';
      mark.setAttribute('aria-expanded', 'false');
      mark.setAttribute('aria-label', `${partnerText(assign, partner)}: details`);
      mark.title = '';
      mark.appendChild(glyphEl({ href: status.icon, box: '0 0 32 32', indicator: status.indicator }));
      item.appendChild(mark);
    }
    item.appendChild(el('span', 'scheduler-crew__name', partnerName(partner)));
    return item;
  }

  const kindObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(entries => {
    for (const { target } of entries) fitKind(target);
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

     The errors lead, each a red row: a bus that does not fit this trip, a
     mistake on the board that goes when the bus is changed, then each seat
     of the bus still with nobody in it inside fourteen days of departure,
     or a partner covering it not yet confirmed, put right on the Buses tab. Then the follow-up reminder, one for
     each thing waited on, which stays while it is true, until the missing
     thing arrives or an update is written; on a confirmed trip with nothing
     paid, the reminder for its money stays until a PO, a deposit or a
     payment is in, whatever was written. Then nobody named to call on the
     day, on a trip not marked as needing no one. Last, a need that is still a
     job, the hotel to book or the hours-of-service form to print; a need the
     bus falls short of is already a misfit, and one that is met is no alert. */
  function alertsOf(trip, facts) {
    /* A trip that is back asks nothing on the board: what its record still
       lacks is the editor's Billing tab's Closed list and the Trips page's. */
    if (window.SchedulerCloseOut.isBack(trip)) return [];
    const list = (facts?.misfits ?? []).map(words => ({ row: 'scheduler-card__error', go: 'fleet', words }));
    for (const words of facts?.emptySeats ?? []) list.push({ row: 'scheduler-card__error', go: 'fleet', spot: 'driver', words });
    // A partner not yet confirmed once the leg is due is the empty seat of a bus it covers.
    for (const words of facts?.partnerUnconfirmed ?? []) list.push({ row: 'scheduler-card__error', go: 'fleet', spot: 'partner', words });
    const asks = asksFollowUp(trip);
    const unpaid = nothingPaid(trip);
    for (const w of waitsOf(trip)) {
      const money = unpaid && MONEY.has(w);
      if (!asks && !money) continue;
      list.push({ row: 'scheduler-card__asks', go: w === 'itinerary' ? 'itinerary' : 'billing', spot: w, words: WAIT_WORDS[w], unpaid: money });
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

  function problemsOf(trip, facts, leg) {
    if (window.SchedulerCloseOut.isBack(trip)) return [];
    const list = alertsOf(trip, facts).filter(isProblem);
    if (!dayOfContact(trip, leg.key) && !trip.contact_not_needed)
      list.push({ row: 'scheduler-card__warn', go: 'details', spot: 'contact', words: 'Trip contact missing' });
    const firstLeg = window.SchedulerWeek.legsOf(trip)[0]?.key;
    if (!trip.itinerary_not_needed && !window.SchedulerTripShape.itineraryFor(trip, firstLeg))
      list.push({ row: 'scheduler-card__asks', go: 'itinerary', spot: 'itinerary', words: WAIT_WORDS.itinerary });
    return list;
  }

  // A rolling fourteen-day departure window, independent of the week displayed.
  const staffingDue = (leg, today = new Date()) => leg.to >= iso(today) && leg.from <= iso(addDays(today, 14));
  const NOBODY_NEAR = { trips: [], off: [], oos: [] };

  /* WHAT ONE BAR KNOWS OF ITS TRIP AND ITS BUS: `facts`, which the trip's
     card reads, the problems the bar's alert badge counts, and the badge's
     tone, an error where the bus does not fit or a due seat is empty and a
     warning otherwise, or none. */
  function factsOf(b, board) {
    const { trip, leg, assign } = b;
    const { driversById, busesById, statuses } = board;
    const placeholder = window.SchedulerBilling.placeholder(trip);
    const later = (leg.count || 1) > 1 && b.nth > 1;

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
      ?? ((t, l) => window.SchedulerClashes.standing(t, l, board.nearby ?? NOBODY_NEAR, { driversById, busesById, partnersById: board.partnersById }));
    const clashes = placeholder || !assign ? []
      : standing(trip, leg.key).filter(c => String(c.assignmentId) === String(assign.id)).map(c => c.words);
    const misfits = placeholder ? [] : [wrong, ...needs.filter(n => n.short).map(n => n.label), ...clashes].filter(Boolean);
    // More passengers than the leg's buses seat, a warning on every bar of the leg.
    const overSeated = placeholder ? null : overSeats(trip.passengers, seatsOf(trip, leg.key, busesById));
    /* THE DRIVERS ON THIS BUS who said no, or whom the leg changed for since
       they said yes, as driver-job.js reads it: each a warning, which the
       Contact list puts right. */
    const tells = [];
    const crew = placeholder || !assign ? [] : crewOf(trip, assign, driversById, statuses);
    // Each seat still empty once the leg is due, named as the seat is: Driver missing, Relief end missing.
    const emptySeats = staffingDue(leg) ? crew.filter(c => c.needed).map(c => `${c.label} missing`) : [];
    const partnerUnconfirmed = !placeholder && isCovered(assign) && !assign.partner_confirmed && staffingDue(leg)
      ? [`${partnerName(board.partnersById?.get(assign.partner_id))} not confirmed`] : [];
    const driverAlerts = crew.flatMap(c => {
      if (c.needed) return [];
      const name = c.who?.short_name || c.who?.name || 'A driver';
      if (c.status?.value === 'declined') return [`${name} declined`];
      const lines = window.SchedulerDriverJob?.changesSince(trip, leg.key, c.driverId, c.row,
        { busesById, driversById, nameOf: requirementLabel }) ?? [];
      if (!lines.length) return [];
      tells.push(name);
      return [`Tell ${name}: ${lines.join('; ')}`];
    });
    // `tells` names the drivers to be told, for the bell on the bar menu's Call or text.
    const facts = { leg: leg.key, needs, misfits, overSeated, emptySeats, partnerUnconfirmed, driverAlerts, tells };

    // One structured list feeds the badge and the card's Alerts group.
    facts.problems = placeholder ? [] : problemsOf(trip, facts, leg);
    /* A later bus wears only its own problems, a bus that does not fit, a
       driver to tell or a partner to confirm; the trip's are on its first
       bus, and every bus's card lists them all. */
    const own = later ? facts.problems.filter(a => a.row === 'scheduler-card__error' || a.spot === 'driver')
      : facts.problems;
    return { facts, problems: own, tone: own.length ? (own.some(a => a.row === 'scheduler-card__error') ? 'error' : 'warning') : null };
  }

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
    bar.dataset.needHotel = trip.trip_reqs?.hotel === true ? 'true' : '';
    bar.dataset.hotelBooked = leg.hotelBooked ? 'true' : '';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-keyshortcuts', 'Enter Space');
    bar.tabIndex = 0;
    bar.setAttribute('aria-current', 'false');
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
      if (isCovered(assign)) bar.dataset.partnerId = assign.partner_id;
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

    /* A leg that leaves the group or fetches it says so after the destination, its arrow pointing the way the bus does: across for a
       one-way trip, down for a split's drop-off, where the group is set down,
       up for its pickup, every leg after the first. The pill says which leg
       of a split this is, so the reference is only its count. */
    const SHAPE = window.SchedulerTripShape;
    const kind = SHAPE.isSplit(trip) ? (SHAPE.isPickup(trip, leg.key) ? 'pickup' : 'drop-off')
      : SHAPE.legOf(trip, leg.key)?.kind === 'one_way' ? 'one way' : null;
    /* How many buses the leg takes, written after the destination on a leg of
       more than one, as the figure alone: `3`. The board numbers them down its rows, as `nth`, and
       every bus after the first says which it is in place of the update, so
       the trip's news is read once. */
    const count = leg.count || 1;
    const later = count > 1 && b.nth > 1;

    const { facts, problems, tone } = factsOf(b, board);
    const alert = tone ? alertMark(tone, problems.map(a => a.words).join(' · ')) : null;
    // A trip that is back raises no alert, and says how it closed in the alert's place.
    const isDone = window.SchedulerCloseOut.isBack(trip) && !window.SchedulerBilling.placeholder(trip);
    const closed = alert ? null : closeMarks(window.SchedulerCloseOut.report(trip));
    const destName = el('span', null, placeName(trip.destination) || 'No destination');
    const dest = count > 1 ? el('span', 'scheduler-bar__multi') : destName;
    if (count > 1) dest.append(destName, el('span', 'scheduler-bar__count', String(count)));
    /* The destination row holds what the trip is on the left, and only what
       is happening now on the right: the faces of whoever else has it, which
       data.js adds, and Live while the bus is out, road-bar.js's. */
    addRow(bar, 'scheduler-bar__dest', dest, kind ? kindEl(kind) : null, alert ?? closed);
    // The words in a run, which spans the trip's length; see app.css's row widths.
    const runOf = (...parts) => {
      const run = el('span', 'scheduler-bar__run');
      run.append(...parts.filter(Boolean));
      return run;
    };
    addRow(bar, 'scheduler-bar__client', runOf(el('span', null, trip.customer || '')));

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
    /* A leg that runs off the week leaves out the time on that side, and its
       track runs out to the bar's cut edge, so it reads as going on into
       the other week; the row's tooltip names both times with their days. */
    const backDay = addDays(parseDay(leg.to), daysBack(leg));
    const departDay = addDays(parseDay(leg.from), -daysOut(leg));
    const crosses = place.fromPrev || place.toNext;
    const depart = dep ? [clockEl(dep)] : [];
    const ret = back ? [clockEl(back)] : [];
    /* With both, a track between them, as a live bar's times have, filled
       in the trip's ink as far as the time between them has gone: full once
       it is back, empty before it leaves. The dash and any time left out stay
       inside it, unseen, so the row still reads and copies whole. */
    const when = el('span', none ? 'scheduler-bar__none' : null);
    /* The times and the track between them are the trip's, so a press there
       selects it; the route mark leading the row, in the column the chat and crew
       marks stand in below, is the button that opens the leg's route tip. */
    const timeWords = () => el('span', 'scheduler-bar__when');
    let route = null;
    const backAt = timeWords();
    backAt.append(...ret);
    /* A departure the evening before the leg's first day, after the night
       hour, is marked −1 beside its time, as a late return is marked +1. */
    if (daysOut(leg) && dep && !place.fromPrev) {
      const mark = el('sup', 'scheduler-bar__day-before', `\u2212${daysOut(leg)}`);
      mark.title = 'Leaves the evening before';
      depart.push(mark);
    }
    if (dep && back) {
      when.className = 'scheduler-bar__span';
      const unseen = [place.fromPrev ? `${weekday(departDay)} ${dep}` : '', '\u2009\u2013\u2009', place.toNext ? `${weekday(backDay)} ${back}` : ''].join('');
      route = routeMark();
      const track = el('span', 'scheduler-bar__track', unseen);
      [track.dataset.out, track.dataset.back] = legSpan(leg).map(String);
      track.style.setProperty('--scheduler-done', `${tripDone(leg)}%`);
      // A leg that runs off the week has its track masked to the line, which would hide them.
      if (trip.route_done_at && !crosses) {
        track.append(...stopDots(trip, leg, ...legSpan(leg), Number(place.span)));
        markStops(track, tripDone(leg));
      }
      if (!place.fromPrev) {
        const out = timeWords();
        out.append(...depart);
        when.append(out);
      }
      when.append(track);
      if (!place.toNext) when.append(backAt);
      if (crosses) when.title = `${weekday(departDay)} ${dep} \u2013 ${weekday(backDay)} ${back}`;
    }
    // A lone time in the other week names its day, having no track to say so.
    else if (dep) when.append('Dep ', ...(place.fromPrev ? [`${weekday(departDay)} `] : []), ...depart);
    else if (back) when.append('Ret ', ...(place.toNext ? [`${weekday(backDay)} `] : []), backAt);
    else when.append('No times');
    if (daysBack(leg) && back && !place.toNext) {
      const mark = el('sup', 'scheduler-bar__next-day', `+${daysBack(leg)}`);
      mark.title = daysBack(leg) > 1 ? `Returns ${daysBack(leg)} days later` : 'Returns the next day';
      (dep ? backAt : when).appendChild(mark);
    }
    addRow(bar, 'scheduler-bar__time', route, when);

    // The update and crew share a footer.
    const latest = updatesOf(trip)[0] ?? null;
    const nthWords = later ? `Bus ${b.nth} of ${count}` : null;
    // The update's words have no hover label: Updates, which the chat mark opens, has them whole.
    const news = el('span', null, nthWords ?? latest?.body ?? '');
    const age = later ? null : ageMark(latest?.created_at);
    const updateRow = el('div', 'scheduler-bar__row scheduler-bar__update');
    /* A chat mark leads the row, in the column the crew's marks stand in
       below it, and is the button that opens Updates, as the alert badge
       opens Alerts. The rest of the row is the trip's, so a press there
       selects it. */
    const chat = el('button', 'scheduler-bar__lead scheduler-bar__chat');
    chat.type = 'button';
    chat.dataset.cardOpener = '';
    chat.setAttribute('aria-expanded', 'false');
    chat.setAttribute('aria-label', [nthWords, `Updates: ${latest ? `${updateStamp(latest)}. ${latest.body}` : 'No updates yet'}`]
      .filter(Boolean).join('. '));
    chat.append(svgUse('#m-chat', '16', '0 0 32 32'));
    updateRow.appendChild(runOf(chat, age, news));
    bar.appendChild(updateRow);
    const road = bar.dataset.busId ? window.SchedulerRoad.span(leg) : null;
    if (road) [bar.dataset.roadFrom, bar.dataset.roadTo] = road;
    // The two times the time row draws, for the live card's tooltip and its way back to the yard.
    if (dep) bar.dataset.depart = dep;
    if (back) bar.dataset.back = back;
    // A leg whose route is done, whose live times row says when the bus gets to its next stop.
    if (trip.route_done_at) bar.dataset.routeDone = '';

    // The crew in role order, the partner covering the bus, or what the bar needs before it can have one.
    const crew = assign ? crewOf(trip, assign, driversById, statuses, { riders: true }).filter(c => !(placeholder && c.needed)) : [];
    const partner = isCovered(assign) ? board.partnersById?.get(assign.partner_id) ?? null : null;
    const crewBox = el('span', 'scheduler-bar__crew', assign || placeholder ? null : 'Needs a bus');
    /* A leg is due from today to the end of the stretch the office staffs:
       it has not finished, and it starts before that stretch ends. */
    const due = staffingDue(leg);
    crewBox.append(...crew.map(c => crewEl(c, due, isDone)));
    if (isCovered(assign)) crewBox.appendChild(partnerEl(assign, partner, isDone));
    // Who drives this bar, for the driver grid to pick out.
    bar.dataset.drivers = crew.filter(c => c.driverId != null).map(c => c.driverId).join(' ');
    // An empty seat, which app.css outlines while a driver is carried.
    if (crew.some(c => c.needed)) bar.dataset.wantsCrew = 'true';
    kindObserver?.observe(bar);
    addRow(bar, 'scheduler-bar__drivers', crewBox);

    bar.setAttribute('aria-label', [
      trip.destination || 'No destination', trip.customer, kind, count > 1 ? `${count} buses` : null,
      place.fromPrev ? 'continues from the previous week' : null,
      place.toNext ? 'continues into the next week' : null,
      trip.confirmed === false ? 'unconfirmed' : null,
      ...crew.map(crewText),
      isCovered(assign) ? partnerText(assign, partner) : null,
      ...facts.misfits,
      asksFollowUp(trip) ? 'needs a follow-up' : null,
    ].filter(Boolean).join(', '));
    return { bar, facts };
  }

  /* The part a card opener opens: Alerts, the partner's tip for a bus a
     partner covers, a driver's tip, named by the
     driver and the seat so each driver's icon opens their own, the seat
     `wheel` for a driver at the wheel the bar does not name, or Updates. A
     live bar's mark with no driver Samsara knows opens its live card. */
  const cardSectionOf = opener => {
    if (opener.matches('.scheduler-bar__route')) return 'route:';
    if (opener.matches('.scheduler-bar__alert')) return 'needs';
    if (opener.matches('.scheduler-bar__close')) return 'close';
    if (!opener.closest('.scheduler-bar__drivers')) return 'updates';
    const crew = opener.closest('.scheduler-crew');
    if (crew?.dataset.partnerId) return 'partner';
    const id = crew?.dataset.driverId ?? crew?.dataset.wheelDriver;
    return opener.matches('.scheduler-crew > :is(.scheduler-crew__mark, .scheduler-crew__duty)') && id
      ? `driver:${id}:${crew.dataset.seat ?? 'wheel'}` : 'road';
  };
  const opensSection = (showing, current, requested) => !showing || current !== requested;

  window.SchedulerBar = {
    draw, crewGlyph, glyphEl, glyphTo, alertMark, alertTo, staffingDue, partnerEl, partnerText, alertsOf, problemsOf, cardSectionOf, opensSection, routeMark, crewEl, crewText, crewName, fitKind, hhmm, clockEl, setAt, dayWords, updateStamp, tripDone, fillTracks,
  };
})();
