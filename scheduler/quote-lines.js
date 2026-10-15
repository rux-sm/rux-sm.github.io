/* ==========================================================================
   quote-lines.js — WHEN A QUOTE LINE'S COST IS THE CALCULATOR'S
   --------------------------------------------------------------------------
   The one copy of the rule for a Billing line's cost. The calculator prices
   three kinds of line: a bus rental, a second driver and a relief driver.
   Such a line follows the calculator, its cost worked out again whenever what
   it is priced from changes, until a figure is typed in its Cost; only that
   makes a typed price. So its window opens with Cost empty, and Done with
   nothing typed leaves it following. Any other line has the cost it was
   given. What the calculator makes the line cost is worked out here too, on
   `Rux.quote`'s formulas, so Billing and the Detailed itinerary agree.

   Nothing here reads the page or the database: the editor and the print
   hand in the line and the numbers they read.
   ========================================================================== */
(() => {
  'use strict';

  const PRICED = ['rental', 'second_driver', 'relief'];
  const priced = kind => PRICED.includes(kind);
  // Whether a line's cost is the calculator's to set.
  const follows = line => priced(line?.kind) && !line.cost_typed;

  /* What the window's Cost opens on, `cost` being the line's cost as a number
     or null. A line that follows the calculator opens empty, or Done would
     type the calculator's own figure in and stop the line following. Any
     other line opens on its cost, a discount's as the amount off. */
  const costShown = (line, cost) => (follows(line) || cost == null ? null : Math.abs(cost));

  /* What Done keeps of the Cost field, `typed` being its number or null for a
     blank: a discount as a negative cost, and a typed price only where a
     figure was typed. */
  const costKept = (kind, typed) => ({
    cost: typed == null ? null : (kind === 'discount' ? -Math.abs(typed) : typed),
    cost_typed: typed != null,
  });

  /* A leg's miles a day as the calculator prices them: the Route Summary's
     rows where any has miles, or else the leg's whole miles spread over its
     days, the odd miles on the first; null with no miles. */
  const milesADay = (rows, whole, days) => {
    if (rows?.some(m => m > 0)) return rows.map(m => Math.round(m));
    const n = days || 1;
    return whole > 0 ? Array.from({ length: n }, (_, i) => Math.floor(whole / n) + (i ? 0 : whole % n)) : null;
  };

  const round2 = n => Math.round(n * 100) / 100;
  /* What the calculator makes a line cost for one bus or one extra driver,
     from `basis`, { perDay, days, dead, rate }, and the rates page's named
     rates; null where the leg has no miles or days yet, or the line is not
     the calculator's. Billing prices a line with it, and the Detailed
     itinerary prints it beside a typed price. A relief driver is the flat
     charge, whatever the trip. */
  const calculated = (kind, basis, named, q = window.Rux?.quote) => {
    if (kind === 'relief') return Number.isFinite(named?.driver_relief_flat) ? named.driver_relief_flat : null;
    const perDay = basis?.perDay;
    if (!q || !named || !basis.days || !(perDay?.reduce((a, b) => a + b, 0) > 0)) return null;
    let amount = null;
    if (kind === 'rental' && basis.rate != null) {
      amount = q.tripQuote({ miles: perDay, rate: basis.rate, dead: basis.dead }, named).amount;
    } else if (kind === 'second_driver') {
      const half = perDay.map(m => m / 2);
      amount = q.driverPay({ driver1: half, driver2: half, drivers: 2 }, named).amount;
    }
    return amount == null ? null : round2(amount);
  };

  window.SchedulerQuoteLines = { PRICED, priced, follows, costShown, costKept, milesADay, calculated };
})();
