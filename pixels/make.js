/* ==========================================================================
   make.js — the puzzle maker
   --------------------------------------------------------------------------
   DRAW: tap a square to fill or empty it, or drag. The numbers update as the
   picture changes, and the check in the board's corner says whether a
   player can solve it by logic alone, how hard that is and how much of the
   board is filled; squares that would need a guess are outlined. COLOUR:
   the toolbar's last button shows the colour in hand and opens the
   fifty-five inks; pick one and paint any square, filled or not; that is
   the picture the puzzle finishes as. The paintbrush colours the
   squares tapped or dragged over, the bucket every square joined to the one
   tapped through its own ink, and the eraser puts a square back as it
   starts: dark if it is filled, light if not. A picture never coloured
   finishes in black and white. One key of the toolbar shows the step and
   changes to the other, and so does Space. UNDO takes back the last tap, drag, fill or
   Clear, in either step, and Redo puts it back; Cmd or Ctrl with Z undoes,
   and with Shift and Z, or Y, redoes. These are the toolbar over the board,
   which the arrow keys move along. Size starts a blank board of 5, 10 or 15
   squares a side, which Undo takes back, and a saved puzzle keeps the size
   it has. Back, the
   toolbar's first button, leaves for Manage; a new picture is kept as
   the draft, so nothing is lost by it.

   SAVE asks where the puzzle goes, once the picture is solvable and named:
   No category yet, which keeps it in Unsorted, where no player is sent it;
   one of its size's categories on the front page, listed by name with how
   many of its nine are on; New category, which starts one after them, asks
   for its name, and is hidden from the players until Manage's
   switch publishes it; or Puzzle of the day, which asks for the day. A day's puzzle sits in no category; a
   day takes one puzzle, and after one is saved the day moves on by one. A
   puzzle saved into a category with nine on is saved off, for Manage's
   switch to turn on.

   The data calls a category a level: `level` is its number, which is its
   place on the front page and is never shown, and `theme` is its name.
   docs/making-puzzles.md is the guide to a good one.

   THE OWNER'S puzzles go in the owner's gates, which every player is sent.
   ANY OTHER PLAYER makes puzzles for gates of their own, by data.js's
   `own`: a new puzzle costs one mana, the Gate field lists their gates and
   New gate, with no Unsorted and no puzzle of the day, a gate holds nine,
   and Back and Delete leave for Me. A gate just started is hidden until it
   is published on Me. make.html?own is the same for the owner's own gates,
   which cost no mana, and keeps its draft under `pixels-own-draft`.

   make.html?me draws the player's own picture, for any player: the board is
   15 squares a side and starts as the picture they have, or the one made
   from their username. It has no name, no gate and no check, since it is no
   puzzle; Save keeps it and Back leaves, both for Me.

   make.html?id= edits a saved puzzle. A new picture not yet saved is kept in
   this browser under `pixels-draft`, so a reload does not lose it.
   ========================================================================== */
