/* ==========================================================================
   puzzles.js — the front page: two tabs, the puzzles and the leaderboard
   --------------------------------------------------------------------------
   A guest with no player yet gets the name form first; data.js's `enter`
   draws it.

   While app.js's DAILY is false the puzzle of the day is not shown: no card
   for it, and one ranking, all time, with no days in a row. While its BOARD
   is false there is no leaderboard and no tabs, only the puzzles.

   PUZZLES. Today's puzzle is one card across the page: its picture once
   solved, the date, the best time or how hard it is, and the days
   solved in a row. Then a section for each category the maker gave, headed
   by its name, a bar for how much of it is solved, and its puzzles easy to
   hard, three across on a phone, each tile a square, none locked. A category
   with no name is headed More. The 5×5 ones say Quick before the name and
   the 15×15 ones Long, and they stand before and after the 10×10 ones. A
   solved tile shows its picture, name and best time; an unsolved one its number,
   a question mark and how hard it is. The owner has under each an Edit link,
   Move, which asks which category of its size it goes to, and a switch,
   which sends the puzzle to no player when off, and a category has at most
   nine on. On each category he has a Published switch, which hides it from
   every player but him when off; arrows that move it up or down among those
   of its size; a pencil that renames it; and a bin that deletes it and
   leaves its puzzles in no category. Those stand in Unsorted, a section
   after their size's categories that no player is sent. He has a section of
   the days' puzzles he has drawn, by date; and Player view, a switch above
   them all that draws the page as a player is sent it, with none of these.

   A guest has no menu, so under the puzzles is their way to How to play.

   LEADERBOARD. Two rankings behind one switch: today's puzzle, with each
   player's time, and all time, with puzzles solved and days in a row, in
   the order the database sends them. The player's own row is marked.
   ========================================================================== */
