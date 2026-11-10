/* ==========================================================================
   data.js — Roms' reads and writes
   --------------------------------------------------------------------------
   Every call goes to a roms_ table, which row security opens to the owner
   alone; any other account reads and writes nothing. The client is the
   account's, from /account.js.
   ========================================================================== */
(() => {
  'use strict';

  const client = window.Rux?.account?.client ?? null;
  const fail = error => { if (error) throw error; };

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

  const data = client && {
    games: () => all(() => client.from('roms_games').select('*').order('system').order('title')),
    // What Import compares a scan with: each game's key and its files' fingerprints.
    gameKeys: () => all(() => client.from('roms_games').select('system, title, size, scanned_at').order('system').order('title')),

    // A scan saved: every game in it written, the games no longer on the
    // drive deleted, and the BIOS list replaced. Rows go 100 at a time.
    async saveScan(games, gone, bios) {
      for (let i = 0; i < games.length; i += 100) {
        const { error } = await client.from('roms_games').upsert(games.slice(i, i + 100), { onConflict: 'system,title' });
        fail(error);
      }
      for (const g of gone) {
        const { error } = await client.from('roms_games').delete().eq('system', g.system).eq('title', g.title);
        fail(error);
      }
      const { error: cleared } = await client.from('roms_bios').delete().neq('name', '');
      fail(cleared);
      if (bios.length) {
        const { error } = await client.from('roms_bios').insert(bios);
        fail(error);
      }
    },
  };

  window.Roms = Object.assign(window.Roms || {}, { data });
})();
