/* ==========================================================================
   Rux Scheduler — ROAD BAR, a bar while its bus is out on its trip
   --------------------------------------------------------------------------
   While a bus is out on its trip, its bar keeps its destination and
   customer, and the rows under them say what Samsara says, laid out for the
   narrowest bar, a one-day trip on the board's 10rem day, and kept to the
   first day on a longer bar.
   - The times, in the contact row's place: out, a dimmed arrow and back,
     and the minutes late to the next stop in amber; a problem's words in
     its colour instead, the worst of live-trip.js's warnings or No signal.
   - The instruments, in the time and update rows' place: one row, the
     speed with five rising bars in the bus's colour, a 1px rule, then the
     pump, a short tank bar and its percent; the second row's room is air
     round them and the drivers.
   - The drivers row, a seat for each driver: the one at the wheel first and
     bold with no mark, since the speed says the bus moves, their driving
     hours left at the seat's end over a 2px bar of them, amber under one;
     anyone else with their duty's mark, and their hours only under one. A
     driver Samsara has in another bus is the red error mark, their name red
     with that bus after it. A driver at the wheel the bar does not name
     joins the end of the row.
   The bar wears no edge, border or light of its own: how the bus is doing
   is the bars' colour and the words. With a row fewer on the board the
   times go, with two fewer the air goes too; app.css
   does that from the view's toggles.

   `draw(bar, bus, live)` draws it on a bar bar.js drew, or takes it off
   with no `bus`. `bus` is one bus of samsara-now's answer, and `live` what
   the board worked out around it: `next`, road.js's reading of where the
   bus is on its leg; `said`, live-trip.js's `{ warnings, phase }` for it;
   `at`, when Samsara answered; and `motion`, the view's Motion, since a
   bar starts as a bus does only at Full. data.js draws the board's out bars
   with it, and components.html its samples.

   `HOUR`, `DUTY`, `LOW_FUEL`, `IDLE_MS`, `hours(ms)`, `mark(duty, left)`,
   `ago(at)`, `short(name)` and `words(driver)` are the duty marks, clocks
   and words the live card draws as the bar does.
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
  const DUTY = {
    driving: { icon: '#m-search_hands_free-fill', word: 'Driving' },
    on: { icon: '#m-assignment-fill', word: 'On duty' },
    sleeper: { icon: '#m-bedtime-fill', word: 'Sleeper' },
    off: { icon: '#m-power_settings_new-fill', word: 'Off duty' },
  };
  // A passenger carrier's driver may drive ten hours, so a full ring is ten.
  const DRIVE = 10 * HOUR;
  const LOW_FUEL = 25;
  // Idling this long is worth a look; a normal wait at a pickup is shorter.
  const IDLE_MS = 30 * 60e3;
  // The speed every bar lit stands for.
  const TOP_MPH = 80;
  const hours = ms => `${Math.floor(ms / HOUR)}:${String(Math.floor((ms % HOUR) / 60e3)).padStart(2, '0')}`;
  const words = d => [DUTY[d.duty]?.word ?? 'Status unknown',
    d.left_ms != null ? `${hours(d.left_ms)} driving left` : null, d.wheel ? 'at the wheel' : null].filter(Boolean).join(' · ');
  const short = name => {
    const parts = String(name).trim().split(/\s+/);
    return parts.length > 1 ? `${parts[0]} ${parts.at(-1)[0]}.` : parts[0];
  };
  /* A duty's mark; given the hours left, ringed by them, the ring's share set
     as a custom property app.css draws. */
  const mark = (duty, left) => {
    const m = el('span', `scheduler-crew__duty scheduler-crew__duty--${duty}`);
    m.appendChild(svgUse(DUTY[duty].icon, '16', '0 0 16 16'));
    if (left != null) {
      m.classList.add('scheduler-crew__duty--ring');
      if (left < HOUR) m.classList.add('scheduler-crew__duty--low');
      m.style.setProperty('--scheduler-left', `${Math.round(Math.min(1, left / DRIVE) * 100)}%`);
    }
    return m;
  };
  // The hours a driver may still drive, amber under one.
  const hoursEl = ms => el('span', `scheduler-crew__hours${ms < HOUR ? ' scheduler-crew__hours--low' : ''}`, hours(ms));
  // How long since an instant, "12m", "3h" or "2d".
  const ago = at => {
    const min = Math.max(0, Math.floor((Date.now() - Date.parse(at)) / 60e3));
    return min < 60 ? `${min}m` : min < 48 * 60 ? `${Math.floor(min / 60)}h` : `${Math.floor(min / 1440)}d`;
  };
  /* One driver's seat on the drivers row: their name, the driving hours they
     have left and a 2px bar under the seat of them, of ten, amber under one;
     app.css shows the hours and the bar for the one at the wheel, and the
     hours for anyone under one. The one at the wheel goes first, bold and
     with no mark, since the speed says the bus moves; anyone else wears
     their duty's mark. A driver Samsara has in
     another bus is the red error mark and their name in red with that bus
     after it. With no driver, the name as the bar drew it. */
  function crewOn(item, d, elsewhere) {
    for (const part of ['duty', 'hours', 'away', 'left']) item.querySelector(`:scope > .scheduler-crew__${part}`)?.remove();
    item.classList.remove('scheduler-crew--wheel', 'scheduler-crew--away', 'scheduler-crew--seat');
    delete item.dataset.duty;
    if (item.dataset.baseTitle != null) { item.title = item.dataset.baseTitle; delete item.dataset.baseTitle; }
    if (elsewhere) {
      item.dataset.baseTitle = item.title;
      const m = el('span', 'scheduler-crew__duty scheduler-crew__duty--away');
      m.appendChild(svgUse('#m-error-fill', '16', '0 0 16 16'));
      item.prepend(m);
      item.dataset.duty = 'away';
      item.classList.add('scheduler-crew--away', 'scheduler-crew--seat');
      item.append(el('span', 'scheduler-crew__away', `in ${elsewhere.bus}`), leftBar(null, true));
      item.title = `${item.title}\nSamsara: ${elsewhere.sentence}`;
      return;
    }
    if (!d) return;
    item.dataset.baseTitle = item.title;
    item.classList.add('scheduler-crew--seat');
    if (d.duty) item.dataset.duty = d.duty;
    if (d.duty && d.duty !== 'driving') item.prepend(mark(d.duty));
    item.classList.toggle('scheduler-crew--wheel', d.wheel);
    if (d.left_ms != null) item.append(hoursEl(d.left_ms), leftBar(d.left_ms));
    item.title = `${item.title}\nSamsara: ${words(d)}`;
  }
  // The bar of driving hours left under a seat; red and full for the wrong bus.
  function leftBar(ms, away) {
    const b = el('span', `scheduler-crew__left${away ? ' scheduler-crew__left--away' : ms < HOUR ? ' scheduler-crew__left--low' : ''}`);
    b.style.setProperty('--scheduler-left', `${away ? 100 : Math.round(Math.min(1, ms / DRIVE) * 100)}%`);
    return b;
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
    const key = `${bar.dataset.tripId}:${bar.dataset.leg}:${bar.dataset.busId}`;
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
      bus.fuel, bus.fault, bus.faults, bus.seen && ago(bus.seen), bus.drivers,
      next?.stop?.key, next?.at, next?.arrival, next?.late, said.warnings.map(w => w.detail), said.phase]) : '';
    if ((bar.dataset.road ?? '') === key) return;
    if (key) bar.dataset.road = key; else delete bar.dataset.road;
    bar.classList.toggle('scheduler-bar--road', !!bus);
    const worst = said?.warnings[0] ?? null;
    /* THE BUS'S STATE, `data-light`: run while it moves, idle with the
       engine running and the bus still, rest while a driver is in the
       sleeper and none drives, off with the engine off, scan with no signal.
       The bars take the worst warning's colour, else purple at rest. A red
       warning's bars blink for the first minute this page has seen it,
       `data-alarm`. */
    if (bus && !bar.dataset.light) start(bar, bus, live.motion ?? 'full');
    if (!bus) {
      delete bar.dataset.light;
      bar.removeAttribute('data-alarm');
    } else {
      const moving = bus.engine === 'on' && bus.mph > 0;
      const resting = !moving && bus.drivers.some(d => d.duty === 'sleeper') && !bus.drivers.some(d => d.duty === 'driving');
      bar.dataset.light = bus.engine == null ? 'scan' : moving ? 'run' : resting ? 'rest' : bus.engine === 'off' ? 'off' : 'idle';
      const alarm = worst?.tone === 'error' ? `${bar.dataset.tripId}|${bar.dataset.leg}|${bar.dataset.assignmentId}|${worst.kind}` : null;
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
    times(bar, bus, next, worst);
    card(bar, bus, next, said, worst, live.at);
  }

  /* A driver at the wheel the bar does not name, a seat at the drivers
     row's end. */
  function wheelOn(bar, bus, named) {
    const row = bar.querySelector(':scope > .scheduler-bar__drivers');
    row?.querySelector(':scope > .scheduler-road__who')?.remove();
    const wheel = bus?.drivers.find(d => d.wheel) ?? null;
    if (!row || !wheel || named.has(wheel.driver_id)) return;
    const who = el('span', 'scheduler-road__who scheduler-crew scheduler-crew--seat scheduler-crew--wheel');
    who.appendChild(el('span', 'scheduler-crew__name', short(wheel.name)));
    if (wheel.left_ms != null) who.append(hoursEl(wheel.left_ms), leftBar(wheel.left_ms));
    who.title = `${wheel.name}, not on this trip\nSamsara: ${words(wheel)}`;
    row.appendChild(who);
  }

  // The speed's bars, rising like a phone's signal: one lit for every BAR_MPH, BARS in all.
  const BARS = 5;
  const BAR_MPH = TOP_MPH / BARS;

  // What the bar says of a problem: the worst warning's name, or No signal and how long.
  const sayOf = (bus, worst) => (worst ? worst.title : bus.engine == null ? (bus.seen ? `No signal ${ago(bus.seen)}` : 'No signal') : null);

  /* THE TIMES ROW, in the contact row's place: when the leg left the yard,
     a dimmed arrow, and when it is due back, then how late the bus will be
     at its next stop, in amber. A problem takes the row instead, its words
     in its colour. */
  function times(bar, bus, next, worst) {
    let row = bar.querySelector(':scope > .scheduler-road__times');
    if (!bus) { row?.remove(); return; }
    if (!row) {
      row = el('div', 'scheduler-bar__row scheduler-road__times');
      bar.insertBefore(row, bar.querySelector(':scope > .scheduler-road__card') ?? bar.querySelector(':scope > .scheduler-bar__drivers'));
    }
    const say = sayOf(bus, worst);
    if (say) { row.replaceChildren(el('span', `scheduler-road__say scheduler-road__say--${worst?.tone ?? 'quiet'}`, say)); return; }
    const when = el('span', 'scheduler-road__when');
    if (bar.dataset.depart) when.append(clockEl(bar.dataset.depart));
    if (bar.dataset.depart && bar.dataset.back) when.appendChild(el('span', 'scheduler-road__arrow', '→'));
    if (bar.dataset.back) when.append(clockEl(bar.dataset.back));
    row.replaceChildren(when);
    if (next?.late) row.appendChild(el('span', 'scheduler-road__late', `+${next.late}m`));
  }

  /* THE INSTRUMENTS in place of the time and update rows, one 16px row in
     two whole-pixel halves either side of a 1px rule, with the room the
     second row leaves as air round them and the drivers. On the left the
     speed, or Idle or Off and how long, Idle amber past IDLE_MS, or a dash
     and how long since the last signal, then BARS bars rising like a
     phone's signal, one lit for every BAR_MPH: green on the road, the worst
     warning's amber or red, purple while a driver rests. On the right the
     pump, a short bar filled to the tank's share and the percent, amber
     under a quarter. With the times row hidden, a problem's words take the
     speed's half. An engine warning lamp is said on the tooltip and the live
     card only, since one can stay lit for days; the red stop lamp is a
     warning. */
  function card(bar, bus, next, said, worst, at) {
    let box = bar.querySelector(':scope > .scheduler-road__card');
    if (!bus) { box?.remove(); return; }
    if (!box) {
      box = el('div', 'scheduler-road__card');
      bar.insertBefore(box, bar.querySelector(':scope > .scheduler-bar__drivers'));
    }
    const say = sayOf(bus, worst);
    const tone = worst?.tone ?? (bus.engine == null ? 'scan' : bar.dataset.light === 'rest' ? 'rest' : null);
    box.className = `scheduler-road__card${tone ? ` scheduler-road__card--${tone}` : ''}${say ? ' scheduler-road__card--says' : ''}`;
    const moving = bus.engine === 'on';
    const long = bus.engine === 'idle' && bus.engine_at && Date.now() - Date.parse(bus.engine_at) >= IDLE_MS;
    const half = el('span', 'scheduler-road__half scheduler-road__half--speed');
    const speed = el('span', `scheduler-road__speed${moving ? '' : ' scheduler-road__speed--still'}${long ? ' scheduler-road__speed--long' : ''}`);
    speed.append(el('span', 'scheduler-road__big', bus.engine == null ? '–' : moving ? (bus.mph != null ? String(bus.mph) : '–')
      : bus.engine === 'idle' ? 'Idle' : 'Off'));
    const unit = bus.engine == null ? (bus.seen ? ago(bus.seen) : '') : moving ? 'mph' : bus.engine_at ? ago(bus.engine_at) : '';
    if (unit) speed.appendChild(el('span', 'scheduler-road__unit', unit));
    const bars = el('span', 'scheduler-road__bars');
    const lit = moving ? Math.min(BARS, Math.round((bus.mph ?? 0) / BAR_MPH)) : 0;
    for (let i = 0; i < BARS; i++) bars.appendChild(el('i', i < lit ? 'scheduler-road__bar--on' : null));
    half.append(speed, bars);
    if (say) half.appendChild(el('span', `scheduler-road__say scheduler-road__say--${worst?.tone ?? 'quiet'}`, say));
    const tank = el('span', 'scheduler-road__half scheduler-road__half--tank');
    tank.append(...gauge(bus.fuel));
    box.replaceChildren(half, el('span', 'scheduler-road__rule'), tank);
    const arrives = next?.stop && !next.at && next.arrival != null
      ? `${next.stop.name}: arrives ${hhmm(Road.clockOf(next.arrival), true)}${next.stop.due != null ? `, due ${hhmm(Road.clockOf(next.stop.due), true)}` : ''}${next.late ? `, ${next.late} min late` : ''}` : null;
    // Every warning heads the tooltip, each in a sentence.
    const title = [
      ...said.warnings.map(w => `${w.title}: ${w.sentence}`),
      bus.fault === 'check' ? ['Engine warning lamp on', ...(bus.faults ?? [])].join(' · ') : null,
      [bus.engine === 'idle' ? 'Idling' : bus.engine === 'off' ? 'Engine off' : bus.engine == null ? 'No engine reading'
        : bus.mph != null ? `${bus.mph} mph` : 'Engine on', bus.place].filter(Boolean).join(' · '),
      bus.fuel != null ? `Fuel ${bus.fuel}%` : null,
      next?.at ? `At ${next.stop.name}` : arrives,
      bar.dataset.depart || bar.dataset.back ? [bar.dataset.depart && `Out ${bar.dataset.depart}`, bar.dataset.back && `back ${bar.dataset.back}`].filter(Boolean).join(' · ') : null,
      ...bus.drivers.map(d => `${d.name}: ${words(d)}`),
      at ? `Samsara, ${new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : null,
    ].filter(Boolean).join('\n');
    box.title = title;
    const row = bar.querySelector(':scope > .scheduler-road__times');
    if (row) row.title = title;
  }

  /* The tank: the pump, a bar filled to the tank's share and the percent,
     amber under a quarter; empty with no reading. */
  function gauge(fuel) {
    const low = fuel != null && fuel < LOW_FUEL;
    const icon = el('span', `scheduler-road__pump${low ? ' scheduler-road__pump--low' : ''}`);
    icon.appendChild(svgUse('#m-local_gas_station-fill', '16', '0 0 16 16'));
    const meter = el('span', `scheduler-road__meter${low ? ' scheduler-road__meter--low' : ''}`);
    meter.style.setProperty('--scheduler-fuel', `${fuel ?? 0}%`);
    return [icon, meter, el('span', `scheduler-road__pct${low ? ' scheduler-road__pct--low' : ''}`, fuel != null ? `${fuel}%` : '–')];
  }

  window.SchedulerRoadBar = { draw, HOUR, DUTY, LOW_FUEL, IDLE_MS, hours, mark, ago, short, words };
})();
