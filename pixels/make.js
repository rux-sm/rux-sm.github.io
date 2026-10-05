/* ==========================================================================
   make.js — the puzzle maker
   --------------------------------------------------------------------------
   DRAW: tap a square to fill or empty it, or drag. The numbers update as the
   picture changes, and the check says whether a player can solve it by logic
   alone, and then how hard that is; squares that would need a guess are
   outlined. COLOUR: pick one of the eight inks and paint any square, filled
   or not; that is the picture the puzzle finishes as. A picture never
   coloured finishes in black and white. Size starts a blank board of 5, 10
   or 15 squares a side, and a saved puzzle keeps the size it has. Category
   is where the puzzle sits on the front page, among those of its size: it
   lists the categories by name, and New category starts one after them,
   hidden from the players until the front page's switch publishes it. A
   puzzle given a day is that day's puzzle instead and sits in no category;
   a day takes one puzzle, and after one is saved the field moves on a day.
   Category name names the category chosen, for boards of this size, and is
   saved with the puzzle. A category holds nine: the Category field counts
   each one's puzzles, and a full one cannot be picked. Save stays off until
   the picture is solvable and named.

   The data calls a category a level: `level` is its number, which is its
   place on the front page and is never shown, and `theme` is its name.
   docs/making-puzzles.md is the guide to a good one.

   Only the owner's account makes and edits; any other is told so.

   make.html?id= edits a saved puzzle. A new picture not yet saved is kept in
   this browser under `pixels-draft`, so a reload does not lose it.
   ========================================================================== */
