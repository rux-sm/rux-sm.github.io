/* ==========================================================================
   follow-up.js — WHICH TRIPS ARE WAITING ON THE CUSTOMER
   --------------------------------------------------------------------------
   The one copy of the follow-up rules the board and the Trips page share. A
   trip is waiting on the customer while it is not confirmed, its PO or
   deposit is not in, its itinerary is missing, or its balance is unpaid
   within two weeks of leaving; once it has left, only its balance can still
   be waited on, and a placeholder waits on nothing. Once its newest real
   update, or its booking where it has none, is older than the office's
   follow-up wait, it asks for a follow-up. A trip leaving within a week that
   still waits on something is due: it asks however new its updates. A
   reminder has no dismiss; it asks while it is true. A trip waiting on
   nothing never asks, however old its updates. A skipped prompt's `nothing` row is not an update, so it never
   makes a trip look followed up.

   The wait is the office's `follow-up-v1` settings row, `{ wait_days }`.
   Needs billing.js loaded first.
   ========================================================================== */
(() => {
  'use strict';

  const KEY = 'follow-up-v1';
  const DEFAULT = { waitDays: 3 };
  const BALANCE_DAYS = 14;
  const DUE_DAYS = 7;
  // How the card and the list name what a trip waits on.
  // Each wait as the card, the bar's bell and the trip list name it.
  const WORDS = { confirmation: 'Unconfirmed', po: 'PO missing', itinerary: 'Itinerary missing', balance: 'Balance due' };
  let setting = { ...DEFAULT };

  const num = (v, d) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);
  function set(value) {
    setting = { waitDays: num(value?.wait_days, DEFAULT.waitDays) };
  }
  async function read(client) {
    if (!client) return setting;
    const { data, error } = await client.from('settings').select('value').eq('key', KEY).maybeSingle();
    if (!error) set(data?.value);
    return setting;
  }
  async function save(client, next) {
    const value = { wait_days: num(next.waitDays, DEFAULT.waitDays) };
    const { error } = await client.from('settings').upsert({ key: KEY, value }, { onConflict: 'key' });
    if (error) throw new Error(error.message);
    set(value);
    return setting;
  }

  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parseISO = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
  // The office paints a trip amber, or its retired names, while it is not quoted yet.
  const placeholder = trip => ['amber', 'orange', 'yellow'].includes(String(trip.trip_bar_color || '').toLowerCase());
  const hasItinerary = trip => (trip.trip_documents || []).some(d => String(d.label || '').toLowerCase() === 'itinerary');

  function waitsOf(trip) {
    if (placeholder(trip) || trip.cancelled_at) return [];
    const today = iso(new Date());
    const left = !!trip.start_date && trip.start_date <= today;
    const waits = [];
    const { price, remaining, rung } = window.SchedulerBilling.of(trip);
    if (!left) {
      if (trip.confirmed === false) waits.push('confirmation');
      else if (price > 0 && (rung === 'pending' || rung === 'contract_signed')) waits.push('po');
      if (!hasItinerary(trip) && !trip.itinerary_not_needed) waits.push('itinerary');
    }
    const soon = !!trip.start_date && (parseISO(trip.start_date) - parseISO(today)) / 864e5 <= BALANCE_DAYS;
    if (trip.confirmed !== false && remaining > 0 && soon && (rung === 'po_partial' || rung === 'deposit_received')) {
      waits.push('balance');
    }
    return waits;
  }

  // The updates newest first, without the skipped prompts' rows.
  const updatesOf = trip => (trip.trip_updates || []).filter(u => u.kind !== 'nothing')
    .sort((x, y) => Date.parse(y.created_at) - Date.parse(x.created_at));
  const quietSince = trip => updatesOf(trip)[0]?.created_at ?? trip.created_at ?? null;

  // Whole days until the trip leaves, 0 on the day, or null with no date.
  const daysToGo = trip => (trip.start_date
    ? Math.round((parseISO(trip.start_date) - parseISO(iso(new Date()))) / 864e5) : null);
  function due(trip) {
    const days = daysToGo(trip);
    return days != null && days >= 0 && days <= DUE_DAYS && waitsOf(trip).length > 0;
  }

  function asks(trip) {
    if (!waitsOf(trip).length) return false;
    if (due(trip)) return true;
    const since = quietSince(trip);
    return !(since && Date.now() - Date.parse(since) <= setting.waitDays * 864e5);
  }

  /* "today", then "1d", "7d", the way a chat says it, so the ages line up.
     Days are counted on the office's calendar, so last night's update is "1d"
     this morning even though fewer than 24 hours have passed. */
  const officeDay = at => Date.parse(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(at));
  const agoShort = at => {
    const d = Math.round((officeDay(new Date()) - officeDay(new Date(at))) / 864e5);
    return d <= 0 ? 'today' : `${d}d`;
  };

  window.SchedulerFollowUp = {
    KEY, WORDS, set, read, save, waitsOf, updatesOf, quietSince, due, daysToGo, asks, agoShort,
    get setting() { return { ...setting }; },
  };
})();
