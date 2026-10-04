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

   Free mode points out nothing: a wrong square fills like a right one, Fill
   on a filled square empties it, the numbers never grey, there is no hint,
   and the puzzle is solved when the filled squares are exactly the picture.
   The choice is kept in this browser under `pixels-mode`, and changing it
   starts the puzzle over.

   A game in progress is kept in this browser under `pixels-progress`, so a
   phone that reloads the page picks up where it was. It is dropped once the
   puzzle is solved or started over.
   ========================================================================== */
(() => {
  'use strict';

  const { data, SIZE, grid, column, clues, solveLine, board, paint, highlight, drag, stars, buzz, time, title, switcher } = window.Pixels;
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
    const id = new URLSearchParams(location.search).get('id');
    if (!data) { say('Pixels could not connect', 'Reload the page to try again.'); return; }
    let puzzles, results;
    try {
      [puzzles, results] = await Promise.all([data.list(), data.results()]);
    } catch {
      say('The puzzle did not load', 'Reload the page to try again.');
      return;
    }
    const index = puzzles.findIndex(p => String(p.id) === id);
    if (index < 0) { say('This puzzle is not here', 'It may have been deleted. Pick another from Puzzles.'); return; }
    const puzzle = puzzles[index];
    const answer = grid(puzzle.squares);
    const blank = () => answer.map(r => r.map(() => 0));

    const kept = loadProgress()[puzzle.id];
    const fresh = kept && kept.squares === puzzle.squares;
    let state = fresh ? kept.state : blank();
    let seconds = fresh ? kept.seconds : 0;
    let mistakes = fresh ? kept.mistakes : 0;
    let hints = fresh ? kept.hints || 0 : 0;
    let free = fresh ? !!kept.free : (() => { try { return localStorage.getItem(MODE) === 'free'; } catch { return false; } })();
    // No square is marked until a finger, the mouse or an arrow key picks one.
    let tool = 'fill', action = null, cursor = [], solved = false;

    $('pixels-title').textContent = title(puzzle, index, results.has(puzzle.id));
    document.title = `${title(puzzle, index, results.has(puzzle.id))} — Pixels`;
    $('pixels-edit').href = `make.html?id=${encodeURIComponent(puzzle.id)}`;

    const score = () => (free ? 3 : Math.max(1, 3 - mistakes - hints));
    const keep = () => saveProgress(puzzle.id, { squares: puzzle.squares, state, seconds, mistakes, hints, free });
    const el = board(boardHost, answer, state, { done: !free, label: 'Puzzle' });
    const draw = () => {
      paint(el, answer, state, { done: !free });
      el.querySelectorAll('.is-hint').forEach(e => e.classList.remove('is-hint'));
      highlight(el, ...cursor);
      stars($('pixels-stars'), score());
      $('pixels-hint').hidden = free;
    };
    const tick = () => { clock.textContent = time(seconds); };
    const tell = (text, error) => {
      status.textContent = text;
      if (error) status.dataset.error = ''; else delete status.dataset.error;
    };

    // The clock runs only while the page is in front.
    setInterval(() => {
      if (solved || document.hidden) return;
      seconds++;
      tick();
      if (seconds % 5 === 0) keep();
    }, 1000);

    const finish = async () => {
      solved = true;
      saveProgress(puzzle.id, null);
      highlight(el);
      buzz(60);
      // The squares fill in as the picture while the time is saved.
      el.classList.add('is-solved');
      const earned = score();
      let best = { best: seconds, stars: earned, isNew: true }, lost = false;
      const [saved] = await Promise.allSettled([
        data.record(puzzle.id, seconds, earned),
        new Promise(done => setTimeout(done, still ? 0 : REVEAL)),
      ]);
      if (saved.status === 'fulfilled') best = saved.value; else lost = true;

      $('pixels-solved-name').textContent = puzzle.name;
      stars($('pixels-solved-stars'), earned);
      const parts = [time(seconds)];
      if (lost) parts.push('not saved');
      else if (!best.isNew) parts.push(`best ${time(best.best)}`);
      else if (results.has(puzzle.id)) parts.push('a new best');
      $('pixels-solved-time').textContent = parts.join(' · ');
      document.title = `${puzzle.name} — Pixels`;
      // The next puzzle not yet solved, after this one and then from the start.
      const order = [...puzzles.slice(index + 1), ...puzzles.slice(0, index)];
      const next = order.find(p => !results.has(p.id) && p.id !== puzzle.id);
      if (next) $('pixels-next').href = `play.html?id=${encodeURIComponent(next.id)}`;
      else $('pixels-next').remove();
      // The numbers and the controls leave, and the picture slides from
      // where the board had it to the middle.
      const first = el.querySelector('.pixels-cell'), from = first.getBoundingClientRect();
      game.classList.add('is-done');
      $('pixels-solved').hidden = false;
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
      for (let i = 0; i < SIZE; i++) {
        if (row && state[y][i] === 0) state[y][i] = 2;
        if (col && state[i][x] === 0) state[i][x] = 2;
      }
      return row || col;
    };

    const act = (y, x) => {
      if (solved) return;
      const v = state[y][x];
      if (action === 'fill' && v === 0) {
        if (free || answer[y][x]) {
          state[y][x] = 1;
          buzz(!free && closeLines(y, x) ? 30 : 10);
          tell('');
        } else {
          const before = score();
          state[y][x] = 3;
          mistakes++;
          buzz([40, 60, 40]);
          tell(score() < before ? 'Not in the picture · a star lost' : 'Not in the picture', true);
        }
      } else if (action === 'unfill' && v === 1) state[y][x] = 0;
      else if (action === 'x' && v === 0) state[y][x] = 2;
      else if (action === 'unx' && v === 2) state[y][x] = 0;
      else return;
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
      act(y, x);
    };

    /* A HINT. What the board shows for certain is every filled square and
       every X that is right; a wrong X is pointed at first, because the
       numbers cannot be reasoned from it. Otherwise each line is solved from
       what is certain, and the one that decides the most squares to fill, or
       failing that the most to cross out, is lit. */
    const hint = () => {
      if (solved || free) return;
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
        for (let y = 0; y < SIZE; y++) weigh('row', y, answer[y], known[y]);
        for (let x = 0; x < SIZE; x++) weigh('col', x, column(answer, x), column(known, x));
        if (!top) return;
        lit = `.pixels-cell[data-${top.kind === 'row' ? 'y' : 'x'}="${top.n}"], .pixels-clue[data-${top.kind}="${top.n}"]`;
        text = `${top.kind === 'row' ? 'Row' : 'Column'} ${top.n + 1} has squares to ${top.fills ? 'fill' : 'cross out'}`;
      }
      hints++;
      draw();
      if (lit) el.querySelectorAll(lit).forEach(e => e.classList.add('is-hint'));
      tell(text);
      buzz();
      keep();
    };
    $('pixels-hint').addEventListener('click', hint);

    drag(boardHost, {
      start: (y, x) => begin(y, x),
      paint: act,
      hover: (y, x) => { cursor = [y, x]; highlight(el, y, x); },
    });
    switcher($('pixels-tool'), b => { tool = b.dataset.tool; });

    // Arrows move, Z or Space fills, X crosses out and H hints, whichever
    // tool is chosen.
    addEventListener('keydown', e => {
      if (solved || e.target.closest('input, textarea, select, .rux--header, .rux--side-nav')) return;
      const move = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
      if (move) {
        e.preventDefault();
        const [y = 0, x = 0] = cursor;
        cursor = [(y + move[0] + SIZE) % SIZE, (x + move[1] + SIZE) % SIZE];
        highlight(el, ...cursor);
        return;
      }
      const key = e.key.toLowerCase();
      if (key === 'h') { hint(); return; }
      if (!cursor.length) return;
      if (key === 'z' || key === ' ') { e.preventDefault(); begin(...cursor, 'fill'); }
      else if (key === 'x') begin(...cursor, 'x');
    });

    const restart = () => {
      state = blank();
      seconds = 0;
      mistakes = 0;
      hints = 0;
      tell('');
      saveProgress(puzzle.id, null);
      tick();
      draw();
    };
    $('pixels-restart').addEventListener('click', restart);

    const freeToggle = $('pixels-free');
    window.Rux.formControls?.toggle(freeToggle, free);
    freeToggle.addEventListener('rux:toggle', e => {
      if (e.detail.on === free) return;
      free = e.detail.on;
      try { localStorage.setItem(MODE, free ? 'free' : 'classic'); } catch { /* the choice lasts this page */ }
      restart();
      tell(free ? 'Free mode · mistakes are not pointed out' : '');
    });

    tick();
    draw();
  })();
})();
