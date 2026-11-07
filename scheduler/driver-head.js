/* ==========================================================================
   Rux Scheduler — DRIVER HEAD, what the roster says of each driver
   --------------------------------------------------------------------------
   A driver's name cell in the rail is their tile, as a bus's is in the
   bus column, drawn inside the cell data.js makes, on two lines:
   - A person's icon where their picture will go, the name at 14px, and at
     the line's end the driver's most urgent mark, 16px, with every mark's
     words on its label, or while a selected trip finds them free on every
     day of it, a green check in its place:
       papers  the licence or medical card running out within WARN_DAYS,
               amber, or run out, red, as the Drivers page warns
       tell    a leg within 30 days that changed for them since they said
               yes, amber
       unsent  a leg leaving within two days they sit on and have not
               been sent, amber
     The tile is too narrow for a row of them, so one stands for all.
   - Under it, a meter of Samsara's hours-of-service clock, as the bus
     tile's fuel is, and at the line's end, at 12px in the secondary grey,
     what the clock says now: driving, the time left, "6:30", on a meter of
     the ten hours a passenger carrier's driver may drive; on duty, a yard
     move or personal conveyance, the duty log's own short word and the time
     left, "On 0:36", on the same meter; off or in the sleeper berth, the
     word and the whole hours rested, "Off 14h", "SB 3h", on the rest meter
     toward eight hours, in the rest colour the bars use while a trip of
     theirs is under way and in a quiet grey with none, where the rest is
     their own time. The time left is the least of the drive, shift and
     cycle clocks, amber under an hour as the driver's tip has it. The full
     words are the line's label. A driver Samsara keeps no clock for has a
     quiet dash beside an empty meter, as a bus with no signal does.
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
  const { HOUR, DRIVE, REST, hours, restProgress } = RoadBar;
  const NOT_SENT_ICON = window.SchedulerLegFacts.DRIVER_STATUSES.find(s => s.value === 'off').icon;

  // A paper this close to running out warns, as the Drivers page warns.
  const WARN_DAYS = 45;
  const DAY = 864e5;
  /* samsara-now reads a day of duty logs for a rest, so a rest that fills
     them began a day ago or earlier. */
  const REST_LOOK = 24 * HOUR;

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

  // Whole hours, "14h", or minutes under an hour, "35m", never more than it is.
  const spell = ms => {
    const min = Math.floor(ms / 60e3);
    return min < 60 ? `${min}m` : `${Math.floor(min / 60)}h`;
  };
  // The duty log's own short words.
  const SHORT = { on: 'On', yard: 'Yard', personal: 'PC', sleeper: 'SB', off: 'Off' };

  /* What the clock says: `{ line, tone, words, meter }`, the line the head
     shows, its tone, quiet, normal or warning, the words for its label, and
     its meter, `{ kind, share }`, how full it is from 0 to 1 and its kind:
     `drive`, `rest` during a trip, or `off` with none under way; or null
     with no clock. */
  const fill = (ms, total) => Math.round(Math.min(1, Math.max(0, ms / total)) * 100) / 100;
  function stateOf(live, onTrip = false) {
    if (!live?.duty) return { line: '–', tone: 'quiet', words: 'No hours-of-service clock from Samsara', meter: null };
    const left = live.left_ms;
    const low = left != null && left < HOUR;
    const words = RoadBar.words(live);
    if (live.duty === 'sleeper' || live.duty === 'off') {
      const { ms } = restProgress(live);
      const word = SHORT[live.duty];
      const rested = ms == null ? null : ms >= REST_LOOK ? `${spell(REST_LOOK)}+` : spell(ms);
      return { line: rested ? `${word} ${rested}` : word, tone: 'normal', words, meter: { kind: onTrip ? 'rest' : 'off', share: fill(ms ?? 0, REST) } };
    }
    const time = left == null ? null : hours(left);
    const line = live.duty === 'driving' ? time ?? 'Driving' : [SHORT[live.duty] ?? 'On', left == null ? null : hours(left)].filter(Boolean).join(' ');
    return { line, tone: low ? 'warning' : 'normal', words, meter: { kind: 'drive', share: fill(left ?? 0, DRIVE) } };
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
     place and a card open from the tile stays open: the name; the worst
     mark; the free check; and the line, the button of the card's toggletip,
     with the structure from `carbon-ibm-products-dom.json` that
     js/popover.js opens, its content data.js's, filled as it opens. The
     whole tile is that button's to press, as the whole bus tile is its
     number's: app.css spreads its press over the tile, so the name and the
     mark are words in it and the button's label says them all. */
  function build(cell) {
    const top = el('span', 'scheduler-avail__top');
    const who = svgUse('#m-person', '16', '0 0 32 32');
    who.classList.add('scheduler-avail__icon');
    const name = el('span', 'scheduler-avail__who');
    const mark = el('span', 'scheduler-avail__mark');
    mark.setAttribute('aria-hidden', 'true');
    mark.hidden = true;
    /* The check a selected trip's free drivers wear in the mark's place,
       shown by app.css while data.js marks the tile free. */
    const free = svgUse('#i-checkmark--filled', '16', '0 0 32 32');
    free.classList.add('scheduler-avail__free-mark');
    top.append(who, name, mark, free);
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
    const key = JSON.stringify([name, driver.name, driver.priority, driver.employment_type, driver.language, state.line, state.tone, state.meter, marks.map(m => [m.kind, m.tone, m.words])]);
    if (cell.dataset.head === key) return;
    cell.dataset.head = key;
    if (!cell.querySelector(':scope > .scheduler-avail__top')) build(cell);
    const full = driver.name || name;
    const who = cell.querySelector('.scheduler-avail__who');
    who.textContent = name;
    const mark = cell.querySelector('.scheduler-avail__mark');
    mark.hidden = !marks.length;
    if (marks.length) {
      mark.dataset.tone = marks[0].tone;
      mark.replaceChildren(svgUse(marks[0].icon, '16', '0 0 32 32'));
    }
    // A driver whose worst mark is red cannot drive, so is never marked free.
    cell.toggleAttribute('data-cannot', marks[0]?.tone === 'error');
    const line = cell.querySelector('.scheduler-avail__line');
    line.dataset.tone = state.tone;
    line.setAttribute('aria-label', [`${full}'s card`, state.words, ...marks.map(m => m.words)].join('. '));
    line.querySelector('.scheduler-avail__state').textContent = state.line;
    const meter = line.querySelector('.scheduler-avail__meter');
    meter.dataset.tone = state.tone;
    if (state.meter) {
      meter.dataset.kind = state.meter.kind;
      meter.style.setProperty('--scheduler-share', `${Math.round(state.meter.share * 100)}%`);
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
