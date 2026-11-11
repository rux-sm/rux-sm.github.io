/* ==========================================================================
   library.js — the Library, Emu's front page
   --------------------------------------------------------------------------
   Every game the last scan found as box art, one shelf per system, with a
   search across them all. A game opens in the side panel, game-panel.js,
   with its cover and Play above what the scan read. Play asks Rux Emu
   Helper on this Mac, helper.js, and shows only on a Mac; when the helper
   is not running there, the panel offers to start it. A controller,
   gamepad.js, or the arrow keys move between covers, a shelf up or down
   landing on the cover nearest above or below; A opens and plays, B closes.
   ========================================================================== */
(() => {
  'use strict';

  const R = window.Emu;
  const $ = id => document.getElementById(id);
  const { el } = R;
  if (!R?.data) { R?.notice('Emu needs a log-in to read the collection.'); return; }

  let games = [];
  let saves = [];
  let helper = null;

  // A cover: the first of the game's art that loads, else its name on the tile.
  function cover(g, cls) {
    const art = el('div', cls);
    const urls = R.artOf(g);
    const name = () => art.replaceChildren(el('span', 'emu-cover-title', g.title));
    if (!urls.length) { name(); return art; }
    const img = el('img');
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    let i = 0;
    img.addEventListener('error', () => { i += 1; if (i < urls.length) img.src = urls[i]; else name(); });
    img.src = urls[0];
    art.append(img);
    return art;
  }

  function render() {
    const q = $('emu-search').value.trim().toLowerCase();
    const list = games.filter(g => !q || g.title.toLowerCase().includes(q));
    $('emu-sum').textContent = `${list.length} ${list.length === 1 ? 'game' : 'games'}`;
    $('emu-none').hidden = list.length > 0;
    const shelves = $('emu-shelves');
    shelves.replaceChildren();
    for (const system of Object.keys(R.SYSTEMS)) {
      const here = list.filter(g => g.system === system);
      if (!here.length) continue;
      const section = el('section', 'rux--stack-vertical rux--stack-scale-3');
      const id = `emu-shelf-${system}`;
      section.setAttribute('aria-labelledby', id);
      const h2 = el('h2', 'rux--type-heading-03', `${R.systemName(system)} · ${here.length}`);
      h2.id = id;
      const shelf = el('ul', 'emu-shelf');
      shelf.setAttribute('role', 'list');
      for (const g of here) {
        const li = el('li');
        const b = el('button', 'emu-cover');
        b.type = 'button';
        b.append(cover(g, 'emu-cover-art'), el('span', 'emu-cover-name', g.title));
        b.addEventListener('click', () => openGame(g));
        li.append(b);
        shelf.append(li);
      }
      section.append(h2, shelf);
      shelves.append(section);
    }
  }

  // What Play can do here: play, or say why not and what to do.
  function playArea(g) {
    const area = el('div', 'rux--stack-vertical rux--stack-scale-3');
    const said = el('p', 'rux--type-body-01');
    said.setAttribute('role', 'status');
    const button = (text, onClick, cls = 'rux--btn rux--btn--primary') => {
      const b = el('button', cls, text);
      b.type = 'button';
      b.addEventListener('click', onClick);
      return b;
    };
    if (!R.helper.onMac) return area;
    if (!helper) {
      said.textContent = 'Rux Emu Helper is not running on this Mac.';
      area.append(said, button('Start Rux Emu Helper', async () => {
        R.helper.start();
        said.textContent = 'Starting…';
        for (let i = 0; i < 10 && !helper; i += 1) { await new Promise(r => setTimeout(r, 1000)); helper = await R.helper.status(); }
        if (helper) openGame(g); else said.textContent = 'It did not start. Install it from the drive: Install Rux Emu Helper.command.';
      }, 'rux--btn rux--btn--secondary'));
    } else if (!helper.collection) {
      said.textContent = 'Plug in the drive to play.';
      area.append(said);
    } else if (!helper.systems.includes(g.system)) {
      said.textContent = `This Mac has no emulator installed for ${R.systemName(g.system)}.`;
      area.append(said);
    } else {
      const play = button('Play', async () => {
        play.disabled = true;
        said.textContent = 'Starting…';
        try { await R.helper.play(g); said.textContent = 'Playing.'; }
        catch (error) { said.textContent = error.message; }
        play.disabled = false;
      });
      area.append(play, said);
    }
    return area;
  }

  // The cover a game was opened from, to come back to when its panel closes.
  let opener = null;
  const openGame = g => {
    if (document.activeElement?.classList.contains('emu-cover')) opener = document.activeElement;
    R.gamePanel.open(g, { saves, onSaved: render, top: [cover(g, 'emu-panel-art'), playArea(g)] });
    $('emu-panel-body').querySelector('.rux--btn')?.focus({ focusVisible: true });
  };

  // MOVING WITH A CONTROLLER OR THE ARROW KEYS. Scrolling into view is
  // instant: Carbon's motion has no answer for following a focus.
  // A cover is brought fully inside its shelf, and the shelf inside the window,
  // with room for the focus ring; the panel scrolls its own items into view.
  const show = node => {
    node.focus({ focusVisible: true, preventScroll: true });
    const shelf = node.closest('.emu-shelf');
    if (!shelf) { node.scrollIntoView({ block: 'nearest' }); return; }
    const n = node.getBoundingClientRect(), s = shelf.getBoundingClientRect(), room = 8;
    if (n.right > s.right - room) shelf.scrollLeft += n.right - s.right + room;
    else if (n.left < s.left + room) shelf.scrollLeft -= s.left - n.left + room;
    const top = node.closest('section').getBoundingClientRect();
    if (top.top < room) window.scrollBy(0, top.top - room);
    else if (n.bottom > innerHeight - room) window.scrollBy(0, n.bottom - innerHeight + room);
  };
  const panelOpen = () => !$('emu-panel').hidden;
  function move(way) {
    const here = document.activeElement;
    if (panelOpen()) {
      const items = [...$('emu-panel').querySelectorAll('button, input, textarea, a[href]')].filter(n => !n.disabled && n.offsetParent);
      const i = items.indexOf(here);
      const next = items[Math.min(items.length - 1, Math.max(0, i + (way === 'up' || way === 'left' ? -1 : 1)))];
      if (next) show(next);
      return;
    }
    const shelves = [...document.querySelectorAll('.emu-shelf')];
    if (!here?.classList.contains('emu-cover')) { const first = shelves[0]?.querySelector('.emu-cover'); if (first) show(first); return; }
    const shelf = here.closest('.emu-shelf');
    if (way === 'left' || way === 'right') {
      const li = here.closest('li')[way === 'left' ? 'previousElementSibling' : 'nextElementSibling'];
      if (li) show(li.querySelector('.emu-cover'));
      return;
    }
    const to = shelves[shelves.indexOf(shelf) + (way === 'up' ? -1 : 1)];
    if (!to) return;
    const x = here.getBoundingClientRect().left;
    const nearest = [...to.querySelectorAll('.emu-cover')]
      .reduce((best, b) => (Math.abs(b.getBoundingClientRect().left - x) < Math.abs(best.getBoundingClientRect().left - x) ? b : best));
    show(nearest);
  }
  function back() {
    if (!panelOpen()) return;
    R.gamePanel.close();
    if (opener) show(opener);
  }
  R.onPad(m => {
    if (m === 'a') { const here = document.activeElement; if (here && here !== document.body) here.click(); else move('down'); }
    else if (m === 'b') back();
    else move(m);
  });
  document.addEventListener('keydown', e => {
    const way = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[e.key];
    if (way && document.activeElement?.classList.contains('emu-cover')) { e.preventDefault(); move(way); }
  });

  async function load() {
    let rows, notes;
    try {
      [rows, notes, saves, helper] = await Promise.all([R.data.games(), R.data.notes(), R.data.saves(), R.helper.status()]);
    } catch (error) {
      console.error(error);
      R.notice('Emu could not read the collection. Try again.');
      return;
    }
    games = R.withNotes(rows, notes).map(g => ({ ...g, status: R.statusOf(g) }))
      .sort((a, b) => a.title.localeCompare(b.title));
    $('emu-empty').hidden = games.length > 0;
    $('emu-library').hidden = games.length === 0;
    render();
  }

  $('emu-search').addEventListener('input', render);
  // The helper may be started or quit while the page is open.
  window.addEventListener('focus', async () => { helper = await R.helper.status(); });
  load();
})();
