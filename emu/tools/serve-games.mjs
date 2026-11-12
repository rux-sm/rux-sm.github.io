#!/usr/bin/env node
// serve-games.mjs -- the home server's game downloads. It sends a file from
// the collection's roms folder, read-only, to a request carrying the
// signed-in account's Supabase access token: the token is checked against
// Supabase's public signing keys, and Supabase is asked, with that same
// token, whether the account may download. It keeps no accounts or secrets,
// answers only the origins it is given, and serves a byte range so a broken
// download resumes. It runs with Node alone, no packages.
//
//   GAMES=/games PORT=8080 node emu/tools/serve-games.mjs
//
// GAMES       the collection folder, holding roms/ (read-only is enough)
// PORT        the port it listens on, 8080 by default
// ORIGINS     the sites it answers, comma-separated
// MEMBER_RPC  the Supabase function that says an account may download

import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { join, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

// The project's address and publishable key, as /account.js has them; the key is not a secret.
const SUPABASE_URL = 'https://udnmqhayzhrbltxzzhjw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_w3h8Mtwam0ULemVKGKyBfw_DTbTaJIS';
const ORIGINS = 'https://rux-sm.github.io,http://localhost:8640,http://localhost:8641';

const b64url = s => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
const json = s => JSON.parse(b64url(s).toString('utf8'));

// The public signing keys, fetched once an hour, and again for a key id not yet seen.
export function keyRing({ url, fetch = globalThis.fetch, now = Date.now }) {
  let keys = new Map();
  let fetchedAt = -Infinity;
  const load = async () => {
    const res = await fetch(`${url}/auth/v1/.well-known/jwks.json`);
    if (!res.ok) throw new Error(`signing keys: ${res.status}`);
    const { keys: list } = await res.json();
    const next = new Map();
    for (const jwk of list) {
      if (jwk.kty !== 'EC' || jwk.crv !== 'P-256') continue;
      next.set(jwk.kid, await crypto.subtle.importKey('jwk', { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y },
        { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']));
    }
    keys = next;
    fetchedAt = now();
  };
  return async kid => {
    if (!keys.has(kid) || now() - fetchedAt > 3600e3) {
      // A key id not seen waits a minute before asking again, so a forged one cannot make every request fetch.
      if (now() - fetchedAt > 60e3) await load();
    }
    return keys.get(kid) ?? null;
  };
}

// The token's claims when its signature, issuer, audience and time hold; null otherwise.
export async function verifyToken(token, { key, issuer, now = Date.now }) {
  const parts = String(token).split('.');
  if (parts.length !== 3) return null;
  let head, claims;
  try { head = json(parts[0]); claims = json(parts[1]); } catch { return null; }
  if (head.alg !== 'ES256' || !head.kid) return null;
  const pub = await key(head.kid);
  if (!pub) return null;
  const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub,
    b64url(parts[2]), Buffer.from(`${parts[0]}.${parts[1]}`));
  if (!ok) return null;
  const t = now() / 1000;
  if (claims.iss !== issuer || claims.aud !== 'authenticated' || claims.role !== 'authenticated') return null;
  if (claims.is_anonymous === true || typeof claims.exp !== 'number' || claims.exp <= t) return null;
  if (typeof claims.sub !== 'string') return null;
  return claims;
}

// A path under roms/, or null for anything that climbs out of it or is not a plain name.
export function romPath(urlPath) {
  if (!urlPath.startsWith('/roms/')) return null;
  let parts;
  try { parts = urlPath.slice(1).split('/').map(decodeURIComponent); } catch { return null; }
  if (parts.some(p => p === '' || p === '.' || p === '..' || p.includes('\0') || p.includes('/') || p.includes('\\'))) return null;
  return parts.join(sep);
}

// The byte range asked for, as { start, end } inclusive; null for the whole
// file; 'bad' when it cannot be met. Only a single range is served.
export function byteRange(header, size) {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (m[1] === '' && m[2] === '')) return 'bad';
  let start, end;
  if (m[1] === '') { const n = Number(m[2]); if (n === 0) return 'bad'; start = Math.max(0, size - n); end = size - 1; }
  else { start = Number(m[1]); end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1); }
  if (start > end || start >= size) return 'bad';
  return { start, end };
}

export function createHandler({ games, origins, memberRpc = 'is_owner', url = SUPABASE_URL, apikey = SUPABASE_KEY,
  fetch = globalThis.fetch, key = keyRing({ url, fetch }), now = Date.now, log = () => {} }) {
  const allowed = new Set(origins);
  const issuer = `${url}/auth/v1`;
  // Each token's answer, kept until the token expires, so a download's every range asks Supabase once.
  const members = new Map();
  const isMember = async (token, exp) => {
    const t = now() / 1000;
    for (const [k, v] of members) if (v.exp <= t) members.delete(k);
    if (members.has(token)) return members.get(token).ok;
    const res = await fetch(`${url}/rest/v1/rpc/${memberRpc}`, {
      method: 'POST',
      headers: { apikey, authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: '{}',
    });
    const ok = res.ok && (await res.json()) === true;
    members.set(token, { ok, exp });
    return ok;
  };
  let root = null;

  return async (req, res) => {
    const started = now();
    let who = '-';
    const origin = req.headers.origin;
    if (origin && allowed.has(origin)) {
      res.setHeader('access-control-allow-origin', origin);
      res.setHeader('access-control-expose-headers', 'content-length, content-range, accept-ranges, etag');
    }
    res.setHeader('vary', 'origin');
    const end = (status, body = '') => {
      res.writeHead(status, body ? { 'content-type': 'text/plain; charset=utf-8' } : {});
      res.end(body);
      log(`${status} ${req.method} ${req.url} ${who} ${now() - started}ms`);
    };

    if (req.method === 'OPTIONS') {
      if (!origin || !allowed.has(origin)) return end(403);
      res.setHeader('access-control-allow-methods', 'GET, HEAD');
      res.setHeader('access-control-allow-headers', 'authorization, range, if-range');
      res.setHeader('access-control-max-age', '600');
      return end(204);
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return end(405);
    const path = new URL(req.url, 'http://x').pathname;
    if (path === '/') return end(200, 'ok\n');

    const token = /^Bearer (.+)$/i.exec(req.headers.authorization ?? '')?.[1];
    if (!token) return end(401, 'sign in first\n');
    let claims;
    try { claims = await verifyToken(token, { key, issuer, now }); } catch { return end(503, 'signing keys unreachable\n'); }
    if (!claims) return end(401, 'sign in again\n');
    who = claims.sub;
    let member;
    try { member = await isMember(token, claims.exp); } catch { return end(503, 'Supabase unreachable\n'); }
    if (!member) return end(403, 'this account may not download\n');

    const rel = romPath(path);
    if (!rel) return end(404, 'not found\n');
    root ??= await realpath(games);
    let file, info;
    try {
      file = await realpath(join(root, rel));
      if (!file.startsWith(root + sep)) return end(404, 'not found\n');
      info = await stat(file);
    } catch { return end(404, 'not found\n'); }
    if (!info.isFile()) return end(404, 'not found\n');

    const size = info.size;
    const etag = `"${size.toString(36)}-${Math.floor(info.mtimeMs).toString(36)}"`;
    const ifRange = req.headers['if-range'];
    let range = byteRange(req.headers.range, size);
    // A resume against a file that changed since sends the whole file again.
    if (range && ifRange && ifRange !== etag) range = null;
    if (range === 'bad') {
      res.setHeader('content-range', `bytes */${size}`);
      return end(416);
    }
    const headers = {
      'accept-ranges': 'bytes',
      etag,
      'last-modified': info.mtime.toUTCString(),
      'content-type': 'application/octet-stream',
      'cache-control': 'private, no-store',
    };
    const { start, end: last } = range ?? { start: 0, end: size - 1 };
    headers['content-length'] = String(size === 0 ? 0 : last - start + 1);
    if (range) headers['content-range'] = `bytes ${start}-${last}/${size}`;
    res.writeHead(range ? 206 : 200, headers);
    if (req.method === 'HEAD' || size === 0) {
      res.end();
      return log(`${range ? 206 : 200} ${req.method} ${req.url} ${who} ${now() - started}ms`);
    }
    const stream = createReadStream(file, { start, end: last });
    stream.on('error', () => res.destroy());
    res.on('close', () => {
      stream.destroy();
      log(`${range ? 206 : 200} ${req.method} ${req.url} ${who} ${res.writableFinished ? 'sent' : 'cut'} ${now() - started}ms`);
    });
    stream.pipe(res);
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const games = process.env.GAMES ?? '/games';
  const port = Number(process.env.PORT ?? 8080);
  const origins = (process.env.ORIGINS ?? ORIGINS).split(',').map(s => s.trim()).filter(Boolean);
  const handler = createHandler({ games, origins, memberRpc: process.env.MEMBER_RPC ?? 'is_owner',
    log: line => console.log(`${new Date().toISOString()} ${line}`) });
  createServer(handler).listen(port, () => console.log(`serving ${games}/roms on :${port} for ${origins.join(' ')}`));
}
