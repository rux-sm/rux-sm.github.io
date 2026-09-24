/* ==========================================================================
   puzzles.js — the front page: every puzzle, ten to a level
   --------------------------------------------------------------------------
   Levels fill in the order puzzles were made, and none is locked. A solved
   puzzle shows its picture, name and best time; an unsolved one its number
   and a question mark, as on the DS.
   ========================================================================== */
(() => {
  'use strict';

  const { data, picture, time, title } = window.Pixels;
  const host = document.getElementById('pixels-levels');
  const PER_LEVEL = 10;

  const say = (heading, detail) => {
    const box = document.getElementById('pixels-error');
    box.querySelector('.rux--inline-notification__title').textContent = heading;
    box.querySelector('.rux--inline-notification__subtitle').textContent = detail;
    box.hidden = false;
  };

  const tile = (puzzle, index, best) => {
    const solved = best != null;
    const a = document.createElement('a');
    a.className = 'rux--link rux--tile rux--tile--clickable';
    a.href = `play.html?id=${encodeURIComponent(puzzle.id)}`;
    const art = document.createElement('div');
    if (solved) {
      art.className = 'pixels-picture pixels-picture--sm';
      picture(art, puzzle.squares);
      art.setAttribute('aria-hidden', 'true');
    } else {
      art.className = 'pixels-blank';
      art.textContent = '?';
      art.setAttribute('aria-hidden', 'true');
    }
    const text = document.createElement('div');
    const name = document.createElement('p');
    name.className = 'rux--type-productive-heading-02';
    name.textContent = title(puzzle, index, solved);
    text.appendChild(name);
    if (solved) {
      const meta = document.createElement('p');
      meta.className = 'pixels-meta';
      meta.textContent = time(best);
      text.appendChild(meta);
    }
    a.append(art, text);
    return a;
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
    let puzzles, results;
    try {
      [puzzles, results] = await Promise.all([data.list(), data.results()]);
    } catch {
      say('The puzzles did not load', 'Reload the page to try again.');
      return;
    }
    if (!puzzles.length) { host.appendChild(empty()); return; }

    for (let start = 0; start < puzzles.length; start += PER_LEVEL) {
      const level = puzzles.slice(start, start + PER_LEVEL);
      const solved = level.filter(p => results.has(p.id)).length;
      const section = document.createElement('section');
      section.className = 'rux--stack-vertical rux--stack-scale-5';
      const head = document.createElement('div');
      head.className = 'pixels-level-head';
      const h2 = document.createElement('h2');
      h2.className = 'rux--type-productive-heading-03';
      h2.textContent = `Level ${start / PER_LEVEL + 1}`;
      h2.id = `pixels-level-${start / PER_LEVEL + 1}`;
      section.setAttribute('aria-labelledby', h2.id);
      const count = document.createElement('span');
      count.className = 'pixels-meta';
      count.textContent = `${solved} of ${level.length} solved`;
      head.append(h2, count);
      const list = document.createElement('div');
      list.className = 'pixels-list';
      level.forEach((p, i) => list.appendChild(tile(p, start + i, results.get(p.id))));
      section.append(head, list);
      host.appendChild(section);
    }
  })();
})();
