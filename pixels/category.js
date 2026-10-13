/* ==========================================================================
   category.js — one category's puzzles
   --------------------------------------------------------------------------
   category.html?at=1 names the category, with &by= and its maker for a
   player's own: its place among its maker's categories, which the data
   calls its level. The owner's order decides the place, so an address is
   good until the categories are next reordered; one that names no category
   says so.

   A player reads a category as a rift. The page is its name, after its
   number for one of the owner's, its size and how many sprites are found, or Rift
   cleared, a bar of that, and its puzzles easy to hard, three across on a
   phone and five on a wide screen, each tile a square. Each
   has its letter in the rift, A to O, in its corner. A solved tile shows
   its picture, name and best time; an unsolved one a question mark over
   its board's size, with Boss for the last, and the first of them, the one
   to play next, has its question mark in the primary button's colours.
   The boss of a rift of the course is held back until the others are
   found, by app.js's `holds`: its tile is dim, no link, and says how many
   are still to find.
   A rift of the course that is locked, by app.js's `locks`, shows no
   puzzle: its name, how many of the sprites it opens at are found, and a
   bar of that.

   The page is the same for every account, the owner's too: it draws what
   data.js's `list` is sent. A guest with no player yet gets the door
   first, and having no menu, a way to How to play under the tiles.
   ========================================================================== */
(() => {
  'use strict';

  const { data, enter, fresh, see, stand, portrait, categories, locks, heading, side, sprites, boss, holds, title, letter, words, tile, bar } = window.Pixels;
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
      say('This rift is not here', 'It may have been moved. Pick one from Puzzles.');
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
      h1.textContent = `Rift ${category.number} · ${name}`;
      head.append(h1, words('pixels-meta', `${have} of ${category.need} sprites to open`));
      el.append(head, bar(have, category.need));
      host.append(el);
      return;
    }
    see(category);
    stand(category);
    const solved = all.filter(p => results.has(p.id)).length;
    const el = document.createElement('section');
    el.className = 'rux--stack-vertical rux--stack-scale-4';
    el.setAttribute('aria-labelledby', 'pixels-category-name');
    const head = document.createElement('div');
    head.className = 'pixels-level-head';
    const h1 = document.createElement('h1');
    h1.className = 'rux--type-productive-heading-04';
    h1.id = 'pixels-category-name';
    h1.textContent = category.number ? `Rift ${category.number} · ${name}` : name;
    head.append(h1, words('pixels-meta', `${side(category)} · ${sprites(solved, all.length)}`));
    const list = document.createElement('div');
    list.className = 'pixels-list';
    // The first puzzle not yet solved is the one to play next.
    const next = all.find(p => !results.has(p.id));
    // The boss held back says how many sprites are still to find before it.
    const before = holds(category, results) ? all.length - 1 - solved : 0;
    list.append(...all.map((p, i) => {
      // An unsolved puzzle shows its letter, or Boss, over its board's size,
      // and is read out as Puzzle C, 5×5.
      const best = results.get(p.id), last = boss(category, i), out = !(last && before);
      const a = tile(p, best ? p.name : last ? 'Boss' : '', out ? `play.html?id=${encodeURIComponent(p.id)}` : '', best, letter(i), out ? side(p) : `after ${before} more`);
      if (!out) a.setAttribute('aria-label', `Boss, out after ${before} more sprite${before === 1 ? '' : 's'}`);
      else if (!best) a.setAttribute('aria-label', `${title(p, i, false, last)}, ${side(p)}${p === next ? ', next' : ''}`);
      if (p === next) a.classList.add('is-next');
      return a;
    }));
    // A player's rift says who made it.
    if (category.by) {
      const made = words('pixels-meta pixels-by', '');
      made.append(portrait(category.by), category.by.name);
      head.append(made);
    }
    el.append(head, bar(solved, all.length), list);
    host.append(el);
  })();
})();
