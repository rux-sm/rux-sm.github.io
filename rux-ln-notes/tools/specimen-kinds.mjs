// tools/specimen-kinds.mjs -- the kind vocabulary, three ways, side by side.
//
// WHY IT EXISTS. docs/diagram.md proposes replacing five unkeyed hues
// with three forms and one accent, and a plan about how something LOOKS cannot
// be settled by reading it. This draws the alternatives against the real
// diagrams so the choice is made by looking.
//
// IT WRITES INTO build/, WHICH IS GIT-IGNORED AND NEVER PUBLISHED. This is a
// decision aid, not a page. `check-publishable` skips `build/` by name, so the
// specimen does not become a 38th page in MEASURED, and AGENTS.md's rule that
// markup lives in build.mjs is untouched: nothing here is authored twice.
//
// THE MARKUP IS THE REAL MARKUP, LIFTED WHOLE. The figure and the entire
// inlined stylesheet are copied out of the built pages, so variant A is the
// live site byte for byte and every variant differs from it by CSS alone. A
// hand-drawn mock-up would prove nothing -- the thing being judged is how these
// treatments behave in a grid whose columns are `1fr` and size to their widest
// tile, which is exactly what a mock-up gets wrong.
//
// SINCE 2026-09-11 IT IS HALF THE INSTRUMENT, AND THE HALF ONLY A BROWSER CAN
// BE. `tools/tile-looks.mjs` resolves the same five properties out of the page's
// own CSS in Node, so the figures reach `MEASURED` and survive a diff -- but it
// compares TOKEN NAMES, and two tokens that paint the same value in one theme
// are a collision it cannot see. That is this page: the painted colour, per
// theme, switchable. Neither replaces the other, and the tile-looks header says
// the same thing from its side.
//
//   node tools/specimen-kinds.mjs && open the URL it prints
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// THE SESSION MAP IS THE CONTROL AND THE OVERVIEW IS THE CASE. All 24 of the
// map's nodes are sessions, so the new form draws nothing there and any change
// it shows is a change the plan did not intend. Nine of the overview's
// seventeen are not sessions, and three of its kinds collide today.
// THE SESSION MAP IS FIRST BECAUSE IT IS THE ONLY DOCUMENT WITH ALL FIVE
// CATEGORIES. The overview has 0 Inquiry tiles of 17 and 0 `guide` links of 17,
// so a proposal about either draws nothing there -- and with the overview first
// a reader met four types and an unchanged canvas before reaching anything the
// variants do. The overview stays as the second section, where its two absences
// are the point rather than a confusion.
const DOCS = [
  ['session map', 'guides/demand-to-shipment-session-map.html',
    'Level 2. All five categories, 26 of 26 openable, 26 of 26 carrying a guide.',
    'demand-to-shipment-session-map'],
  ['overview', 'guides/order-to-shipment-overview.html',
    'Level 1. Four categories — no Inquiry at all — and not one of its 17 nodes carries a guide.',
    'order-to-shipment-overview'],
];

const slice = (html, open, close) => {
  const i = html.indexOf(open);
  const j = html.indexOf(close, i);
  if (i < 0 || j < 0) throw new Error(`could not find ${open}`);
  return html.slice(i, j + close.length);
};

const first = read(DOCS[0][1]);
const baseCss = slice(first, '<style>', '</style>').replace(/^<style>|<\/style>$/g, '');

