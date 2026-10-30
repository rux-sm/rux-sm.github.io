/* ==========================================================================
   Rux Scheduler — ROAD BAR, a bar while its bus is out on its trip
   --------------------------------------------------------------------------
   While a bus is out on its trip, its bar keeps its destination and
   customer, and the rows under them say what Samsara says, laid out for the
   narrowest bar, a one-day trip on the board's 10rem day, and kept to one
   day's width on a longer bar, in today's column, every row moving there.
   - The bus icon at the destination row's end marks the trip as out and
     opens the live card, with a warning sign after it; it gently pulses
     while the trip is out. What the bus is doing is the bus column's, so
     the icon says it only on its tooltip.
   - The times, in the time row's place: out and back either end of a
     track filled to now; a problem's words in its colour instead, Late to
     spot among them, the worst of live-trip.js's warnings or No signal.
     Its tooltip says what Samsara says of the bus and its drivers.
   - The contact row stays, as on any bar. What belongs to the bus, its
     speed, fuel and DEF, is the bus column's, bus-head.js's.
   - The drivers, in the update row's place too, a seat for each driver:
     the one at the wheel first and bold behind the steering wheel; every
     seat with its duty mark, with no duty reading an Unknown duty question
     mark, and under it a meter of the driving hours left, amber under one,
     or while resting of the rest so far, its reading inside. A driver
     Samsara has in another bus is the red stop sign, their name red and a
     full red meter with that bus. A driver at the wheel the bar does not
     name joins the end of the row. Two drivers split the rows half and
     half. app.css lays the seats out, and keeps them to one row where the
     view has turned the update row off.
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
   `ago(at)`, `short(name)`, `words(driver)` and `restWords(driver)` are the
   duty marks, clocks and words the live card draws as the bar does.
   ========================================================================== */
