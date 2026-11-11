/* ==========================================================================
   collection.js — the Collection page
   --------------------------------------------------------------------------
   Every game the last scan found, by system then title, with search and a
   filter per system and per status. A wide screen shows a table; a phone
   shows the same games as a list. A game opens in the side panel,
   game-panel.js.
   ========================================================================== */
(() => {
  'use strict';

  const R = window.Emu;
  const $ = id => document.getElementById(id);
  const { el, tag, option } = R;
  if (!R?.data) { R?.notice('Emu needs a log-in to read the collection.'); return; }

  let games = [];
  let saves = [];

  function shown() {
    const q = $('emu-search').value.trim().toLowerCase();
    const sys = $('emu-filter-system').value, status = $('emu-filter-status').value;
    return games.filter(g => (!q || g.title.toLowerCase().includes(q))
      && (!sys || g.system === sys) && (!status || g.status === status));
  }

  function render() {
    const list = shown();
    const bytes = list.reduce((a, g) => a + Number(g.size), 0);
    $('emu-sum').textContent = `${list.length} ${list.length === 1 ? 'game' : 'games'}, ${R.size(bytes)}`;
    $('emu-none').hidden = list.length > 0;
    const rows = $('emu-rows'), items = $('emu-items');
    rows.replaceChildren();
    items.replaceChildren();
    for (const g of list) {
      const tr = el('tr', 'emu-game');
      tr.tabIndex = 0;
      tr.append(el('td', '', g.title), el('td', '', R.systemName(g.system)), el('td', '', g.region ?? ''),
        el('td', '', g.formats.join(' + ').toUpperCase()), el('td', 'emu-size', R.size(g.size)));
      const td = el('td');
      td.append(tag(R.STATUS[g.status], true));
      tr.append(td);
      tr.addEventListener('click', () => openGame(g));
      tr.addEventListener('keydown', e => { if (e.key === 'Enter') openGame(g); });
      rows.append(tr);

      const li = el('li', 'rux--contained-list-item rux--contained-list-item--clickable');
      const b = el('button', 'rux--contained-list-item__content emu-row');
      b.type = 'button';
      const main = el('span', 'emu-row__main');
      main.append(el('span', '', g.title), el('span', 'emu-row__sub', `${R.systemName(g.system)} · ${R.size(g.size)}`));
      b.append(main, tag(R.STATUS[g.status], true));
      b.addEventListener('click', () => openGame(g));
      li.append(b);
      items.append(li);
    }
  }

  const openGame = g => R.gamePanel.open(g, { saves, onSaved: render });

  async function load() {
    try {
      const [rows, notes, savesRead] = await Promise.all([R.data.games(), R.data.notes(), R.data.saves()]);
      saves = savesRead;
      games = R.withNotes(rows, notes).map(g => ({ ...g, status: R.statusOf(g) }));
    } catch (error) {
      console.error(error);
      R.notice('Emu could not read the collection. Try again.');
      return;
    }
    $('emu-empty').hidden = games.length > 0;
    $('emu-list').hidden = games.length === 0;
    const systems = [...new Set(games.map(g => g.system))]
      .sort((a, b) => Object.keys(R.SYSTEMS).indexOf(a) - Object.keys(R.SYSTEMS).indexOf(b));
    for (const s of systems) $('emu-filter-system').append(option(s, R.systemName(s)));
    for (const [key, [label]] of Object.entries(R.STATUS)) {
      const n = games.filter(g => g.status === key).length;
      if (n) $('emu-filter-status').append(option(key, `${label} (${n})`));
    }
    // A link from Problems names its game as ?q=, which fills the search.
    const q = new URLSearchParams(location.search).get('q');
    if (q) $('emu-search').value = q;
    render();
    if (q) { const only = shown(); if (only.length === 1) openGame(only[0]); }
  }

  for (const id of ['emu-search', 'emu-filter-system', 'emu-filter-status']) {
    $(id).addEventListener(id === 'emu-search' ? 'input' : 'change', render);
  }
  load();
})();
