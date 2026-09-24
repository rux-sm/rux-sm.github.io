---
type: plan
---

# Plan: bring the trip editor's Billing tab up to the Overview tab

## Goal

The Billing tab reads like the finished Overview tab, and a save from it
leaves a trip confirmed, paid and coloured exactly as a save from rux-ui
would, so the two boards agree on every trip.

## Decisions

- **A save that changes billing writes `confirmed`, `balance_paid` and
  `date_paid`,** derived as rux-ui's `collectTrip` derives them: confirmed
  when the billing status is one the workflow's `confirmWhen` lists, a partial
  PO counting as a PO; paid in full when the quote is above zero and the
  payments reach it; the paid date the latest payment's date while paid in
  full. A new trip writes them too. A save that touches no billing leaves them
  alone, so opening a trip never arms Save.
- **The workflow is read from the `billing-workflow-v1` settings row** with
  the week, not copied. rux-ui's defaults stand in for a missing or partial
  row. A milestone the row turns off is hidden and counts as off, for Contract
  and Purchase orders, as rux-ui counts them.
- **A trip opens with its switches as rux-ui opens them:** Contract on when the
  status is Signed, or when it is unset on a confirmed trip, which is 343
  trips; PO received on when the flag or a PO reference is set; Invoice sent on
  when the flag, the status or an invoice number says so.
- **The tab's order follows the Overview tab,** a rule above every section after
  the first: the summary card with the confirmation, status tag and reason;
  Price, with Quoted price over Balance and Paid; Contract signed; PO received;
  Invoice sent; Payments.
- **Estimated and actual miles move to the Route tab,** side by side, because
  they describe the route, not the bill.
- **Charter or Ticketed, ticket prices and the manifest wait** for the
  passenger pages, since two trips use them.

## Questions

None open.

## Tasks

- [ ] rux signs a contract on an unconfirmed trip in the scheduler and checks
      the bar turns blue on both boards.
