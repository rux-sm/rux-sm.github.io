---
type: plan
---

# Plan: Drop the Scheduler's Rux UI leftovers

## Goal

The trips tables hold only what a page reads, and every save writes each
fact once. Columns, colour names and tables kept for Rux UI go, with nothing
the office or the connector uses lost on the way.

## Decisions

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

None open.

## Tasks

- [ ] In a later session, once the office's tabs have been reloaded, write
      the SQL that imports the two trips' unrecorded notes as updates,
      rewrites yellow and cyan, takes the needs columns out of
      `get_driver_share_trips`, and drops the needs columns and the unread
      columns; show it to rux, and apply it on his yes;
      then remove `RETIRED_COLORS` and its history labels and the old colour
      names from `get_trip`'s words, and update the scheduler's database
      inventory in the same commit.
