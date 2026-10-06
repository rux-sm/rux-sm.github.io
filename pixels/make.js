/* ==========================================================================
   make.js — the puzzle maker
   --------------------------------------------------------------------------
   DRAW: tap a square to fill or empty it, or drag. The numbers update as the
   picture changes, and the check in the board's corner says whether a
   player can solve it by logic alone, how hard that is and how much of the
   board is filled; squares that would need a guess are outlined. COLOUR:
   the toolbar's last button shows the colour in hand and opens the
   thirty-three inks; pick one and paint any square, filled or not; that is
   the picture the puzzle finishes as. The paintbrush colours the
   squares tapped or dragged over, the bucket every square joined to the one
   tapped through its own ink, and the eraser puts a square back as it
   starts: dark if it is filled, light if not. A picture never coloured
   finishes in black and white. UNDO takes back the last tap, drag, fill or
   Clear, in either step, and Redo puts it back; Cmd or Ctrl with Z undoes,
   and with Shift and Z, or Y, redoes. These are the toolbar over the board,
   which the arrow keys move along. Size starts a blank board of 5, 10 or 15
   squares a side, and a saved puzzle keeps the size it has. Back, the
   toolbar's first button, leaves for the puzzles; a new picture is kept as
   the draft, so nothing is lost by it.

   CATEGORY is where the puzzle goes: one of its size's categories on the
   front page, listed by name with how many of its nine are on; New
   category, which starts one after them, asks for its name, and is hidden
   from the players until the front page's switch publishes it; or Puzzle of
   the day, which asks for the day. A day's puzzle sits in no category; a
   day takes one puzzle, and after one is saved the day moves on by one. A
   puzzle saved into a category with nine on is saved off, for the front
   page's switch to turn on. Save stays off until the picture is solvable
   and named, and a day's puzzle has its day.

   The data calls a category a level: `level` is its number, which is its
   place on the front page and is never shown, and `theme` is its name.
   docs/making-puzzles.md is the guide to a good one.

   Only the owner's account makes and edits; any other is told so.

   make.html?id= edits a saved puzzle. A new picture not yet saved is kept in
   this browser under `pixels-draft`, so a reload does not lose it.
   ========================================================================== */
