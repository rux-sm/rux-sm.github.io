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
   still to fill, which a finished line strikes: the bar shakes and flashes
   and the line's numbers light. At no hearts the board takes no touch and
   a cover over it asks which: a fairy, where the player has one and the
   database takes it, brings every heart back, or the puzzle starts again
   as Restart starts it.

   THE CHARACTER stands at the strip's start and the enemy's shadow at its
   end, for the owner while both are placeholders, once app.js's WORLD is
   on. It wears the armour the owner has, app.js's `worn`, and each piece is
   one more heart. It moves by its one drawing: the sword jabs for one fill and swings for a drag of
   them, the shield lifts for an X, a finished line knocks the shadow back,
   a mistake shakes it as the shadow lunges, and at no hearts it lies down
   until it is brought back.

   THE SWITCH. The owner's two tool keys are one switch while its pictures
   are placeholders, once WORLD is on: the sword, which fills, on its left
   and the shield, which crosses out, on its right, with no mark beside
   either. A tap on a half picks it, and so does a finger's slide toward
   it.

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

   HOW TO PLAY opens from Me's list and from the button under Start. The
   clock stands while it is open. app.js's `how` builds it.

   THE LESSON, play.html?lesson, is a 5×5 heart a player is sent to first,
   once in this browser, when they have solved nothing: one step at a time
   it lights the line to look at and says in a line what to do, and moves on
   when it is done. It has no hearts and keeps no time, and its Next is the
   puzzle the player picked, `?then=`, or the first one not solved.

   UNDO takes back the last tap or drag, with the squares a finished line
   crossed out for it, as far back as the puzzle's start, and REDO puts it
   back until a new move is made. Neither touches a mistake: the red X stays
   and so does the heart it cost, and a tap that was only a mistake is no move
   to take back. Restart, on the Pause cover, empties the board, zeroes the
   clock and fills the hearts, and Undo straight after it brings everything
   back.

   A board wider than ten squares zooms under two fingers where its squares
   are too fine for one; app.js's `drag` says how.

   EXIT, from the Back key and from Pause, goes back where the player came
   from in this tab, or to the puzzle's category where there is no such
   page. Once it is solved, the category's own tile stands under the time
   with the sprite counted and goes to the category, and the bar along the
   foot holds Exit, Share and Next. Next is the next unsolved puzzle of that category, then the first
   unsolved of the category after it, and so round to the first, passing by
   a rift that is still locked and a boss still held back. A boss held
   back, by app.js's `holds`, is not played by its address either.

   THE OWNER PLAYS ANY PUZZLE, from Create's Game. One no player is sent is a
   trial: titled by its name, with no Next and no rift, its Back to Game,
   and its time not kept.

   play.html?daily plays the puzzle of the day, the one the owner drew for
   today or else the one app.js makes from the date; its result is kept by
   day, and solving it shows the days in a row.

   RELAXED, Me's switch, plays with no hearts: a wrong square is crossed out
   in red and costs nothing, and the finish says Relaxed. Its time is kept
   only where none was, so it never replaces one played with hearts.

   SHARE, in the finish's bar, draws the finished picture large on a card
   with its name, its time and Pixels, as a PNG, and hands it to the phone's
   share sheet, or saves it as a file where there is none.

   Each fill, X, finished line, mistake, fall, hint and solve plays a tone and
   ticks the phone, and an X taken off or a move undone plays a falling
   one. Me's Sound switch keeps its choice in this browser.

   THE STATUS ROW over the board is the hearts and, at its end, the clock;
   the enemy's health stands between them only with WORLD on, since without
   it no enemy is drawn. THE PICTURE SO FAR is drawn small in the board's
   corner: the filled squares only, as they are filled. While a drag runs along a
   line, how many squares it spans stands over the square it has reached.

   A game in progress is kept in this browser under `pixels-progress`, so a
   phone that reloads the page picks up where it was. It is dropped once the
   puzzle is solved or started over.
   ========================================================================== */
