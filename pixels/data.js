/* ==========================================================================
   data.js — who is playing, and where puzzles and results are kept
   --------------------------------------------------------------------------
   A PLAYER is an account that can open Pixels, or a GUEST: someone with no
   account who came by an invite link, typed a name and a PIN, and whose
   browser made a long random key, kept under `pixels-guest`. The database
   knows a guest by that key's hash, and a browser with no key by the name
   and the PIN, which earn it a key of its own.

   Nobody but the owner reads a table. Everything a player does goes through
   database functions that first find the player, from the log-in or from the
   key: `pixels_puzzles`, `pixels_results`, `pixels_days`, `pixels_record`,
   `pixels_record_day`, `pixels_board`, `pixels_me`, `pixels_join`,
   `pixels_set_picture`, `pixels_rename`, `pixels_people`, `pixels_befriend`,
   `pixels_renew_invite`, `pixels_set_pin`, `pixels_login`, and for a player's
   own puzzles and gates
   `pixels_mine`, `pixels_keep_puzzle`, `pixels_drop_puzzle`,
   `pixels_name_my_level`, `pixels_publish_my_level` and
   `pixels_delete_my_level`. An invite link is `?join=` and a player's own
   code, and whoever joins by it is that player's friend both ways.
   `results` gives a Map of puzzle id to { seconds } and `days` a Map
   of day to the same; `record` and `recordDay` keep the shorter time, and
   `board` gives a day's ranking and the all-time one. The client is
   /account.js's, with a log-in or without.

   `enter()` is what a page calls first: it says whether there is a player,
   and where there is not it draws the door, one form of a name and a PIN.
   Where there is one it puts their invite code in the address, as `invite()`
   does. `carry()` puts a guest's key in the address for a home screen icon
   to keep.
   `me` gives the player with their picture and how many sprites they have
   found, and `setPicture` and `rename` change their own picture and username.

   `list` is what a player is sent, for every account, the owner's too: no
   hidden category, no puzzle that is off, none in no category.

   THE OWNER makes and edits puzzles and sees the players, by the tables'
   own rules: `all`, which is every puzzle there is, `save`, `remove`,
   `setOff`, `move`, `setTheme`, `setHidden`, `orderLevels`, `removeLevel`,
   `players`, `setJoining`, `share`, `renamePlayer` and `removePlayer`. `move` and
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
      return { id: 'preview', name: 'Preview', picture: null, colours: null, code: 'preview', ...db.me, found: Object.keys(db.results).length };
    },
    // The preview has nobody else in it.
    async people() { return []; },
    async befriend() {},
    async renewInvite() { return this.me(); },
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
  // The invite word, from the link, kept while this tab is open.
  const word = () => {
    const given = new URLSearchParams(location.search).get('join');
    try {
      if (given) sessionStorage.setItem(WORD, given);
      return given || sessionStorage.getItem(WORD) || '';
    } catch { return given || ''; }
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
    // The player's own PIN, four digits, or none to take it away; and another
    // phone logging in by it, which gets a key of its own, kept as a guest's is.
    async setPin(pin) { return call('pixels_set_pin', { p_key: key(), p_pin: pin }); },
    async login(name, pin) {
      const made = crypto.randomUUID() + crypto.randomUUID();
      const player = await call('pixels_login', { p_name: name, p_pin: pin, p_key: made });
      if (!player.error) localStorage.setItem(GUEST, JSON.stringify({ key: made, name: player.name }));
      return player;
    },
    // Every other player, friends first; adding one is one-way, and their
    // published gates are then sent. A new invite code closes the old link.
    async people() { return call('pixels_people', { p_key: key() }); },
    async befriend(id, on) { await call('pixels_befriend', { p_key: key(), p_friend: id, p_on: on }); },
    async renewInvite() { return call('pixels_renew_invite', { p_key: key() }); },
    /* A PLAYER'S OWN PUZZLES AND GATES, by the names the owner's have, so
       the Pixelator saves either. `mine` is everything of the player's:
       their mana, their puzzles, each with its gate's name and whether the
       gate is hidden, and who has solved how much of each gate. A save the
       database turns down for mana, a full gate or a sixth gate throws with
       `refused` saying which. The owner has gates of this kind too, apart
       from the ones every player is sent, and is charged no mana for them. */
    own: {
      async mine() { return call('pixels_mine', { p_key: key() }); },
      async all() {
        const got = await this.mine();
        if (!got) throw new Error('no player');
        return got.puzzles.map(p => ({ ...p, day: null, off: false }));
      },
      async save({ id, name, squares, width, level, colours }) {
        const row = await call('pixels_keep_puzzle', {
          p_key: key(), p_id: id || null, p_name: name, p_squares: squares, p_width: width, p_level: level, p_colours: colours || null,
        });
        if (row.error) throw Object.assign(new Error(row.error), { refused: row.error });
        return { ...row, day: null, off: false };
      },
      async remove(id) { await call('pixels_drop_puzzle', { p_key: key(), p_id: id }); },
      // A gate just started is hidden by the database, so there is nothing to do.
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
      if (!me.error && kept) localStorage.setItem(GUEST, JSON.stringify({ ...kept, name: me.name }));
      return me;
    },
    // A new guest: the key is made here and kept only if the database takes it.
    async join(name) {
      const made = crypto.randomUUID() + crypto.randomUUID();
      const player = await call('pixels_join', { p_name: name, p_key: made, p_word: word() });
      if (!player.error) localStorage.setItem(GUEST, JSON.stringify({ key: made, name: player.name }));
      return player;
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
    // Keeps one of the owner's gates for the players named, or with none
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
    async setJoining(on) {
      fail((await client.from('pixels_settings').update({ joining: on }).eq('one', true)).error);
    },
    async removePlayer(id) {
      fail((await client.from('pixels_players').delete().eq('id', id)).error);
    },
    // The gates players have made, each with its maker and how many puzzles
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

  const store = cloud || (local ? preview : null);
  const guest = !!cloud && !member;

  /* MANAGING AND THE PLAYERS ARE THE OWNER'S. The database refuses
     anyone else; this only keeps the ways in out of their sight. The local
     preview has no log-in and is whoever runs it. */
  if (!owner) {
    document.querySelectorAll('.rux--side-nav a[href="manage.html"], .rux--side-nav a[href="players.html"]')
      .forEach(a => a.closest('li')?.remove());
  }

  /* COMING IN. Gives the player, or null. A guest with no player yet gets
     the door in `host`, in place of what was there, and the page loads
     again once they are in. */
  const entering = async host => {
    if (!cloud) return store ? store.me() : null;
    const me = await cloud.me();
    if (me) return me;
    try { localStorage.removeItem(GUEST); } catch { /* nothing kept */ }
    // The key an icon carried, kept if the database knows it.
    let stale = false;
    if (carried && !member) {
      const mine = await call('pixels_me', { p_key: carried });
      if (mine) {
        try { localStorage.setItem(GUEST, JSON.stringify({ key: carried, name: mine.name })); } catch { /* asked again next time */ }
        return mine;
      }
      stale = true;
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
    // The page again, at its own address without the invite code.
    const again = () => {
      const rest = new URLSearchParams(location.search);
      rest.delete('join');
      location.replace(location.pathname + (String(rest) ? `?${rest}` : ''));
    };
    /* THE DOOR is one form: a name, a PIN of four digits and Play. By an
       invite link a new name makes a player, who is given that PIN. A name
       already playing is let in by its PIN, with a link or without, and this
       browser gets a key of its own. It answers nothing when the player is
       in, or the words to show. */
    const invited = !!word();
    const knock = async (name, pin) => {
      const lost = 'That did not go through. Try again.';
      let joined = { error: 'word' };
      if (invited) {
        try { joined = await cloud.join(name); } catch { return lost; }
        if (!joined.error) {
          // The player is in either way: a PIN that will not save is set on Me.
          for (let tries = 0; tries < 2; tries++) {
            try { await cloud.setPin(pin); break; } catch { /* once more */ }
          }
          return '';
        }
        if (joined.error === 'name') return 'A name is 1 to 20 letters.';
        if (!['taken', 'word', 'closed'].includes(joined.error)) return lost;
      }
      let back;
      try { back = await cloud.login(name, pin); } catch { return lost; }
      if (!back.error) return '';
      const taken = joined.error === 'taken';
      if (back.error === 'locked') {
        const wait = `${back.minutes} ${back.minutes === 1 ? 'minute' : 'minutes'}`;
        return taken ? `That name is taken. If it is yours, try again in ${wait}.` : `Too many wrong tries. Try again in ${wait}.`;
      }
      if (back.error !== 'wrong') return lost;
      // Tries left are counted only for a name that has a PIN.
      if (back.left) {
        const left = `${back.left} ${back.left === 1 ? 'try' : 'tries'} left.`;
        return taken ? `That name is taken. If it is yours, the PIN is wrong. ${left}` : `That name and PIN do not match. ${left}`;
      }
      if (taken) return 'That name is taken. Try another.';
      if (!invited) return 'No player has that name and PIN. New here? Ask a friend for their link.';
      return joined.error === 'closed' ? 'Pixels is not taking new players just now.' : 'This invite link is no longer open. Ask a friend for a new one.';
    };
    const form = document.createElement('form');
    form.className = 'pixels-join rux--stack-vertical rux--stack-scale-6';
    form.noValidate = true;
    form.append(text('h1', 'rux--type-productive-heading-04', 'Pixels'));
    form.append(text('p', 'rux--type-body-01', invited ? 'Pick a name and a PIN to play. The same two bring you back on any phone.'
      : stale ? 'This icon no longer opens a player. Type your name and PIN, or ask a friend for their link.'
        : 'Type your name and PIN to play. New here? Ask a friend for their link.'));
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
      const said = await knock(name, pin.input.value);
      if (!said) { again(); return; }
      go.disabled = false;
      note.textContent = said;
    });
    if (invited) host.replaceChildren(form);
    else {
      // An account's way in, which an app on the home screen has no address bar for.
      const login = text('a', 'rux--link', 'Log in with an account');
      login.href = '/login/?next=/pixels/';
      host.replaceChildren(form, login);
    }
    who.input.focus();
    return null;
  };

  /* EVERY ADDRESS A PLAYER COPIES IS THEIR INVITE LINK. Once there is a
     player the address carries `?join=` and their own code, so the address
     bar, a bookmark and the browser's Share all hand on a link that lets a
     friend in. Friends calls it again when the code changes. */
  const invite = code => {
    if (!cloud || !code) return;
    const rest = new URLSearchParams(location.search);
    if (rest.get('join') === code) return;
    rest.set('join', code);
    history.replaceState(history.state, '', `${location.pathname}?${rest}${location.hash}`);
  };

  // The bar of places shows once there is a player: at once for an account
  // and the local preview, and for a guest when `enter` finds theirs.
  const places = document.querySelector('.pixels-places');
  if (places && (member || (!client && local))) places.hidden = false;
  const enter = async host => {
    const me = await entering(host);
    if (me && places) places.hidden = false;
    if (me) invite(me.code);
    return me;
  };

  window.Pixels = Object.assign(window.Pixels || {}, {
    data: store,
    preview: !cloud && local,
    owner,
    guest,
    enter,
    carry,
    invite,
  });
})();
