#!/usr/bin/env node
//
// How much of each shipped component does the kitchen sink actually exercise?
//
// Ownership is by NAME, not by which compile emitted a class. Two earlier metrics
// were wrong and are recorded so they are not retried:
//   1. "any class used" — compiling `modal` drags in `.rux--btn`, so one button on
//      the page marked modal covered. Overcounted 61/75.
//   2. "classes unique to one component" — `dropdown` is a dependency of combo-box,
//      multiselect and the fluid-* family, so `.rux--dropdown` has five owners and
//      dropdown ended up with ZERO signature classes and a false pass.
// Carbon namespaces by component name, so `.rux--dropdown*` belongs to dropdown
// no matter which compile emitted it. That is the metric below, and the stem table
// it needs now lives in tools/lib/ownership.mjs, shared with check-classes.
//
// A THIRD METRIC WAS WRONG AND IS THE REASON THIS FILE WAS REWRITTEN. It reported
// COVERED when a component had one class hit out of any number. `ui-shell` owns 55
// classes; a single `rux--header` marked it covered. The gate read 31/31 green while
// 45% of the shipped CSS had never been rendered once — and Phase 6 composes its
// templates from this sink, so an unexercised state is an unverified state.
//
// WHY THIS RATCHETS RATHER THAN SETTING A THRESHOLD. A percentage floor high enough
// to mean anything would be red today with no action available, which is the failure
// this file already warns about for stripped components. So the baseline is the
// coverage actually achieved, recorded in docs/coverage.json, and the gate fails when
// a component exercises FEWER classes than it did — never for standing still. Raising
// a number is then a deliberate act (`--update`), and it can only go up.
//
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { stems, compiled, classNames } from './lib/ownership.mjs';
import { pageFiles } from './lib/sources.mjs';

const inv = JSON.parse(readFileSync('docs/inventory.json', 'utf8'));
const ROOTS = pageFiles();
const BASELINE = 'docs/coverage.json';

// The fluid-* components define no stem of their own — each is a `--fluid`
// modifier on a base component. Ownership for them is an exact class, not a prefix.
// The four list-box-based ones share one wrapper class, so this metric cannot
// tell them apart; each still gets its own markup below.
const MARKER = {
  'fluid-text-input': 'rux--text-input--fluid',
  'fluid-text-area': 'rux--text-area--fluid',
  'fluid-select': 'rux--select--fluid',
  'fluid-search': 'rux--search--fluid',
  'fluid-number-input': 'rux--number-input--fluid',
  'fluid-date-picker': 'rux--date-picker--fluid',
  'fluid-time-picker': 'rux--time-picker--fluid',
  'fluid-dropdown': 'rux--list-box__wrapper--fluid',
  'fluid-combo-box': 'rux--list-box__wrapper--fluid',
  'fluid-multiselect': 'rux--list-box__wrapper--fluid',
  'fluid-list-box': 'rux--list-box__wrapper--fluid',
};

function walk(p, out = []) {
  if (!statSync(p, { throwIfNoEntry: false })) return out;
  if (statSync(p).isDirectory()) { for (const f of readdirSync(p)) walk(join(p, f), out); return out; }
  if (extname(p) === '.html') out.push(p);
  return out;
}

const used = new Set();
for (const f of ROOTS.flatMap(r => walk(r))) {
  for (const m of readFileSync(f, 'utf8').matchAll(/class="([^"]*)"/g))
    for (const c of m[1].split(/\s+/)) if (c.startsWith('rux--')) used.add(c);
}

// COMPILED, NOT ALL 75. Since Phase 3 the manifest is the strip, so the set this
// gate must account for is whatever src/app.scss still @uses — a commented-out
// component has no CSS and cannot be exercised, and demanding coverage for it
// would make the gate permanently red with no action available.
const COMPILED = compiled();

