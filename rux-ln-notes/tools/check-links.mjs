#!/usr/bin/env node
//
// Does every local `href` and `src` on a page point at a file that exists?
//
// WHY IT EXISTS, AND IT IS NOT HYPOTHETICAL. The first build of the generated
// guides shipped TEN dead references and every other check was green:
//
//   * NINE cross-guide links pointing at `SG-….md`. Guides reference each
//     other by their atlas filename, and atlas's files are Markdown. Emitted
//     verbatim into HTML they are nine links to nothing.
//   * ONE image, `order-to-shipment-flowchart.svg`, referenced relative to the
//     page but delivered into `data/guides/`. The generator was not copying it.
//
// NEITHER IS VISIBLE TO ANYTHING ELSE HERE. `check-classes` reads class names,
// `check-structure` reads ancestry, and the pre-commit hook reads guide
// strings; not one of them looks at an attribute that names a file. And
// neither fault shows on the page: a dead link is drawn exactly like a live
// one, and a missing image is a small broken-image box that reads as a slow
// load. This is the project's own recurring failure -- a page that looks
// finished and is wrong -- in the one place nothing was watching.
//
// WHAT IT CANNOT SEE, said plainly because a green run is easy to over-read:
//   * whether the link points at the RIGHT page. A guide linking to the wrong
//     guide resolves fine.
//   * fragments. `#summaries` is checked only as far as the file; whether the
//     id exists in it is not read.
//   * anything remote. An `https://` target is skipped rather than fetched.
//   * a page nobody links to at all.
//
//   node tools/check-links.mjs <page.html> [more.html ...]
//   node tools/check-links.mjs            # every .html in the repository
//
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize, relative } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Same skip set and the same reason as check-classes.mjs: `build/` is
// gitignored scratch and `vendor/` belongs to rux-ds, which gates it there.
const SKIP = new Set(['node_modules', 'vendor', 'build', '.git']);

function pages(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return SKIP.has(entry.name) ? [] : pages(path);
    return entry.name.endsWith('.html') ? [path] : [];
  });
}

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : pages(ROOT).sort();

// A REFERENCE, NOT A LINK. `src` matters as much as `href` and is the half
// that broke: the stylesheet, the scripts and the diagram are all `src` or a
// `href` on <link>, and any one of them missing is a page that loads and is
// wrong in a way the browser reports only in a console nobody has open.
const REF = /(?:href|src)="([^"]*)"/g;

// A fragment-only href is an in-page jump with no file to check. A protocol
// href is somebody else's server. Neither is this tool's business.
const external = href => href === '' || href.startsWith('#')
  || /^[a-z][a-z0-9+.-]*:/i.test(href);

// A ROOT-ABSOLUTE REFERENCE IS THE ACCOUNT ROOT'S, NOT THIS REPOSITORY'S.
// Since 2026-09-02 the shell links /switcher.js and lists /, /rux-ln-notes/
// (rux-ds roadmap §4.12): paths served by rux-sm.github.io, where this site
// sits under /rux-ln-notes/. No file here answers them, so they are counted
// and printed rather than resolved. Before this rule `/` passed by accident
// -- join(dir, '/') is dir -- and /switcher.js would have failed as
// `guides/switcher.js`. WHAT THIS CANNOT SEE: a root path with a typo in it
// passes here; the hub's tools/check.mjs guards switcher.json's paths, and
// nothing guards the entries this site ships as its fallback. Open the page.
const rootAbsolute = href => href.startsWith('/') && !href.startsWith('//');

let missing = 0, checked = 0, root = 0;

for (const path of files) {
  const html = readFileSync(path, 'utf8');
  const faults = [];

  for (const [, href] of html.matchAll(REF)) {
    if (external(href)) continue;
    if (rootAbsolute(href)) { root++; continue; }
    // The fragment is dropped: this answers whether the FILE is there.
    const file = href.split('#')[0];
    if (!file) continue;
    checked++;
    const target = normalize(join(dirname(path), file));
    if (!existsSync(target)) faults.push({ href, resolvesTo: relative(ROOT, target) });
  }

  const name = relative(ROOT, path);
  if (faults.length) {
    missing += faults.length;
    console.error(`  ${name}: ${faults.length} reference(s) point at nothing`);
    for (const f of faults) console.error(`      ${f.href}  →  ${f.resolvesTo}`);
  } else {
    console.log(`  ${name}: all references resolve`);
  }
}

console.log(`\n  ${files.length} page(s) · ${checked} local reference(s) checked · ${missing} missing · ${root} root-absolute, the hub's to answer`);
console.log('  This says the file is THERE. It does not say it is the right one,');
console.log('  and it reads no fragment: #summaries is checked as far as the page.\n');

process.exit(missing ? 1 : 0);
