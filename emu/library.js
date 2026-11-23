/* ==========================================================================
   library.js — the Library, Emu's front page
   --------------------------------------------------------------------------
   One tile, read from the top down. Its head is the chosen console's wordmark
   and the strip; then a row of every console with games; then the chosen console's
   games, a wall of covers, the only part that scrolls; then the bar, which
   is the chosen game's: its name, its save, its controller, Details and one
   button, the one next move. Without Rux Emu Helper, such as on a phone,
   there is no head and no bar, and pressing a game opens its side panel,
   game-panel.js.

   One console and one game are chosen, always, and everything follows them.
   The page opens on the game last played that this Mac holds, and choosing a
   console chooses its last played game, else its first. Nothing about the
   page is kept.

   Which consoles are set up, and which games this Mac holds, are read from
   the helper. What this Mac lacks is faded with a download arrow, a console
   and a game alike. A console's menu, from a right click,
   has Set up or Remove, which the strip asks about first, naming every
   console that goes with its emulator.

   The strip, in the head, is the page's one place for words. At rest it
   shows this Mac as Carbon's icon indicators: the helper, the room this Mac
   has free and, once it is late, the server's nightly scan, each opening
   Status where it is wrong; while a move runs it names it, and after one it
   says what it did. Each move makes a small sound, made here with no sound
   files, which the head's button turns off, remembered in this browser.

   Save says which card the game will play, from carry.js; its list is the
   game's cards and Start a new save where the console's cards can move.
   Controller says the controller connected, as Chrome's Gamepad API has it.

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
  // The console and the game chosen.
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
  const inOrder = system => gamesOf(system).sort((a, b) => Number(isHere(b)) - Number(isHere(a))
    || Number(Boolean(b.notes?.favourite)) - Number(Boolean(a.notes?.favourite)));
  const lastPlayed = list => list.filter(playedAt).sort((a, b) => playedAt(b).localeCompare(playedAt(a)))[0] ?? null;
  const firstOf = system => lastPlayed(gamesOf(system)) ?? inOrder(system)[0];
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
  // jingle to play and a buzz for no. The button in the head turns it off.
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

  // A MENU ITEM, Design's: its label, and whether it can be pressed.
  function menuItem(menu, label, run, { off = false, danger = false } = {}) {
    const li = el('li', `rux--menu-item${danger ? ' rux--menu-item--danger' : ''}${off ? ' rux--menu-item--disabled' : ''}`);
    li.setAttribute('role', 'menuitem');
    li.setAttribute('aria-haspopup', 'false');
    li.tabIndex = off ? -1 : 0;
    if (off) li.setAttribute('aria-disabled', 'true');
    li.append(el('div', 'rux--menu-item__selection-icon'), el('div', 'rux--menu-item__icon'), el('div', 'rux--menu-item__label', label));
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
  // loaded art, or its name where it has none, and the shape its art gave
  // it, by its game; any other picture takes the old one showing its file.
  function redraw(parent, ...nodes) {
    const covers = new Map([...parent.querySelectorAll('.emu-cover[data-game]')].map(c => [c.dataset.game, c]));
    const shown = new Map();
    for (const img of parent.querySelectorAll('img')) if (!img.closest('.emu-cover-art') && !shown.has(img.src)) shown.set(img.src, img);
    for (const node of nodes) {
      if (!(node instanceof Element)) continue;
      for (const c of node.querySelectorAll('.emu-cover[data-game]')) {
        const was = covers.get(c.dataset.game);
        const old = was?.querySelector('.emu-cover-art > :is(img, .emu-cover-title)');
        if (!old || (old.matches('img') && !old.complete)) continue;
        covers.delete(c.dataset.game);
        c.querySelector('.emu-cover-art > :is(img, .emu-cover-title)')?.replaceWith(old);
        const box = was.style.getPropertyValue('--emu-box');
        if (box) c.style.setProperty('--emu-box', box); else c.style.removeProperty('--emu-box');
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
  // THE STRIP AT REST: this Mac as Carbon's icon indicators, only what it is
  // for. Connected while Rux Emu Helper answers, its version in its tooltip,
  // or "Update the helper", opening Status, where Supabase holds a newer
  // one; the room this Mac has free for games, a caution under LOW, or a
  // failure where a current helper keeps no library; and "Needs sync",
  // opening Status, only once the server's nightly scan is more than STALE
  // days old, one missed night's grace. In a narrow window only the summary
  // shows: the worst, or Ready.
  const LOW = 10e9;
  const STALE = 2;
  const INDICATOR = { ok: ['rux--icon-indicator--succeeded', '#i-checkmark--filled'], warn: ['rux--icon-indicator--caution-minor', '#i-warning--alt--filled'], bad: ['rux--icon-indicator--caution-major', '#i-warning--alt-inverted--filled'] };
  function indicator(kind, text, href = null, cls = '', title = '') {
    const li = el('li', `rux--icon-indicator ${cls}`.trim());
    if (title) li.title = title;
    const [status, icon] = INDICATOR[kind];
    const svg = iconOf(icon);
    svg.setAttribute('class', status);
    li.append(svg);
    if (href) { const a = el('a', 'rux--link', text); a.href = href; li.append(a); } else li.append(text);
    return li;
  }
  let stripSaid = '';
  function renderStrip() {
    const library = Boolean(helper.library);
    const behind = newestHelper != null && Number(helper.version) < Number(newestHelper);
    const days = driveRow?.scanned_at ? (Date.now() - new Date(driveRow.scanned_at)) / 864e5 : null;
    const facts = [
      behind ? ['warn', 'Update the helper', 'status.html', '', `Rux Emu Helper ${helper.version}, ${newestHelper} is out`]
        : ['ok', 'Connected', null, '', `Rux Emu Helper ${helper.version ?? ''}`.trim()],
      !library ? (behind ? null : ['bad', 'No library on this Mac', 'status.html']) : free == null ? null : [free < LOW ? 'warn' : 'ok', `${R.size(free)} free`],
      days == null || days > STALE ? ['warn', 'Needs sync', 'status.html', '', days == null ? 'The server has never scanned' : `The server's scan is late: last scanned ${R.when(driveRow.scanned_at)}`] : null,
    ].filter(Boolean);
    const worst = facts.find(f => f[0] === 'bad') ?? facts.find(f => f[0] === 'warn');
    // Drawn again only when what it says has changed, as the room free does while a game arrives.
    const said = JSON.stringify([facts, worst]);
    if (said === stripSaid) return;
    stripSaid = said;
    $('emu-strip-facts').replaceChildren(...facts.map(f => indicator(...f)),
      worst ? indicator(worst[0], worst[1], 'status.html', 'emu-strip__sum') : indicator('ok', 'Ready', 'status.html', 'emu-strip__sum'));
  }
  // THE CONSOLES, a row of every console with games, each its drawing, its
  // name only in its title, since the tile's head names the chosen one. That one stands on Carbon's selected layer. One not set up is
  // faded with a download arrow. The power light, on the drawing, is lit while
  // it is set up and flashes while it is set up or removed.
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
  function renderConsoles() {
    redraw($('emu-consoles'), ...consoles().map(system => {
      const state = stateOf(system);
      const b = el('button', `emu-kit emu-kit--${state}${system === chosen ? ' emu-kit--chosen' : ''}`);
      b.type = 'button';
      b.dataset.console = system;
      b.setAttribute('aria-pressed', String(system === chosen));
      b.title = BUSY[state]?.(system) ?? R.systemName(system);
      b.setAttribute('aria-label', state === 'away' ? `${R.systemName(system)}, not set up` : R.systemName(system));
      const spot = el('span', 'emu-kit__spot');
      spot.append(consoleOf(system));
      const at = LIGHT[system];
      if (at && ['on', 'setting', 'keeping'].includes(state)) {
        const light = el('i', `emu-light emu-light--${at[4]}`);
        light.style.cssText = `--emu-lx:${at[0]};--emu-ly:${at[1]};--emu-lw:${at[2]};--emu-lh:${at[3]}`;
        spot.append(light);
      }
      b.append(spot);
      if (state === 'away') b.append(awayMark('emu-kit__away'));
      b.addEventListener('click', () => choose(system));
      b.addEventListener('contextmenu', e => { if (!helper) return; e.preventDefault(); choose(system); openMenu(kitOf(system)); });
      const li = el('li');
      li.append(b);
      return li;
    }));
  }
  // The arrow on what this Mac lacks.
  const awayMark = cls => { const svg = iconOf('#i-download'); svg.setAttribute('class', cls); return svg; };

  // A CONSOLE'S MENU, Design's, from a right click on the console: Set up or
  // Remove, which the strip then asks about, or what it
  // is busy with. So no control is drawn on the row.
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

  // THE WALL, the chosen console's games as covers, with the console's
  // wordmark, or its name, in the tile's head.
  let marks = new Map();
  fetch('brand/marks.svg').then(r => (r.ok ? r.text() : '')).then(text => {
    marks = new Map([...new DOMParser().parseFromString(text, 'image/svg+xml').querySelectorAll('symbol')].map(s => [s.id, s]));
    if (games.length) renderGames();
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
  // The consoles whose boxes are wider than they are tall, so fewer go across.
  const WIDE = new Set(['snes', 'n64']);
  function coverItem(g) {
    const li = el('li');
    const s = stands(g);
    const key = keyOf(g);
    const away = helper && !isHere(g);
    const b = el('button', `emu-cover${away ? ' emu-cover--away' : ''}`);
    b.type = 'button';
    b.dataset.game = key;
    b.dataset.system = g.system;
    b.title = g.title;
    b.setAttribute('aria-label', `${nameOf(g)}${away ? ', on the server' : ''}`);
    if (helper) b.setAttribute('aria-pressed', String(g === game));
    const art = cover(g, 'emu-cover-art');
    if (waiting.has(key) || s.state === 'arriving') {
      const veil = el('span', 'emu-cover__veil');
      veil.style.blockSize = waiting.has(key) ? '100%' : veilOf(s);
      art.append(veil);
    }
    b.append(art);
    if (away) b.append(awayMark('emu-cover__away'));
    b.addEventListener('click', () => (helper ? pick(g) : openGame(g, b)));
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
    const ul = $('emu-games');
    ul.classList.toggle('emu-games__list--wide', WIDE.has(chosen));
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
    renderBar();
  }
  // The chosen console in its row's view, and, where the wall scrolls alone,
  // the chosen game in the wall's.
  function showChosen() {
    const row = $('emu-consoles');
    const kit = kitOf(chosen);
    if (kit) row.scrollLeft = Math.max(Math.min(row.scrollLeft, kit.parentElement.offsetLeft - row.offsetLeft - 8), kit.parentElement.offsetLeft - row.offsetLeft + kit.offsetWidth + 8 - row.clientWidth);
    if (helper) coverOf(game)?.scrollIntoView({ block: 'nearest' });
  }
  new ResizeObserver(() => { if (chosen) showChosen(); }).observe($('emu-consoles'));
  function pick(g) {
    game = g;
    for (const b of $('emu-games').querySelectorAll('.emu-cover')) b.setAttribute('aria-pressed', String(b.dataset.game === keyOf(g)));
    renderBar();
  }

  // THE BAR, the chosen game's: its name and when it was last played, its
  // save, its controller, Details, and one button, the one next move.
  const playedOf = g => {
    if (!playedAt(g)) return 'Not played yet';
    const day = d => new Date(d).toDateString();
    return day(playedAt(g)) === day(Date.now()) ? 'Played today' : `Played ${R.date(playedAt(g))}`;
  };
  function renderBar() {
    if (!helper || !game) return;
    $('emu-bar-name').textContent = nameOf(game);
    $('emu-bar-sub').textContent = stateOf(game.system) === 'away' && !isHere(game) ? `Download sets up the ${R.systemName(game.system)} too`
      : stands(game).state === 'failed' ? stands(game).error : playedOf(game);
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
    const b = $('emu-bar-go');
    b.textContent = words;
    b.disabled = !run || moving;
  }
  $('emu-bar-go').addEventListener('click', () => { const [, run] = nextOf(game); run?.(); });
  $('emu-bar-details').addEventListener('click', e => openGame(game, e.currentTarget));

  // SAVE AND CONTROLLER are each a button of three lines, what it is, what
  // will be used and a note, over a list that opens up from it, one at a time.
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
      write: ({ value, note = '', warn = false, off = false, hidden = false }) => {
        button.parentElement.hidden = hidden;
        button.querySelector('.emu-pick__value').textContent = value ?? '';
        const line = button.querySelector('.emu-pick__note');
        line.textContent = note;
        line.classList.toggle('emu-pick__note--warn', warn);
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
  const savePick = pickOf('emu-bar-save', fillSave);
  function writeSave() {
    const g = game;
    if (stateOf(g.system) === 'away' || stateOf(g.system) === 'setting') { savePick.write({ hidden: true }); return; }
    if (cards.system !== g.system) { savePick.write({ value: 'Reading…', off: true }); return; }
    if (cards.error) { savePick.write({ value: 'Could not be read', off: true }); return; }
    if (!cards.read) { savePick.write({ value: 'On this Mac', note: 'Not kept in Supabase', off: true }); return; }
    const mine = mineOf(g);
    const two = aside?.key === keyOf(g) && aside.other.length > 0;
    if (!mine.in && !cards.read.moves) { savePick.write({ value: wordOf(g.system), note: unsaid(g), off: moving }); return; }
    savePick.write({ value: mine.in ? mine.in.name ?? wordOf(g.system) : 'New save',
      note: two ? 'Two saves found' : mine.in ? cardNote(mine.in) : mine.out.length ? `${mine.out.length} put away` : 'Starts when you play', warn: two, off: moving });
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
  // A move on a card: said as it goes, the bar held until it is done.
  async function moveCard(doing, done, run) {
    savePick.close({ restoreFocus: true });
    moving = true;
    renderBar();
    say(doing, { ms: 600000 });
    try { await run(); sfx.done(); say(done); } catch (error) { console.error(error); sfx.no(); sayNo(error.message); }
    moving = false;
    cards.at = 0;
    renderBar();
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

  // CONTROLLER: each one this Mac sees through Chrome's Gamepad API, named as
  // its maker names it, its maker's numbers left off. Chrome shows one to a
  // page only once a button on it is pressed. Its button layout is its
  // emulator's own, so the list says where that is set.
  const padsNow = () => [...(navigator.getGamepads?.() ?? [])].filter(Boolean)
    .map(p => p.id.replace(/\s*\(.*\)\s*$/, '').replace(/^[0-9a-f]{4}-[0-9a-f]{4}-/i, '').trim() || 'Controller');
  const padPick = pickOf('emu-bar-pad', pop => {
    const pads = padsNow();
    pop.replaceChildren(popList('Controllers', ...(pads.length ? pads.map(name => popRow(name, 'Connected')) : [popRow('None seen yet', 'Press a button on one')])),
      el('p', 'emu-pop__note', `Buttons are set in ${emulatorOf(game.system)}.`));
  });
  function renderPad() {
    if (!game) return;
    const pads = padsNow();
    padPick.write({ hidden: ['away', 'setting'].includes(stateOf(game.system)), value: pads[0] ?? 'Press a button', note: pads.length > 1 ? `Connected, and ${pads.length - 1} more` : pads.length ? 'Connected' : 'To see a controller' });
    padPick.refill();
  }
  for (const type of ['gamepadconnected', 'gamepaddisconnected']) window.addEventListener(type, renderPad);

  function render() {
    const mac = Boolean(helper);
    for (const id of ['emu-strip', 'emu-sound', 'emu-bar']) $(id).hidden = !mac;
    $('emu-library').classList.toggle('emu-library--mac', mac);
    if (mac) renderStrip();
    renderConsoles();
    renderGames();
    renderBar();
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
    asking = answers.length > 0;
    if (text) saidFor = setTimeout(say, ms);
    else if (untold) { const told = untold; untold = null; say(told); }
  }
  // What a game's saves say as they are carried, which may come long after
  // Play: it waits for a question's answer rather than taking its place.
  let asking = false;
  let untold = null;
  const mutter = text => { if (asking) untold = text; else say(text); };
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
  // The game goes into its console in the row, with its own picture on it. It
  // is drawn over the page at the console's place, since the row clips what
  // falls into it from above.
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
      say('Starting…', { ms: 600000 });
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
    renderBar();
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
    say(`Keeping ${emulator}'s saves and settings…`, { ms: 600000 });
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
    say(`Setting up ${emulator}…`, { ms: 600000 });
    let failed = null;
    try {
      const installer = R.installerOf(await R.data.files(), emulator);
      if (!installer) throw new Error(`Supabase holds no installer for ${emulator}.`);
      await R.carry.setUp(emulator, installer, R.keptVersion(installer),
        part => say(part === 'install' ? `Installing ${emulator}…` : `Making ${emulator} ready…`, { ms: 600000 }));
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
      for (const b of $('emu-consoles').querySelectorAll('[data-console]')) b.classList.toggle('emu-kit--dim', b.dataset.console !== drag.g.system);
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
  // The hold over: the word, the lights and the dimming gone.
  function letGo() {
    const d = drag;
    drag = null;
    word.hidden = true;
    unlight();
    for (const b of $('emu-consoles').querySelectorAll('.emu-kit--dim')) b.classList.remove('emu-kit--dim');
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
  const openGame = (g, from) => {
    opener = from;
    R.gamePanel.open(g, { saves, onSaved: render, top: [cover(g, 'emu-panel-art')],
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
    if (!at?.matches('#emu-consoles .emu-kit, #emu-games .emu-cover')) { coverOf(game)?.focus(); return; }
    if (move === 'a') { if (at.dataset.game === keyOf(game)) $('emu-bar-go').click(); else at.click(); return; }
    const middle = n => { const r = n.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
    const [x, y] = middle(at);
    const [dx, dy] = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[move];
    let best = null, least = Infinity;
    for (const n of document.querySelectorAll('#emu-consoles .emu-kit, #emu-games .emu-cover')) {
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
      .sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
    await takeMac(mac);
    $('emu-loading')?.remove();
    $('emu-empty').hidden = games.length > 0;
    $('emu-library').hidden = games.length === 0;
    if (!games.length) return;
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