// THE DENOMINATOR IS THE BUILT CSS, not the inventory's class lists.
//
// Two reasons, both found the hard way. A class like `rux--text-input--fluid` has
// stem `text-input` and so counts as owned by a component that ships — but it only
// exists when fluid-text-input is compiled, and it is not, so counting it sets a
// target that can never be reached. And the inventory is a SNAPSHOT: when
// data-table gained its sort, expandable and action modules, every class they
// define was missing from inventory.json and the gate quietly kept scoring
// data-table out of the old 45. Reading the stylesheet the build just produced is
// the only denominator that cannot go stale.
const allClasses = classNames(readFileSync('css/rux.css', 'utf8'));
const DEFINED = allClasses;

const rows = [], unowned = [];
for (const c of inv.components) {
  if (c.error || !COMPILED.has(c.component)) continue;
  const own = MARKER[c.component]
    ? [...allClasses].filter(cl => cl === MARKER[c.component] && DEFINED.has(cl))
    : [...allClasses].filter(cl => DEFINED.has(cl) && stems(c.component).some(s =>
        cl === `rux--${s}` || cl.startsWith(`rux--${s}-`) || cl.startsWith(`rux--${s}__`)));
  const hit = own.filter(x => used.has(x));
  const row = { component: c.component, own: own.length, hit: hit.length,
                pct: own.length ? Math.round(100 * hit.length / own.length) : 0,
                missing: own.filter(x => !used.has(x)).sort() };
  if (!own.length) unowned.push(row); else rows.push(row);
}
rows.sort((a, b) => a.pct - b.pct || a.component.localeCompare(b.component));

const [flag, arg] = process.argv.slice(2);
if (flag === '--missing') {                       // components exercising nothing at all
  console.log([...rows.filter(r => !r.hit), ...unowned].map(r => r.component).join(' ')); process.exit(0);
}
if (flag === '--own' && arg) {
  const c = [...rows, ...unowned].find(x => x.component === arg);
  console.log(c ? c.missing.join('\n') : 'no such component'); process.exit(0);
}

const base = statSync(BASELINE, { throwIfNoEntry: false })
  ? JSON.parse(readFileSync(BASELINE, 'utf8')).components ?? {} : {};

// THE RATCHET WAS PROSE, NOT CODE, AND THE PROSE WAS ADDRESSED TO WHOEVER READ
// IT. Until 2026-08-31 this block wrote the CURRENT measurement unconditionally.
// README said "a ratchet can only be moved up"; the note field below said "never
// to make a red gate green"; both were instructions to a reader and neither was a
// check. Probed in a copy of the tree: raise a recorded `hit`, the gate goes red
// (exit 1), run `npm run coverage:update`, the gate goes green and the baseline
// has been lowered. One command, matched by an allowlist entry, and the only
// trace is a diff nothing flags.
//
// That is the precise failure the gates exist to prevent — an agent optimises for
// the check turning green, and rewriting the expected result was the cheapest
// route there. So the refusal lives here now, and the sentence in README is true
// because of this block rather than in spite of it.
//
// IT REFUSES RATHER THAN SILENTLY KEEPING THE HIGHER NUMBER. Keeping max() would
// leave the gate red after a `--update` that reported success, which is its own
// confusing lie. Naming the components and exiting 1 says what happened.
//
// `--force` EXISTS AND IS DELIBERATELY INCONVENIENT. A component can legitimately
// lose classes — Carbon drops one upstream, or a component is stripped from
// src/app.scss — and a baseline that can never come down would eventually be a
// permanent red with no honest action available, which is the threshold failure
// this file already rejected once. So the escape hatch stays, with no npm script
// in front of it, printing what it lowered. It has to be typed in full and it
// shows up in a shell history and a diff.
if (flag === '--update') {
  const forced = arg === '--force';
  const lowered = rows.filter(r => base[r.component] && r.hit < base[r.component].hit);

  if (lowered.length && !forced) {
    console.log(`\n  REFUSED — ${lowered.length} component${lowered.length > 1 ? 's' : ''} `
      + `would be recorded LOWER than the current baseline:`);
    for (const r of lowered)
      console.log(`             ${r.component.padEnd(18)}${base[r.component].hit} -> ${r.hit} of ${r.own}`);
    console.log('\n             The baseline only moves up. Restore the markup that exercised'
      + '\n             those classes, or — if the loss is real and intended —'
      + '\n             `node tools/check-coverage.mjs --update --force`\n');
    process.exit(1);
  }

  const components = Object.fromEntries(rows.map(r => [r.component, { hit: r.hit, own: r.own }]));
  writeFileSync(BASELINE, JSON.stringify({
    note: 'Per-component class coverage of the kitchen sink, as achieved. check-coverage '
        + 'fails when a component exercises fewer classes than recorded here. `--update` '
        + 'REFUSES to lower any entry, so this file only ever moves up; the refusal is in '
        + 'tools/check-coverage.mjs and is not advice. Regenerate with '
        + '`npm run coverage:update` after adding sink markup. A real loss — a component '
        + 'stripped, or a class gone upstream — needs `--update --force`, which prints '
        + 'what it lowered.',
    components,
  }, null, 2) + '\n');
  console.log(`\n  BASELINE written — ${rows.length} components, `
    + `${rows.reduce((n, r) => n + r.hit, 0)} classes exercised`
    + (lowered.length ? `\n  FORCED — ${lowered.length} lowered: `
        + lowered.map(r => `${r.component} ${base[r.component].hit}->${r.hit}`).join(' ') : '')
    + '\n');
  process.exit(0);
}

