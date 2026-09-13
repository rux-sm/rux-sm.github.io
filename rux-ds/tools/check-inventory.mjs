#!/usr/bin/env node
//
// Every component Carbon ships has a row, and every row is decided.
//
// WHY THIS GATE EXISTS. On 2026-08-31 a Carbon bump took the component set from
// 75 to 83 and nothing noticed. `docs/inventory.md` said "75 rows, every row
// decided" and was, on its own terms, complete; §4.2's exit was met against a
// number a DEPENDENCY controls. Eight components arrived with no row, no
// disposition and no line in the build manifest, and the only thing that caught
// it was a person re-reading a table.
//
// That is the same shape as the two drift bugs already recorded: a second copy
// of the manifest going stale (`measure.mjs`'s theme pair, then its emit
// includes). Both were fixed by reading from the source of truth. The inventory
// had no such fix, because `tools/inventory.mjs` GENERATES and never asserts —
// it reads the same directory this gate reads, writes JSON, and exits 0 whether
// or not the decisions kept up.
//
// So the defect is not a missing decision. It is that
// A COMPONENT NOBODY HAS DECIDED IS INDISTINGUISHABLE FROM ONE DECIDED CUT.
// Both are absent from css/rux.css, and absence is what every other gate reads.
//
// WHAT IT CHECKS. Three sources, which must agree:
//
//   node_modules/@carbon/styles/scss/components   what Carbon actually ships
//   docs/inventory.md                             the disposition of each
//   src/app.scss                                  what the build compiles
//
//   unrowed    Carbon ships it and the inventory has no row for it
//   phantom    the inventory has a row for something Carbon no longer ships
//   undecided  a row whose disposition is not one of the three decided words
//   unlisted   Carbon ships it and the manifest does not mention it at all —
//              neither `@use`d nor commented, so it can be neither kept nor cut
//   mismatch   the disposition and the manifest disagree: KEEP is commented
//              out, or CUT/DEFER is compiling
//   shadowed   a stub in sink/deferred/ has the same name as a fragment that
//              ships, so two files answer for one component and one is dead
//   stale      docs/inventory.json was compiled from a Carbon that is not the
//              one installed, or says nothing about which. Added 2026-09-02:
//              ownership.mjs, check-coverage, build-portal and stats all read
//              that file, nothing in verify regenerates it, and until now it
//              could not say which Carbon it came from.
//
// WHAT IT IS BLIND TO. Whether a disposition is RIGHT. CUT and DEFER are
// judgements and this gate cannot grade one; it only insists that somebody made
// it and that the manifest says the same thing. It also cannot see a component
// Carbon renames — that arrives as one `phantom` and one `unrowed` with nothing
// tying them together, which is a finding either way.
//
// Roadmap §4.2. Its exit is now count-free for the reason this gate enforces.
//
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const COMP_DIR = 'node_modules/@carbon/styles/scss/components';

// The three decided words. UNDECIDED is deliberately NOT here: it is a real
// state a row may carry while somebody is thinking, and this gate is what stops
// it being carried indefinitely.
const DECIDED = ['KEEP', 'DEFER', 'CUT'];

// Carbon ships four PascalCase directories as of 1.114 — EditInPlace,
// FullPageError, InterstitialScreen, OptionsTile — ibm-products' own convention
// surviving the move into @carbon/styles. The character class has to admit
// them, so it cannot be [a-z-] however much the other 79 look like it.
const shipped = readdirSync(COMP_DIR)
  .filter(d => !d.startsWith('_') && !d.startsWith('__')).sort();

// Rows are `| `name` | **DISPOSITION** | ...`. The dependency-core table above
// them is `| `name` | 37 | kept |` — column two is a count, not a bolded word,
// so requiring the bold is what keeps these apart without a section scanner.
const md = readFileSync('docs/inventory.md', 'utf8');
const rows = [...md.matchAll(/^\|\s*`([A-Za-z0-9-]+)`\s*\|\s*\*\*([A-Z]+)\*\*\s*\|/gm)]
  .map(m => ({ name: m[1], disposition: m[2] }));
const byName = new Map(rows.map(r => [r.name, r.disposition]));

