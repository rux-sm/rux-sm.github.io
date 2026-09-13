#!/usr/bin/env node
// check-docs.mjs -- the document rules in AGENTS.md "Documents", checked.
//
// Kinds, reachability from the root README, named files, lengths, status item
// length, plan shape, finished and stale plans, and history phrases. Plans
// are skipped by the named-files rule, because they name files that do not
// exist yet. A name this repository does not hold is looked up in atlas, and
// a path into a repository beside this one on disk; when that repository is
// absent, as in CI, the name is counted as not checked.
//
//   node tools/check-docs.mjs
//
// check-docs.test.mjs fires every rule against fixtures.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { posix, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const README_MAX = 150;
export const DOC_WARN = 300;
export const STATUS_ITEM_MAX = 3;
export const PLAN_STALE_DAYS = 30;
const KINDS = new Set(['how-to', 'reference', 'plan']);
const EXTENSIONS = /\.(md|mjs|cjs|js|css|scss|html|json|svg|sh|yml|yaml|py|txt|png|woff2|pdf)$/;
const HISTORY = [
  /\b(written|corrected|revised|moved|retired|decided|added|removed|admitted|updated)\s+(on\s+|in\s+)?20\d\d-\d\d/i,
  /\b(until|since|as of)\s+20\d\d-\d\d/i,
  /\bcorrected on\b/i,
];

export function knownByName(path) {
  return /(^|\/)README\.md$/.test(path) || /(^|\/)SKILL\.md$/.test(path)
    || path === 'AGENTS.md' || path === 'CLAUDE.md' || path === 'docs/status.md';
}

export function looksLikePath(t) {
  if (!/^(\.{1,2}\/|\/|\.?[A-Za-z0-9_])[A-Za-z0-9_@.+/-]*$/.test(t)) return false;
  if (t.includes('//')) return false;
  if (t.startsWith('.') && !t.includes('/')) return false;
  return t.includes('/') || EXTENSIONS.test(t);
}

function kindOf(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  const t = m && m[1].match(/^type:\s*(\S+)\s*$/m);
  return t ? t[1] : null;
}

