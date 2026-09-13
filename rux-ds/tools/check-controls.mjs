#!/usr/bin/env node
//
// WHICH CONTROLS DID THIS CHANGE TOUCH?
//
// A control is a file that decides whether anything else passes: a gate, the
// registry, a baseline a gate compares against, the CI that runs them, the
// commit hook, or an instruction file. `CONTROL_FILES` in tools/lib/gates.mjs
// is the list and carries the reasoning.
//
// THIS IS NOT A GATE AND IT NEVER FAILS. It is deliberately not in
// `npm run verify` and it has no registry entry, because it asserts nothing
// about the repository — it reports what a diff contains. Registering it would
// claim a check that does not exist.
//
// WHY IT CANNOT BLOCK. CI runs the gates from the same commit that changed
// them, so a weakened gate certifies itself; blocking here would only mean an
// agent learns to route around it, and the repository already records that a
// gate people route around is worse than none. There is also one maintainer,
// so there is nowhere to escalate to. What this buys is that a control changed
// by accident stops looking identical to a control changed on purpose.
//
//   node tools/check-controls.mjs              staged and unstaged, vs HEAD
//   node tools/check-controls.mjs <base>       vs a ref — <base>..HEAD
//   node tools/check-controls.mjs --list       the controls themselves
//
// In CI it prints a `::warning::` line per control, which GitHub surfaces on
// the run and on the file in a pull request.
//
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { CONTROL_FILES } from './lib/gates.mjs';

const arg = process.argv[2];

if (arg === '--list') {
  // An entry naming a file that no longer exists is a stale list, which is the
  // rot this repository keeps state files to avoid. Say so; do not fail.
  for (const p of CONTROL_FILES)
    console.log(existsSync(p) ? `  ${p}` : `  ${p}  — MISSING, the list has aged`);
  process.exit(0);
}

const git = args => {
  try { return execFileSync('git', args, { encoding: 'utf8' }); }
  catch { return ''; }
};

// Two ranges, because the question differs by caller. With a base ref this is
// "what does this push or PR contain"; without one it is "what have I got in
// front of me right now", which is the useful local question and has to include
// the unstaged half — and the UNTRACKED half, because a brand-new control is
// invisible to `git diff` and a new gate is exactly the change worth naming.
// This file was itself untracked on its first run and did not report itself.
const changed = new Set(
  (arg
    ? git(['diff', '--name-only', `${arg}...HEAD`])
    : git(['diff', '--name-only', 'HEAD'])
      + git(['diff', '--name-only', '--cached'])
      + git(['ls-files', '--others', '--exclude-standard']))
    .split('\n').map(s => s.trim()).filter(Boolean));

const touched = CONTROL_FILES.filter(p => changed.has(p));
const ci = process.env.GITHUB_ACTIONS === 'true';

if (!touched.length) {
  console.log(`\n  CONTROLS  none of ${CONTROL_FILES.length} touched`
    + `${arg ? ` in ${arg}...HEAD` : ''}\n`);
  process.exit(0);
}

console.log(`\n  CONTROLS TOUCHED — ${touched.length} of ${CONTROL_FILES.length}`);
for (const p of touched) console.log(`             ${p}`);
console.log('\n             A control decides whether other checks pass, and CI runs it from'
  + '\n             the same commit that changed it. Nothing here verified that this'
  + '\n             change strengthens the control rather than weakening it.\n');

if (ci)
  for (const p of touched)
    console.log(`::warning file=${p}::Control file changed — CI runs this from the same `
      + `commit, so it cannot judge its own change. Confirm this strengthens the control.`);

process.exit(0);
