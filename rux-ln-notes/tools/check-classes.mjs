#!/usr/bin/env node
//
// Does every `rux--` class on a page exist in the vendored stylesheet?
//
// WHY THIS EXISTS, AND IT IS NOT HYPOTHETICAL. smoke.html shipped carrying
// `rux--type-productive-heading-05`, `rux--type-body-long-01`,
// `rux--type-productive-heading-03` and `rux--type-body-short-01`. No
// `rux--type-*` utility is compiled -- there are ZERO in rux.css -- so all four
// resolved to nothing. The page looked right because the elements were already
// `h1`, `h2` and `p`, which a browser styles on its own. It was published under
// a commit message claiming the design system had been proven to work here.
//
// THAT IS THE WHOLE FAILURE MODE OF A CONSUMER. rux-ds gates its own pages and
// fails on a class that does not resolve; a project that vendors only css/,
// assets/ and js/ inherits the stylesheet and none of the enforcement. "No
// invented classes" is the design system's core rule and nothing here carried
// it across.
//
// WHAT IT CANNOT SEE, said plainly because a green run is easy to over-read:
//   * whether the class is the RIGHT one -- `btn--secondary` where you meant
//     `btn--danger` resolves fine.
//   * whether the markup STRUCTURE is right. rux-ds diffs against captured
//     Carbon stories for that; this project has no captures.
//   * whether a component is compiled at all -- an uncompiled component's
//     classes are simply absent, which reads here as "unresolved", so that case
//     is caught, but the message will not say why.
//   * anything about spacing, contrast, behaviour or icons.
//
//   node tools/check-classes.mjs <page.html> [more.html ...]
//   node tools/check-classes.mjs            # every .html at the repo root
//
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// Since 2026-09-10 (rux-ds roadmap §8.4 step 5) this project vendors nothing:
// the sibling checkout on main, or DS=<dir>.
const CSS = join(resolve(ROOT, process.env.DS ?? '../rux-ds'), 'css/rux.css');

// Carbon escapes the colon in responsive classes -- `.rux--lg\:col-span-8`.
// A pattern that stops at the colon reports every one of them as missing, which
// is a false alarm loud enough to get the whole check ignored.
const defined = new Set(
  [...readFileSync(CSS, 'utf8').matchAll(/\.(rux--(?:\\.|[A-Za-z0-9_-])+)/g)]
    .map(m => m[1].replace(/\\/g, ''))
);

// EVERY PAGE, NOT EVERY PAGE AT THE ROOT. This walked `readdirSync(ROOT)` and
// stopped there until 2026-08-31, when tools/build.mjs started writing seven
// generated guides into `guides/`. The no-argument form would have reported a
// clean run over one file having never opened the other seven, and printed a
// count that looked like coverage.
//
// rux-ds found the identical bug on its own side and fixed it: `pageTargets()`
// carried a hardcoded page list, so a consumer page could never become a sweep
// cell and `npm run gates` showed a full green matrix without naming it.
//
// `build/` is skipped because it is gitignored scratch, and `vendor/` because
// those pages are rux-ds's and are gated there.
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

let faults = 0, checked = 0;
for (const path of files) {
  // Comments are stripped first: this file's own header names four class
  // names as prose, and a checker that fails on its own explanation is useless.
  const html = readFileSync(path, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const used = [...new Set(
    [...html.matchAll(/class="([^"]*)"/g)]
      .flatMap(m => m[1].split(/\s+/))
      .filter(c => c.startsWith('rux--'))
  )];
  const missing = used.filter(c => !defined.has(c));
  checked += used.length;
  const name = relative(ROOT, path);
  if (missing.length) {
    faults += missing.length;
    console.log(`\n  ${name}`);
    for (const c of missing) console.log(`     unresolved  ${c}`);
  } else {
    console.log(`  ${name}: ${used.length} classes, all resolve`);
  }
}

console.log(`\n  ${defined.size} classes defined in the vendored stylesheet`
  + ` · ${checked} uses checked · ${faults} unresolved`);
console.log(`  This says every class EXISTS. It does not say it is the right`
  + ` one, or that the markup around it is.\n`);
process.exit(faults ? 1 : 0);
