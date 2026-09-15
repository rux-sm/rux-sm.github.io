/* ==========================================================================
   quote.js — THE QUOTE CALCULATOR AND ITS RATES
   --------------------------------------------------------------------------
   The office spreadsheet's Calculator tab, formula for formula, quirks
   included; scheduler/docs/quote-calculator.md lists them. One script for two
   pages: quote.html works a quote out, and quote-rates.html edits the rates it
   uses. The rates are rows in `quote_rates` and `quote_mileage_rates`, which
   only a staff session can read or write, so no rate is written in this
   public file.

   The regular quote pays for one driver. Choosing two adds the second
   driver's pay, worked out on both drivers' combined miles, which are the
   trip's miles; how they are split between the drivers does not change it.

   A local preview has no account layer. Both pages still draw, and rates
   saved on the rates page are kept in this browser tab only, so the
   calculator can be tried without the database.
   ========================================================================== */
(() => {
  'use strict';

  const MAX_DAYS = 20;
  const PREVIEW_KEY = 'rux.scheduler.quote-preview';

  // Every named rate, in the order the rates page shows them. `key` is the
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

  /* ── SHARED BY BOTH PAGES ─────────────────────────────────────────────── */

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

  const load = async () => {
    const [named, miles] = await Promise.all([
      client.from('quote_rates').select('key,value'),
      client.from('quote_mileage_rates').select('id,rate,note,is_default'),
    ]);
    if (named.error || miles.error) throw new Error((named.error || miles.error).message);
    for (const row of named.data) if (row.key in rates) rates[row.key] = Number(row.value);
    mileage = miles.data.map(m => ({ ...m, rate: Number(m.rate) })).sort((a, b) => a.rate - b.rate);
  };

  // A local preview keeps its rates in sessionStorage, which a browser may
  // refuse, so a failed read leaves the rates blank and a failed write says so.
  const loadPreview = () => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(PREVIEW_KEY) || 'null');
      if (!saved) return;
      for (const key in rates) if (Number.isFinite(saved.rates?.[key])) rates[key] = saved.rates[key];
      if (Array.isArray(saved.mileage)) mileage = saved.mileage;
    } catch { /* the rates stay blank */ }
  };
  const savePreview = () => {
    try {
      sessionStorage.setItem(PREVIEW_KEY, JSON.stringify({ rates, mileage }));
      return true;
    } catch {
      return false;
    }
  };

  /* ── THE CALCULATOR (quote.html) ──────────────────────────────────────── */

  const calculator = () => {
    const form = $('scheduler-quote-form');
    let dayCount = 1;

    const driversChosen = () => parseInt($('scheduler-quote-drivers').value, 10) || 1;

    const drawDays = () => {
      const rows = $('scheduler-quote-day-rows');
      const kept = [...rows.querySelectorAll('input')].reduce((m, i) => (m[i.id] = i.value, m), {});
      rows.replaceChildren();
      for (let d = 1; d <= dayCount; d++) {
        const id = `scheduler-quote-trip-${d}`;
        rows.append(textField({ id, label: `Day ${d}`, value: kept[id] ?? '', placeholder: '0' }));
      }
      $('scheduler-quote-add-day').disabled = dayCount >= MAX_DAYS;
      $('scheduler-quote-remove-day').disabled = dayCount <= 1;
      showDrivers();
    };

    // Local church changes only the second driver's pay.
    const showDrivers = () => {
      $('scheduler-quote-church-item').hidden = driversChosen() < 2;
    };

    const column = col => Array.from({ length: dayCount }, (_, i) => Math.max(0, num($(`scheduler-quote-${col}-${i + 1}`)?.value)));

    // Dead miles and other charges count only while their switch is on.
    const extrasOn = () => $('scheduler-quote-extras').getAttribute('aria-checked') === 'true';

    const compute = () => {
      const n = driversChosen();
      const extras = extrasOn();
      $('scheduler-quote-extras-fields').hidden = !extras;

      const trip = column('trip');
      const quote = tripQuote({ miles: trip, rate: num($('scheduler-quote-rate').value), dead: extras ? num($('scheduler-quote-dead').value) : 0 }, rates);
      // The second driver's pay. The formula reads only the two drivers'
      // combined miles and their last day, so any split of each day's miles
      // gives the same pay, and halves stand in for it.
      const half = trip.map(miles => miles / 2);
      const driver = n < 2 ? null : driverPay({
        driver1: half,
        driver2: half,
        drivers: 2,
        church: $('scheduler-quote-church').checked,
      }, rates);
      const other = extras ? num($('scheduler-quote-other').value) : 0;
      const total = other + (quote.amount ?? 0) + (driver?.amount ?? 0);

      const miles = plural(quote.total, 'mile', 'miles');
      $('scheduler-quote-mileage').textContent = quote.amount === null ? '—' : money.format(quote.amount);
      $('scheduler-quote-mileage-note').textContent =
        quote.days === null ? 'No miles yet'
        : quote.local ? `${miles} · ${plural(quote.days, 'local day', 'local days')}`
        : quote.free === null ? `${miles} · past the free-day table, counted as $0`
        : `${miles} · ${plural(quote.days, 'day', 'days')} · ${plural(quote.free, 'free day', 'free days')} · ${plural(quote.extra, 'extra day', 'extra days')}`;

      $('scheduler-quote-driver-line').hidden = !driver;
      if (driver) {
        const driverMiles = `${plural(driver.total, 'mile', 'miles')} combined`;
        const meal = driver.meal == null ? '' : ` · meals ${money.format(driver.meal)} not included`;
        $('scheduler-quote-driver').textContent = driver.amount == null ? '—' : money.format(driver.amount);
        $('scheduler-quote-driver-note').textContent =
          driver.days === null ? 'No driver miles yet'
          : driver.band === 'church' ? `${driverMiles} · church rate${meal}`
          : driver.band === 'under200' ? `${driverMiles} · under-200 rate${meal}`
          : driver.band === 'under430' ? `${driverMiles} · 200-to-429 rate${meal}`
          : driver.amount === null ? `${driverMiles} · past the free-day table, counted as $0`
          : `${driverMiles} · ${plural(driver.free, 'free day', 'free days')} · ${plural(driver.extra, 'extra day', 'extra days')}${meal}`;
      }

      $('scheduler-quote-other-line').hidden = !extras;
      $('scheduler-quote-other-out').textContent = money.format(other);

      // Two totals, one showing at each width: the quote's own, and the bar's.
      $('scheduler-quote-total').textContent = money.format(total);
      $('scheduler-quote-bar-total').textContent = money.format(total);
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

    return {
      app: form,
      preview: 'This preview has no log-in, so the rates are blank until they are saved on the rates page. Add ?cloud to the address to load the real ones.',
      start: () => {
        drawDays();
        drawRateSelect();
        compute();
      },
    };
  };

  /* ── THE RATES (quote-rates.html) ─────────────────────────────────────── */

  const ratesPage = () => {
    const form = $('scheduler-quote-rates-form');

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

    // The page's fields as rows to save, or a sentence saying what is wrong.
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

    const save = async () => {
      const { problem, named, list } = readRates();
      if (problem) return showResult('error', problem);
      // A local preview has no database: the rates go to this browser tab.
      if (!client) {
        for (const { key, value } of named) rates[key] = value;
        mileage = list.sort((a, b) => a.rate - b.rate);
        const kept = savePreview();
        drawRates();
        return showResult('success', kept
          ? 'Kept in this browser tab for the calculator. Nothing was saved.'
          : 'Applied to this page only. Nothing was saved.');
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
        showResult('success', 'Rates saved.');
      } catch {
        showResult('error', "The rates didn't save. Try again.");
      } finally {
        button.disabled = !canSave;
      }
    };

    $('scheduler-quote-add-rate').addEventListener('click', () => addRateRow().querySelector('input').focus());
    form.addEventListener('submit', e => { e.preventDefault(); save(); });
    $('scheduler-quote-rates-revert').addEventListener('click', drawRates);

    return {
      app: form,
      preview: 'This preview has no log-in, so rates saved here stay in this browser tab. Add ?cloud to the address to load the real ones.',
      start: () => {
        drawRates();
        $('scheduler-quote-rates-save').disabled = !canSave;
      },
    };
  };

  /* ── THE STAFF GATE ───────────────────────────────────────────────────── */

  const page = $('scheduler-quote-form') ? calculator()
    : $('scheduler-quote-rates-form') ? ratesPage()
    : null;
  if (!page) return;

  const show = () => {
    page.app.hidden = false;
    page.start();
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
      say(page.preview);
      loadPreview();
      canSave = true;
      show();
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
    show();
    account.onAuthChange(event => {
      if (event !== 'SIGNED_OUT') return;
      page.app.hidden = true;
      for (const btn of headerBtns) btn.hidden = true;
      say('You were logged out.', true);
    });
  })();
})();
