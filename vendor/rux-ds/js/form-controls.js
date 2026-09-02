/* ==========================================================================
   rux-ds — FORM CONTROL STATE
                                                        Phase 5, roadmap §4.5
   --------------------------------------------------------------------------
   Requires js/overlay.js only to share the `window.Rux` namespace. None of
   these overlays anything, so none of them joins the dismiss stack.

   SMALL FORM CONTROLS LIVE IN ONE FILE, because each is a handful of lines and
   a file per control would add script tags for very little behaviour. They
   are grouped by what they are — form controls that only ever mutate
   themselves — rather than by component name.

   THE STEPPERS ARE TOLD APART BY CLASS, AND THIS BLOCK USED TO SAY OTHERWISE.
   It claimed Carbon gives both buttons the identical `number__control-btn` and
   "distinguishes them by nothing else", so position was "the only signal
   Carbon actually provides". Measured on the running number input: Carbon
   writes `number__control-btn down-icon` and `number__control-btn up-icon`.
   The signal was there all along.

   The original point still stands against `aria-label`: reading "increment"
   is reading a TRANSLATED STRING and would leave the control dead on any page
   not in English. But `down-icon`/`up-icon` are neither translated nor
   positional, so they are better than both.

   IT ALSO MATTERED MORE THAN IT LOOKED. Carbon's CSS — compiled into ours —
   gives `.down-icon { order: 1 }` and `.up-icon { order: 2 }`. Our markup
   carried neither class, so both buttons sat at `order: 0` and the rendered
   order was DOM order, which is why reading position happened to work. It is
   a flex `order` that decides what a user sees, so DOM order and visual order
   are not the same question, and the module was answering the wrong one.

   `data-rux-indeterminate` HAS TO BE AN ATTRIBUTE, because `indeterminate` is
   a DOM PROPERTY with no HTML counterpart: a checkbox cannot express the
   state in markup at all. This is the one place the contract adds an
   attribute for something other than relating a trigger to a surface, and
   the reason is that HTML gives no alternative.
   ========================================================================== */

/* BEHAVIOUR: verified-live · driven 2026-08-29 on
   https://react.carbondesignsystem.com/iframe.html?id=components-numberinput--default
   and https://react.carbondesignsystem.com/iframe.html?id=components-toggle--default

   EDIT IN PLACE verified live 2026-09-01 on
   https://ibm-products.carbondesignsystem.com/iframe.html?id=components-editinplace--default
   Focusing its input added `c4p--edit-in-place--focused` to the host and the
   host drew a 2px rgb(15, 98, 254) outline. Its React layer also replaces the
   single edit action with Cancel and Save; this module does NOT reimplement
   that editing transaction. The captured static fragment has one edit action,
   so this module only enters focus, applies the required host class, and
   removes it when focus leaves the component.

   THE STEPPER ORDER IS RIGHT AND THE REASON GIVEN FOR IT WAS WRONG. Carbon does render
   decrement first and increment second -- confirmed, with the subtract glyph on the first
   and add on the second -- so this module always stepped the right way. But it marks them
   `down-icon` and `up-icon`, which the header claimed it does not do, and its own CSS
   gives those `order: 1` and `order: 2`. Our markup carried neither class, so both
   buttons sat at `order: 0` and rendered in DOM order, which is the only reason reading
   position worked. Both classes are now in the markup and the module reads them, keeping
   position as a fallback.

   ADDED 2026-09-01, not driven live: the selectable structured list's two row classes,
   `--focused-within` on focus and `--selected` on change (see the handler below).

   THE TOGGLE IS CONFIRMED WHOLE: a <button role="switch"> with aria-checked, beside a
   `toggle__switch` that takes `toggle__switch--checked`, and a `toggle__text` carrying the
   words On and Off. That is the structure this module writes.

   ONE OBSERVATION ABOUT OUR OWN CODE, not about Carbon: setToggle() hard-codes the English
   strings 'On' and 'Off'. This file's header objects to depending on a TRANSLATED STRING
   when reading aria-label, and writing one is the same problem facing the other way. Where
   Carbon's text comes from was NOT established -- an attempt to override it through
   Storybook args did not take, so nothing is claimed about whether Carbon's is
   configurable. Ours is not, and that is worth a decision rather than a silent default.

   NOT VERIFIED: the search clear button and the indeterminate checkbox. Neither was
   driven, and `data-rux-indeterminate` is this project's own attribute in any case --
   `indeterminate` is a DOM property with no HTML form, so there is no Carbon markup to
   compare it against.
   ========================================================================== */
