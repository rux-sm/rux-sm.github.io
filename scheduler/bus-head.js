/* ==========================================================================
   Rux Scheduler — BUS HEAD, what the bus column says of each bus
   --------------------------------------------------------------------------
   The head of a bus's row on the board keeps its number top left, then
   draws what belongs to the bus rather than to a trip:
   - Marks beside the number, only while they are true: no signal, the
     engine's lamp, speeding over SPEEDING mph, idling past IDLE_MS.
   - In the week that holds today, for a bus Samsara answers for: a fuel
     gauge and a DEF gauge side by side, each 3px wide and emptying
     downward, with a tick at its low mark, and under them the city. A bus
     that reports no DEF draws no D gauge. With no signal the gauges fade
     and the city line says how long ago the bus was seen.
   - In any other week, or for a bus Samsara does not answer for: its seats
     and its inspection expiry, in the warning colour within WARN_DAYS.
   A reading is grey while normal, the warning colour when low and the error
   colour when critical, and its letter, height and title say it too.

   `draw(head, bus, live, opts)` draws it inside a head data.js made: `bus`
   is the bus's row, `live` its bus of samsara-now's answer or null, and
   `opts.week` true while the shown week holds today. `tipOf(bus, live)` is
   the lines the number's toggletip adds. data.js draws every head with it,
   and tools/check-bar.mjs checks each state.
   ========================================================================== */
