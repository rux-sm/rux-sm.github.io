// Behaviour: selecting a trip bar, and sizing the day columns to whole pixels.
// No network, no drag and no editing here.
//
// A bar is a focusable group whose aria-current is the selection; no class mirrors
// it. A click toggles it, except on a part of the selected bar marked
// `data-card-opener`, which data.js takes as "show or put away its card".
// Space and Enter only select, because data.js takes Space on a selected bar
// as its card and Enter as "open this trip", and so does a double-click, whose
// second click leaves the bar selected rather than toggling it back off.
(() => {
  'use strict';

  document.addEventListener('click', e => {
    const bar = e.target.closest('.scheduler-bar');
    if (!bar || e.detail > 1) return;
    const on = bar.getAttribute('aria-current') === 'true';
    // A press that opens or switches a tip, or the crew's "+1", leaves a selected trip selected.
    const openers = '[data-card-opener], [data-crew-overflow]';
    if (on && e.target.closest(openers)) return;
    for (const b of document.querySelectorAll('.scheduler-bar[aria-current="true"]')) b.setAttribute('aria-current', 'false');
    bar.setAttribute('aria-current', on ? 'false' : 'true');
  });

  document.addEventListener('keydown', e => {
    if (!e.target.matches('.scheduler-bar')) return;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (e.target.getAttribute('aria-current') !== 'true') e.target.click(); }
  });

  /* The day columns: `fitStrip` for the strip from md up, whose days app.css
     fixes, and `fitWeek` for the phone's seven, which share its width on
     whole pixels. This script is an enhancement: without it the stylesheet's
     own sizes render. */
  /* A custom property's computed value is the tokens it was written with, so a
     `calc()` comes back as a `calc()` and no arithmetic here would read it.
     The browser is asked instead: a hidden box inside the element takes the
     value as its width, and its measured width is the answer in pixels. One
     box is kept and reused, so a pass costs no more than the measure. */
  /* A hidden box `name` wide, put into `el` to be measured. The caller takes
     it out after its last read, since taking it out is a write. */
  let ruler = null;
  const rulerIn = (el, name) => {
    if (!ruler) {
      ruler = document.createElement('div');
      ruler.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;block-size:0';
      ruler.setAttribute('aria-hidden', 'true');
    }
    ruler.style.inlineSize = `var(${name})`;
    el.appendChild(ruler);
    return ruler;
  };

  /* The pane's height is measured from its own top rather than capped at the
     stylesheet's fixed `100dvh - 15rem`, so anything above it that changes
     height gives the difference to the grid. The bottom margin is the content
     region's own padding, so the grid stops where page content stops.
     Tops are read from the top of the page, not the window: read from the
     window, a pass made while the page is scrolled adds the scroll to every
     height, which lets the page scroll further, and the next pass adds more. */
  function fitHeight(sch) {
    const content = sch.closest('.rux--content');
    const below = content ? parseFloat(getComputedStyle(content).paddingBottom) || 0 : 0;
    const scrolled = window.scrollY;
    const box = sch.getBoundingClientRect();
    const top = box.top + scrolled;
    // The frame's own edge under the grid, the line a theme draws round its
    // regions, is room the grid leaves, so the board ends where the editor does.
    const frame = sch.closest('.scheduler-frame');
    const edge = frame ? Math.max(0, frame.getBoundingClientRect().bottom - box.bottom) : 0;
    // Whole pixels down, so a fraction never takes the page past the window.
    // A floor, so a short window scrolls the page rather than crushing the grid.
    const height = Math.max(12 * 16, Math.floor(window.innerHeight - top - edge - below));
    const next = `${height}px`;
    // A height, not a cap: a short week leaves the frame empty below its last
    // bus, so the frame ends level with the roster and the editor beside it.
    if (sch.style.blockSize !== next) { sch.style.blockSize = next; sch.style.maxBlockSize = next; }

    // The regions beside the grid start at `.scheduler-board`'s top, above the
    // grid, so their height is measured from the board.
    const board = sch.closest('.scheduler-board');
    const panelTop = board ? board.getBoundingClientRect().top + scrolled : top;
    const panelNext = `${Math.max(12 * 16, Math.floor(window.innerHeight - panelTop - below))}px`;

    /* The driver roster takes that figure as its height, so its card ends
       level with the board and the editor: a short list leaves the card empty
       below it, and a longer one scrolls inside, the pane taking what the
       aside's head leaves: see `.scheduler-aside .scheduler-week--avail`. */
    const aside = document.getElementById('scheduler-aside');
    const avail = document.getElementById('scheduler-avail');
    /* Below md the roster is a card fixed over the board, and its height is
       the gap its own insets leave; the board's would run it past the bottom
       edge. The computed position is the test, so the width that decides it
       stays in app.css. */
    const floats = aside && getComputedStyle(aside).position === 'fixed';
    /* A shut roster keeps its height: its column closing, app.css's push,
       still shows it for 240ms, and once shut it is not laid out. */
    if (aside && avail && aside.contains(avail) && !floats) {
      if (aside.style.blockSize !== panelNext) { aside.style.blockSize = panelNext; aside.style.maxBlockSize = panelNext; }
    } else if (aside && aside.style.blockSize) {
      aside.style.removeProperty('block-size');
      aside.style.removeProperty('max-block-size');
    }
    if (avail && avail.style.maxBlockSize) avail.style.removeProperty('max-block-size');

    /* The lists' panes, Tasks and Departures, take the same height and scroll
       inside it, shut or not, as the roster does, and give it up in front of
       the board, where their own insets are their height. */
    for (const toDo of document.querySelectorAll('.scheduler-to-do--pane')) {
      if (getComputedStyle(toDo).position !== 'fixed') {
        if (toDo.style.blockSize !== panelNext) toDo.style.blockSize = panelNext;
      } else if (toDo.style.blockSize) {
        toDo.style.removeProperty('block-size');
      }
    }

    /* The trip editor and the document panels get a definite `block-size`, not
       a cap: the side panel inside each resolves `block-size: 100%` against
       this box, and a percentage against a parent with only a maximum resolves
       to auto, which leaves the form unscrollable and the Save bar unpinned.
       Shut or not, as the roster's, so a column closing keeps its height. */
    for (const column of document.querySelectorAll('#scheduler-trip, .scheduler-viewer')) {
      if (column.style.blockSize !== panelNext) column.style.blockSize = panelNext;
    }
  }

  /* A list whose rows stop short of its pane's bottom edge is marked, so its
     last row keeps the rule that closes it: see `.scheduler-week--short` in
     app.css. Rows that end inside the pane's corner radius count as reaching
     the edge, because a rule that close reads as a second edge. */
  function fitShort(pane) {
    const grid = pane.querySelector('.scheduler-grid:not(.scheduler-grid--spare)');
    if (!grid) return;
    const radius = parseFloat(getComputedStyle(pane).borderEndStartRadius) || 0;
    pane.classList.toggle('scheduler-week--short', pane.clientHeight - grid.offsetHeight > radius);
  }

  // The day a trip is drawn on, in pixels, as the board was last fitted:
  // data.js scrolls, glides and swipes by it through `Rux.schedule.day`.
  let dayPx = 0;

  /* THE STRIP'S DAYS NEVER CHANGE WIDTH. From md up the board is a strip of
     days whose width, and the bus column's, app.css fixes, so a window
     resized or a panel opened beside the week only changes how much of the
     strip is in view, and moves no trip. Nothing is written on the week: a
     custom property set there is inherited by every element on the board,
     and restyling them all cost about 40ms a time, which made each change of
     width take a tenth of a second. What is counted is the whole days in
     view, which data.js reads back to label the board by. */
  function fitStrip(sch) {
    for (const name of ['--scheduler-day-track', '--scheduler-day-w', '--scheduler-head-w']) {
      if (sch.style.getPropertyValue(name)) sch.style.removeProperty(name);
    }
    // A strip always scrolls, so the finger scrolls it and nothing is
    // claimed from the browser; see `fitWeek`.
    if (sch.style.touchAction) sch.style.touchAction = '';
    const day = parseFloat(getComputedStyle(sch).getPropertyValue('--scheduler-day-w'));
    const corner = sch.querySelector('.scheduler-corner');
    if (!day || !corner) return;
    dayPx = day;
    /* The days stand `--scheduler-edge` clear of the bus column and of the
       pane's right edge, which the corner's margin is. */
    const edge = parseFloat(getComputedStyle(corner).marginInlineEnd) || 0;
    const available = sch.clientWidth - corner.offsetWidth - 2 * edge;
    const days = String(Math.max(0, Math.floor(available / day)));
    if (sch.dataset.daysInView !== days) {
      sch.dataset.daysInView = days;
      sch.dispatchEvent(new Event('scheduler:days-in-view'));
    }
  }

  /* A PAGED WEEK'S DAYS share its width: the phone's seven, below md where
     the board pages a week at a time rather than scrolling a strip, and
     Maintenance's two weeks. A fractional column paints every bar edge and
     day rule across two device pixels, which blurs them, so the day width is
     floored and the remainder goes to the bus column. A phone's width
     changes only when it turns, and Maintenance has no panels beside its
     weeks, so these writes on the week cost nothing in use. */
  function fitWeek(sch) {
    // Cleared first so the pane and the corner are measured at their
    // stylesheet sizes, not at the sizes the last pass pinned.
    sch.style.removeProperty('--scheduler-day-track');
    sch.style.removeProperty('--scheduler-day-w');
    sch.style.removeProperty('--scheduler-head-w');
    /* Every width is read in one layout: the ruler goes in before the first
       read and comes out after the last, because a write between two reads
       has the browser lay the board out again. The bus column is
       `max-content`, so its width is measured from the corner cell, which is
       that column. */
    const corner = sch.querySelector('.scheduler-corner');
    const ruled = rulerIn(sch, '--scheduler-day-min');
    let head = corner ? Math.ceil(corner.getBoundingClientRect().width) : NaN;
    const ruledWidth = ruled.getBoundingClientRect().width;
    const dayMin = ruledWidth > 0 ? ruledWidth : NaN;
    const pane = sch.clientWidth;
    ruled.remove();
    if (!pane || !Number.isFinite(head) || !Number.isFinite(dayMin)) return;
    /* The kit row is an even width, centred in the column less its 1px rule
       and as far from its foot as from its sides, so the column is odd for
       that clearance to be whole pixels. The compact board shows no kit. */
    const kit = !sch.closest('[data-board="compact"]');
    if (kit && head % 2 === 0) head += 1;
    const days = parseInt(getComputedStyle(sch).getPropertyValue('--scheduler-days'), 10) || 7;
    let day = Math.floor((pane - head) / days);
    const crowded = day < dayMin;
    if (crowded) {
      // The floor binds and the grid is wider than the pane: it scrolls, there
      // is no remainder to place, and the head stays at its content width.
      day = Math.floor(dayMin);
    } else {
      // Each day takes a whole share of the pane and the bus column takes the
      // few pixels the days could not share, so the week fills it.
      head = pane - day * days;
      /* An even column would leave the kit half a pixel off centre, so the
         days give up a pixel each, an odd count, and the column's leftover
         turns even. That can take a day a pixel under its least width. */
      if (kit && head % 2 === 0) { day -= 1; head += days; }
    }
    sch.style.setProperty('--scheduler-day-track', `${day}px`);
    // Bars, stripes and day rules are placed from this rather than from a
    // percentage of the track, so every edge lands on a whole pixel.
    sch.style.setProperty('--scheduler-day-w', `${day}px`);
    // The head is pinned to its width, measured once with the corner above
    // and given the days' remainder, so the columns sum to the pane.
    sch.style.setProperty('--scheduler-head-w', `${head}px`);
    dayPx = day;

    /* Where the days fit there is no sideways scrolling to do, so the
       horizontal axis is handed to the week swipe in data.js and the browser
       keeps only the vertical one. Without this the browser decides which axis
       owns a touch from its first pixels, claims anything that looks like a
       pan, and cancels the pointer -- which is every swipe with a little drift
       in it. `touch-action` is read when a gesture begins, so it has to be
       standing before the finger lands, which is why it is set here and not
       when the swipe is read. Where the grid does scroll, the finger scrolls
       it and nothing is claimed from the browser. */
    sch.style.touchAction = crowded ? '' : 'pan-y';
  }

  const sch = document.getElementById('scheduler-week');
  if (sch && 'ResizeObserver' in window) {
    // The pane is observed, not the grid: the grid's width is what this
    // changes, so observing it would feed its own output back in.
    const page = sch.closest('.scheduler-page');
    const fit = () => {
      fitHeight(sch);
      if (sch.classList.contains('scheduler-week--scroll')) fitStrip(sch);
      else fitWeek(sch);
    };

    // Three triggers: a window resize; the observer, for a box change the
    // window did not cause; and `Rux.schedule.fit`, which data.js calls after
    // a render that changes what sits above the grid, such as the status
    // notification.
    /* While a panel's column opens or closes beside the week, data.js's
       `data-pushing`, the sizes are on their way and none is fitted: data.js
       calls `fit` once the column has stopped, which the panel's first frame
       has already been given its height by. */
    const watch = new ResizeObserver(() => { if (!page?.hasAttribute('data-pushing')) fit(); });
    watch.observe(sch);
    if (sch.parentElement) watch.observe(sch.parentElement);
    // A panel opening or closing beside the week changes the shell a fixed
    // day width holds the board to, without the week's own size changing.
    for (const panel of sch.closest('.scheduler-board')?.children ?? []) watch.observe(panel);
    window.addEventListener('resize', fit);
    window.Rux = window.Rux || {};
    window.Rux.schedule = { fit, day: () => dayPx };
    fit();

    // The board and the roster each end short or not as their rows change, a
    // filter or a second lane as much as a resize, so each grid is observed
    // with its pane. The mark changes no size, so nothing feeds back.
    for (const pane of [sch, document.getElementById('scheduler-avail')]) {
      const grid = pane?.querySelector('.scheduler-grid');
      if (!grid) continue;
      const short = new ResizeObserver(() => fitShort(pane));
      short.observe(pane);
      short.observe(grid);
    }
  }
})();
