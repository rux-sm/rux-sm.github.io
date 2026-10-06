/* ==========================================================================
   puzzles.js — the front page: two tabs, the categories and the leaderboard
   --------------------------------------------------------------------------
   The page is the same for every account, the owner's too: it draws what
   data.js's `list` is sent and nothing else. A guest with no player yet
   gets the name form first; data.js's `enter` draws it.

   While app.js's DAILY is false the puzzle of the day is not shown: no card
   for it, and one ranking, all time, with no days in a row. While its BOARD
   is false there is no leaderboard and no tabs, only the puzzles.

   PUZZLES. Today's puzzle is one card across the page: its picture once
   solved, the date, the best time or how hard it is, and the days solved in
   a row. Continue is a card like it, for the puzzle to play next. Then a
   tile for each category, in playing order: its puzzles' pictures small,
   three by three, each a question mark until it is solved; its name, with
   Quick before it for the 5×5 ones and Long for the 15×15; how many are
   solved; and a bar of that. A tile opens its category in category.html.

   A guest has no menu, so under the tiles is their way to How to play.

   LEADERBOARD. Two rankings behind one switch: today's puzzle, with each
   player's time, and all time, with puzzles solved and days in a row, in
   the order the database sends them. The player's own row is marked.
   ========================================================================== */
