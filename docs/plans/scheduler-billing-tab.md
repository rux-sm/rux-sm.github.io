---
type: plan
---

# Plan: a simpler Billing tab

## Goal

The trip editor's Billing tab is built from the parts the other tabs already
use, and reads top to bottom as a trip's money goes: a summary tile like the
Route tab's, the quote's lines, one list of what has been sent, signed,
received and paid, then the miles and Mark billing done. It has no switches
and no row of buttons, and every option sits in a heading's ⋮ menu, as the
Route tab's do.

## Decisions

### The summary

- **The summary is a tile, as the Route tab's is:** `rux--tile
  scheduler-summary` with the same `scheduler-figures`, so the two tabs open
  the same way.
- **Its figures are Quoted, Paid and Balance,** because the price is the
  trip's first figure and the tile is where it is read.
- **Its foot is the status:** Confirmed or Not confirmed with the billing
  status, then one line of what is left: what would confirm the trip, or what
  the POs and payments leave uncovered.

### The quote

- **The Quote section is its lines, Add the bus rental and Add line,** since
  the lines are how a quote is entered.
- **Calculator and Copy for QuickBooks move to the Quote heading's ⋮ menu,**
  as Measure drives again sits in the Route tab's.
- **The Quoted price field shows only on a trip with no lines,** where it is
  still typed; on any other the price is the lines' total, which the tile
  shows.
- **The quote-changed warning stays under the lines,** because it is about
  the quote and offers to mark the new price sent.

### The Billing list

- **Quote sent, Contract signed, each PO, each invoice and each payment are
  rows of one `rowList`,** each with its check, what it is, its date and its
  amount, and a ⋮ that edits or removes it.
- **The rows stand in the ladder's order:** Quote sent first, as the first
  step the customer sees, then the contract, POs, invoices and payments, each
  kind by date, so a kind is always in the same place.
- **A signed contract has a date, `trips.contract_signed_on`,** today when
  its row is added and typed over in its window, so its row reads like the
  others; a trip signed before the column shows no date.
- **One Add row ends the list** and offers what is not there yet: Quote sent,
  Contract signed, Purchase order, Invoice and Payment.
- **A step the office's billing workflow does not use is not offered,** and
  its rows are not shown, as its section is hidden today.
- **The switches go, and the rows say it:** PO received is on while the trip
  has a PO row, Invoice sent while it has an invoice row, and Contract signed
  while it has its row. Save writes `po_received`, `invoiced`,
  `invoice_status` and `contract_status` from the rows, because the print
  pages, the To do list, close-out and the connector read those columns.
- **The contract's note is edited in its row's window,** as a PO's reference
  is in its own.
- **The one trip with PO received on and no PO row gets a PO row with no
  reference,** so it stays confirmed when its switch goes.
- **A warning that opens Billing lands on the list's Add row,** where the
  Contract signed and PO switches were.

### The miles

- **Estimated and Actual miles stand side by side,** then each bus's drivers
  as they are now.
- **Get from Samsara moves to the Miles heading's ⋮ menu.**

## Questions

None open.

## Tasks

- [ ] Show rux the SQL for `trips.contract_signed_on` and the PO row for the
      one trip with PO received on and no PO, and apply them on his yes.
- [ ] Build the Billing list: the rows, their windows, the one Add row and
      the workflow's steps, with Save writing the four columns from the rows.
- [ ] Point the warnings that open Billing at the list's Add row.
- [ ] Prove a Save of each kind of row with `scheduler/docs/proving-a-save.md`.
- [ ] Describe the tab in `scheduler/docs/screen-inventory.md`, its writes
      in `scheduler/docs/database-inventory.md`, and its outline in
      `.claude/skills/trips/SKILL.md`, and point the PO and contract offers
      in `docs/plans/scheduler-file-reading.md` at the list.
