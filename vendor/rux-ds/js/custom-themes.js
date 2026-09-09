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
  const HEX_RE = /^#[0-9a-f]{3,8}$/i;
  const KINDS = new Set(['accent', 'surface']);
  const BASE_NAMES = new Set(['white', 'g10', 'g90', 'g100']);

  // The same twenty/four names tools/build-theme-creator.mjs's TOKENS and
  // SURFACE_TOKENS tables carry, and theme-creator.js's SHADE_MAP/BASES
  // mirror a third time — a duplication already named and accepted in
  // roadmap §4.14's own comment, not solved here either: this file cannot
  // import from theme-creator/, which is not vendored into consumer
  // projects, so it carries its own copy like the other two do.
  const ACCENT_TOKENS = new Set([
    'interactive', 'icon-interactive', 'border-interactive', 'background-brand',
    'focus', 'highlight', 'link-primary', 'link-primary-hover', 'link-secondary',
    'link-inverse', 'link-inverse-hover', 'button-primary', 'button-primary-hover',
    'button-primary-active', 'button-tertiary', 'button-tertiary-hover',
    'button-tertiary-active', 'chat-button', 'chat-button-text-hover', 'chat-avatar-user',
  ]);
  // Twenty-nine since 2026-09-08, four before it. WIDENING THIS IS SAFE AND
  // NARROWING IT IS NOT: list() drops any record with a token it does not
  // recognise, whole and without a word, so a theme saved by a newer theme
  // creator would simply vanish from an older app's account panel rather
  // than partially apply. A record saved when this was four still validates
  // against the twenty-nine, which is why no migration is needed here.
  //
  // The four ladders and the one flat token, matching
  // tools/build-theme-creator.mjs's SURFACE_GROUPS: layers, table headers
  // (layer-accent), fields, hairlines (border-subtle, offset by one against
  // the layers), outlines (border-strong), the secondary button, and the
  // hover/selected/active states Carbon does not derive from the layer.
  const SURFACE_TOKENS = new Set([
    'background', 'layer-01', 'layer-02', 'layer-03',
    'layer-accent-01', 'layer-accent-02', 'layer-accent-03',
    'field-01', 'field-02', 'field-03',
    'border-subtle-00', 'border-subtle-01', 'border-subtle-02', 'border-subtle-03',
    'border-strong-01', 'border-strong-02', 'border-strong-03',
    'button-secondary', 'button-secondary-hover', 'button-secondary-active',
    'layer-hover-01', 'layer-hover-02', 'layer-hover-03',
    'layer-selected-01', 'layer-selected-02', 'layer-selected-03',
    'layer-active-01', 'layer-active-02', 'layer-active-03',
  ]);

  // Every property either kind could ever have set inline — js/theme.js
  // clears exactly this set on every apply(), regardless of what the
  // resolved theme actually names, so switching away never leaves a stale
  // override behind.
  const ALL_OVERRIDE_PROPS = [...ACCENT_TOKENS, ...SURFACE_TOKENS];

  function tokensValid(kind, tokens) {
    if (typeof tokens !== 'object' || !tokens) return false;
    const allowed = kind === 'accent' ? ACCENT_TOKENS : SURFACE_TOKENS;
    for (const [k, v] of Object.entries(tokens)) {
      if (!allowed.has(k)) return false;
      if (typeof v !== 'string' || !HEX_RE.test(v)) return false;
    }
    return true;
  }

  // A record is trusted only whole. No partial application: a theme missing
  // one required field is not "mostly right", it is unreadable.
  function recordValid(r) {
    if (!r || typeof r !== 'object') return false;
    if (typeof r.id !== 'string' || !ID_RE.test(r.id)) return false;
    if (!KINDS.has(r.kind)) return false;
    if (r.kind === 'surface' && !BASE_NAMES.has(r.base)) return false;
    if (!tokensValid(r.kind, r.tokens)) return false;
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

  // Reserved: the four compiled themes, and `rux` — widened from Phase 14's
  // export-only RESERVED set, since a saved, persistent, cross-app theme
  // shadowing the shipped example is worth closing now that saving means
  // more than exporting a snippet (roadmap §4.16).
  const RESERVED = new Set(['white', 'g10', 'g90', 'g100', 'rux']);

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
  window.Rux.customThemes = { KEY, ALL_OVERRIDE_PROPS, list, get, save, remove };
})();
