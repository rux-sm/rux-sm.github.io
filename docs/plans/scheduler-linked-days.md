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
- **Linked trips share a booking id,** a nullable column on `trips` that
  names the first day's trip. A trip with none is every trip there is now,
  and it looks and saves as it does now.
- **The first day holds the booking's billing:** the quote lines, the PO,
  the payments, the contract and the invoice. Every other day's Billing tab
  shows the booking's totals and opens the first day's.
- **Shared fields are written to every day on Save:** the customer, the
  booking contact and its email thread. Changing them on any day changes
  them on all, as one Save.

### Where it shows

- **A linked trip's editor names its days over the tabs,** each by its date,
  as a split trip names its two, and choosing one opens that day's trip.
- **Add day, from the trip's menu, copies the trip on screen to the next
  free day:** its route, its vehicles with no drivers, its contacts, and the
  shared fields, so only what differs is changed.
- **Unlink day takes one trip out of the booking,** and its billing then
  stands on its own, empty.
- **Each day's bar is a trip's bar as now,** with its day's number in the
  booking, such as Day 2 of 4, where the split pill sits.

### The quote

- **The customer quote lists every day,** one Bus rental line per day,
  priced from that day's route, under the booking's one estimate number,
  the first day's.

### How it is kept

- **The column is one named migration,** shown to rux and applied on a yes
  before any code that reads it is pushed.
- **rux-ui never sees the link,** and a day it saves keeps it, because it
  writes only the columns it knows.

## Questions

- Are the trip contacts and the itinerary each day's own, or written to
  every day like the customer?
- Should the customer quote show one line per day, or one Bus rental line
  of so many days at one price?
- Is this built before or after `scheduler-routes.md`, in the order
  `scheduler-fixes.md` sets?
- Should a split trip later become two linked days, so there is one way to
  run a trip over several days?

## Tasks

- [ ] Write the SQL for `trips.booking_id`, to `trips`, set null, with its
      index, show it to rux, and apply it on a yes.
- [ ] Put the booking rule in a small file with sample cases: which trips
      are a booking's days, which is first, and its totals.
- [ ] Give the editor the day switch, Add day and Unlink day, and write the
      shared fields to every day on Save.
- [ ] Show the booking's totals on a later day's Billing tab, opening the
      first day's, and list every day on the customer quote.
- [ ] Draw Day 2 of 4 on each linked bar, and name the booking in a trip's
      history.
- [ ] Return a trip's booking and its days from `get_trip` in
      `scheduler/connector/index.ts`, and hand rux the deploy.
- [ ] Describe the column and the changed screens in the scheduler's
      database and screen inventories and the trips skill.
- [ ] Link a booking of three days in Chrome on :8641 with the page's writes
      recorded and not sent: Add day twice, a different driver each day, the
      customer changed once, and the quote listing all three.
