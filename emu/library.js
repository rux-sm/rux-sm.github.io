/* ==========================================================================
   library.js — the Library, Emu's front page
   --------------------------------------------------------------------------
   Every game the last scan found as box art, one shelf per system, with a
   search across them all. A game opens in the side panel, game-panel.js,
   with its cover and Play above what the scan read. Play asks Rux Emu
   Helper on this Mac, helper.js, and shows only on a Mac; when the helper
   is not running there, the panel offers to start it.
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

  const openGame = g => R.gamePanel.open(g, { saves, onSaved: render, top: [cover(g, 'emu-panel-art'), playArea(g)] });

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
