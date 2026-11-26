/* ==========================================================================
   library.js — the Library, Emu's front page
   --------------------------------------------------------------------------
   Four tiles: every console with games down the side, each its drawing and
   name; beside them the chosen game, its screenshot, its name and facts, its
   save and a row of one button, the one next move, with More; the controller
   beside that; and under both the chosen console's games, a wall of covers
   under its wordmark. The wall's title row holds the strip, then
   Installed or All games and Sound. Installed shows only the games this Mac holds or is
   fetching, and only their consoles. Without Rux Emu Helper, such as on a
   phone, there is no strip, switch, chosen game or controller, and pressing a game opens its side panel,
   game-panel.js.

   One console and one game are chosen, always, and everything follows them.
   The page opens on the game last played that this Mac holds, on Installed,
   else on All games, and choosing a console chooses its last played game
   shown, else its first. Nothing about the page is kept.

   Which consoles are set up, and which games this Mac holds, are read from
   the helper. What this Mac lacks is faded, a console
   and a game alike. A console's menu, from a right click,
   has Set up or Remove, which the strip asks about first, naming every
   console that goes with its emulator.

   The strip, in the wall's title row, is the page's one place for words. At rest it
   says only what is wrong, each opening Status: a helper to update, little room
   left, no library or a late scan; while a move runs it names it, and after one it
   says what it did. Each move makes a small sound, made here with no sound
   files, which Sound, at the title row's end, turns off, remembered in this browser.

   Save says which card the game will play, from carry.js; its list is the
   game's cards and Start a new save where the console's cards can move.
   The controller tile says each controller connected, as Chrome's Gamepad
   API has it, and where its buttons are set.

   Play, the one way a game starts, drops its cartridge into its console or
   slides its disc onto a tray as it starts. A cover dragged onto its console
   plays too, and a word under the pointer says what letting go will do. A
   controller moves over the consoles and the covers, A to choose and then to
   play, B to close what is open.

   ?game=<system>/<title>, from Search, chooses that game; with &details,
   from Problems, its panel opens.
   docs/plans/emu-library.md is what the Library is still to do.
   ========================================================================== */
