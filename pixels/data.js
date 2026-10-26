/* ==========================================================================
   data.js — who is playing, and where puzzles and results are kept
   --------------------------------------------------------------------------
   A PLAYER is an account that can open Pixels, or a GUEST: someone with no
   account who typed a name and a PIN at the door, and whose browser made a
   long random key, kept under `pixels-guest`. The database knows a guest by
   that key's hash, and a browser with no key by the name and the PIN, which
   earn it a key of its own.

   Nobody but the owner reads a table. Everything a player does goes through
   database functions that first find the player, from the log-in or from the
   key: `pixels_door`, `pixels_me`, `pixels_puzzles`, `pixels_results`,
   `pixels_days`, `pixels_record`, `pixels_record_day`, `pixels_board`,
   `pixels_set_picture`, `pixels_set_gear`, `pixels_rename`, `pixels_set_pin`,
   `pixels_use_fairy`, `pixels_leave`,
   `pixels_people`, `pixels_friend_offer`, `pixels_add_friend`,
   `pixels_unfriend`, `pixels_renew_invite`, and for a player's own puzzles
   and rifts `pixels_mine`, `pixels_keep_puzzle`, `pixels_drop_puzzle`,
   `pixels_name_my_level`, `pixels_publish_my_level` and
   `pixels_delete_my_level`. A friend link is `?join=` and a player's own
   code, and whoever opens it is asked before the two are made friends.
   `results` gives a Map of puzzle id to { seconds } and `days` a Map
   of day to the same; `record` and `recordDay` keep the shorter time, and
   `board` gives a day's ranking and the all-time one. The client is
   /account.js's, with a log-in or without.

   `enter()` is what a page calls first: it says whether there is a player,
   and where there is not it draws the door, one form of a name and a PIN.
   A player who opened a friend link is asked there whether to add its
   sharer. `carry()` puts a guest's key in the address for a home screen
   icon to keep.
   `me` gives the player with their picture and how many sprites they have
   found, and `setPicture` and `rename` change their own picture and username.

   `list` is what a player is sent, for every account, the owner's too: no
   hidden category, no puzzle that is off, none in no category.

   THE OWNER makes and edits puzzles and sees the players, by the tables'
   own rules: `all`, which is every puzzle there is, `save`, `remove`,
   `setOff`, `move`, `setTheme`, `setHidden`, `orderLevels`, `removeLevel`,
   `players`, `joining`, `setJoining`, `share`, `renamePlayer` and `removePlayer`. `move` and
   `remove` take one id or several. A puzzle with no `level` is in no
   category, and no player is sent it.

   THE LOCAL PREVIEW, `npm run serve` on :8640, has no log-in, so there the
   same calls read and write this browser's storage instead, starting from
   STARTERS, the owner's among them but for the players. Only that address
   does: anywhere else, no client is an error.

   Every value from the database is written with textContent by the pages.
   ========================================================================== */
