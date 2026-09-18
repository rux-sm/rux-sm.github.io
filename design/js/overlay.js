/* ==========================================================================
   Design — OVERLAY KERNEL
   --------------------------------------------------------------------------
   One dismiss manager for every dismissible surface: modal, menu, overflow
   menu, popover, tooltip, the list-box surfaces behind dropdown and select,
   and the shell's nav panels. Load this FIRST; the others delegate to it.

   Why a kernel rather than a listener per component. Each surface otherwise
   binds its own document-level outside-press and Escape handlers, and then
   two of them disagree about who owns a click: a menu opened from a button
   inside a popover closes the popover, or Escape dismisses the wrong one, or
   both dismiss and the page jumps. Registering instead makes the order a
   property of one stack rather than of listener-attachment order, which is
   not something the markup can control.

   THE STACK IS BOTTOM → TOP. Opening a surface dismisses everything above the
   topmost surface that already contains the newcomer's anchor. Nesting then
   works without either module knowing the other exists: a menu whose trigger
   lives inside a popover pushes onto the stack above that popover and leaves
   it standing, while a menu opened from the page dismisses both.

   API
   ---
   Rux.overlay.register(record) → { release }
     record.element        the surface itself (required)
     record.anchor         the trigger, if any — used for nesting and for
                           deciding whether a press landed "inside"
     record.close(opts)    called to dismiss; receives { restoreFocus }
     record.reposition()   optional; called on resize AND on scroll (capture)
                           while registered
     record.dismissOn      optional { outside = true, escape = true }
     record.dismissOthers  optional; false means "opening me closes nothing".
                           A hover tooltip needs this: it appears because a
                           pointer crossed it, not because anyone chose it, and
                           it must not tear down a menu the user is working in.
                           It still sits on the stack, so Escape reaches it
                           first and an outside press still dismisses it.
   release()               leave the stack WITHOUT being closed. Call it from
                           your own close(), or the kernel would call close()
                           again on a surface already closing.

   Rux.overlay.autoId(el, prefix)   → id, assigning one if absent
   Rux.overlay.focusables(root)     → the tabbable elements inside root
   Rux.overlay.trapFocus(el, opts)  → release(opts); Tab cycling, initial
                                      focus, and focus restore on release.
                                      opts.restoreTo names the element to
                                      restore to — pass it whenever you know
                                      the trigger; see below.

   NO POSITIONING ENGINE, and that is a finding rather than an omission.
   rux-ui needed one because it placed surfaces itself; Carbon places them
   with classes — `popover--bottom`, `popover--left-end` and their siblings
   are static CSS, and the auto-align variant is the only one that needs
   measurement. Until a template asks for `popover--auto-align`, the record's
   optional reposition() is the whole of the contract.

   ONE ANCHOR IS NOT THAT ENGINE. `Rux.anchorTo` lives at the foot of this file
   because two components — js/menu.js and js/list-box.js — need the same
   below-or-above answer for a `fixed` surface, and the second copy would have
   been the one that missed the next fix. It measures one element and writes
   two insets; collision against arbitrary ancestors and auto-align are still
   the engine this kernel declines.

   NO PORTALING HERE — AND CARBON DOES PORTAL, FOR ONE SURFACE. This paragraph
   used to say Carbon "keeps every surface inline next to its trigger". Measured
   on 2026-08-29 that is true for two families and false for the third:

     popover          inside `.cds--popover-container`, `position: absolute`,
                      no inline style. Placed by class.
     list-box menu    inside `.cds--dropdown`, same. Placed by class.
     overflow menu    PORTALED. The options list leaves the trigger's
                      `overflow-menu__wrapper` entirely and renders as a sibling
                      DIV under `cds--layout`, positioned by an inline
                      `top`/`left` in VIEWPORT coordinates.

   Design does not portal any of them: our overflow list stays beside its
   trigger and js/menu.js writes an offset relative to the shared wrapper, so
   the two arrive at the same place by different arithmetic (that module's
   header carries the measurement).

   WHAT PORTALING BUYS, stated so the next reader does not have to rediscover
   it: a portaled surface escapes both an ancestor's stacking context and its
   `overflow`. We still portal nothing, and a surface left `absolute` escapes
   neither — but `position: fixed` buys the second half on its own, because a
   fixed box is laid out against the viewport. A menu's own surface is fixed in
   Carbon's compiled CSS, and js/list-box.js now makes an open list fixed for
   the same reason. The stacking context is the half still unbought.

   The first cost is already paid and recorded — sink/harness.css isolates every
   section because our in-place surfaces painted over an open modal, which a
   portaled surface would not have done.

   The second STOPPED BEING LATENT, and the surface it caught was the list box's
   menu, not a table's. A combo box inside the scheduler's trip panel — which
   scrolls — had its menu cut off at the panel's edge, measured 80px past it,
   with the options beyond the cut neither visible nor reachable. That is why
   the menu is now fixed. The row overflow menu is a different surface and is
   NOT fixed: it is absolutely positioned inside `.rux--data-table-content`,
   which computes `overflow: auto`, so the same cut is still available to it.
   Checked on templates/table-page.html: a two-item list built into the last row
   ends 209px clear of the content edge, so nothing is clipped there today.
   LEAVING IT ABSOLUTE IS THE DECISION, not an omission: no row menu has been
   reported cut off, and the narrower change is the one that can be judged. It
   is a condition to watch, and making it fixed is the same one-line change made
   here if a row menu is ever reported clipped.
   ========================================================================== */

