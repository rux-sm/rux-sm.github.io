---
type: plan
---

# Plan: One trip, any shape

## Goal

One trip is one booking: one customer, one booking contact and one billing,
always. Under it, the trip takes whatever shape it runs: one leg or many,
each leg one day or several, each leg one route or several, each route one
bus or many. A day trip, a one-way trip, an overnight tour, a booking home
each night with its own buses and drivers each day, a school's one-way run
every day for a week on one quote and one invoice, a split trip, and a trip
whose groups of buses pick up at different places or times are all the
same thing with different numbers, so the office learns one way to enter
them and nothing is entered twice.

## Decisions

### Order

- **This plan is built next,** ahead of `scheduler-documents.md`, because the
  office needs trips of several days and routes first.
- **Legs and routes are one change,** because both change how every stop
  and vehicle is tied to its trip, and the same thirty or so readers would
  otherwise be rewritten twice.

### The shape

- **A trip holds its legs.** A leg is one time a bus leaves the yard and
  comes back: one day, or several with the bus staying out overnight.
- **A leg holds its routes.** A route is its own stops and times, a name
  such as Football or Band, and the buses that run it. A leg with one route
  is every leg there is now.
- **The dates are the leg's,** so routes on one leg share its days and
  differ in places and times.
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
  quote, the Details and the updates are the trip's,** entered once whatever
  its legs and routes.

### What is each leg's

- **Its dates, its bus count and its workflow marks,** which are pairs of
  `_outbound` and `_return` columns on `trips` now.
- **Its files and contacts, with the first leg's standing in** where a leg
  has none of its own, as `scheduler/trip-shape.js` hands them. A file and
  a contact name a leg, never a route,
  so every route of a leg is handed the leg's.

### The contacts

- **A trip's contacts are a list, as many as it needs,** each with its leg,
  in a `trip_contacts` table, where five slots on `trips` are shared by
  every leg now.
- **Everything that reads a contact reads the list:** the editor, the driver
  card, the envelope and itinerary sheet, which print a leg's first two,
  Departures, the driver's link and the connector.

### A cancelled day

- **A cancelled day is removed from the trip,** because the trip still
  runs, changed: Remove leg takes it away and off its quote line, and
  the trip's updates and history say which day went.
- **The drivers of a removed leg are told** as a driver taken off a trip is
  told now.

### The editor

- **The Drop-off and Pickup switch becomes a list of the trip's legs,** each
  named by its dates, shown only on a trip of more than one.
- **Add leg copies the leg on screen** to the day after the last leg ends:
  its routes, its vehicles with no drivers and its contacts. Remove leg takes
  one away.
- **A leg is made longer by its end date,** so an overnight day is added to
  a leg and a day home is added as a leg.
- **The Route tab shows one route at a time.** With more than one, a
  switcher over the Summary names them, under the list of legs, and Add
  route sits beside it. The tab opens on the leg and route of the bar that
  was pressed.
- **A route is added as a copy of the one on screen,** so only what differs
  is changed: a pickup, a few stops, a time.
- **The Buses tab lists a leg's vehicles under their routes,** and a
  vehicle's window chooses its route. A route with no vehicle is still
  listed, so it can be given one.
- **A notice acts on its own route.** Add co-driver and Rest in the sleeper
  change the vehicles of the route on screen, not every vehicle on the leg.

### The board and the papers

- **A bar shows its own route's times,** its route's name where its leg has
  more than one, and which leg it is, such as 2 of 3, where the split pill
  sits.
- **Each route prints its own itinerary sheet,** and a driver's envelope,
  link and reminder carry the leg and route of the bus they are on.

### The quote

- **One Bus rental line per price.** A trip starts with one line for every
  bus on every leg, its quantity the buses times the legs, such as 5 × 1,400
  for a week of day trips, as the office bills now.
- **That line is priced on the trip's longest route,** so no bus is quoted
  short, and Estimated miles follow that route too.
- **Price separately gives a leg or a route its own line** at its own
  price, for one different enough, because only the office can judge that;
  undoing it puts it back in the trip's line.
- **The words name what each line covers:** its days, and each route's
  buses, when it leaves and when it is back, so the customer reads which
  group goes when.

### How it is kept

- **A `trip_legs` table holds a row per leg,** with its dates, bus count and
  workflow marks, and a `trip_routes` table a row per route, with its leg
  and its name. Both are staff only, as every table is.
