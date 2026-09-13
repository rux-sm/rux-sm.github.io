#!/usr/bin/env node
//
// Is the right glyph in this SLOT? — the half of the icon question check-glyphs
// says is not its job, and the half every icon defect this project shipped was.
//
// FOUR HAVE SHIPPED, all past all sixteen other gates: two chevrons rotated from
// the wrong base glyph; a table sort arrow built from arrow--down where Carbon
// draws ArrowUp, so both sort states pointed the wrong way; and seven form
// `__invalid-icon`s drawing error--filled — a circle with a cross — where Carbon
// draws warning--filled, a circle with an exclamation. The last of those was
// found by this file's own reference on the day it was written.
//
// Every one was a CORRECT symbol referenced from the WRONG slot. check-icons
// asks whether a `<use>` resolves; check-glyphs asks whether the symbol draws
// what its name says. Both answer yes for all four.
//
// THE REFERENCE, and why it is two hops. Carbon's React inlines its icons, so
// the DOM has a path and no name — there is nothing to compare a `<use href>`
// against directly. docs/carbon-slots.json closes that: the icons mode of
// tools/extract/react-dom.js records slot → drawing across all 505 stories, and
// the drawing is resolved to a NAME against @carbon/icons, whose 2,828 files
// hash to 2,823 distinct size+geometry keys. All 69 drawings in our slots
// resolved; the five collisions in the package are aliases.
//
// THE CORROBORATION BAR IS THE WHOLE DIFFERENCE BETWEEN A RULE AND A STORY, and
// it is cleared two ways — see `enforced` below. 33 of the 51 slots our markup
// shares with Carbon are enforced; six are declined in the reference WITH
// REASONS because their glyph is the consumer's and not the component's, and the
// rest are recorded under the bar and reported, never failed.
//
// IT TOOK BOTH A CAPTURE AND A RULE, and the first draft claimed otherwise. That
// draft enforced 19 slots on story-count alone, and REVERTING THE INVALID-ICON
// DEFECT LEFT IT GREEN: no default story renders an invalid field, so
// list-box__invalid-icon had one capture and text-input__invalid-icon two, both
// under a 3-story bar. Its header said `states` recipes would fix that and a
// rule change would not. Half right. The 20 ICON_STATES rows supplied the
// captures, and every one still had a single story behind it — what made them
// evidence was noticing that SIX INDEPENDENT COMPONENTS agree on one glyph,
// which is corroboration of the same kind as one component in six stories.
// With both, the seven-site defect that this file's own reference found by hand
// is now caught by the file.
//
// COVERAGE IS NOT ENFORCEMENT, and the second round moved only the first.
// Adding twelve more configured captures and a subset match took UNCOVERED from
// 13 slots to 4 — we now know what Carbon draws in the pagination arrows, the
// open list-box chevron, the side-nav submenu chevron, inline loading's error
// and number's warn, and ours agrees in every case. The enforced count did not
// move off 33, because each of those rests on a SINGLE story and has no
// siblings to vouch for it. Knowing more and checking more are different
// things, and only the first happened.
//
// WHAT IT CANNOT SEE, stated because a green run is otherwise easy to over-read:
//   * 4 slots have no Carbon capture that can answer, and are reported
//     UNCOVERED, never as passing: an ACTIVE header action, which no story
//     renders; a bare `pagination__button`, which sits under both the forward
//     and backward captures and so matches neither; and the password visibility
//     toggle, where Carbon puts the class on the svg and we put it on the
//     button, so there is no shared key to compare.
//   * 25 more are captured and recorded but under the bar.
//   * a slot Carbon fills from a prop, where there is no right answer to know.
//   * whether the icon is the right SIZE, or positioned correctly, or visible.
//
//   node tools/check-slots.mjs           gate
//   node tools/check-slots.mjs --all     show uncovered and unenforced slots too
//
import { readFileSync } from 'node:fs';
import { markupFiles } from './lib/sources.mjs';

