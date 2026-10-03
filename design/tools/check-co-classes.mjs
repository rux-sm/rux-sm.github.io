#!/usr/bin/env node
//
// A Carbon modifier used without the base class that supplies its appearance is
// invisible to every other gate: the class resolves, the component is "covered",
// and the element silently renders with the browser's default chrome.
//
// THE RULE IS READ OFF THE CAPTURES EACH RUN, so there is no reference of its
// own to go stale. A modifier is a class with a `--` in it and its base is
// everything before the last one: `btn--primary` has `btn`,
// `tile__checkmark--persistent` has `tile__checkmark`. The modifier needs its
// base on the same element when
//
//   * every captured element that carries the modifier also carries the base,
//   * across MIN_STORIES or more stories, check-ancestry's bar for its reason:
//     one or two stories describe a story, not a component, and
//   * css/rux.css defines the base, because a class nothing defines cannot be
//     written (§4.1.12).
//
// Carbon does not always follow the pattern. `popover--caret` sits on
// `popover-container`, never beside `popover`, so the first test fails and no
// rule is made. Nothing is listed as an exception.
//
// ALSO is the short list of pairs the naming cannot find, each one a pairing
// Carbon's own selectors depend on. They are checked against the captures like
// the rest: a pair Carbon stops rendering together fails here as a stale rule.
//
// WHAT IT CANNOT SEE: a pairing the naming does not show and ALSO does not
// name; a modifier no capture renders; a base that is present but on the wrong
// element, which is check-tags' and check-ancestry's to find.
//
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { pageFiles } from './lib/sources.mjs';
import { classNames } from './lib/ownership.mjs';
import { captureName } from './lib/capture-names.mjs';

const REF_PATHS = [
  'data/carbon-react-dom.json',
  'data/carbon-ibm-products-dom.json',
  'data/carbon-react-states.json',
  'data/carbon-ibm-products-states.json',
];
const MIN_STORIES = 3;

const ALSO = {
  'popover--high-contrast': [['popover-container'],
    'its rules are `.popover--high-contrast .popover…`: on any other element it styles nothing'],
  'popover--drop-shadow': [['popover-container'],
    'its rule is `.popover--drop-shadow .popover`: on any other element it styles nothing'],
  'password-input': [['text-input'],
    'the password field is a text input with one rule of its own'],
  'password-input-wrapper': [['form-item', 'text-input-wrapper'],
    'the wrapper takes its layout from both'],
};

const DEFINED = classNames(readFileSync('css/rux.css', 'utf8'));

// class -> the classes on EVERY captured element that carries it
const together = new Map();
const seenIn = new Map();    // class -> Set(story id)
for (const path of REF_PATHS) {
  for (const [id, lines] of Object.entries(JSON.parse(readFileSync(path, 'utf8')))) {
    if (id.startsWith('_')) continue;            // `_meta` is provenance, not a story
    if (lines[0]?.startsWith('(')) continue;     // a capture that did not render
    const story = id.split('@')[0];              // a state recipe is its story again
    for (const line of lines) {
      const body = line.trim().replace(/\[role=[^\]]*\]/, '').replace(/\{[^}]*\}/, '');
      const classes = body.split('.').slice(1).filter(Boolean).map(captureName);
      for (const c of classes) {
        const others = classes.filter(x => x !== c);
        together.set(c, together.has(c) ? together.get(c).filter(x => others.includes(x)) : others);
        if (!seenIn.has(c)) seenIn.set(c, new Set());
        seenIn.get(c).add(story);
      }
    }
  }
}

const baseOf = c => { const i = c.lastIndexOf('--'); return i > 0 ? c.slice(0, i) : null; };

const required = new Map();   // class -> [classes it needs beside it]
for (const [c, beside] of together) {
  const base = baseOf(c);
  if (!base || !beside.includes(base)) continue;
  if ((seenIn.get(c)?.size ?? 0) < MIN_STORIES) continue;
  if (!DEFINED.has(`rux--${base}`)) continue;
  required.set(c, [base]);
}
const derived = required.size;

const stale = [];
for (const [c, [needs]] of Object.entries(ALSO)) {
  const beside = together.get(c);
  const gone = needs.filter(n => !beside?.includes(n));
  if (!beside || gone.length) { stale.push(`${c} → ${gone.join(' + ') || needs.join(' + ')}`); continue; }
  required.set(c, [...new Set([...(required.get(c) ?? []), ...needs])]);
}

function walk(p, out = []) {
  if (!statSync(p, { throwIfNoEntry: false })) return out;
  if (statSync(p).isDirectory()) { for (const f of readdirSync(p)) walk(join(p, f), out); return out; }
  if (extname(p) === '.html') out.push(p);
  return out;
}

let findings = 0, uses = 0;
for (const file of pageFiles().flatMap(r => walk(r))) {
  // Comments quote class attributes to explain them; only markup is checked.
  const html = readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  for (const m of html.matchAll(/class="([^"]*)"/g)) {
    const own = new Set(m[1].split(/\s+/).filter(c => c.startsWith('rux--')).map(c => c.slice(5)));
    for (const c of own) {
      const needs = required.get(c);
      if (!needs) continue;
      uses++;
      const missing = needs.filter(n => !own.has(n));
      if (!missing.length) continue;
      console.log(`  ${file}`);
      console.log(`      rux--${c} used without ${missing.map(n => `rux--${n}`).join(' + ')}`);
      console.log(`      in: ${m[1].slice(0, 88)}`);
      findings++;
    }
  }
}

for (const s of stale) console.log(`  STALE RULE  ${s} — Carbon no longer renders these together in every capture`);

console.log(`\n  ${derived} modifier-needs-base rules read from the captures · ${Object.keys(ALSO).length} named pairs`
  + ` · ${uses} uses checked · ${findings} violation${findings === 1 ? '' : 's'}`
  + (stale.length ? ` · ${stale.length} stale` : ''));
process.exit(findings || stale.length ? 1 : 0);
