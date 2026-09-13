// theme-creator.html's behaviour. Phase 14 (roadmap §4.14), the Surfaces
// section (§4.15), saved themes (§4.16), and rebuilt as one list 2026-09-10
// (§4.17).
//
// Lives outside js/ for the reason builder/ does: tools/new-project.sh
// vendors everything under js/ into every consumer project, and this tool
// belongs only here.
//
// STATE is { name, base, tokens, savedId }. `tokens` holds EVERY colour
// token css/rux.css declares — 311 of them — keyed by the short name
// (e.g. "button-primary", not "--rux-button-primary"), seeded from the
// chosen base and overwritten as fields are edited. `base` is one of
// Carbon's four compiled themes; `savedId` is the id this page last saved
// under, which is how Save replaces its own theme rather than accumulating
// (see saveTheme).
//
// WHAT CHANGED, AND WHAT DID NOT. Until 2026-09-10 this file drove two
// independent sections — twenty accent tokens with a Carbon hue-family
// shortcut, and twenty-nine surface tokens on a base — with a shared undo
// stack and an `activeSection` flag saying which one the preview reflected.
// rux asked for every token editable on one screen. One section means no
// flag, no second export block, and no second save path. The hue-family
// shortcut is GONE with it, which is a real loss of convenience and is
// recorded in tools/build-theme-creator.mjs's header rather than left for a
// reader to notice.
//
// WHAT A THEME IS HAS NOT CHANGED, and this is the part worth not breaking:
// a base plus a set of overrides applied through the CSS cascade. Never a
// fifth compiled Carbon theme. A first attempt at that (map.merge over
// themes.$g100) was found broken by review before any file was written —
// Carbon selects its component tokens by matching a theme map's COMPLETE
// contents (_theme.scss's `matches()`), so changing one key breaks every
// component-token lookup for that theme, silently.
//
// ONLY WHAT YOU CHANGED IS EXPORTED OR SAVED. `changed()` diffs the fields
// against the base, and that diff is the CSS block, the saved record and
// the downloaded file alike. A theme that moves four colours is four lines,
// and everything else stays whatever the base already gets right — which is
// the whole argument for layering over a base instead of replacing it.
import { runKey, sameRun, copy, CAP } from '../builder/session.mjs';
import { contrastRatio, meetsThreshold, normaliseHex } from './contrast.mjs';

const NAME_RE = /^[a-z][a-z0-9-]*$/;
const RESERVED = new Set(['white', 'g10', 'g90', 'g100', 'geist', 'linear', 'ant-dark', 'spotify']);

