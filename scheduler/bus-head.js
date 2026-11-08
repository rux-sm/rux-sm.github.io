/* ==========================================================================
   Rux Scheduler — BUS HEAD, what the bus column says of each bus
   --------------------------------------------------------------------------
   The head of a bus's row on the board says what belongs to the bus rather
   than a trip, in a stack centred down it: the number at its top, the
   readings under it and the kit at its foot. On the Mac's board it is the
   bus's tile, app.css's, the bus's type beside the number and the state
   and fuel drawn large. What it draws:
   - For a bus Samsara answers for, in whatever week is shown, its
     state under the number: the speed over mph, green while moving,
     or Idle, Off or a dash over how long, amber past SPEEDING or IDLE_MS,
     beside it on one row; then its fuel. DEF is drawn only while it is
     low, since a normal DEF needs nothing of the office, on the row under
     the fuel. DEF is drawn only while it is low, since a normal DEF needs
     nothing of the office, under the fuel. With no signal the state and
     fuel fade. Where the bus is, when it was last seen and its inspection
     are the number's toggletip's.
   - For a bus Samsara does not answer for: its inspection expiry, in the
     warning colour within WARN_DAYS. Its seats are the number's
     toggletip's.
   - In the kit, with data.js's out-of-service mark, one mark for its
     papers, the insurance, registration and inspection, as the Fleet page
     compares them: amber while one expires within WARN_DAYS and red once
     one has expired, as a driver's head marks their licence and medical
     card; the engine's lamp, amber or red, whose codes lead their line
     in the tip; an inspection in Samsara that marked the bus unsafe,
     red, until a mechanic resolves it there; and maintenance Samsara counts
     overdue, amber, each item's words in the tip. The words of each are the number's toggletip's. The kit
     holds them worst first; the Mac's tile turns the bus's icon to its
     warning in the worst one's tone, and a phone's narrow column shows the
     papers' mark with the out-of-service mark.
   The fuel is a meter filled to the tank's share over its percent, grey
   until low, orange, or critical, red; on the Mac's tile the meter runs
   the square's width alone and the percent is the tip's. Until samsara-now first
   answers, every bus is drawn at rest, Off over an empty fuel meter and a
   dash for its percent, so the column has its shape while it loads.

   `draw(head, bus, live, opts)` draws it inside a head data.js made: `bus`
   is the bus's row and `live` its bus of samsara-now's answer or null, and
   `opts.waiting` says no answer has come yet; what
   the bus is doing now stands in every week. `tipOf(bus, live)` is
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
  // A bus before samsara-now answers: at rest, its fuel not yet read.
  const WAITING = { engine: 'off', mph: 0, fuel: null, waiting: true };

  const levelOf = (pct, tank) => (pct == null ? null : pct <= tank.critical ? 'critical' : pct <= tank.low ? 'low' : 'normal');
  const ago = at => {
    const min = Math.max(0, Math.floor((Date.now() - Date.parse(at)) / 60e3));
    return min < 60 ? `${min}m` : min < 48 * 60 ? `${Math.floor(min / 60)}h` : `${Math.floor(min / 1440)}d`;
  };
  // How long a standing bus has run its engine, whether Samsara calls the
  // state idle or on: the head shows the span either way, so it judges it either way.
  const idleFor = live => ((live?.engine === 'idle' || live?.engine === 'on') && live.engine_at ? Date.now() - Date.parse(live.engine_at) : 0);
  const noSignal = live => live && live.engine == null;
  const moving = live => live?.mph > 0;
  // The engine running, moving or not: what writes the state in the primary ink.
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
    const off = live.engine_at ? ago(live.engine_at) : null;
    return { engine: 'off', dial: 'Off', under: off, tone: 'quiet', words: `Engine off${off ? ` ${off}` : ''}` };
  }

  // The engine's lamp, which leads its line in the number's toggletip.
  /* The newest inspection in Samsara that marked the bus unsafe and is not
     yet resolved, as `{ tone, word }`, or null. */
  const KIND_WORD = { pre: 'pre-trip', post: 'post-trip', mechanic: "mechanic's" };
  function unsafeOf(live) {
    const i = (live?.inspections ?? []).find(x => x.status === 'unsafe');
    if (!i) return null;
    const when = new Date(i.at).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    const defects = i.defects ? `, ${i.defects} defect${i.defects === 1 ? '' : 's'}` : '';
    const kind = KIND_WORD[i.kind] ? `${KIND_WORD[i.kind]} ` : '';
    return { tone: 'error', word: `Unsafe on its ${kind}inspection, ${when}${defects}` };
  }
  // The maintenance Samsara counts overdue, as `{ tone, word }`, or null.
  function overdueOf(live) {
    const late = (live?.due ?? []).filter(d => d.status === 'overdue');
    return late.length ? { tone: 'warning', word: late.map(d => `${d.title}: ${d.words.toLowerCase()}`).join('. ') } : null;
  }
  const lampOf = live => (live?.fault === 'stop' ? { tone: 'error', icon: '#i-warning--filled', word: 'Engine stop lamp on' }
    : live?.fault === 'check' ? { tone: 'warning', icon: '#i-warning--alt--filled', word: 'Engine warning lamp on' } : null);

  // The state: its reading over its unit, mph or how long, or beside it on
  // one row, in the primary ink while the engine runs, green moving, amber
  // in the warning tone, quiet with the engine off or no signal.
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

  // The fuel: a meter filled to the tank's share over its percent, grey
  // until low or critical. The Mac's tile draws the meter alone across its
  // square and leaves the percent to the tip.
  function fuelReadout(pct) {
    const box = el('span', 'scheduler-row-head__fuel');
    const lv = levelOf(pct, FUEL);
    if (lv) box.dataset.level = lv;
    box.style.setProperty('--scheduler-tank', `${Math.max(0, Math.min(100, pct ?? 0))}%`);
    box.append(el('span', 'scheduler-row-head__fuel-meter'), el('span', 'scheduler-row-head__fuel-pct', pct == null ? '\u2013' : `${pct}%`));
    return box;
  }

  // One tank. Fuel: its percent and meter. DEF, drawn only while low: its name and
  // percent as a tag.
  function level(pct, tank) {
    const lv = levelOf(pct, tank);
    const g = el('span', 'scheduler-row-head__level');
    if (lv) g.dataset.level = lv;
    g.dataset.tank = tank.letter;
    const words = pct == null ? `${tank.word} not read yet` : `${tank.word} ${pct}%${lv === 'critical' ? ', critical' : lv === 'low' ? ', low' : ''}`;
    g.setAttribute('role', 'img');
    g.setAttribute('aria-label', words);
    if (tank === FUEL) {
      g.appendChild(fuelReadout(pct));
      return g;
    }
    const reading = el('span', 'scheduler-row-head__reading');
    reading.append(el('span', null, tank.word), el('span', null, pct == null ? '\u2013' : `${pct}%`));
    g.appendChild(reading);
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

  // The papers the Fleet page compares, and the words it gives them.
  const PAPERS = [['insurance_exp', 'Insurance'], ['registration_exp', 'Registration'], ['inspection_exp', 'Inspection']];
  /* Each paper that expires within WARN_DAYS or has expired, the soonest
     first: `{ tone, words }`, tone `error` once expired. */
  function papersOf(bus, today = new Date(new Date().setHours(0, 0, 0, 0))) {
    const out = [];
    for (const [field, word] of PAPERS) {
      const v = String(bus?.[field] ?? '').slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) continue;
      const [y, m, d] = v.split('-').map(Number);
      const n = Math.round((new Date(y, m - 1, d) - today) / DAY);
      if (n > WARN_DAYS) continue;
      const plural = k => `${k} day${k === 1 ? '' : 's'}`;
      out.push({ n, tone: n < 0 ? 'error' : 'warning',
        words: n < 0 ? `${word} expired ${plural(-n)} ago` : n === 0 ? `${word} expires today` : `${word} expires in ${plural(n)}` });
    }
    return out.sort((a, b) => a.n - b.n).map(({ tone, words }) => ({ tone, words }));
  }

  /* The kit's marks this draws, the papers' one mark in the worst tone and
     the engine's lamp, each with its words on its label, or none. */
  function drawMarks(head, papers, lamp, live, unsafe = null, overdue = null) {
    const top = head.querySelector(':scope > .scheduler-row-head__top');
    if (!top) return;
    let kit = top.querySelector(':scope > .scheduler-row-head__kit');
    kit?.querySelectorAll(':scope > :is(.scheduler-row-head__papers, .scheduler-row-head__lamp, .scheduler-row-head__unsafe, .scheduler-row-head__due)').forEach(m => m.remove());
    const marks = [];
    if (papers.length) {
      const error = papers.some(p => p.tone === 'error');
      marks.push(['scheduler-row-head__papers', error ? 'error' : 'warning', error ? '#i-warning--filled' : '#i-warning--alt--filled',
        papers.map(p => p.words).join('. ')]);
    }
    if (lamp) marks.push(['scheduler-row-head__lamp', lamp.tone, '#m-car_repair-fill', [lamp.word, ...(live?.faults ?? [])].join('. ')]);
    if (unsafe) marks.push(['scheduler-row-head__unsafe', unsafe.tone, '#i-warning--filled', unsafe.word]);
    if (overdue) marks.push(['scheduler-row-head__due', overdue.tone, '#i-warning--alt--filled', overdue.word]);
    if (!marks.length) {
      if (kit && !kit.childElementCount) kit.remove();
      return;
    }
    if (!kit) top.appendChild(kit = el('div', 'scheduler-row-head__kit'));
    // The worst first in the kit, before data.js's out-of-service mark.
    marks.sort((a, b) => (a[1] === b[1] ? 0 : a[1] === 'error' ? -1 : 1)).reverse();
    for (const [cls, tone, icon, words] of marks) {
      const mark = el('span', cls);
      mark.dataset.tone = tone;
      mark.setAttribute('role', 'img');
      mark.setAttribute('aria-label', words);
      mark.appendChild(svgUse(icon, '16', '0 0 32 32'));
      kit.prepend(mark);
    }
  }


  function draw(head, bus, live, opts = {}) {
    const shown = live ?? (opts.waiting ? WAITING : null);
    const papers = papersOf(bus);
    const key = JSON.stringify([papers, ...(shown ? [shown.waiting, shown.engine, shown.mph, shown.fuel, shown.def, shown.place, shown.fault, unsafeOf(shown)?.word, overdueOf(shown)?.word,
      shown.seen && ago(shown.seen), shown.engine_at && ago(shown.engine_at)] : [bus.inspection_exp])]);
    if (head.dataset.live === key) return;
    head.dataset.live = key;
    head.toggleAttribute('data-signal-lost', !!noSignal(shown));
    const top = head.querySelector('.scheduler-row-head__top');

    const lamp = lampOf(shown);
    drawMarks(head, papers, lamp, shown, unsafeOf(shown), overdueOf(shown));

    const state = shown ? stateOf(shown) : null;
    // What the engine is doing, for a theme that quiets a bus at rest.
    if (state) head.dataset.engine = state.engine; else delete head.dataset.engine;
    const levels = shown ? [levelOf(shown.fuel, FUEL), levelOf(shown.def, DEF)] : [];

    // The one state dot a one-row head draws: the worst tone the head shows.
    const tone = lamp?.tone === 'error' || levels.includes('critical') ? 'error'
      : lamp || state?.tone === 'warning' || levels.includes('low') ? 'warning'
      : state?.tone === 'quiet' && noSignal(shown) ? 'quiet' : live ? 'normal' : null;
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
      if (shown.fuel != null || shown.waiting) gauges.appendChild(level(shown.fuel, FUEL));
      if (shown.def != null && levelOf(shown.def, DEF) !== 'normal') gauges.appendChild(level(shown.def, DEF));
      body.appendChild(gauges);
    } else {
      const insp = inspection(bus);
      if (insp) {
        const line = el('span', `scheduler-row-head__line scheduler-row-head__insp${insp.soon ? ' scheduler-row-head__insp--soon' : ''}`);
        // The word goes where the inspection has one row, and the date stays.
        line.append(el('span', 'scheduler-row-head__insp-word', 'Insp'), el('span', null, insp.short));
        line.setAttribute('aria-label', insp.words);
        body.appendChild(line);
      }
    }
    // Above the equipment at the foot, which data.js draws once.
    if (body.childElementCount) head.insertBefore(body, head.querySelector(':scope > .scheduler-row-head__equip'));

    if (opts.tip) {
      const lines = tipOf(bus, live);
      let box = opts.tip.querySelector('.scheduler-tip__live');
      if (!lines.length) box?.remove();
      else {
        if (!box) {
          box = el('div', 'scheduler-tip__row scheduler-tip__live');
          opts.tip.querySelector('.scheduler-tip__head')?.after(box);
        }
        box.replaceChildren(...lines.map(l => el('div', null, l)));
        // The lamp's line is the last, and leads with the lamp in its tone.
        if (lamp) {
          const said = box.lastElementChild;
          said.className = `scheduler-tip__lamp scheduler-tip__lamp--${lamp.tone}`;
          said.prepend(svgUse(lamp.icon, '16', '0 0 32 32'));
        }
      }
    }
  }

  /* After the number, the one alert every bar and driver tile wears: the
     warning triangle while the bus has a mark, the error circle while one is
     red. app.css shows the one the kit's worst mark asks for, and keeps its
     room when there is none, so the number never moves; the kit's own marks
     carry the words. */
  function alertEl() {
    const alert = el('span', 'scheduler-row-head__alert');
    alert.setAttribute('aria-hidden', 'true');
    const warning = svgUse('#i-warning--alt--filled', '16', '0 0 32 32');
    warning.dataset.tone = 'warning';
    const error = svgUse('#i-warning--filled', '16', '0 0 32 32');
    error.dataset.tone = 'error';
    alert.append(warning, error);
    return alert;
  }

  /* The bus's kit on the head's last row: its sleeper and its lift, each in
     its own place down the column, and an empty place where the bus lacks
     one, so the lifts stand in one line. The number's tip and title name
     them, and its seats, for the reader. */
  function equipEl(bus) {
    const equip = el('div', 'scheduler-row-head__equip');
    for (const [on, href, label] of [[bus.sleeper, '#m-airline_seat_flat-fill', 'Sleeper'], [bus.ada_lift, '#m-accessible-fill', 'ADA lift']]) {
      const t = el('span', 'scheduler-row-head__tile');
      if (on) {
        t.setAttribute('role', 'img');
        t.setAttribute('aria-label', label);
        t.appendChild(svgUse(href, '16', '0 0 32 32'));
      }
      equip.appendChild(t);
    }
    return equip;
  }

  /* The lines the number's toggletip adds: its papers' words while one
     expires within WARN_DAYS, and while the bus is answered for, what it is
     doing. */
  function tipOf(bus, live) {
    const papers = papersOf(bus).map(p => p.words);
    if (!live) {
      const insp = inspection(bus);
      return papers.length ? papers : insp ? [insp.words] : [];
    }
    return [
      stateOf(live).words,
      live.place,
      [live.fuel != null ? `Fuel ${live.fuel}%` : null, live.def != null ? `DEF ${live.def}%` : null].filter(Boolean).join(' · ') || null,
      live.odometer != null ? `${live.odometer.toLocaleString()} mi` : null,
      live.seen ? `Last seen ${ago(live.seen)} ago` : null,
      ...(papers.length ? papers : [inspection(bus)?.words]),
      live.fault ? [lampOf(live).word, ...(live.faults ?? [])].join(' · ') : null,
      unsafeOf(live)?.word,
      overdueOf(live)?.word,
    ].filter(Boolean);
  }

  window.SchedulerBusHead = { draw, alertEl, equipEl, tipOf, stateOf, papersOf, unsafeOf, overdueOf, FUEL, DEF, SPEEDING, IDLE_MS, WARN_DAYS };
})();
