/* ==========================================================================
   Rux Scheduler — DRIVER HEAD, what the roster says of each driver
   --------------------------------------------------------------------------
   A driver's name cell in the roster is their head, as a bus's is in the
   bus column, drawn inside the cell data.js makes, on two lines:
   - The name, at 14px, and in the 32px before it the driver's most urgent
     mark, 16px, with every mark's words on its label:
       papers  the licence or medical card running out within WARN_DAYS,
               amber, or run out, red, as the Drivers page warns
       tell    a leg within 30 days that changed for them since they said
               yes, amber
       unsent  a leg leaving within two days they sit on and have not
               been sent, amber
     The roster is too narrow for a row of them, so one stands for all.
   - Under it, at 12px in the secondary grey, what Samsara's hours-of-service
     clock says now, as the bus head's state is what its vehicle says, in
     the 56px the roster leaves it: driving, the time left, "6:30 left"; on
     duty, a yard move or personal conveyance, the duty log's own short word
     and the time left, "On 0:36"; off or in the sleeper berth, the word and
     the whole hours rested, as the bus head says how long its engine has
     been off, "Off 14h", "SB 3h". The time left is the least of the drive,
     shift and cycle clocks, amber under an hour as the driver's tip has it.
     The full words are the line's label. A driver Samsara keeps no clock for
     has a quiet dash, as a bus with no signal does.

   `draw(cell, driver, live, alerts)` draws it: `driver` is the driver's row,
   `live` their entry in samsara-now's `drivers` or null, and `alerts` their
   list from to-do.js's `driverAlerts`. It draws again only when what it
   shows has changed. `stateOf(live)` and `marksOf(driver, alerts, today)`
   are what it shows, for tools/check-bar.mjs.
   Needs leg-facts.js and road-bar.js loaded first.
   ========================================================================== */
(() => {
  'use strict';

  const RoadBar = window.SchedulerRoadBar;
  const { HOUR, hours, restProgress } = RoadBar;
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

  /* What the clock says: `{ line, tone, words }`, the line the head shows,
     its tone, quiet, normal or warning, and the words for its label. */
  function stateOf(live) {
    if (!live?.duty) return { line: '–', tone: 'quiet', words: 'No hours-of-service clock from Samsara' };
    const left = live.left_ms;
    const low = left != null && left < HOUR;
    const words = RoadBar.words(live);
    if (live.duty === 'sleeper' || live.duty === 'off') {
      const { ms } = restProgress(live);
      const word = SHORT[live.duty];
      const rested = ms == null ? null : ms >= REST_LOOK ? `${spell(REST_LOOK)}+` : spell(ms);
      return { line: rested ? `${word} ${rested}` : word, tone: 'normal', words };
    }
    const time = left == null ? null : `${hours(left)} left`;
    const line = live.duty === 'driving' ? time ?? 'Driving' : [SHORT[live.duty] ?? 'On', left == null ? null : hours(left)].filter(Boolean).join(' ');
    return { line, tone: low ? 'warning' : 'normal', words };
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

  function draw(cell, driver, live, alerts = []) {
    const state = stateOf(live);
    const marks = marksOf(driver, alerts);
    const name = driver.short_name || driver.name || 'Driver';
    const key = JSON.stringify([name, state.line, state.tone, marks.map(m => [m.kind, m.tone, m.words])]);
    if (cell.dataset.head === key) return;
    cell.dataset.head = key;
    cell.replaceChildren();
    if (marks.length) {
      const top = marks[0];
      const mark = el('span', 'scheduler-avail__mark');
      mark.dataset.tone = top.tone;
      mark.setAttribute('role', 'img');
      mark.setAttribute('aria-label', marks.map(m => m.words).join('. '));
      mark.appendChild(svgUse(top.icon, '16', '0 0 32 32'));
      cell.appendChild(mark);
    }
    const line = el('span', 'scheduler-avail__state', state.line);
    line.dataset.tone = state.tone;
    line.setAttribute('aria-label', state.words);
    cell.append(el('span', 'scheduler-avail__who', name), line);
    cell.title = [`${driver.name || name} · ${driver.priority == null ? 'No priority' : `Priority ${driver.priority}`}`,
      state.words, ...marks.map(m => m.words)].join('\n');
  }

  window.SchedulerDriverHead = { draw, stateOf, marksOf, WARN_DAYS };
})();
