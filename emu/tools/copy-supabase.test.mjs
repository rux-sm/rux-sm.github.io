#!/usr/bin/env node
// copy-supabase.test.mjs -- runs copy-supabase.mjs against a stand-in
// Supabase of invented rows and files: what it copies, leaves, fetches again
// and removes, and every file it refuses.

import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { copy, inside } from './copy-supabase.mjs';

let failed = 0;
let cases = 0;
const check = (name, ok, got) => {
  cases++;
  if (ok) return;
  failed++;
  console.error(`  fail  ${name}${got === undefined ? '' : `: got ${JSON.stringify(got)}`}`);
};
const sha = text => createHash('sha1').update(text).digest('hex');
const url = 'https://example.supabase.co';
const KEY = 'a-secret-key';

// The stand-in: rows by table and bytes by fingerprint, answering as Supabase does.
function world(files, { bytesOf = {}, tables = {} } = {}) {
  const now = files.map(f => ({ path: f.path, sha1: f.sha1 ?? sha(f.text), size: f.size ?? f.text.length, saved_at: f.saved ?? '2026-01-02T03:04:05+00:00', mac: 'a Mac' }));
  const blobs = new Map(files.filter(f => f.text != null).map(f => [sha(f.text), f.text]));
  for (const [k, v] of Object.entries(bytesOf)) blobs.set(k, v);
  const asked = [];
  const fetch = async (to, init) => {
    asked.push(to);
    if (init?.headers?.apikey !== KEY || init?.headers?.authorization !== `Bearer ${KEY}`) return { ok: false, status: 401 };
    const u = new URL(to);
    if (u.pathname.startsWith('/rest/v1/')) {
      const table = u.pathname.split('/').pop();
      const all = table === 'emu_files_now' ? now : tables[table] ?? [];
      const from = Number(u.searchParams.get('offset'));
      return { ok: true, status: 200, json: async () => all.slice(from, from + Number(u.searchParams.get('limit'))) };
    }
    const text = blobs.get(u.pathname.split('/').pop());
    return text == null ? { ok: false, status: 404 } : { ok: true, status: 200, arrayBuffer: async () => Buffer.from(text) };
  };
  return { fetch, asked };
}
const fetched = w => w.asked.filter(a => a.includes('/storage/')).length;
const read = (root, path) => readFile(join(root, 'owner', path), 'utf8').catch(() => null);

const root = await mkdtemp(join(tmpdir(), 'copy-supabase-'));
try {
  const first = [
    { path: 'saves/gb/A Game (USA).sav', text: 'save one', saved: '2026-03-04T05:06:07+00:00' },
    { path: 'settings/a Mac/mGBA/config.ini', text: 'settings' },
    { path: 'bios/psx/scph5501.bin', text: 'bios' },
  ];
  let w = world(first, { tables: { emu_notes: [{ system: 'gb', title: 'A Game (USA)', note: 'at the gym' }] } });
  let d = await copy({ root, key: KEY, url, fetch: w.fetch });
  check('a first run copies every file', d.copied === 3 && d.same === 0 && d.failed === 0, d);
  check('a save is under its own name', await read(root, 'saves/gb/A Game (USA).sav') === 'save one');
  check('a Mac\'s settings are under the Mac and the emulator', await read(root, 'settings/a Mac/mGBA/config.ini') === 'settings');
  check('a file keeps the moment it was saved', (await stat(join(root, 'owner', 'saves/gb/A Game (USA).sav'))).mtime.toISOString() === '2026-03-04T05:06:07.000Z');
  check('every table is written', (await readdir(join(root, 'owner', 'tables'))).length === 6);
  check('rux\'s notes are among them', JSON.parse(await read(root, 'tables/emu_notes.json'))[0].note === 'at the gym');

  w = world(first);
  d = await copy({ root, key: KEY, url, fetch: w.fetch });
  check('a second run fetches nothing', d.copied === 0 && d.same === 3 && fetched(w) === 0, { d, fetched: fetched(w) });

  w = world([{ ...first[0], text: 'save two' }, first[1]]);
  d = await copy({ root, key: KEY, url, fetch: w.fetch });
  check('a changed save is fetched again, and only it', d.copied === 1 && d.same === 1 && fetched(w) === 1, d);
  check('the changed save took its place', await read(root, 'saves/gb/A Game (USA).sav') === 'save two');
  check('a file Supabase no longer lists is removed', d.removed === 1 && await read(root, 'bios/psx/scph5501.bin') === null, d);

  await mkdir(join(root, 'owner', 'mine'), { recursive: true });
  await writeFile(join(root, 'owner', 'mine', 'kept.txt'), 'not the tool\'s');
  await rm(join(root, 'owner', 'settings/a Mac/mGBA/config.ini'));
  w = world([{ ...first[0], text: 'save two' }, first[1]]);
  d = await copy({ root, key: KEY, url, fetch: w.fetch });
  check('a file gone from the copy is fetched again', d.copied === 1 && await read(root, 'settings/a Mac/mGBA/config.ini') === 'settings', d);
  check('a file the tool did not write is left alone', await read(root, 'mine/kept.txt') === 'not the tool\'s');

  const wrong = sha('what Supabase lists');
  w = world([{ path: 'saves/gb/A Game (USA).sav', sha1: wrong, size: 5 }], { bytesOf: { [wrong]: 'other bytes' } });
  d = await copy({ root, key: KEY, url, fetch: w.fetch });
  check('bytes that do not match their fingerprint are not kept', d.failed === 1 && await read(root, 'saves/gb/A Game (USA).sav') === 'save two', d);
  w = world([{ ...first[0], text: 'save two' }]);
  d = await copy({ root, key: KEY, url, fetch: w.fetch });
  check('a save that failed once is still known as it was', d.same === 1 && d.copied === 0, d);

  w = world([{ path: '../outside.txt', text: 'x' }, { path: 'saves//x', text: 'x' }, { path: 'saves/gb/ok.sav', text: 'ok' }, { path: 'saves/gb/bad.sav', sha1: 'nope', size: 1 }]);
  d = await copy({ root, key: KEY, url, fetch: w.fetch });
  check('a path that leaves the copy and a bad fingerprint are refused', d.failed === 3 && d.copied === 1 && await readFile(join(root, 'outside.txt'), 'utf8').catch(() => null) === null, d);
  check('inside refuses a path that climbs', inside('a/../b') === null && inside('/a') === null && inside('a/b').length === 2);

  const many = Array.from({ length: 2300 }, (_, i) => ({ path: `saves/n/${i}.sav`, text: `s${i}` }));
  const big = await mkdtemp(join(tmpdir(), 'copy-supabase-many-'));
  w = world(many);
  d = await copy({ root: big, key: KEY, url, fetch: w.fetch });
  check('more files than one page holds are all copied', d.copied === 2300, d);
  await rm(big, { recursive: true, force: true });

  w = world(first);
  check('a wrong key copies nothing', await copy({ root, key: 'wrong', url, fetch: w.fetch }).then(() => false, e => /401/.test(e.message)));
  check('no key is refused before anything is asked', await copy({ root, key: '', url, fetch: w.fetch }).then(() => false, e => /SUPABASE_KEY/.test(e.message)) && true);
} finally {
  await rm(root, { recursive: true, force: true });
}

console.log(failed ? `  ${failed} of ${cases} failed` : `   ok   copy-supabase: ${cases} cases`);
process.exit(failed ? 1 : 0);
