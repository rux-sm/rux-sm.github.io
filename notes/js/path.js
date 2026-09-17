/* ==========================================================================
   Notes — THE PATH
   --------------------------------------------------------------------------
   Behaviour for the path home. Each tile is a <details>, so it opens in place
   and the page is whole without this file. This adds four things:

   - A link to a tile (#tile-<id>) opens that tile and brings it into view,
     on arrival and on every Next.
   - An answer to a question greys the tiles only the other answers reach;
     build.mjs writes their ids on the answer, so nothing here reads the graph.
   - The notepad follows the open tile, one note per tile, kept in this
     browser under one key.
   - Escape closes the open tile and returns focus to it.
   - The Path | Other tasks switch shows one list at a time. Without this
     file both lists show, one after the other.
   - The search box keeps only the tiles whose words match, in both lists.
     A tile's steps and quests are in the page even while it is closed, so
     they are searched too.
   ========================================================================== */
(() => {
  'use strict';
  const tiles = [...document.querySelectorAll('[data-notes-path-tile]')];
  if (!tiles.length) return;
  const KEY = 'notes-path:notes';
  const note = document.querySelector('[data-notes-path-note]');
  const forLine = document.querySelector('[data-notes-path-for]');

  let notes = {};
  try { notes = JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {}; } catch { notes = {}; }
  const keep = () => { try { localStorage.setItem(KEY, JSON.stringify(notes)); } catch { /* not kept */ } };

  const openTile = () => tiles.find(t => t.open);
  const nameOf = t => [...(t.querySelector('.notes-path-head')?.children ?? [])].map(e => e.textContent.trim()).join(' · ');

  // The owner's notepad is kept in the account by js/tile-owner.js, which
  // marks the box and listens for which tile is open.
  const local = () => note && !note.dataset.notesAccount;
  function follow() {
    const t = openTile();
    document.dispatchEvent(new CustomEvent('notes-path:open', { detail: { tile: t?.dataset.notesPathTile ?? null, name: t ? nameOf(t) : '' } }));
    if (!note) return;
    note.disabled = !t;
    if (local()) note.value = t ? notes[t.dataset.notesPathTile] ?? '' : '';
    note.placeholder = t ? 'What you found, what to check next' : '';
    if (forLine) forLine.textContent = t ? `Notes on ${nameOf(t)}` : 'Open a tile to take notes on it.';
  }

  // ---- the switch ----------------------------------------------------------
  const lists = [...document.querySelectorAll('[data-notes-path-list]')];
  const views = [...document.querySelectorAll('[data-notes-path-view]')];
  let current = 'path';
  function view(name) {
    current = name;
    for (const l of lists) l.hidden = l.dataset.notesPathList !== name;
    for (const b of views) {
      const on = b.dataset.notesPathView === name;
      b.classList.toggle('rux--content-switcher--selected', on);
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    }
  }
  if (views.length) {
    document.querySelector('[data-notes-path-switch]').hidden = false;
    for (const b of views) b.addEventListener('click', () => view(b.dataset.notesPathView));
    // Arrow keys move between the two, as a tab list expects.
    document.querySelector('[data-notes-path-switch]').addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      const at = views.indexOf(document.activeElement);
      if (at < 0) return;
      const next = views[(at + (event.key === 'ArrowRight' ? 1 : views.length - 1)) % views.length];
      view(next.dataset.notesPathView);
      next.focus();
    });
    view('path');
  }

  // ---- search ----------------------------------------------------------------
  const search = document.querySelector('[data-notes-path-search]');
  const q = document.querySelector('[data-notes-path-q]');
  const clear = document.querySelector('[data-notes-path-clear]');
  const found = document.querySelector('[data-notes-path-found]');
  const switcher = document.querySelector('[data-notes-path-switch]');
  const text = new Map();
  const words = t => {
    // Read once per search, since the owner's quests arrive after load.
    text.set(t, t.textContent.replace(/\s+/g, ' ').toLowerCase());
    return text.get(t);
  };
  function filter() {
    const terms = q.value.toLowerCase().split(/\s+/).filter(Boolean);
    const on = terms.length > 0;
    let count = 0;
    for (const t of tiles) {
      const hit = !on || terms.every(w => words(t).includes(w));
      t.hidden = !hit;
      if (on && hit) count++;
    }
    const shown = el => [...el.querySelectorAll('[data-notes-path-tile]')].some(t => !t.hidden);
    for (const el of document.querySelectorAll('.notes-path-side, .notes-path-stage')) el.hidden = on && !shown(el);
    if (on) {
      for (const l of lists) l.hidden = !shown(l);
      if (switcher) switcher.hidden = true;
      found.textContent = count ? `${count} tile${count === 1 ? '' : 's'} match.` : 'No tile matches.';
    } else {
      if (switcher && views.length) switcher.hidden = false;
      if (lists.length > 1) view(current); else for (const l of lists) l.hidden = false;
      found.textContent = '';
    }
    clear.classList.toggle('rux--search-close--hidden', !q.value);
  }
  if (search && q) {
    search.hidden = false;
    q.addEventListener('input', filter);
    q.addEventListener('keydown', event => {
      if (event.key === 'Escape' && q.value) { event.stopPropagation(); q.value = ''; filter(); }
    });
    clear.addEventListener('click', () => { q.value = ''; filter(); q.focus(); });
  }

  function show(id, behavior = 'smooth') {
    const t = document.getElementById(`tile-${id}`);
    if (!t) return;
    if (t.hidden && q) { q.value = ''; filter(); }
    const list = t.closest('[data-notes-path-list]');
    if (list?.hidden) view(list.dataset.notesPathList);
    t.open = true;
    t.scrollIntoView({ block: 'start', behavior });
    t.querySelector(':scope > summary')?.focus({ preventScroll: true });
    history.replaceState(null, '', `#tile-${id}`);
  }

  for (const t of tiles) {
    t.addEventListener('toggle', () => {
      if (t.open) history.replaceState(null, '', `#tile-${t.dataset.notesPathTile}`);
      else if (!openTile()) history.replaceState(null, '', location.pathname);
      follow();
    });
  }

  document.addEventListener('click', event => {
    const link = event.target.closest('[data-notes-path-go]');
    if (!link) return;
    event.preventDefault();
    if (link.hasAttribute('data-notes-path-skip')) {
      const skip = new Set(link.dataset.notesPathSkip.split(' ').filter(Boolean));
      for (const t of tiles) t.classList.toggle('notes-path-skipped', skip.has(t.dataset.notesPathTile));
    }
    show(link.dataset.notesPathGo);
  });

  note?.addEventListener('input', () => {
    const t = openTile();
    if (!t || !local()) return;
    if (note.value) notes[t.dataset.notesPathTile] = note.value;
    else delete notes[t.dataset.notesPathTile];
    keep();
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const t = openTile();
    if (!t) return;
    t.open = false;
    t.querySelector(':scope > summary')?.focus();
  });

  // Arriving at #tile-<id>: open it, and scroll once the page has laid out,
  // after the browser's own scroll restore.
  document.addEventListener('notes-path:refresh', follow);

  const wanted = /^#tile-(.+)$/.exec(location.hash);
  if (wanted) {
    history.scrollRestoration = 'manual';
    const id = decodeURIComponent(wanted[1]);
    document.getElementById(`tile-${id}`)?.setAttribute('open', '');
    const go = () => requestAnimationFrame(() => show(id, 'auto'));
    if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true });
  }
  follow();
})();
