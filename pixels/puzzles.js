/* ==========================================================================
   puzzles.js — the front page: two tabs, the categories and the leaderboard
   --------------------------------------------------------------------------
   The page draws what data.js's `list` is sent and nothing else, the
   owner's as a map and every other player's as tiles. A guest with no
   player yet gets the door first; data.js's `enter` draws it.

   While app.js's DAILY is false the puzzle of the day is not shown: no card
   for it, and one ranking, all time, with no days in a row. While its BOARD
   is false there is no leaderboard and no tabs, only the puzzles.

   PUZZLES. Today's puzzle is one card across the page: its picture once
   solved, the date, the best time or how hard it is, and the days solved in
   a row. Then a tile for each category, in playing order, one to a row on
   a phone, drawn by app.js's `riftTile`: its portal, the way a player
   enters it, in its rank's colour and shut once every sprite is found; its
   name, after its rank for one of the owner's; its number and how many
   sprites are found; and a bar of that. A player's rift also says who made
   it, and one not yet opened says New. A tile opens its category in
   category.html, but for a locked one, a rift of the course that waits for
   more sprites, which is dim and says how many. A player reads a category
   as a rift.

   ADD TO HOME SCREEN is a row of Me's list. An iPhone is sent here by it,
   as `#add`, and shown the steps in a modal, because its icon opens the
   address it was made from and this is the page to open. A guest's key is
   in the address while the modal is open, for the icon to keep. Any other
   browser opens its own install window from Me.

   LEADERBOARD. Two rankings behind one switch: today's puzzle, with each
   player's time, and all time, with puzzles solved and days in a row, in
   the order the database sends them. The player's own row is marked.
   ========================================================================== */
(() => {
  'use strict';

  const { data, owner, enter, carry, iphone, installed, fresh, seen, stood, locks, portal, heading, where, riftTile, DAILY, BOARD, grid, rounds, grade, categories, daily, today, streak, time, words, art, switcher } = window.Pixels;
  const host = document.getElementById('pixels-levels'), leader = document.getElementById('pixels-leader');

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

  /* THE MAP. The owner is drawn the course as a map in place of its tiles:
     one land with a path through it, and a rift's portal on the path where
     a rift of the course is. Every other player is drawn the tiles while the
     map's first part is a placeholder.

     The map is drawn in six parts, one to a rank and two rifts to a part,
     each a picture in art/ of 120 squares by 80, `map-1.png` at the foot. A
     part shows once one of its rifts is here, and `fog.png` lies over the
     highest. A square is a whole number of screen pixels, which app.css
     sets as `--map-px`.

     SPOTS is where each rift of the course stands on its part, the top left
     square of its portal, and SIDE the same for the side place on the first
     part, which leads to the rifts outside the course, under the map.
     tools/build-placeholders.mjs reads both to mark them on a part's
     template, so a spot moves here and that is run again.

     A rift on the map is its portal with its words under it: its rank and
     name, and how many sprites are found. A locked one is dim and no link
     and says how many open it, a cleared one is shut, and one not yet
     opened pulses. `map` returns the map and where each rift is on it. */
  const MAP = owner;
  const SPOTS = [[23, 43], [83, 11], [23, 43], [83, 11], [23, 43], [83, 11], [23, 43], [83, 11], [23, 43], [83, 11], [23, 43], [83, 11]];
  const SIDE = [87, 51];
  const put = (el, [x, y]) => {
    el.style.setProperty('--x', x);
    el.style.setProperty('--y', y);
    return el;
  };
  const sign = (name, note) => {
    const text = document.createElement('span');
    text.className = 'pixels-map-words';
    text.append(words('pixels-map-name', name), words('pixels-map-note', note));
    return text;
  };
  const place = (c, found) => {
    const all = c.puzzles.length, locked = c.short > 0, cleared = !locked && found === all, unopened = !locked && !found && !seen(c);
    const a = document.createElement(locked ? 'div' : 'a');
    a.className = `pixels-map-rift${locked ? ' is-locked' : ''}${unopened ? ' is-new' : ''}`;
    if (!locked) a.href = where(c);
    a.append(portal(c, cleared), sign(`${c.rank} · ${heading(c)}`,
      locked ? `${c.need - c.short} of ${c.need} sprites to open` : cleared ? 'Rift cleared' : unopened ? `New · ${all} sprites` : `${found} of ${all} sprites`));
    return put(a, SPOTS[c.number - 1]);
  };
  // The side place is drawn on the part's picture, so here it is only the
  // square to press and its words.
  const sidePlace = (count, unopened) => {
    const a = document.createElement('a');
    a.className = 'pixels-map-rift';
    a.href = '#pixels-more';
    const square = document.createElement('span');
    square.className = 'pixels-map-side';
    a.append(square, sign('More rifts', `${unopened ? 'New · ' : ''}${count} rift${count === 1 ? '' : 's'}`));
    return put(a, SIDE);
  };
  const map = (course, more, results) => {
    const count = c => c.puzzles.filter(p => results.has(p.id)).length;
    const el = document.createElement('nav'), places = new Map();
    el.className = 'pixels-map';
    el.setAttribute('aria-label', 'Rifts');
    for (let n = 0; n * 2 < course.length; n++) {
      const part = document.createElement('div');
      part.className = 'pixels-map-part';
      part.style.backgroundImage = `url(art/map-${n + 1}.png)`;
      course.slice(n * 2, n * 2 + 2).forEach(c => {
        places.set(c, place(c, count(c)));
        part.append(places.get(c));
      });
      if (!n && more.length) part.append(sidePlace(more.length, more.some(c => !count(c) && !seen(c))));
      el.append(part);
    }
    const fog = document.createElement('div');
    fog.className = 'pixels-map-fog';
    el.append(fog);
    return { el, places };
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
    // Me's row brings an iPhone here as `#add`, which opens the steps and
    // leaves the address, since the icon keeps whatever the address holds.
    if (location.hash === '#add') {
      history.replaceState(history.state, '', location.pathname + location.search);
      addEventListener('load', () => window.Rux.modal.open(modal));
    }
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
    locks(cats, results);
    // A rift not yet opened, with nothing found in it, says New, unless it
    // is locked, which its tile says for itself.
    const tiles = rifts => {
      const list = document.createElement('div');
      list.className = 'game-tiles';
      list.append(...rifts.map(c => {
        const found = c.puzzles.filter(p => results.has(p.id)).length;
        return riftTile(c, found, !c.short && !found && !seen(c) ? 'New' : '');
      }));
      return list;
    };
    if (!MAP) { host.appendChild(tiles(cats)); return; }
    // The course is the rifts the map has a spot for. A rift past them, and
    // every rift with no number, keeps its tile under the map.
    const course = cats.filter(c => c.number && c.number <= SPOTS.length), more = cats.filter(c => !course.includes(c));
    const land = course.length ? map(course, more, results) : null;
    if (land) host.appendChild(land.el);
    if (more.length) {
      const h2 = document.createElement('h2');
      h2.className = 'rux--type-productive-heading-03';
      h2.id = 'pixels-more';
      h2.textContent = 'More rifts';
      host.append(...(land ? [h2] : []), tiles(more));
    }
    // The map opens with the player's rift in the middle of the window: the
    // one they last went into, or the first with a sprite left to find.
    const mine = course.find(stood) || course.find(c => !c.short && c.puzzles.some(p => !results.has(p.id))) || course[0];
    if (land) land.places.get(mine).scrollIntoView({ block: 'center' });
  })();
})();
