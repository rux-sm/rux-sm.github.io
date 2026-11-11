#!/usr/bin/env node
// Keeps this Mac's copy of what the drive cannot get back: the third copy,
// beside the drive and Supabase.
//
//   node emu/tools/backup-saves.mjs "/Volumes/<drive>/emulation"
//
// Into `~/Documents/Emu backups/`, or the folder given after the drive:
// - `zips/`, the newest backup zip scan-roms.mjs packed, the saves, BIOS and
//   keys, beside the ones copied before; the newest thirty are kept.
// - `large/`, every BIOS file of 50 MB or more, like the Switch firmware, and
//   every installer in `<emulation>/emulators/`, copied when it is new or
//   changed, since they are too large for Supabase.
// Each copy is recorded in `<emulation>/backups.json` with this Mac's name,
// and the next scan carries it to the Saves page. Nothing on the drive changes.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.argv[2];
const dest = process.argv[3] ?? path.join(os.homedir(), 'Documents', 'Emu backups');
if (!root || !fs.existsSync(path.join(root, 'roms'))) {
  console.error('usage: backup-saves.mjs <emulation folder holding roms/> [backup folder]');
  process.exit(1);
}
const list = dir => (fs.existsSync(dir) ? fs.readdirSync(dir).filter(n => !n.startsWith('.')).sort() : []);
const walk = dir => list(dir).flatMap(n => {
  const p = path.join(dir, n);
  return fs.statSync(p).isDirectory() ? walk(p) : [p];
});
// A file is copied unless the copy already has its size and date, to the
// millisecond the file system keeps a copy's date to.
const copy = (from, to) => {
  const a = fs.statSync(from);
  if (fs.existsSync(to)) {
    const b = fs.statSync(to);
    if (b.size === a.size && Math.abs(b.mtimeMs - a.mtimeMs) < 1) return false;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  fs.utimesSync(to, a.atimeMs / 1000, a.mtimeMs / 1000);
  return true;
};

const zips = list(path.join(root, 'backups')).filter(f => /^emu-backup_.*\.zip$/.test(f));
const newest = zips.at(-1);
if (!newest) {
  console.error('no backup zip in <emulation>/backups/; run scan-roms.mjs first');
  process.exit(1);
}
let copied = 0;
if (copy(path.join(root, 'backups', newest), path.join(dest, 'zips', newest))) copied++;
for (const old of list(path.join(dest, 'zips')).filter(f => /^emu-backup_.*\.zip$/.test(f)).slice(0, -30)) {
  fs.rmSync(path.join(dest, 'zips', old));
}
const large = [
  ...walk(path.join(root, 'bios')).filter(f => fs.statSync(f).size >= 50e6),
  ...walk(path.join(root, 'emulators')),
];
for (const f of large) if (copy(f, path.join(dest, 'large', path.relative(root, f)))) copied++;

const logPath = path.join(root, 'backups.json');
const log = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath, 'utf8')) : [];
// The Mac by the name it shows in Sharing, else its host name's first part.
let host;
try { host = execFileSync('scutil', ['--get', 'ComputerName'], { encoding: 'utf8' }).trim(); }
catch { host = os.hostname().split('.')[0]; }
log.push({ at: new Date().toISOString(), host, folder: dest, zip: newest });
fs.writeFileSync(logPath, JSON.stringify(log, null, 1));
console.log(`${newest} and ${large.length} large files are in ${dest}; ${copied} copied now.`);
