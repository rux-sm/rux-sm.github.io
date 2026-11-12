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
    // A press that opens or switches a tip leaves a selected trip selected.
    if (on && e.target.closest('[data-card-opener]')) return;
    for (const b of document.querySelectorAll('.scheduler-bar[aria-current="true"]')) b.setAttribute('aria-current', 'false');
    bar.setAttribute('aria-current', on ? 'false' : 'true');
  });

  document.addEventListener('keydown', e => {
    if (!e.target.matches('.scheduler-bar')) return;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (e.target.getAttribute('aria-current') !== 'true') e.target.click(); }
  });

  /* The day columns are the strip's, `fitStrip`, whose days app.css fixes.
     This script is an enhancement: without it the stylesheet's own sizes
     render. */

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

  // The day a trip is drawn on, in pixels, as the board was last fitted:
  // data.js scrolls the strip by it through `Rux.schedule.day`.
  let dayPx = 0;

  /* THE STRIP'S DAYS NEVER CHANGE WIDTH. The board is a strip of days whose
     width, and the bus column's, app.css fixes, so a window resized or a
     panel opened beside the week only changes how much of the strip is in
     view, and moves no trip. Nothing is written on the week: a custom
     property set there is inherited by every element on the board, and
     restyling them all cost about 40ms a time, which made each change of
     width take a tenth of a second. What is counted is the whole days in
     view, which data.js reads back to label the board by.

     A COMPACT BOARD, a phone's, is the one exception: two days fill its pane,
     each a whole number of pixels, since a fractional day paints every bar
     edge across two device pixels. That width is written on the week, and
     only changes when the phone turns. */
  function fitStrip(sch) {
    const band = document.getElementById('scheduler-band');
    const corner = band?.querySelector('.scheduler-corner');
    if (!corner || !sch.clientWidth) return;
    /* The days stand `--scheduler-edge` clear of the bus column and of the
       pane's right edge, which the corner's margin is. */
    const edge = parseFloat(getComputedStyle(corner).marginInlineEnd) || 0;
    const available = sch.clientWidth - corner.offsetWidth - 2 * edge;
    const pinned = sch.closest('[data-board="compact"]') ? `${Math.floor(available / 2)}px` : '';
    // The band above the week counts its days by the same width.
    for (const box of [sch, band]) {
      if (box.style.getPropertyValue('--scheduler-day-w') === pinned) continue;
      if (pinned) box.style.setProperty('--scheduler-day-w', pinned);
      else box.style.removeProperty('--scheduler-day-w');
    }
    const day = parseFloat(getComputedStyle(sch).getPropertyValue('--scheduler-day-w'));
    if (!day) return;
    dayPx = day;
    const days = String(Math.max(0, Math.floor(available / day)));
    if (sch.dataset.daysInView !== days) {
      sch.dataset.daysInView = days;
      sch.dispatchEvent(new Event('scheduler:days-in-view'));
    }
  }

  const sch = document.getElementById('scheduler-week');
  if (sch && 'ResizeObserver' in window) {
    // The pane is observed, not the grid: the grid's width is what this
    // changes, so observing it would feed its own output back in.
    const page = sch.closest('.scheduler-page');
    const fit = () => {
      fitHeight(sch);
      fitStrip(sch);
    };

    /* The day band stands above the week and its days follow the week
       sideways by a scroll timeline, app.css's. A browser without one has
       the distance written on the band as the week scrolls, and app.css
       stands the days that far back; they may trail the trips by a frame. */
    const band = document.getElementById('scheduler-band');
    if (band && !(CSS.supports('animation-timeline', '--scheduler-strip') && CSS.supports('timeline-scope', '--scheduler-strip'))) {
      const follow = () => band.style.setProperty('--scheduler-strip-at', `${sch.scrollLeft}px`);
      sch.addEventListener('scroll', follow, { passive: true });
      follow();
    }
    /* How far the week can scroll sideways, the days' whole travel, written
       on the band whenever the week's width or its strip's changes: the pane
       and the grid are both observed, and neither is sized by this. */
    const grid = sch.querySelector('.scheduler-grid');
    if (band && grid) {
      const reach = () => {
        const next = `${Math.max(0, sch.scrollWidth - sch.clientWidth)}px`;
        if (band.style.getPropertyValue('--scheduler-strip-reach') !== next) band.style.setProperty('--scheduler-strip-reach', next);
      };
      const watch = new ResizeObserver(reach);
      watch.observe(sch);
      watch.observe(grid);
    }

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
  }
})();
