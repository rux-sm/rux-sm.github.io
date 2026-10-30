/* ==========================================================================
   Rux Scheduler — COMPONENTS, the page of every state a bar can be in
   --------------------------------------------------------------------------
   Draws components-data.js's invented samples with the board's own code:
   each bar by bar.js, and a bus out on its trip by road-bar.js from what
   live-trip.js says of it. So a change to the board shows here at once.

   Each sample is a board of its own a few days wide, a bus to a row, under
   its name and a sentence saying what it shows. Above them, Motion, the
   board and the rows are the view menu's, opening as the board was last
   left and changing only this page: Motion is `data-motion` on the page,
   the compact board `data-board`, and a row the board's own class on each
   sample. The theme is the account's, from the header, as on the board.
   A sample that plays once has a button to play it again, drawn afresh.
   ========================================================================== */
(() => {
  'use strict';

  const root = document.getElementById('scheduler-components');
  if (!root) return;
  const Bar = window.SchedulerBar;
  const RoadBar = window.SchedulerRoadBar;
  const Live = window.SchedulerLiveTrip;
  const { legsOf, assignLanes } = window.SchedulerWeek;
  const page = root.closest('.scheduler-page') ?? root;

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  // The view menu's rows and the class that hides each, as data.js names them.
  const ROWS = ['client', 'contact', 'time', 'update', 'drivers'];
  const HIDE_ROW = {
    client: 'scheduler-week--no-client',
    contact: 'scheduler-week--no-contact',
    time: 'scheduler-week--no-time',
    update: 'scheduler-week--no-update',
    drivers: 'scheduler-week--no-drivers',
  };
  const MOTIONS = ['full', 'calm', 'off'];
  /* The board's view as it was last left, read and never written, so the
     page opens as the board looks and changing it here changes nothing
     there. */
  const view = { client: true, contact: true, time: true, update: true, drivers: true, compact: false,
    motion: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'calm' : 'full' };
  try {
    const saved = JSON.parse(localStorage.getItem('scheduler.view') || '{}');
    for (const k of ROWS) if (typeof saved[k] === 'boolean') view[k] = saved[k];
    if (MOTIONS.includes(saved.motion)) view.motion = saved.motion;
  } catch { /* no storage: the defaults stand */ }

  // The day rules a track draws between its days, as data.js writes them.
  const dayRules = days => {
    const parts = [];
    let prev = '0';
    for (let i = 1; i < days; i++) {
      const at = `calc(${i} * var(--scheduler-day-w))`;
      parts.push(`transparent ${prev} calc(${i} * var(--scheduler-day-w) - 1px)`);
      parts.push(`var(--scheduler-day-rule) calc(${i} * var(--scheduler-day-w) - 1px) ${at}`);
      prev = at;
    }
    parts.push(`transparent ${prev} 100%`);
    return parts.join(', ');
  };

  /* What the board hands bar.js for one sample bar: the trip, its leg, the
     bus's assignment on that leg, or none for a bar in the No bus row, and
     where it sits in the sample's days. */
  function placed(spec) {
    const leg = legsOf(spec.trip).find(l => l.leg === spec.leg);
    const assigns = (spec.trip.trip_assignments || []).filter(a => (a.leg || 'outbound') === spec.leg)
      .sort((x, y) => (x.position ?? 0) - (y.position ?? 0));
    return {
      // A sample's rows run in slot order, so its slot counts its buses down the board.
      spec, trip: spec.trip, leg, slot: spec.slot, nth: (spec.slot ?? 0) + 1,
      assign: 'assign' in spec ? spec.assign : assigns[spec.slot] ?? null,
      place: { start: spec.start, span: spec.span, fromPrev: !!spec.fromPrev, toNext: !!spec.toNext },
    };
  }

  function barOf(b, data) {
    const { spec } = b;
    const { bar } = Bar.draw(b, {
      driversById: data.driversById, busesById: data.busesById, statuses: data.statuses,
      saving: () => !!spec.state?.saving,
    });
    if (spec.state?.pressed) bar.setAttribute('aria-current', 'true');
    for (const c of spec.state?.classes ?? []) bar.classList.add(c);
    if (spec.live) {
      const { bus, look, before } = spec.live;
      const said = l => ({ warnings: Live.warningsOf(l), phase: Live.phaseOf(l) });
      if (before) RoadBar.draw(bar, before, { next: look.next, said: said({ ...look, bus: before }), at: look.now, motion: view.motion });
      RoadBar.draw(bar, bus, { next: look.next, said: said(look), at: look.now, motion: view.motion, day: look.day });
    }
    return bar;
  }

  // The rows the view shows, on one sample's board.
  function showRows(board) {
    for (const r of ROWS) board.classList.toggle(HIDE_ROW[r], !view[r]);
    board.style.setProperty('--scheduler-bar-rows', String(1 + ROWS.filter(r => view[r]).length));
  }

  function boardOf(sample, data) {
    const board = el('div', 'scheduler-week scheduler-components__board');
    board.style.setProperty('--scheduler-days', sample.days);
    const grid = el('div', 'scheduler-grid');
    for (const r of sample.rows) {
      const none = r.head === 'No bus';
      const row = el('div', `scheduler-row${none ? ' scheduler-row--unassigned' : ''}`);
      const head = el('div', 'scheduler-row-head');
      head.appendChild(el('div', 'scheduler-row-head__num', none ? 'No\nbus' : r.head));
      if (none) head.title = 'Trips with no bus yet';
      const track = el('div', 'scheduler-track');
      const bars = r.bars.map(placed);
      track.style.setProperty('--scheduler-lanes', assignLanes(bars));
      track.style.setProperty('--scheduler-day-rules', dayRules(sample.days));
      for (const b of bars) track.appendChild(barOf(b, data));
      row.append(head, track);
      grid.appendChild(row);
    }
    board.appendChild(grid);
    showRows(board);
    return board;
  }

  function sampleOf(sample, data, where) {
    const figure = el('figure', 'scheduler-components__sample');
    const caption = el('figcaption', 'scheduler-components__caption');
    caption.append(el('span', 'scheduler-components__name rux--type-heading-compact-01', sample.name),
      el('span', 'scheduler-components__note rux--type-body-compact-01', sample.note));
    figure.append(caption, boardOf(sample, data));
    if (sample.replay) {
      const again = el('button', 'rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm scheduler-components__again', 'Play again');
      again.type = 'button';
      again.dataset.where = where;
      caption.appendChild(again);
    }
    return figure;
  }

  function draw() {
    const data = window.SchedulerComponentsData.build();
    const nav = el('nav', 'scheduler-components__nav');
    nav.setAttribute('aria-label', 'Component sections');
    for (const section of data.sections) {
      const link = el('a', 'rux--link', section.title);
      link.href = `#scheduler-components-${section.id}`;
      nav.appendChild(link);
    }
    const out = [nav];
    data.sections.forEach((section, s) => {
      const box = el('section', 'scheduler-components__section');
      box.setAttribute('aria-labelledby', `scheduler-components-${section.id}`);
      const title = el('h2', 'rux--type-heading-03', section.title);
      title.id = `scheduler-components-${section.id}`;
      const list = el('div', 'scheduler-components__samples');
      section.samples.forEach((sample, i) => list.appendChild(sampleOf(sample, data, `${s}:${i}`)));
      box.append(title, el('p', 'rux--type-body-01 scheduler-components__intro', section.intro), list);
      out.push(box);
    });
    root.replaceChildren(...out);
  }

  // Play again: the sample drawn from fresh samples, so it starts as new.
  root.addEventListener('click', e => {
    const again = e.target.closest('.scheduler-components__again');
    if (!again) return;
    const [s, i] = again.dataset.where.split(':').map(Number);
    const data = window.SchedulerComponentsData.build();
    const old = again.closest('.scheduler-components__sample');
    old.replaceWith(sampleOf(data.sections[s].samples[i], data, again.dataset.where));
  });

  // ── The view ──────────────────────────────────────────────────────────────
  const motionSwitch = document.getElementById('scheduler-components-motion');
  const boardSwitch = document.getElementById('scheduler-components-board');
  const select = (switcher, value, key) => {
    const option = switcher?.querySelector(`[data-${key}="${value}"]`);
    if (option) window.Rux?.contentSwitcher?.select?.(switcher, option, { focus: false, silent: true });
  };
  function applyView() {
    page.dataset.motion = view.motion;
    if (view.compact) page.dataset.board = 'compact'; else delete page.dataset.board;
    for (const board of root.querySelectorAll('.scheduler-components__board')) showRows(board);
  }
  motionSwitch?.addEventListener('rux:content-switcher-selected', e => {
    view.motion = e.detail?.option?.dataset.motion ?? view.motion;
    applyView();
  });
  boardSwitch?.addEventListener('rux:content-switcher-selected', e => {
    view.compact = e.detail?.option?.dataset.board === 'compact';
    applyView();
  });
  for (const r of ROWS) {
    const box = document.getElementById(`scheduler-components-row-${r}`);
    if (!box) continue;
    box.checked = view[r];
    box.addEventListener('change', () => { view[r] = box.checked; applyView(); });
  }

  draw();
  select(motionSwitch, view.motion, 'motion');
  applyView();
})();
