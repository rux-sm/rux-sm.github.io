// tools/tile-looks.mjs -- what a diagram tile is DRAWN as, read out of the page.
//
// WHY IT EXISTS. The diagram draws five categories, and the figure that says
// whether each one is drawn exactly ONE way lived only in
// `tools/specimen-kinds.mjs` -- in a browser, on a page under `build/`, which is
// git-ignored. So it existed while a person was looking at it and not otherwise,
// and `docs/status.md` has carried "the collision figures belong in measure.mjs"
// as decided-and-not-built since. This is that, so a diff catches it.
//
// THE FIGURE IT PORTS IS `one category, one look`, WHICH IS THE ONE THAT WAS
// MISSING. `63094e5` shipped two of the six Prerequisites as three-sided boxes,
// open on the left, and every collision figure read 0 throughout and read it
// correctly -- a three-sided box is still nothing like a Step. Collisions ask
// whether two categories can be told apart; nothing asked whether ONE was drawn
// consistently until a person looked at the live site.
//
// IT DERIVES FROM THE SHIPPED STYLESHEET, IT DOES NOT RESTATE IT. The rules are
// read out of the page passed in, so a change in `build.mjs` arrives here by
// itself. A hand-written table of "this category plus a code line looks like
// that" would be a second copy of the CSS, correct the day it was written and
// silent the day the CSS broke.
//
// AND IT REFUSES RATHER THAN GUESSES. Every selector and every value it meets
// among the rules that can change one of the five properties must be inside the
// grammar below; anything else throws. A measurement that quietly returns "all
// fine" on markup it did not understand is worse than no measurement.
//
//   node tools/tile-looks.mjs [page]    # the tiles of one built page, with
//                                      # the resolved look of each
//
// WHAT IT CANNOT SEE, AND WHY THE SPECIMEN STAYS. It compares TOKEN NAMES, not
// painted colours: `var(--rux-border-strong-01)` and `var(--rux-border-subtle-01)`
// are two looks here, in every theme, because nothing in Node resolves a token.
// If two tokens paint the same value in one theme, two tiles would collide on
// screen and not here. That comparison is per-theme and belongs in a browser,
// which is what `specimen-kinds.mjs` is for. This answers the theme-independent
// half: is one category drawn by one set of rules.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// THE READER-FACING NAME OF EACH CATEGORY, and the one place either side words
// them. It lived in build.mjs until 2026-09-12 and moved here for one reason:
// measure.mjs has to name a category that is ABSENT from a page, and a second
// copy of these words is exactly the drift that let `Inquiry` render nothing
// while a committed row said so. build.mjs imports it; nothing else defines it.
// A NAME IS PRESENTATION, NOT CONTRACT -- atlas emits `kind` and never a
// category. The fold itself is build.mjs's `categories()`, and atlas states
// what it does in _standards/guide-json.md section 7.4.
export const CATEGORY_NAME = { step: 'Step', config: 'Setup', info: 'Inquiry',
  result: 'Result', check: 'Checkpoint' };

// THE FIVE PROPERTIES ARE THE SPECIMEN'S, DELIBERATELY UNCHANGED. Its `sig()`
// reads border-inline-start colour, style and width, background colour, and the
// name's font style -- the stripe, the card and the italic, which are the three
// signals the five categories are drawn by. Keeping the same five is what lets
// the browser figure and this one be compared at all.
const SELF_PROPS = ['border-inline-start-width', 'border-inline-start-style',
  'border-inline-start-color', 'background-color'];
const NAME_PROPS = ['font-style'];

// A declaration can only matter if it reaches one of those five. `border` and
// `background` are shorthands that do; `--dg-accent` feeds the stripe colour.
const RELEVANT = /^(border(-inline-start)?(-width|-style|-color)?|background(-color)?|font-style|--dg-accent)$/;

const BORDER_STYLES = new Set(['none', 'hidden', 'solid', 'dashed', 'dotted',
  'double', 'groove', 'ridge', 'inset', 'outset']);
