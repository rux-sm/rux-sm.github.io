/* ==========================================================================
   data.js — Roms' reads and writes
   --------------------------------------------------------------------------
   Every call goes to a roms_ table or the roms-backups bucket, which row
   security opens to the owner alone; any other account reads and writes
   nothing. The client is the account's, from /account.js.
   ========================================================================== */
(() => {
  'use strict';

  const client = window.Rux?.account?.client ?? null;
  const fail = error => { if (error) throw error; };
  const BUCKET = 'roms-backups';

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
    games: () => all(() => client.from('roms_games').select('*').order('system').order('title')),
    // What Import compares a scan with: each game's key and its files' fingerprints.
    gameKeys: () => all(() => client.from('roms_games').select('system, title, size, scanned_at').order('system').order('title')),
    notes: () => all(() => client.from('roms_notes').select('*')),
    saves: () => all(() => client.from('roms_saves').select('*').order('system').order('name')),
    saveKeys: () => all(() => client.from('roms_saves').select('system, name, kind')),
    bios: () => all(() => client.from('roms_bios').select('*').order('name')),
    async drive() {
      const { data: row, error } = await client.from('roms_drive').select('*').maybeSingle();
      fail(error);
      return row;
    },

    // rux's notes on a game: played, finished, favourite, plays and a note.
    async saveNotes(row) {
      fail((await client.from('roms_notes').upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'system,title' })).error);
    },
    async saveSaveNote(save, note) {
      fail((await client.from('roms_saves').update({ note }).eq('system', save.system).eq('name', save.name).eq('kind', save.kind)).error);
    },

    // A scan saved. A rename the organize tool made moves the game's notes
    // and its saves' notes first, so the scan's rows land on them. Then every
    // game and save in the scan is written, leaving each note as it is, the
    // ones no longer on the drive are deleted, and the BIOS list and the
    // drive's row are replaced. Rows go 100 at a time.
    async saveScan({ games, gone, bios, saves, savesGone, drive, renames }) {
      const notes = await all(() => client.from('roms_notes').select('system, title'));
      const has = new Set(notes.map(n => `${n.system}/${n.title}`));
      for (const r of renames) {
        if (!has.has(`${r.system}/${r.from}`) || has.has(`${r.system}/${r.to}`)) continue;
        fail((await client.from('roms_notes').update({ title: r.to }).eq('system', r.system).eq('title', r.from)).error);
        has.add(`${r.system}/${r.to}`);
      }
      const saveKeys = new Set((await data.saveKeys()).map(k => `${k.system}/${k.name}/${k.kind}`));
      for (const r of renames) {
        for (const kind of ['save', 'state', 'card']) {
          if (!saveKeys.has(`${r.system}/${r.from}/${kind}`) || saveKeys.has(`${r.system}/${r.to}/${kind}`)) continue;
          fail((await client.from('roms_saves').update({ name: r.to, game: r.to })
            .eq('system', r.system).eq('name', r.from).eq('kind', kind)).error);
          saveKeys.add(`${r.system}/${r.to}/${kind}`);
        }
      }
      await inBatches(games, rows => client.from('roms_games').upsert(rows, { onConflict: 'system,title' }));
      for (const g of gone) fail((await client.from('roms_games').delete().eq('system', g.system).eq('title', g.title)).error);
      await inBatches(saves, rows => client.from('roms_saves').upsert(rows, { onConflict: 'system,name,kind' }));
      for (const s of savesGone) {
        fail((await client.from('roms_saves').delete().eq('system', s.system).eq('name', s.name).eq('kind', s.kind)).error);
      }
      fail((await client.from('roms_bios').delete().neq('name', '')).error);
      if (bios.length) fail((await client.from('roms_bios').insert(bios)).error);
      fail((await client.from('roms_drive').upsert({ id: 1, ...drive }, { onConflict: 'id' })).error);
    },

    // The backups in Supabase, newest first.
    async backups() {
      const { data: files, error } = await client.storage.from(BUCKET).list('', { limit: 1000, sortBy: { column: 'name', order: 'desc' } });
      fail(error);
      return files.filter(f => f.name.endsWith('.zip'));
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

  window.Roms = Object.assign(window.Roms || {}, { data });
})();