(() => {
  'use strict';

  const R = window.Emu;
  const $ = id => document.getElementById(id);
  const { el, nameOf, cover } = R;
  if (!R?.data) { $('emu-loading')?.remove(); R?.notice('Emu needs a log-in to read the collection.'); return; }

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
  // Which games show, 'mac' for Installed or 'all', and the console and the
  // game chosen.
  let where = 'all';
  let chosen = null;
  let game = null;
  // The last scan's row, for when the server last scanned, and the version
  // of Rux Emu Helper Supabase holds, the one a Mac should run.
  let driveRow = null;
  let newestHelper = null;
  // Consoles whose emulator is being set up now.
  const settingUp = new Set();
  // Consoles whose emulator is being taken off this Mac now, its saves and
  // settings kept first.
  const keeping = new Set();
  // Games whose Download waits on their console's setup, games to play as
  // soon as they have arrived, and the one being started, by key.
  const waiting = new Set();
  const wanted = new Set();
  let starting = null;
  // Whether a save is being moved, which holds Play until it is done.
  let moving = false;

  const keyOf = g => `${g.system}/${g.title}`;
  const gamesOf = system => games.filter(g => g.system === system);
  // Every console with games, in the collection's order.
  const consoles = () => Object.keys(R.SYSTEMS).filter(sys => gamesOf(sys).length);
  // Whether this Mac has a system's emulator, where a helper answers.
  const plays = system => Boolean(helper?.systems?.includes(system));
  const emulatorOf = system => emulators?.systems?.[system]?.emulator ?? null;
  // The consoles with games that one emulator plays.
  const playedBy = emulator => consoles().filter(sys => emulatorOf(sys) === emulator);
  // A console: set up, being set up, being removed, or away. Without the
  // helper which is not known, and none is marked.
  const stateOf = system => (!helper ? 'unknown' : settingUp.has(system) ? 'setting' : keeping.has(system) ? 'keeping' : plays(system) ? 'on' : 'away');
  const BUSY = { setting: system => `Setting up ${emulatorOf(system)}…`, keeping: system => `Removing ${emulatorOf(system)}…` };
  // Whether a game is on this Mac or on its way.
  const isHere = g => waiting.has(keyOf(g)) || ['held', 'arriving'].includes(stands(g).state);
  const playedAt = g => g.notes?.played_at ?? '';
  // A console's games as the wall lists them: those here first, then the
  // server's, favourites leading each, then A to Z, as `games` is sorted.
  const inOrder = system => gamesOf(system).filter(g => where === 'all' || isHere(g)).sort((a, b) => Number(isHere(b)) - Number(isHere(a))
    || Number(Boolean(b.notes?.favourite)) - Number(Boolean(a.notes?.favourite)));
  const lastPlayed = list => list.filter(playedAt).sort((a, b) => playedAt(b).localeCompare(playedAt(a)))[0] ?? null;
  const firstOf = system => lastPlayed(inOrder(system)) ?? inOrder(system)[0];
  // The consoles down the side: on Installed, only those with a game here.
  const shown = () => consoles().filter(sys => where === 'all' || gamesOf(sys).some(isHere));
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const list = words => (words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`);

  const SVG = 'http://www.w3.org/2000/svg';
  const svgOf = (cls, box) => {
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('class', cls);
    svg.setAttribute('viewBox', box);
    svg.setAttribute('aria-hidden', 'true');
    return svg;
  };
  const useOf = (svg, id) => { const use = document.createElementNS(SVG, 'use'); use.setAttribute('href', `#${id}`); svg.append(use); return svg; };
  // SOUND, made in the browser: a click to pick up, a thud to put down, a
  // thunk and a rising tone to set up, a chime when something is done, a
  // jingle to play and a buzz for no. Sound, at the title row's end, turns it off.
  const KEPT = 'emu-sound';
  let loud = true;
  try { loud = localStorage.getItem(KEPT) !== 'off'; } catch { /* a browser that keeps nothing starts with sound */ }
  let audio = null;
  function tone(freq, dur, type = 'sine', vol = 0.12, slide = 0) {
    if (!loud || !helper) return;
    try {
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      const o = audio.createOscillator();
      const gain = audio.createGain();
      const t = audio.currentTime;
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(gain).connect(audio.destination);
      o.start(t);
      o.stop(t + dur);
    } catch { /* a browser with no sound makes none */ }
  }
  const later = (ms, f) => setTimeout(f, ms);
  const sfx = {
    pick: () => tone(660, 0.05, 'triangle', 0.06),
    drop: () => tone(330, 0.08, 'triangle', 0.08),
    plug: () => { tone(90, 0.12, 'square', 0.1); later(140, () => tone(520, 0.15, 'sine', 0.08, 880)); },
    unplug: () => tone(400, 0.2, 'sine', 0.08, 120),
    insert: () => { tone(180, 0.04, 'square', 0.1); later(50, () => tone(240, 0.05, 'square', 0.08)); },
    start: () => [523, 659, 784].forEach((f, i) => later(i * 90, () => tone(f, 0.14, 'triangle', 0.07))),
    no: () => tone(110, 0.28, 'sawtooth', 0.07, 80),
    done: () => [784, 1047].forEach((f, i) => later(i * 80, () => tone(f, 0.12, 'sine', 0.06))),
  };

  $('emu-sound').addEventListener('click', () => {
    loud = !loud;
    try { localStorage.setItem(KEPT, loud ? 'on' : 'off'); } catch { /* it lasts until the page closes */ }
    renderSound();
    sfx.pick();
  });
  function renderSound() {
    $('emu-sound').setAttribute('aria-pressed', String(loud));
    $('emu-sound').querySelector('use').setAttribute('href', loud ? '#m-volume_up' : '#m-volume_off');
  }

  // A MENU ITEM, Design's: its label, whether it can be pressed, and, where
  // `checked` is given, a box ticked while it is on.
  function menuItem(menu, label, run, { off = false, danger = false, checked = null } = {}) {
    const li = el('li', `rux--menu-item${danger ? ' rux--menu-item--danger' : ''}${off ? ' rux--menu-item--disabled' : ''}`);
    li.setAttribute('role', checked === null ? 'menuitem' : 'menuitemcheckbox');
    if (checked !== null) li.setAttribute('aria-checked', String(checked));
    li.setAttribute('aria-haspopup', 'false');
    li.tabIndex = off ? -1 : 0;
    if (off) li.setAttribute('aria-disabled', 'true');
    const tick = el('div', 'rux--menu-item__selection-icon');
    if (checked) tick.append(iconOf('#i-checkmark'));
    li.append(tick, el('div', 'rux--menu-item__icon'), el('div', 'rux--menu-item__label', label));
    if (!off) li.addEventListener('click', () => { window.Rux.menu.close(menu); run(); });
    return li;
  }
  // An icon by its whole name, `#m-…`, so the sprite's scan finds it.
  const iconOf = href => {
    const svg = useOf(svgOf('', '0 0 32 32'), href.slice(1));
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.setAttribute('fill', 'currentColor');
    return svg;
  };
  // A console's drawing: its PNG in brand/consoles/, cropped to the
  // console, shown pixel for pixel in its own colours, the same in every
  // theme. app.css draws it at its own size in art pixels, --emu-w by
  // --emu-h, read once it has loaded.
  const drawnSize = new Map();
  function consoleOf(system) {
    const img = el('img', 'emu-console');
    const sized = ([w, h]) => { img.style.setProperty('--emu-w', w); img.style.setProperty('--emu-h', h); };
    if (drawnSize.has(system)) sized(drawnSize.get(system));
    img.addEventListener('load', () => { drawnSize.set(system, [img.naturalWidth, img.naturalHeight]); sized(drawnSize.get(system)); });
    img.src = `brand/consoles/${system}.png`;
    img.alt = '';
    img.draggable = false;
    return img;
  }

  // A REDRAW keeps the pictures already shown, so a list drawn again never
  // blinks them out while they load again: a cover takes the old cover's
  // loaded art, or its name where it has none, by its game; any other picture takes the old one showing its file.
  function redraw(parent, ...nodes) {
    const covers = new Map([...parent.querySelectorAll('.emu-cover[data-game]')].map(c => [c.dataset.game, c]));
    const shown = new Map();
    for (const img of parent.querySelectorAll('img')) if (!img.closest('.emu-cover-art') && !shown.has(img.src)) shown.set(img.src, img);
    for (const node of nodes) {
      if (!(node instanceof Element)) continue;
      for (const c of node.querySelectorAll('.emu-cover[data-game]')) {
        const was = covers.get(c.dataset.game);
        const old = was?.querySelector('.emu-cover-art > :is(img, .emu-cover-title)');
        if (!old || (old.matches('img') && !(old.complete && old.naturalWidth))) continue;
        covers.delete(c.dataset.game);
        c.querySelector('.emu-cover-art > :is(img, .emu-cover-title)')?.replaceWith(old);
      }
      for (const img of node.querySelectorAll('img')) {
        if (img.closest('.emu-cover-art')) continue;
        const was = shown.get(img.src);
        if (was) { shown.delete(img.src); img.replaceWith(was); }
      }
    }
    // The focus goes on to what stands in its place.
    const at = parent.contains(document.activeElement) ? document.activeElement.dataset : null;
    parent.replaceChildren(...nodes);
    if (!at) return;
    const key = at.game ? `[data-game="${CSS.escape(at.game)}"]` : at.console ? `[data-console="${at.console}"]` : null;
    if (key) parent.querySelector(key)?.focus({ preventScroll: true });
  }
  // THE STRIP AT REST says only what is wrong, as Carbon's icon indicators:
  // "Update the helper" where Supabase holds a newer one, how much room this
  // Mac has free once it is under LOW, a failure where a current helper keeps
  // no library, and "Needs sync" once the server's nightly scan is more than
  // STALE days old, one missed night's grace. Each opens Status. In a narrow
  // window only the worst shows.
  const LOW = 10e9;
  const STALE = 2;
  const INDICATOR = { warn: ['rux--icon-indicator--caution-minor', '#i-warning--alt--filled'], bad: ['rux--icon-indicator--caution-major', '#i-warning--alt-inverted--filled'] };
  function indicator(kind, text, cls = '', title = '') {
    const li = el('li', `rux--icon-indicator ${cls}`.trim());
    if (title) li.title = title;
    const [status, icon] = INDICATOR[kind];
    const svg = iconOf(icon);
    svg.setAttribute('class', status);
    const a = el('a', 'rux--link', text);
    a.href = 'status.html';
    li.append(svg, a);
    return li;
  }
  let stripSaid = '';
  function renderStrip() {
    const behind = newestHelper != null && Number(helper.version) < Number(newestHelper);
    const days = driveRow?.scanned_at ? (Date.now() - new Date(driveRow.scanned_at)) / 864e5 : null;
    const facts = [
      behind ? ['warn', 'Update the helper', `Rux Emu Helper ${helper.version}, ${newestHelper} is out`] : null,
      !helper.library && !behind ? ['bad', 'No library on this Mac'] : null,
      free != null && free < LOW ? ['warn', `${R.size(free)} free`] : null,
      days == null || days > STALE ? ['warn', 'Needs sync', days == null ? 'The server has never scanned' : `The server's scan is late: last scanned ${R.when(driveRow.scanned_at)}`] : null,
    ].filter(Boolean);
    // Drawn again only when what it says has changed.
    const said = JSON.stringify(facts);
    if (said === stripSaid) return;
    stripSaid = said;
    const worst = facts.find(f => f[0] === 'bad') ?? facts[0];
    $('emu-strip-facts').replaceChildren(...facts.map(([kind, text, title]) => indicator(kind, text, '', title)),
      ...(worst ? [indicator(worst[0], worst[1], 'emu-strip__sum', worst[2])] : []));
  }
  // THE CONSOLES down the side, each its drawing and its name, the chosen one
  // on Carbon's selected layer. One not set up is faded. The power light, on
  // the drawing, is lit while it is set up and flashes while it is set up or
  // removed.
  // Where each console's power light is on its drawing, in art pixels from
  // its top-left, how many pixels it covers, and its colour as the real
  // console's light: error is red, success green, warning orange, info blue.
  const LIGHT = {
    nes: [4, 21, 1, 1, 'error'], snes: [3, 19, 1, 1, 'error'], n64: [17, 21, 2, 1, 'error'], gc: [2, 3, 2, 2, 'warning'],
    wii: [1, 8, 2, 1, 'success'], wiiu: [28, 16, 1, 1, 'info'], switch: [9, 16, 1, 1, 'success'], gb: [2, 5, 1, 1, 'error'],
    gbc: [2, 5, 1, 1, 'error'], gba: [21, 2, 1, 1, 'success'], nds: [17, 4, 1, 1, 'success'], n3ds: [2, 13, 2, 2, 'info'],
    psx: [4, 14, 3, 1, 'success'], ps2: [32, 17, 1, 1, 'success'], xbox: [17, 18, 2, 2, 'success'],
  };
  const kitOf = system => $('emu-consoles').querySelector(`[data-console="${system}"]`);
  function spotOf(system) {
    const spot = el('span', 'emu-kit__spot');
    spot.append(consoleOf(system));
    const at = LIGHT[system];
    if (at && ['on', 'setting', 'keeping'].includes(stateOf(system))) {
      const light = el('i', `emu-light emu-light--${at[4]}`);
      light.style.cssText = `--emu-lx:${at[0]};--emu-ly:${at[1]};--emu-lw:${at[2]};--emu-lh:${at[3]}`;
      spot.append(light);
    }
    return spot;
  }
  function renderConsoles() {
    redraw($('emu-consoles'), ...shown().map(system => {
      const state = stateOf(system);
      const b = el('button', `emu-kit emu-kit--${state}${system === chosen ? ' emu-kit--chosen' : ''}`);
      b.type = 'button';
      b.dataset.console = system;
      b.setAttribute('aria-pressed', String(system === chosen));
      b.title = BUSY[state]?.(system) ?? R.systemName(system);
      if (state === 'away') b.setAttribute('aria-label', `${R.systemName(system)}, not set up`);
      const icon = el('span', 'emu-kit__icon');
      icon.append(spotOf(system));
      b.append(icon, el('span', 'emu-kit__name', R.systemName(system)));
      b.addEventListener('click', () => choose(system));
      b.addEventListener('contextmenu', e => { if (!helper) return; e.preventDefault(); choose(system); openMenu(kitOf(system)); });
      const li = el('li');
      li.append(b);
      return li;
    }));
  }

  // INSTALLED OR ALL GAMES. Installed is off while this Mac holds no game.
  // Where the chosen console has none to show, the first that has is chosen.
  function renderWhere() {
    const mine = $('emu-where').querySelector('[data-where="mac"]');
    mine.disabled = !games.some(isHere);
    if (mine.disabled) where = 'all';
    window.Rux.contentSwitcher.select($('emu-where'), $('emu-where').querySelector(`[data-where="${where}"]`), { focus: false, silent: true });
  }
  function keepShown() {
    if (shown().includes(chosen) && inOrder(chosen).includes(game)) return;
    chosen = shown().includes(chosen) ? chosen : shown()[0];
    game = firstOf(chosen);
  }
  $('emu-where').addEventListener('rux:content-switcher-selected', e => {
    where = e.detail.option.dataset.where;
    keepShown();
    renderConsoles();
    renderGames();
    showChosen();
    renderChosen();
  });

  // A CONSOLE'S MENU, Design's, from a right click on a console, which
  // chooses it: Set up or Remove, which the
  // strip then asks about, or what it is busy with. So no control is drawn on
  // a console.
  function openMenu(trigger) {
    const menu = $('emu-console-menu');
    if (window.Rux.menu.isOpen(menu)) { window.Rux.menu.close(menu); return; }
    const system = chosen;
    const state = stateOf(system);
    menu.setAttribute('aria-label', R.systemName(system));
    menu.replaceChildren(BUSY[state] ? menuItem(menu, BUSY[state](system), null, { off: true })
      : state === 'away' ? menuItem(menu, `Set up the ${R.systemName(system)}`, () => getConsole(system))
        : menuItem(menu, `Remove ${emulatorOf(system)} from this Mac`, () => askRemove(system), { danger: true }));
    window.Rux.menu.open(menu, trigger);
  }

  // THE WALL, the chosen console's games as covers, under the console's
  // wordmark, or its name.
  let marks = new Map();
  fetch('brand/marks.svg').then(r => (r.ok ? r.text() : '')).then(text => {
    marks = new Map([...new DOMParser().parseFromString(text, 'image/svg+xml').querySelectorAll('symbol')].map(s => [s.id, s]));
    if (chosen) renderGames();
  }).catch(error => console.error(error));
  // A console's wordmark, drawn in the text colour at one height, which a
  // symbol's `data-scale` grows where its letters sit small in its shape,
  // or null where it has none.
  function markOf(system) {
    const mark = marks.get(system);
    if (!mark) return null;
    const svg = svgOf('emu-mark', mark.getAttribute('viewBox'));
    svg.append(...[...mark.childNodes].map(n => document.importNode(n, true)));
    const scale = mark.getAttribute('data-scale');
    if (scale) svg.style.setProperty('--emu-mark-scale', scale);
    return svg;
  }
  function coverItem(g) {
    const li = el('li');
    const s = stands(g);
    const key = keyOf(g);
    const away = helper && !isHere(g);
    const b = el('button', `emu-cover${away ? ' emu-cover--away' : ''}`);
    b.type = 'button';
    b.dataset.game = key;
    b.dataset.system = g.system;
    b.title = nameOf(g);
    b.setAttribute('aria-label', `${nameOf(g)}${away ? ', on the server' : ''}`);
    if (helper) b.setAttribute('aria-pressed', String(g === game));
    const art = cover(g, 'emu-cover-art');
    if (waiting.has(key) || s.state === 'arriving') {
      const veil = el('span', 'emu-cover__veil');
      veil.style.blockSize = waiting.has(key) ? '100%' : veilOf(s);
      art.append(veil);
    }
    b.append(art);
    b.addEventListener('click', () => (helper ? pick(g) : openGame(g, b)));
    b.addEventListener('contextmenu', e => { if (!helper) return; e.preventDefault(); pick(g); openGameMenu(g, b); });
    li.append(b);
    return li;
  }
  const coverOf = g => $('emu-games').querySelector(`.emu-cover[data-game="${CSS.escape(keyOf(g))}"]`);
  let lastShown = null;
  function renderGames() {
    const mark = markOf(chosen);
    const h = $('emu-games-h');
    h.replaceChildren(mark ?? R.systemName(chosen));
    if (mark) h.setAttribute('aria-label', R.systemName(chosen)); else h.removeAttribute('aria-label');
    // How many games the console has, and where the helper answers, how many
    // of them this Mac holds.
    const count = n => `${n} ${n === 1 ? 'game' : 'games'}`;
    const all = gamesOf(chosen);
    $('emu-games-count').textContent = helper ? `${count(all.length)} · ${all.filter(isHere).length} installed` : count(all.length);
    const ul = $('emu-games');
    // Boxes much wider than they are tall go fewer across.
    ul.classList.toggle('emu-games__list--wide', R.BOX[chosen] > 1.2);
    redraw(ul, ...inOrder(chosen).map(coverItem));
    if (lastShown !== chosen) {
      ul.parentElement.scrollTop = 0;
      if (lastShown && !calm()) ul.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 110, easing: 'cubic-bezier(0, 0, 0.38, 0.9)' });
      lastShown = chosen;
    }
  }

  // How far a game arriving has come: how much of its cover its veil still
  // hides, and the words on its button.
  const veilOf = s => `${Math.round(100 - (s.total ? s.done / s.total : 0) * 100)}%`;
  const comingOf = s => (s.total ? `Downloading ${Math.round(s.done / s.total * 100)}%` : 'Downloading…');
  // Only that, and the room this Mac has free, follow while a game arrives:
  // its veil and its button change in place, and nothing else is drawn again.
  function showComing() {
    renderStrip();
    for (const g of gamesOf(chosen)) {
      const s = stands(g);
      if (s.state !== 'arriving') continue;
      const veil = coverOf(g)?.querySelector('.emu-cover__veil');
      if (veil) veil.style.blockSize = veilOf(s);
    }
    renderGo();
  }

  // CHOOSING. A console chosen chooses its last played game, else its first,
  // or the one it is chosen with.
  function choose(system, g = null) {
    if (system === chosen && !g) return;
    const other = system !== chosen;
    chosen = system;
    game = g ?? firstOf(system);
    if (other) for (const b of $('emu-consoles').querySelectorAll('[data-console]')) {
      b.classList.toggle('emu-kit--chosen', b.dataset.console === system);
      b.setAttribute('aria-pressed', String(b.dataset.console === system));
    }
    renderGames();
    showChosen();
    renderChosen();
  }
  // The chosen console in the list's view, and, where the wall scrolls
  // alone, the chosen game in the wall's.
  function showChosen() {
    kitOf(chosen)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (helper) coverOf(game)?.scrollIntoView({ block: 'nearest' });
  }
  function pick(g) {
    game = g;
    for (const b of $('emu-games').querySelectorAll('.emu-cover')) b.setAttribute('aria-pressed', String(b.dataset.game === keyOf(g)));
    renderChosen();
  }

  // THE CHOSEN GAME, over the wall: its screenshot, faded where this Mac lacks
  // it, fetched again only when the game changes, in its console's screen
  // shape; its name
  // over its facts, then when it was last played, its region and size; its
  // save; and the one next move, with More.
  const playedOf = g => {
    if (!playedAt(g)) return 'Not played yet';
    const day = d => new Date(d).toDateString();
    return day(playedAt(g)) === day(Date.now()) ? 'Played today' : `Played ${R.date(playedAt(g))}`;
  };
  let artFor = null;
  // Each game's facts and description by its key, as the scan looked them up,
  // read once after the page shows.
  let info = new Map();
  function renderChosen() {
    if (!helper || !game) return;
    const art = $('emu-chosen-art');
    if (artFor !== game) {
      artFor = game;
      art.style.setProperty('--emu-shot', R.SCREEN[game.system] ?? 4 / 3);
      art.replaceChildren(R.shot(game));
    }
    art.classList.toggle('emu-chosen__art--away', !isHere(game));
    // One line, so the whole name rests under the pointer.
    $('emu-chosen-name').textContent = $('emu-chosen-name').title = nameOf(game);
    const lead = stateOf(game.system) === 'away' && !isHere(game) ? `Download sets up the ${R.systemName(game.system)} too`
      : stands(game).state === 'failed' ? stands(game).error : playedOf(game);
    $('emu-chosen-sub').textContent = [lead, game.region, R.size(game.size)].filter(Boolean).join(' · ');
    const { facts, description } = info.get(keyOf(game)) ?? {};
    // The console is not said: its wordmark heads the wall.
    $('emu-chosen-facts').textContent = [facts?.genre, facts?.year, facts?.developer ?? facts?.publisher,
      facts?.players && `${facts.players} ${facts.players === 1 ? 'player' : 'players'}`].filter(Boolean).join(' · ');
    $('emu-chosen-facts').hidden = !$('emu-chosen-facts').textContent;
    $('emu-chosen-about').textContent = description ?? '';
    $('emu-chosen-about').title = description ?? '';
    $('emu-chosen-about').hidden = !description;
    renderSave();
    renderPad();
    renderGo();
  }
  // The one next move, its words and what it does, or null where it waits.
  function nextOf(g) {
    const s = stands(g);
    const state = stateOf(g.system);
    if (starting === keyOf(g)) return ['Starting…'];
    if (s.state === 'arriving') return [comingOf(s)];
    if (waiting.has(keyOf(g))) return [`Setting up ${emulatorOf(g.system)}…`];
    if (s.state === 'held') return state === 'on' ? ['Play', () => play(g)]
      : state === 'away' ? [`Set up the ${R.systemName(g.system)}`, () => getConsole(g.system)] : [BUSY[state](g.system)];
    if (!keeps) return ['Update the helper', () => { location.href = 'status.html'; }];
    if (state === 'keeping') return [BUSY[state](g.system)];
    return [s.state === 'failed' ? 'Try again' : s.done ? 'Resume download' : `Download ${R.size(g.size)}`, () => getGame(g)];
  }
  function renderGo() {
    const [words, run] = nextOf(game);
    const b = $('emu-chosen-go');
    b.textContent = words;
    b.disabled = !run || moving;
  }
  $('emu-chosen-go').addEventListener('click', () => { const [, run] = nextOf(game); run?.(); });
  // RUX'S MARKS on a game, saved as each changes, the rest of its notes left
  // as they are. Played is the date Play keeps, so it is not asked.
  async function keepNotes(g, change) {
    const n = g.notes ?? {};
    const row = { system: g.system, title: g.title, note: n.note ?? null, played: Boolean(n.played), finished: Boolean(n.finished),
      favourite: Boolean(n.favourite), plays: Boolean(n.plays), ...change };
    try {
      await R.data.saveNotes(row);
    } catch (error) {
      console.error(error);
      sayNo('That did not save. Try again.');
      return false;
    }
    g.notes = { ...n, ...row };
    g.status = R.statusOf(g);
    return true;
  }
  // A favourite leads its console's wall, so the wall is drawn again.
  async function mark(g, key) {
    if (!await keepNotes(g, { [key]: !g.notes?.[key] })) return;
    if (key === 'favourite') renderGames();
    if (g === game) renderChosen();
  }

  // A GAME'S MENU, from a right-click on its cover or More beside Play:
  // Favourite and Finished, ticked while on; About this copy, which opens the
  // panel on what the scan read of the game; and, where any of it is here,
  // Remove from this Mac, which takes it off.
  function openGameMenu(g, trigger) {
    const menu = $('emu-game-menu');
    if (window.Rux.menu.isOpen(menu)) { window.Rux.menu.close(menu); return; }
    const n = g.notes ?? {};
    const s = stands(g);
    menu.setAttribute('aria-label', nameOf(g));
    menu.replaceChildren(
      menuItem(menu, 'Favourite', () => mark(g, 'favourite'), { checked: Boolean(n.favourite) }),
      menuItem(menu, 'Finished', () => mark(g, 'finished'), { checked: Boolean(n.finished) }),
      menuItem(menu, 'About this copy', () => openGame(g, trigger, { about: true })));
    if (keeps && s.state !== 'arriving' && (s.state === 'held' || s.done)) {
      const line = el('li', 'rux--menu-item-divider');
      line.setAttribute('role', 'separator');
      menu.append(line, menuItem(menu, 'Remove from this Mac', () => removeGame(g), { off: moving, danger: true }));
    }
    window.Rux.menu.open(menu, trigger);
  }
  $('emu-chosen-more').addEventListener('click', e => openGameMenu(game, e.currentTarget));
  async function removeGame(g) {
    try { await R.helper.remove(g); } catch (error) { sayNo(error.message); return; }
    say(`${nameOf(g)} is off this Mac. Its saves are kept.`);
    await look();
    render();
  }

  // SAVE is a button of three lines, what it is, what will be used and a
  // note, over a list that opens down from it.
  function pickOf(id, fill) {
    const button = $(id);
    const pop = $(`${id}-list`);
    let held = null;
    const close = ({ restoreFocus = false } = {}) => {
      held?.release();
      held = null;
      pop.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      if (restoreFocus) button.focus({ preventScroll: true });
    };
    const open = () => {
      fill(pop, close);
      pop.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      held = window.Rux.overlay.register({ element: pop, anchor: button, close });
      window.Rux.overlay.focusables(pop)[0]?.focus({ preventScroll: true });
    };
    button.addEventListener('click', () => (held ? close({ restoreFocus: true }) : open()));
    return {
      close,
      refill: () => { if (held) fill(pop, close); },
      // The value in the field with its note beside it, or, where the note
      // warns, the note on its own line under the field, as Carbon puts a
      // field's warning.
      write: ({ value, note = '', warn = false, off = false, hidden = false }) => {
        const box = button.closest('.emu-pick');
        box.hidden = hidden;
        button.querySelector('.emu-pick__value').textContent = value ?? '';
        button.querySelector('.emu-pick__note').textContent = warn ? '' : note;
        const line = box.querySelector('.emu-pick__warn');
        line.textContent = warn ? note : '';
        line.hidden = !warn;
        button.disabled = off;
        if (off || hidden) close();
      },
    };
  }
  // A list in one: Design's contained list under its heading.
  function popList(title, ...items) {
    const box = el('div', 'rux--contained-list rux--contained-list--inset-rulers rux--contained-list--on-page rux--layout--size-md');
    const head = el('div', 'rux--contained-list__header');
    head.append(el('h3', 'rux--contained-list__label', title));
    const ul = el('ul');
    ul.setAttribute('role', 'list');
    ul.append(...items);
    box.append(head, ul);
    return box;
  }
  // A row: its name over a note, pressed where `run` is given, the one in use
  // with a tick, and a control of its own at its end.
  function popRow(name, note, { run = null, on = false, end = null } = {}) {
    const li = el('li', `rux--contained-list-item${run ? ' rux--contained-list-item--clickable' : ''}${end ? ' rux--contained-list-item--with-action' : ''}`);
    const content = el(run ? 'button' : 'div', 'rux--contained-list-item__content emu-row');
    if (run) { content.type = 'button'; content.addEventListener('click', run); }
    const main = el('span', 'emu-row__main');
    main.append(typeof name === 'string' ? el('span', '', name) : name);
    if (note) main.append(el('span', 'emu-row__sub', note));
    content.append(main);
    if (on) { const tick = iconOf('#i-checkmark'); tick.setAttribute('class', 'emu-state'); content.append(tick); content.setAttribute('aria-current', 'true'); }
    li.append(content);
    if (end) { const slot = el('div', 'rux--contained-list-item__action'); slot.append(end); li.append(slot); }
    return li;
  }

  // SAVE. The chosen console's cards are read from carry.js and kept half a
  // minute, so going from game to game asks once.
  let cards = { system: null, at: 0, read: null, error: false };
  let reading = 0;
  // The copy set aside where two of the chosen game's saves were found.
  let aside = null;
  const states = n => (n ? `${n} save ${n === 1 ? 'state' : 'states'}` : '');
  const cardNote = c => [R.date(c.saved), states(c.states)].filter(Boolean).join(' · ');
  const wordOf = system => emulators?.systems?.[system]?.saveWord ?? 'Save';
  const mineOf = g => (cards.system === g.system ? cards.read?.games.get(g.title) : null) ?? { in: null, out: [] };
  // Where a console's cards cannot move, its files may not say which game
  // each is, so one not found is never called new: it is what the scan knows
  // of the game's save, or kept in its emulator.
  const unsaid = g => {
    const last = saves.filter(s => s.system === g.system && s.game === g.title).map(s => s.saved_at ?? '').sort().at(-1);
    return last ? R.date(last) : `Kept in ${emulatorOf(g.system)}`;
  };
  const savePick = pickOf('emu-chosen-save', fillSave);
  function writeSave() {
    const g = game;
    if (stateOf(g.system) === 'away' || stateOf(g.system) === 'setting') { savePick.write({ hidden: true }); return; }
    if (cards.system !== g.system) { savePick.write({ value: 'Reading…', off: true }); return; }
    if (cards.error) { savePick.write({ value: 'Could not be read', off: true }); return; }
    if (!cards.read) { savePick.write({ value: 'On this Mac', note: 'Not kept in Supabase', off: true }); return; }
    const mine = mineOf(g);
    const two = aside?.key === keyOf(g) && aside.other.length > 0;
    if (!mine.in && !cards.read.moves) { savePick.write({ value: unsaid(g), off: true }); return; }
    // A card with no name of its own is said by when it was saved, since the
    // field's label already says Save.
    const [value, note] = !mine.in ? ['New save', mine.out.length ? `${mine.out.length} put away` : 'Starts when you play']
      : mine.in.name ? [mine.in.name, cardNote(mine.in)] : [R.date(mine.in.saved) || wordOf(g.system), states(mine.in.states)];
    savePick.write({ value, note: two ? 'Two saves found' : note, warn: two,
      // A list opens only where there is something to choose or change.
      off: moving || !(two || (cards.read.moves && mine.in) || mine.out.length) });
  }
  async function renderSave(fresh = false) {
    writeSave();
    const g = game;
    if (!helper || !plays(g.system)) return;
    const turn = ++reading;
    if (fresh || cards.system !== g.system || Date.now() - cards.at > 30000) {
      let read = null, error = false;
      try { read = await R.carry?.cardsFor(g.system, games) ?? null; } catch (e) { console.error(e); error = true; }
      if (turn !== reading) return;
      cards = { system: g.system, at: Date.now(), read, error };
      writeSave();
    }
    if (cards.read && mineOf(g).in) {
      const st = await R.carry.standing(g).catch(e => { console.error(e); return null; });
      if (turn !== reading) return;
      aside = { key: keyOf(g), emulator: st?.emulator, other: st?.other ?? [] };
      writeSave();
    }
    savePick.refill();
  }
  // A move on a card: said as it goes, Play held until it is done.
  async function moveCard(doing, done, run) {
    savePick.close({ restoreFocus: true });
    moving = true;
    renderChosen();
    say(doing, { ms: LONG });
    try { await run(); sfx.done(); say(done); } catch (error) { console.error(error); sfx.no(); sayNo(error.message); }
    moving = false;
    cards.at = 0;
    renderChosen();
  }
  function fillSave(pop, close) {
    const g = game;
    const { read } = cards;
    const mine = mineOf(g);
    const can = read.moves && !read.running;
    // A card's name changed in a field in its row's place.
    const renames = card => {
      const b = el('button', 'rux--btn rux--btn--ghost rux--btn--icon-only rux--btn--sm rux--layout--size-sm');
      b.type = 'button';
      b.title = 'Rename';
      b.setAttribute('aria-label', `Rename ${card.name ?? wordOf(g.system)}`);
      b.append(iconOf('#i-edit'));
      b.addEventListener('click', () => {
        const field = el('input', 'rux--text-input');
        field.type = 'text';
        field.maxLength = 60;
        field.value = card.name ?? '';
        field.setAttribute('aria-label', 'Name of this save');
        const li = b.closest('li');
        const was = [...li.childNodes];
        let over = false;
        const end = keep => {
          if (over) return;
          over = true;
          const name = field.value.trim();
          if (keep && name && name !== card.name) moveCard('Naming the save…', `Named ${name}.`, () => R.carry.rename(g, card.id, name));
          else li.replaceChildren(...was);
        };
        field.addEventListener('keydown', e => { if (e.key === 'Enter') end(true); else if (e.key === 'Escape') { e.stopPropagation(); end(false); } });
        field.addEventListener('blur', () => end(false));
        li.replaceChildren(field);
        field.focus();
        field.select();
      });
      return b;
    };
    const rows = [];
    if (mine.in) rows.push(popRow(mine.in.name ?? wordOf(g.system), cardNote(mine.in), { on: true, end: read.moves ? renames(mine.in) : null }));
    for (const c of mine.out) {
      rows.push(popRow(c.name, cardNote(c), { end: renames(c),
        run: can ? () => moveCard('Putting the save in…', `${nameOf(g)} will play ${c.name}.`, () => R.carry.putIn(g, games, c.id)) : null }));
    }
    if (!mine.in) rows.unshift(read.moves ? popRow('New save', 'Starts when you play', { on: true }) : popRow(wordOf(g.system), unsaid(g), { on: true }));
    else if (can) rows.push(popRow('Start a new save', 'The one there is put away, not lost', { run: () => moveCard('Putting the save away…', `${nameOf(g)} starts a new save when you play.`, () => R.carry.takeOut(g, games)) }));
    if (aside?.key === keyOf(g) && aside.other.length && !read.running) {
      rows.push(popRow('Use the other save', 'Two were found. The one saved last plays.', { run: () => moveCard('Bringing the other save…', 'The other save will play.',
        async () => { for (const path of aside.other) await R.carry.useOther(aside.emulator, path); }) }));
    }
    const notes = [];
    if (read.running) notes.push(el('p', 'emu-pop__note', `${read.emulator} is open. Quit it to change saves.`));
    const own = saves.filter(s => s.system === g.system && !s.game);
    if (own.length) {
      const p = el('p', 'emu-pop__note');
      const a = el('a', 'rux--link', `The ${R.systemName(g.system)}'s own saves`);
      a.href = `saves.html?save=${encodeURIComponent(`${own[0].system}/${own[0].name}`)}`;
      p.append(a);
      notes.push(p);
    }
    pop.replaceChildren(popList('Save to play', ...rows), ...notes);
  }

  // THE CONTROLLER TILE: each controller this Mac sees through Chrome's
  // Gamepad API, by the name rux gave it or its maker's name, and whether the
  // chosen console's emulator has its player 1 set for it, read through
  // pads.js; or none, with how to make one show, because Chrome shows one to
  // a page only once a button on it is pressed. A controller's row opens its
  // map: each physical button and what it does on that console.
  let padInfo = null;
  const padInfoNow = () => (padInfo ??= (R.data?.controllers() ?? Promise.resolve([]))
    .then(rows => new Map(rows.map(r => [r.id, { name: r.name, details: r.details ?? {} }]))).catch(() => new Map()));
  // The connected controllers as Chrome has them, and as matched to Rux Emu
  // Helper's report, asked again when one connects or goes.
  const padsNow = () => [...(navigator.getGamepads?.() ?? [])].filter(Boolean).map(R.pads.of);
  let padReport = null;
  const padsKnown = async () => R.pads.identify(padsNow(), await (padReport ??= (R.helper?.controllers?.() ?? Promise.resolve(null)).catch(() => null)));
  // The chosen console's emulator, read once for each controller family and
  // kept until the console, a controller or the window's focus changes.
  let padReading = null;
  const readPads = (system, pads) => (padReading?.system === system ? padReading
    : (padReading = { system, read: Promise.all([...new Set(pads.map(p => p.family))].map(async family => [family, await R.pads.read(system, R.helper, family)])).then(Object.fromEntries) })).read;
  function indicator(kind, text) {
    const line = el('span', 'rux--icon-indicator');
    const ICONS = { ok: ['#i-checkmark--filled', 'rux--icon-indicator--succeeded'], warn: ['#i-warning--alt--filled', 'rux--icon-indicator--caution-minor'],
      info: ['#i-information--filled', 'rux--icon-indicator--informative'] };
    const icon = iconOf(ICONS[kind][0]);
    icon.setAttribute('class', ICONS[kind][1]);
    line.append(icon, text);
    return line;
  }
  function padRow(name, sub, open) {
    const li = el('li', 'emu-pad__row');
    const icon = iconOf('#i-game--console');
    icon.setAttribute('width', '24');
    icon.setAttribute('height', '24');
    icon.setAttribute('class', 'emu-pad__icon');
    const main = el('span', 'emu-row__main');
    main.append(el('span', 'emu-pad__name', name), sub);
    if (open) {
      const button = el('button', 'emu-pad__open');
      button.type = 'button';
      button.append(icon, main);
      button.addEventListener('click', open);
      li.append(button);
    } else li.append(icon, main);
    return li;
  }
  // Which player a controller is on the chosen console, at its place among
  // the connected controllers, and what to say: [kind, words, player].
  function padState(read, pad, consoleName, place) {
    if (!read) return null;
    const one = R.pads.playerOf(read, pad, place);
    const problem = read.problem ?? one?.problem;
    if (problem) return ['warn', problem, one];
    if (one && Object.keys(one.map).length) return ['ok', `Player ${one.player} · Set up for ${consoleName}`, one];
    return [read.most === 1 && read.players[0]?.bound ? 'info' : 'warn', read.most === 1 && read.players[0]?.bound ? `${consoleName} has one player` : `Not set up for ${consoleName}`, null];
  }
  async function renderPad() {
    if (!helper) return;
    const pads = await padsKnown();
    const list = $('emu-pad-list');
    list.classList.toggle('emu-pad__list--none', !pads.length);
    if (!pads.length) {
      list.replaceChildren(padRow('No controller', el('span', 'emu-row__sub', 'Press a button on one to show it here.')));
      return;
    }
    const system = game?.system ?? chosen;
    const consoleName = system ? R.systemName(system) : null;
    const [info, reads] = await Promise.all([padInfoNow(), system ? readPads(system, pads) : {}]);
    list.replaceChildren(...pads.map(pad => {
      const place = pad.place;
      const name = info.get(pad.id)?.name ?? pad.name;
      const state = system && padState(reads[pad.family], pad, consoleName, place);
      const sub = state ? indicator(state[0], state[1]) : indicator('ok', 'Connected');
      return padRow(name, sub, system && reads[pad.family] ? () => openPadMap(pad, system, reads[pad.family], place) : null);
    }));
  }
  for (const type of ['gamepadconnected', 'gamepaddisconnected']) window.addEventListener(type, () => { padReading = null; padReport = null; renderPad(); });
  // Buttons are changed in the emulator, so they are read again on coming back.
  window.addEventListener('focus', () => { padReading = null; renderPad(); });
  // A controller's map in its modal: its front, and for a model with back
  // buttons its back, each learnt by pressing it; and its name and model to
  // change, kept with the account.
  // The last Set up's files as they were, for Undo while the map is open.
  let padUndo = null;
  document.getElementById('emu-padmap-modal')?.addEventListener('rux:modal-closed', () => { padUndo = null; });
  async function openPadMap(pad, system, read, place) {
    const consoleName = R.systemName(system);
    const known = (await padInfoNow()).get(pad.id);
    const mine = { name: known?.name ?? pad.name, details: { ...(known?.details ?? {}) } };
    const state = padState(read, pad, consoleName, place);
    const one = state[2];
    const map = state[0] === 'ok' ? one.map : {};
    const select = $('emu-padmap-model');
    select.replaceChildren(el('option', null, 'Standard'), ...Object.entries(R.pads.MODELS)
      .filter(([, m]) => m.family === pad.family).map(([key, m]) => Object.assign(el('option', null, m.name), { value: key })));
    select.firstChild.value = '';
    select.value = mine.details.model ?? '';
    const said = () => [state[0] === 'ok' ? `Player ${one.player}, as set in ${read.emulator}.` : `${state[1]}.${read.problem || one?.problem ? '' : ` Its buttons are set in ${read.emulator}.`}`,
      one?.motion ? 'Tilt is on.' : ''].filter(Boolean).join(' ');
    const save = async () => {
      if (!pad.id || !R.data) return false;
      try { await R.data.setController(pad.id, mine.name, mine.details); } catch (error) { say(error.message, { bad: true }); return false; }
      padInfo = null;
      renderPad();
      return true;
    };
    const draw = () => {
      const model = R.pads.MODELS[mine.details.model];
      $('emu-padmap-label').textContent = mine.name;
      $('emu-padmap-art').innerHTML = R.pads.draw(pad.family, map, mine.details.model);
      $('emu-padmap-back').hidden = !model?.back;
      if (!model?.back) return;
      $('emu-padmap-back-art').innerHTML = R.pads.drawBack(mine.details.model, mine.details.copies, map);
      $('emu-padmap-learn').replaceChildren(...Object.entries(model.back).map(([key, printed]) => {
        const li = el('li', 'emu-padmap-learn__row');
        const learn = el('button', 'rux--btn rux--btn--ghost rux--btn--sm', 'Learn');
        learn.type = 'button';
        learn.setAttribute('aria-label', `Learn ${printed}`);
        learn.addEventListener('click', () => learnBack(key, printed));
        const clear = el('button', 'rux--btn rux--btn--ghost rux--btn--sm', 'Copies nothing');
        clear.setAttribute('aria-label', `${printed} copies nothing`);
        clear.type = 'button';
        clear.addEventListener('click', async () => { mine.details.copies = { ...mine.details.copies, [key]: null }; if (await save()) draw(); });
        li.append(el('span', 'emu-padmap-learn__name', printed), learn, clear);
        return li;
      }));
    };
    // A back button copies another, so the first new press after Learn is
    // the button it copies. Moves wait meanwhile, so that press does not also
    // choose or close something, and until every button is let go.
    const learnBack = (key, printed) => {
      const note = $('emu-padmap-learn-note');
      const pressed = () => [...(navigator.getGamepads?.()[pad.index]?.buttons ?? [])].map(b => b.pressed);
      const before = pressed();
      const until = performance.now() + 10000;
      R.pauseMoves(true);
      note.textContent = `Press ${printed} on the controller.`;
      const done = async control => {
        const release = () => (pressed().some(Boolean) ? requestAnimationFrame(release) : setTimeout(() => R.pauseMoves(false), 200));
        release();
        // A back button set to copy nothing sends nothing at all.
        if (!control) { note.textContent = `Nothing came from ${printed}, so it copies nothing yet. To set it on the controller, hold ${printed}, press the button it should copy, then press Star. Then Learn it again.`; return; }
        mine.details.copies = { ...mine.details.copies, [key]: control };
        const named = { ...R.pads.PRINTED[pad.family], ...(R.pads.MODELS[mine.details.model]?.printed ?? {}) };
        note.textContent = (await save()) ? `${printed} copies ${named[control] ?? control}.` : '';
        draw();
      };
      const watch = () => {
        const now = pressed();
        const i = now.findIndex((on, n) => on && !before[n]);
        if (i >= 0) return done(R.pads.CHROME[i] ?? null);
        if (performance.now() > until) return done(null);
        requestAnimationFrame(watch);
      };
      requestAnimationFrame(watch);
    };
    // Set up: Emu's layout written into the emulator's own file for the
    // chosen player, through the helper, with Undo while the map is open;
    // Gopher64, which only it can bind, is opened at its settings instead.
    const playerPick = $('emu-padmap-player');
    const most = read.most ?? 1;
    const taken = new Set(read.players.filter(p => p.bound).map(p => p.player));
    playerPick.replaceChildren(...Array.from({ length: most }, (_, i) => Object.assign(el('option', null, `Player ${i + 1}`), { value: String(i + 1) })));
    playerPick.value = String(one?.player ?? (Array.from({ length: most }, (_, i) => i + 1).find(n => !taken.has(n)) ?? 1));
    const setupNote = $('emu-padmap-setup-note');
    const goButton = $('emu-padmap-go'), undoButton = $('emu-padmap-undo');
    undoButton.hidden = !padUndo;
    const reopen = async message => {
      padReading = null;
      const reads = await readPads(system, await padsKnown());
      await openPadMap(pad, system, reads[pad.family], place);
      $('emu-padmap-setup-note').textContent = message;
      renderPad();
    };
    // A layout written for a player: the controller as the helper reports
    // it, the emulator's files changed, and Undo kept for them.
    const writeLayout = async (player, layout, done) => {
      const report = await R.helper.controllers();
      if (!report) throw new Error('Update Rux Emu Helper to version 37 or later to set up a controller here.');
      const found = R.pads.identify(padsNow(), report).find(p => p.index === pad.index)?.found;
      if (!found) throw new Error('Rux Emu Helper does not see this controller. Press a button on it, then try again.');
      const out = await R.pads.setUp(system, R.helper, player, { family: pad.family, ...found }, layout);
      if (out.problem) throw new Error(out.problem);
      if (out.open) {
        await R.helper.open(out.emulator);
        setupNote.textContent = `${out.emulator} is open. Choose this controller for player ${player} there.`;
        return;
      }
      const undo = [];
      for (const [rel, [before, after]] of Object.entries(out.files)) {
        await R.helper.putSetting(out.emulator, rel, new TextEncoder().encode(after));
        undo.push([rel, before]);
      }
      padUndo = { emulator: out.emulator, files: undo };
      await reopen(done(out.emulator));
    };
    goButton.onclick = async () => {
      const player = Number(playerPick.value);
      goButton.disabled = true;
      setupNote.textContent = 'Setting up…';
      try { await writeLayout(player, undefined, emulator => `Set up as player ${player} in ${emulator}.`); }
      catch (error) { setupNote.textContent = error.message; }
      finally { goButton.disabled = false; }
    };
    // Change a button: the console's button chosen, then the next press is
    // the controller's button for it; the button that had that press takes
    // the chosen one's old place, so no two share one. It starts from the
    // player's layout as its emulator has it, so earlier changes stay.
    const layoutNow = R.pads.LAYOUTS[system];
    const buttonPick = $('emu-padmap-button'), changeButton = $('emu-padmap-change');
    $('emu-padmap-change-row').hidden = !layoutNow || !one;
    if (layoutNow && one) {
      const current = { ...layoutNow };
      for (const [control, does] of Object.entries(one.map)) if (does in layoutNow) current[does] = control;
      const named = { ...R.pads.PRINTED[pad.family], ...(R.pads.MODELS[mine.details.model]?.printed ?? {}) };
      buttonPick.replaceChildren(...Object.keys(layoutNow).map(k => Object.assign(el('option', null, `${consoleName} ${k} · now ${named[current[k]] ?? current[k]}`), { value: k })));
      changeButton.onclick = () => {
        const key = buttonPick.value;
        const pressed = () => [...(navigator.getGamepads?.()[pad.index]?.buttons ?? [])].map(b => b.pressed);
        const before = pressed();
        const until = performance.now() + 10000;
        R.pauseMoves(true);
        changeButton.disabled = true;
        setupNote.textContent = `Press the controller's button for ${consoleName} ${key}.`;
        const finish = async control => {
          const release = () => (pressed().some(Boolean) ? requestAnimationFrame(release) : setTimeout(() => R.pauseMoves(false), 200));
          release();
          try {
            if (!control) throw new Error('No press came. Try again.');
            if (!R.pads.usable(read.emulator, control)) throw new Error(`${read.emulator} cannot use ${named[control] ?? control} as a button.`);
            const layout = { ...current };
            const holder = Object.keys(layout).find(k => layout[k] === control);
            if (holder && holder !== key) layout[holder] = layout[key];
            layout[key] = control;
            await writeLayout(one.player, layout, emulator => `${consoleName} ${key} is now ${named[control] ?? control}${holder && holder !== key ? `, and ${holder} moved to ${named[layout[holder]] ?? layout[holder]}` : ''}, in ${emulator}.`);
          } catch (error) { setupNote.textContent = error.message; }
          finally { changeButton.disabled = false; }
        };
        const watch = () => {
          const i = pressed().findIndex((on, n) => on && !before[n]);
          if (i >= 0) return finish(R.pads.CHROME[i] ?? null);
          if (performance.now() > until) return finish(null);
          requestAnimationFrame(watch);
        };
        requestAnimationFrame(watch);
      };
    }
    // Undo puts back each file as it was; a file Set up made new stays.
    undoButton.onclick = async () => {
      if (!padUndo) return;
      try {
        for (const [rel, before] of padUndo.files) if (before) await R.helper.putSetting(padUndo.emulator, rel, before);
      } catch (error) { setupNote.textContent = error.message; return; }
      const { emulator } = padUndo;
      padUndo = null;
      await reopen(`Put back as it was in ${emulator}.`);
    };
    $('emu-padmap-h').textContent = `${consoleName} buttons`;
    $('emu-padmap-note').textContent = said();
    $('emu-padmap-learn-note').textContent = '';
    $('emu-padmap-input').value = mine.name;
    select.onchange = () => { mine.details.model = select.value || undefined; draw(); };
    $('emu-padmap-name').onsubmit = async e => {
      e.preventDefault();
      const value = $('emu-padmap-input').value.trim();
      if (!value) return;
      mine.name = value;
      mine.details.model = select.value || undefined;
      if (await save()) draw();
    };
    draw();
    window.Rux.modal.open('emu-padmap-modal');
  }

  function render() {
    const mac = Boolean(helper);
    for (const id of ['emu-strip', 'emu-sound', 'emu-chosen', 'emu-pad', 'emu-where-row']) $(id).hidden = !mac;
    $('emu-library').classList.toggle('emu-library--mac', mac);
    if (mac) { renderStrip(); renderWhere(); }
    keepShown();
    renderConsoles();
    renderGames();
    renderChosen();
  }

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
  // What the page draws from this Mac: where each game stands, and apart
  // from that how far each arriving one has come and the room free.
  // The helper's answer is compared by what it says, since it lists its
  // fields in a different order each time it is asked.
  const told = () => JSON.stringify([helper && [helper.version, helper.library, [...helper.systems ?? []].sort()], games.map(g => stands(g).state)]);
  const coming = () => JSON.stringify([free, games.map(g => stands(g).done ?? 0)]);
  const panelOpen = () => !$('emu-panel').hidden;
  async function look() {
    const before = told(), came = coming();
    const arriving = games.filter(g => stands(g).state === 'arriving');
    await readMac();
    // The library may be read a moment before its last file lands, so a game
    // neither arriving nor here now is read once more.
    if (arriving.some(g => stands(g).state === 'away')) await readMac();
    if (arriving.some(g => stands(g).state === 'held')) sfx.done();
    // Nothing is drawn again under a held game, an open panel or a console's
    // open menu; a download's progress alone changes only what shows it.
    if (told() !== before) { if (!panelOpen() && !drag?.on && !window.Rux.menu.isOpen($('emu-console-menu'))) render(); }
    else if (coming() !== came && helper) showComing();
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
  // The strip says what a move is doing or did in place of this Mac's facts,
  // with a question's answers beside it, each [label, run]; it settles back to
  // the facts by itself. A move refused or failed says so with Carbon's
  // failed indicator, and a question with its caution.
  let saidFor = 0;
  // How long a move with no known end is said: until something else is.
  const LONG = 600000;
  function say(text = '', { ms = 4000, bad = false, answers = [] } = {}) {
    clearTimeout(saidFor);
    const words = $('emu-said');
    if (text && (bad || answers.length)) {
      const svg = iconOf(bad ? '#i-error--filled' : '#i-warning--alt-inverted--filled');
      svg.setAttribute('class', bad ? 'rux--icon-indicator--failed' : 'rux--icon-indicator--caution-major');
      words.className = 'rux--icon-indicator emu-strip__words';
      words.replaceChildren(svg, el('span', 'emu-strip__words', text));
    } else {
      words.className = 'rux--type-body-compact-01 emu-strip__words';
      words.textContent = text;
    }
    $('emu-strip').classList.toggle('emu-strip--said', Boolean(text));
    $('emu-said-answers').replaceChildren(...answers.map(([label, run]) => {
      const b = el('button', 'rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm', label);
      b.type = 'button';
      b.addEventListener('click', () => { say(); run?.(); });
      return b;
    }));
    holding = answers.length > 0 || ms === LONG;
    if (text) saidFor = setTimeout(say, ms);
    else if (untold) { const told = untold; untold = null; say(told); }
  }
  // What a game's saves say as they are carried, which may come long after
  // Play: it waits for a question's answer, or a long move's end, rather than
  // taking its place.
  let holding = false;
  let untold = null;
  const mutter = text => { if (holding) untold = text; else say(text); };
  const sayNo = text => say(text, { ms: 6000, bad: true });
  async function download(g, thenPlay = false) {
    if (stands(g).state !== 'held') {
      try { await R.helper.download(g); }
      catch (error) { sayNo(error.message); return; }
    }
    if (thenPlay) wanted.add(keyOf(g));
    sfx.drop();
    await look();
    render();
  }
  // A console set up, one setup a console, which every Download waiting on it shares.
  const setups = new Map();
  function getConsole(system) {
    if (plays(system)) return Promise.resolve();
    if (!setups.has(system)) setups.set(system, setUp(system).finally(() => setups.delete(system)));
    return setups.get(system);
  }
  // A game whose console is not set up sets it up first, waiting under a veil.
  async function getGame(g, thenPlay = false) {
    if (!plays(g.system)) {
      waiting.add(keyOf(g));
      render();
      try { await getConsole(g.system); } finally { waiting.delete(keyOf(g)); }
    }
    if (plays(g.system)) await download(g, thenPlay); else render();
  }
  // The slot a game goes into, as a part of its console's drawing from the
  // top, and the consoles that take a disc.
  const SLOT = { nes: 0.67, snes: 0.25, n64: 0.25, gc: 0.21, wii: 0.5, wiiu: 0.83, switch: 0.04, gb: 0.02, gbc: 0.02, gba: 0.5, nds: 0.5, n3ds: 0.5, psx: 0.33, ps2: 0.75, xbox: 0.71 };
  const DISC = new Set(['gc', 'wii', 'wiiu', 'psx', 'ps2', 'xbox']);
  // A timer beside each animation, so the game still starts where one is not run.
  const after = (anim, ms) => Promise.race([anim.finished, new Promise(r => setTimeout(r, ms + 80))]).catch(() => {});
  // The game goes into its console in the list, with its own picture on it.
  // It is drawn over the page at the console's place, since the list clips
  // what falls into it from above.
  async function insert(g) {
    const at = kitOf(g.system)?.querySelector('.emu-console')?.getBoundingClientRect();
    if (!at || calm()) { sfx.insert(); return; }
    const over = el('div', 'emu-insert');
    Object.assign(over.style, { left: `${at.left}px`, top: `${at.top}px`, width: `${at.width}px`, height: `${at.height}px` });
    over.style.setProperty('--emu-slot', SLOT[g.system] ?? 0.4);
    const disc = DISC.has(g.system);
    const media = el('div', disc ? 'emu-media emu-media--disc' : 'emu-media emu-media--cart');
    const art = coverOf(g)?.querySelector('img');
    if (art) media.append(art.cloneNode());
    over.append(media);
    document.body.append(over);
    const easing = 'cubic-bezier(0.2, 0, 0.38, 0.9)';
    if (disc) {
      const tray = el('div', 'emu-tray');
      over.append(tray);
      tray.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 160, easing });
      await after(media.animate([{ transform: 'translate(2.75rem, -.5rem) rotate(0)', opacity: 0 }, { transform: 'translate(0, 0) rotate(240deg)', opacity: 1, offset: 0.6 },
        { transform: 'translate(0, .375rem) rotate(300deg) scale(.6)', opacity: 0 }], { duration: 520, easing }), 520);
      media.remove();
      after(tray.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: 160, easing }), 160).then(() => over.remove());
    } else {
      await after(media.animate([{ transform: 'translateY(-2.5rem)', opacity: 0 }, { transform: 'translateY(-.5rem)', opacity: 1, offset: 0.5 },
        { transform: 'translateY(.625rem) scaleY(.2)', opacity: 0 }], { duration: 440, easing }), 440);
      over.remove();
    }
    sfx.insert();
  }
  // PLAY, the one way a game starts. Saves that cannot be brought stop it, and
  // the strip asks: Try again, or Play anyway on this Mac's own saves.
  async function play(g, anyway = false) {
    if (starting) return;
    if (g !== game) choose(g.system, g);
    starting = keyOf(g);
    renderGo();
    try {
      if (stateOf(g.system) === 'on') await insert(g);
      say('Starting…', { ms: 60000 });
      await R.thisMac.play(g, mutter, { anyway });
      sfx.start();
      say(`Playing ${nameOf(g)}.`);
    } catch (error) {
      sfx.no();
      if (error.notBrought) say(error.message, { ms: 30000, bad: true, answers: [['Try again', () => play(g)], ['Play anyway', () => play(g, true)]] });
      else sayNo(error.message);
    }
    starting = null;
    cards.at = 0;
    renderChosen();
  }
  // A console that will not have it now shakes its head and buzzes, and the strip says why.
  function refuse(system, text) {
    sfx.no();
    sayNo(text);
    const kit = kitOf(system);
    if (!kit) return;
    kit.classList.remove('emu-kit--shakes');
    void kit.offsetWidth;
    kit.classList.add('emu-kit--shakes');
    later(500, () => kit.classList.remove('emu-kit--shakes'));
  }
  // REMOVING AN EMULATOR: the strip asks first, naming every console that
  // plays in it. Its saves and settings are kept in Supabase and checked, then
  // the helper moves it to the Trash. Where keeping fails nothing is removed.
  function askRemove(system) {
    if (stateOf(system) !== 'on') return;
    const emulator = emulatorOf(system);
    const going = playedBy(emulator).map(R.systemName);
    say(`Remove ${emulator}? The ${list(going)} ${going.length > 1 ? 'go' : 'goes'} with it. Your saves are kept.`,
      { ms: 20000, answers: [['Remove', () => remove(system)], ['Keep']] });
  }
  async function remove(system) {
    const emulator = emulatorOf(system);
    const going = playedBy(emulator);
    for (const sys of going) keeping.add(sys);
    render();
    say(`Keeping ${emulator}'s saves and settings…`, { ms: LONG });
    let failed = null;
    try { await R.carry.remove(emulator); } catch (error) { console.error(error); failed = error; }
    for (const sys of going) keeping.delete(sys);
    await readMac();
    render();
    if (failed) { sayNo(failed.message); return; }
    sfx.unplug();
    say(`${emulator} is off this Mac. Your saves stay.`);
  }
  // SETTING UP installs its emulator from Supabase, then makes it ready with
  // the settings this Mac kept, as Status does, every console it plays
  // blinking meanwhile.
  async function setUp(system) {
    const emulator = emulatorOf(system);
    if (plays(system)) return;
    const coming = playedBy(emulator);
    for (const sys of coming) settingUp.add(sys);
    sfx.plug();
    render();
    say(`Setting up ${emulator}…`, { ms: LONG });
    let failed = null;
    try {
      const installer = R.installerOf(await R.data.files(), emulator);
      if (!installer) throw new Error(`Supabase holds no installer for ${emulator}.`);
      await R.carry.setUp(emulator, installer, R.keptVersion(installer),
        part => say(part === 'install' ? `Installing ${emulator}…` : `Making ${emulator} ready…`, { ms: LONG }));
    } catch (error) { console.error(error); failed = error; }
    for (const sys of coming) settingUp.delete(sys);
    await readMac();
    render();
    if (failed) { sayNo(failed.message); return; }
    sfx.done();
    say(`The ${list(coming.map(R.systemName))} ${coming.length > 1 ? 'are' : 'is'} ready.`);
  }

  // THE DRAG, with the mouse, where the helper answers. A cover let go on its
  // own console plays; a press that does not move is the cover's own click.
  // `intent` is the one answer to what letting go here will do: the word
  // shown, the console that lights, and the move, or why not, or null where
  // nothing would happen. So the word never disagrees with the drop.
  function intent(g, under) {
    const kit = under?.closest('[data-console]');
    if (!kit) return null;
    const system = kit.dataset.console;
    const no = (word, says) => ({ word, kit, no: true, says });
    if (system !== g.system) return no(`Does not fit the ${R.systemName(system)}`, `${nameOf(g)} does not fit the ${R.systemName(system)}.`);
    const state = stateOf(system);
    if (state === 'setting') return no('Still setting up', 'Hang on, still setting up.');
    if (state === 'keeping') return no('Being removed', 'It is being removed.');
    const s = stands(g);
    if (s.state === 'arriving') return no('Still downloading', 'Not all here yet.');
    if (s.state === 'held' && state === 'on') return { word: 'Play', kit, run: () => play(g) };
    if (!keeps) return no('Update the helper to download', 'Update the helper to download.');
    return { word: state === 'on' ? 'Download and play' : 'Set up, download and play', kit, run: () => getGame(g, true) };
  }
  let drag = null;
  const word = el('div', 'emu-word');
  word.hidden = true;
  document.body.append(word);
  function unlight() { for (const n of document.querySelectorAll('.emu-lit, .emu-no')) n.classList.remove('emu-lit', 'emu-no'); }
  const underOf = e => document.elementFromPoint(e.clientX, e.clientY);
  // A cover's picture is not dragged away as a file.
  document.addEventListener('dragstart', e => { if (e.target.closest?.('.emu-cover')) e.preventDefault(); });
  document.addEventListener('pointerdown', e => {
    const src = e.target.closest?.('#emu-games .emu-cover');
    if (!src || e.button > 0 || e.pointerType !== 'mouse' || !helper) return;
    const g = games.find(x => keyOf(x) === src.dataset.game);
    if (g) drag = { g, src, x: e.clientX, y: e.clientY, id: e.pointerId, on: false };
  });
  document.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.on) {
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
      drag.on = true;
      sfx.pick();
      const r = drag.src.getBoundingClientRect();
      Object.assign(drag, { dx: drag.x - r.left, dy: drag.y - r.top, home: r });
      // What is picked up is held as a copy under the pointer, half its size,
      // so the console it is held over still shows.
      const ghost = el('div', 'emu-ghost');
      ghost.style.transformOrigin = `${drag.dx}px ${drag.dy}px`;
      const copy = drag.src.cloneNode(true);
      Object.assign(copy.style, { position: 'static', transform: 'none', inlineSize: `${r.width}px`, blockSize: `${r.height}px` });
      ghost.append(copy);
      document.body.append(ghost);
      drag.ghost = ghost;
      drag.src.classList.add('emu-held');
    }
    drag.ghost.style.transform = `translate(${e.clientX - drag.dx}px, ${e.clientY - drag.dy}px) rotate(-3deg) scale(.5)`;
    const it = intent(drag.g, underOf(e));
    unlight();
    word.hidden = !it;
    if (!it) return;
    word.textContent = it.word;
    word.classList.toggle('emu-word--no', Boolean(it.no));
    word.style.transform = `translate(${Math.min(e.clientX + 16, innerWidth - word.offsetWidth - 8)}px, ${e.clientY + 20}px)`;
    it.kit.classList.add(it.no ? 'emu-no' : 'emu-lit');
  });
  // The hold over: the word and the lights gone.
  function letGo() {
    const d = drag;
    drag = null;
    word.hidden = true;
    unlight();
    return d;
  }
  // A drag that ended on its own cover would press it; that one click is swallowed.
  let dragged = false;
  document.addEventListener('click', e => { if (dragged) { dragged = false; e.stopPropagation(); e.preventDefault(); } }, true);
  document.addEventListener('pointerup', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = letGo();
    if (!d.on) return;
    dragged = true;
    setTimeout(() => { dragged = false; });
    const it = intent(d.g, underOf(e));
    const done = () => {
      d.ghost.remove();
      d.src.classList.remove('emu-held');
      if (it?.run) it.run(); else if (it) refuse(it.kit.dataset.console, it.says);
    };
    // A move that happens fades where it was dropped; any other flies back
    // to where it came from. Both are Carbon's productive motion.
    if (it?.run) { d.ghost.classList.add('emu-ghost--gone'); setTimeout(done, 110); return; }
    d.ghost.classList.add('emu-ghost--back');
    d.ghost.style.transform = `translate(${d.home.left}px, ${d.home.top}px)`;
    setTimeout(done, 240);
  });
  document.addEventListener('pointercancel', () => {
    if (!drag) return;
    const d = letGo();
    d.ghost?.remove();
    d.src.classList.remove('emu-held');
  });

  // THE SIDE PANEL, and what it was opened from, to come back to.
  let opener = null;
  const openGame = (g, from, { about = false } = {}) => {
    opener = from;
    R.gamePanel.open(g, { saves, onSaved: render, about, top: about ? [] : [cover(g, 'emu-panel-art')],
      mac: { focus: true, onChanged: readMac, play: helper ? () => { closeGame(); play(g); } : null } });
  };
  // The panel's own close and Escape, heard first, so the page shows what the
  // panel changed, such as a download or a favourite.
  function closeGame() {
    R.gamePanel.close();
    render();
    const back = opener?.dataset.game ? $('emu-games').querySelector(`.emu-cover[data-game="${CSS.escape(opener.dataset.game)}"]`) : opener;
    back?.focus();
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && panelOpen()) { e.stopImmediatePropagation(); closeGame(); } }, true);
  $('emu-panel-close').addEventListener('click', e => { e.stopImmediatePropagation(); closeGame(); }, true);

  // A CONTROLLER moves the focus over the consoles and the covers to the
  // nearest one that way. A presses it, and a cover already chosen is played
  // or downloaded; B closes what is open. The first move only finds the place.
  R.onPad(move => {
    if (!helper || !game) return;
    const at = document.activeElement;
    if (move === 'b') { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); return; }
    if (panelOpen() || document.querySelector('.rux--modal.is-visible')) { if (move === 'a' && at?.matches('button')) at.click(); return; }
    const places = '#emu-consoles .emu-kit, #emu-games .emu-cover';
    if (!at?.matches(places)) { coverOf(game)?.focus(); return; }
    if (move === 'a') { if (at.dataset.game === keyOf(game)) $('emu-chosen-go').click(); else at.click(); return; }
    const middle = n => { const r = n.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
    const [x, y] = middle(at);
    const [dx, dy] = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[move];
    let best = null, least = Infinity;
    for (const n of document.querySelectorAll(places)) {
      const [nx, ny] = middle(n);
      const along = (nx - x) * dx + (ny - y) * dy;
      const across = Math.abs((nx - x) * dy) + Math.abs((ny - y) * dx);
      if (n === at || along < 8 || (dx && across > 40)) continue;
      const far = along + 2 * across;
      if (far < least) { least = far; best = n; }
    }
    best?.focus();
    best?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });

  async function load() {
    let rows, notes, mac, files;
    try {
      [rows, notes, saves, mac, emulators, driveRow, files] = await Promise.all([R.data.games(), R.data.notes(), R.data.saves(),
        R.thisMac.read(), R.emulators(), R.data.lastScan(), R.data.files()]);
      newestHelper = R.installerOf(files, 'Rux Emu Helper')?.name.match(/-(\d+)-macOS/)?.[1] ?? null;
    } catch (error) {
      console.error(error);
      $('emu-loading')?.remove();
      R.notice('Emu could not read the collection. Try again.');
      return;
    }
    // A game's status is what its panel shows of it.
    games = R.withNotes(rows, notes).map(g => ({ ...g, status: R.statusOf(g) }))
      .sort((a, b) => a.title.localeCompare(b.title));
    await takeMac(mac);
    $('emu-loading')?.remove();
    $('emu-empty').hidden = games.length > 0;
    $('emu-library').hidden = games.length === 0;
    if (!games.length) return;
    R.data.info().then(rows => { info = new Map(rows.map(r => [keyOf(r), r])); renderChosen(); }, error => console.error(error));
    // The game ?game= names, taken off the address, else the one last played here.
    const url = new URL(location.href);
    const key = url.searchParams.get('game');
    const asked = key ? games.find(g => keyOf(g) === key) : null;
    const details = url.searchParams.has('details');
    if (key) {
      for (const name of ['game', 'details']) url.searchParams.delete(name);
      url.hash = '';
      history.replaceState(null, '', url);
    }
    game = asked ?? lastPlayed(games.filter(g => stands(g).state === 'held' && plays(g.system))) ?? firstOf(consoles().find(plays) ?? consoles()[0]);
    chosen = game.system;
    where = isHere(game) ? 'mac' : 'all';
    renderSound();
    render();
    showChosen();
    if (asked && (details || !helper)) openGame(asked, coverOf(asked));
  }

  // The helper may be started or quit, an emulator installed or a download
  // ended, while the page is away: it is read again when the page is back, and
  // so are the saves a game just played may have changed.
  window.addEventListener('focus', () => { if (!games.length) return; cards.at = 0; look().then(() => { if (helper && !panelOpen()) renderSave(); }); });
  // The nightly scan may have saved while the page was away, so when it
  // last did is read again too, and the strip redrawn.
  window.addEventListener('focus', async () => {
    const row = await R.data.lastScan().catch(() => driveRow);
    if (row?.scanned_at === driveRow?.scanned_at) return;
    driveRow = row;
    if (helper) renderStrip();
  });
  load();
})();
