/* ==========================================================================
   rux-ds — TILE                                        Phase 5, roadmap §4.5
   --------------------------------------------------------------------------
   Requires js/overlay.js only for `autoId`. A tile is part of the page, not a
   surface over it, so it never joins the dismiss stack.

   THIS MODULE WRITES AN INLINE max-height, AND THAT IS THE ONE PLACE IT
   SHOULD. ui-shell's note says a behaviour layer for a CSS design system
   should never be writing widths — and it should not, when a class already
   expresses the state, as `side-nav--hidden` did. Here no class can:
   `tile-content__below-the-fold` is `visibility: hidden`, which still
   OCCUPIES LAYOUT, so a collapsed tile stands as tall as an expanded one and
   reserves space for content nobody can see. Measured in the sink before the
   fix: 140px tall, 48px of it hidden. The collapsed height depends on the
   content, so it cannot be a class, and Carbon's React sets the same inline
   value for the same reason.

   IT IS MEASURED ONCE, AT LOAD, and again on resize. Reading it at toggle
   time would measure a tile mid-transition and latch the wrong number.

   THREE SELECTION SHAPES, and only two of them are ours:
     role=checkbox      a <div> pretending to be a control, so click, Space
                        and Enter all have to be written
     tile-input + label a real radio input; the browser owns the toggle and
                        the label's `for`, and all this module does is mirror
                        the result onto `--is-selected` across the group
     clickable          an <a>. Nothing to do.
   Handling the radio input's click as well as its change would fire twice and
   cancel itself out — the defect §4.1.9 records for toggle.
   ========================================================================== */

/* BEHAVIOUR: verified-live · driven 2026-08-29 on
   https://react.carbondesignsystem.com/iframe.html?id=components-tile--expandable
   and https://react.carbondesignsystem.com/iframe.html?id=components-tile--selectable

   THE INLINE max-height IS CARBON'S, which is the claim this file most needed to defend
   because writing an inline dimension is the thing ui-shell's note forbids. Carbon's
   collapsed expandable tile carries `style="max-height: 232px"` on the tile itself, its
   `tile-content__below-the-fold` computes `visibility: hidden` at 400px tall, and the
   tile measures 232 against a 632 expanded. So the hidden fold really does occupy layout
   and the collapsed height really cannot be a class. Expanding CLEARS the inline value
   and adds `tile--is-expanded`; collapsing restores it. That is what setExpanded() does,
   down to clearing rather than setting a value.

   ALSO CONFIRMED: the expandable tile is a <button> carrying aria-expanded and
   aria-controls; the selectable tile is a <div role="checkbox" aria-checked tabindex="0">
   -- the div-pretending-to-be-a-control this file describes -- and selecting it adds
   `tile--is-selected` alongside aria-checked, which is the pair setChecked() writes.
   Enter toggles it.

   SPACE ON THE SELECTABLE TILE IS UNRESOLVED and is left that way rather than written up.
   Two runs disagreed -- one toggled, one did not -- which is most likely a focus artefact
   between tool calls, not a Carbon behaviour. This module handles Space and Enter and
   Carbon handles at least click and Enter, so nothing here is doing LESS than Carbon; the
   question is only whether it does slightly more.

   A NOTE ON METHOD THAT COST A WRONG MEASUREMENT ELSEWHERE: the browser tool's
   `key: "Space"` is not mapped and arrives as `key: ""`. Typing a space works. js/list-box.js
   records where that mattered.

   NOT VERIFIED: the radio-tile form -- syncRadios() and the tile-group mirroring were not
   driven -- and the resize re-measure.
   ========================================================================== */
