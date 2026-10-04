/* ==========================================================================
   play.js — one puzzle
   --------------------------------------------------------------------------
   Fill a square or cross it out with X. Filling a square that is not in the
   picture is a mistake: it is crossed out in red and costs a star. A number
   greys out once its run of squares is filled, a line that is finished
   crosses out its own empty squares, and the puzzle is solved when every
   square of the picture is filled.

   THREE STARS to start. A mistake or a hint costs one, and the last is never
   lost. Hint points at a wrong X if there is one, and otherwise at the line
   where the numbers decide the most squares from what is on the board.

   THE BOARD WAITS BEHIND "TAP TO START", or "Tap to continue" for a game
   in progress. The numbers show and the clock runs from that tap, so a best
   time does not count the page loading or being read. It is also what lets
   a phone play the sounds at all: a phone starts a page's sound only from a
   tap, never from a drag, and a puzzle is usually begun with a drag.

   UNDO takes back the last tap or drag, with the squares a finished line
   crossed out for it, as far back as the puzzle's start, and REDO puts it
   back until a new move is made. Neither touches a mistake: the red X stays
   and so does the lost star. Restart empties the board and zeroes the clock,
   and Undo straight after it brings everything back.

   Free mode, under More with the way to the maker, points out nothing: a wrong square fills like a right one, Fill
   on a filled square empties it, the numbers never grey, there is no hint,
   and the puzzle is solved when the filled squares are exactly the picture.
   The choice is kept in this browser under `pixels-mode`, and changing it
   starts the puzzle over.

   A board wider than ten squares zooms under two fingers; app.js's `drag`
   says how.

   play.html?daily plays the puzzle of the day, which app.js makes from the
   date; its result is kept by day, and solving it shows the days in a row.

   Each fill, X, finished line, mistake, hint and solve plays a tone and
   ticks the phone, and a square emptied, an X taken off or a move undone
   plays a falling one. The Sound switch keeps its choice in this browser.

   A game in progress is kept in this browser under `pixels-progress`, so a
   phone that reloads the page picks up where it was. It is dropped once the
   puzzle is solved or started over.
   ========================================================================== */