// Prose only: fenced code is commands and data, not names.
function proseLines(text) {
  const out = [];
  let fenced = false;
  text.split('\n').forEach((line, i) => {
    if (/^\s*```/.test(line)) { fenced = !fenced; return; }
    if (!fenced) out.push([i + 1, line]);
  });
  return out;
}

function references(text) {
  const refs = [];
  for (const [n, line] of proseLines(text)) {
    for (const m of line.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      if (/^[a-z]+:/i.test(m[1]) || m[1].startsWith('#')) continue;
      refs.push({ n, token: m[1].replace(/[#?].*$/, '') });
    }
    for (const m of line.matchAll(/`([^`]+)`/g)) {
      if (looksLikePath(m[1])) refs.push({ n, token: m[1].replace(/#.*$/, '') });
    }
  }
  return refs.filter(r => r.token);
}

function index(paths) {
  const files = new Set(paths), dirs = new Set(), base = new Set();
  for (const p of paths) {
    const parts = p.split('/');
    for (let i = 1; i < parts.length; i++) dirs.add(parts.slice(0, i).join('/'));
    base.add(parts[parts.length - 1]);
  }
  return { files, dirs, base };
}

function candidates(doc, token) {
  const t = token.replace(/\/$/, '');
  if (t.startsWith('/')) return [posix.normalize(t.slice(1))];
  const top = doc.includes('/') ? doc.split('/')[0] : '.';
  return [...new Set([posix.join(posix.dirname(doc), t), posix.normalize(t), posix.join(top, t)])];
}

export function checkDocs({ docs, tracked, ignored = [], atlas = null, ages = null, outside = null }) {
  const fails = [], warns = [], notes = [];
  const fail = (code, path, msg) => fails.push({ code, path, msg });
  const warn = (code, path, msg) => warns.push({ code, path, msg });
  const repo = index(tracked);
  const atl = atlas ? index(atlas) : null;
  const ignoredDirs = ignored.map(p => p.replace(/\/$/, ''));
  const isIgnored = c => ignoredDirs.some(d => c === d || c.startsWith(d + '/'));

  // Kinds, and where a plan may live.
  const kinds = new Map();
  for (const [path, text] of docs) {
    if (knownByName(path)) { kinds.set(path, 'named'); continue; }
    const kind = kindOf(text);
    kinds.set(path, kind);
    if (!kind) fail('kind', path, 'no `type:` header line: how-to, reference or plan');
    else if (!KINDS.has(kind)) fail('kind', path, `unknown kind "${kind}": use how-to, reference or plan`);
    const inPlans = /^docs\/plans\/[^/]+\.md$/.test(path);
    if (kind === 'plan' && !inPlans) fail('plan-place', path, 'a plan lives only in docs/plans/');
    if (inPlans && kind !== 'plan') fail('plan-place', path, 'docs/plans/ holds plans only');
  }

  // Reachability from the root README. A folder named covers the documents
  // directly in it; a bare file name counts only when one document has it.
  const reached = new Set(), queue = [];
  const reach = p => { if (docs.has(p) && !reached.has(p)) { reached.add(p); queue.push(p); } };
  reach('README.md');
  while (queue.length) {
    const doc = queue.shift();
    for (const { token } of references(docs.get(doc))) {
      if (!token.includes('/')) {
        const hits = [...docs.keys()].filter(p => posix.basename(p) === token);
        if (hits.length === 1) reach(hits[0]);
      }
      for (const c of candidates(doc, token)) {
        if (docs.has(c)) reach(c);
        else if (repo.dirs.has(c)) for (const p of docs.keys()) if (posix.dirname(p) === c) reach(p);
      }
    }
  }
  for (const path of docs.keys()) {
    if (!reached.has(path)) fail('orphan', path, 'not reachable by following links and file names from README.md');
  }

  // Every file a document names exists. A name with a file extension or a
  // trailing slash must resolve; an id, a route or a package path need not.
  // A path into a repository beside this one is looked up on disk, and counts
  // as not checked when that repository is absent.
  const resolveName = (doc, token) => {
    if (token === '/' || token === './') return true;
    const t = token.replace(/\/$/, '');
    for (const c of candidates(doc, token)) {
      if (c.startsWith('../')) return outside ? outside(c) : 'unknown';
      if (repo.files.has(c) || repo.dirs.has(c) || isIgnored(c)) return true;
    }
    if (!t.includes('/') && repo.base.has(t)) return true;
    if (!atl) return 'unknown';
    const plain = posix.normalize(t.replace(/^\//, ''));
    return atl.files.has(plain) || atl.dirs.has(plain) || (!plain.includes('/') && atl.base.has(plain));
  };
  let unchecked = 0;
  for (const [path, text] of docs) {
    if (kinds.get(path) === 'plan') continue;
    for (const { n, token } of references(text)) {
      if (!(EXTENSIONS.test(token) || token.endsWith('/'))) continue;
      const r = resolveName(path, token);
      if (r === 'unknown') unchecked++;
      else if (!r) fail('missing', `${path}:${n}`, `names \`${token}\`, which does not exist`);
    }
  }
  if (unchecked) notes.push({ code: 'unchecked', msg: `${unchecked} name(s) not found here were not checked, because the repository they belong to is not beside this one` });

  // Lengths.
  for (const [path, text] of docs) {
    const lines = text.replace(/\n$/, '').split('\n').length;
    const readme = /(^|\/)README\.md$/.test(path);
    if (readme && lines > README_MAX) fail('length', path, `${lines} lines; a README stops at ${README_MAX}`);
    if (!readme && lines > DOC_WARN) warn('length', path, `${lines} lines; past ${DOC_WARN}, split or cut it`);
  }

  // Status items: one bullet, continuation lines indented.
  const status = docs.get('docs/status.md');
  if (status) {
    const lines = status.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (!/^[-*] /.test(lines[i])) continue;
      let j = i + 1;
      while (j < lines.length && /^\s+\S/.test(lines[j])) j++;
      if (j - i > STATUS_ITEM_MAX) fail('status', `docs/status.md:${i + 1}`, `an item of ${j - i} lines; keep it to ${STATUS_ITEM_MAX}`);
    }
  }

  // Plans: four parts, open tasks only, and not left alone.
  for (const [path, text] of docs) {
    if (kinds.get(path) !== 'plan') continue;
    const missing = ['Goal', 'Decisions', 'Questions', 'Tasks'].filter(h => !new RegExp(`^## ${h}\\s*$`, 'm').test(text));
    if (missing.length) fail('plan-shape', path, `missing ${missing.map(h => `## ${h}`).join(', ')}`);
    if (/^\s*[-*] \[[xX]\]/m.test(text)) fail('plan-done', path, 'a ticked box: delete finished tasks instead');
    const tasks = text.split(/^## Tasks\s*$/m)[1] ?? '';
    if (!/^\s*[-*] \[ \]/m.test(tasks)) fail('plan-done', path, 'no open tasks: a finished plan is deleted');
    if (ages?.has(path) && ages.get(path) > PLAN_STALE_DAYS) warn('plan-stale', path, `untouched for ${Math.floor(ages.get(path))} days`);
  }

  // History phrases.
  for (const [path, text] of docs) {
    for (const [n, line] of proseLines(text)) {
      const unquoted = line.replace(/"[^"]*"|“[^”]*”|`[^`]*`/g, '');
      if (HISTORY.some(re => re.test(unquoted))) warn('history', `${path}:${n}`, line.trim().slice(0, 100));
    }
  }
  return { fails, warns, notes };
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function git(args, cwd, clean = false) {
  const env = { ...process.env };
  if (clean) for (const k of ['GIT_DIR', 'GIT_INDEX_FILE', 'GIT_WORK_TREE']) delete env[k];
  const r = spawnSync('git', args, { cwd, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return r.status === 0 ? r.stdout : null;
}

function main() {
  const listed = (git(['ls-files', '--cached', '--others', '--exclude-standard', '-z'], ROOT) ?? '').split('\0').filter(Boolean);
  const tracked = listed.filter(p => existsSync(resolve(ROOT, p)));
  const isDoc = p => p.endsWith('.md') && !/(^|\/)node_modules\//.test(p) && !p.startsWith('notes/data/');
  const docs = new Map(tracked.filter(isDoc).map(p => [p, readFileSync(resolve(ROOT, p), 'utf8')]));
  const ignored = (git(['ls-files', '--others', '--ignored', '--exclude-standard', '--directory'], ROOT) ?? '').split('\n').filter(Boolean);
  const atlasDir = process.env.ATLAS ?? resolve(ROOT, '..', 'atlas');
  const atlasList = existsSync(atlasDir) ? git(['ls-files', '-z'], atlasDir, true) : null;
  const atlas = atlasList === null ? null : atlasList.split('\0').filter(Boolean);
  const shallow = (git(['rev-parse', '--is-shallow-repository'], ROOT) ?? '').trim() === 'true';
  let ages = null;
  if (!shallow) {
    ages = new Map();
    for (const p of docs.keys()) {
      if (!p.startsWith('docs/plans/')) continue;
      const t = (git(['log', '-1', '--format=%ct', '--', p], ROOT) ?? '').trim();
      if (t) ages.set(p, (Date.now() / 1000 - Number(t)) / 86400);
    }
  }
  const outside = rel => {
    const top = resolve(ROOT, '..', rel.replace(/^(\.\.\/)+/, '').split('/')[0]);
    return existsSync(top) ? existsSync(resolve(ROOT, rel)) : 'unknown';
  };
  const { fails, warns, notes } = checkDocs({ docs, tracked, ignored, atlas, ages, outside });
  for (const f of fails) console.log(`  FAIL  ${f.path}  ${f.msg}`);
  for (const w of warns) console.log(`  warn  ${w.path}  ${w.msg}`);
  for (const n of notes) console.log(`  note  ${n.msg}`);
  if (shallow) console.log('  note  plan ages were not checked: a shallow clone has no history');
  console.log(`  ${fails.length ? 'FAIL' : ' ok '}  docs    ${docs.size} documents, ${fails.length} failure(s), ${warns.length} warning(s)`);
  process.exit(fails.length ? 1 : 0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
