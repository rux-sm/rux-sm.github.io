#!/usr/bin/env node
// Reads the collection on the drive and writes one scan file beside it.
//
//   node roms/tools/scan-roms.mjs "/Volumes/<drive>/emulation"
//
// It only reads the games. The one folder it writes is `<emulation>/scans/`:
// the scan as `scan_<date>.json`, and `fingerprints.json`, which keeps every
// file's fingerprints by path, size and date so the next scan reads only new
// or changed files. Nothing it writes belongs in this repository, which is
// public. `--headers-only` skips the fingerprints, for a quick look.
//
// When `<emulation>/lists/` holds the No-Intro and Redump lists, every game
// is matched against them (lib/lists.mjs). A CHD is matched by the tracks
// inside it, which chdman extracts once to a temporary folder and the
// fingerprints keep.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import os from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import { loadLists, matchGame, loadSwitchVersions, matchSwitch, discBaseOf, releaseOf, loadBiosList } from './lib/lists.mjs';

const root = process.argv[2];
const headersOnly = process.argv.includes('--headers-only');
if (!root || !fs.existsSync(path.join(root, 'roms'))) {
  console.error('usage: scan-roms.mjs <emulation folder holding roms/>');
  process.exit(1);
}
const romsDir = path.join(root, 'roms');
const scansDir = path.join(root, 'scans');
const cachePath = path.join(scansDir, 'fingerprints.json');

// Files a system folder holds that are not games.
const SWITCH_EXTRAS = new Set(['mods', 'updates_dlc']);
// Secrets that sit among the BIOS files: listed by name, never read.
const SECRET = /\.keys$/i;

const visible = (name) => !name.startsWith('.');
const list = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter(visible).sort() : []);

function readAt(fd, offset, length) {
  const buf = Buffer.alloc(length);
  const n = fs.readSync(fd, buf, 0, length, offset);
  return buf.subarray(0, n);
}
const ascii = (b) => b.toString('latin1').replace(/\0+$/, '').trim();

// ---- fingerprints -------------------------------------------------------

const cache = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, 'utf8')) : {};
let bytesRead = 0;
let bytesTotal = 0;
let lastReport = 0;

async function fingerprint(file, stat) {
  const key = `${path.relative(root, file)}|${stat.size}|${Math.floor(stat.mtimeMs)}`;
  // An entry may hold only what is inside a CHD, which organize-roms.mjs
  // knows from the files it was made from; the file is still read.
  if (cache[key]?.sha1) return cache[key];
  if (headersOnly) return null;
  const md5 = crypto.createHash('md5');
  const sha1 = crypto.createHash('sha1');
  let crc = 0;
  for await (const chunk of fs.createReadStream(file, { highWaterMark: 8 << 20 })) {
    md5.update(chunk);
    sha1.update(chunk);
    crc = zlib.crc32(chunk, crc);
    bytesRead += chunk.length;
    if (Date.now() - lastReport > 5000) {
      lastReport = Date.now();
      const pct = bytesTotal ? ((bytesRead / bytesTotal) * 100).toFixed(1) : '?';
      process.stderr.write(`  ${pct}% of ${(bytesTotal / 1e9).toFixed(0)} GB new to fingerprint\n`);
    }
  }
  const out = { ...cache[key], crc32: (crc >>> 0).toString(16).padStart(8, '0'), md5: md5.digest('hex'), sha1: sha1.digest('hex') };
  cache[key] = out;
  return out;
}

// The SHA-1 of what a CHD holds: each track of a CD, or the image of a DVD,
// as the lists fingerprint them. Kept with the CHD's own fingerprints.
const sha1Of = async (file) => {
  const h = crypto.createHash('sha1');
  for await (const chunk of fs.createReadStream(file, { highWaterMark: 8 << 20 })) h.update(chunk);
  return h.digest('hex');
};
// chdman exits non-zero on --help, so only a missing program counts as none.
const chdman = spawnSync('chdman', ['--help'], { stdio: 'ignore' }).error ? null : 'chdman';