(() => {
  'use strict';

  const { data, grid, column, clues, solveLine, order, daily, today, streak, board, paint, highlight, drag, stars, buzz, sound, sounds, listen, time, title } = window.Pixels;
  const $ = id => document.getElementById(id);
  const game = $('pixels-game'), boardHost = $('pixels-board'), status = $('pixels-status'), clock = $('pixels-clock');

  const PROGRESS = 'pixels-progress';
  const MODE = 'pixels-mode';
  // How long the finished picture takes to fill in before the name shows.
  const REVEAL = 1100;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const say = (heading, detail) => {
    const box = $('pixels-error');
    box.querySelector('.rux--inline-notification__title').textContent = heading;
    box.querySelector('.rux--inline-notification__subtitle').textContent = detail;
    box.hidden = false;
    [...game.children].forEach(el => { if (el !== box) el.hidden = true; });
  };

  const loadProgress = () => { try { return JSON.parse(localStorage.getItem(PROGRESS) || '{}'); } catch { return {}; } };
  const saveProgress = (id, value) => {
    const all = loadProgress();
    if (value) all[id] = value; else delete all[id];
    try { localStorage.setItem(PROGRESS, JSON.stringify(all)); } catch { /* progress is a convenience */ }
  };

  (async () => {
    const query = new URLSearchParams(location.search), id = query.get('id'), isDaily = query.has('daily');
    if (!data) { say('Pixels could not connect', 'Reload the page to try again.'); return; }
    let puzzles, results;
    try {
      [puzzles, results] = await Promise.all([data.list(), isDaily ? data.days() : data.results()]);
    } catch {
      say('The puzzle did not load', 'Reload the page to try again.');
      return;
    }
    puzzles = order(puzzles);
    const index = puzzles.findIndex(p => String(p.id) === id);
    if (!isDaily && index < 0) { say('This puzzle is not here', 'It may have been deleted. Pick another from Puzzles.'); return; }
    const puzzle = isDaily ? daily(today()) : puzzles[index];
    // What a result is kept under: the day, or the puzzle's id.
    const key = isDaily ? puzzle.day : puzzle.id;
    const heading = isDaily ? puzzle.name : title(puzzle, index, results.has(key));
    const answer = grid(puzzle.squares, puzzle.width), H = answer.length, W = answer[0].length;
    const blank = () => answer.map(r => r.map(() => 0));

    const kept = loadProgress()[puzzle.id];
    const fresh = kept && kept.squares === puzzle.squares;
    let state = fresh ? kept.state : blank();
    let seconds = fresh ? kept.seconds : 0;
    let mistakes = fresh ? kept.mistakes : 0;
    let hints = fresh ? kept.hints || 0 : 0;
    let free = fresh ? !!kept.free : (() => { try { return localStorage.getItem(MODE) === 'free'; } catch { return false; } })();
    // No square is marked until a finger, the mouse or an arrow key picks one.
    // `climb` counts the fills of one drag, so each sounds a step higher.
    let tool = 'fill', action = null, cursor = [], solved = false, climb = 0;
    // Nothing moves, and the clock stands, until the cover is tapped; and
    // the board takes no touch for a moment after, so a second tap meant for
    // the cover cannot land on the square that was under it.
    let started = false, settling = false;
    // The board before each tap or drag that changed it, and the board as a
    // tap or drag began, kept only once that one changes something.
    // `ahead` is the boards Undo left, for Redo, until a new move is made.
    let past = [], held = null, ahead = [];

    $('pixels-title').textContent = heading;
    document.title = `${heading} — Pixels`;
    if (isDaily) $('pixels-edit').remove();
    else $('pixels-edit').href = `make.html?id=${encodeURIComponent(puzzle.id)}`;

    const score = () => (free ? 3 : Math.max(1, 3 - mistakes - hints));
    const keep = () => saveProgress(puzzle.id, { squares: puzzle.squares, state, seconds, mistakes, hints, free });
    const el = board(boardHost, answer, state, { done: !free, label: 'Puzzle' });
    // The name, the clock and the stars sit in the board's corner.
    el.querySelector('.pixels-corner').appendChild($('pixels-info'));
    $('pixels-info').hidden = false;
    const draw = () => {
      paint(el, answer, state, { done: !free });
      el.querySelectorAll('.is-hint').forEach(e => e.classList.remove('is-hint'));
      highlight(el, ...cursor);
      stars($('pixels-stars'), score());
      $('pixels-hint').disabled = free;
      $('pixels-undo').disabled = !past.length;
      $('pixels-redo').disabled = !ahead.length;
    };
    const tick = () => { clock.textContent = time(seconds); };
    const tell = (text, error) => {
      status.textContent = text;
      if (error) status.dataset.error = ''; else delete status.dataset.error;
    };

    // The clock runs only while the page is in front.
    setInterval(() => {
      if (!started || solved || document.hidden) return;
      seconds++;
      tick();
      if (seconds % 5 === 0) keep();
    }, 1000);

    const finish = async () => {
      solved = true;
      saveProgress(puzzle.id, null);
      highlight(el);
      pad.reset();
      buzz(60);
      sound('solved');
      // The squares fill in as the picture while the time is saved.
      el.classList.add('is-solved');
      const earned = score();
      let best = { best: seconds, stars: earned, isNew: true }, lost = false;
      const [saved] = await Promise.allSettled([
        isDaily ? data.recordDay(key, seconds, earned) : data.record(key, seconds, earned),
        new Promise(done => setTimeout(done, still ? 0 : REVEAL)),
      ]);
      if (saved.status === 'fulfilled') best = saved.value; else lost = true;

      $('pixels-solved-name').textContent = puzzle.name;
      stars($('pixels-solved-stars'), earned);
      const parts = [time(seconds)];
      if (lost) parts.push('not saved');
      else if (!best.isNew) parts.push(`best ${time(best.best)}`);
      else if (results.has(key)) parts.push('a new best');
      if (isDaily && !lost) {
        const row = streak(new Set([...results.keys(), key]));
        parts.push(`${row} day${row === 1 ? '' : 's'} in a row`);
      }
      $('pixels-solved-time').textContent = parts.join(' · ');
      document.title = `${puzzle.name} — Pixels`;
      // The next puzzle not yet solved, after this one and then from the
      // start; after the puzzle of the day, the first not yet solved.
      const rest = isDaily ? puzzles : [...puzzles.slice(index + 1), ...puzzles.slice(0, index)];
      const done = isDaily ? await data.results().catch(() => new Map()) : results;
      const next = rest.find(p => !done.has(p.id));
      if (next) $('pixels-next').href = `play.html?id=${encodeURIComponent(next.id)}`;
      else $('pixels-next').remove();
      // The numbers and the controls leave, and the picture slides from
      // where the board had it to the middle.
      const first = el.querySelector('.pixels-cell'), from = first.getBoundingClientRect();
      game.classList.add('is-done');
      $('pixels-solved').hidden = false;
      // A picture drawn in colour takes its colours now.
      if (puzzle.colours) el.querySelectorAll('.pixels-cell').forEach((c, i) => { c.dataset.ink = puzzle.colours[i]; });
      const to = first.getBoundingClientRect();
      if (!still) el.animate([
        { transformOrigin: '0 0', transform: `translate(${from.x - to.x}px, ${from.y - to.y}px) scale(${from.width / to.width})` },
        { transformOrigin: '0 0', transform: 'none' },
      ], { duration: 400, easing: 'ease-out' });
    };

    // Free mode is solved by the filled squares being the picture exactly;
    // the classic game by every square of the picture being filled, since a
    // wrong fill there is crossed out instead.
    const isSolved = () => answer.every((r, y) => r.every((c, x) =>
      free ? !!c === (state[y][x] === 1) : !c || state[y][x] === 1));

    // A line whose picture squares are all filled crosses out what is left,
    // and says whether the square at (y, x) finished one.
    const closeLines = (y, x) => {
      const row = answer[y].every((c, i) => !c || state[y][i] === 1);
      const col = answer.every((r, i) => !r[x] || state[i][x] === 1);
      for (let i = 0; i < W; i++) if (row && state[y][i] === 0) state[y][i] = 2;
      for (let i = 0; i < H; i++) if (col && state[i][x] === 0) state[i][x] = 2;
      return row || col;
    };

    const act = (y, x) => {
      if (!started || settling || solved) return;
      const v = state[y][x];
      if (action === 'fill' && v === 0) {
        if (free || answer[y][x]) {
          state[y][x] = 1;
          const closed = !free && closeLines(y, x);
          buzz(closed ? 30 : 10);
          sound(closed ? 'line' : 'fill', closed ? 0 : climb++);
          tell('');
        } else {
          const before = score();
          state[y][x] = 3;
          mistakes++;
          buzz([40, 60, 40]);
          sound('miss');
          tell(score() < before ? 'Not in the picture · a star lost' : 'Not in the picture', true);
        }
      } else if (action === 'unfill' && v === 1) { state[y][x] = 0; sound('pop'); }
      else if (action === 'x' && v === 0) { state[y][x] = 2; sound('x'); }
      else if (action === 'unx' && v === 2) { state[y][x] = 0; sound('pop'); }
      else return;
      if (held) { past.push(held); held = null; ahead = []; }
      cursor = [y, x];
      draw();
      keep();
      if (isSolved()) finish();
    };
    // A drag keeps doing what its first square did, so Fill that starts on a
    // filled square in free mode empties along the drag.
    const begin = (y, x, which = tool) => {
      action = which === 'fill' ? (free && state[y][x] === 1 ? 'unfill' : 'fill')
        : state[y][x] === 2 ? 'unx' : 'x';
      climb = 0;
      held = state.map(r => r.slice());
      act(y, x);
    };

    const undo = () => {
      if (!started || solved || !past.length) return;
      const now = state.map(r => r.slice());
      const same = to => to.every((r, y) => r.every((v, x) => v === state[y][x]));
      let was = null;
      for (;;) {
        const entry = past.pop();
        // A Restart taken back: the board, the clock and the stars as they were.
        if (!Array.isArray(entry)) {
          ({ state, seconds, mistakes, hints, past } = entry);
          ahead = [];
          tick();
          break;
        }
        // A mistake stays as it is, so a move that was only a mistake has
        // nothing to take back and the one before it is taken instead.
        was = entry.map((r, y) => r.map((v, x) => (state[y][x] === 3 ? 3 : v)));
        if (!past.length || !same(was)) break;
      }
      if (was) {
        if (!same(was)) ahead.push(now);
        state = was;
      }
      cursor = [];
      tell('');
      sound('pop');
      draw();
      keep();
    };
    const redo = () => {
      if (!started || solved || !ahead.length) return;
      past.push(state.map(r => r.slice()));
      state = ahead.pop().map((r, y) => r.map((v, x) => (state[y][x] === 3 ? 3 : v)));
      cursor = [];
      tell('');
      sound('fill');
      draw();
      keep();
    };
    $('pixels-redo').addEventListener('click', redo);
    $('pixels-undo').addEventListener('click', undo);

    /* A HINT. What the board shows for certain is every filled square and
       every X that is right; a wrong X is pointed at first, because the
       numbers cannot be reasoned from it. Otherwise each line is solved from
       what is certain, and the one that decides the most squares to fill, or
       failing that the most to cross out, is lit. */
    const hint = () => {
      if (!started || solved || free) return;
      const wrong = [];
      state.forEach((r, y) => r.forEach((v, x) => { if (v === 2 && answer[y][x]) wrong.push([y, x]); }));
      let text, lit;
      if (wrong.length) {
        cursor = wrong[0];
        text = 'This X is on a square of the picture';
      } else {
        const known = state.map((r, y) => r.map((v, x) => (v === 1 ? 1 : v && !answer[y][x] ? 0 : -1)));
        let top = null;
        const weigh = (kind, n, want, have) => {
          const agreed = solveLine(clues(want), have) || [];
          const fills = agreed.filter((v, k) => v === 1 && have[k] === -1).length;
          const crosses = agreed.filter((v, k) => v === 0 && have[k] === -1).length;
          const worth = fills * 100 + crosses;
          if (worth && (!top || worth > top.worth)) top = { kind, n, worth, fills };
        };
        for (let y = 0; y < H; y++) weigh('row', y, answer[y], known[y]);
        for (let x = 0; x < W; x++) weigh('col', x, column(answer, x), column(known, x));
        if (!top) return;
        lit = `.pixels-cell[data-${top.kind === 'row' ? 'y' : 'x'}="${top.n}"], .pixels-clue[data-${top.kind}="${top.n}"]`;
        text = `${top.kind === 'row' ? 'Row' : 'Column'} ${top.n + 1} has squares to ${top.fills ? 'fill' : 'cross out'}`;
      }
      hints++;
      draw();
      if (lit) el.querySelectorAll(lit).forEach(e => e.classList.add('is-hint'));
      tell(text);
      buzz();
      sound('hint');
      keep();
    };
    $('pixels-hint').addEventListener('click', hint);

    // A board over ten squares wide is too fine for a finger, so it zooms.
    const pad = drag(boardHost, {
      start: (y, x) => begin(y, x),
      paint: act,
      hover: (y, x) => { cursor = [y, x]; highlight(el, y, x); },
      zoom: () => W > 10,
    });
    $('pixels-tool').addEventListener('click', e => {
      const picked = e.target.closest('button');
      if (!picked) return;
      tool = picked.dataset.tool;
      $('pixels-tool').querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', b === picked));
    });

    // Arrows move, Z or Space fills, X crosses out, U undoes, R redoes and
    // H hints, whichever tool is chosen.
    addEventListener('keydown', e => {
      if (!started || solved || e.target.closest('input, textarea, select, .rux--header, .rux--side-nav')) return;
      const move = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
      if (move) {
        e.preventDefault();
        const [y = 0, x = 0] = cursor;
        cursor = [(y + move[0] + H) % H, (x + move[1] + W) % W];
        highlight(el, ...cursor);
        return;
      }
      const key = e.key.toLowerCase();
      if (key === 'h') { hint(); return; }
      if (key === 'u') { undo(); return; }
      if (key === 'r') { redo(); return; }
      if (!cursor.length) return;
      if (key === 'z' || key === ' ') { e.preventDefault(); begin(...cursor, 'fill'); }
      else if (key === 'x') begin(...cursor, 'x');
    });

    // Restart is one tap among the keys, so Undo takes it back whole.
    const restart = () => {
      past = [{ state, seconds, mistakes, hints, past }];
      ahead = [];
      state = blank();
      seconds = 0;
      mistakes = 0;
      hints = 0;
      tell('');
      saveProgress(puzzle.id, null);
      tick();
      draw();
    };
    $('pixels-restart').addEventListener('click', () => { if (started && !solved) restart(); });

    const freeToggle = $('pixels-free');
    window.Rux.formControls?.toggle(freeToggle, free);
    freeToggle.addEventListener('rux:toggle', e => {
      if (e.detail.on === free) return;
      free = e.detail.on;
      try { localStorage.setItem(MODE, free ? 'free' : 'classic'); } catch { /* the choice lasts this page */ }
      restart();
      // A board from the other way of playing is not one to go back to.
      past = [];
      draw();
      tell(free ? 'Free mode · mistakes are not pointed out' : '');
    });

    listen();
    const cover = $('pixels-start');
    if (fresh) cover.textContent = 'Tap to continue';
    game.classList.add('is-waiting');
    cover.addEventListener('click', () => {
      started = settling = true;
      setTimeout(() => { settling = false; }, 350);
      game.classList.remove('is-waiting');
      cover.remove();
      sound('fill');
    });
    cover.focus({ preventScroll: true });
    const soundToggle = $('pixels-sound');
    window.Rux.formControls?.toggle(soundToggle, sounds());
    soundToggle.addEventListener('rux:toggle', e => { if (sounds(e.detail.on)) sound('fill'); });

    tick();
    draw();
  })();
})();
