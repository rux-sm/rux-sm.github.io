/* ==========================================================================
   Design — COACHMARK
   --------------------------------------------------------------------------
   Requires js/overlay.js and js/popover.js. A coachmark's hint is a popover,
   and js/popover.js already opens and closes it from the beacon or the
   tagline. This module adds the three things that are the coachmark's own.

   WHAT IT DOES. The close button in the hint's header closes the hint. A
   tagline hides while its hint is open and returns when it closes. The
   tagline's own close button removes the coachmark. A floating coachmark is
   dragged by its header, and moved from its handle with the arrow keys.
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

   THE FLOATING COACHMARK, read against CoachmarkContentHeader.js and
   makeDraggable.js, and driven here in Chrome and, by a finger, in Safari on
   the iPhone simulator, not on Carbon's page:
     · a press on the header drags the hint, and it stays where it is let go
     · Enter or Space on the handle starts drag mode and ends it; in it an
       arrow key moves the hint 8px, or 32px with Shift
     · the hint's content wears `content-header--is-dragging` while dragged
     · the header's instruction, its two status lines and the handle's
       `aria-pressed` say what Carbon's say, in Carbon's words

   A SECOND DIFFERENCE, deliberate: Carbon drags on mouse events. Pointer
   events are used here, so a finger drags it too.

   NOT WRITTEN: the stacked and overlay patterns. Their captures hold no
   class of their own; the stories lay them out with their own stylesheet. */
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

  /* ── floating: drag ───────────────────────────────────────────────────── */
  // The hint's whole layer moves: Carbon translates the `popover` the content
  // and the caret sit in, and so does this.
  const HEADER = '.rux--coachmark--floating .rux--coachmark--content-header';
  const HANDLE = '.rux--coachmark--content-header--drag-icon';
  const DRAGGING = 'rux--coachmark--content-header--is-dragging';
  const STEP = 8, SHIFT_STEP = 32;
  const ARROWS = { ArrowLeft: [-1, 0, 'left'], ArrowRight: [1, 0, 'right'], ArrowUp: [0, -1, 'up'], ArrowDown: [0, 1, 'down'] };

  const at = new WeakMap();        // layer -> [x, y], where it has been moved to
  const moves = new WeakMap();     // header -> how many moves it has announced
  const layerOf = header => header.closest('.rux--popover');
  // `will-change` gives the layer a surface of its own. Without it Safari on
  // an iPhone leaves a faint trail of the hint's shadow where it has been.
  const move = (layer, x, y) => {
    at.set(layer, [x, y]);
    layer.style.willChange = 'transform';
    layer.style.transform = `translate(${x}px, ${y}px)`;
  };

  // What the header says, to someone looking and to a screen reader.
  function say(header, dragging, moved = '') {
    const [status, movement] = header.querySelectorAll(':scope > [role="status"]');
    const how = header.querySelector(':scope > span.rux--visually-hidden');
    if (how) how.textContent = dragging
      ? 'Use arrow keys to move the coachmark. Press Enter or Space to exit drag mode.'
      : 'Press Enter or Space to activate drag mode.';
    if (status) status.textContent = dragging ? 'Drag mode active.' : 'Drag mode ended.';
    if (movement) movement.textContent = moved;
    header.querySelector(HANDLE)?.setAttribute('aria-pressed', String(dragging));
    header.closest('.rux--popover-content')?.classList.toggle(DRAGGING, dragging);
  }

  document.addEventListener('pointerdown', event => {
    const header = event.target instanceof Element && event.target.closest(HEADER);
    const layer = header && layerOf(header);
    if (!layer || event.button > 0) return;
    const [x, y] = at.get(layer) ?? [0, 0];
    const from = [event.clientX, event.clientY];
    say(header, true);
    const drag = e => move(layer, x + e.clientX - from[0], y + e.clientY - from[1]);
    const drop = () => {
      say(header, false);
      document.removeEventListener('pointermove', drag);
      document.removeEventListener('pointerup', drop);
      document.removeEventListener('pointercancel', drop);
    };
    document.addEventListener('pointermove', drag);
    document.addEventListener('pointerup', drop);
    document.addEventListener('pointercancel', drop);
  });

  document.addEventListener('keydown', event => {
    const handle = event.target instanceof Element && event.target.closest(HANDLE);
    const header = handle?.closest(HEADER);
    const layer = header && layerOf(header);
    if (!layer) return;
    let dragging = handle.getAttribute('aria-pressed') === 'true';
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      dragging = !dragging;
      say(header, dragging);
      return;
    }
    const arrow = ARROWS[event.key];
    if (!dragging || !arrow) return;
    event.preventDefault();
    const [dx, dy, direction] = arrow;
    const distance = event.shiftKey ? SHIFT_STEP : STEP;
    const [x, y] = at.get(layer) ?? [0, 0];
    move(layer, x + dx * distance, y + dy * distance);
    // The same words twice are announced once, so each move's line differs
    // from the last by a character nobody hears, as Carbon's does.
    const count = (moves.get(header) ?? 0) + 1;
    moves.set(header, count);
    say(header, true, `Moved ${direction} ${distance} pixels${'\u200B'.repeat(count)}`);
  });

  // The header is the grip, and says so under the pointer; a finger on it
  // drags the hint and not the page.
  for (const header of document.querySelectorAll(HEADER)) {
    header.style.cursor = 'move';
    header.style.touchAction = 'none';
  }

  // The class the markup shipped agrees with the state the markup shipped.
  for (const container of document.querySelectorAll(`${ROOT} ${CONTAINER}`)) {
    taglineOf(container)?.classList.toggle(TAGLINE_OPEN, container.classList.contains('rux--popover--open'));
  }
})();
