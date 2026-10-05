/* ==========================================================================
   make.js — the puzzle maker
   --------------------------------------------------------------------------
   DRAW: tap a square to fill or empty it, or drag. The numbers update as the
   picture changes, and the check says whether a player can solve it by logic
   alone, and then how hard that is; squares that would need a guess are
   outlined. COLOUR: pick one of the thirty-six inks and paint any square, filled
   or not; that is the picture the puzzle finishes as. Paint colours the
   squares tapped or dragged over, Fill every square joined to the one
   tapped through its own ink, and Pick takes the tapped square's ink and
   hands back to the tool before it. A picture never coloured finishes in
   black and white. UNDO takes back the last tap, drag, fill or Clear, in
   either step, and Redo puts it back; Cmd or Ctrl with Z undoes, and with
   Shift and Z, or Y, redoes. Size starts a blank board of 5, 10
   or 15 squares a side, and a saved puzzle keeps the size it has. Category
   is where the puzzle sits on the front page, among those of its size: it
   lists the categories by name, and New category starts one after them,
   hidden from the players until the front page's switch publishes it. A
   puzzle given a day is that day's puzzle instead and sits in no category;
   a day takes one puzzle, and after one is saved the field moves on a day.
   Category name names the category chosen, for boards of this size, and is
   saved with the puzzle. A category shows nine: the Category field counts
   how many of each one's puzzles are on, and a puzzle saved into one with
   nine on is saved off, for the front page's switch to turn on. Save stays
   off until the picture is solvable and named.

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
  const inks = $('pixels-inks'), paintBox = $('pixels-paint'), tools = $('pixels-tool');
  const undoKey = $('pixels-undo'), redoKey = $('pixels-redo');
  const DRAFT = 'pixels-draft';
  // The inks as the palette lays them out, in two sets of eighteen, six to a
  // row: a colour to a column, light above dark, and the greys in the second
  // set's last two columns. Each is the character a picture stores, then its
  // name.
  const INKS = [
    ['c', 'Light red'], ['d', 'Light orange'], ['e', 'Light yellow'], ['f', 'Light green'], ['g', 'Light blue'], ['j', 'Light purple'],
    ['2', 'Red'], ['3', 'Orange'], ['4', 'Yellow'], ['5', 'Green'], ['6', 'Blue'], ['9', 'Purple'],
    ['m', 'Dark red'], ['n', 'Dark orange'], ['o', 'Dark yellow'], ['p', 'Dark green'], ['q', 'Dark blue'], ['t', 'Dark purple'],
    ['i', 'Light pink'], ['h', 'Light brown'], ['k', 'Light teal'], ['l', 'Light sky blue'], ['1', 'White'], ['y', 'Grey'],
    ['8', 'Pink'], ['7', 'Brown'], ['a', 'Teal'], ['b', 'Sky blue'], ['w', 'Pale grey'], ['z', 'Dark grey'],
    ['s', 'Dark pink'], ['r', 'Dark brown'], ['u', 'Dark teal'], ['v', 'Dark sky blue'], ['x', 'Light grey'], ['0', 'Black'],
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
  // one for a new category, numbered to stand after them. `pick` is the one
  // to choose, and one that is not there chooses the new category.
  const showLevels = pick => {
    const names = new Map(), { on, off } = held();
    puzzles.forEach(p => { if (p.width === side && !p.day) names.set(p.level, p.theme || 'More'); });
    const next = Math.max(0, ...names.keys()) + 1;
    level.replaceChildren(...[...names].sort((a, b) => a[0] - b[0])
      .map(([n, text]) => new Option(`${text} · ${on[n] || 0} of ${PER_LEVEL}${off[n] ? `, ${off[n]} off` : ''}`, n)),
    new Option('New category', next));
    level.value = names.has(pick) ? pick : next;
  };

  let solvable = false;
  const render = () => {
    const unknown = unreached(draft);
    const guesses = unknown.flat().filter(Boolean).length;
    const empty = draft.every(r => r.every(c => !c));
    // The board keeps the room for numbers a player's has, so the squares
    // never move under a finger as the numbers change.
    board(host, draft, draft, step === 'colour' ? { inks: colours, label: 'Picture' } : { unknown, label: 'Picture' });
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
    paintBox.hidden = step !== 'colour';
    chosen($('pixels-step'), $('pixels-step').querySelector(`[data-step="${step}"]`));
    render();
  };
  switcher($('pixels-step'), b => setStep(b.dataset.step));
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
  inks.replaceChildren(...[INKS.slice(0, 18), INKS.slice(18)].map(set => {
    const div = document.createElement('div');
    div.className = 'pixels-inks-set';
    div.append(...set.map(swatch));
    return div;
  }));
  const setInk = to => {
    ink = to;
    inks.querySelectorAll('.pixels-ink').forEach(b => b.setAttribute('aria-checked', parseInt(b.dataset.ink, 36) === ink));
  };
  inks.addEventListener('click', e => {
    const picked = e.target.closest('.pixels-ink');
    if (picked) setInk(parseInt(picked.dataset.ink, 36));
  });
  // The tool the colour step paints with. Pick is for one tap, and `back`
  // is the tool it hands back to.
  let tool = 'paint', back = 'paint';
  const setTool = to => {
    if (tool !== 'pick') back = tool;
    tool = to;
    tools.querySelectorAll('[data-tool]').forEach(b => b.setAttribute('aria-checked', b.dataset.tool === tool));
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

  // One square of a tap or a drag: painted in the colour step, and in the
  // draw step filled or emptied as the drag's first square was.
  const stroke = (y, x) => {
    if (step === 'colour') {
      if (colours[y][x] === ink) return;
      changing();
      colours[y][x] = ink;
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
  // Only Paint and the draw step go on under a drag; Fill and Pick are a tap.
  let dragging = false;
  const pad = drag(host, {
    free: true,
    start: (y, x) => {
      $('pixels-saved').hidden = true;
      dragging = step !== 'colour' || tool === 'paint';
      if (step === 'colour' && tool === 'pick') { setInk(colours[y][x]); setTool(back); return; }
      mark();
      if (step === 'colour' && tool === 'fill') { flood(y, x); return; }
      filling = draft[y][x] ? 0 : 1;
      stroke(y, x);
    },
    paint: (y, x) => { if (dragging) stroke(y, x); },
    zoom: () => side > 10,
  });
  switcher($('pixels-size'), b => {
    setSide(+b.dataset.size);
    pad.reset();
    showLevels(openLevel());
    showTheme();
    $('pixels-saved').hidden = true;
    clear();
    forget();
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
      level: levelOf(), day: day.value || null, colours: colours && squaresOf(colours),
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
