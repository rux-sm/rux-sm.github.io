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
- **Nothing on the site, in the connector or on the driver page reads the
  columns this plan drops,** and every trip's `trip_reqs` holds what its
  needs columns held, so the drop changes nothing anyone sees.
- **A column is dropped in a later session than the push that stops its
  use,** once the office's tabs have been reloaded, because nothing tells an
  open tab a newer Scheduler is out, and an old tab's save fails on a column
  that is gone.

## Questions

None open.

## Tasks

- [ ] Once no tab runs the code from before the needs columns stopped
      being read, write the SQL that rewrites the `trips_clear_done` and
      `trips_old_leg_columns` triggers without the needs and printed columns,
      drops the `trips_note_update` and `trips_stamp_notes` triggers, and
      drops the needs columns, `notes`, `driving_hours`, `on_duty_hours`, the
      `itinerary_printed_*` and `hos_form_printed_*` columns on `trips`, and
      `platform.profiles.scheduler_shortcuts`; show it to rux, apply it on
      his yes, and update the database inventory in the same commit. An old
      tab is one still reading `trips` with `req_sleeper`, which
      `pg_stat_statements` counted at 744 calls when the new code went out;
      a working day with no more calls means none is left.
