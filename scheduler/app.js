// Behaviour: selecting a trip bar, and sizing the day columns to whole pixels.
// No network, no drag and no editing here.
//
// A bar is a role=button whose aria-pressed is the selection; no class mirrors
// it. A click or Space toggles it. Enter only selects, because data.js takes
// Enter on a selected bar as "open this trip".
(() => {
  'use strict';

  document.addEventListener('click', e => {
    const bar = e.target.closest('.scheduler-bar');
    if (!bar) return;
    const on = bar.getAttribute('aria-pressed') === 'true';
    for (const b of document.querySelectorAll('.scheduler-bar[aria-pressed="true"]')) b.setAttribute('aria-pressed', 'false');
    bar.setAttribute('aria-pressed', on ? 'false' : 'true');
  });

  document.addEventListener('keydown', e => {
    if (!e.target.matches('.scheduler-bar')) return;
    if (e.key === ' ') { e.preventDefault(); e.target.click(); }
    if (e.key === 'Enter') { e.preventDefault(); if (e.target.getAttribute('aria-pressed') !== 'true') e.target.click(); }
  });

  /* Whole-pixel day columns. Bars are placed by percentage across a track of
     seven equal days, and a fractional column paints every bar edge and day
     rule across two device pixels, which blurs them. So the day width is
     floored, and the remainder goes to the bus column, because a day wider
     than the others would break the placement every bar is measured against.

     This script is an enhancement: without it the stylesheet's own
     `minmax(--scheduler-day-min, 1fr)` renders. */
  const px = (el, name) => {
    const raw = getComputedStyle(el).getPropertyValue(name).trim();
    if (raw.endsWith('px')) return parseFloat(raw);
    if (raw.endsWith('rem')) return parseFloat(raw) * parseFloat(getComputedStyle(document.documentElement).fontSize);
    return NaN;
  };

  /* The pane's height is measured from its own top rather than capped at the
     stylesheet's fixed `100dvh - 15rem`, so anything above it that changes
     height gives the difference to the grid. The bottom margin is the content
     region's own padding, so the grid stops where page content stops. */
  function fitHeight(sch) {
    const content = sch.closest('.rux--content');
    const below = content ? parseFloat(getComputedStyle(content).paddingBottom) || 0 : 0;
    const top = sch.getBoundingClientRect().top;
    // A floor, so a short window scrolls the page rather than crushing the grid.
    const height = Math.max(12 * 16, Math.round(window.innerHeight - top - below));
    const next = `${height}px`;
    if (sch.style.maxBlockSize !== next) sch.style.maxBlockSize = next;

    // The regions beside the grid start at `.scheduler-board`'s top, above the
    // grid, so their height is measured from the board.
    const board = sch.closest('.scheduler-board');
    const panelTop = board ? board.getBoundingClientRect().top : top;
    const panelNext = `${Math.max(12 * 16, Math.round(window.innerHeight - panelTop - below))}px`;

    /* The driver roster takes that height on the aside, and the pane inside
       fills what the aside's head leaves: see
       `.scheduler-aside .scheduler-week--avail`. */
    const aside = document.getElementById('scheduler-aside');
    const avail = document.getElementById('scheduler-avail');
    if (aside && avail && !aside.hidden && aside.contains(avail)) {
      if (aside.style.blockSize !== panelNext) aside.style.blockSize = panelNext;
    } else if (aside && aside.style.blockSize) {
      aside.style.removeProperty('block-size');
    }
    if (avail && avail.style.maxBlockSize) avail.style.removeProperty('max-block-size');

    /* The trip editor gets a definite `block-size`, not a cap: the side panel
       inside it resolves `block-size: 100%` against this box, and a percentage
       against a parent with only a maximum resolves to auto, which leaves the
       form unscrollable and the Save bar unpinned. */
    const trip = document.getElementById('scheduler-trip');
    if (trip && !trip.hidden) {
      if (trip.style.blockSize !== panelNext) trip.style.blockSize = panelNext;
    } else if (trip && trip.style.blockSize) {
      trip.style.removeProperty('block-size');
    }
  }

  function fitColumns(sch) {
    // Cleared first so the pane and the corner are measured at their
    // stylesheet sizes, not at the sizes the last pass pinned.
    sch.style.removeProperty('inline-size');
    sch.style.removeProperty('--scheduler-day-track');
    sch.style.removeProperty('--scheduler-head-w');
    // The bus column is `max-content`, so its width is measured from the
    // corner cell, which is that column.
    const corner = sch.querySelector('.scheduler-corner');
    const headBase = corner ? Math.ceil(corner.getBoundingClientRect().width) : NaN;
    const dayMin = px(sch, '--scheduler-day-min');
    const days = parseInt(getComputedStyle(sch).getPropertyValue('--scheduler-days'), 10) || 7;
    const pane = sch.clientWidth;
    if (!pane || !Number.isFinite(headBase) || !Number.isFinite(dayMin)) return false;

    const available = pane - headBase;
    let day = Math.floor(available / days);
    let head = headBase;
    const crowded = day < dayMin;
    if (crowded) {
      // The floor binds and the grid is wider than the pane: it scrolls, there
      // is no remainder to place, and the head stays at its content width.
      day = Math.floor(dayMin);
    } else {
      // Everything the day columns did not take; never less than headBase,
      // since `day` was floored from the same figure.
      head = pane - day * days;
    }
    sch.style.setProperty('--scheduler-day-track', `${day}px`);
    // The head is pinned to a whole width that carries the remainder, so the
    // columns sum to the pane exactly.
    sch.style.setProperty('--scheduler-head-w', `${head}px`);

    // Whether the week is crowded: seven days at their floor need more room
    // than the pane has, and the grid scrolls.
    return crowded;
  }

  const sch = document.getElementById('scheduler-week');
  if (sch && 'ResizeObserver' in window) {
    // The pane is observed, not the grid: the grid's width is what this
    // changes, so observing it would feed its own output back in.
    // `crowded` holds the last fit's answer, read through Rux.schedule.crowded.
    let crowded = false;
    const fit = () => { fitHeight(sch); crowded = fitColumns(sch) === true; };

    // Three triggers: a window resize; the observer, for a box change the
    // window did not cause; and `Rux.schedule.fit`, which data.js calls after
    // a render that changes what sits above the grid, such as the status
    // notification.
    const watch = new ResizeObserver(fit);
    watch.observe(sch);
    if (sch.parentElement) watch.observe(sch.parentElement);
    window.addEventListener('resize', fit);
    window.Rux = window.Rux || {};
    window.Rux.schedule = { fit, crowded: () => crowded };
    fit();
  }
})();
