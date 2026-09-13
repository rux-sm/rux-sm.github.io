#!/usr/bin/env node
//
// Every var(--rux-*) must resolve to a declared token, or carry a fallback.
//
// The sibling gate check-classes.mjs proves a CLASS has a rule behind it. Nothing
// proved the same for a TOKEN, and the failure is quieter: an unresolved var() with
// no fallback makes the whole declaration invalid, the browser drops it, and the
// element renders with whatever it inherited. No error, no 404, no failing class.
//
// Roadmap §4.1.2 is the precedent — omitting @carbon/styles/scss/layout left
// --rux-layout-size-height-lg referenced 27 times and declared 3. The build was
// clean, every class resolved, and buttons were collapsed to text height. Only
// looking at the page found it. This gate would have.
//
// Narrower than the token snapshot planned in §4.8: that catches a VALUE moving
// under a stable name. This catches a NAME that resolves to nothing.
//
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { pageFiles } from './lib/sources.mjs';

// Declarations live in the built CSS; references may appear anywhere that ships.
const DEFINES = ['css/rux.css', 'sink/harness.css'];
// Phase 10's customization files REFERENCE tokens like a page and are gated
// like one, but they do not DEFINE any: a name css/rux-theme.css introduces is
// a token no component reads, and the loop below fails on it. 2026-09-02.
const CUSTOM_CSS = ['css/rux-theme.css', 'css/rux-overrides.css'];
const ROOTS = pageFiles(['css/rux.css', 'sink/harness.css', ...CUSTOM_CSS]);

// Carbon custom properties its React/Lit layer sets at runtime and its light-DOM CSS
// never declares. Each is unreachable from the markup we ship, and declaring a value
// here would be authoring a Carbon default Carbon does not ship — §1.1 forbids it.
// Same treatment as --action-set--stacking and --pageheader-title-grid-width (§4.1.9),
// and as the _ignored map in docs/carbon-co-classes.json: recorded, not faked.
const KNOWN = {
  '--rux--card--label-line-clamp': 'card __label--truncate; set by the consumer',
  '--rux--card--title-line-clamp': 'card __title--truncate; set by the consumer',
  '--rux--card--description-line-clamp': 'card __description--truncate; set by the consumer',
  '--rux--side-panel--scroll-animation-distance': 'side-panel scroll animation; set from JS',
};

function walk(p, out = []) {
  if (!statSync(p, { throwIfNoEntry: false })) return out;
  if (statSync(p).isDirectory()) { for (const f of readdirSync(p)) walk(join(p, f), out); return out; }
  if (['.css', '.html'].includes(extname(p))) out.push(p);
  return out;
}

const defined = new Set();
for (const f of DEFINES.flatMap(r => walk(r)))
  for (const m of readFileSync(f, 'utf8').matchAll(/(--rux-[a-zA-Z0-9_-]+)\s*:/g)) defined.add(m[1]);

let bad = 0, hedged = 0, refs = new Set();
for (const f of CUSTOM_CSS) {
  const src = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of src.matchAll(/(--rux-[a-zA-Z0-9_-]+)\s*:/g)) {
    if (defined.has(m[1])) continue;
    console.log(`  INVENTED    ${m[1].padEnd(46)} ${f}`);
    bad++;
  }
}
for (const f of ROOTS.flatMap(r => walk(r))) {
  const seen = new Set();
  // capture the token, and whether a comma — i.e. a fallback — follows it
  for (const m of readFileSync(f, 'utf8').matchAll(/var\(\s*(--rux-[a-zA-Z0-9_-]+)\s*(,)?/g)) {
    const [, token, fallback] = m;
    refs.add(token);
    if (defined.has(token)) continue;
    if (fallback) { hedged++; continue; }   // unresolved but survivable — Carbon's override idiom
    if (KNOWN[token]) continue;
    if (seen.has(token)) continue;
    seen.add(token);
    console.log(`  UNRESOLVED  ${token.padEnd(46)} ${f}`);
    bad++;
  }
}

console.log(`\n  tokens defined ${defined.size} · referenced ${refs.size} · with fallback ${hedged} · known-unset ${Object.keys(KNOWN).length} · unresolved ${bad}`);
process.exit(bad ? 1 : 0);
