#!/usr/bin/env node
//
// Snapshot the GEOMETRY of every glyph our sprite claims, from @carbon/icons.
//
// WHY A SNAPSHOT AND NOT A DIRECT READ. check-glyphs could open
// node_modules/@carbon/icons on every run, and for as long as the package is
// vendored that would be simpler. Devendoring would remove it,
// and a gate that dies at devendor is a gate that gets deleted at devendor. The
// captures in docs/ exist for exactly this reason; this file joins them.
//
// WHAT IS RECORDED, and it is deliberately narrow: only the names our sprite
// already carries. @carbon/icons ships thousands, and a snapshot of all of them
// would be a vendored copy of the package wearing a different hat. This records
// the reference for what we actually claim, which is the only thing a gate can
// ask about.
//
// GEOMETRY, NOT THE FILE. Carbon's svg wrapper carries xmlns and viewBox that
// say nothing about the shape, and our sprite rewrites both into <symbol>. What
// must match is the drawing: every geometry child in order, with its attributes
// sorted so attribute order cannot fail a comparison it has no business
// failing.
//
// THE SIZE IS PART OF THE IDENTITY. Carbon does not scale one path to four
// sizes — 16, 20, 24 and 32 are separately drawn, and arrow--up at 32 starts
// `M16 4` where at 16 it starts `M3.7 6.7`. A snapshot keyed by name alone
// would compare a glyph against a different drawing of the same idea and call
// it a mismatch. Keyed by name AND viewBox size, it compares like with like.
//
// Some icons have no size variants at all and live at svg/<name>.svg. They are
// not a special case to work around — they are simply where Carbon keeps a
// glyph it draws once, and the lookup tries the sized path first and falls back.
//
//   node tools/build-glyphs.mjs          write data/carbon-glyphs.json
//   node tools/build-glyphs.mjs --check  exit 1 if the snapshot is out of date
//
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const SPRITE = 'assets/icons.svg';
/* ONE SNAPSHOT PER PUBLISHED FAMILY. The sprite holds three -- Carbon's, from
   @carbon/icons; Material's, from @material-symbols/svg-400/sharp; and the
   drawings in assets/icons-rux/, which have no publisher to be faithful to and
   so have no snapshot and no gate. A family added here without a snapshot
   would be a family nothing checks, which this file's own header calls the
   worse of the two failures. */
const PUBLISHED = {
  carbon: {
    out: 'data/carbon-glyphs.json',
    pkg: 'node_modules/@carbon/icons',
    // Sized first, then the unsized glyph file: Carbon draws 16, 20 and 32
    // separately and a name must be compared with the drawing at ITS size.
    find: (pkg, name, size) =>
      [`${pkg}/svg/${size}/${name}.svg`, `${pkg}/svg/${name}.svg`],
  },
  material: {
    out: 'data/material-glyphs.json',
    pkg: 'node_modules/@material-symbols/svg-400',
    // One drawing per name, at the style and weight icon-map.mjs pins.
    find: (pkg, name) => [`${pkg}/sharp/${name}.svg`],
  },
};

// The elements that DRAW. Anything else in an icon file — <title>, <defs>, a
// stray comment — describes it rather than draws it, and comparing those would
// fail on Carbon's own metadata churn.
const GEOMETRY = /<(path|circle|rect|polygon|polyline|ellipse|line)\b([^>]*)\/?>/g;

// Attributes sorted, whitespace collapsed: two files that draw the same shape
// must compare equal even when one writes `d` before `fill` and the other after.
export function geometry(svg) {
  const out = [];
  for (const [, tag, attrs] of svg.matchAll(GEOMETRY)) {
    const pairs = [...attrs.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)]
      .map(([, k, v]) => [k, v.replace(/\s+/g, ' ').trim()])
      .filter(([k]) => k !== 'xmlns')
      .sort(([a], [b]) => a.localeCompare(b));
    out.push(tag + '|' + pairs.map(([k, v]) => `${k}=${v}`).join(' '));
  }
  return out;
}