// A value the fields accept and the swatch can paint: hex, or one of the
// twenty-five rgba() values Carbon's own themes carry (every ai-aura-*,
// background-hover, text-disabled, the shadows). js/custom-themes.js
// validates saved records against the same two shapes, deliberately — a
// value this page will let you type must be a value the store will keep.
const VALUE_RE = /^(#[0-9a-f]{3,8}|rgba?\([0-9.,%\s]+\))$/i;

// READ FROM THE PAGE, NOT MIRRORED. Every token's label, level, group,
// note, the four bases' values for it, and whatever contrast check it
// carries, generated from css/rux.css by tools/build-theme-creator.mjs. A
// missing or malformed block is fatal on purpose: seeding an empty
// catalogue would look like a theme with no colours rather than like a
// build fault.
const catalogue = JSON.parse(document.getElementById('thc-catalogue').textContent);
const ROWS = catalogue.rows;
const GROUPS = catalogue.groups;
const LEVELS = catalogue.levels;
const ROW_BY_NAME = Object.fromEntries(ROWS.map(r => [r.name, r]));
const TOKEN_NAMES = ROWS.map(r => r.name);
const BASE_NAMES = ['white', 'g10', 'g90', 'g100'];

// Carbon does not declare every token in every theme — g100 drops one white
// carries. A token the chosen base is silent about keeps white's value, so
// a field is never blank.
function baseTokens(base) {
  const out = {};
  for (const r of ROWS) out[r.name] = r.bases[base] ?? r.bases.white ?? '#000000';
  return out;
}

const DRAFT_KEY = 'rux.theme-draft';
// VERSION 2. A version-1 draft is the two-section shape — { name, tokens
// (twenty), surface } — and there is no honest migration: its twenty accent
// values would restore, and its surface half would have nowhere to go. A
// draft is a convenience, not a promise (the v1 comment said so too), so an
// old one is dropped rather than half-read.
const DRAFT_VERSION = 2;
const $ = id => document.getElementById(id);


const freshState = (base = 'white') => ({ name: '', base, tokens: baseTokens(base), savedId: null });
let state = freshState();
let history = { past: [], future: [] };
let openRun = null; // { key, at } — see builder/session.mjs's own comment on runs.
let level = 'simple';
let filterText = '';

// ── history ─────────────────────────────────────────────────────────────
function pushSnapshot() {
  history.past.push(copy(state));
  if (history.past.length > CAP) history.past.shift();
  history.future = [];
  openRun = null;
  renderHistoryButtons();
}

function renderHistoryButtons() {
  $('thc-undo').disabled = history.past.length === 0;
  $('thc-redo').disabled = history.future.length === 0;
}

function undo() {
  if (!history.past.length) return;
  history.future.push(copy(state));
  state = history.past.pop();
  openRun = null;
  renderEverything();
}
function redo() {
  if (!history.future.length) return;
  history.past.push(copy(state));
  state = history.future.pop();
  openRun = null;
  renderEverything();
}

// normaliseHex, not the raw field text: a bare "000000" reads as a colour to
// the contrast badge and to nothing else, so storing it raw drew a green
// ratio next to a transparent swatch over a preview that never moved. The
// raw value is still kept when it does not parse at all, so a half-typed
// hex behaves as it always has — no verdict yet rather than a warning. An
// rgba() value is left exactly as typed: normaliseHex does not know it, and
// there is nothing to normalise.
function editToken(token, value) {
  const key = runKey('theme-creator', token);
  const now = Date.now();
  if (!sameRun(openRun, key, now)) pushSnapshot();
  openRun = { key, at: now };
  state.tokens[token] = value.trim().startsWith('rgb') ? value.trim() : (normaliseHex(value) ?? value);
}

// Reseeding from a base is ONE undoable step, and it overwrites every field
// — including ones that were edited. That is the same bargain the retired
// hue-family select made, and the helper text under the radios says so.
function applyBase(baseName) {
  if (!BASE_NAMES.includes(baseName)) return;
  pushSnapshot();
  state.base = baseName;
  state.tokens = baseTokens(baseName);
}

// ── name validation ─────────────────────────────────────────────────────
function nameProblem(name) {
  if (!name) return 'name the theme first';
  if (!NAME_RE.test(name)) return 'must start with a letter and hold only lowercase letters, digits and hyphens';
  if (RESERVED.has(name)) return `"${name}" is a theme this project already ships, not a name you can save over`;
  return null;
}

// THE NAME A PREVIEW AND ITS EXPORT BLOCK BOTH USE. Until 2026-09-08 an
// unusable name PAUSED the preview outright, which read as a dead tool:
// someone editing colours saw nothing move, and the reason printed in a
// status line far above the fields being typed in. The colours are what a
// person is judging; the name is what they fill in last. So an unusable
// name previews under a placeholder instead.
//
// BOTH CALLERS MUST RESOLVE IT THE SAME WAY. The preview writes this into
// the data-rux-surface attribute and the CSS block writes it into the
// selector; if they disagree the selector matches nothing and the preview
// shows the base with NO override, silently and looking plausible.
const previewName = () => (nameProblem(state.name) ? 'your-theme' : state.name);

// ── the diff that is the theme ──────────────────────────────────────────
// Everything downstream — the CSS block, the saved record, the downloaded
// file — is this and nothing else.
function changed() {
  const base = baseTokens(state.base);
  const out = {};
  for (const name of TOKEN_NAMES) {
    const v = state.tokens[name];
    if (typeof v !== 'string' || !VALUE_RE.test(v)) continue; // half-typed: not a change yet
    if (v.toLowerCase() !== String(base[name]).toLowerCase()) out[name] = v;
  }
  return out;
}

// ── contrast readout ────────────────────────────────────────────────────
// FORTY-EIGHT OF THREE HUNDRED AND ELEVEN ROWS CARRY ONE, and the page says
// so in those words. Twenty come from theme-creator/scenarios.json, which
// records a named pairing and a threshold per token; twenty-eight more are
// the surface ladders, which carry a `check` saying what kind of comparison
// they want. The other 263 have no recorded pairing, and a blank badge cell
// means "not checked", never "passed".
//
// THE COMPARISON COLOUR IS NOW THE EDITED ONE, which it could not be before.
// scenarios.json names its grounds as `fixed:background`, `fixed:text-primary`
// and so on — fixed because until 2026-09-10 the accent section could not
// edit them, so they were hardcoded to Carbon's white values. Every one of
// those names is an editable token now, so they resolve out of state, and a
// dark background finally makes the link ratios read the way the page
// actually looks. Where a name is not a token at all (`fixed:layer`, the
// contextual token rather than a rung) it falls back to the base's own
// layer-01, which is what :root resolves --rux-layer to.
function resolveColor(name) {
  const key = name.startsWith('fixed:') ? name.slice(6) : name;
  if (state.tokens[key] && VALUE_RE.test(state.tokens[key])) return state.tokens[key];
  if (key === 'layer') return state.tokens['layer-01'] ?? null;
  return null;
}

// ONE THRESHOLD DOES NOT FIT TWENTY-EIGHT TOKENS, measured 2026-09-08 and
// unchanged by the merge:
//
//   text      text-primary on this surface, 4.5:1
//   on-color  the secondary button's fixed white label, 4.5:1
//   edge      an outline drawn ON the page background, 3:1 — WCAG's
//             non-text threshold, which border-strong meets in all four of
//             Carbon's themes (3.02 in g10 up to 8.86 in g90)
//   hairline  REPORTED, NOT JUDGED. border-subtle is below 3:1 against its
//             own background in eleven of sixteen Carbon cases (white 1.32
//             and 1.71, g10 1.20 and 1.55, g100 1.57 and 2.32) because it
//             is a faint divider by design. Giving it a threshold would
//             show red on an unedited theme, and a warning that is always
//             on is one nobody reads.
const CHECK_AGAINST = {
  'on-color': 'text-on-color',
  edge: 'background',
  hairline: 'background',
  text: 'text-primary',
};
const CHECK_WORD = {
  'on-color': 'text-on-color',
  edge: 'on the page background',
  hairline: 'on the page background',
  text: 'text-primary',
};

function renderBadges(token) {
  const row = ROW_BY_NAME[token];
  const holder = rowEls.get(token)?.badges;
  if (!holder || !row) return;
  const badges = [...holder.children];
  if (row.scenarios.length) {
    row.scenarios.forEach((s, i) => {
      const el = badges[i];
      if (!el) return;
      const ratio = contrastRatio(resolveColor(s.foreground ?? ''), resolveColor(s.background ?? ''));
      if (ratio === null) { el.textContent = `${s.state} — unreadable colour`; el.className = 'thc-badge'; return; }
      const pass = meetsThreshold(ratio, s.threshold);
      el.textContent = `${s.state} — ${ratio.toFixed(1)}:1 (needs ${s.threshold}:1)`;
      el.className = `thc-badge ${pass ? 'thc-badge--pass' : 'thc-badge--warn'}`;
    });
    return;
  }
  if (!row.check) return;
  const el = badges[0];
  if (!el) return;
  const against = resolveColor(CHECK_AGAINST[row.check]);
  const ratio = contrastRatio(against, state.tokens[token]);
  if (ratio === null) { el.textContent = 'unreadable colour'; el.className = 'thc-badge'; return; }
  if (row.check === 'hairline') {
    el.textContent = `${CHECK_WORD[row.check]} — ${ratio.toFixed(1)}:1 (no threshold)`;
    el.className = 'thc-badge';
    return;
  }
  const threshold = row.check === 'edge' ? 3 : 4.5;
  const pass = meetsThreshold(ratio, threshold);
  el.textContent = `${CHECK_WORD[row.check]} — ${ratio.toFixed(1)}:1 (needs ${threshold}:1)`;
  el.className = `thc-badge ${pass ? 'thc-badge--pass' : 'thc-badge--warn'}`;
}

// ── the list ────────────────────────────────────────────────────────────
// BUILT ONCE, FILTERED THEREAFTER. 311 rows are cloned from the page's own
// <template> at init and then only ever shown or hidden — rebuilding the
// list on every keystroke of the search box would throw away the field
// someone is typing in, which is the field the filter is reacting to.
const rowEls = new Map(); // token -> { row, input, swatch, badges }
const groupEls = new Map(); // group key -> element

function buildList() {
  const host = $('thc-rows');
  const rowTemplate = $('thc-row-template');
  const groupTemplate = $('thc-group-template');
  const badgeTemplate = $('thc-badge-template');
  host.textContent = '';

  for (const group of GROUPS) {
    const members = ROWS.filter(r => r.group === group.key);
    if (!members.length) continue;
    const groupNode = groupTemplate.content.cloneNode(true);
    const groupEl = groupNode.querySelector('.thc-group');
    groupNode.querySelector('[data-thc="heading"]').textContent = group.label;
    const rowsHost = groupNode.querySelector('[data-thc="rows"]');

    for (const r of members) {
      const node = rowTemplate.content.cloneNode(true);
      const rowEl = node.querySelector('.thc-row');
      rowEl.dataset.token = r.name;
      const input = node.querySelector('[data-thc="hex"]');
      const label = node.querySelector('[data-thc="label"]');
      const swatch = node.querySelector('[data-thc="swatch"]');
      const badges = node.querySelector('[data-thc="badges"]');
      // The clamp lives on a span with only a thc- class, never on the
      // Carbon-classed wrapper around it. Putting -webkit-box on
      // rux--form__helper-text itself changed a Carbon element's computed
      // display, and check-spacing reported it as a divergence on 3/3
      // variants — the same finding the .thc-tail comment records for
      // padding on the stack. The wrapper is what gets hidden; the span is
      // what gets styled.
      const noteWrap = node.querySelector('[data-thc="note-wrap"]');
      const usedWrap = node.querySelector('[data-thc="used-wrap"]');
      const note = node.querySelector('[data-thc="note"]');
      const used = node.querySelector('[data-thc="used"]');

      input.id = `thc-tok-${r.name}`;
      input.value = state.tokens[r.name] ?? '';
      input.dataset.token = r.name;
      label.setAttribute('for', input.id);
      // The label is the readable name; the token's real name sits beside
      // it, because someone matching this page against a Sass map is
      // looking for `layer-accent-01`, not "Table header 1".
      label.textContent = r.label === r.name ? r.label : `${r.label} · ${r.name}`;
      swatch.id = `thc-swatch-${r.name}`;

      const badgeCount = r.scenarios.length || (r.check ? 1 : 0);
      for (let i = 0; i < badgeCount; i++) {
        const b = badgeTemplate.content.cloneNode(true);
        const el = b.querySelector('[data-thc="badge"]');
        el.dataset.token = r.name;
        el.textContent = 'checking…';
        if (r.scenarios[i]?.note) el.title = r.scenarios[i].note;
        else if (r.checkLabel) el.title = r.checkLabel;
        badges.appendChild(b);
      }

      // The clamp above shows two lines; the title carries the whole note,
      // so nothing is lost to someone who wants it.
      if (r.note) { note.textContent = r.note; note.title = r.note; noteWrap.hidden = false; }
      // The grep, and only where it is not a lie. A contextual ladder rung
      // is named directly by a handful of components and reached by
      // dozens through --rux-layer, so the curated note above is the
      // answer and this line would undercut it.
      if (!r.contextual && r.usedBy.length) {
        const more = r.usedByTotal - r.usedBy.length;
        used.textContent = `Used by: ${r.usedBy.join(', ')}${more > 0 ? `, and ${more} more` : ''}`;
        used.title = used.textContent;
        usedWrap.hidden = false;
      } else if (!r.contextual && !r.usedByTotal) {
        used.textContent = 'Not named by any compiled component.';
        usedWrap.hidden = false;
      }

      rowsHost.appendChild(node);
      rowEls.set(r.name, { row: rowEl, input, swatch, badges });
    }
    host.appendChild(groupNode);
    groupEls.set(group.key, groupEl);
  }
}

function levelAllows(rowLevel) {
  return LEVELS.indexOf(rowLevel) <= LEVELS.indexOf(level);
}

// THE FILTER HIDES, IT NEVER DISCARDS. A value typed at Full is still in
// state at Simple, still exported and still saved — the page's own intro
// promises that, and the diff in changed() is what makes it true.
function applyFilter() {
  const q = filterText.trim().toLowerCase();
  let showing = 0;
  for (const group of GROUPS) {
    const groupEl = groupEls.get(group.key);
    if (!groupEl) continue;
    let inGroup = 0;
    for (const r of ROWS) {
      if (r.group !== group.key) continue;
      const els = rowEls.get(r.name);
      if (!els) continue;
      const matches = !q || r.name.includes(q) || r.label.toLowerCase().includes(q);
      const show = levelAllows(r.level) && matches;
      els.row.hidden = !show;
      if (show) inGroup++;
    }
    groupEl.hidden = inGroup === 0;
    showing += inGroup;
  }
  const changedCount = Object.keys(changed()).length;
  $('thc-showing').textContent = `Showing ${showing} of ${ROWS.length} tokens · ${changedCount} changed from ${state.base}.`;
  $('thc-no-matches').hidden = showing > 0;
  adjustTail();
}

// THE TRAILING SPACER IS NOW CONDITIONAL, and the unconditional version
// shipped a visible hole. .thc-tail is half a viewport of empty space at
// the foot of the editor column, there so the sticky preview stays pinned
// through the last field — measured and justified in 2026-09-08's layout
// pass, when the column was always forty-nine rows tall and always longer
// than the preview.
//
// It is not always longer any more. Filter to one token, or drop to Simple,
// and the column is shorter than the pinned pane — at which point the 50vh
// is not holding anything up, it is just a gap between the last field and
// the sections below it. Seen at a 3200px viewport as roughly 1600px of
// nothing; at 720px it is 360px, which is why it went unnoticed while the
// list was fixed-length.
//
// Measured with the spacer collapsed, so the reading is the column's real
// content height rather than one that includes what is being decided.
function adjustTail() {
  const tail = document.querySelector('.thc-tail');
  const pane = document.querySelector('.thc-preview');
  if (!tail || !pane) return;
  tail.style.blockSize = '0px';
  const contentH = tail.parentElement.getBoundingClientRect().height;
  const paneH = pane.getBoundingClientRect().height;
  // THE THRESHOLD IS A VIEWPORT PLUS THE PANE, and a first attempt used the
  // pane alone — which kept the full 50vh for a column just 159px taller
  // than the pane (measured: 961 against 802), buying 1600px of hole to
  // protect a sticky range that had nothing to travel. The spacer only pays
  // for itself once there is real scrolling to do: the column has to
  // outrun the screen AND the pinned pane before half a viewport of
  // trailing space is worth its own emptiness.
  //
  // '' hands the height back to the stylesheet, which applies 50vh only at
  // the breakpoint where two columns exist at all.
  tail.style.blockSize = contentH > window.innerHeight + paneH ? '' : '0px';
}

function renderRow(token) {
  const els = rowEls.get(token);
  if (!els) return;
  const value = state.tokens[token];
  if (document.activeElement !== els.input) els.input.value = value;
  els.swatch.style.background = VALUE_RE.test(String(value)) ? value : 'transparent';
  renderBadges(token);
}

function renderAll() {
  for (const t of TOKEN_NAMES) renderRow(t);
  for (const r of document.querySelectorAll('input[name="thc-base"]')) r.checked = r.value === state.base;
  if ($('thc-name').value !== state.name) $('thc-name').value = state.name;
  renderHistoryButtons();
  renderExport();
  applyFilter();
  schedulePreview();
  scheduleSave();
}
const renderEverything = renderAll;

// ── export ──────────────────────────────────────────────────────────────
function cssBlock() {
  const diff = changed();
  const names = Object.keys(diff);
  if (!names.length) return `/* Nothing changed from ${state.base} yet. */\n`;
  const lines = names.map(t => `  --rux-${t}: ${diff[t]};`);
  return `[data-theme="${state.base}"][data-rux-surface="${previewName()}"] {\n${lines.join('\n')}\n}\n`;
}

function renderExport() {
  const diff = changed();
  const usage = `<!-- on <html>: data-theme="${state.base}" data-rux-surface="${previewName()}" -->\n`;
  $('thc-export').textContent = Object.keys(diff).length ? usage + cssBlock() : cssBlock();
  const problem = nameProblem(state.name);
  $('thc-name-helper').textContent = problem
    ? `Not usable as a theme name yet: ${problem}.`
    : 'Lowercase letters, digits and hyphens; not white, g10, g90, g100, geist, linear, ant-dark or spotify — those are the shipped themes, not a name you can save over.';
}

// ── draft ───────────────────────────────────────────────────────────────
function scheduleSave() {
  clearTimeout(scheduleSave._t);
  scheduleSave._t = setTimeout(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        v: DRAFT_VERSION, name: state.name, base: state.base, tokens: changed(), savedId: state.savedId, savedAt: Date.now(),
      }));
    } catch { /* storage may be unavailable; the draft is a convenience, not a promise */ }
  }, 500);
}

