/* ==========================================================================
   Rux Scheduler — TRIP HISTORY, what a save changed, as lines
   --------------------------------------------------------------------------
   The one reading of how two reads of a trip differ, taken before a save's
   writes and after them: the trip's own columns and every row under it,
   its stops, its vehicles, their seats, its quote lines, payments, purchase
   orders and invoices. Each difference is a line of `{ field, label,
   before, after }` holding display strings, the shape rux-ui records, so the
   History page and rux-ui's History tab show both apps' entries alike.

   ANY DIFFERENCE MAKES A LINE. A column has the label below when it has one,
   rux-ui's words first, and else its own name in words, so a column added
   to the table is recorded the day it is saved, not when someone lists it.
   Three kinds of column make no line of their own, because another says it:

     bookkeeping  the row's id, its parent's id, created_at and updated_at,
                  which the database sets
     a link       a column `x_id` beside `x` or `x_name`, as a contact's id
                  sits beside the name it links
     a stamp      a column `x_at` or `x_by` beside `x`, or `x_at` beside
                  `x_by`, as an envelope's time sits beside its mark

   A ROW IS FOLLOWED BY ITS ID. A changed row is one line naming it, with
   the columns that changed, before and after; a row added or taken away is
   one line with what it holds. A list whose kept rows changed order says
   its order once, rather than every row's position. A column that follows
   another, as a place's map point follows its address, is said only when
   the one it follows did not change.

   Nothing here reads the page or the database: the names of buses, drivers
   and needs are handed in, and it needs nothing loaded first.
   ========================================================================== */
