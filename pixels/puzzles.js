/* ==========================================================================
   puzzles.js — the front page: two tabs, the categories and the leaderboard
   --------------------------------------------------------------------------
   The page is the same for every account, the owner's too: it draws what
   data.js's `list` is sent and nothing else. A guest with no player yet
   gets the door first; data.js's `enter` draws it.

   While app.js's DAILY is false the puzzle of the day is not shown: no card
   for it, and one ranking, all time, with no days in a row. While its BOARD
   is false there is no leaderboard and no tabs, only the puzzles.

   PUZZLES. Today's puzzle is one card across the page: its picture once
   solved, the date, the best time or how hard it is, and the days solved in
   a row. Continue is a card like it, for the puzzle to play next. Then a
   tile for each category, in playing order: sixteen squares, four by four,
   its number or its maker's picture and then its puzzles' pictures small,
   each a question mark until it is solved; its name; its size and how many
   sprites are found, or Gate cleared; and a bar of that. A player's gate
   also says who made it, and one not yet opened says New. A tile opens its category in
   category.html. A player reads a category as a gate.

   A guest has no menu, so under the tiles is their way to How to play.

   ADD TO HOME SCREEN is beside it, and under How to play in an account's
   menu, where the browser can add Pixels and the page was not opened from
   the icon. An iPhone is shown the steps in a modal, and a guest's key is
   in the address while it is open, for the icon to keep. Any other browser
   opens its own install window, once it says it may.

   LEADERBOARD. Two rankings behind one switch: today's puzzle, with each
   player's time, and all time, with puzzles solved and days in a row, in
   the order the database sends them. The player's own row is marked.
   ========================================================================== */
(() => {
  'use strict';

  const { data, owner, guest, enter, carry, iphone, installed, fresh, overMenu, portrait, seen, side, sprites, boss, title, DAILY, BOARD, grid, rounds, grade, categories, heading, where, daily, today, streak, time, words, art, bar, switcher } = window.Pixels;
  const host = document.getElementById('pixels-levels'), leader = document.getElementById('pixels-leader');
  // A tile shows fifteen pictures, which is as many as a category has on.
  const PER_LEVEL = 15;
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
      begun || results.size ? 'Continue' : 'Start', `${heading(next.c)} · ${title(next.p, next.i, false, boss(next.c, next.i))}`,
      begun ? `In progress · ${time(game.seconds)}` : side(next.p));
  };

  /* A CATEGORY'S TILE: sixteen squares, four by four, then its name, how
     much is found and a bar of that. The first square is the number of one
     of the owner's gates, or the picture of the player who made it; the
     fifteen after are its puzzles' pictures, each a question mark until
     found. One with fewer than fifteen keeps the room of fifteen, so every
     tile is one shape. */
  const categoryTile = (c, results) => {
    const a = document.createElement('a');
    a.className = 'rux--link rux--tile rux--tile--clickable pixels-category';
    a.href = where(c);
    const mosaic = document.createElement('div');
    mosaic.className = 'pixels-mosaic';
    mosaic.setAttribute('aria-hidden', 'true');
    mosaic.style.setProperty('--size', c.width);
    mosaic.append(c.by ? portrait(c.by) : words('pixels-mosaic-number', String(c.number)),
      ...c.puzzles.slice(0, PER_LEVEL).map(p => art(p, results.has(p.id))));
    for (let n = c.puzzles.length; n < PER_LEVEL; n++) mosaic.append(words('pixels-mosaic-none', ''));
    const solved = c.puzzles.filter(p => results.has(p.id)).length;
    const head = document.createElement('span');
    head.className = 'pixels-category-head';
    // The mosaic is not read out, so the number is said before the name.
    if (c.number) head.append(words('rux--visually-hidden', `Gate ${c.number}, `));
    head.append(words('pixels-category-name', heading(c)));
    // A gate not yet opened, with nothing found in it, says New.
    if (!solved && !seen(c)) head.append(words('rux--tag rux--layout--size-sm rux--tag--sm rux--tag--high-contrast pixels-grade', 'New'));
    a.append(mosaic, head);
    // A player's gate says who made it, under the name.
    if (c.by) a.append(words('pixels-meta pixels-by', c.by.name));
    a.append(words('pixels-meta', `${side(c)} · ${sprites(solved, c.puzzles.length)}`), bar(solved, c.puzzles.length));
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

  const ways = [document.getElementById('pixels-add-entry'), document.getElementById('pixels-add-key')];
  const offer = on => ways.forEach(el => { el.hidden = !on; });
  if (iphone && !installed) {
    const modal = document.getElementById('pixels-add');
    modal.innerHTML = `
      <div role="dialog" aria-modal="true" aria-labelledby="pixels-add-heading" tabindex="-1" class="rux--modal-container rux--modal-container--sm">
        <div class="rux--modal-header">
          <h2 class="rux--modal-header__heading" id="pixels-add-heading">Add to home screen</h2>
          <div class="rux--modal-close-button">
            <button type="button" class="rux--modal-close" aria-label="Close" data-rux-close>
              <svg class="rux--modal-close__icon" width="20" height="20" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><use href="#m-close"/></svg>
            </button>
          </div>
        </div>
        <div class="rux--modal-content">
          <p>Leave this open until the icon is added.</p>
          <ol class="rux--list--ordered--native pixels-steps">
            <li class="rux--list__item">In Safari, tap Share. It may be in the menu beside the address.</li>
            <li class="rux--list__item">Tap Add to Home Screen. It may be under View More.</li>
            <li class="rux--list__item">Tap Add.</li>
          </ol>
        </div>
        <div class="rux--modal-footer">
          <button type="button" class="rux--btn rux--btn--primary" data-rux-close autofocus>Done</button>
        </div>
      </div>`;
    modal.addEventListener('rux:modal-opened', () => carry(true));
    modal.addEventListener('rux:modal-closed', () => carry(false));
    overMenu(modal);
    ways.forEach(el => (el.querySelector('a') || el).setAttribute('data-rux-open', 'pixels-add'));
    offer(true);
  } else if (!installed) {
    let prompt = null;
    addEventListener('beforeinstallprompt', e => { e.preventDefault(); prompt = e; offer(true); });
    addEventListener('appinstalled', () => { prompt = null; offer(false); });
    ways.forEach(el => el.addEventListener('click', e => {
      e.preventDefault();
      prompt?.prompt();
      const nav = document.querySelector('.rux--side-nav--expanded');
      if (nav) window.Rux.uiShell.closeNav(nav);
    }));
  }

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
      document.getElementById('pixels-player').replaceChildren(portrait(me), me.name);
      document.getElementById('pixels-guestbar').hidden = false;
      document.getElementById('pixels-foot').hidden = false;
    }
    fresh();
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
