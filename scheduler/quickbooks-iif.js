/* ==========================================================================
   quickbooks-iif.js — TRIPS TO QUICKBOOKS AS AN IIF FILE
   --------------------------------------------------------------------------
   QuickBooks Desktop for Mac takes invoices in by one door, an IIF file it
   imports, so this writes one: a TRNS line per invoice and an SPL line per
   quote line, from `saved-quote.js`, the lines the customer's printed quote
   names. The QuickBooks page writes a week's trips with it, or one trip.

   A TRIP IS HELD BACK, NEVER GUESSED, when QuickBooks would make something
   of it the office did not mean: a customer with no QuickBooks name, since
   an IIF name QuickBooks does not hold adds a new customer; a line whose
   kind has no QuickBooks item; or no price. `write` says which and why.

   A TRIP QUICKBOOKS ALREADY INVOICED IS HELD BACK TOO. The QuickBooks
   page hands in the trips its report matched to an invoice not saved on
   them yet, and each is held until that match is saved.

   THE FILE CARRIES WHAT QUICKBOOKS WILL NOT FILL IN ITSELF. An import
   leaves Num, Bill To and every field the file does not name empty, so
   each invoice is numbered from the first number handed in, its Bill To
   is the QuickBooks name over the address the printed quote names, its
   Ship To the trip's booking contact, its FOB the trip's buses, its template
   the office's, and its
   description the quote's own, run on to more
   SPL lines only past the 99 characters the import keeps of it. An import
   only adds, so a
   file is imported once: `markImported` saves each trip's invoice with its
   number, which keeps every export after it from taking the trip again.
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
  /* The office's invoice template, named on each invoice because QuickBooks
     for Mac has no default template and an import otherwise takes its
     plain Standard Service Invoice. */
  const TEMPLATE = 'Standard Service Invoice 1';

  /* What a trip is read with: its quote lines and everything their words
     come from, its customer's QuickBooks name and bill-to, its booking
     contact and its buses. */
  const COLUMNS = 'id,trip_ref,customer,customer_id,destination,trip_type,start_date,end_date,'
    + 'return_start_date,return_end_date,bus_count,return_bus_count,pickup_address,trip_reqs,'
    + 'quoted_price,po_ref,booking_contact_name,booking_contact_phone,booking_contact_email,confirmed,cancelled_at,invoiced,invoice_number,'
    + 'customers(name,qb_name,bill_to,usual:usual_location_id(address)),trip_invoices(id,number,position),'
    + 'trip_quote_lines(position,kind,leg,item,description,quantity,cost,amount),'
    + 'trip_legs(*,trip_routes(*)),trip_stops(route_id,leg,position,type,address,depart_prev,arrive),'
    + 'trip_assignments(route_id,leg,needs,position,buses:bus_id(number))';

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

  // The longest description QuickBooks keeps of an imported line.
  const MEMO_MAX = 99;
  /* A description as the invoice lines it runs to. Each keeps the quote's
     own line breaks, and holds as many of its lines as fit in what the
     import keeps; a line too long alone is cut by words. So a quote line is
     one invoice line unless its words will not fit, and the rest goes on a
     line with no item. */
  function memoLines(desc) {
    const parts = String(desc ?? '').split(/\r?\n/).map(field).filter(Boolean).flatMap(line => {
      const cut = [];
      while (line.length > MEMO_MAX) {
        const at = line.lastIndexOf(' ', MEMO_MAX) > 0 ? line.lastIndexOf(' ', MEMO_MAX) : MEMO_MAX;
        cut.push(line.slice(0, at).trim());
        line = line.slice(at).trim();
      }
      return line ? [...cut, line] : cut;
    });
    const out = [];
    for (const part of parts) {
      const last = out.length - 1;
      if (last >= 0 && out[last].length + 1 + part.length <= MEMO_MAX) out[last] += `\n${part}`;
      else out.push(part);
    }
    return out.length ? out : [''];
  }

  /* A cell as the file writes it. QuickBooks reads a line break inside a
     quoted cell as one, and a quote mark inside would end the cell, so a
     description of several lines is quoted with its quote marks made
     apostrophes. */
  const cell = v => (String(v).includes('\n') ? `"${String(v).replace(/"/g, "'")}"` : v);

  /* Bill To: the QuickBooks name over the customer's address as the printed
     quote has it, five lines at most. */
  function billTo(qbName, customer) {
    const lines = window.SchedulerSavedQuote.billTo(customer).map(field).filter(Boolean);
    if (lines[0]?.toLowerCase() === qbName.toLowerCase()) lines.shift();
    return [qbName, ...lines, '', '', '', ''].slice(0, 5);
  }

  /* The trip's booking contact, its name, phone and email a line each, in
     QuickBooks' Ship To, which the office's template titles Contact: the
     template's own Contact, Phone and Email are the customer's and take no
     import, and a Ship To is the invoice's. */
  const contact = t => [t.booking_contact_name, t.booking_contact_phone, t.booking_contact_email]
    .map(field).filter(Boolean).concat('', '', '', '', '').slice(0, 5);

  /* The trip's buses by number, in QuickBooks' FOB field, which the office's
     template titles Bus #: 13 characters, so a long list drops its spaces. */
  const FOB_MAX = 13;
  function busNumbers(t) {
    const numbers = [...new Set((t.trip_assignments || [])
      .slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map(a => field(a.buses?.number)).filter(Boolean))];
    const spaced = numbers.join(', ');
    return spaced.length <= FOB_MAX ? spaced : numbers.join(',');
  }

  /* One trip as invoice `number`, or why it is held back. A line's quantity
     and amount are negative on an invoice's SPL, as QuickBooks writes its
     own; a description's later lines are SPL lines of their own with no
     item and no amount. */
  function invoice(t, on, number) {
    const qbName = field(t.customers?.qb_name);
    if (!qbName) return { held: `${t.customers?.name || t.customer || 'Its customer'} has no QuickBooks name` };
    const lines = window.SchedulerSavedQuote.lines(t);
    const other = lines.find(l => !ITEMS[l.kind]);
    if (other) return { held: `its line "${other.item || 'Other'}" has no QuickBooks item` };
    if (lines.some(l => l.total == null)) return { held: 'it has no price' };
    const total = lines.reduce((s, l) => s + l.total, 0);
    if (!total) return { held: 'it has no price' };
    const date = iifDay(on);
    const rows = [['TRNS', '', 'INVOICE', date, 'Accounts Receivable', qbName, amount(total), String(number ?? ''),
      `Trip ${t.trip_ref}`, 'N', 'N', field(t.po_ref), ...billTo(qbName, t.customers), TEMPLATE, busNumbers(t), ...contact(t)]];
    for (const l of lines) {
      const { item, account } = ITEMS[l.kind];
      const qty = l.qty ?? 1;
      const price = l.cost ?? l.total / qty;
      const [first, ...more] = memoLines(l.desc);
      rows.push(['SPL', '', 'INVOICE', date, account, '', amount(-l.total), '', first, 'N',
        String(-qty), amount(price), item, 'N', '']);
      for (const m of more) rows.push(['SPL', '', 'INVOICE', date, account, '', '0.00', '', m, 'N', '', '', '', 'N', '']);
    }
    rows.push(['SPL', '', 'INVOICE', date, TAX.account, '', '0.00', '', '', 'N', '', '0.00', TAX.item, 'N', 'AUTOSTAX']);
    rows.push(['ENDTRNS']);
    return { rows, total };
  }

  const HEAD = [
    ['!TRNS', 'TRNSID', 'TRNSTYPE', 'DATE', 'ACCNT', 'NAME', 'AMOUNT', 'DOCNUM', 'MEMO', 'CLEAR', 'TOPRINT', 'PONUM',
      'ADDR1', 'ADDR2', 'ADDR3', 'ADDR4', 'ADDR5', 'TEMPLATE', 'FOB',
      'SADDR1', 'SADDR2', 'SADDR3', 'SADDR4', 'SADDR5'],
    ['!SPL', 'SPLID', 'TRNSTYPE', 'DATE', 'ACCNT', 'NAME', 'AMOUNT', 'DOCNUM', 'MEMO', 'CLEAR', 'QNTY', 'PRICE', 'INVITEM', 'TAXABLE', 'EXTRA'],
    ['!ENDTRNS'],
  ];

  /* The file for the trips handed in: `{ text, written, held, skipped }`,
     written each `{ trip, total, number }`, held each `{ trip, why }`, and
     skipped the trips that are not due, each `{ trip, why }`. `on` is the
     invoices' date, `first` the number the first takes, each after it the
     next, and `billed` a Map from a trip's id to the QuickBooks invoice
     matched to it and not saved. With no `first` the file is not written
     and `text` is null, but what it would hold is still said. */
  function write(trips, { on, first = null, billed = new Map() }) {
    const numbered = Number.isInteger(first) && first > 0;
    const written = [], held = [], skipped = [], rows = [...HEAD];
    for (const t of trips) {
      const why = notDue(t);
      if (why) { skipped.push({ trip: t, why }); continue; }
      if (billed.has(t.id)) { held.push({ trip: t, why: `QuickBooks has invoice ${billed.get(t.id)} for it: save that match below` }); continue; }
      const number = numbered ? first + written.length : null;
      const inv = invoice(t, on, number);
      if (inv.held) { held.push({ trip: t, why: inv.held }); continue; }
      rows.push(...inv.rows);
      written.push({ trip: t, total: inv.total, number });
    }
    return { text: numbered ? `${rows.map(r => r.map(cell).join('\t')).join('\r\n')}\r\n` : null, written, held, skipped };
  }

  /* The file's bytes in Mac Roman, the code page QuickBooks Desktop for Mac
     reads an IIF in, so an ñ arrives as one; a letter it lacks becomes "?".
     MAC_ROMAN is the letters of bytes 0x80 to 0xFF in order. */
  const MAC_ROMAN = 'ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ÆØ∞±≤≥¥µ∂∑∏π∫ªºΩæø'
    + '¿¡¬√ƒ≈∆«»…\u00A0ÀÃÕŒœ–—“”‘’÷◊ÿŸ⁄€‹›ﬁﬂ‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔ\uF8FFÒÚÛÙıˆ˜¯˘˙˚¸˝˛ˇ';
  const HIGH = new Map([...MAC_ROMAN].map((ch, i) => [ch, 0x80 + i]));
  function bytes(text) {
    const out = new Uint8Array(text.length);
    let n = 0;
    for (const ch of text) {
      const c = ch.codePointAt(0);
      out[n++] = c < 0x80 ? c : HIGH.get(ch) ?? 0x3f;
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

  /* A file imported: each trip it wrote gets its invoice, the number, the
     exported amount and the day, with the trip's invoice columns, as the
     Billing tab saves a first invoice, and a history entry. A trip in a file
     has no invoice, so this is always its first. `history(trip, changes)`
     writes the entry. */
  async function markImported(db, written, on, history) {
    for (const { trip, total, number } of written) {
      const num = String(number);
      const { error } = await db.from('trip_invoices').insert({ trip_id: trip.id, position: 0, number: num, amount: total, date: on });
      if (error) throw new Error(`Trip ${trip.trip_ref}: ${error.message}`);
      const { error: e2 } = await db.from('trips')
        .update({ invoice_status: 'Invoiced', invoiced: true, invoice_number: num }).eq('id', trip.id);
      if (e2) throw new Error(`Trip ${trip.trip_ref}: ${e2.message}`);
      await history(trip, [
        { field: 'invoice_status', label: 'Invoice status', before: 'Pending', after: 'Invoiced' },
        { field: 'invoiced', label: 'Invoiced', before: 'No', after: 'Yes' },
        { field: 'invoice_number', label: 'Invoice number', before: null, after: num },
        { field: 'invoices', label: `Invoice: ${num}, imported into QuickBooks`, before: null, after: `Date ${on}` },
      ]);
      trip.invoiced = true;
      trip.invoice_number = num;
      trip.trip_invoices = [{ number: num, position: 0 }];
    }
  }

  window.SchedulerQuickBooksIif = { read, write, download, markImported, notDue };
})();
