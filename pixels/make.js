/* ==========================================================================
   make.js — the puzzle maker
   --------------------------------------------------------------------------
   Tap a square to fill or empty it, or drag to draw. The numbers update as
   the picture changes, and the check below says whether a player can solve
   it by logic alone; squares that would need a guess are outlined. Save
   stays off until the picture is solvable and named.

   make.html?id= edits a saved puzzle. A new picture not yet saved is kept in
   this browser under `pixels-draft`, so a reload does not lose it.
   ========================================================================== */
(() => {
  'use strict';

  const { data, SIZE, grid, squaresOf, unreached, board, drag } = window.Pixels;
  const $ = id => document.getElementById(id);
  const host = $('pixels-board'), check = $('pixels-check'), name = $('pixels-name'), save = $('pixels-save');
  const DRAFT = 'pixels-draft';

  const say = (heading, detail) => {
    const box = $('pixels-error');
    box.querySelector('.rux--inline-notification__title').textContent = heading;
    box.querySelector('.rux--inline-notification__subtitle').textContent = detail;
    box.hidden = false;
  };
  const saved = text => {
    const box = $('pixels-saved');
    box.querySelector('.rux--inline-notification__title').textContent = text;
    box.hidden = false;
  };

  const blank = () => Array.from({ length: SIZE }, () => new Array(SIZE).fill(0));
  let draft = blank(), editing = null, paint = 1;

  const readDraft = () => { try { return JSON.parse(localStorage.getItem(DRAFT) || 'null'); } catch { return null; } };
  const keepDraft = () => {
    if (editing) return;
    try { localStorage.setItem(DRAFT, JSON.stringify({ squares: squaresOf(draft), name: name.value })); } catch { /* a convenience */ }
  };

  // `kind` is the whole class, so the check can find it.
  const tag = (kind, text) => {
    const span = document.createElement('span');
    span.className = `rux--tag rux--layout--size-md ${kind}`;
    span.textContent = text;
    check.replaceChildren(span);
  };

  let solvable = false;
  const render = () => {
    const unknown = unreached(draft);
    const guesses = unknown.flat().filter(Boolean).length;
    const empty = draft.every(r => r.every(c => !c));
    board(host, draft, draft, { unknown, label: 'Picture' });
    if (empty) tag('rux--tag--gray', 'Draw a picture');
    else if (guesses) tag('rux--tag--red', `${guesses} square${guesses === 1 ? '' : 's'} need a guess`);
    else tag('rux--tag--green', 'Solvable');
    solvable = !empty && !guesses;
    save.disabled = !solvable || !name.value.trim();
  };

  drag(host, {
    free: true,
    start: (y, x) => { paint = draft[y][x] ? 0 : 1; draft[y][x] = paint; $('pixels-saved').hidden = true; render(); keepDraft(); },
    paint: (y, x) => { if (draft[y][x] !== paint) { draft[y][x] = paint; render(); keepDraft(); } },
  });
  name.addEventListener('input', () => { save.disabled = !solvable || !name.value.trim(); keepDraft(); });

  $('pixels-clear').addEventListener('click', () => {
    draft = blank();
    $('pixels-saved').hidden = true;
    render();
    keepDraft();
  });

  $('pixels-form').addEventListener('submit', async e => {
    e.preventDefault();
    if (save.disabled || !data) return;
    save.disabled = true;
    const puzzle = { id: editing?.id, name: name.value.trim(), squares: squaresOf(draft) };
    try {
      const row = await data.save(puzzle);
      if (editing) {
        editing = row;
        saved(`Saved “${row.name}”`);
      } else {
        try { localStorage.removeItem(DRAFT); } catch { /* nothing kept */ }
        draft = blank();
        name.value = '';
        saved(`Saved “${row.name}”. It is in Puzzles.`);
      }
      $('pixels-error').hidden = true;
    } catch {
      say('The puzzle was not saved', 'Try again.');
    }
    render();
  });

  $('pixels-delete-confirm').addEventListener('click', async () => {
    try {
      await data.remove(editing.id);
      location.href = './';
    } catch {
      say('The puzzle was not deleted', 'Try again.');
    }
  });

  (async () => {
    if (!data) { say('Pixels could not connect', 'Reload the page to try again.'); return; }
    const id = new URLSearchParams(location.search).get('id');
    if (id) {
      try {
        editing = (await data.list()).find(p => String(p.id) === id) || null;
      } catch {
        say('The puzzle did not load', 'Reload the page to try again.');
      }
      if (editing) {
        draft = grid(editing.squares);
        name.value = editing.name;
        $('pixels-heading').textContent = `Edit ${editing.name}`;
        document.title = `Edit ${editing.name} — Pixels`;
        $('pixels-delete').hidden = false;
      } else if (id) say('This puzzle is not here', 'It may have been deleted. The board is ready for a new one.');
    } else {
      const kept = readDraft();
      if (kept?.squares?.length === SIZE * SIZE) { draft = grid(kept.squares); name.value = kept.name || ''; }
    }
    render();
  })();
})();
