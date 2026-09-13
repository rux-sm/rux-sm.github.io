/* ==========================================================================
   rux-ds — CUSTOM THEMES                              Phase 16, roadmap §4.16
   --------------------------------------------------------------------------
   Owns localStorage['rux.custom-themes']: the list of themes someone saved
   in theme-creator.html, shared with every app on the origin the same way
   js/theme.js's own key already is. Linked in <head>, before js/theme.js —
   js/theme.js's apply() resolves a stored theme id through this module's
   get(), so this must exist first.

   list()/get() NEVER TRUST THE RAW JSON. A record survives only if every
   field matches a fixed allow-list below — id shape, kind, base (surface
   only), token names, hex-shaped values. Anything else is DROPPED, not
   partially applied and not thrown: the same rule builder/session.mjs's
   fromDraft already lives by for stored state nobody else wrote today. The
   list is capped so a runaway caller (or a hand-edited storage value)
   cannot grow it without bound.

   save()/remove() end by firing a same-tab CustomEvent,
   'rux:customthemeschange', because the browser's own `storage` event never
   reaches the tab that made the write — js/theme.js listens for both.
   ========================================================================== */

/* BEHAVIOUR: derived · rux's own — no Carbon page has a concept of a
   user-authored theme. check-behaviour drives save/remove and the
   allow-list's rejection of a malformed record. */
