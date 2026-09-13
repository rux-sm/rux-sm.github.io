#!/usr/bin/env node
//
// rux-ds's SHARED app check, imported from the rux-ds checkout beside this
// repository (or DS=<dir>) -- the same wiring rux-scheduler has had since it
// was scaffolded.
//
// WHY IT WAS ADDED, 2026-09-09. The seven gates beside it are this project's
// own and none of them reads a TOKEN. So `var(--rux-font-mono)`, a name rux-ds
// has never declared, shipped in 28 generated pages with every gate green and
// the commit hook satisfied. It rendered correctly the whole time -- every use
// carried a fallback -- which is exactly why nothing noticed. It was found by
// running this file's own implementation from a rux-ds clone, from outside.
//
// WHAT IT ADDS that the gates here do not: tokens, and file references and id
// references over every page rather than a named few. It also re-checks
// classes, which check-classes already does; the duplication is left rather
// than removed, because deleting a gate to tidy up is not this change's job.
//
// SINCE 2026-09-10 (rux-ds roadmap §8.4 step 5) THIS PROJECT VENDORS NOTHING.
// It reads whichever rux-ds it finds: locally the sibling on main, in CI the
// checkout at the newest tag -- what is live at /rux-ds/. A class added on
// main passes locally and fails in CI until it is tagged; that is the right
// failure.
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = new URL('..', import.meta.url).pathname;
const DS = resolve(ROOT, process.env.DS ?? '../rux-ds');
if (!existsSync(join(DS, 'tools/app-check.mjs'))) {
  console.log(`  FAIL  ds: no rux-ds at ${DS} -- clone it beside this repository, or set DS=<dir>`);
  process.exit(1);
}
await import(pathToFileURL(join(DS, 'tools/app-check.mjs')).href);
