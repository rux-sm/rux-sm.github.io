/* ==========================================================================
   rux-ds — MENU and OVERFLOW MENU                      Phase 5, roadmap §4.5
   --------------------------------------------------------------------------
   Requires js/overlay.js. Load after js/popover.js.

   TWO COMPONENTS, ONE PATTERN. A menu and an overflow menu differ in their
   class names and in where the surface sits relative to the trigger; the
   thing that makes them work — a roving arrow-key focus, Home and End, Tab
   closes, Enter activates, dismissal through the kernel — is identical. So
   they share a module rather than duplicating that pattern twice, which is
   also how rux-ui landed it.

     menu           `data-rux-open="<id>"` on the trigger, because the surface
                    is a <ul> elsewhere in the document. Same idiom as modal,
                    and deliberately the same attribute: one contract for
                    "this control opens that surface", with each module
                    claiming only the surfaces it recognises.
     overflow menu  no attribute. The trigger IS `.rux--overflow-menu` and the
                    surface is its sibling `.rux--overflow-menu-options`, so
                    the markup already says everything.

   THE SURFACE IS A SIBLING, NEVER A CHILD, in both. `overflow-menu-options__btn`
   is a real <button> and a button inside a button is invalid HTML, so the list
   has to sit beside the trigger. Look sideways, not down.

   ROVING TABINDEX, not focus-follows-DOM: exactly one item is tabbable at a
   time and the arrows move it. Menu items are <li role="menuitem"> with no
   native focusability, so the tabindex is what makes them reachable at all;
   overflow items are real buttons and would otherwise all be in the tab order,
   which is the thing the ARIA menu pattern exists to prevent.

   ENTER AND SPACE ARE FORWARDED AS A CLICK on <li> items. A button fires one
   itself; a list item does not, and every consumer of a menu listens for
   click. Sending the same event from both keeps that one listener honest.
   ========================================================================== */

/* BEHAVIOUR: verified-live · https://react.carbondesignsystem.com/iframe.html?id=components-overflowmenu--default
   read 2026-08-29 -- the open list carries an INLINE top equal to the trigger's bottom
   edge, flush, and is portaled to the body. That offset is reproduced here.
   NOT COVERED: collision handling. Carbon runs floating-ui and flips the list above the
   trigger near a viewport edge; this sets the resting offset only. The menu half of this
   file (rux--menu) was not compared against a running page at all.
   ========================================================================== */