// The manifest lists a component whether or not it compiles: a commented line
// is a CUT or DEFER row, and uncommenting it is the whole of restoring one.
// Sub-modules (`data-table/sort`) collapse onto their component, and a
// component counts as compiled if ANY of its lines is live.
const scss = readFileSync('src/app.scss', 'utf8');
const listed = new Map();
for (const m of scss.matchAll(/^(\s*\/\/\s*)?@use "@carbon\/styles\/scss\/components\/([A-Za-z0-9-]+)/gm)) {
  listed.set(m[2], (listed.get(m[2]) ?? false) || !m[1]);
}

const faults = [];
for (const name of shipped) {
  const disposition = byName.get(name);
  if (!disposition) {
    faults.push(['unrowed', name, 'Carbon ships it; docs/inventory.md has no row']);
    continue;
  }
  if (!DECIDED.includes(disposition)) {
    faults.push(['undecided', name, `disposition is ${disposition}, not one of ${DECIDED.join('/')}`]);
  }
  if (!listed.has(name)) {
    faults.push(['unlisted', name, 'src/app.scss does not mention it, commented or otherwise']);
    continue;
  }
  const compiled = listed.get(name);
  if (disposition === 'KEEP' && !compiled) {
    faults.push(['mismatch', name, 'KEEP, but its @use is commented out']);
  }
  if ((disposition === 'CUT' || disposition === 'DEFER') && compiled) {
    faults.push(['mismatch', name, `${disposition}, but it is compiling`]);
  }
}
for (const { name } of rows) {
  if (!shipped.includes(name)) {
    faults.push(['phantom', name, `row exists; ${COMP_DIR} has no such component`]);
  }
}

// SHADOWED. Restoring a deferred component is documented in README as three
// lines -- uncomment its @use, MOVE the fragment back, add it to sink/ORDER --
// and the word doing the work is MOVE. Copy it instead and two files answer the
// same question with one of them dead.
//
// THIS IS THIS GATE'S OWN FOUNDING DEFECT IN A SECOND PLACE. The header above
// says a component nobody has decided is indistinguishable from one decided
// CUT, because absence is what every other gate reads. A leftover stub is the
// same shape: A DEAD STUB IS INDISTINGUISHABLE FROM A LIVE DEFERRAL, because
// sitting in sink/deferred/ is what both look like.
//
// NOTHING ELSE CAN SEE IT. tools/lib/sources.mjs excludes sink/deferred/ by
// design -- a finding must name a file you can edit, and a deferred fragment is
// not in the build -- so every per-file gate is blind there by construction.
// `2930323` paid for this once: progress-indicator's 51-line stub sat for two
// days after the component was admitted, shadowing the 140-line fragment that
// ships. The sixteen admissions of 2026-08-31 left six more, found on
// 2026-09-01 by listing the directory rather than by any gate.
//
// THE RULE IS FILENAME COLLISION, NOT DISPOSITION, and that is deliberate.
// `fluid` and `stack` are fragment names rather than Carbon component names, so
// resolving through the inventory would miss exactly the two hardest to reason
// about. Two files with one name is the defect, whatever either is called.
const DEFERRED_DIR = 'sink/deferred';
const htmlIn = dir => (existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith('.html')) : []);
const shipping = new Set(htmlIn('sink'));
for (const f of htmlIn(DEFERRED_DIR).sort()) {
  if (shipping.has(f)) {
    faults.push(['shadowed', f.replace(/\.html$/, ''),
      `${DEFERRED_DIR}/${f} shadows the sink/${f} that ships — move it, do not copy it`]);
  }
}

// STALE. docs/inventory.json is a baseline four tools read and only
// `npm run inventory` writes. A Carbon bump that nobody follows with that
// command leaves every reader on the old class vocabulary with the gates green.
const installed = JSON.parse(readFileSync('node_modules/@carbon/styles/package.json', 'utf8')).version;
const inventory = JSON.parse(readFileSync('docs/inventory.json', 'utf8'));
if (inventory.carbon !== installed) {
  faults.push(['stale', 'docs/inventory.json',
    `compiled from @carbon/styles ${inventory.carbon ?? '(unrecorded)'}, installed ${installed} — run npm run inventory`]);
}

for (const [tag, name, why] of faults) {
  console.log(`  ${tag.padEnd(11)}${name}`);
  console.log(`  ${''.padEnd(11)}${why}`);
}

const tally = DECIDED.map(d => `${rows.filter(r => r.disposition === d).length} ${d}`).join(' · ');
const open = rows.filter(r => !DECIDED.includes(r.disposition)).length;
console.log(`\n  carbon ${shipped.length} · rows ${rows.length} · ${tally}${open ? ` · ${open} undecided` : ''}`);
console.log(`  manifest ${listed.size} listed · ${[...listed.values()].filter(Boolean).length} compiling`);
if (faults.length) console.log(`  faults ${faults.length}`);
console.log();
process.exit(faults.length ? 1 : 0);
