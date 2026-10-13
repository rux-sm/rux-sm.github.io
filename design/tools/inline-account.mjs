#!/usr/bin/env node
//
// SPLICES THE ACCOUNT PANEL INTO EVERY PAGE THAT CARRIES ITS MARKERS.
//
// tools/lib/shell.mjs writes the panel once: the header panel the Account
// action opens, with the theme, Profile, Log out and the apps. A template has
// to run on its own, so it carries the panel in its own file, and a copy kept
// by hand in each is how fourteen copies come to differ. So the panel is
// spliced, between two markers, the same way tools/build-icons.mjs splices
// the sprite:
//
//   <!-- ACCOUNT:BEGIN — generated, do not edit. ... -->
//   ...anything here is replaced...
//   <!-- ACCOUNT:END -->
//
//   node tools/inline-account.mjs                 every templates/*.html
//   node tools/inline-account.mjs <file> [...]    those files
//   node tools/inline-account.mjs --check [...]   writes nothing; exits 1 if a
//                                                 file's panel is not this one
//
// A FILE OPTS IN BY CARRYING THE MARKERS, and one without them is left alone:
// a game's template has no header and so no panel. It is idempotent, and the
// result is committed, so a clone with no build step serves a correct page.
// The pages a generator writes whole take the same panel from shell().
//
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { accountPanel } from './lib/shell.mjs';

const BEGIN = /<!-- ACCOUNT:BEGIN[\s\S]*?-->\n/;
const END = '<!-- ACCOUNT:END -->';

const args = process.argv.slice(2);
const check = args.includes('--check');
const named = args.filter(a => !a.startsWith('--'));
const files = named.length ? named : readdirSync('templates').filter(f => f.endsWith('.html')).sort().map(f => join('templates', f));

let marked = 0, changed = 0;
for (const file of files) {
  const html = readFileSync(file, 'utf8');
  const begin = html.match(BEGIN);
  const end = html.indexOf(END);
  if (!begin && end < 0) continue;
  if (!begin || end < begin.index) { console.error(`  ${file}: one ACCOUNT marker without the other`); process.exit(1); }
  marked++;
  const from = begin.index + begin[0].length;
  // The END marker keeps the indentation it was written with.
  const indent = html.slice(html.lastIndexOf('\n', end) + 1, end);
  const next = `${html.slice(0, from)}${accountPanel()}\n${indent}${html.slice(end)}`;
  if (next === html) continue;
  changed++;
  if (check) console.log(`  STALE  ${file}`);
  else { writeFileSync(file, next); console.log(`  ${file} — account panel spliced`); }
}
console.log(`  account panel: ${marked} page${marked === 1 ? '' : 's'} carry it, ${changed} ${check ? 'stale' : 'rewritten'}`);
if (check && changed) process.exit(1);
