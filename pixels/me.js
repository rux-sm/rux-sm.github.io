/* ==========================================================================
   me.js — Me, the player's own page
   --------------------------------------------------------------------------
   The player's picture, large, beside their username, with a pencil that
   opens a window to change it, and how many sprites they have found and
   fairies they have. Draw your picture opens the Pixelator on it.

   THE LIST UNDER THE PLAYER: Friends, with how many, which opens the
   Friends page; a guest's PIN, which opens a window to set, change or
   remove it; How to play, the Sound switch, Add to home screen where the
   browser can, and for an account the way to Rux Home. THE OWNER'S LIST
   comes last: Players, which opens their page, and New players can join, a
   switch. Each is Carbon's contained list. Me has no Theme, because Pixels
   is always in pixel-dark, which every page sets with `data-theme-lock`.

   DELETE MY PLAYER is a guest's, at the foot of the page. It asks twice, a
   press each, and then the player and all that is theirs are gone and the
   door is what is left. An account has none, since its player is made again
   when it next opens Pixels. The rifts a player makes are on Create.

   A guest with no player yet gets the door first; data.js's `enter` draws
   it.
   ========================================================================== */
(() => {
  'use strict';

  const { data, owner, guest, enter, iphone, installed, portrait, worn, hero, words, sounds, WORLD } = window.Pixels;
  const { modal } = window.Rux;
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
     `data-rux-open`, or leads to a page; Sound is a switch, on while a
     puzzle's moves play tones, which this browser keeps. An iPhone adds
     Pixels to its home screen from the front page, since its icon opens
     the address it was made from, so its row leads there; another browser
     opens its own install window here. A guest has no account for Home to
     open to. */

  // A list, Carbon's contained one, with a label where it is given.
  const list = (id, label) => {
    document.getElementById(id)?.remove();
    const el = document.createElement('div');
    el.id = id;
    el.className = 'rux--contained-list rux--layout--size-lg rux--contained-list--on-page pixels-more';
    if (label) {
      const head = document.createElement('div');
      head.className = 'rux--contained-list__header';
      head.append(words('rux--contained-list__label', label));
      el.append(head);
    }
    const ul = document.createElement('ul');
    ul.setAttribute('role', 'list');
    el.append(ul);
    // A row that opens a window or a page, with what it holds at its end.
    const row = (text, { href, open, value } = {}) => {
      const li = document.createElement('li');
      li.className = 'rux--contained-list-item rux--contained-list-item--clickable';
      const key = document.createElement(href ? 'a' : 'button');
      key.className = `rux--contained-list-item__content pixels-more-link`;
      key.append(words('pixels-more-text', text));
      if (value != null) key.append(words('pixels-meta', value));
      if (href) key.href = href; else key.type = 'button';
      if (open) key.dataset.ruxOpen = open;
      li.append(key);
      ul.append(li);
      return key;
    };
    // A row with a switch at its end, which `flip` is told of.
    const toggle = (id2, text, on, flip) => {
      const li = document.createElement('li');
      li.className = 'rux--contained-list-item rux--contained-list-item--with-action';
      li.innerHTML = `
      <div class="rux--contained-list-item__content" id="${id2}-name"></div>
      <div class="rux--contained-list-item__action">
        <div class="rux--toggle">
          <button type="button" class="rux--toggle__button" id="${id2}" role="switch" aria-checked="${on}" aria-labelledby="${id2}-name"></button>
          <label class="rux--toggle__label" for="${id2}">
            <div class="rux--toggle__appearance">
              <div class="rux--toggle__switch${on ? ' rux--toggle__switch--checked' : ''}"><svg class="rux--toggle__check" width="6" height="5" viewBox="0 0 6 5" aria-hidden="true"><path d="M2.2 2.7L5 0 6 1 2.2 5 0 2.7 1 1.5z"/></svg></div>
            </div>
          </label>
        </div>
      </div>`;
      li.firstElementChild.textContent = text;
      li.addEventListener('rux:toggle', e => flip(e.detail.on, li));
      ul.append(li);
      return li;
    };
    return { el, ul, row, toggle };
  };

  const more = async me => {
    const { el, ul, row } = list('pixels-more');
    // How many friends, where the database can say.
    let friends = null;
    try { friends = data.people ? (await data.people()).length : null; } catch { /* the row says no number */ }
    if (data.people) row('Friends', { href: 'friends.html', value: friends == null ? null : String(friends) });
    if (guest && data.setPin) {
      const pin = row('PIN', { value: me.pin ? 'Set' : 'None' });
      pin.addEventListener('click', () => {
        document.getElementById('pixels-pin-body').replaceChildren(pinForm(me));
        modal.open('pixels-pin-modal', pin);
      });
    }
    const first = row('How to play', { open: 'pixels-how' }).parentElement;
    const sound = document.createElement('li'), on = sounds();
    sound.className = 'rux--contained-list-item rux--contained-list-item--with-action';
    sound.innerHTML = `
      <div class="rux--contained-list-item__content" id="pixels-sound-name">Sound</div>
      <div class="rux--contained-list-item__action">
        <div class="rux--toggle">
          <button type="button" class="rux--toggle__button" id="pixels-sound" role="switch" aria-checked="${on}" aria-labelledby="pixels-sound-name"></button>
          <label class="rux--toggle__label" for="pixels-sound">
            <div class="rux--toggle__appearance">
              <div class="rux--toggle__switch${on ? ' rux--toggle__switch--checked' : ''}"><svg class="rux--toggle__check" width="6" height="5" viewBox="0 0 6 5" aria-hidden="true"><path d="M2.2 2.7L5 0 6 1 2.2 5 0 2.7 1 1.5z"/></svg></div>
            </div>
          </label>
        </div>
      </div>`;
    sound.addEventListener('rux:toggle', e => sounds(e.detail.on));
    ul.append(sound);
    if (iphone && !installed) row('Add to home screen', { href: './#add' });
    else if (!installed) {
      // The row is in the list only while the browser offers to install.
      const add = row('Add to home screen');
      add.addEventListener('click', () => install?.prompt());
      offer = () => { if (install) first.after(add.parentElement); else add.parentElement.remove(); };
      offer();
    }
    if (!guest) row('Rux Home', { href: '/' });
    host.after(el);
    if (owner && data.players) await ownerList();
    if (guest && data.leave) leave();
  };

  // THE OWNER'S LIST: Players, and whether new players may join.
  const ownerList = async () => {
    const { el, row, toggle } = list('pixels-owner', 'Owner');
    row('Players', { href: 'players.html' });
    let open = null;
    try { open = await data.joining(); } catch { /* the switch is left out */ }
    if (open != null) {
      let undoing = false;
      toggle('pixels-joining', 'New players can join', open, async (on, li) => {
        if (undoing) return;
        try { await data.setJoining(on); document.getElementById('pixels-error').hidden = true; } catch {
          undoing = true;
          window.Rux.formControls.toggle(li.querySelector('.rux--toggle'), !on);
          undoing = false;
          say('Joining did not change', 'Try again.');
        }
      });
    }
    document.getElementById('pixels-more').after(el);
  };

  /* THE CHARACTER, for the owner while it is a placeholder, once app.js's
     WORLD is on: who stands on the map and fights, drawn large, with an ink
     to pick for its skin and one for its eyes, each kept as it is picked,
     and the way to the Pixelator to draw on its helmet once five sprites
     have earned it. Skin
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
    // The pencil beside the name opens the window that changes it.
    const named = document.createElement('div');
    named.className = 'pixels-me-named';
    const pencil = document.createElement('button');
    pencil.type = 'button';
    pencil.className = 'rux--btn rux--btn--ghost rux--btn--icon-only rux--btn--sm';
    pencil.setAttribute('aria-label', 'Change your username');
    pencil.title = 'Change your username';
    pencil.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><use href="#m-edit"/></svg>';
    pencil.addEventListener('click', () => {
      document.getElementById('pixels-me-name').value = me.name;
      document.getElementById('pixels-name-note').textContent = '';
      modal.open('pixels-name-modal', pencil);
    });
    named.append(h1, pencil);
    text.append(named, words('pixels-meta', [`${count(me.found, 'sprite', 'sprites')} found`,
      me.fairies == null ? '' : count(me.fairies, 'fairy', 'fairies')].filter(Boolean).join(' · ')));
    head.append(portrait(me, true), text);
    shown = me;

    const drawIt = document.createElement('a');
    drawIt.className = 'rux--btn rux--btn--tertiary';
    drawIt.href = 'make.html?me';
    drawIt.textContent = 'Draw your picture';

    host.append(head, drawIt);
    if (owner && WORLD && data.setGear) host.append(character(me));
    more(me);
  };

  /* THE USERNAME'S WINDOW. Save keeps a new one, unless another player has
     it, and the page is drawn again with it. */
  let shown = null;
  document.getElementById('pixels-name').addEventListener('submit', async e => {
    e.preventDefault();
    const input = document.getElementById('pixels-me-name'), note = document.getElementById('pixels-name-note'), go = document.getElementById('pixels-name-save');
    const to = input.value.trim();
    if (!to) { note.textContent = 'Type a username first.'; return; }
    if (to === shown.name) { modal.close('pixels-name-modal'); return; }
    go.disabled = true;
    let now;
    try { now = await data.rename(to); } catch { now = { error: 'lost' }; }
    go.disabled = false;
    if (now.error) {
      note.textContent = { taken: 'That username is taken. Try another.', name: 'A username is 1 to 20 letters.' }[now.error] || 'That did not go through. Try again.';
      return;
    }
    modal.close('pixels-name-modal');
    host.replaceChildren(document.getElementById('pixels-error'));
    draw(now);
  });

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
      shown = { ...shown, pin: now.pin };
      form.replaceWith(pinForm(shown));
      more(shown);
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
  })();
})();
