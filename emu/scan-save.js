/* ==========================================================================
   scan-save.js — a scan saved to Supabase
   --------------------------------------------------------------------------
   One set of steps, run by Update on the Status page and each night by
   emu/tools/scan-roms.mjs on the home server, so the two save a scan the
   same way. `rowsOf` makes a scan's games and the drive's saves into rows,
   `changes` says what differs from the rows saved, and `save` writes them.

   `save` writes through a `db` of four calls, which each side makes:
   `clientDb` from the signed-in account's Supabase client in the browser,
   `restDb` from a secret key and fetch alone on the server:
     rows(table, columns)          every row, those columns
     upsert(table, rows, conflict) rows written over those with the same key
     update(table, values, match)  the rows matching changed
     remove(table, match)          the rows matching deleted
   ========================================================================== */
(root => {
  'use strict';

  // Where a save in the drive's saves folder is, as its row says.
  const DRIVE = 'drive';
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
  // another size and gone, and the drive's saves new and gone.
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

  // What `save` writes for a scan: its rows, the rows gone, the drive's row
  // and the organize tool's renames. `drive` is what the drive's row keeps
  // beyond the scan: the backup and the newest versions out.
  const rowsOf = (scan, { gone, savesGone }, drive) => ({
    games: scan.games.map(g => rowOf(g, scan.scanned)),
    gone,
    saves: scan.saves.map(s => saveRowOf(s, scan.scanned)),
    savesGone,
    drive: { to_delete: scan.toDelete, unsorted_saves: scan.unsortedSaves, backups: scan.backups,
      backup: drive.backup ?? null, newest: drive.newest ?? {}, scanned_at: scan.scanned },
    renames: scan.renames ?? [],
  });

  // A scan saved. A rename the organize tool made moves the game's notes
  // and its saves' notes first, so the scan's rows land on them. Then every
  // game and save in the scan is written, leaving each note as it is, the
  // ones no longer on the drive are deleted, and the drive's row is
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
    await db.upsert('emu_drive', [{ id: 1, ...drive }], 'id');
  }

  // The four calls over the signed-in account's Supabase client.
  function clientDb(client) {
    const fail = ({ error }) => { if (error) throw error; };
    const matching = (q, match) => Object.entries(match).reduce((q, [k, v]) => q.eq(k, v), q);
    return {
      async rows(table, columns) {
        const out = [];
        for (let from = 0; ; from += 1000) {
          const { data, error } = await client.from(table).select(columns).range(from, from + 999);
          if (error) throw error;
          out.push(...data);
          if (data.length < 1000) return out;
        }
      },
      upsert: async (table, rows, conflict) => fail(await client.from(table).upsert(rows, { onConflict: conflict })),
      update: async (table, values, match) => fail(await matching(client.from(table).update(values), match)),
      remove: async (table, match) => fail(await matching(client.from(table).delete(), match)),
    };
  }

  // The four calls over Supabase's REST address, with a secret key.
  function restDb({ url, key, fetch = globalThis.fetch }) {
    const headers = { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' };
    const filter = match => Object.entries(match).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
    const ask = async (table, query, init) => {
      const res = await fetch(`${url}/rest/v1/${table}?${query}`, { ...init, headers: { ...headers, ...init?.headers } });
      if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text().catch(() => '')}`.trim());
      return res;
    };
    return {
      async rows(table, columns) {
        const out = [];
        for (let from = 0; ; from += 1000) {
          const page = await (await ask(table, `select=${columns}&limit=1000&offset=${from}`)).json();
          out.push(...page);
          if (page.length < 1000) return out;
        }
      },
      upsert: (table, rows, conflict) => ask(table, `on_conflict=${conflict}`,
        { method: 'POST', body: JSON.stringify(rows), headers: { prefer: 'resolution=merge-duplicates,return=minimal' } }),
      update: (table, values, match) => ask(table, filter(match),
        { method: 'PATCH', body: JSON.stringify(values), headers: { prefer: 'return=minimal' } }),
      remove: (table, match) => ask(table, filter(match), { method: 'DELETE', headers: { prefer: 'return=minimal' } }),
    };
  }

  const api = { DRIVE, rowOf, saveRowOf, changes, rowsOf, save, clientDb, restDb };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Emu = Object.assign(root.Emu || {}, { scanSave: api });
})(typeof window === 'object' ? window : globalThis);
