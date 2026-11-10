/* ==========================================================================
   saves-rules.js — which game a save belongs to
   --------------------------------------------------------------------------
   One set of rules, read by the scan on the Mac and by the Saves page, so
   the two never match a save differently. Each emulator names a save its
   own way, and emulators.json says which rule each system's follows: the
   game's file name, its title ID, its disc ID, or its disc's serial.

   A game here is a scan's or a roms_games row: its system and title, its
   files with their headers, its list match, and its title ID.
   ========================================================================== */
(root => {
  'use strict';

  // A file an emulator writes, never a game: a save, a clock, a save state,
  // or a memory card.
  const SAVE_FILE = /\.(sav|srm|rtc|eep|sra|fla|mpk|dsv|mcd|mcr|gci|state\d*|ss\d|ml\d+|mss|st\d+)(\.png)?$/i;

  // What a save file is: a save state, a memory card, or the game's own save.
  // A PCSX2 card is a `.ps2` file, or a `.ps2` folder holding each game's save.
  const kindOf = rel => {
    if (/(^|\/)[^/]*states?\//i.test(rel) || /\.(state\d*|ss\d|ml\d+|mss|st\d+)(\.png)?$/i.test(rel)) return 'state';
    if (/\.ps2(\/|$)/i.test(rel) || /\.(mcd|mcr|gci)$/i.test(rel)) return 'card';
    return 'save';
  };
  // A save's own name: its file name less its extension, and a state's `.state`.
  const saveName = rel => rel.split('/').pop().replace(/\.[^.]+$/, '').replace(/\.state\d*$/i, '');

  const norm = x => String(x).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const hex = s => [...s].map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
  const base = name => String(name).split('/').pop().replace(/\.[^.]+$/, '');
  const stemsOf = g => new Set([g.title, ...(g.files ?? []).map(f => base(f.name))]);
  const idsOf = g => [g.titleId ?? g.title_id, ...(g.files ?? []).map(f => f.header?.titleId)]
    .filter(Boolean).map(x => String(x).toLowerCase());
  const discIdsOf = g => [...new Set((g.files ?? []).map(f => f.header?.discId?.slice(0, 4)).filter(Boolean))];
  // A serial as the disc's own code, four letters and five digits, since the
  // lists add an edition after it, such as SLUS-00860GH, that no card carries.
  const serialsOf = g => [...new Set([...(g.match?.serials ?? []), ...(g.files ?? []).map(f => f.header?.serial)]
    .filter(Boolean).map(x => norm(x).match(/^[A-Z]{4}\d{5}/)?.[0] ?? norm(x)))];

  // Each rule answers which of a system's games a save's path belongs to.
  const RULES = {
    // The game's file name, as the save's name less its extensions or as a folder it sits in.
    name: (rel, games) => {
      const parts = rel.split('/');
      const names = parts.slice(0, -1);
      for (let b = parts.at(-1); b.includes('.'); ) { b = b.slice(0, b.lastIndexOf('.')); names.push(b); }
      return games.find(g => { const st = stemsOf(g); return names.some(n => st.has(n)); });
    },
    // The title ID whole, or split into its two halves as folders, as Azahar and Cemu keep it.
    titleId: (rel, games) => {
      const p = rel.toLowerCase();
      return games.find(g => idsOf(g).some(id => p.includes(id) || p.includes(`${id.slice(0, 8)}/${id.slice(8)}`)));
    },
    // Dolphin names a GameCube save `<maker>-<ID>-…`, and keeps a Wii one under the ID in hex.
    discId: (rel, games) => games.find(g => discIdsOf(g).some(id =>
      rel.includes(`-${id}-`) || rel.toLowerCase().split('/').includes(hex(id)))),
    // DuckStation's cards and PCSX2's save folders carry the disc's serial.
    serial: (rel, games) => { const p = norm(rel); return games.find(g => serialsOf(g).some(s => p.includes(s))); },
  };
  // A save with no game is said only where a save's name always names its
  // game; a title-ID system's folder also holds the system's own data.
  const SAYS_ORPHANS = new Set(['name', 'serial']);

  // A save's file, found under a folder that serves `systems`, as its game
  // on the first of them whose rule names one, or none.
  const match = (rel, systems, games, emulators) => {
    for (const s of systems) {
      const game = RULES[emulators[s].saves](rel, games.filter(g => g.system === s));
      if (game) return { system: s, game };
    }
    return { system: systems[0], game: null };
  };

  // Save files as saves: one per game, kind and place, with their files.
  // `files` are { rel, systems, file }, where `file` is what is kept of it.
  const group = (files, games, emulators) => {
    const out = new Map();
    for (const { rel, systems, file } of files) {
      const { system, game } = match(rel, systems, games, emulators);
      if (!game && !SAYS_ORPHANS.has(emulators[system].saves)) continue;
      const kind = kindOf(rel);
      const name = game ? game.title : saveName(rel);
      const key = `${system}|${name}|${kind}`;
      if (!out.has(key)) out.set(key, { system, name, game: game?.title ?? null, kind, files: [] });
      out.get(key).files.push(file);
    }
    return [...out.values()].map(g => ({
      ...g,
      size: g.files.reduce((a, f) => a + f.size, 0),
      created: g.files.map(f => f.created).sort()[0],
      saved: g.files.map(f => f.saved).sort().at(-1),
    }));
  };

  // The systems a save folder serves: an emulator keeps one for every system
  // it plays, so a system's folder serves each of that emulator's, its own first.
  const systemsOf = (system, emulators) => [system, ...Object.keys(emulators)
    .filter(s => s !== system && emulators[s].emulator === emulators[system].emulator)];

  const api = { SAVE_FILE, kindOf, saveName, RULES, SAYS_ORPHANS, match, group, systemsOf };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Roms = Object.assign(root.Roms || {}, { saveRules: api });
})(typeof window === 'object' ? window : globalThis);
