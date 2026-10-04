/* ==========================================================================
   Design — COACHMARK
   --------------------------------------------------------------------------
   Requires js/overlay.js and js/popover.js. A coachmark's hint is a popover,
   and js/popover.js already opens and closes it from the beacon or the
   tagline. This module adds the three things that are the coachmark's own.

   WHAT IT DOES. The close button in the hint's header closes the hint. A
   tagline hides while its hint is open and returns when it closes. The
   tagline's own close button removes the coachmark.
   ========================================================================== */

/* BEHAVIOUR: verified-live · driven 2026-10-03 on
   https://ibm-products.carbondesignsystem.com/iframe.html?id=patterns-coachmark-fixed--coachmark-fixed
   and read against @carbon/ibm-products 2.99.0, the `next` Coachmark,
   CoachmarkContentHeader and CoachmarkTagline.

   READ OFF THE RUNNING COMPONENT:
     · pressing the tagline adds `popover--open` to the container and
       `coachmark-tagline--is-open` to the tagline, together
     · the header's close button takes both away, together

   ONE DIFFERENCE, deliberate: Carbon's tagline close button calls the
   consumer's `onClose` and does nothing else. Here it removes the coachmark
   and fires `rux:coachmark-closed`, as js/dismiss.js removes a notification.

   NOT WRITTEN: dragging a floating coachmark; the stacked and overlay
   patterns, which are compositions of their own. */
(() => {
  'use strict';
  const popover = window.Rux?.popover;
  if (!popover) return; // js/popover.js must load first

  const ROOT = '.rux--coachmark';
  const TAGLINE = '.rux--coachmark-tagline';
  const TAGLINE_OPEN = 'rux--coachmark-tagline--is-open';
  const CONTAINER = '.rux--popover-container';

  const taglineOf = container => container.querySelector(`:scope > ${TAGLINE}`);

  for (const type of ['rux:popover-opened', 'rux:popover-closed']) {
    document.addEventListener(type, event => {
      const tagline = event.target instanceof Element && taglineOf(event.target);
      if (tagline) tagline.classList.toggle(TAGLINE_OPEN, type === 'rux:popover-opened');
    });
  }

  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('button');
    const root = button?.closest(ROOT);
    if (!root) return;

    if (button.matches('.rux--coachmark-tagline--close-btn')) {
      const parent = root.parentNode;
      root.remove();
      parent?.dispatchEvent(new CustomEvent('rux:coachmark-closed', { bubbles: true }));
      return;
    }

    const header = button.closest('.rux--coachmark--content-header');
    if (!header || button.matches('.rux--coachmark--content-header--drag-icon')) return;
    const container = header.closest(CONTAINER);
    if (!container) return;
    // A hint written open is taken over first, so that it can be closed.
    if (!popover.isOpen(container)) popover.open(container);
    popover.close(container, { restoreFocus: true });
  });

  // The class the markup shipped agrees with the state the markup shipped.
  for (const container of document.querySelectorAll(`${ROOT} ${CONTAINER}`)) {
    taglineOf(container)?.classList.toggle(TAGLINE_OPEN, container.classList.contains('rux--popover--open'));
  }
})();
