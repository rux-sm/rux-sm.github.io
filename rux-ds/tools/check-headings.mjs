#!/usr/bin/env node
//
// A PAGE MUST OFFER A HEADING OUTLINE. Every page carries exactly one <h1>, and
// no page skips a level on the way down.
//
// THE TWENTIETH GATE, admitted 2026-08-31 (roadmap §4.8). It is the first gate
// whose unit is the FILE rather than an occurrence, and that shape was the whole
// hesitation: every other gate here asks "is this class / element / property
// right", and none of them can ask "does this document, taken whole, offer
// anything to navigate by". The only precedent is check-provenance, which asserts
// a file carries a label.
//
// WHY IT EXISTS. templates/table-page.html rendered its only title as
// div.data-table-header__title and had no h1-h6 anywhere. Heading navigation is a
// primary way an AT user moves through a page, and §4.6 says a template IS a
// complete page, so the page offered none. It passed all seventeen gates that
// existed, and was found by a person walking the tab order.
//
// NO MARKUP GATE COULD HAVE CAUGHT IT, and that is the point rather than an
// excuse. Carbon renders data-table-header__title as both h2 and div, so
// check-tags accepts either and nothing was invented. It is a composition
// question, and the gates check parts.
//
// PAGES ONLY. sink/*.html is excluded BY DESIGN, not by oversight: a fragment is
// a specimen of one component, not a document, and forcing an h1 into each would
// put fifty h1s into the assembled kitchen sink -- which is the opposite of what
// this gate is for. The sink is read as the assembled page it becomes.
//
// COMMENTS ARE STRIPPED BEFORE ANYTHING IS READ. This is not defensive coding.
// The first version of this file did not strip them and reported detail-page and
// dashboard-page as h1->h3 skips, because both carry a COMMENT explaining the h3
// they no longer contain. A gate that reads its own documentation as markup files
// findings against text that fixed the bug.
//
import { readFileSync } from 'node:fs';
import { pageFiles } from './lib/sources.mjs';
import { readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const files = [];
for (const t of pageFiles()) {
  if (!existsSync(t)) continue;
  if (statSync(t).isDirectory())
    for (const f of readdirSync(t).filter(f => f.endsWith('.html')).sort()) files.push(join(t, f));
  else files.push(t);
}

let findings = 0;
const rows = [];

for (const f of files) {
  const src = readFileSync(f, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const heads = [...src.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/g)]
    .map(m => ({ level: +m[1], text: m[2].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() }));

  const h1s = heads.filter(h => h.level === 1);
  if (h1s.length === 0) {
    console.log(`  NO HEADING     ${f}`);
    console.log(`                 a page offers no way to navigate by heading — this is the table-page defect`);
    findings++;
  } else if (h1s.length > 1) {
    console.log(`  ${String(h1s.length).padStart(2)} × h1        ${f}`);
    console.log(`                 ${h1s.map(h => `"${h.text.slice(0, 40)}"`).join(' · ')}`);
    findings++;
  }

  for (let i = 1; i < heads.length; i++) {
    const prev = heads[i - 1], here = heads[i];
    if (here.level > prev.level + 1) {
      console.log(`  LEVEL SKIP     ${f}`);
      console.log(`                 h${prev.level} → h${here.level} at "${here.text.slice(0, 46)}"`);
      console.log(`                 a listener navigating by heading hears a level that has no parent`);
      findings++;
    }
  }
  rows.push({ f, outline: heads.map(h => h.level).join(' ') });
}

if (process.argv.includes('--all'))
  for (const r of rows) console.log(`  ${r.f.padEnd(34)} [${r.outline}]`);

console.log(`\n  ${files.length} pages · ${findings} finding${findings === 1 ? '' : 's'}`
  + ` · one h1 each, no level skipped`);
if (findings) {
  console.log('  a page with no heading, or an outline with a hole in it — fix the markup\n');
  process.exit(1);
}
