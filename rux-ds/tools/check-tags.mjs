#!/usr/bin/env node
//
// A class must sit on the ELEMENT TYPE Carbon renders it on.
//
// roadmap §4.1.11 lists what check-compound cannot see: "pairs Carbon never
// writes as a compound selector, wrong nesting *order*, a missing wrapper, or
// the wrong element type." This is the last of those four. Every name-based
// gate passes a `<div>` wearing a class Carbon renders on a `<ul>` — the class
// resolves, the co-classes are satisfied, the compound is intact — and the
// semantics, the ARIA tree and often the layout are all wrong.
//
// Two defects already in the record are of exactly this shape. Multiselect's
// menu was a `div` of `div`s where React renders a `ul` of `li`s, and tabs put
// `--tabs__nav-link` on an `<a>` where React uses a `<button>`. Reconstructing
// either markup, this checker flags it; the corrected fragments come back clean.
//
// A GATE since 2026-08-27, when all fifty findings of the first full run were
// adjudicated — most by fixing the fragment to Carbon's element, the residue
// by a recorded decision in the fragment itself. KNOWN below carries exactly
// that residue: each entry is a deliberate divergence or a reference sampling
// gap, states its reason, and has a fuller account in the fragment beside the
// markup it describes. This follows check-tokens' KNOWN precedent — a bounded,
// reasoned list is not the ignore-list the no-list rule forbids, because the
// gate still measures the rule for everything else and a new divergence fails
// the build. Answer a new finding the same way: fix the fragment, or record
// the decision there AND here.
//
// WHY THERE IS NO FRAGMENT-TO-STORY MAP. The first design mapped each fragment
// to the stories covering it, which needed 26 hand-written entries and stalled
// on `dialog`, `resizer` and `side-panel`, none of which has an @carbon/react
// story (side-panel has since been given one from @carbon/ibm-products; the
// other two still have none). The map turned out to be unnecessary: THE CLASS IS THE JOIN KEY. Pool
// every story into one class -> tags index and a fragment's classes look
// themselves up. Fragments with no reference contribute classes the index does
// not know, and those are skipped and counted rather than guessed at.
//
// WHAT IT DELIBERATELY DOES NOT CHECK. Ancestry was tried and abandoned. The
// Storybook wraps every component in its own chrome — `div.cds--layout`,
// `tooltip-trigger__wrapper`, `grid`/`row`/`col-lg-13` — which our fragments
// have no reason to reproduce, and reference parents carry classes we drop on
// purpose because @carbon/styles has no rule for them and check-classes would
// reject them. Both produced false positives on fragments already verified by
// hand. Class PRESENCE fails the same way in both directions: the reference is
// full of story decoration we should not copy, and our fragments demo states no
// story happens to show — multiselect's menu is closed in every one of them, so
// all ten of its menu-item classes look invented. Tag placement is the part
// that survived contact with the two hand-verified fragments.
//
// The references are snapshots, harvested by tools/extract/react-dom.js against
// each Storybook origin. A Carbon bump can move a tag legitimately, and the
// answer then is to re-harvest, not to soften this.
//
import { readFileSync } from 'node:fs';
import { markupFiles } from './lib/sources.mjs';

// Entries whose fragment moved to sink/deferred/ in the Phase 3 strip are kept
// rather than deleted: the adjudication behind them is still true, and deleting
// it would mean re-deciding from scratch if the component is restored. They
// simply match nothing while the component is stripped.
//
// class -> { tag, reason }: the adjudicated residue. The reason here is the
// summary; the fragment carries the full account next to the markup.
const KNOWN = {
  'btn':                    { tag: 'a', reason: 'Button href API renders <a>; no story samples it (buttons.html)' },
  'btn--ghost':             { tag: 'a', reason: 'ghost link button, same href form (buttons.html)' },
  'btn--disabled':          { tag: 'a', reason: 'the class-form disabled exists FOR anchors (buttons.html)' },
  'layout--size-xl':        { tag: 'button', reason: 'no story renders an xl button; pairing on the button is Carbon idiom (buttons.html)' },
  'contained-list__label':  { tag: 'h3', reason: 'a heading where Carbon uses a div + ARIA (contained-list.html)' },
  'full-page-error__title': { tag: 'h2', reason: 'standalone h1 lowered only inside the assembled sink outline (full-page-error.html)' },
  'tile--disabled':         { tag: 'div', reason: 'classic selectable tile is div[role=checkbox]; only the feature-flag story disables, as a label (tile.html)' },
  'tree-node--active':      { tag: 'li', reason: 'active sampled only in the link tree, on <a>; non-link nodes are LIs (treeview.html)' },
  'content':                { tag: 'div', reason: 'the kitchen sink already has its one <main>; the side-panel specimens sit in a content region written as a div (side-panel.html)' },
  'pagination-nav__page--active': { tag: 'div', reason: 'the icon wrapper when the current page sits in the overflow select -- Carbon writes `.select-icon-wrapper.page--active` and check-compound asks for it; the one story samples the active BUTTON only (pagination-nav.html)' },
};