(() => {
  'use strict';

  const { data, owner, SIZES, grid, squaresOf, unreached, rounds, grade, board, drag } = window.Pixels;
  const $ = id => document.getElementById(id);
  const host = $('pixels-board'), check = $('pixels-check'), name = $('pixels-name'), level = $('pixels-level'), save = $('pixels-save');
  const day = $('pixels-day'), theme = $('pixels-theme');
  const inks = $('pixels-inks'), inkKey = $('pixels-ink'), inkMenu = $('pixels-ink-menu');
  const tools = $('pixels-tool'), steps = $('pixels-step'), size = $('pixels-size');
  const undoKey = $('pixels-undo'), redoKey = $('pixels-redo');
  const DRAFT = 'pixels-draft';
  // The inks, a colour at a time: its light, its middle and its dark, and
  // last white, grey and black. Each is the character a picture stores,
  // then its name. app.css lays them out a colour to a row.
  const INKS = [
    ['c', 'Light red'], ['2', 'Red'], ['m', 'Dark red'],
    ['d', 'Light orange'], ['3', 'Orange'], ['n', 'Dark orange'],
    ['e', 'Light yellow'], ['4', 'Yellow'], ['o', 'Dark yellow'],
    ['f', 'Light green'], ['5', 'Green'], ['p', 'Dark green'],
    ['g', 'Light blue'], ['6', 'Blue'], ['q', 'Dark blue'],
    ['j', 'Light purple'], ['9', 'Purple'], ['t', 'Dark purple'],
    ['i', 'Light pink'], ['8', 'Pink'], ['s', 'Dark pink'],
    ['h', 'Light brown'], ['7', 'Brown'], ['r', 'Dark brown'],
    ['k', 'Light teal'], ['a', 'Teal'], ['u', 'Dark teal'],
    ['l', 'Light sky blue'], ['b', 'Sky blue'], ['v', 'Dark sky blue'],
    ['1', 'White'], ['y', 'Grey'], ['0', 'Black'],
  ];
  // A category shows nine, three rows of three on a phone; any more are off.
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
  // The Category field's last choice makes it a day's puzzle.
  const daily = () => level.value === 'day';
  const readDraft = () => { try { return JSON.parse(localStorage.getItem(DRAFT) || 'null'); } catch { return null; } };
  const keepDraft = () => {
    if (editing) return;
    try {
      localStorage.setItem(DRAFT, JSON.stringify({
        squares: squaresOf(draft), name: name.value, level: daily() ? 'day' : levelOf(), day: daily() ? day.value : '', colours: colours && squaresOf(colours),
      }));
    } catch { /* a convenience */ }
  };

  // The check, over the board's corner: a tag, then a line for each thing
  // more. `kind` is the whole class, so the site's check can find it.
  const report = (kind, text, ...lines) => {
    const span = document.createElement('span');
    span.className = `rux--tag rux--layout--size-sm rux--tag--sm ${kind}`;
    span.textContent = text;
    check.replaceChildren(span, ...lines.map(line => {
      const row = document.createElement('span');
      row.textContent = line;
      return row;
    }));
  };

  // The size chosen, shown in its field.
  const setSide = to => {
    side = to;
    size.value = side;
  };
  // The name of the category chosen, among boards of this size.
  const themeOf = () => puzzles.find(p => p.width === side && p.level === levelOf() && !p.day)?.theme || '';
  // What the Category field's choice asks for: a name for a category with
  // no puzzle yet, a day for a day's puzzle, and for a category there is,
  // nothing, its name kept as it is.
  const showWhere = () => {
    theme.value = themeOf();
    $('pixels-more-theme').hidden = daily() || puzzles.some(p => p.width === side && p.level === levelOf() && !p.day);
    $('pixels-more-day').hidden = !daily();
    // app.css gives the board that much less height while one is shown.
    $('pixels-form').toggleAttribute('data-more', !$('pixels-more-theme').hidden || daily());
  };
  // How many puzzles of this size each category has on and off, and whether
  // it is full: nine on besides the one being edited leave that one no room.
  const held = () => {
    const on = {}, off = {}, others = {};
    puzzles.forEach(p => {
      if (p.width !== side || p.day) return;
      const count = p.off ? off : on;
      count[p.level] = (count[p.level] || 0) + 1;
      if (!p.off && p.id !== editing?.id) others[p.level] = (others[p.level] || 0) + 1;
    });
    return { on, off, full: n => (others[n] || 0) >= PER_LEVEL };
  };
  // The first category with room for another puzzle of this size.
  const openLevel = () => {
    const { full } = held();
    let open = 1;
    while (full(open)) open++;
    return open;
  };
  // The Category field: this size's categories by name, in their order, each
  // with how many of its nine are on and how many puzzles it holds off, then
  // one for a new category, numbered to stand after them, and one for a
  // puzzle of the day. `pick` is the one to choose, 'day' for the last, and
  // one that is not there chooses the new category.
  const showLevels = pick => {
    const names = new Map(), { on, off } = held();
    puzzles.forEach(p => { if (p.width === side && !p.day) names.set(p.level, p.theme || 'More'); });
    const next = Math.max(0, ...names.keys()) + 1;
    level.replaceChildren(...[...names].sort((a, b) => a[0] - b[0])
      .map(([n, text]) => new Option(`${text} · ${on[n] || 0} of ${PER_LEVEL}${off[n] ? `, ${off[n]} off` : ''}`, n)),
    new Option('New category…', next), new Option('Puzzle of the day…', 'day'));
    level.value = pick === 'day' || names.has(pick) ? pick : next;
  };

  let solvable = false;
  const ready = () => solvable && !!name.value.trim() && (!daily() || !!day.value);
  const render = () => {
    const unknown = unreached(draft);
    const guesses = unknown.flat().filter(Boolean).length;
    const empty = draft.every(r => r.every(c => !c));
    // The board keeps the room for numbers a player's has, so the squares
    // never move under a finger as the numbers change.
    board(host, draft, draft, step === 'colour' ? { inks: colours, label: 'Picture' } : { unknown, label: 'Picture' });
    const full = `${Math.round(draft.flat().filter(Boolean).length * 100 / (side * side))}% filled`;
    if (empty) report('rux--tag--gray', 'Empty');
    else if (guesses) report('rux--tag--red', `${guesses} to guess`, full);
    else report('rux--tag--green', 'Solvable', grade(rounds(draft)), full);
    solvable = !empty && !guesses;
    save.disabled = !ready();
  };

  // A square as the colour step starts it, and as the eraser leaves it: the
  // picture as it is seen while solving, dark on light.
  const plain = (y, x) => (draft[y][x] ? 0 : 1);
  // One key of a group is the chosen one, drawn as Carbon draws a selected
  // button.
  const choose = (group, on) => group.querySelectorAll('button').forEach(b => {
    b.setAttribute('aria-checked', on(b));
    b.classList.toggle('rux--btn--selected', on(b));
  });
  // The tools and the colour are there in both steps and out of reach in
  // Draw, so the toolbar never changes shape.
  const setStep = to => {
    step = to;
    if (step === 'colour' && !colours) colours = draft.map((r, y) => r.map((_, x) => plain(y, x)));
    [...tools.querySelectorAll('button'), inkKey].forEach(b => { b.disabled = step !== 'colour'; });
    if (step !== 'colour') window.Rux.popover?.close(inkMenu);
    choose(steps, b => b.dataset.step === step);
    render();
  };
  steps.addEventListener('click', e => {
    const picked = e.target.closest('[data-step]');
    if (picked) setStep(picked.dataset.step);
  });
  const swatch = ([id, label]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pixels-ink';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', parseInt(id, 36) === ink);
    b.setAttribute('aria-label', label);
    b.title = label;
    b.dataset.ink = id;
    return b;
  };
  inks.replaceChildren(...INKS.map(swatch));
  // The colour in hand: ringed among the inks, and shown and named on the
  // toolbar's button that opens them.
  const setInk = to => {
    ink = to;
    const id = ink.toString(36);
    inks.querySelectorAll('.pixels-ink').forEach(b => b.setAttribute('aria-checked', b.dataset.ink === id));
    inkKey.firstElementChild.dataset.ink = id;
    inkKey.title = `Colour: ${INKS.find(([i]) => i === id)[1]}`;
    inkKey.setAttribute('aria-label', inkKey.title);
  };
  setInk(ink);
  // Picking one closes the menu, and the board is ready for it.
  inks.addEventListener('click', e => {
    const picked = e.target.closest('.pixels-ink');
    if (!picked) return;
    setInk(parseInt(picked.dataset.ink, 36));
    window.Rux.popover?.close(inkMenu, { restoreFocus: true });
  });
  // The tool the colour step works with: paint, fill or erase.
  let tool = 'paint';
  const setTool = to => {
    tool = to;
    choose(tools, b => b.dataset.tool === tool);
  };
  tools.addEventListener('click', e => {
    const picked = e.target.closest('[data-tool]');
    if (picked) setTool(picked.dataset.tool);
  });

  // UNDO AND REDO. A step is the picture as it stood, its squares and its
  // colours as the strings a puzzle is saved in. `mark` keeps how the
  // picture stands as a tap or drag begins, and the first square that then
  // changes puts that on the pile, so a tap that changes nothing leaves no
  // step. A new size, and a new puzzle after a save, start the pile again.
  const STEPS = 200;
  let past = [], ahead = [], before = null;
  const snap = () => ({ squares: squaresOf(draft), colours: colours && squaresOf(colours) });
  const showMoves = () => { undoKey.disabled = !past.length; redoKey.disabled = !ahead.length; };
  const mark = () => { before = snap(); };
  const changing = () => {
    if (!before) return;
    past.push(before);
    if (past.length > STEPS) past.shift();
    ahead = [];
    before = null;
    showMoves();
  };
  const forget = () => { past = []; ahead = []; before = null; showMoves(); };
  // Takes the top of one pile as the picture and puts the picture it
  // replaces on the other. A picture with no colours has nothing for the
  // colour step to show, so that step gives way to Draw.
  const move = (from, to) => {
    if (!from.length) return;
    to.push(snap());
    const now = from.pop();
    draft = grid(now.squares, side);
    colours = now.colours ? grid(now.colours, side) : null;
    $('pixels-saved').hidden = true;
    if (step === 'colour' && !colours) setStep('draw'); else render();
    keepDraft();
    showMoves();
  };
  undoKey.addEventListener('click', () => move(past, ahead));
  redoKey.addEventListener('click', () => move(ahead, past));
  // A field keeps its own undo for what is typed in it.
  addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    if (!(e.metaKey || e.ctrlKey) || e.altKey || (key !== 'z' && key !== 'y') || e.target.closest?.('input, select, textarea')) return;
    e.preventDefault();
    if (key === 'y' || e.shiftKey) move(ahead, past); else move(past, ahead);
  });

  // One square of a tap or a drag: painted or put back plain in the colour
  // step, and in the draw step filled or emptied as the drag's first square
  // was.
  const stroke = (y, x) => {
    if (step === 'colour') {
      const to = tool === 'erase' ? plain(y, x) : ink;
      if (colours[y][x] === to) return;
      changing();
      colours[y][x] = to;
    } else {
      if (draft[y][x] === filling) return;
      changing();
      draft[y][x] = filling;
    }
    render();
    keepDraft();
  };
  // Every square joined to this one, side to side, through its own ink.
  const flood = (y, x) => {
    const was = colours[y][x];
    if (was === ink) return;
    changing();
    const todo = [[y, x]];
    while (todo.length) {
      const [r, c] = todo.pop();
      if (colours[r]?.[c] !== was) continue;
      colours[r][c] = ink;
      todo.push([r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]);
    }
    render();
    keepDraft();
  };
  // The bucket is a tap; everything else goes on under a drag.
  let dragging = false;
  const pad = drag(host, {
    free: true,
    start: (y, x) => {
      $('pixels-saved').hidden = true;
      dragging = step !== 'colour' || tool !== 'fill';
      mark();
      if (step === 'colour' && tool === 'fill') { flood(y, x); return; }
      filling = draft[y][x] ? 0 : 1;
      stroke(y, x);
    },
    paint: (y, x) => { if (dragging) stroke(y, x); },
    zoom: () => side > 10,
  });
  size.addEventListener('change', () => {
    setSide(+size.value);
    pad.reset();
    showLevels(openLevel());
    showWhere();
    $('pixels-saved').hidden = true;
    clear();
    forget();
    keepDraft();
  });
  name.addEventListener('input', () => { save.disabled = !ready(); keepDraft(); });
  level.addEventListener('change', () => { showWhere(); keepDraft(); render(); });
  day.addEventListener('change', () => { keepDraft(); render(); });

  const clear = () => {
    draft = blank();
    colours = null;
    setStep('draw');
  };
  // The arrows move along the toolbar, as they do along Carbon's.
  $('pixels-toolbar').addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const keys = [...e.currentTarget.querySelectorAll('.rux--btn')].filter(b => !b.disabled), at = keys.indexOf(document.activeElement);
    if (at < 0) return;
    e.preventDefault();
    keys[(at + (e.key === 'ArrowRight' ? 1 : keys.length - 1)) % keys.length].focus();
  });
  // Clear is a step too, unless the board was blank already.
  $('pixels-clear').addEventListener('click', () => {
    $('pixels-saved').hidden = true;
    mark();
    if (colours || draft.some(r => r.some(Boolean))) changing();
    clear();
    keepDraft();
  });

  $('pixels-form').addEventListener('submit', async e => {
    e.preventDefault();
    if (save.disabled || !data) return;
    save.disabled = true;
    const puzzle = {
      id: editing?.id, name: name.value.trim(), squares: squaresOf(draft), width: side, height: side,
      level: levelOf(), day: (daily() && day.value) || null, colours: colours && squaresOf(colours),
    };
    // A puzzle that is off stays off. One that comes into a category with
    // nine on is saved off too, since the category shows nine; a day's
    // puzzle is in no category and is never off.
    const stays = editing && !editing.day && editing.level === puzzle.level;
    puzzle.off = !puzzle.day && !!data.setOff && (!!editing?.off || (!stays && held().full(puzzle.level)));
    const turnedOff = puzzle.off && !editing?.off;
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
      showWhere();
      if (editing) {
        editing = row;
        saved(`Saved “${row.name}”${fresh && data.setHidden ? `. ${named || 'More'} is hidden until you publish it.` : turnedOff ? `. It is off: ${named || 'More'} has nine on.` : ''}`);
      } else {
        try { localStorage.removeItem(DRAFT); } catch { /* nothing kept */ }
        name.value = '';
        clear();
        forget();
        if (row.day) {
          const when = new Date(`${row.day}T12:00`);
          saved(`Saved “${row.name}”. It is the puzzle for ${when.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}.`);
          // On to the next day, for a run of them.
          when.setDate(when.getDate() + 1);
          day.value = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}-${String(when.getDate()).padStart(2, '0')}`;
        } else saved(`Saved “${row.name}”. It is in ${named || 'More'}${fresh && data.setHidden ? ', hidden until you publish it' : turnedOff ? ', off, since nine are on' : ''}.`);
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
        size.disabled = true;
        size.closest('.rux--select').classList.add('rux--select--disabled');
        draft = grid(editing.squares, editing.width);
        colours = editing.colours ? grid(editing.colours, editing.width) : null;
        name.value = editing.name;
        showLevels(editing.day ? 'day' : editing.level);
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
        if (kept.level) showLevels(kept.day ? 'day' : kept.level);
        day.value = kept.day || '';
      }
    }
    showWhere();
    render();
  })();
})();
