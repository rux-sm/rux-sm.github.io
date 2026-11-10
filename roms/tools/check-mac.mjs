#!/usr/bin/env node
// Says how this Mac stands, and copies each save it still keeps itself onto
// the drive, for the Status page's Update to save.
//
//   node roms/tools/check-mac.mjs "/Volumes/<drive>/emulation"
//   node roms/tools/check-mac.mjs --install "/Volumes/<drive>/emulation"
//                         put it on the drive, with Check this Mac.command
//
// Where each emulator keeps saves is `macSaves` in roms/emulators.json: its
// folder in ~/Library, and for each place it saves to, the default and the
// setting in its own settings file that moves it. A place's setting wins
// over its default. It only reads the saves.
//
// Into the drive's `macs/<this Mac>/`, replaced each time: `report.json`,
// which says how this Mac stands, its macOS, ES-DE's and each emulator's
// app and version, the folder ES-DE reads games from, where it looked for
// each emulator's saves and what it found, and how many files each retired
// app in `retired` still holds; and each save kept on this Mac rather than
// on the drive, under its emulator's name, which the report lists with the
// systems its emulator plays, its path within its place for matching it to
// its game, its size and dates, and the folder it came from for restoring
// it. A save already on the drive is the scan's, and a retired app's files
// are counted, never copied, because they are moved to the drive by hand.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const install = args.includes('--install') ? args[args.indexOf('--install') + 1] : null;
const drive = install ?? args[0];
if (!drive || !fs.existsSync(path.join(drive, 'roms'))) {
  console.error('usage: check-mac.mjs [--install] <emulation folder holding roms/>');
  process.exit(1);
}

// emulators.json sits beside this tool on the drive, or one folder up in the repository.
const jsonPath = [path.join(here, 'emulators.json'), path.join(here, '..', 'emulators.json')].find((p) => fs.existsSync(p));
if (!jsonPath) { console.error('emulators.json is not beside this tool or above it'); process.exit(1); }
const { frontend, systems, macSaves, retired = {} } = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

if (install) {
  const tools = path.join(install, 'tools');
  fs.mkdirSync(tools, { recursive: true });
  fs.copyFileSync(fileURLToPath(import.meta.url), path.join(tools, 'check-mac.mjs'));
  fs.copyFileSync(jsonPath, path.join(tools, 'emulators.json'));
  // The tool and command this one replaced.
  for (const old of [path.join(tools, 'gather-saves.mjs'), path.join(install, 'Back up saves.command')]) fs.rmSync(old, { force: true });
  const command = path.join(install, 'Check this Mac.command');
  fs.writeFileSync(command, `#!/bin/bash
# Checks this Mac onto the drive and opens the Status page to save it.
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "This needs Node: install it from nodejs.org, or with Homebrew: brew install node"
  read -n 1 -p "Press any key to close."
  exit 1
fi
node tools/check-mac.mjs . && open -a "Google Chrome" "https://rux-sm.github.io/roms/status.html"
read -n 1 -p "Press any key to close."
`);
  fs.chmodSync(command, 0o755);
  console.log(`Check this Mac.command and tools/ are on ${install}.`);
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

// An app by any of its names in either Applications folder, with the version its bundle says.
const appOf = (names) => {
  for (const dir of ['/Applications', path.join(home, 'Applications')]) {
    for (const name of names ?? []) {
      const app = path.join(dir, name);
      if (!fs.existsSync(app)) continue;
      let version = null;
      try { version = execFileSync('plutil', ['-extract', 'CFBundleShortVersionString', 'raw', path.join(app, 'Contents', 'Info.plist')], { encoding: 'utf8' }).trim(); }
      catch { version = null; }
      return { path: app.replace(home, '~'), version };
    }
  }
  return null;
};
const run = (cmd, a) => { try { return execFileSync(cmd, a, { encoding: 'utf8' }).trim(); } catch { return null; } };

// The folder ES-DE reads games from, from its own settings file.
function esdeRoms() {
  const file = path.join(expand(frontend.settings), frontend.config);
  if (!fs.existsSync(file)) return null;
  const v = fs.readFileSync(file, 'utf8').match(/<string name="ROMDirectory" value="([^"]*)"/)?.[1];
  return v ? v.replace(home, '~') : null;
}

const mac = (() => {
  try { return execFileSync('scutil', ['--get', 'ComputerName'], { encoding: 'utf8' }).trim(); }
  catch { return os.hostname().split('.')[0]; }
})();
// The drive, by its real path, so a save already on it is told from one on this Mac.
const driveReal = fs.realpathSync(drive);
const onDrive = (f) => { try { return fs.realpathSync(f).startsWith(`${driveReal}${path.sep}`); } catch { return false; } };
const out = path.join(drive, 'macs', mac);
fs.rmSync(out, { recursive: true, force: true });
const manifest = {
  mac, made: new Date().toISOString(), macos: run('sw_vers', ['-productVersion']), chip: run('uname', ['-m']),
  frontend: { name: frontend.name, app: appOf(frontend.apps), romDirectory: esdeRoms() }, emulators: [], files: [],
};

