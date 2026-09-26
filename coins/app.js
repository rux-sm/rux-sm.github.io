/* ==========================================================================
   app.js — what every Coins page shares
   --------------------------------------------------------------------------
   Money as text, the month and member a page shows (kept in the address, so
   a link or a reload keeps them), the Both / member switch, which accounts
   and lines count for the member chosen, and the error notice.
   ========================================================================== */
(() => {
  'use strict';

  const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const money = n => dollars.format(n).replace('-', '−');

  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

  // The month in the address as ?month=2026-09, or this month.
  const month = () => {
    const m = new URLSearchParams(location.search).get('month');
    const [y, mo] = /^\d{4}-\d{2}$/.test(m ?? '') ? m.split('-').map(Number) : [today().getFullYear(), today().getMonth() + 1];
    const start = new Date(y, mo - 1, 1);
    return {
      start, end: new Date(y, mo, 1),
      key: `${y}-${String(mo).padStart(2, '0')}`,
      name: start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      days: new Date(y, mo, 0).getDate(),
    };
  };
  const shiftMonth = (m, by) => { const d = new Date(m.start.getFullYear(), m.start.getMonth() + by, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

  // The member in the address as ?who=<person id>; anything else is Both.
  const who = people => {
    const id = new URLSearchParams(location.search).get('who');
    return people.some(p => p.id === id) ? id : 'both';
  };

  // Rewrites one part of the address without a reload.
  const setParam = (name, value) => {
    const q = new URLSearchParams(location.search);
    if (value == null) q.delete(name); else q.set(name, value);
    history.replaceState(null, '', `${location.pathname}${q.size ? '?' + q : ''}`);
  };

  // THE BOTH / MEMBER SWITCH. Both shows every account; a member shows the
  // accounts that are theirs alone, so a joint account counts only under Both.
  const accountsFor = (whoId, accounts) => whoId === 'both' ? accounts : accounts.filter(a => a.person_id === whoId);

  const whoSwitch = (el, people, selected, onChange) => {
    const options = [{ id: 'both', name: 'Both' }, ...people];
    el.innerHTML = '';
    for (const p of options) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'rux--content-switcher-btn' + (p.id === selected ? ' rux--content-switcher--selected' : '');
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(p.id === selected));
      b.tabIndex = p.id === selected ? 0 : -1;
      const label = document.createElement('span');
      label.className = 'rux--content-switcher__label';
      label.textContent = p.name;
      b.append(label);
      b.addEventListener('click', () => onChange(p.id));
      el.append(b);
    }
  };

  // What a set of lines adds up to. Only bought-or-earned lines and fees are
  // money in or out of the household; transfers and card payments move money
  // it already has.
  const totals = lines => {
    let income = 0, out = 0;
    for (const t of lines) {
      const a = Number(t.amount);
      if (t.kind === 'trade' && a > 0) income += a;
      else if ((t.kind === 'trade' || t.kind === 'fee') && a < 0) out -= a;
    }
    return { in: income, out };
  };

  // A bill's due date in a month, on its due day or the month's last day.
  const dueIn = (bill, year, monthIndex) => {
    const last = new Date(year, monthIndex + 1, 0).getDate();
    return new Date(year, monthIndex, Math.min(bill.due_day, last));
  };

  /* BILLS. A line is a bill's when its merchant or description contains the
     bill's match text; lines already linked carry bill_id. */
  const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
  const matches = (bill, line) => {
    const m = String(bill.match || '').toUpperCase();
    return m.length >= 3 && Number(line.amount) < 0
      && (String(line.merchant || '').toUpperCase().includes(m) || String(line.description || '').toUpperCase().includes(m));
  };
  // A bill with no match text is paid inside another, like an app billed
  // through Apple: it has no lines of its own, so it has no month to be paid,
  // late or due in, and the bill that holds it already counts its cost.
  const tracked = bill => String(bill.match || '').trim().length >= 3;
  const EVERY = { weekly: 0, monthly: 1, quarterly: 3, yearly: 12, irregular: 0 };
  const PER_YEAR = { weekly: 52, monthly: 12, quarterly: 4, yearly: 1, irregular: 0 };

  // What a bill's own lines say: its usual amount, its latest payment, what a
  // year costs, and whether the latest cost more than usual by more than
  // $1.99 and 5% together, the line a price rise is drawn at.
  const billFacts = (bill, linked) => {
    const paid = linked.filter(l => l.bill_id === bill.id).sort((a, b) => a.day.localeCompare(b.day));
    const amounts = paid.map(l => -Number(l.amount));
    const latest = paid.at(-1) ?? null;
    const before = median(amounts.slice(-7, -1));
    const usual = median(amounts.slice(-6)) ?? (bill.amount == null ? null : Number(bill.amount));
    const yearAgo = iso(new Date(today().getTime() - 365 * 864e5));
    const lastYear = paid.filter(l => l.day >= yearAgo);
    const yearly = lastYear.length >= 2 ? lastYear.reduce((s, l) => s - Number(l.amount), 0)
      : (usual ?? 0) * PER_YEAR[bill.cadence];
    const latestAmount = latest ? -Number(latest.amount) : null;
    const rose = latest && before != null && latestAmount - before > Math.max(1.99, before * 0.05) ? latestAmount - before : 0;
    return { paid, usual, latest, latestAmount, yearly, rose };
  };

  // When a bill falls due in a month, or null when it does not come that
  // month. Monthly and weekly bills come every month; quarterly and yearly
  // ones in step with their last payment, or on the due day when none is known.
  const billDue = (bill, facts, year, monthIndex) => {
    if (bill.decision === 'cancelled' || !bill.due_day) return null;
    const step = EVERY[bill.cadence];
    if (step > 1 && facts.latest) {
      const [y, m] = facts.latest.day.split('-').map(Number);
      const gap = (year * 12 + monthIndex) - (y * 12 + m - 1);
      if (gap % step !== 0) return null;
    }
    return dueIn(bill, year, monthIndex);
  };

  /* WHAT THE FILES COVER. The last day each account's lines reach, so a bill
     due after it is not called late: its payment cannot have been imported
     yet. A bill is judged by its own account, or by the account its latest
     payment came from, or by today when neither is known. */
  const coverage = lines => {
    const through = new Map();
    for (const l of lines) if (l.day > (through.get(l.account_id) ?? '')) through.set(l.account_id, l.day);
    return through;
  };
  const coveredTo = (bill, facts, through) => {
    const d = through.get(bill.account_id) ?? (facts.latest && through.get(facts.latest.account_id));
    return d ? new Date(`${d}T00:00`) : today();
  };

  // A bill has stopped when nothing has been paid for two of its periods up
  // to the last day the files cover, so it is no longer expected.
  const GAP = { weekly: 21, monthly: 62, quarterly: 200, yearly: 400, irregular: Infinity };
  const stopped = (bill, facts, covered) => Boolean(facts.latest)
    && (covered - new Date(`${facts.latest.day}T00:00`)) / 864e5 > GAP[bill.cadence];

  // Where a bill stands in a month: paid, late or due, or null when it does
  // not fall in the month or has stopped. Late only when the files already
  // cover the due day.
  const billState = (bill, facts, start, through = new Map()) => {
    if (!tracked(bill)) return null;
    const month = iso(start).slice(0, 7);
    const due = billDue(bill, facts, start.getFullYear(), start.getMonth());
    // Paid in the month, or up to ten days early for a due day early in it.
    const early = due && iso(new Date(due.getTime() - 10 * 864e5));
    const paidNow = facts.paid.find(l => l.day.startsWith(month))
      ?? (due && facts.paid.find(l => l.day >= early && l.day < month));
    if (paidNow) return { state: 'paid', due: due ?? new Date(`${paidNow.day}T00:00`), line: paidNow };
    const covered = coveredTo(bill, facts, through);
    if (!due || stopped(bill, facts, covered)) return null;
    return { state: due <= covered && due < today() ? 'late' : 'due', due };
  };

  const notice = (text = '') => {
    const box = document.getElementById('coins-error');
    if (!box) return;
    box.querySelector('.rux--inline-notification__title').textContent = text;
    box.hidden = !text;
  };

  window.Coins = Object.assign(window.Coins || {}, {
    money, iso, today, month, shiftMonth, who, setParam, accountsFor, whoSwitch, totals, dueIn, notice,
    median, matches, tracked, billFacts, billDue, billState, coverage, coveredTo, stopped, PER_YEAR,
  });
})();
