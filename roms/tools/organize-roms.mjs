#!/usr/bin/env node
// Puts the collection in order, from the newest scan:
//
//   node roms/tools/organize-roms.mjs "/Volumes/<drive>/emulation"          what it would do
//   node roms/tools/organize-roms.mjs "/Volumes/<drive>/emulation" --yes    do it
//
// - A PlayStation game on BIN and CUE becomes one CHD per disc, and a
//   PlayStation 2 ISO a CHD, each named by the list; a game on more than one
//   disc gets an .m3u playlist beside its discs.
// - Every other file the list names differently is renamed to the list's name.
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
const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
const trash = path.join(root, 'to-delete');

const abs = rel => path.join(romsDir, rel);
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
      const bins = binsOf(game, cue);
      const name = bins[0]?.match?.name;
      if (!name || bins.some(b => b.match?.name !== name)) { skipped.push(`${cue.name}: its tracks are not one listed disc`); continue; }
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
    for (const r of m.renames) plan.push({ kind: 'rename', from: r.from, out: r.to });
    discs.push(...m.names);
  }
  if (game.system === 'psx' && discs.length > 1 && !formats.includes('m3u')) {
    plan.push({ kind: 'm3u', out: `psx/${playlistName(discs[0])}.m3u`, discs: discs.sort().map(d => `${d}.chd`) });
  }
}

const totalIn = plan.filter(p => p.kind === 'chd').flatMap(p => p.originals).reduce((a, f) => a + f.size, 0);
console.log(`${newest}: ${plan.filter(p => p.kind === 'chd').length} discs to convert (${gb(totalIn)}), `
  + `${plan.filter(p => p.kind === 'rename').length} files to rename, ${plan.filter(p => p.kind === 'm3u').length} playlists`);
for (const p of plan) console.log(`  ${p.kind.padEnd(6)} ${p.from ?? ''}${p.from ? '\n         → ' : ''}${p.out}`);
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
  const out = abs(p.out);
  if (fs.existsSync(out) && p.kind !== 'm3u') { console.log(`  exists, left: ${p.out}`); continue; }
  if (p.kind === 'rename') {
    fs.renameSync(abs(p.from), out);
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
    cache[`${path.relative(root, out)}|${st.size}|${Math.floor(st.mtimeMs)}`] = { inner: p.inner };
    for (const f of p.originals) moveToTrash(f.name);
    saveCache();
    console.log(`  made   ${p.out} (${gb(st.size)} from ${gb(p.originals.reduce((a, f) => a + f.size, 0))}, ${Math.round((Date.now() - t) / 1000)}s)`);
  }
  done++;
}
saveCache();
console.log(`${done} of ${plan.length} done. Originals are in ${trash}. Run scan-roms.mjs next.`);
