/* ==========================================================================
   close-out.js — WHAT A TRIP THAT IS BACK STILL ASKS
   --------------------------------------------------------------------------
   The one copy of the close-out rules the board, the trip card and the Trips
   page share. A trip is back once its last leg's yard-back has passed, as
   week.js reads it on the office's clock. A trip that is back stops moving
   on the board and asks only what its record lacks, in the words every alert
   uses: a leg short of a bus or a seat with no driver, as the checklist
   counts them; no actual miles; a filled seat with no pay, since every
   driver is paid by the trip; no invoice, where the billing workflow
   invoices; and a balance still owed that no PO covers. It asks while one of them is true and
   closes itself once none is, so nothing is stored. Only a trip that ends on
   or after FROM asks anything, so the trips before close-out began raise
   nothing. `report` is what a trip that is back came to, its yard times,
   its money and what it asks, which the bar's marks and the post-trip entry
   in its Updates say.

   Needs billing.js, week.js and leg-facts.js loaded first.
   ========================================================================== */
(() => {
  'use strict';

  const FROM = '2026-10-15';
  const WORDS = {
    bus: 'Bus missing', driver: 'Driver missing', miles: 'Actual miles missing', pay: 'Driver pay missing',
    invoice: 'Invoice missing', balance: 'Balance due',
  };
  // Where the trip editor puts each one right.
  const GO = { bus: 'fleet', driver: 'fleet', miles: 'billing', pay: 'billing', invoice: 'billing', balance: 'billing' };

  const placeholder = trip => window.SchedulerBilling.placeholder(trip);
  const legsOf = trip => window.SchedulerWeek.legsOf(trip);

  // When the trip's last leg is back at the yard, or null with no dates.
  function backAt(trip) {
    const legs = legsOf(trip);
    return legs.length ? Math.max(...legs.map(window.SchedulerWeek.backAt)) : null;
  }
  function isBack(trip, now = Date.now()) {
    if (trip.cancelled_at) return false;
    const at = backAt(trip);
    return at != null && now > at;
  }

  // The last day a trip's legs take, as the Trips page dates it.
  const lastDay = trip => legsOf(trip).reduce((d, l) => (l.to > d ? l.to : d), '');

  /* What a trip that is back still asks, as ids in the order the card lists
     them; none for a trip not back, cancelled, a placeholder, or one that
     ended before close-out began. */
  function asks(trip, now = Date.now()) {
    if (placeholder(trip) || !isBack(trip, now) || lastDay(trip) < FROM) return [];
    const list = [];
    const facts = legsOf(trip).map(l => window.SchedulerLegFacts.factsOf(trip, l.key));
    if (facts.some(f => f.busesAssigned < f.busesNeeded)) list.push('bus');
    if (facts.some(f => f.seatsOpen > 0)) list.push('driver');
    if (trip.actual_miles == null || trip.actual_miles === '') list.push('miles');
    if (facts.some(f => f.payLeft > 0)) list.push('pay');
    const Billing = window.SchedulerBilling;
    if (Billing.stepOn('invoiced') && !Billing.invoicedOf(trip)) list.push('invoice');
    // A PO's payment is recorded on the printed schedule, so a PO covers what is owed.
    const { price, remaining, poReceived } = Billing.of(trip);
    if (price > 0 && remaining > 0 && !poReceived) list.push('balance');
    return list;
  }

  /* What a trip that is back came to, for its bar's marks and the post-trip
     entry first in its Updates: when its buses left the yard and were back,
     the earliest out and the latest back of Samsara's times on its buses,
     beside the trip's planned departure and return, and how many of its buses
     have a time; whether it is paid in full and on which day, the PO and the
     invoice it carries, and the balance still owed that no PO covers; and
     what it still asks. Null for a trip that is not back or is a
     placeholder. Worked out each time, never stored, so it says what is true
     now. */
  function report(trip, now = Date.now()) {
    if (placeholder(trip) || !isBack(trip, now)) return null;
    const Week = window.SchedulerWeek;
    const legs = legsOf(trip);
    const buses = (trip.trip_assignments || []).filter(a => a.bus_id);
    const times = key => buses.map(a => Date.parse(a[key] ?? '')).filter(Number.isFinite);
    const outs = times('actual_yard_depart_at');
    const backs = times('actual_yard_return_at');
    const { price, paid, remaining, poReceived, datePaid } = window.SchedulerBilling.of(trip);
    const paidInFull = price > 0 && paid > 0 && remaining <= 0;
    return {
      out: outs.length ? Math.min(...outs) : null,
      plannedOut: legs.length ? Math.min(...legs.map(Week.departAt)) : null,
      back: backs.length ? Math.max(...backs) : null,
      plannedBack: backAt(trip),
      timed: backs.length,
      buses: buses.length,
      paid: paidInFull,
      paidOn: paidInFull ? datePaid : null,
      po: poReceived ? trip.po_ref || null : null,
      invoice: trip.invoice_number || null,
      owed: price > 0 && remaining > 0 && !poReceived ? remaining : 0,
      asks: asks(trip, now),
    };
  }

  window.SchedulerCloseOut = { FROM, WORDS, GO, backAt, isBack, asks, report };
})();