// [{ family, name, size, geometry }] for every symbol the sprite defines. The
// prefix says which family a symbol belongs to and so which snapshot answers
// for it; reading only `i-` here would leave the others unchecked and silent.
const OF_FAMILY = { 'i-': 'carbon', 'm-': 'material', 'r-': 'rux' };
export function spriteSymbols(src = readFileSync(SPRITE, 'utf8')) {
  const out = [];
  for (const [, prefix, id, vb, body] of src.matchAll(
    /<symbol id="(i-|m-|r-)([^"]+)"[^>]*viewBox="([^"]+)"[^>]*>([\s\S]*?)<\/symbol>/g)) {
    const size = vb.trim().split(/\s+/)[2];   // "0 0 16 16" -> "16"
    out.push({ family: OF_FAMILY[prefix], name: id, size, geometry: geometry(body) });
  }
  return out;
}

// A family's own drawing of a name. Null when it has none, which is a finding
// rather than a fallback — a name we invented.
function published(family, name, size) {
  const spec = PUBLISHED[family];
  if (!spec) return null;
  for (const p of spec.find(spec.pkg, name, size)) {
    if (existsSync(p)) return { path: p, geometry: geometry(readFileSync(p, 'utf8')) };
  }
  return null;
}

function build(family) {
  const glyphs = {};
  const absent = [];
  for (const sym of spriteSymbols()) {
    if (sym.family !== family) continue;
    const found = published(family, sym.name, sym.size);
    if (!found) { absent.push(`${sym.name}@${sym.size}`); continue; }
    glyphs[`${sym.name}@${sym.size}`] =
      { name: sym.name, size: sym.size, source: found.path, geometry: found.geometry };
  }
  return { glyphs, absent };
}

// RUN ONLY AS A COMMAND. check-glyphs imports geometry() and spriteSymbols()
// from here, and while this ran at import time that import REGENERATED the
// snapshot the gate then compared against — a check that rewrites its own
// reference can never fail. Caught on the gate's first run, when it printed this
// file's output before its own.
if (import.meta.url !== pathToFileURL(process.argv[1]).href) {
  // imported: exports only, no side effects
} else main();

function main() {
const checking = process.argv.includes('--check');
let stale = 0, total = 0;
console.log();
for (const [family, spec] of Object.entries(PUBLISHED)) {
  const { glyphs, absent } = build(family);
  const snapshot = {
    _: `${family}'s own drawing of every glyph assets/icons.svg claims from it, keyed `
      + 'name@size. Generated by tools/build-glyphs.mjs and committed so check-glyphs '
      + 'survives the package being removed, which is the normal state -- neither is a '
      + 'dependency. Regenerate only when the sprite gains a symbol or the package is '
      + 'upgraded, never to make a gate pass.',
    version: JSON.parse(readFileSync(`${spec.pkg}/package.json`, 'utf8')).version,
    glyphs,
  };
  const fresh = JSON.stringify(snapshot, null, 2) + '\n';
  total += Object.keys(glyphs).length;

  if (checking) {
    if ((existsSync(spec.out) ? readFileSync(spec.out, 'utf8') : '') !== fresh) {
      console.error(`  ${spec.out} is out of date — run \`node tools/build-glyphs.mjs\``);
      stale++;
    }
    continue;
  }
  writeFileSync(spec.out, fresh);
  console.log(`  ${spec.out} — ${Object.keys(glyphs).length} glyphs from ${spec.pkg.replace('node_modules/', '')} ${snapshot.version}`);
  if (absent.length) console.log(`    ${absent.length} the package has no file for: ${absent.join(', ')}`);
}
/* The drawings here answer to nobody, so they are counted and not snapshotted.
   Saying so is the point: a family nothing checks must be named, not omitted. */
const ours = spriteSymbols().filter(s => s.family === 'rux').length;
if (ours) console.log(`  ${ours} drawn in assets/icons-rux/ — ours, so no snapshot and no gate`);
if (checking && !stale) console.log(`  glyph snapshots current · ${total} glyphs`);
console.log();
process.exit(stale ? 1 : 0);
}
