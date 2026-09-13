//
// DOES THE BEHAVIOUR LAYER STILL DO WHAT IT CLAIMS? — paste into a rendered
// page's console, or fetch it from the server the way the other browser tools
// are run.
//
// WHY THIS EXISTS. Markup and CSS have fourteen gates, a coverage ratchet, a
// provenance requirement and a CI job. `js/` had none of it: 1,942 lines across
// twelve modules whose only verification was a person clicking and forming an
// opinion. Both real bugs found on 2026-08-28/29 were behaviour, not markup —
// a batch bar keeping focusable buttons inside an `aria-hidden` subtree, and an
// overflow menu covering the last 8px of its own trigger in nine places. Neither
// is visible to a gate that reads a file, and `check-runtime-classes` declares
// itself blind to "anything behind an interaction."
//
// THE THIRD ANSWER. Roadmap §4.8 frames this as a choice between adding a
// headless browser — "a real change to what the project is" — and accepting that
// behaviour regressions are caught by people. There is a third option, and it is
// the one this file takes: write the assertions as a BROWSER TOOL, like the four
// that already exist. No dependency, no runner, no framework. A person still
// triggers it, but what they get back is a pass/fail list instead of an
// impression.
//
// WHAT THAT DOES NOT BUY. It does not run in CI, and it is not a substitute for
// the headless-browser decision — it makes that decision less urgent, not moot.
// Every case here is SYNCHRONOUS: a module that lands focus in a microtask has
// its class and attribute contract checked and its focus destination left alone,
// because a tool that returns a value cannot wait. Those are named in the case
// list rather than quietly skipped.
//
// EVERY CASE RESTORES WHAT IT TOUCHED, so the tool is idempotent and can run
// beside the other browser gates without poisoning them. That matters here more
// than elsewhere: `check-runtime-classes` must see an untouched page, and this
// one deliberately touches everything.
//
// IT ASSERTS THE CONTRACT EACH MODULE STATES ABOUT ITSELF, not an idea of how
// the component ought to work. Where a module's header names a rule — "only
// `--expanded` is toggled", "the surface is a sibling, never a child" — that
// sentence is the assertion.
//
(() => {
  const cases = [];
  // `ok` IS COERCED, so only `skip()` can ever produce `null`. Several
  // assertions are written as `node && test(node)`, which yields null rather
  // than false when the node is missing — harmless while `!c.ok` sorted the
  // cases, and a silent reclassification of a real failure into a skip once
  // `null` came to mean absence. Measured 2026-09-08: with `#tabs` emptied,
  // `its panel is shown` reported SKIP where the honest answer is FAIL.
  const record = (module, name, ok, detail) =>
    cases.push({ module, name, ok: !!ok, detail: ok ? '' : detail });
  // ABSENT IS NOT BROKEN, AND BROKEN IS NOT ABSENT. `ok: null` means the page
  // does not carry the component, so there was nothing to assert; `ok: false`
  // stays what it always was, a contract the page claims and does not keep.
  // THE LINE BETWEEN THEM IS THE COMPONENT ROOT: root missing is a skip, root
  // present with a required descendant or relationship missing is a FAILURE.
  // Written down because the first draft of this change (2026-09-08) skipped
  // both, which quietly retired five contracts — a table with rows and no
  // batch bar, a tablist that cannot rove, a number input with one stepper, a
  // modal trigger naming nothing, and a shell action controlling nothing.
  const skip = (module, name, detail) =>
    cases.push({ module, name, ok: null, detail });

  const q = sel => document.querySelector(sel);
  const has = (el, c) => !!el && el.classList.contains(c);
  // SCOPE IS CHOSEN ONCE PER CASE, NEVER PER QUERY. The sink lays each
  // component out in a `<section id>`; a page built from `templates/` does not.
  // So the section is the scope where it exists and the document is the scope
  // where it does not, and every query for one case comes from that SAME root.
  // A PER-QUERY FALLBACK LETS A BROKEN SINK SECTION ESCAPE, AND IT WAS
  // MEASURED DOING SO. The sink carries ten `[role="tablist"]`, three of them
  // outside `#tabs`, and fifteen `button[role="combobox"]`, seven outside
  // `#dropdown`. Emptying `#tabs` of tablists on 2026-09-08 sent the per-query
  // version into the CONTENT SWITCHER, where it ran the tab assertions against
  // a different component and reported a failure that component never owed.
  const fixture = section => q(section) ?? document;

  // A real click. The modules bind at document level, so a synthetic
  // `dispatchEvent` on a detached path would miss the delegation entirely.
  const click = el => el.click();
  // Dispatched on the element, bubbling, because every module listens on
  // document. Not a trusted event — it cannot test what the browser does with a
  // key, only what our own handlers do with one, which is what is being checked.
  const key = (el, k) => el.dispatchEvent(
    new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));

  // ── data-table: the batch bar ─────────────────────────────────────────────
  // The bug this file exists for. Closed must be aria-hidden with every button
  // out of the tab order; open must be neither. js/data-table.js moves the two
  // together because both derive from the same count.
  // THE FIRST DRAFT OF THIS CASE FAILED, AND THE TEST WAS WRONG. It clicked one
  // row twice and expected the bar to close, but sink/table.html ships its
  // SECOND row checked on purpose — `--active` is the state that table is
  // genuinely in at load, so check-coverage can see the class. One row still
  // selected keeps the bar open, correctly. A behaviour test has to drive the
  // page to a known state rather than assume one, or it measures the fixture.
  (() => {
    const root = fixture('#table');
    const rows = [...root.querySelectorAll(
      'tbody td.rux--table-column-checkbox input[type="checkbox"]')];
    const bar = root.querySelector('.rux--batch-actions');
    if (!rows.length) return skip('data-table', 'batch bar', 'no selectable table on this page');
    if (!bar) return record('data-table', 'batch bar', false,
      'a selectable table with no batch bar — js/data-table.js derives one from the same count');
    const was = rows.map(r => r.checked);
    const btns = () => [...bar.querySelectorAll('button')];
    const state = () => `aria-hidden=${bar.getAttribute('aria-hidden')} tabindex=[${btns().map(b => b.tabIndex)}]`;

    for (const r of rows) if (r.checked) click(r);          // known state: none selected
    record('data-table', 'with nothing selected the bar is hidden and out of the tab order',
      bar.getAttribute('aria-hidden') === 'true' && btns().every(b => b.tabIndex === -1)
      && !has(bar, 'rux--batch-actions--active'), state());

    click(rows[0]);
    record('data-table', 'selecting a row opens it and returns its buttons to the tab order',
      bar.getAttribute('aria-hidden') === 'false' && btns().every(b => b.tabIndex === 0)
      && has(bar, 'rux--batch-actions--active'), state());

    click(rows[0]);
    record('data-table', 'deselecting the last row closes it and takes them back out',
      bar.getAttribute('aria-hidden') === 'true' && btns().every(b => b.tabIndex === -1)
      && !has(bar, 'rux--batch-actions--active'), state());

    rows.forEach((r, i) => { if (r.checked !== was[i]) click(r); });
  })();

  // ── menu: the overflow list sits below its trigger ────────────────────────
  // The second bug. Carbon's CSS pre-positions at 32px for an `sm` trigger while
  // the trigger defaults to `md` at 40px, so without the module writing an
  // offset the list covers 8px of the button that opens it.
  (() => {
    const root = fixture('#overflow-menu');
    // `.ks-row` is sink furniture; off the sink the wrapper is the trigger's
    // own parent, which keeps the trigger and its list one pairing.
    const wrap = root.querySelector('.ks-row > div')
      ?? root.querySelector('button.rux--overflow-menu')?.parentElement;
    const trigger = wrap?.querySelector('button.rux--overflow-menu');
    const list = wrap?.querySelector('.rux--overflow-menu-options');
    if (!trigger) return skip('menu', 'overflow offset', 'no overflow menu on this page');
    if (!list) return record('menu', 'overflow offset', false,
      'an overflow trigger with no options list in its wrapper');

    click(trigger);
    const tr = trigger.getBoundingClientRect(), lr = list.getBoundingClientRect();
    const overlap = Math.round(tr.bottom - lr.top);
    record('menu', 'an open overflow list is flush below its trigger, not over it',
      overlap === 0, `overlaps by ${overlap}px`);
    record('menu', 'the trigger reports itself expanded',
      trigger.getAttribute('aria-expanded') === 'true',
      `aria-expanded=${trigger.getAttribute('aria-expanded')}`);

    click(trigger);
    record('menu', 'closing clears the offset it wrote',
      list.style.insetBlockStart === '', `left "${list.style.insetBlockStart}"`);
  })();

  // ── tabs: roving tabindex, and the panel follows ──────────────────────────
  (() => {
    const root = fixture('#tabs');
    const list = root.querySelector('[role="tablist"]');
    if (!list) return skip('tabs', 'roving tabindex', 'no tablist on this page');
    const tabs = [...list.querySelectorAll('[role="tab"]')];
    if (tabs.length < 2) return record('tabs', 'roving tabindex', false,
      `a tablist carrying ${tabs.length} tab(s) — roving is what a tablist is for`);
    const first = tabs.find(t => t.getAttribute('aria-selected') === 'true') || tabs[0];
    const other = tabs.find(t => t !== first);

    click(other);
    const sel = other.getAttribute('aria-selected') === 'true'
      && first.getAttribute('aria-selected') === 'false';
    record('tabs', 'selecting a tab deselects the previous one', sel,
      `selected=[${tabs.map(t => t.getAttribute('aria-selected'))}]`);
    record('tabs', 'exactly one tab is in the tab order',
      tabs.filter(t => t.tabIndex === 0).length === 1,
      `tabindex=[${tabs.map(t => t.tabIndex)}]`);

    // A VERTICAL TABLIST ANSWERS UP AND DOWN, and until 2026-08-29 it answered
    // Left and Right instead — vertical was read off aria-orientation, which
    // neither Carbon nor this markup sets, so the axis never swapped.
    // Its own root, not a part of the horizontal one: a page with no vertical
    // tabs is not a page with a broken tablist.
    const vroot = q('.rux--tabs--vertical');
    const vlist = vroot?.querySelector('[role="tablist"]');
    if (!vroot) {
      skip('tabs', 'a vertical tablist answers the vertical arrows',
        'no vertical tablist on this page');
    } else if (!vlist) {
      record('tabs', 'a vertical tablist answers the vertical arrows', false,
        'a vertical tabs root with no tablist inside it');
    } else {
      const vt = [...vlist.querySelectorAll('[role="tab"]')];
      const at = () => vt.indexOf(document.activeElement);
      vt[0].focus();
      key(document.activeElement, 'ArrowDown');
      const down = at();
      vt[0].focus();
      key(document.activeElement, 'ArrowRight');
      const right = at();
      vt[0].focus();
      record('tabs', 'a vertical tablist answers the vertical arrows',
        down === 1 && right === 0,
        `ArrowDown -> ${down} (want 1), ArrowRight -> ${right} (want 0, it is the wrong axis)`);
    }
    const panel = document.getElementById(other.getAttribute('aria-controls'));
    record('tabs', 'its panel is shown and the others are hidden',
      panel && !panel.hidden, panel ? `hidden=${panel.hidden}` : 'no panel for aria-controls');

    click(first);
  })();

  // ── accordion: the attribute and the class move together ──────────────────
  (() => {
    const root = fixture('#accordion');
    const head = root.querySelector('.rux--accordion__heading');
    if (!head) return skip('accordion', 'toggle', 'no accordion on this page');
    const item = head.closest('.rux--accordion__item');
    const before = head.getAttribute('aria-expanded');

    click(head);
    const flipped = head.getAttribute('aria-expanded') !== before
      && has(item, 'rux--accordion__item--active') === (head.getAttribute('aria-expanded') === 'true');
    record('accordion', 'a heading toggles aria-expanded and the item class together',
      flipped, `aria-expanded ${before} -> ${head.getAttribute('aria-expanded')}, ` +
      `--active=${has(item, 'rux--accordion__item--active')}`);

    click(head);
    record('accordion', 'and toggles back', head.getAttribute('aria-expanded') === before,
      `ended at ${head.getAttribute('aria-expanded')}`);

    // aria-controls NAMES THE CONTENT, which is where Carbon points it. This
    // module pointed at the wrapper until 2026-08-29 — both resolve, but only
    // one matches the component being copied.
    const target = document.getElementById(head.getAttribute('aria-controls'));
    record('accordion', 'aria-controls names the content panel',
      !!target && target.classList.contains('rux--accordion__content'),
      `aria-controls=${head.getAttribute('aria-controls')} -> ${target ? target.className : 'nothing'}`);

    // THE DECLINE, ASSERTED. Carbon implements no arrow-key navigation here and
    // neither does this; without a case saying so, adding it later would look
    // like a fix rather than a divergence.
    const heads = [...root.querySelectorAll('.rux--accordion__heading')];
    head.focus();
    const wasFocus = document.activeElement;
    const wasExpanded = heads.map(h => h.getAttribute('aria-expanded')).join(',');
    key(head, 'ArrowDown');
    key(head, 'End');
    record('accordion', 'arrow keys are declined, as Carbon declines them',
      document.activeElement === wasFocus
      && heads.map(h => h.getAttribute('aria-expanded')).join(',') === wasExpanded,
      `focus moved: ${document.activeElement !== wasFocus}, expanded now ${heads.map(h => h.getAttribute('aria-expanded')).join(',')}`);
  })();

  // ── modal + the overlay kernel ────────────────────────────────────────────
  // Focus lands in a microtask, so this checks the class and attribute contract
  // and leaves where focus went to check-a11y.
  (() => {
    const root = fixture('#modal');
    const trigger = root.querySelector('[data-rux-open]');
    if (!trigger) return skip('modal', 'open and dismiss', 'no modal trigger on this page');
    const modal = document.getElementById(trigger.getAttribute('data-rux-open'));
    if (!modal) return record('modal', 'open and dismiss', false,
      `the trigger names #${trigger.getAttribute('data-rux-open')} and no such element exists`);

    click(trigger);
    record('modal', 'a trigger opens the surface it names',
      has(modal, 'is-visible'), `class="${modal.className}"`);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    record('modal', 'Escape dismisses it through the kernel',
      !has(modal, 'is-visible'), `still visible: ${has(modal, 'is-visible')}`);

    // WHERE THE DIALOG ROLE LIVES. Carbon puts role=presentation on the scrim
    // and the dialog on the container; ours had it the other way until
    // 2026-08-29, which made the full-viewport backdrop the dialog.
    const container = modal.querySelector('.rux--modal-container');
    record('modal', 'the container is the dialog, not the scrim',
      modal.getAttribute('role') === 'presentation'
      && container?.getAttribute('role') === 'dialog'
      && container?.getAttribute('aria-modal') === 'true',
      `root role=${modal.getAttribute('role')}, `
      + `container role=${container?.getAttribute('role')} aria-modal=${container?.getAttribute('aria-modal')}`);

    // aria-expanded described a region that expands in place. A dialog is not
    // one, and Carbon sets nothing on the trigger at all.
    click(trigger);
    const expandedWhileOpen = trigger.getAttribute('aria-expanded');
    key(document, 'Escape');
    record('modal', 'the trigger is never given aria-expanded',
      expandedWhileOpen === null && trigger.getAttribute('aria-expanded') === null,
      `while open: ${expandedWhileOpen}, after close: ${trigger.getAttribute('aria-expanded')}`);
  })();

  // ── ui-shell: the hamburger, and what does NOT dismiss the nav ───────────
  // Confirmed on components-ui-shell-header--header-w-side-nav at 900px
  // 2026-08-29: --expanded alone takes the nav 0 to 256px, the glyph becomes
  // an X, aria-label swaps to "Close menu", Escape closes it, and an outside
  // press does not.
  (() => {
    const root = fixture('#ui-shell');
    const trigger = root.querySelector('.rux--header__menu-trigger');
    const nav = root.querySelector('.rux--side-nav');
    if (!trigger) return skip('ui-shell', 'hamburger', 'no shell here');
    if (!nav) return record('ui-shell', 'hamburger', false,
      'a menu trigger with no side nav in the same shell');
    const EXP = 'rux--side-nav--expanded';
    const glyph = () => trigger.querySelector('svg use')?.getAttribute('href');

    // Drive it to a known closed state first; the sink ships this nav open.
    if (has(nav, EXP)) click(trigger);
    const closedGlyph = glyph(), closedLabel = trigger.getAttribute('aria-label');

    click(trigger);
    record('ui-shell', 'the hamburger opens the nav and becomes an X',
      has(nav, EXP) && glyph() === '#i-close'
      && trigger.getAttribute('aria-expanded') === 'true',
      `--expanded=${has(nav, EXP)}, glyph=${glyph()}, aria-expanded=${trigger.getAttribute('aria-expanded')}`);

    // THE NAME MOVES WITH THE GLYPH. Until 2026-08-29 the icon became an X
    // while aria-label still read "Open menu".
    record('ui-shell', 'and its accessible name changes with it',
      trigger.getAttribute('aria-label') !== closedLabel,
      `label stayed "${trigger.getAttribute('aria-label')}"`);

    // AN OUTSIDE PRESS MUST NOT CLOSE IT. Carbon leaves it open; a nav is part
    // of the page, not a surface over it.
    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    record('ui-shell', 'an outside press does not dismiss the nav',
      has(nav, EXP), `--expanded=${has(nav, EXP)} after a press on the body`);

    key(document, 'Escape');
    record('ui-shell', 'but Escape does',
      !has(nav, EXP) && glyph() === closedGlyph,
      `--expanded=${has(nav, EXP)}, glyph=${glyph()}`);
  })();

  // ── ui-shell: the switcher panel, which DOES dismiss on an outside press ─
  // Confirmed on components-ui-shell-header--header-w-actions-and-switcher
  // 2026-09-02: a press expands the panel 0 to 256px and marks the action
  // active, the links' tabindex goes -1 to 0, a second press closes it, an
  // outside press closes it, Escape closes it, focus stays where it was.
  (() => {
    // BY NAME SINCE 2026-09-02: the Account action carries aria-expanded too
    // now, and comes first, so "the first expandable action" stopped being the
    // switcher. Each action names its panel with aria-controls.
    const root = fixture('#ui-shell');
    const trigger = root.querySelector('.rux--header__action[aria-label="App switcher"]');
    if (!trigger) return skip('ui-shell', 'switcher', 'no switcher here');
    const panel = document.getElementById(trigger.getAttribute('aria-controls') || '');
    if (!panel) return record('ui-shell', 'switcher', false,
      `the action controls "${trigger.getAttribute('aria-controls')}" and no such element exists`);
    const EXP = 'rux--header-panel--expanded';
    const link = panel.querySelector('a');
    if (has(panel, EXP)) click(trigger);

    click(trigger);
    record('ui-shell', 'the switcher opens its panel and marks the action active',
      has(panel, EXP) && has(trigger, 'rux--header__action--active')
      && trigger.getAttribute('aria-expanded') === 'true' && link?.tabIndex === 0,
      `--expanded=${has(panel, EXP)}, active=${has(trigger, 'rux--header__action--active')}, tabindex=${link?.tabIndex}`);

    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    record('ui-shell', 'an outside press closes the panel, unlike the nav',
      !has(panel, EXP) && link?.tabIndex === -1,
      `--expanded=${has(panel, EXP)}, tabindex=${link?.tabIndex}`);

    click(trigger);
    key(document, 'Escape');
    record('ui-shell', 'and so does Escape',
      !has(panel, EXP) && trigger.getAttribute('aria-expanded') === 'false',
      `--expanded=${has(panel, EXP)}`);

    click(trigger); click(trigger);
    record('ui-shell', 'and a second press',
      !has(panel, EXP), `--expanded=${has(panel, EXP)} after two presses`);
  })();

  // ── ui-shell: two panels in one header, each action opens its own ────────
  // Added 2026-09-02 with the account panel (roadmap §4.13). js/ui-shell.js
  // resolves a panel through aria-controls when the action names one; the
  // Account action must open #rux-account-panel and leave the switcher's
  // closed, and opening the switcher must close it, because the kernel keeps
  // one dismissible surface on the stack.
  //
  // THIS CASE IS NOT SECTION-SCOPED, AND THE OTHER TWO ABOVE IT ARE. Corrected
  // 2026-09-11 after it started skipping. It read `fixture('#ui-shell')` for
  // the two ACTIONS while resolving their PANELS with document.getElementById
  // two lines later -- half-scoped, and only ever correct while one shell on
  // the page owned both halves. `aria-controls` names an id, and an id is
  // document-scoped by definition, so the action and its target are resolved
  // the same way now.
  //
  // WHAT MADE IT SKIP, because the cause is the useful half: kitchen-sink.html
  // gained a real shell, the ui-shell SPECIMEN was carrying the canonical
  // rux-account-panel and rux-switcher-panel ids, and thirteen ids existed
  // twice on one page. The specimen took ks- ids; nothing inside #ui-shell
  // names the canonical panels any more, so a section-scoped lookup finds
  // nothing and the case reported "no account panel here" on a page that has
  // one.
  //
  // WHAT THIS MAKES WEAKER, stated rather than left to be discovered: the case
  // no longer asserts anything about the SPECIMEN. It follows whichever shell
  // on the page owns those two ids -- the page's own on kitchen-sink.html, a
  // consumer's on a consumer page -- so the sink's ui-shell fragment now has
  // no case exercising its panel pair. That is a real loss of one fixture's
  // coverage, traded for the case testing the shell a reader actually uses.
  // If the specimen is ever to be covered again it needs its own case naming
  // the ks- ids, which is a second fixture and not this edit.
  (() => {
    const account = document.querySelector('.rux--header__action[aria-controls="rux-account-panel"]');
    const grid = document.querySelector('.rux--header__action[aria-controls="rux-switcher-panel"]');
    if (!account && !grid) return skip('ui-shell', 'account panel', 'no account panel here');
    const ap = document.getElementById('rux-account-panel');
    const sp = document.getElementById('rux-switcher-panel');
    if (!account || !grid || !ap || !sp) return record('ui-shell', 'account panel', false,
      `action account=${!!account} grid=${!!grid}, `
      + `#rux-account-panel=${!!ap} #rux-switcher-panel=${!!sp}`);
    const EXP = 'rux--header-panel--expanded';
    if (has(ap, EXP)) click(account);
    if (has(sp, EXP)) click(grid);

    click(account);
    record('ui-shell', 'the Account action opens its own panel and not the switcher',
      has(ap, EXP) && !has(sp, EXP) && account.getAttribute('aria-expanded') === 'true',
      `account=${has(ap, EXP)}, switcher=${has(sp, EXP)}, aria-expanded=${account.getAttribute('aria-expanded')}`);

    click(grid);
    record('ui-shell', 'opening the switcher closes the account panel',
      has(sp, EXP) && !has(ap, EXP) && account.getAttribute('aria-expanded') === 'false',
      `account=${has(ap, EXP)}, switcher=${has(sp, EXP)}`);
    click(grid);
  })();

  // ── profile and theme: the local profile round trip ──────────────────────
  // js/profile.js: a theme radio moves data-theme on <html> and stores it; a
  // name stores as typed. js/theme.js: apply() puts a stored theme on <html>
  // and refuses a value that does not look like a theme name. Everything
  // touched — storage, the theme, the name — is restored.
  (() => {
    const P = window.Rux?.profile, T = window.Rux?.theme;
    const panel = document.getElementById('rux-account-panel');
    if (!P || !T || !panel) return skip('profile', 'local profile', 'no account panel or modules here');
    const radio = panel.querySelector('input[name="rux-theme"][value="g90"]');
    const name = document.getElementById('rux-profile-name');
    if (!radio || !name) return record('profile', 'local profile', false,
      `inside the account panel: g90 radio=${!!radio}, #rux-profile-name=${!!name}`);
    const html = document.documentElement;
    const before = { theme: html.dataset.theme, stored: localStorage.getItem(T.KEY), name: name.value };

    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
    record('profile', 'a theme radio moves data-theme on <html> and stores it',
      html.dataset.theme === 'g90' && T.read()?.theme === 'g90',
      `data-theme=${html.dataset.theme}, stored=${T.read()?.theme}`);

    name.value = 'Check';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    record('profile', 'a typed name is stored',
      T.read()?.name === 'Check', `stored name=${T.read()?.name}`);

    localStorage.setItem(T.KEY, JSON.stringify({ theme: 'g10' }));
    record('theme', 'apply() puts the stored theme on <html>',
      T.apply() === 'g10' && html.dataset.theme === 'g10', `data-theme=${html.dataset.theme}`);

    localStorage.setItem(T.KEY, JSON.stringify({ theme: 'not a theme!' }));
    html.dataset.theme = 'white';
    record('theme', 'and refuses a value that is not a theme name',
      T.apply() === null && html.dataset.theme === 'white', `data-theme=${html.dataset.theme}`);

    if (before.stored === null) localStorage.removeItem(T.KEY); else localStorage.setItem(T.KEY, before.stored);
    if (before.theme === undefined) delete html.dataset.theme; else html.dataset.theme = before.theme;
    name.value = before.name;
    window.dispatchEvent(new StorageEvent('storage', { key: T.KEY }));  // re-render the radios to the restored theme
  })();

  // ── tile: the collapsed cap is an inline value, and it round-trips ────────
  // Confirmed on components-tile--expandable 2026-08-29: Carbon's collapsed
  // tile carries style="max-height: 232px", expanding CLEARS it and adds
  // tile--is-expanded, collapsing restores it. The fold is visibility:hidden
  // and still occupies layout, which is why no class can express the height.
  (() => {
    const tile = fixture('#tile').querySelector('.rux--tile--expandable');
    if (!tile) return skip('tile', 'expand', 'no expandable tile here');
    const capped = tile.style.maxHeight;
    if (!capped) return record('tile', 'a collapsed tile carries an inline max-height',
      false, 'no inline max-height at load — the fold was never measured');
    record('tile', 'a collapsed tile carries an inline max-height', true, capped);

    click(tile);
    const openOk = has(tile, 'rux--tile--is-expanded') && tile.style.maxHeight === '';
    record('tile', 'expanding clears the cap and marks the tile expanded',
      openOk, `--is-expanded=${has(tile, 'rux--tile--is-expanded')}, maxHeight="${tile.style.maxHeight}"`);

    click(tile);
    record('tile', 'collapsing restores the same cap',
      !has(tile, 'rux--tile--is-expanded') && tile.style.maxHeight === capped,
      `maxHeight="${tile.style.maxHeight}" (was "${capped}")`);
  })();

  // ── popover: the container is what opens ──────────────────────────────────
  // Confirmed on components-popover--tab-tip 2026-08-29: clicking the trigger
  // toggles popover--open on the CONTAINER and aria-expanded on the trigger,
  // together, twice. Neither alone is the state.
  (() => {
    const container = fixture('#popover').querySelector('.rux--popover-container:not(.rux--tooltip)');
    if (!container) return skip('popover', 'toggle', 'no click popover here');
    const trigger = container.querySelector('button');
    if (!trigger) return record('popover', 'toggle', false, 'no trigger in the container');

    click(trigger);
    const opened = has(container, 'rux--popover--open')
      && trigger.getAttribute('aria-expanded') === 'true';
    record('popover', 'a click opens the container and marks the trigger expanded',
      opened, `open=${has(container, 'rux--popover--open')}, `
      + `aria-expanded=${trigger.getAttribute('aria-expanded')}`);

    key(document, 'Escape');
    record('popover', 'Escape closes it and clears aria-expanded',
      !has(container, 'rux--popover--open')
      && trigger.getAttribute('aria-expanded') === 'false',
      `open=${has(container, 'rux--popover--open')}, `
      + `aria-expanded=${trigger.getAttribute('aria-expanded')}`);
  })();

  // ── dismiss: removed, not hidden ──────────────────────────────────────────
  // js/dismiss.js states Carbon's React unmounts rather than hides, and that a
  // hidden-but-present element would keep answering querySelectorAll.
  (() => {
    const close = fixture('#notification').querySelector('.rux--inline-notification__close-button');
    if (!close) return skip('dismiss', 'removal', 'no dismissible notification here');
    const box = close.closest('.rux--inline-notification');
    const parent = box.parentNode, next = box.nextSibling;

    click(close);
    record('dismiss', 'dismissing removes the box from the DOM rather than hiding it',
      !box.isConnected, box.isConnected ? 'still connected' : '');

    if (!box.isConnected) parent.insertBefore(box, next);

    // FOCUS GOES TO THE NEXT ONE, which Carbon does too — measured on
    // components-tag--dismissible 2026-08-29, where dismissing the tag at
    // index 3 left focus on the tag that slid into index 3.
    // TWO DISMISSIBLE TAGS IS AN ARRANGEMENT THIS TEST NEEDS, not a contract
    // the tag component owes — unlike a tablist, which exists to rove. So one
    // tag skips rather than fails.
    const tags = [...fixture('#tags').querySelectorAll('.rux--tag')]
      .filter(t => t.querySelector('.rux--tag__close-icon'));
    // TWO IS ENOUGH: dismiss the first and the second is the "next". The sink
    // ships two dismissible tags because two is what the specimen needs, and a
    // test that asks for a third would be measuring the markup it demanded.
    if (tags.length < 2) {
      skip('dismiss', 'focus lands on the next dismissible',
        `only ${tags.length} dismissible tags here, need 2`);
    } else {
      const victim = tags[0];
      const wanted = tags[1].querySelector('.rux--tag__close-icon');
      const p2 = victim.parentNode, n2 = victim.nextSibling;
      click(victim.querySelector('.rux--tag__close-icon'));
      record('dismiss', 'focus lands on the next dismissible',
        document.activeElement === wanted,
        `focus on ${document.activeElement.tagName}.${(document.activeElement.className || '').split(' ')[0]}`);
      if (!victim.isConnected) p2.insertBefore(victim, n2);
    }
  })();

  // ── form-controls: the toggle ─────────────────────────────────────────────
  (() => {
    const toggle = fixture('#toggle').querySelector('.rux--toggle__button');
    if (!toggle) return skip('form-controls', 'toggle', 'no toggle on this page');
    const before = toggle.getAttribute('aria-checked');

    click(toggle);
    record('form-controls', 'the toggle flips aria-checked',
      toggle.getAttribute('aria-checked') !== before,
      `stayed ${toggle.getAttribute('aria-checked')}`);

    click(toggle);

    // THE STEPPERS STEP THE RIGHT WAY, and they are told apart by the class
    // Carbon marks them with. Until 2026-08-29 our markup carried neither
    // down-icon nor up-icon, so both sat at CSS `order: 0` and only DOM order
    // decided what a user saw — which made reading position work by accident.
    const num = fixture('#number').querySelector('.rux--number');
    const input = num?.querySelector('input[type="number"]');
    const btns = num ? [...num.querySelectorAll('.rux--number__control-btn')] : [];
    if (!num) {
      skip('form-controls', 'the steppers are marked up/down and step that way',
        'no number input on this page');
    } else if (!input || btns.length < 2) {
      record('form-controls', 'the steppers are marked up/down and step that way',
        false, `a number root with input=${!!input} and ${btns.length} control(s), need 2`);
    } else {
      const marked = btns.some(b => b.classList.contains('down-icon'))
        && btns.some(b => b.classList.contains('up-icon'));
      const start = Number(input.value);
      click(btns.find(b => b.classList.contains('up-icon')) ?? btns[1]);
      const afterUp = Number(input.value);
      click(btns.find(b => b.classList.contains('down-icon')) ?? btns[0]);
      const afterDown = Number(input.value);
      record('form-controls', 'the steppers are marked up/down and step that way',
        marked && afterUp === start + 1 && afterDown === start,
        `marked=${marked}, ${start} -> up ${afterUp} -> down ${afterDown}`);
    }
  })();

  // ── list-box: the dropdown its consumers are built from ───────────────────
  (() => {
    const trigger = fixture('#dropdown').querySelector('button[role="combobox"]');
    if (!trigger) return skip('list-box', 'open', 'no dropdown trigger on this page');
    const menu = trigger.closest('.rux--list-box')?.querySelector('.rux--list-box__menu');

    click(trigger);
    const open = trigger.getAttribute('aria-expanded') === 'true'
      && menu && menu.getBoundingClientRect().height > 0;
    record('list-box', 'the trigger opens a menu with height',
      open, `aria-expanded=${trigger.getAttribute('aria-expanded')}, ` +
      `height=${menu ? Math.round(menu.getBoundingClientRect().height) : 'n/a'}`);

    click(trigger);
    record('list-box', 'and closes it',
      trigger.getAttribute('aria-expanded') === 'false',
      `aria-expanded=${trigger.getAttribute('aria-expanded')}`);

    // BOTH OF THESE WERE WRONG UNTIL 2026-08-29, and both were found by driving
    // Carbon rather than by reading ours. They are here so the next edit to
    // list-box.js cannot quietly restore either.
    const cursor = () => {
      const id = trigger.getAttribute('aria-activedescendant');
      const opts = [...trigger.closest('.rux--list-box')
        .querySelectorAll('.rux--list-box__menu-item[role="option"]')];
      return opts.findIndex(o => o.id === id);
    };
    const opts = [...trigger.closest('.rux--list-box')
      .querySelectorAll('.rux--list-box__menu-item[role="option"]')];

    // SPACE IS INERT. Carbon leaves a closed dropdown closed; ours used to open
    // it, because ' ' is a length-1 key and fell through into typeahead.
    trigger.focus();
    key(trigger, ' ');
    record('list-box', 'space does not open a closed dropdown',
      trigger.getAttribute('aria-expanded') === 'false',
      `aria-expanded=${trigger.getAttribute('aria-expanded')} after Space`);

    // THE ARROWS CLAMP. Carbon stops at each end; ours used to wrap.
    key(trigger, 'ArrowDown');            // opens, cursor on the first option
    key(trigger, 'End');                  // jump to the last
    const atEnd = cursor();
    key(trigger, 'ArrowDown');            // must not wrap to the first
    record('list-box', 'ArrowDown clamps at the last option',
      cursor() === atEnd && atEnd === opts.length - 1,
      `was ${atEnd}, now ${cursor()}, of ${opts.length}`);

    key(trigger, 'Home');
    const atTop = cursor();
    key(trigger, 'ArrowUp');              // must not wrap to the last
    record('list-box', 'ArrowUp clamps at the first option',
      cursor() === atTop && atTop === 0,
      `was ${atTop}, now ${cursor()}`);
    key(trigger, 'Escape');
  })();

  // ── the kernel's stack: one open surface at a time ────────────────────────
  // js/overlay.js exists because two surfaces otherwise disagree about who owns
  // a press. Opening a second dismissible surface must close the first.
  (() => {
    const a = fixture('#dropdown').querySelector('button[role="combobox"]');
    const b = fixture('#modal').querySelector('[data-rux-open]');
    if (!a || !b) return skip('overlay', 'stack', 'need a dropdown and a modal on this page');
    const modal = document.getElementById(b.getAttribute('data-rux-open'));
    if (!modal) return record('overlay', 'stack', false,
      `the modal trigger names #${b.getAttribute('data-rux-open')} and no such element exists`);

    click(a);
    click(b);
    record('overlay', 'opening a modal dismisses the dropdown already on the stack',
      a.getAttribute('aria-expanded') === 'false',
      `dropdown still aria-expanded=${a.getAttribute('aria-expanded')}`);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    if (a.getAttribute('aria-expanded') === 'true') click(a);
  })();

  const failed = cases.filter(c => c.ok === false);
  const skipped = cases.filter(c => c.ok === null);
  const ran = cases.length - skipped.length;
  const passed = ran - failed.length;
  console.log(`\n  check-behaviour — ${passed}/${ran} passed, ${skipped.length} skipped`);
  for (const f of failed) console.log(`  FAIL  ${f.module}: ${f.name}\n        ${f.detail}`);
  for (const s of skipped) console.log(`  skip  ${s.module}: ${s.name} — ${s.detail}`);
  console.log(`\n  NOT CHECKED: anything that lands in a microtask — focus destination,`);
  console.log(`  focus restoration, and the order two surfaces close in. A synchronous`);
  console.log(`  tool cannot wait for them. check-a11y owns where focus ends up.\n`);

  // `total` still counts every case DEFINED; `ran` counts those with a
  // fixture. The honest score is passed/ran — a reading of passed/total
  // understates any page that legitimately carries only some components.
  return { passed, ran, total: cases.length, failed, skipped, cases };
})();
