/* ==========================================================================
   Rux Scheduler — DRIVER HEAD, what the roster says of each driver
   --------------------------------------------------------------------------
   A driver's name cell in the rail is their tile, as a bus's is in the
   bus column, drawn inside the cell data.js makes, on two lines:
   - The name at 14px, and at the line's end one 16px icon, every mark's
     words on its label. The driver's most urgent mark stands there:
       rules   Samsara keeping them to hours rules that are not a
               passenger carrier's, red
       papers  the licence or medical card running out within WARN_DAYS,
               amber, or run out, red, as the Drivers page warns
       tell    a leg within 30 days that changed for them since they said
               yes, amber
       unsent  a leg leaving within two days they sit on and have not
               been sent, amber
     What Samsara says now can earn one too, and the worse stands: on a
     trip, their app not connected, amber; on a trip, logged into a bus not
     theirs, Material's bus alert, red; over or out of hours, the red error
     mark. With no mark, a driver on a trip under way has what they are
     doing on it, so a dispatcher knows whom not to call: driving, the trip bar's arrow
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
     matter stand out. On a trip, Not logged in in amber or "in 133" in red
     stands alone in the line's place, and over hours it is "Over 0:25" in
     red. A driver Samsara keeps no clock for, or whose app is not connected
     off a trip, has a quiet dash beside an empty meter, as a bus with no
     signal does. The full words, their duty and rest among them, are the
     line's label and the card's.
   A press anywhere on the tile opens the driver's card, a Carbon toggletip
   that data.js fills from trip-tips.js's `driverCard`, as a press anywhere
   on a bus's tile opens its tip.

   `draw(cell, driver, live, alerts, trip)` draws it, its parts once and
   their words as they change: `driver` is the driver's row,
   `live` their entry in samsara-now's `drivers` or null, `alerts` their
   list from to-do.js's `driverAlerts`, and `trip` data.js's `tripNow`,
   null with no trip of theirs under way, between its yard-out and its
   return, or `{ away }`. It draws again only when what it shows has
   changed. `stateOf(live, trip)` and
   `marksOf(driver, alerts, live, today)`
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
  /* The marks what Samsara says now earns a driver, in the same place as
     the marks of their papers and legs. */
  const NOW_MARKS = {
    unlogged: { kind: 'unlogged', tone: 'warning', icon: '#i-warning--alt--filled' },
    away: { kind: 'away', tone: 'error', icon: '#m-bus_alert-fill' },
    over: { kind: 'over', tone: 'error', icon: '#i-error--filled' },
    out: { kind: 'out', tone: 'error', icon: '#i-error--filled' },
  };

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

  /* What Samsara says now: `{ line, tone, words, meter, bare, trip, free,
     mark }`, the line the head shows; its tone, quiet, normal, warning or
     error; the words for its label; its meter's share of the ten hours from
     0 to 1, or null for the dashed empty meter of no clock; `bare` when the
     line is words alone with no meter; what the driver is doing on a trip
     under way, `driving`, `on`, `off` or `sleeper`, or null; whether they
     are free, on no trip with all ten hours, when the line is empty; and
     the mark it earns, or null. `trip` is data.js's `tripNow`, null on no
     trip under way or `{ away }`, the bus Samsara has them in when it is
     not theirs; `true` stands for a trip with no bus to say. In order:
     - on a trip with their app not connected, Not logged in, amber;
     - on a trip in another bus, "in 133", red;
     - over their hours, "Over 0:25", red, as long as Samsara counts it;
     - else the driving time left, "6:30 left", amber under an hour and red
       under a minute. */
  const fill = (ms, total) => Math.round(Math.min(1, Math.max(0, ms / total)) * 100) / 100;
  function stateOf(live, trip = null) {
    const quiet = { tone: 'quiet', meter: null, bare: false, trip: null, free: false, mark: null };
    if (!live) return { ...quiet, line: '–', words: 'No hours-of-service clock from Samsara' };
    const away = trip?.away ?? null;
    if (!live.duty) {
      return trip ? { ...quiet, line: 'Not logged in', tone: 'warning', bare: true, words: 'Not logged in to Samsara', mark: NOW_MARKS.unlogged }
        : { ...quiet, line: '–', words: 'Not logged in to Samsara' };
    }
    const words = RoadBar.words(live);
    const doing = trip ? (live.wheel ? 'driving' : TRIP_OF[live.duty] ?? null) : null;
    if (away) return { ...quiet, line: `in ${away}`, tone: 'error', bare: true, trip: doing, words: `Logged into ${away}, not their bus. ${words}`, mark: NOW_MARKS.away };
    if (live.over_ms > 0) return { ...quiet, line: `Over ${hours(live.over_ms)}`, tone: 'error', meter: 0, trip: doing, words: `Over hours by ${hours(live.over_ms)}. ${words}`, mark: NOW_MARKS.over };
    const left = live.left_ms;
    if (left == null) return { ...quiet, line: '–', words, trip: doing };
    if (!trip && left >= DRIVE) return { ...quiet, line: '', words, free: true };
    const tone = left < 60e3 ? 'error' : left < HOUR ? 'warning' : 'normal';
    return { ...quiet, line: `${hours(left)} left`, tone, words, meter: fill(left, DRIVE), trip: doing, mark: tone === 'error' ? NOW_MARKS.out : null };
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
     tone `error` or `warning`. `live` is their entry in samsara-now's
     `drivers`, for the hours rules Samsara keeps them to, and `today` a
     Date at the office's midnight. */
  function marksOf(driver, alerts = [], live = null, today = new Date(new Date().setHours(0, 0, 0, 0))) {
    const marks = [];
    /* Rules that are not a passenger carrier's make every clock Samsara
       gives for them wrong; the fix is the driver's settings in Samsara. */
    const rules = live?.rules ?? [];
    if (rules.length && !rules.every(r => /passenger/i.test(r))) {
      marks.push({ kind: 'rules', tone: 'error', icon: '#i-error--filled', words: `Samsara keeps them to ${rules.join('; ')}, not a bus driver's hours rules` });
    }
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

  function draw(cell, driver, live, alerts = [], trip = null) {
    const state = stateOf(live, trip);
    const marks = marksOf(driver, alerts, live);
    const name = driver.short_name || driver.name || 'Driver';
    const key = JSON.stringify([name, driver.name, driver.priority, driver.employment_type, driver.language, state.line, state.tone, state.meter, state.bare, state.trip, state.free, state.mark?.kind, !!trip, marks.map(m => [m.kind, m.tone, m.words])]);
    if (cell.dataset.head === key) return;
    cell.dataset.head = key;
    if (!cell.querySelector(':scope > .scheduler-avail__top')) build(cell);
    const full = driver.name || name;
    const who = cell.querySelector('.scheduler-avail__who');
    who.textContent = name;
    /* The one icon: the worse of the mark what Samsara says now earns and
       their worst mark, the first on a tie, else what they are doing on
       their trip, `data-trip`, in its own colour. */
    const mark = cell.querySelector('.scheduler-avail__mark');
    const rank = m => (!m ? 0 : m.tone === 'error' ? 2 : 1);
    const shown = rank(state.mark) >= rank(marks[0]) ? state.mark : marks[0];
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
    // A driver with an expired paper cannot drive, so is never marked free.
    cell.toggleAttribute('data-cannot', marks.some(m => m.kind === 'papers' && m.tone === 'error'));
    const line = cell.querySelector('.scheduler-avail__line');
    line.dataset.tone = state.tone;
    line.setAttribute('aria-label', [`${full}'s card`, trip ? 'On a trip' : null, state.words, ...marks.map(m => m.words)].filter(Boolean).join('. '));
    line.querySelector('.scheduler-avail__state').textContent = state.line;
    const meter = line.querySelector('.scheduler-avail__meter');
    meter.hidden = state.free || state.bare;
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
