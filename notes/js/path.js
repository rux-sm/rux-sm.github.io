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

  function follow() {
    const t = openTile();
    if (!note) return;
    note.disabled = !t;
    note.value = t ? notes[t.dataset.notesPathTile] ?? '' : '';
    note.placeholder = t ? 'What you found, what to check next' : '';
    if (forLine) forLine.textContent = t ? `Notes on ${nameOf(t)}` : 'Open a tile to take notes on it.';
  }

  function show(id, behavior = 'smooth') {
    const t = document.getElementById(`tile-${id}`);
    if (!t) return;
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
    if (!t) return;
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
