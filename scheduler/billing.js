/* ==========================================================================
   billing.js — WHERE A TRIP'S MONEY STANDS
   --------------------------------------------------------------------------
   The billing rules, the one copy the scheduler's pages share: the
   workflow the `billing-workflow-v1` settings row sets, the status ladder a
   trip climbs, and a saved trip's money read from its rows. The board sets
   the workflow as it reads the week; a page that reads the row itself calls
   `setWorkflow`. Loaded before any page's own script that reads billing.
   ========================================================================== */
(() => {
  'use strict';

  /* The billing workflow the office keeps in the `billing-workflow-v1` settings
     row: which milestones are in use, and which billing statuses confirm a
     trip. `read` fills it with the week; these are the defaults for a
     missing row or a missing part of one. */
  const CONFIRMING = ['contract_signed', 'po_partial', 'po_received', 'deposit_received', 'paid_full', 'overpaid'];
  const BILLING_DEFAULT = { steps: { contractSigned: true, poReceived: true, invoiced: true },
                            confirmWhen: ['contract_signed', 'po_received', 'deposit_received', 'paid_full'] };
  let billingWorkflow = BILLING_DEFAULT;
  function setBillingWorkflow(value) {
    const steps = { ...BILLING_DEFAULT.steps };
    for (const key of Object.keys(steps)) {
      if (value?.workflow?.[key]?.active === false) steps[key] = false;
    }
    const listed = Array.isArray(value?.confirmWhen) ? value.confirmWhen.filter(k => CONFIRMING.includes(k)) : [];
    billingWorkflow = { steps, confirmWhen: listed.length ? [...new Set(listed)] : BILLING_DEFAULT.confirmWhen };
  }
  // Whether a milestone is in use. One that is not counts as off.
  const stepOn = key => billingWorkflow.steps[key] !== false;

  /* The billing status ladder; first match wins:

       overpaid          price > 0 && balance < 0
       paid_full         price > 0 && paid > 0 && balance <= 0
       po_partial        poReceived && price > 0 && poAmount < remaining
       po_received       poReceived
       deposit_received  paid > 0 && (balance > 0 || price <= 0)
       contract_signed   contractSigned
       pending           -- everything else

     The invoice milestone moves neither the status nor the confirmation. */
  function billingStatus({ contractSigned, poReceived, poAmount, price, paid }) {
    const balance = price - paid;
    const remaining = Math.max(0, balance);
    if (price > 0 && balance < 0) return 'overpaid';
    if (price > 0 && paid > 0 && balance <= 0) return 'paid_full';
    if (poReceived && price > 0 && poAmount < remaining) return 'po_partial';
    if (poReceived) return 'po_received';
    if (paid > 0 && (balance > 0 || price <= 0)) return 'deposit_received';
    if (contractSigned) return 'contract_signed';
    return 'pending';
  }
  // A partial PO confirms whenever a PO does. A trip paid past
  // its price confirms whenever one paid in full does, which the
  // default list leaves out, so a card fee inside a payment or a discount
  // after it does not turn a paid trip unconfirmed.
  const confirmRungOf = rung => (rung === 'po_partial' ? 'po_received' : rung);
  const confirmsTrip = rung => billingWorkflow.confirmWhen.includes(confirmRungOf(rung))
    || (rung === 'overpaid' && billingWorkflow.confirmWhen.includes('paid_full'));

  /* A trip's milestones. A confirmed trip with no
     contract status predates the column and counts as signed; a PO reference
     or an invoice number turns its milestone on. */
  const contractSignedOf = trip => stepOn('contractSigned')
    && (trip.contract_status === 'Signed' || (trip.contract_status == null && !!trip.confirmed));
  const poReceivedOf = trip => stepOn('poReceived') && !!(trip.po_received || trip.po_ref);
  const invoicedOf = trip => !!(trip.invoiced || trip.invoice_number || trip.invoice_status === 'Invoiced');

  /* A saved trip's money, read from its rows the way the editor's
     `billingNow` reads its form, so the bar and the Billing tab put the trip
     on the same rung. The row lists are the live ones; the `deposit_amount` and `po_amount`
     aggregates are what an older trip holds from before those lists existed. A
     trip marked paid with no payment rows carries the whole quote as paid,
     so it is not read as owing it. */
  function billingOf(trip) {
    const sum = rows => (rows || []).reduce((n, r) => n + (Number(r.amount) || 0), 0);
    const price = Number(trip.quoted_price) || 0;
    const rows = trip.trip_payments?.length ? sum(trip.trip_payments) : Number(trip.deposit_amount) || 0;
    const paid = rows <= 0 && (trip.date_paid || trip.balance_paid) ? price : rows;
    const poAmount = trip.trip_pos?.length ? sum(trip.trip_pos) : Number(trip.po_amount) || 0;
    const poReceived = poReceivedOf(trip);
    const rung = billingStatus({ contractSigned: contractSignedOf(trip), poReceived, poAmount, price, paid });
    // The day the last payment landed. `date_paid` is the column both apps
    // derive on save; the rows are what a trip saved before it carries.
    const dates = (trip.trip_payments || []).filter(p => Number(p.amount) > 0 && p.date).map(p => p.date).sort();
    return { price, paid, poAmount, poReceived, rung,
             remaining: Math.max(0, price - paid), datePaid: trip.date_paid || dates.pop() || null };
  }

  /* A placeholder is not a trip yet: the office paints it amber, or orange
     and yellow, amber's retired names, before it is quoted. One that is
     confirmed, or has a quote marked sent, is past that, and its colour is
     only a colour: every reminder applies to it. */
  const AMBER = ['amber', 'orange', 'yellow'];
  const placeholder = trip => AMBER.includes(String(trip?.trip_bar_color || '').toLowerCase())
    && !trip.confirmed && trip.quote_sent_price == null && !trip.quote_sent_on;

  window.SchedulerBilling = {
    setWorkflow: setBillingWorkflow, stepOn, status: billingStatus, confirmRungOf, confirmsTrip,
    contractSignedOf, poReceivedOf, invoicedOf, of: billingOf, placeholder,
    get confirmWhen() { return [...billingWorkflow.confirmWhen]; },
  };
})();
