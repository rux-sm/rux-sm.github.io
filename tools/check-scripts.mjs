#!/usr/bin/env node
//
// The parse rule. Every tracked script, and every script written into a page,
// must parse the way it is loaded. A script that does not parse stops its
// page dead, and no other rule reads one as a script: the shared check reads
// classes and files, and the scheduler's own checks load only the rule files.
// Nothing is run. A file a page loads with type="module", and every .mjs, is
// parsed as a module; every other .js as a plain script.
//
//   node --experimental-vm-modules tools/check-scripts.mjs
//
// The flag is what lets Node parse a module without running it.
//
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
if (typeof vm.SourceTextModule !== 'function') {
  console.log('  FAIL  scripts  run with --experimental-vm-modules, so a module can be parsed without running it');
  process.exit(1);
}

const problems = [];
function parse(code, name, asModule, lineOffset = 0) {
  try {
    if (asModule) new vm.SourceTextModule(code, { identifier: name, lineOffset });
    else new vm.Script(code, { filename: name, lineOffset });
  } catch (e) {
    const at = String(e.stack || '').split('\n')[0];
    problems.push(`${/:\d+$/.test(at) ? at : name}  ${e.message}`);
  }
}

// The rule proves itself first: a parser that passed a broken script would
// pass every script after it.
for (const asModule of [false, true]) {
  parse('const broken = ;', 'self-test', asModule);
  if (problems.length !== 1) {
    console.log(`  FAIL  scripts  a broken ${asModule ? 'module' : 'script'} parsed, so this rule proves nothing`);
    process.exit(1);
  }
  problems.length = 0;
}

// The list comes from git, as the names sweep's does, so only what is
// published is read; a file deleted and not yet staged has no bytes to parse.
const tracked = (spawnSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' }).stdout ?? '')
  .split('\0').filter(p => p && existsSync(join(ROOT, p)));
const read = p => readFileSync(join(ROOT, p), 'utf8');
const pages = tracked.filter(p => p.endsWith('.html')).map(p => [p, read(p)]);

// The scripts a page loads as modules, by the path the page gives them.
const modules = new Set();
const TAG = /<script\b([^>]*)>([\s\S]*?)<\/script>/g;
const attr = (attrs, name) => new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`).exec(attrs)?.[1] ?? null;
const PARSED = new Set([null, '', 'module', 'text/javascript', 'application/javascript']);
let inline = 0;
for (const [page, html] of pages) {
  for (const m of html.matchAll(TAG)) {
    const [, attrs, body] = m;
    const type = attr(attrs, 'type');
    const src = attr(attrs, 'src');
    if (src) {
      if (type === 'module' && !/^[a-z]+:|^\/\//i.test(src)) {
        modules.add(normalize(src.startsWith('/') ? src.slice(1) : join(dirname(page), src)).split('?')[0]);
      }
      continue;
    }
    // Data written into a page as JSON, or an import map, is not a script.
    if (!PARSED.has(type) || !body.trim()) continue;
    inline++;
    const line = html.slice(0, m.index).split('\n').length - 1;
    parse(body, page, type === 'module', line);
  }
}

const files = tracked.filter(p => p.endsWith('.js') || p.endsWith('.mjs'));
// A tool's first line may name its interpreter, which Node reads and a parser does not.
const code = p => read(p).replace(/^#![^\n]*/, '');
for (const p of files) parse(code(p), p, p.endsWith('.mjs') || modules.has(p));

for (const said of problems) console.log(`  FAIL  ${said}`);
console.log(`  ${problems.length ? 'FAIL' : ' ok '}  scripts  ${files.length} files and ${inline} scripts written into pages${problems.length ? `, ${problems.length} that do not parse` : ', each parsing the way it is loaded'}`);
process.exit(problems.length ? 1 : 0);
