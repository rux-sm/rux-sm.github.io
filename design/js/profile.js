/* ==========================================================================
   Design — PROFILE
   --------------------------------------------------------------------------
   Requires js/theme.js, linked in <head>. Claims the account panel by its id,
   `#rux-account-panel`: a header panel the Account action opens through
   aria-controls (js/ui-shell.js), holding the theme and, where a page has a
   field for one, a display name. This module keeps both in localStorage
   under the one key js/theme.js reads, so the next page on the origin — any
   app, not only this one — opens in the theme just chosen.

   THE THEME IS PICKED FROM `#rux-profile-theme`: a select in the header's
   panel, and a group of radios named `rux-theme` in a page that still
   carries one. Both are kept in step the same way.

   THIS IS THE LOCAL PROFILE, the layer that is not password-protected and
   needs no network: what the gates can drive, and what keeps an app usable
   with the backend down. A cloud layer, when a page has one, talks to it
   through window.Rux.profile and never to the storage directly:
     get()            the profile as stored
     set(patch)       merge, store, apply the theme, re-render, notify
     onChange(fn)     called after every set() with the new profile
     onSignIn(fn)     reveals the sign-in button and binds fn to it
     rows(items)      an app's own rows in the header's panel, over Profile
     who({name,face}) who is here, for a player with no account
   The sign-in button ships `hidden` and stays hidden until something calls
   onSignIn, because a button with no handler is an affordance that lies.

   ANOTHER TAB OR APP CHANGING THE PROFILE IS APPLIED HERE TOO, through the
   storage event: the theme re-applies and the panel re-renders, so two open
   apps do not disagree about who the user is.

   PHASE 16: THE THEME RADIOS ARE NO LONGER A FIXED FIVE. syncCustomRadios()
   clones the existing `geist-dark` radio's own wrapper — real, already-compiled
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

   NOT DONE HERE: the avatar. This module keeps no photo and knows no
   account, so the site's account.js draws `user-avatar`
   (sink/user-avatar.html) in the header's Account action and on /account/,
   from the logged-in profile. A page that shows the person elsewhere calls
   window.Rux.account.showAvatar(element, size) rather than drawing its own,
   and a staff member's photo changes through window.Rux.account.setPhoto(file).
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
  const picker = panel.querySelector('#rux-profile-theme');
  const select = picker?.tagName === 'SELECT' ? picker : null;
  const fieldset = select ? null : picker;
  const signIn = panel.querySelector('#rux-profile-sign-in');
  const listeners = new Set();
  const getRadios = () => [...panel.querySelectorAll('input[name="rux-theme"]')];

  const get = () => theme.read() || {};
  const write = p => { try { localStorage.setItem(theme.KEY, JSON.stringify(p)); } catch { /* storage refused: the page still works, nothing persists */ } };

  // One wrapper per saved custom theme, cloned from the `geist-dark` radio's
  // own — real markup this file did not invent. Tagged data-rux-custom so
  // a later sync can tell a clone from the five that ship in every
  // template, and drop it again once its theme no longer exists.
  const syncCustomRadios = () => {
    if (!fieldset) return;
    const templateWrapper = fieldset.querySelector('input[name="rux-theme"][value="geist-dark"]')?.closest('.rux--radio-button-wrapper');
    if (!templateWrapper) return;
    const saved = window.Rux?.customThemes?.list() ?? [];
    const savedIds = new Set(saved.map(t => t.id));

    for (const r of getRadios()) {
      if (r.dataset.ruxCustom && !savedIds.has(r.value)) r.closest('.rux--radio-button-wrapper')?.remove();
    }
    const present = new Set(getRadios().map(r => r.value));
    for (const t of saved) {
      if (present.has(t.id)) continue;
      const clone = templateWrapper.cloneNode(true);
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

  // The same for a select: one option per saved custom theme, made from the
  // select's own first option, and dropped once its theme no longer exists.
  const syncCustomOptions = () => {
    const saved = window.Rux?.customThemes?.list() ?? [];
    const savedIds = new Set(saved.map(t => t.id));
    for (const o of [...select.options]) if (o.dataset.ruxCustom && !savedIds.has(o.value)) o.remove();
    const present = new Set([...select.options].map(o => o.value));
    for (const t of saved) {
      if (present.has(t.id)) continue;
      const option = select.options[0].cloneNode(false);
      option.value = t.id;
      option.textContent = t.id;
      option.selected = false;
      option.dataset.ruxCustom = 'true';
      select.appendChild(option);
    }
  };

  // The radios follow the STORED preference, falling back to the theme the
  // page is actually in only when nothing is stored yet — a page with no
  // stored theme shows its own default as checked, same as always; a stored
  // surface theme resolves data-theme to its base, not its own id, so the
  // dataset can't be the source of truth once Phase 16's custom themes exist.
  const render = p => {
    if (name && name.value !== (p.name ?? '')) name.value = p.name ?? '';
    const current = p.theme ?? document.documentElement.dataset.theme ?? '';
    if (select) {
      syncCustomOptions();
      select.value = current;
      return;
    }
    syncCustomRadios();
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
  select?.addEventListener('change', () => set({ theme: select.value }));
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
    // In the header's panel it is the button's row that ships hidden.
    (signIn.closest('[hidden]') ?? signIn).hidden = false;
    // Where it is a link, the handler is the act and the link is not followed.
    signIn.addEventListener('click', e => { e.preventDefault(); fn(e); });
  };

  /* AN APP'S OWN ROWS, in the header's panel over Profile. `rows` takes them
     in order, each `{ text, href }` for a page or `{ text, open }` for the id
     of a modal js/modal.js opens, and writes them as the first items of the
     account's list. Called again it replaces what it wrote. A page with no
     such list is left as it is. */
  const rows = items => {
    const list = panel.querySelector('ul.rux--switcher[aria-label="Account"]');
    if (!list) return;
    for (const old of list.querySelectorAll('li[data-rux-row]')) old.remove();
    const shut = !panel.classList.contains('rux--header-panel--expanded');
    list.prepend(...items.map(({ text, href, open }) => {
      const li = document.createElement('li');
      li.className = 'rux--switcher__item';
      li.dataset.ruxRow = '';
      const a = document.createElement('a');
      a.className = 'rux--switcher__item-link';
      a.href = href ?? `#${open}`;
      if (open) a.dataset.ruxOpen = open;
      a.textContent = text;
      // A collapsed panel's links are out of the tab order, as js/ui-shell.js leaves them.
      if (shut) a.tabIndex = -1;
      li.append(a);
      return li;
    }));
  };

  /* WHO IS HERE, for an app whose player has no account: their name over the
     rows beside a picture the app draws, and the same picture on the Account
     action in place of its glyph. `face` returns a new element each time it
     is called, since the picture stands in two places. /account.js writes
     the same for someone logged in. */
  const who = ({ name: called, face }) => {
    if (!panel.classList.contains('rux--header-panel')) return;
    panel.querySelector(':scope > [data-rux-who]')?.remove();
    const head = document.createElement('div');
    head.className = 'rux--stack-vertical';
    head.dataset.ruxWho = '';
    const line = document.createElement('div');
    line.className = 'rux--stack-horizontal rux--stack-scale-4';
    const text = document.createElement('div');
    text.className = 'rux--type-heading-compact-01';
    text.textContent = called;
    line.append(face(), text);
    head.append(line);
    panel.prepend(head);
    const action = document.querySelector('.rux--header__action[aria-controls="rux-account-panel"]');
    if (!action) return;
    action.replaceChildren(face());
    action.setAttribute('aria-label', `Account, ${called}`);
  };

  render(get());
  window.Rux.profile = { get, set, onChange: fn => listeners.add(fn), onSignIn, rows, who };
})();