const isWidth = (t) => /^(0|[\d.]+(px|rem|em|pt))$/.test(t)
  || ['thin', 'medium', 'thick'].includes(t);

// STATE IS NOT A LOOK. `[open]` repaints a tile the reader has expanded, and
// hover and focus are the same kind of thing; the figure is about a tile at
// rest, exactly as the specimen measures it. These are counted, not ignored
// silently -- a state rule arriving where none was is worth seeing in a diff.
const STATE = /^(\[open\]|:hover|:focus|:focus-visible|:active|:target)$/;

// --- the bits of CSS this understands ---------------------------------------

// A compound selector, split into its pieces: `.a.b:not(:has(.c))` becomes
// four. Anything that is not a class, a `:not(...)`, a `:has(...)`, a bare
// element name or a state test is refused by the caller.
const pieces = (compound) => {
  const out = [];
  let i = 0;
  while (i < compound.length) {
    const c = compound[i];
    if (c === '.' || c === '#') {
      const m = /^[.#][\w-]+/.exec(compound.slice(i));
      if (!m) throw new Error(`cannot read ${compound}`);
      out.push(m[0]); i += m[0].length;
    } else if (c === ':') {
      // A functional pseudo-class carries a balanced paren group.
      const m = /^::?[\w-]+/.exec(compound.slice(i));
      if (!m) throw new Error(`cannot read ${compound}`);
      let tok = m[0]; i += m[0].length;
      if (compound[i] === '(') {
        let depth = 0, j = i;
        for (; j < compound.length; j++) {
          if (compound[j] === '(') depth++;
          else if (compound[j] === ')' && --depth === 0) { j++; break; }
        }
        tok += compound.slice(i, j); i = j;
      }
      out.push(tok);
    } else if (c === '[') {
      const j = compound.indexOf(']', i);
      if (j < 0) throw new Error(`cannot read ${compound}`);
      out.push(compound.slice(i, j + 1)); i = j + 1;
    } else {
      const m = /^[\w-]+/.exec(compound.slice(i));
      if (!m) throw new Error(`cannot read ${compound}`);
      out.push(m[0]); i += m[0].length;
    }
  }
  return out;
};

// COMBINATORS ARE SPLIT AT DEPTH ZERO ONLY. Splitting on whitespace naively
// cuts inside `:not(.a .b)` and hands the halves to the piece reader, which then
// produces a specificity for something it never parsed -- a wrong answer where
// the whole point is a refusal. `+` and `~` are refused here rather than
// understood: no rule in the diagram uses one, and a sibling rule would mean a
// tile's look depends on its neighbours, which is a different measurement.
const splitCompounds = (sel) => {
  const out = [];
  let depth = 0, cur = '';
  for (const ch of sel) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (depth === 0 && (ch === ' ' || ch === '>')) { if (cur) out.push(cur); cur = ''; continue; }
    if (depth === 0 && (ch === '+' || ch === '~')) throw new Error(`sibling combinator in "${sel}"`);
    cur += ch;
  }
  if (cur) out.push(cur);
  return out;
};

// SPECIFICITY, BECAUSE THE SHIPPED CSS TURNS ON IT. The note above the
// not-a-session rule in `build.mjs` says so outright: `:has()` takes its
// argument's specificity, a single class loses to it, and the fix for the
// three-sided card was to add two `:not()`s rather than reorder anything. A
// resolver that ignored specificity would get that rule's outcome backwards.
const specificity = (sel) => {
  let b = 0, c = 0;
  for (const compound of splitCompounds(sel)) {
    for (const p of pieces(compound)) {
      if (p.startsWith('#')) b += 1000;
      else if (p.startsWith('.') || p.startsWith('[')) b += 1;
      else if (p.startsWith('::')) c += 1;
      else if (p.startsWith(':')) {
        const m = /^:(not|has|is|where)\((.*)\)$/.exec(p);
        if (!m) { b += 1; continue; }           // an ordinary pseudo-class
        if (m[1] === 'where') continue;         // contributes nothing
        // `:not()`, `:has()` and `:is()` take their most specific argument.
        const inner = m[2].split(',').map((s) => specificity(s.trim()));
        const worst = inner.reduce((a, x) => (x.b > a.b || (x.b === a.b && x.c > a.c) ? x : a));
        b += worst.b; c += worst.c;
      } else c += 1;                            // an element name
    }
  }
  return { b, c };
};
const beats = (x, y) => x.b !== y.b ? x.b > y.b : x.c > y.c;

