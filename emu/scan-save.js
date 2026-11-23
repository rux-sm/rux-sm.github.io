/* ==========================================================================
   scan-save.js — a scan saved to Supabase
   --------------------------------------------------------------------------
   The steps the home server's nightly scan, emu/tools/scan-roms.mjs, saves
   a scan by. `rowsOf` makes a scan's games and the server's saves into rows,
   `changes` says what differs from the rows saved, and `save` writes them.
   `givenChanged` says which BIOS, key, firmware and installer files the
   server holds that Supabase lacks or holds another copy of, and `putGiven`
   puts them there, an installer in place of its emulator's older one;
   `putFile` and `dropFile` are one file in and out of Supabase. `fetchArt`
   is a game's cover from libretro's thumbnails, `artChanged` says which
   covers the server keeps that Supabase lacks or no longer needs, and
   `putArt` puts and removes them. `putInfo` looks up each game `emu_info`
   lacks in libretro's database, `fetchFacts` and `factsOf`, and keeps its
   facts and description there.

   `save` writes through a `db` of four calls, which each side makes:
   `clientDb` from the signed-in account's Supabase client in the browser,
   `restDb` from a secret key and fetch alone on the server:
     rows(table, columns, match)   every row matching, those columns
     insert(table, row)            one row added
     upsert(table, rows, conflict) rows written over those with the same key
     update(table, values, match)  the rows matching changed
     remove(table, match)          the rows matching deleted
     upload(sha1, bytes)           bytes put in the collection's bucket
     unload(sha1)                  bytes taken out of it
   ========================================================================== */
