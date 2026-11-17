/* ==========================================================================
   quickbooks.js — THE QUICKBOOKS PAGE
   --------------------------------------------------------------------------
   quickbooks.html sends a week's invoices to QuickBooks and matches what
   QuickBooks holds to the trips.

   EXPORT lists the week's confirmed trips with no invoice, the week
   starting on the board's own first day and opening on this one, each
   written or held back with why by quickbooks-iif.js. Export week saves the
   IIF file, and Mark imported, once QuickBooks has taken it, records each
   trip invoiced so no export takes it again.

   MATCH: the office chooses the Transaction Detail report; quickbooks-match.js
   reads it and scores it against every trip, and this page lists what the
   scores leave open: an invoice or estimate that could be one of a few
   trips, each card with those trips ticked or not, the likeliest ticked,
   and that customer's past invoices, how much and how far ahead of the
   trip, so the pick goes by what was done before. Save records it the way
   the Billing tab does: an invoice as a `trip_invoices` row, with the
   trip's invoice columns when it is the trip's first, and an estimate as
   `trip_prep.qb_estimate`, each with a history entry marked as a QuickBooks
   match; an invoice on a trip Mark imported left with an unnumbered row
   numbers that row. Skip hides a card in this browser. Invoices no trip
   fits are listed to look up by hand. And each customer's QuickBooks name
   is the one its matched invoices carry, the most-used where there are
   several, which Save names keeps for Export.
   ========================================================================== */
