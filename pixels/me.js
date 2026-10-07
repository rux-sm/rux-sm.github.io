/* ==========================================================================
   me.js — the player's own page
   --------------------------------------------------------------------------
   The player's picture, large, beside their username and how many sprites
   they have found. Draw your picture opens the Pixelator on it. The
   username is a field: Save keeps a new one, unless another player has it.
   A guest with no player yet gets the name form first; data.js's `enter`
   draws it.
   ========================================================================== */
(() => {
  'use strict';

  const { data, enter, portrait, words } = window.Pixels;
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
    text.append(h1, words('pixels-meta', `${me.found} ${me.found === 1 ? 'sprite' : 'sprites'} found`));
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

  (async () => {
    if (!data) { say('Pixels could not connect', 'Reload the page to try again.'); return; }
    let me;
    try {
      me = await enter(host);
    } catch {
      say('Your page did not load', 'Reload the page to try again.');
      return;
    }
    if (me) draw(me);
  })();
})();
