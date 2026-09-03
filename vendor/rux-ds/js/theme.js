/* ==========================================================================
   rux-ds — THEME                                     Phase 13, roadmap §4.13
   --------------------------------------------------------------------------
   Linked in <head>, after the stylesheets, and does one thing synchronously:
   reads the profile js/profile.js keeps in localStorage and puts its theme on
   <html> before first paint. Every other module runs at the end of the body;
   this one cannot, because a theme applied after paint is a flash of the
   wrong one.

   THE KEY IS SHARED BY EVERY APP ON THE ORIGIN. rux-sm.github.io serves the
   hub at / and each module under /name/, so they share one localStorage: a
   theme chosen in Notes is the theme the hub opens in. That is the
   consistency §4.13 asks for, and it needs no backend.

   WHAT IT ACCEPTS: a name that looks like a theme — lowercase, digits,
   hyphens — and nothing else. It does not know which themes a page's
   stylesheets define; the radios in the account panel are the offer, and
   only they write this value. A stored name no stylesheet defines falls
   through to Carbon's defaults, which is white.

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

  const read = () => {
    try { const p = JSON.parse(localStorage.getItem(KEY) || 'null'); return p && typeof p === 'object' ? p : null; }
    catch { return null; }
  };
  const apply = () => {
    const t = read()?.theme;
    if (typeof t !== 'string' || !NAME.test(t)) return null;
    document.documentElement.dataset.theme = t;
    return t;
  };

  apply();
  window.Rux = window.Rux || {};
  window.Rux.theme = { KEY, read, apply };
})();
