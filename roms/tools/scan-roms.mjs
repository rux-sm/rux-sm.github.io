#!/usr/bin/env node
// Reads the collection on the drive and writes one scan file beside it.
//
//   node roms/tools/scan-roms.mjs "/Volumes/<drive>/emulation"
//
// The scan itself is roms/scan.js, which the Status page runs too; this
// gives it the drive through Node and writes what it returns. It only reads
// the games. It writes two folders: `<emulation>/scans/`, the scan as
// `scan_<date>.json` and `fingerprints.json`, which keeps every file's
// fingerprints by path, size and date so the next scan reads only new or
// changed files; and `<emulation>/backups/`, the saves, BIOS and keys packed
// as `roms-backup_<date>.zip`, the newest five kept. Nothing it writes
// belongs in this repository, which is public. `--headers-only` skips the
// fingerprints, for a quick look.
//
// A CHD the organize tool did not make is looked inside here with chdman,
// which extracts it once to a temporary folder, so the lists can match the
// tracks it holds; the page cannot, and leaves it for this.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import os from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import scanner from '../scan.js';
import saveRules from '../saves-rules.js';

const root = process.argv[2];
const headersOnly = process.argv.includes('--headers-only');
if (!root || !fs.existsSync(path.join(root, 'roms'))) {
  console.error('usage: scan-roms.mjs <emulation folder holding roms/>');
  process.exit(1);
}
const scansDir = path.join(root, 'scans');
const backupsDir = path.join(root, 'backups');
const emulators = JSON.parse(fs.readFileSync(new URL('../emulators.json', import.meta.url), 'utf8')).systems;
const cachePath = path.join(scansDir, 'fingerprints.json');
const cache = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, 'utf8')) : {};

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
  chunks: (rel) => fs.createReadStream(abs(rel), { highWaterMark: 8 << 20 }),
  async text(rel, enc) { return fs.existsSync(abs(rel)) ? fs.readFileSync(abs(rel), enc) : null; },
  async exists(rel) { return fs.existsSync(abs(rel)); },
  hasher() {
    const md5 = crypto.createHash('md5');
    const sha1 = crypto.createHash('sha1');
    let crc = 0;
    return {
      update(b) { md5.update(b); sha1.update(b); crc = zlib.crc32(b, crc); },
      digest: () => ({ crc32: (crc >>> 0).toString(16).padStart(8, '0'), md5: md5.digest('hex'), sha1: sha1.digest('hex') }),
    };
  },
  // The SHA-1 of what a CHD holds: each track of a CD, or the image of a DVD,
  // as the lists fingerprint them.
  async inside(rel) {
    if (!chdman) return null;
    const file = abs(rel);
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

const { scan, packed, newBytes, gamesWithoutLists } = await scanner.scan(drive, { cache, emulators, saveRules, headersOnly });
console.error(`${(newBytes / 1e9).toFixed(1)} GB new to fingerprint${headersOnly ? ' (skipped)' : ''}`);
if (gamesWithoutLists) console.error('no lists in <emulation>/lists/, so no game is matched');

fs.mkdirSync(scansDir, { recursive: true });
fs.writeFileSync(cachePath, JSON.stringify(cache));
const date = new Date().toISOString().slice(0, 10);

// The backup zip, which the Status page uploads to Supabase. macOS's own zip packs it.
const list = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((n) => !n.startsWith('.')).sort() : []);
if (packed.length && !spawnSync('zip', ['-v'], { stdio: 'ignore' }).error) {
  fs.mkdirSync(backupsDir, { recursive: true });
  const file = `roms-backup_${date}.zip`;
  const zipPath = path.join(backupsDir, file);
  fs.rmSync(zipPath, { force: true });
  execFileSync('zip', ['-q', '-X', zipPath, '-@'], { cwd: root, input: packed.join('\n') });
  scan.backup = { file, size: fs.statSync(zipPath).size, sha1: await sha1Of(zipPath), files: packed.length };
  for (const old of list(backupsDir).filter((f) => /^roms-backup_.*\.zip$/.test(f)).sort().slice(0, -5)) {
    fs.rmSync(path.join(backupsDir, old));
  }
}

const scanPath = path.join(scansDir, `scan_${date}.json`);
fs.writeFileSync(scanPath, JSON.stringify(scan, null, 1));
console.error(`${scan.games.length} games written to ${scanPath}`);
