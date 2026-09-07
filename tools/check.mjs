#!/usr/bin/env node
// The portal's one check. Two things can go wrong here and both are quiet:
// a class on the page the vendored stylesheet does not compile, and a module
// list that does not parse or names a path no site can have.
//   node tools/check.mjs
import { readFileSync } from 'node:fs';
let bad = 0;
const fail = m => { console.log('  FAIL  ' + m); bad++; };

const css = readFileSync('vendor/rux-ds/css/rux.css', 'utf8');
const defined = new Set([...css.matchAll(/\.(rux--[a-zA-Z0-9_\\:-]+)/g)].map(m => m[1].replace(/\\/g, '')));
for (const f of ['index.html', 'switcher.js', 'account.js', 'account/index.html']) {
  const src = readFileSync(f, 'utf8');
  const used = new Set([...src.matchAll(/\brux--[a-zA-Z0-9_:-]+/g)].map(m => m[0]));
  for (const c of used) if (!defined.has(c)) fail(`${f}: ${c} is not in vendor/rux-ds/css/rux.css`);
}

let apps;
try { apps = JSON.parse(readFileSync('switcher.json', 'utf8')).apps; } catch (e) { fail('switcher.json: ' + e.message); }
if (Array.isArray(apps)) {
  for (const a of apps) {
    for (const k of ['name', 'path', 'description']) if (typeof a[k] !== 'string' || !a[k]) fail(`switcher.json: an app is missing ${k}`);
    if (a.path && !(a.path === '/' || /^\/[a-z0-9-]+\/$/.test(a.path))) fail(`switcher.json: ${a.name}: path must be "/" or "/name/", got ${a.path}`);
    // "icon" is optional and absent everywhere today: the grid draws a 32px
    // placeholder until an app names one. When it is there it must be an
    // absolute path to an SVG that app serves, because switcher.js writes it
    // into a src on every site and a relative one would resolve per origin.
    if ('icon' in a && !(typeof a.icon === 'string' && /^\/[a-z0-9/-]+\.svg$/.test(a.icon))) fail(`switcher.json: ${a.name}: icon must be an absolute path to an .svg, got ${a.icon}`);
  }
  if (!apps.some(a => a.path === '/')) fail('switcher.json: no app at "/"');
}

const pin = readFileSync('vendor/rux-ds/PIN', 'utf8');
if (!/^tag\s+v\d/m.test(pin)) fail('vendor/rux-ds/PIN does not name a tag');

console.log(`  classes ${bad ? 'checked' : 'resolve'} · apps ${apps?.length ?? 0} · pin ${pin.match(/^tag\s+(\S+)/m)?.[1] ?? '?'} · failures ${bad}`);
process.exit(bad ? 1 : 0);
