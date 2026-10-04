/* ==========================================================================
   app.js — what every Pixels page shares
   --------------------------------------------------------------------------
   window.Pixels holds the puzzle rules and the board: a puzzle's squares are
   a string of 0s and 1s, row by row. `clues` gives a line's numbers,
   `unreached` says which squares logic alone cannot decide and `rounds` how
   hard the rest is, `board` draws a
   board with its clues and `paint` keeps it in step with the game, `drag`
   paints along it, `picture` draws the finished picture, `stars` a score,
   `buzz` ticks the phone and `sound` plays a tone. `order` puts puzzles in
   playing order and `daily` makes the puzzle of a day. The pages add their
   own behaviour in puzzles.js, play.js and make.js.
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
  // The same runs as [first square, length], so a number knows its squares.
  const runsOf = line => {
    const runs = [];
    line.forEach((c, i) => {
      if (c !== 1) return;
      if (i && line[i - 1] === 1) runs[runs.length - 1][1]++;
      else runs.push([i, 1]);
    });
    return runs;
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

  /* SOLVING BY LINES. Each round solves every row and column from what the
     round before knew, until a round decides nothing; this is the reasoning
     a player does one line at a time. `unreached` is the squares still
     undecided, which is true of the picture's clues and not of how clever
     the player is. `rounds` is how many times round the board it took, and
     `grade` names that: the measure of how hard a puzzle is. */
  const solve = g => {
    const rows = g.map(clues), cols = g[0].map((_, x) => clues(column(g, x)));
    let known = g.map(r => r.map(() => -1)), rounds = 0;
    for (;;) {
      const next = known.map(r => r.slice());
      let changed = false;
      const decide = (y, x, v) => { if (v !== -1 && next[y][x] === -1) { next[y][x] = v; changed = true; } };
      for (let y = 0; y < SIZE; y++) solveLine(rows[y], known[y]).forEach((v, x) => decide(y, x, v));
      for (let x = 0; x < SIZE; x++) solveLine(cols[x], column(known, x)).forEach((v, y) => decide(y, x, v));
      if (!changed) return { known, rounds };
      known = next;
      rounds++;
    }
  };
  const unreached = g => solve(g).known.map(r => r.map(v => v === -1));
  const rounds = g => solve(g).rounds;
  const grade = n => (n <= 3 ? 'easy' : n <= 5 ? 'medium' : 'hard');

  // Playing order: by level, easy to hard within one, then as they were made.
  const order = puzzles => {
    puzzles.forEach(p => { p.rounds ??= rounds(grid(p.squares)); });
    return [...puzzles].sort((a, b) => a.level - b.level || a.rounds - b.rounds
      || String(a.created_at).localeCompare(String(b.created_at)));
  };

  /* THE PUZZLE OF A DAY, made from its date so every browser draws the same
     one and nobody has to. Random squares are smoothed once, each following
     the majority of itself and its neighbours, and mirrored left to right,
     which gives a shape and not noise; the first try that fills 30 to 70
     squares and needs no guess is the puzzle. A year of days took at most
     8 tries. `day` is YYYY-MM-DD. */
  const daily = day => {
    let seed = +day.replace(/-/g, '') * 31;
    const random = () => {
      seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
    for (;;) {
      const noise = Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => (random() < .5 ? 1 : 0)));
      const near = (y, x) => {
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) n += noise[y + dy]?.[x + dx] || 0;
        return n;
      };
      const half = noise.map((r, y) => r.map((_, x) => (near(y, x) >= 5 ? 1 : 0)));
      const g = half.map(r => r.map((_, x) => r[x < SIZE / 2 ? x : SIZE - 1 - x]));
      const filled = g.flat().filter(Boolean).length;
      if (filled >= 30 && filled <= 70 && !unreached(g).flat().some(Boolean)) {
        const name = new Date(`${day}T12:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
        return { id: `daily-${day}`, day, name, squares: squaresOf(g), level: 0 };
      }
    }
  };
  // Today and the day before a day, as YYYY-MM-DD by this browser's clock.
  const stamp = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = () => stamp(new Date());
  const before = day => { const d = new Date(`${day}T12:00`); d.setDate(d.getDate() - 1); return stamp(d); };
  // Days solved in a row, ending today, or yesterday while today is unsolved.
  const streak = days => {
    let day = days.has(today()) ? today() : before(today()), n = 0;
    while (days.has(day)) { n++; day = before(day); }
    return n;
  };

  /* A BOARD. `state[y][x]` is 0 empty, 1 filled, 2 X, 3 a mistake's X.
     `options.done` greys a number once its run of squares is filled, and the
     whole line's numbers once every run is; `options.unknown` outlines
     squares that need a guess; `options.inks[y][x]` paints each square its
     colour of the picture. `board` builds the squares and numbers once
     and `paint` changes only what the state changed, so a square animates
     when it is filled and not on every move after. */
  const board = (host, answer, state, options = {}) => {
    const el = document.createElement('div');
    el.className = 'pixels-board';
    el.style.setProperty('--size', SIZE);
    el.setAttribute('role', 'grid');
    el.setAttribute('aria-label', options.label || 'Puzzle');
    el.appendChild(document.createElement('div'));
    const numbers = (target, line) => {
      const runs = runsOf(line);
      clues(line).forEach((n, i) => {
        const span = document.createElement('span');
        span.textContent = n;
        if (runs[i]) [span.dataset.from, span.dataset.length] = runs[i];
        target.appendChild(span);
      });
    };
    for (let x = 0; x < SIZE; x++) {
      const c = document.createElement('div');
      c.className = 'pixels-clue pixels-clue--col';
      c.dataset.col = x;
      numbers(c, column(answer, x));
      el.appendChild(c);
    }
    for (let y = 0; y < SIZE; y++) {
      const c = document.createElement('div');
      c.className = 'pixels-clue';
      c.dataset.row = y;
      numbers(c, answer[y]);
      el.appendChild(c);
      for (let x = 0; x < SIZE; x++) {
        const s = document.createElement('div');
        s.className = 'pixels-cell';
        s.dataset.x = x;
        s.dataset.y = y;
        // The finished picture fills in along its diagonals.
        s.style.setProperty('--wave', x + y);
        s.setAttribute('role', 'gridcell');
        el.appendChild(s);
      }
    }
    paint(el, answer, state, options);
    host.replaceChildren(el);
    // The row numbers' width, which app.css takes off the room for squares;
    // measured again once the font is in, which can change it.
    const measure = () => host.style.setProperty('--clues', `${Math.ceil(el.firstElementChild.getBoundingClientRect().width)}px`);
    measure();
    document.fonts?.ready.then(measure);
    return el;
  };

  const paint = (el, answer, state, options = {}) => {
    el.querySelectorAll('.pixels-cell').forEach(s => {
      const y = +s.dataset.y, x = +s.dataset.x, v = state[y][x];
      s.classList.toggle('is-fill', v === 1);
      s.classList.toggle('is-x', v === 2 || v === 3);
      s.classList.toggle('is-miss', v === 3);
      s.classList.toggle('is-unknown', !!options.unknown?.[y][x]);
      if (options.inks) s.dataset.ink = options.inks[y][x]; else delete s.dataset.ink;
      s.setAttribute('aria-label', `Row ${y + 1}, column ${x + 1}, ${['empty', 'filled', 'crossed out', 'mistake'][v]}`);
    });
    el.querySelectorAll('.pixels-clue').forEach(c => {
      const line = c.dataset.row != null ? state[+c.dataset.row] : column(state, +c.dataset.col);
      let all = !!options.done;
      c.querySelectorAll('span').forEach(span => {
        const from = +span.dataset.from, length = +span.dataset.length || 0;
        let filled = !!options.done;
        for (let k = from; k < from + length; k++) if (line[k] !== 1) filled = false;
        span.classList.toggle('is-done', filled);
        if (!filled) all = false;
      });
      c.classList.toggle('is-done', all);
    });
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

  // `colours`, a digit a square, paints the picture in its inks.
  const picture = (el, squares, colours) => {
    el.style.setProperty('--size', SIZE);
    el.replaceChildren(...[...squares].map((c, i) => {
      const s = document.createElement('span');
      if (c === '1') s.dataset.on = '';
      if (colours) s.dataset.ink = colours[i];
      return s;
    }));
    return el;
  };

  // Three stars, the lost ones dimmed.
  const stars = (el, n) => {
    el.classList.add('pixels-stars');
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', `${n} of 3 stars`);
    el.replaceChildren(...[1, 2, 3].map(i => {
      const s = document.createElement('span');
      s.textContent = '★';
      if (i <= n) s.dataset.on = '';
      return s;
    }));
    return el;
  };

  /* A TICK IN THE HAND. Android vibrates for `ms`. An iPhone has no vibration
     for a web page, but it ticks when a switch is flipped, so a hidden one is
     flipped through its label; that is one light tick, whatever `ms` says. */
  const touch = matchMedia('(pointer: coarse)').matches;
  const buzz = (ms = 10) => {
    if (!touch) return;
    if (navigator.vibrate) { navigator.vibrate(ms); return; }
    const label = document.createElement('label');
    label.hidden = true;
    const flip = document.createElement('input');
    flip.type = 'checkbox';
    flip.setAttribute('switch', '');
    label.appendChild(flip);
    document.head.appendChild(label);
    label.click();
    label.remove();
  };

  /* A TONE. Made in the browser, so there is no file to fetch: each kind is a
     few notes of [pitch in Hz, seconds]. `step` raises the pitch a semitone
     at a time, so a drag of fills climbs. `pixels-sound` set to off in this
     browser silences it, and so does an iPhone's silent switch. */
  const TONES = {
    fill: [[523, .06]],
    x: [[196, .05]],
    line: [[659, .07], [880, .1]],
    miss: [[147, .2]],
    hint: [[440, .07], [554, .1]],
    solved: [[523, .1], [659, .1], [784, .1], [1047, .25]],
  };
  const SOUND = 'pixels-sound';
  const sounds = on => {
    try {
      if (on != null) localStorage.setItem(SOUND, on ? 'on' : 'off');
      return localStorage.getItem(SOUND) !== 'off';
    } catch { return true; }
  };
  let audio;
  const sound = (kind, step = 0) => {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context || !sounds()) return;
    audio ??= new Context();
    if (audio.state === 'suspended') audio.resume();
    let at = audio.currentTime;
    for (const [pitch, length] of TONES[kind]) {
      const tone = audio.createOscillator(), level = audio.createGain();
      tone.type = kind === 'miss' ? 'sawtooth' : 'triangle';
      tone.frequency.value = pitch * 2 ** (Math.min(step, 12) / 12);
      level.gain.setValueAtTime(.15, at);
      level.gain.exponentialRampToValueAtTime(.001, at + length);
      tone.connect(level).connect(audio.destination);
      tone.start(at);
      tone.stop(at + length);
      at += length * .8;
    }
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
    SIZE, INKS: 8, grid, squaresOf, column, clues, solveLine, unreached, rounds, grade, order, daily, today, streak,
    board, paint, highlight, drag, picture, stars, buzz, sound, sounds, time, title, switcher,
  });
})();
