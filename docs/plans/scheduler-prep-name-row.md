---
type: plan
---

# Plan: The name row in Departures

## Goal

A crew member's name row in Departures reads whole at the panel's narrowest width.
The name is the last thing cut short and Part-time never pushes it out. The
row ends with the face of whoever confirmed the driver, as every step line
ends with the face of whoever did it, so every time in a bus's block ends at
one edge.

## Decisions

- **The seat and the tag give way before the name,** and the name keeps at
  least its first eight letters, because `.scheduler-departures__who` now
  shrinks the name and the seat alike and a part-time driver shows as two
  ellipses.
- **The name row ends with a face, as a step line does,** a
  `scheduler-departures__face` after the time. A row with no face known keeps
  the face's place empty, so its time still ends where the lines' times do.
- **A driver who confirmed through their own link shows their own photo,**
  from `driver-photos`, or their initials when they have none, because
  `trip_driver_statuses` already says its source was the driver.
- **A driver the office confirmed shows the staff member who did it,** from a
  new `confirmed_by` on `trip_driver_statuses`, to `profiles`, set null, which
  `sync_trip_driver_statuses` stamps with the signed-in profile when it writes
  Confirmed and `get_trip_driver_statuses` returns. A seat confirmed before
  the column exists has no face.
- **The database change is its own step,** shown to rux as SQL and applied on
  a yes before the code that reads it is pushed.
- **Part-time is a small outlined PT tag,** Design's `rux--tag--sm
  rux--tag--outline`, its title and its spoken name the whole word, because
  it kept the whole name longest of five versions drawn at a narrow panel.
- **The components page's Departures sample carries a long-named part-time
  driver** when its section lands from the
  [components page plan](scheduler-components-page.md), so the row is seen at
  its worst.

## Questions

None open.

## Tasks

- [ ] Show rux the SQL for `confirmed_by` and its stamp, and apply it on a
      yes.
- [ ] Give the confirmed line who confirmed it in `scheduler/departures.js`:
      the staff member as `by`, or the driver when the source was their link.
- [ ] Draw the name row with the PT tag in
      `scheduler/departures-panel.js`, with its face or its empty place, and
      change its rules in `scheduler/app.css`.
- [ ] Add `confirmed_by` to `trip_driver_statuses` in
      `scheduler/docs/database-inventory.md`, in the commit with the code that
      reads it.
