/* ==========================================================================
   data.js — who is playing, and where puzzles and results are kept
   --------------------------------------------------------------------------
   A PLAYER is an account that can open Pixels, or a GUEST: someone with no
   account who came by an invite link, typed a name, and whose browser made a
   long random key, kept under `pixels-guest`. The database knows a guest by
   that key's hash.

   Nobody but the owner reads a table. Everything a player does goes through
   database functions that first find the player, from the log-in or from the
   key: `pixels_puzzles`, `pixels_results`, `pixels_days`, `pixels_record`,
   `pixels_record_day`, `pixels_board`, `pixels_me` and `pixels_join`.
   `results` gives a Map of puzzle id to { seconds } and `days` a Map
   of day to the same; `record` and `recordDay` keep the shorter time, and
   `board` gives a day's ranking and the all-time one. The client is
   /account.js's, with a log-in or without.

   `enter()` is what a page calls first: it says whether there is a player,
   and where there is not it draws the name form, or says the link is needed.

   THE OWNER makes and edits puzzles and sees the players, by the tables'
   own rules: `save`, `remove`, `setOff`, `move`, `setTheme`, `setHidden`,
   `orderLevels`, `removeLevel`, `players`, `setWord`, `renamePlayer` and
   `removePlayer`. A puzzle with no `level` is in no category, and no player
   is sent it.

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
  const levelRow = (db, width, level) => {
    db.levels ||= [];
    let row = db.levels.find(l => l.width === width && l.level === level);
    if (!row) db.levels.push(row = { width, level, name: null, hidden: false });
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
    async list() {
      const db = read();
      return db.puzzles.map(p => ({ width: 10, height: 10, level: 1, colours: null, ...p })).map(p => {
        const row = (db.levels || []).find(l => l.width === p.width && l.level === p.level);
        return { ...p, off: !!p.off, theme: row?.name ?? null, hidden: !!row?.hidden };
      });
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
    async move(id, level, off) {
      const db = read();
      Object.assign(db.puzzles.find(p => p.id === id), { level, off: !!off });
      write(db);
    },
    async setTheme(width, level, name) {
      const db = read();
      levelRow(db, width, level).name = name || null;
      write(db);
    },
    async setHidden(width, level, hidden) {
      const db = read();
      levelRow(db, width, level).hidden = hidden;
      write(db);
    },
    async orderLevels(width, levels) {
      const db = read(), place = n => levels.indexOf(n) + 1;
      db.puzzles.forEach(p => { if ((p.width ?? 10) === width && !p.day && p.level !== null) p.level = place(p.level ?? 1); });
      (db.levels || []).forEach(l => { if (l.width === width) l.level = place(l.level); });
      write(db);
    },
    async removeLevel(width, level) {
      const db = read(), after = n => (n === level ? null : n > level ? n - 1 : n);
      db.puzzles.forEach(p => { if ((p.width ?? 10) === width && !p.day && p.level !== null) p.level = after(p.level ?? 1); });
      db.levels = (db.levels || []).filter(l => l.width !== width || l.level !== level);
      db.levels.forEach(l => { if (l.width === width) l.level = after(l.level); });
      write(db);
    },
    async remove(id) {
      const db = read();
      db.puzzles = db.puzzles.filter(p => p.id !== id);
      delete db.results[id];
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
    async me() { return { id: 'preview', name: 'Preview' }; },
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
    // A new guest: the key is made here and kept only if the database takes it.
    async join(name) {
      const made = crypto.randomUUID() + crypto.randomUUID();
      const player = await call('pixels_join', { p_name: name, p_key: made, p_word: word() });
      if (!player.error) localStorage.setItem(GUEST, JSON.stringify({ key: made, name: player.name }));
      return player;
    },
    // A player is sent the levels the owner has not hidden and the day's
    // puzzle; the owner reads the table, which holds the hidden levels and
    // the days to come too.
    // Each puzzle comes with its level's theme, if the level has one, and
    // for the owner with whether the level is hidden, as `hidden`, and
    // whether the puzzle itself is switched off, as `off`. A player is sent
    // neither kind, and no puzzle that is in no category.
    async list() {
      if (!owner) return call('pixels_puzzles', { p_key: key() });
      const [puzzles, levels] = await Promise.all([
        client.from('pixels_puzzles').select('id, name, squares, width, height, level, colours, created_at, day, hidden').order('created_at').order('id'),
        client.from('pixels_levels').select('width, level, name, hidden'),
      ]);
      fail(puzzles.error);
      fail(levels.error);
      const of = p => levels.data.find(l => l.width === p.width && l.level === p.level);
      return puzzles.data.map(p => ({ ...own(p), theme: of(p)?.name ?? null, hidden: !!of(p)?.hidden }));
    },
    async results() {
      return new Map((await call('pixels_results', { p_key: key() })).map(r => [r.puzzle_id, { seconds: r.best_seconds }]));
    },
    async days() {
      return new Map((await call('pixels_days', { p_key: key() })).map(r => [r.day, { seconds: r.seconds }]));
    },
    // The database's two functions still take a number of stars, 1 to 3,
    // which no page shows; every solve sends 3.
    async record(id, seconds) {
      return call('pixels_record', { p_key: key(), p_puzzle: id, p_seconds: seconds, p_stars: 3 });
    },
    async recordDay(day, seconds) {
      return call('pixels_record_day', { p_key: key(), p_day: day, p_seconds: seconds, p_stars: 3 });
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
    async remove(id) {
      fail((await client.from('pixels_puzzles').delete().eq('id', id)).error);
    },
    // Switches one puzzle off, so no player is sent it, or on again.
    async setOff(id, off) {
      fail((await client.from('pixels_puzzles').update({ hidden: off }).eq('id', id)).error);
    },
    // Moves a puzzle to another category of its size, or with no level to no
    // category. `off` is its switch once it is there.
    async move(id, level, off) {
      fail((await client.from('pixels_puzzles').update({ level, hidden: !!off }).eq('id', id)).error);
    },
    // A level's theme, for boards of one size; an empty name takes it away.
    // Only the name is written, so a hidden level stays hidden.
    async setTheme(width, level, name) {
      fail((await client.from('pixels_levels').upsert({ width, level, name: name || null })).error);
    },
    // Puts the levels of one board size in a new order: `levels` is every
    // level number in use at that size, and each becomes its place in the list.
    async orderLevels(width, levels) {
      await call('pixels_order_levels', { p_width: width, p_order: levels });
    },
    // Deletes a category of one board size: its puzzles are left in no
    // category, and the categories after it move up one place.
    async removeLevel(width, level) {
      await call('pixels_delete_level', { p_width: width, p_level: level });
    },
    // Hides a level from every player but the owner, or shows it again.
    async setHidden(width, level, hidden) {
      fail((await client.from('pixels_levels').upsert({ width, level, hidden })).error);
    },
    // Every player with their results and days, and the invite word.
    async players() {
      const [players, results, days, settings] = await Promise.all([
        client.from('pixels_players').select('id, name, user_id, created_at, last_played_at').order('created_at'),
        client.from('pixels_player_results').select('player_id, puzzle_id, best_seconds'),
        client.from('pixels_player_days').select('player_id, day, seconds'),
        client.from('pixels_settings').select('invite_word').single(),
      ]);
      [players, results, days, settings].forEach(r => fail(r.error));
      return { players: players.data, results: results.data, days: days.data, word: settings.data.invite_word };
    },
    async setWord(to) {
      fail((await client.from('pixels_settings').update({ invite_word: to }).eq('one', true)).error);
    },
    async removePlayer(id) {
      fail((await client.from('pixels_players').delete().eq('id', id)).error);
    },
    async renamePlayer(id, name) {
      fail((await client.from('pixels_players').update({ name }).eq('id', id)).error);
    },
  };

  const store = cloud || (local ? preview : null);
  const guest = !!cloud && !member;

  /* MAKING, EDITING AND THE PLAYERS ARE THE OWNER'S. The database refuses
     anyone else; this only keeps the ways in out of their sight. The local
     preview has no log-in and is whoever runs it. */
  if (!owner) {
    document.querySelectorAll('.rux--side-nav a[href="make.html"], .rux--side-nav a[href="players.html"]')
      .forEach(a => a.closest('li')?.remove());
  }

  /* COMING IN. Gives the player, or null. A guest with no player yet gets
     the name form in `host`, in place of what was there, and the page loads
     again once the name is taken; without the invite word they are told the
     link is needed. */
  const enter = async host => {
    if (!cloud) return store ? store.me() : null;
    const me = await cloud.me();
    if (me) return me;
    try { localStorage.removeItem(GUEST); } catch { /* nothing kept */ }
    const text = (tag, cls, words) => {
      const el = document.createElement(tag);
      el.className = cls;
      el.textContent = words;
      return el;
    };
    const form = document.createElement('form');
    form.className = 'pixels-join rux--stack-vertical rux--stack-scale-6';
    form.noValidate = true;
    form.append(text('h1', 'rux--type-productive-heading-04', 'Pixels'));
    if (!word()) {
      form.append(text('p', 'rux--type-body-01', 'Pixels opens from an invite link. Ask for one to play.'));
      host.replaceChildren(form);
      return null;
    }
    form.append(text('p', 'rux--type-body-01', 'Type a name to play. Everyone playing sees it on the leaderboard.'));
    const field = document.createElement('div');
    field.className = 'rux--form-item rux--text-input-wrapper';
    const labelWrap = document.createElement('div');
    labelWrap.className = 'rux--text-input__label-wrapper';
    const label = text('label', 'rux--label', 'Name');
    label.htmlFor = 'pixels-join-name';
    labelWrap.append(label);
    const outer = document.createElement('div');
    outer.className = 'rux--text-input__field-outer-wrapper';
    const inner = document.createElement('div');
    inner.className = 'rux--text-input__field-wrapper';
    const input = document.createElement('input');
    Object.assign(input, { id: 'pixels-join-name', className: 'rux--text-input', type: 'text', maxLength: 20, autocomplete: 'nickname', required: true });
    inner.append(input);
    outer.append(inner);
    field.append(labelWrap, outer);
    const note = text('p', 'pixels-join-note', '');
    note.setAttribute('aria-live', 'polite');
    const go = text('button', 'rux--btn rux--btn--primary', 'Play');
    go.type = 'submit';
    form.append(field, note, go);
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const name = input.value.trim();
      if (!name) { note.textContent = 'Type a name first.'; return; }
      go.disabled = true;
      let player;
      try { player = await cloud.join(name); } catch { player = { error: 'lost' }; }
      if (!player.error) { location.replace(location.pathname); return; }
      go.disabled = false;
      note.textContent = {
        taken: 'That name is taken. Try another.',
        name: 'A name is 1 to 20 letters.',
        word: 'This invite link is no longer open. Ask for a new one.',
      }[player.error] || 'That did not go through. Try again.';
    });
    host.replaceChildren(form);
    input.focus();
    return null;
  };

  window.Pixels = Object.assign(window.Pixels || {}, {
    data: store,
    preview: !cloud && local,
    owner,
    guest,
    enter,
  });
})();
