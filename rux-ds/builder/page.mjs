// The page model — what the builder edits, and how it becomes a page. Pure
// ES module, browser and node alike, importing only rewrites.mjs, so the
// same code composes the preview and runs under a scratch check. Roadmap
// §4.12, creator 3, stage 5.
//
// TIER. This is builder state, not a gate: nothing here decides whether a
// check passes, and check-parity, when it exists, judges rewrites.mjs's
// export against tools/new-project.sh, not this. So it is not in
// CONTROL_FILES. Said here so the omission is a decision and not an oversight,
// and rux's to overrule.
//
// THE MODEL IS A PLAIN VALUE, and every transition returns a new one:
//
//   { template: 'table-page',
//     slots: { body: [ { key, id, n, follows }, … ] },   // document order
//     next:  { 'templates/table-page/table': 2, … } }     // per block id
//
// An ENTRY is one placed instance of a manifest block: `id` is the block's
// qualified id, `n` its instance number, `key` is `${id}@${n}` and is what
// the picker, the edits and the highlight are keyed by. `follows` is the key
// of the entry it rides behind, or null.
//
// INSTANCE NUMBERS are allocated per page per block id from `next`, rise and
// are never reused while the page lives, and survive a move. That is the
// contract instanceOf states, and it is what lets undo, the stage after
// this, be a history of these values and nothing more. A template's own
// blocks are instance 1, which instanceOf returns byte for byte, so a page
// nobody has touched is the template.
//
// A `follows` RUN IS ONE UNIT. The marker rule (tools/lib/blocks.mjs) pins a
// follower to the block before it — table-page's pagination under its table
// — "the builder keeps them adjacent and removes them together". So a
// follower sits immediately behind its leader, adding a leader adds its
// attested followers with it, and move and remove act on the whole run
// whichever member was selected. Editing a follower's text on its own is
// fine; that is content, not arrangement.
//
// NO CROSS-SLOT MOVE. Move swaps a unit with its neighbour inside its slot;
// to change slots, remove and add. A slot may end up empty and composes as
// its `pre` and `post`.
//
// PLACEMENT IS INFORMATIONAL. build-blocks.mjs records where a block was
// attested so the builder can SAY where else it may honestly go, and the
// builder's own page says the arrangement is the reader's (composing-pages
// §3.10). The catalogue offers every block in every slot; nothing here
// refuses one.
//
// HOW A MODEL BECOMES A PAGE (composePage), per slot, in template order:
//   1. each entry's footprint is its block's own marker lines around
//      instanceOf(applyLinkEdits(applyTextEdits(applyVariants(html, variants),
//      edits), links), n). THE ORDER IS THE CONTRACT, not a convenience.
//      VARIANTS FIRST, on the block's original geometry: a class rewrite
//      changes byte lengths, and running it first keeps the pass correct even
//      if anyone later keys a group by offset instead of by ordinal, which is
//      the defect rux caught in stage 9's first plan. Text and links next,
//      because the panel indexes the ORIGINAL html and both key by ordinal —
//      a longer class list moves no field's index and adds no anchor.
//      Instancing LAST, because it and a link edit DO NOT COMMUTE: repoint a
//      link at `#target` and instance 2, and the href must become `#target-2`
//      to reach this copy's own id, which only this order produces.
//      rewrites.mjs has the measured pair;
//   2. the footprint is SHIFTED to the slot's depth: the difference between
//      the leading spaces of the SLOT:BEGIN line and of the block's own
//      BLOCK:BEGIN line, added to or taken from every non-empty line. A
//      native block is already at its slot's depth, so its bytes do not
//      move, which is what keeps the untouched page byte-identical. A
//      footprint holding <pre> or a textarea with content is not shifted —
//      the rule, though no block carries one;
//   3. a block from ANOTHER file gets one line above it at the slot's depth,
//      `<!-- FROM: <source> · <provenance> -->`, the provenance comment
//      rewrites.mjs promises above every emitted block. The marker lines
//      keep the source's name and label, so they stay grammar-valid; a page
//      may then carry one name twice, and highlight() counts;
//   4. the slot record handed to compose() carries as many separators as
//      the entries need, each the slot's own recorded one. Every slot in the
//      corpus records identical gaps, so the rule reproduces every template
//      exactly — and compose() given fewer gaps than blocks would write the
//      string "undefined" into the page, which is why the record is built
//      here and never reused as recorded.

import { compose, instanceOf, applyTextEdits, applyLinkEdits, applyVariants } from './rewrites.mjs';

const keyOf = (id, n) => `${id}@${n}`;
const clone = page => JSON.parse(JSON.stringify(page));
const depthOf = text => text.match(/^ */)[0].length;

const blockById = (manifest, id) => {
  const b = manifest.blocks.find(x => x.id === id);
  if (!b) throw new Error(`page: no block ${id} in the manifest`);
  return b;
};

// The template's own composition: every native block at instance 1, in its
// recorded slot order, with its recorded follows.
export function newPage(manifest, name) {
  const t = manifest.templates.find(x => x.name === name);
  if (!t) throw new Error(`page: no template ${name}`);
  const byName = Object.fromEntries(manifest.blocks.filter(b => b.source === t.path).map(b => [b.name, b]));
  const page = { template: name, slots: {}, next: {} };
  for (const s of t.slots) {
    page.slots[s.name] = s.blocks.map(n => {
      const b = byName[n];
      page.next[b.id] = 2;
      return { key: keyOf(b.id, 1), id: b.id, n: 1, follows: b.follows ? keyOf(byName[b.follows].id, 1) : null };
    });
  }
  return page;
}

