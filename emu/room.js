/* ==========================================================================
   room.js — the Library as a room, Emu's front page
   --------------------------------------------------------------------------
   Where Rux Emu Helper answers, the page is one tile, the room's: its head,
   then the room, Your Mac: the TV, up to three consoles and the favourite
   games they bring out, each standing where it was left, with My Stuff's
   button at its foot. The head's one button opens Rux's Server, the store,
   as Carbon's large modal. Without the helper the store is the whole page.

   A console has three places. In Rux's Server it is not on this Mac; in My
   Room it is set up and put away; in the room it is out. Which consoles
   are out, and where each thing in the room stands, is this Mac's room,
   kept on its row in Supabase; whether a console is set up is read from the
   helper. Pressing or right-clicking a console opens its menu: one set up
   has Put away, and Remove, which the strip asks about before the emulator's
   saves and settings are kept and it is taken off this Mac; one not set up
   has Set up, which installs its emulator, and Put back. Its power light,
   on its drawing, is lit while it is set up and flashes on and off while
   it is set up or removed, while the strip says how far it has got, and a
   home console is wired to the TV as it is set up. Its name shows under
   the pointer or the keyboard.

   The strip, in the head after the room's name, is the room's one place for
   words. At rest it shows this Mac as Carbon's icon indicators: the helper,
   the collection it found, the room this Mac has free and when Update last
   saved, each opening Status where it is wrong; while a move runs it names
   it, after one it says what it did, with Undo where it can be taken back,
   and it asks before an emulator is removed. The TV's glass shows only a
   home console's game, its cover once it starts, a wire running to the TV
   from its console. The TV's knobs, or a press on its case, open its menu:
   the other pages, Search and Sound, which the header holds only where
   there is no room, then Tidy up and Put everything away.

   A console that is out and set up brings its favourites out: the
   favourites of its system this Mac holds, fewer each as more consoles are
   out. They hop out of it and land around it, and each stays where it
   landed or was left until its console is put away.

   Rux's Server has two tabs of cards. Consoles is every console with
   games, its drawing from brand/consoles/ over its name and count; Games is
   the chosen console's games as covers, A to Z or favourites first. Each
   card has Download, or "On this Mac" where it is: on a console it sets up
   its emulator and brings it into the room while fewer than three are out,
   on a game it downloads it, setting up its console first where it must. A
   console's card, pressed off its button, turns to its games; a game's
   cover opens its side panel, game-panel.js, and the store comes back when
   the panel closes. ?game=<system>/<title>, from Search or Problems, picks
   that game's console and opens its panel.

   My Stuff is a button at the room's foot that opens a panel up over it,
   closed each time the page loads. Its toolbar is its name, then Saves and
   Close. Its body is two rows that scroll sideways: every console set up on
   this Mac, one out in the room faint, any other dragged or pressed to
   bring it out; then this Mac's games, favourites first, one still arriving
   under a veil that lifts as it comes. Saves shows in their place the
   picked console's saves as cards: each game's, the one in it and those
   out, with Take out, Put in and a name to change, then the console's own.

   A thing in the room is itself carried with the pointer, and anything
   from My Stuff is held as a copy. A word follows it and says what letting
   go will do, and a place it would land lights where that place is one
   thing, never the room as a whole. A console onto the room comes out where
   it is let go, a fourth refused, and onto My Stuff it is put away. A game
   onto its console or the TV plays it. A console it does not fit says so
   in red and nothing happens. A game is taken off this Mac from its side
   panel.

   A smaller window sweeps the room's things into a pile, which stays. The
   wrong console shakes its head and says a line. A game played goes in
   first as it would on the real console: a cartridge drops into its slot, a
   disc slides onto a tray. Each move makes a small sound, made here with no
   sound files, which the header's button turns off, remembered in this
   browser. docs/plans/emu-room.md is what the room is still to do.
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
  // This Mac's name on its row in Supabase, and its room as kept there: each
  // console standing in it, true while plugged in; null until one is moved.
  let macName = null;
  let room = null;
  // The drive's row from the last Update saved, for when that was, and the
  // version of Rux Emu Helper Supabase holds, the one a Mac should run.
  let driveRow = null;
  let newestHelper = null;
  // Consoles whose emulator is being set up now.
  const settingUp = new Set();
  // Consoles whose emulator is being taken off this Mac now, its saves and
  // settings kept first.
  const keeping = new Set();
  // The consoles standing in the room as drawn, each 'on', 'off', 'setting' or 'keeping'.
  let stand = new Map();

  const keyOf = g => `${g.system}/${g.title}`;
  const countOf = n => `${n} ${n === 1 ? 'game' : 'games'}`;
  const gamesOf = system => games.filter(g => g.system === system);
  // Whether this Mac has a system's emulator, where a helper answers.
  const plays = system => Boolean(helper?.systems?.includes(system));
  // A drive with the games plugged into this Mac, which a game plays from unheld.
  const drive = () => Boolean(helper?.collection) && (!keeps || !helper.collection.network);
  // The handhelds, which light their own screens; every other console plays on the TV.
  const HANDHELD = new Set(['gb', 'gbc', 'gba', 'nds', 'n3ds']);
  // Games to play as soon as they have arrived, by key.
  const wanted = new Set();
  // How a game stands on this Mac, as the helper last said.
  const standing = g => stands(g);
  const emulatorOf = system => emulators?.systems?.[system]?.emulator ?? null;
  // The games this Mac holds or is being sent, each with how it stands.
  const mineNow = () => games.map(g => [g, standing(g)]).filter(([, st]) => st.state === 'held' || st.state === 'arriving');
  // Where each thing in the room stands, by its system or `tv` for the TV:
  // its top-left corner in art pixels from the room's top-left, kept under
  // `placed`. A thing stays where it was left or pushed, whatever the
  // window does after.
  const placed = () => room?.placed ?? {};
  // Where a thing with no place yet starts, as a share of the room across
  // and down: the TV in the middle of the room, and a console at the first
  // of these that nothing covers, in a row under the TV from the middle
  // outward, then along the room's foot, then beside the TV. A room kept as
  // shares, under `places`, starts each thing from its share.
  const SLOTS = [0.85, 1].flatMap(y => [0.5, 0.3, 0.7, 0.1, 0.9].map(x => [x, y])).concat([[0.05, 0.5], [0.95, 0.5], [0.05, 0.15], [0.95, 0.15]]);
  const shareOf = key => room?.places?.[key] ?? (key === 'tv' ? [0.5, 0.5] : null);
  // Which consoles are out in the room, as it would be kept: its own, and
  // none where it was never kept. A room kept before things stood anywhere
  // in it has a `floor` or `spots`, which are dropped.
  const wishes = () => {
    if (!room) return {};
    const { floor, spots: old, places, placed: at, ...wish } = room;
    return wish;
  };
  // Each console out in the room, in the collection's order: 'on' where this
  // Mac has its emulator, 'off' where it is not set up yet, 'setting' while
  // it is set up and 'keeping' while its emulator is taken off.
  const consolesNow = () => {
    const wish = wishes();
    return new Map(Object.keys(R.SYSTEMS).filter(sys => sys in wish)
      .map(sys => [sys, settingUp.has(sys) ? 'setting' : keeping.has(sys) ? 'keeping' : plays(sys) ? 'on' : 'off']));
  };
  // At most this many consoles are out at once, and each that is set up
  // brings this many of its favourites out, by how many consoles are out, so
  // the floor holds about twelve covers.
  const CAP = 3;
  const BRINGS = [0, 8, 6, 4];
  // The games out on the floor: for each console that is out and set up, the
  // favourites of its system this Mac holds or is being sent, A to Z.
  const floorGames = () => [...stand].filter(([, state]) => state === 'on').flatMap(([system]) => games
    .filter(g => g.system === system && g.notes?.favourite && ['held', 'arriving'].includes(standing(g).state))
    .slice(0, BRINGS[Math.min(stand.size, CAP)]));
  const floorKey = g => `game:${keyOf(g)}`;

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
  // thunk and a rising tone to plug in, a chime when something is done, a
  // jingle to play and a buzz for no. The TV's menu turns it off.
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
    bump: () => tone(140, 0.05, 'square', 0.05),
    insert: () => { tone(180, 0.04, 'square', 0.1); later(50, () => tone(240, 0.05, 'square', 0.08)); },
    start: () => [523, 659, 784].forEach((f, i) => later(i * 90, () => tone(f, 0.14, 'triangle', 0.07))),
    no: () => tone(110, 0.28, 'sawtooth', 0.07, 80),
    done: () => [784, 1047].forEach((f, i) => later(i * 80, () => tone(f, 0.12, 'sine', 0.06))),
  };
  function toggleSound() {
    loud = !loud;
    try { localStorage.setItem(KEPT, loud ? 'on' : 'off'); } catch { /* it lasts until the page closes */ }
    sfx.pick();
  }

  // A MENU ITEM, Design's, for the console's menu and the TV's alike: its
  // label, and an icon where the menu has them.
  function menuItem(menu, label, run, { off = false, danger = false, icon = null, role = 'menuitem', checked = null, shortcut = null } = {}) {
    const li = el('li', `rux--menu-item${danger ? ' rux--menu-item--danger' : ''}${off ? ' rux--menu-item--disabled' : ''}`);
    li.setAttribute('role', role);
    li.setAttribute('aria-haspopup', 'false');
    if (checked != null) li.setAttribute('aria-checked', String(checked));
    li.tabIndex = off ? -1 : 0;
    if (off) li.setAttribute('aria-disabled', 'true');
    const at = el('div', 'rux--menu-item__icon');
    if (icon) at.append(icon);
    li.append(el('div', 'rux--menu-item__selection-icon'), at, el('div', 'rux--menu-item__label', label));
    if (shortcut) li.append(el('div', 'rux--menu-item__shortcut', shortcut));
    if (!off) li.addEventListener('click', () => { window.Rux.menu.close(menu); run(); });
    return li;
  }
  // An icon by its whole name, `#m-…`, so the sprite's scan finds it.
  const iconOf = href => {
    const svg = useOf(svgOf('', '0 0 32 32'), href.slice(1));
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    return svg;
  };
  // THE TV'S MENU, under its knobs: the other pages, as the header's menu
  // lists them, then Search and Sound, then Tidy up and Put everything away.
  // So the room's header holds only the account, and the TV is how the room
  // goes anywhere else and tidies itself.
  function openTvMenu() {
    const menu = $('emu-tv-menu');
    const knobs = $('emu-tv-knobs');
    if (window.Rux.menu.isOpen(menu)) { window.Rux.menu.close(menu); return; }
    const pages = [...document.querySelectorAll('.rux--side-nav__link')].filter(a => !a.hasAttribute('aria-current')).map(a => {
      const icon = a.querySelector('svg').cloneNode(true);
      return menuItem(menu, a.textContent.trim(), () => { location.href = a.href; }, { icon });
    });
    const divider = () => {
      const li = el('li', 'rux--menu-item-divider');
      li.setAttribute('role', 'separator');
      return li;
    };
    menu.replaceChildren(...pages, divider(),
      menuItem(menu, 'Search games', () => window.Rux.modal.open('emu-search-modal', knobs), { icon: iconOf('#i-search'), shortcut: '⌘K' }),
      menuItem(menu, 'Sound', toggleSound, { icon: iconOf(loud ? '#m-volume_up' : '#m-volume_off'), role: 'menuitemcheckbox', checked: loud }),
      divider(), menuItem(menu, 'Tidy up', tidy), menuItem(menu, 'Put everything away', putAllAway, { off: !stand.size }));
    window.Rux.menu.open(menu, knobs);
  }
  $('emu-tv-knobs').addEventListener('click', openTvMenu);
  // A press on the TV's case opens it too, but not one on its knobs, which open it themselves, or one that carried it.
  $('emu-tv').addEventListener('click', e => { if (!e.target.closest('a, button')) openTvMenu(); });
  $('emu-tv').addEventListener('contextmenu', e => { e.preventDefault(); openTvMenu(); });

  // A console's drawing: its PNG in brand/consoles/, shown pixel for pixel
  // in its own colours, the same in every theme. app.css sizes it by its
  // height, 24 art pixels, so a handheld is as wide as it was drawn.
  function consoleOf(system, hand) {
    const img = el('img', hand ? 'emu-console emu-console--hand' : 'emu-console');
    img.src = `brand/consoles/${system}.png`;
    img.alt = '';
    img.draggable = false;
    return img;
  }
  // The consoles standing in the room.
  const units = () => $('emu-room').querySelectorAll('.emu-unit');
  const unitOf = system => $('emu-room').querySelector(`.emu-unit[data-system="${system}"]`);

  // A game's cover as the button that opens it, its name beneath.
  function coverItem(g) {
    const li = el('li');
    const b = el('button', 'emu-cover');
    b.type = 'button';
    b.dataset.game = keyOf(g);
    b.dataset.system = g.system;
    b.title = g.title;
    b.append(cover(g, 'emu-cover-art'));
    b.append(el('span', 'emu-cover-name', nameOf(g)));
    b.addEventListener('click', () => openGame(g));
    li.append(b);
    return li;
  }

  // YOUR MAC -----------------------------------------------------------------
  // A console standing where it was left in the room: its drawing, a button
  // that is dragged and, pressed or right-clicked, opens its menu. Its power
  // light is lit on the drawing while it is on, blinks while its emulator
  // is set up, and is the drawing's own unlit pixel while it is off, the
  // whole drawing dimmed. Its name is a tag that shows under the pointer or
  // the keyboard, and while it is set up.
  const UNIT = { on: 'emu-unit', off: 'emu-unit emu-unit--off', setting: 'emu-unit emu-unit--setting', keeping: 'emu-unit emu-unit--setting' };
  const BUSY = { setting: system => `Setting up ${emulatorOf(system)}…`, keeping: system => `Removing ${emulatorOf(system)}…` };
  // Where each console's power light is on its drawing, in art pixels from
  // its top-left, how many pixels it covers, and its colour as the real
  // console's light: error is red, success green, warning orange, info blue.
  const LIGHT = {
    nes: [4, 21, 1, 1, 'error'], snes: [3, 19, 1, 1, 'error'], n64: [17, 21, 2, 1, 'error'], gc: [8, 3, 2, 2, 'warning'],
    wii: [15, 8, 2, 1, 'success'], wiiu: [28, 21, 1, 1, 'info'], switch: [9, 21, 1, 1, 'success'], gb: [2, 5, 1, 1, 'error'],
    gbc: [2, 5, 1, 1, 'error'], gba: [21, 12, 1, 1, 'success'], nds: [18, 4, 1, 1, 'success'], n3ds: [3, 13, 2, 2, 'info'],
    psx: [4, 14, 3, 1, 'success'], ps2: [32, 17, 1, 1, 'success'], xbox: [17, 18, 2, 2, 'success'],
  };
  function unit(system, state) {
    const called = R.systemName(system);
    const hand = HANDHELD.has(system);
    const li = el('li', hand ? `${UNIT[state]} emu-unit--hand` : UNIT[state]);
    li.dataset.system = system;
    const body = el('button', 'emu-unit__console');
    body.type = 'button';
    body.dataset.console = system;
    body.setAttribute('aria-haspopup', 'menu');
    body.setAttribute('aria-label', `${called}, ${state === 'on' ? 'ready to play' : state === 'setting' ? 'being set up' : state === 'keeping' ? 'being removed' : 'not set up'}`);
    body.append(consoleOf(system, hand));
    const at = LIGHT[system];
    if (at) {
      const light = el('i', `emu-light emu-light--${at[4]}`);
      light.style.cssText = `--emu-lx:${at[0]};--emu-ly:${at[1]};--emu-lw:${at[2]};--emu-lh:${at[3]}`;
      body.append(light);
    }
    body.addEventListener('click', () => { choose(system); openMenu(system, body); });
    body.addEventListener('contextmenu', e => { e.preventDefault(); choose(system); openMenu(system, body); });
    li.append(body, el('span', 'emu-unit__name', called));
    return li;
  }
  // A CONSOLE'S MENU, Design's menu under the console. One that is set up
  // has Put away, which is harmless, and Remove, which the strip then asks
  // about; one that is not has Set up and Put back. So no control is drawn
  // on the room, and an emulator is never taken off in one press.
  function openMenu(system, trigger) {
    const menu = $('emu-console-menu');
    window.Rux.menu.close(menu);
    const state = stand.get(system);
    const emulator = emulatorOf(system);
    const item = (label, run, opts) => menuItem(menu, label, run, opts);
    menu.setAttribute('aria-label', R.systemName(system));
    menu.replaceChildren(...(BUSY[state] ? [item(BUSY[state](system), null, { off: true })]
      : state === 'on' ? [item('Put away', () => putAway(system)), item(`Remove ${emulator} from this Mac`, () => askRemove(system), { danger: true })]
      : [item(`Set up ${R.systemName(system)}`, () => setUp(system)), item('Put back', () => putBack(system))]));
    window.Rux.menu.open(menu, trigger);
  }
  // A favourite out on the floor: its cover as the button that opens it and
  // is carried, its name a tag as a console's is, under a veil while it
  // arrives. Its width follows its art, so the room settles again as the art loads.
  function floorCover(g) {
    const li = coverItem(g);
    li.className = 'emu-floor-cover';
    li.dataset.key = floorKey(g);
    li.dataset.of = g.system;
    const s = standing(g);
    if (s.state === 'arriving') {
      const veil = el('span', 'emu-cover__veil');
      veil.style.blockSize = `${Math.round(100 - (s.total ? s.done / s.total : 0) * 100)}%`;
      li.querySelector('.emu-cover-art').append(veil);
    }
    li.querySelector('img')?.addEventListener('load', () => requestAnimationFrame(() => { if (li.isConnected && !drag?.on) settle(); }));
    li.append(el('span', 'emu-unit__name', nameOf(g)));
    return li;
  }
  const thingOf = key => $('emu-units').querySelector(`[data-key="${CSS.escape(key)}"]`);
  // The art pixel: three CSS pixels where the TV, 80 art pixels wide, takes
  // at most half the room's width, else two.
  const pxOf = () => (80 * 3 <= $('emu-room').getBoundingClientRect().width / 2 ? 3 : 2);
  // THE STRIP AT REST: this Mac as Carbon's icon indicators. The helper and
  // its version, a caution opening Status where Supabase holds a newer one;
  // the collection it found, a drive or the home server's share, or none,
  // which is only quiet where this Mac keeps a library to play from; the
  // room this Mac has free for games, a caution under LOW, or a caution
  // where a current helper keeps no library; and when Update last saved, a
  // caution after STALE days. In a narrow window only the summary shows: the
  // worst, or Ready.
  const LOW = 10e9;
  const STALE = 30;
  const INDICATOR = { ok: ['rux--icon-indicator--succeeded', '#i-checkmark--filled'], off: ['rux--icon-indicator--not-started', '#i-circle-dash'], warn: ['rux--icon-indicator--caution-minor', '#i-warning--alt--filled'], bad: ['rux--icon-indicator--caution-major', '#i-warning--alt-inverted--filled'] };
  function indicator(kind, text, href = null, cls = '') {
    const li = el('li', `rux--icon-indicator ${cls}`.trim());
    const [status, icon] = INDICATOR[kind];
    const svg = iconOf(icon);
    svg.setAttribute('class', status);
    li.append(svg);
    if (href) { const a = el('a', 'rux--link', text); a.href = href; li.append(a); } else li.append(text);
    return li;
  }
  function renderStrip() {
    const found = helper.collection;
    const library = Boolean(helper.library);
    const behind = newestHelper != null && Number(helper.version) < Number(newestHelper);
    const days = driveRow?.scanned_at ? (Date.now() - new Date(driveRow.scanned_at)) / 864e5 : null;
    const facts = [
      behind ? ['warn', `Helper ${helper.version}, update to ${newestHelper}`, 'status.html'] : ['ok', `Helper ${helper.version ?? ''}`.trim()],
      found ? ['ok', found.network ? 'Server share' : `Drive ${found.drive}`] : library ? ['off', 'No drive'] : ['bad', 'No games on this Mac', 'status.html'],
      !library ? (behind ? null : ['warn', 'No library on this Mac', 'status.html']) : free == null ? null : [free < LOW ? 'warn' : 'ok', `${R.size(free)} free`],
      days == null ? ['warn', 'Never updated', 'status.html'] : [days > STALE ? 'warn' : 'ok', `Updated ${R.when(driveRow.scanned_at)}`, 'status.html'],
    ].filter(Boolean);
    const worst = facts.find(f => f[0] === 'bad') ?? facts.find(f => f[0] === 'warn');
    $('emu-strip-facts').replaceChildren(...facts.map(f => indicator(...f)),
      worst ? indicator(worst[0], worst[1], 'status.html', 'emu-strip__sum') : indicator('ok', 'Ready', 'status.html', 'emu-strip__sum'));
  }
  function renderRoom() {
    const mac = Boolean(helper);
    $('emu-room').hidden = !mac;
    $('emu-head').hidden = !mac;
    $('emu-mine').hidden = !mac;
    $('emu-mine-open').hidden = !mac || stuffOpen;
    $('emu-wall').classList.toggle('emu-wall--mac', mac);
    // The store is the modal's where the room is, and the page where it is not.
    const home = mac ? $('emu-store-body') : $('emu-wall');
    if ($('emu-collection').parentElement !== home) home.prepend($('emu-collection'));
    if (!mac) window.Rux.modal.close('emu-store');
    // Where the room is, the TV's menu holds the pages and Search, so the header does not.
    $('emu-menu-open').hidden = mac;
    $('emu-search-open').hidden = mac || !R.data;
    if (!mac) return;
    $('emu-room').style.setProperty('--emu-px', `${pxOf()}px`);
    renderStrip();
    stand = consolesNow();
    // Each thing starts where it was last drawn, so a move slides from there.
    const from = (li, key) => { if (drawn[key]) { li.style.setProperty('--emu-left', drawn[key][0]); li.style.setProperty('--emu-top', drawn[key][1]); } return li; };
    $('emu-units').replaceChildren(...[...stand].map(([system, state]) => from(unit(system, state), system)),
      ...floorGames().map(g => from(floorCover(g), floorKey(g))));
    // The thing just put down lands.
    const landing = landed === 'tv' ? $('emu-tv') : landed && (unitOf(landed) ?? thingOf(landed));
    landed = null;
    if (landing) { landing.classList.remove('emu-lands'); void landing.offsetWidth; landing.classList.add('emu-lands'); }
    $('emu-floor-empty').hidden = stand.size > 0;
    settle();
    renderMine();
  }
  // THE WIRE, from a home console to the TV, while its game's cover is on
  // the glass or while it is being set up: out of the console's back and
  // into the TV's foot. It draws itself in from the console each time it
  // is plugged in.
  let wire = null;
  let wired = null;
  function drawWire() {
    const svg = $('emu-wire');
    const to = wire ?? [...settingUp].find(sys => !HANDHELD.has(sys) && unitOf(sys)) ?? null;
    const u = to && unitOf(to)?.querySelector('.emu-console');
    svg.style.display = u ? 'block' : 'none';
    const fresh = Boolean(u) && wired !== to;
    wired = u ? to : null;
    if (!u) return;
    const r = $('emu-room').getBoundingClientRect();
    const a = u.getBoundingClientRect();
    const b = $('emu-tv').getBoundingClientRect();
    const [x1, y1, x2, y2] = [a.left + a.width / 2 - r.left, a.top - r.top + 2, b.left + b.width / 2 - r.left, b.bottom - r.top - 2].map(Math.round);
    svg.firstElementChild.setAttribute('d', `M${x1} ${y1} C ${x1} ${y1 - 36}, ${x2} ${y2 + 48}, ${x2} ${y2}`);
    if (!fresh) return;
    svg.classList.add('emu-wire--plug');
    void svg.getBoundingClientRect();
    svg.classList.remove('emu-wire--plug');
  }
  // THE SWEEP. The TV, the consoles and the covers are things on the floor. Each starts
  // where it was kept; the room's edges push whatever is past them back in,
  // and whatever then overlaps moves to the nearest free spot, so a smaller
  // window sweeps them into a pile, touching but not overlapping while the
  // room can hold them. The thing just moved holds still and the others
  // make room. Where a sweep
  // moved anything, the room is kept as it now stands, so nothing returns
  // when the window grows: things are put back by hand. A room never kept
  // is laid out afresh each time and not kept by a sweep.
  let held = null;
  // The thing just put down, which lands as the room is next drawn.
  let landed = null;
  // Whether this sweep is the window's, which is when things that bump say so.
  let windowSweep = false;
  let bumped = 0;
  // Where each thing is drawn, in art pixels, after the last sweep.
  let drawn = {};
  let sweptFor = 0;
  function settle() {
    const px = pxOf();
    const box = $('emu-units');
    const W = box.clientWidth / px;
    const H = box.clientHeight / px;
    const kept = placed();
    const items = [['tv', $('emu-tv')], ...[...box.children].map(li => [li.dataset.key ?? li.dataset.system, li])].map(([key, node]) => {
      const at = kept[key];
      return { key, node, w: node.offsetWidth / px, h: node.offsetHeight / px, x: at?.[0] ?? 0, y: at?.[1] ?? 0, loose: !at, still: key === held };
    });
    const inside = n => { n.x = Math.min(Math.max(0, n.x), Math.max(0, W - n.w)); n.y = Math.min(Math.max(0, n.y), Math.max(0, H - n.h)); };
    const over = (a, b) => [Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)];
    const clear = n => items.every(m => m === n || m.loose || over(n, m).some(o => o <= 0));
    // A thing with no place takes its share, or the first slot nothing
    // covers. A cover with none lands around its console, each a step
    // further round it, and is drawn hopping out from the console's middle.
    for (const n of items.filter(i => i.loose)) {
      const home = n.node.dataset.of && items.find(m => m.key === n.node.dataset.of);
      if (home) {
        const mates = items.filter(m => m.node.dataset.of === home.key);
        const turn = (mates.indexOf(n) / mates.length) * 2 * Math.PI + 0.5;
        n.x = home.x + home.w / 2 + Math.cos(turn) * 46 - n.w / 2;
        n.y = home.y + home.h / 2 + Math.sin(turn) * 32 - n.h / 2;
        n.pop = [home.x + home.w / 2 - n.w / 2, home.y + home.h / 2 - n.h / 2];
        n.loose = false;
        continue;
      }
      const share = shareOf(n.key);
      for (const [sx, sy] of share ? [share] : SLOTS) {
        n.x = sx * (W - n.w);
        n.y = sy * (H - n.h);
        if (clear(n)) break;
      }
      n.loose = false;
    }
    // The edges push in whatever is past them. Then each thing, the one just
    // moved first and then those the edges pushed least, keeps its spot if
    // nothing placed covers it, else takes the nearest free spot beside what
    // is placed, so a pile packs edge to edge. Where none is free it stays
    // where the edge left it.
    for (const n of items) { n.want = [n.x, n.y]; inside(n); n.shove = Math.hypot(n.x - n.want[0], n.y - n.want[1]); n.edge = [n.x, n.y]; }
    const order = [...items].sort((a, b) => Number(b.still) - Number(a.still) || a.shove - b.shove || a.y - b.y || a.x - b.x);
    const done = [];
    const fits = n => n.x >= 0 && n.y >= 0 && n.x + n.w <= W + 0.01 && n.y + n.h <= H + 0.01 && done.every(m => over(n, m).some(o => o <= 0.01));
    for (const n of order) {
      const [x0, y0] = [n.x, n.y];
      const xs = [x0, 0, W - n.w, ...done.flatMap(m => [m.x - n.w, m.x + m.w])];
      const ys = [y0, 0, H - n.h, ...done.flatMap(m => [m.y - n.h, m.y + m.h])];
      let best = null;
      for (const x of xs) {
        for (const y of ys) {
          const d = Math.hypot(x - x0, y - y0);
          if (best && d >= best[2]) continue;
          Object.assign(n, { x, y });
          if (fits(n)) best = [x, y, d];
        }
      }
      Object.assign(n, best ? { x: best[0], y: best[1] } : { x: x0, y: y0 });
      done.push(n);
    }
    // Things the window pushed into one another clack, at most five times a second.
    if (windowSweep && Date.now() - bumped > 200 && items.some(n => n.shove > 0.5 && items.some(m => m !== n && (m.x !== m.edge[0] || m.y !== m.edge[1])))) { bumped = Date.now(); sfx.bump(); }
    windowSweep = false;
    drawn = {};
    for (const n of items) {
      drawn[n.key] = [Math.round(n.x * 10) / 10, Math.round(n.y * 10) / 10];
      // A thing drawn for the first time appears in its place, or at its
      // console's middle where it hops out of it; any other slides to its place.
      const fresh = !n.node.style.getPropertyValue('--emu-left');
      if (fresh) n.node.style.transition = 'none';
      if (fresh && n.pop) {
        n.node.style.setProperty('--emu-left', n.pop[0]);
        n.node.style.setProperty('--emu-top', n.pop[1]);
        void n.node.offsetWidth;
        n.node.style.transition = '';
      }
      n.node.style.setProperty('--emu-left', drawn[n.key][0]);
      n.node.style.setProperty('--emu-top', drawn[n.key][1]);
      if (fresh && !n.pop) { void n.node.offsetWidth; n.node.style.transition = ''; }
    }
    drawWire();
    setTimeout(drawWire, 260);
    const swept = items.some(n => String(kept[n.key]) !== String(drawn[n.key]));
    clearTimeout(sweptFor);
    // Kept once the window has stopped moving, and never under a held thing.
    const later = () => { sweptFor = setTimeout(() => (drag?.on ? later() : keep(wishes())), 800); };
    if (room && swept) later();
  }
  // MY STUFF. The top row is every console set up on this Mac: one out in
  // the room is faint and says so, any other is a tile dragged into the room
  // or pressed to bring it out. The row under it is this Mac's games,
  // favourites first and then A to Z: a favourite this Mac lacks is dimmed,
  // one arriving sits under a veil that lifts as it comes, and one whose
  // console is not out and set up is dimmed with what it needs in its title.
  function renderMine() {
    const mine = Object.keys(R.SYSTEMS).filter(system => plays(system) && gamesOf(system).length);
    $('emu-mine-consoles').replaceChildren(...mine.map(system => {
      const out = stand.has(system);
      const b = el('button', out ? 'emu-cabinet__console emu-cabinet__console--out' : 'emu-cabinet__console');
      b.type = 'button';
      b.dataset.system = system;
      const held = countOf(gamesOf(system).filter(g => standing(g).state === 'held').length);
      b.append(consoleOf(system), el('span', 'emu-cabinet__name', R.systemName(system)), el('span', 'emu-cabinet__count', out ? 'In your room' : held));
      if (out) b.disabled = true;
      else {
        b.dataset.console = system;
        b.title = `Bring out the ${R.systemName(system)}`;
        b.addEventListener('click', () => bring(system));
      }
      return b;
    }));
    $('emu-mine-consoles-none').hidden = mine.length > 0;
    const here = new Map(mineNow().map(([g, s]) => [keyOf(g), s]));
    const list = games.filter(g => here.has(keyOf(g)) || g.notes?.favourite)
      .sort((a, b) => Number(Boolean(b.notes?.favourite)) - Number(Boolean(a.notes?.favourite)));
    $('emu-mine-games').replaceChildren(...list.map(g => {
      const li = coverItem(g);
      const b = li.firstChild;
      const s = here.get(keyOf(g));
      if (!s) { b.classList.add('emu-cover--away'); b.title = `${g.title}, a favourite not on this Mac`; }
      else if (s.state === 'arriving') {
        const veil = el('span', 'emu-cover__veil');
        veil.style.blockSize = `${Math.round(100 - (s.total ? s.done / s.total : 0) * 100)}%`;
        b.querySelector('.emu-cover-art').append(veil);
      } else if (stand.get(g.system) !== 'on') {
        b.classList.add('emu-cover--away');
        const called = R.systemName(g.system);
        b.title = stand.has(g.system) ? `${g.title}. Set up the ${called} to play.` : plays(g.system) ? `${g.title}. Bring out the ${called} to play.` : `${g.title}. Needs the ${called}.`;
      }
      return li;
    }));
    $('emu-mine-none').hidden = list.length > 0;
  }

  // RUX'S SERVER -------------------------------------------------------------
  // A card's one button: Download, or why not, disabled. Without the helper
  // there is none, since the store is only browsed.
  function action(label, run = null, primary = true) {
    const b = el('button', `rux--btn ${primary && run ? 'rux--btn--primary' : 'rux--btn--tertiary'} rux--layout--size-sm emu-store__action`, label);
    b.type = 'button';
    if (run) b.addEventListener('click', run); else b.disabled = true;
    return b;
  }
  function consoleAction(system) {
    if (!helper) return null;
    if (settingUp.has(system)) return action(`Setting up ${emulatorOf(system)}…`);
    if (keeping.has(system)) return action(`Removing ${emulatorOf(system)}…`);
    if (plays(system)) return action('On this Mac');
    return action('Download', () => getConsole(system));
  }
  function gameAction(g) {
    if (!helper) return null;
    const s = standing(g);
    if (s.state === 'held') return action('On this Mac');
    if (s.state === 'arriving') return action(s.total ? `Downloading ${Math.round(s.done / s.total * 100)}%` : 'Downloading…');
    if (!keeps) return null;
    return action('Download', () => getGame(g));
  }
  // The chosen console's games as cards, in the order Sort asks, with the
  // count beside the selects, which says too where Download sets up the console first.
  function showPick() {
    const select = $('emu-store-console');
    if (select.value !== pick) select.value = pick ?? '';
    const list = pick ? gamesOf(pick) : [];
    if ($('emu-store-sort').value === 'favourites') list.sort((a, b) => Number(Boolean(b.notes?.favourite)) - Number(Boolean(a.notes?.favourite)));
    const needs = pick && helper && keeps && !plays(pick) && !settingUp.has(pick) ? `Download sets up the ${R.systemName(pick)} too` : null;
    $('emu-store-count').textContent = [pick ? countOf(list.length) : '', needs].filter(Boolean).join(' · ');
    $('emu-games').replaceChildren(...list.map(g => {
      const li = el('li', 'emu-store__card');
      const b = coverItem(g).firstChild;
      b.title = `${g.title}, its details`;
      li.append(b);
      const button = gameAction(g);
      if (button) li.append(button);
      return li;
    }));
    renderStorage();
  }

  function renderServer() {
    const systems = Object.keys(R.SYSTEMS).filter(s => gamesOf(s).length);
    if (!systems.includes(pick)) pick = systems[0] ?? null;
    const select = $('emu-store-console');
    if (select.options.length !== systems.length) {
      select.replaceChildren(...systems.map(system => { const o = el('option', '', R.systemName(system)); o.value = system; return o; }));
    }
    $('emu-cabinet').replaceChildren(...systems.map(system => {
      const li = el('li', 'emu-store__card');
      const b = el('button', 'emu-store__console');
      b.type = 'button';
      b.title = `The ${R.systemName(system)}'s games`;
      b.append(consoleOf(system), el('span', 'emu-store__name', R.systemName(system)), el('span', 'emu-row__sub', stand.has(system) ? 'In your room' : countOf(gamesOf(system).length)));
      b.addEventListener('click', () => { choose(system); showStoreGames(); });
      li.append(b);
      const button = consoleAction(system);
      if (button) li.append(button);
      return li;
    }));
    showPick();
  }
  // The store's content scrolls back to its tabs when it turns to another console.
  const toTop = () => { $('emu-collection').closest('.rux--modal-content')?.scrollTo(0, 0); };
  const showStoreGames = () => {
    window.Rux.tabs.select($('emu-store-tabs'), $('emu-store-games-tab'), { focus: false });
    toTop();
  };
  $('emu-store-console').addEventListener('change', e => { choose(e.target.value); toTop(); });
  $('emu-store-sort').addEventListener('change', showPick);
  // STORAGE ------------------------------------------------------------------
  // A card, 8 by 10 art pixels: its body with a corner cut, a label and contacts.
  function cardOf() {
    const svg = svgOf('emu-card', '0 0 8 10');
    svg.innerHTML = '<path class="emu-card__body" d="M0 0H7V1H8V10H0Z"/><rect class="emu-card__label" x="1" y="1" width="5" height="4"/>'
      + '<rect class="emu-card__pin" x="1" y="7" width="1" height="2"/><rect class="emu-card__pin" x="3" y="7" width="1" height="2"/><rect class="emu-card__pin" x="5" y="7" width="1" height="2"/>';
    return svg;
  }
  // The picked console's saves as cards, or the first one out in the room's
  // where this Mac does not play the picked one. A game's cards come from what Emu
  // carries: the one in its game, called what its console calls a save with
  // its save states riding along, then those out, each named. Take out pulls
  // the one in, so the next Play starts a new save; Put in swaps one back;
  // a card's name is a button that renames it. Then the console's own, which
  // name no game, each opening in Saves. What is read is kept half a minute,
  // so a room drawn again each second asks nothing.
  let stored = { system: null, at: 0, cards: null };
  let storing = 0;
  async function renderStorage(fresh = false) {
    if (!helper) return;
    // The picked console where this Mac plays it, else the first one out in the room.
    const system = plays(pick) ? pick : [...stand.keys()].find(plays) ?? null;
    if (!system) { $('emu-storage-for').textContent = 'Saves'; $('emu-storage-sub').textContent = 'Press a console to see its saves.'; $('emu-storage-lists').replaceChildren(); return; }
    const turn = ++storing;
    $('emu-storage-for').textContent = R.systemName(system);
    if (fresh || stored.system !== system || Date.now() - stored.at > 30000) {
      let cards = null;
      try { cards = await R.carry?.cardsFor(system, games) ?? null; } catch (error) { console.error(error); }
      if (turn !== storing) return;
      stored = { system, at: Date.now(), cards };
    }
    const { cards } = stored;
    const word = emulators?.systems?.[system]?.saveWord ?? 'Save';
    const states = n => (n ? `${n} save ${n === 1 ? 'state' : 'states'}` : '');
    const line = (name, sub, action) => {
      const li = el('li', action ? 'rux--contained-list-item rux--contained-list-item--with-action' : 'rux--contained-list-item');
      const content = el('div', 'rux--contained-list-item__content emu-row emu-row--card');
      const main = el('span', 'emu-row__main');
      main.append(name, el('span', 'emu-row__sub', sub.filter(Boolean).join(' · ')));
      content.append(cardOf(), main);
      li.append(content);
      if (action) { const slot = el('div', 'rux--contained-list-item__action'); slot.append(action); li.append(slot); }
      return li;
    };
    const press = (label, run) => {
      const b = el('button', 'rux--btn rux--btn--ghost rux--btn--sm', label);
      b.type = 'button';
      b.addEventListener('click', run);
      return b;
    };
    // A move on a card: said as it goes, every button held until it is done.
    const move = async (doing, done, run) => {
      for (const b of $('emu-storage-lists').querySelectorAll('button')) b.disabled = true;
      say(doing, null, 600000);
      try { await run(); sfx.done(); say(done); } catch (error) { console.error(error); sfx.no(); sayNo(error.message); }
      renderStorage(true);
    };
    // A card's name as the button that renames it, in a field in its place.
    const named = (g, card, shown) => {
      const b = el('button', 'emu-card-name', shown);
      b.type = 'button';
      b.title = 'Rename this card';
      b.addEventListener('click', () => {
        const field = el('input', 'rux--text-input');
        field.type = 'text';
        field.maxLength = 60;
        field.value = card.name ?? '';
        field.setAttribute('aria-label', `Name of ${nameOf(g)}'s card`);
        let over = false;
        const end = async keep => {
          if (over) return;
          over = true;
          const name = field.value.trim();
          if (!keep || !name || name === card.name) { field.replaceWith(b); return; }
          await move('Naming the card…', `Named ${name}.`, () => R.carry.rename(g, card.id, name));
        };
        field.addEventListener('keydown', e => { if (e.key === 'Enter') end(true); else if (e.key === 'Escape') { e.stopPropagation(); end(false); } });
        field.addEventListener('blur', () => end(false));
        b.replaceWith(field);
        field.focus();
        field.select();
      });
      return b;
    };
    const mine = [];
    for (const [title, c] of [...cards?.games ?? []].sort((a, b) => a[0].localeCompare(b[0]))) {
      const g = games.find(x => x.system === system && x.title === title);
      if (!g) continue;
      const can = cards.moves;
      if (c.in) {
        mine.push(line(el('span', '', nameOf(g)),
          [can ? null : c.in.name, c.in.saves ? word : '', states(c.in.states), R.date(c.in.saved)],
          can ? press('Take out', () => move('Taking its card out…', `${nameOf(g)}'s card is in Storage. Its next Play starts a new save.`, () => R.carry.takeOut(g, games))) : null));
        if (can) mine.at(-1).querySelector('.emu-row__main').firstChild.after(named(g, c.in, c.in.name ?? 'Name this card'));
      }
      for (const card of c.out) {
        const li = line(el('span', '', nameOf(g)), ['Out', states(card.states), R.date(card.saved)],
          press('Put in', () => move('Putting the card in…', `${card.name} is in ${nameOf(g)}.`, () => R.carry.putIn(g, games, card.id))));
        li.classList.add('emu-card-out');
        li.querySelector('.emu-row__main').firstChild.after(named(g, card, card.name));
        mine.push(li);
      }
    }
    const last = rows => rows.map(s => s.saved_at ?? '').sort().at(-1);
    const own = new Map();
    for (const s of saves.filter(x => x.system === system && !x.game)) own.set(`${s.name}/${s.kind}`, [...own.get(`${s.name}/${s.kind}`) ?? [], s]);
    const ownRows = [...own].sort((a, b) => a[0].localeCompare(b[0])).map(([, rows]) => {
      const a = el('a', 'rux--link', rows[0].name);
      a.href = `saves.html?save=${encodeURIComponent(`${system}/${rows[0].name}`)}`;
      return line(a, [R.saveKind(rows[0]), R.date(last(rows))]);
    });
    const count = mine.length + ownRows.length;
    $('emu-storage-sub').textContent = count ? `${count} ${count === 1 ? 'card' : 'cards'}` : 'No saves yet';
    $('emu-storage-lists').replaceChildren(...[['Games', mine], ['The console\'s own', ownRows]].filter(([, items]) => items.length).map(([title, items]) => {
      const list = el('div', 'rux--contained-list rux--contained-list--inset-rulers');
      const head = el('div', 'rux--contained-list__header');
      head.append(el('h4', 'rux--contained-list__label', title));
      const ul = el('ul');
      ul.setAttribute('role', 'list');
      ul.append(...items);
      list.append(head, ul);
      return list;
    }));
  }

  // THE STORE opens from the head's button as Carbon's modal, which closes
  // itself on its close, Escape or the scrim, and opens again on the tab and
  // console it was left on.
  const openStore = () => window.Rux.modal.open('emu-store', $('emu-store-open'));
  $('emu-store-open').addEventListener('click', openStore);
  // MY STUFF opens from its button at the room's foot, taking the focus on
  // its name, and closes by its Close or Escape, its button taking the focus
  // back. It starts closed each time the page loads, so the room shows whole.
  // Saves, a toggle in its toolbar, shows the picked console's saves in
  // place of the rows.
  let stuffOpen = false;
  function openStuff(to) {
    stuffOpen = to;
    $('emu-mine').classList.toggle('emu-mine--open', stuffOpen);
    $('emu-mine-open').setAttribute('aria-expanded', String(stuffOpen));
    $('emu-mine-open').hidden = !helper || stuffOpen;
    if (stuffOpen) $('emu-mine-h').focus({ preventScroll: true });
    else if (helper) $('emu-mine-open').focus({ preventScroll: true });
  }
  $('emu-mine-open').addEventListener('click', () => openStuff(true));
  $('emu-mine-close').addEventListener('click', () => openStuff(false));
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !stuffOpen || panelOpen() || document.querySelector('.rux--modal.is-visible')) return;
    openStuff(false);
  });
  $('emu-mine-saves').addEventListener('click', () => {
    const on = $('emu-mine-saves').getAttribute('aria-pressed') !== 'true';
    $('emu-mine-saves').setAttribute('aria-pressed', String(on));
    $('emu-mine-saves').classList.toggle('rux--btn--selected', on);
    $('emu-mine-rows').hidden = on;
    $('emu-storage').hidden = !on;
    if (on) renderStorage();
  });

  // A console pressed, in the room or the collection, is the one whose games show.
  function choose(system) {
    if (!gamesOf(system).length) return;
    pick = system;
    showPick();
  }
  const render = () => { renderRoom(); renderServer(); };
  // The room's art pixel follows its width, so it is set again when the
  // room's box changes, and its edges sweep what they reach.
  new ResizeObserver(() => {
    if (!helper) return;
    $('emu-room').style.setProperty('--emu-px', `${pxOf()}px`);
    held = null;
    windowSweep = true;
    settle();
  }).observe($('emu-room'));

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
    const coming = games.filter(g => stands(g).state === 'arriving');
    await readMac();
    if (coming.some(g => stands(g).state === 'held')) sfx.done();
    // Nothing is drawn again under a held game, an open panel or a console's open menu.
    if (told() !== before && !panelOpen() && !drag?.on && !window.Rux.menu.isOpen($('emu-console-menu'))) render();
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
  // and offers Undo where it can be taken back, or a question's answer with
  // Keep beside it; it settles back to the facts by itself. A move refused or
  // failed says so with Carbon's failed indicator, and a question with its
  // caution.
  let saidFor = 0;
  function say(text = '', undo = null, ms = 4000, bad = false, label = 'Undo') {
    clearTimeout(saidFor);
    const words = $('emu-room-said');
    const asks = Boolean(undo) && label !== 'Undo';
    if (text && (bad || asks)) {
      const svg = iconOf(bad ? '#i-error--filled' : '#i-warning--alt-inverted--filled');
      svg.setAttribute('class', bad ? 'rux--icon-indicator--failed' : 'rux--icon-indicator--caution-major');
      words.className = 'rux--icon-indicator emu-strip__words';
      words.replaceChildren(svg, el('span', 'emu-strip__words', text));
    } else {
      words.className = 'rux--type-body-compact-01 emu-strip__words';
      words.textContent = text;
    }
    $('emu-strip').classList.toggle('emu-strip--said', Boolean(text));
    $('emu-room-undo').hidden = !undo;
    $('emu-room-undo').textContent = label;
    $('emu-room-undo').onclick = undo && (() => { say(); undo(); });
    $('emu-room-keep').hidden = !asks;
    if (text) saidFor = setTimeout(say, ms);
  }
  // A home console's game shows its cover on the glass once it has started,
  // until the page is looked at again. The helper does not say when a game
  // ends, so the page coming back is taken as its end.
  let showing = 0;
  function showOn(g) {
    const tv = $('emu-tv');
    tv.classList.remove('emu-tv--off', 'emu-tv--on');
    void tv.offsetWidth;
    tv.classList.add('emu-tv--on');
    $('emu-tv-art').replaceChildren(cover(g, 'emu-tv__cover'));
    showing = Date.now();
    wire = g.system;
    drawWire();
    wake();
  }
  // The glass goes dark, its picture closing to a dot, as a CRT's does.
  function showOff() {
    showing = 0;
    wire = null;
    drawWire();
    if (!$('emu-tv-art').firstChild) return;
    $('emu-tv-art').replaceChildren();
    const tv = $('emu-tv');
    tv.classList.remove('emu-tv--on', 'emu-tv--off');
    void tv.offsetWidth;
    tv.classList.add('emu-tv--off');
    wake();
  }
  window.addEventListener('focus', () => { if (showing && Date.now() - showing > 3000) showOff(); });
  // THE SCREENSAVER. A minute with the glass dark and nothing touched, the
  // mark drifts around it, until the pointer or a key moves.
  let idle = 0;
  function wake() {
    clearTimeout(idle);
    const tv = $('emu-tv');
    tv.classList.remove('emu-tv--saver');
    if (calm()) return;
    idle = setTimeout(() => { if (!$('emu-tv-art').firstChild) tv.classList.add('emu-tv--saver'); }, 60000);
  }
  let woke = 0;
  for (const type of ['pointermove', 'pointerdown', 'keydown']) document.addEventListener(type, () => { if (Date.now() - woke > 1000) { woke = Date.now(); wake(); } }, { passive: true });
  $('emu-room-keep').addEventListener('click', () => say());
  const sayNo = text => say(text, null, 6000, true);
  async function download(g, thenPlay = false) {
    const key = keyOf(g);
    if (stands(g).state !== 'held') {
      try { await R.helper.download(g); }
      catch (error) { sayNo(error.message); return; }
    }
    if (thenPlay) wanted.add(key);
    sfx.drop();
    await look();
    render();
  }
  // DOWNLOAD FROM THE STORE. A console comes into the room unlit while fewer
  // than three are out, else it waits in My Stuff, and its emulator is set up
  // where it stands. A game whose console is not set up sets that up first.
  async function getConsole(system) {
    if (plays(system) || settingUp.has(system)) return;
    if (!stand.has(system) && stand.size < CAP) {
      held = system;
      landed = system;
      await keep({ ...wishes(), [system]: true });
    }
    await setUp(system);
  }
  async function getGame(g) {
    if (!plays(g.system)) await getConsole(g.system);
    if (plays(g.system)) await download(g);
  }
  // The slot a game goes into, as a part of its console's drawing from the
  // top, and the consoles that take a disc.
  const SLOT = { nes: 0.67, snes: 0.25, n64: 0.25, gc: 0.21, wii: 0.5, wiiu: 0.83, switch: 0.04, gb: 0.02, gbc: 0.02, gba: 0.5, nds: 0.5, n3ds: 0.5, psx: 0.33, ps2: 0.75, xbox: 0.71 };
  const DISC = new Set(['gc', 'wii', 'wiiu', 'psx', 'ps2', 'xbox']);
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  // A timer beside each animation, so the game still starts where one is not run.
  const after = (anim, ms) => Promise.race([anim.finished, new Promise(r => setTimeout(r, ms + 80))]).catch(() => {});
  // The game goes into its console in the room, with its own picture on it.
  async function insert(g) {
    const body = unitOf(g.system)?.querySelector('.emu-unit__console');
    if (!body || calm()) { sfx.insert(); return; }
    const disc = DISC.has(g.system);
    const media = el('div', disc ? 'emu-media emu-media--disc' : 'emu-media emu-media--cart');
    const art = document.querySelector(`.emu-cover[data-game="${CSS.escape(keyOf(g))}"] img`);
    if (art) media.append(art.cloneNode());
    body.style.setProperty('--emu-slot', SLOT[g.system] ?? 0.4);
    body.append(media);
    const easing = 'cubic-bezier(0.2, 0, 0.38, 0.9)';
    if (disc) {
      const tray = el('div', 'emu-tray');
      body.append(tray);
      tray.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 160, easing });
      await after(media.animate([{ transform: 'translate(2.75rem, -.5rem) rotate(0)', opacity: 0 }, { transform: 'translate(0, 0) rotate(240deg)', opacity: 1, offset: 0.6 },
        { transform: 'translate(0, .375rem) rotate(300deg) scale(.6)', opacity: 0 }], { duration: 520, easing }), 520);
      media.remove();
      after(tray.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: 160, easing }), 160).then(() => tray.remove());
    } else {
      await after(media.animate([{ transform: 'translateY(-2.5rem)', opacity: 0 }, { transform: 'translateY(-.5rem)', opacity: 1, offset: 0.5 },
        { transform: 'translateY(.875rem) scaleY(.2)', opacity: 0 }], { duration: 440, easing }), 440);
      media.remove();
    }
    sfx.insert();
  }
  async function play(g) {
    if (stand.get(g.system) === 'on') await insert(g);
    say('Starting…');
    try { await R.thisMac.play(g, say); sfx.start(); say(`Playing ${nameOf(g)}.`); if (!HANDHELD.has(g.system)) showOn(g); }
    catch (error) { sayNo(error.message); }
  }
  // The console that will not have it shakes its head, buzzes and says why.
  const NO = [name => `Nope. That's a ${name} game.`, name => `Doesn't fit. Try the ${name}.`, name => `*blows on it* Still a ${name} game.`, name => `Wrong slot! It wants a ${name}.`];
  const wrong = system => NO[Math.floor(Math.random() * NO.length)](R.systemName(system));
  function refuse(system, text) {
    const u = unitOf(system);
    sfx.no();
    if (!u) { sayNo(text); return; }
    u.classList.remove('emu-unit--shakes');
    void u.offsetWidth;
    u.classList.add('emu-unit--shakes');
    u.querySelector('.emu-bubble')?.remove();
    const bubble = el('div', 'emu-bubble', text);
    bubble.setAttribute('role', 'status');
    u.append(bubble);
    setTimeout(() => { bubble.remove(); u.classList.remove('emu-unit--shakes'); }, 1800);
  }
  // How long a move's Undo stays on the strip.
  const UNDO = 6000;
  // A CONSOLE'S MOVES. The room is kept whole each time one moves; a Mac
  // Status has not saved yet has no row to keep it on, and is told so.
  // Every thing keeps the spot it is drawn at, so moving one moves no
  // other; `at` gives the spots that change. A cover's spot goes with its console.
  async function keep(wish, at = {}) {
    room = { ...wish, placed: Object.fromEntries(Object.entries({ ...drawn, ...at })
      .filter(([key]) => key in wish || key === 'tv' || (key.startsWith('game:') && key.slice(5).split('/')[0] in wish))) };
    render();
    if (!macName) return;
    try { if (!await R.data.saveRoom(macName, room)) say('This room is kept once Status has saved this Mac.'); }
    catch (error) { console.error(error); sayNo('The room could not be kept. Try again.'); }
  }
  // Where a thing let go at a point stands: its middle under the pointer, its
  // top-left in art pixels; the sweep keeps it inside the room. `size` is its
  // width and height in CSS pixels.
  function spotAt(point, [w, h]) {
    const f = $('emu-units').getBoundingClientRect();
    const px = pxOf();
    return [Math.round((point.x - f.left - w / 2) / px), Math.round((point.y - f.top - h / 2) / px)];
  }
  // A console in the room, the TV as `tv` or a cover by its key, moved to a spot.
  function moveTo(system, spot) {
    held = system;
    landed = system;
    sfx.drop();
    return keep(wishes(), { [system]: spot });
  }
  // Out into the room, at a spot where it was let go, from either drawer.
  // A fourth is refused.
  async function bring(system, spot = null) {
    if (stand.has(system)) return;
    if (stand.size >= CAP) { sfx.no(); sayNo('Three is plenty. Put one away first.'); return; }
    held = system;
    landed = system;
    sfx.drop();
    await keep({ ...wishes(), [system]: true }, spot ? { [system]: spot } : {});
    if (!plays(system)) say(`The ${R.systemName(system)} is not set up yet. Press it to set it up.`, null, 6000);
  }
  // TIDY UP: the TV in the middle of the room and the consoles in rows under
  // it, each row centred, in the collection's order; Undo puts everything
  // back where it was.
  function tidy() {
    const px = pxOf();
    const box = $('emu-units');
    const W = box.clientWidth / px;
    const H = box.clientHeight / px;
    const gap = 6;
    const before = { ...drawn };
    const tv = $('emu-tv');
    const next = { tv: [Math.round((W - tv.offsetWidth / px) / 2), Math.round((H - tv.offsetHeight / px) / 2)] };
    const rows = [[]];
    // The covers land around their consoles again.
    for (const key of Object.keys(drawn)) if (key.startsWith('game:')) delete drawn[key];
    for (const li of [...stand.keys()].map(unitOf)) {
      const w = li.offsetWidth / px;
      const row = rows.at(-1);
      if (row.length && row.reduce((sum, n) => sum + n.w + gap, 0) + w > W) rows.push([{ li, w }]);
      else row.push({ li, w });
    }
    let y = next.tv[1] + tv.offsetHeight / px + 2 * gap;
    for (const row of rows) {
      let x = Math.round((W - row.reduce((sum, n) => sum + n.w, 0) - gap * (row.length - 1)) / 2);
      for (const { li, w } of row) { next[li.dataset.system] = [x, y]; x += w + gap; }
      y += Math.max(0, ...row.map(n => n.li.offsetHeight / px)) + gap;
    }
    held = null;
    sfx.drop();
    keep(wishes(), next);
    say('Tidied up.', () => keep(wishes(), before), UNDO);
  }
  // PUT EVERYTHING AWAY: every console out of the room, those set up into My
  // Room and any other back to Rux's Server; Undo brings them out again.
  function putAllAway() {
    if (!stand.size) return;
    const before = [wishes(), { ...drawn }];
    held = null;
    sfx.unplug();
    keep({});
    say('Everything is put away.', () => keep(...before), UNDO);
  }
  // Put away into My Stuff: out of the room, its emulator still on this Mac.
  function putAway(system) {
    if (stand.get(system) !== 'on') { refuse(system, BUSY[stand.get(system)]?.(system) ?? 'Set me up first.'); return; }
    const before = [wishes(), { ...drawn }];
    const next = wishes();
    delete next[system];
    sfx.unplug();
    keep(next);
    say(`The ${R.systemName(system)} is put away.`, () => keep(...before), UNDO);
  }
  // Back to Rux's Server: only one that is not set up, which takes nothing off this Mac.
  function putBack(system) {
    if (stand.get(system) !== 'off') { refuse(system, BUSY[stand.get(system)]?.(system) ?? 'Remove me from my menu.'); return; }
    const next = wishes();
    delete next[system];
    sfx.drop();
    keep(next);
  }
  // Removing an emulator: the strip asks first. Its saves and settings are
  // kept in Supabase and checked, then the helper moves it to the Trash, and
  // every console that played in it leaves the room. Where keeping fails
  // nothing is removed.
  function askRemove(system) {
    if (stand.get(system) !== 'on') return;
    say(`Remove ${emulatorOf(system)} from this Mac? Your saves are kept.`, () => remove(system), 20000, false, 'Remove');
  }
  async function remove(system) {
    const emulator = emulatorOf(system);
    keeping.add(system);
    render();
    say(`Keeping ${emulator}'s saves and settings…`, null, 600000);
    try { await R.carry.remove(emulator); }
    catch (error) { console.error(error); keeping.delete(system); render(); sayNo(error.message); return; }
    keeping.delete(system);
    await readMac();
    const next = Object.fromEntries(Object.entries(wishes()).filter(([sys]) => emulatorOf(sys) !== emulator));
    sfx.unplug();
    await keep(next);
    say(`${emulator} is off this Mac. Your saves stay.`);
  }
  // Setting up installs its emulator from Supabase, then makes it ready with
  // the settings this Mac kept, as Status does.
  async function setUp(system) {
    const emulator = emulatorOf(system);
    if (plays(system) || settingUp.has(system)) return;
    sfx.plug();
    settingUp.add(system);
    render();
    say(`Setting up ${emulator}…`, null, 600000);
    try {
      const installer = R.installerOf(await R.data.files(), emulator);
      if (!installer) throw new Error(`Supabase holds no installer for ${emulator}.`);
      await R.carry.setUp(emulator, installer, R.keptVersion(installer),
        part => say(part === 'install' ? `Installing ${emulator}…` : `Making ${emulator} ready…`, null, 600000));
      const also = Object.keys(R.SYSTEMS).filter(sys => sys !== system && emulatorOf(sys) === emulator && !stand.has(sys) && gamesOf(sys).length);
      sfx.done();
      say(also.length ? `${emulator} is set up. ${also.map(R.systemName).join(' and ')} ${also.length > 1 ? 'are' : 'is'} in My Stuff too.` : `${emulator} is set up.`);
    } catch (error) { console.error(error); sayNo(error.message); }
    settingUp.delete(system);
    await readMac();
    render();
  }

  // WHAT LETTING GO HERE WILL DO: the word shown while a game is held, the
  // place that lights, and the move itself, or null where nothing would
  // happen. A move the drag already shows, such as a console moved in the
  // room, has no word, and a drop anywhere in the room or My Stuff lights
  // nothing, since the whole of it would. One answer, so the word never disagrees with the drop.
  const yes = (word, light, run) => ({ word, light, run });
  // A move refused: `says` is the console and its line, said when the game is let go.
  const no = (word, light, says = null) => ({ word, light, no: true, says });
  function intent(g, from, under, point) {
    if (!under) return null;
    const s = standing(g);
    const unit = under.closest('.emu-unit')
      ?? (under.closest('.emu-tv') && !HANDHELD.has(g.system) ? unitOf(g.system) : null);
    if (unit) {
      const system = unit.dataset.system;
      if (system !== g.system) return no(`Doesn't fit the ${R.systemName(system)}`, unit, [system, wrong(g.system)]);
      if (stand.get(system) === 'setting') return no('Still setting up', unit, [system, 'Hang on, still setting up.']);
      if (stand.get(system) === 'keeping') return no('Being removed', unit, [system, 'I am being removed.']);
      if (stand.get(system) !== 'on') return no('Set it up first', unit, [system, 'Set me up first.']);
      if (s.state === 'arriving') return no('Still downloading', unit, [system, 'Not all here yet.']);
      if (s.state === 'held' || drive()) return yes('Play', unit, () => play(g));
      if (keeps) return yes('Download and play', unit, () => download(g, true));
      return no('Plug in the drive to play', unit, [system, 'Plug in the drive to play.']);
    }
    // A cover on the floor moves where it is let go.
    if (from === 'floor' && under.closest('#emu-room')) return { ...yes(null, null, () => {}), move: true };
    return null;
  }

  // The same for a console: out into the room from My Stuff, moved in the
  // room, and put away onto My Stuff.
  function consoleIntent(system, from, under, point, size) {
    if (!under) return null;
    const inRoom = under.closest('#emu-room');
    if (from !== 'room' && inRoom) {
      if (stand.size >= CAP) return no('Put one away first', null, [system, 'Three is plenty. Put one away first.']);
      return yes(plays(system) ? 'Bring out' : 'Bring in', null, () => bring(system, spotAt(point, size)));
    }
    if (from !== 'room') return null;
    if (inRoom) return { ...yes(null, null, () => moveTo(system, spotAt(point, size))), move: true };
    const st = stand.get(system);
    const busy = BUSY[st] && no(st === 'setting' ? 'Still setting up' : 'Being removed', null, [system, BUSY[st](system)]);
    if (under.closest('#emu-mine')) {
      return busy || (st === 'on' ? yes('Put away', $('emu-mine'), () => putAway(system)) : no('Not set up yet', $('emu-mine'), [system, 'Set me up first.']));
    }
    return null;
  }
  // A console or the TV held keeps the size it has in the room, so where it lands is where it is drawn.
  const sizeOf = d => {
    const r = d.from === 'room' ? d.src.closest('.emu-unit, .emu-tv').getBoundingClientRect() : null;
    const px = parseFloat($('emu-room').style.getPropertyValue('--emu-px')) || 3;
    return r ? [r.width, r.height] : [36 * px, 32 * px];
  };
  // The TV moves anywhere in the room, with no word, as a console does.
  const tvIntent = (under, point, size) => (under?.closest('#emu-room') ? { ...yes(null, null, () => moveTo('tv', spotAt(point, size))), move: true } : null);
  const intentOf = (d, under, point) => (d.g ? intent(d.g, d.from, under, point)
    : d.tv ? tvIntent(under, point, sizeOf(d)) : consoleIntent(d.system, d.from, under, point, sizeOf(d)));

  // THE DRAG, with the pointer, where the helper answers. A press that does
  // not move is the cover's or the console's own click.
  let drag = null;
  // CARRYING. A console in the room, a cover on the floor or the TV is itself moved, never a
  // copy of it. It lifts off the floor and follows the pointer a little
  // behind, closing a share of the gap each frame, the TV a smaller share
  // since it is heavier, and leans the way it is going by how fast it goes.
  // Put down in the room it stays where it is and the rest make room; let
  // go anywhere else it slides back to where it stood. Carbon has no motion
  // for a carried thing; where motion is reduced it keeps to the pointer
  // and does not lean.
  function carry(d) {
    const key = d.tv ? 'tv' : d.g ? floorKey(d.g) : d.system;
    const node = d.tv ? $('emu-tv') : d.g ? thingOf(key) : unitOf(d.system);
    const share = calm() ? 1 : d.tv ? 0.14 : 0.22;
    Object.assign(d, { live: node, key, stood: [...drawn[key]], cur: [...drawn[key]], to: [...drawn[key]], px: pxOf() });
    node.classList.add('emu-carried');
    const step = () => {
      if (!d.live) return;
      const vx = (d.to[0] - d.cur[0]) * share;
      d.cur = [d.cur[0] + vx, d.cur[1] + (d.to[1] - d.cur[1]) * share];
      node.style.setProperty('--emu-left', d.cur[0]);
      node.style.setProperty('--emu-top', d.cur[1]);
      node.style.rotate = calm() ? '' : `${Math.max(-6, Math.min(6, vx * 1.5)).toFixed(2)}deg`;
      if (wired) drawWire();
      d.frame = requestAnimationFrame(step);
    };
    d.frame = requestAnimationFrame(step);
  }
  // Put down: `moved` where it stays in the room, else it goes back.
  function setDown(d, moved) {
    cancelAnimationFrame(d.frame);
    const node = d.live;
    d.live = null;
    node.style.rotate = '';
    node.classList.remove('emu-carried');
    if (moved) {
      // It is drawn next from where it is, and eases the last of the way.
      drawn[d.key] = d.cur;
      moveTo(d.key, d.to.map(Math.round));
      return;
    }
    node.style.setProperty('--emu-left', d.stood[0]);
    node.style.setProperty('--emu-top', d.stood[1]);
  }
  const word = el('div', 'emu-word');
  word.hidden = true;
  document.body.append(word);
  const FROM = [['#emu-units', 'floor'], ['#emu-mine-games', 'shelf']];
  const unlight = () => {
    for (const cls of ['emu-lit', 'emu-no']) for (const n of document.querySelectorAll(`.${cls}`)) n.classList.remove(cls);
  };
  function drop() {
    word.hidden = true;
    unlight();
    for (const u of units()) u.classList.remove('emu-unit--fit', 'emu-unit--dim');
  }
  // A cover's picture is not dragged away as a file.
  document.addEventListener('dragstart', e => { if (e.target.closest?.('.emu-cover')) e.preventDefault(); });
  document.addEventListener('pointerdown', e => {
    const src = e.target.closest?.('.emu-cover[data-game], [data-console], .emu-tv');
    if (!src || e.button > 0 || !helper) return;
    const at = { src, x: e.clientX, y: e.clientY, on: false, id: e.pointerId };
    // The TV is carried by its case; its link and Undo stay presses.
    if (src.id === 'emu-tv') { if (!e.target.closest('a, button')) drag = { ...at, tv: true, from: 'room' }; return; }
    if (src.dataset.console) { drag = { ...at, system: src.dataset.console, from: src.closest('#emu-room') ? 'room' : 'mine' }; return; }
    const g = games.find(x => keyOf(x) === src.dataset.game);
    const from = FROM.find(([sel]) => src.closest(sel))?.[1];
    if (g && from) drag = { ...at, g, from };
  });
  document.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.on) {
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
      drag.on = true;
      sfx.pick();
      const r = drag.src.getBoundingClientRect();
      Object.assign(drag, { dx: drag.x - r.left, dy: drag.y - r.top, home: r });
      if (drag.from === 'room' || drag.from === 'floor') carry(drag);
      // Anything else is held as a copy, drawn where the ghost is, at the
      // room's art pixel, with no ids or live region of its own.
      const ghost = el('div', 'emu-ghost');
      ghost.hidden = Boolean(drag.live);
      ghost.style.setProperty('--emu-px', $('emu-room').style.getPropertyValue('--emu-px'));
      const copy = drag.src.cloneNode(true);
      for (const n of [copy, ...copy.querySelectorAll('[id], [role]')]) { n.removeAttribute('id'); n.removeAttribute('role'); }
      Object.assign(copy.style, { position: 'static', transform: 'none', inlineSize: `${r.width}px`, blockSize: `${r.height}px` });
      ghost.append(copy);
      document.body.append(ghost);
      drag.ghost = ghost;
      if (!drag.live) drag.src.classList.add('emu-held');
      // A game's console lights and the rest dim, so where it goes shows.
      if (drag.g) for (const u of units()) u.classList.add(u.dataset.system === drag.g.system ? 'emu-unit--fit' : 'emu-unit--dim');
    }
    if (drag.live) drag.to = [drag.stood[0] + (e.clientX - drag.x) / drag.px, drag.stood[1] + (e.clientY - drag.y) / drag.px];
    // A cover tilts in the hand; a console's copy stays square, so its edges stay sharp.
    drag.ghost.style.transform = `translate(${e.clientX - drag.dx}px, ${e.clientY - drag.dy}px)${drag.g ? ' rotate(-3deg)' : ''}`;
    const it = intentOf(drag, document.elementFromPoint(e.clientX, e.clientY), { x: e.clientX, y: e.clientY });
    unlight();
    word.hidden = !it?.word;
    if (!it) return;
    if (it.word) {
      word.textContent = it.word;
      word.classList.toggle('emu-word--no', Boolean(it.no));
      word.style.transform = `translate(${Math.min(e.clientX + 16, innerWidth - word.offsetWidth - 8)}px, ${e.clientY + 20}px)`;
    }
    it.light?.classList.add(it.no ? 'emu-no' : 'emu-lit');
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
    const it = intentOf(d, document.elementFromPoint(e.clientX, e.clientY), { x: e.clientX, y: e.clientY });
    const done = () => {
      d.ghost.remove();
      d.src.classList.remove('emu-held');
      if (it && !it.no) it.run();
      else if (it?.says) refuse(...it.says);
    };
    // A thing carried is put down where it is, or goes back and then does
    // what its drop asks, such as being put away.
    if (d.live) {
      setDown(d, Boolean(it?.move));
      if (it?.move) d.ghost.remove();
      else done();
      return;
    }
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
    if (drag.live) setDown(drag, false);
    drag.ghost?.remove();
    drag.src.classList.remove('emu-held');
    drag = null;
  });

  // The cover a game was opened from, to come back to when its panel closes,
  // and whether that was in the store, which closes under the panel and opens
  // again after it, since a modal holds the focus.
  let opener = null;
  let fromStore = false;
  const openGame = g => {
    opener = keyOf(g);
    fromStore = Boolean(helper) && $('emu-store').classList.contains('is-visible');
    if (fromStore) window.Rux.modal.close('emu-store');
    R.gamePanel.open(g, { saves, onSaved: render, top: [cover(g, 'emu-panel-art')], mac: { focus: true, onChanged: readMac } });
  };
  // The panel's own close and Escape, heard first, so the page shows what the
  // game changed, such as being downloaded or made a favourite, and returns to its cover.
  function closeGame() {
    R.gamePanel.close();
    render();
    if (fromStore) openStore();
    document.querySelector(`${fromStore ? '#emu-games' : '#emu-mine, #emu-collection'} .emu-cover[data-game="${CSS.escape(opener ?? '')}"]`)?.focus();
    fromStore = false;
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && panelOpen()) { e.stopImmediatePropagation(); closeGame(); } }, true);
  $('emu-panel-close').addEventListener('click', e => { e.stopImmediatePropagation(); closeGame(); }, true);

  async function load() {
    let rows, notes, mac, live;
    try {
      [rows, notes, saves, mac, emulators, live] = await Promise.all([R.data.games(), R.data.notes(), R.data.saves(),
        R.thisMac.read(), R.emulators(), R.helper.onMac ? R.helper.mac() : null]);
      macName = live?.mac ?? null;
      let files;
      [room, driveRow, files] = await Promise.all([macName ? R.data.room(macName) : null, R.data.drive(), R.data.files()]);
      newestHelper = R.installerOf(files, 'Rux Emu Helper')?.name.match(/-(\d+)-macOS/)?.[1] ?? null;
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
    // The game ?game= names, opened once over its console and taken off the address.
    const url = new URL(location.href);
    const key = url.searchParams.get('game');
    if (key) {
      url.searchParams.delete('game');
      url.hash = '';
      history.replaceState(null, '', url);
      const g = games.find(x => keyOf(x) === key);
      if (g) { choose(g.system); openGame(g); }
    }
  }

  // The helper may be started or quit, an emulator installed or a download
  // ended, while the page is away: it is read again when the page is back.
  window.addEventListener('focus', () => { if (games.length) look(); });
  // Update may have saved from another tab while the page was away, so when
  // it last did is read again too, and the strip redrawn.
  window.addEventListener('focus', async () => {
    const row = await R.data.drive().catch(() => driveRow);
    if (row?.scanned_at === driveRow?.scanned_at) return;
    driveRow = row;
    if (helper) renderStrip();
  });
  load();
})();
