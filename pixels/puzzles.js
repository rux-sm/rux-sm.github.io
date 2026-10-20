/* ==========================================================================
   puzzles.js — the front page: two tabs, the categories and the leaderboard
   --------------------------------------------------------------------------
   The page draws what data.js's `list` is sent and nothing else, as tiles,
   or for the owner as a map once app.js's WORLD is on. A guest with no
   player yet gets the door first; data.js's `enter` draws it.

   While app.js's DAILY is false the puzzle of the day is not shown: no card
   for it, and one ranking, all time, with no days in a row. While its BOARD
   is false there is no leaderboard and no tabs, only the puzzles.

   PUZZLES. Under the logo, today's puzzle is one card across the page: its
   picture once solved, the date, the best time or how hard it is, and the
   days solved in a row. Then a tile for each category, in playing order,
   one to a row, drawn by app.js's `riftTile`: the way into it, with the
   sprite last found in it, its number and name, and how many sprites are
   found, against a star and in a bar. A player's rift says who made it in
   place of its number, and one not yet opened says New. A tile opens its category in category.html, but
   for a locked one, a rift of the course that waits for more sprites,
   which is one dim line saying how many. A player reads a category as a
   rift.

   CONTINUE is a card under the logo, over the rifts, that plays the next
   puzzle: the first not found in the rift the player last went into, or in
   the first open rift with one left. It is drawn as a rift's tile is, with
   the puzzle's letter in place of a picture, a Continue tag, the puzzle's
   size, and its rift's name and bar; a boss says Boss by its size. The
   rift's count is on its own tile under it. It is not there
   once everything is found.

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

  const { data, owner, enter, carry, iphone, installed, fresh, seen, stood, locks, worn, hero, portal, heading, where, riftTile, boss, letter, side, bar, DAILY, BOARD, WORLD, grid, rounds, grade, categories, daily, today, streak, time, words, art, switcher } = window.Pixels;
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

  /* THE MAP. While app.js's WORLD is on, the owner is drawn the course as a
     map in place of its tiles: one land with a path through it, and a rift's
     portal on the path where a rift of the course is. Every other player is
     drawn the tiles while the map's first part is a placeholder.

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

     A rift on the map is its portal alone, a button named by its words:
     its rank and name, and how many sprites are found. A locked one is dim
     and its words say how many open it, a cleared one is shut, and one not
     yet opened pulses. `map` returns the map, each rift's button and what
     the panel says of each.

     THE PANEL under the map says the chosen rift's words, with Play for an
     open one, and starts on the player's own. THE CHARACTER stands beside
     the player's rift, app.js's `hero` in what the player has. A tap on a
     rift chooses it, and on an open one hops the character there in half a
     second, or puts it there at once for a player who has asked for less
     movement. */
  const MAP = owner && WORLD;
  const SPOTS = [[17, 32], [62, 8], [17, 32], [62, 8], [17, 32], [62, 8], [17, 32], [62, 8], [17, 32], [62, 8], [17, 32], [62, 8]];
  const SIDE = [66, 38];
  const put = (el, [x, y]) => {
    el.style.setProperty('--x', x);
    el.style.setProperty('--y', y);
    return el;
  };
  // What the panel says of a place on the map: its name, a note, and where
  // its key goes and what the key says, or no key for a locked rift.
  const button = (cls, says) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.setAttribute('aria-label', `${says.name}, ${says.note}`);
    return b;
  };
  const place = (c, found) => {
    const all = c.puzzles.length, locked = c.short > 0, cleared = !locked && found === all, unopened = !locked && !found && !seen(c);
    const says = { name: `${c.rank} · ${heading(c)}`, locked,
      note: locked ? `${c.need - c.short} of ${c.need} sprites to open` : cleared ? 'Rift cleared' : unopened ? `New · ${all} sprites` : `${found} of ${all} sprites`,
      href: locked ? null : where(c), key: 'Play' };
    const b = button(`pixels-map-rift${locked ? ' is-locked' : ''}${unopened ? ' is-new' : ''}`, says);
    b.append(portal(c, cleared));
    return [put(b, SPOTS[c.number - 1]), says];
  };
  // The side place is drawn on the part's picture, so here it is only the
  // square to press.
  const sidePlace = (count, unopened) => {
    const says = { name: 'More rifts', note: `${unopened ? 'New · ' : ''}${count} rift${count === 1 ? '' : 's'}`, href: '#pixels-more', key: 'See them' };
    const b = button('pixels-map-rift', says);
    const square = document.createElement('span');
    square.className = 'pixels-map-side';
    b.append(square);
    return [put(b, SIDE), says];
  };
  const map = (course, more, results) => {
    const count = c => c.puzzles.filter(p => results.has(p.id)).length;
    const el = document.createElement('nav'), places = new Map(), says = new Map();
    el.className = 'pixels-map';
    el.setAttribute('aria-label', 'Rifts');
    for (let n = 0; n * 2 < course.length; n++) {
      const part = document.createElement('div');
      part.className = 'pixels-map-part';
      part.style.backgroundImage = `url(art/map-${n + 1}.png)`;
      course.slice(n * 2, n * 2 + 2).forEach(c => {
        const [b, words] = place(c, count(c));
        places.set(c, b);
        says.set(b, words);
        part.append(b);
      });
      if (!n && more.length) {
        const [b, words] = sidePlace(more.length, more.some(c => !count(c) && !seen(c)));
        says.set(b, words);
        part.append(b);
      }
      el.append(part);
    }
    const fog = document.createElement('div');
    fog.className = 'pixels-map-fog';
    el.append(fog);
    return { el, places, says };
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
      manage.href = 'create.html?view=game';
      manage.textContent = 'Create';
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
    // Continue: the first puzzle not found, in the player's rift if it has
    // one and else in the first open rift that has. A rift's boss is its
    // last, so the first not found is never one held back.
    // It says which, as its letter, or Boss, and its rift.
    const left = c => !c.short && c.puzzles.find(p => !results.has(p.id));
    const onward = [cats.find(stood), ...cats].map(c => c && left(c)).find(Boolean);
    const here = onward && cats.find(c => c.puzzles.includes(onward));
    if (onward) {
      const at = here.puzzles.indexOf(onward), which = boss(here, at) ? 'Boss' : `Puzzle ${letter(at)}`;
      const have = here.puzzles.filter(p => results.has(p.id)).length, all = here.puzzles.length;
      const card = document.createElement('a');
      card.className = 'rux--link rux--tile rux--tile--clickable game-tile pixels-rift pixels-continue';
      card.href = `play.html?id=${encodeURIComponent(onward.id)}`;
      card.setAttribute('aria-label', `Continue with ${which === 'Boss' ? 'the boss' : which}, ${side(onward)}, of ${heading(here)}, ${have} of ${all} sprites found`);
      const art = words('game-tile-art pixels-rift-art', letter(at));
      art.setAttribute('aria-hidden', 'true');
      const head = words('game-tile-head', ''), line = words('pixels-rift-line', '');
      line.append(words('rux--tag rux--layout--size-sm rux--tag--sm rux--tag--blue game-tile-tag', 'Continue'), words('', which === 'Boss' ? `Boss · ${side(onward)}` : side(onward)));
      head.append(line);
      card.append(art, head, words('game-tile-name', heading(here)), bar(have, all));
      const list = document.createElement('div');
      list.className = 'game-tiles pixels-continue-list';
      list.append(card);
      host.before(list);
    }
    // A rift not yet opened, with nothing found in it, says New, unless it
    // is locked, which its tile says for itself, or Continue goes into it.
    const tiles = rifts => {
      const list = document.createElement('div');
      list.className = 'game-tiles';
      list.append(...rifts.map(c => riftTile(c, results, {
        tag: c !== here && !c.short && !c.puzzles.some(p => results.has(p.id)) && !seen(c) ? 'New' : '',
      })));
      return list;
    };
    if (!MAP) { host.appendChild(tiles(cats)); return; }
    // The course is the rifts the map has a spot for. A rift past them, and
    // every rift with no number, keeps its tile under the map.
    const course = cats.filter(c => c.number && c.number <= SPOTS.length), more = cats.filter(c => !course.includes(c));
    const land = course.length ? map(course, more, results) : null;
    // The panel, which says the chosen place's words and leads into it.
    const panel = document.createElement('div');
    panel.className = 'pixels-map-panel';
    panel.setAttribute('aria-live', 'polite');
    const show = b => {
      const s = land.says.get(b);
      land.says.forEach((_, other) => other.removeAttribute('aria-current'));
      b.setAttribute('aria-current', 'true');
      const text = document.createElement('div');
      text.className = 'pixels-map-panel-words';
      text.append(words('pixels-map-name', s.name), words('pixels-map-note', s.note));
      // The ? key opens How to play, beside the way in.
      const help = document.createElement('button');
      help.type = 'button';
      help.className = 'rux--btn rux--btn--secondary pixels-map-help';
      help.dataset.ruxOpen = 'pixels-how';
      help.setAttribute('aria-label', 'How to play');
      help.textContent = '?';
      const parts = [text, help];
      if (s.href) {
        const go = document.createElement('a');
        go.className = 'rux--btn rux--btn--primary';
        go.href = s.href;
        go.textContent = s.key;
        parts.push(go);
      }
      panel.replaceChildren(...parts);
    };
    if (land) host.append(land.el, panel);
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
    if (!land) return;
    land.places.get(mine).scrollIntoView({ block: 'center' });
    show(land.places.get(mine));
    // The character stands a square clear of its rift's portal, on its left.
    const who = hero(worn(me.found || 0), me.gear), beside = el => el.getBoundingClientRect().left - who.offsetWidth * 16 / 15;
    who.classList.add('pixels-map-hero');
    const [x, y] = SPOTS[mine.number - 1];
    land.places.get(mine).parentElement.append(put(who, [x - 16, y]));
    let at = land.places.get(mine), moved = [0, 0], hopping = false;
    land.el.addEventListener('click', e => {
      const to = e.target.closest('.pixels-map-rift');
      if (!to || !land.says.has(to)) return;
      show(to);
      // The character goes only to an open rift of the course, and not
      // while it is already on its way.
      if (to === at || hopping || land.says.get(to).locked || ![...land.places.values()].includes(to)) return;
      const from = who.getBoundingClientRect(), there = to.getBoundingClientRect();
      const next = [moved[0] + beside(to) - from.left, moved[1] + there.top - from.top];
      const shift = ([dx, dy], up = 0) => ({ transform: `translate(${dx}px, ${dy - up}px)` });
      const settle = () => { who.style.transform = shift(next).transform; [at, moved, hopping] = [to, next, false]; };
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { settle(); return; }
      hopping = true;
      who.animate([shift(moved), shift([(moved[0] + next[0]) / 2, (moved[1] + next[1]) / 2], who.offsetHeight / 2), shift(next)], { duration: 500, easing: 'ease-in-out' })
        .finished.then(settle);
    });
  })();
})();
