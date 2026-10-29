/* ==========================================================================
   quickbooks-match.js — QUICKBOOKS' ESTIMATES AND INVOICES AGAINST THE TRIPS
   --------------------------------------------------------------------------
   `read(file)` reads QuickBooks' Custom Transaction Detail report, saved as
   Excel or CSV, into one record per estimate or invoice with its lines.
   `match(transactions, trips)` scores each against the trips and settles
   what the scores can: an invoice whose number a trip already records is
   that trip's; then, best scores first, each transaction takes at most one
   trip and each trip at most one transaction of each type. A match is
   `sure` when its score is high and clear of the runner-up, and `pick` when
   another trip comes close, for the office to choose. The page reads the
   report in the browser and never sends it anywhere, because it names
   customers and drivers.
   ========================================================================== */
(() => {
  'use strict';

  // Transactions before this day are not read: a 2026 trip can be billed or
  // quoted in late 2025, and nothing earlier is the scheduler's.
  const FROM = '2025-07-01';

  /* ── Reading the report ── */

  // An .xlsx is a zip: the entries are found by the central directory and
  // inflated by the browser's own DecompressionStream.
  async function unzip(buffer) {
    const view = new DataView(buffer);
    let end = buffer.byteLength - 22;
    while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end--;
    if (end < 0) throw new Error('This is not an Excel file.');
    const count = view.getUint16(end + 10, true);
    let at = view.getUint32(end + 16, true);
    const files = new Map();
    const names = new TextDecoder();
    for (let i = 0; i < count; i++) {
      const method = view.getUint16(at + 10, true);
      const size = view.getUint32(at + 20, true);
      const nameLen = view.getUint16(at + 28, true);
      const extraLen = view.getUint16(at + 30, true);
      const commentLen = view.getUint16(at + 32, true);
      const local = view.getUint32(at + 42, true);
      const name = names.decode(new Uint8Array(buffer, at + 46, nameLen));
      files.set(name, { method, size, local });
      at += 46 + nameLen + extraLen + commentLen;
    }
    return async name => {
      const f = files.get(name);
      if (!f) return null;
      const start = f.local + 30 + view.getUint16(f.local + 26, true) + view.getUint16(f.local + 28, true);
      const bytes = new Uint8Array(buffer, start, f.size);
      if (f.method === 0) return new TextDecoder().decode(bytes);
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return new Response(stream).text();
    };
  }

  // The first sheet's rows, each a list of cell texts by column.
  async function xlsxRows(buffer) {
    const entry = await unzip(buffer);
    const parse = text => new DOMParser().parseFromString(text, 'application/xml');
    const texts = node => [...node.getElementsByTagName('t')].map(t => t.textContent).join('');
    const shared = [];
    const ss = await entry('xl/sharedStrings.xml');
    if (ss) for (const si of parse(ss).getElementsByTagName('si')) shared.push(texts(si));
    const sheet = await entry('xl/worksheets/sheet1.xml');
    if (!sheet) throw new Error('The Excel file has no sheet.');
    const col = ref => [...ref.match(/^[A-Z]+/)[0]].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
    const rows = [];
    for (const row of parse(sheet).getElementsByTagName('row')) {
      const cells = [];
      for (const c of row.getElementsByTagName('c')) {
        const t = c.getAttribute('t');
        const v = c.getElementsByTagName('v')[0];
        let val;
        if (t === 'inlineStr') val = texts(c);
        else if (!v) continue;
        else val = t === 's' ? shared[Number(v.textContent)] : v.textContent;
        cells[col(c.getAttribute('r'))] = val;
      }
      rows.push(Array.from(cells, x => x ?? ''));
    }
    return rows;
  }

  // CSV as QuickBooks writes it: commas, and quotes around a field that holds one.
  function csvRows(text) {
    const rows = [];
    let row = [], field = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quoted) {
        if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (ch === '"') quoted = false;
        else field += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(field); rows.push(row); row = []; field = '';
      } else field += ch;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  // "12/30/24", or an Excel day number, as 2024-12-30.
  function isoDay(text) {
    const s = String(text || '').trim();
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
    if (m) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
    if (/^\d+(\.\d+)?$/.test(s)) return new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(s)) * 864e5).toISOString().slice(0, 10);
    return null;
  }

  /* The report's rows grouped by Trans #: the amount from the Accounts
     Receivable or Estimates row, and a line for each item but the zero
     Sales Tax one. Columns are found by their headings, which move when the
     report is customised. */
  async function read(file) {
    const rows = /\.xlsx$/i.test(file.name) ? await xlsxRows(await file.arrayBuffer()) : csvRows(await file.text());
    const head = rows.find(r => r.includes('Trans #'));
    if (!head || !head.includes('Type') || !head.includes('Num')) {
      throw new Error("This isn't the Transaction Detail report: it has no Trans #, Type and Num columns.");
    }
    const ix = Object.fromEntries(head.map((k, i) => [k, i]));
    const g = (r, k) => (k in ix ? String(r[ix[k]] ?? '') : '');
    const tx = new Map();
    for (const r of rows) {
      const type = g(r, 'Type');
      if (r === head || (type !== 'Invoice' && type !== 'Estimate')) continue;
      const key = g(r, 'Trans #');
      if (!tx.has(key)) {
        tx.set(key, { type, date: isoDay(g(r, 'Date')), num: g(r, 'Num'), po: g(r, 'P. O. #'),
                      name: g(r, 'Name'), amount: null, lines: [] });
      }
      const t = tx.get(key);
      const account = g(r, 'Account');
      if (account === 'Accounts Receivable' || account === 'Estimates') t.amount = Number(g(r, 'Amount')) || 0;
      else if (g(r, 'Item') && g(r, 'Item') !== 'no tax') {
        t.lines.push({ item: g(r, 'Item'), memo: g(r, 'Memo'), amount: -(Number(g(r, 'Amount')) || 0) || 0 });
      }
    }
    const list = [...tx.values()].filter(t => t.date);
    if (!list.length) throw new Error('The report holds no estimates or invoices.');
    return list;
  }

  /* ── Scoring ── */

  const STOP = new Set(['the', 'of', 'and', 'school', 'high', 'isd', 'cisd', 'inc', 'llc', 'club', 'team', 'church',
    'center', 'tx', 'texas', 'de', 'la', 'del', 'el', 'early', 'college', 'academy', 'middle', 'elementary', 'university']);
  const words = s => new Set((String(s || '').toLowerCase().replace(/&/g, ' and ').match(/[a-z0-9]+/g) || [])
    .filter(w => !STOP.has(w) && w.length > 1));
  // "P. S. J. A." is "psja": single letters run together before the words are read.
  const fold = s => String(s || '').toLowerCase().replace(/\./g, ' ').replace(/'/g, '')
    .replace(/\b([a-z])\.?\s+(?=[a-z]\b)/g, '$1');

  // How alike two words are, as Python's difflib ratio: matched letters over all.
  function likeness(a, b) {
    const matched = (a0, a1, b0, b1) => {
      let best = 0, bi = 0, bj = 0;
      for (let i = a0; i < a1; i++) {
        for (let j = b0; j < b1; j++) {
          let k = 0;
          while (i + k < a1 && j + k < b1 && a[i + k] === b[j + k]) k++;
          if (k > best) { best = k; bi = i; bj = j; }
        }
      }
      return best ? best + matched(a0, bi, b0, bj) + matched(bi + best, a1, bj + best, b1) : 0;
    };
    return (2 * matched(0, a.length, 0, b.length)) / (a.length + b.length);
  }

  // A word spelled a little differently, "calvary" and "cavalry", counts as the same word.
  function nameScore(a, b) {
    const wa = words(fold(a)), wb = words(fold(b));
    if (!wa.size || !wb.size) return 0;
    let same = 0;
    for (const w of wa) {
      if (wb.has(w) || (w.length > 3 && [...wb].some(v => likeness(w, v) >= 0.8))) same++;
    }
    return Math.min(1, same / Math.min(wa.size, wb.size));
  }

  const dayNum = iso => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 864e5;
  const isoOf = (y, m, d) => {
    const t = new Date(Date.UTC(y, m - 1, d));
    return t.getUTCMonth() === m - 1 && t.getUTCDate() === d ? t.toISOString().slice(0, 10) : null;
  };
  const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  // The days a memo names, "12/25", "12/25-26", "July 4, 2026", "JULY 18-20", read in the trip's year.
  function memoDays(memo, year) {
    const out = new Set();
    for (const [, mon, d, d2] of memo.toLowerCase().matchAll(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:\s*-\s*(\d{1,2}))?/g)) {
      for (const dd of [d, d2].filter(Boolean)) { const x = isoOf(year, MONTHS.indexOf(mon) + 1, +dd); if (x) out.add(x); }
    }
    for (const [, m, d, d2] of memo.matchAll(/\b(\d{1,2})\/(\d{1,2})(?:-(\d{1,2}))?/g)) {
      for (const dd of [d, d2].filter(Boolean)) { const x = isoOf(year, +m, +dd); if (x) out.add(x); }
    }
    return out;
  }
  const alnum = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // A transaction against a trip: the score and the reasons for it, or null for no match.
  function score(x, t) {
    const ns = nameScore(x.name, t.customer);
    const memo = x.lines.map(l => l.memo).join(' ');
    const days = memoDays(memo, +t.start.slice(0, 4));
    const onDay = days.has(t.start) || days.has(t.end);
    const amt = Math.round(x.amount || 0);
    /* A trip saved with no customer, or a customer QuickBooks names otherwise,
       is still its transaction's when a line names its day and the price is its price. */
    if (ns < 0.5 && !(onDay && t.prices.has(amt))) return null;
    let s = 4 * ns;
    const why = [];
    if (ns >= 0.5) why.push('name');
    if (x.po && t.po && alnum(x.po) === alnum(t.po)) { s += 6; why.push('P.O.'); }
    if (amt && t.prices.has(amt)) { s += 3; why.push('amount'); }
    else if (amt && [...t.prices].some(p => Math.abs(amt - p) <= 0.03 * p)) { s += 1; why.push('near amount'); }
    if (onDay) { s += 4; why.push('day in memo'); }
    if (x.type === 'Invoice') {
      // The office bills ahead: an invoice is often dated weeks before the trip.
      const gap = dayNum(x.date) - dayNum(t.end);
      if (gap >= -150 && gap <= 60) s += 2 - Math.abs(gap) / 100;
      else if (!why.includes('P.O.') && !why.includes('day in memo')) return null;
    } else {
      const lead = dayNum(t.start) - dayNum(x.date);
      if (lead >= -3 && lead <= 240) s += 1;
      else if (!why.includes('day in memo')) return null;
    }
    const dest = words(t.destination);
    if (dest.size && [...words(memo)].some(w => dest.has(w))) { s += 1; why.push('destination'); }
    return { score: Math.round(s * 100) / 100, why, onDay, ns };
  }

  /* Each kind settled in turn. Every transaction keeps its four best trips
     as `candidates`, the trips the office picks among. */
  function match(transactions, trips) {
    const live = trips.filter(t => !t.cancelled);
    const recordedOn = new Map();
    for (const t of live) for (const n of t.known) recordedOn.set(n, t);
    const out = {};
    for (const kind of ['Invoice', 'Estimate']) {
      const xs = transactions.filter(x => x.type === kind && x.date >= FROM);
      const usedX = new Map(), usedT = new Set(), cand = [];
      const perX = new Map();
      for (const x of xs) {
        const sc = [];
        for (const t of live) { const r = score(x, t); if (r) sc.push({ trip: t, ...r }); }
        sc.sort((a, b) => b.score - a.score);
        perX.set(x, sc.slice(0, 4));
        if (kind === 'Invoice' && recordedOn.has(x.num)) {
          const t = recordedOn.get(x.num);
          usedX.set(x, { state: 'recorded', trip: t }); usedT.add(t.id);
          continue;
        }
        for (const c of sc.slice(0, 4)) cand.push({ x, c });
      }
      cand.sort((a, b) => b.c.score - a.c.score);
      for (const { x, c } of cand) {
        if (usedX.has(x) || usedT.has(c.trip.id)) continue;
        const runner = perX.get(x).find(o => o.trip.id !== c.trip.id && !usedT.has(o.trip.id))?.score ?? 0;
        usedX.set(x, { state: c.score >= 9 && c.score - runner >= 3 ? 'sure' : 'pick', trip: c.trip, score: c.score });
        usedT.add(c.trip.id);
      }
      // A trip billed in two invoices: one left over that names a matched
      // trip's day, with its customer, is that trip's second, for the office to confirm.
      if (kind === 'Invoice') {
        for (const x of xs) {
          if (usedX.has(x)) continue;
          const c = perX.get(x).find(o => usedT.has(o.trip.id) && o.onDay && o.ns >= 0.5);
          if (c) usedX.set(x, { state: 'pick', trip: c.trip, score: c.score, second: true });
        }
      }
      out[kind] = xs.map(x => ({ ...x, ...(usedX.get(x) || { state: 'none', trip: null }), candidates: perX.get(x) }));
    }
    return out;
  }

  window.SchedulerQuickBooksMatch = { read, match, nameScore, FROM };
})();
