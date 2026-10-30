---
type: plan
---

# Plan: A faster Scheduler

## Goal

The board opens, changes week and follows other people's saves without
waiting on the network or stalling under a finger, and the database does
only the work the page needs. The Scheduler keeps every feature it has; what
changes is how often it reads, how much it reads and how much it draws again.

## Decisions

### The database

- **Three indexes first,** on `trip_assignments.trip_id`,
  `trip_stops.trip_id` and `trip_drivers.assignment_id`, because the board's
  read embeds all three by those columns and each embed reads its whole table
  once per trip without them.
- **The other unindexed foreign keys the performance advisor lists on trip
  tables are indexed with them,** since none is costly to keep at this size.
- **The migration is its own step,** SQL shown to rux and applied on his yes,
  before any code that leans on it.

### Reading

- **A change reads only its trip.** A live change on a trip table carries the
  trip's id, so the board reads that trip again with the board's columns and
  puts it in the held weeks; a change to buses, drivers, time off, days out or
  settings reads that one list. A full read is kept for a week no read covers,
  coming back to the tab and a change whose trip cannot be told.
- **The lists that seldom change are read once,** contacts, customers,
  locations, buses, drivers and settings, and again only on their own live
  change, never with each week.
- **One reader and one channel for the board page.** `to-do.js` and
  `departures.js` read from what `data.js` holds and are told when it changes,
  where each now reads trips and opens a channel of its own; a pane reads for
  itself only the days the board's read does not reach.
- **The board's read carries what the board draws.** A trip's update texts and
  its quote lines are read when its card or editor opens, not with every trip
  of nine weeks; the bar's follow-up mark reads the newest update's day and
  kind, which the board's read keeps.

### Drawing

- **Each draw works a fact out once.** A trip's legs, its back time and each
  leg's standing are kept per trip for the draw, keyed by the trip object, so
  a bar never sorts the same legs or walks every trip in the read again.
- **A leg's standing looks only at the legs near it,** from an index of the
  read's legs by day built once per draw, since a clash is only ever with a
  leg on or next to its days.
- **Date formatters are made once per module,** never inside a call, because
  making one costs ten times using one.
- **Measure, then change.** Rows, lanes and crews are measured in one pass and
  written in the next, so a draw or a scroll forces no layout per row or bar.
- **A swipe's spare week is drawn while the page is idle,** after each draw,
  so the first sideways move only slides.

### Loading

- **The editor loads on its own.** `data.js` is split into the board, which
  draws the first screen, and the editor with its panels, the document viewer,
  the calculator glue, trip history and Claude drafts, loaded once the board
  is drawn and the page is idle, so opening a trip never waits on it.
- **Scripts only the editor uses move with it,** each checked first for a
  board use: `quote.js`, `quote-text.js`, `quote-lines.js`,
  `route-figures.js`, `draft-fields.js`, `trip-history.js` and `file-names.js`.

### Rux UI's leftovers

- **Leg words and the five contact slots are `scheduler-trip-shapes.md`'s,**
  whose tasks move every reader to legs and the contact list and then drop
  the columns; this plan does not touch them.
- **The old needs columns go.** `req_sleeper`, `req_ada`, `req_56pax`,
  `need_hotel` and `need_fuel_card` are written beside `trip_reqs` on every
  save; every reader, the connector's included, reads `trip_reqs`, trips
  without it are filled from the old columns, and the columns are dropped.
- **Old colour names and status words are rewritten in the rows,** orange and
  yellow to amber and cyan to teal, and Rux UI's statuses in `active_roles` to
  the Scheduler's, so `RETIRED_COLORS` and `LEGACY_STATUS` go.
- **Columns nothing reads are dropped:** `trips.notes` with its
  `trips_note_update` trigger, `driving_hours`, `on_duty_hours`, the
  `itinerary_printed_*` and `hos_form_printed_*` columns on `trips`, and
  `platform.profiles.scheduler_shortcuts`.
- **The Edge Functions change before any column goes:** the connector and its
  generated `rules.ts`, `samsara-miles` and `maintenance-status`.

## Questions

- The archived `rux-ui` repository still serves forwards for old driver,
  maintenance and document links. Keep them for links still sitting in
  drivers' texts, or take them down?
- `trip_driver_confirmations` is listed as legacy, yet a driver's Accept and
  Decline still write it beside `trip_driver_statuses`. Is anything of yours
  still reading it, or can it stop being written and go?

## Tasks

- [ ] Write the index migration for the three embeds and the trip tables'
      other unindexed foreign keys, show it to rux, apply it on his yes, and
      compare the board read's time in `pg_stat_statements` before and after.
- [ ] Read the seldom-changing lists once in `data.js`, and on a live change
      read only the changed trip or list into the held weeks, keeping the
      full read for the cases the decisions name.
- [ ] Make the to-do list and Departures read from the board's data and
      share its channel, reading for themselves only past the board's days.
- [ ] Take update texts and quote lines out of the board's read, reading them
      when a card or the editor opens.
- [ ] Keep legs, back times and standing per trip for a draw, index the
      read's legs by day for standing, and make every date formatter once,
      in `trip-shape.js`, `week.js`, `clashes.js`, `bar.js`, `road.js`,
      `road-bar.js`, `follow-up.js` and `driver-job.js`.
- [ ] Measure before writing in `spareFor`, `fitLanesInView`,
      `fitStuckRows` and `fitCrew`; draw a swipe's spare weeks when idle; and
      skip `fillTracks` while the page is hidden.
- [ ] Split the editor and its panels out of `data.js` into its own script
      loaded when the board is idle, with the editor-only scripts beside it,
      and keep `npm run check` loading every page's scripts.
- [ ] Switch every reader of the old needs columns to `trip_reqs`, stop
      writing them, and update the connector, `samsara-miles` and
      `maintenance-status`.
- [ ] Write the SQL that fills `trip_reqs` where it is empty, rewrites old
      colours and statuses, and drops the needs columns and the unread
      columns, show it to rux, and apply it on his yes; then remove
      `RETIRED_COLORS`, `LEGACY_STATUS` and their history labels.
- [ ] Update the scheduler's `README.md` and its database inventory for the
      split script and the dropped columns.
- [ ] Time a cold load, a week change, a swipe and another tab's save in
      Chrome on :8641 against the same steps on `main` before the work, with
      the page's writes recorded and not sent.