// --- does a selector land on this tile, and on what ---------------------------

// A tile is described by what the markup already says about it: the classes on
// the `<details>`, and the classes of the elements inside it. That is enough,
// because every rule below is keyed on one of those two things -- which is
// itself checked, not assumed: a rule keyed on anything else is refused.
const matchesCompound = (compound, tile) => {
  for (const p of pieces(compound)) {
    if (p.startsWith('.')) { if (!tile.classes.has(p.slice(1))) return false; }
    else if (p === 'details') continue;
    else if (STATE.test(p)) return null;        // a state rule: not at rest
    else {
      const m = /^:(not|has)\((.*)\)$/.exec(p);
      if (!m) throw new Error(`unsupported selector piece "${p}"`);
      if (m[1] === 'has') {
        // Only `:has(.class)` is used, and it asks about the tile's contents.
        const inner = m[2].trim();
        if (!/^\.[\w-]+$/.test(inner)) throw new Error(`unsupported :has(${inner})`);
        if (!tile.inner.has(inner.slice(1))) return false;
      } else {
        const r = matchesCompound(m[2].trim(), tile);
        if (r === null) return null;
        if (r) return false;
      }
    }
  }
  return true;
};

// WHAT THE RULE IS AIMED AT. A selector is only interesting here if one of its
// compounds is the tile itself; a rule like `.ln-dg-node-name { font-size }`
// constrains the tile not at all and so applies the same way to every tile that
// has a name, which is all of them. Those say nothing about how a CATEGORY is
// drawn and are dropped -- structurally, by looking at the selector, not by
// being listed.
const TILE_CLASS = /^(ln-dg-node|ln-dg-cat--[\w-]+)$/;
const target = (sel, tile) => {
  const compounds = splitCompounds(sel);
  const at = compounds.findIndex((cd) =>
    pieces(cd).some((p) => p.startsWith('.') && TILE_CLASS.test(p.slice(1))));
  if (at < 0) return null;                      // not about the tile
  if (at > 0) throw new Error(`tile is not leftmost in "${sel}"`);
  const m = matchesCompound(compounds[0], tile);
  if (m === null) return 'state';
  if (!m) return false;
  const rest = compounds.slice(1).join(' ');
  if (rest === '') return 'self';
  if (/\bln-dg-node-name\b/.test(rest)) return 'name';
  return 'other';                               // inside the tile, not the five
};

// --- the cascade, over the five properties only ------------------------------

// `border: 1px dashed X` sets the inline-start side too, and -- the part that
// matters -- `border-inline-start: 0` sets width 0 and RESETS style to none,
// which is the whole of how a stripe disappears. A shorthand that did not reset
// would have this reporting a stripe that is not drawn.
const expand = (prop, value) => {
  const v = value.trim();
  if (prop === 'border' || prop === 'border-inline-start') {
    const toks = v.split(/\s+(?![^(]*\))/);
    let w = 'medium', s = 'none', c = 'currentcolor';
    for (const t of toks) {
      if (isWidth(t)) w = t;
      else if (BORDER_STYLES.has(t)) s = t;
      else c = t;
    }
    return { 'border-inline-start-width': w, 'border-inline-start-style': s,
      'border-inline-start-color': c };
  }
  if (prop === 'border-width') return { 'border-inline-start-width': v };
  if (prop === 'border-style') return { 'border-inline-start-style': v };
  if (prop === 'border-color') return { 'border-inline-start-color': v };
  if (prop === 'background') return { 'background-color': v };
  if (prop === 'background-color') return { 'background-color': v };
  if (prop.startsWith('border-inline-start-')) return { [prop]: v };
  if (prop === 'font-style' || prop === '--dg-accent') return { [prop]: v };
  throw new Error(`relevant property with no expansion: ${prop}`);
};

