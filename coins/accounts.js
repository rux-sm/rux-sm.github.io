/* ==========================================================================
   accounts.js — the Accounts page
   --------------------------------------------------------------------------
   Every account of the chosen member, in three groups: bank accounts with
   their balance, cards with what is owed and how much of the limit that is,
   and loans with when they are paid off. Above them, what is in the bank,
   what is owed and the two together; below the cards, what paying a little
   more than the minimums each month would clear and save. A bank account's
   balance comes from its latest file; a card's or a loan's is typed in, since
   no export states it. An account opens in the side panel to change it.
   ========================================================================== */
(() => {
  'use strict';

  const C = window.Coins;
  const $ = id => document.getElementById(id);
  if (!C?.data) { C?.notice('Coins needs a log-in to read the household.'); return; }

  const KINDS = { checking: 'Checking', savings: 'Savings', card: 'Card', loan: 'Loan', other: 'Other' };
  const OWED = new Set(['card', 'loan']);

  let people = [], accounts = [], imports = [], open = null, release = null, opener = null;

  const fail = error => { console.error(error); C.notice(error?.message ? `That did not save: ${error.message}` : 'Coins could not reach the household. Try again.'); };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const day = iso => iso ? new Date(`${iso}T00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  const monthYear = d => d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const name = a => [a.name, a.last4 ? `··${a.last4}` : ''].filter(Boolean).join(' ');
  const whose = a => a.person_id ? people.find(p => p.id === a.person_id)?.name ?? '' : 'Both';
  const num = v => v == null || v === '' ? null : Number(v);
  const pct = v => v == null ? '' : `${Number(v).toFixed(2).replace(/\.?0+$/, '')}%`;
  const ordinal = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th'));
  const latestLine = a => imports.filter(i => i.account_id === a.id && i.last_day).map(i => i.last_day).sort().at(-1) ?? null;

  /* PAYING OFF. Month by month, interest is added, every card gets its
     minimum, and the rest of the money goes to the card with the highest
     interest; a card paid off frees its minimum for the others. Returns the
     months it takes and the interest paid, or null when the money never
     catches up with the interest. */
  function payoff(cards, extra) {
    let left = cards.map(c => ({ owed: num(c.balance), rate: num(c.apr) / 1200, min: num(c.minimum_payment) }));
    const budget = left.reduce((s, c) => s + c.min, 0) + extra;
    let months = 0, interest = 0;
    while (left.some(c => c.owed > 0.005)) {
      if (++months > 600) return null;
      for (const c of left) if (c.owed > 0) { const i = c.owed * c.rate; c.owed += i; interest += i; }
      let money = budget;
      for (const c of left) if (c.owed > 0) { const p = Math.min(c.owed, c.min, money); c.owed -= p; money -= p; }
      for (const c of [...left].sort((a, b) => b.rate - a.rate)) if (c.owed > 0 && money > 0) { const p = Math.min(c.owed, money); c.owed -= p; money -= p; }
    }
    return { months, interest };
  }
  // A loan's months left at its payment, or null when the payment does not
  // cover the interest.
  const loanMonths = a => {
    const B = num(a.balance), r = num(a.apr) / 1200, P = num(a.minimum_payment);
    if (!B || !P) return null;
    // A cent's rounding in the payment is not a whole extra month.
    if (!r) return Math.ceil(B / P - 0.01);
    return P <= B * r ? null : Math.ceil(-Math.log(1 - r * B / P) / Math.log(1 + r) - 0.01);
  };
  const inMonths = n => { const d = C.today(); d.setDate(1); d.setMonth(d.getMonth() + n); return d; };

  // ---------- A group: a table on a wide screen, a list on a phone.
  function group(title, desc, heads, list, cells, sub, amount, extra) {
    const box = el('section', 'rux--stack-vertical rux--stack-scale-3');
    const h = el('div'); h.append(el('h2', 'rux--type-heading-03', title)); if (desc) h.append(el('p', 'coins-row__sub', desc));
    box.append(h);
    const wide = el('div', 'coins-wide');
    const container = el('div', 'rux--data-table-container'), content = el('div', 'rux--data-table-content');
    const table = el('table', 'rux--data-table rux--data-table--lg');
    const tr = el('tr');
    tr.append(...heads.map(([t, right]) => { const th = el('th', right ? 'coins-amount' : ''); th.scope = 'col'; th.append(el('div', 'rux--table-header-label', t)); return th; }));
    const thead = el('thead'); thead.append(tr);
    const tbody = el('tbody');
    tbody.append(...list.map(a => {
      const row = el('tr', 'coins-line'); row.tabIndex = 0; row.dataset.id = a.id;
      row.append(...cells(a));
      return row;
    }));
    table.append(thead, tbody); content.append(table); container.append(content); wide.append(container);
    const narrow = el('div', 'coins-narrow');
    const lbox = el('div', 'rux--contained-list rux--layout--size-lg rux--contained-list--on-page');
    const ul = el('ul'); ul.setAttribute('role', 'list');
    ul.append(...list.map(a => {
      const li = el('li', 'rux--contained-list-item rux--contained-list-item--clickable');
      const b = el('button', 'rux--contained-list-item__content coins-row coins-row--stack'); b.type = 'button'; b.dataset.id = a.id;
      const line = el('span', 'coins-row');
      const main = el('span', 'coins-row__main'); main.append(el('span', 'coins-row__title', name(a)), el('span', 'coins-row__sub', sub(a)));
      const side = el('span', 'coins-row__side'); side.append(el('span', 'coins-amount', amount(a)));
      line.append(main, side); b.append(line);
      const more = extra?.(a); if (more) b.append(more);
      li.append(b);
      return li;
    }));
    lbox.append(ul); narrow.append(lbox);
    box.append(wide, narrow);
    return box;
  }
  const td = (text, cls = '') => el('td', cls, text);
  const money = v => v == null ? '—' : C.money(Number(v));
  // How much of a card's limit is owed, as a bar that turns red over 70%.
  const usedBar = a => {
    const owed = num(a.balance), limit = num(a.credit_limit);
    if (owed == null || !limit) return null;
    const share = owed / limit;
    const bar = el('div', `rux--progress-bar rux--progress-bar--small${share > 0.7 ? ' rux--progress-bar--error' : ''}`);
    const label = el('div', 'rux--progress-bar__label'); label.append(el('span', 'rux--progress-bar__label-text rux--visually-hidden', 'Used of the limit'));
    const track = el('div', 'rux--progress-bar__track'); const fill = el('div', 'rux--progress-bar__bar'); fill.style.transform = `scaleX(${Math.min(share, 1)})`; track.append(fill);
    bar.append(label, track, el('div', 'rux--progress-bar__helper-text', `${Math.round(share * 100)}% of ${C.money(limit)}`));
    return bar;
  };
  const tdEl = node => { const c = el('td'); if (node) c.append(node); return c; };

  function draw() {
    const whoId = C.who(people);
    C.whoSwitch($('coins-who'), people, whoId, id => { C.setParam('who', id === 'both' ? null : id); draw(); });
    const mine = C.accountsFor(whoId, accounts);
    const live = mine.filter(a => !a.closed);
    const banks = live.filter(a => !OWED.has(a.kind)), cards = live.filter(a => a.kind === 'card'), loans = live.filter(a => a.kind === 'loan');
    const sum = list => list.reduce((s, a) => s + (num(a.balance) ?? 0), 0);
    const inBank = sum(banks), owedCards = sum(cards), owedLoans = sum(loans);
    const limits = cards.reduce((s, a) => s + (num(a.credit_limit) ?? 0), 0);

    $('coins-together').textContent = C.money(inBank - owedCards - owedLoans);
    $('coins-bank').textContent = C.money(inBank);
    $('coins-bank-note').textContent = banks.length === 1 ? '1 account' : `${banks.length} accounts`;
    $('coins-cards').textContent = C.money(owedCards);
    $('coins-cards-note').textContent = [cards.length === 1 ? '1 card' : `${cards.length} cards`, limits ? `${Math.round(owedCards / limits * 100)}% of the limits` : ''].filter(Boolean).join(' · ');
    $('coins-loans').textContent = C.money(owedLoans);
    $('coins-loans-note').textContent = loans.length === 1 ? '1 loan' : `${loans.length} loans`;
    const missing = [...cards, ...loans].filter(a => num(a.balance) == null);
    $('coins-missing-wrap').hidden = !missing.length;
    $('coins-missing').textContent = `${missing.map(name).join(', ')} ${missing.length === 1 ? 'has' : 'have'} no balance yet, so what is owed leaves ${missing.length === 1 ? 'it' : 'them'} out. No bank file states it; open ${missing.length === 1 ? 'it' : 'each'} to type it in.`;

    const out = [];
    if (banks.length) out.push(group('Bank accounts', 'The balance from each account\'s latest file.', [['Account'], ['Whose'], ['Balance', 1], ['On'], ['Lines up to']], banks,
      a => [td(name(a)), td(whose(a)), td(money(a.balance), 'coins-amount'), td(day(a.balance_on)), td(day(latestLine(a)))],
      a => [whose(a), a.balance_on ? `on ${day(a.balance_on)}` : 'no balance yet'].join(' · '), a => money(a.balance)));
    if (cards.length) out.push(group('Cards', 'Owing under a third of a limit is what lenders like to see.', [['Card'], ['Whose'], ['Owed', 1], ['Used of the limit'], ['Interest', 1], ['Minimum', 1], ['Due']], cards,
      a => [td(name(a)), td(whose(a)), td(money(a.balance), 'coins-amount'), tdEl(usedBar(a)), td(pct(a.apr), 'coins-amount'), td(money(a.minimum_payment), 'coins-amount'), td(a.due_day ? `the ${ordinal(a.due_day)}` : '')],
      a => [whose(a), a.apr != null ? pct(a.apr) : '', a.due_day ? `due the ${ordinal(a.due_day)}` : ''].filter(Boolean).join(' · '), a => money(a.balance), usedBar));
    if (loans.length) out.push(group('Loans', '', [['Loan'], ['Whose'], ['Owed', 1], ['Interest', 1], ['Payment', 1], ['Due'], ['Paid off by']], loans,
      a => { const n = loanMonths(a); return [td(name(a)), td(whose(a)), td(money(a.balance), 'coins-amount'), td(pct(a.apr), 'coins-amount'), td(money(a.minimum_payment), 'coins-amount'), td(a.due_day ? `the ${ordinal(a.due_day)}` : ''), td(n == null ? '' : monthYear(inMonths(n)))]; },
      a => { const n = loanMonths(a); return [whose(a), n == null ? '' : `done ${monthYear(inMonths(n))}`].filter(Boolean).join(' · '); }, a => money(a.balance)));
    const closed = mine.filter(a => a.closed);
    if (closed.length) out.push(group('Closed', '', [['Account'], ['Whose'], ['Kind']], closed, a => [td(name(a)), td(whose(a)), td(KINDS[a.kind])], a => [whose(a), KINDS[a.kind]].join(' · '), () => ''));
    if (!mine.length) out.push(el('p', '', 'No accounts yet. Import a bank file to add one.'));
    $('coins-groups').replaceChildren(...out);
    drawPlan(cards);
  }

  // What paying more than the minimums would do, for the cards that have a
  // balance, an interest rate and a minimum.
  function drawPlan(cards) {
    const ready = cards.filter(c => num(c.balance) > 0 && num(c.apr) != null && num(c.minimum_payment) > 0);
    $('coins-plan-wrap').hidden = !ready.length;
    if (!ready.length) return;
    const extra = Math.max(0, Number($('coins-extra').value) || 0);
    const base = payoff(ready, 0), plan = payoff(ready, extra);
    const cards1 = ready.length === 1 ? 'the card' : `all ${ready.length} cards`;
    $('coins-plan').textContent = !plan ? `At ${C.money(extra)} more a month the payments never catch up with the interest.`
      : `Paying ${C.money(extra)} a month more than the minimums, highest interest first, clears ${cards1} by ${monthYear(inMonths(plan.months))}`
        + (base ? ` and saves ${C.money(Math.max(0, base.interest - plan.interest))} in interest. The minimums alone take until ${monthYear(inMonths(base.months))}.` : '. The minimums alone never do.');
  }
  $('coins-extra').addEventListener('input', () => drawPlan(C.accountsFor(C.who(people), accounts).filter(a => !a.closed && a.kind === 'card')));

  // ---------- The panel
  const panel = $('coins-panel');
  const f = k => $(`coins-a-${k}`);
  function kindChanged() {
    const kind = f('kind').value, owed = OWED.has(kind);
    $('coins-a-balance-label').textContent = owed ? 'Owed' : 'Balance';
    for (const k of ['apr', 'minimum', 'due']) $(`coins-a-${k}-wrap`).hidden = !owed;
    $('coins-a-limit-wrap').hidden = kind !== 'card';
    $('coins-a-minimum-label').textContent = kind === 'loan' ? 'Monthly payment' : 'Minimum payment';
  }
  f('kind').addEventListener('change', kindChanged);
  function openAccount(id, from) {
    const a = accounts.find(x => x.id === id);
    if (!a) return;
    open = a; opener = from;
    $('coins-panel-title').textContent = name(a);
    $('coins-panel-label').textContent = [whose(a), KINDS[a.kind]].join(' · ');
    f('name').value = a.name; f('whose').value = a.person_id ?? ''; f('kind').value = a.kind;
    f('last4').value = a.last4 ?? ''; f('bank').value = a.institution ?? '';
    f('balance').value = a.balance ?? ''; f('balance-on').value = a.balance_on ?? '';
    f('limit').value = a.credit_limit ?? ''; f('apr').value = a.apr ?? ''; f('minimum').value = a.minimum_payment ?? '';
    f('due').value = a.due_day ?? ''; f('closed').checked = a.closed; f('notes').value = a.notes ?? '';
    kindChanged();
    panel.hidden = false;
    panel.classList.add('rux--side-panel--open');
    $('coins-panel-close').focus();
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
  $('coins-a-cancel').addEventListener('click', closePanel);
  // A balance typed without a date is dated today.
  f('balance').addEventListener('input', () => { if (!f('balance-on').value) f('balance-on').value = C.iso(C.today()); });

  $('coins-account').addEventListener('submit', async e => {
    e.preventDefault();
    const a = open;
    if (!a) return;
    const name1 = f('name').value.trim(), last4 = f('last4').value.trim();
    const numbers = { balance: f('balance').value, credit_limit: f('limit').value, apr: f('apr').value, minimum_payment: f('minimum').value };
    if (!name1) return C.notice('Give the account a name.');
    if (last4 && !/^\d{4}$/.test(last4)) return C.notice('The last four digits are four numbers.');
    for (const [k, v] of Object.entries(numbers)) if (v.trim() && Number.isNaN(Number(v.replace(/[$,\s]/g, '')))) return C.notice('Amounts and rates are numbers, like 1204.20 or 24.9.');
    const due = f('due').value.trim();
    if (due && !(Number.isInteger(Number(due)) && due >= 1 && due <= 31)) return C.notice('The due day is a day of the month, 1 to 31.');
    const n = v => v.trim() === '' ? null : Number(v.replace(/[$,\s]/g, ''));
    const save = $('coins-a-save'); save.disabled = true;
    try {
      const saved = await C.data.updateAccount(a.id, {
        name: name1, person_id: f('whose').value || null, kind: f('kind').value, last4: last4 || null,
        institution: f('bank').value.trim(), balance: n(numbers.balance), balance_on: f('balance-on').value || null,
        credit_limit: n(numbers.credit_limit), apr: n(numbers.apr), minimum_payment: n(numbers.minimum_payment),
        due_day: due === '' ? null : Number(due), closed: f('closed').checked, notes: f('notes').value.trim(),
      });
      Object.assign(a, saved);
      C.notice();
      closePanel();
      draw();
    } catch (error) { fail(error); }
    save.disabled = false;
  });

  $('coins-groups').addEventListener('click', e => { const t = e.target.closest('[data-id]'); if (t) openAccount(t.dataset.id, t); });
  $('coins-groups').addEventListener('keydown', e => { if (e.key === 'Enter') { const t = e.target.closest('tr[data-id]'); if (t) openAccount(t.dataset.id, t); } });

  (async () => {
    [people, accounts, imports] = await Promise.all([C.data.people(), C.data.accounts(), C.data.imports()]);
    const option = (v, t) => { const o = document.createElement('option'); o.value = v; o.textContent = t; return o; };
    f('whose').replaceChildren(option('', 'Both'), ...people.map(p => option(p.id, p.name)));
    f('kind').replaceChildren(...Object.entries(KINDS).map(([k, t]) => option(k, t)));
    draw();
  })().catch(fail);
})();
