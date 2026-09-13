// Writes theme-creator/tokens.json: every colour-valued --rux-* token the
// build actually declares, with its value in each of the four compiled
// bases, the level the theme creator shows it at, and — where Carbon or the
// stylesheet can answer for it — what the token is tied to. Roadmap §4.17.
//
// WHY THIS EXISTS. Until 2026-09-10 the theme creator carried its own two
// hand-written token tables: twenty accent rows (§4.14) and twenty-nine
// surface rows (§4.15), forty-nine of the three hundred and eleven colour
// tokens the build emits. rux asked for all of them editable, so the list
// stops being something a person maintains and becomes something read off
// the stylesheet — the same move §4.15 already made for the four bases'
// values when a hundred and sixteen hand-entered hexes stopped being a
// tripwire and started being the likelier fault.
//
// THE TOKEN SET IS css/rux.css's OWN :root BLOCK, not @carbon/themes. The
// two disagree, and the stylesheet is the one that ships: Carbon's theme
// package describes 188 tokens, while the compiled CSS declares 311 colour
// ones, because component tokens (button-*, tag-*, notification-*) live in
// separate Sass maps that the theme package's own JSON never merges. A
// catalogue built from the package would have silently omitted a hundred
// and twenty-three editable colours, most of them the tag and notification
// families.
//
// DESCRIPTIONS ARE CARBON'S WHERE CARBON WROTE ONE. @carbon/themes ships a
// DTCG file per theme carrying a $description per token. Measured before
// it was trusted: of the 117 non-syntax tokens it describes, 91 say only
// "Token for <leaf> in the design system." — filler that reads like
// documentation and carries nothing. Those are dropped here rather than
// printed, because a description that says nothing is worse on the page
// than an empty cell: it stops the reader looking further.
//
// `usedBy` IS A GREP AND IS LABELLED AS ONE. It lists the compiled
// components whose rules name the token directly. For most tokens that is
// the whole truth. For the five CONTEXTUAL LADDERS it is badly misleading,
// and tools/build-theme-creator.mjs's own SURFACE_GROUPS comment already
// recorded why: a component almost never names layer-01, it names
// --rux-layer and gets whichever rung its nesting puts it on, so grepping
// direct consumers of layer-01 finds eleven classes and understates it. The
// ladder rungs are marked `contextual` here and the page prints the curated
// note for them instead of the grep.
import { readFileSync, writeFileSync } from 'node:fs';

const css = readFileSync('css/rux.css', 'utf8');

// The four compiled bases. white is emitted at :root (src/app.scss), the
// other three at an UNQUOTED attribute selector — [data-theme=g10], not
// [data-theme="g10"]. A reader that assumes either finds nothing and
// seeds an empty base, so both shapes are asserted, the same assertion
// tools/build-theme-creator.mjs's readBases() makes for its own subset.
const BASE_SELECTORS = { white: ':root', g10: '[data-theme=g10]', g90: '[data-theme=g90]', g100: '[data-theme=g100]' };

// A theme block is identified by declaring layer-01, not by its selector
// alone: :root carries several other rule sets in the compiled output.
function themeBlock(selector) {
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (m[1].trim() === selector && m[2].includes('--rux-layer-01:')) return m[2];
  }
  return null;
}

