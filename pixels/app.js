/* ==========================================================================
   app.js — what every Pixels page shares
   --------------------------------------------------------------------------
   window.Pixels holds the puzzle rules and the board: a puzzle's squares are
   a string of 0s and 1s, row by row, and a puzzle is square, 5, 10 or 15 a
   side. `clues` gives a line's numbers,
   `unreached` says which squares logic alone cannot decide, `rounds` how
   hard the rest is and `firstLook` how much one look gives, `board` draws a
   board with its clues and `paint` keeps it in step with the game, `drag`
   paints along it, `picture` draws the finished picture, `penalty` is what a mistake costs,
   `buzz` ticks the phone and `sound` plays a tone. `order` puts puzzles in
   playing order, `categories` groups them and `daily` makes the puzzle of a
   day. `face` makes a player's picture from their username and `portrait`
   draws a player's. `tile` draws a puzzle's tile and `bar` a progress bar. `how` builds
   How to play. `installed` says the page was opened from a home screen
   icon and `iphone` that the phone is one, and `fresh` loads a page again
   after a minute away. The pages add their own behaviour in puzzles.js, category.js,
   play.js, make.js and manage.js.
   ========================================================================== */
(() => {
  'use strict';

  // The sides a puzzle may have, and the side of the puzzle of the day.
  const SIZES = [5, 10, 15], DAY = 10;

  /* THE PUZZLE OF THE DAY IS OFF. While this is false no page shows it: the
     front page has no Today card, the leaderboard ranks all time only, the
     owner's page drops its two columns for it, and play.html?daily says it
     is off. The maker still gives a puzzle its day and the owner still sees
     the days drawn, so they can be made ahead of turning it on. */
  const DAILY = false;

  /* THE LEADERBOARD IS OFF. While this is false the front page has no tabs
     and no ranking, only the puzzles, and does not ask the database for one.
     Results are saved as ever, so a ranking is there to show when it is on. */
  const BOARD = false;

  // The characters a square is stored as, in the order of their numbers: a
  // digit, then a letter of either case. A picture's inks are named by them.
  const CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  // Rows of numbers from a string of them, one character a square, and the
  // string again; a square puzzle unless told its width.
  const grid = (squares, width = Math.sqrt(squares.length)) =>
    Array.from({ length: squares.length / width }, (_, y) => [...squares.slice(y * width, y * width + width)].map(c => CHARS.indexOf(c)));
  const squaresOf = g => g.flat().map(n => CHARS[n]).join('');
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
     `grade` names that: the measure of how hard a puzzle is, easy, normal
     or hard. */
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
  // How much the first look gives: the share of the board that one look at
  // every row and column decides, before any square is known. It follows a
  // player's time more closely than the rounds do.
  const firstLook = g => {
    const known = g.map(row => solveLine(clues(row), row.map(() => -1)));
    g[0].forEach((_, x) => solveLine(clues(column(g, x)), g.map(() => -1)).forEach((v, y) => { if (v !== -1) known[y][x] = v; }));
    return known.flat().filter(v => v !== -1).length / (g.length * g[0].length);
  };
  const grade = n => (n <= 3 ? 'easy' : n <= 5 ? 'normal' : 'hard');

  // Playing order: the owner's before any player's, a maker at a time,
  // small boards first, then by level, easy to hard within one, then as
  // they were made. A puzzle drawn for a day is in no level,
  // and one in no category stands after its size's categories.
  const order = puzzles => {
    puzzles = puzzles.filter(p => !p.day);
    puzzles.forEach(p => { p.rounds ??= rounds(grid(p.squares, p.width)); });
    return [...puzzles].sort((a, b) => (a.maker ? 1 : 0) - (b.maker ? 1 : 0) || String(a.maker || '').localeCompare(String(b.maker || ''))
      || a.width - b.width || (a.level ?? 100) - (b.level ?? 100) || a.rounds - b.rounds
      || String(a.created_at).localeCompare(String(b.created_at)));
  };

  /* THE CATEGORIES among `puzzles`, in playing order. A category is one
     board size and one place among that size, which the data calls its
     level; `theme` is its name, and `puzzles` its own, easy to hard. A
     puzzle in no category, or drawn for a day, is in none of them.
     `heading` is what a category is called: its name, or More where it has
     none. `where` is the address of its page. A player's own gate carries
     its `maker` and, as `by`, their name and picture. One of the owner's
     carries its `number`, its place among the owner's, which says how hard
     it is; a player's own has none.

     A PLAYER READS A CATEGORY AS A GATE and a solved picture as a sprite.
     `side` is a gate's size as it is written, 10×10. `sprites` says how far through a gate a
     player is, and that it is cleared once every puzzle is solved. */
  const categories = puzzles => {
    const found = new Map();
    order(puzzles).forEach(p => {
      if (p.level == null) return;
      const key = `${p.maker || ''} ${p.width} ${p.level}`;
      if (!found.has(key)) {
        found.set(key, {
          width: p.width, level: p.level, theme: p.theme ?? null, hidden: !!p.hidden, puzzles: [], gate: p.gate ?? null, maker: p.maker ?? null,
          by: p.maker ? { name: p.maker_name, picture: p.maker_picture, colours: p.maker_colours } : null,
        });
      }
      found.get(key).puzzles.push(p);
    });
    const cats = [...found.values()];
    let n = 0;
    cats.forEach(c => { c.number = c.maker ? null : ++n; });
    return cats;
  };
  const heading = ({ theme }) => theme || 'More';
  const side = ({ width }) => `${width}×${width}`;
  const sprites = (solved, all) => (solved === all ? 'Gate cleared' : `${solved} of ${all} sprites`);
  const where = ({ width, level, maker }) => `category.html?size=${width}&at=${level}${maker ? `&by=${encodeURIComponent(maker)}` : ''}`;
  // A gate a player has opened is kept in their browser, so one they have
  // not says New. `seen` asks and `see` keeps.
  const SEEN = 'pixels-seen';
  const gateKey = c => c.gate || `${c.maker || ''}:${c.width}:${c.level}`;
  const opened = () => { try { return JSON.parse(localStorage.getItem(SEEN) || '[]'); } catch { return null; } };
  const seen = c => opened()?.includes(gateKey(c)) ?? true;
  const see = c => {
    const all = opened();
    if (!all || all.includes(gateKey(c))) return;
    try { localStorage.setItem(SEEN, JSON.stringify([...all, gateKey(c)])); } catch { /* it says New again */ }
  };

  // Numbers from 0 up to 1 that follow from `seed`, the same in every browser.
  const seeded = seed => () => {
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };

  /* THE PUZZLE OF A DAY. `day` is YYYY-MM-DD. If the owner drew one for the
     day, among `puzzles`, that is it, with its name and its colours. If not,
     one is made from the date, so every browser draws the same and no day
     goes without: random squares are smoothed once, each following the
     majority of itself and its neighbours, and mirrored left to right, which
     gives a shape and not noise; the first try that fills 30 to 70 squares
     and needs no guess is the puzzle. A year of days took at most 8 tries.

     Either way it is kept under the day, not under a puzzle's id, `date` is
     the day in words, and a made one has no name but that. */
  const daily = (day, puzzles = []) => {
    const date = new Date(`${day}T12:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
    const drawn = puzzles.find(p => p.day === day);
    if (drawn) return { ...drawn, id: `daily-${day}`, date, level: 0 };
    const random = seeded(+day.replace(/-/g, '') * 31);
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
        return { id: `daily-${day}`, day, date, name: date, squares: squaresOf(g), width: DAY, height: DAY, level: 0 };
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
     squares. Every other line's numbers sit on a band that runs out from its
     squares and fades. Each of the last three is a window onto a strip that slides
     behind it, so a zoomed board moves its squares both ways while the
     numbers move one way each and stay in view.

     Every board has one footprint, which app.css sizes: the squares
     together are one width whatever the puzzle, and the numbers keep one
     room. A line is told how wide its numbers are, as `--units`, in ems, a
     digit being .6 and the gap between two numbers .3, and how many it
     has, as `--count`, and app.css draws them smaller where they would not
     fit that room. */
  const board = (host, answer, state, options = {}) => {
    const H = answer.length, W = answer[0].length;
    const part = (name, parent) => {
      const d = document.createElement('div');
      d.className = name;
      parent.appendChild(d);
      return d;
    };
    const el = document.createElement('div');
    el.className = 'pixels-board';
    el.style.setProperty('--cols', W);
    el.style.setProperty('--rows', H);
    el.setAttribute('role', 'grid');
    el.setAttribute('aria-label', options.label || 'Puzzle');
    part('pixels-corner', el);
    const cols = part('pixels-slide', part('pixels-cols', el));
    const rows = part('pixels-slide', part('pixels-rows', el));
    const squares = part('pixels-slide', part('pixels-squares', el));
    const numbers = (target, line) => {
      const runs = runsOf(line), all = clues(line);
      target.style.setProperty('--units', (all.join('').length * .6 + (all.length - 1) * .3).toFixed(1));
      target.style.setProperty('--count', all.length);
      all.forEach((n, i) => {
        const span = document.createElement('span');
        span.textContent = n;
        if (runs[i]) [span.dataset.from, span.dataset.length] = runs[i];
        target.appendChild(span);
      });
    };
    // Every other line's numbers sit on a band, so the eye keeps to its line.
    const band = n => (n % 2 ? '' : ' is-band');
    for (let x = 0; x < W; x++) {
      const c = part(`pixels-clue pixels-clue--col${band(x)}`, cols);
      c.dataset.col = x;
      numbers(c, column(answer, x));
    }
    for (let y = 0; y < H; y++) {
      const c = part(`pixels-clue${band(y)}`, rows);
      c.dataset.row = y;
      numbers(c, answer[y]);
      for (let x = 0; x < W; x++) {
        // A stronger line round the edge, and a warm one after every fifth
        // square inside it.
        const side = (n, last, first, end) => (n === last ? ` ${end}` : `${n ? '' : ` ${first}`}${(n + 1) % 5 ? '' : ` is-fifth-${end.slice(3)}`}`);
        const s = part(`pixels-cell${side(x, W - 1, 'is-west', 'is-east')}${side(y, H - 1, 'is-north', 'is-south')}`, squares);
        s.dataset.x = x;
        s.dataset.y = y;
        // The finished picture fills in along its diagonals.
        s.style.setProperty('--wave', x + y);
        s.setAttribute('role', 'gridcell');
      }
    }
    paint(el, answer, state, options);
    host.replaceChildren(el);
    return el;
  };

  const paint = (el, answer, state, options = {}) => {
    el.querySelectorAll('.pixels-cell').forEach(s => {
      const y = +s.dataset.y, x = +s.dataset.x, v = state[y][x];
      s.classList.toggle('is-fill', v === 1);
      s.classList.toggle('is-x', v === 2 || v === 3);
      s.classList.toggle('is-miss', v === 3);
      s.classList.toggle('is-unknown', !!options.unknown?.[y][x]);
      if (options.inks) s.dataset.ink = CHARS[options.inks[y][x]]; else delete s.dataset.ink;
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
     `hover(y, x)`. Where `right` is set a mouse's right button drags too,
     with no menu, and `start` is told so by a third argument. Listeners sit
     on the host, which outlives redraws.

     ONE FINGER DRAWS, the last to land. A touch already on the board, such
     as the hand resting beside it, neither paints as it shifts nor ends
     the drag as it lifts.

     ZOOM. Where `zoom()` says the board may be too fine for a finger and
     its squares are in fact under 32px, which a phone's are and a tablet's
     are not, two fingers pinch it larger and slide it, up to squares 48px
     wide. The square the pinch began over stays under the fingers. There a touch
     fills when it lifts or crosses into a second square, not when it lands,
     so the first finger of a pinch leaves no stray fill; and after a pinch
     nothing fills until every finger is up. `--zoom`, `--tx` and `--ty` on
     the host are what app.css sizes and slides the board by. `reset()`
     takes the board back to its whole. */
  const drag = (host, { start, paint, hover, free = false, right = false, zoom = () => false }) => {
    let from = null, axis = null, last = null, pen = null;
    const FINE = 32;
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
    const begin = (p, other = false) => { from = last = p; axis = null; start(...p, other); };
    // Too fine for a finger: measured without the zoom, which a board whose
    // squares have since grown, on a turned screen, is taken out of.
    const fine = () => {
      if (!zoom()) return false;
      if (square() / z < FINE) return true;
      if (z !== 1) { z = 1; tx = ty = 0; apply(); }
      return false;
    };

    // An iPhone starts selecting text under a finger that rests or moves
    // slowly; stopping the touch's own default is what prevents it.
    host.addEventListener('touchstart', e => { if (e.cancelable) e.preventDefault(); }, { passive: false });
    host.addEventListener('pointerdown', e => {
      const p = at(e);
      if (!p || (e.button > 0 && !(right && e.button === 2))) return;
      e.preventDefault();
      if (e.pointerType !== 'touch' || !fine()) {
        pen = e.pointerId;
        begin(p, e.button === 2);
        return;
      }
      fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (fingers.size === 2) {
        const view = host.querySelector('.pixels-squares').getBoundingClientRect(), now = span(), size = square();
        pinch = { gap: now.gap, z, x: (now.x - view.x - tx) / size, y: (now.y - view.y - ty) / size };
        waiting = from = null;
      } else if (fingers.size === 1 && !spent) { waiting = p; pen = e.pointerId; }
    });
    host.addEventListener('contextmenu', e => { if (right && at(e)) e.preventDefault(); });
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
      if ((from || waiting) && e.pointerId !== pen) return;
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
      // Another finger lifting ends nothing.
      else if (e.pointerId !== pen) { if (!fingers.size) spent = false; return; }
      // A tap: the finger lifted on the square it landed on.
      if (waiting && e.type === 'pointerup') start(...waiting);
      waiting = from = pen = null;
      if (!fingers.size) spent = false;
    };
    addEventListener('pointerup', end);
    addEventListener('pointercancel', end);
    return { reset() { z = 1; tx = ty = 0; apply(); } };
  };

  // `colours`, a character a square, paints the picture in its inks.
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

  /* A PLAYER'S PICTURE, 15 squares a side. `face` makes one from a username,
     the same in every browser, for a player who has drawn none: squares
     scattered by the name, smoothed and mirrored, in one deep colour on its
     pale tone. `portrait` draws a player's own picture, or that one, small
     beside a name or large on their own page. */
  const FACE = 15;
  const face = name => {
    let seed = 0;
    for (const c of String(name).trim().toLowerCase()) seed = Math.imul(seed ^ c.codePointAt(0), 16777619);
    const random = seeded(seed);
    const hue = Math.floor(random() * 10);
    for (;;) {
      const noise = Array.from({ length: FACE }, () => Array.from({ length: FACE }, () => (random() < .5 ? 1 : 0)));
      const near = (y, x) => {
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) n += noise[y + dy]?.[x + dx] || 0;
        return n;
      };
      const g = noise.map((r, y) => r.map((_, x) => (near(y, Math.min(x, FACE - 1 - x)) >= 5 ? 1 : 0)));
      const filled = g.flat().filter(Boolean).length;
      if (filled >= 70 && filled <= 150) {
        return { squares: squaresOf(g), colours: g.flat().map(on => (on ? 'KLMNOPQRST' : 'ABCDEFGHIJ')[hue]).join('') };
      }
    }
  };
  const portrait = (player, large) => {
    const el = document.createElement('div');
    el.className = `pixels-picture pixels-face${large ? ' pixels-face--lg' : ''}`;
    el.setAttribute('aria-hidden', 'true');
    const of = player.picture ? { squares: player.picture, colours: player.colours } : face(player.name);
    return picture(el, of.squares, of.colours);
  };

  /* WHAT A MISTAKE COSTS is time on the clock, more each time.
     `penalty(n)` is the seconds a puzzle's nth mistake
     adds: 15, then 30, then a minute for each one after. HINT is what a hint
     adds. `added` writes such a cost as the clock would, +0:15. */
  const PENALTY = [15, 30, 60], HINT = 30;
  const penalty = n => PENALTY[Math.min(n, PENALTY.length) - 1];
  const added = seconds => `+${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

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
     browser silences it.

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
  /* An iPhone plays a page's tones as ambient sound, which its silent switch
     mutes; asked for the playback kind, the kind music apps use, it plays
     them whatever the switch says, and the game's own Sound switch is then
     the way to quiet it. It has to be asked before the sound is made. */
  const make = () => {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context || !sounds()) return;
    if (!audio && navigator.audioSession) navigator.audioSession.type = 'playback';
    audio ??= new Context();
  };
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
    if (document.hidden) return;
    make();
    if (!audio || audio.state === 'running') return;
    audio.resume().then(() => {
      if (held && performance.now() - held.at < FRESH) play(held.kind, held.step);
      held = null;
    }).catch(() => { /* still stopped; the next touch tries again */ });
  };
  const listen = () => {
    // Made now, while the page loads, so the first touch only has to start it.
    make();
    for (const type of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) addEventListener(type, wake, { capture: true, passive: true });
    document.addEventListener('visibilitychange', wake);
  };
  const sound = (kind, step = 0) => {
    if (!sounds()) return;
    if (audio?.state === 'running') play(kind, step);
    else { held = { kind, step, at: performance.now() }; wake(); }
  };

  const time = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  // A puzzle keeps its name hidden until it is solved. Until then it goes
  // by its letter in its gate, A to O as Picross DS letters a level's, which
  // `letter` gives; the last, which is the hardest, is the boss, and `boss`
  // says which.
  const boss = (c, index) => c.puzzles.length > 1 && index === c.puzzles.length - 1;
  const LETTERS = 'ABCDEFGHIJKLMNO';
  const letter = index => LETTERS[index] ?? String(index + 1);
  const title = (puzzle, index, solved, boss) => (solved ? puzzle.name : boss ? 'Boss' : `Puzzle ${letter(index)}`);

  /* A PUZZLE'S TILE, a square link: the picture once `best` is there, or a
     question mark, then `name`, then the best time. `mark` is its letter in
     its gate, on a tab in the tile's corner. `art` is the picture or the
     question mark alone, `words` a span of text, and `bar` a progress bar
     of `done` out of `all`. */
  const words = (cls, text) => {
    const el = document.createElement('span');
    el.className = cls;
    el.textContent = text;
    return el;
  };
  const art = (puzzle, solved) => {
    const el = document.createElement('div');
    if (solved) {
      el.className = 'pixels-picture pixels-picture--sm';
      picture(el, puzzle.squares, puzzle.colours);
    } else {
      el.className = 'pixels-blank';
      el.textContent = '?';
    }
    el.setAttribute('aria-hidden', 'true');
    return el;
  };
  const tile = (puzzle, name, href, best, mark) => {
    const a = document.createElement('a');
    a.className = 'rux--link rux--tile rux--tile--clickable pixels-puzzle';
    a.href = href;
    if (mark) a.append(words('pixels-letter', mark));
    // A line with nothing to say keeps its room, so every tile's picture
    // stands at one height.
    a.append(art(puzzle, best != null), words('pixels-puzzle-name', name || '\u00a0'), words('pixels-meta', best != null ? time(best.seconds) : '\u00a0'));
    return a;
  };
  const bar = (done, all) => {
    const el = document.createElement('div');
    el.className = 'rux--progress-bar rux--progress-bar--small';
    const track = document.createElement('div');
    track.className = 'rux--progress-bar__track';
    const fill = document.createElement('div');
    fill.className = 'rux--progress-bar__bar';
    fill.style.transform = `scaleX(${all ? done / all : 0})`;
    track.appendChild(fill);
    el.appendChild(track);
    return el;
  };

  /* HOW TO PLAY. A modal of three steps, each a small board beside its
     words: what the numbers mean, filling and crossing out, and what a
     mistake costs.
     The boards are the game's own, drawn by `board` from one picture of five
     squares a side, so they look as the puzzle does in every theme. Each
     page carries the empty modal, `pixels-how`, which is filled as the page
     loads; `how()` returns it. Anything carrying data-rux-open="pixels-how"
     opens it, as the entry in each page's menu does, and Design's script
     closes it.
     Closing it is kept in this browser under `pixels-how`, and `how.seen()`
     says so, which is how play.js opens it unasked only for someone who has
     never read it. */
  // A modal opened from the menu shuts the menu, so closing it shows the
  // page, and the focus goes to the menu's button, not to a link out of sight.
  const overMenu = modal => {
    let menu = null;
    modal.addEventListener('rux:modal-opened', () => {
      const nav = document.querySelector('.rux--side-nav--expanded');
      if (!nav) return;
      window.Rux.uiShell.closeNav(nav);
      menu = document.querySelector('.rux--header__menu-toggle');
    });
    modal.addEventListener('rux:modal-closed', () => { menu?.focus(); menu = null; });
  };
  const HOW = 'pixels-how';
  const how = () => {
    const modal = document.getElementById(HOW);
    if (!modal || modal.firstElementChild) return modal;
    const step = (heading, words) => `
          <li class="pixels-how-step">
            <div class="pixels-how-art" aria-hidden="true"></div>
            <div>
              <h3 class="rux--type-productive-heading-02">${heading}</h3>
              <p>${words}</p>
            </div>
          </li>`;
    modal.innerHTML = `
      <div role="dialog" aria-modal="true" aria-labelledby="${HOW}-heading" tabindex="-1" class="rux--modal-container rux--modal-container--sm">
        <div class="rux--modal-header">
          <h2 class="rux--modal-header__heading" id="${HOW}-heading">How to play</h2>
          <div class="rux--modal-close-button">
            <button type="button" class="rux--modal-close" aria-label="Close" data-rux-close>
              <svg class="rux--modal-close__icon" width="20" height="20" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><use href="#m-close"/></svg>
            </button>
          </div>
        </div>
        <div class="rux--modal-content">
          <ol class="pixels-how">${step('Read the numbers', 'Every number is a run of filled squares in its row or column, in order. 5 is five in a row. 1 1 is two single squares with a gap between them.')}${step('Fill what is certain', `A 5 in a row of five fills the whole row, so start with the biggest numbers. Mark a square that must be empty with X. ${touch ? 'Tap a square, or drag along a row or column.' : 'Click a square, or drag along a row or column; the right button marks an X.'}`)}${step('Mind the clock', `Filling a square that is not in the picture adds time: ${penalty(1)} seconds for the first mistake, ${penalty(2)} for the second and ${penalty(3)} for each one after. A hint adds ${HINT} seconds. Your best time on a puzzle is the one kept.`)}
          </ol>${touch ? '' : `
          <p class="pixels-how-keys">Keys: the arrows move, Z fills, X crosses out, H hints, U undoes and R redoes.</p>`}
        </div>
        <div class="rux--modal-footer">
          <button type="button" class="rux--btn rux--btn--primary" data-rux-close autofocus>Got it</button>
        </div>
      </div>`;
    // One picture, a heart, at three moments: solved, with its two rows of
    // five filled and the lines they finished crossed out, and after a mistake.
    const answer = grid('0101011111111110111000100');
    const begun = answer.map((r, y) => r.map((_, x) => (y === 1 || y === 2 ? 1 : x % 4 ? 0 : 2)));
    const missed = begun.map((r, y) => r.map((v, x) => (y === 4 && x === 1 ? 3 : v)));
    const [numbers, filling, mistake] = modal.querySelectorAll('.pixels-how-art');
    board(numbers, answer, answer);
    board(filling, answer, begun, { done: true });
    board(mistake, answer, missed, { done: true });
    const cost = document.createElement('span');
    cost.className = 'pixels-penalty';
    cost.textContent = added(penalty(1));
    mistake.appendChild(cost);
    modal.addEventListener('rux:modal-closed', () => { try { localStorage.setItem(HOW, 'seen'); } catch { /* shown again next time */ } });
    overMenu(modal);
    return modal;
  };
  how.seen = () => { try { return localStorage.getItem(HOW) === 'seen'; } catch { return true; } };
  how();

  // A Design content switcher. Design's own script moves the selection, by
  // click or arrow key; this hears which option was picked. `chosen` shows a
  // selection the page made itself, without telling the page about it.
  const switcher = (el, on) => el.addEventListener('rux:content-switcher-selected', e => on(e.detail.option));
  const chosen = (el, option) => window.Rux.contentSwitcher.select(el, option, { focus: false, silent: true });

  /* ON THE HOME SCREEN. An iPhone takes the icon and the name from tags in
     each page's head and is given no manifest, because with one its icon
     opens the manifest's start page and drops a guest's key from the
     address. Every other browser is given manifest.json here. `installed`
     says this page was opened from the icon, which an iPhone tells by
     `navigator.standalone` and the others by the window they are in.
     Android draws its bar in theme-color, kept here as the header's colour,
     or the page's for a guest, who has no header, through every change of
     theme; an iPhone draws its bar in the page's colour by itself. */
  const iphone = 'standalone' in navigator;
  if (!iphone) document.head.insertAdjacentHTML('beforeend', '<link rel="manifest" href="manifest.json">');
  const installed = iphone ? navigator.standalone === true : matchMedia('(display-mode: standalone)').matches;
  const tint = () => {
    const header = document.querySelector('.rux--header');
    const colour = getComputedStyle(header?.getClientRects().length ? header : document.body).backgroundColor;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta && meta.content !== colour) meta.content = colour;
  };
  tint();
  new MutationObserver(tint).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style'] });

  /* THE PLACES every player has, in one bar on the pages that carry it:
     along the bottom on a phone, along the top on a wide screen. This marks
     the place the page is; a gate's page is one of Puzzles'. */
  const here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.pixels-place').forEach(a => {
    const to = a.getAttribute('href') === './' ? 'index.html' : a.getAttribute('href');
    if (to === (here === 'category.html' ? 'index.html' : here)) a.setAttribute('aria-current', 'page');
  });

  /* A page left for a minute or more loads again as it comes back to the
     front, because an app on the home screen has no reload and a phone
     keeps its window open for days. */
  const fresh = () => {
    let left = 0;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) left = Date.now();
      else if (left && Date.now() - left >= 60000) location.reload();
    });
  };

  window.Pixels = Object.assign(window.Pixels || {}, {
    iphone, installed, fresh, overMenu, face, portrait, seen, see, side, sprites, boss, letter,
    SIZES, DAILY, BOARD, CHARS, grid, squaresOf, column, clues, solveLine, unreached, rounds, firstLook, grade, order, categories, heading, where,
    daily, today, streak, board, paint, highlight, drag, picture, penalty, HINT, added, buzz, sound, sounds, listen, time, title,
    words, art, tile, bar, how, switcher, chosen,
  });
})();