async function inside(file, stat) {
  const key = `${path.relative(root, file)}|${stat.size}|${Math.floor(stat.mtimeMs)}`;
  if (cache[key]?.inner) return cache[key].inner;
  if (headersOnly || !chdman || !cache[key]) return null;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'roms-chd-'));
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
    cache[key].inner = inner;
    return inner;
  } catch (e) {
    console.error(`  could not look inside ${path.basename(file)}: ${e.message}`);
    return null;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// ---- headers, one reader per kind of file -------------------------------

function nes(fd) {
  const h = readAt(fd, 0, 16);
  if (h.subarray(0, 4).toString('latin1') !== 'NES\x1a') return { header: 'none' };
  const nes2 = (h[7] & 0x0c) === 0x08;
  return {
    header: nes2 ? 'NES 2.0' : 'iNES',
    mapper: (h[6] >> 4) | (h[7] & 0xf0) | (nes2 ? (h[8] & 0x0f) << 8 : 0),
    prgKiB: h[4] * 16,
    chrKiB: h[5] * 8,
    battery: Boolean(h[6] & 0x02),
  };
}

function gameboy(fd) {
  const h = readAt(fd, 0x134, 0x1c);
  let x = 0;
  for (let i = 0; i <= 0x18; i++) x = (x - h[i] - 1) & 0xff;
  return {
    internalTitle: ascii(h.subarray(0, h[0x0f] & 0x80 ? 15 : 16)),
    color: h[0x0f] === 0xc0 ? 'GBC only' : h[0x0f] === 0x80 ? 'GBC enhanced' : 'GB',
    version: h[0x18],
    headerChecksum: x === h[0x19] ? 'ok' : 'bad',
  };
}

function gba(fd) {
  const h = readAt(fd, 0xa0, 0x20);
  let c = 0;
  for (let i = 0; i < 0x1d; i++) c = (c - h[i]) & 0xff;
  c = (c - 0x19) & 0xff;
  return {
    internalTitle: ascii(h.subarray(0, 12)),
    gameCode: ascii(h.subarray(12, 16)),
    version: h[0x1c],
    headerChecksum: c === h[0x1d] ? 'ok' : 'bad',
  };
}

function crc16(buf) {
  let crc = 0xffff;
  for (const b of buf) {
    crc ^= b;
    for (let i = 0; i < 8; i++) crc = crc & 1 ? (crc >>> 1) ^ 0xa001 : crc >>> 1;
  }
  return crc;
}

function nds(fd) {
  const h = readAt(fd, 0, 0x160);
  return {
    internalTitle: ascii(h.subarray(0, 12)),
    gameCode: ascii(h.subarray(12, 16)),
    version: h[0x1e],
    dsi: h[0x12] & 0x02 ? 'DSi enhanced or only' : 'DS',
    headerChecksum: crc16(h.subarray(0, 0x15e)) === h.readUInt16LE(0x15e) ? 'ok' : 'bad',
  };
}

// The N64 boot checksum, by the boot chip the cartridge was made for.
const CIC = { 0x6170a4a1: '6101', 0x90bb6cb5: '6102', 0x0b050ee0: '6103', 0x98bc2c86: '6105', 0xacc8580a: '6106', 0x009e9ea3: '7102' };
const SEED = { 6101: 0xf8ca4ddc, 6102: 0xf8ca4ddc, 7102: 0xf8ca4ddc, 6103: 0xa3886759, 6105: 0xdf26f436, 6106: 0x1fea617a };

function n64(fd) {
  const head = readAt(fd, 0, 0x101000);
  const magic = head.readUInt32BE(0);
  const order = { 0x80371240: 'z64', 0x37804012: 'v64', 0x40123780: 'n64' }[magic] || 'unknown';
  const out = {
    byteOrder: order,
    internalTitle: ascii(head.subarray(0x20, 0x34)),
    gameCode: ascii(head.subarray(0x3b, 0x3f)),
    version: head[0x3f],
  };
  if (order !== 'z64' || head.length < 0x101000) return out;
  const cic = CIC[zlib.crc32(head.subarray(0x40, 0x1000)) >>> 0];
  out.cic = cic || 'unknown';
  if (!cic) return out;
  const u = (n) => n >>> 0;
  let t1, t2, t3, t4, t5, t6;
  t1 = t2 = t3 = t4 = t5 = t6 = SEED[cic];
  for (let i = 0x1000; i < 0x101000; i += 4) {
    const d = head.readUInt32BE(i);
    if (u(t6 + d) < t6) t4 = u(t4 + 1);
    t6 = u(t6 + d);
    t3 = u(t3 ^ d);
    const s = d & 0x1f;
    const r = u((d << s) | (s ? d >>> (32 - s) : 0));
    t5 = u(t5 + r);
    t2 = t2 > d ? u(t2 ^ r) : u(t2 ^ t6 ^ d);
    t1 = cic === '6105' ? u(t1 + (head.readUInt32BE(0x0750 + (i & 0xff)) ^ d)) : u(t1 + (t5 ^ d));
  }
  let c1, c2;
  if (cic === '6103') { c1 = u((t6 ^ t4) + t3); c2 = u((t5 ^ t2) + t1); }
  else if (cic === '6106') { c1 = u(Math.imul(t6, t4) + t3); c2 = u(Math.imul(t5, t2) + t1); }
  else { c1 = u(t6 ^ t4 ^ t3); c2 = u(t5 ^ t2 ^ t1); }
  out.headerChecksum = c1 === head.readUInt32BE(0x10) && c2 === head.readUInt32BE(0x14) ? 'ok' : 'bad';
  return out;
}

function snes(fd, size) {
  const copier = size % 1024 === 512 ? 512 : 0;
  const out = { copierHeader: Boolean(copier) };
  // The internal header is where its checksum and complement add up.
  for (const [layout, at] of [['LoROM', 0x7fc0], ['HiROM', 0xffc0], ['ExHiROM', 0x40ffc0]]) {
    if (copier + at + 0x20 > size) continue;
    const h = readAt(fd, copier + at, 0x20);
    const complement = h.readUInt16LE(0x1c);
    const checksum = h.readUInt16LE(0x1e);
    if ((complement ^ checksum) !== 0xffff) continue;
    out.layout = layout;
    out.internalTitle = ascii(h.subarray(0, 21));
    out.version = h[0x1b];
    out.headerChecksum = snesSum(fd, copier, size - copier) === checksum ? 'ok' : 'bad';
    return out;
  }
  out.layout = 'unknown';
  return out;
}

// SNES checksum: a size that is not a power of two is summed as if its
// last part were repeated to fill the next one.
function snesSum(fd, start, size) {
  const data = readAt(fd, start, size);
  const sum = (b) => b.reduce((a, x) => a + x, 0);
  let base = 1;
  while (base * 2 <= size) base *= 2;
  let total = sum(data.subarray(0, base));
  const rest = data.subarray(base);
  if (rest.length) total += sum(rest) * (base / rest.length);
  return total & 0xffff;
}

function n3ds(fd) {
  const h = readAt(fd, 0x100, 0x10);
  if (h.subarray(0, 4).toString('latin1') !== 'NCSD') return { header: 'not NCSD' };
  const n = readAt(fd, 0x4000, 0x200);
  return {
    titleId: h.readBigUInt64LE(8).toString(16).padStart(16, '0'),
    productCode: ascii(n.subarray(0x150, 0x160)),
    encrypted: !(n[0x18f] & 0x04),
  };
}

function rvz(fd) {
  const magic = ascii(readAt(fd, 0, 4));
  const d = readAt(fd, 0x58, 8);
  return { container: magic, discId: ascii(d.subarray(0, 6)), discNumber: d[6] + 1, revision: d[7] };
}

function chd(fd) {
  const h = readAt(fd, 0, 124);
  if (ascii(h.subarray(0, 8)) !== 'MComprHD') return { header: 'not CHD' };
  const version = h.readUInt32BE(12);
  if (version !== 5) return { chdVersion: version };
  return { chdVersion: 5, rawSha1: h.subarray(64, 84).toString('hex'), sha1: h.subarray(84, 104).toString('hex') };
}

// SYSTEM.CNF in the disc's ISO 9660 file system, for the disc's serial.
function discSerial(fd) {
  const sync = readAt(fd, 0, 12);
  const raw = sync[0] === 0 && sync.subarray(1, 11).every((b) => b === 0xff) && sync[11] === 0;
  const sectorSize = raw ? 2352 : 2048;
  const dataAt = raw ? (readAt(fd, 15, 1)[0] === 2 ? 24 : 16) : 0;
  const sector = (n) => readAt(fd, n * sectorSize + dataAt, 2048);
  const pvd = sector(16);
  if (ascii(pvd.subarray(1, 6)) !== 'CD001') return null;
  const rootLba = pvd.readUInt32LE(156 + 2);
  const rootLen = pvd.readUInt32LE(156 + 10);
  for (let s = 0; s < Math.ceil(rootLen / 2048); s++) {
    const dir = sector(rootLba + s);
    for (let i = 0; i < 2048 && dir[i];) {
      const len = dir[i];
      const name = dir.subarray(i + 33, i + 33 + dir[i + 32]).toString('latin1');
      if (name.toUpperCase().startsWith('SYSTEM.CNF')) {
        const text = sector(dir.readUInt32LE(i + 2)).toString('latin1');
        // Real discs vary: `SLUS_011.15`, `SLUSP012.06`, one backslash or two.
        const m = text.match(/BOOT2?\s*=\s*cdrom0?:\\*([A-Z]{4})[_P-]?(\d{3})\.(\d{2})/i);
        return m ? `${m[1].toUpperCase()}-${m[2]}${m[3]}` : null;
      }
      i += len;
    }
  }
  return null;
}

function cue(file) {
  const dir = path.dirname(file);
  const tracks = [...fs.readFileSync(file, 'latin1').matchAll(/^\s*FILE\s+"(.+?)"/gim)].map((m) => m[1]);
  return { tracks: tracks.length, missingTracks: tracks.filter((t) => !fs.existsSync(path.join(dir, t))) };
}

function switchName(name) {
  const id = name.match(/\[([0-9A-Fa-f]{16})\]/)?.[1]?.toUpperCase();
  const version = Number(name.match(/\[v(\d+)\]/)?.[1] ?? 0);
  if (!id) return {};
  const n = BigInt(`0x${id}`);
  const tail = n & 0xfffn;
  const kind = tail === 0n ? 'game' : tail === 0x800n ? 'update' : 'add-on';
  const base = kind === 'game' ? n : kind === 'update' ? n & ~0xfffn : (n & ~0xfffn) - 0x1000n;
  return { titleId: id, version, kind, baseTitleId: base.toString(16).toUpperCase().padStart(16, '0') };
}

function wiiuMeta(folder) {
  const meta = path.join(folder, 'meta', 'meta.xml');
  if (!fs.existsSync(meta)) return {};
  const xml = fs.readFileSync(meta, 'utf8');
  const tag = (t) => xml.match(new RegExp(`<${t}[^>]*>([^<]*)</${t}>`))?.[1]?.trim();
  return { titleId: tag('title_id'), version: Number(tag('title_version') ?? 0), productCode: tag('product_code') };
}

const READERS = {
  nes: nes, gb: gameboy, gbc: gameboy, gba: gba, nds: nds, z64: n64, v64: n64, n64: n64,
  sfc: snes, smc: snes, '3ds': n3ds, cci: n3ds, rvz: rvz, chd: chd,
};

function headerOf(file, ext, size) {
  if (ext === 'cue') return cue(file);
  const fd = fs.openSync(file, 'r');
  try {
    if (READERS[ext]) return READERS[ext](fd, size);
    if (ext === 'iso' || ext === 'bin') {
      const serial = discSerial(fd);
      return serial ? { serial } : {};
    }
    return {};
  } catch (e) {
    return { readError: e.message };
  } finally {
    fs.closeSync(fd);
  }
}

// ---- walking the drive --------------------------------------------------

// The tracks and discs of one game share its title.
const titleOf = (stem) => stem.replace(/\s*\((Track|Disc) \d+\)/g, '').trim();
const tagsOf = (title) => [...title.matchAll(/\(([^)]+)\)/g)].map((m) => m[1]);
const REGIONS = /^(USA|Europe|Japan|World|Canada|Korea|Asia|Australia|Brazil|Spain|France|Germany|Italy|Netherlands|Sweden|China)$/;

