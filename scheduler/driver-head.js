/* ==========================================================================
   Rux Scheduler — DRIVER HEAD, what the roster says of each driver
   --------------------------------------------------------------------------
   A driver's name cell in the rail is their tile, as a bus's is in the
   bus column, drawn inside the cell data.js makes, on two lines:
   - The name at 14px, and at the line's end one 16px icon, every mark's
     words on its label. The driver's most urgent mark stands there:
       papers  the licence or medical card running out within WARN_DAYS,
               amber, or run out, red, as the Drivers page warns
       tell    a leg within 30 days that changed for them since they said
               yes, amber
       unsent  a leg leaving within two days they sit on and have not
               been sent, amber
     With none, a driver out of hours has the red error mark; with none
     of those, a driver on a trip under way has what they are doing on it,
     so a dispatcher knows whom not to call: driving, the trip bar's arrow
     in green, amber under an hour; on duty, a clock; off duty, a pause;
     in the sleeper berth, a moon in the rest colour. A driver with no icon
     is on no trip. While a selected trip finds them free on every day of
     it, a green check stands there instead. The tile is too narrow for a
     row of icons, so one stands for all.
   - Under it, the driving time Samsara says they have left, the least of
     the drive, shift and cycle clocks: a 48px meter of the ten hours a
     passenger carrier's driver may drive, as the bus tile's fuel is, and
     at the line's end, at 12px in the secondary grey, "6:30 left". Under an
     hour it is amber and at none red, both semibold. A driver on no trip
     with all ten hours is free and the line is empty, so the drivers who
     matter stand out. A driver Samsara keeps no clock for has a quiet
     dash beside an empty meter, as a bus with no signal does. The full
     words, their duty and rest among them, are the line's label and the
     card's.
   A press anywhere on the tile opens the driver's card, a Carbon toggletip
   that data.js fills from trip-tips.js's `driverCard`, as a press anywhere
   on a bus's tile opens its tip.

   `draw(cell, driver, live, alerts, onTrip)` draws it, its parts once and
   their words as they change: `driver` is the driver's row,
   `live` their entry in samsara-now's `drivers` or null, `alerts` their
   list from to-do.js's `driverAlerts`, and `onTrip` whether a trip of
   theirs is under way now, between its yard-out and its return. It draws
   again only when what it shows has changed. `stateOf(live, onTrip)` and
   `marksOf(driver, alerts, today)`
   are what it shows, for tools/check-bar.mjs.
   Needs leg-facts.js and road-bar.js loaded first.
   ========================================================================== */
