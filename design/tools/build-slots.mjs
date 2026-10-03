#!/usr/bin/env node
//
// Write data/carbon-slots.json: which NAMED @carbon/icons glyph Carbon draws in
// each icon slot. tools/check-slots.mjs compares our markup against it.
//
// TWO HOPS, because Carbon's React inlines its icons: the DOM holds a path and
// no name. tools/extract/react-dom.js in its `icons` mode records slot →
// drawing across every story and the ICON_STATES recipes, and downloads
// carbon-react-icons.json. This file resolves each drawing to a name against
// the icon files in node_modules/@carbon/icons, by viewBox and geometry.
//
//   node tools/build-slots.mjs <path to carbon-react-icons.json>
//
// A DRAWING THAT IS NOT A CARBON ICON stays unresolved: an illustration, a
// loading ring, the toggle's check. A slot with nothing resolved is not an icon
// slot and is left out. A slot with some resolved keeps its full count in
// `drawings`, so it reads as drawing several things and is never enforced on
// the one that happened to resolve.
//
// The capture keeps at most three stories per drawing, which is the bar
// check-slots enforces at, so `corroboration` tops out at 3.
//
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { geometry } from './build-glyphs.mjs';

const ICONS = 'node_modules/@carbon/icons';
const OUT = 'data/carbon-slots.json';

const input = process.argv[2];
if (!input || !existsSync(input)) {
  console.error('  usage: node tools/build-slots.mjs <path to carbon-react-icons.json>');
  process.exit(1);
}
if (!existsSync(`${ICONS}/svg`)) {
  console.error(`  ${ICONS} is not installed, and the drawings cannot be named without it`);
  process.exit(1);
}

// Every icon file, keyed by what it draws. Several names can share a drawing;
// they are aliases, and the first in alphabetical order answers for all.
const keyOf = (viewBox, geom) => JSON.stringify([viewBox.trim().replace(/\s+/g, ' '), geom]);
const byDrawing = new Map();
let files = 0;
const index = dir => {
  for (const f of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (f.isDirectory()) { index(`${dir}/${f.name}`); continue; }
    if (!f.name.endsWith('.svg')) continue;
    const svg = readFileSync(`${dir}/${f.name}`, 'utf8');
    const viewBox = (svg.match(/viewBox="([^"]+)"/) ?? [])[1];
    if (!viewBox) continue;
    files++;
    const key = keyOf(viewBox, geometry(svg));
    if (!byDrawing.has(key)) byDrawing.set(key, f.name.slice(0, -4));
  }
};
index(`${ICONS}/svg`);

const raw = JSON.parse(readFileSync(input, 'utf8'));
const meta = raw._meta ?? {};
const isState = story => story.includes('@');

const slots = {};
let resolved = 0, unresolved = 0, dropped = 0;
for (const [slot, entry] of Object.entries(raw).sort(([a], [b]) => a.localeCompare(b))) {
  if (slot.startsWith('_')) continue;
  const named = [];
  for (const d of entry.drawings) {
    const name = byDrawing.get(keyOf(d.viewBox, d.geometry));
    if (name) { resolved++; named.push({ name, seen: d.seen }); } else unresolved++;
  }
  if (!named.length) { dropped++; continue; }
  const n = entry.drawings.length;
  const corroboration = named.map(d => d.seen.length);
  const out = {
    kind: entry.kind,
    glyphs: named.map(d => d.name),
    drawings: n,
    corroboration,
    rule: n > 1 ? `${n} different drawings`
      : corroboration[0] >= 3 ? 'one glyph in 3+ stories'
      : `one glyph but only ${corroboration[0]} ${corroboration[0] === 1 ? 'story' : 'stories'}`,
  };
  if (named.length < n) out.unresolved = n - named.length;
  if (named.every(d => d.seen.every(isState))) out.from = 'ICON_STATES';
  slots[slot.split('.').map(c => c.replace(/^cds--/, '')).join('.')] = out;
}

const icons = JSON.parse(readFileSync(`${ICONS}/package.json`, 'utf8')).version;
const result = {
  _meta: {
    what: 'Which named @carbon/icons glyph Carbon draws in each icon slot. Written by '
      + 'tools/build-slots.mjs from the icons-mode capture of tools/extract/react-dom.js; '
      + 'committed so check-slots runs without node_modules.',
    captured: meta.captured ?? null,
    url: meta.url ?? null,
    carbonIcons: icons,
    slots: Object.keys(slots).length,
    notIconSlots: dropped,
    drawingsResolved: resolved,
    drawingsUnresolved: unresolved,
  },
  slots,
};
writeFileSync(OUT, JSON.stringify(result, null, 1) + '\n');
console.log(`  ${OUT} — ${Object.keys(slots).length} slots · ${resolved} drawings named against `
  + `@carbon/icons ${icons} (${files} files) · ${unresolved} unresolved · ${dropped} slots with no icon left out`);
