// The builder's session: what can be undone, and what survives a reload.
// Pure ES module, no imports, so the browser (builder/builder.js) and node
// (a scratch check) run the same code — the contract rewrites.mjs and
// page.mjs already keep. Roadmap §4.12, creator 3, stage 6.
//
// TIER. Session state, not a gate: nothing here decides whether a check
// passes. Not in CONTROL_FILES, the same call page.mjs records, and rux's
// to overrule.
//
// ── HISTORY ────────────────────────────────────────────────────────────────
//
// ONE HISTORY FOR THE SESSION, not one per template. The editable state is
// { pages, edits, answers }, and `answers` — theme, grid, prefix, name,
// title, file — is global: a per-template history would have to duplicate it or
// drop it, and undoing a theme change would depend on which template
// happened to be selected when you pressed the button.
//
// AN ENTRY HOLDS THE STATE BEFORE ITS ACTION, and names the template the
// action HAPPENED ON:
//
//   { state, label, template }
//
// Navigation records nothing — switching template, slot, block, catalogue or
// preview width is not a change — so the selected template is NOT in the
// snapshot. It is on the entry, and both directions use it:
//
//   Edit a heading on app-shell. Switch to table-page. Undo shows app-shell
//   with the heading back. Redo shows app-shell with the edit re-applied.
//   The switch to table-page is never undone, because it was never recorded.
//
// Reading the snapshot's own template instead would send redo wherever the
// reader happens to be standing, which is the confusing result.
//
// ── TYPING RUNS ────────────────────────────────────────────────────────────
//
// Five characters typed into one field is one entry, not five. A run is
// keyed by template, entry key and field index (or by an input's id for the
// four page settings), and the FIRST keystroke of a run pushes the state
// before it. runKey/sameRun below decide only that; every boundary that ENDS
// a run — blur, navigation, any other action, undo, redo, a native field
// undo — is the caller's, because they are events, not values.
//
// ── DRAFTS ─────────────────────────────────────────────────────────────────
//
// A draft is opened ONLY when its compatibility with the current manifest is
// established, and otherwise left alone: not partially applied, not deleted.
// Two failures made that the rule, both reproduced on this repository before
// this file was written.
//
//   A FOLLOWER WITHOUT ITS LEADER THROWS. Dropping table-page's table from a
//   page while keeping its pagination makes page.mjs's unitOf throw. A draft
//   is nobody's attack surface, but it is a value from last week that this
//   week's code must survive.
//
//   A FIELD INDEX IS NOT STABLE ACROSS A MARKUP CHANGE. Edits are indices
//   into textFieldsOf(block.html) of the CURRENT manifest; insert a heading
//   into a block and yesterday's edit lands on the wrong text, silently.
//   So a draft records a hash of every block it carries an edit for, and a
//   block whose markup has moved since invalidates the draft. hashOf is
//   FNV-1a, not cryptographic and not required to be: it detects drift, not
//   tampering.
//
// fromDraft returns { ok, state, reason } and NEVER throws: a corrupt value
// in storage is an ordinary Tuesday, and a builder that dies on load because
// of one is worse than one that says what it found.

const CAP = 100;
const RUN_MS = 1000;

const clone = v => JSON.parse(JSON.stringify(v));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const isIndex = v => Number.isInteger(v) && v >= 0;
const isCount = v => Number.isInteger(v) && v >= 1;