(() => {
  'use strict';
  const overlay = window.Rux?.overlay;
  if (!overlay) return; // js/overlay.js must load first

  const EXPANDED = 'rux--tile--is-expanded';
  const SELECTED = 'rux--tile--is-selected';
  const collapsedHeights = new WeakMap();

  const belowOf = tile => tile.querySelector('.rux--tile-content__below-the-fold');
  const isDisabled = el => el.getAttribute('aria-disabled') === 'true' || el.disabled === true;

  /* ── expandable ────────────────────────────────────────────────────────── */
  //
  // COLLAPSED IS THE ABOVE-THE-FOLD'S EXTENT, NOT `full - hidden`.
  //
  // This read `full - hidden` until 2026-08-31 and reproduced Carbon exactly,
  // because the two agree whenever the gap between the fold halves is ZERO --
  // and Carbon's is zero. Measured on the running story: the gap between
  // `__above-the-fold` and `__below-the-fold` is 0px, both compute margin 0
  // and padding 0, and Carbon's own demos supply their spacing with inline
  // styles INSIDE the fold content.
  //
  // The moment a page puts real spacing between the halves the proxy breaks:
  // the gap sits above the hidden fold, so subtracting only the fold leaves
  // the gap in the collapsed height and the tile carries dead space under its
  // last visible element. sink/tile.html hit exactly that -- 132px became
  // 148px when its two halves were given 16px of rhythm.
  //
  // Measuring what the name means fixes it and STILL REPRODUCES CARBON. Their
  // collapsed tile is 232px: 16px padding + a 200px above-the-fold + 16px
  // padding. Ours is 132px: 16 + 100 + 16, with the 16px gap correctly
  // excluded because it falls below the above-the-fold.
  //
  // The first `.rux--tile-content` is the above-the-fold block. The fragments
  // do not carry `__above-the-fold` itself -- @carbon/styles defines no rule
  // for it, so check-classes rejects it (§4.1.12) -- and the wrapper is what
  // survives, which is why this selects the content block rather than the
  // class Carbon's DOM shows.
  function measure(tile) {
    const below = belowOf(tile);
    const above = tile.querySelector('.rux--tile-content');
    if (!below || !above) return;
    const was = tile.style.maxHeight;
    tile.style.maxHeight = '';                       // measure unconstrained
    const cs = getComputedStyle(tile);
    const collapsed = above.getBoundingClientRect().bottom
      - tile.getBoundingClientRect().top
      + parseFloat(cs.paddingBlockEnd) + parseFloat(cs.borderBlockEndWidth);
    collapsedHeights.set(tile, Math.round(collapsed));
    tile.style.maxHeight = was;
  }

  function setExpanded(tile, open) {
    if (isDisabled(tile)) return;
    tile.classList.toggle(EXPANDED, open);
    const collapsed = collapsedHeights.get(tile);
    tile.style.maxHeight = open || collapsed == null ? '' : `${collapsed}px`;

    // The control is the tile itself, unless the fold holds its own controls —
    // then it is the chevron, because a button cannot nest inside a button.
    const control = tile.querySelector(':scope > div > .rux--tile__chevron--interactive')
      ?? (tile.tagName === 'BUTTON' ? tile : null);
    control?.setAttribute('aria-expanded', String(open));
    const below = belowOf(tile);
    if (below && control) control.setAttribute('aria-controls', overlay.autoId(below, 'rux-tile-fold'));
    tile.dispatchEvent(new CustomEvent(open ? 'rux:tile-expanded' : 'rux:tile-collapsed',
      { bubbles: true }));
  }

  /* ── selectable ────────────────────────────────────────────────────────── */
  function setChecked(tile, on) {
    if (isDisabled(tile)) return;
    tile.setAttribute('aria-checked', String(on));
    tile.classList.toggle(SELECTED, on);
    tile.dispatchEvent(new CustomEvent('rux:tile-selected', { bubbles: true, detail: { on } }));
  }

  // A radio tile's truth is its input; every label in the group is re-mirrored
  // because selecting one necessarily DEselects another.
  function syncRadios(input) {
    const scope = input.closest('.rux--tile-group') ?? document;
    for (const other of scope.querySelectorAll(`input.rux--tile-input[name="${input.name}"]`)) {
      const label = other.id ? scope.querySelector(`label[for="${other.id}"]`) : null;
      label?.classList.toggle(SELECTED, other.checked);
    }
  }

  /* ── wiring ────────────────────────────────────────────────────────────── */
  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;

    const chevron = event.target.closest('.rux--tile__chevron--interactive');
    if (chevron) {
      const tile = chevron.closest('.rux--tile--expandable');
      if (tile) { event.preventDefault(); setExpanded(tile, !tile.classList.contains(EXPANDED)); }
      return;
    }
    // A tile whose fold has its own controls is NOT expanded by clicking the
    // body: the controls are what the body is for.
    const expandable = event.target.closest('.rux--tile--expandable:not(.rux--tile--expandable--interactive)');
    if (expandable) { setExpanded(expandable, !expandable.classList.contains(EXPANDED)); return; }

    const checkable = event.target.closest('.rux--tile--selectable[role="checkbox"]');
    if (checkable) setChecked(checkable, checkable.getAttribute('aria-checked') !== 'true');
  });

  document.addEventListener('keydown', event => {
    if (!(event.target instanceof Element)) return;
    if (event.key !== ' ' && event.key !== 'Enter') return;
    // Only the div-pretending-to-be-a-control needs this; a <button> tile and a
    // real radio input already do it.
    const checkable = event.target.closest('.rux--tile--selectable[role="checkbox"]');
    if (!checkable) return;
    event.preventDefault();
    setChecked(checkable, checkable.getAttribute('aria-checked') !== 'true');
  });

  document.addEventListener('change', event => {
    const input = event.target;
    if (input instanceof Element && input.matches('input.rux--tile-input')) syncRadios(input);
  });

  window.addEventListener('resize', () => {
    for (const tile of document.querySelectorAll('.rux--tile--expandable')) {
      if (tile.classList.contains(EXPANDED)) continue;
      measure(tile);
      setExpanded(tile, false);
    }
  });

  /* Adopt the markup: measure every fold, apply the collapsed cap to the ones
     that ship closed, and mirror each radio group onto its labels. */
  for (const tile of document.querySelectorAll('.rux--tile--expandable')) {
    measure(tile);
    setExpanded(tile, tile.classList.contains(EXPANDED));
  }
  for (const tile of document.querySelectorAll('.rux--tile--selectable[role="checkbox"]'))
    tile.classList.toggle(SELECTED, tile.getAttribute('aria-checked') === 'true');
  for (const input of document.querySelectorAll('input.rux--tile-input:checked')) syncRadios(input);

  window.Rux.tile = {
    expand: (tile, open) => setExpanded(tile, open ?? !tile.classList.contains(EXPANDED)),
    select: (tile, on) => setChecked(tile, on ?? tile.getAttribute('aria-checked') !== 'true'),
  };
})();
