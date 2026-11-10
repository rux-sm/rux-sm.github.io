#!/usr/bin/env node
// Puts the collection in order, from the newest scan:
//
//   node roms/tools/organize-roms.mjs "/Volumes/<drive>/emulation"          what it would do
//   node roms/tools/organize-roms.mjs "/Volumes/<drive>/emulation" --yes    do it
//
// - A PlayStation game on BIN and CUE becomes one CHD per disc, and a
//   PlayStation 2 ISO a CHD, each named by the list; a game on more than one
//   disc gets an .m3u playlist beside its discs.
// - Every other file the list names differently is renamed to the list's name,
//   and so is a save under `<emulation>/saves/<system>/` named after it,
//   since an emulator that finds a save by the game's file name would lose it.
//   Each rename is kept in `scans/renames.json`, so Import moves the game's
//   notes with it.
// - Only a game whose every file is on the list is touched, so a bad copy is
//   never sealed into a new format or given a name it is not.
// - Nothing is deleted: a converted original moves to `<emulation>/to-delete/`,
//   for rux to empty once the new file plays. chdman checks each CHD it makes
//   before its original moves.
// - What a new CHD holds is written to fingerprints.json from the files it was
//   made from, so the next scan matches it without extracting it.
//
// Run scan-roms.mjs after it, so the scan describes the drive as it now is.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import scanner from '../scan.js';

const root = process.argv[2];
const yes = process.argv.includes('--yes');
const romsDir = path.join(root ?? '', 'roms');
const scansDir = path.join(root ?? '', 'scans');
if (!root || !fs.existsSync(romsDir) || !fs.existsSync(scansDir)) {
  console.error('usage: organize-roms.mjs <emulation folder holding roms/ and scans/> [--yes]');
  process.exit(1);
}
const newest = fs.readdirSync(scansDir).filter(f => /^scan_.*\.json$/.test(f)).sort().pop();
const scan = JSON.parse(fs.readFileSync(path.join(scansDir, newest), 'utf8'));
if (!scan.fingerprints || !Object.keys(scan.lists ?? {}).length) {
  console.error(`${newest} has no fingerprints or no list matches; run scan-roms.mjs with the lists first`);
  process.exit(1);
}
const cachePath = path.join(scansDir, 'fingerprints.json');
const cache = scanner.bySecond(JSON.parse(fs.readFileSync(cachePath, 'utf8')));
const trash = path.join(root, 'to-delete');

const abs = rel => path.join(romsDir, rel);
const EMULATORS = JSON.parse(fs.readFileSync(new URL('../emulators.json', import.meta.url), 'utf8')).systems;
const renamesPath = path.join(scansDir, 'renames.json');
const renames = fs.existsSync(renamesPath) ? JSON.parse(fs.readFileSync(renamesPath, 'utf8')) : [];
// A game's title, as the scan gives it: its file name less its track and disc.
const titleOf = rel => path.basename(rel).replace(/\.[^.]+$/, '').replace(/\s*\((Track|Disc) \d+\)/g, '').trim();
const stemOf = rel => path.basename(rel).replace(/\.[^.]+$/, '');
const walk = dir => (fs.existsSync(dir) ? fs.readdirSync(dir).filter(n => !n.startsWith('.')).flatMap(n => {
  const p = path.join(dir, n);
  return fs.statSync(p).isDirectory() ? walk(p) : [p];
}) : []);
// The saves of a game renamed from `from` to `to`, on a system whose
// emulator names a save after the game's file: each file named `from` plus
// its extensions becomes `to` plus the same.
const savesOf = (system, from) => (EMULATORS[system]?.saves === 'name' ? walk(path.join(root, 'saves', system)) : [])
  .filter(f => path.basename(f).startsWith(`${from}.`));
const gb = n => `${(n / 1e9).toFixed(1)} GB`;
const plan = [];
const skipped = [];

// A disc's CUE and the BINs it names.
const binsOf = (game, cue) => {
  const text = fs.readFileSync(abs(cue.name), 'latin1');
  const names = [...text.matchAll(/^\s*FILE\s+"(.+?)"/gim)].map(m => m[1]);
  return names.map(n => game.files.find(f => path.basename(f.name) === n)).filter(Boolean);
};
const playlistName = discName => discName.replace(/\s*\(Disc \d+\)/, '');

