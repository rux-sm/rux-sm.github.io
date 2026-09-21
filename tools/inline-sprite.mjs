#!/usr/bin/env node
// inline-sprite.mjs -- pastes Design's icon sprite into pages between their
// SPRITE markers, because a <use> pointing at another file draws nothing in
// Safari or over file://.
//
// EACH PAGE CARRIES ONLY WHAT IT NAMES, by reading the literal icon names out
// of its markup and the scripts it loads -- see design/tools/lib/icon-scan.mjs
// for what counts and why that is safe. A Notes page named four icons and
// carried 78. `--check` therefore fails a page two ways: carrying a symbol
// Design has since redrawn, or naming one it does not carry at all.
//
//   node tools/inline-sprite.mjs                  the site's own pages: /, account/, login/, scheduler/, scheduler/share/
//   node tools/inline-sprite.mjs --check          fail if any of them carries an old sprite
//   node tools/inline-sprite.mjs <page.html> ...  exactly these pages; Notes' build passes its own
//
// Design's templates and root pages are refreshed by `npm run icons` in design/.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DS = resolve(ROOT, process.env.DS ?? 'design');
const BEGIN = /<!-- SPRITE:BEGIN[\s\S]*?-->\n/;
const END = '<!-- SPRITE:END -->';
const SITE_DIRS = ['.', 'account', 'login', 'oauth/consent', 'scheduler', 'scheduler/share'];

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
/* A PAGE CARRIES WHAT IT NAMES. Design owns the scanner, because it owns the
   sprite; this reads it from whichever Design `DS` points at, as it already
   reads the sprite from there. */
const { symbolsFor, subset } = await import(
  pathToFileURL(join(DS, 'tools/lib/icon-scan.mjs')).href);
let stale = 0, written = 0, unmarked = 0, carried = 0;
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
  const wants = symbolsFor(path, ROOT);
  const mine = subset(svg, wants);
  carried += (mine.match(/<symbol/g) ?? []).length;
  const next = html.slice(0, begin.index + begin[0].length) + mine + '\n' + html.slice(endAt);
  if (next === html) { console.log(`  ${name} — current`); continue; }
  stale++;
  if (check) {
    /* A block is stale for two reasons now, and they read differently: a
       symbol Design redrew, or one this page started naming and does not
       carry. The second is the one that draws nothing, so it is named. */
    const has = new Set([...html.matchAll(/<symbol id="([^"]+)"/g)].map(m => m[1]));
    const missing = wants.filter(n => !has.has(n));
    console.log(missing.length
      ? `  ${name} — names ${missing.join(', ')} and carries none of them`
      : `  ${name} — STALE against design/assets/icons.svg`);
    continue;
  }
  writeFileSync(path, next);
  written++;
  console.log(`  ${name} — rewritten`);
}
if (check && stale) {
  console.log(`\n  ${stale} page(s) carry a sprite that is not theirs. Run: node tools/inline-sprite.mjs`);
  process.exit(1);
}
console.log(`\n  ${written} page(s) rewritten from Design's sprite (${symbols} symbols, ${carried} carried across ${pages.length} page(s))`);
if (unmarked) process.exit(1);
