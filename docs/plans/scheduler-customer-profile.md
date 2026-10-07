---
type: plan
---

# Plan: a customer's page as a profile

## Goal

A customer's page is the one place to see everything about that customer: who
books for it, its trips, what it has paid and owes, what it usually needs, and
the office's standing notes about it. A new trip for the customer starts with
its usual needs, and shows its notes, without anyone looking them up.

## Decisions

- **The page keeps Details and Contacts and gains a Trips tab.** The Documents
  tab and Driver forms required come from `scheduler-documents.md`.
- **Notes is a text box on Details,** for standing facts such as "PO needed
  before the trip". A trip's own notes stay on the trip.
- **The trip editor shows the customer's notes under its Customer field,**
  read only, because a note nobody sees while entering a trip does nothing.
- **Usual needs is a group on Details,** the same needs a trip has: sleeper,
  56 passenger and ADA as checkboxes, and a usual bus type picked from the
  types a trip offers, Any by default. Driver forms required sits in the same
  group, so everything a customer asks for is in one place.
- **Picking the customer on a new trip turns its usual needs on and sets its
  bus type,** as it fills an empty pickup. A saved trip is never changed by its customer's needs.
- **The Trips tab lists the customer's trips,** the ones `trips.customer_id`
  links, coming trips first and then past ones, newest first, fifty at a time.
  A row opens its trip on the board, as a row on `trips.html` does, and the
  database does the narrowing.
- **Money is three figures at the top of the Trips tab:** Quoted, Paid and
  Balance, the way a trip's Billing shows Paid and Balance, added up from
  every trip the customer ever had that is not cancelled. Each row shows its own balance.
- **Notes, usual needs and the usual bus type are new columns on `customers`,** staff only as the
  table is, shown to rux as SQL and applied on a yes as a named migration.
- **rux-ui does not change.** A trip entered there does not start with the
  customer's usual needs.
- **The Claude app's tools do not change.**

## Questions

None open.

## Tasks

- [ ] Count the trips with no customer link, and say how many a Trips tab
      would miss.
- [ ] Write the new columns as SQL, show it to rux, and apply it on a yes.
- [ ] Add Notes and Usual needs to Details on `customers.html`.
- [ ] Turn the usual needs on when a new trip's customer is picked, and show
      the notes under the Customer field.
- [ ] Build the Trips tab with its three figures.
- [ ] Describe the columns and the page in the scheduler's database and
      screen inventories.
- [ ] Check it in Chrome on :8641 with an invented customer: notes, needs, a
      new trip that takes them, and the Trips tab's figures against the
      trips' own Billing.
