/* ==========================================================================
   play.js — one puzzle
   --------------------------------------------------------------------------
   Fill a square or cross it out with X; a mouse's right button crosses out
   whichever is chosen. Filling a square that is not in the picture is a
   mistake: it is crossed out in red and costs a heart. A number greys out
   once its run of squares is filled, a line with no square of the picture
   starts crossed out, a line that is finished crosses out its own empty
   squares, and the puzzle is solved when every square of the picture is
   filled.

   THE PUZZLE IS A FIGHT. Over the board stand the player's hearts, app.js's
   HEARTS of them, and the enemy's health, a bar of the picture's squares
   still to fill. At no hearts the board takes no touch and a cover over it
   asks which: a fairy, where the player has one and the database takes it,
   brings every heart back, or the puzzle starts again as Restart starts it.

   THE SWITCH. The owner's two tool keys are one switch while its pictures
   are placeholders: the sword, which fills, on its left and the shield,
   which crosses out, on its right, with no mark beside either. A tap on a
   half picks it, and so does a finger's slide toward it.

   THE CLOCK IS THE SCORE. It only counts up, but for a hint, which adds
   app.js's HINT seconds unless a fairy gives it and turns the clock red
   until the next move. The best time on a
   puzzle is the one kept. Hint points at a wrong X if there is one, and
   otherwise at the line where the numbers decide the most squares from what
   is on the board.

   THE BOARD WAITS BEHIND "TAP TO START", or "Tap to continue" for a game
   in progress; with a mouse the button says Start or Continue. Until then
   app.css draws the board bare, with no number and no mark. The numbers show and the clock runs from that tap, so a best
   time does not count the page loading or being read. It is also what lets
   a phone play the sounds at all: a phone starts a page's sound only from a
   tap, never from a drag, and a puzzle is usually begun with a drag.

   HOW TO PLAY opens from the menu and from the button under Start, and by
   itself over the cover for a player with no puzzle solved who has never
   closed it in this browser. The clock stands while it is open. app.js's
   `how` builds it.

   UNDO takes back the last tap or drag, with the squares a finished line
   crossed out for it, as far back as the puzzle's start, and REDO puts it
   back until a new move is made. Neither touches a mistake: the red X stays
   and so does the heart it cost, and a tap that was only a mistake is no move
   to take back. Restart empties the board, zeroes the clock and fills the
   hearts, and Undo straight after it brings everything back.

   A board wider than ten squares zooms under two fingers where its squares
   are too fine for one; app.js's `drag` says how.

   BACK goes to the puzzle's category, and so does the category's own tile
   once it is solved, which stands under the time with the sprite counted.
   Next is the next unsolved puzzle of that category, then the first
   unsolved of the category after it, and so round to the first, passing by
   a rift that is still locked and a boss still held back. A boss held
   back, by app.js's `holds`, is not played by its address either.

   THE OWNER PLAYS ANY PUZZLE, from Manage. One no player is sent is a
   trial: titled by its name, with no Next and no rift, its Back to Manage,
   and its time not kept.

   play.html?daily plays the puzzle of the day, the one the owner drew for
   today or else the one app.js makes from the date; its result is kept by
   day, and solving it shows the days in a row.

   Each fill, X, finished line, mistake, fall, hint and solve plays a tone and
   ticks the phone, and an X taken off or a move undone plays a falling
   one. The Sound key keeps its choice in this browser.

   THE PICTURE SO FAR is drawn small in the board's corner, over the clock:
   the filled squares only, as they are filled.

   A game in progress is kept in this browser under `pixels-progress`, so a
   phone that reloads the page picks up where it was. It is dropped once the
   puzzle is solved or started over.
   ========================================================================== */
