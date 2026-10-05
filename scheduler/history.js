/* ==========================================================================
   history.js — THE HISTORY PAGE
   --------------------------------------------------------------------------
   history.html lists what changed on trips and who changed it, newest first.
   Every save in the trip editor here, and every one in the old trips app,
   writes an entry; this page only reads them. The database narrows the list
   by person, by time and by trip and hands back fifty entries a read, so
   every change of a filter asks again and Show older asks for the next
   fifty. `?trip=<id>` is one trip's history, which the schedule's bar menu
   opens. A row opens its trip on the schedule; an entry whose trip was
   deleted has nothing to open.
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

  /* The span each When choice asks the database for: from a local midnight,
     and up to the next one where the span has an end. */
  const SPANS = {
    any: () => ({}),
    today: () => ({ from: midnight() }),
    yesterday: () => ({ from: midnight(1), to: midnight() }),
    7: () => ({ from: midnight(6) }),
    30: () => ({ from: midnight(29) }),
  };

  // The ten kinds of entry the database allows, as the office says them.
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

  const blank = v => v == null || v === '';
  const say = v => {
    const text = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return text.length > VALUE_MAX ? `${text.slice(0, VALUE_MAX).trimEnd()}…` : text;
  };
  // One field's change, worded as the old trips app words it.
  function changeText(change) {
    const label = change.label || change.field || 'Change';
    if (blank(change.before)) return `${label}: ${blank(change.after) ? 'Added' : say(change.after)}`;
    return `${label}: ${say(change.before)} → ${blank(change.after) ? 'Removed' : say(change.after)}`;
  }

  const tripName = h => h.customer_name || h.destination || 'Trip';
  const hrefOf = h => `./?trip=${encodeURIComponent(h.trip_id)}&date=${h.trip_date || h.trip_start_date || iso(new Date())}`;

  let db = null;
  let entries = [];
  let asked = 0;
  const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
  let tripId = new URLSearchParams(location.search).get('trip');
  if (!UUID.test(tripId || '')) tripId = null;

  function row(h) {
    const tr = el('tr', h.trip_exists ? 'scheduler-pair-row' : null);
    if (h.trip_exists) {
      tr.dataset.id = h.trip_id;
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

    const trip = el('td');
    const tripLines = el('div', 'scheduler-pair-cell__lines');
    if (h.trip_exists) {
      const link = el('a', 'scheduler-pair-cell__name', tripName(h));
      link.href = hrefOf(h);
      tripLines.appendChild(link);
    } else {
      tripLines.appendChild(el('span', null, tripName(h)));
    }
    const detail = [h.customer_name ? h.destination : null, h.trip_ref, h.trip_exists ? null : 'Trip deleted']
      .filter(Boolean).join(' · ');
    if (detail) tripLines.appendChild(el('span', 'scheduler-pair-cell__detail', detail));
    trip.appendChild(tripLines);

    const what = el('td');
    const whatLines = el('div', 'scheduler-pair-cell__lines');
    // The trip again, for a phone, where the Trip column does not fit.
    const tripAgain = el(h.trip_exists ? 'a' : 'span',
      h.trip_exists ? 'scheduler-pair-cell__name scheduler-history-trip' : 'scheduler-history-trip', tripName(h));
    if (h.trip_exists) tripAgain.href = hrefOf(h);
    whatLines.appendChild(tripAgain);
    whatLines.appendChild(el('span', null, ACTIONS[h.action] || h.action));
    for (const change of Array.isArray(h.changes) ? h.changes : []) {
      whatLines.appendChild(el('span', 'scheduler-pair-cell__detail scheduler-history-change', changeText(change)));
    }
    what.appendChild(whatLines);

    tr.append(when, who, trip, what);
    return tr;
  }

  function drawList(more) {
    const body = $('scheduler-history-rows');
    body.replaceChildren(...entries.map(row));
    if (!entries.length) {
      const tr = el('tr');
      const td = el('td', null, 'No changes here.');
      td.colSpan = 4;
      tr.appendChild(td);
      body.appendChild(tr);
    }
    $('scheduler-history-more').hidden = !more;

    // The trip the list is narrowed to, named from its newest entry.
    $('scheduler-history-trip').hidden = !tripId;
    if (tripId) {
      const h = entries[0];
      // The customer first: the tag cuts a long label, and the name says most.
      const label = h ? [h.customer_name || h.destination, h.trip_ref].filter(Boolean).join(' · ') || 'One trip' : 'One trip';
      $('scheduler-history-trip-label').textContent = label;
      $('scheduler-history-trip-label').title = label;
    }
  }

  /* One read. `older` carries on after the last row drawn; without it the
     list starts over. A read answered after a newer one was asked is dropped,
     so a slow answer never draws over the filter chosen since. */
  async function read(older = false) {
    const mine = ++asked;
    const button = $('scheduler-history-older');
    button.disabled = true;
    const { from, to } = SPANS[$('scheduler-history-when').value]();
    const last = older ? entries.at(-1) : null;
    try {
      const { data, error } = await db.rpc('search_trip_history', {
        p_actor_name: $('scheduler-history-person').value || null,
        p_from: from ? from.toISOString() : null,
        p_to: to ? to.toISOString() : null,
        p_trip_id: tripId,
        p_before_created_at: last ? last.created_at : null,
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

  // A click on a row opens its trip on the schedule.
  pair.table({ sortKey: null, draw: () => {}, open: tr => tr.dataset.href });

  $('scheduler-history-person')?.addEventListener('change', () => read());
  $('scheduler-history-when')?.addEventListener('change', () => read());
  $('scheduler-history-older')?.addEventListener('click', () => read(true));
  $('scheduler-history-trip-clear')?.addEventListener('click', () => {
    tripId = null;
    history.replaceState(null, '', 'history.html');
    read();
  });

  async function loadList(client) {
    db = client;
    // The names for the Person choice; without them the list still reads.
    client.rpc('trip_history_people').then(({ data }) => {
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
