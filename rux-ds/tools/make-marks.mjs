// make-marks.mjs -- the app icons, derived from brand/logo.svg, and a check
// of brand/favicon.svg, which is its own drawing.
//
// THE DRAWINGS LIVE IN brand/ AND NOT HERE. brand/logo.svg is the mark; rux
// swaps that file and every shell picks it up on reload with no build step.
// This tool reads it and emits what a shell CANNOT get from an <img>: two
// scalable app icons in the colourways a launcher or a store listing needs.
// Swap logo.svg, run `npm run marks`, and these follow. Nothing here holds a
// second copy of the geometry.
//
// THE FAVICON STOPPED BEING DERIVED ON 2026-09-07. Until then this tool wrote
// brand/favicon.svg from the logo's paths. rux then redrew the mark edge to
// edge for the tab strip, filling the 16-pixel grid where the logo keeps one
// cell of air, so the favicon is a second drawing and a second file a person
// edits, owned exactly like the logo. This tool now reads it and checks it,
// section 2 below, and writes nothing to it.
//
// WHY THIS REPLACED A MODULE MAP. Until 2026-09-05 this file WAS the drawing:
// an 11x10 ASCII grid traced from a Linearity export, with three layers and
// per-variant colour rules. That made it the single source, which was right
// while nothing else held the mark -- and wrong the moment brand/logo.svg
// became the file a person edits. Two sources drift; the older one wins by
// accident. So the grid is gone and the reader is the whole tool.
//
// Run: npm run marks  (node tools/make-marks.mjs, from the repo root --
//      the output paths are relative to cwd)

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const SRC = 'brand/logo.svg';
const src = readFileSync(SRC, 'utf8');

// The mark is axis-aligned rectangles written as <path d="...Z"/>. Take the d=
// strings VERBATIM: this tool never reparses or re-emits coordinates, so it
// cannot round, reorder or otherwise quietly redraw what rux drew.
const paths = [...src.matchAll(/<path d="([^"]+)"\s*\/>/g)].map((m) => m[1]);
const viewBox = src.match(/viewBox="([^"]+)"/)?.[1];
if (!paths.length || !viewBox) {
  console.error(`${SRC}: no <path d="..."/> or no viewBox. If the mark was`);
  console.error('redrawn with <rect>, <polygon> or a transform, this tool must');
  console.error('be taught that shape rather than guessing at it.');
  process.exit(1);
}

// Carbon tokens, read from @carbon/themes. TWO VALUES, AND THAT IS THE BRAND
// RULE: the mark is neutral, never coloured. rux decided this on 2026-09-05
// after seeing the blue favicon live -- black and white or neutral greys, the
// same off-white the header already uses, and nothing else to keep in step.
const INK   = '#161616';  // gray-100 -- the mark on a LIGHT surface (18.10 on #ffffff)
const PAPER = '#f4f4f4';  // gray-10  -- the mark on a DARK surface  (16.45 on #161616)

// TWO ICONS, not four. The old set crossed (surface) x (mono | brand); with
// the brand rule above there is no blue arm left, so light-blue and dark-blue
// would have been byte-identical to their mono twins. Two files that differ is
// better than four where two are duplicates nobody can tell apart.
//
// Contrast is against the surface each name is FOR, not against white in both.
const VARIANTS = {
  light: { fill: INK,   on: '#ffffff', ratio: '18.10' },
  dark:  { fill: PAPER, on: INK,       ratio: '16.45' },
};

// GUARD, not a parser. A "--" inside an XML comment is illegal, and the SVG
// it produces serves 200 OK and renders 0x0 -- invisible in a network tab and
// invisible in the markup. That has now shipped twice: from brand/logo.svg on
// 2026-09-04 and from this file's own icon comment on 2026-09-05. Reasoning
// about it caught neither; only opening the page did. So it is checked here.
//
// It checks THAT ONE FAULT and says so. Node ships no DOMParser and this
// repository vendors no library to get one, so this is not well-formedness in
// general -- an unclosed tag would still get past it.
function assertNoDoubleHyphen(name, svg) {
  for (const m of svg.matchAll(/<!--([\s\S]*?)-->/g)) {
    if (m[1].includes('--') || m[1].endsWith('-')) {
      console.error(`${name}: "--" inside an XML comment, or a comment ending in "-".`);
      console.error('Illegal XML. The file will serve 200 OK and render 0x0.');
      console.error(`  ${m[0].slice(0, 120).replace(/\n/g, ' ')}`);
      process.exit(1);
    }
  }
}

const A11Y = 'role="img" aria-label="Rux"';
const body = paths.map((d) => `<path d="${d}"/>`).join('\n');

mkdirSync('assets/brand', { recursive: true });
const emit = (name, svg) => {
  const out = svg.replace(/\n{2,}/g, '\n').trim() + '\n';
  assertNoDoubleHyphen(`assets/brand/${name}`, out);
  writeFileSync(`assets/brand/${name}`, out);
  console.log(`  assets/brand/${name}`);
};

