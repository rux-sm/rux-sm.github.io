/* ==========================================================================
   overview.js — the Overview page
   --------------------------------------------------------------------------
   The chosen month's money in and out against the month before, the bills
   still to pay in it, what is left once they are paid, and every bill due in
   the next seven days or already late this month. Where a bill stands is
   app.js's billState, the same as the Bills page.
   ========================================================================== */
(() => {
  'use strict';

  const C = window.Coins;
  const $ = id => document.getElementById(id);
  if (!C?.data) { C?.notice('Coins needs a log-in to read the household.'); return; }

  let people = [], accounts = [], bills = [], billLines = [];

  const text = (id, value) => { $(id).textContent = value; };
  const change = (now, before, what) => {
    if (!before) return '';
    const d = now - before;
    return d === 0 ? `Same as ${what}` : `${d > 0 ? 'Up' : 'Down'} ${C.money(Math.abs(d))} on ${what}`;
  };

  // A row of the seven-day list: the bill, when and from where, its usual
  // amount and where it stands. It opens the bill.
  const TAG = { late: ['Late', 'rux--tag--red'], paid: ['Paid', 'rux--tag--green'], due: ['Due', 'rux--tag--blue'] };
  const row = (bill, facts, date, state) => {
    const li = document.createElement('li');
    li.className = 'rux--contained-list-item rux--contained-list-item--clickable';
    const account = accounts.find(a => a.id === bill.account_id);
    const when = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const [label, colour] = TAG[state];
    li.innerHTML = `<button type="button" class="rux--contained-list-item__content coins-row">
      <span class="coins-row__main"><span class="coins-row__title"></span><span class="coins-row__sub"></span></span>
      <span class="coins-row__side"><span class="coins-amount"></span>
        <span class="rux--tag ${colour} rux--tag--sm"><span class="rux--tag__label">${label}</span></span></span>
    </button>`;
    li.firstChild.addEventListener('click', () => { location.href = `bill.html?id=${encodeURIComponent(bill.id)}`; });
    li.querySelector('.coins-row__title').textContent = bill.name;
    li.querySelector('.coins-row__sub').textContent = [when, account?.name].filter(Boolean).join(' · ');
    li.querySelector('.coins-amount').textContent = facts.usual == null ? '' : C.money(facts.usual);
    return li;
  };
  const empty = message => {
    const li = document.createElement('li');
    li.className = 'rux--contained-list-item';
    li.innerHTML = '<div class="rux--contained-list-item__content"></div>';
    li.firstChild.textContent = message;
    return li;
  };

  async function draw() {
    const m = C.month(), whoId = C.who(people);
    text('coins-month', m.name);
    C.whoSwitch($('coins-who'), people, whoId, id => { C.setParam('who', id === 'both' ? null : id); draw(); });

    const mine = new Set(C.accountsFor(whoId, accounts).map(a => a.id));
    const billsHere = bills.filter(b => whoId === 'both' || mine.has(b.account_id) || b.person_id === whoId)
      .map(bill => ({ bill, facts: C.billFacts(bill, billLines) }));
    const through = C.coverage(billLines);

    const today = C.today();
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const prev = new Date(m.start.getFullYear(), m.start.getMonth() - 1, 1);
    const [lines, before] = await Promise.all([
      C.data.transactions(C.iso(m.start), C.iso(m.end)),
      C.data.transactions(C.iso(prev), C.iso(m.start)),
    ]);
    const ours = list => list.filter(t => mine.has(t.account_id));
    const t = C.totals(ours(lines)), b = C.totals(ours(before));
    const prevName = prev.toLocaleDateString('en-US', { month: 'long' });

    // Still to pay: this month's bills not paid yet, late ones included; in a
    // month ahead, every bill that falls in it; in a month gone by, none.
    const gone = +m.start < +thisMonth;
    const toPay = gone ? [] : billsHere.filter(x => { const st = C.billState(x.bill, x.facts, m.start, through); return st && st.state !== 'paid'; });
    const owed = toPay.reduce((s, x) => s + (x.facts.usual ?? 0), 0);

    text('coins-left-label', gone ? `Left in ${m.start.toLocaleDateString('en-US', { month: 'long' })}` : 'Left this month');
    text('coins-left-note', gone ? 'Money in, less money out' : 'After the bills still to come');
    text('coins-in', C.money(t.in));
    text('coins-in-note', change(t.in, b.in, prevName));
    text('coins-out', C.money(t.out));
    text('coins-out-note', change(t.out, b.out, prevName));
    text('coins-due', C.money(owed));
    text('coins-due-note', toPay.length === 1 ? '1 bill' : `${toPay.length} bills`);
    text('coins-left', C.money(t.in - t.out - owed));

    // The next seven days, always from today, whatever month is shown: this
    // month's late bills, and every bill due within the week, this month or
    // early next.
    const soonEnd = new Date(today.getTime() + 7 * 864e5);
    const next = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const soon = [];
    for (const { bill, facts } of billsHere) {
      const now = C.billState(bill, facts, thisMonth, through);
      if (now && now.state !== 'paid' && now.due <= soonEnd) soon.push([bill, facts, now.due, now.state]);
      const later = C.billState(bill, facts, next, through);
      if (later && later.state !== 'paid' && later.due <= soonEnd) soon.push([bill, facts, later.due, 'due']);
    }
    soon.sort((x, y) => x[2] - y[2]);
    const list = $('coins-soon');
    list.replaceChildren(...(soon.length ? soon.map(s => row(...s)) : [empty(bills.length ? 'Nothing is due in the next 7 days.' : 'No bills yet.')]));
  }

  const go = by => { C.setParam('month', C.shiftMonth(C.month(), by)); draw().catch(fail); };
  const fail = error => { console.error(error); C.notice('Coins could not read the household. Try again.'); };
  $('coins-prev').addEventListener('click', () => go(-1));
  $('coins-next').addEventListener('click', () => go(1));

  (async () => {
    const since = C.iso(new Date(C.today().getTime() - 400 * 864e5));
    [people, accounts, bills, billLines] = await Promise.all([C.data.people(), C.data.accounts(), C.data.bills(), C.data.outgoing(since)]);
    $('coins-empty').hidden = await C.data.anyTransactions();
    await draw();
  })().catch(fail);
})();
