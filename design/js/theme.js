/* ==========================================================================
   Design — THEME
   --------------------------------------------------------------------------
   Linked in <head>, after the stylesheets and after js/custom-themes.js, and
   does one thing synchronously: reads the profile js/profile.js keeps in
   localStorage and puts its theme on <html> before first paint. Every other
   module runs at the end of the body; this one cannot, because a theme
   applied after paint is a flash of the wrong one.

   THE KEY IS SHARED BY EVERY APP ON THE ORIGIN. rux-sm.github.io serves the
   hub at / and each module under /name/, so they share one localStorage: a
   theme chosen in Notes is the theme the hub opens in. That is the
   consistency §4.13 asks for, and it needs no backend.

   TWO ELEMENTS WEAR THE THEME: <html> for the page, and the shell's own
   zone, the page header, which carries `data-theme` of its own in the
   markup. Carbon's UI-shell-header/style.mdx keeps the shell on one of the
   four IBM themes whatever the page is, and under Carbon's four this file
   keeps that exactly: the header stays g100. A theme ABOVE those four is
   rux's own and is the whole page's, so the header takes it too — with its
   background on the theme's `layer-01`, the raised surface a tile uses, so
   the bar still stands off the page instead of running into it. A header
   with no `data-theme` of its own — the kitchen sink's specimens, inside a
   themed sandbox — is left to its sandbox.

   apply() RESOLVES THE STORED NAME THROUGH THREE CASES, always in the same
   order and always starting from a clean slate — every --rux-* property
   currently set inline is removed from each element first, so switching AWAY
   from a custom theme never leaves a stale override behind:
     1. It resolves via customThemes.get(id) — wear() applies the theme's own
        base (white for an accent record, the record's own base for a surface
        or theme record), sets data-rux-surface (both layered kinds) and
        data-rux-custom-theme to the id, and sets every validated token
        inline. An inline style beats any stylesheet regardless of selector,
        which is why this needs no compiled CSS anywhere.
     2. It is one of the seven known literal names — the attribute alone.
     3. It matches the name shape but resolves to nothing — a theme deleted
        elsewhere, or garbage. The stored preference is corrected to white
        (so the account panel stops pointing at a ghost id) and white is
        applied.

   THE HEADER IS PARSED AFTER THIS FILE RUNS, so the first apply() cannot
   reach it. watchShell() starts a MutationObserver instead of waiting for
   DOMContentLoaded: its callback is a microtask, which the browser drains
   before it renders, so the shell is dressed before its first paint rather
   than repainted after one.

   Listens for BOTH the cross-tab `storage` event and a same-tab
   `rux:customthemeschange` event (js/custom-themes.js dispatches the
   latter, because `storage` never fires in the tab that made the write) —
   a delete anywhere is corrected everywhere, including the tab that did the
   deleting, and including theme-creator.html itself, which loads this file
   but has no account panel of its own.
   ========================================================================== */

/* BEHAVIOUR: derived · rux's own, not Carbon's: no Carbon page keeps a theme
   preference (the docs site's toggle is a gatsby class). Built on the
   data-theme mechanism css/rux.css compiles, and driven by check-behaviour
   through apply() against a written key. */
