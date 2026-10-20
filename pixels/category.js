/* ==========================================================================
   category.js — one category's puzzles
   --------------------------------------------------------------------------
   category.html?at=1 names the category, with &by= and its maker for a
   player's own: its place among its maker's categories, which the data
   calls its level. The owner's order decides the place, so an address is
   good until the categories are next reordered; one that names no category
   says so.

   A player reads a category as a rift. The page is its name, under its
   number for one of the owner's, how many sprites are found against a
   star, a bar of that, gold once all are, and its collection: its puzzles
   easy to hard in rows of five, A to O, each a square showing its picture
   once found and else its letter. The first not found, the one to play
   next, is in the primary button's colours, and the last, the boss, is
   ringed red until it is found. The boss of a rift of the course is held
   back until the others are found, by app.js's `holds`, and is dim. A
   square chosen, the next one at first, is told under the collection: its
   name, or its letter or Boss, its size and best time, and Play, or how
   many are still to find for a boss held back. A sprite found since the
   page last showed it turns into view.
   A rift of the course that is locked, by app.js's `locks`, shows no
   puzzle: its name, how many of the sprites it opens at are found, and a
   bar of that.

   The page is the same for every account, the owner's too: it draws what
   data.js's `list` is sent. A guest with no player yet gets the door
   first, and having no menu, a way to How to play under the tiles.
   ========================================================================== */
(() => {
  'use strict';

  const { data, enter, fresh, see, stand, portrait, categories, locks, heading, side, boss, holds, title, letter, words, art, bar, time, arrived, turn } = window.Pixels;
  const host = document.getElementById('pixels-category');

  const say = (heading, detail) => {
    const box = document.getElementById('pixels-error');
    box.querySelector('.rux--inline-notification__title').textContent = heading;
    box.querySelector('.rux--inline-notification__subtitle').textContent = detail;
    box.hidden = false;
  };

  (async () => {
    if (!data) {
      say('Pixels could not connect', 'Reload the page to try again.');
      return;
    }
    const query = new URLSearchParams(location.search), at = +query.get('at');
    let puzzles, results;
    try {
      if (!(await enter(host))) return;
      [puzzles, results] = await Promise.all([data.list(), data.results()]);
    } catch {
      say('The puzzles did not load', 'Reload the page to try again.');
      return;
    }
    fresh();
    const by = query.get('by') || '';
    const cats = categories(puzzles);
    locks(cats, results);
    const category = cats.find(c => c.level === at && (c.maker || '') === by);
    if (!category) {
      say('This rift is not here', 'It may have been moved. Pick one from Play.');
      return;
    }
    const name = heading(category), all = category.puzzles;
    document.title = `${name} — Pixels`;
    // A locked rift shows its name, how far it is from opening and a bar of
    // that, and none of its puzzles.
    if (category.short) {
      const have = category.need - category.short;
      const el = document.createElement('section');
      el.className = 'rux--stack-vertical rux--stack-scale-4';
      el.setAttribute('aria-labelledby', 'pixels-category-name');
      const head = document.createElement('div');
      head.className = 'pixels-level-head';
      const h1 = document.createElement('h1');
      h1.className = 'rux--type-productive-heading-04';
      h1.id = 'pixels-category-name';
      h1.textContent = name;
      head.append(words('pixels-level-label', `Rift ${category.number}`), h1, words('pixels-meta', `${have} of ${category.need} sprites to open`));
      el.append(head, bar(have, category.need));
      host.append(el);
      return;
    }
    see(category);
    stand(category);
    const solved = all.filter(p => results.has(p.id)).length;
    const el = document.createElement('section');
    el.className = `rux--stack-vertical rux--stack-scale-4 pixels-rift${solved === all.length ? ' is-cleared game-done' : ''}`;
    el.setAttribute('aria-labelledby', 'pixels-category-name');
    const head = document.createElement('div');
    head.className = 'pixels-level-head';
    const h1 = document.createElement('h1');
    h1.className = 'rux--type-productive-heading-04';
    h1.id = 'pixels-category-name';
    h1.textContent = name;
    const count = words('pixels-rift-count', `${solved}/${all.length}`);
    const star = document.createElement('span');
    star.className = 'pixels-star';
    count.append(star);
    count.setAttribute('aria-label', `${solved} of ${all.length} sprites found`);
    if (category.number) head.append(words('pixels-level-label', `Rift ${category.number}`));
    head.append(h1, count);
    // A player's rift says who made it.
    if (category.by) {
      const made = words('pixels-meta pixels-by', '');
      made.append(portrait(category.by), category.by.name);
      head.append(made);
    }

    // THE COLLECTION, and under it what the chosen square is.
    const next = all.find(p => !results.has(p.id));
    // The boss held back says how many sprites are still to find before it.
    const before = holds(category, results) ? all.length - 1 - solved : 0;
    const out = n => `${n} more sprite${n === 1 ? '' : 's'}`;
    const album = document.createElement('div');
    album.className = 'pixels-album';
    album.setAttribute('role', 'group');
    album.setAttribute('aria-label', 'Sprites');
    const panel = document.createElement('div');
    panel.className = 'rux--tile pixels-album-panel';
    panel.setAttribute('aria-live', 'polite');
    const choose = i => {
      squares.forEach((b, k) => b.setAttribute('aria-pressed', k === i));
      const p = all[i], best = results.get(p.id), held = boss(category, i) && before > 0;
      const text = document.createElement('div');
      text.append(words('pixels-album-name', title(p, i, !!best, boss(category, i))),
        words('pixels-meta', held ? `Out after ${out(before)}` : `${side(p)} · ${best ? `best ${time(best.seconds)}` : 'not found yet'}`));
      const parts = [text];
      if (!held) {
        const go = document.createElement('a');
        go.className = 'rux--btn rux--btn--primary';
        go.href = `play.html?id=${encodeURIComponent(p.id)}`;
        go.textContent = best ? 'Play again' : 'Play';
        parts.push(go);
      }
      panel.replaceChildren(...parts);
    };
    const squares = all.map((p, i) => {
      const best = results.get(p.id), last = boss(category, i);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `pixels-album-square${p === next ? ' is-next' : ''}${last && !best ? ' is-boss' : ''}${last && before ? ' is-held' : ''}`;
      b.append(best ? art(p, true) : letter(i));
      b.setAttribute('aria-label', best ? `${letter(i)}, ${p.name}` : last && before ? `Boss, out after ${out(before)}` : `${title(p, i, false, last)}, ${side(p)}${p === next ? ', next' : ''}`);
      b.addEventListener('click', () => choose(i));
      return b;
    });
    album.append(...squares);
    choose(next ? all.indexOf(next) : all.length - 1);
    el.append(head, bar(solved, all.length), album, panel);
    // A sprite found since this page last showed it turns into view.
    const turned = arrived(all.filter(p => results.has(p.id)).map(p => p.id));
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      turned.forEach((id, n) => turn(squares[all.findIndex(p => p.id === id)].querySelector('.pixels-picture'), 300 + n * 150));
    }
    host.append(el);
  })();
})();
