#!/usr/bin/env node
// copy-supabase.mjs -- the home server's copy of what Supabase holds for Emu.
// It reads every file Supabase lists and writes the newest copy of each under
// its own name, in folders a person can read, so a save or a Mac's settings
// goes back by hand with Supabase gone:
//
//   <BACKUPS>/owner/saves/gb/<game>.sav
//   <BACKUPS>/owner/settings/<Mac>/<emulator>/<file>
//   <BACKUPS>/owner/bios/<system>/<file>
//   <BACKUPS>/owner/emulators/<installer>
//   <BACKUPS>/owner/tables/<table>.json     every row of each Emu table
//
// A file already there with the fingerprint Supabase lists is left alone, one
// that changed is fetched again, and one Supabase no longer lists is removed,
// but only a file this tool wrote, which copied.json beside them records.
// Dated copies are the snapshots TrueNAS keeps of the folder. Each file is
// checked against its SHA-1 before it takes its name. It runs with Node
// alone, no packages, once, and says what it did in one line.
//
//   BACKUPS=/backups SUPABASE_KEY=<secret key> node emu/tools/copy-supabase.mjs
//
// BACKUPS       the folder the copy is kept in
// SUPABASE_KEY  a secret key of the project, which reads every account's
//               rows; it is kept only on the server and never in this file
//
// Every row is the owner's until the rows carry an account, and each account
// then has its own folder beside `owner`.

import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

// The project's address, as /account.js has it.
const SUPABASE_URL = 'https://udnmqhayzhrbltxzzhjw.supabase.co';
const BUCKET = 'emu-collection';
// Each Emu table and the columns that order its rows, so a page never repeats one.
const TABLES = { emu_files: 'path,carried_at', emu_games: 'system,title', emu_saves: 'system,name,kind,location',
  emu_notes: 'system,title', emu_macs: 'name', emu_drive: 'id' };
const ACCOUNT = 'owner';

// A file's path as Supabase lists it, made a path inside the copy, or null
// where it would leave it.
export function inside(path) {
  const parts = String(path).split('/');
  if (!parts.length || parts.some(p => p === '' || p === '.' || p === '..' || p.includes('\0') || p.includes('\\'))) return null;
  return parts;
}

export async function copy({ root, key, url = SUPABASE_URL, fetch = globalThis.fetch, log = () => {} }) {
  if (!key) throw new Error('SUPABASE_KEY is not set');
  const headers = { apikey: key, authorization: `Bearer ${key}` };
  // Supabase answers at most 1000 rows a request, so a table is read in pages.
  const rows = async (table, order) => {
    const out = [];
    for (let from = 0; ; from += 1000) {
      const res = await fetch(`${url}/rest/v1/${table}?select=*&order=${order}&limit=1000&offset=${from}`, { headers });
      if (!res.ok) throw new Error(`${table}: ${res.status}`);
      const page = await res.json();
      out.push(...page);
      if (page.length < 1000) return out;
    }
  };

  const home = join(root, ACCOUNT);
  await mkdir(join(home, 'tables'), { recursive: true });
  const manifestFile = join(home, 'copied.json');
  const had = await readFile(manifestFile, 'utf8').then(JSON.parse, () => ({}));
  const have = {};
  const done = { copied: 0, same: 0, removed: 0, failed: 0, bytes: 0 };

  const now = await rows('emu_files_now', 'path');
  for (const f of now) {
    const parts = inside(f.path);
    if (!parts || !/^[0-9a-f]{40}$/.test(f.sha1 ?? '')) { done.failed += 1; log(`refused ${f.path}`); continue; }
    const dest = join(home, ...parts);
    const there = await stat(dest).then(s => s.isFile() && s.size === Number(f.size), () => false);
    if (had[f.path] === f.sha1 && there) { have[f.path] = f.sha1; done.same += 1; continue; }
    try {
      const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${f.sha1}`, { headers });
      if (!res.ok) throw new Error(`${res.status}`);
      const bytes = Buffer.from(await res.arrayBuffer());
      if (createHash('sha1').update(bytes).digest('hex') !== f.sha1) throw new Error('did not arrive whole');
      await mkdir(dirname(dest), { recursive: true });
      const part = join(dirname(dest), `.${parts.at(-1)}.part`);
      await writeFile(part, bytes);
      await rename(part, dest);
      const saved = new Date(f.saved_at ?? Date.now());
      await utimes(dest, saved, saved);
      have[f.path] = f.sha1;
      done.copied += 1;
      done.bytes += bytes.length;
    } catch (error) {
      // What was there stays, and stays known, so the next run tries again.
      if (had[f.path]) have[f.path] = had[f.path];
      done.failed += 1;
      log(`failed ${f.path}: ${error.message}`);
    }
  }

  // A file this tool wrote that Supabase no longer lists.
  const listed = new Set(now.map(f => f.path));
  for (const path of Object.keys(had)) {
    if (listed.has(path)) continue;
    const parts = inside(path);
    if (parts) { await rm(join(home, ...parts), { force: true }); done.removed += 1; }
  }

  for (const [table, order] of Object.entries(TABLES)) {
    const all = await rows(table, order);
    await writeFile(join(home, 'tables', `${table}.json`), `${JSON.stringify(all, null, 1)}\n`);
  }
  await writeFile(`${manifestFile}.part`, `${JSON.stringify(have, null, 1)}\n`);
  await rename(`${manifestFile}.part`, manifestFile);
  return done;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const say = line => console.log(`${new Date().toISOString()} ${line}`);
  try {
    const d = await copy({ root: process.env.BACKUPS ?? '/backups', key: process.env.SUPABASE_KEY, log: say });
    say(`copied ${d.copied}, ${Math.round(d.bytes / 1e6)} MB; the same ${d.same}; removed ${d.removed}; failed ${d.failed}`);
    process.exit(d.failed ? 1 : 0);
  } catch (error) {
    say(`not copied: ${error.message}`);
    process.exit(1);
  }
}
