/* ==========================================================================
   bills.js — the Bills page
   --------------------------------------------------------------------------
   This month's bills in three groups (due in the next seven days with any
   that are late, later this month, and paid), every bill, or the ones with
   keep or cancel still to decide. Above them, the month's totals and the
   payments that repeat without being a bill yet, found the way the Mac tool
   found them: charged in three of the last twelve months, the same amount
   at least six times in ten. Each becomes a bill on a yes, or is remembered
   as not one. A bill opens on its own page, bill.html.
   ========================================================================== */
(() => {
  'use strict';

  const C = window.Coins;
  const $ = id => document.getElementById(id);
  if (!C?.data) { C?.notice('Coins needs a log-in to read the household.'); return; }

  const STATE = { late: ['Late', 'rux--tag--red'], due: ['Due', 'rux--tag--blue'], paid: ['Paid', 'rux--tag--green'] };
  const DECISION = { keep: ['Keep', 'rux--tag--green'], cancel: ['Cancel', 'rux--tag--red'], cancelled: ['Cancelled', 'rux--tag--cool-gray'], undecided: ['Decide', 'rux--tag--gray'] };
  const EVERY = { weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Every 3 months', yearly: 'Yearly', irregular: 'Now and then' };
  const VIEWS = [['month', 'This month'], ['all', 'All bills'], ['decide', 'To decide']];

  let people = [], accounts = [], bills = [], lines = [], skips = new Set(), suggestions = [], through = new Map();

  const fail = error => { console.error(error); C.notice(error?.message ? `That did not save: ${error.message}` : 'Coins could not reach the household. Try again.'); };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const tag = ([label, cls]) => { const t = el('span', `rux--tag rux--tag--sm ${cls}`); t.append(el('span', 'rux--tag__label', label)); return t; };
  const when = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const nice = s => String(s || '').toLowerCase().replace(/(^|[\s/(-])([a-z])/g, (m, a, b) => a + b.toUpperCase());
  const accountName = id => { const a = accounts.find(x => x.id === id); return a ? [a.name, a.last4 ? `··${a.last4}` : ''].filter(Boolean).join(' ') : ''; };
  const view = () => { const v = new URLSearchParams(location.search).get('view'); return VIEWS.some(x => x[0] === v) ? v : 'month'; };

  // The bills the chosen member pays: theirs by person, or by the account.
  const billsFor = whoId => {
    if (whoId === 'both') return bills;
    const mine = new Set(C.accountsFor(whoId, accounts).map(a => a.id));
    return bills.filter(b => b.person_id === whoId || mine.has(b.account_id));
  };

  /* SUGGESTIONS. Money-out lines bought from a merchant that no bill holds,
     grouped by merchant, a shorter name folded into a longer one it starts
     (two words at least, so one word never swallows two shops). */
  function suggest() {
    const yearAgo = C.iso(new Date(C.today().getTime() - 365 * 864e5));
    const recent = C.iso(new Date(C.today().getTime() - 75 * 864e5));
    const free = lines.filter(l => l.kind === 'trade' && !l.bill_id && l.day >= yearAgo && l.merchant && !/ \((IN|OUT)\)$/.test(l.merchant));
    const keys = [...new Set(free.map(l => l.merchant))].sort((a, b) => b.length - a.length);
    const fold = new Map(keys.map(k => [k, k.split(' ').length >= 2 ? keys.find(o => o !== k && o.startsWith(k + ' ')) ?? k : k]));
    const groups = new Map();
    for (const l of free) { const k = fold.get(l.merchant); (groups.get(k) ?? groups.set(k, []).get(k)).push(l); }
    const out = [];
    for (const [merchant, ls] of groups) {
      if (skips.has(merchant) || bills.some(b => C.matches(b, { amount: -1, merchant, description: merchant }))) continue;
      const months = new Set(ls.map(l => l.day.slice(0, 7))).size;
      if (ls.length < 3 || months < 3) continue;
      const amounts = ls.map(l => -Number(l.amount));
      const usual = C.median(amounts);
      const steady = amounts.filter(a => Math.abs(a - usual) <= Math.max(0.5, usual * 0.03)).length / amounts.length;
      const last = ls.at(-1);
      if (steady < 0.6 || last.day < recent) continue;
      out.push({ merchant, usual, months, yearly: amounts.reduce((s, a) => s + a, 0), last, day: C.median(ls.map(l => Number(l.day.slice(8)))) });
    }
    return out.sort((a, b) => b.yearly - a.yearly);
  }

  // ---------- Rows: a table on a wide screen, a list on a phone.
  const open = id => { location.href = `bill.html?id=${encodeURIComponent(id)}`; };
  function group(title, heads, items, cells, side) {
    const box = el('section', 'rux--stack-vertical rux--stack-scale-3');
    box.append(el('h2', 'rux--type-heading-03', title));
    const wide = el('div', 'coins-wide');
    const table = el('table', 'rux--data-table rux--data-table--lg');
    const head = el('tr');
    head.append(...heads.map(([h, right]) => { const th = el('th', right ? 'coins-amount' : ''); th.scope = 'col'; th.append(el('div', 'rux--table-header-label', h)); return th; }));
    const thead = el('thead'); thead.append(head);
    const tbody = el('tbody');
    tbody.append(...items.map(it => {
      const tr = el('tr', 'coins-line'); tr.tabIndex = 0;
      tr.addEventListener('click', () => open(it.bill.id));
      tr.addEventListener('keydown', e => { if (e.key === 'Enter') open(it.bill.id); });
      tr.append(...cells(it));
      return tr;
    }));
    table.append(thead, tbody);
    const container = el('div', 'rux--data-table-container');
    const content = el('div', 'rux--data-table-content');
    content.append(table); container.append(content); wide.append(container);

    const narrow = el('div', 'coins-narrow');
    const list = el('div', 'rux--contained-list rux--layout--size-lg rux--contained-list--on-page');
    const ul = el('ul'); ul.setAttribute('role', 'list');
    ul.append(...items.map(it => {
      const li = el('li', 'rux--contained-list-item rux--contained-list-item--clickable');
      const b = el('button', 'rux--contained-list-item__content coins-row'); b.type = 'button';
      b.addEventListener('click', () => open(it.bill.id));
      const main = el('span', 'coins-row__main');
      main.append(el('span', 'coins-row__title', it.bill.name), el('span', 'coins-row__sub', it.sub));
      const s = el('span', 'coins-row__side');
      s.append(el('span', 'coins-amount', it.amount), ...side(it));
      b.append(main, s); li.append(b);
      return li;
    }));
    list.append(ul); narrow.append(list);
    box.append(wide, narrow);
    return box;
  }
  const td = (text, cls = '') => el('td', cls, text);
  const tdTags = tags => { const c = el('td', 'coins-tags'); c.append(...tags); return c; };
  // A price rise shows on the month the dearer payment was made.
  const stateTags = it => [tag(STATE[it.state.state]), ...(it.state.state === 'paid' && it.facts.rose ? [tag([`${C.money(it.facts.rose)} more than usual`, 'rux--tag--purple'])] : [])];

  function draw() {
    const whoId = C.who(people), v = view(), now = C.today();
    C.whoSwitch($('coins-who'), people, whoId, id => { C.setParam('who', id === 'both' ? null : id); draw(); });
    viewSwitch(v);
    const mine = billsFor(whoId);
    const items = mine.map(bill => {
      const facts = C.billFacts(bill, lines);
      const halted = C.stopped(bill, facts, C.coveredTo(bill, facts, through));
      return { bill, facts, halted, state: C.billState(bill, facts, new Date(now.getFullYear(), now.getMonth(), 1), through) };
    });

    // The totals, always this month's.
    const thisMonth = items.filter(it => it.state);
    const unpaid = thisMonth.filter(it => it.state.state !== 'paid');
    const paid = thisMonth.filter(it => it.state.state === 'paid');
    $('coins-topay').textContent = C.money(unpaid.reduce((s, it) => s + (it.facts.usual ?? 0), 0));
    $('coins-topay-note').textContent = unpaid.length === 1 ? '1 bill' : `${unpaid.length} bills`;
    $('coins-paid').textContent = C.money(paid.reduce((s, it) => s - Number(it.state.line.amount), 0));
    $('coins-paid-note').textContent = paid.length === 1 ? '1 bill' : `${paid.length} bills`;
    const subs = items.filter(it => it.bill.kind === 'subscription' && it.bill.decision !== 'cancelled' && !it.halted).map(it => it.bill);
    $('coins-subs').textContent = C.money(items.filter(it => subs.includes(it.bill)).reduce((s, it) => s + it.facts.yearly, 0));
    $('coins-subs-note').textContent = subs.length === 1 ? '1 service' : `${subs.length} services`;
    const undecided = mine.filter(b => b.decision === 'undecided');
    $('coins-decide').textContent = undecided.length;

    // The suggestions.
    $('coins-suggest-wrap').hidden = !suggestions.length;
    $('coins-suggest-text').textContent = suggestions.length === 1
      ? `1 payment repeats but is not a bill: ${nice(suggestions[0].merchant)}. Is it a bill?`
      : `${suggestions.length} payments repeat but are not bills: ${suggestions.slice(0, 3).map(s => nice(s.merchant)).join(', ')}${suggestions.length > 3 ? ' and more' : ''}. Are they bills?`;
    drawSuggestions();

    const out = [];
    const soon = new Date(now.getTime() + 7 * 864e5);
    if (v === 'month') {
      // Next month's early bills also fall in the next seven days.
      const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const nextItems = items.map(it => ({ ...it, state: C.billState(it.bill, it.facts, next, through) }))
        .filter(it => it.state && it.state.state !== 'paid' && it.state.due <= soon).map(it => ({ ...it, state: { ...it.state, state: 'due' } }));
      const row = it => ({ ...it, amount: C.money(it.facts.usual ?? 0), sub: [when(it.state.due), accountName(it.bill.account_id), it.bill.login].filter(Boolean).join(' · ') });
      const byDue = (a, b) => a.state.due - b.state.due;
      const heads = [['Bill'], ['Due'], ['Amount', 1], ['Paid from'], ['Login'], ['This month'], ['Keep?']];
      const cells = it => [td(it.bill.name), td(when(it.state.due)), td(it.amount, 'coins-amount'), td(accountName(it.bill.account_id)), td(it.bill.login), tdTags(stateTags(it)), tdTags([tag(DECISION[it.bill.decision])])];
      const side = it => stateTags(it).slice(0, 1);
      const due7 = [...unpaid.filter(it => it.state.state === 'late' || it.state.due <= soon), ...nextItems].sort(byDue).map(row);
      const later = unpaid.filter(it => it.state.state === 'due' && it.state.due > soon).sort(byDue).map(row);
      if (due7.length) out.push(group('Due in the next 7 days', heads, due7, cells, side));
      if (later.length) out.push(group('Later this month', heads, later, cells, side));
      if (paid.length) out.push(group('Paid', heads, paid.sort(byDue).map(row), cells, side));
      if (!out.length) out.push(el('p', '', bills.length ? 'No bills fall in this month.' : 'No bills yet. Add one, or turn a repeating payment into one.'));
    } else {
      const list = (v === 'decide' ? items.filter(it => it.bill.decision === 'undecided') : items)
        .sort((a, b) => v === 'decide' ? b.facts.yearly - a.facts.yearly : a.bill.name.localeCompare(b.bill.name))
        .map(it => ({ ...it, amount: C.money(it.facts.usual ?? 0), sub: [EVERY[it.bill.cadence], accountName(it.bill.account_id), it.bill.login].filter(Boolean).join(' · ') }));
      const heads = [['Bill'], ['Every'], ['Usually', 1], ['A year', 1], ['Paid from'], ['Login'], ['Keep?']];
      const tags = it => [tag(DECISION[it.bill.decision]), ...(it.halted && it.bill.decision !== 'cancelled' ? [tag(['Stopped', 'rux--tag--warm-gray'])] : [])];
      const cells = it => [td(it.bill.name), td(EVERY[it.bill.cadence]), td(it.amount, 'coins-amount'), td(C.money(it.facts.yearly), 'coins-amount'), td(accountName(it.bill.account_id)), td(it.bill.login), tdTags(tags(it))];
      out.push(list.length ? group(v === 'decide' ? 'Keep or cancel' : 'Every bill', heads, list, cells, tags)
        : el('p', '', v === 'decide' ? 'Every bill has keep or cancel chosen.' : 'No bills yet.'));
    }
    $('coins-groups').replaceChildren(...out);
  }

  function viewSwitch(v) {
    const box = $('coins-view');
    box.replaceChildren(...VIEWS.map(([key, label]) => {
      const b = el('button', 'rux--content-switcher-btn' + (key === v ? ' rux--content-switcher--selected' : ''));
      b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(key === v)); b.tabIndex = key === v ? 0 : -1;
      const n = key === 'decide' ? bills.filter(x => x.decision === 'undecided').length : 0;
      b.append(el('span', 'rux--content-switcher__label', n ? `${label} (${n})` : label));
      b.addEventListener('click', () => { C.setParam('view', key === 'month' ? null : key); draw(); });
      return b;
    }));
  }

  // The suggestions list, opened from the notice.
  function drawSuggestions() {
    $('coins-suggest').replaceChildren(...suggestions.map(s => {
      const li = el('li', 'rux--contained-list-item');
      const row = el('div', 'rux--contained-list-item__content coins-row');
      const main = el('span', 'coins-row__main');
      main.append(el('span', 'coins-row__title', nice(s.merchant)),
        el('span', 'coins-row__sub', `Usually ${C.money(s.usual)} · ${s.months} months · last ${when(new Date(`${s.last.day}T00:00`))} · ${accountName(s.last.account_id)}`));
      const acts = el('span', 'coins-actions');
      const yes = el('a', 'rux--btn rux--btn--primary rux--btn--sm', 'Make it a bill');
      const q = new URLSearchParams({ new: '1', name: nice(s.merchant), match: s.merchant, amount: s.usual.toFixed(2), day: String(s.day), account: s.last.account_id });
      yes.href = `bill.html?${q}`;
      const no = el('button', 'rux--btn rux--btn--ghost rux--btn--sm', 'Not a bill'); no.type = 'button';
      no.addEventListener('click', async () => {
        try { no.disabled = true; await C.data.skip(people[0].household_id, s.merchant); skips.add(s.merchant); suggestions = suggestions.filter(x => x !== s); draw(); }
        catch (error) { fail(error); no.disabled = false; }
      });
      acts.append(yes, no);
      row.append(main, acts); li.append(row);
      return li;
    }));
  }
  $('coins-suggest-open').addEventListener('click', () => {
    const box = $('coins-suggest-box');
    box.hidden = !box.hidden;
    $('coins-suggest-open').textContent = box.hidden ? 'Review' : 'Hide';
  });

  (async () => {
    const since = C.iso(new Date(C.today().getTime() - 400 * 864e5));
    let skipRows;
    [people, accounts, bills, lines, skipRows] = await Promise.all([C.data.people(), C.data.accounts(), C.data.bills(), C.data.outgoing(since), C.data.skips()]);
    skips = new Set(skipRows.map(s => s.merchant));
    through = C.coverage(lines);
    suggestions = suggest();
    draw();
  })().catch(fail);
})();
