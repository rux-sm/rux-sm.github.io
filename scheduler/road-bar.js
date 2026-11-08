/* ==========================================================================
   Rux Scheduler — ROAD BAR, a bar while its bus is out on its trip
   --------------------------------------------------------------------------
   While a bus is out on its trip, its bar keeps its destination and
   customer, and the rows under them say what Samsara says, laid out for the
   narrowest bar, a one-day trip on the board's 10rem day, and kept to one
   day's width on a longer bar, in today's column, every row moving there
   but the times, whose track runs the bar's whole length.
   - The bus icon at the destination row's end marks the trip as out and
     opens the live card, with a warning sign after it; it gently pulses
     while the trip is out. What the bus is doing is the bus column's, so
     the icon says it only on its tooltip.
   - The times, in the time row's place: out and back either end of a
     track filled to now, or No signal and how long. Its tooltip says what
     Samsara says of the bus and its drivers, each warning in a sentence.
   - live-trip.js's warnings, Late to spot among them, on the alert badge
     that leads the destination row, in its colour, as the trip's other
     problems are, and in the Alerts tip it opens.
   - The contact and update rows stay, as on any bar. What belongs to the bus, its
     speed, fuel and DEF, is the bus column's, bus-head.js's.
   - The drivers, as a planned bar draws them, each name with its answer:
     what a driver is doing, their hours and their rest, is their tile's in
     the driver rail, and the tip their mark opens says it in full. The one
     at the wheel stands first, behind the steering wheel, the driving mark
     in green, amber when low. A driver Samsara has in another bus says
     that bus in red; a co-driver in another of the buses they ride says it
     in the row's ink. A driver at the wheel the bar does not name joins the
     end of the row.
   The bar wears no edge, border or light of its own: how the bus is doing
   is the bus column's, and a problem's words in the times row. With the time row off the board the
   times go too; app.css does that from the view's toggles.

   `draw(bar, bus, live)` draws it on a bar bar.js drew, or takes it off
   with no `bus`. `bus` is one bus of samsara-now's answer, and `live` what
   the board worked out around it: `next`, road.js's reading of where the
   bus is on its leg; `said`, live-trip.js's `{ warnings, phase }` for it;
   `at`, when Samsara answered; `motion`, the view's Motion, since a bar
   starts as a bus does only at Full; and `day`, today's column counted
   from the bar's first day, where a longer bar's rows stand while out. data.js draws the board's out bars
   with it, and components.html its samples.

   `HOUR`, `DUTY`, `IDLE_MS`, `hours(ms)`, `mark(duty, left)`,
   `ago(at)`, `short(name)`, `words(driver)`, `restWords(driver)` and
   `restProgress(driver)` are the duty marks, clocks and words the live card
   draws as the bar does.
   ========================================================================== */
