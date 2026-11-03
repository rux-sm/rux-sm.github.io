/* ==========================================================================
   share/sign.js — ONE FORM A DRIVER FILLS IN AND SIGNS
   --------------------------------------------------------------------------
   sign.html?s=<token>&form=<form id> shows a driver, without a log-in, one
   form that waits for them, drawn from its fields as
   scheduler/driver-form/handler.ts describes them: a tile for each heading,
   Yes and No, or a choice's options, as big tiles, lines filled in from the
   profile, a line or box a Yes opens, and one pad to sign on with a finger,
   stylus, mouse or touchpad, however many places the form signs. Fixed words
   and the places the office fills in are not shown.

   get_driver_form hands over the fields and the profile only while the form
   waits for this driver. Sign and send posts the answers and the signature
   to the driver-form Edge Function, which is the one judge of what is
   missing: it answers with the fields to fix, and this marks them.

   THE QUESTIONS STAY IN THE FORM'S OWN ENGLISH, which is what is signed. On
   a Spanish link each one shows its Spanish under it, and the page's own
   words are Spanish, from driver-words.js.
   ========================================================================== */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const client = window.Rux?.account?.client;
  const params = new URLSearchParams(location.search);
  const token = (params.get('s') ?? '').trim().toLowerCase();
  const formId = params.get('form') ?? '';
  const WORDS = window.SchedulerDriverWords;
  const LANG_KEY = 'scheduler-driver-language';
  let lang = (() => { try { const v = localStorage.getItem(LANG_KEY); return v === 'en' || v === 'es' ? v : null; } catch { return null; } })();
  // The language the driver chose on this phone, if they did.
  const chosen = lang;
  let w = WORDS[lang ?? 'en'].forms;

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  // An icon from the page's sprite, named whole so the sprite tool finds it.
  const icon = (id, cls) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    for (const [k, v] of Object.entries({ width: 16, height: 16, viewBox: '0 0 32 32', fill: 'currentColor', 'aria-hidden': 'true' })) svg.setAttribute(k, v);
    if (cls) svg.setAttribute('class', cls);
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', id);
    svg.appendChild(use);
    return svg;
  };
  // The English, then the Spanish under it on a Spanish link.
  const both = (tag, cls, words) => {
    const n = el(tag, cls, words?.en ?? '');
    if (lang === 'es' && words?.es) n.appendChild(el('span', 'scheduler-sign-es', words.es));
    return n;
  };
  const backHref = `driver.html?s=${encodeURIComponent(token)}`;
  const longDate = iso => new Date(`${iso}T12:00:00`).toLocaleDateString(WORDS.LOCALE[lang], { month: 'long', day: 'numeric', year: 'numeric' });
  const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date());

  // Whole class names, so the check can find each one in this file.
  const NOTICE = {
    info: 'rux--inline-notification rux--inline-notification--info',
    error: 'rux--inline-notification rux--inline-notification--error',
  };
  function say(title, text, kind = 'info') {
    $('scheduler-sign-notice-title').textContent = title;
    $('scheduler-sign-notice-text').textContent = text;
    $('scheduler-sign-notice-box').className = NOTICE[kind];
    $('scheduler-sign-notice').hidden = false;
  }
  function words() {
    $('scheduler-sign-back').href = $('scheduler-sign-done-back').href = backHref;
    $('scheduler-sign-back-text').textContent = $('scheduler-sign-done-back-text').textContent = w.back;
    $('scheduler-sign-skip').textContent = WORDS[lang ?? 'en'].skip;
  }

  // -- what the profile already holds, by the name a field's prefill gives --
  const prefill = d => {
    // The profile keeps one name: its first word, its last, and what is between.
    const words = String(d.name ?? '').trim().split(/\s+/).filter(Boolean);
    return {
      name: d.name,
      firstName: words[0] ?? '',
      middleName: words.slice(1, -1).join(' '),
      lastName: words.length > 1 ? words.at(-1) : '',
      dateOfBirth: /^\d{4}-\d{2}-\d{2}/.test(d.dateOfBirth ?? '') ? `${d.dateOfBirth.slice(5, 7)}/${d.dateOfBirth.slice(8, 10)}/${d.dateOfBirth.slice(0, 4)}` : '',
      street: d.address,
      cityStateZip: [d.city, [d.state, d.zip].filter(Boolean).join(' ')].filter(Boolean).join(', '),
      city: d.city,
      state: d.state,
      zip: d.zip,
      phone: d.phone,
      licenseNumber: d.licenseNumber,
      license: [d.licenseState, d.licenseNumber].filter(Boolean).join(' '),
    };
  };

  // -- drawing the form -------------------------------------------------------
  // Fields the form writes or the office fills in, never shown to the driver.
  const OFFICE = ['fixed', 'licence_copy', 'trip_customer', 'trip_dates'];
  let form = null;
  const inputs = new Map();     // field id -> { read(), mark(bad), node }
  const whens = [];             // [node, field] shown while its `when` holds
  let pad = null;

  function answers() {
    const out = {};
    for (const [id, f] of inputs) out[id] = f.read();
    return out;
  }
  function showWhens() {
    const a = answers();
    for (const [node, f] of whens) node.hidden = !f.when.any.some(id => a[id] === f.when.is);
  }

  // Yes and No, or a choice's own options, each a tile.
  function choice(f) {
    const set = el('fieldset', 'scheduler-sign-question rux--layer-two');
    set.appendChild(both('legend', 'rux--type-body-01', f));
    if (f.list?.length) {
      const ul = el('ul', 'rux--type-body-compact-01');
      for (const item of f.list) ul.appendChild(both('li', null, item));
      set.appendChild(ul);
    }
    if (f.note) set.appendChild(both('p', 'rux--type-body-compact-01 scheduler-sign-note', f.note));
    const choices = el('div', 'scheduler-sign-choices');
    const options = f.type === 'choice'
      ? f.options.map(o => ({ value: o.value, label: lang === 'es' && o.es ? o.es : o.en }))
      : ['yes', 'no'].map(value => ({ value, label: w[value] }));
    for (const { value, label: words } of options) {
      const wrap = el('div');
      const input = Object.assign(el('input', 'rux--tile-input'), { type: 'radio', name: `f-${f.id}`, id: `f-${f.id}-${value}`, value });
      const label = el('label', 'rux--tile rux--tile--selectable rux--tile--radio');
      label.htmlFor = input.id;
      const check = el('span', 'rux--tile__checkmark');
      check.appendChild(icon('#i-checkmark--filled'));
      label.append(check, el('span', 'rux--tile-content rux--type-heading-compact-02', words));
      wrap.append(input, label);
      choices.appendChild(wrap);
    }
    const error = el('p', 'scheduler-sign-error rux--type-body-compact-01', f.type === 'choice' ? w.chooseOne : w.chooseYesNo);
    error.hidden = true;
    set.append(choices, error);
    if (f.when) whens.push([set, f]);
    set.addEventListener('change', () => { mark(false); showWhens(); });
    const mark = bad => { set.classList.toggle('scheduler-sign-question--invalid', bad); error.hidden = !bad; };
    inputs.set(f.id, { read: () => set.querySelector('input:checked')?.value ?? null, mark, node: set });
    return set;
  }

  function line(f, values) {
    const item = el('div', `rux--form-item rux--text-input-wrapper${f.wide ? ' scheduler-sign-wide' : ''}`);
    const labelWrap = el('div', 'rux--text-input__label-wrapper');
    const label = both('label', 'rux--label', f);
    label.htmlFor = `f-${f.id}`;
    labelWrap.appendChild(label);
    const outer = el('div', 'rux--text-input__field-outer-wrapper');
    const field = el('div', 'rux--text-input__field-wrapper');
    const input = Object.assign(el('input', 'rux--text-input'), { id: `f-${f.id}`, type: 'text', autocomplete: 'off', value: values[f.prefill] ?? '' });
    if (f.type === 'date') { input.inputMode = 'numeric'; input.placeholder = w.dateFormat; }
    if (f.digits) input.inputMode = 'numeric';
    const error = el('div', 'rux--form-requirement', f.type === 'date' ? w.badDate : f.digits ? w.badDigits(f.digits) : w.fillIn);
    field.appendChild(input);
    outer.append(field, error);
    item.append(labelWrap, outer);
    const mark = bad => { field.toggleAttribute('data-invalid', bad); input.classList.toggle('rux--text-input--invalid', bad); };
    input.addEventListener('input', e => {
      mark(false);
      // A phone's number pad has no slash, so a digit typed at the end of a
      // date takes its slashes as MM/DD/YYYY; a date the driver parts
      // themselves another way, as 3/5/1980, is left as typed.
      const typedAtEnd = /^\d+$/.test(e.data ?? '') && input.selectionStart === input.value.length;
      if (f.type === 'date' && typedAtEnd && /^[\d/]*$/.test(input.value) && [...input.value].every((c, i) => c !== '/' || i === 2 || i === 5)) {
        const d = input.value.replace(/\//g, '').slice(0, 8);
        input.value = [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join('/');
      }
    });
    inputs.set(f.id, { read: () => input.value, mark, node: item });
    if (f.when) whens.push([item, f]);
    return item;
  }

  function box(f) {
    const item = el('div', 'rux--form-item rux--layer-two');
    const labelWrap = el('div', 'rux--text-area__label-wrapper');
    const label = both('label', 'rux--label', f);
    label.htmlFor = `f-${f.id}`;
    labelWrap.appendChild(label);
    const wrap = el('div', 'rux--text-area__wrapper');
    const area = Object.assign(el('textarea', 'rux--text-area'), { id: `f-${f.id}`, rows: 5, maxLength: 4000 });
    wrap.appendChild(area);
    const error = el('div', 'rux--form-requirement', w.fillIn);
    item.append(labelWrap, wrap, error);
    const mark = bad => { wrap.toggleAttribute('data-invalid', bad); area.classList.toggle('rux--text-area--invalid', bad); };
    area.addEventListener('input', () => mark(false));
    inputs.set(f.id, { read: () => area.value, mark, node: item });
    if (f.when) whens.push([item, f]);
    return item;
  }

  /* THE PAD: pointer events cover a finger, a stylus, a mouse and a touchpad.
     Strokes are kept as points, so the pad redraws at any size and the
     signature is sent as dark ink cropped to what was drawn. */
  function signature(signedOn) {
    const wrap = el('div', 'scheduler-sign-pad-wrap rux--layer-two');
    const label = el('span', 'rux--label', w.signWithFinger);
    label.id = 'scheduler-sign-pad-label';
    const box = el('div', 'scheduler-sign-pad');
    box.setAttribute('role', 'img');
    box.setAttribute('aria-labelledby', label.id);
    const canvas = el('canvas');
    box.append(el('span', 'scheduler-sign-pad__x rux--type-heading-03', '×'), el('span', 'scheduler-sign-pad__line'),
      el('span', 'scheduler-sign-pad__hint rux--type-body-compact-01', w.signHere), canvas);
    const foot = el('div', 'scheduler-sign-pad-foot');
    const clear = el('button', 'rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm', w.clear);
    clear.type = 'button';
    clear.appendChild(icon('#m-ink_eraser', 'rux--btn__icon'));
    foot.append(el('span', 'rux--type-body-compact-01 scheduler-sign-muted', signedOn ? w.dateSigned(longDate(today())) : ''), clear);
    const error = el('p', 'scheduler-sign-error rux--type-body-compact-01', w.signInBox);
    error.hidden = true;
    wrap.append(label, box, foot, error);

    const ctx = canvas.getContext('2d');
    let strokes = [];
    let live = null;
    const ink = () => getComputedStyle(document.documentElement).getPropertyValue('--rux-text-primary').trim() || '#161616';
    const paint = (c, colour, scale) => {
      c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = colour; c.lineWidth = 2.5 * scale;
      for (const s of strokes) {
        c.beginPath();
        s.forEach((p, i) => (i ? c.lineTo(p.x * scale, p.y * scale) : c.moveTo(p.x * scale, p.y * scale)));
        if (s.length === 1) c.lineTo(s[0].x * scale + 0.1, s[0].y * scale);
        c.stroke();
      }
    };
    const draw = () => {
      const r = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, r.width, r.height);
      paint(ctx, ink(), 1);
      box.classList.toggle('scheduler-sign-pad--signed', strokes.length > 0);
    };
    const size = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };
    const at = e => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const mark = bad => { box.classList.toggle('scheduler-sign-pad--invalid', bad); error.hidden = !bad; };
    canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); live = [at(e)]; strokes.push(live); draw(); mark(false); });
    canvas.addEventListener('pointermove', e => { if (live) { live.push(at(e)); draw(); } });
    canvas.addEventListener('pointerup', () => { live = null; });
    canvas.addEventListener('pointercancel', () => { live = null; });
    clear.addEventListener('click', () => { strokes = []; draw(); });
    new ResizeObserver(size).observe(canvas);

    // Navy ink on clear, twice the size it was drawn, cropped to the strokes.
    const png = () => {
      if (!strokes.length) return null;
      const pts = strokes.flat();
      const edge = 8;
      const minX = Math.min(...pts.map(p => p.x)) - edge, minY = Math.min(...pts.map(p => p.y)) - edge;
      const c = el('canvas');
      c.width = Math.ceil((Math.max(...pts.map(p => p.x)) + edge - minX) * 2);
      c.height = Math.ceil((Math.max(...pts.map(p => p.y)) + edge - minY) * 2);
      const x = c.getContext('2d');
      x.translate(-minX * 2, -minY * 2);
      paint(x, '#0a1f66', 2);
      return c.toDataURL('image/png');
    };
    pad = { png, mark, node: wrap };
    return wrap;
  }

  function drawForm(f, driver) {
    const page = $('scheduler-sign-form');
    page.replaceChildren();
    inputs.clear();
    whens.length = 0;
    const values = prefill(driver);

    const head = el('div', 'rux--stack-vertical rux--stack-scale-3');
    head.appendChild(el('h1', 'rux--type-productive-heading-04', f.title));
    if (lang === 'es') head.appendChild(el('p', 'rux--type-body-01 scheduler-sign-muted', f.titleEs));
    head.append(el('p', 'rux--type-body-01', `${w.intro} ${w.translated}`));
    const switcher = el('button', 'rux--btn rux--btn--ghost rux--btn--sm rux--layout--size-sm', WORDS[lang].switchTo);
    switcher.type = 'button';
    switcher.addEventListener('click', () => {
      // The answers so far survive the switch.
      const kept = answers();
      setLanguage(lang === 'es' ? 'en' : 'es');
      try { localStorage.setItem(LANG_KEY, lang); } catch { /* the page still switches */ }
      drawForm(f, driver);
      for (const [id, v] of Object.entries(kept)) {
        const node = inputs.get(id)?.node;
        if (!node || v == null) continue;
        const radio = node.querySelector(`input[value="${v}"]`);
        if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change', { bubbles: true })); } else node.querySelector('input, textarea').value = v;
      }
      showWhens();
    });
    const sw = el('div');
    sw.appendChild(switcher);
    head.appendChild(sw);
    page.appendChild(head);

    // A tile for each heading; a run of lines shares one grid.
    let tile = null, grid = null;
    const section = () => { tile = el('section', 'rux--tile scheduler-sign-section'); page.appendChild(tile); grid = null; };
    for (const field of f.fields) {
      if (OFFICE.includes(field.type)) continue;
      if (field.type === 'heading' || !tile) section();
      if (field.type === 'heading') { tile.appendChild(both('h2', 'rux--type-productive-heading-03', field)); continue; }
      if (field.type === 'line' || field.type === 'date') {
        if (!grid) {
          if (field.prefill) tile.appendChild(el('p', 'rux--type-body-compact-01 scheduler-sign-muted', w.fromProfile));
          grid = el('div', 'scheduler-sign-fields rux--layer-two');
          tile.appendChild(grid);
        }
        grid.appendChild(line(field, values));
        continue;
      }
      grid = null;
      if (field.type === 'text' || field.type === 'read') tile.appendChild(both('p', 'rux--type-body-compact-01', field));
      else if (field.type === 'yes_no' || field.type === 'choice') tile.appendChild(choice(field));
      else if (field.type === 'box') tile.appendChild(box(field));
      else if (field.type === 'signature') tile.appendChild(signature(f.fields.some(x => x.type === 'signed_on')));
    }

    const foot = el('div', 'rux--stack-vertical rux--stack-scale-3');
    const error = el('p', 'scheduler-sign-error rux--type-body-compact-01');
    error.id = 'scheduler-sign-error';
    error.hidden = true;
    const submit = el('button', 'rux--btn rux--btn--primary rux--layout--size-lg scheduler-sign-submit');
    submit.type = 'submit';
    submit.id = 'scheduler-sign-submit';
    submit.append(el('span', null, w.submit), icon('#m-send', 'rux--btn__icon'));
    foot.append(error, submit, el('p', 'rux--type-body-compact-01 scheduler-sign-muted', w.private));
    page.appendChild(foot);
    showWhens();
  }

  // -- sending ----------------------------------------------------------------
  async function send(e) {
    e.preventDefault();
    const submit = $('scheduler-sign-submit');
    const error = $('scheduler-sign-error');
    const label = submit.querySelector('span');
    submit.disabled = true;
    label.textContent = w.sending;
    error.hidden = true;
    let result;
    try {
      result = await client.functions.invoke('driver-form', { body: { token, formId, answers: answers(), signature: pad?.png() ?? null } });
    } catch (err) { result = { error: err }; }
    submit.disabled = false;
    label.textContent = w.submit;

    if (!result.error) {
      $('scheduler-sign-form').hidden = true;
      $('scheduler-sign-done-title').textContent = w.doneTitle(form.driver.name?.split(' ')[0] || '');
      $('scheduler-sign-done-text').textContent = w.doneText(longDate(result.data?.signed ?? today()));
      $('scheduler-sign-done').hidden = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    // What the function said, when it said anything.
    let body = null;
    try { body = await result.error.context?.json(); } catch { /* no body to read */ }
    if (body?.error === 'problems') {
      const wrong = new Set(body.fields);
      for (const [id, f] of inputs) f.mark(wrong.has(id));
      pad?.mark(wrong.has('signature'));
      error.textContent = w.missing;
      error.hidden = false;
      const first = [...inputs].find(([id]) => wrong.has(id))?.[1].node ?? (wrong.has('signature') ? pad?.node : null);
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (body?.error === 'not-waiting' || body?.error === 'link') {
      $('scheduler-sign-form').hidden = true;
      say(w.notWaiting, w.notWaitingText);
      return;
    }
    error.textContent = w.couldNotSend;
    error.hidden = false;
  }

  function setLanguage(next) {
    lang = next === 'es' ? 'es' : 'en';
    w = WORDS[lang].forms;
    document.documentElement.lang = lang;
    words();
  }

  async function load() {
    setLanguage(lang ?? 'en');
    if (!token || !formId || !client) return say(w.noForm, w.noFormText, 'error');
    const { data, error } = await client.rpc('get_driver_form', { p_token: token, p_form_id: formId });
    if (error) return say(WORDS[lang].cannotLoad, WORDS[lang].checkConnection, 'error');
    if (!data) return say(w.notWaiting, w.notWaitingText);
    form = data;
    // The profile's language, unless the driver chose another on this phone.
    if (!chosen) setLanguage(data.driver.language);
    document.title = `${data.title} — Scheduler`;
    drawForm(data, data.driver);
    $('scheduler-sign-form').hidden = false;
  }

  $('scheduler-sign-form').addEventListener('submit', send);
  load();
})();
