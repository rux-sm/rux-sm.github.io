#!/usr/bin/env node
//
// Splice rux-ds's icon sprite into every page between its SPRITE markers,
// read from the checkout beside this repository (or DS=<dir>) since
// 2026-09-10, when this project stopped vendoring a copy (rux-ds roadmap
// §8.4 step 5).
//
// WHY A PAGE CANNOT JUST LINK THE SPRITE FILE. Referencing
// `vendor/rux-ds/assets/icons.svg#i-name` from a <use> is broken in two
// ordinary cases: WebKit has never supported a cross-document <use>, so every
// icon is blank in Safari, and opening a page over file:// blocks the fetch in
// every engine. Both fail SILENTLY -- the CSS and scripts still load, so the
// page looks built and simply has no icons in it. rux-ds records this as a
// check-icons fault and inlines into each of its templates for the same reason.
//
// WHY THIS IS NOT rux-ds's tools/icons.mjs. That script regenerates the sprite
// from @carbon/icons and then rewrites `templates/*.html` -- both wrong here.
// This project has no @carbon/icons and no templates/ directory; it has an
// already-built sprite, rux-ds's own. So this only ever COPIES, and the
// sprite's content is rux-ds's business entirely -- whatever is live.
//
//   node tools/inline-sprite.mjs <file.html> [more.html ...]
//
// A page opts in by carrying the two markers with nothing or anything between:
//   <!-- SPRITE:BEGIN -->
//   <!-- SPRITE:END -->
//
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DS = resolve(ROOT, process.env.DS ?? '../rux-ds');
const SPRITE = join(DS, 'assets/icons.svg');

const BEGIN = '<!-- SPRITE:BEGIN -->';
const END = '<!-- SPRITE:END -->';

const files = process.argv.slice(2);
if (!files.length) {
  console.error('usage: node tools/inline-sprite.mjs <file.html> [...]');
  process.exit(2);
}

// The sprite file is a complete <svg> document. It must be hidden, because it
// is a definitions block and not a picture: without display:none the browser
// lays out every symbol at the top of the page.
//
// ONLY IF IT IS NOT ALREADY HIDDEN. rux-ds's sprite ships with the style on it
// already, and adding a second produced `<svg style="..." xmlns="..."
// style="...">`. That renders -- a browser takes the first and drops the rest --
// which is why it is worth catching here rather than trusting the page to look
// right. Duplicate attributes are invalid HTML and the next reader inherits it.
const raw = readFileSync(SPRITE, 'utf8').replace(/^<\?xml[^>]*\?>\s*/, '');
const open = raw.slice(0, raw.indexOf('>') + 1);
const svg = /display\s*:\s*none/.test(open)
  ? raw
  : raw.replace('<svg ', '<svg style="display:none" ');

let changed = 0;
for (const path of files) {
  const html = readFileSync(path, 'utf8');
  const a = html.indexOf(BEGIN);
  const b = html.indexOf(END);

  // FAIL LOUDLY ON A PAGE THAT WANTED ICONS AND DID NOT GET THEM. A missing
  // marker is the silent-blank-icons failure arriving one step earlier, and
  // the whole point of inlining is that this never fails quietly.
  if (a === -1 || b === -1 || b < a) {
    console.error(`  ${path}: no SPRITE:BEGIN/END markers -- not written`);
    process.exitCode = 1;
    continue;
  }

  const next = html.slice(0, a) + BEGIN + '\n' + svg.trim() + '\n' + html.slice(b);
  if (next !== html) { writeFileSync(path, next); changed++; }
  const n = (svg.match(/<symbol /g) ?? []).length;
  console.log(`  ${path}: ${n} symbols inlined`);
}
console.log(`  ${changed} file(s) rewritten`);