const COLOUR_RE = /--rux-([a-z0-9-]+)\s*:\s*(#[0-9a-f]{3,8}|rgba?\([^)]*\))\s*;/gi;

const bases = {};
for (const [name, selector] of Object.entries(BASE_SELECTORS)) {
  const body = themeBlock(selector);
  if (body === null) throw new Error(`css/rux.css has no ${selector} block declaring --rux-layer-01 — the catalogue cannot be built`);
  const tokens = {};
  for (const m of body.matchAll(COLOUR_RE)) tokens[m[1]] = m[2];
  bases[name] = tokens;
}

// white is the seed the page opens on, so its key set is the catalogue's.
// A token one base declares and another does not is real (g100 drops one
// that white carries) and is recorded per base rather than dropped.
const names = Object.keys(bases.white).sort();
if (names.length < 200) throw new Error(`only ${names.length} colour tokens found in css/rux.css :root — the parse is wrong, not the stylesheet`);

// ---------------------------------------------------------------------------
// Levels. Three, and the page's filter is exactly this field.
//
// `simple` is §4.14's twenty, unchanged and still the only tokens with a
// contrast scenario recorded against them — which is why the level exists
// rather than being a row count someone picked.
const SIMPLE = [
  'interactive', 'icon-interactive', 'border-interactive', 'background-brand',
  'focus', 'highlight', 'link-primary', 'link-primary-hover', 'link-secondary',
  'link-inverse', 'link-inverse-hover', 'button-primary', 'button-primary-hover',
  'button-primary-active', 'button-tertiary', 'button-tertiary-hover',
  'button-tertiary-active', 'chat-button', 'chat-button-text-hover', 'chat-avatar-user',
];

// `detailed` is what a page made of the compiled component set actually
// shows. The four families left to `full` are not lesser tokens, they are
// narrower ones: tag (40) only colours tags, ai (21) only the AI label and
// its aura, chat (21) only the chat shell, syntax (88) only code snippets.
// Together they are 170 of the 311 — more than half the catalogue, and none
// of it on a page that has no tag, no chat and no code block.
const FULL_ONLY_PREFIXES = ['tag', 'ai', 'chat', 'syntax'];
const levelOf = name => {
  if (SIMPLE.includes(name)) return 'simple';
  const prefix = name.split('-')[0];
  return FULL_ONLY_PREFIXES.includes(prefix) ? 'full' : 'detailed';
};

for (const n of SIMPLE) {
  if (!names.includes(n)) throw new Error(`SIMPLE names ${n}, which css/rux.css does not declare`);
}

// ---------------------------------------------------------------------------
// Groups, in the order the page lists them. The key is the token-name
// prefix, so membership is derived, not typed: a token Carbon adds lands in
// its family without this file changing. A prefix with no entry here throws
// rather than falling into an "other" bucket nobody curated.
const GROUPS = [
  ['background', 'Page background'],
  ['layer', 'Surfaces and layers'],
  ['field', 'Form fields'],
  ['border', 'Borders and outlines'],
  ['text', 'Text'],
  ['icon', 'Icons'],
  ['link', 'Links'],
  ['button', 'Buttons'],
  ['interactive', 'Interactive'],
  ['focus', 'Focus ring'],
  ['highlight', 'Highlight'],
  ['support', 'Status colours'],
  ['status', 'Status indicator'],
  ['notification', 'Notifications'],
  ['content', 'Content switcher'],
  ['skeleton', 'Loading skeleton'],
  ['overlay', 'Overlay'],
  ['shadow', 'Shadow'],
  ['toggle', 'Toggle'],
  ['tag', 'Tags'],
  ['ai', 'AI label'],
  ['chat', 'Chat'],
  ['syntax', 'Code snippets'],
];
const GROUP_LABELS = Object.fromEntries(GROUPS);
for (const n of names) {
  const prefix = n.split('-')[0];
  if (!(prefix in GROUP_LABELS)) throw new Error(`--rux-${n} has prefix "${prefix}", which the GROUPS table does not name — add it rather than letting the page bucket it silently`);
}

// ---------------------------------------------------------------------------
// The five contextual ladders. A component reads the contextual token
// (--rux-layer) and lands on whichever rung its nesting gives it, so a grep
// for the rung itself is an understatement rather than an answer. The page
// prints tools/build-theme-creator.mjs's curated note for these instead.
const CONTEXTUAL = /^(layer|layer-accent|field|border-subtle|border-strong)-\d\d$/;

// ---------------------------------------------------------------------------
// usedBy: one pass over every rule in the compiled stylesheet, collecting
// the component class that rule belongs to for each token it names. The
// theme blocks themselves are skipped — a token's own declaration is not a
// use of it. Modifier and element suffixes collapse to the component
// (.rux--btn--primary and .rux--btn__icon are both `btn`) so the reader
// gets "button", not forty selectors.
const usedBy = Object.fromEntries(names.map(n => [n, new Set()]));
for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const selector = m[1].trim();
  const body = m[2];
  if (!body.includes('var(--rux-')) continue;
  if (Object.values(BASE_SELECTORS).includes(selector)) continue;
  const components = new Set();
  for (const c of selector.matchAll(/\.rux--([a-z0-9-]+)/g)) components.add(c[1].split('__')[0].replace(/--.*$/, ''));
  if (!components.size) continue;
  for (const v of body.matchAll(/var\(\s*--rux-([a-z0-9-]+)/g)) {
    if (usedBy[v[1]]) for (const c of components) usedBy[v[1]].add(c);
  }
}

const tokens = {};
for (const name of names) {
  const perBase = {};
  for (const [b, map] of Object.entries(bases)) if (map[name]) perBase[b] = map[name];
  tokens[name] = {
    group: name.split('-')[0],
    level: levelOf(name),
    contextual: CONTEXTUAL.test(name),
    usedBy: [...usedBy[name]].sort(),
    bases: perBase,
  };
}

// ---------------------------------------------------------------------------
// Carbon's own descriptions, kept only where they say something. The DTCG
// file is nested (ai.aura.end) and the CSS custom property is flat
// (ai-aura-end), so the tree is flattened to the same shape before merging.
//
// ALL FOUR THEME FILES ARE READ, and the first draft of this script read
// only g100 behind an assertion that the four agreed. They do not: 129 of
// the 188 descriptions differ between white and g100, and the difference is
// not a nuance — white's ai-aura-end says "AI aura end", g100's says "End
// color for AI aura gradient effect. Creates a fade-to-transparent effect at
// the edge of AI-enhanced elements." Carbon wrote prose into one file and
// left the token name restated in the others. The assertion fired on the
// first run and is what turned a silent half-empty column into this: take
// the longest description any of the four carries, and record which file it
// came from.
function flattenDtcg(json) {
  const out = {};
  (function walk(node, path) {
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith('$')) continue;
      if (v && typeof v === 'object' && v.$value !== undefined) out[[...path, k].join('-')] = v.$description ?? '';
      else if (v && typeof v === 'object') walk(v, [...path, k]);
    }
  })(json, []);
  return out;
}
const described = {};
const describedFrom = {};
for (const themeName of ['white', 'g10', 'g90', 'g100']) {
  const flat = flattenDtcg(JSON.parse(readFileSync(`node_modules/@carbon/themes/src/dtcg/${themeName}.json`, 'utf8')));
  for (const [k, v] of Object.entries(flat)) {
    if (!v) continue;
    if (described[k] === undefined || v.length > described[k].length) { described[k] = v; describedFrom[k] = themeName; }
  }
}
if (!Object.keys(described).length) throw new Error('@carbon/themes/src/dtcg carries no $description at all — the flatten is wrong, not the package');