(root => {
  'use strict';

  // Where a save in the server's saves folder is, as its row says.
  const DRIVE = 'drive';
  // The bucket of everything but the games, each file's bytes under their SHA-1; `emu_files` lists them.
  const COLLECTION = 'emu-collection';
  const key = g => `${g.system}/${g.title}`;
  const saveKey = s => `${s.system}/${s.name}/${s.kind}`;

  // A game from the scan as its row: the scan's own names, in the table's.
  const rowOf = (g, scanned) => ({
    system: g.system, title: g.title, region: g.region, languages: g.languages, revision: g.revision,
    formats: g.formats, size: g.size, has_save: Boolean(g.hasSave), folder: Boolean(g.folder),
    title_id: g.titleId ?? null, version: g.version ?? null, product_code: g.productCode ?? null,
    // A folder's thousand small files are counted, not each kept.
    files: g.folder ? g.files.map(({ name, size }) => ({ name, size })) : g.files,
    extras: g.extras ?? [], match: g.match ?? null, originals: g.originals ?? [], scanned_at: scanned,
  });
  // A save as its row, without its note, so writing it leaves rux's note.
  const saveRowOf = (s, scanned) => ({
    system: s.system, name: s.name, kind: s.kind, location: DRIVE, game: s.game, files: s.files, size: s.size,
    created_at: s.created, saved_at: s.saved, scanned_at: scanned,
  });

  // What a scan changes against the games and saves saved: games new, of
  // another size and gone, and the server's saves new and gone.
  function changes(scan, savedGames, savedSaves) {
    const before = new Map(savedGames.map(g => [key(g), g]));
    const now = new Set(scan.games.map(key));
    const onDrive = savedSaves.filter(s => s.location === DRIVE);
    const savesNow = new Set(scan.saves.map(saveKey));
    const had = new Set(onDrive.map(saveKey));
    return {
      added: scan.games.filter(g => !before.has(key(g))),
      changed: scan.games.filter(g => before.has(key(g)) && Number(before.get(key(g)).size) !== g.size),
      gone: savedGames.filter(g => !now.has(key(g))),
      savesNew: scan.saves.filter(s => !had.has(saveKey(s))),
      savesGone: onDrive.filter(s => !savesNow.has(saveKey(s))),
    };
  }

  // What `save` writes for a scan: its rows, the rows gone, the scan's row
  // and the organize tool's renames. `drive` is what the scan's row keeps
  // beyond the scan: the newest versions out.
  const rowsOf = (scan, { gone, savesGone }, drive) => ({
    games: scan.games.map(g => rowOf(g, scan.scanned)),
    gone,
    saves: scan.saves.map(s => saveRowOf(s, scan.scanned)),
    savesGone,
    drive: { to_delete: scan.toDelete, unsorted_saves: scan.unsortedSaves, newest: drive.newest ?? {}, scanned_at: scan.scanned },
    renames: scan.renames ?? [],
  });

  // A scan saved. A rename the organize tool made moves the game's notes
  // and its saves' notes first, so the scan's rows land on them. Then every
  // game and save in the scan is written, leaving each note as it is, the
  // ones no longer on the server are deleted, and the scan's row is
  // replaced. Rows go 100 at a time.
  async function save(db, { games, gone, saves, savesGone, drive, renames }) {
    const notes = await db.rows('emu_notes', 'system,title');
    const has = new Set(notes.map(n => `${n.system}/${n.title}`));
    for (const r of renames) {
      if (!has.has(`${r.system}/${r.from}`) || has.has(`${r.system}/${r.to}`)) continue;
      await db.update('emu_notes', { title: r.to }, { system: r.system, title: r.from });
      has.add(`${r.system}/${r.to}`);
    }
    const keys = await db.rows('emu_saves', 'system,name,kind,location');
    const saveKeys = new Set(keys.map(k => `${k.system}/${k.name}/${k.kind}/${k.location}`));
    const locations = [...new Set(keys.map(k => k.location))];
    for (const r of renames) {
      for (const kind of ['save', 'state', 'card']) {
        for (const location of locations) {
          if (!saveKeys.has(`${r.system}/${r.from}/${kind}/${location}`) || saveKeys.has(`${r.system}/${r.to}/${kind}/${location}`)) continue;
          await db.update('emu_saves', { name: r.to, game: r.to }, { system: r.system, name: r.from, kind, location });
          saveKeys.add(`${r.system}/${r.to}/${kind}/${location}`);
        }
      }
    }
    for (let i = 0; i < games.length; i += 100) await db.upsert('emu_games', games.slice(i, i + 100), 'system,title');
    for (const g of gone) await db.remove('emu_games', { system: g.system, title: g.title });
    for (let i = 0; i < saves.length; i += 100) await db.upsert('emu_saves', saves.slice(i, i + 100), 'system,name,kind,location');
    for (const s of savesGone) await db.remove('emu_saves', { system: s.system, name: s.name, kind: s.kind, location: s.location });
    await db.upsert('emu_scan', [{ id: 1, ...drive }], 'id');
  }

  // A file put in Supabase: its bytes under their fingerprint, read by
  // `bytes` only when no file there has the same, then a row for this copy.
  async function putFile(db, { path, sha1, size, saved, mac }, bytes) {
    if (!(await db.rows('emu_files', 'path', { sha1 })).length) await db.upload(sha1, await bytes());
    await db.insert('emu_files', { path, sha1, size, saved_at: saved, mac });
  }
  // A file taken out of Supabase with every copy kept of it, and its bytes
  // where no other file has the same.
  async function dropFile(db, path) {
    const rows = await db.rows('emu_files', 'sha1', { path });
    await db.remove('emu_files', { path });
    for (const sha1 of new Set(rows.map(r => r.sha1).filter(Boolean))) {
      if (!(await db.rows('emu_files', 'path', { sha1 })).length) await db.unload(sha1);
    }
  }

  // The files every Mac is given that a scan found, each BIOS, key, firmware
  // and installer, which the server holds that Supabase lacks or holds another
  // copy of: told by its size and the second it was last changed, since the
  // home server's share keeps a file's time no finer. `stat(path)` is the
  // file's { size, mtimeMs }, or null; `held` is emu_files_now's rows.
  const second = ms => Math.floor(ms / 1000);
  const same = (have, st) => Boolean(have) && Number(have.size) === st.size && second(Date.parse(have.saved_at)) === second(st.mtimeMs);
  const savedAt = st => new Date(Math.round(st.mtimeMs)).toISOString();
  async function givenChanged(scan, stat, held) {
    const heldAt = new Map(held.map(f => [f.path, f]));
    const out = [];
    for (const path of [...scan.bios.map(b => `bios/${b.name}`), ...scan.installers.map(i => `emulators/${i.name}`)]) {
      const st = await stat(path);
      if (!st || same(heldAt.get(path), st)) continue;
      out.push({ path, size: st.size, saved: savedAt(st) });
    }
    return out;
  }

  // Whether an installer's file name is that app's, by its name's letters and digits.
  const slug = name => name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const installs = (file, name) => slug(file).startsWith(slug(name));

  // Each of `files` put in Supabase from the server, `sha1Of(path)` and
  // `bytesOf(path)` reading it, as `mac` put it. A newer installer takes the
  // place of its emulator's older one; `names` are the apps installers are of.
  async function putGiven(db, files, { sha1Of, bytesOf, mac, names, told = () => {} }) {
    const of = path => names.find(n => installs(path.split('/').pop(), n));
    for (const [i, f] of files.entries()) {
      told(f, i);
      await putFile(db, { ...f, sha1: await sha1Of(f.path), mac }, () => bytesOf(f.path));
      if (!f.path.startsWith('emulators/') || !of(f.path)) continue;
      const others = (await db.rows('emu_files_now', 'path,sha1'))
        .filter(o => o.sha1 && o.path.startsWith('emulators/') && o.path !== f.path && of(o.path) === of(f.path));
      for (const old of others) await dropFile(db, old.path);
    }
  }

  // Box art is libretro's thumbnails on GitHub, one repository a system,
  // named as the system with _ for each space. Switch has none.
  const ART = {
    nes: 'Nintendo - Nintendo Entertainment System', snes: 'Nintendo - Super Nintendo Entertainment System',
    n64: 'Nintendo - Nintendo 64', gb: 'Nintendo - Game Boy', gbc: 'Nintendo - Game Boy Color',
    gba: 'Nintendo - Game Boy Advance', nds: 'Nintendo - Nintendo DS', n3ds: 'Nintendo - Nintendo 3DS',
    gc: 'Nintendo - GameCube', wii: 'Nintendo - Wii', wiiu: 'Nintendo - Wii U',
    psx: 'Sony - PlayStation', ps2: 'Sony - PlayStation 2', xbox: 'Microsoft - Xbox',
  };
  const ART_AT = 'https://raw.githubusercontent.com/libretro-thumbnails';
  const ART_LIST = 'https://api.github.com/repos/libretro-thumbnails';
  // A game's cover in Supabase is `art/<system>/<title>` and its picture's ending.
  const artKey = g => `art/${g.system}/${g.title}`;
  const PICTURE = /\.(png|jpe?g|webp)$/i;
  // The names a game's cover may have there: its list names, then its title,
  // then its title less the disc, so a multi-disc game finds one cover. Then
  // the plain USA release, whole or its first disc, and the World one, since a
  // list may name more regions or languages than the cover does.
  function artNames(g) {
    const names = [...(g.match?.names ?? []), g.title, g.title.replace(/ \(Disc \d+\)/, '')];
    if (/\((?:[^)]*, )?(?:USA|World)\b/.test(g.title)) {
      const plain = g.title.replace(/\s*[([][^)\]]*[)\]]/g, '').trim();
      names.push(...['(USA)', '(USA) (Disc 1)', '(World)'].map(tag => `${plain} ${tag}`));
    }
    return [...new Set(names)];
  }
  // Bumped when how a cover is looked for changes, so a game found none before
  // is asked about again at once.
  const ART_ASKING = 2;
  // A name with its tags, articles and punctuation gone, so a name written
  // another way is still the same name.
  const plainName = n => n.replace(/\.png$/i, '').replace(/\s*[([][^)\]]*[)\]]/g, '').toLowerCase()
    .replace(/, (?:the|an|a)(?= - |$)/, '').replace(/\b(?:the|an|a|and)\b/g, '').replace(/[^a-z0-9]/g, '');
  // Which of a system's pictures is a game's by its plain name: never a demo or
  // the like, its own region's before the World's, then Europe's, then any,
  // and the shortest name of those; null where none is.
  function artNear(game, files) {
    const plain = plainName(game.title);
    const own = game.title.match(/\(([^)]*)\)/)?.[1].split(', ')[0] ?? 'USA';
    const rank = n => [own, 'USA', 'World', 'Europe'].findIndex(r => new RegExp(`\\([^)]*\\b${r}\\b`).test(n)) + 1 || 9;
    return files.filter(n => plainName(n) === plain && !/\((?:[^)]*\b)?(?:Demo|Beta|Proto|Debug|Kiosk|Pirate|Unl|Aftermarket|Virtual Console)\b/i.test(n))
      .sort((a, b) => rank(a) - rank(b) || a.length - b.length)[0] ?? null;
  }
  const isPng = b => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;

  // A game's cover from libretro's thumbnails as bytes, or null when they
  // have none. Each picture is named after the game's list name with
  // &*/:`<>?\| as _. GitHub sends a picture that is a link to another as the
  // other's file name in text, so that one is fetched in its place. Anything
  // but an answer or a 404 is an error, so a night GitHub is down is not
  // taken for a game with no cover. `lists` keeps each system's names between
  // calls, read once where a game is not found by name.
  async function fetchArt(game, fetch = globalThis.fetch, lists = new Map()) {
    const set = ART[game.system];
    if (!set) return null;
    const listOf = async name => {
      if (!lists.has(name)) {
        const res = await fetch(`${ART_LIST}/${encodeURIComponent(name.replaceAll(' ', '_'))}/git/trees/HEAD:Named_Boxarts`);
        if (!res.ok && res.status !== 404) throw new Error(`GitHub answered ${res.status}.`);
        lists.set(name, res.ok ? (await res.json()).tree.map(f => f.path) : []);
      }
      return lists.get(name);
    };
    const get = async file => {
      const res = await fetch(`${ART_AT}/${encodeURIComponent(set.replaceAll(' ', '_'))}/HEAD/Named_Boxarts/${encodeURIComponent(file)}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`libretro's thumbnails: ${res.status}`);
      return new Uint8Array(await res.arrayBuffer());
    };
    const picture = async file => {
      let bytes = await get(file);
      if (bytes && !isPng(bytes)) {
        const to = bytes.length < 512 ? new TextDecoder().decode(bytes).trim() : '';
        bytes = /^[^/\\\0\n]+\.png$/.test(to) ? await get(to) : null;
      }
      return bytes && isPng(bytes) ? bytes : null;
    };
    for (const name of artNames(game)) {
      const bytes = await picture(`${name.replace(/[&*/:`<>?\\|]/g, '_')}.png`);
      if (bytes) return bytes;
    }
    // Named some other way, it is found among every name the system has.
    const near = artNear(game, await listOf(set));
    return near ? picture(near) : null;
  }

  // A game's facts in libretro's database, its `metadat` files, a folder a
  // fact, each a file a system named as its thumbnails are; the PlayStation's
  // and PS2's are one file a system, with a description too. Each game in a
  // file is `game ( ... )`, named by its `comment` or `name`, a line a fact.
  const FACTS_AT = 'https://raw.githubusercontent.com/libretro/libretro-database/HEAD/metadat';
  const FACT_FILES = ['genre', 'developer', 'publisher', 'releaseyear', 'maxusers', ''];
  // Bumped when a new source joins, so every game is asked again once.
  const INFO_ASKING = 1;
  function readDat(text, into = new Map()) {
    for (const block of text.split(/^game \(/m).slice(1)) {
      const field = key => block.match(new RegExp(`^\\s*${key} "((?:[^"\\\\]|\\\\.)*)"`, 'm'))?.[1].replace(/\\(.)/g, '$1');
      const users = block.match(/^\s*users "?(\d+)/m)?.[1];
      const name = field('comment') ?? field('name');
      if (!name) continue;
      const had = into.get(name) ?? {};
      const description = field('description');
      const got = {
        year: field('releaseyear'), genre: field('genre'), developer: field('developer'), publisher: field('publisher'),
        players: users ? Number(users) : undefined, description: description && description !== name ? description : undefined,
      };
      into.set(name, { ...had, ...Object.fromEntries(Object.entries(got).filter(([, v]) => v != null && v !== '')) });
    }
    return into;
  }
  // Every game's facts a system has, by name; empty where libretro has none.
  // Anything but an answer or a 404 is an error, so a night GitHub is down is
  // not taken for a system with no facts.
  async function fetchFacts(system, fetch = globalThis.fetch) {
    const set = ART[system];
    const facts = new Map();
    if (!set) return facts;
    for (const kind of FACT_FILES) {
      const res = await fetch(`${FACTS_AT}/${kind ? `${kind}/` : ''}${encodeURIComponent(set)}.dat`);
      if (res.status === 404) continue;
      if (!res.ok) throw new Error(`libretro's database: ${res.status}`);
      readDat(await res.text(), facts);
    }
    return facts;
  }
  // A game's facts among a system's, by the names its cover is found by, or null.
  function factsOf(game, facts) {
    for (const name of artNames(game)) if (facts.has(name)) return facts.get(name);
    return null;
  }
  // Each of `games` that emu_info has no row for, or one asked an older way,
  // looked up and written there: its facts, its description and how it was
  // asked, a game libretro does not know too, so it is not asked each night.
  // Each system's facts are read once. Says how many it wrote.
  async function putInfo(db, games, fetch = globalThis.fetch) {
    const asked = new Map((await db.rows('emu_info', 'system,title,asked')).map(r => [`${r.system}/${r.title}`, r.asked]));
    const want = games.filter(g => (asked.get(`${g.system}/${g.title}`) ?? -1) < INFO_ASKING);
    const read = new Map();
    const rows = [];
    for (const g of want) {
      if (!read.has(g.system)) read.set(g.system, await fetchFacts(g.system, fetch));
      const { description = null, ...facts } = factsOf(g, read.get(g.system)) ?? {};
      rows.push({ system: g.system, title: g.title, facts: Object.keys(facts).length ? facts : null, description, asked: INFO_ASKING, asked_at: new Date().toISOString() });
    }
    for (let i = 0; i < rows.length; i += 100) await db.upsert('emu_info', rows.slice(i, i + 100), 'system,title');
    return rows.length;
  }

  // What the covers the server keeps change in Supabase. `covers` is each
  // game's, as { path, size, mtimeMs }; `held` is emu_files_now's rows under
  // art/. One Supabase lacks or holds another copy of is put, and one held
  // for a game or a picture no longer there is gone.
  function artChanged(covers, held) {
    const have = new Map(held.map(f => [f.path, f]));
    const wanted = new Set(covers.map(c => c.path));
    return {
      put: covers.filter(c => !same(have.get(c.path), c)).map(c => ({ path: c.path, size: c.size, saved: savedAt(c), replaces: have.has(c.path) })),
      gone: held.map(f => f.path).filter(p => !wanted.has(p)),
    };
  }
  // Those changes made: a cover gone is taken out, and one put takes the
  // place of the copy held, so Supabase keeps one copy of each.
  async function putArt(db, { put, gone }, { sha1Of, bytesOf, mac }) {
    for (const path of gone) await dropFile(db, path);
    for (const { replaces, ...f } of put) {
      if (replaces) await dropFile(db, f.path);
      await putFile(db, { ...f, sha1: await sha1Of(f.path), mac }, () => bytesOf(f.path));
    }
  }

  // The calls over the signed-in account's Supabase client.
  function clientDb(client) {
    const fail = ({ error }) => { if (error) throw error; };
    const matching = (q, match) => Object.entries(match).reduce((q, [k, v]) => q.eq(k, v), q);
    const bucket = () => client.storage.from(COLLECTION);
    return {
      async rows(table, columns, match = {}) {
        const out = [];
        for (let from = 0; ; from += 1000) {
          const { data, error } = await matching(client.from(table).select(columns), match).range(from, from + 999);
          if (error) throw error;
          out.push(...data);
          if (data.length < 1000) return out;
        }
      },
      insert: async (table, row) => fail(await client.from(table).insert(row)),
      upsert: async (table, rows, conflict) => fail(await client.from(table).upsert(rows, { onConflict: conflict })),
      update: async (table, values, match) => fail(await matching(client.from(table).update(values), match)),
      remove: async (table, match) => fail(await matching(client.from(table).delete(), match)),
      upload: async (sha1, bytes) => fail(await bucket().upload(sha1, bytes, { upsert: true, contentType: 'application/octet-stream' })),
      unload: async sha1 => fail(await bucket().remove([sha1])),
    };
  }

  // The calls over Supabase's REST address, with a secret key.
  function restDb({ url, key, fetch = globalThis.fetch }) {
    const headers = { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' };
    const filter = match => Object.entries(match).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
    const ask = async (table, query, init) => {
      const res = await fetch(`${url}/rest/v1/${table}?${query}`, { ...init, headers: { ...headers, ...init?.headers } });
      if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text().catch(() => '')}`.trim());
      return res;
    };
    const object = async (sha1, init) => {
      const res = await fetch(`${url}/storage/v1/object/${COLLECTION}/${sha1}`, { ...init, headers: { apikey: key, authorization: `Bearer ${key}`, ...init.headers } });
      if (!res.ok) throw new Error(`${sha1}: ${res.status} ${await res.text().catch(() => '')}`.trim());
    };
    return {
      async rows(table, columns, match = {}) {
        const out = [];
        const only = filter(match);
        for (let from = 0; ; from += 1000) {
          const page = await (await ask(table, `select=${columns}${only ? `&${only}` : ''}&limit=1000&offset=${from}`)).json();
          out.push(...page);
          if (page.length < 1000) return out;
        }
      },
      insert: (table, row) => ask(table, '', { method: 'POST', body: JSON.stringify(row), headers: { prefer: 'return=minimal' } }),
      upsert: (table, rows, conflict) => ask(table, `on_conflict=${conflict}`,
        { method: 'POST', body: JSON.stringify(rows), headers: { prefer: 'resolution=merge-duplicates,return=minimal' } }),
      update: (table, values, match) => ask(table, filter(match),
        { method: 'PATCH', body: JSON.stringify(values), headers: { prefer: 'return=minimal' } }),
      remove: (table, match) => ask(table, filter(match), { method: 'DELETE', headers: { prefer: 'return=minimal' } }),
      upload: (sha1, bytes) => object(sha1, { method: 'POST', body: bytes, headers: { 'content-type': 'application/octet-stream', 'x-upsert': 'true' } }),
      unload: sha1 => object(sha1, { method: 'DELETE', headers: {} }),
    };
  }

  const api = { DRIVE, rowOf, saveRowOf, changes, rowsOf, save, putFile, dropFile, givenChanged, installs, putGiven,
    ART, ART_AT, ART_ASKING, PICTURE, artKey, artNames, fetchArt, artChanged, putArt,
    FACTS_AT, INFO_ASKING, readDat, fetchFacts, factsOf, putInfo, clientDb, restDb };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Emu = Object.assign(root.Emu || {}, { scanSave: api });
})(typeof window === 'object' ? window : globalThis);
