#!/usr/bin/env node
//
// Write docs/token-values.json: every --rux-* value css/rux.css DECLARES, keyed
// by the context that declares it. Phase 8's token snapshot, roadmap §4.8.
//
// WHY THIS GATE EXISTS AND WHY IT IS THE ONE MOST LIKELY TO BE SKIPPED. Every
// other gate here is NAME-based. check-classes asks whether a class resolves,
// check-tokens whether a token is defined, check-tags whether an element
// carries the class a capture recorded. A Carbon bump that moves
// --rux-layer-01 from one grey to another changes no name, so it passes all of
// them in silence and ships a different-looking product. §4.8 says this is the
// gate that matters most; rux-ui was bitten by exactly this.
//
// DECLARED, NOT COMPUTED, decided 2026-09-02. A computed snapshot would read
// getComputedStyle in a browser and catch more -- the cascade, one theme
// leaking into another, an override winning where it should not. It would also
// need a browser, which makes it a sixth owed sweep rather than something
// npm run verify can run, and it would report a value without saying which
// declaration produced it. This reads the stylesheet, runs anywhere, and names
// the exact context of every value. What it CANNOT see is stated in the gate's
// blindTo: a value that changes only through the cascade.
//
// WHY THE CONTEXT IS PART OF THE KEY. The same token name legitimately holds
// different values in different places: --rux-layer-01 has one value under
// :root and another under [data-theme=g90], and --rux-grid-columns is 4, 8 and
// 16 under three breakpoints. Keying by name alone would make those collide and
// the snapshot would record whichever came last -- a gate that reports a stable
// number while the values move, which is worse than no gate.
//
// WHY A HAND-WRITTEN SCANNER AND NOT A REGEX. 409 of these declarations sit
// inside an @media block. The obvious /([^{}]+)\{([^{}]*)\}/ cannot see an
// at-rule at all: it matches the INNER rule and drops the media context, so all
// three --rux-grid-columns values key to the same string and two of them are
// lost. Braces are counted properly here, with comments and strings skipped so
// a brace inside either cannot move the depth.
//
//   node tools/build-token-values.mjs [out.json]
//
import fs from 'node:fs';
import { extract, SRC } from './lib/token-values.mjs';

const OUT = process.argv[2] ?? 'docs/token-values.json';
const { values, declarations, duplicates } = extract();

const out = {
  _meta: {
    generated: new Date().toISOString().slice(0, 10),
    source: SRC,
    contexts: Object.keys(values).length,
    declarations,
    note: "Declared values only. A value that changes through the cascade is invisible here; see the gate's blindTo.",
    ...(duplicates.length ? { duplicatesFound: duplicates.length } : {}),
  },
  values,
};

fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
for (const d of duplicates) console.log(`  duplicate: ${d}`);
console.log(`  ${OUT} — ${declarations} declaration(s) across ${Object.keys(values).length} context(s)` +
  (duplicates.length ? ` · ${duplicates.length} duplicate(s)` : ''));