// FILLER, MEASURED NOT GUESSED. 91 of the 117 non-syntax descriptions match
// this shape exactly and carry nothing: "01. Token for 01 in the design
// system." Dropping them is the whole reason the page can show a
// description at all without teaching the reader to ignore the column.
const FILLER = /^.{1,40}\.\s*Token for .+ in the design system\.$/;
// The other filler shape, from the files that carry no prose at all: the
// token's own name with the hyphens taken out. "layer-01" described as
// "Layer 01" tells a reader nothing they did not read in the label beside
// it, so it is dropped on the same grounds as the sentence-shaped kind.
const restatesName = (name, d) => d.replace(/[^a-z0-9]/gi, '').toLowerCase() === name.replace(/[^a-z0-9]/gi, '').toLowerCase();
let kept = 0, dropped = 0;
for (const name of names) {
  const d = described[name];
  if (!d) continue;
  if (FILLER.test(d) || restatesName(name, d)) { dropped++; continue; }
  tokens[name].description = d;
  tokens[name].descriptionFrom = describedFrom[name];
  kept++;
}

const counts = { total: names.length };
for (const level of ['simple', 'detailed', 'full']) counts[level] = names.filter(n => tokens[n].level === level).length;
// The filter is cumulative on the page: detailed shows simple too, full
// shows everything. The counts recorded here are per level, and the page
// adds them up rather than this file publishing two versions of the number.

writeFileSync(
  'theme-creator/tokens.json',
  JSON.stringify({
    _meta: {
      source: 'css/rux.css :root and the three [data-theme] blocks; descriptions from @carbon/themes/src/dtcg',
      counts,
      descriptions: { kept, droppedAsFiller: dropped },
      note: 'usedBy is a grep of the compiled stylesheet for rules naming the token directly. It understates the five contextual ladders, which are flagged `contextual` and carry a curated note on the page instead.',
    },
    groups: GROUPS.filter(([key]) => names.some(n => tokens[n].group === key)).map(([key, label]) => ({ key, label })),
    tokens,
  }, null, 2) + '\n',
);

console.log(`theme-creator/tokens.json: ${counts.total} colour tokens (${counts.simple} simple, ${counts.detailed} detailed, ${counts.full} full) · ${kept} Carbon descriptions kept, ${dropped} dropped as filler`);
