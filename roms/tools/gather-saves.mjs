#!/usr/bin/env node
// Finds every save the emulators on this Mac keep, wherever each keeps them,
// and copies them into one dated folder for the Saves page to upload.
//
//   node roms/tools/gather-saves.mjs                         gather this Mac's saves
//   node roms/tools/gather-saves.mjs --install "/Volumes/<drive>/emulation"
//                                                            put it on the drive, with Back up saves.command
//
// Where each emulator keeps saves is `macSaves` in roms/emulators.json: its
// folder in ~/Library, and for each place it saves to, the default and the
// setting in its own settings file that moves it. A place's setting wins
// over its default. It only reads the saves.
//
// Into `~/Emulation/backups/<this Mac> <date and time>/`: each emulator's
// files under its name, and `manifest.json`, which lists each file with the
// systems its emulator plays, its path within its place for matching it to
// its game, its size and dates, and the folder it came from for restoring
// it. The newest five gatherings are kept. A save an emulator writes beside
// its game on the drive is the scan's, not this.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const install = args.includes('--install') ? args[args.indexOf('--install') + 1] : null;

// emulators.json sits beside this tool on the drive, or one folder up in the repository.
const jsonPath = [path.join(here, 'emulators.json'), path.join(here, '..', 'emulators.json')].find((p) => fs.existsSync(p));
if (!jsonPath) { console.error('emulators.json is not beside this tool or above it'); process.exit(1); }
const { systems, macSaves } = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

if (install) {
  if (!fs.existsSync(path.join(install, 'roms'))) { console.error('usage: gather-saves.mjs --install <emulation folder holding roms/>'); process.exit(1); }
  const tools = path.join(install, 'tools');
  fs.mkdirSync(tools, { recursive: true });
  fs.copyFileSync(fileURLToPath(import.meta.url), path.join(tools, 'gather-saves.mjs'));
  fs.copyFileSync(jsonPath, path.join(tools, 'emulators.json'));
  const command = path.join(install, 'Back up saves.command');
  fs.writeFileSync(command, `#!/bin/bash
# Gathers this Mac's saves and opens the Saves page to upload them.
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "This needs Node: install it from nodejs.org, or with Homebrew: brew install node"
  read -n 1 -p "Press any key to close."
  exit 1
fi
node tools/gather-saves.mjs && open -a "Google Chrome" "https://rux-sm.github.io/roms/saves.html"
read -n 1 -p "Press any key to close."
`);
  fs.chmodSync(command, 0o755);
  console.log(`Back up saves.command and tools/ are on ${install}.`);
  process.exit(0);
}

const home = os.homedir();
const expand = (p) => p.replace(/^~(?=\/|$)/, home);
const list = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((n) => !n.startsWith('.')).sort() : []);
const walk = (dir) => list(dir).flatMap((n) => {
  const p = path.join(dir, n);
  const st = fs.lstatSync(p);
  return st.isSymbolicLink() ? [] : st.isDirectory() ? walk(p) : [p];
});

// One setting's value from an emulator's settings file, by its key: an INI
// section and key, a JSON or TOML path, a BML path, or an XML tag.
function setting(file, format, key) {
  const text = fs.readFileSync(file, 'utf8');
  const clean = (v) => (v == null ? null : String(v).trim().replace(/^"(.*)"$/, '$1').trim() || null);
  if (format === 'ini') {
    const [section, name] = key.split('/');
    let inSection = false;
    for (const line of text.split(/\r?\n/)) {
      const head = line.match(/^\s*\[(.+)\]\s*$/);
      if (head) { inSection = head[1] === section; continue; }
      const m = inSection && line.match(/^\s*([^=]+?)\s*=\s*(.*)$/);
      if (m && m[1] === name) return clean(m[2]);
    }
    return null;
  }
  if (format === 'json') {
    let v = JSON.parse(text);
    for (const k of key.split('.')) v = v?.[k];
    return clean(v);
  }
  if (format === 'toml') return clean(text.match(new RegExp(`^\\s*${key}\\s*=\\s*(.+)$`, 'm'))?.[1]);
  if (format === 'bml') {
    // A BML tree: each level indented under its parent, a value after a colon.
    const [parent, child] = key.split('/');
    const block = text.split(new RegExp(`^${parent}\\s*$`, 'm'))[1] ?? '';
    return clean(block.match(new RegExp(`^\\s+${child}:\\s*(.*)$`, 'm'))?.[1]);
  }
  if (format === 'xml') return clean(text.match(new RegExp(`<${key}>([^<]*)</${key}>`))?.[1]);
  return null;
}

const mac = (() => {
  try { return execFileSync('scutil', ['--get', 'ComputerName'], { encoding: 'utf8' }).trim(); }
  catch { return os.hostname().split('.')[0]; }
})();
const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ').replace(':', '');
const backups = path.join(home, 'Emulation', 'backups');
const out = path.join(backups, `${mac} ${stamp}`);
const manifest = { mac, made: new Date().toISOString(), emulators: [], files: [] };

for (const [emulator, where] of Object.entries(macSaves)) {
  const homeDir = where.homes.map(expand).find((h) => fs.existsSync(h));
  const plays = Object.keys(systems).filter((s) => systems[s].emulator === emulator);
  const said = { emulator, systems: plays, installed: Boolean(homeDir), places: [], files: 0 };
  manifest.emulators.push(said);
  if (!homeDir) continue;
  const config = where.config && path.join(homeDir, where.config.file);
  for (const [i, place] of where.places.entries()) {
    let dir = null;
    let from = 'default';
    if (place.key && config && fs.existsSync(config)) {
      try {
        const v = setting(config, where.config.format, place.key);
        if (v) { dir = path.resolve(homeDir, expand(v)); from = 'setting'; }
      } catch (e) { console.error(`  ${emulator}: could not read ${where.config.file}: ${e.message}`); }
    }
    if (!dir && place.path) dir = path.join(homeDir, place.path);
    said.places.push({ dir, from, found: Boolean(dir && fs.existsSync(dir)) });
    if (!dir || !fs.existsSync(dir)) continue;
    const include = place.include ? new RegExp(place.include) : null;
    for (const f of walk(dir)) {
      const rel = path.relative(dir, f);
      if (include && !include.test(`/${rel}`) && !include.test(rel)) continue;
      const st = fs.statSync(f);
      if (st.size >= 50e6) continue;
      const stored = path.join(emulator, String(i), rel);
      fs.mkdirSync(path.dirname(path.join(out, stored)), { recursive: true });
      fs.copyFileSync(f, path.join(out, stored));
      manifest.files.push({
        emulator, systems: plays, rel, stored, from: path.dirname(f), size: st.size,
        created: new Date(st.birthtimeMs).toISOString(), saved: new Date(st.mtimeMs).toISOString(),
      });
      said.files++;
    }
  }
}

fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 1));
for (const old of list(backups).filter((d) => d.startsWith(`${mac} `)).slice(0, -5)) {
  fs.rmSync(path.join(backups, old), { recursive: true, force: true });
}
for (const e of manifest.emulators) {
  const places = e.places.map((p) => `${p.found ? '' : 'none at '}${p.dir.replace(home, '~')}${p.from === 'setting' ? ' (its setting)' : ''}`);
  console.log(`  ${e.emulator.padEnd(12)} ${e.installed ? `${e.files} files from ${places.join(', ') || 'nowhere'}` : 'not on this Mac'}`);
}
console.log(`${manifest.files.length} save files from this Mac are in ${out.replace(home, '~')}.`);
console.log('Upload them on the Saves page: Back up this Mac\'s saves.');
