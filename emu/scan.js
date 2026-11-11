/* ==========================================================================
   scan.js — reading the collection on the drive
   --------------------------------------------------------------------------
   One scan, run by emu/tools/scan-roms.mjs on a Mac and by the Status page
   in Chrome, so the two never read a game differently. It reads every game
   under the drive's `roms/`, its headers and fingerprints, matches each
   against the lists of known good copies in `lists/`, and matches each save
   under `saves/` to its game by saves-rules.js.

   It reads the drive only through `drive`, which each side supplies, every
   path relative to the drive's emulation folder and joined by `/`:
     list(rel)           the visible entries of a folder, sorted, as
                         { name, dir, size, mtimeMs, birthtimeMs }, or []
     read(rel, at, n)    n bytes from offset `at`, as a Uint8Array
     chunks(rel)         the whole file, as Uint8Arrays in order
     text(rel, enc)      the file as text, 'utf8' or 'latin1', or null
     exists(rel)         whether a file is there
     hasher()            { update(bytes), digest() → { crc32, md5, sha1 } },
                         or a promise of one
     inside(rel)         a CHD's track fingerprints, or null where it cannot
     progress(read, all) told now and then how many new bytes are hashed

   It returns the scan, the fingerprints to keep, and the files the backup
   zip packs; writing them is the caller's.

   Fingerprints are kept by path, size and time, so a scan hashes only new
   or changed files. A CHD's content fingerprints, which the lists match,
   come from what the organize tool kept when it made the CHD, or `inside`.

   The lists are No-Intro's and Redump's, as libretro publishes them. A file
   is matched by its SHA-1 when it can be, which names its exact version. A
   disc in a container the lists do not fingerprint is matched by what is
   inside it: a CHD by its data track, an RVZ by the disc ID in its header.
   A 3DS game, whose lists fingerprint the encrypted cartridge, is matched by
   its product code. libretro's Redump lists hold each disc's data track
   alone, the first; a PlayStation disc's audio tracks are on no list, so
   they neither match nor count against a game.
   ========================================================================== */
