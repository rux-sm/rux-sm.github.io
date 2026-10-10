/* ==========================================================================
   quote-lines.js — WHEN A QUOTE LINE'S COST IS THE CALCULATOR'S
   --------------------------------------------------------------------------
   The one copy of the rule for a Billing line's cost. The calculator prices
   three kinds of line: a bus rental, a second driver and a relief driver.
   Such a line follows the calculator, its cost worked out again whenever what
   it is priced from changes, until a figure is typed in its Cost; only that
   makes a typed price. So its window opens with Cost empty, and Done with
   nothing typed leaves it following. Any other line has the cost it was
   given.

   Nothing here reads the page or the database: the editor hands in the line
   and the numbers it read from its fields.
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

  window.SchedulerQuoteLines = { PRICED, priced, follows, costShown, costKept };
})();