/* BEHAVIOUR: verified-live · read 2026-08-29 from three running stories —
   https://react.carbondesignsystem.com/iframe.html?id=components-overflowmenu--default
   plus components-dropdown--default and components-popover--default. What was read is
   WHERE EACH SURFACE LIVES: popover and the list-box menu stay inside their own
   containers and are placed by class; the overflow menu is portaled out to a sibling
   DIV and placed by an inline style in viewport coordinates. The header above is
   corrected accordingly — it had claimed Carbon never portals.

   NOT VERIFIED, AND NOT VERIFIABLE FROM THE STORY SET: the dismiss ORDER, which is
   this kernel's whole reason for existing and still its least corroborated part.
   Confirming it needs a page where two dismissible surfaces overlap — a menu whose
   trigger sits inside a popover — and no story was found that renders one. Building
   such a page here would test the construction, not Carbon. So the stack, the
   contains-the-anchor rule and the dismissOthers escape hatch remain derived from the
   ARIA patterns, and that gap is a property of the reference rather than of the search.
   ========================================================================== */
(() => {
  'use strict';

  const FOCUSABLE = [
    'a[href]',
    'button:not(:disabled)',
    'input:not(:disabled):not([type="hidden"])',
    'select:not(:disabled)',
    'textarea:not(:disabled)',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  /* Bottom → top. */
  const stack = [];

  const contains = (record, target) =>
    Boolean(target && (record.element.contains(target) || record.anchor?.contains?.(target)));

  /* The topmost record containing `target`, or null. */
  function topmostContaining(target) {
    for (let i = stack.length - 1; i >= 0; i--) if (contains(stack[i], target)) return stack[i];
    return null;
  }

  function drop(record) {
    const i = stack.indexOf(record);
    if (i !== -1) stack.splice(i, 1);
  }

  /* Dismiss everything above `boundary` (null = all), top first. `guard` may
     veto a record, in which case it and everything below it survive.

     The boundary is a RECORD, not an index, and the loop is bounded: a close()
     handler is free to dismiss surfaces of its own, which shifts the stack
     under us mid-iteration. */
  function dismissAbove(boundary, options, guard) {
    let safety = stack.length;
    while (safety-- > 0) {
      const top = stack[stack.length - 1];
      if (!top || top === boundary) return;
      if (guard && !guard(top)) return;
      drop(top);
      top.close?.(options);
    }
  }

  function register(record) {
    if (!record?.element) return null;
    // Re-opening a surface REPLACES its record rather than nesting inside
    // itself; a stale record leaves the stack out of step with the page.
    const existing = stack.find(entry => entry.element === record.element);
    if (existing) drop(existing);
    if (record.dismissOthers !== false)
      dismissAbove(topmostContaining(record.anchor), { restoreFocus: false });
    stack.push(record);
    return { release: () => drop(record) };
  }

  function autoId(element, prefix) {
    if (!element.id) element.id = `${prefix}-${(counter++).toString(36)}`;
    return element.id;
  }
  // A counter, not Math.random(): ids land in the DOM, and a deterministic one
  // means two loads of the same page produce the same document.
  let counter = 1;

  const focusables = root =>
    [...root.querySelectorAll(FOCUSABLE)].filter(
      el => !el.hidden && el.getAttribute('aria-hidden') !== 'true' && el.offsetParent !== null);

  /* Keeps Tab and Shift+Tab inside `element`, so a keyboard user cannot reach
     the page behind a modal surface. Returns release(), which also restores
     focus.

     RESTORE TO `options.restoreTo` WHEN YOU HAVE IT. Falling back to whatever
     held focus when the trap was installed is a guess, and it is wrong in a
     case that matters: clicking a <button> does not focus it in Firefox or
     Safari on macOS, so activeElement is <body> and Escape drops the user at
     the top of the document instead of returning them to the control they
     opened the surface from. A caller that knows its trigger must say so. */
  function trapFocus(element, options = {}) {
    const previous = options.restoreTo ?? document.activeElement;
    (element.querySelector('[autofocus]') || focusables(element)[0])?.focus?.();

    function onKeydown(event) {
      if (event.key !== 'Tab' || element.hidden) return;
      const nodes = focusables(element);
      if (!nodes.length) return;
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    }

    document.addEventListener('keydown', onKeydown);
    return function release(releaseOptions = {}) {
      document.removeEventListener('keydown', onKeydown);
      const restore = releaseOptions.restoreFocus ?? options.restoreFocus ?? true;
      if (restore) previous?.focus?.({ preventScroll: true });
    };
  }

  /* ── The one set of document-level dismiss listeners ───────────────────── */

  // CAPTURE PHASE, and pointerdown rather than click, so this settles before
  // the pressed control takes focus and before the previously focused input
  // fires blur. A surface that closes on blur would otherwise race this.
  document.addEventListener('pointerdown', event => {
    if (!stack.length) return;
    dismissAbove(
      topmostContaining(event.target),
      { restoreFocus: false },
      record => record.dismissOn?.outside !== false);
  }, true);

  // One Escape policy for everything: dismiss the topmost surface, consume the
  // key, go no further. Without the stack this is where components fight.
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !stack.length) return;
    const top = stack[stack.length - 1];
    if (top.dismissOn?.escape === false) return;
    event.preventDefault();
    drop(top);
    top.close?.({ restoreFocus: true });
  });

  // RESIZE AND SCROLL BOTH MOVE AN ANCHORED SURFACE, and until 2026-08-31 only
  // resize was heard. A surface positioned against its trigger's VIEWPORT rect
  // -- which is what a `position: fixed` menu is -- drifts away from that
  // trigger the moment the page scrolls, and the combo button's menu did:
  // reported from looking, it floated off up the page while its button stayed
  // put. Nothing had noticed because the only surface with a reposition() was
  // the overflow menu, which is absolutely positioned INSIDE its trigger's
  // container and therefore scrolls with it.
  //
  // CAPTURE PHASE, because scroll does not bubble: a surface anchored to
  // something inside a scrolling panel would otherwise never hear it. Passive,
  // because none of these handlers calls preventDefault and a non-passive
  // scroll listener costs the browser its fast path.
  const replace = () => stack.forEach(record => record.reposition?.());
  window.addEventListener('resize', replace);
  window.addEventListener('scroll', replace, { capture: true, passive: true });

  /* ONE ANCHOR, BESIDE THE KERNEL RATHER THAN INSIDE IT. js/menu.js wrote this
     arithmetic for a `fixed` menu and js/list-box.js needs the same answer, so
     it sits here -- the one file both already require -- instead of being
     copied into the second caller, where only one copy would get the next fix.
     It is deliberately NOT part of Rux.overlay: the kernel ships no positioning
     engine (see the header) and this does not make it one. It reads an
     element's viewport rect and writes it to a `fixed` surface, which needs no
     scroll maths because fixed coordinates ARE viewport coordinates.

     A `fixed` SURFACE IS ALSO WHY THIS EXISTS AT ALL: a fixed box is laid out
     against the viewport, so it escapes the `overflow` of every scrolling
     ancestor. An absolutely-positioned menu inside a scrolling panel is cut off
     at the panel's edge, and the options past the cut cannot be reached.

     ONLY A `fixed` SURFACE IS TOUCHED, so a specimen pinned in flow with
     `position:relative` is left exactly where its markup puts it.

     opts.matchWidth  give the surface the anchor's width, which a fixed box no
                      longer inherits.
     opts.fit         when neither side of the anchor has room, cap the surface
                      to the roomier side and let it scroll inside itself.
                      Without it the surface overhangs below, which is what the
                      overflow menu has always done. */
  const anchorTo = (surface, to, opts = {}) => {
    if (!surface || !to) return;
    if (getComputedStyle(surface).position !== 'fixed') return;
    const t = to.getBoundingClientRect();
    if (opts.matchWidth) surface.style.inlineSize = `${Math.round(t.width)}px`;
    if (opts.fit) surface.style.maxBlockSize = '';
    let box = surface.getBoundingClientRect();
    const below = window.innerHeight - t.bottom;
    const above = t.top;
    const fitsBelow = below >= box.height;
    const fitsAbove = above >= box.height;
    /* NEITHER SIDE HOLDS IT: cap to the roomier side and go to THAT side. The
       cap and the side are one decision -- capping to the space above and then
       opening downwards puts the surface right back off the screen. */
    const squeezed = opts.fit && !fitsBelow && !fitsAbove;
    if (squeezed) {
      surface.style.maxBlockSize = `${Math.round(Math.max(below, above))}px`;
      box = surface.getBoundingClientRect();
    }
    const top = squeezed
      ? (below >= above ? t.bottom : Math.max(0, t.top - box.height))
      : (fitsBelow || !fitsAbove ? t.bottom : t.top - box.height);
    const left = Math.max(0, Math.min(t.left, window.innerWidth - box.width));
    surface.style.insetBlockStart = `${Math.round(top)}px`;
    surface.style.insetInlineStart = `${Math.round(left)}px`;
  };
  const unanchor = surface => {
    surface.style.insetBlockStart = '';
    surface.style.insetInlineStart = '';
    surface.style.inlineSize = '';
    surface.style.maxBlockSize = '';
  };

  window.Rux = window.Rux || {};
  window.Rux.overlay = { register, autoId, focusables, trapFocus };
  window.Rux.anchorTo = anchorTo;
  window.Rux.unanchor = unanchor;
})();
