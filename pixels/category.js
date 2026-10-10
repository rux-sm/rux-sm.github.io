/* ==========================================================================
   category.js — one category's puzzles
   --------------------------------------------------------------------------
   category.html?at=1 names the category, with &by= and its maker for a
   player's own: its place among its maker's categories, which the data
   calls its level. The owner's order decides the place, so an address is
   good until the categories are next reordered; one that names no category
   says so.

   A player reads a category as a gate. The page is its name, after its
   number for one of the owner's, its size and how many sprites are found, or Gate
   cleared, a bar of that, and its puzzles easy to hard, three across on a
   phone and five on a wide screen, each tile a square, none locked. Each
   has its letter in the gate, A to O, in its corner. A solved tile shows
   its picture, name and best time; an unsolved one a question mark, and
   Boss for the last.

   The page is the same for every account, the owner's too: it draws what
   data.js's `list` is sent. A guest with no player yet gets the door
   first, and having no menu, a way to How to play under the tiles.
   ========================================================================== */
(() => {
  'use strict';

  const { data, guest, enter, fresh, see, portrait, categories, heading, side, sprites, boss, title, letter, words, tile, bar } = window.Pixels;
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
    if (guest) document.getElementById('pixels-foot').hidden = false;
    fresh();
    const by = query.get('by') || '';
    const category = categories(puzzles).find(c => c.level === at && (c.maker || '') === by);
    if (!category) {
      say('This gate is not here', 'It may have been moved. Pick one from Puzzles.');
      return;
    }
    see(category);
    const name = heading(category), all = category.puzzles;
    document.title = `${name} — Pixels`;
    const solved = all.filter(p => results.has(p.id)).length;
    const el = document.createElement('section');
    el.className = 'rux--stack-vertical rux--stack-scale-4';
    el.setAttribute('aria-labelledby', 'pixels-category-name');
    const head = document.createElement('div');
    head.className = 'pixels-level-head';
    const h1 = document.createElement('h1');
    h1.className = 'rux--type-productive-heading-04';
    h1.id = 'pixels-category-name';
    h1.textContent = category.number ? `Gate ${category.number} · ${name}` : name;
    head.append(h1, words('pixels-meta', `${side(category)} · ${sprites(solved, all.length)}`));
    const list = document.createElement('div');
    list.className = 'pixels-list';
    list.append(...all.map((p, i) => {
      // An unsolved puzzle shows its letter alone, or Boss, and is read out
      // as Puzzle C.
      const best = results.get(p.id), last = boss(category, i);
      const a = tile(p, best ? p.name : last ? 'Boss' : '', `play.html?id=${encodeURIComponent(p.id)}`, best, letter(i));
      if (!best) a.setAttribute('aria-label', title(p, i, false, last));
      return a;
    }));
    // A player's gate says who made it.
    if (category.by) {
      const made = words('pixels-meta pixels-by', '');
      made.append(portrait(category.by), category.by.name);
      head.append(made);
    }
    el.append(head, bar(solved, all.length), list);
    host.append(el);
  })();
})();
