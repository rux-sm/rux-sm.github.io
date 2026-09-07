#!/usr/bin/env node
//
// Static server for the kitchen sink. Port 8642 to match rux-ui's convention.
// Node rather than `python3 -m http.server`: that cannot start under a sandboxed
// shell, since its parser calls os.getcwd() at import time (rux-ui, CLAUDE.md).
//
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, normalize, join, basename } from 'node:path';

const PORT = process.env.PORT ?? 8642;
const ROOT = process.cwd();
// Vendored into every app since 2026-09-05 (tools/app-skeleton/tools/serve.mjs
// imports it): at rux-ds's root `/` is the sink, in an app it is index.html.
const HOME = existsSync(join(ROOT, 'kitchen-sink.html')) ? '/kitchen-sink.html' : '/index.html';
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
};

createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const rel = normalize(url === '/' ? HOME : url).replace(/^(\.\.[/\\])+/, '');
  const path = join(ROOT, rel);
  if (!path.startsWith(ROOT)) { res.writeHead(403).end('forbidden'); return; }
  try {
    const body = await readFile(path);
    res.writeHead(200, {
      'content-type': TYPES[extname(path)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    }).end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }).end(`404 ${rel}`);
  }
}).listen(PORT, () => console.log(`  ${basename(ROOT)} → http://localhost:${PORT}`));
