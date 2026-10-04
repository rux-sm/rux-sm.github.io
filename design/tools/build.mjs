#!/usr/bin/env node
//
// Design build. Compiles src/app.scss, then applies the changes Carbon's own
// configuration cannot make, which tools/lib/transform.mjs holds and explains.
//
// Written in Node rather than sed deliberately. `sed -i` needs `-i ''` on BSD and
// `-i` with the suffix attached on GNU, and neither parses the other's form.
//
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { classNames, compiled } from './lib/ownership.mjs';
import { transform, leftoverFocus } from './lib/transform.mjs';

const SRC = 'src/app.scss';
const OUT = 'css/rux.css';
const MIN = 'css/rux.min.css';

// `--quiet-deps` because the deprecation warnings are Carbon's own Sass, loaded
// from node_modules, and nothing here can answer them; ours would still print.
function sass(out, extra = []) {
  execFileSync('npx', ['sass', '--load-path=node_modules', '--no-source-map', '--quiet-deps', ...extra, SRC, out],
    { stdio: ['ignore', 'inherit', 'inherit'] });
}

// verify() re-proves on every build that the grid rename left no `cds` behind
// and that no `:focus` survived the change to `:focus-visible`.
function verify(css, label) {
  if (leftoverFocus(css)) {
    console.error(`\n  FAIL (${label}): ${leftoverFocus(css)} ':focus' selectors survived.`);
    process.exit(1);
  }
  const leaks = css.match(/cds/g);
  if (leaks) {
    console.error(`\n  FAIL (${label}): ${leaks.length} 'cds' occurrences survived.`);
    const names = [...new Set(css.match(/[-.a-z0-9]*cds[-a-z0-9]*/g) ?? [])];
    console.error(`  names: ${names.slice(0, 10).join(', ')}`);
    process.exit(1);
  }
}

// THE ATTRIBUTION BANNER. Apache-2.0 section 4(c) asks a redistributor to retain the
// copyright and attribution notices from the source form, and section 4(b) to mark
// changed files. Carbon's Sass carries `// Copyright IBM Corp.` headers on every
// partial — and Sass STRIPS `//` comments, so before 2026-08-29 the built stylesheet
// carried none of them. css/rux.css is committed and served from a raw URL by design,
// which is distribution, so the notice has to be put back here.
//
// It goes AFTER `@charset`, which only takes effect as the very first thing in the
// file. `/*!` rather than `/*` so a minifier treats it as a loud comment and keeps it.
//
// IT MUST NOT CONTAIN THE THREE LETTERS verify() LOOKS FOR. "Carbon Design System"
// does not; a phrase naming the old prefix would fail the build, and that is correct
// behaviour rather than an obstacle.
const BANNER = `/*!
 * Design — a framework-free design system derived from the Carbon Design System
 * by subtraction. Not endorsed by or affiliated with IBM.
 *
 * Copyright 2026 rux
 * Licensed under the Apache License, Version 2.0. See LICENSE.
 *
 * Contains rules compiled from @carbon/styles, with the class and custom-property
 * prefix changed at build time and the component set reduced:
 *   Carbon Design System, Copyright IBM Corp. 2015, 2026
 *   Licensed under the Apache License, Version 2.0
 *
 * Carbon's own Sass headers do not survive compilation. See NOTICE.
 */
`;

// After @charset, which must lead the file to have any effect.
function brand(css) {
  const m = css.match(/^@charset[^;]*;\n?/);
  return m ? m[0] + BANNER + css.slice(m[0].length) : BANNER + css;
}

function kb(n) { return `${(n / 1024).toFixed(0)} KB`; }

let focusRules = 0, iconTwins = 0, hardReferences = [];
for (const [out, extra] of [[OUT, []], [MIN, ['--style=compressed']]]) {
  sass(out, extra);
  const done = transform(readFileSync(out, 'utf8'));
  if (out === OUT) { focusRules = done.focus; iconTwins = done.twins; hardReferences = done.references; }
  if (done.undeclared.length) {
    console.error(`\n  FAIL (${out}): Carbon hardcodes a reference to a token this build does not declare: `
      + done.undeclared.map(n => `--rux-${n}`).join(', '));
    process.exit(1);
  }
  const css = brand(done.css);
  writeFileSync(out, css);
  // Scans the banner too, deliberately: a notice that named the old prefix would be a
  // build failure rather than a comment nobody reads.
  verify(css, out);
}

const raw = readFileSync(OUT, 'utf8');
const min = readFileSync(MIN);
const tokens = new Set(raw.match(/--rux-[a-z0-9-]+/g) ?? []).size;
const classes = classNames(raw).size;
// Unique component names — data-table is four @use lines and one component.
const comps = compiled().size;

