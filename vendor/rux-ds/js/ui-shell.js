/* ==========================================================================
   rux-ds — UI SHELL                                    Phase 5, roadmap §4.5
   --------------------------------------------------------------------------
   Requires js/overlay.js. The side nav registers with the kernel; the
   submenus do not — they are inline disclosure, like accordion.

   THE HAMBURGER IS A RESPONSIVE CONTROL, not a desktop one. Carbon hides it
   above 66rem with `header__menu-toggle__hidden` and widens `--side-nav--ux`
   to 16rem at the same breakpoint: the panel is persistent at desktop and
   collapses behind the button below it. A template showing the button at
   desktop invents a state IBM's design does not have.

   THE HAMBURGER TOGGLES ONE CLASS CARBON ALREADY HAS. `--side-nav--ux` is
   16rem, 0 below 66rem, and `--expanded` is declared after that rule, so it
   opens the nav below the breakpoint and changes nothing above it. The sink
   harness set `style.inlineSize = '0'` by hand; a behaviour layer for a CSS
   design system should never be writing widths, and it does not need to.

   ESCAPE CLOSES THE SIDE NAV; AN OUTSIDE PRESS DOES NOT. This is the second
   place the kernel's default is wrong for a component, and for the opposite
   reason to the tooltip's: a nav panel is part of the page rather than a
   surface floating over it, so dismissing it because someone clicked the
   content they navigated to would fight the user. `dismissOn: { outside:
   false }` says so. What DOES dismiss it by pointer is its own scrim —
   `side-nav__overlay`, which only covers the viewport under the mobile media
   query, so handling it explicitly beats guessing at a breakpoint in JS.

   THE SUBMENU CHEVRON IS NOT OURS TO TURN. `.rux--side-nav__submenu[aria-
   expanded=true] .rux--side-nav__submenu-chevron > svg` rotates it in CSS, off
   the same attribute the button already needs for screen readers. Setting
   aria-expanded is the whole of the behaviour; the arrow follows.
   ========================================================================== */

/* BEHAVIOUR: verified-live · driven 2026-08-29 on
   https://react.carbondesignsystem.com/iframe.html?id=components-ui-shell-header--header-w-side-nav
   at a 900px viewport -- below the 66rem breakpoint, where the hamburger exists -- reading
   the class list, the button's attributes and the nav's measured width at each step.

   This label used to say the LAYOUT half was verified and this module's behaviour was not,
   because the docs site's own toggle uses a gatsby-theme-carbon class and is no evidence
   about the component. The component's own story is, and it confirms every mechanism here.

   CONFIRMED: `side-nav--expanded` on the nav is the entire toggle -- the nav measured 0
   closed and 256px open with no inline width anywhere, which is what "a behaviour layer
   should never be writing widths" was betting on. The trigger's aria-expanded tracks it.
   The scrim takes `side-nav__overlay-active`. The hamburger glyph really does become an X:
   the path changed from the four-bar menu to the close glyph, so the claim this file cites
   from IBM's accessibility page is now also observed.

   THE TWO DISTINCTIVE DECISIONS BOTH HELD. Escape closes the nav -- 256px back to 0,
   aria-expanded false. An outside press does NOT: clicking page content well clear of the
   panel left it open at 256px. That is exactly `dismissOn: { outside: false }`, and it was
   the part most at risk of being a guess.

   ONE DEFECT: THE NAME DID NOT MOVE WITH THE GLYPH. Carbon swaps aria-label from
   "Open menu" to "Close menu" on open. This module swapped the icon to an X and left the
   label reading "Open menu", so a sighted user saw close while a screen-reader user was
   told open -- the same shape of fault as the modal trigger's aria-expanded, an attribute
   describing the state that has just ended. Fixed, with the same "only the known pair"
   guard the glyph swap uses.

   NOT VERIFIED: the submenu chevron rotation, which is CSS off aria-expanded and was not
   driven; and the header nav's own menus.

   THE HEADER PANEL (the app switcher) · verified-live 2026-09-02 on
   https://react.carbondesignsystem.com/iframe.html?id=components-ui-shell-header--header-w-actions-and-switcher
   reading classes, attributes and the panel's measured width at each step.

   CONFIRMED: a press on the switcher action puts `header-panel--expanded` on the panel
   (0 to 256px), `header__action--active` on the button and aria-expanded=true; the
   links inside go from tabindex -1 to 0, so a collapsed panel is invisible to Tab.
   A second press closes it. An OUTSIDE press closes it, and so does Escape on the
   document — the opposite of the side nav on both counts, which is why the panel
   takes the kernel's defaults and the nav declines them. Focus does NOT move into
   the panel on open: document.activeElement stayed on the body.

   NOT REIMPLEMENTED: Carbon's HeaderPanel `onHeaderPanelFocus`, which the story does
   not exercise; nothing here manages focus beyond the tabindex swap.
   ========================================================================== */
