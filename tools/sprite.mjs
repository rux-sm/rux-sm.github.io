#!/usr/bin/env node
//
// Re-inlines the vendored sprite into every page this repository serves.
//
// ADAPTED FROM rux-scheduler's tools/sprite.mjs, 2026-09-09, for the same
// reason it exists there: WebKit has never supported a cross-document <use>,
// so every page pastes the sprite rather than pointing at the file, and a pin
// move rewrites vendor/rux-ds/ while deliberately leaving pages alone. An app
// that moves to a tag carrying new icons keeps the old paste, and nothing
// notices -- the shared check asks whether every inlined symbol is SOMEWHERE
// in what rux-ds ships, never that the paste is CURRENT and complete.
//
// FOUND HERE FIRST, 2026-08-31 through 2026-09-09: both pages once carried an
// unreleased glyph pasted from rux-ds's working tree rather than a tag
// (fixed at hub 7cfbf43), the mirror image of this tool's problem -- a page
// can carry a symbol NEWER than the pin just as easily as one OLDER than it,
// and nothing before this file caught either direction by running a command.
//
// PAGES ARE NAMED, NOT WALKED. index.html at the root, and every .html
// under account/ -- the two places this repository has ever put a page,
// confirmed 2026-09-09. A recursive walk would also be correct today; naming
// the set is what rux-ds's own npm run icons does for templates/, and it
// means a future private or staging folder is not swept by accident.
//
//   node tools/sprite.mjs            rewrite each page's SPRITE block
//   node tools/sprite.mjs --check    exit 1 if any page is out of date
//
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');

const sprite = readFileSync(join(root, 'vendor/rux-ds/assets/icons.svg'), 'utf8').trim();
const BEGIN = /<!-- SPRITE:BEGIN[\s\S]*?-->\n/;
const END = '<!-- SPRITE:END -->';

const pages = [
  ...readdirSync(root).filter(f => f.endsWith('.html')),
  ...(existsSync(join(root, 'account')) ? readdirSync(join(root, 'account')).filter(f => f.endsWith('.html')).map(f => `account/${f}`) : []),
];

let stale = 0, written = 0;
for (const file of pages) {
  const path = join(root, file);
  const html = readFileSync(path, 'utf8');
  const begin = html.match(BEGIN);
  const endAt = html.indexOf(END);
  if (!begin || endAt < 0) { console.log(`  ${file} — no SPRITE block, left alone`); continue; }
  const head = html.slice(0, begin.index + begin[0].length);
  const tail = html.slice(endAt);
  const next = head + sprite + '\n' + tail;
  if (next === html) { console.log(`  ${file} — current`); continue; }
  stale++;
  if (check) { console.log(`  ${file} — STALE against vendor/rux-ds/assets/icons.svg`); continue; }
  writeFileSync(path, next);
  written++;
  console.log(`  ${file} — rewritten`);
}

if (check && stale) {
  console.log(`\n  ${stale} page(s) carry a sprite older than the pin. Run: node tools/sprite.mjs`);
  process.exit(1);
}
console.log(`\n  ${written} page(s) rewritten from the pinned sprite (${(sprite.match(/<symbol/g) ?? []).length} symbols)`);
