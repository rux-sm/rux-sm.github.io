/* ==========================================================================
   game.js — Create's Game view, the owner's: the base game every player is
   sent, by rift, and what is done to it
   --------------------------------------------------------------------------
   A BLOCK TO EACH RIFT, in the owner's order, which is the order the
   players meet them in; then Unsorted, the puzzles in no rift, which no
   player is sent; then Dailies where a day's puzzle is drawn. Each part of
   a block does one thing: a picture edits its puzzle, the add tile draws
   another for the rift, the switch publishes the rift, the menu holds Who
   sees, Rename and Delete, and the rift's name opens its panel under it, or
   closes it. Outside selection, one panel at most is open, kept in `?rift=`,
   so a reload or the Pixelator's Exit comes back to it.

   THE PANEL replaces the previews with tiles and arrows to reorder the
   rift. Each tile edits its puzzle, with Edit, Play and the puzzle's
   publishing switch underneath, followed by Add puzzle.

   TICKS. Select puzzles opens all rifts with selectable tiles and a box
   that selects the whole rift. Puzzles from several rifts can move
   together. Done selecting clears the ticks. A sticky bar counts them
   and offers Move, Delete and Clear, which wait for a tick. Move
   asks where: a rift, Unsorted, or a new rift, which is named there and
   starts hidden. Puzzles that come into a rift arrive on while it has
   fewer than fifteen on, and off after that. A rift a move or a delete
   empties is deleted, so the places stay 1, 2, 3. Delete asks once, and
   every player's times on the puzzles go with them.

   The data calls a rift a level: `level` is its number, which is its place,
   and `theme` is its name. It holds boards of any size, and the database's
   functions still take a size, which they do not read. create.js shows this
   view and calls `window.Pixels.game` to draw it.

   Only the owner's account sees it: the database gives nobody else the
   tables it reads and writes.
   ========================================================================== */