(() => {
  'use strict';

  const { data, owner, SIZES, CHARS, grid, squaresOf, unreached, rounds, firstLook, grade, board, drag, face } = window.Pixels;
  const $ = id => document.getElementById(id);
  const host = $('pixels-board'), check = $('pixels-check'), name = $('pixels-name'), level = $('pixels-level'), save = $('pixels-save');
  const saveNow = $('pixels-save-now');
  const day = $('pixels-day'), theme = $('pixels-theme');
  const inks = $('pixels-inks'), inkKey = $('pixels-ink'), inkMenu = $('pixels-ink-menu');
  const tools = $('pixels-tool'), stepKey = $('pixels-step'), size = $('pixels-size');
  const undoKey = $('pixels-undo'), redoKey = $('pixels-redo');
  const maker = document.querySelector('.pixels-maker');
  // The player's own picture is drawn here too, and keeps a draft of its own.
  const query = new URLSearchParams(location.search);
  const mine = query.has('me');
  // Whose gates a puzzle goes in: the owner's, which every player is sent,
  // or the player's own. The owner draws their own at make.html?own.
  const personal = !owner || query.has('own');
  const DRAFT = mine ? 'pixels-face-draft' : personal && owner ? 'pixels-own-draft' : 'pixels-draft';
  // Where a puzzle is kept: the owner's tables, or a player's own gates,
  // which cost mana. `mana` is the player's, and the owner's is never asked.
  const store = personal ? data?.own || null : data;
  const home = personal ? 'me.html' : 'manage.html';
  let mana = Infinity;
  // The inks, a colour at a time, pale to dark, and last the greys from
  // white to black. Each is the character a picture stores, then its name.
  // app.css lays them out a colour to a row, or to a column on a phone.
  const INKS = [
    ['A', 'Pale red'], ['c', 'Light red'], ['2', 'Red'], ['K', 'Deep red'], ['m', 'Dark red'],
    ['B', 'Pale orange'], ['d', 'Light orange'], ['3', 'Orange'], ['L', 'Deep orange'], ['n', 'Dark orange'],
    ['C', 'Pale yellow'], ['e', 'Light yellow'], ['4', 'Yellow'], ['M', 'Deep yellow'], ['o', 'Dark yellow'],
    ['D', 'Pale green'], ['f', 'Light green'], ['5', 'Green'], ['N', 'Deep green'], ['p', 'Dark green'],
    ['E', 'Pale blue'], ['g', 'Light blue'], ['6', 'Blue'], ['O', 'Deep blue'], ['q', 'Dark blue'],
    ['F', 'Pale purple'], ['j', 'Light purple'], ['9', 'Purple'], ['P', 'Deep purple'], ['t', 'Dark purple'],
    ['G', 'Pale pink'], ['i', 'Light pink'], ['8', 'Pink'], ['Q', 'Deep pink'], ['s', 'Dark pink'],
    ['H', 'Pale brown'], ['h', 'Light brown'], ['7', 'Brown'], ['R', 'Deep brown'], ['r', 'Dark brown'],
    ['I', 'Pale teal'], ['k', 'Light teal'], ['a', 'Teal'], ['S', 'Deep teal'], ['u', 'Dark teal'],
    ['J', 'Pale sky blue'], ['l', 'Light sky blue'], ['b', 'Sky blue'], ['T', 'Deep sky blue'], ['v', 'Dark sky blue'],
    ['1', 'White'], ['w', 'Pale grey'], ['y', 'Grey'], ['z', 'Dark grey'], ['0', 'Black'],
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

  // The Category field's first choice keeps the puzzle in no category.
  const loose = () => level.value === 'none';
  const levelOf = () => (loose() ? null : Math.min(99, Math.max(1, parseInt(level.value, 10) || 1)));
  // The Category field's last choice makes it a day's puzzle.
  const daily = () => level.value === 'day';
  const readDraft = () => { try { return JSON.parse(localStorage.getItem(DRAFT) || 'null'); } catch { return null; } };
  const keepDraft = () => {
    if (editing) return;
    try {
      localStorage.setItem(DRAFT, JSON.stringify({
        squares: squaresOf(draft), name: name.value, level: daily() ? 'day' : loose() ? 'none' : levelOf(), day: daily() ? day.value : '', colours: colours && squaresOf(colours),
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
  // no puzzle yet, a day for a day's puzzle, and for a category there is, or
  // for none, nothing.
  const showWhere = () => {
    theme.value = themeOf();
    $('pixels-more-theme').hidden = daily() || loose() || puzzles.some(p => p.width === side && p.level === levelOf() && !p.day);
    $('pixels-more-day').hidden = !daily();
    saveNow.disabled = (daily() && !day.value) || (!editing && mana < 1);
    $('pixels-mana').hidden = owner;
    $('pixels-mana').textContent = editing ? `You have ${mana} mana. A change costs none.`
      : mana < 1 ? 'You have no mana. Find a sprite in a gate somebody else made to earn one.'
        : `A new puzzle costs 1 mana. You have ${mana}.`;
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
    return { on, off, full: n => n != null && (others[n] || 0) >= PER_LEVEL };
  };
  // The first category with room for another puzzle of this size.
  const openLevel = () => {
    const { full } = held();
    let open = 1;
    while (full(open)) open++;
    return open;
  };
  // The Category field: first no category, then this size's categories by
  // name, in their order, each with how many of its nine are on and how many
  // puzzles it holds off, then one for a new category, numbered to stand
  // after them, and one for a puzzle of the day. `pick` is the one to
  // choose, 'none' for the first and 'day' for the last, and one that is
  // not there chooses the new category.
  const showLevels = pick => {
    const names = new Map(), { on, off } = held();
    puzzles.forEach(p => { if (p.width === side && !p.day && p.level != null) names.set(p.level, p.theme || 'More'); });
    const next = Math.max(0, ...names.keys()) + 1;
    // A player's puzzle is always in one of their gates, and never a day's.
    level.replaceChildren(...(personal ? [] : [new Option('No gate yet', 'none')]), ...[...names].sort((a, b) => a[0] - b[0])
      .map(([n, text]) => new Option(`${text} · ${on[n] || 0} of ${PER_LEVEL}${off[n] ? `, ${off[n]} off` : ''}`, n)),
    new Option('New gate…', next), ...(personal ? [] : [new Option('Puzzle of the day…', 'day')]));
    level.value = pick === 'day' || pick === 'none' || names.has(pick) ? pick : next;
  };

  let solvable = false;
  const ready = () => mine || (solvable && !!name.value.trim());
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
    else report('rux--tag--green', 'Solvable', grade(rounds(draft)), `${Math.round(firstLook(draft) * 100)}% first look`, full);
    solvable = !empty && !guesses;
    save.disabled = !ready();
  };

  // A square as the colour step starts it, and as the eraser leaves it: the
  // picture as it is seen while solving, dark on light.
  const plain = (y, x) => (draft[y][x] ? 0 : 1);
  // One key of a group is the chosen one, which app.css fills.
  const choose = (group, on) => group.querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', on(b)));
  // The tools and the colour are there in both steps and out of reach in
  // Draw, so the toolbar never changes shape. The step's one key shows the
  // step the board is in and names the other, which pressing it changes to.
  const STEPS_NAMED = { draw: 'Draw', colour: 'Colour' };
  const other = () => (step === 'draw' ? 'colour' : 'draw');
  const showStep = () => {
    stepKey.dataset.step = step;
    stepKey.querySelector('.pixels-bar-word').textContent = STEPS_NAMED[step];
    stepKey.title = `${STEPS_NAMED[step]}. Press this, or Space, for ${STEPS_NAMED[other()]}`;
    stepKey.setAttribute('aria-label', stepKey.title);
  };
  showStep();
  const setStep = to => {
    step = to;
    if (step === 'colour' && !colours) colours = draft.map((r, y) => r.map((_, x) => plain(y, x)));
    [...tools.querySelectorAll('button'), inkKey].forEach(b => { b.disabled = step !== 'colour'; });
    inks.inert = step !== 'colour';
    if (step !== 'colour') window.Rux.popover?.close(inkMenu);
    showStep();
    render();
  };
  stepKey.addEventListener('click', () => setStep(other()));
  // Space changes the step from the board and the toolbar, so the two
  // pictures are compared without the pointer moving. A key of the toolbar
  // that has the focus is not pressed by it, as Enter presses it; a field
  // and the inks keep their own Space.
  const spaced = e => {
    if (e.key !== ' ' || e.metaKey || e.ctrlKey || e.altKey || maker.hidden) return false;
    const at = e.target;
    return (at === document.body || !!at.closest?.('.pixels-maker')) && !at.closest?.('input, select, textarea, .pixels-inks');
  };
  addEventListener('keydown', e => {
    if (!spaced(e)) return;
    e.preventDefault();
    if (!e.repeat) setStep(other());
  });
  addEventListener('keyup', e => { if (spaced(e)) e.preventDefault(); });
  const swatch = ([id, label]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pixels-ink';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', CHARS.indexOf(id) === ink);
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
    const id = CHARS[ink];
    inks.querySelectorAll('.pixels-ink').forEach(b => b.setAttribute('aria-checked', b.dataset.ink === id));
    inkKey.firstElementChild.dataset.ink = id;
    inkKey.title = `Colour: ${INKS.find(([i]) => i === id)[1]}`;
    inkKey.setAttribute('aria-label', inkKey.title);
  };
  setInk(ink);
  // On a phone the inks stand open under the toolbar, since there the height
  // is free; elsewhere they are the menu the toolbar's colour opens.
  const narrow = matchMedia('(max-width: 47.99rem)'), inkHome = inks.parentElement;
  const placeInks = () => {
    (narrow.matches ? $('pixels-inks-slot') : inkHome).append(inks);
    if (narrow.matches) window.Rux.popover?.close(inkMenu);
  };
  narrow.addEventListener('change', placeInks);
  placeInks();
  inks.inert = true;
  // Picking one closes the menu, and the board is ready for it.
  inks.addEventListener('click', e => {
    const picked = e.target.closest('.pixels-ink');
    if (!picked) return;
    setInk(CHARS.indexOf(picked.dataset.ink));
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

  // UNDO AND REDO. A step is the picture as it stood: its size, and its
  // squares and colours as the strings a puzzle is saved in. `mark` keeps
  // how the picture stands as a tap or drag begins, and the first square
  // that then changes puts that on the pile, so a tap that changes nothing
  // leaves no step. A new size is a step too, so the drawing it wipes comes
  // back. A new puzzle after a save starts the pile again.
  const STEPS = 200;
  let past = [], ahead = [], before = null;
  const snap = () => ({ side, squares: squaresOf(draft), colours: colours && squaresOf(colours) });
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
    if (now.side !== side) {
      setSide(now.side);
      pad.reset();
      showLevels(openLevel());
      showWhere();
    }
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
  // A new size wipes the board, and is a step Undo takes back if there was
  // a drawing to lose.
  size.addEventListener('change', () => {
    mark();
    if (colours || draft.some(r => r.some(Boolean))) changing();
    setSide(+size.value);
    pad.reset();
    showLevels(openLevel());
    showWhere();
    $('pixels-saved').hidden = true;
    clear();
    keepDraft();
  });
  name.addEventListener('input', () => { save.disabled = !ready(); keepDraft(); });
  level.addEventListener('change', () => { showWhere(); keepDraft(); render(); });
  day.addEventListener('change', () => { saveNow.disabled = daily() && !day.value; keepDraft(); });

  const clear = () => {
    draft = blank();
    colours = null;
    setStep('draw');
  };
  // The arrows move along the toolbar, as they do along Carbon's.
  $('pixels-toolbar').addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const keys = [...e.currentTarget.querySelectorAll('.pixels-bar-key')].filter(b => !b.disabled && b.offsetParent), at = keys.indexOf(document.activeElement);
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

  // Save asks where the puzzle goes, and the answer saves it.
  $('pixels-form').addEventListener('submit', async e => {
    e.preventDefault();
    if (save.disabled || !data) return;
    if (mine) {
      save.disabled = true;
      try {
        await data.setPicture(squaresOf(draft), colours && squaresOf(colours));
        try { localStorage.removeItem(DRAFT); } catch { /* nothing kept */ }
        location.href = 'me.html';
      } catch {
        say('The picture was not saved', 'Try again.');
        save.disabled = false;
      }
      return;
    }
    showWhere();
    window.Rux.modal.open('pixels-save-modal', save);
  });
  $('pixels-where').addEventListener('submit', async e => {
    e.preventDefault();
    if (saveNow.disabled || save.disabled || !data) return;
    window.Rux.modal.close('pixels-save-modal');
    save.disabled = true;
    const puzzle = {
      id: editing?.id, name: name.value.trim(), squares: squaresOf(draft), width: side, height: side,
      level: levelOf(), day: (daily() && day.value) || null, colours: colours && squaresOf(colours),
    };
    // A puzzle that is off stays off. One that comes into a category with
    // nine on is saved off too, since the category shows nine; a day's
    // puzzle is in no category and is never off.
    const stays = editing && !editing.day && editing.level === puzzle.level;
    puzzle.off = !puzzle.day && !!store.setOff && (!!editing?.off || (!stays && held().full(puzzle.level)));
    const turnedOff = puzzle.off && !editing?.off;
    // A player's gate holds nine and no more.
    if (personal && !stays && held().full(puzzle.level)) {
      say('That gate has nine puzzles', 'Pick another gate, or start a new one.');
      render();
      return;
    }
    // A category just started is hidden, so it is drawn out of the players'
    // sight; Manage's Published switch shows it.
    const fresh = !puzzle.day && puzzle.level != null && !puzzles.some(p => p.width === side && p.level === puzzle.level && !p.day);
    try {
      if (fresh) await store.setHidden?.(side, puzzle.level, true);
      const row = await store.save(puzzle);
      // The category's name goes with it, if it was changed.
      const named = theme.value.trim();
      if (!puzzle.day && puzzle.level != null && named !== themeOf()) {
        await store.setTheme?.(side, puzzle.level, named);
        puzzles.forEach(p => { if (p.width === side && p.level === puzzle.level) p.theme = named || null; });
      }
      // The list this page holds takes the puzzle as saved, so the Category
      // field lists a category just started, by its name.
      const listed = puzzles.find(p => p.id === row.id);
      if (listed) { Object.assign(listed, row, { theme: named || null }); delete listed.rounds; }
      else puzzles.push({ ...row, theme: named || null });
      if (!puzzle.day) showLevels(puzzle.level ?? 'none');
      showWhere();
      if (editing) {
        editing = row;
        saved(`Saved “${row.name}”${row.level == null && !row.day ? '. It is in Unsorted, where no player is sent it.' : fresh && store.setHidden ? `. ${named || 'More'} is hidden until you publish it.` : turnedOff ? `. It is off: ${named || 'More'} has nine on.` : ''}`);
      } else {
        try { localStorage.removeItem(DRAFT); } catch { /* nothing kept */ }
        mana -= 1;
        name.value = '';
        clear();
        forget();
        if (row.day) {
          const when = new Date(`${row.day}T12:00`);
          saved(`Saved “${row.name}”. It is the puzzle for ${when.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}.`);
          // On to the next day, for a run of them.
          when.setDate(when.getDate() + 1);
          day.value = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}-${String(when.getDate()).padStart(2, '0')}`;
        } else if (row.level == null) saved(`Saved “${row.name}”. It is in Unsorted, where no player is sent it.`);
        else saved(`Saved “${row.name}”. It is in ${named || 'More'}${fresh && store.setHidden ? ', hidden until you publish it' : turnedOff ? ', off, since nine are on' : ''}.`);
      }
      $('pixels-error').hidden = true;
    } catch (error) {
      // The database lets a day have one puzzle.
      if (error?.code === '23505') say('That day already has a puzzle', 'Pick another day, or edit the one it has.');
      else if (error?.refused === 'mana') say('You have no mana', 'Find a sprite in a gate somebody else made to earn one.');
      else if (error?.refused === 'full') say('That gate has nine puzzles', 'Pick another gate, or start a new one.');
      else if (error?.refused === 'gates') say('You have five gates', 'Delete one on Me to start another.');
      else say('The puzzle was not saved', 'Try again.');
    }
    render();
  });

  $('pixels-delete-confirm').addEventListener('click', async () => {
    try {
      await store.remove(editing.id);
      location.href = home;
    } catch {
      say('The puzzle was not deleted', 'Try again.');
    }
  });

  (async () => {
    if (!data) { say('Pixels could not connect', 'Reload the page to try again.'); return; }
    if (mine) {
      let me = null;
      try { me = await data.me(); } catch { /* said below */ }
      if (!me) {
        say('There is no player here yet', 'Open Pixels from your invite link first.');
        maker.hidden = true;
        return;
      }
      $('pixels-heading').textContent = 'Your picture';
      document.title = 'Your picture — Pixels';
      document.querySelector('.pixels-maker-top').hidden = true;
      check.hidden = true;
      const back = maker.querySelector('a[href="manage.html"]');
      back.href = 'me.html';
      back.title = 'Back to Me';
      back.setAttribute('aria-label', 'Back to Me');
      setSide(15);
      const kept = readDraft(), from = kept?.squares?.length === 225 ? kept : me.picture ? { squares: me.picture, colours: me.colours } : face(me.name);
      draft = grid(from.squares);
      colours = from.colours ? grid(from.colours) : null;
      // A picture with colours opens on them, since they are the picture.
      if (colours) setStep('colour');
      render();
      return;
    }
    if (!store) {
      say('Only the owner makes puzzles here', 'This preview has no players.');
      maker.hidden = true;
      return;
    }
    if (personal) {
      // A player's Back is Me, and what they have to spend is asked first;
      // the owner spends none.
      let got = null;
      try { got = await store.mine(); } catch { /* said below */ }
      if (!got) {
        say('There is no player here yet', 'Open Pixels from your invite link first.');
        maker.hidden = true;
        return;
      }
      if (!owner) mana = got.mana;
      const back = maker.querySelector('a[href="manage.html"]');
      back.href = home;
      back.title = 'Back to Me';
      back.setAttribute('aria-label', 'Back to Me');
    }
    const id = query.get('id');
    try {
      puzzles = await store.all();
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
        showLevels(editing.day ? 'day' : editing.level ?? 'none');
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
