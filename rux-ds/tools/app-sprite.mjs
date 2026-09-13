#!/usr/bin/env node
//
// RE-INLINE THIS REPOSITORY'S SPRITE INTO A CONSUMING APP'S PAGES. Imported
// by an app's own tools/sprite.mjs, the way tools/app-check.mjs is imported
// by its tools/check.mjs -- the app names its page directories, this file
// holds the rule.
//
// WHY A PAGE PASTES THE SPRITE rather than pointing <use> at the file: WebKit
// has never supported a cross-document <use>, and the failure is silent -- a
// fully styled page with empty boxes where the icons were. `npm run icons`
// says the same and refreshes this repository's own pages for that reason.
//
// WHY IT MUST BE RE-RUN: a release can change the sprite while a consuming
// page keeps the paste it was written with. The shared check asks whether
// every inlined symbol is SOMEWHERE in what rux-ds ships, never whether the
// paste is CURRENT and complete. `--check` is what asks that.
//
// WRITTEN 2026-09-11, FROM TWO COPIES THAT HAD ALREADY SPLIT. rux-scheduler
// wrote this on 2026-09-09; rux-sm.github.io copied it on 2026-09-10 and its
// header said so. The only behavioural difference between them was WHICH
// directories were scanned, so that is the one thing this takes as an
// argument and everything else is shared. Measured before the merge: both
// printed "0 page(s) rewritten ... (63 symbols)" and both still do.
//
// IT IS NOT rux-ln-notes's inline-sprite.mjs AND DOES NOT REPLACE IT. That
// one takes file paths from a generator, fails closed when a page carries no
// markers, and has no --check: a generated page missing its markers is a bug
// in the generator, not a page to leave alone. Different job, deliberately
// not merged here.
//
// A PAGE WITHOUT MARKERS IS LEFT ALONE, not an error. An app may hold a mock
// or a specimen that carries no shell.
//
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const BEGIN = /<!-- SPRITE:BEGIN[\s\S]*?-->\n/;
const END = '<!-- SPRITE:END -->';

// root: the app's own directory. dirs: which folders under it hold pages,
// '.' being the root itself. check: report staleness and write nothing.
export function sprite({ root, ds, dirs = ['.'], check = false }) {
  const svg = readFileSync(join(ds, 'assets/icons.svg'), 'utf8').trim();
  const pages = dirs.flatMap(d => {
    const at = d === '.' ? root : join(root, d);
    if (!existsSync(at)) return [];
    return readdirSync(at).filter(f => f.endsWith('.html')).map(f => (d === '.' ? f : `${d}/${f}`));
  });

  let stale = 0, written = 0;
  for (const file of pages) {
    const path = join(root, file);
    const html = readFileSync(path, 'utf8');
    const begin = html.match(BEGIN);
    const endAt = html.indexOf(END);
    if (!begin || endAt < 0) { console.log(`  ${file} — no SPRITE block, left alone`); continue; }
    const next = html.slice(0, begin.index + begin[0].length) + svg + '\n' + html.slice(endAt);
    if (next === html) { console.log(`  ${file} — current`); continue; }
    stale++;
    if (check) { console.log(`  ${file} — STALE against ${ds}/assets/icons.svg`); continue; }
    writeFileSync(path, next);
    written++;
    console.log(`  ${file} — rewritten`);
  }

  if (check && stale) {
    console.log(`\n  ${stale} page(s) carry a sprite older than rux-ds's. Run: node tools/sprite.mjs`);
    process.exit(1);
  }
  console.log(`\n  ${written} page(s) rewritten from rux-ds's sprite (${(svg.match(/<symbol/g) ?? []).length} symbols)`);
}
