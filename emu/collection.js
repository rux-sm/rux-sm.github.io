/* ==========================================================================
   collection.js — the Collection page
   --------------------------------------------------------------------------
   Every game the last scan found, by system then title, with a filter per
   system and per status; the header's Search, search.js, finds one by title. A wide screen shows a table; a phone
   shows the same games as a list. A game opens in the side panel,
   game-panel.js.

   On a Mac whose Rux Emu Helper keeps a library, each game this Mac holds is
   marked, and one arriving says so. On this Mac, at #on-this-mac, lists only
   those, each with the room it takes and Remove, over how much they take
   together and how much this Mac has free. Remove takes a game's files and
   leaves its saves.
   ========================================================================== */
(() => {
  'use strict';

  const R = window.Emu;
  const $ = id => document.getElementById(id);
  const { el, tag, option } = R;
  if (!R?.data) { R?.notice('Emu needs a log-in to read the collection.'); return; }

  let games = [];
  let saves = [];
  // What the helper says of this Mac: whether it keeps a library, how each
  // game stands in it, and how many bytes are free.
  let keeps = false;
  let stands = () => ({ state: 'away', done: 0 });
  let free = null;
  // All the games, or only those on this Mac, which shows once a helper that keeps a library answers.
  let where = location.hash === '#on-this-mac' ? 'mac' : 'all';
  const onMac = () => keeps && where === 'mac';
  let again = null;

  const MARK = { held: ['On this Mac', 'rux--tag--gray'], arriving: ['Downloading', 'rux--tag--blue'] };
  const keyOf = g => `${g.system}/${g.title}`;
  // Each game that is here or arriving, by how it stands: what a look at this Mac is compared by.
  const told = () => JSON.stringify([keeps, games.map(g => [keyOf(g), stands(g).state]).filter(([, s]) => s !== 'away')]);

  async function readMac() {
    const mac = await R.thisMac.read();
    keeps = Boolean(mac.helper?.library) && mac.library != null;
    stands = R.helper.standings(mac.library, mac.downloads);
    free = keeps ? (await R.helper.space().catch(() => null))?.free ?? null : null;
    // While a game arrives this Mac is read again, so its row turns from Downloading to On this Mac.
    clearTimeout(again);
    if (games.some(g => stands(g).state === 'arriving')) again = setTimeout(look, 3000);
  }
  async function look() {
    const before = told();
    await readMac();
    if (told() !== before) render();
  }

  function shown() {
    const sys = $('emu-filter-system').value, status = $('emu-filter-status').value;
    return games.filter(g => (!sys || g.system === sys) && (!status || g.status === status) && (!onMac() || stands(g).done > 0));
  }

  // Remove, in a row of On this Mac: the game's files go, and one arriving stops.
  function removeButton(g) {
    const b = el('button', 'rux--btn rux--btn--sm rux--btn--danger--ghost', 'Remove');
    b.type = 'button';
    b.setAttribute('aria-label', `Remove ${g.title} from this Mac`);
    b.addEventListener('click', async e => {
      e.stopPropagation();
      b.disabled = true;
      try { await R.helper.remove(g); R.notice(); }
      catch (error) { R.notice(error.message); }
      await readMac();
      render();
    });
    return b;
  }

  function render() {
    const mac = onMac();
    $('emu-where-wrap').hidden = !keeps;
    $('emu-col-mac').hidden = !keeps;
    const pick = $('emu-where').querySelector(`[data-where="${mac ? 'mac' : 'all'}"]`);
    window.Rux.contentSwitcher.select($('emu-where'), pick, { focus: false, silent: true });

    const list = shown();
    const count = `${list.length} ${list.length === 1 ? 'game' : 'games'}`;
    const bytes = list.reduce((a, g) => a + (mac ? stands(g).done : Number(g.size)), 0);
    $('emu-sum').textContent = mac
      ? `${count} on this Mac, ${R.size(bytes)}.${free == null ? '' : ` ${R.size(free)} free.`}`
      : `${count}, ${R.size(bytes)}`;
    $('emu-none').hidden = list.length > 0;
    const filtered = $('emu-filter-system').value || $('emu-filter-status').value;
    $('emu-none').querySelector('p').textContent = mac && !filtered
      ? 'Nothing is on this Mac yet. Download a game from its panel.' : 'No games match.';
    const rows = $('emu-rows'), items = $('emu-items');
    rows.replaceChildren();
    items.replaceChildren();
    for (const g of list) {
      const s = stands(g);
      const mark = MARK[s.state];
      const tr = el('tr', 'emu-game');
      tr.tabIndex = 0;
      tr.append(el('td', '', g.title), el('td', '', R.systemName(g.system)), el('td', '', g.region ?? ''),
        el('td', '', g.formats.join(' + ').toUpperCase()), el('td', 'emu-size', R.size(mac ? s.done : g.size)));
      const td = el('td');
      td.append(tag(R.STATUS[g.status], true));
      tr.append(td);
      if (keeps) {
        const here = el('td');
        const cell = el('div', 'emu-actions');
        if (mark && !(mac && s.state === 'held')) cell.append(tag(mark, true));
        if (mac) cell.append(removeButton(g));
        here.append(cell);
        tr.append(here);
      }
      tr.addEventListener('click', () => openGame(g));
      tr.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target === tr) openGame(g); });
      rows.append(tr);

      const li = el('li', 'rux--contained-list-item rux--contained-list-item--clickable');
      const b = el('button', 'rux--contained-list-item__content emu-row');
      b.type = 'button';
      const main = el('span', 'emu-row__main');
      main.append(el('span', '', g.title),
        el('span', 'emu-row__sub', [R.systemName(g.system), R.size(mac ? s.done : g.size), keeps && mark ? mark[0] : ''].filter(Boolean).join(' · ')));
      b.append(main, tag(R.STATUS[g.status], true));
      b.addEventListener('click', () => openGame(g));
      li.append(b);
      items.append(li);
    }
  }

  // The panel downloads and removes too, so this Mac is read again after it does.
  const openGame = g => R.gamePanel.open(g, { saves, onSaved: render, mac: { onChanged: async () => { await readMac(); render(); } } });

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
    await readMac();
    $('emu-empty').hidden = games.length > 0;
    $('emu-list').hidden = games.length === 0;
    const systems = [...new Set(games.map(g => g.system))]
      .sort((a, b) => Object.keys(R.SYSTEMS).indexOf(a) - Object.keys(R.SYSTEMS).indexOf(b));
    for (const s of systems) $('emu-filter-system').append(option(s, R.systemName(s)));
    for (const [key, [label]] of Object.entries(R.STATUS)) {
      const n = games.filter(g => g.status === key).length;
      if (n) $('emu-filter-status').append(option(key, `${label} (${n})`));
    }
    render();
  }

  for (const id of ['emu-filter-system', 'emu-filter-status']) $(id).addEventListener('change', render);
  // The view is in the address, so the Library's link and Back both reach it.
  $('emu-where').addEventListener('rux:content-switcher-selected', e => {
    where = e.detail.option.dataset.where;
    history.replaceState(null, '', where === 'mac' ? '#on-this-mac' : location.pathname + location.search);
    render();
  });
  window.addEventListener('hashchange', () => { where = location.hash === '#on-this-mac' ? 'mac' : 'all'; render(); });
  // A download may end, or the helper start or quit, while the page is away.
  window.addEventListener('focus', () => { if (games.length) look(); });
  load();
})();
