/* ==========================================================================
   rux-ds — ACCORDION                                   Phase 5, roadmap §4.5
   --------------------------------------------------------------------------
   Requires js/overlay.js only for `autoId`. An accordion is not a dismissible
   surface: it does not overlay anything, Escape does not close it, and a
   click elsewhere leaves it open. It never joins the stack.

   THIS MODULE IS SMALL ON PURPOSE, and the reasons are worth writing down
   because "it barely does anything" is otherwise a smell.

   The heading is a real <button>, so Enter and Space already work and a
   disabled item is already unreachable — the browser owns both. The panel is
   `display: none` until `__item--active` is on its parent, so a collapsed
   section is already out of the accessibility tree; there is no `hidden` to
   manage, and adding one would fight the max-block-size transition.

   ARROW KEYS ARE DELIBERATELY ABSENT. The ARIA APG lists Up/Down and Home/End
   for accordions as OPTIONAL, and Carbon React does not implement them — its
   headings are plain buttons. Adding them would take Up and Down away from
   page scrolling inside a component where nothing else does that, and would be
   this system inventing behaviour rather than making Carbon's work. If a
   template ever needs it, it is a decision to record, not a gap to fill.

   `aria-controls` IS CARBON'S, NOT OURS. This block used to claim Carbon
   "emits aria-expanded and stops" and that the attribute was our addition.
   Measured on the running accordion 2026-08-29, that is false: every Carbon
   heading carries `aria-controls`, pointing at the `__content` div — not at
   the `__wrapper` this module used to name. Both sit inside the collapsed
   subtree so either resolves, but the content IS the panel and the wrapper is
   the box that animates it, so this now points where Carbon points.

   `role="region"` is still NOT added — the APG warns off landmarks once there
   are more than a handful of panels, and a sink section with three accordions
   would make six. Carbon does not add it either.

   And the markup's own state is adopted at load, so an item shipped
   `--active` has `aria-expanded="true"` whether or not the author remembered.
   ========================================================================== */

/* BEHAVIOUR: verified-live · driven 2026-08-29 on
   https://react.carbondesignsystem.com/iframe.html?id=components-accordion--default
   clicking real headings and sending real key events.

   THE DECLINE IS REAL, which is this file's central claim and the one most worth
   checking, since "we deliberately do nothing" is otherwise unfalsifiable. With a
   heading focused, ArrowDown moved nothing and End moved nothing -- focus stayed on the
   heading and no aria-expanded changed. Carbon implements no arrow-key navigation here,
   so neither does this.

   ALSO CONFIRMED: the heading is a real <button type="button">; clicking it toggles
   `__item--active` and `aria-expanded` together; the wrapper is display:none while
   collapsed; and SEVERAL ITEMS STAY OPEN AT ONCE -- opening a second did not close the
   first, so there is no single-open behaviour to implement.

   ONE CLAIM ABOVE WAS FALSE AND IS CORRECTED. Carbon does emit `aria-controls`; it was
   never our addition, and it points at `__content` rather than `__wrapper`.

   NOT VERIFIED: a disabled item. The default story has none, and ours is markup-only --
   a disabled <button> is unreachable by the browser's own rules.
   ========================================================================== */
(() => {
  'use strict';
  const overlay = window.Rux?.overlay;
  if (!overlay) return; // js/overlay.js must load first

  const ITEM = '.rux--accordion__item';
  const ACTIVE = 'rux--accordion__item--active';

  const wrapperOf = item => item.querySelector(':scope > .rux--accordion__wrapper');
  // The panel aria-controls names. Carbon points at the content; the wrapper is
  // the animating box around it. Falls back to the wrapper for markup that has
  // no content div of its own.
  const panelOf = item => item.querySelector(':scope > .rux--accordion__wrapper > .rux--accordion__content')
    || wrapperOf(item);
  const headingOf = item => item.querySelector(':scope > .rux--accordion__heading');
  const isDisabled = item => item.classList.contains('rux--accordion__item--disabled')
    || headingOf(item)?.disabled === true;

  function set(item, open) {
    if (!item || isDisabled(item)) return;
    item.classList.toggle(ACTIVE, open);
    headingOf(item)?.setAttribute('aria-expanded', String(open));
    item.dispatchEvent(new CustomEvent(open ? 'rux:accordion-opened' : 'rux:accordion-closed',
      { bubbles: true }));
  }

  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const heading = event.target.closest('.rux--accordion__heading');
    const item = heading?.closest(ITEM);
    if (!item) return;
    event.preventDefault();
    set(item, !item.classList.contains(ACTIVE));
  });

  /* Wire aria-controls, and make aria-expanded agree with the class the markup
     shipped. Both are things a template author should not have to remember. */
  for (const item of document.querySelectorAll(ITEM)) {
    const heading = headingOf(item), panel = panelOf(item);
    if (!heading) continue;
    if (panel) heading.setAttribute('aria-controls', overlay.autoId(panel, 'rux-accordion'));
    heading.setAttribute('aria-expanded', String(item.classList.contains(ACTIVE)));
  }

  window.Rux.accordion = {
    open: item => set(item, true),
    close: item => set(item, false),
    toggle: item => set(item, !item.classList.contains(ACTIVE)),
    isOpen: item => item.classList.contains(ACTIVE),
  };
})();
