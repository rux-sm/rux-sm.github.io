/* ==========================================================================
   close-out.js — WHAT A TRIP THAT IS BACK STILL ASKS
   --------------------------------------------------------------------------
   The one copy of the close-out rules the board, the trip card and the Trips
   page share. A trip is back once its last leg's yard-back has passed, as
   week.js reads it on the office's clock. A trip that is back stops moving
   on the board and asks only what its record lacks, in the words every alert
   uses: a leg short of a bus or a seat with no driver, as the checklist
   counts them; no actual miles; no invoice, where the billing workflow
   invoices; and a balance still owed that no PO covers. It asks while one of them is true and
   closes itself once none is, so nothing is stored. Only a trip that ends on
   or after FROM asks anything, so the trips before close-out began raise
   nothing.

   Needs billing.js, week.js and leg-facts.js loaded first.
   ========================================================================== */
(() => {
  'use strict';

  const FROM = '2026-10-15';
  const WORDS = {
    bus: 'Bus missing', driver: 'Driver missing', miles: 'Actual miles missing',
    invoice: 'Invoice missing', balance: 'Balance due',
  };
  // Where the trip editor puts each one right.
  const GO = { bus: 'fleet', driver: 'fleet', miles: 'billing', invoice: 'billing', balance: 'billing' };

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
    const facts = legsOf(trip).map(l => window.SchedulerLegFacts.factsOf(trip, l.leg));
    if (facts.some(f => f.busesAssigned < f.busesNeeded)) list.push('bus');
    if (facts.some(f => f.seatsOpen > 0)) list.push('driver');
    if (trip.actual_miles == null || trip.actual_miles === '') list.push('miles');
    const Billing = window.SchedulerBilling;
    if (Billing.stepOn('invoiced') && !Billing.invoicedOf(trip)) list.push('invoice');
    // A PO's payment is recorded on the printed schedule, so a PO covers what is owed.
    const { price, remaining, poReceived } = Billing.of(trip);
    if (price > 0 && remaining > 0 && !poReceived) list.push('balance');
    return list;
  }

  window.SchedulerCloseOut = { FROM, WORDS, GO, backAt, isBack, asks };
})();