(() => {
  'use strict';

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

  // Each tank's low and critical marks, in percent.
  const FUEL = { low: 25, critical: 10, letter: 'F', word: 'Fuel' };
  const DEF = { low: 15, critical: 5, letter: 'D', word: 'DEF' };
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
  // The city of a Samsara address, "625 Gregsons Bend, San Marcos, TX, 78666": the part before the state.
  const cityOf = place => {
    const parts = String(place || '').split(',').map(p => p.trim()).filter(Boolean);
    const state = parts.findIndex(p => /^[A-Z]{2}$/.test(p));
    return state > 0 ? parts[state - 1] : parts[0] ?? null;
  };
  const idleFor = live => (live?.engine === 'idle' && live.engine_at ? Date.now() - Date.parse(live.engine_at) : 0);
  const noSignal = live => live && live.engine == null;

  // What is true of the bus now that the marks say, worst first.
  function marksOf(live) {
    if (!live) return [];
    const out = [];
    if (live.fault === 'stop') out.push({ kind: 'stop', tone: 'error', icon: '#i-error--filled', word: 'Engine stop lamp on' });
    if (noSignal(live)) out.push({ kind: 'signal', tone: 'quiet', icon: '#m-wifi-fill', box: '0 0 16 16', word: live.seen ? `No signal, last seen ${ago(live.seen)} ago` : 'No signal' });
    if (live.fault === 'check') out.push({ kind: 'lamp', tone: 'warning', icon: '#i-warning--alt--filled', word: 'Engine warning lamp on' });
    if (live.mph != null && live.mph > SPEEDING) out.push({ kind: 'speed', tone: 'warning', text: String(live.mph), word: `${live.mph} mph, over ${SPEEDING}` });
    if (idleFor(live) > IDLE_MS) out.push({ kind: 'idle', tone: 'warning', icon: '#i-time--filled', word: `Idling ${ago(live.engine_at)}` });
    return out;
  }

  // One tank: its 3px gauge filled to its share, a tick at its low mark, its letter under it.
  function gauge(pct, tank) {
    const level = levelOf(pct, tank);
    const g = el('span', 'scheduler-row-head__gauge');
    g.dataset.level = level;
    g.style.setProperty('--scheduler-tank', `${pct}%`);
    g.style.setProperty('--scheduler-tank-low', `${tank.low}%`);
    const words = `${tank.word} ${pct}%${level === 'critical' ? ', critical' : level === 'low' ? ', low' : ''}`;
    g.setAttribute('role', 'img');
    g.setAttribute('aria-label', words);
    g.title = words;
    g.append(el('span', 'scheduler-row-head__tank'), el('span', 'scheduler-row-head__letter', tank.letter));
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
      shown.seen && ago(shown.seen), idleFor(shown) > IDLE_MS && ago(shown.engine_at)] : [bus.capacity, bus.inspection_exp]);
    if (head.dataset.live === key) return;
    head.dataset.live = key;
    head.toggleAttribute('data-signal-lost', !!noSignal(shown));

    const marks = marksOf(shown);
    let markBox = head.querySelector('.scheduler-row-head__marks');
    if (!markBox) {
      markBox = el('span', 'scheduler-row-head__marks');
      head.querySelector('.scheduler-row-head__top')?.appendChild(markBox);
    }
    markBox.replaceChildren(...marks.map(m => {
      const s = el('span', `scheduler-row-head__mark scheduler-row-head__mark--${m.tone}`, m.text ?? null);
      s.setAttribute('role', 'img');
      s.setAttribute('aria-label', m.word);
      s.title = m.word;
      if (m.icon) s.appendChild(svgUse(m.icon, '16', m.box ?? '0 0 32 32'));
      return s;
    }));

    // The one state dot the compact board draws: the worst mark's or reading's tone.
    const levels = shown ? [levelOf(shown.fuel, FUEL), levelOf(shown.def, DEF)] : [];
    const tone = marks.some(m => m.tone === 'error') || levels.includes('critical') ? 'error'
      : marks.some(m => m.tone === 'warning') || levels.includes('low') ? 'warning'
      : noSignal(shown) ? 'quiet' : shown ? 'normal' : null;
    head.querySelector('.scheduler-row-head__dot')?.remove();
    if (tone) {
      const dot = el('span', 'scheduler-row-head__dot');
      dot.dataset.tone = tone;
      dot.setAttribute('aria-hidden', 'true');
      head.querySelector('.scheduler-row-head__top')?.appendChild(dot);
    }

    head.querySelector('.scheduler-row-head__body')?.remove();
    const body = el('div', 'scheduler-row-head__body');
    if (shown) {
      body.classList.add('scheduler-row-head__body--live');
      const tanks = el('div', 'scheduler-row-head__gauges');
      if (shown.fuel != null) tanks.appendChild(gauge(shown.fuel, FUEL));
      if (shown.def != null) tanks.appendChild(gauge(shown.def, DEF));
      if (tanks.childElementCount) body.appendChild(tanks);
      // Seen how long ago, beside the slashed signal mark; "ago" does not fit the column.
      const city = noSignal(shown) ? (shown.seen ? ago(shown.seen) : null) : cityOf(shown.place);
      if (city) {
        const line = el('span', 'scheduler-row-head__line', city);
        line.title = noSignal(shown) ? (shown.seen ? `Last seen ${ago(shown.seen)} ago` : 'No signal') : shown.place;
        body.appendChild(line);
      }
    } else {
      if (bus.capacity) body.appendChild(el('span', 'scheduler-row-head__line', `${bus.capacity} pax`));
      const insp = inspection(bus);
      if (insp) {
        const line = el('span', `scheduler-row-head__line scheduler-row-head__insp${insp.soon ? ' scheduler-row-head__insp--soon' : ''}`);
        line.append(el('span', null, 'Insp'), el('span', null, insp.short));
        line.title = insp.words;
        line.setAttribute('aria-label', insp.words);
        body.appendChild(line);
      }
    }
    if (body.childElementCount) head.appendChild(body);

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
      }
    }
  }

  // The lines the number's toggletip adds while the bus is answered for.
  function tipOf(bus, live) {
    if (!live) {
      const insp = inspection(bus);
      return insp ? [insp.words] : [];
    }
    const state = noSignal(live) ? 'No signal'
      : live.engine === 'idle' ? `Idling${live.engine_at ? ` ${ago(live.engine_at)}` : ''}`
      : live.engine === 'off' ? 'Engine off'
      : live.mph != null ? `${live.mph} mph` : 'Engine on';
    return [
      state,
      live.place,
      [live.fuel != null ? `Fuel ${live.fuel}%` : null, live.def != null ? `DEF ${live.def}%` : null].filter(Boolean).join(' · ') || null,
      live.odometer != null ? `${live.odometer.toLocaleString()} mi` : null,
      live.seen ? `Last seen ${ago(live.seen)} ago` : null,
      live.fault ? [live.fault === 'stop' ? 'Engine stop lamp on' : 'Engine warning lamp on', ...(live.faults ?? [])].join(' · ') : null,
    ].filter(Boolean);
  }

  window.SchedulerBusHead = { draw, tipOf, marksOf, cityOf, FUEL, DEF, SPEEDING, IDLE_MS, WARN_DAYS };
})();