(() => {
  'use strict';
  const overlay = window.Rux?.overlay;
  if (!overlay) return; // js/overlay.js must load first

  const ITEMS = '[role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]';
  const live = new Map();   // surface -> { registration, trigger, kind }

  // A COMBO BUTTON'S CONTAINER CARRIES THE OPEN STATE, not the trigger and not
  // the menu. Carbon's capture shows `combo-button__container--open` appearing
  // beside the trigger's `aria-expanded=true`, and the only rule it carries
  // rotates the trigger's chevron 180 degrees. Without it the menu opens and
  // the chevron keeps pointing down.
  //
  // This is the same shape the `overflow` kind below already uses, which puts
  // `overflow-menu--open` on ITS trigger; the combo button's state simply lives
  // one element further out. It is a no-op for every other menu trigger,
  // because closest() finds nothing.
  // A PORTALED MENU IS `position: fixed` AND CARBON POSITIONS IT WITH JS.
  // `.rux--menu` carries no inset of its own, so a menu rendered at the top
  // level -- which is where Carbon's capture puts a combo button's -- opens
  // wherever the viewport's origin leaves it. Measured 2026-08-31: the combo
  // button's menu landed at top 796px, left 300px, three sections down the
  // page and nowhere near its trigger.
  //
  // sink/menu.html avoids the question a different way, and says so: its
  // specimens are pinned in flow with `style="position:relative;inset:auto"`
  // because they are permanently-open demos, not menus anyone opens. A combo
  // button is opened, so it needs the real answer.
  //
  // THIS IS AN ANCHOR, NOT A POSITIONING ENGINE. js/overlay.js states the
  // project ships none, and this does not become one: it reads the trigger's
  // viewport rect and writes it to a `fixed` surface, which needs no scroll
  // maths because fixed coordinates ARE viewport coordinates. It flips above
  // the trigger when there is no room below, and clamps to the right edge.
  // Anything cleverer -- collision against arbitrary ancestors, auto-align --
  // is the engine overlay.js declines until a template asks.
  //
  // ONLY A `fixed` SURFACE IS TOUCHED, so the pinned sink specimens and any
  // page that positions its own menu are left exactly as they are.
  function anchor(surface, trigger) {
    if (!trigger) return;
    if (getComputedStyle(surface).position !== 'fixed') return;
    // ALIGN TO THE COMBO CONTAINER WHERE THERE IS ONE. Carbon calls the
    // surface `combo-button__bottom` -- it sits under the WHOLE control, not
    // under the chevron that opens it, and anchoring to the trigger left the
    // menu starting at the chevron's left edge with the primary action beside
    // it. Every other menu anchors to its own trigger, which is unchanged.
    const t = (comboContainer(trigger) ?? trigger).getBoundingClientRect();
    const box = surface.getBoundingClientRect();
    const below = window.innerHeight - t.bottom;
    const top = below >= box.height || t.top < box.height ? t.bottom : t.top - box.height;
    const left = Math.max(0, Math.min(t.left, window.innerWidth - box.width));
    surface.style.insetBlockStart = `${Math.round(top)}px`;
    surface.style.insetInlineStart = `${Math.round(left)}px`;
  }
  function unanchor(surface) {
    surface.style.insetBlockStart = '';
    surface.style.insetInlineStart = '';
  }

  const COMBO_OPEN = 'rux--combo-button__container--open';
  const comboContainer = trigger => trigger?.closest('.rux--combo-button__container');

  // The two shapes, described rather than branched on at every call site.
  const KINDS = {
    menu: {
      match: el => el.classList.contains('rux--menu'),
      show: (surface, trigger) => {
        surface.classList.add('rux--menu--open', 'rux--menu--shown');
        trigger?.setAttribute('aria-expanded', 'true');
        comboContainer(trigger)?.classList.add(COMBO_OPEN);
        anchor(surface, trigger);
      },
      hide: (surface, trigger) => {
        surface.classList.remove('rux--menu--open', 'rux--menu--shown');
        trigger?.setAttribute('aria-expanded', 'false');
        comboContainer(trigger)?.classList.remove(COMBO_OPEN);
        unanchor(surface);
      },
    },
    overflow: {
      match: el => el.classList.contains('rux--overflow-menu-options'),
      show: (surface, trigger) => {
        surface.classList.add('rux--overflow-menu-options--open');
        trigger?.classList.add('rux--overflow-menu--open');
        trigger?.setAttribute('aria-expanded', 'true');
        // THE LIST SITS BELOW THE TRIGGER, AND CSS ALONE CANNOT PUT IT THERE.
        // Carbon's stylesheet pre-positions the surface at `inset-block-start:
        // $spacing-07` — 32px, the height of an `sm` trigger — while the trigger
        // itself defaults to `md`, 40px. React then overwrites it: measured on
        // components-overflowmenu--default on 2026-08-29, the open list carries
        // an INLINE `top` equal to the trigger's bottom edge, flush, no overlap.
        // Without that write the CSS fallback shows through and the list covers
        // the last 8px of its own trigger.
        //
        // The offset is the trigger's height because the surface is absolutely
        // positioned inside the wrapper the trigger shares. Carbon computes a
        // viewport coordinate instead, since it portals the list to the body;
        // this does not portal, so the two arrive at the same place by
        // different arithmetic.
        //
        // NOT COVERED: collision handling. Carbon runs floating-ui, which flips
        // the list above the trigger near a viewport edge and shifts it inline.
        // This sets the resting offset only — the same line this project draws
        // for the icon-tooltip it declines throughout.
        if (trigger) surface.style.insetBlockStart = `${trigger.offsetHeight}px`;
      },
      hide: (surface, trigger) => {
        surface.classList.remove('rux--overflow-menu-options--open');
        trigger?.classList.remove('rux--overflow-menu--open');
        trigger?.setAttribute('aria-expanded', 'false');
        surface.style.insetBlockStart = '';
      },
    },
  };

  const kindOf = surface => Object.values(KINDS).find(k => k.match(surface)) || null;
  const items = surface => [...surface.querySelectorAll(ITEMS)]
    .filter(el => !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true');

  function rove(surface, to) {
    const list = items(surface);
    if (!list.length) return;
    for (const el of list) el.tabIndex = -1;
    to.tabIndex = 0;
    to.focus();
  }

  function close(surface, options = {}) {
    const state = live.get(surface);
    if (!state) return;
    live.delete(surface);
    state.kind.hide(surface, state.trigger);
    state.registration?.release();
    if (options.restoreFocus) state.trigger?.focus();
    surface.dispatchEvent(new CustomEvent('rux:menu-closed', { bubbles: true }));
  }

  function open(surface, trigger, options = {}) {
    if (live.has(surface)) return;
    const kind = kindOf(surface);
    if (!kind) return;

    if (trigger) {
      trigger.setAttribute('aria-haspopup', 'menu');
      trigger.setAttribute('aria-controls', overlay.autoId(surface, 'rux-menu'));
    }
    const registration = overlay.register({
      element: surface,
      anchor: trigger,
      close: opts => close(surface, opts),
      // The kernel calls this on resize and on scroll. anchor() is a no-op for
      // anything not `position: fixed`, so the pinned sink specimens and the
      // overflow menu -- which is positioned inside its own container and
      // scrolls with it -- are unaffected.
      reposition: () => anchor(surface, trigger),
    });

    kind.show(surface, trigger);
    live.set(surface, { registration, trigger, kind });
    // Focus lands after the class does: an item inside a `visibility: hidden`
    // surface cannot take focus, and the browser would silently refuse.
    if (options.focus !== false) queueMicrotask(() => {
      const first = items(surface)[0];
      if (first) rove(surface, first);
    });
    surface.dispatchEvent(new CustomEvent('rux:menu-opened', { bubbles: true }));
  }

  const surfaceFor = trigger =>
    trigger.hasAttribute('data-rux-open')
      ? document.getElementById(trigger.getAttribute('data-rux-open'))
      // Sideways, not down — see the header.
      : trigger.parentElement?.querySelector(':scope > .rux--overflow-menu-options');

  /* ── triggers ─────────────────────────────────────────────────────────── */
  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;

    const trigger = event.target.closest('[data-rux-open], .rux--overflow-menu');
    if (trigger) {
      const surface = surfaceFor(trigger);
      // Not ours: modal.js claims `.rux--modal`, and an overflow trigger with
      // no options list beside it — the table demos one — opens nothing.
      if (surface && kindOf(surface)) {
        event.preventDefault();
        live.has(surface) ? close(surface, { restoreFocus: true }) : open(surface, trigger);
        return;
      }
    }

    // Activating an item closes the menu it belongs to.
    const item = event.target.closest(ITEMS);
    if (!item) return;
    for (const surface of [...live.keys()]) {
      if (surface.contains(item)) close(surface, { restoreFocus: true });
    }
  });

  /* ── the keyboard pattern ─────────────────────────────────────────────── */
  document.addEventListener('keydown', event => {
    if (!live.size || !(event.target instanceof Element)) return;
    // THE TRIGGER COUNTS AS INSIDE. Focus moves into the surface a microtask
    // after opening, and a key pressed before that lands on the trigger — as
    // does every key when a caller opens with `focus: false`. Matching only on
    // the surface left the arrows dead in exactly the window where a fast
    // keyboard user is pressing them.
    const surface = [...live.entries()]
      .find(([el, st]) => el.contains(event.target) || st.trigger?.contains(event.target))?.[0];
    if (!surface) return;

    const list = items(surface);
    // -1 when the key came from the trigger, which makes ArrowDown land on the
    // first item and ArrowUp on the last — the ARIA menu pattern's own answer.
    const at = list.indexOf(event.target.closest(ITEMS));

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        const down = event.key === 'ArrowDown';
        // From the trigger (at === -1) the pattern is first item on Down and
        // LAST on Up. Modular arithmetic alone gets Down right and Up wrong —
        // it lands second-to-last — so the entry case is written out.
        const next = at === -1
          ? (down ? 0 : list.length - 1)
          : (at + (down ? 1 : -1) + list.length) % list.length;
        rove(surface, list[next]);
        break;
      }
      case 'Home':
      case 'End':
        event.preventDefault();
        rove(surface, event.key === 'Home' ? list[0] : list[list.length - 1]);
        break;
      case 'Tab':
        // Not preventDefault: Tab should leave the menu AND move on, which is
        // what a sighted keyboard user means by it.
        close(surface, { restoreFocus: false });
        break;
      case 'Enter':
      case ' ': {
        const item = event.target.closest(ITEMS);
        // A <button> fires its own click; an <li> never will.
        if (item && item.tagName !== 'BUTTON') {
          event.preventDefault();
          item.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }
        break;
      }
    }
  });

  /* Adopt an overflow list the MARKUP ships open. Setting the offset is all
     this does — the surface is deliberately NOT registered on the overlay
     stack, because a specimen with no trigger of its own must not be
     dismissible by a press somewhere else on the page. Without this the static
     specimen keeps the stylesheet's 32px fallback and overlaps its trigger by
     8px, which is the state a reader would copy. */
  for (const surface of document.querySelectorAll('.rux--overflow-menu-options--open')) {
    const trigger = surface.parentElement?.querySelector(':scope > .rux--overflow-menu');
    if (trigger) surface.style.insetBlockStart = `${trigger.offsetHeight}px`;
  }

  window.Rux.menu = {
    open: (surfaceOrId, trigger) => {
      const s = typeof surfaceOrId === 'string' ? document.getElementById(surfaceOrId) : surfaceOrId;
      if (s) open(s, trigger || null);
    },
    close: surfaceOrId => {
      const s = typeof surfaceOrId === 'string' ? document.getElementById(surfaceOrId) : surfaceOrId;
      if (s) close(s, { restoreFocus: true });
    },
    isOpen: surface => live.has(surface),
  };
})();
