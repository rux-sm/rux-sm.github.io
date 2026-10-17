/* ==========================================================================
   Rux Scheduler — ROAD BAR, a bar while its bus is out on its trip
   --------------------------------------------------------------------------
   While a bus is out on its trip, its bar keeps its destination and
   customer, and the rows under them say what Samsara says, laid out for the
   narrowest bar, a one-day trip on the board's narrowest day.
   - The leg, in the contact row's place: when it left the yard, a line to
     when it is due back with each stop a dot and the bus a square on it,
     green, or amber while the bus will reach its next stop late.
   - The cluster, in the time and update rows' place: the dial, which is the
     bus, a ring of speed green to TOP_MPH with the speed in its middle, or
     Idle or Off and how long, Idle amber past IDLE_MS, or a grey dashed dial
     with no signal. Beside it the tank as a gauge, amber under a quarter,
     and one line: the worst of live-trip.js's warnings by name in red or
     amber, or No signal and how long, or Check engine in amber while the
     engine's warning lamp is on, or Engine OK.
   - The drivers row, a seat for each driver: the one at the wheel first and
     bold with no mark, since the dial says the bus moves, anyone else with
     their duty's mark; under each name a bar of the driving hours left of
     ten, amber under one. A driver Samsara has in another bus is the red
     error mark, their name red with that bus after it. A driver at the
     wheel the bar does not name joins the end of the row.
   The bar has no coloured edge or border: a problem is its words and the
   light the bar casts, in the worst warning's colour. The view's toggles
   take the leg off with the contact row and the cluster down to one line,
   then none, with the time and update rows.

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
  // The speed a full ring stands for.
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
  /* One driver's seat on the drivers row: their name, a bar under it of the
     driving hours they have left of ten, amber under one, and those hours,
     which app.css shows for a driver alone or under one. The one at the
     wheel goes first, bold and with no mark, since the dial says the bus is
     moving; anyone else wears their duty's mark. A driver Samsara has in
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
    /* THE BAR'S LIGHT, which app.css draws from `data-light`: run while the
       bus moves, its flame as long as it is fast; idle with the engine
       running and the bus still; rest while a driver is in the sleeper and
       none drives; off with the engine off; scan with no signal. The light's
       hue is named by an edge element app.css does not draw: the worst
       warning's colour, else purple at rest, grey with no signal, green. A red warning blinks for the first minute this page has
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
    const away = said?.warnings.find(w => w.kind === 'wrongBus') ?? null;
    for (const item of crew) {
      const id = item.dataset.driverId;
      crewOn(item, bus?.drivers.find(d => d.driver_id && d.driver_id === id) ?? null, away && away.driver === id ? away : null);
    }
    wheelOn(bar, bus, named);
    if (crewBox) fitCrew(crewBox);
    leg(bar, bus, next, bar.dataset.light === 'run');
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

  // A ring of the dial: 270 degrees open at the bottom, filled to `share` of 100.
  const SVG = 'http://www.w3.org/2000/svg';
  const arc = (r, share, cls) => {
    const at = deg => [22 + r * Math.cos(deg * Math.PI / 180), 22 + r * Math.sin(deg * Math.PI / 180)].map(n => n.toFixed(2)).join(' ');
    const path = document.createElementNS(SVG, 'path');
    path.setAttribute('d', `M${at(135)} A${r} ${r} 0 1 1 ${at(45)}`);
    path.setAttribute('pathLength', '100');
    path.setAttribute('class', cls);
    // A dash of nothing still draws its round cap, so an empty ring is hidden.
    if (share != null) path.setAttribute('stroke-dasharray', `${Math.round(Math.max(0, Math.min(100, share)))} 100`);
    if (share != null && share <= 0) path.setAttribute('visibility', 'hidden');
    return path;
  };

  /* The dial is the bus: a ring of speed, green to TOP_MPH, and in the middle
     the speed, or Idle or Off and how long, or a dash with no signal. */
  function dial(bus) {
    const box = el('span', 'scheduler-road__dial');
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('viewBox', '0 0 44 44');
    svg.setAttribute('aria-hidden', 'true');
    svg.append(arc(19, null, 'scheduler-road__ring'),
      arc(19, bus.engine === 'on' ? (bus.mph ?? 0) / TOP_MPH * 100 : 0, 'scheduler-road__ring scheduler-road__ring--speed'));
    const big = el('span', 'scheduler-road__big'), small = el('span', 'scheduler-road__small');
    if (bus.engine == null) { box.classList.add('scheduler-road__dial--scan'); big.textContent = '–'; }
    else if (bus.engine === 'idle' || bus.engine === 'off') {
      big.textContent = bus.engine === 'idle' ? 'Idle' : 'Off';
      if (bus.engine_at) small.textContent = ago(bus.engine_at);
      box.classList.add('scheduler-road__dial--still');
      if (bus.engine === 'idle' && bus.engine_at && Date.now() - Date.parse(bus.engine_at) >= IDLE_MS) box.classList.add('scheduler-road__dial--long');
    } else {
      big.textContent = bus.mph != null ? String(bus.mph) : '–';
      small.textContent = 'mph';
    }
    const read = el('span', 'scheduler-road__read');
    read.append(big, small);
    box.append(svg, read);
    return box;
  }

  // How far through the leg an instant is, 0 to 1, from yard-out to yard-back.
  const shareOf = (bar, ms) => {
    const from = Number(bar.dataset.roadFrom) + Road.MARGIN, to = Number(bar.dataset.roadTo) - Road.MARGIN;
    return to > from ? Math.min(1, Math.max(0, (ms - from) / (to - from))) : 0;
  };

  /* THE LEG on the row under the customer: when it left the yard, a line from
     yard-out to yard-back with each stop a dot, filled once reached, and the
     bus a square on it, and when it is due back. The line is green, amber
     while the bus will reach its next stop late. The bus is drawn at now
     along the leg, kept between the last stop reached and the next. */
  function leg(bar, bus, next, moving) {
    let row = bar.querySelector(':scope > .scheduler-road__leg');
    if (!bus) { row?.remove(); return; }
    if (!row) {
      row = el('div', 'scheduler-bar__row scheduler-road__leg');
      bar.insertBefore(row, bar.querySelector(':scope > .scheduler-road__card') ?? bar.querySelector(':scope > .scheduler-bar__drivers'));
    }
    const line = el('span', `scheduler-road__rail${next?.late ? ' scheduler-road__rail--late' : ''}`);
    const stops = next?.stops ?? [];
    const reached = next?.where?.reached ?? -1;
    const at = stops.map(s => (s.due != null ? shareOf(bar, s.due) : null));
    for (const [i, x] of at.entries()) {
      if (x == null) continue;
      const dot = el('i', `scheduler-road__stop${i <= reached ? ' scheduler-road__stop--past' : ''}`);
      dot.style.setProperty('--scheduler-at', `${Math.round(x * 100)}%`);
      line.appendChild(dot);
    }
    let now = shareOf(bar, Date.now());
    const lo = at.slice(0, reached + 1).filter(x => x != null).at(-1) ?? 0;
    const hi = at.slice(reached + 1).find(x => x != null) ?? 1;
    now = Math.min(Math.max(now, lo), next?.at ? lo : hi);
    const busMark = el('em', `scheduler-road__bus${bus.engine == null ? ' scheduler-road__bus--scan' : moving ? '' : ' scheduler-road__bus--still'}`);
    line.style.setProperty('--scheduler-done', `${Math.round(now * 100)}%`);
    line.appendChild(busMark);
    const out = el('span', 'scheduler-road__out'), back = el('span', 'scheduler-road__back');
    if (bar.dataset.depart) out.append(clockEl(bar.dataset.depart));
    if (bar.dataset.back) back.append(clockEl(bar.dataset.back));
    row.replaceChildren(out, line, back);
  }

  /* THE CLUSTER in place of the time and update rows: the dial, and beside it
     the tank as a gauge and one line, the worst warning's name in its
     colour, or No signal and how long, or the engine: Check engine in amber
     for its warning lamp, else Engine OK. On a board with one row for it,
     the speed in words and the gauge. */
  function card(bar, bus, next, said, worst, at) {
    let box = bar.querySelector(':scope > .scheduler-road__card');
    if (!bus) { box?.remove(); return; }
    if (!box) {
      box = el('div', 'scheduler-road__card');
      bar.insertBefore(box, bar.querySelector(':scope > .scheduler-bar__drivers'));
    }
    box.className = 'scheduler-road__card';
    const tank = el('span', 'scheduler-road__line scheduler-road__tank');
    if (bus.fuel != null) tank.append(...gauge(bus.fuel));
    const say = el('span', 'scheduler-road__line scheduler-road__say');
    if (worst) { say.classList.add(`scheduler-road__say--${worst.tone}`); say.textContent = worst.title; }
    else if (bus.engine == null) { say.classList.add('scheduler-road__say--quiet'); say.textContent = bus.seen ? `No signal ${ago(bus.seen)}` : 'No signal'; }
    else if (bus.fault === 'check') { say.classList.add('scheduler-road__say--warning'); say.textContent = 'Check engine'; }
    else { say.classList.add('scheduler-road__say--quiet'); say.textContent = 'Engine OK'; }
    // The speed in words, which app.css shows only where the dial has no room.
    const speed = el('span', 'scheduler-road__line scheduler-road__speed', bus.engine == null ? 'No signal' : bus.engine === 'idle' ? 'Idle'
      : bus.engine === 'off' ? 'Off' : bus.mph != null ? `${bus.mph} mph` : 'Running');
    box.replaceChildren(dial(bus), tank, say, speed);
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
    const legRow = bar.querySelector(':scope > .scheduler-road__leg');
    if (legRow) legRow.title = title;
  }

  // The tank as a gauge: the pump, a bar filled to the tank's share, and the percent; amber under a quarter.
  function gauge(fuel) {
    const low = fuel < LOW_FUEL;
    const icon = el('span', `scheduler-road__pump${low ? ' scheduler-road__pump--low' : ''}`);
    icon.appendChild(svgUse('#m-local_gas_station-fill', '16', '0 0 16 16'));
    const meter = el('span', `scheduler-road__meter${low ? ' scheduler-road__meter--low' : ''}`);
    meter.style.setProperty('--scheduler-fuel', `${fuel}%`);
    return [icon, meter, el('span', `scheduler-road__pct${low ? ' scheduler-road__pct--low' : ''}`, `${fuel}%`)];
  }

  window.SchedulerRoadBar = { draw, HOUR, DUTY, LOW_FUEL, IDLE_MS, hours, mark, ago, short, words };
})();