(() => {
  'use strict';

  const RoadBar = window.SchedulerRoadBar;
  const { HOUR, DRIVE, hours } = RoadBar;
  const NOT_SENT_ICON = window.SchedulerLegFacts.DRIVER_STATUSES.find(s => s.value === 'off').icon;

  // A paper this close to running out warns, as the Drivers page warns.
  const WARN_DAYS = 45;
  const DAY = 864e5;
  /* What a driver is doing on a trip under way, by their duty log: a yard
     move counts as on duty and personal conveyance as off duty, as the
     hours rules count them. */
  const TRIP_OF = { driving: 'driving', on: 'on', yard: 'on', personal: 'off', off: 'off', sleeper: 'sleeper' };
  const TRIP_ICON = { driving: '#i-BPMN-link--fill', on: '#i-time--filled', off: '#i-pause--outline--filled', sleeper: '#i-asleep--filled' };
  // The mark of a driver with no driving time left.
  const OUT = { kind: 'hours', tone: 'error', icon: '#i-error--filled' };

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const svgUse = (href, size, box) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    for (const [k, v] of Object.entries({ width: size, height: size, viewBox: box, fill: 'currentColor', 'aria-hidden': 'true' })) svg.setAttribute(k, v);
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', href);
    svg.appendChild(use);
    return svg;
  };

  /* What the clock says: `{ line, tone, words, meter, trip, free }`, the
     line the head shows, its tone, quiet, normal, warning under an hour or
     error under a minute, the words for its label, its meter's share of
     the ten hours from 0 to 1 or null with no clock, what the driver is
     doing on a trip under way, `driving`, `on`, `off` or `sleeper`, or
     null on none, and whether they are free, on no trip with all ten
     hours, when the line is empty. */
  const fill = (ms, total) => Math.round(Math.min(1, Math.max(0, ms / total)) * 100) / 100;
  function stateOf(live, onTrip = false) {
    if (!live?.duty) return { line: '–', tone: 'quiet', words: 'No hours-of-service clock from Samsara', meter: null, trip: null, free: false };
    const words = RoadBar.words(live);
    const trip = onTrip ? (live.wheel ? 'driving' : TRIP_OF[live.duty] ?? null) : null;
    const left = live.left_ms;
    if (left == null) return { line: '–', tone: 'quiet', words, meter: null, trip, free: false };
    if (!onTrip && left >= DRIVE) return { line: '', tone: 'quiet', words, meter: null, trip: null, free: true };
    const tone = left < 60e3 ? 'error' : left < HOUR ? 'warning' : 'normal';
    return { line: `${hours(left)} left`, tone, words, meter: fill(left, DRIVE), trip, free: false };
  }

  const dayOf = v => {
    const s = String(v ?? '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const PAPERS = [['license_exp', 'Licence'], ['med_card_expiry', 'Medical card']];

  /* The driver's marks, the most urgent first: `{ kind, tone, icon, words }`,
     tone `error` or `warning`. `today` is a Date at the office's midnight. */
  function marksOf(driver, alerts = [], today = new Date(new Date().setHours(0, 0, 0, 0))) {
    const marks = [];
    for (const [field, word] of PAPERS) {
      const when = dayOf(driver?.[field]);
      if (!when) continue;
      const n = Math.round((when - today) / DAY);
      if (n > WARN_DAYS) continue;
      // The Drivers page's words.
      const words = n < 0 ? `${word} expired ${plural(-n, 'day')} ago`
        : n === 0 ? `${word} expires today` : `${word} expires in ${plural(n, 'day')}`;
      marks.push({ kind: 'papers', tone: n < 0 ? 'error' : 'warning', icon: n < 0 ? '#i-error--filled' : '#i-warning--alt--filled', words });
    }
    const of = kind => alerts.filter(a => a.kind === kind);
    const legs = list => list.map(a => [a.trip?.destination || a.trip?.trip_ref || 'A trip', a.legName].filter(Boolean).join(', ')).join('; ');
    const tell = of('tell');
    if (tell.length) marks.push({ kind: 'tell', tone: 'warning', icon: '#m-notifications-fill', words: `Tell of a change: ${legs(tell)}` });
    const unsent = of('unsent');
    if (unsent.length) marks.push({ kind: 'unsent', tone: 'warning', icon: NOT_SENT_ICON, words: `Not sent: ${legs(unsent)}` });
    return marks.sort((a, b) => (a.tone === b.tone ? 0 : a.tone === 'error' ? -1 : 1));
  }

  /* THE TILE'S PARTS, made once, so a live answer changes their words in
     place and a card open from the tile stays open: the name; the one
     icon; the free check; and the line, the button of the card's toggletip,
     with the structure from `carbon-ibm-products-dom.json` that
     js/popover.js opens, its content data.js's, filled as it opens. The
     whole tile is that button's to press, as the whole bus tile is its
     number's: app.css spreads its press over the tile, so the name and the
     mark are words in it and the button's label says them all. */
  function build(cell) {
    const top = el('span', 'scheduler-avail__top');
    const name = el('span', 'scheduler-avail__who');
    const mark = el('span', 'scheduler-avail__mark');
    mark.setAttribute('aria-hidden', 'true');
    mark.hidden = true;
    /* The check a selected trip's free drivers wear in the mark's place,
       shown by app.css while data.js marks the tile free. */
    const free = svgUse('#i-checkmark--filled', '16', '0 0 32 32');
    free.classList.add('scheduler-avail__free-mark');
    top.append(name, mark, free);
    const card = el('span', 'rux--popover-container rux--popover--caret rux--popover--high-contrast rux--popover--drop-shadow rux--popover--right-start rux--toggletip scheduler-avail__card');
    const line = el('button', 'rux--toggletip-button scheduler-avail__line');
    line.type = 'button';
    line.setAttribute('aria-expanded', 'false');
    const meter = el('span', 'scheduler-avail__meter');
    meter.setAttribute('aria-hidden', 'true');
    line.append(meter, el('span', 'scheduler-avail__state'));
    const pop = el('span', 'rux--popover');
    pop.append(el('span', 'rux--popover-content'), el('span', 'rux--popover-caret'));
    card.append(line, pop);
    cell.replaceChildren(top, card);
  }

  function draw(cell, driver, live, alerts = [], onTrip = false) {
    const state = stateOf(live, onTrip);
    const marks = marksOf(driver, alerts);
    const name = driver.short_name || driver.name || 'Driver';
    const key = JSON.stringify([name, driver.name, driver.priority, driver.employment_type, driver.language, state.line, state.tone, state.meter, state.trip, state.free, marks.map(m => [m.kind, m.tone, m.words])]);
    if (cell.dataset.head === key) return;
    cell.dataset.head = key;
    if (!cell.querySelector(':scope > .scheduler-avail__top')) build(cell);
    const full = driver.name || name;
    const who = cell.querySelector('.scheduler-avail__who');
    who.textContent = name;
    /* The one icon: the worst mark, else the out-of-hours mark, else what
       they are doing on their trip, `data-trip`, in its own colour. */
    const mark = cell.querySelector('.scheduler-avail__mark');
    const shown = marks[0] ?? (state.tone === 'error' ? OUT : null);
    mark.hidden = !shown && !state.trip;
    if (shown) {
      delete mark.dataset.trip;
      mark.dataset.tone = shown.tone;
      mark.replaceChildren(svgUse(shown.icon, '16', '0 0 32 32'));
    } else if (state.trip) {
      mark.dataset.trip = state.trip;
      mark.dataset.tone = state.tone;
      mark.replaceChildren(svgUse(TRIP_ICON[state.trip], '16', '0 0 32 32'));
    }
    // A driver whose worst mark is red cannot drive, so is never marked free.
    cell.toggleAttribute('data-cannot', marks[0]?.tone === 'error');
    const line = cell.querySelector('.scheduler-avail__line');
    line.dataset.tone = state.tone;
    line.setAttribute('aria-label', [`${full}'s card`, state.trip ? 'On a trip' : null, state.words, ...marks.map(m => m.words)].filter(Boolean).join('. '));
    line.querySelector('.scheduler-avail__state').textContent = state.line;
    const meter = line.querySelector('.scheduler-avail__meter');
    meter.hidden = state.free;
    meter.dataset.tone = state.tone;
    if (state.meter != null) {
      meter.dataset.kind = 'drive';
      meter.style.setProperty('--scheduler-share', `${Math.round(state.meter * 100)}%`);
    } else {
      delete meter.dataset.kind;
      meter.style.removeProperty('--scheduler-share');
    }
    /* The tile's hover words are the driver's own, on one line as the bus
       tile's are the bus's: the full name, their priority, Part-time and
       their language. What the clock and the marks say is the card's. */
    cell.title = [full, driver.priority == null ? 'No priority' : `Priority ${driver.priority}`,
      driver.employment_type === 'part-time' ? 'Part-time' : null,
      driver.language ? ({ en: 'English', es: 'Spanish' })[driver.language] ?? driver.language : null].filter(Boolean).join(' · ');
  }

  window.SchedulerDriverHead = { draw, stateOf, marksOf, WARN_DAYS };
})();
