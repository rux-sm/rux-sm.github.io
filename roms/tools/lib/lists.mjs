// The lists of known good copies, No-Intro's and Redump's, as libretro
// publishes them, read from the drive's `emulation/lists/` folder; and the
// matching of a scanned game against them.
//
// A file is matched by its SHA-1 when it can be, which names its exact
// version. A disc in a container the lists do not fingerprint is matched by
// what is inside it: a CHD by the tracks chdman extracts, an RVZ by the disc
// ID in its header. A 3DS game, whose lists fingerprint the encrypted
// cartridge, is matched by its product code.

import fs from 'node:fs';
import path from 'node:path';

export const LIST_FILES = {
  nes: ['no-intro/Nintendo - Nintendo Entertainment System'],
  snes: ['no-intro/Nintendo - Super Nintendo Entertainment System'],
  n64: ['no-intro/Nintendo - Nintendo 64'],
  gb: ['no-intro/Nintendo - Game Boy'],
  gbc: ['no-intro/Nintendo - Game Boy Color'],
  gba: ['no-intro/Nintendo - Game Boy Advance'],
  nds: ['no-intro/Nintendo - Nintendo DS', 'no-intro/Nintendo - Nintendo DSi'],
  n3ds: ['no-intro/Nintendo - Nintendo 3DS', 'no-intro/Nintendo - New Nintendo 3DS'],
  gc: ['redump/Nintendo - GameCube'],
  wii: ['redump/Nintendo - Wii'],
  ps2: ['redump/Sony - PlayStation 2'],
  psx: ['redump/Sony - PlayStation'],
};

// One clrmamepro file as its games, each with its roms.
function parse(text) {
  const games = [];
  const field = (block, key) => block.match(new RegExp(`^\\s*${key} "((?:[^"\\\\]|\\\\.)*)"`, 'm'))?.[1];
  for (const m of text.matchAll(/^game \(\n([\s\S]*?)^\)/gm)) {
    const block = m[1];
    const roms = [...block.matchAll(/rom \( name "((?:[^"\\]|\\.)*)" size (\d+)(?: crc (\w+))?(?: md5 (\w+))?(?: sha1 (\w+))?/g)]
      .map(r => ({ name: r[1], size: Number(r[2]), crc32: r[3]?.toLowerCase(), md5: r[4]?.toLowerCase(), sha1: r[5]?.toLowerCase() }));
    games.push({ name: field(block, 'name'), region: field(block, 'region'), serial: field(block, 'serial'), roms });
  }
  return games;
}

// Every list the drive holds for each system, indexed for matching.
export function loadLists(listsDir) {
  const out = {};
  for (const [system, files] of Object.entries(LIST_FILES)) {
    const games = [];
    const used = [];
    for (const f of files) {
      const p = path.join(listsDir, `${path.basename(f)}.dat`);
      if (!fs.existsSync(p)) continue;
      const text = fs.readFileSync(p, 'utf8');
      used.push({ list: path.basename(f), version: text.match(/^\s*version "([^"]+)"/m)?.[1] ?? null });
      games.push(...parse(text));
    }
    if (!games.length) continue;
    const bySha1 = new Map();
    const bySerial = new Map();
    for (const g of games) {
      for (const r of g.roms) if (r.sha1) bySha1.set(r.sha1, { game: g, rom: r });
      for (const s of String(g.serial ?? '').split(/,\s*/).filter(Boolean)) {
        if (!bySerial.has(s)) bySerial.set(s, []);
        bySerial.get(s).push(g);
      }
    }
    out[system] = { used, games, bySha1, bySerial };
  }
  return out;
}

const tagsOf = name => [...String(name).matchAll(/\(([^)]+)\)/g)].map(m => m[1]);
const revOf = name => {
  const t = tagsOf(name).find(x => /^Rev \w+$/.test(x));
  return t ? (Number.parseInt(t.slice(4), 36) || 0) : 0;
};
const discOf = name => Number(tagsOf(name).find(x => /^Disc \d+$/.test(x))?.slice(5) ?? 1);
// A title without its tags, for finding other versions of the same game.
export const baseOf = name => String(name).replace(/\s*\([^)]*\)/g, '').replace(/\s*\[[^\]]*\]/g, '').trim();
const stemOf = name => path.basename(name).replace(/\.[^.]+$/, '');

