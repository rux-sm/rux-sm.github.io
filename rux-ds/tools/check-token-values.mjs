#!/usr/bin/env node
//
// Fail when a --rux-* value css/rux.css declares is not the value
// docs/token-values.json recorded. Phase 8's token snapshot, roadmap §4.8.
//
// THE ONLY GATE HERE THAT IS NOT NAME-BASED, which is the whole reason for it.
// A Carbon bump that moves --rux-layer-01 from one grey to another changes no
// class, no token NAME and no markup, so check-classes, check-tokens,
// check-tags and check-ancestry all pass and the product ships looking
// different. §4.8 calls this the gate that matters most and the one most
// likely to be skipped.
//
// A CHANGED VALUE IS NOT A FAILURE OF THE STYLESHEET. It is a failure to have
// noticed. Every finding here is either something Carbon changed under you --
// which you want to read before shipping -- or something you changed and meant.
// Re-baseline with `npm run tokens:snapshot` and COMMIT THE DIFF, so the
// change is in the history as a decision rather than as a silent movement.
//
// WHICH IS ALSO THIS GATE'S WEAKNESS, and it is worth naming plainly: the
// baseline is regenerable at will, so the gate is exactly as strong as the
// discipline of reading the diff before regenerating. It is the same bargain
// docs/coverage.json makes, except that coverage.json ratchets and this cannot
// -- there is no direction a token value can move that is inherently better.
//
//   node tools/check-token-values.mjs
//
import fs from 'node:fs';
import { extract, SRC } from './lib/token-values.mjs';

const BASELINE = 'docs/token-values.json';

if (!fs.existsSync(BASELINE)) {
  console.error(`  no ${BASELINE}. Write it with: node tools/build-token-values.mjs`);
  process.exit(1);
}

const recorded = JSON.parse(fs.readFileSync(BASELINE, 'utf8')).values;
const { values: current, declarations, duplicates } = extract();

// A REPEATED DECLARATION IS AN ARRAY AND A SINGLE ONE IS A STRING, so both
// sides are normalised before they are compared. Comparing a string to a
// one-element array as raw JSON would report every entry as moved.
const show = v => Array.isArray(v) ? `[${v.join(' | ')}]` : v;
const same = (a, b) => JSON.stringify([].concat(a)) === JSON.stringify([].concat(b));

const changed = [], added = [], removed = [];

for (const context of Object.keys(current)) {
  for (const [name, value] of Object.entries(current[context])) {
    const was = recorded[context]?.[name];
    if (was === undefined) added.push(`${context} · ${name} = ${show(value)}`);
    else if (!same(was, value)) changed.push(`${context} · ${name}: ${show(was)} → ${show(value)}`);
  }
}
for (const context of Object.keys(recorded)) {
  for (const name of Object.keys(recorded[context])) {
    if (current[context]?.[name] === undefined) {
      removed.push(`${context} · ${name} (was ${show(recorded[context][name])})`);
    }
  }
}

// A REPEAT IS REPORTED AND DOES NOT FAIL. css/rux.css declares 15 tokens twice,
// all in :root with identical values, because Carbon emits two separate :root
// blocks; the remedy would be editing a Carbon file and no Carbon file is ever
// edited. The hole a repeat used to open -- an added duplicate leaving the
// snapshot unchanged -- is closed in the parser, which now records every value,
// so a NEW repeat shows up above as a moved value rather than passing silently.
if (duplicates.length) {
  console.log(`\n  ${duplicates.length} token(s) declared more than once in one context:`);
  for (const d of duplicates) console.log(`    ${d}`);
}

const findings = changed.length + added.length + removed.length;

// EVERY LINE IS PRINTED, none elided. The failure message asks a maintainer to
// confirm each one before re-recording the baseline, and a list truncated at 40
// makes that impossible while appearing complete -- the reader confirms what
// they were shown and re-records what they were not.
if (changed.length) {
  console.log(`\n  ${changed.length} VALUE(S) MOVED under a stable name:`);
  for (const c of changed) console.log(`    ${c}`);
}
if (added.length) {
  console.log(`\n  ${added.length} declaration(s) not in the baseline:`);
  for (const a of added) console.log(`    ${a}`);
}
if (removed.length) {
  console.log(`\n  ${removed.length} declaration(s) the baseline has and ${SRC} no longer does:`);
  for (const r of removed) console.log(`    ${r}`);
}

console.log(`\n  ${declarations} declaration(s) · ${Object.keys(current).length} context(s) · ` +
  `${changed.length} moved · ${added.length} added · ${removed.length} removed · ${duplicates.length} repeated`);

if (findings) {
  console.log(`\n  Read every line above before doing anything. If all of it is intended,`);
  console.log(`  re-record with \`npm run tokens:snapshot\` and commit ${BASELINE}`);
  console.log(`  in the same commit as the change that moved it.`);
  process.exit(1);
}
