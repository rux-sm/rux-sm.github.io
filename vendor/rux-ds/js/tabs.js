/* ==========================================================================
   rux-ds — TABS                                        Phase 5, roadmap §4.5
   --------------------------------------------------------------------------
   Requires js/overlay.js only for `autoId`; tabs are not a dismissible
   surface and never join the stack. Nothing here opens or closes.

   ROVING TABINDEX AND ARROW KEYS ARE ONE FEATURE, which is why the fragment
   carried them as a recorded omission rather than shipping half. Carbon React
   sets `tabIndex={selected ? 0 : -1}`, so exactly one tab is in the document's
   tab order and the arrows move between the rest. Ship the tabindex without
   the arrows and every unselected tab becomes unreachable by keyboard — worse
   than the plain buttons the fragment had. Both land here together.

   THE PANEL IS THE POINT. A tablist with no `tabpanel` makes `aria-controls`
   a promise to nothing, so the fragment gained `tab-content` panels — siblings
   of `.rux--tabs`, which is where components-tabs--default puts them — and
   this module keeps exactly one of them unhidden.

   SELECTION FOLLOWS FOCUS, which is the ARIA tabs pattern for panels that are
   cheap to show, and it is what Carbon does. Arrow to a tab and its panel is
   already there; there is no second keystroke to activate.

   DISABLED TABS ARE SKIPPED BY THE ARROWS ENTIRELY rather than focused and
   refused. A disabled <button> cannot take focus, so including it in the ring
   would make one arrow press appear to do nothing.
   ========================================================================== */

/* BEHAVIOUR: verified-live · driven 2026-08-29 on
   https://react.carbondesignsystem.com/iframe.html?id=components-tabs--default
   and https://react.carbondesignsystem.com/iframe.html?id=components-tabs--vertical
   clicking a real tab and sending real key events, reading tabIndex, aria-selected
   and which panel is unhidden after each.

   CONFIRMED, all of it: roving tabindex, selected 0 and every other -1. aria-selected
   toggling. Panels switched with the `hidden` attribute, addressed through aria-controls.
   SELECTION FOLLOWS FOCUS -- one arrow press moves focus, aria-selected and the visible
   panel together. Home and End select the ends. THE ARROWS WRAP: ArrowLeft on the first
   tab lands on the last and ArrowRight on the last lands on the first. And a disabled tab
   is skipped ENTIRELY -- from `Learn`, one ArrowDown passed over the disabled `Settings`
   and wrapped to `Dashboard`.

   The wrap is worth naming because list-box's did NOT survive the same test on the same
   day. A combobox clamps and a tablist wraps; they are different patterns and Carbon
   implements both, so neither answer generalises to the other.

   ONE THING WAS WRONG. Vertical was detected from aria-orientation, which Carbon does not
   set and our markup does not either, so every vertical tablist was treated as horizontal
   and answered the wrong arrows. See the keydown handler.

   NOT VERIFIED: the dismissible variant's close buttons, and the overflow scroll buttons
   that appear when a tablist is too narrow. Neither was exercised.
   ========================================================================== */