// One file's match: the list entry it is, and how that was found.
function matchFile(file, list) {
  const h = file.header ?? {};
  if (file.ext === 'cue' || file.ext === 'm3u') return null;
  if (file.sha1 && list.bySha1.has(file.sha1)) {
    const { game, rom } = list.bySha1.get(file.sha1);
    return { name: game.name, file: rom.name, by: 'fingerprint' };
  }
  // A CHD's tracks, as chdman extracted them: every track must be one game's.
  if (file.inner?.length) {
    const hits = file.inner.map(s => list.bySha1.get(s));
    if (hits.every(Boolean) && new Set(hits.map(x => x.game.name)).size === 1) {
      return { name: hits[0].game.name, file: `${hits[0].game.name}.${file.ext}`, by: 'fingerprint inside' };
    }
  }
  // A GameCube or Wii disc by the ID in its header, its disc and its revision.
  if (h.discId) {
    const id4 = h.discId.slice(0, 4);
    const candidates = list.games.filter(g => String(g.serial ?? '').split('-').includes(id4)
      && discOf(g.name) === (h.discNumber ?? 1) && revOf(g.name) === (h.revision ?? 0));
    const pick = candidates.find(g => g.name === stemOf(file.name)) ?? (candidates.length === 1 ? candidates[0] : null);
    if (pick) return { name: pick.name, file: `${pick.name}.${file.ext}`, by: 'disc ID' };
  }
  // A 3DS game by its product code, or a disc by its serial.
  const serial = h.productCode || h.serial;
  if (serial && list.bySerial.has(serial)) {
    const candidates = list.bySerial.get(serial);
    const pick = candidates.find(g => g.name === stemOf(file.name)) ?? (candidates.length === 1 ? candidates[0] : null);
    if (pick) return { name: pick.name, file: `${pick.name}.${file.ext}`, by: h.productCode ? 'product code' : 'serial' };
  }
  return null;
}

// A game's match: each file's, whether all were found, whether each file
// carries the list's name, and the newer revisions the list knows of.
export function matchGame(game, lists) {
  const list = lists[game.system];
  if (!list || game.folder) return null;
  const files = game.files.filter(f => f.ext !== 'cue' && f.ext !== 'm3u');
  for (const f of game.files) f.match = matchFile(f, list);
  const matched = files.filter(f => f.match);
  const names = [...new Set(matched.map(f => f.match.name))];
  const renames = matched.filter(f => path.basename(f.name) !== f.match.file)
    .map(f => ({ from: f.name, to: path.join(path.dirname(f.name), f.match.file) }));
  // The newer revisions of the same release: every tag the same but the
  // revision, so a re-release or a collection is not counted as one.
  const better = [];
  const sameRelease = (a, b) => tagsOf(a).filter(t => !/^Rev \w+$/.test(t)).join('|')
    === tagsOf(b).filter(t => !/^Rev \w+$/.test(t)).join('|');
  for (const n of names) {
    for (const g of list.games) {
      if (baseOf(g.name) === baseOf(n) && revOf(g.name) > revOf(n) && sameRelease(g.name, n)) better.push(g.name);
    }
  }
  // Discs the list knows of that the game lacks.
  const discs = new Set(names.map(discOf));
  const missingDiscs = names.length ? list.games
    .filter(g => names.some(n => baseOf(g.name) === baseOf(n) && tagsOf(g.name)[0] === tagsOf(n)[0]
      && revOf(g.name) === revOf(n)) && /\(Disc \d+\)/.test(g.name) && !discs.has(discOf(g.name)))
    .map(g => g.name) : [];
  return {
    listed: files.length > 0 && matched.length === files.length,
    names,
    by: [...new Set(matched.map(f => f.match.by))],
    unmatched: files.filter(f => !f.match).map(f => f.name),
    renames,
    better: [...new Set(better)],
    missingDiscs: [...new Set(missingDiscs)],
  };
}

// A Switch game against blawar's titledb versions list, `switch-versions.json`
// in the lists folder: a game the list knows is listed, and an update newer
// than the one beside it on the drive is a newer version.
export function loadSwitchVersions(listsDir) {
  const p = path.join(listsDir, 'switch-versions.json');
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
}

export function matchSwitch(game, versions) {
  if (!versions || !game.titleId) return null;
  const known = versions[game.titleId.toLowerCase()];
  const have = Math.max(0, ...(game.extras ?? []).filter(x => x.kind === 'update').map(x => x.version));
  const latest = known ? Math.max(0, ...Object.keys(known).map(Number)) : 0;
  return {
    listed: Boolean(known),
    names: known ? [game.title] : [],
    by: known ? ['title ID'] : [],
    unmatched: known ? [] : game.files.map(f => f.name),
    renames: [],
    better: latest > have ? [`Update v${latest} (${known[latest]}), the drive has ${have ? `v${have}` : 'no update'}`] : [],
    missingDiscs: [],
  };
}

// libretro's system list, `System.dat`: the BIOS files it fingerprints, by SHA-1.
export function loadBiosList(listsDir) {
  const p = path.join(listsDir, 'System.dat');
  if (!fs.existsSync(p)) return null;
  const bySha1 = new Map();
  for (const g of parse(fs.readFileSync(p, 'utf8'))) for (const r of g.roms) if (r.sha1) bySha1.set(r.sha1, `${g.name}: ${r.name}`);
  return bySha1;
}
