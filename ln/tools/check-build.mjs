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

// build-views.mjs writes index.html, the pages under do/, follow/, screens/
// and ideas/, search.html, confirm.html and search.json. Every one of them is
// generated, so every one is compared.
const GENERATED = ['index.html', 'search.html', 'search.json', 'confirm.html', 'do', 'follow', 'screens', 'ideas'];
try {
  execFileSync(process.execPath, ['tools/build-views.mjs'], { stdio: 'inherit' });
} catch {
  console.log('\n  FAIL  the build did not run to completion');
  process.exit(1);
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
