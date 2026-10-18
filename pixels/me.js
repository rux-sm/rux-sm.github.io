/* ==========================================================================
   me.js — the player's own page
   --------------------------------------------------------------------------
   The player's picture, large, beside their username, how many sprites
   they have found, their mana and their fairies. Draw your picture opens the Pixelator on
   it. The username is a field: Save keeps a new one, unless another player
   has it. A guest changes their PIN of four digits there, which with their
   username brings them back on any phone.

   YOUR RIFTS are the rifts the player has made, each with its name, which
   is a field that saves as it is left, its size and how many puzzles it
   holds. Publish sends it to their friends and takes three puzzles, and
   reads Unpublish once it is; Delete, pressed twice, takes the rift and its
   puzzles, and their mana comes back. A puzzle's tile opens it in the
   Pixelator. Under a rift is everyone who has found a sprite in it, with
   how many and their time. The local preview has no players, so none of
   this is shown there. The owner has rifts of their own here too, apart from
   the ones every player is sent, and is not shown mana, since theirs cost
   none.
   DELETE MY PLAYER is a guest's, at the foot of the page. It asks twice, a
   press each, and then the player and all that is theirs are gone and the
   door is what is left. An account has none, since its player is made again
   when it next opens Pixels.

   A guest with no player yet gets the door first; data.js's `enter` draws
   it.

   THE LIST UNDER THE PLAYER is what a header would hold, since a game has
   none: How to play, Add to home screen where the browser can, and for an
   account the way to Rux Home; the owner has Manage and Players too. It is
   Carbon's contained list. It has no Theme, because Pixels is always in
   pixel-dark, which every page sets with `data-theme-lock`.
   ========================================================================== */