(() => {
  'use strict';

  const { data, owner, guest, enter, DAILY, BOARD, grid, rounds, grade, order, daily, today, streak, picture, time, title, switcher } = window.Pixels;
  const host = document.getElementById('pixels-levels'), leader = document.getElementById('pixels-leader');
  // A category shows nine; the owner's others in it are switched off.
  const PER_LEVEL = 9;
  // Whether the owner's page is drawn as a player's, kept in this browser.
  const VIEW = 'pixels-player-view';
  // Every puzzle this player is sent; for the owner, every puzzle there is.
  let puzzles = [];

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
      words('pixels-meta', best != null ? time(best.seconds) : grade(rounds(grid(puzzle.squares, puzzle.width)))));
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
    text.append(words('pixels-meta', best ? time(best.seconds) : grade(rounds(grid(puzzle.squares, puzzle.width)))));
    const go = document.createElement('span');
    go.className = 'pixels-today-go';
    go.setAttribute('aria-hidden', 'true');
    go.textContent = '›';
    a.append(art(puzzle, !!best), text, go);
    return a;
  };

  /* ONE OF THE OWNER'S SWITCHES. `label` names it: above it where `shown`,
     and otherwise for a screen reader only, since what is beside it says
     what is switched. `text` puts On or Off beside it. `flip` is given the
     new state; where it throws the switch is put back and the page says
     `failed`, or what the error carries as `said`. */
  const toggle = (id, label, on, flip, { shown = false, text = true, failed } = {}) => {
    const root = document.createElement('div');
    root.className = 'rux--toggle';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'rux--toggle__button';
    button.id = id;
    button.setAttribute('role', 'switch');
    button.setAttribute('aria-checked', on);
    button.setAttribute('aria-labelledby', `${id}-l`);
    const name = document.createElement('label');
    name.className = 'rux--toggle__label';
    name.htmlFor = id;
    name.id = `${id}-l`;
    const look = document.createElement('div');
    look.className = 'rux--toggle__appearance rux--toggle__appearance--sm';
    const knob = document.createElement('div');
    knob.className = `rux--toggle__switch${on ? ' rux--toggle__switch--checked' : ''}`;
    knob.innerHTML = '<svg class="rux--toggle__check" width="6" height="5" viewBox="0 0 6 5" aria-hidden="true"><path d="M2.2 2.7L5 0 6 1 2.2 5 0 2.7 1 1.5z"/></svg>';
    look.append(knob);
    if (text) {
      const state = words('rux--toggle__text', on ? 'On' : 'Off');
      state.setAttribute('aria-hidden', 'true');
      look.append(state);
    }
    name.append(words(`rux--toggle__label-text${shown ? '' : ' rux--visually-hidden'}`, label), look);
    root.append(button, name);
    let undoing = false;
    root.addEventListener('rux:toggle', async e => {
      if (undoing) return;
      try {
        await flip(e.detail.on);
        document.getElementById('pixels-error').hidden = true;
      } catch (error) {
        undoing = true;
        window.Rux.formControls.toggle(root, !e.detail.on);
        undoing = false;
        say(...(error?.said || failed));
      }
    });
    return root;
  };

  // For the owner: the tile, and under it the way to its puzzle in the maker,
  // Move, and the switch that sends it to the players or keeps it from them.
  // `flip` is given the switch's new state, and `move` the button pressed;
  // either may be missing.
  const editable = (link, puzzle, flip, move) => {
    const wrap = document.createElement('div');
    wrap.className = `pixels-tile${puzzle.off ? ' is-off' : ''}`;
    const foot = document.createElement('div');
    foot.className = 'pixels-tile-foot';
    const edit = document.createElement('a');
    edit.className = 'rux--link pixels-tile-edit';
    edit.href = `make.html?id=${encodeURIComponent(puzzle.id)}`;
    edit.textContent = 'Edit';
    foot.append(edit);
    if (move) {
      const to = document.createElement('button');
      to.type = 'button';
      to.className = 'rux--link pixels-tile-edit pixels-tile-move';
      to.id = `pixels-move-${puzzle.id}`;
      to.textContent = 'Move';
      to.setAttribute('aria-label', `Move ${puzzle.name}`);
      to.addEventListener('click', () => move(to));
      foot.append(to);
    }
    if (flip) foot.append(toggle(`pixels-on-${puzzle.id}`, `Show ${puzzle.name} to players`, !puzzle.off, flip, { text: false, failed: ['The puzzle did not change', 'Try again.'] }));
    wrap.append(link, foot);
    return wrap;
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

  /* THE CATEGORY'S SWITCH. On, the category is sent to every player; off,
     only the owner is. `levels` is the size and number of each level under
     the heading, since two levels of one name share it. */
  const published = (id, levels, on) => toggle(`${id}-shown`, 'Published', on,
    async to => {
      await Promise.all(levels.map(([width, level]) => data.setHidden(width, level, !to)));
      levels.forEach(([width, level]) => puzzles.forEach(p => { if (p.width === width && p.level === level && !p.day) p.hidden = !to; }));
    },
    { failed: ['The category did not change', 'Try again.'] });

  // One of the owner's buttons on a category: an arrow, the pencil or the
  // bin. `move` is missing where the category is already first or last of
  // its size, and is given the button. `icon` is written whole where it is
  // passed, hash and all, which is how the sprite knows the page names it.
  const arrow = (label, icon, move) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'rux--btn rux--btn--ghost rux--btn--icon-only rux--btn--sm';
    b.setAttribute('aria-label', label);
    b.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><use href="${icon}"/></svg>`;
    b.disabled = !move;
    if (move) b.addEventListener('click', () => move(b));
    return b;
  };

  // A category: its name, how many of the `count` a player is sent are
  // solved, a bar of that, and its tiles. `own`, the owner's, puts the
  // Published switch and the buttons in its heading: `levels` is each level
  // under it, `up` and `down` move it, `rename` and `remove` do those.
  let sections = 0;
  const section = (heading, solved, tiles, own, count = tiles.length) => {
    const el = document.createElement('section');
    el.className = 'rux--stack-vertical rux--stack-scale-4';
    const head = document.createElement('div');
    head.className = 'pixels-level-head';
    const h2 = document.createElement('h2');
    h2.className = 'rux--type-productive-heading-03';
    h2.textContent = heading;
    h2.id = `pixels-category-${++sections}`;
    el.setAttribute('aria-labelledby', h2.id);
    head.append(h2);
    el.dataset.category = heading;
    if (own) {
      const moves = document.createElement('div');
      moves.className = 'pixels-moves';
      moves.append(arrow(`Move ${heading} up`, '#m-arrow_upward', own.up), arrow(`Move ${heading} down`, '#m-arrow_downward', own.down),
        arrow(`Rename ${heading}`, '#m-edit', own.rename), arrow(`Delete ${heading}`, '#m-delete', own.remove));
      head.append(published(h2.id, own.levels.map(l => l.at), own.levels.some(l => !l.hidden)), moves);
    }
    head.append(words('pixels-meta', `${solved} of ${count} solved`));
    const bar = document.createElement('div');
    bar.className = 'rux--progress-bar rux--progress-bar--small';
    const track = document.createElement('div');
    track.className = 'rux--progress-bar__track';
    const fill = document.createElement('div');
    fill.className = 'rux--progress-bar__bar';
    fill.style.transform = `scaleX(${count ? solved / count : 0})`;
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
    let me, results, days, ranks;
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
    const owns = owner && !!data.setHidden;
    let asPlayer = false;
    try { asPlayer = owns && localStorage.getItem(VIEW) === 'on'; } catch { /* the owner's view */ }
    // Player view, the owner's: on, the page below is what a player is sent.
    let view = null;
    if (owns && order(puzzles).length) {
      view = toggle('pixels-view', 'Player view', asPlayer, to => {
        asPlayer = to;
        try { localStorage.setItem(VIEW, to ? 'on' : 'off'); } catch { /* until the page is left */ }
        draw();
      }, { shown: true });
      host.appendChild(view);
    }
    // The owner sees every day's puzzle he has drawn, soonest first, each
    // opening in the maker.
    const dated = puzzles.filter(p => p.day).sort((a, b) => a.day.localeCompare(b.day));
    let drawn = null;
    if (owner && dated.length) {
      drawn = section('Dailies', 0, dated.map(p => {
        const when = new Date(`${p.day}T12:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
        const a = tile(p, when, `make.html?id=${encodeURIComponent(p.id)}`, { seconds: 0 });
        a.lastElementChild.replaceWith(words('pixels-meta', p.name));
        return a;
      }));
      delete drawn.dataset.category;
      drawn.querySelector('.pixels-level-head > .pixels-meta').textContent = `${dated.length} drawn`;
      drawn.querySelector('.rux--progress-bar').remove();
      host.appendChild(drawn);
    }
    if (!order(puzzles).length) { host.appendChild(empty()); return; }

    // A section is headed by its category's name, which the data calls the
    // level's theme, and the small and large boards say which they are
    // first. The level's number only orders the sections and is never shown.
    // A puzzle with no level is in no category: it stands in Unsorted, which
    // is a section of its own even beside a category of that name.
    const loose = p => p.level == null;
    const kind = p => {
      const size = p.width < 10 ? 'Quick' : p.width > 10 ? 'Long' : '', name = loose(p) ? 'Unsorted' : p.theme;
      return size ? (name ? `${size} · ${name}` : size) : name || 'More';
    };
    const key = p => `${loose(p)} ${kind(p)}`;
    // The name a category goes by where its size is already known.
    const called = p => p.theme || 'More';

    // Whether a category has its nine on, not counting the puzzle `but`.
    const full = (width, level, but) => puzzles.filter(q => q !== but && !q.day && !q.off && q.width === width && q.level === level).length >= PER_LEVEL;

    /* THE OWNER'S SWITCH ON A PUZZLE. Off, no player is sent it. A category
       shows nine, so a tenth is refused until one is switched off. The page
       is drawn again, since the count in the heading changes, and the focus
       goes back to the switch. */
    const flip = p => async on => {
      if (on && full(p.width, p.level)) {
        throw Object.assign(new Error('full'), { said: [`${kind(p)} has nine on`, 'Switch one off first.'] });
      }
      await data.setOff(p.id, !on);
      p.off = !on;
      draw();
      document.getElementById(`pixels-on-${p.id}`)?.focus();
    };

    /* THE CATEGORIES, drawn again after the owner moves one, switches a
       puzzle or changes the view. In Player view only what a player is sent
       is drawn, with nothing of the owner's. A move swaps a category with
       the one before or after it of the same size: the database is given
       every level of that size in the new order and numbers them by it, and
       the puzzles held here are numbered the same. `back` is the heading
       and button to put the focus back on: `by` for the arrow pressed, `at`
       for another of its buttons by its place. */
    let moving = false;
    function draw(back) {
      host.querySelectorAll('[data-category]').forEach(s => s.remove());
      // The days' puzzles are the owner's, and stand under the view's switch.
      if (drawn && asPlayer) drawn.remove();
      else if (drawn && !drawn.isConnected) view.after(drawn);
      const mine = owner && !asPlayer;
      // "Puzzle 7" counts through every category, in playing order.
      const ordered = order(asPlayer ? puzzles.filter(p => !p.hidden && !p.off && !loose(p)) : puzzles);
      if (!ordered.length) {
        const none = words('pixels-meta', 'No puzzle is published.');
        none.dataset.category = '';
        host.appendChild(none);
        return;
      }
      const groups = [...new Set(ordered.map(key))].map(which => {
        const tiles = [], levels = new Map();
        let solved = 0, count = 0, width = 0, heading = '', unsorted = false;
        ordered.forEach((p, i) => {
          if (key(p) !== which) return;
          const best = results.get(p.id);
          if (!p.off) count++;
          if (best && !p.off) solved++;
          // A puzzle in no category is the owner's alone, so its tile shows
          // its picture and name unsolved, and it has no switch.
          const link = tile(p, loose(p) ? p.name : title(p, i, !!best), `play.html?id=${encodeURIComponent(p.id)}`, loose(p) ? best ?? { seconds: 0 } : best);
          if (loose(p) && !best) link.lastElementChild.replaceWith(words('pixels-meta', grade(p.rounds)));
          tiles.push(mine ? editable(link, p, !loose(p) && data.setOff && flip(p), data.move && places(p).length && (from => ask(p, from))) : link);
          if (!loose(p)) levels.set(p.level, { at: [p.width, p.level], hidden: p.hidden });
          width = p.width;
          heading = kind(p);
          unsorted = loose(p);
        });
        return { heading, tiles, solved, count, width, unsorted, levels: [...levels.values()] };
      });
      const move = (group, by) => async () => {
        if (moving) return;
        const same = groups.filter(g => g.width === group.width), at = same.indexOf(group);
        [same[at], same[at + by]] = [same[at + by], same[at]];
        const to = same.flatMap(g => g.levels.map(l => l.at[1]));
        moving = true;
        try {
          await data.orderLevels(group.width, to);
          puzzles.forEach(p => { if (p.width === group.width && !p.day && !loose(p)) p.level = to.indexOf(p.level) + 1; });
          document.getElementById('pixels-error').hidden = true;
          moving = false;
          draw({ heading: group.heading, by });
        } catch {
          moving = false;
          say('The category did not move', 'Try again.');
        }
      };
      for (const group of groups) {
        // Unsorted has no switch, place or name of its own, and nothing to solve.
        if (group.unsorted) {
          const el = section(group.heading, 0, group.tiles);
          el.querySelector('.pixels-level-head > .pixels-meta').textContent = `${group.tiles.length} puzzle${group.tiles.length === 1 ? '' : 's'}`;
          el.querySelector('.rux--progress-bar').remove();
          host.appendChild(el);
          continue;
        }
        const same = groups.filter(g => g.width === group.width && !g.unsorted), at = same.indexOf(group);
        host.appendChild(section(group.heading, group.solved, group.tiles, owns && mine && {
          levels: group.levels,
          up: at > 0 && data.orderLevels ? move(group, -1) : null,
          down: at < same.length - 1 && data.orderLevels ? move(group, 1) : null,
          rename: data.setTheme ? from => naming(group, from) : null,
          remove: data.removeLevel ? from => removing(group, from) : null,
        }, group.count));
      }
      if (back) {
        const keys = [...host.querySelectorAll('section[data-category]')].find(s => s.dataset.category === back.heading)?.querySelectorAll('.pixels-moves button');
        // The arrow pressed, or the other where the category has reached the end.
        if (keys && back.by) {
          const [first, second] = back.by < 0 ? keys : [keys[1], keys[0]];
          (first.disabled ? second : first).focus();
        } else keys?.[back.at]?.focus();
      }
    }

    /* THE OWNER'S THREE WINDOWS, which index.html carries: where a puzzle
       moves, a category's new name, and deleting one. Each is opened for one
       puzzle or category, kept in `asked`, and its answer changes the
       database, then the puzzles held here, and the page is drawn again. */
    const $ = id => document.getElementById(id);
    const { modal } = window.Rux;
    let asked = null;

    // Where a puzzle can go: each category of its size but its own, by level,
    // and no category unless it is in none.
    function places(p) {
      const names = new Map();
      puzzles.forEach(q => { if (q.width === p.width && !q.day && !loose(q) && q.level !== p.level) names.set(q.level, q); });
      const to = [...names].sort((a, b) => a[0] - b[0]).map(([level, q]) => {
        const on = puzzles.filter(r => !r.day && !r.off && r.width === p.width && r.level === level).length;
        return new Option(`${called(q)} · ${on} of ${PER_LEVEL}`, level);
      });
      if (!loose(p)) to.push(new Option('Unsorted', 'none'));
      return to;
    }
    function ask(p, from) {
      asked = p;
      $('pixels-move-heading').textContent = `Move ${p.name}`;
      $('pixels-move-to').replaceChildren(...places(p));
      modal.open('pixels-move-modal', from);
    }
    $('pixels-move').addEventListener('submit', async e => {
      e.preventDefault();
      const p = asked, to = $('pixels-move-to').value, level = to === 'none' ? null : +to;
      modal.close('pixels-move-modal');
      // A puzzle that is off stays off, and one that comes into a category
      // with nine on arrives off.
      const off = p.off || (level != null && full(p.width, level, p));
      try {
        await data.move(p.id, level, off);
        const there = puzzles.find(q => q !== p && q.width === p.width && !q.day && q.level === level);
        Object.assign(p, { level, off, theme: level == null ? null : there?.theme ?? null, hidden: level != null && !!there?.hidden });
        $('pixels-error').hidden = true;
        draw();
        $(`pixels-move-${p.id}`)?.focus();
      } catch {
        say('The puzzle did not move', 'Try again.');
      }
    });

    function naming(group, from) {
      asked = group;
      $('pixels-rename-name').value = puzzles.find(p => p.width === group.width && !p.day && p.level === group.levels[0].at[1])?.theme || '';
      modal.open('pixels-rename-modal', from);
    }
    $('pixels-rename').addEventListener('submit', async e => {
      e.preventDefault();
      const group = asked, name = $('pixels-rename-name').value.trim(), levels = group.levels.map(l => l.at[1]);
      modal.close('pixels-rename-modal');
      try {
        await Promise.all(levels.map(level => data.setTheme(group.width, level, name)));
        let one;
        puzzles.forEach(p => { if (p.width === group.width && !p.day && levels.includes(p.level)) { p.theme = name || null; one = p; } });
        $('pixels-error').hidden = true;
        draw({ heading: kind(one), at: 2 });
      } catch {
        say('The category was not renamed', 'Try again.');
      }
    });

    function removing(group, from) {
      asked = group;
      const n = puzzles.filter(p => p.width === group.width && !p.day && group.levels.some(l => l.at[1] === p.level)).length;
      $('pixels-remove-heading').textContent = `Delete ${group.heading}?`;
      $('pixels-remove-text').textContent = `Its ${n === 1 ? 'puzzle moves' : `${n} puzzles move`} to Unsorted, and no player is sent ${n === 1 ? 'it' : 'them'}.`;
      modal.open('pixels-remove-modal', from);
    }
    $('pixels-remove-confirm').addEventListener('click', async () => {
      const group = asked;
      // The last first, so a level deleted does not renumber one still to go.
      const levels = group.levels.map(l => l.at[1]).sort((a, b) => b - a);
      try {
        for (const level of levels) {
          await data.removeLevel(group.width, level);
          puzzles.forEach(p => {
            if (p.width !== group.width || p.day || loose(p)) return;
            if (p.level === level) Object.assign(p, { level: null, theme: null, hidden: false });
            else if (p.level > level) p.level--;
          });
        }
        $('pixels-error').hidden = true;
      } catch {
        say('The category was not deleted', 'Reload the page to see what is left.');
      }
      draw();
      $('pixels-view')?.focus();
    });
    draw();
  })();
})();
