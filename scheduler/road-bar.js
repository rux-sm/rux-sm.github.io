/* ==========================================================================
   Rux Scheduler — ROAD BAR, a bar while its bus is out on its trip
   --------------------------------------------------------------------------
   While a bus is out on its trip, its bar wears a green edge down its start,
   and three rows say what Samsara says. The time row is the leg's clock: the
   departure, a line that fills from yard-out to yard-back with the bus
   drawn at now, and the return, the line amber while the bus will reach its
   next stop late. The update's row gives way to the bus: first the worst of
   live-trip.js's warnings, its mark and name in red or amber and a few
   words, with the edge in its colour, or with none where the bus is on its
   leg; then at the row's end an arrow turned the way it heads and its
   speed, or Idle or Off with how long, or No signal with how long since
   Samsara last heard from it, and a fuel gauge and the tank's percent,
   amber under a quarter. An engine lamp sits at the
   destination row's end, red for the stop lamp and amber for a warning,
   with what its codes say on its tooltip. Each driver Samsara has in the bus
   wears their duty in place of their dot, ringed by the driving hours they
   have left of ten, the ring amber under one hour with the hours after the
   name; the one at the wheel is bold. The next stop and when the bus gets
   there are the trip's card's and the line's tooltip, road.js working them
   out. A driver at the wheel the bar does not name is named on the line
   before the speed.

   `draw(bar, bus, live)` draws it on a bar bar.js drew, or takes it off
   with no `bus`. `bus` is one bus of samsara-now's answer, and `live` what
   the board worked out around it: `next`, road.js's reading of where the
   bus is on its leg; `said`, live-trip.js's `{ warnings, phase }` for it;
   `at`, when Samsara answered; and `motion`, the view's Motion, since a
   bar starts as a bus does only at Full. data.js draws the board's out bars
   with it, and components.html its samples.

   `HOUR`, `DUTY`, `LOW_FUEL`, `hours(ms)`, `mark(duty, left)`, `ago(at)`,
   `short(name)` and `words(driver)` are the duty marks, clocks and words
   the live card draws as the bar does.
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
  // How far through the leg now is, 0 to 100, from yard-out to yard-back.
  const doneOf = bar => {
    const from = Number(bar.dataset.roadFrom) + Road.MARGIN, to = Number(bar.dataset.roadTo) - Road.MARGIN;
    return to > from ? Math.round(Math.min(1, Math.max(0, (Date.now() - from) / (to - from))) * 100) : 0;
  };

  // One driver's duty on their name: the mark ringed by the hours left, bold
  // at the wheel, the hours after the name under one, and the hours on the
  // tooltip; with no driver, the name as the bar drew it.
  function crewOn(item, d) {
    item.querySelector(':scope > .scheduler-crew__duty')?.remove();
    item.querySelector(':scope > .scheduler-crew__hours')?.remove();
    item.classList.remove('scheduler-crew--wheel');
    delete item.dataset.duty;
    if (item.dataset.baseTitle != null) { item.title = item.dataset.baseTitle; delete item.dataset.baseTitle; }
    if (!d) return;
    item.dataset.baseTitle = item.title;
    if (d.duty) { item.prepend(mark(d.duty, d.left_ms)); item.dataset.duty = d.duty; }
    item.classList.toggle('scheduler-crew--wheel', d.wheel);
    if (d.left_ms != null && d.left_ms < HOUR) item.appendChild(hoursEl(d.left_ms));
    item.title = `${item.title}\nSamsara: ${words(d)}`;
  }

  // The leg's clock on the time row: departure, the line with the bus at now, return.
  function times(bar, done, late) {
    const row = bar.querySelector(':scope > .scheduler-bar__time');
    if (!row) return;
    row.querySelector(':scope > .scheduler-road__times')?.remove();
    if (done == null) return;
    const dep = bar.dataset.depart, back = bar.dataset.back;
    const box = el('span', 'scheduler-road__times');
    const strip = el('span', `scheduler-road__strip${late ? ' scheduler-road__strip--late' : ''}`);
    strip.style.setProperty('--scheduler-done', `${done}%`);
    strip.append(el('span', 'scheduler-road__bus'));
    const depEl = el('span'), backEl = el('span');
    if (dep) depEl.append(clockEl(dep));
    if (back) backEl.append(clockEl(back));
    box.append(depEl, strip, backEl);
    row.appendChild(box);
  }

  // The engine's lamp at the destination row's end, with what its codes say.
  function lamp(bar, bus) {
    const row = bar.querySelector(':scope > .scheduler-bar__dest');
    row?.querySelector(':scope > .scheduler-road__lamp')?.remove();
    if (!row || !bus?.fault) return;
    const it = el('span', `scheduler-road__lamp scheduler-road__lamp--${bus.fault}`);
    it.appendChild(svgUse('#m-car_repair-fill', '16', '0 0 16 16'));
    const said = [bus.fault === 'stop' ? 'Engine stop lamp on' : 'Engine warning lamp on', ...(bus.faults ?? [])];
    it.title = said.join('\n');
    it.setAttribute('role', 'img');
    it.setAttribute('aria-label', said.join(' · '));
    row.insertBefore(it, row.children[1] ?? null);
  }

  /* A bar coming on the road starts as a bus does: with its engine running it
     shudders while the starter cranks and its edge flickers until the engine
     catches, app.css's scheduler-bar--starting; with the engine off or no
     signal its edge only fades in. Once per leg's bus a page load, so a board
     drawn again, a save or another week, brings the bar back lit and still. */
  const START_MS = 1200;
  const BRAKE_MS = 1600;
  const ARRIVING_MS = 5 * 60e3;
  const ALARM_MS = 60e3;
  const started = new Set();
  // Each bus's speed at the last answer, for the brake lights.
  const speeds = new Map();
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
    const done = bus ? doneOf(bar) : null;
    const crewBox = bar.querySelector(':scope > .scheduler-bar__drivers > .scheduler-bar__crew');
    const crew = crewBox ? [...crewBox.querySelectorAll(':scope > .scheduler-crew')] : [];
    const named = new Set(crew.map(c => c.dataset.driverId).filter(Boolean));
    const key = bus ? JSON.stringify([bus.engine, bus.engine_at && ago(bus.engine_at), bus.mph, bus.heading, bus.place,
      bus.fuel, bus.fault, bus.faults, bus.seen && ago(bus.seen), bus.drivers, done,
      next?.stop?.key, next?.at, next?.arrival, next?.late, said.warnings.map(w => w.detail), said.phase]) : '';
    if ((bar.dataset.road ?? '') === key) return;
    if (key) bar.dataset.road = key; else delete bar.dataset.road;
    bar.classList.toggle('scheduler-bar--road', !!bus);
    const worst = said?.warnings[0] ?? null;
    /* THE BAR'S LIGHT, which app.css draws from `data-light`: run while the
       bus moves, its flame as long as it is fast; idle with the engine
       running and the bus still; rest while a driver is in the sleeper and
       none drives; off with the engine off; scan with no signal. The edge
       takes the worst warning's colour, else purple at rest, grey with no
       signal, green. A red warning blinks for the first minute this page has
       seen it, `data-alarm`. A bus moving at the last answer and stopped now
       flashes its brake lights once, and one due at its next stop within
       five minutes shows its headlight. */
    let edge = bar.querySelector(':scope > .scheduler-road__edge');
    if (bus && !edge) {
      edge = el('span', 'scheduler-road__edge');
      bar.append(edge, el('span', 'scheduler-road__front'));
      start(bar, bus, live.motion ?? 'full');
    } else if (!bus) {
      edge?.remove();
      bar.querySelector(':scope > .scheduler-road__front')?.remove();
      edge = null;
      delete bar.dataset.light;
      bar.removeAttribute('data-arriving');
      bar.removeAttribute('data-alarm');
      bar.style.removeProperty('--scheduler-thrust');
    }
    if (bus) {
      const moving = bus.engine === 'on' && bus.mph > 0;
      const resting = !moving && bus.drivers.some(d => d.duty === 'sleeper') && !bus.drivers.some(d => d.duty === 'driving');
      const light = bus.engine == null ? 'scan' : moving ? 'run' : resting ? 'rest' : bus.engine === 'off' ? 'off' : 'idle';
      bar.dataset.light = light;
      edge.className = `scheduler-road__edge${worst ? ` scheduler-road__edge--${worst.tone}` : light === 'rest' || light === 'scan' ? ` scheduler-road__edge--${light}` : ''}`;
      bar.style.setProperty('--scheduler-thrust', `${Math.round(10 + Math.min(80, bus.mph ?? 0) * .22)}px`);
      const alarm = worst?.tone === 'error' ? `${bar.dataset.tripId}|${bar.dataset.leg}|${bar.dataset.assignmentId}|${worst.kind}` : null;
      if (alarm && !alarms.has(alarm)) alarms.set(alarm, Date.now());
      const blinkFor = alarm ? alarms.get(alarm) + ALARM_MS - Date.now() : 0;
      bar.toggleAttribute('data-alarm', blinkFor > 0);
      if (blinkFor > 0) setTimeout(() => bar.removeAttribute('data-alarm'), blinkFor);
      const was = speeds.get(bus.bus_id);
      speeds.set(bus.bus_id, bus.mph);
      if (was > 0 && bus.mph === 0) {
        bar.classList.add('scheduler-bar--braking');
        setTimeout(() => bar.classList.remove('scheduler-bar--braking'), BRAKE_MS);
      }
      const now = Date.now();
      bar.toggleAttribute('data-arriving', !!next?.stop && !next.at && next.arrival != null
        && next.arrival - now <= ARRIVING_MS && next.arrival >= now - 60e3);
    }
    times(bar, done, !!next?.late);
    lamp(bar, bus);
    const line = bar.querySelector(':scope > .scheduler-bar__road');
    for (const item of crew) crewOn(item, bus?.drivers.find(d => d.driver_id && d.driver_id === item.dataset.driverId) ?? null);
    if (crewBox) fitCrew(crewBox);
    if (!line) return;
    if (!bus) { line.replaceChildren(); line.removeAttribute('title'); return; }
    /* The line says one thing first: the worst warning, its mark, its name
       and its few words, or with none where the bus is on its leg. The
       gauges follow at the line's end. */
    const says = el('span', 'scheduler-road__says');
    if (worst) {
      says.classList.add(`scheduler-road__says--${worst.tone}`);
      says.append(svgUse(worst.tone === 'error' ? '#m-report-fill' : '#m-warning-fill', '16', '0 0 16 16'),
        el('span', 'scheduler-road__said', worst.title), el('span', 'scheduler-road__more', worst.detail));
    } else if (bar.dataset.light === 'rest') {
      says.classList.add('scheduler-road__says--rest');
      says.append(el('span', 'scheduler-road__said', 'Resting'));
      if (said.phase) says.appendChild(el('span', 'scheduler-road__more', said.phase.title));
    } else if (said.phase) {
      says.classList.add('scheduler-road__says--phase');
      says.append(el('span', 'scheduler-road__said', said.phase.title));
      if (said.phase.detail) says.appendChild(el('span', 'scheduler-road__more', said.phase.detail));
    }
    const gauges = el('span', 'scheduler-road__gauges');
    const wheel = bus.drivers.find(d => d.wheel) ?? null;
    if (wheel && !named.has(wheel.driver_id)) {
      gauges.appendChild(el('span', 'scheduler-road__who', short(wheel.name)));
      if (wheel.left_ms != null) gauges.appendChild(hoursEl(wheel.left_ms));
    }
    /* What the engine is doing: moving, the arrow the way it heads and the
       speed; idling or off, for how long; with no reading, how long since
       Samsara last heard from the bus. */
    if (bus.engine == null) gauges.appendChild(el('span', 'scheduler-road__state scheduler-road__state--quiet', bus.seen ? `No signal ${ago(bus.seen)}` : 'No signal'));
    else if (bus.engine === 'idle') gauges.appendChild(el('span', 'scheduler-road__state scheduler-road__state--idle', bus.engine_at ? `Idle ${ago(bus.engine_at)}` : 'Idle'));
    else if (bus.engine === 'off') gauges.appendChild(el('span', 'scheduler-road__state scheduler-road__state--quiet', bus.engine_at ? `Off ${ago(bus.engine_at)}` : 'Off'));
    else {
      if (bus.heading != null) {
        const arrow = el('span', 'scheduler-road__heading');
        arrow.style.setProperty('--scheduler-heading', `${bus.heading}deg`);
        arrow.appendChild(svgUse('#m-navigation-fill', '16', '0 0 16 16'));
        gauges.appendChild(arrow);
      }
      if (bus.mph != null) gauges.append(el('span', 'scheduler-road__speed', String(bus.mph)), el('span', 'scheduler-road__unit', 'mph'));
      else gauges.appendChild(el('span', 'scheduler-road__state', 'Running'));
    }
    // The tank: a gauge and its percent, amber under a quarter.
    if (bus.fuel != null) {
      const low = bus.fuel < LOW_FUEL;
      const gauge = el('span', `scheduler-road__fuel${low ? ' scheduler-road__fuel--low' : ''}`);
      gauge.style.setProperty('--scheduler-fuel', `${bus.fuel}%`);
      gauges.append(gauge, el('span', `scheduler-road__fuel-pct${low ? ' scheduler-road__fuel-pct--low' : ''}`, `${bus.fuel}%`));
    }
    line.replaceChildren(...[says, gauges].filter(x => x.childNodes.length));
    const arrives = next?.stop && !next.at && next.arrival != null
      ? `${next.stop.name}: arrives ${hhmm(Road.clockOf(next.arrival), true)}${next.stop.due != null ? `, due ${hhmm(Road.clockOf(next.stop.due), true)}` : ''}${next.late ? `, ${next.late} min late` : ''}` : null;
    // Every warning heads the tooltip, each in a sentence.
    line.title = [
      ...said.warnings.map(w => `${w.title}: ${w.sentence}`),
      [bus.engine === 'idle' ? 'Idling' : bus.engine === 'off' ? 'Engine off' : bus.engine == null ? 'No engine reading'
        : bus.mph != null ? `${bus.mph} mph` : 'Engine on', bus.place].filter(Boolean).join(' · '),
      bus.fuel != null ? `Fuel ${bus.fuel}%` : null,
      next?.at ? `At ${next.stop.name}` : arrives,
      ...bus.drivers.map(d => `${d.name}: ${words(d)}`),
      live.at ? `Samsara, ${new Date(live.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : null,
    ].filter(Boolean).join('\n');
  }

  window.SchedulerRoadBar = { draw, HOUR, DUTY, LOW_FUEL, hours, mark, ago, short, words };
})();
