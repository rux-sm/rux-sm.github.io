/* ==========================================================================
   history.js — THE HISTORY PAGE
   --------------------------------------------------------------------------
   history.html lists what changed and who changed it, newest first: trips,
   and the drivers, buses, customers, contacts and locations they draw on.
   Every save in the trip editor here, and every one in the old trips app,
   writes a trip entry; the database writes an entry itself for every change
   to one of the other five, whichever app made it. This page only reads
   them. The database narrows the list by kind, by person, by time and to one
   trip or record, and hands back fifty entries a read, so every change of a
   choice asks again and Show older asks for the next fifty. `?trip=<id>` is
   one trip's history, which the schedule's bar menu opens, and
   `?record=<id>` one record's, which its own page opens. A row opens what it
   is about; an entry for something deleted has nothing to open.
   ========================================================================== */
(() => {
  'use strict';

  const { $, el } = window.SchedulerPair;
  const pair = window.SchedulerPair.page({ list: 'history', one: 'entry' });

  const PAGE_SIZE = 50;
  // A value longer than this is cut: a rewritten note is a paragraph a side.
  const VALUE_MAX = 200;

  // ── dates, all local ────────────────────────────────────────────────────
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const midnight = (daysAgo = 0) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - daysAgo); return d; };
  const clock = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
  const dayThisYear = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
  const dayAnyYear = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  // "Today", "Yesterday", then the day, with its year once it is not this one.
  function dayOf(date) {
    if (date >= midnight()) return 'Today';
    if (date >= midnight(1)) return 'Yesterday';
    return (date.getFullYear() === new Date().getFullYear() ? dayThisYear : dayAnyYear).format(date);
  }
  // A record's dates are stored as 2026-10-03 and read as Oct 3, 2026.
  const sayDates = text => text.replace(/\b(\d{4})-(\d\d)-(\d\d)\b/g,
    (_, y, m, d) => dayAnyYear.format(new Date(Number(y), Number(m) - 1, Number(d))));

  /* The span each When choice asks the database for: from a local midnight,
     and up to the next one where the span has an end. */
  const SPANS = {
    any: () => ({}),
    today: () => ({ from: midnight() }),
    yesterday: () => ({ from: midnight(1), to: midnight() }),
    7: () => ({ from: midnight(6) }),
    30: () => ({ from: midnight(29) }),
  };

  // The kinds of entry the database allows, as the office says them.
  const ACTIONS = {
    created: 'Created',
    updated: 'Updated',
    deleted: 'Deleted',
    cancelled: 'Cancelled',
    reinstated: 'Brought back',
    assignment_changed: 'Buses and drivers',
    driver_status_changed: 'Driver status',
    document_uploaded: 'File added',
    document_replaced: 'File replaced',
    document_deleted: 'File deleted',
  };

  /* What each kind of record is called, the page that opens one, and its
     columns in the words its own page labels them with. A trip entry carries
     its labels already; a record entry carries column names, and a column
     with no word here is shown by its name, so a new one is never hidden. */
  const KINDS = {
    driver: {
      word: 'Driver', page: 'drivers.html', words: {
        name: 'Name', short_name: 'Short name', phone: 'Phone', email: 'Email', date_of_birth: 'Date of birth',
        texting_url: 'Google Messages link', address: 'Street address', city: 'City', address_state: 'State', zip: 'ZIP',
        emergency_contact_name: 'Emergency contact', emergency_contact_phone: 'Emergency phone',
        cdl_class: 'CDL class', license_state: 'Issuing state', license_number: 'Licence number',
        license_exp: 'Licence expires', med_card_expiry: 'Medical card expires', endorsements: 'Endorsements',
        status: 'Status', employment_type: 'Employment type', priority: 'Priority', hire_date: 'Hire date',
        notes: 'Notes', time_off: 'Time off',
      },
    },
    bus: {
      word: 'Bus', page: 'fleet.html', words: {
        number: 'Unit number', capacity: 'Capacity', type: 'Type', year: 'Model year', make: 'Make', model: 'Model',
        vin: 'VIN', color: 'Colour', status: 'Status', ada_lift: 'ADA lift', sleeper: 'Sleeper', equipment: 'Equipment',
        mileage: 'Odometer, miles', last_service: 'Last service', next_service: 'Next service',
        insurance_exp: 'Insurance expires', registration_exp: 'Registration expires',
        inspection_exp: 'DOT inspection expires', notes: 'Notes', days_out: 'Days out',
      },
    },
    customer: {
      word: 'Customer', page: 'customers.html',
      words: { name: 'Name', bill_to: 'Bill-to address', usual_location_id: 'Usual pickup' },
    },
    contact: {
      word: 'Contact', page: 'contacts.html',
      words: { name: 'Name', phone: 'Phone', email: 'Email', customer_id: 'Customer', client: 'Organization' },
    },
    location: {
      word: 'Location', page: 'locations.html',
      words: { name: 'Name', address: 'Address', map_point: 'Map point' },
    },
  };
  const wordFor = (kind, field) => KINDS[kind]?.words[field]
    || String(field || 'Change').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());

  const blank = v => v == null || v === '';
  const say = (v, record) => {
    let text = typeof v === 'object' ? JSON.stringify(v) : String(v);
    if (record) text = sayDates(text);
    return text.length > VALUE_MAX ? `${text.slice(0, VALUE_MAX).trimEnd()}…` : text;
  };
  // One field's change, worded as the old trips app words it.
  function changeText(h, change) {
    const record = h.kind !== 'trip';
    const label = change.label || (record ? wordFor(h.kind, change.field) : change.field) || 'Change';
    if (blank(change.before)) return `${label}: ${blank(change.after) ? 'Added' : say(change.after, record)}`;
    return `${label}: ${say(change.before, record)} → ${blank(change.after) ? 'Removed' : say(change.after, record)}`;
  }

  // What an entry is about, the line under it, and where its row goes.
  const nameOf = h => (h.kind === 'trip'
    ? h.customer_name || h.destination || 'Trip'
    : h.record_name || KINDS[h.kind]?.word || 'Record');
  const detailOf = h => (h.kind === 'trip'
    ? [h.customer_name ? h.destination : null, h.trip_ref, h.record_exists ? null : 'Trip deleted']
    : [KINDS[h.kind]?.word, h.record_exists ? null : 'Deleted']).filter(Boolean).join(' · ');
  const hrefOf = h => (h.kind === 'trip'
    ? `./?trip=${encodeURIComponent(h.record_id)}&date=${h.trip_date || iso(new Date())}`
    : `${KINDS[h.kind].page}?id=${encodeURIComponent(h.record_id)}`);
  const opens = h => h.record_exists && (h.kind === 'trip' || !!KINDS[h.kind]);

  let db = null;
  let entries = [];
  let asked = 0;
  const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
  const query = new URLSearchParams(location.search);
  let oneId = query.get('trip') || query.get('record');
  if (!UUID.test(oneId || '')) oneId = null;

  function row(h) {
    const tr = el('tr', opens(h) ? 'scheduler-pair-row' : null);
    if (opens(h)) {
      tr.dataset.id = h.record_id;
      tr.dataset.href = hrefOf(h);
    }

    const at = new Date(h.created_at);
    const when = el('td');
    const whenLines = el('div', 'scheduler-pair-cell__lines');
    whenLines.append(el('span', null, dayOf(at)), el('span', 'scheduler-pair-cell__detail', clock.format(at)));
    // The name again, for a phone, where the Who column does not fit.
    whenLines.appendChild(el('span', 'scheduler-pair-cell__detail scheduler-history-who', h.actor_name || ''));
    when.appendChild(whenLines);

    const who = el('td', null, h.actor_name || '—');

    const item = el('td');
    const itemLines = el('div', 'scheduler-pair-cell__lines');
    if (opens(h)) {
      const link = el('a', 'scheduler-pair-cell__name', nameOf(h));
      link.href = hrefOf(h);
      itemLines.appendChild(link);
    } else {
      itemLines.appendChild(el('span', null, nameOf(h)));
    }
    const detail = detailOf(h);
    if (detail) itemLines.appendChild(el('span', 'scheduler-pair-cell__detail', detail));
    item.appendChild(itemLines);

    const what = el('td');
    const whatLines = el('div', 'scheduler-pair-cell__lines');
    // What it is about again, for a phone, where the Item column does not fit.
    const again = h.kind === 'trip' ? nameOf(h) : [KINDS[h.kind]?.word, h.record_name].filter(Boolean).join(' ');
    const itemAgain = el(opens(h) ? 'a' : 'span',
      opens(h) ? 'scheduler-pair-cell__name scheduler-history-item' : 'scheduler-history-item', again);
    if (opens(h)) itemAgain.href = hrefOf(h);
    whatLines.appendChild(itemAgain);
    whatLines.appendChild(el('span', null, ACTIONS[h.action] || h.action));
    for (const change of Array.isArray(h.changes) ? h.changes : []) {
      whatLines.appendChild(el('span', 'scheduler-pair-cell__detail scheduler-history-change', changeText(h, change)));
    }
    what.appendChild(whatLines);

    tr.append(when, who, item, what);
    return tr;
  }

  function drawList(more) {
    const body = $('scheduler-history-rows');
    body.replaceChildren(...entries.map(row));
    if (!entries.length) {
      const tr = el('tr');
      // One trip or record with nothing yet reads as not started, not as broken.
      const td = el('td', null, oneId ? 'No changes recorded yet.' : 'No changes here.');
      td.colSpan = 4;
      tr.appendChild(td);
      body.appendChild(tr);
    }
    $('scheduler-history-more').hidden = !more;

    // The trip or record the list is narrowed to, named from its newest entry.
    $('scheduler-history-one').hidden = !oneId;
    if (oneId) {
      const h = entries[0];
      // The name first: the tag cuts a long label, and the name says most.
      const label = !h ? 'One item' : h.kind === 'trip'
        ? [h.customer_name || h.destination, h.trip_ref].filter(Boolean).join(' · ') || 'One trip'
        : [h.record_name, KINDS[h.kind]?.word].filter(Boolean).join(' · ') || 'One item';
      $('scheduler-history-one-label').textContent = label;
      $('scheduler-history-one-label').title = label;
    }
  }

  /* One read. `older` carries on after the last row drawn; without it the
     list starts over. A read answered after a newer one was asked is dropped,
     so a slow answer never draws over the choice made since. */
  async function read(older = false) {
    const mine = ++asked;
    const button = $('scheduler-history-older');
    button.disabled = true;
    const { from, to } = SPANS[$('scheduler-history-when').value]();
    const last = older ? entries.at(-1) : null;
    try {
      const { data, error } = await db.rpc('search_history', {
        p_kind: $('scheduler-history-kind').value || null,
        p_actor_name: $('scheduler-history-person').value || null,
        p_from: from ? from.toISOString() : null,
        p_to: to ? to.toISOString() : null,
        p_record_id: oneId,
        p_before_created_at: last ? last.created_at : null,
        p_before_record: last ? last.kind !== 'trip' : null,
        p_before_id: last ? last.id : null,
        p_limit: PAGE_SIZE,
      });
      if (error) throw error;
      if (mine !== asked) return;
      entries = older ? [...entries, ...(data || [])] : (data || []);
      pair.say(null);
      drawList((data || []).length === PAGE_SIZE);
    } catch {
      if (mine === asked) pair.say('error', "The history didn't load", 'Reload the page to try again.');
    } finally {
      if (mine === asked) button.disabled = false;
    }
  }

  // A click on a row opens what it is about.
  pair.table({ sortKey: null, draw: () => {}, open: tr => tr.dataset.href });

  for (const id of ['scheduler-history-kind', 'scheduler-history-person', 'scheduler-history-when']) {
    $(id)?.addEventListener('change', () => read());
  }
  $('scheduler-history-older')?.addEventListener('click', () => read(true));
  $('scheduler-history-one-clear')?.addEventListener('click', () => {
    oneId = null;
    history.replaceState(null, '', 'history.html');
    read();
  });

  async function loadList(client) {
    db = client;
    // The names for the Person choice; without them the list still reads.
    client.rpc('history_people').then(({ data }) => {
      const select = $('scheduler-history-person');
      for (const name of (data || []).filter(n => typeof n === 'string' && n)) {
        const option = el('option', 'rux--select-option', name);
        option.value = name;
        select.appendChild(option);
      }
    }, () => {});
    $('scheduler-history-table').hidden = false;
    await read();
  }

  pair.start(loadList);
})();