// Four references, because two packages ship the components this system
// compiles and each origin was harvested twice — once as its stories render,
// once with the state recipes. @carbon/styles pulls in side-panel and
// page-header, and @carbon/react has neither; they live in
// @carbon/ibm-products, whose Storybook is a separate origin with its own
// `c4p--` prefix. The class NAMES are identical, so normalising the prefix away
// makes it a valid reference for exactly the same check.
const REF_PATHS = [
  'docs/carbon-react-dom.json',           // @carbon/react, 505 stories
  'docs/carbon-ibm-products-dom.json',    // @carbon/ibm-products: side-panel, page-header, create pattern
  'docs/carbon-react-states.json',        // configured states, from the RECIPES harvest
  'docs/carbon-ibm-products-states.json', // same, run against the ibm-products origin
];
const PREFIX = /^(?:cds|c4p)--/;

// Void and self-closing elements never open a scope. The SVG members matter:
// fragments are full of <use/> and <path/>, and treating them as containers
// would corrupt every depth below them.
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
  'use', 'path', 'circle', 'rect', 'polygon', 'stop', 'ellipse', 'line']);

// Structural parse of an authored fragment. A regex is enough here and a real
// parser would be a dependency: the sink HTML is hand-written and well-formed —
// every attribute quoted, every non-void element closed. Comments go first so
// the commented-out markup the fragments carry for explanation is not read as
// markup. Only the tag and its rux-- classes are kept; depth is tracked but not
// used, because ancestry is not part of this check (see above).
function elements(html) {
  const src = html.replace(/<!--[\s\S]*?-->/g, '');
  const out = [];
  const re = /<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;
  let m;
  while ((m = re.exec(src))) {
    const [, closing, tag, attrs, selfClose] = m;
    if (closing) continue;
    const t = tag.toLowerCase();
    const classes = (attrs.match(/\sclass="([^"]*)"/) ?? [, ''])[1]
      .split(/\s+/).filter(c => c.startsWith('rux--')).map(c => c.slice(5));
    if (classes.length) out.push({ tag: t, classes });
    if (!selfClose && !VOID.has(t)) { /* depth unused; see header */ }
  }
  return out;
}

// A reference line is '  '*depth + tag + '.' + cls.cls + [role=…] + {aria=…}
function refElements(lines) {
  return lines.map(l => {
    const body = l.trim().replace(/\[role=[^\]]*\]/, '').replace(/\{[^}]*\}/, '');
    const [tag, ...cls] = body.split('.');
    return { tag, classes: cls.filter(Boolean).map(c => c.replace(PREFIX, '')) };
  });
}

// class -> every tag Carbon renders it on, pooled across every story.
// Pooling is what makes the map unnecessary, and it is also the main dilution:
// a class React puts on both a <button> and a <div> accepts either from us,
// even where only one is right for the variant being demoed. Narrower stories
// per class would sharpen this; they would also bring the map back.
const TAGS = new Map();
let stories = 0;
// `_`-PREFIXED KEYS ARE METADATA, NOT STORIES. The capture files carry a `_meta`
// recording which Carbon they came from -- see roadmap 4.8. Every reader of a
// capture skips them, the same convention carbon-slots.json and
// carbon-co-classes.json have always used.
const refs = REF_PATHS.flatMap(p => Object.entries(JSON.parse(readFileSync(p, 'utf8')))
  .filter(([id]) => !id.startsWith('_')).map(([, lines]) => lines));
for (const lines of refs) {
  if (lines[0]?.startsWith('(')) continue;      // (missing)/(empty) markers carry no DOM
  stories++;
  for (const { tag, classes } of refElements(lines))
    for (const c of classes) (TAGS.get(c) ?? TAGS.set(c, new Set()).get(c)).add(tag);
}

const files = markupFiles();          // sink/*.html + templates/*.html
let findings = 0, checked = 0, unknown = 0, known = 0;

for (const file of files) {
  const rows = [];
  const seen = new Map();                       // class -> tags this fragment uses
  for (const { tag, classes } of elements(readFileSync(file.path, 'utf8')))
    for (const c of classes) (seen.get(c) ?? seen.set(c, new Set()).get(c)).add(tag);

  for (const [c, tags] of seen) {
    if (!TAGS.has(c)) { unknown++; continue; }   // no story emits it; nothing to compare
    checked++;
    for (const t of tags) {
      if (TAGS.get(c).has(t)) continue;
      if (KNOWN[c]?.tag === t) { known++; continue; }
      rows.push([c, t, [...TAGS.get(c)].sort().join('|')]);
    }
  }
  if (!rows.length) continue;
  console.log(`  ${file.path}`);
  for (const [c, mine, theirs] of rows.sort())
    console.log(`      rux--${c}  <${mine}>  Carbon renders it on <${theirs}>`);
  findings += rows.length;
}

console.log(`\n  ${stories} stories · ${checked} classes checked · ${unknown} with no reference`
  + ` · ${known} known divergences · ${findings} on a different element`);
if (findings) {
  console.log('  a class must sit on the element Carbon renders it on — fix the fragment,');
  console.log('  or record the divergence in the fragment AND in KNOWN (see the header)');
  process.exit(1);
}
