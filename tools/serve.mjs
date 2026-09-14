#!/usr/bin/env node
//
// The one local server. This repository's folders ARE the site as GitHub
// Pages serves it -- `/` is index.html here, `/design/` is design/, and so on
// -- so Design's static server in plain mode, rooted here, is the whole thing.
// Loopback only.
//
//   npm run serve                 http://localhost:8640/
//   npm run serve -- --private    render Atlas's internal tier into
//                                 notes/build/ (git-ignored) and serve
//                                 it on :8644, beside the public one,
//                                 with the walk form at /walk/ saving
//                                 through notes/tools/serve-walk.mjs on :8645
//
import { spawnSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const SERVER = join(ROOT, 'design', 'tools', 'serve.mjs');
const env = { ...process.env, HOST: process.env.HOST ?? 'localhost' };

if (process.argv.includes('--private')) {
  const notes = join(ROOT, 'notes');
  const atlas = process.env.ATLAS ?? resolve(ROOT, '..', 'atlas');
  if (!existsSync(join(atlas, 'tools', 'emit.py'))) {
    console.error(`  no atlas at ${atlas} -- clone it beside this repository, or set ATLAS=<dir>`);
    process.exit(1);
  }
  const sync = spawnSync('sh', ['tools/sync-internal.sh'], { cwd: notes, stdio: 'inherit', env: { ...env, ATLAS: atlas, DS: join(ROOT, 'design') } });
  if (sync.status !== 0) process.exit(sync.status ?? 1);
  const site = join(notes, 'build', 'internal', 'site');
  console.log(`  private preview: http://localhost:${env.PORT ?? 8644}/  (never published)`);
  spawn(process.execPath, [SERVER], { cwd: site, stdio: 'inherit', env: { ...env, PORT: env.PORT ?? '8644' } });
  spawn(process.execPath, [join(notes, 'tools', 'serve-walk.mjs')], { stdio: 'inherit', env: { ...env, ATLAS: atlas, PREVIEW_PORT: env.PORT ?? '8644' } });
} else {
  spawn(process.execPath, [SERVER], { cwd: ROOT, stdio: 'inherit', env: { ...env, PORT: env.PORT ?? '8640' } });
}