// Each place an emulator or retired app saves to: its setting in the app's
// settings file wins over its default.
function placesOf(where, homeDir, emulator) {
  const config = where.config && path.join(homeDir, where.config.file);
  return where.places.map((place) => {
    let dir = null;
    let from = 'default';
    if (place.key && config && fs.existsSync(config)) {
      try {
        const v = setting(config, where.config.format, place.key);
        if (v) { dir = path.resolve(homeDir, expand(v)); from = 'setting'; }
      } catch (e) { console.error(`  ${emulator}: could not read ${where.config.file}: ${e.message}`); }
    }
    if (!dir && place.path) dir = path.join(homeDir, place.path);
    return { place, dir, from };
  });
}

// Every folder an emulator saves to, so a retired app's folder holding them is not counted twice.
const gathered = [];
for (const [emulator, where] of Object.entries(macSaves)) {
  const homeDir = where.homes.map(expand).find((h) => fs.existsSync(h));
  const plays = Object.keys(systems).filter((s) => systems[s].emulator === emulator);
  // Installed is the app; a data folder can outlive it.
  const said = { emulator, systems: plays, app: appOf(where.apps), data: homeDir ? homeDir.replace(home, '~') : null, places: [], files: 0, size: 0 };
  manifest.emulators.push(said);
  if (!homeDir) continue;
  for (const [i, { place, dir, from }] of placesOf(where, homeDir, emulator).entries()) {
    if (dir) gathered.push(dir);
    said.places.push({ dir: dir ? dir.replace(home, '~') : null, from, found: Boolean(dir && fs.existsSync(dir)), files: 0 });
    if (!dir || !fs.existsSync(dir)) continue;
    const include = place.include ? new RegExp(place.include) : null;
    for (const f of walk(dir)) {
      const rel = path.relative(dir, f);
      if (include && !include.test(`/${rel}`) && !include.test(rel)) continue;
      const st = fs.statSync(f);
      if (st.size >= 50e6) continue;
      said.files++;
      said.size += st.size;
      said.places.at(-1).files++;
      if (onDrive(f)) continue;
      const stored = path.join(emulator, String(i), rel);
      fs.mkdirSync(path.dirname(path.join(out, stored)), { recursive: true });
      fs.copyFileSync(f, path.join(out, stored));
      manifest.files.push({
        emulator, systems: plays, rel, stored, from: path.dirname(f), size: st.size,
        created: new Date(st.birthtimeMs).toISOString(), saved: new Date(st.mtimeMs).toISOString(),
      });
    }
  }
}

// A retired app: whether it is still here, and how many files each of its
// save folders holds, less another emulator's folder inside it.
for (const [emulator, where] of Object.entries(retired)) {
  const homeDir = where.homes.map(expand).find((h) => fs.existsSync(h));
  const said = { emulator, retired: true, systems: [], app: appOf(where.apps), data: homeDir ? homeDir.replace(home, '~') : null, places: [], files: 0, size: 0 };
  if (!said.app && !homeDir) continue;
  manifest.emulators.push(said);
  if (!homeDir) continue;
  const seen = new Set();
  for (const { dir, from } of placesOf(where, homeDir, emulator)) {
    if (!dir || seen.has(dir)) continue;
    seen.add(dir);
    const theirs = (f) => gathered.some((g) => f.startsWith(`${g}${path.sep}`));
    const files = fs.existsSync(dir) ? walk(dir).filter((f) => path.basename(f) !== '.DS_Store' && !theirs(f)) : [];
    said.places.push({ dir: dir.replace(home, '~'), from, found: files.length > 0, files: files.length });
    said.files += files.length;
    said.size += files.reduce((a, f) => a + fs.statSync(f).size, 0);
  }
}

fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(manifest, null, 1));
const f = manifest.frontend;
console.log(`${mac}, macOS ${manifest.macos}: ${f.name} ${f.app ? `${f.app.version ?? ''} installed` : 'not installed'}${f.romDirectory ? `, games from ${f.romDirectory}` : ''}`);
for (const e of manifest.emulators) {
  const app = `${e.retired ? 'retired, ' : ''}${e.app ? `${e.app.version ?? 'installed'}` : e.data ? 'app gone, data left' : 'not on this Mac'}`;
  const places = e.places.filter((p) => p.dir).map((p) => `${p.found ? `${p.files} from` : 'none at'} ${p.dir}${p.from === 'setting' ? ' (its setting)' : ''}`);
  console.log(`  ${e.emulator.padEnd(12)} ${app.padEnd(20)} ${places.join(', ')}`);
}
console.log(manifest.files.length ? `This Mac's report, and ${manifest.files.length} save files kept on it, are in ${out}.` : `This Mac's report is in ${out}.`);
console.log('Open Status in Chrome to save it.');
