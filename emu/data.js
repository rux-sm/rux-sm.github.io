/* ==========================================================================
   data.js — Emu's reads and writes
   --------------------------------------------------------------------------
   Every call goes to a emu_ table or the emu-backups or emu-collection
   bucket, which row security opens to the owner alone; any other account reads and writes
   nothing. The client is the account's, from /account.js.
   ========================================================================== */
(() => {
  'use strict';

  const client = window.Rux?.account?.client ?? null;
  const fail = error => { if (error) throw error; };
  const BUCKET = 'emu-backups';
  // The bucket of everything but the games, each file's bytes under their SHA-1; `emu_files` lists them.
  const COLLECTION = 'emu-collection';
  // A path in the bucket: Supabase takes a narrower set of characters than a
  // Mac's or a file's name may hold, such as the curly apostrophe macOS puts
  // in a Mac's name.
  const inBucket = p => p.split('/').map(part => part.replace(/[^\w !\-.*'()&$@=;:+,?]/g, '_')).join('/');

  // Supabase answers at most 1000 rows a request, so a long read is paged.
  const all = async make => {
    const out = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await make().range(from, from + 999);
      fail(error);
      out.push(...data);
      if (data.length < 1000) return out;
    }
  };
  const inBatches = async (rows, write) => {
    for (let i = 0; i < rows.length; i += 100) fail((await write(rows.slice(i, i + 100))).error);
  };

  // Every object under a folder of the bucket, its subfolders' too.
  const allObjects = async prefix => {
    const { data: items, error } = await client.storage.from(BUCKET).list(prefix, { limit: 1000 });
    fail(error);
    const out = [];
    for (const it of items) {
      if (it.id) out.push(`${prefix}/${it.name}`);
      else out.push(...await allObjects(`${prefix}/${it.name}`));
    }
    return out;
  };

  // Which backups Supabase keeps: every one of the last 30 days, and the
  // newest of each month before that.
  const keep = names => {
    const cutoff = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    const dated = names.map(n => ({ n, d: n.match(/(\d{4}-\d{2}-\d{2})/)?.[1] ?? '' })).sort((a, b) => b.d.localeCompare(a.d));
    const months = new Set();
    return new Set(dated.filter(({ d }) => {
      if (d >= cutoff) return true;
      if (months.has(d.slice(0, 7))) return false;
      months.add(d.slice(0, 7));
      return true;
    }).map(x => x.n));
  };

  const data = client && {
    games: () => all(() => client.from('emu_games').select('*').order('system').order('title')),
    // What Update compares a scan with: each game's key and its files' fingerprints.
    gameKeys: () => all(() => client.from('emu_games').select('system, title, size, scanned_at').order('system').order('title')),
    notes: () => all(() => client.from('emu_notes').select('*')),
    saves: () => all(() => client.from('emu_saves').select('*').order('system').order('name')),
    saveKeys: () => all(() => client.from('emu_saves').select('system, name, kind, location')),
    // Everything but the games, which Supabase holds: each file as it stands,
    // by its path, or those under one folder.
    files: (folder = '') => all(() => client.from('emu_files_now').select('*').not('sha1', 'is', null).like('path', `${folder}%`).order('path')),
    // The BIOS, keys and firmware among them, each by its name under bios/.
    bios: async () => (await data.files('bios/')).map(f => ({ name: f.path.slice('bios/'.length), size: f.size, sha1: f.sha1 })),
    // A file put in Supabase, as scan-save.js puts one.
    putFile: (file, bytes) => window.Emu.scanSave.putFile(data.db(), file, bytes),
    // A save carried up: put as putFile puts it, then the copies of it past
    // the newest five dropped, with the bytes nothing else has.
    async keepCopy(file, bytes) {
      await data.putFile(file, bytes);
      const { data: rows, error } = await client.from('emu_files').select('carried_at, sha1').eq('path', file.path).order('carried_at', { ascending: false });
      fail(error);
      const old = rows.slice(5);
      for (const r of old) fail((await client.from('emu_files').delete().eq('path', file.path).eq('carried_at', r.carried_at)).error);
      for (const sha1 of new Set(old.map(r => r.sha1))) {
        const { data: left, error: e } = await client.from('emu_files').select('path').eq('sha1', sha1).limit(1);
        fail(e);
        if (!left.length) fail((await client.storage.from(COLLECTION).remove([sha1])).error);
      }
    },
    // One copy Supabase keeps of a file, by its fingerprint, or null.
    async copyOf(path, sha1) {
      const { data: rows, error } = await client.from('emu_files').select('*').eq('path', path).eq('sha1', sha1).limit(1);
      fail(error);
      return rows[0] ?? null;
    },
    // A file taken out of Supabase, as scan-save.js takes one out.
    dropFile: path => window.Emu.scanSave.dropFile(data.db(), path),
    // Each emulator's settings as Supabase keeps them, under
    // `settings/<Mac>/<emulator>/` and `settings/preferred/<emulator>/`: by
    // `<Mac or preferred>/<emulator>`, every copy newest first, a copy being
    // the files carried at one moment and the Mac they came from.
    async settings() {
      const rows = await all(() => client.from('emu_files').select('*').like('path', 'settings/%')
        .order('carried_at', { ascending: false }).order('path'));
      const kept = new Map();
      for (const r of rows) {
        const [, owner, emulator, ...rel] = r.path.split('/');
        const copies = kept.get(`${owner}/${emulator}`) ?? kept.set(`${owner}/${emulator}`, []).get(`${owner}/${emulator}`);
        const copy = copies.find(c => c.at === r.carried_at) ?? copies[copies.push({ at: r.carried_at, mac: r.mac, files: [] }) - 1];
        copy.files.push({ rel: rel.join('/'), sha1: r.sha1, size: r.size, saved: r.saved_at });
      }
      return kept;
    },
    // One copy of an emulator's settings kept: each file's bytes put where
    // Supabase has none the same, every file a row at the same moment, then
    // the copies past the newest five dropped, with the bytes nothing else has.
    async keepSettings(owner, emulator, files, bytesOf, mac) {
      const folder = `settings/${owner.replaceAll('/', '_')}/${emulator}`;
      const held = async sha1 => {
        const { data: rows, error } = await client.from('emu_files').select('path').eq('sha1', sha1).limit(1);
        fail(error);
        return rows.length > 0;
      };
      for (const f of files) {
        if (await held(f.sha1)) continue;
        fail((await client.storage.from(COLLECTION).upload(f.sha1, new Blob([await bytesOf(f)]), { upsert: true, contentType: 'application/octet-stream' })).error);
      }
      const at = new Date().toISOString();
      await inBatches(files.map(f => ({ path: `${folder}/${f.rel}`, carried_at: at, sha1: f.sha1, size: f.size, saved_at: f.saved ?? null, mac })),
        rows => client.from('emu_files').insert(rows));
      const mine = (await all(() => client.from('emu_files').select('path, carried_at, sha1').like('path', `${folder}/%`)))
        .filter(r => r.path.startsWith(`${folder}/`));
      const past = new Set([...new Set(mine.map(r => r.carried_at))].sort((a, b) => new Date(b) - new Date(a)).slice(5));
      const old = mine.filter(r => past.has(r.carried_at));
      for (const r of old) fail((await client.from('emu_files').delete().eq('path', r.path).eq('carried_at', r.carried_at)).error);
      for (const sha1 of new Set(old.map(r => r.sha1))) {
        if (!await held(sha1)) fail((await client.storage.from(COLLECTION).remove([sha1])).error);
      }
    },
    // A file's bytes out of the collection, by their fingerprint.
    async fileBytes(sha1) {
      const { data: blob, error } = await client.storage.from(COLLECTION).download(sha1);
      fail(error);
      return new Uint8Array(await blob.arrayBuffer());
    },
    // How each Mac stood when its saves were last gathered.
    macs: () => all(() => client.from('emu_macs').select('*').order('name')),
    async drive() {
      const { data: row, error } = await client.from('emu_drive').select('*').maybeSingle();
      fail(error);
      return row;
    },

    // rux's notes on a game: played, finished, favourite, plays and a note.
    // When Play last opened a game, for the Library's Recently played; the
    // marks and note stay as they are.
    async markPlayed(game) {
      const played_at = new Date().toISOString();
      fail((await client.from('emu_notes').upsert({ system: game.system, title: game.title, played_at }, { onConflict: 'system,title' })).error);
      return played_at;
    },
    async saveNotes(row) {
      fail((await client.from('emu_notes').upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'system,title' })).error);
    },
    async saveSaveNote(save, note) {
      fail((await client.from('emu_saves').update({ note })
        .eq('system', save.system).eq('name', save.name).eq('kind', save.kind).eq('location', save.location)).error);
    },

    // The signed-in account's reads and writes, as scan-save.js makes them.
    db: () => window.Emu.scanSave.clientDb(client),
    // A scan saved, as scan-save.js saves one.
    saveScan: rows => window.Emu.scanSave.save(data.db(), rows),

    // The backups in Supabase, newest first.
    async backups() {
      const { data: files, error } = await client.storage.from(BUCKET).list('', { limit: 1000, sortBy: { column: 'name', order: 'desc' } });
      fail(error);
      return files.filter(f => f.name.endsWith('.zip'));
    },

    // A Mac's report and saves, from Rux Emu Helper on that Mac:
    // how the Mac stands written first, then each file uploaded under
    // `macs/<Mac>/<date>/`, each save written with the Mac as its location
    // and leaving its note, the Mac's saves no longer gathered deleted, and
    // the Mac's gatherings past keeping removed.
    async saveMacSaves(manifest, files, saves) {
      const { mac, made } = manifest;
      fail((await client.from('emu_macs').upsert({
        name: mac, gathered_at: made, macos: manifest.macos ?? null, chip: manifest.chip ?? null,
        frontend: manifest.frontend ?? null, emulators: manifest.emulators ?? [],
      }, { onConflict: 'name' })).error);
      const folder = `macs/${mac}/${made.slice(0, 10)}`;
      for (const f of files) {
        fail((await client.storage.from(BUCKET).upload(inBucket(`${folder}/${f.stored}`), f.blob,
          { upsert: true, contentType: 'application/octet-stream' })).error);
      }
      const rows = saves.map(s => ({
        system: s.system, name: s.name, kind: s.kind, location: mac, game: s.game,
        files: s.files.map(f => ({ ...f, object: inBucket(`${folder}/${f.stored}`) })),
        size: s.size, created_at: s.created, saved_at: s.saved, backed_up_at: made, scanned_at: made,
      }));
      await inBatches(rows, batch => client.from('emu_saves').upsert(batch, { onConflict: 'system,name,kind,location' }));
      const now = new Set(rows.map(r => `${r.system}/${r.name}/${r.kind}`));
      for (const k of (await data.saveKeys()).filter(k => k.location === mac && !now.has(`${k.system}/${k.name}/${k.kind}`))) {
        fail((await client.from('emu_saves').delete()
          .eq('system', k.system).eq('name', k.name).eq('kind', k.kind).eq('location', mac)).error);
      }
      const { data: dates, error } = await client.storage.from(BUCKET).list(inBucket(`macs/${mac}`), { limit: 1000 });
      fail(error);
      const kept = keep(dates.map(d => d.name));
      for (const d of dates.filter(x => !kept.has(x.name))) {
        const objects = await allObjects(inBucket(`macs/${mac}/${d.name}`));
        for (let i = 0; i < objects.length; i += 100) fail((await client.storage.from(BUCKET).remove(objects.slice(i, i + 100))).error);
      }
    },
    // A link good for a minute to the newest copy of a file every Mac is given, saved under its own name.
    async givenLink(path) {
      const { data: rows, error } = await client.from('emu_files_now').select('sha1').eq('path', path).limit(1);
      fail(error);
      if (!rows.length) return null;
      const { data: link, error: e } = await client.storage.from(COLLECTION).createSignedUrl(rows[0].sha1, 60, { download: path.split('/').pop() });
      fail(e);
      return link.signedUrl;
    },
    async fileLink(object, name) {
      const { data: link, error } = await client.storage.from(BUCKET).createSignedUrl(object, 60, { download: name });
      fail(error);
      return link.signedUrl;
    },
    // A backup zip uploaded, then the ones past keeping removed.
    async uploadBackup(file) {
      fail((await client.storage.from(BUCKET).upload(file.name, file, { upsert: true, contentType: 'application/zip' })).error);
      const names = (await data.backups()).map(f => f.name);
      const kept = keep(names);
      const drop = names.filter(n => !kept.has(n));
      if (drop.length) fail((await client.storage.from(BUCKET).remove(drop)).error);
    },
    async backupLink(name) {
      const { data: link, error } = await client.storage.from(BUCKET).createSignedUrl(name, 60, { download: true });
      fail(error);
      return link.signedUrl;
    },
  };

  window.Emu = Object.assign(window.Emu || {}, { data });
})();