const regressed = rows.filter(r => base[r.component] && r.hit < base[r.component].hit);
const fresh = rows.filter(r => !base[r.component]);
const dead = Object.keys(base).filter(c => !rows.some(r => r.component === c));
const none = rows.filter(r => !r.hit);

const totHit = rows.reduce((n, r) => n + r.hit, 0);
const totOwn = rows.reduce((n, r) => n + r.own, 0);
const SHOW = flag === '--all' ? rows.length : 10;

console.log(`\n  COVERAGE  ${totHit}/${totOwn} classes (${Math.round(100 * totHit / totOwn)}%) `
  + `across ${rows.length} components`);
for (const r of rows.slice(0, SHOW))
  console.log(`  ${String(r.pct).padStart(5)}%  ${r.component.padEnd(18)}`
    + `${String(r.hit).padStart(4)}/${r.own}`);
if (rows.length > SHOW)
  console.log(`  ${String(rows.length - SHOW).padStart(5)} more not listed — \`--all\` for every row, `
    + `\`--own <component>\` for its unexercised classes`);

// A regression is the finding; everything else is a bookkeeping note, so only
// regressions get a line each.
const note = (label, names, tail) => {
  if (names.length) console.log(`\n  ${label}  ${names.length} — ${names.join(' ')}\n  ${' '.repeat(label.length)}  ${tail}`);
};
note('EXERCISES NOTHING', none.map(r => `${r.component}(${r.own})`), 'add markup, or strip the component');
note('NO OWNED CLASSES ', unowned.map(r => r.component), 'needs an ALIAS entry in tools/lib/ownership.mjs');
note('STALE BASELINE   ', dead, 'no longer compiled — run `npm run coverage:update`');
note('NOT IN BASELINE  ', fresh.map(r => `${r.component}(${r.pct}%)`), 'run `npm run coverage:update` to record');
for (const r of regressed)
  console.log(`\n  REGRESSED  ${r.component}  ${base[r.component].hit} -> ${r.hit} of ${r.own} classes`
    + `\n             \`node tools/check-coverage.mjs --own ${r.component}\` lists what is unexercised`);

const bad = regressed.length + none.length + unowned.length + fresh.length + dead.length;
if (!bad) console.log(`\n  BASELINE  ${BASELINE} — no regressions\n`);
else console.log();
process.exit(bad ? 1 : 0);
