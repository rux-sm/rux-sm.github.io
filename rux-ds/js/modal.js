/* ==========================================================================
   rux-ds — MODAL                                       Phase 5, roadmap §4.5
   --------------------------------------------------------------------------
   Requires js/overlay.js, loaded first.

   THE MARKUP IS THE API. There is no `new Modal(el)` and nothing to call: a
   trigger carrying `data-rux-open="<id>"` opens the modal with that id, and
   anything carrying `data-rux-close` inside a modal closes it. This is the
   one place rux-ds departs from rux-ui's shape deliberately — rux-ui exposes
   an imperative `RuxModal.open(el)` because an application calls it, while
   this system's consumer generates MARKUP and never writes the call. A page
   built from a template must work with no script of its own.

   `data-rux-*` is our own contract, and it has to be: Carbon's is React
   props, which have no HTML equivalent to copy. The attribute names are the
   only invention in this file; every class it touches is Carbon's.

   WHAT THE CSS ALREADY DOES, so this module does not.
   `.rux--modal:not(.--enable-presence)` is `visibility: hidden; opacity: 0`
   and `.is-visible` reverses both — so `is-visible` is the entire show hook,
   and a closed modal is already out of the accessibility tree. No `hidden`
   toggle, no `aria-hidden` bookkeeping, no display juggling.

   WHAT THE KERNEL DOES, so this module does not: Escape, outside-press, and
   the stack that decides which surface a press belongs to.

   The record's `element` is the CONTAINER, not the modal root. The root is
   the scrim — it fills the viewport, so registering it would make a press on
   the backdrop "inside" the surface and the backdrop would never dismiss.
   ========================================================================== */

/* BEHAVIOUR: verified-live · driven 2026-08-29 on
   https://react.carbondesignsystem.com/iframe.html?id=components-modal--default
   -- opened from its launch button, closed with Escape, reading the class list, the
   container's attributes and document.activeElement at each step.

   CONFIRMED: `is-visible` on the root is the entire show hook, added on open and removed
   on close, exactly as the header above claims. Nothing else toggles.

   WHERE THE DIALOG ROLE LIVES WAS WRONG HERE, and it is the finding of this pass. Carbon
   puts `role="presentation"` on the ROOT -- the full-viewport scrim -- and
   `role="dialog" aria-modal="true" aria-label tabindex="-1"` on the CONTAINER. Our markup
   had all of it on the root, which made the scrim the dialog and left the container
   unlabelled and unfocusable. The module was already right: its own header says the
   record's element is the CONTAINER, so the markup had been disagreeing with the module.
   Fixed across all six modals in sink/modal.html.

   WHAT CARBON FOCUSES ON OPEN: the element carrying `data-modal-primary-focus`, NOT the
   first focusable. In its story that is the first text input while the close button comes
   first in the DOM. Ours reads `[autofocus]` and falls back to the first focusable, which
   is the same shape of rule with a different attribute; no rux markup designates either,
   so ours lands on the close button. Recorded, not changed -- Carbon's attribute is a
   React prop name and copying it would invent a contract.

   TWO DELIBERATE DIVERGENCES, both measured and both kept:
   * CARBON DOES NOT RESTORE FOCUS. After Escape, document.activeElement was BODY, not the
     launch button. Ours restores to the trigger, which is a fix this project made after
     watching a keyboard user get stranded at the top of the page. Keeping it.
   * Carbon sets NOTHING on the trigger. We keep `aria-haspopup` and `aria-controls`, and
     dropped `aria-expanded`, which was both absent from Carbon and wrong for a dialog.
     See show() for the reasoning.
   ========================================================================== */
(() => {
  'use strict';
  const overlay = window.Rux?.overlay;
  if (!overlay) return; // js/overlay.js must load first

  const OPEN = 'is-visible';
  const open = new Map(); // modal root -> { releaseTrap, registration, trigger }

  const containerOf = modal => modal.querySelector('.rux--modal-container') || modal;

  function close(modal, options = {}) {
    const state = open.get(modal);
    if (!state) return;
    open.delete(modal);
    modal.classList.remove(OPEN);
    state.registration?.release();
    // The trap owns focus restoration and was told where to send it (see
    // show()), so this only passes the flag. One owner, not two racing.
    state.releaseTrap?.({ restoreFocus: options.restoreFocus !== false });
    modal.dispatchEvent(new CustomEvent('rux:modal-closed', { bubbles: true }));
  }

  function show(modal, trigger) {
    if (open.has(modal)) return;
    const container = containerOf(modal);

    // CARBON SETS NOTHING ON THE TRIGGER — measured on components-modal--default
    // 2026-08-29, where the launch button carries only `class` and `type` before
    // and after opening. This file used to set three attributes; one of them was
    // wrong and two are kept as deliberate additions.
    //
    // `aria-expanded` IS GONE. It describes a region that expands in place, and
    // a modal is not one: a screen reader announced "collapsed" for a button
    // that opens a dialog and then "expanded" for one whose dialog had taken
    // over the screen. It was also unpaired — close() set it back to false, so
    // the wrong state was being maintained carefully.
    //
    // `aria-haspopup` and `aria-controls` STAY, and that is a departure from
    // Carbon recorded rather than hidden. They are additive and true: the button
    // does open a dialog, and the dialog it opens is the one named. Nothing here
    // invents BEHAVIOUR, which is what the one rule is about; dropping them
    // would make the system worse for an AT user to match an absence.
    if (trigger) {
      trigger.setAttribute('aria-haspopup', 'dialog');
      trigger.setAttribute('aria-controls', overlay.autoId(modal, 'rux-modal'));
    }

    const registration = overlay.register({
      element: container,
      anchor: trigger,
      close: opts => close(modal, opts),
    });

    modal.classList.add(OPEN);
    // Trap AFTER the class lands: focusables() skips anything with no
    // offsetParent, and the container has none while the root is still
    // `visibility: hidden`.
    //
    // restoreTo is the TRIGGER, not whatever held focus. Clicking a button does
    // not focus it in Firefox or Safari on macOS, so the fallback would send
    // Escape's focus to <body> and strand a keyboard user at the top of the
    // page. Verified in the sink before the fix, which is how it was found.
    const releaseTrap = overlay.trapFocus(container, { restoreTo: trigger || undefined });
    open.set(modal, { registration, releaseTrap, trigger });
    modal.dispatchEvent(new CustomEvent('rux:modal-opened', { bubbles: true }));
  }

  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;

    const trigger = event.target.closest('[data-rux-open]');
    if (trigger) {
      const modal = document.getElementById(trigger.getAttribute('data-rux-open'));
      if (modal?.classList.contains('rux--modal')) { event.preventDefault(); show(modal, trigger); }
      return;
    }

    const closer = event.target.closest('[data-rux-close]');
    if (closer) {
      const modal = closer.closest('.rux--modal');
      if (modal) { event.preventDefault(); close(modal, { restoreFocus: true }); }
    }
  });

  window.Rux.modal = {
    open: (modalOrId, trigger) => {
      const modal = typeof modalOrId === 'string' ? document.getElementById(modalOrId) : modalOrId;
      if (modal) show(modal, trigger || null);
    },
    close: modalOrId => {
      const modal = typeof modalOrId === 'string' ? document.getElementById(modalOrId) : modalOrId;
      if (modal) close(modal, { restoreFocus: true });
    },
  };
})();
