#!/usr/bin/env node
//
// AN ARIA ROLE CARBON NEVER RENDERS. For every element here that carries both a
// `role` and a `rux--` class, ask the captures whether Carbon ever renders that
// role on that class. If the class is attested and NEVER carries the role, the
// role was invented.
//
// THE TWENTY-FIRST GATE, admitted 2026-08-31 (roadmap §4.8), and the FIRST THING
// IN THIS REPOSITORY THAT READS THE CAPTURES' ATTRIBUTE DATA. Every other gate
// reads classes, elements or computed boxes. The captures have recorded
// attributes as `[role=x]{aria-y=z}` beside the element all along and nothing
// looked at them.
//
// WHY IT EXISTS. sink/ui-shell.html carried role="menu" on the side nav's `ul`.
// The capture it cites renders that element bare. `role="menu"` requires
// `menuitem` children and these are `li > a` with no role, so an AT was told it
// had entered a menu and then found nothing in it. Every class gate was blind by
// construction — a bare attribute is not a class — and check-a11y was blind by
// its own rule, which counts `[role^="menuitem"]` descendants and skips a
// composite that has none, so zero items yielded neither a finding nor a note.
// Fixed at `643a20e`, by a person walking the tab order.
//
// A ROLE PASSES IF **ANY** OF THE ELEMENT'S CLASSES CARRIES IT IN **ANY**
// CAPTURE. That is deliberately generous, and the reason is the same one
// check-slots gives: a false finding that has to be exempted teaches nothing, and
// an exception list is not a passing check. This gate is here to catch a role
// with no basis at all, not to police which of two attested spellings was used.
//
// A CLASS THE CAPTURES HAVE NEVER SEEN IS REPORTED **UNCOVERED**, NEVER PASSED.
// Same rule as check-slots: silence about a thing is not evidence about it.
//
// WHAT IT CANNOT SEE, and this bounds the whole gate: the extractor records
// THIRTEEN aria attributes and `aria-live` is not one of them. So the absence of
// a live region in a capture proves nothing, and any question that turns on
// `aria-live` — `role="status"` and `role="alert"` are both implicit live
// regions — is outside this gate's reach. The `loading` entry in KNOWN is exactly
// that case.
//
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { markupFiles, pageFiles } from './lib/sources.mjs';

const CAPTURES = ['docs/carbon-react-dom.json', 'docs/carbon-react-states.json',
                  'docs/carbon-ibm-products-dom.json', 'docs/carbon-ibm-products-states.json'];

// Adjudicated divergences. `class:role` -> reason. Kept SMALL on purpose; if this
// grows past a handful the rule is not ready and should be reported unenforced.
const KNOWN = {
  'loading:status': 'OUT OF THIS GATE\'S REACH rather than accepted. Carbon renders '
    + '`cds--loading` with no role, but `role="status"` is an implicit LIVE REGION and '
    + 'the extractor does not record `aria-live` — it captures thirteen aria attributes '
    + 'and that is not one of them. So the capture cannot distinguish "Carbon announces '
    + 'nothing here" from "Carbon announces it by a means we never recorded". Removing '
    + 'the role on this evidence would be deciding the question the wrong way round. '
    + 'Widen the extractor and this entry can be settled; roadmap §4.8.',
};

