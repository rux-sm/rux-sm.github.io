#!/usr/bin/env node
//
// Are two classes the stylesheet writes as a COMPOUND selector split across
// two elements here?
//
// THE DEFECT CLASS. Carbon distinguishes `.a .b` (b nested inside a) from
// `.a.b` (both on one element). Get that backwards and every other gate still
// passes: the classes resolve, check-classes is green, and the component
// renders wrong, because rules meant to override each other land on different
// boxes and stack instead. rux-ds hit this for real -- its tabs fragment nested
// `--tabs__nav-item` and `--tabs__nav-link`, and every selected tab drew a
// doubled underline.
//
// THIS CHECK WOULD NOT HAVE CAUGHT THAT ONE, and the header said it would until
// the claim was tested. This stylesheet never writes those two compounded; it
// writes `.rux--tabs .rux--tabs__nav-item--selected`, a descendant. The pair is
// therefore not evidence of anything here and is correctly ignored.
//
// WHAT IT DOES CATCH, measured rather than asserted: 316 pairs the stylesheet
// writes ONLY as a compound, which in practice is a component together with its
// own variant or state modifier -- `.rux--accordion.rux--skeleton`,
// `.rux--tabs.rux--tabs--contained`. Putting the skeleton or the variant on a
// child instead of on the component is the mistake this finds, and it is a
// mistake that looks fine until the overrides fail to apply.
//
// WHY THIS IS DERIVED FROM CSS AND NOT FROM CAPTURES. rux-ds answers structural
// questions by intersecting 641 captured Carbon DOM stories. This project
// vendors css/, assets/ and js/ — not docs/ — so those captures are not here,
// and vendoring 1.45 MB of them to run a second copy of a rule rux-ds already
// owns is the wrong trade. The vendored stylesheet is evidence this project
// already holds: a compound selector is a POSITIVE statement that two classes
// sit on one element.
//
// THE RULE THAT WAS TRIED AND REJECTED, recorded so nobody re-derives it.
// "A class never written bare in the CSS requires the ancestor it is always
// written under" looks like the same idea and is not. It produced 69 rules and
// they were wrong: `--btn--loading` came out requiring `--btn-set`, and
// `--ai-label__text` requiring `--tag`. A stylesheet is a set of styling rules,
// not a census of valid markup — a class may be STYLED in one context and VALID
// in many, so its absence elsewhere says nothing. A hit settles it; a miss
// settles nothing. Only the positive form ships.
//
// WHAT IT CANNOT SEE, said plainly because a green run is easy to over-read:
//   * a wrapper that is simply MISSING. Absence is the argument this check
//     refuses to make, so the whole class of defect rux-ds's check-ancestry
//     exists for is invisible here.
//   * whether a class is the RIGHT one, or the element type it sits on.
//   * ordering, spacing, contrast, behaviour, icons.
//   * any pair the stylesheet happens to write BOTH ways — legitimately
//     ambiguous, so it is never claimed.
//
//   node tools/check-structure.mjs <page.html> [more.html ...]
//   node tools/check-structure.mjs            # every .html at the repo root
//
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// Since 2026-09-10 (rux-ds roadmap §8.4 step 5) this project vendors nothing:
// the sibling checkout on main, or DS=<dir>.
const CSS = join(resolve(ROOT, process.env.DS ?? '../rux-ds'), 'css/rux.css');
const CLASS = /\.(rux--(?:\\.|[A-Za-z0-9_-])+)/g;
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr']);

// --- what the stylesheet says ------------------------------------------------

// A FUNCTIONAL PSEUDO-CLASS IS NOT A COMPOUND, and reading it as one was this
// file's first bug. `:has(.b)` on `.a` says b is a DESCENDANT of a -- the exact
// opposite of the two sharing an element -- but it sits inside the same
// whitespace-delimited unit, so a naive scan pairs them.
//
// It fired on real, correct markup: the vendored stylesheet writes
// `.rux--modal--decorator:has(.rux--ai-label) .rux--modal-container:has(.rux--modal-footer)`,
// from which the first version concluded that modal-container and modal-footer
// belong on one element. Run against rux-ds's own six templates and its kitchen
// sink -- pages that are verified correct -- it reported 23 splits, every one of
// them false. 344 units across the stylesheet fabricate a pair this way.
//
// THE THREE ARE NOT INTERCHANGEABLE, and treating them alike was the second
// mistake here. `:not(.x)` excludes and says nothing about structure, so it goes.
// `:is(.x)` and `:where(.x)` are alternatives AT THIS POSITION -- the element
// itself matches .x -- so their contents are inlined rather than dropped.
// Stripping them lost the descendant half of
// `.rux--layout--size-md :where(.rux--popover-content)`, which is exactly what
// makes that pair ambiguous, and the ambiguity is what should retire it: the
// stylesheet also writes `.rux--popover-content.rux--layout--size-md`, so
// Carbon composes it both ways and neither is a rule.
// `:has(.x)` is handled separately below, as evidence of nesting.
// Innermost-first, so `:not(:has(.x))` unwinds.
const NOT_PSEUDO = /:not\(([^()]*)\)/g;
const ALT_PSEUDO = /:(?:is|where|matches|any)\(([^()]*)\)/g;
function outerOnly(unit) {
  let prev, s = unit;
  do {
    prev = s;
    s = s.replace(NOT_PSEUDO, '').replace(ALT_PSEUDO, (_, inner) => inner);
  } while (s !== prev);
  return s;
}
// `:has(.b)` is positive evidence of nesting, so it is recorded as such rather
// than merely dropped -- which also removes the pair from `compound` below via
// the ambiguity rule. `:not()` says nothing about structure and `:is()`/`:where()`
// are alternatives at one position, so neither is treated as evidence either way.
function hasDescendants(unit) {
  const out = [];
  for (const m of unit.matchAll(/:has\(([^()]*)\)/g))
    out.push(...[...m[1].matchAll(CLASS)].map(x => x[1].replace(/\\/g, '')));
  return out;
}

