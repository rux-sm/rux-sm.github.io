#!/usr/bin/env node
//
// Static server for the kitchen sink. Port 8642 to match rux-ui's convention.
// Node rather than `python3 -m http.server`: that cannot start under a sandboxed
// shell, since its parser calls os.getcwd() at import time (rux-ui, CLAUDE.md).
//
//   node tools/serve.mjs                    this folder at /. Port 8642.
//   node tools/serve.mjs --workspace [dir]  every site on one origin, laid
//                                           out as GitHub Pages lays them
//                                           out. Port 8640. Added 2026-09-09,
//                                           roadmap §8.4 step 0.
//
// WORKSPACE MODE. dir holds every checkout side by side; the default is the
// parent of this rux-ds checkout. `/` is the hub -- the one folder named
// <account>.github.io, because only that repository publishes at the account
// root -- and each other path in the hub's switcher.json is served from the
// folder of the same name beside it: /rux-ds/ from rux-ds/, /rux-scheduler/
// from rux-scheduler/. A directory answers its index.html, as Pages does.
// Nothing else beside the hub is served: switcher.json is the one list of
// apps (hub AGENTS.md), and a private checkout in the same folder stays
// unreachable.
//
// WHY. An app's page links /switcher.js and fetches /switcher.json by
// absolute path, which is right on the live origin and 404s on a per-app
// server, where switcher.js catches it and falls back silently -- so no local
// page has ever shown the real app list. And roadmap §8.4 has every app link
// /rux-ds/<path> instead of a vendored copy; this is the server on which that
// path resolves before any app stops vendoring. The mode changes nothing
// about plain `npm run serve`: same port, same root, same home page.
//
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, normalize, join, basename, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const wsAt = args.indexOf('--workspace');
const WORKSPACE = wsAt < 0 ? null
  : resolve(args[wsAt + 1] ?? resolve(dirname(fileURLToPath(import.meta.url)), '..', '..'));
const PORT = process.env.PORT ?? (WORKSPACE ? 8640 : 8642);
const ROOT = process.cwd();
// Vendored into every app since 2026-09-05 (tools/app-skeleton/tools/serve.mjs
// imports it): at rux-ds's root `/` is the sink, in an app it is index.html.
const HOME = existsSync(join(ROOT, 'kitchen-sink.html')) ? '/kitchen-sink.html' : '/index.html';
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
};

// ── workspace routes: the hub's switcher.json, one folder per path ─────────
function workspaceRoutes(ws) {
  const hubName = readdirSync(ws).find(n => n.endsWith('.github.io') && statSync(join(ws, n)).isDirectory());
  if (!hubName) { console.error(`  no <account>.github.io folder in ${ws}; nothing publishes at /`); process.exit(1); }
  const hub = join(ws, hubName);
  let apps;
  try { apps = JSON.parse(readFileSync(join(hub, 'switcher.json'), 'utf8')).apps; }
  catch (e) { console.error(`  ${hubName}/switcher.json: ${e.message}`); process.exit(1); }
  const routes = [];
  for (const a of apps) {
    if (a.path === '/') continue;
    const dir = join(ws, a.path.replace(/^\/|\/$/g, ''));
    routes.push({ path: a.path, dir: existsSync(dir) ? dir : null });
  }
  return { hub, routes };
}
const WS = WORKSPACE ? workspaceRoutes(WORKSPACE) : null;

// The file a URL names: the directory it must stay under and the path, or
// the reason there is none.
function locate(url) {
  const strip = p => normalize(p).replace(/^(\.\.[/\\])+/, '');
  if (!WS) return { base: ROOT, path: join(ROOT, strip(url === '/' ? HOME : url)) };
  const route = WS.routes.find(r => url === r.path.slice(0, -1) || url.startsWith(r.path));
  if (route && !route.dir) return { missing: `${route.path} is in switcher.json and there is no folder ${route.path.replace(/\//g, '')} beside the hub` };
  const base = route ? route.dir : WS.hub;
  const rest = route ? url.slice(route.path.length - 1) || '/' : url;
  let path = join(base, strip(rest));
  if (existsSync(path) && statSync(path).isDirectory()) path = join(path, 'index.html');
  return { base, path };
}

createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const at = locate(url);
  if (at.missing) { res.writeHead(404, { 'content-type': 'text/plain' }).end(`404 ${at.missing}`); return; }
  if (!at.path.startsWith(at.base)) { res.writeHead(403).end('forbidden'); return; }
  try {
    const body = await readFile(at.path);
    res.writeHead(200, {
      'content-type': TYPES[extname(at.path)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    }).end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }).end(`404 ${at.path.slice(at.base.length)}`);
  }
}).listen(PORT, () => {
  if (!WS) { console.log(`  ${basename(ROOT)} → http://localhost:${PORT}`); return; }
  console.log(`  workspace ${WORKSPACE} → http://localhost:${PORT}`);
  console.log(`  /  ${basename(WS.hub)}`);
  for (const r of WS.routes) console.log(`  ${r.path}  ${r.dir ? basename(r.dir) : 'NO FOLDER -- 404'}`);
});