(() => {
  'use strict';
  if (!window.Rux?.overlay) return; // js/overlay.js must load first

  /* ── toggle: a <button role="switch">, so Enter and Space are the browser's ─ */
  function setToggle(root, on) {
    if (root.classList.contains('rux--toggle--disabled')) return;
    const button = root.querySelector('.rux--toggle__button');
    const sw = root.querySelector('.rux--toggle__switch');
    if (button?.disabled) return;
    sw?.classList.toggle('rux--toggle__switch--checked', on);
    button?.setAttribute('aria-checked', String(on));
    const text = root.querySelector('.rux--toggle__text');
    if (text) text.textContent = on ? 'On' : 'Off';
    root.dispatchEvent(new CustomEvent('rux:toggle', { bubbles: true, detail: { on } }));
  }

  /* ── number steppers ───────────────────────────────────────────────────── */
  function step(button) {
    const root = button.closest('.rux--number');
    if (!root || root.classList.contains('rux--number--readonly')) return;
    const input = root.querySelector('input[type="number"]');
    if (!input || input.disabled || input.readOnly) return;

    // THE CLASS FIRST, POSITION ONLY AS A FALLBACK. Carbon marks these
    // `down-icon` and `up-icon` -- see the header, which used to claim it marks
    // them with nothing. Position agrees today only because our markup omitted
    // both classes, so every button sat at the default `order: 0` and fell back
    // to DOM order; Carbon's own CSS gives down-icon `order: 1` and up-icon
    // `order: 2`, which means the VISUAL order is a CSS decision and DOM order
    // is not guaranteed to match it. Reading the class reads what Carbon
    // actually says.
    const buttons = [...root.querySelectorAll('.rux--number__control-btn')];
    const up = button.classList.contains('up-icon') ? true
      : button.classList.contains('down-icon') ? false
      : buttons.indexOf(button) > 0;   // unmarked markup: decrement first
    const by = Number(input.step) || 1;
    const min = input.min === '' ? -Infinity : Number(input.min);
    const max = input.max === '' ? Infinity : Number(input.max);
    const next = (Number(input.value) || 0) + (up ? by : -by);

    input.value = String(Math.min(max, Math.max(min, next)));
    // BOTH events. A user turning the spinner on a native number input fires
    // `input` while typing and `change` when committing; a listener bound to
    // either one must hear this the same way it hears the keyboard.
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /* ── fluid focus ───────────────────────────────────────────────────────── */
  //
  // A FLUID CONTROL DRAWS ITS FOCUS RING FROM A CLASS, NOT FROM `:focus`, and
  // nothing was applying it. Found by check-a11y on 2026-08-31, which reported
  // three `select-input`s in the fluid section as "no visible focus change" --
  // and it was right, which is worth saying because the same rule's other
  // findings on this page are an adjudicated false positive.
  //
  // Carbon's rules are `.rux--select--fluid .rux--select--fluid--focus
  // .rux--select-input__wrapper` and its siblings: the ring is on a WRAPPER and
  // is gated on a class React adds on focus. With no module doing that, a fluid
  // select, number or dropdown took focus and painted nothing.
  //
  // THREE CLASSES, THREE DIFFERENT HOSTS, read off the selectors rather than
  // guessed: the select's goes on the inner `.rux--select`, the number's on the
  // `--fluid` root itself, and the list box's on its own wrapper.
  const FLUID_FOCUS = [
    ['.rux--select--fluid', '.rux--select', 'rux--select--fluid--focus'],
    ['.rux--number-input--fluid', null, 'rux--number-input--fluid--focus'],
    ['.rux--list-box__wrapper--fluid', null, 'rux--list-box__wrapper--fluid--focus'],
  ];

  function fluidFocus(target, on) {
    for (const [rootSel, hostSel, cls] of FLUID_FOCUS) {
      const root = target.closest?.(rootSel);
      if (!root) continue;
      const host = hostSel ? root.querySelector(hostSel) : root;
      host?.classList.toggle(cls, on);
    }
  }

  // focusin/focusout, not focus/blur: those do not bubble, and the control that
  // takes focus is nested several levels inside the element the class goes on.
  document.addEventListener('focusin', e => fluidFocus(e.target, true));
  document.addEventListener('focusout', e => fluidFocus(e.target, false));

  /* ── edit in place focus ──────────────────────────────────────────────── */
  // Carbon suppresses the input's own outline and draws the ring from the
  // host's `--focused` class. Its React transition and this module's deliberate
  // limit are recorded in the BEHAVIOUR label above.
  const editInPlace = target => target.closest?.('.rux--edit-in-place');
  document.addEventListener('focusin', e => {
    if (!e.target.matches?.('.rux--edit-in-place__text-input')) return;
    editInPlace(e.target)?.classList.add('rux--edit-in-place--focused');
  });
  document.addEventListener('focusout', e => {
    const root = editInPlace(e.target);
    if (!root || root.contains(e.relatedTarget)) return;
    root.classList.remove('rux--edit-in-place--focused');
  });

  /* ── structured list, selectable ──────────────────────────────────────── */
  // Added 2026-09-01 with structured-list's admission. Carbon draws the focus
  // ring on the ROW through `structured-list-row--focused-within`, a class
  // React toggles when the visually-hidden radio inside it has focus, and
  // marks the chosen row `--selected` the same way. Measured on the sink
  // before this: focusing the radio changed nothing on the row, the cell or
  // the check mark. Reimplemented on the AGENTS.md rule for behaviour Carbon
  // keeps in its React layer.
  const listRow = input => input.closest?.('.rux--structured-list-row');
  const listFocus = (target, on) => {
    if (!target.matches?.('.rux--structured-list-input')) return;
    listRow(target)?.classList.toggle('rux--structured-list-row--focused-within', on);
  };
  document.addEventListener('focusin', e => listFocus(e.target, true));
  document.addEventListener('focusout', e => listFocus(e.target, false));
  document.addEventListener('change', e => {
    const input = e.target;
    if (!input.matches?.('.rux--structured-list-input') || !input.checked) return;
    const list = input.closest('.rux--structured-list');
    list?.querySelectorAll('.rux--structured-list-row--selected')
      .forEach(row => row.classList.remove('rux--structured-list-row--selected'));
    listRow(input)?.classList.add('rux--structured-list-row--selected');
  });

  /* ── search clear ──────────────────────────────────────────────────────── */
  const syncSearch = search => {
    const input = search.querySelector('.rux--search-input');
    const close = search.querySelector('.rux--search-close');
    close?.classList.toggle('rux--search-close--hidden', !input?.value);
  };

  /* ── wiring ────────────────────────────────────────────────────────────── */
  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;

    // The BUTTON only. A <label for> pointing at a button forwards the click to
    // it, so handling the label as well fires twice and the toggle reads dead.
    const toggle = event.target.closest('.rux--toggle__button');
    if (toggle) {
      const root = toggle.closest('.rux--toggle');
      if (root) setToggle(root, toggle.getAttribute('aria-checked') !== 'true');
      return;
    }
    const stepper = event.target.closest('.rux--number__control-btn');
    if (stepper) { step(stepper); return; }

    const edit = event.target.closest('.rux--edit-in-place__btn-edit');
    if (edit) {
      editInPlace(edit)?.querySelector('.rux--edit-in-place__text-input')?.focus();
      return;
    }

    const clear = event.target.closest('.rux--search-close');
    if (clear) {
      const search = clear.closest('.rux--search');
      const input = search?.querySelector('.rux--search-input');
      if (input) { input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); input.focus(); }
      if (search) syncSearch(search);
    }
  });

  document.addEventListener('input', event => {
    if (!(event.target instanceof Element)) return;
    const search = event.target.closest('.rux--search');
    if (search && event.target.matches('.rux--search-input')) syncSearch(search);
  });

  /* Adopt what the markup shipped: a search that starts with a value shows its
     clear button, and `indeterminate` is set from the attribute that is the
     only way to express it in HTML. */
  for (const search of document.querySelectorAll('.rux--search')) syncSearch(search);
  for (const box of document.querySelectorAll('input[type="checkbox"][data-rux-indeterminate]'))
    box.indeterminate = true;

  window.Rux.formControls = {
    toggle: (root, on) => setToggle(root, on ?? root.querySelector('.rux--toggle__button')?.getAttribute('aria-checked') !== 'true'),
    step,
    syncSearch,
  };
})();