(root => {
  'use strict';

  // ---- paths and bytes ----------------------------------------------------

  const join = (...p) => p.filter(x => x && x !== '.').join('/');
  const base = p => String(p).split('/').pop();
  const dirOf = p => { const i = String(p).lastIndexOf('/'); return i < 0 ? '.' : p.slice(0, i); };
  const extOf = p => { const b = base(p); const i = b.lastIndexOf('.'); return i > 0 ? b.slice(i + 1) : ''; };

  const u16le = (b, i) => b[i] | (b[i + 1] << 8);
  const u32le = (b, i) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;
  const u32be = (b, i) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
  const u64le = (b, i) => (BigInt(u32le(b, i + 4)) << 32n) | BigInt(u32le(b, i));
  const hex = b => Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
  // Each byte as the character of the same number, as Node's latin1 reads it.
  const latin1 = b => { let s = ''; for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode(...b.subarray(i, i + 8192)); return s; };
  // A header's text ends at its first NUL; a Game Boy Color title is padded
  // with NULs before the maker code that shares its bytes.
  const ascii = b => latin1(b).split('\0')[0].trim();

  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  const crc32 = (b, crc = 0) => {
    let c = ~crc >>> 0;
    for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
    return ~c >>> 0;
  };

  // ---- headers, one reader per kind of file -------------------------------

  async function nes(drive, f) {
    const h = await drive.read(f, 0, 16);
    if (latin1(h.subarray(0, 4)) !== 'NES\x1a') return { header: 'none' };
    const nes2 = (h[7] & 0x0c) === 0x08;
    return {
      header: nes2 ? 'NES 2.0' : 'iNES',
      mapper: (h[6] >> 4) | (h[7] & 0xf0) | (nes2 ? (h[8] & 0x0f) << 8 : 0),
      prgKiB: h[4] * 16,
      chrKiB: h[5] * 8,
      battery: Boolean(h[6] & 0x02),
    };
  }

  async function gameboy(drive, f) {
    const h = await drive.read(f, 0x134, 0x1c);
    let x = 0;
    for (let i = 0; i <= 0x18; i++) x = (x - h[i] - 1) & 0xff;
    return {
      internalTitle: ascii(h.subarray(0, h[0x0f] & 0x80 ? 15 : 16)),
      color: h[0x0f] === 0xc0 ? 'GBC only' : h[0x0f] === 0x80 ? 'GBC enhanced' : 'GB',
      version: h[0x18],
      headerChecksum: x === h[0x19] ? 'ok' : 'bad',
    };
  }

  async function gba(drive, f) {
    const h = await drive.read(f, 0xa0, 0x20);
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

  async function nds(drive, f) {
    const h = await drive.read(f, 0, 0x160);
    return {
      internalTitle: ascii(h.subarray(0, 12)),
      gameCode: ascii(h.subarray(12, 16)),
      version: h[0x1e],
      dsi: h[0x12] & 0x02 ? 'DSi enhanced or only' : 'DS',
      headerChecksum: crc16(h.subarray(0, 0x15e)) === u16le(h, 0x15e) ? 'ok' : 'bad',
    };
  }

  // The N64 boot checksum, by the boot chip the cartridge was made for.
  const CIC = { 0x6170a4a1: '6101', 0x90bb6cb5: '6102', 0x0b050ee0: '6103', 0x98bc2c86: '6105', 0xacc8580a: '6106', 0x009e9ea3: '7102' };
  const SEED = { 6101: 0xf8ca4ddc, 6102: 0xf8ca4ddc, 7102: 0xf8ca4ddc, 6103: 0xa3886759, 6105: 0xdf26f436, 6106: 0x1fea617a };

  async function n64(drive, f) {
    const head = await drive.read(f, 0, 0x101000);
    const magic = u32be(head, 0);
    const order = { 0x80371240: 'z64', 0x37804012: 'v64', 0x40123780: 'n64' }[magic] || 'unknown';
    const out = {
      byteOrder: order,
      internalTitle: ascii(head.subarray(0x20, 0x34)),
      gameCode: ascii(head.subarray(0x3b, 0x3f)),
      version: head[0x3f],
    };
    if (order !== 'z64' || head.length < 0x101000) return out;
    const cic = CIC[crc32(head.subarray(0x40, 0x1000))];
    out.cic = cic || 'unknown';
    if (!cic) return out;
    const u = n => n >>> 0;
    let t1, t2, t3, t4, t5, t6;
    t1 = t2 = t3 = t4 = t5 = t6 = SEED[cic];
    for (let i = 0x1000; i < 0x101000; i += 4) {
      const d = u32be(head, i);
      if (u(t6 + d) < t6) t4 = u(t4 + 1);
      t6 = u(t6 + d);
      t3 = u(t3 ^ d);
      const s = d & 0x1f;
      const r = u((d << s) | (s ? d >>> (32 - s) : 0));
      t5 = u(t5 + r);
      t2 = t2 > d ? u(t2 ^ r) : u(t2 ^ t6 ^ d);
      t1 = cic === '6105' ? u(t1 + (u32be(head, 0x0750 + (i & 0xff)) ^ d)) : u(t1 + (t5 ^ d));
    }
    let c1, c2;
    if (cic === '6103') { c1 = u((t6 ^ t4) + t3); c2 = u((t5 ^ t2) + t1); }
    else if (cic === '6106') { c1 = u(Math.imul(t6, t4) + t3); c2 = u(Math.imul(t5, t2) + t1); }
    else { c1 = u(t6 ^ t4 ^ t3); c2 = u(t5 ^ t2 ^ t1); }
    out.headerChecksum = c1 === u32be(head, 0x10) && c2 === u32be(head, 0x14) ? 'ok' : 'bad';
    return out;
  }

  async function snes(drive, f, size) {
    const copier = size % 1024 === 512 ? 512 : 0;
    const out = { copierHeader: Boolean(copier) };
    // The internal header is where its checksum and complement add up.
    for (const [layout, at] of [['LoROM', 0x7fc0], ['HiROM', 0xffc0], ['ExHiROM', 0x40ffc0]]) {
      if (copier + at + 0x20 > size) continue;
      const h = await drive.read(f, copier + at, 0x20);
      const complement = u16le(h, 0x1c);
      const checksum = u16le(h, 0x1e);
      if ((complement ^ checksum) !== 0xffff) continue;
      out.layout = layout;
      out.internalTitle = ascii(h.subarray(0, 21));
      out.version = h[0x1b];
      out.headerChecksum = snesSum(await drive.read(f, copier, size - copier)) === checksum ? 'ok' : 'bad';
      return out;
    }
    out.layout = 'unknown';
    return out;
  }

  // SNES checksum: a size that is not a power of two is summed as if its
  // last part were repeated to fill the next one.
  function snesSum(data) {
    const sum = b => b.reduce((a, x) => a + x, 0);
    let p = 1;
    while (p * 2 <= data.length) p *= 2;
    let total = sum(data.subarray(0, p));
    const rest = data.subarray(p);
    if (rest.length) total += sum(rest) * (p / rest.length);
    return total & 0xffff;
  }

  async function n3ds(drive, f) {
    const h = await drive.read(f, 0x100, 0x10);
    if (latin1(h.subarray(0, 4)) !== 'NCSD') return { header: 'not NCSD' };
    const n = await drive.read(f, 0x4000, 0x200);
    return {
      titleId: u64le(h, 8).toString(16).padStart(16, '0'),
      productCode: ascii(n.subarray(0x150, 0x160)),
      encrypted: !(n[0x18f] & 0x04),
    };
  }

  async function rvz(drive, f) {
    const magic = ascii(await drive.read(f, 0, 4));
    const d = await drive.read(f, 0x58, 8);
    return { container: magic, discId: ascii(d.subarray(0, 6)), discNumber: d[6] + 1, revision: d[7] };
  }

  async function chd(drive, f) {
    const h = await drive.read(f, 0, 124);
    if (ascii(h.subarray(0, 8)) !== 'MComprHD') return { header: 'not CHD' };
    const version = u32be(h, 12);
    if (version !== 5) return { chdVersion: version };
    return { chdVersion: 5, rawSha1: hex(h.subarray(64, 84)), sha1: hex(h.subarray(84, 104)) };
  }

  // SYSTEM.CNF in the disc's ISO 9660 file system, for the disc's serial.
  async function discSerial(drive, f) {
    const sync = await drive.read(f, 0, 12);
    const raw = sync[0] === 0 && sync.subarray(1, 11).every(b => b === 0xff) && sync[11] === 0;
    const sectorSize = raw ? 2352 : 2048;
    const dataAt = raw ? ((await drive.read(f, 15, 1))[0] === 2 ? 24 : 16) : 0;
    const sector = n => drive.read(f, n * sectorSize + dataAt, 2048);
    const pvd = await sector(16);
    if (ascii(pvd.subarray(1, 6)) !== 'CD001') return null;
    const rootLba = u32le(pvd, 156 + 2);
    const rootLen = u32le(pvd, 156 + 10);
    for (let s = 0; s < Math.ceil(rootLen / 2048); s++) {
      const dir = await sector(rootLba + s);
      for (let i = 0; i < 2048 && dir[i];) {
        const len = dir[i];
        const name = latin1(dir.subarray(i + 33, i + 33 + dir[i + 32]));
        if (name.toUpperCase().startsWith('SYSTEM.CNF')) {
          const text = latin1(await sector(u32le(dir, i + 2)));
          // Real discs vary: `SLUS_011.15`, `SLUSP012.06`, one backslash or two.
          const m = text.match(/BOOT2?\s*=\s*cdrom0?:\\*([A-Z]{4})[_P-]?(\d{3})\.(\d{2})/i);
          return m ? `${m[1].toUpperCase()}-${m[2]}${m[3]}` : null;
        }
        i += len;
      }
    }
    return null;
  }

  async function cue(drive, f) {
    const tracks = [...(await drive.text(f, 'latin1') ?? '').matchAll(/^\s*FILE\s+"(.+?)"/gim)].map(m => m[1]);
    const missing = [];
    for (const t of tracks) if (!(await drive.exists(join(dirOf(f), t)))) missing.push(t);
    return { tracks: tracks.length, missingTracks: missing };
  }

  function switchName(name) {
    const id = name.match(/\[([0-9A-Fa-f]{16})\]/)?.[1]?.toUpperCase();
    const version = Number(name.match(/\[v(\d+)\]/)?.[1] ?? 0);
    if (!id) return {};
    const n = BigInt(`0x${id}`);
    const tail = n & 0xfffn;
    const kind = tail === 0n ? 'game' : tail === 0x800n ? 'update' : 'add-on';
    const b = kind === 'game' ? n : kind === 'update' ? n & ~0xfffn : (n & ~0xfffn) - 0x1000n;
    return { titleId: id, version, kind, baseTitleId: b.toString(16).toUpperCase().padStart(16, '0') };
  }

  async function wiiuMeta(drive, folder) {
    const xml = await drive.text(join(folder, 'meta', 'meta.xml'), 'utf8');
    if (xml == null) return {};
    const tag = t => xml.match(new RegExp(`<${t}[^>]*>([^<]*)</${t}>`))?.[1]?.trim();
    return { titleId: tag('title_id'), version: Number(tag('title_version') ?? 0), productCode: tag('product_code') };
  }

  const READERS = {
    nes, gb: gameboy, gbc: gameboy, gba, nds, z64: n64, v64: n64, n64,
    sfc: snes, smc: snes, '3ds': n3ds, cci: n3ds, rvz, chd,
  };

  async function headerOf(drive, f, ext, size) {
    try {
      if (ext === 'cue') return await cue(drive, f);
      if (READERS[ext]) return await READERS[ext](drive, f, size);
      if (ext === 'iso' || ext === 'bin') {
        const serial = await discSerial(drive, f);
        return serial ? { serial } : {};
      }
      return {};
    } catch (e) {
      return { readError: e.message };
    }
  }

  // ---- the lists of known good copies -------------------------------------

  const LIST_FILES = {
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
  async function loadLists(drive) {
    const out = {};
    for (const [system, files] of Object.entries(LIST_FILES)) {
      const games = [];
      const used = [];
      for (const f of files) {
        const text = await drive.text(join('lists', `${base(f)}.dat`), 'utf8');
        if (text == null) continue;
        used.push({ list: base(f), version: text.match(/^\s*version "([^"]+)"/m)?.[1] ?? null });
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
  const baseOf = name => String(name).replace(/\s*\([^)]*\)/g, '').replace(/\s*\[[^\]]*\]/g, '').trim();
  const stemOf = name => base(name).replace(/\.[^.]+$/, '');
  // A track the lists do not hold: a BIN named (Track 2) or later.
  const audioTrack = name => /\(Track 0*([2-9]|\d{2,})\)\.bin$/i.test(name);
  // What a disc's list name is without its disc number and what follows it.
  const discBaseOf = name => String(name).replace(/\s*\(Disc \d+\).*$/, '').trim();
  // The tags that make a release its own: all but region, languages and revision.
  const REGION = /^(USA|Europe|Japan|World|Canada|Korea|Asia|Australia|Brazil|Spain|France|Germany|Italy|Netherlands|Sweden|China)(, [A-Za-z]+)*$/;
  const releaseOf = name => [baseOf(name), ...tagsOf(name)
    .filter(t => !REGION.test(t) && !/^(En|Ja|Fr|De|Es|It|Nl|Pt|Sv|Ko|Zh)(,|$)/.test(t) && !/^Rev \w+$/.test(t) && !/^Disc \d+$/.test(t))].join(' | ');

  // One file's match: the list entry it is, and how that was found.
  function matchFile(file, list) {
    const h = file.header ?? {};
    if (file.ext === 'cue' || file.ext === 'm3u' || audioTrack(file.name)) return null;
    if (file.sha1 && list.bySha1.has(file.sha1)) {
      const { game, rom } = list.bySha1.get(file.sha1);
      return { name: game.name, file: rom.name, by: 'fingerprint', serial: game.serial };
    }
    // A CHD by its first track, the data track.
    if (file.inner?.length && list.bySha1.has(file.inner[0])) {
      const { game } = list.bySha1.get(file.inner[0]);
      return { name: game.name, file: `${game.name}.${file.ext}`, by: 'fingerprint inside', serial: game.serial };
    }
    // A GameCube or Wii disc by the ID in its header, its disc and its revision.
    if (h.discId) {
      const id4 = h.discId.slice(0, 4);
      const candidates = list.games.filter(g => String(g.serial ?? '').split('-').includes(id4)
        && discOf(g.name) === (h.discNumber ?? 1) && revOf(g.name) === (h.revision ?? 0));
      const pick = candidates.find(g => g.name === stemOf(file.name)) ?? (candidates.length === 1 ? candidates[0] : null);
      if (pick) return { name: pick.name, file: `${pick.name}.${file.ext}`, by: 'disc ID', serial: pick.serial };
    }
    // A 3DS game by its product code, or a disc by its serial.
    const serial = h.productCode || h.serial;
    if (serial && list.bySerial.has(serial)) {
      const candidates = list.bySerial.get(serial);
      const pick = candidates.find(g => g.name === stemOf(file.name)) ?? (candidates.length === 1 ? candidates[0] : null);
      if (pick) return { name: pick.name, file: `${pick.name}.${file.ext}`, by: h.productCode ? 'product code' : 'serial', serial: pick.serial };
    }
    return null;
  }

  // The newer discs of one set as the set once: its name, revision and discs.
  const discSet = names => {
    if (names.length < 2 || !names.every(n => /\(Disc \d+\)/.test(n))) return names;
    const rev = n => tagsOf(n).find(t => /^Rev \w+$/.test(t));
    if (new Set(names.map(discBaseOf)).size > 1 || new Set(names.map(rev)).size > 1) return names;
    return [`${discBaseOf(names[0])}${rev(names[0]) ? ` (${rev(names[0])})` : ''}, ${names.length} discs`];
  };

  // A game's match: each file's, whether all were found, whether each file
  // carries the list's name, its serials as the list gives them, and the
  // newest revision the list knows of, since an older one is not worth getting.
  function matchGame(game, lists) {
    const list = lists[game.system];
    if (!list || game.folder) return null;
    const files = game.files.filter(f => f.ext !== 'cue' && f.ext !== 'm3u' && !audioTrack(f.name));
    for (const f of game.files) f.match = matchFile(f, list);
    const matched = files.filter(f => f.match);
    const names = [...new Set(matched.map(f => f.match.name))];
    const renames = matched.filter(f => base(f.name) !== f.match.file)
      .map(f => ({ from: f.name, to: join(dirOf(f.name), f.match.file) }));
    // The newest revision of the same release: every tag the same but the
    // revision, so a re-release or a collection is not counted as one.
    const better = [];
    const sameRelease = (a, b) => tagsOf(a).filter(t => !/^Rev \w+$/.test(t)).join('|')
      === tagsOf(b).filter(t => !/^Rev \w+$/.test(t)).join('|');
    for (const n of names) {
      const newer = list.games.filter(g => baseOf(g.name) === baseOf(n) && revOf(g.name) > revOf(n) && sameRelease(g.name, n));
      if (newer.length) better.push(newer.reduce((a, g) => (revOf(g.name) > revOf(a.name) ? g : a)).name);
    }
    // Discs the list knows of that the game lacks: the same name before its
    // disc number, another disc number.
    const discs = new Set(names.map(discOf));
    const bases = new Set(names.filter(n => /\(Disc \d+\)/.test(n)).map(discBaseOf));
    const missingDiscs = bases.size ? list.games
      .filter(g => /\(Disc \d+\)/.test(g.name) && bases.has(discBaseOf(g.name)) && !discs.has(discOf(g.name)))
      .map(g => g.name) : [];
    return {
      listed: files.length > 0 && matched.length === files.length,
      names,
      by: [...new Set(matched.map(f => f.match.by))],
      // A list may name a disc by more than one serial, joined by commas.
      serials: [...new Set(matched.flatMap(f => String(f.match.serial ?? '').split(/,\s*/)).filter(Boolean))],
      unmatched: files.filter(f => !f.match).map(f => f.name),
      renames,
      better: discSet([...new Set(better)]),
      missingDiscs: [...new Set(missingDiscs)],
    };
  }

  // A Switch game against blawar's titledb versions list, `switch-versions.json`
  // in the lists folder: a game the list knows is listed, and an update newer
  // than the one beside it on the drive is a newer version.
  async function loadSwitchVersions(drive) {
    const text = await drive.text('lists/switch-versions.json', 'utf8');
    return text == null ? null : JSON.parse(text);
  }

  function matchSwitch(game, versions) {
    if (!versions || !game.titleId) return null;
    const known = versions[game.titleId.toLowerCase()];
    const have = Math.max(0, ...(game.extras ?? []).filter(x => x.kind === 'update').map(x => x.version));
    const latest = known ? Math.max(0, ...Object.keys(known).map(Number)) : 0;
    return {
      listed: Boolean(known),
      names: known ? [game.title] : [],
      by: known ? ['title ID'] : [],
      serials: [],
      unmatched: known ? [] : game.files.map(f => f.name),
      renames: [],
      better: latest > have ? [`Update v${latest} (${known[latest]}), the drive has ${have ? `v${have}` : 'no update'}`] : [],
      missingDiscs: [],
    };
  }

  // libretro's system list, `System.dat`: the BIOS files it fingerprints, by SHA-1.
  async function loadBiosList(drive) {
    const text = await drive.text('lists/System.dat', 'utf8');
    if (text == null) return null;
    const bySha1 = new Map();
    for (const g of parse(text)) for (const r of g.roms) if (r.sha1) bySha1.set(r.sha1, `${g.name}: ${r.name}`);
    return bySha1;
  }

  // ---- the scan -----------------------------------------------------------

  // A fingerprint is kept by the file's path, size and time to the second,
  // since Node and Chrome round a file's time to the millisecond apart.
  const fingerprintKey = (rel, size, mtimeMs) => `${rel}|${size}|${Math.floor(mtimeMs / 1000)}`;
  // Fingerprints kept by the time to the millisecond, as they once were, by the second.
  const bySecond = cache => {
    for (const k of Object.keys(cache)) {
      const m = k.match(/^(.*)\|(\d+)\|(\d{12,})$/);
      if (!m) continue;
      const to = fingerprintKey(m[1], m[2], Number(m[3]));
      cache[to] = { ...cache[k], ...cache[to] };
      delete cache[k];
    }
    return cache;
  };

  // Files a system folder holds that are not games.
  const SWITCH_EXTRAS = new Set(['mods', 'updates_dlc']);
  // Secrets that sit among the BIOS files: listed by name, never read.
  const SECRET = /\.keys$/i;
  // The tracks and discs of one game share its title.
  const titleOf = stem => stem.replace(/\s*\((Track|Disc) \d+\)/g, '').trim();
  const REGIONS = /^(USA|Europe|Japan|World|Canada|Korea|Asia|Australia|Brazil|Spain|France|Germany|Italy|Netherlands|Sweden|China)$/;
  // A BIOS the system list knows, by name, under that system's emulator's
  // folder in the list, since one small file can equal another system's.
  const BIOS_FOLDERS = { ps2: /^System: pcsx2\//, xbox: /^System: (xemu|xbox)\//i };

  // `cache` is the fingerprints kept from the last scan, by path, size and
  // date; `emulators` is emulators.json's systems; `headersOnly` skips hashing.
  async function scan(drive, { cache = {}, emulators, saveRules, headersOnly = false }) {
    bySecond(cache);
    const stats = new Map();
    const listOf = async dir => {
      const items = await drive.list(dir);
      for (const it of items) stats.set(join(dir, it.name), it);
      return items;
    };
    const walk = async dir => (await Promise.all((await listOf(dir))
      .map(it => (it.dir ? walk(join(dir, it.name)) : [join(dir, it.name)])))).flat();
    const keyOf = f => { const st = stats.get(f); return fingerprintKey(f, st.size, st.mtimeMs); };

    let bytesRead = 0;
    let bytesTotal = 0;
    async function fingerprint(f) {
      const key = keyOf(f);
      // An entry may hold only what is inside a CHD, which the organize tool
      // knows from the files it was made from; the file is still read.
      if (cache[key]?.sha1) return cache[key];
      if (headersOnly) return null;
      const h = await drive.hasher();
      for await (const chunk of drive.chunks(f)) {
        h.update(chunk);
        bytesRead += chunk.length;
        drive.progress?.(bytesRead, bytesTotal);
      }
      const out = { ...cache[key], ...h.digest() };
      cache[key] = out;
      return out;
    }
    async function inside(f) {
      const key = keyOf(f);
      if (cache[key]?.inner) return cache[key].inner;
      if (headersOnly || !cache[key] || !drive.inside) return null;
      const inner = await drive.inside(f);
      if (inner) cache[key].inner = inner;
      return inner;
    }

    // ---- walking the drive
    const entries = [];
    const besideGames = [];
    for (const sys of await listOf('roms')) {
      if (!sys.dir) continue;
      const system = sys.name;
      for (const it of await listOf(join('roms', system))) {
        const p = join('roms', system, it.name);
        // A save an emulator wrote beside its game is a save, not a game.
        if (!it.dir && saveRules.SAVE_FILE.test(it.name)) { besideGames.push({ system, path: p }); continue; }
        if (system === 'switch' && SWITCH_EXTRAS.has(it.name)) {
          for (const f of await walk(p)) entries.push({ system, path: f, extra: it.name });
          continue;
        }
        entries.push({ system, path: p, isDir: it.dir });
      }
    }

    const biosFiles = await walk('bios');
    const toFingerprint = [];
    for (const e of entries) {
      if (e.isDir) toFingerprint.push(...await walk(e.path));
      else if (e.extra !== 'mods') toFingerprint.push(e.path);
    }
    toFingerprint.push(...biosFiles.filter(f => !SECRET.test(f)));
    for (const f of toFingerprint) if (!cache[keyOf(f)]?.sha1) bytesTotal += stats.get(f).size;

    async function fileRecord(f) {
      const st = stats.get(f);
      const ext = extOf(f).toLowerCase();
      return {
        name: f.slice('roms/'.length),
        ext,
        size: st.size,
        modified: new Date(st.mtimeMs).toISOString(),
        ...(await fingerprint(f)),
        ...(ext === 'chd' ? { inner: await inside(f) } : {}),
        header: await headerOf(drive, f, ext, st.size),
      };
    }

    const games = new Map();
    const extras = [];
    for (const e of entries) {
      if (e.extra) {
        if (e.extra === 'mods') { extras.push({ system: e.system, kind: 'mod', name: e.path.slice('roms/'.length) }); continue; }
        const rec = await fileRecord(e.path);
        extras.push({ system: e.system, ...switchName(base(e.path)), file: rec });
        continue;
      }
      const b = base(e.path);
      const ext = extOf(b);
      const stem = e.isDir || !ext ? b : b.slice(0, b.length - ext.length - 1);
      const title = titleOf(stem);
      const key = `${e.system}/${title}`;
      if (!games.has(key)) games.set(key, { system: e.system, title, files: [] });
      const game = games.get(key);
      if (e.isDir) {
        game.folder = true;
        Object.assign(game, await wiiuMeta(drive, e.path));
        for (const f of await walk(e.path)) game.files.push(await fileRecord(f));
      } else {
        game.files.push(await fileRecord(e.path));
        if (e.system === 'switch') Object.assign(game, switchName(b));
      }
    }

    const out = [...games.values()].map(g => {
      const tags = tagsOf(g.title);
      return {
        ...g,
        region: tags.find(t => t.split(', ').every(r => REGIONS.test(r)))
          ?? (/\[(US|USA)\]/.test(g.title) ? 'USA' : null),
        languages: tags.find(t => /^(En|Ja|Fr|De|Es|It|Nl|Pt|Sv|Ko|Zh)(,|$)/.test(t)) ?? null,
        revision: tags.find(t => /^(Rev \w+|v\d[\d.]*)$/.test(t)) ?? null,
        formats: [...new Set(g.files.map(f => f.ext))].sort(),
        size: g.files.reduce((a, f) => a + f.size, 0),
      };
    });
    // Switch updates and add-ons sit beside the game they belong to.
    for (const x of extras.filter(x => x.baseTitleId)) {
      const game = out.find(g => g.titleId === x.baseTitleId);
      if (game) (game.extras ??= []).push(x);
    }

    // ---- each game against the lists, where the drive holds them
    const lists = await loadLists(drive);
    const switchVersions = await loadSwitchVersions(drive);
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

    // ---- saves
    // Files in a folder not named for a system, from before each system had its
    // own, are matched against every system, and the rest listed to be moved.
    const unsorted = [];
    const saveFiles = [];
    const record = (f, name) => {
      const st = stats.get(f);
      return { name, size: st.size, created: new Date(st.birthtimeMs).toISOString(), saved: new Date(st.mtimeMs).toISOString() };
    };
    // A system whose emulator keeps its whole data folder here says by
    // `savesIn` which of its files are saves; the rest are not saves and stay
    // out of the backup zip.
    const notSave = f => {
      const [, sys, ...rest] = f.split('/');
      const only = emulators[sys]?.savesIn;
      return Boolean(only && !new RegExp(only).test(rest.join('/')));
    };
    // Ryujinx names a save folder by number under `bis/user/save`, and keeps
    // the game's title ID as the first eight bytes, little-endian, of the
    // `ExtraData0` beside it, so the save is matched as if under that ID.
    const titleIds = new Map();
    const withTitleId = async (dir, rel) => {
      const folder = rel.match(/^(.*?bis\/user\/save\/[0-9a-f]{16})\//i)?.[1];
      if (!folder) return rel;
      if (!titleIds.has(folder)) {
        const b = await drive.read(join(dir, folder, 'ExtraData0'), 0, 8).catch(() => null);
        titleIds.set(folder, b?.length === 8 ? u64le(b, 0).toString(16).padStart(16, '0') : null);
      }
      return titleIds.get(folder) ? `${titleIds.get(folder)}/${rel}` : rel;
    };
    const saveTops = await listOf('saves');
    for (const top of saveTops) {
      if (!top.dir) continue;
      const dir = join('saves', top.name);
      for (const f of await walk(dir)) {
        if (notSave(f)) continue;
        const rel = await withTitleId(dir, f.slice(dir.length + 1));
        const file = record(f, f.slice('saves/'.length));
        if (emulators[top.name]) { saveFiles.push({ rel, systems: saveRules.systemsOf(top.name, emulators), file }); continue; }
        const hit = saveRules.match(rel, Object.keys(emulators), out, emulators);
        if (hit.game) saveFiles.push({ rel, systems: [hit.system], file });
        else unsorted.push(file.name);
      }
    }
    for (const b of besideGames) {
      saveFiles.push({ rel: base(b.path), systems: [b.system], file: record(b.path, join('..', b.path)) });
    }
    const saves = saveRules.group(saveFiles, out, emulators);
    for (const g of out) g.hasSave = saves.some(s => s.system === g.system && s.game === g.title);

    // ---- originals waiting in to-delete
    // The organize tool moves a converted original here keeping its size and
    // date, so its fingerprint is still kept under its old path, and the CHD
    // made from it holds that fingerprint inside.
    const byInner = new Map();
    for (const g of out) for (const f of g.files) for (const sha of f.inner ?? []) byInner.set(sha, g);
    const trashFiles = (await walk('to-delete')).map(f => {
      const rel = f.slice('to-delete/'.length);
      const st = stats.get(f);
      const sha = cache[fingerprintKey(`roms/${rel}`, st.size, st.mtimeMs)]?.sha1;
      return { name: rel, size: st.size, game: sha ? byInner.get(sha) : null };
    });
    // A CUE goes with the disc whose tracks sit beside it.
    for (const t of trashFiles.filter(x => !x.game && x.name.endsWith('.cue'))) {
      const stem = t.name.replace(/\.cue$/i, '');
      t.game = trashFiles.find(x => x.game && x.name.replace(/(\s*\(Track \d+\))?\.bin$/i, '') === stem)?.game ?? null;
    }
    for (const t of trashFiles.filter(x => x.game)) (t.game.originals ??= []).push({ name: t.name, size: t.size });
    const toDelete = {
      size: trashFiles.reduce((a, t) => a + t.size, 0),
      files: trashFiles.length,
      unknown: trashFiles.filter(t => !t.game).map(({ name, size }) => ({ name, size })),
    };

    // ---- the record of renames and backups
    // The organize tool keeps every rename it made, so a save moves a renamed
    // game's notes; the Mac backup tool keeps each copy it made on a Mac.
    const readJson = async (rel, fallback) => { const t = await drive.text(rel, 'utf8'); return t == null ? fallback : JSON.parse(t); };
    const renames = await readJson('scans/renames.json', []);
    const backups = await readJson('backups.json', []);
    // Each emulator's installer, kept on the drive in case its download goes.
    const installers = (await listOf('emulators')).map(it => ({ name: it.name, size: it.size }));

    const bios = [];
    for (const f of biosFiles) {
      const rel = f.slice('bios/'.length);
      if (SECRET.test(f)) { bios.push({ name: rel, secret: true }); continue; }
      bios.push({ name: rel, size: stats.get(f).size, ...(await fingerprint(f)) });
    }
    // The system list knows few BIOS files, so no match is no fault.
    const biosList = await loadBiosList(drive);
    for (const b of bios) {
      const hit = biosList && b.sha1 ? biosList.get(b.sha1) : null;
      const folder = BIOS_FOLDERS[b.name.split('/')[0]];
      b.listedAs = hit && folder?.test(hit) ? hit : null;
    }

    // The saves, those beside their games too, and the BIOS and keys, which
    // the backup zip packs; a file of 50 MB or more, like the Switch
    // firmware, stays on the drive and the Macs.
    const packed = [...(await walk('saves')).filter(f => !notSave(f)), ...besideGames.map(b => b.path), ...biosFiles]
      .filter(f => stats.get(f).size < 50e6);

    return {
      scan: {
        scanned: new Date().toISOString(),
        fingerprints: !headersOnly,
        lists: listsUsed,
        games: out,
        unmatchedExtras: extras.filter(x => !x.baseTitleId || !out.some(g => g.titleId === x.baseTitleId)),
        bios,
        saves,
        unsortedSaves: unsorted,
        toDelete,
        renames,
        backups,
        backup: null,
        installers,
      },
      cache,
      packed,
      newBytes: bytesTotal,
      gamesWithoutLists: !Object.keys(lists).length,
    };
  }

  const api = { scan, crc32, fingerprintKey, bySecond, LIST_FILES, discBaseOf, releaseOf, baseOf };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Emu = Object.assign(root.Emu || {}, { scanner: api });
})(typeof window === 'object' ? window : globalThis);