for (const game of scan.games) {
  const m = game.match;
  const formats = game.formats;
  const convertsPs1 = game.system === 'psx' && formats.includes('cue');
  const convertsPs2 = game.system === 'ps2' && formats.includes('iso');
  const needsRename = m?.renames?.length > 0;
  const needsPlaylist = game.system === 'psx' && (m?.names?.length ?? 0) > 1 && !formats.includes('m3u');
  if (!convertsPs1 && !convertsPs2 && !needsRename && !needsPlaylist) continue;
  if (!m?.listed) { skipped.push(`${game.system}/${game.title}: not every file is on the list`); continue; }

  const discs = [];
  if (convertsPs1) {
    for (const cue of game.files.filter(f => f.ext === 'cue')) {
      // The data track, the first, names the disc; audio tracks are on no list.
      const bins = binsOf(game, cue);
      const name = bins[0]?.match?.name;
      if (!name || bins.some(b => b.match && b.match.name !== name)) { skipped.push(`${cue.name}: its data track is not a listed disc`); continue; }
      discs.push(name);
      plan.push({ kind: 'chd', system: 'psx', tool: 'createcd', from: cue.name, out: `psx/${name}.chd`,
        originals: [cue, ...bins], inner: bins.map(b => b.sha1) });
    }
  } else if (convertsPs2) {
    for (const iso of game.files.filter(f => f.ext === 'iso')) {
      discs.push(iso.match.name);
      plan.push({ kind: 'chd', system: 'ps2', tool: 'createdvd', from: iso.name, out: `ps2/${iso.match.name}.chd`,
        originals: [iso], inner: [iso.sha1] });
    }
  } else {
    for (const r of m.renames) {
      plan.push({ kind: 'rename', from: r.from, out: r.to });
      const [from, to] = [stemOf(r.from), stemOf(r.to)];
      for (const f of savesOf(game.system, from)) {
        plan.push({ kind: 'save', path: f, out: path.join(path.dirname(f), to + path.basename(f).slice(from.length)) });
      }
    }
    discs.push(...m.names);
  }
  if (game.system === 'psx' && discs.length > 1 && !formats.includes('m3u')) {
    plan.push({ kind: 'm3u', out: `psx/${playlistName(discs[0])}.m3u`, discs: discs.sort().map(d => `${d}.chd`) });
  }
}

const totalIn = plan.filter(p => p.kind === 'chd').flatMap(p => p.originals).reduce((a, f) => a + f.size, 0);
console.log(`${newest}: ${plan.filter(p => p.kind === 'chd').length} discs to convert (${gb(totalIn)}), `
  + `${plan.filter(p => p.kind === 'rename').length} files to rename, ${plan.filter(p => p.kind === 'save').length} saves to rename, `
  + `${plan.filter(p => p.kind === 'm3u').length} playlists`);
for (const p of plan) {
  const from = p.from ?? (p.path && path.relative(root, p.path));
  const out = p.kind === 'save' ? path.relative(root, p.out) : p.out;
  console.log(`  ${p.kind.padEnd(6)} ${from ?? ''}${from ? '\n         → ' : ''}${out}`);
}
for (const s of skipped) console.log(`  skip   ${s}`);
if (!yes) { console.log('\nNothing changed. Run again with --yes to do it.'); process.exit(0); }

const saveCache = () => fs.writeFileSync(cachePath, JSON.stringify(cache));
const moveToTrash = rel => {
  const to = path.join(trash, rel);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.renameSync(abs(rel), to);
};
let done = 0;
for (const p of plan) {
  const out = p.kind === 'save' ? p.out : abs(p.out);
  if (fs.existsSync(out) && p.kind !== 'm3u') { console.log(`  exists, left: ${p.out}`); continue; }
  if (p.kind === 'save') {
    fs.renameSync(p.path, out);
  } else if (p.kind === 'rename') {
    fs.renameSync(abs(p.from), out);
    const system = p.from.split('/')[0];
    const [from, to] = [titleOf(p.from), titleOf(p.out)];
    if (from !== to && !renames.some(r => r.system === system && r.from === from && r.to === to)) {
      renames.push({ at: new Date().toISOString(), system, from, to });
      fs.writeFileSync(renamesPath, JSON.stringify(renames, null, 1));
    }
  } else if (p.kind === 'm3u') {
    fs.writeFileSync(out, p.discs.join('\n') + '\n');
  } else {
    const t = Date.now();
    try {
      execFileSync('chdman', [p.tool, '-i', abs(p.from), '-o', out], { stdio: ['ignore', 'ignore', 'inherit'] });
      execFileSync('chdman', ['verify', '-i', out], { stdio: ['ignore', 'ignore', 'inherit'] });
    } catch (e) {
      fs.rmSync(out, { force: true });
      console.log(`  FAILED ${p.from}: ${e.message}`);
      continue;
    }
    const st = fs.statSync(out);
    cache[scanner.fingerprintKey(path.relative(root, out), st.size, st.mtimeMs)] = { inner: p.inner };
    for (const f of p.originals) moveToTrash(f.name);
    saveCache();
    console.log(`  made   ${p.out} (${gb(st.size)} from ${gb(p.originals.reduce((a, f) => a + f.size, 0))}, ${Math.round((Date.now() - t) / 1000)}s)`);
  }
  done++;
}
saveCache();
console.log(`${done} of ${plan.length} done. Originals are in ${trash}. Run scan-roms.mjs next.`);
