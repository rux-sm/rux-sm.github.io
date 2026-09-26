/* ==========================================================================
   transactions.js — the Transactions page
   --------------------------------------------------------------------------
   Every line of the chosen month for the chosen member, newest first, with
   search and filters, the month's in, out and net above, and a dot on each
   line nobody has looked at yet. A wide screen shows a table; a phone shows
   the same lines as a list grouped by day. A line opens in a side panel to
   change its category, kind and note, and to make that a rule for every line
   like it. Opening a line marks it looked at.
   ========================================================================== */
(() => {
  'use strict';

  const C = window.Coins;
  const $ = id => document.getElementById(id);
  if (!C?.data) { C?.notice('Coins needs a log-in to read the household.'); return; }

  const KIND = { trade: 'Bought or earned', fee: 'Fee', 'own-transfer': 'Own transfer', 'card-payment': 'Card payment', household: 'Between us' };
  const KIND_TAG = { fee: 'rux--tag--red', 'own-transfer': 'rux--tag--cool-gray', 'card-payment': 'rux--tag--cool-gray', household: 'rux--tag--teal' };
  // The categories offered before the household has made its own.
  const CATEGORIES = ['Groceries', 'Eating out', 'Transport', 'Gas', 'Subscriptions', 'Utilities', 'Phone', 'Rent',
    'Insurance', 'Shopping', 'Health', 'Entertainment', 'Travel', 'Gifts', 'Income', 'Fees', 'Other'];

  let people = [], accounts = [], rules = [], lines = [], open = null;

  const fail = error => { console.error(error); C.notice(error?.message ? `That did not save: ${error.message}` : 'Coins could not reach the household. Try again.'); };
  const when = (iso, long) => new Date(`${iso}T00:00`).toLocaleDateString('en-US', long ? { weekday: 'long', month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric' });
  // A merchant in capitals as a name: "GROCERY STORE" reads "Grocery Store".
  const nice = s => String(s || '').toLowerCase().replace(/(^|[\s/(-])([a-z])/g, (m, a, b) => a + b.toUpperCase());
  const title = l => nice(l.merchant) || l.description;
  const accountOf = l => accounts.find(a => a.id === l.account_id);
  const accountName = a => a ? [a.name, a.last4 ? `··${a.last4}` : ''].filter(Boolean).join(' ') : '';
  const categoryOf = l => l.category || l.bank_category || '';

  // What the search and filters leave.
  function shown(whoId) {
    const mine = new Set(C.accountsFor(whoId, accounts).map(a => a.id));
    const q = $('coins-search').value.trim().toLowerCase();
    const acct = $('coins-filter-account').value, kind = $('coins-filter-kind').value;
    return lines.filter(l => mine.has(l.account_id)
      && (!acct || l.account_id === acct)
      && (!kind || l.kind === kind)
      && (!q || [l.description, l.merchant, categoryOf(l), l.note].some(v => String(v || '').toLowerCase().includes(q))));
  }

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const dot = l => { if (l.seen) return null; const d = el('span', 'coins-dot'); d.title = 'Not looked at yet'; return d; };
  const kindTag = l => KIND_TAG[l.kind] ? Object.assign(el('span', `rux--tag rux--tag--sm ${KIND_TAG[l.kind]}`), { innerHTML: `<span class="rux--tag__label">${KIND[l.kind]}</span>` }) : null;
  const amountText = l => C.money(Number(l.amount));

  function draw() {
    const whoId = C.who(people), m = C.month();
    $('coins-month').textContent = m.name;
    C.whoSwitch($('coins-who'), people, whoId, id => { C.setParam('who', id === 'both' ? null : id); fillAccountFilter(); draw(); });

    const list = shown(whoId);
    const t = C.totals(list);
    $('coins-sum').textContent = `In ${C.money(t.in)} · Out ${C.money(t.out)} · Net ${C.money(t.in - t.out)} · ${list.length === 1 ? '1 line' : `${list.length} lines`}`;
    const unseen = list.filter(l => !l.seen);
    $('coins-seen-all').hidden = !unseen.length;
    $('coins-seen-all').textContent = `Mark ${unseen.length} as looked at`;
    $('coins-none').hidden = list.length > 0;

    // The table, for a wide screen.
    $('coins-rows').replaceChildren(...list.map(l => {
      const tr = el('tr', 'coins-line');
      tr.tabIndex = 0;
      tr.dataset.id = l.id;
      const desc = el('td');
      const top = el('span', 'coins-line__name');
      top.append(...[dot(l), el('span', '', title(l)), kindTag(l)].filter(Boolean));
      desc.append(top, el('span', 'coins-row__sub', l.description));
      tr.append(el('td', '', when(l.day)), desc, el('td', '', accountName(accountOf(l))), el('td', '', categoryOf(l)),
        el('td', `coins-amount${Number(l.amount) > 0 ? ' coins-amount--in' : ''}`, amountText(l)));
      return tr;
    }));

    // The list, for a phone: one group a day.
    const days = new Map();
    for (const l of list) (days.get(l.day) ?? days.set(l.day, []).get(l.day)).push(l);
    $('coins-days').replaceChildren(...[...days].map(([day, ls]) => {
      const box = el('div', 'rux--contained-list rux--layout--size-lg rux--contained-list--on-page');
      const head = el('div', 'rux--contained-list__header');
      head.append(el('h2', 'rux--contained-list__label', when(day, true)));
      const ul = el('ul'); ul.setAttribute('role', 'list');
      ul.append(...ls.map(l => {
        const li = el('li', 'rux--contained-list-item rux--contained-list-item--clickable');
        const b = el('button', 'rux--contained-list-item__content coins-row');
        b.type = 'button';
        b.dataset.id = l.id;
        const main = el('span', 'coins-row__main');
        const name = el('span', 'coins-row__title');
        name.append(...[dot(l), el('span', '', title(l))].filter(Boolean));
        main.append(name, el('span', 'coins-row__sub', [categoryOf(l), accountName(accountOf(l))].filter(Boolean).join(' · ')));
        const side = el('span', 'coins-row__side');
        side.append(...[el('span', `coins-amount${Number(l.amount) > 0 ? ' coins-amount--in' : ''}`, amountText(l)), kindTag(l)].filter(Boolean));
        b.append(main, side);
        li.append(b);
        return li;
      }));
      box.append(head, ul);
      return box;
    }));
  }

  // ---------- The panel
  const panel = $('coins-panel');
  let release = null, opener = null;
  function openLine(id, from) {
    const l = lines.find(x => x.id === id);
    if (!l) return;
    open = l; opener = from;
    const a = accountOf(l);
    $('coins-panel-label').textContent = [when(l.day), accountName(a)].filter(Boolean).join(' · ');
    $('coins-panel-title').textContent = title(l);
    $('coins-panel-sub').textContent = `${amountText(l)} · ${l.description}`;
    $('coins-edit-category').value = l.category || '';
    $('coins-edit-category').placeholder = l.bank_category || '';
    $('coins-edit-kind').value = l.kind;
    $('coins-edit-note').value = l.note || '';
    $('coins-edit-rule').checked = false;
    $('coins-edit-match').value = (l.merchant || l.description).split(' (')[0];
    $('coins-rule-fields').hidden = true;
    panel.hidden = false;
    panel.classList.add('rux--side-panel--open');
    $('coins-panel-close').focus();
    release = window.Rux?.overlay?.register({ element: panel, close: () => closePanel(), dismissOn: { outside: true, escape: true } })?.release ?? null;
    if (!l.seen) {
      l.seen = true;
      C.data.markSeen([l.id]).then(draw, fail);
    }
  }
  function closePanel() {
    if (panel.hidden) return;
    panel.classList.remove('rux--side-panel--open');
    panel.hidden = true;
    release?.(); release = null;
    open = null;
    opener?.focus?.();
  }
  $('coins-panel-close').addEventListener('click', closePanel);
  $('coins-edit-cancel').addEventListener('click', closePanel);
  $('coins-edit-rule').addEventListener('change', e => { $('coins-rule-fields').hidden = !e.target.checked; });

  $('coins-edit').addEventListener('submit', async e => {
    e.preventDefault();
    const l = open;
    if (!l) return;
    const kind = $('coins-edit-kind').value;
    const patch = { category: $('coins-edit-category').value.trim(), note: $('coins-edit-note').value.trim(), seen: true };
    if (kind !== l.kind) { patch.kind = kind; patch.kind_by_hand = true; }
    const save = $('coins-edit-save');
    save.disabled = true;
    try {
      await C.data.updateLine(l.id, patch);
      Object.assign(l, patch);
      let said = '';
      if ($('coins-edit-rule').checked) {
        const match = $('coins-edit-match').value.trim();
        if (match.length < 3) { save.disabled = false; return C.notice('A rule needs at least three letters to match.'); }
        const { rule, changed } = await C.data.addRule({
          household_id: people[0].household_id, match: match.toUpperCase(),
          category: patch.category, kind: patch.kind ?? null, sort: rules.length,
        });
        rules.push(rule);
        said = `The rule sorted ${changed === 1 ? '1 line' : `${changed} lines`}.`;
        await load();
      }
      closePanel();
      draw();
      C.notice();
      if (said) status(said);
    } catch (error) { fail(error); }
    save.disabled = false;
  });
  const status = text => { $('coins-status').textContent = text; $('coins-status-wrap').hidden = !text; };

  // A row opens its line, by pointer or by Enter.
  $('coins-rows').addEventListener('click', e => { const tr = e.target.closest('tr[data-id]'); if (tr) openLine(tr.dataset.id, tr); });
  $('coins-rows').addEventListener('keydown', e => { if (e.key === 'Enter') { const tr = e.target.closest('tr[data-id]'); if (tr) openLine(tr.dataset.id, tr); } });
  $('coins-days').addEventListener('click', e => { const b = e.target.closest('button[data-id]'); if (b) openLine(b.dataset.id, b); });

  // ---------- Filters, month and marking
  const option = (value, text) => { const o = document.createElement('option'); o.value = value; o.textContent = text; return o; };
  function fillAccountFilter() {
    const sel = $('coins-filter-account'), keep = sel.value;
    const mine = C.accountsFor(C.who(people), accounts);
    sel.replaceChildren(option('', 'All accounts'), ...mine.map(a => option(a.id, accountName(a))));
    sel.value = mine.some(a => a.id === keep) ? keep : '';
  }
  for (const id of ['coins-search', 'coins-filter-account', 'coins-filter-kind']) $(id).addEventListener('input', draw);
  $('coins-seen-all').addEventListener('click', async () => {
    const ids = shown(C.who(people)).filter(l => !l.seen).map(l => l.id);
    try { await C.data.markSeen(ids); for (const l of lines) if (ids.includes(l.id)) l.seen = true; draw(); } catch (error) { fail(error); }
  });
  const go = by => { C.setParam('month', C.shiftMonth(C.month(), by)); closePanel(); status(''); load().then(draw).catch(fail); };
  $('coins-prev').addEventListener('click', () => go(-1));
  $('coins-next').addEventListener('click', () => go(1));

  async function load() {
    const m = C.month();
    lines = await C.data.lines(C.iso(m.start), C.iso(m.end));
    const known = new Set([...CATEGORIES, ...rules.map(r => r.category), ...lines.map(categoryOf)].filter(Boolean));
    $('coins-categories').replaceChildren(...[...known].sort().map(c => option(c, '')));
  }

  $('coins-filter-kind').append(...Object.entries(KIND).map(([k, t]) => option(k, t)));
  $('coins-edit-kind').append(...Object.entries(KIND).map(([k, t]) => option(k, t)));
  (async () => {
    [people, accounts, rules] = await Promise.all([C.data.people(), C.data.accounts(), C.data.rules()]);
    fillAccountFilter();
    await load();
    draw();
  })().catch(fail);
})();