(() => {
  'use strict';
  const overlay = window.Rux?.overlay;
  if (!overlay) return; // js/overlay.js must load first

  const LIST = '.rux--tab--list[role="tablist"]';
  const SELECTED = 'rux--tabs__nav-item--selected';

  const tabsIn = list => [...list.querySelectorAll('[role="tab"]')]
    .filter(t => !t.disabled && t.getAttribute('aria-disabled') !== 'true');

  // The panel a tab controls. aria-controls is authoritative; without it there
  // is nothing to switch, and the tablist still works as a selector.
  const panelOf = tab => {
    const id = tab.getAttribute('aria-controls');
    return id ? document.getElementById(id) : null;
  };

  function select(list, tab, options = {}) {
    if (!tab || tab.disabled) return;
    for (const t of list.querySelectorAll('[role="tab"]')) {
      const on = t === tab;
      t.classList.toggle(SELECTED, on);
      t.setAttribute('aria-selected', String(on));
      // Roving: only the selected tab is tabbable. Disabled tabs stay at -1
      // whatever happens, so Tab never lands on one.
      t.tabIndex = on ? 0 : -1;
      const panel = panelOf(t);
      if (panel) panel.hidden = !on;
    }
    if (options.focus !== false) tab.focus();
    list.dispatchEvent(new CustomEvent('rux:tab-selected', {
      bubbles: true, detail: { tab, panel: panelOf(tab) },
    }));
  }

  /* ── pointer ──────────────────────────────────────────────────────────── */
  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;

    // Dismissible tabs: the close control is a SIBLING of the tab, not a child,
    // because Carbon's hover rule reaches it as `nav-item:hover + --close`.
    // Nesting it would put it out of that selector's reach — the fragment says
    // so — which is also why it is matched separately here.
    const close = event.target.closest('.rux--tabs__nav-item--close, .rux--tabs__nav-item--close-icon');
    if (close) {
      const holder = close.closest('.rux--tabs__nav-item--close') || close;
      const list = holder.closest(LIST);
      const tab = holder.previousElementSibling;
      if (!list || !tab?.matches('[role="tab"]')) return;
      event.preventDefault();
      const wasSelected = tab.classList.contains(SELECTED);
      const remaining = tabsIn(list).filter(t => t !== tab);
      panelOf(tab)?.remove();
      holder.remove();
      tab.remove();
      // Removing the selected tab leaves nothing selected and focus nowhere.
      if (wasSelected && remaining.length) select(list, remaining[0]);
      list.dispatchEvent(new CustomEvent('rux:tab-closed', { bubbles: true }));
      return;
    }

    const tab = event.target.closest('[role="tab"]');
    const list = tab?.closest(LIST);
    if (list) select(list, tab);
  });

  /* ── the tabs keyboard pattern ────────────────────────────────────────── */
  document.addEventListener('keydown', event => {
    if (!(event.target instanceof Element)) return;
    const tab = event.target.closest('[role="tab"]');
    const list = tab?.closest(LIST);
    if (!list) return;

    const ring = tabsIn(list);
    const at = ring.indexOf(tab);
    // VERTICAL IS A CLASS, NOT AN ATTRIBUTE, and reading the attribute alone
    // made this exactly wrong. Driven on components-tabs--vertical 2026-08-29:
    // ArrowDown moves and ArrowRight does nothing, so Carbon does swap the axis
    // -- but its tablist has NO aria-orientation, and neither does ours. So the
    // test below was never true, every vertical tablist was treated as
    // horizontal, and the sink's vertical tabs answered Left/Right while
    // ignoring Up/Down. Precisely inverted from the component they copy.
    //
    // The wrapper's `--vertical` class is what Carbon's own CSS keys on and
    // what our markup already carries, so it is the honest signal. The
    // attribute is still honoured for a consumer who sets it.
    const vertical = !!list.closest('.rux--tabs--vertical')
      || list.getAttribute('aria-orientation') === 'vertical';
    const prev = vertical ? 'ArrowUp' : 'ArrowLeft';
    const next = vertical ? 'ArrowDown' : 'ArrowRight';

    switch (event.key) {
      case prev:
      case next: {
        event.preventDefault();
        const by = event.key === next ? 1 : -1;
        select(list, ring[(at + by + ring.length) % ring.length]);
        break;
      }
      case 'Home':
      case 'End':
        event.preventDefault();
        select(list, event.key === 'Home' ? ring[0] : ring[ring.length - 1]);
        break;
      case 'Enter':
      case ' ':
        // Selection already followed focus; consume the key so the button does
        // not fire a second, identical selection through click.
        event.preventDefault();
        select(list, tab);
        break;
    }
  });

  /* Panels need an accessible name and a tab needs to know its panel. Where the
     markup gave neither, pair them positionally — the reference renders one
     panel per tab in order — so a template author is not forced to mint ids. */
  for (const list of document.querySelectorAll(LIST)) {
    const all = [...list.querySelectorAll('[role="tab"]')];
    const panels = [...(list.closest('.rux--tabs')?.parentElement
      ?.querySelectorAll(':scope > [role="tabpanel"]') ?? [])];
    all.forEach((tab, i) => {
      const panel = panelOf(tab) || panels[i];
      if (!panel) return;
      tab.setAttribute('aria-controls', overlay.autoId(panel, 'rux-tabpanel'));
      if (!panel.hasAttribute('aria-labelledby'))
        panel.setAttribute('aria-labelledby', overlay.autoId(tab, 'rux-tab'));
      panel.hidden = !tab.classList.contains(SELECTED);
      tab.tabIndex = tab.classList.contains(SELECTED) && !tab.disabled ? 0 : -1;
    });
  }

  window.Rux.tabs = { select: (list, tab) => select(list, tab) };
})();
