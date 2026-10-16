/* ==========================================================================
   Rux Scheduler — ROAD BAR, a bar while its bus is out on its trip
   --------------------------------------------------------------------------
   While a bus is out on its trip, its bar wears a green edge down its start,
   and a card takes the place of its contact, time and update rows, saying
   what Samsara says. It is laid out for the narrowest bar, a one-day trip
   on the board's narrowest day.
   - The dial: an outer ring of speed, green to 80 mph, with the speed in
     its middle; an inner ring of fuel in the bar's ink, amber under a
     quarter. Idling or off, the middle says Idle or Off and how long, Idle
     amber past IDLE_MS. With no signal the dial is grey and dashed.
   - Three lines beside it: where the bus goes next in bold, when it gets
     there with the minutes late in amber, and a fuel pump and the tank's
     percent, or No signal and how long. At a stop they say At it and the
     stop after; past the last stop, To the yard and when it is due back.
   - The worst of live-trip.js's warnings takes the three lines instead:
     its name in red or amber, then its few words split in two. The card
     gets a border in its colour, and the edge does too.
   The card is as many rows as the view leaves among contact, time and
   update: three draw all of it, two drop the dial for two lines of words,
   one keeps only the first line. app.css does that from the view's classes.
   An engine's amber warning lamp sits at the destination row's end with what
   its codes say on its tooltip. Each driver in the drivers row wears their
   duty in place of their dot, ringed by the driving hours they have left of
   ten, the ring amber under one hour with the hours after the name; the one
   at the wheel is bold, and a driver Samsara has in another bus is the red
   error mark, their name red with the bus after it. A driver at the wheel
   the bar does not name joins the end of the row.

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
  // One driver's duty on their name: the mark ringed by the hours left, bold
  // at the wheel, the hours after the name under one, and the hours on the
  // tooltip; logged into another bus, the red error mark and that bus after
  // the name; with no driver, the name as the bar drew it.
  function crewOn(item, d, elsewhere) {
    item.querySelector(':scope > .scheduler-crew__duty')?.remove();
    item.querySelector(':scope > .scheduler-crew__hours')?.remove();
    item.querySelector(':scope > .scheduler-crew__away')?.remove();
    item.classList.remove('scheduler-crew--wheel', 'scheduler-crew--away');
    delete item.dataset.duty;
    if (item.dataset.baseTitle != null) { item.title = item.dataset.baseTitle; delete item.dataset.baseTitle; }
    if (elsewhere) {
      item.dataset.baseTitle = item.title;
      const m = el('span', 'scheduler-crew__duty scheduler-crew__duty--away');
      m.appendChild(svgUse('#m-error-fill', '16', '0 0 16 16'));
      item.prepend(m);
      item.dataset.duty = 'away';
      item.classList.add('scheduler-crew--away');
      item.appendChild(el('span', 'scheduler-crew__away', `in ${elsewhere.bus}`));
      item.title = `${item.title}\nSamsara: ${elsewhere.sentence}`;
      return;
    }
    if (!d) return;
    item.dataset.baseTitle = item.title;
    if (d.duty) { item.prepend(mark(d.duty, d.left_ms)); item.dataset.duty = d.duty; }
    item.classList.toggle('scheduler-crew--wheel', d.wheel);
    if (d.left_ms != null && d.left_ms < HOUR) item.appendChild(hoursEl(d.left_ms));
    item.title = `${item.title}\nSamsara: ${words(d)}`;
  }

  /* The engine's amber warning lamp at the destination row's end, with what
     its codes say; the red stop lamp is live-trip.js's warning instead. */
  function lamp(bar, bus) {
    const row = bar.querySelector(':scope > .scheduler-bar__dest');
    row?.querySelector(':scope > .scheduler-road__lamp')?.remove();
    if (!row || !bus?.fault || bus.fault === 'stop') return;
    const it = el('span', `scheduler-road__lamp scheduler-road__lamp--${bus.fault}`);
    it.appendChild(svgUse('#m-car_repair-fill', '16', '0 0 16 16'));
    const said = ['Engine warning lamp on', ...(bus.faults ?? [])];
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
    lamp(bar, bus);
    const away = said?.warnings.find(w => w.kind === 'wrongBus') ?? null;
    for (const item of crew) {
      const id = item.dataset.driverId;
      crewOn(item, bus?.drivers.find(d => d.driver_id && d.driver_id === id) ?? null, away && away.driver === id ? away : null);
    }
    wheelOn(bar, bus, named);
    if (crewBox) fitCrew(crewBox);
    card(bar, bus, next, said, worst, live.at);
  }

  /* A driver at the wheel the bar does not name, at the drivers row's end
     with their duty ring and the hours under one. */
  function wheelOn(bar, bus, named) {
    const row = bar.querySelector(':scope > .scheduler-bar__drivers');
    row?.querySelector(':scope > .scheduler-road__who')?.remove();
    const wheel = bus?.drivers.find(d => d.wheel) ?? null;
    if (!row || !wheel || named.has(wheel.driver_id)) return;
    const who = el('span', 'scheduler-road__who scheduler-crew scheduler-crew--wheel');
    who.append(mark(wheel.duty ?? 'driving', wheel.left_ms), el('span', 'scheduler-crew__name', short(wheel.name)));
    if (wheel.left_ms != null && wheel.left_ms < HOUR) who.appendChild(hoursEl(wheel.left_ms));
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

  /* The dial: speed outside, fuel inside, and in the middle the speed, or
     Idle or Off with how long, or a dash with no signal. */
  function dial(bus) {
    const box = el('span', 'scheduler-road__dial');
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('viewBox', '0 0 44 44');
    svg.setAttribute('aria-hidden', 'true');
    const low = bus.fuel != null && bus.fuel < LOW_FUEL;
    svg.append(arc(20, null, 'scheduler-road__ring'),
      arc(20, bus.engine === 'on' ? (bus.mph ?? 0) / TOP_MPH * 100 : 0, 'scheduler-road__ring scheduler-road__ring--speed'),
      arc(15, null, 'scheduler-road__ring scheduler-road__ring--track'),
      arc(15, bus.fuel ?? 0, `scheduler-road__ring scheduler-road__ring--fuel${low ? ' scheduler-road__ring--low' : ''}`));
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

  // A stop's name as the card says it: the yard by that word.
  const placeOf = stop => (stop.type === 'return' ? 'the yard' : stop.name || 'the next stop');
  const clockOf = ms => clockEl(hhmm(Road.clockOf(ms), true));

  /* THE CARD in place of the contact, time and update rows: the dial, three
     lines and, on a board with two rows for it, the speed in words. */
  function card(bar, bus, next, said, worst, at) {
    let box = bar.querySelector(':scope > .scheduler-road__card');
    if (!bus) { box?.remove(); return; }
    if (!box) {
      box = el('div', 'scheduler-road__card');
      bar.insertBefore(box, bar.querySelector(':scope > .scheduler-bar__drivers'));
    }
    box.className = `scheduler-road__card${worst ? ` scheduler-road__card--${worst.tone}` : ''}`;
    const line = cls => el('span', `scheduler-road__line ${cls}`);
    const first = line('scheduler-road__next'), second = line('scheduler-road__when'), third = line('scheduler-road__tank');
    const fourth = line('scheduler-road__speed');
    if (worst) {
      first.classList.add(`scheduler-road__next--${worst.tone}`);
      first.textContent = worst.title;
      const [one, ...rest] = String(worst.detail ?? '').split(' · ');
      second.textContent = one;
      if (rest.length) third.textContent = rest.join(' · ');
    } else if (next?.at && next.stop) {
      first.textContent = `At ${placeOf(next.stop)}`;
      const after = next.stops?.[next.where?.next];
      if (after) second.textContent = `Then ${placeOf(after)}`;
    } else if (next?.stop) {
      first.textContent = next.stop.type === 'return' ? 'To the yard' : next.stop.name;
      const when = next.arrival ?? next.stop.due;
      if (when != null) second.append(clockOf(when));
      if (next.late) second.appendChild(el('span', 'scheduler-road__late', `+${next.late}m`));
    } else {
      first.textContent = 'To the yard';
      if (bar.dataset.back) second.append(clockEl(bar.dataset.back));
    }
    // The tank, unless a warning's words took the line; with no signal, how long since.
    if (!third.childNodes.length) {
      if (bus.engine == null) third.append(el('span', 'scheduler-road__quiet', bus.seen ? `No signal ${ago(bus.seen)}` : 'No signal'));
      else if (bus.fuel != null) third.append(...pump(bus.fuel));
    }
    // The speed in words, which app.css shows only where the dial has no room.
    fourth.textContent = bus.engine == null ? 'No signal' : bus.engine === 'idle' ? 'Idle' : bus.engine === 'off' ? 'Off'
      : bus.mph != null ? `${bus.mph} mph` : 'Running';
    if (bus.fuel != null) fourth.append(' · ', ...pump(bus.fuel));
    box.replaceChildren(dial(bus), first, second, third, fourth);
    const arrives = next?.stop && !next.at && next.arrival != null
      ? `${next.stop.name}: arrives ${hhmm(Road.clockOf(next.arrival), true)}${next.stop.due != null ? `, due ${hhmm(Road.clockOf(next.stop.due), true)}` : ''}${next.late ? `, ${next.late} min late` : ''}` : null;
    // Every warning heads the tooltip, each in a sentence.
    box.title = [
      ...said.warnings.map(w => `${w.title}: ${w.sentence}`),
      [bus.engine === 'idle' ? 'Idling' : bus.engine === 'off' ? 'Engine off' : bus.engine == null ? 'No engine reading'
        : bus.mph != null ? `${bus.mph} mph` : 'Engine on', bus.place].filter(Boolean).join(' · '),
      bus.fuel != null ? `Fuel ${bus.fuel}%` : null,
      next?.at ? `At ${next.stop.name}` : arrives,
      bar.dataset.depart || bar.dataset.back ? [bar.dataset.depart && `Out ${bar.dataset.depart}`, bar.dataset.back && `back ${bar.dataset.back}`].filter(Boolean).join(' · ') : null,
      ...bus.drivers.map(d => `${d.name}: ${words(d)}`),
      at ? `Samsara, ${new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : null,
    ].filter(Boolean).join('\n');
  }

  // The fuel pump and the tank's percent, amber under a quarter.
  function pump(fuel) {
    const low = fuel < LOW_FUEL;
    const icon = el('span', `scheduler-road__pump${low ? ' scheduler-road__pump--low' : ''}`);
    icon.appendChild(svgUse('#m-local_gas_station-fill', '16', '0 0 16 16'));
    return [icon, el('span', `scheduler-road__pct${low ? ' scheduler-road__pct--low' : ''}`, `${fuel}%`)];
  }

  window.SchedulerRoadBar = { draw, HOUR, DUTY, LOW_FUEL, IDLE_MS, hours, mark, ago, short, words };
})();
