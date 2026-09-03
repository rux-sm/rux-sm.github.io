/* ==========================================================================
   rux-ds — PROFILE                                   Phase 13, roadmap §4.13
   --------------------------------------------------------------------------
   Requires js/theme.js, linked in <head>. Claims the account panel by its id,
   `#rux-account-panel`: a header panel the Account action opens through
   aria-controls (js/ui-shell.js), holding a display name and a theme. This
   module keeps both in localStorage under the one key js/theme.js reads, so
   the next page on the origin — any app, not only this one — opens in the
   theme just chosen.

   THIS IS THE LOCAL PROFILE, the layer that is not password-protected and
   needs no network: what the gates can drive, and what keeps an app usable
   with the backend down. A cloud layer, when a page has one, talks to it
   through window.Rux.profile and never to the storage directly:
     get()            the profile as stored
     set(patch)       merge, store, re-render, notify
     onChange(fn)     called after every set() with the new profile
     onSignIn(fn)     reveals the sign-in button and binds fn to it
   The sign-in button ships `hidden` and stays hidden until something calls
   onSignIn, because a button with no handler is an affordance that lies.

   ANOTHER TAB OR APP CHANGING THE PROFILE IS APPLIED HERE TOO, through the
   storage event: the theme re-applies and the panel re-renders, so two open
   apps do not disagree about who the user is.

   NOT DONE: an avatar. Carbon compiles no avatar component and the header
   action's glyph is a <use> target, so there is nothing captured to put an
   initial in. The name is stored; where it shows is a page's own choice.
   ========================================================================== */

/* BEHAVIOUR: derived · rux's own behaviour on Carbon's captured controls — the
   header panel (components-ui-shell-header--header-w-actions-and-right-panel,
   opened by js/ui-shell.js), a vertical radio group and a text input from the
   sink — and no Carbon page keeps a profile to read one from. check-behaviour
   drives the theme radios, the name, and the storage round trip. */
(() => {
  'use strict';
  const theme = window.Rux?.theme;
  if (!theme) return; // js/theme.js must load first, in <head>
  const panel = document.getElementById('rux-account-panel');
  if (!panel) return;

  const name = panel.querySelector('#rux-profile-name');
  const radios = [...panel.querySelectorAll('input[name="rux-theme"]')];
  const signIn = panel.querySelector('#rux-profile-sign-in');
  const listeners = new Set();

  const get = () => theme.read() || {};
  const write = p => { try { localStorage.setItem(theme.KEY, JSON.stringify(p)); } catch { /* storage refused: the page still works, nothing persists */ } };

  // The radios follow the theme the page is actually in, not the stored one:
  // a page with no stored theme shows its own default as checked.
  const render = p => {
    if (name && name.value !== (p.name ?? '')) name.value = p.name ?? '';
    const current = document.documentElement.dataset.theme ?? '';
    for (const r of radios) r.checked = r.value === current;
  };
  const set = patch => {
    const next = { ...get(), ...patch, updated: new Date().toISOString() };
    write(next);
    render(next);
    for (const fn of listeners) fn(next);
    return next;
  };

  name?.addEventListener('input', () => set({ name: name.value }));
  for (const r of radios) r.addEventListener('change', () => {
    if (!r.checked) return;
    document.documentElement.dataset.theme = r.value;
    set({ theme: r.value });
  });
  window.addEventListener('storage', e => {
    if (e.key !== theme.KEY) return;
    theme.apply();
    render(get());
  });

  const onSignIn = fn => {
    if (!signIn) return;
    signIn.hidden = false;
    signIn.addEventListener('click', fn);
  };

  render(get());
  window.Rux.profile = { get, set, onChange: fn => listeners.add(fn), onSignIn };
})();