(() => {
  'use strict';

  const { data, owner, enter, boss, holds, DAILY, grid, column, clues, solveLine, order, categories, where, daily, today, streak, board, paint, highlight, drag, picture, HEARTS, HINT, added, buzz, sound, sounds, listen, time, title, riftTile, locks, fairy, heart, sword, shield, how } = window.Pixels;
  const $ = id => document.getElementById(id);
  const game = $('pixels-game'), boardHost = $('pixels-board'), status = $('pixels-status'), clock = $('pixels-clock');

  const PROGRESS = 'pixels-progress';
  // How long the finished picture takes to fill in before the name shows.
  const REVEAL = 1100;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // How far a finger slides along the switch before it picks a half.
  const SLIDE = 24;

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
    if (isDaily && !DAILY) { say('The puzzle of the day is off for now', 'Pick a puzzle from the list.'); game.classList.remove('is-loading'); return; }
    let me, puzzles, results;
    try {
      // A guest with no player yet is asked for a name first.
      me = await enter(game.parentElement);
      if (!me) return;
      [puzzles, results] = await Promise.all([data.list(), isDaily ? data.days() : data.results()]);
    } catch {
      say('The puzzle did not load', 'Reload the page to try again.');
      return;
    }
    // Today's puzzle is the one drawn for today, if there is one.
    const puzzle0 = isDaily ? daily(today(), puzzles) : null;
    const cats = categories(puzzles);
    puzzles = order(puzzles);
    let puzzle = isDaily ? puzzle0 : puzzles.find(p => String(p.id) === id);
    // A puzzle no player is sent is the owner's to try.
    let trial = false;
    if (!puzzle && owner && data.all) {
      try { puzzle = (await data.all()).find(p => String(p.id) === id && !p.day); } catch { /* said below */ }
      trial = !!puzzle;
    }
    if (!puzzle) { say('This puzzle is not here', 'It may have been deleted. Pick another from Puzzles.'); return; }
    // Its category, and its place among that category's puzzles.
    const home = cats.find(c => c.puzzles.includes(puzzle)), index = home ? home.puzzles.indexOf(puzzle) : -1;
    // A rift of the course that is not open yet is not played, by its
    // address either. The owner plays any, as Manage's Play needs.
    if (!isDaily) locks(cats, results);
    if (home?.short && !owner) {
      say('This rift is not open yet', `${home.need - home.short} of ${home.need} sprites to open it. Pick a puzzle from Puzzles.`);
      return;
    }
    // Nor is a boss the rift still holds back.
    if (home && !owner && boss(home, index) && holds(home, results)) {
      const left = home.puzzles.slice(0, -1).filter(p => !results.has(p.id)).length;
      say('The boss is not out yet', `${left} more sprite${left === 1 ? '' : 's'} to find in this rift first.`);
      return;
    }
    const back = trial ? 'manage.html' : home ? where(home) : './';
    $('pixels-back').href = $('pixels-out').href = back;
    if (trial) $('pixels-out').textContent = 'Manage';
    // What a result is kept under: the day, or the puzzle's id.
    const key = isDaily ? puzzle.day : puzzle.id;
    // A name stays hidden until its puzzle is solved; the day's shows its
    // date, and the owner's trial its name.
    const heading = isDaily ? (results.has(key) ? puzzle.name : puzzle.date) : trial ? puzzle.name : title(puzzle, index, results.has(key), !!home && boss(home, index));
    const answer = grid(puzzle.squares, puzzle.width), H = answer.length, W = answer[0].length;
    // app.css sizes a board of twenty by a step of its own.
    game.dataset.side = W;
    // An empty board: a line with no square of the picture starts crossed out.
    const bare = { rows: answer.map(r => !r.includes(1)), cols: answer[0].map((_, x) => !column(answer, x).includes(1)) };
    const blank = () => answer.map((r, y) => r.map((_, x) => (bare.rows[y] || bare.cols[x] ? 2 : 0)));

    const kept = loadProgress()[puzzle.id];
    // A kept game marked `free` may hold wrong fills, which this game never
    // has, so it is not picked up.
    const fresh = kept && kept.squares === puzzle.squares && !kept.free;
    let state = fresh ? kept.state : blank();
    let seconds = fresh ? kept.seconds : 0;
    let mistakes = fresh ? kept.mistakes : 0;
    let hints = fresh ? kept.hints || 0 : 0;
    // The hearts left, all of them for a kept game that says none, and
    // whether the character is down, at no hearts, with the cover up.
    let hearts = fresh ? kept.hearts ?? HEARTS : HEARTS, down = false;
    // The fairies this game has spent, how many the player has left, and
    // whether the database is being asked for one.
    let spent = fresh ? kept.fairies || 0 : 0, fairies = me.fairies || 0, asking = false;
    // No square is marked until a finger, the mouse or an arrow key picks one.
    // `climb` counts the fills of one drag, so each sounds a step higher.
    let tool = 'fill', action = null, cursor = [], solved = false, climb = 0;
    // Nothing moves, and the clock stands, until the cover is tapped; and
    // the board takes no touch for a moment after, so a second tap meant for
    // the cover cannot land on the square that was under it.
    let started = false, settling = false;
    // The board before each tap or drag that changed it, and the board as a
    // tap or drag began, kept only once that one changes something other
    // than by a mistake.
    // `ahead` is the boards Undo left, for Redo, until a new move is made.
    let past = [], held = null, ahead = [];

    $('pixels-title').textContent = heading;
    document.title = `${heading} — Pixels`;

    const keep = () => saveProgress(puzzle.id, { squares: puzzle.squares, state, seconds, mistakes, hints, hearts, fairies: spent });
    const el = board(boardHost, answer, state, { done: true, label: 'Puzzle' });
    // The name, the picture so far and the clock sit in the board's corner.
    el.querySelector('.pixels-corner').appendChild($('pixels-info'));
    $('pixels-info').hidden = false;
    const thumb = picture($('pixels-thumb'), '0'.repeat(W * H));
    // The enemy's health is the share of the picture's squares not yet filled.
    const foe = $('pixels-foe'), whole = answer.flat().filter(Boolean).length;
    const draw = () => {
      paint(el, answer, state, { done: true });
      [...thumb.children].forEach((s, i) => s.toggleAttribute('data-on', state[Math.floor(i / W)][i % W] === 1));
      const left = (whole - state.flat().filter(v => v === 1).length) / whole;
      foe.style.setProperty('--left', left);
      foe.setAttribute('aria-valuenow', Math.round(left * 100));
      el.querySelectorAll('.is-hint').forEach(e => e.classList.remove('is-hint'));
      highlight(el, ...cursor);
      $('pixels-undo').disabled = !past.length;
      $('pixels-redo').disabled = !ahead.length;
    };
    const tick = () => { clock.textContent = time(seconds); };
    // With nothing to say, the clock is no longer red.
    const tell = (text, error) => {
      status.textContent = text;
      if (!text) delete clock.dataset.charged;
      if (error) status.dataset.error = ''; else delete status.dataset.error;
    };

    // The hearts, a lost one dim; `hit` shakes the one just lost.
    const life = $('pixels-hearts');
    const showHearts = hit => {
      life.replaceChildren(...Array.from({ length: HEARTS }, (_, n) => {
        const one = heart();
        one.toggleAttribute('data-lost', n >= hearts);
        one.toggleAttribute('data-hit', !!hit && n === hearts);
        return one;
      }));
      life.setAttribute('aria-label', `${hearts} of ${HEARTS} hearts`);
    };

    // A hint puts `cost` seconds on the clock and turns it red.
    const charge = cost => {
      seconds += cost;
      tick();
      clock.dataset.charged = '';
    };

    // The clock runs only while the page is in front and How to play is shut.
    const guide = how();
    setInterval(() => {
      if (!started || solved || document.hidden || guide.classList.contains('is-visible')) return;
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
      let best = { best: seconds, isNew: true }, lost = false;
      const [saved] = await Promise.allSettled([
        trial ? best : isDaily ? data.recordDay(key, seconds) : data.record(key, seconds),
        new Promise(done => setTimeout(done, still ? 0 : REVEAL)),
      ]);
      if (saved.status === 'fulfilled') best = saved.value; else lost = true;

      $('pixels-solved-name').textContent = puzzle.name;
      $('pixels-solved-clock').textContent = time(seconds);
      // What went wrong and what the hints added, then how the time stands.
      const count = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
      const parts = [mistakes ? count(mistakes, 'mistake') : 'No mistakes'];
      if (spent) parts.push(`${spent} ${spent === 1 ? 'fairy' : 'fairies'}`);
      if (hints) parts.push(count(hints, 'hint'), added(hints * HINT));
      if (lost) parts.push('not saved');
      else if (trial) parts.push('a trial, not kept');
      else if (!best.isNew) parts.push(`best ${time(best.best)}`);
      else if (results.has(key)) parts.push('a new best');
      if (isDaily && !lost) {
        const row = streak(new Set([...results.keys(), key]));
        parts.push(`${row} day${row === 1 ? '' : 's'} in a row`);
      }
      $('pixels-solved-time').textContent = parts.join(' · ');
      document.title = `${puzzle.name} — Pixels`;
      // The next puzzle not yet solved: the rest of this category, after
      // this one and then before it, then each category after it and round
      // to the first. After the puzzle of the day, the first not yet solved;
      // after a trial, none.
      const at = cats.indexOf(home);
      const rest = isDaily ? puzzles : trial ? [] : [
        ...home.puzzles.slice(index + 1), ...home.puzzles.slice(0, index),
        ...[...cats.slice(at + 1), ...cats.slice(0, at)].flatMap(c => c.puzzles),
      ];
      const done = isDaily ? await data.results().catch(() => new Map()) : results;
      // The rifts as they stand with this sprite counted: Next passes by
      // one still locked and a boss still held back, and `opened` is those
      // this sprite opened.
      const shut = cats.filter(c => c.short > 0), known = new Set(done.keys());
      if (home && !lost) known.add(puzzle.id);
      locks(cats, known);
      const opened = shut.filter(c => !c.short), riftOf = new Map(cats.flatMap(c => c.puzzles.map(p => [p, c])));
      const kept = p => { const c = riftOf.get(p); return !!c && (c.short > 0 || (p === c.puzzles.at(-1) && holds(c, known))); };
      const next = rest.find(p => !done.has(p.id) && !kept(p));
      if (next) $('pixels-next').href = `play.html?id=${encodeURIComponent(next.id)}`;
      else $('pixels-next').remove();
      /* THE PUZZLE'S RIFT stands under the time as the front page draws it,
         with this sprite counted, and is the way back to it. A sprite found
         for the first time fills its bar from where it stood, and one in a
         puzzle somebody else made earns a mana, which the tile says; the
         owner has no mana to earn. A time that was not saved counts
         nothing. A rift this sprite cleared says the fairies it freed,
         and one it opened stands under it, saying Opened. */
      if (home) {
        const first = !results.has(key) && !lost, all = home.puzzles.length;
        const was = home.puzzles.filter(p => results.has(p.id)).length, found = was + (first ? 1 : 0);
        const earned = first && !owner && me.mana != null && puzzle.maker !== me.id;
        // A rift of the course just cleared frees three fairies. The
        // database is the one that counts them, so it is asked again.
        let freed = 0;
        if (first && found === all) {
          try {
            const now = await data.me();
            freed = Math.max(0, (now?.fairies ?? fairies) - fairies);
            fairies += freed;
          } catch { /* Me says how many, the next time it is opened */ }
        }
        const rift = riftTile(home, found, earned ? '+1 mana' : '', freed ? `+${freed} fairies` : '');
        const list = document.createElement('div');
        list.className = 'game-tiles';
        list.append(rift, ...opened.map(c => riftTile(c, c.puzzles.filter(p => known.has(p.id)).length, 'Opened')));
        $('pixels-out').remove();
        const keys = $('pixels-solved').querySelector('.game-finish-actions');
        keys.before(list);
        if (!keys.childElementCount) keys.remove();
        if (first && !still) rift.querySelector('.rux--progress-bar__bar').animate(
          [{ transform: `scaleX(${was / all})` }, { transform: `scaleX(${found / all})` }],
          { duration: 600, delay: 500, easing: 'ease-out', fill: 'backwards' });
      }
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

    // Solved when every square of the picture is filled; a wrong fill is
    // crossed out, so nothing else can be.
    const isSolved = () => answer.every((r, y) => r.every((c, x) => !c || state[y][x] === 1));

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
      if (!started || settling || solved || asking || down) return;
      const v = state[y][x];
      let missed = false;
      if (action === 'fill' && v === 0) {
        if (answer[y][x]) {
          state[y][x] = 1;
          const closed = closeLines(y, x);
          // The last square has the finish's tick and tone, not a line's on
          // top of them.
          if (!isSolved()) {
            buzz(closed ? 30 : 10);
            sound(closed ? 'line' : 'fill', closed ? 0 : climb++);
          }
          tell('');
        } else {
          state[y][x] = 3;
          mistakes++;
          hearts--;
          showHearts(true);
          buzz([40, 60, 40]);
          sound(hearts ? 'miss' : 'fall');
          tell('Not in the picture', true);
          missed = true;
        }
      } else if (action === 'x' && v === 0) { state[y][x] = 2; sound('x'); }
      else if (action === 'unx' && v === 2) { state[y][x] = 0; sound('pop'); }
      else return;
      // A mistake is not a move: Undo has nothing of it to take back.
      if (held && !missed) { past.push(held); held = null; ahead = []; }
      cursor = [y, x];
      draw();
      keep();
      if (isSolved()) finish();
      else if (missed && !hearts) fall();
    };
    // A drag keeps doing what its first square did, so X that starts on an X
    // takes them off along the drag.
    const begin = (y, x, which = tool) => {
      action = which === 'fill' ? 'fill' : state[y][x] === 2 ? 'unx' : 'x';
      climb = 0;
      held = state.map(r => r.slice());
      act(y, x);
    };

    const undo = () => {
      if (!started || solved || down || !past.length) return;
      const entry = past.pop();
      // A Restart taken back: the board, the clock, its mistakes and the
      // hearts as they were, down again if there were none.
      if (!Array.isArray(entry)) {
        ({ state, seconds, mistakes, hints, spent, hearts, past } = entry);
        ahead = [];
        tick();
        showHearts();
        if (!hearts) fall();
      } else {
        ahead.push(state.map(r => r.slice()));
        // A mistake made since stays as it is.
        state = entry.map((r, y) => r.map((v, x) => (state[y][x] === 3 ? 3 : v)));
      }
      cursor = [];
      tell('');
      sound('pop');
      draw();
      keep();
    };
    const redo = () => {
      if (!started || solved || down || !ahead.length) return;
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
       failing that the most to cross out, is lit.

       A FAIRY, where the player has one and the database takes it, finishes
       that line and adds no time: every square of it is filled or crossed
       out as the picture has it. Where there is a wrong X, the line is its
       row. Her squares are a move like any other, which Undo takes back,
       though the fairy stays spent. The board takes no touch while the
       database is asked. With no fairy, or no answer, the hint lights the
       line and adds its time. */
    const fairyKey = $('pixels-fairies'), fairyCount = document.createElement('span');
    fairyKey.append(fairy(), fairyCount);
    // The Hint key's fairy and how many the player has, dim with none.
    const showFairies = () => {
      fairyCount.textContent = fairies;
      fairyKey.toggleAttribute('data-none', !fairies);
      $('pixels-hint').setAttribute('aria-label', `Hint, ${fairies} ${fairies === 1 ? 'fairy' : 'fairies'}`);
    };
    showFairies();
    const hint = async () => {
      if (!started || solved || asking || down) return;
      const wrong = [];
      state.forEach((r, y) => r.forEach((v, x) => { if (v === 2 && answer[y][x]) wrong.push([y, x]); }));
      // A line's squares and numbers, and `line`, the one a fairy finishes.
      const of = (kind, n) => `.pixels-cell[data-${kind === 'row' ? 'y' : 'x'}="${n}"], .pixels-clue[data-${kind}="${n}"]`;
      let text, lit, line;
      if (wrong.length) {
        cursor = wrong[0];
        text = 'This X is on a square of the picture';
        line = { kind: 'row', n: wrong[0][0] };
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
        line = top;
        lit = of(top.kind, top.n);
        text = `${top.kind === 'row' ? 'Row' : 'Column'} ${top.n + 1} has squares to ${top.fills ? 'fill' : 'cross out'}`;
      }
      // `took` is a fairy spent, and `came` is false where the database
      // gave no answer.
      let took = false, came = true;
      if (fairies > 0 && data.useFairy) {
        asking = true;
        try {
          const got = await data.useFairy();
          took = !got.error;
          fairies = got.fairies ?? fairies;
        } catch { came = false; }
        asking = false;
        showFairies();
      }
      if (took) {
        spent++;
        past.push(state.map(r => r.slice()));
        ahead = [];
        // The whole line as the picture has it: its squares filled, a wrong
        // X among them, and its empty ones crossed out. A mistake keeps its
        // red X.
        const across = line.kind === 'row';
        const squares = Array.from({ length: across ? W : H }, (_, k) => (across ? [line.n, k] : [k, line.n]));
        squares.forEach(([y, x]) => { if (answer[y][x]) state[y][x] = 1; else if (state[y][x] === 0) state[y][x] = 2; });
        squares.forEach(([y, x]) => { if (answer[y][x]) closeLines(y, x); });
        draw();
        el.querySelectorAll(of(line.kind, line.n)).forEach(e => e.classList.add('is-hint'));
        delete clock.dataset.charged;
        tell(`A fairy finished ${across ? 'row' : 'column'} ${line.n + 1}`);
        if (!isSolved()) {
          buzz(30);
          sound('line');
        }
        keep();
        if (isSolved()) finish();
        return;
      }
      hints++;
      charge(HINT);
      draw();
      if (lit) el.querySelectorAll(lit).forEach(e => e.classList.add('is-hint'));
      tell(`${came ? '' : 'No fairy came · '}${text} · ${added(HINT)}`);
      buzz();
      sound('hint');
      keep();
    };
    $('pixels-hint').addEventListener('click', hint);

    // A board over ten squares wide may be too fine for a finger, so it zooms where it is.
    const pad = drag(boardHost, {
      start: (y, x, other) => begin(y, x, other ? 'x' : tool),
      paint: act,
      hover: (y, x) => { cursor = [y, x]; highlight(el, y, x); },
      right: true,
      zoom: () => W > 10,
    });
    // The tool in hand, by a tap on its key, or for the owner by a tap on
    // its half of the switch or a slide toward it. The tap a slide ends in,
    // as the finger lifts, picks nothing.
    const pick = $('pixels-tool');
    const choose = which => {
      if (tool === which) return;
      tool = which;
      pick.querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', b.dataset.tool === which));
      buzz();
    };
    let from = null, slid = false, lifted = -Infinity;
    if (owner) {
      pick.classList.add('pixels-pick--switch');
      const [fill, cross] = pick.querySelectorAll('button');
      fill.replaceChildren(sword());
      fill.setAttribute('aria-label', 'Sword, fills');
      cross.replaceChildren(shield());
      cross.setAttribute('aria-label', 'Shield, crosses out');
      pick.addEventListener('pointerdown', e => { from = e.clientX; slid = false; });
      pick.addEventListener('pointermove', e => {
        // A mouse with no button down is passing over, not sliding.
        if (e.pointerType === 'mouse' && !e.buttons) from = null;
        if (from == null || Math.abs(e.clientX - from) < SLIDE) return;
        choose(e.clientX < from ? 'fill' : 'x');
        from = e.clientX;
        slid = true;
      });
      for (const type of ['pointerup', 'pointercancel']) pick.addEventListener(type, e => {
        if (slid) lifted = e.timeStamp;
        from = null;
      });
    }
    pick.addEventListener('click', e => {
      const picked = e.target.closest('button');
      if (picked && e.timeStamp - lifted > 500) choose(picked.dataset.tool);
    });

    // Arrows move, Z or Space fills, X crosses out, U undoes, R redoes and
    // H hints, whichever tool is chosen. A key held with Cmd, Ctrl or Alt is
    // the browser's, so Cmd+Z fills nothing; Space on a button or link
    // presses it; and no key reaches the board while How to play is open.
    addEventListener('keydown', e => {
      if (!started || solved || e.metaKey || e.ctrlKey || e.altKey || guide.classList.contains('is-visible')
        || e.target.closest('input, textarea, select')) return;
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
      if (key === 'z' || (key === ' ' && !e.target.closest('button, a'))) { e.preventDefault(); begin(...cursor, 'fill'); }
      else if (key === 'x') begin(...cursor, 'x');
    });

    // Restart is one tap among the keys, so Undo takes it back whole.
    const restart = () => {
      past = [{ state, seconds, mistakes, hints, spent, hearts, past }];
      ahead = [];
      state = blank();
      seconds = 0;
      mistakes = 0;
      hints = 0;
      spent = 0;
      hearts = HEARTS;
      rise();
      tell('');
      saveProgress(puzzle.id, null);
      tick();
      showHearts();
      draw();
    };
    $('pixels-restart').addEventListener('click', () => { if (started && !solved) restart(); });

    // At no hearts the cover is up until the player picks. With no fairy to
    // spend, or none that came, the one way on is to start again.
    const fallen = $('pixels-fallen'), revive = $('pixels-revive'), again = $('pixels-again');
    function fall() {
      down = true;
      revive.hidden = !(fairies > 0 && data.useFairy);
      $('pixels-fallen-words').textContent = 'No hearts left';
      fallen.hidden = false;
      (revive.hidden ? again : revive).focus({ preventScroll: true });
    }
    function rise() {
      down = false;
      fallen.hidden = true;
    }
    revive.addEventListener('click', async () => {
      if (asking) return;
      asking = true;
      let took = false;
      try {
        const got = await data.useFairy();
        took = !got.error;
        fairies = got.fairies ?? fairies;
      } catch { /* said on the cover */ }
      asking = false;
      showFairies();
      if (!took) {
        revive.hidden = true;
        $('pixels-fallen-words').textContent = 'No fairy came';
        again.focus({ preventScroll: true });
        return;
      }
      spent++;
      hearts = HEARTS;
      rise();
      showHearts();
      tell('A fairy brought you back');
      buzz(30);
      sound('line');
      keep();
    });
    again.addEventListener('click', restart);

    listen();
    const cover = $('pixels-start');
    // A finger taps; a mouse is not told to.
    const tap = matchMedia('(pointer: coarse)').matches;
    cover.textContent = fresh ? (tap ? 'Tap to continue' : 'Continue') : (tap ? 'Tap to start' : 'Start');
    game.classList.add('is-waiting');
    cover.addEventListener('click', () => {
      started = settling = true;
      setTimeout(() => { settling = false; }, 350);
      game.classList.remove('is-waiting');
      $('pixels-cover').remove();
      sound('fill');
      // A game left at no hearts comes back to the same choice.
      if (!hearts) fall();
    });
    cover.focus({ preventScroll: true });
    if (!results.size && !how.seen()) window.Rux.modal.open(guide, $('pixels-how-open'));
    const soundKey = $('pixels-sound');
    soundKey.setAttribute('aria-pressed', sounds());
    soundKey.addEventListener('click', () => {
      soundKey.setAttribute('aria-pressed', sounds(!sounds()));
      sound('fill');
    });

    tick();
    showHearts();
    draw();
    game.classList.remove('is-loading');
  })();
})();