const REF = JSON.parse(readFileSync('docs/carbon-slots.json', 'utf8'));
const { slots, _declined: DECLINED } = REF;
const showAll = process.argv.includes('--all');

// THE ROLE IS THE CLASS WITH ITS COMPONENT NAME STRIPPED, so that
// checkbox__invalid-icon and select__invalid-icon are both `__invalid-icon`.
// It is what lets sibling slots corroborate each other.
const role = slot => slot.split('.').map(c => c.replace(/^[a-z0-9-]+?(?=__)/, '')).join('.');

// Single-glyph slots grouped by role, so a role that six components agree on can
// be counted. Declined slots are excluded from the tally as well as from
// enforcement — a consumer-supplied glyph should not vouch for anything.
const byRole = new Map();
for (const [k, v] of Object.entries(slots)) {
  if (v.drawings !== 1 || DECLINED[k]) continue;
  const r = role(k);
  if (!byRole.has(r)) byRole.set(r, new Map());
  const m = byRole.get(r);
  m.set(v.glyphs[0], (m.get(v.glyphs[0]) ?? 0) + 1);
}

// TWO WAYS TO CLEAR THE SAME BAR, and the second is not a loosening. One story
// describes that story; so does one component. Three of either is the point at
// which a coincidence has had a chance to fall over. The invalid and warn
// states can only ever reach it the second way — no default story renders them,
// so their evidence is six components agreeing rather than one repeated.
function enforced(k, v) {
  if (DECLINED[k] || v.drawings !== 1) return false;
  if (v.corroboration[0] >= 3) return true;
  return (byRole.get(role(k))?.get(v.glyphs[0]) ?? 0) >= 3;
}
const ENFORCED = new Set(Object.entries(slots).filter(([k, v]) => enforced(k, v)).map(([k]) => k));

// Slot = the svg's own rux-- classes, or the nearest classed ancestor's. Same
// definition the capture used, or the two sides would not meet.
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr', 'use', 'path', 'circle',
  'rect', 'polygon', 'stop', 'ellipse', 'line']);