// BESIDE THE PATH IS A FACT ABOUT EDGES, WHICH CSS CANNOT SEE. Whether a node
// is a session is in the markup already -- it has a code or it has not -- but
// whether it is ever WALKED is a property of the edge list, and the figure
// carries no edges. So the class is injected here, from the data, into the
// markup of EVERY variant. Variants that do not style it are unaffected and the
// comparison stays CSS-only; if a treatment is chosen, build.mjs emits the
// class outright and this goes away.
//
// THE TEST IS "NO `flow` EDGE, IN OR OUT". A node the sequence never enters or
// leaves is one you do not step through -- it has to be true for the path to
// work, and you go and make it true separately. It lands on exactly the right
// four nodes of the overview (the whole Master Data lane: items, the purchase
// item, the BOM and routing, the planning cluster row) and exactly the right
// three of the session map (the parameter and inventory checks, which D3 of
// the map already calls reads rather than numbered steps). It needs no lane to
// be named "Master Data" and no new field from atlas.
const offPathIds = (dg) => {
  const walked = new Set();
  for (const e of dg.edges ?? []) if (e.kind === 'flow') { walked.add(e.from); walked.add(e.to); }
  return new Set((dg.nodes ?? []).filter((n) => !walked.has(n.id)).map((n) => n.id));
};

// TILE ORDER IS THE ORDER build.mjs EMITS CELLS -- lane by lane, and inside a
// lane stage by stage. Reproducing it here is what lets an index line a tile up
// with its node. The count is asserted rather than trusted: if build.mjs ever
// changes that loop, this stops silently agreeing and says so.
const nodeOrder = (dg) => (dg.lanes ?? []).flatMap((l) =>
  (dg.stages ?? []).flatMap((st) =>
    (dg.nodes ?? []).filter((n) => n.lane === l.name && n.stage === st.n)));

// THE FIVE CATEGORIES, DECIDED BY RUX 2026-09-10, AND WHAT EACH IS DERIVED
// FROM. Four of the five fall straight out of what atlas already sends:
//
//   check   `gate` or `decision` -- a condition that decides, three of the four
//           silently. It is a category and not a shade of Information because
//           Information is something you consult and a Check is where the run
//           dies quietly. Section 2 of the map exists for these.
//   result  `planned`, `real`, `outcome` or `terminal`, ON the route -- what
//           now exists because of the step before. Not something you do.
//   step    everything else on the route.
//   config  no `flow` edge -- set up once, then ready.
//
//   reading `kind` is `read` -- opened to find out what is true now.
//
// THE FIFTH IS `read`, AND THIS FILE CLAIMED IT WAS NOT DERIVABLE. It carried a
// named stand-in list and the ask to atlas requested a signal, both on
// the grounds that nothing separated Inventory 360 from Production Order
// Parameters. Both were wrong and both are withdrawn: the mistake was trying to
// SPLIT the three `read` nodes, having taken D3's "the two configuration
// sessions" to mean two of them were configuration. They are sessions about
// configuration, which you open and read. A Prerequisite is set up once and is
// then ready; a Reading is opened to find out what is true now -- and all three
// are Readings. The Prerequisites are the other four, none of them `read`.
//
// `read` IS TESTED BEFORE THE PATH, because a Reading need not be beside the
// route: checking stock mid-sequence is still a Reading, and it would take the
// solid container the path gives it and keep the italic name.
const categoryOf = (n, off) => {
  if (n.kind === 'gate' || n.kind === 'decision') return 'check';
  if (n.kind === 'read') return 'info';
  if (off) return 'config';
  if (['planned', 'real', 'outcome', 'terminal'].includes(n.kind)) return 'result';
  return 'step';
};

const markOffPath = (fig, dg) => {
  const order = nodeOrder(dg), off = offPathIds(dg);
  let i = 0;
  // The page now ships its own `ln-dg-cat--*`; match past it and replace it, so
  // the specimen stays in charge of what every variant is labelled with.
  const out = fig.replace(/class="ln-dg-node ln-dg-node--([a-z]+)(?: ln-dg-cat--[a-z]+)?"/g, (m, kind) => {
    const node = order[i++];
    if (!node) throw new Error('more tiles in the figure than nodes in the data');
    if (node.kind !== kind) throw new Error(`tile ${i} is ${kind}, node ${node.id} is ${node.kind}`);
    const extra = (off.has(node.id) ? ' ln-dg-node--off-path' : '')
      + (node.guide ? ' ln-dg-node--has-guide' : '')
      + ` ln-dg-cat--${categoryOf(node, off.has(node.id))}`;
    return `class="ln-dg-node ln-dg-node--${kind}${extra}"`;
  });
  if (i !== order.length) throw new Error(`${i} tiles, ${order.length} nodes`);
  return out;
};

