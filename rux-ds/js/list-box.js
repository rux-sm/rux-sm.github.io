/* ==========================================================================
   rux-ds — LIST BOX (dropdown, and the select-only combobox)
                                                        Phase 5, roadmap §4.5
   --------------------------------------------------------------------------
   Requires js/overlay.js. Load after js/popover.js.

   THIS IS A COMBOBOX, NOT A MENU, and the difference is the whole file. A
   menu moves DOM focus onto the item the arrows reach. A select-only combobox
   keeps focus on the field and moves a separate cursor — `aria-activedescendant`
   — over the options, so a screen reader announces the option while the
   button keeps the keyboard. Carbon does the latter; reusing menu.js's roving
   tabindex here would announce the wrong thing and lose the field.

   TWO HIGHLIGHT CLASSES THAT ARE NOT THE SAME THING, which the sink harness
   had conflated by putting both on whatever was clicked:

     __menu-item--highlighted   the CURSOR. `outline: 2px solid` — where the
                                arrows are now, gone when the list closes.
     __menu-item--active        the SELECTION. `background-color:
                                layer-selected` — what the field is showing,
                                and it survives closing.

   No attribute to write. The field is `.rux--list-box__field` and the list is
   `.rux--list-box__menu` inside the same `.rux--list-box`, so the markup
   already relates them — the rule menu.js settled.

   `select` NEEDS NOTHING. Carbon's Select is a native <select> and the browser
   already owns every one of these behaviours; only the dropdown form is here.

   NOT EVERY `.rux--list-box` IS A CONTROL. list-box.html demos the PRIMITIVE —
   a specimen of the expanded state whose `__field` is a plain <div>, because
   Carbon's ListBox on its own is not interactive. Only the dropdown form gives
   it a `<button role="combobox">`. So this module claims a list box by its
   FIELD rather than by the root class, and leaves the static specimens alone:
   opening one would fight markup that is deliberately rendered open, and
   `field.focus()` on a div does nothing, which is how this was found.
   ========================================================================== */

/* BEHAVIOUR: verified-live · driven 2026-08-29 on
   https://react.carbondesignsystem.com/iframe.html?id=components-dropdown--default
   with real key events, reading aria-activedescendant and the option classes after each.

   CONFIRMED: the field is a <button role="combobox"> and KEEPS focus through every key --
   every option's tabIndex is -1, so the cursor really is aria-activedescendant and not a
   roving tabindex. `__menu-item--highlighted` is that cursor. Opening adds BOTH
   `--dropdown--open` and `--list-box--expanded` to the root. ArrowDown on a closed field
   opens it AND lands on the first option. Home and End jump to first and last. Enter
   selects, closes, and leaves focus on the field. Escape closes, clears the cursor, and
   leaves focus on the field. Typeahead exists and accumulates -- `o` then `p` holds the
   same option rather than jumping.

   ADDED 2026-09-01, not driven live: the two focus classes React toggles on a
   multiselect (see the handler below). NOT reimplemented: multiselect selection
   itself, the selection-count tag, and filtering -- the field opens and the
   cursor moves as for a dropdown, and nothing here reads the checkboxes.

   TWO THINGS THIS FILE HAD WRONG, both now fixed and both invisible to every gate:
   the arrows WRAPPED where Carbon clamps at each end, and Space was grouped with Enter
   -- opening a closed field, choosing in an open one -- where Carbon ignores it in both
   states. The Space fault was first written up here as typeahead swallowing the key;
   that was wrong, and the `case ' '` beside `case 'Enter'` was the actual cause.

   THE SPACE EVIDENCE WAS RE-TAKEN 2026-08-29 AND THE FIRST RUN OF IT WAS WORTHLESS.
   It used the browser tool's `key: "Space"`, which the tool does not map -- a listener on
   the page recorded the keydown arriving with `key: ""`. So "Carbon ignores Space" had
   been read off a keypress that never happened. Re-driven by TYPING a space instead,
   which does arrive: on a closed dropdown with the field focused, aria-expanded stayed
   "false" and aria-activedescendant stayed empty. The conclusion survived; the evidence
   behind it did not, and only the second run is worth citing.

   NOT VERIFIED: the multiselect and combo-box forms. This drove the DROPDOWN, which is
   the only consumer whose field is select-only; a combo box has a text input and its own
   filtering, and nothing here should be read as covering it.
   ========================================================================== */
