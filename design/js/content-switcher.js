/* ==========================================================================
   Design — CONTENT SWITCHER
   --------------------------------------------------------------------------
   Requires nothing. A content switcher is part of the page, not a surface
   over it, so it never joins the dismiss stack and needs no kernel.

   IT IS A TABLIST WITH NO PANELS OF ITS OWN. Carbon's switcher carries
   role="tablist" and role="tab" and stops there: which content shows is the
   consumer's, told through onChange. So this module moves the selection and
   says so with an event, and switches nothing else. js/tabs.js is the module
   that owns panels, and it binds to the tabs' own list, never to a switcher.

   SELECTION FOLLOWS FOCUS, as in the tabs: an arrow moves focus, the selected
   class, aria-selected and the tab stop together. Exactly one option is in
   the document's tab order, the selected one.

   THE ICON-ONLY VARIANT WRAPS EACH OPTION, and the wrapper carries the state
   too. Carbon's divider rules read `popover--selected` off the wrapper, as a
   sibling of the next one, so a selection that moved only the button's class
   would leave a divider drawn beside the chosen icon.

   A DISABLED OPTION IS SKIPPED BY THE ARROWS rather than focused and refused.
   A disabled <button> cannot take focus, so including it in the ring would
   make one arrow press appear to do nothing. A switcher whose options are all
   disabled has no tab stop at all.

   THE EVENT IS THE HOOK. `rux:content-switcher-selected` bubbles from the
   switcher with the option, its index and its text, which is what Carbon's
   onChange hands a consumer. It fires when the selection changes, not when
   the selected option is pressed again.

   A PAGE SETS THE SELECTION TOO, when it loads saved state. `select()` takes
   `focus: false` so that does not pull focus to the switcher, and
   `silent: true` so the page is not told about a change it made itself.
   ========================================================================== */

/* BEHAVIOUR: verified-live · driven 2026-10-04 on
   https://react.carbondesignsystem.com/iframe.html?id=components-contentswitcher--default
   and https://react.carbondesignsystem.com/iframe.html?id=components-contentswitcher--icon-only
   clicking a real option and sending real key events, reading aria-selected, tabIndex,
   the selected class and the focused element after each.

   CONFIRMED: role="tablist" on the switcher and role="tab" on each <button type="button">.
   Roving tabindex, selected 0 and every other -1. A click selects and focuses. ArrowRight
   and ArrowLeft move focus and selection together, and THEY WRAP: ArrowRight on the last
   option lands on the first and ArrowLeft on the first lands on the last. On the icon-only
   story the wrapper of the selected option gains `content-switcher-popover--selected` and
   the others lose it, on a click and on an arrow alike.

   CARBON DOES NOT ANSWER Home, End, ArrowUp or ArrowDown here, which is where it differs
   from its own tabs: each was pressed and nothing moved. This module answers none of them
   either.

   NOT VERIFIED: a disabled option among enabled ones. No story renders one, so whether
   Carbon's arrows skip it or stop on it was not seen; skipping is this module's choice,
   for the reason given above. The `selectionMode="manual"` prop, where an arrow moves
   focus and Enter selects, is not implemented.
   ========================================================================== */
(() => {
  'use strict';

  const SWITCHER = '.rux--content-switcher[role="tablist"]';
  const OPTION = '.rux--content-switcher-btn';
  const SELECTED = 'rux--content-switcher--selected';
  const WRAPPER = '.rux--content-switcher-popover__wrapper';
  const WRAPPER_SELECTED = 'rux--content-switcher-popover--selected';

  const optionsIn = switcher => [...switcher.querySelectorAll(OPTION)];
  const ringIn = switcher => optionsIn(switcher).filter(o => !o.disabled);

  // Class, aria-selected, the wrapper's class and the tab stop, written for
  // every option so no two can disagree. A disabled option is never a tab stop.
  function paint(switcher, chosen) {
    for (const o of optionsIn(switcher)) {
      const on = o === chosen;
      o.classList.toggle(SELECTED, on);
      o.setAttribute('aria-selected', String(on));
      o.tabIndex = on && !o.disabled ? 0 : -1;
      o.closest(WRAPPER)?.classList.toggle(WRAPPER_SELECTED, on);
    }
  }

  function select(switcher, option, options = {}) {
    if (!option || option.disabled || !switcher.contains(option)) return;
    const all = optionsIn(switcher);
    const changed = !option.classList.contains(SELECTED);
    paint(switcher, option);
    if (options.focus !== false) option.focus();
    if (changed && !options.silent) switcher.dispatchEvent(new CustomEvent('rux:content-switcher-selected', {
      bubbles: true,
      detail: { option, index: all.indexOf(option), text: option.textContent.trim() || option.getAttribute('aria-label') || '' },
    }));
  }

  /* ── pointer ──────────────────────────────────────────────────────────── */
  // Enter and Space arrive here too: the option is a <button>, and the browser
  // turns either key into a click.
  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const option = event.target.closest(OPTION);
    const switcher = option?.closest(SWITCHER);
    if (switcher) select(switcher, option);
  });

  /* ── the arrows ───────────────────────────────────────────────────────── */
  document.addEventListener('keydown', event => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    if (!(event.target instanceof Element)) return;
    const option = event.target.closest(OPTION);
    const switcher = option?.closest(SWITCHER);
    if (!switcher) return;
    const ring = ringIn(switcher);
    const at = ring.indexOf(option);
    if (at < 0 || ring.length < 2) return;
    event.preventDefault();
    const by = event.key === 'ArrowRight' ? 1 : -1;
    select(switcher, ring[(at + by + ring.length) % ring.length]);
  });

  /* Markup may ship every option tabbable, or none. Put the one tab stop on
     the selected option, where the markup names one; this selects nothing and
     fires no event. */
  for (const switcher of document.querySelectorAll(SWITCHER)) {
    const chosen = optionsIn(switcher).find(o => o.classList.contains(SELECTED));
    if (chosen) paint(switcher, chosen);
  }

  window.Rux = window.Rux || {};
  window.Rux.contentSwitcher = { select: (switcher, option, options) => select(switcher, option, options) };
})();