(() => {
  'use strict';

  // The first category of nine, invented for the game. Each is solvable by logic alone.
  const STARTERS = [
    ['Heart', '..........|.##....##.|####..####|##########|##########|.########.|..######..|...####...|....##....|..........'],
    ['House', '....##....|...####...|..######..|.########.|##########|.#......#.|.#.##...#.|.#.##.###.|.#....###.|.########.'],
    ['Tree', '....##....|...####...|..######..|.########.|..######..|.########.|##########|....##....|....##....|...####...'],
    ['Fish', '..........|...####...|.#######.#|###.######|##########|.#######.#|...####...|..........|..........|..........'],
    ['Star', '....##....|....##....|...####...|##########|.########.|..######..|..######..|.###..###.|.##....##.|.#......#.'],
    ['Mushroom', '...####...|.########.|##..##..##|##########|#.##..##.#|..........|...####...|...#..#...|...#..#...|...####...'],
    ['Boat', '....#.....|....##....|....###...|....####..|....#####.|....#.....|##########|.########.|..######..|..........'],
    ['Cup', '..#..#....|...#..#...|..#..#....|..........|########..|#######.#.|#######..#|#######.#.|.#####....|..........'],
    ['Umbrella', '....##....|..######..|.########.|##########|#.#.##.#.#|....##....|....##....|....##....|.#..##....|..###.....'],
  ].map(([name, rows]) => ({ name, squares: rows.replace(/\|/g, '').replace(/#/g, '1').replace(/\./g, '0') }));

  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) && location.port !== '8641';
  const client = window.Rux?.account?.client ?? null;

  // -- the local preview, in this browser -----------------------------------
  const KEY = 'pixels-preview';
  const read = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (saved) return saved;
    } catch { /* storage refused; start fresh */ }
    const t = Date.now();
    return {
      puzzles: STARTERS.map((p, i) => ({ id: `p-${i + 1}`, ...p, width: 10, height: 10, level: 1, colours: null, created_at: new Date(t + i * 1000).toISOString() })),
      results: {},
      days: {},
      levels: [],
    };
  };
  // A category's row in the preview, made the first time it is written.
  const levelRow = (db, level) => {
    db.levels ||= [];
    let row = db.levels.find(l => l.level === level);
    if (!row) db.levels.push(row = { level, name: null, hidden: false });
    return row;
  };
  // A result as the pages hold it; one in storage may be a bare time.
  const kept = r => (r == null ? null : { seconds: typeof r === 'number' ? r : r.seconds });
  // The better of two results: the shorter time.
  const better = (was, seconds) => ({ seconds: Math.min(seconds, was?.seconds ?? seconds) });
  const write = db => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* preview only */ } };
  // The preview's fairies, counted as the database counts them: three, and
  // three for each rift that is shown with every puzzle of it that is on
  // solved, less those used.
  const fairiesOf = db => {
    const rifts = new Map();
    db.puzzles.forEach(p => {
      const level = p.level === undefined ? 1 : p.level;
      if (p.day || level == null || p.off || (db.levels || []).find(l => l.level === level)?.hidden) return;
      rifts.set(level, (rifts.get(level) ?? true) && p.id in db.results);
    });
    return Math.max(0, 3 + 3 * [...rifts.values()].filter(Boolean).length - (db.fairiesUsed || 0));
  };
  const preview = {
    // A puzzle kept before levels and sizes were is ten a side, in level 1.
    // Each comes as the database sends the owner's: with its category's
    // name as `theme`, whether the category is hidden, and its own switch.
    async all() {
      const db = read();
      return db.puzzles.map(p => ({ width: 10, height: 10, level: 1, colours: null, ...p })).map(p => {
        const row = (db.levels || []).find(l => l.level === p.level);
        return { ...p, off: !!p.off, theme: row?.name ?? null, hidden: !!row?.hidden };
      });
    },
    // What a player is sent, as the database's function chooses it, with
    // neither switch: a day's puzzle within a day of today, and of the rest
    // those that are on, in a category, and whose category is not hidden.
    async list() {
      const near = day => Math.abs(new Date(`${day}T12:00`) - new Date().setHours(12, 0, 0, 0)) <= 864e5;
      return (await this.all()).filter(p => (p.day ? near(p.day) : p.level != null && !p.off && !p.hidden))
        .map(({ off, hidden, ...p }) => p);
    },
    async days() { return new Map(Object.entries(read().days || {})); },
    async recordDay(day, seconds) {
      const db = read();
      db.days ||= {};
      const was = kept(db.days[day]);
      db.days[day] = better(was, seconds);
      write(db);
      return { best: db.days[day].seconds, isNew: !was || seconds < was.seconds };
    },
    async results() {
      return new Map(Object.entries(read().results).map(([id, r]) => [id, kept(r)]));
    },
    async save({ id, name, squares, width, height, level, colours, day, off }) {
      const db = read();
      if (id) {
        const p = db.puzzles.find(q => q.id === id);
        if (p.squares !== squares) delete db.results[id];
        Object.assign(p, { name, squares, width, height, level, colours, day, off: !!off });
        write(db);
        return p;
      }
      const p = { id: `p-${Date.now()}`, name, squares, width, height, level, colours, day, off: !!off, created_at: new Date().toISOString() };
      db.puzzles.push(p);
      write(db);
      return p;
    },
    // The owner's, as the database's are, further down.
    async setOff(id, off) {
      const db = read();
      db.puzzles.find(p => p.id === id).off = off;
      write(db);
    },
    async move(ids, level, off) {
      const db = read(), these = [].concat(ids);
      db.puzzles.forEach(p => { if (these.includes(p.id)) Object.assign(p, { level, off: !!off }); });
      write(db);
    },
    async setTheme(width, level, name) {
      const db = read();
      levelRow(db, level).name = name || null;
      write(db);
    },
    async setHidden(width, level, hidden) {
      const db = read();
      levelRow(db, level).hidden = hidden;
      write(db);
    },
    async orderLevels(width, levels) {
      const db = read(), place = n => levels.indexOf(n) + 1;
      db.puzzles.forEach(p => { if (!p.day && p.level !== null) p.level = place(p.level ?? 1); });
      (db.levels || []).forEach(l => { l.level = place(l.level); });
      write(db);
    },
    async removeLevel(width, level) {
      const db = read(), after = n => (n === level ? null : n > level ? n - 1 : n);
      db.puzzles.forEach(p => { if (!p.day && p.level !== null) p.level = after(p.level ?? 1); });
      db.levels = (db.levels || []).filter(l => l.level !== level);
      db.levels.forEach(l => { l.level = after(l.level); });
      write(db);
    },
    async remove(ids) {
      const db = read(), these = [].concat(ids);
      db.puzzles = db.puzzles.filter(p => !these.includes(p.id));
      these.forEach(id => { delete db.results[id]; });
      write(db);
    },
    async record(id, seconds) {
      const db = read();
      const was = kept(db.results[id]);
      db.results[id] = better(was, seconds);
      write(db);
      return { best: db.results[id].seconds, isNew: !was || seconds < was.seconds };
    },
    // The preview has one player, so its boards hold one row.
    async me() {
      const db = read();
      return { id: 'preview', name: 'Preview', picture: null, colours: null, code: 'preview', ...db.me, found: Object.keys(db.results).length, fairies: fairiesOf(db) };
    },
    async useFairy() {
      const db = read();
      if (fairiesOf(db) < 1) return { error: 'none', fairies: 0 };
      db.fairiesUsed = (db.fairiesUsed || 0) + 1;
      write(db);
      return { fairies: fairiesOf(db) };
    },
    // The preview has nobody else in it.
    async people() { return []; },
    async unfriend() {},
    async renewInvite() { return this.me(); },
    // The character's colours and the player's drawings of its armour.
    async setGear(gear) {
      const db = read();
      db.me = { ...db.me, gear };
      write(db);
      return this.me();
    },
    async setPicture(squares, colours) {
      const db = read();
      db.me = { ...db.me, picture: squares, colours: squares ? colours : null };
      write(db);
      return this.me();
    },
    async rename(name) {
      const db = read();
      db.me = { ...db.me, name: name.trim() };
      write(db);
      return this.me();
    },
    async board(day) {
      const db = read(), mine = Object.values(db.results), days = Object.values(db.days || {});
      const today = kept((db.days || {})[day]);
      return {
        today: today ? [{ name: 'Preview', seconds: today.seconds, me: true }] : [],
        all: [{ name: 'Preview', solved: mine.length, days: days.length, me: true }],
      };
    },
  };

  // -- who is playing ---------------------------------------------------------
  const access = window.Rux?.access;
  const user = access?.storedUser() ?? null;
  const granted = access?.accessOf(user);
  // An account that can open Pixels; anyone else here is a guest.
  const member = !!user && !user.is_anonymous && !!access?.allows(granted, '/pixels/');
  const GUEST = 'pixels-guest', WORD = 'pixels-join';
  const readGuest = () => { try { return JSON.parse(localStorage.getItem(GUEST) || 'null'); } catch { return null; } };
  const key = () => (member ? null : readGuest()?.key ?? null);
  // A friend link's code, from the address, kept while this tab is open so
  // it outlasts the door; `forget` drops it and takes it out of the address.
  const word = () => {
    const given = new URLSearchParams(location.search).get('join');
    try {
      if (given) sessionStorage.setItem(WORD, given);
      return given || sessionStorage.getItem(WORD) || '';
    } catch { return given || ''; }
  };
  const forget = () => {
    try { sessionStorage.removeItem(WORD); } catch { /* nothing kept */ }
    const rest = new URLSearchParams(location.search);
    if (!rest.has('join')) return;
    rest.delete('join');
    history.replaceState(history.state, '', location.pathname + (String(rest) ? `?${rest}` : '') + location.hash);
  };

  /* A GUEST'S ICON CARRIES THEIR KEY. An iPhone keeps an installed app's
     storage apart from Safari's, so the icon is made from an address that
     ends in `#me=` and the key: `carry(true)` puts it there while the steps
     for adding the icon are open, and `carry(false)` takes it out. A page
     opened at such an address takes the key out of it at once, and `enter`
     gives it to a browser that has no player of its own. */
  const carried = /^#me=([\w-]+)$/.exec(location.hash)?.[1] ?? null;
  const carry = on => {
    const mine = on && key();
    history.replaceState(history.state, '', location.pathname + location.search + (mine ? `#me=${mine}` : ''));
  };
  if (carried) carry(false);

  // The owner: the local preview is whoever runs it.
  const owner = (!client && local) || (member && !!granted?.owner);

  // -- the database -----------------------------------------------------------
  const fail = error => { if (error) throw error; };
  const call = async (name, args) => {
    const { data, error } = await client.rpc(name, args);
    fail(error);
    return data;
  };
  // A puzzle's row as the pages hold it: the table's `hidden` is the puzzle's
  // own switch, which they call `off`, since `hidden` is its category's.
  const own = ({ hidden, ...row }) => ({ ...row, off: !!hidden });
  const cloud = client && {
    async me() { return call('pixels_me', { p_key: key() }); },
    // The player's own picture, squares and an ink for each or none; no
    // squares takes it away. And their own username, which may be taken.
    async setPicture(squares, colours) {
      return call('pixels_set_picture', { p_key: key(), p_squares: squares, p_colours: colours });
    },
    // The player's own character: its skin's and its eyes' ink and their
    // drawing of each piece of armour, or none to set it all back.
    async setGear(gear) { return call('pixels_set_gear', { p_key: key(), p_gear: gear }); },
    // The player's own PIN, four digits, or none to take it away.
    async setPin(pin) { return call('pixels_set_pin', { p_key: key(), p_pin: pin }); },
    // Spends one of the player's fairies, if there is one: `fairies` is how
    // many are left, with `error` where there was none to spend.
    async useFairy() { return call('pixels_use_fairy', { p_key: key() }); },
    // The player's friends, and nobody else. `friendOffer` says whose a
    // friend link's code is, `addFriend` makes the two friends both ways and
    // `unfriend` ends it both ways. A new code closes the old link.
    async people() { return call('pixels_people', { p_key: key() }); },
    async friendOffer(code) { return call('pixels_friend_offer', { p_key: key(), p_code: code }); },
    async addFriend(code) { return call('pixels_add_friend', { p_key: key(), p_code: code }); },
    async unfriend(id) { await call('pixels_unfriend', { p_key: key(), p_friend: id }); },
    async renewInvite() { return call('pixels_renew_invite', { p_key: key() }); },
    /* A PLAYER'S OWN PUZZLES AND RIFTS, by the names the owner's have, so
       the Pixelator saves either. `mine` is everything of the player's:
       their mana, their puzzles, each with its rift's name, whether the
       rift is hidden and whether the puzzle is off, and who has solved how
       much of each rift. A new puzzle in a rift already published is saved
       off, and publishing a rift switches all of its puzzles on. A save the
       database turns down for mana, a full rift or a sixth rift throws with
       `refused` saying which. The owner has rifts of this kind too, apart
       from the ones every player is sent, and is charged no mana for them. */
    own: {
      async mine() { return call('pixels_mine', { p_key: key() }); },
      async all() {
        const got = await this.mine();
        if (!got) throw new Error('no player');
        return got.puzzles.map(p => ({ ...p, day: null, off: !!p.off }));
      },
      async save({ id, name, squares, width, level, colours }) {
        const row = await call('pixels_keep_puzzle', {
          p_key: key(), p_id: id || null, p_name: name, p_squares: squares, p_width: width, p_level: level, p_colours: colours || null,
        });
        if (row.error) throw Object.assign(new Error(row.error), { refused: row.error });
        return { ...row, day: null, off: !!row.off };
      },
      async remove(id) { await call('pixels_drop_puzzle', { p_key: key(), p_id: id }); },
      // A rift just started is hidden by the database, so there is nothing to do.
      async setHidden() {},
      async setTheme(width, level, name) {
        await call('pixels_name_my_level', { p_key: key(), p_width: width, p_level: level, p_name: name || null });
      },
      async publish(width, level, on) {
        return call('pixels_publish_my_level', { p_key: key(), p_width: width, p_level: level, p_on: on });
      },
      async removeLevel(width, level) {
        await call('pixels_delete_my_level', { p_key: key(), p_width: width, p_level: level });
      },
    },
    async rename(name) {
      const me = await call('pixels_rename', { p_key: key(), p_name: name });
      const kept = readGuest();
      try {
        if (!me.error && kept) localStorage.setItem(GUEST, JSON.stringify({ ...kept, name: me.name }));
      } catch { /* the name kept here is only a copy */ }
      return me;
    },
    // The door, for a browser with no player: a new name makes one with
    // that PIN, and a name already playing is let in by its PIN. The key is
    // made here and kept only if the database takes it. A browser that
    // keeps nothing, as a private window may, is told so: the player is
    // made all the same, and the name and PIN bring them back elsewhere.
    async door(name, pin) {
      const made = crypto.randomUUID() + crypto.randomUUID();
      const player = await call('pixels_door', { p_name: name, p_pin: pin, p_key: made });
      if (player.error) return player;
      try { localStorage.setItem(GUEST, JSON.stringify({ key: made, name: player.name })); } catch { return { error: 'storage' }; }
      return player;
    },
    // A guest's player and all that is theirs, gone for good, and with it
    // everything this browser kept for Pixels, their drawings not yet saved
    // among it, so the next player on this phone starts clean. The Sound
    // switch is the phone's, and stays.
    async leave() {
      await call('pixels_leave', { p_key: key() });
      for (const kept of [localStorage, sessionStorage]) {
        try {
          Object.keys(kept).filter(k => k.startsWith('pixels-') && k !== 'pixels-sound').forEach(k => kept.removeItem(k));
        } catch { /* storage refused, so nothing was kept */ }
      }
    },
    // What a player is sent, the owner too: the puzzles of the levels the
    // owner has not hidden, but for those switched off or in no category,
    // and the day's puzzle. Each comes with its level's theme, if the level
    // has one.
    async list() { return call('pixels_puzzles', { p_key: key() }); },
    // The owner reads the tables, which hold every puzzle: the hidden
    // levels' and the days to come too. Each comes with its level's theme,
    // whether the level is hidden, as `hidden`, and whether the puzzle
    // itself is switched off, as `off`.
    async all() {
      const [puzzles, levels, picks] = await Promise.all([
        client.from('pixels_puzzles').select('id, name, squares, width, height, level, colours, created_at, day, hidden').is('maker', null).order('created_at').order('id'),
        client.from('pixels_levels').select('id, level, name, hidden, audience').is('maker', null),
        client.from('pixels_level_players').select('level_id, player_id'),
      ]);
      fail(puzzles.error);
      fail(levels.error);
      fail(picks.error);
      const of = p => levels.data.find(l => l.level === p.level);
      const picked = l => (l?.audience === 'picked' ? picks.data.filter(k => k.level_id === l.id).map(k => k.player_id) : []);
      return puzzles.data.map(p => ({ ...own(p), theme: of(p)?.name ?? null, hidden: !!of(p)?.hidden, picked: picked(of(p)) }));
    },
    async results() {
      return new Map((await call('pixels_results', { p_key: key() })).map(r => [r.puzzle_id, { seconds: r.best_seconds }]));
    },
    async days() {
      return new Map((await call('pixels_days', { p_key: key() })).map(r => [r.day, { seconds: r.seconds }]));
    },
    async record(id, seconds) {
      return call('pixels_record', { p_key: key(), p_puzzle: id, p_seconds: seconds });
    },
    async recordDay(day, seconds) {
      return call('pixels_record_day', { p_key: key(), p_day: day, p_seconds: seconds });
    },
    async board(day) { return call('pixels_board', { p_key: key(), p_day: day }); },

    // The owner's, straight to the tables. `off` saves the puzzle switched
    // off, so no player is sent it.
    async save({ id, name, squares, width, height, level, colours, day, off }) {
      if (id) {
        const { data: before, error: readError } = await client.from('pixels_puzzles').select('squares').eq('id', id).single();
        fail(readError);
        const { data, error } = await client.from('pixels_puzzles')
          .update({ name, squares, width, height, level, colours, day, hidden: !!off, updated_at: new Date().toISOString() }).eq('id', id).select().single();
        fail(error);
        // A redrawn picture is a new puzzle, so everyone's results on it go.
        if (before.squares !== squares) fail((await client.from('pixels_player_results').delete().eq('puzzle_id', id)).error);
        return own(data);
      }
      const { data, error } = await client.from('pixels_puzzles').insert({ name, squares, width, height, level, colours, day, hidden: !!off }).select().single();
      fail(error);
      return own(data);
    },
    async remove(ids) {
      fail((await client.from('pixels_puzzles').delete().in('id', [].concat(ids))).error);
    },
    // Switches one puzzle off, so no player is sent it, or on again.
    async setOff(id, off) {
      fail((await client.from('pixels_puzzles').update({ hidden: off }).eq('id', id)).error);
    },
    // Moves puzzles to another category, or with no level to no category. `off` is their switch once they are there.
    async move(ids, level, off) {
      fail((await client.from('pixels_puzzles').update({ level, hidden: !!off }).in('id', [].concat(ids))).error);
    },
    // A level's theme; an empty name takes it away. Only the name is
    // written, so a hidden level stays hidden. This and the four after it
    // take a board size, which the database's functions no longer read.
    async setTheme(width, level, name) {
      await call('pixels_name_level', { p_width: width, p_level: level, p_name: name || null });
    },
    // Puts the levels in a new order: `levels` is every level number in
    // use, and each becomes its place in the list.
    async orderLevels(width, levels) {
      await call('pixels_order_levels', { p_width: width, p_order: levels });
    },
    // Deletes a category: its puzzles are left in no category, and the
    // categories after it move up one place.
    async removeLevel(width, level) {
      await call('pixels_delete_level', { p_width: width, p_level: level });
    },
    // Hides a level from every player but the owner, or shows it again.
    async setHidden(width, level, hidden) {
      await call('pixels_hide_level', { p_width: width, p_level: level, p_hidden: hidden });
    },
    // Keeps one of the owner's rifts for the players named, or with none
    // named gives it back to everyone.
    async share(width, level, players) {
      await call('pixels_share_level', { p_width: width, p_level: level, p_players: players.length ? players : null });
    },
    // Every player with their results and days, and whether new ones may join.
    async players() {
      const [players, results, days, settings] = await Promise.all([
        client.from('pixels_players').select('id, name, user_id, created_at, last_played_at, picture, picture_colours').order('created_at'),
        client.from('pixels_player_results').select('player_id, puzzle_id, best_seconds'),
        client.from('pixels_player_days').select('player_id, day, seconds'),
        client.from('pixels_settings').select('joining').single(),
      ]);
      [players, results, days, settings].forEach(r => fail(r.error));
      return { players: players.data, results: results.data, days: days.data, joining: settings.data.joining };
    },
    // Whether new players may join, for the owner's switch on Me.
    async joining() {
      const { data: row, error } = await client.from('pixels_settings').select('joining').single();
      fail(error);
      return row.joining;
    },
    async setJoining(on) {
      fail((await client.from('pixels_settings').update({ joining: on }).eq('one', true)).error);
    },
    async removePlayer(id) {
      fail((await client.from('pixels_players').delete().eq('id', id)).error);
    },
    // The rifts players have made, each with its maker and how many puzzles
    // it holds. The owner can hide one, which its maker can publish again,
    // or delete it with its puzzles.
    async playerGates() {
      const [levels, puzzles] = await Promise.all([
        client.from('pixels_levels').select('id, level, name, hidden, maker').not('maker', 'is', null).order('level'),
        client.from('pixels_puzzles').select('maker, width, level').not('maker', 'is', null),
      ]);
      fail(levels.error);
      fail(puzzles.error);
      return levels.data.map(l => {
        const own = puzzles.data.filter(p => p.maker === l.maker && p.level === l.level);
        return { ...l, puzzles: own.length, sizes: [...new Set(own.map(p => p.width))].sort((a, b) => a - b) };
      });
    },
    async hideGate(id) {
      fail((await client.from('pixels_levels').update({ hidden: true }).eq('id', id)).error);
    },
    async deleteGate({ id, maker, level }) {
      fail((await client.from('pixels_puzzles').delete().eq('maker', maker).eq('level', level)).error);
      fail((await client.from('pixels_levels').delete().eq('id', id)).error);
    },
    async clearPicture(id) {
      fail((await client.from('pixels_players').update({ picture: null, picture_colours: null }).eq('id', id)).error);
    },
    async renamePlayer(id, name) {
      fail((await client.from('pixels_players').update({ name }).eq('id', id)).error);
    },
  };

  /* WITH NO CONNECTION. What a player is sent, has solved and is, as the
     database last said, is kept in this browser under `pixels-offline`, and
     given back when the database cannot be reached, so a puzzle plays
     offline. A solve the database cannot take is kept under
     `pixels-waiting` and counts as found here at once; it is sent again as
     the page loads and whenever the connection comes back, and one the
     database turns down, not for want of a connection, is dropped.
     `waiting()` says how many there are. */
  if (cloud) {
    const SNAP = 'pixels-offline', QUEUE = 'pixels-waiting';
    const offline = error => !navigator.onLine || /fetch|network|load failed/i.test(String(error?.message || error));
    const snaps = () => { try { return JSON.parse(localStorage.getItem(SNAP) || '{}'); } catch { return {}; } };
    const snap = (name, value) => { try { localStorage.setItem(SNAP, JSON.stringify({ ...snaps(), [name]: value })); } catch { /* not kept for offline */ } };
    const remembered = (name, fn, out = v => v, back = v => v) => async (...args) => {
      try {
        const value = await fn(...args);
        snap(name, out(value));
        return value;
      } catch (error) {
        const kept = snaps();
        if (offline(error) && name in kept) return back(kept[name]);
        throw error;
      }
    };
    const waiting = () => { try { return JSON.parse(localStorage.getItem(QUEUE) || '[]'); } catch { return []; } };
    const wait = list => { try { localStorage.setItem(QUEUE, JSON.stringify(list)); } catch { /* the solve is lost */ } };
    const { me, list, results, days, record, recordDay } = cloud;
    const withWaiting = (map, kind) => {
      waiting().filter(w => w.kind === kind).forEach(w => {
        const was = map.get(w.key);
        if (!was || w.seconds < was.seconds) map.set(w.key, { seconds: w.seconds });
      });
      return map;
    };
    const toList = m => [...m], toMap = a => new Map(a);
    cloud.me = remembered(`me:${key() || 'account'}`, me);
    cloud.list = remembered('list', list);
    cloud.results = async () => withWaiting(await remembered('results', results, toList, toMap)(), 'puzzle');
    cloud.days = async () => withWaiting(await remembered('days', days, toList, toMap)(), 'day');
    const later = (kind, fn) => async (at, seconds) => {
      try { return await fn(at, seconds); } catch {
        wait([...waiting(), { kind, key: at, seconds }]);
        return { best: seconds, isNew: true, waiting: true };
      }
    };
    cloud.record = later('puzzle', record);
    cloud.recordDay = later('day', recordDay);
    let sending = false;
    const send = async () => {
      if (sending || !navigator.onLine || !waiting().length) return;
      sending = true;
      for (const w of waiting()) {
        const done = () => wait(waiting().filter(x => !(x.kind === w.kind && x.key === w.key && x.seconds === w.seconds)));
        try {
          await (w.kind === 'day' ? recordDay : record)(w.key, w.seconds);
          done();
        } catch (error) {
          if (offline(error)) break;
          done();
        }
      }
      sending = false;
    };
    addEventListener('online', send);
    setTimeout(send, 2000);
    cloud.waiting = () => waiting().length;
    const { own } = cloud;
    if (own) own.mine = remembered(`mine:${key() || 'account'}`, own.mine.bind(own));
    /* THE KEPT COPY FIRST. `kept()` is the player, the puzzles they are
       sent, what they have solved, their days and their own rifts, as the
       database last said and this browser kept them, or null where any of
       the first four is not kept yet: a page draws from it at once, so it
       opens on what it showed last time, and again once the database
       answers, where that differs. */
    cloud.kept = () => {
      const kept = snaps(), me = kept[`me:${key() || 'account'}`];
      if (!me || !kept.list || !kept.results || !kept.days) return null;
      return {
        me,
        list: kept.list,
        results: withWaiting(toMap(kept.results), 'puzzle'),
        days: withWaiting(toMap(kept.days), 'day'),
        mine: kept[`mine:${key() || 'account'}`] ?? null,
      };
    };
  }

  const store = cloud || (local ? preview : null);
  const guest = !!cloud && !member;

  /* COMING IN. Gives the player, or null. A browser with no player gets the
     door in `host`, in place of what was there, and a player who opened a
     friend link is asked there whether to add its sharer. Either way the
     page loads again once it is answered. */
  const entering = async host => {
    if (!cloud) return store ? store.me() : null;
    // Read first, so a friend link's code is kept through the door.
    const code = word();
    let me = await cloud.me(), stale = false;
    if (!me) {
      try { localStorage.removeItem(GUEST); } catch { /* nothing kept */ }
      // The key an icon carried, kept if the database knows it.
      if (carried && !member) {
        me = await call('pixels_me', { p_key: carried });
        if (me) {
          try { localStorage.setItem(GUEST, JSON.stringify({ key: carried, name: me.name })); } catch { /* asked again next time */ }
        } else stale = true;
      }
    }
    const text = (tag, cls, words) => {
      const el = document.createElement(tag);
      el.className = cls;
      el.textContent = words;
      return el;
    };
    // A field by the markup of Design's text input; `input` is the field itself.
    const field = (id, label, attrs) => {
      const wrap = document.createElement('div');
      wrap.className = 'rux--form-item rux--text-input-wrapper';
      const labelWrap = document.createElement('div');
      labelWrap.className = 'rux--text-input__label-wrapper';
      const name = text('label', 'rux--label', label);
      name.htmlFor = id;
      labelWrap.append(name);
      const outer = document.createElement('div');
      outer.className = 'rux--text-input__field-outer-wrapper';
      const inner = document.createElement('div');
      inner.className = 'rux--text-input__field-wrapper';
      const input = document.createElement('input');
      Object.assign(input, { id, className: 'rux--text-input', type: 'text', ...attrs });
      inner.append(input);
      outer.append(inner);
      wrap.append(labelWrap, outer);
      return { wrap, input };
    };
    // The page again, at its own address without the link's code.
    const again = () => {
      const rest = new URLSearchParams(location.search);
      rest.delete('join');
      location.replace(location.pathname + (String(rest) ? `?${rest}` : ''));
    };

    /* A FRIEND LINK ASKS BEFORE IT ADDS. Its code names another player who
       is not a friend yet: their picture and username, Add friend and Not
       now. A code that names nobody, the player themself or a friend is
       dropped without a word. */
    if (me) {
      if (!code) return me;
      let offer = null;
      try { offer = await cloud.friendOffer(code); } catch { /* the link can be opened again */ }
      if (!offer || offer.friend) { forget(); return me; }
      const form = document.createElement('form');
      form.className = 'pixels-join rux--stack-vertical rux--stack-scale-6';
      form.noValidate = true;
      const note = text('p', 'pixels-join-note', '');
      note.setAttribute('aria-live', 'polite');
      const keys = document.createElement('div');
      keys.className = 'pixels-link-keys';
      const add = text('button', 'rux--btn rux--btn--primary', 'Add friend'), skip = text('button', 'rux--btn rux--btn--ghost', 'Not now');
      add.type = 'submit';
      skip.type = 'button';
      keys.append(add, skip);
      form.append(window.Pixels.portrait(offer, true), text('h1', 'rux--type-productive-heading-04', `Add ${offer.name} as a friend?`),
        text('p', 'rux--type-body-01', 'Friends see each other\'s username, picture and rifts.'), note, keys);
      const answered = () => {
        try { sessionStorage.removeItem(WORD); } catch { /* nothing kept */ }
        again();
      };
      form.addEventListener('submit', async e => {
        e.preventDefault();
        add.disabled = skip.disabled = true;
        let made;
        try { made = await cloud.addFriend(code); } catch { made = { error: 'lost' }; }
        if (!made.error) { answered(); return; }
        add.disabled = skip.disabled = false;
        note.textContent = made.error === 'word' ? 'This link is no longer open. Ask for a new one.' : 'That did not go through. Try again.';
      });
      skip.addEventListener('click', answered);
      host.replaceChildren(form);
      return null;
    }

    /* THE DOOR is one form and one call: a name, a PIN of four digits and
       Play. A new name makes a player with that PIN, and a name already
       playing is let in by its PIN, on a key of this browser's own. */
    const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
    const refusal = ({ error, left, minutes }) => ({
      name: 'A name is 1 to 20 letters.',
      pin: 'A PIN is four digits.',
      weak: 'That PIN is too easy to guess. Pick another.',
      taken: 'That name is taken. Try another.',
      wrong: `That name is taken. If it is yours, the PIN is wrong. ${count(left, 'try', 'tries')} left.`,
      locked: `Too many wrong PINs for that name. Try again in ${count(minutes, 'minute', 'minutes')}.`,
      closed: 'Pixels is not taking new players just now.',
      busy: 'Pixels is full for the moment. Try again in a little while.',
      slow: 'Too many tries from here. Try again in an hour.',
      storage: 'You are in, but this browser will not keep you. Close private browsing, then come in with the same name and PIN.',
    }[error] || 'That did not go through. Try again.');
    const form = document.createElement('form');
    form.className = 'pixels-join rux--stack-vertical rux--stack-scale-6';
    form.noValidate = true;
    form.append(text('h1', 'rux--type-productive-heading-04', 'Pixels'));
    form.append(text('p', 'rux--type-body-01', stale ? 'This icon no longer opens a player. Your name and PIN still do.'
      : 'Pick a name and a PIN to play. The same two bring you back on any phone.'));
    // Named as a log-in's fields are, so a browser offers to keep the two.
    const who = field('pixels-join-name', 'Name', { maxLength: 20, autocomplete: 'username', required: true });
    const pin = field('pixels-join-pin', 'PIN, four digits', { maxLength: 4, inputMode: 'numeric', autocomplete: 'current-password', type: 'password', required: true });
    const note = text('p', 'pixels-join-note', '');
    note.setAttribute('aria-live', 'polite');
    const go = text('button', 'rux--btn rux--btn--primary', 'Play');
    go.type = 'submit';
    form.append(who.wrap, pin.wrap, note, go);
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const name = who.input.value.trim();
      if (!name) { note.textContent = 'Type a name first.'; return; }
      if (!/^\d{4}$/.test(pin.input.value)) { note.textContent = 'A PIN is four digits.'; return; }
      go.disabled = true;
      note.textContent = '';
      let player;
      try { player = await cloud.door(name, pin.input.value); } catch { player = { error: 'lost' }; }
      if (!player.error) { again(); return; }
      go.disabled = false;
      note.textContent = refusal(player);
    });
    // An account's way in, which an app on the home screen has no address bar for.
    const login = text('a', 'rux--link', 'Log in with an account');
    login.href = '/login/?next=/pixels/';
    host.replaceChildren(form, login);
    who.input.focus();
    return null;
  };

  // The bar of places shows once there is a player: at once for an account
  // and the local preview, and for a guest when `enter` finds theirs. So does
  // the header a wide screen has, whose panel app.js's `shell` then fills.
  const places = document.querySelector('.game-places'), head = document.querySelector('.game-header');
  const show = () => {
    if (places) places.hidden = false;
    if (head) head.hidden = false;
  };
  if (member || (!client && local)) show();
  const enter = async host => {
    const me = await entering(host);
    if (me) {
      show();
      window.Pixels.shell?.(me);
    }
    return me;
  };

  // A page drawn from the kept copy shows the header and the places at
  // once, as `enter` does once the database answers.
  const early = me => {
    show();
    window.Pixels.shell?.(me);
  };

  window.Pixels = Object.assign(window.Pixels || {}, {
    data: store,
    early,
    preview: !cloud && local,
    owner,
    guest,
    enter,
    carry,
  });
  // A page that asks for no player, as the owner's two do, still has the
  // header's panel to fill, and an account or the preview is here already.
  if (member || (!client && local)) window.Pixels.shell?.();
})();
