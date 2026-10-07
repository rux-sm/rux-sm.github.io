/* ==========================================================================
   category.js — one category's puzzles
   --------------------------------------------------------------------------
   category.html?size=10&at=1 names the category, with &by= and its maker
   for a player's own: the side of its boards and
   its place among the categories of that size, which the data calls its
   level. The owner's order decides the place, so an address is good until
   the categories are next reordered; one that names no category says so.

   A player reads a category as a gate. The page is its name with its grade
   in a tag beside it, its size and how many sprites are found, or Gate
   cleared, a bar of that, and its puzzles easy to hard, three across on a
   phone, each tile a square, none locked. A solved tile shows its picture,
   name and best time; an unsolved one its number within the category, or
   Boss for the last, a question mark and how hard it is.

   The page is the same for every account, the owner's too: it draws what
   data.js's `list` is sent. A guest with no player yet gets the name form
   first, and having no menu, a way to How to play under the tiles.
   ========================================================================== */
(() => {
  'use strict';

  const { data, guest, enter, fresh, see, portrait, categories, heading, side, hardness, gradeTag, sprites, boss, title, words, tile, bar } = window.Pixels;
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
    const query = new URLSearchParams(location.search), size = +query.get('size'), at = +query.get('at');
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
    const category = categories(puzzles).find(c => c.width === size && c.level === at && (c.maker || '') === by);
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
    h1.textContent = name;
    head.append(h1, gradeTag(hardness(category)), words('pixels-meta', `${side(category)} · ${sprites(solved, all.length)}`));
    const list = document.createElement('div');
    list.className = 'pixels-list';
    list.append(...all.map((p, i) => {
      const best = results.get(p.id);
      return tile(p, title(p, i, !!best, boss(category, i)), `play.html?id=${encodeURIComponent(p.id)}`, best);
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
