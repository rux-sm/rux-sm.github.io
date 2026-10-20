---
type: plan
---

# Plan: A trip of any number of legs

## Goal

One trip is one booking: one customer, one booking contact and one billing,
always. Under it, the trip takes whatever shape it runs: one leg or many,
each leg one day or several, each leg one route or several, each route one
bus or many. A day trip, a one-way trip, an overnight tour, a booking home
each night with its own buses and drivers each day, a school's one-way run
every day for a week on one quote and one invoice, and a split trip are all
the same thing with different numbers, so the office learns one way to
enter them.

## Decisions

### The shape

- **A trip holds its legs.** A leg is one time a bus leaves the yard and
  comes back: one day, or several with the bus staying out overnight.
- **A leg holds its routes, and a route its buses,** as
  `scheduler-routes.md` decides.
- **Each bus on each leg is one bar,** as it is now, so a booking home each
  night has a bar a day and an overnight leg one bar across its days.
- **A split trip is two legs,** the drop-off and the pickup, and stops
  being a type of its own.
- **Each leg is round trip or one way,** the choice the trip's Type makes
  now, because a booking can go out and back one day and one way another.
- **A bus from another company is entered as an added driver,** as the
  office does now, so outsourcing needs nothing new.

### What stays the trip's

- **The customer, the booking contact, its email thread, the billing, the
  quote and the updates are the trip's,** entered once whatever its legs.
- **The quote lists one Bus rental line per leg,** as each line already
  carries its leg, under the trip's one estimate number.

### What is each leg's

- **Its dates, its bus count, its stops, its vehicles and drivers, and its
  workflow marks,** which are pairs of `_outbound` and `_return` columns on
  `trips` now.
- **Its files and contacts, with the first leg's standing in** where a leg
  has none of its own, as the pickup takes the drop-off's now in
  `scheduler/leg-papers.js`.

### The contacts

- **A trip's contacts are a list, as many as it needs,** each with its leg,
  in a `trip_contacts` table, where five slots on `trips` are shared by
  every leg now.
- **Everything that reads a contact reads the list:** the editor, the driver
  card, the envelope and itinerary sheet, which print a leg's first two,
  Prep, the driver's link and the connector.

### A cancelled day

- **A cancelled day is removed from the trip,** because the trip still
  runs, changed: Remove leg takes it away with its line on the quote, and
  the trip's updates and history say which day went.
- **The drivers of a removed leg are told** as a driver taken off a trip is
  told now.

### Where it shows

- **The editor's Drop-off and Pickup switch becomes a list of the trip's
  legs,** each named by its dates, shown only on a trip of more than one.
- **Add leg copies the leg on screen** to the day after the last leg ends:
  its route, its vehicles with no drivers and its contacts, so only what
  differs is changed. Remove leg takes one away.
- **A leg is made longer by its end date,** so an overnight day is added to
  a leg and a day home is added as a leg.
- **Each bar of a trip of several legs says which,** such as 2 of 3, where
  the split pill sits.

### How it is kept

- **A `trip_legs` table holds a row per leg,** with its dates, bus count and
  workflow marks, staff only, as every table is.
- **A stop, a vehicle, a quote line, a file, a contact and a driver's
  status name their leg by its id,** and legs are ordered by date, so a leg
  added before the first needs nothing renumbered.
- **It waits on `rux-ui-retirement.md`,** because rux-ui writes the two
  fixed legs and would never fill the new ones.
- **It ships reader first,** as `scheduler-routes.md` does: the table and
  the leg ids are filled from the old columns, Save writes both, every
  reader moves to the new, and only then can a third leg be made and the old
  columns be dropped.
- **Each database change is its own step,** written as SQL, shown to rux and
  applied on a yes, before the code that reads it is pushed.

## Questions

- Does the quote show one Bus rental line per leg, or one line of so many
  days at one price?
- Where does this go in `scheduler-fixes.md`'s order: after rux-ui's
  retirement and before routes, or built with routes as one change, since
  both rewrite the same readers?

## Tasks

- [ ] Write the SQL for `trip_legs` and its access rules, a row for every
      leg there is now, and a leg id on `trip_stops`, `trip_assignments`,
      `trip_quote_lines`, `trip_documents` and `trip_driver_statuses` filled
      from their `leg`; show it to rux and apply it on a yes.
- [ ] Put the leg rule in a small file with sample cases: a trip's legs by
      date, each one's dates and bus count, and its papers with the first
      leg's standing in, replacing the two-leg rule in `leg-papers.js`.
- [ ] Make Save write each leg's row and ids beside the old columns.
- [ ] Move every reader of `outbound`, `return`, the `_outbound` and
      `_return` columns, `return_start_date` and `dropoff_pickup` to the leg
      rule, about thirty files under `scheduler/`, a group at a time: the
      board and its bars, the editor, Prep and To do, the forms and print,
      the driver pages, live and the road.
- [ ] Read the bodies of `get_driver_share_trips`, `get_maintenance_schedule`,
      `trip_steps_off`, the triggers that take a Done off and the driver
      status functions, and write the SQL that makes each read a leg id.
- [ ] Write the SQL for `trip_contacts` and its access rules, a row for
      every filled slot there is now with its leg, and the change to
      `get_driver_share_trips` that hands a driver the list; show it to rux
      and apply it on a yes.
- [ ] Move every reader and writer of `trip_contact_1` to `trip_contact_5`
      to the list, then write the SQL that drops the slots.
- [ ] Find how a driver taken off a trip is told now, and tell the drivers
      of a removed leg the same way.
- [ ] Give the editor its list of legs, Add leg and Remove leg, take Split
      out of Type, and give each leg its round trip or one way.
- [ ] Draw 2 of 3 on the bars of a trip of several legs, and price a Bus
      rental line for each leg.
- [ ] Return a trip's legs from `get_trip` in `scheduler/connector/index.ts`,
      let a draft carry them, rebuild the connector's rules, and hand rux the
      deploy.
- [ ] Write the SQL that drops the old leg columns once nothing reads them,
      show it to rux, and apply it on a yes.
- [ ] Describe the table, the ids and the changed screens in the
      scheduler's database and screen inventories, its `README.md` and the
      trips skill.
- [ ] Enter a trip of three legs in Chrome on :8641 with the page's writes
      recorded and not sent: a two-day overnight leg and a one-day leg home,
      a different driver each, one customer and one quote of three lines;
      then open a saved round trip and a saved split trip and see them read
      as before.
