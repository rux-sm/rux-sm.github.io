/* ==========================================================================
   bill.js — one bill
   --------------------------------------------------------------------------
   bill.html?id= shows a bill: where it stands this month, what it usually
   costs, its latest payment and a year of it, where it is paid from, its
   website and the login it is under, and its payments. Edit turns the page
   into the bill's form. bill.html?new=1 is the same form for a new bill,
   filled from the address when a suggestion opened it. Saving links every
   money-out line whose merchant or description contains the bill's match.
   A login is the email or username only; no password is ever asked for.
   ========================================================================== */
(() => {
  'use strict';

  const C = window.Coins;
  const $ = id => document.getElementById(id);
  if (!C?.data) { C?.notice('Coins needs a log-in to read the household.'); return; }

  const q = new URLSearchParams(location.search);
  const STATE = { late: ['Late', 'rux--tag--red'], due: ['Due', 'rux--tag--blue'], paid: ['Paid', 'rux--tag--green'] };
  const DECISION = { keep: ['Keep', 'rux--tag--green'], cancel: ['Cancel', 'rux--tag--red'], cancelled: ['Cancelled', 'rux--tag--cool-gray'], undecided: ['Keep or cancel not chosen', 'rux--tag--gray'] };
  const EVERY = { weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Every 3 months', yearly: 'Yearly', irregular: 'Now and then' };
  const KINDS = { subscription: 'Subscription', utility: 'Utility', rent: 'Rent', loan: 'Loan', card: 'Card', insurance: 'Insurance', person: 'A person', other: 'Other' };
  const DECISIONS = { undecided: 'Not chosen yet', keep: 'Keep', cancel: 'Cancel', cancelled: 'Cancelled' };

  let people = [], accounts = [], bill = null, lines = [], through = new Map();

  const fail = error => { console.error(error); C.notice(error?.message ? `That did not save: ${error.message}` : 'Coins could not reach the household. Try again.'); };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const tag = ([label, cls]) => { const t = el('span', `rux--tag ${cls}`); t.append(el('span', 'rux--tag__label', label)); return t; };
  const day = iso => new Date(`${iso}T00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const accountName = id => { const a = accounts.find(x => x.id === id); return a ? [a.name, a.last4 ? `··${a.last4}` : ''].filter(Boolean).join(' ') : ''; };
  const option = (value, text) => { const o = document.createElement('option'); o.value = value; o.textContent = text; return o; };
  // A website as a link that leaves the site, with https:// added when missing.
  const href = site => /^https?:\/\//i.test(site) ? site : `https://${site}`;

  function show() {
    const now = C.today();
    const facts = C.billFacts(bill, lines);
    const halted = C.stopped(bill, facts, C.coveredTo(bill, facts, through));
    const state = C.billState(bill, facts, new Date(now.getFullYear(), now.getMonth(), 1), through);
    document.title = `${bill.name} — Coins`;
    $('coins-name').textContent = bill.name;
    $('coins-tags').replaceChildren(...[tag(DECISION[bill.decision]), state && tag(STATE[state.state]),
      halted && bill.decision !== 'cancelled' && tag(['Stopped', 'rux--tag--warm-gray']),
      facts.rose && tag([`Last payment ${C.money(facts.rose)} more than usual`, 'rux--tag--purple'])].filter(Boolean));
    $('coins-usual').textContent = facts.usual == null ? '—' : C.money(facts.usual);
    $('coins-usual-note').textContent = [EVERY[bill.cadence], bill.due_day ? `around the ${ordinal(bill.due_day)}` : ''].filter(Boolean).join(', ');
    $('coins-latest').textContent = facts.latest ? C.money(facts.latestAmount) : '—';
    $('coins-latest-note').textContent = facts.latest ? `Paid ${day(facts.latest.day)}` : 'No payment found yet';
    $('coins-yearly').textContent = C.money(facts.yearly);
    $('coins-yearly-note').textContent = facts.paid.length >= 2 ? 'From the last 12 months of payments' : 'From the usual amount';

    const person = people.find(p => p.id === bill.person_id);
    const facts2 = [
      ['Paid from', accountName(bill.account_id)],
      ['Website', bill.website],
      ['Login', bill.login],
      ['Whose', person ? person.name : 'Both'],
      ['Kind', KINDS[bill.kind]],
      ['Finds payments containing', bill.match],
      ['Note', bill.notes],
    ].filter(([, v]) => v);
    $('coins-facts').replaceChildren(...facts2.map(([k, v]) => {
      const row = el('div', 'rux--structured-list-row');
      const cell = el('div', 'rux--structured-list-td');
      if (k === 'Website') { const a = el('a', 'rux--link', v); a.href = href(v); a.target = '_blank'; a.rel = 'noopener noreferrer'; cell.append(a); }
      else cell.textContent = v;
      row.append(el('div', 'rux--structured-list-td coins-fact__key', k), cell);
      return row;
    }));
    $('coins-open-site').hidden = !bill.website;
    if (bill.website) $('coins-open-site').href = href(bill.website);

    const recent = [...facts.paid].reverse().slice(0, 12);
    $('coins-payments-wrap').hidden = !recent.length;
    $('coins-payments').replaceChildren(...recent.map(l => {
      const li = el('li', 'rux--contained-list-item');
      const row = el('div', 'rux--contained-list-item__content coins-row');
      const main = el('span', 'coins-row__main');
      main.append(el('span', 'coins-row__title', day(l.day)), el('span', 'coins-row__sub', accountName(l.account_id)));
      const side = el('span', 'coins-row__side'); side.append(el('span', 'coins-amount', C.money(Number(l.amount))));
      row.append(main, side); li.append(row);
      return li;
    }));
    $('coins-view').hidden = false;
    $('coins-form-wrap').hidden = true;
  }
  const ordinal = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th'));

  // ---------- The form
  function edit(from) {
    const b = from ?? {};
    $('coins-form-title').textContent = bill ? `Edit ${bill.name}` : 'Add a bill';
    $('coins-f-name').value = b.name ?? '';
    $('coins-f-match').value = b.match ?? '';
    $('coins-f-kind').value = b.kind ?? 'subscription';
    $('coins-f-amount').value = b.amount ?? '';
    $('coins-f-cadence').value = b.cadence ?? 'monthly';
    $('coins-f-day').value = b.due_day ?? '';
    $('coins-f-account').value = b.account_id ?? '';
    $('coins-f-whose').value = b.person_id ?? '';
    $('coins-f-website').value = b.website ?? '';
    $('coins-f-login').value = b.login ?? '';
    $('coins-f-decision').value = b.decision ?? 'undecided';
    $('coins-f-notes').value = b.notes ?? '';
    $('coins-delete').hidden = !bill;
    $('coins-view').hidden = true;
    $('coins-form-wrap').hidden = false;
    $('coins-f-name').focus();
  }

  $('coins-edit').addEventListener('click', () => edit(bill));
  $('coins-cancel').addEventListener('click', () => { if (bill) { C.notice(); show(); } else location.href = 'bills.html'; });

  $('coins-form').addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('coins-f-name').value.trim(), match = $('coins-f-match').value.trim().toUpperCase();
    const amount = $('coins-f-amount').value.trim(), dueDay = $('coins-f-day').value.trim();
    if (!name) return C.notice('Give the bill a name.');
    if (match && match.length < 3) return C.notice('What the payments contain needs at least three letters.');
    if (amount && !(Number(amount) >= 0)) return C.notice('The amount is a number, like 15.99.');
    if (dueDay && !(Number.isInteger(Number(dueDay)) && dueDay >= 1 && dueDay <= 31)) return C.notice('The due day is a day of the month, 1 to 31.');
    const save = $('coins-save'); save.disabled = true;
    try {
      const saved = await C.data.saveBill({
        ...(bill ? { id: bill.id } : { household_id: people[0].household_id }),
        name, match, kind: $('coins-f-kind').value,
        amount: amount === '' ? null : Number(amount), cadence: $('coins-f-cadence').value,
        due_day: dueDay === '' ? null : Number(dueDay),
        account_id: $('coins-f-account').value || null, person_id: $('coins-f-whose').value || null,
        website: $('coins-f-website').value.trim(), login: $('coins-f-login').value.trim(),
        decision: $('coins-f-decision').value, notes: $('coins-f-notes').value.trim(),
      });
      if (!bill) { location.replace(`bill.html?id=${saved.id}`); return; }
      bill = saved;
      lines = await C.data.billLines(bill.id);
      C.notice();
      show();
    } catch (error) { fail(error); }
    save.disabled = false;
  });

  // Delete asks once more; the bill's payments stay, unlinked.
  $('coins-delete').addEventListener('click', async () => {
    const b = $('coins-delete');
    if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Delete this bill for good'; return; }
    try { b.disabled = true; await C.data.deleteBill(bill.id); location.href = 'bills.html'; }
    catch (error) { fail(error); b.disabled = false; }
  });

  (async () => {
    // What the files cover comes from every account's recent lines, not this bill's.
    let recent;
    [people, accounts, recent] = await Promise.all([C.data.people(), C.data.accounts(), C.data.outgoing(C.iso(new Date(C.today().getTime() - 90 * 864e5)))]);
    through = C.coverage(recent);
    $('coins-f-kind').replaceChildren(...Object.entries(KINDS).map(([k, t]) => option(k, t)));
    $('coins-f-cadence').replaceChildren(...Object.entries(EVERY).map(([k, t]) => option(k, t)));
    $('coins-f-decision').replaceChildren(...Object.entries(DECISIONS).map(([k, t]) => option(k, t)));
    $('coins-f-account').replaceChildren(option('', 'Not set'), ...accounts.filter(a => !a.closed).map(a => option(a.id, accountName(a.id))));
    $('coins-f-whose').replaceChildren(option('', 'Both'), ...people.map(p => option(p.id, p.name)));
    if (q.get('new')) {
      edit({ name: q.get('name') ?? '', match: q.get('match') ?? '', amount: q.get('amount') ?? '',
        due_day: q.get('day') ?? '', account_id: q.get('account') ?? '' });
      return;
    }
    const id = q.get('id');
    bill = (await C.data.bills()).find(b => b.id === id) ?? null;
    if (!bill) return C.notice('That bill is not in the household any more.');
    lines = await C.data.billLines(bill.id);
    show();
  })().catch(fail);
})();
