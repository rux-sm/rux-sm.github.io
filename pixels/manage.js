/* ==========================================================================
   manage.js — the owner's page: every puzzle, by category, and what is done
   to them
   --------------------------------------------------------------------------
   EVERY GATE ON ONE PAGE, small boards first and in the owner's order
   within a size, which is the order the players meet them in; then
   Unsorted, the puzzles in no category, which no player is sent; then
   Dailies where a day's puzzle is drawn.

   A CATEGORY'S HEADING has its place among the gates every player is sent,
   and its name, and beside them its size and how many of its puzzles are
   on, at most nine. At the far end are a switch that says Published or
   Hidden, which hides it from every player; arrows that move it up or down
   among those of its size; a key that keeps it for picked players; a pencil
   that renames it; and a bin that deletes it and leaves its puzzles in
   Unsorted.

   A TILE always shows its puzzle's picture and name, and how hard it is.
   Under it are Edit, which opens it in the maker, Play, which tries it, and
   for one in a category the switch that sends it to no player when off.
   After a category's tiles is Add puzzle, which opens the maker on a blank
   board of the category's size, with the category chosen for Save.

   TICKS. A tile is ticked by pressing it, and the box in a heading ticks
   its whole category. A bar over the categories stays in view with how many
   are ticked, and Move, Delete and Clear, which wait for a tick; it is
   there before any tile is ticked, so the first tick moves nothing. Move asks where: a category of the
   ticked puzzles' size, Unsorted, or a new category, which is named there and starts hidden. Puzzles of
   two sizes are not moved together, because a category holds one size.
   Puzzles that come into a category arrive on while it has fewer than nine
   on, and off after that. A category a move or a delete empties is deleted,
   so the places stay 1, 2, 3. Delete asks once, and every player's times on
   the puzzles go with them.

   The data calls a category a level: it is a board size and `level`, its
   number, which is its place among that size, and `theme` is its name.

   Only the owner's account sees this page: the database gives nobody else
   the tables it reads and writes.
   ========================================================================== */
