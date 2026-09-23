/* ==========================================================================
   Rux Scheduler — REQUIREMENTS, the one table of what a trip can need
   --------------------------------------------------------------------------
   Id to name and drawing, loaded by the board and by the forms page and owned
   by neither: the board draws these on a trip bar and the envelope prints
   them on paper, and a requirement that is one thing in one place and another
   in the other is a fault nobody sees until it is in a driver's hand.

   THE SIX BELOW CARRY A NAME THIS APP KNOWS. The office's own list, in
   Settings, names anything it adds and overrides these. What it adds is drawn
   from `SchedulerRequirementIcons` by the Material name the list gives it, and
   one this app carries no drawing for shows its initial in the same square.
   ========================================================================== */
(() => {
  'use strict';
  window.SchedulerRequirements = {
    pax56: { label: '56 passengers', icon: '#m-groups-fill' },
    sleeper: { label: 'Sleeper', icon: '#m-airline_seat_flat-fill' },
    adaLift: { label: 'Wheelchair lift', icon: '#m-accessible-fill' },
    hotel: { label: 'Hotel', icon: '#m-apartment-fill' },
    // Carbon's `purchase` is a credit card, which is what a fuel card is.
    fuelCard: { label: 'Fuel card', icon: '#m-credit_card-fill' },
    // A leg that does not come back. No drawing, and nothing to write in.
    oneWay: { label: 'One-way' },
  };
  /* The drawings for what the office adds, keyed by the Material name its list
     stores in `icon`. Written out in full, because a page carries only the
     symbols its scripts name. */
  window.SchedulerRequirementIcons = {
    wifi: '#m-wifi-fill',
  };
})();
