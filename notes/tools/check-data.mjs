#!/usr/bin/env node
//
// Is data/guides/ the bytes sync-guides.sh delivered?
//
// WHY IT EXISTS. Every page here is generated from data/guides/, and the only
// thing that sweeps that data for names, issue ids and evidence paths is
// atlas's emit.py, on the private side, when sync-guides.sh runs it. A hand
// edit to a JSON file -- or a regeneration that did not go through atlas --
// arrives with none of that and looks like data. The commit hook refuses it on
// a machine with the sibling checkout; a commit that skipped the hook reached
// CI with nothing to compare against, and CI cannot read atlas. This is the
// comparison: sync-guides.sh records a hash of what it wrote, in the PIN
// beside the commit, and this refuses when the tree no longer matches.
//
// WHAT IT PROVES. That the bytes came from a sync, not what they contain. It
// carries no name and needs no atlas. It cannot see a generator that injects
// text or a hand-written page; AGENTS.md records those as the accepted limit.
//
// THE HASH IS DETERMINISTIC OVER PATHS AND BYTES: sha256 of the lines
// "<sha256 of file>  <path>\n", one per file under data/guides/ except PIN,
// sorted by path in byte order. Nothing but sync-guides.sh writes it, and
// ordinary tooling (build.mjs, measure.mjs, the hook) never touches the PIN.
//
//   node tools/check-data.mjs          # compare, exit 1 on mismatch or no record
//   node tools/check-data.mjs --hash   # print the hash of the tree, for the sync
//
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'data', 'guides');
const PIN = join(DATA, 'PIN');

const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (p !== PIN) files.push(p);
  }
};
walk(DATA);
const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const lines = files
  .map((p) => [relative(DATA, p), sha(readFileSync(p))])
  .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
  .map(([path, h]) => `${h}  ${path}\n`);
const hash = sha(lines.join(''));

if (process.argv.includes('--hash')) { console.log(hash); process.exit(0); }

const recorded = /^sha256\s+([0-9a-f]{64})/m.exec(readFileSync(PIN, 'utf8'))?.[1];
if (!recorded) {
  console.log('\n  data/guides/PIN records no sha256, so nothing can be compared.');
  console.log('  Run sh tools/sync-guides.sh; it writes one. Not a pass.\n');
  process.exit(1);
}
if (recorded !== hash) {
  console.log(`\n  data/guides/ does not match the hash sync-guides.sh recorded.`);
  console.log(`  recorded ${recorded.slice(0, 12)}…  tree ${hash.slice(0, 12)}…  over ${files.length} file(s)`);
  console.log('  Something edited or regenerated the data without going through atlas.');
  console.log('  Re-run sh tools/sync-guides.sh; never hand-edit data/guides/.\n');
  process.exit(1);
}
console.log(`\n  ${files.length} file(s) under data/guides/ match the hash sync-guides.sh recorded (${hash.slice(0, 12)}…)`);
console.log('  This says the bytes came from a sync. What they contain was swept in atlas.\n');