(() => {
  'use strict';

  const { data, owner, enter, boss, holds, DAILY, grid, column, clues, solveLine, order, categories, where, daily, today, streak, board, paint, highlight, drag, picture, HEARTS, HINT, added, buzz, sound, relaxed, listen, time, title, art, riftTile, arrive, turn, locks, fairy, heart, sword, shield, worn, hero, shade, how, WORLD } = window.Pixels;
  const $ = id => document.getElementById(id);
  const game = $('pixels-game'), boardHost = $('pixels-board'), status = $('pixels-status'), clock = $('pixels-clock'), tally = $('pixels-count');

  const PROGRESS = 'pixels-progress';
  // Where Exit goes, as this tab came to the puzzles.
  const FROM = 'pixels-from';
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

  // The lesson's picture, a heart five squares a side.
  const LESSON = { id: 'lesson', name: 'Heart', squares: '0101011111111110111000100', width: 5, height: 5, colours: null };

  const loadProgress = () => { try { return JSON.parse(localStorage.getItem(PROGRESS) || '{}'); } catch { return {}; } };
  const saveProgress = (id, value) => {
    const all = loadProgress();
    if (value) all[id] = value; else delete all[id];
    try { localStorage.setItem(PROGRESS, JSON.stringify(all)); } catch { /* progress is a convenience */ }
  };

  (async () => {
    const query = new URLSearchParams(location.search), id = query.get('id'), isDaily = query.has('daily'), isLesson = query.has('lesson');
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
    // A player who has solved nothing is sent to the lesson first, once.
    const LEARNED = 'pixels-lesson';
    const learned = () => { try { return localStorage.getItem(LEARNED) === 'done'; } catch { return true; } };
    if (!isLesson && !results.size && !learned()) {
      location.replace(`play.html?lesson${id ? `&then=${encodeURIComponent(id)}` : ''}`);
      return;
    }
    if (isLesson) try { localStorage.setItem(LEARNED, 'done'); } catch { /* it may be shown again */ }
    let puzzle = isLesson ? LESSON : isDaily ? puzzle0 : puzzles.find(p => String(p.id) === id);
    // A puzzle no player is sent is the owner's to try; the lesson keeps no time either.
    let trial = isLesson;
    if (!puzzle && owner && data.all) {
      try { puzzle = (await data.all()).find(p => String(p.id) === id && !p.day); } catch { /* said below */ }
      trial = !!puzzle;
    }
    if (!puzzle) { say('This puzzle is not here', 'It may have been deleted. Pick another from Play.'); return; }
    // Its category, and its place among that category's puzzles.
    const home = cats.find(c => c.puzzles.includes(puzzle)), index = home ? home.puzzles.indexOf(puzzle) : -1;
    // A rift of the course that is not open yet is not played, by its
    // address either. The owner plays any, as Game's Play needs.
    if (!isDaily) locks(cats, results);
    if (home?.short && !owner) {
      say('This rift is not open yet', `${home.need - home.short} of ${home.need} sprites to open it. Pick a puzzle from Play.`);
      return;
    }
    // Nor is a boss the rift still holds back.
    if (home && !owner && boss(home, index) && holds(home, results)) {
      const left = home.puzzles.slice(0, -1).filter(p => !results.has(p.id)).length;
      say('The boss is not out yet', `${left} more sprite${left === 1 ? '' : 's'} to find in this rift first.`);
      return;
    }
    // Exit goes back where the player came from in this tab, a page of
    // Pixels other than a puzzle, kept across Next so a run of puzzles goes
    // back to where it began; with none, to the puzzle's rift.
    const cameFrom = (() => {
      try {
        const came = document.referrer && new URL(document.referrer);
        const page = came && came.origin === location.origin && came.pathname.match(/\/pixels\/([\w-]*\.html)?$/);
        if (page && page[1] !== 'play.html') sessionStorage.setItem(FROM, came.pathname + came.search);
        else if (!page) sessionStorage.removeItem(FROM);
        return sessionStorage.getItem(FROM);
      } catch { return null; }
    })();
    const back = isLesson ? './' : cameFrom || (trial ? 'create.html?view=game' : home ? where(home) : './');
    $('pixels-back').href = $('pixels-out').href = $('pixels-exit').href = back;
    // What a result is kept under: the day, or the puzzle's id.
    const key = isDaily ? puzzle.day : puzzle.id;
    // A name stays hidden until its puzzle is solved; the day's shows its
    // date, and the owner's trial its name.
    const heading = isDaily ? (results.has(key) ? puzzle.name : puzzle.date) : trial ? puzzle.name : title(puzzle, index, results.has(key), !!home && boss(home, index));
    const answer = grid(puzzle.squares, puzzle.width), H = answer.length, W = answer[0].length;
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
    // The hearts a puzzle is begun with: HEARTS, and one more for each piece
    // of armour the owner's character wears. Then the hearts left, all of
    // them for a kept game that says none, and whether the character is
    // down, at no hearts, with the cover up.
    const world = owner && WORLD, wear = world ? worn(me.found || 0) : [], most = HEARTS + wear.length;
    let hearts = fresh ? Math.min(kept.hearts ?? most, most) : most, down = false;
    const easy = relaxed() || isLesson;
    if (easy) hearts = most;
    // The fairies this game has spent, how many the player has left, and
    // whether the database is being asked for one.
    let spent = fresh ? kept.fairies || 0 : 0, fairies = me.fairies || 0, asking = false;
    // No square is marked until a finger, the mouse or an arrow key picks one.
    // `climb` counts the fills of one drag, so each sounds a step higher.
    // `strokes` counts them too, so the character knows a drag from a tap.
    let tool = 'fill', action = null, cursor = [], solved = false, climb = 0, strokes = 0;
    // Nothing moves, and the clock stands, until the cover is tapped; and
    // the board takes no touch for a moment after, so a second tap meant for
    // the cover cannot land on the square that was under it.
    let started = false, settling = false, paused = false;
    // The board before each tap or drag that changed it, and the board as a
    // tap or drag began, kept only once that one changes something other
    // than by a mistake.
    // `ahead` is the boards Undo left, for Redo, until a new move is made.
    let past = [], held = null, ahead = [];

    $('pixels-title').textContent = heading;
    document.title = `${heading} — Pixels`;

    const keep = () => saveProgress(puzzle.id, { squares: puzzle.squares, state, seconds, mistakes, hints, hearts, fairies: spent });
    const el = board(boardHost, answer, state, { done: true, label: 'Puzzle' });
    // app.css sizes the game by the puzzle: its size, its widest row's
    // numbers and its longest column's.
    for (const v of ['--cols', '--units', '--count']) game.style.setProperty(v, el.style.getPropertyValue(v));
    // The name and the picture so far stand in the status row, before the clock.
    $('pixels-clock').before($('pixels-info'));
    $('pixels-info').hidden = false;
    const thumb = picture($('pixels-thumb'), '0'.repeat(W * H));
    // The enemy's health is the share of the picture's squares not yet filled.
    const foe = $('pixels-foe'), whole = answer.flat().filter(Boolean).length;
    /* THE LESSON'S STEPS: the line each lights and what it says, done once
       every square of the picture in that line is filled. */
    let lessonStep = null;
    if (isLesson) {
      const STEPS = [
        ['row', 1, 'Row 2 says 5. Five in a row of five fills it all. Fill row 2.'],
        ['row', 2, 'Row 3 says 5 too. Fill it.'],
        ['col', 2, 'The middle column says 4. Fill the two squares under row 3.'],
        ['row', 3, 'Row 4 says 3. Fill the three in the middle.'],
        ['row', 0, 'Row 1 says 1 1: two single squares. Fill them to finish.'],
      ];
      const full = (kind, n) => (kind === 'row' ? answer[n].every((c, x) => !c || state[n][x] === 1) : answer.every((r, y) => !r[n] || state[y][n] === 1));
      lessonStep = () => {
        const step = STEPS.find(([kind, n]) => !full(kind, n));
        $('pixels-lesson').textContent = step ? step[2] : 'That is all there is to it.';
        if (!step || !started) return;
        const [kind, n] = step;
        el.querySelectorAll(`.pixels-cell[data-${kind === 'row' ? 'y' : 'x'}="${n}"], .pixels-clue[data-${kind}="${n}"]`).forEach(e => e.classList.add('is-hint'));
      };
    }
    const draw = () => {
      paint(el, answer, state, { done: true });
      [...thumb.children].forEach((s, i) => s.toggleAttribute('data-on', state[Math.floor(i / W)][i % W] === 1));
      const left = (whole - state.flat().filter(v => v === 1).length) / whole;
      foe.style.setProperty('--left', left);
      foe.setAttribute('aria-valuenow', Math.round(left * 100));
      el.querySelectorAll('.is-hint').forEach(e => e.classList.remove('is-hint'));
      highlight(el, ...cursor);
      lessonStep?.();
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
    life.hidden = easy;
    const showHearts = hit => {
      life.replaceChildren(...Array.from({ length: most }, (_, n) => {
        const one = heart();
        one.toggleAttribute('data-lost', n >= hearts);
        one.toggleAttribute('data-hit', !!hit && n === hearts);
        return one;
      }));
      life.setAttribute('aria-label', `${hearts} of ${most} hearts`);
    };

    // The character and the enemy's shadow, at the two ends of the strip.
    // `move` is one of the character's moves, each a layer or the whole of
    // it leaving its place and coming back; one already moving is left to
    // finish, and nothing moves for a player who has asked for less of it.
    const champion = world ? hero(wear, me.gear) : null, shadow = world ? shade() : null;
    if (champion) {
      life.before(champion);
      foe.after(shadow);
    }
    foe.hidden = !world;
    const sway = (part, frames, ms) => { if (!still && !part.getAnimations().length) part.animate(frames, { duration: ms, easing: 'ease-out' }); };
    const move = kind => {
      if (!champion) return;
      const of = name => champion.querySelector(`.pixels-hero-${name}`), rest = { transform: 'none' };
      if (kind === 'stab') sway(of('sword'), [rest, { transform: 'translate(20%, 7%) rotate(70deg)' }, rest], 180);
      if (kind === 'slash') sway(of('sword'), [rest, { transform: 'rotate(120deg)' }, rest], 240);
      if (kind === 'block') sway(of('shield'), [rest, { transform: 'translate(60%, -7%)' }, rest], 260);
      if (kind === 'stab' || kind === 'slash') sway(shadow, [rest, { transform: 'translateX(13%)' }, rest], 180);
      if (kind === 'strike') sway(shadow, [rest, { transform: 'translateX(33%)' }, rest], 300);
      if (kind === 'hurt') {
        sway(shadow, [rest, { transform: 'translateX(-40%)' }, rest], 240);
        sway(champion, [rest, { transform: 'translateX(-13%)' }, { transform: 'translateX(7%)' }, rest], 300);
      }
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
      if (!started || solved || paused || document.hidden || guide.classList.contains('is-visible')) return;
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
        trial ? best : easy && results.has(key) ? { best: results.get(key).seconds, isNew: false } : isDaily ? data.recordDay(key, seconds) : data.record(key, seconds),
        new Promise(done => setTimeout(done, still ? 0 : REVEAL)),
      ]);
      if (saved.status === 'fulfilled') best = saved.value; else lost = true;

      $('pixels-solved-name').textContent = puzzle.name;
      $('pixels-solved-clock').textContent = time(seconds);
      // What went wrong and what the hints added, then how the time stands.
      const count = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
      const parts = [...(easy && !isLesson ? ['Relaxed'] : []), mistakes ? count(mistakes, 'mistake') : 'No mistakes'];
      if (spent) parts.push(`${spent} ${spent === 1 ? 'fairy' : 'fairies'}`);
      if (hints) parts.push(count(hints, 'hint'), added(hints * HINT));
      if (lost) parts.push('not saved');
      else if (best.waiting) parts.push('saved once online');
      else if (isLesson) parts.push('lesson done');
      else if (trial) parts.push('a trial, not kept');
      else if (!best.isNew) parts.push(`best ${time(best.best)}`);
      else if (results.has(key)) $('pixels-best').hidden = false;
      if (isDaily && !lost) {
        const row = streak(new Set([...results.keys(), key]));
        parts.push(`${row} day${row === 1 ? '' : 's'} in a row`);
      }
      // The sprite that earns the owner's character its helmet says so.
      if (world && home && !lost && !results.has(key) && worn((me.found || 0) + 1).length > wear.length) parts.push('Helmet unlocked');
      $('pixels-solved-time').textContent = parts.join(' · ');
      $('pixels-share').onclick = () => share(puzzle, seconds);
      document.title = `${puzzle.name} — Pixels`;
      // The next puzzle not yet solved: the rest of this category, after
      // this one and then before it, then each category after it and round
      // to the first. After the puzzle of the day, the first not yet solved;
      // after a trial, none.
      const at = cats.indexOf(home);
      const then = isLesson && puzzles.find(p => String(p.id) === query.get('then'));
      const rest = isDaily ? puzzles : isLesson ? [...(then ? [then] : []), ...puzzles] : trial ? [] : [
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
         for the first time turns into view on it and is kept for the rift's
         page to turn too, and one in a puzzle somebody else made earns a
         mana, which the tile says; the owner has no mana to earn. A time that was not saved counts
         nothing. A rift this sprite cleared says the fairies it freed,
         and one it opened stands under it, saying Opened. */
      if (home) {
        const first = !results.has(key) && !lost, all = home.puzzles.length;
        const found = home.puzzles.filter(p => results.has(p.id)).length + (first ? 1 : 0);
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
        const rift = riftTile(home, known, { tag: earned ? '+1 mana' : '', under: freed ? `+${freed} fairies` : '', featured: key });
        const list = document.createElement('div');
        list.className = 'game-tiles';
        list.append(rift, ...opened.map(c => riftTile(c, known, { tag: 'Opened' })));
        $('pixels-solved').firstElementChild.after(list);
        if (first) arrive(key);
        if (first && !still) landing = () => fly(rift, found, all);
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
      ], { duration: 400, easing: 'ease-out' }).finished.then(() => landing?.());
    };

    /* THE SPRITE FLIES HOME. Once the picture has slid to the middle, a copy
       of it shrinks along a curve into its rift's tile, where the tile's own
       picture waits hidden; it lands, the tile's picture pops, and the count
       ticks from the sprites found before to the sprites found now, with a
       +1 beside it, and the bar grows to match. With motion turned down
       none of it runs and the tile shows the count as it is. */
    let landing = null;
    const fly = (rift, found, all) => {
      const spot = rift.querySelector('.pixels-rift-art'), count = rift.querySelector('.pixels-rift-count'), fill = rift.querySelector('.rux--progress-bar__bar');
      const was = count.firstChild, tick = was?.nodeType === 3 ? was : null;
      if (tick) tick.textContent = `${found - 1}/${all}`;
      if (fill) fill.style.transform = `scaleX(${(found - 1) / all})`;
      spot.style.visibility = 'hidden';
      const from = el.querySelector('.pixels-squares').getBoundingClientRect(), to = spot.getBoundingClientRect();
      const copy = art(puzzle, true);
      copy.classList.add('pixels-flying');
      Object.assign(copy.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` });
      document.body.append(copy);
      const dx = to.left - from.left, dy = to.top - from.top, k = to.width / from.width;
      copy.animate([
        { transform: 'none' },
        { transform: `translate(${dx * .35}px, ${dy * .2}px) scale(${(1 + k) / 2})`, offset: .4 },
        { transform: `translate(${dx}px, ${dy}px) scale(${k})` },
      ], { duration: 700, delay: 250, easing: 'ease-in', fill: 'forwards' }).finished.then(() => {
        copy.remove();
        spot.style.visibility = '';
        spot.animate([{ transform: 'scale(1.25)' }, { transform: 'none' }], { duration: 300, easing: 'ease-out' });
        if (tick) tick.textContent = `${found}/${all}`;
        const plus = document.createElement('span');
        plus.className = 'pixels-plus';
        plus.textContent = '+1';
        count.prepend(plus);
        if (fill) fill.style.transform = `scaleX(${found / all})`;
        buzz(20);
      });
    };

    /* THE SHARED CARD: 600 by 720, the page's dark, the picture at a whole
       number of pixels a square in the middle of its top, then the name and
       the time and Pixels under it in the pixel font. */
    const share = async (p, secs) => {
      const W0 = 600, H0 = 720, n = p.width, px = Math.floor(504 / n), side = px * n;
      const c = document.createElement('canvas');
      c.width = W0;
      c.height = H0;
      const ctx = c.getContext('2d');
      const page = getComputedStyle(document.documentElement);
      ctx.fillStyle = page.getPropertyValue('--rux-background').trim() || '#161616';
      ctx.fillRect(0, 0, W0, H0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(art(p, true), (W0 - side) / 2, 48, side, side);
      try { await document.fonts.load('32px Silkscreen'); } catch { /* the browser's own font */ }
      ctx.textAlign = 'center';
      ctx.fillStyle = page.getPropertyValue('--rux-text-primary').trim() || '#f4f4f4';
      ctx.font = '32px Silkscreen, monospace';
      ctx.fillText(p.name.toUpperCase(), W0 / 2, 48 + side + 64);
      ctx.fillStyle = page.getPropertyValue('--rux-text-secondary').trim() || '#c6c6c6';
      ctx.font = '16px Silkscreen, monospace';
      ctx.fillText(`${time(secs)} · PIXELS`, W0 / 2, 48 + side + 100);
      const blob = await new Promise(done => c.toBlob(done, 'image/png'));
      const file = new File([blob], `${p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file], title: p.name }); } catch { /* the sheet was closed */ }
        return;
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };

    // Solved when every square of the picture is filled; a wrong fill is
    // crossed out, so nothing else can be.
    const isSolved = () => answer.every((r, y) => r.every((c, x) => !c || state[y][x] === 1));

    // A line whose picture squares are all filled crosses out what is left,
    // and says whether the square at (y, x) finished its row and its column.
    const closeLines = (y, x) => {
      const row = answer[y].every((c, i) => !c || state[y][i] === 1);
      const col = answer.every((r, i) => !r[x] || state[i][x] === 1);
      for (let i = 0; i < W; i++) if (row && state[y][i] === 0) state[y][i] = 2;
      for (let i = 0; i < H; i++) if (col && state[i][x] === 0) state[i][x] = 2;
      return [row, col];
    };

    // A finished line strikes the enemy: app.css shakes and flashes its bar
    // and lights the line's numbers, and the shadow is knocked back. Each
    // starts again if it is still going.
    const strike = (y, x) => {
      const hit = [foe, el.querySelector(`.pixels-clue[data-row="${y}"]`), el.querySelector(`.pixels-clue[data-col="${x}"]`)].filter(Boolean);
      hit.forEach(e => {
        e.classList.remove('is-struck');
        void e.offsetWidth;
        e.classList.add('is-struck');
      });
      move('strike');
    };
    game.addEventListener('animationend', e => e.target.classList.remove('is-struck'));

    const act = (y, x) => {
      if (!started || settling || solved || asking || down || paused) return;
      const v = state[y][x];
      let missed = false;
      if (action === 'fill' && v === 0) {
        if (answer[y][x]) {
          state[y][x] = 1;
          const [row, col] = closeLines(y, x), closed = row || col;
          // The last square has the finish's tick and tone, not a line's on
          // top of them.
          if (!isSolved()) {
            buzz(closed ? 30 : 10);
            sound(closed ? 'line' : 'fill', closed ? 0 : climb++);
            if (closed) strike(row ? y : null, col ? x : null);
          }
          move(++strokes > 1 ? 'slash' : 'stab');
          tell('');
        } else {
          state[y][x] = 3;
          mistakes++;
          if (!easy) hearts--;
          showHearts(true);
          buzz([40, 60, 40]);
          sound(hearts ? 'miss' : 'fall');
          move('hurt');
          tell('Not in the picture', true);
          missed = true;
        }
      } else if (action === 'x' && v === 0) { state[y][x] = 2; sound('x'); move('block'); }
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
      climb = strokes = 0;
      held = state.map(r => r.slice());
      act(y, x);
    };

    const undo = () => {
      if (!started || solved || down || paused || !past.length) return;
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
      if (!started || solved || down || paused || !ahead.length) return;
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
      if (!started || solved || asking || down || paused) return;
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
      reach: (y, x, n) => {
        if (!(n > 1)) { tally.hidden = true; return; }
        const square = el.querySelector(`.pixels-cell[data-y="${y}"][data-x="${x}"]`).getBoundingClientRect(), box = tally.parentElement.getBoundingClientRect();
        tally.textContent = n;
        tally.style.setProperty('--at-x', `${Math.round(square.left - box.left + square.width / 2)}px`);
        tally.style.setProperty('--at-y', `${Math.round(square.top - box.top)}px`);
        tally.hidden = false;
      },
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
    if (world) {
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
      // P or Escape pauses and resumes, and nothing else reaches a paused board.
      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') { e.preventDefault(); if (paused) resume(); else pause(); return; }
      if (paused) return;
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

    // Restart is one tap on the Pause cover, so Undo takes it back whole.
    const restart = () => {
      past = [{ state, seconds, mistakes, hints, spent, hearts, past }];
      ahead = [];
      state = blank();
      seconds = 0;
      mistakes = 0;
      hints = 0;
      spent = 0;
      hearts = most;
      rise();
      tell('');
      saveProgress(puzzle.id, null);
      tick();
      showHearts();
      draw();
    };
    $('pixels-restart').addEventListener('click', () => { if (paused) { restart(); resume(); } });

    /* A PAUSE stands the clock and lies Design's cover over the board, bare
       as before Start, with Resume and Exit, until Resume. It changes
       nothing of the game. A page sent behind another pauses itself, so
       the board is not live the moment it is back. */
    const pausedCover = $('pixels-paused'), resumeKey = $('pixels-resume');
    function pause() {
      if (!started || solved || down || paused) return;
      paused = true;
      game.classList.add('is-paused');
      pausedCover.hidden = false;
      highlight(el);
      resumeKey.focus({ preventScroll: true });
    }
    function resume() {
      if (!paused) return;
      paused = false;
      settling = true;
      setTimeout(() => { settling = false; }, 350);
      game.classList.remove('is-paused');
      pausedCover.hidden = true;
    }
    $('pixels-pause').addEventListener('click', pause);
    resumeKey.addEventListener('click', resume);
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

    // At no hearts the cover is up until the player picks. With no fairy to
    // spend, or none that came, the one way on is to start again.
    const fallen = $('pixels-fallen'), revive = $('pixels-revive'), again = $('pixels-again');
    function fall() {
      down = true;
      champion?.classList.add('is-down');
      revive.hidden = !(fairies > 0 && data.useFairy);
      $('pixels-fallen-words').textContent = 'No hearts left';
      fallen.hidden = false;
      (revive.hidden ? again : revive).focus({ preventScroll: true });
    }
    function rise() {
      down = false;
      champion?.classList.remove('is-down');
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
      hearts = most;
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
      if (isLesson) draw();
      sound('fill');
      // A game left at no hearts comes back to the same choice.
      if (!hearts) fall();
    });
    cover.focus({ preventScroll: true });
    // The lesson's first step is said once the board is drawn.
    if (isLesson) $('pixels-lesson').hidden = false;
    tick();
    showHearts();
    draw();
    game.classList.remove('is-loading');
  })();
})();