(() => {
  'use strict';
  const KEY = 'rux.custom-themes';
  const CAP = 50;
  const MAX_BYTES = 200_000;

  const ID_RE = /^[a-z][a-z0-9-]*$/;
  // A TOKEN NAME IS CHECKED BY SHAPE, NOT AGAINST A LIST, since 2026-09-10.
  // The list was the point of this file — twenty names, then twenty-nine —
  // and its own comment already named the cost: the same table is written
  // out in tools/build-theme-creator.mjs and again in theme-creator.js, a
  // duplication roadmap §4.14 accepted because this file cannot import from
  // theme-creator/, which is not vendored into consumer projects.
  //
  // §4.17 made every one of the 311 colour tokens css/rux.css declares
  // editable, and three hand-kept copies of 311 names is not a list, it is a
  // liability. THE SHAPE CHECK COVERS WHAT THE LIST ACTUALLY COVERED: the
  // risk was an arbitrary stored key reaching style.setProperty, and a name
  // matching /^[a-z][a-z0-9-]*$/ can only ever compose `--rux-<that>` — it
  // cannot carry a colon, a semicolon, a brace or a closing paren, so it
  // cannot escape the property it is written into or inject a second
  // declaration. WHAT IT NO LONGER COVERS, said plainly: a record naming a
  // token this build does not declare is now stored and applied rather than
  // dropped. Applying it sets a custom property nothing reads, which is
  // inert — but it is a real narrowing of what "validated" means here, and
  // it is the trade §4.17 took to stop maintaining three copies of a list.
  const TOKEN_RE = /^[a-z][a-z0-9-]*$/;
  // A COLOUR, and only a colour. Hex covers 286 of the 311; the other 25 are
  // Carbon's own rgba() values (every ai-aura-*, background-hover,
  // text-disabled and the shadows), which a hex-only check would have made
  // unsaveable at their own defaults. The character class inside the
  // parentheses is digits, dots, commas, spaces and percent — no url(), no
  // var(), no nested function, nothing that can carry a second declaration.
  const VALUE_RE = /^(#[0-9a-f]{3,8}|rgba?\([0-9.,%\s]+\))$/i;
  // `theme` is §4.17's unified kind: a base plus any set of token overrides.
  // `accent` and `surface` are Phase 14/15 records, still valid and still
  // applied exactly as they were — nothing saved before this needs migrating,
  // and a record written by an older page still loads here.
  const KINDS = new Set(['accent', 'surface', 'theme']);
  const BASE_NAMES = new Set(['white', 'g10', 'g90', 'g100']);
  // A cap in place of the list's implicit one. 311 is what the build
  // declares; the slack is for a Carbon version that adds some.
  const MAX_TOKENS = 400;

  function tokensValid(tokens) {
    if (typeof tokens !== 'object' || !tokens) return false;
    const entries = Object.entries(tokens);
    if (entries.length > MAX_TOKENS) return false;
    for (const [k, v] of entries) {
      if (!TOKEN_RE.test(k)) return false;
      if (typeof v !== 'string' || !VALUE_RE.test(v)) return false;
    }
    return true;
  }

  // A record is trusted only whole. No partial application: a theme missing
  // one required field is not "mostly right", it is unreadable.
  function recordValid(r) {
    if (!r || typeof r !== 'object') return false;
    if (typeof r.id !== 'string' || !ID_RE.test(r.id)) return false;
    if (!KINDS.has(r.kind)) return false;
    if ((r.kind === 'surface' || r.kind === 'theme') && !BASE_NAMES.has(r.base)) return false;
    if (!tokensValid(r.tokens)) return false;
    return true;
  }

  function readRaw() {
    let raw;
    try { raw = localStorage.getItem(KEY); } catch { return []; }
    if (!raw) return [];
    let parsed;
    try { parsed = JSON.parse(raw); } catch { return []; }
    if (!parsed || !Array.isArray(parsed.themes)) return [];
    return parsed.themes.filter(recordValid);
  }

  function writeRaw(themes) {
    const capped = themes.slice(0, CAP);
    const json = JSON.stringify({ v: 1, themes: capped });
    if (json.length > MAX_BYTES) return false;
    try { localStorage.setItem(KEY, json); } catch { return false; }
    return true;
  }

  function notify() {
    try { window.dispatchEvent(new CustomEvent('rux:customthemeschange')); } catch { /* older engines: cross-tab storage still covers it */ }
  }

  const list = () => readRaw();
  const get = id => readRaw().find(t => t.id === id) ?? null;

  // Reserved: the four compiled themes, and
  // `geist`/`linear`/`ant-dark`/`spotify` — widened from Phase 14's
  // export-only RESERVED set, since a saved, persistent, cross-app
  // theme shadowing a shipped theme is worth closing now that saving
  // means more than exporting a snippet (roadmap §4.16).
  const RESERVED = new Set(['white', 'g10', 'g90', 'g100', 'geist', 'linear', 'ant-dark', 'spotify']);

  // Same id + same kind: update in place. Same id + different kind, or a
  // reserved name: refused. Nothing here is "ownership" — this is one local
  // profile, not a multi-user store, so the only question is whether the id
  // already means something else.
  function save(record) {
    if (!recordValid({ ...record, id: record?.id })) return { ok: false, reason: 'not a saveable theme record' };
    if (RESERVED.has(record.id)) return { ok: false, reason: `"${record.id}" is a reserved theme name` };
    const current = readRaw();
    const existing = current.find(t => t.id === record.id);
    if (existing && existing.kind !== record.kind) {
      return { ok: false, reason: `"${record.id}" is already saved as a ${existing.kind} theme` };
    }
    const next = existing
      ? current.map(t => (t.id === record.id ? { ...record, savedAt: Date.now() } : t))
      : [...current, { ...record, savedAt: Date.now() }];
    if (!writeRaw(next)) return { ok: false, reason: 'could not save — storage full or unavailable' };
    notify();
    return { ok: true };
  }

  function remove(id) {
    const next = readRaw().filter(t => t.id !== id);
    if (!writeRaw(next)) return false;
    notify();
    return true;
  }

  window.Rux = window.Rux || {};
  // ALL_OVERRIDE_PROPS is GONE, 2026-09-10. It was the fixed list of every
  // property a custom theme could set inline, and js/theme.js cleared
  // exactly it on every apply() so switching away left nothing stale. With
  // the token list retired there is no such enumeration to publish — and
  // there no longer needs to be: theme.js now clears whatever --rux-*
  // properties are actually on the element's own inline style, which is
  // exact rather than a superset, and cannot fall behind this file.
  window.Rux.customThemes = { KEY, list, get, save, remove };
})();
