/* ==========================================================================
   play.js — one puzzle, by the rules of Picross DS
   --------------------------------------------------------------------------
   Fill a square or cross it out with X. Filling a square that is not in the
   picture is a mistake: it is crossed out in red and time is added to the
   clock, more for each mistake. A line's numbers grey out once its filled
   squares are right, and the puzzle is solved when every square of the
   picture is filled.

   A game in progress is kept in this browser under `pixels-progress`, so a
   phone that reloads the page picks up where it was. It is dropped once the
   puzzle is solved or started over.
   ========================================================================== */
(() => {
  'use strict';

  const { data, SIZE, grid, board, highlight, drag, picture, time, title, switcher } = window.Pixels;
  const $ = id => document.getElementById(id);
  const game = $('pixels-game'), boardHost = $('pixels-board'), status = $('pixels-status'), clock = $('pixels-clock');

  // Minutes added for the first, second and every later mistake.
  const PENALTY = [2, 4, 8];
  const PROGRESS = 'pixels-progress';

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
    // No square is marked until a finger, the mouse or an arrow key picks one.
    let tool = 'fill', action = null, cursor = [], solved = false, el;

    $('pixels-title').textContent = title(puzzle, index, results.has(puzzle.id));
    document.title = `${title(puzzle, index, results.has(puzzle.id))} — Pixels`;
    $('pixels-edit').href = `make.html?id=${encodeURIComponent(puzzle.id)}`;

    const keep = () => saveProgress(puzzle.id, { squares: puzzle.squares, state, seconds, mistakes });
    const draw = () => {
      el = board(boardHost, answer, state, { done: true, label: 'Puzzle' });
      highlight(el, ...cursor);
    };
    const tick = () => { clock.textContent = time(seconds); };

    // The clock runs only while the page is in front, as the DS pauses.
    setInterval(() => {
      if (solved || document.hidden) return;
      seconds++;
      tick();
      if (seconds % 5 === 0) keep();
    }, 1000);

    const finish = async () => {
      solved = true;
      saveProgress(puzzle.id, null);
      let best = { best: seconds, isNew: true };
      try { best = await data.record(puzzle.id, seconds); } catch {
        status.textContent = 'Solved, but the time was not saved.';
      }
      picture($('pixels-picture'), puzzle.squares);
      $('pixels-solved-name').textContent = puzzle.name;
      const parts = [time(seconds), `${mistakes} mistake${mistakes === 1 ? '' : 's'}`];
      if (!best.isNew) parts.push(`best ${time(best.best)}`);
      else if (results.has(puzzle.id)) parts.push('a new best');
      $('pixels-solved-time').textContent = parts.join(' · ');
      document.title = `${puzzle.name} — Pixels`;
      // The next puzzle not yet solved, after this one and then from the start.
      const order = [...puzzles.slice(index + 1), ...puzzles.slice(0, index)];
      const next = order.find(p => !results.has(p.id) && p.id !== puzzle.id);
      if (next) $('pixels-next').href = `play.html?id=${encodeURIComponent(next.id)}`;
      else $('pixels-next').remove();
      game.hidden = true;
      $('pixels-solved').hidden = false;
    };

    const act = (y, x) => {
      if (solved) return;
      const v = state[y][x];
      if (action === 'fill' && v === 0) {
        if (answer[y][x]) state[y][x] = 1;
        else {
          state[y][x] = 3;
          mistakes++;
          const minutes = PENALTY[Math.min(mistakes, PENALTY.length) - 1];
          seconds += minutes * 60;
          tick();
          status.dataset.error = '';
          status.textContent = `Not in the picture · +${minutes}:00`;
        }
      } else if (action === 'x' && v === 0) state[y][x] = 2;
      else if (action === 'unx' && v === 2) state[y][x] = 0;
      else return;
      cursor = [y, x];
      draw();
      keep();
      if (answer.every((r, yy) => r.every((c, xx) => !c || state[yy][xx] === 1))) finish();
    };
    const begin = (y, x, which = tool) => {
      action = which === 'fill' ? 'fill' : state[y][x] === 2 ? 'unx' : 'x';
      act(y, x);
    };

    drag(boardHost, {
      start: (y, x) => begin(y, x),
      paint: act,
      hover: (y, x) => { cursor = [y, x]; highlight(el, y, x); },
    });
    switcher($('pixels-tool'), b => { tool = b.dataset.tool; });

    // Arrows move, Z or Space fills and X crosses out, whichever tool is chosen.
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
      if (!cursor.length) return;
      if (key === 'z' || key === ' ') { e.preventDefault(); begin(...cursor, 'fill'); }
      else if (key === 'x') begin(...cursor, 'x');
    });

    $('pixels-restart').addEventListener('click', () => {
      state = blank();
      seconds = 0;
      mistakes = 0;
      status.textContent = '';
      delete status.dataset.error;
      saveProgress(puzzle.id, null);
      tick();
      draw();
    });

    tick();
    draw();
  })();
})();
