#!/usr/bin/env node
//
// THE ONE CHECK. Runs every gate this repository has, in order, and exits 1 if
// any of them fails. `node tools/check.mjs` is what a person types, what the
// commit hook runs last, and what CI would run.
//
// WHY ONE FILE. Six check scripts exist and until this one only one of them
// ran without being typed. A gate nobody runs is a gate that passed, and
// the repository already recorded that shape once (a dead link shipped with
// everything else green). This file adds no rule; it only makes sure the rules
// that exist are asked.
//
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Order: the cheap structural checks first, publishability last so its
// refusal is the final word on the screen.
const GATES = [
  // THE REBUILD, FIRST OF ALL. Everything after this reads index.html; if it
  // was stale, this gate rewrote it from data/ before any of it ran, so every
  // gate below sees current content.
  ['check-build',       []],
  // Design's shared check next, and app-specific gates after it: the
  // convention tools/check-app.mjs states, and the one Scheduler follows.
  // Added 2026-09-09 after an undeclared token shipped in 28 pages with all
  // seven gates below green -- none of them reads a token.
  ['check-app',         []],
  ['check-classes',     []],
  ['check-structure',   []],
  ['check-links',       []],
  ['check-ancestry',    []],
  ['check-data',        []],
  ['check-publishable', []],
];

const run = (script, args) =>
  spawnSync(process.execPath, [join(ROOT, 'tools', `${script}.mjs`), ...args],
            { cwd: ROOT, stdio: 'inherit' }).status ?? 1;

const failed = [];
for (const [gate, args] of GATES) {
  console.log(`\n── ${gate}`);
  if (run(gate, args) !== 0) failed.push(gate);
}

// The commit hook is the repository root's (.githooks/pre-commit), and
// MEASURED with its measure.mjs retired with the move into rux-sm.github.io
// on 2026-09-12: status bookkeeping, not a gate.
console.log('');
if (failed.length) {
  console.log(`  FAILED: ${failed.join(', ')}`);
  process.exit(1);
}
console.log(`  ${GATES.length} gates passed.`);
