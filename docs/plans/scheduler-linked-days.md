---
type: plan
---

# Plan: Days of one booking

## Goal

A booking that runs several days, with the bus home each night, stays one
trip a day, as the office enters it now, so each day keeps its own buses,
drivers, route, itinerary and contacts. The days are linked as one booking,
so the customer, the booking contact and the billing are entered once, and
the customer gets one quote and one invoice.

## Decisions

### The shape

- **Each day stays its own trip,** because a trip already has everything a
  day needs, and the office already works this way.
- **No new trip type.** A day is a round trip, one way or split as now; the
  link is beside the type, not one of them.
- **Linked trips share a booking id,** a nullable column on `trips` naming
  the trip that holds the booking's billing. That trip names itself, so a
  linked day is never mistaken for a trip on its own. A trip with none is
  every trip there is now, and it looks and saves as it does now.
- **The billing trip stays the same when dates move.** It starts as the
  first day; the Day 2 of 4 numbers follow the dates, so moving a date
  renumbers the days without moving the billing.
- **The billing trip cannot be deleted while other days name it,** with the
  column's delete rule set to restrict, because deleting it would drop the
  quote lines, payments and invoices with it.
- **The billing trip holds the booking's billing:** the quote lines, the PO,
  the payments, the contract and the invoice. Every other day's Billing tab
  shows the booking's totals and opens the billing trip's.
- **Shared fields are written to every day on Save:** the customer, the
  booking contact and its email thread. Changing them on any day changes
  them on all.

### Saving

- **The open day saves first, then the other days' shared fields only,**
  because Save stays many separate writes, as `scheduler-fixes.md` decides.
  A write that fails names the day it failed on, as Save names any write.
- **Another day open in an editor gets the conflict it gets now** when a
  shared field lands under it, because the write moves its `updated_at`.

### Every reader of billing

- **A linked day reads the booking's billing wherever a trip's billing is
  read:** Prep's booking step, the To do list, the checklist's Billing done,
  the Trips list, the Customers page and the connector's booking status. A
  later day read on its own has no price, no PO and no contract, and would
  show as unbooked.
- **One small rule file decides it,** with sample cases: which trips are a
  booking's days, their numbers by date, which holds the billing, and the
  booking's totals.

### Where it shows

- **A linked trip's editor lists its days over the tabs,** each by its
  date, and choosing one opens that day's trip.
- **A split day has its Drop-off and Pickup switch under the day list,** as
  the route switcher `scheduler-routes.md` adds sits under that one: a day
  is chosen first, then a leg, then a route.
- **Add day, from the trip's menu, copies the trip on screen to the day
  after the booking's last day:** its route, its vehicles with no drivers,
  its contacts and the shared fields, so only what differs is changed.
- **Unlink day takes one trip out of the booking,** and its billing then
  stands on its own, empty.
- **Each day's bar is a trip's bar as now,** with its day's number in the
  booking, such as Day 2 of 4, where the split pill sits.

### The quote

- **The customer quote lists every day** under the booking's one estimate
  number, the billing trip's, priced from each day's route.

### How it is kept

- **The column is one named migration,** shown to rux and applied on a yes
  before any code that reads it is pushed.
- **rux-ui never sees the link,** and a day it saves keeps it, because it
  updates only the columns its form changed. A shared field changed there
  changes that day alone.

## Questions

- Are the trip contacts and the itinerary each day's own, or written to
  every day like the customer?
- Should the customer quote show one Bus rental line per day, or one line
  of so many days at one price?
- What happens to the booking when the billing trip's day is cancelled or
  unlinked: does the billing move to the next day, or must it be the last
  one taken out?
- Does a cancelled day still count in the booking's totals and its Day 2 of
  4?
- `scheduler-routes.md` says one booking is one trip. Is a linked set still
  called a booking, with that sentence changed, or does it get another word?
- Where does this go in the order `scheduler-fixes.md` sets, which names
  split days, rux-ui's retirement, documents and routes but not this?
- Should a split trip later become two linked days, so there is one way to
  run a trip over several days?

## Tasks

- [ ] Write the SQL for `trips.booking_id`, to `trips`, on delete restrict,
      with its index, show it to rux, and apply it on a yes.
- [ ] Put the booking rule in a small file with sample cases: a booking's
      days, their numbers by date, which holds the billing, and its totals.
- [ ] Give the editor the day list, Add day and Unlink day, with the split
      switch under the day list, and write the shared fields to every day
      after the open day's Save.
- [ ] Show the booking's totals on a later day's Billing tab, opening the
      billing trip's, and list every day on the customer quote.
- [ ] Read the booking's billing for a linked day in `departures.js`,
      `to-do.js`, `checklist.js`, `trips.js`, `customers.js` and
      `connector/rules.ts`.
- [ ] Draw Day 2 of 4 on each linked bar, and name the booking in a trip's
      history.
- [ ] Return a trip's booking and its days from `get_trip` in
      `scheduler/connector/index.ts`, and hand rux the deploy.
- [ ] Describe the column and the changed screens in the scheduler's
      database and screen inventories and the trips skill.
- [ ] Link a booking of three days in Chrome on :8641 with the page's writes
      recorded and not sent: Add day twice, a different driver each day, the
      customer changed once, a later day's Prep and To do reading the
      booking's PO, and the quote listing all three.
