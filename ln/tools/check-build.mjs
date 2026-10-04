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

try {
  execFileSync(process.execPath, ['tools/build-views.mjs'], { stdio: 'inherit' });
} catch {
  console.log('\n  FAIL  a build did not run to completion');
  process.exit(1);
}

const diff = execFileSync('git', ['diff', '--name-only', '--', 'index.html'], { encoding: 'utf8' }).trim();
if (diff) {
  console.log('\n  FAIL  the committed pages were stale -- rebuilding just changed:');
  for (const line of diff.split('\n')) console.log(`          M  ${line}`);
  console.log('\n  The bytes on disk are now current. Review the diff and commit it -- this');
  console.log('  is the same check pages.yml runs before it deploys, run here first so a');
  console.log('  push cannot be the first place it is caught.');
  process.exit(1);
}
console.log('  build is current: rebuilding left index.html as committed');
