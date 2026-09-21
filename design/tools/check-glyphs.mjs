#!/usr/bin/env node
//
// Does a sprite symbol DRAW the glyph its name claims?
//
// THE DEFECT CLASS THIS BELONGS TO, and the one case of it this does NOT catch.
// Three icon defects have shipped here past every other gate: two chevrons
// rotated from the wrong base glyph, and on 2026-08-29 a table sort arrow built
// from i-arrow--down where Carbon draws ArrowUp and rotates it for descending,
// so both sort states pointed the wrong way. Every one of them was invisible to
// check-icons, which asks whether a <use> RESOLVES and never what it resolves to.
//
// That family has two halves and this file is only the first:
//
//   A. the symbol is not the glyph its name says      <- this gate
//   B. the right glyph, referenced in the wrong slot  <- NOT this gate
//
// THE SORT ARROW WAS B. `i-arrow--down` is a faithful copy of Carbon's
// arrow--down; nothing about the sprite was wrong. What was wrong is that the
// sort slot wants arrow--up. Answering B needs to know which NAMED icon Carbon
// renders into each slot, and no capture in docs/ records that — the trees hold
// classes and structure, and svg children are recorded without their path data.
// It is a separate capture and a separate gate, and saying so here is the point:
// a green run of this file is not evidence that the icons are right.
//
// B IS FEASIBLE, AND THE THREE PIECES WERE PROVEN ON 2026-08-29 BEFORE THIS FILE
// WAS COMMITTED, so whoever picks it up is not starting from a guess:
//
//   1. The SLOT is identifiable. An svg's own `cds--*` classes, or the nearest
//      classed ancestor's when it has none, gives a stable key —
//      `cds--table-sort__icon` came back identical on all five columns of
//      components-datatable-sorting--default.
//   2. The captured drawing RESOLVES TO A NAME offline. Indexing the 2,828 files
//      in @carbon/icons by size+geometry yields 2,823 distinct keys; the sort
//      slot's path resolved to `arrow--up` and the unsorted slot's to
//      `arrows--vertical`, which are exactly right.
//   3. The 5 collisions are ALIASES, not ambiguity — asleep/moon,
//      close--outline/misuse--outline and three more are one drawing Carbon
//      ships under two names. A slot whose glyph is one of those should accept
//      either, and that set is derived from the package rather than maintained
//      by hand, so it is not an allow-list.
//
// What is left is the capture itself: a fourth mode in tools/extract/react-dom.js
// alongside stories/states/spacing, recording slot -> geometry per story, then a
// gate comparing our `<use href="#i-name">` per slot against the resolved name.
//
// WHAT IT IS EVIDENCE FOR. A hand-edited path, a symbol renamed without its
// drawing being changed, a glyph pasted from the wrong size, an optimiser run
// over assets/icons.svg that moved a coordinate — all of those are real ways a
// sprite drifts from Carbon, and all of them are silent everywhere else. The
// sprite is 59 symbols of raw path data that nobody reads.
//
// SIZE IS PART OF THE IDENTITY, not a detail. Carbon draws each icon separately
// at 16, 20, 24 and 32 rather than scaling one path, so arrow--up at 32 begins
// `M16 4` and at 16 begins `M3.7 6.7`. Comparing across sizes would report
// mismatches for glyphs that are correct, so the snapshot is keyed name@size and
// a symbol is only ever compared with Carbon's drawing at its own viewBox.
//
// THE REFERENCE IS data/carbon-glyphs.json, NOT node_modules. Phase 4 removes
// @carbon/icons, and a gate that dies at devendor is one that gets deleted at
// devendor. tools/build-glyphs.mjs regenerates the snapshot; this only ever reads it,
// and treats a symbol with no entry as a finding rather than a skip — a name
// Carbon has no file for is a name we invented.
//
//   node tools/check-glyphs.mjs
//
import { readFileSync } from 'node:fs';
import { geometry, spriteSymbols } from './build-glyphs.mjs';

/* ONE SNAPSHOT PER PUBLISHED FAMILY, and each symbol is compared with its own
   publisher's drawing. The drawings in assets/icons-rux/ have no publisher, so
   they are counted and skipped -- and said aloud below, because a family
   nothing checks has to be named rather than quietly passed over. */
const SNAPSHOTS = {
  carbon: { file: 'data/carbon-glyphs.json', of: 'Carbon' },
  material: { file: 'data/material-glyphs.json', of: 'Material' },
};
const loaded = Object.fromEntries(Object.entries(SNAPSHOTS)
  .map(([family, s]) => [family, JSON.parse(readFileSync(s.file, 'utf8')).glyphs]));

const wrong = [], unknown = [];
let checked = 0, ours = 0;

for (const sym of spriteSymbols()) {
  if (!SNAPSHOTS[sym.family]) { ours++; continue; }
  const key = `${sym.name}@${sym.size}`;
  const ref = loaded[sym.family][key];
  if (!ref) { unknown.push(`${sym.family} ${key}`); continue; }
  checked++;
  if (JSON.stringify(sym.geometry) === JSON.stringify(ref.geometry)) continue;
  wrong.push({ key, of: SNAPSHOTS[sym.family].of, ours: sym.geometry, theirs: ref.geometry, source: ref.source });
}

for (const { key, of, ours: mine, theirs, source } of wrong) {
  console.log(`\n  ${key}`);
  console.log(`     ours      ${mine.join('\n               ') || '(nothing drawn)'}`);
  console.log(`     ${of.padEnd(9)} ${theirs.join('\n               ') || '(nothing drawn)'}`);
  console.log(`     ${source}`);
}
for (const key of unknown) {
  console.log(`\n  ${key}`);
  console.log('     no entry in its snapshot — regenerate with `node tools/build-glyphs.mjs`,');
  console.log('     and if the package still has no file for it, the name is invented');
}

const faults = wrong.length + unknown.length;
console.log(`\n  ${checked} symbols checked against their publisher · ${wrong.length} drawing a different glyph`
  + ` · ${unknown.length} not in a snapshot`
  + (ours ? ` · ${ours} drawn here, which nothing checks` : ''));
if (!faults) console.log('  this says the sprite is faithful; it does NOT say each icon is in the right slot');
console.log();
process.exit(faults ? 1 : 0);
