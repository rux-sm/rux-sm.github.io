#!/usr/bin/env node
// This app's one check: rux-ds's shared app check, imported from the rux-ds
// checkout beside this repository (or DS=<dir>). It exits 1 on a failure and
// returns on a pass; an app-specific gate goes after the import, and nothing
// before it.
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = new URL('..', import.meta.url).pathname;
process.chdir(root);
const DS = resolve(root, process.env.DS ?? '../rux-ds');
if (!existsSync(join(DS, 'tools/app-check.mjs'))) {
  console.log(`  FAIL  ds: no rux-ds at ${DS} -- clone it beside this repository, or set DS=<dir>`);
  process.exit(1);
}
await import(pathToFileURL(join(DS, 'tools/app-check.mjs')).href);
