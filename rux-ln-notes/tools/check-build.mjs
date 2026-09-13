#!/usr/bin/env node
//
// REBUILDS THE SITE AND FAILS IF THAT CHANGED ANYTHING COMMITTED. The same
// "committed build output is stale" check pages.yml has always run before it
// deploys, moved into the one check so it is caught before a push rather than
// after -- and so a human following AGENTS.md "Moving the pin", or
// roll-out.sh calling `node tools/check.mjs`, hits it too, not only CI.
//
// WHY IT WAS MISSING. Found 2026-09-09, moving the pin to v0.1.12. rux-ds's
// shared check (check-app) passed: it verifies every symbol a page inlines is
// SOMEWHERE in the sprite rux-ds ships, never that a page carries the CURRENT
// sprite in full. build.mjs inlines the whole sprite into every page, and two
// symbols had joined it since this project last built, so the committed pages
// were stale against the pin that had just moved. Neither roll-out.sh nor
// this project's own "Moving the pin" procedure ran build.mjs first; only
// pages.yml's build-and-diff step caught it, on push, after the commit.
//
// SCOPE MATCHES pages.yml EXACTLY: guides/ and index.html, the two things
// build.mjs writes. Not MEASURED -- the commit hook already regenerates and
// stages that on its own, for a different reason (docs/log.md, 2026-09-02).
//
// UNSTAGED ONLY, AND IT MUST BE. `git status --porcelain` was tried first and
// is wrong: it reports a file the WAY IT ALREADY IS relative to HEAD, so a
// normal commit that legitimately changes guides/ content -- exactly the
// case a rebuild is supposed to let through -- shows those files as staged-
// modified and this gate refused every such commit, unconditionally. Never
// caught before 2026-09-10 because no commit had touched guides/ since this
// gate was added. `git diff` (worktree vs. index) asks the right question:
// did running build.mjs just now find something NOT ALREADY STAGED -- the
// actual stale-pages scenario this gate exists for, where nothing was
// rebuilt before staging and the rebuild inside this check is what first
// notices.
import { execFileSync } from 'node:child_process';

try {
  execFileSync(process.execPath, ['tools/build.mjs'], { stdio: 'inherit' });
} catch {
  console.log('\n  FAIL  build.mjs did not run to completion');
  process.exit(1);
}

const diff = execFileSync('git', ['diff', '--name-only', '--', 'guides', 'index.html'], { encoding: 'utf8' }).trim();
if (diff) {
  console.log('\n  FAIL  the committed pages were stale -- rebuilding just changed:');
  for (const line of diff.split('\n')) console.log(`          M  ${line}`);
  console.log('\n  The bytes on disk are now current. Review the diff and commit it -- this');
  console.log('  is the same check pages.yml runs before it deploys, run here first so a');
  console.log('  push cannot be the first place it is caught.');
  process.exit(1);
}
console.log('  build is current: rebuilding left nothing unstaged under guides/ or index.html');
