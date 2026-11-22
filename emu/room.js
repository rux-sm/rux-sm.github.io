/* ==========================================================================
   room.js — the Library as a room, Emu's front page
   --------------------------------------------------------------------------
   Where Rux Emu Helper answers, the page is one tile, the room's: its head,
   then the room, Your Mac: Consoles, a column down its left, the TV at the
   top and the one console out centred under it, and Games, a column down
   its right, then its foot, a button for each drawer. Without the
   helper the store, Rux's Server, is the whole page.

   A console has three places. On the server it is not on this Mac; in
   Consoles, the room's column, it is set up and put away; in the room it is out,
   a home console wired to the TV. Only one is out at a time, and taking one
   out puts the other away. Which consoles are set up is read from the
   helper; which one is out is this Mac's room, kept on its row in Supabase,
   so the page opens on the one last out. Pressing or right-clicking the
   console out opens its menu: Remove, which the strip asks about before the
   emulator's saves and settings are kept and it is taken off this Mac. Its
   power light, on its drawing, is lit while it is set up and flashes on and
   off while it is set up or removed, while the strip says how far it has
   got. Its name shows under the pointer or the keyboard.

   The strip, in the head after the room's name, is the room's one place for
   words. At rest it shows this Mac as Carbon's icon indicators: the helper,
   the room this Mac has free and, once it is late, the server's nightly
   scan, each opening Status where it is wrong; while a move runs it names
   it, after one it says what it did, with Undo where it can be taken back,
   and it asks before an emulator is removed. The TV's glass shows only a
   home console's game, its cover once it starts. The TV's foot, or a press
   anywhere on it, opens its menu, the room's own: Sound. The pages' menu
   and Search are the shell's, the same on every page.

   Consoles, the left column, lists the consoles set up, each its drawing
   over its wordmark. Pressing one chooses it, and again lets it go; Games
   shows only the chosen console's games. Dragging it into the room,
   or Take out in its menu, a right click away, takes it out. The one out
   leaves an empty spot, and dragging it back onto the column, or Put away
   in its menu, puts it away.
   Games, the right column, lists the chosen console's games, favourites
   first, each cover as wide as the column, one still arriving under a veil
   that lifts as it comes, and a game is played by carrying it onto the
   console out. Both scroll up and down and end in an outlined Download
   tile that opens Rux's Server on that alone.

   The tile's foot has a button for each drawer, which opens up over the
   room's foot, one at a time, all closed each time the page loads. Saves
   is the picked console's saves as cards: each game's, the one in it and
   those out, with Take out, Put in and a name to change, then the
   console's own. Controllers is each controller this Mac sees, and says
   its button layouts stay on each Mac for now.

   Rux's Server has two tabs of cards. Consoles is every console with
   games, its drawing from brand/consoles/ over its name and count; Games is
   the chosen console's games as covers, A to Z or favourites first. Each
   card has Download, or why not: on a console it sets up its emulator,
   which comes out into the room, and on a game it downloads it, setting up
   its console first where it must. A console's card, pressed off its
   button, turns to its games; a game's cover opens its side panel,
   game-panel.js, and the store comes back when the panel closes.
   ?game=<system>/<title>, from Search or Problems, picks that game's
   console and opens its panel.

   What is picked up from a drawer is held as a copy. A word follows it and
   says what letting go will do, and a place it would land lights where
   that place is one thing, never the room as a whole. A game onto its
   console or the TV plays it; a console it does not fit says so in red and
   nothing happens. A game is taken off this Mac from its side panel.

   The wrong console shakes its head and says a line. A game played goes in
   first as it would on the real console: a cartridge drops into its slot, a
   disc slides onto a tray. Each move makes a small sound, made here with no
   sound files, which the TV's menu turns off, remembered in this browser.
   docs/plans/emu-room.md is what the room is still to do.
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
  // which console is out, `out`; null until one is taken out.
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
  // Games whose Download waits on their console's setup, by key.
  const waiting = new Set();
  // The console chosen in Consoles, whose games Games shows; a console
  // taken out is chosen with it.
  let chosen = null;
  // The consoles set up on this Mac as drawn, each 'on', 'setting' or 'keeping'.
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
  // The console out, the one in the room, hooked up to the TV where it is a
  // home console; every other console set up is put away in Consoles. It is
  // kept with this Mac's room, so the page opens on the one last out.
  const outNow = () => (room?.out && stand.has(room.out) ? room.out : null);
  // Every console with games whose emulator this Mac has, in the
  // collection's order, until it is removed: 'on' where it is set up,
  // 'setting' while it is set up and 'keeping' while its emulator is taken
  // off. Which consoles are set up is read from the helper, never kept.
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
  // THE TV'S MENU, under its foot: what is the room's alone, Sound. The other pages and Search are the shell's, as Carbon keeps a
  // product's navigation in its shell on every page.
  function openTvMenu() {
    const menu = $('emu-tv-menu');
    const button = $('emu-tv-menu-open');
    if (window.Rux.menu.isOpen(menu)) { window.Rux.menu.close(menu); return; }
    menu.replaceChildren(
      menuItem(menu, 'Sound', toggleSound, { icon: iconOf(loud ? '#m-volume_up' : '#m-volume_off'), role: 'menuitemcheckbox', checked: loud }));
    window.Rux.menu.open(menu, button);
  }
  $('emu-tv-menu-open').addEventListener('click', openTvMenu);
  // A press on the TV opens it too, but not one on its foot, which opens it itself.
  $('emu-tv').addEventListener('click', e => { if (!e.target.closest('a, button')) openTvMenu(); });
  $('emu-tv').addEventListener('contextmenu', e => { e.preventDefault(); openTvMenu(); });

  // A console's drawing: its PNG in brand/consoles/, cropped to the
  // console, shown pixel for pixel in its own colours, the same in every
  // theme. app.css draws it at its own size in art pixels, --emu-w by
  // --emu-h, read once it has loaded, and the room is laid out again then.
  function consoleOf(system) {
    const img = el('img', 'emu-console');
    img.addEventListener('load', () => {
      img.style.setProperty('--emu-w', img.naturalWidth);
      img.style.setProperty('--emu-h', img.naturalHeight);
      if (img.closest('#emu-units')) layout();
    });
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
  // The console out, standing under the TV: its drawing, a button that,
  // pressed or right-clicked, opens its menu, and dragged onto Consoles,
  // goes back to its spot. Its power
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
    nes: [4, 21, 1, 1, 'error'], snes: [3, 19, 1, 1, 'error'], n64: [17, 21, 2, 1, 'error'], gc: [2, 3, 2, 2, 'warning'],
    wii: [1, 8, 2, 1, 'success'], wiiu: [28, 16, 1, 1, 'info'], switch: [9, 16, 1, 1, 'success'], gb: [2, 5, 1, 1, 'error'],
    gbc: [2, 5, 1, 1, 'error'], gba: [21, 2, 1, 1, 'success'], nds: [17, 4, 1, 1, 'success'], n3ds: [2, 13, 2, 2, 'info'],
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
    body.append(consoleOf(system));
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
  // A CONSOLE'S MENU, Design's menu under the console, in the room or in
  // Consoles: Take out or Put away, then Remove, which the strip then asks
  // about, or what it is busy with. So no control is drawn on the room, and
  // an emulator is never taken off in one press.
  function openMenu(system, trigger) {
    const menu = $('emu-console-menu');
    window.Rux.menu.close(menu);
    const state = stand.get(system);
    const emulator = emulatorOf(system);
    const item = (label, run, opts) => menuItem(menu, label, run, opts);
    menu.setAttribute('aria-label', R.systemName(system));
    menu.replaceChildren(...(BUSY[state] ? [item(BUSY[state](system), null, { off: true })]
      : [outNow() === system ? item('Put away', putAway) : item('Take out', () => takeOut(system)),
        item(`Remove ${emulator} from this Mac`, () => askRemove(system), { danger: true })]));
    window.Rux.menu.open(menu, trigger);
  }
  // The art pixel: three CSS pixels where the TV, 80 art pixels wide, takes
  // at most half the room's width, else two.
  const pxOf = () => (80 * 3 <= $('emu-space').getBoundingClientRect().width / 2 ? 3 : 2);
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
    const out = outNow();
    $('emu-units').replaceChildren(...(out ? [unit(out, stand.get(out))] : []));
    // The console just taken out lands.
    const landing = landed && unitOf(landed);
    landed = null;
    if (landing) { landing.classList.remove('emu-lands'); void landing.offsetWidth; landing.classList.add('emu-lands'); }
    $('emu-floor-empty').hidden = Boolean(out);
    $('emu-floor-empty').textContent = stand.size ? 'Take a console out of Consoles.' : 'Download a console from Consoles.';
    layout();
    renderMine();
    renderKit();
  }
  // THE WIRE, from the home console out to the TV, hooked up as long as it
  // is out: out of the console's back and into the TV's foot. It draws
  // itself in from the console each time one is plugged in.
  let wired = null;
  function drawWire() {
    const svg = $('emu-wire');
    const out = outNow();
    const to = out && !HANDHELD.has(out) ? out : null;
    const u = to && unitOf(to)?.querySelector('.emu-console');
    svg.style.display = u ? 'block' : 'none';
    const fresh = Boolean(u) && wired !== to;
    wired = u ? to : null;
    if (!u) return;
    const r = $('emu-space').getBoundingClientRect();
    const a = u.getBoundingClientRect();
    const b = $('emu-tv').getBoundingClientRect();
    const [x1, y1, x2, y2] = [a.left + a.width / 2 - r.left, a.top - r.top + 2, b.left + b.width / 2 - r.left, b.bottom - r.top - 2].map(Math.round);
    svg.firstElementChild.setAttribute('d', `M${x1} ${y1} C ${x1} ${y1 - 36}, ${x2} ${y2 + 48}, ${x2} ${y2}`);
    if (!fresh) return;
    svg.classList.add('emu-wire--plug');
    void svg.getBoundingClientRect();
    svg.classList.remove('emu-wire--plug');
  }
  // THE ROOM'S LAYOUT: the TV at the top, centred, two gaps under the
  // room's head, and the console out centred two gaps under it, in art
  // pixels, so nothing in the room is moved by hand.
  const GAP = 6;
  // The console just taken out, which lands as the room is next drawn.
  let landed = null;
  function layout() {
    const px = pxOf();
    const W = $('emu-units').clientWidth / px;
    const tv = $('emu-tv');
    const at = [[tv, Math.round((W - tv.offsetWidth / px) / 2), 2 * GAP]];
    const li = $('emu-units').firstElementChild;
    if (li) at.push([li, Math.round((W - li.offsetWidth / px) / 2), 4 * GAP + tv.offsetHeight / px]);
    for (const [node, x, y] of at) {
      // A thing drawn for the first time appears in its place; the TV slides when the room's width changes.
      const fresh = !node.style.getPropertyValue('--emu-left');
      if (fresh) node.style.transition = 'none';
      node.style.setProperty('--emu-left', x);
      node.style.setProperty('--emu-top', Math.round(y));
      if (fresh) { void node.offsetWidth; node.style.transition = ''; }
    }
    drawWire();
    setTimeout(drawWire, 260);
  }
  // GAMES, the column down the room's right: the games of the console
  // chosen in Consoles, and none while none is chosen, a game of a console
  // not out dimmed and saying to take it out,
  // favourites first and then A to Z, one under another as wide as the
  // column, each as tall as its art: a favourite this Mac lacks is dimmed,
  // one arriving sits under a veil that lifts as it comes, and one whose
  // console is busy is dimmed with why in its title. A cover shows no name
  // under it, only in its title. The Download tile ends it.
  let marks = new Map();
  fetch('brand/marks.svg').then(r => (r.ok ? r.text() : '')).then(text => {
    marks = new Map([...new DOMParser().parseFromString(text, 'image/svg+xml').querySelectorAll('symbol')].map(s => [s.id, s]));
    if (games.length) renderKit();
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
  function renderMine() {
    const out = outNow();
    if (chosen && !stand.has(chosen)) chosen = null;
    const shown = chosen;
    const here = new Map(mineNow().map(([g, s]) => [keyOf(g), s]));
    const list = shown ? games.filter(g => g.system === shown && (here.has(keyOf(g)) || waiting.has(keyOf(g)) || g.notes?.favourite))
      .sort((a, b) => Number(Boolean(b.notes?.favourite)) - Number(Boolean(a.notes?.favourite))) : [];
    $('emu-mine-games').replaceChildren(...list.map(g => {
      const li = coverItem(g);
      const b = li.firstChild;
      const s = here.get(keyOf(g));
      if (waiting.has(keyOf(g))) {
        const veil = el('span', 'emu-cover__veil');
        veil.style.blockSize = '100%';
        b.querySelector('.emu-cover-art').append(veil);
        b.title = `${g.title}. Setting up ${emulatorOf(g.system)} first.`;
      } else if (!s) { b.classList.add('emu-cover--away'); b.title = `${g.title}, a favourite not on this Mac`; }
      else if (s.state === 'arriving') {
        const veil = el('span', 'emu-cover__veil');
        veil.style.blockSize = veilOf(s);
        b.querySelector('.emu-cover-art').append(veil);
      } else if (stand.get(g.system) !== 'on') {
        b.classList.add('emu-cover--away');
        b.title = `${g.title}. ${BUSY[stand.get(g.system)]?.(g.system) ?? ''}`.trim();
      } else if (g.system !== out) {
        b.classList.add('emu-cover--away');
        b.title = `${g.title}. Take out the ${R.systemName(g.system)} to play it.`;
      }
      return li;
    }), ...(shown ? [addTile('Download games', b => { choose(shown); openStore(b, 'emu-store-games-tab'); }, shown)] : []));
    // The tile takes the shape of the first cover once its art has come.
    const tile = $('emu-mine-games').querySelector('.emu-add');
    const first = $('emu-mine-games').querySelector('.emu-cover img');
    const shape = () => { const box = first.closest('.emu-cover').style.getPropertyValue('--emu-box'); if (box) tile.style.setProperty('--emu-box', box); };
    if (first?.complete) shape(); else first?.addEventListener('load', shape);
    $('emu-mine-none').hidden = Boolean(shown);
  }
  // CONSOLES, the column down the room's left: every console set up on this Mac and put away,
  // each its drawing over its wordmark, or its name where it has none, pressed or dragged into the room to take
  // it out, then the tile that downloads another.
  // The console out keeps its place as an empty spot, its outline over its
  // wordmark, so nothing moves. Pressing a console chooses it, which lights
  // its tile, and pressing it again lets it go; only a drag or its menu, a
  // right click away, takes it out or puts it away.
  function renderKit() {
    const out = outNow();
    $('emu-kit').replaceChildren(...[...stand].map(([system, state]) => {
      const li = el('li');
      const isOut = system === out;
      const b = el('button', `emu-kit${isOut ? ' emu-kit--out' : ''}${system === chosen ? ' emu-kit--chosen' : ''}`);
      b.setAttribute('aria-pressed', String(system === chosen));
      b.setAttribute('aria-haspopup', 'menu');
      b.type = 'button';
      b.dataset.spot = system;
      if (!isOut) b.dataset.kit = system;
      b.title = BUSY[state]?.(system) ?? (isOut ? `The ${R.systemName(system)} is out` : R.systemName(system));
      b.disabled = state !== 'on';
      const mark = markOf(system);
      if (mark) b.setAttribute('aria-label', isOut ? `${R.systemName(system)}, out` : R.systemName(system));
      const spot = el('span', 'emu-kit__spot');
      spot.append(consoleOf(system));
      b.append(spot, mark ? el('span', 'emu-kit__mark') : el('span', 'emu-kit__name', R.systemName(system)));
      if (mark) b.lastChild.append(mark);
      b.addEventListener('click', () => { chosen = chosen === system ? null : system; if (chosen) choose(chosen); renderKit(); renderMine(); });
      b.addEventListener('contextmenu', e => { e.preventDefault(); chosen = system; renderKit(); openMenu(system, $('emu-kit').querySelector(`[data-spot="${system}"]`)); });
      li.append(b);
      return li;
    }), addTile('Download consoles', b => openStore(b, 'emu-store-consoles-tab')));
    $('emu-kit-none').hidden = stand.size > 0;
  }

  // How far a game arriving has come: how much of its cover its veil still
  // hides, and the words on its button.
  const veilOf = s => `${Math.round(100 - (s.total ? s.done / s.total : 0) * 100)}%`;
  const comingOf = s => (s.total ? `Downloading ${Math.round(s.done / s.total * 100)}%` : 'Downloading…');
  // Only that, and the room this Mac has free, follow while a game arrives:
  // its veils and its button change in place, and nothing else is drawn again.
  function showComing() {
    renderStrip();
    for (const g of games) {
      const s = stands(g);
      if (s.state !== 'arriving') continue;
      const covers = document.querySelectorAll(`.emu-cover[data-game="${CSS.escape(keyOf(g))}"]`);
      for (const c of covers) {
        const veil = c.querySelector('.emu-cover__veil');
        if (veil) veil.style.blockSize = veilOf(s);
        const button = c.closest('.emu-store__card')?.querySelector('.emu-store__action');
        if (button) button.textContent = comingOf(s);
      }
    }
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
    if (s.state === 'arriving') return action(comingOf(s));
    if (waiting.has(keyOf(g))) return action(`Setting up ${emulatorOf(g.system)}…`);
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
      b.append(consoleOf(system), el('span', 'emu-store__name', R.systemName(system)), el('span', 'emu-row__sub emu-store__games', countOf(gamesOf(system).length)));
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
    // The picked console where this Mac plays it, else the one out, else the first set up.
    const system = plays(pick) ? pick : outNow() ?? [...stand.keys()].find(plays) ?? null;
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

  // THE STORE, Rux's Server, opens from the Download tile that ends Consoles
  // or Games as Carbon's modal, showing only that: the consoles, or the
  // games of the tab's console, with no tabs or Console select, and headed
  // with what it shows. It closes itself on its close, Escape or the scrim,
  // and gives the focus back to the tile.
  let storeFrom = null;
  function openStore(trigger = storeFrom, tab = null) {
    storeFrom = trigger;
    $('emu-collection').classList.add('emu-store--one');
    if (tab) window.Rux.tabs.select($('emu-store-tabs'), $(tab));
    headStore();
    toTop();
    window.Rux.modal.open('emu-store', trigger);
  }
  const headStore = () => {
    const games = $('emu-store-games-tab').getAttribute('aria-selected') === 'true';
    $('emu-store-h').textContent = games && pick ? `${R.systemName(pick)} games` : 'Consoles';
  };
  // A console's card pressed turns the store to its games, and the heading with it.
  $('emu-store-tabs').addEventListener('rux:tab-selected', headStore);
  // A drawer's last tile, outlined with a plus, which opens the store; in
  // Games it has the shape of the console's covers.
  function addTile(label, run, system = null) {
    const li = el('li', 'emu-add-item');
    const b = el('button', 'emu-add');
    b.type = 'button';
    if (system) b.dataset.system = system;
    b.append(useOf(svgOf('emu-add__icon', '0 0 32 32'), '#i-add'.slice(1)), el('span', 'emu-add__label', label));
    b.addEventListener('click', () => run(b));
    li.append(b);
    return li;
  }
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
  // A drawer's row scrolls sideways, and a mouse wheel, which turns only up
  // and down, scrolls it sideways too while the pointer is over it.
  for (const row of document.querySelectorAll('.emu-mine__row')) {
    row.addEventListener('wheel', e => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || row.scrollWidth <= row.clientWidth) return;
      e.preventDefault();
      row.scrollLeft += e.deltaY;
    }, { passive: false });
  }
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
  }
  const render = () => { renderRoom(); renderServer(); };
  // The room's art pixel follows its width, so it is set again when the
  // room's box changes, and the layout with it.
  new ResizeObserver(() => {
    if (!helper) return;
    $('emu-room').style.setProperty('--emu-px', `${pxOf()}px`);
    layout();
  }).observe($('emu-space'));

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
  const told = () => JSON.stringify([helper, games.map(g => stands(g).state)]);
  const coming = () => JSON.stringify([free, games.map(g => stands(g).done ?? 0)]);
  const panelOpen = () => !$('emu-panel').hidden;
  async function look() {
    const before = told(), came = coming();
    const arriving = games.filter(g => stands(g).state === 'arriving');
    await readMac();
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
    wake();
  }
  // The glass goes dark, a last glow fading from it.
  function showOff() {
    showing = 0;
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
  // One setup a console, which every Download waiting on it shares.
  const setups = new Map();
  function getConsole(system) {
    if (plays(system)) return Promise.resolve();
    if (!setups.has(system)) {
      landed = system;
      setups.set(system, setUp(system).finally(() => setups.delete(system)));
    }
    return setups.get(system);
  }
  // A game waiting on its console's setup says so on its card and in the
  // Games drawer, under a veil, and downloads once the console is ready.
  async function getGame(g) {
    const key = keyOf(g);
    if (!plays(g.system)) {
      waiting.add(key);
      render();
      try { await getConsole(g.system); } finally { waiting.delete(key); }
    }
    if (plays(g.system)) await download(g); else render();
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
  // TAKING A CONSOLE OUT. The console out is kept with this Mac's room; a
  // Mac Status has not saved yet has no row to keep it on, and is told so.
  async function keepRoom() {
    if (!macName) return;
    try { if (!await R.data.saveRoom(macName, room)) say('This room is kept once Status has saved this Mac.'); }
    catch (error) { console.error(error); sayNo('The room could not be kept. Try again.'); }
  }
  // A console comes out of Consoles into the room, putting away the one that
  // was out, and a home console is hooked up to the TV; Undo takes the other
  // one out again. `quiet` is a move another says, such as a setup.
  function takeOut(system, quiet = false) {
    const was = outNow();
    if (was === system) return;
    room = { ...room, out: system };
    if (system) chosen = system;
    landed = system;
    sfx.plug();
    render();
    keepRoom();
    if (!quiet && system) say(`${R.systemName(system)} is out.`, was ? () => takeOut(was, true) : null, UNDO);
  }
  // The console out goes back to its spot in Consoles and the room is
  // empty; Undo takes it out again.
  function putAway() {
    const was = outNow();
    if (!was) return;
    room = { ...room, out: null };
    sfx.unplug();
    render();
    keepRoom();
    say(`${R.systemName(was)} is put away.`, () => takeOut(was, true), UNDO);
  }
  // Removing an emulator: the strip asks first. Its saves and settings are
  // kept in Supabase and checked, then the helper moves it to the Trash, and
  // every console that played in it goes back to the server, the room empty
  // where it was out. Where keeping fails nothing is removed.
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
    if (room?.out && !stand.has(room.out)) { room = { ...room, out: null }; keepRoom(); }
    render();
    say(`${emulator} is off this Mac. Your saves stay.`);
  }
  // Setting up installs its emulator from Supabase, then makes it ready with
  // the settings this Mac kept, as Status does. The console comes out as it
  // starts, its light blinking, and where setup fails the one that was out
  // comes back.
  async function setUp(system) {
    const emulator = emulatorOf(system);
    if (plays(system) || settingUp.has(system)) return;
    const was = room?.out ?? null;
    settingUp.add(system);
    stand = consolesNow();
    takeOut(system, true);
    say(`Setting up ${emulator}…`, null, 600000);
    try {
      const installer = R.installerOf(await R.data.files(), emulator);
      if (!installer) throw new Error(`Supabase holds no installer for ${emulator}.`);
      await R.carry.setUp(emulator, installer, R.keptVersion(installer),
        part => say(part === 'install' ? `Installing ${emulator}…` : `Making ${emulator} ready…`, null, 600000));
      const also = Object.keys(R.SYSTEMS).filter(sys => sys !== system && emulatorOf(sys) === emulator && !stand.has(sys) && gamesOf(sys).length);
      sfx.done();
      say(also.length ? `${emulator} is set up. ${also.map(R.systemName).join(' and ')} ${also.length > 1 ? 'are' : 'is'} in Consoles too.` : `${emulator} is set up.`);
    } catch (error) { console.error(error); sayNo(error.message); room = { ...room, out: was }; keepRoom(); }
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

  // A console from Consoles let go over the room's space comes out; the
  // console out let go over Consoles goes back to its spot, which lights.
  const kitIntent = (system, under) => (under?.closest('#emu-space') ? yes(`Take out the ${R.systemName(system)}`, null, () => takeOut(system)) : null);
  const awayIntent = (system, under) => (under?.closest('#emu-rail-kit') ? yes('Put away', $('emu-kit').querySelector(`[data-spot="${system}"]`), putAway) : null);
  const intentOf = (d, under, point) => (d.g ? intent(d.g, d.from, under, point)
    : d.from === 'room' ? awayIntent(d.system, under) : kitIntent(d.system, under));

  // THE DRAG, with the pointer, where the helper answers. A press that does
  // not move is the cover's or the console's own click.
  let drag = null;
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
    const src = e.target.closest?.('.emu-cover[data-game], [data-kit], [data-console]');
    if (!src || e.button > 0 || !helper) return;
    const at = { src, x: e.clientX, y: e.clientY, on: false, id: e.pointerId };
    if (src.dataset.kit) { drag = { ...at, system: src.dataset.kit, from: 'kit' }; return; }
    if (src.dataset.console) { if (stand.get(src.dataset.console) === 'on') drag = { ...at, system: src.dataset.console, from: 'room' }; return; }
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
      // What is picked up is held as a copy, drawn where the ghost is, at
      // the room's art pixel, with no ids or live region of its own.
      const ghost = el('div', 'emu-ghost');
      ghost.style.setProperty('--emu-px', $('emu-room').style.getPropertyValue('--emu-px'));
      const copy = drag.src.cloneNode(true);
      for (const n of [copy, ...copy.querySelectorAll('[id], [role]')]) { n.removeAttribute('id'); n.removeAttribute('role'); }
      Object.assign(copy.style, { position: 'static', transform: 'none', inlineSize: `${r.width}px`, blockSize: `${r.height}px` });
      ghost.append(copy);
      document.body.append(ghost);
      drag.ghost = ghost;
      drag.src.classList.add('emu-held');
      // A game's console lights and the rest dim, so where it goes shows.
      if (drag.g) for (const u of units()) u.classList.add(u.dataset.system === drag.g.system ? 'emu-unit--fit' : 'emu-unit--dim');
    }
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