// The draft stores the DIFF, not all 311 values — a full map is ~10 KB of
// mostly the base's own colours, and storing the diff means a draft taken
// against white and reopened still means the same four changes.
function loadDraft() {
  let raw;
  try { raw = localStorage.getItem(DRAFT_KEY); } catch { return null; }
  if (!raw) return null;
  let d;
  try { d = JSON.parse(raw); } catch { return null; }
  if (!d || d.v !== DRAFT_VERSION) return null;
  if (typeof d.name !== 'string' || !BASE_NAMES.includes(d.base) || !d.tokens || typeof d.tokens !== 'object') return null;
  const tokens = baseTokens(d.base);
  for (const [k, v] of Object.entries(d.tokens)) {
    if (ROW_BY_NAME[k] && typeof v === 'string' && VALUE_RE.test(v)) tokens[k] = v;
  }
  return { name: d.name, base: d.base, tokens, savedId: typeof d.savedId === 'string' ? d.savedId : null };
}

// ── reading a theme in ──────────────────────────────────────────────────
// TWO SHAPES, ONE ROUTINE. A file this page wrote is JSON; a pasted theme
// is either a Carbon Sass map (`background: #121212,`) or a block of CSS
// custom properties (`--rux-background: #121212;`). Both reduce to
// name/value pairs, and both are filtered the same way: a name this build
// does not declare, or a value that is not a colour, is COUNTED AND
// REPORTED rather than dropped in silence — a paste that half-applies with
// no explanation is the failure mode worth avoiding here.
// THE VALUE ALTERNATION IS NOT DECORATION. The first draft ended a value at
// the first comma — `[^;,\n]+` — which is right for `layer-01: #181818,` and
// wrong for every one of Carbon's twenty-five rgba() values: pasting rux's
// own Spotify map read `rgba(18` for ai-aura-end, failed the colour check,
// and reported three values "ignored (not a colour)" with no hint that the
// parser rather than the paste was at fault. Caught by pasting the real map
// into the real page, not by reading this line. A function call is matched
// whole, first.
const PAIR_RE = /(?:^|[\s{,(])(?:--rux-)?([a-z][a-z0-9-]*)\s*:\s*(rgba?\([^)]*\)|[^;,\n]+)/gi;

function readPairs(text) {
  const applied = {}, unknown = [], rejected = [];
  for (const m of text.matchAll(PAIR_RE)) {
    const name = m[1];
    const value = m[2].trim().replace(/[,;]$/, '').trim();
    if (!ROW_BY_NAME[name]) { unknown.push(name); continue; }
    if (!VALUE_RE.test(value)) { rejected.push(`${name}: ${value}`); continue; }
    applied[name] = value;
  }
  return { applied, unknown, rejected };
}

function applyIncoming({ applied, unknown, rejected }, { base, name } = {}) {
  const count = Object.keys(applied).length;
  if (!count) {
    $('thc-load-status').textContent = unknown.length || rejected.length
      ? `Nothing read. ${unknown.length} name${unknown.length === 1 ? '' : 's'} this build does not declare, ${rejected.length} value${rejected.length === 1 ? '' : 's'} that are not colours.`
      : 'Nothing read — no token/value pairs found in that.';
    return;
  }
  pushSnapshot();
  if (base && BASE_NAMES.includes(base)) { state.base = base; state.tokens = baseTokens(base); }
  if (typeof name === 'string' && name) state.name = name;
  Object.assign(state.tokens, applied);
  renderAll();
  const notes = [];
  if (unknown.length) notes.push(`${unknown.length} name${unknown.length === 1 ? '' : 's'} ignored (not declared by this build): ${[...new Set(unknown)].slice(0, 6).join(', ')}${unknown.length > 6 ? '…' : ''}`);
  if (rejected.length) notes.push(`${rejected.length} value${rejected.length === 1 ? '' : 's'} ignored (not a colour)`);
  $('thc-load-status').textContent = `Read ${count} token${count === 1 ? '' : 's'}.${notes.length ? ' ' + notes.join('. ') + '.' : ''} Nothing is saved until you press Save theme.`;
}

function loadThemeFile(file) {
  const reader = new FileReader();
  reader.onerror = () => { $('thc-load-status').textContent = 'Could not read that file.'; };
  reader.onload = () => {
    let doc;
    try { doc = JSON.parse(String(reader.result)); } catch { $('thc-load-status').textContent = 'That is not a theme file — it is not valid JSON.'; return; }
    const record = doc && typeof doc === 'object' ? (doc.theme ?? doc) : null;
    if (!record || typeof record !== 'object' || !record.tokens || typeof record.tokens !== 'object') {
      $('thc-load-status').textContent = 'That JSON has no theme in it — expected a "tokens" object.';
      return;
    }
    const applied = {}, unknown = [], rejected = [];
    for (const [k, v] of Object.entries(record.tokens)) {
      if (!ROW_BY_NAME[k]) { unknown.push(k); continue; }
      if (typeof v !== 'string' || !VALUE_RE.test(v)) { rejected.push(k); continue; }
      applied[k] = v;
    }
    applyIncoming({ applied, unknown, rejected }, { base: record.base, name: record.id });
  };
  reader.readAsText(file);
}

// THE FILE IS THE BACKUP. It carries the same record js/custom-themes.js
// stores, plus what wrote it and when — so a browser cleared, a machine
// swapped, or a colleague asked all have the same answer, and the round
// trip through loadThemeFile is the same shape both ways.
function downloadThemeFile() {
  const name = previewName();
  const doc = {
    format: 'rux-ds-theme',
    v: 1,
    writtenBy: 'theme-creator.html',
    writtenAt: new Date().toISOString(),
    theme: { id: name, kind: 'theme', base: state.base, tokens: changed() },
  };
  const blob = new Blob([JSON.stringify(doc, null, 2) + '\n'], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${name}.rux-theme.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  $('thc-save-status').textContent = `Downloaded ${a.download} — ${Object.keys(doc.theme.tokens).length} changed tokens.`;
}

// ── preview ─────────────────────────────────────────────────────────────
// The storage sandbox, copied from builder/rewrites.mjs's SHIM rather than
// imported: it is a small, self-contained snippet, and this module's own
// path-rebasing is deliberately not that file's (see below), so nothing is
// gained by sharing the import.
const PROFILE_SHIM = `<script>/* preview only — not in the export */(()=>{const K='rux.profile',m=new Map(),P=Storage.prototype,g=P.getItem,s=P.setItem,r=P.removeItem;P.getItem=function(k){return k===K?(m.has(K)?m.get(K):null):g.call(this,k)};P.setItem=function(k,v){k===K?m.set(K,String(v)):s.call(this,k,v)};P.removeItem=function(k){k===K?m.delete(K):r.call(this,k)}})();</script>`;

// This page's own directory, absolute — a blob: document has no location of
// its own to resolve a relative path against, so a root-relative "css/rux.css"
// 404s silently inside the preview even though it reads correctly from the
// top document. builder/rewrites.mjs's previewPage() carries the same
// absolute `root` prefix for the identical reason.
const ROOT = new URL('.', location.href).href;

// Root pages (kitchen-sink.html) already use root-relative paths
// ("css/rux.css"); templates/ pages sit one directory down and use
// "../css/rux.css". Stripping a single leading "../" normalizes both to
// root-relative, then ROOT makes the result absolute — builder/rewrites.mjs's
// firstPerLine/everywhere helpers target the literal "../" prefix alone and
// do not apply to a page that has none, which is why this is its own
// function rather than a shared import.
function rebase(html) {
  return html.replace(/((?:href|src)=")(\.\.\/)?([^"#][^"]*)"/g, (_, attr, dots, path) => {
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(path)) return `${attr}${dots || ''}${path}"`; // absolute or scheme-relative — leave alone
    return `${attr}${ROOT}${path}"`;
  });
}

// Set to a saved record while its own Preview button is the last thing
// clicked; cleared the moment any field is edited again, so live editing
// always wins back the shared preview.
let previewingSaved = null;

function savedCssBlock(t) {
  const lines = Object.entries(t.tokens).map(([k, v]) => `  --rux-${k}: ${v};`);
  const layered = t.kind === 'surface' || t.kind === 'theme';
  const selector = layered ? `[data-theme="${t.base}"][data-rux-surface="${t.id}"]` : `[data-theme="${t.id}"]`;
  return `${selector} {\n${lines.join('\n')}\n}\n`;
}

let previewObjectUrl = null;

// WHAT THE FRAME CURRENTLY HOLDS, and the fetched page keyed by target.
// Both exist to keep a keystroke from reloading the frame — see the
// in-place path in buildPreview.
let frameHolds = null;
const fetchedPages = new Map();
const INJECTED_ID = 'thc-injected-theme';

async function buildPreview() {
  const target = $('thc-target').value;
  const status = $('thc-preview-status');
  let dataTheme, dataSurface, styleBlock, label;
  if (previewingSaved) {
    const t = previewingSaved;
    const layered = t.kind === 'surface' || t.kind === 'theme';
    dataTheme = layered ? t.base : 'white';
    dataSurface = layered ? t.id : null;
    styleBlock = savedCssBlock(t);
    label = `saved theme "${t.id}"`;
  } else {
    // Never pauses. An unusable name stands in as a placeholder and the
    // status line says so, rather than withholding the preview someone is
    // editing colours to see.
    const problem = nameProblem(state.name);
    const name = previewName();
    dataTheme = state.base;
    dataSurface = name;
    styleBlock = cssBlock();
    label = `"${name}" on ${state.base}`;
    if (problem) label += ` — placeholder name, ${problem}`;
  }
  const setStatus = () => { status.textContent = `Previewing ${target} — ${label}.`; };

  // A KEYSTROKE MUST NOT RELOAD THE FRAME. Every edit used to refetch the
  // target (kitchen-sink.html is ~490 KB, and cache: 'no-store' meant the
  // network every time) and assign a fresh Blob to frame.src — a full
  // reload, so the page reparsed, all seventeen behaviour modules re-ran,
  // and its scroll position went back to the top. Typing a word did that
  // several times.
  //
  // Nothing about a token edit needs a reload: the theme is carried by one
  // injected <style> and two attributes on <html>. When the frame already
  // holds this target, rewrite those three in place. The preview then keeps
  // its scroll and whatever the visitor had open, which is the behaviour
  // someone comparing two colours actually wants.
  //
  // js/theme.js does not re-run on this path, so nothing strips
  // data-rux-surface and the re-assert below is only needed on a real load.
  if (frameHolds === target) {
    const doc = $('thc-frame').contentDocument;
    const injected = doc && doc.getElementById(INJECTED_ID);
    if (injected) {
      injected.textContent = styleBlock;
      doc.documentElement.dataset.theme = dataTheme;
      if (dataSurface) doc.documentElement.setAttribute('data-rux-surface', dataSurface);
      else doc.documentElement.removeAttribute('data-rux-surface');
      setStatus();
      return;
    }
  }

  // Full load: a different target, or the first build. The fetched page is
  // kept so switching targets back and forth is not another 490 KB.
  let html = fetchedPages.get(target);
  if (html === undefined) {
    try {
      html = await fetch(target, { cache: 'no-store' }).then(r => r.text());
    } catch {
      status.textContent = `Could not load ${target} for the preview.`;
      return;
    }
    fetchedPages.set(target, html);
  }
  html = rebase(html);
  html = html.replace(/<html\b([^>]*)\sdata-theme="[^"]*"/, `<html$1 data-theme="${dataTheme}"${dataSurface ? ` data-rux-surface="${dataSurface}"` : ''}`);
  html = html.replace(/(<script[^>]*\ssrc="js\/theme\.js")/, `${PROFILE_SHIM}\n$1`);
  // js/theme.js's clearOverrides() removes data-rux-surface the moment it
  // runs — right on a real page, where it is switching away from a custom
  // theme, and fatal here, because it strips the attribute written on the
  // line above and the block's compound selector then matches nothing. The
  // preview showed the untouched base and looked plausible. THE SURFACES
  // PREVIEW HAD NEVER APPLIED; found 2026-09-08 by reading the frame, not
  // the code, since every gate and both files were individually correct.
  // Re-asserted here rather than before </head> by accident: this runs
  // after theme.js because theme.js is earlier in the same <head>.
  const reassert = dataSurface
    ? `<script>/* preview only — not in the export */document.documentElement.setAttribute('data-rux-surface',${JSON.stringify(dataSurface)});</script>`
    : '';
  html = html.replace('</head>', `<style id="${INJECTED_ID}">${styleBlock}</style>${reassert}\n</head>`);

  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  const frame = $('thc-frame');
  const prior = previewObjectUrl;
  previewObjectUrl = url;
  frameHolds = target;
  frame.addEventListener('load', () => { if (prior) URL.revokeObjectURL(prior); }, { once: true });
  frame.src = url;
  setStatus();
}
function schedulePreview() {
  clearTimeout(schedulePreview._t);
  schedulePreview._t = setTimeout(buildPreview, 250);
}

// ── the saved theme ─────────────────────────────────────────────────────
function renderSavedThemes() {
  const list = $('thc-saved-list');
  const empty = $('thc-saved-empty');
  const template = $('thc-saved-theme-template');
  if (!list || !template) return;
  const saved = window.Rux?.customThemes?.list() ?? [];
  empty.hidden = saved.length > 0;
  list.textContent = '';
  for (const t of saved) {
    const row = template.content.cloneNode(true);
    const label = row.querySelector('[data-thc="label"]');
    const count = Object.keys(t.tokens).length;
    label.textContent = t.kind === 'accent'
      ? `${t.id} — accent, ${count} tokens`
      : `${t.id} — on ${t.base}, ${count} tokens`;
    row.querySelector('[data-act="preview"]').addEventListener('click', () => {
      previewingSaved = t;
      buildPreview();
    });
    row.querySelector('[data-act="delete"]').addEventListener('click', () => {
      if (!confirm(`Delete the saved theme "${t.id}"? This removes it from every rux-ds app's account panel on this browser.`)) return;
      window.Rux.customThemes.remove(t.id);
      if (previewingSaved?.id === t.id) previewingSaved = null;
      if (state.savedId === t.id) state.savedId = null;
      renderSavedThemes();
      schedulePreview();
    });
    list.appendChild(row);
  }
}

// ONE THEME PER PERSON, WITHOUT DELETING ANYTHING THIS PAGE DID NOT WRITE.
// rux asked for one custom theme per user (2026-09-10). The store still
// holds up to fifty, because it is a shared primitive and other pages may
// one day write to it — so "one" is enforced here, and only over this
// page's OWN previous save: `savedId` is the id this page last saved under,
// and renaming then saving replaces that record rather than accumulating a
// second. A theme saved by something else is left alone and listed below
// with its own Delete button. Silently removing a record this page did not
// create would be the kind of tidying-up nobody asked for.
function saveTheme() {
  const status = $('thc-save-status');
  const problem = nameProblem(state.name);
  if (problem) { status.textContent = `Not saved: ${problem}.`; return; }
  const tokens = changed();
  if (!Object.keys(tokens).length) { status.textContent = `Not saved: nothing is different from ${state.base} yet.`; return; }

  const existing = window.Rux?.customThemes?.get(state.name);
  if (existing && existing.kind !== 'theme' && state.savedId !== state.name) {
    status.textContent = `Not saved: "${state.name}" is already saved as a ${existing.kind} theme. Delete it below, or pick another name.`;
    return;
  }
  const result = window.Rux.customThemes.save({ id: state.name, kind: 'theme', base: state.base, tokens });
  if (!result.ok) { status.textContent = `Not saved: ${result.reason}.`; return; }
  const replaced = state.savedId && state.savedId !== state.name;
  if (replaced) window.Rux.customThemes.remove(state.savedId);
  state.savedId = state.name;
  status.textContent = `Saved "${state.name}" — ${Object.keys(tokens).length} changed tokens, on ${state.base}.${replaced ? ' Replaced your previous theme.' : ''} It is now an option in every rux-ds app's account panel on this browser.`;
  renderSavedThemes();
  scheduleSave();
}

// ── width ───────────────────────────────────────────────────────────────
function setWidth(px) {
  const wrap = $('thc-frame-wrap'), frame = $('thc-frame'), pane = frame.closest('.thc-preview');
  document.querySelectorAll('[data-width]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.width === px)));
  if (px === 'fit') { frame.style.inlineSize = '100%'; wrap.style.transform = 'none'; return; }
  const target = Number(px);
  frame.style.inlineSize = `${target}px`;
  const available = pane.clientWidth;
  const scale = available < target ? available / target : 1;
  wrap.style.transform = scale < 1 ? `scale(${scale})` : 'none';
}

// ── wiring ──────────────────────────────────────────────────────────────
// ONE DELEGATED LISTENER FOR 311 FIELDS, not 311 listeners. The rows are
// cloned, so per-row binding would also have to re-run whenever the list
// was rebuilt; delegation has no such step and cannot fall behind. The same
// reasoning js/profile.js's own fieldset listener records.
function init() {
  buildList();

  const host = $('thc-rows');
  host.addEventListener('input', e => {
    const input = e.target;
    if (!(input instanceof HTMLInputElement) || !input.dataset.token) return;
    previewingSaved = null;
    editToken(input.dataset.token, input.value);
    renderRow(input.dataset.token);
    renderExport();
    applyFilter();
    schedulePreview();
    scheduleSave();
  });
  host.addEventListener('blur', e => {
    if (e.target instanceof HTMLInputElement && e.target.dataset.token) openRun = null;
  }, true);

  $('thc-name').addEventListener('input', e => {
    previewingSaved = null;
    state.name = e.target.value;
    renderExport(); schedulePreview(); scheduleSave();
  });

  for (const r of document.querySelectorAll('input[name="thc-base"]')) {
    r.addEventListener('change', e => {
      if (!e.target.checked) return;
      previewingSaved = null;
      applyBase(e.target.value);
      renderAll();
    });
  }

  const LEVEL_HELP = {
    simple: 'The twenty that set an accent. These are the only rows with a contrast check against a recorded pairing.',
    detailed: 'Everything a page built from the compiled components actually shows — surfaces, text, borders, fields, buttons, status.',
    full: 'Adds tags, the AI label, the chat shell and code-snippet colours. Every token the build declares.',
  };
  for (const r of document.querySelectorAll('input[name="thc-level"]')) {
    r.addEventListener('change', e => {
      if (!e.target.checked) return;
      level = e.target.value;
      $('thc-level-helper').textContent = LEVEL_HELP[level] ?? '';
      applyFilter();
    });
  }

  const filter = $('thc-filter');
  filter.addEventListener('input', () => {
    filterText = filter.value;
    $('thc-filter-clear').classList.toggle('rux--search-close--hidden', !filterText);
    applyFilter();
  });
  $('thc-filter-clear').addEventListener('click', () => {
    filter.value = '';
    filterText = '';
    $('thc-filter-clear').classList.add('rux--search-close--hidden');
    applyFilter();
    filter.focus();
  });

  $('thc-undo').addEventListener('click', undo);
  $('thc-redo').addEventListener('click', redo);
  $('thc-start-over').addEventListener('click', () => {
    pushSnapshot();
    const savedId = state.savedId;
    state = freshState(state.base);
    state.savedId = savedId;
    renderEverything();
  });

  $('thc-target').addEventListener('change', schedulePreview);
  document.querySelectorAll('[data-width]').forEach(b => b.addEventListener('click', () => setWidth(b.dataset.width)));

  $('thc-save').addEventListener('click', saveTheme);
  $('thc-download-file').addEventListener('click', downloadThemeFile);

  $('thc-load-browse').addEventListener('click', () => $('thc-load-file').click());
  $('thc-load-file').addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (file) loadThemeFile(file);
    e.target.value = ''; // so choosing the same file twice fires again
  });
  $('thc-paste-apply').addEventListener('click', () => {
    const text = $('thc-paste').value;
    if (!text.trim()) { $('thc-load-status').textContent = 'Nothing pasted.'; return; }
    applyIncoming(readPairs(text));
  });

  $('thc-copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(cssBlock()); $('thc-export-status').textContent = 'Copied.'; }
    catch { $('thc-export-status').textContent = 'Could not copy — select the text and copy it by hand.'; }
  });
  $('thc-download').addEventListener('click', () => {
    const blob = new Blob([cssBlock()], { type: 'text/css' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'rux-theme.css';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  window.addEventListener('rux:customthemeschange', renderSavedThemes);
  window.addEventListener('storage', e => { if (e.key === window.Rux?.customThemes?.KEY) renderSavedThemes(); });

  const draft = loadDraft();
  if (draft) state = draft;

  renderEverything();
  renderSavedThemes();
  setWidth('fit');
}

// NOTHING IS FETCHED AT STARTUP ANY MORE. This used to wait on
// theme-creator/families.json and theme-creator/scenarios.json before
// init() could run, and a crash anywhere inside that .then() was reported
// to the reader as "could not load families.json or scenarios.json" — the
// generator's own comment records one build where a missing row element
// threw there and the page blamed the wrong thing for it. The families file
// has no consumer since the hue select was retired, and every scenario now
// travels in the embedded catalogue, so there is nothing left to wait for.
init();