(() => {
  'use strict';
  const overlay = window.Rux?.overlay;
  if (!overlay) return; // js/overlay.js must load first

  const ROOT = '.rux--list-box';
  const TYPEAHEAD_MS = 500;

  const live = new Map();   // root -> { registration, cursor }
  let typed = '', typedTimer = 0;

  // A control, not a specimen: a real button, or something explicitly given the
  // combobox role. Anything else is markup demonstrating a state.
  const fieldOf = r => r.querySelector(
    'button.rux--list-box__field, .rux--list-box__field[role="combobox"]');
  const menuOf = r => r.querySelector('.rux--list-box__menu');
  const iconOf = r => r.querySelector('.rux--list-box__menu-icon');
  const labelOf = r => r.querySelector('.rux--list-box__label');
  const optionsOf = r => [...r.querySelectorAll('.rux--list-box__menu-item[role="option"]')]
    .filter(o => !o.hasAttribute('disabled') && o.getAttribute('aria-disabled') !== 'true');
  const isDisabled = r => r.classList.contains('rux--list-box--disabled')
    || r.classList.contains('rux--dropdown--disabled');
  const selectedOf = r => r.querySelector('.rux--list-box__menu-item--active');

  function setCursor(root, option) {
    const field = fieldOf(root);
    for (const o of root.querySelectorAll('.rux--list-box__menu-item--highlighted'))
      o.classList.remove('rux--list-box__menu-item--highlighted');
    if (!option) { field?.removeAttribute('aria-activedescendant'); return; }
    option.classList.add('rux--list-box__menu-item--highlighted');
    field?.setAttribute('aria-activedescendant', overlay.autoId(option, 'rux-option'));
    // The list scrolls; the cursor must stay in it.
    option.scrollIntoView?.({ block: 'nearest' });
    const state = live.get(root);
    if (state) state.cursor = option;
  }

  function close(root, options = {}) {
    const state = live.get(root);
    if (!state) return;
    live.delete(root);
    root.classList.remove('rux--list-box--expanded', 'rux--dropdown--open');
    iconOf(root)?.classList.remove('rux--list-box__menu-icon--open');
    const menu = menuOf(root);
    if (menu && menu.children.length) menu.hidden = true;
    const field = fieldOf(root);
    field?.setAttribute('aria-expanded', 'false');
    setCursor(root, null);
    state.registration?.release();
    if (options.restoreFocus !== false) field?.focus();
    root.dispatchEvent(new CustomEvent('rux:listbox-closed', { bubbles: true }));
  }

  function open(root) {
    if (live.has(root) || isDisabled(root)) return;
    const field = fieldOf(root), menu = menuOf(root);
    if (!field || !menu) return;

    field.setAttribute('aria-expanded', 'true');
    field.setAttribute('aria-controls', overlay.autoId(menu, 'rux-listbox'));
    const registration = overlay.register({
      element: root,
      anchor: field,
      close: opts => close(root, opts),
    });

    root.classList.add('rux--list-box--expanded', 'rux--dropdown--open');
    iconOf(root)?.classList.add('rux--list-box__menu-icon--open');
    // FOCUS THE FIELD EXPLICITLY. This pattern keeps DOM focus on the field and
    // moves aria-activedescendant instead, so if the field does not hold focus
    // the arrows reach nothing and the component is inert. Clicking a <button>
    // does not focus it in Firefox or Safari on macOS — the same browser fact
    // that broke modal's focus restore — so opening cannot assume it happened.
    field.focus();
    if (menu.children.length) menu.hidden = false;
    live.set(root, { registration, cursor: null });
    // The cursor starts on the SELECTION, not the first option — reopening a
    // dropdown should show you where you already are.
    setCursor(root, selectedOf(root) || optionsOf(root)[0] || null);
    root.dispatchEvent(new CustomEvent('rux:listbox-opened', { bubbles: true }));
  }

  function choose(root, option) {
    if (!option) return;
    for (const o of root.querySelectorAll('.rux--list-box__menu-item')) {
      o.classList.remove('rux--list-box__menu-item--active');
      o.setAttribute('aria-selected', 'false');
    }
    option.classList.add('rux--list-box__menu-item--active');
    option.setAttribute('aria-selected', 'true');
    const label = labelOf(root);
    if (label) label.textContent = option.textContent.trim();
    root.dispatchEvent(new CustomEvent('rux:listbox-selected', {
      bubbles: true, detail: { option, value: option.textContent.trim() },
    }));
    close(root, { restoreFocus: true });
  }

  // CARBON CLAMPS, IT DOES NOT WRAP, and this used to do the opposite. Driven on
  // components-dropdown--default 2026-08-29: ArrowDown on the last option leaves
  // aria-activedescendant on the last option, and ArrowUp on the first leaves it
  // on the first. A wrap was the obvious guess from menu.js, where a roving
  // tabindex genuinely does cycle — but a combobox is not a menu, which is this
  // file's opening claim, and the arrow behaviour is one more place it holds.
  const step = (list, from, by) => {
    if (!list.length) return null;
    const at = list.indexOf(from);
    if (at === -1) return list[by > 0 ? 0 : list.length - 1];
    return list[Math.min(list.length - 1, Math.max(0, at + by))];
  };

  /* ── the focus ring React adds by class ─────────────────────────────── */
  // Added 2026-09-01 with multiselect's admission. Carbon sets
  // `.rux--multi-select .rux--list-box__field:focus { outline: 2px solid
  // transparent }` and draws the visible ring on the WRAPPER, through a class
  // React toggles on focus: `list-box__field--wrapper--input-focused` on the
  // field wrapper, and for the filterable form
  // `multi-select--filterable--input-focused` on the root. Without this the
  // multiselect field has no visible focus at all -- measured on the sink:
  // outline none -> rgba(0,0,0,0) solid 2px, wrapper unchanged. Reimplemented
  // here on the AGENTS.md rule for behaviour Carbon keeps in its React layer.
  const focusClass = (target, on) => {
    const ms = target.closest('.rux--multi-select');
    if (!ms) return;
    if (target.matches('.rux--list-box__field')) {
      target.closest('.rux--list-box__field--wrapper')?.classList.toggle('rux--list-box__field--wrapper--input-focused', on);
    } else if (target.matches('.rux--text-input') && ms.classList.contains('rux--multi-select--filterable')) {
      ms.classList.toggle('rux--multi-select--filterable--input-focused', on);
    }
  };
  document.addEventListener('focusin',  e => e.target instanceof Element && focusClass(e.target, true));
  document.addEventListener('focusout', e => e.target instanceof Element && focusClass(e.target, false));

  /* ── pointer ──────────────────────────────────────────────────────────── */
  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;

    const field = event.target.closest('.rux--list-box__field');
    if (field) {
      const root = field.closest(ROOT);
      // fieldOf() is the interactive test; a specimen's <div> field is not ours.
      if (!root || isDisabled(root) || fieldOf(root) !== field) return;
      event.preventDefault();
      live.has(root) ? close(root) : open(root);
      return;
    }
    const option = event.target.closest('.rux--list-box__menu-item[role="option"]');
    if (option && !option.hasAttribute('disabled')) {
      const root = option.closest(ROOT);
      if (root && live.has(root)) { event.preventDefault(); choose(root, option); }
    }
  });

  /* ── the combobox keyboard pattern ────────────────────────────────────── */
  document.addEventListener('keydown', event => {
    if (!(event.target instanceof Element)) return;
    const root = event.target.closest(ROOT);
    if (!root || isDisabled(root) || !fieldOf(root)) return;
    const isOpen = live.has(root);
    const list = optionsOf(root);
    const cursor = live.get(root)?.cursor ?? null;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        // Closed, an arrow OPENS and stops: open() has already put the cursor on
        // the selection, which is where the pattern wants it. Moving as well
        // would skip the option the field is showing.
        if (!isOpen) { open(root); return; }
        setCursor(root, step(list, cursor, event.key === 'ArrowDown' ? 1 : -1));
        break;
      case 'Home':
      case 'End':
        if (!isOpen) return;
        event.preventDefault();
        setCursor(root, event.key === 'Home' ? list[0] : list[list.length - 1]);
        break;
      // ENTER ONLY. Space used to be grouped here, opening a closed field and
      // choosing in an open one, which is what the ARIA combobox pattern
      // describes. Carbon does not do it: driven on
      // components-dropdown--default 2026-08-29, Space left aria-expanded and
      // aria-activedescendant untouched in both states.
      //
      // FOLLOWING CARBON IS THE RULE HERE, and it is worth being explicit that
      // this is the case where the rule costs something. Space on a focused
      // combobox is a reasonable thing for a keyboard user to try, and the APG
      // sanctions it. Adding it would be behaviour Carbon declines, which this
      // project does not do; the divergence is Carbon's to own, and a consumer
      // who wants it can bind it.
      case 'Enter':
        event.preventDefault();
        isOpen ? choose(root, cursor) : open(root);
        break;
      case 'Escape':
        // The kernel closes it; this stops a form submitting under us and marks
        // the key consumed. Nothing is selected — Escape reverts, it does not pick.
        if (isOpen) event.preventDefault();
        break;
      case 'Tab':
        if (isOpen) close(root, { restoreFocus: false });
        break;
      default: {
        // TYPEAHEAD. Printable, unmodified keys only, accumulated for half a
        // second so "de" reaches Delta rather than jumping D then E.
        //
        // SPACE IS NOT ONE OF THEM. `event.key` for the spacebar is `' '` —
        // length 1 and unmodified — so without this it would reach typeahead
        // and search for an option beginning with a space. It is inert in
        // Carbon, so it is inert here; the case above says what that costs.
        if (event.key === ' ') return;
        if (event.key.length !== 1 || event.metaKey || event.ctrlKey || event.altKey) return;
        if (!isOpen) open(root);
        clearTimeout(typedTimer);
        typed += event.key.toLowerCase();
        typedTimer = setTimeout(() => { typed = ''; }, TYPEAHEAD_MS);
        const hit = optionsOf(root).find(o => o.textContent.trim().toLowerCase().startsWith(typed));
        if (hit) { event.preventDefault(); setCursor(root, hit); }
      }
    }
  });

  /* MARKUP CAN DECLARE A LIST BOX ALREADY OPEN, and the module has to agree with
     it. dropdown.html ships an "Expanded" specimen — a real `button[role=combobox]`
     rendered with `--expanded` — and without this the first click would call open()
     on something already open, quietly registering it and leaving the user's click
     with no visible effect. Adopting the state means the first click CLOSES it,
     which is what the page looks like it is offering.

     `dismissOthers: false` IS LOAD-BEARING, and its absence closed every one of
     these. register() calls dismissAbove() by default, so adopting the second
     declared-open list box dismissed the first, and the next module to adopt an
     open surface dismissed that one — by the time the page settled both of
     dropdown.html's expanded specimens had lost --expanded and --open and their
     menus were hidden, at rest, with nothing pressed. The classes stayed in the
     static markup, so check-coverage went on counting them as exercised while
     the page showed a closed dropdown.

     The kernel's own reasoning covers this and its comment names the parallel: a
     surface that was DECLARED open did not open because anyone chose it, exactly
     as a hover tooltip appears because a pointer crossed it. It belongs on the
     stack — Escape and outside press must still reach it — but it must not tear
     down what is already there. Nothing else adopts onto the stack; accordion
     and data-table adopt markup state without registering. */
  for (const root of document.querySelectorAll(`${ROOT}.rux--list-box--expanded`)) {
    const field = fieldOf(root);
    if (!field || isDisabled(root) || live.has(root)) continue;
    live.set(root, {
      registration: overlay.register({
        element: root, anchor: field, dismissOthers: false,
        close: opts => close(root, opts),
      }),
      cursor: null,
    });
    setCursor(root, selectedOf(root) || optionsOf(root)[0] || null);
  }

  window.Rux.listBox = {
    open: root => open(root),
    close: root => close(root),
    select: (root, option) => choose(root, option),
    isOpen: root => live.has(root),
  };
})();
