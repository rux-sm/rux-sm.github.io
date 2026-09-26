/* ==========================================================================
   budget.js — the Budget page
   --------------------------------------------------------------------------
   The household's plan for a month in three parts. Fixed is the bills, read
   from the Bills page and the cards' minimums from Accounts, each kind of
   bill one row. Flexible is one amount a category for day-to-day spending,
   against what the month's bought lines of that category spent; a line not
   held by a bill counts by its own category, or the bank's when it has none,
   and one in no planned category counts under Not in the budget. Once a year
   is a cost that comes yearly, spread over twelve months, with any yearly
   bill beside it. A flexible or yearly line opens in the side panel.
   ========================================================================== */
(() => {
  'use strict';

  const C = window.Coins;
  const $ = id => document.getElementById(id);
  if (!C?.data) { C?.notice('Coins needs a log-in to read the household.'); return; }

  const FIXED = { rent: 'Rent', utility: 'Utilities', insurance: 'Insurance', loan: 'Loans', card: 'Cards', subscription: 'Subscriptions', person: 'People', other: 'Other bills' };
  const MONTHS = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString('en-US', { month: 'long' }));

  let accounts = [], bills = [], budget = [], billLines = [], lines = [], household = null;
  let open = null, part = 'flexible', release = null, opener = null;

  const fail = error => { console.error(error); C.notice(error?.message ? `That did not save: ${error.message}` : 'Coins could not reach the household. Try again.'); };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const round = n => Math.round(n * 100) / 100;
  const key = s => String(s || '').trim().toLowerCase();

  // A bar of spent against planned, red once over.
  const bar = (spent, planned) => {
    const over = planned > 0 ? spent > planned : spent > 0;
    const box = el('div', `rux--progress-bar rux--progress-bar--small${over ? ' rux--progress-bar--error' : ''}`);
    const label = el('div', 'rux--progress-bar__label'); label.append(el('span', 'rux--progress-bar__label-text rux--visually-hidden', 'Spent of planned'));
    const track = el('div', 'rux--progress-bar__track'), fill = el('div', 'rux--progress-bar__bar');
    fill.style.transform = `scaleX(${planned > 0 ? Math.min(spent / planned, 1) : (spent > 0 ? 1 : 0)})`;
    track.append(fill);
    const note = planned <= 0 ? '' : over ? `Over by ${C.money(spent - planned)}` : `${C.money(planned - spent)} left`;
    box.append(label, track, el('div', 'rux--progress-bar__helper-text', note));
    return box;
  };

  // A part: a table on a wide screen, a list on a phone. A row with an id
  // opens in the side panel.
  function group(title, desc, heads, rows, action) {
    const box = el('section', 'rux--stack-vertical rux--stack-scale-3');
    const head = el('div', 'coins-group-head');
    const words = el('div'); words.append(el('h2', 'rux--type-heading-03', title)); if (desc) words.append(el('p', 'coins-row__sub', desc));
    head.append(words); if (action) head.append(action);
    box.append(head);
    if (!rows.length) return box;
    const wide = el('div', 'coins-wide'), container = el('div', 'rux--data-table-container'), content = el('div', 'rux--data-table-content');
    const table = el('table', 'rux--data-table rux--data-table--lg');
    const tr = el('tr');
    tr.append(...heads.map(([t, right]) => { const th = el('th', right ? 'coins-amount' : ''); th.scope = 'col'; th.append(el('div', 'rux--table-header-label', t)); return th; }));
    const thead = el('thead'); thead.append(tr);
    const tbody = el('tbody');
    tbody.append(...rows.map(r => {
      const row = el('tr', r.id ? 'coins-line' : '');
      if (r.id) { row.tabIndex = 0; row.dataset.id = r.id; }
      row.append(...r.cells);
      return row;
    }));
    table.append(thead, tbody); content.append(table); container.append(content); wide.append(container);
    const narrow = el('div', 'coins-narrow'), lbox = el('div', 'rux--contained-list rux--layout--size-lg rux--contained-list--on-page');
    const ul = el('ul'); ul.setAttribute('role', 'list');
    ul.append(...rows.map(r => {
      const li = el('li', `rux--contained-list-item${r.id ? ' rux--contained-list-item--clickable' : ''}`);
      const b = el(r.id ? 'button' : 'div', 'rux--contained-list-item__content coins-row coins-row--stack');
      if (r.id) { b.type = 'button'; b.dataset.id = r.id; }
      const line = el('span', 'coins-row');
      const main = el('span', 'coins-row__main'); main.append(el('span', 'coins-row__title', r.name), ...(r.sub ? [el('span', 'coins-row__sub', r.sub)] : []));
      const side = el('span', 'coins-row__side'); side.append(el('span', 'coins-amount', r.amount));
      line.append(main, side); b.append(line);
      if (r.bar) b.append(r.bar());
      li.append(b);
      return li;
    }));
    lbox.append(ul); narrow.append(lbox);
    box.append(wide, narrow);
    return box;
  }
  const td = (text, cls = '') => el('td', cls, text);
  const tdEl = node => { const c = el('td', 'coins-bar-cell'); c.append(node); return c; };
  const addButton = (label, which) => { const b = el('button', 'rux--btn rux--btn--ghost rux--btn--sm', label); b.type = 'button'; b.addEventListener('click', () => openLine(null, which, b)); return b; };

  async function draw() {
    const m = C.month(), today = C.today();
    $('coins-month').textContent = m.name;
    const monthKey = C.iso(m.start).slice(0, 7);
    lines = await C.data.lines(C.iso(m.start), C.iso(m.end));
    const through = C.coverage(billLines);

    // FIXED: the bills of each kind this month, and the cards' minimums.
    const fixed = new Map();
    for (const bill of bills) {
      if (bill.decision === 'cancelled' || !C.tracked(bill)) continue;
      const facts = C.billFacts(bill, billLines);
      if (C.stopped(bill, facts, C.coveredTo(bill, facts, through))) continue;
      const row = fixed.get(bill.kind) ?? fixed.set(bill.kind, { planned: 0, spent: 0, count: 0 }).get(bill.kind);
      row.planned += (facts.usual ?? 0) * C.PER_YEAR[bill.cadence] / 12;
      row.spent -= facts.paid.filter(l => l.day.startsWith(monthKey)).reduce((s, l) => s + Number(l.amount), 0);
      row.count++;
    }
    const cards = accounts.filter(a => a.kind === 'card' && !a.closed && Number(a.minimum_payment) > 0);
    if (cards.length) {
      const row = fixed.get('card') ?? fixed.set('card', { planned: 0, spent: 0, count: 0 }).get('card');
      row.planned += cards.reduce((s, a) => s + Number(a.minimum_payment), 0);
      row.spent -= lines.filter(l => l.kind === 'card-payment' && Number(l.amount) < 0).reduce((s, l) => s + Number(l.amount), 0);
      row.count += cards.length;
    }
    const fixedRows = Object.keys(FIXED).filter(k => fixed.has(k)).map(k => {
      const f = fixed.get(k), planned = round(f.planned), spent = round(f.spent);
      return { name: FIXED[k], sub: f.count === 1 ? '1 bill' : `${f.count} bills`, amount: `${C.money(spent)} of ${C.money(planned)}`, planned, spent,
        cells: [td(FIXED[k]), td(C.money(planned), 'coins-amount'), td(C.money(spent), 'coins-amount'), td(C.money(planned - spent), 'coins-amount'), tdEl(bar(spent, planned))], bar: () => bar(spent, planned) };
    });

    // FLEXIBLE: bought lines no bill holds, by category.
    const spentBy = new Map();
    for (const l of lines) {
      if (l.kind !== 'trade' || Number(l.amount) >= 0 || l.bill_id) continue;
      const k = key(l.category || l.bank_category);
      spentBy.set(k, (spentBy.get(k) ?? 0) - Number(l.amount));
    }
    const flex = budget.filter(b => b.part === 'flexible');
    const planned = new Set(flex.map(b => key(b.name)));
    const flexRows = flex.map(b => {
      const p = Number(b.amount), s = round(spentBy.get(key(b.name)) ?? 0);
      return { id: b.id, name: b.name, amount: `${C.money(s)} of ${C.money(p)}`, planned: p, spent: s,
        cells: [td(b.name), td(C.money(p), 'coins-amount'), td(C.money(s), 'coins-amount'), td(C.money(p - s), 'coins-amount'), tdEl(bar(s, p))], bar: () => bar(s, p) };
    });
    const loose = round([...spentBy].filter(([k]) => !planned.has(k)).reduce((s, [, v]) => s + v, 0));
    if (loose > 0) flexRows.push({ name: 'Not in the budget', sub: 'Lines whose category is not planned, or not sorted yet', amount: C.money(loose), planned: 0, spent: loose,
      cells: [td('Not in the budget'), td('', 'coins-amount'), td(C.money(loose), 'coins-amount'), td('', 'coins-amount'), td('')] });

    // ONCE A YEAR: the plan's yearly lines and the yearly bills.
    const yearly = budget.filter(b => b.part === 'yearly').map(b => ({ id: b.id, name: b.name, yearly: Number(b.amount), month: b.due_month }));
    for (const bill of bills.filter(b => b.cadence === 'yearly' && b.decision !== 'cancelled')) {
      const facts = C.billFacts(bill, billLines);
      yearly.push({ name: bill.name, yearly: facts.usual ?? 0, month: facts.latest ? Number(facts.latest.day.slice(5, 7)) : null, bill: true });
    }
    const nextDue = month => { if (!month) return ''; const y = month - 1 >= today.getMonth() ? today.getFullYear() : today.getFullYear() + 1; return new Date(y, month - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); };
    const yearRows = yearly.map(y => ({ id: y.id, name: y.name, sub: [y.bill ? 'A yearly bill' : '', y.month ? `due ${nextDue(y.month)}` : ''].filter(Boolean).join(' · '),
      amount: `${C.money(y.yearly / 12)} a month`,
      cells: [td(y.name + (y.bill ? ' (bill)' : '')), td(C.money(y.yearly), 'coins-amount'), td(C.money(y.yearly / 12), 'coins-amount'), td(nextDue(y.month))] }));

    // The totals.
    const sum = (rows, f) => rows.reduce((s, r) => s + (r[f] ?? 0), 0);
    const flexPlanned = sum(flexRows, 'planned'), flexSpent = sum(flexRows.filter(r => r.planned > 0), 'spent');
    const aside = yearly.reduce((s, y) => s + y.yearly / 12, 0);
    $('coins-free').textContent = C.money(flexPlanned - flexSpent);
    $('coins-free-note').textContent = flex.length ? 'Day-to-day money left in the plan' : 'Add categories to plan day-to-day money';
    $('coins-planned').textContent = C.money(sum(fixedRows, 'planned') + flexPlanned + aside);
    $('coins-planned-note').textContent = `For ${m.start.toLocaleDateString('en-US', { month: 'long' })}`;
    $('coins-spent').textContent = C.money(C.totals(lines).out);
    $('coins-spent-note').textContent = 'Everything bought or paid this month';
    $('coins-aside').textContent = C.money(aside);

    const heads = [['Category'], ['Planned', 1], ['Spent', 1], ['Left', 1], ['']];
    const out = [
      group('Fixed', 'Bills, from the Bills page, and the cards\' minimums from Accounts.', [['Bills'], ['Planned', 1], ['Paid', 1], ['Left', 1], ['']], fixedRows),
      group('Flexible', 'One amount for day-to-day spending, split by category, against the lines of each category.', heads, flexRows, addButton('Add a category', 'flexible')),
      group('Once a year', 'Spread over twelve months, so a big yearly cost is never a surprise.', [['Cost'], ['A year', 1], ['Each month', 1], ['Next due']], yearRows, addButton('Add a yearly cost', 'yearly')),
    ];
    if (!flex.length) {
      const hint = el('div', 'coins-actions');
      const b = el('button', 'rux--btn rux--btn--tertiary rux--btn--sm', 'Suggest categories from the last 3 months'); b.type = 'button';
      b.addEventListener('click', () => suggest(b).catch(fail));
      hint.append(b);
      out[1].append(hint);
    }
    $('coins-groups').replaceChildren(...out);
  }

  /* SUGGESTING. The categories the last three whole months spent on, each
     planned at its monthly average rounded up to the next $10, for any that
     came to $20 a month or more. */
  async function suggest(button) {
    button.disabled = true;
    const t = C.today(), from = new Date(t.getFullYear(), t.getMonth() - 3, 1), to = new Date(t.getFullYear(), t.getMonth(), 1);
    const recent = await C.data.lines(C.iso(from), C.iso(to));
    const by = new Map();
    for (const l of recent) {
      if (l.kind !== 'trade' || Number(l.amount) >= 0 || l.bill_id) continue;
      const name = (l.category || l.bank_category || '').trim();
      if (name) by.set(name, (by.get(name) ?? 0) - Number(l.amount));
    }
    const made = [...by].map(([name, total]) => [name, Math.ceil(total / 3 / 10) * 10]).filter(([, a]) => a >= 20);
    if (!made.length) { button.disabled = false; return C.notice('The last 3 months have too few sorted lines to suggest from. Sort some on Transactions first.'); }
    for (const [i, [name, amount]] of made.entries()) budget.push(await C.data.saveBudget({ household_id: household, part: 'flexible', name, amount, sort: i }));
    C.notice();
    await draw();
  }

  // ---------- The panel
  const panel = $('coins-panel');
  function openLine(id, which, from) {
    const b = id ? budget.find(x => x.id === id) : null;
    if (id && !b) return;
    open = b; part = b?.part ?? which; opener = from;
    $('coins-panel-title').textContent = b ? b.name : part === 'yearly' ? 'Add a yearly cost' : 'Add a category';
    $('coins-panel-label').textContent = part === 'yearly' ? 'Once a year' : 'Flexible';
    $('coins-b-name').value = b?.name ?? '';
    $('coins-b-amount').value = b?.amount ?? '';
    $('coins-b-amount-label').textContent = part === 'yearly' ? 'A year' : 'Each month';
    $('coins-b-month-wrap').hidden = part !== 'yearly';
    $('coins-b-month').value = b?.due_month ?? '';
    $('coins-b-delete').hidden = !b;
    delete $('coins-b-delete').dataset.sure;
    $('coins-b-delete').textContent = 'Delete';
    panel.hidden = false;
    panel.classList.add('rux--side-panel--open');
    $('coins-b-name').focus();
    release = window.Rux?.overlay?.register({ element: panel, close: () => closePanel(), dismissOn: { outside: true, escape: true } })?.release ?? null;
  }
  function closePanel() {
    if (panel.hidden) return;
    panel.classList.remove('rux--side-panel--open');
    panel.hidden = true;
    release?.(); release = null; open = null;
    opener?.focus?.();
  }
  $('coins-panel-close').addEventListener('click', closePanel);
  $('coins-b-cancel').addEventListener('click', closePanel);

  $('coins-b-form').addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('coins-b-name').value.trim(), amount = $('coins-b-amount').value.replace(/[$,\s]/g, '');
    if (!name) return C.notice('Give it a name.');
    if (amount === '' || Number.isNaN(Number(amount)) || Number(amount) < 0) return C.notice('The amount is a number, like 800.');
    const save = $('coins-b-save'); save.disabled = true;
    try {
      const saved = await C.data.saveBudget({
        ...(open ? { id: open.id } : { household_id: household, part, sort: budget.filter(b => b.part === part).length }),
        name, amount: Number(amount), due_month: part === 'yearly' && $('coins-b-month').value ? Number($('coins-b-month').value) : null,
      });
      budget = [...budget.filter(b => b.id !== saved.id), saved];
      C.notice();
      closePanel();
      await draw();
    } catch (error) { fail(error); }
    save.disabled = false;
  });
  $('coins-b-delete').addEventListener('click', async () => {
    const b = $('coins-b-delete');
    if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Delete it for good'; return; }
    try { await C.data.deleteBudget(open.id); budget = budget.filter(x => x.id !== open.id); closePanel(); await draw(); }
    catch (error) { fail(error); }
  });

  $('coins-groups').addEventListener('click', e => { const t = e.target.closest('[data-id]'); if (t) openLine(t.dataset.id, null, t); });
  $('coins-groups').addEventListener('keydown', e => { if (e.key === 'Enter') { const t = e.target.closest('tr[data-id]'); if (t) openLine(t.dataset.id, null, t); } });
  const go = by => { C.setParam('month', C.shiftMonth(C.month(), by)); draw().catch(fail); };
  $('coins-prev').addEventListener('click', () => go(-1));
  $('coins-next').addEventListener('click', () => go(1));

  (async () => {
    const since = C.iso(new Date(C.today().getTime() - 400 * 864e5));
    let people;
    [people, accounts, bills, budget, billLines] = await Promise.all([C.data.people(), C.data.accounts(), C.data.bills(), C.data.budget(), C.data.outgoing(since)]);
    household = people[0]?.household_id;
    const option = (v, t) => { const o = document.createElement('option'); o.value = v; o.textContent = t; return o; };
    $('coins-b-month').replaceChildren(option('', 'Not set'), ...MONTHS.map((t, i) => option(String(i + 1), t)));
    await draw();
  })().catch(fail);
})();
