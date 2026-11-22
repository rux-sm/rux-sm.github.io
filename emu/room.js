/* ==========================================================================
   room.js — the Library as a room, Emu's front page
   --------------------------------------------------------------------------
   Where Rux Emu Helper answers, the page is one tile, the room's: its head,
   then the room, Your Mac: the TV and every console set up on this Mac,
   each standing where it was left, then its
   foot, a button for each drawer. The head's one button opens Rux's Server,
   the store, as Carbon's medium modal. Without the helper the store is the
   whole page.

   A console has two places. In Rux's Server it is not on this Mac; in the
   room it is set up, and it stays there until it is removed. Which consoles
   stand in the room is read from the helper; where each thing in it stands
   is this Mac's room, kept on its row in Supabase. Pressing or
   right-clicking a console opens its menu: Remove, which the strip asks
   about before the emulator's saves and settings are kept and it is taken
   off this Mac, back to Rux's Server. Its power light, on its drawing, is
   lit while it is set up and flashes on and off while it is set up or
   removed, while the strip says how far it has got, and a home console is
   wired to the TV as it is set up. Its name shows under the pointer or the
   keyboard.

   The strip, in the head after the room's name, is the room's one place for
   words. At rest it shows this Mac as Carbon's icon indicators: the helper,
   the room this Mac has free and, once it is late, the server's nightly
   scan, each opening Status where it is wrong; while a move runs it names
   it, after one it says what it did, with Undo where it can be taken back,
   and it asks before an emulator is removed. The TV's glass shows only a
   home console's game, its cover once it starts, a wire running to the TV
   from its console. The TV's stand, or a press anywhere on it, opens its menu,
   the room's own two: Sound and Tidy up. The pages' menu and Search are the
   shell's, the same on every page.

   Games stay put away. The room shows only the TV and the consoles, and a
   game is played by opening Games and carrying it onto its console.

   Rux's Server has two tabs of cards. Consoles is every console with
   games, its drawing from brand/consoles/ over its name and count; Games is
   the chosen console's games as covers, A to Z or favourites first. Each
   card has Download, or why not: on a console it sets up its emulator,
   which comes into the room's first clear spot, and on a game it downloads
   it, setting up its console first where it must. A console's card,
   pressed off its button, turns to its games; a game's cover opens its
   side panel, game-panel.js, and the store comes back when the panel
   closes. ?game=<system>/<title>, from Search or Problems, picks that
   game's console and opens its panel.

   The tile's foot has a button for each drawer, which opens up over the
   room's foot, one at a time, all closed each time the page loads. Games
   is a row that scrolls sideways of this Mac's games, favourites first, one
   still arriving under a veil that lifts as it comes, under tabs for All
   and each console it has games for; a console pressed picks its tab. Saves is the picked
   console's saves as cards: each game's, the one in it and those out, with
   Take out, Put in and a name to change, then the console's own.
   Controllers is each controller this Mac sees, and says its button
   layouts stay on each Mac for now.

   A thing in the room is itself carried with the pointer, and a game from
   Games is held as a copy. A word follows it and says what letting go will
   do, and a place it would land lights where that place is one thing,
   never the room as a whole. A console moves only in the room. A game
   onto its console or the TV plays it; a console it does not fit says so
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
  // The console whose games show.
  let pick = null;
  // This Mac's name on its row in Supabase, and its room as kept there:
  // where each thing in it stands; null until one is moved.
  let macName = null;
  let room = null;
  // The last scan's row, for when the server last scanned, and the version
  // of Rux Emu Helper Supabase holds, the one a Mac should run.
  let driveRow = null;
  let newestHelper = null;
  // Consoles whose emulator is being set up now.
  const settingUp = new Set();
  // Consoles whose emulator is being taken off this Mac now, its saves and
  // settings kept first.
  const keeping = new Set();
  // The consoles standing in the room as drawn, each 'on', 'setting' or 'keeping'.
  let stand = new Map();

  const keyOf = g => `${g.system}/${g.title}`;
  const countOf = n => `${n} ${n === 1 ? 'game' : 'games'}`;
  const gamesOf = system => games.filter(g => g.system === system);
  // Whether this Mac has a system's emulator, where a helper answers.
  const plays = system => Boolean(helper?.systems?.includes(system));
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
  // THE ROOM AS IT IS LAID OUT, which a room never kept shows and Tidy up
  // puts back: the TV at the top of the room, centred, two gaps under the
  // room's head, and the consoles side by side under it, a gap apart and
  // two gaps below the TV, each row centred under it, in the collection's
  // order. `sizes` is each thing's width and height in art pixels by its
  // key, and `W` the room's width in them.
  const GAP = 6;
  function arranged(W, sizes) {
    const at = { tv: [Math.round((W - sizes.tv[0]) / 2), 2 * GAP] };
    const rows = [[]];
    for (const key of stand.keys()) {
      if (!sizes[key]) continue;
      const row = rows.at(-1);
      if (row.length && row.reduce((sum, k) => sum + sizes[k][0] + GAP, 0) + sizes[key][0] > W) rows.push([key]);
      else row.push(key);
    }
    let y = at.tv[1] + sizes.tv[1] + 2 * GAP;
    for (const row of rows) {
      let x = Math.round((W - row.reduce((sum, k) => sum + sizes[k][0], 0) - GAP * (row.length - 1)) / 2);
      for (const key of row) { at[key] = [x, y]; x += sizes[key][0] + GAP; }
      y += Math.max(0, ...row.map(k => sizes[k][1])) + GAP;
    }
    return at;
  }
  // Where a thing with no place yet starts: its place in that layout, and
  // where something kept covers it, the first of these shares of the room
  // across and down that nothing covers, along the room's foot and then its
  // sides. A room kept as shares, under `places`, starts each thing from
  // its share.
  const SLOTS = [0.85, 1].flatMap(y => [0.5, 0.3, 0.7, 0.1, 0.9].map(x => [x, y])).concat([[0.05, 0.5], [0.95, 0.5], [0.05, 0.15], [0.95, 0.15]]);
  const shareOf = key => room?.places?.[key] ?? null;
  // Every console with games whose emulator this Mac has stands in the
  // room, in the collection's order, until it is removed: 'on' where it is
  // set up, 'setting' while it is set up and 'keeping' while its emulator is
  // taken off. Which consoles stand there is read from the helper, never kept.
  const consolesNow = () => new Map(Object.keys(R.SYSTEMS)
    .filter(sys => gamesOf(sys).length && (plays(sys) || settingUp.has(sys) || keeping.has(sys)))
    .map(sys => [sys, settingUp.has(sys) ? 'setting' : keeping.has(sys) ? 'keeping' : 'on']));

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
  // THE TV'S MENU, under its stand: what is the room's alone, Sound and
  // Tidy up. The other pages and Search are the shell's, as Carbon keeps a
  // product's navigation in its shell on every page.
  function openTvMenu() {
    const menu = $('emu-tv-menu');
    const button = $('emu-tv-menu-open');
    if (window.Rux.menu.isOpen(menu)) { window.Rux.menu.close(menu); return; }
    menu.replaceChildren(
      menuItem(menu, 'Sound', toggleSound, { icon: iconOf(loud ? '#m-volume_up' : '#m-volume_off'), role: 'menuitemcheckbox', checked: loud }),
      menuItem(menu, 'Tidy up', tidy));
    window.Rux.menu.open(menu, button);
  }
  $('emu-tv-menu-open').addEventListener('click', openTvMenu);
  // A press on the TV opens it too, but not one on its stand, which opens it itself, or one that carried it.
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
  const UNIT = { on: 'emu-unit', setting: 'emu-unit emu-unit--setting', keeping: 'emu-unit emu-unit--setting' };
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
  // A CONSOLE'S MENU, Design's menu under the console: Remove, which the
  // strip then asks about, or what it is busy with. So no control is drawn
  // on the room, and an emulator is never taken off in one press.
  function openMenu(system, trigger) {
    const menu = $('emu-console-menu');
    window.Rux.menu.close(menu);
    const state = stand.get(system);
    const emulator = emulatorOf(system);
    const item = (label, run, opts) => menuItem(menu, label, run, opts);
    menu.setAttribute('aria-label', R.systemName(system));
    menu.replaceChildren(...(BUSY[state] ? [item(BUSY[state](system), null, { off: true })]
      : [item(`Remove ${emulator} from this Mac`, () => askRemove(system), { danger: true })]));
    window.Rux.menu.open(menu, trigger);
  }
  // The art pixel: three CSS pixels where the TV, 80 art pixels wide, takes
  // at most half the room's width, else two.
  const pxOf = () => (80 * 3 <= $('emu-room').getBoundingClientRect().width / 2 ? 3 : 2);
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
    $('emu-strip-facts').replaceChildren(...facts.map(f => indicator(...f)),
      worst ? indicator(worst[0], worst[1], 'status.html', 'emu-strip__sum') : indicator('ok', 'Ready', 'status.html', 'emu-strip__sum'));
  }
  function renderRoom() {
    const mac = Boolean(helper);
    $('emu-room').hidden = !mac;
    $('emu-head').hidden = !mac;
    $('emu-mine').hidden = !mac;
    $('emu-foot').hidden = !mac;
    $('emu-wall').classList.toggle('emu-wall--mac', mac);
    // The store is the modal's where the room is, and the page where it is not.
    const home = mac ? $('emu-store-body') : $('emu-wall');
    if ($('emu-collection').parentElement !== home) home.prepend($('emu-collection'));
    if (!mac) window.Rux.modal.close('emu-store');
    if (!mac) return;
    $('emu-room').style.setProperty('--emu-px', `${pxOf()}px`);
    renderStrip();
    stand = consolesNow();
    // Each thing starts where it was last drawn, so a move slides from there.
    const from = (li, key) => { if (drawn[key]) { li.style.setProperty('--emu-left', drawn[key][0]); li.style.setProperty('--emu-top', drawn[key][1]); } return li; };
    $('emu-units').replaceChildren(...[...stand].map(([system, state]) => from(unit(system, state), system)));
    // The thing just put down lands.
    const landing = landed === 'tv' ? $('emu-tv') : landed && unitOf(landed);
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
  // THE SWEEP. The TV and the consoles are things on the floor. Each starts
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
    const items = [['tv', $('emu-tv')], ...[...box.children].map(li => [li.dataset.system, li])].map(([key, node]) => {
      const at = kept[key];
      return { key, node, w: node.offsetWidth / px, h: node.offsetHeight / px, x: at?.[0] ?? 0, y: at?.[1] ?? 0, loose: !at, still: key === held };
    });
    const inside = n => { n.x = Math.min(Math.max(0, n.x), Math.max(0, W - n.w)); n.y = Math.min(Math.max(0, n.y), Math.max(0, H - n.h)); };
    const over = (a, b) => [Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)];
    const clear = n => items.every(m => m === n || m.loose || over(n, m).some(o => o <= 0));
    // A thing with no place takes its place in the room's layout, or the
    // first slot nothing covers.
    const laid = arranged(W, Object.fromEntries(items.map(i => [i.key, [i.w, i.h]])));
    for (const n of items.filter(i => i.loose)) {
      const share = shareOf(n.key);
      const spots = (share ? [share] : SLOTS).map(([sx, sy]) => [sx * (W - n.w), sy * (H - n.h)]);
      for (const [x, y] of share || !laid[n.key] ? spots : [laid[n.key], ...spots]) {
        n.x = x;
        n.y = y;
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
      // A thing drawn for the first time appears in its place; any other slides to it.
      const fresh = !n.node.style.getPropertyValue('--emu-left');
      if (fresh) n.node.style.transition = 'none';
      n.node.style.setProperty('--emu-left', drawn[n.key][0]);
      n.node.style.setProperty('--emu-top', drawn[n.key][1]);
      if (fresh) { void n.node.offsetWidth; n.node.style.transition = ''; }
    }
    drawWire();
    setTimeout(drawWire, 260);
    const swept = items.some(n => String(kept[n.key]) !== String(drawn[n.key]));
    clearTimeout(sweptFor);
    // Kept once the window has stopped moving, and never under a held thing.
    const later = () => { sweptFor = setTimeout(() => (drag?.on ? later() : keep()), 800); };
    if (room && swept) later();
  }
  // GAMES, the drawer: this Mac's games, favourites first and then A to Z:
  // a favourite this Mac lacks is dimmed, one arriving sits under a veil
  // that lifts as it comes, and one whose console is not set up is dimmed
  // with what it needs in its title. A cover shows no name under it, only
  // in its title, and the row keeps one cover's height. Tabs above the row show All, or one
  // console's games, a tab for each console the row has games for in the
  // filter's order; pressing a console in the room picks its tab.
  // A console's tab shows its wordmark from brand/marks.svg, in the tab's
  // own colour, or its name where it has none.
  let shelf = null;
  const consoleTabs = $('emu-mine-consoles');
  consoleTabs.addEventListener('rux:tab-selected', e => { shelf = e.detail.tab.dataset.system || null; renderMine(); });
  let marks = new Map();
  fetch('brand/marks.svg').then(r => (r.ok ? r.text() : '')).then(text => {
    marks = new Map([...new DOMParser().parseFromString(text, 'image/svg+xml').querySelectorAll('symbol')].map(s => [s.id, s]));
    if (games.length) renderMine();
  }).catch(error => console.error(error));
  function tabOf(system, label) {
    const on = system === (shelf ?? '');
    const b = el('button', `rux--tabs__nav-item rux--tabs__nav-link${on ? ' rux--tabs__nav-item--selected' : ''}`);
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(on));
    b.tabIndex = on ? 0 : -1;
    b.dataset.system = system;
    b.title = label;
    const text = el('span', 'rux--tabs__nav-item-label');
    const mark = marks.get(system);
    if (mark) {
      const svg = svgOf('emu-mine__mark', mark.getAttribute('viewBox'));
      svg.append(...[...mark.childNodes].map(n => document.importNode(n, true)));
      b.setAttribute('aria-label', label);
      text.append(svg);
    } else text.textContent = label;
    const wrap = el('div', 'rux--tabs__nav-item-label-wrapper');
    wrap.append(text);
    b.append(wrap);
    return b;
  }
  function renderMine() {
    const here = new Map(mineNow().map(([g, s]) => [keyOf(g), s]));
    const all = games.filter(g => here.has(keyOf(g)) || g.notes?.favourite)
      .sort((a, b) => Number(Boolean(b.notes?.favourite)) - Number(Boolean(a.notes?.favourite)));
    const systems = Object.keys(R.SYSTEMS).filter(s => all.some(g => g.system === s));
    if (!systems.includes(shelf)) shelf = null;
    const focused = consoleTabs.contains(document.activeElement);
    consoleTabs.replaceChildren(tabOf('', 'All'), ...systems.map(s => tabOf(s, R.systemName(s))));
    if (focused) consoleTabs.querySelector('[aria-selected="true"]').focus();
    $('emu-mine-consoles-wrap').hidden = !systems.length;
    const list = shelf ? all.filter(g => g.system === shelf) : all;
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
        b.title = `${g.title}. Needs the ${R.systemName(g.system)}.`;
      }
      return li;
    }));
    $('emu-mine-none').hidden = all.length > 0;
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
    if (plays(system)) return action('In your room');
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
    $('emu-store-console-list').replaceChildren(...systems.map(system => {
      const li = el('li', 'emu-store__card');
      const b = el('button', 'emu-store__console');
      b.type = 'button';
      b.title = `The ${R.systemName(system)}'s games`;
      b.append(consoleOf(system), el('span', 'emu-store__name', R.systemName(system)), el('span', 'emu-row__sub', countOf(gamesOf(system).length)));
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
  // THE DRAWER opens up from the foot's buttons, each its own: Games, Saves
  // or Controllers. Pressing the open one, or Escape, closes it, and its
  // button takes the focus back; pressing another turns the drawer to that
  // one. Its button's chevron turns down while its drawer is open. It starts
  // closed each time the page loads, so the room shows whole.
  const drawerButtons = [...$('emu-foot').querySelectorAll('[data-drawer]')];
  let drawer = null;
  function openDrawer(pane) {
    drawer = pane;
    $('emu-mine').classList.toggle('emu-mine--open', Boolean(pane));
    for (const b of drawerButtons) {
      const on = b.dataset.drawer === pane;
      b.setAttribute('aria-expanded', String(on));
      b.querySelector('.rux--btn__icon use').setAttribute('href', on ? '#i-chevron--down' : '#i-chevron--up');
      $(b.dataset.drawer).hidden = !on;
      if (on) $('emu-mine').setAttribute('aria-label', b.textContent.trim());
    }
    if (pane === 'emu-storage') renderStorage();
    if (pane === 'emu-pads-pane') renderPads();
  }
  // CONTROLLERS, the drawer: each controller this Mac sees through Chrome's
  // Gamepad API, named as its maker names it, its maker's numbers left off.
  // Chrome shows a controller to a page only once one of its buttons is
  // pressed, so an empty drawer says to press one. Its button layouts are
  // each emulator's own on each Mac until docs/plans/emu-emulator-profiles.md
  // carries them, and the drawer says so.
  function renderPads() {
    const pads = [...(navigator.getGamepads?.() ?? [])].filter(Boolean);
    $('emu-pads-none').hidden = pads.length > 0;
    $('emu-pads').replaceChildren(...pads.map(pad => {
      const li = el('li', 'emu-pad');
      const name = pad.id.replace(/\s*\(.*\)\s*$/, '').replace(/^[0-9a-f]{4}-[0-9a-f]{4}-/i, '').trim() || 'Controller';
      li.append(useOf(svgOf('emu-pad__icon', '0 0 32 32'), '#i-game--console'.slice(1)), el('span', 'emu-store__name', name), el('span', 'emu-row__sub', 'Connected'));
      return li;
    }));
  }
  for (const type of ['gamepadconnected', 'gamepaddisconnected']) window.addEventListener(type, () => { if (drawer === 'emu-pads-pane') renderPads(); });
  for (const b of drawerButtons) b.addEventListener('click', () => openDrawer(drawer === b.dataset.drawer ? null : b.dataset.drawer));
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !drawer || panelOpen() || document.querySelector('.rux--modal.is-visible')) return;
    const b = drawerButtons.find(x => x.dataset.drawer === drawer);
    openDrawer(null);
    b.focus({ preventScroll: true });
  });

  // A console pressed, in the room or the collection, is the one whose games show.
  function choose(system) {
    if (!gamesOf(system).length) return;
    pick = system;
    showPick();
    shelf = system;
    renderMine();
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
  // `other` is a second answer, [label, run], in place of Keep.
  function say(text = '', undo = null, ms = 4000, bad = false, label = 'Undo', other = null) {
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
    $('emu-room-keep').hidden = !asks && !other;
    $('emu-room-keep').textContent = other ? other[0] : 'Keep';
    $('emu-room-keep').onclick = () => { say(); other?.[1](); };
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
  // The glass goes dark, a last glow fading from it.
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
  // DOWNLOAD FROM THE STORE. A console comes into the room's first clear
  // spot and its emulator is set up where it stands. A game whose console is
  // not set up sets that up first.
  async function getConsole(system) {
    if (plays(system) || settingUp.has(system)) return;
    landed = system;
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
  // Saves that cannot be brought stop the game, and the strip asks: Try
  // again, or Play anyway on this Mac's own saves.
  async function play(g, anyway = false) {
    if (stand.get(g.system) === 'on') await insert(g);
    say('Starting…');
    try { await R.thisMac.play(g, say, { anyway }); sfx.start(); say(`Playing ${nameOf(g)}.`); if (!HANDHELD.has(g.system)) showOn(g); }
    catch (error) {
      if (!error.notBrought) { sayNo(error.message); return; }
      sfx.no();
      say(`${error.message}`, () => play(g), 30000, true, 'Try again', ['Play anyway', () => play(g, true)]);
    }
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
  // A THING'S MOVES. Where each thing in the room stands is kept whole each
  // time one moves; a Mac Status has not saved yet has no row to keep it on,
  // and is told so. Every thing keeps the spot it is drawn at, so moving one
  // moves no other; `at` gives the spots that change. A console's spot
  // goes with it when it is removed.
  async function keep(at = {}) {
    room = { placed: Object.fromEntries(Object.entries({ ...drawn, ...at })
      .filter(([key]) => stand.has(key) || key === 'tv')) };
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
    return keep({ [system]: spot });
  }
  // TIDY UP: the room as it is laid out, the TV at its top and the consoles
  // in rows under it; Undo puts everything back where it was.
  function tidy() {
    const px = pxOf();
    const W = $('emu-units').clientWidth / px;
    const before = { ...drawn };
    const sizeOf = node => [node.offsetWidth / px, node.offsetHeight / px];
    const next = arranged(W, Object.fromEntries([['tv', sizeOf($('emu-tv'))], ...[...stand.keys()].map(sys => [sys, sizeOf(unitOf(sys))])]));
    held = null;
    sfx.drop();
    keep(next);
    say('Tidied up.', () => keep(before), UNDO);
  }
  // Removing an emulator: the strip asks first. Its saves and settings are
  // kept in Supabase and checked, then the helper moves it to the Trash, and
  // every console that played in it leaves the room for Rux's Server. Where
  // keeping fails nothing is removed.
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
    sfx.unplug();
    stand = consolesNow();
    await keep();
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
      say(also.length ? `${emulator} is set up. ${also.map(R.systemName).join(' and ')} ${also.length > 1 ? 'are' : 'is'} in your room too.` : `${emulator} is set up.`);
    } catch (error) { console.error(error); sayNo(error.message); }
    settingUp.delete(system);
    await readMac();
    render();
  }

  // WHAT LETTING GO HERE WILL DO: the word shown while a game is held, the
  // place that lights, and the move itself, or null where nothing would
  // happen. A move the drag already shows, such as a console moved in the
  // room, has no word, and a drop anywhere in the room or the drawer lights
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
      if (s.state === 'arriving') return no('Still downloading', unit, [system, 'Not all here yet.']);
      if (s.state === 'held') return yes('Play', unit, () => play(g));
      if (keeps) return yes('Download and play', unit, () => download(g, true));
      return no('Update the helper to download', unit, [system, 'Update the helper to download.']);
    }
    return null;
  }

  // The same for a console: it only moves in the room, which it never leaves until it is removed.
  function consoleIntent(system, from, under, point, size) {
    if (!under?.closest('#emu-room')) return null;
    return { ...yes(null, null, () => moveTo(system, spotAt(point, size))), move: true };
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
  // CARRYING. A console in the room or the TV is itself moved, never a
  // copy of it. It lifts off the floor and follows the pointer a little
  // behind, closing a share of the gap each frame, the TV a smaller share
  // since it is heavier, and leans the way it is going by how fast it goes.
  // Put down in the room it stays where it is and the rest make room; let
  // go anywhere else it slides back to where it stood. Carbon has no motion
  // for a carried thing; where motion is reduced it keeps to the pointer
  // and does not lean.
  function carry(d) {
    const key = d.tv ? 'tv' : d.system;
    const node = d.tv ? $('emu-tv') : unitOf(d.system);
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
  const FROM = [['#emu-mine-games', 'shelf']];
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
    if (src.dataset.console) { drag = { ...at, system: src.dataset.console, from: 'room' }; return; }
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
      if (drag.from === 'room') carry(drag);
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
      [room, driveRow, files] = await Promise.all([macName ? R.data.room(macName) : null, R.data.lastScan(), R.data.files()]);
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
    // The loading line goes as the page is drawn, the room or the store.
    $('emu-loading')?.remove();
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
