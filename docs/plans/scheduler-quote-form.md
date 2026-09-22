---
type: plan
---

# Plan: the company's own quote on the Forms page

## Goal

A trip prints the quote the office sends today — the same header, the same
one line item, the same terms and signature line — from the Forms page,
without QuickBooks.

## Decisions

- **It is a registry entry in `print.js`, binding `trip`,** on Letter paper.
  The driver envelope and the driver itinerary are already entries; a quote is
  a third, so the hub, the `?form=` value and the viewer's toolbar all pick it
  up with no new page.
- **The description is `qbDescription` in `data.js`,** the block the Billing
  tab copies. One wording, two destinations, so a pasted QuickBooks estimate
  and a printed quote can never disagree.
- **The price is the trip's quoted price, not the calculator's breakdown.**
  The office's estimate carries one line item, "Bus Rental", quantity one, and
  a breakdown on the customer's copy would invite an argument about the parts.
- **The header is `print.js`'s `COMPANY`,** which the envelope already prints.
- **The bill-to block is the trip's organization,** whose record holds the
  address; `docs/plans/scheduler-organizations.md` builds it. Until that lands
  the quote prints the customer's name alone.
- **The contact box and the two times are `typed` fields,** as the registry's
  `typed` entry allows, because the office writes TBD on a quote today and
  settles both with the customer afterwards.

## Questions

- Do the terms — the deposit, the cancellation percentages, the hotel room —
  ever change? Fixed, they belong in the form; changing, they belong in a
  settings row the office can edit.
- Does this quote replace the QuickBooks estimate, or stand beside it? If it
  replaces it, QuickBooks only ever sees an invoice, and the Copy for
  QuickBooks button is for that alone.
- The quote needs a number the customer can quote back. Use `trip_ref`, or a
  separate quote number?

## Tasks

- [ ] rux answers the questions above.
