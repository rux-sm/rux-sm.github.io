#!/usr/bin/env node
//
// THE PAPER CHECK. Prints every process Document and every task page with
// headless Chrome, the engine the Print button uses, and reads each PDF back:
// a Document of three pages or more whose last page holds less than a
// quarter of the text of its typical page is reported, because a page with one row on it is the
// pagination failure no stylesheet rule can see. It warns and never fails:
// whether a short last page is worth a change is a judgement on that page.
//
// It serves this repository on a free loopback port for the length of the run,
// so it needs no running server, and says so plainly when it found no Chrome.
//
//   node ln/tools/check-paper.mjs
//
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';

const LN = resolve(fileURLToPath(import.meta.url), '..', '..');
const ROOT = resolve(LN, '..');
const SHORT = 0.25;

const CHROMES = [process.env.CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean);
const chrome = CHROMES.find((p) => existsSync(p));
if (!chrome) {
  console.log('  warn  paper   could not look: no Chrome found, so no Document was printed (set CHROME to its path)');
  process.exit(0);
}

const pages = ['follow', 'do'].flatMap((d) => readdirSync(join(LN, d)).filter((f) => f.endsWith('.html') && f !== 'index.html').map((f) => `ln/${d}/${f}`));

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png' };
const server = createServer((req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^\/+/, '');
  const file = join(ROOT, path.endsWith('/') || !path ? `${path}index.html` : path);
  if (!file.startsWith(ROOT) || !existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const origin = `http://127.0.0.1:${server.address().port}`;
const out = mkdtempSync(join(tmpdir(), 'ln-paper-'));

const print = (page, i) => new Promise((ok) => {
  const pdf = join(out, `${i}.pdf`);
  const args = ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', `--user-data-dir=${join(out, `profile-${i}`)}`,
    '--virtual-time-budget=8000', `--print-to-pdf=${pdf}`, ...(process.platform === 'linux' ? ['--no-sandbox'] : []), `${origin}/${page}`];
  const p = spawn(chrome, args, { stdio: 'ignore' });
  p.on('exit', () => ok(existsSync(pdf) ? pdf : null));
});

// Text blocks per page, read from the PDF Chrome writes: its page tree in
// order, each page's content streams inflated, every BT a run of text.
function textPerPage(file) {
  const buf = readFileSync(file), s = buf.toString('latin1');
  const at = new Map([...s.matchAll(/(\d+) 0 obj\b/g)].map((m) => [+m[1], m.index]));
  const body = (n) => s.slice(at.get(n), s.indexOf('endobj', at.get(n)));
  const stream = (n) => {
    const b = body(n), i = b.indexOf('stream');
    if (i < 0) return '';
    let start = at.get(n) + i + 6;
    if (s[start] === '\r') start++;
    if (s[start] === '\n') start++;
    const raw = buf.subarray(start, start + Number(/\/Length (\d+)/.exec(b)?.[1] ?? 0));
    return (/FlateDecode/.test(b) ? inflateSync(raw) : raw).toString('latin1');
  };
  const list = [];
  const walk = (n) => {
    const b = body(n);
    if (/\/Type\s*\/Pages\b/.test(b)) for (const k of /\/Kids\s*\[([^\]]*)\]/.exec(b)[1].matchAll(/(\d+) 0 R/g)) walk(+k[1]);
    else {
      const c = /\/Contents\s*(?:\[([^\]]*)\]|(\d+) 0 R)/.exec(b);
      const ids = c?.[1] ? [...c[1].matchAll(/(\d+) 0 R/g)].map((x) => +x[1]) : c ? [+c[2]] : [];
      list.push((ids.map(stream).join('\n').match(/\bBT\b/g) ?? []).length);
    }
  };
  walk(+/\/Pages (\d+) 0 R/.exec(body(+/\/Root (\d+) 0 R/.exec(s)[1]))[1]);
  return list;
}

const short = [], unread = [];
let next = 0;
const worker = async () => {
  for (let i; (i = next++) < pages.length;) {
    const pdf = await print(pages[i], i);
    if (!pdf) { unread.push(pages[i]); continue; }
    const runs = textPerPage(pdf);
    if (runs.length < 3) continue;
    const others = runs.slice(0, -1).sort((a, b) => a - b), typical = others[others.length >> 1];
    if (runs.at(-1) < typical * SHORT) short.push(`${pages[i]}: page ${runs.length} of ${runs.length} holds ${Math.round(100 * runs.at(-1) / typical)}% of a typical page`);
  }
};
await Promise.all(Array.from({ length: 4 }, worker));
server.close();
rmSync(out, { recursive: true, force: true });

for (const x of short.sort()) console.log(`  warn  paper   ${x}`);
for (const x of unread.sort()) console.log(`  warn  paper   could not look: Chrome wrote no PDF for ${x}`);
console.log(`  ${short.length || unread.length ? 'warn' : ' ok '}  paper   ${pages.length - unread.length} of ${pages.length} pages printed, ${short.length} ending on a near-empty page`);
