---
type: plan
---

# Plan: the stops the Route tab does not ask for

## Goal

The Route tab fills as it does now — six fields and the Times list, a trip
bar's worth of route in under a minute — and carries one closed Full
itinerary line beneath them, where the rest of the day can be entered later.

## Decisions

- **Nothing is added above the Times list and the six fields do not move.**
  The tab earns its place by being fillable at a glance.
- **A trip typed as a round trip is let off at its pickup,** whatever its last
  stop, so that stop reads as a stop and the drive home is measured from the
  pickup.
- **The section is layout A, a simple list,** as rux picked: a line per stop
  with its times, drive and wait, a dialog to add or edit one, and a menu to
  move or remove it, as the Billing tab's quote lines are edited.
- **A stop's leave time lives where rux-ui keeps it,** as the next row's
  `depart_prev`, so the first stop holds when the group leaves the pickup and
  the drop-off holds when it leaves the last stop.
- **Untouched, the tab writes what it always has.** Once the list is touched,
  Save rewrites the leg's stops in the list's order, keeps day and sleeper
  rows where they are, and renumbers `position` across both legs.
- **Every leg is measured** by the Mapbox lookup the yard's two use, and the
  section totals the day's driving and on-duty hours.
- **It opens closed every time,** its heading saying how many stops and miles.
- **No database change.** `trip_stops` already carries every field.

## Questions

None open.

## Tasks

- [ ] rux adds a stop to a real trip here, saves, and checks rux-ui's
      Itinerary tab and the driver itinerary show every stop in order.
