/* ==========================================================================
   room.js — the Library as a room, Emu's front page
   --------------------------------------------------------------------------
   Where Rux Emu Helper answers the page is a wall of three: Rux's Server,
   Your Mac and Storage. A side panel's heading closes it away and the
   button of its name beside Your Mac opens it again, as it was last left in
   this browser; Rux's Server starts open
   and Storage closed. Without the helper Rux's Server is the whole page.

   Your Mac is a room seen from above and in front. On its back wall the TV
   stands on a stand of cubbies, one per home console and a ghost cubby to
   bring the next to, never fewer than three, in two tiers past five, and
   two small shelves hold the favourites face out, one this Mac lacks
   dimmed. On the floor the handhelds stand on a table on the rug, and this
   Mac's games lie where they were left, one still arriving under a veil
   that lifts as it comes; a game is dragged across the floor to move it,
   and one never placed takes the first free place beside the rug.
   Which consoles stand there, which of them are plugged in, and where each
   game lies, is this Mac's room, kept on its row in Supabase; until
   something is moved, the console of each game this Mac holds stands
   there. A console is plugged in only
   where this Mac has its emulator too. Its plug is a button: plugging in
   sets its emulator up on this Mac, and unplugging takes the emulator off,
   its saves and settings kept, once no other plugged-in console uses it. A line says the helper runs and where the games come from,
   and opens Status; beside it is how much room is free.

   Rux's Server is every console with games, each its drawing from
   brand/consoles/ over its name and count; one in
   the room is outlined and faint, the place it goes back to, and one whose
   emulator this Mac has shows a green light. Pressing a console, there or in
   the room, picks it: its name, count and how it stands show beneath, with
   Bring to Your Mac or Put back, over its games as covers, A to
   Z, one this Mac holds dimmed with a tick. A game opens in the side panel,
   game-panel.js. ?game=<system>/<title>, from Search or Problems, picks
   that game's console and opens its panel.

   Storage is the picked console's saves as cards: each game's, the one in
   it and those out, with Take out, Put in and a name to change, then the
   console's own.

   A game or a console is dragged with the pointer, where the helper
   answers: a console onto Your Mac comes in, and an unplugged one dragged
   back onto Rux's Server goes back. A word
   follows it and says what letting go will do, and the place it would land
   lights: onto Your Mac downloads it, to lie where it was let go on the
   floor, onto its console or the TV plays it,
   downloading it first if it must, onto the Favourites shelf marks it, and
   back onto Rux's Server takes it off this Mac or off Favourites. A
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
  // Where a game lies on the floor, by its key, each a share of the floor
  // across and down from 0 to 1: kept in the room beside its consoles, under
  // `floor`, which names no console.
  const spots = () => room?.floor ?? {};
  // The places a game never placed takes, in order: beside the rug, left and
  // right in turn, near the front and then the back, then along the front.
  const SLOTS = [0.95, 0.05].flatMap(y => [0.01, 0.99, 0.13, 0.87].map(x => [x, y]))
    .concat([0.3, 0.7, 0.4, 0.6, 0.5].map(x => [x, 1]), [0.3, 0.7, 0.4, 0.6, 0.5].map(x => [x, 0]));
  // Where each of these games lies: its kept spot, else the first place no
  // other game is near, else one from its name, so it is the same each time.
  function spotsOf(list) {
    const kept = spots();
    const out = new Map(list.filter(g => kept[keyOf(g)]).map(g => [keyOf(g), kept[keyOf(g)]]));
    const near = ([x, y]) => [...out.values()].some(([a, b]) => Math.abs(a - x) < 0.1 && Math.abs(b - y) < 0.5);
    for (const g of list) {
      const key = keyOf(g);
      if (out.has(key)) continue;
      const n = [...key].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 997, 7);
      out.set(key, SLOTS.find(slot => !near(slot)) ?? [(n % 97) / 96, (n % 13) / 12]);
    }
    return out;
  }
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
  // The consoles standing in the room, in its cubbies or its dock.
  const units = () => $('emu-room').querySelectorAll('.emu-unit');
  const unitOf = system => $('emu-room').querySelector(`.emu-unit[data-system="${system}"]`);

  // A game's cover as the button that opens it. `small` is one in the room,
  // its name a tag that shows as it grows under the pointer.
  function coverItem(g, small) {
    const li = el('li');
    const b = el('button', 'emu-cover');
    b.type = 'button';
    b.dataset.game = keyOf(g);
    b.dataset.system = g.system;
    b.title = g.title;
    b.append(cover(g, 'emu-cover-art'));
    if (small) { b.setAttribute('aria-label', `${nameOf(g)}, ${R.systemName(g.system)}`); b.append(el('span', 'emu-cover-tag', nameOf(g))); }
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
    body.append(consoleOf(system, hand));
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
    li.title = 'Drag a console here from Rux\'s Server';
    if (empty) li.append(el('span', null, 'Drag a console here'));
    return li;
  }

  // The art pixel and the stand's rows for this many cubbies: the largest
  // whole pixel, four CSS pixels down to two, at which the stand's rows fit
  // and the TV fit the room's width and, where the room has a height of its
  // own, the wall and floor fit that. In art pixels a cubby is 38 wide and 44 tall with its
  // gap, the floor 76 deep, and the TV 72 tall over one row and 54 over more.
  // The stand takes up to three rows, each as full as the next.
  const tall = matchMedia('(min-width: 66rem)');
  function fit(count) {
    const scene = document.querySelector('.emu-scene').getBoundingClientRect();
    const rows = px => { const tiers = Math.ceil(count / Math.max(1, Math.floor((scene.width - 16 * px) / (40 * px)))); return { px, per: Math.ceil(count / tiers), tiers }; };
    // Where the TV is too wide to stand between the Favourites shelves and
    // their mirror, the wall is taller by two shelves, 58 wide and 40 tall.
    const fits = ({ px, tiers }) => {
      const tv = tiers > 1 ? [80, 54] : [112, 72];
      const under = (tv[0] + 2 * 64) * px > scene.width ? 40 : 0;
      return tiers <= 3 && (tv[0] + 12) * px <= scene.width
        && (!tall.matches || (76 + 4 + under + tv[1] + 5 + tiers * 44 + 8) * px <= scene.height);
    };
    const can = [4, 3, 2].map(rows).filter(fits);
    // A room with no height of its own grows down the page, so there the
    // fewest rows win, and the largest pixel among those.
    return (tall.matches ? can : can.sort((a, b) => a.tiers - b.tiers))[0] ?? rows(2);
  }
  function renderRoom() {
    $('emu-room').hidden = !helper;
    $('emu-wall').classList.toggle('emu-wall--mac', Boolean(helper));
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
    const { px, per, tiers } = fit(cells.length);
    const scene = document.querySelector('.emu-scene');
    scene.style.setProperty('--emu-px', `${px}px`);
    $('emu-stand').style.setProperty('--emu-per', per);
    $('emu-stand').replaceChildren(...cells);
    $('emu-dock').replaceChildren(...hands.map(([system, state]) => unit(system, state)));
    scene.classList.toggle('emu-scene--crowded', tiers > 1);
    showSound();
    // Each game where it lies, the ones nearer the front drawn over those behind.
    const lies = spotsOf(mine.map(([g]) => g));
    $('emu-onmac').replaceChildren(...[...mine].sort((a, b) => lies.get(keyOf(a[0]))[1] - lies.get(keyOf(b[0]))[1]).map(([g, s]) => {
      const li = coverItem(g, true);
      const [x, y] = lies.get(keyOf(g));
      li.style.setProperty('--emu-x', x);
      li.style.setProperty('--emu-y', y);
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

  // RUX'S SERVER -------------------------------------------------------------
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
    $('emu-server-body').scrollTop = 0;
    renderStorage();
  }

  function renderServer() {
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
  // STORAGE ------------------------------------------------------------------
  // A card, 8 by 10 art pixels: its body with a corner cut, a label and contacts.
  function cardOf() {
    const svg = svgOf('emu-card', '0 0 8 10');
    svg.innerHTML = '<path class="emu-card__body" d="M0 0H7V1H8V10H0Z"/><rect class="emu-card__label" x="1" y="1" width="5" height="4"/>'
      + '<rect class="emu-card__pin" x="1" y="7" width="1" height="2"/><rect class="emu-card__pin" x="3" y="7" width="1" height="2"/><rect class="emu-card__pin" x="5" y="7" width="1" height="2"/>';
    return svg;
  }
  // The picked console's saves as cards. A game's cards come from what Emu
  // carries: the one in its game, called what its console calls a save with
  // its save states riding along, then those out, each named. Take out pulls
  // the one in, so the next Play starts a new save; Put in swaps one back;
  // a card's name is a button that renames it. Then the console's own, which
  // name no game, each opening in Saves. What is read is kept half a minute,
  // so a room drawn again each second asks nothing.
  let stored = { system: null, at: 0, cards: null };
  let storing = 0;
  async function renderStorage(fresh = false) {
    $('emu-storage').hidden = !helper || !pick;
    if (!helper || !pick) return;
    const system = pick;
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
      try { await run(); sfx.done(); say(done); } catch (error) { console.error(error); sfx.no(); say(error.message); }
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

  // THE SIDE PANELS. A panel's heading closes it away, and the button of its
  // name beside Your Mac opens it again, as it was last left in this
  // browser. The press moves to the other of the two, so a keyboard keeps
  // its place.
  for (const [id, toggle, opener, key, open] of [['emu-collection', 'emu-server-toggle', 'emu-server-open', 'emu-server-panel', true], ['emu-storage', 'emu-storage-toggle', 'emu-storage-open', 'emu-storage-panel', false]]) {
    let shown = open;
    try { shown = (localStorage.getItem(key) ?? (open ? 'open' : 'closed')) === 'open'; } catch { /* a browser that keeps nothing starts as the page does */ }
    const show = () => {
      $(id).classList.toggle('emu-side--closed', !shown);
      $(toggle).setAttribute('aria-expanded', String(shown));
      $(opener).hidden = shown;
    };
    const turn = () => {
      shown = !shown;
      try { localStorage.setItem(key, shown ? 'open' : 'closed'); } catch { /* it lasts until the page closes */ }
      show();
      $(shown ? toggle : opener).focus();
    };
    $(toggle).addEventListener('click', turn);
    $(opener).addEventListener('click', turn);
    show();
  }

  // A console pressed, in the room or the collection, is the one whose games show.
  function choose(system) {
    if (!gamesOf(system).length) return;
    pick = system;
    showPick();
  }
  const render = () => { renderRoom(); renderServer(); };
  // The room is drawn again when its box changes, since its art pixel
  // follows its size; never under a held game or an open panel.
  let sized = '';
  new ResizeObserver(([entry]) => {
    const now = `${Math.round(entry.contentRect.width)}x${tall.matches ? Math.round(entry.contentRect.height) : 0}`;
    if (now === sized) return;
    sized = now;
    if (helper && !drag?.on && $('emu-panel')?.hidden) renderRoom();
  }).observe(document.querySelector('.emu-scene'));

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
  const SLOT = { nes: 0.67, snes: 0.25, n64: 0.25, gc: 0.21, wii: 0.5, wiiu: 0.83, switch: 0.04, gb: 0.02, gbc: 0.02, gba: 0.33, nds: 0.5, n3ds: 0.5, psx: 0.33, ps2: 0.75, xbox: 0.71 };
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
  // A game laid on the floor at a spot, the spots of games this Mac no longer
  // holds dropped.
  function place(g, spot) {
    const here = new Set(mineNow().map(([x]) => keyOf(x)).concat(keyOf(g)));
    const floor = Object.fromEntries(Object.entries({ ...spots(), [keyOf(g)]: spot }).filter(([key]) => here.has(key)));
    return keep({ ...wishes(), floor });
  }
  // Where a game let go at a point lies: its cover's middle under the
  // pointer, as shares of the floor, kept inside it.
  function spotAt(point) {
    const f = $('emu-onmac').getBoundingClientRect();
    const h = 14 * parseFloat(getComputedStyle(document.querySelector('.emu-scene')).getPropertyValue('--emu-px'));
    const w = h * 0.75;
    const share = (at, from, size, own) => Math.round(Math.min(1, Math.max(0, (at - from - own / 2) / Math.max(1, size - own))) * 1000) / 1000;
    return [share(point.x, f.left, f.width, w), share(point.y, f.top, f.height, h)];
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
  // lights the game's own cover in Rux's Server too.
  const yes = (word, light, run, home = false) => ({ word, light, run, home });
  // A move refused: `says` is the console and its line, said when the game is let go.
  const no = (word, light, says = null, home = false) => ({ word, light, no: true, says, home });
  function intent(g, from, under, point) {
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
    // On the floor a game this Mac has moves to where it is let go, and one
    // downloaded there lies there.
    const floor = under.closest('.emu-floor');
    if (floor && from === 'shelf') return yes('Move', floor, () => { sfx.drop(); place(g, spotAt(point)); });
    if (under.closest('.emu-scene')) {
      if (!keeps || (s.state !== 'away' && s.state !== 'failed')) return null;
      return yes('Download', under.closest('.emu-scene'), async () => { if (floor) await place(g, spotAt(point)); download(g); });
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
  const intentOf = (d, under, point) => (d.g ? intent(d.g, d.from, under, point) : consoleIntent(d.system, d.from, under));

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
    const it = intentOf(drag, document.elementFromPoint(e.clientX, e.clientY), { x: e.clientX, y: e.clientY });
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
        R.thisMac.read(), R.emulators(), R.helper.onMac ? R.helper.mac() : null]);
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
  load();
})();
