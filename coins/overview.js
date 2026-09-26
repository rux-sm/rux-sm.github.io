/* ==========================================================================
   overview.js — the Overview page
   --------------------------------------------------------------------------
   The chosen month's money in and out against the month before, the bills
   still to pay in it, what is left once they are paid, and every bill due in
   the next seven days or already late this month. A bill is paid in a month
   when a line in that month is linked to it.
   ========================================================================== */
(() => {
  'use strict';

  const C = window.Coins;
  const $ = id => document.getElementById(id);
  if (!C?.data) { C?.notice('Coins needs a log-in to read the household.'); return; }

  let people = [], accounts = [], bills = [];

  const text = (id, value) => { $(id).textContent = value; };
  const change = (now, before, what) => {
    if (!before) return '';
    const d = now - before;
    return d === 0 ? `Same as ${what}` : `${d > 0 ? 'Up' : 'Down'} ${C.money(Math.abs(d))} on ${what}`;
  };

  // A row of the seven-day list: the bill, when and from where, its amount
  // and where it stands.
  const TAG = { late: ['Late', 'rux--tag--red'], paid: ['Paid', 'rux--tag--green'], due: ['Due', 'rux--tag--blue'] };
  const row = (bill, date, state) => {
    const li = document.createElement('li');
    li.className = 'rux--contained-list-item';
    const account = accounts.find(a => a.id === bill.account_id);
    const when = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const [label, colour] = TAG[state];
    li.innerHTML = `<div class="rux--contained-list-item__content coins-row">
      <span class="coins-row__main"><span class="coins-row__title"></span><span class="coins-row__sub"></span></span>
      <span class="coins-row__side"><span class="coins-amount"></span>
        <span class="rux--tag ${colour} rux--tag--sm"><span class="rux--tag__label">${label}</span></span></span>
    </div>`;
    li.querySelector('.coins-row__title').textContent = bill.name;
    li.querySelector('.coins-row__sub').textContent = [when, account?.name].filter(Boolean).join(' · ');
    li.querySelector('.coins-amount').textContent = bill.amount == null ? '' : C.money(Number(bill.amount));
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
    const billsHere = bills.filter(b => b.decision !== 'cancelled' && b.due_day
      && (whoId === 'both' || mine.has(b.account_id) || b.person_id === whoId));

    const today = C.today();
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const prev = new Date(m.start.getFullYear(), m.start.getMonth() - 1, 1);
    const [lines, before, current] = await Promise.all([
      C.data.transactions(C.iso(m.start), C.iso(m.end)),
      C.data.transactions(C.iso(prev), C.iso(m.start)),
      +m.start === +thisMonth ? null : C.data.transactions(C.iso(thisMonth), C.iso(new Date(today.getFullYear(), today.getMonth() + 1, 1))),
    ]);
    const ours = list => list.filter(t => mine.has(t.account_id));
    const t = C.totals(ours(lines)), b = C.totals(ours(before));
    const prevName = prev.toLocaleDateString('en-US', { month: 'long' });

    // Still to pay: in this month, bills due from today on and not yet paid;
    // in a month ahead, every bill; in a month gone by, none.
    const paidIn = list => new Set(list.filter(x => x.bill_id).map(x => x.bill_id));
    const paid = paidIn(lines);
    const toPay = +m.start < +thisMonth ? []
      : billsHere.filter(x => !paid.has(x.id) && (+m.start > +thisMonth || C.dueIn(x, m.start.getFullYear(), m.start.getMonth()) >= today));
    const owed = toPay.reduce((s, x) => s + Number(x.amount ?? 0), 0);

    text('coins-in', C.money(t.in));
    text('coins-in-note', change(t.in, b.in, prevName));
    text('coins-out', C.money(t.out));
    text('coins-out-note', change(t.out, b.out, prevName));
    text('coins-due', C.money(owed));
    text('coins-due-note', toPay.length === 1 ? '1 bill' : `${toPay.length} bills`);
    text('coins-left', C.money(t.in - t.out - owed));

    // The next seven days, always from today, whatever month is shown, with
    // this month's late bills first.
    const paidNow = paidIn(current ?? lines);
    const soon = [];
    for (const bill of billsHere) {
      const thisDue = C.dueIn(bill, today.getFullYear(), today.getMonth());
      const nextDue = C.dueIn(bill, today.getFullYear(), today.getMonth() + 1);
      if (thisDue < today && !paidNow.has(bill.id)) soon.push([bill, thisDue, 'late']);
      const due = thisDue >= today ? thisDue : nextDue;
      if ((due - today) / 864e5 <= 7) soon.push([bill, due, due === thisDue && paidNow.has(bill.id) ? 'paid' : 'due']);
    }
    soon.sort((x, y) => x[1] - y[1]);
    const list = $('coins-soon');
    list.replaceChildren(...(soon.length ? soon.map(s => row(...s)) : [empty(bills.length ? 'Nothing is due in the next 7 days.' : 'No bills yet.')]));
  }

  const go = by => { C.setParam('month', C.shiftMonth(C.month(), by)); draw().catch(fail); };
  const fail = error => { console.error(error); C.notice('Coins could not read the household. Try again.'); };
  $('coins-prev').addEventListener('click', () => go(-1));
  $('coins-next').addEventListener('click', () => go(1));

  (async () => {
    [people, accounts, bills] = await Promise.all([C.data.people(), C.data.accounts(), C.data.bills()]);
    $('coins-empty').hidden = await C.data.anyTransactions();
    await draw();
  })().catch(fail);
})();
