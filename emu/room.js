/* ==========================================================================
   room.js — the Library as a room, on room.html
   --------------------------------------------------------------------------
   Your Mac is one scene, shown where Rux Emu Helper answers. The games this
   Mac holds stand on a board, one still arriving under a veil that lifts as
   it comes, and the favourites on a shelf above, one this Mac lacks dimmed.
   A TV and the console of each game this Mac holds stand on the same board
   over a power strip: plugged in where this Mac has its emulator, and
   unplugged and dimmed, with its game, where it has not. A line says the helper runs and where the games come from,
   and opens Status; beside it is how much room is free.

   Rux's Collection is a row of consoles, one for each system with games,
   each its drawing from brand/consoles.svg over its name and count. Pressing
   a console picks it, and its games show beneath as covers in one row, A to
   Z, one this Mac holds dimmed with a tick. A game opens in the side panel,
   game-panel.js. docs/plans/emu-room.md is what the room is still to do.
   ========================================================================== */
(() => {
  'use strict';

  const R = window.Emu;
  const $ = id => document.getElementById(id);
  const { el, nameOf, cover } = R;
  if (!R?.data) { R?.notice('Emu needs a log-in to read the collection.'); return; }

  let games = [];
  let saves = [];
  let emulators = null;
  let helper = null;
  // How a game stands on this Mac, from the helper's library and downloads.
  let stands = () => ({ state: 'away' });
  // The bytes this Mac has free for games, or null where no helper says.
  let free = null;
  // The console whose games show.
  let pick = null;

  const keyOf = g => `${g.system}/${g.title}`;
  const countOf = n => `${n} ${n === 1 ? 'game' : 'games'}`;
  const gamesOf = system => games.filter(g => g.system === system);
  // Whether this Mac has a system's emulator, where a helper answers.
  const plays = system => Boolean(helper?.systems?.includes(system));

  const SVG = 'http://www.w3.org/2000/svg';
  const svgOf = (cls, box) => {
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('class', cls);
    svg.setAttribute('viewBox', box);
    svg.setAttribute('aria-hidden', 'true');
    return svg;
  };
  const useOf = (svg, id) => { const use = document.createElementNS(SVG, 'use'); use.setAttribute('href', `#${id}`); svg.append(use); return svg; };
  // The consoles' sprite, put into the page once, because a drawing in
  // another file draws nothing in Safari.
  let sprite = null;
  const consoles = () => (sprite ??= fetch('brand/consoles.svg')
    .then(r => { if (!r.ok) throw new Error(`consoles.svg: ${r.status}`); return r.text(); })
    .then(text => {
      const svg = new DOMParser().parseFromString(text, 'image/svg+xml').documentElement;
      svg.style.display = 'none';
      document.body.append(document.importNode(svg, true));
    }));
  // A console's drawing, which app.css colours.
  const consoleOf = system => useOf(svgOf('emu-console', '0 0 96 64'), `emu-console-${system}`);

  // A game's cover as the button that opens it. `small` leaves its name off,
  // for the room, where its art names it.
  function coverItem(g, small) {
    const li = el('li');
    const b = el('button', 'emu-cover');
    b.type = 'button';
    b.dataset.game = keyOf(g);
    b.dataset.system = g.system;
    b.title = g.title;
    b.append(cover(g, 'emu-cover-art'));
    if (small) b.setAttribute('aria-label', `${nameOf(g)}, ${R.systemName(g.system)}`);
    else b.append(el('span', 'emu-cover-name', nameOf(g)));
    b.addEventListener('click', () => openGame(g));
    li.append(b);
    return li;
  }

  // YOUR MAC -----------------------------------------------------------------
  // A console over its socket. Plugged in, its plug sits in the strip and its
  // light is on; unplugged, the plug hangs loose beside the socket.
  function unit(system) {
    const on = plays(system);
    const li = el('li', on ? 'emu-unit' : 'emu-unit emu-unit--off');
    li.dataset.system = system;
    li.title = on ? `${R.systemName(system)}, plugged in` : `${R.systemName(system)}, unplugged: its emulator is not on this Mac`;
    const plug = svgOf('emu-plug', '0 0 44 42');
    plug.innerHTML = '<rect class="emu-plug__socket" x="15" y="4" width="14" height="6" rx="1"/>'
      + `<path class="emu-plug__cord" d="${on ? 'M22 27 C 22 38, 39 38, 39 14' : 'M19 35 C 24 43, 39 30, 39 14'}"/>`
      + '<g class="emu-plug__body"><rect class="emu-plug__prong" x="17" y="8" width="2.5" height="7"/><rect class="emu-plug__prong" x="24.5" y="8" width="2.5" height="7"/><rect x="14" y="14" width="16" height="13" rx="2"/></g>';
    const name = el('span', 'emu-unit__name');
    name.append(el('i', 'emu-led'), document.createTextNode(R.systemName(system)));
    const under = el('span', 'emu-unit__under');
    under.append(plug, name);
    li.append(consoleOf(system), under);
    return li;
  }

  function renderRoom() {
    $('emu-room').hidden = !helper;
    if (!helper) return;
    const from = helper.collection ? (helper.collection.network ? 'Server connected' : 'Drive plugged in') : 'No games found';
    $('emu-room-health').textContent = `Helper running · ${from}`;
    $('emu-room-space').textContent = free == null ? '' : `${R.size(free)} free`;
    $('emu-ledge').replaceChildren(...games.filter(g => g.notes?.favourite).map(g => {
      const li = coverItem(g, true);
      if (stands(g).state !== 'held') { li.firstChild.classList.add('emu-cover--away'); li.firstChild.title = `${g.title}, not on this Mac`; }
      return li;
    }));
    const mine = games.map(g => [g, stands(g)]).filter(([, s]) => s.state === 'held' || s.state === 'arriving');
    const here = Object.keys(R.SYSTEMS).filter(s => mine.some(([g]) => g.system === s));
    $('emu-stand').replaceChildren(...here.map(unit));
    $('emu-stand').classList.toggle('emu-stand--empty', !here.length);
    $('emu-onmac').replaceChildren(...mine.map(([g, s]) => {
      const li = coverItem(g, true);
      const b = li.firstChild;
      if (s.state === 'arriving') {
        const veil = el('span', 'emu-cover__veil');
        veil.style.blockSize = `${Math.round(100 - (s.total ? s.done / s.total : 0) * 100)}%`;
        b.append(veil);
      } else if (!plays(g.system)) {
        b.classList.add('emu-cover--away');
        b.title = `${g.title}. Needs the ${R.systemName(g.system)}.`;
      }
      return li;
    }));
    $('emu-onmac-h').textContent = `On this Mac · ${countOf(mine.filter(([, s]) => s.state === 'held').length)}`;
  }

  // RUX'S COLLECTION ---------------------------------------------------------
  // The picked console is pressed and named, with its count and how it
  // stands on this Mac, over its games.
  function showPick() {
    for (const b of $('emu-cabinet').children) b.setAttribute('aria-pressed', String(b.dataset.system === pick));
    const list = pick ? gamesOf(pick) : [];
    $('emu-picked').textContent = pick ? R.systemName(pick) : '';
    const emulator = pick && emulators?.systems?.[pick]?.emulator;
    const state = !pick ? '' : plays(pick) ? 'Ready on this Mac' : emulator ? `Plays in ${emulator}` : '';
    $('emu-picked-sub').textContent = [pick ? countOf(list.length) : '', state].filter(Boolean).join(' · ');
    $('emu-games').replaceChildren(...list.map(g => {
      const li = coverItem(g);
      if (stands(g).state === 'held') {
        li.firstChild.classList.add('emu-cover--here');
        li.firstChild.append(useOf(svgOf('emu-cover__tick', '0 0 32 32'), 'i-checkmark--filled'));
        li.firstChild.title = `${g.title}, on this Mac`;
      }
      return li;
    }));
    $('emu-games').scrollLeft = 0;
  }

  function renderCollection() {
    const systems = Object.keys(R.SYSTEMS).filter(s => gamesOf(s).length);
    if (!systems.includes(pick)) pick = systems[0] ?? null;
    $('emu-cabinet').replaceChildren(...systems.map(system => {
      const b = el('button', 'emu-cabinet__console');
      b.type = 'button';
      b.dataset.system = system;
      b.append(consoleOf(system), el('span', 'emu-cabinet__name', R.systemName(system)),
        el('span', 'emu-cabinet__count', countOf(gamesOf(system).length)));
      b.addEventListener('click', () => { pick = system; showPick(); });
      return b;
    }));
    showPick();
  }
  const render = () => { renderRoom(); renderCollection(); };

  // What the helper says of this Mac, read again; while a game arrives it is
  // read every three seconds, so its veil lifts.
  let again = 0;
  async function takeMac(mac) {
    helper = mac.helper;
    stands = R.helper.standings(mac.library, mac.downloads);
    free = helper?.library && mac.library != null ? (await R.helper.space().catch(() => null))?.free ?? null : null;
    clearTimeout(again);
    if (games.some(g => stands(g).state === 'arriving')) again = setTimeout(look, 3000);
  }
  const readMac = async () => takeMac(await R.thisMac.read());
  const told = () => JSON.stringify([helper, free, games.map(g => { const s = stands(g); return s.state === 'away' ? 0 : [s.state, s.done]; })]);
  const panelOpen = () => !$('emu-panel').hidden;
  async function look() {
    const before = told();
    await readMac();
    if (told() !== before && !panelOpen()) render();
  }

  // The cover a game was opened from, to come back to when its panel closes.
  let opener = null;
  const openGame = g => {
    opener = keyOf(g);
    R.gamePanel.open(g, { saves, onSaved: render, top: [cover(g, 'emu-panel-art')], mac: { focus: true, onChanged: readMac } });
  };
  // The panel's own close and Escape, heard first, so the page shows what the
  // game changed, such as being downloaded or made a favourite, and returns to its cover.
  function closeGame() {
    R.gamePanel.close();
    render();
    document.querySelector(`#emu-collection .emu-cover[data-game="${CSS.escape(opener ?? '')}"]`)?.focus();
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && panelOpen()) { e.stopImmediatePropagation(); closeGame(); } }, true);
  $('emu-panel-close').addEventListener('click', e => { e.stopImmediatePropagation(); closeGame(); }, true);

  async function load() {
    let rows, notes, mac;
    try {
      [rows, notes, saves, mac, emulators] = await Promise.all([R.data.games(), R.data.notes(), R.data.saves(),
        R.thisMac.read(), R.emulators(), consoles()]);
    } catch (error) {
      console.error(error);
      R.notice('Emu could not read the collection. Try again.');
      return;
    }
    // A game's status is what its panel shows of it.
    games = R.withNotes(rows, notes).map(g => ({ ...g, status: R.statusOf(g) }))
      .sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
    await takeMac(mac);
    $('emu-empty').hidden = games.length > 0;
    $('emu-collection').hidden = games.length === 0;
    render();
  }

  // The helper may be started or quit, an emulator installed or a download
  // ended, while the page is away: it is read again when the page is back.
  window.addEventListener('focus', () => { if (games.length) look(); });
  load();
})();