(() => {
  'use strict';
  const KEY = 'rux.profile';
  const NAME = /^[a-z][a-z0-9-]*$/;
  // Carbon's four compiled themes, then the three css/rux-theme.css adds.
  const CARBON = new Set(['white', 'g10', 'g90', 'g100']);
  const KNOWN = new Set([...CARBON, 'geist-dark', 'ant-dark', 'spotify-dark']);
  // The shell's zone, and the side nav sits inside it, so one element themes
  // both. The attribute is part of the selector on purpose — see the head.
  const SHELL = '.rux--header[data-theme]';

  const read = () => {
    try { const p = JSON.parse(localStorage.getItem(KEY) || 'null'); return p && typeof p === 'object' ? p : null; }
    catch { return null; }
  };

  const zones = () => [document.documentElement, ...document.querySelectorAll(SHELL)];

  // CLEARS WHAT IS ACTUALLY SET, not a list of what could be. Until
  // 2026-09-10 this walked js/custom-themes.js's ALL_OVERRIDE_PROPS — the
  // forty-nine properties either kind of custom theme could name — which
  // worked only for as long as that enumeration stayed complete. §4.17 made
  // every token css/rux.css declares editable, so the enumeration is gone
  // and this reads the element's own inline style instead: exact, no list to
  // fall behind, and it cannot miss a property a newer page wrote.
  //
  // The style declaration is live, so removing while iterating it skips
  // entries — the names are collected first. Only --rux-* is touched;
  // anything else inline is not this module's to clear.
  const clearOverrides = el => {
    const mine = [];
    for (let i = 0; i < el.style.length; i++) {
      const prop = el.style[i];
      if (prop.startsWith('--rux-')) mine.push(prop);
    }
    for (const prop of mine) el.style.removeProperty(prop);
    el.removeAttribute('data-rux-surface');
    el.removeAttribute('data-rux-custom-theme');
  };

  // Puts one resolved theme on one element. A known name is the attribute
  // alone; a custom record is its base plus its own tokens inline.
  const wear = (el, name, custom) => {
    clearOverrides(el);
    if (!custom) { el.dataset.theme = name; return; }
    // `theme` is §4.17's unified kind — a base plus any set of overrides —
    // and carries data-rux-surface for the same reason a `surface` record
    // does: the attribute is what an EXPORTED CSS block's compound selector
    // matches on, and the shell wears the pair too, so an exported theme
    // dropped into a page themes its header as well. The inline properties
    // are what actually paints here, and they beat any stylesheet regardless
    // of selector.
    const layered = custom.kind === 'surface' || custom.kind === 'theme';
    el.dataset.theme = layered ? custom.base : 'white';
    if (layered) el.setAttribute('data-rux-surface', custom.id);
    el.setAttribute('data-rux-custom-theme', custom.id);
    for (const [prop, value] of Object.entries(custom.tokens)) el.style.setProperty(`--rux-${prop}`, value);
  };

  // The shell's zone. Carbon's four keep the g100 bar its markup names, and
  // above them the bar takes the theme's raised surface — `layer-01`, what a
  // tile is drawn on — rather than the page's own background, which would
  // leave the bar and the page one 1px border apart. Set inline because a
  // saved theme writes its own `background` inline too, and this has to beat
  // it; clearOverrides() takes it off again on the next apply().
  const dressShell = (el, name, custom) => {
    wear(el, name, custom);
    if (custom || !CARBON.has(name)) el.style.setProperty('--rux-background', 'var(--rux-layer-01)');
  };

  const apply = () => {
    const html = document.documentElement;
    const shells = document.querySelectorAll(SHELL);
    const t = read()?.theme;
    if (typeof t !== 'string' || !NAME.test(t)) {
      // No preference: clear anything inline and leave both elements on the
      // themes their markup names.
      for (const el of zones()) clearOverrides(el);
      return null;
    }

    const custom = window.Rux?.customThemes?.get(t);
    if (custom) {
      wear(html, null, custom);
      for (const el of shells) dressShell(el, null, custom);
      return t;
    }

    if (KNOWN.has(t)) {
      wear(html, t);
      for (const el of shells) dressShell(el, CARBON.has(t) ? 'g100' : t);
      return t;
    }

    // Matched the shape, resolves to nothing: a theme deleted elsewhere, or
    // hand-edited garbage. Correct storage rather than leave the account
    // panel with every radio unchecked.
    const p = read();
    if (p) { try { localStorage.setItem(KEY, JSON.stringify({ ...p, theme: 'white' })); } catch { /* best effort */ } }
    wear(html, 'white');
    for (const el of shells) dressShell(el, 'g100');
    return 'white';
  };

  // The header arrives while the parser is still running. Watching for it
  // beats DOMContentLoaded, which is after the browser has had chances to
  // paint; the observer stops at the first header it sees, and at
  // DOMContentLoaded whether one came or not, so a page without a shell
  // leaves nothing running.
  const watchShell = () => {
    if (document.querySelector(SHELL)) return;
    const obs = new MutationObserver(() => {
      if (!document.querySelector(SHELL)) return;
      obs.disconnect();
      apply();
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener('DOMContentLoaded', () => obs.disconnect(), { once: true });
  };

  apply();
  watchShell();
  window.addEventListener('storage', e => { if (e.key === KEY || e.key === window.Rux?.customThemes?.KEY) apply(); });
  window.addEventListener('rux:customthemeschange', apply);
  window.Rux = window.Rux || {};
  window.Rux.theme = { KEY, read, apply };
})();
