/* ==========================================================================
   library.js — the Library, Emu's front page
   --------------------------------------------------------------------------
   Four tiles: every console with games down the side, each its drawing and
   name; beside them the chosen game, its screenshot, its name and facts, its
   save and the one next move beside it; the controller
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
  // The tiles leave their skeletons, or go where there is nothing to show.
  const loaded = shown => { const lib = $('emu-library'); lib.classList.remove('emu-library--loading'); lib.removeAttribute('aria-busy'); lib.hidden = !shown; };
  // The console the page last opened on, kept in this browser, so the
  // skeleton covers take its box's shape before the collection is read.
  const OPENS = 'emu-console';
  try {
    const last = localStorage.getItem(OPENS);
    if (R.BOX[last]) { $('emu-games').style.setProperty('--emu-box', R.BOX[last]); $('emu-games').classList.toggle('emu-games__list--wide', R.BOX[last] > 1.2); }
  } catch { /* a browser that keeps nothing shows the covers' usual shape */ }
  if (!R?.data) { loaded(false); R?.notice('Emu needs a log-in to read the collection.'); return; }

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
  // THE CONSOLES: the chosen one's drawing and wordmark over its games, a
  // button opening the list of every console, each its drawing and its name,
  // the chosen one on Carbon's selected layer. One not set up is faded. The
  // power light, on the drawing, is lit while it is set up and flashes while
  // it is set up or removed. The chosen console's drawing is where a game
  // goes in, shakes and is dropped.
  // Where each console's power light is on its drawing, in art pixels from
  // its top-left, how many pixels it covers, and its colour as the real
  // console's light: error is red, success green, warning orange, info blue.
  const LIGHT = {
    nes: [4, 21, 1, 1, 'error'], snes: [3, 19, 1, 1, 'error'], n64: [17, 21, 2, 1, 'error'], gc: [2, 3, 2, 2, 'warning'],
    wii: [1, 8, 2, 1, 'success'], wiiu: [28, 16, 1, 1, 'info'], switch: [9, 16, 1, 1, 'success'], gb: [2, 5, 1, 1, 'error'],
    gbc: [2, 5, 1, 1, 'error'], gba: [21, 2, 1, 1, 'success'], nds: [17, 4, 1, 1, 'success'], n3ds: [2, 13, 2, 2, 'info'],
    psx: [4, 14, 3, 1, 'success'], ps2: [32, 17, 1, 1, 'success'], xbox: [17, 18, 2, 2, 'success'],
  };
  const kitOf = system => (system === chosen ? $('emu-consoles-pick') : null);
  const listed = system => $('emu-consoles').querySelector(`[data-console="${system}"]`);
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
      b.addEventListener('click', () => { choose(system); consolesPick.close({ restoreFocus: true }); });
      b.addEventListener('contextmenu', e => {
        if (!helper) return;
        e.preventDefault();
        choose(system);
        consolesPick.close({ restoreFocus: true });
        openMenu($('emu-consoles-pick'));
      });
      const li = el('li');
      li.append(b);
      return li;
    }));
    renderPicker();
  }
  function renderPicker() {
    const b = $('emu-consoles-pick');
    if (!chosen) return;
    const state = stateOf(chosen);
    b.className = `emu-picker emu-kit--${state}`;
    b.dataset.console = chosen;
    b.title = BUSY[state]?.(chosen) ?? '';
    b.setAttribute('aria-label', `${R.systemName(chosen)}${state === 'away' ? ', not set up' : ''}`);
    const chevron = iconOf('#i-chevron--down');
    chevron.setAttribute('class', 'emu-picker__chevron');
    b.replaceChildren(spotOf(chosen), markOf(chosen) ?? el('span', 'emu-picker__name', R.systemName(chosen)), chevron);
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
    renderPicker();
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
  // Where the wall scrolls alone, the chosen game in its view.
  function showChosen() {
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
  // save; and the one next move.
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
      favourite: Boolean(n.favourite), plays: Boolean(n.plays), gba: Boolean(n.gba), ...change };
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
    if (key === 'gba') { padReading = null; renderPad(); }
  }

  // A GAME'S MENU, from a right-click on its cover:
  // Favourite and Finished, ticked while on; for a GameCube game, Play with
  // Game Boy Advances, its controllers as Dolphin's integrated GBAs; About this copy, which opens the
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
      ...(g.system === 'gc' ? [menuItem(menu, 'Play with Game Boy Advances', () => mark(g, 'gba'), { checked: Boolean(n.gba) })] : []),
      menuItem(menu, 'About this copy', () => openGame(g, trigger, { about: true })));
    if (keeps && s.state !== 'arriving' && (s.state === 'held' || s.done)) {
      const line = el('li', 'rux--menu-item-divider');
      line.setAttribute('role', 'separator');
      menu.append(line, menuItem(menu, 'Remove from this Mac', () => removeGame(g), { off: moving, danger: true }));
    }
    window.Rux.menu.open(menu, trigger);
  }
  async function removeGame(g) {
    try { await R.helper.remove(g); } catch (error) { sayNo(error.message); return; }
    say(`${nameOf(g)} is off this Mac. Its saves are kept.`);
    await look();
    render();
  }

  // SAVE is a button of three lines, what it is, what will be used and a
  // note, over a list that opens down from it. `fill` draws the list and
  // returns what takes the focus, scrolled into the list's view, else the
  // list's first control takes it.
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
      const first = fill(pop, close);
      pop.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      held = window.Rux.overlay.register({ element: pop, anchor: button, close });
      (first ?? window.Rux.overlay.focusables(pop)[0])?.focus({ preventScroll: true });
      first?.scrollIntoView({ block: 'nearest' });
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
    return last ? `Saved ${R.date(last)}` : `Save kept in ${emulatorOf(g.system)}`;
  };
  const savePick = pickOf('emu-chosen-save', fillSave);
  // The list of consoles opens on the chosen one.
  const consolesPick = pickOf('emu-consoles-pick', () => { renderConsoles(); return listed(chosen); });
  $('emu-consoles-pick').addEventListener('contextmenu', e => { if (!helper || !chosen) return; e.preventDefault(); openMenu(e.currentTarget); });
  function writeSave() {
    const g = game;
    if (stateOf(g.system) === 'away' || stateOf(g.system) === 'setting') { savePick.write({ hidden: true }); return; }
    if (cards.system !== g.system) { savePick.write({ value: 'Reading saves…', off: true }); return; }
    if (cards.error) { savePick.write({ value: 'Saves could not be read', off: true }); return; }
    if (!cards.read) { savePick.write({ value: 'Saves on this Mac', note: 'Not kept in Supabase', off: true }); return; }
    const mine = mineOf(g);
    const two = aside?.key === keyOf(g) && aside.other.length > 0;
    if (!mine.in && !cards.read.moves) { savePick.write({ value: unsaid(g), off: true }); return; }
    // The field has no label shown, so every value says it is a save: a card
    // with no name of its own is said by when it was saved, and a named one
    // has Saved and its date beside it.
    const [value, note] = !mine.in ? ['New save', mine.out.length ? `${mine.out.length} put away` : 'Starts when you play']
      : mine.in.name ? [mine.in.name, [mine.in.saved ? `Saved ${R.date(mine.in.saved)}` : wordOf(g.system), states(mine.in.states)].filter(Boolean).join(' · ')]
      : [mine.in.saved ? `Saved ${R.date(mine.in.saved)}` : wordOf(g.system), states(mine.in.states)];
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
  const padsKnown = async () => {
    const pads = padsNow();
    if (!pads.length) return [];
    return R.pads.identify(pads, await (padReport ??= (R.helper?.controllers?.() ?? Promise.resolve(null)).catch(() => null)));
  };
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
  // A player's box: its number over the controller playing it and, on a
  // line of its own, what that controller is, or a line saying why none is;
  // one with a controller is a button opening its map, and `action`, such
  // as Fix it, sits beside it.
  function padSlot(player, sub, kind, open, action) {
    const li = el('li', `emu-slot emu-slot--${kind}`);
    const icon = iconOf('#i-game--console');
    icon.setAttribute('width', '20');
    icon.setAttribute('height', '20');
    icon.setAttribute('class', 'emu-slot__icon');
    const main = el('span', 'emu-row__main');
    main.append(el('span', 'emu-slot__player', `Player ${player}`), ...[sub].flat());
    const box = open ? el('button', 'emu-slot__box') : el('span', 'emu-slot__box');
    if (open) { box.type = 'button'; box.addEventListener('click', open); }
    box.append(icon, main);
    li.append(box);
    if (action) li.append(action);
    return li;
  }
  // Which player a controller is on the chosen console, at its place among
  // the connected controllers, and what to say: [kind, words, player]. In an
  // emulator that counts controllers by place, one that keeps a player is
  // that player, since Play puts them in that order.
  function padState(read, pad, consoleName, place, kept) {
    if (!read) return null;
    const one = kept && R.pads.byPlace(read.emulator, [pad.found ?? {}]) ? read.players.find(x => x.player === kept) ?? null
      : R.pads.playerOf(read, pad, place);
    const problem = read.problem ?? one?.problem;
    if (problem) return ['warn', problem, one];
    if (one && Object.keys(one.map).length) return ['ok', `Player ${one.player} · Set up for ${consoleName}`, one];
    return [read.most === 1 && read.players[0]?.bound ? 'info' : 'warn', read.most === 1 && read.players[0]?.bound ? `${consoleName} has one player` : `Not set up for ${consoleName}`, null];
  }
  // A box's one word: Ready, where the emulator has the controller set up as
  // the box's player, else Needs a fix, and why for the strip at Play. An emulator that counts
  // controllers by place is Ready when that player's buttons are set, since
  // the order is made at Play. Past the console's own players there is
  // nothing to fix.
  function padStatus(h, player, most, read, consoleName) {
    if (player > most) return { kind: 'info', words: `${consoleName} has ${most === 1 ? 'one player' : `${most} players`}`, fix: false };
    const ready = { kind: 'ok', words: 'Ready', fix: false };
    const needs = why => ({ kind: 'warn', words: 'Needs a fix', why, fix: true });
    const [kind, words, one] = h.state ?? ['warn', `Not set up for ${consoleName}`, null];
    if (read.problem) return needs(read.problem.replace(/\.$/, ''));
    if (R.pads.byPlace(read.emulator, [h.pad.found ?? {}])) {
      return read.players.some(x => x.player === player && Object.keys(x.map).length) ? ready : needs(`not set up as player ${player}`);
    }
    if (kind === 'ok' && one.player === player) return ready;
    if (kind === 'ok') return needs(`${read.emulator} has it as player ${one.player}`);
    return needs(kind === 'info' ? `not set up for ${consoleName}` : words.replace(/\.$/, '').replace(/^Not/, 'not'));
  }
  // Four players, as many as any console here has. Each controller keeps
  // its player with the account, the same on every console and Mac, and
  // takes that box; one with none takes the player its emulator has it as,
  // else the first free box, and keeps that player from then on, as the
  // press that made Chrome show it joins it. A box past the console's own
  // players says so. Two of one model share a row, so the second takes the
  // next free box.
  const SLOTS = 4;
  const joined = new Set();
  // A console's name as the boxes and the map say it; a GameCube game played
  // with Game Boy Advances is played on those.
  const padConsoleName = system => (system === R.pads.GBA_MODE ? 'Game Boy Advance' : R.systemName(system));
  // The four boxes for a console, or a game's mode of it: each null or { pad, state, kept, status }.
  async function padBoxes(system) {
    const pads = await padsKnown();
    const consoleName = padConsoleName(system);
    const [info, reads] = await Promise.all([padInfoNow(), readPads(system, pads.length ? pads : [{ family: 'xbox' }])]);
    const most = Object.values(reads)[0]?.most ?? SLOTS;
    const held = Array(SLOTS).fill(null);
    const loose = [];
    for (const pad of pads) {
      const kept = info.get(pad.id)?.details?.player;
      const state = padState(reads[pad.family], pad, consoleName, pad.place, kept);
      const at = (kept ?? (state?.[0] === 'ok' ? state[2].player : 0)) - 1;
      if (at >= 0 && at < SLOTS && !held[at]) held[at] = { pad, state, kept }; else loose.push({ pad, state, kept });
    }
    for (const one of loose) {
      const at = held.findIndex(h => !h);
      if (at >= 0) held[at] = one;
    }
    held.forEach((h, i) => {
      if (!h) return;
      h.name = info.get(h.pad.id)?.name ?? h.pad.name;
      h.read = reads[h.pad.family];
      h.status = padStatus(h, i + 1, most, h.read, consoleName);
      if (system === R.pads.GBA_MODE && h.status.kind === 'ok') h.status = { ...h.status, words: 'Ready · Game Boy Advance' };
    });
    return { held, most, consoleName, info };
  }
  // Each redraw is numbered, and one overtaken by a later, as when consoles
  // are chosen quickly, draws nothing.
  let padTurn = 0;
  async function renderPad() {
    if (!helper) return;
    const turn = ++padTurn;
    const system = R.pads.modeOf(game?.system ?? chosen, game);
    if (!system) return;
    const { held, most, consoleName, info } = await padBoxes(system);
    if (turn !== padTurn) return;
    $('emu-pad-list').replaceChildren(...held.map((h, i) => {
      const player = i + 1;
      const past = player > most ? `${consoleName} has ${most === 1 ? 'one player' : `${most} players`}` : null;
      if (!h) return padSlot(player, el('span', 'emu-row__sub', past ?? 'Press a button to join'), past ? 'off' : 'none');
      const fixer = h.status.fix ? el('button', 'rux--btn rux--btn--tertiary rux--btn--sm emu-slot__fix', 'Fix it') : null;
      if (fixer) {
        fixer.type = 'button';
        fixer.setAttribute('aria-label', `Fix ${h.name} as player ${player}`);
        fixer.addEventListener('click', () => fixPads(system, [[player, h]]));
      }
      const status = indicator(h.status.kind, h.status.words);
      status.classList.add('emu-row__sub');
      const li = padSlot(player, [el('span', 'emu-row__sub emu-slot__name', h.name), status], past ? 'off' : 'held', () => openPadMap(h.pad, system, h.read, h.pad.place), fixer);
      li.dataset.pad = String(h.pad.index);
      if (!h.kept) keepPlayer(h.pad, h.name, info.get(h.pad.id)?.details, player);
      return li;
    }));
    watchPresses();
  }
  // Fix it: each [player, box] set up now in the console's emulator, and the
  // tile read again. Says what stopped it; true when every one was set up.
  async function fixPads(system, fixes) {
    try {
      for (const [player, h] of fixes) {
        if (!h.pad.found) throw new Error(`Rux Emu Helper does not see the ${h.name}. Press a button on it, then try again.`);
        const out = await R.pads.fix(system, R.helper, player, { family: h.pad.family, ...h.pad.found });
        if (out.open) { say(`${out.emulator} is open. Choose the ${h.name} for player ${player} there.`, { ms: LONG }); return false; }
      }
    } catch (error) { sayNo(error.message); return false; }
    padReading = null;
    renderPad();
    say(fixes.length > 1 ? 'Fixed.' : `The ${fixes[0][1].name} is ready as player ${fixes[0][0]}.`);
    return true;
  }
  // A controller's player kept with the account, once per controller.
  async function keepPlayer(pad, name, details, player) {
    if (!pad.id || !R.data || joined.has(pad.id)) return;
    joined.add(pad.id);
    try { await R.data.setController(pad.id, name, { ...(details ?? {}), player }); padInfo = null; }
    catch (error) { joined.delete(pad.id); console.error(error); }
  }
  // A press on a controller lights its box for a moment, so rux can see
  // which controller is which. Read once a frame while any is connected.
  let pressFrame = 0;
  const pressWas = [];
  function watchPresses() {
    if (pressFrame) return;
    const look = () => {
      const now = [...(navigator.getGamepads?.() ?? [])];
      if (!now.some(Boolean)) { pressFrame = 0; return; }
      now.forEach((gp, i) => {
        const on = Boolean(gp?.buttons.some(b => b.pressed));
        if (on && !pressWas[i]) flashSlot(gp.index);
        pressWas[i] = on;
      });
      pressFrame = requestAnimationFrame(look);
    };
    pressFrame = requestAnimationFrame(look);
  }
  const flashing = new Map();
  function flashSlot(index) {
    const li = $('emu-pad-list').querySelector(`[data-pad="${index}"]`);
    if (!li) return;
    li.classList.add('emu-slot--lit');
    clearTimeout(flashing.get(index));
    flashing.set(index, setTimeout(() => li.classList.remove('emu-slot--lit'), 700));
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
    const consoleName = padConsoleName(system);
    const known = (await padInfoNow()).get(pad.id);
    const mine = { name: known?.name ?? pad.name, details: { ...(known?.details ?? {}) } };
    const state = padState(read, pad, consoleName, place, known?.details?.player);
    const one = state[2];
    const map = state[0] === 'ok' ? one.map : {};
    const select = $('emu-padmap-model');
    select.replaceChildren(el('option', null, 'Standard'), ...Object.entries(R.pads.MODELS)
      .filter(([, m]) => m.family === pad.family).map(([key, m]) => Object.assign(el('option', null, m.name), { value: key })));
    select.firstChild.value = '';
    select.value = mine.details.model ?? '';
    const said = () => [state[0] === 'ok' ? `Player ${one.player}, as set in ${read.emulator}.` : `${state[1].replace(/\.?$/, '.')}${read.problem || one?.problem ? '' : ` Its buttons are set in ${read.emulator}.`}`,
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
    // The controller's player, kept with the account for every console:
    // choosing one keeps it. Set up then writes Emu's layout into the
    // emulator's own file for that player, through the helper, with Undo
    // while the map is open; Gopher64, which only it can bind, is opened at
    // its settings instead.
    const playerPick = $('emu-padmap-player');
    const most = read.most ?? 1;
    const taken = new Set(read.players.filter(p => p.bound).map(p => p.player));
    playerPick.replaceChildren(...Array.from({ length: SLOTS }, (_, i) => Object.assign(el('option', null, `Player ${i + 1}`), { value: String(i + 1) })));
    playerPick.value = String(mine.details.player ?? one?.player ?? (Array.from({ length: most }, (_, i) => i + 1).find(n => !taken.has(n)) ?? 1));
    const setupNote = $('emu-padmap-setup-note');
    // A controller that kept the chosen player swaps to this one's old one.
    playerPick.onchange = async () => {
      const player = Number(playerPick.value);
      const before = mine.details.player ?? one?.player;
      const others = [...(await padInfoNow())].filter(([id, row]) => id !== pad.id && row.details.player === player);
      mine.details.player = player;
      try {
        for (const [id, row] of others) await R.data.setController(id, row.name, { ...row.details, player: before ?? undefined });
      } catch (error) { say(error.message, { bad: true }); return; }
      if (!(await save())) return;
      setupNote.textContent = player > most ? `Player ${player} on every console. ${consoleName} has ${most === 1 ? 'one player' : `${most} players`}.`
        : one?.player === player ? `Player ${player} on every console.` : `Player ${player} on every console. Set up writes its buttons for player ${player} in ${read.emulator}.`;
    };
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
    showOriginal(pad, system, map, consoleName, mine.details.model);
  }
  // The console's own controller in the map: its photo, and while the map
  // is open, each press on the controller lights the button it is on that
  // console and says so. Read once a frame; a later map stops an earlier.
  let originalTurn = 0;
  function showOriginal(pad, system, map, consoleName, model) {
    const turn = ++originalTurn;
    const drawn = R.pads.drawOriginal(system);
    const art = $('emu-original-art'), said = $('emu-original-said');
    $('emu-original').hidden = !drawn;
    if (!drawn) return;
    art.innerHTML = drawn;
    said.textContent = Object.keys(map).length ? 'Press a button on your controller.' : `This controller is not set up for ${consoleName}, so a press does nothing there yet.`;
    const named = { ...R.pads.PRINTED[pad.family], ...(R.pads.MODELS[model]?.printed ?? {}),
      up: 'D-pad', down: 'D-pad', left: 'D-pad', right: 'D-pad', ls: 'left stick', rs: 'right stick' };
    const STICK = { l3: 'Left stick', r3: 'Right stick' };
    const tell = control => {
      const at = ['up', 'down', 'left', 'right'].includes(control) ? 'dpad' : control;
      const does = String(map[at] ?? '').split(' · ').filter(Boolean).map(d => (d === 'Press' ? `${STICK[control] ?? 'Stick'} press` : d));
      said.textContent = does.length ? `Your ${named[control] ?? control} is the ${consoleName}'s ${does.join(' and ')}.` : `Your ${named[control] ?? control} does nothing on the ${consoleName}.`;
    };
    const modal = $('emu-padmap-modal');
    let was = [];
    const watch = () => {
      if (turn !== originalTurn || !modal.classList.contains('is-visible')) return;
      const gp = navigator.getGamepads?.()[pad.index];
      const held = [];
      gp?.buttons.forEach((b, i) => { if (b.pressed && R.pads.CHROME[i]) held.push(R.pads.CHROME[i]); });
      if (Math.hypot(gp?.axes[0] ?? 0, gp?.axes[1] ?? 0) > 0.5) held.push('ls');
      if (Math.hypot(gp?.axes[2] ?? 0, gp?.axes[3] ?? 0) > 0.5) held.push('rs');
      if (held.join() !== was.join()) {
        const on = new Set(held.flatMap(c => R.pads.lit(system, map, c)));
        for (const n of art.querySelectorAll('[data-does]')) {
          const lit = on.has(n.dataset.does);
          n.classList.toggle('is-lit', lit);
          if (n.classList.contains('rux--tag')) { n.classList.toggle('rux--tag--blue', lit); n.classList.toggle('rux--tag--gray', !lit); }
        }
        const fresh = held.find(c => !was.includes(c));
        if (fresh) tell(fresh);
        was = held;
      }
      requestAnimationFrame(watch);
    };
    requestAnimationFrame(watch);
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
  // Words in the strip for `ms`, or until answered where `ms` is null; with
  // answers they wear a warning, unless `plain`.
  function say(text = '', { ms = 4000, bad = false, answers = [], plain = false } = {}) {
    clearTimeout(saidFor);
    const words = $('emu-said');
    if (text && (bad || (answers.length && !plain))) {
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
    if (text && ms != null) saidFor = setTimeout(say, ms);
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
  // The game goes into its console's drawing over the wall, with its own
  // picture on it. It is drawn over the page at the console's place, since
  // the title row clips what falls into it from above.
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
  // PLAY, the one way a game starts. A connected controller that needs a fix
  // stops it first, and the strip offers Fix it or Play anyway. An emulator
  // that counts controllers by place has every controller after player 1's
  // turned off before the game opens and on again once it has, so they
  // connect in player order. Saves that cannot be brought stop it, and the
  // strip asks: Try again, or Play anyway on this Mac's own saves. `how`
  // holds what rux already chose: { anyway, padsAnyway, orderAnyway }.
  async function play(g, how = {}) {
    if (starting) return;
    if (g !== game) choose(g.system, g);
    starting = keyOf(g);
    renderGo();
    try {
      if (!how.padsAnyway) {
        const mode = R.pads.modeOf(g.system, g);
        const needs = (await padBoxes(mode)).held.map((h, i) => [i + 1, h]).filter(([, h]) => h?.status.fix);
        if (needs.length) {
          const [player, h] = needs[0];
          sfx.no();
          say(`${needs.length > 1 ? `${needs.length} controllers need` : `The ${h.name} needs`} a fix for ${R.systemName(g.system)}: ${needs.length > 1 ? 'see the players' : `player ${player}, ${h.status.why}`}.`, { ms: LONG, answers: [
            ['Fix it', async () => { if (await fixPads(mode, needs)) play(g, how); }],
            ['Play anyway', () => play(g, { ...how, padsAnyway: true })]] });
          return;
        }
      }
      let late = how.orderAnyway ? [] : await lateControllers(g.system);
      if (late.length) {
        const names = late.map(c => `the ${c.name}`).join(' and ');
        const them = late.length > 1 ? 'them' : 'it';
        const told = { skipped: false };
        say(`Turn off ${names}. The game opens once ${late.length > 1 ? 'they are' : 'it is'} off; then turn ${them} on again${late.length > 1 ? ', in that order' : ''}.`,
          { ms: LONG, answers: [['Play anyway', () => { told.skipped = true; }]] });
        const off = await until(async () => told.skipped || !(await connectedKeys()).some(k => late.some(c => c.key === k)), 180000);
        // It stays until answered, so it is still there after a few minutes away.
        if (!off) {
          sfx.no();
          say(`Play stopped: ${names} stayed on.`, { ms: null, bad: true, answers: [['Try again', () => play(g, how)], ['Close']] });
          return;
        }
        if (told.skipped) late = [];
        say();
      }
      if (stateOf(g.system) === 'on') await insert(g);
      say('Starting…', { ms: 60000 });
      await R.thisMac.play(g, mutter, { anyway: how.anyway });
      sfx.start();
      sayPlaying({ emulator: emulatorOf(g.system), system: g.system, file: R.helper.fileOf(g) },
        late.length ? ` Turn ${late.map(c => `the ${c.name}`).join(', then ')} on again now.` : '', late.length ? 20000 : null);
      watchPlay(g);
    } catch (error) {
      sfx.no();
      if (error.notBrought) say(error.message, { ms: 30000, bad: true, answers: [['Try again', () => play(g, how)], ['Play anyway', () => play(g, { ...how, anyway: true })]] });
      else sayNo(error.message);
    } finally {
      starting = null;
      cards.at = 0;
      renderChosen();
    }
  }
  // WHILE A GAME PLAYS, its controllers play it and move nothing here, and
  // the strip names it with Stop whenever nothing else is said. The helper
  // is asked every three seconds, and it is let go once the emulator has
  // quit or, after Play, never showed. A game already playing when the page
  // opens is found the same way; a helper too old to say what plays is
  // asked only whether Play's emulator runs.
  let playingNow = null;
  let watching = false;
  let playSaid = '';
  // The name of the game playing, or null where Play did not open it.
  const playName = now => {
    const g = now?.system ? games.find(x => x.system === now.system && R.helper.fileOf(x) === now.file) : null;
    return g ? nameOf(g) : null;
  };
  function sayPlaying(now, extra = '', ms = null) {
    const name = playName(now);
    playSaid = `${name ? `Playing ${name}` : `${now.emulator} is open`}.${extra}`;
    say(playSaid, { ms, plain: true, answers: [['Stop', () => stopPlaying(now.emulator)]] });
  }
  async function stopPlaying(emulator) {
    playSaid = 'Stopping…';
    say(playSaid, { ms: LONG });
    try { await R.helper.quit(emulator); } catch (error) { sayNo(error.message); }
  }
  // A watch already running takes over a Play pressed meanwhile, which it
  // waits up to twenty seconds for, so no game goes unwatched.
  let played = null;
  let held = false;
  const hold = on => { if (on !== held) { R.pauseMoves(on, 'game'); held = on; } };
  async function watchPlay(g = null) {
    if (g) { played = { g, at: Date.now() }; hold(true); }
    if (watching || !R.helper) return;
    watching = true;
    let misses = 0;
    for (let first = true; ; first = false) {
      if (played || !first) await new Promise(r => setTimeout(r, 3000));
      // An answer that does not come says nothing, so the next one is asked
      // for; ten in a row, and the helper is gone.
      let now = await R.helper.playing().catch(() => undefined);
      if (now === undefined) { if (++misses >= 10) break; continue; }
      misses = 0;
      const last = played?.g ?? (playingNow?.system ? { system: playingNow.system, file: playingNow.file } : null);
      if (now === null && last) {
        const emulator = emulatorOf(last.system);
        now = (await R.helper.carry(emulator).catch(() => null))?.running
          ? { emulator, system: last.system, file: last.file ?? R.helper.fileOf(last) } : {};
      }
      if (now?.emulator) {
        playingNow = now;
        played = null;
        hold(true);
        if (!$('emu-strip').classList.contains('emu-strip--said')) sayPlaying(now);
      } else if (!played || Date.now() - played.at > 20000) break;
    }
    hold(false);
    if (playSaid && $('emu-said').textContent === playSaid) say();
    playSaid = '';
    playingNow = null;
    played = null;
    watching = false;
  }
  // The controllers to turn off before a game opens in an emulator that
  // counts them by place: with two or more connected, every one after the
  // first by kept player, up to the console's own players, as
  // { key, name } in player order. None where the emulator names them.
  async function lateControllers(system) {
    const emulator = emulatorOf(system);
    if (!R.helper?.controllers) return [];
    const report = await R.helper.controllers().catch(() => null);
    if (!report || report.length < 2 || !R.pads.byPlace(emulator, report)) return [];
    const info = await padInfoNow();
    const most = R.pads._readers[emulator]?.players ?? 1;
    const keyOfPad = c => `${c.vendor}:${c.product}`;
    const rank = c => info.get(keyOfPad(c))?.details?.player ?? SLOTS + 1;
    return [...report].sort((a, b) => rank(a) - rank(b)).slice(1, most).map(c => ({ key: keyOfPad(c), name: info.get(keyOfPad(c))?.name ?? c.name }));
  }
  const connectedKeys = async () => ((await R.helper.controllers().catch(() => null)) ?? []).map(c => `${c.vendor}:${c.product}`);
  // Waits, asking again every second and a half, until `done` says so or
  // `ms` pass; whether it did.
  async function until(done, ms) {
    const end = Date.now() + ms;
    while (!(await done())) {
      if (Date.now() > end) return false;
      await new Promise(r => setTimeout(r, 1500));
    }
    return true;
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
    const stops = playingNow?.emulator === emulator ? `${playName(playingNow) ?? 'Its game'} stops, and the ` : 'The ';
    say(`Remove ${emulator}? ${stops}${list(going)} ${going.length > 1 ? 'go' : 'goes'} with it. Your saves are kept.`,
      { ms: 20000, answers: [['Remove', () => remove(system)], ['Keep']] });
  }
  async function remove(system) {
    const emulator = emulatorOf(system);
    const going = playedBy(emulator);
    // A game playing in it is stopped first, so its saves are written before they are kept.
    const runs = async () => (await R.helper.carry(emulator).catch(() => null))?.running;
    if (await runs()) {
      say(`Stopping ${emulator}…`, { ms: LONG });
      await R.helper.quit(emulator).catch(() => null);
      if (!(await until(async () => !(await runs()), 30000))) { sayNo(`${emulator} did not quit, so it stays.`); return; }
    }
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
  // While a controller's map is open its presses light the console's own
  // controller instead, so they move and close nothing.
  R.onPad(move => {
    if (!helper || !game || $('emu-padmap-modal')?.classList.contains('is-visible')) return;
    const at = document.activeElement;
    if (move === 'b') { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); return; }
    if (panelOpen() || document.querySelector('.rux--modal.is-visible')) { if (move === 'a' && at?.matches('button')) at.click(); return; }
    // While the list of consoles is open, moves go among its consoles alone.
    const places = $('emu-consoles-pick').getAttribute('aria-expanded') === 'true' ? '#emu-consoles .emu-kit' : '#emu-consoles-pick, #emu-games .emu-cover';
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
      loaded(false);
      R.notice('Emu could not read the collection. Try again.');
      return;
    }
    // A game's status is what its panel shows of it.
    games = R.withNotes(rows, notes).map(g => ({ ...g, status: R.statusOf(g) }))
      .sort((a, b) => a.title.localeCompare(b.title));
    await takeMac(mac);
    loaded(games.length > 0);
    $('emu-empty').hidden = games.length > 0;
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
    try { localStorage.setItem(OPENS, chosen); } catch { /* the skeleton keeps the usual shape */ }
    where = isHere(game) ? 'mac' : 'all';
    renderSound();
    render();
    showChosen();
    if (helper) watchPlay();
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
