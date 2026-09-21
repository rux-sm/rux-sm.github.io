#!/usr/bin/env node
// swap-icons.mjs -- move an app from one icon family to another.
//
// An app draws from ONE family. Which one is a decision taken once, and this
// is how it is carried out: every icon reference in the app's own files is
// rewritten through design/tools/lib/icon-map.mjs, the sheet that says which
// drawing is which idea. Going back is the same command with the other family.
//
//   node tools/swap-icons.mjs scheduler --to material
//   node tools/swap-icons.mjs scheduler --to carbon
//   node tools/swap-icons.mjs scheduler --to material --dry
//
// IT REWRITES REFERENCES, NOT SPRITES. Run `node tools/inline-sprite.mjs`
// afterwards so each page carries the symbols it now names; `npm run check`
// fails until you do, which is the gate doing its job.
//
// A REFERENCE IS `#<prefix><name>` and nothing else -- the sprite's own
// `id="i-…"` carries no hash, so a page's inlined block is never touched.
//
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DS = resolve(ROOT, process.env.DS ?? 'design');
const { ICONS, PREFIX, FAMILIES, rowOf } =
  await import(pathToFileURL(join(DS, 'tools/lib/icon-map.mjs')).href);

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const to = args[args.indexOf('--to') + 1];
const app = args.find(a => !a.startsWith('--') && a !== to);

if (!app || !FAMILIES.includes(to)) {
  console.error(`\n  usage: node tools/swap-icons.mjs <app> --to <${FAMILIES.join('|')}> [--dry]\n`);
  process.exit(1);
}

const nameIn = (family, row) => family === 'carbon' ? row : ICONS[row]?.[family] ?? null;
const files = (function walk(at) {
  return readdirSync(at).flatMap(f => {
    const p = join(at, f);
    if (statSync(p).isDirectory()) return f.startsWith('.') ? [] : walk(p);
    return /\.(html|js)$/.test(f) ? [p] : [];
  });
})(join(ROOT, app));

const ANY = new RegExp(`#(${Object.values(PREFIX).join('|')})([a-z0-9_-]+)`, 'g');
let touched = 0, swapped = 0;
const unknown = new Set(), missing = new Set();

for (const path of files) {
  const before = readFileSync(path, 'utf8');
  const after = before.replace(ANY, (whole, prefix, name) => {
    const from = Object.keys(PREFIX).find(f => PREFIX[f] === prefix);
    if (from === to) return whole;
    const row = rowOf(from, name);
    if (!row) { unknown.add(`${prefix}${name}`); return whole; }
    const want = nameIn(to, row);
    if (!want) { missing.add(`${row} has no ${to} drawing`); return whole; }
    swapped++;
    return `#${PREFIX[to]}${want}`;
  });
  if (after === before) continue;
  touched++;
  if (!dry) writeFileSync(path, after);
  console.log(`  ${path.slice(ROOT.length + 1)}`);
}

for (const n of unknown) console.log(`  NOT ON THE SHEET, left alone: ${n}`);
for (const m of missing) console.log(`  ${m}, left alone`);
console.log(`\n  ${swapped} reference(s) in ${touched} file(s) → ${to}${dry ? ' (dry run, nothing written)' : ''}`);
if (!dry && swapped) console.log('  now run: node tools/inline-sprite.mjs\n');
process.exit(unknown.size || missing.size ? 1 : 0);
