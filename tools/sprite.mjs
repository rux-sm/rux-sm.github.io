#!/usr/bin/env node
//
// Re-inlines rux-ds's sprite into this app's pages. THE RULE IS NOT HERE:
// rux-ds's tools/app-sprite.mjs holds it, read from the checkout beside this
// repository (or DS=<dir>), the way tools/check.mjs imports app-check.mjs.
// This file is the invocation and the page list, nothing else.
//
// Until 2026-09-11 this was a full copy, and rux-sm.github.io's was a copy of
// rux-scheduler's that had already drifted 13 lines from it. The only
// behavioural difference was which directories were scanned, so that is all
// that stayed here.
//
//   node tools/sprite.mjs            rewrite every page that is stale
//   node tools/sprite.mjs --check    report and exit 1, writing nothing
//
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ds = resolve(root, process.env.DS ?? '../rux-ds');
if (!existsSync(join(ds, 'tools/app-sprite.mjs'))) {
  console.log(`  FAIL  sprite: no rux-ds at ${ds} -- clone it beside this repository, or set DS=<dir>`);
  process.exit(1);
}
const { sprite } = await import(new URL('tools/app-sprite.mjs', `file://${ds}/`).href);
sprite({ root, ds, dirs: ['.', 'account'], check: process.argv.includes('--check') });
