/* ==========================================================================
   puzzles.js — the front page: two tabs, the puzzles and the leaderboard
   --------------------------------------------------------------------------
   A guest with no player yet gets the name form first; data.js's `enter`
   draws it.

   While app.js's DAILY is false the puzzle of the day is not shown: no card
   for it, and one ranking, all time, with no days in a row. While its BOARD
   is false there is no leaderboard and no tabs, only the puzzles.

   PUZZLES. Today's puzzle is one card across the page: its picture once
   solved, the date, the stars and time or how hard it is, and the days
   solved in a row. Then a section for each level the maker gave, a bar for
   how much of it is solved, and its puzzles easy to hard, three across on a
   phone, each tile a square, none locked: the 5×5 levels are called Quick,
   the 15×15 ones Long, and they stand before and after the 10×10 levels; a
   level with a theme carries it in its name. A
   solved tile shows its picture, name and stars; an unsolved one its number,
   a question mark and how hard it is. The owner has an Edit link under each,
   and a section of the days' puzzles he has drawn, by date.

   LEADERBOARD. Two rankings behind one switch: today's puzzle, by stars then
   time, and all time, by every star earned, with puzzles solved and days in
   a row. The player's own row is marked.
   ========================================================================== */
(() => {
  'use strict';

  const { data, owner, guest, enter, DAILY, BOARD, grid, rounds, grade, order, daily, today, streak, picture, stars, time, title, switcher } = window.Pixels;
  const host = document.getElementById('pixels-levels'), leader = document.getElementById('pixels-leader');

  const say = (heading, detail) => {
    const box = document.getElementById('pixels-error');
    box.querySelector('.rux--inline-notification__title').textContent = heading;
    box.querySelector('.rux--inline-notification__subtitle').textContent = detail;
    box.hidden = false;
  };

  // The picture of a solved puzzle, or the question mark of one that is not.
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
  const words = (cls, text) => {
    const el = document.createElement('span');
    el.className = cls;
    el.textContent = text;
    return el;
  };

  // A square tile: `name` is what it is called, `href` where it goes.
  const tile = (puzzle, name, href, best) => {
    const a = document.createElement('a');
    a.className = 'rux--link rux--tile rux--tile--clickable pixels-puzzle';
    a.href = href;
    a.append(art(puzzle, best != null), words('pixels-puzzle-name', name),
      best != null ? stars(document.createElement('span'), best.stars) : words('pixels-meta', grade(rounds(grid(puzzle.squares, puzzle.width)))));
    return a;
  };

  // Today's puzzle, one card across the page.
  const todayCard = (puzzle, best, row) => {
    const a = document.createElement('a');
    a.className = 'pixels-today';
    a.href = 'play.html?daily';
    const text = document.createElement('div');
    text.className = 'pixels-today-text';
    // Its name, if it has one, waits until it is solved.
    text.append(words('pixels-meta', row ? `Today · ${row} day${row === 1 ? '' : 's'} in a row` : 'Today'), words('pixels-today-name', best ? puzzle.name : puzzle.date));
    const line = document.createElement('span');
    if (best) line.append(stars(document.createElement('span'), best.stars), words('pixels-meta', ` ${time(best.seconds)}`));
    else line.append(words('pixels-meta', grade(rounds(grid(puzzle.squares, puzzle.width)))));
    text.append(line);
    const go = document.createElement('span');
    go.className = 'pixels-today-go';
    go.setAttribute('aria-hidden', 'true');
    go.textContent = '›';
    a.append(art(puzzle, !!best), text, go);
    return a;
  };

  // For the owner: the tile, and under it the way to its puzzle in the maker.
  const editable = (link, puzzle) => {
    const wrap = document.createElement('div');
    wrap.className = 'pixels-tile';
    const edit = document.createElement('a');
    edit.className = 'rux--link pixels-tile-edit';
    edit.href = `make.html?id=${encodeURIComponent(puzzle.id)}`;
    edit.textContent = 'Edit';
    wrap.append(link, edit);
    return wrap;
  };

  /* THE LEADERBOARD. Two rankings behind one switch: today's puzzle, by
     stars then time, and all time, by every star earned, with puzzles solved
     and days in a row. The player's own row is marked. */
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
        ? ranks.today.map((r, i) => row(i + 1, r, [stars(document.createElement('span'), r.stars), words('pixels-rank-value', time(r.seconds))]))
        : ranks.all.map((r, i) => row(i + 1, r, [
          words('pixels-meta', DAILY ? `${r.solved} solved · ${r.days} day${r.days === 1 ? '' : 's'}` : `${r.solved} solved`),
          words('pixels-rank-value', `${r.stars} ★`),
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

  // A level: its name, how many are solved, a bar of that, and its tiles.
  const section = (heading, solved, tiles) => {
    const el = document.createElement('section');
    el.className = 'rux--stack-vertical rux--stack-scale-4';
    const head = document.createElement('div');
    head.className = 'pixels-level-head';
    const h2 = document.createElement('h2');
    h2.className = 'rux--type-productive-heading-03';
    h2.textContent = heading;
    h2.id = `pixels-${heading.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    el.setAttribute('aria-labelledby', h2.id);
    head.append(h2, words('pixels-meta', `${solved} of ${tiles.length} solved`));
    const bar = document.createElement('div');
    bar.className = 'rux--progress-bar rux--progress-bar--small';
    const track = document.createElement('div');
    track.className = 'rux--progress-bar__track';
    const fill = document.createElement('div');
    fill.className = 'rux--progress-bar__bar';
    fill.style.transform = `scaleX(${tiles.length ? solved / tiles.length : 0})`;
    track.appendChild(fill);
    bar.appendChild(track);
    const list = document.createElement('div');
    list.className = 'pixels-list';
    list.append(...tiles);
    el.append(head, bar, list);
    return el;
  };

  const empty = () => {
    const wrap = document.createElement('div');
    wrap.className = 'rux--stack-vertical rux--stack-scale-5';
    const p = document.createElement('p');
    p.className = 'rux--type-productive-heading-03';
    p.textContent = 'No puzzles yet';
    const make = document.createElement('a');
    make.className = 'rux--btn rux--btn--primary';
    make.href = 'make.html';
    make.textContent = 'Make one';
    wrap.append(p, make);
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
    }
    // With no leaderboard there is one panel and nothing to switch between.
    document.getElementById('pixels-tabs').hidden = !BOARD;
    if (DAILY) {
      const now = daily(today(), puzzles);
      host.appendChild(todayCard(now, days.get(now.day), streak(new Set(days.keys()))));
    }
    if (ranks) leader.appendChild(leaderboard(ranks));
    // The owner sees every day's puzzle he has drawn, soonest first, each
    // opening in the maker.
    const dated = puzzles.filter(p => p.day).sort((a, b) => a.day.localeCompare(b.day));
    if (owner && dated.length) {
      const drawn = section('Dailies', 0, dated.map(p => {
        const when = new Date(`${p.day}T12:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
        const a = tile(p, when, `make.html?id=${encodeURIComponent(p.id)}`, { stars: 3 });
        a.lastElementChild.replaceWith(words('pixels-meta', p.name));
        return a;
      }));
      drawn.querySelector('.pixels-level-head > .pixels-meta').textContent = `${dated.length} drawn`;
      drawn.querySelector('.rux--progress-bar').remove();
      host.appendChild(drawn);
    }
    if (!order(puzzles).length) { host.appendChild(empty()); return; }

    // "Puzzle 7" counts through every level, in playing order.
    const ordered = order(puzzles);
    // A level is named for its size and number, and its theme if it has one.
    const kind = p => `${p.width < 10 ? 'Quick' : p.width > 10 ? 'Long' : 'Level'} ${p.level}${p.theme ? ` · ${p.theme}` : ''}`;
    for (const heading of [...new Set(ordered.map(kind))]) {
      const tiles = [];
      let solved = 0;
      ordered.forEach((p, i) => {
        if (kind(p) !== heading) return;
        const best = results.get(p.id);
        if (best) solved++;
        const link = tile(p, title(p, i, !!best), `play.html?id=${encodeURIComponent(p.id)}`, best);
        tiles.push(owner ? editable(link, p) : link);
      });
      host.appendChild(section(heading, solved, tiles));
    }
  })();
})();