const figures = DOCS.map(([name, path, note, json]) => {
  const dg = JSON.parse(read(`data/guides/${json}.json`)).diagram;
  const fig = slice(read(path), '<figure class="rux--tile ln-dg"', '</figure>');
  const off = offPathIds(dg).size;
  return [name, `${note} ${off} of ${dg.nodes.length} sit beside the path.`,
    markOffPath(fig, dg)];
});

// A VARIANT IS CSS AND NOTHING ELSE, and `:has()` is why it can be. Whether a
// node is a session is already in the markup -- a tile with a code renders
// `.ln-dg-node-code` and a tile without one renders nothing -- so the third
// form is selectable without a single new class, a new attribute or a change
// to build.mjs. If the plan is taken, build.mjs should still emit the class
// outright rather than leaning on this; here it keeps the variants honest by
// making the markup provably identical across all three.
const NOT_A_SESSION = '.ln-dg-node:not(:has(.ln-dg-node-code))';

// ONE VARIANT NOW, AND THAT IS A REPOINT RATHER THAN AN EDIT. This file was
// built to compare five ways of drawing the tile against the live site, with
// variant A as "today" -- and it lifts its CSS out of the BUILT PAGES, so the
// day E shipped, A became E. Measured on the first run after: A and E scored
// identically, 0 colliding and 4 looks, while B, C and D scored WORSE than
// before, because they were no longer alternatives to the old design but
// partial overrides on top of the new one. The comparison had quietly stopped
// meaning anything while still printing numbers, which is the failure this
// page exists to catch in other things.
//
// A `before` VARIANT WAS WRITTEN AND THROWN AWAY, and that is worth recording.
// It undid the shipped rules and restored the five hues keyed by `kind`, so
// the page could still show what the decision bought. It did not reproduce the
// old design: overriding the new CSS merges categories the old one kept apart,
// and it scored the overview at 4 looks and 14 colliding where the real
// measurement on 2026-09-09 was 6 and 9. A reconstruction that misreports the
// thing it reconstructs is worse than no reconstruction. The before-and-after
// figures are in docs/diagram.md, taken when both designs existed,
// which is the only time they could be taken honestly.
//
// SO WHAT IS LEFT IS A REGRESSION VIEW. One variant, no overrides, the built
// page with its figures computed live in whichever theme is on. It answers one
// question -- is every category still drawn as exactly one thing, and does the
// figure still fit -- which is the question that caught the three-sided
// prerequisite card on the live site, after every collision figure had read 0
// throughout and read it correctly.
// TWO PROPOSALS, 2026-09-11, out of the tile audit, drawn rather than argued.
//
// WHAT THE AUDIT FOUND. A tile's face carries four of the fourteen fields a node
// holds. `guide` is on 26 of the 43 and appears nowhere on the canvas -- the SOP
// link this project exists to hang off a tile is invisible until the tile is
// opened. And Setup and Inquiry are the same dashed border on the same
// transparent ground, told apart by `font-style` alone, while italic already
// carries Result and Checkpoint too: the weakest distinction on the busiest axis.
//
// `has-guide` IS INJECTED FROM THE DATA, like `off-path` above it, because
// whether a node carries a guide is not in the markup. Variants that do not
// style it are unaffected and the comparison stays CSS-only; if a treatment is
// taken, `build.mjs` emits the class outright.
//
// THE OVERVIEW HAS NO INQUIRY AT ALL -- 0 of 17 -- so the teal draws nothing
// there and everything on the session map's three. That is not a fault in the
// variant: it is the gap `exchange/SEND-ATLAS-5.md` §3 asks atlas to fill,
// showing up as an absence.
const VARIANTS = [
  {
    id: 'shipped', name: 'Shipped — the five categories',
    blurb: `What the live site draws, with no override at all: this is the built page,
      lifted whole. Three signals carry five categories. <b>Container</b> — a solid tile
      on the route, a closed dashed card beside it. <b>Name style</b> — upright for a
      thing you do or make true, italic for a state you take in. <b>Stripe</b> — grey for
      an ordinary screen, none where there is nothing to open, and the one yellow for a
      checkpoint that decides silently.
      Step · Prerequisite · Reading · Result · Checkpoint.
      <b>Every category should show exactly one look</b>; more than one means a category
      is being drawn two ways, which is how the open-sided prerequisite card shipped.`,
    css: '',
  },

  {
    id: 'roles', name: 'A — three axes, one job each',
    blurb: `<b>Border style says where you are.</b> Dashed for Setup and Inquiry, which sit
      beside the route; solid for Step, Result and Checkpoint, which are on it. Dashed
      rather than dotted because it carries further at 1px.
      <b>Fill says whether there is a screen behind it.</b> A tile with a session code is
      filled; one without is an outline. That is the signal the 3px stripe used to
      carry, moved to a property that can hold it — and it costs nothing to derive,
      because <code>:has(.ln-dg-node-code)</code> is already the test the shipped CSS
      uses.
      <b>Colour says the role.</b> Neutral Step and Setup, <b>blue</b> Inquiry,
      <b>green</b> Result, <b>yellow</b> Checkpoint — on the border and the text always,
      so an unfilled tile still shows its role.
      <b>No accent stripe anywhere.</b> One border weight the whole way round.
      Worth watching: the overview has 9 tiles of 17 with no code, so a third of it is
      outlines; the session map has 26 of 26 coded, so every tile there is filled and
      the fill axis says nothing at all on that document.`,
    css: `
.v-roles .ln-dg-node { border: 1px solid var(--rux-border-strong-01, #8d8d8d);
  padding-inline-start: 0; background: transparent; }
.v-roles .ln-dg-cat--config, .v-roles .ln-dg-cat--info { border-style: dashed; }
.v-roles .ln-dg-cat--info { border-color: var(--rux-tag-color-blue, #0043ce); }
.v-roles .ln-dg-cat--info .ln-dg-node-name,
.v-roles .ln-dg-cat--info .ln-dg-node-code { color: var(--rux-tag-color-blue, #0043ce); }
.v-roles .ln-dg-cat--result { border-color: var(--rux-tag-color-green, #0e6027); }
.v-roles .ln-dg-cat--result .ln-dg-node-name,
.v-roles .ln-dg-cat--result .ln-dg-node-code { color: var(--rux-tag-color-green, #0e6027); }
.v-roles .ln-dg-cat--check { border-color: var(--rux-support-warning, #f1c21b); }
.v-roles .ln-dg-cat--check .ln-dg-node-name { color: var(--rux-support-warning, #f1c21b); }

/* the fill arrives only where there is a screen to open */
/* NOT layer-01: that is the figure's OWN ground, so a neutral fill drawn with it
   is invisible -- measured 57,57,57 on 57,57,57 in g90. The gray tag pair is the
   neutral that differs from the surface. */
.v-roles .ln-dg-node:has(.ln-dg-node-code) { background: var(--rux-tag-background-gray, #e0e0e0); }
.v-roles .ln-dg-node:has(.ln-dg-node-code) .ln-dg-node-name,
.v-roles .ln-dg-node:has(.ln-dg-node-code) .ln-dg-node-code { color: var(--rux-tag-color-gray, #161616); }
.v-roles .ln-dg-cat--info:has(.ln-dg-node-code) { background: var(--rux-tag-background-blue, #d0e2ff); }
.v-roles .ln-dg-cat--result:has(.ln-dg-node-code) { background: var(--rux-tag-background-green, #a7f0ba); }
.v-roles .ln-dg-cat--check:has(.ln-dg-node-code) {
  background: color-mix(in srgb, var(--rux-support-warning, #f1c21b) 25%, var(--rux-layer-01, #f4f4f4)); }`,
  },

  // THE COLUMN VARIANTS ARE GONE FOR THE SAME REASON THE LANE ONES ARE. Drawn
  // 2026-09-11 -- max-content per column against a 12rem and a 10rem cap -- and
  // max-content shipped the same day, at which point variant A stopped being an
  // alternative and became a second copy of the baseline. What they measured is
  // in docs/diagram.md §10; what stays live is the column and scroll
  // figures in the readout, taken on the shipped page every run.
  // THE THREE LANE VARIANTS ARE GONE, AND THAT IS THE SAME RULE §5.1 RECORDS.
  // They were drawn on 2026-09-11 -- a rule per lane, a sticky lane name, and
  // both -- and A shipped the same day. The moment it did, variant A stopped
  // being an alternative to this page's baseline and became a second copy of it,
  // which is exactly how B, C and D quietly stopped meaning anything while still
  // printing numbers. So they are deleted rather than kept for reference: what
  // they measured is in docs/diagram.md §8, and what remains live is the
  // lane readout below, taken on the shipped page every run.
];

