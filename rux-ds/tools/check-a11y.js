//
// KEYBOARD AND ARIA AUDIT — paste into the kitchen sink's devtools console.
//
// A browser tool, not a Node one, for the same reason as check-rendered.js:
// answering these questions needs a layout and an accessibility tree, and
// automating it means adding a headless-browser dependency this project has
// none of (roadmap §4.8, README "Gates").
//
// WHAT IT CANNOT TELL YOU, said first so the pass is not mistaken for a
// clean bill of health:
//   * whether a screen reader ANNOUNCES the right thing. This reads the
//     attributes an AT would use; it does not run one. §4.5's exit needs a
//     human with VoiceOver or NVDA and there is no substitute.
//   * whether the visible focus ring is legible against its background.
//   * whether the tab ORDER is sensible. It checks that composites expose one
//     stop and that nothing is stranded; "sensible" is a judgement.
//
// What it does check is the part that is mechanical, and every one of these
// has a real failure mode behind it.
//
(() => {
  const MAIN = '.ks-main';
  const root = document.querySelector(MAIN) || document.body;
  const findings = [], notes = [];
  const row = (rule, detail, el) => ({ rule, detail,
    where: el?.closest?.('.ks-sec')?.id ?? '(page)',
    what: (el?.className || el?.tagName || '').toString().slice(0, 60) });
  const say = (rule, detail, el) => findings.push(row(rule, detail, el));
  // A NOTE IS NOT A FINDING. The sink demos CSS states as well as working
  // components, and a specimen is a real thing that is deliberately not
  // operable. Counting those as defects would leave this tool permanently at
  // five and teach everyone to ignore the number — the reasoning check-coverage
  // gives for not scoring stripped components.
  const note = (rule, detail, el) => notes.push(row(rule, detail, el));

  // `offsetParent` alone is not enough: an element inside `visibility: hidden`
  // still HAS layout, so a closed modal's buttons and a closed menu's items all
  // looked visible and then failed to take focus. visibility inherits, so
  // reading it on the element itself covers the ancestors.
  const visible = el => {
    const c = getComputedStyle(el);
    if (c.visibility === 'hidden' || c.display === 'none') return false;
    return el.offsetParent !== null || c.position === 'fixed';
  };
  const enabled = el => !el.disabled && el.getAttribute('aria-disabled') !== 'true';

  const name = el =>
    (el.getAttribute('aria-label') || '').trim()
    || (el.getAttribute('aria-labelledby') || '').split(/\s+/)
         .map(id => document.getElementById(id)?.textContent ?? '').join(' ').trim()
    || (el.id ? (document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent ?? '').trim() : '')
    || (el.closest('label')?.textContent ?? '').trim()
    || el.textContent.trim()
    || (el.getAttribute('title') || '').trim();

  // 1. EVERY IDREF RESOLVES. A dangling aria-controls is silent: nothing breaks
  //    visually and the relationship the attribute promises simply is not there.
  for (const el of root.querySelectorAll('[aria-controls],[aria-labelledby],[aria-describedby],[aria-activedescendant]'))
    for (const attr of ['aria-controls', 'aria-labelledby', 'aria-describedby', 'aria-activedescendant'])
      for (const id of (el.getAttribute(attr) || '').split(/\s+/).filter(Boolean))
        if (!document.getElementById(id)) say('dangling idref', `${attr}="${id}"`, el);

  // 2. A COMPOSITE EXPOSES ONE TAB STOP. Menus, tablists and listboxes move an
  //    internal cursor; N tab stops means the roving tabindex was never applied
  //    and a keyboard user tabs through every item instead of arrowing.
  for (const [widget, item] of [['[role="menu"]', '[role^="menuitem"]'],
                                ['[role="tablist"]', '[role="tab"]'],
                                ['[role="listbox"]', '[role="option"]']]) {
    for (const w of root.querySelectorAll(widget)) {
      if (!visible(w)) continue;
      const items = [...w.querySelectorAll(item)].filter(enabled);
      const stops = items.filter(i => i.tabIndex >= 0);
      if (stops.length > 1) say('composite has many tab stops', `${stops.length} of ${items.length}`, w);
      // A composite with NO stop and nothing that opens it cannot be reached at
      // all. In the sink that is usually a deliberate specimen, so it is a note.
      // No stop and nothing that opens it: a specimen of a state, not a control.
      // menu.html demos four densities and list-box.html the expanded primitive,
      // none of which has a trigger, because what they demonstrate is the CSS.
      if (!stops.length && items.length && !document.querySelector(`[aria-controls="${w.id}"]`))
        note('specimen: composite with no trigger', `${items.length} items, not operable by design`, w);
    }
  }

  // 3. EVERY CONTROL HAS AN ACCESSIBLE NAME. An unnamed button is announced as
  //    "button" and nothing else.
  for (const el of root.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea,'
    + '[role="tab"],[role="option"],[role^="menuitem"],[role="checkbox"],[role="switch"],[role="combobox"]'))
    if (visible(el) && enabled(el) && !name(el)) say('no accessible name', el.tagName, el);

  // 4. A ROLE THAT PROMISES STATE MUST CARRY IT. role="switch" with no
  //    aria-checked is announced as a switch whose position is unknown.
  const REQUIRED = { tab: ['aria-selected'], option: ['aria-selected'], checkbox: ['aria-checked'],
                     switch: ['aria-checked'], combobox: ['aria-expanded'], tabpanel: ['aria-labelledby'] };
  for (const [role, attrs] of Object.entries(REQUIRED))
    for (const el of root.querySelectorAll(`[role="${role}"]`))
      if (visible(el)) for (const a of attrs)
        if (!el.hasAttribute(a)) say('role missing required state', `role=${role} needs ${a}`, el);

  // 5. FOCUS MUST BECOME VISIBLE, which is a question about the FOCUSED state
  //    and not the resting one. A first draft read the resting outline and
  //    reported 74 controls, all of them fine — no element shows a focus ring
  //    while unfocused. So focus each one and diff what changed. `.focus()`
  //    matches `:focus`, which is what Carbon styles; a rule written only for
  //    `:focus-visible` would need a real key press and is out of reach here.
  // THIS CHECK CANNOT RUN IN AN UNFOCUSED DOCUMENT, and saying so beats
  // reporting nonsense. `:focus` only matches while the document itself has
  // focus, so in a headless or background window every control appears to have
  // no focus style — the first run of this tool reported 167 of them, including
  // plain buttons Carbon quite clearly styles. Same root cause as key events
  // not being delivered: no OS focus, no focus.
  const canTestFocus = document.hasFocus();
  const held = document.activeElement;
  if (!canTestFocus) console.warn('  check-a11y: focus-ring check SKIPPED — '
    + 'document.hasFocus() is false. Click the page and re-run.');
  // WHERE THE RING IS DRAWN IS NOT WHERE FOCUS LANDS. Carbon hides the real
  // control for checkbox, radio and tile — a 1x1 clipped input — and draws the
  // ring on the label that FOLLOWS it:
  //     .rux--checkbox:focus + .rux--checkbox-label::before
  //     .rux--radio-button:focus + .rux--radio-button__label .rux--radio-button__appearance
  //     .rux--tile-input:focus + .rux--tile
  // Reading only the focused element measures an element Carbon styles nothing
  // on — there is no `:focus` rule in the whole stylesheet that ends at one of
  // these inputs. The check passed those 24 controls anyway, on the BROWSER's
  // default ring: Chromium paints `outline: auto` on the invisible input. That
  // is not this system's ring and it is not even stable — `:focus-visible`
  // stops matching after a pointer press, and the same sweep then called all 24
  // ringless. A pass and a failure, both measuring the wrong element.
  //
  // So read the ring's SURFACE rather than the focus target. The surface is
  // derived structurally — the label that owns the control, and what is inside
  // it — and never from a list of component names: an allow-list would measure
  // the list instead of the rule.
  const surfaces = el => {
    const out = [el];
    const label = (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`))
      || el.closest('label')
      // Carbon's hidden-control pattern is `input + label`, so the sibling is
      // only a ring surface for an input. Widening it to every element would
      // let an unrelated neighbour vouch for a control that has no ring.
      || (el.tagName === 'INPUT' ? el.nextElementSibling : null);
    if (label) { out.push(label, ...label.querySelectorAll('*')); }
    return out;
  };
  // AN OUTLINE THAT PAINTS NOTHING IS NOT A RING, and there are three ways to
  // have one. `outline-style: auto` is the UA ring and nothing else — this
  // stylesheet writes `solid` for all 121 of its outlines and `auto` for none
  // (`grep -c 'outline: auto' css/rux.css` is 0). `outline-style: none` paints
  // nothing whatever the width and colour say, and Carbon moves the WIDTH of a
  // style-none outline on focus (1.5px to 3px on the checkbox label), which is
  // invisible. Both collapse to one token, so neither can register as a change:
  // a first cut gave them tokens of their own, and the positive control below
  // passed a checkbox whose ring had been deleted.
  //
  // The third is a TRANSPARENT outline. Carbon rests the tile on
  // `outline: 2px solid transparent` — a forced-colors affordance, where the OS
  // repaints the outline it can see the shape of. In an ordinary render it is
  // invisible, so a tile going from transparent to no outline at all is not a
  // focus indicator appearing. It read as one, and the tile survived having its
  // ring deleted.
  const paint = el => surfaces(el).map(n => [null, '::before', '::after'].map(pseudo => {
    const c = getComputedStyle(n, pseudo);
    const unpainted = c.outlineStyle === 'none' || c.outlineStyle === 'auto'
      || /rgba\([^)]*,\s*0\s*\)\s*$/.test(c.outlineColor);
    const outline = unpainted ? 'no-outline'
      : `${c.outlineStyle}|${c.outlineWidth}|${c.outlineColor}`;
    return `${outline}|${c.boxShadow}|${c.borderColor}|${c.backgroundColor}`;
  }).join(';')).join('/');
  const activeDescendantIndicated = el => {
    const id = el.getAttribute?.('aria-activedescendant');
    const target = id && document.getElementById(id);
    if (!target || !visible(target)) return false;
    for (const node of [target, ...target.querySelectorAll('*')])
      for (const pseudo of [null, '::before', '::after']) {
        const c = getComputedStyle(node, pseudo);
        const unpainted = c.outlineStyle === 'none' || c.outlineStyle === 'auto'
          || /rgba\([^)]*,\s*0\s*\)\s*$/.test(c.outlineColor);
        if (!unpainted && parseFloat(c.outlineWidth) > 0) return true;
      }
    return false;
  };
  // TRANSITIONS MUST BE OFF OR THE DIFF MEASURES THE CLOCK. Carbon transitions
  // `outline` and `box-shadow` over 70ms, and getComputedStyle reports the value
  // the transition has REACHED, not the one the cascade asks for. Read the
  // instant after `.focus()` and every ring is still at its starting value.
  // In an automated pane it never leaves it: `document.visibilityState` is
  // `hidden`, so the animation timeline does not advance at all — a 100ms
  // transition sat unmoved after 500ms, and a stuck one outranks the cascade,
  // beating even `!important`. Measured on the sink: 49 findings with
  // transitions live, 0 with them suppressed. Every one was the clock.
  // Suppressing also ABORTS transitions already in flight, so a page someone
  // has been clicking around needs no separate cancelling.
  const noAnim = document.createElement('style');
  noAnim.textContent = '*, *::before, *::after '
    + '{ transition: none !important; animation: none !important; }';
  if (canTestFocus) document.head.append(noAnim);
  try {
    for (const el of canTestFocus ? root.querySelectorAll('button, a[href], input, select, textarea, [tabindex]') : []) {
      if (!visible(el) || !enabled(el) || el.tabIndex < 0) continue;
      const before = paint(el);
      el.focus({ preventScroll: true });
      if (document.activeElement !== el) { say('cannot take focus', 'tabbable but .focus() did not land', el); continue; }
      // A COMPOSITE IS INDICATED BY ITS ACTIVE DESCENDANT, and for one the
      // requirement is not that focusing CHANGES something. ARIA keeps DOM focus
      // on the control and moves the visual indicator to the element
      // aria-activedescendant names; Carbon writes that literally, with
      // `.dropdown--open .list-box__field { outline: none }` removing the field's
      // own ring while the menu is open and the highlighted option carrying the
      // 2px outline instead. That option is already highlighted before focus
      // arrives, so the diff is empty and an open dropdown read as ringless —
      // twice, once per expanded specimen. What matters is that the indicator is
      // THERE, not that it appeared. The attribute is the pointer; this knows
      // nothing about dropdowns.
      if (paint(el) === before && !activeDescendantIndicated(el))
        say('no visible focus change', 'nothing changed on the control, its label or their ::before/::after, and no active descendant carries a ring; the browser default ring does not count', el);
    }
    held?.focus?.({ preventScroll: true });
  } finally { noAnim.remove(); }

  // 6. NOTHING FOCUSABLE INSIDE A BOX HIDDEN FROM ASSISTIVE TECH. The dangerous
  //    case is `aria-hidden="true"` on something STILL RENDERED: the browser will
  //    happily focus a child a screen reader has been told does not exist. A
  //    first draft also flagged `[hidden]`, which was wrong — `hidden` is
  //    `display: none`, so those children cannot be focused by anyone, and it
  //    reported the side nav's own collapsed submenus.
  for (const el of root.querySelectorAll('[aria-hidden="true"]')) {
    if (!visible(el)) continue;
    for (const child of el.querySelectorAll('button, a[href], input, select, textarea, [tabindex]'))
      if (child.tabIndex >= 0 && !child.disabled && visible(child))
        say('focusable inside aria-hidden', child.tagName, el);
  }

  const by = findings.reduce((m, f) => (m[f.rule] = (m[f.rule] || 0) + 1, m), {});
  // ADJUDICATED FINDINGS ARE SEPARATED FROM NEW ONES, AND NOT SUPPRESSED.
  //
  // Added 2026-08-31. By 2026-08-31 every one of the 13 findings this tool
  // reports across all 12 pages was a KNOWN false positive: 8 progress-step
  // buttons and 1 fluid list box on the sink, 4 progress steps on wizard-page.
  // A fourteenth, real finding would have arrived as "10 findings" instead of
  // "9" and been indistinguishable. That nearly happened: three genuine fluid
  // focus defects were found only because every finding was read one at a time.
  //
  // THIS IS NOT AN ALLOW-LIST, and the distinction is the whole point. An
  // allow-list makes a red gate green, which this repository refuses -- the
  // rule is that a check needing entries to pass is measuring the entries.
  // Nothing here is removed, hidden, or subtracted from the count. The tool
  // still reports every finding and still says 13; it just says which 13 have
  // already been argued about, so a NEW one is visible on the first line
  // instead of on the fourteenth.
  //
  // AN ENTRY EARNS ITS PLACE BY A MEASUREMENT, recorded where the adjudication
  // happened -- README's gate section for progress-step-button, and
  // docs/gate-coverage.json for the fluid list box, whose ring was measured
  // moving from `outline: none` to `rgb(15,98,254) solid 2px` on the WRAPPER,
  // where this tool cannot look. If an entry cannot name that measurement it
  // does not belong here.
  const ADJUDICATED = [
    { rule: 'no visible focus change', what: 'rux--progress-step-button',
      why: 'Carbon draws the ring on :focus-visible on the LABEL and sets outline:none on plain :focus; a real Tab press shows it. README, gates section.' },
    { rule: 'no visible focus change', what: 'rux--list-box__field', where: 'fluid',
      why: 'the fluid list box rings its WRAPPER and Carbon sets outline:none on the field. Measured: wrapper outline none -> rgb(15,98,254) solid 2px on focus.' },
    { rule: 'no visible focus change', what: 'rux--tree-node', where: 'treeview',
      why: 'Carbon rings the CHILD div, `.tree-node:focus > .tree-node__label`, and sets outline:none on the li. Measured 2026-09-01: label outline none -> rgb(15,98,254) solid 2px; the li unchanged.' },
    { rule: 'no visible focus change', what: 'rux--file-filename-button', where: 'file-uploader',
      why: 'Carbon writes `outline: revert` on this button, the one place the stylesheet hands focus back to the UA ring. Measured 2026-09-01: outline none 1.5px -> auto 1px, which this tool discounts by rule.' },
    { rule: 'no visible focus change', what: 'rux--list-box__field', where: 'multiselect',
      why: 'as the fluid list box: Carbon sets `.multi-select .list-box__field:focus { outline: 2px solid transparent }` and js/list-box.js rings the WRAPPER by class, as React does. Measured 2026-09-01: wrapper outline none -> rgb(15,98,254) solid 2px on focus, back on blur.' },
    { rule: 'no visible focus change', what: 'rux--text-input', where: 'multiselect',
      why: 'the filterable form rings the ROOT: js/list-box.js adds `multi-select--filterable--input-focused` on focus, as React does. Measured 2026-09-01: root outline none -> rgb(15,98,254) solid 2px.' },
    { rule: 'no visible focus change', what: 'rux--text-input rux--text-input--empty', where: 'fluid',
      why: 'the fluid filterable multiselect rings its ROOT and its WRAPPER through the class js/list-box.js adds, as React does. Measured 2026-09-01: root and wrapper outline none -> rgb(15,98,254) solid 2px on focus; the input itself none. The fluid combo box beside it rings its own input and is not matched here.' },
    { rule: 'no visible focus change', what: 'rux--structured-list-input', where: 'structured-list',
      why: 'Carbon rings the ROW: js/form-controls.js adds `structured-list-row--focused-within` while the visually-hidden radio has focus, as React does. Measured 2026-09-01: row outline none -> rgb(15,98,254) solid 2px, back on blur; the radio itself is visually hidden.' },
    { rule: 'no visible focus change', what: 'rux--edit-in-place__text-input', where: 'edit-in-place',
      why: 'Carbon rings the ROOT: js adds `edit-in-place--focused` while the input has focus, as React does. Measured 2026-09-01: root outline none -> rgb(15,98,254) solid 2px; the input itself none.' },
    { rule: 'no visible focus change', what: 'rux--toggle__button', where: 'options-tile',
      why: 'the same ring the plain toggle draws on `toggle__switch::after` (measured none -> rgb(15,98,254) solid 2px on focus, identical in sink/toggle.html) -- but the tile labels its toggle by aria-labelledby with a DIV `toggle__label` and no id, exactly as the capture does, so this tool cannot reach the switch through a label[for].' },
    { rule: 'no visible focus change', what: 'rux--slider__thumb--', where: 'slider',
      why: 'the two-handle thumbs show focus by SWAPPING AN ICON: `--lower:focus` hides `thumb-icon` and shows `thumb-icon--focus`, with box-shadow and transform set to none. A child display change is outside what this tool reads. Both icons are in the fragment as captured.' },
  ];
  const isAdjudicated = f => ADJUDICATED.some(a =>
    a.rule === f.rule
    && (!a.what || String(f.what || '').includes(a.what))
    && (!a.where || a.where === f.where));

  const settled = findings.filter(isAdjudicated);
  const fresh = findings.filter(f => !isAdjudicated(f));

  console.log(`\n  check-a11y — ${findings.length} findings `
    + `(${fresh.length} NEW, ${settled.length} adjudicated), ${notes.length} notes\n`);
  if (!fresh.length && settled.length)
    console.log('  Nothing new. Every finding matches an adjudicated entry — which is not the\n'
      + '  same as nothing being wrong, only that nothing has changed since it was argued.\n');
  if (fresh.length) { console.log('  NEW:'); console.table(fresh); }
  if (settled.length) { console.log('  ADJUDICATED (reported, never suppressed):'); console.table(settled); }
  if (findings.length) console.table(by);
  if (notes.length) console.table(notes);
  console.log('\n  NOT CHECKED: screen-reader announcement, focus-ring contrast, tab-order sense.'
    + (canTestFocus ? '\n  The focus-ring check ran with transitions suppressed, so it reads the'
        + '\n  ring the cascade asks for, not one part-way through a 70ms fade. It'
        + '\n  reads the label Carbon draws the ring on, and ignores the browser'
        + '\n  default ring, so a hidden input cannot pass on UA chrome.'
      : '\n  NOT RUN: the focus-ring check, because this document does not have focus.')
    + '\n  Those need a human with an AT. See the header.\n');
  return { findings, notes, fresh, adjudicated: settled, byRule: by, focusRingChecked: canTestFocus };
})();
