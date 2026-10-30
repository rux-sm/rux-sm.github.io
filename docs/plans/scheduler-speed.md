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
- **The unindexed foreign keys a page reads by are indexed with them:**
  `trip_assignments.bus_id` for a bus's trips, and `trip_drivers.driver_id`
  and `driver_time_off.driver_id` for a driver's. The advisor's other trip
  keys point at profiles or legs and are walked only when one is deleted, so
  an index on them would sit unused.
- **The migration is its own step,** SQL shown to rux and applied on his yes,
  before any code that leans on it.

### Reading

- **A change reads only its trip.** The board finds a change's trip by its
  `trip_id`, or by looking the row's id or a crew row's `assignment_id` up in
  what it holds, because a delete arrives with the row's id alone and a crew
  row names its assignment. It reads that trip again with the board's columns
  and puts it in the held weeks, or takes it out once its days leave them; a
  `trips` change whose days fall in the held weeks reads its trip in, and any
  other change to a row the board does not hold reads nothing. A save's burst
  of changes still settles into one read, now one per trip it touched. A
  change to buses, drivers, time off, days out or settings reads that one
  list. A full read is kept for a week no read covers, coming back to the tab
  and a change whose trip cannot be told.
- **The lists that seldom change are read once, never with each week:**
  contacts, customers, locations, buses, drivers and settings. Buses, drivers
  and settings are read again on their own live change; contacts, customers
  and locations are not in the realtime publication, contacts on purpose, so
  they are read again on coming back to the tab and with a full read.
- **One reader and one channel for the board page.** `to-do-rows.js` and
  `departures-panel.js` read from what `data.js` holds and are told when it
  changes, where each now reads trips and opens a channel of its own; a pane
  reads for itself only the days the board's read does not reach, such as
  the to-do follow-ups' 90 days back. `to-do.js` and `departures.js` keep
  their reads as they are, because the connector runs them through
  `rules.ts` and `trips.html` runs `to-do-rows.js` without `data.js`.
- **The board's channel hears every table it reads,** adding `trip_documents`,
  `trip_prep`, `trip_legs`, `trip_routes` and `trip_contacts`, which broadcast
  and which it does not listen to now, so Departures still moves on an upload
  or a prep mark once it shares the channel.
- **The board's read carries what the board draws.** A trip's update texts and
  its quote lines are read when its card or editor opens, not with every trip
  of nine weeks; the bar's follow-up mark needs only the day of the newest
  update that is not a skipped prompt, kind `nothing`, as `follow-up.js`'s
  `quietSince` reads it, and the board's read keeps that one.

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

- **The editor loads on its own, if the first timing says it pays.**
  `data.js` is one closure the board and the editor share, so the split is
  this plan's riskiest change and is built only if evaluating the scripts is
  a real part of a cold load. Built, `data.js` is split into the board, which
  draws the first screen, and the editor with its panels, the document
  viewer, the calculator glue, trip history and Claude drafts, loaded once the
  board is drawn and the page is idle. A `?trip=` or `?draft=` link opens the
  editor on load, so the board loads the editor at once for one.
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
- **A column is dropped in a later session than the push that stops its
  use,** once the office's tabs have been reloaded, because nothing tells an
  open tab a newer Scheduler is out, and an old tab's save fails on a column
  that is gone.
- **Old colour names are rewritten in the rows,** yellow to amber and cyan to
  teal, so `RETIRED_COLORS` goes and the connector's `get_trip` stops naming
  the old ones.
- **`LEGACY_STATUS` goes with no rewrite,** since no `active_roles` entry
  holds a tone name.
- **Columns no page needs are dropped once nothing selects them:**
  `trips.notes` with its `trips_note_update` trigger, after the two trips
  whose note is in none of their updates have it imported as one;
  `driving_hours` and `on_duty_hours`, which the connector's `get_trip`
  selects; the `itinerary_printed_*` and `hos_form_printed_*` columns on
  `trips`, which `print.js`'s trip read for the print hub selects; and
  `platform.profiles.scheduler_shortcuts`.
- **The connector and its generated `rules.ts` change before any column
  goes.**

## Questions

- The archived `rux-ui` repository still serves forwards for old driver,
  maintenance and document links. Keep them for links still sitting in
  drivers' texts, or take them down?
- `trip_driver_confirmations` is listed as legacy, yet a driver's Accept and
  Decline still write it beside `trip_driver_statuses`. Is anything of yours
  still reading it, or can it stop being written and go?

## Tasks

- [ ] Before any other task, time a cold load, a week change, a swipe and
      another tab's save in Chrome on :8641, with the page's writes recorded
      and not sent, and how much of the cold load is evaluating scripts; put
      the figures under Decisions for the last task.
- [ ] Write the index migration for the three embeds and the three keys a
      page reads by, show it to rux, apply it on his yes, and compare the
      board read's time in `pg_stat_statements` from snapshots of its calls
      and total time before and after, not a reset.
- [ ] Read the seldom-changing lists once in `data.js`, and on a live change
      read only the changed trip or list into the held weeks, finding a
      deleted or crew row's trip in what the board holds, and keeping the
      full read for the cases the decisions name.
- [ ] Make `to-do-rows.js` and `departures-panel.js` read from the board's
      data and share its channel on the board page, reading for themselves
      only past the board's days, and add the five tables the board's channel
      lacks.
- [ ] Take update texts and quote lines out of the board's read, keeping each
      trip's newest update that is not kind `nothing`, and read them when a
      card or the editor opens.
- [ ] Keep legs, back times and standing per trip for a draw, index the
      read's legs by day for standing, and make every date formatter once,
      in `data.js`, `trip-shape.js`, `week.js`, `clashes.js`, `bar.js`,
      `road.js`, `road-bar.js`, `follow-up.js`, `driver-job.js` and
      `departures.js`.
- [ ] Measure before writing in `spareFor`, `fitLanesInView`,
      `fitStuckRows` and `fitCrew`; draw a swipe's spare weeks when idle; and
      skip `fillTracks` while the page is hidden.
- [ ] If the first timing says it pays, split the editor and its panels out
      of `data.js` into its own script loaded when the board is idle, or at
      once for a `?trip=` or `?draft=` link, with the editor-only scripts
      beside it, and keep `npm run check` loading every page's scripts.
- [ ] Switch every reader of the old needs columns to `trip_reqs` and stop
      writing them, stop selecting the unread columns in `print.js` and the
      connector, remove `LEGACY_STATUS`, and stop writing
      `trip_driver_confirmations` if nothing else reads it.
- [ ] In a later session, once the office's tabs have been reloaded, write
      the SQL that imports the two trips' unrecorded notes as updates, fills
      `trip_reqs` where it is empty, rewrites yellow and cyan, and drops the
      needs columns, the unread columns and, if it goes,
      `trip_driver_confirmations`; show it to rux, and apply it on his yes;
      then remove `RETIRED_COLORS` and its history labels and the old colour
      names from `get_trip`'s words.
- [ ] Take down the archived `rux-ui` repository's forwards, if they go.
- [ ] Update the scheduler's `README.md` and its database inventory for the
      split script and the dropped columns.
- [ ] Time the same steps as the first task again and compare them with its
      figures.