function compoundPairs(css) {
  const compound = new Map();   // "a\0b" -> true, written on one element
  const nested = new Set();     // "a\0b", written as ancestor/descendant
  const body = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const [, block] of body.matchAll(/([^{}]+)\{/g)) {
    for (const selector of block.split(',')) {
      if (!selector.includes('rux--')) continue;
      const chain = [];
      for (const unit of selector.trim().split(/\s*[>+~]\s*|\s+/)) {
        const here = [...outerOnly(unit).matchAll(CLASS)].map(m => m[1].replace(/\\/g, ''));
        for (const d of hasDescendants(unit))
          for (const c of [...here, ...chain]) nested.add(key(c, d));
        if (!here.length) continue;
        for (let i = 0; i < here.length; i++)
          for (let j = i + 1; j < here.length; j++)
            compound.set(key(here[i], here[j]), true);
        for (const c of here) for (const a of chain) nested.add(key(a, c));
        chain.push(...here);
      }
    }
  }
  // A pair the stylesheet writes BOTH ways is genuinely ambiguous and is
  // dropped. Keeping it would demand a composition Carbon treats as optional --
  // the same reason rux-ds intersects rather than unions.
  for (const k of nested) compound.delete(k);
  return new Set(compound.keys());
}

const key = (a, b) => (a < b ? `${a}\0${b}` : `${b}\0${a}`);

// --- what the page says ------------------------------------------------------

function elements(html) {
  // A tag stack, not a parser. Enough to know which classed elements are above
  // which -- comments and <script>/<style> bodies are removed first so a tag
  // written inside one cannot unbalance the stack.
  const clean = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  const out = [];
  const stack = [];
  const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*?)(\/?)>/g;
  let line = 1, last = 0;
  for (const m of clean.matchAll(TAG)) {
    line += (clean.slice(last, m.index).match(/\n/g) || []).length;
    last = m.index;
    const [, closing, rawTag, attrs, selfClose] = m;
    const tag = rawTag.toLowerCase();
    if (closing) {
      for (let i = stack.length - 1; i >= 0; i--)
        if (stack[i].tag === tag) { stack.length = i; break; }
      continue;
    }
    const classes = (attrs.match(/class\s*=\s*["']([^"']*)["']/) || [, ''])[1]
      .split(/\s+/).filter(c => c.startsWith('rux--'));
    if (classes.length) out.push({ tag, classes, line, ancestors: stack.map(s => s) });
    if (!VOID.has(tag) && !selfClose) stack.push({ tag, classes, line });
  }
  return out;
}

// --- run ---------------------------------------------------------------------

const pairs = compoundPairs(readFileSync(CSS, 'utf8'));
// EVERY PAGE, NOT EVERY PAGE AT THE ROOT — see the same note in
// check-classes.mjs. This stopped at the repository root until 2026-08-31,
// when tools/build.mjs began writing generated guides into `guides/`; the
// no-argument form would have swept one file and reported a clean run.
const SKIP = new Set(['node_modules', 'vendor', 'build', '.git']);

function walkPages(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return SKIP.has(entry.name) ? [] : walkPages(path);
    return entry.name.endsWith('.html') ? [path] : [];
  });
}

const args = process.argv.slice(2);
const pages = args.length ? args : walkPages(ROOT).sort();

let findings = 0, checked = 0;
for (const page of pages) {
  const els = elements(readFileSync(page, 'utf8'));
  const name = relative(ROOT, page);
  let hits = 0;
  for (const el of els) {
    for (const ancestor of el.ancestors) {
      for (const a of ancestor.classes) {
        for (const b of el.classes) {
          checked++;
          if (!pairs.has(key(a, b))) continue;
          // ALREADY SATISFIED ON ONE ELEMENT, so there is nothing split. This
          // was the second false positive: a nested ordered list is
          // `<ol class="rux--list--ordered">` wrapping
          // `<ol class="rux--list--ordered rux--list--nested">`, and the pair IS
          // compounded -- on the inner one. Seeing only the outer element's
          // `--ordered` against the inner's `--nested` reports a split that the
          // very same element disproves. A repeated class on an ancestor is
          // normal nesting, not a mistake.
          if (el.classes.includes(a) || ancestor.classes.includes(b)) continue;
          hits++; findings++;
          console.log(`  ${name}:${el.line}  ${a} and ${b} are written as one`);
          console.log(`      element in the stylesheet, but sit on different `
            + `elements here (${ancestor.tag} line ${ancestor.line} > ${el.tag}).`);
          console.log(`      Rules meant to override each other will stack instead.`);
        }
      }
    }
  }
  if (!hits) console.log(`  ${name}: ${els.length} classed elements, no split compounds`);
}

console.log(`\n  ${pairs.size} compound-only pairs in the vendored stylesheet `
  + `· ${checked} ancestor/descendant class pairs checked · ${findings} split`);
console.log(`  This says no pair Carbon writes on ONE element is split across two here.`);
console.log(`  It says nothing about a wrapper that is missing entirely -- see the header.`);
process.exit(findings ? 1 : 0);
