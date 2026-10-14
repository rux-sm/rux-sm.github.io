/* ==========================================================================
   Website — THE QUOTE FORM
   --------------------------------------------------------------------------
   quote.html and es/quote.html. Checks each field the office quotes from and
   says what is wrong beside it, in the page's language, the way Carbon marks
   a field invalid: `data-invalid` on the field's wrapper, the input's
   `--invalid` class and its warning icon, and the words in the
   `form-requirement` under it. A one-way trip hides and skips the return.

   NOTHING TYPED IS LOST BEFORE THE REQUEST LANDS. Every change is kept in
   this tab's sessionStorage and put back when the page opens again, and only
   a request that lands clears it. Storage can be refused, as in a private
   window, and then the form simply starts empty.

   THE PREVIEW SENDS NOTHING. A form that passes opens the thank-you page its
   `data-thanks` names, which says nothing was sent; the live form will post to
   the `quote-request` function first.
   ========================================================================== */
(() => {
  'use strict';

  const form = document.getElementById('website-quote');
  if (!form) return;

  const es = document.documentElement.lang === 'es';
  const SAY = es ? {
    first: 'Escriba su nombre.',
    last: 'Escriba su apellido.',
    phone: 'Escriba un teléfono con su código de área.',
    email: 'Escriba un correo electrónico, como nombre@ejemplo.com.',
    from: 'Escriba dónde pasa el autobús por ustedes.',
    to: 'Escriba a dónde van.',
    leave_date: 'Elija el día de salida.',
    past: 'Elija un día a partir de hoy.',
    return_date: 'Elija el día de regreso.',
    before: 'Elija un día igual o posterior al de salida.',
    people: 'Escriba cuántas personas viajan, con número.',
  } : {
    first: 'Enter your first name.',
    last: 'Enter your last name.',
    phone: 'Enter a phone number with its area code.',
    email: 'Enter an email address, like name@example.com.',
    from: 'Enter where the bus picks you up.',
    to: 'Enter where you’re going.',
    leave_date: 'Pick the day you leave.',
    past: 'Pick a day from today on.',
    return_date: 'Pick the day you come back.',
    before: 'Pick a day on or after the day you leave.',
    people: 'Enter how many are going, as a number.',
  };

  const field = name => form.elements.namedItem(name);
  const value = name => String(field(name)?.value ?? '').trim();
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // -- marking a field --------------------------------------------------------
  function mark(input, words) {
    const wrapper = input.closest('.rux--text-input__field-wrapper');
    const said = document.getElementById(`${input.id}-error`);
    if (!wrapper || !said) return;
    wrapper.setAttribute('data-invalid', '');
    input.classList.add('rux--text-input--invalid');
    input.setAttribute('aria-invalid', 'true');
    if (!wrapper.querySelector('.rux--text-input__invalid-icon')) {
      wrapper.insertAdjacentHTML('afterbegin',
        '<svg class="rux--text-input__invalid-icon" width="16" height="16" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><use href="#i-warning--filled"/></svg>');
    }
    said.textContent = words;
  }
  function unmark(input) {
    const wrapper = input.closest('.rux--text-input__field-wrapper');
    const said = document.getElementById(`${input.id}-error`);
    if (!wrapper || !said) return;
    wrapper.removeAttribute('data-invalid');
    input.classList.remove('rux--text-input--invalid');
    input.removeAttribute('aria-invalid');
    wrapper.querySelector('.rux--text-input__invalid-icon')?.remove();
    said.textContent = '';
  }

  // -- the return, for a round trip only ---------------------------------------
  const ret = document.getElementById('q-return');
  const oneWay = () => form.querySelector('input[name="trip"]:checked')?.value === 'oneway';
  function showReturn() {
    const hide = oneWay();
    ret.hidden = hide;
    field('return_date').required = !hide;
    if (hide) unmark(field('return_date'));
  }

  // The earliest day each date may take: today, and the day the trip leaves.
  function bound() {
    field('leave_date').min = today();
    field('return_date').min = value('leave_date') || today();
  }

  // -- the rules ----------------------------------------------------------------
  // Each returns the words for what is wrong, or '' when the field is right.
  const RULES = {
    first: () => (value('first') ? '' : SAY.first),
    last: () => (value('last') ? '' : SAY.last),
    phone: () => (value('phone').replace(/\D/g, '').length >= 10 ? '' : SAY.phone),
    email: () => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value('email')) ? '' : SAY.email),
    from: () => (value('from') ? '' : SAY.from),
    to: () => (value('to') ? '' : SAY.to),
    leave_date: () => {
      const v = value('leave_date');
      if (!v) return SAY.leave_date;
      return v < today() ? SAY.past : '';
    },
    return_date: () => {
      if (oneWay()) return '';
      const v = value('return_date');
      if (!v) return SAY.return_date;
      return v < value('leave_date') ? SAY.before : '';
    },
    people: () => {
      const n = Number(value('people'));
      return /^\d+$/.test(value('people')) && n >= 1 && n <= 1000 ? '' : SAY.people;
    },
  };
  function check(name) {
    const words = RULES[name]();
    if (words) mark(field(name), words); else unmark(field(name));
    return !words;
  }

  // -- the draft ---------------------------------------------------------------
  const KEY = 'website.quote-draft';
  function keep() {
    const draft = {};
    for (const el of form.elements) {
      if (!el.name) continue;
      if (el.type === 'radio') { if (el.checked) draft[el.name] = el.value; }
      else if (el.type === 'checkbox') draft[el.name] = el.checked;
      else draft[el.name] = el.value;
    }
    try { sessionStorage.setItem(KEY, JSON.stringify(draft)); } catch { /* storage refused */ }
  }
  function restore() {
    let draft = null;
    try { draft = JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch { draft = null; }
    if (!draft || typeof draft !== 'object') return;
    for (const el of form.elements) {
      if (!el.name || !(el.name in draft)) continue;
      if (el.type === 'radio') el.checked = el.value === draft[el.name];
      else if (el.type === 'checkbox') el.checked = draft[el.name] === true;
      else el.value = String(draft[el.name] ?? '');
    }
  }
  function forget() {
    try { sessionStorage.removeItem(KEY); } catch { /* storage refused */ }
  }

  // -- wiring ------------------------------------------------------------------
  restore();
  showReturn();
  bound();

  form.addEventListener('input', event => {
    const name = event.target.name;
    if (name in RULES && event.target.getAttribute('aria-invalid') === 'true') check(name);
    if (name === 'leave_date') bound();
    keep();
  });
  form.addEventListener('change', event => {
    if (event.target.name === 'trip') showReturn();
    keep();
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    const wrong = Object.keys(RULES).filter(name => !check(name));
    if (wrong.length) {
      field(wrong[0]).focus();
      return;
    }
    forget();
    location.href = form.dataset.thanks;
  });
})();
