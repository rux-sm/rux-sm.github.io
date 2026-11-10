/* ==========================================================================
   problems.js — the Problems page
   --------------------------------------------------------------------------
   Every game with a problem, under one heading per kind of problem, worst
   kind first; a game with two problems is under both. Each row says what is
   wrong and opens the game in Collection.
   ========================================================================== */
(() => {
  'use strict';

  const R = window.Roms;
  const $ = id => document.getElementById(id);
  const { el } = R;
  if (!R?.data) { R?.notice('Roms needs a log-in to read the collection.'); return; }

  async function load() {
    let games;
    try { games = await R.data.games(); }
    catch (error) { console.error(error); R.notice('Roms could not read the collection. Try again.'); return; }
    $('roms-empty').hidden = games.length > 0;
    if (!games.length) return;

    const groups = new Map(Object.keys(R.STATUS).filter(k => k !== 'good').map(k => [k, []]));
    for (const g of games) for (const [kind, words] of R.problemsOf(g)) groups.get(kind)?.push({ g, words });
    const withProblems = new Set([...groups.values()].flat().map(x => x.g));
    $('roms-sum').textContent = withProblems.size
      ? `${withProblems.size} of ${games.length} games need a look.`
      : `All ${games.length} games are good.`;

    const out = $('roms-groups');
    out.replaceChildren();
    for (const [kind, rows] of groups) {
      if (!rows.length) continue;
      const box = el('div', 'rux--contained-list rux--layout--size-lg rux--contained-list--on-page');
      const head = el('div', 'rux--contained-list__header');
      head.append(el('h2', 'rux--contained-list__label', `${R.STATUS[kind][0]} (${rows.length})`));
      const ul = el('ul');
      ul.setAttribute('role', 'list');
      for (const { g, words } of rows) {
        const li = el('li', 'rux--contained-list-item rux--contained-list-item--clickable');
        const a = el('button', 'rux--contained-list-item__content roms-row');
        a.type = 'button';
        a.addEventListener('click', () => { location.href = `./?q=${encodeURIComponent(g.title)}`; });
        const main = el('span', 'roms-row__main');
        main.append(el('span', '', g.title), el('span', 'roms-row__sub', `${R.systemName(g.system)} · ${words}`));
        a.append(main);
        li.append(a);
        ul.append(li);
      }
      box.append(head, ul);
      out.append(box);
    }
  }
  load();
})();
