#!/usr/bin/env node
//
// Regenerate everything that is committed but derived: Design's compiled
// stylesheet and generated pages (its own `npm run verify` does that and
// checks it), LN Guide's page from data/atlas/, the sprite inlined into the
// hub's and the scheduler's pages, and the home screen icons drawn from an
// installed app's favicon. Publishing is `git push`; this only writes.
//
//   npm run build
//
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const run = (cmd, args, cwd) => {
  console.log(`\n── ${cwd === ROOT ? '' : cwd.slice(ROOT.length + 1) + ': '}${[cmd, ...args].join(' ')}`);
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', env: { ...process.env, DS: join(ROOT, 'design') } });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
run('npm', ['run', 'build', '--silent'], join(ROOT, 'design'));
run('npm', ['run', 'generate', '--silent'], join(ROOT, 'design'));
run(process.execPath, ['tools/build-views.mjs'], join(ROOT, 'ln'));
run(process.execPath, ['tools/inline-sprite.mjs'], ROOT);
run(process.execPath, ['tools/build-app-icons.mjs'], ROOT);
console.log('\n  built. `npm run check` says whether it is right.');