(() => {
  'use strict';

  const { data, owner, SIZES, grid, squaresOf, unreached, rounds, grade, board, drag, switcher, chosen } = window.Pixels;
  const $ = id => document.getElementById(id);
  const host = $('pixels-board'), check = $('pixels-check'), name = $('pixels-name'), level = $('pixels-level'), save = $('pixels-save');
  const day = $('pixels-day'), theme = $('pixels-theme');
  const inks = $('pixels-inks');
  const DRAFT = 'pixels-draft';
  // A category holds nine, three rows of three on a phone.
  const PER_LEVEL = 9;

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

  let side = 10, puzzles = [];
  const blank = () => Array.from({ length: side }, () => new Array(side).fill(0));
  // `colours` is an ink for every square, or null until the picture is coloured.
  let draft = blank(), colours = null, editing = null, filling = 1, step = 'draw', ink = 2;

  const levelOf = () => Math.min(99, Math.max(1, parseInt(level.value, 10) || 1));
  const readDraft = () => { try { return JSON.parse(localStorage.getItem(DRAFT) || 'null'); } catch { return null; } };
  const keepDraft = () => {
    if (editing) return;
    try {
      localStorage.setItem(DRAFT, JSON.stringify({
        squares: squaresOf(draft), name: name.value, level: levelOf(), day: day.value, colours: colours && squaresOf(colours),
      }));
    } catch { /* a convenience */ }
  };

  // `kind` is the whole class, so the check can find it.
  const tag = (kind, text) => {
    const span = document.createElement('span');
    span.className = `rux--tag rux--layout--size-md ${kind}`;
    span.textContent = text;
    check.replaceChildren(span);
  };

  // The size chosen, shown on its switcher.
  const setSide = to => {
    side = to;
    chosen($('pixels-size'), $('pixels-size').querySelector(`[data-size="${side}"]`));
  };
  // The name of the category chosen, among boards of this size.
  const themeOf = () => puzzles.find(p => p.width === side && p.level === levelOf() && !p.day)?.theme || '';
  const showTheme = () => { theme.value = themeOf(); };
  // How many puzzles of this size each category holds, and how many of them
  // are not the one being edited: nine of those leave it no room.
  const held = () => {
    const all = {}, others = {};
    puzzles.forEach(p => {
      if (p.width !== side || p.day) return;
      all[p.level] = (all[p.level] || 0) + 1;
      if (p.id !== editing?.id) others[p.level] = (others[p.level] || 0) + 1;
    });
    return { all, full: n => (others[n] || 0) >= PER_LEVEL };
  };
  // The first category with room for another puzzle of this size.
  const openLevel = () => {
    const { full } = held();
    let open = 1;
    while (full(open)) open++;
    return open;
  };
  // The Category field: this size's categories by name with how many of
  // their nine they hold, in their order, then one for a new category,
  // numbered to stand after them. A full one cannot be picked. `pick` is the
  // one to choose; a full one gives way to the first with room, and one that
  // is not there to the new category.
  const showLevels = pick => {
    const names = new Map(), { all, full } = held();
    puzzles.forEach(p => { if (p.width === side && !p.day) names.set(p.level, p.theme || 'More'); });
    const next = Math.max(0, ...names.keys()) + 1;
    level.replaceChildren(...[...names].sort((a, b) => a[0] - b[0]).map(([n, text]) => {
      const option = new Option(`${text} · ${all[n]} of ${PER_LEVEL}`, n);
      option.disabled = full(n);
      return option;
    }), new Option('New category', next));
    const to = names.has(pick) && !full(pick) ? pick : openLevel();
    level.value = names.has(to) ? to : next;
  };

  let solvable = false;
  const render = () => {
    const unknown = unreached(draft);
    const guesses = unknown.flat().filter(Boolean).length;
    const empty = draft.every(r => r.every(c => !c));
    // Room for the most numbers a line of this side can hold, so the squares
    // never move under a finger as the numbers change.
    const most = Math.ceil(side / 2);
    board(host, draft, draft, step === 'colour' ? { inks: colours, most, label: 'Picture' } : { unknown, most, label: 'Picture' });
    if (empty) tag('rux--tag--gray', 'Draw a picture');
    else if (guesses) tag('rux--tag--red', `${guesses} square${guesses === 1 ? '' : 's'} need a guess`);
    else tag('rux--tag--green', `Solvable · ${grade(rounds(draft))}`);
    solvable = !empty && !guesses;
    save.disabled = !solvable || !name.value.trim();
  };

  // Colour starts as the picture is seen while solving: dark on light.
  const setStep = to => {
    step = to;
    if (step === 'colour' && !colours) colours = draft.map(r => r.map(c => (c ? 0 : 1)));
    inks.hidden = step !== 'colour';
    chosen($('pixels-step'), $('pixels-step').querySelector(`[data-step="${step}"]`));
    render();
  };
  switcher($('pixels-step'), b => setStep(b.dataset.step));
  inks.addEventListener('click', e => {
    const picked = e.target.closest('.pixels-ink');
    if (!picked) return;
    ink = +picked.dataset.ink;
    inks.querySelectorAll('.pixels-ink').forEach(b => b.setAttribute('aria-checked', b === picked));
  });

  // One square of a tap or a drag: painted in the colour step, and in the
  // draw step filled or emptied as the drag's first square was.
  const stroke = (y, x) => {
    if (step === 'colour') {
      if (colours[y][x] === ink) return;
      colours[y][x] = ink;
    } else {
      if (draft[y][x] === filling) return;
      draft[y][x] = filling;
    }
    render();
    keepDraft();
  };
  const pad = drag(host, {
    free: true,
    start: (y, x) => { filling = draft[y][x] ? 0 : 1; $('pixels-saved').hidden = true; stroke(y, x); },
    paint: stroke,
    zoom: () => side > 10,
  });
  switcher($('pixels-size'), b => {
    setSide(+b.dataset.size);
    pad.reset();
    showLevels(openLevel());
    showTheme();
    $('pixels-saved').hidden = true;
    clear();
    keepDraft();
  });
  name.addEventListener('input', () => { save.disabled = !solvable || !name.value.trim(); keepDraft(); });
  level.addEventListener('input', () => { showTheme(); keepDraft(); render(); });
  level.addEventListener('change', () => { showTheme(); keepDraft(); render(); });
  // A day's puzzle is in no category, so Category and its name have nothing to say.
  const showDay = () => {
    level.disabled = theme.disabled = !!day.value;
    level.closest('.rux--select').classList.toggle('rux--select--disabled', !!day.value);
  };
  day.addEventListener('change', () => { showDay(); keepDraft(); render(); });

  const clear = () => {
    draft = blank();
    colours = null;
    setStep('draw');
  };
  $('pixels-clear').addEventListener('click', () => {
    $('pixels-saved').hidden = true;
    clear();
    keepDraft();
  });

  $('pixels-form').addEventListener('submit', async e => {
    e.preventDefault();
    if (save.disabled || !data) return;
    save.disabled = true;
    const puzzle = {
      id: editing?.id, name: name.value.trim(), squares: squaresOf(draft), width: side, height: side,
      level: levelOf(), day: day.value || null, colours: colours && squaresOf(colours),
    };
    // A category just started is hidden, so it is drawn out of the players'
    // sight; the front page's Published switch shows it.
    const fresh = !puzzle.day && !puzzles.some(p => p.width === side && p.level === puzzle.level && !p.day);
    try {
      if (fresh) await data.setHidden?.(side, puzzle.level, true);
      const row = await data.save(puzzle);
      // The category's name goes with it, if it was changed.
      const named = theme.value.trim();
      if (!puzzle.day && named !== themeOf()) {
        await data.setTheme?.(side, puzzle.level, named);
        puzzles.forEach(p => { if (p.width === side && p.level === puzzle.level) p.theme = named || null; });
      }
      // The list this page holds takes the puzzle as saved, so the Category
      // field lists a category just started, by its name.
      const listed = puzzles.find(p => p.id === row.id);
      if (listed) { Object.assign(listed, row, { theme: named || null }); delete listed.rounds; }
      else puzzles.push({ ...row, theme: named || null });
      if (!puzzle.day) showLevels(puzzle.level);
      if (editing) {
        editing = row;
        saved(`Saved “${row.name}”${fresh && data.setHidden ? `. ${named || 'More'} is hidden until you publish it.` : ''}`);
      } else {
        try { localStorage.removeItem(DRAFT); } catch { /* nothing kept */ }
        name.value = '';
        clear();
        if (row.day) {
          const when = new Date(`${row.day}T12:00`);
          saved(`Saved “${row.name}”. It is the puzzle for ${when.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}.`);
          // On to the next day, for a run of them.
          when.setDate(when.getDate() + 1);
          day.value = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}-${String(when.getDate()).padStart(2, '0')}`;
        } else saved(`Saved “${row.name}”. It is in ${named || 'More'}${fresh && data.setHidden ? ', hidden until you publish it' : ''}.`);
      }
      $('pixels-error').hidden = true;
    } catch (error) {
      // The database lets a day have one puzzle.
      if (error?.code === '23505') say('That day already has a puzzle', 'Pick another day, or edit the one it has.');
      else say('The puzzle was not saved', 'Try again.');
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
    if (!owner) {
      say('Only the owner makes puzzles', 'This account can play them.');
      document.querySelector('.pixels-maker').hidden = true;
      return;
    }
    const id = new URLSearchParams(location.search).get('id');
    try {
      puzzles = await data.list();
    } catch {
      say(id ? 'The puzzle did not load' : 'The puzzles did not load', 'Reload the page to try again.');
    }
    if (id) {
      editing = puzzles.find(p => String(p.id) === id) || null;
      if (editing) {
        setSide(editing.width);
        $('pixels-size-row').hidden = true;
        draft = grid(editing.squares, editing.width);
        colours = editing.colours ? grid(editing.colours, editing.width) : null;
        name.value = editing.name;
        showLevels(editing.level);
        day.value = editing.day || '';
        $('pixels-heading').textContent = `Edit ${editing.name}`;
        document.title = `Edit ${editing.name} — Pixels`;
        $('pixels-delete').hidden = false;
      } else say('This puzzle is not here', 'It may have been deleted. The board is ready for a new one.');
    }
    if (!editing) {
      const kept = readDraft();
      const keptSide = Math.sqrt(kept?.squares?.length || 0);
      setSide(!id && SIZES.includes(keptSide) ? keptSide : 10);
      showLevels(openLevel());
      if (!id && SIZES.includes(keptSide)) {
        draft = grid(kept.squares);
        colours = kept.colours ? grid(kept.colours) : null;
        name.value = kept.name || '';
        if (kept.level) showLevels(kept.level);
        day.value = kept.day || '';
      }
    }
    showDay();
    showTheme();
    render();
  })();
})();