(() => {
  'use strict';

  const { data, owner, guest, enter, iphone, installed, portrait, worn, hero, words, art, grid, rounds, grade, side, time } = window.Pixels;
  const host = document.getElementById('pixels-me');
  const say = (heading, detail) => {
    const box = document.getElementById('pixels-error');
    box.querySelector('.rux--inline-notification__title').textContent = heading;
    box.querySelector('.rux--inline-notification__subtitle').textContent = detail;
    box.hidden = false;
  };

  // A browser that can install Pixels says so once, as the page loads, which
  // may be before the list is drawn; `install` keeps what it said.
  let install = null, offer = () => {};
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); install = e; offer(); });
  addEventListener('appinstalled', () => { install = null; offer(); });

  /* THE LIST UNDER THE PLAYER. A row opens a window, by Design's
     `data-rux-open`, or leads to a page. An iPhone adds Pixels to its home
     screen from the front page, since its icon opens the address it was
     made from, so its row leads there; another browser opens its own
     install window here. A guest has no account for Home to open to. */

  const more = () => {
    document.getElementById('pixels-more')?.remove();
    const el = document.createElement('div');
    el.id = 'pixels-more';
    el.className = 'rux--contained-list rux--layout--size-lg rux--contained-list--on-page pixels-more';
    const ul = document.createElement('ul');
    ul.setAttribute('role', 'list');
    const row = (text, { href, open } = {}) => {
      const li = document.createElement('li');
      li.className = 'rux--contained-list-item rux--contained-list-item--clickable';
      const key = document.createElement(href ? 'a' : 'button');
      key.className = `rux--contained-list-item__content${href ? ' pixels-more-link' : ''}`;
      key.textContent = text;
      if (href) key.href = href; else key.type = 'button';
      if (open) key.dataset.ruxOpen = open;
      li.append(key);
      ul.append(li);
      return key;
    };
    const first = row('How to play', { open: 'pixels-how' }).parentElement;
    if (iphone && !installed) row('Add to home screen', { href: './#add' });
    else if (!installed) {
      // The row is in the list only while the browser offers to install.
      const add = row('Add to home screen');
      add.addEventListener('click', () => install?.prompt());
      offer = () => { if (install) first.after(add.parentElement); else add.parentElement.remove(); };
      offer();
    }
    if (owner) {
      row('Manage', { href: 'manage.html' });
      row('Players', { href: 'players.html' });
    }
    if (!guest) row('Rux Home', { href: '/' });
    el.append(ul);
    host.parentElement.append(el);
  };

  /* THE CHARACTER, for the owner while it is a placeholder: who stands on
     the map and fights, drawn large, with an ink to pick for its skin and
     one for its eyes, each kept as it is picked, and the way to the
     Pixelator to draw on its helmet once five sprites have earned it. Skin
     is the five skin inks and then a light green, blue and purple, for a
     character who is no person. The first ink of each row is the one the
     character starts in. */
  const SKIN = ['x', 'U', 'V', 'W', 'X', 'f', 'g', 'j'], EYES = ['0', '7', '6', '5', 'a', '9', 'y', '2'];
  const character = me => {
    const el = document.createElement('section');
    el.className = 'pixels-me-hero';
    el.setAttribute('aria-label', 'Your character');
    const wear = worn(me.found || 0), picks = document.createElement('div'), note = words('pixels-me-note', '');
    picks.className = 'pixels-me-hero-picks';
    note.setAttribute('aria-live', 'polite');
    let gear = me.gear || {}, who = hero(wear, gear);
    const tones = (label, name, inks) => {
      const row = document.createElement('div');
      row.className = 'pixels-tones';
      row.setAttribute('role', 'radiogroup');
      row.setAttribute('aria-label', label);
      row.append(...inks.map((id, n) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'pixels-ink';
        b.setAttribute('role', 'radio');
        b.setAttribute('aria-label', `${label} ${n + 1}`);
        b.setAttribute('aria-checked', (gear[name] || inks[0]) === id);
        b.dataset.ink = id;
        return b;
      }));
      row.addEventListener('click', async e => {
        const picked = e.target.closest('.pixels-ink');
        if (!picked || picked.getAttribute('aria-checked') === 'true') return;
        const to = { ...gear, [name]: picked.dataset.ink };
        try { await data.setGear(to); } catch { note.textContent = 'That did not go through. Try again.'; return; }
        note.textContent = '';
        gear = to;
        row.querySelectorAll('.pixels-ink').forEach(b => b.setAttribute('aria-checked', b === picked));
        const now = hero(wear, gear);
        who.replaceWith(now);
        who = now;
      });
      return [words('pixels-meta', label), row];
    };
    picks.append(...tones('Skin', 'skin', SKIN), ...tones('Eyes', 'eyes', EYES));
    if (wear.includes('helmet')) {
      const a = document.createElement('a');
      a.className = 'rux--btn rux--btn--tertiary';
      a.href = 'make.html?wear=helmet';
      a.textContent = 'Draw on your helmet';
      picks.append(a);
    } else picks.append(words('pixels-meta', 'Five sprites found earn a helmet.'));
    picks.append(note);
    el.append(who, picks);
    return el;
  };

  const draw = me => {
    const head = document.createElement('div');
    head.className = 'pixels-me-head';
    const text = document.createElement('div');
    const h1 = document.createElement('h1');
    h1.className = 'rux--type-productive-heading-04';
    h1.textContent = me.name;
    const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
    text.append(h1, words('pixels-meta', [`${count(me.found, 'sprite', 'sprites')} found`, me.mana == null || owner ? '' : `${me.mana} mana`,
      me.fairies == null ? '' : count(me.fairies, 'fairy', 'fairies')].filter(Boolean).join(' · ')));
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
    if (owner && data.setGear) host.append(character(me));
    if (guest && data.setPin) host.append(pinForm(me));
    more();
    if (guest && data.leave) leave();
  };

  // Delete my player: the first two presses only ask, and a press not
  // followed within a few seconds starts over.
  const leave = () => {
    document.getElementById('pixels-leave')?.remove();
    const el = document.createElement('p');
    el.id = 'pixels-leave';
    el.className = 'pixels-leave';
    const asks = ['Delete my player', 'Delete everything of mine?', 'It cannot be undone. Delete?'];
    const key = button('rux--btn--danger--ghost', asks[0]);
    let step = 0, timer;
    const show = n => { step = n; key.textContent = asks[n]; };
    key.addEventListener('click', async () => {
      clearTimeout(timer);
      if (step < 2) {
        show(step + 1);
        timer = setTimeout(() => show(0), 5000);
        return;
      }
      key.disabled = true;
      try {
        await data.leave();
      } catch {
        key.disabled = false;
        show(0);
        say('Your player was not deleted', 'Try again.');
        return;
      }
      location.replace('./');
    });
    el.append(key);
    // After the rifts, which are drawn after the host.
    host.parentElement.append(el);
  };

  /* A PIN, which with the username is a guest's way back in on any phone:
     four digits, kept with Save. The door gives every new guest one, and
     Remove takes it away. An account has the site's log-in and is not shown
     this. */
  const pinForm = me => {
    const form = document.createElement('form');
    form.noValidate = true;
    form.className = 'rux--stack-vertical rux--stack-scale-3';
    const row = document.createElement('div');
    row.className = 'pixels-me-name';
    const wrap = document.createElement('div');
    wrap.className = 'rux--form-item rux--text-input-wrapper';
    const labelWrap = document.createElement('div');
    labelWrap.className = 'rux--text-input__label-wrapper';
    const input = document.createElement('input');
    Object.assign(input, { id: 'pixels-me-pin', className: 'rux--text-input', type: 'password', maxLength: 4, inputMode: 'numeric', autocomplete: 'off', placeholder: me.pin ? 'A new PIN' : 'Four digits' });
    const label = document.createElement('label');
    label.className = 'rux--label';
    label.htmlFor = input.id;
    label.textContent = 'PIN';
    labelWrap.append(label);
    const outer = document.createElement('div');
    outer.className = 'rux--text-input__field-outer-wrapper';
    const inner = document.createElement('div');
    inner.className = 'rux--text-input__field-wrapper';
    inner.append(input);
    outer.append(inner);
    wrap.append(labelWrap, outer);
    const go = document.createElement('button');
    go.type = 'submit';
    go.className = 'rux--btn rux--btn--primary rux--btn--md';
    go.textContent = 'Save';
    row.append(wrap, go);
    const note = words('pixels-meta', me.pin ? 'You have a PIN. Your username and it bring you back on any phone.' : 'With a PIN, your username and it bring you back on any phone.');
    note.setAttribute('aria-live', 'polite');
    form.append(row, note);
    const set = async pin => {
      go.disabled = true;
      let now;
      try { now = await data.setPin(pin); } catch { now = { error: 'lost' }; }
      go.disabled = false;
      if (now.error) {
        note.textContent = { pin: 'A PIN is four digits.', weak: 'That PIN is too easy to guess. Pick another.' }[now.error] || 'That did not go through. Try again.';
        return;
      }
      form.replaceWith(pinForm({ ...me, pin: now.pin }));
    };
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!/^\d{4}$/.test(input.value)) { note.textContent = 'A PIN is four digits.'; return; }
      set(input.value);
    });
    if (me.pin) {
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm';
      remove.textContent = 'Remove the PIN';
      remove.addEventListener('click', () => set(null));
      form.append(remove);
    }
    return form;
  };

  const button = (cls, text) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `rux--btn rux--btn--sm rux--layout--size-sm ${cls}`;
    b.textContent = text;
    return b;
  };
  // The player's own rifts, drawn again after each change to one.
  const rifts = async () => {
    document.getElementById('pixels-gates')?.remove();
    let got;
    try { got = await data.own.mine(); } catch { say('Your rifts did not load', 'Reload the page to try again.'); return; }
    if (!got) return;
    const el = document.createElement('section');
    el.id = 'pixels-gates';
    el.className = 'rux--stack-vertical rux--stack-scale-5';
    const top = document.createElement('div');
    top.className = 'pixels-level-head';
    const make = document.createElement('a');
    make.className = 'rux--btn rux--btn--primary rux--btn--sm rux--layout--size-sm';
    make.href = owner ? 'make.html?own' : 'make.html';
    make.textContent = 'Make a puzzle';
    top.append(words('rux--type-productive-heading-03', 'Your rifts'), make);
    el.append(top);
    const found = new Map();
    got.puzzles.forEach(p => {
      if (!found.has(p.level)) found.set(p.level, { level: p.level, theme: p.theme, hidden: p.hidden, puzzles: [] });
      found.get(p.level).puzzles.push(p);
    });
    // A rift holds boards of any size: `sizes` is the sides it has, and
    // `width` the first, which the database's functions take and do not read.
    found.forEach(g => {
      g.sizes = [...new Set(g.puzzles.map(p => p.width))].sort((a, b) => a - b);
      g.width = g.sizes[0];
    });
    if (!found.size) el.append(words('pixels-meta', owner ? 'You have made none yet. A rift holds fifteen, and your friends are sent it once it is published.' : 'You have made none yet. A puzzle costs 1 mana, and a rift holds fifteen.'));
    [...found.values()].sort((a, b) => a.level - b.level).forEach(g => {
      const box = document.createElement('div');
      box.className = 'rux--stack-vertical rux--stack-scale-3 pixels-mine';
      const head = document.createElement('div');
      head.className = 'pixels-mine-head';
      const name = document.createElement('input');
      Object.assign(name, { className: 'rux--text-input rux--layout--size-sm', type: 'text', maxLength: 30, value: g.theme || '', placeholder: 'Name this rift' });
      name.setAttribute('aria-label', `Name of ${g.theme || 'this rift'}`);
      name.addEventListener('change', async () => {
        try { await data.own.setTheme(g.width, g.level, name.value.trim()); document.getElementById('pixels-error').hidden = true; } catch { say('The rift was not renamed', 'Try again.'); }
      });
      name.addEventListener('keydown', e => { if (e.key === 'Enter') name.blur(); });
      const shown = button(g.hidden ? 'rux--btn--tertiary' : 'rux--btn--ghost', g.hidden ? 'Publish' : 'Unpublish');
      shown.addEventListener('click', async () => {
        shown.disabled = true;
        try {
          const now = await data.own.publish(g.width, g.level, g.hidden);
          if (now.error) say('A rift is published with 3 puzzles or more', 'Make another, then publish it.');
          else document.getElementById('pixels-error').hidden = true;
        } catch { say('The rift did not change', 'Try again.'); }
        rifts();
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
        try { await data.own.removeLevel(g.width, g.level); } catch { say('The rift was not deleted', 'Try again.'); }
        location.reload();
      });
      head.append(name, words('pixels-meta', `${side(g)} · ${g.puzzles.length} of 15`), shown, remove);
      const list = document.createElement('div');
      list.className = 'pixels-list';
      list.append(...g.puzzles.map(p => {
        const a = document.createElement('a');
        a.className = 'rux--link rux--tile rux--tile--clickable pixels-puzzle';
        a.href = `make.html?${owner ? 'own&' : ''}id=${encodeURIComponent(p.id)}`;
        a.append(art(p, true), words('pixels-puzzle-name', p.name), words('pixels-meta', grade(rounds(grid(p.squares, p.width)))));
        return a;
      }));
      box.append(head, list);
      const solvers = got.solvers.filter(s => s.level === g.level);
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
    // The owner's own rifts are here as a player's are; the ones every player
    // is sent are in Manage.
    if (data.own) rifts();
  })();
})();
