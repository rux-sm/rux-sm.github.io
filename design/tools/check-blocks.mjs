#!/usr/bin/env node
//
// The page builder's gate: every BLOCK and SLOT marker in sink/ and templates/
// is well-formed, every marked region is something a page can actually carry,
// and builder/blocks.json is a verbatim copy of what the markers enclose.
//   node tools/check-blocks.mjs
//
// WHAT IT CHECKS, and what each rule is paid for by:
//
//   paired      BEGIN/END with the same name, no nesting, no orphans, names
//               unique per file, qualified ids unique repo-wide. The END must
//               repeat the name — see tools/lib/blocks.mjs for why.
//   ordered     no marker above the PROVENANCE comment. check-provenance
//               requires PROVENANCE to be the FIRST comment (it faults BURIED),
//               so a marker placed above it fails verify — this names which.
//   hygienic    no `ks-` inside a block: ks-sec, ks-label, ks-row, ks-grid are
//               defined only in sink/harness.css and appear zero times in
//               css/rux.css, so a block carrying one is unstyled on a real
//               page. No inline style= in a SINK block: there it is a demo
//               affordance. Templates are exempt — empty-state's
//               margin-block-start:4rem is attested page markup.
//   resolved    every <use href="#i-…"> names a <symbol> in assets/icons.svg,
//               because a <use> at a missing symbol paints nothing, silently.
//   closed      every aria-controls, aria-labelledby, aria-describedby, for and
//               data-rux-open inside a SINK block points at an id inside the
//               same block — a tabs block includes its panels. In a TEMPLATE
//               the reference may resolve anywhere in the file, and one that
//               lands in another block is recorded as a dependency the builder
//               honours (wizard-page's Cancel opens a dialog that is frame).
//               href="#…" is NOT checked: a breadcrumb's links point out of the
//               block by design. This is what makes "a block is a whole thing"
//               checkable rather than asserted.
//   slotted     in templates/: every BLOCK inside a SLOT, every SLOT inside
//               <main>, every template carries at least one SLOT, and a slot
//               holds blocks and blank lines only — the FRAME IN SLOT fault —
//               so the frame plus the blocks IS the file.
//   follows     a block that `follows` another names the one immediately
//               before it in the same slot.
//   current     builder/blocks.json exists, names exactly the blocks the
//               markers enclose, every `html` equals its source slice byte for
//               byte, and every slot record REASSEMBLES to its file's slot
//               interior byte for byte. Edit a marked region without `npm run
//               blocks` and this is the rule that fails.
//
// WHAT IT CANNOT CHECK. Whether the marked region is the RIGHT part of the
// fragment, or the right seam in a template. That is a reading, and the
// catalogue is grown one reading at a time for that reason.
//
// RED RUN: swap two BLOCK:END names; move a marker above PROVENANCE; change one
// byte inside a marked region without rebuilding; put a comment inside a slot
// but outside any block. Each must fail.
import { readFileSync, existsSync } from 'node:fs';
import { markupFiles } from './lib/sources.mjs';
import { scan, idOf, provenanceIndex, idsIn, refsIn, glyphsIn, markers, assemble, manifestOf } from './lib/blocks.mjs';
import { COVERAGE, BEGIN, END, coverageTable, reasonsIn, fragments } from './lib/coverage.mjs';
import { variantsOf } from '../builder/rewrites.mjs';
import { matchesContainer, variantKey } from '../builder/placement.mjs';

