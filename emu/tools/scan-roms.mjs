#!/usr/bin/env node
// The home server's nightly scan: reads the collection in its games folder,
// which it mounts read-only, and saves the scan to Supabase with
// scan-save.js: the games and saves, each BIOS, key, firmware and installer
// Supabase lacks, and each emulator's newest version out, asked of its
// project, keeping the last answer of any that does not answer. The scan
// itself is emu/scan.js. It writes nothing beside the games: in CACHE it
// keeps `fingerprints.json`, every file's fingerprints by path, size and
// date so the next scan reads only new or changed files, and `scan.json`,
// the scan for the organize tool, and it takes the organize tool's
// `renames.json` from there. It says what changed in one line.
//
// Each game's cover is kept too, in CACHE's `art` folder, fetched once from
// libretro's thumbnails, and put in Supabase for the pages. A picture rux
// puts in the games folder at `art/<system>/<title>.png`, or .jpg or .webp,
// is the game's cover in place of libretro's. A game libretro has no cover
// for is asked about again after a week, as `art/missing.json` keeps, or at
// once where how a cover is looked for has changed.
//
//   CACHE=/cache SUPABASE_KEY=<secret key> node scan-roms.mjs /games --save
//
// CACHE         the folder its fingerprints and scan are kept in
// SUPABASE_KEY  a secret key of the project, kept only on the server
//
// A CHD the organize tool did not make is looked inside here with chdman,
// which extracts it once to a temporary folder, so the lists can match the
// tracks it holds.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import os from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import scanner from '../scan.js';
import saveRules from '../saves-rules.js';
import scanSave from '../scan-save.js';

const root = process.argv[2];
// The project's address, as /account.js has it.
const SUPABASE_URL = 'https://udnmqhayzhrbltxzzhjw.supabase.co';
if (!root || !fs.existsSync(path.join(root, 'roms')) || !process.argv.includes('--save') || !process.env.SUPABASE_KEY || !process.env.CACHE) {
  console.error('usage: CACHE=<folder> SUPABASE_KEY=<secret key> scan-roms.mjs <games folder holding roms/> --save');
  process.exit(1);
}
const rules = JSON.parse(fs.readFileSync(new URL('../emulators.json', import.meta.url), 'utf8'));
const emulators = rules.systems;
const cacheDir = process.env.CACHE;
const cachePath = path.join(cacheDir, 'fingerprints.json');
const readJson = (file, fallback) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback);
const cache = readJson(cachePath, {});

const abs = (rel) => path.join(root, rel);
const sha1Of = async (file) => {
  const h = crypto.createHash('sha1');
  for await (const chunk of fs.createReadStream(file, { highWaterMark: 8 << 20 })) h.update(chunk);
  return h.digest('hex');
};
// chdman exits non-zero on --help, so only a missing program counts as none.
const chdman = spawnSync('chdman', ['--help'], { stdio: 'ignore' }).error ? null : 'chdman';
let lastReport = 0;

const drive = {
  async list(rel) {
    const dir = abs(rel);
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter((n) => !n.startsWith('.')).sort().map((name) => {
      const st = fs.statSync(path.join(dir, name));
      return { name, dir: st.isDirectory(), size: st.size, mtimeMs: st.mtimeMs, birthtimeMs: st.birthtimeMs };
    });
  },
  async read(rel, offset, length) {
    const fd = fs.openSync(abs(rel), 'r');
    try {
      const buf = Buffer.alloc(length);
      const n = fs.readSync(fd, buf, 0, length, offset);
      return new Uint8Array(buf.buffer, buf.byteOffset, n);
    } finally { fs.closeSync(fd); }
  },
  async text(rel, enc) { return fs.existsSync(abs(rel)) ? fs.readFileSync(abs(rel), enc) : null; },
  async exists(rel) { return fs.existsSync(abs(rel)); },
  async fingerprint(rel) {
    const md5 = crypto.createHash('md5');
    const sha1 = crypto.createHash('sha1');
    let crc = 0;
    for await (const b of fs.createReadStream(abs(rel), { highWaterMark: 8 << 20 })) { md5.update(b); sha1.update(b); crc = zlib.crc32(b, crc); }
    return { crc32: (crc >>> 0).toString(16).padStart(8, '0'), md5: md5.digest('hex'), sha1: sha1.digest('hex') };
  },
  // The SHA-1 of what a CHD holds: each track of a CD, or the image of a DVD,
  // as the lists fingerprint them.
  async inside(rel) {
    if (!chdman) return null;
    const file = abs(rel);
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'emu-chd-'));
    try {
      let images;
      try {
        execFileSync(chdman, ['extractcd', '-i', file, '-o', path.join(tmp, 'disc.cue'), '-sb'], { stdio: 'ignore' });
        images = fs.readdirSync(tmp).filter((f) => f.endsWith('.bin')).sort();
      } catch {
        execFileSync(chdman, ['extractdvd', '-i', file, '-o', path.join(tmp, 'disc.iso')], { stdio: 'ignore' });
        images = ['disc.iso'];
      }
      const inner = [];
      for (const f of images) inner.push(await sha1Of(path.join(tmp, f)));
      return inner;
    } catch (e) {
      console.error(`  could not look inside ${path.basename(file)}: ${e.message}`);
      return null;
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  },
  progress(read, total) {
    if (Date.now() - lastReport < 5000) return;
    lastReport = Date.now();
    process.stderr.write(`  ${total ? ((read / total) * 100).toFixed(1) : '?'}% of ${(total / 1e9).toFixed(0)} GB new to fingerprint\n`);
  },
};

