/* ==========================================================================
   data.js — where puzzles and best times are kept
   --------------------------------------------------------------------------
   Three tables: pixels_puzzles, every puzzle, shared by every account that
   can open Pixels; pixels_results, each account's best time and most stars
   on each puzzle it has solved; and pixels_daily, the same for each puzzle
   of the day it has solved. `results` gives a Map of puzzle id to
   { seconds, stars } and `days` a Map of day to the same; `record` and
   `recordDay` keep the better of each. The client is the account's, from
   /account.js.

   THE LOCAL PREVIEW, `npm run serve` on :8640, has no log-in, so there the
   same calls read and write this browser's storage instead, starting from
   STARTERS. Only that address does: anywhere else, no client is an error.

   Every value from the database is written with textContent by the pages.
   ========================================================================== */
(() => {
  'use strict';

  // The first level, invented for the game. Each is solvable by logic alone.
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
    ['Music note', '.....####.|.....#####|.....#..##|.....#...#|.....#....|.....#....|..####....|.#####....|.#####....|..###.....'],
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
    };
  };
  // The better of two results: the shorter time and the most stars.
  const better = (was, seconds, stars) => ({
    seconds: Math.min(seconds, was?.seconds ?? seconds), stars: Math.max(stars, was?.stars ?? stars),
  });
  const write = db => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* preview only */ } };
  const preview = {
    // A puzzle kept before levels and sizes were is ten a side, in level 1.
    async list() { return read().puzzles.map(p => ({ width: 10, height: 10, level: 1, colours: null, ...p })); },
    async days() { return new Map(Object.entries(read().days || {})); },
    async recordDay(day, seconds, stars) {
      const db = read();
      db.days ||= {};
      const was = db.days[day];
      db.days[day] = better(was, seconds, stars);
      write(db);
      return { best: db.days[day].seconds, stars: db.days[day].stars, isNew: !was || seconds < was.seconds };
    },
    // A result kept before stars were is a bare time.
    async results() {
      return new Map(Object.entries(read().results).map(([id, r]) => [id, typeof r === 'number' ? { seconds: r, stars: 1 } : r]));
    },
    async save({ id, name, squares, width, height, level, colours }) {
      const db = read();
      if (id) {
        const p = db.puzzles.find(q => q.id === id);
        if (p.squares !== squares) delete db.results[id];
        Object.assign(p, { name, squares, width, height, level, colours });
        write(db);
        return p;
      }
      const p = { id: `p-${Date.now()}`, name, squares, width, height, level, colours, created_at: new Date().toISOString() };
      db.puzzles.push(p);
      write(db);
      return p;
    },
    async remove(id) {
      const db = read();
      db.puzzles = db.puzzles.filter(p => p.id !== id);
      delete db.results[id];
      write(db);
    },
    async record(id, seconds, stars) {
      const db = read();
      const was = typeof db.results[id] === 'number' ? { seconds: db.results[id], stars: 1 } : db.results[id];
      db.results[id] = better(was, seconds, stars);
      write(db);
      return { best: db.results[id].seconds, stars: db.results[id].stars, isNew: !was || seconds < was.seconds };
    },
  };

  // -- the database -----------------------------------------------------------
  const fail = error => { if (error) throw error; };
  const cloud = client && {
    async list() {
      const { data, error } = await client.from('pixels_puzzles')
        .select('id, name, squares, width, height, level, colours, created_at').order('created_at').order('id');
      fail(error);
      return data;
    },
    async results() {
      const { data, error } = await client.from('pixels_results').select('puzzle_id, best_seconds, stars');
      fail(error);
      return new Map(data.map(r => [r.puzzle_id, { seconds: r.best_seconds, stars: r.stars }]));
    },
    async days() {
      const { data, error } = await client.from('pixels_daily').select('day, seconds, stars');
      fail(error);
      return new Map(data.map(r => [r.day, { seconds: r.seconds, stars: r.stars }]));
    },
    async recordDay(day, seconds, stars) {
      const { data: was, error } = await client.from('pixels_daily')
        .select('seconds, stars').eq('day', day).maybeSingle();
      fail(error);
      const now = better(was, seconds, stars);
      if (!was || now.seconds !== was.seconds || now.stars !== was.stars) {
        const { data: { session } } = await client.auth.getSession();
        fail((await client.from('pixels_daily').upsert({
          user_id: session.user.id, day, ...now, solved_at: new Date().toISOString(),
        })).error);
      }
      return { best: now.seconds, stars: now.stars, isNew: !was || seconds < was.seconds };
    },
    async save({ id, name, squares, width, height, level, colours }) {
      if (id) {
        const { data: before, error: readError } = await client.from('pixels_puzzles').select('squares').eq('id', id).single();
        fail(readError);
        const { data, error } = await client.from('pixels_puzzles')
          .update({ name, squares, width, height, level, colours, updated_at: new Date().toISOString() }).eq('id', id).select().single();
        fail(error);
        // A redrawn picture is a new puzzle, so its old best time goes.
        if (before.squares !== squares) fail((await client.from('pixels_results').delete().eq('puzzle_id', id)).error);
        return data;
      }
      const { data, error } = await client.from('pixels_puzzles').insert({ name, squares, width, height, level, colours }).select().single();
      fail(error);
      return data;
    },
    async remove(id) {
      fail((await client.from('pixels_puzzles').delete().eq('id', id)).error);
    },
    async record(id, seconds, stars) {
      const { data: was, error } = await client.from('pixels_results')
        .select('best_seconds, stars').eq('puzzle_id', id).maybeSingle();
      fail(error);
      const best = Math.min(seconds, was?.best_seconds ?? seconds), most = Math.max(stars, was?.stars ?? stars);
      if (!was || best !== was.best_seconds || most !== was.stars) {
        const { data: { session } } = await client.auth.getSession();
        fail((await client.from('pixels_results').upsert({
          user_id: session.user.id, puzzle_id: id, best_seconds: best, stars: most, solved_at: new Date().toISOString(),
        })).error);
      }
      return { best, stars: most, isNew: !was || seconds < was.best_seconds };
    },
  };

  const store = cloud || (local ? preview : null);

  window.Pixels = Object.assign(window.Pixels || {}, {
    data: store,
    preview: !cloud && local,
  });
})();