(() => {
  'use strict';

  const { data, owner, order, grade, words, art, tile, portrait, menu, riftBlock } = window.Pixels;
  const $ = id => document.getElementById(id);
  const host = $('pixels-levels');
  const { modal } = window.Rux;
  // A category shows fifteen; the others in it are switched off.
  const PER_LEVEL = 15;
  // Every puzzle there is, and the ids of the ticked ones.
  let puzzles = [];
  const ticked = new Set();
  let selecting = false;

  const say = (heading, detail) => {
    const box = $('pixels-error');
    box.querySelector('.rux--inline-notification__title').textContent = heading;
    box.querySelector('.rux--inline-notification__subtitle').textContent = detail;
    box.hidden = false;
  };
  const fine = () => { $('pixels-error').hidden = true; };

  const loose = p => p.level == null;
  // The puzzles in a category or in none, which is all but the days', and
  // of those the ones in the category at `level`.
  const kept = () => puzzles.filter(p => !p.day);
  const inLevel = level => kept().filter(p => p.level === level);
  const called = c => c.theme || 'More';
  const count = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const side = width => `${width}×${width}`;
  // The sizes of a category's boards as they are written, small first, and
  // the largest of them, which is the size its next puzzle most likely is.
  const sizes = c => [...new Set(c.puzzles.map(p => p.width))].sort((a, b) => a - b);
  // Every category, in the owner's order, each with its puzzles small
  // boards first and then easy to hard.
  const levels = () => {
    const found = new Map();
    order(kept()).forEach(p => {
      if (loose(p)) return;
      if (!found.has(p.level)) found.set(p.level, { level: p.level, theme: p.theme ?? null, hidden: !!p.hidden, picked: p.picked || [], puzzles: [] });
      found.get(p.level).puzzles.push(p);
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
    look.className = 'rux--toggle__appearance';
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
    $('pixels-ticked').hidden = !selecting;
    $('pixels-select').textContent = selecting ? 'Done selecting' : 'Select puzzles';
    $('pixels-select').setAttribute('aria-pressed', selecting);
    $('pixels-ticked-count').textContent = ticked.size ? `${ticked.size} selected` : 'Select puzzles to move or delete them';
    $('pixels-ticked').querySelectorAll('button').forEach(b => { b.disabled = !ticked.size; });
    showBoxes();
  };
  host.addEventListener('rux:tile-selected', e => {
    if (e.detail.on) ticked.add(e.target.dataset.id); else ticked.delete(e.target.dataset.id);
    showTicked();
  });

  /* A PUZZLE'S TILE opens the maker or selects in selection mode. It shows
     size and difficulty, with Edit, Play and its switch outside selection. `flip` is given the
     switch's new state, and is missing for a puzzle in no category, which
     has no switch. */
  const puzzleTile = (p, flip) => {
    const wrap = document.createElement('div');
    wrap.className = `pixels-tile${p.off && !loose(p) ? ' is-off' : ''}`;
    const on = ticked.has(String(p.id));
    const t = document.createElement(selecting ? 'div' : 'a');
    t.className = `rux--tile ${selecting ? 'rux--tile--selectable' : 'rux--tile--clickable rux--link'} pixels-puzzle${on ? ' rux--tile--is-selected' : ''}`;
    t.dataset.id = p.id;
    if (selecting) {
      t.setAttribute('role', 'checkbox');
      t.setAttribute('aria-checked', on);
      t.setAttribute('aria-label', `${p.name}, ${grade(p.rounds)}`);
      t.tabIndex = 0;
      const mark = document.createElement('span');
      mark.className = 'rux--tile__checkmark rux--tile__checkmark--persistent';
      mark.innerHTML = '<svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><use href="#i-checkmark--filled"/></svg>';
      t.append(mark);
    } else {
      t.href = `make.html?id=${encodeURIComponent(p.id)}`;
      t.setAttribute('aria-label', `Edit ${p.name}`);
    }
    t.append(art(p, true), words('pixels-puzzle-name', p.name), words('pixels-meta', `${side(p.width)} · ${grade(p.rounds)}`));
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
    wrap.append(t);
    if (!selecting) wrap.append(foot);
    return wrap;
  };

  // The way to draw another puzzle for a category: a tile after its own,
  // which opens the maker with it chosen, on a blank board of the largest
  // size it holds.
  const addTile = c => {
    const wrap = document.createElement('div');
    wrap.className = 'pixels-tile';
    const a = document.createElement('a');
    a.className = 'rux--link rux--tile rux--tile--clickable pixels-puzzle';
    const size = Math.max(...sizes(c));
    a.href = `make.html?size=${size}&gate=${c.level}`;
    a.setAttribute('aria-label', `Add a puzzle to ${called(c)}`);
    const plus = words('pixels-blank', '+');
    plus.setAttribute('aria-hidden', 'true');
    a.append(plus, words('pixels-puzzle-name', 'Add puzzle'), words('pixels-meta', side(size)));
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
    h2.className = 'rux--visually-hidden';
    h2.id = id;
    h2.textContent = name;
    head.append(...parts(h2));
    const list = document.createElement('div');
    list.className = 'pixels-list pixels-list--desk';
    list.append(...tiles);
    el.append(head, list);
    return el;
  };

  /* Each rift's expanded grid replaces its previews in the same block.
     Outside selection, ?rift= keeps the one open place across reloads.
     Selection opens every selectable place. `focus` names the first
     available control to restore after drawing. */
  let moving = false;
  let open = new URLSearchParams(location.search).get('rift');
  const choose = (to, focus = []) => {
    open = to == null ? null : String(to);
    const at = new URL(location.href);
    if (open == null) at.searchParams.delete('rift'); else at.searchParams.set('rift', open);
    history.replaceState(null, '', at);
    draw(focus);
    if (open != null) $(`pixels-place-${open}`)?.closest('.pixels-block').scrollIntoView({ block: 'start' });
  };
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
      showTicked();
      return;
    }
    // Every place, as [key, name, what it says, its pictures, its switch,
    // and how its open view is made].
    const places = [];
    // A rift every player is sent has a place among those; one kept for
    // picked players has none.
    let nth = 0;
    cats.forEach(c => {
      const id = `pixels-level-${c.level}`, name = called(c), width = sizes(c)[0];
      const on = c.puzzles.filter(p => !p.off).length, off = c.puzzles.length - on;
      const title = c.picked.length ? name : `${++nth} · ${name}`;
      const meta = `${sizes(c).map(side).join(', ')} · ${on} of ${PER_LEVEL} on${off ? `, ${off} off` : ''}${c.picked.length ? ` · for ${count(c.picked.length, 'player')}` : ''}`;
      /* A move swaps the category with the one before or after it: the
         database is given every level in the new order and numbers them by
         it, and the puzzles held here are numbered the same. The rift moved
         stays open. */
      const at = cats.indexOf(c);
      const shift = by => async () => {
        if (moving) return;
        const to = cats.map(x => x.level);
        [to[at], to[at + by]] = [to[at + by], to[at]];
        moving = true;
        try {
          await data.orderLevels(width, to);
          kept().forEach(p => { if (!loose(p)) p.level = to.indexOf(p.level) + 1; });
          fine();
          moving = false;
          // The arrow pressed, or the other where the category has reached the end.
          const now = `pixels-level-${at + by + 1}`;
          choose(at + by + 1, by < 0 ? [`${now}-up`, `${now}-down`] : [`${now}-down`, `${now}-up`]);
        } catch {
          moving = false;
          say('The rift did not move', 'Try again.');
        }
      };
      // The Published switch, which a screen reader names.
      const shown = document.createElement('div');
      shown.className = 'pixels-shown';
      shown.append(toggle(`${id}-shown`, `${name} published`, !c.hidden, async to => {
        await data.setHidden(width, c.level, !to);
        c.puzzles.forEach(p => { p.hidden = !to; });
      }, { text: false, failed: ['The rift did not change', 'Try again.'] }));
      places.push([String(c.level), title, meta, c.puzzles, null, () => {
        const keys = document.createElement('div');
        keys.className = 'pixels-moves';
        keys.append(key(`${id}-up`, `Move ${name} up`, '#m-arrow_upward', at > 0 && shift(-1)),
          key(`${id}-down`, `Move ${name} down`, '#m-arrow_downward', at < cats.length - 1 && shift(1)));
        return section(id, title, h2 => [...(selecting ? [tickAll(`${id}-all`, `Select all of ${name}`)] : []), h2, ...(selecting ? [] : [keys])],
          [...c.puzzles.map(p => puzzleTile(p, flip(p, name))), ...(selecting ? [] : [addTile(c)])]);
      }, [shown, menu(`More for ${name}`, [
        data.share ? ['Who sees it', from => sharing(c, from)] : null,
        ['Rename', from => naming(c, from)],
        ['Delete', from => removing(c, from), true],
      ])], `make.html?size=${Math.max(...sizes(c))}&gate=${c.level}`]);
    });
    // Unsorted has no switch, place or name of its own.
    if (strays.length) {
      places.push(['unsorted', 'Unsorted', count(strays.length, 'puzzle'), strays, null,
        () => section('pixels-unsorted', 'Unsorted', h2 => [...(selecting ? [tickAll('pixels-unsorted-all', 'Select all of Unsorted')] : []), h2],
          strays.map(p => puzzleTile(p)))]);
    }
    // A day's puzzle opens in the maker, and is not ticked.
    if (dated.length) {
      places.push(['days', 'Dailies', `${dated.length} drawn`, dated, null,
        () => section('pixels-days', 'Dailies', h2 => [h2], dated.map(p => {
          const when = new Date(`${p.day}T12:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
          const a = tile(p, when, `make.html?id=${encodeURIComponent(p.id)}`, { seconds: 0 });
          a.lastElementChild.replaceWith(words('pixels-meta', p.name));
          return a;
        }))]);
    }
    if (!places.some(([k]) => k === open)) open = null;
    places.forEach(([k, title, meta, list, , build, controls = [], add]) => {
      const expanded = selecting && k !== 'days' || k === open;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pixels-place-open pixels-place-name';
      b.id = `pixels-place-${k}`;
      b.textContent = title;
      b.setAttribute('aria-label', title);
      b.setAttribute('aria-expanded', expanded);
      b.disabled = selecting && k !== 'days';
      if (expanded) b.setAttribute('aria-controls', `pixels-open-${k}`);
      b.addEventListener('click', () => choose(k === open ? null : k, [b.id]));
      const row = riftBlock({ name: b, meta, controls: selecting ? [] : controls, puzzles: list.slice(0, PER_LEVEL), href: p => `make.html?id=${encodeURIComponent(p.id)}`, add: selecting ? null : add, addLabel: `Add a puzzle to ${title}` });
      if (expanded) {
        if (k === open) row.setAttribute('aria-current', 'true');
        row.querySelector('.pixels-block-pics').remove();
        const panel = document.createElement('div');
        panel.className = 'pixels-open';
        panel.id = `pixels-open-${k}`;
        panel.append(build());
        row.append(panel);
      }
      host.append(row);
    });
    showTicked();
    focus.map($).find(el => el && !el.disabled)?.focus();
  }

  $('pixels-select').addEventListener('click', () => {
    selecting = !selecting;
    ticked.clear();
    draw(['pixels-select']);
  });

  /* A PUZZLE'S SWITCH. Off, no player is sent it. A category shows fifteen,
     so a sixteenth is refused until one is switched off. The page is drawn again,
     since the count in the heading changes. */
  const flip = (p, name) => async on => {
    if (on && inLevel(p.level).filter(q => !q.off).length >= PER_LEVEL) {
      throw Object.assign(new Error('full'), { said: [`${name} has fifteen on`, 'Switch one off first.'] });
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
  // Deletes each category of `left`, its levels, that has no puzzle any
  // more, the last first, so one deleted does not renumber one still to go.
  const tidy = async left => {
    for (const level of [...new Set(left)].filter(l => l != null).sort((a, b) => b - a)) {
      if (inLevel(level).length) continue;
      await data.removeLevel(0, level);
      kept().forEach(p => { if (!loose(p) && p.level > level) p.level--; });
    }
  };

  /* MOVE. The window lists where the ticked puzzles can go: each category
     but the one that holds them all already, with how many it has on;
     Unsorted, unless they are all there; and a new category, which shows a
     field for its name. */
  const NEW = 'new', NONE = 'none';
  const where = $('pixels-move-to');
  const showMore = () => { $('pixels-move-more').hidden = where.value !== NEW; };
  where.addEventListener('change', showMore);
  $('pixels-ticked-move').addEventListener('click', e => {
    const these = chosen();
    if (!these.length) return;
    const to = levels().filter(c => these.some(p => p.level !== c.level))
      .map(c => new Option(`${called(c)} · ${c.puzzles.filter(p => !p.off).length} of ${PER_LEVEL}`, c.level));
    if (!these.every(loose)) to.push(new Option('Unsorted', NONE));
    to.push(new Option('New rift…', NEW));
    where.replaceChildren(...to);
    $('pixels-move-name').value = '';
    $('pixels-move-heading').textContent = `Move ${these.length === 1 ? these[0].name : count(these.length, 'puzzle')}`;
    showMore();
    modal.open('pixels-move-modal', e.currentTarget);
  });
  $('pixels-move').addEventListener('submit', async e => {
    e.preventDefault();
    const to = where.value, fresh = to === NEW, name = $('pixels-move-name').value.trim();
    // A new category stands after the others.
    const level = to === NONE ? null : fresh ? Math.max(0, ...levels().map(c => c.level)) + 1 : +to;
    const movers = order(chosen()).filter(p => (p.level ?? null) !== level);
    modal.close('pixels-move-modal');
    if (!movers.length) return;
    if (level > 99) { say('There is no room for another rift', 'Delete one first.'); return; }
    // They arrive on while the category has fewer than fifteen on, and off after.
    let room = level == null ? Infinity : PER_LEVEL - inLevel(level).filter(p => !p.off).length;
    const on = [], off = [];
    movers.forEach(p => { if (level == null || room-- > 0) on.push(p); else off.push(p); });
    const there = fresh ? { theme: name || null, hidden: true } : inLevel(level)[0];
    try {
      // A category just started is hidden, for the Published switch to show.
      if (fresh) {
        await data.setHidden(0, level, true);
        await data.setTheme(0, level, name);
      }
      if (on.length) await data.move(on.map(p => p.id), level, false);
      if (off.length) await data.move(off.map(p => p.id), level, true);
      const left = movers.map(p => p.level);
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
      await tidy(these.map(p => p.level));
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
      await data.setTheme(0, c.level, name);
      c.puzzles.forEach(p => { p.theme = name || null; });
      fine();
      draw([`pixels-level-${c.level}-rename`]);
    } catch {
      say('The rift was not renamed', 'Try again.');
    }
  });
  /* WHO SEES A RIFT. The modal lists every player with a box; the ticked are
     the players the rift is kept for, and none ticked gives it to everyone. */
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
      await data.share(0, c.level, ids);
      c.puzzles.forEach(p => { p.picked = ids; });
      fine();
      draw([`pixels-level-${c.level}-share`]);
    } catch {
      say('The rift did not change', 'Try again.');
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
      await data.removeLevel(0, c.level);
      kept().forEach(p => {
        if (loose(p)) return;
        if (p.level === c.level) Object.assign(p, { level: null, theme: null, hidden: false });
        else if (p.level > c.level) p.level--;
      });
      fine();
      draw();
    } catch {
      say('The rift was not deleted', 'The page shows what is left.');
      again();
    }
  });

  // Drawn the first time the view is shown, and kept after.
  let loaded = false;
  window.Pixels.game = async () => {
    if (loaded) return;
    if (!data || !owner || !data.all) { say('Only the owner manages the game', 'This account can play it.'); return; }
    loaded = true;
    try {
      puzzles = await data.all();
    } catch {
      loaded = false;
      say('The puzzles did not load', 'Reload the page to try again.');
      return;
    }
    draw();
    // A rift kept in the address opens scrolled to.
    if (open != null) $(`pixels-place-${open}`)?.closest('.pixels-block').scrollIntoView({ block: 'start' });
  };
})();
