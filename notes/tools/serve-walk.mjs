#!/usr/bin/env node
//
// The walk form's save service, beside the private preview. It writes into
// atlas, which is private: a walk into walks/, a screenshot into inbox/. So it
// listens on loopback only, answers only the preview's own origin, and refuses
// to touch a walk that is already committed, because a committed walk is
// immutable (atlas standards/walk-rules.md §1).
//
//   node notes/tools/serve-walk.mjs        http://localhost:8645/api/
//   started by `npm run serve -- --private`, beside the preview on :8644
//
import { createServer } from 'node:http';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = resolve(fileURLToPath(import.meta.url), '..', '..', '..');
const ATLAS = process.env.ATLAS ?? resolve(SITE, '..', 'atlas');
const PORT = Number(process.env.WALK_PORT ?? 8645);
const ORIGIN = `http://localhost:${process.env.PREVIEW_PORT ?? 8644}`;
const HOSTS = new Set([`localhost:${PORT}`, `127.0.0.1:${PORT}`]);

const WALK_ID = /^WK_([a-z0-9-]+)_(\d{4}-\d{2}-\d{2})_(\d{6})$/;
const WALKTHROUGH_ID = /^[a-z0-9-]+$/;
const STEP_ID = /^\d+\.\d+$/;
const CODE = /\b[a-z]{5}\d{4}[a-z]\d{3}\b/;
const IMAGE = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/;
const MAX_BODY = 20 * 1024 * 1024;

const frontmatter = text => /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? '';
const field = (fm, key) => new RegExp(`^${key}:\\s*(.*)$`, 'm').exec(fm)?.[1].trim() ?? '';

// A table row's cells, split on pipes a backslash does not escape.
const cells = line => line.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map(c => c.trim());
// What a person typed, made safe for one table cell.
const cell = text => String(text ?? '').replace(/\r?\n+/g, ' · ').replace(/\|/g, '\\|').trim();
const uncell = text => text.replace(/\\\|/g, '|');

function walkthroughs() {
  const dir = join(ATLAS, 'walkthroughs');
  return readdirSync(dir).filter(f => f.endsWith('.md')).flatMap(f => {
    const text = readFileSync(join(dir, f), 'utf8');
    const fm = frontmatter(text);
    if (field(fm, 'type') !== 'walkthrough') return [];
    const title = /^# (.+)$/m.exec(text)?.[1].trim() ?? f.slice(0, -3);
    const phases = [...fm.matchAll(/^\s*- \{n: (\d+), title: (.+?), walked:/gm)]
      .map(m => ({ n: Number(m[1]), title: m[2].trim() }));
    return [{ id: f.slice(0, -3), title, phases }];
  }).sort((a, b) => a.title.localeCompare(b.title));
}

function committed(id) {
  return spawnSync('git', ['ls-files', '--error-unmatch', `walks/${id}.md`], { cwd: ATLAS }).status === 0;
}

function walks() {
  const dir = join(ATLAS, 'walks');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).map(f => WALK_ID.exec(f.replace(/\.md$/, ''))).filter(Boolean)
    .map(m => ({ id: m[0], walkthrough: m[1], date: m[2], committed: committed(m[0]) }))
    .sort((a, b) => b.id.localeCompare(a.id));
}

function readWalk(id) {
  const path = join(ATLAS, 'walks', `${id}.md`);
  if (!existsSync(path)) return null;
  const lines = readFileSync(path, 'utf8').split('\n');
  const fm = frontmatter(lines.join('\n'));
  const phases = [];
  let phase = null;
  lines.forEach((line, index) => {
    const head = /^## Phase (\d+)\b/.exec(line);
    if (head) { phase = { n: Number(head[1]), route: '', session: '', code: '', steps: [] }; phases.push(phase); return; }
    if (!phase) return;
    const route = /^`([^`]+)`(?: — \*\*(.+?)\*\* \(`([a-z]{5}\d{4}[a-z]\d{3})`\))?/.exec(line);
    if (route && !phase.steps.length) { [, phase.route, phase.session = '', phase.code = ''] = route; return; }
    if (!line.startsWith('|')) return;
    const c = cells(line);
    if (c.length >= 6 && STEP_ID.test(c[0])) {
      phase.steps.push({ index, step: c[0], do: c[1], see: c[2], actual: uncell(c[3]), evidence: c[4], notes: uncell(c[5]) });
    }
  });
  const walkthrough = WALK_ID.exec(id)[1];
  const titles = walkthroughs().find(w => w.id === walkthrough)?.phases ?? [];
  for (const p of phases) p.title = titles.find(t => t.n === p.n)?.title ?? '';
  return { id, walkthrough, date: WALK_ID.exec(id)[2], environment: field(fm, 'environment'), path, lines, phases };
}

function findStep(walk, stepId) {
  for (const phase of walk.phases) {
    const step = phase.steps.find(s => s.step === stepId);
    if (step) return { phase, step };
  }
  return null;
}

function writeRow(walk, step) {
  walk.lines[step.index] = `| ${step.step} | ${step.do} | ${step.see} | ${cell(step.actual)} | ${step.evidence} | ${cell(step.notes)} |`;
  writeFileSync(walk.path, walk.lines.join('\n'), 'utf8');
}

const slug = text => String(text ?? '').toLowerCase()
  .replace(/[`*_[\]{}()\\|]/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  .split('-').slice(0, 6).join('-');

