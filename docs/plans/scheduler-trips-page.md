---
type: plan
---

# Plan: a Trips page that lists every trip

## Goal

Staff see every trip in one table, as they see drivers and the fleet, find
any trip by searching or sorting, cancelled ones included, and open one on
the schedule with a press.

## Decisions

- **One page, `scheduler/trips.html`,** listed in the side nav under
  Schedule. It is the list half of the page pair `docs/plans/site-page-pair.md`
  decides; a trip is edited in the schedule's panel, so there is no second
  page.
- **A row opens the trip on the schedule,** at `./?trip=<id>&date=<start>`,
  the address the Drivers and Fleet pages already link a trip by.
- **The list is Carbon's data table at large density, sortable,** with a
  toolbar holding the search and a Show choice, as the Drivers page's:
  Upcoming, Past, Cancelled and All, with counts. Upcoming is the default, soonest first.
- **Six columns:** Dates, Trip (reference, with the customer beneath),
  Destination, Buses, Price and Status. A phone shows Dates, Trip and Status.
- **Status is one tag:** Cancelled, Paid, Invoiced, Confirmed or Quote,
  whichever comes first in that order. A cancelled row's reason shows under
  its tag, since a tooltip never appears on a phone.
- **Search covers the reference, customer, destination, PO and invoice
  number,** in the browser, over all 863 trips read once.
- **Carbon's pagination, 50 rows a page,** since the table is long and a
  page of every trip is slow on a phone.
- **No new database change.** The page reads `trips` as the board does.

## Questions

None open.

## Tasks

- [ ] rux opens a cancelled trip from the page and reads its reason.
