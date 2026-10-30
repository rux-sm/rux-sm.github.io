/* ==========================================================================
   Rux Scheduler — BUS HEAD, what the bus column says of each bus
   --------------------------------------------------------------------------
   The head of a bus's row on the board keeps its number centred at its
   top; the type is the number's toggletip's to show. An engine lamp is the number's
   toggletip's alone, its line led by the lamp. Under them the head draws
   what belongs to the bus rather than a trip:
   - In the week that holds today, for a bus Samsara answers for, its
     state in a 38px display under the number, so the fuel under it stands
     at one height down the column. While the engine runs the display is
     filled: moving, the speed over mph on green, amber over SPEEDING;
     idling, Idle over how long on grey, amber past IDLE_MS. With the
     engine off it is the word alone, Off, with no fill or edge, and with no
     signal a dash over how long since the bus was seen, in a dashed edge.
     Under it
     the fuel: Carbon's 16px pump and its percent as a 12px figure with no
     sign, over a bar filled to it. DEF is drawn only
     while it is low, since a normal DEF needs nothing of the office, as a
     tag at the foot of the state's block, across the dial's open foot while
     moving, where it takes no height of its own. With no signal the dial and fuel fade. Where the bus
     is, and when it was last seen, are the number's toggletip's.
   - In any other week, or for a bus Samsara does not answer for: its
     inspection expiry, in the warning colour within WARN_DAYS. Its seats
     are the number's toggletip's.
   The fuel bar is a neutral grey while normal, so colour on the head is
   only ever a state: the warning colour when low and the error colour when
   critical, its percent and title saying it too.

   `draw(head, bus, live, opts)` draws it inside a head data.js made: `bus`
   is the bus's row, `live` its bus of samsara-now's answer or null, and
   `opts.week` true while the shown week holds today. `tipOf(bus, live)` is
   the lines the number's toggletip adds. data.js draws every head with it,
   and tools/check-bar.mjs checks each state.
   ========================================================================== */
