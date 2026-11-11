/* ==========================================================================
   search.js — Search, in every page's header
   --------------------------------------------------------------------------
   The header's one search finds any game in the collection by its title,
   from every page, in Design's modal that each page carries as
   #emu-search-modal. A game picked opens in the Library with its panel,
   ./?game=<system>/<title>#<system>, which library.js reads. The games are
   read the first time the window opens. ⌘K or Ctrl+K opens it too.
   ========================================================================== */
(() => {
  'use strict';

  const R = window.Emu;
  const $ = id => document.getElementById(id);
  const { el } = R;
  const open = $('emu-search-open');
  if (!R?.data) { open.hidden = true; return; }

  const MOST = 50;
  const input = $('emu-search-input');
  let games = null;
  let reading = false;

  const hrefOf = g => `./?game=${encodeURIComponent(`${g.system}/${g.title}`)}#${g.system}`;

  // Nothing is drawn until the games are read, so a search typed meanwhile is not said to find none.
  async function read() {
    if (games || reading) return;
    reading = true;
    try { games = (await R.data.games()).sort((a, b) => a.title.localeCompare(b.title)); }
    catch (error) {
      console.error(error);
      reading = false;
      $('emu-search-note').textContent = 'Emu could not read the collection. Try again.';
      $('emu-search-note').hidden = false;
      return;
    }
    render();
  }

  function render() {
    if (!games) return;
    const q = input.value.trim().toLowerCase();
    const list = $('emu-search-list');
    const note = $('emu-search-note');
    list.replaceChildren();
    if (!q) { list.hidden = true; note.hidden = true; return; }
    const found = games.filter(g => g.title.toLowerCase().includes(q));
    for (const g of found.slice(0, MOST)) {
      const li = el('li', 'rux--contained-list-item rux--contained-list-item--clickable');
      const a = el('a', 'rux--contained-list-item__content emu-row');
      a.href = hrefOf(g);
      const main = el('span', 'emu-row__main');
      main.append(el('span', '', g.title), el('span', 'emu-row__sub', R.systemName(g.system)));
      a.append(main);
      li.append(a);
      list.append(li);
    }
    list.hidden = !found.length;
    note.hidden = false;
    note.textContent = !found.length ? 'No games match.'
      : found.length > MOST ? `The first ${MOST} of ${found.length} games. Type more to narrow them.`
      : `${found.length} ${found.length === 1 ? 'game' : 'games'}`;
  }

  input.addEventListener('input', render);
  // Enter goes to the first game found.
  input.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const first = $('emu-search-list').querySelector('a');
    if (first) { e.preventDefault(); location.href = first.href; }
  });
  $('emu-search-modal').addEventListener('rux:modal-opened', () => { read(); input.select(); });
  document.addEventListener('keydown', e => {
    if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); window.Rux.modal.open('emu-search-modal', open); }
  });
})();
