#!/usr/bin/env node
//
// The one check. Reads switcher.json -- the one list of apps -- and runs
// Design's shared check on every app except Design, which has its own; an app
// with a tools/check.mjs of its own (LN Guide) runs that instead, and it includes
// the shared check. Then the sprite currency rule for the pages that paste the
// sprite by hand, the same rule for the home screen icons drawn from a
// favicon, the parse rule for every script, the names sweep over every text
// file in the repository, the switcher rule, the lock rule and the print rule.
// `--full` adds Design's `npm run verify`. Exits 1 on any failure. The
// pre-commit hook runs the fast form; CI runs --full.
//
//   node tools/check.mjs
//   node tools/check.mjs --full
//
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const DS = join(ROOT, 'design');
const APP_CHECK = join(DS, 'tools', 'check-app.mjs');
const FULL = process.argv.includes('--full');
const failed = [];
const step = (name, cmd, args, opts = {}) => {
  console.log(`\n── ${name}`);
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', ...opts, env: { ...process.env, DS, ...(opts.env ?? {}) } });
  if (r.status !== 0) failed.push(name);
};

if (!existsSync(APP_CHECK)) { console.log(`  FAIL  no design/tools/check-app.mjs in this repository`); process.exit(1); }

// THE APP LIST IS THE CHECK'S LIST. An app is checked because switcher.json
// names it, which it must to appear in the switcher; no folder scan, no
// exclusion list. Measured 2026-09-12: the shared check pointed at Design's own
// tree fails in every class, so the root is never walked as one app.
let apps = [];
try { apps = JSON.parse(readFileSync(join(ROOT, 'switcher.json'), 'utf8')).apps; }
catch (e) { console.log(`  FAIL  switcher.json: ${e.message}`); failed.push('switcher'); }
const folders = apps.filter(a => a.path !== '/' && a.path !== '/design/').map(a => a.path.replace(/\//g, ''));

step('hub', process.execPath, [APP_CHECK, ROOT, '--ds', DS, '--hub', ROOT],
  { env: { APP_CHECK_SKIP: ['design', ...folders].join(',') } });
for (const f of folders) {
  const dir = join(ROOT, f);
  if (!existsSync(join(dir, 'index.html'))) { console.log(`\n  FAIL  ${f}: switcher.json lists /${f}/ and there is no ${f}/index.html`); failed.push(f); continue; }
  if (existsSync(join(dir, 'tools', 'check.mjs'))) step(f, process.execPath, ['tools/check.mjs'], { cwd: dir });
  else step(f, process.execPath, [APP_CHECK, dir, '--ds', DS, '--hub', ROOT]);
}

step('sprite', process.execPath, ['tools/inline-sprite.mjs', '--check']);
step('app icons', process.execPath, ['tools/build-app-icons.mjs', '--check']);

// THE PARSE RULE. Every tracked script, and every script written into a page,
// parses the way it is loaded; the flag lets Node parse a module unrun.
step('scripts', process.execPath, ['--experimental-vm-modules', '--no-warnings', 'tools/check-scripts.mjs']);

// THE DOCUMENT RULES from AGENTS.md "Documents", then the fixtures that prove
// each rule still fires.
step('docs', process.execPath, ['tools/check-docs.mjs']);
step('docs fixtures', process.execPath, ['tools/check-docs.test.mjs']);

// THE SCHEDULER'S CHECKLIST, ROUTE, TO-DO AND DEPARTURES RULES, run against sample trips.
step('scheduler checklist', process.execPath, ['scheduler/tools/check-checklist.mjs']);
step('scheduler route figures', process.execPath, ['scheduler/tools/check-route-figures.mjs']);
step('scheduler to-do', process.execPath, ['scheduler/tools/check-to-do.mjs']);
step('scheduler departures', process.execPath, ['scheduler/tools/check-departures.mjs']);
step('scheduler billing', process.execPath, ['scheduler/tools/check-billing.mjs']);
step('scheduler week', process.execPath, ['scheduler/tools/check-week.mjs']);

// THE NAMES SWEEP, EVERY TRACKED TEXT FILE. A public repository publishes
// every tracked file, and only those: the list comes from git, so an ignored
// quarry or working folder under design/ is not swept (walking the tree
// swept 949 files where git tracks 372, the day the quarry moved in). The
// rule and the private list it reads live with LN Guide; this passes it
// everything. Measured 2026-09-12: 12 entries, 0.08 s over the whole family.
const EXT = new Set(['.html', '.md', '.js', '.mjs', '.json', '.css', '.svg', '.yml', '.yaml', '.toml', '.sh', '.txt']);
const tracked = spawnSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' }).stdout ?? '';
// A file deleted but not yet staged is still in the index, so git lists a name
// with no bytes behind it and the sweep died reading it. There is nothing to
// sweep and nothing left to publish, so it is dropped here rather than in the
// sweep, which is also run by hand on paths a person named and should still
// say so when one of those is missing.
const text = tracked.split('\0')
  .filter(p => p && EXT.has(extname(p)) && existsSync(join(ROOT, p)));
step(`names (${text.length} text files)`, process.execPath, ['ln/tools/check-publishable.mjs', ...text]);

// THE SWITCHER RULE. Three things can go wrong and all are quiet: a list that
// does not parse, a path no site can have, and an app with no icon file, whose
// tile on Home would be drawn with an empty space where the icon goes. Home
// is never a tile, so it needs none.
console.log('\n── switcher');
let bad = 0;
const fail = m => { console.log('  FAIL  ' + m); bad++; };
for (const a of apps) {
  for (const k of ['name', 'path', 'description']) if (typeof a[k] !== 'string' || !a[k]) fail(`switcher.json: an app is missing ${k}`);
  if (a.path && !(a.path === '/' || /^\/[a-z0-9-]+\/$/.test(a.path))) fail(`switcher.json: ${a.name}: path must be "/" or "/name/", got ${a.path}`);
  if (a.path !== '/' && !(typeof a.icon === 'string' && /^\/[a-z0-9/-]+\.svg$/.test(a.icon) && existsSync(join(ROOT, a.icon)))) fail(`switcher.json: ${a.name}: icon must be an absolute path to an .svg that exists, got ${a.icon}`);
}
if (!apps.some(a => a.path === '/')) fail('switcher.json: no app at "/"');
console.log(`  ${bad ? 'FAIL' : ' ok '}  apps    ${apps.length} in switcher.json${bad ? '' : ', every path and icon well formed'}`);
if (bad) failed.push('switcher');

// THE LOCK RULE. A page that forgets /funnel.js, or the style after it, opens
// without a log-in, and one that forgets account.js never learns that its
// login ended; nothing on either looks wrong. Every full page loads the script
// before any other and the style straight after, so the page stays hidden
// until the script lets it open, and later loads a pinned supabase-js and
// account.js, which confirm the login once the page is open.
console.log('\n── funnel');
const LOCK = '<script src="/funnel.js"></script>\n<style>html:not([data-rux-unlocked]){visibility:hidden}</style>';
const CONFIRM = /<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@\d+\.\d+\.\d+\/dist\/umd\/supabase\.js" integrity="sha384-[A-Za-z0-9+/=]+" crossorigin="anonymous"><\/script>[\s\S]*<script src="(?:\.\.\/|\/)?account\.js"><\/script>/;
const pages = text.filter(p => p.endsWith('.html'))
  .map(p => [p, readFileSync(join(ROOT, p), 'utf8')])
  .filter(([, s]) => s.includes('<head>'));
const open = pages.filter(([, s]) => s.match(/<script\b[^>]*>/)?.[0] !== '<script src="/funnel.js">' || !s.includes(LOCK) || !CONFIRM.test(s)).map(([p]) => p);
for (const p of open) console.log(`  FAIL  ${p}: it needs <script src="/funnel.js"> first with the lock style after it, and a pinned supabase-js before account.js`);
console.log(`  ${open.length ? 'FAIL' : ' ok '}  pages   ${pages.length} full pages${open.length ? '' : ', each locked first and confirming its login once open'}`);
if (open.length) failed.push('funnel');

// THE PRINT RULE. A printed form stays vector -- type, rules and fills Chrome
// writes as shapes -- only while nothing on it has to be painted as a picture:
// a gradient, a filter, a mask, a shadow or a background image comes out of
// the print dialog as pixels, and so does an image that is not an SVG or a
// page drawn to a canvas. Every form is drawn by print.js and styled by
// print.css; the pages round them hold only the screen's header and menus.
// What sits in an `@media screen` block never prints, so it is left out.
console.log('\n── print');
const FORMS = ['scheduler/print.css', 'scheduler/print.js'];
const PAINTED = [
  [/gradient\(/, 'a gradient'], [/(?:^|[\s;{])(?:-webkit-)?(?:backdrop-)?filter\s*:/m, 'a filter'],
  [/(?:^|[\s;{])(?:-webkit-)?mask(?:-[a-z]+)?\s*:/m, 'a mask'], [/(?:box|text)-shadow\s*:/, 'a shadow'],
  [/(?:background|background-image|border-image|list-style|content)\s*:[^;{}]*url\(/, 'a background image'],
  [/\.(?:png|jpe?g|webp|gif)\b/i, 'an image that is not an SVG'], [/html2canvas|jspdf|toDataURL|getContext\(/i, 'a page drawn to a canvas'],
];
// Comments out, then every `@media screen { ... }` block, matched to its brace.
const printed = s => {
  s = s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/^\s*\/\/.*$/gm, '');
  for (let at; (at = s.search(/@media\s+screen\b[^{]*\{/)) >= 0;) {
    let i = s.indexOf('{', at) + 1;
    for (let depth = 1; depth && i < s.length; i++) depth += s[i] === '{' ? 1 : s[i] === '}' ? -1 : 0;
    s = s.slice(0, at) + s.slice(i);
  }
  return s;
};
let painted = 0;
for (const f of FORMS) {
  const s = printed(readFileSync(join(ROOT, f), 'utf8'));
  for (const [re, what] of PAINTED) if (re.test(s)) { painted++; console.log(`  FAIL  ${f}: ${what} prints as pixels; draw it with rules, fills, text or an SVG`); }
}
console.log(`  ${painted ? 'FAIL' : ' ok '}  forms   ${FORMS.length} files${painted ? '' : ', nothing on a form is painted as a picture'}`);
if (painted) failed.push('print');

if (FULL) step('design verify', 'npm', ['run', 'verify', '--silent'], { cwd: DS });

console.log('');
if (failed.length) { console.log(`  FAILED: ${failed.join(', ')}`); process.exit(1); }
console.log(`  check passed${FULL ? ' (full)' : ''}: ${apps.length} apps in switcher.json, ${text.length} text files swept.`);
