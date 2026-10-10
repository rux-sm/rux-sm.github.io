#!/usr/bin/env node
//
// The Scheduler's one check. Design's shared check on this folder first, then
// every rule of the Scheduler's own, found by its name: a file here called
// check-<something>.mjs is a rule, and is run. There is no list to add a rule
// to, so a rule that is written is a rule that is asked; a list had each new
// rule waiting on someone to remember it.
//
// The site's check runs this for the Scheduler, as it runs LN Guide's.
//
//   node scheduler/tools/check.mjs
//
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = resolve(HERE, '..');
const ROOT = resolve(APP, '..');
const DS = process.env.DS ?? join(ROOT, 'design');
const APP_CHECK = join(DS, 'tools', 'check-app.mjs');

const failed = [];
const run = (name, args) => {
  console.log(`\n── ${name}`);
  const r = spawnSync(process.execPath, args, { cwd: ROOT, stdio: 'inherit', env: { ...process.env, DS } });
  if (r.status !== 0) failed.push(name);
};

if (!existsSync(APP_CHECK)) { console.log('  FAIL  no design/tools/check-app.mjs to check the pages with'); process.exit(1); }
run('check-app', [APP_CHECK, APP, '--ds', DS, '--hub', ROOT]);

const rules = readdirSync(HERE).filter(f => /^check-[a-z0-9-]+\.mjs$/.test(f)).sort();
// A folder of rules that finds none has lost them, and passing then would say every rule held.
if (!rules.length) { console.log('\n  FAIL  no check-*.mjs found beside this file'); failed.push('rules'); }
for (const file of rules) run(file.replace(/\.mjs$/, ''), [join(HERE, file)]);

console.log('');
if (failed.length) {
  console.log(`  FAILED: ${failed.join(', ')}`);
  process.exit(1);
}
console.log(`  the shared check and ${rules.length} rules passed.`);
