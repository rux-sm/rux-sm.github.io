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
   game-panel.js.

   A game is dragged with the pointer, where the helper answers. A word
   follows it and says what letting go will do, and the place it would land
   lights: onto Your Mac downloads it, onto its console or the TV plays it,
   downloading it first if it must, onto the Favourites shelf marks it, and
   back onto Rux's Collection takes it off this Mac or off Favourites. A
   console it does not fit says so in red and nothing happens. One line by
   Your Mac's name says what a move did. A game taken off this Mac leaves
   the shelf at once and its files go a few seconds later, so Undo is only
   putting it back. docs/plans/emu-room.md is what the room is still to do.
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
  // Whether the helper keeps a library on this Mac, to download to and remove from.
  let keeps = false;
  // The bytes this Mac has free for games, or null where no helper says.
  let free = null;
  // The console whose games show.
  let pick = null;

  const keyOf = g => `${g.system}/${g.title}`;
  const countOf = n => `${n} ${n === 1 ? 'game' : 'games'}`;
  const gamesOf = system => games.filter(g => g.system === system);
  // Whether this Mac has a system's emulator, where a helper answers.
  const plays = system => Boolean(helper?.systems?.includes(system));
  // A drive with the games plugged into this Mac, which a game plays from unheld.
  const drive = () => Boolean(helper?.collection) && (!keeps || !helper.collection.network);
  // The handhelds, which light their own screens; every other console plays on the TV.
  const HANDHELD = new Set(['gb', 'gbc', 'gba', 'nds', 'n3ds']);
  // Games taken off this Mac whose files go once Undo's time has passed, by key.
  const leaving = new Map();
  // Games to play as soon as they have arrived, by key.
  const wanted = new Set();
  // How a game stands on this Mac; one leaving it is away already.
  const standing = g => (leaving.has(keyOf(g)) ? { state: 'away', total: 0, done: 0 } : stands(g));

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
      if (standing(g).state !== 'held') { li.firstChild.classList.add('emu-cover--away'); li.firstChild.title = `${g.title}, not on this Mac`; }
      return li;
    }));
    const mine = games.map(g => [g, standing(g)]).filter(([, s]) => s.state === 'held' || s.state === 'arriving');
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
      if (standing(g).state === 'held') {
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
  // read every second, so its veil lifts.
  let again = 0;
  async function takeMac(mac) {
    helper = mac.helper;
    keeps = Boolean(helper?.library) && mac.library != null;
    stands = R.helper.standings(mac.library, mac.downloads);
    free = keeps ? (await R.helper.space().catch(() => null))?.free ?? null : null;
    clearTimeout(again);
    if (games.some(g => stands(g).state === 'arriving')) again = setTimeout(look, 1000);
  }
  const readMac = async () => takeMac(await R.thisMac.read());
  const told = () => JSON.stringify([helper, free, games.map(g => { const s = stands(g); return s.state === 'away' ? 0 : [s.state, s.done]; })]);
  const panelOpen = () => !$('emu-panel').hidden;
  async function look() {
    const before = told();
    await readMac();
    // Nothing is drawn again under a held game or an open panel.
    if (told() !== before && !panelOpen() && !drag?.on) render();
    // A game wanted for play starts once it is here, and is let go if it stopped.
    for (const key of [...wanted]) {
      const g = games.find(x => keyOf(x) === key);
      const state = g ? stands(g).state : 'away';
      if (state === 'arriving') continue;
      wanted.delete(key);
      if (state === 'held') play(g);
    }
  }

  // THE MOVES ----------------------------------------------------------------
  // One line by Your Mac's name says what a move did, and offers Undo where
  // it can be taken back; it clears itself.
  let saidFor = 0;
  function say(text = '', undo = null, ms = 4000) {
    clearTimeout(saidFor);
    $('emu-room-said').textContent = text;
    $('emu-room-undo').hidden = !undo;
    $('emu-room-undo').onclick = undo && (() => { say(); undo(); });
    if (text) saidFor = setTimeout(say, ms);
  }
  async function download(g, thenPlay = false) {
    const key = keyOf(g);
    // A game brought back while it was leaving only stays.
    if (leaving.has(key)) { clearTimeout(leaving.get(key).timer); leaving.delete(key); }
    if (stands(g).state !== 'held') {
      try { await R.helper.download(g); }
      catch (error) { say(error.message); return; }
    }
    if (thenPlay) wanted.add(key);
    await look();
    render();
  }
  async function play(g) {
    say('Starting…');
    try { await R.thisMac.play(g, say); }
    catch (error) { say(error.message); }
  }
  // Its cover leaves the shelf now and its files go when Undo's time has
  // passed, or as the page closes, so Undo downloads nothing.
  const UNDO = 6000;
  function takeOff(g) {
    const key = keyOf(g);
    wanted.delete(key);
    const go = async () => {
      leaving.delete(key);
      try { await R.helper.remove(g); }
      catch (error) { say(error.message); }
      await readMac();
      if (!panelOpen() && !drag?.on) render();
    };
    leaving.set(key, { timer: setTimeout(go, UNDO), go });
    render();
    say(`${nameOf(g)} is off this Mac. Its saves stay.`, () => { clearTimeout(leaving.get(key)?.timer); leaving.delete(key); render(); }, UNDO);
  }
  window.addEventListener('pagehide', () => { for (const { timer, go } of leaving.values()) { clearTimeout(timer); go(); } });
  async function favourite(g, on) {
    try { await R.data.saveNotes({ system: g.system, title: g.title, favourite: on }); }
    catch (error) { console.error(error); say('The favourite could not be saved. Try again.'); return; }
    g.notes = { ...g.notes, system: g.system, title: g.title, favourite: on };
    render();
  }

  // WHAT LETTING GO HERE WILL DO: the word shown while a game is held, the
  // place that lights, and the move itself, or null where nothing would
  // happen. One answer, so the word never disagrees with the drop. `home`
  // lights the game's own cover in Rux's Collection too.
  function intent(g, from, under) {
    if (!under) return null;
    const yes = (word, light, run, home = false) => ({ word, light, run, home });
    const no = (word, light) => ({ word, light, no: true });
    const s = standing(g);
    const unit = under.closest('.emu-unit')
      ?? (under.closest('.emu-tv') && !HANDHELD.has(g.system) ? $('emu-stand').querySelector(`[data-system="${g.system}"]`) : null);
    if (unit) {
      const system = unit.dataset.system;
      if (system !== g.system) return no(`Doesn't fit the ${R.systemName(system)}`, unit);
      if (!plays(system)) return no('Its emulator is not on this Mac', unit);
      if (s.state === 'arriving') return no('Still downloading', unit);
      if (s.state === 'held' || drive()) return yes('Play', unit, () => play(g));
      if (keeps) return yes('Download and play', unit, () => download(g, true));
      return no('Plug in the drive to play', unit);
    }
    if (under.closest('.emu-wall')) return g.notes?.favourite ? null : yes('Add to Favourites', $('emu-ledge'), () => favourite(g, true));
    if (under.closest('.emu-scene')) {
      return keeps && (s.state === 'away' || s.state === 'failed') ? yes('Download', under.closest('.emu-scene'), () => download(g)) : null;
    }
    if (under.closest('#emu-collection')) {
      if (from === 'ledge') return yes('Take off Favourites', $('emu-collection'), () => favourite(g, false), true);
      if (from === 'shelf') return yes('Take off this Mac', $('emu-collection'), () => takeOff(g), true);
    }
    return null;
  }

  // THE DRAG, with the pointer, where the helper answers. A press that does
  // not move is the cover's own click, which opens its game.
  let drag = null;
  const word = el('div', 'emu-word');
  word.hidden = true;
  document.body.append(word);
  const FROM = [['#emu-onmac', 'shelf'], ['#emu-ledge', 'ledge'], ['#emu-games', 'collection']];
  const unlight = () => {
    for (const cls of ['emu-lit', 'emu-no', 'emu-cover--home']) for (const n of document.querySelectorAll(`.${cls}`)) n.classList.remove(cls);
  };
  function drop() {
    word.hidden = true;
    unlight();
    for (const u of $('emu-stand').children) u.classList.remove('emu-unit--fit', 'emu-unit--dim');
  }
  // A cover's picture is not dragged away as a file.
  document.addEventListener('dragstart', e => { if (e.target.closest?.('.emu-cover')) e.preventDefault(); });
  document.addEventListener('pointerdown', e => {
    const src = e.target.closest?.('.emu-cover[data-game]');
    if (!src || e.button > 0 || !helper) return;
    const g = games.find(x => keyOf(x) === src.dataset.game);
    const from = FROM.find(([sel]) => src.closest(sel))?.[1];
    if (g && from) drag = { src, g, from, x: e.clientX, y: e.clientY, on: false, id: e.pointerId };
  });
  document.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.on) {
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
      drag.on = true;
      const r = drag.src.getBoundingClientRect();
      Object.assign(drag, { dx: drag.x - r.left, dy: drag.y - r.top, home: r });
      const ghost = el('div', 'emu-ghost');
      const copy = drag.src.cloneNode(true);
      copy.style.inlineSize = `${r.width}px`;
      ghost.append(copy);
      document.body.append(ghost);
      drag.ghost = ghost;
      drag.src.classList.add('emu-cover--held');
      // The consoles it fits light and the rest dim, so where it goes shows.
      for (const u of $('emu-stand').children) u.classList.add(u.dataset.system === drag.g.system ? 'emu-unit--fit' : 'emu-unit--dim');
      // Coming back from the room, the collection turns to its console and
      // its row to the game, so its own cover is there to light.
      if (drag.from !== 'collection') {
        if (pick !== drag.g.system) { pick = drag.g.system; showPick(); }
        const row = $('emu-games');
        const own = row.querySelector(`[data-game="${CSS.escape(keyOf(drag.g))}"]`);
        if (own) row.scrollLeft = own.offsetLeft - row.offsetLeft - (row.clientWidth - own.offsetWidth) / 2;
      }
    }
    drag.ghost.style.transform = `translate(${e.clientX - drag.dx}px, ${e.clientY - drag.dy}px) rotate(-3deg)`;
    const it = intent(drag.g, drag.from, document.elementFromPoint(e.clientX, e.clientY));
    unlight();
    word.hidden = !it;
    if (!it) return;
    word.textContent = it.word;
    word.classList.toggle('emu-word--no', Boolean(it.no));
    word.style.transform = `translate(${Math.min(e.clientX + 16, innerWidth - word.offsetWidth - 8)}px, ${e.clientY + 20}px)`;
    it.light.classList.add(it.no ? 'emu-no' : 'emu-lit');
    if (it.home) $('emu-games').querySelector(`[data-game="${CSS.escape(keyOf(drag.g))}"]`)?.classList.add('emu-cover--home');
  });
  // A drag that ended on its own cover would press it; that one click is swallowed.
  let dragged = false;
  document.addEventListener('click', e => { if (dragged) { dragged = false; e.stopPropagation(); e.preventDefault(); } }, true);
  document.addEventListener('pointerup', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (!d.on) return;
    drop();
    dragged = true;
    setTimeout(() => { dragged = false; });
    const it = intent(d.g, d.from, document.elementFromPoint(e.clientX, e.clientY));
    const done = () => { d.ghost.remove(); d.src.classList.remove('emu-cover--held'); if (it && !it.no) it.run(); };
    // A move that happens fades where it was dropped; any other flies back
    // to where it came from. Both are Carbon's productive motion.
    if (it && !it.no) { d.ghost.classList.add('emu-ghost--gone'); setTimeout(done, 110); return; }
    d.ghost.classList.add('emu-ghost--back');
    d.ghost.style.transform = `translate(${d.home.left}px, ${d.home.top}px)`;
    setTimeout(done, 240);
  });
  document.addEventListener('pointercancel', () => {
    if (!drag) return;
    drop();
    drag.ghost?.remove();
    drag.src.classList.remove('emu-cover--held');
    drag = null;
  });

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