// THE BEHAVIOUR LAYER IS MEASURED HERE TOO, and it did not used to be.
//
// A "<=90 KB of behaviour JS" budget was set from the start and
// NOTHING EVER MEASURED IT. The figure lived in prose, was re-derived by hand
// each time somebody wondered, and drifted: it read 83.5 KB at finding 14 and
// 119.2 KB when it was next checked, with the whole difference being comment.
// A number nobody computes is the failure this repository keeps re-learning.
//
// It is now a TRIPWIRE rather than a budget, on 4.5's own terms and by the same
// argument 2.1 used to delete the CSS target: the budget never decided
// anything. Not one module was cut, deferred or shaped by it. What decides what
// goes in js/ is the scope rule in CLAUDE.md -- modules make Carbon's
// components work, they do not add interactions Carbon declines -- and that is
// a judgement about what belongs, not about bytes.
//
// GZIPPED, because it is what a browser receives and it is the unit 2.1's CSS
// tripwire already uses. Raw bytes would count comments, and this layer is 61%
// comment on purpose; a rule whose only route to compliance is deleting the
// reasoning is a rule working against itself.
//
// 80 KB against today's ~75 leaves room for modules that make Carbon's
// components work, which is what the last four were. What reaches it is
// somebody vendoring a library into js/, which is the one growth the scope
// rule would not already have caught.
const JS_TRIPWIRE_KB = 80;

// THE CSS TRIPWIRE, 2.1's, AND IT IS ENFORCED HERE FROM 2026-08-31. It read
// 75 KB and lived in PROSE ONLY -- nothing computed it, which is the exact
// failure the paragraph above says this repository keeps re-learning, and it
// went unnoticed because the JS tripwire beside it looked like the pair was
// covered. Admitting the fluid family took the stylesheet from 66.4 to 70.5 KB
// and NOTHING would have stopped it at 75.
//
// IT SITS ONE STEP ABOVE FULL CARBON. Measured with tools/measure.mjs against
// the installed @carbon/styles 1.116.0: all 87 components and all four themes
// are 102.6 KB gzipped, and the shipped set is 100.8 KB before the build's
// `:focus-visible` rewrite adds its bytes. 105 is one clear step above that
// ceiling without room nothing accounts for.
//
// THIS CHANGES WHAT THE ALARM MEANS. It no longer notices the full component set
// being re-enabled; completeness makes that a legitimate state. It notices this
// build OUTGROWING full Carbon, which means duplication or an opt-in layer rather
// than admission. That is weaker than 85 and is stated rather than hidden.
//
// IF THIS TRIPS, re-measure full Carbon on the pinned dependency before touching
// the number. A Carbon bump may move the ceiling; a build above that ceiling is
// still a fault.
const CSS_TRIPWIRE_KB = 105;
const jsFiles = readdirSync('js').filter(f => f.endsWith('.js')).sort();
const jsRaw = jsFiles.map(f => readFileSync(join('js', f)));
const jsGzip = gzipSync(Buffer.concat(jsRaw), { level: 9 }).length / 1024;
const cssGzip = gzipSync(min, { level: 9 }).length / 1024;
const jsRawKb = jsRaw.reduce((n, b) => n + b.length, 0) / 1024;

console.log(`
  components   ${comps}
  tokens       ${tokens} unique --rux-*
  classes      ${classes} unique .rux--*
  cds leakage  none
  focus        ${focusRules} :focus → :focus-visible
  icons        ${iconTwins} path selectors also name use
  hardcoded    ${hardReferences.length} --cds- reference(s) renamed: ${hardReferences.join(', ') || 'none'}
  attribution  banner + NOTICE

  unminified   ${kb(statSync(OUT).size)}
  minified     ${kb(min.length)}
  gzipped      ${cssGzip.toFixed(1)} KB  (tripwire ${CSS_TRIPWIRE_KB} KB)

  js modules   ${jsFiles.length}
  js raw       ${jsRawKb.toFixed(1)} KB
  js gzipped   ${jsGzip.toFixed(1)} KB  (tripwire ${JS_TRIPWIRE_KB} KB)
`);

if (cssGzip > CSS_TRIPWIRE_KB) {
  console.error(`  TRIPWIRE: css/ is ${cssGzip.toFixed(1)} KB gzipped, over ${CSS_TRIPWIRE_KB}.`);
  console.error('  This is a smoke alarm, not a thermostat. Something structural has');
  console.error('  changed -- most likely a component family re-enabled. A theme');
  console.error('  does NOT reach this; see the note above. Re-open the set rather');
  console.error('  than the number.');
  process.exit(1);
}
if (jsGzip > JS_TRIPWIRE_KB) {
  console.error(`  TRIPWIRE: js/ is ${jsGzip.toFixed(1)} KB gzipped, over ${JS_TRIPWIRE_KB}.`);
  console.error('  This is a smoke alarm, not a thermostat. Something structural has');
  console.error('  changed -- most likely a library vendored into js/.');
  process.exit(1);
}