// ------------------------------------------------------------- 1. app icons
// The canvas is the drawing's own, untouched: nothing to scale, no origin to
// compute, and no chance of the 1.10x stretch the old hand exports had.
// Transparent ground: a launcher supplies its own.
//
// THE MARGIN IS GONE SINCE 2026-09-07. Until then rux centred the mark with
// one cell of air on every side, inside the 28-of-32 safe area an icon wants.
// The dachshund fills all 16 columns, so these icons bleed left and right and
// a launcher mask can clip the tail and the muzzle. rux took that knowingly
// and will adapt the drawing to a padded brand size. This tool copies
// whatever brand/logo.svg holds and checks nothing about its bounds, then or
// now: the margin was never enforced here, only described.
for (const [name, { fill, on, ratio }] of Object.entries(VARIANTS)) {
  emit(`icon-${name}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="${fill}" ${A11Y}>
<title>Rux</title>
<!-- ${fill} on ${on}, ${ratio}:1. Generated from ${SRC} by tools/make-marks.mjs.
     Edit that file, not this one. -->
${body}
</svg>`);
}

// ------------------------------------------------- 2. favicon, checked only
// NOT WRITTEN HERE since 2026-09-07; see the header. brand/favicon.svg is a
// hand-owned drawing, and what this tool still owes it is the guard above,
// because the fault it catches shipped from a hand-edited SVG on 2026-09-04,
// plus one check the file's job demands: the light/dark swap. A favicon gets
// no CSS from the page, so the swap lives inside the file, gray-100 on a
// light tab strip and gray-10 on a dark one, and a browser that ignores the
// media query keeps the light value. A favicon that lost its <style> would
// serve 200 OK and paint one colour on both tab strips, and no other gate
// reads the file. It stays in brand/, NOT assets/brand/: brand/ is what a
// project owns and may replace, assets/brand/ is rux-ds's own generated set.
const FAV = 'brand/favicon.svg';
const fav = readFileSync(FAV, 'utf8');
assertNoDoubleHyphen(FAV, fav);
const favPaths = [...fav.matchAll(/<path d="([^"]+)"\s*\/>/g)];
const favViewBox = fav.match(/viewBox="([^"]+)"/)?.[1];
if (!favPaths.length || !favViewBox) {
  console.error(`${FAV}: no <path d="..."/> or no viewBox.`);
  process.exit(1);
}
const swap = [`svg{fill:${INK}}`, `@media (prefers-color-scheme:dark){svg{fill:${PAPER}}}`];
for (const rule of swap) {
  if (!fav.includes(rule)) {
    console.error(`${FAV}: missing the light/dark swap rule ${rule}`);
    console.error('A favicon gets no CSS from the page; the swap has to be in the file.');
    process.exit(1);
  }
}
console.log(`  ${FAV}  checked, not written: ${favPaths.length} shapes, viewBox ${favViewBox}`);

// ------------------------------------------------------- 3. the app tile icon
// brand/icon.svg -- the 32px silhouette the hub's grid draws for THIS app,
// named in switcher.json by absolute path (`/rux-ds/brand/icon.svg`).
// brand/README.md "App tile icons" is the spec; this is rux-ds's own.
//
// GENERATED, NOT DRAWN A THIRD TIME. logo.svg and favicon.svg already carry
// the same 114 cells and the file itself says they are "kept identical by
// hand, and nothing enforces it". A third hand-kept copy is the drift this
// tool's own header was written to argue against, and the tile needs no new
// geometry: the mark already has one cell of air on every side, which is
// exactly what the tile spec asks for.
//
// IT CARRIES NO COLOUR AND NO LABEL, and both absences are the design. The
// tile uses this file as a CSS mask over its own text colour, so every colour
// inside is discarded and only the alpha is read -- a fill would be ignored,
// and a <style> block like the favicon's would be ignored too. It is fetched
// through url() in a mask, never parsed as a document, so a title or
// aria-label could not reach the accessibility tree; the tile's own text is
// the name, and the span is decorative. Default fill is opaque black, which
// is alpha 1 everywhere the mark is drawn.
//
// A CONSUMER SWAPS THIS FILE BY HAND, as it does logo.svg and favicon.svg.
// This tool is rux-ds's and is not vendored, so it writes rux-ds's own icon
// and nothing else. That is why the output lands in brand/ rather than
// assets/brand/: brand/ is what a project owns and replaces.
const ICON = 'brand/icon.svg';
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
<!-- The app tile icon, generated from ${SRC} by tools/make-marks.mjs.
     Edit that file, not this one. Drawn as a CSS mask over the tile's text
     colour, so this file's own colours are discarded and only its alpha is
     read; that is why it carries no fill and no title. brand/README.md,
     "App tile icons", is the spec. -->
${body}
</svg>`.replace(/\n{2,}/g, '\n').trim() + '\n';
assertNoDoubleHyphen(ICON, iconSvg);
writeFileSync(ICON, iconSvg);
console.log(`  ${ICON}  the tile mask, from ${SRC}`);

console.log(`\n  ${paths.length} shapes read from ${SRC}, viewBox ${viewBox}`);
console.log('  Geometry copied verbatim. Swap brand/logo.svg and re-run to follow it.');
console.log('  The favicon is its own drawing; swap brand/favicon.svg directly.');
