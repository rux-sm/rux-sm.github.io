#!/usr/bin/env node
// serve-games.test.mjs -- runs serve-games.mjs against a folder of invented
// games and tokens it signs with its own key: a member's download whole and
// resumed, and every way a request is refused.

import { createServer } from 'node:http';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHandler, byteRange, romPath } from './serve-games.mjs';

let failed = 0;
const check = (name, ok, got) => {
  if (ok) return;
  failed++;
  console.error(`  fail  ${name}${got === undefined ? '' : `: got ${JSON.stringify(got)}`}`);
};

const url = 'https://example.supabase.co';
const enc = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const other = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const now = () => 1_800_000_000_000;
const sign = async (claims, { keys = pair, kid = 'k1', alg = 'ES256' } = {}) => {
  const head = enc({ alg, kid, typ: 'JWT' });
  const body = enc({ iss: `${url}/auth/v1`, aud: 'authenticated', role: 'authenticated', sub: 'member',
    exp: now() / 1000 + 3600, ...claims });
  const sig = Buffer.from(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, keys.privateKey,
    Buffer.from(`${head}.${body}`))).toString('base64url');
  return `${head}.${body}.${sig}`;
};
const key = async kid => (kid === 'k1' ? pair.publicKey : null);
const rpcCalls = [];
const fetch = async (to, init) => {
  rpcCalls.push(to);
  const sub = JSON.parse(Buffer.from(init.headers.authorization.split('.')[1], 'base64url')).sub;
  return { ok: true, json: async () => sub === 'member' };
};

const dir = await mkdtemp(join(tmpdir(), 'serve-games-'));
const games = join(dir, 'emulation');
await mkdir(join(games, 'roms', 'gc'), { recursive: true });
await mkdir(join(games, 'saves'), { recursive: true });
const bytes = Buffer.from('0123456789abcdefghij');
await writeFile(join(games, 'roms', 'gc', 'Invented Game (USA).rvz'), bytes);
await writeFile(join(games, 'saves', 'secret.sav'), 'save');
await writeFile(join(dir, 'outside.txt'), 'outside');
await symlink(join(dir, 'outside.txt'), join(games, 'roms', 'gc', 'link.rvz'));

const lines = [];
const handler = createHandler({ games, origins: ['https://rux-sm.github.io'], url, fetch, key, now, log: l => lines.push(l) });
const server = createServer(handler);
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const get = (path, headers = {}, method = 'GET') => globalThis.fetch(base + path, { method, headers });
const game = '/roms/gc/Invented%20Game%20(USA).rvz';
const member = await sign({});

try {
  let r = await get(game, { authorization: `Bearer ${member}`, origin: 'https://rux-sm.github.io' });
  check('member gets the whole file', r.status === 200 && (await r.text()) === bytes.toString(), r.status);
  check('it says ranges are served', r.headers.get('accept-ranges') === 'bytes');
  check('it answers the site', r.headers.get('access-control-allow-origin') === 'https://rux-sm.github.io');
  const etag = r.headers.get('etag');

  r = await get(game, { authorization: `Bearer ${member}`, range: 'bytes=5-9' });
  check('a resume gets its range', r.status === 206 && (await r.text()) === '56789', r.status);
  check('the range is named', r.headers.get('content-range') === 'bytes 5-9/20', r.headers.get('content-range'));

  r = await get(game, { authorization: `Bearer ${member}`, range: 'bytes=15-', 'if-range': etag });
  check('an unchanged file resumes', r.status === 206 && (await r.text()) === 'fghij', r.status);
  r = await get(game, { authorization: `Bearer ${member}`, range: 'bytes=15-', 'if-range': '"changed"' });
  check('a changed file is sent whole', r.status === 200 && (await r.text()).length === 20, r.status);
  r = await get(game, { authorization: `Bearer ${member}`, range: 'bytes=50-' });
  check('a range past the end is refused', r.status === 416, r.status);
  r = await get(game, { authorization: `Bearer ${member}` }, 'HEAD');
  check('HEAD says the size', r.status === 200 && r.headers.get('content-length') === '20', r.status);
  check('one token asks Supabase once', rpcCalls.length === 1, rpcCalls.length);

  r = await get(game);
  check('no token is refused', r.status === 401, r.status);
  r = await get(game, { authorization: `Bearer ${await sign({ sub: 'stranger' })}` });
  check('an account not allowed is refused', r.status === 403, r.status);
  r = await get(game, { authorization: `Bearer ${await sign({ exp: now() / 1000 - 1 })}` });
  check('an expired token is refused', r.status === 401, r.status);
  r = await get(game, { authorization: `Bearer ${await sign({}, { keys: other })}` });
  check('a token signed by another key is refused', r.status === 401, r.status);
  r = await get(game, { authorization: `Bearer ${await sign({}, { kid: 'k9' })}` });
  check('an unknown key id is refused', r.status === 401, r.status);
  r = await get(game, { authorization: `Bearer ${await sign({ iss: 'https://evil.example/auth/v1' })}` });
  check('another issuer is refused', r.status === 401, r.status);
  r = await get(game, { authorization: `Bearer ${await sign({ is_anonymous: true })}` });
  check('an anonymous account is refused', r.status === 401, r.status);
  r = await get(game, { authorization: `Bearer ${await sign({}, { alg: 'HS256' })}` });
  check('another algorithm is refused', r.status === 401, r.status);

  for (const path of ['/saves/secret.sav', '/roms/../saves/secret.sav', '/roms/%2e%2e/saves/secret.sav',
    '/roms/gc%2f..%2f..%2fsaves%2fsecret.sav', '/roms/gc/link.rvz', '/roms/gc', '/roms/gc/missing.rvz']) {
    r = await get(path, { authorization: `Bearer ${member}` });
    check(`${path} is not served`, r.status === 404, r.status);
  }
  r = await get(game, { authorization: `Bearer ${member}` }, 'DELETE');
  check('nothing but reading is answered', r.status === 405, r.status);

  r = await get(game, { origin: 'https://rux-sm.github.io', 'access-control-request-method': 'GET' }, 'OPTIONS');
  check('the site may ask first', r.status === 204 && /authorization/.test(r.headers.get('access-control-allow-headers')), r.status);
  r = await get(game, { origin: 'https://evil.example' }, 'OPTIONS');
  check('another site may not', r.status === 403 && !r.headers.get('access-control-allow-origin'), r.status);
  check('no token is logged', !lines.some(l => l.includes(member)));
} finally {
  server.close();
  await rm(dir, { recursive: true, force: true });
}

check('bytes=-5 is the last five', JSON.stringify(byteRange('bytes=-5', 20)) === '{"start":15,"end":19}');
check('two ranges are refused', byteRange('bytes=0-1,4-5', 20) === 'bad');
check('a path outside roms is null', romPath('/bios/x.bin') === null);

if (failed) { console.error(`serve-games: ${failed} failed`); process.exit(1); }
console.log('serve-games: every request answered as it should be');
