#!/usr/bin/env node
//
// HAS THIS GATE EVER BEEN RUN AGAINST THIS TARGET?
//
// The repo could not answer that question until 2026-08-29, and it cost nine
// instances of one bug. `check-a11y.js` already carried the rule that catches a
// focusable control inside an `aria-hidden` subtree; it had simply never been
// pointed at `templates/`, where the closed batch bar lived. The gate was green
// everywhere it had been run, and silent everywhere it had not, and nothing
// distinguished the two.
//
// So this gate checks COVERAGE, not correctness. Four states per cell:
//
//   NEVER RUN   no recorded result for this gate against this page
//   STALE       a declared input has a commit since the one the run recorded
//   DIRTY       an input has uncommitted changes, so the result is not
//               reconstructable by anyone else
//   NO COMMIT   a ledger entry with nothing to age against — its own finding
//   UNKNOWN COMMIT
//               the ledger names a commit this clone does not have, so the
//               reading cannot be aged by anyone. Added 2026-09-01 after twelve
//               check-spacing cells recorded a rewritten commit and read `ok`
//               for it — see tools/lib/staleness.mjs. Like NO COMMIT it prints
//               and does not block: the fix is a re-sweep, the same as STALE.
//
// WHY THIS ONE MAY BE PROMOTED WHEN TWO OTHERS COULD NOT. Two candidate rules
// were tested on 2026-08-29 and both failed this project's standard: a
// subset/superset rule gave nine findings of which one was real, and a
// provenance-vs-closest-story rule fired on almost nothing. Both asked for
// judgement, so both needed an allow-list, and a rule that needs one measures
// the list. This asks a question of FACT — was it run since its inputs changed —
// so there is nothing to exempt and nothing to argue with.
//
// STALENESS IS MEASURED IN COMMITS, NOT DATES, and the first draft got this
// wrong in a way worth recording. It stored a day ("2026-08-29") and compared it
// against `git log -1 --format=%cI`, a full ISO timestamp. String comparison put
// every same-day commit after the recorded day, so all 22 cells read STALE the
// moment the ledger was written. Coarsening to a day would have been worse: the
// case that motivated this gate — js/menu.js edited AFTER an a11y run, the same
// afternoon — is exactly the one day-granularity cannot see.
//
// So a ledger entry records the HEAD commit it was taken at, and a cell is stale
// when any declared input has a commit in `<recorded>..HEAD`. That is exact,
// needs no clock, and is reproducible in any clone.
//
// It cannot see an UNCOMMITTED edit, so the working tree is checked separately
// and reported as DIRTY — a result taken against a modified file is not
// something a later reader can reconstruct.
//
// THE INPUTS ARE WIDER THAN THE PAGE. A browser reading depends on the
// stylesheet that decides what renders and the modules that rewrite the markup,
// so `css/rux.css` and `js/` invalidate every browser cell. That is not
// theoretical: editing js/menu.js on 2026-08-29 invalidated every template's
// a11y result and nothing said so.
//
// WHAT IT CANNOT DO. Verify that a recorded result is honest. A browser result
// is typed back by whoever ran it, and this gate takes it on trust — the same
// limit `check-provenance` accepts by name, which "cannot tell whether the page
// was ever opened, exactly as it cannot tell whether a `rendered-dom` label is
// true." It can only tell you nobody has claimed to run it.
//
// IT FAILS ON NEVER RUN AND NOT ON STALE, promoted into `npm run verify` on
// 2026-08-29 once the matrix was filled in both themes. The asymmetry is
// deliberate and it is the difference between a gate people keep and a gate
// people route around.
//
//   NEVER RUN is a hole. Nobody has ever pointed this gate at this page, which
//             is exactly the state that let a bug ship nine times. It is also
//             rare — it appears when a page is ADDED, which is a moment worth
//             stopping for.
//   STALE     is ordinary. Editing css/rux.css or anything in js/ invalidates
//             every browser cell by design, so a hard failure here would turn
//             the build red on almost every commit and stay red until someone
//             hand-ran four tools across seven pages in two themes. That is a
//             gate nobody would keep. It prints, loudly, and does not block.
//
// So the rule is: a page nobody has checked stops the build; a reading that has
// aged tells you to re-sweep and lets you work.
//
//   node tools/check-gates.mjs           the matrix
//   node tools/check-gates.mjs --gaps    only the cells that need a run
//
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { GATES, browserGates, cells, inVerify } from './lib/gates.mjs';
import { cellStates } from './lib/staleness.mjs';

// THE RULE NOW LIVES IN tools/lib/staleness.mjs. It moved there when
// portal.html became a second reader of the same matrix and counted recorded
// cells instead of current ones — see that file's header. Nothing about the
// states or their precedence changed in the move.
const gapsOnly = process.argv.includes('--gaps');

const rows = cellStates();

const gaps = rows.filter(r => r.state !== 'ok');
const width = Math.max(...rows.map(r => r.id.length));

console.log();
for (const r of (gapsOnly ? gaps : rows)) {
  const tag = r.state === "ok" ? "  ok            " : `  ${r.state.padEnd(14)}`;
  console.log(`${tag} ${r.id.padEnd(width)}  ${r.page}${r.why ? '  ·  ' + r.why : ''}`);
}

// The gates that cannot reach a target at all are part of the coverage picture
// and are easy to mistake for cells nobody has got to yet.
const blocked = browserGates().filter(g => !g.canRun.templates);
if (blocked.length && !gapsOnly) {
  console.log();
  for (const g of blocked)
    console.log(`  N/A       ${g.id.padEnd(width)}  templates/*  ·  ${g.cannotRunReason}`);
}

console.log();
// This tool is NOT one of the gates it counts. It checks the coverage of those gates, not
// the design system, so it reads the registry rather than appearing in it.
console.log(`  ${GATES.length} gates — ${inVerify().length} in npm run verify, `
  + `${browserGates().length} need a browser; this coverage check runs there too`);
// Every non-ok state gets its own figure. The line used to print STALE alone,
// so twelve UNKNOWN COMMIT cells would have read "24 stale" here against
// "36 not current" on the portal — two readers, two numbers, same tree.
const byState = [...new Set(gaps.map(r => r.state))].filter(st => st !== 'NEVER RUN')
  .map(st => `${gaps.filter(r => r.state === st).length} ${st.toLowerCase()}`);
console.log(`  ${rows.length} sweep cells · ${rows.length - gaps.length} current · `
  + byState.concat(`${gaps.filter(r => r.state === 'NEVER RUN').length} never run`).join(' · '));
const never = gaps.filter(r => r.state === 'NEVER RUN');
const stale = gaps.filter(r => r.state !== 'NEVER RUN');
if (stale.length) console.log(`  ${stale.length} reading${stale.length === 1 ? '' : 's'} `
  + `no longer current — re-sweep and record; this does not fail the build`);
if (never.length) console.log(`  ${never.length} cell${never.length === 1 ? '' : 's'} `
  + `never run. Sweep the page and record it in docs/gate-coverage.json`);
console.log();

// THE HOOKS ARE PER CLONE, and until 2026-09-02 nothing in verify said so: a
// fresh clone commits with no checks and every gate still passes. Reported,
// not enforced -- CI has no hooks and no need of them.
if (!process.env.CI) {
  const { spawnSync } = await import('node:child_process');
  const hp = (spawnSync('git', ['config', 'core.hooksPath'], { encoding: 'utf8' }).stdout ?? '').trim();
  if (hp !== '.githooks')
    console.log('  WARNING: commit hooks are not armed in this clone — git config core.hooksPath .githooks\n');
}

process.exit(never.length ? 1 : 0);
