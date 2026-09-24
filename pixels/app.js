/* ==========================================================================
   app.js — what every Pixels page shares
   --------------------------------------------------------------------------
   window.Pixels holds the puzzle rules and the board: a puzzle's squares are
   a string of 0s and 1s, row by row. `clues` gives a line's numbers,
   `unreached` says which squares logic alone cannot decide, `board` draws a
   board with its clues, `drag` paints along it, and `picture` draws the
   finished picture. The pages add their own behaviour in puzzles.js,
   play.js and make.js.
   ========================================================================== */
(() => {
  'use strict';

  const SIZE = 10;

  const grid = squares => Array.from({ length: SIZE }, (_, y) => [...squares.slice(y * SIZE, y * SIZE + SIZE)].map(Number));
  const squaresOf = g => g.flat().join('');
  const column = (g, x) => g.map(r => r[x]);

  // A line's numbers: the lengths of its runs of filled squares, in order,
  // and a single 0 for an empty line.
  const clues = line => {
    const runs = [];
    let n = 0;
    for (const c of line) {
      if (c === 1) n++;
      else if (n) { runs.push(n); n = 0; }
    }
    if (n) runs.push(n);
    return runs.length ? runs : [0];
  };

  /* THE LINE SOLVER. It tries every way a line's runs fit what is already
     known (1 filled, 0 empty, -1 unknown), and a square every way agrees on is
     decided. It returns the agreed line, -1 where the ways disagree. */
  const solveLine = (clue, known) => {
    const L = known.length, runs = clue[0] === 0 ? [] : clue, cur = new Array(L).fill(0);
    let agree = null;
    const place = (i, start) => {
      if (i === runs.length) {
        for (let k = start; k < L; k++) if (known[k] === 1) return;
        const line = cur.slice();
        for (let k = start; k < L; k++) line[k] = 0;
        if (!agree) agree = line;
        else for (let k = 0; k < L; k++) if (agree[k] !== line[k]) agree[k] = -1;
        return;
      }
      const need = runs.slice(i + 1).reduce((a, b) => a + b + 1, 0);
      for (let s = start; s + runs[i] + need <= L; s++) {
        if (s > start && known[s - 1] === 1) break;
        let fits = true;
        for (let k = s; k < s + runs[i]; k++) if (known[k] === 0) { fits = false; break; }
        if (!fits || (s + runs[i] < L && known[s + runs[i]] === 1)) continue;
        for (let k = start; k < s; k++) cur[k] = 0;
        for (let k = s; k < s + runs[i]; k++) cur[k] = 1;
        if (s + runs[i] < L) cur[s + runs[i]] = 0;
        place(i + 1, s + runs[i] + 1);
      }
    };
    place(0, 0);
    return agree;
  };

  /* WHICH SQUARES NEED A GUESS. Solves row and column in turn until no line
     can decide another square; what is still undecided is true of the
     picture's clues, not of how clever the player is, because this is the
     reasoning a player does one line at a time. */
  const unreached = g => {
    const rows = g.map(clues), cols = g[0].map((_, x) => clues(column(g, x)));
    const known = g.map(r => r.map(() => -1));
    for (let changed = true; changed;) {
      changed = false;
      for (let y = 0; y < SIZE; y++) solveLine(rows[y], known[y]).forEach((v, x) => {
        if (v !== -1 && known[y][x] === -1) { known[y][x] = v; changed = true; }
      });
      for (let x = 0; x < SIZE; x++) solveLine(cols[x], column(known, x)).forEach((v, y) => {
        if (v !== -1 && known[y][x] === -1) { known[y][x] = v; changed = true; }
      });
    }
    return known.map(r => r.map(v => v === -1));
  };

  /* A BOARD. `state[y][x]` is 0 empty, 1 filled, 2 X, 3 a mistake's X.
     `options.done` greys a line's numbers once its filled squares match the
     answer's; `options.unknown` outlines squares that need a guess. */
  const board = (host, answer, state, options = {}) => {
    const el = document.createElement('div');
    el.className = 'pixels-board';
    el.setAttribute('role', 'grid');
    el.setAttribute('aria-label', options.label || 'Puzzle');
    el.appendChild(document.createElement('div'));
    const matches = (line, want) => line.every((v, i) => (v === 1) === (want[i] === 1));
    const numbers = (target, line) => clues(line).forEach(n => {
      const span = document.createElement('span');
      span.textContent = n;
      target.appendChild(span);
    });
    for (let x = 0; x < SIZE; x++) {
      const c = document.createElement('div');
      c.className = 'pixels-clue pixels-clue--col';
      c.dataset.col = x;
      numbers(c, column(answer, x));
      if (options.done && matches(column(state, x), column(answer, x))) c.classList.add('is-done');
      el.appendChild(c);
    }
    for (let y = 0; y < SIZE; y++) {
      const c = document.createElement('div');
      c.className = 'pixels-clue';
      c.dataset.row = y;
      numbers(c, answer[y]);
      if (options.done && matches(state[y], answer[y])) c.classList.add('is-done');
      el.appendChild(c);
      for (let x = 0; x < SIZE; x++) {
        const s = document.createElement('div');
        const v = state[y][x];
        s.className = 'pixels-cell' + ({ 1: ' is-fill', 2: ' is-x', 3: ' is-x is-miss' }[v] || '')
          + (options.unknown?.[y][x] ? ' is-unknown' : '');
        s.dataset.x = x;
        s.dataset.y = y;
        s.setAttribute('role', 'gridcell');
        s.setAttribute('aria-label', `Row ${y + 1}, column ${x + 1}, ${['empty', 'filled', 'crossed out', 'mistake'][v]}`);
        el.appendChild(s);
      }
    }
    host.replaceChildren(el);
    return el;
  };

  // Marks the row and column through one square, and the square itself.
  const highlight = (el, y, x) => {
    el.querySelectorAll('.is-line, .is-cursor').forEach(e => e.classList.remove('is-line', 'is-cursor'));
    if (y == null) return;
    el.querySelectorAll(`.pixels-cell[data-y="${y}"], .pixels-cell[data-x="${x}"], .pixels-clue[data-row="${y}"], .pixels-clue[data-col="${x}"]`)
      .forEach(e => e.classList.add('is-line'));
    el.querySelector(`.pixels-cell[data-y="${y}"][data-x="${x}"]`)?.classList.add('is-cursor');
  };

  /* PAINTING BY DRAG. `start(y, x)` runs on the first square, then
     `paint(y, x)` on each square the finger crosses. In the game the drag
     keeps to the first row or column it moves along, as on the DS; `free`
     lets the maker draw in any direction. A mouse moving with no button down
     calls `hover(y, x)`. Listeners sit on the host, which outlives redraws. */
  const drag = (host, { start, paint, hover, free = false }) => {
    let from = null, axis = null, last = null;
    const at = e => {
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('.pixels-cell');
      return el && host.contains(el) ? [+el.dataset.y, +el.dataset.x] : null;
    };
    host.addEventListener('pointerdown', e => {
      const p = at(e);
      if (!p || e.button > 0) return;
      e.preventDefault();
      from = last = p;
      axis = null;
      start(...p);
    });
    host.addEventListener('pointermove', e => {
      const p = at(e);
      if (!from) { if (p && e.pointerType === 'mouse') hover?.(...p); return; }
      if (!p || (p[0] === last[0] && p[1] === last[1])) return;
      if (free) { last = p; paint(...p); return; }
      if (!axis) axis = p[0] === from[0] ? 'row' : 'col';
      // A fast finger skips squares between two moves; paint every one.
      const i = axis === 'row' ? 1 : 0, to = p[i];
      for (let n = last[i]; n !== to;) {
        n += Math.sign(to - n);
        paint(axis === 'row' ? from[0] : n, axis === 'row' ? n : from[1]);
      }
      last = axis === 'row' ? [from[0], to] : [to, from[1]];
    });
    const end = () => { from = null; };
    addEventListener('pointerup', end);
    addEventListener('pointercancel', end);
  };

  const picture = (el, squares) => {
    el.style.setProperty('--size', SIZE);
    el.replaceChildren(...[...squares].map(c => {
      const s = document.createElement('span');
      if (c === '1') s.dataset.on = '';
      return s;
    }));
    return el;
  };

  const time = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  // A puzzle keeps its name hidden until it is solved, as on the DS.
  const title = (puzzle, index, solved) => (solved ? puzzle.name : `Puzzle ${index + 1}`);

  // A Design content switcher: selects the pressed button and reports it.
  const switcher = (el, on) => el.addEventListener('click', e => {
    const pressed = e.target.closest('button');
    if (!pressed) return;
    el.querySelectorAll('button').forEach(b => {
      const selected = b === pressed;
      b.classList.toggle('rux--content-switcher--selected', selected);
      b.setAttribute('aria-selected', selected);
      b.tabIndex = selected ? 0 : -1;
    });
    on(pressed);
  });

  window.Pixels = Object.assign(window.Pixels || {}, {
    SIZE, grid, squaresOf, clues, unreached, board, highlight, drag, picture, time, title, switcher,
  });
})();
