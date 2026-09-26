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

  const notice = (text = '') => {
    const box = document.getElementById('coins-error');
    if (!box) return;
    box.querySelector('.rux--inline-notification__title').textContent = text;
    box.hidden = !text;
  };

  window.Coins = Object.assign(window.Coins || {}, {
    money, iso, today, month, shiftMonth, who, setParam, accountsFor, whoSwitch, totals, dueIn, notice,
  });
})();