const renames = readJson(path.join(cacheDir, 'renames.json'), []);
const { scan, newBytes, gamesWithoutLists } = await scanner.scan(drive, { cache, emulators, saveRules, renames });
console.error(`${(newBytes / 1e9).toFixed(1)} GB new to fingerprint`);
if (gamesWithoutLists) console.error('no lists in <games>/lists/, so no game is matched');

fs.mkdirSync(cacheDir, { recursive: true });
fs.writeFileSync(cachePath, JSON.stringify(cache));
fs.writeFileSync(path.join(cacheDir, 'scan.json'), JSON.stringify(scan, null, 1));

// A feed's answer as JSON, or null when it does not answer in 15 seconds.
const asked = async (address) => {
  try {
    const res = await fetch(address, { headers: { 'user-agent': 'rux-emu-scan', accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
    return res.ok ? await res.json() : null;
  } catch { return null; }
};
// The newest version a feed names. A `github` project's is its latest
// release's tag; with `tags`, the greatest tag that pattern matches, for a
// project that tags without releasing; with `count`, the first tag and the
// commits from it to the second, as a rolling build numbers itself. Any
// other feed is a `url` and the `path` to the version in its JSON.
const newestOf = async (feed) => {
  if (feed.github) {
    const api = `https://api.github.com/repos/${feed.github}`;
    if (feed.count?.length === 2) {
      const n = (await asked(`${api}/compare/${feed.count[0]}...${feed.count[1]}`))?.ahead_by;
      return Number.isInteger(n) ? `${feed.count[0]}-${n}` : null;
    }
    if (feed.tags) {
      const names = ((await asked(`${api}/tags?per_page=100`)) ?? []).map((t) => t.name).filter((n) => new RegExp(feed.tags).test(n));
      return names.sort().at(-1) ?? null;
    }
    return (await asked(`${api}/releases/latest`))?.tag_name ?? null;
  }
  if (!feed.url || !feed.path) return null;
  const v = feed.path.split('.').reduce((v, k) => v?.[k], await asked(feed.url));
  return typeof v === 'string' ? v : null;
};

const db = scanSave.restDb({ url: SUPABASE_URL, key: process.env.SUPABASE_KEY });
const [games, saves, [row], held] = await Promise.all([
  db.rows('emu_games', 'system,title,size'), db.rows('emu_saves', 'system,name,kind,location'), db.rows('emu_scan', 'newest'),
  db.rows('emu_files_now', 'path,size,saved_at,sha1')]);

const feeds = [...Object.entries(rules.macSaves), [rules.frontend.name, rules.frontend]].filter(([, r]) => r.feed);
const answers = await Promise.all(feeds.map(async ([name, r]) => [name, await newestOf(r.feed)]));
// Each emulator still followed, by its answer now, else its last; a retired one drops out.
const newest = Object.fromEntries(answers.map(([name, v]) => [name, v ?? row?.newest?.[name]]).filter(([, v]) => v));
const unanswered = answers.filter(([, v]) => !v).map(([name]) => name);

const given = await scanSave.givenChanged(scan, async (rel) => {
  const st = fs.existsSync(abs(rel)) && fs.statSync(abs(rel));
  return st ? { size: st.size, mtimeMs: st.mtimeMs } : null;
}, held.filter((f) => f.sha1));
await scanSave.putGiven(db, given, {
  sha1Of: (rel) => sha1Of(abs(rel)),
  bytesOf: async (rel) => fs.readFileSync(abs(rel)),
  mac: 'home server',
  names: [...Object.keys(rules.macSaves), rules.frontend.name, 'Rux Emu Helper'],
});

const change = scanSave.changes(scan, games, saves);
await scanSave.save(db, scanSave.rowsOf(scan, change, { newest }));
// The covers. Each game's is rux's own picture in the games folder, else the
// one kept in the cache, fetched now where the cache has none. Three answers
// in a row that are neither a picture nor a 404 end the asking for the night.
const artDir = path.join(cacheDir, 'art');
const missingPath = path.join(artDir, 'missing.json');
const missingKept = readJson(missingPath, {});
const missing = missingKept.asking === scanSave.ART_ASKING ? missingKept.games : {};
const artLists = new Map();
const WEEK = 7 * 864e5;
const coversOf = (n) => `${n} ${n === 1 ? 'cover' : 'covers'}`;
const covers = [];
const keptFiles = new Set();
let fetched = 0;
let refused = 0;
let unasked = 0;
for (const g of scan.games) {
  const key = scanSave.artKey(g);
  let file = ['.png', '.jpg', '.jpeg', '.webp'].map((ext) => abs(`${key}${ext}`)).find((f) => fs.existsSync(f));
  if (!file) {
    const kept = path.join(artDir, g.system, `${g.title}.png`);
    const askedAt = missing[key] ? Date.parse(missing[key]) : -Infinity;
    if (!fs.existsSync(kept) && scanSave.ART[g.system] && Date.now() - askedAt > WEEK) {
      if (refused >= 3) unasked += 1;
      else {
        try {
          const bytes = await scanSave.fetchArt(g, (to) => fetch(to, { headers: { 'user-agent': 'rux-emu-scan' }, signal: AbortSignal.timeout(30000) }), artLists);
          refused = 0;
          if (bytes) {
            fs.mkdirSync(path.dirname(kept), { recursive: true });
            fs.writeFileSync(`${kept}.part`, bytes);
            fs.renameSync(`${kept}.part`, kept);
            delete missing[key];
            fetched += 1;
          } else missing[key] = new Date().toISOString();
        } catch { refused += 1; unasked += 1; }
      }
    }
    if (fs.existsSync(kept)) { file = kept; keptFiles.add(kept); }
  }
  if (!file) continue;
  const st = fs.statSync(file);
  covers.push({ path: `${key}${path.extname(file).toLowerCase()}`, size: st.size, mtimeMs: st.mtimeMs, file });
}
// A kept cover whose game is gone, or that rux's own picture replaced, leaves the cache.
for (const system of fs.existsSync(artDir) ? fs.readdirSync(artDir, { withFileTypes: true }).filter((d) => d.isDirectory()) : []) {
  for (const name of fs.readdirSync(path.join(artDir, system.name))) {
    const f = path.join(artDir, system.name, name);
    if (!keptFiles.has(f)) fs.rmSync(f);
  }
}
const titles = new Set(scan.games.map(scanSave.artKey));
for (const key of Object.keys(missing)) if (!titles.has(key)) delete missing[key];
fs.mkdirSync(artDir, { recursive: true });
fs.writeFileSync(missingPath, JSON.stringify({ asking: scanSave.ART_ASKING, games: missing }, null, 1));

const art = scanSave.artChanged(covers, held.filter((f) => f.sha1 && f.path.startsWith('art/')));
const coverAt = new Map(covers.map((c) => [c.path, c.file]));
await scanSave.putArt(db, art, {
  sha1Of: (p) => sha1Of(coverAt.get(p)),
  bytesOf: async (p) => fs.readFileSync(coverAt.get(p)),
  mac: 'home server',
});

const counts = [...Object.entries(change).filter(([, list]) => list.length).map(([k, list]) => `${list.length} ${k}`),
  ...(given.length ? [`${given.length} files every Mac is given put in Supabase`] : []),
  ...(fetched ? [`${coversOf(fetched)} fetched`] : []),
  ...(art.put.length ? [`${coversOf(art.put.length)} put in Supabase`] : []),
  ...(art.gone.length ? [`${coversOf(art.gone.length)} removed`] : [])];
console.log(`${new Date().toISOString()} ${scan.games.length} games, ${scan.saves.length} saves on the server; ${counts.join(', ') || 'nothing changed'}`
  + (unanswered.length ? `; no newest version from ${unanswered.join(', ')}` : '')
  + (unasked ? `; libretro's thumbnails did not answer, so ${coversOf(unasked)} ${unasked === 1 ? 'waits' : 'wait'} for tomorrow` : ''));
