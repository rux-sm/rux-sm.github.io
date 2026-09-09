#!/usr/bin/env node
//
// The hub's one check: rux-ds's SHARED app check first, then the one rule that
// is genuinely this repository's own.
//
// WIRED UP 2026-09-09, AND IT SHOULD HAVE BEEN AT THE v0.1.6 PIN. This file
// used to be forty lines of its own: a class loop over four named files, the
// switcher rules below, and a pin check. rux-ds has shipped tools/app-check.mjs
// since 2026-09-05 and this repository has vendored it at every pin since, and
// never ran it -- a pin move rewrites vendor/ and deliberately leaves tools/
// alone, so the wiring never travelled. rux-scheduler has had it from the day
// it was scaffolded.
//
// WHAT THE OLD LOOP MISSED, and this is why it is replaced rather than kept
// beside: it read `index.html`, `switcher.js`, `account.js` and
// `account/index.html` BY NAME, so a page added here was checked by nothing;
// and it read classes only, so no token was ever checked anywhere in this
// repository. The shared check walks every page, script and stylesheet, and
// adds tokens, file references and id references. Its pin rule is the same one
// this file carried. Nothing the old loop did is lost.
//
// THE SWITCHER RULES STAY HERE because they are not shareable: switcher.json is
// the account's module registry and exists in this repository alone. rux-ds
// cannot check it and should not know about it.
//
//   node tools/check.mjs
//
// It exits 1 on a failure. The commit hook and the Pages workflow both run it.
import { readFileSync } from 'node:fs';

// Runs on import, exits 1 on a failure, and RETURNS on a pass -- so everything
// below it runs only when the shared check is clean. Nothing goes before it.
await import('../vendor/rux-ds/tools/app-check.mjs');

let bad = 0;
const fail = m => { console.log('  FAIL  ' + m); bad++; };

// THE MODULE REGISTRY. Two things can go wrong and both are quiet: a list that
// does not parse, and a path no site can have.
let apps;
try { apps = JSON.parse(readFileSync('switcher.json', 'utf8')).apps; } catch (e) { fail('switcher.json: ' + e.message); }
if (Array.isArray(apps)) {
  for (const a of apps) {
    for (const k of ['name', 'path', 'description']) if (typeof a[k] !== 'string' || !a[k]) fail(`switcher.json: an app is missing ${k}`);
    if (a.path && !(a.path === '/' || /^\/[a-z0-9-]+\/$/.test(a.path))) fail(`switcher.json: ${a.name}: path must be "/" or "/name/", got ${a.path}`);
    // "icon" is optional; the grid draws a 32px swatch without one, which
    // brand/README.md in rux-ds names as the correct state until an app draws
    // its own mark. Either a sprite id the page inlines (#i-name) or an
    // absolute path to an SVG that app serves -- absolute, because switcher.js
    // writes it into a URL on every site and a relative path would resolve per
    // origin.
    if ('icon' in a && !(typeof a.icon === 'string' && (/^#i-[a-z0-9-]+$/.test(a.icon) || /^\/[a-z0-9/-]+\.svg$/.test(a.icon)))) fail(`switcher.json: ${a.name}: icon must be #i-name or an absolute path to an .svg, got ${a.icon}`);
  }
  if (!apps.some(a => a.path === '/')) fail('switcher.json: no app at "/"');
}

console.log(`  ${bad ? 'FAIL' : ' ok '}  apps    ${apps?.length ?? 0} in switcher.json${bad ? '' : ', every path and icon well formed'}`);
process.exit(bad ? 1 : 0);
