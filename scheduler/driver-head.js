/* ==========================================================================
   Rux Scheduler — DRIVER HEAD, what the roster says of each driver
   --------------------------------------------------------------------------
   A driver's name cell in the rail is their tile, a card as a bus's is in
   the bus column and a trip's bar is on the board, which app.css draws
   under the parts this draws inside the cell data.js makes, on one line:
   - The name at 14px, then two 16px icons, every mark's words on the
     label. At the line's end the driver's most urgent mark, the warning
     triangle for an amber one and the error circle for a red one, the two
     every trip bar and bus tile wear:
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
     theirs, red; over or out of hours, red. Before the mark, a driver on a
     trip under way has what they are doing on it, mark or not, so a
     dispatcher knows whom not to call: driving, the trip bar's arrow in
     green, amber when low; on duty, a play triangle; off duty, a pause; in
     the sleeper berth, a moon in the rest colour. A driver on no trip and
     on time off today has the crossed calendar there, in the colour their
     time off takes in the week, so nobody calls them. A driver with no such
     icon is on no trip and not away.
   - Along the tile's foot, the driving time Samsara says they have left,
     the least of the drive, shift and cycle clocks, as a 2px line filled of
     the ten hours a passenger carrier's driver may drive, as a trip bar's
     track is filled; amber when low, under RoadBar's LOW. A driver on no
     trip with all ten hours is free and has none, so the drivers who matter
     stand out. Where a gauge cannot say it there is none, and the red or
     amber mark says it: on a trip, not logged in or in another bus; over
     or out of hours; else an expired paper, since that driver cannot drive.
     A driver Samsara keeps no clock for, or whose app is not connected off
     a trip, has the gauge dashed and empty, as a bus with no signal does.
     The time in words, their duty and rest are the button's label and the
     card's.
   A press anywhere on the tile opens the driver's card, a Carbon toggletip
   that data.js fills from trip-tips.js's `driverCard`, as a press anywhere
   on a bus's tile opens its tip.

   `draw(cell, driver, live, alerts, trip, off)` draws it, its parts once
   and their words as they change: `driver` is the driver's row,
   `live` their entry in samsara-now's `drivers` or null, `alerts` their
   list from to-do.js's `driverAlerts`, `trip` data.js's `tripNow`,
   null with no trip of theirs under way, between its yard-out and its
   return, or `{ away }`, and `off` their `driver_time_off` row that covers
   today, or null. It draws again only when what it shows has
   changed. `stateOf(live, trip)`,
   `marksOf(driver, alerts, live, today)` and `offWords(off, today)`
   are what it shows, for tools/check-bar.mjs.
   Needs leg-facts.js and road-bar.js loaded first.
   ========================================================================== */
