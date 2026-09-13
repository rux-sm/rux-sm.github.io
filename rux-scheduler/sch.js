// BEHAVIOUR: selecting a trip bar, and sizing the day columns to whole pixels.
// No network, no drag, no editing yet.
//
// A bar is a role=button whose pressed state IS the selection -- aria-pressed
// is the state of record and no class mirrors it -- and the browser pane
// delivers Enter and Space as keydown without a click, so this turns those
// into one.
(() => {
  'use strict';

  document.addEventListener('click', e => {
    const bar = e.target.closest('.sch-bar');
    if (!bar) return;
    const on = bar.getAttribute('aria-pressed') === 'true';
    for (const b of document.querySelectorAll('.sch-bar[aria-pressed="true"]')) b.setAttribute('aria-pressed', 'false');
    bar.setAttribute('aria-pressed', on ? 'false' : 'true');
  });

  document.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.sch-bar')) { e.preventDefault(); e.target.click(); }
  });

  /* ── WHOLE-PIXEL DAY COLUMNS ──────────────────────────────────────────────
     A day column of `1fr` is whatever a seventh of the leftover happens to be,
     and that is almost never a whole pixel. Measured 2026-09-06 at 1440 on a
     2x display: the track came to 1253.992px, a day to 179.1417px, the day
     boundaries to 121, 300.141, 479.281, 658.422, 837.57 and so on, and 37 of
     38 bar edges missed a device pixel, the worst by 0.438 of one. The
     placement arithmetic was already exact -- the bars sat where the columns
     said, to within 0.016px -- so this is not a maths error. It is that the
     columns themselves land between pixels, and the browser then paints every
     bar edge, and every day rule, across two of them.

     THE REMAINDER GOES IN THE BUS COLUMN. Flooring the day width leaves up to
     six pixels over. They cannot go in a day column -- one column wider than
     its neighbours breaks the placement every bar is measured against, since
     bars are positioned by percentage across a track spanning all seven.

     THIS REVERSES THE DECISION MADE EARLIER ON 2026-09-06, which put the
     leftover OUTSIDE the pane: the pane was narrowed and the spare pixels sat
     beyond its border in the page's padding, "where nothing reads it as part
     of the grid". They do read as part of it. rux saw the board's right edge
     failing to line up with the New trip button above it -- measured 0px at
     1440, 2px at 1400 and 1365, 4px at 1290 -- and a ragged edge against the
     toolbar is worse than the thing that reversal was avoiding, which was up
     to 6px of extra space to the right of the bus number.

     AND IT IS SIMPLER. The head takes `pane - day * days`, so the columns fill
     the pane exactly and no explicit `inline-size` is needed at all; the pane
     just fills the board. That also retires the `flex-grow` pinning added
     earlier today, which existed only to stop the pane being stretched past a
     width this no longer sets. The head can never fall below its measured
     content width, because the remainder it absorbs is non-negative.

     WHEN THE FLOOR BINDS this does nothing but round: the columns are already
     at --sch-day-min and the grid scrolls, so there is no remainder to place.

     IT IS AN ENHANCEMENT, NOT A REQUIREMENT. With this script absent the
     stylesheet's own `minmax(--sch-day-min, 1fr)` renders, which is what
     shipped before today. Nothing here is load-bearing for the grid to work.
     ────────────────────────────────────────────────────────────────────────*/
  const px = (el, name) => {
    const raw = getComputedStyle(el).getPropertyValue(name).trim();
    if (raw.endsWith('px')) return parseFloat(raw);
    if (raw.endsWith('rem')) return parseFloat(raw) * parseFloat(getComputedStyle(document.documentElement).fontSize);
    return NaN;
  };

  /* ── THE PANE'S HEIGHT, MEASURED RATHER THAN GUESSED ──────────────────────
     The stylesheet caps the grid at `100dvh` minus a hard 15rem, which is a
     number tuned by hand to the chrome that happened to sit above it. That
     made the cap, not the space, decide: at a 950px viewport the pane came
     out 708px because 950 - 240 - 2 is 708, and hiding the 66px page heading
     would have changed nothing at all. Measuring the pane's own top means
     any change above it -- a heading going, a toolbar wrapping to two rows --
     turns into grid.

     The bottom margin is the content region's own padding, read from it, so
     the grid stops where every other page's content stops.
     ────────────────────────────────────────────────────────────────────────*/
  function fitHeight(sch) {
    const content = sch.closest('.rux--content');
    const below = content ? parseFloat(getComputedStyle(content).paddingBottom) || 0 : 0;
    const top = sch.getBoundingClientRect().top;
    // A floor, for the same reason the stylesheet has one: a short window
    // should scroll the page rather than crush the grid to nothing.
    const height = Math.max(12 * 16, Math.round(window.innerHeight - top - below));
    const next = `${height}px`;
    if (sch.style.maxBlockSize !== next) sch.style.maxBlockSize = next;

    /* THE PANELS ARE MEASURED FROM THE BOARD, NOT FROM THE GRID. They used to
       start where `.sch` starts -- pushed down past the toolbar by a 2rem
       margin -- so one measurement served all three. Each region carries its
       own head in that band now and they all begin at `.sch-board`'s top, which
       is 32px above the grid. Measuring from `.sch` and applying it here would
       run both panels exactly one toolbar past the bottom of the board. */
    const board = sch.closest('.sch-board');
    const panelTop = board ? board.getBoundingClientRect().top : top;
    const panelNext = `${Math.max(12 * 16, Math.round(window.innerHeight - panelTop - below))}px`;

    // BESIDE THE BOARD MEANS AS TALL AS THE BOARD. The availability pane starts
    // at the same y as the grid, so a hand-set cap of its own just stopped it
    // short: 18 of 40 drivers with empty page below it. It gets the measured
    // height instead and the two bottoms line up.
    /* THE HEIGHT GOES ON THE ASIDE, NOT ON THE PANE INSIDE IT. The aside carries
       a head of its own now, so giving the pane the board's full height made the
       two of them 32px taller than everything beside them. The aside takes the
       measurement and the pane fills what is left under the head -- see
       `.sch-aside .sch--avail`, which is `flex: 1 1 auto` with the base `.sch`
       cap lifted so it can. */
    const aside = document.getElementById('sch-aside');
    const avail = document.getElementById('sch-avail');
    if (aside && avail && !aside.hidden && aside.contains(avail)) {
      if (aside.style.blockSize !== panelNext) aside.style.blockSize = panelNext;
    } else if (aside && aside.style.blockSize) {
      aside.style.removeProperty('block-size');
    }
    if (avail && avail.style.maxBlockSize) avail.style.removeProperty('max-block-size');

    /* AND THE TRIP EDITOR, THE THIRD THING BESIDE THE BOARD. Same reason as the
       availability pane -- it starts at the same y as the grid, so it should
       end where the grid ends -- and the stylesheet's own
       `max(24rem, 100dvh - 15rem)` is the hand-tuned number this function
       exists to replace. Left to it the editor came out visibly short of the
       other two, which is what rux saw.

       ONE DIFFERENCE, AND IT MATTERS: this takes a DEFINITE `block-size`, not a
       cap. Carbon's side panel inside it resolves `block-size: 100%` against
       this box, and a percentage against a parent with only a MAXIMUM resolves
       to auto -- which leaves the panel's `auto 1fr auto` rows unconstrained,
       the form unscrollable and the Save bar pushed down the page instead of
       pinned to the bottom. A cap here would look right and behave wrong. */
    const trip = document.getElementById('sch-trip');
    if (trip && !trip.hidden) {
      if (trip.style.blockSize !== panelNext) trip.style.blockSize = panelNext;
    } else if (trip && trip.style.blockSize) {
      trip.style.removeProperty('block-size');
    }
  }

  function fitColumns(sch) {
    // The stylesheet's own values, read back rather than duplicated here.
    // Cleared first so every measurement below is of the pane at its natural
    // size; reading a width this function set last time would shrink the grid
    // a little further on every pass.
    sch.style.removeProperty('inline-size');
    sch.style.removeProperty('--sch-day-track');
    // Cleared so the corner is measured at its own `max-content` again rather
    // than at the width pinned on the last pass, which would never shrink.
    sch.style.removeProperty('--sch-head-w');
    // The pane fills the board and its `clientWidth` below is how the available
    // room is learned; nothing narrows it any more, so `flex-grow` is left to
    // the stylesheet.
    // MEASURED, NOT PARSED. The bus column is `max-content` in the stylesheet
    // so it is exactly as wide as the widest thing in it -- there is no length
    // to read, and hand-setting one would clip the day a four-digit bus number
    // appears. The corner cell IS that column, so its rendered width is the
    // base, whatever the content turns out to be.
    const corner = sch.querySelector('.sch-corner');
    const headBase = corner ? Math.ceil(corner.getBoundingClientRect().width) : NaN;
    const dayMin = px(sch, '--sch-day-min');
    const days = parseInt(getComputedStyle(sch).getPropertyValue('--sch-days'), 10) || 7;
    const pane = sch.clientWidth;
    if (!pane || !Number.isFinite(headBase) || !Number.isFinite(dayMin)) return false;

    const available = pane - headBase;
    let day = Math.floor(available / days);
    let head = headBase;
    const crowded = day < dayMin;
    if (crowded) {
      // The floor binds and the grid is wider than the pane: it scrolls, there
      // is no leftover to place, and the head stays at its content width.
      day = Math.floor(dayMin);
    } else {
      // Everything the day columns did not take. Never less than headBase,
      // since `day` was floored from the same figure.
      head = pane - day * days;
    }
    sch.style.setProperty('--sch-day-track', `${day}px`);
    // PIN THE HEAD, which is what closes the right edge. It was `max-content`
    // and kept a fractional width while the arithmetic used a ceiled one, so
    // the difference fell out as daylight to the right of Sunday: measured a
    // 42.203px corner against a reserved 43 at 1440. It now carries the
    // flooring remainder as well, so the columns sum to the pane exactly.
    sch.style.setProperty('--sch-head-w', `${head}px`);

    /* THE ONE PLACE THAT KNOWS THE WEEK DOES NOT FIT. `crowded` is not a new
       measurement -- it is the branch above, named. The day floor binding IS
       "seven days need more room than the pane has", and sch-data.js needs to
       know it to decide which companion yields. Returning it keeps that
       arithmetic in one place: the last function that reserved room for a
       panel by computing it a second time is the one docs/log.md records an
       afternoon of disagreeing with itself. */
    return crowded;
  }

  /* THE PANEL TAKES ITS OWN ROOM NOW, so nothing here reserves it.
     `fitPanelRoom()` stood here and set `.sch-page`'s `padding-inline-end` to
     the measured width of a FIXED panel. The editor is a flex child of
     `.sch-board` since 2026-09-07 and makes room by existing, so the function,
     the `.sch-page--with-panel` class it keyed off and the stylesheet's
     no-script fallback are all gone -- three places that had to agree about one
     number. docs/log.md records the afternoon they did not: room reserved
     twice, a width read 320px mid-entrance, and a transitionend refit waiting
     on an animation that had been removed. */

  const sch = document.getElementById('sch');
  if (sch && 'ResizeObserver' in window) {
    // Observing the PANE, not the grid: the grid's width is what this changes,
    // so observing it would feed its own output back in.
    /* WHAT `crowded` MEANS TO A CALLER: the week is scrolling, so a region
       beside the board is costing days that are off the screen. It is read at
       the moment the trip editor opens and nowhere else -- this function runs
       on every resize frame, and yielding a panel on a measurement that moves
       under the pointer would collapse the roster mid-drag of a window edge. */
    let crowded = false;
    const fit = () => { fitHeight(sch); crowded = fitColumns(sch) === true; };

    // THE THREE WAYS THIS IS ASKED TO RUN, and why none of them alone is
    // enough. `window.resize` is the obvious one and is the only one proven
    // by hand here. The ResizeObserver covers the pane's own box changing
    // for a reason the window did not cause. And `Rux.schedule.fit` is the
    // EXPLICIT call, because the case that matters most is not a resize at
    // all: the status notification appearing above the grid -- a week with no
    // trips draws one -- pushes the pane down and takes from its height, and
    // that always happens inside a render, so the renderer says so rather
    // than leaving it to be noticed.
    //
    // THE OBSERVER PATH IS UNVERIFIED. This browser pane does not render
    // while it is hidden, and ResizeObserver delivers at paint, so no
    // callback ever arrived in testing -- a probe observer added by hand
    // counted zero over a change that moved the pane 80px. It is kept because
    // it is correct and free, not because it was seen working.
    const watch = new ResizeObserver(fit);
    watch.observe(sch);
    if (sch.parentElement) watch.observe(sch.parentElement);
    window.addEventListener('resize', fit);
    window.Rux = window.Rux || {};
    window.Rux.schedule = { fit, crowded: () => crowded };
    fit();
  }

  /* ── NOTHING WIDTH-DEPENDENT IS LEFT IN THIS FILE ──────────────────────────
     A `matchMedia` handler stood here and emptied itself four times in one day.
     It began as two class swaps -- `rux--btn--icon-only` and
     `rux--layout--size-md`/`-lg` toggled by width, because the toolbar's module
     was 40px on a desktop and wanted 48 on a phone, and because `Today`,
     `Drivers` and `New trip` were words at one width and glyphs at the other.

     Each of those stopped being about width. The module became Carbon's own 48
     everywhere; `Today` and `Drivers` became icon-only everywhere; `New trip`
     was hidden below `md` rather than squared off, which took
     `.sch-toolbar__label` with it; and then `New trip` left the toolbar
     entirely for the overflow menu, which took the last job -- renaming the
     trigger from "View options" to "More" -- because the menu holds the action
     at every width now and the markup can just say "More".

     KEPT AS A NOTE RATHER THAN DELETED SILENTLY, because "the toolbar has no
     breakpoint behaviour" is a fact worth being able to find. What responds to
     width here is CSS, in sch.css's one media block. */

})();