(() => {
  'use strict';

  const { data, owner, order, grade, words, art, tile, portrait } = window.Pixels;
  const $ = id => document.getElementById(id);
  const host = $('pixels-levels');
  const { modal } = window.Rux;
  // A category shows nine; the others in it are switched off.
  const PER_LEVEL = 9;
  // Every puzzle there is, and the ids of the ticked ones.
  let puzzles = [];
  const ticked = new Set();

  const say = (heading, detail) => {
    const box = $('pixels-error');
    box.querySelector('.rux--inline-notification__title').textContent = heading;
    box.querySelector('.rux--inline-notification__subtitle').textContent = detail;
    box.hidden = false;
  };
  const fine = () => { $('pixels-error').hidden = true; };

  const loose = p => p.level == null;
  // The puzzles in a category or in none, which is all but the days', and
  // of those the ones in the category at `level` of one board size.
  const kept = () => puzzles.filter(p => !p.day);
  const inLevel = (width, level) => kept().filter(p => p.width === width && p.level === level);
  const called = c => c.theme || 'More';
  const count = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const side = width => `${width}×${width}`;
  // Every category, small boards first and in the owner's order within a
  // size, each with its puzzles easy to hard.
  const levels = () => {
    const found = new Map();
    order(kept()).forEach(p => {
      if (loose(p)) return;
      const at = `${p.width} ${p.level}`;
      if (!found.has(at)) found.set(at, { width: p.width, level: p.level, theme: p.theme ?? null, hidden: !!p.hidden, picked: p.picked || [], puzzles: [] });
      found.get(at).puzzles.push(p);
    });
    return [...found.values()];
  };

  /* A SWITCH. `label` names it: above it where `shown`, and otherwise for a
     screen reader only, since what is beside it says what is switched.
     `text` puts On or Off beside it. `flip` is given the new state; where
     it throws the switch is put back and the page says `failed`, or what
     the error carries as `said`. */
  const toggle = (id, label, on, flip, { shown = false, text = true, failed } = {}) => {
    const root = document.createElement('div');
    root.className = 'rux--toggle';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'rux--toggle__button';
    button.id = id;
    button.setAttribute('role', 'switch');
    button.setAttribute('aria-checked', on);
    button.setAttribute('aria-labelledby', `${id}-l`);
    const name = document.createElement('label');
    name.className = 'rux--toggle__label';
    name.htmlFor = id;
    name.id = `${id}-l`;
    const look = document.createElement('div');
    look.className = 'rux--toggle__appearance rux--toggle__appearance--sm';
    const knob = document.createElement('div');
    knob.className = `rux--toggle__switch${on ? ' rux--toggle__switch--checked' : ''}`;
    knob.innerHTML = '<svg class="rux--toggle__check" width="6" height="5" viewBox="0 0 6 5" aria-hidden="true"><path d="M2.2 2.7L5 0 6 1 2.2 5 0 2.7 1 1.5z"/></svg>';
    look.append(knob);
    if (text) {
      const state = words('rux--toggle__text', on ? 'On' : 'Off');
      state.setAttribute('aria-hidden', 'true');
      look.append(state);
    }
    name.append(words(`rux--toggle__label-text${shown ? '' : ' rux--visually-hidden'}`, label), look);
    root.append(button, name);
    let undoing = false;
    root.addEventListener('rux:toggle', async e => {
      if (undoing) return;
      try {
        await flip(e.detail.on);
        fine();
      } catch (error) {
        undoing = true;
        window.Rux.formControls.toggle(root, !e.detail.on);
        undoing = false;
        say(...(error?.said || failed));
      }
    });
    return root;
  };

  // One of a heading's buttons: an arrow, the pencil or the bin. `press` is
  // missing where the category is already first or last. `icon` is written
  // whole where it is passed, hash and all, which is how the sprite knows
  // the page names it.
  const key = (id, label, icon, press) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'rux--btn rux--btn--ghost rux--btn--icon-only rux--btn--sm';
    b.id = id;
    b.setAttribute('aria-label', label);
    b.title = label;
    b.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><use href="${icon}"/></svg>`;
    b.disabled = !press;
    if (press) b.addEventListener('click', () => press(b));
    return b;
  };

  // A heading's box, which ticks every tile under it, or none.
  const tickAll = (id, label) => {
    const wrap = document.createElement('div');
    wrap.className = 'rux--checkbox-wrapper';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.className = 'rux--checkbox';
    box.id = id;
    const name = document.createElement('label');
    name.className = 'rux--checkbox-label';
    name.htmlFor = id;
    name.append(words('rux--checkbox-label-text rux--visually-hidden', label));
    wrap.append(box, name);
    // The box's state is read once: each tile ticked redraws the box.
    box.addEventListener('change', () => {
      const on = box.checked;
      wrap.closest('section').querySelectorAll('.rux--tile--selectable').forEach(t => window.Rux.tile.select(t, on));
    });
    return wrap;
  };
  // Each heading's box is ticked while all its tiles are, and half while some.
  const showBoxes = () => host.querySelectorAll('section').forEach(s => {
    const box = s.querySelector('.rux--checkbox');
    if (!box) return;
    const all = [...s.querySelectorAll('.rux--tile--selectable')], on = all.filter(t => ticked.has(t.dataset.id)).length;
    box.checked = !!on && on === all.length;
    box.indeterminate = !!on && on < all.length;
  });
  // The ticked puzzles, and the bar that acts on them.
  const chosen = () => kept().filter(p => ticked.has(String(p.id)));
  const showTicked = () => {
    $('pixels-ticked').hidden = false;
    $('pixels-ticked-count').textContent = ticked.size ? `${ticked.size} ticked` : 'Tick puzzles to move or delete them';
    $('pixels-ticked').querySelectorAll('button').forEach(b => { b.disabled = !ticked.size; });
    showBoxes();
  };
  host.addEventListener('rux:tile-selected', e => {
    if (e.detail.on) ticked.add(e.target.dataset.id); else ticked.delete(e.target.dataset.id);
    showTicked();
  });

  /* A PUZZLE'S TILE, which pressing ticks, and under it Edit, Play and its
     switch. `flip` is given the switch's new state, and is missing for a
     puzzle in no category, which has no switch and says its size, since no
     heading does. */
  const puzzleTile = (p, flip) => {
    const wrap = document.createElement('div');
    wrap.className = `pixels-tile${p.off && !loose(p) ? ' is-off' : ''}`;
    const on = ticked.has(String(p.id));
    const t = document.createElement('div');
    t.className = `rux--tile rux--tile--selectable pixels-puzzle${on ? ' rux--tile--is-selected' : ''}`;
    t.setAttribute('role', 'checkbox');
    t.setAttribute('aria-checked', on);
    t.setAttribute('aria-label', `${p.name}, ${grade(p.rounds)}`);
    t.tabIndex = 0;
    t.dataset.id = p.id;
    const mark = document.createElement('span');
    mark.className = 'rux--tile__checkmark rux--tile__checkmark--persistent';
    mark.innerHTML = '<svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><use href="#i-checkmark--filled"/></svg>';
    t.append(mark, art(p, true), words('pixels-puzzle-name', p.name), words('pixels-meta', flip ? grade(p.rounds) : `${side(p.width)} · ${grade(p.rounds)}`));
    const foot = document.createElement('div');
    foot.className = 'pixels-tile-foot';
    const link = (text, href, label) => {
      const a = document.createElement('a');
      a.className = 'rux--link pixels-tile-edit';
      a.href = `${href}?id=${encodeURIComponent(p.id)}`;
      a.textContent = text;
      a.setAttribute('aria-label', `${label} ${p.name}`);
      return a;
    };
    foot.append(link('Edit', 'make.html', 'Edit'), link('Play', 'play.html', 'Play'));
    if (flip) foot.append(toggle(`pixels-on-${p.id}`, `Show ${p.name} to players`, !p.off, flip, { text: false, failed: ['The puzzle did not change', 'Try again.'] }));
    wrap.append(t, foot);
    return wrap;
  };

  // The way to draw another puzzle for a category: a tile after its own,
  // which opens the maker on a blank board of its size with it chosen.
  const addTile = c => {
    const wrap = document.createElement('div');
    wrap.className = 'pixels-tile';
    const a = document.createElement('a');
    a.className = 'rux--link rux--tile rux--tile--clickable pixels-puzzle';
    a.href = `make.html?size=${c.width}&gate=${c.level}`;
    a.setAttribute('aria-label', `Add a puzzle to ${called(c)}`);
    const plus = words('pixels-blank', '+');
    plus.setAttribute('aria-hidden', 'true');
    a.append(plus, words('pixels-puzzle-name', 'Add puzzle'), words('pixels-meta', side(c.width)));
    wrap.append(a);
    return wrap;
  };

  // A section: its heading's parts, and its tiles under them.
  const section = (id, name, parts, tiles) => {
    const el = document.createElement('section');
    el.className = 'rux--stack-vertical rux--stack-scale-4';
    el.setAttribute('aria-labelledby', id);
    const head = document.createElement('div');
    head.className = 'pixels-level-head pixels-level-head--desk';
    const h2 = document.createElement('h2');
    h2.className = 'rux--type-productive-heading-03';
    h2.id = id;
    h2.textContent = name;
    head.append(...parts(h2));
    const list = document.createElement('div');
    list.className = 'pixels-list';
    list.append(...tiles);
    el.append(head, list);
    return el;
  };

  /* THE PAGE, drawn again after every change. `focus` is the ids of what to
     put the focus on, the first that is there and can take it. */
  let moving = false;
  function draw(focus = []) {
    host.replaceChildren();
    const cats = levels(), strays = order(kept().filter(loose));
    const dated = puzzles.filter(p => p.day).sort((a, b) => a.day.localeCompare(b.day));
    if (!cats.length && !strays.length && !dated.length) {
      const wrap = document.createElement('div');
      wrap.className = 'rux--stack-vertical rux--stack-scale-5';
      const make = document.createElement('a');
      make.className = 'rux--btn rux--btn--primary';
      make.href = 'make.html';
      make.textContent = 'Make one';
      wrap.append(words('rux--type-productive-heading-03', 'No puzzles yet'), make);
      host.append(wrap);
    }
    // A gate every player is sent has a place among those; one kept for
    // picked players has none.
    let nth = 0;
    cats.forEach(c => {
      const id = `pixels-level-${c.width}-${c.level}`, name = called(c);
      const on = c.puzzles.filter(p => !p.off).length, off = c.puzzles.length - on;
      /* A move swaps the category with the one before or after it of its
         size: the database is given every level of the size in the new
         order and numbers them by it, and the puzzles held here are
         numbered the same. */
      const same = cats.filter(x => x.width === c.width), at = same.indexOf(c);
      const shift = by => async () => {
        if (moving) return;
        const to = same.map(x => x.level);
        [to[at], to[at + by]] = [to[at + by], to[at]];
        moving = true;
        try {
          await data.orderLevels(c.width, to);
          kept().forEach(p => { if (p.width === c.width && !loose(p)) p.level = to.indexOf(p.level) + 1; });
          fine();
          moving = false;
          // The arrow pressed, or the other where the category has reached the end.
          const now = `pixels-level-${c.width}-${at + by + 1}`;
          draw(by < 0 ? [`${now}-up`, `${now}-down`] : [`${now}-down`, `${now}-up`]);
        } catch {
          moving = false;
          say('The gate did not move', 'Try again.');
        }
      };
      host.append(section(id, c.picked.length ? name : `${++nth} · ${name}`, h2 => [
        tickAll(`${id}-all`, `Tick all of ${name}`), h2,
        words('pixels-meta', `${side(c.width)} · ${on} of ${PER_LEVEL} on${off ? `, ${off} off` : ''}${c.picked.length ? ` · for ${count(c.picked.length, 'player')}` : ''}`),
        // The switch, the word for what it has done, and the keys, which
        // stay together where the heading wraps.
        (() => {
          const shown = document.createElement('div');
          shown.className = 'pixels-shown';
          const word = words('pixels-meta', c.hidden ? 'Hidden' : 'Published');
          word.setAttribute('aria-hidden', 'true');
          const keys = document.createElement('div');
          keys.className = 'pixels-moves';
          keys.append(key(`${id}-up`, `Move ${name} up`, '#m-arrow_upward', at > 0 && shift(-1)),
            key(`${id}-down`, `Move ${name} down`, '#m-arrow_downward', at < same.length - 1 && shift(1)),
            ...(data.share ? [key(`${id}-share`, `Who sees ${name}`, '#m-groups', from => sharing(c, from))] : []),
            key(`${id}-rename`, `Rename ${name}`, '#m-edit', from => naming(c, from)),
            key(`${id}-remove`, `Delete ${name}`, '#m-delete', from => removing(c, from)));
          shown.append(toggle(`${id}-shown`, 'Published', !c.hidden, async to => {
            await data.setHidden(c.width, c.level, !to);
            c.puzzles.forEach(p => { p.hidden = !to; });
            word.textContent = to ? 'Published' : 'Hidden';
          }, { text: false, failed: ['The gate did not change', 'Try again.'] }), word, keys);
          return shown;
        })(),
      ], [...c.puzzles.map(p => puzzleTile(p, flip(p, name))), addTile(c)]));
    });
    // Unsorted has no switch, place or name of its own.
    if (strays.length) {
      host.append(section('pixels-unsorted', 'Unsorted', h2 => [tickAll('pixels-unsorted-all', 'Tick all of Unsorted'), h2, words('pixels-meta', count(strays.length, 'puzzle'))],
        strays.map(p => puzzleTile(p))));
    }
    // A day's puzzle opens in the maker, and is not ticked.
    if (dated.length) {
      host.append(section('pixels-days', 'Dailies', h2 => [h2, words('pixels-meta', `${dated.length} drawn`)], dated.map(p => {
        const when = new Date(`${p.day}T12:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
        const a = tile(p, when, `make.html?id=${encodeURIComponent(p.id)}`, { seconds: 0 });
        a.lastElementChild.replaceWith(words('pixels-meta', p.name));
        return a;
      })));
    }
    showTicked();
    focus.map($).find(el => el && !el.disabled)?.focus();
  }

  /* A PUZZLE'S SWITCH. Off, no player is sent it. A category shows nine, so
     a tenth is refused until one is switched off. The page is drawn again,
     since the count in the heading changes. */
  const flip = (p, name) => async on => {
    if (on && inLevel(p.width, p.level).filter(q => !q.off).length >= PER_LEVEL) {
      throw Object.assign(new Error('full'), { said: [`${name} has nine on`, 'Switch one off first.'] });
    }
    await data.setOff(p.id, !on);
    p.off = !on;
    draw([`pixels-on-${p.id}`]);
  };

  // The puzzles as the database has them, after a change that stopped part
  // way, so the page shows what is true.
  const again = async () => {
    try { puzzles = await data.all(); } catch { /* the page keeps what it had */ }
    ticked.clear();
    draw();
  };
  // Deletes each category of `left`, a size and a level each, that has no
  // puzzle any more, the last first, so one deleted does not renumber one
  // still to go.
  const tidy = async left => {
    const seen = new Map(left.filter(l => l.level != null).map(l => [`${l.width} ${l.level}`, l]));
    for (const { width, level } of [...seen.values()].sort((a, b) => b.level - a.level)) {
      if (inLevel(width, level).length) continue;
      await data.removeLevel(width, level);
      kept().forEach(p => { if (p.width === width && !loose(p) && p.level > level) p.level--; });
    }
  };
  const place = p => ({ width: p.width, level: p.level });

  /* MOVE. The window lists where the ticked puzzles can go: each category
     of their size, but the one that holds them all already, with how many
     it has on; Unsorted, unless they are all there; and a new category,
     which shows a field for its name. Ticked puzzles of two sizes are
     refused, since no category could take them all. */
  const NEW = 'new', NONE = 'none';
  const where = $('pixels-move-to');
  const showMore = () => { $('pixels-move-more').hidden = where.value !== NEW; };
  where.addEventListener('change', showMore);
  $('pixels-ticked-move').addEventListener('click', e => {
    const these = chosen();
    if (!these.length) return;
    const width = these[0].width;
    if (these.some(p => p.width !== width)) { say('A gate holds one size', 'Tick puzzles of one size to move them.'); return; }
    fine();
    const to = levels().filter(c => c.width === width && these.some(p => p.level !== c.level))
      .map(c => new Option(`${called(c)} · ${c.puzzles.filter(p => !p.off).length} of ${PER_LEVEL}`, c.level));
    if (!these.every(loose)) to.push(new Option('Unsorted', NONE));
    to.push(new Option('New gate…', NEW));
    where.replaceChildren(...to);
    $('pixels-move-name').value = '';
    $('pixels-move-heading').textContent = `Move ${these.length === 1 ? these[0].name : count(these.length, 'puzzle')}`;
    showMore();
    modal.open('pixels-move-modal', e.currentTarget);
  });
  $('pixels-move').addEventListener('submit', async e => {
    e.preventDefault();
    const to = where.value, fresh = to === NEW, name = $('pixels-move-name').value.trim();
    const width = chosen()[0]?.width;
    // A new category stands after the others of its size.
    const level = to === NONE ? null : fresh ? Math.max(0, ...levels().filter(c => c.width === width).map(c => c.level)) + 1 : +to;
    const movers = order(chosen()).filter(p => (p.level ?? null) !== level);
    modal.close('pixels-move-modal');
    if (!movers.length) return;
    if (level > 99) { say('There is no room for another gate', 'Delete one first.'); return; }
    // They arrive on while the category has fewer than nine on, and off after.
    let room = level == null ? Infinity : PER_LEVEL - inLevel(width, level).filter(p => !p.off).length;
    const on = [], off = [];
    movers.forEach(p => { if (level == null || room-- > 0) on.push(p); else off.push(p); });
    const there = fresh ? { theme: name || null, hidden: true } : inLevel(width, level)[0];
    try {
      // A category just started is hidden, for the Published switch to show.
      if (fresh) {
        await data.setHidden(width, level, true);
        await data.setTheme(width, level, name);
      }
      if (on.length) await data.move(on.map(p => p.id), level, false);
      if (off.length) await data.move(off.map(p => p.id), level, true);
      const left = movers.map(place);
      movers.forEach(p => Object.assign(p, { level, off: off.includes(p), theme: level == null ? null : there?.theme ?? null, hidden: level != null && !!there?.hidden }));
      await tidy(left);
      ticked.clear();
      fine();
      draw();
    } catch {
      say('The puzzles did not all move', 'The page shows where they are.');
      again();
    }
  });

  /* DELETE. One window asks for all the ticked puzzles. */
  $('pixels-ticked-delete').addEventListener('click', e => {
    const these = chosen();
    if (!these.length) return;
    const one = these.length === 1;
    $('pixels-delete-heading').textContent = `Delete ${one ? these[0].name : count(these.length, 'puzzle')}?`;
    $('pixels-delete-text').textContent = `${one ? 'It goes' : 'They go'} for good, and every player's best times on ${one ? 'it' : 'them'} go too.`;
    modal.open('pixels-delete-modal', e.currentTarget);
  });
  $('pixels-delete-confirm').addEventListener('click', async () => {
    const these = chosen();
    if (!these.length) return;
    try {
      await data.remove(these.map(p => p.id));
      puzzles = puzzles.filter(p => !these.includes(p));
      await tidy(these.map(place));
      ticked.clear();
      fine();
      draw();
    } catch {
      say('The puzzles were not all deleted', 'The page shows what is left.');
      again();
    }
  });
  $('pixels-ticked-clear').addEventListener('click', () => { ticked.clear(); draw(); });

  /* A CATEGORY'S TWO WINDOWS: its new name, and deleting it. Each is opened
     for one category, kept in `asked`. */
  let asked = null;
  function naming(c, from) {
    asked = c;
    $('pixels-rename-name').value = c.theme || '';
    modal.open('pixels-rename-modal', from);
  }
  $('pixels-rename').addEventListener('submit', async e => {
    e.preventDefault();
    const c = asked, name = $('pixels-rename-name').value.trim();
    modal.close('pixels-rename-modal');
    try {
      await data.setTheme(c.width, c.level, name);
      c.puzzles.forEach(p => { p.theme = name || null; });
      fine();
      draw([`pixels-level-${c.width}-${c.level}-rename`]);
    } catch {
      say('The gate was not renamed', 'Try again.');
    }
  });
  /* WHO SEES A GATE. The modal lists every player with a box; the ticked are
     the players the gate is kept for, and none ticked gives it to everyone. */
  let everyone = null;
  async function sharing(c, from) {
    asked = c;
    try {
      everyone ||= (await data.players()).players;
    } catch {
      say('The players did not load', 'Try again.');
      return;
    }
    $('pixels-share-heading').textContent = `Who sees ${called(c)}?`;
    $('pixels-share-list').replaceChildren(...everyone.map(p => {
      const wrap = document.createElement('div');
      wrap.className = 'rux--checkbox-wrapper';
      const box = document.createElement('input');
      Object.assign(box, { type: 'checkbox', className: 'rux--checkbox', id: `pixels-share-${p.id}`, value: p.id, checked: c.picked.includes(p.id) });
      const label = document.createElement('label');
      label.className = 'rux--checkbox-label';
      label.htmlFor = box.id;
      const who = words('rux--checkbox-label-text pixels-share-who', '');
      who.append(portrait({ name: p.name, picture: p.picture, colours: p.picture_colours }), p.name);
      label.append(who);
      wrap.append(box, label);
      return wrap;
    }));
    modal.open('pixels-share-modal', from);
  }
  $('pixels-share').addEventListener('submit', async e => {
    e.preventDefault();
    const c = asked, ids = [...$('pixels-share-list').querySelectorAll('input:checked')].map(b => b.value);
    modal.close('pixels-share-modal');
    try {
      await data.share(c.width, c.level, ids);
      c.puzzles.forEach(p => { p.picked = ids; });
      fine();
      draw([`pixels-level-${c.width}-${c.level}-share`]);
    } catch {
      say('The gate did not change', 'Try again.');
    }
  });
  function removing(c, from) {
    asked = c;
    const n = c.puzzles.length;
    $('pixels-remove-heading').textContent = `Delete ${called(c)}?`;
    $('pixels-remove-text').textContent = `Its ${n === 1 ? 'puzzle moves' : `${n} puzzles move`} to Unsorted, and no player is sent ${n === 1 ? 'it' : 'them'}.`;
    modal.open('pixels-remove-modal', from);
  }
  $('pixels-remove-confirm').addEventListener('click', async () => {
    const c = asked;
    try {
      await data.removeLevel(c.width, c.level);
      kept().forEach(p => {
        if (p.width !== c.width || loose(p)) return;
        if (p.level === c.level) Object.assign(p, { level: null, theme: null, hidden: false });
        else if (p.level > c.level) p.level--;
      });
      fine();
      draw();
    } catch {
      say('The gate was not deleted', 'The page shows what is left.');
      again();
    }
  });

  (async () => {
    if (!data) { say('Pixels could not connect', 'Reload the page to try again.'); return; }
    if (!owner || !data.all) { say('Only the owner manages puzzles', 'This account can play them.'); return; }
    try {
      puzzles = await data.all();
    } catch {
      say('The puzzles did not load', 'Reload the page to try again.');
      return;
    }
    draw();
  })();
})();
