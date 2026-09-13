#!/usr/bin/env node
// inline-sprite.mjs -- pastes Design's icon sprite into pages between their
// SPRITE markers, because a <use> pointing at another file draws nothing in
// Safari or over file://.
//
//   node tools/inline-sprite.mjs                  the site's own pages: /, account/, scheduler/
//   node tools/inline-sprite.mjs --check          fail if any of them carries an old sprite
//   node tools/inline-sprite.mjs <page.html> ...  exactly these pages; Notes' build passes its own
//
// Design's templates and root pages are refreshed by `npm run icons` in design/.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DS = resolve(ROOT, process.env.DS ?? 'design');
const BEGIN = /<!-- SPRITE:BEGIN[\s\S]*?-->\n/;
const END = '<!-- SPRITE:END -->';
const SITE_DIRS = ['.', 'account', 'scheduler'];

const args = process.argv.slice(2);
const check = args.includes('--check');
const named = args.filter(a => a !== '--check');
const pages = named.length
  ? named.map(p => resolve(p))
  : SITE_DIRS.flatMap(d => {
    const at = join(ROOT, d);
    return existsSync(at) ? readdirSync(at).filter(f => f.endsWith('.html')).map(f => join(at, f)) : [];
  });

const svg = readFileSync(join(DS, 'assets/icons.svg'), 'utf8').replace(/^<\?xml[^>]*\?>\s*/, '').trim();
const symbols = (svg.match(/<symbol/g) ?? []).length;
let stale = 0, written = 0, unmarked = 0;
for (const path of pages) {
  const name = path.startsWith(ROOT) ? path.slice(ROOT.length + 1) : path;
  const html = readFileSync(path, 'utf8');
  const begin = html.match(BEGIN);
  const endAt = html.indexOf(END);
  if (!begin || endAt < begin.index) {
    console.log(`  ${name} — no SPRITE markers, left alone`);
    if (named.length) unmarked++;
    continue;
  }
  const next = html.slice(0, begin.index + begin[0].length) + svg + '\n' + html.slice(endAt);
  if (next === html) { console.log(`  ${name} — current`); continue; }
  stale++;
  if (check) { console.log(`  ${name} — STALE against design/assets/icons.svg`); continue; }
  writeFileSync(path, next);
  written++;
  console.log(`  ${name} — rewritten`);
}
if (check && stale) {
  console.log(`\n  ${stale} page(s) carry an old sprite. Run: node tools/inline-sprite.mjs`);
  process.exit(1);
}
console.log(`\n  ${written} page(s) rewritten from Design's sprite (${symbols} symbols)`);
if (unmarked) process.exit(1);
