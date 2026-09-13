#!/usr/bin/env node
//
// The one check. Reads switcher.json -- the one list of apps -- and runs
// rux-ds's shared check on every app except rux-ds, which has its own; an app
// with a tools/check.mjs of its own (Notes) runs that instead, and it includes
// the shared check. Then the sprite currency rule for the pages that paste the
// sprite by hand, the names sweep over every text file in the repository, and
// the switcher rule. `--full` adds rux-ds's `npm run verify`. Exits 1 on any
// failure. The pre-commit hook runs the fast form; CI runs --full.
//
//   node tools/check.mjs
//   node tools/check.mjs --full
//
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const DS = join(ROOT, 'rux-ds');
const APP_CHECK = join(DS, 'tools', 'app-check.mjs');
const FULL = process.argv.includes('--full');
const failed = [];
const step = (name, cmd, args, opts = {}) => {
  console.log(`\n── ${name}`);
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', ...opts, env: { ...process.env, DS, ...(opts.env ?? {}) } });
  if (r.status !== 0) failed.push(name);
};

if (!existsSync(APP_CHECK)) { console.log(`  FAIL  no rux-ds/tools/app-check.mjs in this repository`); process.exit(1); }

// THE APP LIST IS THE CHECK'S LIST. An app is checked because switcher.json
// names it, which it must to appear in the switcher; no folder scan, no
// exclusion list. Measured 2026-09-12: the shared check pointed at rux-ds's own
// tree fails in every class, so the root is never walked as one app.
let apps = [];
try { apps = JSON.parse(readFileSync(join(ROOT, 'switcher.json'), 'utf8')).apps; }
catch (e) { console.log(`  FAIL  switcher.json: ${e.message}`); failed.push('switcher'); }
const folders = apps.filter(a => a.path !== '/' && a.path !== '/rux-ds/').map(a => a.path.replace(/\//g, ''));

step('hub', process.execPath, [APP_CHECK, ROOT, '--ds', DS, '--hub', ROOT],
  { env: { APP_CHECK_SKIP: ['rux-ds', ...folders].join(',') } });
for (const f of folders) {
  const dir = join(ROOT, f);
  if (!existsSync(join(dir, 'index.html'))) { console.log(`\n  FAIL  ${f}: switcher.json lists /${f}/ and there is no ${f}/index.html`); failed.push(f); continue; }
  if (existsSync(join(dir, 'tools', 'check.mjs'))) step(f, process.execPath, ['tools/check.mjs'], { cwd: dir });
  else step(f, process.execPath, [APP_CHECK, dir, '--ds', DS, '--hub', ROOT]);
}

step('sprite', process.execPath, ['tools/sprite.mjs', '--check']);

// THE NAMES SWEEP, EVERY TRACKED TEXT FILE. A public repository publishes
// every tracked file, and only those: the list comes from git, so an ignored
// quarry or working folder under rux-ds/ is not swept (walking the tree
// swept 949 files where git tracks 372, the day the quarry moved in). The
// rule and the private list it reads live with Notes; this passes it
// everything. Measured 2026-09-12: 12 entries, 0.08 s over the whole family.
const EXT = new Set(['.html', '.md', '.js', '.mjs', '.json', '.css', '.svg', '.yml', '.yaml', '.toml', '.sh', '.txt']);
const tracked = spawnSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' }).stdout ?? '';
const text = tracked.split('\0').filter(p => p && EXT.has(extname(p)));
step(`names (${text.length} text files)`, process.execPath, ['rux-ln-notes/tools/check-publishable.mjs', ...text]);

// THE SWITCHER RULE. Two things can go wrong and both are quiet: a list that
// does not parse, and a path no site can have.
console.log('\n── switcher');
let bad = 0;
const fail = m => { console.log('  FAIL  ' + m); bad++; };
for (const a of apps) {
  for (const k of ['name', 'path', 'description']) if (typeof a[k] !== 'string' || !a[k]) fail(`switcher.json: an app is missing ${k}`);
  if (a.path && !(a.path === '/' || /^\/[a-z0-9-]+\/$/.test(a.path))) fail(`switcher.json: ${a.name}: path must be "/" or "/name/", got ${a.path}`);
  if ('icon' in a && !(typeof a.icon === 'string' && (/^#i-[a-z0-9-]+$/.test(a.icon) || /^\/[a-z0-9/-]+\.svg$/.test(a.icon)))) fail(`switcher.json: ${a.name}: icon must be #i-name or an absolute path to an .svg, got ${a.icon}`);
}
if (!apps.some(a => a.path === '/')) fail('switcher.json: no app at "/"');
console.log(`  ${bad ? 'FAIL' : ' ok '}  apps    ${apps.length} in switcher.json${bad ? '' : ', every path and icon well formed'}`);
if (bad) failed.push('switcher');

if (FULL) step('rux-ds verify', 'npm', ['run', 'verify', '--silent'], { cwd: DS });

console.log('');
if (failed.length) { console.log(`  FAILED: ${failed.join(', ')}`); process.exit(1); }
console.log(`  check passed${FULL ? ' (full)' : ''}: ${apps.length} apps in switcher.json, ${text.length} text files swept.`);
