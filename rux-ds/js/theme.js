/* ==========================================================================
   rux-ds — THEME                          Phase 13, roadmap §4.13; §4.16
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

   PHASE 16 ADDS A SECOND SOURCE apply() RESOLVES AGAINST: a saved custom
   theme (js/custom-themes.js, its own localStorage key). The stored
   preference is still one name; resolving it now goes through three cases,
   always in the same order and always starting from a clean slate — every
   --rux-* property currently set inline on <html> is removed first, so
   switching AWAY from a custom theme never leaves a stale override behind:
     1. It resolves via customThemes.get(id) — apply the theme's own base
        (white for an accent record, the record's own base for a surface or
        theme record), set data-rux-surface (both layered kinds) and
        data-rux-custom-theme to the id, and set every validated token
        inline. An inline style
        beats any stylesheet regardless of selector, which is why this needs
        no compiled CSS anywhere.
     2. It is one of the five known literal names — applied exactly as
        before Phase 16.
     3. It matches the name shape but resolves to nothing — a theme deleted
        elsewhere, or garbage. The stored preference is corrected to white
        (so the account panel stops pointing at a ghost id) and white is
        applied.
   Listens for BOTH the cross-tab `storage` event and a same-tab
   `rux:customthemeschange` event (js/custom-themes.js dispatches the
   latter, because `storage` never fires in the tab that made the write) —
   a delete anywhere is corrected everywhere, including the tab that did the
   deleting, and including theme-creator.html itself, which loads this file
   but has no account panel of its own.

   THE HEADER KEEPS ITS OWN g100 whatever this sets. data-theme on <html>
   moves the content; the shell's zone is its own, by Carbon's guidance.
   ========================================================================== */

/* BEHAVIOUR: derived · rux's own, not Carbon's: no Carbon page keeps a theme
   preference (the docs site's toggle is a gatsby class). Built on the
   data-theme mechanism css/rux.css compiles, and driven by check-behaviour
   through apply() against a written key. */
(() => {
  'use strict';
  const KEY = 'rux.profile';
  const NAME = /^[a-z][a-z0-9-]*$/;
  const KNOWN = new Set(['white', 'g10', 'g90', 'g100', 'geist', 'linear', 'ant-dark', 'spotify']);

  const read = () => {
    try { const p = JSON.parse(localStorage.getItem(KEY) || 'null'); return p && typeof p === 'object' ? p : null; }
    catch { return null; }
  };

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
  // anything else inline on <html> is not this module's to clear.
  const clearOverrides = () => {
    const html = document.documentElement;
    const mine = [];
    for (let i = 0; i < html.style.length; i++) {
      const prop = html.style[i];
      if (prop.startsWith('--rux-')) mine.push(prop);
    }
    for (const prop of mine) html.style.removeProperty(prop);
    html.removeAttribute('data-rux-surface');
    html.removeAttribute('data-rux-custom-theme');
  };

  const apply = () => {
    const html = document.documentElement;
    const t = read()?.theme;
    clearOverrides();
    if (typeof t !== 'string' || !NAME.test(t)) return null;

    const custom = window.Rux?.customThemes?.get(t);
    if (custom) {
      // `theme` is §4.17's unified kind — a base plus any set of overrides —
      // and carries data-rux-surface for the same reason a `surface` record
      // does: the attribute is what an EXPORTED CSS block's compound
      // selector matches on. The inline properties below are what actually
      // paints here, and they beat any stylesheet regardless of selector.
      const layered = custom.kind === 'surface' || custom.kind === 'theme';
      html.dataset.theme = layered ? custom.base : 'white';
      if (layered) html.setAttribute('data-rux-surface', t);
      html.setAttribute('data-rux-custom-theme', t);
      for (const [prop, value] of Object.entries(custom.tokens)) html.style.setProperty(`--rux-${prop}`, value);
      return t;
    }

    if (KNOWN.has(t)) { html.dataset.theme = t; return t; }

    // Matched the shape, resolves to nothing: a theme deleted elsewhere, or
    // hand-edited garbage. Correct storage rather than leave the account
    // panel with every radio unchecked.
    const p = read();
    if (p) { try { localStorage.setItem(KEY, JSON.stringify({ ...p, theme: 'white' })); } catch { /* best effort */ } }
    html.dataset.theme = 'white';
    return 'white';
  };

  apply();
  window.addEventListener('storage', e => { if (e.key === KEY || e.key === window.Rux?.customThemes?.KEY) apply(); });
  window.addEventListener('rux:customthemeschange', apply);
  window.Rux = window.Rux || {};
  window.Rux.theme = { KEY, read, apply };
})();