function walkFiles(dir) {
  return list(dir).flatMap((name) => {
    const p = path.join(dir, name);
    return fs.statSync(p).isDirectory() ? walkFiles(p) : [p];
  });
}

const entries = [];
for (const system of list(romsDir)) {
  const dir = path.join(romsDir, system);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const name of list(dir)) {
    const p = path.join(dir, name);
    const isDir = fs.statSync(p).isDirectory();
    if (system === 'switch' && SWITCH_EXTRAS.has(name)) {
      for (const f of walkFiles(p)) entries.push({ system, path: f, extra: name });
      continue;
    }
    entries.push({ system, path: p, isDir });
  }
}

const biosFiles = walkFiles(path.join(root, 'bios'));
const toFingerprint = [
  ...entries.flatMap((e) => (e.isDir ? walkFiles(e.path) : e.extra === 'mods' ? [] : [e.path])),
  ...biosFiles.filter((f) => !SECRET.test(f)),
];
for (const f of toFingerprint) {
  const st = fs.statSync(f);
  if (!cache[`${path.relative(root, f)}|${st.size}|${Math.floor(st.mtimeMs)}`]?.sha1) bytesTotal += st.size;
}
console.error(`${entries.length} entries, ${(bytesTotal / 1e9).toFixed(1)} GB new to fingerprint${headersOnly ? ' (skipped)' : ''}`);