// WHAT THE READOUT COUNTS, AND THE ONE IT GOT WRONG FIRST. It began with a
// single `collisions` figure -- tiles sharing an appearance with a tile of a
// different KIND -- copied from docs/diagram.md §5 item 1. Run against
// the variants it scored B at 17 of 17 colliding, worse than today's 9, which
// is nonsense: B deliberately merges nine kinds into three forms, so measuring
// it by kind assumes the very thing A and C assert and B denies. A metric that
// can only rank one of the options is not a measurement, it is the conclusion
// wearing a number. §5 item 1 is wrong as written and this is the correction.
//
// So there are two, and they answer different questions. `by kind` is how many
// tiles cannot be told from a tile of another kind -- the right question ONLY
// if every kind must be distinguishable at rest, which is what is being
// decided. `by register` is how many cannot be told from a tile in another of
// the three groups the plan says actually matter: a session you change, a
// session you only read, a thing that is not a session. That one is scored the
// same way for every variant, including the ones that never set out to satisfy
// it, so it can rank all three. `appearances` is how many distinct looks a
// reader must learn with no legend, and lower is better in every variant.
const READOUT = `
const sig = el => { const s = getComputedStyle(el);
  const nm = getComputedStyle(el.querySelector('.ln-dg-node-name'));
  return [s.borderInlineStartColor, s.borderInlineStartStyle, s.borderInlineStartWidth,
          s.backgroundColor, nm.fontStyle].join('|'); };
const kindOf = n => [...n.classList].find(c => c.startsWith('ln-dg-node--')).slice(12);
// The three groups the plan says the canvas must keep apart. A tile with a
// code is a session; 'read' is the session you only look at.
const registerOf = n => !n.querySelector('.ln-dg-node-code') ? 'state'
  : kindOf(n) === 'read' ? 'look' : 'act';
// Beside the path or on it -- the split D makes primary.
const pathOf = n => n.classList.contains('ln-dg-node--off-path') ? 'beside' : 'on';
// The five decided on 2026-09-10. This is the figure that ranks the variants now.
const catOf = n => ([...n.classList].find(c => c.startsWith('ln-dg-cat--')) || '--?').slice(11);
function collisions(nodes, label) {
  const by = new Map();
  for (const n of nodes) {
    const s = sig(n);
    if (!by.has(s)) by.set(s, new Set());
    by.get(s).add(label(n));
  }
  return nodes.filter(n => by.get(sig(n)).size > 1).length;
}
// THE CODE LINE IS A CUE AND LEAVING IT OUT FLATTERS THE ARGUMENT. A tile that
// is a session renders its session code under the name and one that is not
// renders nothing, so the two are not strictly identical even in variant A.
// Whether a second line of small grey text reads as a CATEGORY is the thing in
// dispute -- it is information, but it is not a form, and a box shaped like a
// box you open, in a grid of boxes you open, reads as one. So both figures are
// reported and neither is hidden: 'form' is the strict test, 'form+code' gives
// today's design the benefit of the doubt.
const sigWithCode = n => sig(n) + '|' + !!n.querySelector('.ln-dg-node-code');
function collisionsBy(nodes, label, signature) {
  const by = new Map();
  for (const n of nodes) {
    const s = signature(n);
    if (!by.has(s)) by.set(s, new Set());
    by.get(s).add(label(n));
  }
  return nodes.filter(n => by.get(signature(n)).size > 1).length;
}
// ONE CATEGORY, ONE LOOK. The figure that would have caught the three-sided
// card: every collision count read 0 while Prerequisite was being drawn two
// ways, because a three-sided box is still nothing like a Step. Collisions ask
// whether two categories can be told apart; this asks whether ONE is drawn
// consistently, and nothing asked that until a person looked at the page.
function perCategory(nodes) {
  const by = new Map();
  for (const n of nodes) {
    const c = catOf(n);
    if (!by.has(c)) by.set(c, new Set());
    by.get(c).add(sig(n));
  }
  return [...by.entries()].map(([c, looks]) => [c, looks.size]).sort();
}
// THE TWO LANE FIGURES, AND THEY ARE THE ONES THAT DECIDE THE LANE VARIANTS.
// Both are measured on what is drawn, like everything else here.
//
//   gap within / across  the vertical distance between two stacked tiles inside
//                        one lane, and between the last tile of one lane and the
//                        first of the next in the same column. EQUAL IS THE
//                        DEFECT: 8px currently means both, so the boundary is
//                        unmarked. A variant fixes it by drawing a line, not by
//                        adding space -- so watch 'ruled' alongside, because a
//                        ruled boundary is legible at the same 8px.
//   name held            how many lane names are still inside the figure when it
//                        is scrolled to its far right. On the map that is 0 of 6
//                        today; the overview never scrolls, so it is 6 of 6 there
//                        in every variant and says nothing.
function laneScore(scope) {
  const fig = scope.querySelector('.ln-dg');
  const lanes = [...scope.querySelectorAll('.ln-dg-lane')];
  // A LANE IS RULED IF IT HAS A RULE ELEMENT. This counted \`::after\` content
  // until the rule shipped, because the variant that proposed it drew a
  // pseudo-element -- and the shipped rule is a grid item, so the detector read
  // 0 on a page with six rules. A figure that reports the absence of something
  // plainly there is worse than no figure.
  const ruled = scope.querySelectorAll('.ln-dg-rule').length;
  const was = fig.scrollLeft;
  fig.scrollLeft = fig.scrollWidth - fig.clientWidth;
  const edge = fig.getBoundingClientRect().left;
  const held = lanes.filter(l => l.getBoundingClientRect().right > edge).length;
  fig.scrollLeft = was;
  const byCol = new Map();
  for (const c of scope.querySelectorAll('.ln-dg-cell')) {
    const col = c.style.gridColumn, row = c.style.gridRow;
    if (!byCol.has(col)) byCol.set(col, []);
    for (const n of c.querySelectorAll('.ln-dg-node'))
      byCol.get(col).push({ row, r: n.getBoundingClientRect() });
  }
  let across = null, within = null;
  for (const items of byCol.values()) {
    items.sort((a, b) => a.r.top - b.r.top);
    for (let i = 1; i < items.length; i++) {
      const gap = Math.round(items[i].r.top - items[i - 1].r.bottom);
      if (items[i].row === items[i - 1].row) within = within === null ? gap : Math.min(within, gap);
      else across = across === null ? gap : Math.min(across, gap);
    }
  }
  return { lanes: lanes.length, ruled, held, within, across };
}
function score(scope) {
  // GRID TILES ONLY. Since the legend shipped, a \`.ln-dg-node\` on the page is
  // either a tile or a legend swatch -- the swatch carries the same classes on
  // purpose, so it cannot drift from what it describes -- and a swatch has no
  // kind class. Scoring it as a tile read \`undefined\` for its kind and took the
  // whole readout down, which is the correct failure and is fixed here rather
  // than by loosening what a tile is.
  const nodes = [...scope.querySelectorAll('.ln-dg-grid .ln-dg-node')];
  const fig = scope.querySelector('.ln-dg');
  return { tiles: nodes.length,
    appearances: new Set(nodes.map(sig)).size,
    byKind: collisions(nodes, kindOf),
    byRegister: collisions(nodes, registerOf),
    byRegisterCode: collisionsBy(nodes, registerOf, sigWithCode),
    byPath: collisions(nodes, pathOf),
    byCat: collisions(nodes, catOf),
    perCat: perCategory(nodes),
    scrolls: fig.scrollWidth > fig.clientWidth,
    scrollW: fig.scrollWidth,
    col: Math.round(parseFloat(getComputedStyle(
      scope.querySelector('.ln-dg-grid')).gridTemplateColumns.split(' ')[1])) };
}
function paint() {
  for (const box of document.querySelectorAll('[data-score]')) {
    const r = score(box);
    const m = (n) => \`<b class="\${n ? 'bad' : 'ok'}">\${n}</b>\`;
    box.querySelector('[data-out]').innerHTML =
      \`<b>\${r.tiles}</b> tiles · <b>\${r.appearances}</b> looks to learn · \` +
      r.perCat.map(([c, n]) => \`\${c} <b class="\${n === 1 ? 'ok' : 'bad'}">\${n}</b>\`).join(' · ') +
      \` look each · \${m(r.byCat)} colliding by category · \` +
      \`column <b>\${r.col}px</b> · \${r.scrolls ? 'scrolls <b>' + r.scrollW + 'px</b>' : 'fits'}\`
      + (() => {
        const l = laneScore(box);
        const marked = l.across === null || l.within === null || l.across > l.within || l.ruled > 0;
        const gap = (n) => n === null ? '—' : n + 'px';
        return \`<br><b>\${l.lanes}</b> lanes · \${l.ruled} ruled · name held at far right \` +
          \`<b class="\${l.held === l.lanes ? 'ok' : 'bad'}">\${l.held}</b>/\${l.lanes} · \` +
          \`gap within a lane \${gap(l.within)} vs across lanes \` +
          \`<b class="\${marked ? 'ok' : 'bad'}">\${gap(l.across)}</b>\` +
          \`\${marked ? '' : ' — nothing marks the boundary'}\`;
      })();
  }
}
paint();
new MutationObserver(paint).observe(document.documentElement,
  { attributes: true, attributeFilter: ['data-theme'] });
window.addEventListener('resize', paint);
`;

