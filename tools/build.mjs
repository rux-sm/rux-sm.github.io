#!/usr/bin/env node
//
// Regenerate everything that is committed but derived: rux-ds's compiled
// stylesheet and generated pages (its own `npm run verify` does that and
// checks it), Notes' pages from data/guides/, and the sprite inlined into the
// hub's and the scheduler's pages. Publishing is `git push`; this only writes.
//
//   npm run build
//
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const run = (cmd, args, cwd) => {
  console.log(`\n── ${cwd === ROOT ? '' : cwd.slice(ROOT.length + 1) + ': '}${[cmd, ...args].join(' ')}`);
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', env: { ...process.env, DS: join(ROOT, 'rux-ds') } });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
run('npm', ['run', 'build', '--silent'], join(ROOT, 'rux-ds'));
run(process.execPath, ['tools/build.mjs'], join(ROOT, 'rux-ln-notes'));
run(process.execPath, ['tools/sprite.mjs'], ROOT);
console.log('\n  built. `npm run check` says whether it is right.');