function iconSites(html) {
  const src = html.replace(/<!--[\s\S]*?-->/g, '');
  const out = [];
  const stack = [];
  let inSvg = null;
  const re = /<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|[^>"])*?)(\/?)>/g;
  let m;
  while ((m = re.exec(src))) {
    const [, closing, rawTag, attrs, self] = m;
    const tag = rawTag.toLowerCase();
    if (closing) {
      if (tag === 'svg' && inSvg) {
        if (inSvg.use) {
          const slot = inSvg.cls || [...stack].reverse().map(e => e.cls).find(Boolean) || '';
          if (slot) out.push({ slot, use: inSvg.use });
        }
        inSvg = null;
      }
      for (let i = stack.length - 1; i >= 0; i--) if (stack[i].tag === tag) { stack.length = i; break; }
      continue;
    }
    const cls = (attrs.match(/\sclass="([^"]*)"/) ?? [, ''])[1]
      .split(/\s+/).filter(c => c.startsWith('rux--')).map(c => c.slice(5)).join('.');
    if (tag === 'use' && inSvg) {
      const h = (attrs.match(/href="#i-([^"]*)"/) ?? [])[1];
      if (h) inSvg.use = h;
    }
    if (tag === 'svg' && !inSvg) inSvg = { cls, use: null };
    if (!(self || VOID.has(tag))) stack.push({ tag, cls });
  }
  return out;
}

const wrong = [], uncovered = new Map(), unenforced = new Map();
let checked = 0;

// SUBSET MATCH, for when Carbon's element carries a modifier ours does not.
// Our `header__action.header__menu-trigger.header__menu-toggle` and Carbon's
// `…toggle.header__menu-toggle__hidden` are the same slot in different states;
// `pagination__button.btn.btn--ghost.btn--icon-only` is Carbon's
// `pagination__button.pagination__button--forward.…` with the direction left
// off. An exact key misses both and reports UNCOVERED, which understates what
// the capture knows.
//
// ONE DIRECTION ONLY, and every candidate must agree. Ours ⊆ Carbon's is a
// specialisation we can read; Carbon's ⊆ ours is not, and would let the generic
// `btn.btn--ghost.btn--icon-only` — which is a PAGINATION arrow in the captures
// — vouch for any ghost icon button on the page. And where several Carbon slots
// are supersets and they disagree about the glyph, the answer is genuinely
// unknown: a bare `pagination__button` sits under both the forward and the
// backward capture, so it matches neither.
const CARBON = Object.entries(slots).map(([k, v]) => [k, new Set(k.split('.')), v]);
const subsetCache = new Map();
function bySubset(slot) {
  if (subsetCache.has(slot)) return subsetCache.get(slot);
  const mine = new Set(slot.split('.'));
  const supersets = CARBON.filter(([, set]) => [...mine].every(c => set.has(c)));
  // One candidate is the answer whatever it says — including "Carbon draws six
  // different glyphs here", which is a capture and belongs under the bar rather
  // than in UNCOVERED. Several candidates only answer when the single-glyph ones
  // agree.
  let hit = null;
  if (supersets.length === 1) hit = supersets[0];
  else if (supersets.length > 1) {
    const single = supersets.filter(([, , v]) => v.drawings === 1);
    if (new Set(single.map(([, , v]) => v.glyphs[0])).size === 1) hit = single[0];
  }
  subsetCache.set(slot, hit);
  return hit;
}

for (const file of markupFiles()) {
  for (const { slot, use } of iconSites(readFileSync(file.path, 'utf8'))) {
    let ref = slots[slot], matched = slot;
    if (!ref) { const hit = bySubset(slot); if (hit) { [matched, , ref] = hit; } }
    if (!ref) { push(uncovered, slot, `${use} · ${file.name}`); continue; }
    if (!ENFORCED.has(matched)) { push(unenforced, `${slot}\u0000${matched}`, use); continue; }
    checked++;
    if (ref.glyphs.includes(use)) continue;
    wrong.push({ file: file.name, slot, matched, ours: use, carbon: ref.glyphs.join(' / '), ref });
  }
}
function push(map, k, v) { (map.get(k) ?? map.set(k, []).get(k)).push(v); }

for (const w of wrong) {
  console.log(`\n  ${w.file}  ·  ${w.slot}`);
  if (w.matched !== w.slot) console.log(`     matched Carbon's ${w.matched} by subset`);
  console.log(`     ours    #i-${w.ours}`);
  const why = w.ref.corroboration[0] >= 3
    ? `one glyph across ${w.ref.corroboration[0]}+ stories`
    : `one glyph across ${byRole.get(role(w.matched))?.get(w.ref.glyphs[0])} sibling ${role(w.matched)} slots`;
  console.log(`     Carbon  ${w.carbon}   (${why})`);
}

if (showAll) {
  console.log(`\n  UNCOVERED — no Carbon capture for this slot, so nothing is claimed either way`);
  for (const [slot, uses] of [...uncovered].sort())
    console.log(`     ${slot}  ${[...new Set(uses.map(u => u.split(' · ')[0]))].join(' ')}`);
  console.log(`\n  RECORDED BUT NOT ENFORCED — Carbon draws more than one glyph here, or too few stories back it`);
  for (const [key, uses] of [...unenforced].sort()) {
    const [slot, matched] = key.split('\u0000');
    const via = matched === slot ? '' : `  (via Carbon's ${matched})`;
    console.log(`     ${slot}${via}  ${[...new Set(uses)].join(' ')}  ·  ${slots[matched].rule}`);
  }
}

console.log(`\n  ${ENFORCED.size} enforced slots · ${checked} icon sites checked · ${wrong.length} wrong glyph`);
console.log(`  ${uncovered.size} of our slots have no Carbon capture and are NOT claimed to pass`
  + ` · ${unenforced.size} captured but under the bar${showAll ? '' : ' — `--all` lists both'}`);
console.log();
process.exit(wrong.length ? 1 : 0);
