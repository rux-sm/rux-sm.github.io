/* ==========================================================================
   quote.js — THE QUOTE CALCULATOR
   --------------------------------------------------------------------------
   The office spreadsheet's Calculator tab, formula for formula, quirks
   included; the Notes tab on the page lists them. The rates are rows in
   `quote_rates` and `quote_mileage_rates`, which only a staff session can read
   or write, so no rate is written in this public file.

   A local preview has no account layer: the calculator still draws, with
   every rate blank, so the page can be looked at, and nothing saves.
   ========================================================================== */
(() => {
  'use strict';

  const MAX_DAYS = 20;

  // Every named rate, in the order the Rates tab shows them. `key` is the
  // `quote_rates` row; `unit` decides the field's hint.
  const RATE_FIELDS = {
    trip: [
      { key: 'trip_local_daily', label: 'Local daily rate', unit: '$/day' },
      { key: 'trip_extra_day', label: 'Long distance extra day', unit: '$/day' },
      { key: 'trip_dead_miles', label: 'Dead miles rate', unit: '$/mi' },
    ],
    driver: [
      { key: 'driver_church_daily', label: 'Local church', unit: '$/day' },
      { key: 'driver_local_daily', label: 'Under 200 miles', unit: '$/day' },
      { key: 'driver_short_first_day', label: '200 to 429 miles, first day', unit: '$' },
      { key: 'driver_extra_day', label: 'Extra day', unit: '$/day' },
      { key: 'driver_per_mile', label: '430 to 999 miles', unit: '$/mi' },
      { key: 'driver_per_mile_1k_one', label: '1,000+ miles, 1 driver', unit: '$/mi' },
      { key: 'driver_per_mile_1k_two', label: '1,000+ miles, 2 drivers', unit: '$/mi' },
      { key: 'driver_meal_daily', label: 'Meal allowance', unit: '$/day' },
    ],
  };

  /* ── THE FORMULAS ─────────────────────────────────────────────────────────
     `null` is the spreadsheet's #N/A. The trip total counts it as $0, as the
     sheet's IFERROR does. Each comment names the cell it reproduces. */

  const sum = list => list.reduce((a, b) => a + b, 0);

  // P9 and AF20: the last day with more than 0 miles, or null when none has.
  const lastDay = list => {
    for (let i = list.length - 1; i >= 0; i--) if (list[i] > 0) return i + 1;
    return null;
  };

  // R9: whole 250-mile steps, 1 or 2 give 1 day, then half a day a step, to 40.
  const tripFreeDays = miles => {
    const steps = Math.floor(miles / 250);
    if (steps < 1 || steps > 40) return null;
    return steps <= 2 ? 1 : steps / 2;
  };

  // AF21: the same steps, but 1 to 3 give 1 day, and the table stops at 24.
  const driverFreeDays = miles => {
    const steps = Math.floor(miles / 250);
    if (steps < 1 || steps > 24) return null;
    return steps <= 3 ? 1 : steps / 2;
  };

  // E17, with N9, P9 and T9.
  const tripQuote = ({ miles, rate, dead }, r) => {
    const total = sum(miles);
    const days = lastDay(miles);
    const out = { total, days, local: total < 295, free: null, extra: null, amount: null };
    if (days === null) return out;
    if (out.local) {
      out.amount = days * r.trip_local_daily;
      return out;
    }
    out.free = tripFreeDays(total);
    if (out.free === null) return out;
    out.extra = Math.max(0, days - out.free);
    out.amount = rate * (total - dead) + dead * r.trip_dead_miles + r.trip_extra_day * out.extra;
    return out;
  };

  // E18, with AF18 to AF22. `drivers` is AF17; `church` is AF5.
  const driverPay = ({ driver1, driver2, drivers, church }, r) => {
    const perDay = driver1.map((m, i) => m + (driver2[i] || 0));
    const total = sum(perDay);
    const days = lastDay(perDay);
    const free = driverFreeDays(total);
    const extra = free === null || days === null ? null : Math.max(0, days - free);
    const out = { total, days, free, extra, meal: days === null ? null : r.driver_meal_daily * days, band: null, amount: null };
    if (days === null) return out;
    if (church) { out.band = 'church'; out.amount = r.driver_church_daily * days; return out; }
    if (total < 200) { out.band = 'under200'; out.amount = r.driver_local_daily * days; return out; }
    if (total < 430) { out.band = 'under430'; out.amount = r.driver_short_first_day + r.driver_extra_day * (days - 1); return out; }
    if (extra === null) return out;
    const perMile = total < 1000 ? r.driver_per_mile
      : drivers === 2 ? r.driver_per_mile_1k_two : r.driver_per_mile_1k_one;
    out.band = total < 1000 ? 'under1000' : 'over1000';
    out.amount = total * perMile + r.driver_extra_day * extra;
    return out;
  };

  // The console can check a quote against the spreadsheet with these.
  window.Rux = window.Rux || {};
  window.Rux.quote = { tripQuote, driverPay, tripFreeDays, driverFreeDays };

  /* ── THE PAGE ─────────────────────────────────────────────────────────── */

  const $ = id => document.getElementById(id);
  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const count = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
  const num = value => {
    const n = parseFloat(String(value ?? '').replace(/[$,\s]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };
  const plural = (n, one, many) => `${count.format(n)} ${n === 1 ? one : many}`;

  const rates = Object.fromEntries([...RATE_FIELDS.trip, ...RATE_FIELDS.driver].map(f => [f.key, 0]));
  let mileage = [];          // [{ id, rate, note, is_default }] as saved
  let dayCount = 1;
  let client = null;
  let canSave = false;

  const say = (text, link) => {
    $('scheduler-quote-notice-text').textContent = text || '';
    $('scheduler-quote-notice-link').hidden = !link;
    $('scheduler-quote-notice').hidden = !text;
  };

  // A text field built the way the page's static ones are.
  const textField = ({ id, label, value = '', hidden = false, placeholder = '' }) => {
    const item = document.createElement('div');
    item.className = 'rux--form-item rux--text-input-wrapper';
    const input = Object.assign(document.createElement('input'), {
      id, className: 'rux--text-input', type: 'text', inputMode: 'decimal', autocomplete: 'off', value, placeholder,
    });
    const labelEl = Object.assign(document.createElement('label'), { className: 'rux--label' + (hidden ? ' rux--visually-hidden' : ''), htmlFor: id, textContent: label });
    const labelWrap = document.createElement('div');
    labelWrap.className = 'rux--text-input__label-wrapper';
    labelWrap.append(labelEl);
    const outer = document.createElement('div');
    outer.className = 'rux--text-input__field-outer-wrapper';
    const inner = document.createElement('div');
    inner.className = 'rux--text-input__field-wrapper';
    inner.append(input);
    outer.append(inner);
    item.append(labelWrap, outer);
    return item;
  };

  /* ── Calculator ── */

  const driversChosen = () => parseInt($('scheduler-quote-drivers').value, 10) || 0;

  const drawDays = () => {
    const rows = $('scheduler-quote-day-rows');
    const kept = [...rows.querySelectorAll('input')].reduce((m, i) => (m[i.id] = i.value, m), {});
    rows.replaceChildren();
    for (let d = 1; d <= dayCount; d++) {
      const row = document.createElement('div');
      row.className = 'scheduler-quote-days__row';
      const day = document.createElement('span');
      day.className = 'scheduler-quote-days__day';
      day.textContent = d;
      row.append(day);
      for (const [col, name] of [['trip', 'trip miles'], ['d1', 'driver 1 miles'], ['d2', 'driver 2 miles']]) {
        const id = `scheduler-quote-${col}-${d}`;
        const field = textField({ id, label: `Day ${d} ${name}`, hidden: true, value: kept[id] ?? '', placeholder: '0' });
        if (col !== 'trip') field.dataset.driver = col === 'd1' ? '1' : '2';
        row.append(field);
      }
      rows.append(row);
    }
    $('scheduler-quote-add-day').disabled = dayCount >= MAX_DAYS;
    $('scheduler-quote-remove-day').disabled = dayCount <= 1;
    showDrivers();
  };

  const showDrivers = () => {
    const n = driversChosen();
    const grid = $('scheduler-quote-days');
    grid.style.setProperty('--scheduler-quote-cols', String(1 + n));
    for (const el of grid.querySelectorAll('[data-driver]')) el.hidden = Number(el.dataset.driver) > n;
    $('scheduler-quote-church-item').hidden = n === 0;
  };

  const column = col => Array.from({ length: dayCount }, (_, i) => Math.max(0, num($(`scheduler-quote-${col}-${i + 1}`)?.value)));

  // Dead miles and other charges count only while their switch is on.
  const extrasOn = () => $('scheduler-quote-extras').getAttribute('aria-checked') === 'true';

  const compute = () => {
    const n = driversChosen();
    const extras = extrasOn();
    $('scheduler-quote-extras-fields').hidden = !extras;
    const trip = tripQuote({ miles: column('trip'), rate: num($('scheduler-quote-rate').value), dead: extras ? num($('scheduler-quote-dead').value) : 0 }, rates);
    const driver = n === 0 ? null : driverPay({
      driver1: column('d1'),
      driver2: n === 2 ? column('d2') : column('d2').map(() => 0),
      drivers: n,
      church: $('scheduler-quote-church').checked,
    }, rates);
    const other = extras ? num($('scheduler-quote-other').value) : 0;
    const total = other + (trip.amount ?? 0) + (driver?.amount ?? 0);

    $('scheduler-quote-miles-out').textContent = trip.days === null ? '—' : count.format(trip.total);
    $('scheduler-quote-miles-note').textContent = trip.days === null ? 'Enter miles for at least one day' : plural(trip.days, 'day', 'days');

    $('scheduler-quote-mileage').textContent = trip.amount === null ? '—' : money.format(trip.amount);
    $('scheduler-quote-mileage-note').textContent =
      trip.days === null ? 'No miles yet'
      : trip.local ? `Local · ${plural(trip.days, 'day', 'days')} at the daily rate`
      : trip.free === null ? 'Past the free-day table, counted as $0'
      : `${plural(trip.free, 'free day', 'free days')} · ${plural(trip.extra, 'extra day', 'extra days')}`;

    $('scheduler-quote-driver').textContent = driver?.amount == null ? '—' : money.format(driver.amount);
    const driverMiles = driver ? plural(driver.total, 'mile', 'miles') : '';
    const meal = driver?.meal == null ? '' : ` · meals ${money.format(driver.meal)}, not included`;
    $('scheduler-quote-driver-note').textContent =
      !driver ? 'No drivers on this quote'
      : driver.days === null ? 'Enter driver miles for at least one day'
      : driver.band === 'church' ? `${driverMiles} · local church${meal}`
      : driver.band === 'under200' ? `${driverMiles} · under 200 miles${meal}`
      : driver.band === 'under430' ? `${driverMiles} · 200 to 429 miles${meal}`
      : driver.amount === null ? 'Past the free-day table, counted as $0'
      : `${driverMiles} · ${plural(driver.free, 'free day', 'free days')} · ${plural(driver.extra, 'extra day', 'extra days')}${meal}`;

    $('scheduler-quote-total').textContent = money.format(total);
    $('scheduler-quote-total-note').textContent = other ? `Includes ${money.format(other)} other charges` : 'Mileage and driver pay';
  };

  // Keeps the chosen rate while it still exists; `fresh` starts from the default.
  const drawRateSelect = (fresh = false) => {
    const select = $('scheduler-quote-rate');
    const current = fresh ? '' : select.value;
    const sorted = [...mileage].sort((a, b) => a.rate - b.rate);
    select.replaceChildren(...sorted.map(m => Object.assign(document.createElement('option'), {
      className: 'rux--select-option',
      value: String(m.rate),
      textContent: `${money.format(m.rate)}${m.note ? ` · ${m.note}` : ''}`,
    })));
    const keep = sorted.find(m => String(m.rate) === current) ?? sorted.find(m => m.is_default) ?? sorted[0];
    if (keep) select.value = String(keep.rate);
    select.disabled = !sorted.length;
  };

  /* ── Rates tab ── */

  const drawRates = () => {
    for (const group of ['trip', 'driver']) {
      $(`scheduler-quote-rates-${group}`).replaceChildren(...RATE_FIELDS[group].map(f =>
        textField({ id: `scheduler-quote-r-${f.key}`, label: `${f.label} (${f.unit})`, value: String(rates[f.key] ?? 0) })));
    }
    $('scheduler-quote-mileage-rows').replaceChildren();
    for (const m of mileage) addRateRow(m);
    if (!mileage.length) addRateRow();
    showResult(null);
  };

  let rowSeq = 0;
  const addRateRow = (m = { id: null, rate: '', note: '', is_default: false }) => {
    const n = ++rowSeq;
    const row = document.createElement('div');
    row.className = 'scheduler-quote-mileage__row';
    row.dataset.id = m.id ?? '';
    const rate = textField({ id: `scheduler-quote-m-rate-${n}`, label: 'Rate in dollars per mile', hidden: true, value: m.rate === '' ? '' : String(m.rate), placeholder: '0.00' });
    const note = textField({ id: `scheduler-quote-m-note-${n}`, label: 'Note', hidden: true, value: m.note });
    note.querySelector('input').inputMode = 'text';

    const radio = document.createElement('div');
    radio.className = 'rux--radio-button-wrapper scheduler-quote-mileage__default';
    const input = Object.assign(document.createElement('input'), {
      id: `scheduler-quote-m-default-${n}`, className: 'rux--radio-button', type: 'radio', name: 'scheduler-quote-default', checked: !!m.is_default,
    });
    const label = document.createElement('label');
    label.className = 'rux--radio-button__label';
    label.htmlFor = input.id;
    label.innerHTML = '<span class="rux--radio-button__appearance"></span><span class="rux--radio-button__label-text rux--visually-hidden">Default rate</span>';
    radio.append(input, label);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'rux--btn rux--btn--ghost rux--btn--icon-only rux--btn--sm rux--layout--size-sm';
    remove.setAttribute('aria-label', 'Remove rate');
    remove.innerHTML = '<svg class="rux--btn__icon" width="16" height="16" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><use href="#i-trash-can"/></svg>';
    remove.addEventListener('click', () => row.remove());

    row.append(rate, note, radio, remove);
    $('scheduler-quote-mileage-rows').append(row);
    return row;
  };

  // Whole class names, so the check can find each one in this file.
  const RESULT_CLASS = {
    success: 'rux--inline-notification rux--inline-notification--success',
    error: 'rux--inline-notification rux--inline-notification--error',
  };
  const showResult = (kind, text) => {
    $('scheduler-quote-rates-result').hidden = !kind;
    if (!kind) return;
    $('scheduler-quote-rates-result-box').className = RESULT_CLASS[kind];
    $('scheduler-quote-rates-result-icon').setAttribute('href', kind === 'success' ? '#i-checkmark--filled' : '#i-error--filled');
    $('scheduler-quote-rates-result-text').textContent = text;
  };

  // The Rates tab's fields as rows to save, or a sentence saying what is wrong.
  const readRates = () => {
    const named = [];
    for (const f of [...RATE_FIELDS.trip, ...RATE_FIELDS.driver]) {
      const raw = $(`scheduler-quote-r-${f.key}`).value.trim();
      const value = Number(raw.replace(/[$,]/g, ''));
      if (raw === '' || !Number.isFinite(value) || value < 0) return { problem: `${f.label} needs a number of 0 or more.` };
      named.push({ key: f.key, value });
    }
    const list = [];
    for (const row of $('scheduler-quote-mileage-rows').children) {
      const inputs = row.querySelectorAll('input');
      const raw = inputs[0].value.trim();
      const note = inputs[1].value.trim();
      if (raw === '' && note === '') continue;
      const rate = Number(raw.replace(/[$,]/g, ''));
      if (raw === '' || !Number.isFinite(rate) || rate < 0) return { problem: 'Every mileage rate needs a number of 0 or more.' };
      list.push({ id: row.dataset.id || crypto.randomUUID(), rate, note, is_default: inputs[2].checked });
    }
    if (!list.length) return { problem: 'Add at least one mileage rate.' };
    if (!list.some(m => m.is_default)) list[0].is_default = true;
    return { named, list };
  };

  const load = async () => {
    const [named, miles] = await Promise.all([
      client.from('quote_rates').select('key,value'),
      client.from('quote_mileage_rates').select('id,rate,note,is_default'),
    ]);
    if (named.error || miles.error) throw new Error((named.error || miles.error).message);
    for (const row of named.data) if (row.key in rates) rates[row.key] = Number(row.value);
    mileage = miles.data.map(m => ({ ...m, rate: Number(m.rate) })).sort((a, b) => a.rate - b.rate);
  };

  const save = async () => {
    const { problem, named, list } = readRates();
    if (problem) return showResult('error', problem);
    // A local preview has no database: the rates apply to this visit only.
    if (!client) {
      for (const { key, value } of named) rates[key] = value;
      mileage = list.sort((a, b) => a.rate - b.rate);
      drawRates();
      drawRateSelect();
      compute();
      return showResult('success', 'Applied to this visit only. Nothing was saved.');
    }
    const button = $('scheduler-quote-rates-save');
    button.disabled = true;
    try {
      const keep = new Set(list.map(m => m.id));
      const gone = mileage.filter(m => !keep.has(m.id)).map(m => m.id);
      const chosen = list.find(m => m.is_default).id;
      // The old default is cleared first: at most one row may be the default,
      // and the database checks that row by row.
      const steps = [
        () => client.from('quote_rates').upsert(named),
        () => client.from('quote_mileage_rates').update({ is_default: false }).eq('is_default', true).neq('id', chosen),
        () => gone.length ? client.from('quote_mileage_rates').delete().in('id', gone) : { error: null },
        () => client.from('quote_mileage_rates').upsert(list),
      ];
      for (const step of steps) {
        const { error } = await step();
        if (error) throw new Error(error.message);
      }
      await load();
      drawRates();
      drawRateSelect();
      compute();
      showResult('success', 'Rates saved.');
    } catch {
      showResult('error', "The rates didn't save. Try again.");
    } finally {
      button.disabled = !canSave;
    }
  };

  /* ── Wiring ── */

  const form = $('scheduler-quote-form');
  form.addEventListener('input', compute);
  form.addEventListener('change', compute);
  // js/form-controls.js flips the switch and says so with `rux:toggle`.
  form.addEventListener('rux:toggle', compute);
  form.addEventListener('reset', () => setTimeout(() => {
    window.Rux.formControls?.toggle($('scheduler-quote-extras-toggle'), false);
    dayCount = 1;
    $('scheduler-quote-day-rows').replaceChildren();
    drawDays();
    // A reset puts the select on its first option, the cheapest rate.
    drawRateSelect(true);
    compute();
  }));
  $('scheduler-quote-drivers').addEventListener('change', showDrivers);
  $('scheduler-quote-add-day').addEventListener('click', () => {
    if (dayCount >= MAX_DAYS) return;
    dayCount++;
    drawDays();
    $(`scheduler-quote-trip-${dayCount}`)?.focus();
    compute();
  });
  $('scheduler-quote-remove-day').addEventListener('click', () => {
    if (dayCount <= 1) return;
    dayCount--;
    drawDays();
    compute();
  });
  $('scheduler-quote-add-rate').addEventListener('click', () => addRateRow().querySelector('input').focus());
  $('scheduler-quote-rates-form').addEventListener('submit', e => { e.preventDefault(); save(); });
  $('scheduler-quote-rates-revert').addEventListener('click', drawRates);

  const start = () => {
    $('scheduler-quote-app').hidden = false;
    drawDays();
    drawRates();
    drawRateSelect();
    compute();
    $('scheduler-quote-rates-save').disabled = !canSave;
  };

  // The same staff gate as the schedule, which is where a log-in happens.
  const headerBtns = [
    document.querySelector('.scheduler-menu-trigger'),
    document.querySelector('.rux--header__action[aria-controls="rux-account-panel"]'),
  ].filter(Boolean);
  const switcherBtn = document.querySelector('.rux--header__action[aria-controls="rux-switcher-panel"]');

  (async () => {
    const account = window.Rux?.account;
    if (!account?.staffProfile) {
      say('This preview has no log-in, so the rates start blank and apply to this visit only. Add ?cloud to the address to load them.');
      canSave = true;
      start();
      return;
    }
    let staff = null;
    try { staff = await account.staffProfile(); } catch { /* the notice shows */ }
    if (!staff) {
      say('The quote calculator needs a staff log-in.', true);
      return;
    }
    for (const btn of headerBtns) btn.hidden = false;
    if (switcherBtn) switcherBtn.hidden = !staff.sees_all_apps;
    client = account.client;
    try {
      await load();
      canSave = true;
    } catch {
      say("The rates didn't load. Reload the page to try again.");
    }
    start();
    account.onAuthChange(event => {
      if (event !== 'SIGNED_OUT') return;
      $('scheduler-quote-app').hidden = true;
      for (const btn of headerBtns) btn.hidden = true;
      say('You were logged out.', true);
    });
  })();
})();
