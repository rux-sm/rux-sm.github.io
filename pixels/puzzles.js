/* ==========================================================================
   puzzles.js — the front page: today's puzzle, the leaderboard, every level
   --------------------------------------------------------------------------
   A guest with no player yet gets the name form first; data.js's `enter`
   draws it. Then: today's puzzle with the days solved in a row beside it;
   the leaderboard, today's ranking by stars then time and the all-time one
   by stars, the player's own row marked; and a section for each level the
   maker gave, its puzzles easy to hard, none locked: the 5×5 levels are
   called Quick, the 15×15 ones Long, and they stand before and after the
   10×10 levels. A solved puzzle shows its picture, name, stars and best
   time; an unsolved one its number, a question mark and how hard it is. The
   owner has an Edit link under each.
   ========================================================================== */
(() => {
  'use strict';

  const { data, owner, guest, enter, grid, rounds, grade, order, daily, today, streak, picture, stars, time, title, switcher } = window.Pixels;
  const host = document.getElementById('pixels-levels');

  const say = (heading, detail) => {
    const box = document.getElementById('pixels-error');
    box.querySelector('.rux--inline-notification__title').textContent = heading;
    box.querySelector('.rux--inline-notification__subtitle').textContent = detail;
    box.hidden = false;
  };

  // `name` is what the tile is called, `href` where it goes.
  const tile = (puzzle, name, href, best) => {
    const solved = best != null;
    const a = document.createElement('a');
    a.className = 'rux--link rux--tile rux--tile--clickable';
    a.href = href;
    const art = document.createElement('div');
    if (solved) {
      art.className = 'pixels-picture pixels-picture--sm';
      picture(art, puzzle.squares, puzzle.colours);
    } else {
      art.className = 'pixels-blank';
      art.textContent = '?';
    }
    art.setAttribute('aria-hidden', 'true');
    const text = document.createElement('div');
    const label = document.createElement('p');
    label.className = 'rux--type-productive-heading-02';
    label.textContent = name;
    text.appendChild(label);
    const meta = document.createElement('p');
    meta.className = 'pixels-meta';
    if (solved) {
      meta.textContent = time(best.seconds);
      text.append(stars(document.createElement('span'), best.stars), meta);
    } else {
      meta.textContent = grade(rounds(grid(puzzle.squares, puzzle.width)));
      text.appendChild(meta);
    }
    a.append(art, text);
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
    const words = (cls, text) => {
      const span = document.createElement('span');
      span.className = cls;
      span.textContent = text;
      return span;
    };
    const show = which => {
      const rows = which === 'today'
        ? ranks.today.map((r, i) => row(i + 1, r, [stars(document.createElement('span'), r.stars), words('pixels-rank-value', time(r.seconds))]))
        : ranks.all.map((r, i) => row(i + 1, r, [
          words('pixels-meta', `${r.solved} solved · ${r.days} day${r.days === 1 ? '' : 's'}`),
          words('pixels-rank-value', `${r.stars} ★`),
        ]));
      if (rows.length) list.replaceChildren(...rows);
      else list.replaceChildren(words('pixels-meta', "Nobody has finished today's puzzle yet."));
    };
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

  // A heading, a note at its far end, and the tiles under them.
  const section = (heading, note, tiles) => {
    const el = document.createElement('section');
    el.className = 'rux--stack-vertical rux--stack-scale-5';
    const head = document.createElement('div');
    head.className = 'pixels-level-head';
    const h2 = document.createElement('h2');
    h2.className = 'rux--type-productive-heading-03';
    h2.textContent = heading;
    h2.id = `pixels-${heading.toLowerCase().replace(/\s+/g, '-')}`;
    el.setAttribute('aria-labelledby', h2.id);
    const aside = document.createElement('span');
    aside.className = 'pixels-meta';
    aside.textContent = note;
    head.append(h2, aside);
    const list = document.createElement('div');
    list.className = 'pixels-list';
    list.append(...tiles);
    el.append(head, list);
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
      [puzzles, results, days, ranks] = await Promise.all([data.list(), data.results(), data.days(), data.board(today())]);
    } catch {
      say('The puzzles did not load', 'Reload the page to try again.');
      return;
    }
    if (guest) {
      document.getElementById('pixels-player').textContent = me.name;
      document.getElementById('pixels-guestbar').hidden = false;
    }
    const now = daily(today()), row = streak(new Set(days.keys()));
    host.appendChild(section('Today', row ? `${row} day${row === 1 ? '' : 's'} in a row` : '',
      [tile(now, now.name, 'play.html?daily', days.get(now.day))]));
    if (ranks) host.appendChild(leaderboard(ranks));
    if (!puzzles.length) { host.appendChild(empty()); return; }

    // "Puzzle 7" counts through every level, in playing order.
    const ordered = order(puzzles);
    const kind = p => `${p.width < 10 ? 'Quick' : p.width > 10 ? 'Long' : 'Level'} ${p.level}`;
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
      host.appendChild(section(heading, `${solved} of ${tiles.length} solved`, tiles));
    }
  })();
})();