(() => {
  'use strict';

  const { $, el } = window.SchedulerPair;
  const pair = window.SchedulerPair.page({ list: 'quickbooks', one: 'match' });
  const QB = window.SchedulerQuickBooksMatch;
  const IIF = window.SchedulerQuickBooksIif;
  const WEEK = window.SchedulerWeek;

  const SKIPPED_KEY = 'scheduler-quickbooks-skipped';
  const PAST_SHOWN = 5;
  const HISTORY_META = { source: 'QuickBooks match' };

  let db = null;
  let actor = null;
  let trips = [];
  let matched = null;
  let customers = [];
  let showSkipped = false;

  // ── words ───────────────────────────────────────────────────────────────
  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const dayFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const shortFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const day = iso => (iso ? dayFmt.format(new Date(`${iso}T00:00:00Z`)) : '');
  const days = (from, to) => (from === to ? day(from) : `${shortFmt.format(new Date(`${from}T00:00:00Z`))} – ${day(to)}`);
  const gapDays = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5);
  const ahead = (invoiced, start) => {
    const n = gapDays(invoiced, start);
    if (n > 0) return `${n} day${n === 1 ? '' : 's'} before the trip`;
    if (n < 0) return `${-n} day${n === -1 ? '' : 's'} after it began`;
    return 'the day it began';
  };

  // ── skipped cards, this browser only ────────────────────────────────────
  const skipKey = x => `${x.type}:${x.num}`;
  function readSkipped() {
    try { return new Set(JSON.parse(localStorage.getItem(SKIPPED_KEY) || '[]')); } catch { return new Set(); }
  }
  function writeSkipped(set) {
    try { localStorage.setItem(SKIPPED_KEY, JSON.stringify([...set])); } catch { /* kept for this visit only */ }
  }
  let skipped = readSkipped();

  /* ── The trips ──
     Every trip, a thousand a read, with what it already records: its invoice
     numbers, from its rows and the old column, and its estimate tick. */
  const TRIP_COLUMNS = 'id,trip_ref,start_date,end_date,customer,customer_id,destination,quoted_price,quote_sent_price,po_ref,'
    + 'cancelled_at,invoice_number,invoiced,trip_invoices(id,number,position),trip_prep(qb_estimate)';
  async function readTrips() {
    const rows = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db.from('trips').select(TRIP_COLUMNS).order('start_date').range(from, from + 999);
      if (error) throw new Error(error.message);
      rows.push(...data);
      if (data.length < 1000) break;
    }
    return rows.map(t => {
      const prep = Array.isArray(t.trip_prep) ? t.trip_prep[0] : t.trip_prep;
      const numbers = [t.invoice_number, ...(t.trip_invoices || []).map(i => i.number)].join(' ');
      return {
        id: t.id, ref: String(t.trip_ref ?? ''), start: t.start_date, end: t.end_date || t.start_date,
        customer: t.customer || '', destination: t.destination || '', po: t.po_ref || '',
        cancelled: !!t.cancelled_at,
        prices: new Set([t.quoted_price, t.quote_sent_price].filter(p => p != null && p !== '').map(p => Math.round(Number(p)))),
        known: new Set(numbers.match(/\d{5}/g) || []),
        invoiceRows: (t.trip_invoices || []).length,
        // The row Mark imported left for QuickBooks' number, which a match fills.
        unnumbered: (t.trip_invoices || []).find(i => !i.number)?.id ?? null,
        customerId: t.customer_id,
        invoiced: !!t.invoiced || !!t.invoice_number || (t.trip_invoices || []).length > 0,
        ticked: !!prep?.qb_estimate,
        row: t,
      };
    });
  }

  /* ── Choosing the report ── */
  const fileInput = $('scheduler-quickbooks-file');
  const drop = $('scheduler-quickbooks-drop');
  async function choose(files) {
    const file = files?.[0];
    if (!file) return;
    if (!db) return;
    drop.textContent = `Reading ${file.name}…`;
    try {
      const transactions = await QB.read(file);
      trips = await readTrips();
      matched = QB.match(transactions, trips);
      customers = await readCustomers();
      pair.say(null);
      drop.textContent = `${file.name} · choose another report`;
      draw();
    } catch (err) {
      drop.textContent = 'Drag and drop the report here or click to choose it';
      pair.say('error', "The report wasn't read", err.message);
    }
  }
  drop.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => { choose(fileInput.files); fileInput.value = ''; });
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('rux--file__drop-container--drag-over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('rux--file__drop-container--drag-over'));
  drop.addEventListener('drop', e => {
    e.preventDefault();
    drop.classList.remove('rux--file__drop-container--drag-over');
    choose(e.dataTransfer?.files);
  });

  /* ── Drawing ── */

  // What the page counts, in one sentence above the cards.
  function drawSummary() {
    const count = (list, state) => list.filter(x => x.state === state).length;
    const inv = matched.Invoice, est = matched.Estimate;
    const settledEst = est.filter(x => x.trip?.ticked).length;
    const text = `From ${day(QB.FROM)} on: ${inv.length} invoices, ${count(inv, 'recorded')} already on their trips, `
      + `${picks('Invoice').length} to pick and ${count(inv, 'none')} no trip fits; `
      + `${est.length} estimates, ${settledEst} already ticked and ${picks('Estimate').length} to pick.`
      + (skipped.size ? ` ${skipped.size} skipped.` : '');
    const p = $('scheduler-quickbooks-summary');
    p.hidden = false;
    p.textContent = text;
  }

  /* What is left to pick: an invoice not on a trip yet, or an estimate whose
     likeliest trip is not ticked, that some trip could be. A sure match
     not saved yet is listed too, already ticked. */
  function picks(type) {
    return matched[type].filter(x => {
      if (x.state === 'recorded' || x.state === 'none' || x.saved) return false;
      if (type === 'Estimate' && x.trip?.ticked) return false;
      return true;
    }).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }

  // The customer's other invoices in the report, newest first, with the trip each is on.
  function pastInvoices(x) {
    return matched.Invoice
      .filter(o => o !== x && o.name === x.name)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, PAST_SHOWN);
  }

  const checkboxId = (x, t) => `scheduler-quickbooks-${x.type === 'Invoice' ? 'i' : 'e'}${x.num || x.date}-${t.ref}`;

  // One trip the transaction could be: a checkbox, the trip in a line, and why under it.
  function tripChoice(x, c) {
    const t = c.trip;
    const wrap = el('div', 'rux--form-item rux--checkbox-wrapper');
    const input = el('input', 'rux--checkbox');
    input.type = 'checkbox';
    input.id = checkboxId(x, t);
    input.value = t.id;
    input.checked = x.trip?.id === t.id;
    const label = el('label', 'rux--checkbox-label');
    label.htmlFor = input.id;
    const price = [...t.prices][0];
    const text = el('div', 'rux--checkbox-label-text',
      [t.ref, days(t.start, t.end), t.customer || 'No customer', t.destination, price ? money.format(price) : 'no price']
        .filter(Boolean).join(' · '));
    // Why it is a candidate, a quiet second line: Carbon shows no helper text
    // under one checkbox of a group.
    const notes = [c.why.length ? `Matches on ${c.why.join(', ')}` : 'Matches on little'];
    if (x.type === 'Invoice' && t.known.size) notes.push(`already has invoice ${[...t.known].join(', ')}`);
    if (x.type === 'Estimate' && t.ticked) notes.push('estimate already ticked');
    text.append(el('span', 'scheduler-quickbooks-why', notes.join('; ')));
    label.append(text);
    wrap.append(input, label);
    return wrap;
  }

  function pickCard(x) {
    const card = el('article', 'rux--tile scheduler-quickbooks-pick');
    const stack = el('div', 'rux--stack-vertical rux--stack-scale-4');
    const word = x.type === 'Invoice' ? 'Invoice' : 'Estimate';
    const head = el('div', 'rux--stack-vertical rux--stack-scale-1');
    head.append(
      el('h3', 'rux--type-heading-compact-02', `${word} ${x.num || 'with no number'} · ${x.name}`),
      el('p', 'rux--type-body-compact-01 scheduler-quickbooks-quiet',
        [day(x.date), money.format(x.amount || 0), x.po ? `P.O. ${x.po}` : ''].filter(Boolean).join(' · ')));
    stack.append(head);

    if (x.lines.length) {
      const lines = el('ul', 'scheduler-quickbooks-lines');
      for (const l of x.lines) {
        lines.append(el('li', 'rux--type-body-compact-01',
          `${l.item}${l.memo ? ` — ${l.memo}` : ''} · ${money.format(l.amount)}`));
      }
      stack.append(lines);
    }

    const group = el('fieldset', 'rux--checkbox-group');
    group.append(el('legend', 'rux--label rux--type-heading-compact-01',
      x.type === 'Invoice' ? 'Its trip, or trips when it bills several' : 'Its trip, or trips when it quotes several'));
    for (const c of x.candidates) group.append(tripChoice(x, c));
    stack.append(group);

    const past = pastInvoices(x);
    if (past.length) {
      const box = el('div', 'rux--stack-vertical rux--stack-scale-2');
      box.append(el('p', 'rux--type-label-01 scheduler-quickbooks-quiet', `${x.name}'s other invoices`));
      const list = el('ul', 'scheduler-quickbooks-lines');
      for (const o of past) {
        const on = o.trip && (o.state === 'recorded' || o.saved)
          ? `trip ${o.trip.ref} of ${day(o.trip.start)}, ${ahead(o.date, o.trip.start)}`
          : 'on no trip yet';
        list.append(el('li', 'rux--type-body-compact-01', `${o.num} · ${day(o.date)} · ${money.format(o.amount || 0)} · ${on}`));
      }
      box.append(list);
      stack.append(box);
    }

    const buttons = el('div', 'scheduler-quickbooks-actions');
    const save = el('button', 'rux--btn rux--btn--primary rux--layout--size-md', 'Save');
    save.type = 'button';
    const skip = el('button', 'rux--btn rux--btn--ghost rux--layout--size-md', skipped.has(skipKey(x)) ? 'Bring back' : 'Skip');
    skip.type = 'button';
    save.addEventListener('click', () => saveCard(x, card, save));
    skip.addEventListener('click', () => {
      if (skipped.has(skipKey(x))) skipped.delete(skipKey(x)); else skipped.add(skipKey(x));
      writeSkipped(skipped);
      draw();
    });
    buttons.append(save, skip);
    stack.append(buttons);
    card.append(stack);
    return card;
  }

  function drawList(type, listId, sectionId, headId, word) {
    const all = picks(type);
    const shown = all.filter(x => showSkipped || !skipped.has(skipKey(x)));
    const hidden = all.length - shown.length;
    const list = $(listId);
    list.replaceChildren(...shown.map(pickCard));
    if (hidden) {
      const more = el('button', 'rux--btn rux--btn--tertiary rux--layout--size-md', `Show the ${hidden} skipped`);
      more.type = 'button';
      more.addEventListener('click', () => { showSkipped = true; draw(); });
      list.append(more);
    }
    $(headId).textContent = `${word} to pick (${shown.length})`;
    $(sectionId).hidden = !all.length;
  }

  function drawNone() {
    const none = matched.Invoice.filter(x => x.state === 'none').sort((a, b) => (a.date < b.date ? 1 : -1));
    $('scheduler-quickbooks-none-rows').replaceChildren(...none.map(x => {
      const tr = el('tr');
      const what = x.lines.map(l => l.memo || l.item).filter(Boolean).join('; ');
      for (const text of [x.num, day(x.date), x.name, what, money.format(x.amount || 0)]) tr.append(el('td', null, text));
      return tr;
    }));
    $('scheduler-quickbooks-none').hidden = !none.length;
  }

  function draw() {
    drawSummary();
    drawList('Invoice', 'scheduler-quickbooks-invoice-list', 'scheduler-quickbooks-invoices', 'scheduler-quickbooks-invoices-h', 'Invoices');
    drawList('Estimate', 'scheduler-quickbooks-estimate-list', 'scheduler-quickbooks-estimates', 'scheduler-quickbooks-estimates-h', 'Estimates');
    drawNone();
    drawNames();
  }

  /* ── QuickBooks names ──
     Each customer's name in QuickBooks, from the report's invoices already
     on its trips: the name on most of them, the latest on a tie. Listed
     where it is not the name the customer keeps now. */
  async function readCustomers() {
    const { data, error } = await db.from('customers').select('id,name,qb_name').order('name');
    if (error) throw new Error(error.message);
    return data;
  }
  function namesToSave() {
    const seen = new Map();
    for (const x of matched.Invoice) {
      const id = x.trip?.customerId;
      if (!id || !x.name || !(x.state === 'recorded' || x.saved)) continue;
      const names = seen.get(id) || new Map();
      const n = names.get(x.name) || { count: 0, last: '' };
      names.set(x.name, { count: n.count + 1, last: x.date > n.last ? x.date : n.last });
      seen.set(id, names);
    }
    return customers.flatMap(c => {
      const names = seen.get(c.id);
      if (!names) return [];
      const [best, { count }] = [...names].sort(([, a], [, b]) => b.count - a.count || (a.last < b.last ? 1 : -1))[0];
      return best === c.qb_name ? [] : [{ customer: c, name: best, count }];
    });
  }
  function drawNames() {
    const rows = namesToSave();
    $('scheduler-quickbooks-names-rows').replaceChildren(...rows.map(r => {
      const tr = el('tr');
      tr.append(el('td', null, r.customer.name), el('td', null, r.customer.qb_name || 'None'),
        el('td', null, `${r.name} · ${r.count} invoice${r.count === 1 ? '' : 's'}`));
      return tr;
    }));
    $('scheduler-quickbooks-names').hidden = !rows.length;
  }
  $('scheduler-quickbooks-names-save').addEventListener('click', async e => {
    const button = e.currentTarget;
    const rows = namesToSave();
    button.disabled = true;
    try {
      for (const r of rows) {
        const { error } = await db.from('customers').update({ qb_name: r.name }).eq('id', r.customer.id);
        if (error) throw new Error(`${r.customer.name}: ${error.message}`);
        r.customer.qb_name = r.name;
      }
      pair.result('success', `Saved ${rows.length} QuickBooks name${rows.length === 1 ? '' : 's'}.`);
      drawNames();
      drawExport();
    } catch (err) {
      pair.result('error', `Not every name was saved. ${err.message}`);
    } finally {
      button.disabled = false;
    }
  });

  /* ── Export ──
     One week at a time, never more, so a forgotten earlier trip cannot
     slip into a file. `run` is the week as quickbooks-iif.js writes it, and
     `saved` the file Export week saved, which Mark imported records. */
  const isoDay = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const plusDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  let weekFirst = WEEK.firstDayOf(new Date(), WEEK.savedWeekStart());
  let run = null;
  let saved = null;
  const weekDays = () => ({ from: isoDay(weekFirst), to: isoDay(plusDays(weekFirst, 6)) });
  const fileName = () => `quickbooks-invoices_${weekDays().from}.iif`;

  const SKIP_WORDS = { invoiced: 'Already invoiced', 'not confirmed': 'Not confirmed' };
  function exportRow({ trip, total, why }, inFile) {
    const tr = el('tr');
    const qbName = trip.customers?.qb_name;
    tr.append(
      el('td', null, String(trip.trip_ref ?? '')),
      el('td', null, days(trip.start_date, trip.end_date || trip.start_date)),
      el('td', null, qbName || `${trip.customers?.name || trip.customer || 'No customer'}, no QuickBooks name`),
      el('td', null, money.format(total ?? (Number(trip.quoted_price) || 0))),
      el('td', null, inFile ? 'Yes' : SKIP_WORDS[why] || `Held back: ${why}`));
    return tr;
  }

  function drawRun() {
    const { from, to } = weekDays();
    const marked = saved?.marked;
    $('scheduler-quickbooks-export-rows').replaceChildren(
      ...run.written.map(w => exportRow(w, true)),
      ...run.held.map(h => exportRow(h, false)),
      ...run.skipped.filter(k => k.why !== 'cancelled').map(k => exportRow(k, false)));
    let text = `${days(from, to)}: ${run.written.length} to import`
      + (run.held.length ? `, ${run.held.length} held back until what holds them is fixed.` : '.');
    if (saved && !marked) text = `Saved ${saved.name} with ${saved.written.length} invoices. Import it into QuickBooks, then Mark imported.`;
    if (marked) text = `Marked ${saved.written.length} trips imported. Each is invoiced now, so no export takes it again, and the next report's match numbers it.`;
    $('scheduler-quickbooks-export-text').textContent = text;
    $('scheduler-quickbooks-export-btn').disabled = !run.written.length;
    $('scheduler-quickbooks-mark').disabled = !saved || marked;
    $('scheduler-quickbooks-export').hidden = false;
  }

  async function drawExport() {
    if (!db) return;
    try {
      run = IIF.write(await IIF.read(db, weekDays()), isoDay(new Date()));
      drawRun();
    } catch (err) {
      pair.say('error', "This week's trips didn't load", err.message);
    }
  }

  function moveWeek(n) {
    weekFirst = plusDays(weekFirst, 7 * n);
    saved = null;
    drawExport();
  }
  $('scheduler-quickbooks-week-back').addEventListener('click', () => moveWeek(-1));
  $('scheduler-quickbooks-week-next').addEventListener('click', () => moveWeek(1));
  $('scheduler-quickbooks-export-btn').addEventListener('click', () => {
    IIF.download(run.text, fileName());
    saved = { name: fileName(), written: run.written, on: isoDay(new Date()), marked: false };
    drawRun();
  });
  $('scheduler-quickbooks-mark').addEventListener('click', async e => {
    const button = e.currentTarget;
    button.disabled = true;
    try {
      await IIF.markImported(db, saved.written, saved.on, history);
      saved.marked = true;
      pair.result('success', `Marked ${saved.written.length} trips imported into QuickBooks.`);
      const kept = saved;
      await drawExport();
      saved = kept;
      drawRun();
    } catch (err) {
      button.disabled = false;
      pair.result('error', `Not every trip was marked. ${err.message}`);
    }
  });

  /* ── Saving ── */

  // A trip as this page reads it for Match, or as quickbooks-iif.js reads it for Export.
  const snapshot = t => (t.row
    ? { id: t.id, trip_ref: t.row.trip_ref, start_date: t.start, end_date: t.end, customer: t.customer, destination: t.destination }
    : { id: t.id, trip_ref: t.trip_ref, start_date: t.start_date, end_date: t.end_date, customer: t.customer, destination: t.destination });
  async function history(t, changes) {
    const args = { p_trip_id: t.id, p_action: 'updated', p_snapshot: snapshot(t), p_changes: changes, p_metadata: HISTORY_META };
    if (actor) args.p_actor_name = actor;
    const { error } = await db.rpc('record_trip_history', args);
    if (error) console.warn('The trip history entry was not written:', error.message);
  }

  /* An invoice on each ticked trip, as the Billing tab's Invoices step adds
     one: a row after the trip's own, its amount when it bills one trip
     alone, and on a trip's first invoice the columns other readers use. A
     trip Mark imported left with an unnumbered row is this invoice's, so
     that row takes the number. */
  async function saveInvoice(x, chosen) {
    for (const t of chosen) {
      const first = !t.invoiced;
      const facts = { number: x.num, amount: chosen.length === 1 ? x.amount : null, date: x.date };
      const { error } = t.unnumbered
        ? await db.from('trip_invoices').update(facts).eq('id', t.unnumbered)
        : await db.from('trip_invoices').insert({ trip_id: t.id, position: t.invoiceRows, ...facts });
      if (error) throw new Error(error.message);
      const changes = [];
      if (t.unnumbered) {
        const { error: e2 } = await db.from('trips').update({ invoice_number: x.num }).eq('id', t.id);
        if (e2) throw new Error(e2.message);
        changes.push({ field: 'invoice_number', label: 'Invoice number', before: null, after: x.num });
      } else if (first) {
        const { error: e2 } = await db.from('trips')
          .update({ invoice_status: 'Invoiced', invoiced: true, invoice_number: x.num }).eq('id', t.id);
        if (e2) throw new Error(e2.message);
        changes.push({ field: 'invoice_status', label: 'Invoice status', before: 'Pending', after: 'Invoiced' },
                     { field: 'invoiced', label: 'Invoiced', before: 'No', after: 'Yes' },
                     { field: 'invoice_number', label: 'Invoice number', before: null, after: x.num });
      }
      changes.push({ field: 'invoices', label: `Invoice: ${x.num}`, before: null, after: `Date ${x.date}` });
      await history(t, changes);
      if (!t.unnumbered) t.invoiceRows += 1;
      t.unnumbered = null;
      t.invoiced = true;
      t.known.add(x.num);
    }
  }

  // The estimate tick on each ticked trip, as the bar menu marks it.
  async function saveEstimate(chosen) {
    for (const t of chosen) {
      if (t.ticked) continue;
      const { error } = await db.from('trip_prep').upsert({ trip_id: t.id, qb_estimate: true }, { onConflict: 'trip_id' });
      if (error) throw new Error(error.message);
      await history(t, [{ field: 'qb_estimate', label: 'Estimate in QuickBooks', before: 'No', after: 'Yes' }]);
      t.ticked = true;
    }
  }

  async function saveCard(x, card, button) {
    const ids = [...card.querySelectorAll('input[type="checkbox"]:checked')].map(i => i.value);
    const chosen = trips.filter(t => ids.includes(t.id));
    if (!chosen.length) {
      pair.result('error', 'Tick the trip it belongs to, or Skip it.');
      return;
    }
    button.disabled = true;
    try {
      if (x.type === 'Invoice') await saveInvoice(x, chosen); else await saveEstimate(chosen);
      x.saved = true;
      x.trip = chosen[0];
      const word = x.type === 'Invoice' ? `Invoice ${x.num}` : `${x.name}'s estimate`;
      pair.result('success', `${word} is saved on trip ${chosen.map(t => t.ref).join(', ')}.`);
      draw();
    } catch (err) {
      button.disabled = false;
      pair.result('error', `It was not saved. ${err.message}`);
    }
  }

  pair.start(async client => {
    db = client;
    try { actor = (await window.Rux.account.staffProfile())?.display_name || null; } catch { actor = null; }
    drawExport();
  });
})();