(() => {
  'use strict';
  const overlay = window.Rux?.overlay;
  if (!overlay) return; // js/overlay.js must load first

  const EXPANDED = 'rux--side-nav--expanded';
  const live = new Map();   // nav -> { registration, trigger }

  const scrimFor = nav => nav.closest('.rux--header, body')
    ?.querySelector('.rux--side-nav__overlay') ?? null;

  // THE HAMBURGER BECOMES AN X, which IBM specifies for this control and no
  // stylesheet can do: the glyph is a <use> target, not a background image.
  // UI-shell-left-panel/accessibility.mdx — "The hamburger button's icon
  // becomes an X, and must be activated to close the left panel."
  //
  // ONLY THE KNOWN PAIR IS SWAPPED. A trigger pointing at anything else is a
  // product's own icon and is left alone; swapping it would be this module
  // deciding what a page's chrome looks like, which is not its job.
  const GLYPH = { closed: '#i-menu', open: '#i-close' };
  function setTriggerGlyph(trigger, open) {
    const use = trigger?.querySelector('svg use');
    if (!use) return;
    const attr = use.hasAttribute('href') ? 'href' : 'xlink:href';
    const now = use.getAttribute(attr);
    if (now !== GLYPH.closed && now !== GLYPH.open) return;
    use.setAttribute(attr, open ? GLYPH.open : GLYPH.closed);
  }

  // THE NAME HAS TO MOVE WITH THE GLYPH, and it did not until 2026-08-29.
  // Carbon swaps aria-label "Open menu" to "Close menu" when the nav opens --
  // measured on components-ui-shell-header--header-w-side-nav. Ours swapped the
  // icon to an X and left the label saying "Open menu", so a sighted user saw
  // close and a screen-reader user was told open. The same shape of fault as
  // the modal trigger's aria-expanded: an attribute describing the old state.
  //
  // ONLY THE KNOWN PAIR IS SWAPPED, exactly as the glyph is. A trigger labelled
  // anything else is a product's own wording -- most likely translated -- and
  // overwriting it with English would be worse than leaving it. That also means
  // a localised shell gets no swap and must set `data-rux-label-open`.
  const LABEL = { closed: 'Open menu', open: 'Close menu' };
  function setTriggerLabel(trigger, open) {
    if (!trigger) return;
    const pair = {
      closed: trigger.getAttribute('data-rux-label-closed') ?? LABEL.closed,
      open: trigger.getAttribute('data-rux-label-open') ?? LABEL.open,
    };
    const now = trigger.getAttribute('aria-label');
    if (now !== pair.closed && now !== pair.open) return;
    trigger.setAttribute('aria-label', open ? pair.open : pair.closed);
  }

  /* `adopt` MARKS THE INIT PASS, and it changes exactly one thing: whether
     registering this nav dismisses what is already on the overlay stack.

     A nav shipped `--expanded` did not open because anyone chose it, so it must
     not tear down surfaces the markup also declared open. Without this the shell
     adopted the sink's open nav, register() ran its default dismissAbove(), and
     both of dropdown.html's expanded dropdowns closed before the page had
     settled — at rest, with nothing pressed. The classes stayed in the static
     markup, so check-coverage kept counting a state no reader could see.

     A hamburger PRESS is the opposite case and keeps the default: choosing to
     open the navigation should close a menu you left open. The kernel's own
     comment draws this line for hover tooltips, which appear because a pointer
     crossed them rather than because anyone chose them. */
  function setNav(nav, open, trigger, adopt = false) {
    if (!nav) return;
    // ONLY `--expanded` IS TOGGLED, and that is the whole mechanism. Carbon's
    // cascade already says everything: `--ux` is 16rem, a max-width:65.98rem
    // rule takes it to 0, and `--expanded` is declared AFTER that rule with
    // the same specificity, so it wins below the breakpoint and is redundant
    // above it. Closed on a small screen is the absence of a class, not the
    // presence of one.
    //
    // ADDING `--hidden` HERE WAS THE BUG. It is declared before `--expanded`
    // but applies at every width, so a nav closed below the breakpoint and
    // then widened stayed 0 on a desktop whose hamburger is display:none —
    // no navigation, and nothing on the page able to bring it back. Carbon
    // uses `--hidden` for a nav that is not shown at all, which is a
    // different thing from one the reader just collapsed.
    nav.classList.toggle(EXPANDED, open);
    trigger?.setAttribute('aria-expanded', String(open));
    setTriggerGlyph(trigger, open);
    setTriggerLabel(trigger, open);
    scrimFor(nav)?.classList.toggle('rux--side-nav__overlay-active', open);

    // A NAV WITH NO TRIGGER IS NOT DISMISSIBLE, because nothing could reopen it.
    // Carbon ships two shells: the rail inside the header has a hamburger, and
    // Escape closing it is a kindness. A `--expanded` nav standing beside the
    // header has no hamburger in any capture, so registering it meant one
    // Escape emptied the navigation for good — 16rem to `--hidden`, the content
    // sliding under it, and no control on the page able to undo it. Dismissal
    // is only offered where a way back exists.
    const state = live.get(nav);
    if (open && !state && trigger) {
      live.set(nav, {
        registration: overlay.register({
          element: nav,
          anchor: trigger,
          dismissOn: { outside: false },   // see the header
          dismissOthers: !adopt,
          close: opts => setNav(nav, false, opts?.trigger ?? trigger),
        }),
        trigger,
      });
    } else if (!open && state) {
      state.registration?.release();
      live.delete(nav);
    }
    nav.dispatchEvent(new CustomEvent(open ? 'rux:side-nav-opened' : 'rux:side-nav-closed',
      { bubbles: true }));
  }

  /* THE HEADER PANEL. Claimed by its trigger: a header action that carries
     aria-expanded and is not the hamburger. The panel is the header's
     `.rux--header-panel`, a sibling of `__global` in every capture; an action
     may name its own with aria-controls when a header carries two.

     Carbon's story closes it on an outside press and on Escape, so it takes the
     kernel's defaults. A panel SHIPPED `--expanded` (the sink's specimen) is
     left as it is and never registered: nothing chose to open it, and closing
     a static specimen on the first press anywhere would make the sink's own
     readings depend on where the pointer went. Its button still closes it. */
  const EXPANDED_PANEL = 'rux--header-panel--expanded';
  const panels = new Map();   // panel -> registration
  const panelFor = trigger => {
    const id = trigger.getAttribute('aria-controls');
    const own = id && document.getElementById(id);
    return own ?? trigger.closest('.rux--header')?.querySelector('.rux--header-panel') ?? null;
  };
  function setPanel(panel, open, trigger) {
    panel.classList.toggle(EXPANDED_PANEL, open);
    trigger.classList.toggle('rux--header__action--active', open);
    trigger.setAttribute('aria-expanded', String(open));
    // Carbon's own tabindex swap: a collapsed panel's links are not in the tab order.
    for (const a of panel.querySelectorAll('a, button')) a.tabIndex = open ? 0 : -1;
    const reg = panels.get(panel);
    if (open && !reg) {
      panels.set(panel, overlay.register({
        element: panel,
        anchor: trigger,
        close: () => setPanel(panel, false, trigger),
      }));
    } else if (!open && reg) {
      reg.release();
      panels.delete(panel);
    }
    panel.dispatchEvent(new CustomEvent(open ? 'rux:header-panel-opened' : 'rux:header-panel-closed',
      { bubbles: true }));
  }

  function setSubmenu(button, open) {
    const item = button.closest('.rux--side-nav__item');
    const menu = item?.querySelector(':scope > .rux--side-nav__menu');
    button.setAttribute('aria-expanded', String(open));
    if (menu) {
      menu.hidden = !open;
      button.setAttribute('aria-controls', overlay.autoId(menu, 'rux-side-nav-menu'));
    }
  }

  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;

    const burger = event.target.closest('.rux--header__menu-toggle');
    if (burger) {
      const nav = burger.closest('.rux--header')?.querySelector('.rux--side-nav');
      if (nav) {
        event.preventDefault();
        setNav(nav, !nav.classList.contains(EXPANDED), burger);
      }
      return;
    }

    const action = event.target.closest('.rux--header__action[aria-expanded]:not(.rux--header__menu-toggle)');
    if (action) {
      const panel = panelFor(action);
      if (panel) {
        event.preventDefault();
        setPanel(panel, !panel.classList.contains(EXPANDED_PANEL), action);
      }
      return;
    }

    // The scrim: the pointer half of dismissal, and only ever visible on the
    // viewports where the nav actually overlays the page.
    const scrim = event.target.closest('.rux--side-nav__overlay');
    if (scrim) {
      const nav = scrim.parentElement?.querySelector('.rux--side-nav');
      if (nav) setNav(nav, false, live.get(nav)?.trigger);
      return;
    }

    const submenu = event.target.closest('.rux--side-nav__submenu');
    if (submenu) {
      event.preventDefault();
      setSubmenu(submenu, submenu.getAttribute('aria-expanded') !== 'true');
    }
  });

  /* Adopt the markup: a nav shipped `--expanded` is open, and each submenu's
     panel is hidden or shown to match the attribute the button already carries. */
  for (const nav of document.querySelectorAll('.rux--side-nav')) {
    const burger = nav.closest('.rux--header')?.querySelector('.rux--header__menu-toggle');
    if (nav.classList.contains(EXPANDED)) setNav(nav, true, burger, true);
  }
  for (const button of document.querySelectorAll('.rux--side-nav__submenu'))
    setSubmenu(button, button.getAttribute('aria-expanded') === 'true');
  // A collapsed panel's links leave the tab order on load, as Carbon renders them.
  for (const panel of document.querySelectorAll('.rux--header-panel'))
    if (!panel.classList.contains(EXPANDED_PANEL))
      for (const a of panel.querySelectorAll('a, button')) a.tabIndex = -1;

  window.Rux.uiShell = {
    openNav: (nav, trigger) => setNav(nav, true, trigger),
    closeNav: nav => setNav(nav, false, live.get(nav)?.trigger),
    toggleSubmenu: button => setSubmenu(button, button.getAttribute('aria-expanded') !== 'true'),
    openPanel: trigger => { const p = panelFor(trigger); if (p) setPanel(p, true, trigger); },
    closePanel: trigger => { const p = panelFor(trigger); if (p) setPanel(p, false, trigger); },
  };
})();
