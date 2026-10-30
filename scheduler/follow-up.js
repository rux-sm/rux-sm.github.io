/* ==========================================================================
   follow-up.js — WHICH TRIPS ARE WAITING ON THE CUSTOMER
   --------------------------------------------------------------------------
   The one copy of the follow-up rules the board and the Trips page share. A
   trip is waiting on the customer while it is not confirmed, its PO or
   deposit is not in, its itinerary is missing, or its balance is unpaid
   within two weeks of leaving. A trip not confirmed waits on nothing until
   it leaves within the office's chase window. Once it has left, only its
   balance can still be waited on, and only where no PO covers it, because a
   PO's payment is recorded on the printed schedule and not here. A
   placeholder, as billing.js reads one, waits on nothing. Once the customer
   was last told, by its newest real update or the day its quote is marked
   sent, or its booking where it has neither, is longer ago than the
   office's follow-up wait, it asks for a follow-up. A trip leaving within a
   week that still waits on something is due: it asks however new its
   updates. A reminder has no dismiss; it asks while it is true. A trip
   waiting on nothing never asks, however old its updates. A skipped
   prompt's `nothing` row is not an update, so it never makes a trip look
   followed up.

   The wait and the window are the office's `follow-up-v1` settings row,
   `{ wait_days, chase_days }`.
   Needs billing.js and trip-shape.js loaded first.
   ========================================================================== */
(() => {
  'use strict';

  const KEY = 'follow-up-v1';
  const DEFAULT = { waitDays: 3, chaseDays: 60 };
  const BALANCE_DAYS = 14;
  const DUE_DAYS = 7;
  // How the card and the list name what a trip waits on.
  /* Each wait as the card, the bar's bell and the trip list name it: the
     thing first, then its state, in the words every alert uses. */
  const WORDS = { confirmation: 'Trip unconfirmed', po: 'PO, deposit or payment pending', itinerary: 'Itinerary missing', balance: 'Balance due' };
  let setting = { ...DEFAULT };

  const num = (v, d) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);
  function set(value) {
    setting = { waitDays: num(value?.wait_days, DEFAULT.waitDays), chaseDays: num(value?.chase_days, DEFAULT.chaseDays) };
  }
  async function read(client) {
    if (!client) return setting;
    const { data, error } = await client.from('settings').select('value').eq('key', KEY).maybeSingle();
    if (!error) set(data?.value);
    return setting;
  }
  async function save(client, next) {
    const value = { wait_days: num(next.waitDays ?? setting.waitDays, DEFAULT.waitDays),
                    chase_days: num(next.chaseDays ?? setting.chaseDays, DEFAULT.chaseDays) };
    const { error } = await client.from('settings').upsert({ key: KEY, value }, { onConflict: 'key' });
    if (error) throw new Error(error.message);
    set(value);
    return setting;
  }

  /* Today on the office's calendar, YYYY-MM-DD, whatever clock the code runs
     on: the browser's in the office, or the connector's, which keeps UTC. */
  const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date());
  const parseISO = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
  const placeholder = trip => window.SchedulerBilling.placeholder(trip);
  // Whole days until the trip leaves, 0 on the day, or null with no date.
  const daysToGo = trip => (trip.start_date
    ? Math.round((parseISO(trip.start_date) - parseISO(today())) / 864e5) : null);
  // The first leg's itinerary, by trip-shape.js, which every later leg is handed too until it has its own.
  const hasItinerary = trip => {
    const SHAPE = window.SchedulerTripShape;
    return !!SHAPE.itineraryFor(trip, SHAPE.firstLeg(trip)?.id);
  };

  function waitsOf(trip) {
    if (placeholder(trip) || trip.cancelled_at) return [];
    const now = today();
    const left = !!trip.start_date && trip.start_date <= now;
    const waits = [];
    const { price, remaining, rung, poReceived } = window.SchedulerBilling.of(trip);
    if (!left) {
      /* A quote not answered yet waits on nothing until its trip is inside
         the chase window; a trip with no date always is. */
      const days = daysToGo(trip);
      if (trip.confirmed === false && days != null && days > setting.chaseDays) return [];
      if (trip.confirmed === false) waits.push('confirmation');
      else if (price > 0 && (rung === 'pending' || rung === 'contract_signed')) waits.push('po');
      if (!hasItinerary(trip) && !trip.itinerary_not_needed) waits.push('itinerary');
    }
    const soon = !!trip.start_date && (parseISO(trip.start_date) - parseISO(now)) / 864e5 <= BALANCE_DAYS;
    const owes = trip.confirmed !== false && remaining > 0;
    if (owes && (left ? !poReceived : soon && (rung === 'po_partial' || rung === 'deposit_received'))) {
      waits.push('balance');
    }
    return waits;
  }

  // The updates newest first, without the skipped prompts' rows.
  const updatesOf = trip => (trip.trip_updates || []).filter(u => u.kind !== 'nothing')
    .sort((x, y) => Date.parse(y.created_at) - Date.parse(x.created_at));
  /* When the customer was last told: the newest real update or the day the
     quote is marked sent, whichever is later, read at noon so the day stays
     the office's; the booking where there is neither. */
  function quietSince(trip) {
    const update = updatesOf(trip)[0]?.created_at ?? null;
    const sent = /^\d{4}-\d{2}-\d{2}/.test(String(trip.quote_sent_on || ''))
      ? new Date(`${String(trip.quote_sent_on).slice(0, 10)}T12:00:00`).toISOString() : null;
    const told = [update, sent].filter(Boolean).sort((x, y) => Date.parse(y) - Date.parse(x))[0];
    return told ?? trip.created_at ?? null;
  }
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
    KEY, WORDS, today, set, read, save, waitsOf, updatesOf, quietSince, due, daysToGo, asks, agoShort,
    get setting() { return { ...setting }; },
  };
})();