async function fileRecord(file) {
  const st = fs.statSync(file);
  const ext = path.extname(file).slice(1).toLowerCase();
  return {
    name: path.relative(romsDir, file),
    ext,
    size: st.size,
    modified: new Date(st.mtimeMs).toISOString(),
    ...(await fingerprint(file, st)),
    ...(ext === 'chd' ? { inner: await inside(file, st) } : {}),
    header: headerOf(file, ext, st.size),
  };
}

const games = new Map();
const extras = [];
for (const e of entries) {
  if (e.extra) {
    if (e.extra === 'mods') { extras.push({ system: e.system, kind: 'mod', name: path.relative(romsDir, e.path) }); continue; }
    const rec = await fileRecord(e.path);
    extras.push({ system: e.system, ...switchName(path.basename(e.path)), file: rec });
    continue;
  }
  const base = path.basename(e.path);
  const stem = e.isDir ? base : base.slice(0, base.length - path.extname(base).length);
  const title = titleOf(stem);
  const key = `${e.system}/${title}`;
  if (!games.has(key)) games.set(key, { system: e.system, title, files: [] });
  const game = games.get(key);
  if (e.isDir) {
    game.folder = true;
    Object.assign(game, wiiuMeta(e.path));
    for (const f of walkFiles(e.path)) game.files.push(await fileRecord(f));
  } else {
    game.files.push(await fileRecord(e.path));
    if (e.system === 'switch') Object.assign(game, switchName(base));
  }
}