// ---------------------------------------------------------------------------
// Reference: class -> the set of roles Carbon renders it with.
const ROLES = new Map(), SEEN = new Map();
for (const file of CAPTURES) {
  if (!existsSync(file)) continue;
  const j = JSON.parse(readFileSync(file, 'utf8'));
  for (const [story, val] of Object.entries(j)) {
    if (story === '_meta') continue;
    for (const line of (Array.isArray(val) ? val : val?.dom ?? [])) {
      const m = String(line).match(/^\s*[a-z0-9]+((?:\.[A-Za-z0-9_:\\-]+)*)(?:\[role=([^\]]+)\])?/);
      if (!m) continue;
      const classes = (m[1] || '').split('.').filter(Boolean).map(c => c.replace(/\\/g, ''));
      for (const c of classes) {
        if (!c.startsWith('cds--')) continue;
        SEEN.set(c, (SEEN.get(c) || 0) + 1);
        if (m[2]) (ROLES.get(c) ?? ROLES.set(c, new Set()).get(c)).add(m[2]);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Our markup: fragments and templates by file, plus the generated root pages.
const targets = markupFiles().map(f => ({ name: f.name, path: f.path }));
for (const t of pageFiles()) {
  if (!existsSync(t) || statSync(t).isDirectory()) continue;
  targets.push({ name: t, path: t });
}

let findings = 0, uncovered = 0, passed = 0, unclassed = 0, declined = 0;
const showAll = process.argv.includes('--all');

for (const { name, path } of targets) {
  const src = readFileSync(path, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const seenHere = new Set();
  // `\srole="`, NOT `\brole="`. Reported by rux 2026-09-10 and fixed here.
  // `\b` matches between the hyphen and the r in `data-role="label"` — a
  // hyphen is not a word character and `r` is — so EVERY `data-role`,
  // `data-thc-role` or any other custom `*-role` attribute was read as an
  // ARIA role and measured against the captures. It surfaced on
  // theme-creator.html, whose row <template> used `data-role` to mark the
  // parts a clone fills in: four elements were reported as carrying roles
  // Carbon never renders — `role="label"`, `role="hex"`, `role="note"`,
  // `role="used"` — and the page was changed to `data-thc` to get past a
  // gate that was wrong, which is the wrong way round and is why this is
  // being fixed rather than worked around again.
  //
  // WHAT THE NARROWING COSTS: nothing that was ever a true positive. An
  // ARIA role attribute is separated from the tag name or the attribute
  // before it by whitespace, always — there is no valid markup in which
  // `role=` is preceded directly by a word character, and the only strings
  // of that shape are custom attributes ENDING in `role`, none of which is
  // an ARIA role. Proven rather than argued: a probe fragment carrying
  // `data-role="alpha"` and `role="beta"` on the same attested class read
  // 2 invented under `\b` and 1 under `\s`, the one being beta; and the
  // whole-repo run is otherwise identical, 604 corroborated and 4 declined
  // either way.
  //
  // WHAT IT STILL CANNOT SEE, unchanged by this: a role written inside
  // another attribute's value, and any role a script sets at runtime. This
  // gate reads files.
  for (const m of src.matchAll(/<([a-z0-9]+)\b([^>]*\srole="([^"]+)"[^>]*)>/g)) {
    const [, tag, attrs, role] = m;
    const cm = attrs.match(/class="([^"]*)"/);
    const classes = (cm ? cm[1].split(/\s+/) : [])
      .filter(c => c.startsWith('rux--')).map(c => c.replace(/^rux--/, 'cds--'));

    // No rux class means no reference can exist — a bare wrapper, not our markup's claim.
    if (!classes.length) { unclassed++; continue; }

    const attested = classes.filter(c => SEEN.has(c));
    if (!attested.length) {
      uncovered++;
      if (showAll) console.log(`  UNCOVERED  ${name.padEnd(26)} ${tag}.${classes[0].replace('cds--', '')} role=${role}`);
      continue;
    }
    if (attested.some(c => ROLES.get(c)?.has(role))) { passed++; continue; }

    const stem = attested[0].replace('cds--', '');
    const key = `${stem}:${role}`;
    if (KNOWN[key]) { declined++; if (showAll) console.log(`\n  ${name}.html  ${stem} role=${role}  DECLINED\n    ${KNOWN[key]}`); continue; }
    if (seenHere.has(key)) continue;
    seenHere.add(key);

    const carbonUses = [...new Set(attested.flatMap(c => [...(ROLES.get(c) ?? [])]))];
    console.log(`\n  ${name}`);
    console.log(`      <${tag} class="rux--${stem}" role="${role}">`);
    console.log(`         Carbon renders this class ${SEEN.get(attested[0])}× and NEVER with role="${role}"`);
    console.log(`         it renders ${carbonUses.length ? carbonUses.map(r => `role="${r}"`).join(' or ') : 'NO role at all'} there`);
    findings++;
  }
}

console.log(`\n  ${SEEN.size} classes in the captures · ${ROLES.size} ever carrying a role`);
console.log(`  ${passed} role sites corroborated · ${declined} declined · ${uncovered} uncovered`
  + ` · ${unclassed} on unclassed elements · ${findings} invented`);
if (findings) {
  console.log('  a role Carbon never renders on that class — remove it, or record it in KNOWN with a reason\n');
  process.exit(1);
}