const sections = figures.map(([name, note, fig]) => `
      <h2>${name}</h2>
      <p class="note">${note}</p>
      ${VARIANTS.map(v => `
      <section class="variant v-${v.id}" data-score>
        <h3>${v.name}</h3>
        <p class="blurb">${v.blurb}</p>
        <p class="out" data-out></p>
        ${fig}
      </section>`).join('')}`).join('\n');

const html = `<!doctype html>
<html lang="en" data-theme="white">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Diagram categories — as shipped</title>
<link rel="stylesheet" href="/rux-ds/assets/fonts/plex.css">
<link rel="stylesheet" href="/rux-ds/css/rux.css">
<link rel="stylesheet" href="/rux-ds/css/rux-theme.css">
<link rel="stylesheet" href="/rux-ds/css/rux-overrides.css">
<link rel="stylesheet" href="../rux-theme.css">
<link rel="stylesheet" href="../rux-overrides.css">
<style>
${baseCss}
/* --- the specimen's own chrome, which is not part of any variant --------- */
body { margin: 0; padding: 2rem clamp(1rem, 4vw, 3rem) 6rem;
  background: var(--rux-background, #fff); color: var(--rux-text-primary, #161616); }
h1 { margin: 0 0 .25rem; }
h2 { margin: 3rem 0 .25rem; padding-block-start: 1.5rem;
  border-block-start: 1px solid var(--rux-border-subtle-01, #e0e0e0); }
h3 { margin: 0 0 .25rem; font-size: 1rem; }
.lede, .note, .blurb { color: var(--rux-text-secondary, #525252); max-width: 62ch; }
.lede { margin: 0 0 1rem; }
.note { margin: 0 0 1rem; font-size: .875rem; }
.blurb { margin: 0 0 .5rem; font-size: .8125rem; line-height: 1.5; }
.variant { margin-block: 1.5rem 2.5rem; }
.out { font: .75rem/1.5 var(--rux-code-01-font-family, ui-monospace, monospace);
  margin: 0 0 .75rem; color: var(--rux-text-secondary, #525252); }
.out .ok  { color: var(--rux-support-success, #24a148); }
.out .bad { color: var(--rux-support-error, #da1e28); }
.themes { display: flex; gap: .5rem; align-items: center; flex-wrap: wrap;
  position: sticky; top: 0; z-index: 20; padding: .75rem 0;
  background: var(--rux-background, #fff); }
.themes button { font: inherit; font-size: .8125rem; cursor: pointer;
  padding: .25rem .75rem; color: inherit;
  background: var(--rux-layer-01, #f4f4f4);
  border: 1px solid var(--rux-border-subtle-01, #e0e0e0); }
.themes button[aria-pressed="true"] { background: var(--rux-layer-accent-01, #e0e0e0);
  border-color: var(--rux-border-strong-01, #8d8d8d); }
${VARIANTS.map(v => v.css).join('\n')}
</style>
</head>
<body>
<h1>Diagram categories — as shipped</h1>
<p class="lede">The built pages, lifted whole — markup and stylesheet — so this is the
live site and not a mock-up. <b>Every category should read <span class="ok">1</span></b>:
that is one category drawn exactly one way, and it is the figure that was missing when a
prerequisite shipped as a three-sided card while every collision count read 0 and read it
correctly. <b>Colliding by category</b> is tiles that cannot be told from a tile of another
category. Both are measured on what is drawn, in the theme you are in — switch themes and
watch them hold.</p>
<p class="note"><b>Column width and “figure scrolls” are this page's, not the site's.</b>
The specimen's container is narrower than a guide page's, so the figure scrolls here where
it fits there. Compare the column figure between runs, never against the live page.</p>
<div class="themes"><span>Theme</span>
  ${['white', 'g10', 'g90', 'g100'].map(t =>
    `<button type="button" data-theme-set="${t}" aria-pressed="${t === 'white'}">${t}</button>`).join('')}
</div>
${sections}
<script>
for (const b of document.querySelectorAll('[data-theme-set]')) {
  b.addEventListener('click', () => {
    document.documentElement.setAttribute('data-theme', b.dataset.themeSet);
    for (const o of document.querySelectorAll('[data-theme-set]'))
      o.setAttribute('aria-pressed', String(o === b));
  });
}
${READOUT}
</script>
</body>
</html>
`;

mkdirSync(join(ROOT, 'build'), { recursive: true });
writeFileSync(join(ROOT, 'build/specimen-kinds.html'), html);
console.log(`  build/specimen-kinds.html · ${VARIANTS.length} variants × ${figures.length} documents`);
console.log('  http://localhost:8640/rux-ln-notes/build/specimen-kinds.html');
