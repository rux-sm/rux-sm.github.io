/* ==========================================================================
   quickbooks-iif.js — TRIPS TO QUICKBOOKS AS AN IIF FILE
   --------------------------------------------------------------------------
   QuickBooks Desktop for Mac takes invoices in by one door, an IIF file it
   imports, so this writes one: a TRNS line per invoice and an SPL line per
   quote line, from `saved-quote.js`, the lines the customer's printed quote
   names. The QuickBooks page writes a week's trips with it and the Billing
   tab one trip.

   A TRIP IS HELD BACK, NEVER GUESSED, when QuickBooks would make something
   of it the office did not mean: a customer with no QuickBooks name, since
   an IIF name QuickBooks does not hold adds a new customer; a line whose
   kind has no QuickBooks item; or no price. `write` says which and why.

   QuickBooks numbers each invoice, so Num is left empty and an import never
   collides with a number QuickBooks has used. An import only adds, so a
   file is imported once: `markImported` gives each trip an invoice row with
   no number, which keeps every export after it from taking the trip again
   and which the next report's match numbers.
   ========================================================================== */
(() => {
  'use strict';

  /* Each kind of quote line as the office's own invoices post it: the item
     the Billing tab names and the account QuickBooks puts it in. A Discount
     posts to the company's own account, as 85 of the office's 87 discount
     lines in 2025 did. An Other line has no item, so a trip with one is held. */
  const INCOME = 'Gross Trucking Income';
  const ITEMS = {
    rental: { item: 'Bus Rental', account: INCOME },
    second_driver: { item: "Addt'l Driver", account: INCOME },
    relief: { item: "Addt'l Driver", account: INCOME },
    hotel: { item: 'Hotel', account: INCOME },
    discount: { item: 'Deductions', account: 'Escamilla Tour Buses, LLC' },
  };
  // The office's invoices end on a zero sales-tax line, item "no tax".
  const TAX = { item: 'no tax', account: 'Sales Tax Payable' };

  /* What a trip is read with: its quote lines and everything their words
     come from, and its customer's QuickBooks name. */
  const COLUMNS = 'id,trip_ref,customer,customer_id,destination,trip_type,start_date,end_date,'
    + 'return_start_date,return_end_date,bus_count,return_bus_count,pickup_address,trip_reqs,'
    + 'quoted_price,po_ref,confirmed,cancelled_at,invoiced,invoice_number,'
    + 'customers(name,qb_name),trip_invoices(id,number,position),'
    + 'trip_quote_lines(position,kind,leg,item,description,quantity,cost,amount),'
    + 'trip_legs(*,trip_routes(*)),trip_stops(route_id,leg,position,type,address,depart_prev,arrive),'
    + 'trip_assignments(route_id,leg,needs)';

  /* The trips that go to QuickBooks: confirmed, not cancelled and not
     invoiced. `scope` narrows the read, as `{ id }` for one trip or
     `{ from, to }` for the trips whose first day falls in those days. */
  async function read(db, scope) {
    let q = db.from('trips').select(COLUMNS).order('start_date').order('trip_ref');
    if (scope.id) q = q.eq('id', scope.id);
    else q = q.gte('start_date', scope.from).lte('start_date', scope.to);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return data;
  }
  const isInvoiced = t => !!t.invoiced || !!t.invoice_number || (t.trip_invoices || []).length > 0;
  // Why a trip is not exported at all, or null when it is one to export.
  const notDue = t => (t.cancelled_at ? 'cancelled' : !t.confirmed ? 'not confirmed' : isInvoiced(t) ? 'invoiced' : null);

  // A field holds no tab and no line break, and a quote's lines are one line each.
  const field = v => String(v ?? '').replace(/[\t\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  const amount = n => (Math.round(n * 100) / 100).toFixed(2);
  // 11/17/2026, the date as QuickBooks reads it in an IIF.
  const iifDay = iso => `${iso.slice(5, 7)}/${iso.slice(8, 10)}/${iso.slice(0, 4)}`;

  /* One trip as an invoice, or why it is held back. A line's quantity and
     amount are negative on an invoice's SPL, as QuickBooks writes its own. */
  function invoice(t, on) {
    const qbName = field(t.customers?.qb_name);
    if (!qbName) return { held: `${t.customers?.name || t.customer || 'Its customer'} has no QuickBooks name` };
    const lines = window.SchedulerSavedQuote.lines(t);
    const other = lines.find(l => !ITEMS[l.kind]);
    if (other) return { held: `its line "${other.item || 'Other'}" has no QuickBooks item` };
    if (lines.some(l => l.total == null)) return { held: 'it has no price' };
    const total = lines.reduce((s, l) => s + l.total, 0);
    if (!total) return { held: 'it has no price' };
    const date = iifDay(on);
    const rows = [['TRNS', '', 'INVOICE', date, 'Accounts Receivable', qbName, amount(total), '',
      `Trip ${t.trip_ref}`, 'N', 'N', field(t.po_ref)]];
    for (const l of lines) {
      const { item, account } = ITEMS[l.kind];
      const qty = l.qty ?? 1;
      const price = l.cost ?? l.total / qty;
      rows.push(['SPL', '', 'INVOICE', date, account, '', amount(-l.total), '', field(l.desc), 'N',
        String(-qty), amount(price), item, 'N', '']);
    }
    rows.push(['SPL', '', 'INVOICE', date, TAX.account, '', '0.00', '', '', 'N', '', '0.00', TAX.item, 'N', 'AUTOSTAX']);
    rows.push(['ENDTRNS']);
    return { rows, total };
  }

  const HEAD = [
    ['!TRNS', 'TRNSID', 'TRNSTYPE', 'DATE', 'ACCNT', 'NAME', 'AMOUNT', 'DOCNUM', 'MEMO', 'CLEAR', 'TOPRINT', 'PONUM'],
    ['!SPL', 'SPLID', 'TRNSTYPE', 'DATE', 'ACCNT', 'NAME', 'AMOUNT', 'DOCNUM', 'MEMO', 'CLEAR', 'QNTY', 'PRICE', 'INVITEM', 'TAXABLE', 'EXTRA'],
    ['!ENDTRNS'],
  ];

  /* The file for the trips handed in, dated `on`: `{ text, written, held,
     skipped }`, written each `{ trip, total }`, held each `{ trip, why }`,
     and skipped the trips that are not due, each `{ trip, why }`. */
  function write(trips, on) {
    const written = [], held = [], skipped = [], rows = [...HEAD];
    for (const t of trips) {
      const why = notDue(t);
      if (why) { skipped.push({ trip: t, why }); continue; }
      const inv = invoice(t, on);
      if (inv.held) { held.push({ trip: t, why: inv.held }); continue; }
      rows.push(...inv.rows);
      written.push({ trip: t, total: inv.total });
    }
    return { text: `${rows.map(r => r.join('\t')).join('\r\n')}\r\n`, written, held, skipped };
  }

  /* The file's bytes in Windows-1252, the code page QuickBooks Desktop reads
     an IIF in, so an ñ arrives as one; a letter it lacks becomes "?". */
  const CP1252 = { '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87, 'ˆ': 0x88, '‰': 0x89,
    'Š': 0x8a, '‹': 0x8b, 'Œ': 0x8c, 'Ž': 0x8e, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96,
    '—': 0x97, '˜': 0x98, '™': 0x99, 'š': 0x9a, '›': 0x9b, 'œ': 0x9c, 'ž': 0x9e, 'Ÿ': 0x9f };
  function bytes(text) {
    const out = new Uint8Array(text.length);
    let n = 0;
    for (const ch of text) {
      const c = ch.codePointAt(0);
      out[n++] = CP1252[ch] ?? (c < 0x80 || (c >= 0xa0 && c <= 0xff) ? c : 0x3f);
    }
    return out.subarray(0, n);
  }

  // The file handed to the browser to save.
  function download(text, name) {
    const url = URL.createObjectURL(new Blob([bytes(text)], { type: 'application/octet-stream' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  /* A file imported: each trip it wrote gets an invoice row with no number,
     the exported amount and the day, after the rows it has, with the
     trip's invoice columns, as the Billing tab saves a first invoice, and a
     history entry. `history(trip, changes)` writes that entry. */
  async function markImported(db, written, on, history) {
    for (const { trip, total } of written) {
      const position = (trip.trip_invoices || []).length;
      const { error } = await db.from('trip_invoices').insert({ trip_id: trip.id, position, number: null, amount: total, date: on });
      if (error) throw new Error(`Trip ${trip.trip_ref}: ${error.message}`);
      const { error: e2 } = await db.from('trips').update({ invoice_status: 'Invoiced', invoiced: true }).eq('id', trip.id);
      if (e2) throw new Error(`Trip ${trip.trip_ref}: ${e2.message}`);
      await history(trip, [
        { field: 'invoice_status', label: 'Invoice status', before: 'Pending', after: 'Invoiced' },
        { field: 'invoiced', label: 'Invoiced', before: 'No', after: 'Yes' },
        { field: 'invoices', label: 'Invoice: imported into QuickBooks', before: null, after: `Date ${on}` },
      ]);
      trip.invoiced = true;
      trip.trip_invoices = [...(trip.trip_invoices || []), { number: null, position }];
    }
  }

  window.SchedulerQuickBooksIif = { read, write, download, markImported, notDue };
})();