// SS_{code-or-slug}_{what-it-shows}_{YYYY-MM-DD}, atlas rule 2. The code is the
// session the step itself names, else its phase's, else the walkthrough's id;
// never the step number, which rule 3 forbids because step numbers move.
function screenshotName(walk, phase, step, what, ext) {
  const code = CODE.exec(`${step.do} ${step.see}`)?.[0] || phase.code || walk.walkthrough;
  const base = slug(what) || slug(step.see) || 'screen';
  for (let n = 1; ; n++) {
    const name = `SS_${code}_${n === 1 ? base : `${base}-${n}`}_${walk.date}.${ext}`;
    if (!existsSync(join(ATLAS, 'inbox', name)) && !existsSync(join(ATLAS, 'evidence', 'screens', name))) return name;
  }
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': ORIGIN, Vary: 'Origin' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((ok, fail) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY) { fail(new Error('too large')); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => { try { ok(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch (e) { fail(e); } });
    req.on('error', fail);
  });
}

async function handle(req, res) {
  // A page on another site, or a rebinding hostname, must not reach atlas.
  if (!HOSTS.has(req.headers.host ?? '')) return send(res, 403, { error: 'wrong host' });
  if (req.headers.origin && req.headers.origin !== ORIGIN) return send(res, 403, { error: 'wrong origin' });
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': ORIGIN, 'Access-Control-Allow-Methods': 'GET, POST, PUT',
      'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' });
    return res.end();
  }
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[0] !== 'api') return send(res, 404, { error: 'not found' });

  if (req.method === 'GET' && parts[1] === 'walkthroughs' && parts.length === 2) return send(res, 200, walkthroughs());
  if (req.method === 'GET' && parts[1] === 'walks' && parts.length === 2) return send(res, 200, walks());

  if (req.method === 'POST' && parts[1] === 'walks' && parts.length === 2) {
    const body = await readBody(req);
    if (!WALKTHROUGH_ID.test(body.walkthrough ?? '') || !walkthroughs().some(w => w.id === body.walkthrough)) return send(res, 400, { error: 'unknown walkthrough' });
    if (!/^[A-Za-z0-9]{1,10}$/.test(body.company ?? '') || !/^[A-Za-z0-9._-]{1,32}$/.test(body.user ?? '')) {
      return send(res, 400, { error: 'company and user are letters and digits, as on the status bar' });
    }
    const run = spawnSync('python3', ['tools/newwalk.py', body.walkthrough, '--all', '--company', body.company, '--user', body.user], { cwd: ATLAS, encoding: 'utf8' });
    const made = /newwalk: walks\/(WK_[^\s]+)\.md/.exec(run.stdout ?? '');
    if (run.status !== 0 || !made) return send(res, 409, { error: (run.stderr || run.stdout || 'newwalk failed').trim() });
    return send(res, 201, { id: made[1] });
  }

  if (parts[1] !== 'walks' || !WALK_ID.test(parts[2] ?? '')) return send(res, 404, { error: 'not found' });
  const walk = readWalk(parts[2]);
  if (!walk) return send(res, 404, { error: 'no such walk' });

  if (req.method === 'GET' && parts.length === 3) {
    const { lines, path, ...view } = walk;
    return send(res, 200, { ...view, committed: committed(walk.id) });
  }

  if (parts[3] !== 'steps' || !STEP_ID.test(parts[4] ?? '')) return send(res, 404, { error: 'not found' });
  if (committed(walk.id)) return send(res, 409, { error: 'this walk is committed, and a committed walk is never edited' });
  const found = findStep(walk, parts[4]);
  if (!found) return send(res, 404, { error: 'no such step' });
  const body = await readBody(req);

  if (req.method === 'PUT' && parts.length === 5) {
    found.step.actual = body.actual ?? '';
    found.step.notes = body.notes ?? '';
    writeRow(walk, found.step);
    return send(res, 200, { ok: true });
  }

  if (req.method === 'POST' && parts[5] === 'screenshots' && parts.length === 6) {
    const image = IMAGE.exec(body.dataUrl ?? '');
    if (!image) return send(res, 400, { error: 'a screenshot is a PNG or JPEG image' });
    const name = screenshotName(walk, found.phase, found.step, body.what, image[1] === 'jpeg' ? 'jpg' : 'png');
    mkdirSync(join(ATLAS, 'inbox'), { recursive: true });
    writeFileSync(join(ATLAS, 'inbox', name), Buffer.from(image[2], 'base64'));
    const listed = found.step.evidence && found.step.evidence !== '—' ? `${found.step.evidence}, ` : '';
    found.step.evidence = `${listed}\`${name}\``;
    writeRow(walk, found.step);
    return send(res, 201, { name, evidence: found.step.evidence });
  }

  return send(res, 405, { error: 'method not allowed' });
}

if (!existsSync(join(ATLAS, 'tools', 'newwalk.py'))) {
  console.error(`  serve-walk: no atlas at ${ATLAS} -- clone it beside this repository, or set ATLAS=<dir>`);
  process.exit(1);
}
createServer((req, res) => handle(req, res).catch(e => send(res, 400, { error: e.message })))
  .listen(PORT, 'localhost', () => console.log(`  walk form saves through: http://localhost:${PORT}/api/  (into ${ATLAS})`));
