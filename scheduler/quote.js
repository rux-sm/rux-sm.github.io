/* ==========================================================================
   quote.js — THE QUOTE CALCULATOR AND ITS RATES
   --------------------------------------------------------------------------
   The office spreadsheet's Calculator tab, formula for formula, quirks
   included; quote.html's Rules tab lists them, with examples worked out here
   from the saved rates. One script for two pages: quote.html works a quote
   out, and quote-rates.html edits the rates it uses. The rates are rows in
   `quote_rates` and `quote_mileage_rates`, which only a staff session can
   read or write, so no rate is written in this public file.

   The regular quote pays for one driver. Choosing two adds the second
   driver's pay, worked out on both drivers' combined miles, which are the
   trip's miles; how they are split between the drivers does not change it.

   A local preview has no account layer. Both pages still draw, and rates
   saved on the rates page are kept in this browser tab only, so the
   calculator can be tried without the database.
   ========================================================================== */
(() => {
  'use strict';

  const PREVIEW_KEY = 'rux.scheduler.quote-preview';

  // Every named rate, in the order the rates page shows them. `key` is the
  // `quote_rates` row; `unit` decides the field's hint. A driver pay band's
  // label names the band's miles, which are rules below.
  const mi = n => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n);
  const labelOf = (f, r) => (typeof f.label === 'function' ? f.label(r) : f.label);
  const RATE_FIELDS = {
    trip: [
      { key: 'trip_local_daily', label: 'Local daily rate', unit: '$/day' },
      { key: 'trip_extra_day', label: 'Long distance extra day', unit: '$/day' },
      { key: 'trip_dead_miles', label: 'Dead miles rate', unit: '$/mi' },
    ],
    driver: [
      { key: 'driver_local_daily', label: r => `Under ${mi(r.driver_band_2)} miles`, unit: '$/day' },
      { key: 'driver_short_first_day', label: r => `${mi(r.driver_band_2)} to ${mi(r.driver_band_3 - 1)} miles, first day`, unit: '$' },
      { key: 'driver_extra_day', label: 'Extra day', unit: '$/day' },
      { key: 'driver_per_mile', label: r => `${mi(r.driver_band_3)} to ${mi(r.driver_band_4 - 1)} miles`, unit: '$/mi' },
      { key: 'driver_per_mile_1k_one', label: r => `${mi(r.driver_band_4)}+ miles, 1 driver`, unit: '$/mi' },
      { key: 'driver_per_mile_1k_two', label: r => `${mi(r.driver_band_4)}+ miles, 2 drivers`, unit: '$/mi' },
      { key: 'driver_meal_daily', label: 'Meal allowance', unit: '$/day' },
    ],
  };

  /* The rules the formulas follow, kept in `quote_rates` beside the rates
     and edited on the same page. `value` is the spreadsheet's, used until a
     rule is saved, so a quote reads the same before and after. A driver band
     starts at its miles. */
  const RULE_FIELDS = {
    trip: [
      { key: 'trip_local_under', label: 'Local trips are under', unit: 'mi', value: 295 },
      { key: 'free_day_step', label: 'Free-day step', unit: 'mi', value: 250 },
      { key: 'free_days_per_step', label: 'Free days a step', unit: 'days', value: 0.5 },
      { key: 'trip_one_free_day_under', label: 'One free day under', unit: 'mi', value: 750 },
      { key: 'trip_free_days_end', label: 'Free days stop at', unit: 'mi', value: 10250 },
      { key: 'max_days', label: 'Most days in a quote', unit: 'days', value: 20, whole: true },
    ],
    driver: [
      { key: 'driver_band_2', label: 'Second band starts at', unit: 'mi', value: 200 },
      { key: 'driver_band_3', label: 'Third band starts at', unit: 'mi', value: 430 },
      { key: 'driver_band_4', label: 'Fourth band starts at', unit: 'mi', value: 1000 },
      { key: 'driver_one_free_day_under', label: 'One free day under', unit: 'mi', value: 1000 },
      { key: 'driver_free_days_end', label: 'Free days stop at', unit: 'mi', value: 6250 },
    ],
  };
  const RULE_DEFAULTS = Object.fromEntries([...RULE_FIELDS.trip, ...RULE_FIELDS.driver].map(f => [f.key, f.value]));
  // A rule from a set of rates, or the spreadsheet's while it is not saved.
  const rule = (r, key) => (Number.isFinite(r?.[key]) ? r[key] : RULE_DEFAULTS[key]);

  /* ── THE FORMULAS ─────────────────────────────────────────────────────────
     `null` is the spreadsheet's #N/A. The trip total counts it as $0, as the
     sheet's IFERROR does. Each comment names the cell it reproduces. */

  const sum = list => list.reduce((a, b) => a + b, 0);

  // P9 and AF20: the last day with more than 0 miles, or null when none has.
  const lastDay = list => {
    for (let i = list.length - 1; i >= 0; i--) if (list[i] > 0) return i + 1;
    return null;
  };

  /* R9 and AF21: whole free-day steps of miles. Under one step there is no
     table; under the one-free-day line it gives 1 day; past it, the free days
     a step for every step; from where the table stops, null. The sheet's
     steps are 250 miles and half a day, 1 day under 750 and 1,000 miles, and
     the tables stop at 10,250 and 6,250. */
  const freeDays = (miles, r, oneDayUnder, end) => {
    const steps = Math.floor(miles / rule(r, 'free_day_step'));
    if (steps < 1 || miles >= rule(r, end)) return null;
    return miles < rule(r, oneDayUnder) ? 1 : steps * rule(r, 'free_days_per_step');
  };
  const tripFreeDays = (miles, r) => freeDays(miles, r, 'trip_one_free_day_under', 'trip_free_days_end');
  const driverFreeDays = (miles, r) => freeDays(miles, r, 'driver_one_free_day_under', 'driver_free_days_end');

  // E17, with N9, P9 and T9.
  const tripQuote = ({ miles, rate, dead }, r) => {
    const total = sum(miles);
    const days = lastDay(miles);
    const out = { total, days, local: total < rule(r, 'trip_local_under'), free: null, extra: null, amount: null };
    if (days === null) return out;
    if (out.local) {
      out.amount = days * r.trip_local_daily;
      return out;
    }
    out.free = tripFreeDays(total, r);
    if (out.free === null) return out;
    out.extra = Math.max(0, days - out.free);
    out.amount = rate * (total - dead) + dead * r.trip_dead_miles + r.trip_extra_day * out.extra;
    return out;
  };

  // E18, with AF18 to AF22. `drivers` is AF17. The sheet's local church
  // choice, AF5, is not offered.
  const driverPay = ({ driver1, driver2, drivers }, r) => {
    const perDay = driver1.map((m, i) => m + (driver2[i] || 0));
    const total = sum(perDay);
    const days = lastDay(perDay);
    const free = driverFreeDays(total, r);
    const extra = free === null || days === null ? null : Math.max(0, days - free);
    const out = { total, days, free, extra, meal: days === null ? null : r.driver_meal_daily * days, band: null, amount: null };
    if (days === null) return out;
    if (total < rule(r, 'driver_band_2')) { out.band = 1; out.amount = r.driver_local_daily * days; return out; }
    if (total < rule(r, 'driver_band_3')) { out.band = 2; out.amount = r.driver_short_first_day + r.driver_extra_day * (days - 1); return out; }
    if (extra === null) return out;
    const long = total >= rule(r, 'driver_band_4');
    const perMile = !long ? r.driver_per_mile
      : drivers === 2 ? r.driver_per_mile_1k_two : r.driver_per_mile_1k_one;
    out.band = long ? 4 : 3;
    out.amount = total * perMile + r.driver_extra_day * extra;
    return out;
  };

  // The console can check a quote against the spreadsheet with these.
  window.Rux = window.Rux || {};
  window.Rux.quote = { tripQuote, driverPay, tripFreeDays, driverFreeDays, rule };

  /* ── SHARED BY BOTH PAGES ─────────────────────────────────────────────── */

  const $ = id => document.getElementById(id);
  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const count = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
  const num = value => {
    const n = parseFloat(String(value ?? '').replace(/[$,\s]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };
  const plural = (n, one, many) => `${count.format(n)} ${n === 1 ? one : many}`;

  const rates = { ...Object.fromEntries([...RATE_FIELDS.trip, ...RATE_FIELDS.driver].map(f => [f.key, 0])), ...RULE_DEFAULTS };
  let mileage = [];          // [{ id, rate, note, is_default }] as saved
  let client = null;
  let canSave = false;

  const say = text => {
    $('scheduler-quote-notice-text').textContent = text || '';
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

  // A charge's working, a line a part: each count times its rate. A falsy
  // part is left out, and every line after the first starts with a plus.
  const times = (n, one, many, rate) => `${plural(n, one, many)} × ${money.format(rate)}`;
  const lines = parts => parts.filter(Boolean).map((p, i) => (i ? `+ ${p}` : p)).join('\n');

  // The second driver's pay, worked the way its band works it.
  const driverMath = d => d.amount === null ? ''
    : d.band === 1 ? times(d.days, 'day', 'days', rates.driver_local_daily)
    : d.band === 2 ? lines([
      `${money.format(rates.driver_short_first_day)} first day`,
      d.days > 1 && times(d.days - 1, 'day', 'days', rates.driver_extra_day),
    ])
    : lines([
      times(d.total, 'mi', 'mi', d.band === 3 ? rates.driver_per_mile : rates.driver_per_mile_1k_two),
      d.extra > 0 && times(d.extra, 'extra day', 'extra days', rates.driver_extra_day),
    ]);

  /* The Rules tab's examples, each one quirk shown on small trips at the
     saved rates and the chosen mileage rate, a line a trip: what it is, then
     its figure. A trip's total miles are spread over its days, the remainder
     on the first; the second driver's trips run 10 days. */
  const spread = (total, days) => Array.from({ length: days }, (_, i) =>
    Math.floor(total / days) + (i === 0 ? total % days : 0));
  const priced = (miles, rate) => money.format(tripQuote({ miles, rate, dead: 0 }, rates).amount ?? 0);
  const secondDriver = (total, days) => {
    const half = spread(total, days).map(m => m / 2);
    return money.format(driverPay({ driver1: half, driver2: half, drivers: 2 }, rates).amount ?? 0);
  };
  /* The Rules tab's chart: a trip's price by its total miles, for the chosen
     number of days, beside what it would be if the quote charged whichever
     is higher of the local days and the mileage price. An SVG built here,
     every colour a token from app.css, so it follows the theme. */
  const SVG = 'http://www.w3.org/2000/svg';
  const CHART = { w: 640, h: 280, left: 64, right: 16, top: 12, bottom: 36, from: 100, to: 1400, step: 5 };
  const svgEl = (name, attrs, text) => {
    const node = document.createElementNS(SVG, name);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (text != null) node.textContent = text;
    return node;
  };
  const whole = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const drawChart = rate => {
    const host = $('scheduler-quote-chart');
    const days = Number($('scheduler-quote-chart-days').value) || 3;
    const today = m => tripQuote({ miles: spread(m, days), rate, dead: 0 }, rates).amount ?? 0;
    const higher = m => Math.max(days * rates.trip_local_daily, today(m));
    const miles = [];
    for (let m = CHART.from; m <= CHART.to; m += CHART.step) miles.push(m);
    const top = Math.max(1, ...miles.map(higher), ...miles.map(today));
    // A y step of 1, 2 or 5 times a power of ten, about five of them.
    const raw = top / 5, pow = 10 ** Math.floor(Math.log10(raw));
    const yStep = [1, 2, 5, 10].map(n => n * pow).find(n => n >= raw);
    const yMax = Math.ceil(top / yStep) * yStep;
    const { w, h, left, right, top: pad, bottom } = CHART;
    const x = m => left + (m - CHART.from) / (CHART.to - CHART.from) * (w - left - right);
    const y = v => pad + (1 - v / yMax) * (h - pad - bottom);
    const line = (fn, cls) => svgEl('polyline', { class: cls, points: miles.map(m => `${x(m).toFixed(1)},${y(fn(m)).toFixed(1)}`).join(' ') });

    const svg = svgEl('svg', { viewBox: `0 0 ${w} ${h}`, role: 'img', 'aria-labelledby': 'scheduler-quote-chart-h scheduler-quote-chart-note' });
    for (let v = 0; v <= yMax; v += yStep) {
      svg.append(svgEl('line', { class: 'scheduler-quote-chart__grid', x1: left, x2: w - right, y1: y(v), y2: y(v) }),
        svgEl('text', { class: 'scheduler-quote-chart__tick', x: left - 8, y: y(v) + 4, 'text-anchor': 'end' }, whole.format(v)));
    }
    for (let m = 200; m <= CHART.to; m += 200) {
      svg.append(svgEl('text', { class: 'scheduler-quote-chart__tick', x: x(m), y: h - bottom + 18, 'text-anchor': 'middle' }, count.format(m)));
    }
    svg.append(svgEl('text', { class: 'scheduler-quote-chart__tick', x: w - right, y: h - 4, 'text-anchor': 'end' }, 'total miles'));
    const at = rates.trip_local_under, under = at - 1;
    if (at > CHART.from && at < CHART.to) {
      svg.append(svgEl('line', { class: 'scheduler-quote-chart__mark', x1: x(at), x2: x(at), y1: pad, y2: h - bottom }),
        svgEl('text', { class: 'scheduler-quote-chart__tick', x: x(at) + 6, y: pad + 12 }, `${count.format(at)} mi`));
    }
    svg.append(line(higher, 'scheduler-quote-chart__higher'), line(today, 'scheduler-quote-chart__today'));
    host.replaceChildren(svg);

    const drop = today(under) - today(at);
    const back = miles.find(m => m >= at && today(m) >= today(under));
    $('scheduler-quote-chart-note').textContent = !rate ? 'Pick a mileage rate on the Calculator tab to draw the chart.'
      : drop <= 0 ? `At ${plural(days, 'day', 'days')} the price does not drop at ${count.format(at)} miles.`
      : `At ${plural(days, 'day', 'days')} the price drops ${whole.format(drop)} at ${count.format(at)} miles${back ? `, and is back to the ${count.format(under)}-mile price by ${count.format(back)} miles` : ''}.`;
  };
  let chartRate = 0;

  const drawRules = rate => {
    chartRate = rate;
    drawChart(rate);
    // The rules' own figures in the tab's sentences, as saved; `key:-1` is
    // one under the rule.
    for (const node of document.querySelectorAll('[data-quote-rule]')) {
      const [key, shift] = node.dataset.quoteRule.split(':');
      node.textContent = count.format(rates[key] + Number(shift || 0));
    }
    $('scheduler-quote-rules-rate').textContent = rate ? `${money.format(rate)} a mile` : 'chosen';
    const meal = rates.driver_meal_daily;
    const miles = n => `${count.format(n)} mi`;
    const local = rates.trip_local_under, oneDay = rates.trip_one_free_day_under;
    const tripEnd = rates.trip_free_days_end, driverEnd = rates.driver_free_days_end;
    const longDays = Math.min(20, rates.max_days);
    const example = [
      [[`${miles(local - 1)}, 3 days`, priced(spread(local - 1, 3), rate)], [`${miles(local)}, 3 days`, priced(spread(local, 3), rate)]],
      [[`${miles(local - 1)}, 1 day`, priced([local - 1], rate)], [`${miles(local)}, 1 day`, priced([local], rate)]],
      [['Miles on days 1 and 3', priced([100, 0, 100], rate)], ['Miles on days 1 and 2', priced([100, 100, 0], rate)]],
      [[`${miles(tripEnd - 1)}, ${longDays} days`, priced(spread(tripEnd - 1, longDays), rate)], [`${miles(tripEnd)}, ${longDays} days`, priced(spread(tripEnd, longDays), rate)],
        [`2nd driver, ${miles(driverEnd - 1)}`, secondDriver(driverEnd - 1, 10)], [`2nd driver, ${miles(driverEnd)}`, secondDriver(driverEnd, 10)]],
      [[`Quote, ${miles(oneDay)}`, plural(tripFreeDays(oneDay, rates) ?? 0, 'free day', 'free days')], [`Driver pay, ${miles(oneDay)}`, plural(driverFreeDays(oneDay, rates) ?? 0, 'free day', 'free days')]],
      [['Meals, 1 day', money.format(meal)], ['Meals, 3 days', money.format(meal * 3)]],
      [['No miles, $150 other', money.format(150)]],
      [[`${miles(oneDay - 1)}, 3 days`, priced(spread(oneDay - 1, 3), rate)], [`${miles(oneDay)}, 3 days`, priced(spread(oneDay, 3), rate)]],
    ];
    example.forEach((rows, i) => {
      $(`scheduler-quote-quirk-${i + 1}`).replaceChildren(...rows.map(([label, value]) => {
        const line = document.createElement('div');
        line.className = 'scheduler-quote-quirks__line';
        line.append(Object.assign(document.createElement('span'), { textContent: label }),
          Object.assign(document.createElement('span'), { textContent: value }));
        return line;
      }));
    });
  };

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
      $('scheduler-quote-add-day').disabled = dayCount >= rates.max_days;
      // Only the last day can be removed, so no day renumbers under a person,
      // and the button names the day it removes.
      const remove = $('scheduler-quote-remove-day');
      remove.hidden = dayCount <= 1;
      remove.firstChild.nodeValue = `Remove day ${dayCount}`;
    };

    const column = col => Array.from({ length: dayCount }, (_, i) => Math.max(0, num($(`scheduler-quote-${col}-${i + 1}`)?.value)));

    const compute = () => {
      const n = driversChosen();
      const trip = column('trip');
      const dead = num($('scheduler-quote-dead').value);
      const rate = num($('scheduler-quote-rate').value);
      const quote = tripQuote({ miles: trip, rate, dead }, rates);
      // Dead miles are part of the trip's miles, so more of them than the trip
      // has makes the mileage charge wrong. The field warns and the Mileage
      // note points to it; the quote still counts them.
      const deadWarn = quote.days !== null && dead > quote.total;
      $('scheduler-quote-dead-wrapper').classList.toggle('rux--text-input__field-wrapper--warning', deadWarn);
      $('scheduler-quote-dead').classList.toggle('rux--text-input--warning', deadWarn);
      // An svg has no `hidden` property, so the attribute is set directly.
      $('scheduler-quote-dead-icon').toggleAttribute('hidden', !deadWarn);
      $('scheduler-quote-dead-warning').textContent = deadWarn ? `More than the trip's ${plural(quote.total, 'mile', 'miles')}.` : '';
      // The second driver's pay. The formula reads only the two drivers'
      // combined miles and their last day, so any split of each day's miles
      // gives the same pay, and halves stand in for it.
      const half = trip.map(miles => miles / 2);
      const driver = n < 2 ? null : driverPay({
        driver1: half,
        driver2: half,
        drivers: 2,
      }, rates);
      const other = num($('scheduler-quote-other').value);
      const total = other + (quote.amount ?? 0) + (driver?.amount ?? 0);

      // The miles and days lead the quote, so the notes under the charges
      // leave them out.
      $('scheduler-quote-miles-out').textContent = count.format(quote.total);
      $('scheduler-quote-days-out').textContent = count.format(quote.days ?? 0);

      $('scheduler-quote-mileage').textContent = quote.amount === null ? '—' : money.format(quote.amount);
      $('scheduler-quote-mileage-math').textContent = quote.amount === null ? ''
        : quote.local ? times(quote.days, 'day', 'days', rates.trip_local_daily)
        : lines([
          times(quote.total - dead, 'mi', 'mi', rate),
          dead > 0 && times(dead, 'dead mi', 'dead mi', rates.trip_dead_miles),
          quote.extra > 0 && times(quote.extra, 'extra day', 'extra days', rates.trip_extra_day),
        ]);
      $('scheduler-quote-mileage-note').textContent =
        quote.days === null ? 'No miles yet'
        : deadWarn ? 'Check dead miles'
        : quote.local ? 'Local daily rate'
        : quote.free === null ? 'Past the free-day table, counted as $0'
        : `${plural(quote.free, 'free day', 'free days')} · ${plural(quote.extra, 'extra day', 'extra days')}`;

      $('scheduler-quote-driver-line').hidden = !driver;
      // The meal allowance has a row of its own and is added to nothing.
      $('scheduler-quote-meals-line').hidden = driver?.meal == null;
      if (driver) {
        $('scheduler-quote-driver').textContent = driver.amount == null ? '—' : money.format(driver.amount);
        $('scheduler-quote-driver-note').textContent =
          driver.days === null ? 'No miles yet'
          : driver.band === 1 ? `Under-${count.format(rates.driver_band_2)} rate`
          : driver.band === 2 ? `${count.format(rates.driver_band_2)}-to-${count.format(rates.driver_band_3 - 1)} rate`
          : driver.amount === null ? 'Past the free-day table, counted as $0'
          : `${plural(driver.free, 'free day', 'free days')} · ${plural(driver.extra, 'extra day', 'extra days')}`;
        $('scheduler-quote-driver-math').textContent = driverMath(driver);
        if (driver.meal != null) {
          $('scheduler-quote-meals').textContent = money.format(driver.meal);
          $('scheduler-quote-meals-math').textContent = times(driver.days, 'day', 'days', rates.driver_meal_daily);
        }
      }

      $('scheduler-quote-other-line').hidden = other === 0;
      $('scheduler-quote-other-out').textContent = money.format(other);

      // Two totals, one showing at each width: the quote's own, and the bar's.
      $('scheduler-quote-total').textContent = money.format(total);
      $('scheduler-quote-bar-total').textContent = money.format(total);
      drawRules(rate);
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
    $('scheduler-quote-chart-days').addEventListener('change', () => drawChart(chartRate));
    form.addEventListener('change', compute);
    form.addEventListener('reset', () => setTimeout(() => {
      dayCount = 1;
      $('scheduler-quote-day-rows').replaceChildren();
      drawDays();
      // A reset puts the select on its first option, the cheapest rate.
      drawRateSelect(true);
      compute();
      $('scheduler-quote-trip-1').focus();
    }));

    const addDay = () => {
      if (dayCount >= rates.max_days) return;
      dayCount++;
      drawDays();
      $(`scheduler-quote-trip-${dayCount}`)?.focus();
      compute();
    };
    const removeDay = () => {
      if (dayCount <= 1) return;
      dayCount--;
      drawDays();
      $(`scheduler-quote-trip-${dayCount}`)?.focus();
      compute();
    };
    $('scheduler-quote-add-day').addEventListener('click', addDay);
    $('scheduler-quote-remove-day').addEventListener('click', removeDay);
    // Enter moves down the column of days, and in a last day that has miles it
    // adds the next day, so a trip is typed without reaching for the mouse.
    form.addEventListener('keydown', e => {
      const at = e.key === 'Enter' && /^scheduler-quote-trip-(\d+)$/.exec(e.target.id);
      if (!at) return;
      e.preventDefault();
      const day = Number(at[1]);
      if (day < dayCount) $(`scheduler-quote-trip-${day + 1}`).focus();
      else if (e.target.value.trim()) addDay();
    });

    return {
      app: $('scheduler-quote-tabs-wrap'),
      preview: 'This preview has no log-in, so the rates are blank until they are saved on the rates page. Open http://localhost:8641/, the cloud preview, to load the real ones.',
      start: () => {
        drawDays();
        drawRateSelect();
        compute();
        // Most quotes start with the first day's miles.
        $('scheduler-quote-trip-1').focus({ preventScroll: true });
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
      const rate = textField({ id: `scheduler-quote-m-rate-${n}`, label: 'Rate in dollars per mile', hidden: true, value: m.rate === '' ? '' : Number(m.rate).toFixed(2), placeholder: '0.00' });
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
      remove.innerHTML = '<svg class="rux--btn__icon" width="16" height="16" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><use href="#m-delete"/></svg>';
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
      $('scheduler-quote-rates-result-icon').setAttribute('href', kind === 'success' ? '#m-check_circle-fill' : '#m-error-fill');
      $('scheduler-quote-rates-result-text').textContent = text;
    };

    const drawRates = () => {
      for (const group of ['trip', 'driver']) {
        $(`scheduler-quote-rates-${group}`).replaceChildren(...RATE_FIELDS[group].map(f =>
          textField({ id: `scheduler-quote-r-${f.key}`, label: `${labelOf(f, rates)} (${f.unit})`, value: String(rates[f.key] ?? 0) })));
        $(`scheduler-quote-rates-rules-${group}`).replaceChildren(...RULE_FIELDS[group].map(f =>
          textField({ id: `scheduler-quote-r-${f.key}`, label: `${f.label} (${f.unit})`, value: String(rates[f.key]) })));
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
        if (raw === '' || !Number.isFinite(value) || value < 0) return { problem: `${labelOf(f, rates)} needs a number of 0 or more.` };
        named.push({ key: f.key, value });
      }
      // A rule is a count of miles or days, so it must be more than 0.
      const chosen = {};
      for (const [group, name] of [['trip', 'Quote'], ['driver', 'Driver pay']]) {
        for (const f of RULE_FIELDS[group]) {
          const raw = $(`scheduler-quote-r-${f.key}`).value.trim();
          const value = Number(raw.replace(/,/g, ''));
          if (raw === '' || !Number.isFinite(value) || value <= 0) return { problem: `${name}: ${f.label} needs a number more than 0.` };
          if (f.whole && (!Number.isInteger(value) || value > 60)) return { problem: `${name}: ${f.label} needs a whole number from 1 to 60.` };
          named.push({ key: f.key, value });
          chosen[f.key] = value;
        }
      }
      if (!(chosen.driver_band_2 < chosen.driver_band_3 && chosen.driver_band_3 < chosen.driver_band_4)) {
        return { problem: 'Driver pay: each band has to start at more miles than the one before.' };
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
      actions: $('scheduler-quote-rates-actions'),
      preview: 'This preview has no log-in, so rates saved here stay in this browser tab. Open http://localhost:8641/, the cloud preview, to load the real ones.',
      start: () => {
        drawRates();
        $('scheduler-quote-rates-actions').hidden = false;
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

  // The same staff gate as the schedule: the page waits for the staff profile,
  // and an account with none, or a profile that would not load, gets the
  // notice instead.
  (async () => {
    const account = window.Rux?.account;
    if (!account?.staffProfile) {
      say(page.preview);
      loadPreview();
      canSave = true;
      show();
      return;
    }
    let staff;
    try { staff = await account.staffProfile(); } catch {
      say("The rates didn't load. Reload the page to try again.");
      return;
    }
    if (!staff) {
      say("This account isn't set up as staff yet. Ask the owner to set it up.");
      return;
    }
    client = account.client;
    try {
      await load();
      canSave = true;
    } catch {
      say("The rates didn't load. Reload the page to try again.");
    }
    show();
  })();
})();
