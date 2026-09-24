/* ==========================================================================
   trips.js — THE TRIPS PAGE
   --------------------------------------------------------------------------
   trips.html lists every trip, cancelled ones included. The trips are read
   once and searched, sorted, filtered and paged here, in the browser. A row
   opens its trip on the schedule, where a trip is edited; a cancelled one
   opens the schedule's cancelled-trip dialog, with its reason and Bring back.
   ========================================================================== */
(() => {
  'use strict';

  const { $, el } = window.SchedulerPair;
  const pair = window.SchedulerPair.page({ list: 'trips', one: 'trip' });

  const PAGE_SIZE = 50;
  const COLUMNS = [
    'id', 'trip_ref', 'customer', 'destination', 'trip_type', 'booking_contact_name',
    'start_date', 'end_date', 'return_start_date', 'return_end_date',
    'bus_count', 'return_bus_count', 'quoted_price', 'po_ref', 'invoice_number',
    'confirmed', 'invoiced', 'balance_paid', 'cancelled_at', 'cancellation_reason',
    'trip_assignments(leg,buses:bus_id(number))',
  ].join(',');

  // ── dates, all local ────────────────────────────────────────────────────
  const parseISO = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = iso(new Date());
  const full = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const usd = n => Number(n).toLocaleString(undefined, { style: 'currency', currency: 'USD' });

  // The trip's last day, the return leg's where it has one.
  const lastDay = t => t.return_end_date || t.return_start_date || t.end_date || t.start_date;
  // "Sep 24 – 26, 2026", the month and year said once where they are shared.
  const dates = t => {
    if (!t.start_date) return 'No date';
    const to = lastDay(t);
    if (!to || to === t.start_date) return full.format(parseISO(t.start_date));
    return full.formatRange(parseISO(t.start_date), parseISO(to));
  };

  /* One status per trip, the furthest it has gone: cancelled, then paid,
     invoiced, confirmed, and otherwise a quote. */
  const STATUS = [
    { key: 'cancelled', label: 'Cancelled', tag: 'rux--tag--red', is: t => !!t.cancelled_at },
    { key: 'paid', label: 'Paid', tag: 'rux--tag--green', is: t => !!t.balance_paid },
    { key: 'invoiced', label: 'Invoiced', tag: 'rux--tag--teal', is: t => !!t.invoiced },
    { key: 'confirmed', label: 'Confirmed', tag: 'rux--tag--blue', is: t => !!t.confirmed },
    { key: 'quote', label: 'Quote', tag: 'rux--tag--gray', is: () => true },
  ];
  const statusOf = t => STATUS.find(s => s.is(t));

  // The buses by number where they are assigned, otherwise how many.
  function buses(t) {
    const numbers = [...new Set((t.trip_assignments || [])
      .map(a => a.buses?.number).filter(n => n != null).map(String))];
    if (numbers.length) return numbers.join(', ');
    const n = Math.max(t.bus_count || 0, t.return_bus_count || 0) || 1;
    return `${n} ${n === 1 ? 'bus' : 'buses'}`;
  }

  const matches = (t, q) => !q || [t.trip_ref, t.customer, t.destination, t.booking_contact_name,
    t.po_ref, t.invoice_number].filter(Boolean).join(' ').toLowerCase().includes(q.toLowerCase());

  const WHICH = {
    upcoming: t => !t.cancelled_at && (lastDay(t) || '9999') >= today,
    past: t => !t.cancelled_at && (lastDay(t) || '9999') < today,
    cancelled: t => !!t.cancelled_at,
    all: () => true,
  };

  const byDate = (a, b) => String(a.start_date || '').localeCompare(String(b.start_date || ''));
  const SORTS = {
    dates: byDate,
    trip: (a, b) => String(a.customer || '').localeCompare(String(b.customer || '')),
    price: (a, b) => (Number(a.quoted_price) || 0) - (Number(b.quoted_price) || 0),
    status: (a, b) => STATUS.indexOf(statusOf(a)) - STATUS.indexOf(statusOf(b)),
  };
  // With no column sorted, upcoming trips run soonest first and every other
  // view newest first, so the trip most likely wanted is at the top.
  const standing = () => (filter === 'upcoming' ? byDate : (a, b) => byDate(b, a));

  let trips = [];
  let filter = $('scheduler-trips-filter')?.value || 'upcoming';
  let pageAt = 0;

  // Where a row goes: the trip on its week of the schedule.
  const hrefOf = t => `./?trip=${encodeURIComponent(t.id)}&date=${t.start_date || today}`;

  function drawList() {
    const { query, sortKey, sortDir } = view;
    for (const option of $('scheduler-trips-filter')?.options ?? []) {
      option.textContent = `${option.dataset.label} (${trips.filter(WHICH[option.value]).length})`;
    }
    const pool = trips.filter(WHICH[filter]);
    const shown = pool.filter(t => matches(t, query)).sort((a, b) => {
      if (sortDir === 'none') return standing()(a, b);
      const r = SORTS[sortKey](a, b) || standing()(a, b);
      return sortDir === 'descending' ? -r : r;
    });
    view.count(shown.length, pool.length);

    const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
    pageAt = Math.min(pageAt, pages - 1);
    const from = pageAt * PAGE_SIZE;
    drawPages(pages, from, Math.min(from + PAGE_SIZE, shown.length), shown.length);

    const body = $('scheduler-trips-rows');
    body.replaceChildren();
    if (!shown.length) {
      const tr = el('tr');
      const td = el('td', null, query ? `No trips match “${query}”.` : 'No trips here.');
      td.colSpan = 6;
      tr.appendChild(td);
      body.appendChild(tr);
      return;
    }
    for (const t of shown.slice(from, from + PAGE_SIZE)) {
      const tr = el('tr', 'scheduler-pair-row');
      tr.dataset.id = t.id;
      tr.dataset.href = hrefOf(t);

      const when = el('td', null, dates(t));

      const trip = el('td');
      const lines = el('div', 'scheduler-pair-cell__lines');
      const link = el('a', 'scheduler-pair-cell__name', t.customer || t.destination || 'No customer');
      link.href = hrefOf(t);
      lines.appendChild(link);
      if (t.trip_ref) lines.appendChild(el('span', 'scheduler-pair-cell__detail', t.trip_ref));
      trip.appendChild(lines);

      const dest = el('td', null, t.destination || '—');
      const bus = el('td', null, buses(t));
      const price = el('td', null, t.quoted_price == null ? '—' : usd(t.quoted_price));

      const status = statusOf(t);
      const state = el('td');
      const tagLines = el('div', 'scheduler-pair-cell__lines');
      const tag = el('span', `rux--tag rux--layout--size-sm ${status.tag}`);
      tag.appendChild(el('span', 'rux--tag__label', status.label));
      tagLines.appendChild(tag);
      // The reason is written out, since a tooltip never shows on a phone.
      if (t.cancelled_at && t.cancellation_reason) {
        tagLines.appendChild(el('span', 'scheduler-pair-cell__detail', t.cancellation_reason));
      }
      state.appendChild(tagLines);

      tr.append(when, trip, dest, bus, price, state);
      body.appendChild(tr);
    }
  }

  // Carbon's pagination: the range, the page select and the two arrows.
  function drawPages(pages, from, to, total) {
    $('scheduler-trips-range').textContent = total
      ? `${from + 1}–${to} of ${total} ${total === 1 ? 'trip' : 'trips'}` : '0 trips';
    const select = $('scheduler-trips-page');
    select.replaceChildren(...Array.from({ length: pages }, (_, i) => {
      const option = el('option', 'rux--select-option', String(i + 1));
      option.value = String(i);
      return option;
    }));
    select.value = String(pageAt);
    $('scheduler-trips-of').textContent = `of ${pages} ${pages === 1 ? 'page' : 'pages'}`;
    for (const [id, off] of [['scheduler-trips-prev', pageAt === 0], ['scheduler-trips-next', pageAt >= pages - 1]]) {
      const button = $(id);
      button.disabled = off;
      button.classList.toggle('rux--btn--disabled', off);
    }
  }

  // Search, sort and a row's click, which opens its trip on the schedule.
  const view = pair.table({ sortKey: 'dates', sortDir: 'none', draw: () => { pageAt = 0; drawList(); },
    open: tr => tr.dataset.href });

  $('scheduler-trips-filter')?.addEventListener('change', e => {
    filter = e.target.value;
    pageAt = 0;
    drawList();
  });
  $('scheduler-trips-page')?.addEventListener('change', e => { pageAt = Number(e.target.value) || 0; drawList(); });
  $('scheduler-trips-prev')?.addEventListener('click', () => { pageAt -= 1; drawList(); });
  $('scheduler-trips-next')?.addEventListener('click', () => { pageAt += 1; drawList(); });

  // Every trip, a thousand rows a read, which is the most one read returns.
  async function loadList(client) {
    const all = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await client.from('trips').select(COLUMNS)
        .order('start_date', { ascending: false }).range(from, from + 999);
      if (error) throw error;
      all.push(...(data || []));
      if (!data || data.length < 1000) break;
    }
    trips = all;
    $('scheduler-trips-table').hidden = false;
    drawList();
  }

  pair.start(loadList);
})();
