#!/usr/bin/env node
//
// Two classes Carbon writes as a COMPOUND selector belong on ONE element.
//
// Carbon distinguishes `.a .b` (b nested inside a) from `.a.b` (both on the same
// element). Get that backwards and every gate still passes: the classes resolve,
// the component is covered, co-classes are satisfied — and the component renders
// wrong, because rules that were meant to override each other land on different
// boxes and stack instead.
//
// This is the tabs defect (roadmap §4.1.11). @carbon/react puts
// `--tabs__nav-item` and `--tabs__nav-link` on one button; the fragment nested
// them, so `--nav-item--selected`'s 2px border painted BELOW `--nav-link`'s
// instead of replacing it, and every selected tab drew a doubled underline.
// Reconstructing that markup, this checker flags it.
//
// WHY THERE IS NO IGNORE LIST. The naive form — "any compound pair not found
// together" — fires on modifier combinations too (`--link--inline` with
// `--link--disabled`), which are legitimate: Carbon has a rule for the pairing,
// but nothing says a fragment must demo every combination. Those needed four
// exceptions out of six findings, and a check that large a list is measuring the
// list. Comparing BEM bases removes them by rule instead: same base means two
// modifiers of one thing, different bases means two different things that Carbon
// says share an element. That is the whole filter, and it needs no entries.
//
// HOW TO ANSWER A FINDING. Two legitimate answers, and adding an exception is
// not among them: either the split is a bug and the classes merge onto one
// element, or the combination is real and the fragment should DEMO it. All three
// findings from the first run resolved that way — dialog merged, inline-loading
// turned out to have its status classes on wrappers instead of the icon, and
// treeview grew an icon on a leaf. If a case ever appears where neither answer
// is right, demote this to a diagnostic like check-rendered.js rather than
// giving it a list. A gate with an ignore list measures the list.
//
// WHAT IT CANNOT SEE. Only pairs Carbon happens to write as a compound selector.
// The tabs pair existed solely because of a forced-colors rule — luck, not
// coverage. Wrong nesting ORDER, a missing wrapper, or the wrong element type
// produce no compound rule and are invisible here. Nor does a clean exit mean a
// pair is correct: it also passes when a fragment stops using one of the classes
// entirely, which is exactly what happened to inline-loading's `__svg`. This
// narrows the field for a reference diff; it does not verify structure.
//
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const CSS = 'css/rux.css';
// The fragments, not the assembled page: identical coverage, but the path it
// prints is the file you edit (kitchen-sink.html is generated — see README).
const ROOTS = ['sink', 'templates'];

// `rux--tabs__nav-item--selected` -> `tabs__nav-item`. Everything after the
// block/element name is a modifier.
const base = c => c.replace(/^rux--/, '').split('--')[0];

function walk(p, out = []) {
  if (!statSync(p, { throwIfNoEntry: false })) return out;
  if (statSync(p).isDirectory()) { for (const f of readdirSync(p)) walk(join(p, f), out); return out; }
  if (extname(p) === '.html') out.push(p);
  return out;
}

// Selector text is everything before a `{` that is not an at-rule preamble. Rules
// nested in @media must be included — that is where the tabs pair lives.
const css = readFileSync(CSS, 'utf8');
const pairs = new Map();
const cascade = new Set();
for (const m of css.matchAll(/([^{}]+)\{/g)) {
  if (m[1].trim().startsWith('@')) continue;
  const list = m[1];

  // Carbon's token-cascade idiom: `.a.b, .a :where(.b)` — one rule saying "b
  // carries the token itself, OR inherits it from an ancestor a". The layout
  // module emits it for every sized component. Both forms are correct markup, so
  // a pair written this way is never a structural pairing. Recorded BEFORE the
  // pseudo-strip below, which would erase the :where() branch.
  // A plain descendant alternative does NOT exonerate: tabs has one
  // (`--nav-item--selected .--nav-link`) and its nesting was still wrong.
  for (const w of list.matchAll(/\.(rux--[A-Za-z0-9_-]+)\s+:(?:where|is)\(([^()]*)\)/g))
    for (const inner of w[2].matchAll(/\.(rux--[A-Za-z0-9_-]+)/g))
      cascade.add([w[1], inner[1]].sort().join(' '));

  for (const part of list.split(',')) {
    // :not(.x) is a negation, not a compound — strip functional pseudos first.
    const clean = part.replace(/:(not|is|where|has)\([^()]*\)/g, ' ');
    for (const run of clean.matchAll(/(?:\.rux--[A-Za-z0-9_-]+){2,}/g)) {
      const cls = [...run[0].matchAll(/\.(rux--[A-Za-z0-9_-]+)/g)].map(x => x[1]);
      for (let i = 0; i < cls.length; i++)
        for (let j = i + 1; j < cls.length; j++)
          if (base(cls[i]) !== base(cls[j]))
            pairs.set([cls[i], cls[j]].sort().join(' '), true);
    }
  }
}
for (const k of cascade) pairs.delete(k);

let bad = 0;
for (const file of ROOTS.flatMap(r => walk(r))) {
  const html = readFileSync(file, 'utf8');
  const elements = [...html.matchAll(/class="([^"]*)"/g)]
    .map(m => new Set(m[1].split(/\s+/).filter(c => c.startsWith('rux--'))));
  const all = new Set(elements.flatMap(s => [...s]));
  for (const key of pairs.keys()) {
    const [a, b] = key.split(' ');
    if (!all.has(a) || !all.has(b)) continue;               // pair not exercised here
    if (elements.some(s => s.has(a) && s.has(b))) continue; // already share an element
    console.log(`  SPLIT  ${file}`);
    console.log(`         ${a}`);
    console.log(`         ${b}   <- Carbon compounds these; they belong on one element`);
    bad++;
  }
}

console.log(`\n  structural compound pairs ${pairs.size} · split across elements ${bad}`);
process.exit(bad ? 1 : 0);