// The initial values these five fall back to when no rule sets them. A tile
// with no rule at all would be an unstriped, unfilled box with an upright name,
// which is what the contract's own guarantee at §6 promises for a kind nobody
// styled.
const INITIAL = { 'border-inline-start-width': 'medium',
  'border-inline-start-style': 'none', 'border-inline-start-color': 'currentcolor',
  'background-color': 'transparent', 'font-style': 'normal' };

// --- reading the page --------------------------------------------------------

const rulesOf = (css) => {
  const out = [];
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  let order = 0;
  for (const [, selList, body] of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const decls = [];
    for (const d of body.split(';')) {
      const i = d.indexOf(':');
      if (i < 0) continue;
      const prop = d.slice(0, i).trim(), value = d.slice(i + 1).trim();
      if (RELEVANT.test(prop)) decls.push([prop, value]);
    }
    if (!decls.length) continue;
    for (const sel of selList.split(',')) {
      const s = sel.trim().replace(/\s+/g, ' ');
      if (!s || s.startsWith('@')) continue;
      out.push({ sel: s, decls, spec: specificity(s), order: order++ });
    }
  }
  return out;
};

// The tiles, in the order `build.mjs` emitted them. A tile is a `<details>`; its
// own classes and the classes inside it are all any rule here is keyed on.
const tilesOf = (fig) => fig.split('<details class="ln-dg-node').slice(1).map((part) => {
  const classes = ('ln-dg-node' + part.slice(0, part.indexOf('"'))).split(/\s+/);
  const end = part.indexOf('</details>');
  const inner = new Set([...part.slice(0, end < 0 ? part.length : end)
    .matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)));
  return {
    classes: new Set(classes), inner,
    kind: (classes.find((c) => c.startsWith('ln-dg-node--')) ?? '?').slice(12),
    cat: (classes.find((c) => c.startsWith('ln-dg-cat--')) ?? '?').slice(11),
    hasCode: inner.has('ln-dg-node-code'),
  };
});

const figureOf = (html) => {
  const i = html.indexOf('<figure class="rux--tile ln-dg"');
  if (i < 0) return null;
  return html.slice(i, html.indexOf('</figure>', i));
};

// ONE LOOK IN WORDS, so `MEASURED` and the command line say it the same way and
// a diff on the row reads as a sentence about the drawing. A border of zero
// width or `none` style is drawn as nothing, and saying `border none` rather
// than `0 none currentcolor` is the difference between a row a person can read
// and one they have to decode -- it was an edge reading `0 none` that hid the
// missing checkpoint accent on the overview for a day.
//
// IT SAID `stripe` UNTIL 2026-09-12, when the 3px accent edge was removed and
// every tile went to one border weight. There is no stripe to name any more.
export const describeLook = ([w, s, c, bg, fontStyle]) =>
  `border ${w === '0' || w === '0px' || s === 'none' ? 'none' : `${w} ${s} ${c}`}`
  + ` · ground ${bg} · name ${fontStyle}`;

