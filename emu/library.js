/* ==========================================================================
   library.js — the Library, Emu's front page
   --------------------------------------------------------------------------
   Home is the games recently played and the favourites, each a shelf of
   box art, then a tile for each system with games, showing its console,
   app.js's consoleOf, and what stands in its way: an emulator this Mac has
   not installed, or a BIOS Supabase lacks. Above them a line says what this
   Mac holds and can play now, with the next step beside it: the helper to
   start, what is on this Mac, or what is left on Status. A system's tile opens its games as a grid, at #<system>, with all
   of them, the favourites or the recently played; the breadcrumb, Back or B
   returns home. ?game=<system>/<title>, from Search or Problems, opens
   that game's panel over its system. Covers show a game's name without its list's region and language
   tags, which the panel keeps.

   A game opens in the side panel, game-panel.js, with its cover above
   Play, Download to this Mac and what the scan read; this-mac.js is that
   part. A controller, gamepad.js, or the arrow keys move to the nearest
   tile or cover in that direction; A opens and plays, B closes the panel or
   goes back to home, as each controller labels them.
   ========================================================================== */
(() => {
  'use strict';

  const R = window.Emu;
  const $ = id => document.getElementById(id);
  const { el, nameOf, cover } = R;
  if (!R?.data) { R?.notice('Emu needs a log-in to read the collection.'); return; }

  const RECENT = 12;
  let games = [];
  let saves = [];
  let helper = null;
  // How a game stands on this Mac, from the helper's library and downloads.
  let stands = () => ({ state: 'away' });
  let emulators = null;
  let bios = [];
  // A system's games: all of them, its favourites or its recently played.
  let showing = 'all';

  const keyOf = g => `${g.system}/${g.title}`;
  const playedAt = g => g.notes?.played_at ?? null;
  const byPlayed = (a, b) => new Date(playedAt(b)) - new Date(playedAt(a));
  const countOf = n => `${n} ${n === 1 ? 'game' : 'games'}`;
  // What the helper says of this Mac, read again.
  async function readMac() {
    const mac = await R.thisMac.read();
    helper = mac.helper;
    stands = R.helper.standings(mac.library, mac.downloads);
  }
  // A drive with the games plugged into this Mac; a helper that names no
  // library plays from whatever collection it found.
  const drive = () => Boolean(helper?.collection) && !(helper.library && helper.collection.network);
  // Whether this Mac has a system's emulator, or null where no helper that can say answers.
  const ready = system => (helper && (helper.collection || helper.library) ? helper.systems.includes(system) : null);
  // Each file a system's emulator needs that Supabase lacks.
  const lacks = system => R.needsOf(system, emulators.systems[system], bios).filter(n => !n.ok && !n.optional);
  // What stands in a system's way, as tags.
  const standing = system => [
    ...(lacks(system).length ? [['Missing BIOS', 'rux--tag--red']] : []),
    ...(ready(system) === false ? [['Not installed', 'rux--tag--gray']] : []),
  ];
  // The system #<system> names, or null for home.
  const route = () => { const s = decodeURIComponent(location.hash.slice(1)); return R.SYSTEMS[s] ? s : null; };

  // A cover as the button that opens its game.
  function coverItem(g) {
    const li = el('li');
    const b = el('button', 'emu-cover');
    b.type = 'button';
    b.dataset.game = keyOf(g);
    b.dataset.system = g.system;
    b.title = g.title;
    b.append(cover(g, 'emu-cover-art'), el('span', 'emu-cover-name', nameOf(g)));
    b.addEventListener('click', () => openGame(g));
    li.append(b);
    return li;
  }

  // A heading over a shelf of covers that scrolls sideways.
  function shelf(id, title, list) {
    const section = el('section', 'rux--stack-vertical rux--stack-scale-3');
    section.setAttribute('aria-labelledby', id);
    const h2 = el('h2', 'rux--type-heading-03', title);
    h2.id = id;
    const ul = el('ul', 'emu-shelf');
    ul.setAttribute('role', 'list');
    ul.append(...list.map(coverItem));
    section.append(h2, ul);
    return section;
  }

  // A system's tile: its console over its name and count.
  function systemTile(system, list) {
    const li = el('li');
    const a = el('a', 'rux--tile rux--tile--clickable');
    a.href = `#${system}`;
    a.dataset.system = system;
    const box = el('div', 'emu-system');
    const picture = el('div', 'emu-system__art');
    const img = el('img');
    img.alt = '';
    img.src = R.consoleOf(system).url;
    img.addEventListener('error', () => img.remove());
    picture.append(img);
    box.append(picture, el('p', 'rux--type-heading-02', R.systemName(system)), el('p', 'emu-system__count', countOf(list.length)));
    const tags = standing(system);
    if (tags.length) { const row = el('div', 'emu-tags'); row.append(...tags.map(t => R.tag(t, true))); box.append(row); }
    a.append(box);
    li.append(a);
    return li;
  }

  function drawHome() {
    const out = $('emu-home-list');
    out.replaceChildren();
    const recent = games.filter(playedAt).sort(byPlayed).slice(0, RECENT);
    if (recent.length) out.append(shelf('emu-recent', 'Recently played', recent));
    const favourites = games.filter(g => g.notes?.favourite);
    if (favourites.length) out.append(shelf('emu-favourites', 'Favourites', favourites));
    const section = el('section', 'rux--stack-vertical rux--stack-scale-3');
    // The systems are headed only under a shelf: alone, they are the Library.
    if (recent.length || favourites.length) {
      const h2 = el('h2', 'rux--type-heading-03', 'Systems');
      h2.id = 'emu-systems-title';
      section.setAttribute('aria-labelledby', h2.id);
      section.append(h2);
    } else section.setAttribute('aria-label', 'Systems');
    const ul = el('ul', 'emu-systems');
    ul.setAttribute('role', 'list');
    for (const system of Object.keys(R.SYSTEMS)) {
      const here = games.filter(g => g.system === system);
      if (here.length) ul.append(systemTile(system, here));
    }
    // libretro's console pictures ask for their credit wherever they show.
    const credit = el('p', 'emu-system__count');
    credit.append('Console pictures from ', link('libretro\u2019s RetroArch assets', 'https://github.com/libretro/retroarch-assets'),
      ', ', link('CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0/'), '.');
    section.append(ul);
    if (Object.keys(R.SYSTEMS).some(s => !R.consoleOf(s).own)) section.append(credit);
    out.append(section);
  }
  const link = (text, href) => { const a = el('a', 'rux--link', text); a.href = href; a.target = '_blank'; a.rel = 'noopener'; return a; };

  // The line above the page and the step beside it: what is here, what this
  // Mac can play now, and what would let it play the rest.
  function say(text, ...steps) {
    $('emu-sum').textContent = text;
    $('emu-now').replaceChildren(...steps);
    $('emu-now').hidden = !steps.length;
  }
  const step = (text, href) => { const a = el('a', 'rux--btn rux--btn--tertiary rux--btn--sm rux--layout--size-sm', text); a.href = href; return a; };
  function sayHome() {
    const count = countOf(games.length);
    if (!R.helper.onMac) return say(count);
    if (!helper) {
      const start = el('button', 'rux--btn rux--btn--tertiary rux--btn--sm rux--layout--size-sm', 'Start Rux Emu Helper');
      start.type = 'button';
      start.addEventListener('click', async () => {
        start.disabled = true;
        $('emu-sum').textContent = `${count}. Starting Rux Emu Helper…`;
        if (await R.helper.wake()) { await readMac(); render(); }
        else { $('emu-sum').textContent = `${count}. It did not start. Install it from the drive: Install Rux Emu Helper.command.`; start.disabled = false; }
      });
      return say(`${count}. Rux Emu Helper is not running on this Mac, so nothing plays yet.`, start);
    }
    // Without a drive, this Mac plays what it holds.
    if (!drive()) {
      if (!helper.library) return say(`${count}. Plug in the drive to play.`);
      const held = games.filter(g => stands(g).state === 'held').length;
      if (!held) return say(`${count}. None is on this Mac yet: download one from its panel.`);
      return say(`${count}, ${held} on this Mac.`, step('On this Mac', 'collection.html#on-this-mac'));
    }
    const systems = Object.keys(R.SYSTEMS).filter(s => games.some(g => g.system === s));
    const n = systems.filter(ready).length;
    if (n === systems.length) return say(`${count}, and every console is ready on this Mac.`);
    return say(`${count}. ${n} of ${systems.length} consoles ${n === 1 ? 'is' : 'are'} ready on this Mac.`, step('See what is left', 'status.html'));
  }
  // A system's line: its games, and what stands in its way with its emulator's profile to open.
  function saySystem(system, n) {
    const emulator = emulators.systems[system]?.emulator;
    const missing = lacks(system).map(x => x.label);
    const why = [
      missing.length ? `Supabase lacks ${missing.join(', ')}.` : '',
      ready(system) === false ? `${emulator} is not installed on this Mac.` : '',
    ].filter(Boolean);
    if (!why.length) return say(countOf(n));
    say(`${countOf(n)}. ${why.join(' ')}`, step(`${emulator}\u2019s profile`, `emulators.html#${R.slug(emulator)}`));
  }

  function render() {
    const system = route();
    const name = system && R.systemName(system);
    $('emu-crumbs').hidden = !system;
    $('emu-crumb').textContent = name ?? '';
    $('emu-crumb').href = system ? `#${system}` : '#';
    $('emu-title').textContent = name ?? 'Library';
    document.title = system ? `${name} — Emu` : 'Emu';
    $('emu-show-wrap').hidden = !system;
    const home = !system;
    $('emu-home').hidden = !home;
    $('emu-grid').hidden = home;
    if (home) {
      drawHome();
      sayHome();
      $('emu-none').hidden = true;
      return;
    }
    let list = games.filter(g => g.system === system);
    if (showing === 'favourites') list = list.filter(g => g.notes?.favourite);
    if (showing === 'recent') list = list.filter(playedAt).sort(byPlayed);
    $('emu-grid').dataset.system = system;
    $('emu-grid').replaceChildren(...list.map(coverItem));
    saySystem(system, list.length);
    $('emu-none').hidden = list.length > 0;
    $('emu-none').querySelector('p').textContent = showing === 'favourites' ? 'No favourites yet. Mark one in its panel.'
      : showing === 'recent' ? 'Nothing played here yet.' : 'No games here.';
  }

  // The switcher back on All games, as a system opens; content-switcher.js
  // moves it on a click or an arrow and says so with its event.
  function showAll() {
    showing = 'all';
    for (const b of $('emu-show').querySelectorAll('.rux--content-switcher-btn')) {
      const on = b.dataset.show === 'all';
      b.classList.toggle('rux--content-switcher--selected', on);
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    }
  }

  // The cover a game was opened from, to come back to when its panel closes.
  let opener = null;
  const openGame = g => {
    opener = keyOf(g);
    // Play, Download or Start takes the focus where there is one; else the panel's close keeps it.
    R.gamePanel.open(g, { saves, onSaved: render, top: [cover(g, 'emu-panel-art')], mac: { focus: true, onChanged: readMac } });
  };
  const panelOpen = () => !$('emu-panel').hidden;
  function closeGame() {
    R.gamePanel.close();
    // What the game changed, such as being played or made a favourite, shows once it closes.
    render();
    const back = opener && document.querySelector(`.emu-cover[data-game="${CSS.escape(opener)}"]`);
    if (back) show(back);
  }

  // MOVING WITH A CONTROLLER OR THE ARROW KEYS, to the nearest tile or cover
  // in that direction. Scrolling into view is instant: Carbon's motion has no
  // answer for following a focus. A cover is brought fully inside its shelf,
  // and anything inside the window below the header, with room for the
  // focus ring; the panel moves through its own controls.
  const NAV = '.emu-cover, .emu-systems .rux--tile';
  function show(node) {
    node.focus({ focusVisible: true, preventScroll: true });
    const room = 8;
    const n = node.getBoundingClientRect();
    const row = node.closest('.emu-shelf');
    if (row) {
      const s = row.getBoundingClientRect();
      if (n.right > s.right - room) row.scrollLeft += n.right - s.right + room;
      else if (n.left < s.left + room) row.scrollLeft -= s.left - n.left + room;
    }
    const top = (document.querySelector('.rux--header')?.getBoundingClientRect().bottom ?? 0) + room;
    if (n.top < top) window.scrollBy(0, n.top - top);
    else if (n.bottom > innerHeight - room) window.scrollBy(0, n.bottom - innerHeight + room);
  }
  function move(way) {
    const here = document.activeElement;
    if (panelOpen()) {
      const items = [...$('emu-panel').querySelectorAll('button, input, textarea, a[href]')].filter(n => !n.disabled && n.offsetParent);
      const i = items.indexOf(here);
      const next = items[Math.min(items.length - 1, Math.max(0, i + (way === 'up' || way === 'left' ? -1 : 1)))];
      if (next) show(next);
      return;
    }
    const items = [...document.querySelectorAll(NAV)].filter(n => n.offsetParent);
    if (!items.includes(here)) { if (items[0]) show(items[0]); return; }
    const r = here.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const across = way === 'left' || way === 'right';
    let best = null, score = Infinity;
    for (const n of items) {
      if (n === here) continue;
      const b = n.getBoundingClientRect();
      const dx = b.left + b.width / 2 - cx, dy = b.top + b.height / 2 - cy;
      const ahead = { up: -dy, down: dy, left: -dx, right: dx }[way];
      // Sideways stays in the row it is in; up and down go to the nearest row.
      if (ahead <= 1 || (across && Math.abs(dy) > r.height / 2)) continue;
      const s = ahead + 2 * (across ? Math.abs(dy) : Math.abs(dx));
      if (s < score) { score = s; best = n; }
    }
    if (best) show(best);
  }
  // B: the panel closes, else a system goes back to home and its tile.
  let backTo = null;
  function back() {
    if (panelOpen()) { closeGame(); return; }
    const system = route();
    if (!system) return;
    backTo = system;
    location.hash = '';
  }
  // A system opened with A or Enter starts on its first cover.
  let enter = false;
  R.onPad(m => {
    if (m === 'a') {
      const here = document.activeElement;
      if (here && here !== document.body) { enter = here.matches?.('.emu-systems .rux--tile'); here.click(); } else move('down');
    } else if (m === 'b') back();
    else move(m);
  });
  document.addEventListener('keydown', e => {
    const way = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[e.key];
    const here = document.activeElement;
    if (way && here?.matches?.(NAV)) { e.preventDefault(); move(way); }
    else if (e.key === 'Enter' && here?.matches?.('.emu-systems .rux--tile')) enter = true;
  });
  // The panel's own close and Escape, heard first, so the page redraws and returns to the cover.
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && panelOpen()) { e.stopImmediatePropagation(); closeGame(); } }, true);
  $('emu-panel-close').addEventListener('click', e => { e.stopImmediatePropagation(); closeGame(); }, true);

  window.addEventListener('hashchange', () => {
    showAll();
    if (panelOpen()) R.gamePanel.close();
    render();
    window.scrollTo(0, 0);
    if (enter) { const first = $('emu-grid').querySelector('.emu-cover'); if (first) show(first); }
    else if (backTo) { const tile = document.querySelector(`.emu-systems [data-system="${backTo}"]`); if (tile) show(tile); }
    enter = false;
    backTo = null;
  });
  $('emu-show').addEventListener('rux:content-switcher-selected', e => { showing = e.detail.option.dataset.show; render(); });

  async function load() {
    let rows, notes;
    try {
      [rows, notes, saves, , emulators, bios] = await Promise.all([R.data.games(), R.data.notes(), R.data.saves(),
        readMac(), R.emulators(), R.data.bios()]);
    } catch (error) {
      console.error(error);
      R.notice('Emu could not read the collection. Try again.');
      return;
    }
    games = R.withNotes(rows, notes).map(g => ({ ...g, status: R.statusOf(g) }))
      .sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
    $('emu-empty').hidden = games.length > 0;
    $('emu-library').hidden = games.length === 0;
    render();
    // The game ?game= names, opened once and taken off the address.
    const url = new URL(location.href);
    const key = url.searchParams.get('game');
    if (key) {
      url.searchParams.delete('game');
      history.replaceState(null, '', url);
      const g = games.find(x => keyOf(x) === key);
      if (g) openGame(g);
    }
  }

  // The helper may be started or quit, the drive plugged in, an emulator
  // installed or a download ended, while the page is away: the page is drawn
  // again when what the helper says has changed, unless a game is open.
  const told = () => JSON.stringify([helper, games.filter(g => stands(g).state === 'held').length]);
  window.addEventListener('focus', async () => {
    const before = told();
    await readMac();
    if (emulators && told() !== before && !panelOpen()) render();
  });
  load();
})();