(() => {
  'use strict';

  const SVG = 'http://www.w3.org/2000/svg';
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const svgEl = (tag, attrs) => {
    const n = document.createElementNS(SVG, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
    return n;
  };
  const svgUse = (href, size, box) => {
    const svg = svgEl('svg', { width: size, height: size, viewBox: box, fill: 'currentColor', 'aria-hidden': 'true' });
    svg.appendChild(svgEl('use', { href }));
    return svg;
  };

  // Each tank's low and critical marks, in percent.
  const FUEL = { low: 25, critical: 10, letter: 'F', word: 'Fuel' };
  const DEF = { low: 15, critical: 5, letter: 'D', word: 'DEF' };
  // The speed past which a moving bus turns amber.
  const SPEEDING = 75;
  const IDLE_MS = 30 * 60e3;
  // An expiry this close shows as a warning, as the Fleet page warns.
  const WARN_DAYS = 45;
  const DAY = 864e5;

  const levelOf = (pct, tank) => (pct == null ? null : pct <= tank.critical ? 'critical' : pct <= tank.low ? 'low' : 'normal');
  const ago = at => {
    const min = Math.max(0, Math.floor((Date.now() - Date.parse(at)) / 60e3));
    return min < 60 ? `${min}m` : min < 48 * 60 ? `${Math.floor(min / 60)}h` : `${Math.floor(min / 1440)}d`;
  };
  const idleFor = live => (live?.engine === 'idle' && live.engine_at ? Date.now() - Date.parse(live.engine_at) : 0);
  const noSignal = live => live && live.engine == null;
  const moving = live => live?.mph > 0;
  // The engine running, moving or not: what fills the state's display.
  const running = live => moving(live) || live?.engine === 'idle' || live?.engine === 'on';

  // What the bus is doing, as the dial says it; the place is the tip's next line.
  function stateOf(live) {
    if (noSignal(live)) return { engine: 'none', dial: '–', under: live.seen ? ago(live.seen) : null, tone: 'quiet', words: live.seen ? `No signal, last seen ${ago(live.seen)} ago` : 'No signal' };
    if (moving(live)) {
      const fast = live.mph > SPEEDING;
      return { engine: 'moving', dial: String(live.mph), tone: fast ? 'warning' : 'moving', words: `Moving, ${live.mph} mph${fast ? `, over ${SPEEDING}` : ''}` };
    }
    if (live.engine === 'idle' || live.engine === 'on') {
      const long = idleFor(live) > IDLE_MS;
      const span = live.engine_at ? ago(live.engine_at) : null;
      return { engine: 'idle', dial: 'Idle', under: span, tone: long ? 'warning' : 'quiet',
        words: `Idling${span ? ` ${span}` : ''}${long ? `, past ${IDLE_MS / 60e3} minutes` : ''}` };
    }
    return { engine: 'off', dial: 'Off', tone: 'quiet', words: 'Engine off' };
  }

  // The engine's lamp, which leads its line in the number's toggletip.
  const lampOf = live => (live?.fault === 'stop' ? { tone: 'error', icon: '#i-error--filled', word: 'Engine stop lamp on' }
    : live?.fault === 'check' ? { tone: 'warning', icon: '#i-warning--alt--filled', word: 'Engine warning lamp on' } : null);

  // The state's display: filled while the engine runs, in the state's tone,
  // the reading over its unit or how long; the word alone with it off.
  function dial(live, state) {
    const box = el('span', `scheduler-row-head__dial scheduler-row-head__dial--${state.tone}${running(live) ? ' scheduler-row-head__dial--running' : ''}`);
    box.setAttribute('role', 'img');
    box.setAttribute('aria-label', state.words);
    const figure = /^\d+$/.test(state.dial);
    const speed = el('span', figure ? 'scheduler-row-head__speed' : 'scheduler-row-head__speed scheduler-row-head__speed--word');
    speed.append(el('span', null, state.dial));
    const under = figure ? 'mph' : state.under;
    if (under) speed.appendChild(el('span', 'scheduler-row-head__under', under));
    box.appendChild(speed);
    return box;
  }

  // One tank. Fuel: a pump and its figure, over a bar filled to its share.
  // DEF, drawn only while low: its name and percent as a tag, no bar.
  function level(pct, tank) {
    const lv = levelOf(pct, tank);
    const g = el('span', 'scheduler-row-head__level');
    g.dataset.level = lv;
    g.dataset.tank = tank.letter;
    g.style.setProperty('--scheduler-tank', `${pct}%`);
    const words = `${tank.word} ${pct}%${lv === 'critical' ? ', critical' : lv === 'low' ? ', low' : ''}`;
    g.setAttribute('role', 'img');
    g.setAttribute('aria-label', words);
    const reading = el('span', 'scheduler-row-head__reading');
    if (tank === FUEL) reading.appendChild(svgUse('#i-gas-station', '16', '0 0 32 32'));
    else reading.appendChild(el('span', null, tank.word));
    // Fuel's figure stands beside its pump with no sign, the bar and the
    // pump saying what it counts, which leaves Carbon's 16px pump and 12px
    // figure room in the display's 40px; DEF's tag keeps its sign.
    reading.appendChild(el('span', 'scheduler-row-head__pct', tank === FUEL ? String(pct) : `${pct}%`));
    g.appendChild(reading);
    if (tank === FUEL) g.appendChild(el('span', 'scheduler-row-head__tank'));
    return g;
  }

  // The inspection's state, as the Fleet page words it.
  function inspection(bus) {
    const v = String(bus.inspection_exp ?? '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
    const [y, m, d] = v.split('-').map(Number);
    const when = new Date(y, m - 1, d);
    const now = new Date();
    const n = Math.round((when - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / DAY);
    const plural = k => `${k} day${k === 1 ? '' : 's'}`;
    return {
      // "Nov 18": the column has no room for a year, which the title gives.
      short: when.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      soon: n <= WARN_DAYS,
      words: n < 0 ? `Inspection expired ${plural(-n)} ago` : n === 0 ? 'Inspection expires today'
        : `Inspection expires ${n <= WARN_DAYS ? `in ${plural(n)}` : when.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`,
    };
  }

  function draw(head, bus, live, opts = {}) {
    const shown = opts.week && live ? live : null;
    const key = JSON.stringify(shown ? [shown.engine, shown.mph, shown.fuel, shown.def, shown.place, shown.fault,
      shown.seen && ago(shown.seen), shown.engine_at && ago(shown.engine_at)] : [bus.inspection_exp]);
    if (head.dataset.live === key) return;
    head.dataset.live = key;
    head.toggleAttribute('data-signal-lost', !!noSignal(shown));
    const top = head.querySelector('.scheduler-row-head__top');

    const lamp = lampOf(shown);

    const state = shown ? stateOf(shown) : null;
    // What the engine is doing, for a theme that quiets a bus at rest.
    if (state) head.dataset.engine = state.engine; else delete head.dataset.engine;
    const levels = shown ? [levelOf(shown.fuel, FUEL), levelOf(shown.def, DEF)] : [];

    // The one state dot the compact board draws: the worst tone the head shows.
    const tone = lamp?.tone === 'error' || levels.includes('critical') ? 'error'
      : lamp || state?.tone === 'warning' || levels.includes('low') ? 'warning'
      : state?.tone === 'quiet' && noSignal(shown) ? 'quiet' : shown ? 'normal' : null;
    top?.querySelector('.scheduler-row-head__dot')?.remove();
    if (tone && top) {
      const dot = el('span', 'scheduler-row-head__dot');
      dot.dataset.tone = tone;
      dot.setAttribute('aria-hidden', 'true');
      top.appendChild(dot);
    }

    head.querySelector('.scheduler-row-head__body')?.remove();
    const body = el('div', 'scheduler-row-head__body');
    if (shown) {
      body.classList.add('scheduler-row-head__body--live');
      const gauges = el('div', 'scheduler-row-head__gauges');
      gauges.appendChild(dial(shown, state));
      if (shown.fuel != null) gauges.appendChild(level(shown.fuel, FUEL));
      if (shown.def != null && levelOf(shown.def, DEF) !== 'normal') gauges.appendChild(level(shown.def, DEF));
      body.appendChild(gauges);
    } else {
      const insp = inspection(bus);
      if (insp) {
        const line = el('span', `scheduler-row-head__line scheduler-row-head__insp${insp.soon ? ' scheduler-row-head__insp--soon' : ''}`);
        line.append(el('span', null, 'Insp'), el('span', null, insp.short));
        line.setAttribute('aria-label', insp.words);
        body.appendChild(line);
      }
    }
    // Above the equipment at the foot, which data.js draws once.
    if (body.childElementCount) head.insertBefore(body, head.querySelector(':scope > .scheduler-row-head__equip'));

    if (opts.tip) {
      const lines = tipOf(bus, shown);
      let box = opts.tip.querySelector('.scheduler-bus-tip__live');
      if (!lines.length) box?.remove();
      else {
        if (!box) {
          box = el('div', 'scheduler-bus-tip__row scheduler-bus-tip__live');
          opts.tip.querySelector('.scheduler-bus-tip__head')?.after(box);
        }
        box.replaceChildren(...lines.map(l => el('div', null, l)));
        // The lamp's line is the last, and leads with the lamp in its tone.
        if (lamp) {
          const said = box.lastElementChild;
          said.className = `scheduler-bus-tip__lamp scheduler-bus-tip__lamp--${lamp.tone}`;
          said.prepend(svgUse(lamp.icon, '16', '0 0 32 32'));
        }
      }
    }
  }

  // The lines the number's toggletip adds while the bus is answered for.
  function tipOf(bus, live) {
    if (!live) {
      const insp = inspection(bus);
      return insp ? [insp.words] : [];
    }
    return [
      stateOf(live).words,
      live.place,
      [live.fuel != null ? `Fuel ${live.fuel}%` : null, live.def != null ? `DEF ${live.def}%` : null].filter(Boolean).join(' · ') || null,
      live.odometer != null ? `${live.odometer.toLocaleString()} mi` : null,
      live.seen ? `Last seen ${ago(live.seen)} ago` : null,
      live.fault ? [lampOf(live).word, ...(live.faults ?? [])].join(' · ') : null,
    ].filter(Boolean);
  }

  window.SchedulerBusHead = { draw, tipOf, stateOf, FUEL, DEF, SPEEDING, IDLE_MS, WARN_DAYS };
})();
