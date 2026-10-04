/* ==========================================================================
   app.js — what every Pixels page shares
   --------------------------------------------------------------------------
   window.Pixels holds the puzzle rules and the board: a puzzle's squares are
   a string of 0s and 1s, row by row, and a puzzle is square, 5, 10 or 15 a
   side. `clues` gives a line's numbers,
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

  // The sides a puzzle may have, and the side of the puzzle of the day.
  const SIZES = [5, 10, 15], DAY = 10;

  // Rows of numbers from a string of them; a square puzzle unless told its width.
  const grid = (squares, width = Math.sqrt(squares.length)) =>
    Array.from({ length: squares.length / width }, (_, y) => [...squares.slice(y * width, y * width + width)].map(Number));
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
      for (let y = 0; y < g.length; y++) solveLine(rows[y], known[y]).forEach((v, x) => decide(y, x, v));
      for (let x = 0; x < g[0].length; x++) solveLine(cols[x], column(known, x)).forEach((v, y) => decide(y, x, v));
      if (!changed) return { known, rounds };
      known = next;
      rounds++;
    }
  };
  const unreached = g => solve(g).known.map(r => r.map(v => v === -1));
  const rounds = g => solve(g).rounds;
  const grade = n => (n <= 3 ? 'easy' : n <= 5 ? 'medium' : 'hard');

  // Playing order: small boards first, then by level, easy to hard within
  // one, then as they were made.
  const order = puzzles => {
    puzzles.forEach(p => { p.rounds ??= rounds(grid(p.squares, p.width)); });
    return [...puzzles].sort((a, b) => a.width - b.width || a.level - b.level || a.rounds - b.rounds
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
      const noise = Array.from({ length: DAY }, () => Array.from({ length: DAY }, () => (random() < .5 ? 1 : 0)));
      const near = (y, x) => {
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) n += noise[y + dy]?.[x + dx] || 0;
        return n;
      };
      const half = noise.map((r, y) => r.map((_, x) => (near(y, x) >= 5 ? 1 : 0)));
      const g = half.map(r => r.map((_, x) => r[x < DAY / 2 ? x : DAY - 1 - x]));
      const filled = g.flat().filter(Boolean).length;
      if (filled >= 30 && filled <= 70 && !unreached(g).flat().some(Boolean)) {
        const name = new Date(`${day}T12:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
        return { id: `daily-${day}`, day, name, squares: squaresOf(g), width: DAY, height: DAY, level: 0 };
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
     when it is filled and not on every move after.

     It is four parts: a corner, the column numbers, the row numbers and the
     squares. Each of the last three is a window onto a strip that slides
     behind it, so a zoomed board moves its squares both ways while the
     numbers move one way each and stay in view. */
  const board = (host, answer, state, options = {}) => {
    const H = answer.length, W = answer[0].length;
    const part = (name, parent) => {
      const d = document.createElement('div');
      d.className = name;
      parent.appendChild(d);
      return d;
    };
    const el = document.createElement('div');
    el.className = `pixels-board${W <= 5 ? ' pixels-board--small' : ''}`;
    el.style.setProperty('--cols', W);
    el.style.setProperty('--rows', H);
    el.setAttribute('role', 'grid');
    el.setAttribute('aria-label', options.label || 'Puzzle');
    part('pixels-corner', el);
    const cols = part('pixels-slide', part('pixels-cols', el));
    const rows = part('pixels-slide', part('pixels-rows', el));
    const squares = part('pixels-slide', part('pixels-squares', el));
    const numbers = (target, line) => {
      const runs = runsOf(line);
      clues(line).forEach((n, i) => {
        const span = document.createElement('span');
        span.textContent = n;
        if (runs[i]) [span.dataset.from, span.dataset.length] = runs[i];
        target.appendChild(span);
      });
    };
    for (let x = 0; x < W; x++) {
      const c = part('pixels-clue pixels-clue--col', cols);
      c.dataset.col = x;
      numbers(c, column(answer, x));
    }
    for (let y = 0; y < H; y++) {
      const c = part('pixels-clue', rows);
      c.dataset.row = y;
      numbers(c, answer[y]);
      for (let x = 0; x < W; x++) {
        // A stronger line round the edge and after every fifth square.
        const s = part(`pixels-cell${x ? '' : ' is-west'}${y ? '' : ' is-north'}${(x + 1) % 5 ? '' : ' is-east'}${(y + 1) % 5 ? '' : ' is-south'}`, squares);
        s.dataset.x = x;
        s.dataset.y = y;
        // The finished picture fills in along its diagonals.
        s.style.setProperty('--wave', x + y);
        s.setAttribute('role', 'gridcell');
      }
    }
    paint(el, answer, state, options);
    host.replaceChildren(el);
    // The row numbers' width, which app.css takes off the room for squares;
    // measured again once the font is in, which can change it.
    const measure = () => host.style.setProperty('--clues', `${Math.ceil(rows.parentElement.getBoundingClientRect().width)}px`);
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
     keeps to the first row or column it moves along; `free` lets the maker
     draw in any direction. A mouse moving with no button down calls
     `hover(y, x)`. Listeners sit on the host, which outlives redraws.

     ZOOM. Where `zoom()` says the board is too fine for a finger, two
     fingers pinch it larger and slide it, up to squares 48px wide. The
     square the pinch began over stays under the fingers. There a touch
     fills when it lifts or crosses into a second square, not when it lands,
     so the first finger of a pinch leaves no stray fill; and after a pinch
     nothing fills until every finger is up. `--zoom`, `--tx` and `--ty` on
     the host are what app.css sizes and slides the board by. `reset()`
     takes the board back to its whole. */
  const drag = (host, { start, paint, hover, free = false, zoom = () => false }) => {
    let from = null, axis = null, last = null;
    const fingers = new Map();
    let waiting = null, pinch = null, spent = false, z = 1, tx = 0, ty = 0;
    const at = e => {
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('.pixels-cell');
      return el && host.contains(el) ? [+el.dataset.y, +el.dataset.x] : null;
    };
    const apply = () => {
      host.style.setProperty('--zoom', z);
      host.style.setProperty('--tx', `${tx}px`);
      host.style.setProperty('--ty', `${ty}px`);
    };
    const square = () => host.querySelector('.pixels-cell').getBoundingClientRect().width;
    // Two fingers: how far apart, and the point between them.
    const span = () => {
      const [a, b] = [...fingers.values()];
      return { gap: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    };
    const begin = p => { from = last = p; axis = null; start(...p); };

    // An iPhone starts selecting text under a finger that rests or moves
    // slowly; stopping the touch's own default is what prevents it.
    host.addEventListener('touchstart', e => { if (e.cancelable) e.preventDefault(); }, { passive: false });
    host.addEventListener('pointerdown', e => {
      const p = at(e);
      if (!p || e.button > 0) return;
      e.preventDefault();
      if (e.pointerType !== 'touch' || !zoom()) { begin(p); return; }
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (fingers.size === 2) {
        const view = host.querySelector('.pixels-squares').getBoundingClientRect(), now = span(), size = square();
        pinch = { gap: now.gap, z, x: (now.x - view.x - tx) / size, y: (now.y - view.y - ty) / size };
        waiting = from = null;
      } else if (fingers.size === 1 && !spent) waiting = p;
    });
    host.addEventListener('pointermove', e => {
      if (fingers.has(e.pointerId)) fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch) {
        if (fingers.size < 2) return;
        const el = host.querySelector('.pixels-board'), box = host.querySelector('.pixels-squares').getBoundingClientRect(), now = span();
        const cols = +el.style.getPropertyValue('--cols'), rows = +el.style.getPropertyValue('--rows');
        z = Math.min(Math.max(1, 48 * cols / box.width), Math.max(1, pinch.z * now.gap / pinch.gap));
        apply();
        // The strips are as long as the zoomed squares; slide them no further
        // than their ends.
        const size = square();
        tx = Math.min(0, Math.max(box.width - size * cols, now.x - box.x - pinch.x * size));
        ty = Math.min(0, Math.max(box.height - size * rows, now.y - box.y - pinch.y * size));
        apply();
        return;
      }
      const p = at(e);
      if (waiting) {
        if (!p || (p[0] === waiting[0] && p[1] === waiting[1])) return;
        begin(waiting);
        waiting = null;
      }
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
    const end = e => {
      fingers.delete(e.pointerId);
      if (pinch) { pinch = null; spent = true; }
      // A tap: the finger lifted on the square it landed on.
      if (waiting && e.type === 'pointerup') start(...waiting);
      waiting = from = null;
      if (!fingers.size) spent = false;
    };
    addEventListener('pointerup', end);
    addEventListener('pointercancel', end);
    return { reset() { z = 1; tx = ty = 0; apply(); } };
  };

  // `colours`, a digit a square, paints the picture in its inks.
  const picture = (el, squares, colours) => {
    el.style.setProperty('--size', Math.sqrt(squares.length));
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
     few notes of [pitch in Hz, seconds], and a third number is the pitch the
     note slides to, which is how `pop` falls. `step` raises the pitch a
     semitone at a time, so a drag of fills climbs. `pixels-sound` set to off in this
     browser silences it, and so does an iPhone's silent switch.

     A phone keeps sound stopped until a touch, takes a moment to start it,
     and stops it again after a call or a trip to the home screen. A tone
     asked for while it is stopped would be scheduled on a clock that is not
     running and never heard, so `sound` holds the latest one and `wake`,
     which `listen` runs on every touch and key, starts the sound and plays
     it if it is still fresh. Only a tap starts it, never a drag, which is
     why play.js opens each puzzle behind a button. */
  const TONES = {
    fill: [[523, .06]],
    pop: [[440, .09, 220]],
    x: [[196, .05]],
    line: [[659, .07], [880, .1]],
    miss: [[147, .2]],
    hint: [[440, .07], [554, .1]],
    solved: [[523, .1], [659, .1], [784, .1], [1047, .25]],
  };
  const SOUND = 'pixels-sound', FRESH = 400;
  const sounds = on => {
    try {
      if (on != null) localStorage.setItem(SOUND, on ? 'on' : 'off');
      return localStorage.getItem(SOUND) !== 'off';
    } catch { return true; }
  };
  let audio, held = null;
  const play = (kind, step) => {
    // A little ahead of now, so the first note is not cut short.
    let at = audio.currentTime + .01;
    for (const [pitch, length, slide] of TONES[kind]) {
      const tone = audio.createOscillator(), level = audio.createGain();
      tone.type = kind === 'miss' ? 'sawtooth' : 'triangle';
      tone.frequency.setValueAtTime(pitch * 2 ** (Math.min(step, 12) / 12), at);
      if (slide) tone.frequency.exponentialRampToValueAtTime(slide, at + length);
      level.gain.setValueAtTime(.15, at);
      level.gain.exponentialRampToValueAtTime(.001, at + length);
      tone.connect(level).connect(audio.destination);
      tone.start(at);
      tone.stop(at + length);
      at += length * .8;
    }
  };
  const wake = () => {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context || !sounds() || document.hidden) return;
    audio ??= new Context();
    if (audio.state === 'running') return;
    audio.resume().then(() => {
      if (held && performance.now() - held.at < FRESH) play(held.kind, held.step);
      held = null;
    }).catch(() => { /* still stopped; the next touch tries again */ });
  };
  const listen = () => {
    // Made now, while the page loads, so the first touch only has to start it.
    const Context = window.AudioContext || window.webkitAudioContext;
    if (Context && sounds()) audio ??= new Context();
    for (const type of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) addEventListener(type, wake, { capture: true, passive: true });
    document.addEventListener('visibilitychange', wake);
  };
  const sound = (kind, step = 0) => {
    if (!sounds()) return;
    if (audio?.state === 'running') play(kind, step);
    else { held = { kind, step, at: performance.now() }; wake(); }
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
    SIZES, INKS: 8, grid, squaresOf, column, clues, solveLine, unreached, rounds, grade, order, daily, today, streak,
    board, paint, highlight, drag, picture, stars, buzz, sound, sounds, listen, time, title, switcher,
  });
})();