(() => {
  'use strict';

  const Road = window.SchedulerRoad;
  const { clockEl, hhmm, routeMark, alertMark, alertTo } = window.SchedulerBar;

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

  const HOUR = 3600e3;
  const { LOW_LEFT: LOW } = Road;
  const { DRIVER_STATUSES } = window.SchedulerLegFacts;
  const NOT_SENT_ICON = DRIVER_STATUSES.find(s => s.value === 'off').icon;
  const DUTY = {
    driving: { icon: '#i-BPMN-link--fill', box: '0 0 32 32', word: 'Driving', tone: 'success' },
    on: { icon: '#i-time--filled', box: '0 0 32 32', word: 'On duty', tone: 'success' },
    sleeper: { icon: '#i-asleep--filled', box: '0 0 32 32', word: 'Sleeper', tone: 'rest' },
    off: { icon: '#i-subtract--filled', box: '0 0 32 32', word: 'Off duty', tone: 'neutral' },
    yard: { icon: '#i-BPMN-link--fill', box: '0 0 32 32', word: 'Yard move', tone: 'warning' },
    personal: { icon: '#i-BPMN-link--fill', box: '0 0 32 32', word: 'Personal conveyance', tone: 'rest' },
    unknown: { icon: '#i-unknown--filled', box: '0 0 32 32', word: 'Unknown duty', tone: 'neutral' },
  };
  // Continuous rest is compared with an eight-hour reference, independently of HOS availability.
  const REST = 8 * HOUR;
  const resting = d => ['sleeper', 'off'].includes(d?.duty);
  const restElapsed = (d, at = Date.now()) => {
    const since = resting(d) && d.rest_since ? Date.parse(d.rest_since) : NaN;
    return Number.isFinite(since) && since <= at ? at - since : null;
  };
  /* HOW FAR A RESTING DRIVER IS TOWARD THE EIGHT HOURS: the continuous rest,
     or, for one in the sleeper whom samsara-now finds part way through a
     split, the earlier sleeper period and this one together where they come
     to more, as `{ ms, earlier, now }`. A split's second period counts only
     once it reaches two hours, `SPLIT_MIN`, so until then the rest is shown
     as it stands. */
  const SPLIT_MIN = 2 * HOUR;
  const restProgress = (d, at = Date.now()) => {
    const ms = restElapsed(d, at);
    const since = d?.duty === 'sleeper' && d.berth_since ? Date.parse(d.berth_since) : NaN;
    const now = Number.isFinite(since) && since <= at ? at - since : null;
    if (now != null && now >= SPLIT_MIN && d.split_ms > 0 && d.split_ms + now > (ms ?? 0)) return { ms: d.split_ms + now, earlier: d.split_ms, now };
    return { ms, earlier: null, now: null };
  };
  const share = (ms, total) => Math.round(Math.min(1, Math.max(0, ms / total)) * 1000) / 10;
  // A passenger carrier's driver may drive ten hours, so a full ring is ten.
  const DRIVE = 10 * HOUR;
  // Idling this long is worth a look; a normal wait at a pickup is shorter.
  const IDLE_MS = 30 * 60e3;
  const hours = ms => `${Math.floor(ms / HOUR)}:${String(Math.floor((ms % HOUR) / 60e3)).padStart(2, '0')}`;
  // Rest elapsed comes from the duty logs; remaining availability comes from Samsara's clocks.
  const spell = ms => {
    const min = Math.floor(ms / 60e3);
    return min < 60 ? `${min}m` : `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m`;
  };
  const restWords = d => {
    const { ms, earlier, now } = restProgress(d);
    return ms == null ? null : earlier != null ? `Split rest ${spell(earlier)} + ${spell(now)}` : `Rested ${spell(ms)}`;
  };
  // A rest's tooltip: what it is made of, against the eight hours.
  const restTitle = ({ ms, earlier, now }) => (earlier == null
    ? `${hours(ms)} continuous rest / 8:00 reference`
    : `${hours(earlier)} earlier in the sleeper + ${hours(now)} now, ${hours(ms)} of a split rest / 8:00 reference`);
  const words = d => [DUTY[d.duty]?.word ?? 'Status unknown', restWords(d),
    d.left_ms != null ? `${hours(d.left_ms)} driving left` : null, d.wheel ? 'at the wheel' : null].filter(Boolean).join(' · ');
  const short = name => {
    const parts = String(name).trim().split(/\s+/);
    return parts.length > 1 ? `${parts[0]} ${parts.at(-1)[0]}.` : parts[0];
  };
  /* A duty's mark, as the live card draws a driver's; given the hours left,
     ringed by them, the ring's share set as a custom property app.css
     draws. */
  const mark = (duty, left, press = false) => {
    const m = el(press ? 'button' : 'span', `scheduler-crew__duty scheduler-crew__duty--${duty}`);
    const status = DUTY[duty] ?? DUTY.unknown;
    m.dataset.tone = status.tone;
    if (press) m.type = 'button'; else m.setAttribute('role', 'img');
    m.setAttribute('aria-label', status.word);
    m.appendChild(svgUse(status.icon, '16', status.box ?? '0 0 16 16'));
    if (left != null) {
      m.classList.add('scheduler-crew__duty--ring');
      if (left < LOW) m.classList.add('scheduler-crew__duty--low');
      m.style.setProperty('--scheduler-left', `${Math.round(Math.min(1, left / DRIVE) * 100)}%`);
    }
    return m;
  };
  /* The steering wheel on a bar, the driving mark of the driver at the
     wheel, amber when low: a button, which `liveOpener` makes the
     opener of their tip. */
  const wheelMark = left => {
    const m = mark('driving', null, true);
    if (left != null && left < LOW) m.dataset.tone = 'warning';
    m.setAttribute('aria-label', 'At the wheel');
    return m;
  };
  // How long since an instant, "12m", "3h" or "2d".
  const ago = at => {
    const min = Math.max(0, Math.floor((Date.now() - Date.parse(at)) / 60e3));
    return min < 60 ? `${min}m` : min < 48 * 60 ? `${Math.floor(min / 60)}h` : `${Math.floor(min / 1440)}d`;
  };
  /* Each seat is a planned bar's, its name with its answer. The driver at
     the wheel stands first behind the steering wheel, which stands in their
     answer's place. A driver Samsara has in another bus says that bus in
     red; a co-driver in another of the buses they ride says it in the
     row's ink. */
  function crewOn(item, d, elsewhere, riding = null) {
    item.querySelector(':scope > .scheduler-crew__duty')?.remove();
    item.querySelector(':scope > .scheduler-crew__away')?.remove();
    item.classList.remove('scheduler-crew--wheel', 'scheduler-crew--away', 'scheduler-crew--riding');
    item.removeAttribute('title');
    if (elsewhere) {
      item.classList.add('scheduler-crew--away');
      item.append(el('span', 'scheduler-crew__away', `in ${elsewhere.bus}`));
      item.title = `Samsara: ${elsewhere.sentence}`;
      return;
    }
    if (riding) {
      item.classList.add('scheduler-crew--riding');
      item.append(el('span', 'scheduler-crew__away', `in ${riding.bus}`));
      item.title = `Samsara: in ${riding.bus}, another bus they ride on this trip`;
      return;
    }
    if (!d?.wheel) return;
    item.classList.add('scheduler-crew--wheel');
    item.prepend(wheelMark(d.left_ms));
  }

  // A full rest meter is a completed reference period, not a reset of every HOS clock.
  function restMeter(d, at = Date.now()) {
    const rest = restProgress(d, at);
    const { ms } = rest;
    const meter = el('span', `scheduler-crew__rest${ms == null ? ' scheduler-crew__rest--unknown' : ''}`);
    meter.setAttribute('role', ms == null ? 'img' : 'meter');
    meter.setAttribute('aria-label', ms == null ? 'Rest duration unknown' : rest.earlier == null ? 'Continuous rest progress' : 'Split rest progress');
    if (ms != null) {
      meter.setAttribute('aria-valuemin', '0');
      meter.setAttribute('aria-valuemax', '8');
      meter.setAttribute('aria-valuenow', String(Math.min(8, ms / HOUR)));
      meter.setAttribute('aria-valuetext', `${restTitle(rest)}; check HOS clocks for availability`);
    }
    meter.style.setProperty('--scheduler-rest', `${ms == null ? 0 : share(ms, REST)}%`);
    // Where a split's earlier period ends, for app.css's 1px gap between the two.
    if (rest.earlier != null) {
      meter.dataset.split = '';
      meter.style.setProperty('--scheduler-rest-split', `${share(rest.earlier, REST)}%`);
    }
    meter.title = ms == null ? 'Rest duration unknown' : restTitle(rest);
    return meter;
  }

  /* A bar coming on the road starts as a bus does: with its engine running it
     shudders while the starter cranks, app.css's scheduler-bar--starting;
     with the engine off or no signal its rows only fade in. Once per leg's bus a page load, so a board
     drawn again, a save or another week, brings the bar back lit and still. */
  const START_MS = 1200;
  const ALARM_MS = 60e3;
  const started = new Set();
  // When this page first saw each red warning on each bar, so it blinks for its first minute.
  const alarms = new Map();
  function start(bar, bus, motion) {
    const key = `${bar.dataset.tripId}:${bar.dataset.legKey}:${bar.dataset.busId}`;
    if (started.has(key) || motion !== 'full') return;
    started.add(key);
    const name = bus.engine === 'on' || bus.engine === 'idle' ? 'scheduler-bar--starting' : 'scheduler-bar--lit';
    bar.classList.add(name);
    setTimeout(() => bar.classList.remove(name), START_MS);
  }

  function draw(bar, bus, live = {}) {
    const next = bus ? live.next ?? null : null;
    const said = bus ? live.said ?? { warnings: [], phase: null } : null;
    const crewBox = bar.querySelector(':scope > .scheduler-bar__drivers > .scheduler-bar__crew');
    const crew = crewBox ? [...crewBox.querySelectorAll(':scope > .scheduler-crew')] : [];
    const named = new Set(crew.map(c => c.dataset.driverId).filter(Boolean));
    const key = bus ? JSON.stringify([bus.engine, bus.engine_at && ago(bus.engine_at), bus.mph, bus.heading, bus.place,
      bus.fault, bus.faults, bus.seen && ago(bus.seen), bus.drivers,
      next?.stop?.key, next?.at, next?.arrival, next?.late, said.warnings.map(w => w.detail), said.phase, said.riding,
      overBy(bar, Date.now()), bus.drivers.some(resting) ? Math.floor(Date.now() / 60e3) : null]) : '';
    // The day the rows stand on, counted from the bar's first: today while out.
    if (bus && live.day > 0) bar.style.setProperty('--scheduler-today', live.day);
    else bar.style.removeProperty('--scheduler-today');
    if ((bar.dataset.road ?? '') === key) return;
    if (key) bar.dataset.road = key; else delete bar.dataset.road;
    bar.classList.toggle('scheduler-bar--road', !!bus);
    const worst = said?.warnings[0] ?? null;
    /* THE BUS'S STATE, `data-light`: run while it moves, idle with the
       engine running and the bus still, off with the engine off, scan with no signal.
       Driver rest is shown on each driver. A red warning's badge blinks for
       the first minute this page has seen it, `data-alarm`. */
    if (bus && !bar.dataset.light) start(bar, bus, live.motion ?? 'full');
    if (!bus) {
      delete bar.dataset.light;
      bar.removeAttribute('data-alarm');
    } else {
      const moving = bus.engine === 'on' && bus.mph > 0;
      bar.dataset.light = bus.engine == null ? 'scan' : moving ? 'run' : bus.engine === 'off' ? 'off' : 'idle';
      const alarm = worst?.tone === 'error' ? `${bar.dataset.tripId}|${bar.dataset.legKey}|${bar.dataset.assignmentId}|${worst.kind}` : null;
      if (alarm && !alarms.has(alarm)) alarms.set(alarm, Date.now());
      const blinkFor = alarm ? alarms.get(alarm) + ALARM_MS - Date.now() : 0;
      bar.toggleAttribute('data-alarm', blinkFor > 0);
      if (blinkFor > 0) setTimeout(() => bar.removeAttribute('data-alarm'), blinkFor);
    }
    const away = said?.warnings.find(w => w.kind === 'wrongBus') ?? null;
    for (const item of crew) {
      const id = item.dataset.driverId;
      crewOn(item, bus?.drivers.find(d => d.driver_id && d.driver_id === id) ?? null, away && away.driver === id ? away : null,
        said?.riding?.find(r => r.driver === id) ?? null);
    }
    wheelOn(bar, bus, named);
    liveOpener(bar, bus);
    times(bar, bus, next, said, live.at);
    badgeOn(bar, said?.warnings ?? []);
  }

  /* A driver at the wheel the bar does not name, a seat at the drivers
     row's end. */
  function wheelOn(bar, bus, named) {
    const row = bar.querySelector(':scope > .scheduler-bar__drivers');
    row?.querySelector(':scope > .scheduler-road__who')?.remove();
    const wheel = bus?.drivers.find(d => d.wheel) ?? null;
    if (!row || !wheel || named.has(wheel.driver_id)) return;
    const who = el('span', 'scheduler-road__who scheduler-crew scheduler-crew--wheel');
    // Whose tip the mark opens; not `data-driver-id`, which names a seat's driver.
    if (wheel.driver_id != null) who.dataset.wheelDriver = wheel.driver_id;
    // Not sent's circle in the slot every driver has, so the name lines
    // up: this driver has no status on the trip to colour it.
    const mark = el('button', 'scheduler-crew__mark scheduler-crew__mark--off scheduler-crew__mark--dot');
    mark.type = 'button';
    mark.appendChild(svgUse(NOT_SENT_ICON, '16', '0 0 32 32'));
    who.append(mark, el('span', 'scheduler-crew__name', short(wheel.name)));
    crewOn(who, wheel, null);
    who.title = `${wheel.name}, not on this trip\nSamsara: ${words(wheel)}`;
    row.appendChild(who);
  }

  // What the times row says in their place: No signal and how long, while Samsara hears nothing.
  const sayOf = bus => (bus.engine == null ? (bus.seen ? `No signal ${ago(bus.seen)}` : 'No signal') : null);

  /* A LIVE WARNING IS THE ALERT BADGE'S, as the trip's other problems are,
     so the times row always says the times: the badge that leads the
     destination row takes the worse of the tone bar.js drew it in and the
     warnings', the warnings' names leading its words, and goes back to how
     bar.js drew it once they have gone. A bar with no badge of its own has
     one only while warned. The sentences are on the times row's tooltip and
     in the Alerts tip the badge opens. */
  function badgeOn(bar, warnings) {
    const row = bar.querySelector(':scope > .scheduler-bar__dest');
    let m = row?.querySelector(':scope > .scheduler-bar__alert') ?? null;
    if (!row || (!m && !warnings.length)) return;
    if (!m) { m = alertMark(null, ''); row.prepend(m); }
    const own = m.dataset.tone ? { tone: m.dataset.tone, words: m.dataset.words } : null;
    if (!warnings.length) { if (own) alertTo(m, own.tone, own.words); else m.remove(); return; }
    const tone = own?.tone === 'error' || warnings.some(w => w.tone === 'error') ? 'error' : 'warning';
    alertTo(m, tone, [...warnings.map(w => `${w.title}: ${w.detail}`), own?.words].filter(Boolean).join(' · '));
  }

  const VEHICLE_STATES = {
    moving: { word: 'Moving' },
    idle: { word: 'Idling' },
    on: { word: 'Engine on' },
    off: { word: 'Engine off' },
    unknown: { word: 'Unknown' },
  };
  // Movement is the fresh GPS speed, independent of engine and driver duty.
  const vehicleState = bus => bus.mph > 0 ? 'moving' : bus.engine === 'idle' ? 'idle'
    : bus.engine === 'on' ? 'on' : bus.engine === 'off' ? 'off' : 'unknown';

  /* A trip in progress opens each driver's tip from their duty mark, and
     from the mark of a driver at the wheel the bar does not name, as the
     alert badge opens Alerts: the driving duty's arrow flashes, app.css's,
     and what the bus is doing is the bus column's. The rest of the row is
     the trip's, and a press on a name lifts that driver. A bus no longer out
     takes the marks away with it. */
  function liveOpener(bar, bus) {
    const row = bar.querySelector(':scope > .scheduler-bar__drivers');
    if (!row || !bus) return;
    for (const m of row.querySelectorAll('button.scheduler-crew__duty, .scheduler-road__who > button.scheduler-crew__mark')) {
      m.dataset.cardOpener = '';
      m.setAttribute('aria-expanded', 'false');
      const name = m.parentElement.querySelector('.scheduler-crew__name')?.textContent;
      m.setAttribute('aria-label', [name, m.getAttribute('aria-label') ?? 'Not on this trip', 'details'].filter(Boolean).join(': '));
      // No hover label of its own over the name's, since its tip says it.
      m.title = '';
    }
  }

  // When the leg is due back at the yard, as an instant.
  const plannedBack = bar => Number(bar.dataset.roadTo) - Road.MARGIN;
  // Whole minutes past the planned return, or 0.
  const overBy = (bar, now) => (bar.dataset.roadTo ? Math.max(0, Math.floor((now - plannedBack(bar)) / 60e3)) : 0);
  /* When the bus is now expected back: Geoapify's drive to the yard while
     the yard is its next stop, if that is more than LATE_MIN past the plan;
     else null. */
  const expectedBack = (bar, next) => (next?.stop?.type === 'return' && !next.at && next.arrival != null
    && next.arrival - plannedBack(bar) > Road.LATE_MIN * 60e3 ? next.arrival : null);
  // The office's calendar day of an instant, and the midnights from one to another.
  const OFFICE_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' });
  const dayOf = ms => OFFICE_DAY.format(new Date(ms));
  const midnights = (from, to) => Math.round((Date.parse(dayOf(to)) - Date.parse(dayOf(from))) / 864e5);
  /* The return's next-day mark, bar.js's on the bar's own times row, one day
     further for each midnight between the planned return and `expected`
     when the bus is now due back later; none on a bar cut at the week's end,
     as bar.js draws none there. */
  function nextDay(bar, expected) {
    if (bar.classList.contains('scheduler-bar--to-next')) return null;
    const planned = bar.querySelector(':scope > .scheduler-bar__time .scheduler-bar__next-day');
    const days = (planned ? Number(planned.textContent.slice(1)) : 0) + (expected == null ? 0 : midnights(plannedBack(bar), expected));
    if (!(days > 0)) return null;
    const mark = el('sup', 'scheduler-bar__next-day', `+${days}`);
    mark.title = days > 1 ? `Returns ${days} days later` : 'Returns the next day';
    return mark;
  }

  /* THE TIMES ROW, in the contact row's place: when the leg left the yard
     and when it is due back, with its next-day mark, at either end of a
     track filled as far as the time between them has gone, carrying the
     stops' ticks. A bus running late back
     says so in amber: when it is now expected, in place of the planned
     return, while it is heading for the yard, or else, once the planned
     return has passed, the planned return itself, with how long past it on
     its tooltip, so lateness takes no room on the row. A problem takes the
     row instead, its words in its colour. */
  function times(bar, bus, next, said, at) {
    let row = bar.querySelector(':scope > .scheduler-road__times');
    if (!bus) { row?.remove(); return; }
    if (!row) {
      row = el('div', 'scheduler-bar__row scheduler-road__times');
      bar.insertBefore(row, bar.querySelector(':scope > .scheduler-bar__update') ?? bar.querySelector(':scope > .scheduler-bar__drivers'));
    }
    row.title = tipOf(bar, bus, next, said, at);
    const say = sayOf(bus);
    if (say) { row.replaceChildren(el('span', 'scheduler-road__say scheduler-road__say--quiet', say)); return; }
    /* The times and the track between them are the trip's, as a planned
       bar's are; the route mark bar.js leads the row with opens the route tip. */
    const clock = (at, cls = 'scheduler-road__when') => { const w = el('span', cls); w.append(clockEl(at)); return w; };
    const parts = [];
    const expected = bar.dataset.roadTo ? expectedBack(bar, next) : null;
    if (bar.dataset.depart && bar.dataset.back) parts.push(routeMark());
    if (bar.dataset.depart) parts.push(clock(bar.dataset.depart));
    if (bar.dataset.depart && bar.dataset.back) {
      const out = Number(bar.dataset.roadFrom) + Road.MARGIN;
      const back = plannedBack(bar);
      const done = back > out ? Math.min(1, Math.max(0, (Date.now() - out) / (back - out))) : 0;
      const track = el('span', 'scheduler-road__track');
      track.style.setProperty('--scheduler-done', `${Math.round(done * 1000) / 10}%`);
      /* The stops' ticks the time row drew, placed on this track and in the
         strong ink once the bus has reached every stop a tick stands for, so
         a dim tick the filled line has passed is a stop it is late to. */
      const reached = new Set((next?.stops ?? []).slice(0, (next?.where?.reached ?? -1) + 1).map(s => s.key));
      for (const drawn of bar.querySelectorAll(':scope > .scheduler-bar__time .scheduler-bar__stop')) {
        const dot = drawn.cloneNode(false);
        const at = back > out ? (Number(drawn.dataset.ms) - out) / (back - out) * 100 : -1;
        if (!(at > 0 && at < 100)) continue;
        dot.style.setProperty('--scheduler-at', `${Math.round(at * 10) / 10}%`);
        dot.classList.toggle('scheduler-bar__stop--ahead', !drawn.dataset.stops.split(' ').every(k => reached.has(k)));
        track.append(dot);
      }
      parts.push(track);
    }
    const over = overBy(bar, Date.now());
    if (expected != null) {
      const when = clock(hhmm(Road.clockOf(expected), true), 'scheduler-road__when scheduler-road__when--late');
      when.title = bar.dataset.back ? `Expected back ${hhmm(Road.clockOf(expected), true)}, planned ${bar.dataset.back}` : '';
      when.append(...[nextDay(bar, expected)].filter(Boolean));
      parts.push(when);
    } else if (bar.dataset.back) {
      const when = clock(bar.dataset.back, over > 0 ? 'scheduler-road__when scheduler-road__when--late' : undefined);
      if (over > 0) when.title = `Due back ${bar.dataset.back}, ${over} min past it`;
      when.append(...[nextDay(bar, null)].filter(Boolean));
      parts.push(when);
    }
    row.replaceChildren(...parts);
  }


  /* The times row's tooltip: every warning in a sentence, the engine lamp
     with its codes, what the bus is doing and where, the next stop, the
     leg's times and each driver, and when Samsara said it. An engine lamp
     is said here and on the live card only, since one can stay lit for days. */
  function tipOf(bar, bus, next, said, at) {
    const arrives = next?.stop && !next.at && next.arrival != null
      ? `${next.stop.name}: arrives ${hhmm(Road.clockOf(next.arrival), true)}${next.stop.due != null ? `, due ${hhmm(Road.clockOf(next.stop.due), true)}` : ''}${next.late ? `, ${next.late} min late` : ''}` : null;
    return [
      ...said.warnings.map(w => `${w.title}: ${w.sentence}`),
      bus.fault === 'check' ? ['Engine warning lamp on', ...(bus.faults ?? [])].join(' · ') : null,
      [bus.engine === 'idle' ? 'Idling' : bus.engine === 'off' ? 'Engine off' : bus.engine == null ? 'No engine reading'
        : bus.mph != null ? `${bus.mph} mph` : 'Engine on', bus.place].filter(Boolean).join(' · '),
      next?.at ? `At ${next.stop.name}` : arrives,
      bar.dataset.depart || bar.dataset.back ? [bar.dataset.depart && `Out ${bar.dataset.depart}`, bar.dataset.back && `back ${bar.dataset.back}`,
        bar.dataset.roadTo && expectedBack(bar, next) != null ? `now expected back ${hhmm(Road.clockOf(expectedBack(bar, next)), true)}`
          : bar.dataset.roadTo && overBy(bar, Date.now()) > 0 ? `${overBy(bar, Date.now())} min past it` : null].filter(Boolean).join(' · ') : null,
      ...bus.drivers.map(d => `${d.name}: ${words(d)}`),
      at ? `Samsara, ${new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : null,
    ].filter(Boolean).join('\n');
  }

  window.SchedulerRoadBar = { draw, HOUR, LOW, DUTY, REST, DRIVE, restElapsed, restMeter, VEHICLE_STATES, vehicleState, IDLE_MS, hours, mark, ago, short, words, restWords, restProgress };
})();