function locate(page, key) {
  for (const [slot, list] of Object.entries(page.slots)) {
    const i = list.findIndex(e => e.key === key);
    if (i >= 0) return { slot, list, i };
  }
  throw new Error(`page: no block ${key} on this page`);
}

// The run an entry belongs to — its leader and every follower behind it — as
// [start, end) into its slot, with the keys in order.
export function unitOf(page, key) {
  const { slot, list, i } = locate(page, key);
  let start = i;
  while (list[start].follows) {
    const at = list.findIndex(e => e.key === list[start].follows);
    if (at < 0 || at >= start) throw new Error(`page: ${list[start].key} follows ${list[start].follows}, which is not before it`);
    start = at;
  }
  const keys = [list[start].key];
  let end = start + 1;
  while (end < list.length && list[end].follows && keys.includes(list[end].follows)) keys.push(list[end++].key);
  return { slot, start, end, keys };
}

// Append instance `next[id]` of a block, and its attested followers, to the
// end of a slot.
export function add(page, slot, id, manifest) {
  const next = clone(page);
  const list = next.slots[slot];
  if (!list) throw new Error(`page: no slot ${slot} on ${page.template}`);
  const alloc = bid => { const n = next.next[bid] ?? 1; next.next[bid] = n + 1; return n; };
  const place = (block, follows) => {
    const n = alloc(block.id);
    const entry = { key: keyOf(block.id, n), id: block.id, n, follows };
    list.push(entry);
    for (const f of manifest.blocks.filter(b => b.source === block.source && b.follows === block.name)) place(f, entry.key);
  };
  place(blockById(manifest, id), null);
  return next;
}

// Swap a unit with the unit before it (dir < 0) or after it (dir > 0) in
// its slot. At either end, the page is returned unchanged.
export function move(page, key, dir) {
  const next = clone(page);
  const u = unitOf(next, key);
  const list = next.slots[u.slot];
  const run = list.slice(u.start, u.end);
  if (dir < 0) {
    if (u.start === 0) return next;
    const before = unitOf(next, list[u.start - 1].key);
    list.splice(before.start, u.end - before.start, ...run, ...list.slice(before.start, before.end));
  } else {
    if (u.end >= list.length) return next;
    const after = unitOf(next, list[u.end].key);
    list.splice(u.start, after.end - u.start, ...list.slice(after.start, after.end), ...run);
  }
  return next;
}

// Drop a unit. Its instance numbers are not reused.
export function remove(page, key) {
  const next = clone(page);
  const u = unitOf(next, key);
  next.slots[u.slot].splice(u.start, u.end - u.start);
  return next;
}

// Every entry on the page in document order, each with its slot name.
export function entriesOf(page, template) {
  return template.slots.flatMap(s => (page.slots[s.name] ?? []).map(e => ({ ...e, slot: s.name })));
}

// Leading whitespace moved by `delta` on every non-empty line; never inside
// preformatted content, and never below zero.
export function shift(text, delta) {
  if (!delta || /<pre\b/i.test(text) || /<textarea\b[^>]*>[^<]*[^\s<]/i.test(text)) return text;
  const pad = ' '.repeat(Math.max(0, delta));
  return text.split('\n').map(l => {
    if (l === '') return l;
    if (delta > 0) return pad + l;
    return l.slice(Math.min(depthOf(l), -delta));
  }).join('\n');
}

// The leading spaces of the line that ENDS at `index` — for a slot, its
// SLOT:BEGIN line, since a slot's `start` is the index after that line's
// newline.
const depthOfLineEndingAt = (src, index) => depthOf(src.slice(src.lastIndexOf('\n', index - 2) + 1, index));

// The page: `src` with each slot rebuilt from the model. `edits` is keyed by
// entry key, then field index, as builder.js keeps it.
export function composePage(src, template, page, manifest, edits = {}, links = {}, variants = {}) {
  const slots = [], byKey = {};
  for (const s of template.slots) {
    const list = page.slots[s.name] ?? [];
    const slotDepth = depthOfLineEndingAt(src, s.start);
    for (const e of list) {
      const b = blockById(manifest, e.id);
      const html = instanceOf(applyLinkEdits(applyTextEdits(applyVariants(b.html, variants[e.key] ?? {}), edits[e.key] ?? {}), links[e.key] ?? {}), e.n);
      let footprint = shift(b.open + html + b.close, slotDepth - depthOf(b.open));
      if (b.source !== template.path) {
        footprint = `${' '.repeat(slotDepth)}<!-- FROM: ${b.source} · ${b.provenance ?? 'no provenance recorded'} -->\n${footprint}`;
      }
      byKey[e.key] = { open: '', html: footprint, close: '' };
    }
    slots.push({ ...s, blocks: list.map(e => e.key), gaps: Array(Math.max(0, list.length - 1)).fill(s.gaps[0] ?? '') });
  }
  return compose(src, slots, byKey);
}
