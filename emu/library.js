/* ==========================================================================
   library.js — the Library, Emu's front page
   --------------------------------------------------------------------------
   Home is the games recently played and the favourites, each a shelf of
   box art, then a tile for each system with games, showing its console,
   app.js's consoleOf, and what stands in its way: an emulator this Mac has
   not installed, or a BIOS Supabase lacks. Above them a line says what this
   Mac can play now, with the next step beside it: the helper to start, the
   drive to plug in, or what is left on Status. A system's tile opens its games as a grid, at #<system>, with all
   of them, the favourites or the recently played; the breadcrumb, Back or B
   returns home. ?game=<system>/<title>, from Search or Problems, opens
   that game's panel over its system. Covers show a game's name without its list's region and language
   tags, which the panel keeps.

   A game opens in the side panel, game-panel.js, with its cover and Play
   above what the scan read. Play asks Rux Emu Helper on this Mac, helper.js,
   and shows only on a Mac; when the helper is not running there, the panel
   offers to start it. A game played is marked with when, for Recently
   played. A controller, gamepad.js, or the arrow keys move to the nearest
   tile or cover in that direction; A opens and plays, B closes the panel or
   goes back to home, as each controller labels them.
   ========================================================================== */
(() => {
  'use strict';

  const R = window.Emu;
  const $ = id => document.getElementById(id);
  const { el } = R;
  if (!R?.data) { R?.notice('Emu needs a log-in to read the collection.'); return; }

  const RECENT = 12;
  let games = [];
  let saves = [];
  let helper = null;
  let emulators = null;
  let bios = [];
  // A system's games: all of them, its favourites or its recently played.
  let showing = 'all';

  const keyOf = g => `${g.system}/${g.title}`;
  // A game's name without the bracketed tags its list adds: region, languages, revision.
  const nameOf = g => g.title.replace(/\s*[([][^)\]]*[)\]]/g, '').trim() || g.title;
  const playedAt = g => g.notes?.played_at ?? null;
  const byPlayed = (a, b) => new Date(playedAt(b)) - new Date(playedAt(a));
  const countOf = n => `${n} ${n === 1 ? 'game' : 'games'}`;
  // Whether this Mac can play a system now, or null where no helper with the drive answers.
  const ready = system => (helper?.collection ? helper.systems.includes(system) : null);
  // Each file a system's emulator needs that Supabase lacks.
  const lacks = system => R.needsOf(system, emulators.systems[system], bios).filter(n => !n.ok && !n.optional);
  // What stands in a system's way, as tags.
  const standing = system => [
    ...(lacks(system).length ? [['Missing BIOS', 'rux--tag--red']] : []),
    ...(ready(system) === false ? [['Not installed', 'rux--tag--gray']] : []),
  ];
  // The system #<system> names, or null for home.
  const route = () => { const s = decodeURIComponent(location.hash.slice(1)); return R.SYSTEMS[s] ? s : null; };

  // A game's art: the first of its pictures that loads, else `none()`.
  function art(g, none) {
    const urls = R.artOf(g);
    if (!urls.length) { none(); return null; }
    const img = el('img');
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    let i = 0;
    img.addEventListener('error', () => { i += 1; if (i < urls.length) img.src = urls[i]; else { img.remove(); none(); } });
    img.src = urls[0];
    return img;
  }

  // A cover: the game's art, else its name on the tile.
  function cover(g, cls) {
    const box = el('div', cls);
    const name = () => box.replaceChildren(el('span', 'emu-cover-title', nameOf(g)));
    const img = art(g, name);
    if (img) box.append(img);
    return box;
  }

  // A cover as the button that opens its game.
  function coverItem(g) {
    const li = el('li');
    const b = el('button', 'emu-cover');
    b.type = 'button';
    b.dataset.game = keyOf(g);
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

  // Starts the helper, and waits up to ten seconds for it to answer.
  async function startHelper() {
    R.helper.start();
    for (let i = 0; i < 10 && !helper; i += 1) { await new Promise(r => setTimeout(r, 1000)); helper = await R.helper.status(); }
    return Boolean(helper);
  }

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
        if (await startHelper()) render();
        else { $('emu-sum').textContent = `${count}. It did not start. Install it from the drive: Install Rux Emu Helper.command.`; start.disabled = false; }
      });
      return say(`${count}. Rux Emu Helper is not running on this Mac, so nothing plays yet.`, start);
    }
    if (!helper.collection) return say(`${count}. Plug in the drive to play.`);
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

  // What Play can do here: play, or say why not and what to do.
  function playArea(g) {
    const area = el('div', 'rux--stack-vertical rux--stack-scale-3');
    const said = el('p', 'rux--type-body-01');
    said.setAttribute('role', 'status');
    const button = (text, onClick, cls = 'rux--btn rux--btn--primary') => {
      const b = el('button', cls, text);
      b.type = 'button';
      b.addEventListener('click', onClick);
      return b;
    };
    if (!R.helper.onMac) return area;
    if (!helper) {
      said.textContent = 'Rux Emu Helper is not running on this Mac.';
      area.append(said, button('Start Rux Emu Helper', async () => {
        said.textContent = 'Starting…';
        if (await startHelper()) openGame(g); else said.textContent = 'It did not start. Install it from the drive: Install Rux Emu Helper.command.';
      }, 'rux--btn rux--btn--secondary'));
    } else if (!helper.collection) {
      said.textContent = 'Plug in the drive to play.';
      area.append(said);
    } else if (!helper.systems.includes(g.system)) {
      said.textContent = `This Mac has no emulator installed for ${R.systemName(g.system)}.`;
      area.append(said);
    } else {
      const play = button('Play', async () => {
        play.disabled = true;
        said.textContent = 'Starting…';
        try {
          await R.helper.play(g);
          said.textContent = 'Playing.';
          try { g.notes = { ...g.notes, system: g.system, title: g.title, played_at: await R.data.markPlayed(g) }; }
          catch (error) { console.error(error); said.textContent = 'Playing, but it could not be marked as played.'; }
        } catch (error) { said.textContent = error.message; }
        play.disabled = false;
      });
      area.append(play, said);
    }
    return area;
  }

  // The cover a game was opened from, to come back to when its panel closes.
  let opener = null;
  const openGame = g => {
    opener = keyOf(g);
    const play = playArea(g);
    R.gamePanel.open(g, { saves, onSaved: render, top: [cover(g, 'emu-panel-art'), play] });
    // Play, or Start, takes the focus where there is one; else the panel's close keeps it.
    play.querySelector('.rux--btn')?.focus({ focusVisible: true });
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
      [rows, notes, saves, helper, emulators, bios] = await Promise.all([R.data.games(), R.data.notes(), R.data.saves(),
        R.helper.status(), R.emulators(), R.data.bios()]);
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

  // The helper may be started or quit, the drive plugged in or an emulator
  // installed, while the page is away: the page is drawn again when what the
  // helper says has changed, unless a game is open.
  window.addEventListener('focus', async () => {
    const before = JSON.stringify(helper);
    helper = await R.helper.status();
    if (emulators && JSON.stringify(helper) !== before && !panelOpen()) render();
  });
  load();
})();