const saves = walkFiles(path.join(root, 'saves')).map((f) => path.relative(path.join(root, 'saves'), f));
const savedStems = new Set(saves.map((s) => path.basename(s).replace(/\.(srm|rtc|sav|state\d*|state\.png)$/i, '')));

const out = [...games.values()].map((g) => {
  const tags = tagsOf(g.title);
  return {
    ...g,
    region: tags.find((t) => t.split(', ').every((r) => REGIONS.test(r)))
      ?? (/\[(US|USA)\]/.test(g.title) ? 'USA' : null),
    languages: tags.find((t) => /^(En|Ja|Fr|De|Es|It|Nl|Pt|Sv|Ko|Zh)(,|$)/.test(t)) ?? null,
    revision: tags.find((t) => /^(Rev \w+|v\d[\d.]*)$/.test(t)) ?? null,
    formats: [...new Set(g.files.map((f) => f.ext))].sort(),
    size: g.files.reduce((a, f) => a + f.size, 0),
    hasSave: savedStems.has(g.title),
  };
});
// Switch updates and add-ons sit beside the game they belong to.
for (const x of extras.filter((x) => x.baseTitleId)) {
  const game = out.find((g) => g.titleId === x.baseTitleId);
  if (game) (game.extras ??= []).push(x);
}