(() => {
  'use strict';

  const RoadBar = window.SchedulerRoadBar;
  const { LOW, DRIVE, hours } = RoadBar;

  // A paper this close to running out warns, as the Drivers page warns.
  const WARN_DAYS = 45;
  const DAY = 864e5;
  /* What a driver is doing on a trip under way, by their duty log: a yard
     move counts as on duty and personal conveyance as off duty, as the
     hours rules count them; each draws RoadBar's `DUTY` mark, the trip
     bar's. */
  const TRIP_OF = { driving: 'driving', on: 'on', yard: 'on', personal: 'off', off: 'off', sleeper: 'sleeper' };
  /* The marks what Samsara says now earns a driver, in the same place as
     the marks of their papers and legs. */
  const NOW_MARKS = {
    unlogged: { kind: 'unlogged', tone: 'warning', icon: '#i-warning--alt--filled' },
    away: { kind: 'away', tone: 'error', icon: '#i-warning--filled' },
    over: { kind: 'over', tone: 'error', icon: '#i-warning--filled' },
    out: { kind: 'out', tone: 'error', icon: '#i-warning--filled' },
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

  /* What Samsara says now: `{ tone, words, meter, bare, trip, free, mark }`,
     its tone, quiet, normal, warning or error; the words for the tile's
     label; its gauge's share of the ten hours from 0 to 1, or null for the
     dashed empty gauge of no clock; `bare` when its mark says it and there
     is no gauge; what the driver is doing on a trip under way, `driving`,
     `on`, `off` or `sleeper`, or null; whether they are free, on no trip
     with all ten hours, with no gauge; and the mark it earns, or null. `trip` is data.js's `tripNow`, null on no
     trip under way or `{ away }`, the bus Samsara has them in when it is
     not theirs; `true` stands for a trip with no bus to say. In order:
     - on a trip with their app not connected, amber;
     - on a trip in another bus, red;
     - over their hours, red, as long as Samsara counts it;
     - under a minute left, out of hours, red;
     - else the driving time left on the gauge, amber when low. */
  const fill = (ms, total) => Math.round(Math.min(1, Math.max(0, ms / total)) * 100) / 100;
  function stateOf(live, trip = null) {
    const quiet = { tone: 'quiet', meter: null, bare: false, trip: null, free: false, mark: null };
    if (!live) return { ...quiet, words: 'No hours-of-service clock from Samsara' };
    const away = trip?.away ?? null;
    if (!live.duty) {
      return trip ? { ...quiet, tone: 'warning', bare: true, words: 'Not logged in to Samsara', mark: NOW_MARKS.unlogged }
        : { ...quiet, words: 'Not logged in to Samsara' };
    }
    const words = RoadBar.words(live);
    const doing = trip ? (live.wheel ? 'driving' : TRIP_OF[live.duty] ?? null) : null;
    if (away) return { ...quiet, tone: 'error', bare: true, trip: doing, words: `Logged into ${away}, not their bus. ${words}`, mark: NOW_MARKS.away };
    if (live.over_ms > 0) return { ...quiet, tone: 'error', bare: true, trip: doing, words: `Over hours by ${hours(live.over_ms)}. ${words}`, mark: NOW_MARKS.over };
    const left = live.left_ms;
    if (left == null) return { ...quiet, words, trip: doing };
    if (!trip && left >= DRIVE) return { ...quiet, words, free: true };
    if (left < 60e3) return { ...quiet, tone: 'error', bare: true, words: `Out of hours. ${words}`, trip: doing, mark: NOW_MARKS.out };
    return { ...quiet, tone: left < LOW ? 'warning' : 'normal', words, meter: fill(left, DRIVE), trip: doing };
  }

  const dayOf = v => {
    const s = String(v ?? '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  // Each paper's field and its name in a sentence.
  const PAPERS = [['license_exp', 'Licence'], ['med_card_expiry', 'Medical card']];

  /* The driver's marks, the most urgent first: `{ kind, tone, icon, words }`,
     tone `error` or `warning`; an expired paper's is `papers` in `error`.
     `live` is their entry in samsara-now's
     `drivers`, for the hours rules Samsara keeps them to, and `today` a
     Date at the office's midnight. */
  function marksOf(driver, alerts = [], live = null, today = new Date(new Date().setHours(0, 0, 0, 0))) {
    const marks = [];
    /* Rules that are not a passenger carrier's make every clock Samsara
       gives for them wrong; the fix is the driver's settings in Samsara. */
    const rules = live?.rules ?? [];
    if (rules.length && !rules.every(r => /passenger/i.test(r))) {
      marks.push({ kind: 'rules', tone: 'error', icon: '#i-warning--filled', words: `Samsara keeps them to ${rules.join('; ')}, not a bus driver's hours rules` });
    }
    for (const [field, word] of PAPERS) {
      const when = dayOf(driver?.[field]);
      if (!when) continue;
      const n = Math.round((when - today) / DAY);
      if (n > WARN_DAYS) continue;
      // The Drivers page's words.
      const words = n < 0 ? `${word} expired ${plural(-n, 'day')} ago`
        : n === 0 ? `${word} expires today` : `${word} expires in ${plural(n, 'day')}`;
      marks.push({ kind: 'papers', tone: n < 0 ? 'error' : 'warning', icon: n < 0 ? '#i-warning--filled' : '#i-warning--alt--filled', words });
    }
    const of = kind => alerts.filter(a => a.kind === kind);
    const legs = list => list.map(a => [a.trip?.destination || a.trip?.trip_ref || 'A trip', a.legName].filter(Boolean).join(', ')).join('; ');
    const tell = of('tell');
    if (tell.length) marks.push({ kind: 'tell', tone: 'warning', icon: '#i-warning--alt--filled', words: `Tell of a change: ${legs(tell)}` });
    const unsent = of('unsent');
    if (unsent.length) marks.push({ kind: 'unsent', tone: 'warning', icon: '#i-warning--alt--filled', words: `Not sent: ${legs(unsent)}` });
    return marks.sort((a, b) => (a.tone === b.tone ? 0 : a.tone === 'error' ? -1 : 1));
  }

  /* Time off under way, in words, for the tile's label and the card: until
     when, and why where a reason was given, as "Time off through Thu, Nov
     12 · Personal", or "Time off today" on its last day. */
  const OFF_ICON = '#m-event_busy';
  function offWords(off, today = new Date(new Date().setHours(0, 0, 0, 0))) {
    const end = dayOf(off.end_date || off.start_date);
    const until = !end || end <= today ? 'Time off today'
      : `Time off through ${end.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`;
    const why = off.reason ? window.SchedulerAway?.reasonText(off.reason) ?? off.reason : null;
    return [until, why].filter(Boolean).join(' · ');
  }

  /* THE TILE'S PARTS, made once, so a live answer changes them in place and
     a card open from the tile stays open: the name; the gauge in the
     button of the card's toggletip, with the structure from
     `carbon-ibm-products-dom.json` that js/popover.js opens, its content
     data.js's, filled as it opens; what they are doing on their trip; and
     the mark. The whole tile is that button's to press, as the whole bus
     tile is its number's: app.css spreads its press over the tile, so the
     name and the icons are words in it and the button's label says them
     all. */
  function build(cell) {
    const name = el('span', 'scheduler-avail__who');
    const [doing, mark] = ['scheduler-avail__doing', 'scheduler-avail__mark'].map(cls => {
      const icon = el('span', cls);
      icon.setAttribute('aria-hidden', 'true');
      icon.hidden = true;
      return icon;
    });
    const card = el('span', 'rux--popover-container rux--popover--caret rux--popover--high-contrast rux--popover--drop-shadow rux--popover--right-start rux--toggletip scheduler-avail__card');
    const line = el('button', 'rux--toggletip-button scheduler-avail__line');
    line.type = 'button';
    line.setAttribute('aria-expanded', 'false');
    const meter = el('span', 'scheduler-avail__meter');
    meter.setAttribute('aria-hidden', 'true');
    line.append(meter);
    const pop = el('span', 'rux--popover');
    pop.append(el('span', 'rux--popover-content'), el('span', 'rux--popover-caret'));
    card.append(line, pop);
    cell.replaceChildren(name, card, doing, mark);
  }

  function draw(cell, driver, live, alerts = [], trip = null, off = null) {
    const marks = marksOf(driver, alerts, live);
    /* A driver with an expired paper cannot drive, so is never marked free
       and has no gauge, the paper's red mark saying why, unless Samsara has
       a mark of its own for now. */
    const expired = marks.find(m => m.kind === 'papers' && m.tone === 'error');
    const now = stateOf(live, trip);
    const state = expired && !now.mark ? { ...now, tone: 'error', bare: true, free: false } : now;
    const name = driver.short_name || driver.name || 'Driver';
    const away = off ? offWords(off) : null;
    const key = JSON.stringify([name, driver.name, driver.priority, driver.employment_type, driver.language, state.tone, state.meter, state.bare, state.trip, state.free, state.mark?.kind, !!trip, away, marks.map(m => [m.kind, m.tone, m.words])]);
    if (cell.dataset.head === key) return;
    cell.dataset.head = key;
    if (!cell.querySelector(':scope > .scheduler-avail__who')) build(cell);
    const full = driver.name || name;
    const who = cell.querySelector('.scheduler-avail__who');
    who.textContent = name;
    /* What they are doing on their trip, `data-trip`, in its own colour,
       or with no trip under way, that they are away; then the mark, the
       worse of the one what Samsara says now earns and their worst, the
       first on a tie. */
    const doing = cell.querySelector('.scheduler-avail__doing');
    doing.hidden = !state.trip && !away;
    if (state.trip) {
      doing.dataset.trip = state.trip;
      doing.dataset.tone = state.tone;
      const duty = RoadBar.DUTY[state.trip];
      doing.replaceChildren(svgUse(duty.icon, '16', duty.box));
    } else if (away) {
      doing.dataset.trip = 'away';
      delete doing.dataset.tone;
      doing.replaceChildren(svgUse(OFF_ICON, '16', '0 0 32 32'));
    }
    const mark = cell.querySelector('.scheduler-avail__mark');
    const rank = m => (!m ? 0 : m.tone === 'error' ? 2 : 1);
    const shown = rank(state.mark) >= rank(marks[0]) ? state.mark : marks[0];
    mark.hidden = !shown;
    if (shown) {
      mark.dataset.tone = shown.tone;
      mark.replaceChildren(svgUse(shown.icon, '16', '0 0 32 32'));
    }
    cell.toggleAttribute('data-cannot', !!expired);
    const line = cell.querySelector('.scheduler-avail__line');
    line.setAttribute('aria-label', [`${full}'s card`, trip ? 'On a trip' : null, away, state.words, ...marks.map(m => m.words)].filter(Boolean).join('. '));
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

  window.SchedulerDriverHead = { draw, stateOf, marksOf, offWords, WARN_DAYS };
})();