(() => {
  'use strict';

  const Road = window.SchedulerRoad;
  const { clockEl, hhmm, fitCrew } = window.SchedulerBar;

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
  const { DRIVER_STATUSES } = window.SchedulerLegFacts;
  const CONFIRMED_STATUS = DRIVER_STATUSES.find(s => s.value === 'confirmed');
  const CONFIRMED_ICON = CONFIRMED_STATUS.icon;
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
    const elapsed = restElapsed(d);
    return elapsed == null ? null : `Rested ${spell(elapsed)}`;
  };
  const words = d => [DUTY[d.duty]?.word ?? 'Status unknown', restWords(d),
    d.left_ms != null ? `${hours(d.left_ms)} driving left` : null, d.wheel ? 'at the wheel' : null].filter(Boolean).join(' · ');
  const short = name => {
    const parts = String(name).trim().split(/\s+/);
    return parts.length > 1 ? `${parts[0]} ${parts.at(-1)[0]}.` : parts[0];
  };
  /* A duty's mark; given the hours left, ringed by them, the ring's share set
     as a custom property app.css draws. */
  const mark = (duty, left) => {
    const m = el('span', `scheduler-crew__duty scheduler-crew__duty--${duty}`);
    const status = DUTY[duty] ?? DUTY.unknown;
    m.dataset.tone = status.tone;
    m.setAttribute('role', 'img');
    m.setAttribute('aria-label', status.word);
    m.appendChild(svgUse(status.icon, '16', status.box ?? '0 0 16 16'));
    if (left != null) {
      m.classList.add('scheduler-crew__duty--ring');
      if (left < HOUR) m.classList.add('scheduler-crew__duty--low');
      m.style.setProperty('--scheduler-left', `${Math.round(Math.min(1, left / DRIVE) * 100)}%`);
    }
    return m;
  };
  // The hours a driver may still drive, amber under one.
  const hoursEl = ms => {
    const label = el('span', `scheduler-crew__hours${ms != null && ms < HOUR ? ' scheduler-crew__hours--low' : ''}`, ms == null ? '— left' : `${hours(ms)} left`);
    label.title = ms == null ? 'Driving availability unknown' : `${hours(ms)} driving availability from Samsara`;
    return label;
  };
  // How long since an instant, "12m", "3h" or "2d".
  const ago = at => {
    const min = Math.max(0, Math.floor((Date.now() - Date.parse(at)) / 60e3));
    return min < 60 ? `${min}m` : min < 48 * 60 ? `${Math.floor(min / 60)}h` : `${Math.floor(min / 1440)}d`;
  };
  /* Each seat has a solid duty icon, its name and a labeled time. Availability
     comes from Samsara's clocks; an off-duty or sleeper seat also shows a
     separate rest track, with a dash when its duty logs cannot be read. */
  function crewOn(item, d, elsewhere) {
    for (const part of ['duty', 'hours', 'away', 'left', 'rest', 'rest-time']) item.querySelector(`:scope > .scheduler-crew__${part}`)?.remove();
    item.classList.remove('scheduler-crew--wheel', 'scheduler-crew--away', 'scheduler-crew--seat');
    item.style.removeProperty('--scheduler-seat-fill');
    delete item.dataset.duty;
    // A driver Samsara has in the bus is on the trip: their mark reads
    // confirmed while the bus is out, whatever they answered.
    const statusMark = item.querySelector(':scope > .scheduler-crew__mark');
    const statusUse = statusMark?.classList.contains('scheduler-crew__mark--dot') ? statusMark.querySelector('use') : null;
    if (statusMark?.dataset.baseClass != null) { statusMark.className = statusMark.dataset.baseClass; delete statusMark.dataset.baseClass; }
    if (statusUse && statusMark.dataset.baseIcon != null) { statusUse.setAttribute('href', statusMark.dataset.baseIcon); delete statusMark.dataset.baseIcon; }
    if (statusUse && statusMark.dataset.baseIndicator != null) { statusUse.parentElement.setAttribute('class', statusMark.dataset.baseIndicator); delete statusMark.dataset.baseIndicator; }
    item.classList.toggle('scheduler-crew--declined', item.dataset.baseDeclined === 'true');
    delete item.dataset.baseDeclined;
    if (item.dataset.baseTitle != null) { item.title = item.dataset.baseTitle; delete item.dataset.baseTitle; }
    if (elsewhere) {
      item.dataset.baseTitle = item.title;
      const m = el('span', 'scheduler-crew__duty scheduler-crew__duty--away');
      m.appendChild(svgUse('#m-report-fill', '16', '0 0 16 16'));
      item.prepend(m);
      item.dataset.duty = 'away';
      item.classList.add('scheduler-crew--away', 'scheduler-crew--seat');
      item.append(el('span', 'scheduler-crew__away', `in ${elsewhere.bus}`), leftBar(null, true));
      item.style.setProperty('--scheduler-seat-fill', '100%');
      item.title = `${item.title}\nSamsara: ${elsewhere.sentence}`;
      return;
    }
    if (!d) return;
    item.dataset.baseTitle = item.title;
    item.classList.add('scheduler-crew--seat');
    if (statusMark) {
      statusMark.dataset.baseClass = statusMark.className;
      statusMark.className = statusMark.className.replace(/scheduler-crew__mark--(off|warning|major|normal|error|success)\b/, 'scheduler-crew__mark--success');
      if (statusUse) {
        statusMark.dataset.baseIcon = statusUse.getAttribute('href');
        statusUse.setAttribute('href', CONFIRMED_ICON);
        statusMark.dataset.baseIndicator = statusUse.parentElement.getAttribute('class') || '';
        statusUse.parentElement.setAttribute('class', CONFIRMED_STATUS.indicator);
      }
    }
    item.dataset.baseDeclined = String(item.classList.contains('scheduler-crew--declined'));
    item.classList.remove('scheduler-crew--declined');
    item.dataset.duty = d.duty ?? 'unknown';
    const dutyMark = mark(d.duty ?? 'unknown');
    item.prepend(dutyMark);
    item.classList.toggle('scheduler-crew--wheel', d.wheel);
    item.append(hoursEl(d.left_ms));
    if (d.left_ms != null) item.appendChild(leftBar(d.left_ms));
    if (resting(d)) {
      const elapsed = restElapsed(d);
      const label = el('span', 'scheduler-crew__rest-time', elapsed == null ? 'Rest —' : `Rest ${hours(elapsed)}`);
      label.title = elapsed == null ? 'Continuous rest unknown: duty logs unavailable' : `${hours(elapsed)} continuous rest / 8:00 reference; availability comes from Samsara's HOS clocks`;
      item.append(label, restMeter(d));
    }
    // How far the seat's meter is filled, where app.css turns its reading
    // from dark to the row's ink: the rest so far while resting, else the
    // hours left.
    const elapsed = resting(d) ? restElapsed(d) : null;
    item.style.setProperty('--scheduler-seat-fill', `${resting(d) ? (elapsed == null ? 0 : share(elapsed, REST))
      : d.left_ms != null ? share(d.left_ms, DRIVE) : 0}%`);
    item.title = `${item.title}\nSamsara: ${words(d)}`;
  }
  // The bar of driving hours left under a seat; red and full for the wrong bus.
  function leftBar(ms, away) {
    const b = el('span', `scheduler-crew__left${away ? ' scheduler-crew__left--away' : ms < HOUR ? ' scheduler-crew__left--low' : ''}`);
    b.style.setProperty('--scheduler-left', `${away ? 100 : share(ms, DRIVE)}%`);
    if (!away) {
      b.setAttribute('role', 'meter');
      b.setAttribute('aria-label', 'Driving availability');
      b.setAttribute('aria-valuemin', '0');
      b.setAttribute('aria-valuemax', String(DRIVE / HOUR));
      b.setAttribute('aria-valuenow', String(Math.min(DRIVE, ms) / HOUR));
      b.setAttribute('aria-valuetext', `${hours(ms)} left, reported by Samsara`);
      b.title = `${hours(ms)} driving availability`;
    }
    return b;
  }

  // A full rest meter is a completed reference period, not a reset of every HOS clock.
  function restMeter(d, at = Date.now()) {
    const ms = restElapsed(d, at);
    const meter = el('span', `scheduler-crew__rest${ms == null ? ' scheduler-crew__rest--unknown' : ''}`);
    meter.setAttribute('role', ms == null ? 'img' : 'meter');
    meter.setAttribute('aria-label', ms == null ? 'Rest duration unknown' : 'Continuous rest progress');
    if (ms != null) {
      meter.setAttribute('aria-valuemin', '0');
      meter.setAttribute('aria-valuemax', '8');
      meter.setAttribute('aria-valuenow', String(Math.min(8, ms / HOUR)));
      meter.setAttribute('aria-valuetext', `${hours(ms)} continuous rest, eight-hour reference; check HOS clocks for availability`);
    }
    meter.style.setProperty('--scheduler-rest', `${ms == null ? 0 : share(ms, REST)}%`);
    meter.title = ms == null ? 'Rest duration unknown' : `Rest ${hours(ms)} / 8:00 reference`;
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
      next?.stop?.key, next?.at, next?.arrival, next?.late, said.warnings.map(w => w.detail), said.phase,
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
       The bars take the worst warning's colour; driver rest is shown on each driver. A red
       warning's bars blink for the first minute this page has seen it,
       `data-alarm`. */
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
      crewOn(item, bus?.drivers.find(d => d.driver_id && d.driver_id === id) ?? null, away && away.driver === id ? away : null);
    }
    wheelOn(bar, bus, named);
    if (crewBox) fitCrew(crewBox);
    liveDot(bar, bus, worst);
    times(bar, bus, next, said, worst, live.at);
  }

  /* A driver at the wheel the bar does not name, a seat at the drivers
     row's end. */
  function wheelOn(bar, bus, named) {
    const row = bar.querySelector(':scope > .scheduler-bar__drivers');
    row?.querySelector(':scope > .scheduler-road__who')?.remove();
    const wheel = bus?.drivers.find(d => d.wheel) ?? null;
    if (!row || !wheel || named.has(wheel.driver_id)) return;
    const who = el('span', 'scheduler-road__who scheduler-crew scheduler-crew--seat scheduler-crew--wheel');
    // Not sent's circle in the slot every driver has, so the name lines
    // up: this driver has no status on the trip to colour it.
    const mark = el('span', 'scheduler-crew__mark scheduler-crew__mark--off scheduler-crew__mark--dot');
    mark.appendChild(svgUse(NOT_SENT_ICON, '16', '0 0 32 32'));
    who.append(mark, el('span', 'scheduler-crew__name', short(wheel.name)));
    crewOn(who, wheel, null);
    who.title = `${wheel.name}, not on this trip\nSamsara: ${words(wheel)}`;
    row.appendChild(who);
  }

  // What the bar says of a problem: the worst warning's name, or No signal and how long.
  const sayOf = (bus, worst) => (worst ? worst.title : bus.engine == null ? (bus.seen ? `No signal ${ago(bus.seen)}` : 'No signal') : null);

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

  /* The bus icon marks a trip in progress through stops and rest breaks.
     The bus column shows what the bus is doing, so the icon says it only on
     its tooltip and label; alerts keep their own badge after it. A press
     opens the live card. */
  function liveDot(bar, bus, worst) {
    const row = bar.querySelector(':scope > .scheduler-bar__dest');
    let dot = row?.querySelector(':scope > .scheduler-road__dot');
    if (!bus || !row) {
      dot?.remove();
      return;
    }
    if (!dot) {
      dot = el('button', 'scheduler-road__dot');
      dot.type = 'button';
      dot.setAttribute('aria-expanded', 'false');
      dot.dataset.cardOpener = '';
      const icon = svgUse('#m-directions_bus-fill', '16', '0 0 16 16');
      icon.classList.add('scheduler-road__route');
      dot.appendChild(icon);
      row.insertBefore(dot, row.querySelector(':scope > .scheduler-bar__alert'));
    }
    const state = vehicleState(bus);
    const { word: status } = VEHICLE_STATES[state];
    const duration = (bus.engine === 'idle' || bus.engine === 'off') && bus.engine_at
      ? ` for ${ago(bus.engine_at)}` : '';
    const detail = state === 'unknown' && bus.seen ? ` · Last seen ${ago(bus.seen)} ago` : '';
    const label = `Trip in progress · ${status}${duration}${detail}${worst ? ` · ${worst.title}` : ''}`;
    dot.title = label;
    dot.setAttribute('aria-label', `${label}. Open tracking details`);
  }

  // When the leg is due back at the yard, as an instant.
  const plannedBack = bar => Number(bar.dataset.roadTo) - Road.MARGIN;
  // Whole minutes past the planned return, or 0.
  const overBy = (bar, now) => (bar.dataset.roadTo ? Math.max(0, Math.floor((now - plannedBack(bar)) / 60e3)) : 0);
  // "+45m" under a hundred minutes, then "+2h", so it fits the narrowest bar.
  const overWords = min => (min < 100 ? `+${min}m` : `+${Math.floor(min / 60)}h`);
  /* When the bus is now expected back: Geoapify's drive to the yard while
     the yard is its next stop, if that is more than LATE_MIN past the plan;
     else null. */
  const expectedBack = (bar, next) => (next?.stop?.type === 'return' && !next.at && next.arrival != null
    && next.arrival - plannedBack(bar) > Road.LATE_MIN * 60e3 ? next.arrival : null);

  /* THE TIMES ROW, in the contact row's place: when the leg left the yard
     and when it is due back, at either end of a track filled as far as the
     time between them has gone, with a dot at now. A bus running late back
     says so in amber: when it is now expected, in place of the planned
     return, while it is heading for the yard, or else, once the planned
     return has passed, how long it is over. A problem takes the row
     instead, its words in its colour. */
  function times(bar, bus, next, said, worst, at) {
    let row = bar.querySelector(':scope > .scheduler-road__times');
    if (!bus) { row?.remove(); return; }
    if (!row) {
      row = el('div', 'scheduler-bar__row scheduler-road__times');
      bar.insertBefore(row, bar.querySelector(':scope > .scheduler-bar__update') ?? bar.querySelector(':scope > .scheduler-bar__drivers'));
    }
    row.title = tipOf(bar, bus, next, said, at);
    const say = sayOf(bus, worst);
    if (say) { row.replaceChildren(el('span', `scheduler-road__say scheduler-road__say--${worst?.tone ?? 'quiet'}`, say)); return; }
    const clock = (at, cls = 'scheduler-road__when') => { const w = el('span', cls); w.append(clockEl(at)); return w; };
    const parts = [];
    if (bar.dataset.depart) parts.push(clock(bar.dataset.depart));
    if (bar.dataset.depart && bar.dataset.back) {
      const out = Number(bar.dataset.roadFrom) + Road.MARGIN;
      const back = plannedBack(bar);
      const done = back > out ? Math.min(1, Math.max(0, (Date.now() - out) / (back - out))) : 0;
      const track = el('span', 'scheduler-road__track');
      track.style.setProperty('--scheduler-done', `${Math.round(done * 1000) / 10}%`);
      parts.push(track);
    }
    const expected = bar.dataset.roadTo ? expectedBack(bar, next) : null;
    const over = overBy(bar, Date.now());
    if (expected != null) {
      const when = clock(hhmm(Road.clockOf(expected), true), 'scheduler-road__when scheduler-road__when--late');
      when.title = bar.dataset.back ? `Expected back ${hhmm(Road.clockOf(expected), true)}, planned ${bar.dataset.back}` : '';
      parts.push(when);
    } else if (bar.dataset.back) {
      parts.push(clock(bar.dataset.back));
      if (over > 0) parts.push(el('span', 'scheduler-road__over', overWords(over)));
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

  window.SchedulerRoadBar = { draw, HOUR, DUTY, REST, restElapsed, restMeter, VEHICLE_STATES, vehicleState, IDLE_MS, hours, mark, ago, short, words, restWords };
})();