// THE ANSWER. For one built page: every tile, the five properties resolved, and
// the signature two tiles share when they are drawn the same way.
export function tileLooks(html) {
  const fig = figureOf(html);
  if (!fig) return null;
  const css = html.slice(html.indexOf('<style>') + 7, html.indexOf('</style>'));
  const rules = rulesOf(css);
  const tiles = tilesOf(fig);
  let readRules = 0, stateRules = 0;

  const seenTile = new Set(), seenState = new Set();
  for (const t of tiles) {
    const won = { self: {}, name: {} };          // prop -> { value, spec, order }
    for (const r of rules) {
      const where = target(r.sel, t);
      if (where === null) continue;              // not keyed on the tile
      if (where === 'state') { seenState.add(r.sel); continue; }
      seenTile.add(r.sel);
      if (where === false || where === 'other') continue;
      for (const [prop, value] of r.decls) {
        for (const [p, v] of Object.entries(expand(prop, value))) {
          const slot = where === 'name' ? 'name' : 'self';
          if (slot === 'name' && p !== 'font-style') continue;
          // Rules arrive in source order, so "not beaten on specificity" is the
          // whole of the cascade here: a more specific rule wins, and an
          // equally specific one wins by being later.
          const held = won[slot][p];
          if (!held || !beats(held.spec, r.spec)) won[slot][p] = { value: v, spec: r.spec, order: r.order };
        }
      }
    }
    // `--dg-accent` is set on the tile and read by the stripe, so it resolves
    // before the stripe colour can be compared: a Checkpoint's yellow and a
    // Step's grey are the same declaration with a different custom property.
    const accent = won.self['--dg-accent']?.value;
    const val = (slot, p) => {
      let v = won[slot][p]?.value ?? INITIAL[p];
      if (accent && v.includes('var(--dg-accent)')) v = v.replace('var(--dg-accent)', accent);
      return v;
    };
    t.look = [...SELF_PROPS.map((p) => val('self', p)), ...NAME_PROPS.map((p) => val('name', p))];
    t.sig = t.look.join(' | ');
  }
  readRules = seenTile.size; stateRules = seenState.size;

  // ONE CATEGORY AND ONE SCREEN STATE, ONE LOOK -- and the second half of that
  // was added 2026-09-12 when the fill axis shipped. A tile with a session code
  // is filled and one without is an outline, deliberately, so a category now has
  // two legitimate appearances and grouping by category alone reported `config 2`
  // and `result 2` as defects on every run.
  //
  // THAT IS THE FAILURE §5.1 OF docs/diagram.md RECORDS, CAUGHT EARLY THIS TIME.
  // A figure whose meaning the design has moved past keeps printing numbers and
  // they stop meaning anything; the specimen showed it the moment the variant was
  // drawn, so the metric changes in the commit that changes the design rather
  // than after someone wonders why a green row went red. The invariant is the
  // same one it always was: a reader meeting two tiles in the same category and
  // the same screen state must not be able to tell them apart.
  const byCat = new Map();
  for (const t of tiles) {
    const key = `${t.cat} ${t.hasCode ? 'screen' : 'no-screen'}`;
    if (!byCat.has(key)) byCat.set(key, { tiles: 0, looks: new Set() });
    const e = byCat.get(key); e.tiles++; e.looks.add(t.sig);
  }
  // Colliding by category: tiles that cannot be told from a tile of another
  // category. Scored exactly as the specimen scores it.
  const owners = new Map();
  for (const t of tiles) {
    if (!owners.has(t.sig)) owners.set(t.sig, new Set());
    owners.get(t.sig).add(t.cat);
  }
  return {
    tiles,
    rules: { tile: readRules, state: stateRules, total: rules.length },
    looks: new Set(tiles.map((t) => t.sig)).size,
    perCategory: [...byCat].sort().map(([cat, e]) => ({ cat, tiles: e.tiles, looks: e.looks.size })),
    collidingByCategory: tiles.filter((t) => owners.get(t.sig).size > 1).length,
  };
}

// Run it directly to see one page's tiles and what each resolves to -- the
// surface for arguing with the answer rather than trusting it.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const page = process.argv[2] ?? 'guides/order-to-shipment-overview.html';
  const r = tileLooks(readFileSync(join(ROOT, page), 'utf8'));
  if (!r) { console.log(`${page} carries no diagram`); process.exit(0); }
  console.log(`${page} — ${r.tiles.length} tiles, ${r.rules.tile} tile rules read, `
    + `${r.rules.state} state rules skipped`);
  for (const t of r.tiles)
    console.log(`  ${t.cat.padEnd(7)} ${t.kind.padEnd(9)} ${t.hasCode ? '+code' : '-code'}  ${t.sig}`);
  console.log(`\n  ${r.looks} looks · ${r.perCategory.map((c) =>
    `${c.cat} ${c.looks}`).join(' · ')} look each · ${r.collidingByCategory} colliding by category`);
}
