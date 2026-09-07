/* ==========================================================================
   rux-ds — PROFILE                          Phase 13, roadmap §4.13; §4.16
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
     set(patch)       merge, store, apply the theme, re-render, notify
     onChange(fn)     called after every set() with the new profile
     onSignIn(fn)     reveals the sign-in button and binds fn to it
   The sign-in button ships `hidden` and stays hidden until something calls
   onSignIn, because a button with no handler is an affordance that lies.

   ANOTHER TAB OR APP CHANGING THE PROFILE IS APPLIED HERE TOO, through the
   storage event: the theme re-applies and the panel re-renders, so two open
   apps do not disagree about who the user is.

   PHASE 16: THE THEME RADIOS ARE NO LONGER A FIXED FIVE. syncCustomRadios()
   clones the existing `rux` radio's own wrapper — real, already-compiled
   markup, nothing invented — once per theme js/custom-themes.js lists, so a
   saved theme appears here with no template edited anywhere. Three things
   that fixed-five assumption used to get away with had to change with it:
   the radio collection is re-queried live rather than captured once (a
   clone added after load needs no re-binding step, because there is no
   per-radio listener left to bind — see the delegated listener below);
   `set()` now calls theme.apply() before re-rendering, since choosing a
   radio must resolve and actually apply a theme, not just record its id;
   and render() checks the STORED preference against each radio's value,
   not `document.documentElement.dataset.theme` — a saved surface theme
   resolves that attribute to its base (e.g. g100), not its own id, so the
   dataset never matches the radio that chose it.

   NOT DONE HERE: an avatar in the panel itself — the header action's glyph
   stays a <use> target, so there is nothing captured to put an initial in
   there. `user-avatar` (sink/user-avatar.html) WAS admitted 2026-08-31,
   stale against this file's own 2026-09-02: it compiles, initials and a
   colour hashed from an id, and a page is free to render one from the name
   this module stores — the hub's /account/ page does exactly that
   (rux-sm.github.io, 2026-09-04). Corrected here rather than left wrong.
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
  const fieldset = panel.querySelector('#rux-profile-theme');
  const signIn = panel.querySelector('#rux-profile-sign-in');
  const listeners = new Set();
  const getRadios = () => [...panel.querySelectorAll('input[name="rux-theme"]')];

  const get = () => theme.read() || {};
  const write = p => { try { localStorage.setItem(theme.KEY, JSON.stringify(p)); } catch { /* storage refused: the page still works, nothing persists */ } };

  // One wrapper per saved custom theme, cloned from the `rux` radio's own —
  // real markup this file did not invent. Tagged data-rux-custom so a later
  // sync can tell a clone from the five that ship in every template, and
  // drop it again once its theme no longer exists.
  const syncCustomRadios = () => {
    if (!fieldset) return;
    const ruxWrapper = fieldset.querySelector('input[name="rux-theme"][value="rux"]')?.closest('.rux--radio-button-wrapper');
    if (!ruxWrapper) return;
    const saved = window.Rux?.customThemes?.list() ?? [];
    const savedIds = new Set(saved.map(t => t.id));

    for (const r of getRadios()) {
      if (r.dataset.ruxCustom && !savedIds.has(r.value)) r.closest('.rux--radio-button-wrapper')?.remove();
    }
    const present = new Set(getRadios().map(r => r.value));
    for (const t of saved) {
      if (present.has(t.id)) continue;
      const clone = ruxWrapper.cloneNode(true);
      const input = clone.querySelector('input');
      const label = clone.querySelector('label');
      const labelText = clone.querySelector('.rux--radio-button__label-text');
      input.id = `rux-theme-${t.id}`;
      input.value = t.id;
      input.checked = false;
      input.dataset.ruxCustom = 'true';
      label?.setAttribute('for', input.id);
      if (labelText) labelText.textContent = t.id;
      fieldset.appendChild(clone);
    }
  };

  // The radios follow the STORED preference, falling back to the theme the
  // page is actually in only when nothing is stored yet — a page with no
  // stored theme shows its own default as checked, same as always; a stored
  // surface theme resolves data-theme to its base, not its own id, so the
  // dataset can't be the source of truth once Phase 16's custom themes exist.
  const render = p => {
    if (name && name.value !== (p.name ?? '')) name.value = p.name ?? '';
    syncCustomRadios();
    const current = p.theme ?? document.documentElement.dataset.theme ?? '';
    for (const r of getRadios()) r.checked = r.value === current;
  };
  const set = patch => {
    const next = { ...get(), ...patch, updated: new Date().toISOString() };
    write(next);
    theme.apply();
    render(next);
    for (const fn of listeners) fn(next);
    return next;
  };

  name?.addEventListener('input', () => set({ name: name.value }));
  fieldset?.addEventListener('change', e => {
    const r = e.target;
    if (!(r instanceof HTMLInputElement) || r.name !== 'rux-theme' || !r.checked) return;
    set({ theme: r.value });
  });
  window.addEventListener('storage', e => {
    if (e.key !== theme.KEY && e.key !== window.Rux?.customThemes?.KEY) return;
    theme.apply();
    render(get());
  });
  window.addEventListener('rux:customthemeschange', () => render(get()));

  const onSignIn = fn => {
    if (!signIn) return;
    signIn.hidden = false;
    signIn.addEventListener('click', fn);
  };

  render(get());
  window.Rux.profile = { get, set, onChange: fn => listeners.add(fn), onSignIn };
})();