const MANIFEST = 'builder/blocks.json';
const GUIDE = 'builder/guide.json';
const faults = [];
const symbols = new Set([...readFileSync('assets/icons.svg', 'utf8').matchAll(/<symbol\s+id="([^"]+)"/g)].map(m => m[1]));

let expectedBlocks = null;      // the re-derived blocks, shared with the coverage and guide checks
let expectedTemplates = null;
const found = new Map();        // block id → { block, path }
const scanned = new Map();      // path → { html, blocks, slots }
let files = 0, slotCount = 0;

for (const f of markupFiles(['sink', 'templates'])) {
  const html = readFileSync(f.path, 'utf8');
  const r = scan(html, f.path);
  faults.push(...r.faults);
  scanned.set(f.path, { html, root: f.root, ...r });
  const marked = r.blocks.length || r.slots.length || markers(html).length;
  if (f.root === 'templates' && !r.slots.length) faults.push(['NO SLOT', f.path, `a template with no SLOT — the builder can preview and export it but not edit it; mark the container its blocks live in`]);
  if (!marked) continue;
  files++;
  slotCount += r.slots.length;

  const prov = provenanceIndex(html);
  if (prov !== -1) {
    for (const m of markers(html)) if (m.index < prov) {
      faults.push(['ABOVE', `${f.path}:${m.line}`, `${m.kind}:${m.edge} ${m.name ?? ''} sits above the PROVENANCE comment — check-provenance will fault BURIED; move it below`]);
    }
  }

  const mainOpen = html.indexOf('<main');
  const mainClose = html.indexOf('</main>');
  for (const s of r.slots) {
    if (f.root !== 'templates') faults.push(['MISPLACED', `${f.path}:${s.line}`, `SLOT ${s.name} in a sink fragment — slots belong to templates`]);
    else if (mainOpen === -1 || s.start < mainOpen || s.end > mainClose) faults.push(['MISPLACED', `${f.path}:${s.line}`, `SLOT ${s.name} is outside <main> — a slot is a container the page body already has`]);
  }

  const fileIds = idsIn(html);
  for (const b of r.blocks) {
    const id = idOf(f.path, b.name);
    const where = `${f.path}:${b.line}`;
    if (found.has(id)) faults.push(['DUPLICATE', where, `${id} already defined at ${found.get(id).path}`]);
    found.set(id, { block: b, path: f.path });

    if (f.root === 'templates' && !b.slot) faults.push(['UNSLOTTED', where, `BLOCK ${b.name} is not inside a SLOT — a template block must say where it may move`]);

    const ks = b.html.match(/\bks-[a-z]+/);
    if (ks) faults.push(['HARNESS', where, `block ${b.name} carries "${ks[0]}" — defined only in sink/harness.css, unstyled on a real page`]);
    if (f.root === 'sink' && /\sstyle="/.test(b.html)) faults.push(['INLINE STYLE', where, `block ${b.name} carries a style= attribute — a demo affordance, not page markup`]);

    for (const g of glyphsIn(b.html)) if (!symbols.has(g)) faults.push(['UNRESOLVED', where, `block ${b.name} uses #${g} — no <symbol id="${g}"> in assets/icons.svg`]);

    const ids = idsIn(b.html);
    for (const ref of refsIn(b.html)) if (!ids.has(ref.id)) {
      const at = `${f.path}:${b.line + ref.line}`;
      if (f.root === 'sink') faults.push(['OPEN', at, `block ${b.name}: ${ref.attr}="${ref.id}" points outside the block — include the target or the block is not a whole thing`]);
      else if (!fileIds.has(ref.id)) faults.push(['OPEN', at, `block ${b.name}: ${ref.attr}="${ref.id}" resolves nowhere in ${f.path}`]);
    }
  }
}

if (!existsSync(MANIFEST)) {
  faults.push(['NO MANIFEST', MANIFEST, `not found — run \`npm run blocks\``]);
} else {
  let manifest;
  try { manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')); }
  catch (e) { faults.push(['UNREADABLE', MANIFEST, e.message]); }
  if (manifest) {
    // THE WHOLE MANIFEST, NOT A FIELD LIST. Re-derive what build-blocks would
    // write from the same lib and compare structurally. Until 2026-09-05 this
    // compared each block's `html` and nothing else, which left two holes
    // demonstrated rather than reasoned about: `deps` pointed at a block that
    // does not exist and a rewritten `label` both passed with 0 faults, and
    // deleting wizard-page's ENTIRE template record -- three slots -- also
    // passed, because the loop below used to iterate only the records still
    // present. A structure has nothing to forget.
    const expected = manifestOf([...scanned].map(([path, e]) => ({ path, root: e.root, html: e.html, scan: e })));
    const say = v => JSON.stringify(v);
    expectedBlocks = expected.blocks;
    expectedTemplates = expected.templates;

    const want = new Map(expected.blocks.map(b => [b.id, b]));
    const got = new Map(manifest.blocks.map(b => [b.id, b]));
    for (const [id, b] of want) {
      const m = got.get(id);
      if (!m) { faults.push(['STALE', MANIFEST, `${id} is marked in ${b.source} but not in the manifest — run \`npm run blocks\``]); continue; }
      for (const k of Object.keys(b)) {
        if (say(m[k]) !== say(b[k])) {
          const detail = k === 'html' ? `differs from its source region in ${b.source}:${b.line}` : `${k} is ${say(m[k])}, the source says ${say(b[k])}`;
          faults.push(['STALE', MANIFEST, `${id}: ${detail} — run \`npm run blocks\``]);
        }
      }
      for (const k of Object.keys(m)) if (!(k in b)) faults.push(['STALE', MANIFEST, `${id}: ${k} is in the manifest and not in the source — run \`npm run blocks\``]);
    }
    for (const id of got.keys()) if (!want.has(id)) faults.push(['STALE', MANIFEST, `${id} is in the manifest but no longer marked — run \`npm run blocks\``]);
    // ORDER IS PART OF THE FILE. The catalogue is offered in manifest order.
    if (say(manifest.blocks.map(b => b.id)) !== say(expected.blocks.map(b => b.id)) && want.size === got.size) {
      faults.push(['STALE', MANIFEST, `the blocks are in a different order from their sources — run \`npm run blocks\``]);
    }
    const dupes = manifest.blocks.map(b => b.id).filter((id, i, a) => a.indexOf(id) !== i);
    for (const id of new Set(dupes)) faults.push(['DUPLICATE', MANIFEST, `${id} appears more than once in the manifest — run \`npm run blocks\``]);

    // The template side, which nothing checked at all: a whole record could
    // vanish and the reassembly loop simply would not run for it.
    if (say(manifest.templates) !== say(expected.templates)) {
      const names = t => (t ?? []).map(x => x.name);
      const missing = names(expected.templates).filter(n => !names(manifest.templates).includes(n));
      const extra = names(manifest.templates).filter(n => !names(expected.templates).includes(n));
      for (const n of missing) faults.push(['STALE', MANIFEST, `template ${n} is marked but not in the manifest — run \`npm run blocks\``]);
      for (const n of extra) faults.push(['STALE', MANIFEST, `template ${n} is in the manifest but no longer marked — run \`npm run blocks\``]);
      if (!missing.length && !extra.length) faults.push(['STALE', MANIFEST, `a template record disagrees with its source — slots, offsets, containers or gaps — run \`npm run blocks\``]);
    }

    // Reassembly stays, because it proves something the comparison cannot: that
    // the recorded blocks and gaps REBUILD the file, not merely that they match
    // what the writer would emit.
    for (const t of expected.templates) {
      const src = scanned.get(t.path);
      const byName = Object.fromEntries(expected.blocks.filter(b => b.source === t.path).map(b => [b.name, b]));
      for (const s of t.slots) {
        const live = src.slots.find(x => x.name === s.name);
        if (!live) continue;
        if (assemble(s, byName) !== src.html.slice(live.start, live.end)) {
          faults.push(['REASSEMBLY', `${t.path}:${live.line}`, `SLOT ${s.name}: the manifest's blocks and gaps do not rebuild this slot byte for byte — run \`npm run blocks\``]);
        }
      }
    }
  }
}

// THE COVERAGE PAGE, same arrangement as the manifest: lib/coverage.mjs derives
// the table, build-blocks writes it, and this re-derives it and compares. Only
// the region between the markers is generated; the eligibility notes beside it
// are decisions kept by hand, and what is checked about them is that they still
// name something that exists.
if (!existsSync(COVERAGE)) {
  faults.push(['NO COVERAGE', COVERAGE, `not found — the catalogue's own measurement; run \`npm run blocks\``]);
} else {
  const md = readFileSync(COVERAGE, 'utf8');
  const a = md.indexOf(BEGIN), b = md.indexOf(END);
  if (a === -1 || b === -1) {
    faults.push(['NO MARKERS', COVERAGE, `needs ${BEGIN} and ${END} — build-blocks writes only between them`]);
  } else if (expectedBlocks) {
    const have = md.slice(a + BEGIN.length, b).trim();
    if (have !== coverageTable(expectedBlocks).trim()) {
      faults.push(['STALE', COVERAGE, `the generated table disagrees with the repository — run \`npm run blocks\``]);
    }
    const shipped = new Set(fragments());
    const marked = new Set(expectedBlocks.filter(x => x.source.startsWith('sink/')).map(x => x.source.slice(5, -5)));
    const outside = md.slice(0, a) + md.slice(b + END.length);
    const seen = new Set();
    for (const name of reasonsIn(outside)) {
      if (!shipped.has(name)) faults.push(['NO FRAGMENT', COVERAGE, `an eligibility note names \`${name}\` — no sink/${name}.html; the decision has outlived the file`]);
      else if (marked.has(name)) faults.push(['CONTRADICTED', COVERAGE, `\`${name}\` is listed as one that will not be marked, and it is marked — one of the two is wrong`]);
      if (seen.has(name)) faults.push(['DUPLICATE', COVERAGE, `two eligibility notes for \`${name}\``]);
      seen.add(name);
    }
  }
}

// THE GUIDE MAP. Hand-written data -- the purpose line, which slot is
// recommended, and the prose -- validated against the manifest it names.
// PLACEMENT EVIDENCE IS NOT IN IT: builder/placement.mjs derives whether a
// block's recorded layout matches a slot's, and this gate re-derives it with
// that same module, the arrangement lib/blocks.mjs and lib/coverage.mjs already
// have. A hand-written copy of a derivable fact is what `deps` was.
//
// `unless` AND `evidence` ARE DIFFERENT FIELDS AND ARE CHECKED DIFFERENTLY --
// rux's review, and the distinction is the point. `unless` says when the
// recommendation should not be followed; `evidence` says what has not been
// verified, and is REQUIRED exactly when the layouts do not match. The gate
// does not forbid an unmatched suggestion. It forbids making one silently.
if (!existsSync(GUIDE)) {
  faults.push(['NO GUIDE', GUIDE, `not found — the builder reads it for the purpose line and the suggestions`]);
} else if (expectedBlocks) {
  let guide;
  try { guide = JSON.parse(readFileSync(GUIDE, 'utf8')); }
  catch (e) { faults.push(['UNREADABLE', GUIDE, e.message]); }
  if (guide) {
    const byId = new Map(expectedBlocks.map(b => [b.id, b]));
    const templates = new Map(expectedTemplates.map(t => [t.name, t]));
    const entries = guide.templates ?? {};

    for (const name of templates.keys()) {
      if (!(name in entries)) faults.push(['NO ENTRY', GUIDE, `${name} is a template and the map has no entry for it — every shape needs a purpose line, even an unreviewed one`]);
    }
    for (const [name, e] of Object.entries(entries)) {
      const t = templates.get(name);
      if (!t) { faults.push(['NO TEMPLATE', GUIDE, `${name} has a map entry and is not a template — the shape has gone`]); continue; }
      if (typeof e.purpose !== 'string' || !e.purpose.trim()) faults.push(['NO PURPOSE', GUIDE, `${name}: purpose is missing or blank — the one line the guided mode opens with`]);
      if (typeof e.reviewed !== 'boolean') faults.push(['NOT BOOLEAN', GUIDE, `${name}: reviewed is ${JSON.stringify(e.reviewed)} — it is rux's record that a human read this, and is never inferred`]);

      const seen = new Set();
      for (const s of e.suggestions ?? []) {
        const at = `${name} → ${s.block ?? '(no block)'}`;
        const b = byId.get(s.block);
        if (!b) { faults.push(['NO BLOCK', GUIDE, `${at}: no such block in the catalogue — run \`npm run blocks\`, or the suggestion has outlived its block`]); continue; }
        const slot = t.slots.find(x => x.name === s.slot);
        if (!slot) { faults.push(['NO SLOT', GUIDE, `${at}: ${name} has no slot "${s.slot}" — it has ${t.slots.map(x => x.name).join(', ')}`]); continue; }
        const pair = `${s.block}@${s.slot}`;
        if (seen.has(pair)) faults.push(['DUPLICATE', GUIDE, `${at}: suggested into ${s.slot} twice`]);
        seen.add(pair);
        if (typeof s.reason !== 'string' || !s.reason.trim()) faults.push(['NO REASON', GUIDE, `${at}: a suggestion with no reason is an instruction, not advice`]);
        if (s.unless != null && (typeof s.unless !== 'string' || !s.unless.trim())) faults.push(['BAD UNLESS', GUIDE, `${at}: unless must be a non-empty string or null — it says when NOT to follow this`]);
        if (typeof s.reviewed !== 'boolean') faults.push(['NOT BOOLEAN', GUIDE, `${at}: reviewed is ${JSON.stringify(s.reviewed)}`]);

        const matched = matchesContainer(b, slot);
        const has = typeof s.evidence === 'string' && s.evidence.trim();
        if (!matched && !has) faults.push(['NO EVIDENCE', GUIDE, `${at}: ${s.block}'s recorded layout does not match ${name}/${s.slot} — say what is unverified in \`evidence\`, or do not suggest it. The suggestion is allowed; making it silently is not`]);
        if (matched && has) faults.push(['SPURIOUS EVIDENCE', GUIDE, `${at}: the layouts DO match, so \`evidence\` claims a doubt the derivation does not have — clear it, or the field stops meaning anything`]);
      }
    }

    // The variant recommendations, keyed "<block id>#<ordinal>" -- stage 9's
    // ordinal identity, never an offset. The accepted values come from the
    // group itself, so the map, the select and this gate cannot disagree.
    for (const [key, v] of Object.entries(guide.variants ?? {})) {
      const at = key.lastIndexOf('#');
      const b = byId.get(key.slice(0, at));
      const i = Number(key.slice(at + 1));
      if (at === -1 || !b || !Number.isInteger(i)) { faults.push(['NO GROUP', GUIDE, `${key} does not name a block and an ordinal`]); continue; }
      const groups = variantsOf(b.html);
      if (!groups[i]) { faults.push(['NO GROUP', GUIDE, `${key}: ${b.id} has ${groups.length} variant group${groups.length === 1 ? '' : 's'}, so ordinal ${i} names nothing`]); continue; }
      if (typeof v.reviewed !== 'boolean') faults.push(['NOT BOOLEAN', GUIDE, `${key}: reviewed is ${JSON.stringify(v.reviewed)}`]);
      if (v.recommended !== 'as-attested' && !groups[i].values.includes(v.recommended)) {
        faults.push(['NO VALUE', GUIDE, `${key}: recommends ${JSON.stringify(v.recommended)}, which this group does not offer — it offers as-attested, ${groups[i].values.join(', ')}`]);
      }
    }
    for (const b of expectedBlocks) variantsOf(b.html).forEach((g, i) => {
      const k = variantKey(b.id, i);
      if (!(k in (guide.variants ?? {}))) faults.push(['NO ENTRY', GUIDE, `${k} is a variant group with no recommendation — "as-attested" is a decision and is written down like any other`]);
    });
  }
}

for (const [tag, where, why] of faults) {
  console.log(`  ${tag.padEnd(14)}${where}`);
  console.log(`  ${''.padEnd(14)}${why}`);
}
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
console.log(`  check-blocks: ${plural(found.size, 'block')} in ${plural(files, 'file')} · ${plural(slotCount, 'slot')} · ${plural(faults.length, 'fault')}`);
console.log('  This says every marked region is well-formed, closed and copied exactly, and every slot rebuilds its file. It does not say it is the right region.');
process.exit(faults.length ? 1 : 0);