// Each game against the lists, where the drive holds them.
const lists = loadLists(path.join(root, 'lists'));
const switchVersions = loadSwitchVersions(path.join(root, 'lists'));
const matchOf = g => (g.system === 'switch' ? matchSwitch(g, switchVersions) : matchGame(g, lists));
for (const g of out) g.match = matchOf(g);
// Discs whose files carry no disc number, like a set named by edition, are
// one game once the list names them as discs of one set.
const sets = new Map();
for (const g of out) {
  const n = g.match?.names ?? [];
  if (n.length && n.every(x => /\(Disc \d+\)/.test(x))) {
    const k = `${g.system}/${discBaseOf(n[0])}`;
    if (!sets.has(k)) sets.set(k, []);
    sets.get(k).push(g);
  }
}
for (const [k, group] of sets) {
  if (group.length < 2) continue;
  const [first, ...rest] = group;
  first.title = k.slice(k.indexOf('/') + 1);
  for (const g of rest) {
    first.files.push(...g.files);
    first.size += g.size;
    first.hasSave ||= g.hasSave;
    out.splice(out.indexOf(g), 1);
  }
  first.formats = [...new Set(first.files.map(f => f.ext))].sort();
  first.match = matchOf(first);
}
// Two games of one release on one system, told apart only by region,
// languages or revision, are copies of one game; each names the others.
const byBase = new Map();
for (const g of out) {
  const k = `${g.system}/${releaseOf(g.match?.names?.[0] ?? g.title)}`;
  if (!byBase.has(k)) byBase.set(k, []);
  byBase.get(k).push(g);
}
for (const group of byBase.values()) {
  if (group.length < 2) continue;
  for (const g of group) if (g.match) g.match.copies = group.filter(x => x !== g).map(x => x.title);
}
const listsUsed = Object.fromEntries(Object.entries(lists).map(([s, l]) => [s, l.used]));
if (!Object.keys(lists).length) console.error('no lists in <emulation>/lists/, so no game is matched');

const bios = await Promise.all(biosFiles.map(async (f) => {
  const rel = path.relative(path.join(root, 'bios'), f);
  if (SECRET.test(f)) return { name: rel, secret: true };
  return { name: rel, size: fs.statSync(f).size, ...(await fingerprint(f, fs.statSync(f))) };
}));
// A BIOS the system list knows, by name, under that system's emulator's
// folder in the list, since one small file can equal another system's. The
// list knows few, so no match is no fault.
const BIOS_FOLDERS = { ps2: /^System: pcsx2\//, xbox: /^System: (xemu|xbox)\//i };
const biosList = loadBiosList(path.join(root, 'lists'));
for (const b of bios) {
  const hit = biosList && b.sha1 ? biosList.get(b.sha1) : null;
  const folder = BIOS_FOLDERS[b.name.split('/')[0]];
  b.listedAs = hit && folder?.test(hit) ? hit : null;
}

fs.mkdirSync(scansDir, { recursive: true });
fs.writeFileSync(cachePath, JSON.stringify(cache));
const date = new Date().toISOString().slice(0, 10);
const scanPath = path.join(scansDir, `scan_${date}.json`);
fs.writeFileSync(scanPath, JSON.stringify({
  scanned: new Date().toISOString(),
  fingerprints: !headersOnly,
  lists: listsUsed,
  games: out,
  unmatchedExtras: extras.filter((x) => !x.baseTitleId || !out.some((g) => g.titleId === x.baseTitleId)),
  bios,
  saves,
}, null, 1));
console.error(`${out.length} games written to ${scanPath}`);
