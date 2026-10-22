#!/usr/bin/env node
//
// REBUILDS THE PAGE AND FAILS IF THAT CHANGED ANYTHING NOT YET STAGED. It is
// the check CI runs before it deploys, run here first so a stale page is
// caught before a push and not after.
//
// IT COMPARES THE WORKING TREE WITH THE INDEX, not with the last commit. A
// commit that changes the page on purpose has the new page staged, and only a
// page nobody rebuilt differs from what is staged.
import { execFileSync } from 'node:child_process';

// Two builds while the old page lasts: build-page.mjs writes index.html, and
// build-views.mjs the pages under do/, follow/, screens/ and ideas/, home.html
// and search.json. Every one of them is generated, so every one is compared.
const GENERATED = ['index.html', 'home.html', 'search.html', 'search.json', 'do', 'follow', 'screens', 'ideas'];
for (const build of ['tools/build-page.mjs', 'tools/build-views.mjs']) {
  try {
    execFileSync(process.execPath, [build], { stdio: 'inherit' });
  } catch {
    console.log(`\n  FAIL  ${build} did not run to completion`);
    process.exit(1);
  }
}

// Untracked too: a page the build writes for the first time is as unstaged as
// a changed one, and `git diff` alone would not see it.
const diff = [execFileSync('git', ['diff', '--name-only', '--', ...GENERATED], { encoding: 'utf8' }),
  execFileSync('git', ['ls-files', '--others', '--exclude-standard', '--', ...GENERATED], { encoding: 'utf8' })].join('').trim();
if (diff) {
  console.log('\n  FAIL  the committed pages were stale -- rebuilding just changed:');
  for (const line of diff.split('\n')) console.log(`          M  ${line}`);
  console.log('\n  The bytes on disk are now current. Review the diff and commit it -- this');
  console.log('  is the same check pages.yml runs before it deploys, run here first so a');
  console.log('  push cannot be the first place it is caught.');
  process.exit(1);
}
console.log('  build is current: rebuilding left every generated page as staged');
