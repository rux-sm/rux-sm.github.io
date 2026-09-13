// WHAT THE REPOSITORY HAS SEEN, AND WHAT IT HAS NOT — placement evidence for
// the page builder. Roadmap §4.12, creator 3, stage 11.
//
// PURE ESM WITH NO IMPORTS, on builder/rewrites.mjs's exact footing and for the
// same reason: builder.js imports it in the browser and tools/check-blocks.mjs
// imports it in node, so the gate and the page cannot disagree about what the
// evidence says. That is why it lives in builder/ and not tools/lib/.
//
// ─────────────────────────────────────────────────────────────────────────────
// THE ONE DISTINCTION THIS FILE EXISTS TO KEEP. rux's review of stage 11's
// first plan, and it is the whole reason for the naming here:
//
//   AN ATTESTED PLACEMENT is a block in ITS OWN SOURCE SLOT. Nothing else
//   earns the word. templates/detail-page/metric-row is attested in
//   detail-page/body, and nowhere else, ever.
//
//   A CONTAINER MATCH is a comparison: same normalised grid, column and stack
//   classes. It is EVIDENCE about a proposed placement and never a verdict on
//   one. A metric row captured in Detail was not thereby captured in App Shell.
//
// So the function is matchesContainer, never attestedIn, and the words the page
// puts on screen are "Seen in the same recorded layout" and "No matching
// recorded layout" — never "attested here".
//
// WHAT THE COMPARISON CANNOT SEE, which is why a reading still governs: layer,
// siblings, what sits above in the same stack, the frame, the theme, and every
// one of the THIRTEEN recorded hazards in docs/composing-pages.md. §3.1 is the
// standing proof — a rux--tile inside layer-two is invisible on a plain page,
// measured rgb(255,255,255) on rgb(255,255,255) — and no class signature sees
// it. §3.10 is the general rule: an unattested composition inherits no spacing,
// there may be no fix, and no gate reads it.
//
// This is why nothing here refuses a block. page.mjs:45 decided that the
// catalogue offers every block in every slot; the evidence sorts and labels, it
// does not gate.

// The layout signature of a block or a slot container: grid, column, stack.
// blocks.mjs normalises the class sets when it records them, so this is a
// straight comparison and not a parse.
export const layoutOf = x => JSON.stringify([x?.grid ?? null, x?.column ?? null, x?.stack ?? null]);

// Does this block's recorded layout match this slot's? Evidence, not a verdict.
// A block with no recorded layout at all — every sink block, because a sink
// fragment has no grid ancestry — matches nothing, which is the honest answer
// rather than a permissive one.
export function matchesContainer(block, slot) {
  const sig = layoutOf(block);
  if (sig === layoutOf(null)) return false;
  return sig === layoutOf(slot?.container);
}

// Every slot in the repository whose layout matches this block's, as
// "template/slot" strings. Includes the block's own slot, which is the one
// entry that IS an attested placement.
export function layoutsOf(block, templates) {
  const sig = layoutOf(block);
  if (sig === layoutOf(null)) return [];
  const out = [];
  for (const t of templates) for (const s of t.slots) if (layoutOf(s.container) === sig) out.push(`${t.name}/${s.name}`);
  return out;
}

// Is this slot the block's own? The only relation that earns "attested".
export const isOwnSlot = (block, template, slot) =>
  block.source === template.path && block.slot === slot.name;

// WHAT THIS BLOCK NEEDS FROM THE FRAME, as the {attr, id} records stage 10
// recorded — NOT a boolean, because "which relation needs the frame" is the
// question a reader can act on. Exactly one block in the catalogue has any:
// templates/wizard-page/actions opens wizard-cancel, a dialog kept deliberately
// outside every block.
export const frameNeedsOf = block => (block.frameDeps ?? []).map(x => ({ attr: x.attr, id: x.id }));

// Which of those the destination template cannot satisfy. The composed page's
// integrity() already reports the same {attr, id} shape AFTER a block is added;
// this answers the same question BEFORE, off the template source.
export function frameNeedsMissing(block, templateSrc) {
  const ids = new Set([...templateSrc.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
  return frameNeedsOf(block).filter(n => !ids.has(n.id));
}

// The catalogue for one slot, in two groups. Order inside each group is the
// manifest's, which is source order — the catalogue is offered in manifest
// order everywhere else and this is not the place to invent a second one.
//
// NOTHING IS REFUSED. `matched` and `unmatched` always partition all of the
// blocks; the page puts the second group behind a disclosure rather than
// dropping it.
export function offerFor(manifest, template, slot) {
  const matched = [], unmatched = [];
  for (const b of manifest.blocks) (matchesContainer(b, slot) ? matched : unmatched).push(b);
  return { matched, unmatched };
}

// The map's entries for one template, split by whether rux has read them.
// PROMOTED IS reviewed === true AND NOTHING ELSE. rux's review: visual priority
// is authority regardless of a badge, so a draft never takes the top of the
// list. Everything ships unreviewed, so at the commit this landed `promoted` is
// empty for all ten templates and that is the intended state, not a bug.
export function suggestionsFor(guide, templateName) {
  const entry = guide?.templates?.[templateName];
  const all = entry?.suggestions ?? [];
  return {
    purpose: entry?.purpose ?? null,
    purposeReviewed: entry?.reviewed === true,
    promoted: all.filter(s => s.reviewed === true),
    drafts: all.filter(s => s.reviewed !== true),
  };
}

// The map's recommendation for one variant group, keyed "<block id>#<ordinal>".
// The ordinal is the group's index in variantsOf(block.html) — stage 9's
// identity, never an offset.
export const variantKey = (blockId, ordinal) => `${blockId}#${ordinal}`;
export const recommendationFor = (guide, blockId, ordinal) =>
  guide?.variants?.[variantKey(blockId, ordinal)] ?? null;
