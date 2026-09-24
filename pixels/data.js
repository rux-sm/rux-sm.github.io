/* ==========================================================================
   data.js — where puzzles and best times are kept
   --------------------------------------------------------------------------
   Two tables: pixels_puzzles, every puzzle, shared by every account that can
   open Pixels, and pixels_results, each account's best time on each puzzle
   it has solved. The client is the account's, from /account.js.

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
      puzzles: STARTERS.map((p, i) => ({ id: `p-${i + 1}`, ...p, created_at: new Date(t + i * 1000).toISOString() })),
      results: {},
    };
  };
  const write = db => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* preview only */ } };
  const preview = {
    async list() { return read().puzzles; },
    async results() { return new Map(Object.entries(read().results)); },
    async save({ id, name, squares }) {
      const db = read();
      if (id) {
        const p = db.puzzles.find(q => q.id === id);
        if (p.squares !== squares) delete db.results[id];
        Object.assign(p, { name, squares });
        write(db);
        return p;
      }
      const p = { id: `p-${Date.now()}`, name, squares, created_at: new Date().toISOString() };
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
    async record(id, seconds) {
      const db = read();
      const best = db.results[id];
      if (best != null && best <= seconds) return { best, isNew: false };
      db.results[id] = seconds;
      write(db);
      return { best: seconds, isNew: true };
    },
  };

  // -- the database -----------------------------------------------------------
  const fail = error => { if (error) throw error; };
  const cloud = client && {
    async list() {
      const { data, error } = await client.from('pixels_puzzles')
        .select('id, name, squares, created_at').order('created_at').order('id');
      fail(error);
      return data;
    },
    async results() {
      const { data, error } = await client.from('pixels_results').select('puzzle_id, best_seconds');
      fail(error);
      return new Map(data.map(r => [r.puzzle_id, r.best_seconds]));
    },
    async save({ id, name, squares }) {
      if (id) {
        const { data: before, error: readError } = await client.from('pixels_puzzles').select('squares').eq('id', id).single();
        fail(readError);
        const { data, error } = await client.from('pixels_puzzles')
          .update({ name, squares, updated_at: new Date().toISOString() }).eq('id', id).select().single();
        fail(error);
        // A redrawn picture is a new puzzle, so its old best time goes.
        if (before.squares !== squares) fail((await client.from('pixels_results').delete().eq('puzzle_id', id)).error);
        return data;
      }
      const { data, error } = await client.from('pixels_puzzles').insert({ name, squares }).select().single();
      fail(error);
      return data;
    },
    async remove(id) {
      fail((await client.from('pixels_puzzles').delete().eq('id', id)).error);
    },
    async record(id, seconds) {
      const { data: row, error } = await client.from('pixels_results')
        .select('best_seconds').eq('puzzle_id', id).maybeSingle();
      fail(error);
      if (row && row.best_seconds <= seconds) return { best: row.best_seconds, isNew: false };
      const { data: { session } } = await client.auth.getSession();
      fail((await client.from('pixels_results').upsert({
        user_id: session.user.id, puzzle_id: id, best_seconds: seconds, solved_at: new Date().toISOString(),
      })).error);
      return { best: seconds, isNew: true };
    },
  };

  const store = cloud || (local ? preview : null);

  window.Pixels = Object.assign(window.Pixels || {}, {
    data: store,
    preview: !cloud && local,
  });
})();
