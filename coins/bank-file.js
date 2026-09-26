/* ==========================================================================
   bank-file.js — reading a bank's export and sorting its lines
   --------------------------------------------------------------------------
   `parse` turns the text of an export into lines, knowing the export by its
   column layout rather than by the bank's name. `kind` says what a line is,
   from the bank's own wording and the household's accounts and members;
   `merchant` strips a description to the name a merchant bills under; `apply`
   lays the household's rules over both. Nothing here reads the database, so
   it runs the same in the browser and under node.
   ========================================================================== */
(root => {
  'use strict';

  // Quoted fields, doubled quotes inside them, and \r\n or \n line ends.
  const csv = text => {
    const rows = []; let row = [], field = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false; }
        else field += c;
      } else if (c === '"') quoted = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c !== '\r') field += c;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    return rows.filter(r => r.some(c => c.trim()));
  };

  /* THE FOUR LAYOUTS, told apart by their header row. A layout may open with
     a summary block, so the header is the first row that matches one.
       card-with-category  Transaction Date, Post Date, Description, Category, Type, Amount, Memo
       bank-with-balance   Details, Posting Date, Description, Amount, Type, Balance, …
       bank-with-summary   a summary block, then Date, Description, Amount, Running Bal.
       plain-inverted      Date, Description, Amount, where a purchase is POSITIVE,
                           the other way round from the other three */
  const LAYOUTS = {
    'card-with-category': { test: h => h[0] === 'Transaction Date' && h[1] === 'Post Date', day: 'Transaction Date', type: 'Type', category: 'Category' },
    'bank-with-balance': { test: h => h[0] === 'Details' && h[1] === 'Posting Date', day: 'Posting Date', type: 'Type' },
    'bank-with-summary': { test: h => h[0] === 'Date' && h[3] === 'Running Bal.', day: 'Date' },
    'plain-inverted': { test: h => h[0] === 'Date' && h[1] === 'Description' && h.length === 3, day: 'Date', flip: true },
  };
  const layoutOf = head => Object.keys(LAYOUTS).find(k => LAYOUTS[k].test(head.map(c => c.trim()))) ?? null;

  // "1,622.47" and "-$30.00" both become a number.
  const number = x => parseFloat(String(x).replace(/[$,\s]/g, ''));

  // An export as { layout, lines }, or { layout: null } when no header is known.
  // Each line is { day, description, amount, bank_type, bank_category,
  // occurrence }, where occurrence numbers identical lines within the file.
  const parse = text => {
    const rows = csv(String(text).replace(/^﻿/, ''));
    const at = rows.findIndex(r => layoutOf(r));
    if (at < 0) return { layout: null, lines: [] };
    const head = rows[at].map(c => c.trim()), layout = layoutOf(head), L = LAYOUTS[layout];
    const get = (r, name) => name ? (r[head.indexOf(name)] ?? '').trim() : '';
    const lines = [], seen = new Map();
    for (const r of rows.slice(at + 1)) {
      const date = get(r, L.day);
      let amount = number(get(r, 'Amount'));
      if (!/^\d\d\/\d\d\/\d{4}$/.test(date) || Number.isNaN(amount)) continue;
      if (L.flip) amount = -amount;
      const [m, d, y] = date.split('/');
      const line = {
        day: `${y}-${m}-${d}`,
        description: get(r, 'Description').replace(/\s+/g, ' '),
        amount: Math.round(amount * 100) / 100,
        bank_type: get(r, L.type),
        bank_category: get(r, L.category),
      };
      const key = same(line);
      line.occurrence = (seen.get(key) ?? 0) + 1;
      seen.set(key, line.occurrence);
      lines.push(line);
    }
    return { layout, lines };
  };

  // What makes two lines the same line: everything the bank reported. The
  // database holds one row per account, this key and occurrence.
  const same = l => [l.day, l.description, Number(l.amount).toFixed(2), l.bank_type].join('\u0000');

  /* WHAT A LINE IS. `ctx` carries the last four digits of the household's
     accounts and its members' names in capitals.
       own-transfer   between the household's own accounts, or a card's side
                      of its payment, so it is neither earned nor spent
       card-payment   a bank account paying a card; the card's lines already
                      count what was bought
       household      money between members, which the household keeps
       fee            a bank's charge, counted as spent
       trade          anything bought or earned */
  const kind = (line, ctx = {}) => {
    const d = line.description.toUpperCase(), type = line.bank_type;
    const own = (ctx.last4 ?? []).filter(Boolean);
    if (type === 'ACCT_XFER' && own.some(n => d.includes(n))) return 'own-transfer';
    if (type === 'LOAN_PMT' && /^PAYMENT TO .*CARD/.test(d)) return 'card-payment';
    if (type === 'Payment' || /^PAYMENT THANK YOU|^MOBILE PAYMENT - THANK YOU|^ONLINE PAYMENT|^PAYMENT - THANK YOU/.test(d)) return 'own-transfer';
    if (/^ZELLE PAYMENT (TO|FROM)/.test(d)) return (ctx.members ?? []).some(n => n && d.includes(n)) ? 'household' : 'trade';
    if (type === 'FEE_TRANSACTION' || /^LATE FEE|SERVICE FEE|OVERDRAFT/.test(d)) return 'fee';
    return 'trade';
  };

  // Strip what changes between two charges from one merchant: the posting
  // date, phone numbers, store and transaction numbers, the city and state
  // tail. A Zelle line keeps the person's name and which way it went.
  const merchant = description => {
    const zelle = description.match(/^Zelle payment (to|from)\s+(.+?)(?:\s+for\b.*|\s*;.*|\s+Conf#.*|\s+(?:[A-Z]{3}\w+|\d{6,}))?$/i);
    if (zelle) return zelle[2].trim().toUpperCase() + (zelle[1].toLowerCase() === 'from' ? ' (IN)' : ' (OUT)');
    const s = description.toUpperCase()
      .replace(/\s+\d{2}\/\d{2}\s*$/, '')
      .replace(/TRANSACTION#:?\s*\d+/g, '')
      .replace(/PPD ID:?\s*\d+/g, '')
      .replace(/\b\d{3}[- ]?\d{3}[- ]?\d{4}\b/g, '')
      .replace(/\b[A-Z]{2,4}\d{4,}\w*\b/g, '')
      .replace(/\b\d{4,}\b/g, '')
      .replace(/[*#]/g, ' ')
      .replace(/\s+[A-Z]{2}\s*$/, '')
      .replace(/\s+/g, ' ')
      .trim();
    return s.split(' ').filter(w => /[A-Z]/.test(w)).slice(0, 3).join(' ') || s || description.toUpperCase();
  };

  // The household's rules, in their order: the first whose `match` the
  // description contains sets whatever it gives. A line sorted by hand keeps
  // its kind.
  const apply = (line, rules = []) => {
    const d = line.description.toUpperCase();
    const rule = rules.find(r => r.match && d.includes(r.match.toUpperCase()));
    if (!rule) return line;
    return {
      ...line,
      merchant: rule.merchant || line.merchant,
      kind: rule.kind && !line.kind_by_hand ? rule.kind : line.kind,
      category: rule.category || line.category,
    };
  };

  const bankFile = { parse, same, kind, merchant, apply, LAYOUTS: Object.keys(LAYOUTS) };
  root.Coins = Object.assign(root.Coins || {}, { bankFile });
})(typeof window === 'undefined' ? globalThis : window);
