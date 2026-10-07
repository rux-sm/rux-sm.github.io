/* ==========================================================================
   me.js — the player's own page
   --------------------------------------------------------------------------
   The player's picture, large, beside their username, how many sprites
   they have found and their mana. Draw your picture opens the Pixelator on
   it. The username is a field: Save keeps a new one, unless another player
   has it.

   YOUR GATES are the gates the player has made, each with its name, which
   is a field that saves as it is left, its size, how many puzzles it
   holds, and whether it is published. Publish sends it to their friends
   and takes three puzzles; Delete, pressed twice, takes the gate and its
   puzzles, and their mana comes back. A puzzle's tile opens it in the
   Pixelator. Under a gate is everyone who has found a sprite in it, with
   how many and their time. The local preview has no players, so none of
   this is shown there.
   A guest with no player yet gets the name form first; data.js's `enter`
   draws it.
   ========================================================================== */
(() => {
  'use strict';

  const { data, enter, portrait, words, art, grid, rounds, grade, side, time } = window.Pixels;
  const host = document.getElementById('pixels-me');
  const say = (heading, detail) => {
    const box = document.getElementById('pixels-error');
    box.querySelector('.rux--inline-notification__title').textContent = heading;
    box.querySelector('.rux--inline-notification__subtitle').textContent = detail;
    box.hidden = false;
  };

  const draw = me => {
    const head = document.createElement('div');
    head.className = 'pixels-me-head';
    const text = document.createElement('div');
    const h1 = document.createElement('h1');
    h1.className = 'rux--type-productive-heading-04';
    h1.textContent = me.name;
    text.append(h1, words('pixels-meta', `${me.found} ${me.found === 1 ? 'sprite' : 'sprites'} found${me.mana == null ? '' : ` · ${me.mana} mana`}`));
    head.append(portrait(me, true), text);

    const drawIt = document.createElement('a');
    drawIt.className = 'rux--btn rux--btn--tertiary';
    drawIt.href = 'make.html?me';
    drawIt.textContent = 'Draw your picture';

    // The username, by the markup of Design's text input.
    const form = document.createElement('form');
    form.noValidate = true;
    form.className = 'pixels-me-name';
    const field = document.createElement('div');
    field.className = 'rux--form-item rux--text-input-wrapper';
    const labelWrap = document.createElement('div');
    labelWrap.className = 'rux--text-input__label-wrapper';
    const input = document.createElement('input');
    Object.assign(input, { id: 'pixels-me-name', className: 'rux--text-input', type: 'text', maxLength: 20, autocomplete: 'nickname', value: me.name });
    const label = document.createElement('label');
    label.className = 'rux--label';
    label.htmlFor = input.id;
    label.textContent = 'Username';
    labelWrap.append(label);
    const outer = document.createElement('div');
    outer.className = 'rux--text-input__field-outer-wrapper';
    const inner = document.createElement('div');
    inner.className = 'rux--text-input__field-wrapper';
    inner.append(input);
    outer.append(inner);
    field.append(labelWrap, outer);
    const go = document.createElement('button');
    go.type = 'submit';
    go.className = 'rux--btn rux--btn--primary rux--btn--md';
    go.textContent = 'Save';
    form.append(field, go);
    const note = words('pixels-me-note', '');
    note.setAttribute('aria-live', 'polite');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const to = input.value.trim();
      if (!to) { note.textContent = 'Type a username first.'; return; }
      if (to === me.name) { note.textContent = ''; return; }
      go.disabled = true;
      let now;
      try { now = await data.rename(to); } catch { now = { error: 'lost' }; }
      go.disabled = false;
      if (now.error) {
        note.textContent = { taken: 'That username is taken. Try another.', name: 'A username is 1 to 20 letters.' }[now.error] || 'That did not go through. Try again.';
        return;
      }
      host.replaceChildren(document.getElementById('pixels-error'));
      draw(now);
    });
    host.append(head, drawIt, form, note);
  };

  const button = (cls, text) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `rux--btn rux--btn--sm rux--layout--size-sm ${cls}`;
    b.textContent = text;
    return b;
  };
  // The player's own gates, drawn again after each change to one.
  const gates = async () => {
    document.getElementById('pixels-gates')?.remove();
    let got;
    try { got = await data.own.mine(); } catch { say('Your gates did not load', 'Reload the page to try again.'); return; }
    if (!got) return;
    const el = document.createElement('section');
    el.id = 'pixels-gates';
    el.className = 'rux--stack-vertical rux--stack-scale-5';
    const top = document.createElement('div');
    top.className = 'pixels-level-head';
    const make = document.createElement('a');
    make.className = 'rux--btn rux--btn--primary rux--btn--sm rux--layout--size-sm';
    make.href = 'make.html';
    make.textContent = 'Make a puzzle';
    top.append(words('rux--type-productive-heading-03', 'Your gates'), make);
    el.append(top);
    const found = new Map();
    got.puzzles.forEach(p => {
      const key = `${p.width} ${p.level}`;
      if (!found.has(key)) found.set(key, { width: p.width, level: p.level, theme: p.theme, hidden: p.hidden, puzzles: [] });
      found.get(key).puzzles.push(p);
    });
    if (!found.size) el.append(words('pixels-meta', 'You have made none yet. A puzzle costs 1 mana, and a gate holds nine.'));
    [...found.values()].sort((a, b) => a.width - b.width || a.level - b.level).forEach(g => {
      const box = document.createElement('div');
      box.className = 'rux--stack-vertical rux--stack-scale-3 pixels-mine';
      const head = document.createElement('div');
      head.className = 'pixels-level-head';
      const name = document.createElement('input');
      Object.assign(name, { className: 'rux--text-input rux--layout--size-sm pixels-player-name', type: 'text', maxLength: 30, value: g.theme || '', placeholder: 'Name this gate' });
      name.setAttribute('aria-label', `Name of ${g.theme || 'this gate'}`);
      name.addEventListener('change', async () => {
        try { await data.own.setTheme(g.width, g.level, name.value.trim()); document.getElementById('pixels-error').hidden = true; } catch { say('The gate was not renamed', 'Try again.'); }
      });
      name.addEventListener('keydown', e => { if (e.key === 'Enter') name.blur(); });
      const shown = button(g.hidden ? 'rux--btn--tertiary' : 'rux--btn--ghost', g.hidden ? 'Publish' : 'Unpublish');
      shown.addEventListener('click', async () => {
        shown.disabled = true;
        try {
          const now = await data.own.publish(g.width, g.level, g.hidden);
          if (now.error) say('A gate is published with 3 puzzles or more', 'Make another, then publish it.');
          else document.getElementById('pixels-error').hidden = true;
        } catch { say('The gate did not change', 'Try again.'); }
        gates();
      });
      const remove = button('rux--btn--danger--ghost', 'Delete');
      // A second press within a few seconds does it; the first only asks.
      remove.addEventListener('click', async () => {
        if (remove.dataset.sure == null) {
          remove.dataset.sure = '';
          remove.textContent = 'Delete it and its puzzles?';
          setTimeout(() => { delete remove.dataset.sure; remove.textContent = 'Delete'; }, 4000);
          return;
        }
        remove.disabled = true;
        try { await data.own.removeLevel(g.width, g.level); } catch { say('The gate was not deleted', 'Try again.'); }
        location.reload();
      });
      head.append(name, words('pixels-meta', `${side(g)} · ${g.puzzles.length} of 9 · ${g.hidden ? 'hidden' : 'published'}`), shown, remove);
      const list = document.createElement('div');
      list.className = 'pixels-list';
      list.append(...g.puzzles.map(p => {
        const a = document.createElement('a');
        a.className = 'rux--link rux--tile rux--tile--clickable pixels-puzzle';
        a.href = `make.html?id=${encodeURIComponent(p.id)}`;
        a.append(art(p, true), words('pixels-puzzle-name', p.name), words('pixels-meta', grade(rounds(grid(p.squares, p.width)))));
        return a;
      }));
      box.append(head, list);
      const solvers = got.solvers.filter(s => s.width === g.width && s.level === g.level);
      if (solvers.length) {
        const ul = document.createElement('ul');
        ul.className = 'pixels-people';
        ul.append(...solvers.map(s => {
          const li = document.createElement('li');
          li.className = 'pixels-person';
          li.append(portrait(s), words('pixels-person-name', s.name), words('pixels-meta', `${s.solved} of ${g.puzzles.length} · ${time(s.seconds)}`));
          return li;
        }));
        box.append(ul);
      } else if (!g.hidden) box.append(words('pixels-meta', 'Nobody has found a sprite here yet.'));
      el.append(box);
    });
    host.after(el);
  };

  (async () => {
    if (!data) { say('Pixels could not connect', 'Reload the page to try again.'); return; }
    let me;
    try {
      me = await enter(host);
    } catch {
      say('Your page did not load', 'Reload the page to try again.');
      return;
    }
    if (!me) return;
    draw(me);
    if (data.own) gates();
  })();
})();