(() => {
  'use strict';

  /* The trip's columns with a label, in the order a change lists them:
     rux-ui's `TRIP_FIELDS` first, then the columns this app edits that its
     table leaves out. The kind says how a value is written. */
  const FIELDS = [
    ['trip_ref', 'Trip ID'],
    ['customer', 'Client'],
    ['destination', 'Destination'],
    ['start_date', 'Start date'],
    ['end_date', 'End date'],
    ['return_start_date', 'Inbound start date'],
    ['return_end_date', 'Inbound end date'],
    ['trip_type', 'Trip type', 'tripType'],
    ['passengers', 'Passengers', 'number'],
    ['is_self_organized', 'Billing type', 'billingType'],
    ['trip_bar_color', 'Trip color'],
    ['booking_contact_name', 'Booking contact'],
    ['booking_contact_phone', 'Booking phone'],
    ['booking_contact_email', 'Booking email'],
    ['trip_contact_1_name', 'Trip contact'],
    ['trip_contact_1_phone', 'Trip phone'],
    ['trip_contact_2_name', 'Alternate trip contact'],
    ['trip_contact_2_phone', 'Alternate trip phone'],
    ['trip_contact_3_name', 'Trip contact 3'],
    ['trip_contact_3_phone', 'Trip contact 3 phone'],
    ['trip_contact_4_name', 'Trip contact 4'],
    ['trip_contact_4_phone', 'Trip contact 4 phone'],
    ['trip_contact_5_name', 'Trip contact 5'],
    ['trip_contact_5_phone', 'Trip contact 5 phone'],
    ['trip_contact_1_leg', 'Trip contact day', 'leg'],
    ['trip_contact_2_leg', 'Alternate trip contact day', 'leg'],
    ['trip_contact_3_leg', 'Trip contact 3 day', 'leg'],
    ['trip_contact_4_leg', 'Trip contact 4 day', 'leg'],
    ['trip_contact_5_leg', 'Trip contact 5 day', 'leg'],
    ['notes', 'Notes'],
    ['contract_status', 'Contract status'],
    ['contract_signed_on', 'Contract signed on'],
    ['contract_note', 'Contract note'],
    ['quoted_price', 'Quoted price', 'money'],
    ['quote_sent_price', 'Quote sent at', 'money'],
    ['quote_sent_on', 'Quote sent on'],
    ['deposit_amount', 'Payments received', 'money'],
    ['est_miles', 'Estimated miles', 'number'],
    ['actual_miles', 'Actual miles', 'number'],
    ['driving_hours', 'Drive hours', 'number'],
    ['on_duty_hours', 'On-duty hours', 'number'],
    ['invoice_status', 'Invoice status'],
    ['date_paid', 'Date paid'],
    ['bus_count', 'Bus count', 'number'],
    ['return_bus_count', 'Inbound bus count', 'number'],
    ['confirmed', 'Confirmed', 'boolean'],
    ['contact_not_needed', 'Contact required', 'inverseBoolean'],
    ['itinerary_not_needed', 'Itinerary required', 'inverseBoolean'],
    ['po_received', 'PO received', 'boolean'],
    ['invoiced', 'Invoiced', 'boolean'],
    ['balance_paid', 'Balance paid', 'boolean'],
    ['vehicle_type', 'Vehicle'],
    ['req_sleeper', 'Sleeper', 'boolean'],
    ['req_ada', 'Wheelchair lift', 'boolean'],
    ['req_56pax', '56 passenger', 'boolean'],
    ['need_hotel', 'Hotel needed', 'boolean'],
    ['trip_reqs', 'Requirements'],
    ['hotel_booked_outbound', 'Outbound hotel booked', 'boolean'],
    ['hotel_booked_return', 'Inbound hotel booked', 'boolean'],
    ['hotel_itinerary_number_outbound', 'Outbound hotel confirmation'],
    ['hotel_itinerary_number_return', 'Inbound hotel confirmation'],
    ['route_done_by', 'Route done by'],
    ['buses_done_by', 'Buses done by'],
    ['billing_done_by', 'Billing done by'],
    ['po_ref', 'PO number'],
    ['po_amount', 'PO amount', 'money'],
    ['invoice_number', 'Invoice number'],
    ['booking_contact_missive_url', 'Email thread'],
    ['departure_time', 'Departs'],
    ['spot_time', 'Spot time'],
    ['return_time', 'Returns'],
  ];
  const fieldOf = new Map(FIELDS.map(([field, label, kind]) => [field, { label, kind }]));

  /* The words for a row's columns, where its name in words is not enough;
     an empty one is a column whose value says itself, as Bus 12 does. */
  const ROW_LABELS = {
    depart_prev: 'Leaves before', depart_prev_date: 'Leaves before on', arrive: 'Arrives', arrive_date: 'Arrives on',
    spot: 'Spot', spot_date: 'Spot on', dwell_status: 'Wait', drive: 'Drive', miles: 'Miles',
    bus_id: '', driver_id: 'Driver', active_roles: 'Seats', needs: 'Needs', vehicle_type: 'Vehicle',
    report_time: 'Report time', pay: 'Pay', kind: 'Kind', item: 'Item', quantity: 'Quantity', cost: 'Cost',
    amount: 'Amount', ref: 'Number', number: 'Number', date: 'Date', method: 'Method', leg: 'Day',
    lat: 'Map point', lng: 'Map point', mapbox_id: 'Map place',
  };
  // How a row's column is written, where its value alone does not say.
  const ROW_KINDS = {
    amount: 'money', cost: 'money', pay: 'money', rate: 'money', leg: 'leg', bus_id: 'bus', driver_id: 'driver',
    role: 'role', active_roles: 'roles', needs: 'needs',
  };
  // A column said only when the one it follows did not change.
  const FOLLOWS = { lat: 'address', lng: 'address', mapbox_id: 'address', miles_source: 'miles', drive_source: 'drive' };

  const TRIP_TYPES = { round_trip: 'Round trip', one_way: 'One-way', dropoff_pickup: 'Split trip' };
  const ROLES = {
    driver: 'Driver', coDriver: 'Co-driver', 'co-driver': 'Co-driver', relief1: 'Relief driver',
    relief2: 'Relief driver', 'relief-start': 'Relief driver', 'relief-end': 'Relief driver',
  };
  const LEGS = { outbound: 'Drop-off', return: 'Pickup' };

  // Empty is null, and a comparison sorts object keys, as rux-ui compares.
  const blank = v => (v === undefined || v === '' ? null : v);
  const stable = v => (Array.isArray(v) ? v.map(stable)
    : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, stable(v[k])]))
      : blank(v));
  const same = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));
  const usd = n => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  // A column's name in words: `hotel_booked_outbound` is Hotel booked (drop-off).
  function words(field) {
    const leg = field.match(/_(outbound|return)$/)?.[1];
    const base = (leg ? field.slice(0, -leg.length - 1) : field).replace(/_/g, ' ');
    const said = base.charAt(0).toUpperCase() + base.slice(1);
    return leg ? `${said} (${LEGS[leg].toLowerCase()})` : said;
  }

  /* Whether a column makes no line of its own in this row, by the three
     kinds above. */
  function quiet(field, row) {
    if (['id', 'trip_id', 'assignment_id', 'created_at', 'updated_at'].includes(field) || field.endsWith('_updated_at')) return true;
    const link = field.match(/^(.+)_id$/);
    if (link && (link[1] in row || `${link[1]}_name` in row)) return true;
    const stamp = field.match(/^(.+)_(at|by)$/);
    if (stamp && (stamp[1] in row || (stamp[2] === 'at' && `${stamp[1]}_by` in row))) return true;
    return false;
  }

  /* A value as a line says it. `names` turns a bus's, a driver's and a
     need's id into its name. */
  function say(value, kind, names = {}) {
    const v = blank(value);
    if (v === null) return null;
    const need = id => names.requirement?.(id) ?? id;
    switch (kind) {
      case 'tripType': return TRIP_TYPES[v] || String(v);
      case 'boolean': return v ? 'Yes' : 'No';
      case 'inverseBoolean': return v ? 'No' : 'Yes';
      case 'billingType': return v ? 'Ticketed' : 'Charter';
      case 'leg': return LEGS[v] || String(v);
      case 'bus': return names.bus?.(v) ?? `Unit ${v}`;
      case 'driver': return names.driver?.(v) ?? String(v);
      case 'role': return ROLES[v] || String(v);
      case 'roles': return (Array.isArray(v) ? v : [v]).map(r => ROLES[r] || r).join(', ') || null;
      default: break;
    }
    if (kind === 'money' || kind === 'number') {
      const n = Number(v);
      if (!Number.isFinite(n)) return String(v);
      return kind === 'money' ? usd(n) : n.toLocaleString('en-US');
    }
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    if (typeof v === 'number') return v.toLocaleString('en-US');
    // A set of needs, `{ id: true }`, is the names of those on.
    if (kind === 'needs' || (v && typeof v === 'object' && !Array.isArray(v) && Object.values(v).every(x => typeof x === 'boolean'))) {
      return Object.keys(v).filter(k => v[k]).map(need).sort().join(', ') || null;
    }
    if (Array.isArray(v)) return v.map(x => (typeof x === 'object' ? JSON.stringify(stable(x)) : String(x))).join(', ') || null;
    if (typeof v === 'object') return JSON.stringify(stable(v));
    return String(v);
  }

  /* THE TRIP'S OWN COLUMNS: every one in either read that is not a list of
     rows, the labelled ones in their order and the rest by name. */
  function columnLines(before, after, names) {
    const out = [];
    const isRows = v => Array.isArray(v) && v.some(x => x && typeof x === 'object');
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    const known = FIELDS.map(([f]) => f).filter(f => keys.has(f));
    const rest = [...keys].filter(f => !fieldOf.has(f)).sort();
    for (const field of [...known, ...rest]) {
      if (isRows(before[field]) || isRows(after[field])) continue;
      if (quiet(field, { ...before, ...after }) || same(before[field], after[field])) continue;
      const { label = words(field), kind } = fieldOf.get(field) ?? {};
      const was = say(before[field], kind, names);
      const now = say(after[field], kind, names);
      if (was !== now) out.push({ field, label, before: was, after: now });
    }
    return out;
  }

  /* THE ROWS UNDER A TRIP, each list with what its rows are called and what
     says one that is added or taken away. `split` says whether a row names
     its day. */
  const dayOf = (row, split) => (split && row.leg ? ` (${(LEGS[row.leg] || row.leg).toLowerCase()})` : '');
  const LISTS = [
    { field: 'itinerary', label: 'Stop', rows: t => t.trip_stops,
      name: (s, ctx) => `${s.name || s.address || s.label || s.type || 'Stop'}${dayOf(s, ctx.split)}`,
      holds: ['type', 'address', 'arrive', 'spot', 'depart_prev'] },
    { field: 'assignments', label: 'Vehicle', rows: t => t.trip_assignments,
      name: (a, ctx) => `${a.bus_id ? say(a.bus_id, 'bus', ctx.names) : 'no bus'}${dayOf(a, ctx.split)}`,
      holds: ['vehicle_type', 'needs', 'active_roles'] },
    { field: 'seats', label: 'Seat', rows: t => (t.trip_assignments || []).flatMap(a => (a.trip_drivers || []).map(d => ({ ...d, $vehicle: a }))),
      name: (d, ctx) => `${say(d.role || 'driver', 'role')} on ${d.$vehicle.bus_id ? say(d.$vehicle.bus_id, 'bus', ctx.names) : 'no bus'}${dayOf(d.$vehicle, ctx.split)}`,
      holds: ['driver_id', 'pay', 'report_time'] },
    { field: 'quote_lines', label: 'Quote line', rows: t => t.trip_quote_lines,
      name: (q, ctx) => `${q.item || q.kind || 'Line'}${dayOf(q, ctx.split)}`, holds: ['quantity', 'cost', 'amount'] },
    { field: 'payments', label: 'Payment', rows: t => t.trip_payments, name: p => p.ref || p.method || 'payment', holds: ['amount', 'date', 'method'] },
    { field: 'purchase_orders', label: 'PO', rows: t => t.trip_pos, name: p => p.ref || 'with no number', holds: ['amount', 'date'] },
    { field: 'invoices', label: 'Invoice', rows: t => t.trip_invoices, name: i => i.number || 'with no number', holds: ['amount', 'date'] },
  ];

  const byPosition = rows => [...(rows || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const rowLabel = f => ROW_LABELS[f] ?? words(f);
  // The columns a row is compared on: its own, without the helpers this file adds.
  const columnsOf = (a, b) => [...new Set([...Object.keys(a || {}), ...Object.keys(b || {})])]
    .filter(f => !f.startsWith('$') && f !== 'position' && !(Array.isArray((a || b)[f]) && (a || b)[f].some(x => x && typeof x === 'object')));
  /* "Arrives 10:00, Wait off", the given columns of one row: those with a
     value, or with `empty` every one, an empty one as a dash, so a change
     lines up before and after. */
  const describe = (row, fields, names, empty = false) => fields
    .map(f => [rowLabel(f), say(row[f], ROW_KINDS[f], names) ?? (empty ? '–' : null)]).filter(([, v]) => v !== null)
    .map(([l, v]) => (l ? `${l} ${v}` : v)).join(', ') || null;

  function rowLines(list, before, after, ctx) {
    const out = [];
    const was = byPosition(list.rows(before));
    const now = byPosition(list.rows(after));
    const wasById = new Map(was.map(r => [r.id, r]));
    const nowById = new Map(now.map(r => [r.id, r]));
    const add = (row, b, a) => out.push({ field: list.field, label: `${list.label}: ${list.name(row, ctx)}`, before: b, after: a });
    for (const r of was) if (!nowById.has(r.id)) add(r, describe(r, list.holds, ctx.names) ?? 'Held', null);
    for (const r of now) {
      const old = wasById.get(r.id);
      if (!old) { add(r, null, describe(r, list.holds, ctx.names) ?? 'Added'); continue; }
      const changed = columnsOf(old, r).filter(f => !quiet(f, { ...old, ...r }) && !same(old[f], r[f]));
      const said = changed.filter(f => !(FOLLOWS[f] && changed.includes(FOLLOWS[f])));
      // Two columns of one label, as a map point's two halves, are said once.
      const fields = said.filter((f, i) => said.findIndex(g => rowLabel(g) === rowLabel(f)) === i);
      if (fields.length) add(old, describe(old, fields, ctx.names, true), describe(r, fields, ctx.names, true));
    }
    // The order of the rows both reads hold, said once when it moved.
    const kept = rows => rows.filter(r => wasById.has(r.id) && nowById.has(r.id)).map(r => r.id);
    if (!same(kept(was), kept(now))) {
      const order = ids => ids.map(id => list.name(nowById.get(id), ctx)).join(', ');
      out.push({ field: list.field, label: `${list.label} order`, before: order(kept(was)), after: order(kept(now)) });
    }
    return out;
  }

  /* The lines between two reads of a trip, each the trip's columns and its
     lists of rows; null before is a new trip. */
  function changes(before, after, names = {}) {
    if (!before) return [{ field: 'trip', label: 'Trip', before: null, after: 'Created' }];
    const ctx = { names, split: [before.trip_type, after.trip_type].includes('dropoff_pickup') };
    return [...columnLines(before, after, names), ...LISTS.flatMap(list => rowLines(list, before, after, ctx))];
  }

  /* One column changed from the board, labelled and written as a save's, or
     null when it did not change. */
  function line(field, was, now, names = {}) {
    if (same(was, now)) return null;
    const { label = words(field), kind } = fieldOf.get(field) ?? {};
    return { field, label, before: say(was, kind, names), after: say(now, kind, names) };
  }

  window.SchedulerTripHistory = { FIELDS, ROLES, changes, line, same, say, words, quiet };
})();
