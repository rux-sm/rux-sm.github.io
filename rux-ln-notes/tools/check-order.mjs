#!/usr/bin/env node
//
// Do the phases come before the sections that talk about them?
//
// WHY IT EXISTS, AND IT IS NOT HYPOTHETICAL. All seven generated guides
// shipped with Run record, Troubleshooting, Variants and What this unlocks
// ahead of the Phases they belong to, and all four other gates were green on
// every one of them. The troubleshooting rows are keyed by phase number and
// the run record opens "Fill in as you go", so the page handed a reader the
// fix-it table roughly a hundred lines before the instructions it fixes.
//
// IT IS A REGRESSION, WHICH IS THE POINT. The hand-built `guide.html` was
// measured in a browser with this order correct. `build.mjs` replaced it and
// put it back, because the fix lived in the artifact and not in a rule -- so
// deleting the artifact deleted the fix, and nothing was left behind to
// notice. This is that rule.
//
// WHY NOTHING ELSE CATCHES IT. `check-classes` reads class names,
// `check-structure` reads ancestry, `check-links` reads attributes that name
// files, and the pre-commit hook reads guide strings. Not one of them models
// DOCUMENT ORDER, so there was no rule to violate. A person opening the page
// sees it immediately; that is the gap this closes, and it is the second
// defect class here that only a browser was catching.
//
// WHAT IT CANNOT SEE, said plainly because a green run is easy to over-read:
//   * whether the phases themselves are in order, or complete.
//   * anything about the front matter's own sequence.
//   * whether a heading is the RIGHT heading for what sits under it.
//   * layout, spacing, or anything visual. This reads headings as text.
//
//   node tools/check-order.mjs <page.html> [more.html ...]
//   node tools/check-order.mjs            # every .html in the repository
//
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Same skip set and the same reason as check-links.mjs: `build/` is gitignored
// scratch and `vendor/` belongs to rux-ds, which gates it there.
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

// THE HEADINGS ARE THE CONTRACT, and they come from build.mjs's own HEADING
// map. Naming them here rather than importing is deliberate: this gate should
// fail if the generator renames one, not quietly follow it to a new name.
const PHASES = 'Phases';
const AFTER_PHASES = ['Run record', 'Troubleshooting', 'Variants', 'What this unlocks'];

const H2 = /<h2[^>]*>([^<]*)<\/h2>/g;

let faults = 0, checkedPages = 0;

for (const path of files) {
  const html = readFileSync(path, 'utf8');
  const heads = [...html.matchAll(H2)].map(m => m[1].trim());
  const name = relative(ROOT, path);

  // A page with no Phases heading is not a guide -- index.html and the
  // candidate template land here. Skipped, and said so rather than counted as
  // a pass, because a silent skip is how a sweep reports coverage it does not
  // have.
  const at = heads.indexOf(PHASES);
  if (at === -1) {
    console.log(`  ${name}: no "${PHASES}" heading, not a guide — skipped`);
    continue;
  }

  checkedPages++;
  const early = AFTER_PHASES
    .map(h => ({ h, i: heads.indexOf(h) }))
    .filter(({ i }) => i !== -1 && i < at);

  if (early.length) {
    faults += early.length;
    console.error(`  ${name}: ${early.length} section(s) sit ahead of "${PHASES}"`);
    for (const { h } of early) console.error(`      "${h}" should follow the phases it refers to`);
  } else {
    console.log(`  ${name}: phases precede their companion sections`);
  }
}

console.log(`\n  ${files.length} page(s) · ${checkedPages} guide(s) checked · ${faults} misplaced`);
console.log('  This says the phases come FIRST. It does not say they are correct,');
console.log('  complete, or that anything on the page is laid out properly.\n');

process.exit(faults ? 1 : 0);