(() => {
  'use strict';

  const { data, owner, guest, enter, DAILY, BOARD, grid, rounds, grade, categories, heading, where, daily, today, streak, time, words, art, bar, switcher } = window.Pixels;
  const host = document.getElementById('pixels-levels'), leader = document.getElementById('pixels-leader');
  // A tile shows nine pictures, which is as many as a category has on.
  const PER_LEVEL = 9;
  // What play.js keeps in this browser: the games in progress, and the
  // puzzle last played.
  const PROGRESS = 'pixels-progress', LAST = 'pixels-last';

  const say = (heading, detail) => {
    const box = document.getElementById('pixels-error');
    box.querySelector('.rux--inline-notification__title').textContent = heading;
    box.querySelector('.rux--inline-notification__subtitle').textContent = detail;
    box.hidden = false;
  };

  // A card across the page: a picture, three lines of words, and an arrow.
  const card = (href, picture, over, name, under) => {
    const a = document.createElement('a');
    a.className = 'pixels-today';
    a.href = href;
    const text = document.createElement('div');
    text.className = 'pixels-today-text';
    text.append(words('pixels-meta', over), words('pixels-today-name', name), words('pixels-meta', under));
    const go = document.createElement('span');
    go.className = 'pixels-today-go';
    go.setAttribute('aria-hidden', 'true');
    go.textContent = '›';
    a.append(picture, text, go);
    return a;
  };

  // Today's puzzle. Its name, if it has one, waits until it is solved.
  const todayCard = (puzzle, best, row) => card('play.html?daily', art(puzzle, !!best),
    row ? `Today · ${row} day${row === 1 ? '' : 's'} in a row` : 'Today', best ? puzzle.name : puzzle.date,
    best ? time(best.seconds) : grade(rounds(grid(puzzle.squares, puzzle.width))));

  /* CONTINUE. The puzzle last played, if it is still unsolved, and otherwise
     the next unsolved after it in playing order, round to the first; with
     none unsolved there is no card. A game kept in this browser says how far
     its clock has run. A player who has solved nothing and begun nothing is
     told to start. */
  const continueCard = (cats, results) => {
    const all = cats.flatMap(c => c.puzzles.map((p, i) => ({ p, c, i })));
    let last = null, kept = {};
    try {
      last = localStorage.getItem(LAST);
      kept = JSON.parse(localStorage.getItem(PROGRESS) || '{}') || {};
    } catch { /* from the first puzzle */ }
    const at = Math.max(0, all.findIndex(e => String(e.p.id) === last));
    const next = [...all.slice(at), ...all.slice(0, at)].find(e => !results.has(e.p.id));
    if (!next) return null;
    const game = kept[next.p.id], begun = game && game.squares === next.p.squares;
    return card(`play.html?id=${encodeURIComponent(next.p.id)}`, art(next.p, false),
      begun || results.size ? 'Continue' : 'Start', `${heading(next.c)} · Puzzle ${next.i + 1}`,
      begun ? `In progress · ${time(game.seconds)}` : grade(next.p.rounds));
  };

  // A category's tile. One with fewer than nine puzzles keeps the room of
  // nine, so every tile is one shape.
  const categoryTile = (c, results) => {
    const a = document.createElement('a');
    a.className = 'rux--link rux--tile rux--tile--clickable pixels-category';
    a.href = where(c);
    const mosaic = document.createElement('div');
    mosaic.className = 'pixels-mosaic';
    mosaic.setAttribute('aria-hidden', 'true');
    mosaic.style.setProperty('--size', c.width);
    mosaic.append(...c.puzzles.slice(0, PER_LEVEL).map(p => art(p, results.has(p.id))));
    for (let n = c.puzzles.length; n < PER_LEVEL; n++) mosaic.append(words('pixels-mosaic-none', ''));
    const solved = c.puzzles.filter(p => results.has(p.id)).length;
    a.append(mosaic, words('pixels-category-name', heading(c)), words('pixels-meta', `${solved} of ${c.puzzles.length} solved`), bar(solved, c.puzzles.length));
    return a;
  };

  /* THE LEADERBOARD. Two rankings behind one switch: today's puzzle, with
     each player's time, and all time, with puzzles solved and days in a row.
     The player's own row is marked. */
  const leaderboard = ranks => {
    const el = document.createElement('section');
    el.className = 'rux--stack-vertical rux--stack-scale-5 pixels-leader';
    el.setAttribute('aria-labelledby', 'pixels-leaderboard');
    const h2 = document.createElement('h2');
    h2.className = 'rux--type-productive-heading-03';
    h2.id = 'pixels-leaderboard';
    h2.textContent = 'Leaderboard';
    const pick = document.createElement('div');
    pick.className = 'rux--content-switcher rux--content-switcher--lg rux--layout--size-lg';
    pick.setAttribute('role', 'tablist');
    pick.setAttribute('aria-label', 'Ranking');
    const list = document.createElement('ol');
    list.className = 'pixels-ranks';
    const row = (place, r, detail) => {
      const li = document.createElement('li');
      li.className = `pixels-rank${r.me ? ' is-me' : ''}`;
      const n = document.createElement('span');
      n.className = 'pixels-rank-place';
      n.textContent = place;
      const name = document.createElement('span');
      name.className = 'pixels-rank-name';
      name.textContent = r.name;
      li.append(n, name, ...detail);
      return li;
    };
    const show = which => {
      const rows = which === 'today'
        ? ranks.today.map((r, i) => row(i + 1, r, [words('pixels-rank-value', time(r.seconds))]))
        : ranks.all.map((r, i) => row(i + 1, r, [
          ...(DAILY ? [words('pixels-meta', `${r.days} day${r.days === 1 ? '' : 's'}`)] : []),
          words('pixels-rank-value', `${r.solved} solved`),
        ]));
      if (rows.length) list.replaceChildren(...rows);
      else list.replaceChildren(words('pixels-meta', which === 'today' ? "Nobody has finished today's puzzle yet." : 'Nobody has solved a puzzle yet.'));
    };
    // With the puzzle of the day off there is one ranking and nothing to switch.
    if (!DAILY) {
      show('all');
      el.append(h2, list);
      return el;
    }
    [['today', 'Today'], ['all', 'All time']].forEach(([which, label], i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `rux--content-switcher-btn${i ? '' : ' rux--content-switcher--selected'}`;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', !i);
      b.tabIndex = i ? -1 : 0;
      b.dataset.rank = which;
      b.appendChild(words('rux--content-switcher__label', label));
      pick.appendChild(b);
    });
    switcher(pick, b => show(b.dataset.rank));
    show('today');
    el.append(h2, pick, list);
    return el;
  };

  // Nothing is published. The owner is shown the way to where that is done.
  const empty = () => {
    const wrap = document.createElement('div');
    wrap.className = 'rux--stack-vertical rux--stack-scale-5';
    const p = document.createElement('p');
    p.className = 'rux--type-productive-heading-03';
    p.textContent = 'No puzzles yet';
    wrap.append(p);
    if (owner) {
      const manage = document.createElement('a');
      manage.className = 'rux--btn rux--btn--primary';
      manage.href = 'manage.html';
      manage.textContent = 'Manage';
      wrap.append(manage);
    }
    return wrap;
  };

  (async () => {
    if (!data) {
      say('Pixels could not connect', 'Reload the page to try again.');
      return;
    }
    let me, puzzles, results, days, ranks;
    try {
      me = await enter(host);
      if (!me) return;
      [puzzles, results, days, ranks] = await Promise.all([data.list(), data.results(), data.days(), BOARD ? data.board(today()) : null]);
    } catch {
      say('The puzzles did not load', 'Reload the page to try again.');
      return;
    }
    if (guest) {
      document.getElementById('pixels-player').textContent = me.name;
      document.getElementById('pixels-guestbar').hidden = false;
      document.getElementById('pixels-foot').hidden = false;
    }
    // With no leaderboard there is one panel and nothing to switch between.
    document.getElementById('pixels-tabs').hidden = !BOARD;
    if (DAILY) {
      const now = daily(today(), puzzles);
      host.appendChild(todayCard(now, days.get(now.day), streak(new Set(days.keys()))));
    }
    if (ranks) leader.appendChild(leaderboard(ranks));
    const cats = categories(puzzles);
    if (!cats.length) { host.appendChild(empty()); return; }
    const next = continueCard(cats, results);
    if (next) host.appendChild(next);
    const list = document.createElement('div');
    list.className = 'pixels-categories';
    list.append(...cats.map(c => categoryTile(c, results)));
    host.appendChild(list);
  })();
})();