- **A stop and a vehicle name their route, and a file, a contact and a
  driver's status their leg,** each by its id. A rental line names the leg
  or route it was priced separately for, and none when it is the trip's.
  Legs are
  ordered by date, so a leg added before the first needs nothing
  renumbered.
- **It ships reader first.** The tables and ids are filled from the old
  columns, one route on every leg, so no saved trip changes, and triggers
  keep them filled as the pages write the old columns, so no page writes
  both; every reader moves to the new; and only then can a third leg or a
  second route be made, the writers move, and the old columns and the
  triggers go.
- **Each database change is its own step,** written as SQL, shown to rux and
  applied on a yes, before the code that reads it is pushed.
- **A database function moves with the pages that read it,** because the
  twelve that name a leg by its word hand that word to a page, so changing
  one alone would change it twice.
- **A trip's days are its legs',** the first leg's start to the latest day
  any leg ends, as `scheduler/trip-shape.js` gives them, so no page reads a
  pickup's days from the trip's own columns.
- **`trips.start_date` and `end_date` stay as a copy of those days,** kept
  by a trigger from the legs and overriding whatever a page sends, so trips
  can still be found, sorted and paged by date; the trip history makes no
  line of them, and a check compares them with the legs. They keep their
  names, and `end_date` becomes the trip's last day once the editor writes
  legs.

## Questions

None open.

## Tasks

- [ ] Hand rux the deploy of `scheduler/trip-document-link/index.ts`,
      which reads a trip's last day from its legs.
- [ ] Return a trip's legs, routes and contacts from `get_trip` in
      `scheduler/connector/index.ts`, let a draft carry them through
      `scheduler/draft-fields.js`, which the editor types too, rebuild the
      connector's rules, and hand rux the deploy.
- [ ] Give the editor its list of legs, Add leg and Remove leg, take Split
      out of Type, and give each leg its round trip or one way. The editor's
      own state, the bar's ref and the quote lines, which still name a leg by
      its old word because the editor writes by it, name it by its id; and
      the bar menu's hotel mark, itinerary upload and Mark as told,
      `scheduler/print.js`'s marks and quote lines, `trips_clear_done`,
      which clears a tab's Done from the trip's own columns, `trips_steps_off`,
      which turns a driver's steps off when the trip's dates move, and
      `get_maintenance_schedule_changes`, which reads a move from the trip
      history's column names, move with them, with the trigger that keeps
      `trips.start_date` and `end_date`.
- [ ] Make the Route tab hold a route: the switcher, Add route as a copy,
      rename and remove, and the tab opening on the pressed bar's leg and
      route.
- [ ] List the Buses tab's vehicles under their routes, choose a vehicle's
      route in its window, and make Add co-driver and Rest in the sleeper
      act on the route's vehicles.
- [ ] Give the editor and the driver card the contact list.
- [ ] Find how a driver taken off a trip is told now, and tell the drivers
      of a removed leg the same way.
- [ ] Draw each bar with its route's times, its route's name and 2 of 3,
      and give the yard gap and the rest between trips the same times.
- [ ] Make the trip's Bus rental line, buses times legs priced on its
      longest route, with Estimated miles following it; add Price
      separately and its undo for a leg or a route; and write each line's
      days and routes in its words.
- [ ] Print an itinerary for each route, and give the envelope, the
      driver's page, the driver's reminder and the maintenance schedule the
      leg and route of their bus.
- [ ] Hold each route to the Route tab's Done, name the leg and route in a
      trip's history, and count a route with no times in the to-do list.
- [ ] Write the SQL that drops the old leg columns and contact slots once
      nothing reads them, with the old date fields and words
      `get_maintenance_schedule` still hands the maintenance link, show it
      to rux, and apply it on a yes.
- [ ] Describe the tables, the ids and the changed screens in the
      scheduler's database and screen inventories, its `README.md` and the
      trips skill.
- [ ] Enter two trips in Chrome on :8641 with the page's writes recorded and
      not sent: one of three legs, a two-day overnight leg and a one-day leg
      home, a different driver each, three contacts on one leg; and one of
      five buses on two routes, split two and three, with an itinerary for
      each route. Then open a saved round trip and a saved split trip and
      see them read as before.
