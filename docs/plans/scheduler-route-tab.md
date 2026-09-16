---
type: plan
---

# Plan: a simple Route tab in the trip editor

## Goal

The Route tab asks for the few things a dispatcher knows: where the group is
picked up, the spot time and when the trip ends. It works out when the bus
leaves and gets back to the yard, and the board and rux-ui show the same
times, without rux-ui's itinerary builder.

## Decisions

- **Three fields are typed, the rest worked out,** in one section: Pickup
  location, then Depart, when the group leaves it, beside End, when its trip
  ends. The section's overflow menu opens the Padding field, 15 minutes unless
  changed, and the drive fields, which also open when a lookup fails. Spot
  time is Depart less the padding; Yard depart is spot time less the drive
  from the yard; Yard return is End plus the drive back, with nothing added.
  The worked-out times are not fields: a Times section lists the day in
  order, each time with what it came from, the drives included.
- **The padding is not stored:** a trip opens with its departure less its
  spot time, and 15 minutes when it has neither.
- **A round trip ends where it began,** so the drive back is the drive from
  the yard. **Any other trip ends at a drop-off,** so its leg also asks for a
  Drop-off location and the drive back from there.
- **The drive comes from Mapbox,** as rux-ui's does: the address fields
  suggest places from Mapbox's Search Box, and a pick asks Mapbox Directions
  for the drive to or from the `yard-location-v1` settings row, with the
  public token in `mapbox-token-v1`. The drive fields stay editable, and a
  typed drive is saved as manual.
- **The times live in the rows rux-ui already reads.** The leg's `pickup` stop
  holds the pickup place, the drive from the yard, `spot` and `depart_prev`
  (yard depart). The first `stop` after it holds `depart_prev` (Depart), which
  is where rux-ui keeps it. The last `stop` before the return is the drop-off,
  with `arrive` (Return). The last `return` stop, the yard, holds
  `depart_prev` (Return), `arrive` (yard return) and the drive back. Each time
  gets its `_date`: spot time and yard depart a day earlier before midnight,
  and yard return a day later after it.
- **A trip with rux-ui's full itinerary keeps it.** Only those rows change,
  and the tab says how many stops the leg has. A leg missing a row gets it: the
  pickup first, the first stop after it, the return last. A round trip's new
  first stop is named for the trip's destination.
- **A drop-off and pick-up trip shows the fields for the leg its bar is,** as
  the tab does now.
- **`trips.departure_time`, `spot_time` and `return_time` are not written,**
  as rux-ui does not write them.

## Questions

None open.

## Tasks

- [ ] rux enters a spot and end time on a real trip, saves, and checks both
      boards show the same yard times.