// FNV-1a, 32-bit, as eight hex digits. Deterministic across node and the
// browser, which is the only property asked of it.
export function hashOf(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export const emptyHistory = () => ({ past: [], future: [] });

// The history with one entry pushed, oldest dropped at the cap, redo gone.
// `state` is copied on the way in, so a later mutation of the live state
// cannot reach back into what was recorded.
export function pushed(history, state, label, template) {
  const past = [...history.past, { state: clone(state), label, template }];
  return { past: past.slice(-CAP), future: [] };
}

// Undo: the state to restore, the entry that described the action, and the
// history to keep. `present` joins the future so redo can walk forward.
// Returns null when there is nothing to undo.
export function undone(history, present) {
  if (!history.past.length) return null;
  const entry = history.past[history.past.length - 1];
  return {
    state: clone(entry.state),
    entry,
    history: {
      past: history.past.slice(0, -1),
      future: [...history.future, { state: clone(present), label: entry.label, template: entry.template }],
    },
  };
}

// Redo, the mirror. The entry keeps the label and template of the action
// being re-applied, so both directions name the same place.
export function redone(history, present) {
  if (!history.future.length) return null;
  const entry = history.future[history.future.length - 1];
  return {
    state: clone(entry.state),
    entry,
    history: {
      past: [...history.past, { state: clone(present), label: entry.label, template: entry.template }],
      future: history.future.slice(0, -1),
    },
  };
}

// What identifies one typing run. `where` is an entry key and field index,
// or an input's id — anything stable for as long as the reader keeps typing
// into the same thing.
// THE SEPARATOR IS AN ESCAPE, NOT A RAW BYTE. It was written as a literal
// NUL here, which made the whole file read as binary: git diffed it as Bin
// and grep silently matched nothing in it. `\0` is the same character and
// the same key; only the source stops being text.
export const runKey = (template, where) => `${template}\0${where}`;

// Does this keystroke belong to the run already open? Only when it is the
// same field and the pause since the last one was short. A run that has been
// ended by the caller passes `run` as null and starts a new one.
export const sameRun = (run, key, now) => !!run && run.key === key && now - run.at < RUN_MS;

// ── DRAFTS ─────────────────────────────────────────────────────────────────

export const DRAFT_VERSION = 1;

// The value to store. `sources` covers exactly the blocks carrying an edit —
// placement does not depend on a block's bytes, only its identity, so
// hashing every placed block would invalidate drafts for changes that cannot
// affect them. `htmlOf(id)` is the caller's lookup into the manifest.
export function toDraft(state, htmlOf, now = Date.now()) {
  const sources = {};
  // ALL THREE STORES. A link edit is an index into linksOf(html) and a size
  // choice an index into variantsOf(html), exactly as a text edit is an index
  // into textFieldsOf(html) -- so each retargets on a markup change the same
  // way and needs the same hash. Hashing only `edits` would let the other two
  // survive a change that moved them.
  for (const store of [state.edits ?? {}, state.links ?? {}, state.variants ?? {}]) {
    for (const perTemplate of Object.values(store)) {
      for (const key of Object.keys(perTemplate)) {
        const id = key.slice(0, key.lastIndexOf('@'));
        if (!(id in sources)) {
          const html = htmlOf(id);
          if (typeof html === 'string') sources[id] = hashOf(html);
        }
      }
    }
  }
  return { v: DRAFT_VERSION, savedAt: now, ...clone({ pages: state.pages, edits: state.edits, links: state.links ?? {}, variants: state.variants ?? {}, answers: state.answers }), sources };
}

const no = reason => ({ ok: false, state: null, reason });

// `manifest` is builder/blocks.json. Every row of the table in the plan is a
// check here, in the order a reader would ask them: is this a draft at all,
// is it this version, does it name things that exist, is the model itself
// coherent, and do the edits still point at the text they were made against.
export function fromDraft(raw, manifest) {
  let d;
  try { d = typeof raw === 'string' ? JSON.parse(raw) : raw; }
  catch { return no('it is not readable'); }
  if (!isObj(d)) return no('it is not readable');
  if (d.v !== DRAFT_VERSION) return no(`it was saved by a different version of the builder (${JSON.stringify(d.v)})`);
  if (!isObj(d.pages) || !isObj(d.edits) || !isObj(d.answers)) return no('it is missing part of its state');
  for (const key of ['theme', 'prefix', 'name', 'title', 'page']) {
    if (typeof d.answers[key] !== 'string') return no(`its ${key} answer is not readable`);
  }
  if (!['white', 'g10', 'g90', 'g100', 'geist', 'linear', 'ant-dark', 'spotify'].includes(d.answers.theme)) {
    return no(`it names a theme this version does not have (${d.answers.theme})`);
  }
  // THE GRID ANSWER ARRIVED 2026-09-06, so a draft saved before then has none
  // -- and that is a capped page, which is what every page was, not a corrupt
  // draft. A draft that names a width this version does not have is refused
  // exactly as an unknown theme is: opened, neither radio would be checked,
  // the preview would quietly draw capped, and the copied command would carry
  // `--grid 'wide'` for the script to reject. Not mutated here; the default is
  // supplied in the state returned below.
  if (d.answers.grid !== undefined && !['capped', 'full'].includes(d.answers.grid)) {
    return no(`it names a grid width this version does not have (${JSON.stringify(d.answers.grid)})`);
  }
  if (d.sources !== undefined && !isObj(d.sources)) return no('it is missing part of its state');

  const blocks = new Map(manifest.blocks.map(b => [b.id, b]));
  const templates = new Map(manifest.templates.map(t => [t.name, t]));
  const placed = new Map();     // template → Set of entry keys

  for (const [name, page] of Object.entries(d.pages)) {
    const t = templates.get(name);
    if (!t) return no(`it names a template this version does not have (${name})`);
    if (!isObj(page) || !isObj(page.slots) || !isObj(page.next)) return no(`its record of ${name} is incomplete`);

    const slots = new Set(t.slots.map(s => s.name));
    for (const slot of slots) {
      if (!Object.hasOwn(page.slots, slot)) return no(`its record of ${name} is missing the ${slot} slot`);
    }
    const keys = new Set();
    const highest = new Map();  // block id → highest instance placed

    for (const [slot, list] of Object.entries(page.slots)) {
      if (!slots.has(slot)) return no(`it names a slot ${name} does not have (${slot})`);
      if (!Array.isArray(list)) return no(`its record of ${name} is incomplete`);
      // unitOf() consumes a contiguous run. A follower may name any member
      // of that run, but never reach across an unrelated leader.
      const run = new Set();
      for (const e of list) {
        if (!isObj(e) || typeof e.id !== 'string' || !isCount(e.n) || e.key !== `${e.id}@${e.n}`) {
          return no(`it holds a block on ${name} that is not readable`);
        }
        if (!blocks.has(e.id)) return no(`it names a block this version does not have (${e.id})`);
        if (keys.has(e.key)) return no(`it places ${e.key} on ${name} twice`);
        keys.add(e.key);
        if (e.follows !== null && e.follows !== undefined) {
          if (typeof e.follows !== 'string' || !run.has(e.follows)) {
            return no(`${e.key} on ${name} follows a block outside its contiguous group`);
          }
        } else run.clear();
        run.add(e.key);
        highest.set(e.id, Math.max(highest.get(e.id) ?? 0, e.n));
      }
    }
    for (const [id, n] of highest) {
      if (!isCount(page.next[id]) || page.next[id] <= n) {
        return no(`its instance count for ${blocks.get(id).label} on ${name} is behind what it placed`);
      }
    }
    placed.set(name, keys);
  }

  // TEXT AND LINKS ARE VALIDATED THE SAME WAY, because they fail the same way:
  // both are indices into a list derived from the block's markup. `links` is
  // OPTIONAL — a draft written before stage 8 has none, and must still open,
  // which is why DRAFT_VERSION did not move.
  if (d.links !== undefined && !isObj(d.links)) return no('it is missing part of its state');
  if (d.variants !== undefined && !isObj(d.variants)) return no('it is missing part of its state');
  for (const [what, store] of [['edits', d.edits], ['link targets', d.links ?? {}], ['size choices', d.variants ?? {}]]) {
    for (const [name, perTemplate] of Object.entries(store)) {
      if (!templates.has(name)) return no(`it holds ${what} for a template this version does not have (${name})`);
      if (!isObj(perTemplate)) return no(`its ${what} for ${name} are not readable`);
      for (const [key, fields] of Object.entries(perTemplate)) {
        if (!placed.get(name)?.has(key)) return no(`it holds ${what} for a block that is not on ${name}`);
        if (!isObj(fields)) return no(`its ${what} for ${name} are not readable`);
        for (const [i, text] of Object.entries(fields)) {
          if (!isIndex(Number(i)) || typeof text !== 'string') return no(`its ${what} for ${name} are not readable`);
        }
        const id = key.slice(0, key.lastIndexOf('@'));
        const recorded = d.sources?.[id];
        if (typeof recorded !== 'string') return no(`it does not record which version of ${blocks.get(id).label} its text was edited against`);
        if (recorded !== hashOf(blocks.get(id).html)) {
          return no(`the markup of ${blocks.get(id).label} has changed since this draft was saved`);
        }
      }
    }
  }

  return { ok: true, state: clone({ pages: d.pages, edits: d.edits, links: d.links ?? {}, variants: d.variants ?? {}, answers: { ...d.answers, grid: d.answers.grid ?? 'capped' } }), reason: null, savedAt: d.savedAt ?? null };
}

// "just now", "4 minutes ago" — for the notice. Deliberately coarse: the
// exact second is never what the reader wants to know.
export function agoOf(then, now = Date.now()) {
  if (!Number.isFinite(then)) return 'earlier';
  const s = Math.max(0, Math.round((now - then) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

export { clone as copy, same as identical, CAP, RUN_MS };
