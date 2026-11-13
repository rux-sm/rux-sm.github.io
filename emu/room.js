/* ==========================================================================
   room.js — the Library as a room, on room.html
   --------------------------------------------------------------------------
   Your Mac is a media wall, shown where Rux Emu Helper answers. The TV
   stands on a stand of cubbies, one per home console and a ghost cubby to
   bring the next to, never fewer than three, in two tiers past five; the
   handhelds stand in a dock on the stand beside the TV. A bookcase holds
   the favourites face out, one this Mac lacks dimmed, over this Mac's other
   games as spines, one still arriving under a veil that lifts as it comes.
   Which consoles stand there, and which of them are plugged in, is this
   Mac's room, kept on its row in Supabase; until one is moved, the console
   of each game this Mac holds stands there. A console is plugged in only
   where this Mac has its emulator too. Its plug is a button: plugging in
   sets its emulator up on this Mac, and unplugging takes the emulator off,
   its saves and settings kept, once no other plugged-in console uses it. A line says the helper runs and where the games come from,
   and opens Status; beside it is how much room is free.

   Rux's Collection is a row of consoles, one for each system with games,
   each its drawing from brand/consoles.svg over its name and count; one in
   the room is outlined and faint, the place it goes back to, and one whose
   emulator this Mac has shows a green light. Pressing a console, there or in
   the room, picks it: its name, count and how it stands show beneath, with
   Bring to Your Mac or Put back, over its games as covers in one row, A to
   Z, one this Mac holds dimmed with a tick. A game opens in the side panel,
   game-panel.js.

   A game or a console is dragged with the pointer, where the helper
   answers: a console onto Your Mac comes in, and an unplugged one dragged
   back onto Rux's Collection goes back. A word
   follows it and says what letting go will do, and the place it would land
   lights: onto Your Mac downloads it, onto its console or the TV plays it,
   downloading it first if it must, onto the Favourites shelf marks it, and
   back onto Rux's Collection takes it off this Mac or off Favourites. A
   console it does not fit says so in red and nothing happens. One line by
   Your Mac's name says what a move did. A game taken off this Mac leaves
   the shelf at once and its files go a few seconds later, so Undo is only
   putting it back.

   The wrong console shakes its head and says a line. A game played goes in
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
  // Consoles whose emulator is being set up now.
  const settingUp = new Set();
  // The consoles standing in the room as drawn, each 'on', 'off' or 'setting'.
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
  // Games taken off this Mac whose files go once Undo's time has passed, by key.
  const leaving = new Map();
  // Games to play as soon as they have arrived, by key.
  const wanted = new Set();
  // How a game stands on this Mac; one leaving it is away already.
  const standing = g => (leaving.has(keyOf(g)) ? { state: 'away', total: 0, done: 0 } : stands(g));
  const emulatorOf = system => emulators?.systems?.[system]?.emulator ?? null;
  // The games this Mac holds or is being sent, each with how it stands.
  const mineNow = () => games.map(g => [g, standing(g)]).filter(([, st]) => st.state === 'held' || st.state === 'arriving');
  // The room as it would be kept: its own, else the console of each game this Mac holds, plugged in.
  const wishes = () => ({ ...(room ?? Object.fromEntries(mineNow().map(([g]) => [g.system, true]))) });
  // Each console in the room, in the collection's order. One is on where it
  // was left plugged in and this Mac has its emulator.
  const consolesNow = () => {
    const wish = wishes();
    return new Map(Object.keys(R.SYSTEMS).filter(sys => sys in wish)
      .map(sys => [sys, settingUp.has(sys) ? 'setting' : wish[sys] && plays(sys) ? 'on' : 'off']));
  };

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
  // jingle to play and a buzz for no. The header's button turns it off.
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
  function showSound() {
    const b = $('emu-sound');
    b.hidden = !helper;
    b.setAttribute('aria-pressed', String(loud));
    b.title = loud ? 'Sound is on' : 'Sound is off';
    b.querySelector('use').setAttribute('href', loud ? '#m-volume_up' : '#m-volume_off');
  }
  $('emu-sound').addEventListener('click', () => {
    loud = !loud;
    try { localStorage.setItem(KEPT, loud ? 'on' : 'off'); } catch { /* it lasts until the page closes */ }
    showSound();
    sfx.pick();
  });

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
  // A console's drawing, which app.css colours. A handheld's box is cut to
  // its own width, from x, so it stands in the dock as tall as a home
  // console; each width keeps the drawing a whole number of art pixels wide,
  // 24 art pixels to the box's 64 high.
  const HANDBOX = { gb: [24, 48], gbc: [24, 48], gba: [4, 88], nds: [20, 56], n3ds: [12, 72] };
  const consoleOf = system => useOf(svgOf('emu-console', '0 0 96 64'), `emu-console-${system}`);
  function handOf(system) {
    const [x, w] = HANDBOX[system] ?? [0, 96];
    const svg = svgOf('emu-console emu-console--hand', `${x} 0 ${w} 64`);
    svg.style.setProperty('--emu-art-w', w * 24 / 64);
    useOf(svg, `emu-console-${system}`);
    // The symbol drawn its whole size, so the cut box shows only its middle.
    svg.lastChild.setAttribute('width', 96);
    svg.lastChild.setAttribute('height', 64);
    return svg;
  }
  // The consoles standing in the room, in its cubbies or its dock.
  const units = () => $('emu-room').querySelectorAll('.emu-unit');
  const unitOf = system => $('emu-room').querySelector(`.emu-unit[data-system="${system}"]`);

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
  // A console over its socket, in its cubby or, a handheld, in the dock. Its
  // drawing is a button that picks it and is dragged; its plug is a button
  // too. Plugged in, the plug is pushed into the socket and its light is on;
  // unplugged, the plug hangs loose, the socket blinks and it says "Plug in";
  // while its emulator is set up, the light blinks. A handheld shows only its
  // light, its name on the plug's and the drawing's labels.
  const UNIT = { on: 'emu-unit', off: 'emu-unit emu-unit--off', setting: 'emu-unit emu-unit--setting' };
  function unit(system, state) {
    const called = R.systemName(system);
    const hand = HANDHELD.has(system);
    const li = el('li', `${UNIT[state]} ${hand ? 'emu-unit--hand' : 'emu-cubby'}`);
    li.dataset.system = system;
    const body = el('button', 'emu-unit__console');
    body.type = 'button';
    body.dataset.console = system;
    body.setAttribute('aria-label', `${called}, ${state === 'on' ? 'plugged in' : state === 'setting' ? 'being set up' : 'unplugged'}`);
    body.append(hand ? handOf(system) : consoleOf(system));
    body.addEventListener('click', () => choose(system));
    const plug = el('button', 'emu-plug');
    plug.type = 'button';
    plug.disabled = state === 'setting';
    plug.title = state === 'on' ? `Unplug the ${called}` : `Plug in the ${called}`;
    plug.setAttribute('aria-label', plug.title);
    const drawing = svgOf('emu-plug__drawing', '0 0 16 16');
    drawing.innerHTML = '<rect class="emu-plug__socket" x="2" y="12" width="12" height="4" rx="1"/>'
      + `<path class="emu-plug__cord" d="${state === 'on' ? 'M8 0 V6' : 'M8 0 C 8 4, 4 3, 4 8'}"/>`
      + '<g class="emu-plug__body"><rect class="emu-plug__prong" x="5" y="12" width="1.5" height="3"/><rect class="emu-plug__prong" x="9.5" y="12" width="1.5" height="3"/><rect x="4" y="6" width="8" height="6" rx="1"/></g>';
    plug.append(drawing);
    plug.addEventListener('click', () => (state === 'on' ? unplug : plugIn)(system));
    const name = el('span', 'emu-unit__name');
    name.title = state === 'setting' ? `Setting up ${emulatorOf(system)}…` : called;
    name.append(el('i', 'emu-led'), el('span', null, state === 'setting' ? `Setting up ${emulatorOf(system)}…` : state === 'off' ? 'Plug in' : called));
    const under = el('span', 'emu-unit__under');
    under.append(plug, name);
    li.append(body, under);
    return li;
  }
  // The cubby the next console is brought to, outlined; in an empty room it
  // says so.
  function ghostCubby(empty) {
    const li = el('li', 'emu-cubby emu-cubby--ghost');
    li.id = 'emu-ghost-cubby';
    li.title = 'Drag a console here from Rux\'s Collection';
    if (empty) li.append(el('span', null, 'Drag a console up here'));
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
    const mine = mineNow();
    stand = consolesNow();
    const homes = [...stand].filter(([system]) => !HANDHELD.has(system));
    const hands = [...stand].filter(([system]) => HANDHELD.has(system));
    // A cubby per home console, the ghost one while any home console with
    // games is still in the collection, at least three, in two tiers past five.
    const more = Object.keys(R.SYSTEMS).some(system => !HANDHELD.has(system) && !stand.has(system) && gamesOf(system).length);
    const cells = homes.map(([system, state]) => unit(system, state));
    if (more) cells.push(ghostCubby(!stand.size));
    while (cells.length < 3) cells.push(el('li', 'emu-cubby'));
    if (!stand.size) cells.unshift(cells.pop());
    const tiers = cells.length > 5 ? 2 : 1;
    $('emu-stand').style.setProperty('--emu-per', Math.ceil(cells.length / tiers));
    $('emu-stand').replaceChildren(...cells);
    // Up to three handhelds stand right of the TV; more share both sides.
    const left = hands.length > 3 ? hands.slice(0, Math.floor(hands.length / 2)) : [];
    $('emu-dock-l').replaceChildren(...left.map(([system, state]) => unit(system, state)));
    $('emu-dock-r').replaceChildren(...hands.slice(left.length).map(([system, state]) => unit(system, state)));
    document.querySelector('.emu-scene').classList.toggle('emu-scene--crowded', tiers === 2);
    showSound();
    $('emu-onmac').replaceChildren(...mine.map(([g, s]) => {
      const li = coverItem(g, true);
      const b = li.firstChild;
      if (s.state === 'arriving') {
        const veil = el('span', 'emu-cover__veil');
        veil.style.blockSize = `${Math.round(100 - (s.total ? s.done / s.total : 0) * 100)}%`;
        b.append(veil);
      } else if (stand.get(g.system) !== 'on') {
        b.classList.add('emu-cover--away');
        b.title = stand.has(g.system) ? `${g.title}. Plug in the ${R.systemName(g.system)} to play.` : `${g.title}. Needs the ${R.systemName(g.system)}.`;
      }
      return li;
    }));
    $('emu-onmac-h').textContent = `On this Mac · ${countOf(mine.filter(([, s]) => s.state === 'held').length)}`;
  }

  // RUX'S COLLECTION ---------------------------------------------------------
  // The picked console is pressed and named, with its count, how it stands
  // on this Mac and the move it can make without being dragged, over its games.
  function showPick() {
    for (const b of $('emu-cabinet').children) b.setAttribute('aria-pressed', String(b.dataset.system === pick));
    const list = pick ? gamesOf(pick) : [];
    $('emu-picked').textContent = pick ? R.systemName(pick) : '';
    const emulator = pick && emulatorOf(pick);
    const st = stand.get(pick);
    const state = !pick || !emulator ? '' : !helper ? `Plays in ${emulator}`
      : st === 'on' ? 'In your room, ready to play' : st === 'setting' ? `Setting up ${emulator}`
      : st === 'off' ? 'In your room, unplugged' : plays(pick) ? `${emulator} is already set up` : `Plays in ${emulator}`;
    $('emu-picked-sub').textContent = [pick ? countOf(list.length) : '', state].filter(Boolean).join(' · ');
    const move = $('emu-picked-move');
    const [label, run] = !pick || !helper ? [] : !st ? ['Bring to Your Mac', () => bring(pick)] : st === 'off' ? ['Put back', () => putBack(pick)] : [];
    move.hidden = !label;
    move.textContent = label ?? '';
    move.onclick = run ?? null;
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
      // One in the room leaves its place outlined; any other can be dragged up.
      const away = stand.has(system);
      const b = el('button', away ? 'emu-cabinet__console emu-cabinet__console--away' : 'emu-cabinet__console');
      b.type = 'button';
      b.dataset.system = system;
      if (!away) b.dataset.console = system;
      const name = el('span', 'emu-cabinet__name', R.systemName(system));
      if (!away && plays(system)) {
        b.append(el('i', 'emu-led'));
        b.title = `${emulatorOf(system)} is set up on this Mac`;
      }
      b.append(consoleOf(system), name, el('span', 'emu-cabinet__count', away ? 'In your room' : countOf(gamesOf(system).length)));
      b.addEventListener('click', () => choose(system));
      return b;
    }));
    showPick();
  }
  // A console pressed, in the room or the collection, is the one whose games show.
  function choose(system) {
    if (!gamesOf(system).length) return;
    pick = system;
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
    const coming = games.filter(g => stands(g).state === 'arriving');
    await readMac();
    if (coming.some(g => stands(g).state === 'held')) sfx.done();
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
    sfx.drop();
    await look();
    render();
  }
  // The slot a game goes into, as a part of its console's drawing from the
  // top, and the consoles that take a disc.
  const SLOT = { nes: 0.5, snes: 0.47, n64: 0.47, gc: 0.31, wii: 0.3, wiiu: 0.88, switch: 0.47, gb: 0.03, gbc: 0.12, gba: 0.37, nds: 0.56, n3ds: 0.56, psx: 0.53, ps2: 0.78, xbox: 0.66 };
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
    try { await R.thisMac.play(g, say); sfx.start(); }
    catch (error) { say(error.message); }
  }
  // The console that will not have it shakes its head, buzzes and says why.
  const NO = [name => `Nope. That's a ${name} game.`, name => `Doesn't fit. Try the ${name}.`, name => `*blows on it* Still a ${name} game.`, name => `Wrong slot! It wants a ${name}.`];
  const wrong = system => NO[Math.floor(Math.random() * NO.length)](R.systemName(system));
  function refuse(system, text) {
    const u = unitOf(system);
    sfx.no();
    if (!u) { say(text); return; }
    u.classList.remove('emu-unit--shakes');
    void u.offsetWidth;
    u.classList.add('emu-unit--shakes');
    u.querySelector('.emu-bubble')?.remove();
    const bubble = el('div', 'emu-bubble', text);
    bubble.setAttribute('role', 'status');
    u.append(bubble);
    setTimeout(() => { bubble.remove(); u.classList.remove('emu-unit--shakes'); }, 1800);
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
    sfx.drop();
    render();
    say(`${nameOf(g)} is off this Mac. Its saves stay.`, () => { clearTimeout(leaving.get(key)?.timer); leaving.delete(key); render(); }, UNDO);
  }
  window.addEventListener('pagehide', () => { for (const { timer, go } of leaving.values()) { clearTimeout(timer); go(); } });
  async function favourite(g, on) {
    try { await R.data.saveNotes({ system: g.system, title: g.title, favourite: on }); }
    catch (error) { console.error(error); say('The favourite could not be saved. Try again.'); return; }
    g.notes = { ...g.notes, system: g.system, title: g.title, favourite: on };
    sfx.drop();
    render();
  }

  // A CONSOLE'S MOVES. The room is kept whole each time one moves; a Mac
  // Status has not saved yet has no row to keep it on, and is told so.
  async function keep(next) {
    room = next;
    render();
    if (!macName) return;
    try { if (!await R.data.saveRoom(macName, next)) say('This room is kept once Status has saved this Mac.'); }
    catch (error) { console.error(error); say('The room could not be kept. Try again.'); }
  }
  // Into the room: plugged in already where this Mac has its emulator.
  async function bring(system) {
    if (stand.has(system)) return;
    const ready = plays(system);
    sfx.drop();
    await keep({ ...wishes(), [system]: ready });
    if (ready) say(`${emulatorOf(system)} is already set up. The ${R.systemName(system)} is ready.`);
  }
  function putBack(system) {
    if (stand.get(system) !== 'off') { refuse(system, 'Unplug me first.'); return; }
    sfx.drop();
    const next = wishes();
    delete next[system];
    keep(next);
  }
  // Plugging in sets its emulator up where this Mac lacks it: installed from
  // Supabase, then made ready with the settings this Mac kept, as Status does.
  async function plugIn(system) {
    const emulator = emulatorOf(system);
    sfx.plug();
    if (!plays(system)) {
      settingUp.add(system);
      render();
      try {
        const installer = R.installerOf(await R.data.files(), emulator);
        if (!installer) throw new Error(`Supabase holds no installer for ${emulator}.`);
        await R.carry.setUp(emulator, installer, R.keptVersion(installer),
          part => say(part === 'install' ? `Installing ${emulator}…` : `Making ${emulator} ready…`, null, 600000));
        const also = Object.keys(R.SYSTEMS).filter(sys => sys !== system && emulatorOf(sys) === emulator && !stand.has(sys) && gamesOf(sys).length);
        sfx.done();
        say(also.length ? `${emulator} is set up. It also plays ${also.map(R.systemName).join(' and ')}.` : `${emulator} is set up.`);
      } catch (error) { console.error(error); say(error.message); }
      settingUp.delete(system);
      await readMac();
    }
    await keep({ ...wishes(), [system]: plays(system) });
  }
  // Unplugging takes its emulator off this Mac once no other plugged-in
  // console here uses it: its saves and settings kept in Supabase first.
  async function unplug(system) {
    const emulator = emulatorOf(system);
    const next = { ...wishes(), [system]: false };
    sfx.unplug();
    await keep(next);
    if (!plays(system) || Object.keys(next).some(sys => next[sys] && emulatorOf(sys) === emulator)) return;
    say(`Keeping ${emulator}'s saves and settings in Supabase…`, null, 600000);
    try { await R.carry.remove(emulator); say(`${emulator} is off this Mac. Your saves stay.`); }
    catch (error) { console.error(error); say(error.message); }
    await readMac();
    render();
  }

  // WHAT LETTING GO HERE WILL DO: the word shown while a game is held, the
  // place that lights, and the move itself, or null where nothing would
  // happen. One answer, so the word never disagrees with the drop. `home`
  // lights the game's own cover in Rux's Collection too.
  const yes = (word, light, run, home = false) => ({ word, light, run, home });
  // A move refused: `says` is the console and its line, said when the game is let go.
  const no = (word, light, says = null, home = false) => ({ word, light, no: true, says, home });
  function intent(g, from, under) {
    if (!under) return null;
    const s = standing(g);
    const unit = under.closest('.emu-unit')
      ?? (under.closest('.emu-tv') && !HANDHELD.has(g.system) ? unitOf(g.system) : null);
    if (unit) {
      const system = unit.dataset.system;
      if (system !== g.system) return no(`Doesn't fit the ${R.systemName(system)}`, unit, [system, wrong(g.system)]);
      if (stand.get(system) === 'setting') return no('Still setting up', unit, [system, 'Hang on, still setting up.']);
      if (stand.get(system) !== 'on') return no('Plug it in first', unit, [system, 'Plug me in first.']);
      if (s.state === 'arriving') return no('Still downloading', unit, [system, 'Not all here yet.']);
      if (s.state === 'held' || drive()) return yes('Play', unit, () => play(g));
      if (keeps) return yes('Download and play', unit, () => download(g, true));
      return no('Plug in the drive to play', unit, [system, 'Plug in the drive to play.']);
    }
    if (under.closest('.emu-favs')) return g.notes?.favourite ? null : yes('Add to Favourites', $('emu-ledge'), () => favourite(g, true));
    if (under.closest('.emu-scene')) {
      return keeps && (s.state === 'away' || s.state === 'failed') ? yes('Download', under.closest('.emu-scene'), () => download(g)) : null;
    }
    if (under.closest('#emu-collection')) {
      if (from === 'ledge') return yes('Take off Favourites', $('emu-collection'), () => favourite(g, false), true);
      if (from === 'shelf') return yes('Take off this Mac', $('emu-collection'), () => takeOff(g), true);
    }
    return null;
  }

  // The same for a console: into the room from the collection, and back to
  // its place once it is unplugged.
  function consoleIntent(system, from, under) {
    if (!under) return null;
    if (from === 'collection' && under.closest('.emu-room')) {
      return yes(plays(system) ? 'Bring in, ready to play' : 'Bring in', $('emu-ghost-cubby') ?? document.querySelector('.emu-scene'), () => bring(system));
    }
    if (from === 'room' && under.closest('#emu-collection')) {
      const st = stand.get(system);
      return st === 'off' ? yes('Put back', $('emu-collection'), () => putBack(system), true)
        : no(st === 'setting' ? 'Still setting up' : 'Unplug it first', $('emu-collection'), [system, st === 'setting' ? 'Hang on, still setting up.' : 'Unplug me first.'], true);
    }
    return null;
  }
  const intentOf = (d, under) => (d.g ? intent(d.g, d.from, under) : consoleIntent(d.system, d.from, under));

  // THE DRAG, with the pointer, where the helper answers. A press that does
  // not move is the cover's or the console's own click.
  let drag = null;
  const word = el('div', 'emu-word');
  word.hidden = true;
  document.body.append(word);
  const FROM = [['#emu-onmac', 'shelf'], ['#emu-ledge', 'ledge'], ['#emu-games', 'collection']];
  const unlight = () => {
    for (const cls of ['emu-lit', 'emu-no', 'emu-cover--home', 'emu-cabinet__console--home']) for (const n of document.querySelectorAll(`.${cls}`)) n.classList.remove(cls);
  };
  function drop() {
    word.hidden = true;
    unlight();
    for (const u of units()) u.classList.remove('emu-unit--fit', 'emu-unit--dim');
  }
  // A cover's picture is not dragged away as a file.
  document.addEventListener('dragstart', e => { if (e.target.closest?.('.emu-cover')) e.preventDefault(); });
  document.addEventListener('pointerdown', e => {
    const src = e.target.closest?.('.emu-cover[data-game], [data-console]');
    if (!src || e.button > 0 || !helper) return;
    const at = { src, x: e.clientX, y: e.clientY, on: false, id: e.pointerId };
    if (src.dataset.console) { drag = { ...at, system: src.dataset.console, from: src.closest('#emu-room') ? 'room' : 'collection' }; return; }
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
      const ghost = el('div', 'emu-ghost');
      const copy = drag.src.cloneNode(true);
      copy.style.inlineSize = `${r.width}px`;
      ghost.append(copy);
      document.body.append(ghost);
      drag.ghost = ghost;
      drag.src.classList.add('emu-held');
      // A game's console lights and the rest dim, so where it goes shows.
      if (drag.g) for (const u of units()) u.classList.add(u.dataset.system === drag.g.system ? 'emu-unit--fit' : 'emu-unit--dim');
      // Coming back from the room, the collection turns to its console and
      // its row to the game, so its own cover is there to light.
      if (drag.g && drag.from !== 'collection') {
        if (pick !== drag.g.system) { pick = drag.g.system; showPick(); }
        const row = $('emu-games');
        const own = row.querySelector(`[data-game="${CSS.escape(keyOf(drag.g))}"]`);
        if (own) row.scrollLeft = own.offsetLeft - row.offsetLeft - (row.clientWidth - own.offsetWidth) / 2;
      }
    }
    drag.ghost.style.transform = `translate(${e.clientX - drag.dx}px, ${e.clientY - drag.dy}px) rotate(-3deg)`;
    const it = intentOf(drag, document.elementFromPoint(e.clientX, e.clientY));
    unlight();
    word.hidden = !it;
    if (!it) return;
    word.textContent = it.word;
    word.classList.toggle('emu-word--no', Boolean(it.no));
    word.style.transform = `translate(${Math.min(e.clientX + 16, innerWidth - word.offsetWidth - 8)}px, ${e.clientY + 20}px)`;
    it.light.classList.add(it.no ? 'emu-no' : 'emu-lit');
    if (it.home && drag.g) $('emu-games').querySelector(`[data-game="${CSS.escape(keyOf(drag.g))}"]`)?.classList.add('emu-cover--home');
    if (it.home && !drag.g) $('emu-cabinet').querySelector(`[data-system="${drag.system}"]`)?.classList.add('emu-cabinet__console--home');
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
    const it = intentOf(d, document.elementFromPoint(e.clientX, e.clientY));
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
    let rows, notes, mac, live;
    try {
      [rows, notes, saves, mac, emulators, live] = await Promise.all([R.data.games(), R.data.notes(), R.data.saves(),
        R.thisMac.read(), R.emulators(), R.helper.onMac ? R.helper.mac() : null, consoles()]);
      macName = live?.mac ?? null;
      room = macName ? await R.data.room(macName) : null;
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
